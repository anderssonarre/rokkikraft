// Bangeometri: sluten mittlinje samplad var 2:a meter, lisälenkki som en utbuktning på en raka.
import { TRACKS, SURF } from './data.js';

const DS = 2;
const cache = {};

export function getTrack(id) {
  if (cache[id]) return cache[id];
  const def = TRACKS.find(t => t.id === id) || TRACKS[0];
  return (cache[id] = build(def));
}

function build(def) {
  const sh = def.shape, M = 1440, raw = [];
  for (let j = 0; j < M; j++) {
    const th = j / M * Math.PI * 2; let r = 1;
    for (const [k, a, p] of sh.h) r += a * Math.cos(k * th + p);
    raw.push([Math.cos(th) * r * sh.R * sh.sx, Math.sin(th) * r * sh.R * sh.sz]);
  }
  // omsampla med jämnt avstånd
  let total = 0; const acc = [0];
  for (let j = 0; j < M; j++) { const a = raw[j], b = raw[(j + 1) % M]; total += Math.hypot(b[0] - a[0], b[1] - a[1]); acc.push(total); }
  const n = Math.round(total / DS), ds = total / n;
  let X = new Float32Array(n), Z = new Float32Array(n), jj = 0;
  for (let i = 0; i < n; i++) {
    const d = i * ds; while (acc[jj + 1] < d) jj++;
    const t = (d - acc[jj]) / (acc[jj + 1] - acc[jj]), a = raw[jj], b = raw[(jj + 1) % M];
    X[i] = a[0] + (b[0] - a[0]) * t; Z[i] = a[1] + (b[1] - a[1]) * t;
  }
  const w = i => ((i % n) + n) % n;
  const curv = (X, Z) => { const K = new Float32Array(n);
    for (let i = 0; i < n; i++) { const a = w(i - 2), b = w(i + 2);
      const h1 = Math.atan2(Z[i] - Z[a], X[i] - X[a]), h2 = Math.atan2(Z[b] - Z[i], X[b] - X[i]);
      let dh = h2 - h1; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI; K[i] = dh / (2 * ds); }
    return K; };
  let K = curv(X, Z);
  // startlinjen läggs där det är rakast
  let best = 0, bestV = 1e9;
  for (let i = 0; i < n; i++) { let m = 0; for (let q = -20; q <= 45; q++) m = Math.max(m, Math.abs(K[w(i + q)])); if (m < bestV) { bestV = m; best = i; } }
  const rot = A => { const B = new Float32Array(n); for (let i = 0; i < n; i++) B[i] = A[w(i + best)]; return B; };
  X = rot(X); Z = rot(Z); K = rot(K);
  const TX = new Float32Array(n), TZ = new Float32Array(n), NX = new Float32Array(n), NZ = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = w(i - 1), b = w(i + 1); const dx = X[b] - X[a], dz = Z[b] - Z[a], l = Math.hypot(dx, dz);
    TX[i] = dx / l; TZ[i] = dz / l; NX[i] = -TZ[i]; NZ[i] = TX[i]; }
  // "höger" (NX,NZ) pekar utåt när banan går medurs i vår vy; kolla med mittpunkten (origo ligger innanför)
  const outSign = (X[0] * NX[0] + Z[0] * NZ[0]) > 0 ? 1 : -1;
  const hw = def.width / 2;

  // lisälenkki: sök rakaste 76 m utanför startområdet
  const JL = 46, D = 17, jw = 7.5;
  let ji = -1, jv = 1e9;
  for (let i = 45; i < n - JL - 40; i++) { let m = 0; for (let q = -6; q <= JL + 6; q++) m = Math.max(m, Math.abs(K[i + q])); if (m < jv) { jv = m; ji = i; } }
  const joker = { i1: ji, i2: ji + JL, mid: ji + (JL >> 1), side: outSign, D, w: jw };
  const bulge = i => { const ii = w(Math.round(i)); if (ii <= joker.i1 || ii >= joker.i2) return 0;
    const t = (ii - joker.i1) / JL; return joker.side * D * 0.5 * (1 - Math.cos(2 * Math.PI * t)); };
  const bulgeF = f => { const i = Math.floor(f), t = f - i; return bulge(i) * (1 - t) + bulge(i + 1) * t; };

  const surf = SURF[def.surface];
  const trk = { id: def.id, name: def.name, surface: def.surface, surf, winter: def.surface === 'is', n, ds, len: total, hw, verge: 4.5,
    X, Z, TX, TZ, NX, NZ, K, joker, bulge, bulgeF, outSign, w,
    lenJoker: total + 15 };

  // närmaste punkt runt ett tips-index; ger index med bråkdel och signerat sidoavstånd
  trk.locate = (x, z, hint, span = 14) => {
    let bi = w(hint), bd = 1e12;
    for (let q = -span; q <= span; q++) { const i = w(hint + q); const dx = x - X[i], dz = z - Z[i], d = dx * dx + dz * dz; if (d < bd) { bd = d; bi = i; } }
    const dx = x - X[bi], dz = z - Z[bi];
    return { i: bi, f: (dx * TX[bi] + dz * TZ[bi]) / ds, lat: dx * NX[bi] + dz * NZ[bi] };
  };
  trk.locateFull = (x, z) => { let bi = 0, bd = 1e12; for (let i = 0; i < n; i += 3) { const dx = x - X[i], dz = z - Z[i], d = dx * dx + dz * dz; if (d < bd) { bd = d; bi = i; } } return trk.locate(x, z, bi, 6); };
  // gränser i sidled (höger +, vänster −) inklusive lisälenkki
  trk.limits = i => { const b = bulge(i); let r = hw, l = -hw;
    if (b > 0) r = Math.max(r, b + jw / 2); else if (b < 0) l = Math.min(l, b - jw / 2);
    return [l, r]; };
  // på körbar yta?
  trk.onSurface = (i, lat) => { if (Math.abs(lat) <= hw) return true; const b = bulge(i); return b !== 0 && Math.abs(lat - b) <= jw / 2 + 0.3; };
  trk.point = (f, lat = 0) => { const i = w(Math.floor(f)), j = w(i + 1), t = f - Math.floor(f);
    const x = X[i] + (X[j] - X[i]) * t, z = Z[i] + (Z[j] - Z[i]) * t, nx = NX[i] + (NX[j] - NX[i]) * t, nz = NZ[i] + (NZ[j] - NZ[i]) * t;
    return [x + nx * lat, z + nz * lat, Math.atan2(TZ[i], TX[i])]; };

  // fartprofil för AI: kurvgräns + bromssträcka bakåt
  trk.profile = (aLat, aBrake, vMax) => {
    const V = new Float32Array(n);
    for (let i = 0; i < n; i++) { let k = 0; for (let q = -3; q <= 3; q++) k += Math.abs(K[w(i + q)]); k /= 7;
      V[i] = Math.min(vMax, Math.sqrt(aLat / Math.max(k * 0.74, 1e-4))); }
    for (let pass = 0; pass < 2; pass++) for (let i = n - 1; i >= 0; i--) { const nx = V[w(i + 1)]; V[i] = Math.min(V[i], Math.sqrt(nx * nx + 2 * aBrake * ds)); }
    return V; };
  // idealspår: dra in mot kurvans insida
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) { let k = 0; for (let q = -8; q <= 8; q++) k += K[w(i + q)]; k /= 17; L[i] = Math.max(-(hw - 2.2), Math.min(hw - 2.2, k * 190)); }
  trk.line = L;
  return trk;
}

// kontroll som körs i Node: självkorsning och minsta radie
export function checkTrack(id) {
  const t = getTrack(id); let minR = 1e9, minSep = 1e9;
  for (let i = 0; i < t.n; i++) { const k = Math.abs(t.K[i]); if (k > 0) minR = Math.min(minR, 1 / k);
    for (let j = i + 30; j < t.n - 30 + i && j < t.n; j += 2) { const d = Math.hypot(t.X[i] - t.X[j], t.Z[i] - t.Z[j]); if (d < minSep && Math.min(j - i, t.n - (j - i)) > 30) minSep = d; } }
  // lisälenkkins avstånd till övriga banan
  let jSep = 1e9; const j = t.joker;
  for (let i = j.i1; i <= j.i2; i++) { const b = t.bulge(i), x = t.X[i] + t.NX[i] * b, z = t.Z[i] + t.NZ[i] * b;
    for (let q = 0; q < t.n; q++) { if (q > j.i1 - 25 && q < j.i2 + 25) continue; jSep = Math.min(jSep, Math.hypot(x - t.X[q], z - t.Z[q])); } }
  return { id, len: Math.round(t.len), minR: +minR.toFixed(1), minSep: +minSep.toFixed(1), jSep: +jSep.toFixed(1), joker: [j.i1, j.i2], n: t.n };
}
