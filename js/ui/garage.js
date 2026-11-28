// Garage, begagnatmarknad, sponsorer, trimning och bilinställningar.
// (Del av menysystemet – se js/ui.js för render() och åtgärderna.)
import { TYRES, CARS, ENGINES, CLASSES, CLASS_RULES, BUILD, UPG, FUELS, PAINTS, DRIVERS, FAULTS, USED_ADS, USED_SELLERS, SPONSORS } from '../data.js';
import { buildSpec, engineAt, curve, carById, fuelById, defaultTune, fmt, formatCarNum, SETUP_DEF } from '../engine.js';
import { S, save, activeCar } from '../state.js';
import { parseGlb, saveCustomModel, deleteCustomModel, customModelInfo, customModel, materialStats } from '../../graphics/assets/ModelLoader.js';
import { hash, mulberry } from '../gl.js';
import { U, acc, currentInsp, esc, eur, hex, pick, spec, spinTo, stats, stockSpec, toast } from './core.js';
import { xpLevel } from './tavling.js';
import { pid } from './top.js';
import { render } from '../ui.js';

// ---------- garage ----------
export function statRows(s, k, k0) {
  const d = (a, b, dec = 0, inv) => { const x = a - b; return Math.abs(x) < 0.05 ? '' : `<em class="${(x > 0) !== !!inv ? 'up' : 'dn'}">${x > 0 ? '+' : '−'}${fmt(Math.abs(x), dec)}</em>`; };
  const e = engineAt(s, k.peakP.rpm);
  return `<table class="stats"><tr><td>Motor & Teknik</td><td><b>${s.engName}</b> (${fmt(s.Vd, 1)} L · ${s.cyl}-cyl)</td></tr>
    <tr><td>Toppeffekt</td><td>${fmt(k.hp)} hk · ${fmt(k.peakP.P, 1)} kW @ ${fmt(k.peakP.rpm)} ${k0 ? d(k.hp, k0.hp) : ''}</td></tr>
    <tr><td>Toppmoment</td><td>${fmt(k.peakT.T)} Nm @ ${fmt(k.peakT.rpm)} ${k0 ? d(k.peakT.T, k0.peakT.T) : ''}</td></tr>
    <tr><td>Vikt med förare (Reg. tjänstevikt)</td><td>${fmt(s.mass)} kg (regbevis ${fmt(s.regMass)} kg, max 1 800 kg)</td></tr>
    <tr><td>Vikt/effekt</td><td class="${k.kgHp < 5 ? 'good' : k.kgHp > 7 ? 'bad' : ''}">${fmt(k.kgHp, 1)} kg/hk ${k0 ? d(k.kgHp, k0.kgHp, 1, true) : ''}</td></tr>
    <tr><td>Ljudnivå @ 4 500 rpm (gräns 110 dB)</td><td class="${k.db4500 > 110 ? 'bad' : 'good'}">${k.db4500} dB (50 cm / 45°)</td></tr>
    <tr><td>BMEP / FMEP / PMEP</td><td>${fmt(e.bmep, 1)} / ${fmt(e.fmep, 1)} / ${fmt(e.pmep, 2)} bar</td></tr>
    <tr><td>ηV · laddtryck · Ti</td><td>${fmt(e.etaV * 100)} % · ${e.boost > 0.01 ? fmt(e.boost, 2) + ' bar (Super)' : 'Sugmotor'} · ${fmt(e.Ti)} °C</td></tr>
    <tr><td>Kylbehov / kylare</td><td class="${k.maxCool > s.cool * 1.25 ? 'bad' : ''}">${fmt(k.maxCool)} / ${fmt(s.cool)} kW</td></tr>
    <tr><td>Knackmarginal (lägsta)</td><td class="${k.minMargin < 0 ? 'bad' : ''}">${fmt(k.minMargin, 2)}${s.knockCtl ? ' · regleras' : ''}</td></tr>
    <tr><td>Drivning · diff · grepp</td><td>${s.drv === 'fwd' ? 'Fram (Etuveto)' : 'Bak (Takaveto)'}${s.trac ? ' · Lukkoperä' : ' · Öppen diff'} · ×${fmt(s.mu, 2)}</td></tr></table>`;
}
// Bilhandeln: alla bilmodeller med köp/välj (används i garaget och när man saknar bil)
// ---- begagnatmarknaden: billiga bilar med dolda fel (My Summer Car-stil) ----
export function usedOffers() {
  const st = stats(), key = Math.floor((st.races || 0) / 3); // nya annonser var 3:e lopp
  if (S.used?.key === key && S.used.offers) return S.used.offers;
  const pool = CARS.filter(c => !S.cars[c.id] && c.price > 0), r = mulberry(hash(String(key) + pid())), offers = [];
  for (let i = 0; i < 3 && pool.length; i++) { const c = pool.splice(Math.floor(r() * pool.length), 1)[0], fk = Object.keys(FAULTS).filter(() => r() < 0.45);
    if (!fk.length) fk.push(Object.keys(FAULTS)[Math.floor(r() * 5)]);
    const pr = Math.round(c.price * (0.42 + r() * 0.18) / 10) * 10;
    offers.push({ id: 'u' + key + i, car: c.id, price: pr, km: Math.round(180 + r() * 260) * 1000, year: 1984 + Math.floor(r() * 20), ad: USED_ADS[Math.floor(r() * USED_ADS.length)], seller: USED_SELLERS[Math.floor(r() * USED_SELLERS.length)], faults: fk, sold: false }); }
  S.used = { key, offers }; save(); return offers;
}
export function usedMarket() {
  const O = usedOffers();
  return `<section class="panel"><span class="kick">BEGAGNAT · NETTIAUTO</span><h2>Begagnade bilar</h2>
    <p class="dim">Mycket billigare än nya – men du vet inte vad som är fel förrän du kört bilen eller låtit undersöka den. Nya annonser var 3:e lopp.</p>
    <div class="cards">${O.map(o => { const c = carById(o.car), own = !!S.cars[o.car];
      return `<div class="card car"><div class="c-top"><span>${o.year} · ${fmt(o.km)} km</span><b>${o.sold ? 'SÅLD' : eur(o.price)}</b></div><strong>${c.name}</strong><em>”${esc(o.ad)}” – ${esc(o.seller)}</em>
        <p class="dim">Ny: ${eur(c.price)}. Okänt skick.</p>${o.sold ? '' : own ? '<p class="dim">Du äger redan en sådan.</p>' : `<button class="btn small" data-act="used-buy" data-arg="${o.id}" ${S.money >= o.price ? '' : 'disabled'}>Köp begagnad (${eur(o.price)})</button>`}</div>`; }).join('')}</div></section>`;
}
// bilens skick i garaget: kända fel + laga på verkstad eller själv
export function conditionPanel() {
  const cs = activeCar(), F = cs?.faults; if (!F || !Object.keys(F).length) return '';
  const known = Object.entries(F).filter(([, f]) => f.found), open = known.filter(([, f]) => !f.fixed), hidden = Object.values(F).some(f => !f.found);
  return `<section class="panel"><h2>Bilens skick (begagnad)</h2>
    ${known.length ? `<table class="stats">${known.map(([k, f]) => `<tr><td><b>${f.fixed ? '✓' : '⚠'} ${FAULTS[k].name}</b><br><small class="dim">${f.fixed ? 'Lagad' : FAULTS[k].desc}</small></td><td>${f.fixed ? '' : `<button class="btn small" data-act="fault-fix" data-arg="${k}" ${S.money >= FAULTS[k].fix ? '' : 'disabled'}>Verkstad ${eur(FAULTS[k].fix)}</button> <button class="btn small ghost" data-act="fault-diy" data-arg="${k}" ${S.money >= FAULTS[k].diy ? '' : 'disabled'}>Själv ${eur(FAULTS[k].diy)}</button>`}</td></tr>`).join('')}</table>
      <p class="dim">Verkstaden lagar alltid. Laga själv är billigare (bara delar) men lyckas inte alltid – då är delarna slut och du får försöka igen.</p>` : ''}
    ${hidden ? `<p>Bilen har inte undersökts ordentligt. Fel visar sig efter första loppet – eller låt en mekaniker kolla.</p><div class="row"><button class="btn small" data-act="fault-inspect" ${S.money >= 40 ? '' : 'disabled'}>🔍 Undersök bilen (40 €)</button></div>` : !open.length ? '<p class="okbox">Alla kända fel är lagade – bilen är i fint skick.</p>' : ''}</section>`;
}
export function revealFaults(cs, why) { if (!cs?.faults) return; const nw = Object.entries(cs.faults).filter(([, f]) => !f.found); nw.forEach(([, f]) => f.found = true); if (nw.length) U.toast = `🔧 ${why}: ${nw.map(([k]) => FAULTS[k].name).join(', ')}`; }
// ---- sponsorer ----
export function sponsorOffers() { const st = stats(), key = Math.floor((st.races || 0) / 5); if (S.spOffers?.key === key) return S.spOffers.list; const r = mulberry(hash('sp' + key + pid())), L = [...SPONSORS].sort(() => r() - 0.5).slice(0, 3).map(x => ({ ...x, rival: DRIVERS[Math.floor(r() * DRIVERS.length)] || 'Pena Rämäkkö' })); S.spOffers = { key, list: L }; save(); return L; }
export function sponsorPanel() {
  const sp = S.sponsor;
  if (sp) return `<section class="panel"><span class="kick">SPONSOR</span><h2>${esc(sp.name)}</h2><p>${eur(sp.base)} per tävling · bonus ${eur(sp.bonus)} om du klarar: <b>${esc(sp.text)}${sp.goal === 'beat' ? ` (${esc(sp.rival)})` : ''}</b></p>
    <p class="dim">Tävlingar kvar på kontraktet: ${sp.left} · klarade mål hittills: ${sp.hits || 0}</p><div class="row"><button class="btn small ghost" data-act="sp-quit">Säg upp kontraktet</button></div></section>`;
  return `<section class="panel"><span class="kick">SPONSORER</span><h2>Sponsorerbjudanden</h2><p class="dim">En sponsor betalar för varje tävling i karriären och ger en bonus varje gång du klarar deras mål. Kontraktet gäller 3 tävlingar.</p>
    <div class="cards">${sponsorOffers().map((o, i) => `<div class="card"><strong>${esc(o.name)}</strong><p>${eur(o.base)} / tävling<br>Bonus <b>${eur(o.bonus)}</b>: ${esc(o.text)}${o.goal === 'beat' ? ` (${esc(o.rival)})` : ''}</p><button class="btn small" data-act="sp-take" data-arg="${i}">Skriv på</button></div>`).join('')}</div></section>`;
}
export function sponsorEval(ev, me) {
  const sp = S.sponsor; if (!sp) return ''; const ch = ev.ch, fin = ev.over?.final;
  const ok = { top3: me.pos <= 3, clean: (ev.maxDmg || 0) <= 25, heatwin: (ev.heatWins || 0) > 0, final: fin === 'A', finish: !ev.dnf,
    beat: (() => { const r = ch.overall.find(o => o.name === sp.rival); return !r || me.pos < r.pos; })() }[sp.goal];
  const pay = sp.base + (ok ? sp.bonus : 0); S.money += pay; sp.left--; if (ok) sp.hits = (sp.hits || 0) + 1;
  const txt = `💼 ${sp.name}: ${eur(sp.base)}${ok ? ` + bonus ${eur(sp.bonus)} (målet klarat!)` : ' (målet missat)'}`; if (sp.left <= 0) { S.sponsor = null; } return txt + (sp.left <= 0 ? ' · kontraktet är slut' : '');
}
export function carList() {
  return usedMarket() + `<section class="panel"><h2>Bilmodeller (${CARS.length} dokumenterade Rokkirallibilar)</h2><p class="dim"><b>Vetari (etuveto)</b>: Volvo S40/V40, Mazda 3/6, Opel Astra/Vectra, VW Passat B5, Volvo 850/S70/V70 & Ford Mondeo. <b>Kardaani (takaveto)</b>: Opel Kadett/Ascona, Ford Sierra, Volvo 240/740/940, RWD-ombyggd Passat B5/Audi A4 2,8 V6 & BMW E36/E46. <b>Super</b>: Toyota Starlet, Opel Ascona (med Volvo-motor & BMW-låda), Ford Escort, BMW/Sierra Turbo & V8-Volvo!</p><div class="cards cars">${CARS.map(c => {
    const own = S.cars[c.id], ss = own ? spec(c.id) : stockSpec(c.id), kk = curve(ss);
    return `<div class="card car ${S.active === c.id ? 'sel' : ''} ${own ? 'own' : ''}"><div class="c-top"><span>${CLASSES[c.cls].toUpperCase()} · ${fmt(ss.Vd, 1)} L ${ss.cyl}-CYL</span><b>${own ? (S.active === c.id ? 'VALD' : 'ÄGD') : eur(c.price)}</b></div>
      <strong>${c.name}</strong><em>”${c.nick}” – ${c.tag}</em><p>${c.desc}</p>
      <ul><li><b>${ss.engName}</b></li><li>${fmt(kk.hp)} hk · ${fmt(kk.peakT.T)} Nm</li><li>${fmt(ss.mass)} kg (reg. ${c.regMass} kg) · ${fmt(kk.kgHp, 1)} kg/hk</li><li>Varvgräns ${fmt(ss.redline)} rpm${ss.boost ? ' · turbo ' + fmt(ss.boost, 2) + ' bar' : ' · sugmotor'}</li></ul>
      ${own ? (S.active === c.id ? '' : `<button class="btn small" data-act="car-pick" data-arg="${c.id}">Välj bil</button>`) : `<button class="btn small" data-act="car-buy" data-arg="${c.id}" ${S.money >= c.price ? '' : 'disabled'}>Köp (${eur(c.price)})</button>`}</div>`;
  }).join('')}</div></section>`;
}
// Ingen bil kvar (t.ex. såld på myyntitilaisuus): man måste köpa en ny innan man kan tävla eller trimma
export function carShop() {
  const m = U.ev?.saleMsg; return `${m ? `<section class="panel"><div class="okbox">${m}</div></section>` : ''}<section class="panel"><span class="kick">BILHANDELN</span><h1>Du har ingen bil</h1><p>Din bil är såld. Köp en ny bil nedan för att kunna tävla, trimma och besiktiga igen. Du har <b>${eur(S.money)}</b>.</p></section>` + carList();
}
// ---- riktig 3D-modell (GLB) för den aktiva bilen: laddas upp här, sparas i webbläsaren och används i garaget och på banan ----
export function glbPanel(id, carName) {
  const G = U.glb || (U.glb = {}); if (!(id in G)) { G[id] = undefined; customModelInfo(id).then(async i => { if (i && !i.mats.length) { const r = await customModel(id); try { r.mats = matList(await parseGlb(r.buf)); await saveCustomModel(id, r); i.mats = r.mats; } catch (e) { } } G[id] = i || null; if (U.view === 'garage') render(); }).catch(() => { G[id] = null; }); }
  const i = G[id];
  return `<section class="panel"><h2>3D-modell (GLB)</h2>
    <p class="dim">Byt den inbyggda karossen mot en riktig 3D-modell av din ${esc(carName)}. Ladda ner en bil i <b>.glb</b>-format (t.ex. från Sketchfab med "Downloadable" och en licens som tillåter användning, eller en egen från Blender) och välj filen här. Spelet passar in den automatiskt: rätt längd, på marken, och hittar hjulen och lacken själv. Modellen sparas bara i den här webbläsaren. Fysiken påverkas inte.</p>
    ${i === undefined ? '<p class="dim">Läser…</p>' : i ? `<table class="stats"><tr><td>Modell</td><td>${esc(i.name)} (${(i.size / 1048576).toFixed(1)} MB)</td></tr></table>
      <div class="row"><span class="lbl">Justera</span><button class="chip s" data-act="glb-rot">↻ Vrid 90°</button><button class="chip s" data-act="glb-flip">⇄ Vänd fram/bak</button>
        <button class="chip s ${i.paint ? 'on' : ''}" data-act="glb-paint">🎨 Spelets lack ${i.paint ? 'på' : 'av'}</button><button class="btn small ghost danger" data-act="glb-del">Ta bort modellen</button></div>
      ${i.paint && i.mats.length ? `<div class="row wrap"><span class="lbl">Vilken del är lacken?</span><button class="chip s ${!i.paintMat ? 'on' : ''}" data-act="glb-pm" data-arg="">Automatiskt</button>${i.mats.map(m => `<button class="chip s ${i.paintMat === m.name ? 'on' : ''}" data-act="glb-pm" data-arg="${esc(m.name)}">${esc(m.name)} <small>${m.pct} %</small></button>`).join('')}</div>
      <p class="dim">Om fel del blir gul (t.ex. sätena), välj karossens material här. Siffran är hur stor del av modellens yta materialet täcker.</p>` : ''}` : ''}
    <div class="row"><label class="btn small">📂 ${i ? 'Byt modell' : 'Välj GLB-fil'}<input type="file" accept=".glb,model/gltf-binary" data-glb="${esc(id)}" hidden></label></div></section>`;
}
export async function glbUpload(id, file) {
  if (!file) return; if (file.size > 60 * 1048576) { U.toast = 'Filen är för stor (max 60 MB).'; render(); return; }
  try { const buf = await file.arrayBuffer(); const sc = await parseGlb(buf); let meshes = 0; sc.traverse(m => { if (m.isMesh) meshes++; });
    if (!meshes) throw new Error('ingen 3D-modell i filen');
    await saveCustomModel(id, { name: file.name, buf, rot: 0, flip: false, paint: true, mats: matList(sc) }); (U.glb ||= {})[id] = undefined; delete U.glb[id];
    U.glbV = (U.glbV || 0) + 1; U.toast = `✓ 3D-modellen ${file.name} används nu för bilen (${meshes} delar).`;
  } catch (e) { U.toast = 'Kunde inte läsa filen som GLB: ' + (e?.message || e); }
  render();
}
export function matList(sc) { const st = materialStats(sc), tot = st.reduce((x, y) => x + y.area, 0) || 1; return st.slice(0, 10).map(x => ({ name: x.name, pct: Math.round(x.area / tot * 100) })); }
export async function glbEdit(fn) { const id = S.active, r = await customModel(id); if (!r) return; fn(r); await saveCustomModel(id, r); delete U.glb[id]; U.glbV = (U.glbV || 0) + 1; render(); }
export function garage() {
  const cs = activeCar(), car = carById(S.active), insp = currentInsp(), s = insp.spec, k = curve(s), ok = insp.ok;
  const numStr = formatCarNum(cs.num, insp.cls);
  let pv = null;
  if (U.preview) {
    const [uid, lvl] = U.preview;
    const c2 = { ...cs, upg: { ...cs.upg, [uid]: lvl } };
    const s2 = buildSpec(S.active, c2, cs.tune);
    pv = { s: s2, k: curve(s2), u: UPG.find(u => u.id === uid), lvl };
  }
  let h = `<section class="panel showroom"><div id="showroom"></div><div class="sr-label"><b>${car.name}</b><span>#${numStr} · ${insp.rules.name}</span></div></section>
  <section class="panel g-top"><div class="g-info"><span class="kick">${insp.rules.name.toUpperCase()} · #${numStr} · KATSASTUSKORTTI #${cs.katsastusNo || 104}</span><h1>${car.name}</h1>
      <p class="dim">${car.tag}. ${ok ? '<b class="okb">✓ KATSASTETTU & GODKÄND FÖR ' + insp.rules.short.toUpperCase() + '</b>' : '<b class="nob">✗ EJ GODKÄND I BESIKTNINGEN</b>'}</p>
      ${!ok ? `<div class="warnbox" style="margin:8px 0">${insp.issues.map(x => `• ${x}`).join('<br>')}</div>` : ''}
      ${pv ? `<div class="pvbox">Förhandsvisar <b>${pv.u.levels[pv.lvl - 1].name}</b> <button class="btn small ghost" data-act="pv-off">Stäng</button></div>` : ''}
      ${statRows(pv ? pv.s : s, pv ? pv.k : k, pv ? k : null)}
      <div class="row"><button class="btn" data-act="go" data-arg="setup">🔧 Bilinställningar & däck →</button><button class="btn ghost" data-act="go" data-arg="trim">Trimma motorn →</button><button class="btn ghost" data-act="komp-open" data-arg="kaaret">Ritning: Turvakaaret →</button></div></div>
    <div class="g-curve"><canvas id="curve" width="640" height="380" data-pv="${pv ? '1' : ''}"></canvas><div class="legend"><i class="l1"></i>Moment (Nm)<i class="l2"></i>Effekt (kW)${pv ? '<i class="l3"></i>Före' : '<i class="l3"></i>Original'}</div></div></section>`;

  // Klassväljare
  h += `<section class="panel"><h2>Tävlingsklass (Luokka)</h2>
    <div class="chips">${['auto', 'super', 'junior', 'lady', 'senior', 'supersenior'].map(c => {
      const lbl = c === 'auto' ? `Bilens standardklass (${CLASSES[car.cls]})` : CLASSES[c];
      return `<button class="chip ${S.driverCls === c ? 'on' : ''}" data-act="drv-cls" data-arg="${c}">${lbl}</button>`;
    }).join('')}</div>
    <p class="dim" style="margin-top:8px">${insp.rules.desc}</p></section>`;

  // Bygget (Alkukatsastus)
  h += `<section class="panel"><h2>Alkukatsastus – obligatoriska punkter (Sääntökirja 2026)</h2><div class="cards">${BUILD.map(b => {
    const done = cs.build[b.id], lock = b.req && !cs.build[b.req];
    return `<div class="card ${done ? 'own' : ''}"><div class="c-top"><span>KATSASTUS</span><b>${done ? 'GODKÄND ✓' : b.price ? eur(b.price) : 'GRATIS'}</b></div><strong>${b.name}</strong><p>${b.desc}</p><small>${b.kg ? (b.kg > 0 ? '+' : '−') + Math.abs(b.kg) + ' kg' : ''}</small>
      ${done ? '' : lock ? `<span class="lock">KRÄVER ${BUILD.find(x => x.id === b.req).name.toUpperCase()}</span>` : `<button class="btn small" data-act="build" data-arg="${b.id}" ${S.money >= b.price ? '' : 'disabled'}>${b.price ? 'Köp & svetsa/montera' : 'Utför i garaget'}</button>`}</div>`;
  }).join('')}</div></section>`;

  // Bilar
  h += carList();

  // Motoralternativ & Motorbyten (Tekniikanvaihto)
  {
    const isSup = insp.cls === 'super' || insp.cls === 'supersenior' || s.superReady;
    const baseEngs = car.engines || [car.defaultEng];
    const supSwaps = isSup ? ['volvo_b230_bmwbox', 'bmw_m54b30', 'sierra_cosworth', 'volvo_v8_44', 'opel_20_16v'] : [];
    const allEngIds = [...new Set([...baseEngs, ...supSwaps, ...Object.values(ENGINES).filter(e => e.gen && e.id !== 'vw30_v6').map(e => e.id)])].filter(id => ENGINES[id]);
    const curEngId = cs.eng || car.defaultEng;
    const ownedEngs = cs.ownedEngs || [car.defaultEng];
    h += `<section class="panel"><h2>Motoralternativ & Motorbyte (Tekniikanvaihto) – ${car.name}</h2>
      <p class="dim">Välj bland bilmodellens dokumenterade motoralternativ eller gör ett motor-/drivlinebyte. I <b>Super-luokka</b> (och när Super-utrustning monterats) säger karossmodellen lite om tekniken under huven – där kan du även para ihop karossen med t.ex. <b>Volvo 2,3 B230 + BMW-låda</b>, <b>BMW 3,0 M54 rak sexa</b>, <b>Cosworth-turbo</b> eller <b>4,4 V8</b>! <button class="btn small ghost" data-act="komp-open" data-arg="bilar" style="margin-left:6px">📘 Översikt: Bilar & Motorer →</button></p>
      <div class="cards">${allEngIds.map(eid => {
        const eDef = ENGINES[eid], isCur = curEngId === eid, isOwn = ownedEngs.includes(eid) || eDef.price === 0;
        const sTest = buildSpec(S.active, { ...cs, eng: eid }, cs.tune), kTest = curve(sTest);
        return `<div class="card ${isOwn ? 'own' : ''} ${isCur ? 'sel' : ''}"><div class="c-top"><span>${fmt(eDef.Vd, 1)} L · ${eDef.cyl}-CYL${eDef.boost ? ' TURBO' : ' SUG'}</span><b>${isCur ? 'MONTERAD' : isOwn ? 'ÄGD' : eur(eDef.price)}</b></div>
          <strong>${eDef.name}</strong><p>${eDef.desc}</p>
          <ul><li><b>${fmt(kTest.hp)} hk</b> · ${fmt(kTest.peakT.T)} Nm</li><li>${fmt(eDef.Vd, 1)} L · ${eDef.cyl} cylindrar · ${eDef.valves || eDef.cyl * (eDef.Vd >= 1.8 ? 4 : 2)} ventiler</li>
            <li>Bilens vikt ${fmt(sTest.mass - 75)} kg · ${fmt(kTest.kgHp, 1)} kg/hk (${fmt(kTest.hp / (sTest.mass - 75) * 1000)} hk/ton)</li><li>0–100 km/h ≈ <b>${fmt(acc(sTest), 1)} s</b> (asfalt)</li><li>Hjulspinn upp till ≈ ${fmt(spinTo(sTest, 1.0))} km/h på grus, ${fmt(spinTo(sTest, 1.02))} km/h på asfalt</li></ul>
          <div class="row">${isCur ? '' : isOwn ? `<button class="btn small" data-act="eng-pick" data-arg="${eid}">Montera i bilen</button>` : `<button class="btn small" data-act="eng-buy" data-arg="${eid}" ${S.money >= eDef.price ? '' : 'disabled'}>Köp & montera (${eur(eDef.price)})</button>`}</div></div>`;
      }).join('')}</div></section>`;
  }

  // Lack & Tävlingsnummer (Kilpailunumerot s. 8)
  h += `<section class="panel"><h2>Lack & Kilpailunumerot (Takasivulasi ≥ 20 cm, fram-/bakruta ≥ 10 cm)</h2>
    <p class="dim">Enligt Sääntökirja s. 8 måste siffrorna vara <b>svarta på vit botten</b> eller <b>vita på svart botten</b> (inga undantag!) och placeras i <b>bakre sidorutorna</b> (nummer på dörren är förbjudet!). Super har <b>S</b>, Junior <b>J</b> och Lady <b>L</b> framför numret. På tävlingskontoret kostar stora siffror 2 €/st och små 1 €/st.</p>
    <div class="row wrap">${PAINTS.map(p => p.lvl && xpLevel() < p.lvl ? `<button class="swatch locked" style="--c:${hex(p.rgb)}" disabled title="${p.name} – låses upp på nivå ${p.lvl}">🔒</button>` : `<button class="swatch ${cs.paint === p.id ? 'on' : ''}" style="--c:${hex(p.rgb)}" data-act="paint" data-arg="${p.id}" title="${p.name}${p.lvl ? ' (nivå ' + p.lvl + ')' : ''}"></button>`).join('')}
    <span class="lbl">Nummer (${ CLASS_RULES[insp.cls]?.prefix || '1–999' })</span><input class="num" type="number" min="1" max="999" value="${cs.num}" data-in="num">
    <button class="chip s ${cs.bw !== 'bw' ? 'on' : ''}" data-act="num-bw" data-arg="wb">Svart på vit botten</button>
    <button class="chip s ${cs.bw === 'bw' ? 'on' : ''}" data-act="num-bw" data-arg="bw">Vit på svart botten</button></div></section>
  ${conditionPanel()}${glbPanel(S.active, car.name)}`;

  // Delar
  for (const u of UPG) {
    const lvl = cs.upg[u.id] || 0, hasTurbo = s.boost > 0;
    const isSuperCls = insp.cls === 'super' || insp.cls === 'supersenior';
    h += `<section class="panel"><h2>${u.name}</h2><div class="cards">${u.levels.map((L, i) => {
      const n = i + 1, own = lvl >= n, next = lvl === i, needTurbo = u.needsTurbo && !hasTurbo;
      const blockedByCls = (u.onlySuper || L.onlySuper) && !isSuperCls && !s.superReady;
      const blockedFwdDiff = u.rwdOrSuper && s.drv === 'fwd' && !isSuperCls && !s.superReady;
      const blockedFwd = u.needsDriven === 'rear' && s.drv === 'fwd';
      return `<div class="card ${own ? 'own' : ''} ${lvl === n ? 'sel' : ''}"><div class="c-top"><span>NIVÅ ${n}</span><b>${own ? 'MONTERAD' : eur(L.price)}</b></div><strong>${L.name}</strong><p>${L.desc}</p>
        <div class="row">${own ? `<button class="btn small ghost" data-act="unmount" data-arg="${u.id}">Plocka av</button>` : needTurbo ? '<span class="lock">KRÄVER TURBO</span>' : blockedFwd ? '<span class="lock">BARA BAKHJULS-/FYRHJULSDRIFT</span>' : blockedByCls ? '<span class="lock">KRÄVER SUPER-UTRUSTNING / SUPER ROCK</span>' : blockedFwdDiff ? '<span class="lock">ENDAST TAKAVETO ELLER SUPER ROCK</span>' : next ? `<button class="btn small" data-act="buy" data-arg="${u.id}" ${S.money >= L.price ? '' : 'disabled'}>Köp (${eur(L.price)})</button>` : `<span class="lock">KRÄVER NIVÅ ${i}</span>`}
        ${own ? '' : `<button class="btn small ghost" data-act="pv" data-arg="${u.id}:${n}">Förhandsvisa</button>`}<button class="btn small ghost" data-act="komp-open" data-arg="${u.komp}">Regel & teori</button></div></div>`;
    }).join('')}</div></section>`;
  }
  return h;
}
export function drawCurve(cv) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, cs = activeCar(), s = spec(), k = curve(s);
  let ref, cur, sC;
  if (U.view === 'garage' && U.preview) {
    ref = k; const [uid, lvl] = U.preview;
    const s2 = buildSpec(S.active, { ...cs, upg: { ...cs.upg, [uid]: lvl } }, cs.tune);
    cur = curve(s2); sC = s2;
  } else { ref = curve(stockSpec(S.active)); cur = k; sC = s; }
  const maxR = Math.max(sC.redline, 6500), maxT = Math.max(cur.peakT.T, ref.peakT.T) * 1.15, maxP = Math.max(cur.peakP.P, ref.peakP.P) * 1.15;
  const L = 52, Rr = 52, T = 16, B = 34, x = r => L + (r - 1000) / (maxR - 1000) * (W - L - Rr), yT = t => H - B - t / maxT * (H - T - B), yP = p => H - B - p / maxP * (H - T - B);
  g.clearRect(0, 0, W, H); g.font = '12px ui-monospace, Menlo, monospace'; g.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = H - B - i / 4 * (H - T - B); g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(L, y); g.lineTo(W - Rr, y); g.stroke();
    g.fillStyle = '#ffd400'; g.textAlign = 'right'; g.fillText(Math.round(maxT * i / 4), L - 8, y + 4); g.fillStyle = '#ff6a3d'; g.textAlign = 'left'; g.fillText(Math.round(maxP * i / 4), W - Rr + 8, y + 4);
  }
  g.fillStyle = '#8b939c'; g.textAlign = 'center'; for (let r = 2000; r <= maxR; r += 1000) g.fillText(r, x(r), H - 12);
  const line = (pts, f, col, w, dash) => { g.beginPath(); pts.forEach((p, i) => { const X = x(p.rpm), Y = f(p); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.stroke(); g.setLineDash([]); };
  line(ref.pts, p => yT(Math.max(0, p.T)), 'rgba(255,255,255,.35)', 1.5, [5, 5]); line(ref.pts, p => yP(Math.max(0, p.P)), 'rgba(255,255,255,.35)', 1.5, [5, 5]);
  line(cur.pts, p => yT(Math.max(0, p.T)), '#ffd400', 3); line(cur.pts, p => yP(Math.max(0, p.P)), '#ff6a3d', 3);
}
// ---------- trimning ----------
export function trim() {
  const cs = activeCar(), t = cs.tune, s = spec(), k = curve(s), rpm = k.peakP.rpm, e = engineAt(s, rpm), f = s.fuel, hasBias = (cs.upg.broms || 0) > 0;
  const bar = (name, v, tot, cls) => `<div class="mep"><span>${name}</span><div><i class="${cls}" style="width:${Math.max(1, Math.abs(v) / tot * 100)}%"></i></div><b>${fmt(v, 2)} bar · ${fmt(v / tot * 100, 1)} %</b></div>`;
  const topV = () => s.redline / (s.gears[s.gears.length - 1] * s.final) / 9.5493 * s.rw * 3.6;
  return `<section class="panel"><span class="kick">MOTORSTYRNING</span><h1>Trimningsbänken</h1><p class="dim">Värdena nedan gäller vid effekttoppen ${fmt(rpm)} rpm. Ändringarna sparas direkt på ${carById(S.active).name}.</p>
    <div class="row wrap"><button class="btn small" data-act="preset" data-arg="power">🔥 Max effekt (λ 0,90 · +3°)</button><button class="btn small ghost" data-act="preset" data-arg="race">🏁 Balanserad (λ 0,95 · 0°)</button>
      <button class="btn small ghost" data-act="preset" data-arg="eco">🌱 Snål (λ 1,08 · +2°)</button><button class="btn small ghost" data-act="preset" data-arg="safe">🛡 Knacksäker (λ 0,86 · −5°)</button></div>
    <div class="sliders">
      <label><span>Luft/bränsle-tal λ <b>${fmt(t.lambda, 2)}</b></span><input type="range" min="0.75" max="1.3" step="0.01" value="${t.lambda}" data-in="lambda"><small>0,75 fet · 0,90 max effekt · 1,00 stökiometrisk · 1,10 bäst ηb</small></label>
      <label><span>Tändläge relativt MBT <b>${t.ign > 0 ? '+' : ''}${fmt(Math.min(t.ign, s.ignMax))}°</b></span><input type="range" min="-15" max="${s.ignMax}" step="1" value="${Math.min(t.ign, s.ignMax)}" data-in="ign"><small>−15° sen och säker · 0° MBT · +${s.ignMax}° tidig${s.ignMax < 10 ? ' (justerbar tändning ger +10°)' : ''}${s.knockCtl && e.ign < t.ign ? ` · knackregleringen backar till ${fmt(e.ign, 1)}°` : ''}</small></label>
      <label><span>Slutväxel <b>${fmt(t.finalScale, 2)}× (${fmt(s.final, 2)})</b></span><input type="range" min="0.85" max="1.2" step="0.01" value="${t.finalScale}" data-in="finalScale"><small>0,85 lång (toppfart) · 1,20 kort (acceleration) · utväxlad toppfart på högsta växeln ${fmt(topV())} km/h</small></label>
      <label class="${hasBias ? '' : 'off'}"><span>Bromsbalans fram <b>${fmt(t.bias * 100)} %</b></span><input type="range" min="0.5" max="0.75" step="0.01" value="${t.bias}" data-in="bias" ${hasBias ? '' : 'disabled'}><small>${hasBias ? 'Mer bak hjälper bilen att svänga in, men bakhjulen låser tidigare.' : 'Kräver Bromsar nivå 1 i Garaget.'}</small></label></div></section>
  <section class="panel"><h2>Bränsle</h2><div class="cards">${FUELS.map(x => { const own = S.fuels.includes(x.id);
    return `<div class="card ${t.fuel === x.id ? 'sel own' : own ? 'own' : ''}"><div class="c-top"><span>${x.short}</span><b>${t.fuel === x.id ? 'AKTIV' : own ? 'ÄGD' : eur(x.price)}</b></div><strong>${x.name}</strong><p>${x.desc}</p>
      <ul><li>Knackgräns ${fmt(x.knock, 1)}</li><li>LHV ${fmt(x.lhv, 1)} MJ/kg · (A/F)s ${fmt(x.afs, 1)}</li><li>Förångningskylning −${x.cool} K</li></ul>
      ${t.fuel === x.id ? '' : own ? `<button class="btn small" data-act="fuel" data-arg="${x.id}">Tanka</button>` : `<button class="btn small" data-act="fuel-buy" data-arg="${x.id}" ${S.money >= x.price ? '' : 'disabled'}>Lås upp (${eur(x.price)})</button>`}</div>`; }).join('')}</div></section>
  <section class="panel g-top"><div class="g-info"><h2>Telemetri vid ${fmt(rpm)} rpm</h2>
      <div class="tiles"><div><span>Effekt</span><b>${fmt(e.P, 1)} kW</b><small>${fmt(e.P * 1.36)} hk</small></div><div><span>Moment</span><b>${fmt(e.T)} Nm</b></div>
        <div><span>Verkningsgrad ηb</span><b>${fmt(e.etab * 100, 1)} %</b></div><div class="${e.margin < 0 ? 'bad' : ''}"><span>Knackmarginal</span><b>${fmt(e.margin, 2)}</b><small>lägsta ${fmt(k.minMargin, 2)}</small></div>
        <div><span>BSFC</span><b>${fmt(e.bsfc)} g/kWh</b></div><div><span>Faktisk A/F</span><b>${fmt(e.af, 1)}</b><small>stök. ${fmt(f.afs, 1)}</small></div>
        <div><span>Laddtryck · Ti</span><b>${e.boost > 0.01 ? fmt(e.boost, 2) + ' bar' : 'Sug'}</b><small>${fmt(e.Ti)} °C · ηV ${fmt(e.etaV * 100)} %</small></div>
        <div class="${k.maxCool > s.cool * 1.25 ? 'bad' : ''}"><span>Kylbehov</span><b>${fmt(k.maxCool)} kW</b><small>kylare ${fmt(s.cool)} kW</small></div></div>
      <p class="${k.minMargin < 0 ? 'warnbox' : 'okbox'}">${f.name} (knackgräns ${fmt(f.knock, 1)}): ${k.minMargin < 0 ? (s.knockCtl ? '⚠ Knackregleringen får backa tändningen – du tappar effekt.' : '⚠ Motorn knackar. Den tappar effekt och tar skada under heatet. Kör fetare, senare tändning eller bättre bränsle.') : '✓ Ingen knack i hela registret.'}</p></div>
    <div class="g-curve"><canvas id="curve" width="640" height="380"></canvas><div class="legend"><i class="l1"></i>Moment (Nm)<i class="l2"></i>Effekt (kW)<i class="l3"></i>Original</div></div></section>
  <section class="panel"><h2>Energiflödet (MEP-kedjan)</h2>
    ${bar('Bränsle (FUELMEP)', e.fuelmep, e.fuelmep, 'f1')}${bar('Förbränt (QMEP)', e.qmep, e.fuelmep, 'f2')}${bar('Oförbränt (CLMEP)', e.clmep, e.fuelmep, 'f6')}${bar('Avgas (ExMEP)', e.exmep, e.fuelmep, 'f3')}${bar('Kylvatten (HTMEP)', e.htmep, e.fuelmep, 'f4')}
    ${bar('Indikerat (IMEPg)', e.imep, e.fuelmep, 'f2')}${bar('Pumpning (PMEP)', e.pmep, e.fuelmep, 'f6')}${bar('Friktion (FMEP)', e.fmep, e.fuelmep, 'f6')}${bar('Broms (BMEP)', e.bmep, e.fuelmep, 'f5')}
    <p class="dim">FUELMEP ${fmt(e.fuelmep, 1)} → QMEP ${fmt(e.qmep, 1)} → IMEPg ${fmt(e.imep, 1)} → BMEP ${fmt(e.bmep, 1)} bar</p></section>`;
}
// ---------- bilinställningar (justeringar gratis; däck och fälgar kostar) ----------
export const SETUP_UI = [
  ['Fjädring', 'spring', 1, 10, 1, v => v <= 3 ? 'mjuk' : v >= 8 ? 'styv' : 'medel', 'Mjukt är bäst på grus och is, styvt på asfalt.'],
  ['Dämpare', 'damper', 1, 10, 1, v => v <= 3 ? 'mjuk' : v >= 8 ? 'hård' : 'medel', 'Hårda dämpare håller bilen stilla på asfalt men studsar på gupp.'],
  ['Däcktryck', 'press', 1.0, 3.0, 0.05, v => fmt(v, 2) + ' bar', '2,0 bar är neutralt. Lägre tryck ger mer grepp på grus men slarvigare styrning, mer slitage och lite mer rullmotstånd. Högre tryck ger skarpare styrning men mindre grepp.'],
  ['Camber', 'camber', -5, 1, 0.1, v => fmt(v, 1) + '°', 'Runt −2° ger mest grepp i kurvorna.'],
  ['Toe fram', 'toeF', -1, 1, 0.05, v => (v > 0 ? '+' : '') + fmt(v, 2) + '° ' + (v > 0 ? 'toe-in' : v < 0 ? 'toe-out' : ''), 'Toe-out ger skarpare instyrning, toe-in stabilitet.'],
  ['Toe bak', 'toeR', -1, 1, 0.05, v => (v > 0 ? '+' : '') + fmt(v, 2) + '°', 'Lite toe-in bak gör bilen stabil; toe-out gör den lös.'],
  ['Markfrigång fram', 'rideF', 5, 30, 1, v => fmt(v) + ' cm', 'Lågt = lägre tyngdpunkt, men skrapar på grus under ca 9 cm.'],
  ['Markfrigång bak', 'rideR', 5, 30, 1, v => fmt(v) + ' cm', ''],
  ['Bakvagnens höjd (rake)', 'rake', -5, 10, 0.5, v => (v > 0 ? '+' : '') + fmt(v, 1) + ' cm', 'Högre bakvagn flyttar grepp framåt → mer överstyrning.'],
  ['Växellåda – spridning', 'gearSpread', 0.8, 1.2, 0.01, v => fmt(v, 2) + '×', '<1 tätare växlar, >1 glesare.'],
  ['Slutväxel', 'finalScale', 0.85, 1.2, 0.01, v => fmt(v, 2) + '×', 'Kort = acceleration, lång = toppfart.'],
  ['Bromskraft', 'brakeF', 0.6, 1.3, 0.01, v => fmt(v * 100) + ' %', ''],
  ['Bromsbalans fram', 'bias', 0.5, 0.75, 0.01, v => fmt(v * 100) + ' %', 'Mer bak gör att bilen svänger in vid inbromsning.'],
  ['Fälgdiameter', 'rim', 20, 60, 1, v => fmt(v) + ' cm', 'Påverkar hjulradien och därmed utväxlingen. Nya fälgar 220 €.'],
  ['Däckbredd', 'width', 5, 60, 1, v => fmt(v) + ' cm', 'Bredare = mer grepp men mer vikt och luftmotstånd. Kräver en ny däcksats.'],
];
export function setup() {
  const cs = activeCar(), t = cs.tune, s = spec(), k = curve(s), car = carById(S.active), chip = (cs.upg.chip || 0) > 0;
  const top = s.redline / (s.gears[s.gears.length - 1] * s.final) / 9.5493 * s.rw * 3.6;
  return `<section class="panel"><span class="kick">GARAGE · JUSTERINGAR GRATIS · DÄCK OCH FÄLGAR KOSTAR</span><h1>Bilinställningar – ${car.name}</h1>
    <div class="pills"><div><span>Effekt</span><b>${fmt(k.hp)} hk</b><small>${s.engName}</small></div><div><span>Vikt</span><b>${fmt(s.mass - 75)} kg</b><small>${fmt(k.kgHp, 1)} kg/hk</small></div>
      <div><span>0–100 km/h</span><b>${fmt(acc(s), 1)} s</b><small>asfalt</small></div><div><span>Greppbegränsad till</span><b>${fmt(spinTo(s, 1.0))} km/h</b><small>på grus – därefter avgör effekten</small></div><div><span>Fart vid varvstopp i högsta</span><b>${fmt(top)} km/h</b></div><div><span>Grepp fram / bak</span><b>${fmt(s.muF * 100)} / ${fmt(s.muR * 100)} %</b><small>${s.tyre}</small></div></div>
    <p class="dim">Fart vid varvstopp per växel (i utväxlingsordning): ${s.gears.map((g, i) => `<b>${s.gearLabels?.[i] ?? i + 1}${s.gearLabels?.[i] === '5' && s.halfGear ? ' (2½)' : ''}:</b> ${fmt(s.redline / (g * s.final) / 9.5493 * s.rw * 3.6)} km/h`).join(' · ')}. Maxeffekt vid ca ${fmt(k.peakP ? k.peakP.rpm : s.redline * 0.85)} rpm.
      ${s.halfGear ? '' : s.cls === 'super' ? '' : ' Tips: 2½-växel på femmans plats (Garage → Utväxling) håller en klen motor på maxeffekt på rakorna.'}</p>
    <div class="row wrap"><button class="btn small ghost" data-act="setup-reset">Återställ standard</button><button class="btn small ghost" data-act="go" data-arg="garage">‹ Garaget</button></div></section>
  <section class="panel"><h2>Däck</h2><div class="cards">${Object.values(TYRES).map(x => `<div class="card ${t.tyre === x.id ? 'sel own' : ''}"><div class="c-top"><span>GREPP ${fmt(x.grip * 100)} %</span><b>${t.tyre === x.id ? 'MONTERADE' : (cs.tyres || []).includes(x.id) ? 'I FÖRRÅDET' : eur(x.price) + '/sats'}</b></div><strong>${x.name}</strong><p>${x.desc}</p>${t.tyre === x.id ? '' : `<button class="btn small" data-act="tyre" data-arg="${x.id}">Montera</button>`}</div>`).join('')}</div></section>
  <section class="panel"><h2>Chassi, växellåda & bromsar</h2><div class="sliders">${SETUP_UI.map(([n, key, lo, hi, st, f, d]) => `<label><span>${n} <b>${f(t[key])}</b></span><input type="range" min="${lo}" max="${hi}" step="${st}" value="${t[key]}" data-in="su:${key}"><small>${d}</small></label>`).join('')}</div></section>
  <section class="panel"><h2>Chiptrimning</h2><p>${chip ? '✓ Chiptrimmad (+12 % vridmoment).' : 'Omprogrammerad motorstyrning ger ca +12 % vridmoment och effekt.'}</p>
    <div class="row">${chip ? '<button class="btn small ghost" data-act="unmount" data-arg="chip">Återställ originalprogram</button>' : `<button class="btn" data-act="buy" data-arg="chip" ${S.money >= 329 ? '' : 'disabled'}>Chiptrimma (329 €)</button>`}</div></section>`;
}
export const ACT_GARAGE = {
  build(a) {
    const b = BUILD.find(x => x.id === a), cs = activeCar();
    if (S.money >= b.price && !cs.build[a]) {
      S.money -= b.price; cs.build[a] = 1; save();
      toast(currentInsp().ok ? '✓ Bilen går nu igenom alkukatsastus!' : `${b.name} klar.`);
    }
  },
  'used-buy'(a) { const o = (S.used?.offers || []).find(x => x.id === a); if (!o || o.sold || S.cars[o.car] || S.money < o.price) return; const c = carById(o.car);
    S.money -= o.price; o.sold = true;
    S.cars[o.car] = { build: { strip: 1, cage: 1, seat: 1, net: 1, switch: 1 }, tyres: ['std'], upg: c.cls === 'super' ? { superkit: 1 } : {}, paint: pick(PAINTS.filter(p => !p.lvl)).id, num: 1 + Math.floor(Math.random() * 99), bw: 'wb', katsastusNo: 100 + Math.floor(Math.random() * 890), tune: defaultTune(),
      used: { year: o.year, km: o.km }, faults: Object.fromEntries(o.faults.map(k => [k, { found: false, fixed: false, sign: Math.random() < 0.5 ? -1 : 1 }])) };
    S.active = o.car; save(); toast(`${c.name} (${o.year}) köpt begagnad för ${eur(o.price)}. Kör ett lopp eller låt undersöka den för att se vad som är fel.`); window.scrollTo(0, 0); },
  'fault-inspect'() { const cs = activeCar(); if (S.money < 40) return; S.money -= 40; revealFaults(cs, 'Mekanikern hittade'); if (!U.toast) U.toast = 'Mekanikern hittade inga fler fel.'; save(); },
  'fault-fix'(a) { const cs = activeCar(), f = cs?.faults?.[a], F = FAULTS[a]; if (!f || f.fixed || S.money < F.fix) return; S.money -= F.fix; f.fixed = true; save(); toast(`✓ ${F.name} lagat på verkstaden (${eur(F.fix)}).`); },
  'fault-diy'(a) { const cs = activeCar(), f = cs?.faults?.[a], F = FAULTS[a]; if (!f || f.fixed || S.money < F.diy) return; S.money -= F.diy;
    if (Math.random() < F.diyOk) { f.fixed = true; toast(`🔧 Du lagade det själv! ${F.name} är fixat för ${eur(F.diy)}.`); } else toast(`😬 Det gick inte – ${F.name.toLowerCase()} är kvar och delarna (${eur(F.diy)}) är förbrukade. Försök igen eller ta den till verkstaden.`); save(); },
  'sp-take'(a) { const o = sponsorOffers()[+a]; if (!o || S.sponsor) return; S.sponsor = { ...o, left: 3, hits: 0 }; save(); toast(`💼 Kontrakt med ${o.name} – 3 tävlingar.`); },
  'sp-quit'() { S.sponsor = null; save(); },
  'car-buy'(a) {
    const c = carById(a);
    if (S.money >= c.price && !S.cars[a]) {
      S.money -= c.price;
      // Myyntiluokka-bilar köps tävlingsklara för 850 € (som på myyntitilaisuus); Super-bilar köps färdigbyggda
      S.cars[a] = { build: { strip: 1, cage: 1, seat: 1, net: 1, switch: 1 }, tyres: ['std'], upg: c.cls === 'super' ? { superkit: 1 } : {}, paint: pick(PAINTS).id, num: 1 + Math.floor(Math.random() * 99), bw: 'wb', katsastusNo: 100 + Math.floor(Math.random() * 890), tune: defaultTune() };
      S.active = a; U.preview = null; save();
      toast(`${c.name} köpt för ${eur(c.price)} – tävlingsklar med katsastuskortti.`);
      window.scrollTo(0, 0);
    }
  },
  // Personliga engångskoder: bara SHA-256-summorna finns i koden, själva koderna vet bara ägaren. Varje kod ger sin summa en gång per sparfil.
  async redeem() { const el = document.getElementById('redeemCode'), v = (el?.value || '').trim().toUpperCase(); if (!v) return;
    let h = ''; try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)); h = [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { }
    const amt = { '81afbefeea7f5c78f397572e3cbe5ae098074b53899f6610335cb547e92dfdfb': 20000, '96b73c55ac1fef46e5181e7cad3e7b45b64e61a848f66879f31572350fb6940d': 50000, '37fc61d348006100a72d0db722a1fa6bfdc1c4ad931bdd20a3e39cb6a5042c3d': 10000, '69d6890c77565c4f7c859c5930bf9813f22b88a0b86c6d965e638a7272c3631e': 200000, 'f0241ad2e6d48770c08e94fb6bafd774617739289acec7edd97809e5a22138be': 5000 }[h];
    const CARCODE = { '9079674645377aee3ffd02df647575691a6782f06d6163097459355538113d05': { car: 'volvo_v8_super', perks: ['hp3000', 'cool250', 'grip2'] } }[h], PERK = { '483641c3e82bcc15d1fde47f16bbe507dd91ca85953194f017e0cc4fc6418740': ['stage3', 'cool300'], '6ee5d99add2d762aadc676c93898a782c1611a39b01c3052ed7d3dd3489ee0a0': ['grip10'] }[h], PERKNAME = { stage3: 'Stage 3 (dubbel effekt)', cool300: '300 kW kylare', grip10: '10× grepp och stabilitet' };
    if (CARCODE) { S.redeemed = S.redeemed || []; if (S.redeemed.includes(h)) { toast('Koden är redan inlöst.'); render(); return; }
      const id = CARCODE.car, c = carById(id); if (!S.cars[id]) S.cars[id] = { build: { strip: 1, cage: 1, seat: 1, net: 1, switch: 1 }, tyres: ['std', 'ccplus'], upg: { superkit: 1 }, paint: pick(PAINTS).id, num: 1 + Math.floor(Math.random() * 99), bw: 'wb', katsastusNo: 100 + Math.floor(Math.random() * 890), tune: { ...defaultTune(), tyre: 'ccplus' } };
      const cs = S.cars[id]; cs.perks = { ...(cs.perks || {}) }; for (const k of CARCODE.perks) cs.perks[k] = 1; S.active = id; S.redeemed.push(h); save();
      toast(`🎁 ${c.name}: 3000 hk, 250 kW kylare och dubbelt grepp – står i garaget som aktiv bil!`); render(); return; }
    if (PERK) { const cs = activeCar(); if (!cs) { toast('Köp en bil först – koden läggs på den aktiva bilen.'); render(); return; }
      S.redeemed = S.redeemed || []; if (S.redeemed.includes(h)) { toast('Koden är redan inlöst.'); render(); return; }
      S.redeemed.push(h); cs.perks = { ...(cs.perks || {}) }; for (const k of PERK) cs.perks[k] = 1; save(); toast(`${PERK.map(k => PERKNAME[k]).join(' och ')} monterat på ${carById(S.active).name}!`); render(); return; }
    if (!amt) { toast('Ogiltig kod.'); render(); return; }
    S.redeemed = S.redeemed || []; if (S.redeemed.includes(h)) { toast('Koden är redan inlöst.'); render(); return; }
    S.redeemed.push(h); S.money += amt; save(); toast(`+${eur(amt)} insatt!`); render(); },
  'car-pick'(a) { if (S.cars[a]) { S.active = a; U.preview = null; save(); window.scrollTo(0, 0); } },
  'eng-pick'(a) {
    const cs = activeCar();
    if (ENGINES[a]) { cs.eng = a; save(); toast(`Monterade ${ENGINES[a].name}!`); }
  },
  'eng-buy'(a) {
    const cs = activeCar(), eDef = ENGINES[a];
    if (eDef && S.money >= eDef.price) {
      S.money -= eDef.price;
      cs.ownedEngs = cs.ownedEngs || [carById(S.active).defaultEng];
      if (!cs.ownedEngs.includes(a)) cs.ownedEngs.push(a);
      cs.eng = a;
      save();
      toast(`🔧 Motorbyte klart: ${eDef.name} sitter nu under huven!`);
    }
  },
  paint(a) { activeCar().paint = a; save(); },
  'glb-rot'() { glbEdit(r => { r.rot = ((r.rot || 0) + 1) % 4; }); return false; },
  'glb-flip'() { glbEdit(r => { r.flip = !r.flip; }); return false; },
  'glb-pm'(a) { glbEdit(r => { r.paintMat = a || ''; r.paint = true; }); return false; },
  'glb-paint'() { glbEdit(r => { r.paint = r.paint === false; }); return false; },
  'glb-del'() { deleteCustomModel(S.active).then(() => { delete U.glb[S.active]; U.glbV = (U.glbV || 0) + 1; U.toast = 'Modellen är borttagen – den inbyggda karossen används igen.'; render(); }); return false; },
  tyre(a) { const cs = activeCar(), ty = TYRES[a]; cs.tyres = cs.tyres || ['std'];
    if (!cs.tyres.includes(a)) { if (S.money < ty.price) { toast(`En sats ${ty.name} kostar ${eur(ty.price)}.`); return; } S.money -= ty.price; cs.tyres.push(a); toast(`Ny sats ${ty.name} monterad (${eur(ty.price)}).`); }
    cs.tune.tyre = a; save(); },
  'setup-reset'() { const t = activeCar().tune; Object.assign(t, SETUP_DEF, { finalScale: 1, bias: 0.70, rim: t.rim, width: t.width, tyre: t.tyre }); save(); },
  'num-bw'(a) { activeCar().bw = a; save(); },
  buy(a) {
    const u = UPG.find(x => x.id === a), cs = activeCar(), lvl = cs.upg[a] || 0, L = u.levels[lvl];
    if (u.needsDriven === 'rear' && spec().drv === 'fwd') { toast('4-link passar bara bakhjuls- eller fyrhjulsdrivna bilar.'); return; }
    if (L && S.money >= L.price) { S.money -= L.price; cs.upg[a] = lvl + 1; U.preview = null; save(); toast(`${L.name} monterad.`); }
  },
  unmount(a) {
    const cs = activeCar();
    if (cs.upg[a]) { delete cs.upg[a]; save(); toast('Delen har plockats av.'); }
  },
  pv(a) { const [u, l] = a.split(':'); U.preview = [u, +l]; window.scrollTo(0, 0); },
 'pv-off'() { U.preview = null; },
  preset(a) { const t = activeCar().tune, P = { power: [0.90, 3], race: [0.95, 0], eco: [1.08, 2], safe: [0.86, -5] }[a]; t.lambda = P[0]; t.ign = P[1]; save(); },
  fuel(a) { if (S.fuels.includes(a)) { activeCar().tune.fuel = a; save(); } },
  'fuel-buy'(a) { const f = fuelById(a); if (S.money >= f.price && !S.fuels.includes(a)) { S.money -= f.price; S.fuels.push(a); activeCar().tune.fuel = a; save(); } },
};
