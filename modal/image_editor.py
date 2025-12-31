"""
Modal Image Editor Endpoint - Qwen-Image-Edit-2511 with Reference Image Support
Best for character consistency across multiple scenes using reference images.

Deploy: modal deploy modal/image_editor.py
Test locally: modal run modal/image_editor.py

Endpoint returns base64 encoded image.
"""

import io
import base64
from typing import Optional

import modal

# Modal app configuration
app = modal.App("film-generator-image-edit")

# Create optimized CUDA image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git")
    .pip_install(
        "torch>=2.5.0",
        "git+https://github.com/huggingface/diffusers",
        "transformers>=4.44.0",
        "accelerate>=0.33.0",
        "safetensors",
        "sentencepiece",
        "protobuf",
        "pydantic>=2.0",
        "pillow",
        "fastapi",
        "httpx",
        "qwen-vl-utils",
    )
    .env({"HF_HOME": "/cache/huggingface"})
)

# Volume for caching models
model_volume = modal.Volume.from_name("image-edit-models", create_if_missing=True)


from pydantic import BaseModel


class ImageEditRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "16:9"
    num_inference_steps: int = 40
    true_cfg_scale: float = 4.0
    reference_images: Optional[list[str]] = None  # List of base64 or URL images


class ImageEditResponse(BaseModel):
    image: str  # Base64 encoded image
    width: int
    height: int


def get_dimensions(aspect_ratio: str) -> tuple[int, int]:
    """Get optimal dimensions for aspect ratio."""
    aspect_ratios = {
        "1:1": (1024, 1024),
        "16:9": (1280, 720),
        "9:16": (720, 1280),
        "4:3": (1024, 768),
        "3:4": (768, 1024),
        "3:2": (1200, 800),
        "2:3": (800, 1200),
    }
    return aspect_ratios.get(aspect_ratio, (1280, 720))


def load_image_from_source(image_source: str) -> "Image.Image":
    """Load an image from base64 data URL or HTTP URL."""
    from PIL import Image
    import httpx

    if image_source.startswith("data:"):
        # Base64 data URL
        header, data = image_source.split(",", 1)
        image_bytes = base64.b64decode(data)
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")
    elif image_source.startswith("http"):
        # HTTP URL
        response = httpx.get(image_source, timeout=30)
        response.raise_for_status()
        return Image.open(io.BytesIO(response.content)).convert("RGB")
    else:
        raise ValueError(f"Unsupported image source: {image_source[:50]}...")


@app.cls(
    image=image,
    gpu="H100",  # H100 for the large model
    volumes={"/cache": model_volume},
    timeout=600,
    scaledown_window=120,
)
class QwenImageEditor:
    """Qwen-Image-Edit-2511 endpoint for character-consistent image generation."""

    @modal.enter()
    def load_model(self):
        """Load Qwen-Image-Edit-2511 model when container starts."""
        import torch
        from diffusers import QwenImageEditPlusPipeline

        print("Loading Qwen-Image-Edit-2511 model...")

        self.pipe = QwenImageEditPlusPipeline.from_pretrained(
            "Qwen/Qwen-Image-Edit-2511",
            torch_dtype=torch.bfloat16,
            cache_dir="/cache/huggingface",
        )
        self.pipe.to("cuda")
        self.pipe.set_progress_bar_config(disable=None)

        print("Qwen-Image-Edit-2511 loaded successfully!")

    @modal.method()
    def generate(
        self,
        prompt: str,
        reference_images: list = None,
        width: int = 1280,
        height: int = 720,
        num_inference_steps: int = 40,
        true_cfg_scale: float = 4.0,
        seed: int = 42,
    ) -> bytes:
        """Generate an image using reference images for character consistency."""
        import torch

        # Build the generation kwargs
        gen_kwargs = {
            "prompt": prompt,
            "width": width,
            "height": height,
            "num_inference_steps": num_inference_steps,
            "true_cfg_scale": true_cfg_scale,
            "guidance_scale": 1.0,  # Fixed at 1.0 per docs
            "negative_prompt": " ",
            "num_images_per_prompt": 1,
            "generator": torch.manual_seed(seed),
        }

        # Add reference images if provided (Qwen-Image-Edit expects list)
        if reference_images and len(reference_images) > 0:
            print(f"Using {len(reference_images)} reference images for character consistency")
            gen_kwargs["image"] = reference_images  # Pass as list

        with torch.inference_mode():
            result = self.pipe(**gen_kwargs)

        image = result.images[0]

        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return buffer.getvalue()

    @modal.fastapi_endpoint(method="POST")
    def api(self, request: ImageEditRequest) -> ImageEditResponse:
        """FastAPI endpoint for Qwen-Image-Edit generation."""
        width, height = get_dimensions(request.aspect_ratio)

        print(f"Qwen-Image-Edit: {width}x{height}, prompt: {request.prompt[:50]}...")

        # Load reference images if provided
        reference_images = []
        if request.reference_images:
            print(f"Loading {len(request.reference_images)} reference images...")
            for img_source in request.reference_images:
                try:
                    ref_img = load_image_from_source(img_source)
                    reference_images.append(ref_img)
                    print(f"  Loaded reference image: {ref_img.size}")
                except Exception as e:
                    print(f"  Failed to load reference image: {e}")

        image_bytes = self.generate.local(
            prompt=request.prompt,
            reference_images=reference_images if reference_images else None,
            width=width,
            height=height,
            num_inference_steps=request.num_inference_steps,
            true_cfg_scale=request.true_cfg_scale,
        )

        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        return ImageEditResponse(
            image=f"data:image/png;base64,{image_b64}",
            width=width,
            height=height,
        )


@app.local_entrypoint()
def main():
    """Test the image editor locally."""
    editor = QwenImageEditor()

    test_prompt = "A person standing in a forest, cinematic lighting"

    print(f"Testing with prompt: {test_prompt}")

    request = ImageEditRequest(
        prompt=test_prompt,
        aspect_ratio="16:9",
    )

    result = editor.api.remote(request)

    print(f"Generated image: {result.width}x{result.height}")
    print(f"Base64 length: {len(result.image)}")

    image_data = result.image.split(",")[1]
    with open("test_edit_output.png", "wb") as f:
        f.write(base64.b64decode(image_data))
    print("Saved to test_edit_output.png")
