"""
Modal Image Generation Endpoint - Qwen-Image
Best quality text-to-image with excellent text rendering (20B model)

Deploy: modal deploy modal/image_generator.py
Test locally: modal run modal/image_generator.py

Endpoint returns base64 encoded image.
"""

import io
import base64

import modal

# Modal app configuration
app = modal.App("film-generator-image")

# Create optimized CUDA image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git")
    .pip_install(
        "torch==2.4.0",
        "git+https://github.com/huggingface/diffusers",
        "transformers>=4.44.0",
        "accelerate>=0.33.0",
        "safetensors",
        "sentencepiece",
        "protobuf",
        "pydantic>=2.0",
        "pillow",
        "fastapi",
    )
    .env({"HF_HOME": "/cache/huggingface"})
)

# Volume for caching models
model_volume = modal.Volume.from_name("image-gen-models", create_if_missing=True)


from pydantic import BaseModel


class ImageGenerationRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "1:1"  # "1:1", "16:9", "9:16", "4:3", "3:4"
    resolution: str = "2k"  # "hd", "2k", "4k"
    num_inference_steps: int = 50
    guidance_scale: float = 4.0


class ImageGenerationResponse(BaseModel):
    image: str  # Base64 encoded image
    width: int
    height: int


def get_qwen_dimensions(aspect_ratio: str) -> tuple[int, int]:
    """Get Qwen-Image optimal dimensions for aspect ratio."""
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


@app.cls(
    image=image,
    gpu="H100",  # H100 for 20B model
    volumes={"/cache": model_volume},
    timeout=600,
    scaledown_window=120,
)
class QwenImageGenerator:
    """Qwen-Image generation endpoint - best quality with text rendering."""

    @modal.enter()
    def load_model(self):
        """Load Qwen-Image model when container starts."""
        import torch
        from diffusers import DiffusionPipeline

        print("Loading Qwen-Image model (20B)...")

        self.pipe = DiffusionPipeline.from_pretrained(
            "Qwen/Qwen-Image",
            torch_dtype=torch.bfloat16,
            cache_dir="/cache/huggingface",
        )
        self.pipe.to("cuda")

        print("Qwen-Image loaded successfully!")

    @modal.method()
    def generate(
        self,
        prompt: str,
        width: int = 1328,
        height: int = 1328,
        num_inference_steps: int = 50,
        guidance_scale: float = 4.0,
        seed: int = 42,
    ) -> bytes:
        """Generate an image from a prompt."""
        import torch

        # Add quality magic words for better results
        enhanced_prompt = prompt + ", Ultra HD, 4K, cinematic composition."

        with torch.inference_mode():
            result = self.pipe(
                prompt=enhanced_prompt,
                negative_prompt="",
                width=width,
                height=height,
                num_inference_steps=num_inference_steps,
                true_cfg_scale=guidance_scale,
                generator=torch.Generator(device="cuda").manual_seed(seed),
            )

        image = result.images[0]

        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return buffer.getvalue()

    @modal.fastapi_endpoint(method="POST")
    def api(self, request: ImageGenerationRequest) -> ImageGenerationResponse:
        """FastAPI endpoint for Qwen-Image generation."""
        width, height = get_qwen_dimensions(request.aspect_ratio)

        print(f"Qwen-Image: {width}x{height}, prompt: {request.prompt[:50]}...")

        image_bytes = self.generate.local(
            prompt=request.prompt,
            width=width,
            height=height,
            num_inference_steps=request.num_inference_steps,
            guidance_scale=request.guidance_scale,
        )

        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        return ImageGenerationResponse(
            image=f"data:image/png;base64,{image_b64}",
            width=width,
            height=height,
        )


@app.local_entrypoint()
def main():
    """Test the image generation locally."""
    generator = QwenImageGenerator()

    test_prompt = "A serene mountain landscape at sunset, cinematic lighting, highly detailed"

    print(f"Testing with prompt: {test_prompt}")

    request = ImageGenerationRequest(
        prompt=test_prompt,
        aspect_ratio="16:9",
        resolution="hd",
    )

    result = generator.api.remote(request)

    print(f"Generated image: {result.width}x{result.height}")
    print(f"Base64 length: {len(result.image)}")

    image_data = result.image.split(",")[1]
    with open("test_output.png", "wb") as f:
        f.write(base64.b64decode(image_data))
    print("Saved to test_output.png")
