// Bakgrundsmusik i menyerna ("lobbyn"): en egen rocklåt som spelas fram direkt i webbläsaren med Web Audio
// (trummor, bas och distade powerackord – ingen ljudfil behövs). Startar efter första klick/tangent (webbläsarnas regel).
const BPM = 128, BEAT = 60 / BPM, STEP = BEAT / 2; // åttondelar
const E = 41.2; // låg E (Hz)
const semi = n => E * Math.pow(2, n / 12);
// ackord (halvtoner över låg E) per takt: två delar (vers / refräng) à 8 takter
const PARTS = [[0, 0, 8, 10, 0, 0, 3, 10], [5, 3, 8, 10, 5, 3, 10, 10]];
// gitarrens rytm per takt (8 åttondelar): 1 = slag, 0 = paus, 2 = dämpat (palm mute)
const RIFF = [[2, 2, 1, 2, 2, 1, 2, 1], [1, 0, 1, 1, 0, 1, 1, 1]];

class Music {
  constructor() { this.want = false; this.vol = 0.4; this.ac = null; this.bar = 0; this.step = 0; this.part = 0; }
  init() {
    if (this.ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    try {
      const ac = this.ac = new AC(); this.master = ac.createGain(); this.master.gain.value = 0; this.master.connect(ac.destination);
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(this.master); this.bus = comp;
      // brusbuffert för trummor
      const nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.noise = nb;
      // gitarrkedja: dist + lågpass
      const sh = ac.createWaveShaper(), cv = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const x = i / 1023.5 - 1; cv[i] = Math.tanh(x * 9) * 0.8; } sh.curve = cv; sh.oversample = '2x';
      const gl = ac.createBiquadFilter(); gl.type = 'lowpass'; gl.frequency.value = 2600; const gg = ac.createGain(); gg.gain.value = 0.16; sh.connect(gl); gl.connect(gg); gg.connect(comp); this.gtr = sh;
      return true;
    } catch (e) { return false; }
  }
  setVol(v) { this.vol = Math.max(0, Math.min(1, v)); if (this.ac) this.master.gain.setTargetAtTime(this.want ? this.vol * 0.55 : 0, this.ac.currentTime, 0.3); if (!this.vol) this.stop(); else if (this.want) this.play(); }
  play() {
    this.want = true; if (!this.vol) return;
    if (!this.init()) return;
    if (this.ac.state === 'suspended') this.ac.resume().catch(() => { });
    this.master.gain.setTargetAtTime(this.vol * 0.55, this.ac.currentTime, 0.6);
    if (!this.timer) { this.next = this.ac.currentTime + 0.1; this.timer = setInterval(() => this.tick(), 50); }
  }
  stop() {
    this.want = false; if (!this.ac) return;
    this.master.gain.setTargetAtTime(0, this.ac.currentTime, 0.25);
    clearInterval(this.timer); this.timer = null;
  }
  tick() { if (this.ac.state !== 'running') return; while (this.next < this.ac.currentTime + 0.25) { this.play8th(this.next); this.next += STEP; } }
  play8th(t) {
    const s = this.step, bar = this.bar, part = this.part, root = PARTS[part][bar];
    // trummor: bas på 1 och 3 (+ extra i refrängen), virvel på 2 och 4, hihat på alla åttondelar
    if (s === 0 || s === 4 || (part && s === 5) || (!part && s === 3 && bar % 2)) this.kick(t);
    if (s === 2 || s === 6) this.snare(t);
    this.hat(t, s % 2 ? 0.35 : 0.6, part === 1 && s === 7 && bar === 7);
    if (bar === 7 && part === 1 && s >= 4) this.snare(t + STEP / 2, 0.5); // trumvirvel inför nästa varv
    // bas följer grundtonen
    this.bass(t, semi(root), s % 2 ? 0.7 : 1);
    // gitarr
    const r = RIFF[part][s]; if (r) this.chord(t, root, r === 2);
    if (++this.step >= 8) { this.step = 0; if (++this.bar >= 8) { this.bar = 0; this.part = 1 - this.part; } }
  }
  env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dec); }
  kick(t) { const ac = this.ac, o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); this.env(g, t, 0.003, 0.95, 0.32); o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.35); }
  snare(t, k = 1) { const ac = this.ac, n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); n.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.7; this.env(g, t, 0.002, 0.42 * k, 0.18); n.connect(f); f.connect(g); g.connect(this.bus); n.start(t, Math.random() * 0.5); n.stop(t + 0.2);
    const o = ac.createOscillator(), og = ac.createGain(); o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08); this.env(og, t, 0.002, 0.25 * k, 0.1); o.connect(og); og.connect(this.bus); o.start(t); o.stop(t + 0.12); }
  hat(t, k, open) { const ac = this.ac, n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); n.buffer = this.noise; f.type = 'highpass'; f.frequency.value = 7500; this.env(g, t, 0.001, 0.12 * k, open ? 0.3 : 0.045); n.connect(f); f.connect(g); g.connect(this.bus); n.start(t, Math.random() * 0.5); n.stop(t + 0.32); }
  bass(t, fq, k) { const ac = this.ac, o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = fq; f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 3; this.env(g, t, 0.005, 0.3 * k, STEP * 0.95); o.connect(f); f.connect(g); g.connect(this.bus); o.start(t); o.stop(t + STEP); }
  chord(t, root, mute) { const ac = this.ac, g = ac.createGain(), len = mute ? STEP * 0.55 : STEP * 0.98; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(mute ? 0.5 : 0.9, t + 0.006); g.gain.setValueAtTime(mute ? 0.5 : 0.9, t + len * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + len); g.connect(this.gtr);
    for (const [iv, det] of [[12, -6], [19, 5], [24, 3], [12, 7]]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = semi(root + iv); o.detune.value = det; o.connect(g); o.start(t); o.stop(t + len + 0.02); } }
}

export const MUSIC = new Music();
// webbläsare tillåter ljud först efter användarens första klick/tangent
for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, () => { if (MUSIC.want) MUSIC.play(); }, { passive: true });
