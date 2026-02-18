#!/usr/bin/env python3
"""
lafabrique.ai Hero Image Generator
Generates a hero image using Google Gemini API (Gemini 2.5 Flash or Imagen).
"""

import argparse
import base64
import json
import os
import sys
from datetime import datetime
from pathlib import Path

def load_prompt(prompt_file: str) -> str:
    """Load image prompt from a markdown file (extracts first code block or full text)."""
    text = Path(prompt_file).read_text(encoding="utf-8")
    # Try to extract content from first ``` code block
    import re
    match = re.search(r"```\n?(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()


def generate_with_gemini_flash(api_key: str, prompt: str, output_path: str):
    """Generate image using Gemini 2.5 Flash with responseModality IMAGE."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)

    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        ),
    )

    # Extract image from response parts
    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            image_data = part.inline_data.data
            mime = part.inline_data.mime_type or "image/png"
            ext = "png" if "png" in mime else "jpg"
            if not output_path.endswith(f".{ext}"):
                output_path = output_path.rsplit(".", 1)[0] + f".{ext}" if "." in output_path else output_path + f".{ext}"
            Path(output_path).write_bytes(image_data)
            print(f"✅ Image saved to {output_path} ({len(image_data)} bytes)")
            return output_path

    # If no image found, print text response for debugging
    print("⚠️  No image in response. Text parts:")
    for part in response.candidates[0].content.parts:
        if part.text:
            print(part.text)
    sys.exit(1)


def generate_with_imagen(api_key: str, prompt: str, output_path: str, aspect_ratio: str = "1:1"):
    """Generate image using Imagen 4 via the Gemini API."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)

    response = client.models.generate_images(
        model="imagen-4.0-generate-001",
        prompt=prompt,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            aspect_ratio=aspect_ratio,
            # output_mime_type="image/png",  # uncomment if supported
        ),
    )

    if response.generated_images:
        img = response.generated_images[0]
        image_data = img.image.image_bytes
        if not output_path.endswith(".png"):
            output_path = output_path.rsplit(".", 1)[0] + ".png" if "." in output_path else output_path + ".png"
        Path(output_path).write_bytes(image_data)
        print(f"✅ Image saved to {output_path} ({len(image_data)} bytes)")
        return output_path
    else:
        print("⚠️  No images generated. Check prompt or API limits.")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Generate hero image for lafabrique.ai")
    parser.add_argument("--prompt-file", default=os.path.join(os.path.dirname(__file__), "prompts", "hero-prompt.md"),
                        help="Path to markdown file containing the image prompt")
    parser.add_argument("--prompt", help="Direct prompt text (overrides --prompt-file)")
    parser.add_argument("--output", "-o", default=None,
                        help="Output file path (default: output/hero-YYYY-MM-DD.png)")
    parser.add_argument("--engine", choices=["flash", "imagen"], default="flash",
                        help="Generation engine: 'flash' (Gemini 2.5 Flash) or 'imagen' (Imagen 4)")
    parser.add_argument("--aspect-ratio", default="16:9",
                        help="Aspect ratio for Imagen (e.g., 1:1, 16:9, 4:3). Flash ignores this.")
    parser.add_argument("--api-key", default=None,
                        help="Gemini API key (default: $GEMINI_API_KEY env var)")

    args = parser.parse_args()

    # API key
    api_key = args.api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("❌ No API key. Set GEMINI_API_KEY env var or pass --api-key")
        sys.exit(1)

    # Prompt
    if args.prompt:
        prompt = args.prompt
    else:
        prompt = load_prompt(args.prompt_file)
    print(f"📝 Prompt ({len(prompt)} chars): {prompt[:100]}...")

    # Output path
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_path = args.output or str(output_dir / f"hero-{datetime.now().strftime('%Y-%m-%d')}.png")

    # Generate
    print(f"🎨 Generating with engine={args.engine}...")
    if args.engine == "flash":
        generate_with_gemini_flash(api_key, prompt, output_path)
    else:
        generate_with_imagen(api_key, prompt, output_path, args.aspect_ratio)


if __name__ == "__main__":
    main()
