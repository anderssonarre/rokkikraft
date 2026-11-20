// Efterbehandling (post-processing) för körvyn.
// Kedja: scen → HDR-mål (half float + djuptextur) → SSAO (halv upplösning, bara djup) → bloom (kvarts upplösning)
//        → komposit (AO, bloom, ACES-tonemapping, GTA IV-inspirerad färggradering per väder, vinjett) → FXAA → skärm.
// Ingen extern kod: egna shaders för three.js r128 (global THREE). Alla mål frigörs i dispose().
const T = () => window.THREE;

const FULLSCREEN_VS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}';

// Skärmrymds-AO enbart från djupbufferten (ingen extra normal-pass → inga extra draw calls).
// Prover på en roterad spiral, radien skalas med avståndet så att effekten är ~konstant i meter.
const AO_FS = `
uniform sampler2D tDepth; uniform vec2 res; uniform float cNear, cFar, projScale, radius, intensity; uniform int samples;
varying vec2 vUv;
float viewDist(float d){ return (cNear*cFar)/((cFar-cNear)*d - cFar) * -1.0; }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
void main(){
  float d0 = texture2D(tDepth, vUv).x; if (d0 >= 0.99999) { gl_FragColor = vec4(1.0); return; }
  float z0 = viewDist(d0); float rpx = clamp(radius*projScale/z0, 2.0, 70.0);
  float ang = hash(vUv*res)*6.2831853, occ = 0.0, wsum = 0.0;
  for (int i = 0; i < 16; i++) { if (i >= samples) break; float fi = float(i)+0.5, t = fi/float(samples);
    float a = ang + fi*2.399963; vec2 off = vec2(cos(a), sin(a)) * rpx * sqrt(t) / res;
    float zs = viewDist(texture2D(tDepth, vUv + off).x), dz = z0 - zs;          // >0: provet ligger framför (skymmer)
    float range = 1.0 - smoothstep(radius*0.6, radius*2.2, dz);              // ignorera långt framförliggande objekt
    occ += step(0.02 + z0*0.0015, dz) * range; wsum += 1.0; }
  float ao = 1.0 - intensity * occ / max(1.0, wsum);
  gl_FragColor = vec4(vec3(clamp(ao, 0.0, 1.0)), 1.0);
}`;

const BRIGHT_FS = `uniform sampler2D tScene; uniform float threshold; varying vec2 vUv;
void main(){ vec3 c = texture2D(tScene, vUv).rgb; float l = dot(c, vec3(0.2126,0.7152,0.0722)); gl_FragColor = vec4(c * smoothstep(threshold, threshold*1.6, l), 1.0); }`;
const BLUR_FS = `uniform sampler2D tSrc; uniform vec2 dir; varying vec2 vUv;
void main(){ vec3 c = texture2D(tSrc, vUv).rgb*0.227027;
  c += (texture2D(tSrc, vUv + dir*1.384615).rgb + texture2D(tSrc, vUv - dir*1.384615).rgb)*0.316216;
  c += (texture2D(tSrc, vUv + dir*3.230769).rgb + texture2D(tSrc, vUv - dir*3.230769).rgb)*0.070270; gl_FragColor = vec4(c,1.0); }`;

// Komposit: AO multipliceras på världen (inte på kupén), bloom adderas, ACES (samma som three r128), sedan färggradering:
// dämpad mättnad, lätt varma högdagrar/kalla skuggor, S-kurva, vinjett. Värdena kommer från väderprofilen.
const COMP_FS = `
uniform sampler2D tScene, tAO, tBloom, tDepth; uniform float useAO, useBloom, bloomStr, exposure, sat, contrast, vign, cockMask; uniform vec3 lift, gain; uniform vec2 aoTexel;
varying vec2 vUv;
vec3 RRTAndODTFit(vec3 v){ vec3 a = v*(v+0.0245786)-0.000090537; vec3 b = v*(0.983729*v+0.4329510)+0.238081; return a/b; }
vec3 aces(vec3 c){ const mat3 I = mat3(vec3(0.59719,0.07600,0.02840), vec3(0.35458,0.90834,0.13383), vec3(0.04823,0.01566,0.83777));
  const mat3 O = mat3(vec3(1.60475,-0.10208,-0.00327), vec3(-0.53108,1.10813,-0.07276), vec3(-0.07367,-0.00605,1.07602));
  c *= exposure/0.6; c = I*c; c = RRTAndODTFit(c); c = O*c; return clamp(c,0.0,1.0); }
void main(){
  vec3 c = texture2D(tScene, vUv).rgb;
  if (useAO > 0.5) { float ao = 0.0; ao += texture2D(tAO, vUv + aoTexel*vec2(-1.0,-1.0)).r; ao += texture2D(tAO, vUv + aoTexel*vec2(1.0,-1.0)).r; ao += texture2D(tAO, vUv + aoTexel*vec2(-1.0,1.0)).r; ao += texture2D(tAO, vUv + aoTexel*vec2(1.0,1.0)).r; ao *= 0.25;
    float isCock = cockMask * step(texture2D(tDepth, vUv).x, 0.99999); c *= mix(ao, 1.0, isCock); }
  if (useBloom > 0.5) c += texture2D(tBloom, vUv).rgb * bloomStr;
  c = aces(c);
  float l = dot(c, vec3(0.2126,0.7152,0.0722)); c = mix(vec3(l), c, sat);                    // dämpad mättnad
  c = c*gain + lift*(1.0-c);                                                                  // varma högdagrar / kalla skuggor
  c = clamp((c-0.5)*contrast + 0.5, 0.0, 1.0); c = c*c*(3.0-2.0*c)*0.18 + c*0.82;              // mjuk S-kurva
  vec2 q = vUv-0.5; c *= 1.0 - vign*dot(q,q)*1.6;                                              // vinjett
  gl_FragColor = vec4(c, 1.0);
}`;

// Kompakt FXAA (luminansbaserad kantutjämning) – ersätter MSAA som inte fungerar mot djuptextur-målet
const FXAA_FS = `uniform sampler2D tSrc; uniform vec2 texel; varying vec2 vUv;
float lu(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
void main(){
  vec3 rgbNW = texture2D(tSrc, vUv + vec2(-1.0,-1.0)*texel).rgb, rgbNE = texture2D(tSrc, vUv + vec2(1.0,-1.0)*texel).rgb, rgbSW = texture2D(tSrc, vUv + vec2(-1.0,1.0)*texel).rgb, rgbSE = texture2D(tSrc, vUv + vec2(1.0,1.0)*texel).rgb, rgbM = texture2D(tSrc, vUv).rgb;
  float lNW = lu(rgbNW), lNE = lu(rgbNE), lSW = lu(rgbSW), lSE = lu(rgbSE), lM = lu(rgbM), lMin = min(lM, min(min(lNW,lNE), min(lSW,lSE))), lMax = max(lM, max(max(lNW,lNE), max(lSW,lSE)));
  vec2 dir = vec2(-((lNW+lNE)-(lSW+lSE)), ((lNW+lSW)-(lNE+lSE)));
  float red = max((lNW+lNE+lSW+lSE)*0.03125, 1.0/128.0), rcp = 1.0/(min(abs(dir.x), abs(dir.y)) + red);
  dir = clamp(dir*rcp, vec2(-8.0), vec2(8.0)) * texel;
  vec3 A = 0.5*(texture2D(tSrc, vUv + dir*(1.0/3.0-0.5)).rgb + texture2D(tSrc, vUv + dir*(2.0/3.0-0.5)).rgb);
  vec3 B = A*0.5 + 0.25*(texture2D(tSrc, vUv + dir*-0.5).rgb + texture2D(tSrc, vUv + dir*0.5).rgb);
  float lB = lu(B); gl_FragColor = vec4((lB < lMin || lB > lMax) ? A : B, 1.0); }`;

// Färggradering per väder (GTA IV-inspirerad: något dämpade färger, varm sol, gråblå regn)
export const GRADES = {
  sol: { sat: 0.84, contrast: 1.06, lift: [0.012, 0.014, 0.022], gain: [1.03, 1.0, 0.94], vign: 0.32, bloom: 0.16, exposure: 1.16 },
  mulet: { sat: 0.76, contrast: 1.03, lift: [0.016, 0.018, 0.024], gain: [0.99, 1.0, 1.0], vign: 0.3, bloom: 0.1, exposure: 1.2 },
  regn: { sat: 0.68, contrast: 1.04, lift: [0.014, 0.02, 0.03], gain: [0.95, 0.99, 1.03], vign: 0.36, bloom: 0.14, exposure: 1.18 },
  dimma: { sat: 0.7, contrast: 0.96, lift: [0.03, 0.032, 0.036], gain: [0.98, 0.99, 1.0], vign: 0.26, bloom: 0.18, exposure: 1.2 },
  sno: { sat: 0.74, contrast: 1.02, lift: [0.016, 0.02, 0.03], gain: [0.97, 1.0, 1.04], vign: 0.28, bloom: 0.2, exposure: 1.08 },
};

export class PostProcessing {
  // opts: { ao: antal AO-prover (0 = av), aoScale, bloom, fxaa, weather }
  constructor(R, opts = {}) { const THREE = T(); this.R = R; this.o = opts; this.ok = false;
    try {
      const gl2 = R.capabilities.isWebGL2, halfOK = gl2 || R.extensions.get('OES_texture_half_float');
      this.type = halfOK ? THREE.HalfFloatType : THREE.UnsignedByteType;
      const mk = (f) => new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: f || this.type, depthBuffer: false, stencilBuffer: false });
      this.scene = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: this.type, depthBuffer: true, stencilBuffer: false });
      this.scene.depthTexture = new THREE.DepthTexture(4, 4); this.scene.depthTexture.type = THREE.UnsignedIntType;
      this.aoRT = mk(THREE.UnsignedByteType); this.bA = mk(); this.bB = mk(); this.ldr = mk(THREE.UnsignedByteType);
      this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.qs = new THREE.Scene(); this.quad.frustumCulled = false; this.qs.add(this.quad);
      const sm = (fs, u) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: FULLSCREEN_VS, fragmentShader: fs, depthTest: false, depthWrite: false });
      this.mAO = sm(AO_FS, { tDepth: { value: this.scene.depthTexture }, res: { value: new THREE.Vector2() }, cNear: { value: 0.1 }, cFar: { value: 1000 }, projScale: { value: 500 }, radius: { value: 0.9 }, intensity: { value: 0.9 }, samples: { value: opts.ao || 8 } });
      this.mBright = sm(BRIGHT_FS, { tScene: { value: this.scene.texture }, threshold: { value: 0.9 } });
      this.mBlur = sm(BLUR_FS, { tSrc: { value: null }, dir: { value: new THREE.Vector2() } });
      this.mComp = sm(COMP_FS, { tScene: { value: this.scene.texture }, tAO: { value: this.aoRT.texture }, tBloom: { value: this.bA.texture }, tDepth: { value: this.scene.depthTexture }, useAO: { value: opts.ao ? 1 : 0 }, useBloom: { value: opts.bloom ? 1 : 0 },
        bloomStr: { value: 0.15 }, exposure: { value: 1.16 }, sat: { value: 0.84 }, contrast: { value: 1.05 }, vign: { value: 0.3 }, cockMask: { value: 0 }, lift: { value: new THREE.Vector3() }, gain: { value: new THREE.Vector3(1, 1, 1) }, aoTexel: { value: new THREE.Vector2() } });
      this.mFXAA = sm(FXAA_FS, { tSrc: { value: this.ldr.texture }, texel: { value: new THREE.Vector2() } });
      this.setWeather(opts.weather || 'sol'); this.ok = true;
    } catch (e) { console.warn('PostProcessing av:', e); this.ok = false; }
  }
  setWeather(w) { const g = GRADES[w] || GRADES.sol, u = this.mComp.uniforms; u.sat.value = g.sat; u.contrast.value = g.contrast; u.lift.value.set(...g.lift); u.gain.value.set(...g.gain); u.vign.value = g.vign; u.bloomStr.value = g.bloom; u.exposure.value = g.exposure; }
  setSize(w, h) { if (!this.ok) return; w = Math.max(4, w | 0); h = Math.max(4, h | 0); if (w === this.w && h === this.h) return; this.w = w; this.h = h;
    this.scene.setSize(w, h); const as = this.o.aoScale || 0.5; this.aoRT.setSize(Math.max(4, w * as | 0), Math.max(4, h * as | 0)); this.bA.setSize(Math.max(4, w / 4 | 0), Math.max(4, h / 4 | 0)); this.bB.setSize(Math.max(4, w / 4 | 0), Math.max(4, h / 4 | 0)); this.ldr.setSize(w, h);
    this.mAO.uniforms.res.value.set(w * as, h * as); this.mComp.uniforms.aoTexel.value.set(1 / (w * as), 1 / (h * as)); this.mFXAA.uniforms.texel.value.set(1 / w, 1 / h); }
  pass(mat, target) { this.quad.material = mat; this.R.setRenderTarget(target); this.R.render(this.qs, this.cam); }
  // Steg 1: anropas före världen ritas
  begin() { const R = this.R; R.setRenderTarget(this.scene); R.setClearColor(0x000000, 1); R.clear(true, true, false); }
  // Steg 2: efter världen (före kupén) – AO behöver världens djup
  afterWorld(cam) { if (!this.o.ao) return; const u = this.mAO.uniforms; u.cNear.value = cam.near; u.cFar.value = cam.far; u.projScale.value = this.h / (2 * Math.tan(cam.fov * Math.PI / 360)) * (this.o.aoScale || 0.5); this.pass(this.mAO, this.aoRT); this.R.setRenderTarget(this.scene); }
  // Steg 3: allt ritat → bloom, komposit, FXAA till skärmen
  end(cockpitDrawn) { const R = this.R;
    if (this.o.bloom) { this.pass(this.mBright, this.bA); const b = this.mBlur.uniforms, tw = 1 / this.bA.width, th = 1 / this.bA.height;
      for (let k = 0; k < 2; k++) { b.tSrc.value = this.bA.texture; b.dir.value.set(tw * (1 + k), 0); this.pass(this.mBlur, this.bB); b.tSrc.value = this.bB.texture; b.dir.value.set(0, th * (1 + k)); this.pass(this.mBlur, this.bA); } }
    this.mComp.uniforms.cockMask.value = cockpitDrawn ? 1 : 0;
    if (this.o.fxaa) { this.pass(this.mComp, this.ldr); this.pass(this.mFXAA, null); } else this.pass(this.mComp, null); }
  dispose() { for (const k of ['scene', 'aoRT', 'bA', 'bB', 'ldr']) try { this[k]?.dispose(); } catch (e) { } try { this.scene?.depthTexture?.dispose(); } catch (e) { }
    for (const m of [this.mAO, this.mBright, this.mBlur, this.mComp, this.mFXAA]) m?.dispose(); this.quad?.geometry.dispose(); }
}
