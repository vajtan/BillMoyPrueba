#!/usr/bin/env python3
"""
HISTORIA Y AVENTURAS DE VAJTAN, EL SUPER NENE - v3
Estilo GBC/GBA (RPG vista cenital), vertical 9:16 1080x1920, 2:55.
Todo procedural: decorados, personajes chibi, fuente, musica chiptune y "pi-pi-pi".
Sin APIs, sin imagenes externas.   Uso: python3 make_video_v3.py [--preview] [--scene X]
"""
import math, os, random, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
VID = os.path.dirname(HERE)
sys.path[:0] = [HERE, VID, os.path.join(VID, 'v2')]
import make_video as mv
from make_video import text, text_c, tone, noise, music_section, write_wav, ffmpeg_exe, SR
import make_video_v2 as V2                     # guion, musica y efectos de sonido
from gbc import *
from chibi import *
import chibi as CB

S = 6                    # 180x320 -> 1080x1920
FPS = 24
TARGET = 175.0
BOX_Y = 170              # caja de dialogo (zona segura de redes)
OUT_MP4 = os.path.join(VID, "vajtan_aventuras_gbc_9x16.mp4")
CPS, HOLD = 31.0, 1.05
WHITE, BLK, GOLD = (248, 248, 240), (24, 24, 32), (255, 208, 60)
NAMES = {'VAJTAN NIÑO': 'VAJTAN', 'VAJTAN TEEN': 'VAJTAN', 'VAJTAN HALO': 'VAJTAN', 'VAJTAN ADULTO': 'VAJTAN'}


# ================================================================ UI
def wrap(s, n=25):
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
        self.who, self.start = who, start
        self.lines = wrap(txt.upper())
        assert len(self.lines) <= 6, txt
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
        self.end = tt

    def shown(self, t):
        return sum(1 for tm in self.times if tm <= t)


def draw_box(d, ln, t):
    x0, y0, w = 3, BOX_Y, 158
    h = 12 + len(ln.lines) * 11
    R(d, x0, y0, w, h, BLK)
    R(d, x0 + 1, y0 + 1, w - 2, h - 2, WHITE)
    R(d, x0 + 2, y0 + 2, w - 4, h - 4, (40, 56, 120))
    R(d, x0 + 3, y0 + 3, w - 6, h - 6, (24, 32, 80))
    name = NAMES.get(ln.who, ln.who)
    nw = len(name) * 6 + 6
    R(d, x0 + 4, y0 - 7, nw + 2, 11, BLK)
    R(d, x0 + 5, y0 - 6, nw, 9, (200, 50, 50))
    text(d, x0 + 8, y0 - 7, name, WHITE)
    n = ln.shown(t)
    k = 0
    for li, line in enumerate(ln.lines):
        text(d, x0 + 6, y0 + 6 + li * 11, line[:max(0, n - k)], WHITE, shadow=(10, 14, 40))
        k += len(line) + 1
    if n >= len(ln.flat) and int(t * 3) % 2 == 0:
        for i in range(3):
            R(d, x0 + w - 12 + i, y0 + h - 9 + i, 5 - 2 * i, 1, GOLD)


def banner(d, s, y=34):
    w = len(s) * 6 + 6
    x = max(3, (164 - w) // 2)
    R(d, x - 1, y - 1, w + 2, 12, BLK)
    R(d, x, y, w, 10, (200, 50, 50))
    R(d, x, y, w, 1, (250, 120, 120))
    text(d, x + 3, y - 1, s, WHITE)


def level(d, s, y=48):
    w = len(s) * 6 + 12
    x = 160 - w
    R(d, x - 1, y - 1, w + 2, 12, BLK)
    R(d, x, y, w, 10, (40, 50, 110))
    for px, py in ((x + 4, y + 2), (x + 3, y + 4), (x + 5, y + 4), (x + 4, y + 3), (x + 4, y + 5), (x + 2, y + 4),
                   (x + 6, y + 4), (x + 3, y + 6), (x + 5, y + 6)):
        d.point((px, py), fill=GOLD)
    text(d, x + 9, y - 1, s, GOLD)


def panel(d, x, y, w, h, bg=(24, 32, 80)):
    R(d, x - 1, y - 1, w + 2, h + 2, BLK)
    R(d, x, y, w, h, WHITE)
    R(d, x + 1, y + 1, w - 2, h - 2, bg)


def big(d, s, y, col, sc=3, shc=BLK):
    text_c(d, 82, y, s, col, sc, shc)


def bubble(d, x, y, w, h):
    R(d, x, y + 1, w, h - 2, BLK)
    R(d, x + 1, y, w - 2, h, BLK)
    R(d, x + 1, y + 1, w - 2, h - 2, WHITE)
    R(d, x + 6, y + h, 3, 3, BLK)
    R(d, x + 7, y + h, 1, 2, WHITE)
    R(d, x + 3, y + h + 4, 2, 2, BLK)


# ================================================================ BASE ESCENA
class Scene:
    lines = []
    pre, post, min_dur = 0.3, 0.5, 0
    music = 'title'
    delays = {}
    box = True

    def schedule(self, t0):
        self.t0 = t0
        self.L = []
        s = self.pre
        for i, (who, txt) in enumerate(self.lines):
            s += self.delays.get(i, 0)
            ln = Line(who, txt, s)
            self.L.append(ln)
            s = ln.end + HOLD
        self.dur = max(self.min_dur, (self.L[-1].end + self.post + HOLD) if self.L else 0)
        self.sfx = []
        self.after()

    def after(self):
        pass

    def idx(self, t):
        i = 0
        for k, ln in enumerate(self.L):
            if t >= ln.start:
                i = k
        return i

    def cur(self, t):
        c = None
        for ln in self.L:
            if t >= ln.start:
                c = ln
        return c

    def talking(self, t, who):
        c = self.cur(t)
        return c is not None and c.who == who and c.shown(t) < len(c.flat)

    def render(self, t):
        img = self.bg.copy()
        self.draw(img, ImageDraw.Draw(img), t)
        dx, dy = self.shake(t)
        if dx or dy:
            img = Image.fromarray(np.roll(np.roll(np.asarray(img), dy, 0), dx, 1))
        d = ImageDraw.Draw(img)
        self.ui(d, t)
        ln = self.cur(t)
        if ln is not None and self.box and self.show_box(t):
            draw_box(d, ln, t)
        return img

    def show_box(self, t):
        return True

    def shake(self, t):
        return 0, 0

    def flash(self, t):
        return False

    def draw(self, img, d, t):
        pass

    def ui(self, d, t):
        pass


def snow(d, t, n=90, seed=1):
    r = random.Random(seed)
    for k in range(n):
        x0, y0, sp = r.random() * W, r.random() * H, 0.6 + r.random()
        y = (y0 + t * 22 * sp) % H
        x = (x0 + t * 6 * sp + math.sin(t * 2 + k) * 2) % W
        d.point((x, y), fill=WHITE)
        if sp > 1.3:
            d.point((x + 1, y), fill=WHITE)


def rain(d, t, n=90, seed=2, col=(120, 140, 220)):
    r = random.Random(seed)
    for k in range(n):
        x0, y0 = r.random() * W, r.random() * H
        y = (y0 + t * 200) % H
        x = (x0 + t * 20) % W
        d.line([(x, y), (x - 1, y + 3)], fill=col)


def pix_cloud(d, x, y, w, col=(250, 250, 250), sh_=(200, 214, 240)):
    R(d, x + 3, y - 4, w - 8, 5, BLK)
    R(d, x, y, w, 6, BLK)
    R(d, x + 1, y + 1, w - 2, 4, col)
    R(d, x + 4, y - 3, w - 10, 4, col)
    R(d, x + 1, y + 4, w - 2, 1, sh_)


def mountains(d, P, y, seed=1, snowc=True):
    r = random.Random(seed)
    x = -20
    while x < W + 20:
        w = r.randint(40, 70)
        h = r.randint(22, 40)
        d.polygon([(x, y), (x + w // 2, y - h), (x + w, y)], fill=P['out'])
        d.polygon([(x + 1, y), (x + w // 2, y - h + 2), (x + w - 1, y)], fill=(110, 130, 190))
        d.polygon([(x + w // 2, y - h + 2), (x + w - 1, y), (x + w // 2 + 2, y)], fill=(80, 96, 160))
        if snowc:
            d.polygon([(x + w // 2 - 7, y - h + 12), (x + w // 2, y - h + 2), (x + w // 2 + 7, y - h + 12),
                       (x + w // 2 + 2, y - h + 10), (x + w // 2 - 2, y - h + 13)], fill=WHITE)
        x += w - 14


# ================================================================ ACANTILADO (titulo / final)
_CL = None


def cliff_scene():
    global _CL
    if _CL is not None:
        return _CL.copy()
    P = FOREST
    img = Image.new('RGB', (W, H), P['sky'])
    d = ImageDraw.Draw(img)
    for yy in range(0, 70, 1):
        c = tuple(int(a + (b - a) * yy / 70) for a, b in zip((120, 180, 250), (200, 230, 250)))
        R(d, 0, yy, W, 1, c)
    mountains(d, P, 86, 3)
    forest(img, region_rect(W, H, 0, 80, W, 136), P, 11, 7, 10)
    grass(img, P, 12, (0, 132, W, 204))
    forest(img, region_poly(W, H, [(0, 126), (40, 128), (26, 170), (0, 190)]), P, 13)
    forest(img, region_poly(W, H, [(150, 126), (180, 124), (180, 200), (160, 170)]), P, 14)
    d = ImageDraw.Draw(img)
    rock_wall(img, 0, 204, W, 244, P, 15)
    R(d, 0, 202, W, 2, P['out'])
    R(d, 0, 200, W, 2, P['md'])
    forest(img, region_rect(W, H, 0, 244, W, H), P, 16, 8, 12)
    tree(img, 30, 196, P, 17, 12)
    d = ImageDraw.Draw(img)
    for k in range(6):
        flower(d, 60 + k * 14, 150 + (k * 7) % 30, P, [P['red'], P['wh'], (250, 210, 60)][k % 3])
    mushroom(d, 140, 186, P)
    mushroom(d, 146, 190, P)
    _CL = img
    return img.copy()


class Title(Scene):
    music = 'title'
    min_dur = 5.6
    box = False

    def setup(self):
        self.bg = cliff_scene()

    def after(self):
        self.sfx = [(3.8, 'start')]

    def draw(self, img, d, t):
        for k, (x0, y0, w) in enumerate(((10, 14, 30), (110, 26, 36), (60, 46, 24))):
            pix_cloud(d, (x0 + t * (3 + k)) % (W + 40) - 30, y0, w)
        put(img, 92, 196, VAJ_RED, 'back', 'sit_back', t)

    def ui(self, d, t):
        bob = 1 if int(t * 2) % 2 else 0
        panel(d, 6, 34, 152, 84, (30, 40, 90))
        text_c(d, 82, 38, "HISTORIA Y AVENTURAS DE", WHITE, 1, BLK)
        text_c(d, 82, 52 + bob, "VAJTAN", GOLD, 4, (120, 40, 0))
        text_c(d, 82, 92 + bob, "EL SÚPER NENE", (255, 130, 70), 1, BLK)
        text_c(d, 82, 106, "BASADO EN HECHOS REALES", WHITE, 1, BLK)
        if (t < 3.8 and int(t * 2) % 2 == 0) or (t >= 3.8 and int(t * 12) % 2 == 0):
            text_c(d, 82, 214, "PRESS START", WHITE if t < 3.8 else GOLD, 1, BLK)
        text_c(d, 82, 228, "(C) 1995-2026", WHITE, 1, BLK)


# ================================================================ UCRANIA
class Ukraine(Scene):
    music = 'ukraine'
    lines = V2.Ukraine.lines

    def setup(self):
        P = FOREST
        img = Image.new('RGB', (W, H))
        grass(img, P, 21)
        forest(img, region_rect(W, H, 0, 0, W, 34), P, 22)
        forest(img, region_poly(W, H, [(0, 30), (22, 30), (14, 320), (0, 320)]), P, 23)
        forest(img, region_poly(W, H, [(166, 30), (180, 30), (180, 320), (170, 320)]), P, 24)
        m = path_mask(W, H, [(62, 96), (70, 140), (84, 200), (90, 320)], 18)
        paint_path(img, m, P)
        d = ImageDraw.Draw(img)
        # campo de trigo
        R(d, 110, 44, 56, 70, P['out'])
        for yy in range(45, 113, 3):
            R(d, 111, yy, 54, 2, (236, 196, 80))
            R(d, 111, yy + 2, 54, 1, (196, 150, 50))
        for xx in range(112, 164, 4):
            d.point((xx, 46 + (xx * 7) % 60), fill=(255, 236, 140))
        house(img, 26, 40, 72, P, roof=(196, 160, 80), wall=(250, 246, 236), rh=24, wh=18, thatch=True, windows=2)
        d = ImageDraw.Draw(img)
        fence_h(d, 22, 50, 104, P)
        fence_h(d, 74, 106, 104, P)
        for k in range(6):
            x = 112 + k * 9
            R(d, x + 1, 118, 1, 8, P['dk'])
            R(d, x - 1, 114, 5, 5, BLK)
            R(d, x, 115, 3, 3, (255, 200, 20))
            d.point((x + 1, 116), fill=(110, 60, 20))
        for k in range(8):
            flower(d, 30 + (k * 23) % 130, 250 + (k * 37) % 60, P, [P['red'], P['wh']][k % 2])
        tree(img, 34, 150, P, 25, 10)
        tree(img, 150, 150, P, 26, 11)
        self.bg = img

    def draw(self, img, d, t):
        i = self.idx(t)
        put(img, 64, 146, MAMA, 'front', 'stand', t, talk=self.talking(t, 'MAMÁ'))
        put(img, 84, 146, PAPA, 'front', 'point' if i in (1, 3) else 'stand', t, talk=self.talking(t, 'PAPÁ'))
        put(img, 104, 150, KID, 'front', 'stand', t)
        put(img, 118, 151, SIS, 'front', 'stand', t)

    def ui(self, d, t):
        banner(d, "UCRANIA")
        level(d, "NIVEL 5")


# ================================================================ DESPEDIDA
def bus_side(d, x, y, L=70, body=(240, 200, 60), stripe=(200, 60, 50), faces=(), t=0, moving=False):
    """Autobus de lado (vista 3/4). (x,y) = abajo izq."""
    R(d, x - 1, y - 27, L + 2, 25, BLK)
    R(d, x, y - 26, L, 23, body)
    R(d, x, y - 26, L, 2, shade(body, 1.15))
    R(d, x, y - 10, L, 3, stripe)
    for i in range((L - 14) // 9):
        wx = x + 3 + i * 9
        R(d, wx, y - 22, 7, 8, BLK)
        R(d, wx + 1, y - 21, 5, 6, (150, 200, 240))
        d.point((wx + 1, y - 21), fill=WHITE)
        if i < len(faces) and faces[i]:
            sk, hr = faces[i]
            R(d, wx + 2, y - 19, 3, 3, sk)
            R(d, wx + 2, y - 20, 3, 1, hr)
    R(d, x + L - 10, y - 22, 8, 16, BLK)
    R(d, x + L - 9, y - 21, 6, 14, (130, 180, 220))
    R(d, x + L - 1, y - 12, 1, 3, (255, 240, 160))
    for wx in (x + 10, x + L - 16):
        d.ellipse([wx - 5, y - 7, wx + 5, y + 3], fill=BLK)
        d.ellipse([wx - 2, y - 4, wx + 2, y], fill=(170, 170, 180))
        if moving and int(t * 10) % 2:
            d.point((wx, y - 4), fill=BLK)


def block_building(img, x, y, w, h, P, seed):
    d = ImageDraw.Draw(img)
    r = random.Random(seed)
    R(d, x - 1, y - 1, w + 2, h + 2, P['out'])
    R(d, x, y, w, 12, (200, 200, 210))
    R(d, x, y, w, 2, WHITE)
    R(d, x, y + 12, w, h - 12, (170, 166, 162))
    for wy in range(y + 15, y + h - 4, 7):
        for wx in range(x + 3, x + w - 4, 6):
            R(d, wx, wy, 4, 4, (250, 214, 130) if r.random() < .25 else (80, 94, 120))


class Farewell(Scene):
    music = 'winter'
    lines = V2.Farewell.lines

    def setup(self):
        P = SNOWP
        img = Image.new('RGB', (W, H))
        grass(img, P, 31, density=0.03)
        for k, x in enumerate((-4, 44, 96, 146)):
            block_building(img, x, 34 if k % 2 else 40, 44, 60, P, k)
        forest(img, region_rect(W, H, 0, 196, W, H), P, 32, 7, 10, 0.0)
        d = ImageDraw.Draw(img)
        R(d, 0, 110, W, 34, (90, 94, 110))
        R(d, 0, 110, W, 2, P['out'])
        R(d, 0, 142, W, 2, P['out'])
        for x in range(0, W, 20):
            R(d, x, 126, 10, 2, WHITE)
        R(d, 0, 144, W, 40, (214, 220, 234))
        R(d, 0, 184, W, 1, P['out'])
        R(d, 10, 146, 30, 4, BLK)
        R(d, 11, 147, 28, 2, (60, 100, 150))
        R(d, 12, 150, 2, 20, BLK)
        R(d, 36, 150, 2, 20, BLK)
        R(d, 14, 151, 22, 10, (170, 210, 230))
        text(d, 14, 150, "BUS", (40, 60, 100))
        self.bg = img

    def after(self):
        self.leave = self.L[1].end + 0.5

    def draw(self, img, d, t):
        i = self.idx(t)
        bx = 90 + (max(0, t - self.leave) ** 2) * 40
        faces = [None, None, None, None, ((226, 170, 132), (40, 30, 26)) if i >= 1 else None]
        if bx < W:
            bus_side(d, bx, 138, 80, faces=faces, t=t, moving=t > self.leave)
        if i == 0:
            put(img, 150, 176, PAPA_WIN, 'front', 'hug', t, talk=False)
        wave = t > self.leave - 0.4
        put(img, 70, 178, MAMA_WIN, 'front', 'wave' if wave else 'stand', t)
        put(img, 88, 180, KID5, 'front', 'wave' if wave else 'stand', t + .3)
        put(img, 54, 180, SIS3, 'front', 'stand', t)
        snow(d, t)

    def ui(self, d, t):
        banner(d, "UCRANIA - INVIERNO")
        level(d, "NIVEL 5")
        if t > self.L[2].start:
            text_c(d, 82, 70, "PASA EL TIEMPO" + "." * (int((t - self.L[2].start) / .8) % 4), WHITE, 1, BLK)


# ================================================================ VIAJE (scroll vertical)
def bus_top(d, x, y, t):
    R(d, x - 1, y - 1, 18, 38, BLK)
    R(d, x, y, 16, 36, (240, 240, 244))
    R(d, x + 6, y, 4, 36, (50, 100, 200))
    R(d, x + 1, y + 1, 14, 5, (130, 190, 240))
    for k in range(5):
        R(d, x, y + 8 + k * 5, 1, 4, (90, 130, 170))
        R(d, x + 15, y + 8 + k * 5, 1, 4, (90, 130, 170))
    R(d, x + 2, y - 1, 3, 1, (255, 240, 150))
    R(d, x + 11, y - 1, 3, 1, (255, 240, 150))


class Journey(Scene):
    music = 'journey'
    lines = V2.Journey.lines
    post = 1.2
    MH = 2600

    def setup(self):
        P = FOREST
        m = Image.new('RGB', (W, self.MH))
        grass(m, P, 41)
        r = random.Random(4)
        y = 0
        while y < self.MH:
            kind = r.choice(['forest', 'forest', 'field', 'lake', 'town', 'mount'])
            hgt = r.randint(90, 160)
            for side in (0, 1):
                x0, x1 = (0, 70) if side == 0 else (110, W)
                k2 = kind if side == 0 else r.choice(['forest', 'field', 'town', 'forest'])
                if k2 == 'forest':
                    forest(m, region_rect(W, self.MH, x0, y, x1, y + hgt), P, r.randint(0, 999))
                elif k2 == 'field':
                    dd = ImageDraw.Draw(m)
                    R(dd, x0 + 4, y + 6, x1 - x0 - 8, hgt - 12, P['out'])
                    for yy in range(y + 7, y + hgt - 7, 3):
                        R(dd, x0 + 5, yy, x1 - x0 - 10, 2, (230, 196, 80) if (yy // 30) % 2 else (140, 200, 80))
                elif k2 == 'lake':
                    water(m, (x0 + 6, y + 10, x1 - 6, y + hgt - 10), P)
                elif k2 == 'town':
                    for hy in range(y + 8, y + hgt - 36, 44):
                        house(m, x0 + 6, hy, x1 - x0 - 14, P, roof=r.choice([(200, 90, 60), (90, 120, 200), (92, 170, 80)]),
                              rh=16, wh=14, windows=1, chimney=False)
                else:
                    rock_wall(m, x0, y + hgt // 2, x1, y + hgt - 4, P, r.randint(0, 99))
                    dd = ImageDraw.Draw(m)
                    for xx in range(x0, x1, 22):
                        dd.polygon([(xx, y + hgt // 2), (xx + 11, y + 10), (xx + 22, y + hgt // 2)], fill=P['out'])
                        dd.polygon([(xx + 1, y + hgt // 2), (xx + 11, y + 12), (xx + 21, y + hgt // 2)], fill=(120, 130, 170))
                        dd.polygon([(xx + 6, y + 24), (xx + 11, y + 12), (xx + 16, y + 24)], fill=WHITE)
            y += hgt
        d = ImageDraw.Draw(m)
        R(d, 72, 0, 36, self.MH, P['out'])
        R(d, 73, 0, 34, self.MH, (96, 96, 106))
        for yy in range(0, self.MH, 16):
            R(d, 89, yy, 2, 8, (250, 230, 120))
        self.map = m
        self.bg = Image.new('RGB', (W, H))

    def draw(self, img, d, t):
        off = int(self.MH - H - t * 180) % (self.MH - H)
        img.paste(self.map.crop((0, off, W, off + H)))
        f = t / self.dur
        if f < .33:
            col = (255, 255, 255)
        elif f < .5:
            col = (255, 190, 150)
        elif f < .8:
            col = (90, 100, 170)
        else:
            col = (230, 230, 255)
        if col != (255, 255, 255):
            img.paste(multiply(img, col))
        d = ImageDraw.Draw(img)
        bus_top(d, 80, 110 + (1 if int(t * 8) % 2 else 0), t)

    def ui(self, d, t):
        panel(d, 6, 32, 152, 22)
        text(d, 10, 33, "UCRANIA", (140, 190, 255))
        text(d, 118, 33, "ESPAÑA", (255, 200, 70))
        R(d, 12, 47, 140, 1, (120, 120, 170))
        px = 12 + int(140 * min(1, t / (self.dur - .6)))
        R(d, 12, 46, px - 12, 3, GOLD)
        R(d, px - 3, 44, 7, 5, WHITE)
        level(d, "NIVEL 8", 60)


# ================================================================ TOMELLOSO
def chimney_td(d, x, y, h, P):
    R(d, x - 5, y - 1, 10, h + 2, P['out'])
    for k in range(h):
        R(d, x - 4, y + k, 8, 1, (190, 96, 60) if (k // 2) % 2 else (160, 76, 50))
    R(d, x + 2, y, 2, h, (130, 60, 40))
    R(d, x - 6, y - 3, 12, 3, P['out'])
    R(d, x - 5, y - 2, 10, 1, (120, 60, 40))


class Tomelloso(Scene):
    music = 'tomelloso'
    lines = V2.Tomelloso.lines

    def setup(self):
        P = FOREST
        img = Image.new('RGB', (W, H))
        tiles_floor(img, (0, 0, W, H), (232, 214, 180), (222, 202, 166), 10)
        d = ImageDraw.Draw(img)
        chimney_td(d, 24, 0, 50, P)
        chimney_td(d, 156, 4, 44, P)
        # iglesia
        R(d, 70, 0, 40, 60, P['out'])
        R(d, 71, 0, 38, 59, (230, 196, 140))
        R(d, 71, 40, 38, 19, (206, 170, 120))
        R(d, 86, 44, 8, 15, P['out'])
        R(d, 87, 45, 6, 14, P['br'])
        for bx in (76, 98):
            R(d, bx, 10, 6, 10, P['out'])
            R(d, bx + 1, 11, 4, 8, (60, 40, 40))
            d.point((bx + 2, 13), fill=GOLD)
        for k, (x, rw) in enumerate(((0, 60), (116, 64))):
            house(img, x + 2, 46, rw - 6, P, roof=(206, 96, 56), wall=(252, 250, 244), rh=18, wh=18, chimney=False,
                  windows=2, door=True)
        d = ImageDraw.Draw(img)
        d.ellipse([66, 110, 114, 138], fill=P['out'])
        d.ellipse([68, 111, 112, 136], fill=(200, 200, 206))
        d.ellipse([72, 114, 108, 133], fill=P['water'])
        R(d, 88, 110, 4, 14, P['gr'])
        R(d, 89, 106, 2, 6, P['waterl'])
        for bx, by in ((14, 150), (130, 150)):
            R(d, bx, by, 26, 5, P['out'])
            R(d, bx + 1, by + 1, 24, 3, P['br'])
            R(d, bx + 2, by + 5, 2, 3, P['out'])
            R(d, bx + 22, by + 5, 2, 3, P['out'])
        tree(img, 12, 130, P, 43, 9)
        tree(img, 168, 130, P, 44, 9)
        tree(img, 20, 300, P, 45, 12)
        tree(img, 160, 290, P, 46, 12)
        self.bg = img

    def draw(self, img, d, t):
        i = self.idx(t)
        if i < 2:
            a = min(1.0, t / 2.2)
            put(img, 120 - a * 16, 160 - a * 4, MAMA, 'side', 'walk' if a < 1 else 'stand', t, -1)
            put(img, 136 - a * 16, 162 - a * 4, SIS, 'side', 'walk' if a < 1 else 'stand', t, -1)
            put(img, 104 - a * 16, 160, KID, 'side' if a < 1 else 'front', 'walk' if a < 1 else 'hug', t, -1)
            put(img, 70, 160, PAPA, 'front', 'hug' if a >= 1 else 'wave', t, talk=self.talking(t, 'PAPÁ'))
        else:
            u = t - self.L[2].start
            put(img, 28, 156, KID, 'side', 'draw', t, 1, shadow=False)
            R(d, 34, 148, 6, 5, WHITE)
            for k, (bx, Lk, f) in enumerate(((118, KIDA, 1), (158, KIDB, -1))):
                put(img, bx, 106 + k * 2, Lk, 'side', 'walk' if int(u * 2 + k) % 2 else 'stand', t, f)
            ph = (u * .8) % 2
            p = ph if ph < 1 else 2 - ph
            R(d, 124 + p * 28, 100 - math.sin(p * math.pi) * 14, 3, 3, WHITE)

    def ui(self, d, t):
        banner(d, "TOMELLOSO - ESPAÑA")
        level(d, "NIVEL 8")
        if self.idx(t) == 2:
            u = t - self.L[2].start
            bubble(d, 6, 96, 60, 34)
            icons = [["..#..", ".###.", "#####", ".###.", "..#.."], ["#...#", ".###.", ".#.#.", ".###.", "#...#"],
                     [".##..", "####.", ".####", "..##.", "..#.."]]
            cols = [GOLD, (220, 60, 60), (60, 160, 220)]
            for k in range(min(3, int(u) + 1)):
                for ry, row in enumerate(icons[k]):
                    for rx, ch in enumerate(row):
                        if ch == '#':
                            R(d, 11 + k * 18 + rx * 3, 102 + ry * 3 + (k % 2) * 4, 3, 3, cols[k])


# ================================================================ INTERIORES
def window_wall(d, x, y, w, h, P, sky=None):
    R(d, x - 1, y - 1, w + 2, h + 2, P['out'])
    R(d, x, y, w, h, sky or P['sky'])
    R(d, x, y, w // 3, 2, WHITE)
    R(d, x + w // 2, y, 1, h, P['out'])
    R(d, x, y + h // 2, w, 1, P['out'])
    R(d, x - 2, y + h + 1, w + 4, 2, P['br'])


def bag_td(d, x, y, sw=0, col=(200, 40, 50)):
    R(d, x + sw, 32, 1, y - 32, (150, 150, 160))
    R(d, x - 5 + sw, y - 1, 11, 26, BLK)
    R(d, x - 4 + sw, y, 9, 24, col)
    R(d, x - 4 + sw, y, 2, 24, shade(col, 1.3))
    R(d, x + 3 + sw, y, 2, 24, shade(col, .7))
    R(d, x - 4 + sw, y, 9, 2, (60, 60, 66))
    R(d, x - 4 + sw, y + 22, 9, 2, (60, 60, 66))


class KickGym(Scene):
    music = 'garage'
    lines = V2.KickGym.lines

    def setup(self):
        P = FOREST
        img = Image.new('RGB', (W, H))
        tiles_floor(img, (0, 84, W, H), (210, 60, 60), (50, 90, 190), 12)
        wall_face(img, (0, 0, W, 84), (190, 200, 214), P)
        d = ImageDraw.Draw(img)
        window_wall(d, 12, 40, 36, 24, P)
        R(d, 60, 36, 50, 40, P['out'])
        R(d, 61, 37, 48, 38, (206, 226, 236))
        d.line([(66, 72), (80, 40)], fill=WHITE)
        d.line([(80, 72), (94, 40)], fill=WHITE)
        R(d, 122, 38, 26, 34, P['out'])
        R(d, 123, 39, 24, 32, WHITE)
        R(d, 123, 39, 24, 10, (210, 40, 40))
        text(d, 124, 38, "K1", WHITE)
        text(d, 124, 50, "CLUB", BLK)
        R(d, 150, 36, 28, 2, P['br'])
        for k in range(3):
            R(d, 152 + k * 9, 28, 5, 8, GOLD)
            R(d, 151 + k * 9, 35, 7, 1, P['brd'])
        self.bg = img

    def after(self):
        s = self.L[2].start + .4
        self.hits = []
        while s < self.dur - .4:
            self.hits.append(s)
            s += .6
        self.sfx = [(h + .06, 'hit') for h in self.hits]

    def draw(self, img, d, t):
        last = None
        for h in self.hits:
            if h <= t:
                last = h
        sw = int(round(math.exp(-(t - last) * 2) * math.sin((t - last) * 9) * 3)) if last else 0
        bag_td(d, 40, 100, 0, (50, 50, 60))
        bag_td(d, 126, 116, sw)
        pose = 'guard' if t > self.L[1].start else 'stand'
        if last is not None and t - last < .22:
            pose = 'kick' if self.hits.index(last) % 2 == 0 else 'punch'
        put(img, 110, 150, KID_KICK, 'side', pose, t, 1)
        put(img, 70, 150, PAPA, 'front', 'cross' if t < self.L[1].start else 'guard', t, talk=self.talking(t, 'PAPÁ'))

    def ui(self, d, t):
        banner(d, "CLUB DE KICKBOXING")
        level(d, "NIVEL 8.5")
        for h in getattr(self, 'hits', []):
            if 0 <= t - h < .15:
                text(d, 128, 92, "POW!", GOLD, 1, BLK)


# ================================================================ PARKOUR (tejados, scroll hacia arriba)
class Parkour12(Scene):
    music = 'parkour'
    lines = V2.Parkour12.lines
    min_dur = 7.5
    L_ = TEEN12
    SPEED = 55.0
    tint = (255, 200, 170)

    def build(self):
        P = FOREST
        MH = 1400
        m = Image.new('RGB', (W, MH))
        tiles_floor(m, (0, 0, W, MH), (226, 214, 190), (214, 200, 174), 8)
        r = random.Random(7)
        self.gaps = []
        y = MH
        k = 0
        while y > 0:
            rh = r.randint(44, 60)
            y -= rh
            x = 0
            while x < W:
                w = r.randint(40, 70)
                roof = r.choice([(206, 96, 56), (190, 80, 50), (216, 116, 66)])
                house(m, x + 2, y, w - 4, P, roof=roof, rh=rh - 14, wh=12, chimney=r.random() < .4, windows=1,
                      door=False)
                x += w
            y -= 14
            self.gaps.append(y + 7)
            k += 1
        self.map = m
        self.MH = MH

    def setup(self):
        self.build()
        self.bg = Image.new('RGB', (W, H))

    def after(self):
        self.jt = []
        for gy in self.gaps:
            dist = self.MH - 60 - gy
            tj = dist / self.SPEED - .35
            if 0 < tj < self.dur:
                self.jt.append(tj)
        self.sfx = [(tj, 'jump') for tj in self.jt]

    def draw(self, img, d, t):
        ry = self.MH - 60 - t * self.SPEED          # posicion del corredor en el mapa
        cam = int(ry - 130)
        cam = max(0, min(self.MH - H, cam))
        img.paste(self.map.crop((0, cam, W, cam + H)))
        if self.tint:
            img.paste(multiply(img, self.tint))
        jump = None
        for k, tj in enumerate(self.jt):
            if tj <= t < tj + .7:
                jump = ((t - tj) / .7, k)
        sy = ry - cam
        if jump:
            u, k = jump
            off = math.sin(u * math.pi) * 16
            px = img.load()
            for dx in range(-4, 5):
                c = px[90 + dx, int(sy)]
                px[90 + dx, int(sy)] = shade(c, .6)
            if k % 2:
                put(img, 90, sy - off, self.L_, 'side', 'tuck', t, 1, ang=-u * 360, shadow=False)
            else:
                put(img, 90, sy - off, self.L_, 'back', 'stand', t, shadow=False)
        else:
            put(img, 90, sy, self.L_, 'back', 'walk', t, fps=12)

    def ui(self, d, t):
        banner(d, "TOMELLOSO - TEJADOS")
        level(d, "NIVEL 12")
        if t < 2 and int(t * 6) % 2 == 0:
            text_c(d, 82, 64, "¡PARKOUR DESBLOQUEADO!", GOLD, 1, BLK)


# ================================================================ ACCIDENTE
class Accident(Scene):
    music = 'accident'
    lines = V2.Accident.lines
    delays = {1: 2.4}

    def setup(self):
        P = FOREST
        img = Image.new('RGB', (W, H))
        wood_floor(img, (0, 84, W, H), (206, 160, 100))
        wall_face(img, (0, 0, W, 84), (220, 206, 170), P)
        d = ImageDraw.Draw(img)
        for x in range(10, 60, 5):
            R(d, x, 34, 2, 48, P['br'])
        for y in range(38, 82, 6):
            R(d, 10, y, 50, 1, P['brd'])
        window_wall(d, 76, 40, 40, 24, P)
        R(d, 130, 40, 40, 40, P['out'])
        R(d, 131, 41, 38, 38, (80, 160, 110))
        text(d, 138, 52, "GYM", WHITE)
        R(d, 10, 110, 160, 60, P['out'])
        R(d, 11, 111, 158, 58, (60, 120, 210))
        for x in range(11, 169, 20):
            R(d, x, 111, 1, 58, (40, 96, 180))
        R(d, 11, 111, 158, 1, (120, 170, 240))
        self.bg = img

    def after(self):
        self.tr = self.L[0].end + .3
        self.tj = self.tr + .9
        self.ti = self.tj + .7
        self.sfx = [(self.tj, 'jump'), (self.ti, 'pah')]

    def shake(self, t):
        if 0 <= t - self.ti < .5:
            k = int((.5 - (t - self.ti)) * 8)
            r = random.Random(int(t * 50))
            return r.randint(-k, k), r.randint(-k, k)
        return 0, 0

    def flash(self, t):
        return 0 <= t - self.ti < .1

    def draw(self, img, d, t):
        L = TEEN16
        gy = 150
        if t < self.tr:
            put(img, 30, gy, L, 'front', 'stand', t)
        elif t < self.tj:
            put(img, 30 + (t - self.tr) / .9 * 60, gy, L, 'side', 'run', t, 1, fps=12)
        elif t < self.ti:
            u = (t - self.tj) / .7
            x = 90 + u * 30
            px = img.load()
            for dx in range(-4, 5):
                px[int(x) + dx, gy] = shade(px[int(x) + dx, gy], .6)
            put(img, x, gy - math.sin(u * math.pi * .9) * 26, L, 'side', 'tuck', t, 1, ang=-u * 180, shadow=False)
        elif t < self.ti + .25:
            put(img, 122, gy, L, 'side', 'stand', t, 1, ang=180, shadow=False)
        else:
            put(img, 128, gy, L, 'side', 'stand', t, 1, ang=90, shadow=False)
            for k in range(3):
                a = t * 5 + k * 2.1
                R(d, 116 + math.cos(a) * 8, gy - 12 + math.sin(a) * 3, 2, 2, GOLD)

    def ui(self, d, t):
        banner(d, "GIMNASIO")
        level(d, "NIVEL 16")
        if self.ti <= t < self.ti + 1.6:
            big(d, "¡PAH!", 70, (255, 70, 50), 4 if t - self.ti < .15 else 3)


# ================================================================ APARATO
class Halo(Scene):
    music = 'hospital'
    lines = V2.Halo.lines
    min_dur = 7.4

    def setup(self):
        P = FOREST
        img = Image.new('RGB', (W, H))
        wood_floor(img, (0, 84, W, H), (190, 140, 90))
        wall_face(img, (0, 0, W, 84), (170, 200, 150), P)
        d = ImageDraw.Draw(img)
        window_wall(d, 10, 40, 34, 26, P)
        R(d, 56, 38, 22, 30, P['out'])
        R(d, 57, 39, 20, 28, (250, 160, 60))
        text(d, 56, 54, "JMP", WHITE)
        R(d, 136, 38, 30, 32, P['out'])
        R(d, 137, 39, 28, 30, WHITE)
        R(d, 137, 39, 28, 7, (210, 40, 40))
        # cama
        R(d, 8, 96, 50, 70, P['out'])
        R(d, 9, 97, 48, 68, (240, 240, 244))
        R(d, 9, 115, 48, 50, (70, 110, 200))
        R(d, 9, 115, 48, 2, (120, 160, 240))
        R(d, 14, 100, 38, 12, WHITE)
        # mueble + tele
        R(d, 108, 86, 66, 26, P['out'])
        R(d, 109, 87, 64, 24, P['br'])
        R(d, 109, 87, 64, 2, P['brl'])
        R(d, 114, 58, 54, 30, P['out'])
        R(d, 116, 60, 50, 24, (30, 60, 130))
        self.bg = img
        self.world = ["..###....##.", ".#####..####", "..###...####", "...#.....##."]

    def draw(self, img, d, t):
        for ry, row in enumerate(self.world):
            for rx, ch in enumerate(row):
                if ch == '#':
                    R(d, 118 + rx * 4, 62 + ry * 4, 4, 4, (70, 190, 100))
        for k, (px, py) in enumerate(((124, 64), (146, 66), (158, 70))):
            if int(t * 3 + k) % 2:
                R(d, px, py, 2, 2, (255, 60, 60))
        R(d, 116, 79, 50, 5, (210, 40, 40))
        days = min(90, int(t / self.dur * 95) + 1)
        for k in range(min(days // 10, 9)):
            cx, cy = 139 + (k % 3) * 8, 48 + (k // 3) * 7
            d.line([(cx, cy), (cx + 4, cy + 4)], fill=(210, 40, 40))
            d.line([(cx + 4, cy), (cx, cy + 4)], fill=(210, 40, 40))
        put(img, 50, 128, TEEN_HALO, 'side', 'sit', t, 1, shadow=False, talk=self.talking(t, 'VAJTAN HALO'))

    def ui(self, d, t):
        banner(d, "CASA - RECUPERACION")
        level(d, "NIVEL 16")
        days = min(90, int(t / self.dur * 95) + 1)
        panel(d, 4, 62, 62, 13)
        text(d, 8, 62, "DIA %02d/90" % days, WHITE)


# ================================================================ VUELTA AL PARKOUR (parque)
class Comeback8m(Parkour12):
    lines = V2.Comeback8m.lines
    L_ = TEEN16
    SPEED = 70.0
    min_dur = 7.5
    tint = None

    def build(self):
        P = FOREST
        MH = 1500
        m = Image.new('RGB', (W, MH))
        grass(m, P, 81)
        forest(m, region_rect(W, MH, 0, 0, 34, MH), P, 82)
        forest(m, region_rect(W, MH, 146, 0, W, MH), P, 83)
        d = ImageDraw.Draw(m)
        self.gaps = []
        y = MH - 30
        r = random.Random(8)
        while y > 0:
            bh = r.randint(26, 40)
            y -= bh
            R(d, 60, y - 1, 60, bh + 2, P['out'])
            R(d, 61, y, 58, bh - 8, (196, 196, 190))
            R(d, 61, y, 58, 1, (230, 230, 226))
            R(d, 61, y + bh - 8, 58, 8, (140, 140, 136))
            for k in range(3):
                d.point((66 + r.randint(0, 48), y + r.randint(2, bh - 10)), fill=(170, 170, 166))
            y -= 18
            self.gaps.append(y + 9)
        for k in range(20):
            tree(m, r.choice([44, 136]), r.randint(40, MH - 20), P, k, 7)
        self.map = m
        self.MH = MH

    def ui(self, d, t):
        banner(d, "DE VUELTA")
        level(d, "NIVEL 17")
        n = int(max(0, t - .5) ** 2.2 * 40)
        panel(d, 4, 62, 84, 13)
        text(d, 8, 62, "SALTOS:%05d" % min(99999, n), GOLD)
        if self.idx(t) == 1:
            panel(d, 94, 62, 66, 24)
            text(d, 97, 62, "KICKBOX", WHITE)
            R(d, 97, 76, 60, 6, (60, 60, 80))
            R(d, 97, 76, 16, 6, (120, 200, 255))
            text(d, 116, 73, "LIGHT", (140, 210, 255))


# ================================================================ ESCUELA DE ARTE
def easel(d, x, y, col, P):
    d.line([(x, y), (x - 5, y + 24)], fill=P['out'], width=2)
    d.line([(x + 14, y), (x + 19, y + 24)], fill=P['out'], width=2)
    d.line([(x + 1, y), (x - 4, y + 24)], fill=P['br'])
    R(d, x - 3, y - 12, 20, 18, P['out'])
    R(d, x - 2, y - 11, 18, 16, WHITE)
    R(d, x, y - 9, 14, 12, col)
    R(d, x + 2, y - 7, 5, 5, shade(col, 1.4))


class ArtSchool(Scene):
    music = 'art'
    lines = V2.ArtSchool.lines

    def setup(self):
        P = FOREST
        img = Image.new('RGB', (W, H))
        wood_floor(img, (0, 84, W, H), (200, 160, 110))
        wall_face(img, (0, 0, W, 84), (236, 226, 206), P)
        d = ImageDraw.Draw(img)
        R(d, 8, 34, 164, 40, P['out'])
        R(d, 9, 35, 162, 38, P['sky'])
        r = random.Random(3)
        x = 9
        while x < 170:
            w = r.randint(16, 26)
            h = r.randint(10, 20)
            R(d, x, 73 - h, w - 2, h, WHITE)
            R(d, x, 73 - h, w - 2, 3, (206, 96, 56))
            x += w
        chimney_td(d, 130, 38, 30, P)
        for wx in (60, 118):
            R(d, wx, 35, 2, 38, P['out'])
        easel(d, 20, 108, (220, 90, 60), P)
        easel(d, 140, 108, (60, 120, 210), P)
        R(d, 150, 140, 18, 26, P['out'])
        R(d, 151, 141, 16, 25, (220, 214, 206))
        d.ellipse([151, 126, 167, 142], fill=P['out'])
        d.ellipse([152, 127, 166, 141], fill=(240, 236, 230))
        self.bg = img

    def draw(self, img, d, t):
        prog = min(1, t / 5)
        easel(d, 92, 124, (240, 180, 60), FOREST)
        R(d, 92, 115, int(14 * prog), 6, (80, 170, 120))
        put(img, 76, 152, TEEN16, 'side', 'draw', t, 1, talk=self.talking(t, 'VAJTAN TEEN'))
        x = (t * 30) % 190 - 10
        R(d, x, 60 - abs(math.sin(t * 4)) * 8, 2, 4, (40, 40, 60))

    def ui(self, d, t):
        banner(d, "ESCUELA DE ARTE")
        level(d, "NIVEL 17-19")
        i = self.idx(t)
        if i >= 1:
            bubble(d, 40, 96, 44, 30)
            x = 46 + (t * 20) % 30
            y = 114 - abs(math.sin(t * 5)) * 8
            R(d, x, y, 2, 4, (40, 40, 60))
            R(d, x, y - 2, 2, 2, (240, 190, 150))
            R(d, 43, 120, 38, 1, (120, 120, 130))
        if i == 2:
            panel(d, 4, 62, 90, 34)
            text(d, 7, 62, "KICKBOX  OFF", (255, 110, 110))
            text(d, 7, 73, "PARKOUR 100%", (130, 255, 170))
            text(d, 7, 84, "DISEÑO   +1", GOLD)


# ================================================================ PANDEMIA
class Pandemic(Scene):
    music = 'covid'
    lines = V2.Pandemic.lines

    def setup(self):
        P = NIGHT
        img = Image.new('RGB', (W, H))
        tiles_floor(img, (0, 0, W, H), (54, 60, 90), (48, 54, 82), 10)
        d = ImageDraw.Draw(img)
        house(img, 30, 36, 130, dict(FOREST, out=(10, 12, 24)), roof=(60, 60, 80), wall=(120, 120, 140), rh=20, wh=40,
              door=False, windows=0, chimney=False, flat=True)
        d = ImageDraw.Draw(img)
        R(d, 50, 44, 90, 10, (20, 20, 30))
        text(d, 60, 43, "GIMNASIO", (255, 90, 90))
        R(d, 0, 186, W, 40, (40, 40, 56))
        R(d, 0, 186, W, 1, (10, 12, 24))
        R(d, 14, 60, 3, 100, (10, 12, 24))
        R(d, 15, 60, 1, 100, (80, 80, 100))
        R(d, 10, 58, 12, 4, (10, 12, 24))
        self.bg = img

    def draw(self, img, d, t):
        i = self.idx(t)
        a = np.array(img)
        Y, X = np.mgrid[0:H, 0:W]
        chk = ((X + Y) % 2 == 0)
        m = ((X - 16) ** 2 + ((Y - 150) * 1.6) ** 2 < 34 ** 2) & chk
        a[m] = np.clip(a[m].astype(int) + 40, 0, 255)
        img.paste(Image.fromarray(a))
        d = ImageDraw.Draw(img)
        R(d, 11, 61, 10, 2, (255, 240, 160))
        if i == 0:
            R(d, 40, 60, 110, 36, (250, 210, 130))
            bag_td(d, 120, 64, int(math.sin(t * 3) * 1))
            R(d, 40, 60, 110, 1, (10, 12, 24))
        else:
            R(d, 40, 60, 110, 36, (130, 130, 150))
            for yy in range(60, 96, 3):
                R(d, 40, yy, 110, 1, (100, 100, 120))
            R(d, 62, 70, 64, 14, BLK)
            R(d, 63, 71, 62, 12, (220, 40, 40))
            text(d, 73, 71, "CERRADO", WHITE)
        rain(d, t, 70 if i == 0 else 140)
        cyc = t % 1.2
        pose = 'guard'
        if cyc < .2:
            pose = 'punch'
        elif .5 < cyc < .7:
            pose = 'kick'
        put(img, 70, 150, YOUNG_TRAIN, 'side', pose, t, 1)

    def ui(self, d, t):
        banner(d, "NIVEL 23" if self.idx(t) == 0 else "2020 - PANDEMIA")
        level(d, "NIVEL 23")


# ================================================================ NEGOCIO
class Business(Scene):
    music = 'business'
    lines = V2.Business.lines

    def setup(self):
        P = FOREST
        img = Image.new('RGB', (W, H))
        tiles_floor(img, (0, 84, W, H), (90, 90, 120), (84, 84, 112), 8)
        wall_face(img, (0, 0, W, 84), (70, 80, 120), P)
        d = ImageDraw.Draw(img)
        window_wall(d, 10, 38, 50, 30, P, sky=(20, 24, 60))
        r = random.Random(2)
        for k in range(30):
            d.point((11 + r.randint(0, 48), 50 + r.randint(0, 17)), fill=(250, 210, 110))
        R(d, 136, 36, 24, 24, P['out'])
        d.ellipse([137, 37, 159, 59], fill=WHITE)
        R(d, 60, 110, 110, 20, P['out'])
        R(d, 61, 111, 108, 18, P['br'])
        R(d, 61, 111, 108, 2, P['brl'])
        self.bg = img

    def draw(self, img, d, t):
        a = t * 8
        d.line([(148, 48), (148 + math.cos(a) * 8, 48 + math.sin(a) * 8)], fill=BLK)
        d.line([(148, 48), (148 + math.cos(a / 12) * 5, 48 + math.sin(a / 12) * 5)], fill=BLK)
        i = self.idx(t)
        on = i == 0 or t < self.L[1].start + .6
        for k, mx in enumerate((66, 100, 134)):
            R(d, mx, 92, 30, 20, BLK)
            R(d, mx + 1, 93, 28, 16, (236, 236, 244) if on else (12, 12, 16))
            if on:
                R(d, mx + 3, 95, 10, 7, [(220, 60, 60), (60, 160, 220), (240, 180, 40)][k])
                R(d, mx + 15, 96, 12, 1, (120, 120, 130))
                R(d, mx + 15, 99, 9, 1, (120, 120, 130))
                R(d, mx + 3, 104, 24, 3, [(80, 200, 120), (200, 100, 200), (60, 60, 200)][k])
            R(d, mx + 13, 112, 4, 2, BLK)
        cups = min(9, int(t * 1.4) + 1)
        for k in range(cups):
            cx, cy = 64 + k * 6, 122
            R(d, cx, cy, 5, 6, BLK)
            R(d, cx + 1, cy + 1, 3, 4, WHITE)
            d.point((cx + 2, cy + 1), fill=(110, 70, 40))
        if on:
            put(img, 46, 138, YOUNG, 'side', 'type', t, 1, shadow=False)
            heat = min(1, t / max(.1, self.L[0].end))
            r = random.Random(int(t * 12))
            for k in range(int(18 * heat)):
                R(d, 44 + r.randint(-5, 5), 108 - r.randint(0, int(10 * heat) + 1), 1, 2,
                  r.choice([(255, 80, 20), (255, 180, 40), (255, 240, 120)]))
        else:
            put(img, 60 - (t - self.L[1].start - .6) * 20, 160, YOUNG, 'side', 'walk', t, -1)

    def ui(self, d, t):
        banner(d, "NEGOCIO DE DISEÑO")
        level(d, "NIVEL 24")
        panel(d, 4, 62, 76, 13)
        text(d, 7, 62, "ESTRES", WHITE)
        v = min(1, t / max(.1, self.L[0].end + .5))
        R(d, 46, 65, 30, 6, (60, 60, 80))
        R(d, 46, 65, int(30 * v), 6, (230, 40, 40))


# ================================================================ PORTERO
class Doorman(Scene):
    music = 'club'
    lines = V2.Doorman.lines

    def setup(self):
        P = NIGHT
        img = Image.new('RGB', (W, H))
        tiles_floor(img, (0, 0, W, H), (50, 50, 70), (44, 44, 62), 10)
        d = ImageDraw.Draw(img)
        R(d, 0, 30, W, 80, (10, 10, 20))
        for y in range(31, 110, 5):
            off = 0 if (y // 5) % 2 else 5
            for x in range(-10, W, 10):
                R(d, x + off, y, 9, 4, (110, 50, 56) if (x + y) % 3 else (96, 44, 50))
        R(d, 70, 60, 40, 50, (10, 10, 20))
        R(d, 72, 62, 36, 48, (70, 30, 60))
        R(d, 89, 62, 2, 48, (40, 16, 30))
        self.bg = img

    def draw(self, img, d, t):
        fl = int(t * 7) % 9 != 0
        a = np.array(img)
        Y, X = np.mgrid[0:H, 0:W]
        chk = ((X + Y) % 2 == 0)
        m = ((X - 90) ** 2 + ((Y - 48) * 1.4) ** 2 < 50 ** 2) & chk
        if fl:
            a[m] = np.clip(a[m].astype(int) * np.array([1.3, .9, 1.25]) + np.array([30, 0, 30]), 0, 255)
        img.paste(Image.fromarray(a.astype(np.uint8)))
        d = ImageDraw.Draw(img)
        R(d, 60, 40, 60, 16, BLK)
        text(d, 66, 43, "DISCO", (255, 110, 220) if fl else (140, 60, 120))
        for px in (36, 58):
            R(d, px, 120, 3, 16, BLK)
            R(d, px, 118, 3, 3, GOLD)
        d.line([(38, 124), (58, 124)], fill=(200, 30, 50), width=2)
        put(img, 118, 124, DOORMAN, 'front', 'cross', t, talk=self.talking(t, 'VAJTAN'))
        i = self.idx(t)
        ppl = [GUEST1, GUEST2, GUEST3]
        if i == 0:
            for k, P in enumerate(ppl):
                put(img, 50, 150 + k * 12, P, 'back', 'stand', t + k)
        else:
            u = t - self.L[1].start
            for k, P in enumerate(ppl):
                st = k * .9
                if k < 2:
                    y = 150 + k * 12 - max(0, u - st) * 50
                    if y > 112:
                        put(img, 50 + min(40, max(0, u - st) * 30), y, P, 'back', 'walk' if u > st else 'stand', t)
                elif u < 2.2:
                    put(img, 50, 174 - min(u, 1.6) * 16, P, 'back', 'walk' if u < 1.6 else 'stand', t)
                else:
                    put(img, 50 - (u - 2.2) * 30, 150, P, 'side', 'walk', t, -1)

    def ui(self, d, t):
        banner(d, "LA NOCHE")
        level(d, "NIVEL 24-26")


# ================================================================ CALVO (primer plano)
class Bald(Scene):
    music = 'bald'
    lines = V2.Bald.lines
    min_dur = 8.0

    def setup(self):
        img = Image.new('RGB', (W, H))
        tiles_floor(img, (0, 0, W, H), (200, 226, 236), (184, 212, 226), 10)
        d = ImageDraw.Draw(img)
        R(d, 22, 30, 136, 140, BLK)
        R(d, 24, 32, 132, 136, (200, 180, 140))
        R(d, 28, 36, 124, 128, (190, 220, 236))
        for k in range(0, 130, 30):
            d.line([(36 + k, 160), (66 + k, 40)], fill=(214, 236, 246), width=4)
        cx, cy = 90, 100
        R(d, 50, 150, 80, 18, (34, 34, 42))
        R(d, 78, 136, 24, 16, (206, 150, 114))
        d.ellipse([cx - 32, cy - 40, cx + 32, cy + 40], fill=BLK)
        d.ellipse([cx - 31, cy - 39, cx + 31, cy + 39], fill=(236, 180, 140))
        d.ellipse([cx + 4, cy - 34, cx + 30, cy + 34], fill=(214, 156, 118))
        for ex in (-33, 30):
            R(d, cx + ex, cy - 4, 4, 12, BLK)
            R(d, cx + ex + 1, cy - 3, 2, 10, (214, 156, 118))
        a = np.array(img)
        Y, X = np.mgrid[0:H, 0:W]
        face = ((X - cx) / 31) ** 2 + ((Y - cy) / 39) ** 2 < 1
        rnd = np.random.default_rng(3)
        beard = face & (Y > cy + 12) & (rnd.random((H, W)) > .15)
        a[beard] = (96, 66, 50)
        a[face & (Y > cy + 6) & (Y <= cy + 12) & (np.abs(X - cx) > 22)] = (96, 66, 50)
        img = Image.fromarray(a)
        d = ImageDraw.Draw(img)
        for ex in (-14, 14):
            R(d, cx + ex - 6, cy - 4, 12, 6, WHITE)
            R(d, cx + ex - 2, cy - 4, 5, 6, (90, 60, 40))
            R(d, cx + ex - 1, cy - 3, 3, 3, BLK)
            d.point((cx + ex - 1, cy - 3), fill=WHITE)
            R(d, cx + ex - 7, cy - 10, 14, 3, (54, 38, 30))
        R(d, cx - 2, cy + 2, 4, 10, (206, 150, 114))
        R(d, cx + 1, cy + 3, 2, 9, (186, 130, 98))
        R(d, cx - 8, cy + 22, 16, 3, (140, 60, 60))
        self.bg = img
        hair = face & (Y < cy - 18 - np.abs(X - cx) * .05)
        hair |= face & (np.abs(X - cx) > 26) & (Y < cy - 2)
        ys, xs = np.nonzero(hair)
        self.hy, self.hx = ys.astype(np.float32), xs.astype(np.float32)
        pal = np.array([(40, 28, 24), (58, 42, 32), (76, 54, 42)], np.uint8)
        self.hc = pal[((xs + ys * 3) % 5 > 2).astype(int) + ((ys % 4) == 0).astype(int)]
        self.ft = rnd.uniform(0, 1, len(ys))
        self.vx = rnd.uniform(-6, 6, len(ys))

    def after(self):
        self.h0, self.h1 = 1.0, self.L[0].end + .5
        self.fa = self.h0 + self.ft * (self.h1 - self.h0)
        self.sfx = [(self.h0 + k * .25, 'hair') for k in range(int((self.h1 - self.h0) / .25))]

    def draw(self, img, d, t):
        a = np.array(img)
        dt = t - self.fa
        st = dt < 0
        a[self.hy[st].astype(int), self.hx[st].astype(int)] = self.hc[st]
        fa = (dt >= 0) & (dt < 3)
        yy = (self.hy[fa] + .5 * 260 * dt[fa] ** 2).astype(int)
        xx = (self.hx[fa] + self.vx[fa] * dt[fa] * 4).astype(int)
        ok = (yy < H) & (xx >= 0) & (xx < W)
        a[yy[ok], xx[ok]] = self.hc[fa][ok]
        if t > self.h1:
            for px, py in ((76, 70), (77, 69), (78, 70), (77, 71), (77, 68), (77, 72), (75, 70), (79, 70)):
                a[py, px] = (255, 255, 240)
        img.paste(Image.fromarray(a))

    def ui(self, d, t):
        banner(d, "EL ESPEJO")
        level(d, "NIVEL 26.5")
        pct = int(100 * np.mean(t - self.fa < 0))
        panel(d, 4, 62, 60, 13)
        text(d, 7, 62, "PELO:%3d%%" % pct, WHITE if pct > 20 else (255, 90, 90))
        if t > self.h1 + .2:
            panel(d, 20, 78, 124, 13, (120, 20, 30))
            text_c(d, 82, 78, "¡CALVO! +10 CARISMA", GOLD, 1)


# ================================================================ REFUGIO
OLIVE = dict(FOREST, dk=(80, 100, 60), md=(130, 150, 90), lt=(190, 200, 140), out=(40, 50, 34))


class Refuge(Scene):
    music = 'refuge'
    lines = V2.Refuge.lines

    def setup(self):
        P = FOREST
        img = Image.new('RGB', (W, H))
        grass(img, dict(P, lt=(200, 220, 120), md=(150, 180, 80)), 71)
        forest(img, region_rect(W, H, 0, 0, W, 32), P, 72)
        d = ImageDraw.Draw(img)
        fence_h(d, 4, 176, 60, P)
        fence_v(d, 6, 60, 200, P)
        fence_v(d, 172, 60, 200, P)
        fence_h(d, 4, 176, 200, P)
        for kx in (30, 120):
            house(img, kx, 32, 30, P, roof=(200, 80, 60), wall=(200, 150, 90), rh=12, wh=12, chimney=False, windows=0)
        d = ImageDraw.Draw(img)
        R(d, 70, 36, 40, 16, BLK)
        R(d, 71, 37, 38, 14, (240, 230, 200))
        text(d, 72, 37, "REFUG", (60, 110, 60))
        for tx, ty in ((20, 240), (150, 250), (90, 300)):
            tree(img, tx, ty, OLIVE, tx, 10)
        self.bg = img

    def draw(self, img, d, t):
        cat(img, 150, 60, (230, 150, 60), t)
        cat(img, 30, 60, (60, 60, 64), t + 1)
        for k, (col, sp, x0, y) in enumerate((((200, 150, 90), 26, 10, 96), ((70, 56, 46), 20, 80, 186),
                                              ((240, 234, 224), 32, 40, 172), ((180, 100, 50), 22, 120, 104))):
            span = 130
            p = (x0 + t * sp) % (2 * span)
            x = 24 + (p if p < span else 2 * span - p)
            dog(img, x, y, col, t + k, 1 if p < span else -1)
        i = self.idx(t)
        put(img, 72, 150, VAJ, 'front', 'laptop', t)
        if i >= 1:
            put(img, 104, 150, JUANMA, 'front', 'point' if i == 2 and int(t * 2) % 2 else 'stand', t,
                talk=self.talking(t, 'JUAN MANUEL'))

    def ui(self, d, t):
        banner(d, "REFUGIO DE ANIMALES")
        level(d, "NIVEL 27+")
        i = self.idx(t)
        if i == 0:
            u = t - self.L[0].start
            for k in range(int(u / .8)):
                a = u - k * .8
                if a < 1.4:
                    text(d, 40 + (k % 3) * 20, 120 - a * 24, "+1 CLIENTE", GOLD, 1, BLK)
        if i == 3:
            u = t - self.L[3].start
            panel(d, 8, 62, 148, 96, (244, 244, 248))
            R(d, 9, 63, 146, 11, (60, 120, 60))
            text(d, 12, 62, "ADOPTA ONLINE", WHITE)
            for k in range(3):
                if u > k * .5:
                    x = 13 + k * 47
                    col = [(200, 150, 90), (70, 56, 46), (240, 234, 224)][k]
                    R(d, x, 78, 42, 54, BLK)
                    R(d, x + 1, 79, 40, 52, WHITE)
                    R(d, x + 1, 79, 40, 26, col)
                    R(d, x + 15, 88, 10, 9, shade(col, .75))
                    d.point((x + 17, 91), fill=BLK)
                    d.point((x + 22, 91), fill=BLK)
                    text(d, x + 3, 105, ["LUNA", "ROCKY", "COPO"][k], BLK)
                    R(d, x + 3, 118, 36, 10, (230, 90, 60))
                    text(d, x + 5, 117, "ADOPTA", WHITE)
            text(d, 13, 136, "SOLICITUDES: %d" % int(u * 7), (60, 120, 60))
            text(d, 13, 146, "SISTEMA: ONLINE", (60, 120, 60))


# ================================================================ COMBATE
class Fight(Scene):
    music = 'fight'
    lines = V2.Fight.lines
    min_dur = 14.0

    def setup(self):
        img = Image.new('RGB', (W, H), (16, 14, 34))
        d = ImageDraw.Draw(img)
        for x in range(0, W, 20):
            d.line([(x, 0), (x + 10, 28)], fill=(50, 50, 80))
            d.line([(x + 20, 0), (x + 10, 28)], fill=(50, 50, 80))
        R(d, 0, 118, W, 50, (120, 180, 240))
        R(d, 0, 118, W, 1, WHITE)
        for yy in range(122, 168, 6):
            R(d, 0, yy, W, 1, (104, 164, 226))
        R(d, 0, 168, W, 152, (20, 18, 40))
        self.bg = img
        r = random.Random(2)
        self.crowd = [(x, 40 + row * 12, r.random() * 6,
                       r.choice([(246, 196, 150), (214, 160, 120), (170, 120, 90)]),
                       r.choice([(40, 30, 30), (220, 180, 70), (100, 60, 30), (20, 20, 20)]),
                       r.choice([(80, 80, 160), (160, 50, 50), (50, 130, 90), (140, 140, 140)]))
                      for row in range(7) for x in range(-2 + (row % 2) * 4, W, 8)]
        F = 2.4
        self.ev = [(F + .3, 'V', 'punch'), (F + .9, 'V', 'punch'), (F + 1.7, 'R', 'punch'), (F + 2.4, 'V', 'kick'),
                   (F + 3.1, 'V', 'punch'), (F + 3.6, 'V', 'punch'), (F + 4.4, 'R', 'punch'), (F + 5.2, 'V', 'kick')]
        self.ko = F + 5.2

    def after(self):
        self.mma = self.L[2].start - .3
        self.sfx = [(.2, 'bell')] + [(e[0] + .06, 'hit' if e[2] == 'punch' else 'bighit') for e in self.ev] + \
                   [(self.ko + .3, 'ko')] + [(self.mma + .3 + k * .35, 'hit') for k in range(8)]

    def hp(self, who, t):
        v = 100
        for tm, w_, kind in self.ev:
            if tm + .06 <= t and w_ != who:
                v -= (14 if kind == 'punch' else 20) if who == 'R' else 10
        if who == 'R' and t >= self.ko + .06:
            v = 0
        return max(0, v)

    def draw(self, img, d, t):
        for x, y, ph, sk, hr, sc in self.crowd:
            b = 1 if math.sin(t * 7 + ph) > 0 else 0
            R(d, x - 1, y + 4 - b, 8, 6, BLK)
            R(d, x, y + 5 - b, 6, 5, sc)
            R(d, x, y - b, 6, 6, BLK)
            R(d, x + 1, y + 1 - b, 4, 4, sk)
            R(d, x + 1, y + 1 - b, 4, 1, hr)
            if t > self.ko and int(t * 4 + ph) % 2:
                R(d, x + 2, y - 4 - b, 1, 4, sk)
        if t < self.mma:
            R(d, 8, 96, 3, 64, WHITE)
            R(d, 169, 96, 3, 64, WHITE)
            for k, c in enumerate(((230, 50, 50), WHITE, (50, 90, 230))):
                R(d, 11, 104 + k * 10, 158, 1, c)
            vx, rx = 76, 104
            vp, rp = 'guard', 'guard'
            vf = rf = False
            spark = None
            for tm, who, kind in self.ev:
                if tm <= t < tm + .22:
                    if who == 'V':
                        vp, vx = kind, vx + 2
                    else:
                        rp, rx = kind, rx - 2
                if tm + .06 <= t < tm + .3:
                    if who == 'V':
                        rx += 3
                        rf = int(t * 20) % 2 == 0
                        spark = (rx - 7, 136 if kind == 'punch' else 142)
                    else:
                        vx -= 3
                        vf = int(t * 20) % 2 == 0
                        spark = (vx + 7, 136)
            if t > self.ko + .3:
                put(img, rx + 10, 156, RIVAL, 'side', 'stand', t, -1, ang=-90, shadow=False)
                put(img, vx, 156, VAJ_FIGHT, 'front', 'win' if t > self.ko + 1 else 'guard', t)
            else:
                put(img, vx, 156, VAJ_FIGHT, 'side', vp, t, 1, flash=vf)
                put(img, rx, 156, RIVAL, 'side', rp, t, -1, flash=rf)
            if spark:
                sx, sy = spark
                for a in range(8):
                    an = a * math.pi / 4
                    d.line([(sx, sy), (sx + math.cos(an) * 5, sy + math.sin(an) * 5)], fill=GOLD)
        else:
            r = random.Random(int(t * 10))
            cx, cy = 90, 140
            for k in range(16):
                a = k / 16 * 2 * math.pi
                rr = 18 + r.randint(-2, 3)
                ex, ey = cx + math.cos(a) * rr, cy + math.sin(a) * rr * .6
                d.ellipse([ex - 8, ey - 6, ex + 8, ey + 6], fill=BLK)
            for k in range(16):
                a = k / 16 * 2 * math.pi
                rr = 18 + r.randint(-2, 3)
                ex, ey = cx + math.cos(a) * rr, cy + math.sin(a) * rr * .6
                d.ellipse([ex - 7, ey - 5, ex + 7, ey + 5], fill=(236, 230, 214))
            d.ellipse([cx - 20, cy - 14, cx + 20, cy + 14], fill=(246, 242, 230))
            for k in range(4):
                a = r.random() * 2 * math.pi
                ex, ey = cx + math.cos(a) * 24, cy + math.sin(a) * 14
                d.line([(cx + math.cos(a) * 12, cy + math.sin(a) * 8), (ex, ey)], fill=BLK, width=3)
                R(d, ex - 2, ey - 2, 4, 4, (220, 40, 50) if k % 2 else (40, 90, 220))
            for yy in range(80, 170, 6):
                for xx in range(0, W, 6):
                    d.line([(xx, yy), (xx + 3, yy + 3)], fill=(110, 110, 130))
                    d.line([(xx + 3, yy + 3), (xx + 6, yy)], fill=(110, 110, 130))

    def ui(self, d, t):
        if t < self.mma:
            R(d, 0, 30, W, 30, (16, 14, 34))
            for side, name, who in ((0, "VAJTAN", 'V'), (1, "RIVAL", 'R')):
                x0 = 4 if side == 0 else 96
                text(d, x0, 31, name, WHITE)
                R(d, x0 - 1, 42, 66, 7, WHITE)
                R(d, x0, 43, 64, 5, (130, 0, 0))
                w_ = int(64 * self.hp(who, t) / 100)
                xx = x0 if side == 0 else x0 + 64 - w_
                R(d, xx, 43, w_, 5, GOLD)
            level(d, "NIVEL 30", 62)
            if .3 < t < 1.3:
                big(d, "ROUND 1", 76, WHITE, 2, (160, 0, 0))
            elif 1.3 <= t < 2.3 and int(t * 10) % 2 == 0:
                big(d, "FIGHT!", 72, GOLD, 3, (160, 0, 0))
            if self.ko + .2 < t < self.ko + 2.4 and int(t * 6) % 2 == 0:
                big(d, "K.O.!", 70, (255, 70, 50), 4)
            if t > self.ko + 2.4:
                panel(d, 18, 70, 128, 26, (130, 20, 30))
                text_c(d, 82, 71, "CAMPEON DE ESPAÑA", GOLD, 1)
                text_c(d, 82, 83, "K1  +91 KG", WHITE, 1)
        else:
            banner(d, "PRIMER COMBATE DE MMA")
            if int(t * 3) % 2:
                big(d, "¿¿??", 90, WHITE, 2)


# ================================================================ FINAL
class Ending(Scene):
    music = 'end'
    lines = V2.Ending.lines
    post = 5.0

    def setup(self):
        self.bg = multiply(cliff_scene(), (255, 196, 160))

    def after(self):
        self.fin = self.L[-1].end + HOLD

    def show_box(self, t):
        return t < self.fin

    def draw(self, img, d, t):
        for k, (x0, y0, w) in enumerate(((10, 14, 30), (110, 26, 36))):
            pix_cloud(d, (x0 + t * (3 + k)) % (W + 40) - 30, y0, w, (255, 220, 200), (240, 160, 150))
        put(img, 92, 196, VAJ_RED, 'back', 'sit_back', t)

    def ui(self, d, t):
        if t < self.fin:
            banner(d, "HOY")
            level(d, "NIVEL 31")
            return
        v = t - self.fin
        panel(d, 30, 44, 104, 60, (70, 20, 40))
        text_c(d, 82, 50, "FIN", GOLD, 4, (120, 30, 0))
        text_c(d, 82, 88, "GRACIAS POR JUGAR", WHITE, 1)
        if int(v * 3) % 2 == 0:
            text_c(d, 82, 214, "¿CONTINUAR? %d" % max(0, 9 - int(v * 2.2)), (255, 140, 70), 1, BLK)
        text_c(d, 82, 228, "HISTORIA Y AVENTURAS DE", WHITE, 1, BLK)
        text_c(d, 82, 240, "VAJTAN, EL SÚPER NENE", GOLD, 1, BLK)


SCENES = [Title(), Ukraine(), Farewell(), Journey(), Tomelloso(), KickGym(), Parkour12(), Accident(), Halo(),
          Comeback8m(), ArtSchool(), Pandemic(), Business(), Doorman(), Bald(), Refuge(), Fight(), Ending()]


# ================================================================ AUDIO + RENDER
def build_audio(total):
    n = int(total * SR) + SR
    mus, fx = np.zeros(n), np.zeros(n)
    for i, sc in enumerate(SCENES):
        seg = np.zeros(n)
        music_section(seg, sc.t0, sc.dur, sc.music, 300 + i)
        a, b = int(sc.t0 * SR), min(n, int((sc.t0 + sc.dur) * SR))
        f = int(.25 * SR)
        env = np.zeros(n)
        env[a:b] = 1
        env[a:a + f] = np.linspace(0, 1, f)
        env[b - f:b] = np.linspace(1, 0, f)
        mus += seg * env
        for tt, kind in sc.sfx:
            V2.sfx(fx, sc.t0 + tt, kind)
        if isinstance(sc, Refuge):
            for k in range(8):
                V2.sfx(fx, sc.t0 + sc.L[0].start + .8 * (k + 1), 'coin')
        rng = random.Random(i)
        for ln in sc.L:
            base = V2.BEEP[ln.who]
            for ch, tm in zip(ln.flat, ln.times):
                if ch.isalnum():
                    tone(fx, sc.t0 + tm, .035, base * (1 + rng.uniform(-.04, .04)), .11, 'sq', .5)
    out = np.tanh((mus * .75 + fx) * 1.1) * .9
    return out[:int(total * SR)]


def plan():
    global CPS
    for sc in SCENES:
        sc.setup()
    while True:
        t = 0.0
        for sc in SCENES:
            sc.schedule(t)
            t += sc.dur
        if t <= TARGET or CPS >= 33:
            break
        CPS += .5
    SCENES[-1].dur += TARGET - t
    return TARGET


def frame_rgb(sc, t):
    img = sc.render(t)
    if sc.flash(t):
        img = Image.new('RGB', (W, H), (255, 255, 255))
    return np.asarray(img)


def main():
    total = plan()
    print("CPS %.1f" % CPS)
    for sc in SCENES:
        print("%-12s %6.2f %5.2f" % (type(sc).__name__, sc.t0, sc.dur))
    if '--preview' in sys.argv:
        only = sys.argv[sys.argv.index('--scene') + 1] if '--scene' in sys.argv else None
        pd_ = os.path.join(HERE, 'preview')
        os.makedirs(pd_, exist_ok=True)
        for sc in SCENES:
            if only and type(sc).__name__ != only:
                continue
            for k, f in enumerate((.3, .75)):
                Image.fromarray(frame_rgb(sc, sc.dur * f)).resize((W * 2, H * 2), Image.NEAREST).save(
                    os.path.join(pd_, '%s_%d.png' % (type(sc).__name__, k)))
        return
    wav = os.path.join(HERE, '_audio.wav')
    write_wav(wav, build_audio(total))
    cmd = [ffmpeg_exe(), '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '1080x1920',
           '-r', str(FPS), '-i', '-', '-i', wav, '-c:v', 'libx264', '-preset', 'slow', '-crf', '22',
           '-tune', 'animation', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest',
           '-movflags', '+faststart', OUT_MP4]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    nf = int(round(total * FPS))
    si = 0
    for fi in range(nf):
        gt = fi / FPS
        while si + 1 < len(SCENES) and gt >= SCENES[si + 1].t0:
            si += 1
        sc = SCENES[si]
        lt = gt - sc.t0
        a = frame_rgb(sc, lt).astype(np.float32)
        fade = min(1.0, lt / .3, (sc.dur - lt) / .3)
        if si == 0:
            fade = min(fade, lt / 1.0)
        if si == len(SCENES) - 1:
            fade = min(1.0, lt / .3, (sc.dur - lt) / 1.0)
        a *= round(max(0.0, fade) * 4) / 4
        big_ = np.repeat(np.repeat(a.astype(np.uint8), S, 0), S, 1)
        p.stdin.write(big_.tobytes())
        if fi % 240 == 0:
            print("frame %d/%d" % (fi, nf), flush=True)
    p.stdin.close()
    p.wait()
    os.remove(wav)
    print("OK ->", OUT_MP4)


if __name__ == '__main__':
    main()
