// Runtime en el navegador: horario de textos, render 3D y rotulos editoriales.
import * as THREE from 'three';
import { SCENES } from './scenes.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';

const W = 1080, H = 1920, TARGET = 175, HOLD = 0.95;
let WPS = 4.6;
const PANEL_Y = 1150, PANEL_X = 60, PANEL_W = 880;
const FCAP = '46px "Liberation Serif"', FSAY = 'italic 48px "Liberation Serif"', FWHO = 'bold 30px "Liberation Sans"';
const INK = { navy: '#243150', coral: '#e8604c', mustard: '#e9b44c', paper: '#efe6d2', teal: '#2a9d8f' };

const glc = document.getElementById('gl'), out = document.getElementById('out'), ctx = out.getContext('2d');
const R = new THREE.WebGLRenderer({ canvas: glc, antialias: true, preserveDrawingBuffer: true });
R.setSize(W, H, false); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFShadowMap;
R.toneMapping = THREE.NoToneMapping; R.outputColorSpace = THREE.SRGBColorSpace;
const OUTL = new OutlineEffect(R, { defaultThickness: 0.0035, defaultColor: [0.1, 0.1, 0.16], defaultAlpha: 1 });

function wrap(s, font, maxW) { ctx.font = font; const ws = s.split(' '), L = []; let c = ''; for (const w of ws) { const t = c ? c + ' ' + w : w; if (ctx.measureText(t).width > maxW && c) { L.push(c); c = w; } else c = t; } L.push(c); return L; }
class Line {
  constructor(kind, who, text, start) {
    this.kind = kind; this.who = who; this.start = start;
    const font = kind === 'cap' ? FCAP : FSAY; this.font = font;
    this.lines = wrap(kind === 'say' ? '— ' + text : text, font, PANEL_W - 70);
    this.words = []; let t = start + 0.3;
    this.lines.forEach((ln, li) => { ctx.font = font; let x = 0; for (const w of ln.split(' ')) { this.words.push({ w, li, x, t }); x += ctx.measureText(w + ' ').width; t += 1 / WPS + (/[.!?…:]$/.test(w) ? 0.2 : /,$/.test(w) ? 0.08 : 0); } });
    this.end = t;
  }
  timeOf(word) { const k = this.words.find(o => o.w.toLowerCase().includes(word.toLowerCase())); return k ? k.t : this.end; }
}
class Runtime {
  constructor(spec) { this.spec = spec; }
  schedule(t0) {
    const sp = this.spec; this.t0 = t0; this.L = [];
    let s = sp.pre ?? 0.4;
    (sp.lines || []).forEach(([k, w, txt], i) => { s += (sp.delays || {})[i] || 0; const ln = new Line(k, w, txt, s); this.L.push(ln); s = ln.end + HOLD; });
    this.dur = Math.max(sp.minDur || 0, this.L.length ? this.L[this.L.length - 1].end + (sp.post ?? 0.4) + HOLD : 0);
    this.sfx = sp.events ? sp.events.call(this, this.L) : [];
  }
  idx(t) { let i = -1; this.L.forEach((l, k) => { if (t >= l.start) i = k; }); return i; }
  talking(t, who) { const i = this.idx(t); return i >= 0 && this.L[i].kind === 'say' && this.L[i].who === who && t < this.L[i].end; }
}
const RT = SCENES.map(s => new Runtime(s));

window.init = async () => {
  await document.fonts.load(FCAP); await document.fonts.load(FSAY); await document.fonts.load(FWHO);
  for (;;) { let t = 0; for (const r of RT) { r.schedule(t); t += r.dur; } if (t <= TARGET || WPS > 6.8) { RT[RT.length - 1].dur += TARGET - t; break; } WPS += 0.1; }
  return { wps: WPS, total: TARGET, scenes: RT.map(r => ({ name: r.spec.name, t0: r.t0, dur: r.dur, music: r.spec.music, amb: r.spec.amb || [], sfx: r.sfx })) };
};

// ---------------------------------------------------------------- overlay 2D
const paperTex = (() => { const c = document.createElement('canvas'); c.width = 540; c.height = 960; const x = c.getContext('2d'); x.fillStyle = '#f4ecdc'; x.fillRect(0, 0, 540, 960); const d = x.getImageData(0, 0, 540, 960); for (let i = 0; i < d.data.length; i += 4) { const v = (Math.random() - 0.5) * 26; d.data[i] += v; d.data[i + 1] += v; d.data[i + 2] += v; } x.putImageData(d, 0, 0); for (let k = 0; k < 900; k++) { x.strokeStyle = `rgba(120,100,70,${Math.random() * 0.06})`; x.beginPath(); const X0 = Math.random() * 540, Y0 = Math.random() * 960; x.moveTo(X0, Y0); x.lineTo(X0 + (Math.random() - 0.5) * 30, Y0 + (Math.random() - 0.5) * 30); x.stroke(); } return c; })();
const grain = (() => { const c = document.createElement('canvas'); c.width = 540; c.height = 960; const x = c.getContext('2d'); const d = x.createImageData(540, 960); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 22; } x.putImageData(d, 0, 0); return c; })();
function txt(s, x, y, font, col, align = 'left', a = 1) { ctx.save(); ctx.globalAlpha = a; ctx.font = font; ctx.fillStyle = col; ctx.textAlign = align; ctx.fillText(s, x, y); ctx.restore(); }
function shadowTxt(s, x, y, font, col, align = 'center', a = 1) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 18; txt(s, x, y, font, col, align, a); ctx.restore(); }
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
function panel(ln, t) {
  const lh = 62, top = ln.kind === 'say' ? 56 : 30, h = top + ln.lines.length * lh + 30;
  ctx.fillStyle = INK.coral; ctx.fillRect(PANEL_X + 12, PANEL_Y + 12, PANEL_W, h);
  ctx.fillStyle = '#f3ecdc'; ctx.fillRect(PANEL_X, PANEL_Y, PANEL_W, h);
  ctx.strokeStyle = INK.navy; ctx.lineWidth = 3; ctx.strokeRect(PANEL_X, PANEL_Y, PANEL_W, h);
  if (ln.kind === 'say') txt(ln.who.toUpperCase(), PANEL_X + 34, PANEL_Y + 50, FWHO, INK.coral);
  for (const o of ln.words) { const a = cl((t - o.t) / 0.22, 0, 1); if (a > 0) txt(o.w, PANEL_X + 34 + o.x, PANEL_Y + top + 46 + o.li * lh + (1 - a) * 8, ln.font, INK.navy, 'left', a); }
}
const EXTRA = {
  Title(t) {
    const a = (d) => cl((t - d) / 0.8, 0, 1);
    shadowTxt('HISTORIA Y AVENTURAS DE', 540, 330, 'bold 36px "Liberation Sans"', '#f6efe0', 'center', a(0.6));
    shadowTxt('VAJTAN', 540, 520, 'bold 200px "Liberation Serif"', '#fbf5e8', 'center', a(1.4));
    shadowTxt('el súper nene', 540, 610, 'italic 76px "Liberation Serif"', '#ffcf9a', 'center', a(2.4));
    shadowTxt('Una historia real · 1995 — 2026', 540, 1420, '38px "Liberation Serif"', '#f6efe0', 'center', a(3.4));
  },
  Farewell(t, r) { if (r.idx(t) === 2) { const u = cl((t - r.L[2].start) / 3, 0, 1); shadowTxt(String(Math.min(2003, 2000 + Math.floor(u * 3.2))), 540, 640, 'bold 230px "Liberation Serif"', '#f3ecdc', 'center', 0.92); } },
  Journey(t, r) { const u = cl(t / (r.dur - 0.5), 0, 1); ctx.fillStyle = 'rgba(243,236,220,0.5)'; ctx.fillRect(120, 470, 840, 3); ctx.fillStyle = INK.coral; ctx.fillRect(120, 467, 840 * u, 9); ctx.beginPath(); ctx.arc(120 + 840 * u, 471, 13, 0, 7); ctx.fill(); shadowTxt('UCRANIA', 120, 450, 'bold 28px "Liberation Sans"', '#f3ecdc', 'left'); shadowTxt('ESPAÑA', 960, 450, 'bold 28px "Liberation Sans"', '#f3ecdc', 'right'); },
  Parkour12(t, r) { const W_ = ['piripi', 'piripa', 'pa', 'pam', 'pam', 'pim']; (r.plan || []).forEach((j, q) => { if (q < 6 && t > j.tj) shadowTxt(W_[q], 150 + (q % 3) * 290, 360 + Math.floor(q / 3) * 100, 'italic 70px "Liberation Serif"', '#fff3e0', 'left', cl((t - j.tj) * 3, 0, 1)); }); },
  Accident(t, r) { if (t > r.ti && t < r.ti + 1.1) { ctx.save(); ctx.globalAlpha = cl(1 - (t - r.ti) * 1.3, 0, 1) * 0.7; ctx.fillStyle = INK.coral; ctx.fillRect(0, 0, W, H); ctx.restore(); shadowTxt('¡PAH!', 540, 700, 'bold 230px "Liberation Serif"', '#fff', 'center'); } if (t > r.ti + 1.1) { shadowTxt('C1 · ATLAS', 540, 330, 'bold 44px "Liberation Sans"', '#cfe8ff', 'center', 0.9); } },
  Halo(t, r) { shadowTxt('DÍA ' + Math.min(90, 1 + Math.floor(t / r.dur * 95)) + ' / 90', 960, 330, 'bold 46px "Liberation Sans"', '#f3ecdc', 'right'); },
  BackParkour(t, r) { const n = Math.floor(Math.pow(Math.max(0, t - 0.3), 2.3) * 14); shadowTxt(String(n).padStart(4, '0'), 960, 360, 'bold 140px "Liberation Serif"', '#fff', 'right'); shadowTxt('SALTOS', 960, 410, 'bold 30px "Liberation Sans"', '#fff', 'right'); if (r.idx(t) === 1) shadowTxt('modo light', 120, 380, 'italic 60px "Liberation Serif"', '#ffe0a0', 'left'); },
  Art(t, r) { if (r.idx(t) !== 1) return; const u = t - r.L[1].start; shadowTxt('Kickboxing', 110, 400, 'italic 58px "Liberation Serif"', '#fff', 'left'); if (u > 0.6) { ctx.fillStyle = INK.coral; ctx.fillRect(100, 380, 300, 7); } if (u > 1.4) shadowTxt('Parkour', 110, 475, 'bold 58px "Liberation Serif"', '#fff', 'left'); if (u > 2.2) shadowTxt('Diseño +1', 110, 550, 'italic 58px "Liberation Serif"', '#ffcf9a', 'left'); },
  Fights(t, r) {
    const i = r.idx(t);
    if (i < 1 && t > r.ko + 0.8) { shadowTxt('CAMPEÓN DE ESPAÑA', 540, 380, 'bold 64px "Liberation Sans"', INK.mustard); shadowTxt('K1 · +91 KG', 540, 450, 'italic 54px "Liberation Serif"', '#f3ecdc'); }
    if (i === 1) { shadowTxt('MMA', 540, 380, 'bold 110px "Liberation Serif"', '#f3ecdc'); [[r.t1, 'Amateur I', 'VICTORIA', '#7fd8c8'], [r.t2, 'Amateur II', 'DERROTA', INK.coral], [r.t3, 'Amateur III', 'DERROTA', INK.coral]].forEach(([tt, a, b, c], k) => { if (t < tt) return; const al = cl((t - tt) * 3, 0, 1); shadowTxt(a, 150, 540 + k * 110, 'italic 58px "Liberation Serif"', '#f3ecdc', 'left', al); shadowTxt(b, 930, 540 + k * 110, 'bold 58px "Liberation Sans"', c, 'right', al); }); }
    if (i === 2) { shadowTxt('PRO — VICTORIA', 540, 380, 'bold 70px "Liberation Sans"', INK.mustard); if (t > r.L[2].timeOf('XD')) shadowTxt('XD', 880, 540, 'bold 110px "Liberation Serif"', INK.coral); }
  },
  End(t, r) { const f = r.spec.fin; if (t > f) { const u = t - f, a = (d) => cl((u - d) / 0.8, 0, 1); shadowTxt('FIN', 540, 560, 'bold 200px "Liberation Serif"', '#fbf5e8', 'center', a(0)); shadowTxt('HISTORIA Y AVENTURAS DE', 540, 1330, 'bold 34px "Liberation Sans"', '#fbf5e8', 'center', a(0.8)); shadowTxt('Vajtan, el súper nene', 540, 1410, 'italic 64px "Liberation Serif"', '#fbf5e8', 'center', a(1.4)); shadowTxt('continuará…', 540, 1480, 'italic 44px "Liberation Serif"', '#ffcf9a', 'center', a(2.4)); } },
};

// ---------------------------------------------------------------- render
let cur = -1, built = null;
function dispose(o) { o.traverse(m => { if (m.geometry) m.geometry.dispose(); }); }
window.renderFrame = (gt) => {
  let si = 0; while (si + 1 < RT.length && gt >= RT[si + 1].t0) si++;
  const r = RT[si], lt = gt - r.t0;
  if (si !== cur) { if (built) dispose(built.s); built = r.spec.build.call(r.spec, r); cur = si; }
  const res = built.update(lt);
  const sc = res && res.scene ? res.scene : built.s, cam = res && res.camera ? res.camera : built.cam;
  R.setRenderTarget(null); R.autoClear = true; R.setClearColor(0x000000, 1); R.clear(true, true, true);
  OUTL.autoClear = false; OUTL.render(sc, cam);
  ctx.drawImage(glc, 0, 0);
  // vineta
  const g = ctx.createRadialGradient(540, 800, 500, 540, 900, 1250); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(paperTex, 0, 0, W, H); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.drawImage(grain, 0, 0, W, H); ctx.restore();
  if (r.spec.chapter) { shadowTxt(r.spec.chapter, 60, 236, 'bold 30px "Liberation Sans"', '#f6efe0', 'left'); ctx.fillStyle = INK.coral; ctx.fillRect(60, 250, 90, 5); shadowTxt(r.spec.age + (r.spec.age.length > 3 ? '' : ' años'), 1020, 236, 'italic 40px "Liberation Serif"', '#f6efe0', 'right'); }
  if (EXTRA[r.spec.name]) EXTRA[r.spec.name](lt, r);
  const i = r.idx(lt);
  if (i >= 0 && !(r.spec.name === 'End' && lt > r.spec.fin)) panel(r.L[i], lt);
  const fin = cl(lt / 0.35, 0, 1), fout = cl((r.dur - lt) / (si === RT.length - 1 ? 1.2 : 0.3), 0, 1), f = Math.min(fin, fout);
  if (f < 1) { ctx.save(); ctx.globalAlpha = 1 - f; ctx.fillStyle = '#0b0b10'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  return out.toDataURL('image/jpeg', 0.9);
};
window.ready = true;
