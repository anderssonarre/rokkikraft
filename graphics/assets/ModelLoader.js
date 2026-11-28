// Riktiga 3D-bilar (GLB / glTF 2.0) i stället för de inbyggda formerna.
// Två källor, i den här ordningen:
//   1. Egen modell som spelaren har laddat upp i Garaget (sparas i webbläsarens IndexedDB, per bil-id).
//   2. assets/models/manifest.json – modeller som följer med spelet (se assets/MODELLSTANDARD.md).
// Modellen PASSAS IN AUTOMATISKT: längsta axeln läggs längs bilen, skalan sätts efter bilens riktiga längd (BP-måtten),
// den ställs på marken och centreras. Hjul hittas på namn (wheel/tire/tyre/rim/hjul/rad/reifen) eller som fyra runda
// delar i hörnen; då snurrar och styr spelet modellens egna hjul. Lackmaterial (paint/body/lack/carpaint eller det största
// färgade materialet) får bilens lackfärg. Fysiken påverkas inte – modellen är bara utseende.
const T = () => window.THREE;
const BASE = new URL('../../', import.meta.url).href;
let manifestP = null, loaderP = null; const cache = new Map();

export function manifest() {
  return manifestP ??= fetch(BASE + 'assets/models/manifest.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : { cars: {} }).catch(() => ({ cars: {} }));
}
function gltfLoader() {
  return loaderP ??= new Promise((res, rej) => { if (T().GLTFLoader) return res(new (T().GLTFLoader)());
    const s = document.createElement('script'); s.src = BASE + 'js/vendor/three-examples/GLTFLoader.js'; s.onload = () => res(new (T().GLTFLoader)()); s.onerror = rej; document.head.appendChild(s); });
}

// ---------- egna modeller i IndexedDB ----------
const DB = 'rokkikraft-modeller', ST = 'bilar';
function db() { return new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function tx(mode, fn) { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(ST, mode), s = t.objectStore(ST), r = fn(s); t.oncomplete = () => res(r?.result); t.onerror = () => rej(t.error); }); }
export const customModel = id => tx('readonly', s => s.get(id)).catch(() => null);
export const saveCustomModel = (id, rec) => { cache.delete('custom:' + id); return tx('readwrite', s => s.put(rec, id)); };
export const deleteCustomModel = id => { cache.delete('custom:' + id); return tx('readwrite', s => s.delete(id)); };
export async function customModelInfo(id) { const r = await customModel(id); return r ? { name: r.name, size: r.buf.byteLength, rot: r.rot || 0, flip: !!r.flip, paint: r.paint !== false, paintMat: r.paintMat || '', mats: r.mats || [] } : null; }

// Läser en GLB (ArrayBuffer) – används också för att kontrollera en uppladdad fil innan den sparas
export async function parseGlb(buf) { const l = await gltfLoader(); return new Promise((res, rej) => l.parse(buf, '', g => res(g.scene), e => rej(e))); }

async function sourceFor(modelId) {
  const c = await customModel(modelId);
  if (c?.buf) { const key = 'custom:' + modelId; if (!cache.has(key)) cache.set(key, parseGlb(c.buf)); return { scene: await cache.get(key), opt: { rot: c.rot || 0, flip: !!c.flip, paint: c.paint !== false, paintMat: c.paintMat || '', gameWheels: true } }; }
  const man = await manifest(), def = man.cars?.[modelId]; if (!def) return null;
  if (!cache.has(def.file)) cache.set(def.file, gltfLoader().then(l => new Promise((res, rej) => l.load(BASE + 'assets/models/' + def.file, g => res(g.scene), undefined, rej))));
  return { scene: await cache.get(def.file), opt: { rot: def.rotY ? Math.round(def.rotY / (Math.PI / 2)) : 0, flip: !!def.flip, paint: def.paint !== false, paintMat: def.paintMat || '', scale: def.scale, offset: def.offset, wheels: def.wheels, gameWheels: !!def.gameWheels, lift: def.lift || 0 } };
}

const WHEEL_RE = /wheel|tire|tyre|rim|hjul|rad\b|reifen|rueda|roue/i;
const GLASS_RE = /glass|glas|window|windshield|lens|lamp|light|lyse|ruta|transparent/i, PAINT_RE = /paint|lack|body|carpaint|car_?colou?r|exterior|kaross|shell|coat/i;
function fixOpaque(mt) { if (mt.transparent || (mt.opacity ?? 1) < 1 || mt.transmission) { mt.transparent = false; mt.opacity = 1; mt.depthWrite = true; if (mt.transmission) mt.transmission = 0; if (mt.alphaMap || mt.map) mt.alphaTest = Math.max(mt.alphaTest || 0, 0.5); mt.needsUpdate = true; } }
// Ytarea per material (riktiga trianglar i världsskala) – största färgade ytan är nästan alltid karossen
export function materialStats(root) {
  const THREE = T(), M = new Map(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(); root.updateMatrixWorld(true);
  root.traverse(m => { if (!m.isMesh) return; const g = m.geometry, P = g.attributes.position; if (!P) return; const I = g.index, mats = Array.isArray(m.material) ? m.material : [m.material];
    const groups = g.groups?.length ? g.groups : [{ start: 0, count: I ? I.count : P.count, materialIndex: 0 }];
    for (const gr of groups) { const mt = mats[gr.materialIndex] || mats[0]; if (!mt) continue; let area = 0; const step = Math.max(1, Math.floor(gr.count / 3 / 4000)) * 3; // gles provtagning på stora modeller
      for (let k = gr.start; k + 2 < gr.start + gr.count; k += step) { const i0 = I ? I.getX(k) : k, i1 = I ? I.getX(k + 1) : k + 1, i2 = I ? I.getX(k + 2) : k + 2;
        a.fromBufferAttribute(P, i0).applyMatrix4(m.matrixWorld); b.fromBufferAttribute(P, i1).applyMatrix4(m.matrixWorld); c.fromBufferAttribute(P, i2).applyMatrix4(m.matrixWorld);
        area += b.sub(a).cross(c.sub(a)).length() / 2 * (step / 3); }
      const e = M.get(mt) || { mat: mt, name: mt.name || '(namnlöst)', area: 0 }; e.area += area; M.set(mt, e); } });
  return [...M.values()].sort((x, y) => y.area - x.area);
}
function autoPaint(stats) {
  const named = stats.find(x => PAINT_RE.test(x.name) && !GLASS_RE.test(x.name)); if (named) return named.mat;
  const lum = m => m.color ? m.color.r + m.color.g + m.color.b : 1;
  return stats.find(x => !GLASS_RE.test(x.name) && !WHEEL_RE.test(x.name) && !/interior|seat|dash|chrome|krom|black|svart|rubber|gummi|plastic/i.test(x.name) && lum(x.mat) > 0.25 && (x.mat.metalness ?? 0) < 0.95)?.mat || null;
}
// Byter karossen i en bil från View3.addCar mot en GLB-modell. Returnerar true om en modell användes.
export async function applyVehicleModel(G, modelId, paint) {
  if (!G?.userData?.bodyG) return false; let src;
  try { src = await sourceFor(modelId); } catch (e) { console.warn('Bilmodell kunde inte laddas:', modelId, e); return false; }
  if (!src || G.userData.disposed) return false;
  const THREE = T(), U = G.userData, o = src.opt, root = src.scene.clone(true), holder = new THREE.Group();
  holder.add(root);
  // riktning: längsta horisontella axeln längs bilen (+X), sedan spelarens egna 90°/180°-vridningar
  let box = new THREE.Box3().setFromObject(root), sz = box.getSize(new THREE.Vector3());
  let rot = sz.z > sz.x ? Math.PI / 2 : 0; rot += (o.rot || 0) * Math.PI / 2 + (o.flip ? Math.PI : 0); root.rotation.y = rot;
  root.updateMatrixWorld(true); box = new THREE.Box3().setFromObject(root); sz = box.getSize(new THREE.Vector3());
  // skala efter bilens riktiga längd och ställ den på marken, centrerad
  const L = (U.halfL || 2.2) * 2, s = o.scale || L / Math.max(0.1, sz.x); root.scale.multiplyScalar(s);
  root.updateMatrixWorld(true); box = new THREE.Box3().setFromObject(root); const ctr = box.getCenter(new THREE.Vector3());
  const ground = -(U.bodyBase ?? -0.28); // bodyG ligger 0,28 m lägre i loppet (fjädringens nolläge), i garaget 0
  root.position.x -= ctr.x; root.position.z -= ctr.z; root.position.y += ground - box.min.y + (o.lift || 0); if (o.offset) { root.position.x += o.offset[0]; root.position.y += o.offset[1]; root.position.z += o.offset[2]; }
  root.updateMatrixWorld(true);
  // material: lack + skuggor. Allt som inte är glas/lampor görs ogenomskinligt (många nedladdade modeller har
  // karossen felaktigt markerad som genomskinlig, då syns interiören rakt igenom).
  const paintM = new THREE.MeshStandardMaterial({ color: new THREE.Color(...paint), metalness: 0.25, roughness: 0.5 }); paintM.userData.paint = 1;
  root.traverse(m => { if (!m.isMesh) return; m.castShadow = true; m.receiveShadow = true; if (!m.geometry.attributes.normal) m.geometry.computeVertexNormals(); // vissa exporter saknar normaler
    for (const mt of (Array.isArray(m.material) ? m.material : [m.material])) if (mt && !GLASS_RE.test(mt.name)) fixOpaque(mt); });
  const stats = materialStats(root), pick = o.paintMat ? stats.find(x => x.name === o.paintMat)?.mat : autoPaint(stats);
  if (o.paint && pick) root.traverse(m => { if (!m.isMesh) return; const sw = mt => mt === pick || (mt && pick.name && mt.name === pick.name) ? paintM : mt; /* laddaren kan klona samma material */ m.material = Array.isArray(m.material) ? m.material.map(sw) : sw(m.material); });
  // hjul: noder med hjulnamn, grupperade i de fyra hörnen
  // manifestet kan ange egen regex för hjulnoderna (wheels: "..."), eller wheels: false när hjulen sitter ihop med karossen
  const WR = o.wheels === false ? null : o.wheels ? new RegExp(o.wheels, 'i') : WHEEL_RE;
  const cand = []; if (WR) root.traverse(n => { if (n !== root && WR.test(n.name) && !(n.parent && WR.test(n.parent.name))) cand.push(n); });
  const corners = {}; for (const n of cand) { const b = new THREE.Box3().setFromObject(n); if (b.isEmpty()) continue; const c = b.getCenter(new THREE.Vector3()), k = (c.x > 0 ? 'f' : 'r') + (c.z > 0 ? 'R' : 'L'); (corners[k] ||= []).push({ n, b }); }
  holder.updateMatrixWorld(true);
  if (Object.keys(corners).length === 4) {
    U.glbWheels = [];
    for (const [k, list] of Object.entries(corners)) {
      const b = new THREE.Box3(); for (const x of list) b.union(x.b); const c = b.getCenter(new THREE.Vector3());
      const piv = new THREE.Group(); piv.position.copy(c); holder.add(piv); piv.updateMatrixWorld(true);
      for (const x of list) piv.attach(x.n); // behåller läget, men snurrar nu runt hjulets mitt
      U.glbWheels.push({ o: piv, front: k[0] === 'f' });
    }
    for (const w of U.wheels) w.piv.visible = false; // spelets egna hjul behövs inte
  } else if (!o.gameWheels) for (const w of U.wheels) w.piv.visible = false; // modellens hjul sitter i karossen (står still), spelets egna döljs
  for (const c of [...U.bodyG.children]) c.visible = false; U.bodyG.add(holder); U.glb = holder;
  return true;
}
// Anropas från poseCar: snurra/styr modellens egna hjul
export function poseModelWheels(U, steer, spin) { if (!U.glbWheels) return; for (const w of U.glbWheels) w.o.rotation.set(0, w.front ? -steer * 0.45 : 0, -spin, 'YXZ'); }
// Tar bort en inläst modell och visar de inbyggda delarna igen
export function removeVehicleModel(G) { const U = G?.userData; if (!U?.glb) return; U.bodyG.remove(U.glb); U.glb = null; U.glbWheels = null; for (const c of U.bodyG.children) c.visible = true; for (const w of U.wheels) w.piv.visible = true; }
