// Sparning i webbläsaren (localStorage). Allt är inkapslat i try/catch så spelet fungerar även utan lagring.
import { defaultTune } from './engine.js';
const KEY = 'rokkikraft-v1';
const fresh = () => ({ v: 1, money: 1000, name: 'Du', active: 'sunny',
  cars: { sunny: { build: { strip: 1, cage: 1, seat: 1, switch: 1 }, upg: {}, paint: 'gul', num: 27, tune: defaultTune() } },
  fuels: ['b95'], career: { res: {} }, records: {}, dyno: [0, 0, 0],
  settings: { vol: 50, quality: 'hog', touch: 'auto' }, aids: { abs: 1, tc: 1, auto: 1 } });
function load() { try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw), f = fresh(); return { ...f, ...s, settings: { ...f.settings, ...s.settings }, aids: { ...f.aids, ...s.aids } }; } } catch (e) { } return fresh(); }
export const S = load();
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
export function reset() { const f = fresh(); for (const k of Object.keys(S)) delete S[k]; Object.assign(S, f); save(); }
export const activeCar = () => S.cars[S.active];
