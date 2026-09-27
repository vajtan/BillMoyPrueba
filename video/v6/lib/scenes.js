// 18 escenas 3D (2.5D) con coreografia fisica.
import * as THREE from 'three';
import { Human, POSES, P, gait, lerpPose, mat, SKIN, SKIN2 } from './human.js';
import * as X from './props.js';
import { GRAD } from './human.js';
const STD = (o) => { const p = Object.assign({ gradientMap: GRAD }, o); delete p.roughness; delete p.metalness; return new THREE.MeshToonMaterial(p); };

const G = 9.81;
const sm = (u) => u * u * (3 - 2 * u);
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const V = (a) => new THREE.Vector3(...a);

export function makeCam(fov = 35) {
  const c = new THREE.PerspectiveCamera(fov * 1.5, 1080 / 1920, 0.1, 900);
  c.setViewOffset(1080, 2400, 0, 480, 1080, 1920);      // punto de fuga al ~38% de altura (zona segura de redes)
  return c;
}
function camPath(cam, keys, t) {
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const [t0, p0, l0] = keys[i], [t1, p1, l1] = keys[Math.min(i + 1, keys.length - 1)];
  const u = t1 > t0 ? sm(cl((t - t0) / (t1 - t0), 0, 1)) : 1;
  cam.position.set(lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u), lerp(p0[2], p1[2], u));
  cam.lookAt(lerp(l0[0], l1[0], u), lerp(l0[1], l1[1], u), lerp(l0[2], l1[2], u));
}
function shake(cam, amp, t) { cam.position.x += Math.sin(t * 91) * amp; cam.position.y += Math.cos(t * 77) * amp; }

// ---------------------------------------------------------------- personajes
export const CH = {
  papa: () => new Human({ height: 1.80, hair: 0x2a2220, shirt: 0x9b3b30, pants: 0x2e3a55, shoes: 0x3a2a20, sleeves: 'long' }),
  papaW: () => new Human({ height: 1.80, hair: 0x2a2220, shirt: 0x5a4636, pants: 0x2e3a55, shoes: 0x3a2a20, sleeves: 'long' }),
  mama: () => new Human({ height: 1.66, female: true, style: 'long', hair: 0x1c1512, shirt: 0xd38d8a, dress: 0x2a5d7a, shoes: 0x6b2a2a, build: 0.92 }),
  mamaW: () => new Human({ height: 1.66, female: true, style: 'long', hair: 0x1c1512, shirt: 0x6a3a4a, sleeves: 'long', dress: 0x3a3048, shoes: 0x3a2a2a, build: 0.95 }),
  kid5: () => new Human({ height: 1.12, age: 'kid5', style: 'kid', hair: 0x2a2020, shirt: 0xb5402e, sleeves: 'long', pants: 0x2e3a55 }),
  kid8: () => new Human({ height: 1.30, age: 'kid8', style: 'kid', hair: 0x2a2020, shirt: 0xe0a73c, pants: 0x2e3a55 }),
  sis3: () => new Human({ height: 0.98, age: 'kid5', style: 'pony', hair: 0x1c1512, female: true, shirt: 0x6a4a8a, sleeves: 'long', dress: 0x6a4a8a }),
  sis6: () => new Human({ height: 1.16, age: 'kid5', style: 'pony', hair: 0x1c1512, female: true, shirt: 0xe88da8, dress: 0xe88da8 }),
  kidKick: () => new Human({ height: 1.34, age: 'kid8', style: 'kid', hair: 0x2a2020, shirt: 0xf2f2f2, pants: 0x1b1b22, shorts: true, gloves: 0xc0392b, shoes: SKIN }),
  teen12: () => new Human({ height: 1.52, age: 'teen', style: 'short', hair: 0x2a2020, shirt: 0x6d7480, sleeves: 'long', pants: 0x2e3a55, shoes: 0xf2f2f2, build: 0.88 }),
  teen: () => new Human({ height: 1.76, age: 'teen', style: 'short', hair: 0x2a2020, shirt: 0x2a8d80, pants: 0x2e3a55, shoes: 0xf2f2f2 }),
  teenHalo: () => new Human({ height: 1.76, age: 'teen', style: 'short', hair: 0x2a2020, shirt: 0xe8e8ee, pants: 0x2e3a55, halo: true }),
  young: () => new Human({ height: 1.86, build: 1.12, style: 'short', hair: 0x2a2020, beard: 0x3a2a22, shirt: 0x26262c, pants: 0x2e3a55, shoes: 0xf2f2f2 }),
  youngFight: () => new Human({ height: 1.86, build: 1.12, style: 'short', hair: 0x2a2020, beard: 0x3a2a22, shirtless: true, pants: 0x1b1b22, shorts: true, gloves: 0xc0392b, shoes: SKIN }),
  thin: () => new Human({ height: 1.86, build: 1.12, style: 'thin', hair: 0x2a2020, beard: 0x3a2a22, shirt: 0x26262c, pants: 0x2e3a55 }),
  vaj: () => new Human({ height: 1.86, build: 1.14, style: 'buzz', hair: 0x2a2020, beard: 0x3a2a22, shirt: 0x26262c, pants: 0x2e3a55, shoes: 0xf2f2f2 }),
  vajJacket: () => new Human({ height: 1.86, build: 1.14, style: 'buzz', hair: 0x2a2020, beard: 0x3a2a22, shirt: 0x8a3a2a, sleeves: 'long', pants: 0x2e3a55, shoes: 0xf2f2f2 }),
  vajFight: () => new Human({ height: 1.86, build: 1.14, style: 'buzz', hair: 0x2a2020, beard: 0x3a2a22, shirtless: true, pants: 0xb5302a, shorts: true, gloves: 0xb5302a, shoes: SKIN }),
  vajMMA: () => new Human({ height: 1.86, build: 1.14, style: 'buzz', hair: 0x2a2020, beard: 0x3a2a22, shirtless: true, pants: 0x1b1b22, shorts: true, gloves: 0x1b1b22, shoes: SKIN }),
  vajBeaten: () => new Human({ height: 1.86, build: 1.14, style: 'buzz', hair: 0x2a2020, beard: 0x3a2a22, shirtless: true, pants: 0x1b1b22, shorts: true, shoes: SKIN, battered: true }),
  rival: () => new Human({ height: 1.88, build: 1.15, style: 'short', skin: SKIN2, hair: 0x111111, beard: 0x111111, shirtless: true, pants: 0x2a6d8f, shorts: true, gloves: 0x2a6d8f, shoes: SKIN2 }),
  juanma: () => new Human({ height: 1.80, style: 'short', hair: 0x2a2020, cap: 0x2a6d5f, shirt: 0xe0a73c, pants: 0x2e3a55, shoes: 0x6b4a32 }),
  g1: () => new Human({ height: 1.68, female: true, style: 'long', hair: 0x2a2020, shirt: 0xb04a7a, dress: 0x1b1b22 }),
  g2: () => new Human({ height: 1.80, style: 'short', shirt: 0x3a7ab0, pants: 0x2e3a55 }),
  g3: () => new Human({ height: 1.75, style: 'short', hair: 0x7a4a2a, shirt: 0xe0a73c, pants: 0x3a3a3a }),
};

// ---------------------------------------------------------------- movimiento
function walk(h, t, t0, from, to, speed, idle = POSES.stand) {
  const dx = to[0] - from[0], dz = to[1] - from[1], L = Math.hypot(dx, dz), ry = Math.atan2(dx, dz);
  const d = cl((t - t0) * speed, 0, L);
  const moving = t > t0 && d < L;
  const x = from[0] + dx * (d / L), z = from[1] + dz * (d / L);
  if (moving) { const g = gait(h, t - t0, speed); h.pose(g.pose); h.place(x, z, ry, g.drop); }
  else { h.pose(typeof idle === 'function' ? idle(t) : idle); h.place(x, z, t <= t0 ? ry : ry); }
  return { x, z, moving, done: d >= L };
}
function kickPose(u, side = 'R') {       // u 0..1: recoger - extender - recoger
  const e = Math.sin(Math.PI * cl(u, 0, 1));
  const p = POSES.guard(0);
  const o = side === 'R' ? { hipR: 20 + 75 * e, knR: 110 - 105 * sm(e), anR: 20 * e, hipL: -5, knL: 15, spineX: -14 * e } :
    { hipL: 20 + 75 * e, knL: 110 - 105 * sm(e), anL: 20 * e, hipR: -5, knR: 15, spineX: -14 * e };
  return Object.assign({}, p, o);
}
function punchPose(u, side = 'R') {
  const e = Math.sin(Math.PI * cl(u, 0, 1));
  const p = POSES.guard(0);
  if (side === 'R') return Object.assign({}, p, { shR: 45 + 45 * e, elR: 130 - 125 * e, abdR: 22 - 10 * e, shYR: -25 + 15 * e, spineY: -20 * e });
  return Object.assign({}, p, { shL: 55 + 35 * e, elL: 125 - 120 * e, abdL: 22 - 10 * e, shYL: -25 + 15 * e, spineY: 20 * e });
}
// pendulo amortiguado (saco): impulsos en tiempos de golpe
function pendulum(t, hits, L = 1.9, imp = 1.6, damp = 0.9) {
  let th = 0, w = 0, tt = 0; const dt = 1 / 240; let k = 0;
  while (tt < t) {
    while (k < hits.length && hits[k] <= tt) { w += imp; k++; }
    w += (-(G / L) * Math.sin(th) - damp * w) * dt; th += w * dt; tt += dt;
  }
  return th;
}
function setSky(scene, top, hor, fogC, near = 30, far = 160) {
  X.skyDome(scene, top, hor, fogC);
  scene.fog = new THREE.Fog(fogC, near, far);
}
function addAll(scene, ...o) { for (const x of o) scene.add(x.rig || x); }

// ================================================================ ESCENAS
export const SCENES = [];

// 1 · PORTADA -------------------------------------------------------------
SCENES.push({
  name: 'Title', music: 'reflect', minDur: 7, amb: [['wind']],
  events() { return [[0.2, 'riser', 3], [3.2, 'impact']]; },
  build() {
    const s = new THREE.Scene(); setSky(s, 0x6d8fb0, 0xf2b27a, 0xe8a878, 40, 260); X.paintedClouds(s, 9, 0xffe2c4, 25, 70, 160, 2);
    X.lights(s, { dir: [-10, 6, -20], sun: 0xffc890, sunI: 3.2, sky: 0x9fb5d8, gnd: 0x7a5a40, hemiI: 1.0, ext: 12 });
    X.sunDisc(s, V([-10, 4, -40]), 0xffd9a0, 18);
    X.ground(s, 0x8a7a50, 400, { tex: 'wheat', rep: 8 });
    const r = X.mulberry(3);
    for (let i = 0; i < 14; i++) { const h = 20 + r() * 30; const m = X.M(new THREE.ConeGeometry(h * 0.9, h, 7), 0x6a7a8a, { flatShading: true }); m.position.set(-120 + i * 18 + r() * 10, h / 2 - 2, -140 - r() * 40); s.add(m); }
    const hill = X.M(new THREE.SphereGeometry(30, 32, 16), 0x7a6a44); hill.scale.set(1, 0.08, 1); hill.position.set(0, -0.3, -2); s.add(hill);
    const v = CH.vajJacket(); v.pose(POSES.stand); v.place(0, 0, Math.PI, 0, 2.1); s.add(v.rig);
    const cam = makeCam(38);
    return { s, cam, update: (t) => {
      camPath(cam, [[0, [2.5, 3.2, 7], [0, 3.6, -4]], [7, [-1.5, 3.6, 5.5], [0, 3.4, -4]]], t);
      v.neck.rotation.x = -0.1; v.root.rotation.y = Math.sin(t * 0.4) * 0.05;
    } };
  },
});

// 2 · UCRANIA --------------------------------------------------------------
SCENES.push({
  name: 'Ukraine', chapter: 'I — UCRANIA', age: '5', music: 'warm', amb: [['birds'], ['wind']],
  lines: [['cap', '', 'Ucrania. Una casa sencilla y una familia de cuatro: papá, mamá, mi hermana —dos años menor— y yo.'],
    ['say', 'Papá', '¿Sabéis qué? Habrá que irnos.'], ['say', 'Mamá', '¿Irnos? ¿A dónde?'],
    ['say', 'Papá', 'A España. Yo iré primero, y luego os traeré a los tres.']],
  build(S) {
    const s = new THREE.Scene(); setSky(s, 0x7fa7d6, 0xf4d9a8, 0xe9d6ae, 25, 150); X.paintedClouds(s, 10, 0xfff6e8, 18, 45, 120, 3);
    X.lights(s, { dir: [8, 7, 6], sun: 0xffe2b8, sunI: 3.2, ext: 10 });
    X.ground(s, 0x8f9a55, 300, { tex: 'grass', rep: 6 });
    const field = X.M(new THREE.PlaneGeometry(60, 30), 0xd8b458, { roughness: 1 }, false); field.rotation.x = -Math.PI / 2; field.position.set(10, 0.01, -25); s.add(field);
    const h = X.house({ w: 7, d: 5, h: 3, wall: 0xf3eee2, roof: 0xb49a5a, trim: 0x2a5d9a, chimney: true, rh: 2.2 }); h.position.set(-3.5, 0, -7); s.add(h);
    const f = X.fence(14); f.position.set(-10, 0, -3.5); s.add(f);
    for (const [x, z, sd] of [[5, -6, 2], [7.5, -9, 3], [-9, -9, 4], [9, -4, 6]]) { const b = X.birch({ s: 1, seed: sd }); b.position.set(x, 0, z); s.add(b); }
    for (let i = 0; i < 7; i++) { const sf = X.sunflower(1.5 + (i % 3) * 0.2); sf.position.set(2.5 + i * 0.55, 0, -2.6 - (i % 2) * 0.4); sf.rotation.y = -0.3; s.add(sf); }
    const fl = X.flag('UA', { h: 4 }); fl.position.set(0.8, 0, -5.2); s.add(fl);
    const papa = CH.papa(), mama = CH.mama(), kid = CH.kid5(), sis = CH.sis3();
    addAll(s, papa, mama, kid, sis);
    const cam = makeCam(34);
    return { s, cam, update: (t) => {
      const i = S.idx(t);
      mama.pose(Object.assign({}, POSES.stand, { talk: S.talking(t, 'Mamá') })); mama.place(-1.3, 0, 0.35);
      papa.pose(Object.assign({}, i === 1 || i === 3 ? POSES.point : POSES.stand, { talk: S.talking(t, 'Papá') })); papa.place(-0.1, 0.1, -0.25);
      kid.pose(POSES.stand); kid.place(0.9, 0.3, -0.3);
      sis.pose(POSES.stand); sis.place(1.6, 0.4, -0.4);
      fl.userData.wave(t);
      camPath(cam, [[0, [1.5, 1.9, 8.5], [0.2, 1.1, 0]], [S.dur, [0.6, 1.6, 6.2], [0.2, 1.1, 0]]], t);
    } };
  },
});

// 3 · DESPEDIDA ------------------------------------------------------------
SCENES.push({
  name: 'Farewell', chapter: 'II — LA DESPEDIDA', age: '5', music: 'melancholy', amb: [['wind']],
  lines: [['cap', '', 'Tenía cinco años, casi seis, cuando papá se marchó el primero.'],
    ['say', 'Papá', 'Portaos bien. Os quiero.'],
    ['cap', '', 'En España trabajó sin descanso para poder traernos.']],
  events(L) { const lv = L[1].end + 0.8; this.leave = lv; return [[0, 'engine', lv + 4, 0.1], [lv, 'horn'], [lv + 0.4, 'swoosh']]; },
  build(S) {
    const s = new THREE.Scene(); setSky(s, 0x1d2a44, 0x5a6a8a, 0x3a4660, 20, 110);
    const L = X.lights(s, { dir: [-6, 10, 4], sun: 0x9fb5e0, sunI: 1.0, sky: 0x6a7ab0, gnd: 0x2a3040, hemiI: 0.8, ext: 14 });
    X.ground(s, 0xe8edf5, 300, { tex: 'snow', rep: 8 });
    for (const [x, z, w, h, sd] of [[-14, -18, 12, 18, 1], [0, -22, 14, 22, 2], [15, -18, 12, 16, 3], [-28, -24, 12, 20, 4]]) { const b = X.block({ w, h, d: 8, seed: sd, snow: true, lit: 0.35 }); b.position.set(x, 0, z); s.add(b); }
    for (let i = 0; i < 8; i++) { const p = X.pine({ s: 1.1, snow: true }); p.position.set(-12 + i * 3.4, 0, -8 - (i % 2) * 2); s.add(p); }
    const road = X.box(200, 0.02, 7, 0x3a3e48, { roughness: 0.6 }); road.position.set(0, 0.01, -1); road.castShadow = false; s.add(road);
    const bus = X.bus({ L: 11, lit: true, color: 0xd9a441 }); s.add(bus);
    const hl = new THREE.SpotLight(0xfff0c0, 60, 30, 0.5, 0.5); hl.position.set(6, 1.2, 0); s.add(hl); s.add(hl.target);
    const snow = X.particles(1500, 0xffffff, 0.06, 7); s.add(snow);
    const papa = CH.papaW(), mama = CH.mamaW(), kid = CH.kid5(), sis = CH.sis3();
    addAll(s, papa, mama, kid, sis);
    const cam = makeCam(34);
    return { s, cam, update: (t) => {
      const lv = S.leave, i = S.idx(t);
      // autobus: aceleracion constante a=1.4 m/s2 -> x = 1/2 a t^2
      const tt = Math.max(0, t - lv), dist = 0.5 * 1.4 * tt * tt;
      bus.position.set(-1 + dist, 0, -1.2); bus.userData.drive(dist);
      hl.position.set(bus.position.x + 5.6, 1.2, -1.2); hl.target.position.set(bus.position.x + 20, 0, -1.2);
      if (i < 1) { papa.pose(POSES.hug); papa.place(1.2, 3.0, Math.PI - 0.3); papa.rig.visible = true; }
      else { const w = walk(papa, t, S.L[1].end - 0.2, [1.2, 3.0], [3.4, 0.4], 1.3); papa.rig.visible = !w.done && t < lv; if (w.done) papa.rig.visible = false; }
      const wave = t > lv - 0.2;
      mama.pose(wave ? POSES.wave(t) : POSES.stand); mama.place(-0.4, 3.4, 0.4);
      kid.pose(wave ? POSES.wave(t + 0.4) : POSES.stand); kid.place(0.5, 3.8, 0.3);
      sis.pose(POSES.stand); sis.place(-1.2, 3.9, 0.3);
      // nieve: caida a velocidad terminal (~1 m/s) con deriva por viento
      const pos = snow.geometry.attributes.position.array, b = snow.userData.base;
      for (let k = 0; k < b.length; k++) { const [a, c, d, e] = b[k]; pos[k * 3] = (a * 60 - 30 + t * 0.6 + Math.sin(t + e * 9) * 0.3); pos[k * 3 + 1] = ((c * 14 - t * (0.8 + e * 0.5)) % 14 + 14) % 14; pos[k * 3 + 2] = d * 30 - 20; }
      snow.geometry.attributes.position.needsUpdate = true;
      camPath(cam, [[0, [-2.5, 1.8, 11], [0.5, 1.4, 1.5]], [S.dur, [-1.2, 1.6, 9.5], [1.5, 1.4, 1]]], t);
    } };
  },
});

// 4 · VIAJE --------------------------------------------------------------
SCENES.push({
  name: 'Journey', chapter: 'III — EL VIAJE', age: '8', music: 'drive', amb: [['engine', 0.08]], post: 1,
  lines: [['cap', '', 'Con ocho años llegó nuestro turno: mamá, mi hermana y yo.'],
    ['say', 'Hermana', '¿Falta mucho?'], ['say', 'Vajtan', 'Shhh… estoy dibujando.']],
  build(S) {
    const s = new THREE.Scene(); setSky(s, 0x0b1426, 0x2a3a5a, 0x1a2438, 30, 200);
    X.lights(s, { dir: [-10, 12, 8], sun: 0x8fa5d8, sunI: 0.6, sky: 0x4a5a90, gnd: 0x1a2030, hemiI: 0.6, ext: 16 });
    const stars = X.particles(900, 0xffffff, 0.8, 3, 0.9); { const p = stars.geometry.attributes.position.array, b = stars.userData.base; for (let k = 0; k < b.length; k++) { const th = b[k][0] * Math.PI * 2, ph = b[k][1] * 1.2 + 0.15; p[k * 3] = Math.cos(th) * Math.cos(ph) * 300; p[k * 3 + 1] = Math.sin(ph) * 300; p[k * 3 + 2] = Math.sin(th) * Math.cos(ph) * 300; } } s.add(stars);
    const moon = X.sphere(8, 0xfff6dd, { emissive: 0xfff0cc, emissiveIntensity: 1 }); moon.position.set(-60, 70, -200); s.add(moon);
    X.ground(s, 0x2a3326, 600);
    const road = X.box(600, 0.02, 8, 0x2b2e36, { roughness: 0.5 }); road.position.y = 0.01; road.castShadow = false; s.add(road);
    const dashes = new THREE.Group(); for (let k = 0; k < 60; k++) { const d = X.box(2, 0.03, 0.15, 0xe0c060); d.position.set(k * 6 - 180, 0.02, 0); d.castShadow = false; dashes.add(d); } s.add(dashes);
    const world = new THREE.Group(); s.add(world);
    const r = X.mulberry(8);
    for (let k = 0; k < 90; k++) { const p = X.pine({ s: 0.8 + r() * 0.8, leaf: 0x1f3a2a }); p.position.set(k * 5 - 200 + r() * 3, 0, (r() < 0.5 ? -1 : 1) * (8 + r() * 25)); world.add(p); }
    for (let k = 0; k < 12; k++) { const h = 40 + r() * 40; const m = X.M(new THREE.ConeGeometry(h, h, 7), 0x2a3448, { flatShading: true }); m.position.set(k * 60 - 300, h / 2 - 5, -170 - r() * 40); s.add(m); }
    const bus = X.bus({ L: 12, lit: true, color: 0xeaeaea, stripe: 0x2a4d7a }); s.add(bus);
    const head = (x, c) => { const h = X.sphere(0.16, c); h.position.set(x, 2.55, 1.05); bus.add(h); };
    head(-2.6, 0x1c1512); head(-1.25, 0x2a2020); head(0.1, 0x1c1512);
    const hl = new THREE.SpotLight(0xfff0c0, 80, 40, 0.45, 0.5); hl.position.set(6, 1.2, 0); s.add(hl); hl.target.position.set(30, 0, 0); s.add(hl.target);
    const cam = makeCam(36);
    return { s, cam, update: (t) => {
      const v = 16, d = v * t;                               // 16 m/s ~ 58 km/h
      world.position.x = -(d % 250); dashes.position.x = -(d % 6);
      bus.position.set(0, 0.03 * Math.sin(t * 9), 1.8); bus.userData.drive(d);
      camPath(cam, [[0, [-11, 3.6, 21], [0, 2.2, 1]], [S.dur, [6, 3.2, 19], [0, 2.2, 1]]], t);
    } };
  },
});

// 5 · TOMELLOSO ------------------------------------------------------------
SCENES.push({
  name: 'Tomelloso', chapter: 'IV — TOMELLOSO', age: '8', music: 'uplift', amb: [['birds']],
  lines: [['cap', '', 'Tomelloso. Papá nos esperaba. La familia, por fin, junta otra vez.'],
    ['say', 'Papá', 'Bienvenidos a casa.'],
    ['cap', '', 'Yo era un niño un poco raro: siempre dibujando. Un chaval de artes.']],
  build(S) {
    const s = new THREE.Scene(); setSky(s, 0x5f9ad6, 0xd9ecf5, 0xdcd4c0, 30, 170); X.paintedClouds(s, 10, 0xffffff, 25, 60, 150, 4);
    X.lights(s, { dir: [6, 12, 5], sun: 0xfff4e0, sunI: 3.6, ext: 14 });
    X.ground(s, 0xd8c8a8, 300, { tex: 'tiles', rep: 4 });
    const ch = X.church(); ch.position.set(0, 0, -26); ch.rotation.y = 0; s.add(ch);
    for (const [x, z] of [[-14, -20], [16, -24]]) { const c = X.chimney(24); c.position.set(x, 0, z); s.add(c); }
    const wm = X.windmill(); wm.position.set(26, 0, -60); wm.scale.setScalar(1.3); s.add(wm);
    for (const [x, z, ry, c] of [[-12, -10, 0.3, 0xb5533c], [12, -11, -0.3, 0xa84a34], [-20, -3, 1.2, 0xb5533c], [20, -3, -1.2, 0xb5533c]]) { const h = X.house({ w: 8, d: 6, h: 4, wall: 0xf7f4ee, roof: c, trim: 0x2a5d9a }); h.position.set(x, 0, z); h.rotation.y = ry; s.add(h); }
    const fo = X.cyl(1.6, 1.8, 0.6, 0xd8d2c4); fo.position.set(0, 0.3, -6); s.add(fo);
    const wat = X.cyl(1.4, 1.4, 0.05, 0x5a9ad0, { roughness: 0.1, metalness: 0.2 }); wat.position.set(0, 0.6, -6); s.add(wat);
    const bench = new THREE.Group(); { const b = X.rbox(2, 0.08, 0.5, 0.02, 0x7a5a3c); b.position.y = 0.45; bench.add(b); for (const x of [-0.8, 0.8]) { const l = X.box(0.08, 0.45, 0.45, 0x333333); l.position.set(x, 0.22, 0); bench.add(l); } } bench.position.set(-2.8, 0, -1.5); bench.rotation.y = 0.4; s.add(bench);
    const pad = X.box(0.3, 0.02, 0.22, 0xffffff); s.add(pad);
    const papa = CH.papa(), mama = CH.mama(), kid = CH.kid8(), sis = CH.sis6(), ka = new Human({ height: 1.3, age: 'kid8', style: 'kid', hair: 0x7a4a2a, shirt: 0x3a8a5a }), kb = new Human({ height: 1.32, age: 'kid8', style: 'short', shirt: 0xe0a73c });
    addAll(s, papa, mama, kid, sis, ka, kb);
    const ball = X.sphere(0.11, 0xf4f4f4); s.add(ball);
    const cam = makeCam(34);
    return { s, cam, update: (t) => {
      const i = S.idx(t);
      wm.userData.hub.rotation.z = -t * 0.8;
      if (i < 2) {
        pad.visible = false; ka.rig.visible = kb.rig.visible = false; ball.visible = false;
        papa.pose(Object.assign({}, t > 3.3 ? POSES.hug : POSES.stand, { talk: S.talking(t, 'Papá') })); papa.place(0, 1.5, 0.3);
        const k = walk(kid, t, 0.3, [3.6, 3.2], [0.45, 2.1], 1.6, POSES.hug);
        walk(mama, t, 0.3, [4.8, 3.6], [1.6, 2.6], 1.3); walk(sis, t, 0.3, [5.6, 4.2], [2.4, 3.0], 1.3);
        if (k.done) { kid.rig.rotation.y = Math.PI + 0.3; }
        camPath(cam, [[0, [3, 1.8, 10], [1.5, 1.2, 2]], [S.dur, [1.2, 1.5, 7], [0.8, 1.1, 2]]], t);
      } else {
        const u = t - S.L[2].start;
        papa.rig.visible = mama.rig.visible = sis.rig.visible = false; ka.rig.visible = kb.rig.visible = ball.visible = true; pad.visible = true;
        const sp = Object.assign({}, POSES.sit, { shR: 35, elR: 70 + 10 * Math.sin(u * 10), shL: 30, elL: 70, neckX: 25 });
        kid.pose(sp); kid.rig.position.set(-2.8, 0.5 + kid.com * 0.18, -1.5); kid.rig.rotation.set(0, 0.4, 0);
        kid.rig.position.y = 0.49 - 0 + (kid.com - kid.P.thigh * 1.3) * 0.0 + 0.02 + kid.com * 0.0; kid.rig.position.y = 0.5 + 0.06;
        kid.root.position.y = -kid.com;
        pad.position.set(-2.55, 0.86, -1.1); pad.rotation.set(-0.7, 0.4, 0);
        // pelota: rebote con restitucion 0.6 entre dos ninos
        const ph = (u * 0.7) % 2, p = ph < 1 ? ph : 2 - ph, x = lerp(2.2, 5.2, p);
        const hop = (u * 1.4) % 1; ball.position.set(x, 0.11 + Math.abs(Math.sin(hop * Math.PI)) * 0.6, 0.5);
        const fa = x < 3.7; ka.pose(POSES.stand); ka.place(1.8, 0.5, Math.PI / 2); kb.pose(POSES.stand); kb.place(5.6, 0.5, -Math.PI / 2);
        camPath(cam, [[S.L[2].start, [-1, 1.7, 5.5], [-1.8, 0.9, -1]], [S.dur, [-2, 1.5, 3.6], [-2.6, 0.9, -1.4]]], t);
      }
    } };
  },
});

// 6 · KICKBOXING ---------------------------------------------------------
SCENES.push({
  name: 'KickGym', chapter: 'V — GUARDIA ARRIBA', age: '8½', music: 'drive',
  lines: [['cap', '', 'Con ocho años y medio, papá me apuntó a kickboxing. Boxeo no había.'],
    ['say', 'Papá', '¡Guardia arriba!'], ['say', 'Vajtan', '¡Pam! ¡Pam!']],
  events(L) { this.hits = []; for (let s = L[2].start + 0.3; s < L[2].start + 20; s += 0.75) this.hits.push(s); return this.hits.map(h => [h, 'punch']); },
  build(S) {
    const s = new THREE.Scene(); s.background = new THREE.Color(0x2a2620);
    const Lt = X.lights(s, { dir: [-4, 6, -8], sun: 0xfff0d0, sunI: 4, sky: 0xffe8c8, gnd: 0x4a3a2a, hemiI: 0.9, ext: 8, target: [0, 0, 0] });
    const rm = X.room({ w: 12, d: 10, h: 4.5, wall: 0xd8c8a4, window: [2, 2.6, 3.5, 2], sky: 0xfff2d8, skyI: 1.2 }); s.add(rm);
    const floor = X.ground(s, 0x6b5a44, 40, { tex: 'wood' });
    const tm = X.tatami(8, 6); tm.position.set(0, 0, 0); s.add(tm);
    const bag = X.bag({ chain: 1.3 }); bag.position.set(0.9, 3.6, -0.5); s.add(bag);
    const beam = X.box(8, 0.2, 0.2, 0x4a3a2a); beam.position.set(0, 3.7, -0.5); s.add(beam);
    const post = X.box(1.4, 1.8, 0.05, 0xf4efe4); post.position.set(-3.5, 2.4, -4.85); s.add(post);
    const papa = CH.papa(), kid = CH.kidKick(); addAll(s, papa, kid);
    const cam = makeCam(34);
    return { s, cam, update: (t) => {
      const hits = S.hits || [];
      // el golpe llega 0.12 s despues de iniciar el gesto
      const th = pendulum(t, hits.map(h => h + 0.12), bag.userData.len, 1.3, 1.1);
      bag.rotation.x = -th;
      let last = null; for (const h of hits) if (h <= t) last = h;
      const i = S.idx(t);
      let kp = i >= 1 ? POSES.guard(t) : POSES.stand;
      if (last !== null && t - last < 0.3) kp = hits.indexOf(last) % 2 ? punchPose((t - last) / 0.3) : kickPose((t - last) / 0.3);
      kid.pose(Object.assign({}, kp, { talk: S.talking(t, 'Vajtan') })); kid.place(0.9, 0.35, Math.PI);
      papa.pose(Object.assign({}, i >= 1 ? POSES.guard(t) : POSES.cross, { talk: S.talking(t, 'Papá') })); papa.place(-1.6, 0.6, 0.6);
      camPath(cam, [[0, [0.6, 1.8, 7.8], [-0.4, 1.1, -0.2]], [S.dur, [0.2, 1.6, 6.8], [-0.3, 1.0, -0.2]]], t);
    } };
  },
});

// 7 · PARKOUR 12 ----------------------------------------------------------
function jumpPlan(spots, t0, vx, run = 0.9) {
  // cada salto: carrera 'run' s y vuelo balistico con T = dx / vx
  const seg = []; let t = t0;
  for (let k = 0; k < spots.length - 1; k++) {
    const a = spots[k], b = spots[k + 1];
    const T = Math.abs(b[0] - a[0] - 1.2) / vx;
    const vy = ((b[1] - a[1]) + 0.5 * G * T * T) / T;
    seg.push({ a, b, tj: t + run, T, vy }); t += run + T;
  }
  return seg;
}
SCENES.push({
  name: 'Parkour12', chapter: 'VI — PARKOUR', age: '12', music: 'tension', minDur: 9.5,
  lines: [['cap', '', 'A los doce descubrí el parkour. Piripi, piripa… pa, pam, pam, pim.']],
  events() { this.plan = jumpPlan([[0, 9], [5, 10], [10, 8.5], [15, 9.5], [20, 9], [25, 10]], 0.3, 4.2, 0.55); return this.plan.map(j => [j.tj, 'swoosh']); },
  build(S) {
    const s = new THREE.Scene(); setSky(s, 0x5a6fa0, 0xf4a070, 0xe89a70, 40, 180); X.paintedClouds(s, 10, 0xffc8a0, 25, 60, 140, 5);
    X.lights(s, { dir: [-15, 8, 10], sun: 0xffb070, sunI: 3.2, sky: 0x8a90c0, gnd: 0x5a3a30, hemiI: 0.9, ext: 20, target: [12, 8, 0] });
    X.sunDisc(s, V([-40, 10, -60]), 0xffc890, 22);
    X.ground(s, 0x6a5a50, 400);
    const plan = S.plan;
    const tops = [9, 10, 8.5, 9.5, 9, 10];
    tops.forEach((h, k) => { const b = X.rbox(3.8, h, 6, 0.05, [0xe8e0d0, 0xd8c8b0, 0xefe6d6][k % 3]); b.position.set(k * 5 + 0.6, h / 2, 0); s.add(b);
      const r = X.box(3.9, 0.25, 6.1, 0x9a8a7a); r.position.set(k * 5 + 0.6, h + 0.12, 0); s.add(r);
      if (k % 2) { const tank = X.cyl(0.5, 0.5, 1, 0x888888, { metalness: 0.5 }); tank.position.set(k * 5 + 1.5, h + 0.75, -1.5); s.add(tank); } });
    for (let k = 0; k < 20; k++) { const bh = 8 + (k * 37 % 12); const b = X.box(4, bh, 4, 0xb89a88); b.position.set(-10 + k * 4.5, bh / 2, -32 - (k % 3) * 6); s.add(b); }
    const teen = CH.teen12(); s.add(teen.rig);
    const cam = makeCam(36);
    return { s, cam, update: (t) => {
      let st = null; for (const j of plan) if (t >= j.tj - 0.55) st = j;
      let x, y, rot = 0, pose = POSES.stand, face = Math.PI / 2;
      if (!st || t < plan[0].tj - 0.55) { x = 0.2; y = tops[0]; }
      if (st) {
        const j = st;
        if (t < j.tj) { const u = (t - (j.tj - 0.55)) / 0.55; x = j.a[0] + 0.6 * u; y = j.a[1]; const g = gait(teen, t, 4.2, true); pose = g.pose; }
        else if (t < j.tj + j.T) { const tt = t - j.tj; x = j.a[0] + 0.6 + 4.2 * tt; y = j.a[1] + j.vy * tt - 0.5 * G * tt * tt; pose = POSES.tuck; const k = plan.indexOf(j); rot = k % 2 ? -(tt / j.T) * Math.PI * 2 : 0; if (k % 2 === 0) pose = lerpPose(POSES.stand, POSES.tuck, Math.sin(Math.PI * tt / j.T)); }
        else { x = j.b[0] - 0.6; y = j.b[1]; pose = lerpPose(POSES.tuck, POSES.stand, cl((t - j.tj - j.T) / 0.3, 0, 1)); }
      }
      teen.pose(pose);
      teen.rig.position.set(x, y + teen.com, 2.2); teen.rig.rotation.set(0, face, 0); teen.rig.rotateX(rot);
      cam.position.set(x - 1.2, y + 1.6, 9.5); cam.lookAt(x + 1.2, y + 0.6, 2.2);
    } };
  },
});

// 8 · EL MORTAL ------------------------------------------------------------
SCENES.push({
  name: 'Accident', chapter: 'VII — EL MORTAL', age: '16', music: 'tension', delays: { 1: 3.4 },
  lines: [['cap', '', 'Dieciséis años, casi diecisiete. Un mortal en un gimnasio…'],
    ['cap', '', 'Me rompí el atlas, la primera vértebra del cuello. Por suerte, caí sobre un tatami.']],
  events(L) {
    this.tr = L[0].end + 0.2; this.tj = this.tr + 1.0; this.T = 0.62; this.ti = this.tj + this.T;
    return [[this.tj - 0.8, 'riser', 1.5], [this.ti * 1, 'impact'], [this.ti + 1.2, 'xray', 6], [this.ti + 1.3, 'heart', 6]];
  },
  build(S) {
    const s = new THREE.Scene(); s.background = new THREE.Color(0x1a1f28);
    X.lights(s, { dir: [3, 9, 6], sun: 0xf4f0ff, sunI: 3.2, sky: 0xdfe8ff, gnd: 0x3a3a44, hemiI: 1, ext: 10 });
    const rm = X.room({ w: 16, d: 12, h: 6, wall: 0xc8d2d8, window: [-3, 3.5, 5, 2.5], sky: 0xe0f0ff }); s.add(rm);
    X.ground(s, 0x8a7a66, 40, { tex: 'wood' });
    const tm = X.tatami(12, 6, 0x2a5d9a, 0x2a4d7a); tm.position.set(1, 0, 0); s.add(tm);
    for (let k = 0; k < 8; k++) { const b = X.box(0.08, 3.5, 0.08, 0x9a7a5a); b.position.set(-7.8 + k * 0.4, 1.75, -5.8); s.add(b); }
    const teen = CH.teen(); s.add(teen.rig);
    const xs = new THREE.Scene(); xs.background = new THREE.Color(0x071320);
    xs.add(new THREE.AmbientLight(0x6f9fd0, 0.6)); const pl = new THREE.PointLight(0x9fd0ff, 30, 20); pl.position.set(2, 3, 4); xs.add(pl);
    const sp = X.spine(); xs.add(sp);
    const xcam = makeCam(32);
    const cam = makeCam(36);
    return { s, cam, update: (t) => {
      const ti = S.ti;
      if (t > ti + 1.1) {
        this.xray = true;
        const u = t - ti - 1.1;
        sp.rotation.y = 0.6 + u * 0.35;
        sp.userData.crack.material.color.setHSL(0.01, 1, 0.45 + 0.15 * Math.sin(u * 7));
        xcam.position.set(0, 1.2, 4.2 - Math.min(1.2, u * 0.25)); xcam.lookAt(0, 0.7, 0);
        return { scene: xs, camera: xcam };
      }
      const tr = S.tr, tj = S.tj, T = S.T;
      const vx = 4.0;                                          // velocidad horizontal de carrera
      let x, y, pose = POSES.stand, rot = 0, drop = 0;
      if (t < tr) { x = -4; y = 0; }
      else if (t < tj) { const tt = t - tr; x = -4 + vx * tt; const g = gait(teen, tt, vx, true); pose = g.pose; drop = g.drop; }
      else if (t < tj + T) {
        const tt = t - tj, vy = 0.5 * G * T;                  // vuelo balistico: sube y baja a la misma altura
        x = -4 + vx * (tj - tr) + vx * tt; y = vy * tt - 0.5 * G * tt * tt;
        rot = -(tt / T) * Math.PI * 0.92;                     // rotacion insuficiente: cae de cabeza
        pose = lerpPose(POSES.stand, POSES.tuck, Math.min(1, tt / 0.2));
      } else {
        const tt = t - tj - T; x = -4 + vx * (tj - tr + T) + Math.min(0.4, tt * 0.8);
        const fall = Math.min(1, tt / 0.55); rot = -Math.PI * 0.92 - fall * fall * Math.PI * 0.58;  // colapso por gravedad
        y = -teen.com + 0.35 + (1 - fall) * 0.4; pose = lerpPose(POSES.tuck, POSES.lieBack, fall);
      }
      teen.pose(pose);
      teen.rig.position.set(x, teen.com + y - drop, 0.4); teen.rig.rotation.set(0, Math.PI / 2, 0); teen.rig.rotateX(rot);
      const fx = Math.min(x, 1.2); cam.position.set(fx - 0.4, 1.5 - (t > ti ? 0.3 : 0), 7.2 - (t > ti ? 1.8 * Math.min(1, t - ti) : 0)); cam.lookAt(fx, t > ti ? 0.5 : 1.0, 0.4);
      if (t > ti && t < ti + 0.5) shake(cam, (0.5 - (t - ti)) * 0.25, t);
      return null;
    }, slow: (t) => (t > S.tj - 0.1 && t < S.ti) ? 0.35 : 1 };
  },
});

// 9 · TRES MESES -----------------------------------------------------------
SCENES.push({
  name: 'Halo', chapter: 'VIII — TRES MESES', age: '16', music: 'melancholy', amb: [['tv'], ['tick'], ['rain', 0.05]],
  lines: [['cap', '', 'Tres meses con un aparato en el cuello.'],
    ['cap', '', 'Ahí cambió mi forma de ver el mundo. Sobre todo, la política mundial.']],
  build(S) {
    const s = new THREE.Scene(); s.background = new THREE.Color(0x0d1220);
    s.add(new THREE.HemisphereLight(0x8a9ac0, 0x3a3038, 1.6));
    const rm = X.room({ w: 9, d: 8, h: 3.2, wall: 0x6a7a7a, window: [-2.4, 1.9, 1.6, 1.4], sky: 0x1d2a44, skyI: 0.5 }); s.add(rm);
    X.ground(s, 0x5a4636, 30, { tex: 'wood' });
    const bd = X.bed(); bd.position.set(-1.5, 0, -1.8); bd.rotation.y = Math.PI / 2; s.add(bd);
    const cab = X.rbox(1.6, 0.6, 0.5, 0.03, 0x4a3a2a); cab.position.set(2.2, 0.3, -2.2); s.add(cab);
    const tv = X.screen(1.4, 0.8, (c, w, h, t = 0) => {
      c.fillStyle = '#0d3a5a'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#6fd0a0';
      const blobs = [[0.18, 0.35, 0.12, 0.18], [0.3, 0.7, 0.07, 0.15], [0.5, 0.3, 0.1, 0.12], [0.55, 0.62, 0.08, 0.16], [0.75, 0.35, 0.16, 0.14], [0.85, 0.72, 0.06, 0.07]];
      for (const [x, y, rx, ry] of blobs) { c.beginPath(); c.ellipse((x + t * 0.02) % 1 * w, y * h, rx * w, ry * h, 0, 0, 7); c.fill(); }
      for (let k = 0; k < 5; k++) { const a = 0.5 + 0.5 * Math.sin(t * 4 + k); c.fillStyle = `rgba(255,70,60,${a})`; c.beginPath(); c.arc((0.2 + k * 0.15) * w, (0.4 + (k % 2) * 0.2) * h, 10, 0, 7); c.fill(); }
      c.fillStyle = '#c0392b'; c.fillRect(0, h * 0.85, w, h * 0.15); c.fillStyle = '#fff'; c.font = 'bold 34px Liberation Sans'; c.fillText('NOTICIAS · MUNDO · POLÍTICA · NOTICIAS · MUNDO', -((t * 80) % 400), h * 0.96);
    }); tv.position.set(2.2, 1.1, -2.2); s.add(tv);
    const tvL = new THREE.PointLight(0x5fb0d0, 6, 8); tvL.position.set(2.1, 1.1, -1.3); s.add(tvL);
    const lamp = new THREE.PointLight(0xffc080, 14, 9); lamp.position.set(-2.5, 2.4, 1); lamp.castShadow = true; s.add(lamp);
    const rain = X.particles(500, 0x8fb0d0, 0.03, 3, 0.6); s.add(rain);
    const teen = CH.teenHalo(); s.add(teen.rig);
    const cam = makeCam(34);
    return { s, cam, update: (t) => {
      X.redraw(tv.userData.tex, t);
      tvL.intensity = 5 + Math.sin(t * 13) * 1.2 + Math.sin(t * 5.3) * 0.8;
      teen.pose(Object.assign({}, POSES.sit, { shL: 20, shR: 20, elL: 60, elR: 60 }));
      teen.rig.position.set(-1.3, 0.62 + 0.03, -1.3); teen.rig.rotation.set(0, 0.9, 0); teen.root.position.y = -teen.com;
      teen.rig.position.y = 0.62;
      const p = rain.geometry.attributes.position.array, b = rain.userData.base;
      for (let k = 0; k < b.length; k++) { p[k * 3] = -3.2 + b[k][0] * 1.6; p[k * 3 + 1] = ((b[k][1] * 2 - t * 6) % 2 + 2) % 2 + 1; p[k * 3 + 2] = -4.3; }
      rain.geometry.attributes.position.needsUpdate = true;
      camPath(cam, [[0, [2.2, 1.7, 5.2], [0.3, 0.95, -1.8]], [S.dur, [1.5, 1.6, 4.4], [0.3, 1.0, -1.8]]], t);
    } };
  },
});

// 10 · DE VUELTA ------------------------------------------------------------
SCENES.push({
  name: 'BackParkour', chapter: 'IX — DE VUELTA', age: '17', music: 'uplift', amb: [['birds']], minDur: 8.5,
  lines: [['cap', '', 'Ocho meses después volví al parkour. Y salté mucho. Muchísimo.'],
    ['cap', '', 'El kickboxing seguía ahí, en modo light.']],
  events() { this.plan = jumpPlan([[0, 1.0], [4, 1.6], [8, 1.2], [12, 1.8], [16, 1.0], [20, 1.4], [24, 1.2], [28, 1.6], [32, 1.0], [36, 1.5]], 0.2, 4.6, 0.35); return this.plan.map(j => [j.tj, 'swoosh']); },
  build(S) {
    const s = new THREE.Scene(); setSky(s, 0x6aa0d8, 0xe0eef5, 0xd0dcd0, 30, 150); X.paintedClouds(s, 10, 0xffffff, 18, 50, 120, 6);
    X.lights(s, { dir: [8, 10, 8], sun: 0xfff4e0, sunI: 3.4, ext: 22, target: [18, 0, 0] });
    X.ground(s, 0x7a9a5a, 400, { tex: 'grass' });
    const tops = [1.0, 1.6, 1.2, 1.8, 1.0, 1.4, 1.2, 1.6, 1.0, 1.5];
    tops.forEach((h, k) => { const b = X.rbox(2.4, h, 2.4, 0.05, 0xc8c4bc); b.position.set(k * 4, h / 2, 0); s.add(b); });
    for (let k = 0; k < 14; k++) { const tr = X.tree({ s: 1 + (k % 3) * 0.2, seed: k }); tr.position.set(k * 3.5 - 4, 0, -7 - (k % 2) * 4); s.add(tr); }
    const gl = new THREE.Group(); for (const x of [-0.12, 0.12]) { const g = X.sphere(0.12, 0xc0392b); g.scale.set(1, 1.2, 1.1); g.position.set(x, 0, 0); gl.add(g); } gl.position.set(1.8, 1.25, 1.6); s.add(gl);
    const bench = X.rbox(1.8, 0.08, 0.5, 0.02, 0x7a5a3c); bench.position.set(1.8, 0.45, 1.6); s.add(bench);
    const teen = CH.teen(); s.add(teen.rig);
    const cam = makeCam(38);
    const plan = S.plan;
    return { s, cam, update: (t) => {
      let st = null; for (const j of plan) if (t >= j.tj - 0.35) st = j;
      let x = 0, y = tops[0], pose = POSES.stand, rot = 0;
      if (st) {
        const j = st, k = plan.indexOf(j);
        if (t < j.tj) { x = j.a[0] + (t - (j.tj - 0.35)) / 0.35 * 0.6; y = j.a[1]; pose = gait(teen, t, 4.6, true).pose; }
        else if (t < j.tj + j.T) { const tt = t - j.tj; x = j.a[0] + 0.6 + 4.6 * tt; y = j.a[1] + j.vy * tt - 0.5 * G * tt * tt; pose = lerpPose(POSES.stand, POSES.tuck, Math.sin(Math.PI * tt / j.T)); if (k % 3 === 2) rot = -(tt / j.T) * Math.PI * 2; }
        else { x = j.b[0] - 0.6; y = j.b[1]; }
      }
      teen.pose(pose); teen.rig.position.set(x, y + teen.com, 0); teen.rig.rotation.set(0, Math.PI / 2, 0); teen.rig.rotateX(rot);
      gl.visible = bench.visible = S.idx(t) === 1;
      if (S.idx(t) === 1) { gl.position.x = x + 1.5; bench.position.x = x + 1.5; }
      cam.position.set(x - 0.6, y + 1.8, 8.5); cam.lookAt(x + 0.5, y + 0.8, 0);
    } };
  },
});

// 11 · ARTES --------------------------------------------------------------
SCENES.push({
  name: 'Art', chapter: 'X — ARTES', age: '19', music: 'reflect',
  lines: [['cap', '', 'De los diecisiete a los diecinueve estudié artes… pero mi cabeza estaba en el parkour.'],
    ['cap', '', 'Con diecinueve o veinte dejé el kickboxing. Parkour a tope, y algún trabajo de diseño.']],
  build(S) {
    const s = new THREE.Scene(); s.background = new THREE.Color(0x2a2620);
    X.lights(s, { dir: [-6, 7, -6], sun: 0xfff0d8, sunI: 3.8, sky: 0xffeacc, gnd: 0x4a3a2a, hemiI: 1, ext: 7, target: [0, 0, 0] });
    const rm = X.room({ w: 10, d: 8, h: 4, wall: 0xe4d6b8, window: [-1.5, 2.3, 4, 2.2], sky: 0xfff4dc, skyI: 1.2 }); s.add(rm);
    X.ground(s, 0x7a6a56, 30, { tex: 'wood' });
    const easel = new THREE.Group();
    for (const [x, rz] of [[-0.35, -0.12], [0.35, 0.12]]) { const l = X.box(0.05, 2, 0.05, 0x7a5a3c); l.position.set(x, 1, 0); l.rotation.z = rz; easel.add(l); }
    const back = X.box(0.05, 1.9, 0.05, 0x7a5a3c); back.position.set(0, 0.95, -0.4); back.rotation.x = -0.25; easel.add(back);
    const canv = X.screen(0.9, 1.1, (c, w, h, p = 0) => {
      c.fillStyle = '#f4efe4'; c.fillRect(0, 0, w, h);
      c.fillStyle = `rgba(232,96,76,${Math.min(1, p * 2)})`; c.fillRect(0, 0, w, h * 0.6 * Math.min(1, p * 1.5));
      if (p > 0.3) { c.fillStyle = '#e9b44c'; c.beginPath(); c.arc(w * 0.6, h * 0.35, 70 * Math.min(1, (p - 0.3) * 3), 0, 7); c.fill(); }
      if (p > 0.55) { c.fillStyle = '#243150'; c.fillRect(0, h * 0.62, w, h * 0.38); }
      if (p > 0.7) { c.fillStyle = '#1b1b22'; const x = w * (0.2 + 0.5 * ((p - 0.7) / 0.3)); c.beginPath(); c.arc(x, h * 0.5, 16, 0, 7); c.fill(); c.lineWidth = 12; c.strokeStyle = '#1b1b22'; c.beginPath(); c.moveTo(x, h * 0.52); c.lineTo(x - 30, h * 0.62); c.moveTo(x, h * 0.52); c.lineTo(x + 34, h * 0.58); c.stroke(); }
    }, { frame: 0xf4efe4 }); canv.position.set(0, 1.35, 0.05); canv.rotation.x = -0.12; easel.add(canv);
    easel.position.set(0.6, 0, -0.8); easel.rotation.y = -0.5; s.add(easel);
    const stool = X.chair(); stool.position.set(-0.6, 0, 0.2); s.add(stool);
    for (let k = 0; k < 5; k++) { const j = X.cyl(0.06, 0.06, 0.14, [0xc0392b, 0xe9b44c, 0x2a6d8f, 0x3a8a5a, 0xf19db1][k]); j.position.set(-2 + k * 0.18, 0.82, -2.5); s.add(j); }
    const tbl = X.desk(1.6); tbl.position.set(-1.6, 0, -2.5); s.add(tbl);
    const teen = CH.teen(); s.add(teen.rig);
    const cam = makeCam(34);
    return { s, cam, update: (t) => {
      X.redraw(canv.userData.tex, cl(t / 7, 0, 1));
      teen.pose(Object.assign({}, POSES.sit, { shR: 70, elR: 40 + 12 * Math.sin(t * 8), abdR: 20, shYR: -30, shL: 25, elL: 70, neckX: 5 }));
      teen.rig.position.set(-0.6, 0.5, 0.2); teen.rig.rotation.set(0, 2.3, 0);
      camPath(cam, [[0, [2.6, 1.7, 3.6], [0, 1, -0.5]], [S.dur, [1.8, 1.4, 2.8], [0, 1.05, -0.5]]], t);
    } };
  },
});

// 12 · COMPETIR / PANDEMIA --------------------------------------------------
SCENES.push({
  name: 'Pandemic', chapter: 'XI — COMPETIR', age: '23', music: 'night',
  lines: [['cap', '', 'Parkour hasta los veintidós. A los veintitrés volví al kickboxing, esta vez para competir.'],
    ['cap', '', 'Y entonces llegó la pandemia. Todo se cerró.']],
  events(L) { const s1 = L[1].start; this.s1 = s1; this.hits = []; for (let s = 0.8; s < s1 - 0.3; s += 0.7) this.hits.push(s); return [[s1, 'rain', 12, 0.16], [s1 + 0.2, 'shutter'], ...this.hits.map(h => [h + 0.12, 'punch'])]; },
  build(S) {
    const s = new THREE.Scene(); s.background = new THREE.Color(0x201c18);
    X.lights(s, { dir: [3, 6, 5], sun: 0xffe0b0, sunI: 2.6, sky: 0xffe0c0, gnd: 0x3a2a20, hemiI: 0.8, ext: 6 });
    const rm = X.room({ w: 10, d: 8, h: 4, wall: 0x8a7a6a }); s.add(rm);
    X.ground(s, 0x3a3a44, 30);
    const tm = X.tatami(6, 5, 0x2a2a30, 0xb5402e); s.add(tm);
    const bag = X.bag({ chain: 1.2 }); bag.position.set(0.8, 3.7, -0.6); s.add(bag);
    const f = CH.youngFight(); s.add(f.rig);
    // noche, lluvia, gimnasio cerrado
    const n = new THREE.Scene(); n.background = new THREE.Color(0x0a0f1c); n.fog = new THREE.Fog(0x0a0f1c, 10, 40);
    n.add(new THREE.HemisphereLight(0x2a3a60, 0x0a0a10, 0.5));
    const wet = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), STD({ color: 0x22262e, roughness: 0.15, metalness: 0.6 })); wet.rotation.x = -Math.PI / 2; wet.receiveShadow = true; n.add(wet);
    const fac = X.box(14, 6, 0.5, 0x3a3e48); fac.position.set(0, 3, -4); n.add(fac);
    const shut = X.screen(6, 3, (c, w, h) => { c.fillStyle = '#6d7a86'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < h; y += 24) c.fillRect(0, y, w, 5); c.fillStyle = '#c0392b'; c.fillRect(w * 0.25, h * 0.38, w * 0.5, h * 0.24); c.fillStyle = '#fff'; c.font = 'bold 120px Liberation Sans'; c.textAlign = 'center'; c.fillText('CERRADO', w / 2, h * 0.56); }, { frame: 0x2a2e36 });
    shut.position.set(0, 1.6, -3.7); n.add(shut);
    const sign = X.screen(4, 0.8, (c, w, h) => { c.fillStyle = '#1b1b22'; c.fillRect(0, 0, w, h); c.fillStyle = '#e9b44c'; c.font = 'bold 200px Liberation Sans'; c.textAlign = 'center'; c.fillText('GIMNASIO', w / 2, h * 0.8); }); sign.position.set(0, 4.2, -3.7); n.add(sign);
    const lampP = X.cyl(0.06, 0.08, 5, 0x333333); lampP.position.set(-3.5, 2.5, -1); n.add(lampP);
    const spot = new THREE.SpotLight(0xffd8a0, 90, 14, 0.6, 0.5); spot.position.set(-3.3, 5, -1); spot.castShadow = true; spot.target.position.set(-2, 0, 0.8); n.add(spot, spot.target);
    const bulb = X.sphere(0.15, 0xfff0c0, { emissive: 0xffe0a0, emissiveIntensity: 3 }); bulb.position.set(-3.3, 4.95, -1); n.add(bulb);
    const rain = X.particles(2500, 0xa8c0e0, 0.04, 9, 0.6); n.add(rain);
    const f2 = CH.young(); n.add(f2.rig);
    const cam = makeCam(34);
    return { s, cam, update: (t) => {
      if (t < S.s1) {
        const th = pendulum(t, S.hits.map(h => h + 0.12), bag.userData.len, 1.5, 1.0); bag.rotation.x = -th;
        let last = null; for (const h of S.hits) if (h <= t) last = h;
        let p = POSES.guard(t); if (last !== null && t - last < 0.3) p = S.hits.indexOf(last) % 3 === 2 ? kickPose((t - last) / 0.3) : punchPose((t - last) / 0.3, S.hits.indexOf(last) % 2 ? 'L' : 'R');
        f.pose(p); f.place(0.8, 0.45, Math.PI);
        camPath(cam, [[0, [3.4, 1.9, 5.8], [0.4, 1.3, -0.4]], [S.s1, [2.6, 1.7, 5], [0.4, 1.3, -0.4]]], t);
        return null;
      }
      const u = t - S.s1;
      const cyc = u % 1.3; let p = POSES.guard(u); if (cyc < 0.3) p = punchPose(cyc / 0.3, 'R'); else if (cyc > 0.65 && cyc < 0.95) p = punchPose((cyc - 0.65) / 0.3, 'L');
      f2.pose(p); f2.place(-2, 0.8, 0.5);
      const pp = rain.geometry.attributes.position.array, b = rain.userData.base;
      for (let k = 0; k < b.length; k++) { pp[k * 3] = b[k][0] * 20 - 10 + u * 0.8; pp[k * 3 + 1] = ((b[k][1] * 8 - u * 9) % 8 + 8) % 8; pp[k * 3 + 2] = b[k][2] * 10 - 4; }
      rain.geometry.attributes.position.needsUpdate = true;
      camPath(cam, [[0, [0.2, 1.8, 7.5], [-1.4, 1.3, -0.6]], [12, [-0.4, 1.7, 6.5], [-1.4, 1.3, -0.6]]], u);
      return { scene: n, camera: cam };
    } };
  },
});

// 13 · QUEMADO -------------------------------------------------------------
SCENES.push({
  name: 'Business', chapter: 'XII — QUEMADO', age: '24', music: 'tension', amb: [['tick']],
  lines: [['cap', '', 'Monté un negocio de diseño… y acabé completamente quemado.'], ['say', 'Vajtan', 'Se acabó. Lo dejo.']],
  events(L) { const e = L[1].start; this.e = e; return [[0.3, 'typing', e - 0.3], [1.2, 'fire', e - 1.2], [e + 1.4, 'door']]; },
  build(S) {
    const s = new THREE.Scene(); s.background = new THREE.Color(0x0c1018);
    s.add(new THREE.HemisphereLight(0x8090c0, 0x302830, 1.5));
    const dl = new THREE.PointLight(0xffd8a0, 10, 7); dl.position.set(-1.2, 2.2, 0.5); dl.castShadow = true; s.add(dl);
    const rm = X.room({ w: 9, d: 7, h: 3.2, wall: 0x4a5260, window: [-2, 1.9, 2.6, 1.6], sky: 0x16203a, skyI: 0.6 }); s.add(rm);
    X.ground(s, 0x3a3a44, 30);
    const dk = X.desk(2.6); dk.position.set(0.3, 0, -1.8); s.add(dk);
    const mons = []; for (let k = 0; k < 3; k++) { const m = X.screen(0.62, 0.38, (c, w, h, on = 1, t = 0) => { c.fillStyle = on ? '#e8eef4' : '#050507'; c.fillRect(0, 0, w, h); if (!on) return; c.fillStyle = ['#c0392b', '#2a6d8f', '#e9b44c'][k]; c.fillRect(20, 20, w * 0.4, h * 0.45); c.fillStyle = '#8a95a0'; for (let y = 30; y < h - 20; y += 22) c.fillRect(w * 0.5, y, w * 0.4 * (0.5 + 0.5 * Math.sin(y + t)), 8); }); m.position.set(-0.45 + k * 0.68, 1.1, -2.0); m.rotation.y = (1 - k) * 0.25; s.add(m); mons.push(m); }
    const glow = new THREE.PointLight(0xa0c8ff, 5, 5); glow.position.set(0.3, 1.2, -1.2); s.add(glow);
    const clock = X.screen(0.5, 0.5, (c, w, h, t = 0) => { c.fillStyle = '#f4f4f0'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, 7); c.fill(); c.strokeStyle = '#111'; c.lineWidth = 10; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + Math.cos(t * 6) * 80, h / 2 + Math.sin(t * 6) * 80); c.stroke(); c.lineWidth = 14; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + Math.cos(t / 2) * 50, h / 2 + Math.sin(t / 2) * 50); c.stroke(); }, { frame: 0x222222 });
    clock.position.set(2.2, 2.3, -3.45); s.add(clock);
    const cups = []; for (let k = 0; k < 9; k++) { const c = X.cup(); c.position.set(-0.9 + (k % 5) * 0.14, 0.775, -1.55 - Math.floor(k / 5) * 0.14); s.add(c); cups.push(c); }
    const ch = X.chair(); ch.position.set(0.3, 0, -0.9); ch.rotation.y = Math.PI; s.add(ch);
    const fire = X.particles(260, 0xff7a30, 0.07, 5, 0.85); s.add(fire);
    const v = CH.young(); s.add(v.rig);
    const cam = makeCam(34);
    return { s, cam, update: (t) => {
      const on = t < S.e + 0.6;
      mons.forEach(m => X.redraw(m.userData.tex, on ? 1 : 0, t)); X.redraw(clock.userData.tex, t);
      glow.intensity = on ? 9 : 0.3;
      cups.forEach((c, k) => { c.visible = k < 1 + Math.floor(t * 1.2); });
      const heat = cl(t / S.e, 0, 1);
      const fp = fire.geometry.attributes.position.array, fb = fire.userData.base;
      if (t < S.e + 1) {
        const up = Object.assign({}, POSES.sit, { shL: 50, shR: 50, elL: 80 + 8 * Math.sin(t * 25), elR: 80 + 8 * Math.sin(t * 23), abdL: 12, abdR: 12, shYL: -15, shYR: -15, neckX: 10 });
        const st = t > S.e ? lerpPose(up, POSES.stand, cl((t - S.e) / 0.8, 0, 1)) : up;
        v.pose(Object.assign({}, st, { talk: S.talking(t, 'Vajtan') }));
        const rise = cl((t - S.e) / 0.8, 0, 1);
        v.rig.position.set(0.3, lerp(0.5, v.com, rise), -0.85); v.rig.rotation.set(0, Math.PI, 0);
        for (let k = 0; k < fb.length; k++) { const life = (t * (1 + fb[k][3]) + fb[k][0]) % 1; fp[k * 3] = 0.3 + (fb[k][1] - 0.5) * 0.35 * (1 - life); fp[k * 3 + 1] = (t < S.e ? 1.55 : 1.95) + life * (0.3 + 0.7 * heat); fp[k * 3 + 2] = -0.85 + (fb[k][2] - 0.5) * 0.3; }
        fire.material.opacity = t < S.e ? 0.25 + 0.6 * heat : Math.max(0, 0.85 - (t - S.e) * 1.2);
      } else {
        walk(v, t, S.e + 1, [0.3, -0.85], [4, 3], 1.4);
        fire.material.opacity = 0;
      }
      fire.geometry.attributes.position.needsUpdate = true;
      camPath(cam, [[0, [2, 1.6, 2.4], [0.2, 1.2, -1.3]], [S.dur, [1.4, 1.5, 1.9], [0.2, 1.3, -1.3]]], t);
    } };
  },
});

// 14 · LA NOCHE -------------------------------------------------------------
SCENES.push({
  name: 'Doorman', chapter: 'XIII — LA NOCHE', age: '25', music: 'night', amb: [['club']],
  lines: [['cap', '', 'Me centré en competir y trabajé de portero de noche casi dos años.'], ['say', 'Vajtan', 'Tú sí. Tú también. Tú… hoy no.']],
  build(S) {
    const s = new THREE.Scene(); s.background = new THREE.Color(0x07090f); s.fog = new THREE.Fog(0x07090f, 12, 40);
    s.add(new THREE.HemisphereLight(0x7080b0, 0x302028, 1.3));
    const ql = new THREE.PointLight(0xffc890, 12, 9); ql.position.set(-2, 3, 2.5); s.add(ql);
    const wet = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), STD({ color: 0x1c1e26, roughness: 0.2, metalness: 0.5 })); wet.rotation.x = -Math.PI / 2; wet.receiveShadow = true; s.add(wet);
    const brick = X.canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#5a2e28'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(20,10,8,0.6)'; for (let y = 0; y < h; y += 32) { c.fillRect(0, y, w, 4); for (let x = (y / 32 % 2) * 32; x < w; x += 64) c.fillRect(x, y, 4, 32); } });
    brick.wrapS = brick.wrapT = THREE.RepeatWrapping; brick.repeat.set(4, 2);
    const wall = X.M(new THREE.BoxGeometry(16, 7, 0.4), STD({ map: brick, roughness: 0.9 })); wall.position.set(0, 3.5, -3); s.add(wall);
    const door = X.box(1.8, 2.6, 0.1, 0x111114); door.position.set(0.5, 1.3, -2.75); s.add(door);
    const neonTex = X.canvasTex(1024, 256, (c, w, h, on = 1) => { c.clearRect(0, 0, w, h); c.font = 'bold 200px Liberation Sans'; c.textAlign = 'center'; c.shadowColor = '#ff4fb0'; c.shadowBlur = on ? 40 : 0; c.fillStyle = on ? '#ffd0ec' : '#442233'; c.fillText('DISCO', w / 2, h * 0.78); });
    const neon = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, toneMapped: false })); neon.position.set(0.5, 3.6, -2.75); s.add(neon);
    const nl = new THREE.PointLight(0xff4fb0, 25, 12); nl.position.set(0.5, 3.4, -1.8); s.add(nl);
    const dl = new THREE.SpotLight(0xffd8a0, 40, 10, 0.7, 0.6); dl.position.set(1.5, 3.2, -1); dl.castShadow = true; dl.target.position.set(1.8, 0, 0.5); s.add(dl, dl.target);
    const st1 = X.stanchion(), st2 = X.stanchion(); st1.position.set(-1.6, 0, -0.4); st2.position.set(-1.6, 0, 1.6); s.add(st1, st2);
    const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V([-1.6, 0.95, -0.4]), V([-1.62, 0.65, 0.6]), V([-1.6, 0.95, 1.6])]), 20, 0.035, 8), mat(0x9b1c2c)); rope.castShadow = true; s.add(rope);
    const v = CH.young(), gs = [CH.g1(), CH.g2(), CH.g3()]; addAll(s, v, ...gs);
    const cam = makeCam(34);
    return { s, cam, update: (t) => {
      const on = Math.floor(t * 5) % 11 !== 0; X.redraw(neonTex, on ? 1 : 0); nl.intensity = on ? 25 : 3;
      v.pose(Object.assign({}, POSES.cross, { talk: S.talking(t, 'Vajtan') })); v.place(1.9, 0.2, -0.2);
      const i = S.idx(t);
      if (i < 1) gs.forEach((g, k) => { g.pose(POSES.stand); g.place(-2.4, 0.6 + k * 1.0, Math.PI * 0.85); });
      else {
        const u = t - S.L[1].start;
        gs.forEach((g, k) => {
          const st = k * 0.9;
          if (k < 2) { const w = walk(g, u, st, [-2.4, 0.6 + k * 1.0], [0.5, -2.4], 1.3); g.rig.visible = !w.done; }
          else if (u < 2.3) walk(g, u, 1.0, [-2.4, 2.6], [-0.8, 1.2], 1.2);
          else walk(g, u, 2.6, [-0.8, 1.2], [-6, 4], 1.1, POSES.sad);
        });
      }
      camPath(cam, [[0, [0.2, 1.8, 8.2], [-0.3, 1.3, 0.3]], [S.dur, [0.2, 1.7, 7.2], [-0.2, 1.3, 0.3]]], t);
    } };
  },
});

// 15 · EL ESPEJO -----------------------------------------------------------
SCENES.push({
  name: 'Buzz', chapter: 'XIV — EL ESPEJO', age: '26½', music: 'quirky',
  lines: [['cap', '', 'A los veintiséis y medio empecé a quedarme calvo…'],
    ['cap', '', 'Así que máquina y rapado. Pelo cortito, y listo.'],
    ['say', 'Vajtan', 'Así pesa menos la cabeza para las patadas.']],
  events(L) { this.s = L[1].start + 0.3; return [[this.s, 'clipper', 3.2]]; },
  build(S) {
    const s = new THREE.Scene(); s.background = new THREE.Color(0xdfe8ea);
    X.lights(s, { dir: [1, 3, 4], sun: 0xffffff, sunI: 2.8, sky: 0xffffff, gnd: 0x9aa0a0, hemiI: 1.3, ext: 3 });
    const tiles = X.canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#e8f0f2'; c.fillRect(0, 0, w, h); c.fillStyle = '#b8c8cc'; for (let k = 0; k <= w; k += 64) { c.fillRect(k, 0, 3, h); c.fillRect(0, k, w, 3); } }); tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(3, 3);
    const wall = X.M(new THREE.PlaneGeometry(8, 6), STD({ map: tiles })); wall.position.set(0, 2, -1.2); s.add(wall);
    const v = CH.thin(); s.add(v.rig);
    const clip = new THREE.Group(); { const b = X.rbox(0.05, 0.16, 0.035, 0.012, 0x1b1b22); clip.add(b); const bl = X.box(0.052, 0.012, 0.03, 0xcccccc, { metalness: 0.8 }); bl.position.y = 0.085; clip.add(bl); } s.add(clip);
    const bits = X.particles(900, 0x2a2020, 0.012, 11, 1); s.add(bits);
    const frame = new THREE.Group(); for (const [w, h, x, y] of [[1.6, 0.06, 0, 0.85], [1.6, 0.06, 0, -0.85], [0.06, 1.76, -0.8, 0], [0.06, 1.76, 0.8, 0]]) { const b = X.box(w, h, 0.06, 0x8a6a48); b.position.set(x, y, 0); frame.add(b); } s.add(frame);
    const cam = makeCam(30);
    let swapped = false;
    return { s, cam, update: (t) => {
      const u = t - S.s;
      if (u > 3.1 && !swapped) { v.setHair('buzz'); swapped = true; }
      if (u <= 3.1 && swapped) { v.setHair('thin'); swapped = false; }
      v.pose(Object.assign({}, POSES.stand, { shR: u > 0 && u < 3.2 ? 150 : 2, elR: u > 0 && u < 3.2 ? 110 : 8, abdR: u > 0 && u < 3.2 ? 40 : 6, talk: S.talking(t, 'Vajtan') }));
      v.place(0, 0.5, 0);
      const headY = v.com + v.hipY * 0.0 + 1.86 * 0.87 - v.com + v.rig.position.y - v.com;
      const hy = 1.86 * 0.93;
      clip.visible = u > 0 && u < 3.2;
      if (clip.visible) { const a = u / 3.2; clip.position.set(Math.sin(a * Math.PI * 3) * 0.08, hy + 0.13 - Math.abs(Math.sin(a * Math.PI * 3)) * 0.02, 0.5 + 0.1 - a * 0.22); clip.rotation.set(0.6 - a * 1.4, 0, Math.sin(a * 20) * 0.1); }
      const bp = bits.geometry.attributes.position.array, bb = bits.userData.base;
      for (let k = 0; k < bb.length; k++) { const t0 = bb[k][0] * 3.1, dt = u - t0; if (u < 0 || dt < 0) { bp[k * 3 + 1] = -10; continue; } bp[k * 3] = (bb[k][1] - 0.5) * 0.25 + (bb[k][3] - 0.5) * dt * 0.2; bp[k * 3 + 1] = Math.max(0.01, hy + 0.1 - 0.5 * G * dt * dt * 0.5); bp[k * 3 + 2] = 0.45 + (bb[k][2] - 0.5) * 0.2; }
      bits.geometry.attributes.position.needsUpdate = true;
      frame.position.set(0, hy - 0.1, 1.2); frame.visible = false;
      camPath(cam, [[0, [0, hy + 0.02, 1.9], [0, hy - 0.12, 0]], [S.dur, [0, hy + 0.02, 1.5], [0, hy - 0.1, 0]]], t);
    } };
  },
});

// 16 · ZOOASIS ---------------------------------------------------------------
SCENES.push({
  name: 'Zooasis', chapter: 'XV — ZOOASIS', age: '27', music: 'uplift',
  lines: [['cap', '', 'Volví al marketing. Hoy me dedico al marketing digital de captación de clientes.'],
    ['cap', '', 'Desde los veintisiete ayudo a Juanma —Eco Juanma— con Zooasis, su refugio de perros en Albacete.'],
    ['say', 'Juanma', '¡Vajtan, que los panas también quieren salir en internet!'],
    ['cap', '', 'Monto sistemas online para refugios de animales. En eso soy un crack.']],
  events(L) { const e = []; for (let s = L[0].start + 1; s < L[1].start; s += 1) e.push([s, 'register']); for (let s = L[1].start + 0.5; s < L[1].start + 30; s += 1.5) e.push([s, 'bark']); for (let k = 0; k < 4; k++) e.push([L[3].start + 1 + k * 0.7, 'click']); return e; },
  build(S) {
    const s = new THREE.Scene(); setSky(s, 0x6a9ad0, 0xf4e2b8, 0xe8d8b0, 30, 160); X.paintedClouds(s, 10, 0xfff6e8, 18, 50, 120, 7);
    X.lights(s, { dir: [8, 9, 6], sun: 0xffeccc, sunI: 3.4, ext: 12 });
    X.ground(s, 0xb8a060, 300, { tex: 'wheat', rep: 6 });
    for (let k = 0; k < 4; k++) { const f = X.fence(16); f.position.set(-8, 0, -6); f.rotation.y = 0; if (k === 1) { f.position.set(-8, 0, -6); f.rotation.y = -Math.PI / 2; } if (k === 2) { f.position.set(8, 0, -6); f.rotation.y = -Math.PI / 2; } if (k > 0) f.scale.x = 0.7; s.add(f); }
    for (const x of [-5, -2.5]) { const kn = X.kennel(); kn.position.set(x, 0, -4.5); s.add(kn); }
    const sign = X.screen(3.2, 1.1, (c, w, h) => { c.fillStyle = '#2a6d5f'; c.fillRect(0, 0, w, h); c.fillStyle = '#f4efe4'; c.font = 'bold 280px Liberation Serif'; c.textAlign = 'center'; c.fillText('ZOOASIS', w / 2, h * 0.72); }, { frame: 0x6b4a32 });
    sign.position.set(3.5, 2.6, -6.2); s.add(sign);
    for (const x of [2.1, 4.9]) { const p = X.box(0.12, 2.6, 0.12, 0x6b4a32); p.position.set(x, 1.3, -6.25); s.add(p); }
    for (const [x, z, sd] of [[-10, -12, 1], [10, -14, 2], [0, -18, 3]]) { const tr = X.tree({ s: 1.3, seed: sd, leaf: 0x7a8a50 }); tr.position.set(x, 0, z); s.add(tr); }
    const dogs = [X.dog({ galgo: true, color: 0xc8a57a }), X.dog({ galgo: true, color: 0x8a8a8a }), X.dog({ color: 0x4a3a2a }), X.dog({ galgo: true, color: 0xe8e0d0 }), X.dog({ color: 0xc08040 })];
    dogs.forEach(d => s.add(d));
    const jm = CH.juanma(), v = CH.vaj(); addAll(s, jm, v);
    const phone = X.rbox(0.075, 0.15, 0.012, 0.008, 0x111111); s.add(phone);
    const laptopCam = makeCam(32);
    const lap = X.screen(1.6, 1.0, (c, w, h, mode = 0, p = 0) => {
      c.fillStyle = '#f4f2ee'; c.fillRect(0, 0, w, h);
      if (mode === 0) {
        c.strokeStyle = '#243150'; c.lineWidth = 4; c.beginPath(); c.moveTo(60, h - 60); c.lineTo(w - 40, h - 60); c.moveTo(60, h - 60); c.lineTo(60, 40); c.stroke();
        c.strokeStyle = '#e8604c'; c.lineWidth = 12; c.beginPath(); const pts = [[0, 0.1], [0.15, 0.2], [0.3, 0.18], [0.45, 0.38], [0.6, 0.5], [0.75, 0.66], [0.9, 0.86]];
        pts.forEach(([x, y], k) => { if (x > p) return; const X_ = 60 + x * (w - 120), Y_ = h - 60 - y * (h - 120); k ? c.lineTo(X_, Y_) : c.moveTo(X_, Y_); }); c.stroke();
        c.fillStyle = '#243150'; c.font = 'bold 110px Liberation Serif'; c.textAlign = 'right'; c.fillText('+' + Math.floor(p * 128), w - 60, 140); c.font = 'bold 34px Liberation Sans'; c.fillText('CLIENTES', w - 60, 190);
      } else {
        c.fillStyle = '#2a6d5f'; c.fillRect(0, 0, w, 110); c.fillStyle = '#fff'; c.font = 'bold 56px Liberation Sans'; c.fillText('ADOPTA UN PANA', 40, 75);
        const cols = ['#c8a57a', '#8a8a8a', '#e8e0d0'];
        for (let k = 0; k < 3; k++) { if (p < k * 0.2) continue; const x = 40 + k * (w - 80) / 3; c.fillStyle = '#e9e2d0'; c.fillRect(x + 10, 150, (w - 80) / 3 - 20, h - 220); c.fillStyle = cols[k]; c.beginPath(); c.ellipse(x + (w - 80) / 6, 290, 90, 45, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(x + (w - 80) / 6 + 90, 245, 40, 26, 0.3, 0, 7); c.fill(); c.fillStyle = '#e8604c'; c.fillRect(x + 40, h - 170, (w - 80) / 3 - 80, 60); c.fillStyle = '#fff'; c.font = 'bold 34px Liberation Sans'; c.fillText('ADOPTAR', x + 60, h - 128); }
        if (p > 0.7) { c.fillStyle = '#2a9d8f'; c.font = 'bold 40px Liberation Sans'; c.fillText('● SISTEMA ONLINE', 40, h - 30); }
      }
    }, { frame: 0x2a2a30 });
    const ls = new THREE.Scene(); ls.background = new THREE.Color(0x1a1c22); ls.add(new THREE.AmbientLight(0xffffff, 1)); ls.add(lap);
    const cam = makeCam(34);
    return { s, cam, update: (t) => {
      const i = S.idx(t);
      if (i < 1 || i === 3) {
        const p = i < 1 ? cl((t - 0.3) / 4.5, 0, 1) : cl((t - S.L[3].start) / 3, 0, 1);
        X.redraw(lap.userData.tex, i < 1 ? 0 : 1, p);
        laptopCam.position.set(0.25 * Math.sin(t * 0.3), 0.1, 2.9 - p * 0.3); laptopCam.lookAt(0, -0.05, 0);
        return { scene: ls, camera: laptopCam };
      }
      dogs.forEach((d, k) => {
        const R = 3 + k * 0.7, w = (k % 2 ? 1 : -1) * (d.userData.galgo ? 0.9 : 0.6) * (1.2 / R) * 3, a = t * w + k * 1.3;
        d.position.set(Math.cos(a) * R + 0.5, 0, Math.sin(a) * R * 0.5 - 1.5); d.rotation.y = -a + (w > 0 ? -Math.PI / 2 : Math.PI / 2) + Math.PI / 2;
        d.userData.anim(t + k, Math.abs(w) * R);
      });
      jm.pose(Object.assign({}, POSES.phone, { talk: S.talking(t, 'Juanma') })); jm.place(-0.8, 1.8, 0.4);
      const jh = jm.arms.R.wr.getWorldPosition(new THREE.Vector3()); phone.position.copy(jh); phone.position.y += 0.05; phone.rotation.y = 0.4;
      v.pose(POSES.laptop); v.place(0.6, 1.9, -0.3);
      camPath(cam, [[S.L[1].start, [0.5, 1.8, 8.5], [0, 1.2, 0]], [S.L[3].start, [-0.5, 1.6, 6.5], [0, 1.2, 0.5]]], t);
      return null;
    } };
  },
});

// 17 · PELEAR -------------------------------------------------------------
SCENES.push({
  name: 'Fights', chapter: 'XVI — PELEAR', age: '30', music: 'triumph', amb: [['crowd', 0.1]],
  lines: [['cap', '', 'Primero, kickboxing: campeón de España de K1, en +91 kg.'],
    ['cap', '', 'Luego llegó el MMA. Primer amateur: victoria. El segundo: derrota. El tercero: otra derrota…'],
    ['cap', '', 'Pero el profesional lo gané. Aunque acabé bastante reventado. XD']],
  events(L) {
    this.ko = 3.2; const L1 = L[1], L2 = L[2];
    this.t1 = L1.timeOf('victoria'); this.t2 = L1.timeOf('derrota.'); this.t3 = L1.timeOf('otra');
    return [[0.2, 'bell'], [1.3, 'punch'], [1.9, 'punch'], [2.5, 'punch'], [this.ko, 'bigpunch'], [this.ko + 0.4, 'cheer'], [this.t1, 'win'], [this.t2, 'loss'], [this.t3 + 0.4, 'loss'], [L2.start + 0.2, 'bell'], [L2.start + 0.6, 'cheer'], [L2.start + 0.8, 'win']];
  },
  build(S) {
    const s = new THREE.Scene(); s.background = new THREE.Color(0x07080d); s.fog = new THREE.Fog(0x07080d, 14, 40);
    s.add(new THREE.HemisphereLight(0x3a4060, 0x100c0c, 0.35));
    const rg = X.ring(6); s.add(rg);
    const cg = X.cage(4.2, 2); cg.visible = false; s.add(cg);
    const spot = new THREE.SpotLight(0xfff4e0, 400, 30, 0.42, 0.45); spot.position.set(0, 12, 2); spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.target.position.set(0, 1, 0); s.add(spot, spot.target);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4.5, 11, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false })); cone.position.set(0, 6.5, 1); s.add(cone);
    // publico instanciado
    const crowd = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 0.6, 4, 8), STD({ color: 0xffffff, roughness: 0.9 }), 240);
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), STD({ color: 0xc89a7a }), 240);
    const r = X.mulberry(4), seats = [];
    for (let k = 0; k < 240; k++) { const a = r() * Math.PI * 2, R = 7 + r() * 8; seats.push([Math.cos(a) * R, Math.floor((R - 7) / 2) * 0.6, Math.sin(a) * R, r() * 6]); crowd.setColorAt(k, new THREE.Color().setHSL(r(), 0.35, 0.25 + r() * 0.2)); }
    s.add(crowd, heads);
    const vf = CH.vajFight(), rv = CH.rival(), vm = CH.vajMMA(), vb = CH.vajBeaten(), ref = new Human({ height: 1.76, shirt: 0xf2f2f2, pants: 0x1b1b22 });
    addAll(s, vf, rv, vm, vb, ref);
    const belt = new THREE.Group(); { const b = X.rbox(0.9, 0.16, 0.04, 0.02, 0xd4a93a, { metalness: 0.8, roughness: 0.3 }); belt.add(b); const p = X.cyl(0.14, 0.14, 0.03, 0xe8c050, { metalness: 0.9, roughness: 0.2 }); p.rotation.x = Math.PI / 2; p.position.z = 0.03; belt.add(p); } s.add(belt);
    const conf = X.particles(700, 0xe9b44c, 0.06, 12, 0.95); s.add(conf);
    const cam = makeCam(34), m4 = new THREE.Matrix4();
    return { s, cam, update: (t) => {
      const i = S.idx(t);
      for (let k = 0; k < seats.length; k++) { const [x, y, z, ph] = seats[k]; const jump = t > S.ko && i !== 1 ? Math.max(0, Math.sin(t * 8 + ph)) * 0.15 : Math.max(0, Math.sin(t * 3 + ph)) * 0.03; m4.makeTranslation(x, 1.3 + y + jump, z); crowd.setMatrixAt(k, m4); m4.makeTranslation(x, 1.3 + y + jump + 0.55, z); heads.setMatrixAt(k, m4); }
      crowd.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
      vf.rig.visible = rv.rig.visible = i < 1; vm.rig.visible = i === 1; vb.rig.visible = belt.visible = i === 2; ref.rig.visible = i === 2; conf.visible = i === 2;
      rg.visible = i !== 1; cg.visible = i === 1;
      if (i < 1) {
        const ex = [[1.2, 'p'], [1.8, 'p'], [2.4, 'p']];
        let pv = POSES.guard(t); for (const [tt] of ex) if (t > tt && t < tt + 0.3) pv = punchPose((t - tt) / 0.3, 'R');
        if (t > S.ko - 0.25 && t < S.ko + 0.1) pv = kickPose((t - S.ko + 0.25) / 0.35);
        if (t > S.ko + 1.2) pv = POSES.win;
        vf.pose(pv); vf.place(-0.9, 0, Math.PI / 2, 0, 1.04);
        if (t < S.ko) { rv.pose(POSES.guard(t + 1)); rv.place(0.9, 0, -Math.PI / 2, 0, 1.04); }
        else {  // caida: rotacion con aceleracion angular por gravedad (pendulo invertido)
          const u = t - S.ko; let th = 0, w = 1.2; const dt = 1 / 200; for (let q = 0; q < u / dt && th < Math.PI / 2; q++) { w += (G / rv.com) * Math.sin(th + 0.05) * dt * 0.6; th += w * dt; } th = Math.min(th, Math.PI / 2);
          rv.pose(lerpPose(POSES.guard(0), POSES.lieBack, th / (Math.PI / 2)));
          rv.rig.position.set(0.9 + Math.sin(th) * rv.com * 0.9, 1.04 + Math.cos(th) * rv.com * 0.9 + 0.12 * Math.sin(th), 0); rv.rig.rotation.set(0, -Math.PI / 2, 0); rv.rig.rotateX(-th);
        }
        camPath(cam, [[0, [3.5, 2.6, 7.5], [0, 1.9, 0]], [S.ko, [2.2, 2.2, 6], [0, 1.9, 0]], [S.dur, [-1.5, 2.3, 6], [0, 2.1, 0]]], t);
        if (t > S.ko && t < S.ko + 0.3) shake(cam, 0.06, t);
      } else if (i === 1) {
        vm.pose(t > S.t2 ? POSES.sad : POSES.guard(t)); vm.place(0, 0, 0.2, 0, 1.04);
        camPath(cam, [[S.L[1].start, [4, 2.4, 6], [0, 1.9, 0]], [S.L[2].start, [2.5, 2.2, 5.2], [0, 2, 0]]], t);
      } else {
        vb.pose(POSES.belt); vb.place(0, 0.2, 0.15, 0, 1.04);
        const hL = vb.arms.L.wr.getWorldPosition(new THREE.Vector3()), hR = vb.arms.R.wr.getWorldPosition(new THREE.Vector3());
        belt.position.copy(hL).add(hR).multiplyScalar(0.5); belt.lookAt(cam.position); belt.rotation.z = Math.atan2(hR.y - hL.y, hR.x - hL.x);
        ref.pose(Object.assign({}, POSES.stand, { abdL: 160, elL: 10 })); ref.place(1.4, -0.3, -0.5, 0, 1.04);
        const u = t - S.L[2].start, cp = conf.geometry.attributes.position.array, cb = conf.userData.base;
        for (let k = 0; k < cb.length; k++) { cp[k * 3] = (cb[k][0] - 0.5) * 10 + Math.sin(u * 2 + k) * 0.2; cp[k * 3 + 1] = 9 - ((cb[k][1] * 9 + u * (1 + cb[k][3])) % 9); cp[k * 3 + 2] = (cb[k][2] - 0.5) * 8; }
        conf.geometry.attributes.position.needsUpdate = true;
        camPath(cam, [[S.L[2].start, [0.8, 2.3, 5], [0, 2.2, 0]], [S.dur, [0.3, 2.3, 3.8], [0, 2.3, 0]]], t);
      }
    } };
  },
});

// 18 · HOY ---------------------------------------------------------------
SCENES.push({
  name: 'End', chapter: 'XVII — HOY', age: '31', music: 'warm', amb: [['birds'], ['wind']], post: 5.5,
  lines: [['cap', '', 'Llegué con ocho años. Veintitrés años después, esta es mi casa.'],
    ['cap', '', 'Ucrania, Georgia y España en el corazón. Y la aventura sigue.']],
  events(L) { this.fin = L[1].end + 1; return [[this.fin, 'win']]; },
  build(S) {
    const s = new THREE.Scene(); setSky(s, 0x4a5a90, 0xf49a6a, 0xe8906a, 30, 200); X.paintedClouds(s, 10, 0xffc0a0, 20, 60, 150, 8);
    X.lights(s, { dir: [-12, 5, -14], sun: 0xffa870, sunI: 3.2, sky: 0x8a90c0, gnd: 0x5a3a30, hemiI: 1, ext: 12 });
    X.sunDisc(s, V([-12, 3, -40]), 0xffc890, 20);
    X.ground(s, 0xa08a50, 400, { tex: 'wheat', rep: 8 });
    const hill = X.M(new THREE.SphereGeometry(40, 32, 16), 0x9a8448); hill.scale.set(1, 0.07, 1); hill.position.set(0, -0.5, -10); s.add(hill);
    const mills = []; for (const [x, z] of [[-9, -14], [8, -18], [16, -24]]) { const w = X.windmill(); w.position.set(x, 2, z); w.rotation.y = 0.3; s.add(w); mills.push(w); }
    const flags = []; for (const [x, k] of [[-2.6, 'UA'], [-1.4, 'GE'], [2.4, 'ES']]) { const f = X.flag(k, { h: 4.5 }); f.position.set(x * 1.3, 2.1, -4.5); s.add(f); flags.push(f); }
    const v = CH.vaj(); s.add(v.rig);
    const galgo = X.dog({ galgo: true, color: 0xc8a57a }); s.add(galgo);
    const cam = makeCam(36);
    return { s, cam, update: (t) => {
      mills.forEach((m, k) => m.userData.hub.rotation.z = -t * 0.7 - k);
      flags.forEach((f, k) => f.userData.wave(t + k));
      v.pose(t > S.fin - 1 ? POSES.wave(t) : POSES.stand); v.place(0.3, 0, 0.2, 0, 2.3);
      galgo.position.set(1.2, 2.3, 0.4); galgo.rotation.y = -0.4; galgo.userData.anim(t, 0);
      camPath(cam, [[0, [3, 3.5, 9.5], [0, 3.6, -1]], [S.dur, [-2.5, 3.7, 8.5], [0, 3.7, -1]]], t);
    } };
  },
});
