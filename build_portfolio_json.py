
import argparse, json, math, re
from pathlib import Path

import numpy as np
from PIL import Image
from skimage.color import rgb2lab

# ---------------- Tunables (adjust to taste) ----------------
LONG_SIDE_REF = 220         # drives node scale later (your BASE_BOX reference)
SIGMA_E = 25.0              # ΔE (LAB) falloff; smaller = stricter similarity
SIGMA_H = 35.0              # Hue complement falloff (degrees)
W_SIM = 1.0                 # weight for similarity
W_COMP = 0.5                # weight for complement
MIN_CORR = 0.0              # clamp to [0..1]
MAX_CORR = 1.0

# ---------------- Utilities ----------------
def clamp01(v: float) -> float:
    return max(0.0, min(1.0, v))

def gauss(x: float, sigma: float) -> float:
    return math.exp(-(x * x) / (sigma * sigma))

def rgb_hex(rgb255: np.ndarray) -> str:
    r, g, b = np.clip(np.round(rgb255), 0, 255).astype(int)
    return f"#{r:02x}{g:02x}{b:02x}"

def natural_key(path: Path):
    # numeric-aware sort by basename (e.g., 2.png before 10.png)
    s = path.stem
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", s)]

def hue_deg_from_rgb(rgb255: np.ndarray) -> float:
    r, g, b = (rgb255 / 255.0).tolist()
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d == 0:
        h = 0.0
    elif mx == r:
        h = (60 * ((g - b) / d) + 360) % 360
    elif mx == g:
        h = (60 * ((b - r) / d) + 120) % 360
    else:
        h = (60 * ((r - g) / d) + 240) % 360
    return h

def hue_dist_deg(h1: float, h2: float) -> float:
    d = abs(h1 - h2) % 360.0
    return 360.0 - d if d > 180.0 else d

def deltaE76(lab1: np.ndarray, lab2: np.ndarray) -> float:
    d = lab1 - lab2
    return float(np.sqrt(np.sum(d * d)))

def scale_from_long_side(long_side_px: int, max_long_side: int) -> float:
    """Scale relative to largest image, range [0.5, 1.0]."""
    ratio = long_side_px / float(max_long_side)
    return 0.5 + 0.5 * clamp01(ratio)


def average_rgb(path: Path) -> tuple[np.ndarray, tuple[int, int]]:
    """Return average RGB (0..255) and (width,height). Uses fast downscale to speed up."""
    with Image.open(path) as im:
        im = im.convert("RGB")
        # speed-up: downscale very large images before averaging
        w, h = im.size
        if max(w, h) > 1024:
            ratio = 1024.0 / max(w, h)
            im = im.resize((max(1, int(w * ratio)), max(1, int(h * ratio))), Image.BILINEAR)
            w, h = im.size
        arr = np.asarray(im, dtype=np.float32)  # HxWx3
        mean_rgb = arr.reshape(-1, 3).mean(axis=0)  # 3-vector
        return mean_rgb, (w, h)

# ---------------- Main build ----------------
def build(img_dir: Path, out_json: Path, min_link: float | None):
    files = sorted([p for p in img_dir.glob("*.png")], key=natural_key)
    if not files:
        raise SystemExit(f"No PNGs found in {img_dir}")

    # -------- Pass 1: extract per-image features + long sides
    tmp_items = []
    long_sides: list[int] = []

    for idx, p in enumerate(files):
        rgb, (w, h) = average_rgb(p)
        lab = rgb2lab((rgb / 255.0)[None, None, :]).reshape(3)
        hue = hue_deg_from_rgb(rgb)
        long_side = max(w, h)

        tmp_items.append({
            "id": str(idx + 1),
            "path": p,
            "rgb": rgb,
            "lab": lab,
            "hue": hue,
            "hex": rgb_hex(rgb),
            "long_side": long_side,
        })
        long_sides.append(long_side)

    max_long = max(long_sides) if long_sides else 1

    # -------- Pass 2: finalize items with scale in [0.5, 1.0]
    items = []
    for it in tmp_items:
        items.append({
            "id": it["id"],
            "path": it["path"],
            "rgb": it["rgb"],
            "lab": it["lab"],
            "hue": it["hue"],
            "hex": it["hex"],
            "scale": scale_from_long_side(it["long_side"], max_long),
        })

    # -------- Build nodes + symmetric correlations
    nodes = [
        {"id": it["id"], "scale": it["scale"], "colour": it["hex"], "correlations": {}}
        for it in items
    ]

    for i in range(len(items)):
        Ai = items[i]
        for j in range(i + 1, len(items)):
            Bj = items[j]

            dE = deltaE76(Ai["lab"], Bj["lab"])
            sim = gauss(dE, SIGMA_E)              # identical -> 1, decays with ΔE

            dH = hue_dist_deg(Ai["hue"], Bj["hue"])
            comp = gauss(dH - 180.0, SIGMA_H)     # peak near complements

            corr = clamp01(W_SIM * sim + W_COMP * comp)
            if min_link is not None and corr < min_link:
                continue

            nodes[i]["correlations"][Bj["id"]] = corr
            nodes[j]["correlations"][Ai["id"]] = corr

    out_json.parent.mkdir(parents=True, exist_ok=True)
    with out_json.open("w", encoding="utf-8") as f:
        json.dump(nodes, f, indent=2)
    print(f"Wrote {out_json} with {len(nodes)} nodes.")

# ---------------- CLI ----------------
def main():
    ap = argparse.ArgumentParser(description="Build color-based portfolioTable.json")
    ap.add_argument("--img-dir", default="assets/images/portfolio",
                    help="Directory of PNGs to scan")
    ap.add_argument("--out", default="public/portfolioTable.json",
                    help="Output JSON path")
    ap.add_argument("--min-link", type=float, default=None,
                    help="Optional min correlation threshold to emit (e.g., 0.1)")
    args = ap.parse_args()

    build(Path(args.img_dir), Path(args.out), args.min_link)

if __name__ == "__main__":
    main()
