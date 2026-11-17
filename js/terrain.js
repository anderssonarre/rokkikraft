// Terräng: banan får en höjdprofil och marken runt omkring formas efter den.
// Höjdskillnaden per bana kommer från banfakta där den är känd (Kouvola 20 m, Pihtipudas "lite");
// övriga är antagna. Själva kullarnas läge är genererat – det finns ingen uppmätt höjddata i spelet.
import { hash, mulberry } from './gl.js';

const ELEV = { kouvola: 20, hyvinkaa: 8, joutsa: 6, rantasalmi: 6, pieksamaki: 8, pihtipudas: 3, akaa: 5, tammisaari: 5 };
const CELL = 14;

export function ensureTerrain(trk) {
  if (trk.Y) return trk;
  const { n, X, Z, NX, NZ, w } = trk, rnd = mulberry(hash(trk.id + 'terr')), target = ELEV[trk.id.replace('-is', '')] ?? 5;
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let i = 0; i < n; i++) { x0 = Math.min(x0, X[i]); x1 = Math.max(x1, X[i]); z0 = Math.min(z0, Z[i]); z1 = Math.max(z1, Z[i]); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, ext = Math.max(x1 - x0, z1 - z0);
  // tre långa vågor + en lutning ger mjuka backar
  const waves = []; for (let k = 0; k < 3; k++) { const th = rnd() * 6.283, lam = ext * (0.55 + rnd() * 0.7); waves.push([Math.cos(th) * 6.283 / lam, Math.sin(th) * 6.283 / lam, rnd() * 6.283, 1 / (k + 1)]); }
  const tilt = [(rnd() - 0.5) * 2 / ext, (rnd() - 0.5) * 2 / ext];
  const base = (x, z) => { let h = (x - cx) * tilt[0] + (z - cz) * tilt[1]; for (const [a, b, p, amp] of waves) h += amp * Math.sin(x * a + z * b + p); return h; };
  let Y = new Float32Array(n); for (let i = 0; i < n; i++) Y[i] = base(X[i], Z[i]);
  let lo = 1e9, hi = -1e9; for (let i = 0; i < n; i++) { lo = Math.min(lo, Y[i]); hi = Math.max(hi, Y[i]); }
  const f = target / Math.max(0.2, hi - lo), mid = (lo + hi) / 2;
  const H0 = (x, z) => (base(x, z) - mid) * f;
  for (let i = 0; i < n; i++) Y[i] = (Y[i] - mid) * f;
  for (let pass = 0; pass < 3; pass++) { const B = new Float32Array(n); for (let i = 0; i < n; i++) { let s = 0; for (let q = -6; q <= 6; q++) s += Y[w(i + q)]; B[i] = s / 13; } Y = B; }
  const SL = new Float32Array(n); for (let i = 0; i < n; i++) SL[i] = (Y[w(i + 2)] - Y[w(i - 2)]) / (4 * trk.ds);
  trk.Y = Y; trk.SL = SL; trk.elevRange = target; trk.bbox = { x0, x1, z0, z1, cx, cz, ext };
  trk.yAt = fi => { const i = w(Math.floor(fi)), t = fi - Math.floor(fi); return Y[i] + (Y[w(i + 1)] - Y[i]) * t; };

  // rumsligt index över alla körbara ytor: huvudbanan, lisälenkkin och startfållan
  const grid = new Map(), add = (x, z, hw, y, idx = -1) => { const k = Math.floor(x / CELL) + ',' + Math.floor(z / CELL); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(x, z, hw, y, idx); };
  for (let i = 0; i < n; i++) { add(X[i], Z[i], trk.HW[i], Y[i], i); const b = trk.bulge(i); if (b) add(X[i] + NX[i] * b, Z[i] + NZ[i] * b, trk.joker.w / 2, Y[i], i); }
  const ch = trk.startChute;
  if (ch) { const L = Math.hypot(ch.x1 - ch.x0, ch.z1 - ch.z0), near = trk.locateFull(ch.x1, ch.z1), yj = Y[near.i]; trk.chuteY = yj;
    for (let d = 0; d <= L; d += 2) add(ch.x0 + (ch.x1 - ch.x0) * d / L, ch.z0 + (ch.z1 - ch.z0) * d / L, (ch.w || 14) / 2, yj); }
  // stora vallar längs banan: brant insida mot banan, flack baksida
  const winter = trk.winter, bermH = winter ? 2.1 : 1.8, verge = trk.verge;
  const noise = (x, z) => Math.sin(x * 0.071 + z * 0.043) * Math.sin(z * 0.089 - x * 0.031);
  // höjd i en godtycklig punkt + avstånd till närmaste bankant (negativt = på banan)
  trk.heightAt = (x, z, out) => {
    const gx = Math.floor(x / CELL), gz = Math.floor(z / CELL); let bd = 1e9, by = 0, bi = -1, bx = 0, bz = 0;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { const c = grid.get((gx + a) + ',' + (gz + b)); if (!c) continue;
      for (let q = 0; q < c.length; q += 5) { const d = Math.hypot(x - c[q], z - c[q + 1]) - c[q + 2];
        // på själva banan vinner banans egna punkter över startfållan (som har konstant höjd) – annars blir det kanter där de överlappar
        const better = d < bd ? !(bi >= 0 && bd <= 0 && c[q + 4] < 0) : (c[q + 4] >= 0 && bi < 0 && d <= 0);
        if (better) { bd = d; by = c[q + 3]; bi = c[q + 4]; bx = c[q]; bz = c[q + 1]; } } }
    // Banans höjd interpoleras längs banan mellan provpunkterna (var 2 m) – annars går bilen "i trappor" i backarna
    if (bi >= 0) { // projicera på segmentet mellan provpunkten och grannen åt rätt håll (samma segment oavsett vilken punkt som är närmast)
      const fw = (x - bx) * trk.TX[bi] + (z - bz) * trk.TZ[bi] >= 0, i0 = fw ? bi : w(bi - 1), i1 = w(i0 + 1);
      // läget mellan två "snittplan" (vinkelräta mot banan i varje provpunkt) – kontinuerligt även i kurvor och vid sidan av mittlinjen
      const a0 = (x - X[i0]) * trk.TX[i0] + (z - Z[i0]) * trk.TZ[i0], a1 = (x - X[i1]) * trk.TX[i1] + (z - Z[i1]) * trk.TZ[i1], t = Math.max(0, Math.min(1, a0 / ((a0 - a1) || 1e-6)));
      by = Y[i0] + (Y[i1] - Y[i0]) * t; }
    let h;
    if (bd <= 0) h = by;
    else { const r = Math.hypot(x - cx, z - cz), far = Math.max(0, r - ext * 0.62 - 60);
      const wild = H0(x, z) + noise(x, z) * 0.9 + Math.min(95, far * far * 0.0011) * (0.55 + 0.45 * Math.sin(Math.atan2(z - cz, x - cx) * 3 + waves[0][2]) ** 2);
      if (bd > 1e8) h = wild;
      else { const t = Math.min(1, Math.max(0, (bd - 2) / 30)), s = t * t * (3 - 2 * t); h = by + (wild - by) * s;
        const bb = (bd - verge - 1.4) / (bd < verge + 1.4 ? 1.0 : 2.6); h += bermH * Math.exp(-bb * bb); } }
    if (out) { out.d = bd; out.h = h; }
    return h; };
  return trk;
}
