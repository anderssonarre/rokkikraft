// Miljöljus: himlen → PMREM (diffust himmelsljus + reflexer på PBR-material).
import { cv } from '../assets/TextureManager.js';
const T = () => window.THREE;
// HDR-liknande miljöljus: himlen (med sol) renderas till en PMREM-karta som ger reflexer och diffust ljus på PBR-material
export function makeEnvironment(R, zenith, horizon, sunDir, ground) {
  const THREE = T(); try {
    // ekvirektangulär himmelsbild (LDR-canvas) med sol, horisont och mark → PMREM
    const W = 512, H = 256, c = cv(W, H), g = c.getContext('2d'), im = g.createImageData(W, H), sd = sunDir.clone().normalize();
    for (let y = 0; y < H; y++) { const lat = (0.5 - y / H) * Math.PI, sy = Math.sin(lat), cy = Math.cos(lat);
      for (let x = 0; x < W; x++) { const lon = (x / W) * Math.PI * 2 - Math.PI, dx = cy * Math.cos(lon), dz = cy * Math.sin(lon), dy = sy, i = (y * W + x) * 4;
        let r, gg, b; if (dy > 0) { const t = Math.pow(dy, 0.5); r = horizon.r + (zenith.r - horizon.r) * t; gg = horizon.g + (zenith.g - horizon.g) * t; b = horizon.b + (zenith.b - horizon.b) * t; }
        else { const t = Math.pow(-dy, 0.4); r = horizon.r * 0.8 + (ground.r - horizon.r * 0.8) * t; gg = horizon.g * 0.8 + (ground.g - horizon.g * 0.8) * t; b = horizon.b * 0.8 + (ground.b - horizon.b * 0.8) * t; }
        const s = Math.max(0, dx * sd.x + dy * sd.y + dz * sd.z), glow = Math.pow(s, 600) * 4 + Math.pow(s, 20) * 0.35;
        im.data[i] = Math.min(255, (r + glow) * 255); im.data[i + 1] = Math.min(255, (gg + glow * 0.93) * 255); im.data[i + 2] = Math.min(255, (b + glow * 0.8) * 255); im.data[i + 3] = 255; } }
    g.putImageData(im, 0, 0); const tex = new THREE.CanvasTexture(c); tex.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(R), rt = pm.fromEquirectangular(tex); pm.dispose(); tex.dispose(); return rt.texture;
  } catch (e) { return null; }
}

