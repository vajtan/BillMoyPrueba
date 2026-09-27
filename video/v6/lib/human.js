// Humanoide articulado con proporciones anatomicas por edad + poses + marcha fisica.
import * as THREE from 'three';

const D2R = Math.PI / 180;
const mats = new Map();
// sombreado por tonos (cel): 3 escalones de luz como en una ilustracion
const GRAD = (() => { const d = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 3, 1); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
export function mat(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!mats.has(k)) {
    const p = Object.assign({ color, gradientMap: GRAD }, o);
    delete p.roughness; delete p.metalness; delete p.flatShading;
    mats.set(k, new THREE.MeshToonMaterial(p));
  }
  return mats.get(k);
}
export { GRAD };
function mesh(geo, m, cast = true) { const x = new THREE.Mesh(geo, m); x.castShadow = cast; x.receiveShadow = true; return x; }
const cap = (r, len) => new THREE.CapsuleGeometry(r, Math.max(0.001, len), 6, 14);
const sph = (r) => new THREE.SphereGeometry(r, 24, 18);
function lathe(prof, k, g) {
  const pts = prof.map(([r, y]) => new THREE.Vector2(r * k * g, y * k));
  return new THREE.LatheGeometry(pts, 32);
}
// extremidad torneada que cuelga desde y=0 hasta y=-len, con extremos redondeados y bulto muscular
function limb(r0, r1, len, bulge = 0, at = 0.35) {
  const pts = [];
  for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; pts.push([r0 * Math.sin(a), r0 * Math.cos(a)]); }
  for (let i = 1; i <= 12; i++) { const u = i / 12; const r = r0 + (r1 - r0) * u + bulge * Math.exp(-Math.pow((u - at) / 0.22, 2)); pts.push([r, -len * u]); }
  for (let i = 1; i <= 6; i++) { const a = i / 6 * Math.PI / 2; pts.push([r1 * Math.cos(a), -len - r1 * Math.sin(a)]); }
  return new THREE.LatheGeometry(pts.reverse().map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y)), 24);
}

// proporciones (fraccion de la altura) segun edad
const AGE = {
  adult: { head: 0.130, hip: 0.515, sh: 0.255, arm: 0.186, fore: 0.150, hand: 0.10, thigh: 0.245, shin: 0.245, girth: 1.0 },
  teen: { head: 0.138, hip: 0.505, sh: 0.235, arm: 0.183, fore: 0.148, hand: 0.10, thigh: 0.240, shin: 0.240, girth: 0.9 },
  kid8: { head: 0.165, hip: 0.480, sh: 0.225, arm: 0.172, fore: 0.140, hand: 0.10, thigh: 0.225, shin: 0.225, girth: 0.95 },
  kid5: { head: 0.185, hip: 0.460, sh: 0.225, arm: 0.165, fore: 0.135, hand: 0.10, thigh: 0.215, shin: 0.215, girth: 1.0 },
};

export const SKIN = 0xe0ac8a, SKIN2 = 0xc68863;

export class Human {
  constructor(o) {
    this.o = o = Object.assign({ height: 1.78, age: 'adult', skin: SKIN, hair: 0x2a2020, style: 'short', beard: null,
      shirt: 0x2a9d8f, sleeves: 'short', pants: 0x243150, shorts: false, shoes: 0x222222, dress: null, gloves: null,
      shirtless: false, halo: false, cap: null, build: 1.0, eyes: 0x1b1b22, mouth: 0x9c4a42 }, o);
    const P = AGE[o.age], Hh = o.height, g = P.girth * o.build;
    this.P = P;
    this.root = new THREE.Group();
    const skin = mat(o.skin), shirt = mat(o.shirtless ? o.skin : o.shirt, { roughness: 0.9 }), pants = mat(o.pants, { roughness: 0.9 });
    const headH = P.head * Hh, hipY = P.hip * Hh;
    this.hipY = hipY;
    const k = Hh / 1.78, fem = o.female ? 0.9 : 1;
    // pelvis (perfil torneado: entrepierna -> cadera -> cintura)
    this.pelvis = new THREE.Group(); this.pelvis.position.y = hipY; this.root.add(this.pelvis);
    const pel = mesh(lathe([[0.001, -0.09], [0.09, -0.085], [0.145, -0.03], [0.158, 0.02], [0.145, 0.08], [0.001, 0.085]], k, g * (o.female ? 1.08 : 1)), pants);
    pel.scale.z = 0.72; this.pelvis.add(pel);
    // torso (cintura -> pecho -> hombros -> base del cuello)
    const shY = (1 - P.head - 0.035) * Hh - hipY;
    const tlen = shY - 0.08 * Hh;
    this.spine = new THREE.Group(); this.spine.position.y = 0.08 * k; this.pelvis.add(this.spine);
    this.chest = new THREE.Group(); this.chest.position.y = 0; this.spine.add(this.chest);
    const ts = tlen / (0.40 * k);
    const shR = P.sh * 0.5 * Hh / k * fem;
    const tors = mesh(lathe([[0.001, 0], [0.135, 0], [0.14, 0.08], [0.158, 0.17], [0.172 * fem + 0.01, 0.27], [shR * 0.95, 0.345], [shR * 0.8, 0.385], [0.1, 0.405], [0.055, 0.41], [0.001, 0.41]].map(([r, y]) => [r, y * ts]), k, g), shirt);
    tors.scale.z = 0.62; this.chest.add(tors);

    if (o.dress) {
      const dr = mesh(new THREE.CylinderGeometry(0.15 * k, 0.26 * k, 0.5 * k, 28, 1, true), mat(o.dress, { side: THREE.DoubleSide }));
      dr.scale.z = 0.8; dr.position.y = -0.2 * k; this.pelvis.add(dr);
    }
    const shTop = tlen;
    // cuello y cabeza
    this.neck = new THREE.Group(); this.neck.position.y = shTop; this.chest.add(this.neck);
    const nk = mesh(new THREE.CylinderGeometry(0.052 * k, 0.06 * k, 0.1 * k, 16), skin); nk.position.y = 0.02 * k; this.neck.add(nk);
    this.head = new THREE.Group(); this.head.position.y = 0.03 * k; this.neck.add(this.head);
    const hw = headH * 0.38, hh = headH * 0.5, hd = headH * 0.44;
    this.headDims = [hw, hh, hd];
    const skull = mesh(sph(1), skin); skull.scale.set(hw, hh, hd); skull.position.y = hh * 0.95; this.head.add(skull);
    const jaw = mesh(sph(1), skin); jaw.scale.set(hw * 0.78, hh * 0.55, hd * 0.8); jaw.position.set(0, hh * 0.55, hd * 0.12); this.head.add(jaw);
    const cy = hh * 1.0;
    for (const s of [-1, 1]) {
      const ear = mesh(sph(1), skin); ear.scale.set(hw * 0.12, hh * 0.18, hd * 0.2); ear.position.set(s * hw * 0.98, cy, -hd * 0.05); this.head.add(ear);
      const eye = mesh(sph(1), mat(o.eyes, { roughness: 0.3 })); eye.scale.set(hw * 0.1, hh * 0.08, hd * 0.06); eye.position.set(s * hw * 0.36, cy + hh * 0.08, hd * 0.9); this.head.add(eye);
      const brow = mesh(new THREE.BoxGeometry(hw * 0.3, hh * 0.028, hd * 0.04), mat(o.hair)); brow.position.set(s * hw * 0.36, cy + hh * 0.24, hd * 0.9); brow.rotation.z = -s * 0.1; this.head.add(brow);
    }
    const nose = mesh(sph(1), skin); nose.scale.set(hw * 0.13, hh * 0.16, hd * 0.16); nose.position.set(0, cy - hh * 0.08, hd * 0.98); this.head.add(nose);
    this.mouth = mesh(sph(1), mat(o.mouth)); this.mouth.scale.set(hw * 0.2, hh * 0.025, hd * 0.05); this.mouth.position.set(0, cy - hh * 0.36, hd * 0.86); this.head.add(this.mouth);
    this.hairGroup = new THREE.Group(); this.head.add(this.hairGroup);
    this.buildHair(o.style);
    if (o.beard) {
      const bm = mat(o.beard, { roughness: 1 });
      const b = mesh(new THREE.SphereGeometry(1, 28, 16, -Math.PI * 0.5, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), bm);
      b.scale.set(hw * 1.03, hh * 1.02, hd * 1.03); b.position.y = hh * 0.95; this.head.add(b);
      const jb = mesh(new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), bm);
      jb.scale.set(hw * 0.8, hh * 0.57, hd * 0.83); jb.position.set(0, hh * 0.55, hd * 0.12); this.head.add(jb);
      const st = mesh(new THREE.TorusGeometry(hw * 0.2, hh * 0.035, 6, 16, Math.PI), bm); st.position.set(0, cy - hh * 0.3, hd * 0.9); this.head.add(st);
      this.mouth.position.z = hd * 0.95;
    }
    if (o.cap) {
      const c = mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(o.cap)); c.scale.set(hw * 1.08, hh * 0.75, hd * 1.08); c.position.y = hh * 1.2; this.head.add(c);
      const br = mesh(new THREE.CylinderGeometry(hw * 0.9, hw * 0.9, 0.006, 20, 1, false, -Math.PI / 2, Math.PI), mat(o.cap)); br.scale.z = 1.4; br.position.set(0, hh * 1.2, hd * 0.8); this.head.add(br);
    }
    if (o.battered) {
      const band = mesh(new THREE.TorusGeometry(hw * 1.02, hh * 0.07, 8, 32), mat(0xf4f4f0)); band.rotation.x = Math.PI / 2 - 0.15; band.scale.set(1, hd / hw, 1); band.position.y = hh * 1.35; this.head.add(band);
      const eyeB = mesh(sph(1), mat(0x6a3a6a, { roughness: 1 })); eyeB.scale.set(hw * 0.22, hh * 0.14, hd * 0.08); eyeB.position.set(hw * 0.36, cy + hh * 0.05, hd * 0.86); this.head.add(eyeB);
      const tape = mesh(new THREE.BoxGeometry(hw * 0.45, hh * 0.1, hd * 0.02), mat(0xf4f4f0)); tape.position.set(-hw * 0.5, cy - hh * 0.12, hd * 0.9); tape.rotation.z = 0.5; this.head.add(tape);
    }
    if (o.halo) {
      const ring = mesh(new THREE.TorusGeometry(hw * 1.45, 0.008 * Hh, 8, 32), mat(0x9aa0aa, { metalness: 0.7, roughness: 0.3 })); ring.rotation.x = Math.PI / 2; ring.position.y = hh * 1.2; this.head.add(ring);
      for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
        const rod = mesh(new THREE.CylinderGeometry(0.006 * Hh, 0.006 * Hh, 0.2 * Hh, 6), mat(0x9aa0aa, { metalness: 0.7, roughness: 0.3 }));
        rod.position.set(sx * hw * 1.1, hh * 0.55, sz * hd * 0.9); this.head.add(rod);
      }
      const vest = mesh(new THREE.BoxGeometry(P.sh * 0.95 * Hh, 0.2 * Hh, 0.16 * Hh * g), mat(0xe8e8ee)); vest.position.y = shY * 0.3; this.chest.add(vest);
    }
    // brazos (extremidades torneadas: deltoides -> codo -> muneca)
    this.arms = {};
    const ssk = mesh; // alias
    for (const sgn of [-1, 1]) {
      const side = sgn > 0 ? 'L' : 'R';
      const sh = new THREE.Group(); sh.position.set(sgn * (shR * 0.86) * k, shTop - 0.045 * k, 0); this.chest.add(sh);
      const ua = P.arm * Hh, fa = P.fore * Hh;
      const upM = o.sleeves === 'none' || o.shirtless ? skin : shirt;
      const um = mesh(limb(0.05 * k * g, 0.036 * k * g, ua, 0.006 * k * g), upM); sh.add(um);
      const el = new THREE.Group(); el.position.y = -ua; sh.add(el);
      const fm = mesh(limb(0.038 * k * g, 0.026 * k * g, fa, 0.008 * k * g), o.sleeves === 'long' && !o.shirtless ? shirt : skin); el.add(fm);
      const wr = new THREE.Group(); wr.position.y = -fa; el.add(wr);
      if (o.gloves) { const gl = mesh(sph(1), mat(o.gloves, { roughness: 0.35 })); gl.scale.set(0.058 * k, 0.07 * k, 0.065 * k); gl.position.y = -0.055 * k; wr.add(gl); }
      else {
        const hd2 = mesh(sph(1), skin); hd2.scale.set(0.022 * k * g, P.hand * Hh * 0.42, 0.042 * k * g); hd2.position.y = -P.hand * Hh * 0.38; wr.add(hd2);
        const th = mesh(sph(1), skin); th.scale.set(0.012 * k, 0.032 * k, 0.014 * k); th.position.set(0, -0.035 * k, 0.034 * k); th.rotation.x = 0.5; wr.add(th);
      }
      this.arms[side] = { sh, el, wr };
    }
    // piernas (muslo -> rodilla -> gemelo -> tobillo -> zapato)
    this.legs = {};
    for (const sgn of [-1, 1]) {
      const side = sgn > 0 ? 'L' : 'R';
      const hp = new THREE.Group(); hp.position.set(sgn * 0.085 * k * g, -0.02 * k, 0); this.pelvis.add(hp);
      const th = P.thigh * Hh, sn = P.shin * Hh;
      const tm = mesh(limb(0.082 * k * g, 0.052 * k * g, th, 0.004 * k * g), pants); hp.add(tm);
      const kn = new THREE.Group(); kn.position.y = -th; hp.add(kn);
      const sm = mesh(limb(0.05 * k * g, 0.032 * k * g, sn, 0.012 * k * g, 0.3), o.shorts || o.dress ? skin : pants); kn.add(sm);
      const an = new THREE.Group(); an.position.y = -sn; kn.add(an);
      const ft = mesh(new THREE.CapsuleGeometry(0.05 * k, 0.19 * k, 6, 12), mat(o.shoes, { roughness: 0.6 }));
      ft.rotation.x = Math.PI / 2; ft.scale.set(1, 1, 0.75); ft.position.set(0, -0.045 * k, 0.05 * k); an.add(ft);
      this.legs[side] = { hp, kn, an };
    }
    this.legLen = (P.thigh + P.shin) * Hh;
    // rig: pivote en el centro de masas (para saltos, mortales y caidas)
    this.com = hipY;
    this.rig = new THREE.Group(); this.rig.add(this.root); this.root.position.y = -this.com;
  }
  // coloca de pie en el suelo (x,z), mirando hacia ry
  place(x, z, ry = 0, drop = 0, y0 = 0) { this.rig.position.set(x, y0 + this.com - drop, z); this.rig.rotation.set(0, ry, 0); }
  buildHair(style) {
    const [hw, hh, hd] = this.headDims, o = this.o;
    this.hairGroup.clear();
    const hm = mat(o.hair, { roughness: 0.95 });
    const capG = (from, len) => new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, from, len);
    const add = (geo, sx, sy, sz, y, z = 0, m = hm) => { const x = mesh(geo, m); x.scale.set(sx, sy, sz); x.position.set(0, y, z); this.hairGroup.add(x); return x; };
    if (style === 'short' || style === 'kid') {
      add(capG(0, Math.PI * 0.4), hw * 1.07, hh * 1.06, hd * 1.08, hh * 0.98, -hd * 0.03).rotation.x = -0.35;
    } else if (style === 'long' || style === 'pony') {
      add(capG(0, Math.PI * 0.45), hw * 1.08, hh * 1.07, hd * 1.08, hh * 0.98, -hd * 0.02).rotation.x = -0.3;
      if (style === 'long') { const b = add(new THREE.CapsuleGeometry(1, 1, 6, 12), hw * 0.95, hh * 0.55, hd * 0.45, hh * 0.4, -hd * 0.55); }
      else { add(new THREE.SphereGeometry(1, 16, 12), hw * 0.35, hh * 0.3, hd * 0.35, hh * 1.25, -hd * 0.95); add(new THREE.CapsuleGeometry(1, 1, 6, 12), hw * 0.22, hh * 0.35, hd * 0.2, hh * 0.8, -hd * 1.08); }
    } else if (style === 'buzz') {
      const c = new THREE.Color(o.hair).lerp(new THREE.Color(o.skin), 0.18);
      add(capG(0, Math.PI * 0.46), hw * 1.03, hh * 1.025, hd * 1.035, hh * 0.97, -hd * 0.02, mat(c.getHex())).rotation.x = -0.25;
    } else if (style === 'thin') {
      add(capG(Math.PI * 0.33, Math.PI * 0.17), hw * 1.05, hh * 1.04, hd * 1.05, hh * 0.98, -hd * 0.02).rotation.x = -0.3;
      add(capG(0, Math.PI * 0.34), hw * 1.03, hh * 1.03, hd * 1.03, hh * 0.98, -hd * 0.02, mat(o.hair, { transparent: true, opacity: 0.5 })).rotation.x = -0.3;
    }
  }
  setHair(style) { this.o.style = style; this.buildHair(style); }
  // pose: angulos en grados. flex>0 = hacia delante.
  pose(p) {
    const r = (x) => (x || 0) * D2R;
    this.pelvis.rotation.set(r(p.pelvisX), r(p.pelvisY), r(p.pelvisZ));
    this.spine.rotation.set(r(p.spineX), r(p.spineY), r(p.spineZ));
    this.neck.rotation.set(r(p.neckX), r(p.neckY), r(p.neckZ));
    for (const s of ['L', 'R']) {
      const sg = s === 'L' ? 1 : -1, a = this.arms[s], l = this.legs[s];
      a.sh.rotation.set(-r(p['sh' + s]), r(p['shY' + s]) * sg, r(p['abd' + s]) * sg);
      a.el.rotation.set(-r(p['el' + s]), 0, 0);
      a.wr.rotation.set(0, 0, 0);
      l.hp.rotation.set(-r(p['hip' + s]), 0, r(p['hipAbd' + s]) * sg);
      l.kn.rotation.set(r(p['kn' + s]), 0, 0);
      l.an.rotation.set(-r(p['an' + s]), 0, 0);
    }
    this.mouth.scale.y = this.headDims[1] * (p.talk ? 0.09 : 0.025);
  }
}

// ------------------------------------------------------------ POSES
const BASE = { shL: 2, shR: 2, abdL: 6, abdR: 6, elL: 8, elR: 8, hipL: 0, hipR: 0, knL: 2, knR: 2 };
export function P(o) { return Object.assign({}, BASE, o); }
export const POSES = {
  stand: P({}),
  hands: P({ shL: 10, shR: 10, elL: 70, elR: 70, abdL: 14, abdR: 14 }),
  point: P({ shR: 80, elR: 5, abdR: 10 }),
  wave: (t) => P({ abdR: 150 + 12 * Math.sin(t * 9), elR: 25 + 20 * Math.sin(t * 9), shR: 10 }),
  hug: P({ shL: 75, shR: 75, elL: 60, elR: 60, abdL: 25, abdR: 25, shYL: -40, shYR: -40 }),
  cross: P({ shL: 30, shR: 30, elL: 115, elR: 115, abdL: 10, abdR: 10, shYL: -55, shYR: -55 }),
  guard: (t) => P({ shL: 55, shR: 45, elL: 125, elR: 130, abdL: 22, abdR: 22, shYL: -25, shYR: -25, hipL: 12, hipR: -12, knL: 18, knR: 18, spineX: 6 }),
  laptop: P({ shL: 35, shR: 35, elL: 75, elR: 75, abdL: 10, abdR: 10, shYL: -20, shYR: -20 }),
  phone: P({ shR: 40, elR: 120, abdR: 15, shYR: -30, shL: 5 }),
  win: P({ abdL: 160, abdR: 160, elL: 10, elR: 10 }),
  belt: P({ abdL: 150, abdR: 150, elL: 25, elR: 25, shL: 20, shR: 20 }),
  sit: P({ hipL: 90, hipR: 90, knL: 90, knR: 90, anL: 0, anR: 0, shL: 25, shR: 25, elL: 55, elR: 55 }),
  sad: P({ neckX: 20, spineX: 8, shL: 0, shR: 0 }),
  tuck: P({ hipL: 115, hipR: 115, knL: 130, knR: 130, shL: 70, shR: 70, elL: 80, elR: 80, spineX: 25, neckX: 20 }),
  lieBack: P({ shL: 10, shR: 10, abdL: 30, abdR: 30, elL: 20, elR: 20, hipL: 5, hipR: 0, knL: 15, knR: 5 }),
};
export function lerpPose(a, b, u) {
  const o = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = (a[k] || 0) + ((b[k] || 0) - (a[k] || 0)) * u;
  return o;
}

// Marcha fisica: amplitud de cadera calculada para que el pie no patine.
export function gait(h, t, speed, run = false) {
  const cad = run ? 2.8 : 1.85;                         // pasos por segundo
  const step = speed / cad;                            // longitud de paso (m)
  const L = h.legLen;
  const amp = Math.min(run ? 45 : 32, Math.asin(Math.min(0.95, step / (2 * L))) / D2R);
  const ph = t * cad * Math.PI;                        // un ciclo = 2 pasos
  const s = Math.sin(ph), c = Math.cos(ph);
  const kneeL = 4 + (run ? 95 : 55) * Math.pow(Math.max(0, c), 1.6);
  const kneeR = 4 + (run ? 95 : 55) * Math.pow(Math.max(0, -c), 1.6);
  const p = P({
    hipL: amp * s, hipR: -amp * s, knL: kneeL, knR: kneeR,
    anL: -0.4 * kneeL * Math.max(0, c) + 5, anR: -0.4 * kneeR * Math.max(0, -c) + 5,
    shL: -amp * 0.7 * s, shR: amp * 0.7 * s, elL: run ? 85 : 15 + 10 * Math.max(0, -s), elR: run ? 85 : 15 + 10 * Math.max(0, s),
    spineX: run ? 12 : 3, abdL: 5, abdR: 5,
  });
  // la cadera baja cuando las piernas estan abiertas (geometria real)
  const drop = L * (1 - Math.cos(amp * D2R * Math.abs(s)));
  const bob = run ? 0.05 * Math.abs(Math.sin(ph)) : 0;
  return { pose: p, drop: drop - bob };
}
