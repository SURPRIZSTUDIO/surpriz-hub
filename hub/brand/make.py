#!/usr/bin/env python3
"""Génère les visuels du hub à partir des tracés vectoriels :
   - brand/u.svg, brand/u-tile.svg        (le Ü seul, et en tuile)
   - addons/toolkit/icon.svg              (tuile Toolkit, fournie avec l'app)
   - build/icon.png (Mac, 1024) et build/icon.ico (Windows, 16 → 256)
Usage : python3 brand/make.py"""
import io, pathlib, subprocess
from PIL import Image

HUB = pathlib.Path(__file__).resolve().parent.parent
LIME, INK, TK_INK = "#DDFF12", "#1F1F1F", "#1D1D1D"

# Ü redessiné d'après le fichier fourni (boîte 245.8 × 423.7)
U_W, U_H = 245.8, 423.7
U_D = ("M0 97.3H82.4V297.5C82.4 339.63 101.14 351.3 122.9 351.3C144.66 351.3 163.4 339.63 163.4 297.5V97.3H245.8V302.29"
       "C245.8 390.13 183.9 423.7 122.9 423.7C61.9 423.7 0 390.13 0 302.29Z"
       "M38 0H107.4V65.8H38Z M138.4 0H207.8V65.8H138.4Z")
# Symbole Toolkit (grille 397 × 397)
TK = 397
TK_D = "M0 0H397V88H245L397 240V365L243 211V397H154V211L0 365V240L152 88H0Z"

def u_in(box_x, box_y, box_h, fill):
    s = box_h / U_H
    return f'<path transform="translate({box_x:.2f} {box_y:.2f}) scale({s:.5f})" fill="{fill}" d="{U_D}"/>'

def u_tile(size=617, radius=140, ratio=0.6, bg=LIME, fg=INK):
    h = size * ratio; w = h * U_W / U_H
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">'
            f'<rect width="{size}" height="{size}" rx="{radius}" fill="{bg}"/>'
            f'{u_in((size - w) / 2, (size - h) / 2, h, fg)}</svg>')

def toolkit_tile():
    # proportions relevées sur la tuile fournie (617 px, rayon 140, symbole 351 px posé en 132,146)
    s = 351 / TK
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 617 617">'
            f'<rect width="617" height="617" rx="140" fill="{LIME}"/>'
            f'<path transform="translate(132 146) scale({s:.5f})" fill="{TK_INK}" d="{TK_D}"/></svg>')

def mac_icon():
    # grille Apple : tuile 824 dans 1024, rayon 185, légère ombre
    h = 824 * 0.6; w = h * U_W / U_H
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">'
            '<defs><filter id="s" x="-10%" y="-10%" width="120%" height="130%">'
            '<feGaussianBlur in="SourceAlpha" stdDeviation="12"/><feOffset dy="10"/>'
            '<feComponentTransfer><feFuncA type="linear" slope="0.28"/></feComponentTransfer>'
            '<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
            f'<rect x="100" y="100" width="824" height="824" rx="185" fill="{LIME}" filter="url(#s)"/>'
            f'{u_in(512 - w / 2, 512 - h / 2, h, INK)}</svg>')

def render(svg, px):
    out = subprocess.run(["rsvg-convert", "-w", str(px), "-h", str(px)], input=svg.encode(), capture_output=True, check=True).stdout
    return Image.open(io.BytesIO(out)).convert("RGBA")

def main():
    b = HUB / "brand"
    (b / "u.svg").write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {U_W} {U_H}"><path fill="{INK}" d="{U_D}"/></svg>\n')
    (b / "u-tile.svg").write_text(u_tile() + "\n")
    (b / "toolkit-symbol.svg").write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {TK} {TK}"><path fill="{TK_INK}" d="{TK_D}"/></svg>\n')
    (HUB / "addons" / "toolkit" / "icon.svg").write_text(toolkit_tile() + "\n")
    (b / "mac-icon.svg").write_text(mac_icon() + "\n")
    render(mac_icon(), 1024).save(HUB / "build" / "icon.png")
    # Windows : tuile pleine, rendue nette à chaque taille
    sizes = [16, 24, 32, 48, 64, 128, 256]
    imgs = [render(u_tile(256, 58), s) for s in sizes]
    imgs[-1].save(HUB / "build" / "icon.ico", sizes=[(s, s) for s in sizes], append_images=imgs[:-1])
    print("ok")

if __name__ == "__main__":
    main()
