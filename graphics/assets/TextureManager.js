// Procedurella PBR-texturer (färg, normal, råhet) – genereras i webbläsaren och cachas per sort och filtreringsnivå.
import { mulberry } from '../../js/gl.js';
import { markShared } from '../core/ResourceManager.js';
const T = () => window.THREE;
export const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
// ---------- procedurella texturer ----------
function toTex(c, rep, aniso, srgb) { const THREE = T(), t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep, rep); t.anisotropy = aniso || 4; markShared(t); return t; }
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

// Mjuk rökpartikel-textur för damm (brusig kant så att det ser ut som moln, inte prickar)
export function dustTexture() { const THREE = T(), c = cv(64, 64), g = c.getContext('2d'), r = mulberry(31);
  for (let k = 0; k < 26; k++) { const x = 18 + r() * 28, y = 18 + r() * 28, rad = 8 + r() * 16, grd = g.createRadialGradient(x, y, 0, x, y, rad); grd.addColorStop(0, 'rgba(255,255,255,0.22)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(0, 0, 64, 64); }
  return new THREE.CanvasTexture(c); }

