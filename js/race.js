// Heatet: körfysik, AI, kollisioner, lisälenkki, varningskoder (A1–B9), Vi/Li/K/KA,
// autentisk 3D In-Car kupévy med roterande mockaratt samt Pro Telemetri-HUD inspirerad av referensbilden.
import { getTrack } from './track.js';
import { M4, cockpitMesh, steerWheelMesh, pendantMesh } from './gl.js';
import { View3 } from './view3.js';
import { ensureTerrain } from './terrain.js';
import { Controls } from './input.js';
import { torqueTable, engineAt, fmt } from './engine.js';

const G = 9.81, DT = 1 / 240;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
export const fmtTime = t => { if (!isFinite(t)) return '–'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); };
const fmtTime3 = t => { if (!isFinite(t)) return '--:--,---'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(3).replace('.', ','); };

export function makeCar(def, trk, slot, isPlayer, gridRows = 2, totalCars = 6) {
  const s = def.spec;
  let row, col, back, lat;
  if (gridRows === 1) {
    row = 0; col = slot;
    back = 2.5;
    const span = Math.min((trk.hwAt ? trk.hwAt(0) : trk.hw) * 1.55, 11.5);
    lat = totalCars > 1 ? ((slot / (totalCars - 1)) - 0.5) * span : 0;
  } else {
    row = Math.floor(slot / 3); col = slot % 3;
    back = 2.5 + row * 3.5; // 7 m mellan främre och bakre ledet!
    lat = (col - 1) * 3.3;
  }
  const [x, z, h] = trk.point(trk.n - back, lat);
  const tq = torqueTable(s);
  const cool = [], marg = []; for (let r = 0; r <= s.redline + 500; r += 500) { const e = engineAt(s, Math.max(r, 800)); cool.push(e.qCool); marg.push(e.margin); }
  let upRpm = s.redline - 120; { let bp = 0; for (let r = 2000; r <= s.redline; r += 250) { const p = tq(r) * r; if (p > bp) { bp = p; upRpm = Math.min(s.redline - 120, r + 350); } } }
  return {
    name: def.name, paint: def.paint, bw: def.bw || 'wb', isPlayer, spec: s, tq, cool, marg, upRpm,
    x, z, h, vx: 0, vy: 0, r: 0, ax: 0, ay: 0, rpm: s.idle, gear: 1, thr: 0, brk: 0, steer: 0, hb: 0,
    i: trk.w(Math.round(trk.n - back)), pf: trk.n - back, lat, prog: -back, onSurf: true,
    jokerDone: false, coneDown: false, jump: false, retired: false, kaato: false,
    sanction: '', sanctionT: Infinity, warnCount: 0,
    finished: false, finishT: 0, flag: '', dmg: 0, temp: 82, exhaustLoose: false,
    fuelKg: 18.5, tireWearF: 0, tireWearR: 0, tireTemp: [55, 55, 52, 52], brakeTemp: 60,
    secT: 0, curSec: 0, sectors: [null, null, null],
    pow: isPlayer ? 1 : Math.max(0.7, Math.min(1.04, 0.4 + 0.6 * (def.skill || 1))),
    shiftT: 0, rev: false, slip: 0, radLeak: false, aids: isPlayer ? def.aids : { abs: 1, tc: 1, auto: 1 }, skill: def.skill || 1, slot,
    ai: isPlayer ? null : { jokerLap: 0, off: 0, stuck: 0, prof: null }, lastLapT: 0, bestLap: Infinity, laps: [],
  };
}

export function phys(c, dt, trk) {
  const s = c.spec, surf = trk.surfAt ? trk.surfAt(c.i) : trk.surf;
  const L = s.wb, a = L * (1 - s.front), b = L * s.front, m = s.mass, fwd = s.drv === 'fwd', awd = s.drv === 'awd';
  const st = trk.surfTypeAt ? trk.surfTypeAt(c.i) : trk.surface;
  // lätta bilar har en liten fördel i kurvorna (lastkänslighet), skador försämrar väghållningen
  const mu = surf.mu * s.mu * (c.gripF || 1) * (c.onSurf ? 1 : 0.72 + 0.12 * s.susp) * (s.surfK ? s.surfK[st] || 1 : 1) * Math.pow(1150 / m, 0.12) * (1 - Math.max(0, (c.dmg || 0) - 30) * 0.0025), crr = c.onSurf ? surf.crr : 0.09 - 0.03 * s.susp;
  const v = Math.hypot(c.vx, c.vy), delta = c.steer * 0.52 * (s.steerK || 1) * (1 - Math.max(0, (c.dmg || 0) - 50) * 0.002) / (1 + v * 0.035);
  if (c.rev) {
    c.vx += (-4.5 - c.vx) * Math.min(1, 2.2 * dt); c.vy *= 1 - Math.min(1, 8 * dt); c.r = c.vx * Math.tan(delta) / L; c.rpm = s.idle + 1200; c.slip = 0;
  } else {
    let Fzf = m * G * s.front - m * c.ax * 0.5 / L, Fzr = m * G * (1 - s.front) + m * c.ax * 0.5 / L;
    Fzf = Math.max(Fzf, m * G * 0.15); Fzr = Math.max(Fzr, m * G * 0.15);
    const vxs = Math.max(Math.abs(c.vx), 2.5);
    const af = Math.atan2(c.vy + a * c.r, vxs) - delta, ar = Math.atan2(c.vy - b * c.r, vxs);
    const shape = al => Math.sin(surf.C * Math.atan(surf.B * al));
    const gr = s.gears[c.gear - 1] * s.final, wheelRpm = Math.max(0, c.vx) / s.rw * 9.5493 * gr;
    let rpm = Math.max(wheelRpm, s.idle);
    if (c.gear === 1 && wheelRpm < 3000) rpm = Math.max(rpm, s.idle + c.thr * (Math.min(s.peakRpm * 0.85, 3800) - s.idle));
    let Fd = 0;
    const cl = c.clutch || 0;
    if (cl > 0.05) rpm = Math.max(rpm * (1 - cl), s.idle + c.thr * (s.redline - 400 - s.idle) * cl);
    if (c.shiftT > 0) c.shiftT -= dt;
    else if (rpm < s.redline) Fd = c.tq(rpm) * c.thr * c.pow * gr * s.eff / s.rw * (1 - cl);
    if (c.thr < 0.05 && c.vx > 1) Fd -= (0.97 + 0.15 * rpm / 1000) * 1e5 * s.Vd * 1e-3 / 12.566 * gr / s.rw * (1 - cl);
    const wk = trk.wetK ? (st === 'asfalt' ? trk.wetK[0] : trk.wetK[1]) : 1;
    const capF = mu * wk * Fzf * (s.muF || 1), capR = mu * wk * Fzr * (s.muR || 1), muE = mu * wk;
    // Differential. Öppen diff: i kurva avlastas innerhjulet och det spinner först → mindre drivkraft ut ur kurvan.
    // Svetsad diff (lukkoperä): båda hjulen drar alltid fullt, men axeln vill gå rakt och släpper plötsligt.
    const welded = !!s.trac, latUse = Math.min(1, Math.abs(c.vx * c.r) / (muE * G + 0.1));
    // Fyrhjulsdrift: båda axlarnas grepp kan användas för drivning (mittdiff fördelar ~40/60 och flyttar över kraft till axeln som greppar)
    const capD = awd ? (capF + capR) * (welded ? 1 : 1 - 0.2 * latUse) : (fwd ? capF : capR) * (welded ? 1 : 1 - 0.4 * latUse);
    let slip = 0, latD = 1;
    // antispinn: lämnar sidogrepp kvar på bakaxeln så bilen inte blir instabil på raksträckor
    if (c.aids.tc) { const nf = Math.abs(shape(af)), nr = Math.abs(shape(ar)), need = Math.abs(shape(fwd ? af : ar)), lim = awd ? 0.95 * capF * Math.sqrt(Math.max(0.08, 1 - 0.92 * nf * nf)) + 0.86 * capR * Math.sqrt(Math.max(0.05, 1 - 0.95 * nr * nr)) : capD * (fwd ? 0.97 : 0.94) * Math.sqrt(Math.max(0.08, 1 - 0.92 * need * need)); if (Fd > lim) Fd = lim; }
    // hjulspinn: på löst grus gräver däcket och tappar lite drivkraft, på asfalt/is mer; sidogreppet försvinner
    else if (Fd > capD) { slip = Math.min(2, Fd / capD - 1); Fd = capD * (st === 'grus' ? 0.97 - 0.03 * Math.min(1, slip) : 0.92 - 0.1 * Math.min(1, slip)); latD = 1 / (1 + (fwd ? 1.4 : 2.6) * slip); } // hjulspinn: glidfriktion < statisk, sidogreppet försvinner
    if (Fd < -capD) Fd = -capD;
    c.slip = slip;
    let Fbf = 0, Fbr = 0, lockF = false, lockR = false; const sg = c.vx >= 0 ? 1 : -1;
    if (c.brk > 0) { const Fb = c.brk * 1.12 * m * G * s.brake; Fbf = Fb * s.bias; Fbr = Fb * (1 - s.bias);
      if (Fbf > capF) { if (c.aids.abs) Fbf = capF * 0.96; else { lockF = true; Fbf = capF * 0.82; } }
      const prop = capR * (fwd ? 0.55 : 0.85); // lastkännande bromskraftsfördelare: framhjulsdrivna bilar är extra bakbromsade-snåla → drar rakt
      if (Fbr > prop && !c.aids.abs) Fbr = prop;
      const ebd = capR * (fwd ? 0.45 : 0.6); if (c.aids.abs && Fbr > ebd) Fbr = ebd; // ABS/EBD håller bakhjulen under låsgränsen så bilen är styrbar
      if (Fbr > capR) { if (c.aids.abs) Fbr = capR * 0.8; else { lockR = true; Fbr = capR * 0.82; } } }
    if (c.hb) { lockR = true; Fbr = capR * 0.85; }
    c.lock = lockF || lockR;
    let dF = fwd ? Fd : 0, dR = fwd ? 0 : Fd;
    // aktiv mittdiff: mer kraft till axeln som har greppmarginal kvar
    if (awd) { const sF = capF * (1 - 0.9 * Math.abs(shape(af))) + 1, sR = capR * (1 - 0.9 * Math.abs(shape(ar))) + 1, kF = Fd < 0 ? 0.7 : Math.min(0.75, 0.45 * 2 * sF / (sF + sR)); dF = Fd * kF; dR = Fd * (1 - kF); const rMax = capR * 0.8; if (Math.abs(dR) > rMax) { dF += dR - Math.sign(dR) * rMax; dR = Math.sign(dR) * rMax; } if (Math.abs(dF) > capF) { dR += dF - Math.sign(dF) * capF; dF = Math.sign(dF) * capF; } }
    const Fxf = dF - sg * Fbf, Fxr = dR - sg * Fbr;
    const latF = (al, cap, Fx, sc) => -cap * Math.sqrt(Math.max(0.12, 1 - (Fx / cap) ** 2)) * sc * shape(al);
    // Svetsad diff på drivaxeln: gas eller motorbroms mitt i kurvan gör att båda hjulen tappar sidogrepp samtidigt
    let wl = 1; if (welded && !awd && Math.abs(c.vx) > 4) { const u = Math.abs(fwd ? Fxf : Fxr) / Math.max(1, fwd ? capF : capR); wl = 1 / (1 + 2.0 * u * u * (0.25 + latUse)); }
    const Fyf = latF(af, capF, Fxf, (fwd || awd ? latD : 1) * (fwd ? wl : 1) * (lockF ? 0.3 : 1));
    const Fyr = latF(ar, capR, Fxr, (fwd ? 1 : latD * wl) * (lockR ? 0.35 : 1) * 1.05);
    const drag = 0.6 * s.CdA * c.vx * Math.abs(c.vx) + (Math.abs(c.vx) > 0.2 ? crr * m * G * sg : 0);
    const cd = Math.cos(delta), sd = Math.sin(delta);
    const axn = (Fxf * cd - Fyf * sd + Fxr - drag) / m, ayn = (Fyf * cd + Fxf * sd + Fyr) / m;
    let Mz = a * (Fyf * cd + Fxf * sd) - b * Fyr;
    if (welded && !fwd && !awd) { // låst axel motverkar girning så länge hjulen greppar (understyr in i kurvan) – sedan släpper det
      const tw = 0.74, need = Math.abs(c.r) * tw / Math.max(3, Math.abs(c.vx)), grip = Math.max(0, capR - Math.abs(Fxr)) * 0.5;
      Mz -= Math.sign(c.r) * Math.min(1, need / 0.05) * grip * tw * 0.6;
    }
    if (fwd && Fbf > 0 && !c.hb) Mz -= c.r * m * 0.9 * Math.min(1, Fbf / (m * G * 0.4)); // inbromsning med framhjulsdrift: bilen vill gå rakt
    c.vx += (axn + c.vy * c.r) * dt; c.vy += (ayn - c.vx * c.r) * dt; c.r += Mz / (m * L * L * 0.36) * dt;
    c.ax += (axn - c.ax) * Math.min(1, 12 * dt);
    c.ay += (ayn - c.ay) * Math.min(1, 12 * dt);
    if (Math.abs(c.vx) < 2.5) { c.vy *= 1 - Math.min(1, 6 * dt); c.r *= 1 - Math.min(1, 3 * dt); }
    if (c.brk > 0.1 && Math.abs(c.vx) < 0.35 && c.thr < 0.05) c.vx = 0;
    c.rpm = Math.min(s.redline + 60, rpm * (1 + Math.min(slip, 0.6) * 0.45));
    // växling
    if (c.aids.auto && c.shiftT <= 0) {
      if (c.gear < s.gears.length && wheelRpm > c.upRpm && slip < 0.3) { c.gear++; c.shiftT = s.shift; }
      else if (c.gear > 1 && (wheelRpm < s.idle * 1.5 || (c.thr > 0.6 || c.brk > 0.2) && wheelRpm * s.gears[c.gear - 2] / s.gears[c.gear - 1] < c.upRpm * (0.55 + 0.25 * c.thr))) { c.gear--; c.shiftT = s.shift * 0.6; } // växlar bara ner vid gaspådrag, inbromsning eller för låga varv
    }
  }
  const ch = Math.cos(c.h), sh = Math.sin(c.h);
  c.x += (c.vx * ch - c.vy * sh) * dt; c.z += (c.vx * sh + c.vy * ch) * dt; c.h += c.r * dt;
}

export function trackStep(c, trk, t, useJoker = true) {
  const n = trk.n, loc = trk.locate(c.x, c.z, c.i), nf = loc.i + loc.f;
  let d = nf - c.pf; if (d < -n / 2) d += n; else if (d > n / 2) d -= n;
  const prevIdx = c.i; c.prog += d; c.pf = nf; c.i = loc.i; c.lat = loc.lat;
  c.onSurf = trk.onSurface(loc.i, loc.lat);
  const j = trk.joker;
  c.inJoker = useJoker && loc.i >= j.i1 && loc.i <= j.i2 && Math.abs(loc.lat - trk.bulge(loc.i)) < j.w / 2 + 1.5;
  if (useJoker && !c.jokerDone && prevIdx < j.mid && loc.i >= j.mid && loc.i - prevIdx < 12 && Math.abs(loc.lat - trk.bulge(j.mid)) < j.w / 2 + 1.4) {
    c.jokerDone = true; c.jokerT = t;
  }
  if (useJoker && c.isPlayer && !c.coneDown && loc.i >= j.i1 - 1 && loc.i <= j.i2 + 1) {
    for (const ci of [j.i1 + 1, j.i1 + 3, j.i2 - 3, j.i2 - 1]) {
      const hwi = trk.hwAt ? trk.hwAt(ci) : trk.hw;
      const cx = trk.X[ci] + trk.NX[ci] * (j.side * (hwi + 0.4));
      const cz = trk.Z[ci] + trk.NZ[ci] * (j.side * (hwi + 0.4));
      if (Math.hypot(c.x - cx, c.z - cz) < 0.95) {
        const v = Math.hypot(c.vx, c.vy);
        if (v > 4.0) { c.coneDown = true; c.coneEvent = 'down'; }
        else if (!c.coneTouchShown) { c.coneTouchShown = true; c.coneEvent = 'touch'; }
      }
    }
  }
  const [l, r] = trk.limits(loc.i), lo = l - trk.verge + 0.9, hi = r + trk.verge - 0.9;
  let hit = 0;
  if (loc.lat > hi || loc.lat < lo) {
    const sgn = loc.lat > hi ? 1 : -1, over = sgn > 0 ? loc.lat - hi : lo - loc.lat, nx = trk.NX[loc.i] * sgn, nz = trk.NZ[loc.i] * sgn;
    c.x -= nx * over; c.z -= nz * over;
    const ch = Math.cos(c.h), sh = Math.sin(c.h); let wx = c.vx * ch - c.vy * sh, wz = c.vx * sh + c.vy * ch; const vn = wx * nx + wz * nz;
    if (vn > 0) { wx -= 1.25 * vn * nx; wz -= 1.25 * vn * nz; wx *= 0.93; wz *= 0.93; c.vx = wx * ch + wz * sh; c.vy = -wx * sh + wz * ch; c.r *= 0.6; hit = vn; }
  }
  return hit;
}

export function collide(A, B) {
  let hit = 0;
  collide.front = ''; collide.type = '';
  for (const oa of [1.15, -1.15]) for (const ob of [1.15, -1.15]) {
    const ax = A.x + Math.cos(A.h) * oa, az = A.z + Math.sin(A.h) * oa, bx = B.x + Math.cos(B.h) * ob, bz = B.z + Math.sin(B.h) * ob;
    let dx = bx - ax, dz = bz - az; const d = Math.hypot(dx, dz), R = 1.9;
    if (d >= R || d < 1e-4) continue;
    dx /= d; dz /= d; const pen = (R - d) / 2; A.x -= dx * pen; A.z -= dz * pen; B.x += dx * pen; B.z += dz * pen;
    const wv = c => { const ch = Math.cos(c.h), sh = Math.sin(c.h); return [c.vx * ch - c.vy * sh, c.vx * sh + c.vy * ch]; };
    const va = wv(A), vb = wv(B), rel = (va[0] - vb[0]) * dx + (va[1] - vb[1]) * dz;
    if (rel <= 0) continue;
    const ma = A.spec.mass, mb = B.spec.mass, J = 1.3 * rel / (1 / ma + 1 / mb);
    const ap = (c, w, sgn, o, mm) => { w[0] += sgn * J / mm * dx; w[1] += sgn * J / mm * dz; const ch = Math.cos(c.h), sh = Math.sin(c.h);
      c.vx = w[0] * ch + w[1] * sh; c.vy = -w[0] * sh + w[1] * ch;
      const side = -sh * dx + ch * dz; c.r += sgn * o * side * J / (mm * c.spec.wb * c.spec.wb * 0.36) * 0.55; };
    ap(A, va, -1, oa, ma); ap(B, vb, 1, ob, mb);
    if (rel > hit) {
      hit = rel;
      if (oa > 0 && ob < 0) { collide.front = 'A'; collide.type = 'rear'; }
      else if (ob > 0 && oa < 0) { collide.front = 'B'; collide.type = 'rear'; }
      else { collide.front = Math.hypot(A.vx, A.vy) >= Math.hypot(B.vx, B.vy) ? 'A' : 'B'; collide.type = 'side'; }
    }
  }
  return hit;
}

export function aiDrive(c, race, dt) {
  const trk = race.trk, n = trk.n, ai = c.ai, j = trk.joker, v = Math.hypot(c.vx, c.vy);
  const lap = Math.floor(Math.max(0, c.prog) / n), idx = c.i;
  const wantJ = race.useJoker && !c.jokerDone && lap >= ai.jokerLap;
  const la = idx + 4 + Math.round(v * 0.32);
  const hwi = trk.hwAt ? trk.hwAt(idx) : trk.hw;
  const lineAt = q => {
    const qq = trk.w(q);
    if (wantJ && qq > j.i1 - 2 && qq < j.i2 + 2) return trk.bulge(qq);
    if (race.useJoker && qq > j.i1 - 12 && qq < j.i2 + 6) {
      return wantJ ? j.side * (hwi - 2.5) * (qq <= j.i1 ? 1 : 0.4) : trk.line[qq] * 0.4 - j.side * 1.2;
    }
    return trk.line[qq];
  };
  let target = 0, cap = 1e9;
  for (const o of race.cars) {
    if (o === c) continue;
    let dp = o.prog - c.prog; dp -= Math.round(dp / n) * n;
    if (dp > 0 && dp < 7) {
      const dl = o.lat - c.lat;
      if (Math.abs(dl) < 2.4) { target = dl > 0 ? -2.8 : 2.8; if (dp < 3.2 && Math.abs(dl) < 1.7) cap = Math.hypot(o.vx, o.vy) + 0.5 + (ai.agg || 0.8) * 1.2; }
    }
  }
  ai.off += (target - ai.off) * Math.min(1, 2.5 * dt);
  if (ai.noise) { ai.wob += ((Math.random() - 0.5) * 2 * ai.noise - ai.wob * 0.6) * dt * 3; }
  let off = lineAt(la) + ai.off;
  const lims = trk.limits(trk.w(la)); off = clamp(off, lims[0] + 1.6, lims[1] - 1.6);
  const [tx, tz] = trk.point(la, off);
  const err = wrapA(Math.atan2(tz - c.z, tx - c.x) - c.h);
  if (Math.abs(err) > 1.9 && v < 7) ai.back = 1; else if (Math.abs(err) < 0.9) ai.back = 0;
  if (ai.back) { c.rev = true; c.thr = 0; c.brk = 0; c.steer = err > 0 ? -1 : 1; return; }
  c.rev = false;
  const st = clamp(err * 2.4 + (ai.wob || 0), -1, 1);
  c.steer += clamp(st - c.steer, -7 * dt, 7 * dt);
  let vt = ai.prof[trk.w(idx + 2)];
  if (wantJ && idx < j.i2 - 4 && idx > j.i1 - 60) {
    const dist = Math.max(0, (j.i1 + 3 - idx) * trk.ds);
    const jFactor = j.uShape ? 0.58 : 0.85;
    vt = Math.min(vt, Math.sqrt((ai.vJ * jFactor) ** 2 + 2 * ai.aB * dist));
  }
  if (wantJ && idx >= j.i1 && idx <= j.i2 && j.uShape) vt = Math.min(vt, ai.vJ * 0.62);
  vt = Math.min(vt, cap);
  // starka bilar: AI:n doserar gasen i kurvor och när bilen glider (annars spinner/understyr den av banan)
  ai.pwr ??= c.tq(c.upRpm) * c.upRpm / 9549 / c.spec.mass;
  const thrK = clamp(1 - Math.abs(c.steer) * (0.45 + Math.min(0.4, ai.pwr * 1.1)), 0.2, 1) * clamp(1 - (Math.abs(Math.atan2(c.vy, Math.max(3, c.vx))) - (c.spec.drv === 'awd' ? 0.35 : 0.28)) * 3, 0.35, 1);
  const thr0 = c.thr, brk0 = c.brk;
  if (v < vt - 0.4) { c.thr = thrK * (ai.thrMax || 1); c.brk = 0; }
  else if (v > vt + 0.5) { c.thr = 0; c.brk = clamp((v - vt) / 2, 0.2, 1); }
  else { c.thr = clamp(0.035 / ai.pwr, 0.08, 0.35) * thrK; c.brk = 0; } // håll farten: mindre gas ju starkare bil
  c.thr = thr0 + clamp(c.thr - thr0, -4 * dt, 5 * dt); c.brk = brk0 + clamp(c.brk - brk0, -6 * dt, 4 * dt); // mjuka pedalrörelser (som en förare)
  if (v < 1.2 && race.t > 2) { ai.stuck += dt; if (ai.stuck > 2.5) { race.resetCar(c); ai.stuck = 0; } } else ai.stuck = 0;
}

export const CAM_NAMES = ['IN-CAR KUPÉ', 'HUVKAMERA', 'BAKOM NÄRA', 'BAKOM HÖG', 'FÖRSTAPERSON · FÖRARPLATS'];
export const DEFAULT_CAM = 4;

export class Race {
  constructor(host, cfg) {
    this.host = host; this.cfg = cfg; this.trk = getTrack(cfg.trackId); const trk = this.trk;
    this.useJoker = cfg.mode === 'time' ? false : (cfg.useJoker !== undefined ? cfg.useJoker : false);
    this.sideContact = cfg.sideContact !== undefined ? cfg.sideContact : true;
    this.gridRows = cfg.gridRows || 2;
    const totalCars = cfg.opps.length + 1;

    host.innerHTML = `<div class="race"><canvas class="race-cv"></canvas>
      <div class="hud gopro-clean" id="hHudRoot">
        <!-- ÖVRE RADEN: Leaderboard + Bränsle/Skada/Lisälenkki + 5 Startljus + Underlag/Minimap/Tider -->
        <div class="hud-row-top">
          <div class="hud-col-l">
            <div class="hud-card hud-lb" id="hLbCard">
              <div class="hud-lb-head">
                <div class="hud-lb-pos"><b id="hPos">1</b><span>/ ${totalCars}</span></div>
                <span class="hud-lb-lap">Varv <span id="hLap">1</span>/${cfg.laps}</span>
              </div>
              <div class="hud-lb-list" id="hOrder"></div>
              <div class="hud-lb-foot"><span id="hGapLbl">▲ Ledare</span><b id="hGapVal">0,0 s</b></div>
            </div>

            <div class="hud-card hud-statcard">
              <div class="hud-stat-hd"><span>BRÄNSLE & SKICK</span><b id="hFuelKg">18,5 kg</b></div>
              <div class="hud-bar-bg"><div class="hud-bar-fg" id="hHealthBar" style="width:100%"></div></div>
              <div style="display:flex;justify-content:space-between;color:#cbd5e1;font-size:.6rem">
                <span id="hDmgTxt">Skada 0 % · Kylare OK</span>
                <span id="hDbTxt">≤110 dB OK</span>
              </div>
              <div class="hud-stat-grid">
                <div><i class="hud-stat-dot" id="hDotF"></i>Däck fram <b id="hWearF">0 %</b></div>
                <div><i class="hud-stat-dot" id="hDotR"></i>bak <b id="hWearR">0 %</b></div>
              </div>
              <div style="display:flex;justify-content:space-between;color:#9ca3af;margin-top:4px;font-size:.6rem">
                <span>grepp <b id="hGripPct" style="color:#e5e7eb">100 / 100 %</b></span>
                <span id="hJokerMini" style="color:#facc15;font-weight:700">${this.useJoker ? 'Lisälenkki: KVAR' : 'Ingen lisälenkki'}</span>
              </div>
            </div>
          </div>

          <!-- MITTEN TOPP: 5 Startljus + Snabbknappar -->
          <div class="hud-col-c">
            <div class="hud-lights" id="hLights">${'<i></i>'.repeat(5)}</div>
            <div class="hud-card hud-top-btns">
              <button class="hud-mini-btn on" id="hCamBtn" title="Byt kamera (C)">🎥 FÖRSTAPERSON [C]</button>
              <button class="hud-mini-btn" id="hTeleBtn" title="Visa/dölj telemetri (T)">📊 TELEMETRI [T]</button>
              <button class="hud-mini-btn" id="hPause">☰ PAUS [P]</button>
            </div>
          </div>

          <!-- HÖGER TOPP: Underlag + Minimap & Tider -->
          <div class="hud-col-r">
            <div class="hud-card hud-surfcard">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <b id="hSurf" style="color:#f3f4f6">Grus (sora)</b>
                <span id="hWidth" style="color:#38bdf8;font-weight:700">12 m</span>
              </div>
              <div class="hud-bar-bg"><div class="hud-bar-fg" id="hMuBar" style="width:78%;background:#f59e0b"></div></div>
              <div style="display:flex;justify-content:space-between;font-size:.6rem;color:#9ca3af">
                <span>DÄCK</span>
                <b style="color:#fb7185">${trk.winter ? 'Piikkipyörät' : cfg.player.spec.rallyTire ? 'Rally / Slicks' : 'Gatgodkända'}</b>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:.6rem;color:#9ca3af;margin-top:2px">
                <span>BANTEMP</span>
                <b style="color:#e5e7eb">${trk.winter ? '-4 °C' : '22 °C'}</b>
              </div>
            </div>

            <div class="hud-mapcol">
              <div class="hud-card" style="padding:6px"><canvas id="hMap" width="175" height="108"></canvas></div>
              <div class="hud-card hud-timecard">
                <div class="hud-time-row"><span>TID</span><b class="big" id="hTime">0:00,000</b></div>
                <div class="hud-time-row"><span>DELTA</span><span id="hDelta">–</span></div>
                <div class="hud-time-row"><span>REKORD</span><span id="hRec" style="color:#38bdf8">${cfg.record ? fmtTime3(cfg.record) : '–'}</span></div>
                <div class="hud-time-row"><span>SENASTE</span><span id="hLastLap">--:--,---</span></div>
                <div class="hud-time-row" style="border-bottom:1px solid rgba(255,255,255,.1);padding-bottom:3px;margin-bottom:3px"><span>BÄST</span><span id="hBest" style="color:#c084fc">--:--,---</span></div>
                <div class="hud-sectors"><span id="hS1">S1 –</span><span id="hS2">S2 –</span><span id="hS3">S3 –</span></div>
                <div style="display:flex;justify-content:space-between;font-size:.55rem;color:#9ca3af;margin-top:4px"><span>BANA</span><span>${trk.name.split(' ')[0]} · 1013 hPa</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- MITTEN: Meddelandebanner + 360° Närhetsradar -->
        <div class="hud-center-wrap">
          <div class="hud-msg" id="hMsg"></div>
          <canvas id="hRadar" width="120" height="120"></canvas>
        </div>

        <!-- NEDRE RADEN: Motorn Just Nu (MEP) + In-Car Digital Rattdisplay + Växel/RPM/G-kraft -->
        <div>
          <div class="hud-row-bot">
            <!-- VÄNSTER BOTTEN: Motorn Just Nu (MEP-kedjan i realtid!) -->
            <div class="hud-card hud-mepcard">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <b style="font-size:.62rem;letter-spacing:.06em;color:#e5e7eb">▼ MOTORN JUST NU</b>
                <span id="hFuelBadge" style="font-size:.58rem;background:rgba(255,255,255,.1);padding:1px 6px;border-radius:4px;color:#facc15">${cfg.player.spec.fuel.short} · λ ${fmt(cfg.player.spec.lambda, 2)}</span>
              </div>
              <div class="hud-mep-row"><span>BMEP</span><div><i id="mBarBmep" style="width:50%;background:#34d399"></i></div><b id="mValBmep">0,0 bar</b></div>
              <div class="hud-mep-row"><span>ExMEP</span><div><i id="mBarExmep" style="width:40%;background:#fbbf24"></i></div><b id="mValExmep">0,0 bar</b></div>
              <div class="hud-mep-row"><span>HTMEP</span><div><i id="mBarHtmep" style="width:30%;background:#38bdf8"></i></div><b id="mValHtmep">0,0 bar</b></div>
              <div class="hud-mep-row"><span>FMEP</span><div><i id="mBarFmep" style="width:15%;background:#a78bfa"></i></div><b id="mValFmep">0,0 bar</b></div>
              <div class="hud-mep-row"><span>PMEP</span><div><i id="mBarPmep" style="width:10%;background:#fb7185"></i></div><b id="mValPmep">0,0 bar</b></div>
              <div style="display:flex;justify-content:space-between;margin-top:5px;padding-top:4px;border-top:1px solid rgba(255,255,255,.1);font-size:.6rem">
                <span>ηb <b id="mValEtab" style="color:#fff">0,0 %</b></span>
                <span>knackmarginal <b id="mValKnock" style="color:#34d399">3,5</b></span>
              </div>
              <div style="font-size:.56rem;color:#9ca3af;margin-top:2px" id="mValBsfc">Förbrukning: 0 g/s · bsfc 0 g/kWh</div>
            </div>

            <!-- MITTEN BOTTEN: Digital Dash-display (visas i Huvkamera så GoPro In-Car-kupén är helt fri!) -->
            <div class="hud-wheel-cluster" id="hWheelCluster" style="display:none">
              <div class="wc-btns">
                <i style="color:#38bdf8;background:#0284c7"></i><i style="color:#facc15;background:#eab308"></i>
                <i style="color:#22c55e;background:#16a34a"></i><i style="color:#ef4444;background:#dc2626"></i>
              </div>
              <div class="wc-screen">
                <div class="wc-Screen-l">
                  <span>POS <b id="wcPos">P1</b></span>
                  <span>VARV <b id="wcLap">1/${cfg.laps}</b></span>
                  <span id="wcJoker" style="color:#34d399">${this.useJoker ? 'L: KVAR' : 'L: EJ'}</span>
                </div>
                <div class="wc-Screen-c">
                  <b id="wcGear">1</b>
                  <span id="wcSpd">0</span>
                  <small style="display:block;font-size:.52rem;color:#facc15" id="wcRpm">900 RPM</small>
                </div>
                <div class="wc-Screen-r">
                  <span>TEMP <b id="wcTemp">82°C</b></span>
                  <span>λ <b style="color:#c084fc">${fmt(cfg.player.spec.lambda, 2)}</b></span>
                  <span>SKADA <b id="wcDmg">0%</b></span>
                </div>
              </div>
              <div class="wc-btns">
                <i style="color:#a855f7;background:#9333ea"></i><i style="color:#f97316;background:#ea580c"></i>
                <i style="color:#38bdf8;background:#0284c7"></i><i style="color:#22c55e;background:#16a34a"></i>
              </div>
            </div>

            <!-- HÖGER BOTTEN: Växel, 15 LED RPM, Hastighet & G-kraft/Däcktemp -->
            <div class="hud-right-bot">
              <div class="hud-card">
                <div class="hud-dash-top">
                  <div class="hud-gear" id="hGear">1</div>
                  <div style="flex:1">
                    <div class="hud-leds" id="hLeds">${'<i></i>'.repeat(15)}</div>
                    <div style="display:flex;justify-content:space-between;font-size:.6rem;color:#cbd5e1">
                      <span><b id="hRpmT">900</b> rpm</span>
                      <span id="hTempTxt">82 °C</span>
                    </div>
                  </div>
                  <div class="hud-speed"><b id="hSpd">0</b><span>km/h</span></div>
                </div>
                <div class="hud-badges">
                  <span class="hud-badge ${cfg.player.aids.abs ? 'on' : ''}">ABS</span>
                  <span class="hud-badge ${cfg.player.aids.tc ? 'on' : ''}">TC</span>
                  <span class="hud-badge ${cfg.player.aids.auto ? 'on' : ''}">AUTO</span>
                  <span class="hud-badge ${this.useJoker ? 'warn' : 'on'}" id="hJoker">${this.useJoker ? 'LISÄLENKKI' : 'EI LISÄL.'}</span>
                </div>
              </div>

              <div class="hud-card hud-gcard">
                <div style="display:flex;flex-direction:column;align-items:center">
                  <canvas id="hGforce" width="58" height="58"></canvas>
                  <span id="hGtxt" style="font-size:.58rem;color:#cbd5e1;margin-top:2px">0,0 G</span>
                </div>
                <div class="hud-tires">
                  <div class="hud-tire-box"><span>VF</span><b id="hTfl">55°C</b></div>
                  <div class="hud-tire-box"><span>HF</span><b id="hTfr">55°C</b></div>
                  <div class="hud-tire-box"><span>VB</span><b id="hTrl">52°C</b></div>
                  <div class="hud-tire-box"><span>HB</span><b id="hTrr">52°C</b></div>
                  <div style="grid-column:1/-1;display:flex;justify-content:space-between;font-size:.56rem;color:#9ca3af;padding-top:2px">
                    <span>BROMS</span><b id="hTbrk" style="color:#e5e7eb">60 °C</b>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="hud-keys-bar" id="hKeys">W/↑ gas · S/↓ broms/back · A/D styr · Mellanslag handbroms · E/Q växla · C kamera (Förstaperson / Kupé / Huv / Bakom) · R återställ · P paus</div>
        </div>

        <div class="touch" id="hTouch"><div class="t-l"><button data-k="left">◀</button><button data-k="right">▶</button></div>
          <div class="t-r"><button data-k="hb" class="t-s">HAND</button><button data-k="brk" class="t-b">BROMS</button><button data-k="gas" class="t-g">GAS</button></div></div>
        <div class="pause" id="hPauseBox" hidden><div><h2>Paus</h2><button class="btn" id="hResume">Fortsätt</button><button class="btn ghost" id="hQuit">Bryt heatet (K – stanna vid STOP)</button></div></div>
      </div></div>`;

    this.$ = id => host.querySelector('#' + id);
    this.cv = host.querySelector('.race-cv');
    ensureTerrain(trk);
    trk.wetK = { regn: [0.78, 0.9], sno: [0.75, 0.82], dimma: [0.97, 0.98] }[cfg.weather] || null;
    const q = cfg.settings?.quality === 'lag' ? 0 : 1; this.q = q;
    this.view = new View3(this.cv, trk, { quality: q, res: cfg.settings?.res || 'auto', weather: cfg.weather || 'sol' }); this.R = this.view.ok ? this.view : null;
    if (this.R) this.view.setCockpit([cockpitMesh(), steerWheelMesh(), pendantMesh(), cockpitMesh({ driverView: true })], cfg.player.paint);
    this.env = trk.winter
      ? { zenith: [0.46, 0.62, 0.82], fog: [0.82, 0.88, 0.94], fd: 0.000014, light: [0.42, 0.78, 0.32] }
      : { zenith: [0.18, 0.44, 0.78], fog: [0.64, 0.78, 0.92], fd: 0.000009, light: [0.48, 0.82, 0.36] };

    // Bilar
    const defs = []; const N = cfg.opps.length + 1, pslot = clamp(cfg.grid ?? N - 1, 0, N - 1); let oi = 0;
    for (let sl = 0; sl < N; sl++) defs.push(sl === pslot ? { ...cfg.player, isP: true } : cfg.opps[oi++]);
    this.cars = defs.map((d, sl) => makeCar(d, trk, sl, !!d.isP, this.gridRows, N));
    this.player = this.cars.find(c => c.isPlayer);
    // Online: bilar som simuleras hos någon annan (remote) får sitt läge via nätet i stället för AI/fysik
    this.net = cfg.net || null;
    this.cars.forEach((c, sl) => { const d = defs[sl]; c.num = d.num; if (!c.isPlayer && d.diff != null) { c.diff = d.diff; c.pow = d.powScale || 1; } if (d.nid) c.nid = d.nid; if (d.remote) { c.remote = true; c.ai = null; c.snap = null; c.seenT = Date.now(); } });
    if (this.net) this.player.nid = this.net.id;
    // Åskådarläge: alla bilar körs av AI, kameran följer valfri bil (E/Q eller växelknapparna byter bil)
    this.spectate = !!cfg.spectate;
    if (this.spectate) { const p = this.player; p.isPlayer = false; if (!p.remote) p.ai = { jokerLap: 0, off: 0, stuck: 0, prof: null }; p.diff = cfg.player.diff ?? 0.8; p.pow = cfg.player.powScale || 1; p.aids = { abs: 1, tc: 1, auto: 1 }; for (const c of this.cars) c.auto = true; }
    if (location.search.includes('auto')) { const c = this.player; c.auto = true; c.skill = 0.97; c.ai = { jokerLap: 0, off: 0, stuck: 0, prof: null }; c.aids = { abs: 1, tc: 1, auto: 1 }; }
    this.player.dmg = cfg.dmg0 || 0; this.player.tireWearF = cfg.wear0?.[0] || 0; this.player.tireWearR = cfg.wear0?.[1] || 0; this.player.radLeak = !!cfg.radLeak0;
    const needMirrors = !this.sideContact;
    for (const c of this.cars) {
      if (this.R) c.obj = this.view.addCar(c.spec.body, c.paint, { bars: c.spec.dmg < 1, mirrors: needMirrors, bw: c.bw, num: c.isPlayer ? (cfg.player.num || '') : c.num || 1 + ((c.slot * 37 + 11) % 98) });
      c.y = trk.heightAt(c.x, c.z); c.wspin = 0;
      if (c.ai) {
        // svårighet 1–100 %: 1 % kör ca 4–5 km/h-krypfart med vingliga linjer (≈5 min/varv), 100 % pressar däcken till gränsen
        const d = c.diff, mu = trk.surf.mu * c.spec.mu * Math.min(c.spec.muF || 1, c.spec.muR || 1), k = d != null ? 0.55 + 0.44 * Math.pow(d, 1.2) : c.skill, top = d != null ? 2.2 + 47.8 * Math.pow(d, 1.3) : 50;
        c.ai.thrMax = d != null ? 0.3 + 0.7 * Math.pow(d, 1.5) : 1; c.ai.noise = d != null ? 0.9 * (1 - d) ** 2 : 0; c.ai.agg = d != null ? d : 0.8; c.ai.wob = 0;
        c.ai.prof = trk.profile(mu * G * 0.90 * k * k, mu * G * 0.85 * k, d != null && d < 0.99 ? top : 90); c.ai.vJ = Math.sqrt(mu * G * 0.85 * k * k * 21); c.ai.aB = mu * G * 0.6 * k;
        c.ai.jokerLap = Math.floor(Math.random() * cfg.laps);
      }
    }
    // Fri förstapersonsvy som standard; tidigare kameraval återställs.
    this.t = 0; this.state = 'grid'; this.gridT = 0; this.goAt = 3.6 + Math.random() * 1.2; this.acc = 0;
    this.cam = DEFAULT_CAM;
    this.camH = this.player.h; this.keys = {}; this.touch = {};
    this.startPos = [this.player.x, this.player.z]; this.msgT = 0; this.hudT = 0; this.paused = false; this.done = false;
    this.parts = new Float32Array(260 * 54); this.pl = [];
    this.buildMap(); this.bind(); this.resize();
    this.setCam(cfg.settings?.camera ?? DEFAULT_CAM, false);
    const touchMode = cfg.settings?.touch || 'auto'; const showTouch = touchMode === 'on' || (touchMode === 'auto' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
    this.$('hTouch').style.display = showTouch ? '' : 'none'; if (showTouch) this.$('hKeys').style.display = 'none';
    if (cfg.mode === 'time') { this.$('hLbCard').style.display = 'none'; }
    this.audioInit();
    if (this.spectate) this.msg('👁 ÅSKÅDARLÄGE – E/Q byter bil, C byter kamera', 4);
    if (this.net) { this.heatId = cfg.heatId || 'h1'; this.netLead = cfg.netLead === this.net.id; this.goAt = Infinity; this.net.race = this; if (!this.spectate) this.net.imReady(this.heatId); this.msg(this.spectate ? '👁 Väntar på start…' : 'Väntar på övriga förare…', 60); }
    this.last = performance.now(); this.raf = requestAnimationFrame(t => this.frame(t));
  }

  cycleCam() {
    this.setCam((this.cam + 1) % CAM_NAMES.length);
  }

  setCam(mode, persist = true) {
    this.cam = Number.isInteger(mode) && mode >= 0 && mode < CAM_NAMES.length ? mode : DEFAULT_CAM;
    const btn = this.$('hCamBtn');
    if (btn) btn.textContent = `🎥 ${CAM_NAMES[this.cam]} [C]`;
    const wc = this.$('hWheelCluster');
    if (wc) wc.style.display = this.cam === 1 ? '' : 'none';
    if (persist) this.cfg.onCameraChange?.(this.cam);
  }

  toggleTele() {
    const root = this.$('hHudRoot'), btn = this.$('hTeleBtn');
    if (!root) return;
    const isClean = root.classList.toggle('gopro-clean');
    if (btn) btn.classList.toggle('on', !isClean);
  }

  bind() {
    this.ctl = new Controls(this.cfg.settings || {});
    this.kd = e => { if (e.repeat && this.ctl.keyAction(e.code)) { e.preventDefault(); return; } if (this.ctl.keydown(e.code)) e.preventDefault(); };
    this.ku = e => this.ctl.keyup(e.code);
    window.addEventListener('keydown', this.kd); window.addEventListener('keyup', this.ku);
    this.rs = () => this.resize(); window.addEventListener('resize', this.rs);
    for (const b of this.host.querySelectorAll('.touch button')) {
      const k = b.dataset.k;
      const on = e => { e.preventDefault(); this.touch[k] = 1; b.classList.add('on'); }, off = e => { e.preventDefault(); this.touch[k] = 0; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
    }
    this.$('hCamBtn').onclick = () => this.cycleCam();
    if (this.$('hTeleBtn')) this.$('hTeleBtn').onclick = () => this.toggleTele();
    this.$('hPause').onclick = () => this.togglePause();
    this.$('hResume').onclick = () => this.togglePause();
    this.$('hQuit').onclick = () => {
      this.player.retired = true; this.player.flag = 'K';
      if (!this.net) return this.finish();
      if (this.netLead && this.cars.every(c => c.remote ? c.finished || c.retired : true)) this.endAt = this.t; // ensam kvar: avsluta för alla
      this.togglePause(); if (this.state === 'run') this.state = 'flag'; this.endLocal();
    };
  }

  togglePause() { if (this.done) return; this.paused = !this.paused; this.$('hPauseBox').hidden = !this.paused; this.last = performance.now(); if (this.gain) this.gain.gain.value = 0; }
  shift(d) { if (this.spectate) { const i = (this.cars.indexOf(this.player) + d + this.cars.length) % this.cars.length; this.player = this.cars[i]; this.camH = this.player.h; this.msg('👁 ' + this.player.name, 1.4); return; } const c = this.player; if (this.state !== 'run' || c.shiftT > 0) return; const g = c.gear + d; if (g >= 1 && g <= c.spec.gears.length) { c.gear = g; c.shiftT = (c.clutch || 0) > 0.5 ? 0.06 : c.spec.shift; } }
  resize() { if (this.R) this.view.resize(); }
  resetCar(c) { const trk = this.trk, hwi = trk.hwAt ? trk.hwAt(c.i) : trk.hw, [x, z, h] = trk.point(c.i, clamp(c.lat, -hwi + 2, hwi - 2) * 0.3); c.x = x; c.z = z; c.h = h; c.vx = c.vy = c.r = 0; c.rev = false; c.gear = 1; }
  msg(html, dur = 2.4, cls = '') { const e = this.$('hMsg'); e.innerHTML = html; e.className = 'hud-msg show ' + cls; this.msgT = dur; }

  buildMap() {
    const t = this.trk; let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (let i = 0; i < t.n; i++) {
      const b = t.bulge(i);
      for (const [x, z] of [[t.X[i], t.Z[i]], [t.X[i] + t.NX[i] * b, t.Z[i] + t.NZ[i] * b]]) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      }
    }
    this.mapBounds = { cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, s: Math.min(150 / Math.max(40, maxX - minX), 90 / Math.max(40, maxZ - minZ)) };
  }

  drawMap() {
    const cv = this.$('hMap'); if (!cv) return;
    const g = cv.getContext('2d'), t = this.trk, { cx, cz, s } = this.mapBounds;
    const P = (x, z) => [cv.width / 2 + (x - cx) * s, cv.height / 2 + (z - cz) * s];
    g.clearRect(0, 0, cv.width, cv.height); g.lineJoin = 'round'; g.lineCap = 'round';
    if (t.startChute) {
      const sc = t.startChute, p0 = P(sc.x0, sc.z0), p1 = P(sc.x1, sc.z1);
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
      g.strokeStyle = '#9aa4b0'; g.lineWidth = 3.5; g.stroke();
    }
    for (let i = 0; i < t.n; i += 2) {
      const i2 = (i + 2) % t.n, p0 = P(t.X[i], t.Z[i]), p1 = P(t.X[i2], t.Z[i2]);
      const st = t.surfTypeAt ? t.surfTypeAt(i) : t.surface;
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
      g.strokeStyle = st === 'asfalt' ? '#6ee7b7' : '#fbbf24';
      g.lineWidth = 4.2; g.stroke();
    }
    g.beginPath();
    for (let i = t.joker.i1; i <= t.joker.i2; i++) {
      const b = t.bulge(i), p = P(t.X[i] + t.NX[i] * b, t.Z[i] + t.NZ[i] * b);
      i === t.joker.i1 ? g.moveTo(p[0], p[1]) : g.lineTo(p[0], p[1]);
    }
    g.strokeStyle = this.useJoker ? '#ff3b2f' : 'rgba(255,59,47,.35)'; g.lineWidth = 2.8; g.stroke();
    const fIdx = t.finishIdx || 0, pf = P(t.X[fIdx], t.Z[fIdx]);
    g.fillStyle = '#fff'; g.fillRect(pf[0] - 2, pf[1] - 4, 4, 8);
    for (const c of this.cars) {
      const p = P(c.x, c.z);
      g.beginPath(); g.arc(p[0], p[1], c.isPlayer ? 4.5 : 3.2, 0, 6.3);
      g.fillStyle = c.isPlayer ? '#facc15' : `rgb(${c.paint.map(v => v * 255 | 0)})`;
      g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1.2; g.stroke();
    }
  }

  // 360° Närhetsradar mitt i synfältet (precis som i referensbilden!)
  drawRadar() {
    const cv = this.$('hRadar'); if (!cv) return;
    const g = cv.getContext('2d'), W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, p = this.player;
    g.clearRect(0, 0, W, H);
    // Koncentriska radarringar
    for (const r of [20, 38, 54]) {
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2);
      g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 1; g.stroke();
    }
    // Spelarens bil i mitten (gul)
    g.fillStyle = '#facc15';
    g.fillRect(cx - 3.5, cy - 6.5, 7, 13);
    // Motståndare inom 28 m i spelarens lokala koordinatsystem
    const ch = Math.cos(p.h), sh = Math.sin(p.h);
    for (const o of this.cars) {
      if (o === p) continue;
      const dx = o.x - p.x, dz = o.z - p.z;
      const fwd = dx * ch + dz * sh;
      const right = -dx * sh + dz * ch;
      if (Math.hypot(fwd, right) > 26) continue;
      const rx = cx + right * 2.2, ry = cy - fwd * 2.2;
      g.save();
      g.translate(rx, ry);
      g.rotate(o.h - p.h);
      g.fillStyle = `rgb(${o.paint.map(v => v * 255 | 0)})`;
      g.fillRect(-3.5, -6.5, 7, 13);
      g.strokeStyle = '#fff'; g.lineWidth = 0.8; g.strokeRect(-3.5, -6.5, 7, 13);
      g.restore();
    }
  }

  // G-kraftmätare nere till höger (som i referensbilden!)
  drawGForce() {
    const cv = this.$('hGforce'); if (!cv) return;
    const g = cv.getContext('2d'), W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, p = this.player;
    g.clearRect(0, 0, W, H);
    for (const r of [12, 24]) {
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2);
      g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 1; g.stroke();
    }
    g.beginPath(); g.moveTo(cx - 26, cy); g.lineTo(cx + 26, cy); g.moveTo(cx, cy - 26); g.lineTo(cx, cy + 26);
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.stroke();
    const gx = clamp(-p.ay / G, -1.6, 1.6), gy = clamp(p.ax / G, -1.6, 1.6);
    const px = cx + gx * 14, py = cy + gy * 14;
    g.beginPath(); g.arc(px, py, 4, 0, Math.PI * 2);
    g.fillStyle = '#f97316'; g.fill();
    this.$('hGtxt').textContent = fmt(Math.hypot(gx, gy), 1) + ' G';
  }

  audioInit() { try { const vol = (this.cfg.settings?.vol ?? 50) / 100; if (!vol) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const ac = this.ac = new AC(), o1 = ac.createOscillator(), o2 = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; lp.type = 'lowpass'; lp.frequency.value = 900; g.gain.value = 0; o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(ac.destination); o1.start(); o2.start();
      this.o1 = o1; this.o2 = o2; this.gain = g; this.lp = lp; this.vol = vol;
      // däck- och underlagsljud (brus genom filter) + skrammel från skadad motor
      const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const ns = ac.createBufferSource(); ns.buffer = nb; ns.loop = true; const tf = ac.createBiquadFilter(), tg = ac.createGain(); tf.type = 'bandpass'; tf.Q.value = 1.2; tg.gain.value = 0; ns.connect(tf); tf.connect(tg); tg.connect(ac.destination); ns.start();
      const o3 = ac.createOscillator(), rg = ac.createGain(); o3.type = 'square'; rg.gain.value = 0; o3.connect(rg); rg.connect(lp); o3.start();
      this.tf = tf; this.tg = tg; this.o3 = o3; this.rg = rg; } catch (e) { } }
  audio() { if (!this.gain) return; const c = this.player, f = c.rpm / 60 * c.spec.cyl / 2, t = this.ac.currentTime;
    this.o1.frequency.setTargetAtTime(f, t, 0.03); this.o2.frequency.setTargetAtTime(f / 2, t, 0.03); this.lp.frequency.setTargetAtTime(500 + c.rpm * 0.25 + c.thr * 900, t, 0.05);
    this.gain.gain.setTargetAtTime(this.vol * (0.035 + 0.075 * c.thr), t, 0.05);
    if (this.tg) {
      const st = this.trk.surfTypeAt ? this.trk.surfTypeAt(c.i) : this.trk.surface, v = Math.hypot(c.vx, c.vy), slide = Math.min(1, Math.abs(c.vy) * 0.15 + c.slip * 0.8 + (c.lock ? 0.6 : 0));
      const roll = Math.min(1, v / 30), asph = st === 'asfalt';
      this.tf.frequency.setTargetAtTime(asph ? 900 + slide * 1400 : st === 'is' ? 2500 : 260 + v * 8, t, 0.08); this.tf.Q.setTargetAtTime(asph && slide > 0.3 ? 6 : 1.2, t, 0.1);
      this.tg.gain.setTargetAtTime(this.vol * ((asph ? 0.015 : 0.05) * roll + (asph ? 0.12 : 0.07) * slide * roll) * (c.onSurf ? 1 : 1.6), t, 0.06);
      const dm = Math.max(0, (c.dmg || 0) - 35) / 65; this.o3.frequency.setTargetAtTime(f * 0.5 + Math.random() * 30, t, 0.02); this.rg.gain.setTargetAtTime(this.vol * 0.05 * dm, t, 0.05);
    } }
  // Kör kontrollhändelser (tangenter / handkontroll / ratt) en gång per bildruta
  controlEvents() {
    for (const a of this.ctl.poll(this.touch)) {
      if (a === 'up') this.shift(1); else if (a === 'down') this.shift(-1); else if (a === 'cam') this.cycleCam(); else if (a === 'tele') this.toggleTele();
      else if (a === 'reset') { if (this.state === 'run') this.resetCar(this.player); } else if (a === 'pause') this.togglePause();
    }
  }
  input(dt) { const c = this.player, I = this.ctl.state;
    const gas = I.gas, brk = I.brk, st = I.steer;
    c.thr += clamp(gas - c.thr, -8 * dt, (I.analogPedals ? 12 : 5) * dt); c.brk += clamp(brk - c.brk, -10 * dt, (I.analogPedals ? 14 : 6) * dt); c.hb = I.hb; c.clutch = I.clutch;
    const rate = I.analog ? 9 : st === 0 ? 5.5 : (Math.sign(st) !== Math.sign(c.steer) && c.steer !== 0 ? 7 : 3.2);
    c.steer += clamp(st - c.steer, -rate * dt, rate * dt);
    if (brk && !gas && c.vx < 0.4 && this.state === 'run') c.rev = true; else if (gas || !brk) c.rev = false; }

  giveSanction(c, code, title, desc) {
    if (this.t - (c.lastWarn || -9) < 3.0) return;
    c.lastWarn = this.t;
    c.warnCount++;
    if (!c.sanction) { c.sanction = code; c.sanctionT = this.t; }
    else if (!c.sanction.includes(code)) c.sanction += ' ' + code;
    if (c.isPlayer) {
      if (c.warnCount >= 2) {
        this.msg(`SVART FLAGG (${code})<br><small>${title} – 2 varningar i heatet, du placeras sist!</small>`, 3.4, 'warn');
        setTimeout(() => this.endLocal(), 2200);
        this.state = 'flag';
      } else {
        this.msg(`VAROITUS ${code}: ${title}<br><small>${desc} (varning = sist i heatet!)</small>`, 3.4, 'warn');
      }
    }
  }

  step(dt) {
    const trk = this.trk, n = trk.n, p = this.player;
    if (this.state === 'grid') {
      this.gridT += dt; this.input(dt);
      if (this.net) { // gemensam start: värden skickar en klocktid, lamporna räknar ner mot den
        const g = this.net.goAtFor(this.heatId);
        if (g && !this.goWall) { this.goWall = g; this.gridT = 0; this.goAt = Math.max(0.9, (g - this.net.now()) / 1000); this.msg('Alla klara – se på startljusen!', 1.4); }
        if (this.goWall) this.gridT = this.goAt - (this.goWall - this.net.now()) / 1000;
      }
      if (this.gridT >= this.goAt) { this.state = 'run'; this.msg('KÖR! 🏁', 1.2, 'go'); }
      else {
        for (const c of this.cars) if (!c.isPlayer) { c.thr = 0; c.brk = 1; }
        if (p.auto) { p.thr = 0; return; }
        if (!p.jump && Math.hypot(p.x - this.startPos[0], p.z - this.startPos[1]) > 0.35) {
          p.jump = true;
          this.msg('LI – TJUVSTART!<br><small>Bilen rörde sig före startljuset → straff, placeras efter förare utan straff</small>', 3.4, 'warn');
        }
        phys(p, dt, trk); trackStep(p, trk, 0, this.useJoker); return;
      }
    }
    if (this.state !== 'run' && this.state !== 'flag') return;
    if (this.net) this.t = Math.max(this.t, (this.net.now() - this.goWall) / 1000); else this.t += dt;
    for (const c of this.cars) {
      if (c.remote) { this.netCar(c, dt); continue; }
      if (c.isPlayer) {
        if (this.state === 'run' && !c.finished && !c.retired) {
          if (c.auto) aiDrive(c, this, dt); else this.input(dt);
        } else { c.thr = 0; c.brk = 0.55; c.steer *= 0.95; c.hb = 0; }
      } else if (!c.finished && !c.retired) aiDrive(c, this, dt);
      else { c.thr = 0; c.brk = 0.45; }

      phys(c, dt, trk);
      { const ii = trk.w(c.i), sl = trk.SL[ii] * (Math.cos(c.h) * trk.TX[ii] + Math.sin(c.h) * trk.TZ[ii]); c.vx -= G * sl * dt; c.slope = sl; c.wspin += c.vx / 0.31 * dt;
        c.gripF = 1 - (c.tireWearF + c.tireWearR) * 0.0011; }
      const lapBefore = Math.floor(c.prog / n);
      const hit = trackStep(c, trk, this.t, this.useJoker);

      if (c.coneEvent === 'down') {
        c.coneEvent = '';
        this.msg('Li – KEILA KAATUI LISÄLENKILLÄ!<br><small>Konen välte i lisälenkki → flyttas sist av målgångna</small>', 3.2, 'warn');
      } else if (c.coneEvent === 'touch') {
        c.coneEvent = '';
        this.msg('SNUDDADE KON I LISÄLENKKI<br><small>"Hipaista saa, mutta keila ei saa kaatua" – ingen sanktion!</small>', 2.2);
      }

      if (hit > 2.5 && c.isPlayer) {
        this.damage(hit * hit * 0.11, true);
        if (hit > 9.2 && Math.abs(c.vy) > 3.5 && !c.kaato && this.state === 'run') {
          c.kaato = true; c.retired = true; this.state = 'flag';
          this.msg('KA – KAATO (RULLNING)!<br><small>Takrännan i marken – heatet avbryts, kräver kaatokatsastus!</small>', 3.6, 'warn');
          setTimeout(() => this.endLocal(), 2400);
        }
      }

      // Sektorer & varvtid
      if (c.isPlayer && c.prog > 0) {
        const lapFrac = ((c.prog % n) + n) % n / n;
        const sec = lapFrac < 0.333 ? 0 : lapFrac < 0.666 ? 1 : 2;
        if (sec > c.curSec) { c.sectors[c.curSec] = this.t - c.secT; c.secT = this.t; c.curSec = sec; }
      }
      const lapNow = Math.floor(c.prog / n);
      if (lapNow > lapBefore && lapNow >= 1) {
        const lt = this.t - c.lastLapT; c.lastLapT = this.t; c.laps.push(lt); if (lt < c.bestLap) c.bestLap = lt;
        if (c.isPlayer) { c.sectors[2] = this.t - c.secT; c.secT = this.t; c.curSec = 0; }
        if (c.isPlayer && lapNow < this.cfg.laps) this.msg(`Varv ${lapNow}: ${fmtTime(lt)}`, 1.8);
        if (lapNow >= this.cfg.laps && !c.finished) { c.finished = true; c.finishT = this.t; if (c.isPlayer) this.flagDown(); }
      }
      if (c.jokerDone && c.jokerLap == null) c.jokerLap = Math.floor(Math.max(0, c.prog) / n) + 1;
      if (lapNow > lapBefore && c.finished) { for (const o of this.cars) if (o !== c) (c.behind = c.behind || {})[this.cars.indexOf(o)] = Math.max(0, (this.cfg.laps * n - o.prog) * trk.ds); }
      if (c.isPlayer && this.useJoker && c.jokerDone && !c.jokerShown) {
        c.jokerShown = true;
        this.msg(c.coneDown ? 'LISÄLENKKI KÖRD (men keila kaatui → Li)' : 'LISÄLENKKI KÖRD ✓', 1.8, c.coneDown ? 'warn' : 'go');
      }
      // Motorvärme, däcktemperatur och slitage (spelaren)
      if (c.isPlayer) {
        const ri = clamp(c.rpm / 500, 0, c.cool.length - 1.001), i0 = ri | 0, q = (c.cool[i0] + (c.cool[i0 + 1] - c.cool[i0]) * (ri - i0)) * c.thr;
        const v = Math.abs(c.vx), cap = c.spec.cool * (c.temp - 20) / 80 * (0.5 + 0.5 * Math.min(1, v / 18)) * (c.radLeak ? 0.4 : 1);
        c.temp += (q - cap) / 24 * dt; c.temp = Math.max(c.temp, 70);
        const mg = c.marg[i0]; if (mg < 0 && c.thr > 0.8) this.damage(-mg * 0.9 * dt, false, true);
        if (c.temp > 126) this.damage(1.2 * dt, false, true);
        c.pow = (1 - clamp((c.dmg - 40) / 60, 0, 1) * 0.25) * (c.temp > 115 ? Math.max(0.6, 1 - (c.temp - 115) * 0.025) : 1);
        // Däcktemp & bränsle
        const slideHeat = Math.abs(c.vy) * 0.8 + c.slip * 12;
        const tgtF = 55 + slideHeat + Math.abs(c.steer) * 8, tgtR = 52 + slideHeat + (c.spec.drv === 'rwd' ? c.thr * 10 : 3);
        c.tireTemp[0] += (tgtF - c.tireTemp[0]) * dt * 0.8; c.tireTemp[1] += (tgtF - c.tireTemp[1]) * dt * 0.8;
        c.tireTemp[2] += (tgtR - c.tireTemp[2]) * dt * 0.8; c.tireTemp[3] += (tgtR - c.tireTemp[3]) * dt * 0.8;
        c.brakeTemp += ((60 + c.brk * 260) - c.brakeTemp) * dt * 1.5;
        // Däckslitage: sladd, hjulspinn och låsning sliter mest, asfalt mer än grus, is nästan inget. Slitna däck ger sämre grepp.
        { const st = trk.surfTypeAt ? trk.surfTypeAt(c.i) : trk.surface, k = st === 'asfalt' ? 1.5 : st === 'is' ? 0.25 : 1, sp = Math.min(1, Math.abs(c.vx) / 25), drvF = c.spec.drv === 'fwd';
          c.tireWearF = Math.min(100, c.tireWearF + k * (c.spec.tyreWear || 1) * (0.05 * sp + Math.abs(c.vy) * 0.05 + Math.abs(c.steer) * sp * 0.10 + (drvF ? c.slip * 0.9 : 0) + (c.lock ? 0.7 : 0)) * dt);
          c.tireWearR = Math.min(100, c.tireWearR + k * (c.spec.tyreWear || 1) * (0.04 * sp + Math.abs(c.vy) * 0.07 + (drvF ? 0 : c.slip * 0.9) + (c.hb ? 0.8 : 0)) * dt); }
        c.fuelKg = Math.max(1.0, c.fuelKg - 0.008 * c.thr * dt);
      }
    }

    // Bil mot bil + varningskoder
    for (let a = 0; a < this.cars.length; a++) for (let b = a + 1; b < this.cars.length; b++) {
      const A = this.cars[a], B = this.cars[b];
      if (Math.abs(A.x - B.x) > 6 || Math.abs(A.z - B.z) > 6) continue;
      let rm = null, sv;
      if (this.net) {
        if (A.remote && B.remote) continue;
        const parked = c => (c.finished || c.retired) && Math.abs(c.vx) < 2; if (parked(A) || parked(B)) continue; // målgångna/brutna bilar spökar inte banan
        rm = A.remote ? A : B.remote ? B : null; if (rm) sv = [rm.x, rm.z, rm.h, rm.vx, rm.vy, rm.r];
      }
      const hit = collide(A, B);
      if (rm) [rm.x, rm.z, rm.h, rm.vx, rm.vy, rm.r] = sv; // den andres bil flyttas bara av sin egen dator
      if (hit > 1.2 && (A.isPlayer || B.isPlayer)) {
        this.damage(hit * hit * 0.09, true); this.crash(hit);
      }
      if (hit > 6.5 && this.state === 'run') { // A6: hård kollision i hög hastighet (liten knuff i låg fart ger inget straff)
        const rammer = collide.front === 'A' ? A : collide.front === 'B' ? B : null, other = rammer === A ? B : A;
        if (rammer && !rammer.remote && Math.hypot(rammer.vx, rammer.vy) > 12 && (collide.type === 'rear' || Math.hypot(rammer.vx, rammer.vy) > Math.hypot(other.vx, other.vy) + 4)) this.giveSanction(rammer, 'A6', 'Kollision i hög hastighet', 'Hård påkörning – straff A6');
        if (hit > 3) { for (const X of [A, B]) if (!X.isPlayer && !X.remote) X.dmg = Math.min(100, (X.dmg || 0) + hit * hit * 0.09 * X.spec.dmg); }
      }
    }

    if (p.dmg >= 100 && !p.retired && this.state === 'run') {
      p.retired = true; this.state = 'flag';
      this.msg('K – KESKEYTTÄNYT<br><small>Bilen höll inte – stanna vid STOP-märket!</small>', 3.2, 'warn');
      setTimeout(() => this.endLocal(), 2200);
    }
    if (this.net) return;
    if (this.spectate && this.state === 'run' && this.endAt === undefined) {
      let first = Infinity; for (const c of this.cars) if (c.finished && c.finishT < first) first = c.finishT;
      if (this.cars.every(c => c.finished || c.retired)) this.endAt = this.t + 2; else if (this.t > first + 60) this.endAt = this.t;
    }
    if (this.spectate && this.endAt !== undefined && this.t >= this.endAt) return this.finish();
    if (this.state === 'flag' && this.flagT !== undefined && this.t - this.flagT > (this.cfg.mode === 'time' || p.retired || this.cars.every(c => c.finished || c.retired) ? 3 : 45)) this.finish();
    if (this.t > 600) this.finish();
  }

  // Kollisionsljud: kort brusstöt genom ett bandpassfilter, starkare ju hårdare smällen är
  crash(hit) {
    this.shake = Math.min(1, (this.shake || 0) + hit * 0.08);
    const ac = this.ac; if (!ac || !this.vol || (this.lastCrash && ac.currentTime - this.lastCrash < 0.12)) return; this.lastCrash = ac.currentTime;
    const len = 0.35, buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) { const t = i / d.length; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3) * (t < 0.02 ? t / 0.02 : 1); }
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); src.buffer = buf; f.type = 'bandpass'; f.frequency.value = 300 + Math.random() * 500; f.Q.value = 0.8;
    g.gain.value = Math.min(1, this.vol * (0.25 + hit * 0.09)); src.connect(f); f.connect(g); g.connect(ac.destination); src.start();
  }
  damage(d, impact, engine) {
    const p = this.player; d *= engine ? 1 : p.spec.dmg; p.dmg = Math.min(100, p.dmg + d);
    if (impact && d > 9 && !p.spec.radSafe && !p.radLeak && p.dmg > 45 && Math.random() < 0.5) {
      p.radLeak = true;
      this.msg('KYLAREN LÄCKER<br><small>Håll koll på temperaturen</small>', 2.6, 'warn');
    } else if (impact && d > 7 && !p.exhaustLoose && p.dmg > 35 && Math.random() < 0.35) {
      p.exhaustLoose = true;
      this.msg('AVGASRÖRET LOSSNADE (>110 dB)<br><small>Måste fästas i depån före nästa heat enligt 110 dB-regeln!</small>', 2.8, 'warn');
    }
  }

  flagDown() {
    this.state = 'flag'; this.flagT = this.t; const p = this.player;
    const missLi = this.useJoker && (!p.jokerDone || p.coneDown);
    if (missLi) this.msg('RUUTULIPPU – Li!<br><small>Lisälenkki ajamatta / keila kaatunut → sist av målgångna. Stanna vid STOP-merkki!</small>', 3.2, 'warn');
    else if (p.jump) this.msg('RUUTULIPPU – LI!<br><small>Vilppilähtö → sist av målgångna. Stanna vid STOP-merkki!</small>', 3.2, 'warn');
    else this.msg('RUUTULIPPU! 🏁<br><small>Kör lugnt till STOP-merkki (ingen revittely i myyntiluokat!)</small>', 2.8, 'go');
  }

  order() {
    const n = this.trk.n, L = this.cfg.laps, now = this.t;
    const rows = this.cars.map(c => {
      let t;
      if (c.finished) t = c.finishT;
      else {
        const rem = (L * n - c.prog) * this.trk.ds;
        const avg = Math.max(6, (c.prog + 8) * this.trk.ds / Math.max(now, 1));
        t = now + rem / avg;
      }
      const tags = [];
      const hasLi = this.useJoker && (!c.jokerDone || c.coneDown) && !c.retired;
      if (c.kaato) tags.push('KA');
      else if (c.retired) tags.push('K');
      if (hasLi) tags.push(c.coneDown && c.jokerDone ? 'KEILA KAATUI' : 'EJ AJA LISÄLENKKI');
      if (c.jump) tags.push('LI');
      if (c.sanction) tags.push(c.sanction);
      const flag = tags.join(' ');
      let rank = 0;
      if (c.sanction) rank = 4;
      else if (c.kaato || c.retired) rank = 3;
      else if (c.jump) rank = 2;
      else if (hasLi) rank = 1;
      return { c, name: c.name, isPlayer: c.isPlayer, t, flag, rank, prog: c.prog, sanctionT: c.sanctionT };
    });
    rows.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (a.rank === 4) return b.sanctionT - a.sanctionT;
      if (a.rank === 3) return b.prog - a.prog;
      return a.t - b.t;
    });
    return rows;
  }

  livePos() { const cs = [...this.cars].sort((a, b) => b.prog - a.prog); return cs; }

  // ---------- online ----------
  endLocal() { if (!this.net) return this.finish(); if (!this.done) this.msg('Väntar på att övriga går i mål…<br><small>Resultatet visas när alla är klara</small>', 600); }
  netPack(c) {
    const r2 = v => Math.round(v * 100) / 100;
    const bits = (c.finished ? 1 : 0) | (c.retired ? 2 : 0) | (c.jokerDone ? 4 : 0) | (c.coneDown ? 8 : 0) | (c.jump ? 16 : 0) | (c.kaato ? 32 : 0) | (c.brk > 0.2 ? 64 : 0);
    return [c.nid, r2(c.x), r2(c.z), Math.round(c.h * 1000) / 1000, r2(c.vx), r2(c.vy), r2(c.r), r2(c.steer), Math.round(c.prog * 10) / 10, r2(c.lat), c.i, bits,
      c.finished ? Math.round(c.finishT * 1000) / 1000 : 0, c.sanction || '', isFinite(c.bestLap) ? Math.round(c.bestLap * 1000) / 1000 : 0, isFinite(c.sanctionT) ? r2(c.sanctionT) : 0];
  }
  netTick() {
    const net = this.net, now = performance.now(); if (now - (this.netLast || 0) < 80 || this.done) return; this.netLast = now;
    const mine = this.cars.filter(c => !c.remote); if (mine.length) net.send({ k: 's', h: this.heatId, t: Math.round(net.now()), c: mine.map(c => this.netPack(c)) });
    if (!this.netLead || this.state === 'grid') return;
    const wall = Date.now();
    for (const c of this.cars) if (c.remote && !c.finished && !c.retired && wall - c.seenT > 8000) c.retired = true; // tappad anslutning = K
    if (this.endAt === undefined) {
      let first = Infinity; for (const c of this.cars) if (c.finished && c.finishT < first) first = c.finishT;
      if (this.cars.every(c => c.finished || c.retired)) this.endAt = this.t + 2.5;
      else if (this.t > first + 75 || this.t > 900) this.endAt = this.t;
    }
    if (this.endAt !== undefined && this.t >= this.endAt) {
      const order = this.order().map(r => ({ id: r.c.nid, name: r.name, flag: r.flag, time: r.c.finished && !r.c.retired ? r.t : null, best: isFinite(r.c.bestLap) ? r.c.bestLap : null, jokerLap: r.c.jokerLap ?? null }));
      net.end(this.heatId, order); this.finish(order);
    }
  }
  netState(m) {
    if ((m.h || 'h1') !== this.heatId) return;
    for (const a of m.c) {
      const c = this.cars.find(x => x.remote && x.nid === a[0]); if (!c) continue;
      if (c.snap && m.t < c.snap.t) continue;
      c.snap = { t: m.t, x: a[1], z: a[2], h: a[3], vx: a[4], vy: a[5], r: a[6], steer: a[7], prog: a[8], lat: a[9], i: a[10] }; c.seenT = Date.now();
      const b = a[11]; c.finished = !!(b & 1); c.retired = !!(b & 2); c.jokerDone = !!(b & 4); c.coneDown = !!(b & 8); c.jump = !!(b & 16); c.kaato = !!(b & 32); c.brk = b & 64 ? 1 : 0;
      if (c.finished) c.finishT = a[12]; c.sanction = a[13] || ''; c.bestLap = a[14] || Infinity; c.sanctionT = a[15] || Infinity;
    }
  }
  // Fjärrbil: följ senaste lägesrapporten, framräknad med dess hastighet så att bilen inte hackar eller släpar efter
  netCar(c, dt) {
    const s = c.snap; if (!s) return;
    const age = clamp((this.net.now() - s.t) / 1000, 0, 0.4), ch = Math.cos(s.h), sh = Math.sin(s.h), wx = s.vx * ch - s.vy * sh, wz = s.vx * sh + s.vy * ch;
    const tx = s.x + wx * age, tz = s.z + wz * age, th = s.h + s.r * age, k = Math.min(1, dt * 10);
    if (Math.abs(tx - c.x) + Math.abs(tz - c.z) > 18) { c.x = tx; c.z = tz; c.h = th; }
    else { c.x += wx * dt + (tx - c.x) * k; c.z += wz * dt + (tz - c.z) * k; c.h += s.r * dt + wrapA(th - c.h) * k; }
    c.vx = s.vx; c.vy = s.vy; c.r = s.r; c.steer = s.steer; c.lat = s.lat; c.i = s.i; c.prog = s.prog + s.vx * age / this.trk.ds; c.slip = 0; c.lock = 0; c.thr = 0.5;
    c.wspin += c.vx / 0.31 * dt;
  }
  netEnd(order) { this.finish(order); }
  netGone(id) { const c = this.cars.find(x => x.remote && x.nid === id); if (c && !c.finished) c.retired = true; }
  netHostLost() { if (this.done) return; this.finish(); }

  finish(netOrder) {
    if (this.done) return; this.done = true; let rows = this.order(); const p = this.player;
    const pRow = rows.find(r => r.isPlayer);
    if (netOrder && this.net) rows = netOrder.map(o => ({ name: o.name, isPlayer: o.id === this.net.id, flag: o.flag, t: o.time, c: { finished: o.time != null, retired: false, nid: o.id, bestLap: o.best ?? Infinity, jokerLap: o.jokerLap } }));
    const res = {
      order: rows.map((r, i) => { const c = r.c, prev = i > 0 ? rows[i - 1].c : null;
        const dist = !netOrder && prev && prev.behind && this.cars.indexOf(c) >= 0 ? prev.behind[this.cars.indexOf(c)] : null;
        return { id: c.nid, name: r.name, isPlayer: r.isPlayer, flag: r.flag, time: c.finished && !c.retired ? r.t : null, best: isFinite(c.bestLap) ? c.bestLap : null, jokerLap: c.jokerLap ?? null, dist: dist ?? null }; }),
      pos: rows.findIndex(r => r.isPlayer) + 1,
      bestLap: p.bestLap, dmg: p.dmg, flag: pRow?.flag || "", sanction: p.sanction, kaato: p.kaato,
      exhaustLoose: p.exhaustLoose, finished: p.finished && !p.retired,
      time: p.finished && !p.retired ? p.finishT : null, radLeak: p.radLeak, dur: this.t, wear: [p.tireWearF, p.tireWearR],
    };
    this.destroy(); this.cfg.onDone(res);
  }

  destroy() {
    cancelAnimationFrame(this.raf); window.removeEventListener('keydown', this.kd); window.removeEventListener('keyup', this.ku); window.removeEventListener('resize', this.rs);
    try { if (this.ac) this.ac.close(); } catch (e) { } this.dead = true; if (this.net && this.net.race === this) this.net.race = null; if (this.view) this.view.dispose();
  }

  frame(now) {
    if (this.dead) return; this.raf = requestAnimationFrame(t => this.frame(t));
    const sp = this.speedUp ??= +(new URLSearchParams(location.search).get('speed') || 1); // testhjälp: ?speed=4 kör simuleringen snabbare
    let dt = Math.min(0.05, (now - this.last) / 1000) * sp; this.last = now;
    if (this.ctl) this.controlEvents();
    if (this.net) this.netTick();
    if (!this.paused || this.net) { this.acc += dt; let k = 0; while (this.acc >= DT && k++ < 14 * sp) { this.step(DT); this.acc -= DT; if (this.done) return; } if (this.acc > DT * 4) this.acc = 0; this.particlesStep(dt); this.audio(); }
    this.render(dt); this.hud(dt);
  }

  particlesStep(dt) {
    const pl = this.pl;
    for (const c of this.cars) {
      const v = Math.hypot(c.vx, c.vy), slide = Math.abs(c.vy) + c.slip * 6 + (c.lock ? 5 : 0);
      const st = this.trk.surfTypeAt ? this.trk.surfTypeAt(c.i) : this.trk.surface;
      const surf = this.trk.surfAt ? this.trk.surfAt(c.i) : this.trk.surf;
      const rate = st === 'asfalt' ? (slide > 3 ? slide * 2 : 0) : (v > 2.2 ? v * 0.65 : 0) + slide * 3.8;
      c.pe = (c.pe || 0) + rate * dt * (this.q ? 1 : 0.5);
      while (c.pe > 1 && pl.length < 255) {
        c.pe -= 1;
        const bx = c.x - Math.cos(c.h) * 1.7 + (Math.random() - 0.5) * 1.5, bz = c.z - Math.sin(c.h) * 1.7 + (Math.random() - 0.5) * 1.5;
        pl.push({ x: bx, y: (c.y || 0) + 0.28, z: bz, vx: (Math.random() - 0.5) * 1.8, vy: 0.9 + Math.random() * 1.4, vz: (Math.random() - 0.5) * 1.8, life: 0, max: 0.75 + Math.random() * 0.85, s: 0.45 + Math.random() * 0.40, d: surf.dust });
      }
      if (c.pe > 1) c.pe = 0;
      const dm = Math.max(0, (c.dmg || 0) - 45) + (c.isPlayer && c.temp > 112 ? 30 : 0);
      if (dm > 0) { c.se = (c.se || 0) + dm * 0.09 * dt * (this.q ? 1 : 0.5); while (c.se > 1 && pl.length < 255) { c.se -= 1; const g = 0.18 + Math.random() * 0.12 + (c.temp > 112 ? 0.4 : 0);
        pl.push({ x: c.x + Math.cos(c.h) * 1.6, y: (c.y || 0) + 1.0, z: c.z + Math.sin(c.h) * 1.6, vx: (Math.random() - 0.5) * 0.6 - c.vx * Math.cos(c.h) * 0.2, vy: 1.2 + Math.random(), vz: (Math.random() - 0.5) * 0.6 - c.vx * Math.sin(c.h) * 0.2, life: 0, max: 1.4 + Math.random(), s: 0.5 + Math.random() * 0.4, d: [g, g, g] }); } }
    }
    for (let i = pl.length - 1; i >= 0; i--) { const p = pl[i]; p.life += dt; if (p.life > p.max) { pl[i] = pl[pl.length - 1]; pl.pop(); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.s += dt * 1.65; }
  }

  render(dt) {
    const R = this.R; if (!R) return; const p = this.player, cv = this.cv;
    {
      const v = Math.hypot(p.vx, p.vy); let tgt = p.h;
      if (v > 4 && p.vx > 0) tgt = p.h + 0.55 * wrapA(Math.atan2(p.vx * Math.sin(p.h) + p.vy * Math.cos(p.h), p.vx * Math.cos(p.h) - p.vy * Math.sin(p.h)) - p.h);
      this.camH += wrapA(tgt - this.camH) * Math.min(1, 5 * dt);
    }
    const ch = Math.cos(this.camH), sh = Math.sin(this.camH);
    const pRoll = clamp(-p.vx * p.r * 0.0045, -0.07, 0.07), pPitch = clamp(p.ax * 0.004, -0.045, 0.045);
    for (const c of this.cars) { const ty = this.trk.heightAt(c.x, c.z); c.y = c.y === undefined ? ty : c.y + (ty - c.y) * Math.min(1, 14 * dt); }
    const pY = p.y, pSl = Math.atan(p.slope || 0);
    const pMat = M4.car(p.x, pY, p.z, p.h, pRoll, pPitch + pSl);

    let eye, at, up = [0, 1, 0], fov = 1.05;
    if (this.cam === DEFAULT_CAM) {
      // Förarens ögon bakom ratten, innanför taket och vindrutan.
      // Samma stabila bilram för kamera och kupé: ingen extra skakning/krängning.
      const m = M4.car(p.x, pY, p.z, p.h, 0, pSl);
      const point = (x, y, z) => [m[0]*x + m[4]*y + m[8]*z + m[12], m[1]*x + m[5]*y + m[9]*z + m[13], m[2]*x + m[6]*y + m[10]*z + m[14]];
      eye = point(-0.30, 1.08, -0.31);
      at = point(25, 0.95, -0.31);
      up = [m[4], m[5], m[6]];
      fov = 1.15;
    } else if (this.cam === 0) {
      // GOPRO ROLL-BAR IN-CAR KUPÉVY (Monterad vid B-stolpen [-0.62, 1.06, 0.02] med vidvinkel precis som i de 4 GoPro-referensbilderna!)
      const vib = Math.sin(this.t * 45) * 0.0018 * (p.rpm / 6000);
      const transformPt = (lx, ly, lz) => [
        pMat[0] * lx + pMat[4] * ly + pMat[8] * lz + pMat[12],
        pMat[1] * lx + pMat[5] * ly + pMat[9] * lz + pMat[13],
        pMat[2] * lx + pMat[6] * ly + pMat[10] * lz + pMat[14],
      ];
      eye = transformPt(-0.62, 1.06 + vib, 0.02);
      // Titta snett nedåt-framåt så hela kupén (hjälm, overall-armar, mockaratt, aluminiumpanel, Eventtec-skylt, golvrör & dörrsträvor) syns!
      at = transformPt(8.0, 0.25 + vib, -0.08 + p.steer * 0.85);
      up = [pMat[4], pMat[5], pMat[6]];
      fov = 1.28;
    } else if (this.cam === 1) {
      // HUVKAMERA (framme på motorhuven)
      const c = Math.cos(p.h), s = Math.sin(p.h);
      eye = [p.x + c * 0.55, pY + 1.18, p.z + s * 0.55];
      at = [p.x + c * 14, pY + 0.85 + 14 * (p.slope || 0), p.z + s * 14];
      fov = 1.15;
    } else if (this.cam === 2) {
      // BAKOM NÄRA
      eye = [p.x - ch * 6.8, 0, p.z - sh * 6.8]; eye[1] = Math.max(pY + 2.7, this.trk.heightAt(eye[0], eye[2]) + 1.6);
      at = [p.x + ch * 5, pY + 0.9, p.z + sh * 5];
    } else {
      // BAKOM HÖG
      eye = [p.x - ch * 12.5, 0, p.z - sh * 12.5]; eye[1] = Math.max(pY + 6.8, this.trk.heightAt(eye[0], eye[2]) + 3);
      at = [p.x + ch * 6, pY + 0.6, p.z + sh * 6];
    }

    for (const c of this.cars) if (c.obj && (c.dmg || 0) > 4) this.view.damageCar(c.obj, c.dmg);
    for (const c of this.cars) this.view.poseCar(c.obj, c.x, c.y, c.z, c.h, clamp(-c.vx * c.r * 0.0045, -0.07, 0.07), clamp(c.ax * 0.004, -0.045, 0.045) + Math.atan(c.slope || 0), c.steer, c.wspin, c.brk > 0.1, !(c === p && (this.cam === 0 || this.cam === 1 || this.cam === DEFAULT_CAM)));
    let cockpit = null;
    if (this.cam === 0) { const sway = clamp((p.ay || 0) * 0.045 + Math.sin(this.t * 6.0) * 0.03, -0.45, 0.45);
      cockpit = [pMat, M4.mul(pMat, M4.localRotX(0.16, 0.78, -0.31, 0.22, -p.steer * 0.85)), M4.mul(pMat, M4.localRotX(0.30, 1.06, -0.02, 0.0, sway)), null]; }
    if (this.cam === DEFAULT_CAM) {
      const m = M4.car(p.x, pY, p.z, p.h, 0, pSl);
      cockpit = [null, M4.mul(m, M4.localRotX(0.16, 0.78, -0.31, 0.22, -p.steer * 0.85)), null, m];
    }
    this.view.frame({ eye, at, up, fov, focus: [p.x, pY, p.z], particles: this.pl, dust: this.trk.surf.dust, cockpit });
  }

  hud(dt) {
    const p = this.player, $ = this.$;
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) $('hMsg').className = 'hud-msg'; }
    this.hudT -= dt; if (this.hudT > 0) return; this.hudT = 0.07;

    // 1. 5 Startljus
    const L = $('hLights');
    if (this.state === 'grid') {
      const k = Math.floor(this.gridT / (this.goAt - 0.85) * 5);
      L.querySelectorAll('i').forEach((e, i) => e.className = i < Math.min(5, k) ? 'on' : '');
    } else if (!L.classList.contains('dimmed')) {
      L.querySelectorAll('i').forEach(e => e.className = '');
      L.classList.add('dimmed');
    }

    // 2. Växel, 15-LED Shift Bar, RPM, Fart & Temperatur
    const spdKmh = Math.round(Math.hypot(p.vx, p.vy) * 3.6);
    const rpmRound = Math.round(p.rpm / 50) * 50;
    const gearStr = p.rev ? 'R' : String(p.spec.gearLabels?.[p.gear - 1] ?? p.gear);
    $('hGear').textContent = gearStr;
    $('hRpmT').textContent = rpmRound;
    $('hSpd').textContent = spdKmh;
    $('hTempTxt').textContent = Math.round(p.temp) + ' °C';

    const rpmFrac = clamp((p.rpm - 1200) / (p.spec.redline - 1200), 0, 1);
    const activeLeds = Math.round(rpmFrac * 15);
    $('hLeds').querySelectorAll('i').forEach((el, idx) => {
      if (idx >= activeLeds) el.className = '';
      else el.className = idx < 6 ? 'g' : idx < 11 ? 'y' : 'r';
    });

    // 3. In-Car Digital Rattdisplay i mitten längst ner
    const live = this.livePos(), myPos = live.indexOf(p) + 1;
    const lap = clamp(Math.floor(Math.max(0, p.prog) / this.trk.n) + 1, 1, this.cfg.laps);
    $('wcPos').textContent = 'P' + myPos;
    $('wcLap').textContent = `${lap}/${this.cfg.laps}`;
    $('wcGear').textContent = gearStr;
    $('wcSpd').textContent = spdKmh;
    $('wcRpm').textContent = rpmRound + ' RPM';
    $('wcTemp').textContent = Math.round(p.temp) + '°C';
    $('wcDmg').textContent = Math.round(p.dmg) + '%';
    if (this.useJoker) {
      $('wcJoker').textContent = p.coneDown ? 'L: KEILA!' : p.jokerDone ? 'L: KLAR ✓' : 'L: KVAR';
      $('wcJoker').style.color = p.coneDown ? '#ef4444' : p.jokerDone ? '#34d399' : '#facc15';
    }

    // 4. Vänster Topp: Leaderboard & tidsavstånd
    $('hPos').textContent = myPos;
    $('hLap').textContent = lap;
    const leaderProg = live[0].prog;
    const vRef = Math.max(12, Math.hypot(p.vx, p.vy));
    if (this.cfg.mode !== 'time') {
      $('hOrder').innerHTML = live.map((c, i) => {
        const col = c.isPlayer ? '#facc15' : `rgb(${c.paint.map(v => v * 255 | 0)})`;
        const gapS = i === 0 ? 'ledare' : '+' + fmt(Math.max(0, (leaderProg - c.prog) * this.trk.ds / vRef), 1);
        const jTag = this.useJoker && c.jokerDone && !c.coneDown ? ' <b style="color:#34d399">L</b>' : '';
        const sTag = c.sanction ? ` <b style="color:#fb7185">${c.sanction}</b>` : '';
        return `<div class="${c.isPlayer ? 'me' : ''}"><span class="lb-l"><em class="num">${i + 1}</em><i class="dot" style="background:${col}"></i>${c.name.split(' ')[0]}${jTag}${sTag}</span><span>${gapS}</span></div>`;
      }).join('');
      if (myPos > 1) {
        const ahead = live[myPos - 2];
        const gapAhead = Math.max(0, (ahead.prog - p.prog) * this.trk.ds / vRef);
        $('hGapLbl').textContent = '▲ ' + ahead.name.split(' ')[0];
        $('hGapVal').textContent = '−' + fmt(gapAhead, 1) + ' s';
      } else if (live.length > 1) {
        const behind = live[1];
        const gapBeh = Math.max(0, (p.prog - behind.prog) * this.trk.ds / vRef);
        $('hGapLbl').textContent = '▼ ' + behind.name.split(' ')[0];
        $('hGapVal').textContent = '+' + fmt(gapBeh, 1) + ' s';
      }
    }

    // 5. Bränsle, Skick, Däck & Lisälenkki
    $('hFuelKg').textContent = fmt(p.fuelKg, 1) + ' kg';
    $('hHealthBar').style.width = Math.max(0, 100 - p.dmg) + '%';
    $('hDmgTxt').textContent = `Skada ${Math.round(p.dmg)} % · ${p.radLeak ? 'Kylare läcker!' : 'Kylare OK'}`;
    $('hDbTxt').textContent = p.exhaustLoose ? '>110 dB LÖST!' : '≤110 dB OK';
    $('hDbTxt').style.color = p.exhaustLoose ? '#fb7185' : '#34d399';
    $('hWearF').textContent = Math.round(p.tireWearF) + ' %';
    $('hWearR').textContent = Math.round(p.tireWearR) + ' %';
    const gripPct = Math.round((p.gripF || 1) * 100);
    $('hGripPct').textContent = `${gripPct} / ${gripPct} %`;
    const jBadge = $('hJoker'), jMini = $('hJokerMini');
    if (this.useJoker) {
      if (p.coneDown) { jBadge.textContent = 'KEILA (Li)'; jBadge.className = 'hud-badge warn'; jMini.textContent = 'Lisälenkki: KEILA (Li)'; jMini.style.color = '#ef4444'; }
      else if (p.jokerDone) { jBadge.textContent = 'LISÄL. ✓'; jBadge.className = 'hud-badge on'; jMini.textContent = 'Lisälenkki: KÖRD ✓'; jMini.style.color = '#34d399'; }
      else { jBadge.textContent = 'LISÄLENKKI'; jBadge.className = 'hud-badge warn'; jMini.textContent = 'Lisälenkki: EJ KÖRD'; jMini.style.color = '#facc15'; }
    }

    // 6. Underlag, Bredd & Tider
    const curSurf = this.trk.surfAt ? this.trk.surfAt(p.i) : this.trk.surf;
    const curWidth = Math.round((this.trk.hwAt ? this.trk.hwAt(p.i) : this.trk.hw) * 2);
    $('hSurf').textContent = curSurf.name;
    $('hWidth').textContent = curWidth + ' m';
    $('hMuBar').style.width = Math.min(100, Math.round(curSurf.mu * 95)) + '%';
    const curLapT = Math.max(0, this.t - p.lastLapT);
    $('hTime').textContent = fmtTime3(curLapT);
    if (p.laps.length) $('hLastLap').textContent = fmtTime3(p.laps[p.laps.length - 1]);
    if (isFinite(p.bestLap)) {
      $('hBest').textContent = fmtTime3(p.bestLap);
      const frac = clamp(((p.prog % this.trk.n) + this.trk.n) % this.trk.n / this.trk.n, 0.01, 1);
      const dlt = curLapT - p.bestLap * frac;
      $('hDelta').textContent = (dlt >= 0 ? '+' : '−') + fmt(Math.abs(dlt), 2) + ' s';
      $('hDelta').style.color = dlt <= 0 ? '#34d399' : '#fb7185';
    }
    ['hS1', 'hS2', 'hS3'].forEach((id, idx) => {
      $(id).textContent = `S${idx + 1} ${p.sectors[idx] ? fmt(p.sectors[idx], 1) : '–'}`;
    });

    // 7. Vänster Botten: MOTORN JUST NU (Realtids MEP-telemetri vid aktuellt varvtal & gaspådrag!)
    const eng = engineAt(p.spec, Math.max(900, p.rpm));
    const thrScale = 0.08 + 0.92 * p.thr;
    const bmepNow = eng.bmep * thrScale - (1 - p.thr) * (eng.fmep + eng.pmep) * 0.65;
    const exmepNow = eng.exmep * thrScale;
    const htmepNow = eng.htmep * thrScale;
    const fmepNow = eng.fmep;
    const pmepNow = eng.pmep;
    $('mValBmep').textContent = fmt(bmepNow, 1) + ' bar';
    $('mValExmep').textContent = fmt(exmepNow, 1) + ' bar';
    $('mValHtmep').textContent = fmt(htmepNow, 1) + ' bar';
    $('mValFmep').textContent = fmt(fmepNow, 1) + ' bar';
    $('mValPmep').textContent = fmt(pmepNow, 1) + ' bar';
    $('mBarBmep').style.width = clamp(Math.abs(bmepNow) / 18 * 100, 4, 100) + '%';
    $('mBarExmep').style.width = clamp(exmepNow / 18 * 100, 4, 100) + '%';
    $('mBarHtmep').style.width = clamp(htmepNow / 14 * 100, 4, 100) + '%';
    $('mBarFmep').style.width = clamp(fmepNow / 5 * 100, 4, 100) + '%';
    $('mBarPmep').style.width = clamp(Math.abs(pmepNow) / 3 * 100, 4, 100) + '%';
    $('mValEtab').textContent = fmt(Math.max(0, eng.etab * 100 * p.thr), 1) + ' %';
    $('mValKnock').textContent = fmt(eng.margin, 1);
    $('mValKnock').style.color = eng.margin < 0 ? '#ef4444' : '#34d399';
    $('mValBsfc').textContent = `Förbrukning: ${fmt(eng.mf * 1000 * p.thr, 1)} g/s · bsfc ${Math.round(eng.bsfc * (p.thr > 0.1 ? 1 : 0))} g/kWh`;

    // 8. Däcktemperaturer, G-kraft, Radar & Minimap
    $('hTfl').textContent = Math.round(p.tireTemp[0]) + '°C';
    $('hTfr').textContent = Math.round(p.tireTemp[1]) + '°C';
    $('hTrl').textContent = Math.round(p.tireTemp[2]) + '°C';
    $('hTrr').textContent = Math.round(p.tireTemp[3]) + '°C';
    $('hTbrk').textContent = Math.round(p.brakeTemp) + ' °C';
    this.drawMap();
    this.drawRadar();
    this.drawGForce();
  }
}

// Beräknad 0–100 km/h-tid: kör bilens egen fysik rakt fram på torr asfalt med fullgas och automatväxling
export function accel0100(spec) {
  const trk = { surf: { mu: 1.0, B: 9, C: 1.35, crr: 0.015 }, surface: 'asfalt' };
  const tq = torqueTable(spec); let upRpm = spec.redline - 120, bp = 0;
  for (let r = 2000; r <= spec.redline; r += 250) { const p = tq(r) * r; if (p > bp) { bp = p; upRpm = Math.min(spec.redline - 120, r + 350); } }
  const c = { spec, tq, upRpm, x: 0, z: 0, h: 0, vx: 0, vy: 0, r: 0, ax: 0, ay: 0, rpm: spec.idle, gear: 1, thr: 1, brk: 0, steer: 0, hb: 0, shiftT: 0, pow: 1, onSurf: true, aids: { abs: 1, tc: 1, auto: 1 }, i: 0 };
  let t = 0; const dt = 1 / 120;
  while (c.vx < 100 / 3.6 && t < 60) { phys(c, dt, trk); t += dt; }
  return t;
}
