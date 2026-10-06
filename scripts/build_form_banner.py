# -*- coding: utf-8 -*-
"""Build a Google Forms header banner for Consent Guru onboarding (1600x400)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "brand"
OUT = OUT_DIR / "consent-guru-onboarding-form-banner.png"
LOGO = ROOT / "_ppt_tmp" / "logo.png"
ICON = ROOT / "public" / "brand" / "consent-guru-icon.png"
if not LOGO.exists():
    LOGO = ROOT / "public" / "brand" / "consent-guru-logo.jpg"

# Google Forms recommended header ratio ~4:1
W, H = 1600, 400
NAVY = (11, 44, 74)
NAVY_DEEP = (7, 30, 51)
TEAL = (0, 196, 167)
TEAL_SOFT = (230, 249, 245)
WHITE = (255, 255, 255)
MINT = (243, 247, 246)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibrib.ttf" if bold else r"C:\Windows\Fonts\calibri.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", (W, H), NAVY)
    draw = ImageDraw.Draw(img)

    # Left→right navy depth wash
    for x in range(W):
        t = x / (W - 1)
        c = lerp(NAVY_DEEP, NAVY, min(1.0, t * 1.2))
        draw.line([(x, 0), (x, H)], fill=c)

    # Teal accent wave on the right
    wave = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    wdraw = ImageDraw.Draw(wave)
    points = [(900, H), (900, 0)]
    for x in range(900, W + 1, 8):
        # gentle sine-ish curve
        y = int(40 + 60 * ((x - 900) / 700) ** 1.2)
        points.append((x, y))
    points += [(W, 0), (W, H)]
    wdraw.polygon(points, fill=TEAL + (55,))
    # Soft mint orb
    wdraw.ellipse([1180, -80, 1680, 320], fill=TEAL_SOFT + (40,))
    wdraw.ellipse([1320, 180, 1720, 480], fill=TEAL + (35,))
    img = Image.alpha_composite(img.convert("RGBA"), wave).convert("RGB")
    draw = ImageDraw.Draw(img)

    # Top teal rule
    draw.rectangle([0, 0, W, 8], fill=TEAL)

    # Logo
    logo_h = 120
    if LOGO.exists():
        logo = Image.open(LOGO).convert("RGBA")
        ratio = logo_h / logo.height
        logo = logo.resize((max(1, int(logo.width * ratio)), logo_h), Image.Resampling.LANCZOS)
        # White rounded pill behind logo for contrast
        pad_x, pad_y = 22, 14
        pill = Image.new("RGBA", (logo.width + pad_x * 2, logo.height + pad_y * 2), (0, 0, 0, 0))
        pd = ImageDraw.Draw(pill)
        pd.rounded_rectangle([0, 0, pill.width - 1, pill.height - 1], radius=18, fill=WHITE + (245,))
        pill.paste(logo, (pad_x, pad_y), logo)
        img.paste(pill, (48, 36), pill)
        text_left = 48 + pill.width + 36
    elif ICON.exists():
        icon = Image.open(ICON).convert("RGBA")
        icon = icon.resize((100, 100), Image.Resampling.LANCZOS)
        img.paste(icon, (48, 48), icon)
        text_left = 180
    else:
        text_left = 48

    # Copy
    title_f = font(54, bold=True)
    sub_f = font(26, bold=False)
    small_f = font(20, bold=False)

    draw.text((text_left, 70), "Client Onboarding", font=title_f, fill=WHITE)
    draw.text(
        (text_left, 145),
        "Consent Management Platform  ·  Questionnaire",
        font=sub_f,
        fill=TEAL,
    )
    draw.text(
        (text_left, 210),
        "Help us configure your banner, policies & SDK  ·  consentguru.com",
        font=small_f,
        fill=MINT,
    )

    # Bottom strip
    draw.rectangle([0, H - 36, W, H], fill=NAVY_DEEP)
    draw.text((48, H - 30), "Confidential  ·  Onboarding only  ·  Not legal advice", font=small_f, fill=TEAL)

    img.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({W}x{H})")


if __name__ == "__main__":
    main()
