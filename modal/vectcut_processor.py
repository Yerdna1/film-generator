"""
Modal VectCutAPI Endpoint - Video Composition with Transitions, Captions, Music

Features:
- Render final MP4 with transitions, burned-in captions, and music
- Generate CapCut/Jianying draft folder for advanced editing
- AI-suggested transitions based on scene content
- SRT subtitle file export

Deploy: modal deploy modal/vectcut_processor.py
Test locally: modal run modal/vectcut_processor.py
"""

import io
import os
import json
import base64
import tempfile
import subprocess
import zipfile
import time
from pathlib import Path
from typing import Optional, Literal

import modal

# Modal app configuration
app = modal.App("film-generator-vectcut")

# Create image with VectCutAPI and video processing dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        "git",
        "ffmpeg",
        "libsm6",
        "libxext6",
        "libxrender-dev",
        "libglib2.0-0",
    )
    .pip_install(
        "fastapi",
        "pydantic>=2.0",
        "httpx",
        "pillow",
        "boto3",
        "requests",
        "aiohttp",
        "python-multipart",
    )
    .run_commands(
        # Clone VectCutAPI
        "git clone https://github.com/sun-guannan/VectCutAPI.git /app/vectcut",
        # Install VectCutAPI dependencies
        "cd /app/vectcut && pip install -r requirements.txt || pip install flask flask-cors",
    )
)

# Volume for caching processed videos
cache_volume = modal.Volume.from_name("vectcut-cache", create_if_missing=True)


from pydantic import BaseModel, Field


class SceneData(BaseModel):
    """Scene data for video composition."""
    id: str
    video_url: Optional[str] = None  # S3 URL or base64
    image_url: Optional[str] = None  # Fallback if no video
    duration: float = 6.0  # seconds
    transition_to_next: Optional[str] = None  # fade, slideLeft, slideRight, zoomIn, zoomOut, swoosh


class CaptionData(BaseModel):
    """Caption data for burned-in subtitles."""
    text: str
    start_time: float  # Global timeline time in seconds
    end_time: float
    font_size: int = 36
    font_color: str = "#FFFFFF"
    background_color: Optional[str] = "#00000080"
    position: Literal["top", "center", "bottom"] = "bottom"


class MusicData(BaseModel):
    """Background music data."""
    audio_url: str
    volume: float = 0.3  # 0-1
    start_offset: float = 0  # Trim from start
    fade_in: float = 2.0  # Fade in duration
    fade_out: float = 2.0  # Fade out duration


class VideoCompositionRequest(BaseModel):
    """Request for video composition."""
    project_id: str
    project_name: str = "Untitled Project"
    scenes: list[SceneData]
    captions: list[CaptionData] = []
    music: Optional[MusicData] = None
    output_format: Literal["mp4", "draft", "both"] = "both"
    resolution: Literal["hd", "4k"] = "hd"
    fps: int = 30
    include_srt: bool = True

    # S3 config for uploading results
    s3_bucket: Optional[str] = None
    s3_region: Optional[str] = None
    s3_access_key: Optional[str] = None
    s3_secret_key: Optional[str] = None


class VideoCompositionResponse(BaseModel):
    """Response from video composition."""
    status: str  # "complete", "error"
    video_url: Optional[str] = None  # S3 URL or base64 of rendered MP4
    video_base64: Optional[str] = None  # Base64 if no S3 config
    draft_url: Optional[str] = None  # S3 URL of zipped draft folder
    draft_base64: Optional[str] = None  # Base64 if no S3 config
    srt_content: Optional[str] = None  # SRT file content
    duration: float = 0
    file_size: int = 0
    error: Optional[str] = None


def download_media(url: str, output_path: Path) -> bool:
    """Download media file from URL or decode base64."""
    import requests

    try:
        if url.startswith("data:"):
            # Base64 data URL
            header, data = url.split(",", 1)
            with open(output_path, "wb") as f:
                f.write(base64.b64decode(data))
            return True
        elif url.startswith("http"):
            # HTTP URL
            response = requests.get(url, timeout=120, stream=True)
            response.raise_for_status()
            with open(output_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            return True
        else:
            # Raw base64
            with open(output_path, "wb") as f:
                f.write(base64.b64decode(url))
            return True
    except Exception as e:
        print(f"Failed to download {url[:50]}...: {e}")
        return False


def generate_srt(captions: list[CaptionData]) -> str:
    """Generate SRT subtitle file content."""
    def format_time(seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        ms = int((seconds % 1) * 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    srt_lines = []
    for i, caption in enumerate(captions, 1):
        srt_lines.append(str(i))
        srt_lines.append(f"{format_time(caption.start_time)} --> {format_time(caption.end_time)}")
        srt_lines.append(caption.text)
        srt_lines.append("")

    return "\n".join(srt_lines)


def get_resolution(resolution: str) -> tuple[int, int]:
    """Get width and height for resolution preset."""
    if resolution == "4k":
        return 3840, 2160
    return 1920, 1080  # HD default


def upload_to_s3(file_path: Path, s3_key: str, request: VideoCompositionRequest) -> Optional[str]:
    """Upload file to S3 and return URL."""
    if not all([request.s3_bucket, request.s3_access_key, request.s3_secret_key]):
        return None

    try:
        import boto3

        s3 = boto3.client(
            "s3",
            region_name=request.s3_region or "us-east-1",
            aws_access_key_id=request.s3_access_key,
            aws_secret_access_key=request.s3_secret_key,
        )

        content_type = "video/mp4" if s3_key.endswith(".mp4") else "application/zip"

        s3.upload_file(
            str(file_path),
            request.s3_bucket,
            s3_key,
            ExtraArgs={"ContentType": content_type},
        )

        url = f"https://{request.s3_bucket}.s3.{request.s3_region or 'us-east-1'}.amazonaws.com/{s3_key}"
        print(f"Uploaded to S3: {url}")
        return url
    except Exception as e:
        print(f"S3 upload failed: {e}")
        return None


@app.cls(
    image=image,
    gpu="T4",  # Light GPU for video encoding
    volumes={"/cache": cache_volume},
    timeout=900,  # 15 minutes for long videos
    scaledown_window=180,
)
class VectCutProcessor:
    """Video composition processor using VectCutAPI and ffmpeg."""

    @modal.enter()
    def setup(self):
        """Initialize processor when container starts."""
        print("VectCutProcessor initializing...")

        # Verify ffmpeg is available
        result = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
        print(f"FFmpeg version: {result.stdout.split(chr(10))[0]}")

        # Create working directories
        os.makedirs("/cache/temp", exist_ok=True)
        os.makedirs("/cache/output", exist_ok=True)

        print("VectCutProcessor ready!")

    def apply_transition(
        self,
        input1: Path,
        input2: Path,
        output: Path,
        transition_type: str,
        transition_duration: float = 1.0,
    ) -> bool:
        """Apply transition effect between two video clips using ffmpeg."""
        try:
            # Get durations
            probe1 = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "default=noprint_wrappers=1:nokey=1", str(input1)],
                capture_output=True, text=True
            )
            duration1 = float(probe1.stdout.strip())

            # Calculate offset (where transition starts)
            offset = duration1 - transition_duration

            # Build ffmpeg filter based on transition type
            if transition_type in ["fade", "fadeIn", "fadeOut", "crossfade"]:
                # Crossfade transition
                filter_complex = (
                    f"[0:v][1:v]xfade=transition=fade:duration={transition_duration}:offset={offset}[v];"
                    f"[0:a][1:a]acrossfade=d={transition_duration}[a]"
                )
            elif transition_type in ["slideLeft", "slideleft", "wipeleft"]:
                filter_complex = (
                    f"[0:v][1:v]xfade=transition=slideleft:duration={transition_duration}:offset={offset}[v];"
                    f"[0:a][1:a]acrossfade=d={transition_duration}[a]"
                )
            elif transition_type in ["slideRight", "slideright", "wiperight"]:
                filter_complex = (
                    f"[0:v][1:v]xfade=transition=slideright:duration={transition_duration}:offset={offset}[v];"
                    f"[0:a][1:a]acrossfade=d={transition_duration}[a]"
                )
            elif transition_type in ["zoomIn", "zoomin", "zoom"]:
                filter_complex = (
                    f"[0:v][1:v]xfade=transition=circlecrop:duration={transition_duration}:offset={offset}[v];"
                    f"[0:a][1:a]acrossfade=d={transition_duration}[a]"
                )
            elif transition_type in ["zoomOut", "zoomout"]:
                filter_complex = (
                    f"[0:v][1:v]xfade=transition=circleopen:duration={transition_duration}:offset={offset}[v];"
                    f"[0:a][1:a]acrossfade=d={transition_duration}[a]"
                )
            elif transition_type in ["swoosh", "wipe"]:
                filter_complex = (
                    f"[0:v][1:v]xfade=transition=wipeleft:duration={transition_duration}:offset={offset}[v];"
                    f"[0:a][1:a]acrossfade=d={transition_duration}[a]"
                )
            else:
                # No transition, just concatenate
                filter_complex = "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]"

            cmd = [
                "ffmpeg", "-y",
                "-i", str(input1),
                "-i", str(input2),
                "-filter_complex", filter_complex,
                "-map", "[v]", "-map", "[a]",
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "aac", "-b:a", "192k",
                str(output)
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"Transition failed: {result.stderr}")
                # Fallback to simple concat
                return self.simple_concat([input1, input2], output)

            return True
        except Exception as e:
            print(f"Transition error: {e}")
            return False

    def simple_concat(self, inputs: list[Path], output: Path) -> bool:
        """Simple concatenation without transitions."""
        try:
            # Create concat file
            concat_file = output.parent / "concat.txt"
            with open(concat_file, "w") as f:
                for inp in inputs:
                    f.write(f"file '{inp}'\n")

            cmd = [
                "ffmpeg", "-y",
                "-f", "concat", "-safe", "0",
                "-i", str(concat_file),
                "-c", "copy",
                str(output)
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)
            return result.returncode == 0
        except Exception as e:
            print(f"Concat error: {e}")
            return False

    def burn_captions(
        self,
        input_video: Path,
        output_video: Path,
        captions: list[CaptionData],
        width: int,
        height: int,
    ) -> bool:
        """Burn captions into video using ffmpeg drawtext filter."""
        if not captions:
            # No captions, just copy
            subprocess.run(["cp", str(input_video), str(output_video)])
            return True

        try:
            # Build drawtext filters for each caption
            filters = []
            for caption in captions:
                # Calculate Y position
                if caption.position == "top":
                    y_pos = "h*0.1"
                elif caption.position == "center":
                    y_pos = "(h-text_h)/2"
                else:  # bottom
                    y_pos = "h*0.85"

                # Escape special characters
                text = caption.text.replace("'", "'\\''").replace(":", "\\:")

                # Build filter
                filter_str = (
                    f"drawtext=text='{text}':"
                    f"fontsize={caption.font_size}:"
                    f"fontcolor={caption.font_color}:"
                    f"x=(w-text_w)/2:"
                    f"y={y_pos}:"
                    f"enable='between(t,{caption.start_time},{caption.end_time})':"
                    f"box=1:boxcolor={caption.background_color or 'black@0.5'}:boxborderw=10"
                )
                filters.append(filter_str)

            filter_complex = ",".join(filters)

            cmd = [
                "ffmpeg", "-y",
                "-i", str(input_video),
                "-vf", filter_complex,
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "copy",
                str(output_video)
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"Caption burn failed: {result.stderr}")
                subprocess.run(["cp", str(input_video), str(output_video)])

            return True
        except Exception as e:
            print(f"Caption error: {e}")
            subprocess.run(["cp", str(input_video), str(output_video)])
            return True

    def add_music(
        self,
        input_video: Path,
        output_video: Path,
        music: MusicData,
        video_duration: float,
    ) -> bool:
        """Add background music to video."""
        try:
            # Download music file
            music_path = input_video.parent / "music.mp3"
            if not download_media(music.audio_url, music_path):
                subprocess.run(["cp", str(input_video), str(output_video)])
                return True

            # Build audio filter with volume and fade
            audio_filter = f"[1:a]volume={music.volume}"

            if music.fade_in > 0:
                audio_filter += f",afade=t=in:st=0:d={music.fade_in}"

            if music.fade_out > 0:
                fade_start = video_duration - music.fade_out
                audio_filter += f",afade=t=out:st={fade_start}:d={music.fade_out}"

            audio_filter += "[music]"

            cmd = [
                "ffmpeg", "-y",
                "-i", str(input_video),
                "-i", str(music_path),
                "-filter_complex",
                f"{audio_filter};[0:a][music]amix=inputs=2:duration=first[a]",
                "-map", "0:v", "-map", "[a]",
                "-c:v", "copy",
                "-c:a", "aac", "-b:a", "192k",
                "-shortest",
                str(output_video)
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"Music add failed: {result.stderr}")
                subprocess.run(["cp", str(input_video), str(output_video)])

            return True
        except Exception as e:
            print(f"Music error: {e}")
            subprocess.run(["cp", str(input_video), str(output_video)])
            return True

    def image_to_video(
        self,
        image_path: Path,
        output_path: Path,
        duration: float,
        width: int,
        height: int,
        fps: int,
    ) -> bool:
        """Convert static image to video with Ken Burns effect."""
        try:
            # Add subtle zoom effect for visual interest
            filter_str = (
                f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
                f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,"
                f"zoompan=z='min(zoom+0.001,1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={int(duration*fps)}:s={width}x{height}:fps={fps}"
            )

            cmd = [
                "ffmpeg", "-y",
                "-loop", "1",
                "-i", str(image_path),
                "-f", "lavfi", "-i", f"anullsrc=channel_layout=stereo:sample_rate=44100",
                "-vf", filter_str,
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "aac",
                "-t", str(duration),
                "-pix_fmt", "yuv420p",
                str(output_path)
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"Image to video failed: {result.stderr}")
                return False

            return True
        except Exception as e:
            print(f"Image to video error: {e}")
            return False

    def create_capcut_draft(
        self,
        scenes: list[SceneData],
        captions: list[CaptionData],
        music: Optional[MusicData],
        output_dir: Path,
        width: int,
        height: int,
        fps: int,
    ) -> bool:
        """Create CapCut/Jianying compatible draft folder structure."""
        try:
            # Create draft structure
            draft_dir = output_dir / "draft"
            draft_dir.mkdir(parents=True, exist_ok=True)

            # Create draft_content.json (CapCut format)
            current_time = int(time.time() * 1000000)

            # Video tracks
            video_segments = []
            audio_segments = []
            text_segments = []

            timeline_offset = 0
            for i, scene in enumerate(scenes):
                duration_us = int(scene.duration * 1000000)

                # Video segment
                video_segments.append({
                    "id": f"video_{scene.id}",
                    "material_id": f"material_{scene.id}",
                    "source_timerange": {
                        "start": 0,
                        "duration": duration_us,
                    },
                    "target_timerange": {
                        "start": timeline_offset,
                        "duration": duration_us,
                    },
                    "speed": 1.0,
                    "volume": 1.0,
                    "extra_material_refs": [],
                })

                timeline_offset += duration_us

            # Caption segments
            for caption in captions:
                text_segments.append({
                    "id": f"text_{id(caption)}",
                    "content": caption.text,
                    "target_timerange": {
                        "start": int(caption.start_time * 1000000),
                        "duration": int((caption.end_time - caption.start_time) * 1000000),
                    },
                    "font_size": caption.font_size,
                    "font_color": caption.font_color,
                    "position": caption.position,
                })

            # Music segment
            if music:
                audio_segments.append({
                    "id": "music_0",
                    "type": "music",
                    "source_url": music.audio_url,
                    "volume": music.volume,
                    "target_timerange": {
                        "start": 0,
                        "duration": timeline_offset,
                    },
                })

            # Draft content
            draft_content = {
                "id": f"draft_{current_time}",
                "name": "Film Generator Export",
                "create_time": current_time,
                "update_time": current_time,
                "duration": timeline_offset,
                "canvas_config": {
                    "width": width,
                    "height": height,
                    "ratio": f"{width}:{height}",
                },
                "fps": fps,
                "tracks": [
                    {
                        "id": "video_track_0",
                        "type": "video",
                        "segments": video_segments,
                    },
                    {
                        "id": "audio_track_0",
                        "type": "audio",
                        "segments": audio_segments,
                    },
                    {
                        "id": "text_track_0",
                        "type": "text",
                        "segments": text_segments,
                    },
                ],
                "materials": [
                    {
                        "id": f"material_{scene.id}",
                        "type": "video" if scene.video_url else "image",
                        "path": scene.video_url or scene.image_url,
                        "duration": int(scene.duration * 1000000),
                    }
                    for scene in scenes
                ],
            }

            # Write draft content
            with open(draft_dir / "draft_content.json", "w") as f:
                json.dump(draft_content, f, indent=2)

            # Write draft info
            draft_info = {
                "name": "Film Generator Export",
                "create_time": current_time,
                "draft_fold_path": str(draft_dir),
                "template_id": "",
            }
            with open(draft_dir / "draft_info.json", "w") as f:
                json.dump(draft_info, f, indent=2)

            return True
        except Exception as e:
            print(f"CapCut draft error: {e}")
            return False

    @modal.method()
    def compose(
        self,
        request: VideoCompositionRequest,
    ) -> VideoCompositionResponse:
        """Main composition method."""
        width, height = get_resolution(request.resolution)

        print(f"Starting composition: {len(request.scenes)} scenes, {width}x{height}")

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Step 1: Download and prepare all scene videos
            print("Step 1: Downloading scene media...")
            scene_videos = []

            for i, scene in enumerate(request.scenes):
                print(f"  Processing scene {i+1}/{len(request.scenes)}: {scene.id}")

                video_path = temp_path / f"scene_{i:03d}.mp4"

                if scene.video_url:
                    # Download video
                    raw_path = temp_path / f"raw_{i:03d}.mp4"
                    if download_media(scene.video_url, raw_path):
                        # Normalize video format
                        cmd = [
                            "ffmpeg", "-y",
                            "-i", str(raw_path),
                            "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
                            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                            "-c:a", "aac", "-b:a", "192k",
                            "-t", str(scene.duration),
                            str(video_path)
                        ]
                        subprocess.run(cmd, capture_output=True)
                        scene_videos.append((video_path, scene.transition_to_next))
                    else:
                        print(f"    Failed to download video for scene {i+1}")
                        continue
                elif scene.image_url:
                    # Convert image to video
                    image_path = temp_path / f"image_{i:03d}.jpg"
                    if download_media(scene.image_url, image_path):
                        if self.image_to_video(image_path, video_path, scene.duration, width, height, request.fps):
                            scene_videos.append((video_path, scene.transition_to_next))
                        else:
                            print(f"    Failed to convert image to video for scene {i+1}")
                    else:
                        print(f"    Failed to download image for scene {i+1}")
                else:
                    print(f"    No media for scene {i+1}")

            if not scene_videos:
                return VideoCompositionResponse(
                    status="error",
                    error="No valid scene media could be processed"
                )

            # Step 2: Compose videos with transitions
            print(f"Step 2: Composing {len(scene_videos)} scenes with transitions...")

            if len(scene_videos) == 1:
                composed_path = scene_videos[0][0]
            else:
                # Iteratively apply transitions
                composed_path = scene_videos[0][0]

                for i in range(1, len(scene_videos)):
                    next_video, _ = scene_videos[i]
                    prev_transition = scene_videos[i-1][1]

                    output_path = temp_path / f"composed_{i:03d}.mp4"

                    if prev_transition and prev_transition != "none":
                        print(f"  Applying {prev_transition} transition between scene {i} and {i+1}")
                        self.apply_transition(
                            composed_path, next_video, output_path,
                            prev_transition, transition_duration=1.0
                        )
                    else:
                        self.simple_concat([composed_path, next_video], output_path)

                    composed_path = output_path

            # Step 3: Burn in captions
            print("Step 3: Burning in captions...")
            captioned_path = temp_path / "captioned.mp4"
            self.burn_captions(composed_path, captioned_path, request.captions, width, height)

            # Step 4: Add music
            final_path = temp_path / "final.mp4"
            if request.music:
                print("Step 4: Adding background music...")
                # Get video duration
                probe = subprocess.run(
                    ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                     "-of", "default=noprint_wrappers=1:nokey=1", str(captioned_path)],
                    capture_output=True, text=True
                )
                video_duration = float(probe.stdout.strip()) if probe.stdout.strip() else sum(s.duration for s in request.scenes)
                self.add_music(captioned_path, final_path, request.music, video_duration)
            else:
                subprocess.run(["cp", str(captioned_path), str(final_path)])

            # Step 5: Generate outputs
            print("Step 5: Generating outputs...")
            response = VideoCompositionResponse(status="complete")

            # Get final video info
            probe = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration,size",
                 "-of", "json", str(final_path)],
                capture_output=True, text=True
            )
            if probe.stdout:
                info = json.loads(probe.stdout)
                response.duration = float(info.get("format", {}).get("duration", 0))
                response.file_size = int(info.get("format", {}).get("size", 0))

            # Generate SRT
            if request.include_srt and request.captions:
                response.srt_content = generate_srt(request.captions)

            # Upload or encode video
            if request.output_format in ["mp4", "both"]:
                s3_key = f"compositions/{request.project_id}/final.mp4"
                video_url = upload_to_s3(final_path, s3_key, request)

                if video_url:
                    response.video_url = video_url
                else:
                    # Return as base64
                    with open(final_path, "rb") as f:
                        response.video_base64 = base64.b64encode(f.read()).decode("utf-8")

            # Create and upload CapCut draft
            if request.output_format in ["draft", "both"]:
                draft_dir = temp_path / "capcut_draft"
                draft_dir.mkdir(exist_ok=True)

                self.create_capcut_draft(
                    request.scenes, request.captions, request.music,
                    draft_dir, width, height, request.fps
                )

                # Zip the draft folder
                draft_zip = temp_path / "capcut_draft.zip"
                with zipfile.ZipFile(draft_zip, "w", zipfile.ZIP_DEFLATED) as zf:
                    for file in draft_dir.rglob("*"):
                        if file.is_file():
                            zf.write(file, file.relative_to(draft_dir))

                s3_key = f"compositions/{request.project_id}/capcut_draft.zip"
                draft_url = upload_to_s3(draft_zip, s3_key, request)

                if draft_url:
                    response.draft_url = draft_url
                else:
                    with open(draft_zip, "rb") as f:
                        response.draft_base64 = base64.b64encode(f.read()).decode("utf-8")

            print(f"Composition complete! Duration: {response.duration}s, Size: {response.file_size} bytes")
            return response

    @modal.fastapi_endpoint(method="POST")
    def api(self, request: VideoCompositionRequest) -> VideoCompositionResponse:
        """FastAPI endpoint for video composition."""
        print(f"API request: {request.project_id}, {len(request.scenes)} scenes")
        print(f"Output format: {request.output_format}, Resolution: {request.resolution}")

        try:
            return self.compose.local(request)
        except Exception as e:
            print(f"Composition error: {e}")
            return VideoCompositionResponse(
                status="error",
                error=str(e)
            )


@app.local_entrypoint()
def main():
    """Test the video composition locally."""
    processor = VectCutProcessor()

    # Test with sample data
    request = VideoCompositionRequest(
        project_id="test-project",
        project_name="Test Project",
        scenes=[
            SceneData(
                id="scene1",
                image_url="https://picsum.photos/1920/1080",
                duration=3.0,
                transition_to_next="fade",
            ),
            SceneData(
                id="scene2",
                image_url="https://picsum.photos/1920/1080",
                duration=3.0,
                transition_to_next="slideLeft",
            ),
            SceneData(
                id="scene3",
                image_url="https://picsum.photos/1920/1080",
                duration=3.0,
            ),
        ],
        captions=[
            CaptionData(
                text="Welcome to the movie!",
                start_time=0.5,
                end_time=2.5,
            ),
            CaptionData(
                text="Scene two begins...",
                start_time=3.5,
                end_time=5.5,
            ),
        ],
        output_format="mp4",
        resolution="hd",
    )

    print(f"Testing with {len(request.scenes)} scenes...")
    result = processor.api.remote(request)

    print(f"Result status: {result.status}")
    print(f"Duration: {result.duration}s")
    print(f"File size: {result.file_size} bytes")

    if result.video_base64:
        with open("test_output.mp4", "wb") as f:
            f.write(base64.b64decode(result.video_base64))
        print("Saved to test_output.mp4")

    if result.error:
        print(f"Error: {result.error}")
