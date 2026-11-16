// Sparning i webbläsaren (localStorage). Allt är inkapslat i try/catch så spelet fungerar även utan lagring.
import { defaultTune } from './engine.js';
const KEY = 'rokkikraft-v2';
const fresh = () => ({
  v: 2, money: 1000, name: 'Du', active: 'sunny',
  driverCls: 'auto', // 'auto' (bilens klass: Vetari/Kardaani/Super) eller 'junior', 'lady', 'senior', 'supersenior'
  warnings: 0,       // Förarpersonliga varningar (nollas vid ren tävling; 3 st = hylky + lippumiespesti)
  lippumies: 0,      // 1 = måste stå flaggvakt en tävlingshelg innan nästa start
  vouchers: 0,       // Hyvityskuitit (tillgodokvitton på anmälningsavgift om bilen gått sönder före 1:a heatet)
  cars: {
    sunny: {
      build: { strip: 1, cage: 1, seat: 1, net: 1, switch: 1 },
      upg: {}, paint: 'gul', num: 27, bw: 'wb', // 'wb' = svart på vit botten, 'bw' = vit på svart botten
      katsastusNo: 104,
      tune: defaultTune(),
    },
  },
  fuels: ['b95'], career: { res: {} }, records: {}, dyno: [0, 0, 0],
  settings: { camera: 4, vol: 50, quality: 'hog', touch: 'auto' }, aids: { abs: 1, tc: 1, auto: 1 },
});
function load() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem('rokkikraft-v1');
    if (raw) {
      const s = JSON.parse(raw), f = fresh();
      if (s.cars) {
        for (const k of Object.keys(s.cars)) {
          if (s.cars[k].build && s.cars[k].build.switch && !s.cars[k].build.net) s.cars[k].build.net = 1;
          if (!s.cars[k].bw) s.cars[k].bw = 'wb';
          if (!s.cars[k].katsastusNo) s.cars[k].katsastusNo = 100 + Math.floor(Math.random() * 800);
        }
      }
      return { ...f, ...s, settings: { ...f.settings, ...s.settings }, aids: { ...f.aids, ...s.aids } };
    }
  } catch (e) { }
  return fresh();
}
export const S = load();
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
export function reset() { const f = fresh(); for (const k of Object.keys(S)) delete S[k]; Object.assign(S, f); save(); }
export const activeCar = () => S.cars[S.active];
