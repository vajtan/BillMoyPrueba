// Biblioteca de decorados 3D procedurales.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, GRAD } from './human.js';
const STD = (o) => { const p = Object.assign({ gradientMap: GRAD }, o); delete p.roughness; delete p.metalness; return new THREE.MeshToonMaterial(p); };

export function M(geo, color, o = {}, cast = true) {
  const m = new THREE.Mesh(geo, color instanceof THREE.Material ? color : mat(color, o));
  m.castShadow = cast; m.receiveShadow = true; return m;
}
export const box = (w, h, d, c, o) => M(new THREE.BoxGeometry(w, h, d), c, o);
export const rbox = (w, h, d, r, c, o) => M(new RoundedBoxGeometry(w, h, d, 3, r), c, o);
export const cyl = (rt, rb, h, c, o, seg = 20) => M(new THREE.CylinderGeometry(rt, rb, h, seg), c, o);
export const sphere = (r, c, o) => M(new THREE.SphereGeometry(r, 24, 16), c, o);
export function at(obj, x, y, z, ry = 0) { obj.position.set(x, y, z); obj.rotation.y = ry; return obj; }

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.userData = { c, ctx, draw };
  return t;
}
export function redraw(tex, ...args) { const { ctx, c, draw } = tex.userData; draw(ctx, c.width, c.height, ...args); tex.needsUpdate = true; }

// ---------------------------------------------------------------- entorno
export function skyDome(scene, top, horizon, bottom = horizon) {
  const g = new THREE.SphereGeometry(400, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, hor: { value: new THREE.Color(horizon) }, bot: { value: new THREE.Color(bottom) } },
    vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 bot; varying vec3 p; void main(){ float h=p.y; vec3 c = h>0. ? mix(hor, top, pow(h,0.6)) : mix(hor, bot, pow(-h,0.5)); gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}',
  });
  m.userData.outlineParameters = { visible: false };
  const s = new THREE.Mesh(g, m); scene.add(s); return s;
}
export function paintedClouds(scene, n, color, y0, y1, dist, seed = 1, scale = 1) {
  const r = mulberry(seed), g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color, fog: false, transparent: true, opacity: 0.95 }); m.userData.outlineParameters = { visible: false };
  for (let i = 0; i < n; i++) {
    const c = new THREE.Group();
    const w = (8 + r() * 14) * scale;
    for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.CircleGeometry(w * (0.2 + r() * 0.18), 28), m); b.position.set((k - 2.5) * w * 0.17, Math.sin(k / 5 * Math.PI) * w * 0.12, 0); c.add(b); }
    const base = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.1, w * 0.18), m); base.position.y = -w * 0.08; c.add(base);
    const a = (r() - 0.5) * 2.2;
    c.position.set(Math.sin(a) * dist, y0 + r() * (y1 - y0), -Math.cos(a) * dist);
    c.lookAt(0, c.position.y, 0);
    g.add(c);
  }
  scene.add(g); return g;
}
export function sunDisc(scene, dir, color, size = 30) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(size, 48), new THREE.MeshBasicMaterial({ color, fog: false })); m.material.userData.outlineParameters = { visible: false };
  m.position.copy(dir.clone().normalize().multiplyScalar(380)); m.lookAt(0, 0, 0); scene.add(m); return m;
}
export function lights(scene, o = {}) {
  const sun = new THREE.DirectionalLight(o.sun ?? 0xfff0dd, o.sunI ?? 3);
  sun.position.set(...(o.dir || [5, 8, 6]));
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  const e = o.ext ?? 8; Object.assign(sun.shadow.camera, { left: -e, right: e, top: e, bottom: -e, near: 0.5, far: 60 });
  if (o.target) sun.target.position.set(...o.target);
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(o.sky ?? 0xc6d8ff, o.gnd ?? 0x8a7050, o.hemiI ?? 1.1); scene.add(hemi);
  return { sun, hemi };
}
export function ground(scene, color, size = 200, o = {}) {
  const tex = o.tex ? canvasTex(512, 512, (c, w, h) => {
    const r = mulberry(o.seed || 1);
    c.fillStyle = '#' + new THREE.Color(color).getHexString(); c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const v = (r() - 0.5) * 30; c.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 400})`; c.fillRect(r() * w, r() * h, 2 + r() * 4, 2 + r() * 4); }
    if (o.tex === 'wheat') for (let i = 0; i < 4000; i++) { c.strokeStyle = r() < 0.5 ? 'rgba(255,230,140,0.5)' : 'rgba(150,100,30,0.35)'; const x = r() * w, y = r() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 3, y - 6 - r() * 8); c.stroke(); }
    if (o.tex === 'tiles') { c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 2; for (let k = 0; k <= w; k += 64) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, h); c.stroke(); c.beginPath(); c.moveTo(0, k); c.lineTo(w, k); c.stroke(); } }
    if (o.tex === 'wood') { for (let k = 0; k < h; k += 42) { c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, k, w, 2); for (let j = 0; j < 3; j++) c.fillRect(r() * w, k, 2, 42); } }
  }) : null;
  if (tex) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(size / (o.rep || 6), size / (o.rep || 6)); }
  const g = M(new THREE.PlaneGeometry(size, size), STD({ color: tex ? 0xffffff : color, map: tex, roughness: 0.95 }), {}, false);
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g); return g;
}
export function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- construcciones
export function house(o = {}) {
  const w = o.w || 6, d = o.d || 5, h = o.h || 3, g = new THREE.Group();
  const wall = rbox(w, h, d, 0.05, o.wall ?? 0xf3ede0); wall.position.y = h / 2; g.add(wall);
  const rh = o.rh || 1.8;
  const shape = new THREE.Shape(); shape.moveTo(-w / 2 - 0.3, 0); shape.lineTo(0, rh); shape.lineTo(w / 2 + 0.3, 0); shape.lineTo(-w / 2 - 0.3, 0);
  const roof = M(new THREE.ExtrudeGeometry(shape, { depth: d + 0.6, bevelEnabled: false }), o.roof ?? 0xb5533c, { roughness: 0.9 });
  roof.position.set(0, h, -d / 2 - 0.3); g.add(roof);
  const door = box(1, 2, 0.1, o.door ?? 0x6b4a2e); door.position.set(o.doorX ?? 0, 1, d / 2 + 0.03); g.add(door);
  for (const wx of o.windows ?? [-w * 0.3, w * 0.3]) {
    const fr = box(1.1, 1.1, 0.12, o.trim ?? 0x2a4d7a); fr.position.set(wx, h * 0.58, d / 2 + 0.04); g.add(fr);
    const gl = box(0.9, 0.9, 0.13, o.lit ? 0xffd27a : 0x9fc3dc, o.lit ? { emissive: 0xffb84a, emissiveIntensity: 1.2 } : { roughness: 0.2, metalness: 0.3 });
    gl.position.set(wx, h * 0.58, d / 2 + 0.05); g.add(gl);
  }
  if (o.chimney) { const c = box(0.6, 1.6, 0.6, 0x8a5a44); c.position.set(w * 0.28, h + rh * 0.7, -d * 0.2); g.add(c); }
  return g;
}
export function block(o = {}) {
  const w = o.w || 12, h = o.h || 15, d = o.d || 8, g = new THREE.Group();
  const b = box(w, h, d, o.color ?? 0xb9b4ac); b.position.y = h / 2; g.add(b);
  const r = mulberry(o.seed || 3);
  const litM = mat(0xffd27a, { emissive: 0xffb050, emissiveIntensity: 1.4 }), dark = mat(0x3d4a5c, { roughness: 0.3 });
  const geo = new THREE.BoxGeometry(1.1, 1.3, 0.1);
  for (let y = 1.5; y < h - 1; y += 2.6) for (let x = -w / 2 + 1.2; x < w / 2 - 0.8; x += 2) {
    const m = new THREE.Mesh(geo, r() < (o.lit ?? 0.3) ? litM : dark); m.position.set(x, y, d / 2 + 0.05); g.add(m);
  }
  if (o.snow) { const s = box(w + 0.2, 0.25, d + 0.2, 0xf4f6fa); s.position.y = h + 0.12; g.add(s); }
  return g;
}
export function tree(o = {}) {
  const g = new THREE.Group(), s = o.s || 1, r = mulberry(o.seed || 5);
  const trunk = cyl(0.12 * s, 0.22 * s, 2.2 * s, o.bark ?? 0x6b4a32); trunk.position.y = 1.1 * s; g.add(trunk);
  if (o.bare) return g;
  const fm = mat(o.leaf ?? 0x4f7d3b, { flatShading: true, roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const b = M(new THREE.IcosahedronGeometry((0.8 + r() * 0.5) * s, 1), fm);
    b.position.set((r() - 0.5) * 1.4 * s, (2.4 + r() * 1.2) * s, (r() - 0.5) * 1.4 * s); g.add(b);
  }
  return g;
}
export function pine(o = {}) {
  const g = new THREE.Group(), s = o.s || 1;
  const t = cyl(0.12 * s, 0.18 * s, 1 * s, 0x5a3e2a); t.position.y = 0.5 * s; g.add(t);
  const fm = mat(o.leaf ?? 0x2f5d3a, { flatShading: true });
  for (let i = 0; i < 3; i++) { const c = M(new THREE.ConeGeometry((1.3 - i * 0.3) * s, 1.6 * s, 9), fm); c.position.y = (1.4 + i * 0.8) * s; g.add(c); }
  if (o.snow) { const c = M(new THREE.ConeGeometry(0.45 * s, 0.7 * s, 9), 0xf4f6fa); c.position.y = 3.3 * s; g.add(c); }
  return g;
}
export function birch(o = {}) {
  const g = new THREE.Group(), s = o.s || 1, r = mulberry(o.seed || 9);
  const t = cyl(0.1 * s, 0.15 * s, 5 * s, 0xefeee8); t.position.y = 2.5 * s; g.add(t);
  for (let i = 0; i < 10; i++) { const m = box(0.16 * s, 0.05 * s, 0.05 * s, 0x222222); m.position.set(0, (0.5 + r() * 4) * s, 0.12 * s); m.rotation.y = r() * 6; g.add(m); }
  if (!o.bare) { const fm = mat(0x7fa650, { flatShading: true }); for (let i = 0; i < 7; i++) { const b = M(new THREE.IcosahedronGeometry((0.6 + r() * 0.4) * s, 1), fm); b.position.set((r() - 0.5) * 1.6 * s, (4 + r() * 1.8) * s, (r() - 0.5) * 1.6 * s); g.add(b); } }
  return g;
}
export function sunflower(h = 1.7) {
  const g = new THREE.Group();
  const st = cyl(0.025, 0.035, h, 0x4f7d3b); st.position.y = h / 2; g.add(st);
  const head = new THREE.Group(); head.position.y = h; head.rotation.x = 0.35; g.add(head);
  const c = cyl(0.13, 0.13, 0.06, 0x4a2e1a); c.rotation.x = Math.PI / 2; head.add(c);
  const pm = mat(0xf2b42b);
  for (let i = 0; i < 14; i++) { const p = M(new THREE.SphereGeometry(0.06, 8, 6), pm); p.scale.set(1, 2.2, 0.4); const a = i / 14 * Math.PI * 2; p.position.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0); p.rotation.z = a - Math.PI / 2; head.add(p); }
  const lf = M(new THREE.SphereGeometry(0.12, 8, 6), 0x4f7d3b); lf.scale.set(1.6, 0.2, 0.8); lf.position.set(0.12, h * 0.55, 0); g.add(lf);
  return g;
}
export function fence(len, o = {}) {
  const g = new THREE.Group(), c = o.color ?? 0x8a6a48;
  for (let x = 0; x <= len; x += o.step || 1.2) { const p = box(0.1, 1.1, 0.1, c); p.position.set(x, 0.55, 0); g.add(p); }
  for (const y of [0.4, 0.85]) { const r = box(len, 0.08, 0.05, c); r.position.set(len / 2, y, 0.06); g.add(r); }
  return g;
}
export function chimney(h = 22) {
  const g = new THREE.Group();
  const tex = canvasTex(128, 512, (c, w, hh) => { c.fillStyle = '#9b4f3a'; c.fillRect(0, 0, w, hh); c.strokeStyle = 'rgba(40,20,10,0.35)'; for (let y = 0; y < hh; y += 12) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); for (let x = (y / 12 % 2) * 12; x < w; x += 24) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 12); c.stroke(); } } });
  const m = M(new THREE.CylinderGeometry(0.7, 1.3, h, 24), STD({ map: tex, roughness: 0.9 }));
  m.position.y = h / 2; g.add(m);
  const lip = cyl(0.85, 0.8, 0.5, 0x6b3526); lip.position.y = h; g.add(lip);
  return g;
}
export function church() {
  const g = new THREE.Group();
  const nave = rbox(8, 7, 14, 0.1, 0xd8c29a); nave.position.y = 3.5; g.add(nave);
  const tower = rbox(4, 17, 4, 0.1, 0xd4bc92); tower.position.set(0, 8.5, 7); g.add(tower);
  for (const s of [-1, 1]) { const a = box(0.9, 2, 0.2, 0x3a2a22); a.position.set(s * 0.9, 14, 9.05); g.add(a); }
  const sp = M(new THREE.ConeGeometry(3, 3, 4), 0x9b5a3c); sp.position.set(0, 18.5, 7); sp.rotation.y = Math.PI / 4; g.add(sp);
  const cr = box(0.15, 1.4, 0.15, 0x333333); cr.position.set(0, 20.6, 7); g.add(cr);
  const cr2 = box(0.8, 0.15, 0.15, 0x333333); cr2.position.set(0, 20.8, 7); g.add(cr2);
  return g;
}
export function windmill(o = {}) {
  const g = new THREE.Group();
  const t = M(new THREE.CylinderGeometry(1.4, 2, 7, 24), 0xf2efe8); t.position.y = 3.5; g.add(t);
  const r = M(new THREE.ConeGeometry(1.7, 1.8, 24), 0x3d3a3a); r.position.y = 7.9; g.add(r);
  const door = box(0.9, 1.6, 0.2, 0x5a3e2a); door.position.set(0, 0.8, 1.95); g.add(door);
  const hub = new THREE.Group(); hub.position.set(0, 7.2, 1.7); g.add(hub);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; hub.add(arm);
    const sp = box(0.12, 5.5, 0.12, 0x4a3a2a); sp.position.y = 2.75; arm.add(sp);
    const sail = box(1, 4, 0.04, 0xe8e0cc); sail.position.set(0.55, 3.1, 0); arm.add(sail);
  }
  g.userData.hub = hub;
  return g;
}
export function flag(kind, o = {}) {
  const g = new THREE.Group();
  const pole = cyl(0.04, 0.05, o.h || 5, 0xcccccc, { metalness: 0.6, roughness: 0.3 }); pole.position.y = (o.h || 5) / 2; g.add(pole);
  const tex = canvasTex(300, 200, (c, w, h) => {
    if (kind === 'UA') { c.fillStyle = '#0057b7'; c.fillRect(0, 0, w, h / 2); c.fillStyle = '#ffd500'; c.fillRect(0, h / 2, w, h / 2); }
    else if (kind === 'ES') { c.fillStyle = '#c60b1e'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffc400'; c.fillRect(0, h / 4, w, h / 2); }
    else { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8112d'; c.fillRect(w / 2 - 18, 0, 36, h); c.fillRect(0, h / 2 - 18, w, 36);
      for (const [x, y] of [[w / 4, h / 4], [3 * w / 4, h / 4], [w / 4, 3 * h / 4], [3 * w / 4, 3 * h / 4]]) { c.fillRect(x - 6, y - 20, 12, 40); c.fillRect(x - 20, y - 6, 40, 12); } }
  });
  const geo = new THREE.PlaneGeometry(1.8, 1.2, 24, 8);
  const cloth = M(geo, STD({ map: tex, side: THREE.DoubleSide, roughness: 0.8 }));
  cloth.position.set(0.92, (o.h || 5) - 0.65, 0); g.add(cloth);
  const base = geo.attributes.position.array.slice();
  g.userData.wave = (t) => {
    const p = geo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const u = (base[i] + 0.9) / 1.8; p[i + 2] = Math.sin(t * 5 - u * 5) * 0.18 * u; p[i + 1] = base[i + 1] - u * u * 0.08; }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
  };
  return g;
}
// autobus: (x) hacia delante. Las ruedas giran con w = v / r
export function bus(o = {}) {
  const g = new THREE.Group(), L = o.L || 11, body = o.color ?? 0xe9b44c;
  const b = rbox(L, 2.6, 2.5, 0.25, body); b.position.y = 1.9; g.add(b);
  const stripe = box(L + 0.02, 0.25, 2.52, o.stripe ?? 0xb5402e); stripe.position.y = 1.2; g.add(stripe);
  const gm = mat(0x1d2a3a, { roughness: 0.15, metalness: 0.4 }), lm = mat(0xffe3a0, { emissive: 0xffc070, emissiveIntensity: 1.3 });
  for (let x = -L / 2 + 1.1; x < L / 2 - 1.8; x += 1.35) { const w = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.95, 2.54), o.lit ? lm : gm); w.position.set(x, 2.45, 0); g.add(w); }
  const ws = box(0.1, 1.4, 2.2, 0x1d2a3a, { roughness: 0.1, metalness: 0.5 }); ws.position.set(L / 2 + 0.01, 2.35, 0); g.add(ws);
  g.userData.wheels = [];
  for (const x of [-L / 2 + 1.8, L / 2 - 2]) for (const z of [-1.2, 1.2]) {
    const w = new THREE.Group(); w.position.set(x, 0.55, z); g.add(w);
    const tire = M(new THREE.CylinderGeometry(0.55, 0.55, 0.35, 24), 0x1b1b1b); tire.rotation.x = Math.PI / 2; w.add(tire);
    const hub = M(new THREE.CylinderGeometry(0.28, 0.28, 0.37, 6), 0xbfbfbf, { metalness: 0.6 }); hub.rotation.x = Math.PI / 2; w.add(hub);
    g.userData.wheels.push(w);
  }
  for (const z of [-0.9, 0.9]) { const hl = sphere(0.15, 0xfff4cc, { emissive: 0xfff0b0, emissiveIntensity: 2 }); hl.position.set(L / 2 + 0.05, 1.1, z); g.add(hl); }
  g.userData.drive = (dist) => { for (const w of g.userData.wheels) w.rotation.z = -dist / 0.55; };
  return g;
}
export function bag(o = {}) {
  const g = new THREE.Group();
  const chain = cyl(0.015, 0.015, o.chain || 1.2, 0x999999, { metalness: 0.8, roughness: 0.3 }); chain.position.y = -(o.chain || 1.2) / 2; g.add(chain);
  const b = M(new THREE.CapsuleGeometry(0.2, 0.9, 8, 20), o.color ?? 0xb5402e, { roughness: 0.5 }); b.position.y = -(o.chain || 1.2) - 0.65; g.add(b);
  for (const y of [-0.3, 0.3]) { const r = cyl(0.205, 0.205, 0.05, 0x222222); r.position.y = b.position.y + y; g.add(r); }
  g.userData.len = (o.chain || 1.2) + 0.65;
  return g;
}
export function tatami(w, d, c1 = 0x2a4d7a, c2 = 0xb5402e) {
  const g = new THREE.Group();
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) { const t = rbox(0.98, 0.04, 0.98, 0.01, (x + z) % 2 ? c1 : c2, { roughness: 0.8 }); t.position.set(x - w / 2 + 0.5, 0.02, z - d / 2 + 0.5); t.castShadow = false; g.add(t); }
  return g;
}
export function room(o = {}) {
  const g = new THREE.Group(), W = o.w || 12, D = o.d || 10, H = o.h || 4.5;
  const back = box(W, H, 0.2, o.wall ?? 0xe8dcc4); back.position.set(0, H / 2, -D / 2); g.add(back);
  const left = box(0.2, H, D, o.wall2 ?? o.wall ?? 0xe0d2b8); left.position.set(-W / 2, H / 2, 0); g.add(left);
  if (o.window) {
    const [wx, wy, ww, wh] = o.window;
    const hole = box(ww, wh, 0.25, o.sky ?? 0xbfe0ff, { emissive: o.sky ?? 0xbfe0ff, emissiveIntensity: o.skyI ?? 0.8 }); hole.position.set(wx, wy, -D / 2 + 0.02); g.add(hole);
    const fr = box(ww + 0.2, 0.12, 0.3, 0x6b5a4a); fr.position.set(wx, wy, -D / 2 + 0.05); g.add(fr);
    const fr2 = box(0.12, wh + 0.2, 0.3, 0x6b5a4a); fr2.position.set(wx, wy, -D / 2 + 0.05); g.add(fr2);
  }
  return g;
}
export function bed() {
  const g = new THREE.Group();
  const f = rbox(1.1, 0.4, 2.1, 0.05, 0x6b4a32); f.position.y = 0.25; g.add(f);
  const m = rbox(1.0, 0.22, 2.0, 0.08, 0xf2f2f2); m.position.y = 0.55; g.add(m);
  const b = rbox(1.04, 0.1, 1.4, 0.05, 0x2a4d7a); b.position.set(0, 0.68, 0.3); g.add(b);
  const p = rbox(0.7, 0.14, 0.4, 0.06, 0xffffff); p.position.set(0, 0.72, -0.75); g.add(p);
  const h = rbox(1.1, 0.9, 0.08, 0.03, 0x6b4a32); h.position.set(0, 0.7, -1.05); g.add(h);
  return g;
}
export function screen(w, h, draw, o = {}) {
  const tex = canvasTex(Math.round(w * 400), Math.round(h * 400), draw);
  const g = new THREE.Group();
  const f = rbox(w + 0.08, h + 0.08, 0.06, 0.02, o.frame ?? 0x1b1b1b); g.add(f);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); s.material.userData.outlineParameters = { visible: false }; s.position.z = 0.032; g.add(s);
  g.userData.tex = tex;
  return g;
}
export function desk(w = 2.2) {
  const g = new THREE.Group();
  const top = rbox(w, 0.05, 0.8, 0.01, 0x7a5a3c); top.position.y = 0.75; g.add(top);
  for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) for (const z of [-0.35, 0.35]) { const l = box(0.05, 0.75, 0.05, 0x333333); l.position.set(x, 0.375, z); g.add(l); }
  return g;
}
export function chair() {
  const g = new THREE.Group();
  const s = rbox(0.48, 0.06, 0.48, 0.02, 0x333333); s.position.y = 0.46; g.add(s);
  const b = rbox(0.48, 0.5, 0.05, 0.02, 0x333333); b.position.set(0, 0.74, -0.22); g.add(b);
  const p = cyl(0.03, 0.03, 0.43, 0x777777); p.position.y = 0.22; g.add(p);
  return g;
}
export function cup() { const g = new THREE.Group(); const c = cyl(0.045, 0.04, 0.11, 0xf4f4f4); c.position.y = 0.055; g.add(c); const cf = cyl(0.04, 0.04, 0.005, 0x3a2012); cf.position.y = 0.1; g.add(cf); return g; }
export function stanchion() { const g = new THREE.Group(); const p = cyl(0.03, 0.03, 1, 0xd4a93a, { metalness: 0.8, roughness: 0.25 }); p.position.y = 0.5; g.add(p); const b = cyl(0.16, 0.18, 0.05, 0xd4a93a, { metalness: 0.8, roughness: 0.25 }); g.add(b); const t = sphere(0.05, 0xd4a93a, { metalness: 0.8, roughness: 0.25 }); t.position.y = 1.02; g.add(t); return g; }
export function ring(size = 6) {
  const g = new THREE.Group();
  const plat = box(size + 0.6, 1, size + 0.6, 0x1d2a3a); plat.position.y = 0.5; g.add(plat);
  const can = box(size, 0.04, size, 0x2a6d8f, { roughness: 0.9 }); can.position.y = 1.02; g.add(can);
  const ropeC = [0xb5402e, 0xf2f2f2, 0x2a4d7a];
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = cyl(0.08, 0.08, 1.6, 0xdddddd, { metalness: 0.5 }); p.position.set(x * size / 2, 1.8, z * size / 2); g.add(p); }
  for (let k = 0; k < 3; k++) {
    const y = 1.45 + k * 0.4;
    for (const [x, z, rot] of [[0, -size / 2, 0], [0, size / 2, 0], [-size / 2, 0, Math.PI / 2], [size / 2, 0, Math.PI / 2]]) {
      const r = cyl(0.03, 0.03, size, ropeC[k]); r.rotation.z = Math.PI / 2; r.rotation.y = rot; r.position.set(x, y, z); g.add(r);
    }
  }
  return g;
}
export function cage(r = 5, h = 2) {
  const g = new THREE.Group();
  const tex = canvasTex(256, 256, (c, w, hh) => { c.clearRect(0, 0, w, hh); c.strokeStyle = '#222'; c.lineWidth = 5; for (let k = -w; k < 2 * w; k += 32) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + w, hh); c.stroke(); c.beginPath(); c.moveTo(k, hh); c.lineTo(k + w, 0); c.stroke(); } });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(8, 3);
  const f = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8, 1, true), STD({ map: tex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.3 }));
  f.position.y = 1 + h / 2; g.add(f);
  const floor = cyl(r, r, 1, 0x1d2a3a, {}, 8); floor.position.y = 0.5; g.add(floor);
  const mt = cyl(r - 0.05, r - 0.05, 0.04, 0xe8e2d4, {}, 8); mt.position.y = 1.02; g.add(mt);
  return g;
}
// cuadrupedo (galgo / perro). Marcha con patas en diagonal.
export function dog(o = {}) {
  const g = new THREE.Group(), galgo = o.galgo, c = mat(o.color ?? 0xb08a60), s = o.s || 1;
  const bl = galgo ? 0.75 : 0.55, bh = galgo ? 0.72 : 0.45;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(galgo ? 0.14 : 0.17, bl, 6, 14), c); body.rotation.z = Math.PI / 2; body.position.y = bh; body.castShadow = true;
  if (galgo) { body.scale.set(1.15, 1, 0.85); }
  g.add(body);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(galgo ? 0.2 : 0.2, 16, 12), c); chest.position.set(bl * 0.4, bh + 0.02, 0); chest.scale.set(1, 1.2, 0.8); chest.castShadow = true; g.add(chest);
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, galgo ? 0.3 : 0.15, 6, 10), c); neck.position.set(bl * 0.55, bh + (galgo ? 0.25 : 0.18), 0); neck.rotation.z = -0.6; neck.castShadow = true; g.add(neck);
  const head = new THREE.Group(); head.position.set(bl * 0.68, bh + (galgo ? 0.42 : 0.3), 0); g.add(head);
  const sk = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), c); sk.scale.set(1.1, 0.9, 0.85); head.add(sk);
  const mz = new THREE.Mesh(new THREE.CapsuleGeometry(galgo ? 0.045 : 0.06, galgo ? 0.2 : 0.1, 6, 10), c); mz.rotation.z = Math.PI / 2; mz.position.set(galgo ? 0.17 : 0.12, -0.03, 0); head.add(mz);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), mat(0x1b1b1b)); nose.position.set(galgo ? 0.3 : 0.2, -0.03, 0); head.add(nose);
  for (const z of [-0.05, 0.05]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), mat(0x111111)); e.position.set(0.07, 0.03, z); head.add(e); const ear = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), c); ear.scale.set(0.5, 1.2, 0.3); ear.position.set(-0.04, 0.07, z * 1.3); ear.rotation.z = 0.6; head.add(ear); }
  const legs = [];
  for (const [x, z, ph] of [[bl * 0.45, 0.08, 0], [bl * 0.45, -0.08, Math.PI], [-bl * 0.45, 0.08, Math.PI], [-bl * 0.45, -0.08, 0]]) {
    const hip = new THREE.Group(); hip.position.set(x, bh, z); g.add(hip);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, bh * 0.45, 4, 8), c); up.position.y = -bh * 0.25; up.castShadow = true; hip.add(up);
    const kn = new THREE.Group(); kn.position.y = -bh * 0.5; hip.add(kn);
    const lo = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, bh * 0.4, 4, 8), c); lo.position.y = -bh * 0.23; lo.castShadow = true; kn.add(lo);
    legs.push({ hip, kn, ph });
  }
  const tail = new THREE.Group(); tail.position.set(-bl * 0.6, bh + 0.05, 0); g.add(tail);
  const tm = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, galgo ? 0.45 : 0.25, 4, 8), c); tm.position.y = galgo ? 0.2 : 0.14; tail.add(tm); tail.rotation.z = galgo ? 2.2 : 0.8;
  g.scale.setScalar(s);
  g.userData.anim = (t, speed) => {
    const f = speed > 0.01 ? (galgo ? 3.2 : 3.6) : 0;
    for (const l of legs) { const a = Math.sin(t * f * Math.PI * 2 + l.ph); l.hip.rotation.z = a * (speed > 2 ? 0.7 : 0.35); l.kn.rotation.z = -Math.max(0, -a) * 0.8; }
    tail.rotation.x = Math.sin(t * 12) * 0.5;
    body.position.y = bh + Math.abs(Math.sin(t * f * Math.PI * 2)) * (speed > 2 ? 0.05 : 0.015);
  };
  return g;
}
export function kennel() {
  const g = new THREE.Group();
  const b = rbox(1.4, 1, 1.2, 0.04, 0xa87a50); b.position.y = 0.5; g.add(b);
  const sh = new THREE.Shape(); sh.moveTo(-0.85, 0); sh.lineTo(0, 0.6); sh.lineTo(0.85, 0); sh.lineTo(-0.85, 0);
  const r = M(new THREE.ExtrudeGeometry(sh, { depth: 1.4, bevelEnabled: false }), 0xb5402e); r.position.set(0, 1, -0.7); g.add(r);
  const d = box(0.6, 0.65, 0.05, 0x2a1a10); d.position.set(0, 0.33, 0.61); g.add(d);
  return g;
}
export function particles(n, color, size, seed = 1, opacity = 0.9) {
  const r = mulberry(seed), pos = new Float32Array(n * 3), base = [];
  for (let i = 0; i < n; i++) base.push([r(), r(), r(), r()]);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false })); pts.material.userData.outlineParameters = { visible: false };
  pts.userData.base = base;
  return pts;
}
// columna cervical: atlas (C1) + axis (C2) + resto, estilo radiografia
export function spine() {
  const g = new THREE.Group();
  const xm = STD({ color: 0xcfe8ff, emissive: 0x6fb0ff, emissiveIntensity: 0.9, transparent: true, opacity: 0.85, roughness: 0.4 });
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.9, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.62), STD({ color: 0x9ccfff, emissive: 0x3f7fd0, emissiveIntensity: 0.6, transparent: true, opacity: 0.35 }));
  skull.position.y = 1.7; g.add(skull);
  // atlas: anillo con masas laterales
  const atlas = new THREE.Group(); atlas.position.y = 0.95; g.add(atlas);
  const ringG = new THREE.TorusGeometry(0.34, 0.07, 12, 40); const rr = new THREE.Mesh(ringG, xm); rr.rotation.x = Math.PI / 2; rr.scale.set(1.2, 1, 1); atlas.add(rr);
  for (const s of [-1, 1]) { const lm = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), xm); lm.scale.set(1, 0.8, 1.3); lm.position.x = s * 0.36; atlas.add(lm);
    const tp = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.2, 6, 10), xm); tp.rotation.z = Math.PI / 2; tp.position.x = s * 0.6; atlas.add(tp); }
  const crack = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.075, 8, 12, 0.35), new THREE.MeshBasicMaterial({ color: 0xff3b2f }));
  crack.rotation.x = Math.PI / 2; crack.rotation.z = -0.1; crack.scale.set(1.2, 1, 1); atlas.add(crack);
  g.userData.crack = crack;
  for (let i = 0; i < 6; i++) {
    const v = new THREE.Group(); v.position.y = 0.7 - i * 0.34; g.add(v);
    const bdy = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.2, 20), xm); bdy.position.z = 0.15; v.add(bdy);
    const sp = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 6, 10), xm); sp.rotation.x = Math.PI / 2 + 0.4; sp.position.z = -0.3; v.add(sp);
    for (const s of [-1, 1]) { const tp = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.2, 6, 10), xm); tp.rotation.z = Math.PI / 2; tp.position.set(s * 0.3, 0, -0.05); v.add(tp); }
  }
  g.userData.atlas = atlas;
  return g;
}
