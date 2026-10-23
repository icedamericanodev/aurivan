#!/usr/bin/env python3
"""Re-save PNGs as 24-bit RGB with no alpha channel (Google Play's rule for
screenshots and the feature graphic). Transparent pixels, if any, are laid
on the given background colour first.

Usage: python3 flatten_png.py [--bg "#F3F1EA"] file.png [file.png ...]
Needs Pillow (python3 -m pip install pillow).
"""
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("flatten_png.py needs Pillow: python3 -m pip install pillow")

args = sys.argv[1:]
bg = "#F3F1EA"  # Grove light background (mobile/app.json backgroundColor)
if args[:1] == ["--bg"]:
    bg, args = args[1], args[2:]
for path in args:
    img = Image.open(path)
    if img.mode != "RGB":
        rgba = img.convert("RGBA")
        flat = Image.new("RGB", rgba.size, bg)
        flat.paste(rgba, mask=rgba.getchannel("A"))
        img = flat
    img.save(path, "PNG", optimize=True)
    print(f"{path}: {img.size[0]}x{img.size[1]} {img.mode}")
