// Motor de grabado / tratado tecnico: pergamino, trazos que se dibujan solos,
// sombreado a plumilla, proyeccion 3D con orden de pintor, globo terraqueo y
// maniqui de estudio con proporciones reales.
'use strict';
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

const W = 1080, H = 1920;
const F = '/usr/share/fonts/truetype/';
GlobalFonts.registerFromPath(F + 'liberation/LiberationSerif-Regular.ttf', 'Serif');
GlobalFonts.registerFromPath(F + 'liberation/LiberationSerif-Italic.ttf', 'SerifI');
GlobalFonts.registerFromPath(F + 'liberation/LiberationSerif-Bold.ttf', 'SerifB');
GlobalFonts.registerFromPath(F + 'dejavu/DejaVuSansMono.ttf', 'Mono');
GlobalFonts.registerFromPath(F + 'dejavu/DejaVuSansMono-Bold.ttf', 'MonoB');

const C = { paper: '#ebdfc4', ink: '#2a2118', red: '#a3301e' };
const TAU = Math.PI * 2, D2R = Math.PI / 180;

// ------------------------------------------------------------------ util
function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rng = (s) => mulberry((s * 2654435761) >>> 0);
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const pr = (t, a, d) => clamp((t - a) / d);
const eio = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eout = (t) => 1 - Math.pow(1 - t, 3);

// ------------------------------------------------------------------ polilineas
function plen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
function cut(pts, L) {
  if (L <= 0) return [pts[0]];
  const o = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d >= L) { const t = d ? L / d : 0; o.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); return o; }
    L -= d; o.push(b);
  }
  return o;
}
function path(ctx, pts, close) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}
// linea con progreso de dibujado p (0..1)
function line(ctx, pts, o = {}) {
  if (!pts || pts.length < 2) return null;
  const p = o.p === undefined ? 1 : o.p;
  if (p <= 0) return null;
  const q = p < 1 ? cut(pts, plen(pts) * p) : pts;
  if (q.length < 2) return null;
  ctx.save();
  ctx.globalAlpha = ctx.globalAlpha * (o.a === undefined ? 1 : o.a);
  ctx.strokeStyle = o.col || C.ink; ctx.lineWidth = o.w || 2;
  ctx.lineCap = o.cap || 'round'; ctx.lineJoin = 'round';
  if (o.dash) ctx.setLineDash(o.dash);
  path(ctx, q, o.close && p >= 1);
  ctx.stroke(); ctx.restore();
  return q[q.length - 1];
}
// dibuja una lista de polilineas en secuencia, repartiendo p por longitud
function seq(ctx, list, p, o = {}) {
  if (p <= 0) return null;
  const Ls = list.map(l => plen(l.pts || l)); const tot = Ls.reduce((a, b) => a + b, 0) || 1;
  let rem = p * tot, tip = null;
  for (let i = 0; i < list.length && rem > 0; i++) {
    const it = list[i], pts = it.pts || it;
    const q = Math.min(1, rem / (Ls[i] || 1));
    tip = line(ctx, pts, Object.assign({}, o, it.pts ? it : {}, { p: q })) || tip;
    rem -= Ls[i];
  }
  return p < 1 ? tip : null;
}
function nib(ctx, tip, col = C.ink) { if (!tip) return; ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(tip[0], tip[1], 3.2, 0, TAU); ctx.fill(); ctx.restore(); }

function circ(cx, cy, r, a0 = 0, a1 = TAU, n) {
  n = n || Math.max(12, Math.ceil(Math.abs(a1 - a0) * r / 5));
  const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o;
}
function ell(cx, cy, rx, ry, rot = 0, a0 = 0, a1 = TAU, n) {
  n = n || Math.max(16, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) / 5));
  const c = Math.cos(rot), s = Math.sin(rot), o = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return o;
}
function bez(p0, p1, p2, p3, n = 24) {
  const o = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return o;
}
function catmull(pts, closed = true, n = 8) {
  const o = [], N = pts.length, g = (i) => closed ? pts[(i + N) % N] : pts[clamp(i, 0, N - 1)];
  const last = closed ? N : N - 1;
  for (let i = 0; i < last; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      o.push([0, 1].map(j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  o.push(closed ? o[0].slice() : pts[N - 1].slice());
  return o;
}
const tf = (pts, x, y, s, rot = 0, sx = 1) => { const c = Math.cos(rot), sn = Math.sin(rot); return pts.map(p => { const px = p[0] * s * sx, py = p[1] * s; return [x + px * c - py * sn, y + px * sn + py * c]; }); };
function bbox(pts) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const p of pts) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; }
function fill(ctx, pts, col = C.paper, a = 1) { ctx.save(); ctx.globalAlpha = ctx.globalAlpha * a; ctx.fillStyle = col; path(ctx, pts, true); ctx.fill(); ctx.restore(); }

// ------------------------------------------------------------------ sombreado a plumilla
// lineas paralelas dentro de un recorte. clip(ctx) debe construir y recortar.
function hatchLines(ctx, bb, o) {
  const ang = (o.ang === undefined ? -45 : o.ang) * D2R, sp = o.sp || 7;
  const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2, R = Math.hypot(bb[2] - bb[0], bb[3] - bb[1]) / 2 + 2;
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const n = Math.ceil(2 * R / sp), p = o.p === undefined ? 1 : o.p;
  ctx.strokeStyle = o.col || C.ink; ctx.lineWidth = o.w || 1.1; ctx.globalAlpha = ctx.globalAlpha * (o.a === undefined ? 0.85 : o.a);
  ctx.beginPath();
  const lim = Math.floor(n * p + 0.999);
  for (let i = 0; i < lim; i++) {
    const off = -R + i * sp + (o.off || 0);
    const px = cx + nx * off, py = cy + ny * off;
    let L = R;
    if (i === lim - 1 && p < 1) L = R * (2 * ((n * p) % 1) - 1);
    ctx.moveTo(px - dx * R, py - dy * R); ctx.lineTo(px + dx * L, py + dy * L);
  }
  ctx.stroke();
}
function hatchPoly(ctx, pts, o = {}) {
  if (o.p !== undefined && o.p <= 0) return;
  ctx.save(); path(ctx, pts, true); ctx.clip();
  hatchLines(ctx, bbox(pts), o);
  if (o.cross) hatchLines(ctx, bbox(pts), Object.assign({}, o, { ang: (o.ang === undefined ? -45 : o.ang) + 90, a: (o.a || 0.85) * 0.8 }));
  ctx.restore();
}
// sombra: zona del poligono que NO cubre su copia desplazada hacia la luz
function shadeHatch(ctx, pts, sh, o = {}) {
  if (o.p !== undefined && o.p <= 0) return;
  ctx.save(); path(ctx, pts, true); ctx.clip();
  ctx.beginPath();
  const add = (P) => { ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); };
  add(pts); add(pts.map(p => [p[0] + sh[0], p[1] + sh[1]]));
  ctx.clip('evenodd');
  hatchLines(ctx, bbox(pts), o);
  if (o.cross) hatchLines(ctx, bbox(pts), Object.assign({}, o, { ang: (o.ang === undefined ? -45 : o.ang) + 80, a: (o.a || 0.8) * 0.7 }));
  ctx.restore();
}
function stipple(ctx, pts, n, seed = 1, o = {}) {
  const bb = bbox(pts), r = rng(seed);
  ctx.save(); path(ctx, pts, true); ctx.clip(); ctx.fillStyle = o.col || C.ink; ctx.globalAlpha = ctx.globalAlpha * (o.a || 0.9);
  const lim = Math.floor(n * (o.p === undefined ? 1 : o.p));
  for (let i = 0; i < lim; i++) { const x = bb[0] + r() * (bb[2] - bb[0]), y = bb[1] + r() * (bb[3] - bb[1]); ctx.fillRect(x, y, o.s || 2, o.s || 2); }
  ctx.restore();
}

// ------------------------------------------------------------------ pergamino
let PAPERC = null;
function paper() {
  if (PAPERC) return PAPERC;
  const c = createCanvas(W, H), x = c.getContext('2d');
  x.fillStyle = C.paper; x.fillRect(0, 0, W, H);
  const r = rng(77);
  // manchas suaves de baja frecuencia
  for (let i = 0; i < 70; i++) {
    const px = r() * W, py = r() * H, rad = 80 + r() * 320;
    const g = x.createRadialGradient(px, py, 0, px, py, rad);
    const dark = r() < 0.55;
    g.addColorStop(0, dark ? 'rgba(120,90,50,0.07)' : 'rgba(255,250,235,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }
  // fibras
  for (let i = 0; i < 1600; i++) {
    const px = r() * W, py = r() * H, a = r() * TAU, l = 6 + r() * 26;
    x.strokeStyle = r() < 0.5 ? 'rgba(90,65,35,0.10)' : 'rgba(255,255,245,0.16)'; x.lineWidth = 0.7;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + 0.5) * l * 0.5, py + Math.sin(a + 0.5) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  // motas de oxido (foxing)
  for (let i = 0; i < 40; i++) {
    const px = r() * W, py = r() * H, rad = 2 + r() * 9;
    x.fillStyle = 'rgba(140,90,40,' + (0.05 + r() * 0.08) + ')'; x.beginPath(); x.arc(px, py, rad, 0, TAU); x.fill();
  }
  // grano fino
  const id = x.getImageData(0, 0, W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 12; d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.9; }
  x.putImageData(id, 0, 0);
  // viñeta
  const g = x.createRadialGradient(W / 2, H * 0.45, H * 0.25, W / 2, H * 0.45, H * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(80,50,20,0.30)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  PAPERC = c;
  return c;
}

// ------------------------------------------------------------------ texto
function spaced(ctx, s, x, y, sp, align = 'left') {
  let w = 0; const ws = [];
  for (const ch of s) { const m = ctx.measureText(ch).width; ws.push(m); w += m + sp; }
  w -= sp;
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const save = ctx.textAlign; ctx.textAlign = 'left';
  let i = 0; for (const ch of s) { ctx.fillText(ch, cx, y); cx += ws[i++] + sp; }
  ctx.textAlign = save;
  return w;
}
function spacedW(ctx, s, sp) { let w = 0; for (const ch of s) w += ctx.measureText(ch).width + sp; return w - sp; }
function label(ctx, s, x, y, o = {}) {
  ctx.save(); ctx.font = o.font || '20px Mono'; ctx.fillStyle = o.col || C.ink; ctx.globalAlpha = ctx.globalAlpha * (o.a === undefined ? 1 : o.a);
  ctx.textBaseline = 'alphabetic';
  const n = o.p === undefined ? s.length : Math.floor(s.length * o.p);
  if (n > 0) spaced(ctx, s.slice(0, n), x, y, o.sp === undefined ? 2 : o.sp, o.align || 'left');
  ctx.restore();
}
// linea guia con etiqueta (estilo lamina anatomica)
function leader(ctx, from, to, s, o = {}) {
  const p = o.p === undefined ? 1 : o.p;
  if (p <= 0) return;
  ctx.save(); ctx.fillStyle = o.col || C.ink; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(from[0], from[1], 3, 0, TAU); ctx.fill(); ctx.restore();
  line(ctx, [from, to], { w: 1.2, p: clamp(p * 2), col: o.col });
  if (p > 0.5) label(ctx, s, to[0] + (o.align === 'right' ? -8 : 8), to[1] + 6, { p: clamp((p - 0.5) * 2), align: o.align, font: o.font || '19px Mono', col: o.col });
}
// cota tecnica con flechas
function dim(ctx, a, b, s, o = {}) {
  const p = o.p === undefined ? 1 : o.p; if (p <= 0) return;
  const col = o.col || C.ink;
  const q = [[a[0], a[1]], [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p]];
  line(ctx, q, { w: 1.3, col });
  const arr = (P, dx, dy) => { const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L; line(ctx, [[P[0] - ux * 12 - uy * 5, P[1] - uy * 12 + ux * 5], P, [P[0] - ux * 12 + uy * 5, P[1] - uy * 12 - ux * 5]], { w: 1.3, col }); };
  arr(a, a[0] - b[0], a[1] - b[1]);
  if (p >= 1) arr(b, b[0] - a[0], b[1] - a[1]);
  if (s && p > 0.6) {
    ctx.save(); ctx.font = o.font || '20px Mono'; ctx.fillStyle = col; ctx.globalAlpha = clamp((p - 0.6) / 0.4);
    const mx = (a[0] + b[0]) / 2 + (o.dx || 0), my = (a[1] + b[1]) / 2 + (o.dy || -10);
    ctx.textAlign = 'center';
    if (o.rot) { ctx.translate(mx, my); ctx.rotate(o.rot); ctx.fillText(s, 0, 0); } else ctx.fillText(s, mx, my);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ 3D
function rotM(ax, ay, az) {
  const [a, b, c] = [ax, ay, az].map(v => v * D2R);
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
  // R = Rz * Ry * Rx
  return [
    [cc * cb, cc * sb * sa - sc * ca, cc * sb * ca + sc * sa],
    [sc * cb, sc * sb * sa + cc * ca, sc * sb * ca - cc * sa],
    [-sb, cb * sa, cb * ca],
  ];
}
const mv = (M, v) => [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// envolvente convexa por fuerza bruta (n pequeño), caras poligonales con normal hacia fuera
function hull(P) {
  const n = P.length, planes = [], eps = 1e-6;
  const cen = P.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n, a[2] + p[2] / n], [0, 0, 0]);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    let nn = cross3(sub3(P[j], P[i]), sub3(P[k], P[i]));
    const l = Math.hypot(nn[0], nn[1], nn[2]); if (l < 1e-9) continue;
    nn = [nn[0] / l, nn[1] / l, nn[2] / l];
    let d = dot3(nn, P[i]);
    if (dot3(nn, cen) > d) { nn = nn.map(v => -v); d = -d; }
    let ok = true;
    for (let m = 0; m < n; m++) if (dot3(nn, P[m]) > d + 1e-5) { ok = false; break; }
    if (!ok) continue;
    if (planes.some(q => Math.abs(q.d - d) < 1e-4 && dot3(q.n, nn) > 1 - 1e-6)) continue;
    planes.push({ n: nn, d });
  }
  const faces = [];
  for (const pl of planes) {
    const idx = []; for (let m = 0; m < n; m++) if (Math.abs(dot3(pl.n, P[m]) - pl.d) < 1e-4) idx.push(m);
    const c = idx.reduce((a, m) => [a[0] + P[m][0] / idx.length, a[1] + P[m][1] / idx.length, a[2] + P[m][2] / idx.length], [0, 0, 0]);
    const u = norm3(sub3(P[idx[0]], c)), v = cross3(pl.n, u);
    idx.sort((a, b) => { const da = sub3(P[a], c), db = sub3(P[b], c); return Math.atan2(dot3(da, v), dot3(da, u)) - Math.atan2(dot3(db, v), dot3(db, u)); });
    faces.push(idx);
  }
  void eps;
  return { V: P, F: faces };
}
const PHI = (1 + Math.sqrt(5)) / 2;
function icoPoints() {
  const o = [];
  for (const a of [-1, 1]) for (const b of [-PHI, PHI]) o.push([0, a, b], [a, b, 0], [b, 0, a]);
  return o;
}
function truncIcoPoints() {
  const o = [], perms = (v) => [[v[0], v[1], v[2]], [v[1], v[2], v[0]], [v[2], v[0], v[1]]];
  const base = [[0, 1, 3 * PHI], [1, 2 + PHI, 2 * PHI], [PHI, 2, 2 * PHI + 1]];
  for (const b of base) for (const p of perms(b)) for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const q = [p[0] * sx, p[1] * sy, p[2] * sz];
    if (!o.some(r => Math.abs(r[0] - q[0]) + Math.abs(r[1] - q[1]) + Math.abs(r[2] - q[2]) < 1e-6)) o.push(q);
  }
  return o;
}
function boxMesh(w, h, d) {
  const x = w / 2, y = h / 2, z = d / 2;
  const V = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]];
  return { V, F: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]] };
}
function cylMesh(r1, r2, h, n = 24) {
  const V = [], F = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU; V.push([Math.cos(a) * r1, -h / 2, Math.sin(a) * r1]); }
  for (let i = 0; i < n; i++) { const a = i / n * TAU; V.push([Math.cos(a) * r2, h / 2, Math.sin(a) * r2]); }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; F.push([i, n + i, n + j, j]); }
  F.push([...Array(n).keys()]);
  F.push([...Array(n).keys()].map(i => 2 * n - 1 - i));
  return { V, F, smooth: true };
}
// camara: {cx, cy, s (px por unidad), dist}
function proj(P, cam) { const k = cam.dist / (cam.dist - P[2]); return [cam.cx + P[0] * cam.s * k, cam.cy - P[1] * cam.s * k, P[2]]; }
const LIGHT = norm3([-0.55, 0.65, 0.55]);
// items: [{mesh, M, pos, sc}]  o: {p, hidden, edgeW, hatch}
function renderMeshes(ctx, items, cam, o = {}) {
  const p = o.p === undefined ? 1 : o.p;
  const faces = [];
  for (const it of items) {
    const M = it.M || rotM(0, 0, 0), s = it.sc || 1, pos = it.pos || [0, 0, 0];
    const Vw = it.mesh.V.map(v => { const r = mv(M, v); return [r[0] * s + pos[0], r[1] * s + pos[1], r[2] * s + pos[2]]; });
    const Vs = Vw.map(v => proj(v, cam));
    for (const f of it.mesh.F) {
      const P = f.map(i => Vw[i]);
      let nn = [0, 0, 0];
      for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; nn[0] += (a[1] - b[1]) * (a[2] + b[2]); nn[1] += (a[2] - b[2]) * (a[0] + b[0]); nn[2] += (a[0] - b[0]) * (a[1] + b[1]); }
      nn = norm3(nn);
      const c = P.reduce((a, q) => [a[0] + q[0] / P.length, a[1] + q[1] / P.length, a[2] + q[2] / P.length], [0, 0, 0]);
      const toCam = sub3([0, 0, cam.dist], c);
      const vis = dot3(nn, toCam) > 0;
      faces.push({ pts: f.map(i => [Vs[i][0], Vs[i][1]]), z: c[2], nn, vis, it, n: f.length });
    }
  }
  const pE = clamp(p / 0.62), pH = clamp((p - 0.45) / 0.55);
  if (o.hidden) {
    const hid = faces.filter(f => !f.vis);
    for (const f of hid) line(ctx, f.pts.concat([f.pts[0]]), { w: 1, a: 0.35 * (1 - clamp((p - 0.9) * 5) * 0.4), dash: [5, 6], p: pE });
  }
  const vis = faces.filter(f => f.vis).sort((a, b) => a.z - b.z);
  const N = vis.length;
  vis.forEach((f, k) => {
    const sh = Math.max(0, dot3(f.nn, LIGHT));
    fill(ctx, f.pts, C.paper, o.fillA === undefined ? 1 : o.fillA);
    if (f.it.darkN === f.n && pH > 0) { hatchPoly(ctx, f.pts, { ang: 30, sp: 2.6, w: 1, a: 0.9, p: pH, cross: true }); }
    else if (o.hatch !== false && pH > 0 && sh < 0.85) {
      const e = [f.pts[1][0] - f.pts[0][0], f.pts[1][1] - f.pts[0][1]];
      let ang = Math.atan2(e[1], e[0]) / D2R + (f.it.hAng || 0);
      if (f.it.mesh.smooth && f.n === 4) ang = Math.atan2(f.pts[1][1] - f.pts[0][1], f.pts[1][0] - f.pts[0][0]) / D2R;
      const sp = 3 + sh * 12;
      hatchPoly(ctx, f.pts, { ang, sp, w: 1, a: 0.75, p: pH, cross: sh < 0.18 && !f.it.noCross });
    }
    const ek = clamp(pE * N - k);
    if (ek > 0) {
      if (f.it.mesh.smooth && f.n === 4) {
        // cilindros: solo contorno de silueta (aristas verticales no se dibujan)
        line(ctx, [f.pts[0], f.pts[3]], { w: o.edgeW || 2, p: ek }); line(ctx, [f.pts[1], f.pts[2]], { w: o.edgeW || 2, p: ek });
      } else line(ctx, f.pts.concat([f.pts[0]]), { w: o.edgeW || 2, p: ek });
    }
  });
  return vis;
}
// silueta de cilindro: aristas laterales de caras visibles contiguas a no visibles
function cylSilhouette(ctx, it, cam, o = {}) {
  const M = it.M, s = it.sc || 1, pos = it.pos || [0, 0, 0], n = it.mesh.V.length / 2;
  const Vw = it.mesh.V.map(v => { const r = mv(M, v); return [r[0] * s + pos[0], r[1] * s + pos[1], r[2] * s + pos[2]]; });
  const Vs = Vw.map(v => proj(v, cam));
  const visF = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, P = [Vw[i], Vw[n + i], Vw[n + j], Vw[j]];
    const nn = norm3(cross3(sub3(P[1], P[0]), sub3(P[3], P[0])));
    const c = P.reduce((a, q) => [a[0] + q[0] / 4, a[1] + q[1] / 4, a[2] + q[2] / 4], [0, 0, 0]);
    visF.push(dot3(nn, sub3([0, 0, cam.dist], c)) < 0);
  }
  for (let i = 0; i < n; i++) {
    const prev = visF[(i - 1 + n) % n];
    if (prev !== visF[i]) line(ctx, [[Vs[i][0], Vs[i][1]], [Vs[n + i][0], Vs[n + i][1]]], { w: o.w || 2.4, p: o.p });
  }
}

// ------------------------------------------------------------------ globo
const GEO = require('./geo.json');
function gvec(lon, lat, g) {
  const l = (lon - g.lon0) * D2R, p = lat * D2R, p0 = g.lat0 * D2R;
  const x = Math.cos(p) * Math.sin(l);
  const y = Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l);
  const z = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
  return [g.cx + x * g.R, g.cy - y * g.R, z];
}
function gruns(pts, g, closed) {
  const runs = []; let cur = [];
  const all = closed ? pts.concat([pts[0]]) : pts;
  for (const q of all) { const v = gvec(q[0], q[1], g); if (v[2] > 0) cur.push([v[0], v[1]]); else if (cur.length) { if (cur.length > 1) runs.push(cur); cur = []; } }
  if (cur.length > 1) runs.push(cur);
  return runs;
}
function slerpArc(a, b, n = 60) {
  const toV = (q) => { const l = q[0] * D2R, p = q[1] * D2R; return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)]; };
  const A = toV(a), B = toV(b), om = Math.acos(clamp(dot3(A, B), -1, 1)), o = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s1 = Math.sin((1 - t) * om) / Math.sin(om), s2 = Math.sin(t * om) / Math.sin(om);
    const v = [A[0] * s1 + B[0] * s2, A[1] * s1 + B[1] * s2, A[2] * s1 + B[2] * s2];
    o.push([Math.atan2(v[1], v[0]) / D2R, Math.asin(clamp(v[2], -1, 1)) / D2R, Math.sin(t * Math.PI)]);
  }
  return o;
}
// g: {cx,cy,R,lon0,lat0,p, hi:[names], shade}
function globe(ctx, g) {
  const p = g.p === undefined ? 1 : g.p;
  if (g.clipR) {
    const lens = circ(g.lx, g.ly, g.clipR);
    fill(ctx, lens, C.paper, clamp(p / 0.25));
    ctx.save(); path(ctx, lens, true); ctx.clip();
    globe(ctx, Object.assign({}, g, { clipR: 0, noRim: true }));
    ctx.restore();
    line(ctx, lens, { w: 2.6, p: clamp(p / 0.2) });
    if (p >= 0.2) line(ctx, circ(g.lx, g.ly, g.clipR + 8), { w: 1, a: 0.6 });
    return;
  }
  const pO = clamp(p / 0.2), pG = clamp((p - 0.1) / 0.35), pL = clamp((p - 0.3) / 0.45), pS = clamp((p - 0.6) / 0.4);
  if (!g.noRim) fill(ctx, circ(g.cx, g.cy, g.R), C.paper, pO);
  // sombreado del limbo
  if (pS > 0) shadeHatch(ctx, circ(g.cx, g.cy, g.R), [-g.R * 0.22, -g.R * 0.26], { ang: 35, sp: 4.5, w: 1, a: 0.55, p: pS });
  // graticula
  const grat = [];
  const st = g.step || 15;
  for (let lat = -90 + st; lat < 90; lat += st) { const pts = []; for (let lo = -180; lo <= 180; lo += 3) pts.push([lo, lat]); grat.push(...gruns(pts, g, false)); }
  for (let lo = -180; lo < 180; lo += st) { const pts = []; for (let la = -90; la <= 90; la += 3) pts.push([lo, la]); grat.push(...gruns(pts, g, false)); }
  grat.forEach((r, i) => line(ctx, r, { w: 0.9, a: 0.45, p: clamp(pG * grat.length - i * 0.6) }));
  // costas
  if (pL > 0) {
    const L = GEO.land, nL = L.length;
    ctx.save(); path(ctx, circ(g.cx, g.cy, g.R - 0.5), true); ctx.clip();
    for (let i = 0; i < nL; i++) {
      const k = clamp(pL * 1.4 - i / nL * 0.4); if (k <= 0) continue;
      for (const r of gruns(L[i], g, true)) line(ctx, r, { w: 1.5, p: k });
    }
    for (const b of GEO.borders) for (const r of gruns(b, g, false)) line(ctx, r, { w: 0.8, a: 0.5 * pL, dash: [3, 4] });
    ctx.restore();
  }
  // paises destacados
  for (const h of (g.hi || [])) {
    const k = h.p === undefined ? pS : h.p; if (k <= 0) continue;
    for (const ring of GEO.countries[h.name]) {
      const runs = gruns(ring, g, true); if (!runs.length) continue;
      const pts = runs.flat();
      hatchPoly(ctx, pts, { ang: h.ang || -35, sp: h.sp || 3.2, w: 1, a: 0.85, p: k, col: h.col || C.ink, cross: h.cross });
      line(ctx, pts, { w: 1.8, close: true, col: h.col || C.ink, a: k });
    }
  }
  if (g.noRim) return;
  line(ctx, circ(g.cx, g.cy, g.R), { w: 2.6, p: pO });
  if (pO >= 1) line(ctx, circ(g.cx, g.cy, g.R + 7), { w: 1, a: 0.6 });
}
function gpt(g, lon, lat) { return gvec(lon, lat, g); }
function groute(ctx, g, a, b, p, o = {}) {
  if (p <= 0) return null;
  const arc = slerpArc(a, b, 80), lift = o.lift || 0.12;
  const pts = arc.map(q => {
    const v = gvec(q[0], q[1], g); const dx = v[0] - g.cx, dy = v[1] - g.cy, k = 1 + lift * q[2];
    return [g.cx + dx * k, g.cy + dy * k];
  });
  return line(ctx, pts, { w: o.w || 3, col: o.col || C.red, p, dash: o.dash });
}

// ------------------------------------------------------------------ maniqui de estudio (vista lateral, mira a +x)
// angulos en grados. extremidades: 0 = colgando, + = hacia delante.
const POSE0 = { x: 0, y: 0, rot: 0, sp: 0, nk: 0, hd: 0, s1: 4, e1: 10, s2: -4, e2: 10, h1: 2, k1: 2, f1: 0, h2: -2, k2: 2, f2: 0 };
function mixPose(a, b, t) { const o = {}; for (const k in POSE0) o[k] = lerp(a[k] === undefined ? POSE0[k] : a[k], b[k] === undefined ? POSE0[k] : b[k], t); return o; }
function poseAt(keys, t) {
  // keys: [[t, pose], ...]
  if (t <= keys[0][0]) return mixPose(keys[0][1], keys[0][1], 0);
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const u = (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]); return mixPose(keys[i - 1][1], keys[i][1], eio(u)); }
  return mixPose(keys[keys.length - 1][1], keys[keys.length - 1][1], 0);
}
function capsule(A, B, r1, r2, n = 10) {
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1e-6, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const a = Math.atan2(ny, nx), o = [];
  for (let i = 0; i <= n; i++) { const t = a - Math.PI * i / n; o.push([B[0] + Math.cos(t) * r2, B[1] + Math.sin(t) * r2]); }
  for (let i = 0; i <= n; i++) { const t = a + Math.PI - Math.PI * i / n; o.push([A[0] + Math.cos(t) * r1, A[1] + Math.sin(t) * r1]); }
  return o;
}
// Devuelve la geometria del cuerpo. o: {gx, gy (suelo), h (altura px), heads, hair, face}
function body(pose, o) {
  const heads = o.heads || 7.5, hh = o.h / heads, k = (o.h - hh) / 7;
  const Lsp = 2.55 * k, Lnk = 0.3 * k, Lth = 2.0 * k, Lsh = 1.8 * k, Lua = 1.4 * k, Lfa = 1.2 * k, footH = 0.25 * k;
  const stand = Lth + Lsh + footH;
  const Hx = o.gx + pose.x * k, Hy = o.gy - stand - pose.y * k;
  const R = pose.rot * D2R, cr = Math.cos(R), sr = Math.sin(R);
  const rotp = (P) => { const dx = P[0] - Hx, dy = P[1] - Hy; return [Hx + dx * cr - dy * sr, Hy + dx * sr + dy * cr]; };
  const dn = (a) => [Math.sin(a * D2R), Math.cos(a * D2R)];
  const up = (a) => [Math.sin(a * D2R), -Math.cos(a * D2R)];
  const add = (P, d, L) => [P[0] + d[0] * L, P[1] + d[1] * L];
  const Hp = [Hx, Hy];
  const S = add(Hp, up(pose.sp), Lsp);
  const N = add(S, up(pose.sp + pose.nk), Lnk);
  const hdA = pose.sp + pose.nk + pose.hd;
  const HC = add(add(N, up(hdA), hh * 0.4), up(hdA + 90), hh * 0.08);
  const SH = [Hp[0] + (S[0] - Hp[0]) * 0.9, Hp[1] + (S[1] - Hp[1]) * 0.9];
  const arm = (s, e) => { const E = add(SH, dn(s + pose.sp * 0.2), Lua); const Wr = add(E, dn(s + e + pose.sp * 0.2), Lfa); const Hd = add(Wr, dn(s + e + pose.sp * 0.2), 0.32 * k); return { E, W: Wr, Hd, a: s + e + pose.sp * 0.2 }; };
  const leg = (h, kn, f) => { const K = add(Hp, dn(h), Lth); const A = add(K, dn(h - kn), Lsh); const fa = h - kn + 90 - f; const T = add(A, dn(fa), 0.95 * k); const Hl = add(A, dn(fa), -0.28 * k); const G = add(A, dn(h - kn), footH); return { K, A, T, Hl, G, fa }; };
  const a1 = arm(pose.s1, pose.e1), a2 = arm(pose.s2, pose.e2), l1 = leg(pose.h1, pose.k1, pose.f1), l2 = leg(pose.h2, pose.k2, pose.f2);
  return { k, hh, Hp, S, SH, N, HC, hdA, a1, a2, l1, l2, rotp, stand };
}
function figure(ctx, pose, o) {
  pose = Object.assign({}, POSE0, pose);
  const B = body(pose, o), k = B.k, hh = B.hh, R = B.rotp;
  const a = o.a === undefined ? 1 : o.a, p = o.p === undefined ? 1 : o.p;
  const lw = o.w || Math.max(1.4, k * 0.07);
  const sh = [k * 0.16 * Math.cos(-0.6), k * 0.16 * Math.sin(-0.6)]; // desplaz. hacia luz (delante-arriba)
  const parts = [];
  let rk = 0;
  const push = (pts, far, extra) => parts.push(Object.assign({ pts: pts.map(R), far, rk: rk }, extra || {}));
  const limbArm = (A, far) => {
    push(capsule(B.SH, A.E, 0.21 * k, 0.16 * k), far);
    push(capsule(A.E, A.W, 0.16 * k, 0.11 * k), far);
    push(ell(A.Hd[0], A.Hd[1], 0.15 * k, 0.28 * k, -A.a * D2R), far);
  };
  const limbLeg = (L, far) => {
    push(capsule(B.Hp, L.K, 0.36 * k, 0.24 * k), far);
    push(capsule(L.K, L.A, 0.24 * k, 0.13 * k), far);
    const up = [L.A[0] - L.G[0], L.A[1] - L.G[1]];
    const foot = [L.Hl, [L.Hl[0] + up[0] * 1.3, L.Hl[1] + up[1] * 1.3], [L.A[0] + (L.T[0] - L.A[0]) * 0.3 + up[0] * 0.6, L.A[1] + (L.T[1] - L.A[1]) * 0.3 + up[1] * 0.6], [L.T[0] + up[0] * 0.25, L.T[1] + up[1] * 0.25], L.T];
    push(catmull(foot.concat([[L.Hl[0] * 0.5 + L.T[0] * 0.5, L.Hl[1] * 0.5 + L.T[1] * 0.5]]), true, 5), far);
  };
  // lejano
  rk = 15; limbArm(B.a2, true); rk = 9; limbLeg(B.l2, true); rk = 0;
  // torso
  const spd = [B.S[0] - B.Hp[0], B.S[1] - B.Hp[1]], spL = Math.hypot(spd[0], spd[1]), spA = Math.atan2(spd[1], spd[0]);
  const at = (t, off) => [B.Hp[0] + spd[0] * t + Math.cos(spA + Math.PI / 2) * off, B.Hp[1] + spd[1] * t + Math.sin(spA + Math.PI / 2) * off];
  const fem = o.fem ? 1 : 0;
  push(ell(...at(0.06, 0.02 * k), 0.5 * k, (0.6 + fem * 0.06) * k, spA), false);
  push(capsule(at(0.12, 0), at(0.55, 0.02 * k), 0.44 * k, 0.46 * k), false);
  push(ell(...at(0.66, -0.04 * k), 0.62 * spL / 1.9 * 1.0, (0.58 + 0.02 * fem) * k, spA), false);
  // cuello y cabeza
  push(capsule(B.S, B.N, 0.2 * k, 0.18 * k), false);
  const HA = B.hdA * D2R, hc = B.HC;
  const hl = (u, v) => [hc[0] + (u * Math.cos(HA) - v * Math.sin(HA)) * hh, hc[1] + (u * Math.sin(HA) + v * Math.cos(HA)) * hh];
  const HP = (arr, n = 5) => catmull(arr.map(q => hl(q[0], q[1])), true, n).map(R);
  const head = HP([[-0.16, 0.36], [-0.36, 0.2], [-0.45, -0.04], [-0.38, -0.34], [-0.14, -0.5], [0.12, -0.49], [0.3, -0.38], [0.38, -0.2], [0.40, -0.07], [0.37, 0.0], [0.41, 0.06],
    [0.49, 0.16], [0.42, 0.19], [0.43, 0.25], [0.40, 0.29], [0.42, 0.33], [0.38, 0.38], [0.39, 0.45], [0.3, 0.5], [0.14, 0.45], [0.02, 0.33]]);
  const nearArmParts = [];
  rk = 12; const sv = parts.length; limbArm(B.a1, false); nearArmParts.push(...parts.splice(sv));
  rk = 6; const sv2 = parts.length; limbLeg(B.l1, false); const nearLeg = parts.splice(sv2);
  const order = parts.concat(nearLeg, [{ pts: head, far: false, head: true, rk: 4 }], nearArmParts);
  const tot = order.length;
  const hair = o.hair || 'short';
  const HAIR = {
    short: [[0.33, -0.33], [0.2, -0.46], [-0.1, -0.53], [-0.38, -0.38], [-0.48, -0.06], [-0.40, 0.2], [-0.3, 0.12], [-0.16, -0.08], [0.05, -0.2], [0.2, -0.24]],
    dark: [[0.36, -0.3], [0.2, -0.5], [-0.12, -0.57], [-0.44, -0.4], [-0.54, -0.02], [-0.5, 0.4], [-0.42, 0.82], [-0.2, 0.86], [-0.24, 0.5], [-0.2, 0.1], [-0.12, -0.12], [0.1, -0.24], [0.26, -0.22]],
    darkKid: [[0.36, -0.3], [0.2, -0.5], [-0.12, -0.56], [-0.44, -0.38], [-0.62, -0.26], [-0.8, -0.05], [-0.7, 0.2], [-0.52, 0.02], [-0.44, 0.18], [-0.3, 0.14], [-0.16, -0.08], [0.1, -0.22], [0.26, -0.22]],
  };
  HAIR.kid = HAIR.short; HAIR.buzz = HAIR.short; HAIR.thin = HAIR.short;
  const nR = {}; order.forEach(q => { nR[q.rk] = (nR[q.rk] || 0) + 1; });
  const cnt = {};
  order.forEach((q) => {
    const i = q.rk + (cnt[q.rk] = (cnt[q.rk] || 0) + 1) - 1;
    const kk = clamp(p * tot * 1.15 - i);
    if (kk <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    fill(ctx, q.pts, C.paper, 1);
    if (o.shade !== false && kk > 0.5) shadeHatch(ctx, q.pts, sh, { ang: -60, sp: q.far ? 3.2 : 4.2, w: 0.9, a: (q.far ? 0.8 : 0.6), cross: q.far && o.cross });
    ctx.restore();
    if (q.head && kk > 0.6) {
      ctx.save(); ctx.globalAlpha = a;
      const hp = HP(HAIR[hair], 6);
      if (hair === 'buzz' || hair === 'thin') {
        ctx.save(); path(ctx, head, true); ctx.clip();
        stipple(ctx, hp, Math.min(7000, Math.round(hh * hh * (hair === 'buzz' ? 0.5 : 0.18))), 5, { s: Math.min(2.6, Math.max(1.3, hh * 0.02)), a: 0.9 });
        ctx.restore();
        line(ctx, hp.slice(-Math.floor(hp.length * 0.45)), { w: 0.8, a: 0.5, dash: [2, 3] });
      } else if (hair === 'dark' || hair === 'darkKid') {
        fill(ctx, hp, C.paper, 1);
        hatchPoly(ctx, hp, { ang: 68, sp: 2.3, w: 1, a: 0.95, cross: true });
        line(ctx, hp, { w: lw * 0.9, close: true });
      } else {
        hatchPoly(ctx, hp, { ang: 62, sp: 3.4, w: 1, a: 0.8 });
        line(ctx, hp, { w: lw * 0.8, close: true });
      }
      // oreja, ojo, ceja
      if (hair !== 'dark') {
        const ear = ell(0, 0, 1, 1, 0, 0, TAU, 14).map(q => hl(q[0] * 0.07 - 0.06, q[1] * 0.12 + 0.06)).map(R);
        fill(ctx, ear, C.paper, 1); line(ctx, ear, { w: lw * 0.7, close: true });
      }
      const eye = R(hl(0.3, 0.0));
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(eye[0], eye[1], Math.max(1.4, hh * 0.03), 0, TAU); ctx.fill();
      line(ctx, [hl(0.24, -0.08), hl(0.36, -0.09)].map(R), { w: lw * 0.6 });
      if (o.construct) {
        line(ctx, [hl(-0.6, 0.0), hl(0.65, 0.0)].map(R), { w: 0.8, a: 0.45, dash: [4, 4] });
        line(ctx, [hl(0.0, -0.62), hl(0.0, 0.62)].map(R), { w: 0.8, a: 0.45, dash: [4, 4] });
      }
      ctx.restore();
    }
    line(ctx, q.pts, { w: q.far ? lw * 0.85 : lw, p: kk, a, close: true });
  });
  return B;
}

module.exports = {
  W, H, C, TAU, D2R, PHI, rng, clamp, lerp, pr, eio, eout,
  plen, cut, path, line, seq, nib, circ, ell, bez, catmull, tf, bbox, fill,
  hatchLines, hatchPoly, shadeHatch, stipple, paper, spaced, spacedW, label, leader, dim,
  rotM, mv, hull, icoPoints, truncIcoPoints, boxMesh, cylMesh, proj, renderMeshes, cylSilhouette,
  globe, gpt, groute, GEO,
  POSE0, mixPose, poseAt, body, figure, capsule, createCanvas,
};
