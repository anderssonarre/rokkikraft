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
export async function customModelInfo(id) { const r = await customModel(id); return r ? { name: r.name, size: r.buf.byteLength, rot: r.rot || 0, flip: !!r.flip, paint: r.paint !== false } : null; }

// Läser en GLB (ArrayBuffer) – används också för att kontrollera en uppladdad fil innan den sparas
export async function parseGlb(buf) { const l = await gltfLoader(); return new Promise((res, rej) => l.parse(buf, '', g => res(g.scene), e => rej(e))); }

async function sourceFor(modelId) {
  const c = await customModel(modelId);
  if (c?.buf) { const key = 'custom:' + modelId; if (!cache.has(key)) cache.set(key, parseGlb(c.buf)); return { scene: await cache.get(key), opt: { rot: c.rot || 0, flip: !!c.flip, paint: c.paint !== false } }; }
  const man = await manifest(), def = man.cars?.[modelId]; if (!def) return null;
  if (!cache.has(def.file)) cache.set(def.file, gltfLoader().then(l => new Promise((res, rej) => l.load(BASE + 'assets/models/' + def.file, g => res(g.scene), undefined, rej))));
  return { scene: await cache.get(def.file), opt: { rot: def.rotY ? Math.round(def.rotY / (Math.PI / 2)) : 0, flip: !!def.flip, paint: def.paint !== false, scale: def.scale, offset: def.offset } };
}

const WHEEL_RE = /wheel|tire|tyre|rim|hjul|rad\b|reifen|rueda|roue/i;
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
  root.position.x -= ctr.x; root.position.z -= ctr.z; root.position.y += ground - box.min.y; if (o.offset) { root.position.x += o.offset[0]; root.position.y += o.offset[1]; root.position.z += o.offset[2]; }
  root.updateMatrixWorld(true);
  // material: lack + skuggor
  const paintM = new THREE.MeshStandardMaterial({ color: new THREE.Color(...paint), metalness: 0.25, roughness: 0.5 }); paintM.userData.paint = 1;
  const mats = new Map(); let named = false;
  root.traverse(m => { if (!m.isMesh) return; m.castShadow = true; m.receiveShadow = true; if (!m.geometry.attributes.normal) m.geometry.computeVertexNormals(); // vissa exporter saknar normaler
    for (const mt of (Array.isArray(m.material) ? m.material : [m.material])) { if (!mt) continue; if (/paint|lack|body|carpaint|exterior/i.test(mt.name)) named = true;
      const g = m.geometry; g.computeBoundingBox(); const b = g.boundingBox, area = (b.max.x - b.min.x) * (b.max.y - b.min.y) + (b.max.y - b.min.y) * (b.max.z - b.min.z) + (b.max.x - b.min.x) * (b.max.z - b.min.z);
      mats.set(mt, (mats.get(mt) || 0) + area * m.getWorldScale(new THREE.Vector3()).x ** 2); } });
  let paintMat = null;
  if (o.paint && !named) { // inget namngivet lackmaterial: ta det största materialet som inte är svart/glas/krom
    paintMat = [...mats.entries()].filter(([m]) => !m.transparent && (m.opacity ?? 1) > 0.9 && (m.color ? m.color.r + m.color.g + m.color.b > 0.25 : true) && (m.metalness ?? 0) < 0.9 && !WHEEL_RE.test(m.name)).sort((a, b) => b[1] - a[1])[0]?.[0] || null; }
  if (o.paint) root.traverse(m => { if (!m.isMesh) return; const sw = mt => (named ? /paint|lack|body|carpaint|exterior/i.test(mt?.name || '') : mt === paintMat) ? paintM : mt;
    m.material = Array.isArray(m.material) ? m.material.map(sw) : sw(m.material); });
  // hjul: noder med hjulnamn, grupperade i de fyra hörnen
  const cand = []; root.traverse(n => { if (n !== root && WHEEL_RE.test(n.name) && !(n.parent && WHEEL_RE.test(n.parent.name))) cand.push(n); });
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
  }
  for (const c of [...U.bodyG.children]) c.visible = false; U.bodyG.add(holder); U.glb = holder;
  return true;
}
// Anropas från poseCar: snurra/styr modellens egna hjul
export function poseModelWheels(U, steer, spin) { if (!U.glbWheels) return; for (const w of U.glbWheels) w.o.rotation.set(0, w.front ? -steer * 0.45 : 0, -spin, 'YXZ'); }
// Tar bort en inläst modell och visar de inbyggda delarna igen
export function removeVehicleModel(G) { const U = G?.userData; if (!U?.glb) return; U.bodyG.remove(U.glb); U.glb = null; U.glbWheels = null; for (const c of U.bodyG.children) c.visible = true; for (const w of U.wheels) w.piv.visible = true; }
