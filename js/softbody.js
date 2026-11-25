// Mjukkroppsfysik (BeamNG-inspirerad) för karossen: ett nät av noder och balkar ("node-beam") i bilens egna koordinater
// (x framåt, y upp, z åt sidan). Smällar ger noderna fart, balkarna fjädrar emot och böjs PERMANENT när de töjs över
// sträckgränsen (plastisk deformation). Bilens grafik deformeras efter nodernas förskjutning, och deformationen kring
// hjulen och motorrummet påverkar bilen mekaniskt (styrning drar, hjulinställning, kylare, motor).
// Ren logik utan DOM/three.js – testas i node (tests/selftest.mjs).

const NX = 6, NY = 2, NZ = 3;

export class SoftBody {
  constructor(halfL = 2.2, halfW = 0.86, y0 = 0.32, y1 = 1.18) {
    this.hl = halfL; this.hw = halfW; this.y0 = y0; this.y1 = y1;
    const n = NX * NY * NZ; this.n = n;
    this.rest = new Float32Array(n * 3); this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.pin = new Uint8Array(n);
    const id = (i, j, k) => (i * NY + j) * NZ + k; this.id = id;
    for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) for (let k = 0; k < NZ; k++) {
      const q = id(i, j, k) * 3; this.rest[q] = -halfL + 2 * halfL * i / (NX - 1); this.rest[q + 1] = j ? y1 : y0; this.rest[q + 2] = -halfW + 2 * halfW * k / (NZ - 1);
      // chassit (bottenbalkarna mellan hjulen) är styvt fäst – front, bak, sidor och tak kan tryckas in
      if (j === 0 && ((k === 1 && i >= 1 && i <= NX - 2) || i === 2 || i === 3)) this.pin[id(i, j, k)] = 1;
    }
    this.p.set(this.rest);
    const B = [];
    for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) for (let k = 0; k < NZ; k++)
      for (let di = 0; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (let dk = -1; dk <= 1; dk++) {
        if (!di && (dj < 0 || (!dj && dk <= 0))) continue; // varje par en gång
        const i2 = i + di, j2 = j + dj, k2 = k + dk; if (i2 >= NX || j2 < 0 || j2 >= NY || k2 < 0 || k2 >= NZ) continue;
        B.push(id(i, j, k), id(i2, j2, k2));
      }
    this.bA = Int32Array.from(B.filter((_, x) => x % 2 === 0)); this.bB = Int32Array.from(B.filter((_, x) => x % 2 === 1));
    this.nb = this.bA.length; this.L = new Float32Array(this.nb); this.L0 = new Float32Array(this.nb);
    for (let b = 0; b < this.nb; b++) this.L[b] = this.L0[b] = this.dist(this.rest, this.bA[b], this.bB[b]);
    this.k = 1200; this.damp = 3; this.yieldS = 0.01; this.awake = 0; this.ver = 0; this.energy = 0;
  }
  dist(P, a, b) { const x = P[b * 3] - P[a * 3], y = P[b * 3 + 1] - P[a * 3 + 1], z = P[b * 3 + 2] - P[a * 3 + 2]; return Math.hypot(x, y, z); }

  // Smäll: kontaktpunkt i riktningen (ux, uz) från bilens mitt (på karossens kant), hastighet in i bilen speed (m/s)
  impact(ux, uz, speed, y = 0.7) {
    const t = Math.min(this.hl / Math.max(1e-3, Math.abs(ux)), this.hw / Math.max(1e-3, Math.abs(uz))), px = ux * t, pz = uz * t, R = 0.75 + Math.min(0.6, speed * 0.04);
    for (let a = 0; a < this.n; a++) { if (this.pin[a]) continue; const q = a * 3, d = Math.hypot(this.p[q] - px, (this.p[q + 1] - y) * 0.7, this.p[q + 2] - pz); if (d >= R) continue;
      const f = (1 - d / R) ** 1.5 * Math.min(speed, 15) * 1.6; this.v[q] -= ux * f; this.v[q + 2] -= uz * f; this.v[q + 1] -= f * 0.1; }
    this.awake = 1.2;
  }

  step(dt) {
    if (this.awake <= 0) return false; this.awake -= dt;
    const P = this.p, V = this.v, R = this.rest, k = this.k, c = this.damp, sub = 2, h = dt / sub;
    for (let s = 0; s < sub; s++) {
      for (let b = 0; b < this.nb; b++) {
        const a = this.bA[b] * 3, e = this.bB[b] * 3, dx = P[e] - P[a], dy = P[e + 1] - P[a + 1], dz = P[e + 2] - P[a + 2], len = Math.hypot(dx, dy, dz) || 1e-6;
        const ux = dx / len, uy = dy / len, uz = dz / len, L = this.L[b], strain = (len - L) / this.L0[b];
        if (Math.abs(strain) > this.yieldS) { // plastisk deformation: balken får en ny vilolängd
          const nl = L + (len - L) * 0.35 * (1 - this.yieldS / Math.abs(strain)); this.L[b] = Math.max(this.L0[b] * 0.4, Math.min(this.L0[b] * 1.4, nl)); }
        const rv = (V[e] - V[a]) * ux + (V[e + 1] - V[a + 1]) * uy + (V[e + 2] - V[a + 2]) * uz, F = (k * (len - this.L[b]) / this.L0[b] + c * rv) * h;
        V[a] += ux * F; V[a + 1] += uy * F; V[a + 2] += uz * F; V[e] -= ux * F; V[e + 1] -= uy * F; V[e + 2] -= uz * F;
      }
      let en = 0;
      for (let a = 0; a < this.n; a++) { const q = a * 3;
        if (this.pin[a]) { V[q] = V[q + 1] = V[q + 2] = 0; P[q] = R[q]; P[q + 1] = R[q + 1]; P[q + 2] = R[q + 2]; continue; }
        V[q] *= 0.995; V[q + 1] *= 0.995; V[q + 2] *= 0.995; P[q] += V[q] * h; P[q + 1] += V[q + 1] * h; P[q + 2] += V[q + 2] * h; en += V[q] * V[q] + V[q + 1] * V[q + 1] + V[q + 2] * V[q + 2]; }
      this.energy = en;
    }
    if (this.energy < 1e-4 && this.awake < 0.9) this.awake = 0; // vila: inget räknas förrän nästa smäll
    this.ver++; return true;
  }

  // Förskjutning i en punkt (trilinjär interpolation mellan noderna)
  disp(x, y, z, out) {
    const fx = Math.min(NX - 1.0001, Math.max(0, (x + this.hl) / (2 * this.hl) * (NX - 1))), fy = Math.min(NY - 1.0001, Math.max(0, (y - this.y0) / (this.y1 - this.y0) * (NY - 1))), fz = Math.min(NZ - 1.0001, Math.max(0, (z + this.hw) / (2 * this.hw) * (NZ - 1)));
    const i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz), a = fx - i, b = fy - j, c = fz - k; out[0] = out[1] = out[2] = 0;
    for (let di = 0; di < 2; di++) for (let dj = 0; dj < 2; dj++) for (let dk = 0; dk < 2; dk++) {
      const w = (di ? a : 1 - a) * (dj ? b : 1 - b) * (dk ? c : 1 - c); if (!w) continue; const q = this.id(i + di, j + dj, k + dk) * 3;
      out[0] += (this.p[q] - this.rest[q]) * w; out[1] += (this.p[q + 1] - this.rest[q + 1]) * w; out[2] += (this.p[q + 2] - this.rest[q + 2]) * w; }
    return out;
  }

  // Mekaniska följder: intryckning av front/bak och förskjutning kring varje hjulhörn (m)
  state() {
    const o = [0, 0, 0], d = (x, z) => this.disp(x, (this.y0 + this.y1) / 2, z, o), hx = this.hl * 0.62, wz = this.hw * 0.95;
    const fl = d(hx, wz).slice(), fr = d(hx, -wz).slice(), rl = d(-hx, wz).slice(), rr = d(-hx, -wz).slice(), fc = d(this.hl, 0).slice(), rc = d(-this.hl, 0).slice();
    return { front: Math.max(0, -fc[0]), rear: Math.max(0, rc[0]), fl, fr, rl, rr,
      // hjulhörn som tryckts in åt sidan → hjulet står snett. Positiv = drar åt vänster (z+)
      toeF: (fl[2] + fr[2]) * 0.5 + (fl[0] - fr[0]) * 0.3, toeR: (rl[2] + rr[2]) * 0.5 + (rl[0] - rr[0]) * 0.3 };
  }
}
