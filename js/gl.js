// Högdetaljerad WebGL-renderare för Rokkikraft:
// - Procedurgenererad himmel med sol, horisontglöd och moln
// - Blinn-Phong + Fresnel-lackshader med solreflektioner, skuggor och ambient occlusion
// - Detaljerade 3D-rokkirallibilar med runda 16-kantiga hjul, fälgar, bromsskivor, skärmbreddare, störtbur & Nascar-verkko
// - Autentisk 3D In-Car rally-/rokkirallikupé med flockad bräda, störtbur, sidospeglar, Monit-trippmätare och roterande mockaratt med handskar
import { SURF } from './data.js';

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
  // lokal transformation (t.ex. roterande ratt i kupén runt sin axel)
  localRotX(tx, ty, tz, tiltZ, spinX) {
    const cz = Math.cos(tiltZ), sz = Math.sin(tiltZ), cx = Math.cos(spinX), sx = Math.sin(spinX);
    // Rotera först spinX runt X, sedan tiltZ runt Z, sedan translatera till (tx, ty, tz)
    const R = [
      cz, sz, 0, 0,
      -sz * cx, cz * cx, sx, 0,
      sz * sx, -cz * sx, cx, 0,
      tx, ty, tz, 1
    ];
    return new Float32Array(R);
  },
  ident() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },
};

// Meshbyggare: 10 flyttal per hörn (pos3, normal3, färg4).
// alfa 0 = lackfärg med klarlack & solglans (r = nyans 0..1.2).
// alfa 0.5 = glas/ruta med himmelsreflektion.
// alfa 1.0 = vanlig matt/halvmatt yta.
export class MB {
  constructor() { this.v = []; }
  tri(a, b, c, col) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const al = col[3] === undefined ? 1 : col[3];
    for (const p of [a, b, c]) this.v.push(p[0], p[1], p[2], nx, ny, nz, col[0], col[1], col[2], al);
  }
  quad(a, b, c, d, col) { this.tri(a, b, c, col); this.tri(a, c, d, col); }
  box(cx, y0, cz, sx, sy, sz, col, topInF = 0, topInR = 0, colTop, topInZ = 0) {
    const x0 = cx - sx / 2, x1 = cx + sx / 2, z0 = cz - sz / 2, z1 = cz + sz / 2, y1 = y0 + sy;
    const tx0 = x0 + topInR, tx1 = x1 - topInF, tz0 = z0 + topInZ, tz1 = z1 - topInZ;
    const A = [x0, y0, z0], B = [x1, y0, z0], C = [x1, y0, z1], Dd = [x0, y0, z1];
    const E = [tx0, y1, tz0], F = [tx1, y1, tz0], G = [tx1, y1, tz1], H = [tx0, y1, tz1];
    this.quad(E, H, G, F, colTop || col);
    this.quad(A, E, F, B, col); this.quad(Dd, C, G, H, col);
    this.quad(B, F, G, C, col); this.quad(A, Dd, H, E, col);
  }
  // Cylinder / rör längs valfri vektor mellan p0 och p1
  tube(p0, p1, r0, r1, col, seg = 8, cap = false) {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2], l = Math.hypot(dx, dy, dz) || 1;
    const tx = dx / l, ty = dy / l, tz = dz / l;
    let ux = Math.abs(ty) < 0.9 ? 0 : 1, uy = Math.abs(ty) < 0.9 ? 1 : 0, uz = 0;
    let rx = ty * uz - tz * uy, ry = tz * ux - tx * uz, rz = tx * uy - ty * ux;
    const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
    ux = ry * tz - rz * ty; uy = rz * tx - rx * tz; uz = rx * ty - ry * tx;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const A = [p0[0] + (rx * c0 + ux * s0) * r0, p0[1] + (ry * c0 + uy * s0) * r0, p0[2] + (rz * c0 + uz * s0) * r0];
      const B = [p0[0] + (rx * c1 + ux * s1) * r0, p0[1] + (ry * c1 + uy * s1) * r0, p0[2] + (rz * c1 + uz * s1) * r0];
      const C = [p1[0] + (rx * c1 + ux * s1) * r1, p1[1] + (ry * c1 + uy * s1) * r1, p1[2] + (rz * c1 + uz * s1) * r1];
      const D = [p1[0] + (rx * c0 + ux * s0) * r1, p1[1] + (ry * c0 + uy * s0) * r1, p1[2] + (rz * c0 + uz * s0) * r1];
      this.quad(A, B, C, D, col);
      if (cap) {
        this.tri(p0, B, A, col);
        this.tri(p1, D, C, col);
      }
    }
  }
  // Detaljerat 3D-hjul (16-kantigt däck med däckskuldra, djup fälg, 6 ekrar, bromsskiva & bromsok)
  wheel(cx, cy, cz, r, w, isRight) {
    const zIn = cz + (isRight ? -w * 0.5 : w * 0.5);
    const zOut = cz + (isRight ? w * 0.5 : -w * 0.5);
    const zRim = cz + (isRight ? w * 0.44 : -w * 0.44);
    const tireDark = [0.09, 0.09, 0.10, 1], tireTread = [0.13, 0.13, 0.15, 1];
    const rimWhite = [0.92, 0.93, 0.95, 1], hubCol = [0.22, 0.24, 0.28, 1], brakeCol = [0.45, 0.46, 0.48, 1], caliperCol = [0.85, 0.12, 0.10, 1];
    const seg = 16, rRim = r * 0.62, rBrake = r * 0.44;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const x0 = Math.cos(a0), y0 = Math.sin(a0), x1 = Math.cos(a1), y1 = Math.sin(a1);
      // Slitbana
      const A = [cx + x0 * r, cy + y0 * r, zIn], B = [cx + x1 * r, cy + y1 * r, zIn];
      const C = [cx + x1 * r, cy + y1 * r, zOut], D = [cx + x0 * r, cy + y0 * r, zOut];
      this.quad(A, B, C, D, i & 1 ? tireTread : tireDark);
      this.quad(A, D, C, B, i & 1 ? tireTread : tireDark);
      // Däcksida utåt & inåt
      const RO0 = [cx + x0 * rRim, cy + y0 * rRim, zOut], RO1 = [cx + x1 * rRim, cy + y1 * rRim, zOut];
      const RI0 = [cx + x0 * rRim, cy + y0 * rRim, zIn], RI1 = [cx + x1 * rRim, cy + y1 * rRim, zIn];
      this.quad(D, C, RO1, RO0, tireDark); this.quad(D, RO0, RO1, C, tireDark);
      this.quad(A, B, RI1, RI0, tireDark); this.quad(A, RI0, RI1, B, tireDark);
      // Fälgbana & bromsskiva
      this.tri([cx, cy, zRim], RO0, RO1, i % 3 === 0 ? rimWhite : hubCol);
      this.tri([cx, cy, zRim], RO1, RO0, i % 3 === 0 ? rimWhite : hubCol);
      const B0 = [cx + x0 * rBrake, cy + y0 * rBrake, zRim + (isRight ? 0.01 : -0.01)];
      const B1 = [cx + x1 * rBrake, cy + y1 * rBrake, zRim + (isRight ? 0.01 : -0.01)];
      this.tri([cx, cy, zRim], B0, B1, brakeCol);
    }
    // Rött bromsok
    this.box(cx + r * 0.28, cy + r * 0.05, zRim + (isRight ? 0.02 : -0.02), 0.08, 0.12, 0.04, caliperCol);
    // Centrumkåpa
    this.box(cx, cy, zOut + (isRight ? 0.01 : -0.01), 0.09, 0.09, 0.04, [0.15, 0.35, 0.75, 1]);
  }
  cone(x, y, z, r, h, col, seg = 8) {
    for (let i = 0; i < seg; i++) {
      const a = i / seg * 6.2832, b = (i + 1) / seg * 6.2832;
      this.tri([x + Math.cos(a) * r, y, z + Math.sin(a) * r], [x, y + h, z], [x + Math.cos(b) * r, y, z + Math.sin(b) * r], col);
    }
  }
  data() { return new Float32Array(this.v); }
}

// ---------- Shaders: Himmel + PBR-inspirerad lack/glas/skugga ----------
const SKY_VS = `attribute vec2 aP;varying vec2 vP;void main(){vP=aP;gl_Position=vec4(aP,0.9999,1.0);}`;
const SKY_FS = `precision mediump float;varying vec2 vP;uniform vec3 uZenith,uHorizon,uSun;uniform float uPitch;
void main(){
  float h = clamp((vP.y + uPitch) * 0.55 + 0.32, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.62));
  // Mjuka molnband nära horisonten
  float cloud = sin(vP.x * 5.5 + 1.2) * cos(vP.y * 12.0) * smoothstep(0.02, 0.28, h) * smoothstep(0.75, 0.25, h);
  col = mix(col, vec3(0.96, 0.97, 0.99), clamp(cloud * 0.22, 0.0, 0.25));
  // Solgloria
  vec2 sunPos = vec2(0.38, 0.42 - uPitch * 0.5);
  float sd = length((vP - sunPos) * vec2(1.4, 1.0));
  col += uSun * (0.28 * exp(-sd * 4.5) + 0.65 * exp(-sd * 28.0));
  gl_FragColor = vec4(col, 1.0);
}`;

const VS = `attribute vec3 aP;attribute vec3 aN;attribute vec4 aC;
uniform mat4 uVP,uM;uniform vec3 uPaint,uL,uEye;
varying vec3 vW,vN,vBase;varying float vA,vD;
void main(){
  vec4 w = uM * vec4(aP, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(uM) * aN);
  vA = aC.a;
  vBase = aC.a < 0.05 ? uPaint * aC.r : aC.rgb;
  gl_Position = uVP * w;
  vD = gl_Position.w;
}`;

const FS = `precision mediump float;
varying vec3 vW,vN,vBase;varying float vA,vD;
uniform vec3 uL,uFog,uEye;uniform float uFd;
void main(){
  vec3 N = normalize(vN);
  vec3 L = normalize(uL);
  vec3 V = normalize(uEye - vW);
  vec3 H = normalize(L + V);
  float ndl = max(dot(N, L), 0.0);
  float hemi = 0.46 + 0.24 * N.y;
  float diff = hemi + 0.54 * ndl;
  vec3 col = vBase * diff;
  if (vA < 0.05) {
    // Billack: klarlack + Fresnel-himmelsreflektion + skarp solglans
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    float spec = pow(max(dot(N, H), 0.0), 48.0) * 0.65 + pow(max(dot(N, H), 0.0), 12.0) * 0.20;
    vec3 skyRef = mix(vec3(0.55, 0.68, 0.82), vec3(0.85, 0.92, 0.98), clamp(N.y * 0.5 + 0.5, 0.0, 1.0));
    col = mix(col, skyRef, fres * 0.34) + vec3(1.0, 0.98, 0.92) * spec;
  } else if (vA > 0.45 && vA < 0.55) {
    // Glas / vindruta
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.5);
    float spec = pow(max(dot(N, H), 0.0), 64.0) * 0.85;
    vec3 skyRef = vec3(0.52, 0.68, 0.86);
    col = mix(col, skyRef, 0.30 + fres * 0.45) + vec3(1.0) * spec;
  } else {
    float spec = pow(max(dot(N, H), 0.0), 18.0) * 0.12;
    col += vec3(spec);
  }
  float f = 1.0 - exp(-vD * vD * uFd);
  gl_FragColor = vec4(mix(col, uFog, clamp(f, 0.0, 1.0)), 1.0);
}`;

const PVS = `attribute vec3 aP;attribute vec4 aC;attribute vec2 aU;uniform mat4 uVP;varying vec4 vC;varying vec2 vU;void main(){vC=aC;vU=aU;gl_Position=uVP*vec4(aP,1.0);}`;
const PFS = `precision mediump float;varying vec4 vC;varying vec2 vU;void main(){float d=length(vU);gl_FragColor=vec4(vC.rgb,vC.a*smoothstep(1.0,0.2,d));}`;

export function initGL(canvas) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false }) || canvas.getContext('experimental-webgl');
  if (!gl) return null;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const prog = (v, f) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, v)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, f)); gl.linkProgram(p); return p; };
  const P = prog(VS, FS), PP = prog(PVS, PFS), PSky = prog(SKY_VS, SKY_FS);
  const loc = { aP: gl.getAttribLocation(P, 'aP'), aN: gl.getAttribLocation(P, 'aN'), aC: gl.getAttribLocation(P, 'aC') };
  const U = n => gl.getUniformLocation(P, n);
  const u = { VP: U('uVP'), M: U('uM'), Paint: U('uPaint'), L: U('uL'), Fog: U('uFog'), Fd: U('uFd'), Eye: U('uEye') };
  const pl = { aP: gl.getAttribLocation(PP, 'aP'), aC: gl.getAttribLocation(PP, 'aC'), aU: gl.getAttribLocation(PP, 'aU'), VP: gl.getUniformLocation(PP, 'uVP') };
  const skyLoc = {
    aP: gl.getAttribLocation(PSky, 'aP'),
    Zenith: gl.getUniformLocation(PSky, 'uZenith'),
    Horizon: gl.getUniformLocation(PSky, 'uHorizon'),
    Sun: gl.getUniformLocation(PSky, 'uSun'),
    Pitch: gl.getUniformLocation(PSky, 'uPitch'),
  };
  const skyBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
  const pbuf = gl.createBuffer();
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);

  const R = {
    gl,
    mesh(data) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return { b, n: data.length / 10 }; },
    free(m) { if (m) gl.deleteBuffer(m.b); },
    begin(vp, env, eye = [0, 2, 0], pitch = 0) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(env.fog[0], env.fog[1], env.fog[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      // Rita himmel med sol och moln först
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.useProgram(PSky);
      gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
      gl.enableVertexAttribArray(skyLoc.aP);
      gl.vertexAttribPointer(skyLoc.aP, 2, gl.FLOAT, false, 8, 0);
      gl.uniform3fv(skyLoc.Zenith, env.zenith || [0.22, 0.47, 0.78]);
      gl.uniform3fv(skyLoc.Horizon, env.fog);
      gl.uniform3fv(skyLoc.Sun, [1.0, 0.92, 0.72]);
      gl.uniform1f(skyLoc.Pitch, pitch);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disableVertexAttribArray(skyLoc.aP);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);

      gl.useProgram(P);
      gl.uniformMatrix4fv(u.VP, false, vp);
      gl.uniform3fv(u.L, env.light);
      gl.uniform3fv(u.Fog, env.fog);
      gl.uniform1f(u.Fd, env.fd);
      gl.uniform3fv(u.Eye, eye);
      R.vp = vp;
    },
    draw(m, model, paint, noCull) {
      gl.bindBuffer(gl.ARRAY_BUFFER, m.b);
      gl.enableVertexAttribArray(loc.aP); gl.enableVertexAttribArray(loc.aN); gl.enableVertexAttribArray(loc.aC);
      gl.vertexAttribPointer(loc.aP, 3, gl.FLOAT, false, 40, 0);
      gl.vertexAttribPointer(loc.aN, 3, gl.FLOAT, false, 40, 12);
      gl.vertexAttribPointer(loc.aC, 4, gl.FLOAT, false, 40, 24);
      gl.uniformMatrix4fv(u.M, false, model);
      gl.uniform3fv(u.Paint, paint || [1, 1, 1]);
      if (noCull) gl.disable(gl.CULL_FACE);
      gl.drawArrays(gl.TRIANGLES, 0, m.n);
      if (noCull) gl.enable(gl.CULL_FACE);
    },
    clearDepth() {
      gl.clear(gl.DEPTH_BUFFER_BIT);
    },
    particles(arr, count) {
      if (!count) return;
      gl.useProgram(PP); gl.uniformMatrix4fv(pl.VP, false, R.vp);
      gl.bindBuffer(gl.ARRAY_BUFFER, pbuf); gl.bufferData(gl.ARRAY_BUFFER, arr.subarray(0, count * 54), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(pl.aP); gl.enableVertexAttribArray(pl.aC); gl.enableVertexAttribArray(pl.aU);
      gl.vertexAttribPointer(pl.aP, 3, gl.FLOAT, false, 36, 0);
      gl.vertexAttribPointer(pl.aC, 4, gl.FLOAT, false, 36, 12);
      gl.vertexAttribPointer(pl.aU, 2, gl.FLOAT, false, 36, 28);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.disable(gl.CULL_FACE);
      gl.drawArrays(gl.TRIANGLES, 0, count * 6);
      gl.disableVertexAttribArray(pl.aU); gl.depthMask(true); gl.disable(gl.BLEND); gl.enable(gl.CULL_FACE); gl.useProgram(P);
    },
  };
  return R;
}

// ---------- Högdetaljerad 3D-bilmodell enligt Sääntökirja 2026 ----------
// lokalt: +x fram, y upp, z höger (z < 0 är förarsidan/vänster).
export function carMesh(body, opts = {}) {
  const m = new MB(), P = s => [s, 0, 0, 0], glass = [0.09, 0.14, 0.20, 0.5], dark = [0.08, 0.09, 0.11, 1], steel = [0.42, 0.44, 0.48, 1];
  const L = body === 'wagon' ? (opts.chop ? 4.20 : 4.55) : body === 'sedan' ? 4.35 : 3.98, W = 1.72;
  const wb = L * 0.61;

  // 1. Mjuk markskugga (Ambient Occlusion under bilen så den sitter tungt mot vägbanan!)
  const shCol = [0.03, 0.04, 0.05, 1];
  m.quad([-L * 0.52, 0.018, -W * 0.54], [L * 0.52, 0.018, -W * 0.54], [L * 0.52, 0.018, W * 0.54], [-L * 0.52, 0.018, W * 0.54], shCol);

  // 2. Underrede / tröskellådor (helmakotelot)
  m.box(0, 0.19, 0, L - 0.12, 0.14, W - 0.08, dark);

  // 3. Skulpterad huvudkaross (nedre och övre midjelinje + sluttande motorhuv)
  m.box(0, 0.28, 0, L, 0.30, W, P(0.96), 0.04, 0.03, P(1.0), 0.02);
  // Sluttande motorhuv med luftintag och huvsprintar (sokat)
  m.box(L * 0.26, 0.56, 0, L * 0.46, 0.22, W - 0.06, P(1.02), 0.12, 0.0, P(1.06), 0.04);
  m.box(L * 0.28, 0.782, 0, 0.38, 0.025, 0.56, dark); // Luftgaller i huven
  // Bakparti / bagagelucka
  m.box(-L * 0.24, 0.56, 0, L * 0.50, 0.24, W - 0.05, P(0.98), 0.0, 0.06, P(1.02), 0.03);

  // 4. Breddade skärmkanter (flared wheel arches) runt alla 4 hjul
  for (const x of [wb / 2, -wb / 2]) {
    for (const sgn of [-1, 1]) {
      const z = sgn * (W / 2 - 0.01);
      m.box(x, 0.24, z, 0.78, 0.44, 0.12, P(0.88), 0.12, 0.12, P(0.94));
      m.box(x, 0.22, z - sgn * 0.06, 0.68, 0.40, 0.16, [0.05, 0.05, 0.06, 1]); // Mörkt hjulhus
    }
  }

  // 5. Kupé / Hytt med lutande A-, B- och C-stolpar
  let cx, cl, inF, inR;
  if (body === 'hatch') { cl = L * 0.58; cx = -L * 0.5 + cl / 2 + 0.16; inF = 0.58; inR = 0.28; }
  else if (body === 'sedan') { cl = L * 0.50; cx = -0.18; inF = 0.56; inR = 0.50; }
  else if (opts.chop) { cl = L * 0.52; cx = -0.14; inF = 0.58; inR = 0.38; }
  else { cl = L * 0.66; cx = -L * 0.5 + cl / 2 + 0.10; inF = 0.58; inR = 0.14; }

  // Glasparti (med himmelsreflektion a=0.5)
  m.box(cx, 0.78, 0, cl, 0.50, W - 0.14, glass, inF, inR, P(1.04), 0.08);
  // Takplåt med avrundad profil
  const roofLen = cl - inF - inR + 0.06, roofX = cx + (inR - inF) / 2;
  m.box(roofX, 1.27, 0, roofLen, 0.045, W - 0.26, P(1.05), 0.03, 0.03, P(1.08), 0.02);

  // A-, B- och C-stolpar i karosslack
  const xFrontBot = cx + cl / 2, xFrontTop = roofX + roofLen / 2;
  const xRearBot = cx - cl / 2, xRearTop = roofX - roofLen / 2;
  for (const sgn of [-1, 1]) {
    const zBot = sgn * (W / 2 - 0.08), zTop = sgn * (W / 2 - 0.15);
    m.tube([xFrontBot - 0.04, 0.78, zBot], [xFrontTop - 0.02, 1.28, zTop], 0.035, 0.03, P(0.95), 6);
    m.tube([cx + 0.05, 0.78, zBot], [cx + 0.02, 1.28, zTop], 0.04, 0.035, P(0.92), 6);
    m.tube([xRearBot + 0.05, 0.78, zBot], [xRearTop + 0.04, 1.28, zTop], 0.055, 0.045, P(0.95), 6);
  }

  // Synlig störtbur (Turvakaaret, gul/stål) inuti kupén + Apukaari på kapad kombi
  const cageCol = [0.85, 0.68, 0.15, 1];
  m.tube([cx - 0.05, 0.78, -0.58], [cx - 0.05, 1.24, -0.52], 0.028, 0.028, cageCol, 6);
  m.tube([cx - 0.05, 0.78,  0.58], [cx - 0.05, 1.24,  0.52], 0.028, 0.028, cageCol, 6);
  m.tube([cx - 0.05, 1.24, -0.52], [cx - 0.05, 1.24,  0.52], 0.028, 0.028, cageCol, 6);
  m.tube([cx - 0.05, 1.24, -0.50], [cx - 0.05, 0.80,  0.50], 0.024, 0.024, cageCol, 6); // Diagonalstag (8)
  if (body === 'wagon' && opts.chop) {
    m.box(cx - cl / 2 + 0.12, 0.80, 0, 0.06, 0.48, W - 0.22, steel);
  }

  // Rallyspoiler / takvinge bak
  if (body === 'hatch') {
    m.box(roofX - roofLen / 2 + 0.04, 1.31, 0, 0.22, 0.06, W - 0.24, dark);
  } else {
    m.box(-L / 2 + 0.18, 0.84,  0.52, 0.14, 0.10, 0.04, dark);
    m.box(-L / 2 + 0.18, 0.84, -0.52, 0.14, 0.10, 0.04, dark);
    m.box(-L / 2 + 0.16, 0.93, 0, 0.22, 0.035, W - 0.18, P(0.95));
  }

  // 6. KILPAILUNUMEROT (Sääntökirja s. 8):
  // I bakre sidorutorna (≥20 cm, EJ i dörren!), vindrutans övre kant på passagerarsidan samt bakrutan!
  const numBg = opts.bw === 'bw' ? [0.08, 0.08, 0.09, 1] : [0.96, 0.96, 0.94, 1];
  const numFg = opts.bw === 'bw' ? [0.95, 0.95, 0.93, 1] : [0.08, 0.08, 0.09, 1];
  for (const sgn of [-1, 1]) {
    const z = sgn * ((W - 0.15) / 2 - Math.abs(0.18) * 0.08);
    const x0 = cx - cl * 0.34, x1 = cx - 0.04, y0 = 0.83, y1 = 1.16;
    if (sgn < 0) {
      m.quad([x0, y0, z], [x0, y1, z], [x1, y1, z], [x1, y0, z], numBg);
      m.quad([x0 + 0.07, y0 + 0.06, z - 0.004], [x0 + 0.07, y1 - 0.06, z - 0.004], [x1 - 0.07, y1 - 0.06, z - 0.004], [x1 - 0.07, y0 + 0.06, z - 0.004], numFg);
    } else {
      m.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], numBg);
      m.quad([x0 + 0.07, y0 + 0.06, z + 0.004], [x1 - 0.07, y0 + 0.06, z + 0.004], [x1 - 0.07, y1 - 0.06, z + 0.004], [x0 + 0.07, y1 - 0.06, z + 0.004], numFg);
    }
  }
  m.box(cx + cl / 2 - inF * 0.38, 1.14, 0.34, 0.08, 0.11, 0.30, numBg);
  m.box(cx - cl / 2 + inR * 0.38, 1.12, 0.0, 0.08, 0.12, 0.34, numBg);

  // 7. NASCAR-VERKKO i förardörrens öppning (vänster sida z < 0)
  {
    const z = -(W - 0.16) / 2, x0 = cx + 0.02, x1 = cx + 0.42;
    for (let s = 0; s < 4; s++) {
      const y = 0.83 + s * 0.09;
      m.box((x0 + x1) / 2, y, z, x1 - x0, 0.022, 0.015, [0.14, 0.15, 0.18, 1]);
    }
    for (let v = 0; v < 4; v++) {
      const x = x0 + 0.05 + v * 0.10;
      m.box(x, 0.98, z, 0.02, 0.32, 0.015, [0.14, 0.15, 0.18, 1]);
    }
  }

  // 8. KEULAN VAHVISTUS (endast INNANFÖR rambenen: max 60x60mm + stålnät/plåt) & Pohjapanssari
  const bum = opts.bars ? steel : dark;
  const frontW = opts.bars ? W - 0.24 : W - 0.08;
  m.box(L / 2 + 0.03, 0.28, 0, 0.12, 0.18, frontW, bum);
  if (opts.bars) {
    // Pohjapanssari (hasplåt med M10-bultar under fronten)
    m.box(L / 2 - 0.12, 0.20, 0, 0.34, 0.04, frontW * 0.85, steel);
    // 2 vertikala rör vid rambenen + tvärrör 20x50mm mellan skärmarna + stålnät
    m.tube([L / 2 + 0.03, 0.28,  frontW * 0.44], [L / 2 + 0.01, 0.72,  frontW * 0.44], 0.028, 0.028, steel, 6);
    m.tube([L / 2 + 0.03, 0.28, -frontW * 0.44], [L / 2 + 0.01, 0.72, -frontW * 0.44], 0.028, 0.028, steel, 6);
    m.tube([L / 2 + 0.01, 0.70, -frontW * 0.44], [L / 2 + 0.01, 0.70,  frontW * 0.44], 0.024, 0.024, steel, 6);
    m.box(L / 2 + 0.01, 0.50, 0, 0.03, 0.22, frontW, [0.20, 0.22, 0.24, 1]);
  } else {
    // Glaslyktor och plastgrill bortplockade enligt "POISTETTAVAT OSAT AUTOSTA"
    m.box(L / 2 + 0.01, 0.52, 0, 0.03, 0.18, W - 0.22, [0.12, 0.13, 0.15, 1]);
  }

  // Bakre stötfångare + avgasrör bakom B-stolpen + bogseröglor (hinauslenkit)
  m.box(-L / 2 - 0.03, 0.28, 0, 0.12, 0.18, W - 0.08, dark);
  m.tube([-L / 2 + 0.25, 0.20, -0.46], [-L / 2 - 0.06, 0.20, -0.46], 0.04, 0.04, steel, 8, true); // Avgasrör
  m.box(L / 2 + 0.02, 0.24, 0.36, 0.08, 0.04, 0.08, [0.95, 0.22, 0.10, 1]);
  m.box(-L / 2 - 0.02, 0.24, -0.36, 0.08, 0.04, 0.08, [0.95, 0.22, 0.10, 1]);

  // Huvsprintar (sokat)
  m.box(L / 2 - 0.16, 0.77,  0.48, 0.06, 0.018, 0.06, steel);
  m.box(L / 2 - 0.16, 0.77, -0.48, 0.06, 0.018, 0.06, steel);

  // AUTON TURVALLISUUS: Röda bromsljus (min 21W) + orange/röda bakljus vid takkanten/bakrutan
  m.box(roofX - roofLen / 2 - 0.02, 1.22,  0.42, 0.06, 0.07, 0.22, [0.96, 0.10, 0.08, 1]);
  m.box(roofX - roofLen / 2 - 0.02, 1.22, -0.42, 0.06, 0.07, 0.22, [0.96, 0.10, 0.08, 1]);
  m.box(roofX - roofLen / 2 - 0.02, 1.22,  0.0,  0.06, 0.06, 0.26, [0.98, 0.60, 0.05, 1]);

  // Sidospeglar (alltid snyggt formade på kupén)
  for (const sgn of [-1, 1]) {
    const z = sgn * (W / 2 + 0.05);
    m.tube([cx + 0.34, 0.78, sgn * (W / 2 - 0.08)], [cx + 0.32, 0.84, z], 0.02, 0.018, dark, 6);
    m.box(cx + 0.30, 0.81, z + sgn * 0.03, 0.11, 0.085, 0.13, P(1.0), 0.02, 0.01);
  }

  // 9. 4 Runda 16-kantiga 3D-hjul med vita rallyfälgar, bromsskivor & stänkskydd (roiskeläpät)
  for (const x of [wb / 2, -wb / 2]) {
    for (const sgn of [-1, 1]) {
      const z = sgn * (W / 2 - 0.07);
      m.wheel(x, 0.30, z, 0.30, 0.23, sgn > 0);
      m.box(x - 0.33, 0.08, z, 0.025, 0.24, 0.23, [0.12, 0.12, 0.14, 1]); // Styva roiskeläpät
    }
  }
  return m.data();
}

// ---------- 3D In-Car Rally-/Rokkirallikupé (inspirerad av referensbilden!) ----------
// Koordinater i bilens lokala ram (+x framåt, +y upp, +z höger; kameran sitter vid förarplatsen [-0.10, 1.07, -0.32])
export function cockpitMesh() {
  const m = new MB(), P = s => [s, 0, 0, 0];
  const flock = [0.14, 0.16, 0.19, 1], dark = [0.08, 0.09, 0.11, 1], cage = [0.12, 0.13, 0.16, 1];
  const padRed = [0.78, 0.14, 0.12, 1], steel = [0.55, 0.58, 0.62, 1], mirrorGlass = [0.55, 0.70, 0.85, 0.5];

  // 1. Motorhuv och framskärmar som syns framför vindrutan (lackade i bilens färg med klarlack!)
  m.box(1.12, 0.62, 0, 1.32, 0.14, 1.56, P(1.0), 0.10, 0.0, P(1.04), 0.04);
  // Upphöjda framskärmskammar (som i referensbilden) + luftgaller + huvsprintar (sokat)
  m.box(1.18, 0.72, -0.66, 1.10, 0.055, 0.18, P(1.06), 0.08, 0.04);
  m.box(1.18, 0.72,  0.66, 1.10, 0.055, 0.18, P(1.06), 0.08, 0.04);
  m.box(1.15, 0.762, 0.0,  0.34, 0.015, 0.52, dark);
  m.box(1.56, 0.755, -0.46, 0.06, 0.015, 0.06, steel);
  m.box(1.56, 0.755,  0.46, 0.06, 0.015, 0.06, steel);
  // Vindrutetorkare nere vid rutan
  m.tube([0.52, 0.81, -0.52], [0.55, 0.83, -0.02], 0.01, 0.008, dark, 6);
  m.tube([0.52, 0.81,  0.05], [0.55, 0.83,  0.55], 0.01, 0.008, dark, 6);

  // 2. Flockad mörkgrå rally-instrumentbräda + mätarkeps framför föraren
  m.box(0.42, 0.64, 0, 0.42, 0.18, 1.52, flock, 0.04, 0.02);
  // Mätarhuskeps (binnacle) framför ratten (z = -0.32)
  m.box(0.36, 0.81, -0.32, 0.26, 0.11, 0.44, flock, 0.02, 0.02, [0.11, 0.13, 0.16, 1], 0.03);
  // Mätartavla + shift-lights (grön-gul-röd LED-rad överst i mätarhuset!)
  m.box(0.24, 0.82, -0.32, 0.02, 0.085, 0.38, [0.04, 0.06, 0.09, 1]);
  for (let i = 0; i < 9; i++) {
    const lc = i < 4 ? [0.15, 0.88, 0.42, 1] : i < 7 ? [0.98, 0.78, 0.10, 1] : [0.95, 0.18, 0.22, 1];
    m.box(0.23, 0.892, -0.44 + i * 0.03, 0.015, 0.014, 0.022, lc);
  }

  // 3. Mittkonsol med huvudströmbrytare (röd nyckel), startknapp, vippströmbrytare & Monit Rally-trippmätare
  m.box(0.34, 0.56, 0.04, 0.18, 0.26, 0.28, dark);
  m.box(0.25, 0.73, -0.04, 0.02, 0.045, 0.045, [0.92, 0.12, 0.10, 1]); // Röd huvudströmbrytare
  for (let sw = 0; sw < 4; sw++) {
    m.box(0.25, 0.68, -0.02 + sw * 0.045, 0.025, 0.015, 0.015, steel);
  }
  // Monit Rally-trippmätare på höger sida av brädan (blå belyst skärm + knappar)
  m.box(0.38, 0.82, 0.34, 0.08, 0.11, 0.22, dark);
  m.box(0.34, 0.835, 0.34, 0.015, 0.065, 0.14, [0.18, 0.68, 0.95, 1]);
  m.box(0.34, 0.80, 0.25, 0.018, 0.07, 0.025, [0.10, 0.48, 0.85, 1]);
  m.box(0.34, 0.80, 0.43, 0.018, 0.07, 0.025, [0.88, 0.15, 0.15, 1]);

  // Sekventiell växelspak & hydraulisk handbromsspaksrör till höger om ratten
  m.tube([0.14, 0.48, -0.08], [0.08, 0.83, -0.08], 0.012, 0.014, steel, 8);
  m.box(0.08, 0.83, -0.08, 0.038, 0.065, 0.038, [0.12, 0.12, 0.14, 1]);
  m.tube([0.16, 0.50, -0.01], [0.12, 0.86, -0.01], 0.011, 0.013, [0.85, 0.14, 0.12, 1], 8);

  // 4. Störtbur (Turvakaaret: A-stolpar (3), vindrutetvärrör (4), takrör (5, 7), dörrsträvor (6) & Nascar-verkko!)
  // Vänster & höger A-stolpe i störtburen + röd FIA-vaddering
  m.tube([0.48, 0.74, -0.70], [0.06, 1.32, -0.62], 0.030, 0.028, cage, 10);
  m.tube([0.36, 0.90, -0.68], [0.18, 1.15, -0.64], 0.036, 0.036, padRed, 10);
  m.tube([0.48, 0.74,  0.70], [0.06, 1.32,  0.62], 0.030, 0.028, cage, 10);
  // Övre tvärrör vid vindrutans överkant (punkt 4 i Kaaret-ritningen, med svag båge som i referensbilden!)
  m.tube([0.08, 1.31, -0.62], [0.14, 1.28, -0.12], 0.032, 0.030, cage, 10);
  m.tube([0.14, 1.28, -0.12], [0.14, 1.28,  0.12], 0.030, 0.030, cage, 10);
  m.tube([0.14, 1.28,  0.12], [0.08, 1.31,  0.62], 0.030, 0.032, cage, 10);
  // Vit Katsastuskortti-etikett på störtbågen uppe till vänster
  m.box(0.09, 1.30, -0.36, 0.04, 0.025, 0.12, [0.95, 0.95, 0.92, 1]);
  // Längsgående takrör (5, 7) och innertak
  m.tube([0.06, 1.32, -0.62], [-0.55, 1.32, -0.62], 0.026, 0.026, cage, 8);
  m.tube([0.06, 1.32,  0.62], [-0.55, 1.32,  0.62], 0.026, 0.026, cage, 8);
  m.tube([0.12, 1.30,  0.0],  [-0.55, 1.30,  0.0],  0.024, 0.024, cage, 8);
  m.box(-0.22, 1.34, 0, 0.78, 0.03, 1.34, [0.11, 0.13, 0.16, 1]);
  // Backspegel i mitten av vindrutans överkant
  m.box(0.18, 1.22, 0.0, 0.04, 0.065, 0.24, dark);
  m.box(0.16, 1.22, 0.0, 0.01, 0.052, 0.22, mirrorGlass);

  // Nascar-verkko i vänster sidoruta (förardörren z = -0.72) + 0,5 mm metalldörrplåt
  m.box(0.05, 0.55, -0.74, 0.85, 0.36, 0.04, [0.18, 0.20, 0.23, 1]);
  m.box(0.05, 0.55,  0.74, 0.85, 0.36, 0.04, [0.18, 0.20, 0.23, 1]);
  for (let s = 0; s < 4; s++) {
    m.box(0.18, 0.84 + s * 0.09, -0.71, 0.52, 0.018, 0.01, [0.12, 0.13, 0.16, 1]);
  }
  for (let v = 0; v < 4; v++) {
    m.box(-0.02 + v * 0.13, 0.98, -0.71, 0.016, 0.32, 0.01, [0.12, 0.13, 0.16, 1]);
  }

  // 5. Vänster & höger yttre sidospeglar (inspirerade av referensbildens tydliga sidospeglar i bilens lackfärg!)
  for (const sgn of [-1, 1]) {
    const zBase = sgn * 0.72, zOut = sgn * 0.88;
    m.tube([0.38, 0.80, zBase], [0.34, 0.88, zOut], 0.018, 0.016, dark, 8);
    m.tube([0.32, 0.77, zBase], [0.34, 0.85, zOut], 0.016, 0.014, dark, 8);
    // Spegelhus i bilens lack + spegelglas vänt mot föraren
    m.box(0.35, 0.84, zOut + sgn * 0.02, 0.10, 0.095, 0.16, P(1.02), 0.02, 0.01, P(1.06), 0.01);
    m.box(0.30, 0.848, zOut + sgn * 0.02, 0.015, 0.075, 0.135, mirrorGlass);
  }

  return m.data();
}

// ---------- 3D Roterande Mockaratt med telemetridisplay & förarhandskar ----------
// Ritas i lokal origo (0,0,0) och roteras kring X-axeln med bilens styrutslag!
export function steerWheelMesh() {
  const m = new MB();
  const suede = [0.11, 0.12, 0.14, 1], metal = [0.20, 0.22, 0.26, 1], yellow = [0.98, 0.82, 0.08, 1];
  const glove = [0.18, 0.20, 0.24, 1], gloveGrip = [0.95, 0.52, 0.08, 1];
  const R = 0.165, seg = 20;

  // Rattkrans (20 segment med gul centrummarkering högst upp!)
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    const p0 = [0, Math.sin(a0) * R, Math.cos(a0) * R];
    const p1 = [0, Math.sin(a1) * R, Math.cos(a1) * R];
    const isTop = Math.sin((a0 + a1) * 0.5) > 0.95;
    m.tube(p0, p1, 0.021, 0.021, isTop ? yellow : suede, 8);
  }
  // Ekrar & rattnav med telemetriknappar (inspirerat av ratten i referensbilden!)
  m.box(0.005, 0.0, 0.0, 0.018, 0.04, R * 1.85, metal);
  m.box(0.005, -R * 0.45, 0.0, 0.018, R * 0.9, 0.045, metal);
  // Centralt telemetrihus / knappsats mitt i ratten
  m.box(-0.008, 0.01, 0.0, 0.025, 0.105, 0.145, [0.07, 0.08, 0.10, 1]);
  m.box(-0.022, 0.01, 0.0, 0.006, 0.072, 0.095, [0.04, 0.12, 0.18, 1]); // Belyst LCD-skärm i ratten
  // Färgade telemetriknappar (vänster & höger rad som i referensbilden!)
  const btnCols = [[0.15, 0.55, 0.95, 1], [0.95, 0.78, 0.10, 1], [0.15, 0.85, 0.45, 1], [0.92, 0.20, 0.20, 1]];
  for (let b = 0; b < 4; b++) {
    const y = 0.042 - b * 0.022;
    m.box(-0.022, y, -0.058, 0.008, 0.012, 0.012, btnCols[b]);
    m.box(-0.022, y,  0.058, 0.008, 0.012, 0.012, btnCols[(b + 2) % 4]);
  }
  // Vänster och höger rallyhandske som greppar ratten vid kl. 9 och kl. 3
  for (const sgn of [-1, 1]) {
    m.box(-0.01, 0.015, sgn * R, 0.062, 0.078, 0.055, glove, 0.01, 0.01);
    m.box(-0.042, 0.015, sgn * R, 0.012, 0.048, 0.042, gloveGrip);
  }
  return m.data();
}

// ---------- Banvärlden med kerbs, skyddsstängsel, läktare, startportal & gran-/björkskog ----------
export function worldMesh(trk, quality = 1) {
  const m = new MB(), n = trk.n, w = trk.w, winter = trk.winter;
  const rnd = mulberry(hash(trk.id));
  const ground = winter ? [0.90, 0.93, 0.96, 1] : [0.24, 0.39, 0.18, 1];
  const verge = winter ? [0.84, 0.88, 0.93, 1] : (trk.surface === 'asfalt' ? [0.30, 0.44, 0.22, 1] : [0.44, 0.40, 0.27, 1]);
  const bank = winter ? [0.96, 0.97, 1.0, 1] : [0.36, 0.30, 0.22, 1];
  const G = 950; m.quad([-G, -0.06, -G], [-G, -0.06, G], [G, -0.06, G], [G, -0.06, -G], ground);
  const pt = (i, lat, y) => { const ii = w(i); return [trk.X[ii] + trk.NX[ii] * lat, y, trk.Z[ii] + trk.NZ[ii] * lat]; };
  const strip = (la, lb, y, colf, i0 = 0, i1 = n, ya = y, yb = y) => {
    for (let i = i0; i < i1; i++) {
      const a = pt(i, la(i), ya), b = pt(i, lb(i), yb), c = pt(i + 1, lb(i + 1), yb), d = pt(i + 1, la(i + 1), ya), col = colf(i);
      m.quad(a, b, c, d, col); m.quad(a, d, c, b, col);
    }
  };
  const lim = i => trk.limits(w(i));
  const hwAt = i => trk.hwAt ? trk.hwAt(i) : trk.hw;
  const vg = trk.verge;

  // 1. Innerfält / avåkningszon
  strip(i => lim(i)[0] - vg, i => lim(i)[1] + vg, -0.03, () => verge);

  // 2. Körbana med rik texturering (spår i gruset / däckspår i asfalten!)
  strip(i => -hwAt(i), i => hwAt(i), 0, i => {
    const st = trk.surfTypeAt ? trk.surfTypeAt(i) : trk.surface;
    const sc = (SURF[st] || trk.surf).col;
    const shade = ((i >> 1) & 1) ? 1.02 : 0.94;
    return [sc[0] * shade, sc[1] * shade, sc[2] * shade, 1];
  });
  // Idealspår / mörkare hjulspår längs trk.line
  strip(i => trk.line[w(i)] - 1.3, i => trk.line[w(i)] + 1.3, 0.004, i => {
    const st = trk.surfTypeAt ? trk.surfTypeAt(i) : trk.surface;
    const sc = (SURF[st] || trk.surf).col;
    return [sc[0] * 0.86, sc[1] * 0.86, sc[2] * 0.86, 1];
  });

  // 3. Röd-vita curbsen på asfalt & kantlinjer (som i referensbilden!)
  const kerbCol = i => {
    const st = trk.surfTypeAt ? trk.surfTypeAt(i) : trk.surface;
    if (winter) return [0.55, 0.70, 0.85, 1];
    if (st === 'asfalt') return ((i >> 1) & 1) ? [0.88, 0.14, 0.12, 1] : [0.96, 0.96, 0.96, 1];
    return ((i >> 2) & 1) ? [0.46, 0.38, 0.26, 1] : [0.38, 0.31, 0.21, 1];
  };
  strip(i => -hwAt(i) - 0.55, i => -hwAt(i) + 0.15, 0.015, kerbCol);
  strip(i => hwAt(i) - 0.15, i => hwAt(i) + 0.55, 0.015, kerbCol);

  // 4. Separat asfalterad startraka (L = Lähtö)
  if (trk.startChute) {
    const sc = trk.startChute, dx = sc.x1 - sc.x0, dz = sc.z1 - sc.z0, l = Math.hypot(dx, dz) || 1;
    const nx = -dz / l, nz = dx / l, chw = (sc.w || 14) / 2;
    const col = SURF[sc.surface || 'asfalt'].col;
    const A = [sc.x0 - nx * chw, 0.008, sc.z0 - nz * chw], B = [sc.x0 + nx * chw, 0.008, sc.z0 + nz * chw];
    const C = [sc.x1 + nx * chw, 0.008, sc.z1 + nz * chw], D = [sc.x1 - nx * chw, 0.008, sc.z1 - nz * chw];
    m.quad(A, B, C, D, [col[0], col[1], col[2], 1]); m.quad(A, D, C, B, [col[0], col[1], col[2], 1]);
  }

  // 5. Sakkolenkki / Lisälenkki med tydliga rödvita curbsen
  const j = trk.joker, tc = trk.surf.col, jc = [Math.min(1, tc[0] * 1.16), tc[1] * 0.94, tc[2] * 0.86, 1];
  strip(i => trk.bulge(i) - j.w / 2, i => trk.bulge(i) + j.w / 2, 0.006, () => jc, j.i1, j.i2);
  strip(i => trk.bulge(i) - j.w / 2 - 0.35, i => trk.bulge(i) - j.w / 2 + 0.15, 0.016, i => (i & 1) ? [0.92, 0.16, 0.12, 1] : [0.96, 0.96, 0.96, 1], j.i1, j.i2);
  strip(i => trk.bulge(i) + j.w / 2 - 0.15, i => trk.bulge(i) + j.w / 2 + 0.35, 0.016, i => (i & 1) ? [0.92, 0.16, 0.12, 1] : [0.96, 0.96, 0.96, 1], j.i1, j.i2);

  // 6. Startrutor (vita startboxar på gridden som i referensbilden!) + Schackrutig start-/mållinje
  for (let sl = 0; sl < 6; sl++) {
    const row = Math.floor(sl / 3), col = sl % 3, back = 2.5 + row * 3.5, lat = (col - 1) * 3.3;
    const gi = w(n - Math.round(back)), p = pt(gi, lat, 0.018);
    const tx = trk.TX[gi], tz = trk.TZ[gi], nx = trk.NX[gi], nz = trk.NZ[gi];
    // Vit U-formad startruta framför bilen
    const fl = [p[0] + tx * 2.2 - nx * 1.05, 0.02, p[2] + tz * 2.2 - nz * 1.05];
    const fr = [p[0] + tx * 2.2 + nx * 1.05, 0.02, p[2] + tz * 2.2 + nz * 1.05];
    m.tube(fl, fr, 0.08, 0.08, [0.95, 0.95, 0.95, 1], 4);
  }
  for (const idx of [0, trk.finishIdx || 0]) {
    const hwi = hwAt(idx);
    for (let q = 0; q < 12; q++) for (let r = 0; r < 2; r++) {
      const la = -hwi + q * (2 * hwi / 12), lb = la + 2 * hwi / 12, c = (q + r) & 1 ? [0.96, 0.96, 0.96, 1] : [0.08, 0.08, 0.08, 1];
      const a = pt(idx, la, 0.02), b = pt(idx, lb, 0.02);
      const o = [trk.TX[idx] * 0.6 * (r + 1), 0, trk.TZ[idx] * 0.6 * (r + 1)], o0 = [trk.TX[idx] * 0.6 * r, 0, trk.TZ[idx] * 0.6 * r];
      const A = [a[0] + o0[0], 0.02, a[2] + o0[2]], B = [b[0] + o0[0], 0.02, b[2] + o0[2]], C = [b[0] + o[0], 0.02, b[2] + o[2]], Dq = [a[0] + o[0], 0.02, a[2] + o[2]];
      m.quad(A, B, C, Dq, c); m.quad(A, Dq, C, B, c);
    }
  }

  // 7. Vallar (penkat) + stålräcken & skyddsstängsel längs start-/målrakan (som i referensbilden!)
  for (const side of [0, 1]) {
    const f = i => lim(i)[side] + (side ? vg : -vg), g = i => f(i) + (side ? 1.8 : -1.8), top = i => f(i) + (side ? 0.9 : -0.9);
    strip(f, top, 0, () => bank, 0, n, 0, 0.95);
    strip(top, g, 0, () => [bank[0] * 0.82, bank[1] * 0.82, bank[2] * 0.82, 1], 0, n, 0.95, 0);
  }
  // Högt skyddsstängsel med stolpar längs ena sidan av startrakan (som i referensbilden!)
  for (let q = -22; q <= 26; q += 3) {
    const ii = w(q), lat = -(hwAt(ii) + vg - 0.3), p0 = pt(ii, lat, 0);
    m.box(p0[0], 0, p0[2], 0.12, 3.6, 0.12, [0.35, 0.38, 0.42, 1]);
    if (q < 26) {
      const p1 = pt(w(q + 3), -(hwAt(w(q + 3)) + vg - 0.3), 0);
      m.tube([p0[0], 3.5, p0[2]], [p1[0], 3.5, p1[2]], 0.04, 0.04, [0.40, 0.43, 0.48, 1], 4);
      m.tube([p0[0], 1.8, p0[2]], [p1[0], 1.8, p1[2]], 0.03, 0.03, [0.40, 0.43, 0.48, 1], 4);
      m.tube([p0[0], 0.7, p0[2]], [p1[0], 0.7, p1[2]], 0.08, 0.08, [0.65, 0.68, 0.72, 1], 4); // Armco stålräcke
    }
  }

  // 8. Däckstaplar & koner vid lisälenkki + pilskylt + STOP-merkki
  for (let i = j.i1 + 4; i < j.i2 - 3; i += 3) {
    const b = trk.bulge(i), hwi = hwAt(i);
    if (Math.abs(b) < hwi + j.w / 2 + 2.2) continue;
    const lat = (Math.sign(b) * hwi + (b - Math.sign(b) * j.w / 2)) / 2, p = pt(i, lat, 0);
    m.box(p[0], 0, p[2], 0.9, 0.68, 0.9, i % 2 ? [0.12, 0.12, 0.14, 1] : [0.90, 0.16, 0.14, 1], 0.1, 0.1);
  }
  for (const i of [j.i1 + 1, j.i1 + 3, j.i2 - 3, j.i2 - 1]) {
    const p = pt(i, j.side * (hwAt(i) + 0.4), 0);
    m.cone(p[0], 0, p[2], 0.28, 0.78, [0.98, 0.42, 0.05, 1], 6);
  }
  {
    const p = pt(j.i1 - 2, j.side * (hwAt(j.i1) + 2.4), 0);
    m.box(p[0], 0, p[2], 0.14, 1.3, 0.14, [0.3, 0.3, 0.3, 1]);
    m.box(p[0], 1.3, p[2], 1.5, 0.85, 1.5, [1.0, 0.82, 0.05, 1], 0.5, 0.5);
  }
  // STOP-merkki
  {
    const stopIdx = w((trk.finishIdx || 0) + 10);
    const p = pt(stopIdx, trk.outSign * (hwAt(stopIdx) + 2.6), 0);
    m.box(p[0], 0, p[2], 0.12, 1.6, 0.12, [0.7, 0.7, 0.7, 1]);
    m.box(p[0], 1.6, p[2], 0.9, 0.9, 0.15, [0.88, 0.10, 0.08, 1]);
    m.box(p[0], 1.85, p[2], 0.65, 0.25, 0.18, [0.96, 0.96, 0.96, 1]);
  }

  // 9. Stor blå/vit START - MÅL-portal med fackverk och startljusbalk (precis som i referensbilden!)
  {
    const hw0 = hwAt(0), a = pt(0, -hw0 - 1.4, 0), b = pt(0, hw0 + 1.4, 0);
    const truss = [0.12, 0.14, 0.18, 1], bannerBlue = [0.08, 0.26, 0.68, 1];
    m.box(a[0], 0, a[2], 0.55, 6.2, 0.55, truss);
    m.box(b[0], 0, b[2], 0.55, 6.2, 0.55, truss);
    const steps = 16;
    for (let q = 0; q < steps; q++) {
      const t = (q + 0.5) / steps;
      const px = a[0] + (b[0] - a[0]) * t, pz = a[2] + (b[2] - a[2]) * t;
      m.box(px, 5.2, pz, 1.2, 0.95, 1.2, bannerBlue);
      if (q >= 5 && q <= 10) m.box(px, 5.55, pz, 1.24, 0.26, 1.24, [0.95, 0.96, 0.98, 1]);
      if (q >= 6 && q <= 9) m.box(px, 4.85, pz, 0.35, 0.35, 0.35, [0.85, 0.10, 0.12, 1]);
    }
  }

  // 10. Flaggposter (lippupisteet)
  if (trk.posts && trk.posts.length) {
    for (const fp of trk.posts) {
      m.box(fp.x, 0, fp.z, 1.6, 1.2, 1.6, [0.95, 0.75, 0.1, 1]);
      m.box(fp.x, 1.2, fp.z, 1.9, 0.14, 1.9, [0.25, 0.25, 0.25, 1]);
    }
  } else {
    for (let i = 30; i < n; i += Math.round(n / 7)) {
      const l = lim(i), p = pt(i, l[0] - vg - 3.2, 0);
      m.box(p[0], 0, p[2], 1.6, 1.1, 1.6, [0.95, 0.75, 0.1, 1]);
      m.box(p[0], 1.1, p[2], 1.9, 0.12, 1.9, [0.25, 0.25, 0.25, 1]);
    }
  }

  // 11. Depåbyggnader med färgglada teamtak & läktare (som längs högersidan i referensbilden!)
  const roofCols = [[0.85, 0.18, 0.22, 1], [0.15, 0.62, 0.38, 1], [0.92, 0.58, 0.10, 1], [0.18, 0.45, 0.85, 1]];
  const hw0 = hwAt(0);
  for (let q = 0; q < 5; q++) {
    const p = pt(-20 + q * 9, trk.outSign * (hw0 + vg + 8.5), 0);
    m.box(p[0], 0, p[2], 7.2, 3.8, 5.5, [0.88, 0.89, 0.91, 1]);
    m.box(p[0], 3.2, p[2], 7.5, 0.85, 5.8, roofCols[q % roofCols.length]);
    m.box(p[0], 0.2, p[2], 5.2, 2.4, 5.6, [0.14, 0.16, 0.20, 1]); // Mörka depåportar
  }
  if (trk.buildings && trk.buildings.length) {
    for (const b of trk.buildings) {
      m.box(b.x, 0, b.z, b.sx, b.sy, b.sz, b.col, 0, 0, [0.22, 0.24, 0.28, 1]);
      m.box(b.x, b.sy * 0.55, b.z, b.sx + 0.15, b.sy * 0.28, b.sz + 0.15, [0.15, 0.20, 0.26, 0.5]); // Fönsterband
    }
  }

  // 12. Tät finsk gran- och björkskog
  const trees = quality > 0 ? 480 : 160, dark = winter ? [0.20, 0.30, 0.25, 1] : [0.09, 0.26, 0.12, 1], light = winter ? [0.80, 0.86, 0.88, 1] : [0.15, 0.36, 0.17, 1];
  const minD = 36;
  let ext = 0; for (let i = 0; i < n; i++) ext = Math.max(ext, Math.abs(trk.X[i]), Math.abs(trk.Z[i]));
  for (let t = 0, tries = 0; t < trees && tries < trees * 14; tries++) {
    const x = (rnd() * 2 - 1) * (ext + 160), z = (rnd() * 2 - 1) * (ext + 160); let ok = true;
    for (let i = 0; i < n; i += 3) {
      const dx = x - trk.X[i], dz = z - trk.Z[i];
      if (dx * dx + dz * dz < minD * minD) { ok = false; break; }
      const b = trk.bulge(i);
      if (b !== 0) {
        const jx = trk.X[i] + trk.NX[i] * b, jz = trk.Z[i] + trk.NZ[i] * b;
        if ((x - jx) ** 2 + (z - jz) ** 2 < 24 * 24) { ok = false; break; }
      }
    }
    if (ok && trk.startChute) {
      const sc = trk.startChute;
      if (Math.hypot(x - (sc.x0 + sc.x1) / 2, z - (sc.z0 + sc.z1) / 2) < 48) ok = false;
    }
    if (!ok) continue; t++;
    const h = 7.5 + rnd() * 9, r = 1.7 + rnd() * 1.5;
    const isBirch = rnd() < 0.22;
    m.box(x, 0, z, 0.45, h * 0.32, 0.45, isBirch ? [0.88, 0.88, 0.85, 1] : [0.26, 0.17, 0.10, 1]);
    m.cone(x, h * 0.22, z, r, h * 0.45, dark, 7);
    m.cone(x, h * 0.46, z, r * 0.78, h * 0.42, rnd() > 0.5 ? light : dark, 7);
    m.cone(x, h * 0.68, z, r * 0.52, h * 0.36, light, 7);
  }
  return m.data();
}

export function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
