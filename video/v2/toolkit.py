"""Toolkit procedural de pixel art 'pintado' (ruido + paletas + tramado)."""
import math, random
import numpy as np
from PIL import Image, ImageDraw

BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16.0
WHITE = (240, 240, 232)
BLK = (20, 16, 24)
GOLD = (255, 204, 40)

_G = {}


def grid(h, w):
    k = (h, w)
    if k not in _G:
        _G[k] = np.mgrid[0:h, 0:w].astype(np.float32)
    return _G[k]


def bay(h, w):
    return np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w]


def R(d, x, y, w, h, c):
    if w > 0 and h > 0:
        d.rectangle([int(x), int(y), int(x + w - 1), int(y + h - 1)], fill=c)


def lerp(a, b, f):
    return tuple(int(a[i] + (b[i] - a[i]) * f) for i in range(3))


def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c[:3])


def vnoise(w, h, cx, cy, seed):
    rng = np.random.default_rng(seed)
    gw, gh = w // cx + 3, h // cy + 3
    g = rng.random((gh, gw)).astype(np.float32)
    im = Image.fromarray(g, 'F').resize((gw * cx, gh * cy), Image.BICUBIC)
    return np.clip(np.asarray(im)[:h, :w], 0, 1)


def fbm(w, h, cx, cy, seed, octv=4):
    s, a, tot = 0, 1.0, 0
    for o in range(octv):
        s = s + vnoise(w, h, max(1, cx >> o), max(1, cy >> o), seed + o * 17) * a
        tot += a
        a *= 0.5
    return s / tot


def pal_map(v, pal, dither=0.6):
    h, w = v.shape
    n = len(pal)
    idx = np.floor(v * (n - 1) + 0.5 + (bay(h, w) - 0.5) * dither).astype(int)
    return np.array(pal, np.uint8)[np.clip(idx, 0, n - 1)]


def sky(stops, h, w):
    v = np.linspace(0, 1, h)[:, None].repeat(w, 1)
    out = np.zeros((h, w, 3), np.float32)
    n = len(stops) - 1
    seg = np.clip((v * n).astype(int), 0, n - 1)
    f = np.clip(np.floor((v * n - seg) * 6 + bay(h, w)) / 6, 0, 1)
    for i in range(n):
        m = seg == i
        c0, c1 = np.array(stops[i], np.float32), np.array(stops[i + 1], np.float32)
        out[m] = c0 + (c1 - c0) * f[m][:, None]
    return out.astype(np.uint8)


def blend(col, haze, f):
    if haze is None or f <= 0:
        return col
    return (col.astype(np.float32) * (1 - f) + np.array(haze, np.float32) * f).astype(np.uint8)


SNOW = [(58, 92, 150), (82, 122, 178), (118, 158, 204), (166, 198, 224), (212, 228, 236), (246, 246, 236)]
SNOW_NIGHT = [(20, 24, 50), (30, 38, 70), (46, 58, 96), (70, 86, 130), (110, 126, 170), (160, 172, 210)]
SNOW_GREY = [(70, 80, 100), (96, 106, 126), (130, 140, 158), (170, 178, 192), (210, 214, 222), (240, 242, 246)]


def mountain(arr, px, py, ls, rs, seed, pal=SNOW, snow=0.45, haze=None, hf=0.0, jag=8, light=1.0):
    h, w = arr.shape[:2]
    Y, X = grid(h, w)
    xs = np.arange(w, dtype=np.float32)
    rn = vnoise(w, 1, 11, 1, seed)[0] * 0.6 + vnoise(w, 1, 3, 1, seed + 1)[0] * 0.4
    ridge = py + np.where(xs < px, (px - xs) * ls, (xs - px) * rs) \
        + (rn - 0.5) * jag * np.minimum(1, np.abs(xs - px) / 25)
    mask = Y >= ridge[None, :]
    dx = X - px
    dy = np.maximum(Y - py, 1)
    ang = np.arctan2(dx, dy)
    r = np.hypot(dx, dy)
    NA, NR = 420, 110
    N = vnoise(NA, NR, 5, 12, seed + 5) * 0.55 + vnoise(NA, NR, 2, 5, seed + 6) * 0.3 + vnoise(NA, NR, 1, 2, seed + 7) * 0.15
    ai = ((ang + np.pi / 2) / np.pi * (NA - 1)).astype(int).clip(0, NA - 1)
    ri = (r / (h * 1.1) * (NR - 1)).astype(int).clip(0, NR - 1)
    st = N[ri, ai]
    side = np.tanh(-dx / 34.0) * light
    alt = (Y - py) / max(1.0, h - py)
    patch = vnoise(w, h, 11, 9, seed + 8)
    snowy = np.clip((snow - alt) * 5 + (st - 0.5) * 2.6 + (patch - 0.5) * 2.2 + side * 0.5, 0, 1)
    v = 0.1 + 0.2 * (side + 1) / 2 + snowy * 0.62 + (st - 0.5) * 0.18
    col = blend(pal_map(np.clip(v, 0, 1), pal), haze, hf)
    arr[mask] = col[mask]
    return mask


CLOUD = [(150, 180, 214), (186, 208, 230), (222, 234, 240), (250, 250, 244)]
CLOUD_WARM = [(170, 90, 110), (220, 130, 120), (250, 180, 140), (255, 225, 180)]
CLOUD_NIGHT = [(30, 34, 64), (50, 56, 92), (80, 86, 124), (120, 126, 160)]
CLOUD_GREY = [(120, 128, 146), (150, 158, 174), (184, 190, 202), (214, 218, 226)]


def cloud_sprite(w, h, seed, pal=CLOUD):
    rng = np.random.default_rng(seed)
    Y, X = np.mgrid[0:h, 0:w].astype(np.float32)
    n = rng.integers(6, 12)
    inside = np.zeros((h, w), bool)
    v = np.zeros((h, w), np.float32)
    nz = vnoise(w, h, 4, 4, seed + 3)
    for i in range(n):
        cx = rng.uniform(0.12, 0.88) * w
        mid = 1 - abs(cx - w / 2) / (w / 2)
        r = (h * 0.55) * (0.35 + 0.65 * mid) * rng.uniform(0.7, 1.05) + 3
        cy = h - r * rng.uniform(0.75, 1.0)
        dd = np.hypot(X - cx, Y - cy) / r + (nz - 0.5) * 0.18
        inside |= dd < 1
        lx, ly = cx - 0.35 * r, cy - 0.5 * r
        vv = 1 - np.hypot(X - lx, Y - ly) / (1.5 * r)
        v = np.where(dd < 1, np.maximum(v, vv), v)
    inside &= Y < h - 1
    v = np.clip(v * 1.2 - (Y / h) * 0.25 + (nz - 0.5) * 0.15, 0, 1)
    rgb = pal_map(v, pal, 0.5)
    return Image.fromarray(np.dstack([rgb, (inside * 255).astype(np.uint8)]), 'RGBA')


def paste(img, spr, x, y):
    img.paste(spr, (int(x), int(y)), spr)


def hills(arr, base, amp, cell, seed, pal, depth=60, tex=0.35, haze=None, hf=0.0):
    h, w = arr.shape[:2]
    xs = fbm(w, 1, cell, 1, seed, 3)[0]
    line = base + (xs - 0.5) * amp
    Y, X = grid(h, w)
    mask = Y >= line[None, :]
    t = fbm(w, h, 6, 3, seed + 9, 3)
    v = np.clip(1 - (Y - line[None, :]) / depth, 0, 1) * 0.6 + 0.25 + (t - 0.5) * tex
    col = blend(pal_map(np.clip(v, 0, 1), pal), haze, hf)
    arr[mask] = col[mask]
    return line


def forest_line(d, line, step, seed, dark, light, hmin=5, hmax=12, start=0, end=None):
    rng = random.Random(seed)
    end = end or len(line)
    for x in range(start, end, step):
        y = int(line[min(len(line) - 1, max(0, x))])
        th = rng.randint(hmin, hmax)
        for k in range(th):
            ww = max(1, int((k / th) * (th * 0.45)))
            R(d, x - ww, y - th + k, ww * 2 + 1, 1, dark)
            R(d, x - ww, y - th + k, max(1, ww // 2), 1, light)


ROCK = [(62, 50, 52), (98, 80, 74), (134, 114, 100), (170, 154, 136), (204, 194, 174)]
GRASS = [(48, 92, 52), (78, 128, 56), (118, 162, 62), (170, 196, 90)]


def blocks_tex(h, w, seed, cw=(5, 14), rh=(4, 12)):
    rng = np.random.default_rng(seed)
    tex = np.zeros((h, w), np.float32)
    x = 0
    while x < w:
        c = int(rng.integers(*cw))
        y = -int(rng.integers(0, 8))
        while y < h:
            r = int(rng.integers(*rh))
            tv = rng.uniform(0.35, 0.75)
            y0, y1, x1 = max(0, y), min(h, y + r), min(w, x + c)
            if y1 > y0:
                tex[y0:y1, x:x1] = tv
                tex[y0, x:x1] = min(1, tv + 0.28)
                tex[y1 - 1, x:x1] = 0.05
                tex[y0:y1, x1 - 1] = max(0, tv - 0.3)
                tex[y0:y1, x] = min(1, tv + 0.12)
            y += r
        x += c
    return tex


def cliff(arr, poly, seed, pal=ROCK, grass=True):
    h, w = arr.shape[:2]
    m = Image.new('L', (w, h), 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    mask = np.array(m) > 0
    Y, X = grid(h, w)
    tex = blocks_tex(h, w, seed) - (Y / h) * 0.18 + (vnoise(w, h, 3, 3, seed + 1) - 0.5) * 0.15
    col = pal_map(np.clip(tex, 0, 1), pal, 0.3)
    arr[mask] = col[mask]
    if grass:
        top = np.where(mask.any(0), mask.argmax(0), h + 10)
        gd = 3 + vnoise(w, 1, 4, 1, seed + 2)[0] * 8
        drip = (vnoise(w, 1, 1, 1, seed + 4)[0] > 0.78) * vnoise(w, 1, 2, 1, seed + 5)[0] * 22
        gm = mask & ((Y - top[None, :]) < (gd + drip)[None, :])
        gv = np.clip(1 - (Y - top[None, :]) / 12 + (vnoise(w, h, 2, 2, seed + 6) - 0.5) * 0.8, 0, 1)
        gc = pal_map(gv, GRASS, 0.8)
        arr[gm] = gc[gm]
    return mask


BARK = [(58, 38, 34), (92, 62, 46), (132, 94, 64), (170, 128, 86)]
LEAF = [(38, 66, 46), (72, 104, 46), (128, 150, 50), (182, 190, 66), (222, 218, 110)]
LEAF_GREEN = [(30, 70, 50), (50, 104, 56), (84, 140, 64), (130, 176, 80), (186, 214, 120)]
LEAF_BIRCH = [(60, 100, 50), (96, 140, 60), (140, 176, 70), (190, 210, 100), (226, 236, 150)]
LEAF_OLIVE = [(50, 70, 50), (80, 100, 60), (116, 134, 76), (156, 170, 100), (196, 204, 140)]


def foliage(arr, cx, cy, pw, ph, seed, pal=LEAF, flat=0.32):
    h, w = arr.shape[:2]
    x0, x1 = int(max(0, cx - pw)), int(min(w, cx + pw))
    y0, y1 = int(max(0, cy - ph)), int(min(h, cy + ph))
    if x1 <= x0 or y1 <= y0:
        return
    Y, X = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    nz = vnoise(x1 - x0, y1 - y0, 2, 2, seed)
    dd = ((X - cx) / (pw / 2)) ** 2 + ((Y - cy) / (ph / 2)) ** 2 + (nz - 0.5) * 0.9
    m = (dd < 1) & (Y < cy + ph * flat)
    v = np.clip(1 - (Y - (cy - ph / 2)) / ph * 1.1 + (nz - 0.5) * 0.6 - (X - cx) / pw * 0.25, 0, 1)
    col = pal_map(v, pal, 0.9)
    sub = arr[y0:y1, x0:x1]
    sub[m] = col[m]


def pine(img, bx, by, seed, s=1.0, pads=None, pal=LEAF):
    d = ImageDraw.Draw(img)
    pts = [(bx, by), (bx - 6 * s, by - 28 * s), (bx + 6 * s, by - 58 * s), (bx - 2 * s, by - 88 * s),
           (bx + 10 * s, by - 116 * s), (bx + 4 * s, by - 146 * s)]
    for k in range(5):
        ex = bx + (k - 2) * 14 * s
        d.line([(bx, by - 8 * s), (ex, by + 2)], fill=BARK[1], width=max(1, int(4 * s)))
        d.line([(bx - 1, by - 8 * s), (ex - 1, by + 1)], fill=BARK[2], width=1)
    for i in range(len(pts) - 1):
        wdt = max(3, int((18 - i * 2.8) * s))
        d.line([pts[i], pts[i + 1]], fill=BARK[0], width=wdt)
        d.line([(pts[i][0] - 1, pts[i][1]), (pts[i + 1][0] - 1, pts[i + 1][1])], fill=BARK[1], width=max(1, wdt - 4))
        d.line([(pts[i][0] - wdt // 3, pts[i][1]), (pts[i + 1][0] - wdt // 3, pts[i + 1][1])], fill=BARK[2], width=1)
    if pads is None:
        pads = [(-4, -162, 60, 26), (-38, -140, 54, 24), (30, -132, 70, 28), (-40, -108, 64, 26),
                (36, -96, 80, 30), (-24, -74, 56, 22), (60, -62, 64, 24), (6, -118, 50, 22)]
    for ox, oy, pw, ph in pads:
        cx, cy = bx + ox * s, by + oy * s
        tx = pts[min(len(pts) - 1, max(1, int(-oy / 30)))]
        d.line([tx, (cx, cy + ph * s * 0.2)], fill=BARK[0], width=max(1, int(3 * s)))
        d.line([tx, (cx, cy + ph * s * 0.2)], fill=BARK[1], width=1)
    arr = np.array(img)
    for j, (ox, oy, pw, ph) in enumerate(pads):
        foliage(arr, bx + ox * s, by + oy * s, pw * s, ph * s, seed + j * 7, pal)
    img.paste(Image.fromarray(arr))


def round_tree(img, bx, by, seed, s=1.0, pal=LEAF_GREEN, trunk=BARK):
    d = ImageDraw.Draw(img)
    rng = random.Random(seed)
    d.line([(bx, by), (bx + 2 * s, by - 30 * s)], fill=trunk[0], width=max(2, int(7 * s)))
    d.line([(bx - 1, by), (bx + 1 * s, by - 30 * s)], fill=trunk[2], width=max(1, int(2 * s)))
    for k in range(3):
        d.line([(bx + 2 * s, by - 26 * s), (bx + (k - 1) * 16 * s, by - 44 * s)], fill=trunk[1], width=max(1, int(3 * s)))
    arr = np.array(img)
    blobs = [(0, -54, 46, 36), (-16, -44, 34, 26), (16, -42, 36, 26), (-4, -70, 36, 28), (12, -62, 30, 24)]
    for j, (ox, oy, pw, ph) in enumerate(blobs):
        foliage(arr, bx + ox * s, by + oy * s, pw * s, ph * s, seed + j * 5, pal, flat=0.45)
    img.paste(Image.fromarray(arr))


def birch(img, bx, by, seed, s=1.0, bare=False, pal=LEAF_BIRCH):
    d = ImageDraw.Draw(img)
    rng = random.Random(seed)
    top = by - 110 * s
    d.line([(bx, by), (bx + 3 * s, top)], fill=(230, 226, 214), width=max(2, int(5 * s)))
    d.line([(bx + 2, by), (bx + 3 * s + 2, top)], fill=(180, 176, 170), width=1)
    for k in range(int(14 * s)):
        yy = by - rng.random() * 105 * s
        R(d, bx - 2 + (by - yy) * 3 * s / 110, yy, rng.randint(2, 4), 1, (40, 36, 36))
    for k in range(6):
        yy = by - (40 + k * 12) * s
        dirx = -1 if k % 2 else 1
        d.line([(bx + 2, yy), (bx + dirx * (18 + k * 2) * s, yy - 16 * s)], fill=(120, 110, 104), width=1)
    if not bare:
        arr = np.array(img)
        for j in range(7):
            ox = rng.uniform(-22, 22) * s
            oy = -rng.uniform(50, 118) * s
            foliage(arr, bx + ox, by + oy, rng.uniform(20, 30) * s, rng.uniform(14, 20) * s, seed + j, pal, flat=0.5)
        img.paste(Image.fromarray(arr))


def field(arr, y0, pal, seed, cy=5):
    h, w = arr.shape[:2]
    t = vnoise(w, h - y0, 1, cy, seed) * 0.6 + vnoise(w, h - y0, 3, 2, seed + 1) * 0.4
    g = np.linspace(0, 1, h - y0)[:, None]
    v = np.clip(0.35 + t * 0.6 - (1 - g) * 0.1, 0, 1)
    arr[y0:] = pal_map(v, pal, 0.5)


def texture_fill(arr, x, y, w, h, pal, seed, cx=3, cy=3, amp=0.5, base=0.5):
    t = vnoise(w, h, cx, cy, seed)
    v = np.clip(base + (t - 0.5) * amp * 2, 0, 1)
    arr[y:y + h, x:x + w] = pal_map(v, pal, 0.7)


def house(d, x, y, w, h, wall=(246, 242, 232), side=(198, 196, 206), roof=(212, 104, 54), sw=6, win=(50, 80, 130),
          trim=None, door=True):
    R(d, x, y, w, h, wall)
    R(d, x + w, y + 2, sw, h - 2, side)
    R(d, x, y + h - 3, w, 3, shade(wall, .85))
    R(d, x - 2, y - 5, w + sw + 4, 6, roof)
    for rx in range(x - 2, x + w + sw + 2, 3):
        R(d, rx, y - 5, 1, 6, shade(roof, .75))
    R(d, x - 2, y - 5, w + sw + 4, 1, shade(roof, 1.2))
    R(d, x - 2, y + 1, w + sw + 4, 1, shade(roof, .55))
    for wy in range(y + 5, y + h - 8, 11):
        for wx in range(x + 4, x + w - 5, 10):
            if trim:
                R(d, wx - 1, wy - 1, 7, 8, trim)
            R(d, wx, wy, 5, 6, win)
            R(d, wx, wy, 5, 1, shade(win, 1.6))
            R(d, wx - 1, wy + 6, 7, 1, shade(wall, .7))
    if door and w > 18:
        dx = x + w // 2 - 3
        R(d, dx, y + h - 11, 7, 11, (110, 70, 40))
        R(d, dx + 5, y + h - 6, 1, 1, GOLD)


def shadow_ellipse(img, x, y, w=16, k=0.65):
    px = img.load()
    W, H = img.size
    for dx in range(-w // 2, w // 2 + 1):
        rows = (0, 1) if abs(dx) < w // 2 - 2 else (0,)
        for dy in rows:
            X, Y = int(x + dx), int(y + dy)
            if 0 <= X < W and 0 <= Y < H:
                px[X, Y] = shade(px[X, Y], k)


def glow(arr, cx, cy, r, col, k=0.5):
    """Luz calida con tramado (sin antialias)."""
    h, w = arr.shape[:2]
    x0, x1, y0, y1 = max(0, int(cx - r)), min(w, int(cx + r)), max(0, int(cy - r)), min(h, int(cy + r))
    if x1 <= x0 or y1 <= y0:
        return
    Y, X = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    f = np.clip(1 - np.hypot(X - cx, Y - cy) / r, 0, 1) * k
    f = np.floor(f * 4 + bay(y1 - y0, x1 - x0)) / 4
    sub = arr[y0:y1, x0:x1].astype(np.float32)
    sub = sub + (np.array(col, np.float32) - sub) * f[..., None]
    arr[y0:y1, x0:x1] = np.clip(sub, 0, 255).astype(np.uint8)
