// 3D-vyn: three.js-scen med kuperad terräng, skog, himmel, skuggor och formade bilar.
// three.js (r128, MIT) laddas som global THREE från js/vendor/three.min.js.
import { ensureTerrain } from './terrain.js';
import { hash, mulberry } from './gl.js';

const T = () => window.THREE;
const SPONSORS = ['HITSIPILLI RACING', 'TEAM SORAKUOPPA', 'NAVETTA MOTORSPORT', 'PÄRINÄPOJAT', 'KURARALLI', 'RAUTAKANKI RT', 'LÖYSÄ PULTTI', 'SAUNAN TAKA RACING', 'ROKKIKRAFT'];

// Modellstil per bil: proportioner och typiska drag (utan emblem). nose: box = upprätt, wedge = sluttande kil, shark = framåtlutad nos
const STYLE = {
  mazda626: { L: 4.52, H: 1.40, nose: 'wedge', lights: 'rect', grille: 'slot', tails: 'wide', tailT: 'notch', deck: 0.62 },
  passat_rx: { L: 4.67, H: 1.46, nose: 'wedge', lights: 'slim', grille: 'slat', tails: 'wide', tailT: 'wagon', rails: 1, round: 0.3 },
  passat_vetari: { L: 4.67, H: 1.44, nose: 'wedge', lights: 'slim', grille: 'slat', tails: 'wide', tailT: 'notch', deck: 0.75, round: 0.3 },
  passat_kardaani: { L: 4.67, H: 1.44, nose: 'wedge', lights: 'slim', grille: 'slat', tails: 'wide', tailT: 'notch', deck: 0.75, round: 0.3 },
  mondeo_st: { L: 4.73, H: 1.42, nose: 'wedge', lights: 'slim', grille: 'trapezoid', tails: 'tall', tailT: 'hatch', round: 0.3 },
  mondeo: { L: 4.73, H: 1.42, nose: 'wedge', lights: 'slim', grille: 'slat', tails: 'wide', tailT: 'notch', deck: 0.78, round: 0.3 },
  mazda3: { L: 4.42, H: 1.46, nose: 'wedge', lights: 'slim', grille: 'trapezoid', tails: 'round', tailT: 'hatch', round: 0.32 },
  kadett: { L: 4.25, H: 1.43, nose: 'wedge', lights: 'rect', grille: 'slot', tails: 'tall', tailT: 'hatch', round: 0.26 },
  sunny: { L: 4.48, H: 1.42, nose: 'wedge', lights: 'rect', grille: 'volvo', tails: 'wide', tailT: 'notch', deck: 0.7 },
  civic: { L: 4.71, H: 1.45, nose: 'box', lights: 'rect', grille: 'volvo', tails: 'vertical', tailT: 'wagon', rails: 1, round: 0.12 },
  v940: { L: 4.79, H: 1.44, nose: 'box', lights: 'squareWide', grille: 'volvo', tails: 'vertical', tailT: 'wagon', rails: 1, round: 0.08, bigBumper: 1 },
  volvo_v8_super: { L: 4.79, H: 1.42, nose: 'box', lights: 'squareWide', grille: 'volvo', tails: 'tall', tailT: 'notch', deck: 0.95, round: 0.08, bigBumper: 1 },
  bmw325: { L: 4.43, H: 1.39, nose: 'shark', lights: 'twinRound', grille: 'kidney', tails: 'wide', tailT: 'notch', deck: 0.8, kink: 1, round: 0.24 },
  v343: { L: 4.2, H: 1.38, nose: 'box', W: 1.6, lights: 'round', grille: 'bars', tails: 'wide', tailT: 'notch', deck: 0.78, round: 0.14 },
  ascona_super: { L: 4.32, H: 1.38, nose: 'box', W: 1.62, lights: 'rect', grille: 'bars', tails: 'wide', tailT: 'notch', deck: 0.8, round: 0.14 },
  sierra: { L: 4.43, H: 1.40, nose: 'wedge', lights: 'rect', grille: 'blackbar', tails: 'wide', tailT: 'notch', deck: 0.7, round: 0.32 },
  sierra_super: { L: 4.46, H: 1.38, nose: 'wedge', lights: 'rect', grille: 'blackbar', tails: 'wide', tailT: 'hatch', wing: 1, round: 0.32 },
  saab9000: { L: 3.98, H: 1.38, nose: 'box', W: 1.57, lights: 'round', grille: 'bars', tails: 'wide', tailT: 'notch', deck: 0.72, round: 0.14 },
  starlet_super: { L: 3.7, H: 1.38, nose: 'box', W: 1.54, lights: 'rect', grille: 'bars', tails: 'tall', tailT: 'hatch', round: 0.14 },
};
function carStyle(model, body) {
  const b = STYLE[model] || { L: body === 'wagon' ? 4.5 : body === 'sedan' ? 4.3 : 3.95, H: 1.39, nose: 'wedge', lights: 'rect', grille: 'slot', tails: 'wide', tailT: body === 'wagon' ? 'wagon' : body === 'sedan' ? 'notch' : 'hatch', deck: 0.75 };
  const st = { W: 1.68, round: 0.22, deck: 0.75, belt: 0.92, ...b };
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

export class View3 {
  constructor(canvas, trk, opt = {}) {
    const THREE = T(); this.ok = !!THREE; if (!THREE) return;
    ensureTerrain(trk); this.trk = trk; this.q = opt.quality ?? 1; this.winter = trk.winter; this.canvas = canvas;
    const R = this.r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    R.outputEncoding = THREE.LinearEncoding;
    R.shadowMap.enabled = this.q > 0; R.shadowMap.type = THREE.PCFSoftShadowMap; R.autoClear = false;
    this.res = opt.res || 'auto';
    const S = this.scene = new THREE.Scene(), w = this.winter;
    const wx = this.weather = opt.weather || 'sol', grey = wx === 'mulet' || wx === 'regn' || wx === 'dimma' || wx === 'sno';
    const horizon = new THREE.Color(grey ? (wx === 'regn' ? 0x8a9198 : wx === 'sno' ? 0xd8dde2 : 0xb4bcc4) : w ? 0xd5e2ee : 0xa9cbe6), zenith = new THREE.Color(grey ? (wx === 'regn' ? 0x5d646c : 0x8e98a3) : w ? 0x5f8cc0 : 0x2764b4);
    S.fog = new THREE.Fog(horizon, wx === 'dimma' ? 20 : wx === 'regn' || wx === 'sno' ? 60 : 140, wx === 'dimma' ? 220 : wx === 'regn' || wx === 'sno' ? 520 : w ? 900 : 1300);
    this.cam = new THREE.PerspectiveCamera(60, 1, 0.08, 4000);
    // himmel
    const sunDir = this.sunDir = new THREE.Vector3(0.55, 0.62, 0.42).normalize();
    const sky = new THREE.Mesh(new THREE.SphereGeometry(3200, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: zenith }, hor: { value: horizon }, sun: { value: grey ? new THREE.Vector3(0, -1, 0) : sunDir } },
      vertexShader: 'varying vec3 d;void main(){d=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'varying vec3 d;uniform vec3 top,hor,sun;void main(){float h=clamp(d.y,0.0,1.0);vec3 c=mix(hor,top,pow(h,0.55));float s=max(dot(normalize(d),sun),0.0);c+=vec3(1.0,0.92,0.75)*(pow(s,350.0)*1.6+pow(s,12.0)*0.16);gl_FragColor=vec4(c,1.0);}' }));
    this.sky = sky; S.add(sky);
    S.add(new THREE.HemisphereLight(w ? 0xdde9ff : 0xcfe2ff, w ? 0x9aa6b5 : 0x5a5240, w ? 0.62 : 0.52));
    const sun = this.sun = new THREE.DirectionalLight(w ? 0xfff2e0 : 0xffedc8, (w ? 0.72 : 0.86) * (grey ? 0.45 : 1)); sun.castShadow = this.q > 0 && !grey;
    if (wx === 'regn' || wx === 'sno') { // nederbörd: partiklar som följer kameran
      const N = this.q ? 3500 : 1400, g = new THREE.BufferGeometry(), pos = new Float32Array(N * 3); for (let i = 0; i < N * 3; i++) pos[i] = (Math.random() - 0.5) * 60;
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.precip = new THREE.Points(g, new THREE.PointsMaterial({ color: wx === 'sno' ? 0xffffff : 0xaab8c8, size: wx === 'sno' ? 0.12 : 0.06, transparent: true, opacity: wx === 'sno' ? 0.9 : 0.55, depthWrite: false }));
      this.precip.frustumCulled = false; S.add(this.precip); this.precipV = wx === 'sno' ? 1.6 : 14;
    }
    const sc = sun.shadow.camera; sc.left = -75; sc.right = 75; sc.top = 75; sc.bottom = -75; sc.near = 1; sc.far = 420; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
    S.add(sun); S.add(sun.target);
    this.buildTerrain(); this.buildTrack(); this.buildForest(); this.buildProps(); this.buildClouds();
    // damm
    const pg = this.pGeo = new THREE.BufferGeometry(), N = 260; pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); pg.setAttribute('col', new THREE.BufferAttribute(new Float32Array(N * 4), 4)); pg.setAttribute('sz', new THREE.BufferAttribute(new Float32Array(N), 1));
    const pm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { sc: { value: 600 } },
      vertexShader: 'attribute vec4 col;attribute float sz;varying vec4 c;uniform float sc;void main(){c=col;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=sz*sc/max(0.1,-mv.z);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'varying vec4 c;void main(){float d=length(gl_PointCoord-0.5)*2.0;gl_FragColor=vec4(c.rgb,c.a*smoothstep(1.0,0.15,d));}' });
    this.pMat = pm; this.points = new THREE.Points(pg, pm); this.points.frustumCulled = false; S.add(this.points);
    // kupén ritas i en egen scen ovanpå
    this.cock = new THREE.Scene(); this.cock.add(new THREE.HemisphereLight(0xffffff, 0x555555, 0.72)); const cl = new THREE.DirectionalLight(0xffffff, 0.45); cl.position.set(0.5, 1, 0.3); this.cock.add(cl);
    this.cars = [];
  }
  hAt(x, z) { return this.trk.heightAt(x, z); }

  buildTerrain() { const THREE = T(), trk = this.trk, b = trk.bbox, w = this.winter, margin = 620, cell = this.q ? 6 : 9;
    const nx = Math.ceil((b.x1 - b.x0 + 2 * margin) / cell), nz = Math.ceil((b.z1 - b.z0 + 2 * margin) / cell), ox = b.x0 - margin, oz = b.z0 - margin;
    const pos = new Float32Array((nx + 1) * (nz + 1) * 3), col = new Float32Array((nx + 1) * (nz + 1) * 3), uv = new Float32Array((nx + 1) * (nz + 1) * 2), o = {}; let k = 0;
    const grassA = w ? [0.93, 0.95, 0.98] : [0.30, 0.47, 0.20], grassB = w ? [0.86, 0.90, 0.96] : [0.40, 0.52, 0.22], dirt = w ? [0.90, 0.93, 0.97] : [0.50, 0.42, 0.30], rock = w ? [0.62, 0.66, 0.72] : [0.42, 0.44, 0.47], snow = [0.96, 0.97, 1.0];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++, k++) { const x = ox + i * cell, z = oz + j * cell; trk.heightAt(x, z, o);
      const y = o.d < 0 ? o.h - 0.22 : o.h - Math.max(0, 0.22 * (1 - o.d / 3)); pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; uv[k * 2] = x / 18; uv[k * 2 + 1] = z / 18;
      const nz2 = 0.5 + 0.5 * Math.sin(x * 0.045 + Math.sin(z * 0.03) * 2) * Math.sin(z * 0.052 + 1.3); let c = [grassA[0] + (grassB[0] - grassA[0]) * nz2, grassA[1] + (grassB[1] - grassA[1]) * nz2, grassA[2] + (grassB[2] - grassA[2]) * nz2];
      const near = Math.max(0, 1 - o.d / (trk.verge + 3.5)); if (near > 0) c = c.map((v, q) => v + (dirt[q] - v) * Math.min(1, near * 1.4));
      if (o.h > 26) { const t = Math.min(1, (o.h - 26) / 22); c = c.map((v, q) => v + (rock[q] - v) * t); } if (o.h > 58) { const t = Math.min(1, (o.h - 58) / 14); c = c.map((v, q) => v + (snow[q] - v) * t); }
      col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2]; }
    const idx = new Uint32Array(nx * nz * 6); let q = 0; for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, c = a + nx + 1; idx[q++] = a; idx[q++] = c; idx[q++] = a + 1; idx[q++] = a + 1; idx[q++] = c; idx[q++] = c + 1; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, map: noiseTex(11, 0.72, 1.0) })); m.receiveShadow = true; this.scene.add(m); }

  // remsa längs banan mellan två sidoavstånd (funktioner av index)
  strip(i0, i1, la, lb, colf, dy, vScale = 0.12) { const THREE = T(), trk = this.trk, n = trk.n, cnt = i1 - i0 + 1, pos = new Float32Array(cnt * 6), col = new Float32Array(cnt * 6), uv = new Float32Array(cnt * 4), nor = new Float32Array(cnt * 6);
    for (let s = 0; s < cnt; s++) { const i = trk.w(i0 + s), a = la(i0 + s), b = lb(i0 + s), y = trk.Y[i] + dy, c = colf(i0 + s);
      pos.set([trk.X[i] + trk.NX[i] * a, y, trk.Z[i] + trk.NZ[i] * a, trk.X[i] + trk.NX[i] * b, y, trk.Z[i] + trk.NZ[i] * b], s * 6); col.set([c[0], c[1], c[2], c[0], c[1], c[2]], s * 6); uv.set([a * 0.12, s * vScale, b * 0.12, s * vScale], s * 4); nor.set([0, 1, 0, 0, 1, 0], s * 6); }
    const idx = []; for (let s = 0; s < cnt - 1; s++) { const a = s * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setIndex(idx); return g; }

  buildTrack() { const THREE = T(), trk = this.trk, n = trk.n, S = this.scene, w = this.winter;
    const SC = { asfalt: [0.36, 0.37, 0.40], grus: [0.66, 0.54, 0.39], is: [0.80, 0.89, 0.96] };
    const cAt = i => { let r = 0, g = 0, b = 0; for (let q = -2; q <= 2; q++) { const c = SC[trk.surfTypeAt(i + q)] || SC.grus; r += c[0]; g += c[1]; b += c[2]; } return [r / 5, g / 5, b / 5]; };
    const road = new THREE.MeshStandardMaterial({ vertexColors: true, map: noiseTex(5, 0.70, 1.0, true), roughness: w ? 0.35 : 0.93, metalness: 0, side: THREE.DoubleSide });
    const add = (g, mat = road) => { const m = new THREE.Mesh(g, mat); m.receiveShadow = true; S.add(m); return m; };
    add(this.strip(0, n, i => -trk.hwAt(i), i => trk.hwAt(i), cAt, 0.02));
    const j = trk.joker; add(this.strip(j.i1, j.i2, i => trk.bulge(i) - j.w / 2, i => trk.bulge(i) + j.w / 2, i => cAt(i).map(v => v * 1.05), 0.012));
    // kantlinjer på asfalt, röd-vita kerbs i asfaltkurvor
    const flat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    for (const sd of [-1, 1]) { add(this.strip(0, n, i => sd * (trk.hwAt(i) - 0.32), i => sd * trk.hwAt(i), i => trk.surfTypeAt(i) === 'asfalt' ? [0.93, 0.93, 0.90] : cAt(i).map(v => v * 0.82), 0.035), flat);
      add(this.strip(0, n, i => sd * trk.hwAt(i), i => sd * (trk.hwAt(i) + 1.1), i => { const k = trk.K[trk.w(i)] * sd; return trk.surfTypeAt(i) === 'asfalt' && k > 0.012 ? ((i >> 1) & 1 ? [0.85, 0.10, 0.08] : [0.95, 0.95, 0.93]) : (w ? [0.90, 0.93, 0.97] : [0.50, 0.42, 0.30]); }, 0.03), flat); }
    // mållinje
    { const i = trk.finishIdx || 0, hw = trk.hwAt(i), tex = canvasTex(256, 32, (g, W, H) => { for (let a = 0; a < 16; a++) for (let b = 0; b < 2; b++) { g.fillStyle = (a + b) & 1 ? '#f4f4f4' : '#111'; g.fillRect(a * 16, b * 16, 16, 16); } });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, 1.6), new THREE.MeshBasicMaterial({ map: tex })); m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(trk.TZ[i], trk.TX[i]) + Math.PI / 2; m.position.set(trk.X[i], trk.Y[i] + 0.05, trk.Z[i]); S.add(m); }
    // startfålla
    const ch = trk.startChute; if (ch) { const L = Math.hypot(ch.x1 - ch.x0, ch.z1 - ch.z0), wd = ch.w || 14, c = SC[w ? 'is' : (ch.surface || 'asfalt')];
      const m = new THREE.Mesh(new THREE.PlaneGeometry(L + 4, wd), new THREE.MeshStandardMaterial({ color: new THREE.Color(c[0] * 1.05, c[1] * 1.05, c[2] * 1.05), map: noiseTex(5, 0.7, 1, true), roughness: 0.92 }));
      m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(ch.z1 - ch.z0, ch.x1 - ch.x0); m.position.set((ch.x0 + ch.x1) / 2, trk.chuteY + 0.015, (ch.z0 + ch.z1) / 2); m.receiveShadow = true; S.add(m); }
  }

  buildForest() { const THREE = T(), trk = this.trk, b = trk.bbox, rnd = mulberry(hash(trk.id + 'forest')), w = this.winter, o = {}, N = this.q ? 1700 : 550;
    const spruce = [], birch = []; let tries = 0;
    while (spruce.length + birch.length < N && tries++ < N * 12) { const x = b.x0 - 330 + rnd() * (b.x1 - b.x0 + 660), z = b.z0 - 330 + rnd() * (b.z1 - b.z0 + 660); trk.heightAt(x, z, o);
      if (o.d < trk.verge + 7 || o.h > 52) continue; if (Math.sin(x * 0.02) * Math.sin(z * 0.017 + 1) < -0.35 && rnd() < 0.8) continue;      // gläntor
      (rnd() < 0.72 ? spruce : birch).push([x, o.h, z, 0.75 + rnd() * 0.8, rnd() * 6.28]); }
    const inst = (geo, mat, list, f) => { const m = new THREE.InstancedMesh(geo, mat, list.length), d = new THREE.Object3D(); list.forEach((t, i) => { d.position.set(t[0], t[1], t[2]); d.rotation.y = t[4]; f(d, t[3]); d.updateMatrix(); m.setMatrixAt(i, d.matrix); }); m.castShadow = this.q > 0; m.receiveShadow = false; this.scene.add(m); return m; };
    const bark = new THREE.MeshLambertMaterial({ color: 0x4a3524 }), g1 = new THREE.MeshLambertMaterial({ color: w ? 0x4f6f5a : 0x1f4a26 }), g2 = new THREE.MeshLambertMaterial({ color: w ? 0xdfe8ee : 0x2a5c2c }), g3 = new THREE.MeshLambertMaterial({ color: w ? 0xf2f6fa : 0x356b31 });
    const cone = (r, h, y) => { const g = new THREE.ConeGeometry(r, h, 8); g.translate(0, y + h / 2, 0); return g; };
    inst(new THREE.CylinderGeometry(0.16, 0.26, 2.4, 6).translate(0, 1.2, 0), bark, spruce, (d, s) => d.scale.set(s, s, s));
    inst(cone(2.3, 4.6, 1.4), g1, spruce, (d, s) => d.scale.set(s, s * 1.15, s)); inst(cone(1.75, 4.0, 3.9), g2, spruce, (d, s) => d.scale.set(s, s * 1.15, s)); inst(cone(1.1, 3.4, 6.4), g3, spruce, (d, s) => d.scale.set(s, s * 1.15, s));
    inst(new THREE.CylinderGeometry(0.10, 0.16, 5.2, 6).translate(0, 2.6, 0), new THREE.MeshLambertMaterial({ color: 0xe8e6de }), birch, (d, s) => d.scale.set(s, s, s));
    inst(new THREE.IcosahedronGeometry(2.1, 1).translate(0, 6.2, 0), new THREE.MeshLambertMaterial({ color: w ? 0xc9d3da : 0x6f9a3a, flatShading: true }), birch, (d, s) => d.scale.set(s, s * 1.25, s));
  }

  buildProps() { const THREE = T(), trk = this.trk, S = this.scene, n = trk.n, w = this.winter, rnd = mulberry(hash(trk.id + 'props'));
    const lam = c => new THREE.MeshLambertMaterial({ color: c }), box = (x, y, z, sx, sy, sz, mat, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); m.position.set(x, y + sy / 2, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; S.add(m); return m; };
    const edge = (i, sd, extra) => { i = trk.w(i); const l = trk.limits(i), lat = (sd > 0 ? l[1] : l[0]) + sd * extra, x = trk.X[i] + trk.NX[i] * lat, z = trk.Z[i] + trk.NZ[i] * lat; return [x, this.hAt(x, z), z, -Math.atan2(trk.TZ[i], trk.TX[i])]; };
    // målportal: fackverkstorn och banderoll
    { const i = trk.finishIdx || 0, a = edge(i, -1, 1.6), b = edge(i, 1, 1.6), steel = new THREE.MeshStandardMaterial({ color: 0x8a9096, metalness: 0.7, roughness: 0.4 }), top = Math.max(a[1], b[1]) + 6.2;
      for (const p of [a, b]) for (const [ox, oz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) box(p[0] + ox, p[1], p[2] + oz, 0.1, top - p[1], 0.1, steel);
      const L = Math.hypot(b[0] - a[0], b[2] - a[2]), mid = [(a[0] + b[0]) / 2, (a[2] + b[2]) / 2], ry = -Math.atan2(b[2] - a[2], b[0] - a[0]);
      for (const dy of [0, 0.9]) box(mid[0], top - 1 + dy, mid[1], L + 1, 0.1, 0.8, steel, ry);
      const ban = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.86, 1.1), new THREE.MeshBasicMaterial({ map: bannerTex('LÄHTÖ · MAALI', '#12151a', '#ffd400'), side: THREE.DoubleSide })); ban.position.set(mid[0], top - 0.05, mid[1]); ban.rotation.y = ry; S.add(ban); }
    // byggnader ur bandata (torn, kansli, kiosk) med sadeltak
    for (const bd of trk.buildings || []) { const y = this.hAt(bd.x, bd.z), c = new THREE.Color(bd.col[0], bd.col[1], bd.col[2]); box(bd.x, y - 0.3, bd.z, bd.sx, bd.sy + 0.3, bd.sz, lam(c));
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, Math.max(bd.sx, bd.sz) * 0.74, 1.5, 4, 1), lam(w ? 0xe9eef4 : 0x3a3d42)); roof.position.set(bd.x, y + bd.sy + 0.75, bd.z); roof.rotation.y = Math.PI / 4; roof.scale.set(bd.sx >= bd.sz ? 1 : bd.sx / bd.sz, 1, bd.sz > bd.sx ? 1 : bd.sz / bd.sx); roof.castShadow = true; S.add(roof);
      for (let k = 0; k < Math.floor(bd.sx / 3); k++) box(bd.x - bd.sx / 2 + 1.5 + k * 3, y + bd.sy * 0.45, bd.z + bd.sz / 2 + 0.02, 1.3, 1.0, 0.05, new THREE.MeshStandardMaterial({ color: 0x24303c, roughness: 0.2, metalness: 0.6 })); }
    // reklamskyltar längs rakorna
    { const mats = SPONSORS.map((s, k) => new THREE.MeshBasicMaterial({ map: bannerTex(s, ['#ffd400', '#e0352b', '#1f5fb8', '#f4f1e8', '#1b1f1d'][k % 5], ['#111', '#fff', '#fff', '#111', '#ffd400'][k % 5]), side: THREE.DoubleSide })); let last = -99, k = 0;
      for (let i = 0; i < n; i += 4) { if (Math.abs(trk.K[i]) > 0.006 || i - last < 14 || trk.bulge(i)) continue; last = i; const sd = k % 2 ? 1 : -1, p = edge(i, sd, trk.verge + 1.5);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.15), mats[k % mats.length]); m.position.set(p[0], p[1] + 0.75, p[2]); m.rotation.y = p[3]; S.add(m); for (const o of [-3.3, 3.3]) box(p[0] + Math.cos(p[3]) * o, p[1] - 0.2, p[2] - Math.sin(p[3]) * o, 0.08, 1.6, 0.08, lam(0x555555)); k++; } }
    // däckstaplar i ytterkurvor
    { const list = []; for (let i = 0; i < n; i += 2) { const k = trk.K[i]; if (Math.abs(k) < 0.018) continue; const sd = k > 0 ? -1 : 1; if (trk.bulge(i) * sd > 0) continue; list.push(edge(i, sd, trk.verge - 0.3)); }
      const g = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 12), m1 = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0x18181a }), list.length * 3), d = new THREE.Object3D(), col = new THREE.Color();
      list.forEach((p, i) => { for (let s = 0; s < 3; s++) { d.position.set(p[0], p[1] + 0.12 + s * 0.25, p[2]); d.updateMatrix(); m1.setMatrixAt(i * 3 + s, d.matrix); m1.setColorAt(i * 3 + s, col.set(s === 2 && i % 2 ? 0xd8d8d8 : s === 2 ? 0xc2261d : 0x18181a)); } }); m1.castShadow = true; S.add(m1); }
    // koner på ön vid lisälenkkin
    { const j = trk.joker, list = []; for (let i = j.i1 + 2; i < j.i2 - 1; i += 3) { const b = trk.bulge(i), hw = trk.hwAt(i); if (Math.abs(b) < hw + j.w / 2 + 1.5) continue; const lat = (Math.sign(b) * hw + b - Math.sign(b) * j.w / 2) / 2, ii = trk.w(i); list.push([trk.X[ii] + trk.NX[ii] * lat, trk.Y[ii], trk.Z[ii] + trk.NZ[ii] * lat]); }
      const m = new THREE.InstancedMesh(new THREE.ConeGeometry(0.26, 0.75, 10).translate(0, 0.375, 0), new THREE.MeshLambertMaterial({ color: 0xff6a12 }), Math.max(1, list.length)), d = new THREE.Object3D(); list.forEach((p, i) => { d.position.set(p[0], p[1], p[2]); d.updateMatrix(); m.setMatrixAt(i, d.matrix); }); m.count = list.length; m.castShadow = true; S.add(m); }
    // flaggposter
    const posts = (trk.posts && trk.posts.length ? trk.posts.map(p => [p.x, p.z]) : [...Array(7)].map((_, q) => { const p = edge(Math.round((q + 0.5) * n / 7), 1, trk.verge + 4); return [p[0], p[2]]; }));
    for (const [x, z] of posts) { const o = {}; trk.heightAt(x, z, o); if (o.d < 1.5) continue; box(x, o.h, z, 1.8, 0.25, 1.8, lam(0x6b5a45)); box(x, o.h + 0.25, z, 1.6, 1.0, 1.6, lam(0xf0b415)); box(x + 0.7, o.h + 1.25, z + 0.7, 0.06, 1.9, 0.06, lam(0x333333)); box(x + 1.0, o.h + 2.6, z + 0.7, 0.6, 0.45, 0.03, lam(0xffe100)); }
    // depå: tält, släp och servicebilar utanför startområdet
    { const i0 = trk.finishIdx || 0, sd = -trk.outSign || 1, tent = [0xd92b20, 0x1f5fb8, 0xf4f1e8, 0xffd400, 0x1e8a4a], o = {};
      for (let k = 0; k < (this.q ? 16 : 7); k++) { const p = edge(i0 - 40 + k * 7, sd, trk.verge + 16 + (k % 3) * 9 + rnd() * 4); trk.heightAt(p[0], p[2], o); if (o.d < trk.verge + 8) continue;
        if (k % 3 === 0) { box(p[0], o.h, p[2], 4.6, 1.9, 2.0, new THREE.MeshStandardMaterial({ color: [0xe9e9e6, 0x2b3038, 0x9a1f1a][k % 3 === 0 ? (k / 3 | 0) % 3 : 0], metalness: 0.4, roughness: 0.5 }), p[3]); box(p[0], o.h + 1.2, p[2], 4.62, 0.55, 1.7, new THREE.MeshStandardMaterial({ color: 0x1a222b, roughness: 0.15, metalness: 0.7 }), p[3]); }
        else { for (const [ox, oz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) box(p[0] + ox, o.h, p[2] + oz, 0.07, 2.2, 0.07, lam(0xcccccc)); const r = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.1, 4), lam(tent[k % 5])); r.position.set(p[0], o.h + 2.75, p[2]); r.rotation.y = Math.PI / 4; r.castShadow = true; S.add(r); } } }
    // STOP-skylt efter mål
    { const p = edge((trk.finishIdx || 0) + 70, 1, 1.2); box(p[0], p[1], p[2], 0.08, 2.1, 0.08, lam(0x555555)); const s = new THREE.Mesh(new THREE.CircleGeometry(0.5, 8), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g) => { g.fillStyle = '#c8201a'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#fff'; g.font = '900 44px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('STOP', 64, 66); }), side: THREE.DoubleSide })); s.position.set(p[0], p[1] + 2.3, p[2]); s.rotation.y = p[3] + Math.PI / 2; S.add(s); }
  }
  buildClouds() { const THREE = T(), rnd = mulberry(77), m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.86, fog: false }), g = new THREE.SphereGeometry(1, 10, 8);
    for (let k = 0; k < 16; k++) { const a = rnd() * 6.28, r = 700 + rnd() * 1400, grp = new THREE.Group(); for (let q = 0; q < 5; q++) { const s = new THREE.Mesh(g, m); s.position.set((rnd() - 0.5) * 130, (rnd() - 0.5) * 14, (rnd() - 0.5) * 60); s.scale.set(50 + rnd() * 55, 14 + rnd() * 12, 34 + rnd() * 34); grp.add(s); } grp.position.set(Math.cos(a) * r, 330 + rnd() * 260, Math.sin(a) * r); this.scene.add(grp); } }

  // ---------- bilar ----------
  addCar(body, paint, opt = {}) { const THREE = T(), G = new THREE.Group(), st = carStyle(opt.model, body), L = st.L, W = st.W, h = L / 2;
    const col = new THREE.Color(paint[0], paint[1], paint[2]);
    const pm = new THREE.MeshStandardMaterial({ color: col, metalness: 0.35, roughness: 0.42 }), dark = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.85 }), glass = new THREE.MeshStandardMaterial({ color: 0x1a2530, roughness: 0.08, metalness: 0.85, side: THREE.DoubleSide }), steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.8, roughness: 0.3 });
    const lamp = new THREE.MeshStandardMaterial({ color: 0xf2f0e4, emissive: 0x3a3628, roughness: 0.2, metalness: 0.3 }), amber = new THREE.MeshStandardMaterial({ color: 0xe8901c, emissive: 0x3a2008, roughness: 0.3 });
    const tail = new THREE.MeshBasicMaterial({ color: 0x8a0f0a }); G.userData.brake = tail;
    const ext = (pts, width, mat, bevel = 0.11) => { const s = roundShape(pts, st.round); const g = new THREE.ExtrudeGeometry(s, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: 8 }); g.translate(0, 0, -width / 2 + bevel); const m = new THREE.Mesh(g, mat); m.castShadow = true; G.add(m); return m; };
    const box = (x, y, z, sx, sy, sz, m, ry = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); b.rotation.y = ry; G.add(b); return b; };
    const disc = (x, y, z, r, m) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 18), m); c.rotation.z = Math.PI / 2; c.position.set(x, y, z); G.add(c); return c; };
    // ---- kaross: framparti efter modellens stil (rak "låda" eller sluttande kil), bakparti efter karosstyp
    const nb = st.nose === 'box', fx = h, belt = st.belt;
    const front = nb ? [[fx - 0.02, 0.36], [fx + 0.02, 0.62], [fx, belt - 0.06], [fx - 0.12, belt]]
      : st.nose === 'shark' ? [[fx - 0.04, 0.36], [fx + 0.02, 0.5], [fx + 0.03, 0.66], [fx - 0.22, belt - 0.03], [fx - 0.7, belt]]
      : [[fx - 0.04, 0.34], [fx + 0.01, 0.52], [fx - 0.12, 0.70], [fx - 0.75, belt - 0.03], [fx - 1.15, belt]];
    const rear = st.tailT === 'notch' ? [[-h + 0.35, belt + 0.03], [-h + 0.02, belt], [-h, 0.62], [-h + 0.04, 0.36]] : [[-h + 0.1, belt + 0.02], [-h, belt - 0.05], [-h - 0.01, 0.62], [-h + 0.04, 0.36]];
    ext([[-h + 0.06, 0.32], ...rear.slice().reverse(), ...front.slice().reverse(), [h - 0.06, 0.32]], W, pm);
    // växthus: vindrutans lutning och taklinje efter stil
    const top = st.H, aB = h - st.hood, aT = aB - st.rake;
    const rT = st.tailT === 'notch' ? -h + st.deck + 0.42 : st.tailT === 'hatch' ? -h + 0.45 : -h + 0.12, rB = st.tailT === 'notch' ? -h + st.deck : st.tailT === 'hatch' ? -h + 0.12 : -h + 0.04;
    ext([[rB, belt - 0.02], [rT, top], [aT, top + 0.01], [aB, belt - 0.02]], W - 0.2, pm, 0.09);
    const win = (pts, z) => { const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); const m = new THREE.Mesh(new THREE.ShapeGeometry(s), glass); m.position.z = z; G.add(m); };
    const bx = (aT + rT) / 2 - 0.05 + (st.tailT === 'wagon' ? -0.25 : 0), zs = (W - 0.2) / 2 + 0.006, wb0 = belt + 0.03, wt = top - 0.07;
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
    const tx = -h - 0.012 - BV, ty = st.tailT === 'notch' ? belt - 0.1 : 0.72;
    for (const sd of [1, -1]) {
      if (st.tails === 'vertical') { box(tx + 0.02, 0.95, sd * (W / 2 - 0.12), 0.05, 0.62, 0.14, tail); }
      else if (st.tails === 'round') { disc(tx, ty, sd * (W / 2 - 0.25), 0.07, tail); disc(tx, ty, sd * (W / 2 - 0.45), 0.07, tail); }
      else box(tx, ty, sd * (W / 2 - 0.3), 0.03, st.tails === 'tall' ? 0.2 : 0.13, 0.42, tail);
    }
    if (st.wing) { box(-h + 0.35, top - 0.12, 0, 0.32, 0.03, W - 0.2, pm); for (const sd of [1, -1]) box(-h + 0.38, top - 0.22, sd * (W / 2 - 0.2), 0.12, 0.2, 0.04, pm); box(-h + 0.22, belt + 0.12, 0, 0.26, 0.025, W - 0.25, pm); }
    if (st.rails) for (const sd of [1, -1]) box((aT + rT) / 2 - 0.1, top + 0.05, sd * (W / 2 - 0.28), Math.abs(aT - rT) * 0.8, 0.035, 0.035, dark);
    G.userData.style = st;
    // tävlingsnummer på bakre sidorutan
    if (opt.num) { const bw = opt.bw === 'bw', tex = canvasTex(128, 64, (g) => { g.fillStyle = bw ? '#111' : '#f6f4ec'; g.fillRect(0, 0, 128, 64); g.fillStyle = bw ? '#f6f4ec' : '#111'; g.font = '900 50px Impact, "Arial Narrow", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(opt.num), 64, 34, 118); });
      for (const z of [zs + 0.004, -zs - 0.004]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.3), new THREE.MeshBasicMaterial({ map: tex })); m.position.set((bx + rT) / 2 - 0.02, 1.14, z); if (z < 0) m.rotation.y = Math.PI; G.add(m); } }
    { const net = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.36), netMat()); net.position.set((aB - 0.16 + bx + 0.06) / 2 - 0.02, 1.13, -zs - 0.012); net.rotation.y = Math.PI; G.add(net); }
    // hjul, hjulhus, stötfångare, bromsljus
    const wb = L * 0.6, wheels = []; G.userData.wheels = wheels;
    for (const x of [wb / 2, -wb / 2]) for (const z of [W / 2 - 0.1, -W / 2 + 0.1]) { const piv = new THREE.Group(); piv.position.set(x, 0.31, z); const wh = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.21, 18), dark); t.rotation.x = Math.PI / 2; t.castShadow = true; wh.add(t);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.22, 10), steel); rim.rotation.x = Math.PI / 2; wh.add(rim); for (let s = 0; s < 4; s++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.225), dark); sp.rotation.z = s * Math.PI / 4; wh.add(sp); }
      piv.add(wh); G.add(piv); wheels.push({ piv, wh, front: x > 0 }); const arch = new THREE.Mesh(new THREE.CircleGeometry(0.39, 16, 0, Math.PI), dark); arch.position.set(x, 0.33, z > 0 ? W / 2 + 0.004 : -W / 2 - 0.004); if (z < 0) arch.rotation.y = Math.PI; G.add(arch); }
    const bm = opt.bars ? steel : dark; for (const [x, s] of [[h + 0.02, 1], [-h - 0.02, -1]]) { const br = st.bigBumper ? 0.13 : 0.1; const b = new THREE.Mesh(new THREE.CylinderGeometry(br, br, W - 0.16, 14), st.bigBumper && !opt.bars ? dark : bm); b.rotation.x = Math.PI / 2; b.scale.set(0.85, 1, 1); b.position.set(x + Math.sign(x) * (st.bigBumper ? 0.06 : 0), 0.42, 0); G.add(b);
      for (const z of [(W - 0.16) / 2, -(W - 0.16) / 2]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), bm); e.scale.set(0.85, 1, 1); e.position.set(x, 0.42, z); G.add(e); } }
    if (opt.mirrors) for (const z of [W / 2 + 0.08, -W / 2 - 0.08]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.16), dark); m.position.set(aB - 0.1, 0.99, z); G.add(m); }
    this.scene.add(G); this.cars.push(G); return G; }
  // Synliga skador: bucklar in lackerade delar (deterministiskt per bil) och gör lacken mattare/repig
  damageCar(G, dmg) {
    const lvl = Math.round(dmg / 5) * 5; if (G.userData.dl === lvl) return; G.userData.dl = lvl;
    const seed = G.userData.seed ??= Math.random() * 100, k = lvl / 100;
    G.traverse(m => {
      if (!m.isMesh || !m.material || m.material.metalness !== 0.35) return; // lackerade delar
      const pos = m.geometry.attributes.position; if (!m.userData.orig) m.userData.orig = pos.array.slice();
      const o = m.userData.orig, a = pos.array;
      for (let i = 0; i < a.length; i += 3) {
        const x = o[i], y = o[i + 1], z = o[i + 2], n = Math.sin(x * 3.1 + seed) * Math.cos(z * 2.7 + seed * 1.7) * Math.sin(y * 4.3 + seed * 0.3);
        const d = Math.max(0, n) * 0.16 * k;
        a[i] = x - Math.sign(x) * d * 0.6; a[i + 1] = y - d * 0.5; a[i + 2] = z - Math.sign(z) * d;
      }
      pos.needsUpdate = true; m.geometry.computeVertexNormals();
      if (!m.userData.c0) m.userData.c0 = m.material.color.clone();
      m.material.color.copy(m.userData.c0).lerp(new (T().Color)(0.35, 0.33, 0.3), k * 0.35); m.material.roughness = 0.42 + k * 0.45; m.material.metalness = 0.35; // behåll markören
    });
  }
  poseCar(G, x, y, z, hdg, roll, pitch, steer, spin, braking, visible) { G.visible = visible; if (!visible) return; G.position.set(x, y, z); G.rotation.order = 'YZX'; G.rotation.set(-roll, -hdg, pitch);
    for (const w of G.userData.wheels) { w.wh.rotation.z = -spin; if (w.front) w.piv.rotation.y = -steer * 0.45; } G.userData.brake.color.setHex(braking ? 0xff2a1a : 0x8a0f0a); }

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
    this.cock.add(body); this.cock.add(helm); }

  resize() { const r = this.canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, target = { '540': 540, '720': 720, '1080': 1080, '1440': 1440 }[this.res];
    const ratio = target ? Math.min(3, Math.max(0.3, target / Math.max(1, r.height))) : Math.min(dpr, this.q ? 2 : 1.25);
    this.r.setPixelRatio(ratio); this.r.setSize(r.width, r.height, false); this.cam.aspect = r.width / Math.max(1, r.height); this.pxH = r.height * ratio; }

  frame(o) { if (!this.ok) return; const THREE = T(), cam = this.cam, R = this.r;
    cam.fov = o.fov * 180 / Math.PI; cam.updateProjectionMatrix(); cam.position.set(o.eye[0], o.eye[1], o.eye[2]); cam.up.set(o.up[0], o.up[1], o.up[2]); cam.lookAt(o.at[0], o.at[1], o.at[2]);
    this.sky.position.copy(cam.position);
    if (this.precip) { const a = this.precip.geometry.attributes.position, d = Math.min(0.05, (performance.now() - (this.pT || performance.now())) / 1000); this.pT = performance.now();
      for (let i = 0; i < a.count; i++) { let y = a.array[i * 3 + 1] - this.precipV * d; if (y < -30) y += 60; a.array[i * 3 + 1] = y; } a.needsUpdate = true; this.precip.position.copy(cam.position); }
    const f = o.focus; this.sun.target.position.set(f[0], f[1], f[2]); this.sun.position.set(f[0] + this.sunDir.x * 180, f[1] + this.sunDir.y * 180, f[2] + this.sunDir.z * 180);
    // damm
    const pl = o.particles || [], pa = this.pGeo.attributes, N = Math.min(pl.length, 260);
    for (let i = 0; i < N; i++) { const q = pl[i], d = q.d || o.dust; pa.position.setXYZ(i, q.x, q.y, q.z); pa.col.setXYZW(i, d[0], d[1], d[2], 0.55 * (1 - q.life / q.max)); pa.sz.setX(i, q.s * 2.2); }
    pa.position.needsUpdate = pa.col.needsUpdate = pa.sz.needsUpdate = true; this.pGeo.setDrawRange(0, N); this.pMat.uniforms.sc.value = (this.pxH || 800) / (2 * Math.tan(o.fov / 2));
    R.clear(); R.render(this.scene, cam);
    if (o.cockpit && this.cockParts) { o.cockpit.forEach((m, i) => { if (this.cockParts[i]) { this.cockParts[i].visible = !!m; if (m) this.cockParts[i].matrix.fromArray(m); } });
      const base = o.cockpit[0] || o.cockpit[3]; if (this.cockX) { this.cockX.visible = !!base; if (base) this.cockX.matrix.fromArray(base); this.cockH.visible = !!o.cockpit[0]; if (o.cockpit[0]) this.cockH.matrix.fromArray(o.cockpit[0]); } R.clearDepth(); R.render(this.cock, cam); }
  }
  dispose() { try { this.r.dispose(); this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } catch (e) { } }
}
