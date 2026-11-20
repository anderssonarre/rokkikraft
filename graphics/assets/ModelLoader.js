// Modellpipeline för riktiga 3D-bilar (GLB/glTF 2.0). Se assets/MODELLSTANDARD.md för hur filerna ska se ut.
// - assets/models/manifest.json listar vilka spelbilar som har en modell (saknas filen används de inbyggda bilarna).
// - GLTFLoader (three.js r128, MIT) laddas först när en modell faktiskt behövs.
// - Modellen ersätter den inbyggda karossen; namngivna hjul (wheel_fl, wheel_fr, wheel_rl, wheel_rr) tar över hjulanimationen,
//   material som heter "paint" får bilens lackfärg. Fysiken påverkas inte – modellen följer samma position som förut.
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
// Laddar (och cachar) en GLB och returnerar en klon per bil
export async function loadModel(file) {
  if (!cache.has(file)) cache.set(file, gltfLoader().then(l => new Promise((res, rej) => l.load(BASE + 'assets/models/' + file, g => res(g.scene), undefined, rej))));
  const src = await cache.get(file); return src.clone(true);
}
const WHEELS = { wheel_fl: [1, -1], wheel_fr: [1, 1], wheel_rl: [-1, -1], wheel_rr: [-1, 1] };
// Byter karossen i en bil från View3.addCar mot en GLB-modell enligt manifestet. Returnerar true om en modell användes.
export async function applyVehicleModel(G, modelId, paint) {
  const man = await manifest(), def = man.cars?.[modelId]; if (!def || !G?.userData?.bodyG) return false;
  let root; try { root = await loadModel(def.file); } catch (e) { console.warn('Bilmodell kunde inte laddas:', def.file, e); return false; }
  const THREE = T(), U = G.userData, s = def.scale ?? 1; root.scale.setScalar(s); root.rotation.y = def.rotY ?? 0; if (def.offset) root.position.set(...def.offset);
  const paintM = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(...paint), metalness: 0.35, roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.4 });
  const wheels = {};
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m, i) => { if (/paint|lack|body/i.test(m.name)) { if (Array.isArray(o.material)) o.material[i] = paintM; else o.material = paintM; } else if (m.isMeshStandardMaterial) m.envMapIntensity = 1; }); }
    if (WHEELS[o.name]) wheels[o.name] = o; });
  // dölj den inbyggda karossen (behåll skuggor/partiklar), lägg in modellen i den fjädrade karossgruppen
  for (const c of [...U.bodyG.children]) c.visible = false; U.bodyG.add(root); U.glb = root;
  if (Object.keys(wheels).length === 4) { for (const w of U.wheels) w.piv.visible = false; U.glbWheels = Object.entries(wheels).map(([n, o]) => ({ o, front: WHEELS[n][0] > 0, base: o.rotation.clone() })); }
  return true;
}
// Anropas från poseCar: snurra/styr modellens egna hjul
export function poseModelWheels(U, steer, spin) { if (!U.glbWheels) return; for (const w of U.glbWheels) { w.o.rotation.set(w.base.x, w.base.y + (w.front ? -steer * 0.45 : 0), w.base.z - spin); } }
