// Personajes y decorados en estilo editorial (tintas planas + semitono).
'use strict';
const { W, H, Ink, rng } = require('./ink');

// colores = [tinta, opacidad]
const SK = ['pink', 0.55], SK2 = ['coral', 0.4];
function L(o) {
  return Object.assign({ size: 1, skin: SK, hair: ['navy', 1], style: 'short', shirt: ['teal', 1], pants: ['navy', 1],
    shoes: ['black', 1], beard: null, stache: false, dress: null, gloves: null, shirtless: false, halo: false,
    cap: null, glasses: false, battered: false, kid: false, bag: null }, o);
}
const LOOK = {
  papa: L({ shirt: ['coral', 1], pants: ['navy', 1], stache: true }),
  papaW: L({ shirt: ['mustard', 1], pants: ['navy', 1], stache: true, coat: true }),
  mama: L({ size: 0.94, hair: ['mustard', 1], style: 'long', shirt: ['pink', 0.9], dress: ['teal', 1] }),
  mamaW: L({ size: 0.94, hair: ['mustard', 1], style: 'long', shirt: ['coral', 0.8], dress: ['navy', 0.8] }),
  kid: L({ size: 0.68, kid: true, style: 'kid', shirt: ['mustard', 1], pants: ['navy', 1] }),
  kid5: L({ size: 0.58, kid: true, style: 'kid', shirt: ['coral', 1], pants: ['navy', 1] }),
  sis: L({ size: 0.56, kid: true, hair: ['coral', 0.9], style: 'pony', shirt: ['pink', 1], dress: ['pink', 1] }),
  sis3: L({ size: 0.48, kid: true, hair: ['coral', 0.9], style: 'pony', shirt: ['teal', 1], dress: ['teal', 1] }),
  kidKick: L({ size: 0.68, kid: true, style: 'kid', shirt: ['paper', 1], pants: ['navy', 1], gloves: ['coral', 1], shoes: SK }),
  teen: L({ size: 0.9, style: 'short', shirt: ['teal', 1], pants: ['navy', 1], shoes: ['paper', 1] }),
  teenHalo: L({ size: 0.9, style: 'short', shirt: ['paper', 1], pants: ['navy', 1], halo: true }),
  young: L({ style: 'short', beard: ['navy', 0.85], shirt: ['black', 0.9], pants: ['navy', 1], shoes: ['paper', 1] }),
  youngFight: L({ style: 'short', beard: ['navy', 0.85], shirtless: true, pants: ['black', 1], gloves: ['coral', 1], shoes: SK }),
  thin: L({ style: 'thin', beard: ['navy', 0.85], shirt: ['black', 0.9] }),
  vaj: L({ style: 'buzz', beard: ['navy', 0.85], shirt: ['black', 0.9], pants: ['navy', 1], shoes: ['paper', 1] }),
  vajRed: L({ style: 'buzz', beard: ['navy', 0.85], shirt: ['coral', 1], pants: ['navy', 1] }),
  vajFight: L({ style: 'buzz', beard: ['navy', 0.85], shirtless: true, pants: ['coral', 1], gloves: ['coral', 1], shoes: SK }),
  vajMMA: L({ style: 'buzz', beard: ['navy', 0.85], shirtless: true, pants: ['black', 1], gloves: ['black', 0.9], shoes: SK }),
  vajBeaten: L({ style: 'buzz', beard: ['navy', 0.85], shirtless: true, pants: ['black', 1], shoes: SK, battered: true }),
  rival: L({ style: 'short', skin: SK2, beard: ['black', 0.8], shirtless: true, pants: ['teal', 1], gloves: ['teal', 1], shoes: SK2 }),
  juanma: L({ style: 'short', cap: ['teal', 1], shirt: ['mustard', 1], pants: ['navy', 1], shoes: ['paper', 1] }),
  g1: L({ hair: ['mustard', 1], style: 'long', shirt: ['pink', 1], dress: ['navy', 1] }),
  g2: L({ shirt: ['teal', 1] }),
  g3: L({ hair: ['coral', 1], shirt: ['mustard', 1] }),
};

const A = (a) => [Math.sin(a), Math.cos(a)];

function pose(name, t, f = 1) {
  const p = { la: [-0.18, -0.1], ra: [0.18, 0.1], ll: [-0.06, -0.04], rl: [0.06, 0.04], rot: 0, dy: 0, tilt: 0 };
  const s = Math.sin(t * 7);
  const guard = () => { p.la = [-0.35, 2.75]; p.ra = [0.35, -2.75]; };
  switch (name) {
    case 'walk': p.ll = [0.32 * s, 0.32 * s - 0.15]; p.rl = [-0.32 * s, -0.32 * s - 0.15]; p.la = [-0.1 - 0.3 * s, -0.1 - 0.4 * s]; p.ra = [0.1 + 0.3 * s, 0.1 + 0.4 * s]; p.dy = -Math.abs(s) * 6; break;
    case 'run': { const r = Math.sin(t * 12); p.ll = [0.7 * r, 0.7 * r - 0.9 * Math.max(0, r)]; p.rl = [-0.7 * r, -0.7 * r - 0.9 * Math.max(0, -r)]; p.la = [-0.2 - 0.7 * r, 1.4]; p.ra = [0.2 + 0.7 * r, -1.4]; p.dy = -Math.abs(r) * 14; p.rot = 0.12 * f; break; }
    case 'wave': p.ra = [2.2 + 0.2 * Math.sin(t * 9), 2.9 + 0.35 * Math.sin(t * 9)]; break;
    case 'hug': p.la = [-1.2, -1.9]; p.ra = [1.2, 1.9]; break;
    case 'guard': guard(); p.ll = [-0.25, -0.12]; p.rl = [0.25, 0.12]; p.dy = -Math.abs(Math.sin(t * 5)) * 6; break;
    case 'punch': guard(); if (f > 0) p.ra = [1.57, 1.57]; else p.la = [-1.57, -1.57]; p.ll = [-0.25, -0.12]; p.rl = [0.25, 0.12]; break;
    case 'kick': guard(); if (f > 0) p.rl = [1.45, 1.6]; else p.ll = [-1.45, -1.6]; p.rot = -0.18 * f; break;
    case 'tuck': p.ll = [-1.5, 0.3]; p.rl = [1.5, -0.3]; p.la = [-1.3, 0.5]; p.ra = [1.3, -0.5]; break;
    case 'jump': p.ll = [-0.9, 0.4]; p.rl = [0.9, -0.4]; p.la = [-2.4, -2.9]; p.ra = [2.4, 2.9]; break;
    case 'sit': p.ll = [-1.5, -0.1]; p.rl = [1.5, 0.1]; break;
    case 'cross': p.la = [-0.3, 1.9]; p.ra = [0.3, -1.9]; break;
    case 'point': p.ra = [1.95, 1.95]; break;
    case 'win': p.ra = [2.95, 3.05]; p.la = [-2.95, -3.05]; break;
    case 'belt': p.ra = [2.6, 3.0]; p.la = [-2.6, -3.0]; break;
    case 'laptop': p.la = [-0.2, 1.3]; p.ra = [0.2, -1.3]; break;
    case 'phone': p.ra = [0.3, -2.7]; break;
    case 'draw': p.ra = [0.6, 1.5 + 0.3 * Math.sin(t * 10)]; p.la = [-0.2, 1.1]; p.ll = [-1.5, -0.1]; p.rl = [1.5, 0.1]; break;
    case 'type': p.la = [-0.2, 1.35 + 0.15 * Math.sin(t * 24)]; p.ra = [0.2, -1.35 - 0.15 * Math.sin(t * 21)]; p.ll = [-1.5, -0.1]; p.rl = [1.5, 0.1]; break;
    case 'sad': p.tilt = 0.25; break;
    case 'lie': p.rot = Math.PI / 2 * f; break;
    case 'hands': p.la = [-0.1, 0.9]; p.ra = [0.1, -0.9]; break;
  }
  return p;
}

// Personaje. (x,y) = pies. o: {sil: tinta silueta, rot, scale, alpha, face}
function person(I, x, y, lk, pname = 'stand', t = 0, o = {}) {
  const f = o.face || 1;
  const s = (o.scale || 1) * lk.size;
  const kid = lk.kid;
  const hrx = (kid ? 44 : 35) * s, hry = (kid ? 48 : 42) * s;
  const th = (kid ? 150 : 175) * s, sw = (kid ? 118 : 128) * s, hw = (kid ? 92 : 96) * s, leg = (kid ? 180 : 235) * s, arm = (kid ? 165 : 205) * s;
  const lw = (kid ? 40 : 38) * s;
  const p = pose(pname, t, f);
  const al = o.alpha ?? 1;
  const col = (c) => o.sil ? [o.sil, al] : [c[0], c[1] * al];
  const hip = y - leg + p.dy - (o.lift || 0);
  const top = hip - th;
  const c = I.ctx;
  c.save();
  const wasSolid = I.solid; I.solid = true;
  const rot = (o.rot || 0) + p.rot;
  if (rot) { const cy = hip - th * 0.3; c.translate(x, cy); c.rotate(rot); c.translate(-x, -cy); }
  const hx = x, hy = top - hry * 0.95 - 10 * s;
  const limb = (x0, y0, a1, a2, len, cl, w, endc, endr) => {
    const [dx1, dy1] = A(a1), [dx2, dy2] = A(a2);
    const mx = x0 + dx1 * len * 0.5, my = y0 + dy1 * len * 0.5;
    const ex = mx + dx2 * len * 0.5, ey = my + dy2 * len * 0.5;
    I.stroke(cl[0], [[x0, y0], [mx, my]], w, cl[1]);
    I.stroke(cl[0], [[mx, my], [ex, ey]], w * 0.82, cl[1]);
    if (endc) I.circle(endc[0], ex, ey, endr, endc[1]);
    return [ex, ey];
  };
  if (lk.style === 'long') { const h0 = col(lk.hair); I.poly(h0[0], [[hx - hrx - 8, hy], [hx + hrx + 8, hy], [hx + hrx + 14, top + th * 0.35], [hx - hrx - 14, top + th * 0.35]], h0[1]); }
  // piernas
  const pc = col(lk.pants);
  limb(x - hw * 0.28, hip, p.ll[0], p.ll[1], leg, lk.shirtless && !lk.pants ? col(lk.skin) : pc, lw * 1.05, col(lk.shoes), lw * 0.55);
  limb(x + hw * 0.28, hip, p.rl[0], p.rl[1], leg, pc, lw * 1.05, col(lk.shoes), lw * 0.55);
  // torso
  const shirt = col(lk.shirtless ? lk.skin : lk.shirt);
  const tp = [[x - sw * 0.3, top], [x + sw * 0.3, top], [x + sw * 0.47, top + 10 * s], [x + sw / 2, top + 34 * s], [x + hw / 2, hip + 6], [x - hw / 2, hip + 6], [x - sw / 2, top + 34 * s], [x - sw * 0.47, top + 10 * s]];
  I.poly(shirt[0], tp, shirt[1]);
  if (lk.dress) { const d = col(lk.dress); I.poly(d[0], [[x - hw * 0.55, hip - th * 0.35], [x + hw * 0.55, hip - th * 0.35], [x + hw * 1.1, hip + leg * 0.45], [x - hw * 1.1, hip + leg * 0.45]], d[1]); }
  if (lk.shirtless && !o.sil) {
    I.stroke('coral', [[x - sw * 0.28, top + th * 0.33], [x - 6, top + th * 0.38]], 4 * s, 0.6);
    I.stroke('coral', [[x + sw * 0.28, top + th * 0.33], [x + 6, top + th * 0.38]], 4 * s, 0.6);
    I.stroke('coral', [[x, top + th * 0.45], [x, top + th * 0.8]], 3 * s, 0.5);
    I.rect(pc[0], x - hw / 2, hip - 26 * s, hw, 30 * s, pc[1]);
  }
  if (!o.sil) I.halftone('navy', [[x + 4, top + 10 * s], [x + sw / 2, top + 10 * s], [x + hw / 2, hip + 6], [x + 4, hip + 6]], 0.22, 0.9, false, 7);
  if (lk.halo) {
    I.stroke('navy', [[x - sw * 0.35, top + 20], [hx - hrx - 18, hy]], 5, 0.8);
    I.stroke('navy', [[x + sw * 0.35, top + 20], [hx + hrx + 18, hy]], 5, 0.8);
  }
  // cuello y cabeza
  const sk = col(lk.skin);
  I.rect(sk[0], x - 11 * s, top - 6 * s, 22 * s, 22 * s, sk[1]);
  const tilt = p.tilt;
  c.save(); c.translate(hx, hy); c.rotate(tilt); c.translate(-hx, -hy);
  I.circle(sk[0], hx, hy, hrx, sk[1], hry);
  if (!o.sil) I.halftone('coral', [[hx + 6, hy - hry], [hx + hrx + 2, hy - hry], [hx + hrx + 2, hy + hry], [hx + 6, hy + hry]], 0.25, 0.7, false, 6);
  I.circle(sk[0], hx - hrx, hy + 4, 6 * s, sk[1], 10 * s); I.circle(sk[0], hx + hrx, hy + 4, 6 * s, sk[1], 10 * s);
  const hc = col(lk.hair);
  const cap = (h0) => { const pts = []; for (let i = 0; i <= 16; i++) { const a = Math.PI + i / 16 * Math.PI; pts.push([hx + Math.cos(a) * (hrx + 3), hy + Math.sin(a) * (hry + 3)]); } pts.push([hx + hrx + 3, hy - hry * h0], [hx - hrx - 3, hy - hry * h0]); return pts; };
  switch (lk.style) {
    case 'short': I.poly(hc[0], cap(0.25), hc[1]); break;
    case 'long': I.poly(hc[0], cap(0.2), hc[1]); break;
    case 'kid': I.poly(hc[0], cap(0.1), hc[1]); I.poly(hc[0], [[hx - 10, hy - hry - 2], [hx + 4, hy - hry - 16], [hx + 10, hy - hry]], hc[1]); break;
    case 'pony': I.poly(hc[0], cap(0.15), hc[1]); I.circle(hc[0], hx + hrx + 12, hy - hry * 0.3, 12 * s, hc[1], 20 * s); break;
    case 'buzz': I.poly(hc[0], cap(0.35), hc[1] * 0.28); I.halftone(hc[0], cap(0.35), 0.35, hc[1] * 0.9, false, 5); break;
    case 'thin': { const pts = cap(0.3); I.poly(hc[0], pts.slice(0, 5).concat([[hx - hrx * 0.5, hy - hry * 0.4], [hx - hrx, hy - hry * 0.3]]), hc[1] * 0.8);
      I.poly(hc[0], pts.slice(12, 17).concat([[hx + hrx, hy - hry * 0.3], [hx + hrx * 0.5, hy - hry * 0.4]]), hc[1] * 0.8); break; }
  }
  if (lk.cap) { const cc = col(lk.cap); I.poly(cc[0], cap(0.3), cc[1]); I.poly(cc[0], [[hx, hy - hry * 0.35], [hx + (hrx + 34) * f, hy - hry * 0.3], [hx + (hrx + 30) * f, hy - hry * 0.18], [hx, hy - hry * 0.2]], cc[1]); }
  if (lk.beard) {
    const b = col(lk.beard), bp = [];
    for (let i = 0; i <= 14; i++) { const a = 0.05 * Math.PI + i / 14 * Math.PI * 0.9; bp.push([hx + Math.cos(a) * (hrx + 1), hy + Math.sin(a) * (hry + 3)]); }
    bp.push([hx - hrx * 0.7, hy + hry * 0.15], [hx, hy + hry * 0.38], [hx + hrx * 0.7, hy + hry * 0.15]);
    I.poly(b[0], bp, b[1] * 0.85);
  }
  if (lk.stache) I.poly(col(lk.hair)[0], [[hx - 14 * s, hy + hry * 0.4], [hx, hy + hry * 0.3], [hx + 14 * s, hy + hry * 0.4], [hx, hy + hry * 0.48]], 1);
  if (!o.sil && o.talk && Math.floor(t * 9) % 2) I.circle('black', hx, hy + hry * 0.52, 8 * s, 0.8, 5 * s);
  if (lk.battered && !o.sil) {
    I.circle('teal', hx - hrx * 0.35, hy - hry * 0.02, 11 * s, 0.7);
    I.rect('paper', hx - hrx - 4, hy - hry * 0.62, hrx * 2 + 8, 12 * s, 1);
    I.poly('paper', [[hx + hrx * 0.25, hy + hry * 0.05], [hx + hrx * 0.8, hy + hry * 0.25], [hx + hrx * 0.7, hy + hry * 0.4], [hx + hrx * 0.15, hy + hry * 0.2]], 1);
    I.circle('coral', hx + hrx * 0.4, hy - hry * 0.56, 4 * s, 1);
  }
  if (lk.halo) { const cx2 = I.begin('navy', 0.9); cx2.lineWidth = 6; cx2.beginPath(); cx2.ellipse(hx, hy - 8, hrx + 20, hry * 0.42, 0, 0, 7); cx2.stroke(); I.end(); }
  c.restore();
  // brazos
  const sl = col(lk.shirtless ? lk.skin : lk.shirt), hand = lk.gloves ? col(lk.gloves) : sk;
  const hr = lk.gloves ? lw * 0.95 : lw * 0.42;
  const handL = limb(x - sw / 2 + 12 * s, top + 22 * s, p.la[0], p.la[1], arm, sl, lw * 0.82, hand, hr);
  const handR = limb(x + sw / 2 - 12 * s, top + 22 * s, p.ra[0], p.ra[1], arm, sl, lw * 0.82, hand, hr);
  if (pname === 'laptop') { I.rect(o.sil || 'navy', x - 70 * s, top + th * 0.42, 140 * s, 90 * s, 0.9); I.rect('teal', x - 58 * s, top + th * 0.42 + 10, 116 * s, 62 * s, o.sil ? 0 : 0.8); }
  if (pname === 'phone') { I.rect(o.sil || 'black', handR[0] - 14, handR[1] - 52, 28, 52, 0.9); }
  if (pname === 'belt') { I.rect('mustard', handL[0], handL[1] - 22, handR[0] - handL[0], 44, 1); I.circle('mustard', (handL[0] + handR[0]) / 2, handL[1], 38, 1); I.circle('coral', (handL[0] + handR[0]) / 2, handL[1], 18, 0.8); }
  I.solid = wasSolid;
  c.restore();
  return { head: [hx, hy - hry], hands: [handL, handR] };
}

// --------------------------------------------------------------- animales
function galgo(I, x, y, t, f = 1, ink = 'navy', alpha = 1) {
  const st = Math.sin(t * 14);
  const by = y - 92;
  I.poly(ink, [[x - 70 * f, by - 6], [x - 20 * f, by - 14], [x + 40 * f, by - 20], [x + 62 * f, by], [x + 30 * f, by + 22], [x - 20 * f, by + 26], [x - 70 * f, by + 14]], alpha);
  for (const [dx, ph] of [[-58, 1], [-44, -1], [42, -1], [55, 1]]) {
    const sw = ph * st * 26;
    I.stroke(ink, [[x + dx * f, by + 8], [x + dx * f + sw * 0.6, by + 48], [x + dx * f + sw, y]], 9, alpha);
  }
  I.stroke(ink, [[x + 50 * f, by - 10], [x + 78 * f, by - 58]], 16, alpha);
  I.poly(ink, [[x + 66 * f, by - 70], [x + 124 * f, by - 50], [x + 118 * f, by - 42], [x + 70 * f, by - 44]], alpha);
  I.poly(ink, [[x + 72 * f, by - 70], [x + 60 * f, by - 88], [x + 84 * f, by - 72]], alpha);
  const w = Math.sin(t * 10) * 12;
  I.stroke(ink, [[x - 66 * f, by], [x - 100 * f, by + 20 + w], [x - 110 * f, by - 10 + w]], 6, alpha);
}
function dog(I, x, y, t, f = 1, ink = 'navy', alpha = 1) {
  const st = Math.sin(t * 13);
  const by = y - 60;
  I.circle(ink, x, by, 58, alpha, 30);
  for (const [dx, ph] of [[-40, 1], [-24, -1], [26, -1], [42, 1]]) I.stroke(ink, [[x + dx * f, by + 10], [x + dx * f + ph * st * 14, y]], 12, alpha);
  I.circle(ink, x + 58 * f, by - 30, 28, alpha, 25);
  I.circle(ink, x + 82 * f, by - 22, 16, alpha, 12);
  I.poly(ink, [[x + 44 * f, by - 50], [x + 34 * f, by - 20], [x + 54 * f, by - 24]], alpha);
  const w = Math.sin(t * 16) * 14;
  I.stroke(ink, [[x - 54 * f, by - 10], [x - 84 * f, by - 38 + w]], 9, alpha);
}

// --------------------------------------------------------------- decorados
function sun(I, x, y, r, ink = 'coral', alpha = 1) { I.circle(ink, x, y, r, alpha); }
function mountains(I, y, peaks, ink, alpha = 1, seed = 1) {
  const r = rng(seed), pts = [[-20, H], [-20, y]];
  let x = -20;
  for (let i = 0; i < peaks; i++) {
    const w = W / peaks * (0.8 + r() * 0.5);
    pts.push([x + w / 2, y - 80 - r() * 160], [x + w, y - r() * 30]);
    x += w;
  }
  pts.push([W + 20, y], [W + 20, H]);
  I.poly(ink, pts, alpha);
  return pts;
}
function hills(I, y, amp, ink, alpha = 1, ph = 0) {
  const pts = [[-20, H], [-20, y]];
  for (let x = 0; x <= W + 40; x += 40) pts.push([x, y + Math.sin(x * 0.005 + ph) * amp + Math.sin(x * 0.013 + ph * 2) * amp * 0.3]);
  pts.push([W + 20, H]);
  I.poly(ink, pts, alpha);
  return pts;
}
function birds(I, t, x0, y0, n = 5, ink = 'navy') {
  for (let k = 0; k < n; k++) {
    const x = (x0 + k * 46 + t * 30) % (W + 100) - 50, y = y0 + (k % 3) * 22 + Math.sin(t * 2 + k) * 6;
    const wv = Math.sin(t * 8 + k) * 8;
    I.stroke(ink, [[x - 14, y - wv], [x, y], [x + 14, y - wv]], 4, 0.9);
  }
}
function snow(I, t, n = 90, seed = 2, alpha = 1) {
  const r = rng(seed);
  for (let k = 0; k < n; k++) {
    const x0 = r() * W, y0 = r() * H, sp = 50 + r() * 80, sz = 3 + r() * 5;
    I.circle('paper', (x0 + Math.sin(t * 1.3 + k) * 20 + t * 15) % W, (y0 + t * sp) % 1180, sz, alpha);
  }
}
function rain(I, t, n = 120, seed = 3, ink = 'teal', alpha = 0.6) {
  const r = rng(seed);
  for (let k = 0; k < n; k++) {
    const x0 = r() * W, y0 = r() * 1200;
    const x = (x0 + t * 80) % W, y = (y0 + t * 900) % 1180;
    I.stroke(ink, [[x, y], [x - 8, y + 38]], 3, alpha);
  }
}
function lightCone(I, x, y, w, h, alpha = 0.55, ink = 'paper') {
  I.poly(ink, [[x - 16, y], [x + 16, y], [x + w / 2, y + h], [x - w / 2, y + h]], alpha);
}
function building(I, x, y, w, h, ink, alpha, winInk, seed, lit = 0.25) {
  I.rect(ink, x, y - h, w, h, alpha);
  const r = rng(seed);
  for (let wy = y - h + 30; wy < y - 40; wy += 54) for (let wx = x + 22; wx < x + w - 40; wx += 48) if (r() < lit) I.rect(winInk, wx, wy, 24, 30, 0.9);
}
function house(I, x, y, w, h, wallInk, wallA, roofInk, roofA, winLit = true) {
  I.rect(wallInk, x, y - h, w, h, wallA);
  I.poly(roofInk, [[x - 26, y - h], [x + w / 2, y - h - h * 0.55], [x + w + 26, y - h]], roofA);
  I.halftone('navy', [[x + w / 2, y - h], [x + w, y - h], [x + w, y], [x + w / 2, y]], 0.25, 0.8, false, 8);
  if (winLit) I.rect('mustard', x + w * 0.2, y - h * 0.7, w * 0.18, h * 0.25, 0.95);
  I.rect('navy', x + w * 0.58, y - h * 0.55, w * 0.2, h * 0.55, 0.9);
}
function chimney(I, x, y, h, t) {
  I.poly('coral', [[x - 30, y], [x + 30, y], [x + 18, y - h], [x - 18, y - h]], 1);
  for (let yy = y - h + 30; yy < y; yy += 40) I.rect('navy', x - 30, yy, 60, 4, 0.35);
  for (let k = 0; k < 4; k++) I.circle('navy', x + 20 + k * 26 + Math.sin(t + k) * 10, y - h - 30 - k * 36 - (t * 20) % 36, 18 + k * 7, 0.15);
}
function windmill(I, x, y, t, s = 1, ink = 'navy', alpha = 1) {
  I.poly(ink, [[x - 40 * s, y], [x + 40 * s, y], [x + 28 * s, y - 160 * s], [x - 28 * s, y - 160 * s]], alpha);
  I.poly(ink, [[x - 34 * s, y - 158 * s], [x, y - 200 * s], [x + 34 * s, y - 158 * s]], alpha);
  for (let k = 0; k < 4; k++) {
    const a = t * 0.8 + k * Math.PI / 2;
    const ex = x + Math.cos(a) * 150 * s, ey = y - 170 * s + Math.sin(a) * 150 * s;
    I.stroke(ink, [[x, y - 170 * s], [ex, ey]], 6 * s, alpha);
    const px = -Math.sin(a) * 26 * s, py = Math.cos(a) * 26 * s;
    const mx = x + Math.cos(a) * 40 * s, my = y - 170 * s + Math.sin(a) * 40 * s;
    I.poly(ink, [[mx, my], [ex, ey], [ex + px, ey + py], [mx + px, my + py]], alpha * 0.6);
  }
}
function busSide(I, x, y, w, t, lit = true, ink = 'navy', body = 'mustard') {
  const h = 210;
  I.rect(body, x, y - h - 40, w, h, 1);
  I.rect(ink, x, y - 110, w, 16, 0.8);
  for (let k = 0; k < Math.floor((w - 80) / 110); k++) I.rect(lit ? 'paper' : ink, x + 30 + k * 110, y - h - 16, 86, 74, lit ? 0.9 : 0.6);
  I.halftone('navy', [[x, y - 94], [x + w, y - 94], [x + w, y - 40], [x, y - 40]], 0.35, 0.9, false, 7);
  for (const wx of [x + 110, x + w - 120]) { I.circle('black', wx, y - 34, 44, 1); I.circle('paper', wx, y - 34, 16, 0.8); }
  I.circle('paper', x + w - 6, y - 90, 12, 1);
}

module.exports = { LOOK, person, galgo, dog, sun, mountains, hills, birds, snow, rain, lightCone, building, house, chimney, windmill, busSide };
