// Heatet: körfysik, AI, kollisioner, lisälenkki, varningskoder (A1–B9), Vi/Li/K/KA,
// autentisk 3D In-Car kupévy med roterande mockaratt samt Pro Telemetri-HUD inspirerad av referensbilden.
import { getTrack } from './track.js';
import { initGL, M4, carMesh, worldMesh, cockpitMesh, steerWheelMesh, pendantMesh } from './gl.js';
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
    i: trk.n - back, pf: trk.n - back, lat, prog: -back, onSurf: true,
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
  const L = s.wb, a = L * (1 - s.front), b = L * s.front, m = s.mass, fwd = s.drv === 'fwd';
  const mu = surf.mu * s.mu * (c.onSurf ? 1 : 0.72 + 0.12 * s.susp), crr = c.onSurf ? surf.crr : 0.09 - 0.03 * s.susp;
  const v = Math.hypot(c.vx, c.vy), delta = c.steer * 0.52 / (1 + v * 0.035);
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
    if (c.shiftT > 0) c.shiftT -= dt;
    else if (rpm < s.redline) Fd = c.tq(rpm) * c.thr * c.pow * gr * s.eff / s.rw;
    if (c.thr < 0.05 && c.vx > 1) Fd -= (0.97 + 0.15 * rpm / 1000) * 1e5 * s.Vd * 1e-3 / 12.566 * gr / s.rw;
    const capF = mu * Fzf, capR = mu * Fzr, capD = (fwd ? capF : capR) * (s.trac ? 1 : 0.86);
    let slip = 0, latD = 1;
    if (c.aids.tc) { const need = Math.abs(shape(fwd ? af : ar)); const lim = capD * 0.97 * Math.sqrt(Math.max(0.08, 1 - 0.92 * need * need)); if (Fd > lim) Fd = lim; }
    else if (Fd > capD) { slip = Math.min(1.5, Fd / capD - 1); Fd = capD * (0.93 - 0.08 * Math.min(1, slip)); latD = 1 / (1 + 1.6 * slip); }
    if (Fd < -capD) Fd = -capD;
    c.slip = slip;
    let Fbf = 0, Fbr = 0, lockF = false, lockR = false; const sg = c.vx >= 0 ? 1 : -1;
    if (c.brk > 0) { const Fb = c.brk * 1.12 * m * G * s.brake; Fbf = Fb * s.bias; Fbr = Fb * (1 - s.bias);
      if (Fbf > capF) { if (c.aids.abs) Fbf = capF * 0.96; else { lockF = true; Fbf = capF * 0.82; } }
      if (Fbr > capR) { if (c.aids.abs) Fbr = capR * 0.96; else { lockR = true; Fbr = capR * 0.82; } } }
    if (c.hb) { lockR = true; Fbr = capR * 0.85; }
    c.lock = lockF || lockR;
    const Fxf = (fwd ? Fd : 0) - sg * Fbf, Fxr = (fwd ? 0 : Fd) - sg * Fbr;
    const latF = (al, cap, Fx, sc) => -cap * Math.sqrt(Math.max(0.12, 1 - (Fx / cap) ** 2)) * sc * shape(al);
    const Fyf = latF(af, capF, Fxf, (fwd ? latD : 1) * (lockF ? 0.3 : 1) * (s.trac && fwd ? 0.95 : 1));
    const Fyr = latF(ar, capR, Fxr, (fwd ? 1 : latD) * (lockR ? 0.35 : 1) * 1.05);
    const drag = 0.6 * s.CdA * c.vx * Math.abs(c.vx) + (Math.abs(c.vx) > 0.2 ? crr * m * G * sg : 0);
    const cd = Math.cos(delta), sd = Math.sin(delta);
    const axn = (Fxf * cd - Fyf * sd + Fxr - drag) / m, ayn = (Fyf * cd + Fxf * sd + Fyr) / m;
    const Mz = a * (Fyf * cd + Fxf * sd) - b * Fyr;
    c.vx += (axn + c.vy * c.r) * dt; c.vy += (ayn - c.vx * c.r) * dt; c.r += Mz / (m * L * L * 0.36) * dt;
    c.ax += (axn - c.ax) * Math.min(1, 12 * dt);
    c.ay += (ayn - c.ay) * Math.min(1, 12 * dt);
    if (Math.abs(c.vx) < 2.5) { c.vy *= 1 - Math.min(1, 6 * dt); c.r *= 1 - Math.min(1, 3 * dt); }
    if (c.brk > 0.1 && Math.abs(c.vx) < 0.35 && c.thr < 0.05) c.vx = 0;
    c.rpm = Math.min(s.redline + 60, rpm * (1 + Math.min(slip, 0.6) * 0.45));
    // växling
    if (c.aids.auto && c.shiftT <= 0) {
      if (c.gear < s.gears.length && wheelRpm > c.upRpm && slip < 0.3) { c.gear++; c.shiftT = s.shift; }
      else if (c.gear > 1 && wheelRpm * s.gears[c.gear - 2] / s.gears[c.gear - 1] < c.upRpm * 0.8) { c.gear--; c.shiftT = s.shift * 0.6; }
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
      if (Math.abs(dl) < 2.4) { target = dl > 0 ? -2.8 : 2.8; if (dp < 3.2 && Math.abs(dl) < 1.7) cap = Math.hypot(o.vx, o.vy) + 0.5; }
    }
  }
  ai.off += (target - ai.off) * Math.min(1, 2.5 * dt);
  let off = lineAt(la) + ai.off;
  const lims = trk.limits(trk.w(la)); off = clamp(off, lims[0] + 1.6, lims[1] - 1.6);
  const [tx, tz] = trk.point(la, off);
  const err = wrapA(Math.atan2(tz - c.z, tx - c.x) - c.h);
  if (Math.abs(err) > 1.9 && v < 7) ai.back = 1; else if (Math.abs(err) < 0.9) ai.back = 0;
  if (ai.back) { c.rev = true; c.thr = 0; c.brk = 0; c.steer = err > 0 ? -1 : 1; return; }
  c.rev = false;
  const st = clamp(err * 2.4, -1, 1);
  c.steer += clamp(st - c.steer, -7 * dt, 7 * dt);
  let vt = ai.prof[trk.w(idx + 2)];
  if (wantJ && idx < j.i2 - 4 && idx > j.i1 - 60) {
    const dist = Math.max(0, (j.i1 + 3 - idx) * trk.ds);
    const jFactor = j.uShape ? 0.58 : 0.85;
    vt = Math.min(vt, Math.sqrt((ai.vJ * jFactor) ** 2 + 2 * ai.aB * dist));
  }
  if (wantJ && idx >= j.i1 && idx <= j.i2 && j.uShape) vt = Math.min(vt, ai.vJ * 0.62);
  vt = Math.min(vt, cap);
  if (v < vt - 0.4) { c.thr = clamp(1 - Math.abs(c.steer) * 0.45, 0.35, 1); c.brk = 0; }
  else if (v > vt + 0.8) { c.thr = 0; c.brk = clamp((v - vt) / 3.5, 0.15, 1); }
  else { c.thr = 0.35; c.brk = 0; }
  if (v < 1.2 && race.t > 2) { ai.stuck += dt; if (ai.stuck > 2.5) { race.resetCar(c); ai.stuck = 0; } } else ai.stuck = 0;
}

const CAM_NAMES = ['IN-CAR KUPÉ', 'HUVKAMERA', 'BAKOM NÄRA', 'BAKOM HÖG'];

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
              <button class="hud-mini-btn on" id="hCamBtn" title="Byt kamera (C)">🎥 GOPRO IN-CAR [C]</button>
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

          <div class="hud-keys-bar" id="hKeys">W/↑ gas · S/↓ broms/back · A/D styr · Mellanslag handbroms · E/Q växla · C kamera (In-Car / Huv / Bakom) · R återställ · P paus</div>
        </div>

        <div class="touch" id="hTouch"><div class="t-l"><button data-k="left">◀</button><button data-k="right">▶</button></div>
          <div class="t-r"><button data-k="hb" class="t-s">HAND</button><button data-k="brk" class="t-b">BROMS</button><button data-k="gas" class="t-g">GAS</button></div></div>
        <div class="pause" id="hPauseBox" hidden><div><h2>Paus</h2><button class="btn" id="hResume">Fortsätt</button><button class="btn ghost" id="hQuit">Bryt heatet (K – stanna vid STOP)</button></div></div>
      </div></div>`;

    this.$ = id => host.querySelector('#' + id);
    this.cv = host.querySelector('.race-cv');
    this.R = initGL(this.cv);
    const q = cfg.settings?.quality === 'lag' ? 0 : 1; this.q = q;
    if (this.R) {
      this.world = this.R.mesh(worldMesh(trk, q));
      this.cockpit = this.R.mesh(cockpitMesh());
      this.steerWheel = this.R.mesh(steerWheelMesh());
      this.pendant = this.R.mesh(pendantMesh());
      this.meshes = {};
    }
    this.env = trk.winter
      ? { zenith: [0.46, 0.62, 0.82], fog: [0.82, 0.88, 0.94], fd: 0.000014, light: [0.42, 0.78, 0.32] }
      : { zenith: [0.18, 0.44, 0.78], fog: [0.64, 0.78, 0.92], fd: 0.000009, light: [0.48, 0.82, 0.36] };

    // Bilar
    const defs = []; const N = cfg.opps.length + 1, pslot = clamp(cfg.grid ?? N - 1, 0, N - 1); let oi = 0;
    for (let sl = 0; sl < N; sl++) defs.push(sl === pslot ? { ...cfg.player, isP: true } : cfg.opps[oi++]);
    this.cars = defs.map((d, sl) => makeCar(d, trk, sl, !!d.isP, this.gridRows, N));
    this.player = this.cars.find(c => c.isPlayer);
    if (location.search.includes('auto')) { const c = this.player; c.auto = true; c.skill = 0.97; c.ai = { jokerLap: 0, off: 0, stuck: 0, prof: null }; c.aids = { abs: 1, tc: 1, auto: 1 }; }
    this.player.dmg = cfg.dmg0 || 0; this.player.radLeak = !!cfg.radLeak0;
    const needMirrors = !this.sideContact;
    for (const c of this.cars) {
      if (this.R) {
        const key = [c.spec.body, c.spec.dmg < 1 ? 'b' : '', c.spec.chop ? 'c' : '', needMirrors ? 'm' : '', c.bw || 'wb'].join(':');
        c.mesh = this.meshes[key] || (this.meshes[key] = this.R.mesh(carMesh(c.spec.body, { bars: c.spec.dmg < 1, chop: !!c.spec.chop, mirrors: needMirrors, bw: c.bw })));
      }
      if (c.ai) {
        const mu = trk.surf.mu * c.spec.mu, k = c.skill; const top = 50;
        c.ai.prof = trk.profile(mu * G * 0.90 * k * k, mu * G * 0.70 * k, top); c.ai.vJ = Math.sqrt(mu * G * 0.85 * k * k * 21); c.ai.aB = mu * G * 0.6 * k;
        c.ai.jokerLap = Math.floor(Math.random() * cfg.laps);
      }
    }
    // Standardkamera = 0 (IN-CAR KUPÉ med 3D-störtbur, flockad bräda, sidospeglar & roterande mockaratt!)
    this.t = 0; this.state = 'grid'; this.gridT = 0; this.goAt = 3.6 + Math.random() * 1.2; this.acc = 0;
    this.cam = 0;
    this.camH = this.player.h; this.keys = {}; this.touch = {};
    this.startPos = [this.player.x, this.player.z]; this.msgT = 0; this.hudT = 0; this.paused = false; this.done = false;
    this.parts = new Float32Array(260 * 54); this.pl = [];
    this.buildMap(); this.bind(); this.resize();
    const touchMode = cfg.settings?.touch || 'auto'; const showTouch = touchMode === 'on' || (touchMode === 'auto' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
    this.$('hTouch').style.display = showTouch ? '' : 'none'; if (showTouch) this.$('hKeys').style.display = 'none';
    if (cfg.mode === 'time') { this.$('hLbCard').style.display = 'none'; }
    this.audioInit();
    this.last = performance.now(); this.raf = requestAnimationFrame(t => this.frame(t));
  }

  cycleCam() {
    this.cam = (this.cam + 1) % 4;
    const btn = this.$('hCamBtn');
    if (btn) btn.textContent = `🎥 ${CAM_NAMES[this.cam]} [C]`;
    const wc = this.$('hWheelCluster');
    if (wc) wc.style.display = this.cam === 1 ? '' : 'none';
  }

  toggleTele() {
    const root = this.$('hHudRoot'), btn = this.$('hTeleBtn');
    if (!root) return;
    const isClean = root.classList.toggle('gopro-clean');
    if (btn) btn.classList.toggle('on', !isClean);
  }

  bind() {
    const map = { ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brk', KeyS: 'brk', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'hb' };
    this.kd = e => {
      if (map[e.code]) { this.keys[map[e.code]] = 1; e.preventDefault(); }
      else if (e.code === 'KeyE' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.shift(1);
      else if (e.code === 'KeyQ' || e.code === 'ControlLeft') this.shift(-1);
      else if (e.code === 'KeyC') this.cycleCam();
      else if (e.code === 'KeyT') this.toggleTele();
      else if (e.code === 'KeyR') { if (this.state === 'run') this.resetCar(this.player); }
      else if (e.code === 'KeyP' || e.code === 'Escape') this.togglePause();
    };
    this.ku = e => { if (map[e.code]) this.keys[map[e.code]] = 0; };
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
    this.$('hQuit').onclick = () => { this.player.retired = true; this.player.flag = 'K'; this.finish(); };
  }

  togglePause() { if (this.done) return; this.paused = !this.paused; this.$('hPauseBox').hidden = !this.paused; this.last = performance.now(); if (this.gain) this.gain.gain.value = 0; }
  shift(d) { const c = this.player; if (this.state !== 'run' || c.shiftT > 0) return; const g = c.gear + d; if (g >= 1 && g <= c.spec.gears.length) { c.gear = g; c.shiftT = c.spec.shift; } }
  resize() { const r = this.cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, this.q ? 2 : 1.25); this.cv.width = Math.max(2, r.width * dpr | 0); this.cv.height = Math.max(2, r.height * dpr | 0); }
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
      this.o1 = o1; this.o2 = o2; this.gain = g; this.lp = lp; this.vol = vol; } catch (e) { } }
  audio() { if (!this.gain) return; const c = this.player, f = c.rpm / 60 * c.spec.cyl / 2, t = this.ac.currentTime;
    this.o1.frequency.setTargetAtTime(f, t, 0.03); this.o2.frequency.setTargetAtTime(f / 2, t, 0.03); this.lp.frequency.setTargetAtTime(500 + c.rpm * 0.25 + c.thr * 900, t, 0.05);
    this.gain.gain.setTargetAtTime(this.vol * (0.035 + 0.075 * c.thr), t, 0.05); }
  input(dt) { const c = this.player, k = this.keys, t = this.touch;
    const gas = k.gas || t.gas, brk = k.brk || t.brk, st = (k.right || t.right ? 1 : 0) - (k.left || t.left ? 1 : 0);
    c.thr += clamp((gas ? 1 : 0) - c.thr, -8 * dt, 5 * dt); c.brk += clamp((brk ? 1 : 0) - c.brk, -10 * dt, 6 * dt); c.hb = k.hb || t.hb ? 1 : 0;
    const rate = st === 0 ? 5.5 : (Math.sign(st) !== Math.sign(c.steer) && c.steer !== 0 ? 7 : 3.2);
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
        setTimeout(() => this.finish(), 2200);
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
      if (this.gridT >= this.goAt) { this.state = 'run'; this.msg('KÖR! 🏁', 1.2, 'go'); }
      else {
        for (const c of this.cars) if (!c.isPlayer) { c.thr = 0; c.brk = 1; }
        if (p.auto) { p.thr = 0; return; }
        if (!p.jump && Math.hypot(p.x - this.startPos[0], p.z - this.startPos[1]) > 0.35) {
          p.jump = true;
          this.msg('Vi – VILPPILÄHTÖ!<br><small>Rörde bilen efter STOP-skylten ("löysiä pois") → sist av målgångna!</small>', 3.4, 'warn');
        }
        phys(p, dt, trk); trackStep(p, trk, 0, this.useJoker); return;
      }
    }
    if (this.state !== 'run' && this.state !== 'flag') return;
    this.t += dt;
    for (const c of this.cars) {
      if (c.isPlayer) {
        if (this.state === 'run' && !c.finished && !c.retired) {
          if (c.auto) aiDrive(c, this, dt); else this.input(dt);
        } else { c.thr = 0; c.brk = 0.55; c.steer *= 0.95; c.hb = 0; }
      } else if (!c.finished && !c.retired) aiDrive(c, this, dt);
      else { c.thr = 0; c.brk = 0.45; }

      phys(c, dt, trk);
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
          setTimeout(() => this.finish(), 2400);
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
        c.tireWearF = Math.min(35, c.tireWearF + (0.04 + c.slip * 0.15) * dt);
        c.tireWearR = Math.min(35, c.tireWearR + (0.04 + Math.abs(c.vy) * 0.03) * dt);
        c.fuelKg = Math.max(1.0, c.fuelKg - 0.008 * c.thr * dt);
      }
    }

    // Bil mot bil + varningskoder
    for (let a = 0; a < this.cars.length; a++) for (let b = a + 1; b < this.cars.length; b++) {
      const A = this.cars[a], B = this.cars[b];
      if (Math.abs(A.x - B.x) > 6 || Math.abs(A.z - B.z) > 6) continue;
      const hit = collide(A, B);
      if (hit > 1.2 && (A.isPlayer || B.isPlayer)) {
        this.damage(hit * hit * 0.09, true);
        const other = A.isPlayer ? B : A;
        const rammer = collide.front === 'A' ? A : collide.front === 'B' ? B : null;
        const j = trk.joker;
        if (this.state === 'flag' && hit > 3.0) {
          this.giveSanction(p, 'B6', 'Ruutulipun jälkeinen päälleajo', 'Påkörning efter målflagg');
        } else if (this.useJoker && p.i >= j.i2 - 8 && p.i <= j.i2 + 6 && Math.abs(p.lat - trk.bulge(p.i)) < j.w && hit > 2.6) {
          this.giveSanction(p, 'A8', 'Lisälenkiltä eteen', 'Lisälenkiltä tulija on väistämisvelvollinen!');
        } else if (this.t < 4.0 && Math.abs(p.steer) > 0.35 && hit > 2.8) {
          this.giveSanction(p, 'A7', 'Häiritsevä kaistanvaihto (lähdössä)', 'Störande filbyte före/i starten');
        } else if (!this.sideContact && collide.type === 'side' && hit > 2.6) {
          this.giveSanction(p, 'A3', 'Kylkikosketus', 'Sidokontakt är förbjuden i Junior och Super!');
        } else if (rammer && rammer.isPlayer && Math.abs(other.r) > 1.5 && hit > 3.6) {
          this.giveSanction(p, 'A1', 'Takakulmatyöntö / pyöräytys', 'Snurrade en medtävlare i bakhörnet');
        } else if (rammer && rammer.isPlayer && collide.type === 'rear' && hit > 4.2) {
          this.giveSanction(p, 'A6', 'Töniminen ja/tai peräänajo', 'Hård påkörning bakifrån');
        }
      }
    }

    if (p.dmg >= 100 && !p.retired && this.state === 'run') {
      p.retired = true; this.state = 'flag';
      this.msg('K – KESKEYTTÄNYT<br><small>Bilen höll inte – stanna vid STOP-märket!</small>', 3.2, 'warn');
      setTimeout(() => this.finish(), 2200);
    }
    if (this.state === 'flag' && this.flagT !== undefined && this.t - this.flagT > 3) this.finish();
    if (this.t > 600) this.finish();
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
    else if (p.jump) this.msg('RUUTULIPPU – Vi!<br><small>Vilppilähtö → sist av målgångna. Stanna vid STOP-merkki!</small>', 3.2, 'warn');
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
      if (hasLi) tags.push('Li');
      if (c.jump) tags.push('Vi');
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

  finish() {
    if (this.done) return; this.done = true; const rows = this.order(), p = this.player;
    const pRow = rows.find(r => r.isPlayer);
    const res = {
      order: rows.map(r => ({ name: r.name, isPlayer: r.isPlayer, flag: r.flag, time: r.c.finished && !r.c.retired ? r.t : null })),
      pos: rows.findIndex(r => r.isPlayer) + 1,
      bestLap: p.bestLap, dmg: p.dmg, flag: pRow.flag, sanction: p.sanction, kaato: p.kaato,
      exhaustLoose: p.exhaustLoose, finished: p.finished && !p.retired,
      time: p.finished && !p.retired ? p.finishT : null, radLeak: p.radLeak,
    };
    this.destroy(); this.cfg.onDone(res);
  }

  destroy() {
    cancelAnimationFrame(this.raf); window.removeEventListener('keydown', this.kd); window.removeEventListener('keyup', this.ku); window.removeEventListener('resize', this.rs);
    try { if (this.ac) this.ac.close(); } catch (e) { } this.dead = true;
  }

  frame(now) {
    if (this.dead) return; this.raf = requestAnimationFrame(t => this.frame(t));
    let dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (!this.paused) { this.acc += dt; let k = 0; while (this.acc >= DT && k++ < 14) { this.step(DT); this.acc -= DT; if (this.done) return; } if (this.acc > DT * 4) this.acc = 0; this.particlesStep(dt); this.audio(); }
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
        pl.push({ x: bx, y: 0.28, z: bz, vx: (Math.random() - 0.5) * 1.8, vy: 0.9 + Math.random() * 1.4, vz: (Math.random() - 0.5) * 1.8, life: 0, max: 0.75 + Math.random() * 0.85, s: 0.45 + Math.random() * 0.40, d: surf.dust });
      }
      if (c.pe > 1) c.pe = 0;
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
    const pMat = M4.car(p.x, 0, p.z, p.h, pRoll, pPitch);

    let eye, at, up = [0, 1, 0], fov = 1.05;
    if (this.cam === 0) {
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
      eye = [p.x + c * 0.55, 1.18, p.z + s * 0.55];
      at = [p.x + c * 14, 0.85, p.z + s * 14];
      fov = 1.15;
    } else if (this.cam === 2) {
      // BAKOM NÄRA
      eye = [p.x - ch * 6.8, 2.7, p.z - sh * 6.8];
      at = [p.x + ch * 5, 0.9, p.z + sh * 5];
    } else {
      // BAKOM HÖG
      eye = [p.x - ch * 12.5, 6.8, p.z - sh * 12.5];
      at = [p.x + ch * 6, 0.6, p.z + sh * 6];
    }

    const vp = M4.mul(M4.persp(fov, cv.width / cv.height, 0.08, 1400), M4.look(eye, at, up));
    R.begin(vp, this.env, eye, pPitch);
    R.draw(this.world, M4.ident());

    // Rita alla bilar (utom spelarens ytterkaross i In-Car & Huvkamera)
    for (const c of this.cars) {
      if (c === p && (this.cam === 0 || this.cam === 1)) continue;
      R.draw(c.mesh, M4.car(c.x, 0, c.z, c.h, clamp(-c.vx * c.r * 0.0045, -0.07, 0.07), clamp(c.ax * 0.004, -0.045, 0.045)), c.paint);
    }

    // Damm & rökpartiklar
    const pl = this.pl;
    if (pl.length) {
      const fx = at[0] - eye[0], fy = at[1] - eye[1], fz = at[2] - eye[2];
      let rx = fy * up[2] - fz * up[1], ry = fz * up[0] - fx * up[2], rz = fx * up[1] - fy * up[0];
      const l = Math.hypot(rx, ry, rz) || 1; rx /= l; ry /= l; rz /= l;
      let ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
      const lu = Math.hypot(ux, uy, uz) || 1; ux /= lu; uy /= lu; uz /= lu;
      const A = this.parts, defD = this.trk.surf.dust; let o = 0;
      for (const q of pl) {
        const d = q.d || defD, al = 0.5 * (1 - q.life / q.max), s = q.s;
        const cs = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
        for (const [a, b] of cs) {
          A[o++] = q.x + (rx * a + ux * b) * s; A[o++] = q.y + (ry * a + uy * b) * s; A[o++] = q.z + (rz * a + uz * b) * s;
          A[o++] = d[0]; A[o++] = d[1]; A[o++] = d[2]; A[o++] = al; A[o++] = a; A[o++] = b;
        }
      }
      R.particles(A, pl.length);
    }

    // Rita 3D GoPro In-Car Kupé + Roterande 3-ekrad Mockaratt med handskar/underarmar + Dinglande Doftkort!
    if (this.cam === 0 && this.cockpit && this.steerWheel) {
      R.clearDepth();
      R.draw(this.cockpit, pMat, p.paint, true);
      // Ratten sitter vid [0.16, 0.78, -0.31], lutad 0.22 rad uppåt och roterar med styrutslaget p.steer!
      const wLocal = M4.localRotX(0.16, 0.78, -0.31, 0.22, -p.steer * 0.85);
      R.draw(this.steerWheel, M4.mul(pMat, wLocal), p.paint, true);
      if (this.pendant) {
        const sway = clamp((p.ay || 0) * 0.045 + Math.sin(this.t * 6.0) * 0.03, -0.45, 0.45);
        const pLocal = M4.localRotX(0.30, 1.06, -0.02, 0.0, sway);
        R.draw(this.pendant, M4.mul(pMat, pLocal), p.paint, true);
      }
    }
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
    const gearStr = p.rev ? 'R' : String(p.gear);
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
    const gripPct = Math.round((1 - (p.tireWearF + p.tireWearR) * 0.003) * 100);
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
