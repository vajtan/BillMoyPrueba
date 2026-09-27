#!/usr/bin/env python3
"""
LA LEYENDA DE VAJTAN - version vertical 9:16 (1080x1920).
Estilo pixel art "pintado": perspectiva atmosferica, montañas nevadas,
nubes esponjosas, acantilados de roca y pinos tipo bonsai.
Todo es procedural (ruido + paletas + tramado). Sin APIs, sin imagenes externas.
Reutiliza fuente, personajes y motor de audio de make_video.py.

Uso: python3 make_video_9x16.py [--preview]
"""
import math, os, random, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

import make_video as mv
from make_video import (text, text_c, R, lerp, shade, person, portrait, flag, banner, BAYER,
                        KID, TEEN, VAJ, VAJ_FIGHT, RIVAL, DAD, MOM, FRIEND, BLK, WHITE, GOLD,
                        BEEP_F, tone, noise, music_section, sfx, write_wav, ffmpeg_exe, SR)

W, H = 270, 480
SCALE = 4
FPS = 24
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(OUT_DIR, "vajtan_pixel_story_9x16.mp4")
BOX_Y = 396
GROUND = 386
CPS, HOLD = 28.0, 1.25

YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
BAY = np.tile(BAYER, (H // 4 + 1, 2000 // 4 + 1))


# ================================================================ TOOLKIT PROCEDURAL
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
    b = BAY[:h, :w]
    n = len(pal)
    idx = np.floor(v * (n - 1) + 0.5 + (b - 0.5) * dither).astype(int)
    return np.array(pal, np.uint8)[np.clip(idx, 0, n - 1)]


def sky(stops, h=H, w=W):
    v = np.linspace(0, 1, h)[:, None].repeat(w, 1)
    out = np.zeros((h, w, 3), np.float32)
    n = len(stops) - 1
    seg = np.clip((v * n).astype(int), 0, n - 1)
    f = v * n - seg
    b = BAY[:h, :w]
    f = np.clip(np.floor(f * 5 + b) / 5, 0, 1)      # bandas con tramado
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
SNOW_WARM = [(90, 60, 90), (130, 80, 100), (180, 110, 110), (220, 150, 120), (245, 200, 150), (255, 235, 200)]


def mountain(arr, px, py, ls, rs, seed, pal=SNOW, snow=0.45, haze=None, hf=0.0, jag=8, light=1.0):
    h, w = arr.shape[:2]
    X, Y = XX[:h, :w], YY[:h, :w]
    xs = np.arange(w, dtype=np.float32)
    rn = vnoise(w, 1, 11, 1, seed)[0] * 0.6 + vnoise(w, 1, 3, 1, seed + 1)[0] * 0.4
    ridge = py + np.where(xs < px, (px - xs) * ls, (xs - px) * rs) \
        + (rn - 0.5) * jag * np.minimum(1, np.abs(xs - px) / 25)
    mask = Y >= ridge[None, :]
    dx = X - px
    dy = np.maximum(Y - py, 1)
    ang = np.arctan2(dx, dy)
    r = np.hypot(dx, dy)
    NA, NR = 360, 90
    N = vnoise(NA, NR, 5, 12, seed + 5) * 0.55 + vnoise(NA, NR, 2, 5, seed + 6) * 0.3 + vnoise(NA, NR, 1, 2, seed + 7) * 0.15
    ai = ((ang + np.pi / 2) / np.pi * (NA - 1)).astype(int).clip(0, NA - 1)
    ri = (r / (h * 1.1) * (NR - 1)).astype(int).clip(0, NR - 1)
    st = N[ri, ai]
    side = np.tanh(-dx / 30.0) * light
    alt = (Y - py) / max(1.0, h - py)
    patch = vnoise(w, h, 9, 7, seed + 8)
    snowy = np.clip((snow - alt) * 5 + (st - 0.5) * 2.6 + (patch - 0.5) * 2.2 + side * 0.5, 0, 1)
    v = 0.1 + 0.2 * (side + 1) / 2 + snowy * 0.62 + (st - 0.5) * 0.18
    col = blend(pal_map(np.clip(v, 0, 1), pal), haze, hf)
    arr[mask] = col[mask]
    return mask


CLOUD = [(150, 180, 214), (186, 208, 230), (222, 234, 240), (250, 250, 244)]
CLOUD_WARM = [(170, 90, 110), (220, 130, 120), (250, 180, 140), (255, 225, 180)]
CLOUD_NIGHT = [(30, 34, 64), (50, 56, 92), (80, 86, 124), (120, 126, 160)]


def cloud_sprite(w, h, seed, pal=CLOUD):
    rng = np.random.default_rng(seed)
    Y, X = np.mgrid[0:h, 0:w].astype(np.float32)
    n = rng.integers(6, 11)
    inside = np.zeros((h, w), bool)
    v = np.zeros((h, w), np.float32)
    nz = vnoise(w, h, 4, 4, seed + 3)
    for i in range(n):
        cx = rng.uniform(0.12, 0.88) * w
        mid = 1 - abs(cx - w / 2) / (w / 2)
        r = (h * 0.55) * (0.35 + 0.65 * mid) * rng.uniform(0.7, 1.05) + 3
        cy = h - r * rng.uniform(0.75, 1.0)
        d = np.hypot(X - cx, Y - cy) / r + (nz - 0.5) * 0.18
        inside |= d < 1
        lx, ly = cx - 0.35 * r, cy - 0.5 * r
        vv = 1 - np.hypot(X - lx, Y - ly) / (1.5 * r)
        v = np.where(d < 1, np.maximum(v, vv), v)
    inside &= Y < h - 1
    v = np.clip(v * 1.2 - (Y / h) * 0.25 + (nz - 0.5) * 0.15, 0, 1)
    rgb = pal_map(v, pal, 0.5)
    a = (inside * 255).astype(np.uint8)
    return Image.fromarray(np.dstack([rgb, a]), 'RGBA')


def paste(arr_img, spr, x, y):
    arr_img.paste(spr, (int(x), int(y)), spr)


def hills(arr, base, amp, cell, seed, pal, depth=60, tex=0.35, haze=None, hf=0.0):
    h, w = arr.shape[:2]
    xs = fbm(w, 1, cell, 1, seed, 3)[0]
    line = base + (xs - 0.5) * amp
    Y = YY[:h, :w]
    mask = Y >= line[None, :]
    t = fbm(w, h, 6, 3, seed + 9, 3)
    v = np.clip(1 - (Y - line[None, :]) / depth, 0, 1) * 0.6 + 0.25 + (t - 0.5) * tex
    col = blend(pal_map(np.clip(v, 0, 1), pal), haze, hf)
    arr[mask] = col[mask]
    return line


def forest_line(d, line, step, seed, dark, light, hmin=5, hmax=12, start=0, end=W):
    rng = random.Random(seed)
    for x in range(start, end, step):
        y = int(line[min(len(line) - 1, max(0, x))])
        th = rng.randint(hmin, hmax)
        for k in range(th):
            ww = max(1, int((k / th) * (th * 0.45)))
            R(d, x - ww, y - th + k, ww * 2 + 1, 1, dark)
            R(d, x - ww, y - th + k, max(1, ww // 2), 1, light)


ROCK = [(62, 50, 52), (98, 80, 74), (134, 114, 100), (170, 154, 136), (204, 194, 174)]
GRASS = [(48, 92, 52), (78, 128, 56), (118, 162, 62), (170, 196, 90)]


def cliff(arr, poly, seed, pal=ROCK, grass=True, haze=None, hf=0.0):
    h, w = arr.shape[:2]
    m = Image.new('L', (w, h), 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    mask = np.array(m) > 0
    rng = np.random.default_rng(seed)
    tex = np.zeros((h, w), np.float32)
    x = 0
    while x < w:
        cw = int(rng.integers(5, 14))
        y = -int(rng.integers(0, 8))
        while y < h:
            rh = int(rng.integers(4, 12))
            tv = rng.uniform(0.35, 0.75)
            y0, y1 = max(0, y), min(h, y + rh)
            x1 = min(w, x + cw)
            if y1 > y0:
                tex[y0:y1, x:x1] = tv
                tex[y0, x:x1] = min(1, tv + 0.28)
                tex[y1 - 1, x:x1] = 0.05
                tex[y0:y1, x1 - 1] = max(0, tv - 0.3)
                tex[y0:y1, x] = min(1, tv + 0.12)
            y += rh
        x += cw
    Y = YY[:h, :w]
    tex = tex - (Y / h) * 0.18 + (vnoise(w, h, 3, 3, seed + 1) - 0.5) * 0.15
    col = blend(pal_map(np.clip(tex, 0, 1), pal, 0.3), haze, hf)
    arr[mask] = col[mask]
    if grass:
        top = np.where(mask.any(0), mask.argmax(0), h + 10)
        gd = 3 + vnoise(w, 1, 4, 1, seed + 2)[0] * 7
        drip = (vnoise(w, 1, 1, 1, seed + 4)[0] > 0.8) * vnoise(w, 1, 2, 1, seed + 5)[0] * 16
        gm = mask & ((Y - top[None, :]) < (gd + drip)[None, :])
        gv = np.clip(1 - (Y - top[None, :]) / 10 + (vnoise(w, h, 2, 2, seed + 6) - 0.5) * 0.8, 0, 1)
        gc = blend(pal_map(gv, GRASS, 0.8), haze, hf)
        arr[gm] = gc[gm]
    return mask


BARK = [(58, 38, 34), (92, 62, 46), (132, 94, 64), (170, 128, 86)]
LEAF = [(38, 66, 46), (72, 104, 46), (128, 150, 50), (182, 190, 66), (222, 218, 110)]


def pine(img, bx, by, seed, s=1.0, pads=None, pal=LEAF):
    d = ImageDraw.Draw(img)
    rng = random.Random(seed)
    pts = [(bx, by), (bx - 6 * s, by - 28 * s), (bx + 6 * s, by - 58 * s), (bx - 2 * s, by - 88 * s),
           (bx + 10 * s, by - 116 * s), (bx + 4 * s, by - 146 * s)]
    for k in range(4):     # raices
        ex = bx + (k - 1.5) * 16 * s
        d.line([(bx, by - 6 * s), (ex, by + 2)], fill=BARK[1], width=max(1, int(4 * s)))
    for i in range(len(pts) - 1):
        wdt = max(3, int((18 - i * 2.8) * s))
        d.line([pts[i], pts[i + 1]], fill=BARK[0], width=wdt)
        d.line([(pts[i][0] - 1, pts[i][1]), (pts[i + 1][0] - 1, pts[i + 1][1])], fill=BARK[1], width=max(1, wdt - 4))
        d.line([(pts[i][0] - wdt // 3, pts[i][1]), (pts[i + 1][0] - wdt // 3, pts[i + 1][1])], fill=BARK[2], width=1)
    if pads is None:
        pads = [(-4, -162, 60, 26), (-38, -140, 54, 24), (30, -132, 70, 28), (-40, -108, 64, 26),
                (36, -96, 80, 30), (-24, -74, 56, 22), (60, -62, 64, 24), (6, -118, 50, 22)]
    arr = np.array(img)
    for j, (ox, oy, pw, ph) in enumerate(pads):
        cx, cy = bx + ox * s, by + oy * s
        tx = pts[min(len(pts) - 1, max(1, int(-oy / 30)))]
        d2 = ImageDraw.Draw(img)
        d2.line([tx, (cx, cy + ph * s * 0.2)], fill=BARK[0], width=max(1, int(3 * s)))
        d2.line([tx, (cx, cy + ph * s * 0.2)], fill=BARK[1], width=1)
    arr = np.array(img)
    for j, (ox, oy, pw, ph) in enumerate(pads):
        cx, cy, pw, ph = bx + ox * s, by + oy * s, pw * s, ph * s
        x0, x1 = int(max(0, cx - pw)), int(min(img.width, cx + pw))
        y0, y1 = int(max(0, cy - ph)), int(min(img.height, cy + ph))
        if x1 <= x0 or y1 <= y0:
            continue
        Y, X = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        nz = vnoise(x1 - x0, y1 - y0, 2, 2, seed + j * 7)
        dd = ((X - cx) / (pw / 2)) ** 2 + ((Y - cy) / (ph / 2)) ** 2 + (nz - 0.5) * 0.9
        m = (dd < 1) & (Y < cy + ph * 0.32)
        v = np.clip(1 - (Y - (cy - ph / 2)) / ph * 1.1 + (nz - 0.5) * 0.6 - (X - cx) / pw * 0.2, 0, 1)
        col = pal_map(v, pal, 0.9)
        sub = arr[y0:y1, x0:x1]
        sub[m] = col[m]
    img.paste(Image.fromarray(arr))


def field(arr, y0, pal, seed, cy=5):
    h, w = arr.shape[:2]
    t = vnoise(w, h - y0, 1, cy, seed) * 0.6 + vnoise(w, h - y0, 3, 2, seed + 1) * 0.4
    g = np.linspace(0, 1, h - y0)[:, None]
    v = np.clip(0.35 + t * 0.6 - (1 - g) * 0.1, 0, 1)
    arr[y0:] = pal_map(v, pal, 0.5)


def house(d, x, y, w, h, wall=(246, 242, 232), side=(198, 196, 206), roof=(212, 104, 54), sw=6, win=(50, 80, 130)):
    R(d, x, y, w, h, wall)
    R(d, x + w, y + 2, sw, h - 2, side)
    R(d, x - 2, y - 4, w + sw + 4, 5, roof)
    for rx in range(x - 2, x + w + sw + 2, 3):
        R(d, rx, y - 4, 1, 5, shade(roof, .78))
    R(d, x - 2, y, w + sw + 4, 1, shade(roof, .6))
    for wy in range(y + 4, y + h - 5, 9):
        for wx in range(x + 3, x + w - 4, 8):
            R(d, wx, wy, 4, 5, win)
            R(d, wx, wy, 4, 1, shade(win, 1.5))


def shadow(img, x, y, w=14):
    px = img.load()
    for dx in range(-w // 2, w // 2 + 1):
        for dy in (0, 1):
            X, Y = int(x + dx), int(y + dy)
            if 0 <= X < W and 0 <= Y < H and (abs(dx) < w // 2 - 1 or dy == 0):
                c = px[X, Y]
                px[X, Y] = shade(c, 0.7)


def sitter(d, x, y, t):
    b = 1 if (t % 3.2) < 1.6 else 0
    R(d, x - 11, y - 5, 22, 5, (112, 40, 32))
    R(d, x - 10, y - 6, 20, 2, (150, 56, 40))
    R(d, x - 8, y - 21 - b, 16, 16 + b, (172, 66, 46))
    R(d, x + 4, y - 21 - b, 4, 15 + b, (128, 44, 34))
    R(d, x - 8, y - 21 - b, 2, 14, (206, 96, 62))
    R(d, x - 7, y - 22 - b, 14, 2, (150, 56, 40))
    R(d, x - 4, y - 30 - b, 9, 9, (44, 30, 26))
    R(d, x - 4, y - 30 - b, 3, 6, (72, 52, 42))
    R(d, x + 5, y - 26 - b, 1, 3, (220, 170, 132))


# ================================================================ DIALOGOS
def wrap(s, n=35):
    words, lines, cur = s.split(' '), [], ''
    for w_ in words:
        if len(cur) + len(w_) + (1 if cur else 0) > n:
            lines.append(cur)
            cur = w_
        else:
            cur = (cur + ' ' + w_) if cur else w_
    lines.append(cur)
    return lines


class Line:
    def __init__(self, who, txt, start):
        self.who, self.txt, self.start = who, txt.upper(), start
        self.lines = wrap(self.txt)
        assert len(self.lines) <= 4, self.txt
        self.flat = ' '.join(self.lines)
        self.times = []
        tt = start + 0.2
        for i, ch in enumerate(self.flat):
            self.times.append(tt)
            tt += 1.0 / CPS
            if ch in '.!?' and i + 1 < len(self.flat) and self.flat[i + 1] == ' ':
                tt += 0.22
            elif ch == ',':
                tt += 0.1
        self.end_type = tt

    def shown(self, t):
        return sum(1 for tm in self.times if tm <= t)


def draw_box(d, ln, t):
    y0 = BOX_Y
    R(d, 4, y0, 262, 80, WHITE)
    R(d, 5, y0 + 1, 260, 78, (70, 80, 140))
    R(d, 6, y0 + 2, 258, 76, (14, 20, 52))
    for yy in range(y0 + 2, y0 + 78, 2):
        R(d, 6, yy, 258, 1, (18, 26, 62))
    n = ln.shown(t)
    talking = n < len(ln.flat)
    portrait(d, 11, y0 + 20, ln.who, talking, t)
    text(d, 50, y0 + 3, ln.who, GOLD, shadow=BLK)
    k = 0
    for li, line in enumerate(ln.lines):
        text(d, 50, y0 + 16 + li * 12, line[:max(0, n - k)], WHITE, shadow=(0, 0, 20))
        k += len(line) + 1
    if not talking and int(t * 3) % 2 == 0:
        for i in range(4):
            R(d, 253 + i, y0 + 68 + i, 7 - 2 * i, 1, GOLD)


def hud_banner(d, s, y=8):
    banner(d, s, (W - (len(s) * 6 + 8)) // 2, y)


# ================================================================ ESCENAS
class Scene:
    lines = []
    pre = 0.4
    post = 0.8
    min_dur = 0
    music = 'title'

    def schedule(self, t0):
        self.t0 = t0
        self.L = []
        s = self.pre
        for who, txt in self.lines:
            ln = Line(who, txt, s)
            self.L.append(ln)
            s = ln.end_type + HOLD
        self.dur = max(self.min_dur, (self.L[-1].end_type + self.post + HOLD) if self.L else 0)
        if not hasattr(self, 'sfx'):
            self.sfx = []

    def idx(self, t):
        i = 0
        for k, ln in enumerate(self.L):
            if t >= ln.start:
                i = k
        return i

    def cur_line(self, t):
        cur = None
        for ln in self.L:
            if t >= ln.start:
                cur = ln
        return cur

    def frame(self, t):
        img = self.bg.copy()
        d = ImageDraw.Draw(img)
        self.draw(img, d, t)
        ln = self.cur_line(t)
        if ln is not None and self.show_box(t):
            draw_box(d, ln, t)
        return img

    def show_box(self, t):
        return True

    def drift(self, img, t):
        for spr, x0, y0, sp in getattr(self, 'clouds', []):
            x = (x0 + t * sp) % (W + spr.width + 40) - spr.width - 20
            paste(img, spr, x, y0)


def cliff_bg(with_title_space=True):
    arr = sky([(92, 184, 196), (140, 206, 214), (186, 226, 228)], 330)
    full = np.zeros((H, W, 3), np.uint8)
    full[:330] = arr
    full[330:] = arr[-1]
    mountain(full, 178, 34, 1.35, 0.95, 11, SNOW, snow=0.62, haze=(190, 225, 230), hf=0.12, jag=10)
    mountain(full, 60, 150, 1.2, 0.9, 12, SNOW, snow=0.3, haze=(170, 214, 226), hf=0.35, jag=6)
    mountain(full, 214, 190, 1.05, 1.1, 13, SNOW, snow=0.1, haze=(120, 170, 215), hf=0.1, jag=8, light=0.8)
    img = Image.fromarray(full)
    for i, (x, y, w, h) in enumerate([(120, 250, 150, 50), (60, 290, 120, 40), (170, 300, 110, 45),
                                      (100, 340, 170, 60), (180, 380, 110, 50), (130, 420, 150, 60),
                                      (20, 430, 110, 50)]):
        paste(img, cloud_sprite(w, h, 40 + i), x, y)
    arr = np.array(img)
    poly = [(0, 322), (40, 318), (90, 326), (132, 330), (160, 334), (166, 346), (158, 360), (150, 372),
            (152, 392), (140, 410), (136, 440), (128, 480), (0, 480)]
    cliff(arr, poly, 21)
    img = Image.fromarray(arr)
    pine(img, 44, 326, 5, 1.05)
    return img


class Title(Scene):
    music = 'title'
    min_dur = 6.4

    def setup(self):
        self.bg = cliff_bg()
        self.clouds = [(cloud_sprite(70, 26, 91), 20, 150, 5), (cloud_sprite(90, 30, 92), 160, 205, 3)]
        self.sfx = [(4.4, 'start')]

    def draw(self, img, d, t):
        self.drift(img, t)
        sitter(d, 142, 334, t)
        bob = int(round(math.sin(t * 2.2) * 2))
        text_c(d, W // 2, 14, "LA LEYENDA DE", WHITE, 1, (30, 60, 90))
        text_c(d, W // 2, 28 + bob, "VAJTAN", GOLD, 5, (110, 40, 0))
        text_c(d, W // 2, 78 + bob, "SHANAVA", (255, 120, 60), 2, (80, 10, 0))
        text_c(d, W // 2, 102, "UNA HISTORIA REAL", WHITE, 1, (30, 60, 90))
        if t < 4.4:
            if int(t * 2) % 2 == 0:
                text_c(d, W // 2, 440, "PRESS START", WHITE, 1, BLK)
        elif int(t * 12) % 2 == 0:
            text_c(d, W // 2, 440, "PRESS START", GOLD, 1, BLK)
        text_c(d, W // 2, 464, "(C) 1995-2026 VAJTAN SOFT", (230, 240, 250), 1, (40, 50, 70))


class Ukraine(Scene):
    music = 'ukraine'
    lines = [('NARRADOR', "Ucrania, 1995. Nace Vajtan Shanava Kolesnyk: madre ucraniana y padre georgiano."),
             ('NARRADOR', "Año 2003. Con 8 años, su familia toma una gran decisión..."),
             ('PADRE', "Hijo, nos vamos a España. Allí empieza una nueva vida."),
             ('VAJTAN NIÑO', "¿España? ¡Vale! Pero me llevo mi balón.")]

    def setup(self):
        full = sky([(70, 140, 216), (130, 186, 236), (196, 224, 244)], H)
        mountain(full, 70, 196, 0.9, 0.7, 31, SNOW, snow=0.2, haze=(170, 206, 236), hf=0.5, jag=5)
        mountain(full, 210, 186, 0.8, 0.9, 32, SNOW, snow=0.22, haze=(170, 206, 236), hf=0.42, jag=6)
        l1 = hills(full, 238, 24, 60, 33, [(60, 110, 90), (80, 136, 96), (110, 160, 100)], 40, 0.2,
                   (160, 200, 220), 0.3)
        l2 = hills(full, 262, 20, 50, 34, [(52, 96, 50), (74, 124, 54), (100, 150, 60), (140, 176, 70)], 50, 0.3)
        field(full, 290, [(150, 100, 30), (194, 144, 40), (228, 184, 62), (248, 218, 110)], 35)
        img = Image.fromarray(full)
        d = ImageDraw.Draw(img)
        forest_line(d, l1, 3, 7, (46, 88, 76), (70, 116, 92), 4, 9)
        forest_line(d, l2, 4, 8, (36, 74, 42), (64, 110, 50), 6, 12, 150, W)
        for i, (x, y, w, h) in enumerate([(10, 40, 110, 44), (150, 70, 120, 50), (60, 120, 90, 34)]):
            paste(img, cloud_sprite(w, h, 60 + i), x, y)
        # jata ucraniana
        R(d, 30, 262, 56, 30, (246, 240, 226))
        R(d, 86, 264, 8, 28, (206, 200, 196))
        d.polygon([(22, 264), (60, 238), (100, 264)], fill=(160, 118, 62))
        for k in range(0, 26, 3):
            d.line([(60 - k * 1.45, 238 + k), (60 + k * 1.52, 238 + k)], fill=(138, 98, 50) if k % 2 else (180, 138, 76))
        R(d, 38, 270, 11, 10, (54, 110, 190))
        R(d, 43, 270, 1, 10, WHITE)
        R(d, 62, 274, 10, 18, (110, 64, 36))
        d.polygon([(64, 292), (72, 292), (150, 392), (100, 392)], fill=(200, 160, 100))
        self.bg = img
        self.clouds = [(cloud_sprite(80, 30, 70), 0, 20, 5), (cloud_sprite(60, 24, 71), 150, 100, 3)]

    def draw(self, img, d, t):
        R(d, 222, 26, 22, 22, (255, 244, 170))
        R(d, 219, 29, 28, 16, (255, 244, 170))
        self.drift(img, t)
        for gx in (180, 200, 222, 246):
            R(d, gx + 2, 330, 2, 50, (60, 120, 40))
            R(d, gx - 1, 322, 8, 8, (255, 200, 0))
            R(d, gx + 1, 324, 4, 4, (100, 56, 20))
        for i in range(0, W, 4):
            sw = int(round(math.sin(t * 2 + i * 0.25)))
            for row in (304, 318, 336, 358):
                d.point((i + sw + row % 3, row), fill=(255, 236, 140))
        hud_banner(d, "UCRANIA - 1995" if self.idx(t) == 0 else "UCRANIA - 2003", 8)
        for px, P, f in ((96, MOM, 1), (114, DAD, 1)):
            shadow(img, px, GROUND)
            person(d, px, GROUND, P, 'stand', t, f)
        kx = 146 + int(math.sin(t * 2) * 3)
        shadow(img, kx, GROUND, 10)
        person(d, kx, GROUND, KID, 'stand', t, -1)
        by = GROUND - 5 - abs(int(math.sin(t * 5) * 7))
        R(d, kx + 6, by, 5, 5, WHITE)
        R(d, kx + 7, by + 1, 2, 2, BLK)


class Journey(Scene):
    music = 'journey'
    lines = [('NARRADOR', "Miles de kilómetros. Un niño, una maleta y un montón de sueños."),
             ('VAJTAN NIÑO', "¿Falta mucho? ¿Falta mucho? ¿Falta muchooo?")]
    post = 1.4

    def setup(self):
        LW = 1600
        a = np.zeros((H, LW, 3), np.uint8)
        global XX, YY
        sXX, sYY = XX, YY
        YY, XX = np.mgrid[0:H, 0:LW].astype(np.float32)
        m = np.zeros((H, LW), bool)
        for i, px in enumerate(range(60, LW, 150)):
            m |= mountain(a, px, 170 + (i * 37) % 40, 0.9, 0.9, 50 + i, SNOW, snow=0.3, haze=(170, 200, 230), hf=0.35)
        self.far = Image.fromarray(np.dstack([a, (m * 255).astype(np.uint8)]), 'RGBA')
        b = np.zeros((H, LW, 3), np.uint8)
        line = hills(b, 280, 40, 80, 61, [(40, 80, 60), (56, 104, 64), (80, 130, 70)], 70, 0.3)
        mm = YY >= line[None, :]
        im = Image.fromarray(np.dstack([b, (mm * 255).astype(np.uint8)]), 'RGBA')
        forest_line(ImageDraw.Draw(im), line, 5, 9, (28, 60, 40, 255), (50, 90, 56, 255), 8, 18, 0, LW)
        self.mid = im
        XX, YY = sXX, sYY
        self.bg = Image.new('RGB', (W, H), BLK)
        rnd = random.Random(7)
        self.stars = [(rnd.randint(0, W), rnd.randint(0, 200)) for _ in range(60)]
        self.clouds = [(cloud_sprite(90, 30, 80 + i), rnd.randint(0, W), 50 + i * 40, 10 + i * 4) for i in range(3)]

    def draw(self, img, d, t):
        f = t / self.dur
        day, dusk, night = (96, 170, 236), (240, 124, 90), (14, 14, 44)
        if f < 0.33:
            top = lerp(day, dusk, f / 0.33)
        elif f < 0.66:
            top = lerp(dusk, night, (f - .33) / .33)
        else:
            top = lerp(night, day, (f - .66) / .34)
        img.paste(Image.fromarray(sky([shade(top, .75), top, lerp(top, WHITE, .3)], H)))
        if 0.45 < f < 0.85:
            for sx, sy in self.stars:
                d.point((sx, sy), fill=WHITE)
        self.drift(img, t)
        img.paste(self.far.crop((int(t * 10), 0, int(t * 10) + W, H)), (0, 0), self.far.crop((int(t * 10), 0, int(t * 10) + W, H)))
        c = self.mid.crop((int(t * 40), 0, int(t * 40) + W, H))
        img.paste(c, (0, 0), c)
        R(d, 0, 340, W, 60, (70, 70, 80))
        R(d, 0, 340, W, 3, (130, 130, 130))
        R(d, 0, 400, W, 80, (50, 80, 50))
        for i in range(0, W + 40, 40):
            R(d, int(i - (t * 150) % 40), 360, 20, 2, (240, 220, 120))
        for i in range(0, W + 90, 90):
            x = int(i - (t * 150) % 90)
            R(d, x, 300, 2, 40, (90, 60, 40))
            R(d, x - 4, 302, 10, 2, (90, 60, 40))
        cx, cy = 100, 378 + (1 if int(t * 8) % 2 else 0)
        R(d, cx, cy - 14, 48, 12, (200, 40, 50))
        R(d, cx, cy - 14, 48, 2, (240, 90, 90))
        R(d, cx + 8, cy - 24, 28, 10, (200, 40, 50))
        R(d, cx + 10, cy - 22, 11, 7, (150, 210, 250))
        R(d, cx + 23, cy - 22, 11, 7, (150, 210, 250))
        R(d, cx + 25, cy - 21, 5, 5, KID['skin'])
        R(d, cx + 25, cy - 22, 5, 2, KID['hair'])
        R(d, cx + 10, cy - 30, 11, 6, (140, 90, 40))
        R(d, cx + 23, cy - 29, 9, 5, (60, 100, 160))
        R(d, cx + 46, cy - 12, 3, 3, (255, 240, 150))
        for wx in (cx + 6, cx + 33):
            R(d, wx, cy - 4, 9, 9, BLK)
            R(d, wx + 3, cy - 1, 3, 3, (180, 180, 180))
            a = t * 20
            d.point((wx + 4 + int(round(math.cos(a) * 3)), cy + int(round(math.sin(a) * 3))), fill=WHITE)
        R(d, 10, 8, 250, 30, (14, 20, 52))
        R(d, 10, 8, 250, 1, WHITE)
        R(d, 10, 37, 250, 1, WHITE)
        text(d, 14, 11, "UCRANIA", (120, 180, 255))
        text(d, 214, 11, "ESPAÑA", (255, 190, 60))
        R(d, 24, 30, 222, 1, (120, 120, 160))
        px = 24 + int(222 * min(1, t / (self.dur - 0.8)))
        R(d, 24, 29, px - 24, 3, GOLD)
        R(d, px - 3, 25, 7, 5, (200, 40, 50))


class Spain(Scene):
    music = 'spain'
    lines = [('NARRADOR', "España. Nuevo país, nuevo idioma, nuevo cole."),
             ('COMPAÑERO', "¡Hola! ¿Cómo te llamas? ¿Juegas al fútbol?"),
             ('VAJTAN NIÑO', "Me... llamo... Vajtan. ¡Sí! ¡Fútbol!"),
             ('NARRADOR', "Poco a poco aprende el idioma. España ya es su casa.")]

    def setup(self):
        full = sky([(70, 150, 230), (140, 196, 244), (210, 232, 250)], H)
        hills(full, 200, 30, 80, 41, [(170, 130, 110), (200, 160, 120), (220, 186, 140)], 40, 0.2, (200, 210, 230), 0.4)
        l2 = hills(full, 236, 50, 90, 42, [(150, 120, 60), (180, 150, 80), (210, 180, 100), (230, 204, 130)], 90, 0.35)
        img = Image.fromarray(full)
        d = ImageDraw.Draw(img)
        for i, (x, y, w, h) in enumerate([(0, 60, 100, 36), (150, 30, 120, 44)]):
            paste(img, cloud_sprite(w, h, 90 + i), x, y)
        rnd = random.Random(12)
        for row in range(6):
            y = 214 + row * 16
            x = -8 + (row % 2) * 12
            while x < W:
                w = rnd.randint(18, 30)
                h = rnd.randint(12, 20)
                if y + 18 > l2[min(W - 1, max(0, x))] - 6:
                    house(d, x, y, w, h, sw=4)
                x += w + rnd.randint(6, 14)
        # iglesia
        R(d, 196, 170, 16, 50, (240, 226, 196))
        R(d, 212, 172, 5, 48, (200, 188, 170))
        d.polygon([(194, 170), (206, 150), (219, 170)], fill=(200, 100, 50))
        R(d, 202, 180, 6, 8, (60, 50, 50))
        R(d, 0, 330, W, 150, (224, 196, 150))
        for gx in range(0, W, 14):
            R(d, gx, 330, 1, 70, (206, 176, 132))
        for gy in range(344, 400, 14):
            R(d, 0, gy, W, 1, (206, 176, 132))
        # colegio
        R(d, 130, 276, 136, 58, (240, 188, 120))
        R(d, 130, 272, 136, 5, (180, 90, 50))
        R(d, 158, 280, 80, 12, (40, 70, 140))
        text(d, 177, 280, "COLEGIO", WHITE)
        for wx in range(138, 262, 20):
            R(d, wx, 298, 12, 12, (120, 180, 220))
            R(d, wx, 298, 12, 2, (200, 230, 250))
        R(d, 188, 312, 20, 22, (120, 60, 30))
        self.bg = img

    def draw(self, img, d, t):
        flag(d, 40, 268, 'ES', t)
        R(d, 38, 268, 2, 64, (140, 140, 150))
        hud_banner(d, "ESPAÑA - 2003", 8)
        t3 = self.L[2].start
        if t < t3:
            shadow(img, 108, GROUND, 10)
            person(d, 108, GROUND, KID, 'stand', t, 1)
            fx = max(162, 250 - t * 30)
            shadow(img, fx, GROUND, 10)
            person(d, fx, GROUND, FRIEND, 'walk' if fx > 162 else 'stand', t, -1)
        else:
            u = t - t3
            for px, P, f in ((108, KID, 1), (162, FRIEND, -1)):
                shadow(img, px, GROUND, 10)
                person(d, px, GROUND, P, 'stand', t, f)
            ph = (u * 0.9) % 2
            p = ph if ph < 1 else 2 - ph
            bx = 114 + p * 38
            by = GROUND - 6 - math.sin(p * math.pi) * 26
            R(d, bx, by, 5, 5, WHITE)
            R(d, bx + 1, by + 1, 2, 2, BLK)


class Garage(Scene):
    music = 'garage'
    lines = [('NARRADOR', "Su padre, su gran ejemplo, le mete el gusanillo del kickboxing."),
             ('PADRE', "Guardia arriba, Vajtan. Siempre. El que no se rinde, gana."),
             ('VAJTAN NIÑO', "¡Hai! ¡Pam! ¡Pam! ¡Pam!")]

    def setup(self):
        full = np.zeros((H, W, 3), np.uint8)
        tex = np.zeros((H, W), np.float32)
        rng = np.random.default_rng(3)
        for row, yy in enumerate(range(0, 360, 7)):
            off = 0 if row % 2 else 8
            for xx in range(-16, W, 16):
                tv = rng.uniform(0.4, 0.7)
                x0, x1 = max(0, xx + off), min(W, xx + off + 15)
                tex[yy:yy + 6, x0:x1] = tv
                tex[yy, x0:x1] = tv + 0.15
                tex[yy + 6:yy + 7, :] = 0.1
        tex += (vnoise(W, H, 3, 3, 4) - 0.5) * 0.2
        full[:] = pal_map(np.clip(tex, 0, 1), [(70, 36, 34), (110, 54, 44), (146, 72, 54), (176, 96, 70)], 0.4)
        # haz de luz desde la ventana
        m = Image.new('L', (W, H), 0)
        ImageDraw.Draw(m).polygon([(30, 120), (90, 120), (230, 386), (120, 386)], fill=255)
        mk = np.array(m) > 0
        lit = np.clip(full.astype(np.float32) * 1.25 + 20, 0, 255).astype(np.uint8)
        dz = (BAY[:H, :W] > 0.3)
        full[mk & dz] = lit[mk & dz]
        full[360:] = pal_map(np.clip(0.4 + vnoise(W, 120, 6, 1, 5) * 0.4, 0, 1),
                             [(60, 60, 70), (80, 80, 90), (100, 100, 110)])[:120]
        img = Image.fromarray(full)
        d = ImageDraw.Draw(img)
        R(d, 0, 0, W, 60, (40, 30, 30))
        for bxx in range(0, W, 40):
            R(d, bxx, 0, 6, 60, (60, 44, 36))
        R(d, 0, 56, W, 8, (90, 64, 44))
        R(d, 26, 90, 70, 34, (40, 40, 60))
        R(d, 28, 92, 66, 30, (200, 220, 240))
        R(d, 60, 92, 2, 30, (40, 40, 60))
        R(d, 208, 120, 50, 64, (240, 230, 200))
        R(d, 210, 122, 46, 24, (200, 30, 40))
        text(d, 221, 125, "K1", WHITE, 2)
        text(d, 214, 152, "TORNEO", BLK)
        text(d, 218, 166, "2003", BLK)
        R(d, 0, 360, W, 2, (40, 40, 50))
        self.bg = img

    def schedule(self, t0):
        super().schedule(t0)
        s = self.L[2].start + 0.6
        self.hits = []
        while s < self.dur - 0.6:
            self.hits.append(s)
            s += 0.7
        self.sfx = [(h + 0.08, 'hit') for h in self.hits]

    def draw(self, img, d, t):
        hud_banner(d, "EL GARAJE", 74)
        rnd = random.Random(1)
        for k in range(30):          # polvo en el haz de luz
            x = 40 + (rnd.random() * 160 + t * 4 * (1 + k % 3)) % 170
            y = 130 + (rnd.random() * 240 + t * 3) % 250
            if (x - 30) * 2.2 > (y - 120) * 1.0 - 20:
                d.point((int(x), int(y)), fill=(255, 230, 190))
        ang, last = 0.03 * math.sin(t * 2), None
        for h in self.hits:
            if h <= t:
                ang += 0.35 * math.exp(-(t - h) * 1.5) * math.sin((t - h) * 7)
                last = h
        px, py = 180, 64
        for i in range(230):
            d.point((int(px + math.sin(ang) * i), py + i), fill=(170, 170, 180))
        for i in range(80):
            xx = px + math.sin(ang) * (230 + i)
            c = (180, 30, 40) if 5 < i < 74 else (60, 60, 60)
            R(d, int(xx) - 9, 294 + i, 19, 1, c)
            R(d, int(xx) - 9, 294 + i, 3, 1, shade(c, 1.3))
            R(d, int(xx) + 6, 294 + i, 3, 1, shade(c, 0.7))
        pose = 'guard'
        if last is not None and t - last < 0.25:
            pose = 'kick' if self.hits.index(last) % 2 == 0 else 'punch'
        if t < self.L[2].start:
            pose = 'guard' if t > self.L[1].start else 'stand'
        for x, P, p in ((100, DAD, 'stand' if t < self.L[1].start else 'guard'), (160, KID, pose)):
            shadow(img, x, GROUND, 12)
            person(d, x, GROUND, P, p, t, 1)
        if last is not None and t - last < 0.12:
            sx = int(px + math.sin(ang) * 270) - 12
            for a in range(6):
                d.line([(sx, 366), (sx + math.cos(a) * 8, 366 + math.sin(a) * 8)], fill=GOLD)
            text(d, sx - 16, 340, "POW!", GOLD, 1, BLK)


class Parkour(Scene):
    music = 'parkour'
    lines = [('NARRADOR', "Años después descubre el parkour: saltos, tejados y vídeos para su canal."),
             ('VAJTAN (TEEN)', "¡Dale a grabar! ¡Allá voooy!")]
    min_dur = 10.0
    V, P, J, X = 70.0, 1.5, 0.55, 90

    def setup(self):
        full = sky([(60, 36, 100), (180, 70, 110), (250, 140, 90), (255, 200, 120)], 340)
        a = np.zeros((H, W, 3), np.uint8)
        a[:340] = full
        a[340:] = full[-1]
        img = Image.fromarray(a)
        d = ImageDraw.Draw(img)
        R(d, 150, 220, 40, 40, (255, 226, 140))
        R(d, 145, 226, 50, 28, (255, 226, 140))
        for i, (x, y, w, h) in enumerate([(0, 40, 120, 40), (140, 90, 130, 44), (30, 150, 100, 30)]):
            paste(img, cloud_sprite(w, h, 110 + i, CLOUD_WARM), x, y)
        rnd = random.Random(5)
        for layer, (base, col) in enumerate([(300, (150, 70, 110)), (320, (110, 46, 90))]):
            x = -10
            while x < W:
                w, h = rnd.randint(12, 26), rnd.randint(20, 70 - layer * 20)
                R(d, x, base - h, w, h + 100, col)
                for wy in range(base - h + 4, base + 40, 6):
                    for wx in range(x + 2, x + w - 2, 5):
                        if rnd.random() < 0.18:
                            R(d, wx, wy, 2, 2, (255, 210, 140))
                x += w + 1
        self.bg = img
        self.jumps = [0.9 + k * self.P for k in range(30)]
        self.gaps = [self.X + self.V * (tk + self.J / 2) for tk in self.jumps]

    def schedule(self, t0):
        super().schedule(t0)
        self.sfx = [(tk, 'jump') for tk in self.jumps if tk < self.dur - 0.3]

    def roof(self, b):
        return 352 + ((b * 7) % 5 - 2) * 4

    def runner_y(self, t):
        b = 0
        for k, tk in enumerate(self.jumps):
            if tk <= t < tk + self.J:
                u = (t - tk) / self.J
                return self.roof(k) + (self.roof(k + 1) - self.roof(k)) * u - math.sin(u * math.pi) * 30, True
            if tk + self.J <= t:
                b = k + 1
        return self.roof(b), False

    def draw(self, img, d, t):
        cam = self.V * t
        edges = [-10000] + self.gaps
        for b in range(len(edges) - 1):
            x0 = edges[b] + (13 if b > 0 else 0) - cam
            x1 = edges[b + 1] - 13 - cam
            if x1 < -5 or x0 > W + 5:
                continue
            ry = self.roof(b)
            R(d, x0, ry, x1 - x0, H - ry, (56, 30, 62))
            R(d, x0, ry, x1 - x0, 2, (150, 90, 110))
            R(d, x0, ry + 2, 2, H, (90, 50, 90))
            for wy in range(ry + 8, 396, 10):
                for wx in range(int(x0) + 6, int(x1) - 6, 10):
                    lit = (wx // 10 * 7 + wy + b) % 3 == 0
                    R(d, wx, wy, 4, 5, (255, 210, 120) if lit else (84, 50, 90))
            if b % 2 == 0:
                R(d, x0 + 10, ry - 14, 2, 14, (40, 20, 50))
                R(d, x0 + 6, ry - 14, 10, 1, (40, 20, 50))
        y, jumping = self.runner_y(t)
        person(d, self.X, y, TEEN, 'jump' if jumping else 'run', t, 1)
        for cx, cy, dx, dy in ((8, 8, 1, 1), (261, 8, -1, 1), (8, 386, 1, -1), (261, 386, -1, -1)):
            R(d, min(cx, cx + dx * 10), cy, 11, 1, WHITE)
            R(d, cx, min(cy, cy + dy * 10), 1, 11, WHITE)
        if int(t * 2) % 2 == 0:
            R(d, 196, 16, 5, 5, (255, 40, 40))
        text(d, 204, 14, "REC 00:%02d" % int(t), WHITE, 1, BLK)
        R(d, 16, 16, 14, 10, (230, 30, 30))
        d.polygon([(21, 18), (21, 23), (26, 20)], fill=WHITE)
        text(d, 34, 14, "MI CANAL", WHITE, 1, BLK)


class Art(Scene):
    music = 'art'
    lines = [('NARRADOR', "Estudia en la Escuela de Arte Antonio López. Se hace ilustrador y experto en marketing digital."),
             ('VAJTAN (TEEN)', "Pero me falta algo... ¡echo de menos el ring!")]
    ART = ["....####....", "...#GGGG#...", "..#GGGGGG#..", ".#GGGGGGGG#.", ".#GGGGWGGG#.",
                       ".#GGGGGGGG#.", ".#GGGGGGG#..", "..#GGGGG#...", "...#GGG#....", "...#WWW#....",
                       "...#WWW#....", "....###....."]

    def setup(self):
        full = np.zeros((H, W, 3), np.uint8)
        full[:] = pal_map(np.clip(0.45 + (vnoise(W, H, 8, 2, 7) - .5) * .3, 0, 1),
                          [(40, 44, 80), (56, 62, 104), (70, 78, 124)], 0.5)
        win = sky([(10, 14, 40), (30, 40, 90), (60, 70, 130)], 170, 190)
        wa = np.zeros((170, 190, 3), np.uint8)
        wa[:] = win
        global XX, YY
        sXX, sYY = XX, YY
        YY, XX = np.mgrid[0:170, 0:190].astype(np.float32)
        mountain(wa, 110, 40, 1.1, 1.0, 71, SNOW_NIGHT, snow=0.55, jag=8)
        mountain(wa, 30, 90, 1.0, 1.0, 72, SNOW_NIGHT, snow=0.3, haze=(40, 50, 90), hf=0.3)
        XX, YY = sXX, sYY
        wim = Image.fromarray(wa)
        paste(wim, cloud_sprite(80, 22, 120, CLOUD_NIGHT), 90, 110)
        wd = ImageDraw.Draw(wim)
        R(wd, 150, 18, 12, 12, (240, 240, 210))
        R(wd, 154, 18, 8, 8, (30, 40, 90))
        for sx, sy in [(20, 12), (60, 30), (90, 8), (170, 50), (40, 50), (130, 20)]:
            wd.point((sx, sy), fill=WHITE)
        img = Image.fromarray(full)
        d = ImageDraw.Draw(img)
        R(d, 36, 36, 198, 178, (30, 24, 30))
        img.paste(wim, (40, 40))
        R(d, 135, 40, 4, 170, (30, 24, 30))
        R(d, 40, 124, 190, 3, (30, 24, 30))
        R(d, 30, 214, 210, 6, (90, 70, 60))
        R(d, 0, 350, W, 130, (100, 64, 40))
        for x in range(0, W, 18):
            R(d, x, 350, 1, 130, (84, 54, 34))
        R(d, 20, 320, 230, 8, (150, 100, 60))
        R(d, 20, 320, 230, 2, (190, 140, 90))
        R(d, 28, 328, 6, 56, (120, 80, 50))
        R(d, 236, 328, 6, 56, (120, 80, 50))
        self.bg = img

    def draw(self, img, d, t):
        hud_banner(d, "ARTE Y DISEÑO", 8)
        R(d, 50, 262, 72, 54, (40, 40, 50))
        R(d, 53, 265, 66, 44, (230, 230, 240))
        R(d, 82, 316, 10, 4, (40, 40, 50))
        cols = {'#': BLK, 'G': (200, 30, 40), 'W': WHITE}
        total = sum(ch != '.' for row in self.ART for ch in row)
        n = int(min(1, t / 5) * total)
        k = 0
        for ry, row in enumerate(self.ART):
            for rx, ch in enumerate(row):
                if ch == '.':
                    continue
                if k < n:
                    R(d, 68 + rx * 3, 268 + ry * 3, 3, 3, cols[ch])
                k += 1
        R(d, 150, 262, 72, 54, (40, 40, 50))
        R(d, 153, 265, 66, 44, (20, 30, 40))
        text(d, 156, 264, "LIKES", (120, 255, 160))
        for i in range(7):
            hh = int(min(1, max(0, (t - 3) / 4)) * (5 + i * 4 + (i % 2) * 3))
            R(d, 158 + i * 8, 306 - hh, 6, hh, (80, 220, 140))
        R(d, 186, 316, 10, 4, (40, 40, 50))
        # lampara
        R(d, 232, 300, 3, 20, (60, 60, 70))
        d.polygon([(226, 300), (242, 300), (238, 292), (230, 292)], fill=(230, 180, 60))
        person(d, 136, 372, TEEN, 'draw', t, -1)
        R(d, 20, 320, 230, 8, (150, 100, 60))
        R(d, 20, 320, 230, 2, (190, 140, 90))
        if t > self.L[1].start + 0.5:
            text(d, 128, 294 - int(t * 2) % 2, "?", GOLD, 2, BLK)


class Comeback(Scene):
    music = 'covid'
    lines = [('NARRADOR', "Con 22 años vuelve al kickboxing. Esta vez, para competir en serio."),
             ('NARRADOR', "2020. Pandemia. Gimnasios cerrados. Todo parado..."),
             ('VAJTAN', "Si quieres llegar alto, tienes que ponerle empeño. ¡Yo no paro!")]

    def setup(self):
        full = sky([(8, 8, 26), (24, 26, 60), (50, 46, 80)], H)
        img = Image.fromarray(full)
        paste(img, cloud_sprite(140, 40, 130, CLOUD_NIGHT), 20, 30)
        paste(img, cloud_sprite(120, 36, 131, CLOUD_NIGHT), 150, 70)
        d = ImageDraw.Draw(img)
        rnd = random.Random(4)
        x = -4
        while x < W:
            w, h = rnd.randint(22, 44), rnd.randint(120, 230)
            R(d, x, 360 - h, w, h, (26, 28, 46))
            R(d, x, 360 - h, 2, h, (40, 42, 66))
            for wy in range(360 - h + 6, 350, 9):
                for wx in range(x + 4, x + w - 4, 7):
                    if rnd.random() < 0.25:
                        R(d, wx, wy, 3, 4, (240, 200, 110))
            x += w + 3
        R(d, 0, 360, W, 120, (40, 40, 50))
        R(d, 130, 250, 136, 110, (90, 90, 100))
        R(d, 136, 272, 124, 88, (130, 130, 140))
        for yy in range(274, 360, 4):
            R(d, 136, yy, 124, 1, (104, 104, 114))
        R(d, 140, 254, 116, 14, (30, 30, 30))
        text(d, 150, 256, "GIMNASIO", (255, 80, 80))
        R(d, 158, 296, 80, 18, WHITE)
        R(d, 159, 297, 78, 16, (220, 30, 30))
        text(d, 177, 299, "CERRADO", WHITE)
        R(d, 40, 230, 3, 132, (60, 60, 70))
        R(d, 32, 228, 16, 4, (60, 60, 70))
        self.bg = img

    def draw(self, img, d, t):
        banner(d, "2017" if self.idx(t) == 0 else "2020", 8, 8)
        for yy in range(232, 386):
            w = int((yy - 232) * 0.45)
            for xx in range(38 - w, 42 + w, 2):
                if (xx + yy) % 4 == 0 and 0 <= xx < W:
                    d.point((xx, yy), fill=(96, 96, 66))
        R(d, 32, 231, 16, 2, (255, 240, 160))
        for k in range(70):
            rx = (k * 37 + int(t * 40)) % W
            ry = (k * 53 + int(t * 200)) % 390
            R(d, rx, ry, 1, 4, (110, 120, 170))
        for k in range(6):
            px_ = (k * 47 + 10) % W
            R(d, px_, 392 + (k % 3) * 20, 20, 1, (70, 80, 110))
        cyc = t % 1.2
        pose = 'guard'
        if cyc < 0.2:
            pose = 'punch'
        elif 0.5 < cyc < 0.72:
            pose = 'kick' if int(t / 1.2) % 2 else 'punch'
        shadow(img, 80, GROUND, 16)
        person(d, 80, GROUND, VAJ, pose, t, 1)
        if int(t * 5) % 3 == 0:
            d.point((76, 344), fill=(150, 200, 255))
            d.point((88, 348), fill=(150, 200, 255))


class Fight(Scene):
    music = 'fight'
    lines = [('LOCUTOR', "¡Con 26 años debuta como profesional! ¡Round 1... FIGHT!"),
             ('NARRADOR', "Campeón de España de K1, categoría +91 kg, en Guadalajara."),
             ('NARRADOR', "Récord K1 profesional: 7-3. En MMA: 1-1, con debut en el Albacete Fight Championship.")]
    pre = 0.3
    min_dur = 16.0

    def setup(self):
        img = Image.new('RGB', (W, H), (10, 8, 22))
        d = ImageDraw.Draw(img)
        for x in range(0, W, 30):
            d.line([(x, 0), (x + 15, 40)], fill=(40, 40, 60))
            d.line([(x + 30, 0), (x + 15, 40)], fill=(40, 40, 60))
        R(d, 0, 40, W, 3, (50, 50, 70))
        R(d, 0, 360, W, 30, (30, 60, 150))
        R(d, 0, 360, W, 2, (80, 120, 220))
        R(d, 0, 390, W, 90, (18, 18, 28))
        self.bg = img
        rnd = random.Random(2)
        self.crowd = []
        for row in range(14):
            y = 110 + row * 17
            sz = 5 + row // 3
            for x in range(-4 + (row % 2) * 5, W, sz + 3):
                self.crowd.append((x, y, sz, rnd.random() * 6,
                                   rnd.choice([(230, 180, 140), (200, 150, 110), (150, 100, 70), (240, 200, 170)]),
                                   rnd.choice([(40, 30, 30), (200, 160, 60), (90, 50, 30), (20, 20, 20)]),
                                   rnd.choice([(80, 80, 140), (140, 50, 50), (50, 110, 80), (120, 120, 120)]),
                                   0.35 + row * 0.03))
        F = 2.6
        self.ev = [(F + 0.3, 'V', 'punch'), (F + 0.9, 'V', 'punch'), (F + 1.8, 'R', 'punch'),
                   (F + 2.6, 'V', 'kick'), (F + 3.4, 'V', 'punch'), (F + 3.9, 'V', 'punch'),
                   (F + 4.8, 'R', 'punch'), (F + 5.6, 'V', 'kick'), (F + 6.4, 'V', 'punch'),
                   (F + 7.3, 'V', 'kick')]
        self.ko = F + 7.3
        self.sfx = [(0.2, 'bell')] + [(e[0] + 0.08, 'hit' if e[2] == 'punch' else 'bighit') for e in self.ev] \
            + [(self.ko + 0.3, 'ko')]

    def hp(self, who, t):
        v = 100
        for tm, w_, kind in self.ev:
            if tm + 0.08 <= t and w_ != who:
                v -= {'punch': 12, 'kick': 18}[kind] if who == 'R' else 10
        if who == 'R' and t >= self.ko + 0.08:
            v = 0
        return max(0, v)

    def draw(self, img, d, t):
        for x, y, sz, ph, sk, hr, sh, br in self.crowd:
            by = int(abs(math.sin(t * 6 + ph)) * 2)
            R(d, x - 1, y + sz - by, sz + 2, sz + 4, shade(sh, br))
            R(d, x, y - by, sz, sz, shade(sk, br))
            R(d, x, y - by, sz, 2, shade(hr, br))
            if t > self.ko and int(t * 4 + ph) % 2:
                R(d, x + 1, y - 6 - by, 2, 5, shade(sk, br))
        for fx in (40, 135, 230):
            sw = math.sin(t * 1.3 + fx) * 40
            for yy in range(40, 360, 2):
                f = (yy - 40) / 320
                cx = fx + sw * f
                hw = 6 + 40 * f
                for xx in range(int(cx - hw), int(cx + hw), 3):
                    if 0 <= xx < W and (xx + yy) % 6 == 0:
                        d.point((xx, yy), fill=(120, 120, 150))
        R(d, 14, 304, 4, 58, (200, 200, 210))
        R(d, 252, 304, 4, 58, (200, 200, 210))
        for i, c in enumerate([(220, 40, 40), WHITE, (40, 80, 220)]):
            R(d, 18, 310 + i * 14, 234, 2, c)
        vx, rx = 112, 158
        vpose, rpose = 'guard', 'guard'
        vflash = rflash = False
        spark = None
        for tm, who, kind in self.ev:
            if tm <= t < tm + 0.25:
                if who == 'V':
                    vpose, vx = kind, vx + 4
                else:
                    rpose, rx = kind, rx - 4
            if tm + 0.08 <= t < tm + 0.35:
                if who == 'V':
                    rx += 4
                    rflash = int(t * 20) % 2 == 0
                    spark = (rx - 10, 336 if kind == 'punch' else 344)
                else:
                    vx -= 4
                    vflash = int(t * 20) % 2 == 0
                    spark = (vx + 10, 336)
        bob = 1 if int(t * 4) % 2 else 0
        G = 362
        if t > self.ko + 0.3:
            person(d, rx + 16, G, RIVAL, 'ko', t, -1)
            person(d, vx, G, VAJ_FIGHT, 'win' if t > self.ko + 1.0 else 'guard', t, 1)
        else:
            person(d, vx, G - bob, VAJ_FIGHT, vpose, t, 1, vflash)
            person(d, rx, G - (1 - bob), RIVAL, rpose, t, -1, rflash)
        if spark:
            sx, sy = spark
            for a in range(8):
                ang = a * math.pi / 4
                d.line([(sx, sy), (sx + math.cos(ang) * 7, sy + math.sin(ang) * 7)], fill=GOLD)
            R(d, sx - 1, sy - 1, 3, 3, WHITE)
        R(d, 0, 0, W, 56, (10, 8, 22))
        for side, name, who in ((0, "VAJTAN", 'V'), (1, "RIVAL", 'R')):
            x0 = 8 if side == 0 else 150
            text(d, x0 if side == 0 else 262 - len(name) * 6, 30, name, WHITE, 1, BLK)
            R(d, x0 - 1, 41, 114, 9, WHITE)
            R(d, x0, 42, 112, 7, (120, 0, 0))
            w_ = int(112 * self.hp(who, t) / 100)
            xx = x0 if side == 0 else x0 + 112 - w_
            R(d, xx, 42, w_, 7, GOLD)
            R(d, xx, 42, w_, 2, (255, 240, 150))
        timer = max(0, 99 - int(min(t, self.ko) * 2))
        R(d, 122, 4, 26, 22, BLK)
        text_c(d, 135, 6, "%02d" % timer, GOLD, 2)
        if 0.3 < t < 1.4:
            text_c(d, W // 2, 150, "ROUND 1", WHITE, 3, (160, 0, 0))
        elif 1.4 <= t < 2.5 and int(t * 10) % 2 == 0:
            text_c(d, W // 2, 146, "FIGHT!", GOLD, 4, (160, 0, 0))
        if self.ko + 0.2 < t < self.ko + 3.2 and int(t * 6) % 2 == 0:
            text_c(d, W // 2, 140, "K.O.!", (255, 60, 40), 5, BLK)
        if t > self.ko + 3.2:
            R(d, 68, 130, 134, 34, BLK)
            R(d, 69, 131, 132, 32, (120, 20, 30))
            text_c(d, W // 2, 134, "CAMPEON DE ESPAÑA", GOLD, 1, BLK)
            text_c(d, W // 2, 148, "K1  +91 KG", WHITE, 1, BLK)
            rnd = random.Random(int(t * 8))
            for _ in range(40):
                cx = rnd.randint(0, W)
                cy = int((rnd.randint(0, 300) + t * 60) % 300) + 56
                d.point((cx, cy), fill=rnd.choice([GOLD, (255, 60, 60), (80, 160, 255), WHITE]))


class Ending(Scene):
    music = 'end'
    lines = [('VAJTAN', "Llegué con 8 años sin saber el idioma. Hoy, 23 años después, esta es mi casa."),
             ('VAJTAN', "Ucrania, Georgia y España en el corazón. ¡No dejes que nada te detenga!")]
    post = 5.2

    def setup(self):
        full = sky([(70, 50, 120), (200, 96, 110), (250, 150, 96), (255, 206, 130)], 300)
        a = np.zeros((H, W, 3), np.uint8)
        a[:300] = full
        a[300:] = full[-1]
        hills(a, 262, 18, 70, 81, [(140, 80, 90), (170, 100, 96), (200, 124, 100)], 30, 0.2)
        l2 = hills(a, 290, 26, 90, 82, [(150, 110, 50), (190, 146, 60), (222, 180, 80), (244, 210, 120)], 60, 0.35)
        field(a, 330, [(160, 110, 40), (200, 150, 50), (230, 186, 80), (248, 214, 130)], 83, 4)
        img = Image.fromarray(a)
        for i, (x, y, w, h) in enumerate([(0, 40, 130, 44), (140, 90, 130, 40), (40, 150, 90, 30)]):
            paste(img, cloud_sprite(w, h, 140 + i, CLOUD_WARM), x, y)
        self.l2 = l2
        self.bg = img
        self.cliff = cliff_bg()

    def mill(self, d, x, y, t, s=1.0):
        R(d, x - 5, y, 10, 30, (245, 238, 226))
        R(d, x + 2, y, 3, 30, (206, 196, 190))
        R(d, x - 7, y + 30, 14, 2, (170, 150, 120))
        d.polygon([(x - 7, y), (x, y - 8), (x + 7, y)], fill=(60, 50, 60))
        R(d, x - 2, y + 20, 4, 10, (90, 60, 40))
        for k in range(4):
            a = t * 1.5 + k * math.pi / 2
            ex, ey = x + math.cos(a) * 22 * s, y - 2 + math.sin(a) * 22 * s
            d.line([(x, y - 2), (ex, ey)], fill=(80, 60, 50))
            px, py = -math.sin(a) * 4, math.cos(a) * 4
            mx, my = x + math.cos(a) * 8, y - 2 + math.sin(a) * 8
            d.polygon([(mx, my), (ex, ey), (ex + px, ey + py), (mx + px, my + py)], fill=(236, 226, 206))
        R(d, x - 1, y - 3, 3, 3, BLK)

    def frame(self, t):
        end_dialog = self.L[-1].end_type + HOLD
        if t < end_dialog:
            return super().frame(t)
        u = t - end_dialog
        img = self.cliff.copy()
        d = ImageDraw.Draw(img)
        sitter(d, 142, 334, t)
        R(d, 60, 40, 150, 90, BLK)
        R(d, 62, 42, 146, 86, (60, 20, 40))
        text_c(d, W // 2, 50, "FIN", GOLD, 5, (120, 30, 0))
        text_c(d, W // 2, 100, "GRACIAS POR JUGAR", WHITE, 1)
        cnt = max(0, 9 - int(u * 2.2))
        if int(u * 3) % 2 == 0:
            text_c(d, W // 2, 440, "¿CONTINUAR?  %d" % cnt, (255, 120, 60), 1, BLK)
        text_c(d, W // 2, 458, "BASADO EN LA VIDA DE", WHITE, 1, BLK)
        text_c(d, W // 2, 468, "VAJTAN SHANAVA", GOLD, 1, BLK)
        if u < 0.5:
            a = np.asarray(img, np.float32) * (round(u / 0.5 * 6) / 6)
            img = Image.fromarray(a.astype(np.uint8))
        return img

    def draw(self, img, d, t):
        R(d, 120, 250, 30, 30, (255, 230, 150))
        R(d, 116, 256, 38, 18, (255, 230, 150))
        for mx, off in ((40, 0), (228, 1)):
            my = int(self.l2[mx]) - 30
            self.mill(d, mx, my, t + off)
        hud_banner(d, "ALBACETE - 2026", 8)
        flag(d, 150, 312, 'UA', t)
        flag(d, 184, 312, 'GE', t + .5)
        flag(d, 218, 312, 'ES', t + 1)
        shadow(img, 108, GROUND, 16)
        person(d, 108, GROUND, VAJ, 'stand', t, 1)


SCENES = [Title(), Ukraine(), Journey(), Spain(), Garage(), Parkour(), Art(), Comeback(), Fight(), Ending()]


def build_audio(total):
    n = int(total * SR) + SR
    mus, fx = np.zeros(n), np.zeros(n)
    for i, sc in enumerate(SCENES):
        seg = np.zeros(n)
        music_section(seg, sc.t0, sc.dur, sc.music, 100 + i)
        a, b = int(sc.t0 * SR), int((sc.t0 + sc.dur) * SR)
        f = int(0.25 * SR)
        env = np.zeros(n)
        env[a:b] = 1
        env[a:a + f] = np.linspace(0, 1, f)
        env[b - f:b] = np.linspace(1, 0, f)
        mus += seg * env
        for tt, kind in sc.sfx:
            sfx(fx, sc.t0 + tt, kind)
        rng = random.Random(i)
        for ln in sc.L:
            base = BEEP_F[ln.who]
            for ch, tm in zip(ln.flat, ln.times):
                if ch.isalnum():
                    tone(fx, sc.t0 + tm, 0.035, base * (1 + rng.uniform(-0.04, 0.04)), 0.12, 'sq', 0.5)
    out = np.tanh((mus * 0.8 + fx) * 1.1) * 0.9
    return out[:int(total * SR)]


def main():
    preview = '--preview' in sys.argv
    t = 0.0
    for sc in SCENES:
        sc.setup()
        sc.schedule(t)
        t += sc.dur
    total = t
    for sc in SCENES:
        print("%-10s start %6.2f dur %5.2f" % (type(sc).__name__, sc.t0, sc.dur))
    print("TOTAL %.2f s" % total)
    if preview:
        pdir = os.path.join(OUT_DIR, 'preview')
        os.makedirs(pdir, exist_ok=True)
        for sc in SCENES:
            for k, f in enumerate((0.3, 0.97)):
                sc.frame(sc.dur * f).resize((W * 2, H * 2), Image.NEAREST).save(
                    os.path.join(pdir, '%s_%d.png' % (type(sc).__name__, k)))
        return
    wav = os.path.join(OUT_DIR, '_audio9x16.wav')
    write_wav(wav, build_audio(total))
    scan = np.ones((H * SCALE, 1, 1), np.float32)
    scan[SCALE - 1::SCALE] = 0.88
    cmd = [ffmpeg_exe(), '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
           '-s', '%dx%d' % (W * SCALE, H * SCALE), '-r', str(FPS), '-i', '-', '-i', wav,
           '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
           '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', OUT]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    nframes = int(round(total * FPS))
    si = 0
    for fi in range(nframes):
        gt = fi / FPS
        while si + 1 < len(SCENES) and gt >= SCENES[si + 1].t0:
            si += 1
        sc = SCENES[si]
        lt = gt - sc.t0
        a = np.asarray(sc.frame(lt), np.float32)
        fade = min(1.0, lt / 0.3, (sc.dur - lt) / 0.3)
        if si == 0:
            fade = min(fade, lt / 1.0)
        a = a * (round(max(0.0, fade) * 6) / 6)
        big = np.repeat(np.repeat(a, SCALE, 0), SCALE, 1) * scan
        p.stdin.write(big.astype(np.uint8).tobytes())
        if fi % 240 == 0:
            print("frame %d/%d" % (fi, nframes), flush=True)
    p.stdin.close()
    p.wait()
    os.remove(wav)
    print("OK ->", OUT)


if __name__ == '__main__':
    main()
