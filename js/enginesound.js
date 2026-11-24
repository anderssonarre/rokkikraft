// Motorljud per motortyp samt procedurbaserad rallyljudbild (RallyAudioFX).
// Varje motor får en egen vågform byggs av avgaspulserna under en hel motorcykel (720° vevaxel = två varv).
// Pulserna har asymmetrisk blowdown-kant (skarpt avgasöppningsknäpp + mekanisk ventil-/insugskaraktär) så att
// R3, R4, R5, R6, V6 och V8 får en rå, autentisk rokkiralli-klang.
//
//  R3  – 240° mellan tändningarna, tre pulser per cykel: ojämnt, rått "brummande" i botten.
//  R4  – 180°, lätt ojämna 4-2-1-grenrörspulser: klassiskt rivigt folkrace-/rally-fyrasmatter.
//  R5  – 144°, tändföljd 1-2-4-5-3 och 5-i-1-grenrör med olika långa rör: tydliga halvordningar (2,5:e) –
//        det ikoniska Audi/Volvo-femcylindervrålet.
//  R6  – 120°, täta pulser och korta rör: vass, sjungande och mekanisk raksexa.
//  V6  – 60° V6 med två cylinderbankar och skilda grenrör: raspigt, aggressivt morr (1,5:e ordningen).
//  V8  – korsplan (1-8-4-3-6-5-7-2): två pulser i rad på samma bank ger rått muller ("burble").
//  V8 flatplan (högvarvande) – 90° växlande mellan bankarna: sylvasst, skrikigt tävlingsljud.

const D = Math.PI / 360; // vevaxelgrader → radianer i vågformen (720° = 2π)
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const num = (v, fb = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fb);

// tändvinkel (°), relativ styrka och liten tidsförskjutning (°) från grenröret
const PROFILES = {
  r3: {
    pulses: [[0, 1.02], [240, 0.88, 3.5], [480, 1.08, -2.5]],
    sig: 0.052, bark: 0.30, grit: 0.14, whine: 0.95,
    lp: 450, lpRpm: 0.34, lpThr: 1450, bassF: 74, bassG: 9, drive: 2.9, det: 7.5, gain: 1.05, pops: 0.045,
  },
  r4: {
    pulses: [[0, 1.0], [180, 0.93, 2.2], [360, 1.05, -1.6], [540, 0.92, 2.6]],
    sig: 0.038, bark: 0.36, grit: 0.16, whine: 1.05,
    lp: 540, lpRpm: 0.42, lpThr: 1850, bassF: 105, bassG: 5.5, drive: 2.75, det: 6.5, gain: 0.98, pops: 0.05,
  },
  r5: {
    pulses: [[0, 1.02], [144, 0.72, 5.5], [288, 0.95, -3.5], [432, 0.66, 6.5], [576, 0.89, -4.2]],
    sig: 0.042, bark: 0.38, grit: 0.15, whine: 1.1,
    lp: 490, lpRpm: 0.40, lpThr: 1750, bassF: 92, bassG: 7, drive: 2.85, det: 8, gain: 1.02, pops: 0.07,
  },
  r6: {
    pulses: [[0, 1.0], [120, 0.97, 0.8], [240, 1.02, -0.8], [360, 0.96, 1.2], [480, 1.03, -1.1], [600, 0.98, 0.7]],
    sig: 0.028, bark: 0.32, grit: 0.12, whine: 1.0,
    lp: 590, lpRpm: 0.46, lpThr: 1950, bassF: 118, bassG: 4.5, drive: 2.45, det: 5.5, gain: 0.98, pops: 0.045,
  },
  v6: {
    pulses: [[0, 1.02], [120, 0.68, 9.5], [240, 1.06, -1.0], [360, 0.64, 8.5], [480, 0.98, 0.5], [600, 0.71, 10.5]],
    sig: 0.042, bark: 0.40, grit: 0.18, whine: 1.05,
    lp: 470, lpRpm: 0.38, lpThr: 1680, bassF: 88, bassG: 7, drive: 3.1, det: 9.5, gain: 1.02, pops: 0.065,
  },
  // korsplan: bank (1 = vänster, 0 = höger) per tändning enligt 1-8-4-3-6-5-7-2
  v8: {
    bank: [1, 0, 0, 1, 0, 1, 1, 0], amp: [1.02, 0.93, 1.06, 0.96, 1.04, 0.90, 1.01, 1.08],
    sig: 0.042, bark: 0.36, grit: 0.16, whine: 0.9,
    lp: 410, lpRpm: 0.36, lpThr: 1580, bassF: 85, bassG: 8.5, drive: 2.85, det: 11, gain: 1.02, pops: 0.075,
  },
  v8flat: {
    pulses: [[0, 1.0], [90, 0.89, 3.2], [180, 1.03], [270, 0.87, 3.4], [360, 1.0], [450, 0.90, 3.1], [540, 1.04], [630, 0.88, 3.3]],
    sig: 0.029, bark: 0.40, grit: 0.14, whine: 1.15,
    lp: 640, lpRpm: 0.45, lpThr: 2100, bassF: 115, bassG: 5, drive: 3.0, det: 7.5, gain: 0.98, pops: 0.065,
  },
};
// korsplans-V8: varje bank har sina pulser lite förskjutna och den ena banken är svagare (olika rörlängd)
PROFILES.v8.pulses = PROFILES.v8.bank.map((b, k) => [k * 90 + (b ? 11.5 : -11.5), (b ? 1 : 0.54) * PROFILES.v8.amp[k]]);

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

// Bygger (och cachar per AudioContext) vågformen för en profil med asymmetrisk blowdown-puls och mekanisk bett-struktur
export function engineWave(ac, key) {
  const cache = ac.__engWaves || (ac.__engWaves = {});
  if (cache[key]) return cache[key];
  const P = soundProfile(key), H = 152, re = new Float32Array(H + 1), im = new Float32Array(H + 1);
  const bark = P.bark ?? 0.34, grit = P.grit ?? 0.14;
  for (let n = 1; n <= H; n++) {
    const envMain = Math.exp(-0.5 * (n * P.sig) ** 2);
    // Skarpare sekundär avgasöppningskant (blowdown) ger råare rasp utan att tappa grundtonen
    const envBark = Math.exp(-0.5 * (n * P.sig * 0.48) ** 2) * (n <= 4 ? 0.25 : 1);
    const mech = n > 6 ? 1 + grit * Math.sin(n * 1.6180339887) : 1;
    for (const [deg, a, off = 0] of P.pulses) {
      const th = (deg + off) * D;
      const thB = (deg + off + 5.5) * D; // kort negativ efterpuls = asymmetrisk tryckvåg i avgasröret
      const wMain = a * envMain * mech;
      const wBark = -a * bark * envBark;
      re[n] += wMain * Math.cos(n * th) + wBark * Math.cos(n * thB);
      im[n] -= wMain * Math.sin(n * th) + wBark * Math.sin(n * thB);
    }
  }
  return (cache[key] = ac.createPeriodicWave(re, im));
}

// ============================================================================================================
// RallyAudioFX – komplett procedurbaserad rallyljudbild (Web Audio API, noll bufferallokering under körning)
// ============================================================================================================
function makeNoiseBuffer(ac, secs) {
  const len = Math.max(1, Math.floor(ac.sampleRate * secs));
  const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  // Lätt värmd bredbandig bruskälla (vit + mjukt integrerat rosa inslag) för fylligare grus & däck
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    lp = lp * 0.72 + w * 0.28;
    d[i] = w * 0.78 + lp * 0.45;
  }
  return buf;
}

function makeStoneBuffers(ac) {
  const sr = ac.sampleRate, specs = [
    { secs: 0.022, decay: 0.16, ring: 3400, ringMix: 0.42 }, // vasst grusknäpp i plåtgolv
    { secs: 0.032, decay: 0.22, ring: 2250, ringMix: 0.35 }, // ihåligt hjulhusknäpp
    { secs: 0.018, decay: 0.14, ring: 4500, ringMix: 0.28 }, // litet korn mot skärmkant
    { secs: 0.044, decay: 0.28, ring: 1450, ringMix: 0.30 }, // grövre sten mot balk/underrede
  ];
  return specs.map(sp => {
    const len = Math.max(1, Math.floor(sr * sp.secs));
    const buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const att = i < 12 ? i / 12 : 1;
      const env = att * Math.exp(-t / sp.decay);
      const ring = Math.sin(2 * Math.PI * sp.ring * (i / sr)) * sp.ringMix;
      d[i] = ((Math.random() * 2 - 1) * (1 - sp.ringMix) + ring) * env;
    }
    return buf;
  });
}

function makePopBuffers(ac) {
  const sr = ac.sampleRate, specs = [
    { secs: 0.075, decay: 0.17, bite: 0.55 }, // hård avgassmäll
    { secs: 0.055, decay: 0.14, bite: 0.70 }, // rappt knatter
    { secs: 0.105, decay: 0.23, bite: 0.40 }, // dovare avgaspuff
  ];
  return specs.map(sp => {
    const len = Math.max(1, Math.floor(sr * sp.secs));
    const buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const att = t < 0.03 ? t / 0.03 : 1;
      const env = att * Math.exp(-t / sp.decay);
      const crack = (Math.random() * 2 - 1) * (t < 0.15 ? 1 + sp.bite : 1);
      d[i] = Math.tanh(crack * 1.4) * env;
    }
    return buf;
  });
}

function makeCrashBuffer(ac) {
  const sr = ac.sampleRate, len = Math.max(1, Math.floor(sr * 0.52));
  const buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const att = t < 0.012 ? t / 0.012 : 1;
    // Skrovlig avklingning med små sekundära plåtskrammel-toppar
    const mod = 0.75 + 0.25 * Math.sin(t * 95) * Math.sin(t * 23);
    d[i] = (Math.random() * 2 - 1) * att * Math.pow(1 - t, 2.3) * mod;
  }
  return buf;
}

export class RallyAudioFX {
  /**
   * @param {AudioContext} ac - befintlig AudioContext
   * @param {AudioNode} [masterGain] - master-GainNode (fallback: ac.destination)
   * @param {object} [opts] - valfria inställningar: { gain, profileKey, whineScale }
   */
  constructor(ac, masterGain = null, opts = {}) {
    this.ac = ac || null;
    this.stopped = false;
    this.ok = false;
    this._lastGear = null;
    this._prevThr = 0;
    this._prevBackfire = 0;
    this._peakAirY = 0;
    this._wasAir = false;
    this._stoneAcc = 0;
    this._popAcc = 0;
    this._lastPopT = -1;
    this._lastShiftT = -1;
    this._lastImpactT = -1;
    this._lastImpactS = 0;
    this._lastLandT = -1;
    this._sources = [];

    const prof = soundProfile(opts.profileKey || 'r4');
    this._whineScale = num(opts.whineScale, prof.whine ?? 1.0);
    this._popRate = num(opts.popRate, prof.pops ?? 0.05);

    if (!ac || typeof ac.createGain !== 'function') return;

    try {
      const out = masterGain || ac.destination;
      const bus = this.bus = ac.createGain();
      bus.gain.value = clamp(num(opts.gain, 1), 0, 2);
      bus.connect(out);

      // Förallokerade bruskällor (inga tunga allokeringar under heatet)
      const noiseBuf = makeNoiseBuffer(ac, 2.4);
      this._stoneBufs = makeStoneBuffers(ac);
      this._popBufs = makePopBuffers(ac);
      this._crashBuf = makeCrashBuffer(ac);

      const startLoop = (rate = 1, offset = 0) => {
        const s = ac.createBufferSource();
        s.buffer = noiseBuf;
        s.loop = true;
        s.playbackRate.value = rate;
        s.start(0, offset);
        this._sources.push(s);
        return s;
      };

      // 1) Grussmatter i hjulhusen (bandpass-filtrerat kontinuerligt spray + slumpade stenknäppar)
      {
        const src = startLoop(1.12, 0.13);
        const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 720;
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1950; bp.Q.value = 1.35;
        const g = ac.createGain(); g.gain.value = 0;
        src.connect(hp); hp.connect(bp); bp.connect(g); g.connect(bus);
        this._grvSprayF = bp; this._grvSprayG = g;
      }

      // 2) Grus – dovt malande grusljud vid sladd/spinn/rullning
      {
        const src = startLoop(0.84, 0.71);
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 260; bp.Q.value = 0.9;
        const g = ac.createGain(); g.gain.value = 0;
        src.connect(bp); bp.connect(g); g.connect(bus);
        this._grvGrindF = bp; this._grvGrindG = g;
      }

      // 3) Asfalt – dubbla resonansband för äkta däckskrik vid slip/låsning + mjukt rullbrus
      {
        const src = startLoop(1.0, 1.31);
        const f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 1280; f1.Q.value = 8.5;
        const f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 2280; f2.Q.value = 10.5;
        const g1 = ac.createGain(); g1.gain.value = 0.72;
        const g2 = ac.createGain(); g2.gain.value = 0.36;
        const g = ac.createGain(); g.gain.value = 0;
        src.connect(f1); f1.connect(g1); g1.connect(g);
        src.connect(f2); f2.connect(g2); g2.connect(g);
        g.connect(bus);
        this._asphF1 = f1; this._asphF2 = f2; this._asphG = g;

        const rSrc = startLoop(0.75, 0.42);
        const rLp = ac.createBiquadFilter(); rLp.type = 'lowpass'; rLp.frequency.value = 220; rLp.Q.value = 0.7;
        const rG = ac.createGain(); rG.gain.value = 0;
        rSrc.connect(rLp); rLp.connect(rG); rG.connect(bus);
        this._asphRollF = rLp; this._asphRollG = rG;
      }

      // 4) Is – krispigt skrap och dubbknaster
      {
        const src = startLoop(1.22, 1.87);
        const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1650;
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3350; bp.Q.value = 2.2;
        const g = ac.createGain(); g.gain.value = 0;
        src.connect(hp); hp.connect(bp); bp.connect(g); g.connect(bus);
        this._iceF = bp; this._iceG = g;
      }

      // 5) Växellåds-vinande (raktandad rallylåda – mjuk triangel + svag överton genom smalt bandpass)
      {
        const o1 = ac.createOscillator(), o2 = ac.createOscillator();
        o1.type = 'triangle'; o2.type = 'sawtooth';
        o1.frequency.value = 320; o2.frequency.value = 640;
        const g1 = ac.createGain(); g1.gain.value = 0.78;
        const g2 = ac.createGain(); g2.gain.value = 0.20;
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 4.2;
        const g = ac.createGain(); g.gain.value = 0;
        o1.connect(g1); g1.connect(bp);
        o2.connect(g2); g2.connect(bp);
        bp.connect(g); g.connect(bus);
        o1.start(); o2.start();
        this._sources.push(o1, o2);
        this._whineO1 = o1; this._whineO2 = o2; this._whineF = bp; this._whineG = g;
      }

      this.ok = true;
    } catch {
      this.ok = false;
    }
  }

  /** Justera mastervolym på FX-bussen (0..2). */
  setVolume(vol) {
    if (!this.ok || this.stopped) return;
    const t = this.ac.currentTime;
    this.bus.gain.setTargetAtTime(clamp(num(vol, 1), 0, 2), t, 0.03);
  }

  /**
   * Uppdatera kontinuerliga rallyljud och slumpade/händelsestyrda effekter per bildruta.
   * @param {object} state - körstatus från race.js (alla fält valfria med säkra standardvärden)
   * @param {number} [dt=1/60] - bildrutetid i sekunder
   */
  update(state = {}, dt = 1 / 60) {
    if (!this.ok || this.stopped) return;
    const ac = this.ac;
    if (ac.state === 'closed') { this.stopped = true; return; }
    if (ac.state === 'suspended') return;

    const t = ac.currentTime;
    const stepDt = clamp(num(dt, 1 / 60), 0, 0.1);

    if (state.paused) {
      this._grvSprayG.gain.setTargetAtTime(0, t, 0.04);
      this._grvGrindG.gain.setTargetAtTime(0, t, 0.04);
      this._asphG.gain.setTargetAtTime(0, t, 0.04);
      this._asphRollG.gain.setTargetAtTime(0, t, 0.04);
      this._iceG.gain.setTargetAtTime(0, t, 0.04);
      this._whineG.gain.setTargetAtTime(0, t, 0.04);
      return;
    }

    const vx = num(state.vx, 0), vy = num(state.vy, 0);
    const speed = Math.max(0, num(state.speed, Math.hypot(vx, vy)));
    const rpm = clamp(num(state.rpm, 900), 400, 14000);
    const redline = clamp(num(state.redline, 6800), 3500, 14000);
    const thr = clamp(num(state.throttle ?? state.thr, 0), 0, 1);
    const wheelSpin = clamp(num(state.wheelSpin ?? state.slip, 0), 0, 2.5);
    const lock = typeof state.lock === 'boolean' ? (state.lock ? 1 : 0) : clamp(num(state.lock, 0), 0, 1);
    const gear = Number.isFinite(state.gear) ? state.gear : null;
    const surf = state.surface === 'asfalt' || state.surface === 'is' ? state.surface : 'grus';
    const onSurf = state.onSurf !== false;
    const airY = Math.max(0, num(state.airY, 0));
    const grounded = airY <= 0.05 ? 1 : clamp(1 - (airY - 0.05) / 0.15, 0, 1);
    const loose = !!state.exhaustLoose;

    // Sladdvinkel och total glidintensitet (fungerar vare sig slide eller vx/vy skickas)
    const slipAngle = Math.abs(num(
      state.slipAngle,
      speed > 1.5 && state.vy != null ? Math.atan2(vy, Math.max(2, Math.abs(vx))) : 0,
    ));
    const slide = state.slide != null
      ? clamp(num(state.slide, 0), 0, 1.5)
      : clamp(slipAngle * 1.85 + wheelSpin * 0.55 + lock * 0.75, 0, 1.5);

    const roll = clamp(speed / 30, 0, 1.25);
    const isAsph = surf === 'asfalt' && onSurf;
    const isIce = surf === 'is';
    const isGravel = !isAsph && !isIce; // inkluderar avkörning på grusvall vid asfaltbana
    const offBoost = onSurf ? 1 : 1.45;

    // --- 1. Grussmatter i hjulhusen & mot plåtgolvet ---
    const sprayLevel = isGravel && speed > 1.2
      ? grounded * clamp((roll * 0.42 + slide * 0.58 + wheelSpin * 0.35) * offBoost, 0, 1.35)
      : (isIce && speed > 3 ? grounded * roll * 0.12 : 0);
    this._grvSprayF.frequency.setTargetAtTime(1450 + clamp(speed * 26, 0, 1050) + slide * 420, t, 0.05);
    this._grvSprayG.gain.setTargetAtTime(sprayLevel * 0.125, t, 0.05);

    // Slumpade korta stenknäppar mot skärmar/plåtgolv (proportionellt mot fart & sladdvinkel på grus)
    if (isGravel && grounded > 0.3 && speed > 1.6 && stepDt > 0) {
      const stoneDrive = (roll * 0.55 + clamp(slipAngle * 1.5, 0, 1.2) * 0.85 + slide * 0.55 + wheelSpin * 0.85) * offBoost;
      const rate = clamp(stoneDrive * 24, 0, 34);
      this._stoneAcc += rate * stepDt;
      let fired = 0;
      while (this._stoneAcc >= 1 && fired < 2) {
        this._stoneAcc -= 1;
        fired++;
        const pStrength = clamp(0.28 + roll * 0.45 + slide * 0.35 + Math.random() * 0.35, 0.2, 1.2);
        this._stonePing(pStrength * grounded, t + Math.random() * Math.min(stepDt, 0.025));
      }
      if (this._stoneAcc > 3) this._stoneAcc = 0;
    } else {
      this._stoneAcc = 0;
    }

    // --- 2. Däckljud per underlag ---
    // Grus: dovt malande grusljud vid rullning, sladd och hjulspinn
    const grvGain = isGravel && speed > 0.6
      ? grounded * (0.045 * roll + 0.165 * Math.min(1.2, slide) * clamp(speed / 12, 0.25, 1.15) + 0.07 * wheelSpin) * offBoost
      : 0;
    this._grvGrindF.frequency.setTargetAtTime(175 + clamp(speed * 6.5, 0, 210) + slide * 115, t, 0.06);
    this._grvGrindG.gain.setTargetAtTime(clamp(grvGain, 0, 0.34), t, 0.05);

    // Asfalt: realistiskt tvåbands-däckskrik vid slip/låsning + svagt vägbrus
    const asphSlip = isAsph ? clamp((slide - 0.14) / 0.85 + lock * 0.6 + wheelSpin * 0.55, 0, 1.25) : 0;
    const asphSpdK = clamp(speed / 9, 0, 1.1);
    const asphScreech = grounded * asphSlip * asphSpdK * 0.175;
    const pitchMod = 1 + clamp(speed / 45, 0, 0.35) + asphSlip * 0.18 - lock * 0.1;
    this._asphF1.frequency.setTargetAtTime(1080 * pitchMod, t, 0.05);
    this._asphF2.frequency.setTargetAtTime(1980 * pitchMod, t, 0.05);
    this._asphF1.Q.setTargetAtTime(6.5 + asphSlip * 4.5, t, 0.07);
    this._asphF2.Q.setTargetAtTime(8.0 + asphSlip * 5.0, t, 0.07);
    this._asphG.gain.setTargetAtTime(clamp(asphScreech, 0, 0.28), t, 0.045);

    const asphRoll = isAsph && speed > 1 ? grounded * clamp(speed / 35, 0, 1) * 0.055 : 0;
    this._asphRollF.frequency.setTargetAtTime(150 + clamp(speed * 5, 0, 220), t, 0.08);
    this._asphRollG.gain.setTargetAtTime(asphRoll, t, 0.06);

    // Is: krispigt dubb-/isskrap som stiger i skärpa vid sladd och låsning
    const iceGain = isIce && speed > 0.6
      ? grounded * (0.04 * roll + 0.14 * Math.min(1.2, slide + lock * 0.5) * clamp(speed / 10, 0.25, 1.15))
      : 0;
    this._iceF.frequency.setTargetAtTime(2600 + clamp(speed * 28, 0, 1100) + slide * 650, t, 0.05);
    this._iceF.Q.setTargetAtTime(1.8 + slide * 1.6, t, 0.07);
    this._iceG.gain.setTargetAtTime(clamp(iceGain, 0, 0.25), t, 0.05);

    // --- 3. Växellåds-vinande (raktandat mekaniskt vinande med fart & belastning) ---
    const gNum = gear && gear > 0 ? gear : 1;
    const whineF = clamp(180 + speed * (25 + Math.max(0, 5 - gNum) * 3.5) + rpm * 0.035, 160, 2900);
    const decelLoad = thr < 0.1 && speed > 8 ? 0.42 : 0;
    const whineLoad = 0.35 + 0.65 * thr + decelLoad;
    const whineGain = speed > 2.2
      ? clamp((speed - 2.2) / 34, 0, 1) * whineLoad * 0.036 * this._whineScale
      : 0;
    this._whineO1.frequency.setTargetAtTime(whineF, t, 0.035);
    this._whineO2.frequency.setTargetAtTime(whineF * 2.004, t, 0.035);
    this._whineF.frequency.setTargetAtTime(clamp(whineF * 1.15, 260, 3400), t, 0.05);
    this._whineG.gain.setTargetAtTime(whineGain, t, 0.05);

    // --- 4. Mekaniskt växlingsklonk när växel ändras ---
    if (gear !== null) {
      if (this._lastGear !== null && gear !== this._lastGear && (gear > 0 || this._lastGear > 0)) {
        this.shiftClunk(gear > this._lastGear ? 1 : -1);
      }
      this._lastGear = gear;
    }

    // --- 5. Landningsduns efter krön/hopp ---
    if (airY > 0.08) {
      this._wasAir = true;
      if (airY > this._peakAirY) this._peakAirY = airY;
    } else if (this._wasAir && airY <= 0.025) {
      const lStr = clamp(this._peakAirY * 1.55, 0.2, 1.0);
      this.landing(lStr, isGravel);
      this._wasAir = false;
      this._peakAirY = 0;
    }

    // --- 6. Avgassmällar / knatter (backfire) vid gaslyft på höga varv ---
    const extBf = state.backfire;
    if (extBf !== undefined) {
      const bfVal = typeof extBf === 'boolean' ? (extBf ? 1 : 0) : clamp(num(extBf, 0), 0, 1.5);
      if (bfVal > 0.15 && this._prevBackfire <= 0.15) {
        this.backfire(clamp(bfVal, 0.45, 1.25), loose);
      }
      this._prevBackfire = bfVal;
    }

    // Automatisk gaslyfts- & motorbromsdetektion (kan stängas av med state.autoBackfire === false)
    if (state.autoBackfire !== false && stepDt > 0) {
      const hiRpm = rpm > Math.max(3100, redline * 0.5);
      const liftOff = this._prevThr > 0.42 && thr < 0.15 && (this._prevThr - thr) > 0.18;
      if (liftOff && hiRpm) {
        const str = clamp(0.55 + (rpm / redline) * 0.55, 0.5, 1.15);
        this.backfire(str, loose);
        this._popAcc = 0;
      } else if (thr < 0.12 && hiRpm && speed > 4) {
        const rpmK = clamp((rpm - redline * 0.46) / (redline * 0.54), 0, 1);
        const rate = (2.5 + this._popRate * 65) * (0.35 + rpmK * 0.95) * (loose ? 1.4 : 1);
        this._popAcc += rate * stepDt;
        if (this._popAcc >= 1) {
          this._popAcc = 0;
          if (Math.random() < 0.72) {
            this.backfire(clamp(0.32 + rpmK * 0.55 + Math.random() * 0.25, 0.3, 1.0), loose);
          }
        }
      } else {
        this._popAcc = 0;
      }
    }
    this._prevThr = thr;
  }

  /** Kort mekaniskt växlingsklonk (dir: +1 uppväxling, -1 nedväxling). */
  shiftClunk(dir = 1) {
    if (!this.ok || this.stopped) return;
    const ac = this.ac;
    if (ac.state !== 'running') return;
    const t = ac.currentTime;
    if (t - this._lastShiftT < 0.065) return;
    this._lastShiftT = t;

    try {
      // Klonk 1: växelspak & urkoppling (kort metalliskt knäpp + djup impuls)
      const o1 = ac.createOscillator(), g1 = ac.createGain();
      o1.type = 'triangle';
      const f0 = dir >= 0 ? 155 : 130;
      o1.frequency.setValueAtTime(f0, t);
      o1.frequency.exponentialRampToValueAtTime(52, t + 0.055);
      g1.gain.setValueAtTime(0.001, t);
      g1.gain.linearRampToValueAtTime(0.20, t + 0.004);
      g1.gain.exponentialRampToValueAtTime(0.0008, t + 0.06);
      o1.connect(g1); g1.connect(this.bus);
      o1.start(t); o1.stop(t + 0.068);
      o1.onended = () => { try { o1.disconnect(); g1.disconnect(); } catch {} };

      const click = ac.createBufferSource(), cBp = ac.createBiquadFilter(), cG = ac.createGain();
      click.buffer = this._stoneBufs[3];
      click.playbackRate.value = dir >= 0 ? 1.15 : 0.92;
      cBp.type = 'bandpass'; cBp.frequency.value = dir >= 0 ? 1480 : 1120; cBp.Q.value = 2.4;
      cG.gain.value = 0.22;
      click.connect(cBp); cBp.connect(cG); cG.connect(this.bus);
      click.start(t);
      click.onended = () => { try { click.disconnect(); cBp.disconnect(); cG.disconnect(); } catch {} };

      // Klonk 2: raktandad ingrepps-"chunk" 30 ms senare
      const t2 = t + 0.030;
      const o2 = ac.createOscillator(), g2 = ac.createGain();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(102, t2);
      o2.frequency.exponentialRampToValueAtTime(44, t2 + 0.065);
      g2.gain.setValueAtTime(0.001, t2);
      g2.gain.linearRampToValueAtTime(0.17, t2 + 0.005);
      g2.gain.exponentialRampToValueAtTime(0.0008, t2 + 0.072);
      o2.connect(g2); g2.connect(this.bus);
      o2.start(t2); o2.stop(t2 + 0.08);
      o2.onended = () => { try { o2.disconnect(); g2.disconnect(); } catch {} };
    } catch {}
  }

  /** Avgassmäll / rally-backfire (strength 0.2..1.4). */
  backfire(strength = 0.85, loose = false) {
    if (!this.ok || this.stopped) return;
    const ac = this.ac;
    if (ac.state !== 'running') return;
    const t = ac.currentTime;
    if (t - this._lastPopT < 0.052) return;
    this._lastPopT = t;

    const s = clamp(num(strength, 0.8), 0.2, 1.4) * (loose ? 1.32 : 1);
    const fireOne = (at, amp, hi = false) => {
      try {
        // Lågfrekvent avgastryckspuls ("pang" i bröstet)
        const sub = ac.createOscillator(), sg = ac.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(hi ? 160 : 128, at);
        sub.frequency.exponentialRampToValueAtTime(38, at + (hi ? 0.048 : 0.072));
        sg.gain.setValueAtTime(0.001, at);
        sg.gain.linearRampToValueAtTime(Math.min(0.45, 0.24 * amp), at + 0.003);
        sg.gain.exponentialRampToValueAtTime(0.0008, at + (hi ? 0.055 : 0.082));
        sub.connect(sg); sg.connect(this.bus);
        sub.start(at); sub.stop(at + 0.09);
        sub.onended = () => { try { sub.disconnect(); sg.disconnect(); } catch {} };

        // Skarp avgasknall via bandpass-filtrerad puls
        const src = ac.createBufferSource();
        src.buffer = this._popBufs[(Math.random() * this._popBufs.length) | 0];
        src.playbackRate.value = (hi ? 1.15 : 0.88) + Math.random() * 0.28;
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = (hi ? 950 : 520) + Math.random() * 680;
        bp.Q.value = 1.05;
        const g = ac.createGain();
        g.gain.value = Math.min(0.65, 0.38 * amp);
        src.connect(bp); bp.connect(g); g.connect(this.bus);
        src.start(at);
        src.onended = () => { try { src.disconnect(); bp.disconnect(); g.disconnect(); } catch {} };
      } catch {}
    };

    fireOne(t, s, false);
    // Vid starkare avslag: ett snabbt efterknatter i varma grenröret
    if (s > 0.62 && Math.random() < 0.55) {
      fireOne(t + 0.055 + Math.random() * 0.055, s * 0.48, true);
    }
  }

  /** Fjädringsduns vid landning efter krön/hopp (strength 0..1). */
  landing(strength = 0.5, onGravel = true) {
    if (!this.ok || this.stopped) return;
    const ac = this.ac;
    if (ac.state !== 'running') return;
    const t = ac.currentTime;
    if (t - this._lastLandT < 0.14) return;
    this._lastLandT = t;

    const s = clamp(num(strength, 0.5), 0.1, 1.2);
    try {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(92 + s * 25, t);
      o.frequency.exponentialRampToValueAtTime(32, t + 0.13);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.32 * s, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.15);
      o.connect(g); g.connect(this.bus);
      o.start(t); o.stop(t + 0.16);
      o.onended = () => { try { o.disconnect(); g.disconnect(); } catch {} };

      const src = ac.createBufferSource(), lp = ac.createBiquadFilter(), ng = ac.createGain();
      src.buffer = this._crashBuf;
      src.playbackRate.value = 1.45;
      lp.type = 'lowpass'; lp.frequency.value = 320 + s * 220;
      ng.gain.setValueAtTime(0.24 * s, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      src.connect(lp); lp.connect(ng); ng.connect(this.bus);
      src.start(t); src.stop(t + 0.15);
      src.onended = () => { try { src.disconnect(); lp.disconnect(); ng.disconnect(); } catch {} };

      if (onGravel) {
        this._stonePing(0.85 * s, t + 0.015);
        this._stonePing(0.65 * s, t + 0.048);
      }
    } catch {}
  }

  /**
   * Kollisionsbrak / plåtsmäll.
   * @param {number} [strength=0.5] - normaliserad smällstyrka 0..1 (t.ex. Math.min(1, hit / 12))
   */
  impact(strength = 0.5) {
    if (!this.ok || this.stopped) return;
    const ac = this.ac;
    if (ac.state !== 'running') return;
    const t = ac.currentTime;
    const s = clamp(num(strength, 0.5), 0.05, 1.5);
    if (t - this._lastImpactT < 0.075 && s <= this._lastImpactS + 0.35) return;
    this._lastImpactT = t;
    this._lastImpactS = s;

    const amp = Math.min(1.25, s);
    try {
      // 1) Kaross-/chassismäll (djup kraftig stöt)
      const sub = ac.createOscillator(), sg = ac.createGain();
      const subDur = 0.13 + 0.11 * amp;
      sub.type = 'sine';
      sub.frequency.setValueAtTime(125 + Math.random() * 25, t);
      sub.frequency.exponentialRampToValueAtTime(30, t + subDur);
      sg.gain.setValueAtTime(0.001, t);
      sg.gain.linearRampToValueAtTime(0.42 * amp, t + 0.004);
      sg.gain.exponentialRampToValueAtTime(0.0008, t + subDur + 0.02);
      sub.connect(sg); sg.connect(this.bus);
      sub.start(t); sub.stop(t + subDur + 0.03);
      sub.onended = () => { try { sub.disconnect(); sg.disconnect(); } catch {} };

      // 2) Skrynklad plåt / brak (brett bandpass-brus med rå avklingning)
      const cr = ac.createBufferSource(), cBp = ac.createBiquadFilter(), cG = ac.createGain();
      cr.buffer = this._crashBuf;
      cr.playbackRate.value = 0.85 + Math.random() * 0.32;
      cBp.type = 'bandpass'; cBp.frequency.value = 340 + Math.random() * 440; cBp.Q.value = 0.85;
      cG.gain.value = 0.52 * amp;
      cr.connect(cBp); cBp.connect(cG); cG.connect(this.bus);
      cr.start(t);
      cr.onended = () => { try { cr.disconnect(); cBp.disconnect(); cG.disconnect(); } catch {} };

      // 3) Metalliskt plåtklang (två korta dämpade deltoner = äkta folkrace-plåt)
      const ringDur = 0.10 + 0.12 * amp;
      for (let k = 0; k < 2; k++) {
        const ro = ac.createOscillator(), rg = ac.createGain();
        const rf = (k === 0 ? 540 : 1090) + Math.random() * (k === 0 ? 320 : 560);
        ro.type = k === 0 ? 'triangle' : 'square';
        ro.frequency.setValueAtTime(rf, t);
        ro.frequency.exponentialRampToValueAtTime(rf * 0.88, t + ringDur);
        rg.gain.setValueAtTime(0.001, t);
        rg.gain.linearRampToValueAtTime((k === 0 ? 0.11 : 0.065) * amp, t + 0.003);
        rg.gain.exponentialRampToValueAtTime(0.0008, t + ringDur);
        ro.connect(rg); rg.connect(this.bus);
        ro.start(t); ro.stop(t + ringDur + 0.015);
        ro.onended = () => { try { ro.disconnect(); rg.disconnect(); } catch {} };
      }

      // 4) Skrot-/grussprut efter hård smäll
      if (s > 0.45) {
        const dt2 = 0.035 + Math.random() * 0.035;
        const deb = ac.createBufferSource(), dBp = ac.createBiquadFilter(), dG = ac.createGain();
        deb.buffer = this._crashBuf;
        deb.playbackRate.value = 1.65 + Math.random() * 0.4;
        dBp.type = 'bandpass'; dBp.frequency.value = 2600 + Math.random() * 1400; dBp.Q.value = 1.9;
        dG.gain.value = 0.18 * (amp - 0.35);
        deb.connect(dBp); dBp.connect(dG); dG.connect(this.bus);
        deb.start(t + dt2);
        deb.onended = () => { try { deb.disconnect(); dBp.disconnect(); dG.disconnect(); } catch {} };
      }
    } catch {}
  }

  _stonePing(intensity, at) {
    try {
      const ac = this.ac;
      const src = ac.createBufferSource();
      const idx = (Math.random() * this._stoneBufs.length) | 0;
      src.buffer = this._stoneBufs[idx];
      src.playbackRate.value = 0.78 + Math.random() * 0.72;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      // Växlar mellan vassa plåtgolvsping (2,4–4,8 kHz) och dovare hjulhussmällar (1,1–2,2 kHz)
      bp.frequency.value = idx < 3 ? 2100 + Math.random() * 2600 : 1050 + Math.random() * 1100;
      bp.Q.value = idx < 2 ? 3.2 + Math.random() * 2.5 : 1.7;
      const g = ac.createGain();
      g.gain.value = clamp(0.045 + intensity * (0.095 + Math.random() * 0.085), 0.02, 0.24);
      src.connect(bp); bp.connect(g); g.connect(this.bus);
      src.start(at);
      src.onended = () => { try { src.disconnect(); bp.disconnect(); g.disconnect(); } catch {} };
    } catch {}
  }

  /** Stoppar och kopplar ur alla kontinuerliga ljudnoder rent. */
  stop() {
    if (this.stopped) return;
    this.stopped = true;
    try {
      if (this.bus && this.ac && this.ac.state !== 'closed') {
        this.bus.gain.setValueAtTime(0, this.ac.currentTime);
      }
    } catch {}
    for (const s of this._sources) {
      try { s.stop(); } catch {}
      try { s.disconnect(); } catch {}
    }
    this._sources.length = 0;
    try { this.bus?.disconnect(); } catch {}
    this.ok = false;
  }
}
