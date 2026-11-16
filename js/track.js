// Bangeometri: sluten mittlinje samplad var 2:a meter, variabel bredd, blandat underlag (grus/asfalt)
// samt autentisk Sakkolenkki / Lisälenkki för bl.a. Tammisaari (Grabbskogin Rata) och Rantasalmi (RUA).
import { TRACKS, SURF } from './data.js';

const DS = 2;
const cache = {};

export function getTrack(id) {
  if (cache[id]) return cache[id];
  const def = TRACKS.find(t => t.id === id) || TRACKS[0];
  return (cache[id] = build(def));
}

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function build(def) {
  const M = 1440, raw = [], rawW = [], rawS = [];
  if (def.waypoints) {
    const wp = def.waypoints, K = wp.length;
    for (let j = 0; j < M; j++) {
      const u = (j / M) * K, k = Math.floor(u), t = u - k;
      const p0 = wp[(k - 1 + K) % K], p1 = wp[k % K], p2 = wp[(k + 1) % K], p3 = wp[(k + 2) % K];
      const x = catmullRom(p0[0], p1[0], p2[0], p3[0], t);
      const z = catmullRom(p0[1], p1[1], p2[1], p3[1], t);
      let wMin = 10, wMax = 24;
      if (def.id === 'rantasalmi' || def.id === 'rantasalmi-is') { wMin = 12; wMax = 22; }
      else if (def.id === 'pieksamaki' || def.id === 'pieksamaki-is' || def.id === 'kouvola') { wMin = 12; wMax = 18; }
      else if (def.id === 'pihtipudas') { wMin = 12; wMax = 16; }
      else if (def.id === 'akaa') { wMin = 8; wMax = 16; }
      const w = Math.max(wMin, Math.min(wMax, catmullRom(p0[2] || def.width, p1[2] || def.width, p2[2] || def.width, p3[2] || def.width, t)));
      const sType = (t < 0.5 ? p1[3] : p2[3]) || def.surface;
      raw.push([x, z]); rawW.push(w); rawS.push(sType);
    }
  } else {
    const sh = def.shape;
    for (let j = 0; j < M; j++) {
      const th = j / M * Math.PI * 2; let r = 1;
      for (const [k, a, p] of sh.h) r += a * Math.cos(k * th + p);
      raw.push([Math.cos(th) * r * sh.R * sh.sx, Math.sin(th) * r * sh.R * sh.sz]);
      rawW.push(def.width); rawS.push(def.surface);
    }
  }

  // Omsampla med jämnt avstånd DS = 2 m
  let total = 0; const acc = [0];
  for (let j = 0; j < M; j++) {
    const a = raw[j], b = raw[(j + 1) % M];
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
    acc.push(total);
  }
  const n = Math.round(total / DS), ds = total / n;
  let X = new Float32Array(n), Z = new Float32Array(n), HW = new Float32Array(n), SArr = new Array(n);
  let jj = 0;
  for (let i = 0; i < n; i++) {
    const d = i * ds; while (acc[jj + 1] < d && jj < M - 1) jj++;
    const seg = Math.max(1e-6, acc[jj + 1] - acc[jj]);
    const t = (d - acc[jj]) / seg, a = raw[jj], b = raw[(jj + 1) % M];
    X[i] = a[0] + (b[0] - a[0]) * t;
    Z[i] = a[1] + (b[1] - a[1]) * t;
    HW[i] = (rawW[jj] + (rawW[(jj + 1) % M] - rawW[jj]) * t) * 0.5;
    SArr[i] = t < 0.5 ? rawS[jj] : rawS[(jj + 1) % M];
  }

  const w = i => ((i % n) + n) % n;
  const curv = (X, Z) => {
    const K = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = w(i - 2), b = w(i + 2);
      const h1 = Math.atan2(Z[i] - Z[a], X[i] - X[a]), h2 = Math.atan2(Z[b] - Z[i], X[b] - X[i]);
      let dh = h2 - h1;
      while (dh > Math.PI) dh -= 2 * Math.PI;
      while (dh < -Math.PI) dh += 2 * Math.PI;
      K[i] = dh / (2 * ds);
    }
    return K;
  };
  let K = curv(X, Z);

  // För harmoniska banor utan fasta waypoints roteras startlinjen till rakaste partiet
  if (!def.waypoints) {
    let best = 0, bestV = 1e9;
    for (let i = 0; i < n; i++) {
      let m = 0;
      for (let q = -20; q <= 45; q++) m = Math.max(m, Math.abs(K[w(i + q)]));
      if (m < bestV) { bestV = m; best = i; }
    }
    const rot = A => { const B = new Float32Array(n); for (let i = 0; i < n; i++) B[i] = A[w(i + best)]; return B; };
    const rotArr = A => { const B = new Array(n); for (let i = 0; i < n; i++) B[i] = A[w(i + best)]; return B; };
    X = rot(X); Z = rot(Z); K = rot(K); HW = rot(HW); SArr = rotArr(SArr);
  }

  const TX = new Float32Array(n), TZ = new Float32Array(n), NX = new Float32Array(n), NZ = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = w(i - 1), b = w(i + 1);
    const dx = X[b] - X[a], dz = Z[b] - Z[a], l = Math.hypot(dx, dz) || 1;
    TX[i] = dx / l; TZ[i] = dz / l; NX[i] = -TZ[i]; NZ[i] = TX[i];
  }
  const outSign = (X[0] * NX[0] + Z[0] * NZ[0]) > 0 ? 1 : -1;
  const hw = def.width / 2;
  const hwAt = i => HW[w(Math.round(i))];
  const surfTypeAt = i => SArr[w(Math.round(i))] || def.surface;
  const surfAt = i => SURF[surfTypeAt(i)] || SURF[def.surface];

  // Sakkolenkki / Lisälenkki
  let joker;
  if (def.customJoker) {
    const cj = def.customJoker;
    const i1 = Math.round(cj.startFrac * n), i2 = Math.round(cj.endFrac * n), JL = i2 - i1;
    joker = { i1, i2, JL, mid: i1 + (JL >> 1), side: cj.side, D: cj.D, w: cj.w, uShape: !!cj.uShape, skew: cj.skew || 0 };
  } else {
    const JL = 46, D = 17, jw = 7.5;
    let ji = -1, jv = 1e9;
    for (let i = 45; i < n - JL - 40; i++) {
      let m = 0;
      for (let q = -6; q <= JL + 6; q++) m = Math.max(m, Math.abs(K[i + q]));
      if (m < jv) { jv = m; ji = i; }
    }
    joker = { i1: ji, i2: ji + JL, JL, mid: ji + (JL >> 1), side: outSign, D, w: jw, uShape: false, skew: 0 };
  }

  const bulge = i => {
    const ii = w(Math.round(i));
    if (ii <= joker.i1 || ii >= joker.i2) return 0;
    let t = (ii - joker.i1) / joker.JL;
    if (joker.skew) t = Math.pow(t, 1 + joker.skew);
    if (joker.uShape) {
      // Djup U-formad Sakkolenkki (Rantasalmi runt post 3)
      const s = Math.sin(Math.PI * t);
      return joker.side * joker.D * Math.pow(s, 1.35);
    }
    return joker.side * joker.D * 0.5 * (1 - Math.cos(2 * Math.PI * t));
  };
  const bulgeF = f => { const i = Math.floor(f), t = f - i; return bulge(i) * (1 - t) + bulge(i + 1) * t; };

  // Beräkna sakkolenkkins verkliga längd samt asfaltlängd och breddintervall
  let jLen = 0, mainJLen = 0;
  for (let i = joker.i1; i < joker.i2; i++) {
    const b0 = bulge(i), b1 = bulge(i + 1);
    const x0 = X[i] + NX[i] * b0, z0 = Z[i] + NZ[i] * b0;
    const x1 = X[w(i + 1)] + NX[w(i + 1)] * b1, z1 = Z[w(i + 1)] + NZ[w(i + 1)] * b1;
    jLen += Math.hypot(x1 - x0, z1 - z0);
    mainJLen += ds;
  }
  let asphaltLoopM = 0, minW = 999, maxW = 0;
  for (let i = 0; i < n; i++) {
    if (SArr[i] === 'asfalt') asphaltLoopM += ds;
    const wi = HW[i] * 2;
    if (wi < minW) minW = wi;
    if (wi > maxW) maxW = wi;
  }
  const chuteAsphaltM = def.startChute && def.startChute.surface === 'asfalt'
    ? Math.hypot(def.startChute.x1 - def.startChute.x0, def.startChute.z1 - def.startChute.z0)
    : 0;
  // För Rantasalmi: 2-varvs heat innehåller exakt 235 m kestopäällyste (startområde + 2×S-kurva)
  const asphalt2Lap = def.id === 'rantasalmi' ? 235 : Math.round(chuteAsphaltM + asphaltLoopM * 2);

  const surf = SURF[def.surface];
  const trk = {
    id: def.id, name: def.name, addr: def.addr || '', info: def.info || [],
    surface: def.surface, surf, surfAt, surfTypeAt,
    winter: def.surface === 'is', n, ds, len: total, hw, hwAt, HW, SArr,
    minWidth: Math.round(minW * 10) / 10, maxWidth: Math.round(maxW * 10) / 10,
    asphaltLoopM: Math.round(asphaltLoopM), asphalt2Lap,
    verge: 4.5, X, Z, TX, TZ, NX, NZ, K, joker, bulge, bulgeF, outSign, w,
    lenJoker: Math.round(total - mainJLen + jLen),
    startChute: def.startChute || null,
    finishIdx: def.finishFrac ? w(Math.round(def.finishFrac * n)) : 0,
    posts: def.posts || [],
    buildings: def.buildings || [],
  };

  // Närmaste punkt runt ett tips-index; ger index med bråkdel och signerat sidoavstånd
  trk.locate = (x, z, hint, span = 18) => {
    let bi = w(hint), bd = 1e12;
    for (let q = -span; q <= span; q++) {
      const i = w(hint + q);
      const dx = x - X[i], dz = z - Z[i], d = dx * dx + dz * dz;
      if (d < bd) { bd = d; bi = i; }
    }
    const dx = x - X[bi], dz = z - Z[bi];
    return { i: bi, f: (dx * TX[bi] + dz * TZ[bi]) / ds, lat: dx * NX[bi] + dz * NZ[bi] };
  };
  trk.locateFull = (x, z) => {
    let bi = 0, bd = 1e12;
    for (let i = 0; i < n; i += 2) {
      const dx = x - X[i], dz = z - Z[i], d = dx * dx + dz * dz;
      if (d < bd) { bd = d; bi = i; }
    }
    return trk.locate(x, z, bi, 8);
  };

  // Gränser i sidled (höger +, vänster −) inklusive variabel banbredd och lisälenkki
  trk.limits = i => {
    const hwi = hwAt(i), b = bulge(i);
    let r = hwi, l = -hwi;
    if (b > 0) r = Math.max(r, b + joker.w / 2);
    else if (b < 0) l = Math.min(l, b - joker.w / 2);
    return [l, r];
  };

  // På körbar yta? (Eget huvudspår ELLER på lisälenkkin; ön emellan är gräs/grusvall!)
  trk.onSurface = (i, lat) => {
    const hwi = hwAt(i);
    if (Math.abs(lat) <= hwi) return true;
    const b = bulge(i);
    return b !== 0 && Math.abs(lat - b) <= joker.w / 2 + 0.35;
  };

  trk.point = (f, lat = 0) => {
    const i = w(Math.floor(f)), j = w(i + 1), t = f - Math.floor(f);
    const x = X[i] + (X[j] - X[i]) * t, z = Z[i] + (Z[j] - Z[i]) * t;
    const nx = NX[i] + (NX[j] - NX[i]) * t, nz = NZ[i] + (NZ[j] - NZ[i]) * t;
    return [x + nx * lat, z + nz * lat, Math.atan2(TZ[i], TX[i])];
  };

  // Fartprofil för AI: tar hänsyn till både kurvradie OCH lokalt underlag (asfalt vs grus!)
  trk.profile = (aLat, aBrake, vMax) => {
    const V = new Float32Array(n);
    const baseMu = surf.mu;
    for (let i = 0; i < n; i++) {
      let k = 0;
      for (let q = -3; q <= 3; q++) k += Math.abs(K[w(i + q)]);
      k /= 7;
      const localScale = surfAt(i).mu / baseMu;
      V[i] = Math.min(vMax, Math.sqrt((aLat * localScale) / Math.max(k * 0.74, 1e-4)));
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let i = n - 1; i >= 0; i--) {
        const nx = V[w(i + 1)];
        const localScale = surfAt(i).mu / baseMu;
        V[i] = Math.min(V[i], Math.sqrt(nx * nx + 2 * (aBrake * localScale) * ds));
      }
    }
    return V;
  };

  // Idealspår: dra in mot kurvans insida inom den lokala banbredden
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let k = 0;
    for (let q = -8; q <= 8; q++) k += K[w(i + q)];
    k /= 17;
    const maxLat = hwAt(i) - 2.4;
    L[i] = Math.max(-maxLat, Math.min(maxLat, k * 190));
  }
  trk.line = L;
  return trk;
}

// Kontroll som kan köras i Node: längd, bredd, asfalt, minsta radie och separation
export function checkTrack(id) {
  const t = getTrack(id);
  let minR = 1e9, minSep = 1e9;
  for (let i = 0; i < t.n; i++) {
    const k = Math.abs(t.K[i]);
    if (k > 0) minR = Math.min(minR, 1 / k);
    for (let j = i + 25; j < t.n; j += 2) {
      if (Math.min(j - i, t.n - (j - i)) <= 25) continue;
      const d = Math.hypot(t.X[i] - t.X[j], t.Z[i] - t.Z[j]);
      if (d < minSep) minSep = d;
    }
  }
  let jSep = 1e9; const j = t.joker;
  for (let i = j.i1; i <= j.i2; i++) {
    const b = t.bulge(i), x = t.X[i] + t.NX[i] * b, z = t.Z[i] + t.NZ[i] * b;
    for (let q = 0; q < t.n; q++) {
      if (q > j.i1 - 22 && q < j.i2 + 22) continue;
      jSep = Math.min(jSep, Math.hypot(x - t.X[q], z - t.Z[q]));
    }
  }
  return {
    id, name: t.name, len: Math.round(t.len), lenJoker: t.lenJoker,
    minW: t.minWidth, maxW: t.maxWidth, asphaltLoopM: t.asphaltLoopM, asphalt2Lap: t.asphalt2Lap,
    minR: +minR.toFixed(1), minSep: +minSep.toFixed(1), jSep: +jSep.toFixed(1), joker: [j.i1, j.i2], n: t.n,
  };
}
