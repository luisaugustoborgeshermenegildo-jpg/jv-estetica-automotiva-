"""Gera os ícones do app (PWA) da JV Estética em icons/.

Uso (PowerShell, na raiz do projeto):
    & '.\\.venv\\Scripts\\python.exe' -m pip install pillow
    & '.\\.venv\\Scripts\\python.exe' tools\\gerar_icones.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"
FONT_CANDIDATES = [
    Path("C:/Windows/Fonts/impact.ttf"),
    Path("C:/Windows/Fonts/arialbd.ttf"),
]
BG = (40, 97, 237, 255)  # azul da marca JV (#2861ed)
FG = (255, 255, 255, 255)


def font(size):
    for candidate in FONT_CANDIDATES:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default(size)


def icon(size, safe=1.0):
    """safe < 1 reduz a marca para caber na área segura de ícones 'maskable'."""
    img = Image.new("RGBA", (size, size), BG)
    draw = ImageDraw.Draw(img)
    f = font(int(size * 0.52 * safe))
    box = draw.textbbox((0, 0), "JV", font=f)
    w, h = box[2] - box[0], box[3] - box[1]
    draw.text(((size - w) / 2 - box[0], (size - h) / 2 - box[1]), "JV", font=f, fill=FG)
    return img


def main():
    OUT.mkdir(exist_ok=True)
    icon(192).save(OUT / "icon-192.png")
    icon(512).save(OUT / "icon-512.png")
    icon(512, safe=0.72).save(OUT / "icon-maskable-512.png")
    icon(180).convert("RGB").save(OUT / "apple-touch-icon.png")
    icon(48).save(OUT / "favicon-48.png")
    print("Ícones gerados em", OUT)


if __name__ == "__main__":
    main()
