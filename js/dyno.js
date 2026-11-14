// Räknebänken: slumpade räkneuppgifter med rokkiralli-tema. Tolerans 2 %.
import { fmt } from './engine.js';
const rnd = (a, b, step = 1) => Math.round((a + Math.random() * (b - a)) / step) * step;
const pick = a => a[Math.floor(Math.random() * a.length)];

const GEN = {
  1: [
    () => { const m = rnd(880, 1350, 10), hp = rnd(85, 240, 5), cut = rnd(40, 120, 10);
      return { title: 'Vikt per hästkraft', komp: 'kghk', hint: 'kg/hk = massa / effekt.',
        given: [['Vikt med förare m', fmt(m) + ' kg'], ['Motoreffekt P', fmt(hp) + ' hk'], ['Planerad strippning', '−' + cut + ' kg']],
        asks: [{ label: 'Vikt/effekt nu (kg/hk)', answer: m / hp }, { label: 'Vikt/effekt efter strippning (kg/hk)', answer: (m - cut) / hp }] }; },
    () => { const T = rnd(130, 320, 5), N = rnd(3500, 6800, 100);
      return { title: 'Effekt ur moment', komp: 'moment', hint: 'P = T · ω, där ω = 2π·N/60. 1 kW = 1,36 hk.',
        given: [['Moment T', fmt(T) + ' Nm'], ['Varvtal N', fmt(N) + ' rpm']],
        asks: [{ label: 'Effekt P (kW)', answer: T * N * 2 * Math.PI / 60000, dec: 1 }, { label: 'Effekt P (hk)', answer: T * N * 2 * Math.PI / 60000 * 1.36, dec: 0 }] }; },
    () => { const m = rnd(900, 1300, 10), goal = pick([5, 5.5, 6, 6.5]);
      return { title: 'Hur mycket effekt behövs?', komp: 'kghk', hint: 'P = m / (kg/hk).',
        given: [['Vikt med förare m', fmt(m) + ' kg'], ['Mål', fmt(goal, 1) + ' kg/hk']],
        asks: [{ label: 'Effekt som krävs (hk)', answer: m / goal, dec: 0 }, { label: 'Samma effekt i kW', answer: m / goal / 1.36, dec: 1 }] }; },
  ],
  2: [
    () => { const T = rnd(140, 330, 5), Vd = pick([1.6, 1.8, 2.0, 2.3, 2.5]), N = rnd(4000, 6500, 100);
      return { title: 'BMEP', komp: 'moment', hint: 'BMEP = 4π·T / Vd (Vd i m³ ger Pa; 1 bar = 10⁵ Pa).',
        given: [['Moment T', fmt(T) + ' Nm'], ['Slagvolym Vd', fmt(Vd, 1) + ' L'], ['Varvtal N', fmt(N) + ' rpm']],
        asks: [{ label: 'BMEP (bar)', answer: 4 * Math.PI * T / (Vd * 1e-3) / 1e5 }, { label: 'Effekt P (kW)', answer: T * N * 2 * Math.PI / 60000, dec: 1 }] }; },
    () => { const N = rnd(5000, 6800, 100), ig = pick([1.29, 1.37, 1.46, 1.0, 0.93]), fin = pick([3.62, 3.82, 4.06, 4.4]), r = pick([0.28, 0.29, 0.30]), T = rnd(140, 260, 10);
      return { title: 'Fart och drivkraft', komp: 'utvaxling', hint: 'Hjulvarv = N / (i·islut). v = ω·r. F = T·i·islut·η / r.',
        given: [['Varvtal N', fmt(N) + ' rpm'], ['Växelns utväxling i', fmt(ig, 2)], ['Slutväxel', fmt(fin, 2)], ['Hjulradie r', fmt(r, 2) + ' m'], ['Moment T', fmt(T) + ' Nm'], ['Drivlinans verkningsgrad η', '0,88']],
        asks: [{ label: 'Fart v (km/h)', answer: N / (ig * fin) * 2 * Math.PI / 60 * r * 3.6, dec: 1 }, { label: 'Drivkraft F (N)', answer: T * ig * fin * 0.88 / r, dec: 0 }] }; },
    () => { const R = rnd(15, 60, 5), mu1 = pick([0.75, 0.8, 0.85]), mu2 = pick([0.4, 0.45, 0.5]);
      return { title: 'Kurvfart på grus och is', komp: 'grepp', hint: 'v = √(μ·g·R), g = 9,81 m/s².',
        given: [['Kurvradie R', R + ' m'], ['Friktion grus μ', fmt(mu1, 2)], ['Friktion is μ', fmt(mu2, 2)]],
        asks: [{ label: 'Högsta kurvfart på grus (km/h)', answer: Math.sqrt(mu1 * 9.81 * R) * 3.6, dec: 1 }, { label: 'Högsta kurvfart på is (km/h)', answer: Math.sqrt(mu2 * 9.81 * R) * 3.6, dec: 1 }] }; },
  ],
  3: [
    () => { const P = rnd(70, 220, 5), bsfc = rnd(250, 340, 5), f = pick([['Bensin 95', 43.0], ['E85', 29.0]]), mf = P * bsfc / 1000;
      return { title: 'Bränsleeffekt och verkningsgrad', komp: 'pumpforlust', hint: 'Qb = ṁf · LHV (kg/s · kJ/kg). ηb = P / Qb. BSFC = ṁf / P.',
        given: [['Effekt P', fmt(P) + ' kW'], ['Bränsleflöde ṁf', fmt(mf, 2) + ' kg/h'], ['Värmevärde LHV, ' + f[0], fmt(f[1], 1) + ' MJ/kg']],
        asks: [{ label: 'Tillförd bränsleeffekt Qb (kW)', answer: mf / 3600 * f[1] * 1000, dec: 1 }, { label: 'Bromsad verkningsgrad ηb (%)', answer: P / (mf / 3600 * f[1] * 1000) * 100, dec: 1 }, { label: 'BSFC (g/kWh)', answer: mf * 1000 / P, dec: 0 }] }; },
    () => { const b = pick([0.4, 0.6, 0.8, 1.0, 1.2]), eps = pick([0.6, 0.7, 0.8]), T0 = 293, pr = 1 + b, T2 = T0 * (1 + (Math.pow(pr, 0.286) - 1) / 0.68), Ti = T2 - eps * (T2 - T0);
      return { title: 'Turbo och intercooler', komp: 'turbo', hint: 'T2 = T0·(1 + (π^0,286 − 1)/ηk). Ti = T2 − ε·(T2 − T0). ρ = p/(R·T), R = 287 J/kgK.',
        given: [['Laddtryck (övertryck)', fmt(b, 1) + ' bar'], ['Omgivning', '1,00 bar · 20 °C (293 K)'], ['Kompressorverkningsgrad ηk', '0,68'], ['Intercooler ε', fmt(eps, 1)]],
        asks: [{ label: 'Temperatur efter kompressorn T2 (°C)', answer: T2 - 273, dec: 0 }, { label: 'Insugstemperatur Ti (°C)', answer: Ti - 273, dec: 0 }, { label: 'Luftdensitet ρi (kg/m³)', answer: pr * 1e5 / (287 * Ti), dec: 2 }] }; },
    () => { const ma = rnd(250, 700, 10), lam = pick([0.85, 0.9, 0.95, 1.0, 1.05]), afs = pick([14.5, 9.8]), mf = ma / (lam * afs);
      return { title: 'Blandningen', komp: 'lambda', hint: 'A/F = ṁa / ṁf. λ = (A/F) / (A/F)s.',
        given: [['Luftflöde ṁa', fmt(ma) + ' kg/h'], ['Bränsleflöde ṁf', fmt(mf, 2) + ' kg/h'], ['Stökiometriskt (A/F)s', fmt(afs, 1) + (afs < 10 ? ' (E85)' : ' (bensin)')]],
        asks: [{ label: 'Luft/bränsle-förhållande A/F', answer: ma / +mf.toFixed(2), dec: 2 }, { label: 'λ', answer: ma / +mf.toFixed(2) / afs, dec: 2 }] }; },
  ],
};

export function newTask(diff) { const t = pick(GEN[diff])(); t.reward = [30, 60, 100][diff - 1]; t.diff = diff; return t; }
export function checkTask(t) {
  t.marks = t.asks.map((a, i) => { const v = parseFloat(String(t.vals[i] || '').replace(/\s/g, '').replace(',', '.')); return isFinite(v) && Math.abs(v - a.answer) <= Math.abs(a.answer) * 0.02 + 1e-9; });
  t.done = true; return { all: t.marks.every(Boolean) };
}
