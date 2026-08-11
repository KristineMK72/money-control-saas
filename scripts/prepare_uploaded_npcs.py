"""Prepare uploaded NPC JPGs for lightweight Three.js billboards.

The supplied files contain a baked checkerboard and, in two cases, a caption.
This script removes those areas without redrawing the artwork, centers each
cutout on a consistent transparent canvas, and writes optimized WebP sprites.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
NPC_DIR = ROOT / "public" / "npcs"
CANVAS_SIZE = (512, 1152)

# filename: (output role, crop height before caption)
SOURCES = {
    "6veMI.jpg": ("ben", 1392),
    "T9tk0.jpg": ("merchant", None),
    "MAj68.jpg": ("postmaster", None),
    "uBjJN.jpg": ("blacksmith", None),
    "UPzPI.jpg": ("farmer", 946),
    "Y4DnQ.jpg": ("sailor", None),
    "XYRwi.jpg": ("carpenter", None),
}


def checkerboard_alpha(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    rgb = rgba[:, :, :3].astype(np.int16)
    channel_spread = rgb.max(axis=2) - rgb.min(axis=2)
    brightness = rgb.mean(axis=2)

    # The uploaded JPGs use a light neutral checkerboard. Flood only neutral,
    # bright pixels connected to an outer edge so white clothing remains intact.
    # A wider neutral/light range lets the flood pass through the pale cyan
    # JPEG halos around holograms and clear checkerboard trapped inside them.
    # Dark outlines around clothing keep light fabric from joining the flood.
    background_candidate = (channel_spread <= 110) & (brightness >= 135)
    seeds = np.zeros(background_candidate.shape, dtype=bool)
    seeds[0, :] = background_candidate[0, :]
    seeds[-1, :] = background_candidate[-1, :]
    seeds[:, 0] = background_candidate[:, 0]
    seeds[:, -1] = background_candidate[:, -1]
    background = ndimage.binary_propagation(seeds, mask=background_candidate)

    # Restore deliberately colored hologram pixels that the permissive flood
    # may cross while reaching checkerboard trapped inside a glow.
    hologram_color = (channel_spread > 48) & (brightness > 70)
    foreground = (~background) | hologram_color
    labels, count = ndimage.label(foreground)
    if count:
        areas = np.bincount(labels.ravel())
        areas[0] = 0
        main_label = int(areas.argmax())
        main_points = np.argwhere(labels == main_label)
        y0, x0 = main_points.min(axis=0)
        y1, x1 = main_points.max(axis=0)

        keep = np.zeros_like(foreground)
        for label_id in range(1, count + 1):
            if areas[label_id] < 80:
                continue
            points = np.argwhere(labels == label_id)
            cy0, cx0 = points.min(axis=0)
            cy1, cx1 = points.max(axis=0)
            near_main = not (
                cx1 < x0 - 60
                or cx0 > x1 + 60
                or cy1 < y0 - 60
                or cy0 > y1 + 60
            )
            if label_id == main_label or near_main:
                keep |= labels == label_id
        foreground = keep

    alpha = Image.fromarray((foreground * 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.55))
    result = Image.fromarray(rgba)
    result.putalpha(alpha)
    return result


def normalize_sprite(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        raise ValueError("No character remained after background removal")

    subject = image.crop(bbox)
    max_width = CANVAS_SIZE[0] - 32
    max_height = CANVAS_SIZE[1] - 28
    scale = min(max_width / subject.width, max_height / subject.height)
    size = (
        max(1, round(subject.width * scale)),
        max(1, round(subject.height * scale)),
    )
    subject = subject.resize(size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    x = (CANVAS_SIZE[0] - subject.width) // 2
    y = CANVAS_SIZE[1] - subject.height - 12
    canvas.alpha_composite(subject, (x, y))
    return canvas


def main() -> None:
    for filename, (role, crop_height) in SOURCES.items():
        source_path = NPC_DIR / filename
        with Image.open(source_path) as source:
            if crop_height is not None:
                source = source.crop((0, 0, source.width, crop_height))
            sprite = normalize_sprite(checkerboard_alpha(source))
            sprite.save(
                NPC_DIR / f"{role}.webp",
                "WEBP",
                quality=92,
                method=6,
            )


if __name__ == "__main__":
    main()
