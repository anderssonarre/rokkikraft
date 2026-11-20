// Prestanda: dynamisk renderingsupplösning (Auto) och utvecklarläge med FPS, frame time, draw calls och minne.
// Utvecklarläget slås på/av med F3, eller startas med ?dev i adressen.
export class PerformanceManager {
  constructor(R, { auto = false, onScale } = {}) {
    this.R = R; this.auto = auto; this.onScale = onScale; this.scale = 1; this.avg = 16.7; this.n = 0; this.last = 0; this.hist = [];
    R.info.autoReset = false; // vi nollställer själva per bildruta, annars räknas bara sista efterbehandlingspassets draw calls
    this.dev = /[?&]dev\b/.test(location.search);
    this.key = e => { if (e.code === 'F3') { e.preventDefault(); this.dev = !this.dev; if (!this.dev) this.el?.remove(), this.el = null; } };
    window.addEventListener('keydown', this.key);
  }
  beginFrame() { this.R.info.reset(); const now = performance.now(), dt = this.last ? now - this.last : 16.7; this.last = now;
    if (dt > 0 && dt < 500) { this.avg = this.avg * 0.95 + dt * 0.05; this.n++; this.hist.push(dt); if (this.hist.length > 120) this.hist.shift(); }
    // Auto: sänk upplösningen när snittet ligger över ~19,5 ms (≈ 51 FPS), höj igen när det finns marginal
    if (this.auto && this.n > 90 && this.n % 30 === 0) { const prev = this.scale;
      if (this.avg > 19.5) this.scale = Math.max(0.55, this.scale - 0.08); else if (this.avg < 15.2 && this.scale < 1) this.scale = Math.min(1, this.scale + 0.05);
      if (prev !== this.scale) this.onScale?.(this.scale); } }
  endFrame(extra = {}) { if (!this.dev) return; if (!this.el) { this.el = document.createElement('div'); this.el.style.cssText = 'position:fixed;left:50%;bottom:8px;transform:translateX(-50%);z-index:99;background:rgba(0,0,0,.72);color:#9f9;font:11px/1.35 ui-monospace,monospace;padding:6px 10px;border-radius:6px;pointer-events:none;white-space:pre'; document.body.appendChild(this.el); }
    const now = performance.now(); if (now - (this.tx || 0) < 250) return; this.tx = now; const i = this.R.info, mem = performance.memory, worst = Math.max(...this.hist);
    this.el.textContent = `FPS ${(1000 / this.avg).toFixed(0)}  frame ${this.avg.toFixed(1)} ms (värst ${worst.toFixed(0)} ms)  skala ${(this.scale * 100).toFixed(0)} %\n` +
      `draw calls ${i.render.calls}  trianglar ${(i.render.triangles / 1000).toFixed(0)}k  geometrier ${i.memory.geometries}  texturer ${i.memory.textures}  program ${i.programs?.length ?? '-'}` +
      (mem ? `  JS-heap ${(mem.usedJSHeapSize / 1048576).toFixed(0)} MB` : '') + `\n${extra.level || ''}  ${this.R.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL1'}  ${extra.post ? 'efterbehandling på' : 'efterbehandling av'}  [F3 döljer]`; }
  dispose() { window.removeEventListener('keydown', this.key); this.el?.remove(); }
}
