// Kontroller: tangentbord, handkontroll (t.ex. PS4) och ratt + pedaler via webbläsarens Gamepad API.
// Alla funktioner kan bindas om i Inställningar. Bindningar sparas i S.settings.binds.

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
  const b = settings.binds || {}, d = DEFAULT_BINDS;
  return { key: { ...d.key, ...(b.key || {}) }, pad: { ...d.pad, ...(b.pad || {}) }, wheel: { ...d.wheel, ...(b.wheel || {}) }, wheelInv: { ...d.wheelInv, ...(b.wheelInv || {}) }, dead: b.dead ?? d.dead };
}

// Är kontrollen en ratt? (ingen standardmappning och namn som låter som ratt)
export const isWheel = gp => gp && (gp.mapping !== 'standard' || /wheel|racing|g29|g920|g27|t300|t150|thrustmaster|fanatec|logitech g/i.test(gp.id)) && !/dualshock|dualsense|xbox|wireless controller/i.test(gp.id);
export const padName = gp => !gp ? '' : isWheel(gp) ? 'Ratt & pedaler' : /054c|dualshock|wireless controller|dualsense/i.test(gp.id) ? 'PS4/PS5-handkontroll' : 'Handkontroll';

export function getPad() {
  const list = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  return list.find(isWheel) || list[0] || null;
}

// Läser ett bindningsvärde (0..1) från handkontrollen
function val(gp, code, inv, dead) {
  if (!gp || !code) return 0;
  const m = /^(a|b)(\d+)([+-]?)$/.exec(code); if (!m) return 0;
  if (m[1] === 'b') { const bt = gp.buttons[+m[2]]; return bt ? (bt.value || (bt.pressed ? 1 : 0)) : 0; }
  let v = gp.axes[+m[2]] ?? 0;
  if (inv === 2) v = (v + 1) / 2; // pedal: −1 släppt → 0, +1 nedtryckt → 1
  else if (inv) v = (1 - v) / 2; // pedal: +1 släppt → 0, −1 nedtryckt → 1
  else v = m[3] === '-' ? -v : v;
  return v > dead ? Math.min(1, (v - dead) / (1 - dead)) : 0;
}

export class Controls {
  constructor(settings) { this.b = binds(settings); this.down = new Set(); this.prev = {}; this.state = { gas: 0, brk: 0, clutch: 0, steer: 0, hb: 0, analog: false }; this.events = []; this.padSeen = ''; }
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
    const ps = p('right') - p('left'); const ks = k('right') - k('left'); st.analog = !ks && Math.abs(ps) > 0.02; st.wheel = wh && st.analog; st.steer = st.analog ? ps : ks; // tangenterna går alltid före (en ansluten ratt/spak som glider får inte ta över)
    st.analogPedals = !!gp && (p('gas') > 0 || p('brk') > 0);
    // knappar → händelser vid nedtryckning
    if (gp) for (const a of ['up', 'down', 'cam', 'reset', 'pause', 'tele']) { const on = p(a) > 0.5; if (on && !this.prev[a]) this.events.push(a); this.prev[a] = on; }
    const ev = this.events; this.events = []; return ev;
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
