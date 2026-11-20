// Fordonsmaterial: billack (PBR med klarlack på Medium+), och hur lack/glas/gummi reagerar på väder och skador.
const T = () => window.THREE;

// Lack: Physical med klarlack när miljöljus finns (reflexer), annars Standard. metalness 0.35 är skadesystemets markör för lackerade delar.
export function paintMaterial(col, level, env, weather) { const THREE = T(), wet = weather === 'regn' || weather === 'sno';
  if (!env) return new THREE.MeshStandardMaterial({ color: col, metalness: 0.35, roughness: wet ? 0.5 : 0.78 });
  return new THREE.MeshPhysicalMaterial({ color: col, metalness: 0.35, roughness: wet ? 0.42 : 0.6, clearcoat: (level >= 2 ? 0.45 : 0.25) + (wet ? 0.35 : 0), clearcoatRoughness: wet ? 0.12 : 0.45 });
}
// Väder på övriga bilmaterial: blankare glas och gummi i regn, matt snötäckt i snöfall
export function weatherize(G, weather) { if (weather !== 'regn' && weather !== 'sno') return;
  G.traverse(o => { const m = o.material; if (!m || !m.isMeshStandardMaterial || m.metalness === 0.35) return; if (weather === 'regn') m.roughness = Math.max(0.05, m.roughness * 0.6); });
}
// Skador utöver bucklor (som View3.damageCar redan gör): trasiga lampor, smutsigare kaross
export function damageExtras(G, k) { const U = G.userData; if (!U.lampM) return;
  if (k > 0.4 && !U.lampsBroken) { U.lampsBroken = 1; U.lampM.emissive?.setHex(0x000000); U.lampM.color.setHex(0x3a3a36); U.lampM.roughness = 0.9; }
}
