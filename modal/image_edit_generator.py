"""
Modal Image Edit Endpoint - Qwen-Image-Edit-2511
Better character consistency - can use reference images to maintain identity

Deploy: modal deploy modal/image_edit_generator.py
Test locally: modal run modal/image_edit_generator.py

Endpoint returns base64 encoded image.
"""

import io
import base64
from typing import Optional

import modal

# Modal app configuration - different name from the base model
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
        "requests",
    )
    .env({"HF_HOME": "/cache/huggingface"})
)

# Volume for caching models
model_volume = modal.Volume.from_name("image-edit-models", create_if_missing=True)


from pydantic import BaseModel


class ImageEditRequest(BaseModel):
    prompt: str
    reference_images: list[str] = []  # Base64 or URLs of reference images
    aspect_ratio: str = "1:1"
    num_inference_steps: int = 40
    guidance_scale: float = 1.0
    true_cfg_scale: float = 4.0
    seed: int = 42


class ImageEditResponse(BaseModel):
    image: str  # Base64 encoded image
    width: int
    height: int


def get_dimensions(aspect_ratio: str) -> tuple[int, int]:
    """Get optimal dimensions for aspect ratio."""
    aspect_ratios = {
        "1:1": (1328, 1328),
        "16:9": (1664, 928),
        "9:16": (928, 1664),
        "4:3": (1472, 1140),
        "3:4": (1140, 1472),
        "3:2": (1584, 1056),
        "2:3": (1056, 1584),
    }
    return aspect_ratios.get(aspect_ratio, (1328, 1328))


def load_image_from_source(source: str):
    """Load image from base64 string or URL."""
    from PIL import Image
    import requests

    if source.startswith("data:"):
        # Base64 data URL
        base64_data = source.split(",")[1]
        image_bytes = base64.b64decode(base64_data)
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")
    elif source.startswith("http"):
        # URL
        response = requests.get(source, timeout=30)
        response.raise_for_status()
        return Image.open(io.BytesIO(response.content)).convert("RGB")
    else:
        # Raw base64
        image_bytes = base64.b64decode(source)
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")


@app.cls(
    image=image,
    gpu="H100",
    volumes={"/cache": model_volume},
    timeout=600,
    scaledown_window=120,
)
class QwenImageEditGenerator:
    """Qwen-Image-Edit-2511 - Better character consistency with reference images."""

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
        width: int = 1328,
        height: int = 1328,
        num_inference_steps: int = 40,
        guidance_scale: float = 1.0,
        true_cfg_scale: float = 4.0,
        seed: int = 42,
    ) -> bytes:
        """Generate an image with optional reference images for consistency."""
        import torch

        # Enhanced prompt for better results
        enhanced_prompt = prompt + ", Ultra HD, 4K, cinematic composition."

        # Prepare inputs
        inputs = {
            "prompt": enhanced_prompt,
            "negative_prompt": " ",
            "generator": torch.manual_seed(seed),
            "true_cfg_scale": true_cfg_scale,
            "num_inference_steps": num_inference_steps,
            "guidance_scale": guidance_scale,
            "num_images_per_prompt": 1,
            "width": width,
            "height": height,
        }

        # Add reference images if provided
        if reference_images and len(reference_images) > 0:
            inputs["image"] = reference_images
            print(f"Using {len(reference_images)} reference image(s) for consistency")

        with torch.inference_mode():
            result = self.pipe(**inputs)

        image = result.images[0]

        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return buffer.getvalue()

    @modal.fastapi_endpoint(method="POST")
    def api(self, request: ImageEditRequest) -> ImageEditResponse:
        """FastAPI endpoint for Qwen-Image-Edit-2511 generation."""
        width, height = get_dimensions(request.aspect_ratio)

        print(f"Qwen-Image-Edit: {width}x{height}, prompt: {request.prompt[:50]}...")
        print(f"Reference images: {len(request.reference_images)}")

        # Load reference images if provided
        ref_images = []
        for ref_source in request.reference_images:
            try:
                img = load_image_from_source(ref_source)
                ref_images.append(img)
                print(f"Loaded reference image: {img.size}")
            except Exception as e:
                print(f"Failed to load reference image: {e}")

        image_bytes = self.generate.local(
            prompt=request.prompt,
            reference_images=ref_images if ref_images else None,
            width=width,
            height=height,
            num_inference_steps=request.num_inference_steps,
            guidance_scale=request.guidance_scale,
            true_cfg_scale=request.true_cfg_scale,
            seed=request.seed,
        )

        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        return ImageEditResponse(
            image=f"data:image/png;base64,{image_b64}",
            width=width,
            height=height,
        )


@app.local_entrypoint()
def main():
    """Test the image edit generation locally."""
    generator = QwenImageEditGenerator()

    test_prompt = "A friendly cartoon bear waving hello in a forest"

    print(f"Testing with prompt: {test_prompt}")

    request = ImageEditRequest(
        prompt=test_prompt,
        aspect_ratio="16:9",
    )

    result = generator.api.remote(request)

    print(f"Generated image: {result.width}x{result.height}")
    print(f"Base64 length: {len(result.image)}")

    image_data = result.image.split(",")[1]
    with open("test_output_edit.png", "wb") as f:
        f.write(base64.b64decode(image_data))
    print("Saved to test_output_edit.png")
