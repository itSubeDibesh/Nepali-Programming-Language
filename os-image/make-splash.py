"""Boot-menu background: Nepal's flag colours and pennant shape, drawn with
Pillow (Latin text only - ISOLINUX's menu can't shape Devanagari)."""
import sys

W = int(sys.argv[2]) if len(sys.argv) > 2 else 800
H = int(sys.argv[3]) if len(sys.argv) > 3 else 600
F = W / 800
from PIL import Image, ImageDraw, ImageFont

CRIMSON, BLUE, WHITE = (220, 20, 60), (0, 56, 147), (255, 255, 255)
img = Image.new("RGB", (W, H), (10, 14, 30))
d = ImageDraw.Draw(img)

# The flag: a double pennon, crimson with a blue border.
ox, oy, s = 40 * F, 24 * F, 150 * F
outer = [(ox, oy), (ox + 0.75 * s, oy + 0.62 * s), (ox + 0.2 * s, oy + 0.62 * s),
         (ox + 0.75 * s, oy + 1.25 * s), (ox, oy + 1.25 * s)]
d.polygon(outer, fill=BLUE)
m = 0.045 * s
inner = [(ox + m, oy + 1.9 * m), (ox + 0.62 * s, oy + 0.62 * s - 0.4 * m),
         (ox + 0.13 * s, oy + 0.62 * s - 0.4 * m), (ox + 0.62 * s, oy + 1.25 * s - 1.3 * m),
         (ox + m, oy + 1.25 * s - 1.3 * m)]
d.polygon(inner, fill=CRIMSON)
d.ellipse((ox + 0.09 * s, oy + 0.28 * s, ox + 0.23 * s, oy + 0.42 * s), fill=WHITE)
d.ellipse((ox + 0.12 * s, oy + 0.85 * s, ox + 0.28 * s, oy + 1.0 * s), fill=WHITE)

def font(size, bold=True):
    for p in ("/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Helvetica.ttc"):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()

d.text((250 * F, 40 * F), "NEPALI OS", font=font(int(60 * F)), fill=WHITE)
d.rectangle((252 * F, 112 * F, 640 * F, 117 * F), fill=CRIMSON)
d.text((252 * F, 128 * F), "A computer that speaks Nepali", font=font(int(24 * F)), fill=(200, 210, 235))
img.save(sys.argv[1])
