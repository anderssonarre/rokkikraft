// Heatet: körfysik, AI, kollisioner, lisälenkki, HUD och rendering.
import { getTrack } from './track.js';
import { initGL, M4, carMesh, worldMesh } from './gl.js';
import { torqueTable, engineAt } from './engine.js';

const G = 9.81, DT = 1 / 240;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
export const fmtTime = t => { if (!isFinite(t)) return '–'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); };

export function makeCar(def, trk, slot, isPlayer) {
  const s = def.spec, row = Math.floor(slot / 3), col = slot % 3, back = 3 + row * 4, lat = (col - 1) * 3.2;
  const [x, z, h] = trk.point(trk.n - back, lat);
  const tq = torqueTable(s);
  const cool = [], marg = []; for (let r = 0; r <= s.redline + 500; r += 500) { const e = engineAt(s, Math.max(r, 800)); cool.push(e.qCool); marg.push(e.margin); }
  let upRpm = s.redline - 120; { let bp = 0; for (let r = 2000; r <= s.redline; r += 250) { const p = tq(r) * r; if (p > bp) { bp = p; upRpm = Math.min(s.redline - 120, r + 350); } } }
  return { name: def.name, paint: def.paint, isPlayer, spec: s, tq, cool, marg, upRpm, x, z, h, vx: 0, vy: 0, r: 0, ax: 0, rpm: s.idle, gear: 1, thr: 0, brk: 0, steer: 0, hb: 0,
    i: trk.n - back, pf: trk.n - back, lat, prog: -back, onSurf: true, jokerDone: false, finished: false, finishT: 0, pen: 0, flag: '', dmg: 0, temp: 85, pow: isPlayer ? 1 : Math.max(0.7, Math.min(1.04, 0.4 + 0.6 * (def.skill || 1))),
    shiftT: 0, rev: false, slip: 0, radLeak: false, aids: isPlayer ? def.aids : { abs: 1, tc: 1, auto: 1 }, skill: def.skill || 1, slot,
    ai: isPlayer ? null : { jokerLap: 0, off: 0, stuck: 0, prof: null }, lastLapT: 0, bestLap: Infinity, laps: [], warn: 0 };
}

export function phys(c, dt, trk) {
  const s = c.spec, surf = trk.surf, L = s.wb, a = L * (1 - s.front), b = L * s.front, m = s.mass, fwd = s.cls === 'vetari';
  const mu = surf.mu * s.mu * (c.onSurf ? 1 : 0.72 + 0.12 * s.susp), crr = c.onSurf ? surf.crr : 0.09 - 0.03 * s.susp;
  const v = Math.hypot(c.vx, c.vy), delta = c.steer * 0.52 / (1 + v * 0.035);
  if (c.rev) { // enkel backning
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

export function trackStep(c, trk, t) {
  const n = trk.n, loc = trk.locate(c.x, c.z, c.i), nf = loc.i + loc.f;
  let d = nf - c.pf; if (d < -n / 2) d += n; else if (d > n / 2) d -= n;
  const prevIdx = c.i; c.prog += d; c.pf = nf; c.i = loc.i; c.lat = loc.lat;
  c.onSurf = trk.onSurface(loc.i, loc.lat);
  const j = trk.joker;
  if (!c.jokerDone && prevIdx < j.mid && loc.i >= j.mid && loc.i - prevIdx < 10 && Math.abs(loc.lat - trk.bulge(j.mid)) < j.w / 2 + 1.2) { c.jokerDone = true; c.jokerT = t; }
  // vallarna
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
    if (rel > hit) { hit = rel; collide.front = oa > 0 && ob < 0 ? 'A' : ob > 0 && oa < 0 ? 'B' : ''; }
  }
  return hit;
}

export function aiDrive(c, race, dt) {
  const trk = race.trk, n = trk.n, ai = c.ai, s = c.spec, j = trk.joker, v = Math.hypot(c.vx, c.vy);
  const lap = Math.floor(Math.max(0, c.prog) / n), idx = c.i;
  const wantJ = !c.jokerDone && lap >= ai.jokerLap;
  const la = idx + 4 + Math.round(v * 0.32);
  const lineAt = q => { const qq = trk.w(q); if (wantJ && qq > j.i1 - 2 && qq < j.i2 + 2) return trk.bulge(qq);
    if (qq > j.i1 - 12 && qq < j.i2 + 6) return wantJ ? j.side * (trk.hw - 2.5) * (qq <= j.i1 ? 1 : 0.4) : trk.line[qq] * 0.4 - j.side * 1.2; return trk.line[qq]; };
  // undvik bilar framför
  let target = 0, cap = 1e9;
  for (const o of race.cars) { if (o === c) continue; let dp = o.prog - c.prog; dp -= Math.round(dp / n) * n; // samma varvposition
    if (dp > 0 && dp < 7) { const dl = o.lat - c.lat; if (Math.abs(dl) < 2.4) { target = dl > 0 ? -2.8 : 2.8; if (dp < 3.2 && Math.abs(dl) < 1.7) cap = Math.hypot(o.vx, o.vy) + 0.5; } } }
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
  if (wantJ && idx < j.i2 - 4 && idx > j.i1 - 60) { const dist = Math.max(0, (j.i1 + 3 - idx) * trk.ds); vt = Math.min(vt, Math.sqrt(ai.vJ * ai.vJ + 2 * ai.aB * dist)); }
  vt = Math.min(vt, cap);
  if (v < vt - 0.4) { c.thr = clamp(1 - Math.abs(c.steer) * 0.45, 0.35, 1); c.brk = 0; }
  else if (v > vt + 0.8) { c.thr = 0; c.brk = clamp((v - vt) / 3.5, 0.15, 1); }
  else { c.thr = 0.35; c.brk = 0; }
  // fastnat?
  if (v < 1.2 && race.t > 2) { ai.stuck += dt; if (ai.stuck > 2.5) { race.resetCar(c); ai.stuck = 0; } } else ai.stuck = 0;
}

export class Race {
  constructor(host, cfg) {
    this.host = host; this.cfg = cfg; this.trk = getTrack(cfg.trackId); const trk = this.trk;
    host.innerHTML = `<div class="race"><canvas class="race-cv"></canvas>
      <div class="hud">
        <div class="hud-top"><div class="hud-pos"><b id="hPos">1</b><span>/ ${cfg.opps.length + 1}</span></div>
          <div class="hud-mid"><div class="hud-title">${cfg.title || trk.name}</div><div class="hud-lap">Varv <b id="hLap">1</b> / ${cfg.laps} · <span id="hTime">0:00.00</span></div><div class="hud-best" id="hBest"></div></div>
          <canvas id="hMap" width="150" height="150"></canvas></div>
        <div class="hud-lights" id="hLights">${'<i></i>'.repeat(5)}</div>
        <div class="hud-msg" id="hMsg"></div>
        <div class="hud-joker" id="hJoker">LISÄLENKKI<br><b>EJ KÖRD</b></div>
        <div class="hud-order" id="hOrder"></div>
        <div class="hud-dash"><div class="hud-gear" id="hGear">1</div>
          <div class="hud-rpmwrap"><div class="hud-rpm"><i id="hRpm"></i></div><div class="hud-rpmtxt"><span id="hRpmT">0</span> rpm</div>
            <div class="hud-bars"><span>SKADA</span><div><i id="hDmg"></i></div><span>TEMP</span><div><i id="hTemp"></i></div></div></div>
          <div class="hud-speed"><b id="hSpd">0</b><span>km/h</span></div></div>
        <div class="hud-keys" id="hKeys">W/↑ gas · S/↓ broms/back · A/D styr · Mellanslag handbroms · E/Q växla · C kamera · R återställ · P paus</div>
        <div class="touch" id="hTouch"><div class="t-l"><button data-k="left">◀</button><button data-k="right">▶</button></div>
          <div class="t-r"><button data-k="hb" class="t-s">HAND</button><button data-k="brk" class="t-b">BROMS</button><button data-k="gas" class="t-g">GAS</button></div></div>
        <button class="hud-pause" id="hPause">II</button>
        <div class="pause" id="hPauseBox" hidden><div><h2>Paus</h2><button class="btn" id="hResume">Fortsätt</button><button class="btn ghost" id="hQuit">Bryt heatet (K)</button></div></div>
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
    this.cars = defs.map((d, sl) => makeCar(d, trk, sl, !!d.isP));
    this.player = this.cars.find(c => c.isPlayer);
    if (location.search.includes('auto')) { const c = this.player; c.auto = true; c.skill = 0.97; c.ai = { jokerLap: 0, off: 0, stuck: 0, prof: null }; c.aids = { abs: 1, tc: 1, auto: 1 }; }
    this.player.dmg = cfg.dmg0 || 0; this.player.radLeak = !!cfg.radLeak0;
    for (const c of this.cars) { if (this.R) { const key = c.spec.body + (c.spec.dmg < 1 ? 'b' : ''); c.mesh = this.meshes[key] || (this.meshes[key] = this.R.mesh(carMesh(c.spec.body, { bars: c.spec.dmg < 1 }))); }
      if (c.ai) { const mu = trk.surf.mu * c.spec.mu, k = c.skill; const top = 50;
        c.ai.prof = trk.profile(mu * G * 0.90 * k * k, mu * G * 0.70 * k, top); c.ai.vJ = Math.sqrt(mu * G * 0.85 * k * k * 21); c.ai.aB = mu * G * 0.6 * k;
        c.ai.jokerLap = Math.floor(Math.random() * cfg.laps); } }
    this.t = 0; this.state = 'grid'; this.gridT = 0; this.goAt = 3.6 + Math.random() * 1.2; this.acc = 0; this.cam = 0; this.camH = this.player.h; this.keys = {}; this.touch = {};
    this.startPos = [this.player.x, this.player.z]; this.msgT = 0; this.hudT = 0; this.paused = false; this.done = false;
    this.parts = new Float32Array(260 * 54); this.pl = [];
    this.buildMap(); this.bind(); this.resize();
    const touchMode = cfg.settings?.touch || 'auto'; const showTouch = touchMode === 'on' || (touchMode === 'auto' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
    this.$('hTouch').style.display = showTouch ? '' : 'none'; if (showTouch) this.$('hKeys').style.display = 'none';
    if (cfg.mode === 'time') { this.$('hJoker').style.display = 'none'; this.$('hOrder').style.display = 'none'; }
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
    this.$('hQuit').onclick = () => { this.player.flag = 'K'; this.finish(); };
  }
  togglePause() { if (this.done) return; this.paused = !this.paused; this.$('hPauseBox').hidden = !this.paused; this.last = performance.now(); if (this.gain) this.gain.gain.value = 0; }
  shift(d) { const c = this.player; if (this.state !== 'run' || c.shiftT > 0) return; const g = c.gear + d; if (g >= 1 && g <= c.spec.gears.length) { c.gear = g; c.shiftT = c.spec.shift; } }
  resize() { const r = this.cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, this.q ? 2 : 1.25); this.cv.width = Math.max(2, r.width * dpr | 0); this.cv.height = Math.max(2, r.height * dpr | 0); }
  resetCar(c) { const trk = this.trk, [x, z, h] = trk.point(c.i, clamp(c.lat, -trk.hw + 2, trk.hw - 2) * 0.3); c.x = x; c.z = z; c.h = h; c.vx = c.vy = c.r = 0; c.rev = false; c.gear = 1; }
  msg(html, dur = 2.2, cls = '') { const e = this.$('hMsg'); e.innerHTML = html; e.className = 'hud-msg show ' + cls; this.msgT = dur; }
  buildMap() { const t = this.trk; let mx = 0; for (let i = 0; i < t.n; i++) mx = Math.max(mx, Math.abs(t.X[i]), Math.abs(t.Z[i])); this.mapS = 66 / (mx + 25); }
  drawMap() { const cv = this.$('hMap'), g = cv.getContext('2d'), t = this.trk, s = this.mapS, P = (x, z) => [75 + x * s, 75 + z * s];
    g.clearRect(0, 0, 150, 150); g.lineJoin = 'round';
    g.beginPath(); for (let i = 0; i <= t.n; i += 2) { const p = P(t.X[i % t.n], t.Z[i % t.n]); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 4; g.stroke();
    g.beginPath(); for (let i = t.joker.i1; i <= t.joker.i2; i++) { const b = t.bulge(i), p = P(t.X[i] + t.NX[i] * b, t.Z[i] + t.NZ[i] * b); i === t.joker.i1 ? g.moveTo(p[0], p[1]) : g.lineTo(p[0], p[1]); } g.strokeStyle = '#ffd400'; g.lineWidth = 2.5; g.stroke();
    const p0 = P(t.X[0], t.Z[0]); g.fillStyle = '#fff'; g.fillRect(p0[0] - 1.5, p0[1] - 4, 3, 8);
    for (const c of this.cars) { const p = P(c.x, c.z); g.beginPath(); g.arc(p[0], p[1], c.isPlayer ? 4.5 : 3.2, 0, 6.3); g.fillStyle = c.isPlayer ? '#ffd400' : `rgb(${c.paint.map(v => v * 255 | 0)})`; g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1; g.stroke(); } }
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
    if (brk && !gas && c.vx < 0.4) c.rev = true; else if (gas || !brk) c.rev = false; }
  step(dt) {
    const trk = this.trk, n = trk.n, p = this.player;
    if (this.state === 'grid') { this.gridT += dt; this.input(dt);
      if (this.gridT >= this.goAt) { this.state = 'run'; this.msg('KÖR!', 1.2, 'go'); }
      else { for (const c of this.cars) if (!c.isPlayer) { c.thr = 0; c.brk = 1; }
        if (p.auto) { p.thr = 0; return; }
        if (!p.jump && Math.hypot(p.x - this.startPos[0], p.z - this.startPos[1]) > 0.7) { p.jump = true; p.pen += 5; p.flag = 'Vi'; this.msg('Vi – VILPPILÄHTÖ<br><small>tjuvstart: +5 s</small>', 3, 'warn'); }
        phys(p, dt, trk); trackStep(p, trk, 0); return; } }
    if (this.state !== 'run' && this.state !== 'flag') return;
    this.t += dt;
    for (const c of this.cars) {
      if (c.isPlayer) { if (this.state === 'run' && !c.finished) { if (c.auto) aiDrive(c, this, dt); else this.input(dt); } else { c.thr = 0; c.brk = 0.5; c.steer *= 0.95; c.hb = 0; } }
      else if (!c.finished) aiDrive(c, this, dt); else { c.thr = 0; c.brk = 0.4; }
      phys(c, dt, trk);
      const lapBefore = Math.floor(c.prog / n);
      const hit = trackStep(c, trk, this.t);
      if (hit > 2.5 && c.isPlayer) this.damage(hit * hit * 0.11, true);
      const lapNow = Math.floor(c.prog / n);
      if (lapNow > lapBefore && lapNow >= 1) { const lt = this.t - c.lastLapT; c.lastLapT = this.t; c.laps.push(lt); if (lt < c.bestLap) c.bestLap = lt;
        if (c.isPlayer && lapNow < this.cfg.laps) this.msg(`Varv ${lapNow}: ${fmtTime(lt)}`, 1.8);
        if (lapNow >= this.cfg.laps && !c.finished) { c.finished = true; c.finishT = this.t; if (c.isPlayer) this.flagDown(); } }
      if (c.isPlayer && c.jokerDone && !c.jokerShown) { c.jokerShown = true; this.msg('LISÄLENKKI KÖRD ✓', 1.6, 'go'); }
      // motorvärme och slitage (bara spelaren)
      if (c.isPlayer) { const ri = clamp(c.rpm / 500, 0, c.cool.length - 1.001), i0 = ri | 0, q = (c.cool[i0] + (c.cool[i0 + 1] - c.cool[i0]) * (ri - i0)) * c.thr;
        const v = Math.abs(c.vx), cap = c.spec.cool * (c.temp - 20) / 80 * (0.5 + 0.5 * Math.min(1, v / 18)) * (c.radLeak ? 0.4 : 1);
        c.temp += (q - cap) / 24 * dt; c.temp = Math.max(c.temp, 70);
        const mg = c.marg[i0]; if (mg < 0 && c.thr > 0.8) this.damage(-mg * 0.9 * dt, false, true);
        if (c.temp > 126) this.damage(1.2 * dt, false, true);
        c.pow = (1 - clamp((c.dmg - 40) / 60, 0, 1) * 0.25) * (c.temp > 115 ? Math.max(0.6, 1 - (c.temp - 115) * 0.025) : 1); }
    }
    // bil mot bil
    for (let a = 0; a < this.cars.length; a++) for (let b = a + 1; b < this.cars.length; b++) { const A = this.cars[a], B = this.cars[b];
      if (Math.abs(A.x - B.x) > 6 || Math.abs(A.z - B.z) > 6) continue; const hit = collide(A, B);
      if (hit > 1.2 && (A.isPlayer || B.isPlayer)) { this.damage(hit * hit * 0.09, true);
        const rammer = collide.front === 'A' ? A : collide.front === 'B' ? B : null;
        if (rammer && rammer.isPlayer && hit > 4.2 && this.state === 'run' && this.t - (p.lastWarn || -9) > 3) { p.lastWarn = this.t; p.warn++;
          if (p.warn >= 2) { p.flag = 'A6'; this.msg('SVART FLAGG<br><small>A6 – töniminen / peräänajo, andra gången</small>', 3, 'warn'); setTimeout(() => this.finish(), 2200); this.state = 'flag'; }
          else this.msg('VARNING A6<br><small>töniminen / peräänajo – en till ger svart flagg</small>', 3, 'warn'); } } }
    if (p.dmg >= 100 && !p.flag.includes('K') && this.state === 'run') { p.flag = 'K'; this.state = 'flag'; this.msg('K – KESKEYTTÄNYT<br><small>bilen höll inte</small>', 3, 'warn'); setTimeout(() => this.finish(), 2200); }
    if (this.state === 'flag' && this.flagT !== undefined && this.t - this.flagT > 3) this.finish();
    if (this.t > 600) this.finish();
  }
  damage(d, impact, engine) { const p = this.player; d *= engine ? 1 : p.spec.dmg; p.dmg = Math.min(100, p.dmg + d);
    if (impact && d > 9 && !p.spec.radSafe && !p.radLeak && p.dmg > 45 && Math.random() < 0.5) { p.radLeak = true; this.msg('KYLAREN LÄCKER<br><small>håll koll på temperaturen</small>', 2.6, 'warn'); } }
  flagDown() { this.state = 'flag'; this.flagT = this.t; const p = this.player; this.msg(p.jokerDone || this.cfg.mode === 'time' ? 'MÅLFLAGG' : 'MÅLFLAGG<br><small>Li – lisälenkki ajamatta</small>', 3, p.jokerDone || this.cfg.mode === 'time' ? 'go' : 'warn'); }
  order() { const n = this.trk.n, L = this.cfg.laps, now = this.t;
    const rows = this.cars.map(c => { let t; if (c.finished) t = c.finishT; else { const rem = (L * n - c.prog) * this.trk.ds, avg = Math.max(6, (c.prog + 8) * this.trk.ds / Math.max(now, 1)); t = now + rem / avg; }
      let flag = c.flag; if (this.cfg.mode !== 'time' && !c.jokerDone && !/K|A6/.test(flag) && c.finished) flag = (flag ? flag + ' ' : '') + 'Li';
      const rank = /K|A6/.test(flag) ? 2 : /Li/.test(flag) ? 1 : 0;
      return { c, name: c.name, isPlayer: c.isPlayer, t: t + c.pen, flag, rank, prog: c.prog }; });
    rows.sort((a, b) => a.rank - b.rank || a.t - b.t); return rows; }
  livePos() { const cs = [...this.cars].sort((a, b) => b.prog - a.prog); return cs; }
  finish() { if (this.done) return; this.done = true; const rows = this.order(), p = this.player;
    const res = { order: rows.map(r => ({ name: r.name, isPlayer: r.isPlayer, flag: r.flag, time: r.c.finished ? r.t : null })), pos: rows.findIndex(r => r.isPlayer) + 1,
      bestLap: p.bestLap, dmg: p.dmg, flag: rows.find(r => r.isPlayer).flag, finished: p.finished, time: p.finished ? p.finishT + p.pen : null, radLeak: p.radLeak };
    this.destroy(); this.cfg.onDone(res); }
  destroy() { cancelAnimationFrame(this.raf); window.removeEventListener('keydown', this.kd); window.removeEventListener('keyup', this.ku); window.removeEventListener('resize', this.rs);
    try { if (this.ac) this.ac.close(); } catch (e) { } this.dead = true; }
  frame(now) {
    if (this.dead) return; this.raf = requestAnimationFrame(t => this.frame(t));
    let dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (!this.paused) { this.acc += dt; let k = 0; while (this.acc >= DT && k++ < 14) { this.step(DT); this.acc -= DT; if (this.done) return; } if (this.acc > DT * 4) this.acc = 0; this.particlesStep(dt); this.audio(); }
    this.render(dt); this.hud(dt);
  }
  particlesStep(dt) { const surf = this.trk.surf, pl = this.pl;
    for (const c of this.cars) { const v = Math.hypot(c.vx, c.vy), slide = Math.abs(c.vy) + c.slip * 6 + (c.lock ? 5 : 0);
      const rate = this.trk.surface === 'asfalt' ? (slide > 3 ? slide * 2 : 0) : (v > 3 ? v * 0.45 : 0) + slide * 3;
      c.pe = (c.pe || 0) + rate * dt * (this.q ? 1 : 0.5);
      while (c.pe > 1 && pl.length < 250) { c.pe -= 1; const bx = c.x - Math.cos(c.h) * 1.7 + (Math.random() - 0.5) * 1.4, bz = c.z - Math.sin(c.h) * 1.7 + (Math.random() - 0.5) * 1.4;
        pl.push({ x: bx, y: 0.25, z: bz, vx: (Math.random() - 0.5) * 1.5, vy: 0.8 + Math.random() * 1.2, vz: (Math.random() - 0.5) * 1.5, life: 0, max: 0.6 + Math.random() * 0.7, s: 0.35 + Math.random() * 0.3 }); }
      if (c.pe > 1) c.pe = 0; }
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
    // damm
    const pl = this.pl; if (pl.length) { const fx = at[0] - eye[0], fy = at[1] - eye[1], fz = at[2] - eye[2]; let rx = fy * up[2] - fz * up[1], ry = fz * up[0] - fx * up[2], rz = fx * up[1] - fy * up[0]; const l = Math.hypot(rx, ry, rz); rx /= l; ry /= l; rz /= l;
      let ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx; const lu = Math.hypot(ux, uy, uz); ux /= lu; uy /= lu; uz /= lu;
      const A = this.parts, d = this.trk.surf.dust; let o = 0;
      for (const q of pl) { const al = 0.5 * (1 - q.life / q.max), s = q.s; const cs = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
        for (const [a, b] of cs) { A[o++] = q.x + (rx * a + ux * b) * s; A[o++] = q.y + (ry * a + uy * b) * s; A[o++] = q.z + (rz * a + uz * b) * s; A[o++] = d[0]; A[o++] = d[1]; A[o++] = d[2]; A[o++] = al; A[o++] = a; A[o++] = b; } }
      R.particles(A, pl.length); }
  }
  hud(dt) { const p = this.player, $ = this.$;
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) $('hMsg').className = 'hud-msg'; }
    $('hRpm').style.width = clamp(p.rpm / (p.spec.redline + 60) * 100, 0, 100) + '%'; $('hRpm').className = p.rpm > p.upRpm ? 'hot' : '';
    this.hudT -= dt; if (this.hudT > 0) return; this.hudT = 0.08;
    const L = $('hLights'); if (this.state === 'grid') { const k = Math.floor(this.gridT / (this.goAt - 0.9) * 5); L.querySelectorAll('i').forEach((e, i) => e.className = i < Math.min(5, k) ? 'on' : ''); } else if (!L.hidden) { L.hidden = true; }
    $('hGear').textContent = p.rev ? 'R' : p.gear; $('hRpmT').textContent = Math.round(p.rpm / 50) * 50; $('hSpd').textContent = Math.round(Math.hypot(p.vx, p.vy) * 3.6);
    $('hDmg').style.width = p.dmg + '%'; $('hDmg').className = p.dmg > 65 ? 'bad' : p.dmg > 35 ? 'mid' : '';
    const tp = clamp((p.temp - 70) / 60 * 100, 0, 100); $('hTemp').style.width = tp + '%'; $('hTemp').className = p.temp > 115 ? 'bad' : p.temp > 104 ? 'mid' : '';
    const lap = clamp(Math.floor(Math.max(0, p.prog) / this.trk.n) + 1, 1, this.cfg.laps); $('hLap').textContent = lap; $('hTime').textContent = fmtTime(this.t);
    if (isFinite(p.bestLap)) $('hBest').textContent = 'Bästa varv ' + fmtTime(p.bestLap);
    const live = this.livePos(); $('hPos').textContent = live.indexOf(p) + 1;
    const j = $('hJoker'); if (p.jokerDone) { j.innerHTML = 'LISÄLENKKI<br><b>KÖRD ✓</b>'; j.className = 'hud-joker ok'; } else if (lap === this.cfg.laps) j.className = 'hud-joker alarm';
    if (this.cfg.mode !== 'time') $('hOrder').innerHTML = live.map((c, i) => `<div class="${c.isPlayer ? 'me' : ''}"><i>${i + 1}</i>${c.name}${c.jokerDone ? ' <em>L</em>' : ''}</div>`).join('');
    this.drawMap();
  }
}
