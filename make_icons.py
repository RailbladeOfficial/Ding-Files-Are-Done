#!/usr/bin/env python3
# make_icons.py — regenerates every icon asset in this extension.
#
# Ding Files Are Done
# Copyright (C) 2026 Railblade
# Licensed under the GNU AGPL v3.0 — see LICENSE.
#
# Outputs:
#   file-icons/<ext>.png            one badge per known file extension
#   file-icons/_category_<cat>.png  generic fallback badge per broad category
#   icons/icon16/48/128.png         the extension's own icon
#   icons/btn-open.png              "Open file" notification button icon
#   icons/btn-folder.png            "Show in folder" notification button icon
#
# See notes.txt for usage and for how to add new extensions/categories.

from PIL import Image, ImageDraw, ImageFont
import os

BASE = os.path.dirname(os.path.abspath(__file__))
FI_DIR = os.path.join(BASE, "file-icons")
ICON_DIR = os.path.join(BASE, "icons")
os.makedirs(FI_DIR, exist_ok=True)
os.makedirs(ICON_DIR, exist_ok=True)


def font(size):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "C:/Windows/Fonts/arialbd.ttf",  # Windows
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",  # macOS
    ]
    for c in candidates:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def rounded_doc(size, color, fold_color, label):
    """A rounded 'document with folded corner' badge with a text label."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = int(size * 0.08)
    fold = int(size * 0.26)
    corner = int(size * 0.10)

    d.rounded_rectangle([pad, pad, size - pad, size - pad], radius=corner, fill=color)
    # folded top-right corner
    d.polygon(
        [(size - pad - fold, pad), (size - pad, pad + fold), (size - pad, pad)],
        fill=fold_color,
    )
    d.polygon(
        [(size - pad - fold, pad), (size - pad, pad + fold), (size - pad - fold, pad + fold)],
        fill=color,
    )

    # shrink font for longer labels so 4-char codes still fit
    base_pt = 0.24 if len(label) <= 3 else 0.20
    f = font(int(size * base_pt))
    bbox = d.textbbox((0, 0), label, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (size - tw) / 2 - bbox[0]
    ty = size * 0.62 - th / 2 - bbox[1]
    d.text((tx, ty), label, font=f, fill="white")
    return img


# category -> (fill, fold). Keep in sync with CATEGORY_COLORS in background.js.
CATEGORY_COLORS = {
    "pdf":          ("#D93831", "#B32B25"),
    "document":     ("#2B6FD6", "#2258AE"),
    "spreadsheet":  ("#1C8A4C", "#166E3C"),
    "presentation": ("#D9662B", "#B34F1F"),
    "archive":      ("#C9A227", "#A6851F"),
    "image":        ("#9B4FD1", "#7E3CAD"),
    "audio":        ("#E0457B", "#B93762"),
    "video":        ("#1AA6A0", "#158481"),
    "exe":          ("#8E2323", "#711C1C"),
    "code":         ("#5C6BC0", "#47539A"),
    "text":         ("#6B7A88", "#57636F"),
    "generic":      ("#5A6B7B", "#485663"),
}

# extension -> category. Keep in sync with KNOWN_EXTENSIONS in background.js.
EXT_CATEGORY = {
    "pdf": "pdf",

    "doc": "document", "docx": "document", "rtf": "document", "odt": "document",

    "xls": "spreadsheet", "xlsx": "spreadsheet", "csv": "spreadsheet",
    "tsv": "spreadsheet", "ods": "spreadsheet",

    "ppt": "presentation", "pptx": "presentation", "odp": "presentation",

    "zip": "archive", "rar": "archive", "7z": "archive", "tar": "archive",
    "gz": "archive", "bz2": "archive", "xz": "archive",

    "jpg": "image", "jpeg": "image", "png": "image", "gif": "image",
    "webp": "image", "bmp": "image", "svg": "image", "ico": "image",
    "heic": "image", "tiff": "image", "avif": "image",

    "mp3": "audio", "wav": "audio", "flac": "audio", "ogg": "audio",
    "m4a": "audio", "aac": "audio", "wma": "audio",

    "mp4": "video", "mkv": "video", "avi": "video", "mov": "video",
    "webm": "video", "wmv": "video", "flv": "video", "m4v": "video",

    "exe": "exe", "msi": "exe", "apk": "exe", "dmg": "exe", "deb": "exe", "bat": "exe",

    "html": "code", "htm": "code", "css": "code", "scss": "code",
    "js": "code", "mjs": "code", "cjs": "code", "ts": "code", "tsx": "code",
    "jsx": "code", "json": "code", "xml": "code", "yaml": "code", "yml": "code",
    "py": "code", "php": "code", "sql": "code", "sh": "code", "rb": "code",
    "go": "code", "rs": "code", "java": "code", "env": "code", "ini": "code",

    "txt": "text", "md": "text", "log": "text", "nfo": "text",
}


def make_extension_icon(size):
    """The extension's own toolbar/store icon: download arrow in a dark circle."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = int(size * 0.08)
    d.ellipse([pad, pad, size - pad, size - pad], fill="#141a2e")
    d.ellipse([pad, pad, size - pad, size - pad], outline="#3ce7e1", width=max(1, size // 32))

    cx = size / 2
    top = size * 0.28
    bottom = size * 0.60
    d.line([(cx, top), (cx, bottom)], fill="#3ce7e1", width=max(2, size // 12))
    aw = size * 0.16
    d.polygon(
        [(cx - aw, bottom - aw * 0.6), (cx + aw, bottom - aw * 0.6), (cx, bottom + aw * 0.5)],
        fill="#3ce7e1",
    )
    d.line([(size * 0.30, size * 0.74), (size * 0.70, size * 0.74)], fill="#e84fd9", width=max(2, size // 14))
    return img


def button_icon_open(size=48):
    """Small 'open' icon used inside the notification's Open file button."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = size * 0.14
    d.rounded_rectangle([pad, pad * 1.6, size - pad, size - pad * 0.6], radius=size * 0.08,
                        outline="#e7ecff", width=max(2, size // 12))
    cx, cy = size * 0.5, size * 0.42
    d.line([(cx - size * 0.14, cy + size * 0.06), (cx + size * 0.16, cy - size * 0.16)],
           fill="#3ce7e1", width=max(2, size // 10))
    d.line([(cx - size * 0.02, cy - size * 0.22), (cx + size * 0.16, cy - size * 0.16),
            (cx + size * 0.10, cy + size * 0.02)], fill="#3ce7e1", width=max(2, size // 10), joint="curve")
    return img


def button_icon_folder(size=48):
    """Small folder icon used inside the notification's Show in folder button."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = size * 0.12
    tab_w = size * 0.38
    body_top = size * 0.32
    d.rounded_rectangle([pad, size * 0.22, pad + tab_w, body_top + size * 0.04], radius=size * 0.05,
                        fill="#e84fd9")
    d.rounded_rectangle([pad, body_top, size - pad, size - pad], radius=size * 0.07,
                        fill="#3ce7e1")
    return img


if __name__ == "__main__":
    for ext, cat in EXT_CATEGORY.items():
        fill, fold = CATEGORY_COLORS[cat]
        rounded_doc(128, fill, fold, ext.upper()).save(os.path.join(FI_DIR, f"{ext}.png"))

    for cat, (fill, fold) in CATEGORY_COLORS.items():
        label = {"pdf": "PDF", "generic": "FILE"}.get(cat, cat[:4].upper())
        rounded_doc(128, fill, fold, label).save(os.path.join(FI_DIR, f"_category_{cat}.png"))

    for s in (16, 48, 128):
        make_extension_icon(s).save(os.path.join(ICON_DIR, f"icon{s}.png"))

    button_icon_open(48).save(os.path.join(ICON_DIR, "btn-open.png"))
    button_icon_folder(48).save(os.path.join(ICON_DIR, "btn-folder.png"))

    print(f"Generated {len(EXT_CATEGORY)} extension badges, "
          f"{len(CATEGORY_COLORS)} category fallbacks, 3 app icons, 2 button icons.")
