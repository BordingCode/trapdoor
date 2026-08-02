#!/usr/bin/env python3
"""Generate the app icons: a lit door on a dark floor, with the floor giving way."""
from PIL import Image, ImageDraw

BG = (18, 21, 29)
BLOCK = (51, 58, 74)
TOP = (75, 85, 109)
GOLD = (242, 198, 92)
LIGHT = (255, 246, 214)
RED = (226, 88, 107)


def make(size, path):
    s = size
    img = Image.new("RGB", (s, s), BG)
    d = ImageDraw.Draw(img)
    u = s / 32.0  # design on a 32-unit grid

    # dotted backdrop
    for gy in range(4, 32, 6):
        for gx in range(4, 32, 6):
            d.rectangle([gx * u, gy * u, gx * u + u * 0.5, gy * u + u * 0.5], fill=(27, 31, 43))

    # floor with a hole punched in the left half
    floor_y = 23
    d.rectangle([0, floor_y * u, 11 * u, s], fill=BLOCK)
    d.rectangle([0, floor_y * u, 11 * u, floor_y * u + u * 0.9], fill=TOP)
    d.rectangle([17 * u, floor_y * u, s, s], fill=BLOCK)
    d.rectangle([17 * u, floor_y * u, s, floor_y * u + u * 0.9], fill=TOP)

    # the piece that just gave way, tumbling
    d.polygon([(12.4 * u, 26.2 * u), (15.6 * u, 25.2 * u), (16.6 * u, 28.4 * u), (13.4 * u, 29.4 * u)], fill=BLOCK)

    # spikes waiting in the hole
    for i in range(3):
        x0 = (11.4 + i * 1.8) * u
        d.polygon([(x0, s), (x0 + 0.9 * u, 28.4 * u), (x0 + 1.8 * u, s)], fill=RED)

    # the door, glowing
    dx0, dy0, dx1, dy1 = 19.5 * u, 13 * u, 26.5 * u, 23 * u
    d.rounded_rectangle([dx0 - u * 0.4, dy0 - u * 0.4, dx1 + u * 0.4, dy1], radius=u, fill=(138, 106, 31))
    d.rounded_rectangle([dx0, dy0, dx1, dy1], radius=u * 0.6, fill=GOLD)
    d.rectangle([(dx0 + dx1) / 2 - u * 0.35, dy0 + u * 0.8, (dx0 + dx1) / 2 + u * 0.35, dy1 - u * 0.8], fill=LIGHT)

    # the player, mid-fall over the hole
    px, py = 12.6 * u, 17.4 * u
    d.rounded_rectangle([px, py, px + 4.2 * u, py + 5.4 * u], radius=u * 0.8, fill=(244, 247, 255))
    d.rectangle([px + 1.0 * u, py + 1.7 * u, px + 1.7 * u, py + 2.6 * u], fill=(27, 31, 43))
    d.rectangle([px + 2.6 * u, py + 1.7 * u, px + 3.3 * u, py + 2.6 * u], fill=(27, 31, 43))

    img.save(path)
    print("wrote", path, size)


if __name__ == "__main__":
    import os
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    make(192, os.path.join(here, "icons", "icon-192.png"))
    make(512, os.path.join(here, "icons", "icon-512.png"))
