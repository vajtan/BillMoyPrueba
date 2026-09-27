// HISTORIA Y AVENTURAS DE VAJTAN, EL SUPER NENE - v5 (ilustracion editorial / risografia)
// Fotogramas dibujados uno a uno con JavaScript (canvas). Audio sintetizado en JS.
// Uso: node main.js [--preview] [--scene Nombre]
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const K = require('./ink');
const X = require('./fig');
const AU = require('./audio');
const { W, H, Ink } = K;
const { LOOK, person } = X;

const FPS = 12;
const TARGET = 175;
let WPS = 5.0;                       // palabras por segundo al revelar
const HOLD = 0.95;
const OUT = path.join(__dirname, '..', 'vajtan_aventuras_editorial_9x16.mp4');
const PANEL_Y = 1150, PANEL_X = 60, PANEL_W = 880;
const FONT_CAP = '46px Serif', FONT_SAY = '48px SerifI', FONT_WHO = '30px SansB';
const measure = K.createCanvas(10, 10).getContext('2d');

// ================================================================ LINEAS
class Line {
  constructor(kind, who, text, start) {
    this.kind = kind; this.who = who; this.start = start;
    const font = kind === 'cap' ? FONT_CAP : FONT_SAY;
    const txt = kind === 'say' ? '— ' + text : text;
    this.lines = K.wrapText(measure, txt, font, PANEL_W - 70);
    this.words = [];
    let t = start + 0.3;
    this.lines.forEach((ln, li) => {
      measure.font = font;
      let x = 0;
      for (const w of ln.split(' ')) {
        this.words.push({ w, li, x, t });
        x += measure.measureText(w + ' ').width;
        t += 1 / WPS + (/[.!?…:]$/.test(w) ? 0.2 : /,$/.test(w) ? 0.08 : 0);
      }
    });
    this.end = t;
  }
  timeOf(word) { const k = this.words.find(o => o.w.toUpperCase().includes(word.toUpperCase())); return k ? k.t : this.end; }
}

function drawPanel(I, ln, t) {
  const font = ln.kind === 'cap' ? FONT_CAP : FONT_SAY;
  const lh = 62, top = ln.kind === 'say' ? 56 : 30;
  const h = top + ln.lines.length * lh + 30;
  const x = PANEL_X, y = PANEL_Y;
  const sv = I.solid; I.solid = true;
  I.rect('coral', x + 12, y + 12, PANEL_W, h, 1);
  I.rect('paper', x, y, PANEL_W, h, 1);
  I.solid = sv;
  const c = I.ctx;
  c.save(); c.strokeStyle = K.INK.navy; c.lineWidth = 3; c.strokeRect(x, y, PANEL_W, h); c.restore();
  if (ln.kind === 'say') I.text('coral', ln.who.toUpperCase(), x + 34, y + 50, FONT_WHO);
  for (const o of ln.words) {
    const a = Math.max(0, Math.min(1, (t - o.t) / 0.22));
    if (a <= 0) continue;
    c.save(); c.globalAlpha = a; c.font = font; c.fillStyle = K.INK.navy;
    c.fillText(o.w, x + 34 + o.x, y + top + 46 + o.li * lh + (1 - a) * 8);
    c.restore();
  }
}

// ================================================================ ESCENA BASE
class Scene {
  constructor(o) { Object.assign(this, { pre: 0.4, post: 0.4, minDur: 0, delays: {}, lines: [], amb: [], age: '', chapter: '', zoom: [1, 1.05], focus: [540, 700] }, o); }
  schedule(t0) {
    this.t0 = t0; this.L = [];
    let s = this.pre;
    this.lines.forEach(([kind, who, txt], i) => {
      s += this.delays[i] || 0;
      const ln = new Line(kind, who, txt, s);
      this.L.push(ln);
      s = ln.end + HOLD;
    });
    this.dur = Math.max(this.minDur, this.L.length ? this.L[this.L.length - 1].end + this.post + HOLD : 0);
    this.sfx = [];
    if (this.times) this.times();
  }
  idx(t) { let i = -1; this.L.forEach((ln, k) => { if (t >= ln.start) i = k; }); return i; }
  talking(t, who) { const i = this.idx(t); return i >= 0 && this.L[i].kind === 'say' && this.L[i].who === who && t < this.L[i].end; }
  render(ctx, t, fi) {
    const I = new Ink(ctx);
    I.jit = [Math.sin(fi * 1.7) * 0.8, Math.cos(fi * 1.3) * 0.8];
    ctx.drawImage(K.paper(), 0, 0);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, 1210); ctx.clip();
    const u = Math.min(1, t / Math.max(1, this.dur));
    const z = this.zoom[0] + (this.zoom[1] - this.zoom[0]) * (u * u * (3 - 2 * u));
    ctx.translate(this.focus[0], this.focus[1]); ctx.scale(z, z); ctx.translate(-this.focus[0], -this.focus[1]);
    if (this.shake) { const s = this.shake(t); ctx.translate(s[0], s[1]); }
    if (this.age) I.textStroke('navy', this.age, 1040, 760, 'bold 560px SerifB', 3, 'right', 0.25);
    this.draw(I, t);
    ctx.restore();
    I.rect('navy', 0, 1210, W, 4, 1);
    const pg = String(SCENES.indexOf(this) + 1).padStart(2, '0');
    I.text('navy', 'VAJTAN  ·  1995 — 2026', 60, 1650, '26px SansB', 'left', 0.7);
    I.text('navy', pg, 1020, 1650, 'italic 40px SerifI', 'right', 0.7);
    I.rect('navy', 60, 1670, 960, 2, 0.4);
    if (this.chapter) {
      I.text('navy', this.chapter, 60, 236, '28px SansB');
      I.rect('coral', 60, 250, 90, 5, 1);
    }
    const i = this.idx(t);
    if (i >= 0 && (!this.hidePanel || !this.hidePanel(t))) drawPanel(I, this.L[i], t);
    if (this.over) this.over(I, t);
    // grano de impresion
    const g = K.grain()[fi % 3];
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(g, 0, 0); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.28; ctx.drawImage(g, 0, 0); ctx.restore();
  }
}
function who(sc, name, I, x, y, lk, pose, t, o = {}) {
  o.talk = sc.talking(t, name);
  return person(I, x, y, lk, pose, t, o);
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (u) => u * u * (3 - 2 * u);
function ground(I, y, ink, a = 1) { I.rect(ink, 0, y, W, H - y, a); }
function wash(I, ink, a, y0 = 0, y1 = H) { I.rect(ink, 0, y0, W, y1 - y0, a); }
function ghosts(I, fn, t, n, dt, alpha = 0.18) { for (let k = n; k >= 1; k--) fn(t - k * dt, alpha * (1 - k / (n + 1))); }

const SCENES = [];

// 1 · PORTADA
SCENES.push(new Scene({
  name: 'Title', music: 'reflect', minDur: 7, amb: [['wind']], zoom: [1.08, 1.0], focus: [540, 900],
  times() { this.sfx = [[0.2, 'riser', 3], [3.2, 'impact']]; },
  draw(I, t) {
    wash(I, 'mustard', 0.55, 0, 1250);
    I.gradBands('coral', 0, 250, W, 800, 0.02, 0.55, 9, 12);
    X.sun(I, 540, 880, 230, 'coral', 0.9);
    X.mountains(I, 1030, 5, 'teal', 0.55, 3);
    X.mountains(I, 1110, 4, 'navy', 0.65, 8);
    X.hills(I, 1180, 18, 'navy', 1, 2);
    X.birds(I, t, 200, 620, 6);
    person(I, 540, 1200, LOOK.vaj, 'stand', t, { sil: 'navy', scale: 1.05 });
  },
  over(I, t) {
    const a = (t0) => clamp((t - t0) / 0.8, 0, 1);
    I.text('navy', 'HISTORIA Y AVENTURAS DE', 540, 330, '36px SansB', 'center', a(0.6));
    I.text('navy', 'VAJTAN', 540, 520, 'bold 210px SerifB', 'center', a(1.4));
    I.text('coral', 'el súper nene', 540, 610, 'italic 76px SerifI', 'center', a(2.4));
    I.text('navy', 'Una historia real · 1995 — 2026', 540, 1420, '38px Serif', 'center', a(3.4));
  },
}));

// 2 · UCRANIA
SCENES.push(new Scene({
  name: 'Ukraine', music: 'warm', amb: [['birds'], ['wind']], age: '5', chapter: 'I — UCRANIA',
  lines: [['cap', '', 'Ucrania. Una casa sencilla y una familia de cuatro: papá, mamá, mi hermana —dos años menor— y yo.'],
    ['say', 'Papá', '¿Sabéis qué? Habrá que irnos.'],
    ['say', 'Mamá', '¿Irnos? ¿A dónde?'],
    ['say', 'Papá', 'A España. Yo iré primero, y luego os traeré a los tres.']],
  draw(I, t) {
    wash(I, 'mustard', 0.5, 0, 900);
    I.gradBands('coral', 0, 300, W, 600, 0.02, 0.45, 8, 12);
    X.sun(I, 760, 760, 150, 'coral', 0.85);
    X.hills(I, 860, 25, 'teal', 0.5, 1);
    ground(I, 900, 'mustard', 0.9);
    I.halftone('coral', [[0, 900], [W, 900], [W, H], [0, H]], 0.18, 0.8, true, 12);
    X.house(I, 70, 960, 300, 200, 'paper', 1, 'navy', 0.9);
    for (const [sx, sh] of [[900, 220], [980, 260], [1040, 200]]) {
      I.stroke('navy', [[sx, 1180], [sx + 6, 1180 - sh]], 10, 1);
      for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; I.circle('mustard', sx + 6 + Math.cos(a) * 34, 1180 - sh + Math.sin(a) * 34, 16, 1); }
      I.circle('navy', sx + 6, 1180 - sh, 24, 1);
    }
    const i = this.idx(t);
    who(this, 'Mamá', I, 430, 1180, LOOK.mama, 'stand', t);
    who(this, 'Papá', I, 600, 1180, LOOK.papa, i === 1 || i === 3 ? 'point' : 'stand', t);
    person(I, 750, 1185, LOOK.kid, 'stand', t);
    person(I, 850, 1190, LOOK.sis, 'stand', t);
  },
}));

// 3 · DESPEDIDA
SCENES.push(new Scene({
  name: 'Farewell', music: 'melancholy', amb: [['wind']], age: '5', chapter: 'II — LA DESPEDIDA',
  lines: [['cap', '', 'Tenía cinco años, casi seis, cuando papá se marchó el primero.'],
    ['say', 'Papá', 'Portaos bien. Os quiero.'],
    ['cap', '', 'En España trabajó sin descanso para poder traernos.']],
  times() { this.leave = this.L[1].end + 0.4; this.sfx = [[0, 'engine', this.leave + 3, 0.1], [this.leave, 'horn'], [this.leave + 0.3, 'swoosh']]; },
  draw(I, t) {
    wash(I, 'navy', 0.75, 0, 1000);
    I.gradBands('teal', 0, 500, W, 500, 0.05, 0.4, 6, 10);
    I.circle('paper', 820, 330, 70, 0.95);
    for (const [bx, bw, bh, s] of [[20, 230, 520, 1], [280, 200, 600, 2], [510, 250, 480, 3], [790, 250, 560, 4]]) X.building(I, bx, 1000, bw, bh, 'navy', 0.55, 'mustard', s, 0.3);
    ground(I, 1000, 'paper', 1);
    I.halftone('teal', [[0, 1000], [W, 1000], [W, 1200], [0, 1200]], 0.2, 0.8, false, 10);
    const i = this.idx(t);
    const bx = 330 + Math.pow(Math.max(0, t - this.leave), 2) * 140;
    if (bx < W + 50) {
      I.solid = true;
      X.busSide(I, bx, 1180, 640, t, true);
      I.solid = false;
      X.lightCone(I, bx + 640, 1100, 500, 0, 0.5);
      I.poly('paper', [[bx + 640, 1080], [bx + 1100, 1020], [bx + 1100, 1190], [bx + 640, 1110]], 0.35);
      if (i >= 1) person(I, bx + 580, 1010, LOOK.papaW, 'wave', t, { scale: 0.55, sil: 'navy' });
    }
    if (i === 0) who(this, 'Papá', I, 880, 1180, LOOK.papaW, 'hug', t);
    const wave = t > this.leave - 0.3;
    person(I, 200, 1180, LOOK.mamaW, wave ? 'wave' : 'stand', t, { sil: 'navy' });
    person(I, 310, 1185, LOOK.kid5, wave ? 'wave' : 'stand', t + 0.3, { sil: 'navy' });
    person(I, 110, 1188, LOOK.sis3, 'stand', t, { sil: 'navy' });
    X.snow(I, t, 110);
    if (i === 2) {
      const u = clamp((t - this.L[2].start) / 3, 0, 1);
      const yr = 2000 + Math.floor(u * 3.2);
      I.text('coral', String(Math.min(yr, 2003)), 540, 620, 'bold 240px SerifB', 'center', 0.9);
    }
  },
}));

// 4 · VIAJE
SCENES.push(new Scene({
  name: 'Journey', music: 'drive', amb: [['engine', 0.08]], age: '8', chapter: 'III — EL VIAJE', post: 1,
  lines: [['cap', '', 'Con ocho años llegó nuestro turno: mamá, mi hermana y yo.'],
    ['say', 'Hermana', '¿Falta mucho?'],
    ['say', 'Vajtan', 'Shhh… estoy dibujando.']],
  draw(I, t) {
    wash(I, 'navy', 0.85, 0, 1200);
    const r = K.rng(4);
    for (let k = 0; k < 70; k++) I.circle('paper', r() * W, r() * 700, 1.5 + r() * 2.5, 0.5 + 0.5 * Math.sin(t * 2 + k));
    I.circle('paper', 200, 300, 60, 0.9);
    const off1 = (t * 30) % 540, off2 = (t * 110) % 360;
    I.ctx.save(); I.ctx.translate(-off1, 0);
    for (let k = 0; k < 3; k++) { I.ctx.save(); I.ctx.translate(k * 540, 0); X.mountains(I, 900, 2, 'teal', 0.5, 5); I.ctx.restore(); }
    I.ctx.restore();
    I.ctx.save(); I.ctx.translate(-off2, 0);
    for (let k = 0; k < 5; k++) for (let j = 0; j < 4; j++) { const tx = k * 360 + j * 90; I.poly('navy', [[tx, 1000], [tx + 40, 880 - (j % 2) * 40], [tx + 80, 1000]], 0.9); }
    I.ctx.restore();
    I.rect('black', 0, 1000, W, 200, 0.85);
    for (let k = 0; k < 8; k++) I.rect('mustard', ((k * 180 - t * 400) % 1440 + 1440) % 1440 - 180, 1100, 90, 10, 0.9);
    I.solid = true;
    X.busSide(I, 220, 1090 + (Math.floor(t * 8) % 2), 640, t, true, 'navy', 'paper');
    I.solid = false;
    person(I, 330, 950, LOOK.mama, 'stand', t, { scale: 0.42, sil: 'navy' });
    person(I, 440, 950, LOOK.kid, 'draw', t, { scale: 0.55, sil: 'navy' });
    person(I, 550, 950, LOOK.sis, 'stand', t, { scale: 0.55, sil: 'navy' });
    const u = clamp(t / (this.dur - 0.5), 0, 1);
    I.stroke('paper', [[120, 480], [960, 480]], 3, 0.5);
    I.stroke('coral', [[120, 480], [120 + 840 * u, 480]], 6, 1);
    I.circle('coral', 120 + 840 * u, 480, 12, 1);
    I.text('paper', 'UCRANIA', 120, 450, '26px SansB', 'left', 0.9);
    I.text('paper', 'ESPAÑA', 960, 450, '26px SansB', 'right', 0.9);
  },
}));

// 5 · TOMELLOSO
SCENES.push(new Scene({
  name: 'Tomelloso', music: 'uplift', amb: [['birds']], age: '8', chapter: 'IV — TOMELLOSO',
  lines: [['cap', '', 'Tomelloso. Papá nos esperaba. La familia, por fin, junta otra vez.'],
    ['say', 'Papá', 'Bienvenidos a casa.'],
    ['cap', '', 'Yo era un niño un poco raro: siempre dibujando. Un chaval de artes.']],
  draw(I, t) {
    wash(I, 'teal', 0.25, 0, 900);
    I.gradBands('teal', 0, 0, W, 700, 0.35, 0.02, 7, 12);
    I.circle('mustard', 850, 330, 110, 0.6); I.circle('paper', 850, 330, 80, 1);
    X.chimney(I, 180, 900, 520, t); X.chimney(I, 960, 900, 440, t + 1);
    I.poly('mustard', [[470, 900], [610, 900], [600, 460], [480, 460]], 0.9);
    I.poly('navy', [[460, 470], [540, 360], [620, 470]], 0.85);
    I.rect('navy', 515, 520, 50, 70, 0.8);
    X.windmill(I, 760, 870, t, 0.45, 'navy', 0.5);
    for (const [hx, hw, hh] of [[-20, 300, 240], [300, 260, 200], [640, 300, 250]]) X.house(I, hx, 1060, hw, hh, 'paper', 1, 'coral', 0.9, false);
    ground(I, 1060, 'mustard', 0.4);
    I.halftone('navy', [[0, 1060], [W, 1060], [W, 1200], [0, 1200]], 0.12, 0.8, false, 12);
    const i = this.idx(t);
    if (i < 2) {
      const a = ease(clamp(t / 2.4, 0, 1));
      who(this, 'Papá', I, 430, 1190, LOOK.papa, a >= 1 ? 'hug' : 'wave', t);
      person(I, 900 - a * 340, 1195, LOOK.kid, a < 1 ? 'walk' : 'hug', t);
      person(I, 1020 - a * 240, 1190, LOOK.mama, a < 1 ? 'walk' : 'stand', t);
      person(I, 1110 - a * 230, 1198, LOOK.sis, a < 1 ? 'walk' : 'stand', t);
    } else {
      const u = t - this.L[2].start;
      I.rect('navy', 150, 1110, 360, 30, 0.9);
      person(I, 330, 1110, LOOK.kid, 'draw', t);
      for (let k = 0; k < 5; k++) {
        const a = u - k * 0.7;
        if (a <= 0) continue;
        const px = 420 + k * 110 + Math.sin(a * 2 + k) * 20, py = 1000 - a * 120;
        if (py < 350) continue;
        I.ctx.save(); I.ctx.translate(px, py); I.ctx.rotate(Math.sin(a + k) * 0.4);
        I.solid = true; I.rect('paper', -45, -35, 90, 70, 1); I.solid = false;
        I.stroke('navy', [[-30, 10], [-10, -15], [10, 5], [30, -20]], 4, 0.8);
        I.circle('coral', 20, -18, 8, 0.8);
        I.ctx.restore();
      }
    }
  },
}));

// 6 · KICKBOXING
SCENES.push(new Scene({
  name: 'KickGym', music: 'drive', age: '8½', chapter: 'V — GUARDIA ARRIBA',
  lines: [['cap', '', 'Con ocho años y medio, papá me apuntó a kickboxing. Boxeo no había.'],
    ['say', 'Papá', '¡Guardia arriba!'],
    ['say', 'Vajtan', '¡Pam! ¡Pam!']],
  times() { this.hits = []; for (let s = this.L[2].start + 0.2; s < this.dur - 0.3; s += 0.6) this.hits.push(s); this.sfx = this.hits.map(h => [h + 0.04, 'punch']); },
  draw(I, t) {
    wash(I, 'mustard', 0.45, 0, 1000);
    I.rect('paper', 560, 250, 400, 460, 1);
    I.rect('navy', 752, 250, 16, 460, 0.8); I.rect('navy', 560, 470, 400, 16, 0.8);
    for (let k = 0; k < 3; k++) I.poly('paper', [[560 + k * 130, 250], [640 + k * 130, 250], [300 + k * 130, 1200], [160 + k * 130, 1200]], 0.35);
    ground(I, 1000, 'teal', 0.8);
    for (let k = 0; k < 7; k++) I.rect('navy', k * 160, 1000, 4, 200, 0.4);
    let last = null; for (const h of this.hits || []) if (h <= t) last = h;
    const sw = last !== null ? Math.exp(-(t - last) * 2.2) * Math.sin((t - last) * 8) * 0.12 : 0;
    const c = I.ctx; c.save(); c.translate(820, 200); c.rotate(-sw); c.translate(-820, -200);
    I.stroke('navy', [[820, 200], [820, 560]], 5, 0.9);
    I.solid = true; I.rect('coral', 760, 560, 120, 320, 1); I.rect('navy', 760, 600, 120, 14, 0.8); I.rect('navy', 760, 830, 120, 14, 0.8); I.solid = false;
    I.halftone('navy', [[820, 560], [880, 560], [880, 880], [820, 880]], 0.3, 0.9, false, 7);
    c.restore();
    let pose = t > this.L[1].start ? 'guard' : 'stand';
    if (last !== null && t - last < 0.28) pose = this.hits.indexOf(last) % 2 ? 'punch' : 'kick';
    person(I, 620, 1180, LOOK.kidKick, pose, t);
    if (last !== null && t - last < 0.2) for (let k = 0; k < 5; k++) I.stroke('paper', [[700, 760 + k * 22], [760, 760 + k * 22]], 5, 1);
    who(this, 'Papá', I, 300, 1180, LOOK.papa, t < this.L[1].start ? 'cross' : 'guard', t);
  },
}));

// 7 · PARKOUR 12
SCENES.push(new Scene({
  name: 'Parkour12', music: 'tension', age: '12', chapter: 'VI — PARKOUR', minDur: 9,
  lines: [['cap', '', 'A los doce descubrí el parkour. Piripi, piripa… pa, pam, pam, pim.']],
  times() { this.J = [0.9, 2.2, 3.5, 4.8, 6.1, 7.4]; this.sfx = this.J.map(j => [j, 'swoosh']); },
  draw(I, t) {
    wash(I, 'coral', 0.35, 0, 1200);
    I.gradBands('mustard', 0, 200, W, 700, 0.05, 0.6, 8, 12);
    X.sun(I, 540, 720, 200, 'coral', 0.8);
    const roofs = [[-60, 920, 330], [330, 860, 260], [650, 940, 470]];
    for (const [rx, ry, rw] of roofs) { I.rect('navy', rx, ry, rw, H - ry, 0.95); I.poly('navy', [[rx - 10, ry], [rx + rw / 2, ry - 50], [rx + rw + 10, ry]], 0.95); }
    for (const [rx, ry, rw] of roofs) for (let wy = ry + 60; wy < 1150; wy += 110) I.rect('mustard', rx + rw / 2 - 30, wy, 60, 60, 0.8);
    const spots = [[160, 920], [460, 860], [800, 940], [460, 860], [160, 920], [460, 860], [800, 940]];
    const pos = (tt) => {
      let k = 0; while (k < this.J.length - 1 && tt > this.J[k + 1]) k++;
      if (tt < this.J[0]) return { x: spots[0][0], y: spots[0][1], pose: 'stand', rot: 0 };
      const u = (tt - this.J[k]) / 0.9;
      if (u < 1) { const a = spots[k], b = spots[k + 1]; return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u - Math.sin(u * Math.PI) * 300, pose: 'tuck', rot: (k % 2 ? -1 : 1) * u * Math.PI * 2 }; }
      return { x: spots[k + 1][0], y: spots[k + 1][1], pose: 'run', rot: 0 };
    };
    ghosts(I, (tt, a) => { const p = pos(tt); person(I, p.x, p.y, LOOK.teen, p.pose, tt, { sil: 'navy', alpha: a, rot: p.rot, scale: 0.8 }); }, t, 5, 0.07, 0.5);
    const p = pos(t);
    person(I, p.x, p.y, LOOK.teen, p.pose, t, { sil: 'black', rot: p.rot, scale: 0.8 });
    const words = ['piripi', 'piripa', 'pa', 'pam', 'pam', 'pim'];
    words.forEach((w, q) => { if (t > this.J[q]) I.text('paper', w, 120 + (q % 3) * 300, 330 + Math.floor(q / 3) * 110, 'italic 72px SerifI', 'left', clamp((t - this.J[q]) * 3, 0, 1)); });
  },
}));

// 8 · ACCIDENTE
SCENES.push(new Scene({
  name: 'Accident', music: 'tension', age: '16', chapter: 'VII — EL MORTAL', delays: { 1: 2.6 },
  lines: [['cap', '', 'Dieciséis años, casi diecisiete. Un mortal en un gimnasio…'],
    ['cap', '', 'Me rompí el cuello. Por suerte, caí sobre un tatami.']],
  times() { this.tr = this.L[0].end + 0.2; this.tj = this.tr + 0.8; this.ti = this.tj + 0.9; this.sfx = [[this.tj - 0.6, 'riser', 1.5], [this.ti, 'impact'], [this.ti + 0.9, 'xray', 5], [this.ti + 1, 'heart', 6]]; },
  shake(t) { const u = t - this.ti; if (u >= 0 && u < 0.5) { const k = (0.5 - u) * 50, r = K.rng(Math.floor(t * 60)); return [(r() - .5) * k, (r() - .5) * k]; } return [0, 0]; },
  draw(I, t) {
    if (t > this.ti + 0.8) {                       // radiografia
      wash(I, 'navy', 0.95, 0, 1200);
      I.halftone('teal', [[0, 0], [W, 0], [W, 1200], [0, 1200]], 0.12, 0.8, false, 10);
      I.circle('paper', 540, 360, 150, 0.3, 180);
      for (let k = 0; k < 8; k++) {
        const y = 560 + k * 70;
        I.poly('paper', [[470, y], [610, y], [630, y + 20], [610, y + 50], [470, y + 50], [450, y + 20]], 0.75);
        I.poly('paper', [[420, y + 15], [470, y + 10], [470, y + 35], [420, y + 30]], 0.5);
        I.poly('paper', [[610, y + 10], [660, y + 15], [660, y + 30], [610, y + 35]], 0.5);
      }
      const pulse = 0.6 + 0.4 * Math.sin(t * 8);
      I.stroke('coral', [[455, 700], [510, 720], [540, 700], [600, 730], [640, 712]], 7, pulse);
      I.circle('coral', 545, 715, 70, 0.25 * pulse);
      I.text('paper', 'C5 — C6', 700, 720, '32px SansB', 'left', 0.8);
      return;
    }
    wash(I, 'teal', 0.35, 0, 1000);
    for (let x = 60; x < 460; x += 50) I.rect('navy', x, 300, 10, 620, 0.6);
    for (let y = 330; y < 920; y += 70) I.rect('navy', 60, y, 400, 8, 0.5);
    ground(I, 1000, 'navy', 0.3);
    I.rect('teal', 40, 1040, 1000, 150, 0.9);
    const L = LOOK.teen;
    const pos = (tt) => {
      if (tt < this.tr) return [200, 1150, 'stand', 0];
      if (tt < this.tj) return [200 + (tt - this.tr) / 0.8 * 240, 1150, 'run', 0];
      if (tt < this.ti) { const u = (tt - this.tj) / 0.9; return [440 + u * 220, 1150 - Math.sin(u * Math.PI * 0.85) * 360, 'tuck', u * Math.PI]; }
      return [660, 1160, 'stand', Math.PI];
    };
    if (t > this.tj && t < this.ti) ghosts(I, (tt, a) => { const p = pos(tt); person(I, p[0], p[1], L, p[2], tt, { rot: p[3], sil: 'navy', alpha: a }); }, t, 5, 0.06, 0.45);
    const p = pos(t);
    person(I, p[0], p[1], L, p[2], t, { rot: p[3] });
    if (t >= this.ti) {
      const u = t - this.ti;
      wash(I, 'coral', 0.7 * Math.max(0, 1 - u * 1.5));
      const r = K.rng(5);
      for (let k = 0; k < 14; k++) { const a = r() * 6.28; I.stroke('paper', [[660 + Math.cos(a) * 60, 1060 + Math.sin(a) * 60], [660 + Math.cos(a) * 400, 1060 + Math.sin(a) * 400]], 6, 1); }
      I.text('navy', '¡PAH!', 540, 700, 'bold 230px SerifB', 'center', 1);
    }
  },
}));

// 9 · APARATO
SCENES.push(new Scene({
  name: 'Halo', music: 'melancholy', amb: [['tv'], ['tick'], ['rain', 0.06]], age: '16', chapter: 'VIII — TRES MESES',
  lines: [['cap', '', 'Tres meses con un aparato en el cuello.'],
    ['cap', '', 'Ahí cambió mi forma de ver el mundo. Sobre todo, la política mundial.']],
  draw(I, t) {
    wash(I, 'navy', 0.8, 0, 1250);
    I.rect('paper', 90, 300, 300, 340, 0.2);
    I.circle('paper', 280, 400, 44, 0.8);
    X.rain(I, t, 40, 3, 'paper', 0.3);
    I.rect('navy', 232, 300, 12, 340, 0.9); I.rect('navy', 90, 460, 300, 12, 0.9);
    I.poly('teal', [[700, 620], [990, 620], [1080, 1250], [300, 1250]], 0.35);
    I.solid = true;
    I.rect('black', 650, 440, 380, 250, 1); I.rect('teal', 670, 460, 340, 210, 1);
    I.rect('navy', 700, 690, 280, 180, 1);
    I.rect('navy', 60, 1010, 520, 140, 1); I.rect('paper', 60, 980, 150, 60, 1);
    I.solid = false;
    const cont = [[[700, 520], [760, 500], [790, 540], [750, 590], [710, 570]], [[820, 500], [900, 490], [960, 540], [920, 600], [840, 580]], [[880, 610], [930, 620], [920, 650]]];
    for (const c of cont) I.poly('paper', c.map(([x, y]) => [x + Math.sin(t * 0.5) * 6, y]), 0.8);
    for (let k = 0; k < 4; k++) I.circle('coral', 730 + k * 70, 530 + (k % 2) * 50, 7 + 4 * Math.sin(t * 4 + k), 0.9);
    person(I, 330, 1010, LOOK.teenHalo, 'sit', t);
    const day = Math.min(90, 1 + Math.floor(t / this.dur * 95));
    I.text('paper', 'DÍA ' + day + ' / 90', 90, 900, 'bold 44px SansB', 'left', 0.9);
  },
}));

// 10 · VUELTA AL PARKOUR
SCENES.push(new Scene({
  name: 'BackParkour', music: 'uplift', amb: [['birds']], age: '17', chapter: 'IX — DE VUELTA', minDur: 8,
  lines: [['cap', '', 'Ocho meses después volví al parkour. Y salté mucho. Muchísimo.'],
    ['cap', '', 'El kickboxing seguía ahí, en modo light.']],
  times() { this.sfx = []; for (let s = 0.7; s < this.dur - 0.3; s += 0.8) this.sfx.push([s, 'swoosh']); },
  draw(I, t) {
    wash(I, 'teal', 0.3, 0, 1000);
    I.gradBands('teal', 0, 0, W, 600, 0.4, 0.02, 6, 12);
    for (const [tx, tr] of [[120, 130], [330, 100], [900, 150]]) { I.rect('navy', tx - 12, 820, 24, 200, 0.9); I.circle('navy', tx, 780, tr, 0.85, tr * 0.8); }
    ground(I, 1000, 'teal', 0.55);
    const blocks = [[170, 1040], [470, 980], [770, 1040]];
    for (const [bx, by] of blocks) { I.solid = true; I.rect('paper', bx, by, 200, 1200 - by, 1); I.solid = false; I.halftone('navy', [[bx + 120, by], [bx + 200, by], [bx + 200, 1200], [bx + 120, 1200]], 0.3, 0.9, false, 7); }
    const seq = [0, 1, 2, 1];
    const pos = (tt) => {
      const ph = Math.max(0, tt - 0.7) / 0.8, k = Math.floor(ph), u = ph - k;
      const a = blocks[seq[k % 4]], b = blocks[seq[(k + 1) % 4]];
      return [a[0] + 100 + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - Math.sin(u * Math.PI) * 280, k % 3 === 2 ? u * 6.28 : 0];
    };
    ghosts(I, (tt, al) => { const p = pos(tt); person(I, p[0], p[1], LOOK.teen, 'tuck', tt, { sil: 'navy', alpha: al, rot: p[2], scale: 0.75 }); }, t, 4, 0.07, 0.4);
    const p = pos(t);
    person(I, p[0], p[1], LOOK.teen, 'tuck', t, { rot: p[2], scale: 0.75 });
    const n = Math.floor(Math.pow(Math.max(0, t - 0.7), 2.3) * 14);
    I.text('navy', String(n).padStart(4, '0'), 1000, 330, 'bold 150px SerifB', 'right', 0.85);
    I.text('navy', 'SALTOS', 1000, 380, '30px SansB', 'right', 0.85);
    if (this.idx(t) === 1) {
      I.stroke('navy', [[160, 360], [160, 420]], 4, 1);
      I.solid = true; I.circle('coral', 130, 470, 44, 1); I.circle('coral', 200, 470, 44, 1); I.rect('mustard', 100, 540, 150, 56, 1); I.solid = false;
      I.text('navy', 'light', 175, 582, 'italic 40px SerifI', 'center', 1);
    }
  },
}));

// 11 · ARTE
SCENES.push(new Scene({
  name: 'Art', music: 'reflect', age: '19', chapter: 'X — ARTES',
  lines: [['cap', '', 'De los diecisiete a los diecinueve estudié artes… pero mi cabeza estaba en el parkour.'],
    ['cap', '', 'Con diecinueve o veinte dejé el kickboxing. Parkour a tope, y algún trabajo de diseño.']],
  draw(I, t) {
    wash(I, 'mustard', 0.4, 0, 1050);
    I.rect('teal', 70, 280, 380, 420, 0.3);
    for (let k = 0; k < 5; k++) I.rect('navy', 80 + k * 75, 560 - (k % 3) * 60, 60, 140 + (k % 3) * 60, 0.5);
    I.rect('navy', 250, 280, 10, 420, 0.9);
    I.poly('paper', [[70, 280], [450, 280], [720, 1200], [240, 1200]], 0.25);
    ground(I, 1050, 'navy', 0.25);
    I.stroke('navy', [[640, 1180], [720, 600]], 14, 1); I.stroke('navy', [[920, 1180], [840, 600]], 14, 1);
    I.solid = true; I.rect('paper', 620, 540, 320, 380, 1); I.solid = false;
    const pr = clamp(t / 5, 0, 1);
    I.rect('coral', 640, 560, 280 * pr, 200, 0.5);
    if (pr > 0.4) X.sun(I, 780, 700, 60 * Math.min(1, (pr - 0.4) * 3), 'mustard', 0.9);
    if (pr > 0.6) { const u = ((t * 0.8) % 1); person(I, 660 + u * 240, 890 - Math.sin(u * Math.PI) * 100, LOOK.teen, 'tuck', t, { sil: 'navy', scale: 0.25, rot: u * 6.28 }); }
    person(I, 460, 1180, LOOK.teen, 'draw', t);
    if (this.idx(t) === 1) {
      const u = t - this.L[1].start;
      I.text('navy', 'Kickboxing', 90, 820, 'italic 56px SerifI', 'left', 1);
      if (u > 0.5) I.stroke('coral', [[80, 802], [360, 802]], 7, 1);
      if (u > 1.5) I.text('navy', 'Parkour', 90, 890, 'bold 56px SerifB', 'left', 1);
      if (u > 2.5) I.text('coral', 'Diseño +1', 90, 960, 'italic 56px SerifI', 'left', 1);
    }
  },
}));

// 12 · COMPETIR / PANDEMIA
SCENES.push(new Scene({
  name: 'Pandemic', music: 'night', age: '23', chapter: 'XI — COMPETIR',
  lines: [['cap', '', 'Parkour hasta los veintidós. A los veintitrés volví al kickboxing, esta vez para competir.'],
    ['cap', '', 'Y entonces llegó la pandemia. Todo se cerró.']],
  times() { const s1 = this.L[1].start; this.sfx = [[s1, 'rain', this.dur - s1, 0.16], [s1 + 0.2, 'shutter']]; for (let s = 0.8; s < s1; s += 0.7) this.sfx.push([s, 'punch']); },
  draw(I, t) {
    const i = this.idx(t);
    if (i < 1) {
      wash(I, 'mustard', 0.4, 0, 1000);
      I.poly('paper', [[600, 0], [760, 0], [1000, 1200], [520, 1200]], 0.3);
      ground(I, 1000, 'navy', 0.4);
      I.stroke('navy', [[800, 200], [800, 520]], 5, 0.9);
      I.solid = true; I.rect('coral', 740, 520, 120, 320, 1); I.solid = false;
      person(I, 560, 1180, LOOK.youngFight, Math.floor(t * 1.4) % 2 ? 'punch' : 'guard', t);
    } else {
      wash(I, 'navy', 0.9, 0, 1250);
      I.solid = true; I.rect('navy', 330, 380, 620, 700, 1); I.rect('teal', 400, 600, 480, 480, 1); I.solid = false;
      for (let y = 620; y < 1080; y += 30) I.rect('navy', 400, y, 480, 5, 0.6);
      I.text('paper', 'GIMNASIO', 640, 480, 'bold 60px SansB', 'center', 0.8);
      I.solid = true; I.rect('coral', 480, 780, 320, 90, 1); I.solid = false;
      I.text('paper', 'CERRADO', 640, 842, 'bold 54px SansB', 'center', 1);
      I.stroke('paper', [[160, 1180], [160, 470], [220, 450]], 10, 0.6);
      I.poly('paper', [[210, 460], [240, 460], [420, 1180], [20, 1180]], 0.18);
      person(I, 200, 1180, LOOK.young, Math.floor(t * 1.2) % 2 ? 'punch' : 'guard', t, { sil: 'black' });
      X.rain(I, t, 140, 3, 'paper', 0.35);
    }
  },
}));

// 13 · NEGOCIO
SCENES.push(new Scene({
  name: 'Business', music: 'tension', amb: [['tick']], age: '24', chapter: 'XII — QUEMADO',
  lines: [['cap', '', 'Monté un negocio de diseño… y acabé completamente quemado.'],
    ['say', 'Vajtan', 'Se acabó. Lo dejo.']],
  times() { const e = this.L[1].start; this.sfx = [[0.3, 'typing', e - 0.3], [1.2, 'fire', e - 1.2], [e + 0.8, 'door']]; },
  draw(I, t) {
    wash(I, 'navy', 0.85, 0, 1250);
    I.rect('teal', 80, 280, 360, 320, 0.3);
    const r = K.rng(3); for (let k = 0; k < 40; k++) I.rect('mustard', 90 + r() * 340, 420 + r() * 170, 8, 10, 0.8);
    I.circle('paper', 860, 380, 90, 0.9);
    const a = t * 5;
    I.stroke('navy', [[860, 380], [860 + Math.cos(a) * 70, 380 + Math.sin(a) * 70]], 6, 1);
    I.stroke('navy', [[860, 380], [860 + Math.cos(a / 12) * 45, 380 + Math.sin(a / 12) * 45]], 9, 1);
    const i = this.idx(t), on = i < 1 || t < this.L[1].start + 0.8;
    I.solid = true;
    for (let k = 0; k < 3; k++) { I.rect('black', 450 + k * 200, 760, 180, 130, 1); I.rect(on ? 'teal' : 'black', 460 + k * 200, 770, 160, 110, 1); }
    I.rect('navy', 380, 900, 660, 36, 1);
    I.solid = false;
    if (on) I.poly('teal', [[450, 890], [1040, 890], [1080, 1250], [300, 1250]], 0.25);
    const cups = Math.min(8, 1 + Math.floor(t * 1.2));
    for (let k = 0; k < cups; k++) { I.solid = true; I.rect('paper', 400 + (k % 4) * 44, 860 - Math.floor(k / 4) * 48, 32, 42, 1); I.solid = false; }
    if (on) {
      const p = who(this, 'Vajtan', I, 300, 1150, LOOK.young, 'type', t);
      const heat = clamp(t / this.L[0].end, 0, 1);
      for (let k = 0; k < 9; k++) {
        const fx = 250 + k * 12, fh = (40 + 140 * heat) * (0.6 + 0.4 * Math.sin(t * 10 + k * 1.3));
        I.poly(k % 2 ? 'coral' : 'mustard', [[fx - 24, p.head[1] + 30], [fx + Math.sin(t * 7 + k) * 12, p.head[1] + 20 - fh], [fx + 24, p.head[1] + 30]], 0.8);
      }
    } else person(I, 300 - (t - this.L[1].start - 0.8) * 260, 1180, LOOK.young, 'walk', t, { sil: 'black' });
  },
}));

// 14 · PORTERO
SCENES.push(new Scene({
  name: 'Doorman', music: 'night', amb: [['club']], age: '25', chapter: 'XIII — LA NOCHE',
  lines: [['cap', '', 'Me centré en competir y trabajé de portero de noche casi dos años.'],
    ['say', 'Vajtan', 'Tú sí. Tú también. Tú… hoy no.']],
  draw(I, t) {
    wash(I, 'navy', 0.9, 0, 1250);
    I.halftone('coral', [[0, 250], [W, 250], [W, 1100], [0, 1100]], 0.22, 0.9, true, 26);
    const on = Math.floor(t * 5) % 11 !== 0;
    if (on) I.circle('pink', 540, 420, 330, 0.25, 160);
    I.textStroke(on ? 'pink' : 'navy', 'DISCO', 540, 470, 'bold 170px SansB', 8, 'center', on ? 1 : 0.5);
    I.solid = true; I.rect('black', 420, 640, 240, 460, 1); I.solid = false;
    I.poly('mustard', [[540, 600], [560, 600], [760, 1180], [320, 1180]], 0.2);
    for (const px of [110, 330]) { I.stroke('mustard', [[px, 1060], [px, 1180]], 10, 1); I.circle('mustard', px, 1060, 14, 1); }
    I.stroke('coral', [[110, 1080], [220, 1120], [330, 1080]], 10, 1);
    who(this, 'Vajtan', I, 800, 1180, LOOK.young, 'cross', t);
    const i = this.idx(t), G = [LOOK.g1, LOOK.g2, LOOK.g3];
    if (i < 1) G.forEach((g, k) => person(I, 60 + k * 120, 1190, g, 'stand', t, { sil: 'navy', scale: 0.85 }));
    else {
      const u = t - this.L[1].start;
      G.forEach((g, k) => {
        const st = k * 1.0;
        if (k < 2) { const x = 60 + k * 120 + Math.max(0, u - st) * 260; if (x < 560) person(I, x, 1190, g, u > st ? 'walk' : 'stand', t, { sil: 'navy', scale: 0.85 }); }
        else if (u < 2.5) person(I, 300 + Math.min(u, 2) * 60, 1190, g, 'walk', t, { sil: 'navy', scale: 0.85 });
        else person(I, 420 - (u - 2.5) * 260, 1190, g, 'walk', t, { sil: 'navy', scale: 0.85, face: -1 });
      });
    }
  },
}));

// 15 · RAPADO
SCENES.push(new Scene({
  name: 'Buzz', music: 'quirky', age: '26½', chapter: 'XIV — EL ESPEJO', zoom: [1, 1.08], focus: [540, 560],
  lines: [['cap', '', 'A los veintiséis y medio empecé a quedarme calvo…'],
    ['cap', '', 'Así que máquina y rapado. Pelo cortito, y listo.'],
    ['say', 'Vajtan', 'Así pesa menos la cabeza para las patadas.']],
  times() { const s = this.L[1].start; this.sfx = [[s + 0.3, 'clipper', 3.2]]; },
  draw(I, t) {
    wash(I, 'teal', 0.3, 0, 1250);
    I.solid = true; I.rect('navy', 180, 250, 720, 880, 1); I.rect('paper', 200, 270, 680, 840, 1); I.solid = false;
    I.gradBands('teal', 200, 270, 680, 840, 0.3, 0.05, 6, 10);
    for (let k = 0; k < 3; k++) I.poly('paper', [[260 + k * 160, 270], [320 + k * 160, 270], [160 + k * 160, 1110], [100 + k * 160, 1110]], 0.35);
    const i = this.idx(t), s = this.L[1].start, u = t - s - 0.3;
    const lk = i >= 1 && u > 3 ? LOOK.vaj : LOOK.thin;
    const c = I.ctx; c.save(); c.beginPath(); c.rect(200, 270, 680, 840); c.clip();
    who(this, 'Vajtan', I, 540, 1720, lk, 'stand', t, { scale: 2.6 });
    if (i >= 1 && u > 0 && u < 3.2) {
      const cx = 380 + (u / 3.2) * 330, cy = 430 + Math.sin(u * 9) * 8;
      I.solid = true; I.rect('black', cx - 40, cy - 40, 80, 200, 1); I.rect('paper', cx - 46, cy - 60, 92, 30, 1); I.solid = false;
      const r = K.rng(Math.floor(t * 12));
      for (let k = 0; k < 16; k++) I.stroke('navy', [[cx + (r() - .5) * 140, cy + r() * 500], [cx + (r() - .5) * 140 + 6, cy + r() * 500 + 14]], 5, 0.9);
    }
    c.restore();
    if (i === 0 && t > 1.2) { I.text('coral', 'se va…', 760, 380, 'italic 60px SerifI', 'left', 1); I.stroke('coral', [[750, 400], [650, 460]], 5, 1); }
  },
}));

// 16 · MARKETING + ZOOASIS
SCENES.push(new Scene({
  name: 'Zooasis', music: 'uplift', age: '27', chapter: 'XV — ZOOASIS',
  lines: [['cap', '', 'Volví al marketing. Hoy me dedico al marketing digital de captación de clientes.'],
    ['cap', '', 'Desde los veintisiete ayudo a Juanma —Eco Juanma— con Zooasis, su refugio de perros en Albacete.'],
    ['say', 'Juanma', '¡Vajtan, que los panas también quieren salir en internet!'],
    ['cap', '', 'Monto sistemas online para refugios de animales. En eso soy un crack.']],
  times() {
    this.sfx = [];
    for (let s = this.L[0].start + 1; s < this.L[1].start; s += 1) this.sfx.push([s, 'register']);
    for (let s = this.L[1].start + 0.5; s < this.dur; s += 1.4) this.sfx.push([s, 'bark']);
    for (let k = 0; k < 4; k++) this.sfx.push([this.L[3].start + 1 + k * 0.7, 'click']);
  },
  draw(I, t) {
    const i = this.idx(t);
    if (i < 1) {
      wash(I, 'paper', 1, 0, 1250);
      I.halftone('teal', [[0, 250], [W, 250], [W, 1150], [0, 1150]], 0.08, 0.8, false, 14);
      I.stroke('navy', [[140, 1000], [980, 1000]], 3, 0.8); I.stroke('navy', [[140, 1000], [140, 400]], 3, 0.8);
      const u = clamp((t - 0.4) / 4.5, 0, 1);
      const pts = [[140, 960], [280, 900], [400, 920], [540, 780], [680, 700], [820, 560], [960, 420]];
      const n = Math.max(2, Math.ceil(u * pts.length));
      I.stroke('coral', pts.slice(0, n), 10, 1);
      const val = Math.floor(u * 128);
      I.text('navy', '+' + val, 980, 380, 'bold 150px SerifB', 'right', 0.9);
      I.text('navy', 'CLIENTES', 980, 430, '30px SansB', 'right', 0.9);
      person(I, 260, 1180, LOOK.vaj, 'laptop', t, { scale: 0.8 });
      return;
    }
    wash(I, 'mustard', 0.45, 0, 900);
    I.gradBands('coral', 0, 250, W, 600, 0.02, 0.35, 6, 12);
    ground(I, 900, 'mustard', 0.85);
    I.halftone('coral', [[0, 900], [W, 900], [W, H], [0, H]], 0.15, 0.8, true, 12);
    for (let x = 30; x < W; x += 90) I.rect('navy', x, 850, 10, 120, 0.8);
    I.rect('navy', 0, 880, W, 8, 0.8); I.rect('navy', 0, 930, W, 8, 0.8);
    I.solid = true; I.rect('teal', 620, 330, 380, 150, 1); I.solid = false;
    I.text('paper', 'ZOOASIS', 810, 430, 'bold 76px SerifB', 'center', 1);
    I.rect('navy', 700, 480, 12, 380, 0.9); I.rect('navy', 910, 480, 12, 380, 0.9);
    const dogs = [[0, 'g'], [1.1, 'g'], [2.3, 'd'], [3.4, 'g']];
    dogs.forEach(([ph, kind], k) => {
      const span = 760, p = (t * 120 + ph * 230) % (2 * span), x = 150 + (p < span ? p : 2 * span - p), f = p < span ? 1 : -1;
      const yy = 1110 + (k % 2) * 60;
      if (kind === 'g') X.galgo(I, x, yy, t + ph, f, k % 2 ? 'navy' : 'black', 0.9); else X.dog(I, x, yy, t + ph, f, 'navy', 0.9);
    });
    who(this, 'Juanma', I, 330, 1080, LOOK.juanma, 'phone', t, { scale: 0.85 });
    person(I, 540, 1080, LOOK.vaj, 'laptop', t, { scale: 0.85 });
    if (i === 3) {
      const u = t - this.L[3].start;
      I.solid = true; I.rect('navy', 110, 300, 860, 640, 1); I.rect('paper', 130, 380, 820, 540, 1); I.solid = false;
      I.text('paper', 'ADOPTA UN PANA', 150, 355, 'bold 40px SansB', 'left', 1);
      for (let k = 0; k < 3; k++) if (u > k * 0.5) {
        const bx = 160 + k * 270;
        I.solid = true; I.rect('mustard', bx, 410, 240, 300, 0.7); I.solid = false;
        X.galgo(I, bx + 110, 640, t, 1, 'navy', 1);
        I.solid = true; I.rect('coral', bx + 30, 730, 180, 60, 1); I.solid = false;
        I.text('paper', 'ADOPTAR', bx + 120, 772, 'bold 30px SansB', 'center', 1);
      }
      if (u > 2) I.text('teal', '● sistema online', 160, 880, 'bold 40px SansB', 'left', 1);
    }
  },
}));

// 17 · COMBATES
SCENES.push(new Scene({
  name: 'Fights', music: 'triumph', amb: [['crowd', 0.1]], age: '30', chapter: 'XVI — PELEAR',
  lines: [['cap', '', 'Primero, kickboxing: campeón de España de K1, en +91 kg.'],
    ['cap', '', 'Luego llegó el MMA. Primer amateur: victoria. El segundo: derrota. El tercero: otra derrota…'],
    ['cap', '', 'Pero el profesional lo gané. Aunque acabé bastante reventado. XD']],
  times() {
    this.ko = 2.3;
    const L1 = this.L[1], L2 = this.L[2];
    this.t1 = L1.timeOf('victoria'); this.t2 = L1.timeOf('derrota.'); this.t3 = L1.timeOf('otra');
    this.sfx = [[0.2, 'bell'], [1.2, 'punch'], [1.7, 'punch'], [this.ko, 'bigpunch'], [this.ko + 0.4, 'cheer'],
      [this.t1, 'win'], [this.t2, 'loss'], [this.t3 + 0.4, 'loss'], [L2.start + 0.2, 'bell'], [L2.start + 0.6, 'cheer'], [L2.start + 0.8, 'win']];
  },
  draw(I, t) {
    const i = this.idx(t);
    wash(I, 'navy', 0.92, 0, 1250);
    const crowd = () => { const r = K.rng(8); for (let k = 0; k < 22; k++) { const x = r() * W, y = 560 + r() * 120 - (Math.floor(t * 3 + k) % 2) * 8; I.circle('black', x, y, 30, 0.7); I.rect('black', x - 40, y + 26, 80, 160, 0.7); if (t > this.ko && k % 3 === 0) I.stroke('black', [[x + 30, y + 40], [x + 50, y - 60]], 16, 0.7); } };
    if (i < 1 || i === 2) {
      crowd();
      I.poly('paper', [[480, 250], [600, 250], [960, 1200], [120, 1200]], 0.22);
      I.stroke('coral', [[40, 860], [1040, 860]], 8, 1); I.stroke('paper', [[40, 940], [1040, 940]], 8, 0.8); I.stroke('teal', [[40, 1020], [1040, 1020]], 8, 1);
      I.rect('teal', 0, 1170, W, 30, 0.6);
    }
    if (i < 1) {
      const kick = t > 2 && t < this.ko + 0.3;
      person(I, 400, 1180, LOOK.vajFight, kick ? 'kick' : (t < 2 ? (Math.floor(t * 2.5) % 2 ? 'punch' : 'guard') : 'win'), t);
      if (t < this.ko) person(I, 700, 1180, LOOK.rival, 'guard', t, { face: -1 });
      else person(I, 770, 1170, LOOK.rival, 'lie', t);
      if (t > this.ko && t < this.ko + 0.2) wash(I, 'paper', 0.6);
      if (t > this.ko + 0.8) { I.text('mustard', 'CAMPEÓN DE ESPAÑA', 540, 420, 'bold 64px SansB', 'center', 1); I.text('paper', 'K1 · +91 KG', 540, 490, 'italic 52px SerifI', 'center', 0.9); }
    } else if (i === 1) {
      I.halftone('paper', [[0, 250], [W, 250], [W, 1150], [0, 1150]], 0.08, 0.6, true, 40);
      I.text('paper', 'MMA', 540, 420, 'bold 120px SerifB', 'center', 0.9);
      const rows = [[this.t1, 'Amateur I', 'VICTORIA', 'teal'], [this.t2, 'Amateur II', 'DERROTA', 'coral'], [this.t3, 'Amateur III', 'DERROTA', 'coral']];
      rows.forEach(([tt, a, b, ink], k) => {
        if (t < tt) return;
        const al = clamp((t - tt) * 3, 0, 1);
        I.text('paper', a, 150, 600 + k * 150, 'italic 60px SerifI', 'left', al);
        I.text(ink, b, 930, 600 + k * 150, 'bold 60px SansB', 'right', al);
        I.rect('paper', 150, 630 + k * 150, 780, 3, 0.3 * al);
      });
    } else {
      person(I, 540, 1180, LOOK.vajBeaten, 'belt', t, { scale: 1.05 });
      const r = K.rng(12);
      for (let k = 0; k < 40; k++) { const x = r() * W, y = 250 + ((r() * 900 + t * 180) % 900); I.rect(k % 2 ? 'mustard' : 'coral', x, y, 14, 8, 0.9); }
      I.text('mustard', 'PRO — VICTORIA', 540, 400, 'bold 72px SansB', 'center', 1);
      if (t > this.L[2].timeOf('XD')) I.text('coral', 'XD', 900, 560, 'bold 110px SerifB', 'center', 1);
    }
  },
}));

// 18 · FINAL
SCENES.push(new Scene({
  name: 'End', music: 'warm', amb: [['birds'], ['wind']], age: '31', chapter: 'XVII — HOY', post: 5.5, zoom: [1.0, 1.06],
  lines: [['cap', '', 'Llegué con ocho años. Veintitrés años después, esta es mi casa.'],
    ['cap', '', 'Ucrania, Georgia y España en el corazón. Y la aventura sigue.']],
  times() { this.fin = this.L[1].end + HOLD; this.sfx = [[this.fin, 'win']]; },
  hidePanel(t) { return t > this.fin; },
  draw(I, t) {
    wash(I, 'mustard', 0.5, 0, 1000);
    I.gradBands('coral', 0, 250, W, 700, 0.05, 0.6, 8, 12);
    X.sun(I, 540, 900, 210, 'coral', 0.9);
    X.windmill(I, 170, 1000, t, 0.8, 'navy', 0.9); X.windmill(I, 930, 990, t + 1, 0.65, 'navy', 0.8);
    X.hills(I, 1000, 16, 'navy', 1, 4);
    const flags = [[330, 'UA'], [430, 'GE'], [760, 'ES']];
    for (const [fx, kind] of flags) {
      I.stroke('paper', [[fx, 1050], [fx, 760]], 6, 0.9);
      const wv = (u) => Math.sin(t * 4 - u * 4) * 10 * u;
      const P = (u, v) => [fx + u * 130, 770 + v * 86 + wv(u)];
      const band = (v0, v1, ink) => I.poly(ink, [P(0, v0), P(0.5, v0), P(1, v0), P(1, v1), P(0.5, v1), P(0, v1)], 1);
      I.solid = true;
      if (kind === 'UA') { band(0, 0.5, 'teal'); band(0.5, 1, 'mustard'); }
      else if (kind === 'ES') { band(0, 0.25, 'coral'); band(0.25, 0.75, 'mustard'); band(0.75, 1, 'coral'); }
      else { band(0, 1, 'paper'); I.poly('coral', [P(0.44, 0), P(0.56, 0), P(0.56, 1), P(0.44, 1)], 1); band(0.42, 0.58, 'coral'); }
      I.solid = false;
    }
    person(I, 560, 1180, LOOK.vaj, 'wave', t, { sil: 'navy' });
    X.galgo(I, 720, 1180, t * 0.3, 1, 'navy', 1);
    if (t > this.fin) {
      const u = t - this.fin, a = (d) => clamp((u - d) / 0.8, 0, 1);
      I.text('navy', 'FIN', 540, 560, 'bold 200px SerifB', 'center', a(0));
      I.text('navy', 'HISTORIA Y AVENTURAS DE', 540, 1330, '34px SansB', 'center', a(0.8));
      I.text('navy', 'Vajtan, el súper nene', 540, 1410, 'italic 64px SerifI', 'center', a(1.4));
      I.text('coral', 'continuará…', 540, 1480, 'italic 44px SerifI', 'center', a(2.4));
    }
  },
}));

// ================================================================ PLAN / AUDIO / RENDER
function plan() {
  for (;;) {
    let t = 0;
    for (const sc of SCENES) { sc.schedule(t); t += sc.dur; }
    if (t <= TARGET || WPS >= 7) { SCENES[SCENES.length - 1].dur += TARGET - t; return TARGET; }
    WPS += 0.1;
  }
}
function buildAudio(total) {
  const buf = AU.makeBuf(total), mus = AU.makeBuf(total);
  SCENES.forEach((sc, k) => {
    AU.music2(mus, sc.t0, sc.dur + 0.5, sc.music, 200 + k);
    for (const a of sc.amb) AU.SFX[a[0]](buf, sc.t0, sc.dur, ...a.slice(1));
    for (const s of sc.sfx) AU.SFX[s[1]](buf, sc.t0 + s[0], ...s.slice(2));
    if (k > 0) AU.SFX.swoosh(buf, sc.t0 - 0.1);
  });
  for (let i = 0; i < buf.length; i++) buf[i] = buf[i] * 0.85 + mus[i] * 0.55;
  return buf;
}
function main() {
  const total = plan();
  console.log('WPS', WPS.toFixed(2));
  SCENES.forEach(s => console.log(s.name.padEnd(12), s.t0.toFixed(2), s.dur.toFixed(2)));
  const canvas = K.createCanvas(W, H), ctx = canvas.getContext('2d');
  const args = process.argv;
  if (args.includes('--preview')) {
    const only = args.includes('--scene') ? args[args.indexOf('--scene') + 1] : null;
    const dir = path.join(__dirname, 'preview'); fs.mkdirSync(dir, { recursive: true });
    for (const sc of SCENES) {
      if (only && sc.name !== only) continue;
      [0.35, 0.8].forEach((f, k) => { sc.render(ctx, sc.dur * f, k); fs.writeFileSync(path.join(dir, `${sc.name}_${k}.png`), canvas.toBuffer('image/png')); });
    }
    return;
  }
  const wav = path.join(__dirname, '_audio.wav');
  AU.writeWav(wav, buildAudio(total));
  const ff = execSync('python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim();
  const raw = path.join(__dirname, '_raw.mp4');
  const p = spawn(ff, ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS),
    '-i', '-', '-i', wav, '-c:v', 'libx264', '-preset', 'medium', '-b:v', '1050k', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  const nf = Math.round(total * FPS);
  let si = 0;
  const writeFrame = (b) => new Promise(res => { if (!p.stdin.write(b)) p.stdin.once('drain', res); else res(); });
  (async () => {
    for (let fi = 0; fi < nf; fi++) {
      const gt = fi / FPS;
      while (si + 1 < SCENES.length && gt >= SCENES[si + 1].t0) si++;
      const sc = SCENES[si], lt = gt - sc.t0;
      sc.render(ctx, lt, fi);
      const fin = Math.min(1, lt / 0.35), fout = Math.min(1, (sc.dur - lt) / (si === SCENES.length - 1 ? 1.2 : 0.25));
      const f = Math.min(fin, fout);
      if (f < 1) { ctx.save(); ctx.globalAlpha = 1 - f; ctx.fillStyle = K.PAPER; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      const img = ctx.getImageData(0, 0, W, H);
      await writeFrame(Buffer.from(img.data.buffer));
      if (fi % 120 === 0) console.log(`frame ${fi}/${nf}`);
    }
    p.stdin.end();
    p.on('close', () => { fs.unlinkSync(wav); console.log('OK ->', OUT); });
  })();
}
main();
