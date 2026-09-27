"""Personajes chibi estilo GBC/GBA: vistas front/side/back, poses y contorno."""
import math
import numpy as np
from PIL import Image, ImageDraw

OUT = (30, 34, 40, 255)
SK = (246, 196, 150)
SKD = (214, 150, 110)


def sh(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c[:3])


def L_(**kw):
    base = dict(size='adult', skin=SK, hair=(60, 40, 30), style='short', shirt=(60, 110, 220), pants=(50, 50, 90),
                shoes=(90, 50, 30), beard=None, stache=False, glasses=False, hat=None, halo=False, dress=None,
                gloves=None, shirtless=False, coat=False)
    base.update(kw)
    return base


PAPA = L_(hair=(40, 30, 26), shirt=(170, 60, 50), pants=(56, 62, 100), stache=True, shoes=(80, 50, 30))
PAPA_WIN = L_(**dict(PAPA, shirt=(110, 80, 56), coat=True))
MAMA = L_(size='adult', skin=(250, 208, 170), hair=(236, 196, 100), style='long', shirt=(250, 250, 244),
          dress=(60, 110, 200), shoes=(150, 50, 50))
MAMA_WIN = L_(**dict(MAMA, shirt=(130, 70, 96), dress=(90, 60, 100)))
KID = L_(size='kid', hair=(60, 40, 30), style='kid', shirt=(70, 130, 230), pants=(52, 52, 100))
KID5 = L_(**dict(KID, size='small', shirt=(190, 70, 60), coat=True))
SIS = L_(size='small', skin=(250, 208, 170), hair=(170, 110, 60), style='pony', shirt=(246, 130, 160),
         dress=(240, 120, 150), shoes=(210, 70, 90))
SIS3 = L_(**dict(SIS, size='tiny', shirt=(130, 70, 160), dress=(130, 70, 160)))
KID_KICK = L_(**dict(KID, shirt=(246, 246, 246), pants=(40, 40, 50), gloves=(220, 40, 40), shoes=SK))
TEEN12 = L_(size='teen', hair=(56, 40, 30), style='short', shirt=(120, 126, 140), pants=(46, 50, 80), shoes=(240, 240, 240))
TEEN16 = L_(size='teen', hair=(52, 36, 30), style='short', shirt=(40, 140, 120), pants=(50, 52, 76), shoes=(240, 240, 240))
TEEN_HALO = L_(**dict(TEEN16, halo=True, shirt=(220, 220, 228)))
YOUNG = L_(hair=(46, 32, 28), style='short', beard=(100, 70, 54), shirt=(40, 40, 48), pants=(54, 58, 84),
           shoes=(240, 240, 240))
YOUNG_TRAIN = L_(**dict(YOUNG, gloves=(220, 40, 40), pants=(34, 34, 40), shoes=(60, 60, 64)))
DOORMAN = L_(**dict(YOUNG, shirt=(20, 20, 24), pants=(20, 20, 24), shoes=(14, 14, 16)))
VAJ = L_(**dict(YOUNG, style='bald', shirt=(34, 34, 40)))
VAJ_RED = L_(**dict(VAJ, shirt=(180, 66, 46)))
VAJ_FIGHT = L_(**dict(VAJ, shirtless=True, pants=(220, 40, 50), gloves=(220, 40, 50), shoes=SK))
RIVAL = L_(skin=(214, 160, 120), hair=(24, 24, 24), style='short', beard=(50, 36, 30), shirtless=True,
           pants=(40, 90, 220), gloves=(40, 90, 220), shoes=(214, 160, 120))
JUANMA = L_(skin=(236, 180, 140), hair=(210, 210, 210), beard=(226, 226, 226), glasses=True, hat=(220, 190, 110),
            shirt=(90, 130, 76), pants=(120, 96, 60))
GUEST1 = L_(hair=(240, 200, 100), style='long', shirt=(220, 70, 140), dress=(30, 30, 40))
GUEST2 = L_(hair=(40, 30, 20), shirt=(70, 170, 210))
GUEST3 = L_(hair=(130, 70, 30), shirt=(250, 150, 50))
KIDA = L_(**dict(KID, shirt=(50, 170, 80), hair=(130, 80, 30)))
KIDB = L_(**dict(KID, shirt=(230, 190, 50), hair=(30, 30, 30)))

SIZES = {  # head_w, head_h, body_h, leg_h, body_w
    'adult': (12, 11, 7, 5, 8),
    'teen': (12, 11, 6, 4, 8),
    'kid': (11, 10, 5, 3, 7),
    'small': (10, 9, 4, 3, 6),
    'tiny': (9, 9, 4, 2, 6),
}
CW, CH = 26, 32
_cache = {}


def _outline(a):
    m = a[..., 3] > 0
    dil = m.copy()
    dil[1:] |= m[:-1]
    dil[:-1] |= m[1:]
    dil[:, 1:] |= m[:, :-1]
    dil[:, :-1] |= m[:, 1:]
    a[dil & ~m] = OUT
    return a


def sprite(L, view='front', pose='stand', frame=0, talk=False, flash=False):
    key = (id(L), view, pose, frame, talk, flash)
    if key in _cache:
        return _cache[key]
    hw, hh, bh, lh, bw = SIZES[L['size']]
    img = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def R(x, y, w, h, c):
        if w > 0 and h > 0:
            d.rectangle([x, y, x + w - 1, y + h - 1], fill=c)

    cx = CW // 2
    fy = CH - 2              # fila de los pies
    skin, hair = L['skin'], L['hair']
    shirt = skin if L['shirtless'] else L['shirt']
    pants, shoes = L['pants'], L['shoes']
    glove = L['gloves']
    sitting = pose in ('sit', 'draw', 'type', 'sit_tv', 'sit_back')
    lh_ = 1 if sitting else lh
    btop = fy - lh_ - bh + 1
    htop = btop - hh + 1
    if pose == 'jump':
        btop -= 0
    # ---------------- PIERNAS
    if view == 'side':
        if sitting:
            R(cx - 2, fy - 2, 7, 2, pants)
            R(cx + 4, fy - 2, 2, 3, shoes)
        elif pose == 'kick':
            R(cx - 3, fy - lh + 1, 2, lh, pants)
            R(cx - 3, fy, 3, 1, shoes)
            R(cx - 1, btop + bh - 2, 9, 2, pants)
            R(cx + 8, btop + bh - 2, 2, 2, shoes)
        elif pose in ('jump', 'tuck'):
            R(cx - 2, fy - lh, 5, 2, pants)
            R(cx + 2, fy - lh + 1, 2, 2, shoes)
        else:
            sp = {0: 0, 1: 2, 2: 0, 3: -2}[frame % 4] if pose in ('walk', 'run') else 0
            if pose == 'run':
                sp = sp * 2 // 1
            R(cx - 1 + sp, fy - lh + 1, 2, lh, pants)
            R(cx - 1 - sp, fy - lh + 1, 2, lh, sh(pants, .8))
            R(cx - 1 + sp, fy, 3, 1, shoes)
            R(cx - 1 - sp, fy, 3, 1, sh(shoes, .8))
    else:
        if sitting:
            R(cx - 3, fy - 1, 6, 2, pants)
            R(cx - 3, fy, 2, 1, shoes)
            R(cx + 1, fy, 2, 1, shoes)
        else:
            up1 = 1 if (pose == 'walk' and frame % 2 == 1) else 0
            up2 = 1 if (pose == 'walk' and frame % 2 == 0 and frame > 0) else 0
            R(cx - 3, fy - lh + 1 - up1, 2, lh, pants)
            R(cx + 1, fy - lh + 1 - up2, 2, lh, sh(pants, .85))
            R(cx - 3, fy - up1, 3, 1, shoes)
            R(cx + 1, fy - up2, 3, 1, sh(shoes, .85))
    # ---------------- CUERPO
    bx0 = cx - bw // 2
    if view == 'side':
        bx0 = cx - 3
        bw_ = 6
    else:
        bw_ = bw
    if L['dress'] and not sitting:
        R(bx0 - 1, btop + 2, bw_ + 2, bh - 1 + min(lh, 3) - 1, L['dress'])
        R(bx0 + bw_ - 1, btop + 2, 2, bh - 1 + min(lh, 3) - 1, sh(L['dress'], .8))
    R(bx0, btop, bw_, bh, shirt)
    R(bx0 + bw_ - 2, btop, 2, bh, sh(shirt, .8))
    R(bx0, btop, bw_, 1, sh(shirt, 1.15))
    if L['shirtless']:
        d.point((cx - 2, btop + 2), fill=sh(skin, .8))
        d.point((cx + 1, btop + 2), fill=sh(skin, .8))
        d.point((cx - 1, btop + 4), fill=sh(skin, .85))
        d.point((cx, btop + 4), fill=sh(skin, .85))
    if not L['dress']:
        R(bx0, btop + bh - 1, bw_, 1, pants)
    if L['halo']:
        R(bx0, btop, bw_, bh, (226, 226, 234))
        R(bx0 + 1, btop + 1, 1, bh - 1, (160, 160, 172))
        R(bx0 + bw_ - 2, btop + 1, 1, bh - 1, (160, 160, 172))
    # ---------------- BRAZOS
    hand = glove or skin
    gs = 2 if glove else 1
    sleeve = shirt if not L['shirtless'] else skin
    if view == 'side':
        ay = btop + 1
        if pose == 'punch':
            R(cx, ay, 8, 2, sleeve)
            R(cx + 8, ay - 1, 3, 3, hand)
        elif pose in ('guard', 'kick'):
            R(cx + 1, ay, 3, 2, sleeve)
            R(cx + 3, ay - 2, 2 + gs - 1, 2 + gs - 1, hand)
        elif pose in ('draw', 'type', 'laptop'):
            wig = frame % 2
            R(cx, ay + 1, 5, 2, sleeve)
            R(cx + 5, ay + wig, 2, 2, hand)
        elif pose in ('jump', 'tuck'):
            R(cx, ay - 3, 2, 4, sleeve)
            R(cx, ay - 4, 2, 1, hand)
        else:
            sw = {0: 0, 1: -1, 2: 0, 3: 1}[frame % 4] if pose in ('walk', 'run') else 0
            R(cx - 1 + sw, ay, 2, bh - 2, sleeve)
            R(cx - 1 + sw, ay + bh - 2, 2, gs, hand)
    else:
        ay = btop + 1
        la, ra = bx0 - 2, bx0 + bw_
        if pose == 'wave':
            R(la, ay, 2, bh - 2, sleeve)
            R(la, ay + bh - 2, 2, 1, hand)
            wv = frame % 2
            R(ra, ay - 4 - wv, 2, 5, sleeve)
            R(ra + wv, ay - 6 - wv, 2, 2, hand)
        elif pose == 'win':
            R(la, ay, 2, bh - 2, sleeve)
            R(la, ay + bh - 2, 2, gs, hand)
            R(ra, ay - 5, 2, 6, sleeve)
            R(ra - (gs - 1), ay - 7, 2 + gs - 1, 2 + gs - 1, hand)
        elif pose == 'hug':
            R(la - 1, ay, 3, 2, sleeve)
            R(ra, ay, 3, 2, sleeve)
            R(la - 2, ay, 1, 2, hand)
            R(ra + 3, ay, 1, 2, hand)
        elif pose == 'cross':
            R(la, ay, 2, 3, sleeve)
            R(ra, ay, 2, 3, sleeve)
            R(bx0, ay + 2, bw_, 2, sh(sleeve, .9))
            R(bx0 + 1, ay + 2, 2, 2, hand)
            R(bx0 + bw_ - 3, ay + 2, 2, 2, hand)
        elif pose == 'laptop':
            R(la, ay, 2, 3, sleeve)
            R(ra, ay, 2, 3, sleeve)
            R(bx0 - 1, ay + 2, bw_ + 2, 4, (60, 60, 70))
            R(bx0, ay + 3, bw_, 2, (120, 200, 255))
        elif pose == 'point':
            R(la, ay, 2, bh - 2, sleeve)
            R(la, ay + bh - 2, 2, 1, hand)
            R(ra, ay, 4, 2, sleeve)
            R(ra + 4, ay, 2, 2, hand)
        elif pose == 'guard':
            R(la, ay, 2, 3, sleeve)
            R(ra, ay, 2, 3, sleeve)
            R(la, ay - 2, 2 + gs - 1, 2 + gs - 1, hand)
            R(ra - (gs - 1), ay - 2, 2 + gs - 1, 2 + gs - 1, hand)
        else:
            sw = 1 if (pose == 'walk' and frame % 2) else 0
            R(la, ay + sw, 2, bh - 2, sleeve)
            R(la, ay + bh - 2 + sw, 2, gs, hand)
            R(ra, ay - sw, 2, bh - 2, sleeve)
            R(ra - (gs - 1), ay + bh - 2 - sw, 2, gs, hand)
    # ---------------- CABEZA
    hx0 = cx - hw // 2
    if view == 'side':
        hx0 = cx - hw // 2 - 1
    style = L['style']
    if style == 'long' and view != 'side':
        R(hx0 - 1, htop + 3, hw + 2, hh + 2, sh(hair, .85))
    if style == 'long' and view == 'side':
        R(hx0, htop + 3, 5, hh + 2, sh(hair, .85))
    R(hx0 + 1, htop, hw - 2, hh, skin)
    R(hx0, htop + 1, hw, hh - 2, skin)
    R(hx0 + hw - 2, htop + 2, 1, hh - 4, sh(skin, .9))
    if view == 'back':
        if style != 'bald':
            R(hx0 + 1, htop, hw - 2, hh - 1, hair)
            R(hx0, htop + 1, hw, hh - 3, hair)
            R(hx0 + 2, htop + 1, 3, 1, sh(hair, 1.4))
        else:
            R(hx0 + 2, htop + 1, 3, 2, sh(skin, 1.1))
            R(hx0 + 3, htop + 1, 1, 1, (255, 240, 220))
            R(hx0 + hw - 4, htop + 2, 2, hh - 4, sh(skin, .88))
        R(hx0 - 1, htop + 5, 1, 3, sh(skin, .9))
        R(hx0 + hw, htop + 5, 1, 3, sh(skin, .85))
        if L['beard']:
            R(hx0, htop + hh - 3, 1, 2, L['beard'])
            R(hx0 + hw - 1, htop + hh - 3, 1, 2, L['beard'])
    elif view == 'front':
        if style != 'bald':
            R(hx0 + 1, htop, hw - 2, 4, hair)
            R(hx0, htop + 1, hw, 3, hair)
            R(hx0, htop + 3, 2, 4, hair)
            R(hx0 + hw - 2, htop + 3, 2, 4, hair)
            R(hx0 + 2, htop + 1, 3, 1, sh(hair, 1.45))
            if style == 'kid':
                R(hx0 + 3, htop + 4, 2, 1, hair)
                R(hx0 + 6, htop + 4, 2, 1, hair)
                d.point((hx0 + 1, htop - 1), fill=hair)
                d.point((hx0 + hw - 3, htop - 1), fill=hair)
            if style == 'pony':
                R(hx0 + hw, htop + 2, 2, 5, hair)
                R(hx0 + hw - 1, htop + 2, 1, 1, (240, 80, 90))
            if style == 'long':
                R(hx0, htop + 3, 2, hh, hair)
                R(hx0 + hw - 2, htop + 3, 2, hh, hair)
        else:
            R(hx0 + 2, htop + 1, 3, 1, sh(skin, 1.12))
            d.point((hx0 + 3, htop + 1), fill=(255, 240, 220))
            R(hx0 - 1, htop + 5, 1, 3, sh(skin, .9))
            R(hx0 + hw, htop + 5, 1, 3, sh(skin, .85))
        ey = htop + (6 if hh >= 10 else 5)
        R(hx0 + 3, ey, 1, 2, OUT[:3])
        R(hx0 + hw - 4, ey, 1, 2, OUT[:3])
        if L['size'] in ('kid', 'small', 'tiny'):
            d.point((hx0 + 2, ey + 2), fill=(250, 150, 150))
            d.point((hx0 + hw - 3, ey + 2), fill=(250, 150, 150))
        if L['glasses']:
            R(hx0 + 2, ey - 1, 3, 1, OUT[:3])
            R(hx0 + hw - 5, ey - 1, 3, 1, OUT[:3])
            d.point((hx0 + hw // 2, ey - 1), fill=OUT[:3])
        if L['beard']:
            R(hx0 + 1, htop + hh - 3, hw - 2, 2, L['beard'])
            R(hx0 + 2, htop + hh - 1, hw - 4, 1, L['beard'])
            R(hx0, htop + hh - 5, 1, 3, L['beard'])
            R(hx0 + hw - 1, htop + hh - 5, 1, 3, L['beard'])
        if L['stache']:
            R(hx0 + hw // 2 - 2, htop + hh - 3, 4, 1, hair)
        my = htop + hh - 2 - (1 if L['beard'] else 0)
        if talk:
            R(hx0 + hw // 2 - 1, my - 1, 2, 2, (150, 40, 50))
        else:
            R(hx0 + hw // 2 - 1, my, 2, 1, (170, 80, 70))
        if L['hat']:
            R(hx0 - 2, htop + 1, hw + 4, 2, L['hat'])
            R(hx0 + 1, htop - 2, hw - 2, 3, L['hat'])
            R(hx0 + 1, htop, hw - 2, 1, (170, 60, 40))
    else:  # side (mira a la derecha)
        if style != 'bald':
            R(hx0 + 1, htop, hw - 3, 4, hair)
            R(hx0, htop + 1, 6, hh - 4, hair)
            R(hx0 + 3, htop + 1, 3, 1, sh(hair, 1.45))
            if style == 'pony':
                R(hx0 - 2, htop + 2, 2, 5, hair)
            if style == 'kid':
                d.point((hx0 + hw - 3, htop - 1), fill=hair)
                d.point((hx0 + hw - 2, htop + 4), fill=hair)
        else:
            R(hx0 + 3, htop + 1, 3, 1, sh(skin, 1.12))
            d.point((hx0 + 4, htop + 1), fill=(255, 240, 220))
        R(hx0 + 3, htop + 5, 2, 3, sh(skin, .85))
        ey = htop + (6 if hh >= 10 else 5)
        R(hx0 + hw - 3, ey, 1, 2, OUT[:3])
        d.point((hx0 + hw, ey + 2), fill=skin)
        if L['glasses']:
            R(hx0 + hw - 4, ey - 1, 3, 1, OUT[:3])
        if L['beard']:
            R(hx0 + 3, htop + hh - 3, hw - 4, 2, L['beard'])
            R(hx0 + 4, htop + hh - 1, hw - 6, 1, L['beard'])
        if L['stache']:
            R(hx0 + hw - 3, htop + hh - 3, 3, 1, hair)
        my = htop + hh - 2 - (1 if L['beard'] else 0)
        R(hx0 + hw - 3, my - (1 if talk else 0), 2, 2 if talk else 1, (150, 40, 50) if talk else (170, 80, 70))
        if L['hat']:
            R(hx0 - 1, htop + 1, hw + 3, 2, L['hat'])
            R(hx0 + 1, htop - 2, hw - 3, 3, L['hat'])
    if L['halo']:
        R(hx0 - 2, htop + 3, hw + 4, 1, (150, 150, 166))
        R(hx0 - 2, htop + 3, 1, btop - htop - 2, (150, 150, 166))
        R(hx0 + hw + 1, htop + 3, 1, btop - htop - 2, (150, 150, 166))
    a = np.array(img)
    if flash:
        m = a[..., 3] > 0
        a[m] = (255, 255, 255, 255)
    a = _outline(a)
    spr = Image.fromarray(a, 'RGBA')
    _cache[key] = spr
    return spr


def put(img, x, y, L, view='front', pose='stand', t=0.0, face=1, talk=False, ang=0, flash=False, shadow=True,
        fps=6):
    """Dibuja al personaje con los pies en (x,y). face=-1 lo voltea."""
    frame = int(t * fps) % 4
    spr = sprite(L, view, pose, frame, talk and int(t * 8) % 2 == 1, flash)
    if face < 0:
        spr = spr.transpose(Image.FLIP_LEFT_RIGHT)
    if ang:
        spr = spr.rotate(ang, resample=Image.NEAREST, expand=True, center=(CW // 2, CH - 12))
    if shadow:
        d = ImageDraw.Draw(img)
        px = img.load()
        w = {'adult': 10, 'teen': 10, 'kid': 8, 'small': 7, 'tiny': 6}[L['size']]
        for dx in range(-w // 2, w // 2 + 1):
            for dy in (0, 1):
                X, Y = int(x + dx), int(y + dy)
                if 0 <= X < img.width and 0 <= Y < img.height and (abs(dx) < w // 2 or dy == 0):
                    c = px[X, Y]
                    px[X, Y] = sh(c, 0.7)
    ox = spr.width // 2
    oy = spr.height - 2 if not ang else spr.height // 2 + 10
    img.paste(spr, (int(x - ox), int(y - oy)), spr)


def dog(img, x, y, col, t, face=1, sit=False):
    s = Image.new('RGBA', (16, 12), (0, 0, 0, 0))
    d = ImageDraw.Draw(s)
    dk = sh(col, .7)
    st = int(t * 8) % 2
    d.rectangle([3, 4, 11, 8], fill=col)
    d.rectangle([3, 7, 11, 8], fill=dk)
    for i, lx in enumerate((3, 5, 9, 11)):
        o = st if i % 2 else 1 - st
        d.rectangle([lx, 9, lx, 10 - o], fill=dk)
    d.rectangle([10, 1, 14, 5], fill=col)
    d.point((13, 2), fill=OUT)
    d.point((15, 4), fill=OUT)
    d.rectangle([10, 0, 11, 2], fill=dk)
    wag = int(t * 12) % 2
    d.point((2, 3 + wag), fill=col)
    d.point((1, 2 + wag), fill=col)
    a = _outline(np.array(s))
    spr = Image.fromarray(a, 'RGBA')
    if face < 0:
        spr = spr.transpose(Image.FLIP_LEFT_RIGHT)
    img.paste(spr, (int(x - 8), int(y - 11)), spr)


def cat(img, x, y, col, t):
    s = Image.new('RGBA', (12, 10), (0, 0, 0, 0))
    d = ImageDraw.Draw(s)
    d.rectangle([2, 4, 8, 8], fill=col)
    d.rectangle([6, 1, 10, 5], fill=col)
    d.point((6, 0), fill=col)
    d.point((10, 0), fill=col)
    d.point((9, 3), fill=(120, 220, 80))
    tl = int(t * 3) % 2
    d.point((1, 3 - tl), fill=col)
    d.point((1, 2 - tl), fill=col)
    a = _outline(np.array(s))
    spr = Image.fromarray(a, 'RGBA')
    img.paste(spr, (int(x - 6), int(y - 9)), spr)
