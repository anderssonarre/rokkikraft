// 3D-vyn: three.js-scen med kuperad terräng, skog, himmel, skuggor och formade bilar.
// three.js (r128, MIT) laddas som global THREE från js/vendor/three.min.js.
import { ensureTerrain } from './terrain.js';
import { hash, mulberry } from './gl.js';
import * as GFX from './gfx.js';
import { PRESETS, roadTextures, terrainTextures, makeEnvironment, grassMaterial, grassGeometry, dustTexture, TrackMarks } from './gfx.js';

const T = () => window.THREE;
const SPONSORS = ['HITSIPILLI RACING', 'TEAM SORAKUOPPA', 'NAVETTA MOTORSPORT', 'PÄRINÄPOJAT', 'KURARALLI', 'RAUTAKANKI RT', 'LÖYSÄ PULTTI', 'SAUNAN TAKA RACING', 'ROKKIKRAFT'];

// Modellstil per bil: proportioner och typiska drag (utan emblem). nose: box = upprätt, wedge = sluttande kil, shark = framåtlutad nos
const STYLE = {
  mazda626: { L: 4.52, H: 1.37, nose: 'wedge', lights: 'wideRect', grille: 'slot', tails: 'wide', tailT: 'liftback', rub: 1, round: 0.2 },
  passat_rx: { L: 4.67, H: 1.46, nose: 'wedge', lights: 'slim', grille: 'slat', tails: 'wide', tailT: 'notch', deck: 0.7, arch: 1, alloy: 1, round: 0.34 },
  passat_vetari: { L: 4.67, H: 1.46, nose: 'wedge', lights: 'slim', grille: 'slat', tails: 'wide', tailT: 'notch', deck: 0.7, arch: 1, alloy: 1, round: 0.34 },
  passat_kardaani: { L: 4.67, H: 1.46, nose: 'wedge', lights: 'slim', grille: 'slat', tails: 'wide', tailT: 'notch', deck: 0.7, arch: 1, alloy: 1, round: 0.34 },
  mondeo_st: { L: 4.73, H: 1.42, nose: 'wedge', lights: 'slim', grille: 'trapezoid', tails: 'tall', tailT: 'hatch', round: 0.3 },
  mondeo: { L: 4.73, H: 1.42, nose: 'wedge', lights: 'slim', grille: 'slat', tails: 'wide', tailT: 'notch', deck: 0.78, round: 0.3 },
  mazda3: { L: 4.42, H: 1.46, nose: 'wedge', lights: 'slim', grille: 'trapezoid', tails: 'round', tailT: 'hatch', round: 0.32 },
  kadett: { L: 4.25, H: 1.43, nose: 'wedge', lights: 'rect', grille: 'slot', tails: 'tall', tailT: 'hatch', round: 0.26 },
  sunny: { L: 4.48, H: 1.42, nose: 'wedge', lights: 'rect', grille: 'volvo', tails: 'wide', tailT: 'notch', deck: 0.7 },
  civic: { L: 4.71, H: 1.45, nose: 'box', lights: 'rect', grille: 'volvo', tails: 'vertical', tailT: 'wagon', rails: 1, round: 0.12 },
  v940: { L: 4.79, H: 1.44, nose: 'box', lights: 'squareWide', grille: 'volvo', tails: 'vertical', tailT: 'wagon', rails: 1, round: 0.08, bigBumper: 1 },
  volvo_v8_super: { L: 4.79, H: 1.42, nose: 'box', lights: 'squareWide', grille: 'volvo', tails: 'tall', tailT: 'notch', deck: 0.95, round: 0.08, bigBumper: 1 },
  bmw325: { L: 4.43, H: 1.34, nose: 'shark', lights: 'twinRound', grille: 'kidney', tails: 'wide', tailT: 'notch', deck: 0.78, kink: 1, coupe: 1, gtwing: 1, lip: 1, alloy: 1, round: 0.26 },
  v343: { L: 4.2, H: 1.38, nose: 'box', W: 1.6, lights: 'round', grille: 'bars', tails: 'wide', tailT: 'notch', deck: 0.78, round: 0.14 },
  ascona_super: { L: 4.32, H: 1.38, nose: 'box', W: 1.62, lights: 'rect', grille: 'bars', tails: 'wide', tailT: 'notch', deck: 0.8, round: 0.14 },
  sierra: { L: 4.43, H: 1.40, nose: 'wedge', lights: 'rect', grille: 'blackbar', tails: 'wide', tailT: 'notch', deck: 0.7, round: 0.32 },
  sierra_super: { L: 4.46, H: 1.38, nose: 'wedge', lights: 'rect', grille: 'blackbar', tails: 'wide', tailT: 'hatch', wing: 1, round: 0.32 },
  saab9000: { L: 3.98, H: 1.38, nose: 'box', W: 1.57, lights: 'round', grille: 'bars', tails: 'wide', tailT: 'notch', deck: 0.72, round: 0.14 },
  starlet_super: { L: 3.7, H: 1.38, nose: 'box', W: 1.54, lights: 'rect', grille: 'bars', tails: 'tall', tailT: 'hatch', round: 0.14 },
};
// Ritningsmått per modell (meter, ungefärliga tillverkardata): L längd, W bredd, H höjd, wb hjulbas, fo överhäng fram,
// belt midjelinje, hoodF huvens framkant, ws/rf/rr/cb = avstånd från främre stötfångaren till vindrutans fot, takets början,
// takets slut och bakrutans/C-stolpens fot
const BP = {
  mazda626: { L: 4.52, W: 1.69, H: 1.37, wb: 2.575, fo: 0.92, belt: 0.90, hoodF: 0.72, ws: 1.46, rf: 2.18, rr: 3.55, cb: 4.30 },
  passat_rx: { L: 4.675, W: 1.74, H: 1.46, wb: 2.70, fo: 0.98, belt: 0.97, hoodF: 0.76, ws: 1.42, rf: 2.24, rr: 3.58, cb: 4.02 },
  passat_vetari: { L: 4.675, W: 1.74, H: 1.46, wb: 2.70, fo: 0.98, belt: 0.97, hoodF: 0.76, ws: 1.42, rf: 2.24, rr: 3.58, cb: 4.02 },
  passat_kardaani: { L: 4.675, W: 1.74, H: 1.46, wb: 2.70, fo: 0.98, belt: 0.97, hoodF: 0.76, ws: 1.42, rf: 2.24, rr: 3.58, cb: 4.02 },
  mondeo_st: { L: 4.73, W: 1.81, H: 1.42, wb: 2.754, fo: 0.97, belt: 1.00, hoodF: 0.78, ws: 1.50, rf: 2.26, rr: 3.66, cb: 4.36 },
  mondeo: { L: 4.73, W: 1.81, H: 1.42, wb: 2.754, fo: 0.97, belt: 1.00, hoodF: 0.78, ws: 1.50, rf: 2.26, rr: 3.62, cb: 4.08 },
  sunny: { L: 4.48, W: 1.72, H: 1.42, wb: 2.56, fo: 0.92, belt: 0.95, hoodF: 0.74, ws: 1.40, rf: 2.10, rr: 3.42, cb: 3.87 },
  mazda3: { L: 4.42, W: 1.755, H: 1.465, wb: 2.64, fo: 0.94, belt: 0.98, hoodF: 0.76, ws: 1.36, rf: 2.10, rr: 3.66, cb: 4.26 },
  kadett: { L: 4.11, W: 1.71, H: 1.43, wb: 2.606, fo: 0.82, belt: 0.92, hoodF: 0.72, ws: 1.25, rf: 1.96, rr: 3.55, cb: 4.00 },
  civic: { L: 4.71, W: 1.76, H: 1.43, wb: 2.665, fo: 0.98, belt: 0.92, hoodF: 0.78, ws: 1.42, rf: 2.10, rr: 4.46, cb: 4.62 },
  v940: { L: 4.79, W: 1.71, H: 1.45, wb: 2.64, fo: 0.99, belt: 0.88, hoodF: 0.82, ws: 1.50, rf: 2.15, rr: 4.56, cb: 4.70 },
  volvo_v8_super: { L: 4.79, W: 1.75, H: 1.41, wb: 2.77, fo: 0.95, belt: 0.88, hoodF: 0.80, ws: 1.50, rf: 2.20, rr: 3.66, cb: 4.02 },
  bmw325: { L: 4.433, W: 1.71, H: 1.366, wb: 2.70, fo: 0.78, belt: 0.88, hoodF: 0.70, ws: 1.46, rf: 2.16, rr: 3.30, cb: 3.86 },
  v343: { L: 4.32, W: 1.67, H: 1.38, wb: 2.518, fo: 0.85, belt: 0.86, hoodF: 0.80, ws: 1.35, rf: 2.00, rr: 3.26, cb: 3.66 },
  ascona_super: { L: 4.32, W: 1.67, H: 1.38, wb: 2.518, fo: 0.85, belt: 0.86, hoodF: 0.80, ws: 1.35, rf: 2.00, rr: 3.26, cb: 3.66 },
  sierra: { L: 4.47, W: 1.70, H: 1.36, wb: 2.61, fo: 0.90, belt: 0.88, hoodF: 0.68, ws: 1.35, rf: 2.05, rr: 3.40, cb: 3.86 },
  sierra_super: { L: 4.43, W: 1.70, H: 1.36, wb: 2.61, fo: 0.90, belt: 0.88, hoodF: 0.68, ws: 1.35, rf: 2.05, rr: 3.56, cb: 4.26 },
  saab9000: { L: 3.98, W: 1.57, H: 1.38, wb: 2.40, fo: 0.70, belt: 0.84, hoodF: 0.80, ws: 1.15, rf: 1.76, rr: 2.96, cb: 3.36 },
  starlet_super: { L: 3.68, W: 1.52, H: 1.38, wb: 2.30, fo: 0.62, belt: 0.85, hoodF: 0.78, ws: 1.05, rf: 1.60, rr: 3.26, cb: 3.58 },
};
function carStyle(model, body) {
  const b = STYLE[model] || { L: body === 'wagon' ? 4.5 : body === 'sedan' ? 4.3 : 3.95, H: 1.39, nose: 'wedge', lights: 'rect', grille: 'slot', tails: 'wide', tailT: body === 'wagon' ? 'wagon' : body === 'sedan' ? 'notch' : 'hatch', deck: 0.75 };
  const st = { W: 1.68, round: 0.22, deck: 0.75, belt: 0.92, ...b };
  const bp = BP[model]; if (bp) { st.bp = bp; st.L = bp.L; st.W = bp.W; st.H = bp.H; st.belt = bp.belt; }
  st.hood = st.nose === 'box' ? 1.2 : st.nose === 'shark' ? 1.3 : 1.25; st.rake = st.nose === 'box' ? 0.48 : st.nose === 'shark' ? 0.62 : 0.72;
  return st;
}
// Rundade hörn på en polygonprofil (mjukare karossformer)
function roundShape(pts, r) { const THREE = T(), s = new THREE.Shape(), n = pts.length;
  const at = (a, b, d) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, k = Math.min(d, L / 2.2) / L; return [a[0] + dx * k, a[1] + dy * k]; };
  for (let i = 0; i < n; i++) { const p = pts[i], prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n], a = at(p, prev, r), b = at(p, next, r);
    if (i === 0) s.moveTo(a[0], a[1]); else s.lineTo(a[0], a[1]); s.quadraticCurveTo(p[0], p[1], b[0], b[1]); }
  s.closePath(); return s; }
// Nascar-nät (verkko): svarta remmar i rutnät, genomskinligt mellan
let _netMat = null;
function netMat() { const THREE = T(); if (_netMat) return _netMat;
  const tex = canvasTex(256, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#0d0d0f'; g.lineWidth = 7;
    for (let x = 4; x <= w; x += 28) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 4; y <= h; y += 28) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.lineWidth = 12; g.strokeRect(3, 3, w - 6, h - 6); });
  return _netMat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }); }
function canvasTex(w, h, draw, repeat) { const THREE = T(), c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t; }
// gråskalebrus som multipliceras med hörnfärgen: ger grus-, asfalt- och gräsyta
function noiseTex(seed, lo, hi, streak) { return canvasTex(256, 256, (g, w, h) => { const r = mulberry(seed), im = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const v = lo + (hi - lo) * r(); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v * 255; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0);
  if (streak) { g.globalAlpha = 0.10; for (let k = 0; k < 40; k++) { g.fillStyle = r() > 0.5 ? '#000' : '#fff'; g.fillRect(r() * w, 0, 1 + r() * 5, h); } g.globalAlpha = 1; }
  g.filter = 'blur(0.6px)'; g.drawImage(g.canvas, 0, 0); }, true); }
const bannerTex = (txt, bg, fg) => canvasTex(512, 96, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = '900 54px "Arial Narrow", Impact, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 3, w - 30); });

let _aoTex = null, _glowTex = null;
function glowTex() {
  if (_glowTex) return _glowTex;
  return (_glowTex = canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,245,215,1)');
    gr.addColorStop(0.32, 'rgba(255,135,35,0.78)');
    gr.addColorStop(0.68, 'rgba(220,42,10,0.22)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }));
}
// Delade detaljmaterial för bilarna (skapas en gång)
let _det = null;
function detMats() { const THREE = T(); if (_det) return _det;
  const tread = canvasTex(64, 16, (g, w, h) => { g.fillStyle = '#151517'; g.fillRect(0, 0, w, h); g.fillStyle = '#2c2c30'; for (let x = 0; x < w; x += 8) { g.fillRect(x, 0, 4, h * 0.45); g.fillRect(x + 4, h * 0.55, 4, h * 0.45); } });
  tread.wrapS = THREE.RepeatWrapping; tread.repeat.set(4, 1);
  const plate = canvasTex(256, 56, (g, w, h) => { g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d3f9a'; g.fillRect(0, 0, 30, h); g.fillStyle = '#ffd400'; g.font = '700 12px Arial'; g.textAlign = 'center'; g.fillText('FIN', 15, h - 8);
    g.strokeStyle = '#111'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3); g.fillStyle = '#111'; g.font = '900 40px "Arial Narrow", Arial'; g.fillText('RKK-' + (100 + Math.floor(Math.random() * 899)), 143, 43, 210); });
  const sun = canvasTex(512, 64, (g, w, h) => { g.fillStyle = '#0e1a3a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '900 40px "Arial Narrow", Impact, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ROKKIKRAFT', w / 2, h / 2 + 2); });
  const door = SPONSORS.map(t => canvasTex(256, 48, (g, w, h) => { g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = '900 30px "Arial Narrow", Impact, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, w / 2, h / 2 + 2, w - 12); }));
  _det = { tread: new THREE.MeshStandardMaterial({ map: tread, roughness: 0.95 }), side: new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 0.8 }),
    plate: new THREE.MeshBasicMaterial({ map: plate }), sun: new THREE.MeshBasicMaterial({ map: sun, side: THREE.DoubleSide }), door: door.map(t => new THREE.MeshBasicMaterial({ map: t, transparent: true })),
    seam: new THREE.MeshBasicMaterial({ color: 0x0b0b0c }), red: new THREE.MeshLambertMaterial({ color: 0xd0201a }), flap: new THREE.MeshLambertMaterial({ color: 0x101012 }) };
  return _det; }

export class View3 {
  constructor(canvas, trk, opt = {}) {
    const THREE = T(); this.ok = !!THREE; if (!THREE) return;
    ensureTerrain(trk); this.trk = trk; this.level = opt.level ?? (opt.quality ? 2 : 0); const P = this.P = PRESETS[this.level]; this.q = this.level >= 1 ? 1 : 0; this.winter = trk.winter; this.canvas = canvas; this.dyn = 1; this.autoQ = !!opt.auto;
    const R = this.r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    R.outputEncoding = THREE.LinearEncoding; R.toneMapping = THREE.ACESFilmicToneMapping;
    R.shadowMap.enabled = P.smap > 0; R.shadowMap.type = this.level >= 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; R.autoClear = false; this.aniso = Math.min(P.aniso, R.capabilities.getMaxAnisotropy());
    this.res = opt.res || 'auto';
    const S = this.scene = new THREE.Scene(), w = this.winter;
    const wx = this.weather = opt.weather || 'sol', grey = wx === 'mulet' || wx === 'regn' || wx === 'dimma' || wx === 'sno', wet = wx === 'regn';
    // Väderpaletter: varm nordisk eftermiddagssol med långa skuggor, dramatiskt mulen himmel, regn med våt vägreflektion m.m.
    const wp = wx === 'regn' ? {
      hor: w ? 0x8d97a2 : 0x7b8691, zen: w ? 0x56616d : 0x45505c,
      fogN: 36, fogF: 430, sun: [0.34, 0.74, 0.56], sunCol: 0xc2d2e2, sunI: 0.44,
      hemiSky: 0x99a9ba, hemiGnd: w ? 0x626b75 : 0x353c42, hemiI: 0.78,
      gnd: w ? 0x727c88 : 0x262d32, exp: 1.06, sRad: 4.8, wind: [2.8, 1.5], dustTint: [0.76, 0.79, 0.84],
    } : wx === 'mulet' ? {
      hor: w ? 0xbcc5cf : 0xa3adb8, zen: w ? 0x778492 : 0x5d6876,
      fogN: 68, fogF: 640, sun: [0.42, 0.68, 0.58], sunCol: 0xdce4ee, sunI: 0.58,
      hemiSky: 0xb6c4d2, hemiGnd: w ? 0x7d8896 : 0x464a42, hemiI: 0.74,
      gnd: w ? 0x86909c : 0x343830, exp: 1.10, sRad: 4.2, wind: [2.1, 1.1], dustTint: [0.86, 0.88, 0.90],
    } : wx === 'dimma' ? {
      hor: w ? 0xcfd6dd : 0xc2cbd2, zen: w ? 0x9aa7b4 : 0x93a2ae,
      fogN: 16, fogF: 210, sun: [0.48, 0.56, 0.54], sunCol: 0xebe8e0, sunI: 0.46,
      hemiSky: 0xc8d2da, hemiGnd: w ? 0x8e98a4 : 0x565b50, hemiI: 0.76,
      gnd: w ? 0x96a0ac : 0x484d42, exp: 1.08, sRad: 5.0, wind: [0.8, 0.4], dustTint: [0.90, 0.91, 0.92],
    } : wx === 'sno' ? {
      hor: 0xd5dde6, zen: 0x8c9bad,
      fogN: 38, fogF: 450, sun: [0.44, 0.58, 0.56], sunCol: 0xeaf2fc, sunI: 0.56,
      hemiSky: 0xdce6f2, hemiGnd: 0x96a4b4, hemiI: 0.80,
      gnd: 0x9eaab8, exp: 1.10, sRad: 4.0, wind: [2.4, 1.3], dustTint: [0.94, 0.96, 1.0],
    } : {
      hor: w ? 0xdde7f3 : 0xc8daea, zen: w ? 0x4c7bb6 : 0x1e56a8,
      fogN: w ? 105 : 115, fogF: w ? 880 : 1150, sun: w ? [0.74, 0.34, 0.54] : [0.72, 0.42, 0.55],
      sunCol: w ? 0xfff0d4 : 0xffe2b2, sunI: w ? 1.04 : 1.24,
      hemiSky: w ? 0xd8e8ff : 0xbad7ff, hemiGnd: w ? 0x92a0b2 : 0x64543c, hemiI: w ? 0.62 : 0.56,
      gnd: w ? 0x98a4b2 : 0x423d28, exp: 1.15, sRad: this.level >= 2 ? 1.8 : 2.5, wind: [1.5, 0.8], dustTint: [1.10, 1.01, 0.90],
    };
    // Tid på dygnet: flyttar solen och färgar om ljuset (morgon = låg kall sol + dis, kväll = låg gyllene sol, skymning = blå timme)
    const tod = this.tod = opt.tod || 'dag';
    if (tod !== 'dag') {
      const C = h => new THREE.Color(h), mix = (a, b, t) => C(a).lerp(C(b), t).getHex(), sunny = !grey;
      const M = {
        morgon: { sunY: 0.20, sunRot: -1.9, sunCol: 0xffd9b0, sunK: 0.82, hor: 0xf2d6c4, zen: 0x6f8fbf, t: 0.45, hemiK: 0.85, fogK: 0.62, exp: 1.12 },
        kvall: { sunY: 0.14, sunRot: 1.7, sunCol: 0xffa860, sunK: 0.86, hor: 0xffb27a, zen: 0x3b5d99, t: 0.55, hemiK: 0.78, fogK: 0.85, exp: 1.16 },
        skymning: { sunY: 0.035, sunRot: 2.1, sunCol: 0xff7a4a, sunK: 0.34, hor: 0xd9877a, zen: 0x1c2550, t: 0.75, hemiK: 0.46, fogK: 0.7, exp: 1.32 },
      }[tod];
      if (M) {
        const a0 = Math.atan2(wp.sun[2], wp.sun[0]) + M.sunRot, rr = Math.sqrt(1 - M.sunY * M.sunY);
        wp.sun = [Math.cos(a0) * rr, M.sunY, Math.sin(a0) * rr];
        const t = sunny ? M.t : M.t * 0.5;
        wp.sunCol = mix(wp.sunCol, M.sunCol, sunny ? 0.85 : 0.4); wp.sunI *= M.sunK;
        wp.hor = mix(wp.hor, M.hor, t); wp.zen = mix(wp.zen, M.zen, t);
        wp.hemiSky = mix(wp.hemiSky, M.zen, t * 0.6); wp.hemiI *= M.hemiK; wp.gnd = mix(wp.gnd, 0x1a1c24, tod === 'skymning' ? 0.5 : 0.15);
        wp.fogN *= M.fogK; wp.fogF *= M.fogK; wp.exp = Math.max(wp.exp, M.exp); wp.sRad *= 1.3;
      }
    }
    R.toneMappingExposure = wp.exp;
    this.wind = wp.wind;
    const horizon = new THREE.Color(wp.hor), zenith = new THREE.Color(wp.zen);
    S.fog = new THREE.Fog(horizon, wp.fogN, wp.fogF); // atmosfäriskt dis ger djup
    this.cam = new THREE.PerspectiveCamera(60, 1, 0.08, 4000);
    // 3D-himmelkupol med atmosfärisk solgloria, horisontgradient och belysta moln (via gfx.js makeSkyDome med fallback)
    const sunDir = this.sunDir = new THREE.Vector3(...wp.sun).normalize();
    const skySun = grey ? new THREE.Vector3(wp.sun[0], -0.35, wp.sun[2]).normalize() : sunDir;
    const sky = typeof GFX.makeSkyDome === 'function'
      ? GFX.makeSkyDome(zenith, horizon, skySun, w)
      : this._fallbackSkyDome(zenith, horizon, skySun, w, grey);
    if (sky?.material?.uniforms?.uCloud) {
      sky.material.uniforms.uCloud.value = wx === 'regn' ? 0.94 : wx === 'mulet' ? 0.85 : wx === 'sno' ? 0.88 : wx === 'dimma' ? 0.78 : w ? 0.36 : 0.42;
    }
    this.sky = sky; S.add(sky);
    if (P.env || wet) {
      const env = makeEnvironment(R, zenith, horizon, grey ? new THREE.Vector3(0.25, 0.88, 0.35).normalize() : sunDir, new THREE.Color(wp.gnd));
      if (env) S.environment = env;
    }
    this.hemi = new THREE.HemisphereLight(wp.hemiSky, wp.hemiGnd, wp.hemiI);
    S.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(wp.sunCol, wp.sunI); sun.castShadow = P.smap > 0;
    if (wx === 'regn' || wx === 'sno') { // nederbörd: partiklar som följer kameran
      const N = [1200, 2200, 3500, 5000][this.level], g = new THREE.BufferGeometry(), pos = new Float32Array(N * 3); for (let i = 0; i < N * 3; i++) pos[i] = (Math.random() - 0.5) * 60;
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.precip = new THREE.Points(g, new THREE.PointsMaterial({ color: wx === 'sno' ? 0xffffff : 0xb2c2d4, size: wx === 'sno' ? 0.13 : 0.065, transparent: true, opacity: wx === 'sno' ? 0.9 : 0.58, depthWrite: false }));
      this.precip.frustumCulled = false; S.add(this.precip); this.precipV = wx === 'sno' ? 1.8 : 16.5;
    }
    const sc = sun.shadow.camera, sr = P.shadowR; sc.left = -sr; sc.right = sr; sc.top = sr; sc.bottom = -sr; sc.near = 1; sc.far = 440; sun.shadow.mapSize.set(P.smap || 512, P.smap || 512); sun.shadow.radius = wp.sRad; sun.shadow.bias = -0.00045; sun.shadow.normalBias = 0.032;
    S.add(sun); S.add(sun.target);
    this.flags = [];
    this.buildTerrain(); this.buildTrack(); this.buildForest(); this.buildProps(); this.buildDetails(); this.buildGrass(); this.buildClouds(); this.marks = new TrackMarks(S, P.marks, w);
    S.traverse(o => { if (o.isInstancedMesh && !o.userData.chunk) o.frustumCulled = false; }); // utspridda instanser: rita alltid (deras geometri ligger vid origo)
    // fylliga dammoln: mjuk vinddrift, stabil rullrotation och solbelyst volymkänsla
    const pg = this.pGeo = new THREE.BufferGeometry(), N = this.pMax = P.parts;
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    pg.setAttribute('col', new THREE.BufferAttribute(new Float32Array(N * 4), 4));
    pg.setAttribute('sz', new THREE.BufferAttribute(new Float32Array(N), 1));
    pg.setAttribute('rot', new THREE.BufferAttribute(new Float32Array(N), 1));
    const pm = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { sc: { value: 600 }, tx: { value: dustTexture() }, sunc: { value: new THREE.Color(...wp.dustTint) }, amb: { value: new THREE.Color(wp.hemiSky).multiplyScalar(0.85) } },
      vertexShader: 'attribute vec4 col;attribute float sz;attribute float rot;varying vec4 c;varying float vRot;uniform float sc;void main(){c=col;vRot=rot;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=min(sz*sc/max(0.15,-mv.z),920.0);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform sampler2D tx;uniform vec3 sunc;uniform vec3 amb;varying vec4 c;varying float vRot;void main(){vec2 p=gl_PointCoord-0.5;float cs=cos(vRot),sn=sin(vRot);vec2 uv=vec2(cs*p.x-sn*p.y,sn*p.x+cs*p.y)+0.5;float a=texture2D(tx,uv).a*2.6;float d=length(p)*2.0;float topLight=clamp(1.0-gl_PointCoord.y,0.0,1.0);vec3 lit=mix(amb*0.76,sunc,0.38+0.62*topLight);vec3 col=c.rgb*lit;float alpha=c.a*a*smoothstep(1.0,0.22,d);if(alpha<0.004)discard;gl_FragColor=vec4(col,min(0.88,alpha));}',
    });
    this.pMat = pm; this.points = new THREE.Points(pg, pm); this.points.frustumCulled = false; S.add(this.points);
    // kupén ritas i en egen scen ovanpå
    this.cock = new THREE.Scene(); this.cock.add(new THREE.HemisphereLight(0xffffff, 0x555555, 0.72)); const cl = new THREE.DirectionalLight(0xffffff, 0.45); cl.position.set(0.5, 1, 0.3); this.cock.add(cl);
    this.cars = [];
    // grussprut: tydliga runda grusstenar / snöklumpar från hjulen med storleks- och nyansvariation
    { const sg = this.sGeo = new THREE.BufferGeometry(), M = this.sMax = Math.round(P.parts * 0.8);
      sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(M * 3), 3));
      sg.setAttribute('sz', new THREE.BufferAttribute(new Float32Array(M), 1));
      sg.setAttribute('col', new THREE.BufferAttribute(new Float32Array(M * 3), 3));
      const sm = this.sMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: true,
        uniforms: { sc: { value: 600 } },
        vertexShader: 'attribute float sz;attribute vec3 col;varying vec3 vCol;uniform float sc;void main(){vCol=col;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=clamp(sz*sc/max(0.25,-mv.z),2.0,18.0);gl_Position=projectionMatrix*mv;}',
        fragmentShader: 'varying vec3 vCol;void main(){vec2 p=gl_PointCoord-0.5;float r=dot(p,p);if(r>0.25)discard;float shade=0.72+0.42*(0.5-p.y);gl_FragColor=vec4(vCol*shade,1.0);}',
      });
      this.stones = new THREE.Points(sg, sm); this.stones.frustumCulled = false; S.add(this.stones); }
    // plåtgnistor vid bilkollisioner: glödande hastighetsstreck (LineSegments)
    { const spMax = this.sparkMax = [64, 120, 200, 280][this.level];
      const spg = this.sparkGeo = new THREE.BufferGeometry();
      spg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(spMax * 6), 3));
      spg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(spMax * 6), 3));
      spg.setDrawRange(0, 0);
      this.sparks = new THREE.LineSegments(spg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      this.sparks.frustumCulled = false; this.sparks.renderOrder = 3; S.add(this.sparks);
      this.sparkList = []; }
  }
  // Reserv-himmelkupol om gfx.js ännu inte exporterar makeSkyDome
  _fallbackSkyDome(zenith, horizon, sunDir, winter, grey) {
    const THREE = T();
    return new THREE.Mesh(new THREE.SphereGeometry(3200, 40, 24), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: zenith.clone() }, hor: { value: horizon.clone() }, sun: { value: sunDir.clone() },
        uTime: { value: 0 }, uCloud: { value: grey ? 0.78 : winter ? 0.34 : 0.42 },
      },
      vertexShader: 'varying vec3 d;void main(){d=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `varying vec3 d;uniform vec3 top,hor,sun;uniform float uTime,uCloud;
        float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x),mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x),f.y);}
        float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*n2(p);p*=2.04;a*=0.5;}return v;}
        void main(){
          vec3 dir=normalize(d);float h=clamp(dir.y,0.0,1.0);
          vec3 c=mix(hor,top,pow(h,0.52));
          float sunUp=step(-0.05,sun.y);
          float s=max(dot(dir,normalize(sun)),0.0)*sunUp;
          float mie=pow(s,6.0)*0.22+pow(s,48.0)*0.32+pow(s,420.0)*1.9;
          vec3 sunCol=vec3(1.0,0.88,0.68);
          c+=sunCol*mie*(1.0-0.55*uCloud);
          if(dir.y>0.02){
            vec2 uv=dir.xz/(dir.y+0.18)*1.35+vec2(uTime*0.008,uTime*0.004);
            float cl=fbm(uv*1.6+fbm(uv*0.9)*0.8);
            float mask=smoothstep(0.56-uCloud*0.26,0.82-uCloud*0.18,cl)*smoothstep(0.02,0.22,dir.y);
            vec3 clCol=mix(hor*0.86,vec3(1.0,0.97,0.92),0.55+0.45*pow(s,3.0));
            c=mix(c,clCol,mask*(0.42+0.35*uCloud));
          }
          c=mix(hor,c,smoothstep(-0.02,0.12,dir.y));
          gl_FragColor=vec4(c,1.0);
        }`,
    }));
  }
  hAt(x, z) { return this.trk.heightAt(x, z); }
  // Exakt höjd på det ritade terrängnätets triangel i (x, z) – så inget längs sidorna någonsin svävar över marken
  meshH(x, z) {
    const g = this._tg;
    if (!g) return this.trk.heightAt(x, z);
    const fx = (x - g.ox) / g.cell, fz = (z - g.oz) / g.cell;
    const ix = Math.floor(fx), iz = Math.floor(fz);
    if (ix < 0 || ix >= g.nx || iz < 0 || iz >= g.nz) return this.trk.heightAt(x, z);
    const u = fx - ix, v = fz - iz, stride = g.nx + 1, a = iz * stride + ix, c = a + stride, P = g.pos;
    const ya = P[a * 3 + 1], yb = P[(a + 1) * 3 + 1], yc = P[c * 3 + 1], yd = P[(c + 1) * 3 + 1];
    return u + v <= 1 ? ya + u * (yb - ya) + v * (yc - ya) : yd + (1 - u) * (yc - yd) + (1 - v) * (yb - yd);
  }

  buildTerrain() { const THREE = T(), trk = this.trk, b = trk.bbox, w = this.winter, margin = 620, cell = this.P.cell;
    const nx = Math.ceil((b.x1 - b.x0 + 2 * margin) / cell), nz = Math.ceil((b.z1 - b.z0 + 2 * margin) / cell), ox = b.x0 - margin, oz = b.z0 - margin;
    const pos = new Float32Array((nx + 1) * (nz + 1) * 3), col = new Float32Array((nx + 1) * (nz + 1) * 3), uv = new Float32Array((nx + 1) * (nz + 1) * 2), o = {}; let k = 0;
    const grassA = w ? [0.93, 0.95, 0.98] : [0.30, 0.47, 0.20], grassB = w ? [0.86, 0.90, 0.96] : [0.40, 0.52, 0.22], dirt = w ? [0.90, 0.93, 0.97] : [0.50, 0.42, 0.30], rock = w ? [0.62, 0.66, 0.72] : [0.42, 0.44, 0.47], snow = [0.96, 0.97, 1.0];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++, k++) { const x = ox + i * cell, z = oz + j * cell; trk.heightAt(x, z, o);
      const y = o.d < 0 ? o.h - 0.22 : o.h - Math.max(0, 0.22 * (1 - o.d / 3)); pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; uv[k * 2] = x / 18; uv[k * 2 + 1] = z / 18;
      const nz2 = 0.5 + 0.5 * Math.sin(x * 0.045 + Math.sin(z * 0.03) * 2) * Math.sin(z * 0.052 + 1.3); let c = [grassA[0] + (grassB[0] - grassA[0]) * nz2, grassA[1] + (grassB[1] - grassA[1]) * nz2, grassA[2] + (grassB[2] - grassA[2]) * nz2];
      const near = Math.max(0, 1 - o.d / (trk.verge + 3.5)); if (near > 0) c = c.map((v, q) => v + (dirt[q] - v) * Math.min(1, near * 1.4));
      if (o.h > 26) { const t = Math.min(1, (o.h - 26) / 22); c = c.map((v, q) => v + (rock[q] - v) * t); } if (o.h > 58) { const t = Math.min(1, (o.h - 58) / 14); c = c.map((v, q) => v + (snow[q] - v) * t); }
      col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2]; }
    // Håll alla terrängceller som rör körbanan (huvudspår, lisälenkki & startfålla) under vägytan så vallar aldrig skär in på vägen
    const clampCell = (x, z, maxY) => {
      const ix = Math.floor((x - ox) / cell), iz = Math.floor((z - oz) / cell);
      for (let dj = 0; dj <= 1; dj++) for (let di = 0; di <= 1; di++) {
        const ci = ix + di, cj = iz + dj;
        if (ci < 0 || ci > nx || cj < 0 || cj > nz) continue;
        const p = (cj * (nx + 1) + ci) * 3 + 1;
        if (pos[p] > maxY) pos[p] = maxY;
      }
    };
    const wStep = Math.min(2.5, cell * 0.45);
    for (let i = 0; i < trk.n; i++) {
      const hwi = trk.hwAt(i) + 0.8, yLim = trk.Y[i] - 0.22;
      for (let lat = -hwi; lat <= hwi + 1e-3; lat = Math.min(hwi, lat + wStep)) {
        clampCell(trk.X[i] + trk.NX[i] * lat, trk.Z[i] + trk.NZ[i] * lat, yLim);
        if (lat >= hwi) break;
      }
      const bg = trk.bulge(i);
      if (bg !== 0) {
        const jhw = trk.joker.w * 0.5 + 0.8;
        for (let off = -jhw; off <= jhw + 1e-3; off = Math.min(jhw, off + wStep)) {
          clampCell(trk.X[i] + trk.NX[i] * (bg + off), trk.Z[i] + trk.NZ[i] * (bg + off), yLim);
          if (off >= jhw) break;
        }
      }
    }
    if (trk.startChute) {
      const sc = trk.startChute, dx = sc.x1 - sc.x0, dz = sc.z1 - sc.z0, L = Math.hypot(dx, dz) || 1;
      const sx = -dz / L, sz = dx / L, chw = (sc.w || 14) * 0.5 + 0.8, yLim = trk.chuteY - 0.22;
      for (let d = 0; d <= L + 1e-3; d = Math.min(L, d + 2)) {
        const px = sc.x0 + dx * d / L, pz = sc.z0 + dz * d / L;
        for (let off = -chw; off <= chw + 1e-3; off = Math.min(chw, off + wStep)) {
          clampCell(px + sx * off, pz + sz * off, yLim);
          if (off >= chw) break;
        }
        if (d >= L) break;
      }
    }
    this._tg = { ox, oz, cell, nx, nz, pos };
    // naturligare mark: branta slänter (vallar, diken) blir jord/sten, stora fläckar av torrt gräs och mörkare mossa
    { const st = nx + 1, earth = w ? [0.80, 0.83, 0.88] : [0.47, 0.40, 0.31], dry = w ? [0.95, 0.96, 0.99] : [0.55, 0.53, 0.30], moss = w ? [0.88, 0.91, 0.96] : [0.22, 0.36, 0.17];
      for (let j = 1; j < nz; j++) for (let i = 1; i < nx; i++) { const q = j * st + i, hx = pos[(q + 1) * 3 + 1] - pos[(q - 1) * 3 + 1], hz = pos[(q + st) * 3 + 1] - pos[(q - st) * 3 + 1], sl = Math.hypot(hx, hz) / (2 * cell);
        const x = pos[q * 3], z = pos[q * 3 + 2], n1 = Math.sin(x * 0.011 + Math.sin(z * 0.007) * 3) * Math.sin(z * 0.013 + 2.1), n2 = Math.sin(x * 0.023 + 1.7) * Math.sin(z * 0.019 + Math.sin(x * 0.009) * 2);
        let r = col[q * 3], g = col[q * 3 + 1], b = col[q * 3 + 2];
        const td = Math.max(0, n1 - 0.25) * 0.55, tm = Math.max(0, n2 - 0.3) * 0.5; r += (dry[0] - r) * td; g += (dry[1] - g) * td; b += (dry[2] - b) * td; r += (moss[0] - r) * tm; g += (moss[1] - g) * tm; b += (moss[2] - b) * tm;
        const te = Math.min(0.85, Math.max(0, (sl - 0.32) / 0.45)); r += (earth[0] - r) * te; g += (earth[1] - g) * te; b += (earth[2] - b) * te;
        col[q * 3] = r; col[q * 3 + 1] = g; col[q * 3 + 2] = b; } }
    const idx = new Uint32Array(nx * nz * 6); let q = 0; for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, c = a + nx + 1; idx[q++] = a; idx[q++] = c; idx[q++] = a + 1; idx[q++] = a + 1; idx[q++] = c; idx[q++] = c + 1; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
    const tt = terrainTextures(w, this.aniso), wet = this.weather === 'regn';
    tt.map.repeat.set(3, 3); tt.normal.repeat.set(3, 3); if (tt.rough) tt.rough.repeat.set(3, 3);
    const mat = this.P.std
      ? new THREE.MeshStandardMaterial({ vertexColors: true, map: tt.map, normalMap: tt.normal, normalScale: new THREE.Vector2(w ? 0.8 : 1.05, w ? 0.8 : 1.05), ...(tt.rough ? { roughnessMap: tt.rough } : {}), roughness: wet ? 0.72 : w ? 0.88 : 0.96, metalness: 0, envMapIntensity: wet ? 0.42 : w ? 0.28 : 0.22 })
      : new THREE.MeshLambertMaterial({ vertexColors: true, map: tt.map });
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; this.scene.add(m); }

  // remsa längs banan mellan två sidoavstånd (funktioner av index)
  strip(i0, i1, la, lb, colf, dy, vScale = 0.12) { const THREE = T(), trk = this.trk, n = trk.n, cnt = i1 - i0 + 1, pos = new Float32Array(cnt * 6), col = new Float32Array(cnt * 6), uv = new Float32Array(cnt * 4), nor = new Float32Array(cnt * 6);
    for (let s = 0; s < cnt; s++) { const i = trk.w(i0 + s), a = la(i0 + s), b = lb(i0 + s), y = trk.Y[i] + dy, c = colf(i0 + s);
      pos.set([trk.X[i] + trk.NX[i] * a, y, trk.Z[i] + trk.NZ[i] * a, trk.X[i] + trk.NX[i] * b, y, trk.Z[i] + trk.NZ[i] * b], s * 6); col.set([c[0], c[1], c[2], c[0], c[1], c[2]], s * 6); uv.set([a * 0.12, s * vScale, b * 0.12, s * vScale], s * 4); nor.set([0, 1, 0, 0, 1, 0], s * 6); }
    const flip = la(i0) > lb(i0), idx = []; for (let s = 0; s < cnt - 1; s++) { const a = s * 2; if (flip) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); else idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } // alltid uppåtvänd (annars blir vänster vägkant svart)
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setIndex(idx); return g; }

  buildTrack() { const THREE = T(), trk = this.trk, n = trk.n, S = this.scene, w = this.winter, wet = this.weather === 'regn';
    const SC = { asfalt: wet ? [0.27, 0.29, 0.33] : [0.36, 0.37, 0.40], grus: wet ? [0.51, 0.41, 0.30] : [0.66, 0.54, 0.39], is: [0.80, 0.89, 0.96] };
    const cAt = i => { let r = 0, g = 0, b = 0; for (let q = -2; q <= 2; q++) { const c = SC[trk.surfTypeAt(i + q)] || SC.grus; r += c[0]; g += c[1]; b += c[2]; } return [r / 5, g / 5, b / 5]; };
    let na = 0; for (let i = 0; i < n; i += 5) if (trk.surfTypeAt(i) === 'asfalt') na++; const kind = w ? 'is' : na * 5 > n * 0.6 ? 'asfalt' : 'grus', rt = roadTextures(kind, this.aniso);
    for (const t of [rt.map, rt.normal, rt.rough]) if (t) t.repeat.set(3, 3); // finare grus/asfalt
    const nSc = kind === 'grus' ? (wet ? 0.88 : 1.0) : kind === 'is' ? 0.45 : 0.68;
    const road = new THREE.MeshStandardMaterial({
      vertexColors: true, map: rt.map, normalMap: rt.normal, normalScale: new THREE.Vector2(nSc, nSc),
      roughnessMap: rt.rough,
      roughness: w ? 0.38 : wet ? (kind === 'asfalt' ? 0.24 : 0.36) : 0.96,
      metalness: wet ? (kind === 'asfalt' ? 0.14 : 0.06) : w ? 0.08 : 0.0,
      envMapIntensity: wet ? (kind === 'asfalt' ? 1.55 : 1.1) : w ? 0.65 : 0.28,
      side: THREE.DoubleSide,
    });
    const add = (g, mat = road) => { const m = new THREE.Mesh(g, mat); m.receiveShadow = true; S.add(m); return m; };
    add(this.strip(0, n, i => -trk.hwAt(i), i => trk.hwAt(i), cAt, 0.02));
    const j = trk.joker; add(this.strip(j.i1, j.i2, i => trk.bulge(i) - j.w / 2, i => trk.bulge(i) + j.w / 2, i => cAt(i).map(v => v * 1.05), 0.012));
    // kantlinjer på asfalt, röd-vita kerbs i asfaltkurvor
    const flat = this.P.std ? new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, map: rt.map, roughness: wet ? 0.42 : 0.92, metalness: 0, envMapIntensity: wet ? 0.8 : 0.2 }) : new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, map: rt.map }); // vägren med grustextur
    for (const sd of [-1, 1]) { add(this.strip(0, n, i => sd * (trk.hwAt(i) - 0.32), i => sd * trk.hwAt(i), i => trk.surfTypeAt(i) === 'asfalt' ? [0.93, 0.93, 0.90] : cAt(i).map(v => v * 0.82), 0.035), flat);
      add(this.strip(0, n, i => sd * trk.hwAt(i), i => sd * (trk.hwAt(i) + 1.1), i => { const k = trk.K[trk.w(i)] * sd; return trk.surfTypeAt(i) === 'asfalt' && k > 0.012 ? ((i >> 1) & 1 ? [0.85, 0.10, 0.08] : [0.95, 0.95, 0.93]) : (w ? [0.90, 0.93, 0.97] : [0.50, 0.42, 0.30]); }, 0.03), flat); }
    // slitage på vägytan: två hårt packade hjulspår, löst grus i mitten och dammiga kanter (genomskinligt lager ovanpå vägen)
    { const c = document.createElement('canvas'); c.width = 128; c.height = 4; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 128, 0);
      const dk = w ? '120,135,150' : kind === 'asfalt' ? '20,20,22' : '70,55,38', lt = w ? '245,248,255' : kind === 'asfalt' ? '150,145,135' : '205,185,150';
      [[0, lt, 0.55], [0.1, lt, 0.12], [0.24, dk, 0.0], [0.31, dk, 0.32], [0.38, dk, 0.0], [0.5, lt, 0.14], [0.62, dk, 0.0], [0.69, dk, 0.32], [0.76, dk, 0.0], [0.9, lt, 0.12], [1, lt, 0.55]].forEach(([o, c2, a2]) => gr.addColorStop(o, `rgba(${c2},${a2})`));
      g.fillStyle = gr; g.fillRect(0, 0, 128, 4); const tex = new THREE.CanvasTexture(c); tex.wrapT = THREE.RepeatWrapping;
      const wear = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), cnt = n + 1, pos = new Float32Array(cnt * 6), uv = new Float32Array(cnt * 4), idx = [];
      for (let s2 = 0; s2 < cnt; s2++) { const i = trk.w(s2), hw = trk.hwAt(s2), y = trk.Y[i] + 0.03; pos.set([trk.X[i] - trk.NX[i] * hw, y, trk.Z[i] - trk.NZ[i] * hw, trk.X[i] + trk.NX[i] * hw, y, trk.Z[i] + trk.NZ[i] * hw], s2 * 6); uv.set([0, s2 * 0.1, 1, s2 * 0.1], s2 * 4); if (s2 < cnt - 1) { const q = s2 * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); } }
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); gg.setIndex(idx); const m = new THREE.Mesh(gg, wear); m.renderOrder = 1; S.add(m); }
    // vägbank: sluttande jordkant från vägrenen ner (eller upp) till terrängnätet, så att vägen aldrig svävar i luften
    { const ttB = terrainTextures(w, this.aniso);
      const bank = this.P.std ? new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, map: ttB.map, normalMap: ttB.normal, normalScale: new THREE.Vector2(0.85, 0.85), ...(ttB.rough ? { roughnessMap: ttB.rough } : {}), roughness: wet ? 0.72 : 0.95, metalness: 0, envMapIntensity: wet ? 0.4 : 0.2 }) : new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, map: ttB.map });
      const dirt = w ? [0.86, 0.9, 0.95] : [0.46, 0.39, 0.29], jj = trk.joker;
      const slope = (i0, i1, inner, sd, base) => { const cnt = i1 - i0 + 1, pos = new Float32Array(cnt * 6), col = new Float32Array(cnt * 6), uv = new Float32Array(cnt * 4), idx = [];
        for (let s2 = 0; s2 < cnt; s2++) { const i = trk.w(i0 + s2), a = inner(i0 + s2), b = a + sd * 3.2, xa = trk.X[i] + trk.NX[i] * a, za = trk.Z[i] + trk.NZ[i] * a, xb = trk.X[i] + trk.NX[i] * b, zb = trk.Z[i] + trk.NZ[i] * b, ya = trk.Y[i] + base, yb = Math.min(this.meshH(xb, zb), ya + 1.5) - 0.04;
          pos.set([xa, ya, za, xb, yb, zb], s2 * 6); col.set([...dirt, ...dirt.map(v => v * 0.92)], s2 * 6); uv.set([0, s2 * 0.25, 0.4, s2 * 0.25], s2 * 4); if (s2 < cnt - 1) { const q = s2 * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); } }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); const m = new THREE.Mesh(g, bank); m.receiveShadow = true; S.add(m); };
      const inJ = i => { const k = trk.w(i); return k >= jj.i1 - 2 && k <= jj.i2 + 2; }, jSide = Math.sign(trk.bulge(Math.round((jj.i1 + jj.i2) / 2))) || 1;
      for (const sd of [-1, 1]) { let st = null; for (let i = 0; i <= n; i++) { const skip = i === n || (sd === jSide && inJ(i)); if (!skip && st === null) st = i; if (skip && st !== null) { if (i - 1 > st) slope(st, i - 1, k => sd * (trk.hwAt(k) + 1.1), sd, 0.03); st = null; } } }
      // lisälenkki: bank på båda sidor av jokervägen
      for (const sd of [-1, 1]) slope(jj.i1, jj.i2, k => trk.bulge(k) + sd * (jj.w / 2), sd, 0.012); }
    // mållinje
    { const i = trk.finishIdx || 0, hw = trk.hwAt(i), tex = canvasTex(256, 32, (g, W, H) => { for (let a = 0; a < 16; a++) for (let b = 0; b < 2; b++) { g.fillStyle = (a + b) & 1 ? '#f4f4f4' : '#111'; g.fillRect(a * 16, b * 16, 16, 16); } });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, 1.6), new THREE.MeshBasicMaterial({ map: tex })); m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(trk.TZ[i], trk.TX[i]) + Math.PI / 2; m.position.set(trk.X[i], trk.Y[i] + 0.05, trk.Z[i]); S.add(m); }
    // startfålla
    const ch = trk.startChute; if (ch) { const L = Math.hypot(ch.x1 - ch.x0, ch.z1 - ch.z0), wd = ch.w || 14, c = SC[w ? 'is' : (ch.surface || 'asfalt')];
      const m = new THREE.Mesh(new THREE.PlaneGeometry(L + 4, wd), new THREE.MeshStandardMaterial({ color: new THREE.Color(c[0] * 1.05, c[1] * 1.05, c[2] * 1.05), map: noiseTex(5, 0.7, 1, true), roughness: wet ? 0.30 : 0.88, metalness: wet ? 0.1 : 0, envMapIntensity: wet ? 1.2 : 0.25 }));
      m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(ch.z1 - ch.z0, ch.x1 - ch.x0); m.position.set((ch.x0 + ch.x1) / 2, trk.chuteY + 0.015, (ch.z0 + ch.z1) / 2); m.receiveShadow = true; S.add(m); }
  }

  // Skog i rutor (chunkar) för frustum-culling + LOD: nära = flera våningar barr med skuggor, långt bort = en enkel kon
  buildForest() { const THREE = T(), trk = this.trk, b = trk.bbox, rnd = mulberry(hash(trk.id + 'forest')), w = this.winter, o = {}, N = this.P.trees;
    const spruce = [], birch = []; let tries = 0;
    while (spruce.length + birch.length < N && tries++ < N * 12) { const x = b.x0 - 330 + rnd() * (b.x1 - b.x0 + 660), z = b.z0 - 330 + rnd() * (b.z1 - b.z0 + 660); trk.heightAt(x, z, o);
      if (o.d < trk.verge + 7 || o.h > 52) continue; if (Math.sin(x * 0.02) * Math.sin(z * 0.017 + 1) < -0.35 && rnd() < 0.8) continue;      // gläntor
      (rnd() < 0.72 ? spruce : birch).push([x, this.meshH(x, z), z, 0.75 + rnd() * 0.8, rnd() * 6.28, rnd()]); }
    const CH = 170, chunks = new Map(), key = t => Math.floor(t[0] / CH) + ',' + Math.floor(t[2] / CH);
    for (const [arr, kind] of [[spruce, 's'], [birch, 'b']]) for (const t of arr) { const k = key(t); if (!chunks.has(k)) chunks.set(k, { s: [], b: [], cx: (Math.floor(t[0] / CH) + 0.5) * CH, cz: (Math.floor(t[2] / CH) + 0.5) * CH }); chunks.get(k)[kind].push(t); }
    const bark = new THREE.MeshLambertMaterial({ color: 0x4a3524 }), white = new THREE.Color(), cone = (r, h, y, seg = 9) => new THREE.ConeGeometry(r, h, seg).translate(0, y + h / 2, 0);
    const nG = [cone(2.4, 4.4, 1.3), cone(1.95, 3.9, 3.2), cone(1.45, 3.4, 5.1), cone(0.9, 2.8, 7.0)], nM = (w ? [0x4c6c58, 0xd6e0e8, 0xe6edf3, 0xf4f7fa] : [0x1c4524, 0x22512a, 0x2a5c2e, 0x346a34]).map(c => new THREE.MeshLambertMaterial({ color: c }));
    const farG = cone(2.3, 9.2, 0.6, 6), farM = new THREE.MeshLambertMaterial({ color: w ? 0xc8d4dc : 0x244e2a }), trunkG = new THREE.CylinderGeometry(0.16, 0.26, 2.4, 6).translate(0, 1.2, 0);
    const bTrunk = new THREE.CylinderGeometry(0.10, 0.16, 5.2, 6).translate(0, 2.6, 0), bTrunkM = new THREE.MeshLambertMaterial({ color: 0xe8e6de }), bLeaf = new THREE.IcosahedronGeometry(2.1, 1).translate(0, 6.2, 0), bLeafM = new THREE.MeshLambertMaterial({ color: w ? 0xc9d3da : 0x6f9a3a, flatShading: true }), bFar = new THREE.IcosahedronGeometry(2.2, 0).translate(0, 6.0, 0);
    const inst = (geo, mat, list, f, shadow, tint) => { if (!list.length) return null; const m = new THREE.InstancedMesh(geo, mat, list.length), d = new THREE.Object3D();
      list.forEach((t, i) => { d.position.set(t[0], t[1], t[2]); d.rotation.y = t[4]; f(d, t[3]); d.updateMatrix(); m.setMatrixAt(i, d.matrix); if (tint) m.setColorAt(i, white.setRGB(0.82 + t[5] * 0.3, 0.86 + t[5] * 0.24, 0.8 + t[5] * 0.25)); });
      m.castShadow = !!shadow; m.receiveShadow = false; m.computeBoundingSphere?.(); this.scene.add(m); return m; };
    this.forest = [];
    for (const c of chunks.values()) { const sh = this.P.smap > 0, ss = (d, s) => d.scale.set(s, s * 1.15, s), u = (d, s) => d.scale.set(s, s, s);
      const near = [inst(trunkG, bark, c.s, u, sh), ...nG.map((g, k) => inst(g, nM[k], c.s, ss, sh, true)), inst(bTrunk, bTrunkM, c.b, u, sh), inst(bLeaf, bLeafM, c.b, (d, s) => d.scale.set(s, s * 1.25, s), sh, true)].filter(Boolean);
      const far = this.P.lodNear ? [inst(farG, farM, c.s, ss, false, true), inst(bFar, bLeafM, c.b, (d, s) => d.scale.set(s, s * 1.25, s), false, true)].filter(Boolean) : [];
      // instansernas gemensamma begränsningssfär (för culling) – sätts från chunkens mitt
      const bs = new THREE.Sphere(new THREE.Vector3(c.cx, c.s.concat(c.b).reduce((a, t) => a + t[1], 0) / Math.max(1, c.s.length + c.b.length), c.cz), CH * 0.75 + 20);
      for (const m of [...near, ...far]) { m.geometry = m.geometry.clone(); m.geometry.boundingSphere = bs; m.frustumCulled = true; m.userData.chunk = 1; }
      this.forest.push({ cx: c.cx, cz: c.cz, near, far, st: -1 }); }
  }
  // gräs-tuvor längs banan (inte på vägen), i rutor för culling
  buildGrass() { const THREE = T(), trk = this.trk, N = this.P.grass; if (!N) return; const rnd = mulberry(hash(trk.id + 'grass')), o = {}, n = trk.n, mat = grassMaterial(this.winter), geo = grassGeometry(), d = new THREE.Object3D(), CH = 120, chunks = new Map(), col = new THREE.Color();
    for (let k = 0, tries = 0; k < N && tries < N * 4; tries++) { const i = Math.floor(rnd() * n), sd = rnd() < 0.5 ? 1 : -1, lat = sd * (trk.hwAt(i) + trk.verge * 0.3 + Math.pow(rnd(), 1.6) * 34), x = trk.X[i] + trk.NX[i] * lat, z = trk.Z[i] + trk.NZ[i] * lat; trk.heightAt(x, z, o); if (o.d < 1.2 || trk.bulge?.(i) && Math.abs(lat) < 12) continue;
      const kk = Math.floor(x / CH) + ',' + Math.floor(z / CH); if (!chunks.has(kk)) chunks.set(kk, { l: [], cx: (Math.floor(x / CH) + 0.5) * CH, cz: (Math.floor(z / CH) + 0.5) * CH }); chunks.get(kk).l.push([x, this.meshH(x, z) - 0.04, z, 0.6 + rnd() * 0.9, rnd() * 6.28, rnd()]); k++; }
    for (const c of chunks.values()) { const m = new THREE.InstancedMesh(geo, mat, c.l.length); c.l.forEach((t, i) => { d.position.set(t[0], t[1], t[2]); d.rotation.set(0, t[4], 0); d.scale.set(t[3], t[3] * (0.8 + t[5] * 0.6), t[3]); d.updateMatrix(); m.setMatrixAt(i, d.matrix); m.setColorAt(i, col.setRGB(0.8 + t[5] * 0.35, 0.85 + t[5] * 0.25, 0.75 + t[5] * 0.2)); });
      m.geometry = geo.clone(); m.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(c.cx, c.l[0][1], c.cz), CH * 0.75 + 30); m.receiveShadow = true; m.userData.chunk = 1; this.scene.add(m); (this.grass ||= []).push({ m, cx: c.cx, cz: c.cz }); } }
  // däckspår (anropas från loppet)
  mark(x0, z0, x1, z1, w, rgb) { if (this.marks) this.marks.add(x0, z0, x1, z1, this.hAt((x0 + x1) / 2, (z0 + z1) / 2) + 0.03, w, rgb); }
  buildProps() { const THREE = T(), trk = this.trk, S = this.scene, n = trk.n, w = this.winter, rnd = mulberry(hash(trk.id + 'props')), std = !!this.P.std;
    const lam = c => new THREE.MeshLambertMaterial({ color: c });
    const pbr = (c, rough = 0.78, met = 0.05, extra = {}) => std
      ? new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: met, envMapIntensity: 0.75, ...extra })
      : new THREE.MeshLambertMaterial({ color: c, ...(extra.side ? { side: extra.side } : {}), ...(extra.emissive ? { emissive: extra.emissive } : {}) });
    const box = (x, y, z, sx, sy, sz, mat, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); m.position.set(x, y + sy / 2, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; S.add(m); return m; };
    const edge = (i, sd, extra) => { i = trk.w(i); const l = trk.limits(i), lat = (sd > 0 ? l[1] : l[0]) + sd * extra, x = trk.X[i] + trk.NX[i] * lat, z = trk.Z[i] + trk.NZ[i] * lat; return [x, this.meshH(x, z), z, -Math.atan2(trk.TZ[i], trk.TX[i])]; };
    // målportal: fackverkstorn i galvaniserat stål och belyst banderoll
    { const i = trk.finishIdx || 0, a = edge(i, -1, 1.6), b = edge(i, 1, 1.6), steel = new THREE.MeshStandardMaterial({ color: 0x9098a0, metalness: 0.78, roughness: 0.34, envMapIntensity: 0.95 }), top = Math.max(a[1], b[1]) + 6.2;
      for (const p of [a, b]) for (const [ox, oz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) box(p[0] + ox, p[1], p[2] + oz, 0.1, top - p[1], 0.1, steel);
      const L = Math.hypot(b[0] - a[0], b[2] - a[2]), mid = [(a[0] + b[0]) / 2, (a[2] + b[2]) / 2], ry = -Math.atan2(b[2] - a[2], b[0] - a[0]);
      for (const dy of [0, 0.9]) box(mid[0], top - 1 + dy, mid[1], L + 1, 0.1, 0.8, steel, ry);
      const banTex = bannerTex('LÄHTÖ · MAALI', '#12151a', '#ffd400');
      const banMat = std ? new THREE.MeshStandardMaterial({ map: banTex, roughness: 0.75, metalness: 0.05, emissive: 0x181508, side: THREE.DoubleSide }) : new THREE.MeshLambertMaterial({ map: banTex, emissive: 0x181508, side: THREE.DoubleSide });
      const ban = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.86, 1.1), banMat); ban.position.set(mid[0], top - 0.05, mid[1]); ban.rotation.y = ry; S.add(ban); }
    // byggnader ur bandata (torn, kansli, kiosk) med sadeltak i plåt/snö och reflekterande rutor
    const roofM = pbr(w ? 0xe9eef4 : 0x3b4048, w ? 0.88 : 0.42, w ? 0.0 : 0.45);
    const winM = new THREE.MeshStandardMaterial({ color: 0x1d2b38, roughness: 0.15, metalness: 0.78, envMapIntensity: 1.15 });
    for (const bd of trk.buildings || []) { const y = this.meshH(bd.x, bd.z), c = new THREE.Color(bd.col[0], bd.col[1], bd.col[2]); box(bd.x, y - 0.3, bd.z, bd.sx, bd.sy + 0.3, bd.sz, pbr(c, 0.86, 0.04));
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, Math.max(bd.sx, bd.sz) * 0.74, 1.5, 4, 1), roofM); roof.position.set(bd.x, y + bd.sy + 0.75, bd.z); roof.rotation.y = Math.PI / 4; roof.scale.set(bd.sx >= bd.sz ? 1 : bd.sx / bd.sz, 1, bd.sz > bd.sx ? 1 : bd.sz / bd.sx); roof.castShadow = true; roof.receiveShadow = true; S.add(roof);
      for (let k = 0; k < Math.floor(bd.sx / 3); k++) box(bd.x - bd.sx / 2 + 1.5 + k * 3, y + bd.sy * 0.45, bd.z + bd.sz / 2 + 0.02, 1.3, 1.0, 0.05, winM); }
    // reklamskyltar längs rakorna (tar emot solljus & skuggor naturligt)
    { const mats = SPONSORS.map((s, k) => { const tx = bannerTex(s, ['#ffd400', '#e0352b', '#1f5fb8', '#f4f1e8', '#1b1f1d'][k % 5], ['#111', '#fff', '#fff', '#111', '#ffd400'][k % 5]); return std ? new THREE.MeshStandardMaterial({ map: tx, roughness: 0.68, metalness: 0.06, side: THREE.DoubleSide }) : new THREE.MeshLambertMaterial({ map: tx, side: THREE.DoubleSide }); });
      const postM = pbr(0x555a60, 0.52, 0.55); let last = -99, k = 0;
      for (let i = 0; i < n; i += 4) { if (Math.abs(trk.K[i]) > 0.006 || i - last < 14 || trk.bulge(i)) continue; last = i; const sd = k % 2 ? 1 : -1, p = edge(i, sd, trk.verge + 1.5);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.15), mats[k % mats.length]); m.position.set(p[0], p[1] + 0.75, p[2]); m.rotation.y = p[3]; m.receiveShadow = true; S.add(m); for (const o of [-3.3, 3.3]) box(p[0] + Math.cos(p[3]) * o, p[1] - 0.2, p[2] - Math.sin(p[3]) * o, 0.08, 1.6, 0.08, postM); k++; } }
    // däckstaplar i ytterkurvor (matt gummi på High/Ultra)
    { const list = []; for (let i = 0; i < n; i += 2) { const k = trk.K[i]; if (Math.abs(k) < 0.018) continue; const sd = k > 0 ? -1 : 1; if (trk.bulge(i) * sd > 0) continue; list.push(edge(i, sd, trk.verge - 0.3)); }
      const g = new THREE.TorusGeometry(0.25, 0.1, 8, 16).rotateX(Math.PI / 2).scale(1, 1.2, 1), m1 = new THREE.InstancedMesh(g, pbr(0xffffff, 0.90, 0.04), list.length * 3), d = new THREE.Object3D(), col = new THREE.Color();
      list.forEach((p, i) => { for (let s = 0; s < 3; s++) { d.position.set(p[0], p[1] + 0.12 + s * 0.25, p[2]); d.updateMatrix(); m1.setMatrixAt(i * 3 + s, d.matrix); m1.setColorAt(i * 3 + s, col.set(s === 2 && i % 2 ? 0xd8d8d8 : s === 2 ? 0xc2261d : 0x1a1a1d)); } }); m1.castShadow = true; m1.receiveShadow = true; S.add(m1); }
    // koner på ön vid lisälenkkin
    { const j = trk.joker, list = []; for (let i = j.i1 + 2; i < j.i2 - 1; i += 3) { const b = trk.bulge(i), hw = trk.hwAt(i); if (Math.abs(b) < hw + j.w / 2 + 1.5) continue; const lat = (Math.sign(b) * hw + b - Math.sign(b) * j.w / 2) / 2, ii = trk.w(i), kx = trk.X[ii] + trk.NX[ii] * lat, kz = trk.Z[ii] + trk.NZ[ii] * lat; list.push([kx, this.meshH(kx, kz), kz]); }
      const m = new THREE.InstancedMesh(new THREE.ConeGeometry(0.26, 0.75, 10).translate(0, 0.375, 0), pbr(0xff6a12, 0.38, 0.05), Math.max(1, list.length)), d = new THREE.Object3D(); list.forEach((p, i) => { d.position.set(p[0], p[1], p[2]); d.updateMatrix(); m.setMatrixAt(i, d.matrix); }); m.count = list.length; m.castShadow = true; S.add(m); }
    // portkoner i början och slutet av lisälenkkin: två stora koner per port, med vit reflexrand
    if (trk.joker.gates) { const pts = trk.joker.gates.flatMap(g => g.cones), body = new THREE.InstancedMesh(new THREE.ConeGeometry(0.34, 0.95, 14).translate(0, 0.475, 0), pbr(0xff5a0a, 0.35, 0.06), pts.length),
        band = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.155, 0.215, 0.16, 14).translate(0, 0.56, 0), pbr(0xf8f8f8, 0.24, 0.12, { emissive: 0x383838 }), pts.length),
        base = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.05, 0.62).translate(0, 0.025, 0), pbr(0x1a1a1a, 0.88, 0.04), pts.length), d = new THREE.Object3D();
      pts.forEach(([x, z], i) => { d.position.set(x, this.meshH(x, z), z); d.updateMatrix(); for (const m of [body, band, base]) m.setMatrixAt(i, d.matrix); });
      for (const m of [body, band, base]) { m.castShadow = true; S.add(m); } }
    // flaggposter
    const posts = (trk.posts && trk.posts.length ? trk.posts.map(p => [p.x, p.z]) : [...Array(7)].map((_, q) => { const p = edge(Math.round((q + 0.5) * n / 7), 1, trk.verge + 4); return [p[0], p[2]]; }));
    // gul flagga som lippumiehen viftar med vid incident (dold tills race.js säger till via setYellow)
    this.yFlags = []; const yMat = new THREE.MeshLambertMaterial({ color: 0xffd400, side: THREE.DoubleSide, emissive: 0x3a3000 });
    const postFlagM = new THREE.MeshLambertMaterial({ color: 0xffe100, side: THREE.DoubleSide });
    for (const [q, [x, z]] of posts.entries()) { const o = {}; trk.heightAt(x, z, o); if (o.d < 1.5) continue; const yh = this.meshH(x, z);
      { const fg = new THREE.Group(), pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 5).translate(0, 0.9, 0), lam(0x222222)), cl = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8).translate(0.55, 0, 0), yMat);
        cl.position.y = 1.45; fg.add(pole, cl); fg.position.set(x - 1.2, this.meshH(x - 1.2, z) + 1.35, z); fg.visible = false; S.add(fg); this.yFlags[q] = { g: fg, cl }; }
      box(x, yh, z, 1.8, 0.25, 1.8, lam(0x6b5a45)); box(x, yh + 0.25, z, 1.6, 1.0, 1.6, pbr(0xf0b415, 0.65, 0.08)); box(x + 0.7, yh + 1.25, z + 0.7, 0.06, 1.9, 0.06, pbr(0x333333, 0.45, 0.6));
      const pfGeo = new THREE.PlaneGeometry(0.62, 0.44, 5, 1).translate(0.31, 0, 0);
      const pf = new THREE.Mesh(pfGeo, postFlagM); pf.position.set(x + 0.7, yh + 2.84, z + 0.7); S.add(pf);
      this.flags.push({ geo: pfGeo, len: 0.62, phase: q * 1.9 + 0.7, amp: 0.55 }); }
    // depå: tält, släp och servicebilar utanför startområdet
    { const i0 = trk.finishIdx || 0, sd = -trk.outSign || 1, tent = [0xd92b20, 0x1f5fb8, 0xf4f1e8, 0xffd400, 0x1e8a4a], o = {};
      for (let k = 0; k < (this.q ? 16 : 7); k++) { const p = edge(i0 - 40 + k * 7, sd, trk.verge + 16 + (k % 3) * 9 + rnd() * 4); trk.heightAt(p[0], p[2], o); if (o.d < trk.verge + 8) continue; const yh = this.meshH(p[0], p[2]);
        if (k % 3 === 0) { box(p[0], yh, p[2], 4.6, 1.9, 2.0, new THREE.MeshStandardMaterial({ color: [0xe9e9e6, 0x2b3038, 0x9a1f1a][k % 3 === 0 ? (k / 3 | 0) % 3 : 0], metalness: 0.4, roughness: 0.5 }), p[3]); box(p[0], yh + 1.2, p[2], 4.62, 0.55, 1.7, new THREE.MeshStandardMaterial({ color: 0x1a222b, roughness: 0.15, metalness: 0.7 }), p[3]); }
        else { for (const [ox, oz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) box(p[0] + ox, yh, p[2] + oz, 0.07, 2.2, 0.07, lam(0xcccccc)); const r = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.1, 4), lam(tent[k % 5])); r.position.set(p[0], yh + 2.75, p[2]); r.rotation.y = Math.PI / 4; r.castShadow = true; S.add(r); } } }
    // STOP-skylt efter mål
    { const p = edge((trk.finishIdx || 0) + 70, 1, 1.2); box(p[0], p[1], p[2], 0.08, 2.1, 0.08, lam(0x555555)); const s = new THREE.Mesh(new THREE.CircleGeometry(0.5, 8), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g) => { g.fillStyle = '#c8201a'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#fff'; g.font = '900 44px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('STOP', 64, 66); }), side: THREE.DoubleSide })); s.position.set(p[0], p[1] + 2.3, p[2]); s.rotation.y = p[3] + Math.PI / 2; S.add(s); }
  }
  // Fler detaljer längs banan: kantstolpar, stenar, buskar/tuvor, publik bakom avspärrningsband, funktionärer, strålkastarmaster, parkerade bilar
  buildDetails() { const THREE = T(), trk = this.trk, S = this.scene, n = trk.n, w = this.winter, q = this.q, rnd = mulberry(hash(trk.id + 'details')), o = {}, d = new THREE.Object3D(), col = new THREE.Color();
    const at = (i, sd, extra) => { i = trk.w(i); const l = trk.limits(i), lat = (sd > 0 ? l[1] : l[0]) + sd * extra, x = trk.X[i] + trk.NX[i] * lat, z = trk.Z[i] + trk.NZ[i] * lat; trk.heightAt(x, z, o); return [x, this.meshH(x, z), z, -Math.atan2(trk.TZ[i], trk.TX[i]), o.d]; };
    const inst = (geo, mat, list, shadow = false) => { if (!list.length) return; const m = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((e, k) => { d.position.set(e.x, e.y, e.z); d.rotation.set(e.rx || 0, e.ry || 0, 0); d.scale.set(e.sx ?? e.s ?? 1, e.sy ?? e.s ?? 1, e.s ?? 1); d.updateMatrix(); m.setMatrixAt(k, d.matrix); if (e.c !== undefined) m.setColorAt(k, col.set(e.c)); });
      m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; S.add(m); return m; };
    const V = trk.verge;
    // kantstolpar (vita med svart band och reflex) längs båda sidorna
    { const posts = [], bands = []; for (let i = 0; i < n; i += 10) { if (trk.bulge(i)) continue; for (const sd of [1, -1]) { const p = at(i, sd, V - 0.2); if (p[4] < 0) continue; posts.push({ x: p[0], y: p[1], z: p[2], ry: p[3] }); bands.push({ x: p[0], y: p[1] + 0.72, z: p[2], ry: p[3] }); } }
      inst(new THREE.BoxGeometry(0.1, 0.9, 0.1).translate(0, 0.45, 0), new THREE.MeshLambertMaterial({ color: 0xf2f2ee }), posts); inst(new THREE.BoxGeometry(0.11, 0.12, 0.11), new THREE.MeshLambertMaterial({ color: 0x111111, emissive: 0x220000 }), bands); }
    // stenar och tuvor/buskar på och bakom vallarna
    { const rocks = [], tufts = []; for (let k = 0; k < (q ? 520 : 240); k++) { const i = Math.floor(rnd() * n), sd = rnd() < 0.5 ? 1 : -1, p = at(i, sd, V + 0.5 + rnd() * 14); if (p[4] < V - 0.5) continue;
        if (k % 3 === 0) rocks.push({ x: p[0], y: p[1] - 0.05, z: p[2], ry: rnd() * 6, rx: rnd(), s: 0.25 + rnd() * 0.5, sy: 0.18 + rnd() * 0.3, c: w ? 0x9aa0a8 : [0x7d7a72, 0x8e8a80, 0x6a675f][k % 3 ? 1 : 0] });
        else tufts.push({ x: p[0], y: p[1] - 0.05, z: p[2], ry: rnd() * 6, s: 0.4 + rnd() * 0.7, sy: 0.3 + rnd() * 0.6, c: w ? 0xe8edf2 : [0x4f6b2a, 0x5d7a30, 0x6f7f3a, 0x3f5a24][k % 4] }); }
      inst(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), rocks, true);
      inst(new THREE.ConeGeometry(0.7, 1, 6).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), tufts); }
    // publikplatser i ytterkurvorna: avspärrningsband på stolpar + åskådare
    { const spots = []; for (let i = 0; i < n; i += 6) { const k = trk.K[i]; if (Math.abs(k) < 0.02 || trk.bulge(i)) continue; if (spots.length && i - spots[spots.length - 1][0] < 60) continue; spots.push([i, k > 0 ? -1 : 1]); }
      const posts = [], tape = [], bodies = [], heads = [], shirts = [0xd92b20, 0x1f5fb8, 0xf4f1e8, 0xffd400, 0x1e8a4a, 0x222222, 0xff7a1a, 0x6a3d9a, 0x8a8f96];
      for (const [i0, sd] of spots.slice(0, q ? 8 : 4)) { let prev = null;
        for (let i = i0 - 14; i <= i0 + 14; i += 2) { const p = at(i, sd, V + 5.2); if (p[4] < V + 2) { prev = null; continue; } posts.push({ x: p[0], y: p[1], z: p[2] });
          if (prev) { const dx = p[0] - prev[0], dz = p[2] - prev[2], dy = p[1] - prev[1], L = Math.hypot(dx, dz); tape.push({ x: (p[0] + prev[0]) / 2, y: (p[1] + prev[1]) / 2 + 0.95, z: (p[2] + prev[2]) / 2, ry: -Math.atan2(dz, dx), s: L, sy: 1, rx: 0, c: (i / 2) % 2 ? 0xe01e1e : 0xf4f4f4 }); }
          prev = p;
          for (let r = 0; r < (q ? 3 : 2); r++) { if (rnd() < 0.3) continue; const pp = at(i + rnd() * 2, sd, V + 6.2 + r * 0.9 + rnd() * 0.4); if (pp[4] < V + 3) continue; const hgt = 0.9 + rnd() * 0.25;
            bodies.push({ x: pp[0], y: pp[1], z: pp[2], ry: rnd() * 6, s: 1, sy: hgt, c: shirts[Math.floor(rnd() * shirts.length)] }); heads.push({ x: pp[0], y: pp[1] + hgt * 1.55 + 0.13, z: pp[2], s: 1, c: [0xf0c8a0, 0xe0b088, 0xc89070, 0x8a5a3c][Math.floor(rnd() * 4)] }); } } }
      inst(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 5).translate(0, 0.55, 0), new THREE.MeshLambertMaterial({ color: 0xe8e8e8 }), posts);
      const tg = new THREE.BoxGeometry(1, 0.07, 0.01); inst(tg, new THREE.MeshBasicMaterial({ color: 0xffffff }), tape.map(t => ({ ...t, s: 1, sx: t.s, sy: 1 })));
      inst(new THREE.CylinderGeometry(0.17, 0.2, 1.55, 7).translate(0, 0.78, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), bodies, true);
      inst(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }), heads); }
    // funktionärer i orange västar vid flaggposterna
    { const list = [], hd = []; for (const pst of trk.posts && trk.posts.length ? trk.posts : []) { trk.heightAt(pst.x - 1.2, pst.z, o); if (o.d < 1.5) continue; const yh = this.meshH(pst.x - 1.2, pst.z); list.push({ x: pst.x - 1.2, y: yh, z: pst.z, sy: 1.05, s: 1, c: 0xff6a12 }); hd.push({ x: pst.x - 1.2, y: yh + 1.75, z: pst.z, s: 1, c: 0xf0c8a0 }); }
      inst(new THREE.CylinderGeometry(0.18, 0.2, 1.55, 7).translate(0, 0.78, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), list, true); inst(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }), hd); }
    // strålkastarmaster vid start/mål (galvaniserat stål + varmare strålkastarsken vid regn/mulet)
    { const i0 = trk.finishIdx || 0, greyW = this.weather !== 'sol';
      const pole = this.P.std ? new THREE.MeshStandardMaterial({ color: 0x868e96, metalness: 0.72, roughness: 0.36 }) : new THREE.MeshLambertMaterial({ color: 0x7c8288 });
      const lampM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: greyW ? 0xffe4b0 : 0x8a8a70, emissiveIntensity: greyW ? 1.5 : 0.7 });
      for (const [di, sd] of [[-30, 1], [25, -1], [80, 1]]) { const p = at(i0 + di, sd, V + 7); if (p[4] < V + 3) continue; const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 14, 8), pole); m.position.set(p[0], p[1] + 7, p[2]); m.castShadow = true; S.add(m);
        const hb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 2.2), lampM); hb.position.set(p[0], p[1] + 14, p[2]); hb.rotation.y = p[3] + Math.PI / 2; S.add(hb); } }
    // parkerade publikbilar på en åker bakom depån
    { const i0 = trk.finishIdx || 0, sd = trk.outSign || 1, cars = [], roofs = [], pc = [0xb0b4b8, 0x23272c, 0x8b1a14, 0x1d3f7a, 0xe6e6e2, 0x3c5a2e, 0x6e6252];
      for (let k = 0; k < (q ? 36 : 16); k++) { const p = at(i0 - 30 + (k % 12) * 5, sd, V + 30 + Math.floor(k / 12) * 6 + rnd()); if (p[4] < V + 22) continue; const c = pc[Math.floor(rnd() * pc.length)];
        cars.push({ x: p[0], y: p[1] + 0.3, z: p[2], ry: p[3] + Math.PI / 2, s: 1, c }); roofs.push({ x: p[0], y: p[1] + 0.95, z: p[2], ry: p[3] + Math.PI / 2, s: 1, c }); }
      inst(new THREE.BoxGeometry(1.75, 0.65, 4.3).translate(0, 0.33, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), cars, true);
      inst(new THREE.BoxGeometry(1.5, 0.5, 2.2).translate(0, 0.25, -0.2), new THREE.MeshLambertMaterial({ color: 0xffffff }), roofs); }
    // däckspår (mörka gummi-/grusränder) i kurvorna längs idealspåret
    { const marks = []; for (let i = 0; i < n; i += 2) { const k = trk.K[i]; if (Math.abs(k) < 0.012 || trk.bulge(i)) continue; const ii = trk.w(i), l = trk.limits(ii), lat = (l[0] + l[1]) / 2 - Math.sign(k) * (l[1] - l[0]) * 0.18, hd = -Math.atan2(trk.TZ[ii], trk.TX[ii]);
        for (const off of [-0.75, 0.75]) { const x = trk.X[ii] + trk.NX[ii] * (lat + off), z = trk.Z[ii] + trk.NZ[ii] * (lat + off); marks.push({ x, y: this.hAt(x, z) + 0.025, z, rx: -Math.PI / 2, ry: 0, s: 1 }); marks[marks.length - 1].hd = hd; } }
      if (marks.length) { const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.3, 0.32), new THREE.MeshBasicMaterial({ color: w ? 0x8b939c : 0x2a241c, transparent: true, opacity: w ? 0.35 : 0.28, depthWrite: false }), marks.length);
        marks.forEach((e, k) => { d.position.set(e.x, e.y, e.z); d.rotation.set(0, e.hd, 0); d.rotateX(-Math.PI / 2); d.scale.set(1, 1, 1); d.updateMatrix(); m.setMatrixAt(k, d.matrix); }); m.renderOrder = 1; S.add(m); } }
    // höbalar (runda, inplastade) i några ytterkurvor
    { const bales = []; for (let i = 0; i < n; i += 8) { const k = trk.K[i]; if (Math.abs(k) < 0.015 || trk.bulge(i) || rnd() < 0.5) continue; const p = at(i, k > 0 ? -1 : 1, V + 3.2); if (p[4] < V + 1) continue; bales.push({ x: p[0], y: p[1] + 0.6, z: p[2], rx: Math.PI / 2, ry: p[3], s: 1, c: rnd() < 0.5 ? 0xf2f2ee : 0x2e4a2a }); }
      inst(new THREE.CylinderGeometry(0.62, 0.62, 1.2, 14), new THREE.MeshLambertMaterial({ color: 0xffffff }), bales, true); }
    // finska flaggor (levande vindrörelse i frame()), bajamajor, parasoller och grillkiosk vid publikplatserna och starten
    { const i0 = trk.finishIdx || 0, flagTex = canvasTex(96, 60, (g, W2, H2) => { g.fillStyle = '#fff'; g.fillRect(0, 0, W2, H2); g.fillStyle = '#1a3d8f'; g.fillRect(26, 0, 16, H2); g.fillRect(0, 22, W2, 16); }), flagM = new THREE.MeshLambertMaterial({ map: flagTex, side: THREE.DoubleSide }), poleM = this.P.std ? new THREE.MeshStandardMaterial({ color: 0xe8ecef, metalness: 0.65, roughness: 0.35 }) : new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
      let fIdx = 0;
      for (const [di, sd] of [[-14, -1], [-6, -1], [2, -1], [40, 1], [140, 1]]) { const p = at(i0 + di, sd, V + 9); if (p[4] < V + 4) continue; const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 8, 6), poleM); pl.position.set(p[0], p[1] + 4, p[2]); pl.castShadow = true; S.add(pl);
        const fGeo = new THREE.PlaneGeometry(1.8, 1.1, 8, 2).translate(0.9, 0, 0);
        const f = new THREE.Mesh(fGeo, flagM); f.position.set(p[0], p[1] + 7.3, p[2]); f.rotation.y = p[3]; S.add(f);
        this.flags.push({ geo: fGeo, len: 1.8, phase: fIdx++ * 1.7, amp: 1.0 }); }
      const toilets = [], troofs = [], umb = [], ustick = []; const spotsI = []; for (let i = 0; i < n; i += 6) { const k = trk.K[i]; if (Math.abs(k) < 0.02 || trk.bulge(i)) continue; if (spotsI.length && i - spotsI[spotsI.length - 1][0] < 60) continue; spotsI.push([i, k > 0 ? -1 : 1]); }
      for (const [i, sd] of spotsI.slice(0, q ? 8 : 4)) { const t = at(i + 18, sd, V + 10); if (t[4] > V + 5) for (let r = 0; r < 2; r++) { const x = t[0] + Math.cos(t[3]) * r * 1.4, z = t[2] - Math.sin(t[3]) * r * 1.4, y = this.meshH(x, z); toilets.push({ x, y, z, ry: t[3], s: 1, c: 0x2a6fd6 }); troofs.push({ x, y: y + 2.25, z, ry: t[3], s: 1, c: 0xe8e8e8 }); }
        for (const di of [-8, 6]) { const u = at(i + di, sd, V + 9.5 + rnd() * 2); if (u[4] < V + 4) continue; umb.push({ x: u[0], y: u[1] + 2.1, z: u[2], s: 1, c: [0xd92b20, 0xffd400, 0x1f5fb8, 0x1e8a4a][Math.floor(rnd() * 4)] }); ustick.push({ x: u[0], y: u[1], z: u[2], s: 1 }); } }
      inst(new THREE.BoxGeometry(1.2, 2.2, 1.2).translate(0, 1.1, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), toilets, true); inst(new THREE.BoxGeometry(1.3, 0.1, 1.3), new THREE.MeshLambertMaterial({ color: 0xffffff }), troofs);
      inst(new THREE.ConeGeometry(1.3, 0.5, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), umb, true); inst(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 5).translate(0, 1.1, 0), new THREE.MeshLambertMaterial({ color: 0xdddddd }), ustick);
      // grillkiosk
      { const p = at(i0 + 20, -(trk.outSign || 1), V + 14); if (p[4] > V + 9) { const kio = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 2.2), new THREE.MeshLambertMaterial({ color: 0xc23a22 })); kio.position.set(p[0], p[1] + 1.2, p[2]); kio.rotation.y = p[3]; kio.castShadow = true; S.add(kio);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.55), new THREE.MeshBasicMaterial({ map: bannerTex('GRILLI · MAKKARA · KAHVI', '#ffd400', '#111'), side: THREE.DoubleSide })); sign.position.set(p[0], p[1] + 2.75, p[2]); sign.rotation.y = p[3]; S.add(sign);
        const smokeM = new THREE.MeshBasicMaterial({ color: 0xcfd2d6, transparent: true, opacity: 0.35, depthWrite: false }); for (let k = 0; k < 5; k++) { const sm = new THREE.Mesh(new THREE.SphereGeometry(0.35 + k * 0.18, 8, 6), smokeM); sm.position.set(p[0] + k * 0.25, p[1] + 3.2 + k * 0.7, p[2] + k * 0.15); S.add(sm); } } } }
    // elledning med trästolpar längs en sida av området
    { const polesL = [], pts = []; const sd = -(trk.outSign || 1); for (let i = 0; i < n; i += 22) { const p = at(i, sd, V + 34); if (p[4] < V + 26) continue; polesL.push({ x: p[0], y: p[1], z: p[2], s: 1 }); pts.push([p[0], p[1] + 8.6, p[2]]); }
      inst(new THREE.CylinderGeometry(0.13, 0.17, 9, 6).translate(0, 4.5, 0), new THREE.MeshLambertMaterial({ color: 0x5a4632 }), polesL, true);
      const seg = []; for (let k = 1; k < pts.length; k++) { const a0 = pts[k - 1], a1 = pts[k]; if (Math.hypot(a1[0] - a0[0], a1[2] - a0[2]) > 70) continue; for (const o2 of [-0.5, 0, 0.5]) { for (let t = 0; t < 6; t++) { const f0 = t / 6, f1 = (t + 1) / 6, sag = f => -1.1 * 4 * f * (1 - f); seg.push(a0[0] + (a1[0] - a0[0]) * f0, a0[1] + (a1[1] - a0[1]) * f0 + sag(f0) + o2 * 0.1, a0[2] + (a1[2] - a0[2]) * f0 + o2, a0[0] + (a1[0] - a0[0]) * f1, a0[1] + (a1[1] - a0[1]) * f1 + sag(f1) + o2 * 0.1, a0[2] + (a1[2] - a0[2]) * f1 + o2); } } }
      if (seg.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(seg), 3)); S.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x222222 }))); } }
  }
  buildClouds() { const THREE = T(), rnd = mulberry(77), wx = this.weather;
    const cCol = wx === 'regn' ? 0x6c7682 : wx === 'mulet' ? 0x9aa4b0 : wx === 'dimma' ? 0xc2cbd2 : wx === 'sno' ? 0xd2dae2 : 0xfff8ee;
    const op = wx === 'regn' ? 0.55 : wx === 'mulet' ? 0.62 : 0.48;
    const m = new THREE.MeshBasicMaterial({ color: cCol, transparent: true, opacity: op, fog: false, depthWrite: false }), g = new THREE.SphereGeometry(1, 10, 8);
    for (let k = 0; k < 14; k++) { const a = rnd() * 6.28, r = 850 + rnd() * 1450, grp = new THREE.Group(); for (let q = 0; q < 5; q++) { const s = new THREE.Mesh(g, m); s.position.set((rnd() - 0.5) * 140, (rnd() - 0.5) * 14, (rnd() - 0.5) * 65); s.scale.set(55 + rnd() * 60, 14 + rnd() * 12, 36 + rnd() * 36); grp.add(s); } grp.position.set(Math.cos(a) * r, 360 + rnd() * 260, Math.sin(a) * r); this.scene.add(grp); } }

  // ---------- bilar ----------
  addCar(body, paint, opt = {}) { const THREE = T(), G = new THREE.Group(), st = carStyle(opt.model, body), L = st.L, W = st.W, h = L / 2, bp = st.bp;
    // ritningsmått (bp): axlarna ligger på ±hjulbas/2, fram-/bakparti efter verkliga överhäng; profilen är 0,11 m mindre än ytterkanten (rundningen)
    const WB = bp ? bp.wb : L * 0.6, hF = bp ? WB / 2 + bp.fo - 0.11 : h, hR = bp ? bp.L - bp.fo - WB / 2 - 0.11 : h, XD = d => hF + 0.11 - d;
    const col = new THREE.Color(paint[0], paint[1], paint[2]);
    const pm = new THREE.MeshStandardMaterial({ color: col, metalness: 0.14, roughness: 0.48, envMapIntensity: 0.72 }), dark = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.85 }), glass = new THREE.MeshStandardMaterial({ color: 0x182430, roughness: 0.16, metalness: 0.35, envMapIntensity: 0.95, side: THREE.DoubleSide }), steel = new THREE.MeshStandardMaterial({ color: 0xa2a8b0, metalness: 0.82, roughness: 0.28, envMapIntensity: 0.9 }); pm.userData.paint = 1; // markör för skadesystemet (bucklor)
    const lamp = new THREE.MeshStandardMaterial({ color: 0xf6f4e8, emissive: 0x4a4430, roughness: 0.32, metalness: 0.15 }), amber = new THREE.MeshStandardMaterial({ color: 0xe8901c, emissive: 0x3a2008, roughness: 0.3 });
    const tail = new THREE.MeshBasicMaterial({ color: 0x8a0f0a }); G.userData.brake = tail;
    { if (!_aoTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,0.62)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.38)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); _aoTex = new THREE.CanvasTexture(c); }
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(L + 0.7, W + 0.6), new THREE.MeshBasicMaterial({ map: _aoTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.035; sh.renderOrder = 2; sh.userData.keep = 1; sh.userData.noShadow = 1; G.add(sh); G.userData.aoShadow = sh; } // kontaktskugga under bilen
    const ext = (pts, width, mat, bevel = 0.11) => { const s = roundShape(pts, st.round); const g = new THREE.ExtrudeGeometry(s, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: 8 }); g.translate(0, 0, -width / 2 + bevel); const m = new THREE.Mesh(g, mat); m.castShadow = true; G.add(m); return m; };
    const box = (x, y, z, sx, sy, sz, m, ry = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); b.rotation.y = ry; G.add(b); return b; };
    const disc = (x, y, z, r, m) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 18), m); c.rotation.z = Math.PI / 2; c.position.set(x, y, z); G.add(c); return c; };
    // ---- kaross: framparti efter modellens stil (rak "låda" eller sluttande kil), bakparti efter karosstyp
    const nb = st.nose === 'box', fx = hF, belt = bp ? bp.belt : st.belt, kH = bp ? Math.max(0.7, (bp.ws - 0.11) / (st.nose === 'shark' ? 1.3 : 1.25)) : 1, hoodY = bp?.hoodF ? bp.hoodF - 0.11 : 0.70;
    const front = nb ? [[fx - 0.02, 0.36], [fx + 0.02, 0.62], [fx, belt - 0.06], [fx - 0.12, belt]]
      : st.nose === 'shark' ? [[fx - 0.04, 0.36], [fx + 0.02, 0.5], [fx + 0.03, 0.66], [fx - 0.22 * kH, belt - 0.03], [fx - 0.7 * kH, belt]]
      : [[fx - 0.04, 0.34], [fx + 0.01, 0.52], [fx - 0.12, hoodY], [fx - 0.75 * kH, belt - 0.03], [fx - 1.15 * kH, belt]];
    const rear = st.tailT === 'notch' ? [[-hR + 0.35, belt + 0.03], [-hR + 0.02, belt], [-hR, 0.62], [-hR + 0.04, 0.36]] : [[-hR + 0.1, belt + 0.02], [-hR, belt - 0.05], [-hR - 0.01, 0.62], [-hR + 0.04, 0.36]];
    // öppna hjulhus: halvcirkelformade urtag i karossens underkant vid varje hjulaxel
    const axX = WB / 2, AR = 0.41, arch = cx => { const pts = []; for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI; pts.push([cx + AR * Math.cos(a), 0.31 + AR * Math.sin(a) + (k === 0 || k === 10 ? 0.01 : 0)]); } return pts; };
    const bodyPts = [[-hR + 0.06, 0.32], ...rear.slice().reverse(), ...front.slice().reverse(), [hF - 0.06, 0.32], ...arch(axX), ...arch(-axX)]; ext(bodyPts, W, pm);
    { const lin = new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.95 }); for (const cx of [axX, -axX]) { const b = new THREE.Mesh(new THREE.BoxGeometry(AR * 2 + 0.04, AR + 0.02, W - 0.46), lin); b.position.set(cx, 0.31 + (AR + 0.02) / 2, 0); G.add(b); } } // hjulhusens innerskärmar
    const rr = mulberry(hash((opt.model || body) + ':' + (opt.num || 0) + ':' + paint.join(','))); // samma bil ser alltid likadan ut
    // växthus: vindrutans lutning och taklinje efter stil
    const top = bp ? bp.H - 0.09 : st.H, aB = bp ? XD(bp.ws) : hF - st.hood, aT = bp ? XD(bp.rf) : aB - st.rake;
    const rT = bp ? XD(bp.rr) : st.tailT === 'notch' ? -hR + st.deck + 0.42 : st.tailT === 'liftback' ? -hR + 1.3 : st.tailT === 'hatch' ? -hR + 0.45 : -hR + 0.12,
      rB = bp ? XD(bp.cb) : st.tailT === 'notch' ? -hR + st.deck : st.tailT === 'liftback' ? -hR + 0.18 : st.tailT === 'hatch' ? -hR + 0.12 : -hR + 0.04;
    ext(st.arch ? [[rB, belt - 0.02], [rT, top - 0.03], [(rT + aT) / 2, top + 0.05], [aT, top - 0.01], [aB, belt - 0.02]] : [[rB, belt - 0.02], [rT, top], [aT, top + 0.01], [aB, belt - 0.02]], W - 0.2, pm, 0.09);
    const win = (pts, z) => { const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); const m = new THREE.Mesh(new THREE.ShapeGeometry(s), glass); m.position.z = z; G.add(m); };
    const bx = (aT + rT) / 2 - 0.05 + (st.tailT === 'wagon' ? -0.25 : 0) - (st.coupe ? 0.35 : 0) + (st.tailT === 'liftback' ? 0.1 : 0), zs = (W - 0.2) / 2 + 0.006, wb0 = belt + 0.03, wt = top - 0.07;
    for (const z of [zs, -zs]) { win([[aB - 0.16, wb0], [aT + 0.02, wt], [bx + 0.06, wt], [bx + 0.06, wb0]], z);
      const kink = st.kink ? [[rT + 0.2, wt], [rT + 0.32, wt - 0.08], [rB + 0.36, wb0]] : [[rT + 0.12, wt], [rB + 0.2, wb0]];
      win([[bx - 0.06, wb0], [bx - 0.06, wt], ...kink], z);
      if (st.tailT === 'wagon') win([[rT + 0.08, wt], [rT - 0.02, wb0 + 0.02], [rT + 0.2, wb0]], z); }
    const slant = (x0, y0, x1, y1, wd) => { const len = Math.hypot(x1 - x0, y1 - y0); let nx = (y1 - y0) / len, ny = -(x1 - x0) / len; if (ny < 0) { nx = -nx; ny = -ny; }
      const ax = x0 + (x1 - x0) * 0.1 + nx * 0.1, ay = y0 + (y1 - y0) * 0.1 + ny * 0.1, bx2 = x0 + (x1 - x0) * 0.93 + nx * 0.1, by = y0 + (y1 - y0) * 0.93 + ny * 0.1, g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([ax, ay, -wd / 2, ax, ay, wd / 2, bx2, by, wd / 2, bx2, by, -wd / 2]), 3)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); G.add(new THREE.Mesh(g, glass)); };
    slant(aB, belt - 0.02, aT, top, W - 0.42); slant(rB, belt - 0.02, rT, top, W - 0.42);
    // ---- front: strålkastare och grill efter märkesstil (inga emblem)
    const BV = 0.11, ly = nb ? belt - 0.2 : st.nose === 'shark' ? 0.6 : 0.6, lx = (nb ? fx + 0.025 : st.nose === 'shark' ? fx + 0.035 : fx - 0.005) + BV, lz = W / 2 - 0.3;
    for (const sd of [1, -1]) {
      if (st.lights === 'twinRound') { disc(lx, ly, sd * (lz + 0.04), 0.085, lamp); disc(lx - 0.01, ly, sd * (lz - 0.17), 0.075, lamp); box(lx - 0.01, ly, sd * (lz - 0.06), 0.02, 0.2, 0.5, dark); }
      else if (st.lights === 'round') { box(lx - 0.005, ly, sd * lz, 0.02, 0.22, 0.24, dark); disc(lx, ly, sd * lz, 0.09, lamp); }
      else if (st.lights === 'squareWide') { box(lx, ly, sd * (lz - 0.02), 0.03, 0.17, 0.42, lamp); box(lx, ly, sd * (lz + 0.24), 0.03, 0.17, 0.09, amber); }
      else if (st.lights === 'wideRect') { box(lx - 0.02, ly - 0.02, sd * (lz - 0.06), 0.03, 0.11, 0.5, lamp); box(lx - 0.025, ly - 0.02, sd * (lz + 0.24), 0.03, 0.09, 0.1, amber); }
      else if (st.lights === 'slim') { box(lx - 0.03, ly + 0.05, sd * (lz - 0.02), 0.06, 0.1, 0.4, lamp, sd * 0.15); }
      else { box(lx, ly, sd * lz, 0.03, 0.14, 0.34, lamp); box(lx - 0.01, ly - 0.12, sd * (lz + 0.1), 0.02, 0.05, 0.16, amber); }
    }
    const gy = ly - (st.grille === 'kidney' ? 0.0 : 0.0);
    if (st.grille === 'kidney') { for (const sd of [1, -1]) { const k = box(lx + 0.005, gy, sd * 0.085, 0.03, 0.17, 0.12, dark); const fr = box(lx + 0.0, gy, sd * 0.085, 0.025, 0.2, 0.15, steel); fr.scale.set(1, 1, 1); } }
    else if (st.grille === 'volvo') { box(lx + 0.005, gy, 0, 0.03, 0.2, 0.62, steel); for (let i = -2; i <= 2; i++) box(lx + 0.015, gy + i * 0.035, 0, 0.02, 0.012, 0.56, dark); }
    else if (st.grille === 'trapezoid') { box(lx - 0.02, 0.48, 0, 0.04, 0.16, 0.7, dark); box(lx - 0.01, 0.48, 0, 0.03, 0.18, 0.74, steel).scale.set(1, 1, 1); }
    else if (st.grille === 'blackbar') { box(lx + 0.0, ly, 0, 0.03, 0.12, W - 0.7, dark); }
    else if (st.grille === 'bars') { box(lx + 0.005, gy, 0, 0.03, 0.16, 0.66, dark); for (let i = -1; i <= 1; i++) box(lx + 0.015, gy + i * 0.05, 0, 0.02, 0.018, 0.64, steel); }
    else if (st.grille === 'slat') { box(lx, gy - 0.02, 0, 0.03, 0.12, 0.7, dark); box(lx + 0.01, gy - 0.02, 0, 0.02, 0.025, 0.72, steel); }
    else box(lx, gy - 0.04, 0, 0.03, 0.07, 0.6, dark);
    // ---- bak: baklyktor (lyser vid inbromsning)
    const tx = -hR - 0.012 - BV, ty = st.tailT === 'notch' ? belt - 0.1 : 0.72;
    for (const sd of [1, -1]) {
      if (st.tails === 'vertical') { box(tx + 0.02, 0.95, sd * (W / 2 - 0.12), 0.05, 0.62, 0.14, tail); }
      else if (st.tails === 'round') { disc(tx, ty, sd * (W / 2 - 0.25), 0.07, tail); disc(tx, ty, sd * (W / 2 - 0.45), 0.07, tail); }
      else box(tx, ty, sd * (W / 2 - 0.3), 0.03, st.tails === 'tall' ? 0.2 : 0.13, 0.42, tail);
    }
    if (st.wing) { box(-hR + 0.35, top - 0.12, 0, 0.32, 0.03, W - 0.2, pm); for (const sd of [1, -1]) box(-hR + 0.38, top - 0.22, sd * (W / 2 - 0.2), 0.12, 0.2, 0.04, pm); box(-hR + 0.22, belt + 0.12, 0, 0.26, 0.025, W - 0.25, pm); }
    if (st.rub) for (const sd of [1, -1]) { const e0 = 0.1 - (L - 0.9) / 2, e1 = 0.1 + (L - 0.9) / 2; for (const [x0, x1] of [[e0, -axX - AR - 0.02], [-axX + AR + 0.02, axX - AR - 0.02], [axX + AR + 0.02, e1]]) if (x1 > x0) box((x0 + x1) / 2, 0.56, sd * (W / 2 + 0.105), x1 - x0, 0.07, 0.03, dark); box(hF + 0.06, 0.4, 0, 0.12, 0.14, W - 0.1, dark); box(-hR - 0.06, 0.42, 0, 0.12, 0.13, W - 0.1, dark); }
    if (st.lip) { box(hF + 0.04, 0.25, 0, 0.14, 0.04, W - 0.16, dark); for (const sd of [1, -1]) box(0.0, 0.3, sd * (W / 2 + 0.1), 2 * (axX - AR - 0.04), 0.06, 0.05, pm); }
    if (st.gtwing) { const wx = -hR + 0.32, wy = belt + 0.42; box(wx, wy, 0, 0.36, 0.035, W - 0.08, pm); for (const sd of [1, -1]) { box(wx + 0.04, wy - 0.17, sd * 0.42, 0.14, 0.34, 0.03, pm); box(wx, wy + 0.02, sd * (W / 2 - 0.04), 0.4, 0.14, 0.02, pm); } }
    if (st.rails) for (const sd of [1, -1]) box((aT + rT) / 2 - 0.1, top + 0.05, sd * (W / 2 - 0.28), Math.abs(aT - rT) * 0.8, 0.035, 0.035, dark);
    G.userData.style = st;
    // tävlingsnummer: svart plåt över hela bakre sidorutan med stora vita siffror (som på riktiga rokkibilar)
    if (opt.num) { const numTxt = String(opt.num), tex = canvasTex(256, 160, (g, w2, h2) => { g.fillStyle = '#0d0d0f'; g.fillRect(0, 0, w2, h2); g.fillStyle = '#f7f6f0'; g.font = '900 128px "Arial Black", Impact, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(numTxt, w2 * 0.42, h2 / 2 + 6, w2 * 0.72); });
      const plateM = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
      const kink = st.kink ? [[rT + 0.2, wt], [rT + 0.32, wt - 0.08], [rB + 0.36, wb0]] : [[rT + 0.12, wt], [rB + 0.2, wb0]], poly = [[bx - 0.08, wb0 - 0.02], [bx - 0.08, wt + 0.02], ...kink.map(p => [p[0] - 0.01, p[1]])];
      for (const z of [zs + 0.006, -zs - 0.006]) { const sh = new THREE.Shape(); poly.forEach((p, k) => k ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])); const g = new THREE.ShapeGeometry(sh), pa = g.attributes.position, uv = g.attributes.uv;
        const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        for (let k = 0; k < pa.count; k++) { const u = (pa.getX(k) - x0) / (x1 - x0); uv.setXY(k, z > 0 ? u : 1 - u, (pa.getY(k) - y0) / (y1 - y0)); }
        const m = new THREE.Mesh(g, plateM); m.position.z = z; G.add(m); } }
    { const net = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.36), netMat()); net.position.set((aB - 0.16 + bx + 0.06) / 2 - 0.02, 1.13, -zs - 0.012); net.rotation.y = Math.PI; G.add(net); }
    // hjul, hjulhus, bromsskivor (med glöd vid hård inbromsning), stötfångare, bromsljus
    const wb = WB, wheels = [], frontWheels = [], rearWheels = [];
    const brakeDiscMatF = new THREE.MeshStandardMaterial({ color: 0x969ca4, metalness: 0.8, roughness: 0.34, emissive: 0x000000, emissiveIntensity: 0 });
    const brakeDiscMatR = new THREE.MeshStandardMaterial({ color: 0x969ca4, metalness: 0.8, roughness: 0.34, emissive: 0x000000, emissiveIntensity: 0 });
    const brakeHaloMatF = new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xff5a18, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const brakeHaloMatR = new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xff4812, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (const x of [wb / 2, -wb / 2]) for (const z of [W / 2 - 0.1, -W / 2 + 0.1]) {
      const isF = x > 0, piv = new THREE.Group(); piv.position.set(x, 0.31, z); const wh = new THREE.Group();
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.21, 24), [detMats().tread, detMats().side, detMats().side]); t.rotation.x = Math.PI / 2; t.castShadow = true; wh.add(t);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.22, 10), steel); rim.rotation.x = Math.PI / 2; wh.add(rim); for (let s = 0; s < (st.alloy ? 5 : 4); s++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(st.alloy ? 0.045 : 0.06, 0.34, 0.225), st.alloy ? steel : dark); sp.rotation.z = s * Math.PI / (st.alloy ? 5 : 4); wh.add(sp); }
      for (let s = 0; s < 4; s++) { const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.235, 6), dark); nut.rotation.x = Math.PI / 2; nut.position.set(Math.cos(s * 1.571 + 0.785) * 0.07, Math.sin(s * 1.571 + 0.785) * 0.07, 0); wh.add(nut); }
      const bDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 16), isF ? brakeDiscMatF : brakeDiscMatR); bDisc.rotation.x = Math.PI / 2; bDisc.position.z = z > 0 ? -0.08 : 0.08; piv.add(bDisc);
      const cal = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.06), detMats().red); cal.position.set(-0.1, 0.06, z > 0 ? -0.06 : 0.06); piv.add(cal);
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), isF ? brakeHaloMatF : brakeHaloMatR); halo.position.z = z > 0 ? 0.025 : -0.025; halo.visible = false; halo.userData.noShadow = 1; halo.renderOrder = 3; piv.add(halo);
      piv.add(wh); G.add(piv);
      const wRef = { piv, wh, front: isF, halo, baseY: 0.31 };
      wheels.push(wRef); (isF ? frontWheels : rearWheels).push(wRef);
    }
    G.userData.wheels = wheels; G.userData.frontWheels = frontWheels; G.userData.rearWheels = rearWheels;
    G.userData.brakeGlow = { discF: brakeDiscMatF, discR: brakeDiscMatR, haloF: brakeHaloMatF, haloR: brakeHaloMatR };
    const bm = opt.bars ? steel : dark; for (const [x, s] of [[hF + 0.02, 1], [-hR - 0.02, -1]]) { const br = st.bigBumper ? 0.13 : 0.1; const b = new THREE.Mesh(new THREE.CylinderGeometry(br, br, W - 0.16, 14), st.bigBumper && !opt.bars ? dark : bm); b.rotation.x = Math.PI / 2; b.scale.set(0.85, 1, 1); b.position.set(x + Math.sign(x) * (st.bigBumper ? 0.06 : 0), 0.42, 0); G.add(b);
      for (const z of [(W - 0.16) / 2, -(W - 0.16) / 2]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), bm); e.scale.set(0.85, 1, 1); e.position.set(x, 0.42, z); G.add(e); } }
    if (opt.mirrors) for (const z of [W / 2 + 0.08, -W / 2 - 0.08]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.16), dark); m.position.set(aB - 0.1, 0.99, z); G.add(m); }
    // ---- detaljer: dörrfogar, handtag, backspeglar, registerskyltar, solskydd, torkare, stänkskydd, bogserkrokar, avgasrör, takventil, dekaler
    { const D = detMats(), zS = W / 2 + 0.004, doors4 = !st.coupe && body !== 'coupe', aPil = aB - 0.08, dEnd = doors4 ? -wb / 2 + 0.42 : bx - 0.02;
      const seam = (x, y0, y1, z) => box(x, (y0 + y1) / 2, z, 0.012, y1 - y0, 0.006, D.seam);
      for (const sd of [1, -1]) { const z = sd * zS;
        seam(aPil, 0.4, belt - 0.02, z); seam(bx - 0.02, 0.36, belt - 0.02, z); if (doors4) seam(dEnd, 0.42, belt - 0.02, z);
        box((aPil + dEnd) / 2, 0.37, z, aPil - dEnd, 0.008, 0.006, D.seam);
        box(bx + 0.12, belt - 0.1, z + sd * 0.01, 0.13, 0.028, 0.02, steel); if (doors4) box(dEnd + 0.18, belt - 0.1, z + sd * 0.01, 0.13, 0.028, 0.02, steel);
        const dec = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.15), D.door[(opt.num ? +opt.num || 0 : 3) % D.door.length]); dec.position.set((aPil + bx) / 2, 0.62, z + sd * 0.002); if (sd < 0) dec.rotation.y = Math.PI; G.add(dec);
        if (!opt.mirrors) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.15), dark); m.position.set(aB - 0.12, belt + 0.07, sd * (W / 2 + 0.07)); G.add(m); }
        // stänkskydd bakom bakhjulen
        box(-wb / 2 - 0.4, 0.2, sd * (W / 2 - 0.13), 0.012, 0.26, 0.24, D.flap); }
      // registerskyltar fram och bak
      const plTxt = ['ABC', 'RKK', 'ZXL', 'GHT', 'NOP', 'KJU', 'VBG', 'EFT'][(String(opt.num || 0).length + (+opt.num || 0)) % 8] + '-' + (100 + ((+opt.num || 7) * 37) % 899), plateMat = new THREE.MeshBasicMaterial({ map: canvasTex(256, 56, (g, w2, h2) => { g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w2, h2); g.fillStyle = '#1d3f9a'; g.fillRect(0, 0, 30, h2); g.fillStyle = '#ffd400'; g.font = '700 12px Arial'; g.textAlign = 'center'; g.fillText('FIN', 15, h2 - 8); g.strokeStyle = '#111'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w2 - 3, h2 - 3); g.fillStyle = '#111'; g.font = '900 40px "Arial Narrow", Arial'; g.fillText(plTxt, 143, 43, 210); }) });
      for (const [x, ry] of [[hF + 0.125, Math.PI / 2], [-hR - 0.125, -Math.PI / 2]]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.115), plateMat); pl.position.set(x, 0.43, 0); pl.rotation.y = ry; G.add(pl); }
      // bogserkrokar (röda band), avgasrör och kort avgasflamma vid backfire
      box(hF + 0.13, 0.27, 0.36, 0.04, 0.05, 0.06, D.red); box(-hR - 0.13, 0.27, -0.36, 0.04, 0.05, 0.06, D.red);
      { const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 10), steel); ex.rotation.z = Math.PI / 2; ex.position.set(-hR - 0.02, 0.24, W / 2 - 0.38); G.add(ex);
        const bf = new THREE.Group(); bf.position.set(-hR - 0.17, 0.24, W / 2 - 0.38); bf.visible = false;
        const bfOuterMat = new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
        const bfCoreMat = new THREE.MeshBasicMaterial({ color: 0xbce8ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
        const bfGlowMat = new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xff8c2a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
        const fOuter = new THREE.Mesh(new THREE.ConeGeometry(0.088, 0.48, 8, 1, true).rotateZ(Math.PI / 2).translate(-0.24, 0, 0), bfOuterMat);
        const fCore = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.24, 8, 1, true).rotateZ(Math.PI / 2).translate(-0.12, 0, 0), bfCoreMat);
        const fGlowA = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), bfGlowMat); fGlowA.position.x = -0.06; fGlowA.rotation.y = Math.PI / 2;
        const fGlowB = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.26), bfGlowMat); fGlowB.position.x = -0.14;
        for (const fm of [fOuter, fCore, fGlowA, fGlowB]) { fm.userData.noShadow = 1; fm.renderOrder = 4; bf.add(fm); }
        G.add(bf); G.userData.backfire = { g: bf, outerMat: bfOuterMat, coreMat: bfCoreMat, glowMat: bfGlowMat }; }
      // solskyddsremsa överst på vindrutan + torkare
      { const x0 = aB, y0 = belt - 0.02, x1 = aT, y1 = top, len = Math.hypot(x1 - x0, y1 - y0); let nx = (y1 - y0) / len, ny = -(x1 - x0) / len; if (ny < 0) { nx = -nx; ny = -ny; }
        const P = f => [x0 + (x1 - x0) * f + nx * 0.104, y0 + (y1 - y0) * f + ny * 0.104], a0 = P(opt.num ? 0.66 : 0.78), a1 = P(0.95), wd = W - 0.44, g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([a0[0], a0[1], wd / 2, a0[0], a0[1], -wd / 2, a1[0], a1[1], -wd / 2, a1[0], a1[1], wd / 2]), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2)); g.setIndex([0, 1, 2, 0, 2, 3]); G.add(new THREE.Mesh(g, opt.num ? new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false, map: canvasTex(512, 112, (c, w2, h2) => { c.fillStyle = 'rgba(10,14,22,0.35)'; c.fillRect(0, 0, w2, h2); c.fillStyle = '#fff'; c.font = '900 96px "Arial Black", Impact, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(opt.num), w2 / 2, h2 / 2 + 3); }) }) : D.sun));
        const w0 = P(0.14); for (const zc of [0.28, -0.22]) { const wp = box(w0[0], w0[1], zc, 0.02, 0.02, 0.5, D.seam); wp.rotation.y = 0.25; } }
      // regnljus, motorhuvslås, tanklock, främre stänkskydd
      {
        const rl = box(-hR + (st.tailT === 'notch' ? st.deck : 0.25) + 0.02, belt + 0.12, 0, 0.04, 0.07, 0.16, new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0x7a0a04 })); rl.rotation.z = 0.4;
        for (const sd of [1, -1]) { const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 10), steel); pin.position.set(fx - 0.25, (nb ? belt : 0.72) + 0.01, sd * 0.5); G.add(pin);
          box(wb / 2 - 0.42, 0.2, sd * (W / 2 - 0.13), 0.012, 0.2, 0.22, D.flap); }
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 14), dark); cap.rotation.x = Math.PI / 2; cap.position.set(-wb / 2 - 0.05, belt - 0.12, W / 2 + 0.006); G.add(cap); }
      // takventil
      box(aT - 0.3, top + 0.03, 0, 0.26, 0.06, 0.32, dark); }
    // ---- rokkiralli-look efter referensbilderna: omålade/felfärgade plåtar, smuts och repor, nätgrill, plåtade rutor, maskotar och flaggor
    { const D = detMats(), PANEL = [0x121214, 0x121214, 0x5d6266, 0x7a1812, 0xe9e7e0, 0xd8a21c, 0x1f3f8a, 0x3a4a2a], pick = () => { let c; do c = PANEL[Math.floor(rr() * PANEL.length)]; while (new THREE.Color(c).distanceTo ? false : false); return c; };
      const panelMat = c => { const m = new THREE.MeshStandardMaterial({ color: c, metalness: 0.02, roughness: 0.88, envMapIntensity: 0.35 }); m.userData.paint = 1; return m; };
      // huv i annan färg (vanligast svart) – följer huvens profil ovanpå karossen
      if (rr() < 0.55) { const hp = [[aB - 0.04, belt], ...front.filter(p => p[1] >= (nb ? belt - 0.1 : 0.62)).sort((p, q) => q[0] - p[0]).reverse().filter(p => p[0] > aB - 0.04)].sort((p, q) => p[0] - q[0]);
        if (hp.length >= 2) { const sh = new THREE.Shape(), up = 0.118, dn = 0.07; hp.forEach((p, k) => k ? sh.lineTo(p[0], p[1] + up) : sh.moveTo(p[0], p[1] + up)); for (let k = hp.length - 1; k >= 0; k--) sh.lineTo(hp[k][0] + (k === hp.length - 1 ? -0.04 : 0), hp[k][1] + up - dn);
          const g = new THREE.ExtrudeGeometry(sh, { depth: W - 0.34, bevelEnabled: false }); g.translate(0, 0, -(W - 0.34) / 2); const hm = new THREE.Mesh(g, panelMat(rr() < 0.6 ? 0x121214 : pick())); hm.castShadow = true; G.add(hm);
          if (rr() < 0.5) box(hp[0][0] + (hp[hp.length - 1][0] - hp[0][0]) * 0.55, (hp[0][1] + hp[hp.length - 1][1]) / 2 + up + 0.02, 0, 0.32, 0.04, 0.42, dark); } } // ventilationshål/scoop i huven
      // en dörr eller en skärm i annan färg
      if (rr() < 0.45) { const sd = rr() < 0.5 ? 1 : -1, c = pick(), x0 = rr() < 0.6 ? bx + 0.0 : -wb / 2 + 0.45, x1 = x0 === bx ? aB - 0.1 : bx - 0.04; const pl = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(x1 - x0) - 0.03, belt - 0.42), panelMat(c)); pl.position.set((x0 + x1) / 2, (belt + 0.38) / 2, sd * (W / 2 + 0.003)); if (sd < 0) pl.rotation.y = Math.PI; G.add(pl); }
      // smuts, repor, rost och dekor på sidorna (en canvas per bil, följer karossens sidoprofil)
      { const style = Math.floor(rr() * 5), accent = ['#f08a1c', '#e8d21a', '#e02a20', '#2bd0ff', '#f4f4f0'][Math.floor(rr() * 5)], seed = rr() * 1000;
        const tex = canvasTex(512, 160, (g, w2, h2) => { const r2 = mulberry(seed | 0);
          if (style === 1) { g.strokeStyle = accent; g.lineWidth = 9; g.beginPath(); let x = 40; g.moveTo(x, 110); while (x < 470) { x += 22 + r2() * 14; g.lineTo(x, 50 + r2() * 20); x += 22 + r2() * 14; g.lineTo(x, 105 + r2() * 15); } g.stroke(); }
          else if (style === 2) { g.fillStyle = accent; g.fillRect(70, 60, 380, 14); g.fillRect(70, 82, 380, 7); }
          else if (style === 3) { g.fillStyle = accent; g.beginPath(); g.moveTo(0, 160); g.lineTo(150, 160); g.lineTo(230, 0); g.lineTo(80, 0); g.fill(); }
          for (let k = 0; k < 60; k++) { g.strokeStyle = `rgba(${r2() < 0.5 ? '230,230,225' : '40,30,20'},${0.15 + r2() * 0.35})`; g.lineWidth = 0.6 + r2() * 1.6; const x = r2() * w2, y = 20 + r2() * 120; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r2() - 0.5) * 120, y + (r2() - 0.5) * 18); g.stroke(); }
          for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(${120 + r2() * 40 | 0},${60 + r2() * 30 | 0},${20 + r2() * 15 | 0},${0.25 + r2() * 0.3})`; g.beginPath(); g.arc(r2() * w2, 60 + r2() * 100, 2 + r2() * 9, 0, 6.3); g.fill(); }
          const mud = g.createLinearGradient(0, h2, 0, h2 * 0.35); mud.addColorStop(0, 'rgba(70,58,42,0.85)'); mud.addColorStop(0.45, 'rgba(85,70,50,0.45)'); mud.addColorStop(1, 'rgba(85,70,50,0)'); g.fillStyle = mud; g.fillRect(0, 0, w2, h2);
          for (let k = 0; k < 220; k++) { g.fillStyle = `rgba(${70 + r2() * 30 | 0},${55 + r2() * 20 | 0},${38 + r2() * 15 | 0},${0.3 + r2() * 0.5})`; const y = h2 - Math.pow(r2(), 1.8) * h2 * 0.7; g.beginPath(); g.arc(r2() * w2, y, 0.8 + r2() * 3.5, 0, 6.3); g.fill(); }
          g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = '700 16px Arial'; g.fillText(['PJJ-Rakennus Ky', 'www.hespel.fi', 'Andersson Motorsport', 'Kuljetus Oy', 'KONEPAJA'][Math.floor(r2() * 5)], 205 + r2() * 60, 100); });
        const sm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }), xs = bodyPts.map(p => p[0]), ys = bodyPts.map(p => p[1]), X0 = Math.min(...xs), X1 = Math.max(...xs), Y0 = Math.min(...ys), Y1 = Math.max(...ys);
        for (const sd of [1, -1]) { const g = new THREE.ShapeGeometry(roundShape(bodyPts, st.round)), pa = g.attributes.position, uv = g.attributes.uv; for (let k = 0; k < pa.count; k++) { const u = (pa.getX(k) - X0) / (X1 - X0); uv.setXY(k, sd > 0 ? u : 1 - u, (pa.getY(k) - Y0) / (Y1 - Y0)); }
          const m = new THREE.Mesh(g, sm); m.position.z = sd * (W / 2 + 0.002); G.add(m); } }
      // nätgrill (perforerad plåt) i stället för grill, ibland nätplåt på stötfångaren
      { const meshTex = (bg, dot) => canvasTex(128, 64, (g, w2, h2) => { g.fillStyle = bg; g.fillRect(0, 0, w2, h2); g.fillStyle = dot; for (let y = 4; y < h2; y += 7) for (let x = (y / 7) % 2 ? 7 : 3.5; x < w2; x += 7) { g.beginPath(); g.arc(x, y, 2.2, 0, 6.3); g.fill(); } });
        const rust = rr() < 0.5, gm = new THREE.MeshLambertMaterial({ map: meshTex(rust ? '#9a5a26' : '#9aa0a6', '#1a1410') });
        box(lx + 0.012, ly - 0.06, 0, 0.02, 0.24, Math.max(0.5, 2 * (lz - 0.3)), gm);
        if (rr() < 0.4) box(hF + 0.14, 0.32, 0, 0.02, 0.17, 0.62, new THREE.MeshLambertMaterial({ map: meshTex('#b9bec4', '#33373b') })); }
      // plåtad bakruta (svart plåt) och ibland plåt i passagerarens sidoruta
      if (rr() < 0.55) { const x0 = rB, y0 = belt - 0.02, x1 = rT, y1 = top, len = Math.hypot(x1 - x0, y1 - y0); let nx = (y1 - y0) / len, ny = -(x1 - x0) / len; if (ny < 0) { nx = -nx; ny = -ny; } const o2 = 0.106, wd = W - 0.42, g = new THREE.BufferGeometry(), A = [x0 + (x1 - x0) * 0.08 + nx * o2, y0 + (y1 - y0) * 0.08 + ny * o2], B = [x0 + (x1 - x0) * 0.95 + nx * o2, y0 + (y1 - y0) * 0.95 + ny * o2];
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([A[0], A[1], -wd / 2, A[0], A[1], wd / 2, B[0], B[1], wd / 2, B[0], B[1], -wd / 2]), 3)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); G.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.8, side: THREE.DoubleSide }))); }
      { const pas = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.32), new THREE.MeshLambertMaterial({ map: canvasTex(64, 32, (g, w2, h2) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w2, h2); g.strokeStyle = '#8c9298'; g.lineWidth = 1.2; for (let k = -h2; k < w2; k += 5) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h2, h2); g.stroke(); g.beginPath(); g.moveTo(k + h2, 0); g.lineTo(k, h2); g.stroke(); } }), transparent: true }));
        pas.position.set((aB - 0.16 + bx + 0.06) / 2 - 0.02, (wb0 + wt) / 2, zs + 0.01); G.add(pas); } // metallnät i passagerarsidans ruta
      // gula/orange bogserpilar
      { const arrM = new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, (g) => { g.fillStyle = '#e8e21a'; g.beginPath(); g.moveTo(32, 60); g.lineTo(8, 30); g.lineTo(22, 30); g.lineTo(22, 4); g.lineTo(42, 4); g.lineTo(42, 30); g.lineTo(56, 30); g.fill(); }), transparent: true, side: THREE.DoubleSide });
        const a1 = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), arrM); a1.position.set(hF + 0.135, 0.5, 0.36); a1.rotation.y = Math.PI / 2; G.add(a1); const a2 = a1.clone(); a2.position.set(-hR - 0.135, 0.5, -0.36); a2.rotation.y = -Math.PI / 2; G.add(a2); }
      // rörstötfångare bak (dubbla stålrör) ibland
      if (rr() < 0.3) for (const yy of [0.34, 0.5]) { const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, W - 0.1, 10), steel); tb.rotation.x = Math.PI / 2; tb.position.set(-hR - 0.2, yy, 0); G.add(tb); }
      // antenn, takräcke, finsk flagga och maskot (gås/anka) på taket
      const roofX = (aT + rT) / 2;
      if (rr() < 0.35) { const an = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.75, 4), dark); an.position.set(rT + 0.2, top + 0.4, -W / 2 + 0.45); an.rotation.z = 0.25; G.add(an); }
      if (!st.rails && rr() < 0.3) for (const sd of [1, -1]) box(roofX, top + 0.06, sd * (W / 2 - 0.3), Math.abs(aT - rT) * 0.85, 0.035, 0.04, dark);
      if (rr() < 0.25) { const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 4), dark); fp.position.set(rT + 0.15, top + 0.3, W / 2 - 0.35); G.add(fp);
        const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19).translate(-0.15, 0, 0), new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, map: canvasTex(48, 30, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 48, 30); g.fillStyle = '#1a3d8f'; g.fillRect(13, 0, 8, 30); g.fillRect(0, 11, 48, 8); }) })); fl.position.set(rT + 0.15, top + 0.5, W / 2 - 0.35); G.add(fl); G.userData.carFlag = fl; }
      if (rr() < 0.22) { const wm = new THREE.MeshLambertMaterial({ color: rr() < 0.7 ? 0xf2f2ee : 0x6b4a2a }), om = new THREE.MeshLambertMaterial({ color: 0xf08a1c }), GS = new THREE.Group(); // maskot: gås på taket
        const add = (geo, mat, x, y, z, rz = 0, sc) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.z = rz; if (sc) m.scale.set(...sc); GS.add(m); };
        add(new THREE.SphereGeometry(0.16, 12, 10), wm, 0, 0.16, 0, 0, [1.55, 0.85, 0.8]); add(new THREE.ConeGeometry(0.1, 0.18, 8), wm, -0.27, 0.2, 0, Math.PI / 2 + 0.5);
        add(new THREE.CylinderGeometry(0.038, 0.055, 0.36, 8), wm, 0.2, 0.38, 0, -0.3); add(new THREE.SphereGeometry(0.065, 10, 8), wm, 0.26, 0.57, 0, 0, [1.25, 1, 1]);
        add(new THREE.ConeGeometry(0.03, 0.11, 6), om, 0.37, 0.56, 0, -Math.PI / 2); for (const zz of [0.06, -0.06]) add(new THREE.BoxGeometry(0.12, 0.02, 0.08), om, 0.02, 0.01, zz);
        GS.position.set((aT + rT) / 2 + 0.2, top + 0.02, 0); GS.scale.setScalar(1.5); G.add(GS); } }
    // Kontaktskuggan stannar på marken i G; hjul + fjädrad kaross ligger i liftG (lyfts vid hopp/airY)
    const bodyG = new THREE.Group(), rollP = new THREE.Group(), liftG = new THREE.Group();
    const wheelSet = new Set(wheels.map(w => w.piv)), groundSet = new Set(G.children.filter(c => c.userData.keep));
    for (const ch of [...G.children]) {
      if (groundSet.has(ch)) continue;
      if (wheelSet.has(ch)) liftG.add(ch);
      else bodyG.add(ch);
    }
    rollP.add(bodyG); liftG.add(rollP); G.add(liftG);
    G.userData.bodyG = bodyG; G.userData.chassis = bodyG; G.userData.rollP = rollP; G.userData.liftG = liftG; G.userData.halfW = W / 2;
    this.scene.add(G); this.cars.push(G); return G; }
  // Synliga skador: bucklar in lackerade delar (deterministiskt per bil) och gör lacken mattare/repig
  damageCar(G, dmg) {
    const lvl = Math.round(dmg / 5) * 5; if (G.userData.dl === lvl) return; G.userData.dl = lvl;
    const seed = G.userData.seed ??= Math.random() * 100, k = lvl / 100;
    G.traverse(m => {
      if (!m.isMesh || !m.material || !m.material.userData?.paint) return; // lackerade delar
      const pos = m.geometry.attributes.position; if (!m.userData.orig) m.userData.orig = pos.array.slice();
      const o = m.userData.orig, a = pos.array;
      for (let i = 0; i < a.length; i += 3) {
        const x = o[i], y = o[i + 1], z = o[i + 2], n = Math.sin(x * 3.1 + seed) * Math.cos(z * 2.7 + seed * 1.7) * Math.sin(y * 4.3 + seed * 0.3);
        const d = Math.max(0, n) * 0.16 * k;
        a[i] = x - Math.sign(x) * d * 0.6; a[i + 1] = y - d * 0.5; a[i + 2] = z - Math.sign(z) * d;
      }
      pos.needsUpdate = true; m.geometry.computeVertexNormals();
      if (!m.userData.c0) m.userData.c0 = m.material.color.clone();
      m.material.color.copy(m.userData.c0).lerp(new (T().Color)(0.35, 0.33, 0.3), k * 0.35); m.material.roughness = Math.min(0.98, 0.48 + k * 0.50);
    });
  }
  // roll/pitch = markens lutning (hjulen följer den). bRoll/bPitch/bY = karossens krängning, nickning och vibration ovanpå fjädringen.
  // Valfritt 15:e argument `car` matar in fysikfälten bodyRoll, bodyPitch, airY, steerVis, wheelSpin, brakeGlow och backfire.
  poseCar(G, x, y, z, hdg, roll, pitch, steer, spin, braking, visible, bRoll = 0, bPitch = 0, bY = 0, car = null) {
    G.visible = visible; if (!visible) return;
    G.position.set(x, y, z); G.rotation.order = 'YZX'; G.rotation.set(-roll, -hdg, pitch);
    const U = G.userData;
    const airY = Math.max(0, car?.airY || 0);
    const effRoll = car && car.bodyRoll != null ? car.bodyRoll + (car.vR || 0) : bRoll;
    const effPitch = car && car.bodyPitch != null ? car.bodyPitch + (car.vP || 0) : bPitch;
    const steerAng = car && car.steerVis != null ? -car.steerVis : -steer * 0.45;
    const wheelAng = car && car.wheelSpin != null ? car.wheelSpin : spin;
    const bGlow = car?.brakeGlow || 0;
    const bFire = car?.backfire || 0;
    // Hopp över krön: lyft kaross & hjul med airY medan kontaktskuggan ligger kvar på vägytan och tonas mjukt
    if (U.liftG) U.liftG.position.y = airY;
    if (U.aoShadow) {
      const shScale = 1 + Math.min(0.55, airY * 0.34);
      U.aoShadow.scale.set(shScale, shScale, 1);
      U.aoShadow.material.opacity = airY > 0.005 ? Math.max(0.12, 1 / (1 + airY * 1.15)) : 1;
    }
    const pz = effRoll < 0 ? -U.halfW : U.halfW;
    if (U.rollP) {
      U.rollP.position.set(0, 0.28, pz); U.rollP.rotation.x = effRoll;
      U.bodyG.position.set(0, -0.28 + bY, -pz); U.bodyG.rotation.z = effPitch;
    }
    // Hjulrotation, framhjulsstyrning och utfjädring i luften
    const droop = Math.min(0.11, airY * 0.32);
    for (const w of U.wheels) {
      w.wh.rotation.z = -wheelAng;
      w.piv.position.y = (w.baseY ?? 0.31) - droop;
      if (w.front) w.piv.rotation.y = steerAng;
    }
    U.brake.color.setHex(braking ? 0xff2a1a : 0x8a0f0a);
    // Bromsglöd på skivorna vid hård inbromsning (c.brakeGlow > 0.4)
    if (U.brakeGlow) {
      const bg = U.brakeGlow, on = bGlow > 0.4;
      if (on) {
        const g = Math.min(1, (bGlow - 0.4) / 0.6), gR = g * 0.68;
        bg.discF.emissive.setRGB(g, g * g * 0.30, g * 0.04); bg.discF.emissiveIntensity = 0.45 + g * 2.1;
        bg.discR.emissive.setRGB(gR, gR * gR * 0.25, gR * 0.03); bg.discR.emissiveIntensity = 0.35 + gR * 1.6;
        bg.haloF.opacity = g * 0.52; bg.haloR.opacity = gR * 0.36;
      } else {
        bg.discF.emissiveIntensity = bg.discR.emissiveIntensity = 0;
        bg.haloF.opacity = bg.haloR.opacity = 0;
      }
      for (const w of U.wheels) if (w.halo) w.halo.visible = on;
    }
    // Kort synlig avgasflamma vid backfire (c.backfire > 0)
    if (U.backfire) {
      const bf = U.backfire;
      if (bFire > 0.02) {
        bf.g.visible = true;
        const fl = 0.6 + bFire * 0.95 + Math.random() * 0.35, wSc = 0.72 + bFire * 0.48;
        bf.g.scale.set(fl, wSc, wSc);
        bf.g.rotation.x = Math.random() * 6.283;
        bf.outerMat.opacity = Math.min(0.95, bFire * 1.15);
        bf.coreMat.opacity = Math.min(1.0, bFire * 1.35);
        bf.glowMat.opacity = Math.min(0.85, bFire * 0.78);
      } else bf.g.visible = false;
    }
    if (U.carFlag) U.carFlag.rotation.y = Math.sin((this._t || 0) * 14 + wheelAng * 0.2) * 0.24;
  }

  // kupén: Antigravitys in-car-modeller (samma hörndata som förut) som three-geometri
  setCockpit(parts, paint) { const THREE = T(); this.buildCockExtra(paint); this.cockParts = parts.map(arr => { const n = arr.length / 10, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const o = i * 10; pos.set([arr[o], arr[o + 1], arr[o + 2]], i * 3); nor.set([arr[o + 3], arr[o + 4], arr[o + 5]], i * 3); const p = arr[o + 9] < 0.5; col.set(p ? [paint[0] * arr[o + 6], paint[1] * arr[o + 6], paint[2] * arr[o + 6]] : [arr[o + 6], arr[o + 7], arr[o + 8]], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); m.matrixAutoUpdate = false; m.frustumCulled = false; this.cock.add(m); return m; }); }

  // Kupédetaljer med runda former (samma koordinater som cockpitMesh: x fram, y upp, z höger; föraren sitter vid z ≈ −0.31)
  buildCockExtra(paint) { const THREE = T(), L = (c) => new THREE.MeshLambertMaterial({ color: c }), col = new THREE.Color(paint[0], paint[1], paint[2]);
    const body = this.cockX = new THREE.Group(), helm = this.cockH = new THREE.Group(); body.matrixAutoUpdate = helm.matrixAutoUpdate = false;
    const suit = L(0x15161a), suitHi = L(0x23252b), cage = L(0x2a2d32), white = L(0xeef0f2), visor = new THREE.MeshLambertMaterial({ color: 0x0b0d10 }), paintM = L(col), raw = L(0x4a4448), trim = L(0x1c1e22);
    const tube = (a, b, r, m, caps = true, g = body) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
      const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16), m); c.position.copy(A).add(B).multiplyScalar(0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(c);
      if (caps) for (const P of [A, B]) { const sp = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10), m); sp.position.copy(P); g.add(sp); } };
    // förardörr (rensad plåtdörr med mjuka hörn), dörrlist och dörrsträvor i buren
    const door = new THREE.Mesh(new THREE.ExtrudeGeometry(roundShape([[-0.58, 0.28], [0.50, 0.28], [0.56, 0.52], [0.50, 0.74], [-0.58, 0.74]], 0.09), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 8 }), paintM);
    door.position.z = -0.68; body.add(door);
    const inner = new THREE.Mesh(new THREE.ExtrudeGeometry(roundShape([[-0.5, 0.33], [0.42, 0.33], [0.46, 0.52], [0.42, 0.68], [-0.5, 0.68]], 0.07), { depth: 0.012, bevelEnabled: false, curveSegments: 8 }), raw);
    inner.position.z = -0.645; body.add(inner);
    tube([-0.6, 0.745, -0.655], [0.52, 0.745, -0.655], 0.024, trim);                        // dörrlist under sidorutan
    tube([-0.56, 0.36, -0.60], [0.46, 0.66, -0.60], 0.027, cage); tube([-0.56, 0.64, -0.60], [0.46, 0.38, -0.60], 0.027, cage); // oviputket (X)
    tube([0.46, 0.34, -0.60], [0.44, 0.74, -0.60], 0.028, cage); tube([0.44, 0.72, -0.60], [0.16, 1.22, -0.54], 0.027, cage); // vänster A-stolpe i buren
    // heltäckande golv, tröskel/sidobalkar, torpedvägg och bakre skott – så att man inte ser marken genom bilen
    const sheet = new THREE.MeshLambertMaterial({ color: 0x3a3d42 }), sheetD = new THREE.MeshLambertMaterial({ color: 0x2a2c30 });
    const slab = (x, y, z, sx, sy, sz, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); body.add(b); };
    slab(-0.35, 0.255, 0, 2.3, 0.03, 1.42, sheet);                    // golvplåt
    for (const sd of [1, -1]) slab(-0.35, 0.33, sd * 0.69, 2.3, 0.14, 0.08, sheetD); // trösklar
    slab(0.66, 0.45, 0, 0.03, 0.42, 1.42, sheetD);                     // torpedvägg bakom pedalerna
    slab(0.56, 0.29, 0, 0.22, 0.05, 1.3, sheet);                       // fotplåt
    slab(-1.4, 0.62, 0, 0.03, 0.75, 1.42, sheetD);                     // bakre skott (rensad baksätesplats)
    for (let i = -3; i <= 3; i++) slab(-0.35, 0.272, i * 0.18, 2.2, 0.008, 0.02, sheetD); // präglade förstyvningsräfflor
    // Nascar-nät i förarens sidoruta
    const net = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.4), netMat()); net.position.set(-0.1, 0.96, -0.63); body.add(net);
    // föraren: rundad bål, axlar och överarmar i overall (handskar och underarmar sitter på ratten)
    tube([-0.47, 0.42, -0.33], [-0.44, 0.80, -0.33], 0.155, suit);
    tube([-0.40, 0.84, -0.47], [-0.40, 0.83, -0.19], 0.075, suit);
    tube([-0.34, 0.80, -0.46], [0.01, 0.775, -0.44], 0.058, suit); tube([-0.34, 0.79, -0.20], [0.01, 0.765, -0.19], 0.060, suit);
    tube([-0.40, 0.84, -0.33], [-0.36, 0.95, -0.36], 0.05, suitHi);                           // nacke / HANS
    // hjälm (bara när kameran inte sitter i förarens ögon)
    const hel = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 18), white); hel.scale.set(1.05, 1.0, 0.95); hel.position.set(-0.30, 1.04, -0.37); helm.add(hel);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.132, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.32), L(0x14171b)); top.scale.copy(hel.scale); top.position.copy(hel.position); helm.add(top);
    const vis = new THREE.Mesh(new THREE.SphereGeometry(0.134, 20, 10, -0.75, 1.5, Math.PI * 0.40, Math.PI * 0.22), visor); vis.scale.copy(hel.scale); vis.position.copy(hel.position); vis.rotation.y = Math.PI / 2; helm.add(vis);
    // levande mätare: visare som följer varvtal, fart och temperatur (mätartavlorna sitter i brädan framför ratten)
    const ndM = new THREE.MeshBasicMaterial({ color: 0xff3a1e }); this.needles = [];
    for (const [gz, gr] of [[-0.41, 0.032], [-0.31, 0.042], [-0.21, 0.032]]) { const pv = new THREE.Group(); pv.position.set(0.243, 0.78, gz); const nd = new THREE.Mesh(new THREE.BoxGeometry(0.003, gr * 0.85, 0.004), ndM); nd.position.y = gr * 0.38; pv.add(nd);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.004, 8), L(0x111111)); hub.rotation.z = Math.PI / 2; pv.add(hub); body.add(pv); this.needles.push(pv); }
    // vindruta: tunn smuts, stenskott och torkarbågar (genomskinlig) – ger känslan av att sitta bakom en riktig ruta
    { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d'), r = mulberry(17);
      const grd = g.createRadialGradient(256, 300, 60, 256, 300, 330); grd.addColorStop(0, 'rgba(120,105,80,0)'); grd.addColorStop(0.75, 'rgba(120,105,80,0.10)'); grd.addColorStop(1, 'rgba(110,95,70,0.42)'); g.fillStyle = grd; g.fillRect(0, 0, 512, 256);
      for (let k = 0; k < 900; k++) { const x = r() * 512, y = r() * 256, ed = Math.min(1, Math.abs(x - 256) / 256 + (1 - y / 256) * 0.4); g.fillStyle = `rgba(${90 + r() * 40 | 0},${80 + r() * 30 | 0},${60 + r() * 20 | 0},${0.05 + ed * 0.25 * r()})`; g.beginPath(); g.arc(x, y, 0.5 + r() * 2.2, 0, 6.3); g.fill(); }
      g.globalCompositeOperation = 'destination-out'; for (const cx of [150, 360]) { g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineWidth = 120; g.beginPath(); g.arc(cx, 262, 140, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); } g.globalCompositeOperation = 'source-over';
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28; g.beginPath(); g.moveTo(440, 60); g.lineTo(440 + Math.cos(a) * (10 + r() * 22), 60 + Math.sin(a) * (10 + r() * 22)); g.stroke(); }
      const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      ws.rotation.set(0, -Math.PI / 2, 0); ws.rotateX(-0.51); ws.position.set(0.30, 0.97, 0); ws.renderOrder = 5; body.add(ws); }
    this.cock.add(body); this.cock.add(helm); }

  resize() { const r = this.canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, target = { '540': 540, '720': 720, '1080': 1080, '1440': 1440 }[this.res];
    const ratio = (target ? Math.min(3, Math.max(0.3, target / Math.max(1, r.height))) : Math.min(dpr, this.P.pr)) * this.dyn;
    this.r.setPixelRatio(ratio); this.r.setSize(r.width, r.height, false); this.cam.aspect = r.width / Math.max(1, r.height); this.pxH = r.height * ratio; }

  // Korta plåtgnistor vid bilkollisioner (anropas från race.js vid kollision)
  emitSparks(x, y, z, strength = 3, vx = 0, vz = 0) {
    if (!this.ok || !this.sparkList) return;
    const n = Math.min(30, Math.max(6, Math.round(strength * 4.5)));
    const spd = Math.min(14, 3.2 + strength * 1.15);
    for (let i = 0; i < n; i++) {
      if (this.sparkList.length >= this.sparkMax) this.sparkList.shift();
      const ang = Math.random() * 6.283, rad = spd * (0.35 + Math.random() * 0.85);
      this.sparkList.push({
        x: x + (Math.random() - 0.5) * 0.35,
        y: y + 0.42 + Math.random() * 0.38,
        z: z + (Math.random() - 0.5) * 0.35,
        vx: vx * 0.55 + Math.cos(ang) * rad,
        vy: 1.4 + Math.random() * (2.6 + Math.min(4, strength * 0.45)),
        vz: vz * 0.55 + Math.sin(ang) * rad,
        life: 0,
        max: 0.16 + Math.random() * 0.32,
      });
    }
  }
  // Viftar med gul flagga på de poster (index i trk.posts / reservposterna) som har gul flagg just nu
  setYellow(set, t) { for (const [q, f] of (this.yFlags || []).entries()) { if (!f) continue; const on = set.has(q); f.g.visible = on;
      if (on) { const a = Math.sin(t * 7 + q); f.g.rotation.set(0, t * 1.3 % (Math.PI * 2), a * 0.9); f.cl.rotation.y = Math.sin(t * 11 + q) * 0.5; } } }
  frame(o) { if (!this.ok) return; const THREE = T(), cam = this.cam, R = this.r;
    const nowMs = performance.now();
    const dt = o.dt != null ? Math.min(0.05, Math.max(0, o.dt)) : Math.min(0.05, Math.max(0, (nowMs - (this._lastMs || nowMs)) / 1000));
    this._lastMs = nowMs;
    const tSec = this._t = o.t != null ? o.t : nowMs * 0.001;
    cam.fov = o.fov * 180 / Math.PI; cam.updateProjectionMatrix(); cam.position.set(o.eye[0], o.eye[1], o.eye[2]); cam.up.set(o.up[0], o.up[1], o.up[2]); cam.lookAt(o.at[0], o.at[1], o.at[2]);
    this.sky.position.copy(cam.position);
    if (this.sky.userData?.update) this.sky.userData.update(tSec);
    else if (this.sky.material?.uniforms?.uTime) this.sky.material.uniforms.uTime.value = tSec;
    // Subtil vindrörelse på flaggor
    if (this.flags && this.flags.length) {
      const wSpd = this.weather === 'regn' ? 7.2 : this.weather === 'mulet' ? 5.6 : 4.2;
      const wAmp = this.weather === 'regn' ? 0.16 : this.weather === 'mulet' ? 0.13 : 0.10;
      for (const fl of this.flags) {
        const pa = fl.geo.attributes.position, len = fl.len, amp = wAmp * (fl.amp || 1);
        for (let v = 0; v < pa.count; v++) {
          const u = pa.getX(v) / len;
          const wave = Math.sin(u * 4.8 - tSec * wSpd + fl.phase) * amp * u
            + Math.sin(u * 9.2 - tSec * wSpd * 1.6 + fl.phase * 1.7) * (amp * 0.25) * u * u;
          pa.setZ(v, wave);
        }
        pa.needsUpdate = true;
      }
    }
    // LOD: nära rutor visar detaljerade träd, avlägsna en enkel kon; gräs bara nära kameran
    if (this.forest) { const nr = this.P.lodNear; for (const c of this.forest) { const d = Math.hypot(c.cx - cam.position.x, c.cz - cam.position.z), st = !nr || d < nr ? 0 : 1; if (st !== c.st) { c.st = st; for (const m of c.near) m.visible = st === 0; for (const m of c.far) m.visible = st === 1; } } }
    if (this.grass) for (const g of this.grass) g.m.visible = Math.hypot(g.cx - cam.position.x, g.cz - cam.position.z) < 150 + this.level * 40;
    // Auto: dynamisk upplösning för stabil bildfrekvens
    if (this.autoQ) { const dtm = nowMs - (this.fT || nowMs); this.fT = nowMs; if (dtm > 0 && dtm < 500) { this.fAvg = (this.fAvg || 16.7) * 0.95 + dtm * 0.05; this.fN = (this.fN || 0) + 1;
        if (this.fN > 90 && this.fN % 30 === 0) { const prev = this.dyn; if (this.fAvg > 19.5) this.dyn = Math.max(0.55, this.dyn - 0.08); else if (this.fAvg < 15.2 && this.dyn < 1) this.dyn = Math.min(1, this.dyn + 0.05); if (prev !== this.dyn) this.resize(); } } }
    if (this.precip) { const a = this.precip.geometry.attributes.position, wxV = this.wind[0] * 0.9, wzV = this.wind[1] * 0.9;
      for (let i = 0; i < a.count; i++) {
        let x = a.array[i * 3] + wxV * dt, y = a.array[i * 3 + 1] - this.precipV * dt, z = a.array[i * 3 + 2] + wzV * dt;
        if (y < -30) y += 60; if (x > 30) x -= 60; else if (x < -30) x += 60; if (z > 30) z -= 60; else if (z < -30) z += 60;
        a.array[i * 3] = x; a.array[i * 3 + 1] = y; a.array[i * 3 + 2] = z;
      }
      a.needsUpdate = true; this.precip.position.copy(cam.position); }
    const f = o.focus; this.sun.target.position.set(f[0], f[1], f[2]); this.sun.position.set(f[0] + this.sunDir.x * 190, f[1] + this.sunDir.y * 190, f[2] + this.sunDir.z * 190);
    // Damm, grussprut och gnistor
    const scVal = (this.pxH || 800) / (2 * Math.tan(o.fov / 2));
    const pl = o.particles || [], pa = this.pGeo.attributes;
    const sa = this.sGeo.attributes, sp = sa.position, sSz = sa.sz, sCol = sa.col;
    const spPos = this.sparkGeo.attributes.position, spCol = this.sparkGeo.attributes.color;
    let N = 0, M = 0, K = 0;
    const wx0 = this.wind[0], wz0 = this.wind[1], win = this.winter;
    for (let i = 0; i < pl.length; i++) {
      const q = pl[i], u = Math.max(0, Math.min(1, q.life / (q.max || 1)));
      if (q.spark) {
        if (K < this.sparkMax) {
          const fade = Math.max(0, 1 - u), vx = q.vx || 0, vy = q.vy || 0, vz = q.vz || 0, tl = 0.032;
          spPos.setXYZ(K * 2, q.x, q.y, q.z);
          spPos.setXYZ(K * 2 + 1, q.x - vx * tl, q.y - vy * tl, q.z - vz * tl);
          spCol.setXYZ(K * 2, fade, 0.94 * fade, 0.68 * fade);
          spCol.setXYZ(K * 2 + 1, fade, 0.32 * fade, 0.04 * fade);
          K++;
        }
        continue;
      }
      if (q.stone) {
        if (M < this.sMax) {
          const h = ((Math.sin(q.max * 437.5 + i * 1.37) * 0.5) + 0.5);
          sp.setXYZ(M, q.x, q.y, q.z);
          sSz.setX(M, (q.s > 0.02 ? q.s : 0.085 + h * 0.065));
          if (win) sCol.setXYZ(M, 0.84 + h * 0.14, 0.89 + h * 0.10, 0.95 + h * 0.05);
          else sCol.setXYZ(M, 0.30 + h * 0.24, 0.25 + h * 0.20, 0.19 + h * 0.15);
          M++;
        }
        continue;
      }
      if (N >= this.pMax) continue;
      const d = q.d || o.dust;
      const drift = q.life * (0.42 + u * 0.68), lift = Math.min(1.6, q.life * 0.26);
      pa.position.setXYZ(N, q.x + wx0 * drift, q.y + lift, q.z + wz0 * drift);
      const fadeIn = Math.min(1, u * 6.5), fadeOut = Math.pow(Math.max(0, 1 - u), 1.3);
      pa.col.setXYZW(N, d[0], d[1], d[2], 0.64 * fadeIn * fadeOut);
      pa.sz.setX(N, q.s * 2.75 * (0.80 + u * 1.45));
      pa.rot.setX(N, (q.max * 19.3 + q.s * 7.1) + q.life * 0.65);
      N++;
    }
    // Simulera & rita kollisionsgnistor ur egen pool
    if (this.sparkList.length) {
      for (let i = this.sparkList.length - 1; i >= 0; i--) {
        const s = this.sparkList[i];
        s.life += dt;
        if (s.life >= s.max) { this.sparkList[i] = this.sparkList[this.sparkList.length - 1]; this.sparkList.pop(); continue; }
        s.vy -= 14.5 * dt;
        const drag = Math.max(0, 1 - 1.4 * dt);
        s.vx *= drag; s.vz *= drag;
        s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
        const gh = this.meshH(s.x, s.z) + 0.03;
        if (s.y < gh) { s.y = gh; s.vy = Math.abs(s.vy) * 0.38; s.vx *= 0.65; s.vz *= 0.65; }
        if (K < this.sparkMax) {
          const fade = Math.max(0, 1 - s.life / s.max), tl = 0.032;
          spPos.setXYZ(K * 2, s.x, s.y, s.z);
          spPos.setXYZ(K * 2 + 1, s.x - s.vx * tl, s.y - s.vy * tl, s.z - s.vz * tl);
          spCol.setXYZ(K * 2, fade, 0.95 * fade, 0.72 * fade);
          spCol.setXYZ(K * 2 + 1, fade, 0.34 * fade, 0.04 * fade);
          K++;
        }
      }
    }
    sp.needsUpdate = sSz.needsUpdate = sCol.needsUpdate = true; this.sGeo.setDrawRange(0, M); this.sMat.uniforms.sc.value = scVal;
    spPos.needsUpdate = spCol.needsUpdate = true; this.sparkGeo.setDrawRange(0, K * 2);
    pa.position.needsUpdate = pa.col.needsUpdate = pa.sz.needsUpdate = pa.rot.needsUpdate = true; this.pGeo.setDrawRange(0, N); this.pMat.uniforms.sc.value = scVal;
    R.clear(); R.render(this.scene, cam);
    if (o.gauges && this.needles) { const gq = o.gauges, a = (u) => -2.36 + Math.max(0, Math.min(1, u)) * 4.72; this.needles[0].rotation.x = -a(gq.kmh / 200); this.needles[1].rotation.x = -a(gq.rpm / Math.max(4000, gq.max)); this.needles[2].rotation.x = -a((gq.temp - 40) / 90); }
    if (o.cockpit && this.cockParts) { o.cockpit.forEach((m, i) => { if (this.cockParts[i]) { this.cockParts[i].visible = !!m; if (m) this.cockParts[i].matrix.fromArray(m); } });
      const base = o.cockpit[0] || o.cockpit[3]; if (this.cockX) { this.cockX.visible = !!base; if (base) this.cockX.matrix.fromArray(base); this.cockH.visible = !!o.cockpit[0]; if (o.cockpit[0]) this.cockH.matrix.fromArray(o.cockpit[0]); } R.clearDepth(); R.render(this.cock, cam); }
  }
  dispose() { try { this.r.dispose(); this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } catch (e) { } }
}

// ---------- Garage-showroom: vald bil roterar på en lysande plattform ----------
export class Showroom {
  constructor() {
    const THREE = T(); this.ok = !!THREE; if (!this.ok) return;
    const cv = this.canvas = document.createElement('canvas'); cv.className = 'showroom-cv';
    try { this.r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { this.ok = false; return; }
    this.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); this.r.shadowMap.enabled = true; this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    const S = this.scene = new THREE.Scene(); S.fog = new THREE.Fog(0x0b0f14, 9, 22);
    this.cam = new THREE.PerspectiveCamera(32, 2, 0.1, 60);
    S.add(new THREE.HemisphereLight(0xcfe3ff, 0x1a1410, 0.55));
    const key = new THREE.SpotLight(0xffffff, 1.15, 30, 0.6, 0.45); key.position.set(4, 7, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); S.add(key);
    const rim = new THREE.DirectionalLight(0x6fc8ff, 0.55); rim.position.set(-5, 3, -4); S.add(rim);
    const warm = new THREE.PointLight(0xffb060, 0.5, 12); warm.position.set(-3, 1.5, 3); S.add(warm);
    // plattform: mörk skiva, lysande kantring och mjukt sken på golvet
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.25, 0.18, 64), new THREE.MeshStandardMaterial({ color: 0x4a5663, metalness: 0.45, roughness: 0.4 }));
    plat.position.y = -0.09; plat.receiveShadow = true; S.add(plat);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x44d4ff }); this.ringMat = ringMat;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.12, 0.045, 12, 96), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.0; S.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.018, 8, 96), ringMat); ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.005; S.add(ring2);
    const glowTex = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, w * 0.28, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(68,212,255,0)'); gr.addColorStop(0.55, 'rgba(68,212,255,0.55)'); gr.addColorStop(1, 'rgba(68,212,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 9.5), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.rotation.x = -Math.PI / 2; glow.position.y = -0.17; S.add(glow);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: 0x0d1116, roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.18; S.add(floor);
    this.turn = new THREE.Group(); S.add(this.turn); this.key = '';
    // kontaktskugga under bilen så att den står på plattformen
    const shTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false })); this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.004; this.turn.add(this.shadow);
    this.loop = this.loop.bind(this);
  }
  setCar(o) {
    if (!this.ok) return; const k = JSON.stringify(o); if (k === this.key) return; this.key = k;
    if (this.car) { this.turn.remove(this.car); this.car.traverse(m => { if (m.geometry) m.geometry.dispose(); }); }
    const holder = { scene: { add() { } }, cars: [] };
    const G = View3.prototype.addCar.call(holder, o.body, o.paint, { model: o.model, num: o.num, bw: o.bw, bars: o.bars, mirrors: o.mirrors });
    G.traverse(m => { if (m.isMesh && !m.userData.noShadow) m.castShadow = true; });
    for (const w of G.userData.wheels) w.wh.rotation.z = 0;
    this.car = G; this.turn.add(G); const st = G.userData.style || { L: 4.3, W: 1.68 }; this.shadow.scale.set(st.L * 1.25, st.W * 1.5, 1);
  }
  mount(el) { if (!this.ok || !el) return; el.appendChild(this.canvas); this.host = el; if (!this.running) { this.running = true; this.t0 = performance.now(); requestAnimationFrame(this.loop); } }
  loop(now) {
    if (!this.canvas.isConnected) { this.running = false; return; }
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (w && h && (w !== this.w || h !== this.h)) { this.w = w; this.h = h; this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); }
    const t = (now - this.t0) / 1000; this.turn.rotation.y = t * 0.45;
    const d = this.cam.aspect < 1.2 ? 9.5 : 7.6; this.cam.position.set(Math.cos(0.5) * d, 1.85, Math.sin(0.5) * d); this.cam.lookAt(0, 0.6, 0);
    this.ringMat.color.setHSL(0.54, 0.9, 0.55 + 0.08 * Math.sin(t * 2.2));
    this.r.render(this.scene, this.cam); requestAnimationFrame(this.loop);
  }
}
