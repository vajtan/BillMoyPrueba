// v7 · Historia y aventuras de Vajtan — estilo grabado / tratado tecnico.
// Uso: node main.js            -> render completo
//      node main.js preview N t1,t2,...  -> PNGs de la escena N en preview/
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const E = require('./engrave');
const PL = require('./plates');
const AU = require('./audio');
const { W, H, C, clamp, lerp, pr, eout, eio, line, label } = E;

const FPS = 24, TARGET = 175;
const OUT = path.join(__dirname, '..', 'vajtan_aventuras_grabado_9x16.mp4');

const S = [
  { f: 'title', dur: 7, year: 1995, head: 'HISTORIA Y AVENTURAS DE VAJTAN', sub: 'el súper nene', ch: 'TRATADO Nº 1 · 1995—2026', body: 'Una vida contada como un tratado: con regla, compás y alguna que otra caída.', cap: 'Lám. I — Construcción del círculo con compás', mus: 'warm', sfx: [[0.3, 'pen', 1.8], [2.2, 'pen', 3], [5.0, 'sparkle']] },
  { f: 'family', dur: 8.5, year: 2000, age: '5 AÑOS', head: 'NACÍ EN UCRANIA', ch: 'CAP. I', body: 'Papá, mamá, mi hermana —dos años menor— y yo. Una familia pequeña.', cap: 'Lám. II — Estaturas de la familia, en centímetros', mus: 'warm', sfx: [[0.2, 'pen', 4]] },
  { f: 'dadLeaves', dur: 8.5, year: 2001, age: '5 ½ AÑOS', head: 'PAPÁ SE FUE PRIMERO', ch: 'CAP. II', body: 'Yo tenía cinco años, casi seis. Se fue a España a trabajar para poder traernos.', cap: 'Lám. III — Cronofotografía de una despedida', mus: 'melancholy', sfx: [[0.2, 'pen', 2], [1.6, 'steps', 5.2], [3.0, 'pen', 1.6]], amb: [['wind', 0, 8]] },
  { f: 'route', dur: 8.5, year: 2003, age: '8 AÑOS', head: 'CRUZAMOS EUROPA', ch: 'CAP. III', body: 'Con ocho años, mamá, mi hermana y yo fuimos a buscarle.', cap: 'Lám. IV — Ruta ortodrómica Ucrania → Tomelloso', mus: 'uplift', sfx: [[0.2, 'pen', 2.8], [3.0, 'riser', 2.2], [5.2, 'pop']] },
  { f: 'tomelloso', dur: 7.5, year: 2003, head: 'TOMELLOSO', ch: 'CAP. IV', body: 'La Mancha. Otro idioma, otro colegio y papá esperándonos.', cap: 'Lám. V — Molino de viento manchego', mus: 'uplift', sfx: [[0.3, 'pen', 3]], amb: [['wind', 0, 7.5], ['birds', 0, 7.5], ['creak', 0.5, 7]] },
  { f: 'noBall', dur: 8, year: 2003, head: 'NI UN BALÓN', ch: 'CAP. V', body: 'Los demás jugaban al fútbol. Yo era un niño un poco raro: un chaval de artes.', cap: 'Lám. VI — Icosaedro truncado (sin usar)', mus: 'quirky', sfx: [[0.2, 'pen', 2.6], [3.0, 'swoosh'], [3.9, 'stamp'], [4.3, 'pen', 2.4]] },
  { f: 'guard', dur: 8, year: 2004, age: '8 ½ AÑOS', head: 'GUARDIA ARRIBA', ch: 'CAP. VI', body: 'Con ocho y medio papá me apuntó a kickboxing. Boxeo no había.', cap: 'Lám. VII — Posición de guardia y saco pesado', mus: 'drive', sfx: [[0.3, 'bell'], [0.4, 'pen', 2.2], [3.3, 'punch'], [4.2, 'punch'], [4.6, 'bigpunch'], [5.6, 'punch']] },
  { f: 'fly', dur: 8.5, year: 2007, age: '12 AÑOS', head: 'APRENDÍ A VOLAR', ch: 'CAP. VII', body: 'A los doce descubrí el parkour. Piripi, piripa… pa, pam, pam, pim.', cap: 'Lám. VIII — Trayectoria de un salto de precisión', mus: 'drive', sfx: [[0.2, 'pen', 2.2], [1.0, 'steps', 2, 0.25], [3.0, 'whoosh'], [4.6, 'door']] },
  { f: 'fall', dur: 9, year: 2011, age: '16 AÑOS', head: 'CAÍ', ch: 'CAP. VIII', body: 'Con dieciséis, casi diecisiete, hice un mortal en un gimnasio. Aterricé de cabeza sobre el tatami.', cap: 'Lám. IX — Mortal atrás con rotación insuficiente', mus: 'tension', sfx: [[0.2, 'pen', 1.6], [1.4, 'riser', 2.2], [2.0, 'whoosh'], [3.7, 'impact'], [4.3, 'heart', 4]] },
  { f: 'atlas', dur: 9, year: 2011, head: 'ATLAS · C1', ch: 'CAP. IX', body: 'Me rompí el atlas: la primera vértebra, la que sostiene la cabeza.', cap: 'Lám. X — Atlas (C1), vista superior', mus: 'melancholy', sfx: [[0.2, 'xray', 3], [0.3, 'pen', 2.4], [3.2, 'punch'], [3.4, 'click'], [3.6, 'click']] },
  { f: 'brace', dur: 8, year: 2012, age: '17 AÑOS', head: 'NOVENTA DÍAS', ch: 'CAP. X', body: 'Tres meses con collarín. Mucho techo y mucho tiempo para pensar.', cap: 'Lám. XI — Calendario de inmovilización', mus: 'melancholy', sfx: [[0.2, 'pen', 2], [1.8, 'tick', 4.2]] },
  { f: 'eye', dur: 8, year: 2012, head: 'CAMBIÓ MI MIRADA', ch: 'CAP. XI', body: 'Cambió cómo veo el mundo. Sobre todo, la política mundial.', cap: 'Lám. XII — Óptica del ojo: la imagen se endereza', mus: 'reflect', sfx: [[0.2, 'pen', 3], [4.6, 'sparkle']] },
  { f: 'flyAgain', dur: 8, year: 2012, head: 'VOLVÍ A SALTAR', ch: 'CAP. XII', body: 'Ocho meses después volví al parkour y salté más que nunca. Kickboxing, suave.', cap: 'Lám. XIII — Salto entre azoteas', mus: 'uplift', sfx: [[0.2, 'pen', 2.2], [1.0, 'steps', 2, 0.25], [3.0, 'whoosh'], [4.8, 'door'], [5.0, 'win']] },
  { f: 'golden', dur: 8, year: 2013, age: '17—19', head: 'ARTE', ch: 'CAP. XIII', body: 'De los 17 a los 19 estudié artes. Proporción, forma y color.', cap: 'Lám. XIV — Rectángulo áureo y su espiral', mus: 'reflect', sfx: [[0.2, 'pen', 5], [4.6, 'sparkle']] },
  { f: 'kick', dur: 9, year: 2018, age: '23 AÑOS', head: 'DE VUELTA AL RING', ch: 'CAP. XIV', body: 'A los 19 dejé el kickboxing: parkour a tope hasta los 22 y primeros trabajos de diseño. A los 23 volví para competir.', cap: 'Lám. XV — Patada circular, estudio del arco', mus: 'drive', sfx: [[0.3, 'bell'], [0.4, 'pen', 1.6], [2.0, 'whoosh'], [2.45, 'bigpunch'], [4.2, 'whoosh'], [4.65, 'bigpunch'], [6.4, 'whoosh'], [6.85, 'bigpunch']] },
  { f: 'virus', dur: 6.5, year: 2020, head: 'TODO SE CERRÓ', ch: 'CAP. XV', body: 'Y entonces llegó la pandemia.', cap: 'Lám. XVI — Virión de simetría icosaédrica', mus: 'night', sfx: [[0.2, 'pen', 2.6], [0.2, 'xray', 4]] },
  { f: 'candle', dur: 8, year: 2021, head: 'QUEMADO', ch: 'CAP. XVI', body: 'Monté un negocio de diseño. Lo di todo, acabé quemado y lo dejé.', cap: 'Lám. XVII — Vela encendida por los dos extremos', mus: 'night', sfx: [[0.2, 'pen', 1.4], [-1.7, 'swoosh']], amb: [['fire', 1.2, -1.7]] },
  { f: 'doorman', dur: 8, year: 2021, head: 'TÚ SÍ. TÚ NO.', ch: 'CAP. XVII', body: 'Me centré en competir y trabajé casi dos años de portero de noche.', cap: 'Lám. XVIII — Recuento de noches en la puerta', mus: 'night', sfx: [[0.3, 'pen', 2]], amb: [['club', 0, 8]] },
  { f: 'shave', dur: 8, year: 2022, age: '26 ½ AÑOS', head: 'MÁQUINA AL UNO', ch: 'CAP. XVIII', body: 'A los 26 y medio empecé a perder pelo. Me lo rapé con la máquina. Sin dramas.', cap: 'Lám. XIX — Perfil con líneas de construcción', mus: 'quirky', sfx: [[0.2, 'pen', 2], [2.2, 'clipper', 3]] },
  { f: 'panas', dur: 9.5, year: 2022, age: '27 AÑOS', head: 'LOS PANAS', ch: 'CAP. XIX', body: 'Desde los 27 ayudo a Juanma, Eco Juanma, fundador de Zooasis, un refugio en Albacete. Sus perros son los panas.', cap: 'Lám. XX — Galgo español, un pana', mus: 'warm', sfx: [[0.3, 'pen', 3], [2.0, 'bark'], [5.0, 'bark']], amb: [['birds', 0, 9]] },
  { f: 'ledger', dur: 9.5, year: 2024, head: 'EL REGISTRO', ch: 'CAP. XX', body: 'Primero kickboxing: campeón de España de K1. Luego MMA: gané, perdí, perdí… y gané el profesional.', cap: 'Lám. XXI — Libro de combates', mus: 'triumph', sfx: [[0.2, 'pen', 1], [1.0, 'pen', 4], [1.4, 'stamp'], [2.15, 'stamp'], [2.9, 'stamp'], [3.65, 'stamp'], [4.4, 'stamp'], [4.5, 'cheer'], [5.4, 'pen', 1]] },
  { f: 'funnel', dur: 8.5, year: 2026, age: 'HOY', head: 'MARKETING', ch: 'CAP. XXI', body: 'Hoy hago marketing digital para captar clientes. Y monto sistemas online para refugios de animales.', cap: 'Lám. XXII — Embudo de captación', mus: 'uplift', sfx: [[0.2, 'pen', 2], [1.6, 'typing', 5], [3.0, 'coin'], [4.5, 'coin'], [6.0, 'register']] },
  { f: 'home', dur: 10, year: 2026, head: 'AQUÍ ESTOY', ch: 'EPÍLOGO', body: 'Llegué con ocho años. Veintitrés años después, España es mi casa.', cap: 'Lám. XXIII — Ucrania · Georgia · España', mus: 'warm', sfx: [[0.2, 'pen', 3], [3.0, 'riser', 1.5], [-2.6, 'stamp'], [-2.5, 'win']] },
];
// ajustar al objetivo
{
  const tot = S.reduce((a, s) => a + s.dur, 0), k = TARGET / tot;
  let t = 0;
  for (const s of S) { s.dur = Math.round(s.dur * k * FPS) / FPS; s.t0 = t; t += s.dur; }
  S.total = t;
}
const ROMAN = (n) => { const m = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let o = ''; for (const [v, r] of m) while (n >= v) { o += r; n -= v; } return o; };

// ------------------------------------------------------------------ tipografia
const HX = 72, HW = 900;
function layoutHead(ctx, s) {
  for (let fs = 100; fs >= 60; fs -= 4) {
    ctx.font = fs + 'px SerifB';
    const sp = fs * 0.04, words = s.split(' '), lines = [[]];
    let w = 0;
    for (const wd of words) {
      const ww = E.spacedW(ctx, wd, sp), space = fs * 0.32;
      if (lines[lines.length - 1].length && w + space + ww > HW) { lines.push([]); w = 0; }
      const L = lines[lines.length - 1];
      L.push({ wd, x: w ? w + space : 0, w: ww }); w = (w ? w + space : 0) + ww;
    }
    if (lines.length <= 2) return { fs, sp, lines };
  }
}
function layoutBody(ctx, s) {
  for (let fs = 40; fs >= 30; fs -= 2) { ctx.font = fs + 'px Serif'; const lines = wrap(ctx, s, 880); if (lines.length <= 3) return { fs, lines }; }
  ctx.font = '30px Serif'; return { fs: 30, lines: wrap(ctx, s, 880) };
}
function wrap(ctx, s, maxW) { const words = s.split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } lines.push(cur); return lines; }

function drawHead(ctx, s, t) {
  if (!s._head) s._head = layoutHead(ctx, s.head);
  const { fs, sp, lines } = s._head;
  let idx = 0;
  const y0 = lines.length === 1 ? 470 : 405;
  s._words = [];
  lines.forEach((L, li) => {
    for (const w of L) {
      const tw = 0.15 + idx * 0.2; s._words.push(tw);
      const k = pr(t, tw, 0.22);
      if (k > 0) {
        const e = eout(k);
        ctx.save(); ctx.globalAlpha = e; ctx.fillStyle = C.ink; ctx.font = fs + 'px SerifB';
        const x = HX + w.x, y = y0 + li * fs * 1.02;
        ctx.translate(x + w.w / 2, y - fs * 0.35); ctx.scale(lerp(1.25, 1, e), lerp(1.25, 1, e)); ctx.translate(-(x + w.w / 2), -(y - fs * 0.35));
        E.spaced(ctx, w.wd, x, y - (1 - e) * 20, sp);
        ctx.restore();
      }
      idx++;
    }
  });
  if (s.sub) label(ctx, s.sub, HX, y0 + lines.length * fs * 1.02 + 6, { font: 'italic 46px SerifI', p: pr(t, 0.9, 0.8), sp: 1 });
}
function drawBody(ctx, s, t) {
  if (!s._body) s._body = layoutBody(ctx, s.body);
  const { fs, lines } = s._body;
  const lh = fs * 1.3, y0 = 1228 + (3 - lines.length) * lh * 0.5;
  let wi = 0; const t0 = 0.9, rate = 0.13;
  ctx.save(); ctx.font = fs + 'px Serif'; ctx.fillStyle = C.ink;
  lines.forEach((L, li) => {
    let x = HX;
    for (const w of L.split(' ')) {
      const k = pr(t, t0 + wi * rate, 0.25);
      if (k > 0) { ctx.globalAlpha = k; ctx.fillText(w, x, y0 + li * lh + (1 - eout(k)) * 8); }
      x += ctx.measureText(w + ' ').width; wi++;
    }
  });
  ctx.restore();
}

// ------------------------------------------------------------------ marco, cronologia
const Y0 = 1995, Y1 = 2026, TLX0 = 370, TLX1 = 930, TLY = 1405;
const yx = (y) => lerp(TLX0, TLX1, (y - Y0) / (Y1 - Y0));
function frame(ctx, T, si, s, t) {
  // marco de lamina
  ctx.save(); ctx.strokeStyle = C.ink; ctx.globalAlpha = 0.8;
  ctx.lineWidth = 1.2; ctx.strokeRect(44, 212, 992, 1240);
  ctx.lineWidth = 0.6; ctx.strokeRect(52, 220, 976, 1224);
  ctx.restore();
  for (const [x, y] of [[44, 212], [1036, 212], [44, 1452], [1036, 1452]]) { line(ctx, [[x - 14, y], [x + 14, y]], { w: 1 }); line(ctx, [[x, y - 14], [x, y + 14]], { w: 1 }); }
  label(ctx, 'HISTORIA Y AVENTURAS DE VAJTAN', HX, 252, { font: '17px Mono', sp: 2.5 });
  label(ctx, 'LÁM. ' + String(si + 1).padStart(2, '0') + ' / ' + S.length, 1008, 252, { font: '17px Mono', sp: 2.5, align: 'right' });
  line(ctx, [[HX, 266], [1008, 266]], { w: 1 });
  line(ctx, [[HX, 1188], [1008, 1188]], { w: 0.8, a: 0.7 });
  line(ctx, [[HX, 1348], [1008, 1348]], { w: 1 });
  // ano grande con cuenta rodante
  const prev = si > 0 ? S[si - 1].year : s.year;
  const yv = Math.round(lerp(prev, s.year, eio(pr(t, 0.1, 0.8))));
  ctx.save(); ctx.fillStyle = C.ink; ctx.font = '76px SerifB'; ctx.fillText(String(yv), HX - 4, 1436); ctx.restore();
  if (s.age) label(ctx, s.age, HX + 2, 1374, { font: '18px Mono', col: C.red, p: pr(t, 0.4, 0.5) });
  // regla de cronologia
  line(ctx, [[TLX0, TLY], [TLX1, TLY]], { w: 1.6 });
  for (let y = Y0; y <= Y1; y++) {
    if (y === Y1) label(ctx, String(y), yx(y), TLY + 24, { font: '15px Mono', align: 'center', sp: 0 });
    const x = yx(y), maj = y % 5 === 0;
    line(ctx, [[x, TLY], [x, TLY - (maj ? 16 : 8)]], { w: maj ? 1.5 : 1 });
    if (maj && y !== 2025) label(ctx, String(y), x, TLY + 24, { font: '15px Mono', align: 'center', sp: 0 });
  }
  // hitos pasados
  for (let i = 0; i <= si; i++) { const x = yx(S[i].year); ctx.save(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x, TLY, 3.5, 0, 7); ctx.fill(); ctx.restore(); }
  const mx = yx(lerp(prev, s.year, eio(pr(t, 0.1, 0.8))));
  line(ctx, [[TLX0, TLY], [mx, TLY]], { w: 3.4, col: C.red });
  ctx.save(); ctx.fillStyle = C.red; ctx.beginPath(); ctx.moveTo(mx, TLY - 20); ctx.lineTo(mx - 9, TLY - 36); ctx.lineTo(mx + 9, TLY - 36); ctx.closePath(); ctx.fill(); ctx.restore();
  void T;
}

// ------------------------------------------------------------------ escena
const DY = 30;
const layer = E.createCanvas(W, H), lx = layer.getContext('2d');
function drawScene(ctx, si, t) {
  const s = S[si];
  lx.clearRect(0, 0, W, H);
  label(lx, s.ch + (s.year && si > 0 ? ' · ' + s.year : ''), HX, 312, { font: '20px Mono', col: C.red, sp: 3, p: pr(t, 0.05, 0.5) });
  drawHead(lx, s, t);
  PL[s.f](lx, t, s.dur);
  label(lx, s.cap, HX, 1172, { font: 'italic 23px SerifI', sp: 0.5, p: pr(t, 1.2, 1.0), a: 0.9 });
  drawBody(lx, s, t);
  const fo = 1 - pr(t, s.dur - 0.35, 0.35);
  ctx.drawImage(E.paper(), 0, 0);
  ctx.save(); ctx.translate(0, DY);
  frame(ctx, s.t0 + t, si, s, t);
  ctx.globalAlpha = fo; ctx.drawImage(layer, 0, 0); ctx.restore();
}

// ------------------------------------------------------------------ audio
function buildAudio(wav) {
  const N = S.total + 1.5;
  const buf = AU.makeBuf(N), mus = AU.makeBuf(N);
  // musica por tramos del mismo animo
  let i = 0;
  while (i < S.length) {
    let j = i; while (j + 1 < S.length && S[j + 1].mus === S[i].mus) j++;
    const t0 = S[i].t0, dur = S[j].t0 + S[j].dur - t0;
    AU.music2(mus, Math.max(0, t0 - 0.3), dur + 0.8, S[i].mus, i + 3);
    i = j + 1;
  }
  const SFX = Object.assign({}, AU.SFX, {
    steps: (b, t, dur, gap = 0.5) => { for (let tt = t; tt < t + dur; tt += gap) AU.SFX.snowstep(b, tt); },
  });
  const tt = (s, v) => v < 0 ? s.dur + v : v;
  for (const s of S) {
    // golpe sordo por palabra del titular
    const n = s.head.split(' ').length;
    for (let k = 0; k < n; k++) SFX.thud(buf, s.t0 + 0.15 + k * 0.2, 0.35);
    SFX.paper(buf, s.t0);
    for (const e of s.sfx || []) SFX[e[1]](buf, s.t0 + tt(s, e[0]), ...e.slice(2).map((v, q) => q === 0 && e[1] !== 'steps' && typeof v === 'number' && v < 0 ? tt(s, v) - tt(s, e[0]) : v));
    for (const a of s.amb || []) { const a0 = tt(s, a[1]), a1 = tt(s, a[2]); SFX[a[0]](buf, s.t0 + a0, a[0] === 'creak' ? a1 - a0 : a1 - a0); }
  }
  for (let k = 0; k < buf.length; k++) buf[k] = Math.tanh((buf[k] * 0.9 + mus[k] * 0.5) * 1.1) * 0.9;
  AU.writeWav(wav, buf);
}

// ------------------------------------------------------------------ main
const ff = () => execSync('python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim();
async function main() {
  const cv = E.createCanvas(W, H), ctx = cv.getContext('2d');
  const args = process.argv.slice(2);
  if (args[0] === 'preview') {
    fs.mkdirSync(path.join(__dirname, 'preview'), { recursive: true });
    const list = args[1] === 'all' ? S.map((_, i) => i) : args[1].split(',').map(Number);
    for (const si of list) {
      const ts = args[2] ? args[2].split(',').map(Number) : [S[si].dur * 0.5, S[si].dur - 0.5];
      for (const t of ts) { drawScene(ctx, si, t); fs.writeFileSync(path.join(__dirname, 'preview', `s${String(si).padStart(2, '0')}_${t.toFixed(1)}.png`), cv.toBuffer('image/png')); }
    }
    console.log('total', S.total.toFixed(2));
    return;
  }
  const wav = path.join(__dirname, '_audio.wav');
  const NF = Math.round(S.total * FPS);
  if (args[0] === 'scan') { let si = 0; for (let f = +args[1]; f < +args[2]; f++) { const T = f / FPS; while (si < S.length - 1 && T >= S[si + 1].t0) si++; process.stdout.write(f + ':' + si + ' '); drawScene(ctx, si, T - S[si].t0); } console.log('done'); return; }
  if (args[0] === 'part') {
    // node main.js part i n  -> segmento de video sin audio
    const i = +args[1], n = +args[2], f0 = Math.floor(NF * i / n), f1 = Math.floor(NF * (i + 1) / n);
    const out = path.join(__dirname, `_part${i}.mp4`);
    const p = spawn(ff(), ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', W + 'x' + H, '-r', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-maxrate', '1250k', '-bufsize', '2500k', '-threads', '1', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const write = (b) => new Promise(r => { if (!p.stdin.write(b)) p.stdin.once('drain', r); else r(); });
    let si = 0; const t0 = Date.now();
    for (let f = f0; f < f1; f++) {
      const T = f / FPS;
      while (si < S.length - 1 && T >= S[si + 1].t0) si++;
      drawScene(ctx, si, T - S[si].t0);
      await write(Buffer.from(cv.data()));
      if (global.gc && f % 24 === 0) global.gc();
      if ((f - f0) % 120 === 0) console.log(`part ${i}: ${f - f0}/${f1 - f0} · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    p.stdin.end(); await new Promise(r => p.on('close', r));
    return;
  }
  buildAudio(wav);
  console.log('audio ok, total', S.total.toFixed(2));
  if (args[0] === 'audio') return;
  if (args[0] === 'mux') {
    const n = +args[1], lst = path.join(__dirname, '_parts.txt');
    fs.writeFileSync(lst, [...Array(n).keys()].map(i => `file '_part${i}.mp4'`).join('\n'));
    execSync(`"${ff()}" -y -loglevel error -f concat -safe 0 -i "${lst}" -i "${wav}" -c:v copy -c:a aac -b:a 128k -shortest -movflags +faststart "${OUT}"`);
    console.log('ok', OUT);
  }
}
main();
