#!/usr/bin/env python3
"""
LA LEYENDA DE VAJTAN - video pixel art estilo videojuego 16-bit (95-2000).
Todo se genera por codigo: graficos, fuente bitmap, musica chiptune y los
"pi-pi-pi" del texto. Requiere: pillow, numpy, ffmpeg (o imageio-ffmpeg).

Uso:  python3 make_video.py  ->  vajtan_pixel_story.mp4
"""
import math, os, random, shutil, subprocess, sys, wave
import numpy as np
from PIL import Image, ImageDraw

W, H = 320, 180          # resolucion interna "de consola"
SCALE = 4                # 1280x720 final
FPS = 24
SR = 44100
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(OUT_DIR, "vajtan_pixel_story.mp4")


def ffmpeg_exe():
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


# ---------------------------------------------------------------- FUENTE 5x7
G = {
 'A': [" ### ", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
 'B': ["#### ", "#   #", "#   #", "#### ", "#   #", "#   #", "#### "],
 'C': [" ### ", "#   #", "#    ", "#    ", "#    ", "#   #", " ### "],
 'D': ["#### ", "#   #", "#   #", "#   #", "#   #", "#   #", "#### "],
 'E': ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#####"],
 'F': ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#    "],
 'G': [" ### ", "#   #", "#    ", "# ###", "#   #", "#   #", " ####"],
 'H': ["#   #", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
 'I': [" ### ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", " ### "],
 'J': ["  ###", "   # ", "   # ", "   # ", "   # ", "#  # ", " ##  "],
 'K': ["#   #", "#  # ", "# #  ", "##   ", "# #  ", "#  # ", "#   #"],
 'L': ["#    ", "#    ", "#    ", "#    ", "#    ", "#    ", "#####"],
 'M': ["#   #", "## ##", "# # #", "# # #", "#   #", "#   #", "#   #"],
 'N': ["#   #", "##  #", "# # #", "#  ##", "#   #", "#   #", "#   #"],
 'O': [" ### ", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
 'P': ["#### ", "#   #", "#   #", "#### ", "#    ", "#    ", "#    "],
 'Q': [" ### ", "#   #", "#   #", "#   #", "# # #", "#  # ", " ## #"],
 'R': ["#### ", "#   #", "#   #", "#### ", "# #  ", "#  # ", "#   #"],
 'S': [" ####", "#    ", "#    ", " ### ", "    #", "    #", "#### "],
 'T': ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  "],
 'U': ["#   #", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
 'V': ["#   #", "#   #", "#   #", "#   #", "#   #", " # # ", "  #  "],
 'W': ["#   #", "#   #", "#   #", "# # #", "# # #", "## ##", "#   #"],
 'X': ["#   #", "#   #", " # # ", "  #  ", " # # ", "#   #", "#   #"],
 'Y': ["#   #", "#   #", " # # ", "  #  ", "  #  ", "  #  ", "  #  "],
 'Z': ["#####", "    #", "   # ", "  #  ", " #   ", "#    ", "#####"],
 '0': [" ### ", "#   #", "#  ##", "# # #", "##  #", "#   #", " ### "],
 '1': ["  #  ", " ##  ", "  #  ", "  #  ", "  #  ", "  #  ", " ### "],
 '2': [" ### ", "#   #", "    #", "   # ", "  #  ", " #   ", "#####"],
 '3': ["#### ", "    #", "    #", " ### ", "    #", "    #", "#### "],
 '4': ["   # ", "  ## ", " # # ", "#  # ", "#####", "   # ", "   # "],
 '5': ["#####", "#    ", "#### ", "    #", "    #", "#   #", " ### "],
 '6': [" ### ", "#    ", "#    ", "#### ", "#   #", "#   #", " ### "],
 '7': ["#####", "    #", "   # ", "  #  ", " #   ", " #   ", " #   "],
 '8': [" ### ", "#   #", "#   #", " ### ", "#   #", "#   #", " ### "],
 '9': [" ### ", "#   #", "#   #", " ####", "    #", "    #", " ### "],
 '.': ["     "] * 6 + ["  #  "],
 ',': ["     "] * 5 + ["  #  ", " #   "],
 '!': ["  #  "] * 5 + ["     ", "  #  "],
 '¡': ["  #  ", "     "] + ["  #  "] * 5,
 '?': [" ### ", "#   #", "    #", "   # ", "  #  ", "     ", "  #  "],
 '¿': ["  #  ", "     ", "  #  ", " #   ", "#    ", "#   #", " ### "],
 ':': ["     ", "  #  ", "     ", "     ", "     ", "  #  ", "     "],
 '-': ["     ", "     ", "     ", " ### ", "     ", "     ", "     "],
 "'": ["  #  ", "  #  "] + ["     "] * 5,
 '"': [" # # ", " # # "] + ["     "] * 5,
 '(': ["   # ", "  #  ", " #   ", " #   ", " #   ", "  #  ", "   # "],
 ')': [" #   ", "  #  ", "   # ", "   # ", "   # ", "  #  ", " #   "],
 '/': ["    #", "    #", "   # ", "  #  ", " #   ", "#    ", "#    "],
 '+': ["     ", "  #  ", "  #  ", "#####", "  #  ", "  #  ", "     "],
 '%': ["##  #", "## # ", "   # ", "  #  ", " #   ", " # ##", "#  ##"],
 '*': ["     ", "# # #", " ### ", "#####", " ### ", "# # #", "     "],
 '>': [" #   ", "  #  ", "   # ", "    #", "   # ", "  #  ", " #   "],
 ' ': ["     "] * 7,
}
ACC = {'Á': ('A', "   # "), 'É': ('E', "   # "), 'Í': ('I', "   # "),
       'Ó': ('O', "   # "), 'Ú': ('U', "   # "), 'Ñ': ('N', " ## #"),
       'Ü': ('U', " # # ")}


def glyph(ch):
    """Devuelve 9 filas: fila 0 acento, fila 1 hueco, 2-8 letra."""
    ch = ch.upper()
    if ch in ACC:
        base, top = ACC[ch]
        return [top, "     "] + G[base]
    return ["     ", "     "] + G.get(ch, G[' '])


GLYPH_CACHE = {}


def text(d, x, y, s, c, scale=1, shadow=None):
    for i, ch in enumerate(s):
        if ch == ' ':
            continue
        rows = GLYPH_CACHE.setdefault(ch, glyph(ch))
        gx = x + i * 6 * scale
        for ry, row in enumerate(rows):
            for rx, px in enumerate(row):
                if px == '#':
                    X, Y = gx + rx * scale, y + ry * scale
                    if shadow is not None:
                        d.rectangle([X + scale, Y + scale, X + 2 * scale - 1, Y + 2 * scale - 1], fill=shadow)
                    d.rectangle([X, Y, X + scale - 1, Y + scale - 1], fill=c)


def text_c(d, cx, y, s, c, scale=1, shadow=None):
    text(d, cx - (len(s) * 6 * scale) // 2, y, s, c, scale, shadow)


def R(d, x, y, w, h, c):
    if w > 0 and h > 0:
        d.rectangle([int(x), int(y), int(x + w - 1), int(y + h - 1)], fill=c)


def lerp(a, b, f):
    return tuple(int(a[i] + (b[i] - a[i]) * f) for i in range(3))


def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c)


BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def grad(arr, y0, y1, c0, c1, bands=6):
    """Degradado con tramado ordenado (dithering) tipo SNES."""
    for y in range(y0, y1):
        f = (y - y0) / max(1, (y1 - y0 - 1))
        v = f * bands
        for x in range(W):
            b = int(v + BAYER[y % 4, x % 4] - 0.5)
            b = max(0, min(bands, b))
            arr[y, x] = lerp(c0, c1, b / bands)


def sky_img(stops, y1=H):
    arr = np.zeros((H, W, 3), np.uint8)
    n = len(stops) - 1
    seg = y1 / n
    for i in range(n):
        grad(arr, int(i * seg), int((i + 1) * seg), stops[i], stops[i + 1])
    return arr


# ---------------------------------------------------------------- PERSONAJES
BLK = (20, 16, 24)
WHITE = (240, 240, 232)
GOLD = (255, 204, 40)

KID = dict(skin=(238, 188, 150), hair=(52, 36, 30), shirt=(60, 120, 220), pants=(50, 50, 90),
           shoes=(90, 50, 30), kid=True, beard=None)
TEEN = dict(skin=(232, 180, 142), hair=(45, 32, 28), shirt=(120, 120, 130), pants=(40, 44, 70),
            shoes=(230, 230, 230), kid=False, beard=None)
VAJ = dict(skin=(230, 176, 138), hair=(40, 28, 24), shirt=(24, 24, 30), pants=(50, 50, 60),
           shoes=(30, 30, 30), kid=False, beard=(80, 56, 44), big=True)
VAJ_FIGHT = dict(VAJ, shirt=None, pants=(200, 30, 40), shoes=None, glove=(200, 30, 40))
RIVAL = dict(skin=(200, 150, 110), hair=(20, 20, 20), shirt=None, pants=(30, 80, 200), shoes=None,
             glove=(30, 80, 200), kid=False, beard=(40, 30, 30), big=True)
DAD = dict(skin=(226, 170, 130), hair=(30, 24, 22), shirt=(140, 40, 40), pants=(60, 50, 40),
           shoes=(40, 30, 20), kid=False, beard=None, mustache=True)
MOM = dict(skin=(242, 196, 160), hair=(230, 190, 90), shirt=(250, 250, 250), pants=(30, 90, 190),
           shoes=(120, 40, 40), kid=False, beard=None, long=True, dress=True)
FRIEND = dict(skin=(226, 168, 120), hair=(120, 70, 30), shirt=(40, 160, 70), pants=(40, 40, 110),
              shoes=(220, 220, 220), kid=True, beard=None)


def person(d, x, y, P, pose='stand', t=0.0, facing=1, flash=False):
    x, y = int(x), int(y)
    kid = P.get('kid')
    big = 2 if P.get('big') else 0
    if kid:
        hd, th, tw, lh, lw, aw = 8, 7, 8, 6, 3, 2
    else:
        hd, th, tw, lh, lw, aw = 8, 11, 10 + big, 11, 4 + big // 2, 3
    skin = P['skin']
    shirt = P['shirt'] or skin
    pants = P['pants']
    shoes = P['shoes'] or skin
    glove = P.get('glove')
    if flash:
        skin = shirt = pants = shoes = WHITE
        glove = WHITE if glove else None
    if pose == 'ko':
        # tumbado en el suelo
        R(d, x - 14, y - 5, 10, 5, pants)
        R(d, x - 18, y - 4, 4, 4, shoes)
        R(d, x - 4, y - 7, 12, 7, shirt)
        R(d, x + 8, y - 8, 8, 8, skin)
        R(d, x + 8, y - 8, 8, 3, P['hair'])
        R(d, x + 12, y - 5, 1, 1, BLK)
        if glove:
            R(d, x - 2, y - 10, 4, 4, glove)
        return
    bob = 0
    s = 0
    if pose in ('walk', 'run'):
        sp = 10 if pose == 'walk' else 16
        s = int(round(math.sin(t * sp) * (2 if pose == 'walk' else 3)))
        bob = 1 if math.sin(t * sp * 2) > 0 else 0
    if pose == 'jump':
        lh2 = lh // 2 + 1
    else:
        lh2 = lh
    ly = y - lh2 - bob
    ty = ly - th
    hy = ty - hd
    # piernas
    if pose == 'kick':
        R(d, x - lw - 1, ly, lw, lh, pants)
        R(d, x - lw - 1, y - 2, lw + 1, 2, shoes)
        kx = x + facing * 2
        ln = 14
        if facing > 0:
            R(d, kx, ly - 2, ln, lw, pants)
            R(d, kx + ln, ly - 2, 3, lw, shoes)
        else:
            R(d, kx - ln, ly - 2, ln, lw, pants)
            R(d, kx - ln - 3, ly - 2, 3, lw, shoes)
    else:
        l1x = x - lw - (0 if kid else 1) + s
        l2x = x + 1 - s
        R(d, l1x, ly, lw, lh2, pants)
        R(d, l2x, ly, lw, lh2, pants)
        R(d, l1x + (1 if facing > 0 else -1), ly + lh2 - 2, lw, 2, shoes)
        R(d, l2x + (1 if facing > 0 else -1), ly + lh2 - 2, lw, 2, shoes)
    # torso
    if P.get('dress'):
        R(d, x - tw // 2, ty, tw, th, shirt)
        R(d, x - tw // 2 - 2, ty + th - 5, tw + 4, 7, pants)
    else:
        R(d, x - tw // 2, ty, tw, th, shirt)
        if P['shirt'] is None and not flash:   # torso desnudo (luchador)
            R(d, x - tw // 2 + 2, ty + 3, 2, 2, shade(skin, .85))
            R(d, x + tw // 2 - 4, ty + 3, 2, 2, shade(skin, .85))
            R(d, x - tw // 2, ty + th - 3, tw, 3, pants)
    # brazos
    sleeve = shirt
    fist = glove or skin
    left = x - tw // 2 - aw
    right = x + tw // 2
    front = right if facing > 0 else left
    back = left if facing > 0 else right
    if pose in ('guard', 'punch', 'kick', 'shadow'):
        # brazo trasero en guardia
        R(d, back, ty, aw, 5, sleeve)
        gx = x + facing * (tw // 2 - 2) - (0 if facing > 0 else 3)
        R(d, gx, hy + 5, 4, 4, fist)
        if pose == 'punch':
            ln = 12
            if facing > 0:
                R(d, right, ty + 1, ln, 3, sleeve if P['shirt'] else skin)
                R(d, right + ln, ty, 5, 5, fist)
            else:
                R(d, left - ln + aw, ty + 1, ln, 3, sleeve if P['shirt'] else skin)
                R(d, left - ln + aw - 5, ty, 5, 5, fist)
        else:
            fx = x + facing * (tw // 2 + 2) - (0 if facing > 0 else 4)
            R(d, front, ty, aw, 4, sleeve)
            R(d, fx, hy + 7, 4, 4, fist)
    elif pose == 'win':
        R(d, back, ty + 1, aw, th - 3, sleeve)
        R(d, back, ty + th - 2, aw, 2, fist)
        R(d, front, ty - 10, aw, 10, sleeve if P['shirt'] else skin)
        R(d, front - 1, ty - 14, aw + 2, 5, fist)
    elif pose == 'draw':
        R(d, back, ty + 1, aw, th - 3, sleeve)
        wig = int(math.sin(t * 14) * 2)
        R(d, front, ty + 3, 8, 3, sleeve)
        R(d, front + 7 + wig, ty + 2, 3, 3, skin)
    else:
        sw = int(round(math.sin(t * (10 if pose == 'walk' else 16)) * 2)) if pose in ('walk', 'run') else 0
        R(d, left, ty + 1 + sw, aw, th - 3, sleeve)
        R(d, left, ty + th - 2 + sw, aw, 2, fist)
        R(d, right, ty + 1 - sw, aw, th - 3, sleeve)
        R(d, right, ty + th - 2 - sw, aw, 2, fist)
    # cabeza
    hx = x - hd // 2
    R(d, hx, hy, hd, hd, skin)
    hair = P['hair'] if not flash else WHITE
    R(d, hx - 1, hy - 1, hd + 2, 3, hair)
    bx = hx - 1 if facing > 0 else hx + hd - 1
    R(d, bx, hy, 2, 5, hair)
    if P.get('long'):
        R(d, bx - (1 if facing > 0 else -1), hy, 3, hd + 6, hair)
    ex = x + facing * 2 - (1 if facing < 0 else 0)
    R(d, ex, hy + 4, 1, 2 if kid else 1, BLK)
    if P.get('beard') and not flash:
        R(d, hx, hy + 6, hd, 2, P['beard'])
        R(d, x + facing * 2 - 1, hy + 6, 2, 1, (150, 70, 60))
    if P.get('mustache') and not flash:
        R(d, x + facing * 1 - 1, hy + 6, 4, 1, hair)


def portrait(d, x, y, who, talking, t):
    R(d, x - 1, y - 1, 34, 34, WHITE)
    if who == 'NARRADOR':
        R(d, x, y, 32, 32, (70, 40, 110))
        # libro abierto
        R(d, x + 4, y + 9, 24, 16, (120, 60, 30))
        R(d, x + 5, y + 8, 11, 16, (250, 244, 220))
        R(d, x + 16, y + 8, 11, 16, (250, 244, 220))
        for i in range(5):
            R(d, x + 7, y + 11 + i * 2, 7, 1, (150, 140, 130))
            R(d, x + 18, y + 11 + i * 2, 7, 1, (150, 140, 130))
        if talking and int(t * 8) % 2:
            R(d, x + 26, y + 4, 2, 2, GOLD)
            R(d, x + 3, y + 26, 2, 2, GOLD)
        return
    P = {'VAJTAN NIÑO': KID, 'PADRE': DAD, 'MADRE': MOM, 'COMPAÑERO': FRIEND,
         'VAJTAN': VAJ, 'LOCUTOR': dict(DAD, shirt=(20, 20, 20), mustache=False, beard=None, hair=(200, 200, 200)),
         'VAJTAN (TEEN)': TEEN}[who]
    bgc = {'VAJTAN NIÑO': (40, 90, 170), 'VAJTAN': (150, 30, 40), 'VAJTAN (TEEN)': (40, 120, 110),
           'PADRE': (90, 60, 40), 'MADRE': (60, 120, 160), 'COMPAÑERO': (40, 110, 60),
           'LOCUTOR': (40, 40, 40)}[who]
    R(d, x, y, 32, 32, bgc)
    skin, hair = P['skin'], P['hair']
    kid = P.get('kid')
    if P.get('long'):
        R(d, x + 5, y + 5, 22, 22, hair)
    R(d, x + 4, y + 26, 24, 6, P['shirt'])
    R(d, x + 13, y + 21, 6, 6, shade(skin, .85))
    fy = 7 if kid else 6
    R(d, x + 8, y + fy, 16, 17, skin)
    R(d, x + 8, y + fy + 16, 1, 1, bgc)
    R(d, x + 23, y + fy + 16, 1, 1, bgc)
    R(d, x + 7, y + fy - 3, 18, 6, hair)
    R(d, x + 7, y + fy, 2, 7, hair)
    R(d, x + 23, y + fy, 2, 7, hair)
    blink = (t % 3.1) < 0.12
    ey = y + fy + 7
    if who == 'LOCUTOR':
        R(d, x + 9, ey - 1, 14, 3, BLK)
        R(d, x + 11, ey - 1, 2, 1, (120, 120, 160))
    elif blink:
        R(d, x + 11, ey + 1, 3, 1, BLK)
        R(d, x + 18, ey + 1, 3, 1, BLK)
    else:
        eh = 3 if kid else 2
        R(d, x + 11, ey, 2, eh, BLK)
        R(d, x + 19, ey, 2, eh, BLK)
        if kid:
            R(d, x + 11, ey, 1, 1, WHITE)
            R(d, x + 19, ey, 1, 1, WHITE)
    R(d, x + 10, ey - 2, 4, 1, shade(hair, .8))
    R(d, x + 18, ey - 2, 4, 1, shade(hair, .8))
    R(d, x + 15, ey + 2, 2, 3, shade(skin, .85))
    if P.get('beard'):
        R(d, x + 8, y + fy + 11, 16, 6, P['beard'])
        R(d, x + 10, y + fy + 16, 12, 1, P['beard'])
    if P.get('mustache'):
        R(d, x + 12, y + fy + 11, 8, 1, hair)
    my = y + fy + 12
    if talking and int(t * 12) % 2:
        R(d, x + 13, my, 6, 3, (120, 30, 40))
    else:
        R(d, x + 13, my + 1, 6, 1, (120, 50, 50))


# ---------------------------------------------------------------- DIALOGOS
CPS = 28.0
HOLD = 1.25
BEEP_F = {'NARRADOR': 700, 'VAJTAN NIÑO': 1180, 'PADRE': 420, 'MADRE': 880, 'COMPAÑERO': 1000,
          'VAJTAN': 560, 'LOCUTOR': 480, 'VAJTAN (TEEN)': 820}


def wrap(s, n=44):
    words, lines, cur = s.split(' '), [], ''
    for w in words:
        if len(cur) + len(w) + (1 if cur else 0) > n:
            lines.append(cur)
            cur = w
        else:
            cur = (cur + ' ' + w) if cur else w
    lines.append(cur)
    return lines


class Line:
    def __init__(self, who, txt, start):
        self.who, self.txt, self.start = who, txt.upper(), start
        self.lines = wrap(self.txt)
        assert len(self.lines) <= 3, self.txt
        self.times = []
        tt = start + 0.2
        flat = ' '.join(self.lines)
        for i, ch in enumerate(flat):
            self.times.append(tt)
            tt += 1.0 / CPS
            if ch in '.!?' and (i + 1 < len(flat) and flat[i + 1] == ' '):
                tt += 0.22
            elif ch == ',':
                tt += 0.1
        self.end_type = tt
        self.flat = flat

    def shown(self, t):
        n = 0
        for tm in self.times:
            if tm <= t:
                n += 1
        return n


def draw_box(d, ln, t):
    y0 = 126
    R(d, 3, y0, 314, 52, WHITE)
    R(d, 4, y0 + 1, 312, 50, (70, 80, 140))
    R(d, 5, y0 + 2, 310, 48, (16, 22, 56))
    for yy in range(y0 + 2, y0 + 50, 2):     # lineas sutiles
        R(d, 5, yy, 310, 1, (20, 28, 66))
    n = ln.shown(t)
    talking = n < len(ln.flat)
    portrait(d, 10, y0 + 10, ln.who, talking, t)
    name = ln.who
    text(d, 50, y0 + 1, name, GOLD, shadow=BLK)
    k = 0
    for li, line in enumerate(ln.lines):
        part = line[:max(0, n - k)]
        text(d, 50, y0 + 13 + li * 11, part, WHITE, shadow=(0, 0, 20))
        k += len(line) + 1
    if not talking and int(t * 3) % 2 == 0:
        R(d, 303, y0 + 42, 7, 1, GOLD)
        R(d, 304, y0 + 43, 5, 1, GOLD)
        R(d, 305, y0 + 44, 3, 1, GOLD)
        R(d, 306, y0 + 45, 1, 1, GOLD)


def banner(d, s, x=6, y=6):
    w = len(s) * 6 + 8
    R(d, x - 1, y - 1, w + 2, 15, BLK)
    R(d, x, y, w, 13, (190, 30, 40))
    R(d, x, y, w, 1, (240, 90, 90))
    text(d, x + 4, y + 1, s, WHITE, shadow=BLK)


def flag(d, x, y, kind, t, w=24, h=16):
    R(d, x - 2, y - 2, 2, 60, (120, 120, 130))
    R(d, x - 3, y - 4, 4, 3, GOLD)
    for cx in range(w):
        dy = int(round(math.sin(t * 6 - cx * 0.45) * 1.5 * (cx / w)))
        for cy in range(h):
            if kind == 'UA':
                c = (0, 87, 183) if cy < h // 2 else (255, 213, 0)
            elif kind == 'ES':
                c = (198, 11, 30) if (cy < h // 4 or cy >= h - h // 4) else (255, 196, 0)
            else:  # Georgia
                c = WHITE
                if 10 <= cx <= 13 or 6 <= cy <= 9:
                    c = (220, 20, 30)
                for qx, qy in ((4, 2), (19, 2), (4, 12), (19, 12)):
                    if (cx == qx and abs(cy - qy) <= 1) or (cy == qy and abs(cx - qx) <= 1):
                        c = (220, 20, 30)
            if (cx + int(t * 8)) % 7 == 0:
                c = shade(c, .85)
            d.point((x + cx, y + cy + dy), fill=c)


# ---------------------------------------------------------------- ESCENAS
class Scene:
    name = ''
    lines = []           # [(quien, texto)]
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
        self.dur = max(self.min_dur, s - HOLD + self.post + HOLD * (1 if self.L else 0))
        self.sfx = []

    def cur_line(self, t):
        cur = None
        for ln in self.L:
            if t >= ln.start:
                cur = ln
        return cur

    def setup(self):
        pass

    def frame(self, t):
        img = self.bg.copy() if hasattr(self, 'bg') else Image.new('RGB', (W, H), BLK)
        d = ImageDraw.Draw(img)
        self.draw(d, t, img)
        ln = self.cur_line(t)
        if ln is not None and self.show_box(t):
            draw_box(d, ln, t)
        return img

    def show_box(self, t):
        return True

    def draw(self, d, t, img):
        pass


class Title(Scene):
    music = 'title'
    min_dur = 6.2
    lines = []

    def setup(self):
        self.bg = Image.fromarray(sky_img([(8, 8, 40), (40, 20, 80), (120, 40, 90)]))
        d = ImageDraw.Draw(self.bg)
        pts = [(0, 150)]
        rnd = random.Random(3)
        for x in range(0, W + 20, 20):
            pts.append((x, 118 + rnd.randint(-14, 10)))
        pts += [(W, H), (0, H)]
        d.polygon(pts, fill=(30, 16, 50))
        pts2 = [(0, 165)] + [(x, 145 + int(8 * math.sin(x * .05))) for x in range(0, W + 10, 10)] + [(W, H), (0, H)]
        d.polygon(pts2, fill=(16, 8, 30))
        self.stars = [(rnd.randint(0, W), rnd.randint(0, 110), rnd.random() * 6) for _ in range(70)]
        self.sfx = [(4.6, 'start')]

    def draw(self, d, t, img):
        for sx, sy, ph in self.stars:
            if math.sin(t * 3 + ph) > -0.3:
                c = WHITE if math.sin(t * 3 + ph) > 0.6 else (150, 150, 200)
                d.point((sx, sy), fill=c)
        bob = int(round(math.sin(t * 2.5) * 2))
        # medallón
        text_c(d, W // 2, 22, "LA LEYENDA DE", (200, 200, 255), 1, BLK)
        text_c(d, W // 2, 40 + bob, "VAJTAN", GOLD, 4, (120, 40, 0))
        text_c(d, W // 2, 82 + bob, "SHANAVA", (255, 120, 60), 2, (80, 0, 0))
        text_c(d, W // 2, 110, "UNA HISTORIA REAL", WHITE, 1, BLK)
        if t < 4.6:
            if int(t * 2) % 2 == 0:
                text_c(d, W // 2, 136, "PRESS START", WHITE, 1, BLK)
        elif t < 6.0 and int(t * 12) % 2 == 0:
            text_c(d, W // 2, 136, "PRESS START", GOLD, 1, BLK)
        text_c(d, W // 2, 166, "(C) 1995-2026  VAJTAN SOFT", (150, 150, 190), 1)
        # banderitas
        flag(d, 30, 30, 'UA', t, 18, 12)
        flag(d, 272, 30, 'ES', t, 18, 12)


class Ukraine(Scene):
    music = 'ukraine'
    lines = [('NARRADOR', "Ucrania, 1995. Nace Vajtan Shanava Kolesnyk: madre ucraniana y padre georgiano."),
             ('NARRADOR', "Año 2003. Con 8 años, su familia toma una gran decisión..."),
             ('PADRE', "Hijo, nos vamos a España. Allí empieza una nueva vida."),
             ('VAJTAN NIÑO', "¿España? ¡Vale! Pero me llevo mi balón.")]

    def setup(self):
        arr = sky_img([(60, 130, 230), (150, 200, 250)], 90)
        arr[90:] = 0
        img = Image.fromarray(arr)
        d = ImageDraw.Draw(img)
        # arboleda lejana
        for x in range(0, W, 6):
            hh = 6 + int(4 * math.sin(x * 0.3) + 3 * math.sin(x * 0.11))
            R(d, x, 84 - hh, 7, hh + 6, (50, 110, 60))
        # campo de trigo
        arr2 = np.array(img)
        grad(arr2, 88, H, (250, 210, 70), (200, 150, 30), 5)
        img = Image.fromarray(arr2)
        d = ImageDraw.Draw(img)
        # casita ucraniana (jata)
        R(d, 30, 68, 50, 32, (245, 240, 225))
        d.polygon([(24, 70), (55, 48), (86, 70)], fill=(150, 110, 60))
        d.line([(24, 70), (55, 48), (86, 70)], fill=(110, 80, 40))
        R(d, 38, 76, 10, 10, (60, 120, 200))
        R(d, 42, 76, 2, 10, WHITE)
        R(d, 60, 80, 10, 20, (120, 70, 40))
        R(d, 30, 98, 50, 2, (200, 190, 170))
        # camino
        d.polygon([(64, 100), (72, 100), (150, 126), (110, 126)], fill=(190, 150, 90))
        self.bg = img
        self.clouds = [(20, 18, 1.0), (140, 30, 0.6), (240, 14, 0.8)]

    def draw(self, d, t, img):
        R(d, 270, 12, 18, 18, (255, 240, 150))
        R(d, 272, 10, 14, 22, (255, 240, 150))
        R(d, 268, 14, 22, 14, (255, 240, 150))
        for cx, cy, sp in self.clouds:
            x = int((cx + t * 6 * sp) % (W + 60)) - 40
            R(d, x, cy, 30, 6, WHITE)
            R(d, x + 6, cy - 4, 16, 6, WHITE)
        # espigas meciendose
        for i in range(0, W, 5):
            sway = int(round(math.sin(t * 2 + i * 0.2)))
            for row in (96, 106, 116):
                d.point((i + sway + (row % 3), row), fill=(255, 235, 130))
                d.point((i + sway + (row % 3), row - 1), fill=(230, 180, 50))
        # girasoles
        for gx in (200, 222, 244, 290):
            R(d, gx + 2, 96, 2, 26, (60, 130, 40))
            R(d, gx, 90, 6, 6, (255, 200, 0))
            R(d, gx + 2, 92, 2, 2, (90, 50, 20))
        i = 0
        for k, ln in enumerate(self.L):
            if t >= ln.start:
                i = k
        banner(d, "UCRANIA - 1995" if i == 0 else "UCRANIA - 2003")
        person(d, 120, 122, DAD, 'stand', t, 1)
        person(d, 104, 122, MOM, 'stand', t, 1)
        kx = 150 + int(math.sin(t * 2) * 3)
        person(d, kx, 122, KID, 'stand', t, -1)
        by = 118 - abs(int(math.sin(t * 5) * 6))
        R(d, kx + 6, by, 5, 5, WHITE)
        R(d, kx + 7, by + 1, 2, 2, BLK)


class Journey(Scene):
    music = 'journey'
    lines = [('NARRADOR', "Miles de kilómetros. Un niño, una maleta y un montón de sueños."),
             ('VAJTAN NIÑO', "¿Falta mucho? ¿Falta mucho? ¿Falta muchooo?")]
    post = 1.4

    def setup(self):
        self.bg = Image.new('RGB', (W, H), BLK)
        rnd = random.Random(7)
        self.mnt = [rnd.randint(40, 70) for _ in range(40)]
        self.hill = [rnd.randint(78, 92) for _ in range(60)]
        self.stars = [(rnd.randint(0, W), rnd.randint(0, 70)) for _ in range(40)]

    def draw(self, d, t, img):
        f = t / self.dur
        day, dusk, night = (100, 170, 240), (240, 120, 80), (10, 10, 40)
        if f < 0.33:
            top = lerp(day, dusk, f / 0.33)
        elif f < 0.66:
            top = lerp(dusk, night, (f - .33) / .33)
        else:
            top = lerp(night, day, (f - .66) / .34)
        arr = np.array(img)
        grad(arr, 0, 100, shade(top, .8), top, 4)
        img.paste(Image.fromarray(arr))
        if 0.45 < f < 0.85:
            for sx, sy in self.stars:
                d.point((sx, sy), fill=WHITE)
        # montañas
        off = t * 8
        for i, h in enumerate(self.mnt):
            x = int(i * 20 - off) % (40 * 20) - 20
            d.polygon([(x - 20, 100), (x + 10, 100 - h + 20), (x + 40, 100)], fill=shade(top, .5))
        off2 = t * 30
        for i, h in enumerate(self.hill):
            x = int(i * 14 - off2) % (60 * 14) - 20
            R(d, x, h, 16, 100 - h + 2, shade((60, 130, 60), .6 + .4 * (1 - abs(f - .5))))
        R(d, 0, 100, W, 26, (70, 70, 80))
        R(d, 0, 100, W, 2, (120, 120, 120))
        for i in range(0, W + 40, 40):
            x = int(i - (t * 140) % 40)
            R(d, x, 112, 20, 2, (240, 220, 120))
        # postes
        for i in range(0, W + 90, 90):
            x = int(i - (t * 140) % 90)
            R(d, x, 70, 2, 30, (90, 60, 40))
            R(d, x - 4, 72, 10, 2, (90, 60, 40))
        # coche familiar
        cx, cy = 120, 104 + (1 if int(t * 8) % 2 else 0)
        R(d, cx, cy - 14, 44, 12, (200, 40, 50))
        R(d, cx + 8, cy - 24, 26, 10, (200, 40, 50))
        R(d, cx + 10, cy - 22, 10, 7, (150, 210, 250))
        R(d, cx + 22, cy - 22, 10, 7, (150, 210, 250))
        R(d, cx + 24, cy - 21, 5, 5, KID['skin'])
        R(d, cx + 24, cy - 22, 5, 2, KID['hair'])
        R(d, cx + 10, cy - 30, 10, 6, (140, 90, 40))
        R(d, cx + 22, cy - 29, 9, 5, (60, 100, 160))
        R(d, cx + 42, cy - 12, 3, 3, (255, 240, 150))
        for wx in (cx + 6, cx + 30):
            R(d, wx, cy - 4, 9, 9, BLK)
            R(d, wx + 3, cy - 1, 3, 3, (180, 180, 180))
            a = t * 20
            d.point((wx + 4 + int(round(math.cos(a) * 3)), cy + int(round(math.sin(a) * 3))), fill=WHITE)
        # mapa de progreso
        R(d, 20, 8, 280, 20, (16, 22, 56))
        R(d, 20, 8, 280, 1, WHITE)
        R(d, 20, 27, 280, 1, WHITE)
        text(d, 24, 7, "UCRANIA", (120, 180, 255))
        text(d, 250, 7, "ESPAÑA", (255, 190, 60))
        R(d, 40, 22, 240, 1, (120, 120, 160))
        for i in range(40, 281, 12):
            R(d, i, 21, 2, 3, (160, 160, 200))
        px = 40 + int(240 * min(1, t / (self.dur - 0.8)))
        R(d, 40, 21, px - 40, 3, GOLD)
        R(d, px - 3, 18, 7, 5, (200, 40, 50))
        R(d, px - 2, 23, 2, 2, BLK)
        R(d, px + 2, 23, 2, 2, BLK)


class Spain(Scene):
    music = 'spain'
    lines = [('NARRADOR', "España. Nuevo país, nuevo idioma, nuevo cole."),
             ('COMPAÑERO', "¡Hola! ¿Cómo te llamas? ¿Juegas al fútbol?"),
             ('VAJTAN NIÑO', "Me... llamo... Vajtan. ¡Sí! ¡Fútbol!"),
             ('NARRADOR', "Poco a poco aprende el idioma. España ya es su casa.")]

    def setup(self):
        arr = sky_img([(90, 170, 250), (190, 230, 255)], 80)
        img = Image.fromarray(arr)
        d = ImageDraw.Draw(img)
        R(d, 0, 80, W, 100, (230, 200, 150))
        rnd = random.Random(11)
        x = -10
        while x < W:
            w = rnd.randint(28, 44)
            h = rnd.randint(24, 40)
            R(d, x, 84 - h, w, h, (248, 246, 240))
            d.polygon([(x - 3, 84 - h), (x + w // 2, 84 - h - 10), (x + w + 3, 84 - h)], fill=(220, 110, 50))
            for wy in range(84 - h + 6, 80, 12):
                for wx in range(x + 5, x + w - 6, 12):
                    R(d, wx, wy, 6, 7, (60, 120, 180))
                    R(d, wx - 1, wy + 7, 8, 1, (180, 60, 40))
            x += w + 2
        # colegio
        R(d, 176, 40, 110, 64, (240, 190, 120))
        R(d, 176, 38, 110, 4, (180, 90, 50))
        R(d, 196, 44, 70, 13, (40, 70, 140))
        text(d, 200, 43, "COLEGIO", WHITE)
        for wx in range(184, 280, 18):
            R(d, wx, 62, 10, 12, (120, 180, 220))
        R(d, 222, 80, 18, 24, (120, 60, 30))
        R(d, 0, 104, W, 22, (200, 170, 120))
        for gx in range(0, W, 16):
            R(d, gx, 104, 1, 22, (185, 155, 110))
        self.bg = img

    def draw(self, d, t, img):
        R(d, 24, 10, 20, 20, (255, 230, 90))
        for a in range(8):
            ang = a * math.pi / 4 + t
            d.line([(34 + math.cos(ang) * 14, 20 + math.sin(ang) * 14),
                    (34 + math.cos(ang) * 18, 20 + math.sin(ang) * 18)], fill=(255, 230, 90))
        flag(d, 150, 26, 'ES', t)
        banner(d, "ESPAÑA - 2003", 60, 6)
        t3 = self.L[2].start
        if t < t3:
            person(d, 118, 122, KID, 'stand', t, 1)
            fx = max(170, 250 - t * 30)
            person(d, fx, 122, FRIEND, 'walk' if fx > 170 else 'stand', t, -1)
        else:
            u = t - t3
            person(d, 118, 122, KID, 'walk' if int(u * 2) % 2 else 'stand', t, 1)
            person(d, 170, 122, FRIEND, 'stand', t, -1)
            ph = (u * 0.9) % 2
            p = ph if ph < 1 else 2 - ph
            bx = 124 + p * 38
            by = 116 - math.sin(p * math.pi) * 22
            R(d, bx, by, 5, 5, WHITE)
            R(d, bx + 1, by + 1, 2, 2, BLK)


class Garage(Scene):
    music = 'garage'
    lines = [('NARRADOR', "Su padre, su gran ejemplo, le mete el gusanillo del kickboxing."),
             ('PADRE', "Guardia arriba, Vajtan. Siempre. El que no se rinde, gana."),
             ('VAJTAN NIÑO', "¡Hai! ¡Pam! ¡Pam! ¡Pam!")]

    def setup(self):
        img = Image.new('RGB', (W, H), (120, 60, 50))
        d = ImageDraw.Draw(img)
        for row, yy in enumerate(range(0, 110, 6)):
            off = 0 if row % 2 else 7
            for xx in range(-14, W, 14):
                R(d, xx + off, yy, 13, 5, (150, 70, 55) if (xx // 14 + row) % 3 else (135, 64, 50))
        R(d, 0, 108, W, 20, (80, 80, 90))
        R(d, 0, 108, W, 2, (40, 40, 50))
        R(d, 30, 20, 50, 34, (40, 40, 60))
        R(d, 32, 22, 46, 30, (20, 30, 70))
        R(d, 54, 22, 2, 30, (40, 40, 60))
        R(d, 250, 16, 44, 56, (240, 230, 200))
        R(d, 252, 18, 40, 20, (200, 30, 40))
        text(d, 262, 20, "K1", WHITE, 2)
        text(d, 254, 44, "TORNEO", BLK)
        text(d, 257, 55, "2003", BLK)
        R(d, 0, 0, W, 6, (60, 50, 50))
        self.bg = img
        self.sfx = []

    def schedule(self, t0):
        super().schedule(t0)
        s = self.L[2].start + 0.6
        self.hits = []
        while s < self.dur - 0.6:
            self.hits.append(s)
            s += 0.7
        self.sfx = [(h + 0.08, 'hit') for h in self.hits]

    def draw(self, d, t, img):
        banner(d, "EL GARAJE - ENTRENAMIENTO", 100, 8)
        ang = 0.0
        last = None
        for h in self.hits:
            if h <= t:
                ang += 0.35 * math.exp(-(t - h) * 1.5) * math.sin((t - h) * 7)
                last = h
        ang += 0.03 * math.sin(t * 2)
        px, py = 190, 6
        for i in range(24):
            yy = py + i
            xx = px + math.sin(ang) * i
            d.point((int(xx), yy), fill=(160, 160, 170))
        for i in range(40):
            xx = px + math.sin(ang) * (24 + i)
            yy = py + 24 + i
            c = (180, 30, 40) if 4 < i < 36 else (60, 60, 60)
            R(d, int(xx) - 7, yy, 15, 1, c)
            d.point((int(xx) - 7, yy), fill=(120, 20, 30))
        pose = 'guard'
        if last is not None and t - last < 0.25:
            pose = 'kick' if self.hits.index(last) % 2 == 0 else 'punch'
        if t < self.L[2].start:
            pose = 'guard' if t > self.L[1].start else 'stand'
        person(d, 168, 118, KID, pose, t, 1)
        person(d, 110, 118, DAD, 'stand' if t < self.L[1].start else 'guard', t, 1)
        if last is not None and t - last < 0.12:
            sx = int(px + math.sin(ang) * 40) - 10
            for a in range(6):
                d.line([(sx, 60), (sx + math.cos(a) * 8, 60 + math.sin(a) * 8)], fill=GOLD)
            text(d, sx - 14, 36, "POW!", GOLD, 1, BLK)


class Parkour(Scene):
    music = 'parkour'
    lines = [('NARRADOR', "Años después descubre el parkour: saltos, tejados y vídeos para su canal."),
             ('VAJTAN (TEEN)', "¡Dale a grabar! ¡Allá voooy!")]
    min_dur = 10.0
    V, P, J, X = 75.0, 1.5, 0.55, 110

    def setup(self):
        self.bg = Image.fromarray(sky_img([(60, 30, 90), (220, 80, 90), (255, 170, 80)], 126))
        d = ImageDraw.Draw(self.bg)
        rnd = random.Random(5)
        self.far = [(rnd.randint(14, 30), rnd.randint(20, 55)) for _ in range(60)]
        self.jumps = [0.9 + k * self.P for k in range(30)]
        self.gaps = [self.X + self.V * (tk + self.J / 2) for tk in self.jumps]
        self.sfx = [(tk, 'jump') for tk in self.jumps]

    def schedule(self, t0):
        super().schedule(t0)
        self.sfx = [(tk, 'jump') for tk in self.jumps if tk < self.dur - 0.3]

    def roof(self, b):
        return 94 + ((b * 7) % 5 - 2) * 3

    def runner_y(self, t):
        b = 0
        for k, tk in enumerate(self.jumps):
            if tk <= t < tk + self.J:
                u = (t - tk) / self.J
                return self.roof(k) + (self.roof(k + 1) - self.roof(k)) * u - math.sin(u * math.pi) * 26, True
            if tk + self.J <= t:
                b = k + 1
        return self.roof(b), False

    def draw(self, d, t, img):
        R(d, 250, 50, 26, 26, (255, 220, 120))
        cam = self.V * t
        # ciudad lejana
        x = -int(cam * 0.2) % 800 - 800
        for w, h in self.far * 2:
            R(d, x, 100 - h, w, h + 30, (110, 40, 80))
            x += w + 2
            if x > W:
                break
        # tejados
        edges = [-10000] + self.gaps
        for b in range(len(edges) - 1):
            x0 = edges[b] + (13 if b > 0 else 0) - cam
            x1 = edges[b + 1] - 13 - cam
            if x1 < -5 or x0 > W + 5:
                continue
            ry = self.roof(b)
            R(d, x0, ry, x1 - x0, 130 - ry, (50, 30, 60))
            R(d, x0, ry, x1 - x0, 2, (120, 80, 110))
            for wy in range(ry + 8, 126, 10):
                for wx in range(int(x0) + 6, int(x1) - 6, 10):
                    lit = (wx // 10 * 7 + wy + b) % 3 == 0
                    R(d, wx, wy, 4, 5, (255, 220, 120) if lit else (80, 50, 90))
            if b % 2 == 0:
                R(d, x0 + 10, ry - 12, 2, 12, (40, 20, 50))
                R(d, x0 + 7, ry - 12, 8, 1, (40, 20, 50))
        y, jumping = self.runner_y(t)
        person(d, self.X, y, TEEN, 'jump' if jumping else 'run', t, 1)
        # HUD de camara
        for cx, cy, dx, dy in ((8, 8, 1, 1), (311, 8, -1, 1), (8, 117, 1, -1), (311, 117, -1, -1)):
            R(d, min(cx, cx + dx * 10), cy, 11, 1, WHITE)
            R(d, cx, min(cy, cy + dy * 10), 1, 11, WHITE)
        if int(t * 2) % 2 == 0:
            R(d, 250, 14, 5, 5, (255, 40, 40))
        secs = int(t)
        text(d, 258, 12, "REC 00:%02d" % secs, WHITE, 1, BLK)
        R(d, 16, 14, 14, 10, (230, 30, 30))
        d.polygon([(21, 16), (21, 21), (26, 18)], fill=WHITE)
        text(d, 34, 12, "MI CANAL", WHITE, 1, BLK)


class Art(Scene):
    music = 'art'
    lines = [('NARRADOR', "Estudia en la Escuela de Arte Antonio López. Se hace ilustrador y experto en marketing digital."),
             ('VAJTAN (TEEN)', "Pero me falta algo... ¡echo de menos el ring!")]

    ART = ["....####....",
           "...#GGGG#...",
           "..#GGGGGG#..",
           ".#GGGGGGGG#.",
           ".#GGGGWGGG#.",
           ".#GGGGGGGG#.",
           ".#GGGGGGG#..",
           "..#GGGGG#...",
           "...#GGG#....",
           "...#WWW#....",
           "...#WWW#....",
           "....###....."]

    def setup(self):
        img = Image.new('RGB', (W, H), (70, 80, 120))
        d = ImageDraw.Draw(img)
        for xx in range(0, W, 16):
            R(d, xx, 0, 1, 104, (80, 90, 132))
        R(d, 20, 16, 60, 44, (30, 30, 50))
        R(d, 22, 18, 56, 40, (20, 20, 60))
        for i, (sx, sy) in enumerate([(30, 24), (60, 30), (45, 44), (70, 50), (26, 50)]):
            d.point((sx, sy), fill=WHITE)
        R(d, 60, 22, 8, 8, (240, 240, 200))
        R(d, 250, 20, 40, 30, (200, 170, 90))
        R(d, 253, 23, 34, 24, (250, 245, 230))
        text(d, 256, 26, "ARTE", BLK)
        text(d, 256, 36, "ILUS.", (150, 30, 40))
        R(d, 0, 104, W, 24, (110, 70, 40))
        R(d, 90, 88, 160, 6, (150, 100, 60))
        R(d, 96, 94, 6, 30, (120, 80, 50))
        R(d, 238, 94, 6, 30, (120, 80, 50))
        self.bg = img

    def draw(self, d, t, img):
        banner(d, "ARTE Y DISEÑO", 110, 6)
        # monitor 1: ilustracion pixel a pixel
        R(d, 104, 44, 60, 44, (40, 40, 50))
        R(d, 107, 47, 54, 36, (230, 230, 240))
        R(d, 130, 88, 8, 4, (40, 40, 50))
        cols = {'#': BLK, 'G': (200, 30, 40), 'W': WHITE}
        total = sum(ch != '.' for row in self.ART for ch in row)
        n = int(min(1, t / 6) * total)
        k = 0
        for ry, row in enumerate(self.ART):
            for rx, ch in enumerate(row):
                if ch == '.':
                    continue
                if k < n:
                    R(d, 116 + rx * 3, 48 + ry * 3, 3, 3, cols[ch])
                k += 1
        # monitor 2: grafica de marketing
        R(d, 176, 44, 60, 44, (40, 40, 50))
        R(d, 179, 47, 54, 36, (20, 30, 40))
        text(d, 181, 46, "LIKES", (120, 255, 160))
        for i in range(6):
            hh = int(min(1, max(0, (t - 4) / 5)) * (5 + i * 4 + (i % 2) * 3))
            R(d, 184 + i * 8, 80 - hh, 6, hh, (80, 220, 140))
        R(d, 180, 80, 52, 1, (120, 120, 120))
        person(d, 150, 112, TEEN, 'draw', t, 1)
        R(d, 90, 88, 160, 6, (150, 100, 60))
        R(d, 150, 84, 18, 4, (60, 60, 70))
        last = self.L[1].start
        if t > last + 0.5:
            text(d, 140, 62 - int(t * 2) % 2, "?", GOLD, 2, BLK)


class Comeback(Scene):
    music = 'covid'
    lines = [('NARRADOR', "Con 22 años vuelve al kickboxing. Esta vez, para competir en serio."),
             ('NARRADOR', "2020. Pandemia. Gimnasios cerrados. Todo parado..."),
             ('VAJTAN', "Si quieres llegar alto, tienes que ponerle empeño. ¡Yo no paro!")]

    def setup(self):
        arr = sky_img([(10, 10, 30), (30, 30, 70)], 100)
        img = Image.fromarray(arr)
        d = ImageDraw.Draw(img)
        R(d, 0, 100, W, 28, (50, 50, 60))
        R(d, 170, 30, 130, 70, (90, 90, 100))
        R(d, 176, 44, 118, 56, (130, 130, 140))
        for yy in range(46, 100, 4):
            R(d, 176, yy, 118, 1, (100, 100, 110))
        R(d, 180, 32, 110, 11, (30, 30, 30))
        text(d, 186, 31, "GIMNASIO", (255, 80, 80))
        R(d, 200, 60, 70, 16, WHITE)
        R(d, 201, 61, 68, 14, (220, 30, 30))
        text(d, 205, 62, "CERRADO", WHITE)
        R(d, 60, 20, 3, 82, (60, 60, 70))
        R(d, 52, 18, 14, 4, (60, 60, 70))
        self.bg = img

    def draw(self, d, t, img):
        i = 0
        for k, ln in enumerate(self.L):
            if t >= ln.start:
                i = k
        banner(d, "2017" if i == 0 else "2020", 6, 6)
        # cono de luz de farola
        for yy in range(22, 124):
            w = int((yy - 22) * 0.55)
            for xx in range(54 - w, 58 + w, 2):
                if (xx + yy) % 4 == 0:
                    d.point((xx, yy), fill=(90, 90, 60))
        R(d, 52, 21, 12, 2, (255, 240, 160))
        # lluvia
        for k in range(40):
            rx = (k * 37 + int(t * 40)) % W
            ry = (k * 53 + int(t * 180)) % 110
            R(d, rx, ry, 1, 3, (100, 110, 160))
        cyc = t % 1.2
        pose = 'guard'
        if cyc < 0.2:
            pose = 'punch'
        elif 0.5 < cyc < 0.72:
            pose = 'kick' if int(t / 1.2) % 2 else 'punch'
        person(d, 100, 120, VAJ, pose, t, 1)
        if int(t * 5) % 3 == 0:
            d.point((96, 80), fill=(150, 200, 255))
            d.point((108, 84), fill=(150, 200, 255))


class Fight(Scene):
    music = 'fight'
    lines = [('LOCUTOR', "¡Con 26 años debuta como profesional! ¡Round 1... FIGHT!"),
             ('NARRADOR', "Campeón de España de K1, categoría +91 kg, en Guadalajara."),
             ('NARRADOR', "Récord K1 profesional: 7-3. En MMA: 1-1, con debut en el Albacete Fight Championship.")]
    pre = 0.3
    min_dur = 16.0

    def setup(self):
        img = Image.new('RGB', (W, H), (12, 10, 24))
        d = ImageDraw.Draw(img)
        R(d, 0, 118, W, 10, (30, 60, 150))
        R(d, 0, 118, W, 2, (80, 120, 220))
        R(d, 0, 128, W, 52, (20, 20, 30))
        self.bg = img
        rnd = random.Random(2)
        self.crowd = [(x, 50 + row * 10, rnd.random() * 6,
                       rnd.choice([(230, 180, 140), (200, 150, 110), (150, 100, 70), (240, 200, 170)]),
                       rnd.choice([(40, 30, 30), (200, 160, 60), (90, 50, 30), (20, 20, 20)]))
                      for row in range(4) for x in range(-4 + (row % 2) * 5, W, 10)]
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
        for tm, w, kind in self.ev:
            if tm + 0.08 <= t and w != who:
                v -= {'punch': 12, 'kick': 18}[kind] if who == 'R' else 10
        if who == 'R' and t >= self.ko + 0.08:
            v = 0
        return max(0, v)

    def draw(self, d, t, img):
        # focos
        for fx in (60, 160, 260):
            sw = math.sin(t * 1.3 + fx) * 30
            d.polygon([(fx, 0), (fx + sw - 30, 118), (fx + sw + 30, 118)], fill=(30, 28, 50))
        for x, y, ph, sk, hr in self.crowd:
            by = int(abs(math.sin(t * 6 + ph)) * 2)
            R(d, x, y - by, 7, 7, shade(sk, .55))
            R(d, x, y - by, 7, 2, shade(hr, .6))
            R(d, x - 1, y + 7 - by, 9, 6, shade((80, 80, 120), .6))
            if t > self.ko and int(t * 4 + ph) % 2:
                R(d, x + 1, y - 6 - by, 2, 5, shade(sk, .6))
        # ring
        R(d, 30, 76, 4, 44, (200, 200, 210))
        R(d, 286, 76, 4, 44, (200, 200, 210))
        for i, c in enumerate([(220, 40, 40), WHITE, (40, 80, 220)]):
            R(d, 34, 80 + i * 12, 252, 2, c)
        vx, rx = 138, 184
        vpose, rpose = 'guard', 'guard'
        vflash = rflash = False
        spark = None
        for tm, who, kind in self.ev:
            if tm <= t < tm + 0.25:
                if who == 'V':
                    vpose = kind
                    vx += 4
                else:
                    rpose = kind
                    rx -= 4
            if tm + 0.08 <= t < tm + 0.35:
                if who == 'V':
                    rx += 4
                    rflash = int(t * 20) % 2 == 0
                    spark = (rx - 10, 92 if kind == 'punch' else 100)
                else:
                    vx -= 4
                    vflash = int(t * 20) % 2 == 0
                    spark = (vx + 10, 92)
        bob = 1 if int(t * 4) % 2 else 0
        if t > self.ko + 0.3:
            person(d, rx + 16, 118, RIVAL, 'ko', t, -1)
            vpose = 'win' if t > self.ko + 1.0 else 'guard'
            person(d, vx, 118, VAJ_FIGHT, vpose, t, 1)
        else:
            person(d, vx, 118 - bob, VAJ_FIGHT, vpose, t, 1, vflash)
            person(d, rx, 118 - (1 - bob), RIVAL, rpose, t, -1, rflash)
        if spark:
            sx, sy = spark
            for a in range(8):
                ang = a * math.pi / 4
                d.line([(sx, sy), (sx + math.cos(ang) * 7, sy + math.sin(ang) * 7)], fill=GOLD)
            R(d, sx - 1, sy - 1, 3, 3, WHITE)
        # HUD
        for side, name, who in ((0, "VAJTAN", 'V'), (1, "RIVAL", 'R')):
            x0 = 8 if side == 0 else 178
            text(d, x0 if side == 0 else 312 - len(name) * 6, 4, name, WHITE, 1, BLK)
            R(d, x0 - 1, 15, 136, 9, WHITE)
            R(d, x0, 16, 134, 7, (120, 0, 0))
            v = self.hp(who, t) / 100
            w = int(134 * v)
            if side == 0:
                R(d, x0, 16, w, 7, GOLD)
                R(d, x0, 16, w, 2, (255, 240, 150))
            else:
                R(d, x0 + 134 - w, 16, w, 7, GOLD)
                R(d, x0 + 134 - w, 16, w, 2, (255, 240, 150))
        timer = max(0, 99 - int(t * 2)) if t < self.ko else max(0, 99 - int(self.ko * 2))
        R(d, 147, 4, 26, 22, BLK)
        text_c(d, 160, 6, "%02d" % timer, GOLD, 2)
        if 0.3 < t < 1.4:
            text_c(d, W // 2, 44, "ROUND 1", WHITE, 3, (160, 0, 0))
        elif 1.4 <= t < 2.5 and int(t * 10) % 2 == 0:
            text_c(d, W // 2, 44, "FIGHT!", GOLD, 4, (160, 0, 0))
        if self.ko + 0.2 < t < self.ko + 3.2 and int(t * 6) % 2 == 0:
            text_c(d, W // 2, 36, "K.O.!", (255, 60, 40), 5, BLK)
        if t > self.ko + 3.2:
            R(d, 98, 32, 124, 30, BLK)
            R(d, 99, 33, 122, 28, (120, 20, 30))
            text_c(d, W // 2, 34, "CAMPEON DE ESPAÑA", GOLD, 1, BLK)
            text_c(d, W // 2, 46, "K1  +91 KG", WHITE, 1, BLK)
            rnd = random.Random(int(t * 8))
            for _ in range(30):
                cx = rnd.randint(0, W)
                cy = int((rnd.randint(0, 120) + t * 60) % 120)
                d.point((cx, cy), fill=rnd.choice([GOLD, (255, 60, 60), (80, 160, 255), WHITE]))


class Ending(Scene):
    music = 'end'
    lines = [('VAJTAN', "Llegué con 8 años sin saber el idioma. Hoy, 23 años después, esta es mi casa."),
             ('VAJTAN', "Ucrania, Georgia y España en el corazón. ¡No dejes que nada te detenga!")]
    post = 4.6

    def setup(self):
        arr = sky_img([(60, 40, 110), (240, 110, 80), (255, 200, 110)], 96)
        img = Image.fromarray(arr)
        d = ImageDraw.Draw(img)
        R(d, 0, 96, W, 84, (210, 170, 70))
        for yy in range(98, 128, 4):
            R(d, 0, yy, W, 1, (190, 150, 60))
        # skyline Albacete lejano
        rnd = random.Random(9)
        x = 150
        while x < 250:
            w, h = rnd.randint(8, 16), rnd.randint(8, 22)
            R(d, x, 96 - h, w, h, (120, 70, 90))
            x += w + 1
        self.bg = img

    def mill(self, d, x, y, t, s=1.0):
        R(d, x - 5, y, 10, 30, (245, 240, 230))
        R(d, x - 7, y + 30, 14, 2, (200, 190, 180))
        d.polygon([(x - 7, y), (x, y - 8), (x + 7, y)], fill=(60, 50, 60))
        R(d, x - 2, y + 20, 4, 10, (90, 60, 40))
        for k in range(4):
            a = t * 1.5 + k * math.pi / 2
            ex, ey = x + math.cos(a) * 22 * s, y - 2 + math.sin(a) * 22 * s
            d.line([(x, y - 2), (ex, ey)], fill=(80, 60, 50), width=1)
            px, py = -math.sin(a) * 4, math.cos(a) * 4
            mx, my = x + math.cos(a) * 8, y - 2 + math.sin(a) * 8
            d.polygon([(mx, my), (ex, ey), (ex + px, ey + py), (mx + px, my + py)], fill=(230, 220, 200))
        R(d, x - 1, y - 3, 3, 3, BLK)

    def draw(self, d, t, img):
        R(d, 150, 64, 30, 30, (255, 230, 150))
        R(d, 147, 70, 36, 18, (255, 230, 150))
        self.mill(d, 40, 60, t)
        self.mill(d, 280, 66, t + 1)
        banner(d, "ALBACETE - 2026", 108, 6)
        flag(d, 196, 58, 'UA', t)
        flag(d, 228, 58, 'GE', t + .5)
        flag(d, 260, 58, 'ES', t + 1)
        end_dialog = self.L[-1].end_type + HOLD
        person(d, 150, 122, VAJ, 'stand' if t < end_dialog else 'win', t, 1)
        if t >= end_dialog:
            u = t - end_dialog
            R(d, 0, 126, W, 54, BLK)
            R(d, 104, 18, 112, 60, BLK)
            R(d, 106, 20, 108, 56, (60, 20, 40))
            text_c(d, W // 2, 26, "FIN", GOLD, 5, (120, 30, 0))
            text_c(d, W // 2, 134, "GRACIAS POR JUGAR", WHITE, 1)
            cnt = max(0, 9 - int(u * 2.5))
            if int(u * 3) % 2 == 0:
                text_c(d, W // 2, 150, "¿CONTINUAR?  %d" % cnt, (255, 120, 60), 1)
            text_c(d, W // 2, 166, "BASADO EN LA VIDA DE VAJTAN SHANAVA", (140, 140, 180), 1)

    def show_box(self, t):
        return t < self.L[-1].end_type + HOLD


SCENES = [Title(), Ukraine(), Journey(), Spain(), Garage(), Parkour(), Art(), Comeback(), Fight(), Ending()]

# ---------------------------------------------------------------- AUDIO
MUSIC = {
    #            bpm, raiz midi, escala, progresion (grados), bateria, estilo
    'title':   (118, 60, 'maj', [0, 4, 5, 3], True, 1),
    'ukraine': (84, 57, 'min', [0, 3, 4, 0], False, 0),
    'journey': (132, 62, 'maj', [0, 4, 5, 3], True, 1),
    'spain':   (124, 55, 'maj', [0, 3, 4, 0], True, 1),
    'garage':  (140, 52, 'min', [0, 5, 6, 4], True, 2),
    'parkour': (150, 57, 'min', [0, 5, 2, 6], True, 2),
    'art':     (96, 53, 'maj', [0, 2, 3, 4], False, 0),
    'covid':   (100, 50, 'min', [0, 5, 3, 4], True, 0),
    'fight':   (162, 52, 'min', [0, 0, 5, 6], True, 2),
    'end':     (116, 60, 'maj', [3, 4, 2, 5, 3, 4, 0, 0], True, 1),
}
SCALES = {'maj': [0, 2, 4, 5, 7, 9, 11], 'min': [0, 2, 3, 5, 7, 8, 10]}


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tone(buf, t0, dur, f, vol, kind='sq', duty=0.5, sweep=0.0):
    i0 = int(t0 * SR)
    n = int(dur * SR)
    if i0 >= len(buf) or n <= 0:
        return
    n = min(n, len(buf) - i0)
    tt = np.arange(n) / SR
    ff = f * (1 + sweep * tt / max(dur, 1e-3))
    ph = np.cumsum(ff) / SR
    if kind == 'sq':
        w = np.where((ph % 1) < duty, 1.0, -1.0)
    elif kind == 'tri':
        w = 4 * np.abs((ph % 1) - 0.5) - 1
    else:
        w = np.sin(2 * np.pi * ph)
    a = min(n, int(0.004 * SR))
    r = min(n, int(0.03 * SR))
    env = np.ones(n)
    env[:a] = np.linspace(0, 1, a)
    env[n - r:] *= np.linspace(1, 0, r)
    env *= np.exp(-tt * (1.5 / max(dur, 0.05)))
    buf[i0:i0 + n] += w * env * vol


def noise(buf, t0, dur, vol, decay=30.0, rng=np.random.default_rng(1), lp=1):
    i0 = int(t0 * SR)
    n = min(int(dur * SR), len(buf) - i0)
    if n <= 0:
        return
    w = rng.uniform(-1, 1, n)
    if lp > 1:
        w = np.convolve(w, np.ones(lp) / lp, mode='same')
    tt = np.arange(n) / SR
    buf[i0:i0 + n] += w * np.exp(-tt * decay) * vol


def chord(root, sc, deg):
    return [root + sc[(deg + k) % 7] + 12 * ((deg + k) // 7) for k in (0, 2, 4)]


def music_section(buf, t0, dur, style, seed):
    bpm, root, scn, prog, drums, energy = MUSIC[style]
    sc = SCALES[scn]
    beat = 60.0 / bpm
    bar = beat * 4
    rng = random.Random(seed)
    nbars = int(math.ceil(dur / bar))
    mel_prev = 7
    # motivo repetido (da sensacion de "tema")
    motif = []
    for b in range(2):
        for s in range(8):
            motif.append(rng.choice([None, 0, 2, 4, 1, 2, 4, 5]) if s % 2 else rng.choice([0, 2, 4, 4, 2]))
    for b in range(nbars):
        deg = prog[b % len(prog)]
        ch = chord(root, sc, deg)
        tb = t0 + b * bar
        # bajo
        for s in range(8 if energy else 4):
            step = bar / (8 if energy else 4)
            n = ch[0] - 24 + (12 if (energy and s % 2) else 0)
            tone(buf, tb + s * step, step * 0.9, mtof(n), 0.16, 'tri')
        # arpegio
        steps = 16 if energy >= 1 else 8
        for s in range(steps):
            step = bar / steps
            n = ch[s % 3] + (12 if (s // 3) % 2 else 0)
            tone(buf, tb + s * step, step * 0.8, mtof(n), 0.035, 'sq', 0.125)
        # melodia
        for s in range(8):
            step = bar / 8
            m = motif[(b % 2) * 8 + s]
            if m is None:
                continue
            if b % 4 == 3 and s > 3:
                continue
            idx = deg + m
            n = root + 12 + sc[idx % 7] + 12 * (idx // 7)
            ln = step * (2 if s % 2 == 0 and motif[(b % 2) * 8 + min(7, s + 1)] is None else 1) * 0.9
            tone(buf, tb + s * step, ln, mtof(n), 0.07, 'sq', 0.5 if energy else 0.25)
        # bateria
        if drums:
            for bt in range(4):
                tt = tb + bt * beat
                if bt % 2 == 0 or energy == 2:
                    tone(buf, tt, 0.12, 120, 0.35, 'sin', sweep=-0.6)
                if bt % 2 == 1:
                    noise(buf, tt, 0.15, 0.18, 22, lp=2)
                if energy >= 1:
                    noise(buf, tt + beat / 2, 0.04, 0.06, 90)
                    noise(buf, tt, 0.04, 0.05, 90)


def sfx(buf, t, kind):
    if kind == 'start':
        for i, n in enumerate([72, 76, 79, 84, 88]):
            tone(buf, t + i * 0.05, 0.12, mtof(n), 0.18, 'sq', 0.25)
    elif kind == 'hit':
        noise(buf, t, 0.12, 0.55, 35, lp=3)
        tone(buf, t, 0.1, 180, 0.4, 'sq', 0.5, sweep=-0.7)
    elif kind == 'bighit':
        noise(buf, t, 0.22, 0.7, 20, lp=4)
        tone(buf, t, 0.2, 140, 0.5, 'sq', 0.5, sweep=-0.8)
    elif kind == 'jump':
        tone(buf, t, 0.16, 330, 0.16, 'sq', 0.25, sweep=1.5)
    elif kind == 'ko':
        for i, n in enumerate([76, 72, 67, 64, 60, 55]):
            tone(buf, t + i * 0.09, 0.14, mtof(n), 0.2, 'sq', 0.5)
        noise(buf, t, 0.8, 0.3, 4, lp=6)
    elif kind == 'bell':
        for k in range(3):
            tone(buf, t + k * 0.22, 0.5, 1320, 0.25, 'sin')
            tone(buf, t + k * 0.22, 0.5, 1980, 0.1, 'sin')


def build_audio(total):
    n = int(total * SR) + SR
    mus = np.zeros(n)
    fx = np.zeros(n)
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
        # los "pi pi pi" del texto
        rng = random.Random(i)
        for ln in sc.L:
            base = BEEP_F[ln.who]
            for ch, tm in zip(ln.flat, ln.times):
                if ch.isalnum():
                    f0 = base * (1 + rng.uniform(-0.04, 0.04))
                    tone(fx, sc.t0 + tm, 0.035, f0, 0.12, 'sq', 0.5)
    out = mus * 0.8 + fx
    out = np.tanh(out * 1.1) * 0.9
    return out[:int(total * SR)]


def write_wav(path, x):
    d = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(d.tobytes())


# ---------------------------------------------------------------- RENDER
def main():
    preview = '--preview' in sys.argv
    t = 0.0
    for sc in SCENES:
        sc.setup()
        sc.schedule(t)
        if isinstance(sc, (Title,)):
            sc.sfx = [(4.6, 'start')]
        t += sc.dur
    total = t
    for sc in SCENES:
        print("%-10s start %6.2f dur %5.2f" % (type(sc).__name__, sc.t0, sc.dur))
    print("TOTAL %.2f s" % total)
    if preview:
        os.makedirs(os.path.join(OUT_DIR, 'preview'), exist_ok=True)
        for sc in SCENES:
            for k, f in enumerate((0.25, 0.6, 0.9)):
                img = sc.frame(sc.dur * f).resize((W * 3, H * 3), Image.NEAREST)
                img.save(os.path.join(OUT_DIR, 'preview', '%s_%d.png' % (type(sc).__name__, k)))
        return
    wav = os.path.join(OUT_DIR, '_audio.wav')
    write_wav(wav, build_audio(total))
    scan = np.ones((H * SCALE, 1, 1), np.float32)
    scan[SCALE - 1::SCALE] = 0.82       # scanlines tipo CRT
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
        fade = max(0.0, fade)
        # fundido "por pasos" como en consola
        fade = round(fade * 6) / 6
        a = a * fade
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
