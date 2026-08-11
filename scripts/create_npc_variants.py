"""Create lightweight role variants from public/ben-character.png.

The source illustration remains untouched. This script selectively recolors the
green coat while retaining its painted highlights, then adds a small role badge.
Pose variation (flip, scale, and lean) is applied in Three.js at runtime.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "ben-character.png"
OUTPUT_DIR = ROOT / "public" / "npcs"

VARIANTS = {
    "ben": (None, None),
    "merchant": ((150, 54, 48), "coin"),
    "postmaster": ((46, 86, 148), "letter"),
    "blacksmith": ((68, 76, 82), "hammer"),
    "farmer": ((151, 111, 45), "wheat"),
    "sailor": ((22, 113, 126), "anchor"),
}

SILHOUETTE_PARTS = [
    [(82, 75), (100, 46), (153, 41), (187, 67), (204, 111), (194, 148), (166, 164), (94, 158), (72, 132), (72, 101)],
    [(73, 115), (190, 107), (220, 137), (228, 194), (216, 259), (213, 333), (190, 405), (151, 408), (120, 372), (92, 410), (62, 385), (57, 324), (42, 269), (51, 184)],
    [(19, 204), (96, 188), (120, 251), (42, 275), (16, 247)],
    [(176, 216), (224, 215), (222, 283), (198, 316), (164, 280)],
    [(82, 348), (182, 348), (190, 433), (163, 472), (128, 462), (110, 473), (69, 443), (66, 390)],
    [(71, 425), (122, 428), (113, 531), (91, 568), (53, 570), (69, 519)],
    [(125, 427), (177, 427), (188, 528), (218, 559), (207, 584), (152, 574), (142, 527)],
    [(48, 527), (113, 525), (107, 569), (76, 586), (20, 582), (18, 563)],
    [(145, 526), (194, 527), (225, 558), (223, 584), (180, 590), (151, 576)],
]


def recolor_coat(image: Image.Image, target: tuple[int, int, int]) -> Image.Image:
    source = image.convert("RGBA")
    pixels = source.load()
    width, height = source.size

    for y in range(int(height * 0.15), int(height * 0.73)):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            dominance = green - red
            if green < 24 or green <= red * 1.02 or green <= blue * 1.2:
                continue

            strength = min(1.0, 0.68 + max(0, dominance) / 55.0)
            luminance = (red * 0.22 + green * 0.68 + blue * 0.1) / 128.0
            replacement = tuple(min(255, int(channel * (0.52 + luminance * 0.72))) for channel in target)
            pixels[x, y] = tuple(
                int(original * (1.0 - strength) + changed * strength)
                for original, changed in zip((red, green, blue), replacement)
            ) + (alpha,)

    return source


def add_badge(image: Image.Image, badge: str) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    width, height = image.size
    cx, cy = int(width * 0.68), int(height * 0.33)
    gold = (229, 186, 72, 240)
    cream = (245, 231, 196, 245)
    steel = (198, 211, 219, 240)
    dark = (36, 25, 17, 240)

    if badge == "coin":
        radius = max(5, width // 32)
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=gold, outline=dark, width=2)
        draw.line((cx, cy - radius + 3, cx, cy + radius - 3), fill=dark, width=2)
    elif badge == "letter":
        box = (cx - 10, cy - 7, cx + 10, cy + 7)
        draw.rounded_rectangle(box, radius=2, fill=cream, outline=dark, width=2)
        draw.line((box[0] + 2, box[1] + 2, cx, cy + 1, box[2] - 2, box[1] + 2), fill=dark, width=2)
    elif badge == "hammer":
        draw.line((cx - 7, cy + 10, cx + 6, cy - 9), fill=steel, width=4)
        draw.rounded_rectangle((cx + 1, cy - 11, cx + 12, cy - 5), radius=2, fill=steel, outline=dark, width=1)
    elif badge == "wheat":
        draw.line((cx, cy + 11, cx, cy - 10), fill=gold, width=2)
        for offset in (-7, -2, 3):
            draw.line((cx, cy + offset, cx - 7, cy + offset - 5), fill=gold, width=2)
            draw.line((cx, cy + offset, cx + 7, cy + offset - 5), fill=gold, width=2)
    elif badge == "anchor":
        draw.ellipse((cx - 3, cy - 11, cx + 3, cy - 5), outline=steel, width=2)
        draw.line((cx, cy - 5, cx, cy + 10), fill=steel, width=3)
        draw.arc((cx - 10, cy, cx + 10, cy + 13), 5, 175, fill=steel, width=3)
        draw.line((cx - 7, cy - 1, cx + 7, cy - 1), fill=steel, width=2)


def cut_out_character(image: Image.Image) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)
    for part in SILHOUETTE_PARTS:
        draw.polygon(part, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(1.15))
    cutout = image.convert("RGBA")
    cutout.putalpha(mask)
    return cutout


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE)
    for name, (color, badge) in VARIANTS.items():
        variant = source.convert("RGBA") if color is None else recolor_coat(source, color)
        if badge:
            add_badge(variant, badge)
        variant = cut_out_character(variant)
        variant.save(
            OUTPUT_DIR / f"{name}.webp",
            "WEBP",
            quality=88,
            method=6,
        )


if __name__ == "__main__":
    main()
