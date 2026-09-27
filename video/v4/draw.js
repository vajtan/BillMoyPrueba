// Motor de "dibujo de niño": trazos de cera temblorosos, relleno garabateado y papel de cuaderno.
'use strict';
const { createCanvas } = require('@napi-rs/canvas');

const W = 1080, H = 1920;
const G = { boil: 0, sid: 0, amp: 1 };

function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rngFor = (seed) => mulberry((seed * 2654435761) >>> 0);
function nextRng() { G.sid++; return mulberry((G.boil * 7919 + G.sid * 104729 + 17) >>> 0); }
function beginFrame(boil) { G.boil = boil; G.sid = 0; }

const C = {
  red: '#e63946', orange: '#f4a261', yellow: '#ffd23f', green: '#52b788', dkgreen: '#2d6a4f',
  blue: '#3a86ff', ltblue: '#8ecae6', navy: '#1d3557', purple: '#9b5de5', pink: '#f15bb5',
  brown: '#8d5524', ltbrown: '#c68b59', skin: '#f6c89f', skin2: '#e0a878', black: '#2b2b2b',
  grey: '#8d99ae', ltgrey: '#c9ced6', white: '#ffffff', gold: '#f9c80e', teal: '#2ec4b6',
};

function resample(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const L = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.ceil(L / step));
    for (let k = 1; k <= n; k++) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
  }
  return out;
}

function wobble(pts, amp, r) {
  const ph1 = r() * 6.28, ph2 = r() * 6.28, f1 = 0.25 + r() * 0.2, f2 = 0.7 + r() * 0.4;
  return pts.map(([x, y], i) => {
    const a = amp * (Math.sin(i * f1 + ph1) * 0.7 + Math.sin(i * f2 + ph2) * 0.3);
    const b = amp * (Math.cos(i * f1 * 1.3 + ph2) * 0.7 + (r() - 0.5) * 0.6);
    return [x + a, y + b];
  });
}

// Linea de cera: varias pasadas finas con transparencia = textura de crayon.
function line(ctx, pts, col, w = 8, opt = {}) {
  if (pts.length < 2) return;
  const r = nextRng();
  const amp = (opt.amp ?? 2.2) * G.amp;
  let p = resample(pts, 9);
  if (opt.closed) {
    const [x0, y0] = p[0];
    p.push([x0 + (r() - 0.5) * 10, y0 + (r() - 0.5) * 10]);
  } else if (opt.overshoot !== false && p.length > 2) {
    const [ax, ay] = p[0], [bx, by] = p[1];
    const e = r() * 6;
    const L = Math.hypot(bx - ax, by - ay) || 1;
    p.unshift([ax - (bx - ax) / L * e, ay - (by - ay) / L * e]);
  }
  p = wobble(p, amp, r);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col;
  const passes = opt.passes ?? 3;
  for (let k = 0; k < passes; k++) {
    ctx.globalAlpha = (opt.alpha ?? 0.9) * (k === 0 ? 0.9 : 0.55);
    ctx.lineWidth = w * (k === 0 ? 0.75 : 0.45 + r() * 0.25);
    const ox = (r() - 0.5) * w * 0.5, oy = (r() - 0.5) * w * 0.5;
    ctx.beginPath();
    ctx.moveTo(p[0][0] + ox, p[0][1] + oy);
    for (let i = 1; i < p.length; i++) {
      if (k > 0 && r() < 0.05) { ctx.moveTo(p[i][0] + ox, p[i][1] + oy); continue; }
      ctx.lineTo(p[i][0] + ox, p[i][1] + oy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// Relleno garabateado en zig-zag, recortado a la forma (con algo de "salirse").
function fill(ctx, poly, col, opt = {}) {
  const r = nextRng();
  const sp = opt.spacing ?? 13, w = opt.w ?? 11;
  const ang = opt.angle ?? (-0.7 + (r() - 0.5) * 0.5);
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  for (const [x, y] of poly) { minx = Math.min(minx, x); miny = Math.min(miny, y); maxx = Math.max(maxx, x); maxy = Math.max(maxy, y); }
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2, R = Math.hypot(maxx - minx, maxy - miny) / 2 + 10;
  ctx.save();
  ctx.beginPath();
  const jp = wobble(resample(poly.concat([poly[0]]), 20), 3 * G.amp, r);
  ctx.moveTo(jp[0][0], jp[0][1]);
  for (const [x, y] of jp) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.clip();
  const ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
  const pts = [];
  let k = 0;
  for (let s = -R; s <= R; s += sp) {
    const side = (k++ % 2) ? 1 : -1;
    pts.push([cx + vx * s + ux * R * side + (r() - .5) * 8, cy + vy * s + uy * R * side + (r() - .5) * 8]);
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col;
  for (let pass = 0; pass < (opt.passes ?? 2); pass++) {
    ctx.globalAlpha = (opt.alpha ?? 0.8) * (pass ? 0.5 : 1);
    ctx.lineWidth = w * (pass ? 0.6 : 1);
    ctx.beginPath();
    const o = pass * sp * 0.5;
    ctx.moveTo(pts[0][0] + vx * o, pts[0][1] + vy * o);
    for (const [x, y] of pts) ctx.lineTo(x + vx * o + (r() - .5) * 3, y + vy * o + (r() - .5) * 3);
    ctx.stroke();
  }
  ctx.restore();
}

function ellipsePts(cx, cy, rx, ry, n = 28, a0 = 0) {
  const p = [];
  for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return p;
}
function rectPts(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }

function shape(ctx, pts, o = {}) {
  if (o.fill) fill(ctx, pts, o.fill, o);
  if (o.stroke !== null) line(ctx, pts, o.stroke || C.black, o.lw || 7, { closed: true, amp: o.amp });
}
const circle = (ctx, cx, cy, r, o = {}) => shape(ctx, ellipsePts(cx, cy, r, o.ry || r), o);
const rect = (ctx, x, y, w, h, o = {}) => shape(ctx, rectPts(x, y, w, h), o);

function dot(ctx, x, y, r, col) {
  ctx.save(); ctx.fillStyle = col; ctx.globalAlpha = 0.95;
  ctx.beginPath(); ctx.arc(x + (nextRng()() - .5) * 2 * G.amp, y, r, 0, 7); ctx.fill(); ctx.restore();
}

// ---------------------------------------------------------------- papel
let PAPER = null;
function paper() {
  if (PAPER) return PAPER;
  const c = createCanvas(W, H);
  const x = c.getContext('2d');
  x.fillStyle = '#fbf7ec'; x.fillRect(0, 0, W, H);
  const id = x.getImageData(0, 0, W, H);
  const d = id.data, r = rngFor(99);
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 14;
    d[i] += n; d[i + 1] += n; d[i + 2] += n - 2;
  }
  x.putImageData(id, 0, 0);
  x.strokeStyle = 'rgba(120,160,220,0.35)'; x.lineWidth = 2;
  for (let y = 120; y < H; y += 64) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
  x.strokeStyle = 'rgba(230,90,100,0.35)';
  x.beginPath(); x.moveTo(70, 0); x.lineTo(70, H); x.stroke();
  PAPER = c;
  return c;
}

module.exports = { W, H, G, C, mulberry, rngFor, nextRng, beginFrame, line, fill, shape, circle, rect, dot,
  ellipsePts, rectPts, resample, paper, createCanvas };
