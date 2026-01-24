#!/usr/bin/env python3
"""Create a professional thumbnail for Gumroad listing"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

# Create a new 800x800 image
width, height = 800, 800
img = Image.new('RGB', (width, height), color=(102, 126, 234))

# Create a gradient background
draw = ImageDraw.Draw(img)

# Gradient background
for i in range(height):
    r = int(102 + (118 - 102) * i / height)
    g = int(126 + (75 - 126) * i / height)
    b = int(234 + (162 - 234) * i / height)
    draw.rectangle([(0, i), (width, i + 1)], fill=(r, g, b))

# Try to use system fonts
try:
    # Try different font paths
    font_paths = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Avenir.ttc",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
    ]

    title_font = None
    subtitle_font = None
    badge_font = None

    for font_path in font_paths:
        if os.path.exists(font_path):
            try:
                title_font = ImageFont.truetype(font_path, 80)
                subtitle_font = ImageFont.truetype(font_path, 40)
                badge_font = ImageFont.truetype(font_path, 32)
                break
            except:
                continue

    if not title_font:
        # Fallback to default font
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        badge_font = ImageFont.load_default()

except:
    title_font = ImageFont.load_default()
    subtitle_font = ImageFont.load_default()
    badge_font = ImageFont.load_default()

# Add white overlay rectangle for text background
overlay = Image.new('RGBA', (700, 400), (255, 255, 255, 220))
img.paste(overlay, (50, 200), overlay)

# Add title
draw = ImageDraw.Draw(img)
title = "ArtFlowly"
title_bbox = draw.textbbox((0, 0), title, font=title_font)
title_width = title_bbox[2] - title_bbox[0]
title_x = (width - title_width) // 2
draw.text((title_x, 250), title, font=title_font, fill=(102, 126, 234))

# Add subtitle
subtitle = "Complete AI Film Studio"
subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
subtitle_x = (width - subtitle_width) // 2
draw.text((subtitle_x, 350), subtitle, font=subtitle_font, fill=(75, 85, 99))

# Add feature badges
features = ["🎬 Full Workflow", "🎭 Consistent Characters"]
feature_y = 450
for i, feature in enumerate(features):
    feature_x = 150 + i * 300
    # Draw rounded rectangle for badge
    badge_rect = [(feature_x - 10, feature_y - 5), (feature_x + 200, feature_y + 35)]
    draw.rounded_rectangle(badge_rect, radius=20, fill=(236, 239, 255))
    draw.text((feature_x, feature_y), feature, font=badge_font, fill=(102, 126, 234))

# Add FREE badge in corner
free_badge = Image.new('RGBA', (300, 100), (16, 185, 129, 255))
free_draw = ImageDraw.Draw(free_badge)
free_draw.text((50, 30), "FREE BYOK!", font=badge_font, fill="white")
rotated_badge = free_badge.rotate(-45, expand=True)
img.paste(rotated_badge, (550, -50), rotated_badge)

# Add price tag
price_rect = [(50, 650), (250, 750)]
draw.rounded_rectangle(price_rect, radius=20, fill=(255, 107, 107))
draw.text((60, 665), "$149", font=subtitle_font, fill=(255, 255, 255, 180))
draw.line([(55, 690), (140, 690)], fill="white", width=4)
draw.text((145, 665), "$39", font=title_font, fill="white")

# Add bottom section with character grid representation
bottom_rect = [(0, 600), (800, 800)]
draw.rectangle(bottom_rect, fill=(0, 0, 0, 40))

# Draw character consistency visual
for i in range(4):
    x = 150 + i * 150
    y = 680
    char_rect = [(x, y), (x + 80, y + 80)]
    draw.rounded_rectangle(char_rect, radius=10, fill=(255, 255, 255, 30), outline=(255, 255, 255, 150), width=3)
    draw.text((x + 25, y + 20), "👧", font=subtitle_font, fill="white")

# Add subtle glow effect
img = img.filter(ImageFilter.SMOOTH_MORE)

# Save the thumbnail
output_path = "/Volumes/DATA/Python/artflowly_film-generator/docs/gumroad-thumbnail.png"
img.save(output_path, 'PNG', optimize=True, quality=95)
print(f"Thumbnail saved to: {output_path}")