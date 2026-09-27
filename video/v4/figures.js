// Personajes y objetos "dibujados por un niño".
'use strict';
const D = require('./draw');
const { C, line, fill, shape, circle, rect, dot, ellipsePts, rectPts, nextRng } = D;
const F = require('./font');

const SIZES = {
  adult: { hr: 56, th: 118, tw: 86, leg: 120, arm: 108, lw: 24 },
  teen: { hr: 52, th: 104, tw: 76, leg: 108, arm: 96, lw: 22 },
  kid: { hr: 48, th: 82, tw: 66, leg: 84, arm: 76, lw: 19 },
  small: { hr: 42, th: 64, tw: 54, leg: 64, arm: 60, lw: 16 },
};

function L(o) {
  return Object.assign({ size: 'adult', skin: C.skin, hair: C.brown, style: 'short', shirt: C.blue, pants: C.navy,
    shoes: C.black, dress: null, beard: null, stache: false, glasses: false, cap: null, halo: false, cape: null,
    gloves: null, shirtless: false, emblem: null, battered: false, s: 1 }, o);
}

const LOOK = {
  papa: L({ hair: '#3b2a20', shirt: C.red, pants: C.navy, stache: true }),
  mama: L({ hair: C.yellow, style: 'long', shirt: C.pink, dress: C.purple, shoes: C.red, s: 0.95 }),
  kid: L({ size: 'kid', hair: '#3b2a20', style: 'spiky', shirt: C.blue, pants: C.navy }),
  kid5: L({ size: 'small', hair: '#3b2a20', style: 'spiky', shirt: C.red, pants: C.navy }),
  sis: L({ size: 'small', hair: C.orange, style: 'pony', shirt: C.pink, dress: C.pink, shoes: C.red, s: 0.9 }),
  sis3: L({ size: 'small', hair: C.orange, style: 'pony', shirt: C.purple, dress: C.purple, shoes: C.red, s: 0.78 }),
  kidKick: L({ size: 'kid', hair: '#3b2a20', style: 'spiky', shirt: C.white, pants: C.black, gloves: C.red, shoes: C.skin }),
  teen12: L({ size: 'teen', hair: '#3b2a20', style: 'short', shirt: C.grey, pants: C.navy, shoes: C.white, s: 0.95 }),
  teen: L({ size: 'teen', hair: '#3b2a20', style: 'short', shirt: C.teal, pants: C.navy, shoes: C.white }),
  teenHalo: L({ size: 'teen', hair: '#3b2a20', style: 'short', shirt: C.ltgrey, pants: C.navy, halo: true }),
  young: L({ hair: '#3b2a20', style: 'short', beard: '#6b4a2e', shirt: C.black, pants: C.navy, shoes: C.white }),
  youngFight: L({ hair: '#3b2a20', style: 'short', beard: '#6b4a2e', shirtless: true, pants: C.black, gloves: C.red, shoes: C.skin }),
  balding: L({ hair: '#3b2a20', style: 'thin', beard: '#6b4a2e', shirt: C.black }),
  vaj: L({ hair: '#3b2a20', style: 'buzz', beard: '#6b4a2e', shirt: C.black, pants: C.navy, shoes: C.white }),
  vajHero: L({ hair: '#3b2a20', style: 'buzz', beard: '#6b4a2e', shirt: C.blue, pants: C.red, shoes: C.red, cape: C.red, emblem: 'V' }),
  vajFight: L({ hair: '#3b2a20', style: 'buzz', beard: '#6b4a2e', shirtless: true, pants: C.red, gloves: C.red, shoes: C.skin }),
  vajMMA: L({ hair: '#3b2a20', style: 'buzz', beard: '#6b4a2e', shirtless: true, pants: C.black, gloves: C.black, shoes: C.skin }),
  vajBeaten: L({ hair: '#3b2a20', style: 'buzz', beard: '#6b4a2e', shirtless: true, pants: C.black, gloves: null, shoes: C.skin, battered: true }),
  rival: L({ hair: C.black, style: 'short', skin: C.skin2, shirtless: true, pants: C.blue, gloves: C.blue, shoes: C.skin2 }),
  juanma: L({ hair: '#3b2a20', style: 'short', shirt: C.green, pants: C.navy, cap: C.dkgreen, emblem: 'Z' }),
  guest1: L({ hair: C.yellow, style: 'long', shirt: C.pink, dress: C.purple }),
  guest2: L({ hair: C.black, shirt: C.teal }),
  guest3: L({ hair: C.orange, shirt: C.orange }),
  kidA: L({ size: 'kid', hair: C.orange, style: 'spiky', shirt: C.green }),
  kidB: L({ size: 'kid', hair: C.black, style: 'short', shirt: C.yellow }),
};

function A(a) { return [Math.sin(a), Math.cos(a)]; }

function pose(name, t, f = 1) {
  const p = { la: [-0.35, -0.2], ra: [0.35, 0.2], ll: [-0.12, -0.08], rl: [0.12, 0.08], rot: 0, dy: 0, face: 'happy' };
  const s = Math.sin(t * 9);
  const guard = () => { p.la = [-0.5, 2.8]; p.ra = [0.5, -2.8]; };
  switch (name) {
    case 'walk': p.ll = [-0.1 + 0.3 * s, 0.3 * s]; p.rl = [0.1 - 0.3 * s, -0.3 * s]; p.la = [-0.3 - 0.35 * s, -0.2 - 0.3 * s]; p.ra = [0.3 + 0.35 * s, 0.2 + 0.3 * s]; p.dy = -Math.abs(s) * 6; break;
    case 'run': { const r = Math.sin(t * 14); p.ll = [-0.1 + 0.6 * r, 0.2 + 0.6 * r]; p.rl = [0.1 - 0.6 * r, -0.2 - 0.6 * r]; p.la = [-0.6 - 0.6 * r, 1.2]; p.ra = [0.6 + 0.6 * r, -1.2]; p.dy = -Math.abs(r) * 10; p.rot = 0.1 * f; break; }
    case 'wave': p.ra = [2.3 + 0.25 * Math.sin(t * 10), 2.8 + 0.4 * Math.sin(t * 10)]; break;
    case 'wave2': p.ra = [2.3 + 0.25 * Math.sin(t * 10), 2.8 + 0.4 * Math.sin(t * 10)]; p.la = [-2.3 - 0.25 * Math.sin(t * 10 + 1), -2.8 - 0.4 * Math.sin(t * 10 + 1)]; break;
    case 'hug': p.la = [-1.35, -1.1]; p.ra = [1.35, 1.1]; break;
    case 'guard': guard(); p.ll = [-0.3, -0.2]; p.rl = [0.3, 0.2]; p.dy = -Math.abs(Math.sin(t * 6)) * 5; break;
    case 'punch': guard(); if (f > 0) p.ra = [1.57, 1.57]; else p.la = [-1.57, -1.57]; p.ll = [-0.3, -0.2]; p.rl = [0.3, 0.2]; break;
    case 'kick': guard(); if (f > 0) p.rl = [1.35, 1.6]; else p.ll = [-1.35, -1.6]; p.rot = -0.15 * f; break;
    case 'jump': p.ll = [-0.7, 0.2]; p.rl = [0.7, -0.2]; p.la = [-2.5, -2.8]; p.ra = [2.5, 2.8]; p.face = 'wow'; break;
    case 'tuck': p.ll = [-1.4, 0.5]; p.rl = [1.4, -0.5]; p.la = [-1.2, 0.4]; p.ra = [1.2, -0.4]; p.face = 'wow'; break;
    case 'sit': p.ll = [-1.35, -0.05]; p.rl = [1.35, 0.05]; break;
    case 'cross': p.la = [-0.45, 1.85]; p.ra = [0.45, -1.85]; p.face = 'serious'; break;
    case 'point': p.ra = [1.9, 1.9]; break;
    case 'win': p.ra = [2.9, 3.05]; p.la = [-2.9, -3.05]; break;
    case 'hero': p.la = [-0.9, 0.9]; p.ra = [0.9, -0.9]; break;
    case 'laptop': p.la = [-0.3, 1.25]; p.ra = [0.3, -1.25]; break;
    case 'phone': p.ra = [0.4, -2.6]; break;
    case 'draw': p.ra = [0.7, 1.5 + 0.35 * Math.sin(t * 12)]; p.la = [-0.3, 1.2]; p.ll = [-1.35, -0.05]; p.rl = [1.35, 0.05]; break;
    case 'type': p.la = [-0.3, 1.3 + 0.2 * Math.sin(t * 25)]; p.ra = [0.3, -1.3 - 0.2 * Math.sin(t * 23)]; p.ll = [-1.35, -0.05]; p.rl = [1.35, 0.05]; break;
    case 'sad': p.face = 'sad'; break;
    case 'lie': p.rot = Math.PI / 2 * f; p.face = 'ouch'; break;
  }
  return p;
}

function limb(ctx, x, y, a1, a2, len, col, w, endCol, endR) {
  const [dx1, dy1] = A(a1), [dx2, dy2] = A(a2);
  const mx = x + dx1 * len * 0.52, my = y + dy1 * len * 0.52;
  const ex = mx + dx2 * len * 0.52, ey = my + dy2 * len * 0.52;
  line(ctx, [[x, y], [mx, my], [ex, ey]], col, w, { amp: 1.5, overshoot: false });
  if (endCol) circle(ctx, ex, ey, endR, { fill: endCol, stroke: C.black, lw: 4, spacing: 7, w: 7 });
  return [ex, ey];
}

function face(ctx, hx, hy, r, lk, expr, t, talking) {
  const e = r * 0.34, ey = hy - r * 0.08;
  const blink = (t % 3.3) < 0.12;
  if (lk.battered) {
    circle(ctx, hx - e, ey, r * 0.2, { fill: C.purple, stroke: C.purple, lw: 3, spacing: 5, w: 5 });
  }
  if (blink) {
    line(ctx, [[hx - e - 6, ey], [hx - e + 6, ey]], C.black, 5);
    line(ctx, [[hx + e - 6, ey], [hx + e + 6, ey]], C.black, 5);
  } else if (expr === 'ouch') {
    line(ctx, [[hx - e - 7, ey - 7], [hx - e + 7, ey + 7]], C.black, 5); line(ctx, [[hx - e + 7, ey - 7], [hx - e - 7, ey + 7]], C.black, 5);
    line(ctx, [[hx + e - 7, ey - 7], [hx + e + 7, ey + 7]], C.black, 5); line(ctx, [[hx + e + 7, ey - 7], [hx + e - 7, ey + 7]], C.black, 5);
  } else {
    dot(ctx, hx - e, ey, r * 0.11, C.black);
    dot(ctx, hx + e, ey, r * 0.11, C.black);
    dot(ctx, hx - e + 2, ey - 3, r * 0.035, C.white);
    dot(ctx, hx + e + 2, ey - 3, r * 0.035, C.white);
  }
  if (expr === 'serious') {
    line(ctx, [[hx - e - 10, ey - 16], [hx - e + 8, ey - 11]], C.black, 5);
    line(ctx, [[hx + e + 10, ey - 16], [hx + e - 8, ey - 11]], C.black, 5);
  }
  if (!lk.beard || lk.size !== 'adult') {
    ctx.save(); ctx.globalAlpha = 0.35;
    dot(ctx, hx - r * 0.55, hy + r * 0.2, r * 0.13, C.pink); dot(ctx, hx + r * 0.55, hy + r * 0.2, r * 0.13, C.pink);
    ctx.restore();
  }
  if (lk.beard) {
    const bp = [];
    for (let i = 0; i <= 12; i++) { const a = Math.PI * 0.08 + i / 12 * Math.PI * 0.84; bp.push([hx + Math.cos(a) * r * 0.92, hy + Math.sin(a) * r * 0.95]); }
    bp.push([hx - r * 0.55, hy + r * 0.1]); bp.push([hx + r * 0.55, hy + r * 0.1]);
    fill(ctx, bp, lk.beard, { spacing: 6, w: 5, alpha: 0.75 });
  }
  if (lk.stache) line(ctx, [[hx - r * 0.35, hy + r * 0.28], [hx, hy + r * 0.2], [hx + r * 0.35, hy + r * 0.28]], lk.hair, 9);
  const my = hy + r * 0.45;
  if (talking && Math.floor(t * 8) % 2) {
    circle(ctx, hx, my, r * 0.17, { ry: r * 0.13, fill: '#b5173a', stroke: C.black, lw: 4, spacing: 5, w: 5 });
  } else if (expr === 'sad') {
    line(ctx, [[hx - r * 0.25, my + 6], [hx, my - 4], [hx + r * 0.25, my + 6]], C.black, 5);
  } else if (expr === 'wow' || expr === 'ouch') {
    circle(ctx, hx, my, r * 0.1, { stroke: C.black, lw: 4 });
  } else if (expr === 'serious') {
    line(ctx, [[hx - r * 0.2, my], [hx + r * 0.2, my]], C.black, 5);
  } else {
    line(ctx, [[hx - r * 0.3, my - 6], [hx - r * 0.12, my + 4], [hx + r * 0.12, my + 4], [hx + r * 0.3, my - 6]], C.black, 5);
  }
  if (lk.battered) {
    line(ctx, [[hx + r * 0.3, hy + r * 0.05], [hx + r * 0.7, hy + r * 0.4]], C.white, 12);
    line(ctx, [[hx + r * 0.3, hy + r * 0.4], [hx + r * 0.7, hy + r * 0.05]], C.white, 12);
    line(ctx, [[hx - r * 0.95, hy - r * 0.45], [hx + r * 0.95, hy - r * 0.45]], C.white, 16);
    dot(ctx, hx + r * 0.2, hy - r * 0.45, 6, C.red);
  }
}

function hair(ctx, hx, hy, r, lk, back) {
  const hc = lk.hair;
  const cap = [];
  for (let i = 0; i <= 14; i++) { const a = Math.PI + i / 14 * Math.PI; cap.push([hx + Math.cos(a) * (r + 4), hy + Math.sin(a) * (r + 4)]); }
  switch (lk.style) {
    case 'short': cap.push([hx + r * 0.9, hy - r * 0.15], [hx - r * 0.9, hy - r * 0.15]); fill(ctx, cap, hc, { spacing: 8, w: 8 }); line(ctx, cap.slice(0, 15), hc, 8); break;
    case 'spiky': {
      const sp = [];
      for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI; const rr = r + (i % 2 ? 20 : 2); sp.push([hx + Math.cos(a) * rr, hy + Math.sin(a) * rr]); }
      sp.push([hx + r * 0.9, hy - r * 0.2], [hx - r * 0.9, hy - r * 0.2]);
      fill(ctx, sp, hc, { spacing: 8, w: 8 }); line(ctx, sp.slice(0, 9), hc, 7); break;
    }
    case 'long':
      if (back) { rect(ctx, hx - r - 12, hy - r * 0.2, 26, r * 2.2, { fill: hc, stroke: hc, lw: 5 }); rect(ctx, hx + r - 14, hy - r * 0.2, 26, r * 2.2, { fill: hc, stroke: hc, lw: 5 }); return; }
      cap.push([hx + r * 0.9, hy - r * 0.2], [hx - r * 0.9, hy - r * 0.2]); fill(ctx, cap, hc, { spacing: 8, w: 8 }); line(ctx, cap.slice(0, 15), hc, 8); break;
    case 'pony':
      if (back) return;
      cap.push([hx + r * 0.9, hy - r * 0.2], [hx - r * 0.9, hy - r * 0.2]); fill(ctx, cap, hc, { spacing: 8, w: 8 }); line(ctx, cap.slice(0, 15), hc, 8);
      circle(ctx, hx + r + 14, hy - r * 0.2, 18, { ry: 26, fill: hc, stroke: hc, lw: 5 });
      shape(ctx, [[hx + r, hy - r * 0.6], [hx + r + 16, hy - r * 0.9], [hx + r + 14, hy - r * 0.3]], { fill: C.red, stroke: C.red, lw: 4 });
      break;
    case 'buzz': {
      const r2 = nextRng();
      const k = r / 56;
      for (let i = 0; i < 70 * Math.min(3, k); i++) {
        const a = Math.PI + 0.15 + r2() * (Math.PI - 0.3), rr = r * (0.3 + r2() * 0.68);
        dot(ctx, hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * 0.95, 2.4 * Math.sqrt(k), hc);
      }
      break;
    }
    case 'thin': {
      const r2 = nextRng();
      for (let i = 0; i < 14; i++) {
        const a = Math.PI + 0.25 + (i / 13) * (Math.PI - 0.5);
        if (Math.abs(a - Math.PI * 1.5) < 0.5) continue;
        const x0 = hx + Math.cos(a) * r * 0.9, y0 = hy + Math.sin(a) * r * 0.9;
        line(ctx, [[x0, y0], [x0 + Math.cos(a) * 14 + (r2() - .5) * 6, y0 + Math.sin(a) * 14]], hc, 4, { passes: 1 });
      }
      break;
    }
  }
}

// Personaje frontal (como dibujan los niños). (x, y) = pies.
function person(ctx, x, y, lk, pname = 'stand', t = 0, o = {}) {
  const f = o.face || 1;
  const Z = SIZES[lk.size];
  const s = (o.scale || 1) * lk.s;
  const hr = Z.hr * s, th = Z.th * s, tw = Z.tw * s, leg = Z.leg * s, arm = Z.arm * s, lw = Z.lw * s;
  const p = pose(pname, t, f);
  if (o.expr) p.face = o.expr;
  const hip = y - leg + p.dy - (o.lift || 0);
  const top = hip - th;
  ctx.save();
  const rot = (o.rot ?? 0) + p.rot;
  if (rot) { const cy = hip - th * 0.4; ctx.translate(x, cy); ctx.rotate(rot); ctx.translate(-x, -cy); }
  const hx = x, hy = top - hr + 10 * s;
  if (lk.cape) {
    const w = Math.sin(t * 5) * 18;
    shape(ctx, [[x - tw * 0.45, top + 8], [x + tw * 0.45, top + 8], [x + tw * 0.9 + w, hip + leg * 0.8], [x - tw * 0.9 + w * 0.6, hip + leg * 0.85]], { fill: lk.cape, stroke: C.black, lw: 6 });
  }
  if (lk.style === 'long') hair(ctx, hx, hy, hr, lk, true);
  // piernas
  const lc = lk.shirtless && !lk.pants ? lk.skin : lk.pants;
  limb(ctx, x - tw * 0.22, hip, p.ll[0], p.ll[1], leg, lc, lw, lk.shoes, lw * 0.62);
  limb(ctx, x + tw * 0.22, hip, p.rl[0], p.rl[1], leg, lc, lw, lk.shoes, lw * 0.62);
  // torso
  const shirt = lk.shirtless ? lk.skin : lk.shirt;
  const tp = [[x - tw / 2, top + 6], [x + tw / 2, top + 6], [x + tw * 0.46, hip + 4], [x - tw * 0.46, hip + 4]];
  shape(ctx, tp, { fill: shirt, stroke: C.black, lw: 6 });
  if (lk.shirtless) {
    line(ctx, [[x - tw * 0.2, top + th * 0.3], [x - 4, top + th * 0.36]], C.brown, 4);
    line(ctx, [[x + tw * 0.2, top + th * 0.3], [x + 4, top + th * 0.36]], C.brown, 4);
    dot(ctx, x, top + th * 0.62, 3, C.brown);
    rect(ctx, x - tw * 0.46, hip - 16 * s, tw * 0.92, 20 * s, { fill: lk.pants, stroke: C.black, lw: 5 });
  }
  if (lk.dress) shape(ctx, [[x - tw * 0.42, top + th * 0.5], [x + tw * 0.42, top + th * 0.5], [x + tw * 0.95, hip + leg * 0.55], [x - tw * 0.95, hip + leg * 0.55]], { fill: lk.dress, stroke: C.black, lw: 6 });
  if (lk.emblem) {
    circle(ctx, x, top + th * 0.38, 20 * s, { fill: C.yellow, stroke: C.black, lw: 4, spacing: 7, w: 7 });
    F.write(ctx, lk.emblem, x - 10 * s, top + th * 0.38 - 15 * s, 5 * s, C.red, 9, 3);
  }
  if (lk.halo) {
    line(ctx, [[x - tw * 0.4, top + 10], [hx - hr - 16, hy]], C.grey, 6);
    line(ctx, [[x + tw * 0.4, top + 10], [hx + hr + 16, hy]], C.grey, 6);
  }
  // cabeza
  circle(ctx, hx, hy, hr, { fill: lk.skin, stroke: C.black, lw: 6, spacing: 11, w: 10 });
  hair(ctx, hx, hy, hr, lk, false);
  if (lk.cap) {
    const cp = [];
    for (let i = 0; i <= 12; i++) { const a = Math.PI + i / 12 * Math.PI; cp.push([hx + Math.cos(a) * (hr + 5), hy - hr * 0.2 + Math.sin(a) * (hr * 0.85)]); }
    shape(ctx, cp, { fill: lk.cap, stroke: C.black, lw: 5 });
    line(ctx, [[hx, hy - hr * 0.25], [hx + hr * 1.5 * f, hy - hr * 0.2]], lk.cap, 12);
  }
  face(ctx, hx, hy, hr, lk, p.face, t, o.talk);
  if (lk.glasses) { circle(ctx, hx - hr * 0.34, hy - 6, 13, { stroke: C.black, lw: 4 }); circle(ctx, hx + hr * 0.34, hy - 6, 13, { stroke: C.black, lw: 4 }); }
  if (lk.halo) circle(ctx, hx, hy - 6, hr + 18, { ry: hr * 0.45, stroke: C.grey, lw: 7 });
  // brazos
  const sl = lk.shirtless ? lk.skin : lk.shirt;
  const hand = lk.gloves || lk.skin;
  const hrad = lk.gloves ? lw * 1.05 : lw * 0.5;
  const handL = limb(ctx, x - tw / 2 + 4, top + 16 * s, p.la[0], p.la[1], arm, sl, lw * 0.85, hand, hrad);
  const handR = limb(ctx, x + tw / 2 - 4, top + 16 * s, p.ra[0], p.ra[1], arm, sl, lw * 0.85, hand, hrad);
  if (pname === 'laptop') {
    rect(ctx, x - 50 * s, top + th * 0.45, 100 * s, 60 * s, { fill: C.grey, stroke: C.black, lw: 5 });
    rect(ctx, x - 40 * s, top + th * 0.45 + 8, 80 * s, 40 * s, { fill: C.ltblue, stroke: null });
  }
  if (pname === 'phone') rect(ctx, handR[0] - 12, handR[1] - 40, 24, 40, { fill: C.black, stroke: C.black, lw: 4 });
  ctx.restore();
  return { head: [hx, hy - hr], hands: [handL, handR], top: hy - hr };
}

// ---------------------------------------------------------------- ANIMALES
function dog(ctx, x, y, col, t, f = 1, kind = 'dog') {
  const galgo = kind === 'galgo';
  const bw = galgo ? 62 : 52, bh = galgo ? 18 : 26, lg = galgo ? 48 : 30;
  const st = Math.sin(t * 12);
  const by = y - lg - bh * 0.5;
  for (const [dx, ph] of [[-bw * 0.7, 0], [-bw * 0.4, 1], [bw * 0.45, 1], [bw * 0.75, 0]]) {
    const sw = (ph ? st : -st) * 10;
    line(ctx, [[x + dx * f, by + bh * 0.4], [x + dx * f + sw, y]], C.black, 7);
  }
  circle(ctx, x, by, bw, { ry: bh, fill: col, stroke: C.black, lw: 5, spacing: 9, w: 8 });
  const wag = Math.sin(t * 16) * 0.5;
  line(ctx, [[x - bw * f, by - 4], [x - (bw + 30) * f, by - 30 - wag * 20]], C.black, galgo ? 5 : 7);
  const hx = x + bw * 0.85 * f, hy = by - bh - 12;
  circle(ctx, hx, hy, galgo ? 18 : 24, { ry: galgo ? 15 : 22, fill: col, stroke: C.black, lw: 5, spacing: 8, w: 7 });
  if (galgo) shape(ctx, [[hx + 10 * f, hy - 8], [hx + 44 * f, hy + 6], [hx + 10 * f, hy + 12]], { fill: col, stroke: C.black, lw: 5 });
  else circle(ctx, hx + 18 * f, hy + 6, 12, { ry: 9, fill: col, stroke: C.black, lw: 4 });
  shape(ctx, [[hx - 6 * f, hy - 18], [hx - 22 * f, hy - 6], [hx - 12 * f, hy + 14]], { fill: shade(col), stroke: C.black, lw: 4 });
  dot(ctx, hx + 6 * f, hy - 5, 4, C.black);
  dot(ctx, hx + (galgo ? 44 : 29) * f, hy + (galgo ? 6 : 4), 5, C.black);
}
function shade(col) {
  const n = parseInt(col.slice(1), 16);
  const r = (n >> 16) * 0.7, g = ((n >> 8) & 255) * 0.7, b = (n & 255) * 0.7;
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}
function cat(ctx, x, y, col, t) {
  circle(ctx, x, y - 26, 34, { ry: 22, fill: col, stroke: C.black, lw: 5 });
  circle(ctx, x + 34, y - 52, 20, { fill: col, stroke: C.black, lw: 5 });
  shape(ctx, [[x + 20, y - 64], [x + 22, y - 84], [x + 32, y - 70]], { fill: col, stroke: C.black, lw: 4 });
  shape(ctx, [[x + 38, y - 70], [x + 48, y - 84], [x + 50, y - 62]], { fill: col, stroke: C.black, lw: 4 });
  dot(ctx, x + 30, y - 54, 3, C.black); dot(ctx, x + 42, y - 54, 3, C.black);
  line(ctx, [[x + 44, y - 46], [x + 62, y - 50]], C.black, 2); line(ctx, [[x + 44, y - 44], [x + 62, y - 42]], C.black, 2);
  const w = Math.sin(t * 3) * 10;
  line(ctx, [[x - 32, y - 28], [x - 52, y - 50], [x - 44 + w, y - 76]], C.black, 7);
}

// ---------------------------------------------------------------- OBJETOS
function sun(ctx, x, y, r, t, col = C.yellow) {
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + t * 0.4;
    line(ctx, [[x + Math.cos(a) * (r + 12), y + Math.sin(a) * (r + 12)], [x + Math.cos(a) * (r + 44), y + Math.sin(a) * (r + 44)]], C.orange, 9);
  }
  circle(ctx, x, y, r, { fill: col, stroke: C.orange, lw: 8 });
  dot(ctx, x - r * 0.3, y - r * 0.15, 6, C.black); dot(ctx, x + r * 0.3, y - r * 0.15, 6, C.black);
  line(ctx, [[x - r * 0.35, y + r * 0.25], [x, y + r * 0.45], [x + r * 0.35, y + r * 0.25]], C.black, 5);
}
function moon(ctx, x, y, r) {
  shape(ctx, [[x, y - r], [x + r * 0.6, y - r * 0.4], [x + r * 0.7, y + r * 0.3], [x + r * 0.2, y + r], [x - r * 0.3, y + r * 0.9],
    [x + r * 0.15, y + r * 0.4], [x + r * 0.2, y - r * 0.3], [x - r * 0.1, y - r * 0.8]], { fill: C.yellow, stroke: C.orange, lw: 6 });
}
function cloud(ctx, x, y, s = 1, col = '#ffffff', edge = C.ltblue) {
  const pts = [];
  for (let i = 0; i < 44; i++) {
    const a = i / 44 * Math.PI * 2;
    const rr = 1 + 0.22 * Math.abs(Math.sin(a * 3.5));
    pts.push([x + Math.cos(a) * 110 * rr * s, y + Math.min(26, Math.sin(a) * 55 * rr) * s]);
  }
  shape(ctx, pts, { fill: col, stroke: edge, lw: 7, alpha: 0.6 });
}
function star(ctx, x, y, r, col = C.yellow) {
  const p = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? r * 0.45 : r; p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  shape(ctx, p, { fill: col, stroke: C.orange, lw: 5, spacing: 7, w: 7 });
}
function heart(ctx, x, y, s, col = C.red) {
  const p = [];
  for (let i = 0; i < 30; i++) {
    const a = i / 30 * Math.PI * 2;
    const hx = 16 * Math.pow(Math.sin(a), 3), hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
    p.push([x + hx * s, y + hy * s]);
  }
  shape(ctx, p, { fill: col, stroke: C.red, lw: 5, spacing: 7, w: 7 });
}
function snowflake(ctx, x, y, r) {
  for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; line(ctx, [[x - Math.cos(a) * r, y - Math.sin(a) * r], [x + Math.cos(a) * r, y + Math.sin(a) * r]], C.ltblue, 4, { passes: 1 }); }
}
function house(ctx, x, y, w, h, wall, roof, o = {}) {
  rect(ctx, x, y - h, w, h, { fill: wall, stroke: C.black, lw: 7 });
  shape(ctx, [[x - 20, y - h], [x + w / 2, y - h - h * 0.75], [x + w + 20, y - h]], { fill: roof, stroke: C.black, lw: 7 });
  if (o.chimney) { rect(ctx, x + w * 0.7, y - h - h * 0.62, 24, 50, { fill: C.brown, stroke: C.black, lw: 5 }); }
  rect(ctx, x + w / 2 - 22, y - 80, 44, 80, { fill: C.brown, stroke: C.black, lw: 6 });
  dot(ctx, x + w / 2 + 12, y - 40, 5, C.yellow);
  for (const wx of [x + 20, x + w - 70]) {
    rect(ctx, wx, y - h + 30, 50, 46, { fill: o.win || C.ltblue, stroke: C.black, lw: 6 });
    line(ctx, [[wx + 25, y - h + 30], [wx + 25, y - h + 76]], C.black, 4);
    line(ctx, [[wx, y - h + 53], [wx + 50, y - h + 53]], C.black, 4);
  }
}
function tree(ctx, x, y, s = 1, col = C.green, fruit = false) {
  rect(ctx, x - 16 * s, y - 110 * s, 32 * s, 110 * s, { fill: C.brown, stroke: C.black, lw: 6 });
  const p = [];
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const rr = (80 + (i % 2) * 18) * s; p.push([x + Math.cos(a) * rr, y - 170 * s + Math.sin(a) * rr * 0.85]); }
  shape(ctx, p, { fill: col, stroke: C.dkgreen, lw: 7 });
  if (fruit) for (let k = 0; k < 5; k++) dot(ctx, x + Math.cos(k * 1.7) * 50 * s, y - 170 * s + Math.sin(k * 2.3) * 40 * s, 9 * s, C.red);
}
function flower(ctx, x, y, col = C.pink, s = 1) {
  line(ctx, [[x, y], [x, y - 50 * s]], C.green, 6);
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; circle(ctx, x + Math.cos(a) * 12 * s, y - 50 * s + Math.sin(a) * 12 * s, 9 * s, { fill: col, stroke: col, lw: 3, spacing: 5, w: 5 }); }
  dot(ctx, x, y - 50 * s, 7 * s, C.yellow);
}
function sunflower(ctx, x, y, h = 150) {
  line(ctx, [[x, y], [x + 4, y - h]], C.green, 8);
  line(ctx, [[x + 2, y - h * 0.5], [x + 30, y - h * 0.6]], C.green, 6);
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; circle(ctx, x + 4 + Math.cos(a) * 24, y - h + Math.sin(a) * 24, 12, { fill: C.yellow, stroke: C.orange, lw: 3, spacing: 6, w: 6 }); }
  circle(ctx, x + 4, y - h, 16, { fill: C.brown, stroke: C.black, lw: 4, spacing: 6, w: 6 });
}
function grassTufts(ctx, y0, y1, n, seed = 1) {
  const r = D.rngFor(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * D.W, y = y0 + r() * (y1 - y0);
    line(ctx, [[x - 8, y - 12], [x, y], [x + 8, y - 14]], C.dkgreen, 4, { passes: 1 });
  }
}
function ground(ctx, y, col, edge, seed = 1, amp = 30) {
  const p = [[-20, D.H], [-20, y]];
  for (let x = 0; x <= D.W + 40; x += 60) p.push([x, y + Math.sin(x * 0.006 + seed) * amp]);
  p.push([D.W + 20, D.H]);
  fill(ctx, p, col, { spacing: 16, w: 14, alpha: 0.75 });
  line(ctx, p.slice(1, -1), edge, 8);
}
function sky(ctx, y1, col, alpha = 0.35) {
  fill(ctx, [[0, 0], [D.W, 0], [D.W, y1], [0, y1]], col, { spacing: 22, w: 18, alpha, passes: 1 });
}
function flag(ctx, x, y, kind, t, s = 1) {
  line(ctx, [[x, y], [x, y - 260 * s]], C.brown, 9);
  const w = 130 * s, h = 86 * s, top = y - 260 * s;
  const wv = (u) => Math.sin(t * 5 - u * 4) * 8 * s * u;
  const P = (u, v) => [x + u * w, top + v * h + wv(u)];
  const band = (v0, v1, col) => shape(ctx, [P(0, v0), P(0.5, v0), P(1, v0), P(1, v1), P(0.5, v1), P(0, v1)], { fill: col, stroke: null, spacing: 9, w: 9 });
  if (kind === 'UA') { band(0, .5, C.blue); band(.5, 1, C.yellow); }
  else if (kind === 'ES') { band(0, .25, C.red); band(.25, .75, C.yellow); band(.75, 1, C.red); }
  else {
    band(0, 1, '#ffffff');
    line(ctx, [P(.5, 0), P(.5, 1)], C.red, 12);
    line(ctx, [P(0, .5), P(1, .5)], C.red, 12);
    for (const [u, v] of [[.22, .22], [.78, .22], [.22, .78], [.78, .78]]) {
      const [cx, cy] = P(u, v);
      line(ctx, [[cx - 7, cy], [cx + 7, cy]], C.red, 5); line(ctx, [[cx, cy - 7], [cx, cy + 7]], C.red, 5);
    }
  }
  line(ctx, [P(0, 0), P(.5, 0), P(1, 0), P(1, 1), P(.5, 1), P(0, 1)], C.black, 5, { closed: true });
}
function bus(ctx, x, y, w, t, faces = [], col = C.yellow, moving = false) {
  const h = 150;
  rect(ctx, x, y - h - 30, w, h, { fill: col, stroke: C.black, lw: 8 });
  rect(ctx, x, y - 90, w, 18, { fill: C.red, stroke: null });
  const n = Math.floor((w - 60) / 80);
  for (let i = 0; i < n; i++) {
    const wx = x + 20 + i * 80;
    rect(ctx, wx, y - h - 10, 60, 56, { fill: C.ltblue, stroke: C.black, lw: 5 });
    if (faces[i]) {
      const [sk, hc] = faces[i];
      circle(ctx, wx + 30, y - h + 22, 18, { fill: sk, stroke: C.black, lw: 4, spacing: 7, w: 6 });
      line(ctx, [[wx + 14, y - h + 10], [wx + 30, y - h + 2], [wx + 46, y - h + 10]], hc, 8);
      dot(ctx, wx + 24, y - h + 20, 3, C.black); dot(ctx, wx + 36, y - h + 20, 3, C.black);
    }
  }
  rect(ctx, x + w - 50, y - h - 10, 36, 110, { fill: C.ltgrey, stroke: C.black, lw: 5 });
  circle(ctx, x + w - 4, y - 70, 10, { fill: C.yellow, stroke: C.black, lw: 4 });
  for (const wx of [x + 70, x + w - 90]) {
    circle(ctx, wx, y - 20, 34, { fill: C.black, stroke: C.black, lw: 6, spacing: 8 });
    circle(ctx, wx, y - 20, 12, { fill: C.ltgrey, stroke: C.ltgrey, lw: 3 });
    const a = moving ? t * 8 : 0;
    line(ctx, [[wx, y - 20], [wx + Math.cos(a) * 26, y - 20 + Math.sin(a) * 26]], C.ltgrey, 4);
  }
  if (moving) for (let k = 0; k < 3; k++) line(ctx, [[x - 30 - k * 10, y - 60 - k * 30], [x - 90 - k * 10, y - 60 - k * 30]], C.grey, 5);
}
function burst(ctx, x, y, r, col = C.yellow, edge = C.red) {
  const p = [];
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; const rr = i % 2 ? r * 0.55 : r; p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  shape(ctx, p, { fill: col, stroke: edge, lw: 9 });
}
function bubble(ctx, x, y, w, h, tx, ty) {
  const p = ellipsePts(x + w / 2, y + h / 2, w / 2 + 20, h / 2 + 18, 32);
  fill(ctx, p, '#ffffff', { spacing: 10, w: 10, alpha: 0.9 });
  line(ctx, p, C.black, 6, { closed: true });
  shape(ctx, [[x + w * 0.4, y + h + 10], [tx, ty], [x + w * 0.62, y + h + 8]], { fill: '#ffffff', stroke: C.black, lw: 5 });
}
function arrow(ctx, x0, y0, x1, y1, col = C.black) {
  line(ctx, [[x0, y0], [(x0 + x1) / 2 + 20, (y0 + y1) / 2 - 20], [x1, y1]], col, 5);
  const a = Math.atan2(y1 - ((y0 + y1) / 2 - 20), x1 - ((x0 + x1) / 2 + 20));
  line(ctx, [[x1 - Math.cos(a - 0.5) * 22, y1 - Math.sin(a - 0.5) * 22], [x1, y1], [x1 - Math.cos(a + 0.5) * 22, y1 - Math.sin(a + 0.5) * 22]], col, 5);
}
function label(ctx, txt, x, y, ax, ay, col = C.black, u = 6) {
  F.write(ctx, txt, x, y, u, col, 99, txt.length * 7);
  arrow(ctx, x + F.width(txt, u) / 2, y + 7 * u + 6, ax, ay, col);
}
function bag(ctx, x, y, col, sw = 0) {
  line(ctx, [[x, 190], [x + sw * 0.5, y]], C.grey, 6);
  ctx.save(); ctx.translate(x, y); ctx.rotate(-sw * 0.004); ctx.translate(-x, -y);
  rect(ctx, x - 55 + sw, y, 110, 250, { fill: col, stroke: C.black, lw: 8 });
  line(ctx, [[x - 55 + sw, y + 40], [x + 55 + sw, y + 40]], C.black, 5);
  line(ctx, [[x - 55 + sw, y + 210], [x + 55 + sw, y + 210]], C.black, 5);
  ctx.restore();
}
function words(ctx, txt, x, y, u, col, prog = 99, seed = 5) {
  F.write(ctx, txt, x, y, u, col, prog, seed);
}

module.exports = { LOOK, person, dog, cat, sun, moon, cloud, star, heart, snowflake, house, tree, flower, sunflower,
  grassTufts, ground, sky, flag, bus, burst, bubble, arrow, label, bag, words };
