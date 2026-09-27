// Laminas: cada escena dibuja su ilustracion en la zona central (y 560..1130).
'use strict';
const E = require('./engrave');
const { C, TAU, D2R, clamp, lerp, pr, eio, eout, line, seq, nib, circ, ell, bez, catmull, tf, fill, hatchPoly, shadeHatch, stipple, label, leader, dim, rotM, mv, hull, renderMeshes, globe, gpt, groute, figure, body, poseAt, mixPose } = E;

const CX = 540, TOP = 570, BOT = 1120;
const MONO = (px) => px + 'px Mono';

// ------------------------------------------------------------------ utilidades de escena
function ground(ctx, y, x0, x1, p, o = {}) {
  line(ctx, [[x0, y], [x1, y]], { w: 2, p });
  if (p >= 1 && !o.plain) for (let x = x0 + 8; x < x1; x += 16) line(ctx, [[x, y + 2], [x - 10, y + 12]], { w: 1, a: 0.5 });
}
function walkPose(ph, o = {}) {
  const s = Math.sin(ph), c = Math.cos(ph);
  return Object.assign({
    y: -0.08 * Math.abs(c), sp: 4, nk: 0, hd: 0,
    h1: 24 * s, k1: 8 + 28 * Math.max(0, Math.sin(ph + 1.9)), f1: 0,
    h2: -24 * s, k2: 8 + 28 * Math.max(0, Math.sin(ph + Math.PI + 1.9)), f2: 0,
    s1: -20 * s, e1: 18, s2: 20 * s, e2: 18,
  }, o);
}
const STAND = { sp: 0, s1: 4, e1: 10, s2: -4, e2: 10, h1: 2, k1: 2, h2: -2, k2: 2 };
const GUARD = { sp: 8, nk: -4, hd: 6, s1: 38, e1: 118, s2: 18, e2: 138, h1: 20, k1: 26, f1: 0, h2: -22, k2: 16, f2: -8 };
function boxAt(x0, x1, y0, y1, z0, z1) {
  return { V: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], F: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]] };
}
function compassTool(ctx, piv, tip, a = 1) {
  const mx = (piv[0] + tip[0]) / 2, my = (piv[1] + tip[1]) / 2, d = Math.hypot(tip[0] - piv[0], tip[1] - piv[1]);
  const hg = [mx, my - Math.sqrt(Math.max(0, 300 * 300 - (d / 2) * (d / 2)))];
  ctx.save(); ctx.globalAlpha = a;
  line(ctx, [hg, piv], { w: 5 }); line(ctx, [hg, tip], { w: 5 });
  line(ctx, [hg, [hg[0], hg[1] - 40]], { w: 7 });
  fill(ctx, circ(hg[0], hg[1], 11), C.paper); line(ctx, circ(hg[0], hg[1], 11), { w: 2.5 });
  ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(tip[0], tip[1], 4, 0, TAU); ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ 0 · portada: construccion con compas
function title(ctx, t) {
  const cx = CX, cy = 850, R = 235;
  const pC = eio(pr(t, 0.3, 1.8));
  const circle = circ(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * pC, 90);
  if (pC > 0) line(ctx, circle, { w: 2.4 });
  if (pC > 0 && pC < 1) compassTool(ctx, [cx, cy], circle[circle.length - 1]);
  else if (pC >= 1) compassTool(ctx, [cx, cy], [cx, cy - R], clamp(1 - pr(t, 2.1, 0.4)));
  const P = [...Array(6)].map((_, i) => { const a = -Math.PI / 2 + i * TAU / 6; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R, a]; });
  // petalos
  P.forEach((q, i) => {
    const k = eio(pr(t, 2.2 + i * 0.18, 0.6)); if (k <= 0) return;
    const a0 = q[2] + Math.PI - Math.PI / 3, arc = circ(q[0], q[1], R, a0, a0 + (2 * Math.PI / 3) * k, 40);
    line(ctx, arc, { w: 1.3, a: 0.75 });
  });
  const hx = eio(pr(t, 3.4, 0.9));
  if (hx > 0) line(ctx, P.concat([P[0]]).map(q => [q[0], q[1]]), { w: 2, p: hx });
  const tri = eio(pr(t, 4.1, 0.9));
  if (tri > 0) { seq(ctx, [[P[0], P[2], P[4], P[0]].map(q => [q[0], q[1]]), [P[1], P[3], P[5], P[1]].map(q => [q[0], q[1]])], tri, { w: 1.4, col: C.red }); }
  const ic = eio(pr(t, 4.6, 0.8));
  if (ic > 0) line(ctx, circ(cx, cy, R * Math.cos(Math.PI / 6), 0, TAU * ic), { w: 1.1, dash: [6, 5] });
  // letras de los puntos
  if (t > 3.3) P.forEach((q, i) => label(ctx, 'ABCDEF'[i], q[0] + Math.cos(q[2]) * 26, q[1] + Math.sin(q[2]) * 26 + 7, { font: 'italic 24px SerifI', align: 'center', a: clamp((t - 3.3 - i * 0.1) * 3) }));
  if (t > 1) { const k = clamp((t - 1) * 2); ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, TAU); ctx.fill(); ctx.restore(); label(ctx, 'O', cx + 10, cy - 10, { font: 'italic 22px SerifI', a: k }); }
  // monograma
  const mg = pr(t, 4.8, 1);
  if (mg > 0) { ctx.save(); ctx.globalAlpha = mg; ctx.font = '150px SerifB'; ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.fillText('V', cx, cy + 52); ctx.restore(); }
}

// ------------------------------------------------------------------ 1 · familia: tabla de estaturas
const FAM = [
  { x: 250, cm: 180, heads: 7.5, hair: 'short', n: 'PAPÁ' },
  { x: 470, cm: 165, heads: 7.3, hair: 'dark', fem: 1, n: 'MAMÁ' },
  { x: 680, cm: 114, heads: 5.6, hair: 'kid', n: 'VAJTAN · 5' },
  { x: 860, cm: 96, heads: 5.0, hair: 'darkKid', fem: 1, n: 'HERMANA · 3' },
];
function family(ctx, t) {
  const gy = 1095, pxcm = 2.6;
  const pR = eio(pr(t, 0.2, 1.2));
  line(ctx, [[90, gy], [90, gy - 190 * pxcm]], { w: 2, p: pR });
  for (let cm = 0; cm <= 190; cm += 10) {
    const k = clamp(pR * 20 - cm / 10); if (k <= 0) continue;
    const y = gy - cm * pxcm, maj = cm % 50 === 0;
    line(ctx, [[90, y], [90 + (maj ? 22 : 12), y]], { w: 1.4, a: k });
    if (cm % 20 === 0 || maj) label(ctx, String(cm), 80, y + 6, { font: MONO(15), align: 'right', a: k, sp: 0 });
    if (cm % 20 === 0 && cm > 0) line(ctx, [[118, y], [1000, y]], { w: 0.8, a: 0.22 * k, dash: [3, 7] });
  }
  if (pR > 0.3) label(ctx, 'cm', 96, gy - 190 * pxcm - 12, { font: MONO(15), sp: 0 });
  ground(ctx, gy, 90, 1000, eio(pr(t, 0.5, 1)));
  FAM.forEach((f, i) => {
    const k = pr(t, 1.0 + i * 0.45, 1.4); if (k <= 0) return;
    const breathe = Math.sin(t * 1.3 + i) * 0.4;
    figure(ctx, { x: 0, y: 0, sp: breathe }, { gx: f.x, gy, h: f.cm * pxcm, heads: f.heads, hair: f.hair, fem: f.fem, p: k });
    const hk = pr(t, 2.4 + i * 0.3, 0.6);
    if (hk > 0) {
      const y = gy - f.cm * pxcm;
      line(ctx, [[f.x - 60, y], [118, y]], { w: 1.2, col: C.red, dash: [5, 5], p: hk, a: 0.9 });
    }
    label(ctx, f.n, f.x, gy + 32, { font: MONO(17), align: 'center', p: pr(t, 1.6 + i * 0.45, 0.6) });
  });
}

// ------------------------------------------------------------------ 2 · papa se va
function dadLeaves(ctx, t) {
  const gy = 1090;
  ground(ctx, gy, 70, 1010, eio(pr(t, 0.2, 1)));
  const fam = [{ x: 120, h: 420, heads: 7.3, hair: 'dark', fem: 1 }, { x: 205, h: 290, heads: 5.8, hair: 'kid' }, { x: 262, h: 240, heads: 5.2, hair: 'darkKid', fem: 1 }];
  fam.forEach((f, i) => figure(ctx, STAND, Object.assign({ gx: f.x, gy, p: pr(t, 0.4 + i * 0.3, 1.0) }, f)));
  // papa camina: rastro cronofotografico
  const x0 = 360, x1 = 1060, t0 = 1.6, T = 5.2;
  const u = clamp((t - t0) / T), X = lerp(x0, x1, u);
  const k = 460 / 7.5 * 7 / 7; void k;
  for (let g = 0; g < 7; g++) {
    const gx = x0 + g * 95; if (gx > X - 20) break;
    const ph = (gx - x0) / 60;
    figure(ctx, walkPose(ph), { gx, gy, h: 460, heads: 7.5, hair: 'short', a: 0.22, shade: false });
  }
  if (X < 1000) figure(ctx, walkPose((X - x0) / 60), { gx: X, gy, h: 460, heads: 7.5, hair: 'short', p: pr(t, 0.9, 0.8) });
  const dk = eio(pr(t, 3.0, 1.6));
  dim(ctx, [300, 610], [1000, 610], '≈ 3.000 km  →  ESPAÑA', { p: dk, col: C.red, font: MONO(21), dy: -14 });
  if (dk > 0) { line(ctx, [[300, 596], [300, 624]], { w: 1.4, col: C.red }); }
}

// ------------------------------------------------------------------ 3 · globo con ruta
const UA = [31.2, 49.0], TOM = [-3.03, 39.16], GE = [43.4, 42.2];
function gcKm(a, b) { const f = (q) => [q[0] * D2R, q[1] * D2R]; const [l1, p1] = f(a), [l2, p2] = f(b); return 6371 * Math.acos(Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(l1 - l2)); }
function route(ctx, t) {
  const g = { cx: CX, cy: 850 + 760 * Math.sin(44 * D2R) * 0 , R: 820, lx: CX, ly: 850, clipR: 275, step: 5, lon0: 15 - t * 0.8, lat0: 45, p: pr(t, 0.2, 2.6), hi: [{ name: 'Ukraine', p: pr(t, 2.0, 1.0) }, { name: 'Spain', p: pr(t, 2.4, 1.0) }] };
  globe(ctx, g);
  const rk = eio(pr(t, 3.0, 2.2));
  const tip = groute(ctx, g, UA, TOM, rk, { w: 3.4, lift: 0.14 });
  if (tip && rk < 1) { ctx.save(); ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(tip[0], tip[1], 7, 0, TAU); ctx.fill(); ctx.restore(); }
  const a = gpt(g, UA[0], UA[1]), b = gpt(g, TOM[0], TOM[1]);
  const mk = (q, s, dx, dy, al, kk) => { if (kk <= 0) return; fill(ctx, circ(q[0], q[1], 7), C.paper); line(ctx, circ(q[0], q[1], 7), { w: 2.4, col: C.red }); leader(ctx, [q[0], q[1]], [q[0] + dx, q[1] + dy], s, { p: kk, align: al, font: MONO(19) }); };
  mk(a, 'UCRANIA', 40, -120, 'left', pr(t, 2.2, 0.8));
  mk(b, 'TOMELLOSO', -30, 150, 'right', pr(t, 5.0, 0.8));
  if (rk >= 1) label(ctx, '≈ ' + (Math.round(gcKm(UA, TOM) / 100) * 100).toLocaleString('es-ES') + ' km en línea recta', 1000, 1115, { font: MONO(19), align: 'right', col: C.red, p: pr(t, 5.3, 0.8) }); if (0) label(ctx, '', 0, 0, { font: MONO(19), align: 'center', col: C.red, p: pr(t, 5.3, 0.8) });
}

// ------------------------------------------------------------------ 4 · Tomelloso: molino
function windmill(ctx, x, gy, s, t, p, a = 1) {
  ctx.save(); ctx.globalAlpha = a;
  const wb = 95 * s, wt = 75 * s, h = 330 * s, top = gy - h;
  const tower = [[x - wb, gy], [x - wt, top], [x + wt, top], [x + wb, gy]];
  const pk = clamp(p * 3);
  fill(ctx, tower, C.paper);
  if (p > 0.3) hatchPoly(ctx, [[x + wb * 0.25, gy], [x + wt * 0.25, top], [x + wt, top], [x + wb, gy]], { ang: 92, sp: 3.4 * Math.max(0.7, s), w: 1, a: 0.7, p: clamp((p - 0.3) * 2) });
  line(ctx, tower, { w: 2.2 * Math.max(0.6, s), p: pk });
  // puerta y ventana
  if (p > 0.35) {
    const dw = 26 * s, dh = 70 * s;
    const door = [[x - dw, gy], [x - dw, gy - dh]].concat(circ(x, gy - dh, dw, Math.PI, TAU, 14)).concat([[x + dw, gy]]);
    fill(ctx, door, C.paper); hatchPoly(ctx, door, { ang: 90, sp: 2.5, w: 1, a: 0.9, cross: true }); line(ctx, door, { w: 1.8 * s });
    const win = [[x - 10 * s, top + 70 * s], [x + 10 * s, top + 70 * s], [x + 10 * s, top + 100 * s], [x - 10 * s, top + 100 * s]];
    fill(ctx, win, C.ink, 0.85);
  }
  // caperuza conica
  const cap = [[x - wt - 12 * s, top], [x - wt * 0.3, top - 72 * s], [x, top - 88 * s], [x + wt * 0.3, top - 72 * s], [x + wt + 12 * s, top]];
  const ck = clamp((p - 0.25) * 3);
  if (ck > 0) {
    fill(ctx, cap.concat([[x - wt - 12 * s, top]]), C.paper);
    hatchPoly(ctx, cap, { ang: 60, sp: 3 * Math.max(0.7, s), w: 1, a: 0.7, p: ck });
    line(ctx, cap.concat([cap[0]]), { w: 2.2 * Math.max(0.6, s), p: ck });
  }
  // aspas
  const hub = [x + 8 * s, top - 30 * s], ak = clamp((p - 0.45) * 2.2);
  if (ak > 0) {
    const L = 270 * s, sw = 34 * s;
    for (let i = 0; i < 4; i++) {
      const ang = t * 0.55 + i * Math.PI / 2, ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
      const P = (d, o) => [hub[0] + ux * d + nx * o, hub[1] + uy * d + ny * o];
      line(ctx, [P(0, 0), P(L, 0)], { w: 3 * Math.max(0.6, s), p: ak });
      const fr = [P(L * 0.22, 0), P(L * 0.22, sw), P(L, sw), P(L, 0)];
      line(ctx, fr, { w: 1.4 * Math.max(0.6, s), p: ak });
      if (ak >= 1) { for (let d = L * 0.22; d <= L; d += L / 9) line(ctx, [P(d, 0), P(d, sw)], { w: 1 }); line(ctx, [P(L * 0.22, sw / 2), P(L, sw / 2)], { w: 0.8, a: 0.7 }); }
    }
    fill(ctx, circ(hub[0], hub[1], 9 * s), C.paper); line(ctx, circ(hub[0], hub[1], 9 * s), { w: 2 * s });
  }
  ctx.restore();
}
function tomelloso(ctx, t) {
  const gy = 1085;
  const hk = eio(pr(t, 0.2, 1.2));
  // colinas
  line(ctx, catmull([[70, 1000], [260, 975], [420, 990], [640, 965], [820, 985], [1010, 972]], false, 10), { w: 1.4, p: hk, a: 0.7 });
  ground(ctx, gy, 70, 1010, hk, { plain: true });
  for (let i = 0; i < 26; i++) { const x = 90 + i * 36, k = clamp(hk * 26 - i); if (k > 0) line(ctx, [[x, gy + 8], [x + 14, gy + 8]], { w: 1, a: 0.5 }); }
  windmill(ctx, 175, 1000, 0.36, t + 1, pr(t, 1.0, 1.5), 0.8);
  windmill(ctx, 900, 995, 0.42, t + 2.2, pr(t, 1.2, 1.5), 0.8);
  windmill(ctx, CX, gy, 0.86, t, pr(t, 0.5, 2.6));
  // sol grabado
  const sk = pr(t, 2.0, 1);
  if (sk > 0) {
    line(ctx, circ(870, 660, 42, 0, TAU * sk), { w: 1.8 });
    for (let i = 0; i < 16; i++) { const a = i * TAU / 16, k = clamp(sk * 16 - i); if (k > 0) line(ctx, [[870 + Math.cos(a) * 54, 660 + Math.sin(a) * 54], [870 + Math.cos(a) * (54 + (i % 2 ? 14 : 26)), 660 + Math.sin(a) * (54 + (i % 2 ? 14 : 26))]], { w: 1.4, p: k }); }
  }
  label(ctx, '39°09′N · 3°01′O', 80, 640, { font: MONO(20), p: pr(t, 2.4, 1) });
  label(ctx, 'LA MANCHA', 80, 670, { font: MONO(20), p: pr(t, 2.8, 0.8), col: C.red });
}

// ------------------------------------------------------------------ 5 · ni un balon
const BALL = hull(E.truncIcoPoints());
function noBall(ctx, t) {
  const bx = 380, by = 830;
  renderMeshes(ctx, [{ mesh: BALL, M: rotM(18 + t * 9, 30 + t * 22, 0), sc: 1, darkN: 5 }], { cx: bx, cy: by, s: 42, dist: 40 }, { p: pr(t, 0.2, 2.6), hidden: true, edgeW: 2 });
  const sk = eio(pr(t, 3.0, 0.9));
  if (sk > 0) {
    line(ctx, circ(bx, by, 250, -Math.PI * 0.75, -Math.PI * 0.75 + TAU * sk), { w: 6, col: C.red });
    if (sk >= 1) line(ctx, [[bx - 177, by + 177], [bx + 177, by - 177]], { w: 6, col: C.red, p: eio(pr(t, 3.9, 0.4)) });
  }
  // lapiz: un chaval de artes
  const pk = pr(t, 4.3, 1.4);
  if (pk > 0) {
    const px = 830, py = 1040, ang = -1.25, L = 330;
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux, w = 22;
    const P = (d, o) => [px + ux * d + nx * o, py + uy * d + ny * o];
    const body = [P(60, -w), P(L, -w), P(L, w), P(60, w)];
    fill(ctx, body.concat([P(0, 0)]), C.paper);
    shadeHatch(ctx, body, [nx * 14, ny * 14], { ang: -20, sp: 3.4, w: 1, a: 0.7, p: pk });
    seq(ctx, [body.concat([body[0]]), [P(60, -w), P(0, 0), P(60, w)], [P(L - 40, -w), P(L - 40, w)], [P(62, -w * 0.33), P(L - 40, -w * 0.33)], [P(62, w * 0.33), P(L - 40, w * 0.33)]], pk, { w: 2 });
    const tipk = pr(t, 5.2, 1.4);
    if (tipk > 0) line(ctx, catmull([[800, 1080], [740, 1070], [680, 1085], [620, 1068], [560, 1082]], false, 10).map(q => [q[0], q[1]]), { w: 2.2, p: tipk });
    fill(ctx, [P(0, 0), P(18, -6), P(18, 6)], C.ink, pk);
  }
}

// ------------------------------------------------------------------ 6 · guardia arriba
const BAG = E.cylMesh(72, 72, 300, 28);
function guard(ctx, t) {
  const gy = 1095;
  ground(ctx, gy, 70, 1010, eio(pr(t, 0.2, 0.9)));
  const hits = [3.3, 4.2, 4.6, 5.6];
  let swing = 0;
  for (const h of hits) if (t > h + 0.12) { const u = t - h - 0.12; swing += 9 * Math.exp(-u * 1.1) * Math.sin(u * 4.2); }
  const ax = 735, ay = 580;
  const cam = { cx: 0, cy: 0, s: 1, dist: 3000 };
  const sw = swing * D2R, bcx = ax + Math.sin(sw) * 330, bcy = ay + Math.cos(sw) * 330;
  const bk = pr(t, 0.4, 2.2);
  line(ctx, [[ax - 60, ay], [ax + 60, ay]], { w: 4, p: bk });
  const top = [ax + Math.sin(sw) * 180, ay + Math.cos(sw) * 180];
  seq(ctx, [[[ax, ay], top], [top, [top[0] - 60 * Math.cos(sw), top[1] + 12]], [top, [top[0] + 60 * Math.cos(sw), top[1] + 12]]], bk, { w: 1.8 });
  if (bk > 0.2) {
    renderMeshes(ctx, [{ mesh: BAG, M: rotM(8, t * 15, -swing), pos: [bcx, -bcy, 0] }], cam, { p: clamp((bk - 0.2) / 0.8), edgeW: 2.2 });
    E.cylSilhouette(ctx, { mesh: BAG, M: rotM(8, t * 15, -swing), pos: [bcx, -bcy, 0] }, cam, { w: 2.6, p: clamp((bk - 0.3) / 0.7) });
  }
  // boxeador (8 anos y medio)
  let pose = Object.assign({}, GUARD, { sp: GUARD.sp + Math.sin(t * 3) * 1.5 });
  for (const h of hits) { const u = (t - h + 0.12) / 0.3; if (u > 0 && u < 1) { const k = Math.sin(u * Math.PI); pose = mixPose(pose, Object.assign({}, pose, h === 4.6 ? { s2: 86, e2: 4, sp: 14 } : { s1: 88, e1: 6, sp: 12 }), k); } }
  figure(ctx, pose, { gx: 420, gy, h: 390, heads: 6, hair: 'kid', p: pr(t, 0.8, 1.6) });
  const lk = pr(t, 2.6, 0.6);
  leader(ctx, [478, 760], [330, 660], 'MANOS ARRIBA', { p: lk, align: 'right', font: MONO(18) });
  leader(ctx, [430, 1020], [330, 1040], 'PIES EN GUARDIA', { p: pr(t, 3.0, 0.6), align: 'right', font: MONO(18) });
  if (t > 3.2) {
    const arcA = Math.abs(swing) > 0.5 ? swing : 0;
    if (arcA) line(ctx, circ(ax, ay, 360, Math.PI / 2, Math.PI / 2 - arcA * D2R, 20), { w: 1.4, col: C.red, dash: [4, 4] });
  }
}

// ------------------------------------------------------------------ 7 y 12 · parkour
function jumpPose(u) {
  // u: 0 despegue, 1 aterrizaje
  return poseAt([
    [0, { sp: 30, s1: -60, e1: 20, s2: -70, e2: 20, h1: 10, k1: 40, h2: -20, k2: 30, nk: -10 }],
    [0.12, { sp: 18, s1: 150, e1: 10, s2: 140, e2: 10, h1: 0, k1: 5, h2: -35, k2: 10, f2: -20 }],
    [0.5, { sp: 18, s1: 110, e1: 20, s2: 100, e2: 20, h1: 95, k1: 110, h2: 85, k2: 100 }],
    [0.85, { sp: 12, s1: 80, e1: 10, s2: 70, e2: 10, h1: 55, k1: 45, h2: 45, k2: 40 }],
    [1, { sp: 28, s1: 70, e1: 20, s2: 60, e2: 20, h1: 70, k1: 110, h2: 60, k2: 110, nk: -10 }],
  ], u);
}
function parkour(ctx, t, o) {
  const cam = { cx: CX, cy: o.cy, s: 1, dist: 1700 };
  const M = rotM(o.tilt, 0, 0);
  const g = o.gap / 2;
  const A = boxAt(-470, -g, -o.depth, 0, -120, 120), Bm = boxAt(g, 470, -o.depth, 0, -120, 120);
  const bk = pr(t, 0.2, 2.2);
  renderMeshes(ctx, [{ mesh: A, M, hAng: 0 }, { mesh: Bm, M, hAng: 0 }], cam, { p: bk, edgeW: 2.2 });
  // bordes superiores delanteros en pantalla
  const scr = (x, y, z) => { const r = mv(M, [x, y, z]); return E.proj(r, cam); };
  const L0 = scr(-g - 40, 0, 0), L1 = scr(g + 40, 0, 0);
  const t0 = o.t0, T = o.T, u = clamp((t - t0) / T);
  const apex = o.apex;
  const P = (uu) => [lerp(L0[0], L1[0], uu), lerp(L0[1], L1[1], uu) - 4 * apex * uu * (1 - uu)];
  const h = o.fh, heads = o.heads;
  // trayectoria discontinua + ecuacion
  const tk = pr(t, t0 - 0.6, 0.8);
  if (tk > 0) {
    const pts = [...Array(41)].map((_, i) => { const q = P(i / 40); return [q[0], q[1] - h * 0.52]; });
    line(ctx, pts, { w: 1.6, col: C.red, dash: [7, 7], p: tk });
    const q0 = pts[0], q1 = pts[3];
    const a0 = Math.atan2(q1[1] - q0[1], q1[0] - q0[0]);
    if (tk >= 1) { line(ctx, circ(q0[0], q0[1], 60, a0, 0, 16), { w: 1.3, col: C.red }); line(ctx, [q0, [q0[0] + 90, q0[1]]], { w: 1, col: C.red, dash: [3, 4] }); label(ctx, 'θ', q0[0] + 66, q0[1] - 12, { font: 'italic 26px SerifI', col: C.red }); }
  }
  label(ctx, o.eq, CX, o.eqY, { font: 'italic 27px SerifI', align: 'center', p: pr(t, t0 - 0.3, 1.2), sp: 0 });
  // carrera previa
  if (t < t0) {
    const ru = clamp((t - 0.9) / (t0 - 0.9));
    const x = lerp(L0[0] - 260, L0[0], eout(ru));
    figure(ctx, walkPose(ru * 9, { sp: 14, s1: -28 * Math.sin(ru * 9), s2: 28 * Math.sin(ru * 9) }), { gx: x, gy: L0[1], h, heads, hair: o.hair, p: pr(t, 0.7, 0.8) });
  } else {
    const ghosts = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];
    for (const gq of ghosts) if (gq < u - 0.03) { const q = P(gq); figure(ctx, jumpPose(gq), { gx: q[0], gy: q[1], h, heads, hair: o.hair, a: 0.28, shade: false }); }
    const q = P(u);
    figure(ctx, jumpPose(u), { gx: q[0], gy: q[1], h, heads, hair: o.hair });
  }
  if (o.dimLabel) dim(ctx, [L0[0] + 40, L0[1] + 100], [L1[0] - 40, L1[1] + 100], o.dimLabel, { p: pr(t, 1.8, 0.8), font: MONO(20), dy: 30 });
}
const flyEq = 'y = x·tan θ − g·x² / (2v²·cos² θ)';
function fly(ctx, t) { parkour(ctx, t, { cy: 960, tilt: 16, gap: 240, h0: 150, h1: 150, depth: 150, t0: 3.0, T: 1.6, apex: 170, fh: 250, heads: 6.5, hair: 'kid', eq: flyEq, eqY: 1075 }); }
function flyAgain(ctx, t) { parkour(ctx, t, { cy: 985, tilt: 20, gap: 380, h0: 380, h1: 380, depth: 150, t0: 3.0, T: 1.8, apex: 130, fh: 250, heads: 7.3, hair: 'short', eq: '', eqY: 640, dimLabel: 'VACÍO' }); }

// ------------------------------------------------------------------ 8 · la caida
function fall(ctx, t) {
  const cam = { cx: CX, cy: 1060, s: 1, dist: 1800 };
  const M = rotM(16, 0, 0);
  const mat = boxAt(-460, 460, -40, 0, -170, 170);
  renderMeshes(ctx, [{ mesh: mat, M }], cam, { p: pr(t, 0.2, 1.6), edgeW: 2 });
  const top = E.proj(mv(M, [0, 0, 0]), cam);
  const gy = top[1];
  if (pr(t, 0.8, 1) > 0) for (let i = -4; i <= 4; i++) { const a = E.proj(mv(M, [i * 100, 0, -170]), cam), b = E.proj(mv(M, [i * 100, 0, 170]), cam); line(ctx, [[a[0], a[1]], [b[0], b[1]]], { w: 1, a: 0.5, p: pr(t, 0.8 + i * 0.03, 0.6) }); }
  label(ctx, 'TATAMI', 900, gy - 20, { font: MONO(18), p: pr(t, 1.2, 0.6), align: 'right' });
  const h = 330, heads = 7.4, t0 = 2.0, T = 1.7;
  const u = clamp((t - t0) / T);
  const x0 = 800, x1 = 470;
  const rotAt = (uu) => -205 * eio(uu);
  const B0 = body(Object.assign({}, E.POSE0), { gx: 0, gy: 0, h, heads });
  const k = B0.k;
  const poseF = (uu) => {
    const base = poseAt([
      [0, { sp: 5, s1: 150, e1: 5, s2: 145, e2: 5, h1: 0, k1: 5, h2: 0, k2: 5 }],
      [0.25, { sp: -5, s1: 120, e1: 30, s2: 110, e2: 30, h1: 70, k1: 90, h2: 65, k2: 90 }],
      [0.6, { sp: 5, s1: 60, e1: 40, s2: 50, e2: 40, h1: 110, k1: 125, h2: 105, k2: 125 }],
      [1, { sp: 0, s1: 40, e1: 40, s2: 30, e2: 40, h1: 60, k1: 50, h2: 50, k2: 50, nk: -15 }],
    ], uu);
    base.rot = rotAt(uu);
    // altura de cadera: parabola que termina con la cabeza en el tatami
    const yEnd = (B0.stand + (h / heads) * 0.3) / k - 4.05 + 0.2;
    base.y = lerp(0, yEnd, uu) + 4 * 3.4 * uu * (1 - uu);
    base.x = 0;
    return base;
  };
  const posX = (uu) => lerp(x0, x1, uu);
  if (t < t0) figure(ctx, { sp: 5, s1: lerp(4, 150, pr(t, 1.3, 0.6)), e1: 5, s2: lerp(-4, 145, pr(t, 1.3, 0.6)), e2: 5 }, { gx: x0, gy, h, heads, hair: 'short', p: pr(t, 0.9, 0.8) });
  else {
    for (const gq of [0, 0.2, 0.4, 0.6, 0.8]) if (gq < u - 0.04) figure(ctx, poseF(gq), { gx: posX(gq), gy, h, heads, hair: 'short', a: 0.25, shade: false });
    const shake = (t > t0 + T && t < t0 + T + 0.35) ? Math.sin(t * 90) * 6 * (1 - (t - t0 - T) / 0.35) : 0;
    ctx.save(); ctx.translate(shake, 0);
    figure(ctx, poseF(u), { gx: posX(u), gy, h, heads, hair: 'short' });
    ctx.restore();
  }
  // impacto
  if (t > t0 + T) {
    const hk = pr(t, t0 + T, 0.4), hx = posX(1) - 30, hy = gy - 8;
    for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8; line(ctx, [[hx + Math.cos(a) * 40, hy + Math.sin(a) * 40], [hx + Math.cos(a) * (40 + 45 * hk), hy + Math.sin(a) * (40 + 45 * hk)]], { w: 2.4, col: C.red }); }
    // esfera de rotacion: 360 necesarios, ~205 conseguidos
    const ak = eio(pr(t, t0 + T + 0.4, 1.3)), rcx = 190, rcy = 690, rr = 70;
    line(ctx, circ(rcx, rcy, rr, -Math.PI / 2, -Math.PI / 2 - TAU * ak, 80), { w: 1.4, dash: [5, 5] });
    line(ctx, circ(rcx, rcy, rr + 10, -Math.PI / 2, -Math.PI / 2 - 205 * D2R * ak, 60), { w: 4, col: C.red });
    if (ak > 0) { line(ctx, [[rcx, rcy], [rcx, rcy - rr - 16]], { w: 1.2 }); const e = -Math.PI / 2 - 205 * D2R * ak; line(ctx, [[rcx, rcy], [rcx + Math.cos(e) * (rr + 16), rcy + Math.sin(e) * (rr + 16)]], { w: 1.2, col: C.red }); }
    if (ak > 0.3) { label(ctx, '360° NECESARIOS', rcx + rr + 26, rcy - 12, { font: MONO(19), p: pr(t, t0 + T + 0.9, 0.6) }); label(ctx, '≈ 205° REALES', rcx + rr + 26, rcy + 20, { font: MONO(19), col: C.red, p: pr(t, t0 + T + 1.2, 0.6) }); }
  }
}

// ------------------------------------------------------------------ 9 · atlas C1
const ATL = (() => {
  const R = [[0, -0.63], [0.13, -0.61], [0.26, -0.555], [0.38, -0.49], [0.54, -0.44], [0.67, -0.37], [0.8, -0.31], [0.95, -0.26], [1.02, -0.16], [0.99, -0.05], [0.88, 0.0], [0.75, 0.02], [0.66, 0.12], [0.58, 0.25], [0.52, 0.37], [0.43, 0.5], [0.3, 0.62], [0.15, 0.7], [0.06, 0.745], [0, 0.78]];
  const I = [[0, -0.45], [0.14, -0.43], [0.24, -0.35], [0.28, -0.21], [0.3, -0.07], [0.25, 0.0], [0.31, 0.1], [0.31, 0.3], [0.23, 0.44], [0.1, 0.52], [0, 0.54]];
  const mir = (a) => a.concat(a.slice(1, -1).reverse().map(q => [-q[0], q[1]]));
  return { out: mir(R), inn: mir(I) };
})();
function atlas(ctx, t) {
  const s = 330 * (1 + t * 0.006), ox = CX, oy = 840;
  const T = (pts) => pts.map(q => [ox + q[0] * s, oy + q[1] * s]);
  const out = T(catmull(ATL.out, true, 6)), inn = T(catmull(ATL.inn, true, 6));
  const ftL = circ(ox - 0.86 * s, oy - 0.13 * s, 0.075 * s), ftR = circ(ox + 0.86 * s, oy - 0.13 * s, 0.075 * s);
  const facetL = ell(ox - 0.47 * s, oy - 0.2 * s, 0.12 * s, 0.25 * s, -0.42), facetR = ell(ox + 0.47 * s, oy - 0.2 * s, 0.12 * s, 0.25 * s, 0.42);
  const pO = eio(pr(t, 0.2, 2.0));
  // hueso: relleno + sombreado fino entre contornos
  if (pO > 0.5) {
    ctx.save();
    ctx.beginPath();
    for (const P of [out, inn, ftL, ftR]) { ctx.moveTo(P[0][0], P[0][1]); for (const q of P) ctx.lineTo(q[0], q[1]); ctx.closePath(); }
    ctx.clip('evenodd');
    E.hatchLines(ctx, E.bbox(out), { ang: 25, sp: 5.5, w: 0.9, a: 0.45, p: clamp((pO - 0.5) * 2) });
    ctx.restore();
    shadeHatch(ctx, out, [-0.05 * s, -0.06 * s], { ang: -50, sp: 3.2, w: 1, a: 0.7, p: clamp((pO - 0.5) * 2) });
  }
  seq(ctx, [out, inn, ftL, ftR], pO, { w: 2.6 });
  const fk = pr(t, 1.6, 1.0);
  if (fk > 0) for (const f of [facetL, facetR]) { fill(ctx, f, C.paper); hatchPoly(ctx, f, { ang: 70, sp: 2.8, w: 1, a: 0.85, p: fk, cross: true }); line(ctx, f, { w: 2, p: fk, close: true }); }
  // apofisis odontoides de C2 (punteada)
  const dk = pr(t, 2.2, 0.8);
  if (dk > 0) line(ctx, circ(ox, oy - 0.33 * s, 0.11 * s), { w: 1.4, dash: [5, 5], p: dk });
  // fracturas (Jefferson): arco anterior y posterior
  const frk = pr(t, 3.2, 0.9);
  const zig = (x0, y0, x1, y1, n = 6) => { const o = []; for (let i = 0; i <= n; i++) { const u = i / n, x = lerp(x0, x1, u), y = lerp(y0, y1, u), d = (i % 2 ? 1 : -1) * 0.018 * (i > 0 && i < n); o.push([ox + (x + d) * s, oy + (y + d * 0.6) * s]); } return o; };
  const cracks = [zig(-0.2, -0.66, -0.16, -0.40), zig(0.37, 0.28, 0.5, 0.52), zig(-0.34, 0.33, -0.47, 0.57)];
  const pulse = t > 4.2 ? 0.75 + 0.25 * Math.sin(t * 6) : 1;
  if (frk > 0) cracks.forEach((c, i) => line(ctx, c, { w: 4, col: C.red, p: clamp(frk * 3 - i), a: pulse }));
  const L = (from, to, s2, al, k, col) => leader(ctx, [ox + from[0] * s, oy + from[1] * s], to, s2, { p: k, align: al, font: MONO(18), col });
  L([0.05, -0.62], [660, 590], 'ARCO ANTERIOR', 'left', pr(t, 2.0, 0.7));
  L([0.5, -0.1], [780, 700], 'CARILLA ARTICULAR', 'left', pr(t, 2.3, 0.7));
  L([-0.86, -0.13], [80, 990], 'FORAMEN TRANSVERSO', 'left', pr(t, 2.6, 0.7));
  L([-0.2, 0.68], [120, 1105], 'ARCO POSTERIOR', 'left', pr(t, 2.9, 0.7));
  L([0.43, 0.4], [780, 1060], 'FRACTURA', 'left', pr(t, 3.8, 0.7), C.red);
  L([0, -0.33], [420, 640], 'C2 · DIENTE', 'right', pr(t, 3.0, 0.6));
  // barra de escala
  const bk = pr(t, 2.0, 0.6);
  if (bk > 0) { const x0 = 860, y0 = 1110, L1 = s * 2 / 8; line(ctx, [[x0, y0], [x0 + L1, y0]], { w: 3, p: bk }); line(ctx, [[x0, y0 - 8], [x0, y0 + 8]], { w: 1.5 }); line(ctx, [[x0 + L1, y0 - 8], [x0 + L1, y0 + 8]], { w: 1.5, a: bk }); label(ctx, '1 cm', x0 + L1 / 2, y0 - 14, { font: MONO(16), align: 'center', a: bk }); }
}

// ------------------------------------------------------------------ 10 · noventa dias
function brace(ctx, t) {
  ctx.save(); ctx.beginPath(); ctx.rect(60, 560, 470, 570); ctx.clip();
  const B = figure(ctx, { sp: -2, nk: 0, hd: -4, s1: 2, s2: -2 }, { gx: 250, gy: 1620, h: 1000, heads: 7.4, hair: 'short', p: pr(t, 0.2, 1.4) });
  const ck = pr(t, 1.2, 1.2);
  if (ck > 0) {
    const N = B.N, S = B.S, k = B.k, hh = B.hh;
    const c = [[N[0] - 0.42 * k, N[1] - 0.25 * hh], [N[0] + 0.62 * k, N[1] - 0.1 * hh], [S[0] + 0.72 * k, S[1] + 0.12 * k], [S[0] - 0.55 * k, S[1] + 0.05 * k]];
    const col = catmull(c, true, 6);
    fill(ctx, col, C.paper);
    hatchPoly(ctx, col, { ang: 85, sp: 4, w: 1, a: 0.7, p: ck });
    shadeHatch(ctx, col, [0.2 * k, -0.1 * k], { ang: 10, sp: 3, w: 1, a: 0.7, p: ck });
    line(ctx, col, { w: 3, p: ck, close: true });
    line(ctx, [[N[0] - 0.4 * k, N[1] + 0.05 * hh], [S[0] + 0.7 * k, S[1] - 0.2 * k]], { w: 1.3, dash: [4, 4], a: ck });
    leader(ctx, [S[0] + 0.5 * k, S[1] - 0.1 * k], [480, 1080], 'COLLARÍN', { p: pr(t, 2.2, 0.6), align: 'right', font: MONO(18) });
  }
  ctx.restore();
  // calendario de 90 dias
  const x0 = 560, y0 = 620, cs = 42;
  const gk = pr(t, 0.6, 1.2);
  for (let r = 0; r <= 9; r++) line(ctx, [[x0, y0 + r * cs], [x0 + 10 * cs, y0 + r * cs]], { w: r % 9 === 0 ? 2 : 1, p: clamp(gk * 10 - r * 0.5) });
  for (let c = 0; c <= 10; c++) line(ctx, [[x0 + c * cs, y0], [x0 + c * cs, y0 + 9 * cs]], { w: c % 10 === 0 ? 2 : 1, p: clamp(gk * 10 - c * 0.5) });
  const days = Math.floor(90 * eio(pr(t, 1.8, 4.2)));
  for (let d = 0; d < days; d++) { const r = Math.floor(d / 10), c = d % 10, x = x0 + c * cs, y = y0 + r * cs; line(ctx, [[x + 9, y + 9], [x + cs - 9, y + cs - 9]], { w: 1.8 }); line(ctx, [[x + cs - 9, y + 9], [x + 9, y + cs - 9]], { w: 1.8 }); }
  label(ctx, 'DÍA ' + String(Math.max(1, days)).padStart(2, '0') + ' / 90', x0, y0 + 9 * cs + 42, { font: MONO(24), a: gk });
  label(ctx, '+ 8 MESES SIN SALTAR', x0, y0 + 9 * cs + 80, { font: MONO(21), col: C.red, p: pr(t, 5.5, 0.8) });
}

// ------------------------------------------------------------------ 11 · cambio mi mirada: optica del ojo
function eye(ctx, t) {
  const ex = 680, ey = 850, R = 165;
  const ek = eio(pr(t, 0.2, 1.6));
  fill(ctx, circ(ex, ey, R), C.paper, ek);
  if (ek > 0.6) shadeHatch(ctx, circ(ex, ey, R), [-30, -34], { ang: 40, sp: 4, w: 1, a: 0.55, p: clamp((ek - 0.6) * 2.5) });
  line(ctx, circ(ex, ey, R, Math.PI + 0.5, Math.PI + 0.5 + TAU - 1.0, 80), { w: 2.6, p: ek });
  // cornea
  const cor = circ(ex - R + 40, ey, 95, Math.PI - 0.62, Math.PI + 0.62, 30);
  line(ctx, cor, { w: 2.4, p: ek });
  // retina
  line(ctx, circ(ex, ey, R - 12, -1.1, 1.1, 40), { w: 1.2, p: ek, dash: [3, 3] });
  // cristalino
  const lx = ex - R + 50;
  const lens = ell(lx, ey, 20, 62);
  fill(ctx, lens, C.paper, ek); line(ctx, lens, { w: 2.2, p: ek, close: true });
  if (ek >= 1) { hatchPoly(ctx, lens, { ang: 90, sp: 4, w: 1, a: 0.5 }); line(ctx, [[lx - 8, ey - 80], [lx - 8, ey - 58]], { w: 5 }); line(ctx, [[lx - 8, ey + 58], [lx - 8, ey + 80]], { w: 5 }); }
  // nervio optico
  const nk = pr(t, 1.0, 0.8);
  seq(ctx, [[[ex + R - 4, ey - 26], [990, ey - 44]], [[ex + R - 4, ey + 26], [990, ey + 44]]], nk, { w: 2.2 });
  if (nk > 0) hatchPoly(ctx, [[ex + R - 4, ey - 26], [990, ey - 44], [990, ey + 44], [ex + R - 4, ey + 26]], { ang: 0, sp: 5, w: 1, a: 0.5, p: nk });
  // objeto: el mundo
  const g = { cx: 200, cy: 850, R: 95, lon0: 20 + t * 8, lat0: 35, p: pr(t, 0.6, 2) };
  globe(ctx, g);
  // rayos
  const rk = eio(pr(t, 2.4, 1.2));
  const top = [200, 850 - 95], bot = [200, 850 + 95];
  const flipT = eio(pr(t, 4.6, 1.2));
  const ret = ex + R - 14;
  const imgTop = [ret, lerp(ey + 42, ey - 42, flipT)], imgBot = [ret, lerp(ey - 42, ey + 42, flipT)];
  if (rk > 0) {
    seq(ctx, [[top, [lx, ey], imgTop], [bot, [lx, ey], imgBot]], rk, { w: 1.6, col: C.red });
    seq(ctx, [[top, [lx, ey - 55], imgTop], [bot, [lx, ey + 55], imgBot]], rk, { w: 1, col: C.red, dash: [5, 5] });
  }
  if (rk >= 1) {
    // imagen en la retina (invertida, luego se endereza)
    ctx.save(); ctx.translate(ret - 32, ey); ctx.scale(1, lerp(-1, 1, flipT));
    globe(ctx, { cx: 0, cy: 0, R: 36, lon0: 20 + t * 8, lat0: 35, p: 1 });
    ctx.restore();
  }
  leader(ctx, [ex - R + 22, ey - 60], [470, 650], 'CÓRNEA', { p: pr(t, 1.6, 0.6), align: 'right', font: MONO(18) });
  leader(ctx, [lx + 10, ey + 50], [480, 1060], 'CRISTALINO', { p: pr(t, 1.9, 0.6), align: 'right', font: MONO(18) });
  leader(ctx, [ex + R - 14, ey - 90], [860, 640], 'RETINA', { p: pr(t, 2.2, 0.6), font: MONO(18) });
  leader(ctx, [950, ey + 40], [920, 1040], 'NERVIO ÓPTICO', { p: pr(t, 2.4, 0.6), align: 'right', font: MONO(18) });
}

// ------------------------------------------------------------------ 13 · arte: espiral aurea
function golden(ctx, t) {
  const Wd = 820, Ht = Wd / E.PHI, x0 = CX - Wd / 2, y0 = 848 - Ht / 2;
  const rk = eio(pr(t, 0.2, 0.9));
  line(ctx, [[x0, y0], [x0 + Wd, y0], [x0 + Wd, y0 + Ht], [x0, y0 + Ht], [x0, y0]], { w: 2.4, p: rk });
  // subdivisiones
  let x = x0, y = y0, w = Wd, h = Ht; const sq = [];
  for (let i = 0; i < 9; i++) {
    const d = i % 4;
    if (d === 0) { sq.push({ x, y, s: h, cx: x + h, cy: y + h, a0: Math.PI, dir: 0 }); x += h; w -= h; }
    else if (d === 1) { sq.push({ x: x + w - w, y, s: w, cx: x, cy: y + w, a0: -Math.PI / 2, dir: 1 }); y += w; h -= w; }
    else if (d === 2) { sq.push({ x: x + w - h, y: y + h - h, s: h, cx: x + w - h, cy: y, a0: 0, dir: 2 }); w -= h; }
    else { sq.push({ x, y: y + h - w, s: w, cx: x + w, cy: y + h - w, a0: Math.PI / 2, dir: 3 }); h -= w; }
  }
  const T0 = 1.0, dt = 0.42;
  let tip = null;
  sq.forEach((q, i) => {
    const k = eio(pr(t, T0 + i * dt, dt * 1.2)); if (k <= 0) return;
    // linea divisoria
    let ln;
    if (q.dir === 0) ln = [[q.x + q.s, q.y], [q.x + q.s, q.y + q.s]];
    else if (q.dir === 1) ln = [[q.x, q.y + q.s], [q.x + q.s, q.y + q.s]];
    else if (q.dir === 2) ln = [[q.x, q.y], [q.x, q.y + q.s]];
    else ln = [[q.x, q.y], [q.x + q.s, q.y]];
    line(ctx, ln, { w: 1.4, p: k });
    const arc = circ(q.cx, q.cy, q.s, q.a0, q.a0 + Math.PI / 2, 30);
    const e = line(ctx, arc, { w: 3, col: C.red, p: k });
    if (k < 1 && e) { tip = e; line(ctx, [[q.cx, q.cy], e], { w: 1, a: 0.6, dash: [4, 4] }); }
    if (i < 3 && k >= 1) label(ctx, ['a', 'b', 'c'][i], q.x + q.s / 2, q.y + q.s / 2 + 12, { font: 'italic 36px SerifI', align: 'center', a: 0.8 });
  });
  nib(ctx, tip, C.red);
  label(ctx, 'φ = (1 + √5) / 2 = 1,6180339…', CX, y0 - 28, { font: 'italic 30px SerifI', align: 'center', p: pr(t, 4.6, 1.2), sp: 0 });
  dim(ctx, [x0, y0 + Ht + 34], [x0 + Wd, y0 + Ht + 34], 'a + b', { p: pr(t, 3.0, 0.8), font: 'italic 24px SerifI', dy: 30 });
}

// ------------------------------------------------------------------ 14 · otra vez al ring: patada
function kick(ctx, t) {
  const gy = 1095;
  ground(ctx, gy, 70, 1010, eio(pr(t, 0.2, 0.9)));
  const KICK = { sp: -30, nk: 12, hd: 8, s1: 40, e1: 110, s2: -40, e2: 50, h1: 118, k1: 4, f1: 50, h2: -6, k2: 6, f2: 10 };
  const cyc = (t - 2.0) % 2.2, kk = t < 2 ? 0 : Math.sin(clamp(cyc / 0.9) * Math.PI);
  const pose = mixPose(GUARD, KICK, eio(clamp(kk)));
  // estela de la patada
  if (t > 2.0) {
    for (const q of [0.25, 0.5, 0.75]) figure(ctx, mixPose(GUARD, KICK, q), { gx: 420, gy, h: 470, heads: 7.5, hair: 'short', a: 0.16, shade: false });
    const B = body(mixPose(GUARD, KICK, 1), { gx: 420, gy, h: 470, heads: 7.5 });
    const hip = B.Hp, foot = B.l1.A, r = Math.hypot(foot[0] - hip[0], foot[1] - hip[1]);
    const a1 = Math.atan2(foot[1] - hip[1], foot[0] - hip[0]);
    line(ctx, circ(hip[0], hip[1], r + 20, Math.PI / 2 - 0.25, a1, 40), { w: 1.6, col: C.red, dash: [8, 6], p: pr(t, 2.2, 0.8) });
    const ak = pr(t, 2.6, 0.7);
    if (ak > 0) { line(ctx, circ(hip[0], hip[1], 90, Math.PI / 2, a1, 20), { w: 1.4, col: C.red, p: ak }); label(ctx, '≈ 95°', hip[0] + 100, hip[1] + 70, { font: MONO(20), col: C.red, a: ak }); }
  }
  figure(ctx, pose, { gx: 420, gy, h: 470, heads: 7.5, hair: 'short', p: pr(t, 0.5, 1.4) });
  // cuerdas del ring
  const rk = pr(t, 0.3, 1.2);
  for (let i = 0; i < 3; i++) line(ctx, [[760, 780 + i * 100], [1010, 760 + i * 100]], { w: 3, p: rk });
  line(ctx, [[790, 700], [790, gy]], { w: 8, p: rk });
  label(ctx, 'COMPETICIÓN', 800, 690, { font: MONO(18), p: pr(t, 1.6, 0.6) });
}

// ------------------------------------------------------------------ 15 · pandemia
const ICO = hull(E.icoPoints());
function virus(ctx, t) {
  const cx = CX, cy = 845, sc = 100, cam = { cx, cy, s: sc, dist: 30 };
  const M = rotM(20 + t * 6, t * 14, 8);
  const p = pr(t, 0.2, 2.6);
  // espiculas traseras primero, luego cuerpo, luego delanteras
  const V = ICO.V.map(v => { const r = mv(M, v); const l = Math.hypot(...r); return r.map(c => c / l); });
  const F = ICO.F.map(f => { const c = f.reduce((a, i) => [a[0] + ICO.V[i][0], a[1] + ICO.V[i][1], a[2] + ICO.V[i][2]], [0, 0, 0]); const r = mv(M, c); const l = Math.hypot(...r); return r.map(q => q / l); });
  const spikes = V.concat(F);
  const Rb = Math.hypot(...ICO.V[0]) * 0.94;
  const spike = (u, front) => {
    if ((u[2] > 0) !== front) return;
    const a = E.proj(u.map(c => c * Rb), cam), b = E.proj(u.map(c => c * Rb * 1.42), cam);
    const k = clamp((p - 0.5) * 2); if (k <= 0) return;
    line(ctx, [[a[0], a[1]], [b[0], b[1]]], { w: 2.4, p: k, a: front ? 1 : 0.5 });
    if (k >= 1) { const r = 11 * (cam.dist / (cam.dist - u[2] * Rb * 1.42)); fill(ctx, circ(b[0], b[1], r), C.paper); if (front) hatchPoly(ctx, circ(b[0], b[1], r), { ang: 45, sp: 3, w: 1, a: 0.6 }); line(ctx, circ(b[0], b[1], r), { w: 2, a: front ? 1 : 0.5 }); }
  };
  spikes.forEach(u => spike(u, false));
  renderMeshes(ctx, [{ mesh: ICO, M, sc: 1 }], cam, { p, hidden: true, edgeW: 2.2 });
  spikes.forEach(u => spike(u, true));
  // barra 100 nm
  const bk = pr(t, 2.6, 0.6);
  if (bk > 0) { line(ctx, [[830, 1100], [980, 1100]], { w: 3, p: bk }); label(ctx, '100 nm', 905, 1086, { font: MONO(16), align: 'center', a: bk }); }
  label(ctx, 'SARS-CoV-2', 80, 620, { font: MONO(20), p: pr(t, 2.2, 0.6) });
  label(ctx, 'MARZO 2020', 80, 650, { font: MONO(20), col: C.red, p: pr(t, 2.6, 0.6) });
}

// ------------------------------------------------------------------ 16 · quemado: la vela
function candle(ctx, t, dur) {
  const cx = CX, base = 1080, w = 92;
  const burn = eio(pr(t, 1.5, dur - 3.2));
  const top = lerp(640, 1000, burn);
  const out = t > dur - 1.7;
  const dk = eio(pr(t, 0.2, 1.2));
  // plato
  const dish = ell(cx, base + 12, 220, 38);
  fill(ctx, dish, C.paper); shadeHatch(ctx, dish, [0, -10], { ang: 0, sp: 3, w: 1, a: 0.7, p: dk }); line(ctx, dish, { w: 2.2, p: dk, close: true });
  line(ctx, ell(cx, base + 4, 170, 24), { w: 1.2, p: dk, a: 0.7 });
  // cuerpo de la vela
  const bodyP = [[cx - w, top], [cx - w, base]].concat(ell(cx, base, w, 16, 0, Math.PI, 0, 20)).concat([[cx + w, top]]);
  fill(ctx, bodyP, C.paper);
  shadeHatch(ctx, bodyP, [-26, 0], { ang: 90, sp: 3.4, w: 1, a: 0.7, p: dk });
  line(ctx, bodyP, { w: 2.4, p: dk });
  const tp = ell(cx, top, w, 16);
  fill(ctx, tp, C.paper); line(ctx, tp, { w: 2, p: dk, close: true });
  // gotas de cera
  if (dk >= 1) for (const [dx, L] of [[-40, 60], [20, 90], [52, 40]]) { const d = catmull([[cx + dx - 8, top + 10], [cx + dx - 7, top + L], [cx + dx, top + L + 10], [cx + dx + 7, top + L], [cx + dx + 8, top + 10]], false, 5); line(ctx, d, { w: 1.6 }); }
  // mecha
  line(ctx, [[cx, top], [cx + 3, top - 22]], { w: 3, p: dk });
  if (!out && t > 1.2) {
    const fl = 1 + 0.08 * Math.sin(t * 17) + 0.05 * Math.sin(t * 29);
    const fh = 95 * fl, fx = cx + Math.sin(t * 7) * 4;
    const flame = catmull([[fx, top - 22 - fh], [fx + 22, top - 40 - fh * 0.3], [fx + 18, top - 14], [fx, top - 6], [fx - 18, top - 14], [fx - 22, top - 40 - fh * 0.3]], true, 8);
    fill(ctx, flame, C.paper);
    shadeHatch(ctx, flame, [8, -8], { ang: 80, sp: 3, w: 1, a: 0.5 });
    line(ctx, flame, { w: 2, close: true });
    line(ctx, ell(fx, top - 32, 7, 16), { w: 1.2, close: true });
    for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + (i - 5.5) * 0.2; line(ctx, [[fx + Math.cos(a) * 110, top - 50 + Math.sin(a) * 110], [fx + Math.cos(a) * 140, top - 50 + Math.sin(a) * 140]], { w: 1, a: 0.45 }); }
  }
  if (out) {
    const sk = pr(t, dur - 1.7, 1.4);
    const sm = [...Array(30)].map((_, i) => [cx + 3 + Math.sin(i * 0.5 + t * 2) * 14 * (i / 30) + i * 1.5, top - 22 - i * 9]);
    line(ctx, sm, { w: 1.6, p: sk, a: 0.8 });
    line(ctx, sm.map((q, i) => [q[0] - 10 + Math.sin(i * 0.4) * 6, q[1] - 10]), { w: 1.1, p: sk * 0.8, a: 0.5 });
  }
  // cota de altura
  const pct = Math.round((1 - burn) * 100);
  if (dk >= 1) { dim(ctx, [cx + 190, base], [cx + 190, top], '', { col: C.red }); label(ctx, pct + ' %', cx + 210, (base + top) / 2 + 8, { font: MONO(24), col: C.red }); }
  label(ctx, 'ENERGÍA', cx + 210, 1110, { font: MONO(16), a: dk });
}

// ------------------------------------------------------------------ 17 · portero de noche
function doorman(ctx, t) {
  const gy = 1095;
  ground(ctx, gy, 70, 1010, eio(pr(t, 0.2, 0.8)), { plain: true });
  // muro de ladrillo
  const wk = pr(t, 0.3, 1.4);
  const wall = [[560, 600], [1010, 600], [1010, gy], [560, gy]];
  for (let r = 0; r < 18; r++) { const y = 600 + r * 27.5; const k = clamp(wk * 18 - r); if (k <= 0) continue; line(ctx, [[560, y], [1010, y]], { w: 1, a: 0.6, p: k }); for (let x = 560 + (r % 2) * 30; x < 1010; x += 60) line(ctx, [[x, y], [x, y + 27.5]], { w: 1, a: 0.6, p: k }); }
  void wall;
  // puerta
  const dk = pr(t, 0.8, 1.4);
  const door = [[640, gy], [640, 700], [900, 700], [900, gy]];
  fill(ctx, [[620, gy], [620, 680], [920, 680], [920, gy]], C.paper, dk > 0 ? 1 : 0);
  line(ctx, [[620, gy], [620, 680], [920, 680], [920, gy]], { w: 3, p: dk });
  line(ctx, door, { w: 2, p: dk });
  if (dk > 0.5) {
    hatchPoly(ctx, door, { ang: 90, sp: 3.2, w: 1, a: 0.8, p: (dk - 0.5) * 2, cross: true });
    for (const r of [[665, 730, 875, 880], [665, 910, 875, 1070]]) { fill(ctx, [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]], C.paper); line(ctx, [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]], [r[0], r[1]]], { w: 1.8 }); hatchPoly(ctx, [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]], { ang: 90, sp: 6, w: 1, a: 0.5 }); }
    line(ctx, circ(870, 900, 9), { w: 2 });
    label(ctx, 'CLUB', 770, 668, { font: MONO(22), align: 'center' });
  }
  // portero con brazos cruzados
  figure(ctx, { sp: -3, s1: 38, e1: 105, s2: 42, e2: 100, h1: 6, h2: -6, hd: Math.sin(t * 0.8) * 5 }, { gx: 470, gy, h: 470, heads: 7.5, hair: 'short', p: pr(t, 0.6, 1.4) });
  // luna
  const mk = pr(t, 1.2, 1);
  if (mk > 0) {
    const moon = circ(160, 650, 52, -1.9, 1.9, 30).concat(circ(185, 650, 44, 1.75, -1.75, 30).reverse().reverse());
    fill(ctx, moon, C.paper); hatchPoly(ctx, moon, { ang: 30, sp: 3, w: 1, a: 0.6, p: mk }); line(ctx, moon, { w: 2, p: mk, close: true });
  }
  // palotes: noches
  const nights = Math.floor(700 * eio(pr(t, 1.8, 4.6)));
  const groups = Math.floor(nights / 5), show = Math.min(groups, 40);
  for (let gI = 0; gI < show; gI++) {
    const r = Math.floor(gI / 8), c = gI % 8, x = 85 + c * 44, y = 740 + r * 58;
    for (let i = 0; i < 4; i++) line(ctx, [[x + i * 7, y], [x + i * 7, y + 38]], { w: 1.6 });
    line(ctx, [[x - 5, y + 30], [x + 28, y + 8]], { w: 1.6, col: C.red });
  }
  label(ctx, (nights >= 700 ? '≈ ' : '') + nights + ' NOCHES', 85, 1060, { font: MONO(22), a: pr(t, 1.8, 0.4) });
  // reloj
}

// ------------------------------------------------------------------ 18 · maquina y rapado
function shave(ctx, t) {
  const gx = 390, gy = 3290, h = 2600, heads = 7.5;
  const cxp = lerp(760, 120, eio(pr(t, 2.2, 3.0)));
  ctx.save(); ctx.beginPath(); ctx.rect(60, 560, 960, 570); ctx.clip();
  const pp = pr(t, 0.2, 1.8);
  // pelo: antes (izquierda de la maquina) y despues (derecha)
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cxp, 2000); ctx.clip();
  const B = figure(ctx, { hd: -4 }, { gx, gy, h, heads, hair: 'short', p: pp, construct: true });
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(cxp, 0, 2000, 2000); ctx.clip();
  figure(ctx, { hd: -4 }, { gx, gy, h, heads, hair: 'buzz', p: pp, construct: true });
  ctx.restore();
  ctx.restore();
  // entradas: linea de nacimiento antigua y actual
  const hc = B.HC, hh = B.hh;
  const hk = pr(t, 1.4, 0.8);
  if (hk > 0) {
    line(ctx, catmull([[hc[0] + 0.36 * hh, hc[1] - 0.3 * hh], [hc[0] + 0.25 * hh, hc[1] - 0.24 * hh], [hc[0] + 0.12 * hh, hc[1] - 0.2 * hh]], false, 6), { w: 2, col: C.red, dash: [5, 5], p: hk });
    leader(ctx, [hc[0] + 0.3 * hh, hc[1] - 0.3 * hh], [820, 640], 'ENTRADAS', { p: hk, font: MONO(18), col: C.red });
  }
  // maquina
  const mk = pr(t, 1.8, 0.6);
  if (mk > 0 && t < 5.4) {
    const my = hc[1] - 0.52 * hh + (cxp < hc[0] - 0.3 * hh ? (hc[0] - 0.3 * hh - cxp) * 0.5 : 0);
    ctx.save(); ctx.globalAlpha = mk; ctx.translate(cxp, my); ctx.rotate(-0.25 - (cxp < hc[0] ? (hc[0] - cxp) / hh * 0.9 : 0));
    const bodyC = [[-14, -10], [-30, -190], [30, -190], [14, -10]];
    fill(ctx, bodyC, C.paper); shadeHatch(ctx, bodyC, [10, 0], { ang: 90, sp: 3, w: 1, a: 0.8 }); line(ctx, bodyC, { w: 2.2, close: true });
    fill(ctx, [[-22, -10], [22, -10], [22, 8], [-22, 8]], C.paper); line(ctx, [[-22, -10], [22, -10], [22, 8], [-22, 8], [-22, -10]], { w: 2 });
    for (let x = -20; x <= 20; x += 5) line(ctx, [[x, 8], [x, 16]], { w: 1.4 });
    line(ctx, bez([0, -190], [0, -240], [60, -250], [80, -300], 12), { w: 1.6 });
    ctx.restore();
  }
  if (t > 5.2) {
    const dk = pr(t, 5.2, 0.8);
    leader(ctx, [hc[0] - 0.1 * hh, hc[1] - 0.45 * hh], [800, 700], 'Nº 1 · 3 mm', { p: dk, font: MONO(20) });
  }
}

// ------------------------------------------------------------------ 19 · marketing: embudo
function funnel(ctx, t) {
  const cx = 470;
  const lv = [[640, 320], [790, 230], [930, 140], [1050, 60]];
  const k = eio(pr(t, 0.2, 1.8));
  const outline = [[cx - lv[0][1], lv[0][0]], [cx - lv[3][1], lv[3][0]], [cx - 40, 1110], [cx + 40, 1110], [cx + lv[3][1], lv[3][0]], [cx + lv[0][1], lv[0][0]]];
  fill(ctx, outline, C.paper);
  if (k > 0.5) shadeHatch(ctx, outline, [-80, 0], { ang: 80, sp: 3.6, w: 1, a: 0.6, p: (k - 0.5) * 2 });
  seq(ctx, [[[cx - lv[0][1], lv[0][0]], [cx - lv[3][1], lv[3][0]], [cx - 40, 1110]], [[cx + lv[0][1], lv[0][0]], [cx + lv[3][1], lv[3][0]], [cx + 40, 1110]]], k, { w: 2.4 });
  lv.forEach(([y, r], i) => { const kk = clamp(k * 4 - i); if (kk <= 0) return; const e = ell(cx, y, r, r * 0.18); line(ctx, e.slice(0, Math.floor(e.length / 2) + 1), { w: 2, p: kk }); line(ctx, e.slice(Math.floor(e.length / 2)), { w: 1.2, dash: [5, 5], a: 0.7, p: kk }); });
  // particulas
  const r = E.rng(3);
  const pk = pr(t, 1.6, 0.5);
  if (pk > 0) for (let i = 0; i < 90; i++) {
    const sp = 0.25 + r() * 0.2, ph = r(), depth = r();
    const stageMax = depth < 0.55 ? 1 : depth < 0.8 ? 2 : depth < 0.93 ? 3 : 4;
    const u = ((t - 1.6) * sp + ph) % 1;
    const yEnd = stageMax === 4 ? 1110 : lv[stageMax][0];
    const y = lerp(560, yEnd, u);
    let rr = 330;
    for (let j = 0; j < lv.length - 1; j++) if (y >= lv[j][0] && y <= lv[j + 1][0]) rr = lerp(lv[j][1], lv[j + 1][1], (y - lv[j][0]) / (lv[j + 1][0] - lv[j][0]));
    if (y > lv[3][0]) rr = lerp(60, 40, (y - lv[3][0]) / 60);
    const x = cx + (r() * 2 - 1) * rr * 0.85;
    const al = y < lv[0][0] ? 1 : (1 - u * 0.3);
    ctx.save(); ctx.globalAlpha = pk * al; ctx.fillStyle = stageMax === 4 ? C.red : C.ink; ctx.beginPath(); ctx.arc(x, y, stageMax === 4 ? 6 : 3.5, 0, TAU); ctx.fill(); ctx.restore();
  }
  const names = ['ALCANCE', 'INTERÉS', 'CONTACTO', 'CLIENTE'];
  lv.forEach(([y, rr], i) => leader(ctx, [cx + rr, y], [cx + 360 + (i === 3 ? 60 : 0) - i * 20, y - 30], names[i], { p: pr(t, 1.8 + i * 0.35, 0.6), font: MONO(19), col: i === 3 ? C.red : C.ink }));
}

// ------------------------------------------------------------------ 20 · los panas: galgo
const GALGO = {
  body: [[1.30, -0.93], [1.18, -0.885], [1.05, -0.87], [0.97, -0.835], [0.92, -0.76], [0.885, -0.66], [0.865, -0.575], [0.87, -0.52], [0.855, -0.45], [0.8, -0.38], [0.66, -0.335], [0.52, -0.34], [0.4, -0.39], [0.3, -0.45], [0.2, -0.47], [0.1, -0.455], [0.02, -0.43], [-0.07, -0.38], [-0.14, -0.4], [-0.21, -0.47], [-0.245, -0.56], [-0.225, -0.645], [-0.18, -0.7], [-0.1, -0.74], [0.05, -0.765], [0.2, -0.735], [0.35, -0.72], [0.5, -0.745], [0.62, -0.785], [0.7, -0.8], [0.8, -0.86], [0.9, -0.95], [0.97, -1.02], [1.03, -1.05], [1.1, -1.035], [1.18, -0.99], [1.3, -0.955]],
  legs: {
    fN: [[0.8, -0.52], [0.77, -0.3], [0.785, -0.07], [0.84, -0.012]],
    fF: [[0.72, -0.5], [0.69, -0.3], [0.695, -0.07], [0.75, -0.012]],
    hN: [[0.0, -0.55], [0.09, -0.32], [-0.1, -0.14], [-0.07, -0.012]],
    hF: [[-0.07, -0.55], [0.01, -0.32], [-0.17, -0.14], [-0.14, -0.012]],
  },
};
function galgo(ctx, x, gy, s, t, p, o = {}) {
  const fl = o.flip ? -1 : 1;
  const T = (pts) => pts.map(q => [x + q[0] * s * fl, gy + q[1] * s]);
  const a = o.a === undefined ? 1 : o.a;
  ctx.save(); ctx.globalAlpha = a;
  const leg = (L, far, walk) => {
    const P = T(L);
    const sw = walk ? Math.sin(t * 5 + (far ? Math.PI : 0)) * 0.0 : 0; void sw;
    const parts = [E.capsule(P[0], P[1], 0.055 * s, 0.035 * s), E.capsule(P[1], P[2], 0.033 * s, 0.022 * s), E.capsule(P[2], P[3], 0.022 * s, 0.024 * s)];
    for (const q of parts) { fill(ctx, q, C.paper); if (far) hatchPoly(ctx, q, { ang: 60, sp: 3, w: 1, a: 0.8 }); line(ctx, q, { w: far ? 1.6 : 2, close: true, p: clamp(p * 1.5) }); }
  };
  const pk = clamp(p * 1.3);
  if (pk > 0.5) { leg(GALGO.legs.fF, true); leg(GALGO.legs.hF, true); }
  // cola que se mueve
  const wag = Math.sin(t * 7) * 0.22;
  const root = [-0.2, -0.66];
  const tail = [[0, 0], [-0.1, 0.16], [-0.12, 0.36], [-0.06, 0.5]].map(q => { const c = Math.cos(wag), sn = Math.sin(wag); return [root[0] + q[0] * c - q[1] * sn, root[1] + q[0] * sn + q[1] * c]; });
  if (pk > 0.3) line(ctx, T(catmull(tail, false, 8)), { w: Math.max(2, 0.03 * s), p: clamp((pk - 0.3) * 2) });
  const bd = T(catmull(GALGO.body, true, 6));
  fill(ctx, bd, C.paper);
  if (pk > 0.6) {
    shadeHatch(ctx, bd, [0, -0.07 * s], { ang: -30, sp: 3.2, w: 1, a: 0.75, p: (pk - 0.6) * 2.5 });
    // costillas y musculo
    for (let i = 0; i < 4; i++) line(ctx, T(catmull([[0.5 + i * 0.06, -0.62], [0.47 + i * 0.06, -0.5], [0.5 + i * 0.06, -0.38]], false, 6)), { w: 1, a: 0.5 });
    line(ctx, T(catmull([[0.02, -0.7], [0.1, -0.58], [0.05, -0.46]], false, 6)), { w: 1.2, a: 0.6 });
  }
  line(ctx, bd, { w: Math.max(2, 0.008 * s), p: pk, close: true });
  if (pk > 0.5) { leg(GALGO.legs.fN, false); leg(GALGO.legs.hN, false); }
  if (pk >= 1) {
    // oreja plegada, ojo, trufa, collar
    const ear = T(catmull([[1.0, -1.03], [0.93, -1.06], [0.88, -1.02], [0.93, -0.99], [0.99, -1.0]], true, 5));
    fill(ctx, ear, C.paper); hatchPoly(ctx, ear, { ang: 60, sp: 2.4, w: 1, a: 0.9, cross: true }); line(ctx, ear, { w: 1.6, close: true });
    const ey = T([[1.12, -0.99]])[0]; ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(ey[0], ey[1], 0.012 * s, 0, TAU); ctx.fill();
    const ns = T([[1.29, -0.94]])[0]; ctx.beginPath(); ctx.arc(ns[0], ns[1], 0.015 * s, 0, TAU); ctx.fill();
    const col = T([[0.9, -0.96], [0.97, -0.84]]);
    line(ctx, col, { w: 0.03 * s, col: C.red });
  }
  ctx.restore();
}
function panas(ctx, t) {
  const gy = 1085;
  ground(ctx, gy, 70, 1010, eio(pr(t, 0.2, 0.8)), { plain: true });
  // refugio al fondo
  const rk = pr(t, 0.4, 1.4);
  const house = [[640, 900], [640, 760], [760, 680], [880, 760], [880, 900]];
  line(ctx, house, { w: 1.6, a: 0.6, p: rk });
  if (rk >= 1) { hatchPoly(ctx, [[640, 760], [760, 680], [880, 760]], { ang: 20, sp: 4, w: 1, a: 0.4 }); line(ctx, [[735, 900], [735, 830], [785, 830], [785, 900]], { w: 1.4, a: 0.6 }); label(ctx, 'ZOOASIS', 760, 748, { font: MONO(16), align: 'center', a: 0.8 }); }
  line(ctx, [[600, 900], [1000, 900]], { w: 1, a: 0.5, p: rk });
  galgo(ctx, 930, 960, 180, t + 1, pr(t, 1.2, 1.2), { flip: true, a: 0.55 });
  galgo(ctx, 200, gy, 480, t, pr(t, 0.6, 2.2));
  // huellas
  for (let i = 0; i < 6; i++) { const k = pr(t, 3.2 + i * 0.25, 0.2); if (k <= 0) continue; const x = 200 + i * 60, y = gy + 26 + (i % 2) * 10; ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(x, y, 8, 6, 0, 0, TAU); ctx.fill(); for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(x - 9 + j * 6, y - 9 - (j % 3 === 0 ? 0 : 3), 2.6, 0, TAU); ctx.fill(); } ctx.restore(); }
  leader(ctx, [200 + 1.12 * 480, gy - 1.0 * 480], [880, 610], 'UN PANA', { p: pr(t, 2.8, 0.6), font: MONO(19), col: C.red });
  leader(ctx, [200 + 0.45 * 480, gy - 0.55 * 480], [470, 1050], 'GALGO ESPAÑOL', { p: pr(t, 3.1, 0.6), font: MONO(18) });
}

// ------------------------------------------------------------------ 21 · registro de combates
const FIGHTS = [
  ['I', 'K1 · Cto. de España +91 kg', 'CAMPEÓN', 1],
  ['II', 'MMA amateur · 1º', 'VICTORIA', 1],
  ['III', 'MMA amateur · 2º', 'DERROTA', 0],
  ['IV', 'MMA amateur · 3º', 'DERROTA', 0],
  ['V', 'MMA PROFESIONAL', 'VICTORIA', 1],
];
function ledger(ctx, t) {
  const x0 = 70, x1 = 1010, y0 = 590, rh = 92;
  const k = pr(t, 0.2, 1.0);
  line(ctx, [[x0, y0], [x1, y0]], { w: 2.6, p: k }); line(ctx, [[x0, y0 + 50], [x1, y0 + 50]], { w: 1.4, p: k });
  label(ctx, 'Nº', x0 + 10, y0 + 34, { font: MONO(18), a: k }); label(ctx, 'COMBATE', x0 + 110, y0 + 34, { font: MONO(18), a: k }); label(ctx, 'RESULTADO', x1 - 10, y0 + 34, { font: MONO(18), a: k, align: 'right' });
  line(ctx, [[x0 + 90, y0], [x0 + 90, y0 + 50 + rh * 5]], { w: 1, p: k, a: 0.7 });
  FIGHTS.forEach((f, i) => {
    const ty = y0 + 50 + rh * (i + 1);
    line(ctx, [[x0, ty], [x1, ty]], { w: 1, a: 0.5, p: k });
    const tk = pr(t, 1.0 + i * 0.75, 0.55);
    if (tk <= 0) return;
    const y = ty - rh / 2 + 12;
    label(ctx, f[0], x0 + 44, y, { font: 'italic 30px SerifI', align: 'center', p: tk, sp: 0 });
    label(ctx, f[1], x0 + 110, y, { font: 'italic 31px SerifI', p: tk, sp: 0 });
    const sk = pr(t, 1.4 + i * 0.75, 0.18);
    if (sk > 0) {
      const sc = lerp(1.6, 1, eout(sk));
      ctx.save(); ctx.translate(x1 - 110, y - 10); ctx.rotate((i % 2 ? 1 : -1) * 0.06); ctx.scale(sc, sc); ctx.globalAlpha = sk * 0.95;
      const col = f[3] ? C.red : C.ink;
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.strokeRect(-92, -26, 184, 52); ctx.lineWidth = 1; ctx.strokeRect(-86, -20, 172, 40);
      ctx.fillStyle = col; ctx.font = '22px MonoB'; ctx.textAlign = 'center'; ctx.fillText(f[2], 0, 8);
      ctx.restore();
    }
  });
  const nk = pr(t, 5.4, 1.2);
  if (nk > 0) label(ctx, '(acabé reventado, xd)', x0 + 110, y0 + 50 + rh * 5 + 40, { font: 'italic 28px SerifI', p: nk, col: C.red, sp: 0 });
  const bk = pr(t, 6.2, 0.4);
  if (bk > 0) label(ctx, '3 V · 2 D', x1 - 10, y0 + 50 + rh * 5 + 40, { font: MONO(22), align: 'right', a: bk });
}

// ------------------------------------------------------------------ 22 · aqui estoy
function home(ctx, t, dur) {
  const g = { cx: CX, cy: 850, R: 640, lx: CX, ly: 850, clipR: 280, step: 10, lon0: 22 - t * 0.6, lat0: 46, p: pr(t, 0.2, 2.4), hi: [{ name: 'Ukraine', p: pr(t, 1.8, 1) }, { name: 'Georgia', p: pr(t, 2.1, 1), col: C.ink }, { name: 'Spain', p: pr(t, 2.4, 1), col: C.red, sp: 2.6 }] };
  globe(ctx, g);
  groute(ctx, g, UA, TOM, eio(pr(t, 3.0, 1.4)), { w: 2.4, dash: [8, 6] });
  groute(ctx, g, GE, UA, eio(pr(t, 3.0, 1.0)), { w: 2.4, dash: [8, 6], col: C.ink, lift: 0.06 });
  const mk = (q, s, dx, dy, al, kk, col) => { if (kk <= 0) return; const v = gpt(g, q[0], q[1]); fill(ctx, circ(v[0], v[1], 7), C.paper); line(ctx, circ(v[0], v[1], 7), { w: 2.4, col: col || C.ink }); leader(ctx, [v[0], v[1]], [v[0] + dx, v[1] + dy], s, { p: kk, align: al, font: MONO(19), col }); };
  mk(UA, 'UCRANIA', 20, -150, 'left', pr(t, 2.0, 0.6));
  mk(GE, 'GEORGIA', 10, 140, 'right', pr(t, 2.3, 0.6));
  mk([-3.7, 40.3], 'ESPAÑA · CASA', -10, 170, 'left', pr(t, 2.6, 0.6), C.red);
  const fk = pr(t, dur - 2.6, 0.5);
  if (fk > 0) {
    const sc = lerp(1.5, 1, eout(fk));
    ctx.save(); ctx.translate(CX, 850); ctx.rotate(-0.08); ctx.scale(sc, sc); ctx.globalAlpha = fk;
    ctx.fillStyle = C.paper; ctx.fillRect(-150, -70, 300, 140);
    ctx.strokeStyle = C.red; ctx.lineWidth = 6; ctx.strokeRect(-150, -70, 300, 140); ctx.lineWidth = 2; ctx.strokeRect(-138, -58, 276, 116);
    ctx.fillStyle = C.red; ctx.font = '96px SerifB'; ctx.textAlign = 'center'; ctx.fillText('FIN', 0, 34);
    ctx.restore();
  }
}

module.exports = { title, family, dadLeaves, route, tomelloso, noBall, guard, fly, fall, atlas, brace, eye, flyAgain, golden, kick, virus, candle, doorman, shave, funnel, panas, ledger, home };
