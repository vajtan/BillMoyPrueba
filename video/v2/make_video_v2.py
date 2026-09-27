#!/usr/bin/env python3
"""
HISTORIA Y AVENTURAS DE VAJTAN, EL SUPER NENE - v2 (vertical 9:16, 1080x1920, 2:55)
Historia real contada por el propio Vajtan. Pixel art "pintado" 100% procedural:
escenarios con ruido+paletas+tramado, personajes articulados, fuente bitmap,
musica chiptune y "pi-pi-pi" sintetizados. Sin APIs ni imagenes externas.

Uso:  python3 make_video_v2.py [--preview] [--scene Nombre]
"""
import math, os, random, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
import make_video as mv                                   # fuente + audio
from make_video import text, text_c, tone, noise, music_section, write_wav, ffmpeg_exe, SR
from toolkit import *
from chars import *
import chars as CH

AW, AH = 360, 640          # capa de arte (x3)
UW, UH = 270, 480          # capa de interfaz (x4)
FPS = 24
TARGET = 175.0
GY = 516                   # suelo de los personajes (arte)
BOX = 276                  # caja de dialogo (UI), dentro de la zona segura de redes
TOP = 58                   # margen superior de la UI (barra de la app)
NAVY = (10, 12, 30)
OUT = os.path.join(os.path.dirname(HERE), "vajtan_historia_9x16.mp4")
CPS, HOLD = 31.0, 1.05

CH.PORTRAIT['VAJTAN TEEN'] = dict(L=TEEN16, bg=(40, 120, 110))
CH.PORTRAIT['VAJTAN HALO'] = dict(L=TEEN16_HALO, bg=(60, 60, 110))
CH.NAMES.update({'VAJTAN TEEN': 'VAJTAN', 'VAJTAN HALO': 'VAJTAN'})
BEEP = {'NARRADOR': 700, 'PAPÁ': 420, 'MAMÁ': 880, 'HERMANA': 1300, 'VAJTAN NIÑO': 1180, 'VAJTAN TEEN': 900,
        'VAJTAN HALO': 860, 'VAJTAN': 620, 'VAJTAN ADULTO': 560, 'JUAN MANUEL': 470, 'LOCUTOR': 480}

mv.MUSIC.update({
    'winter': (72, 57, 'min', [0, 5, 3, 4], False, 0),
    'tomelloso': (124, 55, 'maj', [0, 3, 4, 0], True, 1),
    'accident': (150, 50, 'min', [0, 5, 0, 6], True, 2),
    'hospital': (70, 53, 'maj', [0, 5, 3, 4], False, 0),
    'business': (138, 55, 'min', [0, 6, 5, 4], True, 2),
    'club': (126, 50, 'min', [0, 0, 5, 6], True, 2),
    'bald': (110, 60, 'maj', [0, 4, 5, 4], True, 1),
    'refuge': (120, 62, 'maj', [0, 3, 4, 0], True, 1),
})


def C(img, x, y, L, pose='stand', t=0.0, f=1, sh=True, **kw):
    if sh:
        shadow_ellipse(img, x, y + 1, int(18 * L['s']))
    draw_char(img, x, y, L, pose, t, f, **kw)


# ================================================================ UI
def wrap(s, n=29):
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
        assert len(self.lines) <= 5, txt
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
    y0 = BOX
    R(d, 6, y0, 226, 92, WHITE)
    R(d, 7, y0 + 1, 224, 90, (70, 80, 140))
    R(d, 8, y0 + 2, 222, 88, (14, 20, 52))
    for yy in range(y0 + 2, y0 + 90, 2):
        R(d, 8, yy, 222, 1, (18, 26, 62))
    n = ln.shown(t)
    talking = n < len(ln.flat)
    portrait(d, 13, y0 + 20, ln.who, talking, t)
    text(d, 50, y0 + 3, CH.NAMES.get(ln.who, ln.who), GOLD, shadow=BLK)
    k = 0
    for li, line in enumerate(ln.lines):
        text(d, 50, y0 + 16 + li * 12, line[:max(0, n - k)], WHITE, shadow=(0, 0, 20))
        k += len(line) + 1
    if not talking and int(t * 3) % 2 == 0:
        for i in range(4):
            R(d, 219 + i, y0 + 82 + i, 7 - 2 * i, 1, GOLD)


def banner(d, s, y=6, x=None):
    w = len(s) * 6 + 8
    x = (UW - w) // 2 if x is None else x
    R(d, x - 1, y - 1, w + 2, 15, BLK)
    R(d, x, y, w, 13, (190, 30, 40))
    R(d, x, y, w, 1, (240, 90, 90))
    text(d, x + 4, y + 1, s, WHITE, shadow=BLK)


def level(d, s, y=24):
    w = len(s) * 6 + 18
    x = UW - w - 6
    R(d, x - 1, y - 1, w + 2, 15, BLK)
    R(d, x, y, w, 13, (30, 40, 90))
    R(d, x, y, w, 1, (90, 110, 200))
    for (px, py) in ((x + 5, y + 3), (x + 4, y + 5), (x + 6, y + 5), (x + 5, y + 7), (x + 3, y + 5), (x + 7, y + 5),
                     (x + 5, y + 4), (x + 5, y + 6), (x + 4, y + 8), (x + 6, y + 8)):
        d.point((px, py), fill=GOLD)
    text(d, x + 12, y + 1, s, GOLD, shadow=BLK)


def big(d, s, y, col, scale=4, sh=(120, 0, 0)):
    text_c(d, UW // 2, y, s, col, scale, sh)


def panel(d, x, y, w, h, bg=(14, 20, 52)):
    R(d, x - 1, y - 1, w + 2, h + 2, WHITE)
    R(d, x, y, w, h, bg)


def bubble(d, x, y, w, h):
    R(d, x, y + 2, w, h - 4, WHITE)
    R(d, x + 2, y, w - 4, h, WHITE)
    R(d, x + 2, y + 2, w - 4, h - 4, (250, 250, 250))
    R(d, x + 10, y + h + 2, 5, 4, WHITE)
    R(d, x + 6, y + h + 8, 3, 3, WHITE)


# ================================================================ ESCENAS BASE
class Scene:
    lines = []
    pre = 0.3
    post = 0.5
    min_dur = 0
    music = 'title'
    delays = {}
    box = True
    SH = 148          # sube el arte para centrar la accion en vertical

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
        self.after_schedule()

    def after_schedule(self):
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

    def render(self, t):
        art = self.bg.copy()
        ad = ImageDraw.Draw(art)
        self.draw(art, ad, t)
        top = Image.new('RGBA', (UW, UH), (0, 0, 0, 0))
        self.ui(top, ImageDraw.Draw(top), t)
        ui = Image.new('RGBA', (UW, UH), (0, 0, 0, 0))
        ui.paste(top, (0, TOP))
        ud = ImageDraw.Draw(ui)
        ln = self.cur(t)
        if ln is not None and self.box and self.show_box(t):
            draw_box(ud, ln, t)
        return art, ui

    def show_box(self, t):
        return True

    def shake(self, t):
        return 0, 0

    def flash(self, t):
        return 0.0

    def draw(self, art, d, t):
        pass

    def ui(self, u, d, t):
        pass

    def drift(self, img, t):
        for spr, x0, y0, sp in getattr(self, 'clouds', []):
            x = (x0 + t * sp) % (AW + spr.width + 40) - spr.width - 20
            paste(img, spr, x, y0)


def snowfall(d, t, n=120, seed=1, col=WHITE, wind=12, speed=40):
    rnd = random.Random(seed)
    for k in range(n):
        x0, y0, sp = rnd.random() * AW, rnd.random() * AH, 0.6 + rnd.random()
        y = (y0 + t * speed * sp) % AH
        x = (x0 + t * wind * sp + math.sin(t * 2 + k) * 3) % AW
        R(d, x, y, 2 if sp > 1.3 else 1, 2 if sp > 1.3 else 1, col)


def rainfall(d, t, n=140, seed=2, col=(110, 120, 170)):
    rnd = random.Random(seed)
    for k in range(n):
        x0, y0 = rnd.random() * AW, rnd.random() * AH
        y = (y0 + t * 320) % AH
        x = (x0 + t * 40) % AW
        d.line([(x, y), (x - 1, y + 5)], fill=col)


_CLIFF = None


def cliff_bg():
    global _CLIFF
    if _CLIFF is not None:
        return _CLIFF.copy()
    full = np.zeros((AH, AW, 3), np.uint8)
    s = sky([(92, 184, 196), (140, 206, 214), (186, 226, 228)], 440, AW)
    full[:440] = s
    full[440:] = s[-1]
    mountain(full, 238, 45, 1.35, 0.95, 11, SNOW, snow=0.62, haze=(190, 225, 230), hf=0.12, jag=13)
    mountain(full, 80, 200, 1.2, 0.9, 12, SNOW, snow=0.3, haze=(170, 214, 226), hf=0.35, jag=8)
    mountain(full, 285, 253, 1.05, 1.1, 13, SNOW, snow=0.1, haze=(120, 170, 215), hf=0.1, jag=10, light=0.8)
    img = Image.fromarray(full)
    for i, (x, y, w, h) in enumerate([(160, 330, 200, 66), (80, 386, 160, 52), (226, 400, 150, 60),
                                      (130, 452, 230, 80), (240, 506, 150, 66), (170, 560, 200, 80),
                                      (20, 574, 150, 66)]):
        paste(img, cloud_sprite(w, h, 40 + i), x, y)
    arr = np.array(img)
    poly = [(0, 430), (53, 424), (120, 435), (176, 440), (213, 445), (221, 461), (210, 480), (200, 496),
            (203, 523), (187, 547), (181, 587), (171, 640), (0, 640)]
    cliff(arr, poly, 21)
    img = Image.fromarray(arr)
    pine(img, 58, 436, 5, 1.4)
    _CLIFF = img
    return img.copy()


def birds(d, t, x0=40, y0=150, n=4):
    for k in range(n):
        x = (x0 + k * 22 + t * 14) % (AW + 40) - 20
        y = y0 + k * 7 + math.sin(t * 2 + k) * 3
        wing = 1 if int(t * 6 + k) % 2 else 0
        d.point((x - 2, y - wing), fill=(40, 60, 80))
        d.point((x - 1, y), fill=(40, 60, 80))
        d.point((x, y + 1), fill=(40, 60, 80))
        d.point((x + 1, y), fill=(40, 60, 80))
        d.point((x + 2, y - wing), fill=(40, 60, 80))


# ================================================================ 1. TITULO
class Title(Scene):
    music = 'title'
    min_dur = 5.6
    box = False
    SH = 0

    def setup(self):
        self.bg = cliff_bg()
        self.clouds = [(cloud_sprite(90, 32, 91), 20, 196, 5), (cloud_sprite(120, 40, 92), 200, 270, 3)]

    def after_schedule(self):
        self.sfx = [(3.8, 'start')]

    def draw(self, art, d, t):
        self.drift(art, t)
        birds(d, t, 30, 170)
        sitter_back(d, 190, 444, t)

    def ui(self, u, d, t):
        bob = int(round(math.sin(t * 2.2) * 2))
        text_c(d, UW // 2, 10, "HISTORIA Y AVENTURAS DE", WHITE, 1, (30, 60, 90))
        text_c(d, UW // 2, 24 + bob, "VAJTAN", GOLD, 5, (110, 40, 0))
        text_c(d, UW // 2, 74 + bob, "EL SÚPER NENE", (255, 120, 60), 2, (80, 10, 0))
        text_c(d, UW // 2, 102, "BASADO EN HECHOS REALES", WHITE, 1, (30, 60, 90))
        if (t < 3.8 and int(t * 2) % 2 == 0) or (t >= 3.8 and int(t * 12) % 2 == 0):
            text_c(d, UW // 2, 236, "PRESS START", WHITE if t < 3.8 else GOLD, 1, BLK)
        text_c(d, UW // 2, 256, "(C) 1995-2026 VAJTAN SOFT", (230, 240, 250), 1, (40, 50, 70))


# ================================================================ 2. UCRANIA
class Ukraine(Scene):
    music = 'ukraine'
    lines = [('NARRADOR', "Ucrania. Una familia sencilla: papá, mamá, Vajtan y su hermana, dos años menor."),
             ('PAPÁ', "¿Sabéis qué? Habrá que irnos."),
             ('MAMÁ', "¿Irnos? ¿A dónde?"),
             ('PAPÁ', "A España. Yo iré primero... y luego os traeré a los tres.")]

    def setup(self):
        full = sky([(66, 136, 214), (128, 184, 236), (200, 226, 244)], AH, AW)
        mountain(full, 90, 262, 0.8, 0.7, 31, SNOW, snow=0.18, haze=(170, 206, 236), hf=0.5, jag=6)
        mountain(full, 270, 250, 0.75, 0.9, 32, SNOW, snow=0.2, haze=(170, 206, 236), hf=0.44, jag=7)
        l1 = hills(full, 312, 26, 70, 33, [(60, 110, 90), (80, 136, 96), (110, 160, 100)], 40, 0.2, (160, 200, 220), 0.3)
        l2 = hills(full, 344, 22, 60, 34, [(52, 96, 50), (74, 124, 54), (100, 150, 60), (140, 176, 70)], 50, 0.3)
        field(full, 380, [(150, 100, 30), (194, 144, 40), (228, 184, 62), (248, 218, 110)], 35)
        texture_fill(full, 0, 440, AW, 200, [(58, 110, 50), (80, 136, 56), (110, 160, 64), (150, 186, 80)], 36, 2, 1, 0.45)
        img = Image.fromarray(full)
        d = ImageDraw.Draw(img)
        forest_line(d, l1, 3, 7, (46, 88, 76), (70, 116, 92), 4, 10)
        forest_line(d, l2, 4, 8, (36, 74, 42), (64, 110, 50), 7, 14, 200, AW)
        for i, (x, y, w, h) in enumerate([(10, 50, 140, 54), (190, 90, 160, 60), (80, 170, 110, 40)]):
            paste(img, cloud_sprite(w, h, 60 + i), x, y)
        # casa ucraniana (jata)
        R(d, 24, 382, 96, 52, (246, 240, 226))
        R(d, 24, 426, 96, 8, (190, 170, 140))
        R(d, 120, 385, 12, 49, (206, 198, 192))
        d.polygon([(12, 386), (70, 342), (132, 386)], fill=(160, 118, 62))
        for k in range(0, 44, 3):
            d.line([(70 - k * 1.3, 342 + k), (70 + k * 1.4, 342 + k)], fill=(138, 98, 50) if k % 2 else (184, 142, 80))
        R(d, 88, 346, 8, 18, (150, 70, 50))
        for wx in (34, 96):
            R(d, wx - 2, 394, 17, 16, (40, 90, 170))
            R(d, wx, 396, 13, 12, (150, 200, 230))
            R(d, wx + 6, 396, 1, 12, (40, 90, 170))
            R(d, wx, 402, 13, 1, (40, 90, 170))
            R(d, wx - 3, 410, 19, 2, (60, 110, 190))
        R(d, 62, 400, 16, 34, (110, 64, 36))
        R(d, 62, 400, 16, 2, (140, 90, 50))
        R(d, 75, 416, 1, 2, GOLD)
        # valla
        for fx in range(0, AW, 9):
            R(d, fx, 456, 5, 26, (150, 110, 70))
            R(d, fx, 456, 1, 26, (190, 150, 100))
            R(d, fx + 1, 454, 3, 2, (150, 110, 70))
        R(d, 0, 462, AW, 3, (120, 84, 50))
        R(d, 0, 474, AW, 3, (120, 84, 50))
        d.polygon([(64, 434), (80, 434), (150, 530), (100, 530)], fill=(196, 160, 104))
        birch(img, 320, 470, 3, 1.3)
        birch(img, 170, 450, 4, 0.9)
        self.bg = img
        self.clouds = [(cloud_sprite(90, 34, 70), 0, 30, 5), (cloud_sprite(70, 28, 71), 200, 130, 3)]

    def draw(self, art, d, t):
        R(d, 290, 36, 26, 26, (255, 244, 170))
        R(d, 286, 40, 34, 18, (255, 244, 170))
        self.drift(art, t)
        for gx in (22, 40, 300, 330):
            R(d, gx + 2, 486, 2, 34, (60, 120, 40))
            R(d, gx - 1, 478, 8, 8, (255, 200, 0))
            R(d, gx + 1, 480, 4, 4, (100, 56, 20))
        i = self.idx(t)
        C(art, 150, GY, MAMA, 'stand', t, 1)
        C(art, 196, GY, PAPA, 'point' if i in (1, 3) and int(t * 2) % 2 else 'stand', t, -1)
        C(art, 232, GY, KID, 'stand', t, -1)
        C(art, 252, GY, SIS, 'stand', t, -1)

    def ui(self, u, d, t):
        banner(d, "UCRANIA")
        level(d, "NIVEL 5")


# ================================================================ 3. DESPEDIDA
PAPA_WIN = dict(PAPA, shirt=(96, 70, 50), coat=True)
MAMA_WIN = dict(MAMA, shirt=(110, 60, 80), dress=(70, 50, 76), coat=True)
KID5 = dict(KID_WIN, s=0.58)
SIS3 = dict(SIS_WIN, s=0.47)


def bus(d, x, y, L=120, H=40, body=(236, 204, 70), stripe=(190, 50, 40), t=0.0, faces=(), moving=False):
    R(d, x + 4, y - H - 8, L - 8, 3, shade(body, 1.1))
    R(d, x, y - H - 6, L, H, body)
    R(d, x, y - H - 6, L, 2, shade(body, 1.2))
    R(d, x, y - 14, L, 4, stripe)
    R(d, x, y - 10, L, 4, shade(body, .8))
    for i in range(int((L - 24) / 14)):
        wx = x + 8 + i * 14
        R(d, wx, y - H, 11, 14, (120, 170, 200))
        R(d, wx, y - H, 11, 2, (200, 230, 250))
        d.line([(wx + 2, y - H + 12), (wx + 8, y - H + 3)], fill=(170, 210, 230))
        if i < len(faces) and faces[i]:
            sk, hr = faces[i]
            R(d, wx + 3, y - H + 5, 5, 6, sk)
            R(d, wx + 3, y - H + 4, 5, 2, hr)
            R(d, wx + 2, y - H + 11, 7, 3, shade(hr, .8))
    R(d, x + L - 16, y - H, 12, 18, (100, 150, 190))
    R(d, x + L - 16, y - H, 12, 2, (200, 230, 250))
    R(d, x + L - 30, y - H, 11, 30, (90, 130, 170))
    R(d, x + L - 25, y - H, 1, 30, (60, 90, 120))
    R(d, x + L - 3, y - 20, 3, 5, (255, 240, 170))
    R(d, x, y - 20, 3, 4, (220, 60, 50))
    for wx in (x + 16, x + L - 30):
        d.ellipse([wx - 7, y - 13, wx + 7, y + 1], fill=(28, 26, 30))
        d.ellipse([wx - 3, y - 9, wx + 3, y - 3], fill=(160, 160, 170))
        a = t * (18 if moving else 0)
        d.point((wx + round(math.cos(a) * 5), y - 6 + round(math.sin(a) * 5)), fill=(200, 200, 200))


def panel_block(d, x, y, w, h, rnd, base=(176, 172, 166), snow=True):
    R(d, x, y, w, h, base)
    R(d, x + w - 5, y, 5, h, shade(base, .78))
    for yy in range(y, y + h, 11):
        R(d, x, yy, w - 5, 1, shade(base, .9))
    for wy in range(y + 4, y + h - 8, 11):
        for wx in range(x + 4, x + w - 10, 9):
            lit = rnd.random() < 0.22
            R(d, wx, wy, 6, 6, (250, 214, 130) if lit else (74, 86, 108))
            R(d, wx, wy + 6, 6, 1, shade(base, .7))
    if snow:
        R(d, x - 1, y - 3, w + 2, 4, WHITE)


class Farewell(Scene):
    music = 'winter'
    lines = [('NARRADOR', "Vajtan tiene cinco años, casi seis, cuando papá se marcha el primero."),
             ('PAPÁ', "Portaos bien. Nos vemos pronto."),
             ('NARRADOR', "En España, papá trabaja sin parar para poder traerlos.")]

    def setup(self):
        full = sky([(120, 130, 150), (170, 176, 190), (212, 214, 222)], AH, AW)
        img = Image.fromarray(full)
        for i, (x, y, w, h) in enumerate([(0, 40, 200, 60), (160, 70, 200, 70), (40, 140, 160, 50)]):
            paste(img, cloud_sprite(w, h, 200 + i, CLOUD_GREY), x, y)
        d = ImageDraw.Draw(img)
        rnd = random.Random(8)
        x = -6
        while x < AW:
            w, h = rnd.randint(50, 80), rnd.randint(120, 200)
            panel_block(d, x, 420 - h, w, h, rnd, shade((176, 172, 166), rnd.uniform(.85, 1.05)))
            x += w + rnd.randint(4, 16)
        for bx in (40, 120, 300):
            birch(img, bx, 440, bx, 1.0, bare=True)
        arr = np.array(img)
        texture_fill(arr, 0, 420, AW, 220, [(190, 196, 210), (214, 218, 228), (236, 238, 244), (250, 250, 252)], 9, 5, 2, 0.4, 0.6)
        R_ = ImageDraw.Draw(img)
        img = Image.fromarray(arr)
        d = ImageDraw.Draw(img)
        R(d, 0, 492, AW, 30, (110, 110, 120))
        R(d, 0, 490, AW, 3, (230, 232, 240))
        # marquesina
        R(d, 20, 430, 70, 4, (60, 90, 120))
        R(d, 22, 434, 3, 58, (80, 80, 90))
        R(d, 85, 434, 3, 58, (80, 80, 90))
        R(d, 26, 440, 58, 30, (150, 190, 210))
        R(d, 20, 426, 70, 4, WHITE)
        text(d, 30, 444, "AVTOBUS", (40, 60, 90))
        self.bg = img

    def after_schedule(self):
        self.leave = self.L[1].end + 0.6

    def draw(self, art, d, t):
        bx = 170
        if t > self.leave:
            bx += (t - self.leave) ** 2 * 60
        i = self.idx(t)
        faces = [None, None, None, ((226, 170, 132), (34, 26, 24)) if i >= 1 else None]
        if bx < AW + 10:
            bus(d, bx, 506, 130, 42, t=t, faces=faces, moving=t > self.leave)
        if i == 0:
            C(art, 250, GY, PAPA_WIN, 'hug', t, -1)
        wave = t > self.leave - 0.5
        C(art, 128, GY, MAMA_WIN, 'wave' if wave else 'stand', t, 1)
        C(art, 150, GY, KID5, 'wave' if wave else 'stand', t + .3, 1)
        C(art, 108, GY, SIS3, 'hand', t, 1)
        snowfall(d, t)

    def ui(self, u, d, t):
        banner(d, "UCRANIA - INVIERNO")
        level(d, "NIVEL 5")
        if t > self.L[2].start:
            n = min(3, int((t - self.L[2].start) / 1.2) + 1)
            text_c(d, UW // 2, 60, "PASA EL TIEMPO" + "." * n, WHITE, 1, BLK)


# ================================================================ 4. VIAJE
class Journey(Scene):
    music = 'journey'
    lines = [('NARRADOR', "Con 8 años llega el momento: mamá, su hermana y él viajan a España."),
             ('HERMANA', "¿Falta mucho?"),
             ('VAJTAN NIÑO', "Shhh... estoy dibujando.")]
    post = 1.4

    def setup(self):
        LW = 2200
        a = np.zeros((AH, LW, 3), np.uint8)
        m = np.zeros((AH, LW), bool)
        for i, px in enumerate(range(80, LW, 190)):
            m |= mountain(a, px, 240 + (i * 37) % 50, 0.9, 0.9, 50 + i, SNOW, snow=0.32, haze=(170, 200, 230), hf=0.35)
        self.far = Image.fromarray(np.dstack([a, (m * 255).astype(np.uint8)]), 'RGBA')
        b = np.zeros((AH, LW, 3), np.uint8)
        line = hills(b, 390, 50, 90, 61, [(40, 80, 60), (56, 104, 64), (80, 130, 70)], 80, 0.3)
        Y, X = grid(AH, LW)
        mm = Y >= line[None, :]
        im = Image.fromarray(np.dstack([b, (mm * 255).astype(np.uint8)]), 'RGBA')
        forest_line(ImageDraw.Draw(im), line, 5, 9, (28, 60, 40, 255), (50, 90, 56, 255), 10, 22, 0, LW)
        self.mid = im
        self.bg = Image.new('RGB', (AW, AH), BLK)
        rnd = random.Random(7)
        self.stars = [(rnd.randint(0, AW), rnd.randint(0, 260)) for _ in range(80)]
        self.clouds = [(cloud_sprite(110, 36, 80 + i), rnd.randint(0, AW), 60 + i * 50, 12 + i * 5) for i in range(3)]

    def draw(self, art, d, t):
        f = t / self.dur
        day, dusk, night = (96, 170, 236), (240, 124, 90), (14, 14, 44)
        if f < 0.33:
            top = lerp(day, dusk, f / 0.33)
        elif f < 0.66:
            top = lerp(dusk, night, (f - .33) / .33)
        else:
            top = lerp(night, day, (f - .66) / .34)
        art.paste(Image.fromarray(sky([shade(top, .75), top, lerp(top, WHITE, .3)], AH, AW)))
        if 0.45 < f < 0.85:
            for sx, sy in self.stars:
                d.point((sx, sy), fill=WHITE)
            R(d, 290, 60, 14, 14, (240, 240, 210))
        self.drift(art, t)
        for layer, sp in ((self.far, 10), (self.mid, 45)):
            c = layer.crop((int(t * sp), 0, int(t * sp) + AW, AH))
            art.paste(c, (0, 0), c)
        if 0.4 < f < 0.9:
            dk = Image.new('RGB', (AW, AH), (10, 10, 40))
            art.paste(Image.blend(art, dk, 0.35))
            d = ImageDraw.Draw(art)
        R(d, 0, 450, AW, 70, (70, 70, 80))
        R(d, 0, 450, AW, 3, (130, 130, 130))
        R(d, 0, 520, AW, 120, (50, 80, 50))
        for i in range(0, AW + 50, 50):
            R(d, int(i - (t * 170) % 50), 482, 26, 2, (240, 220, 120))
        for i in range(0, AW + 110, 110):
            x = int(i - (t * 170) % 110)
            R(d, x, 400, 3, 50, (90, 60, 40))
            R(d, x - 5, 403, 13, 2, (90, 60, 40))
        faces = [((244, 198, 164), (222, 180, 92)), ((234, 180, 142), (52, 36, 30)), ((244, 198, 164), (150, 96, 52)), None, None]
        bus(d, 90, 506 + (1 if int(t * 8) % 2 else 0), 170, 50, (236, 236, 240), (40, 90, 170), t, faces, True)

    def ui(self, u, d, t):
        R(d, 10, 6, 250, 30, (14, 20, 52))
        R(d, 10, 6, 250, 1, WHITE)
        R(d, 10, 35, 250, 1, WHITE)
        text(d, 14, 9, "UCRANIA", (120, 180, 255))
        text(d, 214, 9, "ESPAÑA", (255, 190, 60))
        R(d, 24, 28, 222, 1, (120, 120, 160))
        for k in range(24, 247, 12):
            R(d, k, 27, 2, 3, (160, 160, 200))
        px = 24 + int(222 * min(1, t / (self.dur - 0.8)))
        R(d, 24, 27, px - 24, 3, GOLD)
        R(d, px - 4, 22, 9, 5, (236, 236, 240))
        level(d, "NIVEL 8", 42)


# ================================================================ 5. TOMELLOSO
def chimney(d, x, y, h, w0=12, w1=7):
    for k in range(h):
        f = k / h
        w = int(w1 + (w0 - w1) * f)
        c = (170, 90, 60) if (k // 3) % 2 else (150, 76, 52)
        R(d, x - w // 2, y + k, w, 1, c)
        R(d, x + w // 2 - 2, y + k, 2, 1, shade(c, .75))
    R(d, x - w1 // 2 - 2, y - 3, w1 + 4, 4, (120, 60, 40))
    for yy in (y + h // 3, y + 2 * h // 3):
        R(d, x - 6, yy, 12, 2, (110, 56, 40))


class Tomelloso(Scene):
    music = 'tomelloso'
    lines = [('NARRADOR', "Tomelloso. Papá los está esperando. La familia vuelve a estar junta."),
             ('PAPÁ', "¡Bienvenidos a casa!"),
             ('NARRADOR', "Vajtan es un niño un poco raro: un chaval de artes, siempre con la mente creando.")]

    def setup(self):
        full = sky([(60, 140, 228), (126, 190, 244), (206, 230, 250)], AH, AW)
        hills(full, 330, 20, 90, 41, [(190, 150, 110), (214, 176, 130), (230, 200, 150)], 40, 0.2, (210, 220, 236), 0.4)
        img = Image.fromarray(full)
        for i, (x, y, w, h) in enumerate([(0, 70, 130, 44), (200, 40, 150, 50)]):
            paste(img, cloud_sprite(w, h, 90 + i), x, y)
        d = ImageDraw.Draw(img)
        chimney(d, 60, 190, 170)
        chimney(d, 300, 220, 140)
        # iglesia
        R(d, 150, 200, 40, 170, (224, 196, 150))
        R(d, 182, 204, 8, 166, (190, 164, 124))
        blocks = blocks_tex(170, 40, 3, (6, 10), (4, 6))
        R(d, 156, 214, 8, 14, (40, 30, 30))
        R(d, 176, 214, 8, 14, (40, 30, 30))
        d.ellipse([156, 210, 164, 218], fill=(40, 30, 30))
        d.ellipse([176, 210, 184, 218], fill=(40, 30, 30))
        R(d, 158, 218, 4, 6, GOLD)
        d.polygon([(146, 200), (170, 170), (194, 200)], fill=(170, 90, 60))
        R(d, 168, 158, 4, 14, (90, 80, 70))
        R(d, 165, 162, 10, 3, (90, 80, 70))
        rnd = random.Random(12)
        for row in range(3):
            y = 330 + row * 30
            x = -10 + row * 7
            while x < AW:
                w, h = rnd.randint(30, 50), rnd.randint(34, 50)
                house(d, x, y, w, h, sw=6, trim=(40, 90, 170) if rnd.random() < .5 else None)
                R(d, x, y + h - 8, w, 8, (206, 170, 100))
                x += w + rnd.randint(6, 20)
        arr = np.array(img)
        texture_fill(arr, 0, 450, AW, 190, [(196, 170, 136), (214, 190, 156), (228, 206, 172)], 5, 3, 3, .4)
        img = Image.fromarray(arr)
        d = ImageDraw.Draw(img)
        for gx in range(0, AW, 18):
            d.line([(gx, 450), (gx - 30, 640)], fill=(186, 160, 126))
        for gy in (470, 500, 540, 590):
            R(d, 0, gy, AW, 1, (186, 160, 126))
        round_tree(img, 312, 470, 6, 1.3)
        R(d, 40, 500, 60, 4, (110, 70, 40))
        R(d, 40, 490, 60, 3, (130, 84, 50))
        R(d, 44, 504, 3, 12, (60, 60, 70))
        R(d, 93, 504, 3, 12, (60, 60, 70))
        R(d, 130, 420, 3, 96, (40, 40, 50))
        R(d, 124, 412, 15, 9, (40, 40, 50))
        R(d, 126, 414, 11, 6, (250, 230, 150))
        self.bg = img

    def draw(self, art, d, t):
        R(d, 30, 30, 24, 24, (255, 236, 120))
        i = self.idx(t)
        if i < 2:
            approach = min(1.0, t / 2.5)
            kx = 250 - approach * 60
            C(art, 280 - approach * 40, GY, MAMA, 'walk' if approach < 1 else 'stand', t, -1)
            C(art, 300 - approach * 40, GY, SIS, 'walk' if approach < 1 else 'stand', t, -1)
            C(art, kx, GY, KID, 'walk' if approach < 1 else 'hug', t, -1)
            C(art, 170, GY, PAPA, 'hug' if approach >= 1 else 'wave', t, 1)
        else:
            u = t - self.L[2].start
            C(art, 70, 500, KID, 'draw', t, 1, sh=False)
            R(d, 80, 486, 8, 10, (250, 250, 240))
            R(d, 80, 486, 8, 1, (200, 60, 60))
            for k, (bx, P, pf) in enumerate(((230, dict(KID, shirt=(40, 160, 70), hair=(120, 70, 30)), 1),
                                              (300, dict(KID, shirt=(220, 180, 40), hair=(30, 30, 30)), -1))):
                C(art, bx, GY - 30, P, 'walk' if int(u * 2 + k) % 2 else 'stand', t, pf)
            ph = (u * 0.8) % 2
            p = ph if ph < 1 else 2 - ph
            R(d, 238 + p * 52, GY - 36 - math.sin(p * math.pi) * 24, 5, 5, WHITE)

    def ui(self, u, d, t):
        banner(d, "TOMELLOSO - ESPAÑA")
        level(d, "NIVEL 8")
        if self.idx(t) == 2:
            u_ = t - self.L[2].start
            bubble(d, 20, 121, 90, 50)
            icons = [["..#..", ".###.", "#####", ".###.", "..#.."],
                     ["#...#", ".###.", ".#.#.", ".###.", "#...#"],
                     [".##..", "####.", ".####", "..##.", "..#.."]]
            cols = [GOLD, (220, 60, 60), (60, 160, 220)]
            for k in range(min(3, int(u_ / 1.0) + 1)):
                for ry, row in enumerate(icons[k]):
                    for rx, ch in enumerate(row):
                        if ch == '#':
                            R(d, 28 + k * 27 + rx * 4, 131 + ry * 4 + (k % 2) * 6, 4, 4, cols[k])


# ================================================================ 6. KICKBOXING 8.5
def tatami(arr, y0, c1=(190, 50, 50), c2=(40, 80, 170), seed=1):
    h, w = arr.shape[:2]
    img = Image.fromarray(arr)
    d = ImageDraw.Draw(img)
    rows = 6
    for r in range(rows):
        ya = y0 + int((r / rows) ** 1.4 * (h - y0))
        yb = y0 + int(((r + 1) / rows) ** 1.4 * (h - y0))
        n = 6
        for c in range(-2, n + 2):
            def X(col, y):
                f = (y - y0) / (h - y0)
                return w / 2 + (col - n / 2) * (w / n) * (0.7 + f * 0.9)
            col_ = c1 if (r + c) % 2 else c2
            d.polygon([(X(c, ya), ya), (X(c + 1, ya), ya), (X(c + 1, yb), yb), (X(c, yb), yb)], fill=col_)
            d.line([(X(c, ya), ya), (X(c + 1, ya), ya)], fill=shade(col_, 1.2))
            d.line([(X(c, ya), ya), (X(c, yb), yb)], fill=shade(col_, .7))
    return np.array(img)


def heavy_bag(d, px, py, ang, L=70, col=(180, 30, 40), chain=60):
    for i in range(chain):
        d.point((int(px + math.sin(ang) * i), py + i), fill=(170, 170, 180))
    for i in range(L):
        xx = px + math.sin(ang) * (chain + i)
        c = col if 5 < i < L - 5 else (50, 50, 56)
        R(d, int(xx) - 9, py + chain + i, 19, 1, c)
        R(d, int(xx) - 9, py + chain + i, 4, 1, shade(c, 1.3))
        R(d, int(xx) + 5, py + chain + i, 4, 1, shade(c, 0.7))
        if i in (18, L - 18):
            R(d, int(xx) - 9, py + chain + i, 19, 1, shade(c, .6))


class KickGym(Scene):
    music = 'garage'
    lines = [('NARRADOR', "Con 8 años y medio, papá lo apunta a kickboxing. Boxeo no había, así que..."),
             ('PAPÁ', "¡Guardia arriba! ¡Y a darlo todo!"),
             ('VAJTAN NIÑO', "¡Hai! ¡Pam! ¡Pam! ¡Pam!")]

    def setup(self):
        full = np.zeros((AH, AW, 3), np.uint8)
        texture_fill(full, 0, 0, AW, 440, [(150, 160, 176), (170, 180, 194), (186, 196, 208)], 3, 8, 4, .3)
        full[:120] = pal_map(np.clip(0.4 + (vnoise(AW, 120, 6, 2, 4) - .5) * .4, 0, 1), [(70, 70, 86), (90, 90, 106), (110, 110, 124)])
        full = tatami(full, 440)
        img = Image.fromarray(full)
        d = ImageDraw.Draw(img)
        R(d, 0, 112, AW, 10, (60, 60, 74))
        for bx in range(10, AW, 70):
            R(d, bx, 0, 10, 112, (54, 54, 68))
        # espejo
        R(d, 10, 250, 150, 170, (120, 120, 130))
        R(d, 13, 253, 144, 164, (190, 214, 226))
        for k in range(0, 160, 24):
            d.line([(20 + k, 410), (60 + k, 262)], fill=(214, 232, 240))
        # ventana
        R(d, 200, 150, 120, 70, (80, 80, 90))
        R(d, 204, 154, 112, 62, (170, 214, 240))
        R(d, 258, 154, 3, 62, (80, 80, 90))
        R(d, 186, 250, 60, 80, (240, 230, 200))
        R(d, 190, 254, 52, 26, (200, 30, 40))
        text(d, 196, 262, "KICK", WHITE)
        text(d, 192, 286, "BOXING", BLK)
        text(d, 196, 306, "CLUB", (200, 30, 40))
        R(d, 260, 250, 90, 4, (120, 80, 50))
        for k in range(5):
            R(d, 268 + k * 17, 234, 8, 16, GOLD)
            R(d, 270 + k * 17, 230, 4, 4, GOLD)
            R(d, 266 + k * 17, 248, 12, 2, (120, 80, 40))
        R(d, 0, 432, AW, 8, (80, 80, 90))
        arr = np.array(img)
        m = Image.new('L', (AW, AH), 0)
        ImageDraw.Draw(m).polygon([(204, 154), (316, 154), (330, 600), (120, 600)], fill=255)
        mk = (np.array(m) > 0) & (bay(AH, AW) > 0.35)
        arr[mk] = np.clip(arr[mk].astype(np.int32) + 24, 0, 255).astype(np.uint8)
        self.bg = Image.fromarray(arr)

    def after_schedule(self):
        s = self.L[2].start + 0.5
        self.hits = []
        while s < self.dur - 0.5:
            self.hits.append(s)
            s += 0.65
        self.sfx = [(h + 0.08, 'hit') for h in self.hits]

    def draw(self, art, d, t):
        ang, last = 0.03 * math.sin(t * 2), None
        for h in self.hits:
            if h <= t:
                ang += 0.35 * math.exp(-(t - h) * 1.5) * math.sin((t - h) * 7)
                last = h
        heavy_bag(d, 90, 122, 0.02 * math.sin(t * 1.3 + 1), 80, (40, 40, 50), 150)
        heavy_bag(d, 250, 122, ang, 80, (180, 30, 40), 260)
        pose = 'guard' if t > self.L[1].start else 'stand'
        if last is not None and t - last < 0.25:
            pose = 'kick' if self.hits.index(last) % 2 == 0 else 'punch'
        C(art, 225, GY, KID_KICK, pose, t, 1)
        C(art, 150, GY, PAPA, 'cross' if t < self.L[1].start else 'guard', t, 1)

    def ui(self, u, d, t):
        banner(d, "CLUB DE KICKBOXING")
        level(d, "NIVEL 8.5")
        last = None
        for h in getattr(self, 'hits', []):
            if h <= t:
                last = h
        if last is not None and t - last < 0.15:
            text(d, 170, 131, "POW!", GOLD, 2, BLK)


# ================================================================ 7. PARKOUR 12
def roofs_draw(d, cam, gaps, roof_fn, colw=(246, 240, 228), cols=(210, 200, 196), tile=(200, 96, 50), night=False):
    edges = [-10000] + gaps
    for b in range(len(edges) - 1):
        x0 = edges[b] + (14 if b > 0 else 0) - cam
        x1 = edges[b + 1] - 14 - cam
        if x1 < -5 or x0 > AW + 5:
            continue
        ry = roof_fn(b)
        wc = colw if b % 3 else (236, 220, 190)
        R(d, x0, ry, x1 - x0, AH - ry, wc)
        R(d, x1 - 5, ry, 5, AH - ry, shade(wc, .8))
        R(d, x0, ry - 4, x1 - x0 + 2, 5, tile)
        for rx in range(int(x0), int(x1), 3):
            R(d, rx, ry - 4, 1, 5, shade(tile, .75))
        R(d, x0, ry + 1, x1 - x0, 1, shade(tile, .5))
        for wy in range(ry + 12, AH, 22):
            for wx in range(int(x0) + 8, int(x1) - 12, 18):
                R(d, wx - 1, wy - 1, 9, 12, shade(wc, .85))
                R(d, wx, wy, 7, 10, (255, 210, 120) if (wx + wy + b) % 5 == 0 and night else (60, 90, 130))
                for bb in range(3):
                    R(d, wx + 1 + bb * 2, wy, 1, 10, (60, 60, 70))
        if b % 2 == 0:
            R(d, x0 + 12, ry - 22, 16, 14, (150, 150, 160))
            R(d, x0 + 12, ry - 22, 16, 2, (190, 190, 200))
            R(d, x0 + 16, ry - 8, 2, 4, (100, 100, 110))
        else:
            R(d, x0 + 20, ry - 18, 2, 14, (60, 60, 70))
            R(d, x0 + 14, ry - 18, 14, 1, (60, 60, 70))
            R(d, x0 + 16, ry - 14, 10, 1, (60, 60, 70))


class Parkour12(Scene):
    music = 'parkour'
    lines = [('NARRADOR', "A los 12 descubre el parkour. Piripi, piripa... ¡pa, pam, pam, pim!"),
             ('VAJTAN TEEN', "¡Esto es lo mío!")]
    min_dur = 7.5
    V, P, J, X = 80.0, 1.4, 0.6, 120
    L_ = TEEN12

    def setup(self):
        s = sky([(60, 36, 100), (190, 76, 110), (250, 146, 92), (255, 206, 130)], 460, AW)
        a = np.zeros((AH, AW, 3), np.uint8)
        a[:460] = s
        a[460:] = s[-1]
        img = Image.fromarray(a)
        d = ImageDraw.Draw(img)
        R(d, 200, 300, 50, 50, (255, 226, 140))
        R(d, 194, 308, 62, 34, (255, 226, 140))
        for i, (x, y, w, h) in enumerate([(0, 50, 160, 50), (180, 110, 170, 54), (40, 200, 130, 40)]):
            paste(img, cloud_sprite(w, h, 110 + i, CLOUD_WARM), x, y)
        rnd = random.Random(5)
        for layer, (base, col) in enumerate([(400, (150, 70, 110)), (426, (112, 46, 90))]):
            x = -10
            while x < AW:
                w, h = rnd.randint(16, 34), rnd.randint(20, 60 - layer * 16)
                R(d, x, base - h, w, h + 200, col)
                if rnd.random() < .15:
                    chimney(d, x + w // 2, base - h - 60, 60, 8, 5)
                x += w + 1
        self.bg = img
        self.jumps = [0.9 + k * self.P for k in range(30)]
        self.gaps = [self.X + self.V * (tk + self.J / 2) for tk in self.jumps]

    def after_schedule(self):
        self.sfx = [(tk, 'jump') for tk in self.jumps if tk < self.dur - 0.3]

    def roof(self, b):
        return 470 + ((b * 7) % 5 - 2) * 6

    def runner(self, t):
        b = 0
        for k, tk in enumerate(self.jumps):
            if tk <= t < tk + self.J:
                u = (t - tk) / self.J
                return self.roof(k) + (self.roof(k + 1) - self.roof(k)) * u - math.sin(u * math.pi) * 40, u, k
            if tk + self.J <= t:
                b = k + 1
        return self.roof(b), None, b

    def draw(self, art, d, t):
        roofs_draw(d, self.V * t, self.gaps, self.roof)
        y, u, k = self.runner(t)
        if u is None:
            draw_char(art, self.X, y - 4, self.L_, 'run', t, 1)
        elif k % 2 == 1:
            draw_char(art, self.X, y - 4, self.L_, 'tuck', t, 1, ang=u * 2 * math.pi)
        else:
            draw_char(art, self.X, y - 4, self.L_, 'jump', t, 1)

    def ui(self, u, d, t):
        banner(d, "TOMELLOSO - TEJADOS")
        level(d, "NIVEL 12")
        if t < 2.2 and int(t * 6) % 2 == 0:
            text_c(d, UW // 2, 60, "¡PARKOUR DESBLOQUEADO!", GOLD, 1, BLK)


# ================================================================ 8. ACCIDENTE 16
class Accident(Scene):
    music = 'accident'
    lines = [('NARRADOR', "Con 16 años, a punto de cumplir 17, entrena un mortal en un gimnasio..."),
             ('NARRADOR', "Cae de cabeza y se rompe el cuello. Menos mal que fue sobre un tatami.")]
    delays = {1: 2.4}

    def setup(self):
        full = np.zeros((AH, AW, 3), np.uint8)
        texture_fill(full, 0, 0, AW, 450, [(170, 150, 120), (190, 170, 140), (206, 188, 158)], 7, 10, 3, .3)
        full = tatami(full, 450, (40, 110, 190), (30, 90, 160))
        img = Image.fromarray(full)
        d = ImageDraw.Draw(img)
        for bx in range(20, 170, 12):
            R(d, bx, 250, 4, 200, (180, 130, 80))
            R(d, bx, 250, 1, 200, (210, 170, 110))
        for by in range(260, 450, 14):
            R(d, 20, by, 150, 3, (160, 110, 70))
        for rx in (220, 260):
            R(d, rx, 0, 3, 330, (190, 170, 130))
            for k in range(0, 330, 6):
                R(d, rx, k, 3, 1, (150, 130, 100))
        R(d, 0, 0, AW, 60, (90, 90, 100))
        for lx in (60, 180, 300):
            R(d, lx - 20, 56, 40, 6, (250, 250, 230))
        R(d, 280, 380, 70, 70, (60, 140, 90))
        R(d, 280, 380, 70, 4, (90, 180, 120))
        text(d, 290, 404, "GYM", WHITE)
        self.bg = img

    def after_schedule(self):
        self.t_run = self.L[0].end + 0.3
        self.t_jump = self.t_run + 0.9
        self.t_imp = self.t_jump + 0.7
        self.sfx = [(self.t_jump, 'jump'), (self.t_imp, 'pah')]

    def shake(self, t):
        if 0 <= t - self.t_imp < 0.5:
            k = int((0.5 - (t - self.t_imp)) * 10)
            r = random.Random(int(t * 50))
            return r.randint(-k, k), r.randint(-k, k)
        return 0, 0

    def flash(self, t):
        return 1.0 if 0 <= t - self.t_imp < 0.1 else 0.0

    def draw(self, art, d, t):
        L = TEEN16
        if t < self.t_run:
            C(art, 70, GY, L, 'stand', t, 1)
        elif t < self.t_jump:
            x = 70 + (t - self.t_run) / 0.9 * 100
            C(art, x, GY, L, 'run', t, 1)
        elif t < self.t_imp:
            u = (t - self.t_jump) / 0.7
            x = 170 + u * 50
            y = GY - math.sin(u * math.pi * 0.9) * 55
            draw_char(art, x, y, L, 'tuck', t, 1, ang=u * math.pi * 1.0)
        elif t < self.t_imp + 0.25:
            draw_char(art, 222, GY - 6, L, 'tuck', t, 1, ang=math.pi)
        else:
            C(art, 250, GY, L, 'lie', t, 1)
            for k in range(3):
                a = t * 5 + k * 2.1
                sx, sy = 204 + math.cos(a) * 12, GY - 18 + math.sin(a) * 4
                R(d, sx, sy, 2, 2, GOLD)
                d.point((sx - 1, sy + 1), fill=GOLD)
                d.point((sx + 2, sy), fill=GOLD)

    def ui(self, u, d, t):
        banner(d, "GIMNASIO")
        level(d, "NIVEL 16")
        if self.t_imp <= t < self.t_imp + 1.6:
            sc = 6 if t - self.t_imp < 0.15 else 5
            big(d, "¡PAH!", 150, (255, 60, 40), sc, BLK)


# ================================================================ 9. APARATO (3 MESES)
class Halo(Scene):
    music = 'hospital'
    lines = [('NARRADOR', "Tres meses con un aparato. Eso le marca un antes y un después..."),
             ('VAJTAN HALO', "Sobre todo en cómo veo la política mundial.")]
    min_dur = 7.4

    def setup(self):
        full = np.zeros((AH, AW, 3), np.uint8)
        Y, X = grid(AH, AW)
        stripes = ((X // 10) % 2).astype(np.float32) * 0.15 + 0.45 + (vnoise(AW, AH, 5, 5, 3) - .5) * .2
        full[:] = pal_map(np.clip(stripes, 0, 1), [(120, 140, 110), (140, 160, 126), (160, 178, 140)], .4)
        texture_fill(full, 0, 450, AW, 190, [(120, 80, 50), (140, 96, 60), (160, 114, 72)], 8, 12, 1, .3)
        img = Image.fromarray(full)
        d = ImageDraw.Draw(img)
        R(d, 20, 120, 110, 110, (90, 70, 50))
        R(d, 24, 124, 102, 102, (150, 200, 240))
        arr = np.array(img)
        foliage(arr, 70, 190, 90, 60, 5, LEAF_GREEN)
        img = Image.fromarray(arr)
        d = ImageDraw.Draw(img)
        R(d, 74, 124, 3, 102, (90, 70, 50))
        R(d, 24, 174, 102, 3, (90, 70, 50))
        # cama
        R(d, 10, 440, 150, 50, (230, 230, 236))
        R(d, 10, 440, 150, 6, (250, 250, 252))
        R(d, 10, 470, 150, 22, (60, 90, 160))
        R(d, 6, 400, 8, 110, (110, 76, 50))
        R(d, 156, 440, 8, 70, (110, 76, 50))
        R(d, 16, 430, 40, 16, (250, 250, 252))
        # mueble + tele
        R(d, 220, 440, 120, 70, (110, 76, 50))
        R(d, 220, 440, 120, 4, (140, 100, 66))
        R(d, 230, 460, 45, 40, (90, 60, 40))
        R(d, 285, 460, 45, 40, (90, 60, 40))
        R(d, 226, 360, 110, 78, (30, 30, 36))
        R(d, 270, 438, 20, 4, (30, 30, 36))
        # calendario y poster
        R(d, 250, 130, 70, 80, (250, 250, 244))
        R(d, 250, 130, 70, 16, (200, 40, 40))
        R(d, 150, 120, 60, 80, (40, 40, 60))
        R(d, 154, 124, 52, 72, (240, 150, 60))
        text(d, 156, 180, "JUMP", WHITE)
        self.bg = img
        self.world = ["..######.......###..",
                      ".#########...######.",
                      "..######....########",
                      "...###.......######.",
                      "....##.......##.##..",
                      ".....#........#....."]

    def draw(self, art, d, t):
        R(d, 230, 364, 102, 70, (20, 40, 90))
        for ry, row in enumerate(self.world):
            for rx, ch in enumerate(row):
                if ch == '#':
                    R(d, 236 + rx * 4.5, 374 + ry * 7, 4, 6, (60, 170, 90))
        for k, (px, py) in enumerate(((250, 380), (296, 388), (318, 396), (262, 404))):
            if int(t * 3 + k) % 2:
                R(d, px, py, 3, 3, (255, 60, 60))
        R(d, 230, 424, 102, 10, (200, 30, 40))
        msg = "NOTICIAS DEL MUNDO  -  GEOPOLITICA  -  CONFLICTOS  -  ECONOMIA  -  "
        off = int(t * 30)
        s = (msg * 3)[off // 6 % len(msg):][:17]
        text(d, 232, 424, s, WHITE)
        days = min(90, int(t / self.dur * 95) + 1)
        for k in range(min(days // 6, 15)):
            cx, cy = 256 + (k % 5) * 12, 152 + (k // 5) * 16
            d.line([(cx, cy), (cx + 7, cy + 7)], fill=(200, 40, 40))
            d.line([(cx + 7, cy), (cx, cy + 7)], fill=(200, 40, 40))
        C(art, 110, 446, TEEN16_HALO, 'sit_tv', t, 1, sh=False)

    def ui(self, u, d, t):
        banner(d, "CASA - RECUPERACION")
        level(d, "NIVEL 16")
        days = min(90, int(t / self.dur * 95) + 1)
        panel(d, 8, 44, 76, 14)
        text(d, 12, 45, "DIA %02d/90" % days, WHITE)


# ================================================================ 10. VUELTA AL PARKOUR
class Comeback8m(Parkour12):
    music = 'parkour'
    lines = [('NARRADOR', "Ocho meses después vuelve al parkour. Y salta mucho, mucho, mucho, muchísimo."),
             ('NARRADOR', "El kickboxing sigue ahí, pero en modo light.")]
    V, P, J = 95.0, 1.0, 0.55
    min_dur = 7.5
    L_ = TEEN16

    def setup(self):
        s = sky([(70, 150, 230), (130, 196, 244), (210, 234, 250)], 480, AW)
        a = np.zeros((AH, AW, 3), np.uint8)
        a[:480] = s
        a[480:] = s[-1]
        hills(a, 380, 30, 80, 91, [(70, 120, 80), (90, 146, 90), (120, 170, 100)], 60, .3, (170, 200, 230), .3)
        img = Image.fromarray(a)
        for i, (x, y, w, h) in enumerate([(0, 40, 160, 56), (190, 110, 150, 50)]):
            paste(img, cloud_sprite(w, h, 150 + i), x, y)
        for tx in (40, 150, 280):
            round_tree(img, tx, 420, tx, 1.2)
        self.bg = img
        self.jumps = [0.7 + k * self.P for k in range(40)]
        self.gaps = [self.X + self.V * (tk + self.J / 2) for tk in self.jumps]

    def roof(self, b):
        return 480 + ((b * 5) % 4) * 8

    def draw(self, art, d, t):
        cam = self.V * t
        edges = [-10000] + self.gaps
        for b in range(len(edges) - 1):
            x0 = edges[b] + 12 - cam if b > 0 else -10
            x1 = edges[b + 1] - 12 - cam
            if x1 < -5 or x0 > AW + 5:
                continue
            ry = self.roof(b)
            R(d, x0, ry, x1 - x0, AH - ry, (160, 158, 150))
            R(d, x0, ry, x1 - x0, 3, (206, 204, 196))
            R(d, x1 - 4, ry, 4, AH - ry, (120, 118, 112))
            for gx in range(int(x0) + 4, int(x1) - 4, 8):
                d.point((gx, ry + 10 + (gx * 7) % 20), fill=(140, 138, 130))
            if b % 3 == 1:
                R(d, x0 + 6, ry - 14, 2, 14, (80, 80, 90))
                R(d, x1 - 10, ry - 14, 2, 14, (80, 80, 90))
                R(d, x0 + 6, ry - 14, x1 - x0 - 14, 2, (120, 120, 130))
        R(d, 0, 560, AW, 80, (80, 140, 70))
        y, u, k = self.runner(t)
        if u is None:
            draw_char(art, self.X, y - 2, self.L_, 'run', t, 1)
        elif k % 3 == 2:
            draw_char(art, self.X, y - 2, self.L_, 'tuck', t, 1, ang=u * 2 * math.pi)
        else:
            draw_char(art, self.X, y - 2, self.L_, 'jump', t, 1)

    def ui(self, u, d, t):
        banner(d, "DE VUELTA")
        level(d, "NIVEL 17")
        n = int(max(0, t - 0.7) ** 2.2 * 40)
        panel(d, 8, 44, 100, 14)
        text(d, 12, 45, "SALTOS: %05d" % min(99999, n), GOLD)
        if self.idx(t) == 1:
            panel(d, 150, 44, 112, 26)
            text(d, 154, 45, "KICKBOXING", WHITE)
            R(d, 154, 58, 104, 8, (60, 60, 80))
            R(d, 154, 58, 26, 8, (120, 200, 255))
            text(d, 184, 57, "LIGHT", (120, 200, 255))


# ================================================================ 11. ARTE
class ArtSchool(Scene):
    music = 'art'
    lines = [('NARRADOR', "De los 17 a los 19 estudia artes. Pero su cabeza está en otra parte..."),
             ('VAJTAN TEEN', "Yo lo que quiero es hacer parkour."),
             ('NARRADOR', "Con 19 o 20 deja el kickboxing y va a tope con el parkour. Cae algún trabajito de diseño.")]

    def setup(self):
        full = np.zeros((AH, AW, 3), np.uint8)
        texture_fill(full, 0, 0, AW, 450, [(210, 200, 180), (224, 214, 196), (236, 228, 212)], 11, 6, 6, .25)
        texture_fill(full, 0, 450, AW, 190, [(150, 110, 70), (170, 128, 84), (186, 144, 98)], 12, 16, 1, .3)
        win = np.zeros((190, 300, 3), np.uint8)
        win[:] = sky([(90, 160, 230), (170, 210, 245)], 190, 300)
        wimg = Image.fromarray(win)
        wd = ImageDraw.Draw(wimg)
        rnd = random.Random(3)
        x = -5
        while x < 300:
            w, h = rnd.randint(24, 40), rnd.randint(30, 70)
            house(wd, x, 190 - h, w, h, sw=4)
            x += w + 6
        chimney(wd, 220, 60, 100, 9, 6)
        paste(wimg, cloud_sprite(90, 30, 170), 20, 20)
        img = Image.fromarray(full)
        d = ImageDraw.Draw(img)
        R(d, 26, 90, 308, 198, (120, 100, 80))
        img.paste(wimg, (30, 94))
        d = ImageDraw.Draw(img)
        for wx in (130, 230):
            R(d, wx, 94, 4, 190, (120, 100, 80))
        R(d, 30, 188, 300, 4, (120, 100, 80))
        R(d, 20, 288, 320, 8, (150, 130, 110))
        # caballetes
        for ex, col in ((50, (220, 90, 60)), (270, (60, 120, 200))):
            d.line([(ex, 360), (ex - 16, 470)], fill=(130, 90, 50), width=3)
            d.line([(ex + 30, 360), (ex + 46, 470)], fill=(130, 90, 50), width=3)
            R(d, ex - 6, 340, 42, 50, (250, 248, 240))
            R(d, ex, 346, 30, 38, col)
            R(d, ex + 6, 352, 14, 14, shade(col, 1.4))
            R(d, ex - 10, 390, 50, 4, (130, 90, 50))
        # busto de yeso
        R(d, 330, 330, 20, 120, (200, 190, 180))
        d.ellipse([326, 300, 354, 334], fill=(236, 232, 226))
        d.ellipse([340, 306, 354, 332], fill=(206, 200, 194))
        self.bg = img

    def draw(self, art, d, t):
        R(d, 176, 380, 44, 56, (250, 248, 240))
        prog = min(1, t / 6)
        R(d, 180, 384, int(36 * prog), 22, (240, 180, 60))
        R(d, 180, 408, int(36 * prog), 24, (80, 160, 120))
        d.line([(186, 360), (170, 470)], fill=(130, 90, 50), width=3)
        d.line([(212, 360), (228, 470)], fill=(130, 90, 50), width=3)
        C(art, 150, GY, TEEN16, 'draw', t, 1)
        # silueta saltando por la ventana
        rx = (t * 50) % 360 - 30
        if 30 < rx < 330:
            ry = 200 + abs(math.sin(t * 4)) * -20
            R(d, rx, ry, 3, 6, (40, 40, 60))
            R(d, rx, ry - 3, 3, 3, (40, 40, 60))

    def ui(self, u, d, t):
        banner(d, "ESCUELA DE ARTE")
        level(d, "NIVEL 17-19")
        i = self.idx(t)
        if i >= 1:
            bubble(d, 128, 132, 70, 50)
            x = 140 + (t * 30) % 46
            y = 154 - abs(math.sin(t * 5)) * 12
            R(d, x, y, 3, 6, (40, 40, 60))
            R(d, x, y - 3, 3, 3, (234, 180, 142))
            R(d, 132, 166, 62, 2, (120, 120, 130))
        if i == 2:
            panel(d, 8, 44, 118, 40)
            text(d, 12, 45, "KICKBOXING", WHITE)
            text(d, 84, 45, "OFF", (255, 80, 80))
            text(d, 12, 57, "PARKOUR  100%", (120, 255, 160))
            text(d, 12, 69, "DISEÑO   +1", GOLD)


# ================================================================ 12. VUELTA AL KICK + PANDEMIA
class Pandemic(Scene):
    music = 'covid'
    lines = [('NARRADOR', "Parkour hasta los 22. A los 23 vuelve al kickboxing: fuerte y con ganas de competir."),
             ('NARRADOR', "Pero llega la pandemia... y todo se para.")]

    def setup(self):
        full = sky([(8, 8, 26), (24, 26, 60), (50, 46, 80)], AH, AW)
        img = Image.fromarray(full)
        paste(img, cloud_sprite(180, 50, 130, CLOUD_NIGHT), 20, 40)
        paste(img, cloud_sprite(160, 46, 131, CLOUD_NIGHT), 180, 90)
        d = ImageDraw.Draw(img)
        rnd = random.Random(4)
        x = -4
        while x < AW:
            w, h = rnd.randint(30, 56), rnd.randint(160, 300)
            R(d, x, 480 - h, w, h, (26, 28, 46))
            R(d, x, 480 - h, 2, h, (40, 42, 66))
            for wy in range(480 - h + 6, 470, 10):
                for wx in range(x + 4, x + w - 4, 8):
                    if rnd.random() < 0.25:
                        R(d, wx, wy, 4, 5, (240, 200, 110))
            x += w + 3
        arr = np.array(img)
        texture_fill(arr, 0, 480, AW, 160, [(36, 36, 46), (46, 46, 58), (56, 56, 70)], 13, 6, 2, .4)
        img = Image.fromarray(arr)
        d = ImageDraw.Draw(img)
        R(d, 170, 330, 180, 150, (90, 90, 100))
        R(d, 176, 350, 168, 130, (130, 130, 140))
        R(d, 180, 334, 160, 14, (30, 30, 30))
        text(d, 214, 336, "GIMNASIO", (255, 80, 80))
        R(d, 50, 300, 4, 182, (60, 60, 70))
        R(d, 40, 296, 22, 5, (60, 60, 70))
        self.bg = img

    def draw(self, art, d, t):
        i = self.idx(t)
        a = np.array(art)
        glow(a, 51, 302, 90, (120, 120, 80), .5)
        if i == 0:
            glow(a, 260, 420, 110, (255, 210, 130), .6)
        art.paste(Image.fromarray(a))
        d = ImageDraw.Draw(art)
        R(d, 40, 300, 22, 2, (255, 240, 160))
        if i == 0:
            R(d, 176, 350, 168, 40, (130, 130, 140))
            for yy in range(352, 390, 4):
                R(d, 176, yy, 168, 1, (104, 104, 114))
            R(d, 176, 390, 168, 90, (240, 200, 130))
            heavy_bag(d, 300, 390, 0.05 * math.sin(t * 3), 50, (180, 30, 40), 6)
        else:
            for yy in range(352, 480, 4):
                R(d, 176, yy, 168, 1, (104, 104, 114))
            R(d, 210, 400, 100, 22, WHITE)
            R(d, 211, 401, 98, 20, (220, 30, 30))
            text(d, 239, 406, "CERRADO", WHITE)
        rainfall(d, t, 100 if i == 0 else 200)
        cyc = t % 1.2
        pose = 'guard'
        if cyc < 0.2:
            pose = 'punch'
        elif 0.5 < cyc < 0.72:
            pose = 'kick' if int(t / 1.2) % 2 else 'punch2'
        C(art, 100, GY, YOUNG_TRAIN, pose, t, 1)

    def ui(self, u, d, t):
        banner(d, "NIVEL 23" if self.idx(t) == 0 else "2020 - PANDEMIA")
        level(d, "NIVEL 23")


# ================================================================ 13. NEGOCIO DE DISEÑO
class Business(Scene):
    music = 'business'
    lines = [('NARRADOR', "Monta un negocio de diseño... y acaba muy, muy quemado."),
             ('VAJTAN', "Se acabó. Lo dejo.")]

    def setup(self):
        full = np.zeros((AH, AW, 3), np.uint8)
        texture_fill(full, 0, 0, AW, 460, [(44, 50, 80), (54, 60, 94), (64, 72, 108)], 14, 8, 4, .3)
        texture_fill(full, 0, 460, AW, 180, [(60, 50, 50), (74, 62, 60), (86, 72, 70)], 15, 10, 2, .3)
        img = Image.fromarray(full)
        d = ImageDraw.Draw(img)
        R(d, 30, 60, 140, 150, (30, 26, 36))
        R(d, 34, 64, 132, 142, (12, 16, 40))
        rnd = random.Random(9)
        for k in range(60):
            R(d, 34 + rnd.randint(0, 128), 120 + rnd.randint(0, 84), 2, 2, (250, 210, 110))
        R(d, 98, 64, 4, 142, (30, 26, 36))
        R(d, 250, 190, 60, 60, (240, 240, 230))
        d.ellipse([254, 194, 306, 246], fill=(250, 250, 244))
        R(d, 0, 440, AW, 10, (120, 84, 56))
        R(d, 0, 440, AW, 2, (160, 120, 80))
        R(d, 10, 450, 6, 90, (100, 70, 46))
        R(d, 344, 450, 6, 90, (100, 70, 46))
        self.bg = img

    def draw(self, art, d, t):
        a = t * 8
        d.line([(280, 220), (280 + math.cos(a) * 20, 220 + math.sin(a) * 20)], fill=BLK, width=2)
        d.line([(280, 220), (280 + math.cos(a / 12) * 13, 220 + math.sin(a / 12) * 13)], fill=BLK, width=2)
        i = self.idx(t)
        on = i == 0 or t < self.L[1].start + 0.8
        for k, mx in enumerate((150, 210, 270)):
            R(d, mx, 370, 56, 44, (30, 30, 36))
            R(d, mx + 3, 373, 50, 36, (240, 240, 244) if on else (10, 10, 14))
            if on:
                R(d, mx + 6, 376, 20, 14, [(220, 60, 60), (60, 160, 220), (240, 180, 40)][k])
                R(d, mx + 30, 378, 18, 2, (120, 120, 130))
                R(d, mx + 30, 383, 14, 2, (120, 120, 130))
                R(d, mx + 6, 396, 40, 8, [(80, 200, 120), (200, 100, 200), (60, 60, 200)][k])
            R(d, mx + 24, 414, 8, 26, (30, 30, 36))
        cups = min(9, int(t * 1.3) + 1)
        for k in range(cups):
            cx = 40 + (k % 5) * 14
            cy = 426 - (k // 5) * 12
            R(d, cx, cy, 9, 12, WHITE)
            R(d, cx + 9, cy + 3, 2, 5, WHITE)
            R(d, cx + 1, cy + 1, 7, 2, (110, 70, 40))
        for k in range(6):
            R(d, 300, 428 - k * 3, 40, 3, (240, 240, 230) if k % 2 else (220, 220, 210))
        if i == 0 or t < self.L[1].start + 0.6:
            C(art, 120, GY, YOUNG, 'type', t, 1, sh=False)
            R(d, 100, 490, 36, 4, (90, 60, 40))
            R(d, 104, 494, 4, 22, (60, 60, 70))
            heat = min(1, t / max(0.1, self.L[0].end))
            rnd = random.Random(int(t * 12))
            for k in range(int(24 * heat)):
                fx = 122 + rnd.randint(-8, 8)
                fy = GY - 56 - rnd.randint(0, int(16 * heat) + 1)
                R(d, fx, fy, 2, 3, rnd.choice([(255, 80, 20), (255, 180, 40), (255, 240, 120)]))
        else:
            C(art, 160, GY, YOUNG, 'walk', t, -1)
            rnd = random.Random(int(t * 5))
            for k in range(3):
                R(d, 160 + rnd.randint(-4, 4), GY - 62 - k * 4, 2, 2, (150, 150, 160))

    def ui(self, u, d, t):
        banner(d, "NEGOCIO DE DISEÑO")
        level(d, "NIVEL 24")
        panel(d, 8, 44, 104, 14)
        text(d, 12, 45, "ESTRES", WHITE)
        v = min(1, t / max(0.1, self.L[0].end + .5))
        R(d, 52, 47, 56, 8, (60, 60, 80))
        R(d, 52, 47, int(56 * v), 8, (230, 40, 40))


# ================================================================ 14. PORTERO
class Doorman(Scene):
    music = 'club'
    lines = [('NARRADOR', "Se centra en competir y trabaja de portero de noche casi dos años."),
             ('VAJTAN', "Tú sí. Tú también. Tú... hoy no.")]

    def setup(self):
        full = sky([(6, 6, 20), (20, 16, 44)], AH, AW)
        full[160:470] = pal_map(np.clip(blocks_tex(310, AW, 7, (14, 15), (6, 7)) * .8 + .1, 0, 1),
                                [(50, 24, 30), (80, 36, 40), (104, 50, 50), (130, 70, 62)], .3)
        texture_fill(full, 0, 470, AW, 170, [(30, 30, 38), (40, 40, 50), (50, 50, 62)], 16, 6, 2, .4)
        img = Image.fromarray(full)
        d = ImageDraw.Draw(img)
        R(d, 290, 40, 20, 20, (240, 240, 220))
        R(d, 296, 40, 14, 14, (20, 16, 44))
        R(d, 150, 330, 80, 140, (20, 16, 20))
        R(d, 154, 334, 72, 136, (60, 30, 50))
        R(d, 188, 334, 4, 136, (30, 16, 26))
        self.bg = img

    def draw(self, art, d, t):
        a = np.array(art)
        fl = 0.55 if int(t * 7) % 9 else 0.25
        glow(a, 190, 290, 120, (255, 60, 180), fl)
        glow(a, 190, 470, 90, (80, 120, 255), .3)
        art.paste(Image.fromarray(a))
        d = ImageDraw.Draw(art)
        R(d, 140, 270, 100, 36, (30, 10, 30))
        col = (255, 90, 200) if fl > .3 else (140, 50, 110)
        text(d, 160, 276, "DISCO", col, 2)
        for px in (90, 130):
            R(d, px, 480, 4, 36, (200, 180, 60))
            R(d, px - 2, 478, 8, 4, GOLD)
        d.line([(92, 488), (132, 488)], fill=(170, 20, 40), width=2)
        C(art, 238, GY, DOORMAN, 'cross', t, -1)
        i = self.idx(t)
        people = [dict(KID, s=0.95, kid=False, shirt=(200, 60, 120), hair=(220, 190, 90), style='long', dress=(30, 30, 30)),
                  dict(KID, s=1.0, kid=False, shirt=(60, 160, 200), hair=(40, 30, 20), style='short'),
                  dict(KID, s=0.98, kid=False, shirt=(250, 140, 40), hair=(120, 60, 30), style='short')]
        if i == 0:
            for k, P in enumerate(people):
                C(art, 60 - k * 26, GY, P, 'stand', t + k, 1)
        else:
            u = t - self.L[1].start
            for k, P in enumerate(people):
                start = k * 0.9
                if k < 2:
                    x = 60 - k * 26 + max(0, u - start) * 70
                    if x < 190:
                        C(art, x, GY, P, 'walk' if u > start else 'stand', t + k, 1)
                else:
                    if u < 2.2:
                        C(art, 60 - k * 26 + min(u, 1.6) * 60, GY, P, 'walk' if u < 1.6 else 'stand', t, 1)
                    else:
                        C(art, 100 - (u - 2.2) * 50, GY, P, 'walk', t, -1)

    def ui(self, u, d, t):
        banner(d, "LA NOCHE")
        level(d, "NIVEL 24-26")


# ================================================================ 15. CALVO
class Bald(Scene):
    music = 'bald'
    lines = [('NARRADOR', "Dato importante: a los 26 y medio... se queda calvo."),
             ('VAJTAN ADULTO', "Bueno. Así pesa menos la cabeza para las patadas.")]
    min_dur = 8.0

    def setup(self):
        full = np.zeros((AH, AW, 3), np.uint8)
        Y, X = grid(AH, AW)
        tiles = ((X % 20 < 1) | (Y % 20 < 1)).astype(np.float32)
        base = 0.7 - tiles * 0.5 + (vnoise(AW, AH, 20, 20, 5) - .5) * .15
        full[:] = pal_map(np.clip(base, 0, 1), [(120, 150, 170), (170, 200, 214), (210, 230, 238), (236, 244, 248)], .3)
        img = Image.fromarray(full)
        d = ImageDraw.Draw(img)
        R(d, 40, 60, 280, 380, (180, 170, 150))
        R(d, 48, 68, 264, 364, (200, 220, 230))
        for k in range(0, 300, 40):
            d.line([(60 + k, 420), (120 + k, 80)], fill=(216, 234, 242), width=6)
        arr = np.array(img)
        cx, cy = 180, 280
        Yf, Xf = grid(AH, AW)
        # cuello y hombros
        sh = (Yf > 350) & (np.abs(Xf - cx) < 110 - np.maximum(0, 420 - Yf) * 0.9) & (Yf < 440)
        arr[sh] = (30, 30, 36)
        nk = (Yf > 330) & (Yf < 380) & (np.abs(Xf - cx) < 26)
        arr[nk] = (200, 150, 116)
        face = ((Xf - cx) / 58) ** 2 + ((Yf - cy) / 74) ** 2 < 1
        lit = np.clip(0.75 - (Xf - cx + 20) / 140 + (vnoise(AW, AH, 6, 6, 8) - .5) * .1, 0, 1)
        skin = pal_map(lit, [(170, 118, 90), (200, 146, 110), (226, 172, 134), (242, 196, 160)], .8)
        arr[face] = skin[face]
        for ex in (-60, 60):
            ear = ((Xf - cx - ex) / 9) ** 2 + ((Yf - cy - 4) / 16) ** 2 < 1
            arr[ear & ~face] = (200, 146, 110)
        beard = face & (Yf > cy + 18) & (vnoise(AW, AH, 1, 1, 9) > 0.25)
        arr[beard] = (86, 60, 46)
        beard2 = face & (Yf > cy + 10) & (Yf <= cy + 18) & (np.abs(Xf - cx) > 34) & (vnoise(AW, AH, 1, 1, 10) > 0.4)
        arr[beard2] = (96, 68, 52)
        img = Image.fromarray(arr)
        d = ImageDraw.Draw(img)
        for ex in (-24, 24):
            R(d, cx + ex - 10, cy - 6, 20, 9, WHITE)
            R(d, cx + ex - 4, cy - 6, 9, 9, (90, 60, 40))
            R(d, cx + ex - 2, cy - 4, 5, 5, BLK)
            R(d, cx + ex - 2, cy - 5, 2, 2, WHITE)
            R(d, cx + ex - 12, cy - 16, 24, 4, (50, 36, 30))
        d.polygon([(cx - 4, cy), (cx + 4, cy), (cx + 8, cy + 22), (cx - 6, cy + 22)], fill=(214, 160, 124))
        R(d, cx + 2, cy + 4, 4, 18, (186, 132, 100))
        R(d, cx - 8, cy + 22, 16, 3, (170, 118, 90))
        R(d, cx - 14, cy + 34, 28, 4, (130, 60, 60))
        R(d, cx - 12, cy + 34, 24, 1, (170, 90, 80))
        self.bald_img = img
        # pelo
        hair = face & (Yf < cy - 30 - np.abs(Xf - cx) * 0.05) | (face & (np.abs(Xf - cx) > 50) & (Yf < cy - 5))
        hair |= (((Xf - cx) / 62) ** 2 + ((Yf - cy + 6) / 80) ** 2 < 1) & (Yf < cy - 40)
        ys, xs = np.nonzero(hair)
        rng = np.random.default_rng(3)
        self.hy, self.hx = ys.astype(np.float32), xs.astype(np.float32)
        tone_ = vnoise(AW, AH, 1, 3, 4)[ys, xs]
        pal = np.array([(36, 26, 22), (52, 38, 30), (70, 50, 40)], np.uint8)
        self.hc = pal[np.clip((tone_ * 3).astype(int), 0, 2)]
        self.ft = rng.uniform(0, 1, len(ys))
        self.vx = rng.uniform(-8, 8, len(ys))
        self.bg = img

    def after_schedule(self):
        self.t0h = 1.2
        self.t1h = self.L[0].end + 0.6
        self.ft_abs = self.t0h + self.ft * (self.t1h - self.t0h)
        self.sfx = [(self.t0h + k * 0.25, 'hair') for k in range(int((self.t1h - self.t0h) / 0.25))]

    def render(self, t):
        art, ui = super().render(t)
        a = np.array(art)
        dt = t - self.ft_abs
        still = dt < 0
        a[self.hy[still].astype(int), self.hx[still].astype(int)] = self.hc[still]
        fall = (dt >= 0) & (dt < 3)
        yy = (self.hy[fall] + 0.5 * 400 * dt[fall] ** 2).astype(int)
        xx = (self.hx[fall] + self.vx[fall] * dt[fall] * 6).astype(int)
        ok = (yy < AH) & (xx >= 0) & (xx < AW)
        a[yy[ok], xx[ok]] = self.hc[fall][ok]
        if t > self.t1h:
            for (px, py) in ((160, 214), (162, 212), (164, 214), (162, 216), (162, 210), (162, 218), (158, 214), (166, 214)):
                a[py, px] = (255, 255, 240)
        return Image.fromarray(a), ui

    def ui(self, u, d, t):
        banner(d, "EL ESPEJO")
        level(d, "NIVEL 26.5")
        dt = t - self.ft_abs
        pct = int(100 * np.mean(dt < 0))
        panel(d, 8, 44, 104, 14)
        text(d, 12, 45, "PELO: %3d%%" % pct, WHITE if pct > 20 else (255, 80, 80))
        if t > self.t1h + 0.2:
            text_c(d, UW // 2, 70, "¡CALVO!  +10 CARISMA", GOLD, 1, BLK)


# ================================================================ 16. MARKETING + REFUGIO
def dog(d, x, y, col, t, f=1, s=1.0, sit=False):
    dk = shade(col, .7)
    wag = math.sin(t * 14) * 3
    R(d, x - 8 * s, y - 11 * s, 16 * s, 7 * s, col)
    R(d, x - 8 * s, y - 6 * s, 16 * s, 2 * s, dk)
    step = math.sin(t * 10)
    for k, lx in enumerate((-7, -4, 3, 6)):
        off = step * 2 if k % 2 else -step * 2
        R(d, x + f * lx * s + off, y - 5 * s, 2 * s, 5 * s, dk if k in (1, 2) else col)
    hx = x + f * 8 * s
    R(d, hx - 3 * s, y - 16 * s, 7 * s, 6 * s, col)
    R(d, hx + f * 3 * s - (0 if f > 0 else 2), y - 13 * s, 3 * s, 3 * s, shade(col, 1.15))
    d.point((hx + f * 5 * s, y - 13 * s), fill=BLK)
    d.point((hx + f * 1 * s, y - 14 * s), fill=BLK)
    R(d, hx - f * 2 * s - 1, y - 17 * s, 2 * s, 4 * s, dk)
    tx = x - f * 8 * s
    d.line([(tx, y - 10 * s), (tx - f * 4 * s, y - 14 * s - wag)], fill=col, width=max(1, int(2 * s)))


def cat(d, x, y, col, t):
    R(d, x - 5, y - 7, 10, 7, col)
    R(d, x + 3, y - 12, 6, 6, col)
    d.point((x + 4, y - 13), fill=col)
    d.point((x + 8, y - 13), fill=col)
    d.point((x + 7, y - 10), fill=(120, 200, 80))
    d.line([(x - 5, y - 4), (x - 9, y - 10 + math.sin(t * 3) * 2)], fill=col)


class Refuge(Scene):
    music = 'refuge'
    lines = [('NARRADOR', "Vuelve al marketing. Hoy se dedica al marketing digital de captación de clientes."),
             ('NARRADOR', "Desde los 27 ayuda a Juan Manuel, investigador, que tiene un refugio de animales. Un tío tremendo."),
             ('JUAN MANUEL', "¡Vajtan! ¡Que los perros también quieren salir en internet!"),
             ('NARRADOR', "Y monta sistemas online para refugios de animales. En eso es un auténtico crack.")]

    def setup(self):
        full = sky([(70, 150, 230), (140, 196, 244), (214, 234, 250)], AH, AW)
        hills(full, 330, 20, 90, 71, [(170, 150, 110), (196, 176, 130), (216, 196, 150)], 40, .2, (210, 220, 236), .4)
        l2 = hills(full, 370, 20, 70, 72, [(150, 130, 70), (176, 156, 90), (200, 180, 110)], 60, .3)
        texture_fill(full, 0, 430, AW, 210, [(150, 130, 70), (176, 158, 96), (196, 178, 120), (214, 198, 140)], 73, 3, 2, .4)
        img = Image.fromarray(full)
        d = ImageDraw.Draw(img)
        for i, (x, y, w, h) in enumerate([(10, 60, 150, 50), (200, 110, 140, 46)]):
            paste(img, cloud_sprite(w, h, 180 + i), x, y)
        for row in range(4):
            y = 380 + row * 12
            for x in range(-10, AW, 14):
                R(d, x + (row % 2) * 7, y, 8, 5, (70, 110, 50))
                R(d, x + (row % 2) * 7, y, 8, 1, (110, 150, 70))
        for tx in (30, 330):
            round_tree(img, tx, 440, tx + 3, 1.2, LEAF_OLIVE)
        d = ImageDraw.Draw(img)
        for kx in (190, 250):
            R(d, kx, 420, 44, 30, (160, 110, 70))
            d.polygon([(kx - 4, 422), (kx + 22, 404), (kx + 48, 422)], fill=(170, 70, 50))
            R(d, kx + 14, 430, 16, 20, (40, 30, 26))
        for fx in range(0, AW, 16):
            R(d, fx, 452, 3, 24, (150, 110, 70))
        R(d, 0, 458, AW, 2, (130, 90, 60))
        R(d, 0, 468, AW, 2, (130, 90, 60))
        R(d, 80, 396, 70, 26, (120, 80, 50))
        R(d, 83, 399, 64, 20, (240, 230, 200))
        text(d, 88, 403, "REFUGIO", (60, 110, 60))
        R(d, 112, 422, 4, 30, (120, 80, 50))
        self.bg = img

    def draw(self, art, d, t):
        self.drift(art, t) if hasattr(self, 'clouds') else None
        cat(d, 200, 452, (230, 150, 60), t)
        cat(d, 60, 452, (60, 60, 64), t + 1)
        for k, (col, sp, x0) in enumerate((((200, 150, 90), 30, 40), ((60, 50, 44), 22, 200), ((236, 230, 220), 36, 120),
                                           ((170, 100, 50), 26, 280))):
            span = 260
            p = (x0 + t * sp) % (2 * span)
            x = 50 + (p if p < span else 2 * span - p)
            f = 1 if p < span else -1
            dog(d, x, 560 + k * 14, col, t + k, f, 1.3)
        i = self.idx(t)
        C(art, 150, GY, VAJ, 'laptop', t, 1)
        R(d, 158, GY - 34, 12, 8, (60, 60, 70))
        R(d, 159, GY - 33, 10, 6, (120, 200, 255))
        if i >= 1:
            C(art, 212, GY, JUANMA, 'point' if i == 2 and int(t * 2) % 2 else 'stand', t, -1)

    def ui(self, u, d, t):
        banner(d, "REFUGIO DE ANIMALES")
        level(d, "NIVEL 27+")
        i = self.idx(t)
        if i == 0:
            u_ = t - self.L[0].start
            for k in range(int(u_ / 0.8)):
                a = u_ - k * 0.8
                if a < 1.6:
                    text(d, 150 + (k % 3) * 22 - 40, 131 - a * 30, "+1 CLIENTE", GOLD, 1, BLK)
        if i == 3:
            u_ = t - self.L[3].start
            panel(d, 30, 60, 210, 150, (240, 240, 244))
            R(d, 30, 60, 210, 14, (60, 110, 60))
            text(d, 36, 61, "REFUGIO ONLINE - ADOPTA", WHITE)
            for k in range(3):
                if u_ > k * 0.6:
                    x = 40 + k * 66
                    R(d, x, 84, 58, 80, WHITE)
                    R(d, x, 84, 58, 44, [(200, 150, 90), (60, 50, 44), (236, 230, 220)][k])
                    R(d, x + 22, 100, 14, 12, shade([(200, 150, 90), (60, 50, 44), (236, 230, 220)][k], .75))
                    R(d, x + 25, 104, 2, 2, BLK)
                    R(d, x + 31, 104, 2, 2, BLK)
                    text(d, x + 4, 132, ["LUNA", "ROCKY", "COPO"][k], BLK)
                    R(d, x + 4, 148, 50, 12, (230, 90, 60))
                    text(d, x + 8, 148, "ADOPTA", WHITE)
            if u_ > 2:
                cx, cy = 60 + (u_ * 40) % 160, 150
                for k in range(6):
                    R(d, cx, cy + k, 6 - k, 1, BLK)
            text(d, 40, 180, "SOLICITUDES: %d" % int(u_ * 7), (60, 110, 60))
            text(d, 40, 192, "SISTEMA: ONLINE", (60, 110, 60))


# ================================================================ 17. COMBATE
class Fight(Scene):
    music = 'fight'
    lines = [('LOCUTOR', "¡Y sigue peleando! ¡Campeón de España de K1, +91 kg!"),
             ('NARRADOR', "Hace año y medio hizo su primer combate de MMA."),
             ('VAJTAN ADULTO', "En MMA soy bastante inútil... ¡pero en kickboxing soy bastante bueno!")]
    pre = 0.3
    min_dur = 14.0

    def setup(self):
        img = Image.new('RGB', (AW, AH), (10, 8, 22))
        d = ImageDraw.Draw(img)
        for x in range(0, AW, 36):
            d.line([(x, 0), (x + 18, 50)], fill=(40, 40, 60))
            d.line([(x + 36, 0), (x + 18, 50)], fill=(40, 40, 60))
        R(d, 0, 50, AW, 4, (50, 50, 70))
        R(d, 0, 480, AW, 40, (30, 60, 150))
        R(d, 0, 480, AW, 3, (80, 120, 220))
        R(d, 0, 520, AW, 120, (18, 18, 28))
        self.bg = img
        rnd = random.Random(2)
        self.crowd = []
        for row in range(18):
            y = 130 + row * 19
            sz = 5 + row // 3
            for x in range(-4 + (row % 2) * 5, AW, sz + 4):
                self.crowd.append((x, y, sz, rnd.random() * 6,
                                   rnd.choice([(230, 180, 140), (200, 150, 110), (150, 100, 70), (240, 200, 170)]),
                                   rnd.choice([(40, 30, 30), (200, 160, 60), (90, 50, 30), (20, 20, 20)]),
                                   rnd.choice([(80, 80, 140), (140, 50, 50), (50, 110, 80), (120, 120, 120)]),
                                   0.3 + row * 0.03))
        F = 2.6
        self.ev = [(F + 0.3, 'V', 'punch'), (F + 0.9, 'V', 'punch2'), (F + 1.8, 'R', 'punch'),
                   (F + 2.6, 'V', 'kick'), (F + 3.4, 'V', 'punch'), (F + 3.9, 'V', 'punch2'),
                   (F + 4.8, 'R', 'punch'), (F + 5.6, 'V', 'kick')]
        self.ko = F + 5.6

    def after_schedule(self):
        self.mma = self.L[2].start - 0.3
        self.sfx = [(0.2, 'bell')] + [(e[0] + 0.08, 'hit' if 'punch' in e[2] else 'bighit') for e in self.ev] \
            + [(self.ko + 0.3, 'ko')] + [(self.mma + 0.3 + k * 0.35, 'hit') for k in range(8)]

    def hp(self, who, t):
        v = 100
        for tm, w_, kind in self.ev:
            if tm + 0.08 <= t and w_ != who:
                v -= (14 if 'punch' in kind else 20) if who == 'R' else 10
        if who == 'R' and t >= self.ko + 0.08:
            v = 0
        return max(0, v)

    def draw(self, art, d, t):
        for x, y, sz, ph, sk, hr, shc, br in self.crowd:
            by = int(abs(math.sin(t * 6 + ph)) * 2)
            R(d, x - 1, y + sz - by, sz + 2, sz + 4, shade(shc, br))
            R(d, x, y - by, sz, sz, shade(sk, br))
            R(d, x, y - by, sz, 2, shade(hr, br))
            if t > self.ko and int(t * 4 + ph) % 2:
                R(d, x + 1, y - 6 - by, 2, 5, shade(sk, br))
        for fx in (50, 180, 310):
            sw = math.sin(t * 1.3 + fx) * 50
            for yy in range(54, 480, 2):
                f = (yy - 54) / 426
                cx = fx + sw * f
                hw = 8 + 50 * f
                for xx in range(int(cx - hw), int(cx + hw), 3):
                    if 0 <= xx < AW and (xx + yy) % 6 == 0:
                        d.point((xx, yy), fill=(120, 120, 150))
        mma = t >= self.mma
        if not mma:
            R(d, 18, 404, 5, 78, (200, 200, 210))
            R(d, 337, 404, 5, 78, (200, 200, 210))
            for i, c in enumerate([(220, 40, 40), WHITE, (40, 80, 220)]):
                R(d, 23, 412 + i * 18, 314, 2, c)
            vx, rx = 150, 212
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
                        rx += 5
                        rflash = int(t * 20) % 2 == 0
                        spark = (rx - 12, 452 if 'punch' in kind else 462)
                    else:
                        vx -= 5
                        vflash = int(t * 20) % 2 == 0
                        spark = (vx + 12, 452)
            if t > self.ko + 0.3:
                C(art, rx + 30, 484, RIVAL, 'lie', t, 1, sh=False)
                C(art, vx, 484, VAJ_FIGHT, 'win' if t > self.ko + 1.0 else 'guard', t, 1, sh=False)
            else:
                C(art, vx, 484, VAJ_FIGHT, vpose, t, 1, sh=False, flash=vflash)
                C(art, rx, 484, RIVAL, rpose, t, -1, sh=False, flash=rflash)
            if spark:
                sx, sy = spark
                for a in range(8):
                    ang = a * math.pi / 4
                    d.line([(sx, sy), (sx + math.cos(ang) * 8, sy + math.sin(ang) * 8)], fill=GOLD)
                R(d, sx - 1, sy - 1, 3, 3, WHITE)
        else:
            u = t - self.mma
            rnd = random.Random(int(t * 10))
            cx, cy = 180, 450
            for k in range(22):
                a = k / 22 * 2 * math.pi
                r = 30 + rnd.randint(-4, 6)
                d.ellipse([cx + math.cos(a) * r - 12, cy + math.sin(a) * r * .6 - 10,
                           cx + math.cos(a) * r + 12, cy + math.sin(a) * r * .6 + 10], fill=(220, 214, 200))
            d.ellipse([cx - 34, cy - 24, cx + 34, cy + 24], fill=(236, 232, 220))
            for k in range(4):
                a = rnd.random() * 2 * math.pi
                ex, ey = cx + math.cos(a) * 36, cy + math.sin(a) * 22
                d.line([(cx + math.cos(a) * 20, cy + math.sin(a) * 12), (ex, ey)],
                       fill=(230, 176, 138) if k % 2 else (196, 146, 108), width=4)
                R(d, ex - 3, ey - 3, 6, 6, (200, 30, 40) if k % 2 else (30, 80, 200))
            for k in range(3):
                sx, sy = cx - 40 + rnd.randint(0, 80), cy - 44 + rnd.randint(0, 10)
                R(d, sx, sy, 3, 3, GOLD)
            for yy in range(380, 520, 8):
                for xx in range(0, AW, 8):
                    d.line([(xx, yy), (xx + 4, yy + 4)], fill=(90, 90, 100))
                    d.line([(xx + 4, yy + 4), (xx + 8, yy)], fill=(90, 90, 100))
            R(d, 0, 376, AW, 4, (40, 40, 44))

    def ui(self, u, d, t):
        R(d, 0, 0, UW, 36, (10, 8, 22))
        if t < self.mma:
            for side, name, who in ((0, "VAJTAN", 'V'), (1, "RIVAL", 'R')):
                x0 = 8 if side == 0 else 150
                text(d, x0 if side == 0 else 262 - len(name) * 6, 4, name, WHITE, 1, BLK)
                R(d, x0 - 1, 15, 114, 9, WHITE)
                R(d, x0, 16, 112, 7, (120, 0, 0))
                w_ = int(112 * self.hp(who, t) / 100)
                xx = x0 if side == 0 else x0 + 112 - w_
                R(d, xx, 16, w_, 7, GOLD)
                R(d, xx, 16, w_, 2, (255, 240, 150))
            timer = max(0, 99 - int(min(t, self.ko) * 2))
            text_c(d, 135, 5, "%02d" % timer, GOLD, 2)
            level(d, "NIVEL 30", 28)
            if 0.3 < t < 1.4:
                big(d, "ROUND 1", 150, WHITE, 3, (160, 0, 0))
            elif 1.4 <= t < 2.5 and int(t * 10) % 2 == 0:
                big(d, "FIGHT!", 146, GOLD, 4, (160, 0, 0))
            if self.ko + 0.2 < t < self.ko + 2.6 and int(t * 6) % 2 == 0:
                big(d, "K.O.!", 140, (255, 60, 40), 5, BLK)
            if t > self.ko + 2.6:
                R(d, 68, 130, 134, 34, BLK)
                R(d, 69, 131, 132, 32, (120, 20, 30))
                text_c(d, UW // 2, 134, "CAMPEON DE ESPAÑA", GOLD, 1, BLK)
                text_c(d, UW // 2, 148, "K1  +91 KG", WHITE, 1, BLK)
        else:
            banner(d, "PRIMER COMBATE DE MMA", 8)
            if int(t * 3) % 2:
                text_c(d, UW // 2, 150, "¿¿¿???", WHITE, 2, BLK)


# ================================================================ 18. FINAL
class Ending(Scene):
    music = 'end'
    lines = [('VAJTAN ADULTO', "Llegué con 8 años. Hoy, 23 años después, esta es mi casa."),
             ('VAJTAN ADULTO', "Ucrania, Georgia y España en el corazón. Y esta historia... continúa.")]
    post = 5.0
    SH = 110

    def setup(self):
        self.bg = cliff_bg()
        self.clouds = [(cloud_sprite(90, 32, 93), 20, 196, 5), (cloud_sprite(120, 40, 94), 200, 270, 3)]

    def after_schedule(self):
        self.fin = self.L[-1].end + HOLD

    def show_box(self, t):
        return t < self.fin

    def draw(self, art, d, t):
        self.drift(art, t)
        birds(d, t, 60, 160)
        sitter_back(d, 190, 444, t)

    def ui(self, u, d, t):
        if t < self.fin:
            banner(d, "HOY")
            level(d, "NIVEL 31")
            return
        v = t - self.fin
        R(d, 60, 40, 150, 90, BLK)
        R(d, 62, 42, 146, 86, (60, 20, 40))
        text_c(d, UW // 2, 50, "FIN", GOLD, 5, (120, 30, 0))
        text_c(d, UW // 2, 100, "GRACIAS POR JUGAR", WHITE, 1)
        if int(v * 3) % 2 == 0:
            text_c(d, UW // 2, 232, "¿CONTINUAR?  %d" % max(0, 9 - int(v * 2.2)), (255, 120, 60), 1, BLK)
        text_c(d, UW // 2, 250, "HISTORIA Y AVENTURAS DE", WHITE, 1, BLK)
        text_c(d, UW // 2, 262, "VAJTAN, EL SÚPER NENE", GOLD, 1, BLK)


SCENES = [Title(), Ukraine(), Farewell(), Journey(), Tomelloso(), KickGym(), Parkour12(), Accident(), Halo(),
          Comeback8m(), ArtSchool(), Pandemic(), Business(), Doorman(), Bald(), Refuge(), Fight(), Ending()]


# ================================================================ AUDIO
def sfx(buf, t, kind):
    if kind == 'pah':
        noise(buf, t, 0.5, 0.9, 9, lp=6)
        tone(buf, t, 0.35, 90, 0.7, 'sq', 0.5, sweep=-0.8)
        tone(buf, t + 0.05, 0.6, 1500, 0.08, 'sin', sweep=-0.2)
    elif kind == 'hair':
        tone(buf, t, 0.05, 1800, 0.05, 'sq', 0.25, sweep=-0.5)
    elif kind == 'coin':
        tone(buf, t, 0.06, 988, 0.12, 'sq', 0.5)
        tone(buf, t + 0.06, 0.15, 1319, 0.12, 'sq', 0.5)
    else:
        mv.sfx(buf, t, kind)


def build_audio(total):
    n = int(total * SR) + SR
    mus, fx = np.zeros(n), np.zeros(n)
    for i, sc in enumerate(SCENES):
        seg = np.zeros(n)
        music_section(seg, sc.t0, sc.dur, sc.music, 300 + i)
        a, b = int(sc.t0 * SR), min(n, int((sc.t0 + sc.dur) * SR))
        f = int(0.25 * SR)
        env = np.zeros(n)
        env[a:b] = 1
        env[a:a + f] = np.linspace(0, 1, f)
        env[b - f:b] = np.linspace(1, 0, f)
        mus += seg * env
        for tt, kind in sc.sfx:
            sfx(fx, sc.t0 + tt, kind)
        if isinstance(sc, Refuge):
            for k in range(8):
                sfx(fx, sc.t0 + sc.L[0].start + 0.8 * (k + 1), 'coin')
        rng = random.Random(i)
        for ln in sc.L:
            base = BEEP[ln.who]
            for ch, tm in zip(ln.flat, ln.times):
                if ch.isalnum():
                    tone(fx, sc.t0 + tm, 0.035, base * (1 + rng.uniform(-0.04, 0.04)), 0.11, 'sq', 0.5)
    out = np.tanh((mus * 0.75 + fx) * 1.1) * 0.9
    return out[:int(total * SR)]


# ================================================================ RENDER
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
        CPS += 0.5
    last = SCENES[-1]
    last.dur += TARGET - t
    return TARGET


def compose(sc, t):
    art, ui = sc.render(t)
    a = np.asarray(art)
    if sc.SH:
        b = np.empty_like(a)
        b[:AH - sc.SH] = a[sc.SH:]
        b[AH - sc.SH:] = NAVY
        b[AH - sc.SH:AH - sc.SH + 2] = (70, 80, 140)
        b[AH - sc.SH + 2:AH - sc.SH + 3] = (30, 36, 70)
        a = b
    dx, dy = sc.shake(t)
    if dx or dy:
        a = np.roll(np.roll(a, dy, 0), dx, 1)
    big_ = np.repeat(np.repeat(a, 3, 0), 3, 1)
    u = np.asarray(ui)
    bu = np.repeat(np.repeat(u, 4, 0), 4, 1)
    m = bu[..., 3] > 0
    out = big_.copy()
    out[m] = bu[..., :3][m]
    fl = sc.flash(t)
    if fl:
        out = np.full_like(out, 255)
    return out


def main():
    total = plan()
    print("CPS final: %.1f" % CPS)
    for sc in SCENES:
        print("%-12s start %6.2f dur %5.2f" % (type(sc).__name__, sc.t0, sc.dur))
    print("TOTAL %.2f s" % total)
    if '--preview' in sys.argv:
        only = sys.argv[sys.argv.index('--scene') + 1] if '--scene' in sys.argv else None
        pdir = os.path.join(HERE, 'preview')
        os.makedirs(pdir, exist_ok=True)
        for sc in SCENES:
            if only and type(sc).__name__ != only:
                continue
            for k, f in enumerate((0.3, 0.75)):
                img = Image.fromarray(compose(sc, sc.dur * f)).resize((360, 640), Image.NEAREST)
                img.save(os.path.join(pdir, '%s_%d.png' % (type(sc).__name__, k)))
        return
    wav = os.path.join(HERE, '_audio.wav')
    write_wav(wav, build_audio(total))
    cmd = [ffmpeg_exe(), '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
           '-s', '1080x1920', '-r', str(FPS), '-i', '-', '-i', wav,
           '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p',
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
        out = compose(sc, lt).astype(np.float32)
        fade = min(1.0, lt / 0.3, (sc.dur - lt) / 0.3)
        if si == 0:
            fade = min(fade, lt / 1.0)
        if si == len(SCENES) - 1:
            fade = min(1.0, lt / 0.3, (sc.dur - lt) / 1.0)
        out *= round(max(0.0, fade) * 6) / 6
        p.stdin.write(out.astype(np.uint8).tobytes())
        if fi % 240 == 0:
            print("frame %d/%d" % (fi, nframes), flush=True)
    p.stdin.close()
    p.wait()
    os.remove(wav)
    print("OK ->", OUT)


if __name__ == '__main__':
    main()
