// Tävlingsdag: AI-fält, mästerskap, snabbtävling, XP och starten av ett race.
// (Del av menysystemet – se js/ui.js för render() och åtgärderna.)
import { PAINTS, TRACKS, SURF, CAREER, FINALS, DRIVERS, XP_LEVELS, XP_UNLOCKS } from '../data.js';
import { buildSpec, curve, carById, defaultTune, fmt, formatCarNum, SPEC_CARS, specCar } from '../engine.js';
import { S, save, activeCar } from '../state.js';
import { getTrack } from '../track.js';
import { Race, fmtTime } from '../race.js';
import { newChamp, simHeat, setResult, advance, roundDone, myHeat, canSkip, skip as chSkip, heatName, whereIs, sortRows, ROUND, FIN, A_TABLE, NORMAL_PRIZE } from '../champ.js';
import { MUSIC } from '../music.js';
import { U, app, currentInsp, esc, eur, netName, paintOf, pick, shuffle, spec, stats, toast } from './core.js';
import { revealFaults, sponsorEval } from './garage.js';
import { karriar } from './karriar.js';
import { pushBoard } from './top.js';
import { after, render } from '../ui.js';

// ---------- tävlingsdag ----------
export const AI_UPG_STD = [{}, { insug: 1, avgas: 1, dack: 1, vikt: 1 }, { insug: 2, avgas: 1, kam: 1, dack: 2, vikt: 2, vaxel: 1 }, { insug: 2, avgas: 2, kam: 2, dack: 2, vikt: 3, vaxel: 1, fjad: 2 }];
export const AI_UPG_SUP = [{ superkit: 1, turbo: 1, dack: 2 }, { superkit: 1, turbo: 1, ic: 1, dack: 3, diff: 1 }, { superkit: 1, turbo: 2, ic: 1, dack: 3, diff: 1, kam: 1, vikt: 2 }, { superkit: 1, turbo: 3, ic: 2, dack: 3, diff: 1, kam: 2, vikt: 3, fjad: 2 }];
export const AI_POOL = {
  vetari: [
    ['sunny', 'mazda3', 'kadett'],
    ['sunny', 'mazda3', 'kadett', 'passat_vetari'],
    ['mazda3', 'kadett', 'passat_vetari', 'civic', 'mondeo'],
    ['passat_vetari', 'civic', 'mondeo'],
  ],
  kardaani: [
    ['v343', 'sierra'],
    ['v343', 'sierra', 'v940'],
    ['sierra', 'v940', 'passat_kardaani', 'bmw325'],
    ['v940', 'passat_kardaani', 'bmw325', 'sierra'],
  ],
  super: [
    ['starlet_super', 'ascona_super', 'saab9000'],
    ['starlet_super', 'ascona_super', 'saab9000', 'sierra_super'],
    ['ascona_super', 'saab9000', 'sierra_super', 'volvo_v8_super'],
    ['ascona_super', 'sierra_super', 'volvo_v8_super', 'starlet_super'],
  ],
};
// AI-förare: slumpade namn och bilar. Bilen byggs med spelarens chassi-/däckinställningar och effekten skalas mot
// spelarens bil (±8 %) så att motståndet blir rimligt oavsett vilken bil och trim man kör. diff = 0,01–1 (1–100 %).
export const FIRST = ['Pena', 'Jorma', 'Late', 'Tuukka', 'Reiska', 'Vesa', 'Kake', 'Ilpo', 'Seppo', 'Hessu', 'Arska', 'Jere', 'Pate', 'Timppa', 'Masa', 'Olli', 'Rami', 'Sami', 'Veikko', 'Eki', 'Nipa', 'Tane', 'Juha', 'Aki', 'Kimmo', 'Jonne', 'Kalle', 'Mika', 'Sanna', 'Tiina', 'Jenni', 'Heikki', 'Lasse', 'Niko', 'Petteri', 'Raimo', 'Anu', 'Johanna'];
export const LAST = ['Rämäkkö', 'Kaasujalka', 'Sivuluisu', 'Soranen', 'Pultti', 'Vänkäri', 'Kardaani', 'Ilmanotto', 'Sytytys', 'Hiekkala', 'Akseli', 'Jousi', 'Pakosarja', 'Turbonen', 'Öljypohja', 'Rattinen', 'Vaihde', 'Etuveto', 'Takaveto', 'Jäärata', 'Kytkin', 'Mutkanen', 'Ruostela', 'Peltonen', 'Kolari', 'Lokasuoja', 'Nastarengas', 'Tunkki'];
export function aiNames(n) { const set = new Set(), out = shuffle(DRIVERS).slice(0, Math.min(n, 12)); out.forEach(x => set.add(x)); let g = 0; while (out.length < n && g++ < 5000) { const x = pick(FIRST) + ' ' + pick(LAST); if (!set.has(x)) { set.add(x); out.push(x); } } return shuffle(out); }
// boostHp: ALLA AI får exakt så många hk – starkaste riktiga spelarens hk + 500 (snabblopp: dina hk + 500)
// Bilval för tävlingen: 0 = alla kör egen bil från garaget, 1–5 = alla kör samma spec-bil (AI:n en nivå högre, max 5)
export const aiSpec = lvl => Math.min(5, lvl + 1);
export function carModeRow(act, cur, host) {
  cur = cur || 0; const B = (v, n, sm) => `<button class="chip s ${cur === v ? 'on' : ''}" data-act="${act}" data-arg="${v}">${n}${sm ? `<small>${sm}</small>` : ''}</button>`;
  if (cur === 'hc') return `<div class="row"><span class="lbl">Bilar</span>${B(0, 'Egen bil')}${B('hc', 'Alla har värdens bil', host ? `${host.model} · ${host.hp} hk` : '')}${[1, 2, 3, 4, 5].map(l => B(l, `Spec ${l} · ${SPEC_CARS[l].hp} hk`)).join('')}</div>
    <p class="dim" style="margin:-4px 0 8px">Alla förare kör värdens bil${host ? ` (${esc(host.model)}, ${host.hp} hk)` : ''} med värdens inställningar. AI:n kör samma bil med 100 hk mer.</p>`;
  return `<div class="row"><span class="lbl">Bilar</span>${B(0, 'Egen bil')}${host ? B('hc', 'Alla har värdens bil', `${host.model} · ${host.hp} hk`) : ''}${[1, 2, 3, 4, 5].map(l => B(l, `Spec ${l} · ${SPEC_CARS[l].hp} hk`)).join('')}</div>
    ${cur ? `<p class="dim" style="margin:-4px 0 8px">Alla förare kör Mazda 626 Spec ${cur} (${SPEC_CARS[cur].hp} hk). AI:n kör Spec ${aiSpec(cur)} (${SPEC_CARS[aiSpec(cur)].hp} hk).</p>` : ''}`;
}
// Fast förarfält i en säsong: samma AI-förare (namn, färg, bil, form) i varje tävling med samma nyckel
export function roster(rk, n, pool) {
  const R = (S.rosters ||= {}), L = (R[rk] ||= []), mine = activeCar()?.paint, used = new Set(L.map(x => x.name));
  if (L.length < n) aiNames(n * 2).filter(x => !used.has(x)).slice(0, n - L.length).forEach(name => L.push({ name, paint: pick(PAINTS.filter(p => p.id !== mine)).rgb, bw: Math.random() < 0.35 ? 'bw' : 'wb', dOff: (Math.random() - 0.5) * 0.08, cid: pick(pool), r: Math.random() }));
  L.forEach(x => { if (!pool.includes(x.cid)) x.cid = pick(pool); }); save(); return L.slice(0, n);
}
export function makeOpps(n, li, diff, cls, boostHp, specLvl, rk) {
  const fixed = rk ? roster(rk, n, specLvl ? ['spec'] : (() => { const k = cls === 'super' || cls === 'supersenior' ? 'super' : cls === 'kardaani' ? 'kardaani' : 'vetari'; return [...AI_POOL[k][Math.max(0, Math.min(3, li))], 'mazda626', 'passat_rx', 'mondeo_st']; })()) : null;
  if (specLvl) { const names = fixed ? fixed.map(x => x.name) : aiNames(n), mine = activeCar()?.paint, sp = specCar(aiSpec(specLvl)); // spec-läge: alla AI kör spec-bilen en nivå över spelarna
    return names.map((name, i) => { const f = fixed?.[i], d = Math.max(0.01, Math.min(1, diff + (f ? f.dOff : (Math.random() - 0.5) * 0.08)));
      return { name, paint: f ? f.paint : pick(PAINTS.filter(p => p.id !== mine)).rgb, bw: f ? f.bw : Math.random() < 0.35 ? 'bw' : 'wb', diff: d, skill: 0.6 + 0.4 * d, spec: sp, powScale: 1 }; }); }
  const names = fixed ? fixed.map(x => x.name) : aiNames(n), mine = activeCar().paint, full = { strip: 1, cage: 1, seat: 1, net: 1, switch: 1 };
  const ps = spec(), php = curve(ps).hp; boostHp ??= php + 500; const tune = { ...defaultTune(), ...activeCar().tune, tyre: 'ccplus' }; // alla AI kör på bästa däcken (CrossClimate Plus)
  const poolKey = cls === 'super' || cls === 'supersenior' ? 'super' : cls === 'kardaani' ? 'kardaani' : 'vetari';
  const pool = [...AI_POOL[poolKey][Math.max(0, Math.min(3, li))], 'mazda626', 'passat_rx', 'mondeo_st'];
  return names.map((name, i) => { const f = fixed?.[i];
    const cid = f ? f.cid : pick(pool), sp = buildSpec(cid, { build: full, upg: poolKey === 'super' ? { superkit: 1, ...(ps.drv === 'awd' ? { awd: 1 } : {}) } : (f ? f.r : Math.random()) < 0.7 ? { rokkivaxel: 1 } : {} }, tune), hp = curve(sp).hp; // Super-AI kör fyrhjulsdrift om spelaren gör det
    const d = Math.max(0.01, Math.min(1, diff + (f ? f.dOff : (Math.random() - 0.5) * 0.08)));
    return { name, paint: f ? f.paint : pick(PAINTS.filter(p => p.id !== mine)).rgb, bw: f ? f.bw : Math.random() < 0.35 ? 'bw' : 'wb', diff: d, skill: 0.6 + 0.4 * d, spec: sp,
      powScale: boostHp ? Math.max(0.4, Math.min(12, boostHp / hp)) : Math.max(0.4, Math.min(3, php / hp * (0.92 + Math.random() * 0.16))) };
  });
}
export const STAGE = { alku: 'Alkuerä', kerailu: 'Keräilyerä', lastcall: 'Last call', semi: 'Semifinaali', final: '-finaali' };
export const stageName = ev => ev.stage === 'final' ? FINALS[ev.fin] + '-finaali' : STAGE[ev.stage];
export function evStart(arg) {
  const [li, id] = arg.split(':'), L = CAREER[+li], e = L.events.find(x => x.id === id);
  const insp = currentInsp(), rules = insp.rules;
  const cm0 = champCfg().cm || 0;
  if ((!insp.ok && !cm0) || S.lippumies > 0) return;
  let usedVoucher = false;
  if (S.vouchers > 0 && rules.fee > 0) { S.vouchers--; usedVoucher = true; }
  else if (S.money >= rules.fee) { S.money -= rules.fee; }
  else return;
  save();
  const cc = champCfg(), laps = Math.max(rules.minLaps, L.id === 'mestari' ? 3 : rules.minLaps), trk = getTrack(e.track);
  const diff = Math.max(0.01, Math.min(1, cc.diff / 100 + [-0.08, 0, 0.05, 0.1][+li]));
  const cm = cc.cm || 0, opps = makeOpps(cc.perStart * cc.heats - 1, +li, diff, insp.cls, curve(spec()).hp + 500, cm, 'kar:' + L.id), O = {}; if (S.sponsor?.goal === 'beat' && opps[0] && !opps.some(o => o.name === S.sponsor.rival)) { opps[0].name = S.sponsor.rival; const rl = S.rosters?.['kar:' + L.id]; if (rl?.[0]) { rl[0].name = S.sponsor.rival; save(); } } // sponsorns rival är med // AI: 500 hk mer än du (spec-läge: en spec-nivå högre)
  const ents = [{ id: 'me', name: `${S.name || 'Du'}`, me: 1, kgHp: curve(cm ? specCar(cm) : spec()).kgHp, diff: 1 }];
  opps.forEach((o, i) => { const id = 'ai' + i; O[id] = { ...o, nid: id }; ents.push({ id, name: o.name, diff: o.diff, kgHp: curve(o.spec).kgHp / (o.powScale || 1) }); });
  U.ev = {
    li: +li, e, L, cls: insp.cls, rules, laps, O, cm, ch: newChamp({ perStart: cc.perStart, heats: cc.heats, laps, joker: rules.joker, trackLen: trk.len }, ents),
    dmg: 0, radLeak: false, exhaustLoose: false, parts: null, needKaatoInsp: false, hist: [],
    cleanDay: true, protestUsed: false, arvat: 0, saleEligible: false, saleDone: false, saleMsg: '', feePaid: rules.fee, usedVoucher, over: null, last: null,
  };
  U.view = 'event';
}
export function champCfg() { return S.settings.champ = { perStart: 6, heats: 4, diff: 75, ...(S.settings.champ || {}) }; }
// Kör eller tittar på ett heat i mästerskapet
export function evRun(heatId, watch) {
  const ev = U.ev, ch = ev.ch, h = ch.heats.find(x => x.id === heatId) || myHeat(ch, 'me'); if (!h || h.res) return;
  if (!watch && (ev.needKaatoInsp || ev.exhaustLoose)) return;
  if (!watch) ev.service = null; // servicen stänger när du rullar ut till start
  const defs = h.ids.filter(id => id !== 'me' || watch).map(id => id === 'me' ? null : ev.O[id]).filter(Boolean);
  const title = `${ev.rules.name} – ${heatName(h)}`;
  const done = res => {
    const rows = sortRows(res.order.map(o => ({ id: o.isPlayer ? 'me' : o.id, name: o.name, time: o.time, best: o.best, jokerLap: o.jokerLap, flag: o.flag, dist: o.dist })));
    setResult(ch, h, rows);
    if (!watch) { evAfter(res, h); for (const x of ch.heats) if (!x.res) setResult(ch, x, simHeat(ch, x)); } // övriga heat kördes samtidigt
    ev.lastHeat = h; U.view = 'event'; render();
  };
  if (watch) { if (!defs.length) return; startRace({ trackId: ev.e.track, laps: ev.laps, opps: defs.slice(1), player: defs[0], spectate: true, grid: 0, gridRows: ev.rules.gridRows, useJoker: ev.rules.joker, sideContact: true, title: '👁 ' + title, mode: 'heat', onDone: done }); return; }
  startRace({
    trackId: ev.e.track, laps: ev.laps, opps: defs, grid: h.ids.indexOf('me'), gridRows: ev.rules.gridRows, useJoker: ev.rules.joker, sideContact: ev.rules.sideContact,
    title, dmg0: ev.dmg, radLeak0: ev.radLeak, parts0: ev.parts, wear0: ev.wear, mud0: ev.mud || 0, mode: 'heat', onDone: done, specLvl: ev.cm || 0,
  });
}
export function evAfter(res, h) {
  const ev = U.ev;
  ev.mud = res.mud || 0;   ev.maxDmg = Math.max(ev.maxDmg || 0, res.dmg || 0); if (res.pos === 1 && res.finished) ev.heatWins = (ev.heatWins || 0) + 1; if (!res.finished) ev.dnf = true;
  ev.dmg = res.dmg; ev.parts = res.parts || ev.parts; ev.wear = res.wear || ev.wear; ev.radLeak = res.radLeak; ev.exhaustLoose = !!res.exhaustLoose; ev.needKaatoInsp = !!res.kaato;
  ev.last = res; ev.protestable = !!res.sanction;
  openService(ev);
  ev.hist.push({ stage: heatName(h), pos: res.pos, flag: res.flag });
  if (isFinite(res.bestLap)) record(ev.e.track, res.bestLap);
  if (h.round === 'semi' && ev.rules.saleFrom === 'semi') ev.saleEligible = true;
  if (res.sanction) { ev.cleanDay = false; S.warnings = (S.warnings || 0) + 1; if (S.warnings >= 3) { S.lippumies = 1; S.warnings = 0; toast('3 varningar → hylkäys + lippumiespesti.'); } save(); }
}
// ---------- servicepaus mellan heaten ----------
// Efter varje heat öppnar depån: 30 serviceminuter (speltid) och ca 2 minuter verklig tid tills startkallelsen.
// Varje jobb tar tid och kostar pengar – hinner du inte allt får du välja vad som är viktigast.
export const SV_MIN = 30, SV_REAL = 120;
export function svJobs(ev) {
  const P = ev.parts || {}, J = [];
  if (ev.dmg > 1) J.push({ id: 'body', n: '🔨 Riktning av kaross', d: `Skador ${Math.round(ev.dmg)} % → ${Math.round(Math.max(0, ev.dmg - 30))} %`, min: 6, cost: Math.ceil(Math.min(30, ev.dmg) * 1.0) });
  if (ev.radLeak) J.push({ id: 'rad', n: '💧 Täta kylaren', d: 'Kylaren läcker – motorn blir varm', min: 7, cost: 20 });
  if (ev.exhaustLoose) J.push({ id: 'exh', n: '🔩 Fäst avgasröret', d: 'Krävs för att få starta (110 dB)', min: 3, cost: 15, must: 1 });
  if ((P.steer || 0) > 2) J.push({ id: 'steer', n: '🎯 Rikta styrningen', d: `Styrningen ${Math.round(P.steer)} % sned`, min: 9, cost: Math.ceil(P.steer * 0.6) });
  if ((P.gear || 0) > 2) J.push({ id: 'gear', n: '⚙️ Laga växellådan', d: `Växellådan ${Math.round(P.gear)} % skadad`, min: 14, cost: Math.ceil(P.gear * 0.9) });
  if (ev.wear && ev.wear[0] + ev.wear[1] > 10) J.push({ id: 'tyres', n: '🛞 Byt däck', d: `Slitage ${Math.round(ev.wear[0])} / ${Math.round(ev.wear[1])} %`, min: 5, cost: 40 });
  return J;
}
export function openService(ev) { ev.service = { left: SV_MIN, until: Date.now() + SV_REAL * 1000, log: [] }; startSvClock(); }
const svOpen = sv => sv && sv.left > 0 && Date.now() < sv.until;
export function svDo(ev, id) {
  const sv = ev.service, j = svJobs(ev).find(x => x.id === id); if (!j || !svOpen(sv)) return false;
  if (j.min > sv.left) { toast(`⏱ ${j.n.slice(2).trim()} tar ${j.min} min – bara ${sv.left} min kvar av servicen.`); return false; }
  if (S.money < j.cost) { toast(`Du har inte råd (${eur(j.cost)}).`); return false; }
  S.money -= j.cost; sv.left -= j.min; sv.log.push(j.n);
  if (id === 'body') ev.dmg = Math.max(0, ev.dmg - 30); else if (id === 'rad') ev.radLeak = false; else if (id === 'exh') ev.exhaustLoose = false;
  else if (id === 'steer') ev.parts = { ...ev.parts, steer: 0 }; else if (id === 'gear') ev.parts = { ...ev.parts, gear: 0 }; else if (id === 'tyres') ev.wear = [0, 0];
  save(); return true;
}
let SVT = null;
function startSvClock() {
  if (SVT) return; SVT = setInterval(() => {
    const ev = U.ev, sv = ev?.service, el = document.getElementById('svClock');
    if (!sv || U.view !== 'event') return;
    const t = Math.max(0, Math.ceil((sv.until - Date.now()) / 1000));
    if (el) el.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    if (t <= 0 && !sv.closed) { sv.closed = 1; toast('📣 Startkallelse! Servicen är stängd – bilen rullar som den är.'); render(); }
  }, 500);
}
export function servicePanel(ev) {
  const sv = ev.service; if (!sv) return '';
  const J = svJobs(ev), open = svOpen(sv), t = Math.max(0, Math.ceil((sv.until - Date.now()) / 1000));
  if (!J.length && !sv.log.length) return '';
  return `<section class="panel service ${open ? '' : 'closed'}"><div class="lv-head"><h2>🔧 Servicepaus</h2><span>${open ? `Startkallelse om <b id="svClock">${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</b>` : 'Servicen är stängd'}</span></div>
    <div class="svbar"><i style="width:${sv.left / SV_MIN * 100}%"></i><span>${sv.left} / ${SV_MIN} serviceminuter kvar</span></div>
    ${J.length ? `<div class="svjobs">${J.map(j => `<button class="svjob ${j.must ? 'must' : ''}" data-act="sv-job" data-arg="${j.id}" ${!open || j.min > sv.left || S.money < j.cost ? 'disabled' : ''}><b>${j.n}</b><small>${j.d}</small><span>⏱ ${j.min} min · ${eur(j.cost)}</span></button>`).join('')}</div>`
      : '<p class="okbox">✓ Bilen är i skick – inget mer att göra.</p>'}
    ${sv.log.length ? `<p class="dim">Gjort: ${sv.log.join(' · ')}</p>` : ''}
    <p class="dim">Du har ${SV_MIN} min i depån och ungefär ${SV_REAL / 60} minuter innan startkallelsen. Kaross lagas 30 % åt gången. Hinner du inte allt – välj det som kostar mest tid på banan.</p></section>`;
}
// Simulera resten av omgången (när man själv inte kör i den) och gå vidare
export function evNext() {
  const ev = U.ev, ch = ev.ch;
  for (const x of ch.heats) if (!x.res) setResult(ch, x, simHeat(ch, x));
  advance(ch); ev.lastHeat = null; ev.last = null;
  if (ch.done) evEnd();
}
export function evEnd() {
  const ev = U.ev, ch = ev.ch, me = ch.overall.find(o => o.id === 'me');
  const fin = ch.history.filter(r => r.round === 'final').find(r => r.heats[0].ids.includes('me'));
  if (ev.cleanDay && S.warnings > 0) { S.warnings = 0; toast('✓ Ren tävling körd – varningslistan är nollställd!'); }
  const sf = ev.rules.saleFrom; if (fin && sf && sf !== 'semi' && FIN.indexOf(fin.letter) <= FIN.indexOf(sf)) ev.saleEligible = true;
  ev.over = { pos: me.pos, prize: me.prize, pts: me.pts, final: fin ? fin.letter : 'out' };
  me.prize = withBonus(me.prize); S.money += me.prize;
  ev.spTxt = sponsorEval(ev, me); if (ev.spTxt) U.toast = ev.spTxt;
  const old = S.career.res[ev.e.id]; if (!old || me.pts > old.pts) S.career.res[ev.e.id] = { final: ev.over.final, pos: me.pos, pts: me.pts };
  save();
}
// Resultattabell: placering, förare, bästa varv (lila = snabbast), total tid, jokervarv, avstånd och tid till bilen framför, straff, pris, poäng
export function resTable(rows, money) {
  const best = Math.min(...rows.map(r => r.best ?? Infinity));
  const sec = v => (v < 0 ? '−' : '+') + fmt(Math.abs(v), 3) + ' s';
  return `<div class="tblwrap"><table class="res full"><tr><th>#</th><th>Förare</th><th>Bästa varv</th><th>Total tid</th><th>Jokerlap</th><th>Avstånd</th><th>Tidsavstånd</th><th>Straff</th><th>Pris</th><th>Poäng</th></tr>
    ${rows.map((r, i) => { const prev = rows[i - 1], m = money ? money(r, i) : null;
      return `<tr class="${r.isPlayer || r.id === 'me' ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.name)}</td><td class="${r.best != null && r.best === best ? 'purple' : ''}">${r.best != null ? fmtTime(r.best) : '–'}</td><td>${r.time != null ? fmtTime(r.time) : 'DNF'}</td>
        <td>${r.jokerLap ? 'varv ' + r.jokerLap : '–'}</td><td>${i && r.dist != null ? fmt(r.dist) + ' m' : '–'}</td><td>${i && r.time != null && prev?.time != null ? sec(r.time - prev.time) : '–'}</td>
        <td class="flag">${r.flag || ''}</td><td>${m && m[0] ? eur(m[0]) : '–'}</td><td>${m && m[1] ? m[1] + ' p' : '–'}</td></tr>`; }).join('')}</table></div>`;
}
export const LADDER = [['alku', 'Alkuerä'], ['kerailu', 'Keräily'], ['lastcall', 'Last Call'], ['semi', 'Semi'], ['F', 'F'], ['E', 'E'], ['D', 'D'], ['C', 'C'], ['B', 'B'], ['A', 'A']];
export function eventView() {
  const ev = U.ev; if (!ev) { U.view = 'karriar'; return karriar(); }
  const ch = ev.ch, t = TRACKS.find(x => x.id === ev.e.track), cost = Math.ceil(ev.dmg * 1.0 + (ev.radLeak ? 20 : 0) + (ev.exhaustLoose ? 15 : 0) + (ev.parts ? Math.round((ev.parts.steer || 0) * 0.6 + (ev.parts.gear || 0) * 0.9) : 0));
  const curKey = ch.round === 'final' ? ch.letter : ch.round;
  let h = `<section class="panel evhead"><span class="kick">${t.name.toUpperCase()} · ${SURF[t.surface].name.toUpperCase()} · ${ev.rules.name.toUpperCase()} · ${ch.cfg.perStart} FÖRARE/START · ${ev.laps} VARV${ev.rules.joker ? ' · JOKERLAP' : ''}</span><h1>${ev.e.name}</h1>
    <div class="ladder">${LADDER.map(([k, n]) => `<span class="${k === curKey ? 'cur' : ''} ${k.length === 1 ? 'fin' : ''}">${n}</span>`).join('<i>›</i>')}</div>
    <p class="dim">Du: <b>${whereIs(ch, 'me')}</b>. Alkuerä 1–2 → semi, Keräilyerä 1–2 → semi, Last Call vinnaren → semi. Semiplacering ger final (1 = A … 6 = F). Finalerna körs F → A, topp 3 går upp till nästa final. Förare med straff går inte vidare direkt.</p></section>`;

  if (ev.lastHeat && ev.lastHeat.res) {
    const lh = ev.lastHeat, isA = lh.round === 'final' && lh.letter === 'A';
    h += `<section class="panel"><h2>Resultat: ${heatName(lh)}</h2>${resTable(lh.res, isA ? (r, i) => A_TABLE[i] : null)}
      ${ev.protestable ? `<div class="warnbox" style="margin-top:8px">Du fick straff <b>${ev.last.sanction}</b>. Du kan lämna in en skriftlig protest för <b>50 €</b>.<div class="row" style="margin-top:8px"><button class="btn small" data-act="ev-protest" ${S.money >= 50 ? '' : 'disabled'}>📝 Lämna in protest (50 €)</button></div></div>` : ''}</section>`;
  }

  if (ev.over) {
    const o = ev.over;
    h += `<section class="panel final ${o.pos <= 3 ? 'podium' : ''}"><span class="kick">MÄSTERSKAPET ÄR SLUT</span><h1>Slutplacering ${o.pos}${o.final !== 'out' ? ` (${o.final}-finalen)` : ' (utslagen i Last Call)'}</h1>
      <div class="pills"><div><span>Prispengar</span><b>${eur(o.prize)}</b></div><div><span>Mästerskapspoäng</span><b>${o.pts} p</b></div><div><span>Varningar</span><b>${S.warnings} / 3</b></div></div>
      <h3>Slutresultat (A-finalens pris- och poängtabell)</h3><table class="res"><tr><th>#</th><th>Förare</th><th>Pris</th><th>Poäng</th></tr>${ch.overall.slice(0, 12).map(r => `<tr class="${r.id === 'me' ? 'me' : ''}"><td>${r.pos}</td><td>${esc(r.name)}</td><td>${r.prize ? eur(r.prize) : '–'}</td><td>${r.pts || '–'}</td></tr>`).join('')}</table>
      <p class="dim">${ev.hist.map(x => `${x.stage} ${x.pos}:a${x.flag ? ' (' + x.flag + ')' : ''}`).join(' → ')}</p>`;
    if (ev.saleEligible && !ev.saleDone) h += `<div class="warnbox" style="margin:12px 0"><h3>🔨 Autojen myyntitilaisuus (850 €)</h3><p>Din bil omfattas av myyntivelvoite. Du har <b>${ev.arvat} st</b> egna lotter.</p><div class="row"><button class="btn small" data-act="ev-sale-run">🎲 Genomför lottdragningen</button><button class="btn small ghost" data-act="ev-buy-arpa" ${S.money >= 20 ? '' : 'disabled'}>🎟 Köp lott (20 €)</button></div></div>`;
    else if (ev.saleMsg) h += `<div class="okbox" style="margin:12px 0">${ev.saleMsg}</div>`;
    h += `<div class="row"><button class="btn" data-act="ev-close" ${ev.saleEligible && !ev.saleDone ? 'disabled' : ''}>Tillbaka till karriären</button></div></section>`;
    return h + historyPanel(ch);
  }

  const mine = myHeat(ch, 'me'), rd = roundDone(ch);
  const isFinalRound = ch.round === 'final';
  h += servicePanel(ev);
  h += `<section class="panel next"><h2>${isFinalRound ? `${ch.letter}-finalen` : ROUND[ch.round]}${!isFinalRound && ch.heats.length > 1 ? ` – ${ch.heats.length} heat startar samtidigt (separata lopp på samma bana)` : ''}</h2>
    ${isFinalRound ? `<p class="dim">Finalerna körs i ordning F → A. ${mine ? 'Det är din tur nu.' : 'Du väntar på din final – titta på eller simulera den här först.'}</p>` : ''}
    ${ev.needKaatoInsp ? `<div class="warnbox">⚠ <b>KAATOKATSASTUS KRÄVS</b> efter rullningen.<div class="row" style="margin-top:6px"><button class="btn small" data-act="ev-kaato">🔧 Kaatokatsastus (40 €)</button></div></div>` : ''}
    ${ev.exhaustLoose ? `<div class="warnbox">⚠ Avgasröret har lossnat (110 dB-regeln) – laga före nästa heat.</div>` : ''}
    ${ev.parts && (ev.parts.steer >= 25 || ev.parts.gear >= 45) ? `<div class="warnbox">🔧 ${ev.parts.steer >= 25 ? `Styrningen är sned (${Math.round(ev.parts.steer)} %) – bilen drar åt ena hållet. ` : ''}${ev.parts.gear >= 45 ? `Växellådan är skadad (${Math.round(ev.parts.gear)} %) – högsta växeln saknas. ` : ''}Laga i depån.</div>` : ''}
    ${U.lastReplay ? `<div class="row">${replayBtn()}</div>` : ''}
    <div class="heats">${ch.heats.map(x => `<div class="heat ${x.ids.includes('me') ? 'mine' : ''} ${x.res ? 'done' : ''}"><div class="hh"><b>${heatName(x)}</b><span>${x.res ? 'Klart' : x.ids.length + ' förare'}</span></div>
      <ol>${(x.res || x.ids.map(id => ({ id, name: ch.E[id].name }))).map(r => `<li class="${r.id === 'me' ? 'me' : ''}">${esc(r.name)}${r.flag ? ` <i class="flag">${r.flag}</i>` : ''}</li>`).join('')}</ol>
      ${x.res ? '' : x.ids.includes('me') ? `<div class="row"><button class="btn small" data-act="ev-run" data-arg="${x.id}" ${ev.needKaatoInsp || ev.exhaustLoose ? 'disabled' : ''}>🏁 Kör ditt heat</button>${canSkip(ch, 'me') ? `<button class="btn small ghost" data-act="ev-skip">KESKÖIDÄ</button>` : ''}</div>` : `<div class="row"><button class="btn small ghost" data-act="ev-watch" data-arg="${x.id}">👁 Titta</button></div>`}</div>`).join('')}</div>
    ${canSkip(ch, 'me') ? `<p class="dim">KESKÖIDÄ: hoppa över ${ch.round === 'alku' ? 'Alkuerä och gå direkt till Keräilyerä' : 'Keräilyerä och gå direkt till Last Call'}. Last Call, semifinal och finaler kan inte hoppas över.</p>` : ''}
    <div class="row wrap">${rd ? `<button class="btn" data-act="ev-next">Vidare till nästa omgång →</button>` : !mine ? `<button class="btn" data-act="ev-next">${isFinalRound ? 'Simulera finalen' : 'Simulera omgången'} och gå vidare →</button>` : ''}
      ${!ev.service && cost > 0 ? `<button class="btn ghost" data-act="ev-repair" ${S.money >= cost ? '' : 'disabled'}>🔧 Laga bilen (${eur(cost)})</button>` : ''}
      ${ev.rules.salePrice > 0 ? `<button class="btn ghost" data-act="ev-buy-arpa" ${S.money >= 20 ? '' : 'disabled'}>🎟 Köp lott (20 €)</button>` : ''}
      <button class="btn ghost danger" data-act="ev-quit">${ev.hist.length === 0 && ev.feePaid > 0 ? 'Bryt före 1:a heatet (få hyvityskuitti)' : 'Avbryt dagen'}</button></div>
    <div class="pills"><div class="${ev.dmg > 65 ? 'bad' : ''}"><span>Skador</span><b>${Math.round(ev.dmg)} %</b></div><div><span>Däckslitage</span><b>${Math.round(ev.wear ? ev.wear[0] : 0)} / ${Math.round(ev.wear ? ev.wear[1] : 0)} %</b><small>fram / bak</small></div><div><span>Lotter</span><b>${ev.arvat} st</b></div></div></section>`;
  return h + historyPanel(ch);
}
export function historyPanel(ch) {
  if (!ch.history.length) return '';
  return `<section class="panel"><h2>Tidigare omgångar</h2>${[...ch.history].reverse().map(r => `<details><summary>${r.round === 'final' ? r.letter + '-final' : ROUND[r.round]} (${r.heats.length} heat)</summary>${r.heats.map(x => `<h3>${heatName(x)}</h3>${resTable(x.res, r.round === 'final' && r.letter === 'A' ? (q, i) => A_TABLE[i] : null)}`).join('')}</details>`).join('')}</section>`;
}
export function statsPanel() { const st = stats(), h = st.sec / 3600, rows = Object.entries(st.tracks).sort((a, b) => b[1].n - a[1].n);
  const tname = id => (TRACKS.find(t => t.id === id) || { name: id }).name.split(' – ')[0];
  return `<section class="panel stats-p"><div class="lv-head"><h2>Din körstatistik</h2><span>sparas i den här webbläsaren</span></div>
    <div class="pills"><div><span>Körtid</span><b>${h >= 1 ? fmt(h, 1) + ' h' : fmt(st.sec / 60, 0) + ' min'}</b><small>på banan</small></div>
      <div><span>Körda heat</span><b>${st.races}</b><small>${st.wins} segrar</small></div>
      <div><span>Banor körda</span><b>${rows.length} / ${TRACKS.length}</b></div></div>
    ${rows.length ? `<table class="res stat-t"><tr><th>Bana</th><th>Heat</th><th>Körtid</th><th>Bästa varv</th></tr>${rows.map(([id, r]) => `<tr><td>${tname(id)}</td><td>${r.n}</td><td>${fmt(r.sec / 60, 0)} min</td><td>${S.records[id] ? fmtTime(S.records[id]) : '–'}</td></tr>`).join('')}</table>` : '<p class="dim">Kör ditt första heat så börjar listan fyllas.</p>'}</section>`; }
// ---- erfarenhet (XP), nivåer och upplåsningar ----
export const xpLevel = (xp = S.xp || 0) => { let l = 1; while (l < XP_LEVELS.length && xp >= XP_LEVELS[l]) l++; return l; };
export const xpBonus = () => { let b = 0; for (let l = 2; l <= xpLevel(); l++) if (XP_UNLOCKS[l]?.bonus) b = XP_UNLOCKS[l].bonus; return b; };
export const withBonus = prize => Math.round(prize * (1 + xpBonus() / 100));
export function giveXp(res) {
  if (!res) return; const fin = !!res.finished, pos = res.pos || 0;
  let xp = 10 + (fin ? 10 : 0) + (pos ? Math.max(0, 7 - pos) * 5 : 0) + (fin && pos === 1 ? 15 : 0) + (fin && !res.flag ? 5 : 0);
  const before = xpLevel(); S.xp = (S.xp || 0) + xp; const after = xpLevel();
  U.toast = after > before ? `⭐ NIVÅ ${after}! ${XP_UNLOCKS[after] ? 'Upplåst: ' + XP_UNLOCKS[after].text : ''}` : `+${xp} XP`;
}
export function xpPanel() {
  const xp = S.xp || 0, l = xpLevel(xp), lo = XP_LEVELS[l - 1] || 0, hi = XP_LEVELS[l], pct = hi ? Math.round((xp - lo) / (hi - lo) * 100) : 100;
  const next = Object.keys(XP_UNLOCKS).map(Number).find(k => k > l);
  return `<section class="panel"><h2>Erfarenhet – nivå ${l}${l >= 11 ? ' · Veteraani' : ''}</h2>
    <div class="xpbar"><i style="width:${pct}%"></i></div>
    <p class="dim">${fmt(xp)} XP${hi ? ` · ${fmt(hi - xp)} XP kvar till nivå ${l + 1}` : ' · högsta nivån'}${xpBonus() ? ` · +${xpBonus()} % prispengar` : ''}${next ? ` · Nästa upplåsning (nivå ${next}): ${XP_UNLOCKS[next].text}` : ''}</p>
    <p class="dim">XP får du för varje heat: mer för bra placering, vinst, målgång och rent lopp.</p></section>`;
}
export function countRace(trackId, res) { giveXp(res); { const cs = activeCar(); if (cs?.faults && Object.values(cs.faults).some(f => !f.found)) revealFaults(cs, 'Efter loppet märkte du'); } if (res && isFinite(res.bestLap) && res.bestLap > 5 && !res.flag) record(trackId, res.bestLap); /* bästa varv från alla lopp går till topplistan */ const st = stats(), d = Math.max(0, res.dur || 0); st.sec += d; st.races++; if (res.pos === 1 && res.finished) st.wins++; const t = st.tracks[trackId] || (st.tracks[trackId] = { n: 0, sec: 0 }); t.n++; t.sec += d; save(); pushBoard(); }
export function record(track, lap) { if (!S.records[track] || lap < S.records[track]) { S.records[track] = lap; save(); } }
export function startRace(o) {
  const cs = activeCar(), insp = currentInsp(), s = o.playerSpec || (o.specLvl ? specCar(o.specLvl) : insp.spec); // spec-läge: alla kör samma bil
  const numStr = formatCarNum(cs.num, insp.cls);
  U.view = 'race'; document.body.classList.add('racing'); app().innerHTML = ''; MUSIC.stop();
  const done = o.onDone;
  U.race = new Race(app(), {
    ...o, onDone: res => { if (o.replay) return done(res); if (res?.replay && !o.spectate) U.lastReplay = { o: { ...o, net: null, netLead: false, heatId: null }, rec: res.replay }; if (!o.spectate) countRace(o.trackId, res); done(res); }, record: S.records[o.trackId], settings: S.settings,
    onCameraChange: camera => { S.settings.camera = camera; save(); },
    player: o.spectate ? o.player : { nid: 'me', name: o.net ? `${netName()} #${numStr}` : `${S.name || 'Du'} (#${numStr})`, num: numStr, spec: s, paint: paintOf(cs.paint).rgb, bw: cs.bw || 'wb', aids: { ...S.aids } },
  });
}
export function quickDone(r, time) {
  if (time && r?.ghost && U.lastGhostKey) { const G = S.ghosts ||= {}, old = G[U.lastGhostKey]; if (!old || r.ghost.t < old.t) { G[U.lastGhostKey] = { t: r.ghost.t, f: r.ghost.f }; save(); } }
  if (isFinite(r.bestLap)) record(U.quick.track, r.bestLap);
  const prize = time || r.flag ? 0 : withBonus(NORMAL_PRIZE[r.pos - 1] || 0); if (prize && r.finished) S.money += prize; save();
  U.result = { r, time, prize: r.finished ? prize : 0, title: time ? 'Tidskörning' : 'Träningsheat' }; U.view = 'result'; render();
}
// 🎬 Repris av senaste heatet: samma bana, bilar och väder – bilarna följer inspelningen
export function replayBtn() { return U.lastReplay ? '<button class="btn ghost" data-act="replay">🎬 Se repris av senaste heatet</button>' : ''; }
export function result() {
  const R = U.result; if (!R) { U.view = 'karriar'; return karriar(); }
  const r = R.r;
  return `<section class="panel"><span class="kick">${R.title.toUpperCase()}</span><h1>${R.time ? 'Bästa varv ' + fmtTime(r.bestLap) : `Plats ${r.pos}${r.flag ? ' (' + r.flag + ')' : ''}`}</h1>
    ${R.time ? '' : `<div class="pills"><div><span>Prispengar</span><b>${eur(R.prize)}</b></div></div>`}
    ${resTable(r.order, R.time ? null : (o, i) => [o.flag ? 0 : NORMAL_PRIZE[i] || 0, 0])}
    <div class="row"><button class="btn" data-act="go" data-arg="play">Kör igen</button>${replayBtn()}<button class="btn ghost" data-act="go" data-arg="menu">Meny</button></div></section>`;
}
export const ACT_TAVLING = {
  replay() { const L = U.lastReplay; if (!L) return; const back = U.view; window.scrollTo(0, 0);
    startRace({ ...L.o, replay: L.rec, title: '🎬 Repris – ' + (L.o.title || ''), onDone: () => { U.view = back; render(); } }); return false; },
  'drv-cls'(a) { S.driverCls = a; save(); },
  'do-lippumies'() { S.lippumies = 0; S.warnings = 0; save(); toast('🚩 Du har stått flaggvakt en tävlingsdag (lippumiespesti) – du har nu tävlingsrätt igen!'); },
  'q-track'(a) { U.quick.track = a; },
 'q-laps'(a) { U.quick.laps = +a; },
 'q-opp'(a) { U.quick.opp = +a; },
  'q-weather'(a) { U.quick.weather = a; },
 'q-tod'(a) { U.quick.tod = a; },
 'q-cm'(a) { U.quick.cm = +a; },
  'cc-cm'(a) { champCfg().cm = +a; save(); },
  'q-joker'() { U.quick.joker = U.quick.joker ? 0 : 1; },
  'quick-race'() {
    const q = U.quick, insp = currentInsp(), li = Math.min(3, Math.max(0, Math.round((q.ai - 75) / 10)));
    startRace({
      trackId: q.track, laps: q.laps, opps: makeOpps(q.opp, li, q.ai / 100, insp.cls, undefined, q.cm || 0), specLvl: q.cm || 0,
      grid: q.opp, gridRows: insp.rules.gridRows, useJoker: !!q.joker, sideContact: insp.rules.sideContact,
      title: `${insp.rules.name} – Träningsheat`, mode: 'heat', weather: q.weather, tod: q.tod, onDone: r => quickDone(r),
    });
    return false;
  },
  'quick-time'() {
    const q = U.quick;
    const gk = q.track + '|' + (q.cm ? 'spec' + q.cm : S.active); startRace({ trackId: q.track, laps: q.laps, opps: [], specLvl: q.cm || 0, grid: 0, gridRows: 1, useJoker: false, title: 'Tidskörning', mode: 'time', ghost: S.ghosts?.[gk] || null, ghostKey: (U.lastGhostKey = gk), weather: q.weather, tod: q.tod, onDone: r => quickDone(r, true) });
    return false;
  },
  'ev-start'(a) { evStart(a); window.scrollTo(0, 0); },
  'cc-per'(a) { champCfg().perStart = +a; save(); },
 'cc-heats'(a) { champCfg().heats = +a; save(); },
  'ev-run'(a) { evRun(a, false); return false; },
  'ev-watch'(a) { evRun(a, true); return false; },
  'ev-skip'() { const ev = U.ev; if (ev && chSkip(ev.ch, 'me')) { toast('KESKÖIDÄ – du hoppar över ' + (ev.ch.round === 'alku' ? 'Alkuerä' : 'Keräilyerä') + '.'); } },
  'ev-next'() { evNext(); window.scrollTo(0, 0); },
  'sv-job'(a) { const ev = U.ev; if (ev) svDo(ev, a); },
  'ev-tyres'() { const ev = U.ev; if (ev && S.money >= 40) { S.money -= 40; ev.wear = [0, 0]; save(); toast('Fräscha däck monterade.'); } },
  'ev-repair'() {
    const ev = U.ev, cost = Math.ceil(ev.dmg * 1.0 + (ev.radLeak ? 20 : 0) + (ev.exhaustLoose ? 15 : 0) + (ev.parts ? Math.round((ev.parts.steer || 0) * 0.6 + (ev.parts.gear || 0) * 0.9) : 0));
    if (S.money >= cost) { S.money -= cost; ev.dmg = 0; ev.radLeak = false; ev.exhaustLoose = false; ev.parts = null; save(); toast('Bilen är lagad och avgasröret fäst (≤110 dB).'); }
  },
  'ev-kaato'() {
    const ev = U.ev;
    if (S.money >= 40) { S.money -= 40; ev.needKaatoInsp = false; ev.dmg = Math.min(ev.dmg, 25); save(); toast('✓ Kaatokatsastus godkänd – du får fortsätta tävlingen!'); }
    else { ev.needKaatoInsp = false; toast('✓ Funktionärerna hjälpte dig räta ut taket – kaatokatsastus godkänd!'); }
  },
  'ev-protest'() {
    const ev = U.ev;
    if (!ev || !ev.protestable || S.money < 50) return;
    S.money -= 50; ev.protestable = false;
    // Domarjuryn + kilpailunjohtaja prövar protesten (med kuljettajan edustaja närvarande)
    if (Math.random() < 0.45) {
      S.money += 50;
      S.warnings = Math.max(0, S.warnings - 1);
      toast('✓ Protesten godkändes av domarjuryn! 50 € återbetalas och varningen ströks.');
    } else {
      toast('✗ Protesten avslogs av domarjuryn. Avgiften på 50 € återbetalas ej.');
    }
    save();
  },
  'ev-buy-arpa'() {
    const ev = U.ev;
    if (ev && S.money >= 20) { S.money -= 20; ev.arvat++; save(); toast(`🎟 Köpte 1 lott (arpa) för 20 € (du har nu ${ev.arvat} st).`); }
  },
  'ev-sale-run'() {
    const ev = U.ev; if (!ev || ev.saleDone) return;
    ev.saleDone = true;
    const buyers = Math.floor(Math.random() * 3); // 0..2 köpare på din bil
    if (buyers === 0) {
      ev.saleMsg = '🔨 <b>Autojen myyntitilaisuus</b>: Ingen köpare drog lott på din bil – du behåller bilen och får hämta ut ditt katsastuskortti!';
    } else if (ev.arvat > 0 && Math.random() < Math.min(0.85, 0.38 * ev.arvat)) {
      ev.saleMsg = `🔨 <b>Autojen myyntitilaisuus</b>: Din egen lott (arpa) drogs först! Du använde lotten till att <b>skydda din egen bil (suojata oman auton)</b> mot ${buyers} spekulanter!`;
    } else {
      S.money += 850;
      // Bilen är såld och lämnar garaget – man måste köpa en ny (eller välja en annan man redan äger)
      const soldName = carById(S.active).name; delete S.cars[S.active]; S.active = Object.keys(S.cars)[0] || null;
      ev.saleMsg = `🔨 <b>Autojen myyntitilaisuus</b>: En annan förare vann lottningen och köpte din <b>${soldName}</b> för <b>850 € kontant</b>! Bilen är borta ur garaget – ${S.active ? `du kör vidare med din <b>${carById(S.active).name}</b>` : 'köp en ny bil för att kunna tävla igen'}.`;
    }
    save();
  },
  'ev-quit'() {
    const ev = U.ev;
    if (ev && ev.hist.length === 0 && ev.feePaid > 0) {
      S.vouchers = (S.vouchers || 0) + 1;
      save();
      toast('🎟 Du avbröt före första heatets startljus – du fick 1 hyvityskuitti (tillgodokvitto) till nästa tävling!');
    }
    U.ev = null; U.view = 'karriar';
  },
  'ev-close'() { U.ev = null; U.view = 'karriar'; window.scrollTo(0, 0); },
};
