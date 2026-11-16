// Heatet: körfysik, AI, kollisioner, lisälenkki, varningskoder (A1–B9), Vi/Li/K/KA och exakt målgångsordning enligt Sääntökirja 2026.
import { getTrack } from './track.js';
import { initGL, M4, carMesh, worldMesh } from './gl.js';
import { torqueTable, engineAt } from './engine.js';

const G = 9.81, DT = 1 / 240;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
export const fmtTime = t => { if (!isFinite(t)) return '–'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); };

export function makeCar(def, trk, slot, isPlayer, gridRows = 2, totalCars = 6) {
  const s = def.spec;
  let row, col, back, lat;
  if (gridRows === 1) {
    // Sääntökirja s. 11: "Lähtö tapahtuu junior-, lady- ja super, senior- ja super-senior-luokissa yhdestä rivistä."
    row = 0; col = slot;
    back = 2.5;
    const span = Math.min((trk.hwAt ? trk.hwAt(0) : trk.hw) * 1.55, 11.5);
    lat = totalCars > 1 ? ((slot / (totalCars - 1)) - 0.5) * span : 0;
  } else {
    // Sääntökirja s. 11: "Lähtö tapahtuu kardaani- ja vetari-luokissa pääsääntöisesti kahdesta rivistä.
    // Autot sijoitetaan lähtöviivalle niin, että etu- ja takaviivan väli tulisi olla noin 7m." (3.5 * ds = 7.0 m!)
    row = Math.floor(slot / 3); col = slot % 3;
    back = 2.5 + row * 3.5;
    lat = (col - 1) * 3.3;
  }
  const [x, z, h] = trk.point(trk.n - back, lat);
  const tq = torqueTable(s);
  const cool = [], marg = []; for (let r = 0; r <= s.redline + 500; r += 500) { const e = engineAt(s, Math.max(r, 800)); cool.push(e.qCool); marg.push(e.margin); }
  let upRpm = s.redline - 120; { let bp = 0; for (let r = 2000; r <= s.redline; r += 250) { const p = tq(r) * r; if (p > bp) { bp = p; upRpm = Math.min(s.redline - 120, r + 350); } } }
  return {
    name: def.name, paint: def.paint, bw: def.bw || 'wb', isPlayer, spec: s, tq, cool, marg, upRpm,
    x, z, h, vx: 0, vy: 0, r: 0, ax: 0, rpm: s.idle, gear: 1, thr: 0, brk: 0, steer: 0, hb: 0,
    i: trk.n - back, pf: trk.n - back, lat, prog: -back, onSurf: true,
    jokerDone: false, coneDown: false, jump: false, retired: false, kaato: false,
    sanction: '', sanctionT: Infinity, warnCount: 0,
    finished: false, finishT: 0, flag: '', dmg: 0, temp: 85, exhaustLoose: false,
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
  // Kontrollera koner (keilat) vid lisälenkki: "hipaista saa, mutta keila ei saa kaatua" (Sääntökirja s. 14)
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
  // Vallarna (penkat)
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

export class Race {
  constructor(host, cfg) {
    this.host = host; this.cfg = cfg; this.trk = getTrack(cfg.trackId); const trk = this.trk;
    this.useJoker = cfg.mode === 'time' ? false : (cfg.useJoker !== undefined ? cfg.useJoker : false);
    this.sideContact = cfg.sideContact !== undefined ? cfg.sideContact : true;
    this.gridRows = cfg.gridRows || 2;
    host.innerHTML = `<div class="race"><canvas class="race-cv"></canvas>
      <div class="hud">
        <div class="hud-top"><div class="hud-pos"><b id="hPos">1</b><span>/ ${cfg.opps.length + 1}</span></div>
          <div class="hud-mid"><div class="hud-title">${cfg.title || trk.name}</div><div class="hud-lap">Varv <b id="hLap">1</b> / ${cfg.laps} · <span id="hTime">0:00.00</span></div><div class="hud-best" id="hBest"></div></div>
          <canvas id="hMap" width="165" height="165"></canvas></div>
        <div class="hud-lights" id="hLights">${'<i></i>'.repeat(5)}</div>
        <div class="hud-msg" id="hMsg"></div>
        <div class="hud-joker" id="hJoker">${this.useJoker ? 'LISÄLENKKI<br><b>EJ KÖRD</b>' : 'LISÄLENKKI<br><b>KÖRS EJ I KLASSEN</b>'}</div>
        <div class="hud-order" id="hOrder"></div>
        <div class="hud-dash"><div class="hud-gear" id="hGear">1</div>
          <div class="hud-rpmwrap"><div class="hud-rpm"><i id="hRpm"></i></div><div class="hud-rpmtxt"><span id="hRpmT">0</span> rpm · <span id="hSurf">Grus</span></div>
            <div class="hud-bars"><span>SKADA</span><div><i id="hDmg"></i></div><span>TEMP</span><div><i id="hTemp"></i></div></div></div>
          <div class="hud-speed"><b id="hSpd">0</b><span>km/h</span></div></div>
        <div class="hud-keys" id="hKeys">W/↑ gas · S/↓ broms/back · A/D styr · Mellanslag handbroms · E/Q växla · C kamera · R återställ · P paus</div>
        <div class="touch" id="hTouch"><div class="t-l"><button data-k="left">◀</button><button data-k="right">▶</button></div>
          <div class="t-r"><button data-k="hb" class="t-s">HAND</button><button data-k="brk" class="t-b">BROMS</button><button data-k="gas" class="t-g">GAS</button></div></div>
        <button class="hud-pause" id="hPause">II</button>
        <div class="pause" id="hPauseBox" hidden><div><h2>Paus</h2><button class="btn" id="hResume">Fortsätt</button><button class="btn ghost" id="hQuit">Bryt heatet (K – stanna vid STOP)</button></div></div>
      </div></div>`;
    this.$ = id => host.querySelector('#' + id);
    this.cv = host.querySelector('.race-cv');
    this.R = initGL(this.cv);
    const q = cfg.settings?.quality === 'lag' ? 0 : 1; this.q = q;
    if (this.R) { this.world = this.R.mesh(worldMesh(trk, q)); this.meshes = {}; }
    this.env = trk.winter ? { fog: [0.82, 0.87, 0.92], fd: 0.000016, light: [0.4, 0.75, 0.3] } : { fog: [0.63, 0.77, 0.90], fd: 0.000010, light: [0.45, 0.8, 0.35] };
    // bilar
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
    this.t = 0; this.state = 'grid'; this.gridT = 0; this.goAt = 3.6 + Math.random() * 1.2; this.acc = 0; this.cam = 0; this.camH = this.player.h; this.keys = {}; this.touch = {};
    this.startPos = [this.player.x, this.player.z]; this.msgT = 0; this.hudT = 0; this.paused = false; this.done = false;
    this.parts = new Float32Array(260 * 54); this.pl = [];
    this.buildMap(); this.bind(); this.resize();
    const touchMode = cfg.settings?.touch || 'auto'; const showTouch = touchMode === 'on' || (touchMode === 'auto' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
    this.$('hTouch').style.display = showTouch ? '' : 'none'; if (showTouch) this.$('hKeys').style.display = 'none';
    if (cfg.mode === 'time') { this.$('hJoker').style.display = 'none'; this.$('hOrder').style.display = 'none'; }
    else if (!this.useJoker) { this.$('hJoker').className = 'hud-joker ok'; }
    this.audioInit();
    this.last = performance.now(); this.raf = requestAnimationFrame(t => this.frame(t));
  }
  bind() {
    const map = { ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brk', KeyS: 'brk', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'hb' };
    this.kd = e => { if (map[e.code]) { this.keys[map[e.code]] = 1; e.preventDefault(); }
      else if (e.code === 'KeyE' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.shift(1); else if (e.code === 'KeyQ' || e.code === 'ControlLeft') this.shift(-1);
      else if (e.code === 'KeyC') this.cam = (this.cam + 1) % 4; else if (e.code === 'KeyR') { if (this.state === 'run') this.resetCar(this.player); }
      else if (e.code === 'KeyP' || e.code === 'Escape') this.togglePause(); };
    this.ku = e => { if (map[e.code]) this.keys[map[e.code]] = 0; };
    window.addEventListener('keydown', this.kd); window.addEventListener('keyup', this.ku);
    this.rs = () => this.resize(); window.addEventListener('resize', this.rs);
    for (const b of this.host.querySelectorAll('.touch button')) { const k = b.dataset.k;
      const on = e => { e.preventDefault(); this.touch[k] = 1; b.classList.add('on'); }, off = e => { e.preventDefault(); this.touch[k] = 0; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off); }
    this.$('hPause').onclick = () => this.togglePause(); this.$('hResume').onclick = () => this.togglePause();
    this.$('hQuit').onclick = () => { this.player.retired = true; this.player.flag = 'K'; this.finish(); };
  }
  togglePause() { if (this.done) return; this.paused = !this.paused; this.$('hPauseBox').hidden = !this.paused; this.last = performance.now(); if (this.gain) this.gain.gain.value = 0; }
  shift(d) { const c = this.player; if (this.state !== 'run' || c.shiftT > 0) return; const g = c.gear + d; if (g >= 1 && g <= c.spec.gears.length) { c.gear = g; c.shiftT = c.spec.shift; } }
  resize() { const r = this.cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, this.q ? 2 : 1.25); this.cv.width = Math.max(2, r.width * dpr | 0); this.cv.height = Math.max(2, r.height * dpr | 0); }
  resetCar(c) { const trk = this.trk, hwi = trk.hwAt ? trk.hwAt(c.i) : trk.hw, [x, z, h] = trk.point(c.i, clamp(c.lat, -hwi + 2, hwi - 2) * 0.3); c.x = x; c.z = z; c.h = h; c.vx = c.vy = c.r = 0; c.rev = false; c.gear = 1; }
  msg(html, dur = 2.4, cls = '') { const e = this.$('hMsg'); e.innerHTML = html; e.className = 'hud-msg show ' + cls; this.msgT = dur; }
  buildMap() {
    const t = this.trk; let mx = 0;
    for (let i = 0; i < t.n; i++) {
      const b = t.bulge(i);
      mx = Math.max(mx, Math.abs(t.X[i]), Math.abs(t.Z[i]), Math.abs(t.X[i] + t.NX[i] * b), Math.abs(t.Z[i] + t.NZ[i] * b));
    }
    this.mapS = 72 / (mx + 26);
  }
  drawMap() {
    const cv = this.$('hMap'), g = cv.getContext('2d'), t = this.trk, s = this.mapS, P = (x, z) => [82.5 + x * s, 82.5 + z * s];
    g.clearRect(0, 0, 165, 165); g.lineJoin = 'round'; g.lineCap = 'round';
    // Startchute (L)
    if (t.startChute) {
      const sc = t.startChute, p0 = P(sc.x0, sc.z0), p1 = P(sc.x1, sc.z1);
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
      g.strokeStyle = '#9aa4b0'; g.lineWidth = 4; g.stroke();
    }
    // Huvudspår: grus vs asfalt
    for (let i = 0; i < t.n; i += 2) {
      const i2 = (i + 2) % t.n, p0 = P(t.X[i], t.Z[i]), p1 = P(t.X[i2], t.Z[i2]);
      const st = t.surfTypeAt ? t.surfTypeAt(i) : t.surface;
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
      g.strokeStyle = st === 'asfalt' ? '#95a5b5' : 'rgba(240,210,165,.85)';
      g.lineWidth = Math.max(3, (t.hwAt ? t.hwAt(i) : t.hw) * 0.45);
      g.stroke();
    }
    // Sakkolenkki (röd i banprofilen!)
    g.beginPath();
    for (let i = t.joker.i1; i <= t.joker.i2; i++) {
      const b = t.bulge(i), p = P(t.X[i] + t.NX[i] * b, t.Z[i] + t.NZ[i] * b);
      i === t.joker.i1 ? g.moveTo(p[0], p[1]) : g.lineTo(p[0], p[1]);
    }
    g.strokeStyle = this.useJoker ? '#ff3b2f' : 'rgba(255,59,47,.4)'; g.lineWidth = 3.2; g.stroke();
    // Mållinje
    const fIdx = t.finishIdx || 0, pf = P(t.X[fIdx], t.Z[fIdx]);
    g.fillStyle = '#fff'; g.fillRect(pf[0] - 2, pf[1] - 4, 4, 8);
    // Flaggposter (1..8)
    if (t.posts && t.posts.length) {
      g.font = 'bold 8px sans-serif'; g.textAlign = 'center';
      for (const fp of t.posts) {
        const pp = P(fp.x, fp.z);
        g.fillStyle = '#ffd400'; g.fillText(fp.n, pp[0], pp[1] + 3);
      }
    }
    // Bilar
    for (const c of this.cars) {
      const p = P(c.x, c.z);
      g.beginPath(); g.arc(p[0], p[1], c.isPlayer ? 4.5 : 3.2, 0, 6.3);
      g.fillStyle = c.isPlayer ? '#ffd400' : `rgb(${c.paint.map(v => v * 255 | 0)})`;
      g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke();
    }
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
      if (this.gridT >= this.goAt) { this.state = 'run'; this.msg('KÖR!', 1.2, 'go'); }
      else {
        for (const c of this.cars) if (!c.isPlayer) { c.thr = 0; c.brk = 1; }
        if (p.auto) { p.thr = 0; return; }
        // Sääntökirja s. 11 & 14: "Kun STOP-merkki nousee pois lähtöviivalta, auto ei saa liikkua mihinkään suuntaan...
        // Vilppilähdön ... tiputtaa sinut erän viimeiseksi."
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
        // Sääntökirja s. 12: Kaato (vesikouru osuu maahan) -> heatet bryts direkt!
        if (hit > 9.2 && Math.abs(c.vy) > 3.5 && !c.kaato && this.state === 'run') {
          c.kaato = true; c.retired = true; this.state = 'flag';
          this.msg('KA – KAATO (RULLNING)!<br><small>Takrännan i marken – heatet avbryts, kräver kaatokatsastus!</small>', 3.6, 'warn');
          setTimeout(() => this.finish(), 2400);
        }
      }
      const lapNow = Math.floor(c.prog / n);
      if (lapNow > lapBefore && lapNow >= 1) {
        const lt = this.t - c.lastLapT; c.lastLapT = this.t; c.laps.push(lt); if (lt < c.bestLap) c.bestLap = lt;
        if (c.isPlayer && lapNow < this.cfg.laps) this.msg(`Varv ${lapNow}: ${fmtTime(lt)}`, 1.8);
        if (lapNow >= this.cfg.laps && !c.finished) { c.finished = true; c.finishT = this.t; if (c.isPlayer) this.flagDown(); }
      }
      if (c.isPlayer && this.useJoker && c.jokerDone && !c.jokerShown) {
        c.jokerShown = true;
        this.msg(c.coneDown ? 'LISÄLENKKI KÖRD (men keila kaatui → Li)' : 'LISÄLENKKI KÖRD ✓', 1.8, c.coneDown ? 'warn' : 'go');
      }
      // Motorvärme och slitage (spelaren)
      if (c.isPlayer) {
        const ri = clamp(c.rpm / 500, 0, c.cool.length - 1.001), i0 = ri | 0, q = (c.cool[i0] + (c.cool[i0 + 1] - c.cool[i0]) * (ri - i0)) * c.thr;
        const v = Math.abs(c.vx), cap = c.spec.cool * (c.temp - 20) / 80 * (0.5 + 0.5 * Math.min(1, v / 18)) * (c.radLeak ? 0.4 : 1);
        c.temp += (q - cap) / 24 * dt; c.temp = Math.max(c.temp, 70);
        const mg = c.marg[i0]; if (mg < 0 && c.thr > 0.8) this.damage(-mg * 0.9 * dt, false, true);
        if (c.temp > 126) this.damage(1.2 * dt, false, true);
        c.pow = (1 - clamp((c.dmg - 40) / 60, 0, 1) * 0.25) * (c.temp > 115 ? Math.max(0.6, 1 - (c.temp - 115) * 0.025) : 1);
      }
    }

    // Bil mot bil + bedömning av varningskoder enligt Sääntökirja s. 11–15
    for (let a = 0; a < this.cars.length; a++) for (let b = a + 1; b < this.cars.length; b++) {
      const A = this.cars[a], B = this.cars[b];
      if (Math.abs(A.x - B.x) > 6 || Math.abs(A.z - B.z) > 6) continue;
      const hit = collide(A, B);
      if (hit > 1.2 && (A.isPlayer || B.isPlayer)) {
        this.damage(hit * hit * 0.09, true);
        const other = A.isPlayer ? B : A;
        const rammer = collide.front === 'A' ? A : collide.front === 'B' ? B : null;
        const j = trk.joker;

        // B6: Påkörning efter målflagg
        if (this.state === 'flag' && hit > 3.0) {
          this.giveSanction(p, 'B6', 'Ruutulipun jälkeinen päälleajo', 'Påkörning efter målflagg');
        }
        // A8: Lisälenkiltä eteen (väjningsplikt vid utfart ur lisälenkki!)
        else if (this.useJoker && p.i >= j.i2 - 8 && p.i <= j.i2 + 6 && Math.abs(p.lat - trk.bulge(p.i)) < j.w && hit > 2.6) {
          this.giveSanction(p, 'A8', 'Lisälenkiltä eteen', 'Lisälenkiltä tulija on väistämisvelvollinen!');
        }
        // A7: Störande filbyte i starten
        else if (this.t < 4.0 && Math.abs(p.steer) > 0.35 && hit > 2.8) {
          this.giveSanction(p, 'A7', 'Häiritsevä kaistanvaihto (lähdössä)', 'Störande filbyte före/i starten');
        }
        // A3: Sidokontakt i Junior / Super / Super Senior (där kylkikosketus är förbjudet!)
        else if (!this.sideContact && collide.type === 'side' && hit > 2.6) {
          this.giveSanction(p, 'A3', 'Kylkikosketus', 'Sidokontakt är förbjuden i Junior och Super!');
        }
        // A1: Takakulmatyöntö ja/tai pyöräytys (knuff i bakhörnet så medtävlaren snurrar)
        else if (rammer && rammer.isPlayer && Math.abs(other.r) > 1.5 && hit > 3.6) {
          this.giveSanction(p, 'A1', 'Takakulmatyöntö / pyöräytys', 'Snurrade en medtävlare i bakhörnet');
        }
        // A6: Töniminen ja/tai peräänajo (påkörning rakt bakifrån)
        else if (rammer && rammer.isPlayer && collide.type === 'rear' && hit > 4.2) {
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

  // Exakt målgångsordning enligt Sääntökirja 21.04.2026 s. 14:
  // 1. Felfria målgångna (rank 0)
  // 2. Li – Lisälenkki ajamatta / keila kaatunut (rank 1)
  // 3. Vi – Vilppilähtö (rank 2 – sist av målgångna eftersom brottet skedde först: "vilppi on näistä kahdesta viimeisin koska rike on tehty ensin")
  // 4. K / KA – Keskeyttäneet / Kaato (rank 3 – under Vi och Li)
  // 5. Sanktion saaneet – Varning A1–B9 (rank 4 – under keskeyttäneet, i omvänd tidsordning så att den som fick sanktion FÖRST blir allra sist!)
  // 6. P – Poissa lähdöstä (rank 5)
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
      if (a.rank === 4) return b.sanctionT - a.sanctionT; // Först sanktionerad = sist i heatet!
      if (a.rank === 3) return b.prog - a.prog;           // Brutna efter körd sträcka
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
      const rate = st === 'asfalt' ? (slide > 3 ? slide * 2 : 0) : (v > 3 ? v * 0.45 : 0) + slide * 3;
      c.pe = (c.pe || 0) + rate * dt * (this.q ? 1 : 0.5);
      while (c.pe > 1 && pl.length < 250) {
        c.pe -= 1;
        const bx = c.x - Math.cos(c.h) * 1.7 + (Math.random() - 0.5) * 1.4, bz = c.z - Math.sin(c.h) * 1.7 + (Math.random() - 0.5) * 1.4;
        pl.push({ x: bx, y: 0.25, z: bz, vx: (Math.random() - 0.5) * 1.5, vy: 0.8 + Math.random() * 1.2, vz: (Math.random() - 0.5) * 1.5, life: 0, max: 0.6 + Math.random() * 0.7, s: 0.35 + Math.random() * 0.3, d: surf.dust });
      }
      if (c.pe > 1) c.pe = 0;
    }
    for (let i = pl.length - 1; i >= 0; i--) { const p = pl[i]; p.life += dt; if (p.life > p.max) { pl[i] = pl[pl.length - 1]; pl.pop(); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.s += dt * 1.3; }
  }

  render(dt) {
    const R = this.R; if (!R) return; const p = this.player, cv = this.cv;
    { const v = Math.hypot(p.vx, p.vy); let tgt = p.h; if (v > 4 && p.vx > 0) tgt = p.h + 0.55 * wrapA(Math.atan2(p.vx * Math.sin(p.h) + p.vy * Math.cos(p.h), p.vx * Math.cos(p.h) - p.vy * Math.sin(p.h)) - p.h);
      this.camH += wrapA(tgt - this.camH) * Math.min(1, 5 * dt); }
    const ch = Math.cos(this.camH), sh = Math.sin(this.camH); let eye, at, up = [0, 1, 0], fov = 1.05;
    if (this.cam === 0) { eye = [p.x - ch * 7.2, 3.0, p.z - sh * 7.2]; at = [p.x + ch * 5, 0.9, p.z + sh * 5]; }
    else if (this.cam === 1) { eye = [p.x - ch * 13, 7.5, p.z - sh * 13]; at = [p.x + ch * 6, 0.5, p.z + sh * 6]; }
    else if (this.cam === 2) { const c = Math.cos(p.h), s = Math.sin(p.h); eye = [p.x + c * 0.4, 1.25, p.z + s * 0.4]; at = [p.x + c * 12, 0.9, p.z + s * 12]; fov = 1.2; }
    else { eye = [p.x, 62, p.z]; at = [p.x, 0, p.z]; up = [Math.cos(p.h), 0, Math.sin(p.h)]; fov = 0.9; }
    const vp = M4.mul(M4.persp(fov, cv.width / cv.height, 0.3, 1400), M4.look(eye, at, up));
    R.begin(vp, this.env); R.draw(this.world, M4.ident());
    for (const c of this.cars) { if (c === p && this.cam === 2) continue; R.draw(c.mesh, M4.car(c.x, 0, c.z, c.h, clamp(-c.vx * c.r * 0.004, -0.07, 0.07), clamp(c.ax * 0.004, -0.04, 0.04)), c.paint); }
    const pl = this.pl; if (pl.length) { const fx = at[0] - eye[0], fy = at[1] - eye[1], fz = at[2] - eye[2]; let rx = fy * up[2] - fz * up[1], ry = fz * up[0] - fx * up[2], rz = fx * up[1] - fy * up[0]; const l = Math.hypot(rx, ry, rz); rx /= l; ry /= l; rz /= l;
      let ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx; const lu = Math.hypot(ux, uy, uz); ux /= lu; uy /= lu; uz /= lu;
      const A = this.parts, defD = this.trk.surf.dust; let o = 0;
      for (const q of pl) { const d = q.d || defD, al = 0.5 * (1 - q.life / q.max), s = q.s; const cs = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
        for (const [a, b] of cs) { A[o++] = q.x + (rx * a + ux * b) * s; A[o++] = q.y + (ry * a + uy * b) * s; A[o++] = q.z + (rz * a + uz * b) * s; A[o++] = d[0]; A[o++] = d[1]; A[o++] = d[2]; A[o++] = al; A[o++] = a; A[o++] = b; } }
      R.particles(A, pl.length); }
  }

  hud(dt) {
    const p = this.player, $ = this.$;
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) $('hMsg').className = 'hud-msg'; }
    $('hRpm').style.width = clamp(p.rpm / (p.spec.redline + 60) * 100, 0, 100) + '%'; $('hRpm').className = p.rpm > p.upRpm ? 'hot' : '';
    this.hudT -= dt; if (this.hudT > 0) return; this.hudT = 0.08;
    const L = $('hLights'); if (this.state === 'grid') { const k = Math.floor(this.gridT / (this.goAt - 0.9) * 5); L.querySelectorAll('i').forEach((e, i) => e.className = i < Math.min(5, k) ? 'on' : ''); } else if (!L.hidden) { L.hidden = true; }
    $('hGear').textContent = p.rev ? 'R' : p.gear; $('hRpmT').textContent = Math.round(p.rpm / 50) * 50; $('hSpd').textContent = Math.round(Math.hypot(p.vx, p.vy) * 3.6);
    const curSurf = this.trk.surfAt ? this.trk.surfAt(p.i) : this.trk.surf;
    const curWidth = Math.round((this.trk.hwAt ? this.trk.hwAt(p.i) : this.trk.hw) * 2);
    $('hSurf').textContent = `${curSurf.name.split(' ')[0]} (${curWidth} m)`;
    $('hDmg').style.width = p.dmg + '%'; $('hDmg').className = p.dmg > 65 ? 'bad' : p.dmg > 35 ? 'mid' : '';
    const tp = clamp((p.temp - 70) / 60 * 100, 0, 100); $('hTemp').style.width = tp + '%'; $('hTemp').className = p.temp > 115 ? 'bad' : p.temp > 104 ? 'mid' : '';
    const lap = clamp(Math.floor(Math.max(0, p.prog) / this.trk.n) + 1, 1, this.cfg.laps); $('hLap').textContent = lap; $('hTime').textContent = fmtTime(this.t);
    if (isFinite(p.bestLap)) $('hBest').textContent = 'Bästa varv ' + fmtTime(p.bestLap);
    const live = this.livePos(); $('hPos').textContent = live.indexOf(p) + 1;
    const j = $('hJoker');
    if (this.useJoker) {
      if (p.coneDown) { j.innerHTML = 'LISÄLENKKI<br><b>KEILA KAATUI (Li)</b>'; j.className = 'hud-joker alarm'; }
      else if (p.jokerDone) { j.innerHTML = 'LISÄLENKKI<br><b>KÖRD ✓</b>'; j.className = 'hud-joker ok'; }
      else if (lap === this.cfg.laps) j.className = 'hud-joker alarm';
    }
    if (this.cfg.mode !== 'time') {
      $('hOrder').innerHTML = live.map((c, i) => `<div class="${c.isPlayer ? 'me' : ''}"><i>${i + 1}</i>${c.name}${this.useJoker && c.jokerDone && !c.coneDown ? ' <em>L</em>' : ''}${c.sanction ? ` <em style="color:#ff5252">${c.sanction}</em>` : ''}</div>`).join('');
    }
    this.drawMap();
  }
}
