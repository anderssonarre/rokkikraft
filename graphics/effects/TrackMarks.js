// Däckspår som ringbuffer av instansierade remsor.
import { cv } from '../assets/TextureManager.js';
const T = () => window.THREE;
// Däckspår: ringbuffer av platta, genomskinliga remsor som läggs bakom hjulen (äldsta skrivs över)
export class TrackMarks {
  constructor(scene, max, winter) { const THREE = T(); this.max = max; this.n = 0; this.k = 0; if (!max) return;
    const c = cv(8, 32), gx = c.getContext('2d'), gr = gx.createLinearGradient(0, 0, 0, 32); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gx.fillStyle = gr; gx.fillRect(0, 0, 8, 32);
    const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), m = new THREE.MeshBasicMaterial({ color: 0xffffff, map: new THREE.CanvasTexture(c), transparent: true, opacity: winter ? 0.45 : 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }); // mjuka kanter
    this.mesh = new THREE.InstancedMesh(g, m, max); this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = 2;
    this.d = new THREE.Object3D(); this.c = new THREE.Color(); scene.add(this.mesh);
    for (let i = 0; i < max; i++) this.mesh.setColorAt(i, this.c.setRGB(1, 1, 1)); }
  // (x0,z0)→(x1,z1) längs marken på höjd y, bredd w, färg rgb (mörk på grus, ljus/blank på is)
  add(x0, z0, x1, z1, y, w, rgb) { if (!this.max) return; const L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.05 || L > 3) return; const d = this.d, i = this.k;
    d.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); d.rotation.set(0, -Math.atan2(z1 - z0, x1 - x0), 0); d.scale.set(L + 0.04, 1, w); d.updateMatrix();
    this.mesh.setMatrixAt(i, d.matrix); this.mesh.setColorAt(i, this.c.setRGB(rgb[0], rgb[1], rgb[2])); this.k = (i + 1) % this.max; this.n = Math.min(this.max, this.n + 1); this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true; }
}
