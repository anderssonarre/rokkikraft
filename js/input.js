// Kontroller: tangentbord, handkontroll (t.ex. PS4/PS5/Xbox) och ratt + pedaler via webbläsarens Gamepad API.
// Alla funktioner kan bindas om i Inställningar. Bindningar sparas i S.settings.binds.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

export const ACTIONS = [
  ['gas', 'Gas', 'analog'], ['brk', 'Broms', 'analog'], ['clutch', 'Koppling', 'analog'],
  ['left', 'Styr vänster', 'analog'], ['right', 'Styr höger', 'analog'], ['hb', 'Handbroms', 'button'],
  ['up', 'Växla upp', 'button'], ['down', 'Växla ner', 'button'], ['cam', 'Byt kamera', 'button'],
  ['reset', 'Återställ bilen', 'button'], ['pause', 'Paus', 'button'], ['tele', 'Telemetri', 'button'],
];

// Tangentbord: flera tangenter per funktion. Handkontroll: 'b7' = knapp 7, 'a0-' = axel 0 negativ riktning, 'a2+' osv.
// Standardlayout för PS4/standard-mappade handkontroller: R2 gas, L2 broms, vänster spak styrning, X handbroms, R1/L1 växling.
export const DEFAULT_BINDS = {
  key: { gas: ['ArrowUp', 'KeyW'], brk: ['ArrowDown', 'KeyS'], clutch: ['KeyF'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], hb: ['Space'],
    up: ['KeyE', 'ShiftLeft', 'ShiftRight'], down: ['KeyQ', 'ControlLeft'], cam: ['KeyC'], reset: ['KeyR'], pause: ['KeyP', 'Escape'], tele: ['KeyT'] },
  pad: { gas: 'b7', brk: 'b6', clutch: 'b1', left: 'a0-', right: 'a0+', hb: 'b0', up: 'b5', down: 'b4', cam: 'b3', reset: 'b2', pause: 'b9', tele: 'b8' },
  wheel: { gas: 'a2+', brk: 'a3+', clutch: 'a1+', left: 'a0-', right: 'a0+', hb: 'b6', up: 'b4', down: 'b5', cam: 'b2', reset: 'b3', pause: 'b9', tele: 'b8' },
  wheelInv: { gas: 1, brk: 1, clutch: 1 }, // de flesta pedaler går från +1 (släppt) till −1 (nedtryckt)
  dead: 0.06,
};

export function binds(settings) {
  const b = settings?.binds || {}, d = DEFAULT_BINDS;
  return { key: { ...d.key, ...(b.key || {}) }, pad: { ...d.pad, ...(b.pad || {}) }, wheel: { ...d.wheel, ...(b.wheel || {}) }, wheelInv: { ...d.wheelInv, ...(b.wheelInv || {}) }, dead: b.dead ?? d.dead };
}

// Är kontrollen en ratt? (ingen standardmappning och namn som låter som ratt)
export const isWheel = gp => gp && (gp.mapping !== 'standard' || /wheel|racing|g29|g920|g27|t300|t150|thrustmaster|fanatec|logitech g/i.test(gp.id)) && !/dualshock|dualsense|xbox|wireless controller/i.test(gp.id);
export const padName = gp => !gp ? '' : isWheel(gp) ? 'Ratt & pedaler' : /054c|dualshock|wireless controller|dualsense/i.test(gp.id) ? 'PS4/PS5-handkontroll' : 'Handkontroll';

export function getPad() {
  const list = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  return list.find(isWheel) || list[0] || null;
}

// Ren deadzone med mjuk omskalning [inner..outer] → [0..1] utan hopp vid kanten
function applyDeadzone(v, inner = 0.06, outer = 0.96) {
  const dz = clamp(Number.isFinite(inner) ? inner : 0.06, 0, 0.45);
  const hi = clamp(outer, dz + 0.1, 1);
  const a = Math.abs(v);
  if (a <= dz) return 0;
  return Math.sign(v) * clamp((a - dz) / (hi - dz), 0, 1);
}

// Mjuk icke-linjär styrkurva för handkontroll: finkänslig precision runt mitten + full auktoritet vid snabb motstyrning.
// Riktig ratt hålls helt linjär (1:1) med minimal dödzon.
export function steerCurve(raw, dead = 0.06, wheel = false) {
  if (!Number.isFinite(raw)) return 0;
  if (wheel) return applyDeadzone(raw, Math.min(dead, 0.015), 0.99);
  const u = applyDeadzone(raw, dead, 0.96);
  if (u === 0) return 0;
  const a = Math.abs(u);
  // Blandning av linjär lutning nära noll (0.34 → aldrig död känsla) och kraftfull ytterkurva (a^2.35 → rappt fullt utslag)
  const shaped = 0.34 * a + 0.66 * Math.pow(a, 2.35);
  return Math.sign(u) * clamp(shaped, 0, 1);
}

// Läser ett bindningsvärde (0..1) från handkontrollen med ren dödzonshantering
function val(gp, code, inv, dead) {
  if (!gp || !code) return 0;
  const m = /^(a|b)(\d+)([+-]?)$/.exec(code); if (!m) return 0;
  if (m[1] === 'b') {
    const bt = gp.buttons[+m[2]];
    if (!bt) return 0;
    const raw = typeof bt.value === 'number' ? bt.value : (bt.pressed ? 1 : 0);
    if (raw >= 0.99) return 1;
    // Liten trigger-dödzon (2 %) så slitna L2/R2-knappar inte ligger och släpar
    return applyDeadzone(raw, 0.02, 0.97);
  }
  let v = gp.axes[+m[2]] ?? 0;
  if (inv === 2) v = (v + 1) / 2; // pedal: −1 släppt → 0, +1 nedtryckt → 1
  else if (inv) v = (1 - v) / 2; // pedal: +1 släppt → 0, −1 nedtryckt → 1
  else v = m[3] === '-' ? -v : v;
  const dz = inv ? Math.min(dead, 0.03) : dead;
  return v > 0 ? applyDeadzone(v, dz, 0.97) : 0;
}

// Läser samlad rå styrning (-1..+1) från handkontroll/ratt utan dubbel dödzonsklippning
function readPadSteer(gp, m, inv, dz, wh) {
  if (!gp) return 0;
  const ml = /^(a)(\d+)([+-])$/.exec(m.left || '');
  const mr = /^(a)(\d+)([+-])$/.exec(m.right || '');
  // Standardfall: vänster/höger på samma spak-/rattaxel (t.ex. a0- och a0+)
  if (ml && mr && ml[2] === mr[2] && ml[3] !== mr[3] && !inv.left && !inv.right) {
    const raw = (gp.axes[+mr[2]] ?? 0) * (mr[3] === '+' ? 1 : -1);
    return steerCurve(raw, dz, wh);
  }
  // Reservfall: ombunden till skilda axlar eller knappar
  const raw = val(gp, m.right, inv.right, 0) - val(gp, m.left, inv.left, 0);
  return steerCurve(raw, dz, wh);
}

const RUMBLE_RATE_MS = 40;

export class Controls {
  constructor(settings) {
    this.b = binds(settings);
    this.down = new Set();
    this.prev = {};
    this.state = { gas: 0, brk: 0, clutch: 0, steer: 0, hb: 0, analog: false, wheel: false, analogPedals: false };
    this.events = [];
    this.padSeen = '';
    this._usedWheel = false;
    this._lastRumble = 0;
    this._lastRumblePeak = 0;
  }
  keyAction(code) { for (const [a, list] of Object.entries(this.b.key)) if (list.includes(code)) return a; return null; }
  keydown(code) { const a = this.keyAction(code); if (!a) return false; if (!this.down.has(a) && ['up', 'down', 'cam', 'reset', 'pause', 'tele'].includes(a)) this.events.push(a); this.down.add(a); return true; }
  keyup(code) { const a = this.keyAction(code); if (a) this.down.delete(a); }
  poll(touch = {}) {
    const gp = getPad(), wh = isWheel(gp), m = wh ? this.b.wheel : this.b.pad, inv = wh ? this.b.wheelInv : {}, dz = this.b.dead;
    this.padSeen = padName(gp);
    const k = a => this.down.has(a) || touch[a] ? 1 : 0;
    const p = a => val(gp, m[a], inv[a], dz);
    const st = this.state;
    st.gas = Math.max(k('gas'), p('gas')); st.brk = Math.max(k('brk'), p('brk')); st.clutch = Math.max(k('clutch'), p('clutch')); st.hb = Math.max(k('hb'), p('hb')) > 0.5 ? 1 : 0;
    const ps = readPadSteer(gp, m, inv, dz, wh);
    const ks = k('right') - k('left');
    if (ks) this._usedWheel = false;
    else if (wh && Math.abs(ps) > 0.04) this._usedWheel = true;
    else if (!wh) this._usedWheel = false;
    // tangenterna går alltid före (en ansluten ratt/spak som glider får inte ta över)
    st.analog = !ks && Math.abs(ps) > 0.001;
    st.wheel = wh && !ks && (st.analog || this._usedWheel);
    st.steer = ks ? ks : (st.analog || st.wheel ? ps : 0);
    st.analogPedals = !!gp && (p('gas') > 0 || p('brk') > 0);
    // knappar → händelser vid nedtryckning
    if (gp) for (const a of ['up', 'down', 'cam', 'reset', 'pause', 'tele']) { const on = p(a) > 0.5; if (on && !this.prev[a]) this.events.push(a); this.prev[a] = on; }
    const ev = this.events; this.events = []; return ev;
  }

  /**
   * Skickar dual-rumble till aktiv handkontroll (rate-limit ~40 ms, tyst fallback om ej stöds).
   * @param {number} [low=0] - lågfrekvent tung motor 0..1 (smällar, landningar, grovt grus)
   * @param {number} [high=0] - högfrekvent lätt motor 0..1 (grussmatter, hjulspinn, sladd)
   * @param {number} [ms=60] - varaktighet i millisekunder (15..1000)
   * @returns {boolean} true om en vibration skickades
   */
  rumble(low = 0, high = 0, ms = 60) {
    const lo = clamp(Number.isFinite(low) ? low : 0, 0, 1);
    const hi = clamp(Number.isFinite(high) ? high : 0, 0, 1);
    const dur = clamp(Number.isFinite(ms) ? Math.round(ms) : 60, 15, 1000);
    const peak = Math.max(lo, hi);
    if (peak <= 0.01) return false;

    const now = nowMs();
    // Rate-limit ~40 ms för att inte spamma webbläsaren, men släpp alltid igenom en kraftig ny smäll
    if (now - this._lastRumble < RUMBLE_RATE_MS && peak <= this._lastRumblePeak + 0.35) return false;

    const gp = getPad();
    if (!gp) return false;

    const act = gp.vibrationActuator;
    if (act && typeof act.playEffect === 'function') {
      this._lastRumble = now;
      this._lastRumblePeak = peak;
      try {
        const res = act.playEffect('dual-rumble', {
          startDelay: 0,
          duration: dur,
          weakMagnitude: hi,
          strongMagnitude: lo,
        });
        if (res && typeof res.catch === 'function') res.catch(() => {});
        return true;
      } catch {
        return false;
      }
    }

    // Tyst fallback för äldre Gamepad Haptics API (t.ex. äldre Firefox)
    const hap = gp.hapticActuators && gp.hapticActuators[0];
    if (hap && typeof hap.pulse === 'function') {
      this._lastRumble = now;
      this._lastRumblePeak = peak;
      try {
        const res = hap.pulse(clamp(lo * 0.7 + hi * 0.5, 0, 1), dur);
        if (res && typeof res.catch === 'function') res.catch(() => {});
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  /** Stoppar eventuell pågående handkontrollsvibration tyst (t.ex. vid paus eller målgång). */
  stopRumble() {
    this._lastRumblePeak = 0;
    const gp = getPad();
    const act = gp && gp.vibrationActuator;
    if (!act) return;
    try {
      if (typeof act.reset === 'function') {
        const res = act.reset();
        if (res && typeof res.catch === 'function') res.catch(() => {});
      } else if (typeof act.playEffect === 'function') {
        const res = act.playEffect('dual-rumble', { startDelay: 0, duration: 0, weakMagnitude: 0, strongMagnitude: 0 });
        if (res && typeof res.catch === 'function') res.catch(() => {});
      }
    } catch {}
  }
}

// Används av inställningssidan för att fånga nästa tangent / knapp / axel
export function captureNext(kind, cb) {
  if (kind === 'key') {
    const h = e => { e.preventDefault(); window.removeEventListener('keydown', h, true); cb(e.code); };
    window.addEventListener('keydown', h, true); return () => window.removeEventListener('keydown', h, true);
  }
  const gp0 = getPad(); const base = gp0 ? { axes: [...gp0.axes], buttons: gp0.buttons.map(b => b.value) } : null; let raf, t0 = performance.now();
  const loop = () => {
    const gp = getPad(); if (gp) {
      const b0 = base && base.axes.length === gp.axes.length ? base : { axes: gp.axes.map(() => 0), buttons: gp.buttons.map(() => 0) };
      for (let i = 0; i < gp.buttons.length; i++) if ((gp.buttons[i].value || 0) - (b0.buttons[i] || 0) > 0.5) return cb('b' + i);
      for (let i = 0; i < gp.axes.length; i++) { const d = gp.axes[i] - (b0.axes[i] || 0); if (Math.abs(d) > 0.5) return cb('a' + i + (d > 0 ? '+' : '-'), b0.axes[i] > 0.5 ? 1 : b0.axes[i] < -0.5 ? 2 : 0); }
    }
    if (performance.now() - t0 > 10000) return cb(null);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
}
