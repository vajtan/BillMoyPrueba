// Sintetizador de audio en JavaScript: musica de cajita/xilofono + efectos de sonido. Escribe WAV.
'use strict';
const fs = require('fs');
const SR = 44100;

function makeBuf(sec) { return new Float32Array(Math.ceil(sec * SR) + SR); }
let seed = 12345;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

function biquad(x, type, f, q = 0.7) {
  const w0 = 2 * Math.PI * f / SR, c = Math.cos(w0), s = Math.sin(w0), al = s / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

function add(buf, t0, arr, vol = 1) {
  const i0 = Math.floor(t0 * SR);
  for (let i = 0; i < arr.length; i++) { const k = i0 + i; if (k >= 0 && k < buf.length) buf[k] += arr[i] * vol; }
}

// oscilador con barrido y envolvente
function osc(dur, f0, f1 = f0, type = 'sin', env = { a: 0.005, d: 0.2 }, vib = 0) {
  const n = Math.floor(dur * SR), out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n, t = i / SR;
    const f = f0 * Math.pow(f1 / f0, u) * (1 + vib * Math.sin(2 * Math.PI * 5.5 * t));
    ph += f / SR;
    let v;
    const p = ph % 1;
    if (type === 'sin') v = Math.sin(2 * Math.PI * p);
    else if (type === 'tri') v = 4 * Math.abs(p - 0.5) - 1;
    else if (type === 'sq') v = p < 0.5 ? 1 : -1;
    else v = 2 * p - 1;
    const e = t < env.a ? t / env.a : Math.exp(-(t - env.a) / env.d);
    out[i] = v * e * Math.min(1, (n - i) / (0.01 * SR));
  }
  return out;
}
function noise(dur, env = { a: 0.005, d: 0.1 }) {
  const n = Math.floor(dur * SR), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const e = t < env.a ? t / env.a : Math.exp(-(t - env.a) / env.d);
    out[i] = (rnd() * 2 - 1) * e * Math.min(1, (n - i) / (0.01 * SR));
  }
  return out;
}
function flat(dur) { return noise(dur, { a: 0.3, d: 1e9 }); }
function mix(...arrs) {
  const n = Math.max(...arrs.map(a => a.length)), o = new Float32Array(n);
  for (const a of arrs) for (let i = 0; i < a.length; i++) o[i] += a[i];
  return o;
}
function gain(a, g) { for (let i = 0; i < a.length; i++) a[i] *= g; return a; }
function lfo(a, f, depth, ph = 0) { for (let i = 0; i < a.length; i++) a[i] *= 1 - depth * (0.5 + 0.5 * Math.sin(2 * Math.PI * f * i / SR + ph)); return a; }
function fade(a, fi = 0.3, fo = 0.3) {
  const n = a.length, A = fi * SR, B = fo * SR;
  for (let i = 0; i < n; i++) a[i] *= Math.min(1, i / A, (n - i) / B);
  return a;
}

// ---------------------------------------------------------------- EFECTOS
const SFX = {
  scribble: (b, t) => add(b, t, biquad(noise(0.07, { a: 0.01, d: 0.04 }), 'bp', 2500 + rnd() * 2000, 1.2), 0.18),
  birds: (b, t, dur) => {
    for (let tt = t; tt < t + dur; tt += 0.4 + rnd() * 1.2) {
      const n = 1 + Math.floor(rnd() * 3), f = 2600 + rnd() * 1800;
      for (let k = 0; k < n; k++) add(b, tt + k * 0.11, osc(0.08, f, f * (1.2 + rnd() * 0.4), 'sin', { a: 0.005, d: 0.05 }), 0.05);
    }
  },
  wind: (b, t, dur) => add(b, t, fade(lfo(biquad(flat(dur), 'lp', 500), 0.2, 0.6), 1, 1), 0.18),
  engine: (b, t, dur, v = 0.12) => add(b, t, fade(mix(biquad(osc(dur, 48, 48, 'saw', { a: 0.2, d: 1e9 }), 'lp', 220), gain(biquad(flat(dur), 'lp', 160), 0.7)), 0.4, 0.8), v),
  horn: (b, t) => { add(b, t, osc(0.45, 350, 350, 'sq', { a: 0.01, d: 1 }), 0.06); add(b, t, osc(0.45, 440, 440, 'sq', { a: 0.01, d: 1 }), 0.06); },
  whoosh: (b, t) => add(b, t, biquad(noise(0.35, { a: 0.12, d: 0.12 }), 'bp', 1200, 0.8), 0.35),
  boing: (b, t) => add(b, t, osc(0.3, 160, 620, 'sin', { a: 0.005, d: 0.2 }, 0.08), 0.25),
  punch: (b, t) => { add(b, t, osc(0.14, 140, 45, 'sin', { a: 0.002, d: 0.08 }), 0.7); add(b, t, biquad(noise(0.08, { a: 0.001, d: 0.03 }), 'lp', 1800), 0.5); },
  bigpunch: (b, t) => { add(b, t, osc(0.25, 120, 38, 'sin', { a: 0.002, d: 0.14 }), 0.9); add(b, t, biquad(noise(0.2, { a: 0.001, d: 0.07 }), 'lp', 2500), 0.7); },
  bell: (b, t) => { for (let k = 0; k < 3; k++) { add(b, t + k * 0.25, osc(1.2, 1480, 1480, 'sin', { a: 0.002, d: 0.5 }), 0.18); add(b, t + k * 0.25, osc(1.2, 2230, 2230, 'sin', { a: 0.002, d: 0.3 }), 0.08); } },
  crowd: (b, t, dur, v = 0.14) => add(b, t, fade(lfo(biquad(flat(dur), 'bp', 900, 0.5), 0.3, 0.4), 0.8, 0.8), v),
  cheer: (b, t) => { add(b, t, fade(biquad(flat(2.2), 'bp', 1100, 0.4), 0.2, 1.4), 0.4); for (let k = 0; k < 40; k++) add(b, t + rnd() * 2, biquad(noise(0.02, { a: 0.001, d: 0.01 }), 'bp', 2000, 1), 0.3); },
  pah: (b, t) => { add(b, t, biquad(noise(0.9, { a: 0.001, d: 0.25 }), 'lp', 3000), 1.0); add(b, t, osc(0.6, 90, 30, 'sin', { a: 0.001, d: 0.3 }), 1.0); add(b, t + 0.1, osc(1.6, 1250, 1250, 'sin', { a: 0.01, d: 0.8 }), 0.08); },
  heart: (b, t, n = 4) => { for (let k = 0; k < n; k++) { add(b, t + k, osc(0.12, 70, 50, 'sin', { a: 0.005, d: 0.06 }), 0.5); add(b, t + k + 0.22, osc(0.12, 60, 45, 'sin', { a: 0.005, d: 0.06 }), 0.35); } },
  tv: (b, t, dur) => { const a = biquad(flat(dur), 'bp', 700, 1.5); for (let i = 0; i < a.length; i++) a[i] *= 0.5 + 0.5 * Math.sin(i / SR * 2 * Math.PI * (4 + 3 * Math.sin(i / SR))); add(b, t, fade(a, 0.2, 0.2), 0.12); },
  tick: (b, t, dur) => { for (let tt = t; tt < t + dur; tt += 0.5) add(b, tt, biquad(noise(0.02, { a: 0.001, d: 0.005 }), 'hp', 3000), 0.25); },
  rain: (b, t, dur, v = 0.14) => { add(b, t, fade(biquad(flat(dur), 'hp', 1800), 0.6, 0.6), v); for (let tt = t; tt < t + dur; tt += 0.03 + rnd() * 0.08) add(b, tt, biquad(noise(0.01, { a: 0.001, d: 0.004 }), 'bp', 3000 + rnd() * 3000, 2), 0.12); },
  typing: (b, t, dur) => { for (let tt = t; tt < t + dur; tt += 0.06 + rnd() * 0.12) add(b, tt, biquad(noise(0.012, { a: 0.001, d: 0.004 }), 'bp', 2500 + rnd() * 1500, 1.5), 0.3); },
  fire: (b, t, dur) => { add(b, t, fade(biquad(flat(dur), 'lp', 600), 0.5, 0.5), 0.08); for (let tt = t; tt < t + dur; tt += 0.05 + rnd() * 0.2) add(b, tt, biquad(noise(0.015, { a: 0.001, d: 0.005 }), 'hp', 1500), 0.25); },
  club: (b, t, dur) => { const beat = 60 / 124; for (let tt = t; tt < t + dur; tt += beat) { add(b, tt, osc(0.2, 90, 40, 'sin', { a: 0.002, d: 0.1 }), 0.4); add(b, tt + beat / 2, biquad(noise(0.05, { a: 0.001, d: 0.02 }), 'hp', 6000), 0.06); } },
  clipper: (b, t, dur) => add(b, t, fade(lfo(biquad(osc(dur, 118, 118, 'saw', { a: 0.02, d: 1e9 }), 'bp', 900, 0.8), 13, 0.3), 0.05, 0.1), 0.25),
  bark: (b, t) => { for (let k = 0; k < 2; k++) { add(b, t + k * 0.22, biquad(noise(0.12, { a: 0.003, d: 0.05 }), 'bp', 850, 2), 0.6); add(b, t + k * 0.22, osc(0.12, 520, 330, 'saw', { a: 0.003, d: 0.05 }), 0.08); } },
  meow: (b, t) => add(b, t, biquad(osc(0.6, 650, 520, 'saw', { a: 0.1, d: 0.3 }, 0.05), 'bp', 1200, 2), 0.25),
  coin: (b, t) => { add(b, t, osc(0.08, 988, 988, 'sq', { a: 0.002, d: 0.06 }), 0.06); add(b, t + 0.08, osc(0.35, 1319, 1319, 'sq', { a: 0.002, d: 0.15 }), 0.06); },
  register: (b, t) => { add(b, t, biquad(noise(0.1, { a: 0.001, d: 0.04 }), 'hp', 3000), 0.3); add(b, t + 0.05, osc(0.8, 1800, 1800, 'sin', { a: 0.001, d: 0.3 }), 0.15); add(b, t + 0.05, osc(0.8, 2400, 2400, 'sin', { a: 0.001, d: 0.3 }), 0.1); },
  click: (b, t) => add(b, t, biquad(noise(0.015, { a: 0.001, d: 0.004 }), 'bp', 2000, 2), 0.35),
  sadtrombone: (b, t) => { const notes = [233, 220, 207, 196]; notes.forEach((f, k) => add(b, t + k * 0.45, biquad(osc(k === 3 ? 1.2 : 0.42, f, f, 'saw', { a: 0.03, d: k === 3 ? 0.8 : 0.3 }, k === 3 ? 0.04 : 0.01), 'lp', 1200), 0.18)); },
  fanfare: (b, t) => { [523, 659, 784].forEach((f, k) => add(b, t + k * 0.12, osc(0.2, f, f, 'sq', { a: 0.005, d: 0.12 }), 0.06)); [523, 659, 784, 1047].forEach(f => add(b, t + 0.4, osc(0.9, f, f, 'sq', { a: 0.01, d: 0.5 }), 0.05)); },
  tada: (b, t) => { [784, 1047].forEach((f, k) => add(b, t + k * 0.12, osc(0.8, f, f, 'tri', { a: 0.005, d: 0.4 }), 0.18)); },
  pop: (b, t) => add(b, t, osc(0.08, 400, 900, 'sin', { a: 0.001, d: 0.04 }), 0.3),
  snowstep: (b, t) => add(b, t, biquad(noise(0.1, { a: 0.01, d: 0.05 }), 'bp', 1500, 1), 0.2),
  door: (b, t) => { add(b, t, osc(0.3, 90, 60, 'sin', { a: 0.002, d: 0.1 }), 0.5); add(b, t, biquad(noise(0.1, { a: 0.001, d: 0.03 }), 'lp', 900), 0.4); },
  city: (b, t, dur) => add(b, t, fade(biquad(flat(dur), 'lp', 300), 0.8, 0.8), 0.1),
  sparkle: (b, t) => { for (let k = 0; k < 6; k++) add(b, t + k * 0.06, osc(0.3, 1800 + k * 300, 1800 + k * 300, 'sin', { a: 0.002, d: 0.1 }), 0.06); },
  splat: (b, t) => add(b, t, biquad(noise(0.15, { a: 0.002, d: 0.05 }), 'lp', 900), 0.5),
};

// ---------------------------------------------------------------- MUSICA
const SC = { maj: [0, 2, 4, 5, 7, 9, 11], min: [0, 2, 3, 5, 7, 8, 10] };
const MOODS = {
  happy: { bpm: 112, root: 60, sc: 'maj', prog: [0, 4, 5, 3], perc: 1 },
  folk: { bpm: 96, root: 57, sc: 'min', prog: [0, 3, 4, 0], perc: 0 },
  sad: { bpm: 70, root: 57, sc: 'min', prog: [0, 5, 3, 4], perc: 0 },
  travel: { bpm: 124, root: 62, sc: 'maj', prog: [0, 4, 5, 3], perc: 1 },
  sunny: { bpm: 120, root: 55, sc: 'maj', prog: [0, 3, 4, 0], perc: 1 },
  action: { bpm: 140, root: 52, sc: 'min', prog: [0, 5, 6, 4], perc: 2 },
  tense: { bpm: 150, root: 50, sc: 'min', prog: [0, 1, 0, 6], perc: 2 },
  calm: { bpm: 84, root: 53, sc: 'maj', prog: [0, 5, 3, 4], perc: 0 },
  night: { bpm: 100, root: 50, sc: 'min', prog: [0, 5, 3, 4], perc: 1 },
  silly: { bpm: 118, root: 60, sc: 'maj', prog: [0, 4, 5, 4], perc: 1 },
  epic: { bpm: 132, root: 52, sc: 'min', prog: [0, 0, 5, 6], perc: 2 },
  end: { bpm: 108, root: 60, sc: 'maj', prog: [3, 4, 2, 5, 3, 4, 0, 0], perc: 1 },
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function bellNote(dur, f, v) {
  return mix(gain(osc(dur, f, f, 'sin', { a: 0.003, d: 0.45 }), v), gain(osc(dur, f * 2, f * 2, 'sin', { a: 0.002, d: 0.2 }), v * 0.35),
    gain(osc(dur, f * 5.4, f * 5.4, 'sin', { a: 0.001, d: 0.05 }), v * 0.12));
}
function music(buf, t0, dur, mood, sd) {
  const M = MOODS[mood], sc = SC[M.sc];
  const beat = 60 / M.bpm, bar = beat * 4;
  seed = sd * 7919 + 1;
  const motif = [];
  for (let k = 0; k < 16; k++) motif.push(k % 2 && rnd() < 0.35 ? null : [0, 2, 4, 2, 1, 4, 5, 3][Math.floor(rnd() * 8)]);
  const nb = Math.ceil(dur / bar);
  const seg = new Float32Array(Math.ceil(dur * SR) + SR);
  for (let b = 0; b < nb; b++) {
    const deg = M.prog[b % M.prog.length];
    const tb = b * bar;
    const ch = [0, 2, 4].map(k => M.root + sc[(deg + k) % 7] + 12 * Math.floor((deg + k) / 7));
    for (let q = 0; q < 4; q++) add(seg, tb + q * beat, gain(osc(beat * 0.9, mtof(ch[0] - 24), mtof(ch[0] - 24), 'tri', { a: 0.005, d: 0.25 }), 1), 0.22);
    for (let s = 0; s < 8; s++) {
      const m = motif[(b % 2) * 8 + s];
      if (m === null || (b % 4 === 3 && s > 4)) continue;
      const idx = deg + m;
      const n = M.root + 12 + sc[idx % 7] + 12 * Math.floor(idx / 7);
      add(seg, tb + s * beat / 2, bellNote(0.9, mtof(n), 1), 0.16);
    }
    for (let s = 0; s < 4; s++) add(seg, tb + s * beat + beat / 2, bellNote(0.5, mtof(ch[(s + 1) % 3]), 1), 0.05);
    if (M.perc) for (let q = 0; q < 4; q++) {
      const tt = tb + q * beat;
      if (q % 2 === 0 || M.perc === 2) add(seg, tt, osc(0.15, 110, 45, 'sin', { a: 0.002, d: 0.07 }), 0.4);
      if (q % 2 === 1) add(seg, tt, biquad(noise(0.12, { a: 0.001, d: 0.04 }), 'bp', 1800, 0.8), 0.18);
      add(seg, tt + beat / 2, biquad(noise(0.04, { a: 0.001, d: 0.015 }), 'hp', 6000), 0.07);
    }
  }
  const out = fade(seg.subarray(0, Math.ceil(dur * SR)), 0.3, 0.4);
  add(buf, t0, out, 1);
}

function writeWav(path, buf) {
  const n = buf.length, data = Buffer.alloc(44 + n * 2);
  data.write('RIFF', 0); data.writeUInt32LE(36 + n * 2, 4); data.write('WAVE', 8); data.write('fmt ', 12);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36);
  data.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(Math.tanh(buf[i] * 1.1) * 0.92 * 32767))), 44 + i * 2);
  fs.writeFileSync(path, data);
}

module.exports = { SR, makeBuf, SFX, music, writeWav, add };

// ---------------------------------------------------------------- MUSICA CINEMATICA (v5)
const M2 = {
  warm: { bpm: 80, root: 57, sc: 'maj', prog: [0, 5, 3, 4], drums: 0 },
  melancholy: { bpm: 68, root: 57, sc: 'min', prog: [0, 5, 3, 6], drums: 0 },
  drive: { bpm: 104, root: 55, sc: 'min', prog: [0, 5, 6, 4], drums: 1 },
  tension: { bpm: 126, root: 52, sc: 'min', prog: [0, 0, 5, 6], drums: 2 },
  night: { bpm: 86, root: 50, sc: 'min', prog: [0, 5, 3, 4], drums: 1 },
  uplift: { bpm: 98, root: 60, sc: 'maj', prog: [0, 4, 5, 3], drums: 1 },
  triumph: { bpm: 118, root: 55, sc: 'maj', prog: [0, 4, 5, 3], drums: 2 },
  reflect: { bpm: 72, root: 53, sc: 'maj', prog: [0, 2, 3, 4], drums: 0 },
  quirky: { bpm: 96, root: 60, sc: 'maj', prog: [0, 3, 4, 4], drums: 1 },
};
function saw3(dur, f, v) {
  const n = Math.floor(dur * SR), o = new Float32Array(n);
  const det = [0.994, 1, 1.006];
  const ph = [0, 0.3, 0.6];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    for (let k = 0; k < 3; k++) { ph[k] += f * det[k] / SR; s += 2 * (ph[k] % 1) - 1; }
    const e = Math.min(1, t / 0.6, (dur - t) / 0.5);
    o[i] = s / 3 * e * v;
  }
  return o;
}
function piano(dur, f, v) {
  return mix(gain(osc(dur, f, f, 'sin', { a: 0.003, d: 0.9 }), v), gain(osc(dur, f * 2, f * 2, 'sin', { a: 0.002, d: 0.4 }), v * 0.3),
    gain(osc(dur, f * 3, f * 3, 'tri', { a: 0.002, d: 0.15 }), v * 0.12));
}
function music2(buf, t0, dur, mood, sd) {
  const M = M2[mood], sc = SC[M.sc], beat = 60 / M.bpm, bar = beat * 4;
  seed = sd * 104729 + 7;
  const seg = new Float32Array(Math.ceil(dur * SR) + SR * 2);
  const nb = Math.ceil(dur / bar);
  const arp = [0, 1, 2, 1, 2, 0, 2, 1].map(() => Math.floor(rnd() * 3));
  for (let b = 0; b < nb; b++) {
    const deg = M.prog[b % M.prog.length], tb = b * bar;
    const ch = [0, 2, 4].map(k => M.root + sc[(deg + k) % 7] + 12 * Math.floor((deg + k) / 7));
    let pad = new Float32Array(Math.floor((bar + 0.6) * SR));
    for (const n of ch) { const s = saw3(bar + 0.6, mtof(n - 12), 0.12); for (let i = 0; i < s.length; i++) pad[i] += s[i]; }
    pad = biquad(pad, 'lp', 900, 0.6);
    add(seg, tb, pad, 0.9);
    add(seg, tb, osc(bar, mtof(ch[0] - 24), mtof(ch[0] - 24), 'sin', { a: 0.05, d: 3 }), 0.28);
    for (let s = 0; s < 8; s++) {
      if ((b % 4 === 3 && s > 5) || (M.drums === 0 && s % 2)) continue;
      const n = ch[arp[s]] + (s >= 4 ? 12 : 0);
      add(seg, tb + s * beat / 2 + (s % 2 ? 0.02 : 0), piano(1.6, mtof(n), 1), 0.1);
    }
    if (M.drums) for (let q = 0; q < 4; q++) {
      const tt = tb + q * beat;
      if (q % 2 === 0) add(seg, tt, osc(0.25, 95, 42, 'sin', { a: 0.002, d: 0.12 }), 0.45);
      if (q % 2 === 1) add(seg, tt, biquad(noise(0.18, { a: 0.001, d: 0.06 }), 'bp', 1600, 0.6), 0.2);
      add(seg, tt + beat / 2 + 0.03, biquad(noise(0.05, { a: 0.001, d: 0.02 }), 'hp', 7000), 0.08);
      if (M.drums === 2) add(seg, tt + beat / 2, osc(0.2, 95, 42, 'sin', { a: 0.002, d: 0.1 }), 0.3);
    }
  }
  add(buf, t0, fade(seg.subarray(0, Math.ceil(dur * SR)), 0.8, 0.8), 1);
}
Object.assign(SFX, {
  riser: (b, t, dur = 2) => add(b, t, fade(biquad(osc(dur, 200, 1600, 'saw', { a: dur * 0.9, d: 0.1 }), 'lp', 2500), 0.1, 0.05), 0.08),
  impact: (b, t) => { add(b, t, osc(1.4, 70, 28, 'sin', { a: 0.002, d: 0.6 }), 1.0); add(b, t, biquad(noise(1.2, { a: 0.001, d: 0.35 }), 'lp', 1800), 0.7); },
  loss: (b, t) => { add(b, t, osc(1.5, 55, 40, 'sin', { a: 0.01, d: 0.7 }), 0.7); add(b, t, piano(2, 110, 1), 0.3); add(b, t, piano(2, 130.8, 1), 0.2); },
  win: (b, t) => { [523, 659, 784, 1047].forEach((f, k) => add(b, t + k * 0.09, piano(2, f, 1), 0.18)); },
  xray: (b, t, dur = 3) => add(b, t, fade(lfo(biquad(osc(dur, 100, 100, 'saw', { a: 0.1, d: 1e9 }), 'bp', 400, 3), 0.5, 0.5), 0.3, 0.4), 0.12),
  shutter: (b, t) => { add(b, t, biquad(noise(0.05, { a: 0.001, d: 0.02 }), 'bp', 3000, 1), 0.4); add(b, t + 0.06, biquad(noise(0.05, { a: 0.001, d: 0.02 }), 'bp', 2000, 1), 0.3); },
  swoosh: (b, t) => add(b, t, biquad(noise(0.5, { a: 0.2, d: 0.15 }), 'bp', 800, 0.7), 0.25),
});
module.exports.music2 = music2;
