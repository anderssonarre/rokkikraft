// Vegetation: gräs-tuvor (korsade alfa-plan, instansierade i rutor).
import { mulberry } from '../../js/gl.js';
import { cv } from '../assets/TextureManager.js';
import { markShared } from '../core/ResourceManager.js';
const T = () => window.THREE;
// Gräs-tuvor: korsade plan med alfa-textur, i rutor (chunkar) så att kameran bara ritar det som syns
let _grassMat = null;
export function grassMaterial(winter) { const THREE = T(); if (_grassMat && _grassMat.userData.w === winter) return _grassMat;
  const c = cv(128, 128), g = c.getContext('2d'), r = mulberry(8); g.clearRect(0, 0, 128, 128);
  for (let k = 0; k < 46; k++) { const x = 10 + r() * 108, h = 50 + r() * 74, bend = (r() - 0.5) * 30, v = winter ? 200 + r() * 55 : 0, gg = winter ? v : 90 + r() * 80;
    g.strokeStyle = winter ? `rgb(${v | 0},${v | 0},${(v + 10) | 0})` : `rgb(${(80 + r() * 70) | 0},${(gg + 40) | 0},${(35 + r() * 30) | 0})`; g.lineWidth = 1.5 + r() * 2.5; g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + bend * 0.3, 128 - h * 0.6, x + bend, 128 - h); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  _grassMat = new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.45, side: THREE.DoubleSide }); _grassMat.userData.w = winter; markShared(_grassMat, t); return _grassMat; }
export function grassGeometry() { const THREE = T(), a = new THREE.PlaneGeometry(1, 0.7).translate(0, 0.35, 0), b = a.clone().rotateY(Math.PI / 2), c = a.clone().rotateY(Math.PI / 4);
  const g = new THREE.BufferGeometry(), parts = [a, b, c], cnt = parts.reduce((s, p) => s + p.attributes.position.count, 0), pos = new Float32Array(cnt * 3), nor = new Float32Array(cnt * 3), uv = new Float32Array(cnt * 2), idx = []; let o = 0;
  for (const p of parts) { pos.set(p.attributes.position.array, o * 3); uv.set(p.attributes.uv.array, o * 2); for (let i = 0; i < p.attributes.position.count; i++) nor.set([0, 1, 0], (o + i) * 3); for (const i of p.index.array) idx.push(i + o); o += p.attributes.position.count; }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); return g; }

