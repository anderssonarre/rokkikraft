// Gemensamma hjälpfunktioner och UI-tillstånd (U) som alla vyer delar.
// (Del av menysystemet – se js/ui.js för render() och åtgärderna.)
import { PAINTS, CAREER } from '../data.js';
import { buildSpec, curve, defaultTune, fmt, checkInspection } from '../engine.js';
import { S, activeCar } from '../state.js';
import { accel0100 } from '../race.js';

export const app = () => document.getElementById('app');
export const eur = v => fmt(Math.round(v)) + ' €';
export const paintOf = id => (PAINTS.find(p => p.id === id) || PAINTS[0]);
export const hex = rgb => '#' + rgb.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const U = { view: 'menu', kompOpen: null, quick: { track: 'tammisaari', laps: 3, opp: 5, ai: 75, joker: 1 }, ev: null, task: null, taskDiff: 1, taskMsg: '', preview: null, race: null, toast: '' };
// Hastighet upp till vilken drivhjulen spinner (greppbegränsat) – över den begränsas accelerationen av effekten: v = P·η / (μ·Fz_drivaxel)
export const spinTo = (sp, mu) => { const k = curve(sp), axle = sp.drv === 'awd' ? 1 : sp.drv === 'fwd' ? sp.front : 1 - sp.front, g = (sp.drv === 'awd' ? Math.min(sp.muF, sp.muR) : sp.drv === 'fwd' ? sp.muF : sp.muR) || 1;
  return Math.round(k.hp * 735.5 * 0.88 / (mu * g * sp.mass * 9.81 * axle * 0.9) * 3.6); };
export const accC = {};
export const acc = sp => { const k = JSON.stringify([sp.id, sp.engId, sp.mass, sp.tqS, sp.muF, sp.rw, sp.gears, sp.final, sp.drv]); return accC[k] ??= accel0100(sp); };
export const spec = (id = S.active) => buildSpec(id, S.cars[id], S.cars[id]?.tune);
export const stockSpec = id => buildSpec(id, { build: { strip: 1, cage: 1, seat: 1, net: 1, switch: 1 }, upg: {} }, defaultTune());
export const currentInsp = () => checkInspection(S.active, activeCar(), S.driverCls);
export const levelPts = li => CAREER[li].events.reduce((a, e) => a + (S.career.res[e.id]?.pts || 0), 0);
export const levelOpen = li => li === 0 || levelPts(li - 1) >= CAREER[li].need;
export const topLevel = () => { let t = 0; CAREER.forEach((l, i) => { if (levelOpen(i)) t = i; }); return t; };
export const toast = t => { U.toast = t; };
export const TOD = [['morgon', '🌅 Morgon'], ['dag', '☀️ Dag'], ['kvall', '🌇 Kväll'], ['skymning', '🌆 Skymning']];
export const WEATHER = [['sol', '☀️ Sol'], ['mulet', '☁️ Mulet'], ['regn', '🌧 Regn'], ['dimma', '🌫 Dimma'], ['sno', '🌨 Snöfall']];
// Sääntökirja s. 8: "Kilpailunumerot sijoitetaan takasivulaseihin (ovessa olevat numerot eivät ole sallittu)...
// Kilpailunumerot oltava mustat valkoisella pohjalla tai valkoiset mustalla pohjalla."
export const plate = (numStr, col, bw = 'wb') => {
  const bg = bw === 'bw' ? '#111315' : '#f6f5f0';
  const fg = bw === 'bw' ? '#f6f5f0' : '#111315';
  return `<svg viewBox="0 0 220 155" class="plate" aria-hidden="true">
    <rect x="8" y="10" width="204" height="135" rx="14" fill="${col}"/>
    <path d="M24 22 L196 22 L204 128 L16 128 Z" fill="#18222c" stroke="#0d1318" stroke-width="3"/>
    <rect x="42" y="32" width="136" height="84" rx="6" fill="${bg}"/>
    <text x="110" y="96" text-anchor="middle" font-size="60" font-weight="900" font-family="Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif" fill="${fg}">${numStr}</text>
    <text x="110" y="140" text-anchor="middle" font-size="10" font-weight="700" fill="#111" opacity="0.85">TAKASIVULASI ≥ 20 CM (EJ PÅ DÖRR)</text>
  </svg>`;
};
export function stats() { if (!S.stats) S.stats = { sec: 0, races: 0, wins: 0, tracks: {} }; return S.stats; }
export const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const netName = () => (S.name && S.name !== 'Du' ? S.name : 'Förare').slice(0, 20);
