// Frigör GPU-minne när en vy stängs: geometrier, material, texturer (även i material-uniforms) och render targets.
// Delade cachade texturer (TextureManager) markeras med userData.shared och lämnas kvar för nästa heat.
export const SHARED = new WeakSet(); // delade/cachade resurser (r128-texturer saknar userData)
export const markShared = (...o) => { for (const x of o) if (x) SHARED.add(x); };
export function disposeScene(scene) {
  const seenM = new Set(), seenT = new Set();
  const tex = t => { if (t && t.isTexture && !SHARED.has(t) && !seenT.has(t)) { seenT.add(t); t.dispose(); } };
  scene?.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) { if (seenM.has(m) || SHARED.has(m)) continue; seenM.add(m);
      for (const k in m) tex(m[k]); if (m.uniforms) for (const k in m.uniforms) tex(m.uniforms[k]?.value); m.dispose(); }
  });
  if (scene?.environment && !SHARED.has(scene.environment)) scene.environment.dispose();
}
