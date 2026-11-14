// Motormodell: MEP-kedjan FUELMEP → QMEP → IMEPg → BMEP, samma tankegång som i Kolvkraft.
import { CARS, UPG, BUILD, FUELS } from './data.js';

export const carById = id => CARS.find(c => c.id === id);
export const fuelById = id => FUELS.find(f => f.id === id) || FUELS[0];

export function defaultTune() { return { lambda: 0.95, ign: 0, fuel: 'b95', finalScale: 1, bias: 0.62 }; }

// Slår ihop grundbil + bygge + uppgraderingar + trimning till en färdig specifikation.
export function buildSpec(carId, cs, tune) {
  const c = carById(carId); cs = cs || { build: {}, upg: {} }; tune = { ...defaultTune(), ...(tune || {}) };
  const s = { id: c.id, name: c.name, cls: c.cls, body: c.body, Vd: c.Vd, cyl: c.cyl, redline: c.redline, rc: c.rc,
    etaPeak: c.etaPeak, peakRpm: c.peakRpm, low: 0, mass: c.mass + 75, wb: c.wb, front: c.front, final: c.final, gears: c.gears,
    CdA: c.CdA, cool: c.cool, boost: c.boost || 0, bs: c.boostStart || 2500, bf: c.boostFull || 3800, ic: c.ic || 0, pmepF: 1,
    ignMax: 5, knockCtl: 0, radSafe: 0, shift: 0.28, eff: 0.88, trac: 0, mu: 1, susp: 0, brake: 1, dmg: 1 };
  for (const b of BUILD) if (cs.build && cs.build[b.id]) s.mass += b.kg;
  for (const u of UPG) {
    const lvl = (cs.upg && cs.upg[u.id]) || 0; if (!lvl) continue;
    const fx = u.levels[lvl - 1].fx;
    if (fx.eta) s.etaPeak += fx.eta; if (fx.peak) s.peakRpm += fx.peak; if (fx.red) s.redline += fx.red; if (fx.low) s.low += fx.low;
    if (fx.pmep) s.pmepF = fx.pmep;
    if (fx.boost) { s.boost = Math.max(s.boost, 0) + fx.boost; s.bs = Math.max(s.bs, fx.bs); s.bf = Math.max(s.bf, fx.bf); }
    if (fx.ic) s.ic = Math.max(s.ic, fx.ic); if (fx.ignMax) s.ignMax = fx.ignMax; if (fx.knockCtl) s.knockCtl = 1;
    if (fx.cool) s.cool += fx.cool; if (fx.radSafe) s.radSafe = 1;
    if (fx.final) s.final *= fx.final; if (fx.shift) s.shift = fx.shift; if (fx.eff) s.eff += fx.eff;
    if (fx.trac) s.trac = 1; if (fx.kg) s.mass += fx.kg; if (fx.mu) s.mu += fx.mu; if (fx.susp) s.susp = fx.susp;
    if (fx.brake) s.brake += fx.brake; if (fx.dmg) s.dmg = fx.dmg;
  }
  s.final *= tune.finalScale; s.lambda = tune.lambda; s.ign = Math.min(tune.ign, s.ignMax); s.fuel = fuelById(tune.fuel); s.bias = tune.bias;
  s.rw = 0.29; s.idle = 900;
  return s;
}

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Alla MEP-poster vid ett varvtal (fullgas). Tryck i bar.
export function engineAt(s, rpm) {
  const f = s.fuel, x = (rpm - s.peakRpm) / s.peakRpm;
  let etaV = s.etaPeak * (1 - (x < 0 ? 0.42 + s.low * 4 : 0.62) * x * x);
  etaV = Math.max(0.45, etaV);
  const boost = s.boost > 0 ? s.boost * smooth(s.bs, s.bf, rpm) : 0;
  const T0 = 293, pi = 1.0 + boost;
  let Ti = T0;
  if (boost > 0) { const T2 = T0 * (1 + (Math.pow(pi, 0.286) - 1) / 0.68); Ti = T2 - s.ic * (T2 - T0); }
  Ti -= f.cool / Math.max(s.lambda, 0.75);
  const rho = pi * 1e5 / (287 * Ti);
  const lam = s.lambda;
  const fuelmep = etaV * rho * f.lhv * 1e6 / (lam * f.afs) / 1e5;
  const etaC = lam >= 1 ? 0.98 : 0.98 * (lam + 0.35 * (1 - lam));
  const qmep = fuelmep * etaC;
  let fLam = lam >= 1 ? 1 + 0.10 * Math.min(lam - 1, 0.15) - (lam > 1.15 ? 18 * (lam - 1.15) ** 2 : 0) : 1 - 2.5 * (1 - lam) ** 2;
  // knack
  const knockIdx = (ign) => s.rc * Math.pow(pi, 0.5) * Math.pow(Ti / 293, 1.3) * (1 + 0.022 * ign) * (lam < 1 ? 1 - 0.35 * (1 - lam) : 1 + 0.2 * (lam - 1));
  let ign = s.ign, margin = f.knock - knockIdx(ign);
  if (s.knockCtl && margin < 0) { while (margin < 0 && ign > -18) { ign -= 0.5; margin = f.knock - knockIdx(ign); } }
  const fTim = 1 - 0.0005 * ign * ign;
  const knockLoss = margin < 0 ? Math.max(0.7, 1 + 0.06 * margin) : 1;
  const etaOtto = 1 - Math.pow(s.rc, -0.3);
  const imep = qmep * etaOtto * 0.85 * fLam * fTim * knockLoss;
  const htmep = 0.172 * qmep, exmep = qmep - imep - htmep;
  const n = rpm / 1000;
  const pmep = (0.05 + 0.16 * (rpm / 6500) ** 2) * s.pmepF + (boost > 0 ? boost * 0.55 - boost * 0.75 : 0);
  const fmep = 0.97 + 0.15 * n + 0.005 * n * n;
  const bmep = imep - pmep - fmep;
  const Vd = s.Vd * 1e-3;
  const T = bmep * 1e5 * Vd / (4 * Math.PI);
  const P = T * rpm * 2 * Math.PI / 60 / 1000;
  const cps = rpm / 120;                      // arbetscykler per sekund
  const Qb = fuelmep * 1e5 * Vd * cps / 1000;  // kW
  const mf = Qb / (f.lhv * 1000);              // kg/s
  const qCool = htmep * 1e5 * Vd * cps / 1000;
  return { rpm, T, P, bmep, imep, pmep, fmep, fuelmep, qmep, clmep: fuelmep - qmep, exmep, htmep, etaV, boost, Ti: Ti - 273,
    margin, ign, etab: bmep / fuelmep, bsfc: P > 0 ? mf * 3600 * 1000 / P : 0, qCool, mf, Qb, af: lam * f.afs };
}

export function curve(s) {
  const pts = []; let pk = { P: 0 }, tk = { T: 0 }, minMargin = 99, maxCool = 0;
  for (let r = 1000; r <= s.redline + 1; r += 250) {
    const e = engineAt(s, r); pts.push(e);
    if (e.P > pk.P) pk = e; if (e.T > tk.T) tk = e; if (e.margin < minMargin) minMargin = e.margin; if (e.qCool > maxCool) maxCool = e.qCool;
  }
  return { pts, peakP: pk, peakT: tk, minMargin, maxCool, hp: pk.P * 1.36, kgHp: s.mass / (pk.P * 1.36) };
}

// Momenttabell för körfysiken.
export function torqueTable(s) {
  const tab = []; for (let r = 0; r <= s.redline + 500; r += 250) tab.push(Math.max(0, engineAt(s, Math.max(r, 800)).T));
  return rpm => { const x = Math.max(0, Math.min(tab.length - 1.001, rpm / 250)); const i = x | 0; return tab[i] + (tab[i + 1] - tab[i]) * (x - i); };
}

export const fmt = (v, d = 0) => v.toLocaleString('sv-SE', { minimumFractionDigits: d, maximumFractionDigits: d });
