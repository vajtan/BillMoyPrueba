"""Tiles/decorados estilo GBC-GBA (vista cenital 3/4) generados por codigo."""
import math, random
import numpy as np
from PIL import Image, ImageDraw

W, H = 180, 320

FOREST = dict(out=(34, 46, 36), dk=(40, 96, 44), md=(80, 160, 56), lt=(168, 228, 88), pale=(216, 244, 196),
              lil=(122, 116, 224), brd=(108, 74, 40), br=(170, 120, 60), brl=(216, 172, 100),
              grd=(104, 104, 116), gr=(166, 166, 172), grl=(216, 216, 216), red=(224, 52, 52), wh=(248, 248, 240),
              sky=(170, 214, 250), water=(80, 140, 230), waterl=(160, 200, 250))
SNOWP = dict(FOREST, dk=(70, 90, 120), md=(150, 170, 200), lt=(226, 234, 246), pale=(248, 250, 255),
             lil=(150, 150, 220), out=(40, 44, 60))
SPAIN = dict(FOREST, dk=(150, 110, 50), md=(200, 160, 80), lt=(236, 210, 140), pale=(248, 236, 200),
             lil=(200, 140, 110), out=(60, 44, 34))
NIGHT = dict(FOREST, dk=(24, 30, 60), md=(44, 54, 96), lt=(70, 80, 126), pale=(110, 120, 160),
             lil=(90, 80, 170), out=(12, 14, 28))


def R(d, x, y, w, h, c):
    if w > 0 and h > 0:
        d.rectangle([int(x), int(y), int(x + w - 1), int(y + h - 1)], fill=c)


def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c[:3])


def rng_(seed):
    return random.Random(seed)


# ------------------------------------------------------------------ SUELOS
def grass(img, P, seed=1, box=None, density=0.05):
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = box or (0, 0, img.width, img.height)
    R(d, x0, y0, x1 - x0, y1 - y0, P['lt'])
    r = rng_(seed)
    n = int((x1 - x0) * (y1 - y0) * density / 6)
    for _ in range(n):
        x, y = r.randint(x0, x1 - 2), r.randint(y0, y1 - 2)
        c = P['md'] if r.random() < 0.8 else P['lil']
        d.point((x, y), fill=c)
        d.point((x - 1, y + 1), fill=c)
        d.point((x + 1, y + 1), fill=c)


def path_mask(w, h, pts, width, seed=2):
    m = Image.new('L', (w, h), 0)
    md = ImageDraw.Draw(m)
    md.line(pts, fill=255, width=width, joint='curve')
    for p in pts:
        md.ellipse([p[0] - width / 2, p[1] - width / 2, p[0] + width / 2, p[1] + width / 2], fill=255)
    a = np.array(m) > 0
    # borde irregular
    r = np.random.default_rng(seed)
    nz = r.random((h, w)) < 0.35
    er = a.copy()
    er[1:-1, 1:-1] = a[1:-1, 1:-1] & (a[:-2, 1:-1] & a[2:, 1:-1] & a[1:-1, :-2] & a[1:-1, 2:] | ~nz[1:-1, 1:-1])
    return er


def paint_path(img, mask, P, seed=3, col=None):
    a = np.array(img)
    a[mask] = col or P['pale']
    r = np.random.default_rng(seed)
    sp = mask & (r.random(mask.shape) < 0.035)
    a[sp] = P['lil']
    sp2 = mask & (r.random(mask.shape) < 0.02)
    a[sp2] = P['lt']
    img.paste(Image.fromarray(a))


# ------------------------------------------------------------------ BOSQUE
BAY2 = np.array([[0, 1], [1, 0]], bool)


def forest(img, region_mask, P, seed=4, r_min=8, r_max=13, flowers=0.004):
    h, w = region_mask.shape
    r = rng_(seed)
    circles = []
    ys, xs = np.nonzero(region_mask)
    if len(xs) == 0:
        return
    step = 9
    for gy in range(0, h + step, step):
        for gx in range(0, w + step, step):
            jx, jy = gx + r.randint(-4, 4), gy + r.randint(-4, 4)
            if 0 <= jx < w and 0 <= jy < h and region_mask[jy, jx]:
                circles.append((jx, jy, r.uniform(r_min, r_max)))
    Y, X = np.mgrid[0:h, 0:w].astype(np.float32)
    best = np.full((h, w), -9.0, np.float32)
    val = np.zeros((h, w), np.float32)
    for cx, cy, rr in circles:
        x0, x1 = int(max(0, cx - rr - 1)), int(min(w, cx + rr + 2))
        y0, y1 = int(max(0, cy - rr - 1)), int(min(h, cy + rr + 2))
        sx, sy = X[y0:y1, x0:x1], Y[y0:y1, x0:x1]
        hh = 1 - np.hypot(sx - cx, sy - cy) / rr
        v = hh + (-(sx - cx) - (sy - cy)) / rr * 0.35
        sub = best[y0:y1, x0:x1]
        upd = hh > sub
        sub[upd] = hh[upd]
        val[y0:y1, x0:x1][upd] = v[upd]
    inside = best > 0
    a = np.array(img)
    chk = np.tile(BAY2, (h // 2 + 1, w // 2 + 1))[:h, :w]
    col = np.zeros((h, w, 3), np.uint8)
    col[:] = P['dk']
    col[(val > 0.7)] = P['md']
    col[(val > 0.56) & (val <= 0.7) & chk] = P['md']
    col[(val < 0.36) & chk] = P['out']
    col[(val < 0.18)] = P['out']
    col[(val > 0.88) & chk] = P['lt']
    a[inside] = col[inside]
    edge = inside.copy()
    edge[1:-1, 1:-1] = inside[1:-1, 1:-1] & ~(inside[:-2, 1:-1] & inside[2:, 1:-1] & inside[1:-1, :-2] & inside[1:-1, 2:])
    a[edge] = P['out']
    img.paste(Image.fromarray(a))
    d = ImageDraw.Draw(img)
    n = int(inside.sum() * flowers)
    idx = np.flatnonzero(inside & (val > 0.2) & (val < 0.6))
    rr = np.random.default_rng(seed)
    for k in rr.choice(idx, min(n, len(idx)), replace=False) if len(idx) else []:
        y, x = divmod(int(k), w)
        d.point((x, y), fill=P['wh'])
        d.point((x - 1, y), fill=shade(P['wh'], .8))
        d.point((x + 1, y), fill=shade(P['wh'], .8))
        d.point((x, y - 1), fill=shade(P['wh'], .8))
        d.point((x, y + 1), fill=shade(P['wh'], .8))


def region_poly(w, h, poly):
    m = Image.new('L', (w, h), 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    return np.array(m) > 0


def region_rect(w, h, x0, y0, x1, y1):
    m = np.zeros((h, w), bool)
    m[max(0, y0):y1, max(0, x0):x1] = True
    return m


def tree(img, x, y, P, seed=5, r=10):
    """Arbol suelto: copa + tronco. (x,y) = base del tronco."""
    d = ImageDraw.Draw(img)
    R(d, x - 2, y - 6, 5, 7, P['out'])
    R(d, x - 1, y - 6, 3, 6, P['brd'])
    R(d, x - 1, y - 6, 1, 6, P['br'])
    m = np.zeros((img.height, img.width), bool)
    Y, X = np.mgrid[0:img.height, 0:img.width]
    m |= (X - x) ** 2 + (Y - (y - 6 - r)) ** 2 < (r * 1.0) ** 2
    m |= (X - x + r * .6) ** 2 + (Y - (y - 4 - r * .7)) ** 2 < (r * .7) ** 2
    m |= (X - x - r * .6) ** 2 + (Y - (y - 4 - r * .7)) ** 2 < (r * .7) ** 2
    forest(img, m, P, seed, r * .6, r * .8, 0.0)


def bush(img, x, y, P, seed=6, r=5):
    m = np.zeros((img.height, img.width), bool)
    Y, X = np.mgrid[0:img.height, 0:img.width]
    m |= (X - x) ** 2 + ((Y - y) * 1.3) ** 2 < r * r
    forest(img, m, P, seed, r * .7, r, 0.0)


def fence_h(d, x0, x1, y, P):
    R(d, x0, y + 2, x1 - x0, 1, P['out'])
    R(d, x0, y + 1, x1 - x0, 1, P['br'])
    R(d, x0, y + 5, x1 - x0, 1, P['out'])
    R(d, x0, y + 4, x1 - x0, 1, P['br'])
    for x in range(x0, x1, 4):
        R(d, x, y - 1, 3, 8, P['out'])
        R(d, x + 1, y, 1, 6, P['brl'])


def fence_v(d, x, y0, y1, P):
    for y in range(y0, y1, 5):
        R(d, x - 1, y, 3, 6, P['out'])
        R(d, x, y + 1, 1, 4, P['brl'])
    R(d, x + 2, y0, 1, y1 - y0, P['br'])


def stone(d, x, y, P, w=5, h=4):
    d.ellipse([x, y, x + w, y + h], fill=P['out'])
    d.ellipse([x + 1, y, x + w - 1, y + h - 1], fill=P['gr'])
    d.point((x + 2, y + 1), fill=P['grl'])


def flower(d, x, y, P, col=None):
    col = col or P['red']
    d.point((x, y), fill=col)
    d.point((x - 1, y), fill=col)
    d.point((x + 1, y), fill=col)
    d.point((x, y - 1), fill=col)
    d.point((x, y + 1), fill=P['wh'])


def mushroom(d, x, y, P):
    R(d, x - 2, y - 3, 5, 3, P['out'])
    R(d, x - 1, y - 3, 3, 2, P['red'])
    d.point((x, y - 3), fill=P['wh'])
    R(d, x, y - 1, 1, 2, P['wh'])


def house(img, x, y, w, P, roof=(92, 170, 80), roofd=None, wall=(248, 244, 232), rh=22, wh=16, door=True,
          chimney=True, windows=2, thatch=False, flat=False):
    """Casa 3/4: tejado arriba (rh) + fachada (wh). (x,y)= esquina sup. izq."""
    d = ImageDraw.Draw(img)
    roofd = roofd or shade(roof, .72)
    out = P['out']
    # fachada
    R(d, x, y + rh - 2, w, wh + 2, out)
    R(d, x + 1, y + rh - 1, w - 2, wh, wall)
    R(d, x + 1, y + rh - 1 + wh - 3, w - 2, 3, shade(wall, .82))
    R(d, x + 1, y + rh - 1, w - 2, 1, shade(wall, .7))
    # tejado
    if flat:
        R(d, x - 1, y, w + 2, rh, out)
        R(d, x, y + 1, w, rh - 2, roof)
        R(d, x, y + 1, w, 1, shade(roof, 1.2))
    else:
        R(d, x - 2, y + 2, w + 4, rh - 1, out)
        R(d, x - 1, y + 3, w + 2, rh - 3, roof)
        for yy in range(y + 5, y + rh, 3):
            R(d, x - 1, yy, w + 2, 1, roofd)
        if thatch:
            for xx in range(x, x + w, 3):
                R(d, xx, y + rh - 2, 1, 2, roofd)
        R(d, x - 1, y + 3, w + 2, 1, shade(roof, 1.25))
        R(d, x + w // 2 - 1, y, 2, 3, out)
    if chimney:
        R(d, x + w - 10, y - 5, 6, 9, out)
        R(d, x + w - 9, y - 4, 4, 7, P['gr'])
        R(d, x + w - 9, y - 4, 4, 1, P['grl'])
    wy = y + rh + 2
    slots = windows + (1 if door else 0)
    sw = (w - 4) / max(1, slots)
    k = 0
    for i in range(slots):
        cx = int(x + 2 + sw * i + sw / 2)
        if door and i == slots // 2:
            R(d, cx - 3, y + rh + wh - 11, 7, 11, out)
            R(d, cx - 2, y + rh + wh - 10, 5, 10, P['br'])
            R(d, cx - 2, y + rh + wh - 10, 5, 1, P['brl'])
            d.point((cx + 1, y + rh + wh - 5), fill=(255, 220, 80))
        else:
            R(d, cx - 3, wy, 7, 6, out)
            R(d, cx - 2, wy + 1, 5, 4, P['sky'])
            R(d, cx - 2, wy + 1, 2, 1, P['wh'])
            R(d, cx - 3, wy + 6, 7, 2, P['br'])
            d.point((cx - 2, wy + 6), fill=P['red'])
            d.point((cx + 1, wy + 6), fill=P['red'])


def water(img, box, P, seed=7):
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = box
    R(d, x0, y0, x1 - x0, y1 - y0, P['water'])
    r = rng_(seed)
    for _ in range((x1 - x0) * (y1 - y0) // 60):
        x, y = r.randint(x0, x1 - 4), r.randint(y0, y1 - 1)
        R(d, x, y, 3, 1, P['waterl'])


def rock_wall(img, x0, y0, x1, y1, P, seed=8):
    """Pared de acantilado (vista 3/4)."""
    d = ImageDraw.Draw(img)
    r = rng_(seed)
    R(d, x0, y0, x1 - x0, y1 - y0, P['grd'])
    x = x0
    while x < x1:
        cw = r.randint(4, 9)
        y = y0 + r.randint(0, 4)
        while y < y1:
            ch = r.randint(5, 12)
            c = r.choice([P['gr'], P['grd'], shade(P['gr'], .9), P['brl']])
            R(d, x, y, cw - 1, ch - 1, c)
            R(d, x, y, cw - 1, 1, shade(c, 1.2))
            R(d, x + cw - 2, y, 1, ch - 1, shade(c, .7))
            y += ch
        x += cw
    R(d, x0, y1 - 1, x1 - x0, 1, P['out'])


def wood_floor(img, box, col=(200, 150, 90), seed=9):
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = box
    R(d, x0, y0, x1 - x0, y1 - y0, col)
    r = rng_(seed)
    for y in range(y0, y1, 6):
        R(d, x0, y, x1 - x0, 1, shade(col, .75))
        off = r.randint(0, 20)
        for x in range(x0 + off, x1, r.randint(18, 30)):
            R(d, x, y, 1, 6, shade(col, .8))
        for _ in range(4):
            R(d, r.randint(x0, x1), y + 3, 3, 1, shade(col, 1.1))


def tiles_floor(img, box, c1, c2, size=8):
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = box
    for y in range(y0, y1, size):
        for x in range(x0, x1, size):
            c = c1 if ((x - x0) // size + (y - y0) // size) % 2 else c2
            R(d, x, y, size, size, c)
            R(d, x, y, size, 1, shade(c, 1.12))


def wall_face(img, box, col, P, trim=None):
    """Pared interior vista 3/4 (franja superior de la habitacion)."""
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = box
    R(d, x0, y0, x1 - x0, y1 - y0, col)
    for x in range(x0, x1, 6):
        R(d, x, y0, 1, y1 - y0, shade(col, .93))
    R(d, x0, y1 - 3, x1 - x0, 3, trim or shade(col, .7))
    R(d, x0, y1, x1 - x0, 1, P['out'])


def tint(img, col, k):
    a = np.asarray(img).astype(np.float32)
    a = a * (1 - k) + np.array(col, np.float32) * k
    return Image.fromarray(a.astype(np.uint8))


def multiply(img, col):
    a = np.asarray(img).astype(np.float32) * (np.array(col, np.float32) / 255.0)
    return Image.fromarray(a.astype(np.uint8))
