// Stadskörning: fri körning i en låg-poly-stad (assets/city/city.glb) med utmaningar som ger pengar.
// Samma bilfysik som på banorna (phys i race.js) och samma bilmodeller (View3.addCar + GLB-modeller).
// Kollisioner mot hus räknas från stadens geometri: allt som är högre än en trottoarkant blir ett hinder i ett rutnät.
import { makeCar, phys } from './race.js';
import { SURF } from './data.js';
import { fmt } from './engine.js';
import { View3 } from './view3.js';
import { Controls } from './input.js';
import { applyVehicleModel, poseModelWheels } from '../graphics/assets/ModelLoader.js';

const T = () => window.THREE;
const BASE = new URL('../', import.meta.url).href;
const SC = 18, SY = 11;          // stadsmodellens enheter → meter (vågrätt / lodrätt; trottoarkanterna blir ca 0,5 m)
const CELL = 0.5;                // kollisionsrutnätets cellstorlek (m)
const DT = 1 / 240, BLOCK_H = 1.0; // fysiksteg, höjd (m) där något räknas som hinder
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];

// Utmaningarnas typer: färg, ikon och namn
const KIND = {
  race: { col: 0xffd23f, ico: '🏁', name: 'Stadsrace' },
  speed: { col: 0xff5a5a, ico: '📸', name: 'Fartkamera' },
  drift: { col: 0x7cf0ff, ico: '🌀', name: 'Driftzon' },
  deliver: { col: 0x8cff7a, ico: '📦', name: 'Leverans' },
};

function loadGltf() {
  return new Promise((res, rej) => { if (T().GLTFLoader) return res(new (T().GLTFLoader)());
    const s = document.createElement('script'); s.src = BASE + 'js/vendor/three-examples/GLTFLoader.js'; s.onload = () => res(new (T().GLTFLoader)()); s.onerror = rej; document.head.appendChild(s); });
}

export class City {
  // cfg: { spec, name, paint, bw, num, model, body, aids, settings, traffic: [modellid…], onExit(sum), onEarn(€, text), onEvent(typ) }
  constructor(host, cfg) {
    this.host = host; this.cfg = cfg; this.earned = 0; this.done = 0; this.t = 0; this.dead = false; this.paused = false; this.touch = {}; this.cam = 0;
    host.innerHTML = `<div class="city">
      <canvas class="city-cv"></canvas>
      <div class="c-top"><div class="c-money"><span>I STAN I DAG</span><b id="cEarn">0 €</b><small id="cDone">0 utmaningar</small></div>
        <div class="c-task" id="cTask" hidden></div>
        <div class="c-btns"><button id="cCam">🎥 Kamera [C]</button><button id="cPause">☰ Paus [P]</button></div></div>
      <div class="c-msg" id="cMsg"></div><div class="c-arrow" id="cArrow" hidden>➤</div>
      <canvas class="c-map" id="cMap" width="180" height="180"></canvas>
      <div class="c-speed"><b id="cKmh">0</b><span>km/h</span><small id="cGear">1</small><i id="cDmg">Skador 0 %</i></div>
      <div class="c-load" id="cLoad">Laddar staden…</div>
      <div class="touch" id="cTouch"><div class="t-l"><button data-k="left">◀</button><button data-k="right">▶</button></div>
        <div class="t-r"><button data-k="hb" class="t-s">HAND</button><button data-k="brk" class="t-b">BROMS</button><button data-k="gas" class="t-g">GAS</button></div></div>
      <div class="pause" id="cPauseBox" hidden><div><h2>Stadskörning</h2><p id="cSum"></p><button class="btn" id="cResume">Fortsätt köra</button><button class="btn ghost" id="cReset">Ställ bilen på vägen (R)</button><button class="btn ghost danger" id="cQuit">Avsluta och åk hem</button></div></div>
    </div>`;
    this.$ = id => host.querySelector('#' + id);
    this.cv = host.querySelector('.city-cv');
    if (!matchMedia('(pointer: coarse)').matches && cfg.settings?.touch !== 'on') this.$('cTouch').style.display = 'none';
    this.bind();
    this.init().catch(e => { console.error(e); this.$('cLoad').textContent = 'Staden kunde inte laddas: ' + e.message; });
  }

  // ---------- uppstart ----------
  async init() {
    const THREE = T(); this.ok = true;
    const R = this.R = new THREE.WebGLRenderer({ canvas: this.cv, antialias: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); R.outputEncoding = THREE.sRGBEncoding; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    const S = this.scene = new THREE.Scene(); S.background = new THREE.Color(0x9cc9ee); S.fog = new THREE.Fog(0x9cc9ee, 120, 420);
    S.add(new THREE.HemisphereLight(0xdfefff, 0x4a5a3a, 0.85));
    const sun = this.sun = new THREE.DirectionalLight(0xfff2dd, 1.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 200 }); sun.shadow.bias = -0.0006; S.add(sun, sun.target);
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
    this.resize();
    // staden
    const g = await (await loadGltf()).loadAsync(BASE + 'assets/city/city.glb');
    const city = g.scene; city.scale.set(SC, SY, SC);
    city.traverse(m => { if (!m.isMesh) return; m.receiveShadow = true; m.castShadow = true; const mt = m.material; if (mt) { mt.side = THREE.FrontSide; if (mt.map) mt.map.anisotropy = 4; } });
    S.add(city); city.updateMatrixWorld(true); this.city = city;
    this.buildGrid(city);
    // gräs runt staden så att den inte svävar i luften
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshLambertMaterial({ color: 0x6f8f4e })); ground.rotation.x = -Math.PI / 2; ground.position.y = this.gy0 - 0.08; ground.receiveShadow = true; S.add(ground);
    // spelarens bil
    const trk = this.trk = { surf: SURF.asfalt, surface: 'asfalt', n: 1, hw: 6, w: () => 0, point: () => [0, 0, 0] };
    const c = this.player = makeCar({ name: this.cfg.name, paint: this.cfg.paint, spec: this.cfg.spec, aids: this.cfg.aids || { abs: 1, tc: 1, auto: 1 } }, trk, 0, true, 1, 1);
    const sp = this.spawnPoint(); Object.assign(c, { x: sp[0], z: sp[1], h: sp[2], vx: 0, vy: 0, r: 0, onSurf: true }); c.y = this.heightAt(c.x, c.z);
    const holder = { scene: S, cars: [] };
    c.obj = View3.prototype.addCar.call(holder, this.cfg.body || 'sedan', this.cfg.paint, { model: this.cfg.model, num: this.cfg.num, bw: this.cfg.bw, bars: true, mirrors: false });
    c.obj.traverse(m => { if (m.isMesh) m.castShadow = true; });
    applyVehicleModel(c.obj, this.cfg.model, this.cfg.paint).then(ok => { if (ok) c.obj.traverse(m => { if (m.isMesh) m.castShadow = true; }); }).catch(() => { });
    this.camH = c.h; this.camPos = null;
    // trafik och utmaningar
    this.initTraffic(holder);
    this.tasks = []; for (const k of ['race', 'speed', 'drift', 'deliver', 'speed', 'race']) this.addTask(k);
    this.drawMapBase();
    this.$('cLoad').remove();
    this.msg('Välkommen till stan! Kör in i de färgade pelarna för att starta utmaningar 💰', 4);
    this.audioInit();
    this.last = performance.now(); this.raf = requestAnimationFrame(t => this.frame(t));
  }

  // Kollisions- och höjdrutnät ur stadens trianglar (i meter, efter skalning)
  buildGrid(city) {
    const THREE = T(), box = new THREE.Box3().setFromObject(city);
    this.x0 = box.min.x; this.z0 = box.min.z; this.nx = Math.ceil((box.max.x - box.min.x) / CELL) + 1; this.nz = Math.ceil((box.max.z - box.min.z) / CELL) + 1;
    const N = this.nx * this.nz; this.block = new Uint8Array(N); this.hgt = new Float32Array(N).fill(-1e9);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nrm = new THREE.Vector3();
    let gMin = 1e9;
    city.traverse(m => {
      if (!m.isMesh) return; const pos = m.geometry.attributes.position, idx = m.geometry.index, n = idx ? idx.count : pos.count, M = m.matrixWorld;
      for (let i = 0; i < n; i += 3) {
        const ia = idx ? idx.getX(i) : i, ib = idx ? idx.getX(i + 1) : i + 1, ic = idx ? idx.getX(i + 2) : i + 2;
        a.fromBufferAttribute(pos, ia).applyMatrix4(M); b.fromBufferAttribute(pos, ib).applyMatrix4(M); c.fromBufferAttribute(pos, ic).applyMatrix4(M);
        const ymax = Math.max(a.y, b.y, c.y);
        const x0 = Math.floor((Math.min(a.x, b.x, c.x) - this.x0) / CELL), x1 = Math.floor((Math.max(a.x, b.x, c.x) - this.x0) / CELL);
        const z0 = Math.floor((Math.min(a.z, b.z, c.z) - this.z0) / CELL), z1 = Math.floor((Math.max(a.z, b.z, c.z) - this.z0) / CELL);
        if (ymax > BLOCK_H) { // väggar och tak: markera fotavtrycket (stora snedställda trianglar rastreras grovt via sina hörn och mitt)
          if ((x1 - x0) * (z1 - z0) > 400) { for (const p of [a, b, c, a.clone().add(b).add(c).divideScalar(3)]) { const ci = this.cellAt(p.x, p.z); if (ci >= 0) this.block[ci] = 1; } continue; }
          for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (x >= 0 && z >= 0 && x < this.nx && z < this.nz) this.block[z * this.nx + x] = 1;
          continue;
        }
        e1.subVectors(b, a); e2.subVectors(c, a); nrm.crossVectors(e1, e2).normalize(); if (Math.abs(nrm.y) < 0.7) continue; // bara (nästan) vågräta ytor är mark
        gMin = Math.min(gMin, ymax);
        for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (x >= 0 && z >= 0 && x < this.nx && z < this.nz) { const k = z * this.nx + x; if (ymax > this.hgt[k]) this.hgt[k] = ymax; }
      }
    });
    this.gy0 = gMin === 1e9 ? 0 : gMin;
    for (let k = 0; k < N; k++) if (this.hgt[k] < -1e8) this.hgt[k] = this.gy0;
    // vägar = celler på vägbanans höjd (lägre än trottoaren, högre än gräsmattan runt kvarteren)
    const hs = [...this.hgt].sort((p, q) => p - q), mode = (lo, hi) => { let best = 0, at = 0; for (let y = lo; y < hi; y += 0.04) { const n = hs.filter(v => v >= y && v < y + 0.04).length; if (n > best) { best = n; at = y; } } return at + 0.02; };
    this.roadY = mode(this.gy0 + 0.05, this.gy0 + 0.4); // vägbanan ligger strax ovanför marken i modellen
    this.road = new Uint8Array(N); this.roadCells = [];
    for (let k = 0; k < N; k++) if (!this.block[k] && this.hgt[k] > this.gy0 + 0.06 && this.hgt[k] < this.gy0 + 0.4) this.road[k] = 1; // vägbanan (med sina olika nivåer) ligger mellan marken och trottoaren
    // tunna bort enstaka celler: en vägcell ska ha väg runt sig (minst 2 m åt alla håll) för att räknas som körbana
    const R2 = 4, okRoad = k => { const x = k % this.nx, z = (k - x) / this.nx; for (let dx = -R2; dx <= R2; dx += 2) for (let dz = -R2; dz <= R2; dz += 2) { const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= this.nx || zz >= this.nz || !this.road[zz * this.nx + xx]) return false; } return true; };
    for (let k = 0; k < N; k++) if (this.road[k] && okRoad(k)) this.roadCells.push(k);
    this.bounds = [box.min.x + 1, box.max.x - 1, box.min.z + 1, box.max.z - 1];
    // vägarnas mittlinjer (för trafiken): rader/kolumner med långa sammanhängande vägsträckor
    this.lines = this.findLines();
  }
  cellAt(x, z) { const cx = Math.floor((x - this.x0) / CELL), cz = Math.floor((z - this.z0) / CELL); return cx < 0 || cz < 0 || cx >= this.nx || cz >= this.nz ? -1 : cz * this.nx + cx; }
  blocked(x, z) { if (x < this.bounds[0] || x > this.bounds[1] || z < this.bounds[2] || z > this.bounds[3]) return true; const k = this.cellAt(x, z); return k < 0 || this.block[k] === 1; }
  heightAt(x, z) { const k = this.cellAt(x, z); return k < 0 ? this.gy0 : this.hgt[k]; }
  cellXZ(k) { const x = k % this.nx, z = (k - x) / this.nx; return [this.x0 + (x + 0.5) * CELL, this.z0 + (z + 0.5) * CELL]; }
  findLines() {
    const L = []; const runs = (axis) => { // axis 'x': linjer längs x (konstant z)
      const A = axis === 'x' ? this.nz : this.nx, B = axis === 'x' ? this.nx : this.nz, score = new Float32Array(A);
      for (let a = 0; a < A; a++) { let cnt = 0; for (let b = 0; b < B; b++) { const k = axis === 'x' ? a * this.nx + b : b * this.nx + a; if (this.road[k]) cnt++; } score[a] = cnt; }
      const thr = B * 0.45;
      for (let a = 1; a < A - 1; a++) if (score[a] > thr) { let s = a; while (a < A - 1 && score[a + 1] > thr) a++; const mid = Math.round((s + a) / 2), w = (a - s + 1) * CELL; if (w < 5) continue;
        let b0 = -1, b1 = -1; for (let b = 0; b < B; b++) { const k = axis === 'x' ? mid * this.nx + b : b * this.nx + mid; if (this.road[k]) { if (b0 < 0) b0 = b; b1 = b; } }
        const c = (axis === 'x' ? this.z0 : this.x0) + (mid + 0.5) * CELL, lo = (axis === 'x' ? this.x0 : this.z0) + (b0 + 0.5) * CELL, hi = (axis === 'x' ? this.x0 : this.z0) + (b1 + 0.5) * CELL;
        L.push({ axis, c, lo: lo + 3, hi: hi - 3, w }); }
    };
    runs('x'); runs('z'); return L;
  }
  spawnPoint() {
    const cx = (this.bounds[0] + this.bounds[1]) / 2, cz = (this.bounds[2] + this.bounds[3]) / 2;
    let best = null, bd = 1e18; for (const k of this.roadCells) { const [x, z] = this.cellXZ(k), d = (x - cx) ** 2 + (z - cz) ** 2; if (d < bd) { bd = d; best = [x, z]; } }
    const line = this.lines.find(l => l.axis === 'x') || this.lines[0];
    if (!best) return [cx, cz, 0];
    return [best[0], best[1], line?.axis === 'z' ? Math.PI / 2 : 0];
  }
  // närmaste vägpunkt (för "ställ bilen på vägen")
  nearestRoad(x, z) { let best = null, bd = 1e18; for (const k of this.roadCells) { const [px, pz] = this.cellXZ(k), d = (px - x) ** 2 + (pz - z) ** 2; if (d < bd) { bd = d; best = [px, pz]; } } return best || [x, z]; }
  randomRoad(fromX, fromZ, dMin = 0, dMax = 1e9) {
    for (let tries = 0; tries < 400; tries++) { const [x, z] = this.cellXZ(pick(this.roadCells)), d = fromX == null ? dMin : Math.hypot(x - fromX, z - fromZ);
      if (d >= dMin && d <= dMax && !this.tasks?.some(t => t.at && Math.hypot(t.at[0] - x, t.at[1] - z) < 25)) return [x, z]; }
    return this.cellXZ(pick(this.roadCells));
  }

  // ---------- trafik: bilar som kör längs vägarnas mittlinjer på höger sida ----------
  initTraffic(holder) {
    this.traffic = []; const models = this.cfg.traffic || [], THREE = T();
    const n = Math.min(10, Math.max(0, this.lines.length * 1));
    for (let i = 0; i < n; i++) {
      const L = this.lines[i % this.lines.length], dir = Math.random() < 0.5 ? 1 : -1, P = this.player; let s = rnd(L.lo, L.hi);
      for (let k = 0; k < 20; k++) { const x = L.axis === 'x' ? s : L.c, z = L.axis === 'z' ? s : L.c; if (!P || Math.hypot(x - P.x, z - P.z) > 40) break; s = rnd(L.lo, L.hi); } // inte för nära spelaren
      const paint = [rnd(0.1, 0.95), rnd(0.1, 0.95), rnd(0.1, 0.95)], model = models.length ? models[i % models.length] : 'mazda626';
      const G = View3.prototype.addCar.call(holder, 'sedan', paint, { model, num: String(100 + i), bw: 'wb', bars: false, mirrors: false });
      G.traverse(m => { if (m.isMesh) m.castShadow = true; }); applyVehicleModel(G, model, paint).catch(() => { });
      const x = L.axis === 'x' ? s : L.c - 2.6 * dir, z = L.axis === 'z' ? s : L.c + 2.6 * dir;
      this.traffic.push({ G, L, s, dir, v: rnd(8, 12.5), vt: 0, wait: 0, spin: 0, x, z, h: L.axis === 'x' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2) });
    }
  }
  stepTraffic(dt) {
    const p = this.player;
    for (const c of this.traffic) {
      const L = c.L, lane = 2.6 * c.dir; // höger körfält
      // stanna för spelaren om den står framför
      const fx = L.axis === 'x' ? c.dir : 0, fz = L.axis === 'z' ? c.dir : 0, dx = p.x - c.x, dz = p.z - c.z, ahead = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
      const want = c.wait > 0 ? 0 : ahead > 0 && ahead < 14 && side < 3 ? 0 : c.v; c.wait = Math.max(0, c.wait - dt);
      c.vt += clamp(want - c.vt, -9 * dt, 3 * dt); c.s += c.vt * c.dir * dt;
      if (c.s > L.hi || c.s < L.lo) { // vägens slut: sväng in på en korsande väg eller vänd
        const cross = this.lines.filter(o => o.axis !== L.axis && Math.abs(o.c - c.s) < 8);
        if (cross.length && Math.random() < 0.85) { const o = pick(cross); const at = L.c; c.L = o; c.dir = (at - o.lo) > (o.hi - at) ? -1 : 1; c.s = clamp(at, o.lo, o.hi); }
        else { c.dir *= -1; c.s = clamp(c.s, L.lo, L.hi); }
      } else if (Math.random() < dt * 0.25) { // ibland: sväng i en korsning
        const cross = this.lines.filter(o => o.axis !== L.axis && Math.abs(o.c - c.s) < 1.5 && o.c > L.lo && o.c < L.hi);
        if (cross.length) { const o = pick(cross), at = L.c; if (at > o.lo + 10 && at < o.hi - 10) { c.L = o; c.dir = Math.random() < 0.5 ? 1 : -1; c.s = at; } }
      }
      const tx = c.L.axis === 'x' ? c.s : c.L.c + 2.6 * (c.L.axis === 'z' ? -c.dir : 0), tz = c.L.axis === 'z' ? c.s : c.L.c + 2.6 * c.dir;
      const nh = c.L.axis === 'x' ? (c.dir > 0 ? 0 : Math.PI) : (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      c.x += (tx - c.x) * Math.min(1, dt * 4); c.z += (tz - c.z) * Math.min(1, dt * 4); c.h += wrapA(nh - c.h) * Math.min(1, dt * 3);
      c.spin += c.vt * dt / 0.31;
      View3.prototype.poseCar.call(this.vctx ||= { _t: 0 }, c.G, c.x, this.heightAt(c.x, c.z), c.z, c.h, 0, 0, 0, c.spin, c.vt < 1 && want === 0, true);
      if (c.G.userData.glbWheels) poseModelWheels(c.G.userData, 0, c.spin);
    }
  }

  // ---------- utmaningar ----------
  addTask(kind) {
    const THREE = T(), K = KIND[kind], at = this.randomRoad(this.player?.x, this.player?.z, 40, 1e9);
    const t = { kind, at, state: 'idle' };
    if (kind === 'speed') t.target = pick([70, 80, 90, 100, 110, 120]);
    const g = new THREE.Group(), col = new THREE.Color(K.col);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 14, 24, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
    pillar.position.y = 7; g.add(pillar);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.12, 8, 40), new THREE.MeshBasicMaterial({ color: col })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.15; g.add(ring);
    g.add(this.label(`${K.ico} ${K.name}${t.target ? ` · ${t.target} km/h` : ''}`, K.col, 8.5));
    g.position.set(at[0], this.heightAt(at[0], at[1]), at[1]); this.scene.add(g); t.g = g; t.ring = ring;
    this.tasks.push(t); return t;
  }
  label(text, col, y) {
    const THREE = T(), cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const x = cv.getContext('2d');
    x.fillStyle = 'rgba(10,14,20,0.82)'; x.beginPath(); x.roundRect ? x.roundRect(4, 14, 504, 100, 40) : x.rect(4, 14, 504, 100); x.fill();
    x.strokeStyle = '#' + new THREE.Color(col).getHexString(); x.lineWidth = 6; x.stroke(); x.fillStyle = '#fff'; x.font = 'bold 50px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 256, 66);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true })); sp.scale.set(10, 2.5, 1); sp.position.y = y; sp.renderOrder = 10; return sp;
  }
  removeTask(t) { this.scene.remove(t.g); this.tasks = this.tasks.filter(x => x !== t); if (t.cps) for (const c of t.cps) this.scene.remove(c.g); if (t.dest) this.scene.remove(t.dest.g); }
  gate(x, z, col, big = 1) { // en stor port/ring som kontrollpunkt
    const THREE = T(), g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2 * big, 0.25, 10, 48), new THREE.MeshBasicMaterial({ color: col })); ring.position.y = 4.2 * big; g.add(ring);
    const col2 = new THREE.Mesh(new THREE.CylinderGeometry(4.2 * big, 4.2 * big, 0.2, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25, depthWrite: false })); col2.position.y = 0.1; g.add(col2);
    g.position.set(x, this.heightAt(x, z), z); this.scene.add(g); return { g, ring, x, z };
  }
  active() { return this.tasks.find(t => t.state === 'run'); }
  startTask(t) {
    const p = this.player; t.state = 'run'; t.t0 = this.t; t.dmg0 = p.dmg; this.scene.remove(t.g);
    if (t.kind === 'race') {
      t.cps = []; let [x, z] = t.at, dist = 0; const n = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) { const q = this.randomRoad(x, z, 55, 140); dist += Math.hypot(q[0] - x, q[1] - z) * 1.35; [x, z] = q; t.cps.push(this.gate(x, z, KIND.race.col)); }
      t.limit = Math.round(dist / 12 + 8); t.i = 0; t.reward = 120 + n * 30; this.msg(`🏁 STADSRACE – ${n} kontrollpunkter på ${t.limit} s. Följ pilen!`, 3);
    } else if (t.kind === 'drift') {
      t.limit = 30; t.pts = 0; t.goal = 2500; t.zone = this.gate(t.at[0], t.at[1], KIND.drift.col, 4.5); t.cps = [t.zone]; t.zone.ring.visible = false;
      this.msg('🌀 DRIFTZON – sladda så mycket du kan inom ringen i 30 s!', 3);
    } else if (t.kind === 'deliver') {
      const q = this.randomRoad(t.at[0], t.at[1], 140, 300), d = Math.hypot(q[0] - t.at[0], q[1] - t.at[1]) * 1.4;
      t.dest = this.gate(q[0], q[1], KIND.deliver.col); t.limit = Math.round(d / 10 + 12); t.reward = Math.round(140 + d * 0.5);
      this.msg(`📦 LEVERANS – kör paketet till den gröna porten på ${t.limit} s. Krocka inte – skador drar av på betalningen!`, 3.5);
    }
  }
  endTask(t, ok, pay, text) {
    if (ok && pay > 0) { this.earned += pay; this.done++; this.cfg.onEarn?.(pay, text); this.msg(`✅ ${text}<br><b>+${fmt(pay)} €</b>`, 3, 'go'); this.cfg.onEvent?.(t.kind, t); this.sfx(880, 0.25); }
    else { this.msg(`❌ ${text}`, 2.6, 'warn'); this.sfx(180, 0.3); }
    this.removeTask(t); setTimeout(() => { if (!this.dead) this.addTask(t.kind); }, 4000);
  }
  stepTasks(dt) {
    const p = this.player, v = Math.hypot(p.vx, p.vy), kmh = v * 3.6, A = this.active();
    for (const t of this.tasks) {
      if (t.g) { t.ring.rotation.z += dt; }
      if (t.state !== 'idle') continue;
      const d = Math.hypot(p.x - t.at[0], p.z - t.at[1]);
      if (t.kind === 'speed') { // fartkamera: passera inom 6 m – farten mäts
        if (d < 6 && !t.flash) { t.flash = 1; if (kmh >= t.target) { this.endTask(t, true, Math.round(40 + t.target * 0.9 + (kmh - t.target)), `📸 Blixt! ${Math.round(kmh)} km/h (krav ${t.target})`); if (kmh >= 120) this.cfg.onEvent?.('speed120'); }
          else { this.msg(`📸 ${Math.round(kmh)} km/h – kameran vill se minst ${t.target} km/h. Ta sats och försök igen!`, 2.4, 'warn'); } }
        if (d > 12) t.flash = 0; continue;
      }
      if (!A && d < 3.5) this.startTask(t);
    }
    if (!A) return;
    const left = A.limit - (this.t - A.t0);
    if (A.kind === 'race') {
      const cp = A.cps[A.i]; if (cp && Math.hypot(p.x - cp.x, p.z - cp.z) < 4.6) { this.scene.remove(cp.g); A.i++; this.sfx(660, 0.12); if (A.i >= A.cps.length) return this.endTask(A, true, A.reward + Math.max(0, Math.round(left * 4)), `Stadsrace klart med ${left.toFixed(1)} s kvar`); }
      for (const [i, c] of A.cps.entries()) c.ring.material.color.set(i === A.i ? 0xffd23f : 0x8a7a40), c.g.visible = i >= A.i && i <= A.i + 1;
    } else if (A.kind === 'drift') {
      const inZone = Math.hypot(p.x - A.zone.x, p.z - A.zone.z) < 4.2 * 4.5, slip = Math.abs(Math.atan2(p.vy, Math.max(1, Math.abs(p.vx))));
      if (inZone && v > 6 && slip > 0.25) A.pts += v * slip * dt * 40;
      if (left <= 0) return this.endTask(A, A.pts >= A.goal * 0.4, Math.round(Math.min(450, A.pts / 8)), `Driftzon: ${Math.round(A.pts)} poäng`);
    } else if (A.kind === 'deliver') {
      if (Math.hypot(p.x - A.dest.x, p.z - A.dest.z) < 4.6) { const dd = p.dmg - A.dmg0, pay = Math.max(20, Math.round(A.reward - dd * 6)); return this.endTask(A, true, pay, `Paketet levererat${dd > 1 ? ` (skador −${Math.round(dd * 6)} €)` : ' utan en skråma'}`); }
    }
    if (left <= 0 && A.kind !== 'drift') this.endTask(A, false, 0, 'Tiden tog slut');
  }

  // ---------- fysik ----------
  step(dt) {
    const c = this.player, I = this.ctl.state;
    c.thr += clamp(I.gas - c.thr, -8 * dt, (I.analogPedals ? 12 : 5) * dt); c.brk += clamp(I.brk - c.brk, -10 * dt, (I.analogPedals ? 14 : 6) * dt); c.hb = I.hb; c.clutch = I.clutch;
    if (I.brk && !I.gas && c.vx < 0.4) c.rev = true; else if (I.gas || !I.brk) c.rev = false;
    const k = this.cellAt(c.x, c.z); c.onSurf = k >= 0 && this.hgt[k] > this.gy0 + 0.06; // gräsmattan har sämre grepp
    const px = c.x, pz = c.z, ph = c.h;
    phys(c, dt, this.trk);
    // krock mot hus: prova karossens hörn och sidor
    const ch = Math.cos(c.h), sh = Math.sin(c.h), L = (c.obj?.userData.halfL || 2.2) * 0.95, W = (c.obj?.userData.halfW || 0.86) * 0.95;
    let hit = null;
    for (const [lx, lz] of [[L, W], [L, -W], [-L, W], [-L, -W], [L, 0], [0, W], [0, -W], [-L, 0]]) { const x = c.x + ch * lx - sh * lz, z = c.z + sh * lx + ch * lz; if (this.blocked(x, z)) { hit = [lx, lz]; break; } }
    if (hit) {
      const v = Math.hypot(c.vx, c.vy); c.x = px; c.z = pz; c.h = ph;
      // studsa: hastigheten längs träffriktningen vänds och dämpas, resten bromsas
      const hx = hit[0] / L, hz = hit[1] / W, n = Math.hypot(hx, hz) || 1, nx = hx / n, nz = hz / n, vn = c.vx * nx + c.vy * nz;
      if (vn > 0) { c.vx -= 1.35 * vn * nx; c.vy -= 1.35 * vn * nz; } c.vx *= 0.7; c.vy *= 0.7; c.r *= 0.4;
      if (vn > 3) { c.dmg = Math.min(100, (c.dmg || 0) + (vn - 3) * 1.6); this.shake = Math.min(1, vn / 14); if (!this.thudT || this.t - this.thudT > 0.25) { this.thudT = this.t; this.sfx(70 + Math.random() * 30, 0.18, 'square', Math.min(0.5, vn / 25)); } }
    }
    // trafiken: enkel cirkelkrock
    for (const o of this.traffic) { const dx = c.x - o.x, dz = c.z - o.z, d = Math.hypot(dx, dz); if (d < 3.6 && d > 0.01) { const nx = dx / d, nz = dz / d, push = 3.6 - d; c.x += nx * push; c.z += nz * push;
      const wv = (c.vx * Math.cos(c.h) - c.vy * Math.sin(c.h)) * -nx + (c.vx * Math.sin(c.h) + c.vy * Math.cos(c.h)) * -nz; if (wv > 2) { c.vx *= 0.55; c.vy *= 0.55; c.dmg = Math.min(100, (c.dmg || 0) + wv * 0.8); o.wait = 3; this.shake = Math.min(1, wv / 12); if (!this.thudT || this.t - this.thudT > 0.25) { this.thudT = this.t; this.sfx(90, 0.2, 'square', 0.4); } } } }
    // höjd: följer trottoarkanter och marken mjukt
    const gy = this.heightAt(c.x, c.z); c.y = c.y == null ? gy : c.y + (gy - c.y) * Math.min(1, dt * 14);
    this.t += dt;
  }
  reset() { const c = this.player, [x, z] = this.nearestRoad(c.x, c.z), L = this.lines.reduce((b, l) => { const d = Math.abs((l.axis === 'x' ? z : x) - l.c); return d < b.d ? { d, l } : b; }, { d: 1e9, l: null }).l;
    Object.assign(c, { x, z, vx: 0, vy: 0, r: 0, h: L ? (L.axis === 'x' ? (Math.cos(c.h) >= 0 ? 0 : Math.PI) : (Math.sin(c.h) >= 0 ? Math.PI / 2 : -Math.PI / 2)) : c.h }); c.y = this.heightAt(x, z); this.camH = c.h; }

  // ---------- slingan ----------
  frame(now) {
    if (this.dead) return; this.raf = requestAnimationFrame(t => this.frame(t));
    const realDt = Math.min(0.1, Math.max(0, (now - this.last) / 1000)); this.last = now; const dt = Math.min(0.05, realDt);
    for (const a of this.ctl.poll(this.touch)) { if (a === 'cam') this.cycleCam(); else if (a === 'pause') this.togglePause(); else if (a === 'reset') this.reset(); else if (a === 'up' || a === 'down') this.shiftGear(a === 'up' ? 1 : -1); }
    // ratten följer verklig tid (samma takt som på banorna)
    { const c = this.player, I = this.ctl.state; if (I.wheel) c.steer = clamp(I.steer, -1, 1); else { const st = clamp(I.steer, -1, 1), rate = st === 0 ? 5.5 : (Math.sign(st) !== Math.sign(c.steer) && c.steer !== 0 ? 7 : 3.2); c.steer += clamp(st - c.steer, -rate * realDt, rate * realDt); } }
    try { this.tick(dt, realDt); } catch (e) { if (!this.errShown) { this.errShown = 1; console.error(e); } }
  }
  tick(dt, realDt) {
    if (!this.paused) {
      this.acc = (this.acc || 0) + dt; let k = 0; while (this.acc >= DT && k++ < 30) { this.step(DT); this.acc -= DT; } if (this.acc > DT * 4) this.acc = 0;
      this.stepTraffic(dt); this.stepTasks(dt);
    }
    this.render(dt); this.audio(); if ((this.hudT = (this.hudT || 0) + dt) > 0.08) { this.hudT = 0; this.hud(); }
  }
  shiftGear(d) { const c = this.player, s = c.spec; if (c.aids?.auto) return; c.gear = clamp(c.gear + d, 1, s.gears.length); c.shiftT = s.shift; }
  cycleCam() { this.cam = (this.cam + 1) % 3; this.msg(['🎥 Jaktkamera', '🎥 Långt bakom', '🎥 Huven'][this.cam], 1); }
  render(dt) {
    const THREE = T(), c = this.player, R = this.R; if (!R || !c) return; (this.vctx ||= { _t: 0 })._t = this.t;
    const v = Math.hypot(c.vx, c.vy); let tgt = c.h; if (v > 3 && c.vx > 0) tgt = c.h + 0.5 * wrapA(Math.atan2(c.vx * Math.sin(c.h) + c.vy * Math.cos(c.h), c.vx * Math.cos(c.h) - c.vy * Math.sin(c.h)) - c.h);
    this.camH += wrapA(tgt - this.camH) * Math.min(1, 4 * dt);
    const ch = Math.cos(this.camH), sh = Math.sin(this.camH), y = c.y || 0;
    View3.prototype.poseCar.call(this.vctx ||= { _t: 0 }, c.obj, c.x, y, c.z, c.h, 0, 0, c.steer, c.wspin ?? c.wheelSpin, c.brk > 0.1, this.cam !== 2, -(c.bodyRoll || 0) * 0.5, (c.bodyPitch || 0) * 0.5, 0, c);
    if (c.obj.userData.glbWheels) poseModelWheels(c.obj.userData, c.steer, c.wspin ?? c.wheelSpin ?? 0);
    let eye, at;
    if (this.cam === 2) { eye = [c.x + Math.cos(c.h) * 0.4, y + 1.35, c.z + Math.sin(c.h) * 0.4]; at = [c.x + Math.cos(c.h) * 20, y + 1.0, c.z + Math.sin(c.h) * 20]; }
    else { const D = this.cam === 0 ? 7.5 : 13, H = this.cam === 0 ? 2.9 : 5.5; eye = [c.x - ch * D, y + H, c.z - sh * D]; at = [c.x + ch * 3, y + 1.0, c.z + sh * 3];
      // kameran får inte hamna inne i ett hus: dra in den mot bilen
      for (let f = 1; f > 0.2; f -= 0.1) { const ex = c.x - ch * D * f, ez = c.z - sh * D * f; if (!this.blocked(ex, ez)) { eye[0] = ex; eye[2] = ez; break; } } }
    this.shake = Math.max(0, (this.shake || 0) - dt * 3); const s = (this.shake || 0) ** 2 * 0.25;
    this.camera.position.set(eye[0] + Math.sin(this.t * 61) * s, eye[1] + Math.cos(this.t * 53) * s, eye[2]); this.camera.lookAt(at[0], at[1], at[2]);
    this.camera.fov = 60 + Math.min(14, v * 0.25); this.camera.updateProjectionMatrix();
    this.sun.position.set(c.x + 40, y + 70, c.z + 25); this.sun.target.position.set(c.x, y, c.z);
    this.resize(); R.render(this.scene, this.camera);
  }
  resize() { const w = this.cv.clientWidth || innerWidth, h = this.cv.clientHeight || innerHeight; if (w !== this.w || h !== this.h) { this.w = w; this.h = h; this.R.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); } }

  // ---------- HUD ----------
  hud() {
    const c = this.player, $ = this.$, v = Math.hypot(c.vx, c.vy) * 3.6, A = this.active();
    $('cKmh').textContent = Math.round(v); $('cGear').textContent = c.rev ? 'R' : c.gear; $('cDmg').textContent = `Skador ${Math.round(c.dmg || 0)} %`;
    $('cEarn').textContent = fmt(this.earned) + ' €'; $('cDone').textContent = `${this.done} utmaning${this.done === 1 ? '' : 'ar'}`;
    const tk = $('cTask'); let target = null;
    if (A) { const left = Math.max(0, A.limit - (this.t - A.t0)), K = KIND[A.kind];
      tk.hidden = false; tk.innerHTML = `<span>${K.ico} ${K.name.toUpperCase()}</span><b>${left.toFixed(1)} s</b><small>${A.kind === 'race' ? `Kontrollpunkt ${Math.min(A.i + 1, A.cps.length)}/${A.cps.length}` : A.kind === 'drift' ? `${Math.round(A.pts)} poäng (mål ${A.goal})` : 'Kör till den gröna porten'}</small>`;
      target = A.kind === 'race' ? A.cps[A.i] : A.kind === 'deliver' ? A.dest : A.zone; }
    else tk.hidden = true;
    // pil mot målet (i förhållande till kamerans riktning)
    const ar = $('cArrow'); if (target) { const a = Math.atan2(target.z - c.z, target.x - c.x) - this.camH; ar.hidden = false; ar.style.transform = `translateX(-50%) rotate(${(a * 180 / Math.PI - 90).toFixed(1)}deg)`; /* ➤ pekar åt höger, rakt fram = uppåt */ } else ar.hidden = true;
    this.drawMap();
    if (this.msgT > 0) { this.msgT -= 0.08; if (this.msgT <= 0) $('cMsg').className = 'c-msg'; }
  }
  msg(html, dur = 2.4, cls = '') { const e = this.$('cMsg'); if (!e) return; e.innerHTML = html; e.className = 'c-msg show ' + cls; this.msgT = dur; }
  drawMapBase() {
    const W = 180, cv = document.createElement('canvas'); cv.width = cv.height = W; const x = cv.getContext('2d'), img = x.createImageData(W, W);
    const sx = (this.bounds[1] - this.bounds[0]) / W, sz = (this.bounds[3] - this.bounds[2]) / W;
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { const k = this.cellAt(this.bounds[0] + (i + 0.5) * sx, this.bounds[2] + (j + 0.5) * sz), o = (j * W + i) * 4;
      const col = k < 0 ? [20, 30, 20] : this.block[k] ? [52, 48, 60] : this.road[k] ? [120, 124, 132] : this.hgt[k] > this.gy0 + 0.4 ? [170, 150, 130] : [70, 110, 60];
      img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255; }
    x.putImageData(img, 0, 0); this.mapBase = cv;
  }
  drawMap() {
    const cv = this.$('cMap'); if (!cv || !this.mapBase) return; const x = cv.getContext('2d'), W = cv.width, c = this.player;
    const toM = (px, pz) => [(px - this.bounds[0]) / (this.bounds[1] - this.bounds[0]) * W, (pz - this.bounds[2]) / (this.bounds[3] - this.bounds[2]) * W];
    x.drawImage(this.mapBase, 0, 0);
    const dot = (px, pz, col, r = 4) => { const [a, b] = toM(px, pz); x.fillStyle = col; x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 1; x.stroke(); };
    for (const o of this.traffic) dot(o.x, o.z, '#ddd', 2);
    for (const t of this.tasks) if (t.state === 'idle') dot(t.at[0], t.at[1], '#' + new (T().Color)(KIND[t.kind].col).getHexString(), 4.5);
    const A = this.active(); if (A) { if (A.cps) A.cps.forEach((q, i) => { if (A.kind !== 'race' || i >= A.i) dot(q.x, q.z, i === A.i || A.kind !== 'race' ? '#ffd23f' : '#8a7a40', i === A.i ? 5 : 3); }); if (A.dest) dot(A.dest.x, A.dest.z, '#8cff7a', 5.5); }
    const [a, b] = toM(c.x, c.z); x.save(); x.translate(a, b); x.rotate(c.h); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(7, 0); x.lineTo(-5, 4.5); x.lineTo(-5, -4.5); x.closePath(); x.fill(); x.strokeStyle = '#000'; x.stroke(); x.restore();
  }

  // ---------- ljud: enkel motorton + effekter ----------
  audioInit() {
    try { const AC = window.AudioContext || window.webkitAudioContext; this.ac = new AC(); const vol = (this.cfg.settings?.vol ?? 50) / 100;
      this.og = this.ac.createGain(); this.og.gain.value = 0.12 * vol; this.og.connect(this.ac.destination); this.vol = vol;
      const lp = this.ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(this.og); this.lp = lp;
      this.o1 = this.ac.createOscillator(); this.o1.type = 'sawtooth'; this.o2 = this.ac.createOscillator(); this.o2.type = 'square';
      const g2 = this.ac.createGain(); g2.gain.value = 0.35; this.o1.connect(lp); this.o2.connect(g2); g2.connect(lp); this.o1.start(); this.o2.start();
      const resume = () => this.ac?.resume?.(); window.addEventListener('pointerdown', resume, { once: true }); window.addEventListener('keydown', resume, { once: true });
    } catch (e) { this.ac = null; }
  }
  audio() { if (!this.ac || !this.o1) return; const c = this.player, rpm = Math.max(700, c.rpm || 800), f = rpm / 60 * (c.spec?.cyl || 4) / 2;
    const tt = this.ac.currentTime; this.o1.frequency.setTargetAtTime(f, tt, 0.03); this.o2.frequency.setTargetAtTime(f * 0.5, tt, 0.03); this.lp.frequency.setTargetAtTime(400 + c.thr * 1600 + rpm * 0.08, tt, 0.05);
    this.og.gain.setTargetAtTime(this.paused ? 0 : (0.05 + c.thr * 0.08) * this.vol, tt, 0.05); }
  sfx(freq, dur, type = 'sine', vol = 0.3) { if (!this.ac) return; try { const o = this.ac.createOscillator(), g = this.ac.createGain(), t = this.ac.currentTime; o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol * this.vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(this.ac.destination); o.start(t); o.stop(t + dur + 0.02); } catch (e) { } }

  // ---------- kontroller, paus och avslut ----------
  bind() {
    this.ctl = new Controls(this.cfg.settings || {});
    this.kd = e => { if (e.repeat && this.ctl.keyAction(e.code)) { e.preventDefault(); return; } if (this.ctl.keydown(e.code)) e.preventDefault(); };
    this.ku = e => this.ctl.keyup(e.code); window.addEventListener('keydown', this.kd); window.addEventListener('keyup', this.ku);
    for (const b of this.host.querySelectorAll('.touch button')) { const k = b.dataset.k, on = e => { e.preventDefault(); this.touch[k] = 1; b.classList.add('on'); }, off = e => { e.preventDefault(); this.touch[k] = 0; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off); }
    this.$('cCam').onclick = () => this.cycleCam(); this.$('cPause').onclick = () => this.togglePause(); this.$('cResume').onclick = () => this.togglePause();
    this.$('cReset').onclick = () => { this.reset(); this.togglePause(); }; this.$('cQuit').onclick = () => this.exit();
  }
  togglePause() { this.paused = !this.paused; this.$('cPauseBox').hidden = !this.paused; this.$('cSum').innerHTML = `Du har tjänat <b>${fmt(this.earned)} €</b> på ${this.done} utmaning${this.done === 1 ? '' : 'ar'} den här turen.`; this.last = performance.now(); }
  exit() { if (this.dead) return; const sum = { earned: this.earned, done: this.done, dmg: this.player?.dmg || 0, sec: this.t }; this.destroy(); this.cfg.onExit?.(sum); }
  destroy() {
    this.dead = true; cancelAnimationFrame(this.raf); window.removeEventListener('keydown', this.kd); window.removeEventListener('keyup', this.ku);
    try { this.ac?.close(); } catch (e) { } try { this.ctl?.stopRumble?.(); } catch (e) { }
    try { this.scene?.traverse(m => { m.geometry?.dispose?.(); }); this.R?.dispose(); this.R?.forceContextLoss?.(); } catch (e) { }
  }
}
