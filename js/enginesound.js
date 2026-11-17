// Motorljud per motortyp. Varje motor får en egen vågform som byggs av avgaspulserna under en hel motorcykel
// (720° vevaxel = två varv). Pulserna läggs där cylindrarna faktiskt tänder, med den styrka och tidsförskjutning som
// grenröret ger. Det är tändavstånden och ojämnheten mellan pulserna som gör att en femma, en V6 och en V8 låter olika.
//
//  R3  – 240° mellan tändningarna, tre pulser per cykel: ojämnt "brummande" i botten.
//  R4  – 180°, jämna pulser: ren, lite surrig ton (2:a ordningen dominerar).
//  R5  – 144°, tändföljd 1-2-4-5-3 och 5-i-1-grenrör med olika långa rör: pulserna blir olika starka, vilket ger
//        halvordningar (2,5:e ordningen) – det typiska Audi/Volvo-femcylinderljudet som "vrålar" och skiftar.
//  R6  – 120°, nästan identiska pulser och korta rör: slät, ljus och skrikig ton (BMW-raksexa).
//  V6  – 60° V6 med 120° tändavstånd men två cylinderbankar med var sitt grenrör: varannan puls kommer från andra
//        banken med annan styrka och fördröjning, vilket ger ett rivigt, raspigt morr (1,5:e ordningen).
//  V8  – korsplan (tändföljd 1-8-4-3-6-5-7-2): två pulser i rad på samma bank ger det mullrande "burble"-ljudet.
//  V8 flatplan (högvarvande) – 90° jämnt växlande mellan bankarna: skrikig, rå ton utan mullret.

const D = Math.PI / 360; // vevaxelgrader → radianer i vågformen (720° = 2π)

// tändvinkel (°), relativ styrka och liten tidsförskjutning (°) från grenröret
const PROFILES = {
  r3: { pulses: [[0, 1], [240, 0.9, 3], [480, 1.06, -2]], sig: 0.06,
    lp: 420, lpRpm: 0.3, lpThr: 1200, bassF: 70, bassG: 8, drive: 2.4, det: 6, gain: 1.05, pops: 0.03 },
  r4: { pulses: [[0, 1], [180, 0.96, 1.5], [360, 1.03, -1], [540, 0.95, 2]], sig: 0.045,
    lp: 520, lpRpm: 0.38, lpThr: 1500, bassF: 110, bassG: 4, drive: 2.0, det: 5, gain: 0.95, pops: 0.03 },
  r5: { pulses: [[0, 1], [144, 0.74, 5], [288, 0.93, -3], [432, 0.68, 6], [576, 0.87, -4]], sig: 0.05,
    lp: 460, lpRpm: 0.36, lpThr: 1450, bassF: 95, bassG: 6, drive: 2.3, det: 7, gain: 1.0, pops: 0.05 },
  r6: { pulses: [[0, 1], [120, 0.98, 0.5], [240, 1.01, -0.5], [360, 0.97, 1], [480, 1.02, -1], [600, 0.99, 0.5]], sig: 0.032,
    lp: 560, lpRpm: 0.42, lpThr: 1700, bassF: 120, bassG: 3, drive: 1.9, det: 4, gain: 0.95, pops: 0.03 },
  v6: { pulses: [[0, 1], [120, 0.7, 9], [240, 1.04], [360, 0.66, 8], [480, 0.97], [600, 0.72, 10]], sig: 0.05,
    lp: 440, lpRpm: 0.34, lpThr: 1400, bassF: 90, bassG: 6, drive: 2.6, det: 8, gain: 1.0, pops: 0.05 },
  // korsplan: bank (1 = vänster, 0 = höger) per tändning enligt 1-8-4-3-6-5-7-2
  v8: { bank: [1, 0, 0, 1, 0, 1, 1, 0], amp: [1, 0.94, 1.05, 0.97, 1.03, 0.92, 1, 1.06], sig: 0.048,
    lp: 380, lpRpm: 0.32, lpThr: 1300, bassF: 90, bassG: 7, drive: 2.2, det: 9, gain: 1.0, pops: 0.06 },
  v8flat: { pulses: [[0, 1], [90, 0.9, 3], [180, 1.02], [270, 0.88, 3], [360, 0.99], [450, 0.91, 3], [540, 1.03], [630, 0.89, 3]], sig: 0.034,
    lp: 600, lpRpm: 0.4, lpThr: 1800, bassF: 120, bassG: 4, drive: 2.5, det: 6, gain: 0.95, pops: 0.05 },
};
// korsplans-V8: varje bank har sina pulser lite förskjutna och den ena banken är svagare (olika rörlängd)
PROFILES.v8.pulses = PROFILES.v8.bank.map((b, k) => [k * 90 + (b ? 11 : -11), (b ? 1 : 0.55) * PROFILES.v8.amp[k]]);

export const SOUND_NAMES = { r3: 'Rak trea', r4: 'Rak fyra', r5: 'Rak femma', r6: 'Rak sexa', v6: 'V6', v8: 'V8 (korsplan)', v8flat: 'V8 (flatplan)' };

// Vilken ljudprofil en motor ska ha, utifrån cylinderantal och motornamn (V6 eller rak sexa osv.)
export function soundKey(spec) {
  const n = spec?.cyl || 4, name = String(spec?.engName || spec?.name || '');
  if (n >= 8) return (spec?.redline || 0) >= 7800 ? 'v8flat' : 'v8';
  if (n === 6) return /\bV6\b|VR6/i.test(name) ? 'v6' : 'r6';
  if (n === 5) return 'r5';
  if (n <= 3) return 'r3';
  return 'r4';
}
export const soundProfile = key => PROFILES[key] || PROFILES.r4;

// Bygger (och cachar per AudioContext) vågformen för en profil
export function engineWave(ac, key) {
  const cache = ac.__engWaves || (ac.__engWaves = {});
  if (cache[key]) return cache[key];
  const P = soundProfile(key), H = 120, re = new Float32Array(H + 1), im = new Float32Array(H + 1);
  for (let n = 1; n <= H; n++) {
    const env = Math.exp(-0.5 * (n * P.sig) ** 2);
    for (const [deg, a, off = 0] of P.pulses) { const th = (deg + off) * D; re[n] += a * Math.cos(n * th) * env; im[n] -= a * Math.sin(n * th) * env; }
  }
  return (cache[key] = ac.createPeriodicWave(re, im));
}
