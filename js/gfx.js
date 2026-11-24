// Grafiknivåer och rendering-hjälp för 3D-vyn: Low / Medium / High / Ultra (+ Auto), procedurella PBR-texturer
// (färg, normal- och råhetskartor), atmosfärisk himmelshader, HDR-miljöljus, gräs, damm och däckspår. Allt genereras i webbläsaren – inga externa filer.
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

// ---------- snabba sömlösa brushjälpare (periodiskt 2D-brus + FBM, inga skarvar) ----------
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smoothstep = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

function makePerm(seed) {
  const r = mulberry(seed), p = new Uint8Array(512), v = new Float32Array(512);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0, tmp = p[i]; p[i] = p[j]; p[j] = tmp; }
  for (let i = 0; i < 256; i++) { p[i + 256] = p[i]; v[i] = v[i + 256] = p[i] / 255; }
  return { p, v };
}
// Periodiskt 2D-värdebrus (period måste vara en tvåpotens, x/y >= 0) i [0, 1]
function pNoise(t, x, y, period) {
  const m = period - 1, p = t.p, val = t.v;
  const xi = x | 0, yi = y | 0;
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const x0 = xi & m, x1 = (xi + 1) & m, y0 = yi & m, y1 = (yi + 1) & m;
  const px0 = p[x0 & 255], px1 = p[x1 & 255];
  const aa = val[(px0 + y0) & 255], ba = val[(px1 + y0) & 255];
  const ab = val[(px0 + y1) & 255], bb = val[(px1 + y1) & 255];
  const nx0 = aa + (ba - aa) * u, nx1 = ab + (bb - ab) * u;
  return nx0 + (nx1 - nx0) * v;
}
// Periodisk FBM i [0, 1] över enhetskoordinater (u, v) ∈ [0, 1)
function pFbm(t, u, v, basePeriod, octaves, persistence = 0.5) {
  let sum = 0, amp = 1, norm = 0, per = basePeriod;
  const uu = u - Math.floor(u), vv = v - Math.floor(v);
  for (let o = 0; o < octaves; o++) {
    sum += pNoise(t, uu * per, vv * per, per) * amp;
    norm += amp; amp *= persistence; per <<= 1;
  }
  return sum / norm;
}
// Förberäknat sömlöst FBM-fält i lägre upplösning (S×S) som bilinjärt samplas i N×N-loopen – 10× snabbare utan kvalitetsförlust
function makeField(t, S, basePeriod, octaves, persistence = 0.5, su = 1, sv = 1, ou = 0, ov = 0) {
  const f = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    const v = (y / S) * sv + ov, row = y * S;
    for (let x = 0; x < S; x++) f[row + x] = pFbm(t, (x / S) * su + ou, v, basePeriod, octaves, persistence);
  }
  return f;
}
function sampleField(f, S, u, v) {
  const m = S - 1;
  const fx = (u - Math.floor(u)) * S, fy = (v - Math.floor(v)) * S;
  const xi = fx | 0, yi = fy | 0, tx = fx - xi, ty = fy - yi;
  const x0 = xi & m, x1 = (xi + 1) & m, y0 = (yi & m) * S, y1 = ((yi + 1) & m) * S;
  const a = f[y0 + x0] + (f[y0 + x1] - f[y0 + x0]) * tx;
  const b = f[y1 + x0] + (f[y1 + x1] - f[y1 + x0]) * tx;
  return a + (b - a) * ty;
}

function toTex(c, rep, aniso, srgb) {
  const THREE = T(), t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (rep) t.repeat.set(rep, rep);
  t.anisotropy = aniso || 4;
  return t;
}

// Höjdkarta (Float32) → skarp 3×3 Sobel-normalkarta med sömlös inlindning
function normalFrom(hgt, w, h, k) {
  const c = cv(w, h), g = c.getContext('2d'), im = g.createImageData(w, h), d = im.data;
  const wm = w - 1, hm = h - 1, pow2 = (w & wm) === 0 && (h & hm) === 0;
  for (let y = 0; y < h; y++) {
    const yu = pow2 ? ((y - 1) & hm) * w : ((y + h - 1) % h) * w;
    const yc = y * w;
    const yd = pow2 ? ((y + 1) & hm) * w : ((y + 1) % h) * w;
    for (let x = 0; x < w; x++) {
      const xl = pow2 ? ((x - 1) & wm) : ((x + w - 1) % w);
      const xr = pow2 ? ((x + 1) & wm) : ((x + 1) % w);
      const tl = hgt[yu + xl], tc = hgt[yu + x], tr = hgt[yu + xr];
      const ml = hgt[yc + xl], mr = hgt[yc + xr];
      const bl = hgt[yd + xl], bc = hgt[yd + x], br = hgt[yd + xr];
      let nx = ((tl + 2 * ml + bl) - (tr + 2 * mr + br)) * 0.25 * k;
      let ny = ((bl + 2 * bc + br) - (tl + 2 * tc + tr)) * 0.25 * k;
      let nz = 1.0;
      const invL = 1 / Math.hypot(nx, ny, nz);
      const i = (yc + x) * 4;
      d[i] = ((nx * invL * 0.5 + 0.5) * 255) | 0;
      d[i + 1] = ((ny * invL * 0.5 + 0.5) * 255) | 0;
      d[i + 2] = ((nz * invL * 0.5 + 0.5) * 255) | 0;
      d[i + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  return c;
}

// Stämpla en skarp, fasetterad sten/gruskorn direkt i färg-, höjd- och råhetsbuffertar (sömlöst lindad)
function stampStone(colD, roughD, hgt, N, mask, cx, cy, rx, ry, ang, cR, cG, cB, rVal, hPeak, aoAmt, sharp) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const rad = Math.ceil(Math.max(rx, ry)) + 2;
  const x0 = Math.floor(cx), y0 = Math.floor(cy);
  const invRx = 1 / Math.max(0.5, rx), invRy = 1 / Math.max(0.5, ry);
  for (let dy = -rad; dy <= rad; dy++) {
    const py = (y0 + dy) & mask, row = py * N;
    const fy = (y0 + dy) - cy;
    for (let dx = -rad; dx <= rad; dx++) {
      const fx = (x0 + dx) - cx;
      const lx = (fx * ca + fy * sa) * invRx;
      const ly = (-fx * sa + fy * ca) * invRy;
      const d2 = lx * lx + ly * ly;
      if (d2 >= 1.45) continue;
      const px = (x0 + dx) & mask, idx = row + px, i4 = idx * 4;
      if (d2 < 1.0) {
        const d = Math.sqrt(d2);
        // Fasetterad kantprofil för skarpare normaler på grus/sten
        const dome = Math.pow(Math.max(0, 1 - Math.pow(d, sharp)), 0.58);
        const facet = 1 + (lx * 0.16 - ly * 0.12);
        const h = dome * hPeak * (0.88 + 0.12 * facet);
        if (h > hgt[idx] - 0.18) {
          const blend = d < 0.72 ? 1.0 : (1 - d) / 0.28;
          const shade = 0.88 + 0.16 * dome * facet;
          colD[i4] = Math.min(255, colD[i4] + (cR * shade - colD[i4]) * blend) | 0;
          colD[i4 + 1] = Math.min(255, colD[i4 + 1] + (cG * shade - colD[i4 + 1]) * blend) | 0;
          colD[i4 + 2] = Math.min(255, colD[i4 + 2] + (cB * shade - colD[i4 + 2]) * blend) | 0;
          const rv = (rVal * 255) | 0;
          const nr = (roughD[i4] + (rv - roughD[i4]) * blend) | 0;
          roughD[i4] = roughD[i4 + 1] = roughD[i4 + 2] = nr;
        }
        if (h > hgt[idx]) hgt[idx] = h;
      } else if (aoAmt > 0) {
        // Subtil kontakt-AO runt stenbasen så kornen "sitter" i gruset
        const t = (1.45 - d2) / 0.45;
        const f = 1 - aoAmt * t;
        colD[i4] = (colD[i4] * f) | 0;
        colD[i4 + 1] = (colD[i4 + 1] * f) | 0;
        colD[i4 + 2] = (colD[i4 + 2] * f) | 0;
      }
    }
  }
}

// ---------- procedurella vägtexturer ----------
// Grus / asfalt / is: högdetaljerade sömlösa PBR-kartor (färg multipliceras med vägens hörnfärg, normal, råhet).
const _texCache = {};
export function roadTextures(kind, aniso) {
  const aKey = aniso || 4;
  const N = aKey >= 8 ? 1024 : 512;
  const key = kind + '_' + N + '_' + aKey;
  if (_texCache[key]) return _texCache[key];

  const mask = N - 1, scale = N / 512;
  const seed = kind === 'asfalt' ? 91 : kind === 'is' ? 57 : 23;
  const r = mulberry(seed);
  const permA = makePerm(seed + 101), permB = makePerm(seed + 307);

  const hgt = new Float32Array(N * N);
  const col = cv(N, N), g = col.getContext('2d'), colIm = g.createImageData(N, N), cd = colIm.data;
  const rough = cv(N, N), gr = rough.getContext('2d'), roughIm = gr.createImageData(N, N), rd = roughIm.data;

  const F = N >= 1024 ? 256 : 128;

  if (kind === 'asfalt') {
    // --- ASFALT: makro-variation, slitna blankare hjulspår, tät stenaggregat-mikrostruktur, lagningar & tjärsprickor ---
    const fMacro = makeField(permA, F, 4, 3, 0.55);
    const fMid = makeField(permB, F, 16, 3, 0.55);
    for (let y = 0; y < N; y++) {
      const v = y / N, row = y * N;
      const sway = Math.sin(v * Math.PI * 2) * 0.012;
      for (let x = 0; x < N; x++) {
        const u = x / N, idx = row + x, i4 = idx * 4;
        const macro = sampleField(fMacro, F, u, v);            // stor fläckighet (döljer tapeteffekt)
        const mid = sampleField(fMid, F, u, v);                // medelskala slitage
        const micro = pNoise(permA, u * 128, v * 128, 128);    // kornighet
        const grit = pNoise(permB, u * 256, v * 256, 256);     // mineralglimmer

        // Hjulspår kring u = 0.27 & 0.73 (polerade, mörkare gummi/oljespår, lägre råhet)
        const uw = (u + sway + (macro - 0.5) * 0.025 + 1) % 1;
        const dL = Math.abs(uw - 0.27), dR = Math.abs(uw - 0.73);
        const rut = Math.exp(-dL * dL / 0.0042) + Math.exp(-dR * dR / 0.0042);

        // Basfärg (multipliceras med hörnfärg ~0.36) + kornig mineralvariation
        const agg = (micro - 0.5) * 0.15 + (grit - 0.5) * 0.18;
        const glint = grit > 0.87 ? (grit - 0.87) * 1.15 : 0;
        let lum = 0.81 + (macro - 0.5) * 0.15 + (mid - 0.5) * 0.08 + agg + glint - rut * 0.13;
        lum = clamp01(lum);

        const cR = clamp01(lum * (0.99 + (macro - 0.5) * 0.04));
        const cG = clamp01(lum * 0.995);
        const cB = clamp01(lum * (1.02 - (macro - 0.5) * 0.03));
        cd[i4] = (cR * 255) | 0;
        cd[i4 + 1] = (cG * 255) | 0;
        cd[i4 + 2] = (cB * 255) | 0;
        cd[i4 + 3] = 255;

        // Råhet: blankare i polerade hjulspår, sträv i grov asfalt, glimtande stenaggregat
        let rVal = 0.84 + (macro - 0.5) * 0.12 - rut * 0.24 - glint * 0.35 + (micro - 0.5) * 0.08;
        const rv = (clamp01(rVal) * 255) | 0;
        rd[i4] = rd[i4 + 1] = rd[i4 + 2] = rv; rd[i4 + 3] = 255;

        hgt[idx] = (macro - 0.5) * 0.22 + (mid - 0.5) * 0.28 + micro * 0.42 + grit * 0.38 - rut * 0.18;
      }
    }

    // Asfaltlagningar (fräschare mörkare bitumenlappar med blank tjärfog runt kanten)
    const patchCnt = 5;
    for (let p = 0; p < patchCnt; p++) {
      const px = r() * N, py = r() * N;
      const pw = (42 + r() * 95) * scale, ph = (65 + r() * 145) * scale;
      const darkF = 0.78 + r() * 0.10, roughPatch = 0.56 + r() * 0.10;
      const x0 = Math.floor(px - pw * 0.5 - 3), x1 = Math.ceil(px + pw * 0.5 + 3);
      const y0 = Math.floor(py - ph * 0.5 - 3), y1 = Math.ceil(py + ph * 0.5 + 3);
      for (let yy = y0; yy <= y1; yy++) {
        const yw = yy & mask, row = yw * N;
        const dy = Math.abs(yy - py) - ph * 0.5;
        for (let xx = x0; xx <= x1; xx++) {
          const xw = xx & mask, idx = row + xw, i4 = idx * 4;
          const jitter = (pNoise(permB, (xw / N) * 32, (yw / N) * 32, 32) - 0.5) * 6 * scale;
          const dx = Math.abs(xx - px) - pw * 0.5;
          const edge = Math.max(dx, dy) + jitter;
          if (edge < 1.8 * scale && edge > -1.8 * scale) {
            // Blank mörk tjärfog runt lagningen
            const seamT = 1 - Math.abs(edge) / (1.8 * scale);
            const f = 1 - 0.52 * seamT;
            cd[i4] = (cd[i4] * f) | 0; cd[i4 + 1] = (cd[i4 + 1] * f) | 0; cd[i4 + 2] = (cd[i4 + 2] * f) | 0;
            const rv = Math.min(rd[i4], (255 * (0.24 + (1 - seamT) * 0.45)) | 0);
            rd[i4] = rd[i4 + 1] = rd[i4 + 2] = rv;
            hgt[idx] += 0.14 * seamT;
          } else if (edge <= -1.8 * scale) {
            cd[i4] = (cd[i4] * darkF) | 0; cd[i4 + 1] = (cd[i4 + 1] * darkF) | 0; cd[i4 + 2] = (cd[i4 + 2] * darkF) | 0;
            const rv = (roughPatch * 255 + (pNoise(permA, (xw / N) * 128, (yw / N) * 128, 128) - 0.5) * 36) | 0;
            rd[i4] = rd[i4 + 1] = rd[i4 + 2] = Math.max(40, Math.min(240, rv));
            hgt[idx] = hgt[idx] * 0.72 + 0.18;
          }
        }
      }
    }

    // Fina mineralstenar i asfaltsytan
    const sCount = Math.round(7500 * scale * scale * 0.55);
    for (let s = 0; s < sCount; s++) {
      const cx = r() * N, cy = r() * N;
      const rad = (0.55 + Math.pow(r(), 2.2) * 1.4) * scale;
      const v = (0.55 + r() * 0.52) * 255;
      stampStone(cd, rd, hgt, N, mask, cx, cy, rad, rad * (0.65 + r() * 0.4), r() * 3.14, v, v, Math.min(255, v * 1.03), 0.55 + r() * 0.35, 0.36 * scale, 0.08, 1.8);
    }

    // Ringlande tjärlagade sprickor (blanka i råhet, fördjupning i normal)
    const crackCnt = 7;
    for (let k = 0; k < crackCnt; k++) {
      let cx = r() * N, cy = r() * N, ang = r() * Math.PI * 2;
      const steps = Math.round((85 + r() * 140) * scale);
      for (let st = 0; st < steps; st++) {
        ang += (r() - 0.5) * 0.45;
        cx += Math.cos(ang) * 1.2; cy += Math.sin(ang) * 1.2;
        const wCrack = Math.max(1, Math.round((0.8 + r() * 0.7) * scale));
        for (let dy = -wCrack; dy <= wCrack; dy++) for (let dx = -wCrack; dx <= wCrack; dx++) {
          const d = Math.hypot(dx, dy) / (wCrack + 0.5);
          if (d >= 1) continue;
          const idx = ((Math.floor(cy) + dy) & mask) * N + ((Math.floor(cx) + dx) & mask), i4 = idx * 4;
          const t = 1 - d;
          cd[i4] = (cd[i4] * (1 - 0.55 * t)) | 0; cd[i4 + 1] = (cd[i4 + 1] * (1 - 0.55 * t)) | 0; cd[i4 + 2] = (cd[i4 + 2] * (1 - 0.55 * t)) | 0;
          const rv = (55 + (1 - t) * 120) | 0;
          if (rv < rd[i4]) rd[i4] = rd[i4 + 1] = rd[i4 + 2] = rv;
          hgt[idx] -= 0.45 * t;
        }
      }
    }
  } else if (kind === 'is') {
    // --- IS & PACKAD VINTERVÄG: blanka isspår, snösträng i mitten & kant, skarpa kristallrepor & dubbskrap ---
    const fMacro = makeField(permA, F, 4, 3, 0.55);
    const fDrift = makeField(permB, F, 8, 3, 0.55, 1, 0.5);
    for (let y = 0; y < N; y++) {
      const v = y / N, row = y * N;
      const sway = Math.sin(v * Math.PI * 2) * 0.016;
      for (let x = 0; x < N; x++) {
        const u = x / N, idx = row + x, i4 = idx * 4;
        const macro = sampleField(fMacro, F, u, v);
        const drift = sampleField(fDrift, F, u, v);
        const micro = pNoise(permA, u * 128, v * 128, 128);
        const crystal = pNoise(permB, u * 256, v * 256, 256);

        const uw = (u + sway + (macro - 0.5) * 0.03 + 1) % 1;
        const dL = Math.abs(uw - 0.27), dR = Math.abs(uw - 0.73);
        const rut = clamp01(Math.exp(-dL * dL / 0.0055) + Math.exp(-dR * dR / 0.0055));
        const dC = Math.abs(uw - 0.50);
        const centerSnow = Math.exp(-dC * dC / 0.0045);
        const edgeDist = Math.min(uw, 1 - uw);
        const edgeSnow = Math.exp(-edgeDist * edgeDist / 0.007);
        const snowMask = clamp01((centerSnow * 0.7 + edgeSnow * 0.95) * (0.65 + 0.5 * drift) - rut * 0.65);

        // Blankis i spåren (djupare kall iston), ljusare frostig packad snö mellan spåren & kanter
        const baseIceR = 0.84 + (macro - 0.5) * 0.08 - rut * 0.09;
        const baseIceG = 0.90 + (macro - 0.5) * 0.06 - rut * 0.05;
        const baseIceB = 0.96 + (macro - 0.5) * 0.04;
        const cR = clamp01(baseIceR + (0.98 - baseIceR) * snowMask + (micro - 0.5) * 0.05);
        const cG = clamp01(baseIceG + (0.99 - baseIceG) * snowMask + (micro - 0.5) * 0.04);
        const cB = clamp01(baseIceB + (1.00 - baseIceB) * snowMask + (crystal > 0.92 ? 0.06 : 0));

        cd[i4] = (cR * 255) | 0; cd[i4 + 1] = (cG * 255) | 0; cd[i4 + 2] = (cB * 255) | 0; cd[i4 + 3] = 255;

        // Råhet: spegelblank is i spåren (0.08..0.22), kristallglitter, mattare snö i mitten/kanter (0.62..0.82)
        let rVal = 0.24 - rut * 0.14 + snowMask * 0.54 + (drift - 0.5) * 0.10 + (micro - 0.5) * 0.06;
        if (crystal > 0.93) rVal *= 0.45; // gnistrande iskristaller
        const rv = (clamp01(rVal) * 255) | 0;
        rd[i4] = rd[i4 + 1] = rd[i4 + 2] = rv; rd[i4 + 3] = 255;

        hgt[idx] = (macro - 0.5) * 0.35 + (drift - 0.5) * 0.30 + snowMask * 0.55 - rut * 0.32 + micro * 0.16;
      }
    }

    // Kristallrepor & dubbdäcksrispor (skarpa vita/isblå skåror längs och lätt diagonalt)
    const scratchCnt = Math.round(320 * scale);
    for (let k = 0; k < scratchCnt; k++) {
      let sx = r() * N, sy = r() * N;
      const isLong = r() < 0.68;
      const len = (isLong ? 35 + r() * 140 : 12 + r() * 45) * scale;
      let ang = isLong ? (Math.PI * 0.5 + (r() - 0.5) * 0.42) : (r() * Math.PI * 2);
      const curve = (r() - 0.5) * 0.012;
      const bright = r() < 0.72;
      const depth = (0.18 + r() * 0.32) * scale;
      const steps = Math.ceil(len);
      for (let t = 0; t < steps; t++) {
        ang += curve;
        sx += Math.cos(ang); sy += Math.sin(ang);
        const fade = Math.sin((t / steps) * Math.PI);
        const px = Math.floor(sx) & mask, py = Math.floor(sy) & mask;
        const idx = py * N + px, i4 = idx * 4;
        if (bright) {
          cd[i4] = Math.min(255, cd[i4] + (55 * fade) | 0);
          cd[i4 + 1] = Math.min(255, cd[i4 + 1] + (60 * fade) | 0);
          cd[i4 + 2] = Math.min(255, cd[i4 + 2] + (65 * fade) | 0);
          // Skrapad iskristall är något strävare precis i repan
          const nr = Math.min(235, rd[i4] + (75 * fade) | 0);
          rd[i4] = rd[i4 + 1] = rd[i4 + 2] = nr;
        } else {
          // Djupare inre isspricka i kall cyan-blå
          cd[i4] = Math.max(120, cd[i4] - (36 * fade) | 0);
          cd[i4 + 1] = Math.max(150, cd[i4 + 1] - (18 * fade) | 0);
          cd[i4 + 2] = Math.min(255, cd[i4 + 2] + (10 * fade) | 0);
        }
        hgt[idx] -= depth * fade;
        // Subtil upphöjd iskristallkant bredvid repan
        const idx2 = py * N + ((px + 1) & mask);
        hgt[idx2] += depth * 0.35 * fade;
      }
    }
  } else {
    // --- GRUS (NORDISK RALLYVÄG): makro-variation, packade fuktigare hjulspår, lös grussträng i mitten, grusvall vid kanten & skarpa stenar ---
    const fMacro = makeField(permA, F, 4, 3, 0.55);
    const fMid = makeField(permB, F, 16, 3, 0.55);
    const fStreak = makeField(permA, F, 8, 2, 0.5, 4, 0.5);
    for (let y = 0; y < N; y++) {
      const v = y / N, row = y * N;
      const sway = Math.sin(v * Math.PI * 2) * 0.018 + Math.sin(v * Math.PI * 4 + 1.1) * 0.008;
      for (let x = 0; x < N; x++) {
        const u = x / N, idx = row + x, i4 = idx * 4;
        const macro = sampleField(fMacro, F, u, v);                // fukt-/dammfläckar (bryter tapeteffekt)
        const mid = sampleField(fMid, F, u, v);                    // mellanskala grusstruktur
        const streak = sampleField(fStreak, F, u, v);              // längsgående hjuldrag/räfflor
        const fine = pNoise(permB, u * 128, v * 128, 128);         // fin sand
        const grit = pNoise(permA, u * 256, v * 256, 256);         // mikrokorn

        // Organiskt slingrande tvärprofil (sömlös vid u = 0 / 1)
        const uw = (u + sway + (macro - 0.5) * 0.032 + 1) % 1;
        const dL = Math.abs(uw - 0.27), dR = Math.abs(uw - 0.73);
        const rut = clamp01(Math.exp(-dL * dL / 0.0048) + Math.exp(-dR * dR / 0.0048));
        const dC = Math.abs(uw - 0.50);
        const centerRidge = Math.exp(-dC * dC / 0.0042);          // lös grussträng i mitten
        const edgeDist = Math.min(uw, 1 - uw);
        const edgeBerm = Math.exp(-edgeDist * edgeDist / 0.0065); // lös grusvall vid kanterna
        const loose = clamp01(centerRidge * 0.9 + edgeBerm * 1.05);

        // Makro-fuktfläckar (mörkare, något blankare i hjulspåren)
        const damp = clamp01(rut * (0.55 + 0.65 * (1 - macro)) + (0.42 - macro) * 0.45);

        // Färg: mörkare, fylligare packat grus i spåren; ljusare dammigt grus på mittsträng & grusvall
        let lum = 0.80 + (macro - 0.5) * 0.16 + (mid - 0.5) * 0.12 + (fine - 0.5) * 0.10 + (grit - 0.5) * 0.09;
        lum -= rut * 0.14 + damp * 0.06;
        lum += loose * 0.11;
        lum -= (streak - 0.5) * 0.06 * rut;

        // Färgnyans: varmare ockra/sand i löst grus, lite mörkare jordig ton i packade spår
        const cR = clamp01(lum * (1.03 + loose * 0.03 - damp * 0.02));
        const cG = clamp01(lum * (0.99 + loose * 0.01));
        const cB = clamp01(lum * (0.91 - loose * 0.03 + damp * 0.02));
        cd[i4] = (cR * 255) | 0; cd[i4 + 1] = (cG * 255) | 0; cd[i4 + 2] = (cB * 255) | 0; cd[i4 + 3] = 255;

        // Råhet: fuktigare/packat/blankare i hjulspåren (0.52..0.72), snustorrt matt i löst grus (0.90..0.99)
        let rVal = 0.86 + loose * 0.12 - rut * 0.22 - damp * 0.14 + (mid - 0.5) * 0.08 + (grit - 0.5) * 0.05;
        const rv = (clamp01(rVal) * 255) | 0;
        rd[i4] = rd[i4 + 1] = rd[i4 + 2] = rv; rd[i4 + 3] = 255;

        // Höjdkarta: nedsänkta spår, upphöjd mittsträng & kantvall + fin kornighet & tvärgående tvättbräde-nyans
        const washboard = Math.sin(v * Math.PI * 24 + macro * 5) * 0.05 * (1 - loose * 0.5);
        hgt[idx] = (macro - 0.5) * 0.45 + (mid - 0.5) * 0.35 + (centerRidge * 0.42 + edgeBerm * 0.52) - rut * 0.46 + (streak - 0.5) * 0.22 * rut + fine * 0.28 + grit * 0.22 + washboard;
      }
    }

    // Skarpa grusstenar i 3 storleksnivåer: fler & större i lös mittsträng & kantvall, färre/plattare i hjulspåren
    const totalStones = Math.round(9200 * (N === 1024 ? 1.65 : 1.0));
    for (let s = 0; s < totalStones; s++) {
      const cx = r() * N, cy = r() * N;
      const u = cx / N, v = cy / N;
      const sway = Math.sin(v * Math.PI * 2) * 0.018;
      const uw = (u + sway + 1) % 1;
      const dL = Math.abs(uw - 0.27), dR = Math.abs(uw - 0.73);
      const inRut = Math.exp(-dL * dL / 0.0048) + Math.exp(-dR * dR / 0.0048);
      const dC = Math.abs(uw - 0.50), edgeDist = Math.min(uw, 1 - uw);
      const inLoose = clamp01(Math.exp(-dC * dC / 0.0045) + Math.exp(-edgeDist * edgeDist / 0.007));

      // Gallra bort stora stenar ur de hårt packade hjulspåren
      const tier = r();
      if (inRut > 0.55 && tier > 0.72 && r() < 0.7) continue;

      let rad, hPeak;
      if (tier < 0.68) {
        // Finkornigt makadam/grus
        rad = (0.85 + r() * 1.45) * scale;
        hPeak = (0.38 + r() * 0.35) * scale;
      } else if (tier < 0.94) {
        // Medelstora krossade rallystenar
        rad = (1.9 + r() * 2.1 + inLoose * 0.9) * scale;
        hPeak = (0.72 + r() * 0.55) * scale * (1 - inRut * 0.38);
      } else {
        // Grova kantstenar / lösa stenar i mittsträng & vall
        rad = (3.2 + r() * 3.0 + inLoose * 1.5) * scale;
        hPeak = (1.15 + r() * 0.75) * scale * (0.5 + inLoose * 0.6);
      }

      // Nordisk stenpalett: grå granit, varm fältspat, ljus kvarts, mörk gnejs
      const mineral = r();
      let cR, cG, cB, rStone;
      if (mineral < 0.35) { // ljusgrå granit
        const g0 = (0.72 + r() * 0.24) * 255; cR = g0 * 1.02; cG = g0; cB = g0 * 0.96; rStone = 0.80 + r() * 0.14;
      } else if (mineral < 0.68) { // varm sand/fältspat
        const g0 = (0.74 + r() * 0.24) * 255; cR = g0 * 1.08; cG = g0 * 0.98; cB = g0 * 0.85; rStone = 0.86 + r() * 0.12;
      } else if (mineral < 0.86) { // mörk basalt/gnejs
        const g0 = (0.48 + r() * 0.20) * 255; cR = g0 * 1.01; cG = g0; cB = g0 * 1.03; rStone = 0.68 + r() * 0.18;
      } else { // ljus kvartsflisa (något blankare)
        const g0 = (0.88 + r() * 0.12) * 255; cR = g0; cG = g0 * 0.99; cB = g0 * 0.96; rStone = 0.52 + r() * 0.18;
      }
      stampStone(cd, rd, hgt, N, mask, cx, cy, rad, rad * (0.55 + r() * 0.45), r() * Math.PI,
        Math.min(255, cR), Math.min(255, cG), Math.min(255, cB), rStone, hPeak, 0.14, 1.55);
    }
  }

  g.putImageData(colIm, 0, 0);
  gr.putImageData(roughIm, 0, 0);
  const normK = kind === 'asfalt' ? 2.6 * scale : kind === 'is' ? 1.8 * scale : 2.9 * scale;
  const out = {
    map: toTex(col, 0, aKey),
    normal: toTex(normalFrom(hgt, N, N, normK), 0, aKey),
    rough: toTex(rough, 0, aKey),
  };
  return (_texCache[key] = out);
}

// ---------- procedurella terrängtexturer ----------
// Nordisk skogsmark: mossa, barr, ljung/torrt gräs, stenstruktur (sommar) eller vindformat snötäcke (vinter).
// Returnerar { map, normal, rough } – map multipliceras med terrängens hörnfärg.
export function terrainTextures(winter, aniso) {
  const aKey = aniso || 4;
  const N = aKey >= 8 ? 1024 : 512;
  const key = 'ter_' + (winter ? 1 : 0) + '_' + N + '_' + aKey;
  if (_texCache[key]) return _texCache[key];

  const mask = N - 1, scale = N / 512;
  const seed = winter ? 5 : 3;
  const r = mulberry(seed);
  const permA = makePerm(seed + 41), permB = makePerm(seed + 173), permC = makePerm(seed + 389);

  const hgt = new Float32Array(N * N);
  const col = cv(N, N), g = col.getContext('2d'), colIm = g.createImageData(N, N), cd = colIm.data;
  const rough = cv(N, N), gr = rough.getContext('2d'), roughIm = gr.createImageData(N, N), rd = roughIm.data;

  const F = N >= 1024 ? 256 : 128;

  if (winter) {
    // --- VINTERMARK: vindformade snödrivor (sastrugi), iskristallglitter, frostskorpa & enstaka barr/sten ---
    const fWarp = makeField(permA, F, 4, 2, 0.5);
    const fSast = makeField(permB, F, 4, 4, 0.52);
    const fCrust = makeField(permC, F, 8, 3, 0.55);
    for (let y = 0; y < N; y++) {
      const v = y / N, row = y * N;
      for (let x = 0; x < N; x++) {
        const u = x / N, idx = row + x, i4 = idx * 4;
        const warp = sampleField(fWarp, F, u, v) * 0.14;
        // Vinddrivna snövågor
        const sastrugi = sampleField(fSast, F, u + warp, v * 2 + warp * 0.5);
        const crust = sampleField(fCrust, F, u, v);
        const grain = pNoise(permA, u * 128, v * 128, 128);
        const sparkle = pNoise(permB, u * 256, v * 256, 256);

        const lum = clamp01(0.84 + (sastrugi - 0.5) * 0.16 + (grain - 0.5) * 0.06 + (sparkle > 0.94 ? 0.07 : 0));
        cd[i4] = (clamp01(lum * 0.98) * 255) | 0;
        cd[i4 + 1] = (clamp01(lum * 0.995) * 255) | 0;
        cd[i4 + 2] = (clamp01(lum * 1.02) * 255) | 0;
        cd[i4 + 3] = 255;

        // Skare (blankare) blandat med kall pudersnö (matt) + kristallglimt
        let rVal = 0.78 - smoothstep(0.45, 0.78, crust) * 0.38 + (grain - 0.5) * 0.10;
        if (sparkle > 0.94) rVal = 0.14;
        const rv = (clamp01(rVal) * 255) | 0;
        rd[i4] = rd[i4 + 1] = rd[i4 + 2] = rv; rd[i4 + 3] = 255;

        hgt[idx] = sastrugi * 1.45 + crust * 0.35 + grain * 0.24;
      }
    }
    // Enstaka vindblåsta barr/kvistar och framstickande frusna småstenar
    const twigCnt = Math.round(1100 * scale);
    for (let k = 0; k < twigCnt; k++) {
      const x = r() * N, y = r() * N, len = (2.5 + r() * 6.5) * scale, ang = r() * Math.PI * 2;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const isDark = r() < 0.6;
      const steps = Math.ceil(len);
      for (let t = 0; t < steps; t++) {
        const idx = (Math.floor(y + sa * t) & mask) * N + (Math.floor(x + ca * t) & mask), i4 = idx * 4;
        const f = isDark ? 0.84 : 0.92;
        cd[i4] = (cd[i4] * f) | 0; cd[i4 + 1] = (cd[i4 + 1] * (f * 0.98)) | 0; cd[i4 + 2] = (cd[i4 + 2] * (f * 0.94)) | 0;
        hgt[idx] += 0.22;
      }
    }
  } else {
    // --- NORDISK SKOGSMARK: mossa, barr, ljung/torrt gräs & granitstenstruktur ---
    const fMacro = makeField(permA, F, 4, 3, 0.55);
    const fBiome = makeField(permB, F, 4, 3, 0.55);
    const fTuft = makeField(permC, F, 16, 4, 0.58);
    const fRock = makeField(permA, F, 8, 3, 0.52, 1, 1, 0.37, 0.19);
    for (let y = 0; y < N; y++) {
      const v = y / N, row = y * N;
      for (let x = 0; x < N; x++) {
        const u = x / N, idx = row + x, i4 = idx * 4;
        const macro = sampleField(fMacro, F, u, v);           // fukt/mossfläckar
        const biome = sampleField(fBiome, F, u, v);           // ljung/torr mark vs barr/mossa
        const tuft = sampleField(fTuft, F, u, v);             // mossa-kuddar & tuvor
        const rockN = sampleField(fRock, F, u, v);
        const micro = pNoise(permB, u * 128, v * 128, 128);
        const grain = pNoise(permC, u * 256, v * 256, 256);

        // Masker för mikromiljöer i nordisk skog
        const mossM = smoothstep(0.42, 0.72, macro) * smoothstep(0.32, 0.75, tuft);
        const heatherM = smoothstep(0.54, 0.80, biome) * (1 - mossM * 0.7);
        const needleM = smoothstep(0.35, 0.68, 1 - macro) * (1 - heatherM * 0.5);
        const rockM = smoothstep(0.69, 0.84, rockN) * (1 - mossM * 0.6);

        // Färg runt ~0.82 (multipliceras med terrängens gröna/bruna hörnfärger)
        let rC = 0.80 + (tuft - 0.5) * 0.20 + (micro - 0.5) * 0.10;
        let gC = 0.83 + (tuft - 0.5) * 0.20 + (micro - 0.5) * 0.10;
        let bC = 0.76 + (tuft - 0.5) * 0.16 + (micro - 0.5) * 0.08;

        // Mossa: sammetslen, något mörkare grönaktig nyans
        rC += (0.70 - rC) * mossM * 0.65;
        gC += (0.88 - gC) * mossM * 0.55;
        bC += (0.66 - bC) * mossM * 0.60;

        // Barrtäcke: varm rödbrun-ockra skogsbotten
        rC += (0.86 - rC) * needleM * 0.55;
        gC += (0.74 - gC) * needleM * 0.50;
        bC += (0.60 - bC) * needleM * 0.55;

        // Ljung & torrt gräs: halmgul + svag ljungton
        const heatherTone = grain > 0.62 ? 0.10 : 0.0;
        rC += (0.94 - rC) * heatherM * 0.52;
        gC += (0.84 - heatherTone - gC) * heatherM * 0.45;
        bC += (0.74 + heatherTone * 0.8 - bC) * heatherM * 0.45;

        // Framstickande granitsten
        const rkVal = 0.74 + (grain - 0.5) * 0.22;
        rC += (rkVal - rC) * rockM * 0.82;
        gC += (rkVal * 1.01 - gC) * rockM * 0.82;
        bC += (rkVal * 1.05 - bC) * rockM * 0.82;

        cd[i4] = (clamp01(rC) * 255) | 0;
        cd[i4 + 1] = (clamp01(gC) * 255) | 0;
        cd[i4 + 2] = (clamp01(bC) * 255) | 0;
        cd[i4 + 3] = 255;

        // Råhet: fuktig mossa & sten något blankare (0.58..0.76), barr & torrt gräs sträva/matta (0.88..0.98)
        let rVal = 0.90 - mossM * 0.16 + needleM * 0.05 + heatherM * 0.06 - rockM * 0.28 + (micro - 0.5) * 0.08;
        const rv = (clamp01(rVal) * 255) | 0;
        rd[i4] = rd[i4 + 1] = rd[i4 + 2] = rv; rd[i4 + 3] = 255;

        // Djup höjdkarta: mjuka mosskuddar + skarpare stenblock + mikrotuvor
        const rockBump = rockM * (0.95 + (tuft - 0.4) * 0.9);
        const mossCushion = mossM * Math.pow(tuft, 1.3) * 0.85;
        hgt[idx] = (macro - 0.5) * 0.55 + tuft * 0.65 + mossCushion + rockBump + micro * 0.30 + grain * 0.18;
      }
    }

    // Skogsbottendetaljer: tusentals fallna barr + ljung-/grässtrån
    const strawCnt = Math.round(14000 * (N === 1024 ? 1.55 : 1.0));
    for (let k = 0; k < strawCnt; k++) {
      const x = r() * N, y = r() * N;
      const isNeedle = r() < 0.55;
      const len = (isNeedle ? (2.2 + r() * 4.5) : (3.5 + r() * 8.0)) * scale;
      const ang = isNeedle ? r() * Math.PI * 2 : (-Math.PI * 0.5 + (r() - 0.5) * 1.4);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const steps = Math.ceil(len);
      // Barr: gyllenbrun/rödbrun; gräs/ljung: ljus halm eller dämpad grön/ljung
      let tR, tG, tB, hAdd, rAdd;
      if (isNeedle) {
        const v0 = 0.62 + r() * 0.26;
        tR = v0 * 1.12; tG = v0 * 0.86; tB = v0 * 0.58; hAdd = 0.34; rAdd = 232;
      } else if (r() < 0.22) { // ljungkvist
        const v0 = 0.68 + r() * 0.24;
        tR = v0 * 1.04; tG = v0 * 0.80; tB = v0 * 0.96; hAdd = 0.52; rAdd = 238;
      } else { // grässtrå
        const v0 = 0.68 + r() * 0.32;
        tR = v0 * 0.98; tG = v0 * 1.05; tB = v0 * 0.78; hAdd = 0.48; rAdd = 228;
      }
      for (let t = 0; t < steps; t++) {
        const px = Math.floor(x + ca * t) & mask, py = Math.floor(y + sa * t) & mask;
        const idx = py * N + px, i4 = idx * 4;
        const alpha = 0.52 * (1 - (t / steps) * 0.35);
        cd[i4] = Math.min(255, cd[i4] + (tR * 255 - cd[i4]) * alpha) | 0;
        cd[i4 + 1] = Math.min(255, cd[i4 + 1] + (tG * 255 - cd[i4 + 1]) * alpha) | 0;
        cd[i4 + 2] = Math.min(255, cd[i4 + 2] + (tB * 255 - cd[i4 + 2]) * alpha) | 0;
        rd[i4] = rd[i4 + 1] = rd[i4 + 2] = (rd[i4] + (rAdd - rd[i4]) * 0.35) | 0;
        hgt[idx] += hAdd * (0.6 + 0.4 * (t / steps));
      }
    }

    // Utspridda skogsstenar & små klippblock (ger distinkt stenstruktur i normal + råhet)
    const rockCnt = Math.round(420 * (N === 1024 ? 1.5 : 1.0));
    for (let s = 0; s < rockCnt; s++) {
      const cx = r() * N, cy = r() * N;
      const rad = (2.2 + Math.pow(r(), 2.2) * 7.5) * scale;
      const gv = (0.60 + r() * 0.28) * 255;
      stampStone(cd, rd, hgt, N, mask, cx, cy, rad, rad * (0.55 + r() * 0.45), r() * Math.PI,
        gv * 0.98, gv * 1.0, Math.min(255, gv * 1.06), 0.56 + r() * 0.16, (1.1 + r() * 0.9) * scale, 0.18, 1.45);
    }
  }

  g.putImageData(colIm, 0, 0);
  gr.putImageData(roughIm, 0, 0);
  const out = {
    map: toTex(col, 0, aKey),
    normal: toTex(normalFrom(hgt, N, N, (winter ? 1.7 : 2.3) * scale), 0, aKey),
    rough: toTex(rough, 0, aKey),
  };
  return (_texCache[key] = out);
}

// ---------- HDR-liknande miljöljus (PMREM) & atmosfärisk 3D-himmelkupol ----------
const _envPerm = makePerm(701);
let _envCloudField = null;
export function makeEnvironment(R, zenith, horizon, sunDir, ground) {
  const THREE = T();
  try {
    // Ekvirektangulär atmosfärisk himmelskarta med Rayleigh/Mie-spridning, varm solgloria, molnband och rik markreflektion → PMREM
    if (!_envCloudField) _envCloudField = makeField(_envPerm, 128, 4, 3, 0.52);
    const W = 512, H = 256, c = cv(W, H), g = c.getContext('2d'), im = g.createImageData(W, H), d = im.data;
    const sd = (sunDir ? sunDir.clone() : new THREE.Vector3(0.55, 0.62, 0.42)).normalize();
    const sunVis = smoothstep(-0.08, 0.10, sd.y);
    const zen = zenith || new THREE.Color(0x2764b4), hor = horizon || new THREE.Color(0xa9cbe6), gnd = ground || new THREE.Color(0x3a3a26);
    // Varm nordisk solfärg (lite svalare vid hög sol, varmare vid låg sol)
    const warmR = 1.0, warmG = 0.88 + 0.08 * clamp01(sd.y), warmB = 0.68 + 0.18 * clamp01(sd.y);

    for (let y = 0; y < H; y++) {
      const lat = (0.5 - (y + 0.5) / H) * Math.PI, sy = Math.sin(lat), cy = Math.cos(lat);
      for (let x = 0; x < W; x++) {
        const lon = ((x + 0.5) / W) * Math.PI * 2 - Math.PI;
        const dx = cy * Math.cos(lon), dz = cy * Math.sin(lon), dy = sy;
        const s = Math.max(0, dx * sd.x + dy * sd.y + dz * sd.z);
        // Horisont-azimut mot solen för varm Rayleigh/Mie-horisontglöd
        const hLen = Math.hypot(sd.x, sd.z) || 1;
        const az = Math.max(0, (dx * sd.x + dz * sd.z) / hLen);

        let r, gg, b;
        if (dy >= 0) {
          // Mjuk Rayleigh-gradient från horisont till zenit
          const t = Math.pow(dy, 0.52);
          r = hor.r + (zen.r - hor.r) * t;
          gg = hor.g + (zen.g - hor.g) * t;
          b = hor.b + (zen.b - hor.b) * t;

          // Varm atmosfärisk spridning längs horisonten mot solen
          const horGlow = Math.exp(-dy * 5.2) * Math.pow(az, 2.2) * 0.24 * sunVis;
          r += horGlow * warmR;
          gg += horGlow * warmG * 0.88;
          b += horGlow * warmB * 0.62;

          // Lätta solbelysta molnband i övre halvklotet (ger rika reflexer på lack och glas)
          const cu = (dx / (dy + 0.24)) * 0.18;
          const cv2 = (dz / (dy + 0.24)) * 0.18;
          const cl = sampleField(_envCloudField, 128, cu, cv2);
          const clMask = smoothstep(0.46, 0.78, cl) * smoothstep(0.03, 0.24, dy) * smoothstep(0.95, 0.35, dy);
          const lit = 0.72 + 0.28 * Math.pow(s, 2.0) * sunVis;
          const clR = (0.78 * hor.r + 0.26) * lit + Math.pow(s, 8) * 0.22 * sunVis;
          const clG = (0.78 * hor.g + 0.25) * lit + Math.pow(s, 8) * 0.19 * sunVis;
          const clB = (0.80 * hor.b + 0.24) * lit + Math.pow(s, 8) * 0.14 * sunVis;
          r += (clR - r) * clMask * 0.55;
          gg += (clG - gg) * clMask * 0.55;
          b += (clB - b) * clMask * 0.55;

          // Solskiva + Mie-solgloria
          const mie = (Math.pow(s, 420) * 3.8 + Math.pow(s, 36) * 0.52 + Math.pow(s, 6) * 0.16) * sunVis;
          r += mie * warmR;
          gg += mie * warmG;
          b += mie * warmB;
        } else {
          // Rik markreflektion: mjuk skogssiluett / dis vid horisonten ner till solbelyst markstuds
          const ady = -dy;
          const t = Math.pow(ady, 0.42);
          const treeBand = Math.exp(-Math.pow((ady - 0.04) / 0.06, 2)) * 0.22;
          const bounce = 0.84 + 0.28 * az * sunVis;
          const gR = gnd.r * bounce * (1 - treeBand);
          const gG = gnd.g * bounce * (1 - treeBand * 0.7);
          const gB = gnd.b * bounce * (1 - treeBand * 0.5);
          const hMixR = hor.r * 0.78 + gnd.r * 0.22;
          const hMixG = hor.g * 0.78 + gnd.g * 0.22;
          const hMixB = hor.b * 0.78 + gnd.b * 0.22;
          r = hMixR + (gR - hMixR) * t;
          gg = hMixG + (gG - hMixG) * t;
          b = hMixB + (gB - hMixB) * t;
        }

        const i = (y * W + x) * 4;
        d[i] = Math.min(255, Math.max(0, r * 255)) | 0;
        d[i + 1] = Math.min(255, Math.max(0, gg * 255)) | 0;
        d[i + 2] = Math.min(255, Math.max(0, b * 255)) | 0;
        d[i + 3] = 255;
      }
    }
    g.putImageData(im, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(R), rt = pm.fromEquirectangular(tex);
    pm.dispose(); tex.dispose();
    return rt.texture;
  } catch (e) { return null; }
}

// Atmosfärisk 3D-himmelkupol (THREE.Mesh med ShaderMaterial):
// Rayleigh zenit-till-horisont-gradient, varm solgloria + Mie-spridning, solskiva, solbelysta procedurmoln och horisontdis.
// Signatur: makeSkyDome(zenith, horizon, sunDir, winter)
export function makeSkyDome(zenith, horizon, sunDir, winter) {
  const THREE = T();
  const toCol = (c, fb) => (c && c.isColor ? c.clone() : new THREE.Color(c !== undefined ? c : fb));
  const topCol = toCol(zenith, winter ? 0x5f8cc0 : 0x2764b4);
  const horCol = toCol(horizon, winter ? 0xd5e2ee : 0xa9cbe6);
  const sVec = (sunDir && sunDir.isVector3 ? sunDir.clone() : new THREE.Vector3(0.55, 0.62, 0.42)).normalize();
  const overcast = sVec.y <= 0.01 ? 1.0 : 0.0;

  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: topCol },
      uHor: { value: horCol },
      uSun: { value: sVec },
      uWinter: { value: winter ? 1.0 : 0.0 },
      uTime: { value: 0.0 },
      uCloud: { value: overcast > 0.5 ? 0.82 : (winter ? 0.42 : 0.50) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 uTop;
      uniform vec3 uHor;
      uniform vec3 uSun;
      uniform float uWinter;
      uniform float uTime;
      uniform float uCloud;

      float hash21(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
        for (int i = 0; i < 4; i++) {
          v += a * vnoise(p);
          p = rot * p * 2.04 + vec2(17.1, 31.7);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 d = normalize(vDir);
        vec3 sDir = normalize(uSun);
        float h = clamp(d.y, 0.0, 1.0);
        float sunVis = smoothstep(-0.06, 0.08, sDir.y);

        // 1. Atmosfärisk zenit-till-horisont-gradient (Rayleigh-liknande optisk luftmassa)
        float rayT = pow(h, 0.50);
        vec3 sky = mix(uHor, uTop, rayT);

        // Subtil djupare zenit och svalare himmel mitt emot solen
        float sDot = max(dot(d, sDir), 0.0);
        vec2 sunHor = normalize(sDir.xz + vec2(1e-4, 0.0));
        vec2 dirHor = normalize(d.xz + vec2(1e-4, 0.0));
        float azim = max(dot(dirHor, sunHor), 0.0);

        vec3 sunWarm = mix(vec3(1.0, 0.86, 0.62), vec3(1.0, 0.90, 0.78), uWinter);
        // Varm horisontglöd i solriktningen (Mie-framåtspridning vid låg luftmassa)
        float horScatter = exp(-h * 5.5) * pow(azim, 2.0) * 0.26 * sunVis;
        sky += sunWarm * horScatter;

        // 2. Solskiva + flerskiktad Mie-solgloria
        float mieWide = pow(sDot, 5.0) * 0.16;
        float mieMid  = pow(sDot, 28.0) * 0.34;
        float mieCore = pow(sDot, 180.0) * 0.85;
        float sunDisc = smoothstep(0.99925, 0.99978, sDot) * 2.4;
        vec3 sunCol = mix(vec3(1.0, 0.93, 0.76), vec3(1.0, 0.96, 0.88), uWinter);
        sky += sunCol * (mieWide + mieMid + mieCore) * sunVis;

        // 3. Mjuka procedurmoln belysta av solen (kumulus + höga slöjmoln)
        float cloudAlpha = 0.0;
        if (d.y > 0.005) {
          vec2 domeUV = d.xz / (d.y + 0.17);
          vec2 drift = vec2(uTime * 0.008, uTime * 0.003);

          // Huvudmolnlager (kumulus)
          vec2 p1 = domeUV * 0.62 + drift;
          float n1 = fbm(p1);
          float detail = vnoise(p1 * 3.8 - drift * 2.0);
          float raw = n1 * 0.82 + detail * 0.18;
          float thresh = mix(0.66, 0.34, clamp(uCloud, 0.0, 1.0));
          float dens = smoothstep(thresh, thresh + 0.28, raw);

          // 1-stegs självskuggning mot solen ger belysta molntoppar och mjuk skugga under
          vec2 sunStep = sunHor * 0.12;
          float nSun = fbm(p1 + sunStep);
          float lit = clamp((n1 - nSun) * 3.2 + 0.62, 0.0, 1.0);
          float silver = pow(sDot, 9.0) * (1.0 - dens * 0.55) * 0.65 * sunVis;

          // Höga tunna cirrus-slöjor
          float cirrus = smoothstep(0.56, 0.85, fbm(domeUV * 1.45 * vec2(1.6, 0.7) + drift * 0.4)) * 0.28;

          // Mjuk nedtoning ner i horisontdiset
          float horFade = smoothstep(0.015, 0.22, d.y);
          float cAmt = clamp((dens * 0.88 + cirrus * (1.0 - dens)) * horFade, 0.0, 0.95);
          cloudAlpha = dens * horFade;

          vec3 cShadow = mix(uHor * 0.74, uTop * 0.88, 0.38);
          vec3 cBright = mix(vec3(0.96, 0.97, 0.99), vec3(1.0, 0.95, 0.87), 0.55 * sunVis * (1.0 - uWinter * 0.4));
          vec3 cloudCol = mix(cShadow, cBright, mix(0.45, lit, 0.45 + 0.55 * sunVis));
          cloudCol += sunCol * silver;

          // Mulet väder: mjukare molnkontrast i linje med horisontfärgen
          cloudCol = mix(mix(uHor * 0.88, uTop * 1.04, 0.45), cloudCol, 0.35 + 0.65 * sunVis);
          sky = mix(sky, cloudCol, cAmt);
        }

        // Solskivan lyser igenom tunna moln men dämpas naturligt av tjockare moln
        sky += sunCol * sunDisc * sunVis * (1.0 - cloudAlpha * 0.85);

        // 4. Horisontdis (sömlös övergång till scenens dimfärg uHor)
        float haze = exp(-abs(d.y) * 14.0);
        vec3 hazeCol = uHor + sunWarm * (0.08 * pow(azim, 2.0) * sunVis);
        sky = mix(sky, hazeCol, haze * 0.78);

        // Under horisonten: dämpas mjukt ner mot markton så ingen skarp skarv uppstår
        if (d.y < 0.0) {
          float bT = smoothstep(0.0, -0.35, d.y);
          sky = mix(hazeCol, uHor * 0.62, bT);
        }

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(3200, 48, 24), mat);
  mesh.frustumCulled = false;
  mesh.userData.update = t => { mat.uniforms.uTime.value = t; };
  return mesh;
}

// Gräs-tuvor: korsade plan med alfa-textur, i rutor (chunkar) så att kameran bara ritar det som syns
let _grassMat = null;
export function grassMaterial(winter) { const THREE = T(); if (_grassMat && _grassMat.userData.w === winter) return _grassMat;
  // färg (heltäckande, så att genomskinliga kanter aldrig blir svarta vid mipmapping) + separat alfakarta med stråna
  const c = cv(128, 128), g = c.getContext('2d'), a = cv(128, 128), ga = a.getContext('2d'), r = mulberry(8);
  const grd = g.createLinearGradient(0, 0, 0, 128); grd.addColorStop(0, winter ? '#f2f5fa' : '#9cc04e'); grd.addColorStop(0.55, winter ? '#e2e8ef' : '#6f9a38'); grd.addColorStop(1, winter ? '#cfd8e2' : '#3f6326'); g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
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

// Mjuk flerskiktad rök-/dammpartikel-textur (tät böljande volymkänsla, garanterat inga hårda kanter)
let _dustTex = null;
export function dustTexture() {
  if (_dustTex) return _dustTex;
  const THREE = T(), N = 128, c = cv(N, N), g = c.getContext('2d'), im = g.createImageData(N, N), d = im.data;
  const r = mulberry(31), perm = makePerm(313);
  // 14 överlappande mjuka molnlober för organisk siluett
  const lobes = [];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + (r() - 0.5) * 0.45;
    const dist = k < 4 ? r() * 0.14 : 0.14 + r() * 0.24;
    lobes.push([Math.cos(a) * dist, Math.sin(a) * dist, k < 4 ? 0.40 + r() * 0.16 : 0.24 + r() * 0.18, k < 4 ? 0.55 : 0.34]);
  }
  for (let y = 0; y < N; y++) {
    const ny = (y + 0.5) / N * 2 - 1;
    for (let x = 0; x < N; x++) {
      const nx = (x + 0.5) / N * 2 - 1;
      const rad = Math.hypot(nx, ny);
      const i = (y * N + x) * 4;
      if (rad >= 0.96) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = 0; continue; }

      // Mjuk grundvolym från överlappande lober
      let acc = 0;
      for (let k = 0; k < lobes.length; k++) {
        const L = lobes[k];
        const dl = Math.hypot(nx - L[0], ny - L[1]) / L[2];
        if (dl < 1) { const q = 1 - dl * dl; acc += q * q * L[3]; }
      }
      // Flerskiktad turbulens (FBM) ger böljande molnstruktur
      const f = pFbm(perm, (x / N), (y / N), 4, 4, 0.55);
      // Garanterad mjuk kanttoning som når exakt 0 innan bildkanten
      const edge = smoothstep(0.96, 0.18, rad);
      const core = smoothstep(0.88, 0.0, rad) * 0.42;
      const density = clamp01((acc * 0.55 + core) * (0.58 + 0.72 * f)) * edge;
      // Kalibrerad för view3.js (a * 2.6) så kärnan blir fyllig utan platt klippning
      const alpha = clamp01(density * 0.52);
      // Subtil inre volymskuggning (ljusare ovankant & puffiga toppar)
      const shade = clamp01(0.86 + 0.14 * f - ny * 0.08);
      const colV = (shade * 255) | 0;
      d[i] = d[i + 1] = d[i + 2] = colV;
      d[i + 3] = (alpha * 255) | 0;
    }
  }
  g.putImageData(im, 0, 0);
  _dustTex = new THREE.CanvasTexture(c);
  return _dustTex;
}

// Däckspår: ringbuffer av platta, genomskinliga remsor med grus-/mönsterdetalj som läggs bakom hjulen (äldsta skrivs över)
export class TrackMarks {
  constructor(scene, max, winter) {
    const THREE = T(); this.max = max; this.n = 0; this.k = 0; if (!max) return;
    const W = 64, H = 64, c = cv(W, H), gx = c.getContext('2d'), im = gx.createImageData(W, H), d = im.data;
    const perm = makePerm(winter ? 89 : 67);
    for (let y = 0; y < H; y++) {
      // y = tvärs däckets bredd (u i lokalt plan), x = längs spårets riktning
      const v = (y + 0.5) / H; // 0..1 tvärs hjulbredden
      const edgeW = smoothstep(0.0, 0.22, v) * smoothstep(1.0, 0.78, v);
      // Rallydäck: kraftigare skulderkanter + subtila längsgående mönsterräfflor
      const groove = 0.78 + 0.22 * Math.cos((v - 0.5) * Math.PI * 6);
      const shoulder = 0.85 + 0.22 * Math.exp(-Math.pow((Math.abs(v - 0.5) - 0.30) / 0.11, 2));
      for (let x = 0; x < W; x++) {
        const u = (x + 0.5) / W; // längs remsan
        const endFade = smoothstep(0.0, 0.18, u) * smoothstep(1.0, 0.82, u);
        const n = pFbm(perm, u, v, 8, 3, 0.55);
        const tread = 0.82 + 0.18 * Math.sin(u * Math.PI * 10 + Math.abs(v - 0.5) * 4);
        const a = clamp01(edgeW * endFade * groove * shoulder * tread * (0.72 + 0.42 * n));
        const i = (y * W + x) * 4;
        const val = (clamp01(0.88 + 0.12 * n) * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = val;
        d[i + 3] = (a * 255) | 0;
      }
    }
    gx.putImageData(im, 0, 0);
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
    const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff, map: tex, transparent: true, opacity: winter ? 0.50 : 0.44, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    this.mesh = new THREE.InstancedMesh(g, m, max); this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = 2;
    this.d = new THREE.Object3D(); this.c = new THREE.Color(); scene.add(this.mesh);
    for (let i = 0; i < max; i++) this.mesh.setColorAt(i, this.c.setRGB(1, 1, 1));
  }
  // (x0,z0)→(x1,z1) längs marken på höjd y, bredd w, färg rgb (mörk på grus, ljus/blank på is)
  add(x0, z0, x1, z1, y, w, rgb) {
    if (!this.max) return; const L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.05 || L > 3) return; const d = this.d, i = this.k;
    d.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); d.rotation.set(0, -Math.atan2(z1 - z0, x1 - x0), 0); d.scale.set(L + 0.06, 1, w); d.updateMatrix();
    this.mesh.setMatrixAt(i, d.matrix); this.mesh.setColorAt(i, this.c.setRGB(rgb[0], rgb[1], rgb[2])); this.k = (i + 1) % this.max; this.n = Math.min(this.max, this.n + 1); this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
