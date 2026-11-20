// Grafikprofiler Low / Medium / High / Ultra (+ Auto) – en enda källa för alla kvalitetsval i grafikmotorn.
// post = efterbehandling (HDR-mål, färggradering, FXAA), ao = antal SSAO-prover (0 = av), aoScale = AO-upplösning, bloom = ljusglöd,
// pr = max pixeltäthet, smap = skuggkartans storlek (0 = inga skuggor), cell = terrängrutnät (m), trees = antal träd,
// grass = gräs-tuvor, parts = max partiklar, marks = däckspårsbitar, std = PBR på terrängen, aniso = texturfiltrering
export const PRESETS = [
  { name: 'Low', post: 0, ao: 0, aoScale: 0.5, bloom: 0, fxaa: 0, pr: 1.0, smap: 0, cell: 9, trees: 520, grass: 0, parts: 160, marks: 300, std: 0, aniso: 2, env: 0, shadowR: 60, lodNear: 0 },
  { name: 'Medium', post: 1, ao: 0, aoScale: 0.5, bloom: 1, fxaa: 1, pr: 1.25, smap: 1024, cell: 7, trees: 1100, grass: 2600, parts: 300, marks: 900, std: 0, aniso: 4, env: 1, shadowR: 65, lodNear: 180 },
  { name: 'High', post: 1, ao: 8, aoScale: 0.5, bloom: 1, fxaa: 1, pr: 1.6, smap: 2048, cell: 6, trees: 1800, grass: 7000, parts: 520, marks: 1600, std: 1, aniso: 8, env: 1, shadowR: 75, lodNear: 260 },
  { name: 'Ultra', post: 1, ao: 12, aoScale: 0.75, bloom: 1, fxaa: 1, pr: 2.0, smap: 4096, cell: 4.5, trees: 2800, grass: 14000, parts: 800, marks: 2600, std: 1, aniso: 16, env: 1, shadowR: 90, lodNear: 380 },
];
// Inställningens värde → nivå 0–3. 'auto' väljer efter enheten och kommer ihåg vad som funkade senast.
export function qualityLevel(setting) {
  const s = setting === 'lag' ? 'low' : setting === 'hog' ? 'high' : (setting || 'auto');
  const fixed = { low: 0, medium: 1, high: 2, ultra: 3 }[s]; if (fixed !== undefined) return { level: fixed, auto: false };
  let lv; try { lv = +localStorage.getItem('rk_autoQ'); } catch (e) { }
  if (!(lv >= 0 && lv <= 3)) { const mob = /Mobi|Android|iPhone|iPad/.test(navigator.userAgent), cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
    lv = mob ? 0 : cores >= 8 && mem >= 8 ? 2 : cores >= 4 ? 1 : 0; }
  return { level: lv, auto: true };
}
export function rememberAuto(level) { try { localStorage.setItem('rk_autoQ', String(level)); } catch (e) { } }

