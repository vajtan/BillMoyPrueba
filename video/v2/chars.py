"""Personajes pixel art articulados (esqueleto) con sombreado y contorno + retratos."""
import math
import numpy as np
from PIL import Image, ImageDraw
from toolkit import R, shade, WHITE, BLK, GOLD

SKIN = (234, 180, 142)
SKIN_L = (244, 198, 164)

# ------------------------------------------------------------------ LOOKS
PAPA = dict(s=1.0, skin=(226, 170, 132), hair=(34, 26, 24), style='short', beard=None, stache=True,
            shirt=(138, 52, 46), sleeves='long', pants=(56, 62, 92), shoes=(70, 44, 30))
MAMA = dict(s=0.94, skin=SKIN_L, hair=(222, 180, 92), style='long', shirt=(240, 238, 230), sleeves='long',
            pants=(70, 60, 60), shoes=(120, 44, 44), dress=(52, 96, 176))
KID = dict(s=0.66, skin=SKIN, hair=(52, 36, 30), style='kid', shirt=(60, 118, 214), sleeves='short',
           pants=(52, 52, 96), shoes=(96, 54, 32), kid=True)
KID_WIN = dict(KID, shirt=(170, 60, 50), sleeves='long', coat=True)
SIS = dict(s=0.56, skin=SKIN_L, hair=(150, 96, 52), style='pony', shirt=(236, 120, 150), sleeves='short',
           pants=(236, 120, 150), shoes=(200, 60, 80), dress=(230, 110, 146), kid=True)
SIS_WIN = dict(SIS, shirt=(120, 60, 140), dress=(120, 60, 140), sleeves='long')
KID_KICK = dict(KID, shirt=(230, 230, 230), sleeves='short', pants=(40, 40, 50), shorts=True, shoes=None,
                gloves=(210, 40, 40))
TEEN12 = dict(s=0.8, skin=SKIN, hair=(48, 34, 28), style='short', shirt=(110, 116, 128), sleeves='long',
              pants=(46, 50, 76), shoes=(236, 236, 236), kid=True)
TEEN16 = dict(s=0.94, skin=SKIN, hair=(46, 32, 28), style='short', shirt=(40, 120, 110), sleeves='short',
              pants=(50, 52, 70), shoes=(236, 236, 236))
TEEN16_HALO = dict(TEEN16, halo=True, shirt=(200, 200, 206))
YOUNG = dict(s=1.0, skin=(230, 176, 138), hair=(42, 30, 26), style='short', beard=(92, 64, 50),
             shirt=(34, 34, 40), sleeves='short', pants=(52, 56, 76), shoes=(236, 236, 236), big=True)
YOUNG_TRAIN = dict(YOUNG, shirt=(30, 30, 34), pants=(30, 30, 36), shoes=(50, 50, 56), gloves=(200, 30, 40))
DOORMAN = dict(YOUNG, shirt=(18, 18, 22), sleeves='short', pants=(18, 18, 22), shoes=(12, 12, 14))
VAJ = dict(YOUNG, style='bald', beard=(92, 64, 50), shirt=(28, 28, 34))
VAJ_FIGHT = dict(VAJ, shirt=None, sleeves='none', pants=(200, 30, 40), shorts=True, shoes=None, gloves=(200, 30, 40))
RIVAL = dict(s=1.0, skin=(196, 146, 108), hair=(20, 20, 20), style='short', beard=(40, 30, 30), shirt=None,
             sleeves='none', pants=(30, 80, 200), shorts=True, shoes=None, gloves=(30, 80, 200), big=True)
JUANMA = dict(s=0.98, skin=(222, 168, 130), hair=(196, 196, 196), style='short', beard=(210, 210, 210),
              shirt=(80, 116, 70), sleeves='long', pants=(110, 90, 60), shoes=(80, 56, 36), glasses=True, hat=(210, 180, 110))


# ------------------------------------------------------------------ POSES
BASE = dict(hip=(0, -24), kf=(2, -12), ff=(2, 0), kb=(-1, -12), fb=(-2, 0), neck=(0, -41),
            sf=(2, -39), sb=(-2, -39), ef=(3, -31), hf=(3, -23), eb=(-3, -31), hb=(-3, -23), head=(1, -48))
UPPER = ('hip', 'neck', 'sf', 'sb', 'ef', 'hf', 'eb', 'hb', 'head')


def _shift(J, keys, dx, dy):
    for k in keys:
        J[k] = (J[k][0] + dx, J[k][1] + dy)


def pose_joints(pose, t):
    J = dict(BASE)
    if pose in ('walk', 'run'):
        run = pose == 'run'
        amp, sp, lift = (8, 15, 5) if run else (5, 9, 2)
        s, c = math.sin(t * sp), math.cos(t * sp)
        J.update(ff=(amp * s, -max(0, c) * lift), kf=(amp * s * 0.6 + (3 if run else 2), -12 - max(0, c) * 3),
                 fb=(-amp * s, -max(0, -c) * lift), kb=(-amp * s * 0.6 + (3 if run else 2), -12 - max(0, -c) * 3))
        _shift(J, UPPER, 0, -abs(c) * 1.0)
        if run:
            _shift(J, ('neck', 'sf', 'sb', 'head'), 3, 1)
            J.update(ef=(-6 * s + 1, -33), hf=(-6 * s + 5, -28), eb=(6 * s + 1, -33), hb=(6 * s + 5, -28))
        else:
            J.update(hf=(-amp * s * 0.7, -23), ef=(-amp * s * 0.35, -31), hb=(amp * s * 0.7, -23), eb=(amp * s * 0.35, -31))
    elif pose in ('guard', 'punch', 'kick', 'punch2'):
        b = 1 if math.sin(t * 9) > 0 else 0
        J.update(ff=(6, 0), kf=(6, -12), fb=(-6, 0), kb=(-4, -12), hip=(0, -23 + b))
        _shift(J, ('neck', 'sf', 'sb', 'head'), 1, b)
        J.update(ef=(7, -33 + b), hf=(10, -40 + b), eb=(3, -32 + b), hb=(6, -42 + b))
        if pose == 'punch':
            _shift(J, ('neck', 'sf', 'sb', 'head'), 2, 0)
            J.update(ef=(11, -38), hf=(20, -39))
        if pose == 'punch2':
            _shift(J, ('neck', 'sf', 'sb', 'head'), 2, 0)
            J.update(eb=(10, -37), hb=(19, -39))
        if pose == 'kick':
            J.update(fb=(-4, 0), kb=(-3, -12), hip=(-1, -24), kf=(9, -29), ff=(21, -31))
            _shift(J, ('neck', 'sf', 'sb', 'head', 'ef', 'hf', 'eb', 'hb'), -5, 0)
    elif pose == 'tuck':
        J.update(hip=(0, -26), kf=(8, -33), ff=(4, -24), kb=(6, -31), fb=(2, -23), neck=(0, -42), head=(2, -49),
                 sf=(1, -40), sb=(-1, -40), ef=(6, -36), hf=(8, -31), eb=(4, -35), hb=(6, -29))
    elif pose == 'jump':
        J.update(kf=(7, -18), ff=(4, -8), kb=(-2, -14), fb=(-7, -6), ef=(6, -44), hf=(10, -49), eb=(-3, -44),
                 hb=(-1, -51))
    elif pose == 'lie':
        J = dict(ff=(0, -3), fb=(0, -2), kf=(-12, -4), kb=(-12, -3), hip=(-24, -4), neck=(-41, -5),
                 sf=(-39, -6), sb=(-39, -4), ef=(-31, -7), hf=(-23, -6), eb=(-31, -3), hb=(-23, -2), head=(-48, -7))
    elif pose == 'sit_cross':
        J.update(hip=(0, -5), kf=(9, -4), ff=(-3, -1), kb=(-8, -4), fb=(3, -2), neck=(0, -23), sf=(2, -21),
                 sb=(-2, -21), ef=(4, -14), hf=(7, -7), eb=(-3, -14), hb=(-6, -7), head=(1, -30))
    elif pose in ('sit', 'draw', 'type', 'sit_tv'):
        J.update(hip=(0, -15), kf=(10, -15), ff=(10, -1), kb=(9, -15), fb=(8, -1), neck=(0, -33), sf=(2, -31),
                 sb=(-2, -31), ef=(4, -24), hf=(9, -18), eb=(0, -24), hb=(6, -18), head=(1, -40))
        if pose == 'draw':
            J.update(ef=(6, -25), hf=(13 + 2 * math.sin(t * 14), -25 + math.sin(t * 9)))
        if pose == 'type':
            J.update(ef=(6, -25), hf=(13, -25 + (1 if math.sin(t * 30) > 0 else 0)),
                     eb=(3, -25), hb=(11, -25 + (1 if math.sin(t * 27) < 0 else 0)))
    elif pose == 'win':
        J.update(ef=(4, -49), hf=(5, -57))
    elif pose == 'wave':
        J.update(ef=(6, -44), hf=(7 + 3 * math.sin(t * 10), -52))
    elif pose == 'hug':
        J.update(ef=(7, -33), hf=(13, -36), eb=(5, -33), hb=(11, -37))
    elif pose == 'cross':
        J.update(ef=(5, -32), hf=(-1, -34), eb=(3, -33), hb=(4, -35))
    elif pose == 'point':
        J.update(ef=(8, -38), hf=(15, -40))
    elif pose == 'hand':           # dar la mano / sostener
        J.update(ef=(5, -30), hf=(9, -26))
    elif pose == 'laptop':
        J.update(ef=(5, -30), hf=(10, -31), eb=(3, -30), hb=(8, -32))
    elif pose == 'sad':
        _shift(J, ('head',), 1, 2)
    return J


# ------------------------------------------------------------------ RENDER
OUTLINE = (26, 20, 34, 255)


def _limb(d, a, b, w, col, outline=True):
    w = max(2, int(round(w)))
    d.line([a, b], fill=shade(col, .72), width=w)
    d.line([(a[0] - .5, a[1] - .5), (b[0] - .5, b[1] - .5)], fill=col, width=max(1, w - 1))
    if w >= 3:
        d.line([(a[0] - w / 3, a[1]), (b[0] - w / 3, b[1])], fill=shade(col, 1.18), width=1)
    r = w / 2 - .5
    for p, c in ((a, col), (b, col)):
        d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=c)


def draw_char(img, x, y, L, pose='stand', t=0.0, facing=1, ang=0.0, flash=False, pivot=(0, -30), extra=None):
    J = pose_joints(pose, t)
    s = L['s']
    S = 130
    ox, oy = S // 2, S - 24
    spr = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(spr)
    ca, sa = math.cos(ang), math.sin(ang)

    def P(k):
        px, py = J[k]
        px, py = px - pivot[0], py - pivot[1]
        px, py = px * ca - py * sa + pivot[0], px * sa + py * ca + pivot[1]
        return (ox + facing * px * s, oy + py * s)

    skin = L['skin']
    shirt = L['shirt'] if L.get('shirt') else skin
    pants = L['pants']
    shoes = L.get('shoes') or skin
    gloves = L.get('gloves')
    sl = L.get('sleeves', 'long')
    big = 1.15 if L.get('big') else 1.0
    kid = L.get('kid')
    wt, ws, wu, wf = 5.2 * s * big, 4.4 * s * big, 4.2 * s * big, 3.4 * s * big
    if kid:
        wt, ws, wu, wf = wt * 1.1, ws * 1.1, wu * 1.1, wf * 1.1
    dim = 0.82

    def arm(side, dk):
        sh, el, ha = P('s' + side), P('e' + side), P('h' + side)
        upper = shirt if sl in ('long', 'short') else skin
        fore = shirt if sl == 'long' else skin
        if L.get('coat'):
            upper = fore = shirt
        _limb(d, sh, el, wu, shade(upper, dk))
        _limb(d, el, ha, wf, shade(fore, dk))
        if gloves:
            rr = 3.2 * s * big
            d.ellipse([ha[0] - rr, ha[1] - rr, ha[0] + rr, ha[1] + rr], fill=shade(gloves, dk))
            d.point((ha[0] - 1, ha[1] - 1), fill=shade(gloves, dk * 1.4))
        else:
            rr = 1.6 * s + .4
            d.ellipse([ha[0] - rr, ha[1] - rr, ha[0] + rr, ha[1] + rr], fill=shade(skin, dk))

    def leg(side, dk):
        hp, kn, ft = P('hip'), P('k' + side), P('f' + side)
        _limb(d, hp, kn, wt, shade(pants, dk))
        _limb(d, kn, ft, ws, shade(skin if L.get('shorts') else pants, dk))
        # pie
        fx = facing * math.cos(ang)
        fy = facing * math.sin(ang) * 0 + math.sin(ang) * facing
        ln = 4.5 * s
        tip = (ft[0] + fx * ln, ft[1] + math.sin(ang) * ln * facing)
        _limb(d, (ft[0] - fx, ft[1]), tip, max(2, 3.2 * s), shade(shoes, dk))

    arm('b', dim)
    leg('b', dim)
    leg('f', 1.0)
    # torso
    N, Hp = P('neck'), P('hip')
    ux, uy = N[0] - Hp[0], N[1] - Hp[1]
    ln = math.hypot(ux, uy) or 1
    ux, uy = ux / ln, uy / ln
    vx, vy = -uy, ux
    sw, hw = 6.6 * s * big, 5.2 * s * big
    if kid:
        sw, hw = sw * 1.08, hw * 1.05
    poly = [(N[0] + vx * sw, N[1] + vy * sw), (N[0] - vx * sw, N[1] - vy * sw),
            (Hp[0] - vx * hw, Hp[1] - vy * hw), (Hp[0] + vx * hw, Hp[1] + vy * hw)]
    d.polygon(poly, fill=shirt)
    right = sorted(poly, key=lambda p: p[0])
    mid_top = (N[0], N[1])
    mid_bot = (Hp[0], Hp[1])
    rt = max(poly[0], poly[1], key=lambda p: p[0])
    rb = max(poly[2], poly[3], key=lambda p: p[0])
    d.polygon([mid_top, rt, rb, mid_bot], fill=shade(shirt, .8))
    lt = min(poly[0], poly[1], key=lambda p: p[0])
    lb = min(poly[2], poly[3], key=lambda p: p[0])
    d.line([lt, lb], fill=shade(shirt, 1.18), width=1)
    if L.get('shirt') is None:          # torso desnudo: pecho y abdominales
        cx, cy = (N[0] + Hp[0]) / 2, (N[1] + Hp[1]) / 2
        for k in range(3):
            d.point((cx - 1, cy + k * 3 - 2), fill=shade(skin, .78))
            d.point((cx + 2, cy + k * 3 - 2), fill=shade(skin, .78))
        d.line([(N[0] - 4 * s, N[1] + 5 * s), (N[0] + 4 * s, N[1] + 5 * s)], fill=shade(skin, .8))
    # cinturon / pantalon arriba
    bp = [(Hp[0] + vx * hw, Hp[1] + vy * hw), (Hp[0] - vx * hw, Hp[1] - vy * hw),
          (Hp[0] - vx * hw + ux * 3 * s, Hp[1] - vy * hw + uy * 3 * s),
          (Hp[0] + vx * hw + ux * 3 * s, Hp[1] + vy * hw + uy * 3 * s)]
    d.polygon(bp, fill=pants)
    if L.get('dress'):
        kf, kb = P('kf'), P('kb')
        dc = L['dress']
        kx = (kf[0] + kb[0]) / 2
        ky = max(kf[1], kb[1]) + 2 * s
        d.polygon([(Hp[0] - hw * 1.1, Hp[1] - 4 * s), (Hp[0] + hw * 1.1, Hp[1] - 4 * s),
                   (kx + hw * 1.7, ky), (kx - hw * 1.7, ky)], fill=dc)
        d.polygon([(Hp[0], Hp[1] - 4 * s), (Hp[0] + hw * 1.1, Hp[1] - 4 * s), (kx + hw * 1.7, ky), (kx, ky)],
                  fill=shade(dc, .8))
    if L.get('halo'):
        d.polygon(poly, fill=(214, 214, 220))
        d.polygon([mid_top, rt, rb, mid_bot], fill=(176, 176, 186))
        d.line([(N[0] - 3 * s, N[1]), (Hp[0] - 3 * s, Hp[1])], fill=(120, 120, 130))
    # cabeza
    Hc = P('head')
    hs = (12.5 if not kid else 11.5) * (s if not kid else max(s, 0.62) * 1.12)
    hs = max(hs, 8)
    rx, ry = hs / 2, hs / 2 + .6
    hux, huy = Hc[0] - N[0], Hc[1] - N[1]
    hl = math.hypot(hux, huy) or 1
    hux, huy = hux / hl, huy / hl
    fx, fy = -huy * facing, hux * facing
    hair = L['hair']
    st = L.get('style', 'short')

    def ell(cx, cy, a, b, c):
        d.ellipse([cx - a, cy - b, cx + a, cy + b], fill=c)

    if st == 'long':
        ell(Hc[0] - fx * 2 - hux * 3, Hc[1] - fy * 2 - huy * 3, rx + 1, ry + 3, shade(hair, .85))
    d.line([N, (Hc[0] - hux * 3, Hc[1] - huy * 3)], fill=shade(skin, .8), width=max(2, int(3 * s)))
    ell(Hc[0], Hc[1], rx, ry, skin)
    if st != 'bald':
        ell(Hc[0] + hux * 1.4 - fx * 1.2, Hc[1] + huy * 1.4 - fy * 1.2, rx + .4, ry - .8, hair)
        ell(Hc[0] - hux * 1.8 + fx * 1.6, Hc[1] - huy * 1.8 + fy * 1.6, rx - 1.1, ry - 1.6, skin)
        d.point((Hc[0] + hux * (ry - 1) - fx * 2, Hc[1] + huy * (ry - 1) - fy * 2), fill=shade(hair, 1.5))
        if st == 'pony':
            ell(Hc[0] - fx * (rx + 1.5) + hux * 1, Hc[1] - fy * (rx + 1.5) + huy * 1, 2, 3, hair)
        if st == 'kid':
            d.point((Hc[0] + fx * (rx - 1) + hux * (ry - 3), Hc[1] + fy * (rx - 1) + huy * (ry - 3)), fill=hair)
    else:
        d.point((Hc[0] + hux * (ry - 1.5) - fx * 1.5, Hc[1] + huy * (ry - 1.5) - fy * 1.5), fill=shade(skin, 1.25))
        d.point((Hc[0] + hux * (ry - 1.5) - fx * .5, Hc[1] + huy * (ry - 1.5) - fy * .5), fill=shade(skin, 1.2))
    # sombra de la nuca
    ell(Hc[0] - fx * (rx - 1.2), Hc[1] - fy * (rx - 1.2), 1, ry - 2.5,
        shade(skin, .82) if st == 'bald' else shade(hair if st != 'bald' else skin, .9))
    # oreja
    ex, ey = Hc[0] - fx * 1.2 - hux * .5, Hc[1] - fy * 1.2 - huy * .5
    R(d, ex - .5, ey - 1, 2, 3, shade(skin, .85))
    if L.get('beard'):
        ell(Hc[0] - hux * 3.6 + fx * 1.4, Hc[1] - huy * 3.6 + fy * 1.4, rx - 2.4, ry - 4.6, L['beard'])
        ell(Hc[0] - hux * 1.5 - fx * .2, Hc[1] - huy * 1.5 - fy * .2, .6, 1.8, L['beard'])
    if L.get('hat'):
        ell(Hc[0] + hux * 3, Hc[1] + huy * 3, rx + 3, 1.5, L['hat'])
        ell(Hc[0] + hux * 4.2 - fx * .5, Hc[1] + huy * 4.2 - fy * .5, rx - .5, 2.2, L['hat'])
        d.line([(Hc[0] - rx + 1, Hc[1] + huy * 3.2), (Hc[0] + rx - 1, Hc[1] + huy * 3.2)], fill=(150, 60, 40))
    # cara
    if abs(ang) < 0.9:
        eye = (Hc[0] + fx * (rx - 2.6) + hux * .3, Hc[1] + fy * (rx - 2.6) + huy * .3)
        R(d, eye[0], eye[1] - (1 if kid else 0), 1, 2, BLK)
        if kid:
            d.point((eye[0], eye[1] - 1), fill=(90, 80, 90))
        R(d, eye[0] - (1 if facing > 0 else 0), eye[1] - 2 - (1 if kid else 0), 2, 1,
          shade(hair if st != 'bald' else skin, .7))
        nose = (Hc[0] + fx * (rx + .3) - hux * .8, Hc[1] + fy * (rx + .3) - huy * .8)
        d.point(nose, fill=skin)
        d.point((nose[0] - fx, nose[1] + 1), fill=shade(skin, .82))
        mouth = (Hc[0] + fx * (rx - 2.2) - hux * 3.2, Hc[1] + fy * (rx - 2.2) - huy * 3.2)
        R(d, mouth[0] - (1 if facing < 0 else 0), mouth[1], 2, 1, (150, 70, 66))
        if L.get('stache'):
            R(d, mouth[0] - (2 if facing < 0 else 0), mouth[1] - 1, 3, 1, hair)
        if L.get('glasses'):
            R(d, eye[0] - 1, eye[1] - 1, 3, 3, (40, 40, 50))
            d.point(eye, fill=(160, 200, 230))
    if L.get('halo'):
        ring_c = (Hc[0] + hux * 1, Hc[1] + huy * 1)
        d.ellipse([ring_c[0] - rx - 4, ring_c[1] - 2, ring_c[0] + rx + 4, ring_c[1] + 2], outline=(150, 150, 164))
        for sx in (-rx - 3, rx + 3):
            d.line([(ring_c[0] + sx, ring_c[1]), (ring_c[0] + sx * 1.1, N[1] + 5)], fill=(160, 160, 176))
    arm('f', 1.0)
    if extra:
        extra(d, P, s)
    # contorno
    a = np.array(spr)
    m = a[..., 3] > 0
    dil = m.copy()
    dil[1:] |= m[:-1]
    dil[:-1] |= m[1:]
    dil[:, 1:] |= m[:, :-1]
    dil[:, :-1] |= m[:, 1:]
    edge = dil & ~m
    if flash:
        a[m] = (255, 255, 255, 255)
    a[edge] = OUTLINE
    spr = Image.fromarray(a, 'RGBA')
    img.paste(spr, (int(x - ox), int(y - oy)), spr)


def sitter_back(d, x, y, t, bald=True):
    """Vajtan adulto sentado de espaldas mirando el paisaje (como la referencia)."""
    b = 1 if (t % 3.2) < 1.6 else 0
    red, redd, redl = (172, 66, 46), (122, 42, 32), (208, 98, 64)
    d.ellipse([x - 16, y - 8, x + 16, y + 1], fill=(110, 40, 32))
    d.ellipse([x - 14, y - 9, x + 12, y - 2], fill=(150, 56, 40))
    d.polygon([(x - 11, y - 6), (x + 11, y - 6), (x + 9, y - 28 - b), (x - 9, y - 28 - b)], fill=red)
    d.polygon([(x + 2, y - 6), (x + 11, y - 6), (x + 9, y - 28 - b), (x + 2, y - 28 - b)], fill=redd)
    d.line([(x - 10, y - 7), (x - 8, y - 27 - b)], fill=redl, width=2)
    for k in range(3):
        d.line([(x - 5 + k * 4, y - 22 - b), (x - 6 + k * 4, y - 10)], fill=shade(red, .88))
    d.ellipse([x - 12, y - 31 - b, x + 12, y - 24 - b], fill=red)
    d.ellipse([x - 6, y - 42 - b, x + 6, y - 29 - b], fill=(218, 166, 128) if bald else (44, 30, 26))
    d.ellipse([x + 1, y - 41 - b, x + 6, y - 30 - b], fill=(188, 138, 104) if bald else (30, 22, 20))
    if bald:
        d.point((x - 3, y - 39 - b), fill=(250, 214, 180))
        d.point((x - 2, y - 40 - b), fill=(250, 214, 180))
    R(d, x - 8, y - 37 - b, 2, 4, (200, 150, 116))
    R(d, x + 6, y - 37 - b, 2, 4, (170, 124, 94))
    R(d, x - 6, y - 32 - b, 12, 2, (92, 64, 50))


# ------------------------------------------------------------------ RETRATOS (escala UI)
PORTRAIT = {
    'PAPÁ': dict(L=PAPA, bg=(96, 60, 42)),
    'MAMÁ': dict(L=MAMA, bg=(56, 110, 150)),
    'HERMANA': dict(L=SIS, bg=(150, 70, 110)),
    'VAJTAN NIÑO': dict(L=KID, bg=(40, 86, 164)),
    'VAJTAN': dict(L=YOUNG, bg=(40, 116, 110)),
    'VAJTAN ADULTO': dict(L=VAJ, bg=(150, 30, 40)),
    'JUAN MANUEL': dict(L=JUANMA, bg=(70, 110, 60)),
    'LOCUTOR': dict(L=dict(PAPA, hair=(200, 200, 200), stache=False, shirt=(20, 20, 20), shades=True), bg=(40, 40, 40)),
    'NARRADOR': None,
}
NAMES = {'VAJTAN NIÑO': 'VAJTAN', 'VAJTAN ADULTO': 'VAJTAN'}


def portrait(d, x, y, key, talking, t):
    R(d, x - 1, y - 1, 34, 34, WHITE)
    if PORTRAIT[key] is None:
        R(d, x, y, 32, 32, (70, 40, 110))
        R(d, x, y, 32, 12, (84, 50, 126))
        R(d, x + 4, y + 9, 24, 16, (120, 60, 30))
        R(d, x + 5, y + 8, 11, 16, (250, 244, 220))
        R(d, x + 16, y + 8, 11, 16, (236, 228, 204))
        R(d, x + 15, y + 8, 2, 17, (170, 150, 130))
        for i in range(5):
            R(d, x + 7, y + 11 + i * 2, 7, 1, (150, 140, 130))
            R(d, x + 18, y + 11 + i * 2, 7, 1, (150, 140, 130))
        if talking and int(t * 8) % 2:
            R(d, x + 26, y + 4, 2, 2, GOLD)
            R(d, x + 3, y + 26, 2, 2, GOLD)
            R(d, x + 27, y + 24, 1, 1, GOLD)
        return
    cfg = PORTRAIT[key]
    L, bg = cfg['L'], cfg['bg']
    R(d, x, y, 32, 32, bg)
    R(d, x, y, 32, 14, shade(bg, 1.15))
    R(d, x, y + 28, 32, 4, shade(bg, .8))
    skin, hair = L['skin'], L['hair']
    kid = L.get('kid')
    st = L.get('style', 'short')
    sh = L['shirt'] or skin
    if st == 'long':
        R(d, x + 5, y + 5, 22, 23, shade(hair, .85))
    R(d, x + 3, y + 26, 26, 6, sh)
    R(d, x + 20, y + 26, 9, 6, shade(sh, .8))
    R(d, x + 12, y + 20, 8, 7, shade(skin, .82))
    fy = 7 if kid else 6
    rows = [3, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 3, 5]
    for i, ins in enumerate(rows):
        R(d, x + 8 + ins, y + fy + i, 16 - 2 * ins, 1, skin)
        R(d, x + 20, y + fy + i, max(0, 4 - ins), 1, shade(skin, .86))
    R(d, x + 6, y + fy + 7, 2, 4, shade(skin, .86))
    R(d, x + 24, y + fy + 7, 2, 4, shade(skin, .8))
    if st != 'bald':
        R(d, x + 7, y + fy - 3, 18, 6, hair)
        R(d, x + 9, y + fy - 4, 14, 2, hair)
        R(d, x + 7, y + fy, 2, 6, hair)
        R(d, x + 23, y + fy, 2, 6, hair)
        R(d, x + 10, y + fy - 3, 5, 1, shade(hair, 1.5))
        if kid:
            R(d, x + 10, y + fy + 2, 6, 2, hair)
        if st == 'pony':
            R(d, x + 25, y + fy + 1, 4, 7, hair)
    else:
        R(d, x + 11, y + fy, 4, 1, shade(skin, 1.2))
        R(d, x + 12, y + fy + 1, 2, 1, shade(skin, 1.25))
    if L.get('hat'):
        R(d, x + 4, y + fy - 1, 24, 2, L['hat'])
        R(d, x + 8, y + fy - 6, 16, 5, L['hat'])
        R(d, x + 8, y + fy - 2, 16, 1, (150, 60, 40))
    blink = (t % 3.3) < 0.12
    ey = y + fy + 7
    if L.get('shades'):
        R(d, x + 9, ey - 1, 14, 3, BLK)
        R(d, x + 11, ey - 1, 2, 1, (120, 120, 160))
    elif blink:
        R(d, x + 10, ey + 1, 4, 1, BLK)
        R(d, x + 18, ey + 1, 4, 1, BLK)
    else:
        eh = 3 if kid else 2
        R(d, x + 10, ey, 4, eh, WHITE)
        R(d, x + 18, ey, 4, eh, WHITE)
        R(d, x + 12, ey, 2, eh, (60, 40, 30))
        R(d, x + 20, ey, 2, eh, (60, 40, 30))
        R(d, x + 12, ey, 1, 1, BLK)
        R(d, x + 20, ey, 1, 1, BLK)
    bc = shade(hair if st != 'bald' else skin, .6)
    R(d, x + 10, ey - 2, 4, 1, bc)
    R(d, x + 18, ey - 2, 4, 1, bc)
    if L.get('glasses'):
        for gx in (9, 17):
            R(d, x + gx, ey - 1, 6, 1, (40, 40, 50))
            R(d, x + gx, ey + 3, 6, 1, (40, 40, 50))
            R(d, x + gx, ey - 1, 1, 4, (40, 40, 50))
            R(d, x + gx + 5, ey - 1, 1, 4, (40, 40, 50))
        R(d, x + 15, ey, 2, 1, (40, 40, 50))
    R(d, x + 15, ey + 2, 2, 4, shade(skin, .82))
    R(d, x + 17, ey + 3, 1, 3, shade(skin, .74))
    if L.get('beard'):
        bd = L['beard']
        R(d, x + 8, y + fy + 11, 16, 5, bd)
        R(d, x + 9, y + fy + 16, 14, 1, bd)
        R(d, x + 11, y + fy + 17, 10, 1, bd)
        R(d, x + 6, y + fy + 8, 2, 5, bd)
        R(d, x + 24, y + fy + 8, 2, 5, bd)
    if L.get('stache'):
        R(d, x + 11, y + fy + 11, 10, 2, hair)
    my = y + fy + 13
    if talking and int(t * 12) % 2:
        R(d, x + 13, my, 6, 3, (110, 30, 40))
        R(d, x + 14, my, 4, 1, WHITE)
    else:
        R(d, x + 13, my + 1, 6, 1, (140, 60, 60))
    if L.get('halo'):
        R(d, x + 3, y + fy + 2, 26, 1, (160, 160, 176))
