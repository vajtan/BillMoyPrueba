// Letra "a mano" de niño: mayusculas trazadas con cera (fuente de trazos propia).
'use strict';
const { line, dot, rngFor } = require('./draw');

const O = [[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]];
const P_ = [[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]];
const GL = {
  A: [[[0, 6], [2, 0], [4, 6]], [[1, 3.6], [3, 3.6]]],
  B: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]], [[3, 3], [4, 4], [4, 5], [3, 6], [0, 6]]],
  C: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5]]],
  D: [[[0, 0], [0, 6], [2.5, 6], [4, 4.5], [4, 1.5], [2.5, 0], [0, 0]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
  G: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3.5], [2.4, 3.5]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  I: [[[2, 0], [2, 6]], [[1, 0], [3, 0]], [[1, 6], [3, 6]]],
  J: [[[4, 0], [4, 5], [3, 6], [1, 6], [0, 5]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0, 3.6]], [[1.3, 2.7], [4, 6]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3], [4, 0], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  O: [O],
  P: [P_],
  Q: [O, [[2.4, 4.4], [4.2, 6.4]]],
  R: [P_, [[2, 3], [4, 6]]],
  S: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 2], [1, 3], [3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]],
  V: [[[0, 0], [2, 6], [4, 0]]],
  W: [[[0, 0], [1, 6], [2, 2.5], [3, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [[[0, 0], [2, 3], [4, 0]], [[2, 3], [2, 6]]],
  Z: [[[0, 0], [4, 0], [0, 6], [4, 6]]],
  0: [O, [[3.4, 1], [0.6, 5]]],
  1: [[[1, 1.2], [2, 0], [2, 6]], [[1, 6], [3, 6]]],
  2: [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [0, 6], [4, 6]]],
  3: [[[0, 0], [4, 0], [2, 2.5], [3, 2.5], [4, 3.5], [4, 5], [3, 6], [1, 6], [0, 5]]],
  4: [[[3, 6], [3, 0], [0, 4], [4, 4]]],
  5: [[[4, 0], [0, 0], [0, 3], [3, 3], [4, 4], [4, 5], [3, 6], [0, 6]]],
  6: [[[4, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]]],
  7: [[[0, 0], [4, 0], [1.5, 6]]],
  8: [[[1, 3], [0, 2], [0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [3, 3], [1, 3], [0, 4], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3]]],
  9: [[[4, 3], [1, 3], [0, 2], [0, 1], [1, 0], [3, 0], [4, 1], [4, 6]]],
  ',': [[[2, 5.4], [1.4, 7]]],
  '-': [[[1, 3], [3, 3]]],
  '(': [[[3, -0.3], [1.6, 1.5], [1.6, 4.5], [3, 6.3]]],
  ')': [[[1, -0.3], [2.4, 1.5], [2.4, 4.5], [1, 6.3]]],
  '+': [[[2, 1.5], [2, 4.5]], [[0.5, 3], [3.5, 3]]],
  "'": [[[2, 0], [2, 1.5]]],
  '/': [[[4, 0], [0, 6]]],
  '?': [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [2, 3.4], [2, 4.3]]],
  '¿': [[[2, 1.7], [2, 2.6], [0, 4], [0, 5], [1, 6], [3, 6], [4, 5]]],
  '!': [[[2, 0], [2, 4.2]]],
  '¡': [[[2, 1.8], [2, 6]]],
  '%': [[[4, 0], [0, 6]], [[0.5, 0.5], [1, 0.5]], [[3, 5.5], [3.5, 5.5]]],
  '♥': [[[2, 6], [0, 3], [0, 1], [1, 0], [2, 1], [3, 0], [4, 1], [4, 3], [2, 6]]],
  '✓': [[[0, 3.5], [1.5, 5.5], [4, 0.5]]],
};
const DOTS = { '.': [[2, 5.9]], '!': [[2, 5.9]], '¡': [[2, 0.1]], '?': [[2, 5.9]], '¿': [[2, 0.1]], ':': [[2, 1.6], [2, 5.6]], ';': [[2, 1.6]] };
GL[';'] = [[[2, 5.4], [1.4, 7]]];
const ACC = { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ñ': 'N', 'Ü': 'U' };

function glyphStrokes(ch) {
  const base = ACC[ch] || ch;
  const st = (GL[base] || []).slice();
  if ('ÁÉÍÓÚ'.includes(ch)) st.push([[1.5, -0.7], [2.9, -1.9]]);
  if (ch === 'Ñ') st.push([[0.4, -1], [1.4, -1.9], [2.6, -1], [3.6, -1.9]]);
  return st;
}

const ADV = 5.3;

// Dibuja texto; prog = numero de letras visibles (fraccion = letra a medio trazar).
function write(ctx, str, x, y, u, col, prog = 1e9, seed = 1, wl = null) {
  let n = 0;
  const lw = wl || Math.max(3, u * 1.05);
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (n >= prog) break;
    const frac = Math.min(1, prog - n);
    const r = rngFor(seed * 131 + i);
    const s = u * (0.94 + r() * 0.12);
    const gx = x + i * ADV * u + (r() - 0.5) * u * 0.5;
    const gy = y + (r() - 0.5) * u * 0.8;
    const rot = (r() - 0.5) * 0.12;
    if (ch !== ' ') {
      const strokes = glyphStrokes(ch).map(st => st.map(([px, py]) => {
        const X = (px - 2) * s, Y = (py - 3) * s;
        return [gx + 2 * u + X * Math.cos(rot) - Y * Math.sin(rot), gy + 3 * u + X * Math.sin(rot) + Y * Math.cos(rot)];
      }));
      let total = 0;
      for (const st of strokes) for (let k = 1; k < st.length; k++) total += Math.hypot(st[k][0] - st[k - 1][0], st[k][1] - st[k - 1][1]);
      let budget = total * frac;
      for (const st of strokes) {
        if (budget <= 0) break;
        const part = [st[0]];
        for (let k = 1; k < st.length && budget > 0; k++) {
          const L = Math.hypot(st[k][0] - st[k - 1][0], st[k][1] - st[k - 1][1]);
          if (L <= budget) { part.push(st[k]); budget -= L; } else {
            const f = budget / L;
            part.push([st[k - 1][0] + (st[k][0] - st[k - 1][0]) * f, st[k - 1][1] + (st[k][1] - st[k - 1][1]) * f]);
            budget = 0;
          }
        }
        if (part.length > 1) line(ctx, part, col, lw, { amp: 0.8, passes: 2, overshoot: false });
      }
      if (frac >= 1 && DOTS[ch]) for (const [px, py] of DOTS[ch]) {
        dot(ctx, gx + 2 * u + (px - 2) * s, gy + 3 * u + (py - 3) * s, lw * 0.7, col);
      }
    }
    n++;
  }
  return str.length * ADV * u;
}

function width(str, u) { return str.length * ADV * u; }

function wrap(s, n) {
  const words = s.split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    if (cur.length + w.length + (cur ? 1 : 0) > n) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
  }
  lines.push(cur);
  return lines;
}

// Varias lineas con progreso global (en letras)
function writeLines(ctx, lines, x, y, u, lh, col, prog, seed, center = false, cx = 0) {
  let k = 0;
  lines.forEach((ln, i) => {
    const xx = center ? cx - width(ln, u) / 2 : x;
    write(ctx, ln, xx, y + i * lh, u, col, prog - k, seed + i * 17);
    k += ln.length + 1;
  });
}

module.exports = { write, writeLines, width, wrap, ADV };
