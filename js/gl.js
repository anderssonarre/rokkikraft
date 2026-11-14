// Liten egen WebGL-renderare: platta färger, riktat ljus, dimma. Inga externa bibliotek.

export const M4 = {
  persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), o = new Float32Array(16); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; },
  look(e, c, u) { let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx; l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]); },
  mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  // bilens modellmatris: lokalt +x = framåt, +z = höger, y upp; heading h, lutning roll/pitch
  car(x, y, z, h, roll = 0, pitch = 0) { const c = Math.cos(h), s = Math.sin(h), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    const F = [c * cp, sp, s * cp], U1 = [-c * sp, cp, -s * sp], R0 = [-s, 0, c];
    const Rt = [R0[0] * cr - U1[0] * sr, R0[1] * cr - U1[1] * sr, R0[2] * cr - U1[2] * sr], U = [U1[0] * cr + R0[0] * sr, U1[1] * cr + R0[1] * sr, U1[2] * cr + R0[2] * sr];
    return new Float32Array([F[0], F[1], F[2], 0, U[0], U[1], U[2], 0, Rt[0], Rt[1], Rt[2], 0, x, y, z, 1]); },
  ident() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },
};

// Meshbyggare: 10 flyttal per hörn (pos3, normal3, färg4). alfa 0 = lackfärg (r = nyans).
export class MB {
  constructor() { this.v = []; }
  tri(a, b, c, col) { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (const p of [a, b, c]) this.v.push(p[0], p[1], p[2], nx, ny, nz, col[0], col[1], col[2], col[3] === undefined ? 1 : col[3]); }
  quad(a, b, c, d, col) { this.tri(a, b, c, col); this.tri(a, c, d, col); }
  // låda med hörn i lokal ram; sx längs x, sy höjd, sz bredd; valfri avfasning i x för tak
  box(cx, y0, cz, sx, sy, sz, col, topInF = 0, topInR = 0, colTop) {
    const x0 = cx - sx / 2, x1 = cx + sx / 2, z0 = cz - sz / 2, z1 = cz + sz / 2, y1 = y0 + sy, tx0 = x0 + topInR, tx1 = x1 - topInF;
    const A = [x0, y0, z0], B = [x1, y0, z0], C = [x1, y0, z1], Dd = [x0, y0, z1], E = [tx0, y1, z0 + 0.0], F = [tx1, y1, z0], G = [tx1, y1, z1], H = [tx0, y1, z1];
    this.quad(E, H, G, F, colTop || col);        // tak
    this.quad(A, E, F, B, col); this.quad(Dd, C, G, H, col);  // sidor
    this.quad(B, F, G, C, col); this.quad(A, Dd, H, E, col);  // fram, bak
  }
  cone(x, y, z, r, h, col, seg = 6) { for (let i = 0; i < seg; i++) { const a = i / seg * 6.2832, b = (i + 1) / seg * 6.2832;
    this.tri([x + Math.cos(a) * r, y, z + Math.sin(a) * r], [x, y + h, z], [x + Math.cos(b) * r, y, z + Math.sin(b) * r], col); } }
  data() { return new Float32Array(this.v); }
}

const VS = `attribute vec3 aP;attribute vec3 aN;attribute vec4 aC;uniform mat4 uVP,uM;uniform vec3 uPaint,uL;varying vec3 vC;varying float vD;
void main(){vec4 w=uM*vec4(aP,1.0);vec3 n=normalize(mat3(uM)*aN);float d=0.58+0.42*max(dot(n,uL),0.0)+0.12*n.y;
vec3 c=mix(uPaint*aC.r,aC.rgb,aC.a);vC=c*d;gl_Position=uVP*w;vD=gl_Position.w;}`;
const FS = `precision mediump float;varying vec3 vC;varying float vD;uniform vec3 uFog;uniform float uFd;
void main(){float f=1.0-exp(-vD*vD*uFd);gl_FragColor=vec4(mix(vC,uFog,clamp(f,0.0,1.0)),1.0);}`;
const PVS = `attribute vec3 aP;attribute vec4 aC;attribute vec2 aU;uniform mat4 uVP;varying vec4 vC;varying vec2 vU;void main(){vC=aC;vU=aU;gl_Position=uVP*vec4(aP,1.0);}`;
const PFS = `precision mediump float;varying vec4 vC;varying vec2 vU;void main(){float d=length(vU);gl_FragColor=vec4(vC.rgb,vC.a*smoothstep(1.0,0.25,d));}`;

export function initGL(canvas) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false }) || canvas.getContext('experimental-webgl');
  if (!gl) return null;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const prog = (v, f) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, v)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, f)); gl.linkProgram(p); return p; };
  const P = prog(VS, FS), PP = prog(PVS, PFS);
  const loc = { aP: gl.getAttribLocation(P, 'aP'), aN: gl.getAttribLocation(P, 'aN'), aC: gl.getAttribLocation(P, 'aC') };
  const U = n => gl.getUniformLocation(P, n);
  const u = { VP: U('uVP'), M: U('uM'), Paint: U('uPaint'), L: U('uL'), Fog: U('uFog'), Fd: U('uFd') };
  const pl = { aP: gl.getAttribLocation(PP, 'aP'), aC: gl.getAttribLocation(PP, 'aC'), aU: gl.getAttribLocation(PP, 'aU'), VP: gl.getUniformLocation(PP, 'uVP') };
  const pbuf = gl.createBuffer();
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  const R = { gl,
    mesh(data) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return { b, n: data.length / 10 }; },
    free(m) { if (m) gl.deleteBuffer(m.b); },
    begin(vp, env) { gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(env.fog[0], env.fog[1], env.fog[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(P); gl.uniformMatrix4fv(u.VP, false, vp); gl.uniform3fv(u.L, env.light); gl.uniform3fv(u.Fog, env.fog); gl.uniform1f(u.Fd, env.fd); R.vp = vp; },
    draw(m, model, paint, noCull) { gl.bindBuffer(gl.ARRAY_BUFFER, m.b);
      gl.enableVertexAttribArray(loc.aP); gl.enableVertexAttribArray(loc.aN); gl.enableVertexAttribArray(loc.aC);
      gl.vertexAttribPointer(loc.aP, 3, gl.FLOAT, false, 40, 0); gl.vertexAttribPointer(loc.aN, 3, gl.FLOAT, false, 40, 12); gl.vertexAttribPointer(loc.aC, 4, gl.FLOAT, false, 40, 24);
      gl.uniformMatrix4fv(u.M, false, model); gl.uniform3fv(u.Paint, paint || [1, 1, 1]);
      if (noCull) gl.disable(gl.CULL_FACE); gl.drawArrays(gl.TRIANGLES, 0, m.n); if (noCull) gl.enable(gl.CULL_FACE); },
    particles(arr, count) { if (!count) return; gl.useProgram(PP); gl.uniformMatrix4fv(pl.VP, false, R.vp);
      gl.bindBuffer(gl.ARRAY_BUFFER, pbuf); gl.bufferData(gl.ARRAY_BUFFER, arr.subarray(0, count * 54), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(pl.aP); gl.enableVertexAttribArray(pl.aC); gl.enableVertexAttribArray(pl.aU);
      gl.vertexAttribPointer(pl.aP, 3, gl.FLOAT, false, 36, 0); gl.vertexAttribPointer(pl.aC, 4, gl.FLOAT, false, 36, 12); gl.vertexAttribPointer(pl.aU, 2, gl.FLOAT, false, 36, 28);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.disable(gl.CULL_FACE);
      gl.drawArrays(gl.TRIANGLES, 0, count * 6);
      gl.disableVertexAttribArray(pl.aU); gl.depthMask(true); gl.disable(gl.BLEND); gl.enable(gl.CULL_FACE); gl.useProgram(P); },
  };
  return R;
}

// ---------- bilmodell ----------
// lokalt: +x fram, y upp, z höger. Lackade ytor har alfa 0.
export function carMesh(body, opts = {}) {
  const m = new MB(), P = s => [s, 0, 0, 0], glass = [0.10, 0.14, 0.18, 1], dark = [0.09, 0.09, 0.10, 1], steel = [0.32, 0.33, 0.35, 1];
  const L = body === 'wagon' ? 4.5 : body === 'sedan' ? 4.3 : 3.95, W = 1.66;
  // underrede + kaross
  m.box(0, 0.28, 0, L, 0.52, W, P(1.0), 0.06, 0.06, P(0.92));
  // hytt
  let cx, cl, inF, inR;
  if (body === 'hatch') { cl = L * 0.60; cx = -L * 0.5 + cl / 2 + 0.12; inF = 0.62; inR = 0.30; }
  else if (body === 'sedan') { cl = L * 0.50; cx = -0.25; inF = 0.60; inR = 0.55; }
  else { cl = L * 0.68; cx = -L * 0.5 + cl / 2 + 0.08; inF = 0.62; inR = 0.12; }
  m.box(cx, 0.80, 0, cl, 0.50, W - 0.14, glass, inF, inR, P(0.96));
  // stolpar/takram i lack: tunn list runt taket
  m.box(cx + (inR - inF) / 2, 1.295, 0, cl - inF - inR + 0.04, 0.03, W - 0.10, P(1.0));
  // dörrnummerskylt (vit ruta)
  for (const z of [W / 2 + 0.006, -W / 2 - 0.006]) { const x0 = cx - 0.42, x1 = cx + 0.30, y0 = 0.40, y1 = 0.76, w = [0.95, 0.95, 0.93, 1];
    if (z < 0) m.quad([x0, y0, z], [x0, y1, z], [x1, y1, z], [x1, y0, z], w); else m.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], w); }
  // stötfångare
  const bum = opts.bars ? steel : dark;
  m.box(L / 2 + 0.05, 0.30, 0, 0.14, 0.20, W + (opts.bars ? 0.06 : -0.04), bum); m.box(-L / 2 - 0.05, 0.30, 0, 0.14, 0.20, W - 0.04, bum);
  // lysen
  m.box(L / 2 + 0.01, 0.58, 0.55, 0.04, 0.13, 0.34, [0.95, 0.92, 0.75, 1]); m.box(L / 2 + 0.01, 0.58, -0.55, 0.04, 0.13, 0.34, [0.95, 0.92, 0.75, 1]);
  m.box(-L / 2 - 0.01, 0.60, 0.58, 0.04, 0.12, 0.30, [0.75, 0.08, 0.06, 1]); m.box(-L / 2 - 0.01, 0.60, -0.58, 0.04, 0.12, 0.30, [0.75, 0.08, 0.06, 1]);
  // hjul
  const wb = L * 0.60;
  for (const x of [wb / 2, -wb / 2]) for (const z of [W / 2 - 0.08, -W / 2 + 0.08]) { m.box(x, 0, z, 0.60, 0.60, 0.22, dark, 0.14, 0.14); m.box(x, 0.18, z + (z > 0 ? 0.10 : -0.10), 0.26, 0.24, 0.04, steel); }
  return m.data();
}

// ---------- banvärlden ----------
export function worldMesh(trk, quality = 1) {
  const m = new MB(), n = trk.n, w = trk.w, S = trk.surf, winter = trk.winter;
  const rnd = mulberry(hash(trk.id));
  const ground = winter ? [0.90, 0.93, 0.96, 1] : [0.27, 0.42, 0.20, 1];
  const verge = winter ? [0.84, 0.88, 0.93, 1] : (trk.surface === 'asfalt' ? [0.33, 0.45, 0.24, 1] : [0.45, 0.42, 0.28, 1]);
  const bank = winter ? [0.96, 0.97, 1.0, 1] : [0.36, 0.30, 0.22, 1];
  const tc = S.col, tc2 = [tc[0] * 0.93, tc[1] * 0.93, tc[2] * 0.93, 1], tc1 = [tc[0], tc[1], tc[2], 1];
  const G = 900; m.quad([-G, -0.06, -G], [-G, -0.06, G], [G, -0.06, G], [G, -0.06, -G], ground);
  const pt = (i, lat, y) => { const ii = w(i); return [trk.X[ii] + trk.NX[ii] * lat, y, trk.Z[ii] + trk.NZ[ii] * lat]; };
  // en remsa mellan två sidoavstånd (funktioner av index); vänd automatiskt så att ovansidan syns
  const strip = (la, lb, y, colf, i0 = 0, i1 = n, ya = y, yb = y) => { for (let i = i0; i < i1; i++) {
    const a = pt(i, la(i), ya), b = pt(i, lb(i), yb), c = pt(i + 1, lb(i + 1), yb), d = pt(i + 1, la(i + 1), ya), col = colf(i);
    m.quad(a, b, c, d, col); m.quad(a, d, c, b, col); } };
  const lim = i => trk.limits(w(i));
  const hw = trk.hw, vg = trk.verge;
  strip(i => lim(i)[0] - vg, i => lim(i)[1] + vg, -0.03, () => verge);
  strip(() => -hw, () => hw, 0, i => (i >> 2) & 1 ? tc1 : tc2);
  // kantlinjer
  const edge = winter ? [0.55, 0.70, 0.85, 1] : trk.surface === 'asfalt' ? [0.92, 0.92, 0.9, 1] : [0.40, 0.33, 0.24, 1];
  strip(() => -hw, () => -hw + 0.35, 0.012, () => edge); strip(() => hw - 0.35, () => hw, 0.012, () => edge);
  // lisälenkki
  const j = trk.joker, jc = [tc[0] * 1.07, tc[1] * 1.05, tc[2] * 1.0, 1];
  strip(i => trk.bulge(i) - j.w / 2, i => trk.bulge(i) + j.w / 2, 0.006, () => jc, j.i1, j.i2);
  // startlinje (schackrutor)
  for (let q = 0; q < 10; q++) for (let r = 0; r < 2; r++) { const la = -hw + q * (2 * hw / 10), lb = la + 2 * hw / 10, c = (q + r) & 1 ? [0.95, 0.95, 0.95, 1] : [0.08, 0.08, 0.08, 1];
    const a = pt(0, la, 0.02), b = pt(0, lb, 0.02); const o = [trk.TX[0] * 0.6 * (r + 1), 0, trk.TZ[0] * 0.6 * (r + 1)], o0 = [trk.TX[0] * 0.6 * r, 0, trk.TZ[0] * 0.6 * r];
    const A = [a[0] + o0[0], 0.02, a[2] + o0[2]], B = [b[0] + o0[0], 0.02, b[2] + o0[2]], C = [b[0] + o[0], 0.02, b[2] + o[2]], Dq = [a[0] + o[0], 0.02, a[2] + o[2]];
    m.quad(A, B, C, Dq, c); m.quad(A, Dq, C, B, c); }
  // vallar
  for (const side of [0, 1]) { const f = i => lim(i)[side] + (side ? vg : -vg), g = i => f(i) + (side ? 1.6 : -1.6), top = i => f(i) + (side ? 0.8 : -0.8);
    strip(f, top, 0, () => bank, 0, n, 0, 0.9); strip(top, g, 0, () => [bank[0] * 0.85, bank[1] * 0.85, bank[2] * 0.85, 1], 0, n, 0.9, 0); }
  // däckstaplar på ön mellan banan och lisälenkkin + koner
  for (let i = j.i1 + 4; i < j.i2 - 3; i += 3) { const b = trk.bulge(i); if (Math.abs(b) < hw + j.w / 2 + 2.5) continue;
    const lat = (Math.sign(b) * hw + (b - Math.sign(b) * j.w / 2)) / 2, p = pt(i, lat, 0);
    m.box(p[0], 0, p[2], 0.9, 0.7, 0.9, i % 2 ? [0.1, 0.1, 0.1, 1] : [0.85, 0.85, 0.85, 1], 0.1, 0.1); }
  for (const i of [j.i1 + 1, j.i1 + 3, j.i2 - 3, j.i2 - 1]) { const p = pt(i, j.side * (hw + 0.4), 0); m.cone(p[0], 0, p[2], 0.28, 0.75, [0.98, 0.42, 0.05, 1], 5); }
  // pilskylt vid infarten till lisälenkkin
  { const p = pt(j.i1 - 2, j.side * (hw + 2.4), 0); m.box(p[0], 0, p[2], 0.14, 1.3, 0.14, [0.3, 0.3, 0.3, 1]); m.box(p[0], 1.3, p[2], 1.5, 0.8, 1.5, [1.0, 0.82, 0.05, 1], 0.5, 0.5); }
  // startportal
  { const a = pt(0, -hw - 1.2, 0), b = pt(0, hw + 1.2, 0), red = [0.8, 0.1, 0.08, 1];
    m.box(a[0], 0, a[2], 0.35, 5.2, 0.35, red); m.box(b[0], 0, b[2], 0.35, 5.2, 0.35, red);
    const steps = 14; for (let q = 0; q < steps; q++) { const t = (q + 0.5) / steps; m.box(a[0] + (b[0] - a[0]) * t, 4.7, a[2] + (b[2] - a[2]) * t, 1.05, 0.55, 1.05, q % 2 ? [0.95, 0.95, 0.95, 1] : [0.1, 0.1, 0.1, 1]); } }
  // flaggposter
  for (let i = 30; i < n; i += Math.round(n / 7)) { const l = lim(i), p = pt(i, l[0] - vg - 3.2, 0); m.box(p[0], 0, p[2], 1.6, 1.1, 1.6, [0.95, 0.75, 0.1, 1]); m.box(p[0], 1.1, p[2], 1.9, 0.12, 1.9, [0.25, 0.25, 0.25, 1]); }
  // depå/kiosk-bodar och publikvall vid starten
  for (let q = 0; q < 5; q++) { const p = pt(-18 + q * 8, trk.outSign * (hw + vg + 9 + (q % 2) * 2), 0); const c = [[0.62, 0.16, 0.12, 1], [0.85, 0.8, 0.7, 1], [0.2, 0.35, 0.55, 1]][q % 3];
    m.box(p[0], 0, p[2], 5, 2.6, 4, c, 0, 0, [0.2, 0.2, 0.22, 1]); }
  // skog
  const trees = quality > 0 ? 420 : 150, dark = winter ? [0.20, 0.30, 0.25, 1] : [0.10, 0.27, 0.13, 1], light = winter ? [0.80, 0.86, 0.88, 1] : [0.14, 0.34, 0.16, 1];
  const minD = hw + vg + j.D + j.w + 8;
  let ext = 0; for (let i = 0; i < n; i++) ext = Math.max(ext, Math.abs(trk.X[i]), Math.abs(trk.Z[i]));
  for (let t = 0, tries = 0; t < trees && tries < trees * 12; tries++) {
    const x = (rnd() * 2 - 1) * (ext + 150), z = (rnd() * 2 - 1) * (ext + 150); let ok = true;
    for (let i = 0; i < n; i += 4) { const dx = x - trk.X[i], dz = z - trk.Z[i]; if (dx * dx + dz * dz < minD * minD) { ok = false; break; } }
    if (!ok) continue; t++;
    const h = 7 + rnd() * 8, r = 1.6 + rnd() * 1.4;
    m.box(x, 0, z, 0.5, h * 0.3, 0.5, [0.25, 0.17, 0.10, 1]);
    m.cone(x, h * 0.22, z, r, h * 0.5, dark); m.cone(x, h * 0.5, z, r * 0.7, h * 0.5, rnd() > 0.5 ? light : dark);
  }
  return m.data();
}

export function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
