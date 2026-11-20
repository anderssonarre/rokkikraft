// Grafiknivåer och rendering-hjälp för 3D-vyn: Low / Medium / High / Ultra (+ Auto), procedurella PBR-texturer
// (färg, normal- och råhetskartor), HDR-miljöljus från himlen, gräs, däckspår. Allt genereras i webbläsaren – inga externa filer.
import { mulberry } from './gl.js';
const T = () => window.THREE;

// pr = max pixeltäthet, smap = skuggkartans storlek (0 = inga skuggor), cell = terrängrutnät (m), trees = antal träd,
// grass = gräs-tuvor, parts = max partiklar, marks = däckspårsbitar, std = PBR på terrängen, aniso = texturfiltrering
export const PRESETS = [
  { name: 'Low', pr: 1.0, smap: 0, cell: 9, trees: 520, grass: 0, parts: 160, marks: 300, std: 0, aniso: 2, env: 0, shadowR: 60, lodNear: 0 },
  { name: 'Medium', pr: 1.25, smap: 1024, cell: 7, trees: 1100, grass: 2600, parts: 300, marks: 900, std: 0, aniso: 4, env: 1, shadowR: 65, lodNear: 180 },
  { name: 'High', pr: 1.75, smap: 2048, cell: 6, trees: 1800, grass: 7000, parts: 520, marks: 1600, std: 1, aniso: 8, env: 1, shadowR: 75, lodNear: 260 },
  { name: 'Ultra', pr: 2.0, smap: 4096, cell: 4.5, trees: 2800, grass: 14000, parts: 800, marks: 2600, std: 1, aniso: 16, env: 1, shadowR: 90, lodNear: 380 },
];
// Inställningens värde → nivå 0–3. 'auto' väljer efter enheten och kommer ihåg vad som funkade senast.
export function qualityLevel(setting) {
  const s = setting === 'lag' ? 'low' : setting === 'hog' ? 'high' : (setting || 'auto');
  const fixed = { low: 0, medium: 1, high: 2, ultra: 3 }[s]; if (fixed !== undefined) return { level: fixed, auto: false };
  let lv; try { lv = +localStorage.getItem('rk_autoQ'); } catch (e) { }
  if (!(lv >= 0 && lv <= 3)) { const mob = /Mobi|Android|iPhone|iPad/.test(navigator.userAgent), cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
    lv = mob ? 0 : cores >= 8 && mem >= 8 ? 2 : cores >= 4 ? 1 : 0; }
  return { level: lv, auto: true };
}
export function rememberAuto(level) { try { localStorage.setItem('rk_autoQ', String(level)); } catch (e) { } }

// ---------- procedurella texturer ----------
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function toTex(c, rep, aniso, srgb) { const THREE = T(), t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep, rep); t.anisotropy = aniso || 4; return t; }
// höjdkarta (Float32) → normalkarta
function normalFrom(hgt, w, h, k) { const c = cv(w, h), g = c.getContext('2d'), im = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, l = hgt[y * w + (x + w - 1) % w], r = hgt[y * w + (x + 1) % w], u = hgt[((y + h - 1) % h) * w + x], d = hgt[((y + 1) % h) * w + x];
    let nx = (l - r) * k, ny = (d - u) * k, nz = 1; const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
    im.data[i * 4] = (nx * 0.5 + 0.5) * 255; im.data[i * 4 + 1] = (ny * 0.5 + 0.5) * 255; im.data[i * 4 + 2] = (nz * 0.5 + 0.5) * 255; im.data[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0); return c; }
// Grus/asfalt: stenar i olika storlek och nyans, tvärgående hjulspår-strimmor. Ger färg (multipliceras med vägens hörnfärg), normal och råhet.
const _texCache = {};
export function roadTextures(kind, aniso) {
  const key = kind + aniso; if (_texCache[key]) return _texCache[key];
  const N = 512, r = mulberry(kind === 'asfalt' ? 91 : kind === 'is' ? 57 : 23), hgt = new Float32Array(N * N), col = cv(N, N), g = col.getContext('2d'), rough = cv(N, N), gr = rough.getContext('2d');
  const base = kind === 'asfalt' ? 0.82 : kind === 'is' ? 0.95 : 0.8; g.fillStyle = `rgb(${base * 255 | 0},${base * 255 | 0},${base * 255 | 0})`; g.fillRect(0, 0, N, N);
  gr.fillStyle = kind === 'is' ? '#2a2a2a' : kind === 'asfalt' ? '#d0d0d0' : '#ececec'; gr.fillRect(0, 0, N, N);
  const stones = kind === 'asfalt' ? 9000 : kind === 'is' ? 600 : 9000;
  for (let s = 0; s < stones; s++) { const x = r() * N, y = r() * N, rad = kind === 'asfalt' ? 0.6 + r() * 1.6 : 0.7 + Math.pow(r(), 2.6) * 3.6, v = kind === 'asfalt' ? 0.6 + r() * 0.5 : 0.72 + r() * 0.42;
    const tint = kind === 'grus' ? [v * 1.04, v * 0.98, v * 0.9] : [v, v, v * 1.02];
    g.fillStyle = `rgb(${Math.min(255, tint[0] * 255) | 0},${Math.min(255, tint[1] * 255) | 0},${Math.min(255, tint[2] * 255) | 0})`; g.beginPath(); g.ellipse(x, y, rad, rad * (0.6 + r() * 0.4), r() * 3, 0, 6.29); g.fill();
    if (kind !== 'is') { gr.fillStyle = `rgba(${r() < 0.5 ? '170,170,170' : '235,235,235'},0.8)`; gr.beginPath(); gr.arc(x, y, rad, 0, 6.29); gr.fill(); }
    const R2 = Math.ceil(rad) + 1; for (let dy = -R2; dy <= R2; dy++) for (let dx = -R2; dx <= R2; dx++) { const d = Math.hypot(dx, dy) / rad; if (d < 1) { const xi = ((((x + dx) | 0) % N) + N) % N, yi = ((((y + dy) | 0) % N) + N) % N, i = yi * N + xi; hgt[i] = Math.max(hgt[i], Math.sqrt(1 - d * d) * rad * 0.35); } } }
  // hjulspår: längsgående mörkare/blankare stråk (v-led = längs vägen)
  if (kind !== 'is') for (const u of [0.28, 0.38, 0.62, 0.72]) { const grd = g.createLinearGradient((u - 0.05) * N, 0, (u + 0.05) * N, 0); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.5, kind === 'asfalt' ? 'rgba(0,0,0,0.10)' : 'rgba(60,45,30,0.12)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(0, 0, N, N); }
  if (kind === 'is') { g.globalAlpha = 0.25; for (let k = 0; k < 160; k++) { g.strokeStyle = r() < 0.5 ? '#ffffff' : '#9fb4c8'; g.lineWidth = 0.5 + r() * 1.5; g.beginPath(); const x = r() * N; g.moveTo(x, r() * N); g.lineTo(x + (r() - 0.5) * 60, r() * N); g.stroke(); } g.globalAlpha = 1; }
  const out = { map: toTex(col, 0, aniso), normal: toTex(normalFrom(hgt, N, N, kind === 'asfalt' ? 2.2 : 1.6), 0, aniso), rough: toTex(rough, 0, aniso) };
  return (_texCache[key] = out);
}
// Terräng: gräs-/mossdetalj (multipliceras med hörnfärgen) + normalkarta
export function terrainTextures(winter, aniso) {
  const key = 'ter' + winter + aniso; if (_texCache[key]) return _texCache[key];
  const N = 512, r = mulberry(winter ? 5 : 3), hgt = new Float32Array(N * N), col = cv(N, N), g = col.getContext('2d'), im = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) { const v = 0.72 + r() * 0.28; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v * 255; im.data[i * 4 + 3] = 255; hgt[i] = r() * 0.4; }
  g.putImageData(im, 0, 0);
  for (let k = 0; k < (winter ? 2500 : 16000); k++) { const x = r() * N, y = r() * N, len = 2 + r() * 7, a = -Math.PI / 2 + (r() - 0.5) * 1.2, v = winter ? 0.85 + r() * 0.15 : 0.62 + r() * 0.5;
    g.strokeStyle = `rgba(${v * 255 | 0},${v * 255 | 0},${v * 255 | 0},0.7)`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
    for (let t = 0; t < len; t += 1) { const xi = ((((x + Math.cos(a) * t) | 0) % N) + N) % N, yi = ((((y + Math.sin(a) * t) | 0) % N) + N) % N; hgt[yi * N + xi] += 0.6; } }
  for (let k = 0; k < 90; k++) { g.fillStyle = `rgba(${winter ? '255,255,255' : '70,60,40'},${0.06 + r() * 0.1})`; g.beginPath(); g.arc(r() * N, r() * N, 8 + r() * 40, 0, 6.29); g.fill(); }
  const out = { map: toTex(col, 0, aniso), normal: toTex(normalFrom(hgt, N, N, 1.2), 0, aniso) };
  return (_texCache[key] = out);
}

// HDR-liknande miljöljus: himlen (med sol) renderas till en PMREM-karta som ger reflexer och diffust ljus på PBR-material
export function makeEnvironment(R, zenith, horizon, sunDir, ground) {
  const THREE = T(); try {
    // ekvirektangulär himmelsbild (LDR-canvas) med sol, horisont och mark → PMREM
    const W = 512, H = 256, c = cv(W, H), g = c.getContext('2d'), im = g.createImageData(W, H), sd = sunDir.clone().normalize();
    for (let y = 0; y < H; y++) { const lat = (0.5 - y / H) * Math.PI, sy = Math.sin(lat), cy = Math.cos(lat);
      for (let x = 0; x < W; x++) { const lon = (x / W) * Math.PI * 2 - Math.PI, dx = cy * Math.cos(lon), dz = cy * Math.sin(lon), dy = sy, i = (y * W + x) * 4;
        let r, gg, b; if (dy > 0) { const t = Math.pow(dy, 0.5); r = horizon.r + (zenith.r - horizon.r) * t; gg = horizon.g + (zenith.g - horizon.g) * t; b = horizon.b + (zenith.b - horizon.b) * t; }
        else { const t = Math.pow(-dy, 0.4); r = horizon.r * 0.8 + (ground.r - horizon.r * 0.8) * t; gg = horizon.g * 0.8 + (ground.g - horizon.g * 0.8) * t; b = horizon.b * 0.8 + (ground.b - horizon.b * 0.8) * t; }
        const s = Math.max(0, dx * sd.x + dy * sd.y + dz * sd.z), glow = Math.pow(s, 600) * 4 + Math.pow(s, 20) * 0.35;
        im.data[i] = Math.min(255, (r + glow) * 255); im.data[i + 1] = Math.min(255, (gg + glow * 0.93) * 255); im.data[i + 2] = Math.min(255, (b + glow * 0.8) * 255); im.data[i + 3] = 255; } }
    g.putImageData(im, 0, 0); const tex = new THREE.CanvasTexture(c); tex.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(R), rt = pm.fromEquirectangular(tex); pm.dispose(); tex.dispose(); return rt.texture;
  } catch (e) { return null; }
}

// Gräs-tuvor: korsade plan med alfa-textur, i rutor (chunkar) så att kameran bara ritar det som syns
let _grassMat = null;
export function grassMaterial(winter) { const THREE = T(); if (_grassMat && _grassMat.userData.w === winter) return _grassMat;
  // färg (heltäckande, så att genomskinliga kanter aldrig blir svarta vid mipmapping) + separat alfakarta med stråna
  const c = cv(128, 128), g = c.getContext('2d'), a = cv(128, 128), ga = a.getContext('2d'), r = mulberry(8);
  const grd = g.createLinearGradient(0, 0, 0, 128); grd.addColorStop(0, winter ? '#f2f5fa' : '#a8b860'); grd.addColorStop(0.55, winter ? '#e2e8ef' : '#7f9a45'); grd.addColorStop(1, winter ? '#cfd8e2' : '#4f6a2c'); g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  ga.fillStyle = '#000'; ga.fillRect(0, 0, 128, 128);
  for (let k = 0; k < 46; k++) { const x = 10 + r() * 108, h = 50 + r() * 74, bend = (r() - 0.5) * 30, lw = 1.5 + r() * 2.5;
    g.strokeStyle = winter ? `rgba(255,255,255,${0.2 + r() * 0.3})` : `rgba(${(110 + r() * 80) | 0},${(140 + r() * 60) | 0},${(40 + r() * 30) | 0},0.6)`; g.lineWidth = lw; g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + bend * 0.3, 128 - h * 0.6, x + bend, 128 - h); g.stroke();
    ga.strokeStyle = '#fff'; ga.lineWidth = lw; ga.beginPath(); ga.moveTo(x, 128); ga.quadraticCurveTo(x + bend * 0.3, 128 - h * 0.6, x + bend, 128 - h); ga.stroke(); }
  const t = new THREE.CanvasTexture(c), ta = new THREE.CanvasTexture(a); t.anisotropy = ta.anisotropy = 4;
  _grassMat = new THREE.MeshLambertMaterial({ map: t, alphaMap: ta, alphaTest: 0.4, side: THREE.DoubleSide }); _grassMat.userData.w = winter; return _grassMat; }
export function grassGeometry() { const THREE = T(), a = new THREE.PlaneGeometry(1, 0.7).translate(0, 0.35, 0), b = a.clone().rotateY(Math.PI / 2), c = a.clone().rotateY(Math.PI / 4);
  const g = new THREE.BufferGeometry(), parts = [a, b, c], cnt = parts.reduce((s, p) => s + p.attributes.position.count, 0), pos = new Float32Array(cnt * 3), nor = new Float32Array(cnt * 3), uv = new Float32Array(cnt * 2), idx = []; let o = 0;
  for (const p of parts) { pos.set(p.attributes.position.array, o * 3); uv.set(p.attributes.uv.array, o * 2); for (let i = 0; i < p.attributes.position.count; i++) nor.set([0, 1, 0], (o + i) * 3); for (const i of p.index.array) idx.push(i + o); o += p.attributes.position.count; }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); return g; }

// Mjuk rökpartikel-textur för damm (brusig kant så att det ser ut som moln, inte prickar)
export function dustTexture() { const THREE = T(), c = cv(64, 64), g = c.getContext('2d'), r = mulberry(31);
  for (let k = 0; k < 26; k++) { const x = 18 + r() * 28, y = 18 + r() * 28, rad = 8 + r() * 16, grd = g.createRadialGradient(x, y, 0, x, y, rad); grd.addColorStop(0, 'rgba(255,255,255,0.22)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(0, 0, 64, 64); }
  return new THREE.CanvasTexture(c); }

// Däckspår: ringbuffer av platta, genomskinliga remsor som läggs bakom hjulen (äldsta skrivs över)
export class TrackMarks {
  constructor(scene, max, winter) { const THREE = T(); this.max = max; this.n = 0; this.k = 0; if (!max) return;
    const c = cv(8, 32), gx = c.getContext('2d'), gr = gx.createLinearGradient(0, 0, 0, 32); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gx.fillStyle = gr; gx.fillRect(0, 0, 8, 32);
    const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), m = new THREE.MeshBasicMaterial({ color: 0xffffff, map: new THREE.CanvasTexture(c), transparent: true, opacity: winter ? 0.45 : 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }); // mjuka kanter
    this.mesh = new THREE.InstancedMesh(g, m, max); this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = 2;
    this.d = new THREE.Object3D(); this.c = new THREE.Color(); scene.add(this.mesh);
    for (let i = 0; i < max; i++) this.mesh.setColorAt(i, this.c.setRGB(1, 1, 1)); }
  // (x0,z0)→(x1,z1) längs marken på höjd y, bredd w, färg rgb (mörk på grus, ljus/blank på is)
  add(x0, z0, x1, z1, y, w, rgb) { if (!this.max) return; const L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.05 || L > 3) return; const d = this.d, i = this.k;
    d.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); d.rotation.set(0, -Math.atan2(z1 - z0, x1 - x0), 0); d.scale.set(L + 0.04, 1, w); d.updateMatrix();
    this.mesh.setMatrixAt(i, d.matrix); this.mesh.setColorAt(i, this.c.setRGB(rgb[0], rgb[1], rgb[2])); this.k = (i + 1) % this.max; this.n = Math.min(this.max, this.n + 1); this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true; }
}
