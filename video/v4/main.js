// HISTORIA Y AVENTURAS DE VAJTAN, EL SUPER NENE - v4 "dibujado por un niño"
// Fotogramas generados con JavaScript (canvas) + audio sintetizado en JS. Vertical 1080x1920.
// Uso: node main.js [--preview] [--scene nombre]
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const D = require('./draw');
const F = require('./font');
const X = require('./figures');
const AU = require('./audio');
const { C, line, fill, shape, circle, rect, dot } = D;
const { LOOK, person } = X;

const FPS = 12;
const TARGET = 175;
let CPS = 20;
const HOLD = 1.0;
const OUT = path.join(__dirname, '..', 'vajtan_aventuras_dibujo_9x16.mp4');
const CAP_U = 6.6, CAP_N = 24, CAP_LH = 60, CAP_Y = 1130;
const BUB_U = 5.4, BUB_N = 16, BUB_LH = 48;

// ================================================================ LINEAS
class Line {
  constructor(kind, who, text, start) {
    this.kind = kind; this.who = who; this.start = start;
    this.lines = F.wrap(text.toUpperCase(), kind === 'cap' ? CAP_N : BUB_N);
    this.flat = this.lines.join(' ');
    this.times = [];
    let t = start + 0.25;
    for (let i = 0; i < this.flat.length; i++) {
      this.times.push(t);
      const ch = this.flat[i];
      t += ch === ' ' ? 0.5 / CPS : 1 / CPS;
      if ('.!?:'.includes(ch) && this.flat[i + 1] === ' ') t += 0.25;
      else if (ch === ',') t += 0.1;
    }
    this.end = t;
  }
  prog(t) {
    let n = 0;
    for (let i = 0; i < this.times.length; i++) {
      if (this.times[i] <= t) n = i + 1;
      else { n += Math.max(0, Math.min(1, (t - (this.times[i] - 1 / CPS)) * CPS)); break; }
    }
    return n;
  }
  timeOf(word) { const i = this.flat.indexOf(word); return i < 0 ? this.end : this.times[i]; }
}

function drawCaption(ctx, ln, t) {
  const h = 44 + ln.lines.length * CAP_LH;
  const x0 = 56, w = 890, y0 = CAP_Y;
  ctx.save();
  ctx.fillStyle = '#fffdf6'; ctx.globalAlpha = 0.96;
  ctx.fillRect(x0, y0, w, h);
  ctx.restore();
  line(ctx, D.rectPts(x0, y0, w, h), C.navy, 6, { closed: true, amp: 1.5 });
  for (const [tx, ang] of [[x0 + 40, -0.2], [x0 + w - 110, 0.15]]) {
    ctx.save(); ctx.translate(tx + 35, y0); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(255,210,63,0.55)'; ctx.fillRect(-45, -16, 90, 32); ctx.restore();
  }
  F.writeLines(ctx, ln.lines, x0 + 28, y0 + 26, CAP_U, CAP_LH, C.navy, ln.prog(t), ln.start * 10 | 0);
}

function drawBubble(ctx, ln, t, anchor) {
  if (!anchor) return;
  const maxL = Math.max(...ln.lines.map(s => s.length));
  const w = F.width('X'.repeat(maxL), BUB_U), h = ln.lines.length * BUB_LH;
  let x = anchor[0] - w / 2, y = anchor[1] - h - 110;
  x = Math.max(90, Math.min(930 - w, x));
  y = Math.max(210, y);
  X.bubble(ctx, x, y, w, h, anchor[0], anchor[1] - 12);
  F.writeLines(ctx, ln.lines, x, y + 4, BUB_U, BUB_LH, C.black, ln.prog(t), ln.start * 13 | 0);
}

// ================================================================ ESCENA BASE
class Scene {
  constructor(o) { Object.assign(this, { pre: 0.4, post: 0.6, minDur: 0, delays: {}, lines: [], amb: [], anchor: {} }, o); }
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
    if (this.setupTimes) this.setupTimes();
  }
  idx(t) { let i = -1; this.L.forEach((ln, k) => { if (t >= ln.start) i = k; }); return i; }
  talking(t, who) { const i = this.idx(t); return i >= 0 && this.L[i].who === who && this.L[i].prog(t) < this.L[i].flat.length; }
  render(ctx, t) {
    ctx.drawImage(D.paper(), 0, 0);
    this.anchor = {};
    ctx.save();
    const sh = this.shake ? this.shake(t) : [0, 0];
    ctx.translate(sh[0], sh[1]);
    this.draw(ctx, t);
    ctx.restore();
    const i = this.idx(t);
    let cap = null;
    for (let k = 0; k <= i; k++) if (this.L[k].kind === 'cap') cap = this.L[k];
    if (cap && (!this.hideCap || !this.hideCap(t))) drawCaption(ctx, cap, t);
    if (i >= 0 && this.L[i].kind === 'say') drawBubble(ctx, this.L[i], t, this.anchor[this.L[i].who]);
    if (this.over) this.over(ctx, t);
  }
}

const P = (lk, x, y, pose, t, o = {}) => person(null, x, y, lk, pose, t, o);
function who(sc, name, ctx, x, y, lk, pose, t, o = {}) {
  o.talk = o.talk ?? sc.talking(t, name);
  const r = person(ctx, x, y, lk, pose, t, o);
  sc.anchor[name] = r.head;
  return r;
}
function title(ctx, txt, x, y, u, col, prog = 99) { F.write(ctx, txt, x, y, u, col, prog, txt.length); }
function titleC(ctx, txt, y, u, col, prog = 99, cx = 500) { title(ctx, txt, cx - F.width(txt, u) / 2, y, u, col, prog); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ================================================================ ESCENAS
const SCENES = [];

// 1. PORTADA
SCENES.push(new Scene({
  name: 'Title', music: 'happy', minDur: 6.5, amb: [['birds']],
  setupTimes() { this.sfx = [[4.6, 'tada']]; let tt = 0.4; for (let k = 0; k < 40; k++) { this.sfx.push([tt, 'scribble']); tt += 0.09; } },
  draw(ctx, t) {
    X.sky(ctx, 900, C.ltblue, 0.25);
    X.sun(ctx, 880, 760, 70, t);
    X.cloud(ctx, 220, 760, 0.9);
    X.cloud(ctx, 800, 880, 0.7);
    for (let k = 0; k < 6; k++) if (Math.floor(t * 3 + k) % 3) X.star(ctx, 120 + k * 150, 700 + (k % 2) * 60, 18);
    X.ground(ctx, 1030, C.green, C.dkgreen, 2, 18);
    person(ctx, 500, 1090, LOOK.vajHero, 'hero', t, { lift: Math.sin(t * 2) * 10 });
    const pr = t * 11;
    titleC(ctx, 'HISTORIA Y AVENTURAS DE', 220, 6.5, C.navy, pr);
    const cols = [C.red, C.orange, C.yellow, C.green, C.blue, C.purple];
    const w = F.width('VAJTAN', 20);
    for (let i = 0; i < 6; i++) title(ctx, 'VAJTAN'[i], 500 - w / 2 + i * F.ADV * 20, 320, 20, cols[i], pr - 23 - i);
    titleC(ctx, 'EL SÚPER NENE', 520, 9, C.red, pr - 30);
  },
  over(ctx, t) { if (t > 4.6 && Math.floor(t * 2) % 2) titleC(ctx, '¡DALE AL PLAY!', 1250, 6, C.navy); },
}));

// 2. UCRANIA
SCENES.push(new Scene({
  name: 'Ukraine', music: 'folk', amb: [['birds']],
  lines: [['cap', 'N', 'Ucrania. Esta es mi familia: papá, mamá, mi hermana (dos años más pequeña) y yo.'],
    ['say', 'papa', '¿Sabéis qué? Habrá que irnos.'],
    ['say', 'mama', '¿Irnos? ¿A dónde?'],
    ['say', 'papa', 'A España. Yo voy primero y luego os traigo.']],
  draw(ctx, t) {
    X.sky(ctx, 760, C.ltblue, 0.25);
    X.sun(ctx, 170, 330, 70, t);
    X.cloud(ctx, 640 + Math.sin(t * .3) * 30, 300, 1);
    X.ground(ctx, 780, C.green, C.dkgreen, 1, 22);
    X.house(ctx, 90, 850, 280, 220, '#ffffff', C.orange, { chimney: true });
    X.flag(ctx, 420, 860, 'UA', t, 0.8);
    X.sunflower(ctx, 960, 960, 190); X.sunflower(ctx, 1020, 990, 150);
    const i = this.idx(t);
    who(this, 'mama', ctx, 470, 1080, LOOK.mama, 'stand', t);
    who(this, 'papa', ctx, 620, 1080, LOOK.papa, i === 1 || i === 3 ? 'point' : 'stand', t);
    who(this, 'kid', ctx, 760, 1080, LOOK.kid, 'stand', t);
    who(this, 'sis', ctx, 870, 1080, LOOK.sis, 'stand', t);
    if (i === 0) {
      const L0 = this.L[0];
      if (t > L0.timeOf('PAPÁ')) X.label(ctx, 'PAPÁ', 560, 560, 610, 700);
      if (t > L0.timeOf('MAMÁ')) X.label(ctx, 'MAMÁ', 370, 610, 450, 730);
      if (t > L0.timeOf('HERMANA')) X.label(ctx, 'HERMANA', 820, 640, 880, 820);
      if (t > L0.timeOf('YO')) X.label(ctx, 'YO', 720, 520, 760, 740);
    }
  },
}));

// 3. DESPEDIDA (invierno)
SCENES.push(new Scene({
  name: 'Farewell', music: 'sad', amb: [['wind']],
  lines: [['cap', 'N', 'Tenía 5 años, casi 6, cuando papá se fue el primero.'],
    ['say', 'papa', '¡Portaos bien! ¡Os quiero!'],
    ['cap', 'N', 'En España trabajó muchísimo para poder traernos.']],
  setupTimes() { this.leave = this.L[1].end + 0.5; this.sfx = [[0, 'engine', this.leave + 3, 0.1], [this.leave, 'horn'], [this.leave + 0.3, 'whoosh']]; },
  draw(ctx, t) {
    X.sky(ctx, 700, C.grey, 0.3);
    for (const [bx, bh] of [[40, 380], [300, 460], [620, 400], [860, 440]]) {
      rect(ctx, bx, 760 - bh, 200, bh, { fill: C.ltgrey, stroke: C.black, lw: 6 });
      for (let wy = 760 - bh + 30; wy < 720; wy += 70) for (let wx = bx + 25; wx < bx + 180; wx += 60) rect(ctx, wx, wy, 34, 34, { fill: (wx + wy) % 3 ? C.ltblue : C.yellow, stroke: C.black, lw: 4 });
    }
    X.ground(ctx, 760, '#e9f1fb', C.ltblue, 3, 10);
    const i = this.idx(t);
    let bx = 380 + Math.max(0, t - this.leave) ** 2 * 120;
    if (bx < 1100) X.bus(ctx, bx, 960, 560, t, [null, null, null, i >= 1 ? [C.skin, '#3b2a20'] : null, null, null], C.yellow, t > this.leave);
    if (i >= 1) this.anchor.papa = [bx + 290, 780];
    if (i === 0) who(this, 'papa', ctx, 820, 1080, LOOK.papa, 'hug', t);
    const wave = t > this.leave - 0.3;
    who(this, 'mama', ctx, 220, 1080, LOOK.mama, wave ? 'wave' : 'stand', t);
    person(ctx, 340, 1080, LOOK.kid5, wave ? 'wave' : 'stand', t + .3, { expr: wave ? 'sad' : undefined });
    person(ctx, 110, 1080, LOOK.sis3, 'stand', t);
    const r = D.rngFor(7);
    for (let k = 0; k < 40; k++) {
      const x0 = r() * 1080, y0 = r() * 1100, sp = 40 + r() * 60;
      X.snowflake(ctx, (x0 + Math.sin(t + k) * 20) % 1080, (y0 + t * sp) % 1100 + 150, 8 + r() * 6);
    }
    if (i === 2) {
      const n = 1 + Math.floor((t - this.L[2].start) / 1.4);
      rect(ctx, 760, 300, 220, 200, { fill: '#ffffff', stroke: C.black, lw: 6 });
      rect(ctx, 760, 300, 220, 50, { fill: C.red, stroke: C.black, lw: 6 });
      titleC(ctx, Math.min(n, 3) + (n > 1 ? ' AÑOS' : ' AÑO'), 390, 7, C.black, 99, 870);
    }
  },
}));

// 4. VIAJE (mapa)
SCENES.push(new Scene({
  name: 'Journey', music: 'travel', post: 1.2, amb: [['engine', 0.07]],
  lines: [['cap', 'N', 'Con 8 años, por fin, nos fuimos mamá, mi hermana y yo.'],
    ['say', 'sis', '¿Falta mucho?'],
    ['say', 'kid', 'Shhh... estoy dibujando.']],
  draw(ctx, t) {
    const f = t / this.dur;
    const night = f > 0.45 && f < 0.8;
    X.sky(ctx, 1110, night ? C.navy : C.ltblue, night ? 0.45 : 0.2);
    if (night) { X.moon(ctx, 880, 290, 60); for (let k = 0; k < 8; k++) X.star(ctx, 120 + k * 110, 250 + (k % 3) * 60, 14); }
    else X.sun(ctx, 880, 300, 60, t);
    const land = [[140, 420], [520, 360], [900, 400], [980, 620], [880, 900], [600, 1000], [260, 1020], [120, 860], [90, 600]];
    shape(ctx, land, { fill: '#f1e3c1', stroke: C.brown, lw: 7 });
    shape(ctx, [[640, 420], [880, 430], [940, 560], [820, 620], [660, 580]], { fill: C.yellow, stroke: C.blue, lw: 7 });
    fill(ctx, [[640, 420], [880, 430], [900, 500], [650, 500]], C.blue, { spacing: 12, w: 10 });
    shape(ctx, [[150, 800], [380, 780], [420, 940], [230, 1000], [140, 920]], { fill: C.yellow, stroke: C.red, lw: 7 });
    fill(ctx, [[150, 800], [380, 780], [390, 830], [150, 850]], C.red, { spacing: 12, w: 10 });
    fill(ctx, [[140, 950], [410, 920], [420, 940], [230, 1000], [140, 990]], C.red, { spacing: 12, w: 10 });
    title(ctx, 'UCRANIA', 660, 630, 5, C.blue); title(ctx, 'ESPAÑA', 170, 740, 5, C.red);
    for (const [mx, my] of [[500, 620], [560, 660], [440, 700]]) shape(ctx, [[mx - 50, my + 40], [mx, my - 40], [mx + 50, my + 40]], { fill: C.grey, stroke: C.black, lw: 5 });
    const route = [[760, 520], [640, 640], [520, 760], [400, 830], [300, 880]];
    const Lr = D.resample(route, 30);
    for (let k = 0; k < Lr.length; k += 2) dot(ctx, Lr[k][0], Lr[k][1], 6, C.red);
    const u = clamp(t / (this.dur - 1), 0, 1);
    const pi = Math.floor(u * (Lr.length - 1));
    const [bx, by] = Lr[pi];
    ctx.save(); ctx.translate(bx, by); ctx.scale(0.28, 0.28); ctx.translate(-bx, -by);
    X.bus(ctx, bx - 280, by + 100, 560, t, [[C.skin, C.yellow], [C.skin, '#3b2a20'], [C.skin, C.orange]], C.white, true);
    ctx.restore();
    this.anchor.sis = [bx + 30, by - 40];
    this.anchor.kid = [bx - 20, by - 40];
    X.words(ctx, 'X', 285, 860, 6, C.red);
  },
}));

// 5. TOMELLOSO
SCENES.push(new Scene({
  name: 'Tomelloso', music: 'sunny', amb: [['birds']],
  lines: [['cap', 'N', 'Tomelloso. Papá nos estaba esperando. ¡La familia junta otra vez!'],
    ['say', 'papa', '¡Bienvenidos a casa!'],
    ['cap', 'N', 'Yo era un niño un poco raro: siempre dibujando. Un chaval de artes.']],
  setupTimes() { this.sfx = []; for (let k = 0; k < 6; k++) this.sfx.push([2.5 + k * 0.5, 'pop']); },
  draw(ctx, t) {
    X.sky(ctx, 800, C.ltblue, 0.22);
    X.sun(ctx, 150, 300, 66, t);
    for (const cx of [260, 830]) {
      rect(ctx, cx - 26, 360, 52, 440, { fill: C.red, stroke: C.black, lw: 6 });
      for (let yy = 390; yy < 800; yy += 40) line(ctx, [[cx - 26, yy], [cx + 26, yy]], C.black, 3);
      for (let k = 0; k < 3; k++) circle(ctx, cx + 20 + k * 30 + Math.sin(t + k) * 8, 320 - k * 40 - (t * 20) % 40, 20 + k * 6, { fill: C.ltgrey, stroke: C.grey, lw: 4 });
    }
    rect(ctx, 470, 420, 140, 400, { fill: '#f1e3c1', stroke: C.black, lw: 7 });
    shape(ctx, [[450, 420], [540, 320], [630, 420]], { fill: C.orange, stroke: C.black, lw: 7 });
    rect(ctx, 510, 470, 60, 70, { fill: C.black, stroke: C.black, lw: 5 });
    circle(ctx, 540, 520, 20, { fill: C.gold, stroke: C.black, lw: 4 });
    line(ctx, [[540, 300], [540, 250]], C.black, 6); line(ctx, [[520, 270], [560, 270]], C.black, 6);
    X.ground(ctx, 800, '#f4e1b5', C.orange, 4, 8);
    for (const [hx, w] of [[30, 180], [700, 170], [880, 180]]) X.house(ctx, hx, 900, w, 150, '#ffffff', C.orange);
    title(ctx, 'TOMELLOSO', 330, 200, 7, C.orange);
    const i = this.idx(t);
    if (i < 2) {
      const a = clamp(t / 2.2, 0, 1);
      who(this, 'papa', ctx, 430, 1080, LOOK.papa, a >= 1 ? 'hug' : 'wave', t);
      person(ctx, 900 - a * 330, 1080, LOOK.kid, a < 1 ? 'walk' : 'hug', t);
      who(this, 'mama', ctx, 1000 - a * 200, 1080, LOOK.mama, a < 1 ? 'walk' : 'stand', t);
      person(ctx, 1080 - a * 190, 1080, LOOK.sis, a < 1 ? 'walk' : 'stand', t);
      if (a >= 1) for (let k = 0; k < 4; k++) X.heart(ctx, 500 + k * 40 + Math.sin(t * 3 + k) * 20, 700 - ((t * 60 + k * 50) % 250), 1.6);
    } else {
      const u = t - this.L[2].start;
      rect(ctx, 150, 1000, 300, 26, { fill: C.brown, stroke: C.black, lw: 6 });
      line(ctx, [[170, 1026], [170, 1080]], C.black, 7); line(ctx, [[430, 1026], [430, 1080]], C.black, 7);
      person(ctx, 300, 1000, LOOK.kid, 'draw', t);
      rect(ctx, 330, 880, 90, 70, { fill: '#ffffff', stroke: C.black, lw: 5 });
      const doodles = [(x, y) => X.star(ctx, x, y, 34), (x, y) => X.heart(ctx, x, y, 2.4, C.pink), (x, y) => X.sun(ctx, x, y, 30, t)];
      for (let k = 0; k < 3; k++) {
        const a = u - k * 1.1;
        if (a > 0) doodles[k](380 + k * 130, 800 - Math.min(a, 1.5) * 220);
      }
      person(ctx, 750, 1060, LOOK.kidA, Math.floor(u * 2) % 2 ? 'walk' : 'stand', t);
      person(ctx, 960, 1060, LOOK.kidB, 'wave', t);
      const ph = (u * 0.8) % 2, p = ph < 1 ? ph : 2 - ph;
      circle(ctx, 780 + p * 150, 900 - Math.sin(p * Math.PI) * 120, 22, { fill: '#ffffff', stroke: C.black, lw: 5 });
    }
  },
}));

// 6. KICKBOXING 8,5
SCENES.push(new Scene({
  name: 'KickGym', music: 'action',
  lines: [['cap', 'N', 'Con 8 años y medio papá me apuntó a kickboxing. ¡Boxeo no había!'],
    ['say', 'papa', '¡Guardia arriba!'],
    ['say', 'kid', '¡Pam! ¡Pam! ¡Pam!']],
  setupTimes() {
    this.hits = []; let s = this.L[2].start + 0.3;
    while (s < this.dur - 0.4) { this.hits.push(s); s += 0.7; }
    this.sfx = this.hits.map(h => [h + 0.05, 'punch']);
  },
  draw(ctx, t) {
    X.sky(ctx, 780, '#dfe7f2', 0.4);
    rect(ctx, 90, 300, 260, 190, { fill: C.ltblue, stroke: C.black, lw: 7 });
    line(ctx, [[220, 300], [220, 490]], C.black, 5); line(ctx, [[90, 395], [350, 395]], C.black, 5);
    rect(ctx, 640, 290, 300, 220, { fill: '#ffffff', stroke: C.black, lw: 7 });
    title(ctx, 'KICK', 700, 320, 8, C.red); title(ctx, 'BOXING', 670, 420, 7, C.navy);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) rect(ctx, c * 180, 780 + r * 90, 180, 90, { fill: (r + c) % 2 ? C.red : C.blue, stroke: C.black, lw: 4, alpha: 0.6 });
    let last = null; for (const h of this.hits || []) if (h <= t) last = h;
    const sw = last !== null ? Math.exp(-(t - last) * 2) * Math.sin((t - last) * 8) * 40 : 0;
    X.bag(ctx, 800, 600, C.red, sw);
    let pose = t > this.L[1].start ? 'guard' : 'stand';
    if (last !== null && t - last < 0.3) pose = this.hits.indexOf(last) % 2 ? 'punch' : 'kick';
    who(this, 'kid', ctx, 620, 1080, LOOK.kidKick, pose, t);
    who(this, 'papa', ctx, 300, 1080, LOOK.papa, t < this.L[1].start ? 'cross' : 'guard', t);
    if (last !== null && t - last < 0.35) { X.burst(ctx, 760, 720, 90); title(ctx, 'PAM!', 690, 690, 7, C.red); }
  },
}));

// 7. PARKOUR 12
SCENES.push(new Scene({
  name: 'Parkour12', music: 'action', minDur: 8.5,
  lines: [['cap', 'N', 'A los 12 descubrí el parkour. Piripi, piripa... ¡pa, pam, pam, pim!']],
  setupTimes() { this.J = [0.8, 2.0, 3.2, 4.4, 5.6, 6.8, 8.0]; this.sfx = this.J.map(j => [j, 'boing']); },
  draw(ctx, t) {
    X.sky(ctx, 900, C.orange, 0.3);
    X.sun(ctx, 540, 560, 110, t, C.yellow);
    const roofs = [[-40, 880, 260], [260, 820, 230], [540, 900, 240], [820, 840, 300]];
    for (const [rx, ry, rw] of roofs) {
      rect(ctx, rx, ry, rw, 1100 - ry, { fill: '#ffffff', stroke: C.black, lw: 7 });
      rect(ctx, rx - 10, ry - 24, rw + 20, 30, { fill: C.red, stroke: C.black, lw: 6 });
      for (let wy = ry + 40; wy < 1060; wy += 90) rect(ctx, rx + rw / 2 - 30, wy, 60, 50, { fill: C.ltblue, stroke: C.black, lw: 4 });
    }
    const spots = [130, 380, 660, 960, 660, 380, 130];
    const tops = [856, 796, 876, 816, 876, 796, 856];
    let k = 0; while (k < this.J.length - 1 && t > this.J[k + 1]) k++;
    const WORDS = ['PIRIPI', 'PIRIPA', 'PA!', 'PAM!', 'PAM!', 'PIM!'];
    let x, y, pose = 'stand', rot = 0;
    const j = this.J[k];
    if (t < this.J[0]) { x = spots[0]; y = tops[0]; }
    else if (t - j < 0.8 && k < spots.length - 1) {
      const u = (t - j) / 0.8;
      x = spots[k] + (spots[k + 1] - spots[k]) * u;
      y = tops[k] + (tops[k + 1] - tops[k]) * u - Math.sin(u * Math.PI) * 230;
      pose = 'tuck'; rot = (k % 2 ? -1 : 1) * u * Math.PI * 2;
      const dl = [];
      for (let q = 0; q <= 10; q++) { const v = q / 10 * u; dl.push([spots[k] + (spots[k + 1] - spots[k]) * v, tops[k] + (tops[k + 1] - tops[k]) * v - Math.sin(v * Math.PI) * 230 - 150]); }
      for (let q = 0; q < dl.length; q += 2) dot(ctx, dl[q][0], dl[q][1], 5, C.grey);
    } else { const kk = Math.min(k + 1, spots.length - 1); x = spots[kk]; y = tops[kk]; pose = 'win'; }
    person(ctx, x, y, LOOK.teen12, pose, t, { rot, scale: 0.8 });
    for (let q = 0; q <= k && q < WORDS.length; q++) {
      if (t < this.J[q]) continue;
      const a = Math.min(1, (t - this.J[q]) * 3);
      title(ctx, WORDS[q], 80 + (q % 3) * 300, 260 + Math.floor(q / 3) * 110, 6 + a * 2, [C.red, C.blue, C.purple][q % 3]);
    }
  },
}));

// 8. ACCIDENTE
SCENES.push(new Scene({
  name: 'Accident', music: 'tense', delays: { 1: 2.8 },
  lines: [['cap', 'N', 'Con 16 años, casi 17, haciendo un mortal en un gimnasio...'],
    ['cap', 'N', 'Me rompí el cuello. ¡Menos mal que caí en un tatami!']],
  setupTimes() {
    this.tr = this.L[0].end + 0.3; this.tj = this.tr + 0.9; this.ti = this.tj + 0.8;
    this.sfx = [[this.tj, 'whoosh'], [this.ti, 'pah'], [this.ti + 1.2, 'heart', 5]];
  },
  shake(t) { const u = t - this.ti; if (u >= 0 && u < 0.6) { const k = (0.6 - u) * 40, r = D.rngFor(Math.floor(t * 50)); return [(r() - .5) * k, (r() - .5) * k]; } return [0, 0]; },
  draw(ctx, t) {
    X.sky(ctx, 800, '#f3e2c7', 0.4);
    for (let x = 90; x < 400; x += 36) line(ctx, [[x, 300], [x, 780]], C.brown, 7);
    for (let y = 330; y < 780; y += 60) line(ctx, [[90, y], [390, y]], C.brown, 5);
    rect(ctx, 620, 300, 300, 200, { fill: C.ltblue, stroke: C.black, lw: 7 });
    rect(ctx, 40, 900, 1000, 170, { fill: C.blue, stroke: C.navy, lw: 7 });
    title(ctx, 'TATAMI', 380, 950, 7, '#ffffff');
    const L = LOOK.teen;
    if (t < this.tr) person(ctx, 180, 1000, L, 'stand', t);
    else if (t < this.tj) person(ctx, 180 + (t - this.tr) / 0.9 * 250, 1000, L, 'run', t);
    else if (t < this.ti) {
      const u = (t - this.tj) / 0.8;
      person(ctx, 430 + u * 200, 1000 - Math.sin(u * Math.PI * 0.85) * 300, L, 'tuck', t, { rot: u * Math.PI });
    } else if (t < this.ti + 1.4) {
      person(ctx, 640, 1010, L, 'stand', t, { rot: Math.PI, expr: 'ouch' });
      X.burst(ctx, 640, 900, 220, C.yellow, C.red);
      title(ctx, '¡PAH!', 470, 840, 13, C.red);
    } else {
      person(ctx, 640, 1000, L, 'lie', t);
      for (let k = 0; k < 3; k++) { const a = t * 4 + k * 2.1; X.star(ctx, 520 + Math.cos(a) * 70, 880 + Math.sin(a) * 25, 18); }
      title(ctx, 'AY...', 700, 780, 6, C.black);
    }
  },
}));

// 9. APARATO
SCENES.push(new Scene({
  name: 'Halo', music: 'calm', amb: [['tv'], ['tick']],
  lines: [['cap', 'N', '3 meses con un aparato en el cuello...'],
    ['cap', 'N', 'Ahí cambió mi forma de ver el mundo. Sobre todo la política mundial.']],
  draw(ctx, t) {
    X.sky(ctx, 800, '#dce8d0', 0.4);
    rect(ctx, 80, 300, 240, 220, { fill: C.ltblue, stroke: C.black, lw: 7 });
    line(ctx, [[200, 300], [200, 520]], C.black, 5); line(ctx, [[80, 410], [320, 410]], C.black, 5);
    rect(ctx, 60, 860, 420, 120, { fill: C.blue, stroke: C.black, lw: 7 });
    rect(ctx, 60, 820, 100, 60, { fill: '#ffffff', stroke: C.black, lw: 6 });
    line(ctx, [[70, 980], [70, 1060]], C.black, 8); line(ctx, [[470, 980], [470, 1060]], C.black, 8);
    rect(ctx, 640, 780, 330, 280, { fill: C.brown, stroke: C.black, lw: 7 });
    rect(ctx, 610, 520, 390, 270, { fill: C.black, stroke: C.black, lw: 8 });
    rect(ctx, 635, 545, 340, 220, { fill: C.navy, stroke: null });
    const g = t * 0.8;
    circle(ctx, 805, 650, 90, { fill: C.blue, stroke: C.ltblue, lw: 6 });
    for (let k = 0; k < 3; k++) { const a = g + k * 2.1, cx = 805 + Math.cos(a) * 45; if (Math.sin(a) > -0.3) circle(ctx, cx, 630 + k * 25, 26, { ry: 18, fill: C.green, stroke: C.dkgreen, lw: 4 }); }
    title(ctx, 'NOTICIAS', 660, 745, 4, C.yellow);
    rect(ctx, 700, 250, 200, 200, { fill: '#ffffff', stroke: C.black, lw: 6 });
    rect(ctx, 700, 250, 200, 50, { fill: C.red, stroke: C.black, lw: 6 });
    const day = Math.min(90, 1 + Math.floor(t / this.dur * 95));
    titleC(ctx, 'DÍA ' + day, 340, 6, C.black, 99, 800);
    who(this, 'teen', ctx, 300, 900, LOOK.teenHalo, 'sit', t);
    if (this.idx(t) === 1) {
      X.bubble(ctx, 380, 260, 150, 90, 330, 520);
      circle(ctx, 440, 305, 36, { fill: C.blue, stroke: C.navy, lw: 5 });
      title(ctx, '?!', 490, 270, 7, C.red);
    }
  },
}));

// 10. VUELTA AL PARKOUR
SCENES.push(new Scene({
  name: 'BackParkour', music: 'travel', minDur: 8, amb: [['birds']],
  lines: [['cap', 'N', '8 meses después volví al parkour. Y saltaba mucho, mucho, mucho, ¡muchísimo!'],
    ['cap', 'N', 'El kickboxing seguía ahí, pero en modo light.']],
  setupTimes() { this.sfx = []; for (let s = 0.6; s < this.dur - 0.4; s += 0.75) this.sfx.push([s, 'boing']); },
  draw(ctx, t) {
    X.sky(ctx, 800, C.ltblue, 0.2);
    X.sun(ctx, 900, 300, 60, t);
    X.tree(ctx, 120, 820, 1.1); X.tree(ctx, 960, 820, 1.2, C.green, true);
    X.ground(ctx, 820, C.green, C.dkgreen, 5, 10);
    const blocks = [[200, 960, 160], [460, 900, 160], [720, 960, 160]];
    for (const [bx, by, bw] of blocks) rect(ctx, bx, by, bw, 1080 - by, { fill: C.ltgrey, stroke: C.black, lw: 7 });
    const ph = Math.max(0, t - 0.6) / 0.75;
    const k = Math.floor(ph), u = ph - k;
    const seq = [0, 1, 2, 1];
    const a = seq[k % 4], b = seq[(k + 1) % 4];
    const x = 280 + (blocks[b][0] - blocks[a][0]) * u + (blocks[a][0] - 200);
    const y0 = blocks[a][1], y1 = blocks[b][1];
    const y = y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * 220;
    person(ctx, x, y, LOOK.teen, 'tuck', t, { rot: k % 3 === 2 ? u * Math.PI * 2 : 0, scale: 0.8 });
    const n = Math.floor(Math.pow(Math.max(0, t - 0.6), 2.3) * 12);
    title(ctx, 'SALTOS: ' + n, 100, 240, 7, C.purple);
    if (this.idx(t) === 1) {
      line(ctx, [[860, 380], [860, 420]], C.black, 5);
      circle(ctx, 830, 460, 34, { fill: C.red, stroke: C.black, lw: 5 });
      circle(ctx, 895, 460, 34, { fill: C.red, stroke: C.black, lw: 5 });
      rect(ctx, 760, 520, 200, 70, { fill: C.yellow, stroke: C.black, lw: 5 });
      title(ctx, 'LIGHT', 790, 535, 6, C.black);
    }
  },
}));

// 11. ARTE
SCENES.push(new Scene({
  name: 'Art', music: 'calm',
  lines: [['cap', 'N', 'De los 17 a los 19 estudié artes... pero yo solo pensaba en el parkour.'],
    ['cap', 'N', 'Con 19 o 20 dejé el kickboxing: ¡parkour a tope! Y algún trabajito de diseño.']],
  draw(ctx, t) {
    X.sky(ctx, 800, '#f6ead7', 0.4);
    rect(ctx, 80, 280, 330, 250, { fill: C.ltblue, stroke: C.black, lw: 7 });
    line(ctx, [[245, 280], [245, 530]], C.black, 5);
    const ex = 620;
    line(ctx, [[ex, 1070], [ex + 90, 560]], C.brown, 12); line(ctx, [[ex + 260, 1070], [ex + 170, 560]], C.brown, 12);
    rect(ctx, ex - 10, 520, 280, 300, { fill: '#ffffff', stroke: C.black, lw: 7 });
    const pr = clamp(t / 5, 0, 1);
    if (pr > 0.2) X.sun(ctx, ex + 80, 620, 36 * Math.min(1, pr * 1.5), t);
    if (pr > 0.5) X.ground(ctx, 0, C.green, C.dkgreen, 0, 0) || null;
    if (pr > 0.5) fill(ctx, [[ex, 740], [ex + 260, 720], [ex + 260, 810], [ex, 810]], C.green, { spacing: 10 });
    if (pr > 0.8) X.tree(ctx, ex + 190, 790, 0.5);
    rect(ctx, 250, 960, 110, 20, { fill: C.brown, stroke: C.black, lw: 5 });
    who(this, 'teen', ctx, 330, 960, LOOK.teen, 'draw', t);
    circle(ctx, 140, 1000, 60, { ry: 40, fill: C.ltbrown, stroke: C.black, lw: 5 });
    for (const [px, pc] of [[110, C.red], [150, C.blue], [180, C.yellow]]) dot(ctx, px, 990, 12, pc);
    if (this.idx(t) >= 0) {
      X.bubble(ctx, 120, 300, 260, 150, 330, 700);
      const u = (t * 1.5) % 1;
      person(ctx, 170 + u * 160, 440 - Math.sin(u * Math.PI) * 80, LOOK.teen, 'tuck', t, { scale: 0.3, rot: u * 6.28 });
    }
    if (this.idx(t) === 1) {
      const u = t - this.L[1].start;
      rect(ctx, 480, 260, 480, 230, { fill: '#ffffff', stroke: C.navy, lw: 6 });
      title(ctx, 'KICKBOXING', 510, 280, 5, C.black);
      line(ctx, [[500, 290], [820, 330]], C.red, 10);
      if (u > 1.5) title(ctx, 'PARKOUR ✓', 510, 350, 5, C.dkgreen);
      if (u > 3) title(ctx, 'DISEÑO +1', 510, 420, 5, C.purple);
    }
  },
}));

// 12. VUELTA AL KICK + PANDEMIA
SCENES.push(new Scene({
  name: 'Pandemic', music: 'night',
  lines: [['cap', 'N', 'Parkour hasta los 22. A los 23 volví al kickboxing con ganas de competir.'],
    ['cap', 'N', 'Pero llegó la pandemia... y todo se cerró.']],
  setupTimes() { const s1 = this.L[1].start; this.sfx = [[s1, 'rain', this.dur - s1, 0.16], [s1 + 0.3, 'door']]; for (let s = 0.8; s < s1; s += 0.8) this.sfx.push([s, 'punch']); },
  draw(ctx, t) {
    const i = this.idx(t);
    if (i < 1) {
      X.sky(ctx, 800, '#dfe7f2', 0.4);
      rect(ctx, 560, 290, 380, 200, { fill: '#ffffff', stroke: C.black, lw: 7 });
      title(ctx, '¡A COMPETIR!', 580, 350, 6, C.red);
      X.bag(ctx, 760, 600, C.red, Math.sin(t * 8) * 20);
      const pose = Math.floor(t * 1.25) % 2 ? 'punch' : 'guard';
      person(ctx, 520, 1080, LOOK.youngFight, pose, t);
    } else {
      X.sky(ctx, 1110, C.navy, 0.45);
      rect(ctx, 300, 330, 560, 720, { fill: C.grey, stroke: C.black, lw: 7 });
      rect(ctx, 400, 560, 360, 490, { fill: C.ltgrey, stroke: C.black, lw: 7 });
      for (let y = 590; y < 1050; y += 40) line(ctx, [[400, y], [760, y]], C.grey, 5);
      title(ctx, 'GIMNASIO', 400, 380, 7, C.yellow);
      rect(ctx, 430, 700, 300, 90, { fill: C.red, stroke: C.black, lw: 6 });
      title(ctx, 'CERRADO', 460, 715, 7, '#ffffff');
      for (let k = 0; k < 4; k++) {
        const vx = 160 + k * 240 + Math.sin(t * 2 + k) * 30, vy = 300 + (k % 2) * 180 + Math.cos(t * 1.5 + k) * 30;
        circle(ctx, vx, vy, 34, { fill: C.green, stroke: C.dkgreen, lw: 5 });
        for (let q = 0; q < 8; q++) { const a = q / 8 * 6.28; line(ctx, [[vx + Math.cos(a) * 34, vy + Math.sin(a) * 34], [vx + Math.cos(a) * 52, vy + Math.sin(a) * 52]], C.dkgreen, 5); }
        dot(ctx, vx - 10, vy - 6, 5, C.black); dot(ctx, vx + 10, vy - 6, 5, C.black);
        line(ctx, [[vx - 10, vy + 14], [vx, vy + 8], [vx + 10, vy + 14]], C.black, 4);
      }
      person(ctx, 180, 1080, LOOK.young, 'sad', t);
      const r = D.rngFor(3);
      for (let k = 0; k < 60; k++) { const x = (r() * 1080 + t * 60) % 1080, y = (r() * 1000 + t * 600) % 950 + 170; line(ctx, [[x, y], [x - 8, y + 30]], C.ltblue, 4, { passes: 1 }); }
    }
  },
}));

// 13. NEGOCIO DE DISEÑO
SCENES.push(new Scene({
  name: 'Business', music: 'action', amb: [['tick']],
  lines: [['cap', 'N', 'Monté un negocio de diseño... y acabé muy, muy quemado.'],
    ['say', 'young', '¡Se acabó! ¡Lo dejo!']],
  setupTimes() { const e = this.L[1].start; this.sfx = [[0.3, 'typing', e - 0.3], [1, 'fire', e - 1], [e + 0.6, 'door']]; },
  draw(ctx, t) {
    X.sky(ctx, 800, '#d9d6ef', 0.4);
    circle(ctx, 880, 380, 90, { fill: '#ffffff', stroke: C.black, lw: 7 });
    const a = t * 6;
    line(ctx, [[880, 380], [880 + Math.cos(a) * 70, 380 + Math.sin(a) * 70]], C.black, 7);
    line(ctx, [[880, 380], [880 + Math.cos(a / 12) * 45, 380 + Math.sin(a / 12) * 45]], C.black, 9);
    rect(ctx, 150, 860, 800, 40, { fill: C.brown, stroke: C.black, lw: 7 });
    line(ctx, [[190, 900], [190, 1080]], C.black, 9); line(ctx, [[910, 900], [910, 1080]], C.black, 9);
    const i = this.idx(t);
    const on = i < 1 || t < this.L[1].start + 0.6;
    for (let k = 0; k < 3; k++) {
      const mx = 470 + k * 160;
      rect(ctx, mx, 700, 140, 110, { fill: on ? ['#ffe6e6', '#e6f7ff', '#fff6d6'][k] : C.black, stroke: C.black, lw: 6 });
      if (on) { circle(ctx, mx + 40, 740, 20, { fill: [C.red, C.blue, C.yellow][k], stroke: null }); line(ctx, [[mx + 70, 735], [mx + 120, 735]], C.grey, 5); line(ctx, [[mx + 70, 765], [mx + 110, 765]], C.grey, 5); }
      line(ctx, [[mx + 70, 810], [mx + 70, 860]], C.black, 7);
    }
    const cups = Math.min(8, 1 + Math.floor(t * 1.3));
    for (let k = 0; k < cups; k++) rect(ctx, 230 + (k % 4) * 50, 810 - Math.floor(k / 4) * 55, 38, 48, { fill: '#ffffff', stroke: C.black, lw: 4 });
    if (on) {
      who(this, 'young', ctx, 330, 1060, LOOK.young, 'type', t);
      const heat = clamp(t / this.L[0].end, 0, 1);
      for (let k = 0; k < 7; k++) {
        const fx = 270 + k * 20, fh = (40 + 60 * heat) * (0.6 + 0.4 * Math.sin(t * 12 + k * 1.7));
        shape(ctx, [[fx - 16, 610], [fx, 610 - fh], [fx + 16, 610]], { fill: k % 2 ? C.orange : C.red, stroke: C.red, lw: 4 });
      }
    } else {
      const u = t - this.L[1].start - 0.6;
      who(this, 'young', ctx, 330 - u * 200, 1060, LOOK.young, 'walk', t);
    }
    if (i === 1 && t < this.L[1].start + 0.6) this.anchor.young = [330, 590];
    title(ctx, 'ESTRÉS', 110, 240, 6, C.red);
    rect(ctx, 330, 245, 300, 40, { stroke: C.black, lw: 5 });
    fill(ctx, D.rectPts(335, 250, 290 * clamp(t / (this.L[0].end + 0.5), 0, 1), 30), C.red, { spacing: 8 });
  },
}));

// 14. PORTERO
SCENES.push(new Scene({
  name: 'Doorman', music: 'night', amb: [['club']],
  lines: [['cap', 'N', 'Me centré en competir y trabajé de portero de noche casi 2 años.'],
    ['say', 'young', 'Tú sí. Tú también. Tú... hoy no.']],
  draw(ctx, t) {
    X.sky(ctx, 1110, C.navy, 0.5);
    X.moon(ctx, 900, 280, 60);
    for (let k = 0; k < 6; k++) X.star(ctx, 100 + k * 130, 230 + (k % 2) * 80, 14);
    rect(ctx, 180, 420, 720, 640, { fill: '#6b3b5a', stroke: C.black, lw: 7 });
    rect(ctx, 420, 700, 240, 360, { fill: C.black, stroke: C.black, lw: 7 });
    const cols = [C.pink, C.yellow, C.teal, C.orange, C.purple];
    const on = Math.floor(t * 4) % 6 !== 0;
    'DISCO'.split('').forEach((ch, k) => title(ctx, ch, 330 + k * 90, 480, 14, on ? cols[(k + Math.floor(t * 3)) % 5] : C.grey));
    for (let k = 0; k < 3; k++) { const nx = 250 + k * 250 + Math.sin(t * 2 + k) * 20, ny = 650 - ((t * 60 + k * 70) % 180); dot(ctx, nx, ny, 12, cols[k]); line(ctx, [[nx + 10, ny], [nx + 10, ny - 50], [nx + 30, ny - 40]], cols[k], 5); }
    line(ctx, [[160, 1000], [160, 1070]], C.gold, 8); line(ctx, [[380, 1000], [380, 1070]], C.gold, 8);
    line(ctx, [[160, 1010], [270, 1040], [380, 1010]], C.red, 10);
    who(this, 'young', ctx, 760, 1080, LOOK.young, 'cross', t);
    const i = this.idx(t);
    const G = [LOOK.guest1, LOOK.guest2, LOOK.guest3];
    if (i < 1) G.forEach((g, k) => person(ctx, 80 + k * 120, 1080, g, 'stand', t, { scale: 0.85 }));
    else {
      const u = t - this.L[1].start;
      G.forEach((g, k) => {
        const st = k * 1.0;
        if (k < 2) { const x = 80 + k * 120 + Math.max(0, u - st) * 260; if (x < 560) person(ctx, x, 1080, g, u > st ? 'walk' : 'stand', t, { scale: 0.85 }); }
        else if (u < 2.4) person(ctx, 320 + Math.min(u, 2) * 60, 1080, g, 'walk', t, { scale: 0.85 });
        else person(ctx, 440 - (u - 2.4) * 250, 1080, g, 'walk', t, { scale: 0.85, expr: 'sad' });
      });
    }
  },
}));

// 15. RAPADITO
SCENES.push(new Scene({
  name: 'Buzz', music: 'silly',
  lines: [['cap', 'N', 'A los 26 y medio me empecé a quedar calvo...'],
    ['cap', 'N', 'Así que ¡máquina y rapadito! Ahora llevo el pelo cortito.'],
    ['say', 'vaj', 'Así pesa menos la cabeza para las patadas.']],
  setupTimes() { const s = this.L[1].start; this.sfx = [[s + 0.3, 'clipper', 3.2], [this.L[2].start - 0.2, 'sparkle']]; },
  draw(ctx, t) {
    X.sky(ctx, 1110, '#e3f2f7', 0.3);
    rect(ctx, 160, 230, 760, 860, { fill: '#ffffff', stroke: C.brown, lw: 14 });
    fill(ctx, D.rectPts(180, 250, 720, 820), C.ltblue, { spacing: 30, w: 16, alpha: 0.25 });
    const i = this.idx(t);
    const s = this.L[1].start;
    let lk = LOOK.balding;
    const u = t - s - 0.3;
    if (i >= 1 && u > 3.0) lk = LOOK.vaj;
    ctx.save(); ctx.beginPath(); ctx.rect(170, 240, 740, 840); ctx.clip();
    who(this, 'vaj', ctx, 540, 1470, lk, 'stand', t, { scale: 2.4 });
    ctx.restore();
    if (i === 0 && t > 1.5) X.label(ctx, '¡SE VA!', 700, 300, 610, 420, C.red, 6);
    if (i >= 1 && u > 0 && u < 3.2) {
      const cx = 380 + (u / 3.2) * 330, cy = 420 + Math.sin(u * 8) * 10;
      rect(ctx, cx - 40, cy - 40, 80, 170, { fill: C.grey, stroke: C.black, lw: 7 });
      rect(ctx, cx - 44, cy - 60, 88, 26, { fill: C.ltgrey, stroke: C.black, lw: 5 });
      const rr = D.rngFor(Math.floor(t * 12));
      for (let k = 0; k < 10; k++) line(ctx, [[cx + (rr() - .5) * 120, cy + rr() * 300], [cx + (rr() - .5) * 120 + 8, cy + rr() * 300 + 12]], '#3b2a20', 5, { passes: 1 });
    }
    if (i === 2) for (let k = 0; k < 4; k++) X.star(ctx, 380 + k * 110, 330 + (k % 2) * 30, 16 + Math.sin(t * 6 + k) * 5);
  },
}));

// 16. MARKETING + ZOOASIS
SCENES.push(new Scene({
  name: 'Zooasis', music: 'happy',
  lines: [['cap', 'N', 'Volví al marketing. Ahora me dedico al marketing digital para conseguir clientes.'],
    ['cap', 'N', 'Desde los 27 ayudo a Juanma (Eco Juanma), que tiene Zooasis: un refugio de perros en Albacete.'],
    ['say', 'juanma', '¡Vajtan! ¡Que los panas también quieren salir en internet!'],
    ['cap', 'N', 'Y monto sistemas online para refugios de animales. ¡En eso soy un crack!']],
  setupTimes() {
    this.sfx = [];
    for (let s = this.L[0].start + 1; s < this.L[1].start; s += 0.9) this.sfx.push([s, 'register']);
    for (let s = this.L[1].start + 0.5; s < this.dur; s += 1.3 + (s * 7 % 1)) this.sfx.push([s, 'bark']);
    for (let k = 0; k < 4; k++) this.sfx.push([this.L[3].start + 1 + k * 0.7, 'click']);
  },
  draw(ctx, t) {
    const i = this.idx(t);
    if (i < 1) {
      X.sky(ctx, 800, '#e8f4ea', 0.3);
      rect(ctx, 200, 420, 680, 440, { fill: C.grey, stroke: C.black, lw: 8 });
      rect(ctx, 230, 450, 620, 380, { fill: '#ffffff', stroke: null });
      shape(ctx, [[120, 860], [960, 860], [1000, 920], [80, 920]], { fill: C.ltgrey, stroke: C.black, lw: 7 });
      const u = clamp((t - 0.5) / 4, 0, 1);
      const pts = [[270, 790], [380, 740], [480, 760], [600, 650], [700, 610], [800, 500]];
      const n = Math.max(2, Math.floor(u * pts.length));
      line(ctx, pts.slice(0, n), C.green, 12);
      title(ctx, 'CLIENTES', 270, 470, 6, C.navy);
      for (let k = 0; k < 5; k++) { const a = t - 1 - k * 0.9; if (a > 0 && a < 2) { circle(ctx, 300 + k * 120, 380 - a * 90, 30, { fill: C.gold, stroke: C.orange, lw: 5 }); title(ctx, '+1', 285 + k * 120, 360 - a * 90, 4, C.black); } }
      person(ctx, 900, 1080, LOOK.vaj, 'point', t, { scale: 0.8 });
      return;
    }
    X.sky(ctx, 800, C.ltblue, 0.2);
    X.sun(ctx, 160, 300, 60, t);
    X.ground(ctx, 780, '#b7d97a', C.dkgreen, 6, 12);
    for (let x = 40; x < 1080; x += 70) line(ctx, [[x, 760], [x, 860]], C.brown, 9);
    line(ctx, [[20, 780], [1060, 780]], C.brown, 7); line(ctx, [[20, 830], [1060, 830]], C.brown, 7);
    rect(ctx, 600, 330, 360, 150, { fill: '#ffffff', stroke: C.dkgreen, lw: 8 });
    title(ctx, 'ZOOASIS', 630, 370, 8, C.dkgreen);
    line(ctx, [[700, 480], [700, 700]], C.brown, 10); line(ctx, [[860, 480], [860, 700]], C.brown, 10);
    const dogs = [[C.ltbrown, 'galgo', 0], ['#dddddd', 'galgo', 1.2], [C.brown, 'dog', 2], [C.black, 'dog', 3.1], [C.orange, 'galgo', 4]];
    dogs.forEach(([col, kind, ph], k) => {
      const span = 760, p = (t * 90 + ph * 200) % (2 * span);
      const x = 120 + (p < span ? p : 2 * span - p);
      X.dog(ctx, x, 1080 + (k % 2) * 40 - 30, col, t + ph, p < span ? 1 : -1, kind);
    });
    for (let k = 0; k < 3; k++) X.heart(ctx, 300 + k * 250 + Math.sin(t * 2 + k) * 20, 620 - ((t * 50 + k * 80) % 200), 1.8);
    who(this, 'juanma', ctx, 320, 1000, LOOK.juanma, 'phone', t, { scale: 0.9 });
    person(ctx, 520, 1000, LOOK.vaj, 'laptop', t, { scale: 0.9 });
    title(ctx, 'JUANMA', 230, 560, 5, C.dkgreen); title(ctx, 'YO', 500, 580, 5, C.navy);
    if (i === 3) {
      const u = t - this.L[3].start;
      rect(ctx, 150, 250, 780, 560, { fill: '#ffffff', stroke: C.navy, lw: 8 });
      rect(ctx, 150, 250, 780, 70, { fill: C.dkgreen, stroke: C.navy, lw: 8 });
      title(ctx, 'ADOPTA UN PANA', 190, 265, 6, '#ffffff');
      for (let k = 0; k < 3; k++) if (u > k * 0.6) {
        const bx = 190 + k * 250;
        rect(ctx, bx, 350, 210, 300, { fill: '#fffdf6', stroke: C.black, lw: 5 });
        X.dog(ctx, bx + 95, 520, [C.ltbrown, '#dddddd', C.black][k], t, 1, 'galgo');
        rect(ctx, bx + 30, 580, 150, 50, { fill: C.red, stroke: C.black, lw: 5 });
        title(ctx, 'ADOPTA', bx + 42, 588, 4, '#ffffff');
      }
      if (u > 2) title(ctx, 'ONLINE ✓', 330, 700, 7, C.dkgreen);
    }
  },
}));

// 17. COMBATES
SCENES.push(new Scene({
  name: 'Fights', music: 'epic', amb: [['crowd', 0.1]],
  lines: [['cap', 'N', 'Primero, kickboxing: ¡campeón de España de K1, +91 kg!'],
    ['cap', 'N', 'Luego empecé en MMA. Primer amateur: ¡gané! El segundo: perdí. El tercero: también perdí...'],
    ['cap', 'N', '¡Pero el PRO lo gané! Aunque acabé bastante reventado. XD']],
  setupTimes() {
    this.ko = 2.2;
    const L1 = this.L[1], L2 = this.L[2];
    this.t1 = L1.timeOf('¡GANÉ'); this.t2 = L1.timeOf('PERDÍ.'); this.t3 = L1.timeOf('TAMBIÉN');
    this.sfx = [[0.2, 'bell'], [1.2, 'punch'], [1.7, 'punch'], [this.ko, 'bigpunch'], [this.ko + 0.4, 'cheer'],
      [this.t1, 'fanfare'], [this.t2, 'sadtrombone'], [this.t3 + 0.4, 'sadtrombone'], [L2.start + 0.3, 'bell'], [L2.start + 0.8, 'cheer'], [L2.start + 1, 'fanfare']];
  },
  draw(ctx, t) {
    const i = this.idx(t);
    const crowd = () => {
      for (let k = 0; k < 12; k++) {
        const x = 50 + k * 90, y = 300 + (k % 2) * 30 - (Math.floor(t * 4 + k) % 2) * 10;
        circle(ctx, x, y, 34, { fill: [C.skin, C.skin2, C.ltbrown][k % 3], stroke: C.black, lw: 5, spacing: 10 });
        rect(ctx, x - 36, y + 34, 72, 80, { fill: [C.red, C.blue, C.green, C.purple][k % 4], stroke: C.black, lw: 5 });
        if (t > this.ko) line(ctx, [[x + 30, y + 40], [x + 50, y - 40]], C.black, 7);
      }
    };
    if (i < 1) {
      X.sky(ctx, 1110, '#2b2d42', 0.35);
      crowd();
      rect(ctx, 30, 1000, 1020, 70, { fill: C.ltblue, stroke: C.black, lw: 7 });
      for (const [yy, c] of [[720, C.red], [800, '#ffffff'], [880, C.blue]]) line(ctx, [[40, yy], [1040, yy]], c, 9);
      line(ctx, [[40, 680], [40, 1000]], '#ffffff', 12); line(ctx, [[1040, 680], [1040, 1000]], '#ffffff', 12);
      const kick = t > 1.9 && t < this.ko + 0.3;
      person(ctx, 380, 1000, LOOK.vajFight, kick ? 'kick' : (t < 1.9 ? (Math.floor(t * 2.5) % 2 ? 'punch' : 'guard') : 'win'), t);
      if (t < this.ko) person(ctx, 680, 1000, LOOK.rival, 'guard', t, { face: -1 });
      else person(ctx, 740, 1000, LOOK.rival, 'lie', t);
      if (t > this.ko && t < this.ko + 1.2) { X.burst(ctx, 600, 760, 110); title(ctx, 'K.O.', 520, 720, 9, C.red); }
      if (t > this.ko + 1.2) { X.star(ctx, 380, 520, 60, C.gold); title(ctx, 'CAMPEÓN', 240, 600, 8, C.gold); }
    } else if (i === 1) {
      X.sky(ctx, 1110, '#2b2d42', 0.35);
      for (let x = 0; x < 1080; x += 60) line(ctx, [[x, 180], [x + 60, 1100]], C.grey, 3, { passes: 1 });
      for (let x = 0; x < 1140; x += 60) line(ctx, [[x, 180], [x - 60, 1100]], C.grey, 3, { passes: 1 });
      rect(ctx, 130, 250, 820, 600, { fill: '#fffdf6', stroke: C.navy, lw: 8 });
      title(ctx, 'MIS PELEAS MMA', 190, 280, 7, C.navy);
      const rows = [[this.t1, 'AMATEUR 1', '✓', C.dkgreen], [this.t2, 'AMATEUR 2', 'X', C.red], [this.t3, 'AMATEUR 3', 'X', C.red]];
      rows.forEach(([tt, name, mk, col], k) => {
        if (t < tt) return;
        title(ctx, name, 190, 420 + k * 130, 7, C.black);
        title(ctx, mk, 780, 410 + k * 130, 10, col);
      });
      person(ctx, 880, 1080, LOOK.vajMMA, t > this.t2 ? 'sad' : 'guard', t, { scale: 0.7 });
    } else {
      X.sky(ctx, 1110, '#2b2d42', 0.35);
      crowd();
      for (let k = 0; k < 14; k++) { const r = D.rngFor(k); dot(ctx, r() * 1080, 180 + ((r() * 900 + t * 200) % 900), 8, [C.red, C.yellow, C.blue, C.pink][k % 4]); }
      person(ctx, 540, 1080, LOOK.vajBeaten, 'win', t, { scale: 1.1 });
      rect(ctx, 420, 900, 240, 60, { fill: C.gold, stroke: C.black, lw: 7 });
      circle(ctx, 540, 930, 36, { fill: C.yellow, stroke: C.black, lw: 5 });
      title(ctx, 'PRO ✓', 110, 500, 9, C.gold);
      title(ctx, 'XD', 820, 520, 11, C.purple);
    }
  },
}));

// 18. FINAL
SCENES.push(new Scene({
  name: 'End', music: 'end', post: 5.5, amb: [['birds']],
  lines: [['cap', 'N', 'Llegué con 8 años. Hoy, 23 años después, esta es mi casa.'],
    ['cap', 'N', 'Ucrania, Georgia y España en el corazón. ¡Y la aventura sigue!']],
  setupTimes() { this.fin = this.L[1].end + HOLD; this.sfx = [[this.fin, 'tada']]; },
  hideCap(t) { return t > this.fin; },
  draw(ctx, t) {
    X.sky(ctx, 800, C.orange, 0.3);
    X.sun(ctx, 540, 620, 120, t, C.yellow);
    X.ground(ctx, 800, C.green, C.dkgreen, 7, 40);
    X.flag(ctx, 150, 1000, 'UA', t, 0.9); X.flag(ctx, 330, 980, 'GE', t + 0.5, 0.9); X.flag(ctx, 800, 990, 'ES', t + 1, 0.9);
    person(ctx, 560, 1080, LOOK.vaj, 'wave', t);
    X.dog(ctx, 720, 1080, C.ltbrown, t, 1, 'galgo');
    for (let k = 0; k < 4; k++) X.heart(ctx, 420 + k * 90, 560 - ((t * 40 + k * 60) % 160), 1.4);
    if (t > this.fin) {
      const u = t - this.fin;
      rect(ctx, 150, 220, 780, 330, { fill: '#fffdf6', stroke: C.red, lw: 9 });
      titleC(ctx, 'FIN', 250, 18, C.red, u * 6, 540);
      titleC(ctx, 'HISTORIA Y AVENTURAS DE', 1160, 6, C.navy, (u - 0.8) * 20, 500);
      titleC(ctx, 'VAJTAN, EL SÚPER NENE', 1240, 7.5, C.red, (u - 2) * 20, 500);
      if (u > 3.2) titleC(ctx, '¿CONTINUARÁ...?', 1340, 6, C.purple, 99, 500);
    }
  },
}));

// ================================================================ PLAN / AUDIO / RENDER
function plan() {
  for (;;) {
    let t = 0;
    for (const sc of SCENES) { sc.schedule(t); t += sc.dur; }
    if (t <= TARGET || CPS >= 33) { SCENES[SCENES.length - 1].dur += TARGET - t; return TARGET; }
    CPS += 0.5;
  }
}

function buildAudio(total) {
  const buf = AU.makeBuf(total);
  const music = AU.makeBuf(total);
  SCENES.forEach((sc, k) => {
    AU.music(music, sc.t0, sc.dur, sc.music, 100 + k);
    for (const a of sc.amb) AU.SFX[a[0]](buf, sc.t0, sc.dur, ...a.slice(1));
    for (const s of sc.sfx || []) AU.SFX[s[1]](buf, sc.t0 + s[0], ...s.slice(2));
    if (k > 0) AU.SFX.whoosh(buf, sc.t0);
    for (const ln of sc.L) ln.times.forEach((tm, i) => { if (ln.flat[i] !== ' ' && i % 2 === 0) AU.SFX.scribble(buf, sc.t0 + tm); });
  });
  for (let i = 0; i < buf.length; i++) buf[i] = buf[i] * 0.9 + music[i] * 0.45;
  return buf;
}

function main() {
  const total = plan();
  console.log('CPS', CPS);
  SCENES.forEach(s => console.log(s.name.padEnd(12), s.t0.toFixed(2), s.dur.toFixed(2)));
  const canvas = D.createCanvas(D.W, D.H);
  const ctx = canvas.getContext('2d');
  const args = process.argv;
  if (args.includes('--preview')) {
    const only = args.includes('--scene') ? args[args.indexOf('--scene') + 1] : null;
    const dir = path.join(__dirname, 'preview');
    fs.mkdirSync(dir, { recursive: true });
    for (const sc of SCENES) {
      if (only && sc.name !== only) continue;
      [0.3, 0.8].forEach((f, k) => {
        D.beginFrame(k + 1);
        sc.render(ctx, sc.dur * f);
        fs.writeFileSync(path.join(dir, `${sc.name}_${k}.png`), canvas.toBuffer('image/png'));
      });
    }
    return;
  }
  const wav = path.join(__dirname, '_audio.wav');
  AU.writeWav(wav, buildAudio(total));
  const ff = execSync('python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim();
  const p = spawn(ff, ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${D.W}x${D.H}`, '-r', String(FPS),
    '-i', '-', '-i', wav, '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-tune', 'animation', '-pix_fmt', 'yuv420p',
    '-r', '24', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  const nf = Math.round(total * FPS);
  let si = 0;
  const writeFrame = (buf) => new Promise(res => { if (!p.stdin.write(buf)) p.stdin.once('drain', res); else res(); });
  (async () => {
    for (let fi = 0; fi < nf; fi++) {
      const gt = fi / FPS;
      while (si + 1 < SCENES.length && gt >= SCENES[si + 1].t0) si++;
      const sc = SCENES[si], lt = gt - sc.t0;
      D.beginFrame(Math.floor(fi / 2));
      sc.render(ctx, lt);
      const fin = Math.min(1, lt / 0.25), fout = si === SCENES.length - 1 ? Math.min(1, (sc.dur - lt) / 1.0) : 1;
      if (fin < 1) { ctx.save(); ctx.globalAlpha = 1 - fin; ctx.drawImage(D.paper(), 0, 0); ctx.restore(); }
      if (fout < 1) { ctx.save(); ctx.globalAlpha = 1 - fout; ctx.fillStyle = '#fbf7ec'; ctx.fillRect(0, 0, D.W, D.H); ctx.restore(); }
      const img = ctx.getImageData(0, 0, D.W, D.H);
      await writeFrame(Buffer.from(img.data.buffer));
      if (fi % 120 === 0) console.log(`frame ${fi}/${nf}`);
    }
    p.stdin.end();
    p.on('close', () => { fs.unlinkSync(wav); console.log('OK ->', OUT); });
  })();
}
main();
