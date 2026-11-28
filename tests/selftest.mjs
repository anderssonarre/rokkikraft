// Rokkikraft självtest – körs med:  node tests/selftest.mjs
// Kontrollerar att alla bilar, motorer, spec-bilar och banor går att bygga och att AI:n kan köra ett varv på varje bana
// utan NaN, utan att fastna och utan att lämna banan för länge. Avslutar med kod 1 om något fel hittas.
globalThis.window = { location: { search: '' }, addEventListener() { } }; globalThis.document = {}; globalThis.localStorage = { getItem() { return null; }, setItem() { } };
const D = await import('../js/data.js'), E = await import('../js/engine.js'), T = await import('../js/track.js'), R = await import('../js/race.js');
let fail = 0, ok = 0; const bad = (m) => { fail++; console.log('  ✗ ' + m); }, good = () => ok++;
const num = (v, m) => Number.isFinite(v) ? good() : bad(m + ' = ' + v);
const full = { strip: 1, cage: 1, seat: 1, net: 1, switch: 1 };

console.log('Bilar');
for (const car of D.CARS) {
  try { const s = E.buildSpec(car.id, { build: full, upg: {} }, E.defaultTune()), k = E.curve(s);
    num(k.hp, car.id + ' hk'); num(s.mass, car.id + ' massa'); num(s.mu, car.id + ' grepp'); if (!(k.hp > 20 && k.hp < 2000)) bad(`${car.id} orimlig effekt ${k.hp}`); else good();
  } catch (e) { bad(car.id + ': ' + e.message); }
}
console.log('Spec-bilar');
for (let l = 1; l <= 5; l++) { const k = E.curve(E.specCar(l)); Math.abs(k.hp - E.SPEC_CARS[l].hp) < 2 ? good() : bad(`Spec ${l}: ${k.hp} hk, väntat ${E.SPEC_CARS[l].hp}`); }

console.log('Mjukkropp (BeamNG-läge)');
{ const { SoftBody } = await import('../js/softbody.js');
  const crush = v => { const sb = new SoftBody(); sb.impact(1, 0, v); for (let i = 0; i < 480 && sb.awake > 0; i++) sb.step(1 / 240); return sb.state(); };
  const a = crush(5).front, b = crush(12).front; (a > 0.02 && b > a * 2 && b < 0.8) ? good() : bad(`frontkrock ger orimlig intryckning: 5 m/s ${a.toFixed(2)}, 12 m/s ${b.toFixed(2)}`);
  const c = (() => { const sb = new SoftBody(); sb.impact(0.7, 0.7, 10); for (let i = 0; i < 480 && sb.awake > 0; i++) sb.step(1 / 240); return sb.state(); })();
  Math.abs(c.toeF) > 0.01 ? good() : bad('hörnsmäll påverkar inte hjulinställningen');
  const p = new SoftBody(); p.impact(1, 0, 15); for (let i = 0; i < 2000; i++) p.step(1 / 240); [...p.p].every(Number.isFinite) && p.awake <= 0 ? good() : bad('mjukkroppen blir instabil eller somnar aldrig'); }
console.log('3D-modeller (manifest + GLB-filer)');
{ const fs = await import('fs'), man = JSON.parse(fs.readFileSync(new URL('../assets/models/manifest.json', import.meta.url))), ids = new Set(D.CARS.map(c => c.id));
  for (const [id, def] of Object.entries(man.cars || {})) { ids.has(id) ? good() : bad(`manifest: okänt bil-id ${id}`);
    try { const b = fs.readFileSync(new URL('../assets/models/' + def.file, import.meta.url)); b.readUInt32LE(0) === 0x46546C67 && b.length < 4e6 ? good() : bad(`${def.file}: inte en GLB eller större än 4 MB`); } catch (e) { bad(`${def.file} saknas`); } }
  try { const b = fs.readFileSync(new URL('../assets/city/city.glb', import.meta.url)); b.readUInt32LE(0) === 0x46546C67 ? good() : bad('city.glb är inte en GLB'); } catch (e) { bad('assets/city/city.glb saknas'); } }
console.log('Banor + AI-varv');
const G = 9.81;
for (const tr of D.TRACKS) {
  try {
    const k = T.getTrack(tr.id); num(k.n, tr.id + ' n');
    if (k.joker?.gates?.length !== 2) bad(tr.id + ': lisälenkki saknar portar'); else good();
    const sp = E.buildSpec('mazda626', { build: full, upg: {} }, { ...E.defaultTune(), tyre: 'ccplus' }), c = R.makeCar({ name: 'test', spec: sp, skill: 1 }, k, 0, false, 1, 1);
    c.diff = 1; R.aiSetup(c, k); c.ai.jokerLap = 99;
    const race = { trk: k, cars: [c], useJoker: false, t: 0, resetCar(c) { const [x, z, h] = k.point(c.i, 0); c.x = x; c.z = z; c.h = h; c.vx = c.vy = c.r = 0; } };
    let off = 0; const dt = 1 / 240;
    while (race.t < 240 && c.prog < 2 * k.n) { R.aiDrive(c, race, dt); R.phys(c, dt, k); R.trackStep(c, k, race.t, false); if (!c.onSurf) off += dt; race.t += dt; if (!Number.isFinite(c.x + c.z + c.vx)) break; }
    if (!Number.isFinite(c.x + c.z + c.vx)) bad(tr.id + ': NaN i fysiken');
    else if (c.prog < 2 * k.n) bad(`${tr.id}: AI kom inte runt 2 varv på 240 s (prog ${Math.round(c.prog)}/${2 * k.n})`);
    else if (off > 25) bad(`${tr.id}: AI utanför banan ${off.toFixed(1)} s`);
    else { good(); console.log(`  ✓ ${tr.id.padEnd(13)} 2 varv ${race.t.toFixed(1)} s, utanför ${off.toFixed(1)} s`); }
  } catch (e) { bad(tr.id + ': ' + e.stack.split('\n').slice(0, 2).join(' ')); }
}
console.log(`\n${ok} kontroller OK, ${fail} fel`);
process.exit(fail ? 1 : 0);
