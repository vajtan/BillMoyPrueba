// Motor de ilustracion editorial estilo risografia: tintas planas en multiplicar,
// desfase de registro, tramas de semitono y grano de impresion.
'use strict';
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

const W = 1080, H = 1920;
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf', 'Serif');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf', 'SerifI');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf', 'SerifB');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/freefont/FreeSansBold.ttf', 'SansB');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/freefont/FreeSans.ttf', 'Sans');

const PAPER = '#efe6d2';
const INK = { navy: '#243150', coral: '#e8604c', mustard: '#e9b44c', teal: '#2a9d8f', pink: '#f19db1', black: '#1b1b22' };
// desfase de registro por tinta (en px)
const REG = { navy: [0, 0], coral: [3, -2], mustard: [-2, 3], teal: [2, 2], pink: [-3, -1], black: [0, 0], paper: [0, 0] };

function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rng = (s) => mulberry((s * 2654435761) >>> 0);

// --------------------------------------------------------------- tramas
const PAT = {};
function dotsCanvas(col, density, cell = 9, angle = 0.4) {
  const key = col + density + cell;
  if (PAT[key]) return PAT[key];
  const S = cell * 8;
  const c = createCanvas(S, S), x = c.getContext('2d');
  x.fillStyle = col;
  const r = Math.sqrt(density) * cell * 0.62;
  for (let i = -1; i <= 9; i++) for (let j = -1; j <= 9; j++) {
    const cx = i * cell + (j % 2) * cell / 2, cy = j * cell;
    x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  }
  PAT[key] = c;
  return c;
}
function linesCanvas(col, density, cell = 10) {
  const key = 'L' + col + density + cell;
  if (PAT[key]) return PAT[key];
  const S = cell * 8;
  const c = createCanvas(S, S), x = c.getContext('2d');
  x.strokeStyle = col; x.lineWidth = Math.max(1, cell * density);
  for (let k = -S; k < 2 * S; k += cell) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + S, S); x.stroke(); }
  PAT[key] = c;
  return c;
}

// --------------------------------------------------------------- dibujo
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const PRGB = hex(PAPER);
function resolved(ink, a) {
  if (ink === 'paper') return PAPER;
  const c = hex(INK[ink]);
  const m = c.map((v, i) => PRGB[i] * (1 - a) + (PRGB[i] * v / 255) * a);
  return 'rgb(' + m.map(Math.round).join(',') + ')';
}
class Ink {
  constructor(ctx) { this.ctx = ctx; this.jit = [0, 0]; this.solid = false; }
  begin(ink, alpha = 1) {
    const c = this.ctx;
    c.save();
    const o = REG[ink] || [0, 0];
    c.translate(o[0] + this.jit[0], o[1] + this.jit[1]);
    if (this.solid) {
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
      c.fillStyle = resolved(ink, alpha);
    } else {
      c.globalCompositeOperation = ink === 'paper' ? 'source-over' : 'multiply';
      c.globalAlpha = alpha;
      c.fillStyle = ink === 'paper' ? PAPER : INK[ink];
    }
    c.strokeStyle = c.fillStyle;
    return c;
  }
  end() { this.ctx.restore(); }
  path(pts, close = true) {
    const c = this.ctx;
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    if (close) c.closePath();
  }
  poly(ink, pts, alpha = 1) { const c = this.begin(ink, alpha); this.path(pts); c.fill(); this.end(); }
  rect(ink, x, y, w, h, alpha = 1) { const c = this.begin(ink, alpha); c.fillRect(x, y, w, h); this.end(); }
  circle(ink, x, y, r, alpha = 1, ry) { const c = this.begin(ink, alpha); c.beginPath(); c.ellipse(x, y, r, ry || r, 0, 0, 7); c.fill(); this.end(); }
  stroke(ink, pts, w, alpha = 1, cap = 'round') {
    const c = this.begin(ink, alpha); c.lineWidth = w; c.lineCap = cap; c.lineJoin = 'round';
    this.path(pts, false); c.stroke(); this.end();
  }
  // trama de semitono dentro de un poligono
  halftone(ink, pts, density, alpha = 1, lines = false, cell = 9) {
    const sv = this.solid; this.solid = false;
    const c = this.begin(ink, alpha);
    this.solid = sv;
    this.path(pts); c.clip();
    const pat = c.createPattern(lines ? linesCanvas(INK[ink], density, cell) : dotsCanvas(INK[ink], density, cell), 'repeat');
    c.fillStyle = pat;
    c.globalCompositeOperation = 'multiply';
    c.fillRect(-50, -50, W + 100, H + 100);
    this.end();
  }
  // degradado de semitono vertical en bandas (cielos)
  gradBands(ink, x, y, w, h, d0, d1, bands = 8, cell = 10) {
    for (let k = 0; k < bands; k++) {
      const d = d0 + (d1 - d0) * k / (bands - 1);
      if (d <= 0.01) continue;
      const yy = y + h * k / bands;
      this.halftone(ink, [[x, yy], [x + w, yy], [x + w, yy + h / bands + 1], [x, yy + h / bands + 1]], d, 1, false, cell);
    }
  }
  // texto
  text(ink, s, x, y, font, align = 'left', alpha = 1) {
    const c = this.begin(ink, alpha); c.font = font; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillText(s, x, y); this.end();
  }
  textStroke(ink, s, x, y, font, w, align = 'left', alpha = 1) {
    const c = this.begin(ink, alpha); c.font = font; c.textAlign = align; c.lineWidth = w; c.lineJoin = 'round'; c.strokeText(s, x, y); this.end();
  }
}

// --------------------------------------------------------------- grano
let GRAIN = null;
function grain() {
  if (GRAIN) return GRAIN;
  GRAIN = [0, 1, 2].map(k => {
    const c = createCanvas(W, H), x = c.getContext('2d');
    const id = x.createImageData(W, H), d = id.data, r = rng(50 + k);
    for (let i = 0; i < d.length; i += 4) {
      const v = r();
      if (v < 0.05) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = 150; }          // motas de papel (tinta que no cubre)
      else if (v > 0.985) { d[i] = 40; d[i + 1] = 40; d[i + 2] = 60; d[i + 3] = 60; } // polvo
      else { const n = 128 + (r() - 0.5) * 60; d[i] = d[i + 1] = d[i + 2] = n; d[i + 3] = 18; }
    }
    x.putImageData(id, 0, 0);
    return c;
  });
  return GRAIN;
}
let PAPERC = null;
function paper() {
  if (PAPERC) return PAPERC;
  const c = createCanvas(W, H), x = c.getContext('2d');
  x.fillStyle = PAPER; x.fillRect(0, 0, W, H);
  const id = x.getImageData(0, 0, W, H), d = id.data, r = rng(9);
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 10; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(id, 0, 0);
  PAPERC = c;
  return c;
}

function wrapText(ctx, s, font, maxW) {
  ctx.font = font;
  const words = s.split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  lines.push(cur);
  return lines;
}

module.exports = { W, H, INK, PAPER, REG, Ink, grain, paper, rng, mulberry, createCanvas, wrapText };
