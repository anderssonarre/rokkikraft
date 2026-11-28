// Online: rum, chatt, säsong, inbjudningar och värdens mästerskapsmotor.
// (Del av menysystemet – se js/ui.js för render() och åtgärderna.)
import { TYRES, TRACKS, SURF } from '../data.js';
import { curve, carById, fuelById, defaultTune, fmt, formatCarNum, SPEC_CARS, specCar } from '../engine.js';
import { S, save, activeCar } from '../state.js';
import { getTrack } from '../track.js';
import { Room, Presence, makeCode, cleanCode } from '../net.js';
import { newChamp, simHeat, setResult, advance, canSkip, skip as chSkip, heatName, whereIs, sortRows, ROUND, A_TABLE, NORMAL_PRIZE } from '../champ.js';
import { TOD, U, WEATHER, currentInsp, esc, eur, hex, netName, paintOf, shuffle, spec, toast } from './core.js';
import { SETUP_UI } from './garage.js';
import { aiSpec, carModeRow, makeOpps, record, replayBtn, resTable, startRace, withBonus } from './tavling.js';
import { pid } from './top.js';
import { render } from '../ui.js';

// ---------- online (rumskod) ----------
// Värden äger rummet: tävlingsinställningar, AI-förare och mästerskapet. Heat med människor körs live (alla heat i en
// omgång startar samtidigt som separata lopp); heat med bara AI simuleras av värden. Alla kan titta på pågående heat.
export const ON = { code: '', room: null, last: null, copied: 0, ch: null, O: {} };
export function netMe() {
  const cs = activeCar(), insp = currentInsp(), s = insp.spec;
  return { name: netName(), car: { spec: s, paint: paintOf(cs.paint).rgb, bw: cs.bw || 'wb', num: formatCarNum(cs.num, insp.cls), model: carById(S.active).name, hp: Math.round(curve(s).hp), kgHp: curve(s).kgHp, cls: insp.rules.name, tune: { ...defaultTune(), ...(cs.tune || {}) } } };
}
// ---- chatt i online-rummet ----
export const QUICK = ['GG', 'En till?', 'Lycka till! 🍀', 'Vänta lite', 'Redo!', 'Haha 😂', 'Bra kört 👏', 'Revansch!'];
export function chatPanel(room) {
  const C = room.chat || [];
  return `<section class="panel"><h2>Chatt</h2><div class="chat" id="chatBox">${C.length ? C.slice(-12).map(m => `<div class="cl ${m.id === room.id ? 'me' : ''}"><b>${esc(m.name)}</b> ${esc(m.text)}</div>`).join('') : '<p class="dim">Inga meddelanden än – säg hej!</p>'}</div>
    <div class="row wrap">${QUICK.map(q => `<button class="chip s" data-act="say" data-arg="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <div class="row"><input class="on-in" id="chatIn" maxlength="80" placeholder="Skriv ett meddelande…" autocomplete="off"><button class="btn small" data-act="say-in">Skicka</button></div></section>`;
}
// ---- online-säsong: flera tävlingar i rad med sparad poängtabell (värden äger säsongen) ----
export const SEASON_PTS = [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
export function seasonPanel(room) {
  const cfg = room.cfg, se = cfg.season, H = room.isHost, mine = Object.values(S.onSeasons || {}).filter(x => x.host === pid() && x.done.length < x.rounds);
  let h = `<section class="panel"><h2>Säsong</h2>`;
  if (se) { const rows = Object.entries(se.pts).sort((a, b) => b[1] - a[1]);
    h += `<p><b>${esc(se.name)}</b> · omgång ${Math.min(se.done.length + 1, se.rounds)} av ${se.rounds}${se.done.length >= se.rounds ? ' · <b>avslutad!</b>' : ''}</p>
      <div class="se-wrap"><table class="stats se-tab"><tr><th>#</th><th>Förare</th>${Array.from({ length: se.rounds }, (_, r) => { const x = se.res?.[r], t = x && TRACKS.find(k => k.id === x.trk); return `<th title="${t ? esc(t.name) : 'Ej körd än'}">R${r + 1}${t ? `<small>${esc(t.name.split(/\s[–-]\s/)[0])}</small>` : ''}</th>`; }).join('')}<th>Poäng</th><th>Segrar</th></tr>
      ${rows.map(([n, p], i) => `<tr class="${n === netName() ? 'me' : ''}"><td>${i + 1}${se.done.length >= se.rounds && !i ? ' 🏆' : ''}</td><td>${esc(n)}</td>${Array.from({ length: se.rounds }, (_, r) => { const x = se.res?.[r]; if (!x) return '<td class="dim">·</td>'; const q = x.ord.indexOf(n) + 1; return `<td class="pl${q && q <= 3 ? ' p' + q : ''}">${q ? q + '.' : '–'}</td>`; }).join('')}<td><b>${p}</b></td><td>${se.wins[n] || 0}</td></tr>`).join('') || `<tr><td colspan="${se.rounds + 4}">Inga poäng än – kör första tävlingen!</td></tr>`}</table></div>
      ${se.done.length > (se.res || []).filter(Boolean).length ? '<p class="dim">Omgångar som kördes före uppdateringen visas bara som poäng (·).</p>' : ''}
      <p class="dim">Poäng efter slutplacering i varje tävling: ${SEASON_PTS.slice(0, 6).join('-')}… Tabellen sparas och kan fortsätta en annan dag.</p>
      ${H ? '<div class="row"><button class="btn small ghost" data-act="se-off">Pausa säsongen</button></div>' : ''}`; }
  else if (H) h += `<p class="dim">Kör flera tävlingar i rad med en gemensam poängtabell som sparas.</p>
      <div class="row"><span class="lbl">Ny säsong</span>${[3, 5, 8].map(n => `<button class="chip s" data-act="se-new" data-arg="${n}">${n} omgångar</button>`).join('')}</div>
      ${mine.length ? `<div class="row"><span class="lbl">Fortsätt</span>${mine.map(x => `<button class="chip s" data-act="se-cont" data-arg="${x.id}">${esc(x.name)} (${x.done.length}/${x.rounds})</button>`).join('')}</div>` : ''}`;
  else h += '<p class="dim">Ingen säsong pågår. Värden kan starta en.</p>';
  return h + '</section>';
}
export function seasonTick(room) { // när en tävling är klar: värden delar ut säsongspoäng en gång
  const cs = room.champ, se = room.cfg.season; if (!se || !cs?.done || !cs.overall) return;
  const key = room.code + ':' + cs.overall.map(r => r.id + r.pos).join(',');
  if (room.isHost && !se.done.includes(key) && se.done.length < se.rounds) { const n = { ...se, pts: { ...se.pts }, wins: { ...se.wins }, done: [...se.done, key], res: [...(se.res || []), ...Array(Math.max(0, se.done.length - (se.res?.length || 0))).fill(null), { trk: room.cfg.track, ord: cs.overall.map(r => r.name || '?') }] };
    cs.overall.forEach((r, i) => { const nm = r.name || '?'; n.pts[nm] = (n.pts[nm] || 0) + (SEASON_PTS[i] || 0); if (i === 0) n.wins[nm] = (n.wins[nm] || 0) + 1; });
    (S.onSeasons ||= {})[n.id] = n; save(); room.setCfg({ season: n }); }
  else if (!room.isHost) { const o = (S.onSeasons ||= {})[se.id]; if (!o || o.done.length < se.done.length) { S.onSeasons[se.id] = se; save(); } }
}
// ---- inbjudningar: se vilka som har spelet öppet och bjud in dem till rummet ----
export let PRES = null;
export function startPresence() {
  if (PRES) return; try {
    PRES = new Presence({
      getMe: () => ({ name: netName(), room: ON.room && ['lobby', 'race'].includes(ON.room.status) ? ON.room.code : '', racing: U.view === 'race' }),
      onList: () => { if (U.view === 'online' && ON.room) { clearTimeout(ON.plT); ON.plT = setTimeout(() => { if (U.view === 'online' && ON.room && !document.activeElement?.matches?.('input')) render(); }, 300); } },
      onInvite: inv => { if (ON.room && ON.room.code === inv.code) return; U.invite = { ...inv, t: Date.now() }; if (U.view !== 'race') render(); },
    });
  } catch (e) { PRES = null; }
}
export function inviteBox() {
  const v = U.invite; if (!v || U.view === 'race') return ''; if (Date.now() - v.t > 180000) { U.invite = null; return ''; }
  return `<div class="invite-box"><div><b>🏁 ${esc(v.name)} bjuder in dig</b><small>Online-rum ${esc(v.code)}</small></div>
    <button class="btn small" data-act="inv-join">Gå med</button><button class="btn small ghost" data-act="inv-no">Nej tack</button></div>`;
}
export function invitePanel(room) {
  if (!PRES) return '';
  const ppl = PRES.others().filter(p => p.room !== room.code), sent = ON.invited || (ON.invited = new Map());
  const st = p => p.room ? `i rum ${esc(p.room)}` : p.racing ? 'kör ett lopp' : 'i menyerna';
  return `<section class="panel"><h2>Bjud in spelare</h2>
    ${!PRES.connected ? '<p class="dim">Ansluter…</p>' : !ppl.length ? '<p class="dim">Ingen annan har spelet öppet just nu. Listan uppdateras av sig själv.</p>' : `
    <div class="row"><button class="btn" data-act="inv-all">📨 Bjud in alla (${ppl.length})</button></div>
    <div class="inv-list">${ppl.map(p => `<div class="inv-row"><span><b>${esc(p.name)}</b><small>${st(p)}</small></span>
      ${sent.get(p.id) && Date.now() - sent.get(p.id) < 60000 ? '<i class="dim">✓ Inbjuden</i>' : `<button class="chip s" data-act="inv-one" data-arg="${esc(p.id)}">Bjud in</button>`}</div>`).join('')}</div>`}</section>`;
}
export const roomLink = code => location.origin + location.pathname + '?rum=' + code;
export function setRumParam(code) { try { const q = new URLSearchParams(location.search); if (code) q.set('rum', code); else q.delete('rum'); const t = q.toString(); history.replaceState(null, '', location.pathname + (t ? '?' + t : '')); } catch (e) { } }
export function openRoom(code, host) {
  if (ON.room) ON.room.leave();
  const room = ON.room = new Room({ code, host, me: netMe(), onChange: () => { if (U.view === 'online') render(); } });
  room.onChat = m => { if (m.id !== room.id && room.race?.msg && !room.race.dead) room.race.msg(`💬 <b>${esc(m.name)}</b>: ${esc(m.text)}`, 3.2); };
  ON.last = null; ON.ch = null; if (host) room.cfg.track = U.quick.track;
  room.onStart = (h, grid, cfg, lead) => netRace(h, grid, cfg, lead, false);
  room.onHeatEnd = (h, order) => { if (room.isHost) hostHeatEnd(h, order); };
  room.onSkip = id => { if (ON.ch && chSkip(ON.ch, id)) pushChamp(); };
  setRumParam(code);
}
export function leaveRoom() { if (ON.room) ON.room.leave(); ON.room = null; ON.last = null; ON.ch = null; setRumParam(''); }
export function netRace(h, grid, cfg, lead, watch) {
  const room = ON.room; if (U.view === 'race') return;
  const my = grid.findIndex(g => g.id === room.id); if (!watch && my < 0) return;
  const amLead = lead === room.id;
  const defs = grid.filter(g => watch || g.id !== room.id).map(g => g.ai
    ? { name: g.name, paint: g.paint, bw: g.bw, diff: g.diff, powScale: g.powScale, spec: g.spec, nid: g.id, remote: watch || !amLead }
    : { name: g.name, paint: g.car.paint, bw: g.car.bw, num: g.car.num, skill: 1, spec: cfg.cm ? specCar(cfg.cm) : cfg.hc && cfg.hcSpec ? cfg.hcSpec : g.car.spec, nid: g.id, remote: true });
  const base = { trackId: cfg.track, laps: cfg.laps, gridRows: 2, useJoker: !!cfg.joker, sideContact: true, mode: 'heat', weather: cfg.weather, tod: cfg.tod || 'dag', net: room, heatId: h, netLead: lead, specLvl: cfg.cm || 0, playerSpec: !cfg.cm && cfg.hc && cfg.hcSpec ? cfg.hcSpec : null };
  if (watch) { const hum = defs.filter(d => grid.find(g => g.id === d.nid && !g.ai)), first = hum.find(d => d.nid !== room.id) || hum[0] || defs[0], rest = defs.filter(d => d !== first); // börja på en kompis, inte en AI
    startRace({ ...base, opps: rest, player: first, spectate: true, grid: 0, title: '👁 Online', onDone: () => { room.backToLobby(); U.view = 'online'; render(); } }); return; }
  startRace({ ...base, opps: defs, grid: my, title: 'Online – ' + (ON.champ?.heats?.find(x => x.id === h)?.name || 'heat'),
    onDone: r => { (ON.doneHeats ||= new Set()).add(h); room.backToLobby(); ON.last = r; if (isFinite(r.bestLap)) record(cfg.track, r.bestLap); U.view = 'online'; render(); } });
}
// ---- värdens mästerskapsmotor ----
export function hostStart() {
  const room = ON.room, cfg = room.cfg; if (!room || !room.isHost) return;
  if (cfg.hc && !cfg.cm) room.setCfg({ hcSpec: spec() }); // alla kör värdens bil – med värdens senaste inställningar
  const humans = room.members.filter(m => m.car && m.car.spec);
  const maxHp = Math.max(curve(spec()).hp, ...humans.map(m => m.car.hp || 0)), nAi = Math.max(0, Math.min(30, cfg.ai)), opps = makeOpps(nAi, 1, Math.max(0.01, cfg.diff / 100), currentInsp().cls, maxHp + 500, cfg.cm || 0, cfg.season ? 'on:' + cfg.season.id : null); // AI: 500 hk mer än starkaste spelaren (spec-läge: en nivå högre)
  if (!cfg.cm) { // egen bil: AI:n kör samma bil som den starkaste spelaren, men med 100 hk mer
    const best = cfg.hc ? null : humans.reduce((b, m) => (m.car.hp || 0) > (b?.car.hp || 0) ? m : b, null), bs = cfg.hc ? cfg.hcSpec : best ? best.car.spec : spec(), bh = Math.max(1, curve(bs).hp);
    for (const o of opps) { o.spec = bs; o.powScale = (bh + 100) / bh; }
  }
  ON.O = {}; const ents = humans.map(m => ({ id: m.id, name: m.name, human: 1, kgHp: cfg.cm ? curve(specCar(cfg.cm)).kgHp : cfg.hc ? curve(cfg.hcSpec).kgHp : m.car.kgHp || 7 }));
  opps.forEach((o, i) => { const id = 'ai' + i; ON.O[id] = { id, ai: 1, ...o }; ents.push({ id, name: o.name, diff: o.diff, kgHp: curve(o.spec).kgHp / (o.powScale || 1) }); });
  const trkLen = getTrack(cfg.track).len;
  ON.ch = ents.length <= cfg.perStart
    ? { single: 1, cfg: { perStart: cfg.perStart, laps: cfg.laps, joker: cfg.joker, trackLen: trkLen }, E: Object.fromEntries(ents.map(e => [e.id, e])), round: 'heat', heats: [{ id: 'h1', round: 'heat', no: 1, count: 1, ids: shuffle(ents.map(e => e.id)), res: null }], history: [], done: false }
    : newChamp({ perStart: cfg.perStart, heats: Math.ceil(ents.length / cfg.perStart), laps: cfg.laps, joker: cfg.joker, trackLen: trkLen }, ents);
  ON.ch.cfgRoom = { ...cfg }; ON.ch.n = 0;
  hostRound();
}
export const hName = h => h.round === 'heat' ? 'Heat' : heatName(h);
export function hostRound() {
  const ch = ON.ch, room = ON.room; ch.n++;
  for (const h of ch.heats) {
    if (h.res) continue;
    const hum = h.ids.filter(id => ch.E[id].human && room.members.some(m => m.id === id));
    if (!hum.length) { setResult(ch, h, simHeat(ch, h)); continue; }
    const lead = hum.includes(room.id) ? room.id : hum[0];
    const grid = h.ids.map(id => ch.E[id].human ? { id, name: ch.E[id].name, car: room.members.find(m => m.id === id)?.car } : ON.O[id]).filter(g => g.ai || g.car);
    h.live = ch.round + ch.n + h.id;
    room.startHeat(h.live, grid, { ...ch.cfgRoom }, lead);
  }
  pushChamp(); hostCheck();
}
export function hostHeatEnd(hid, order) {
  const ch = ON.ch; if (!ch) return; const h = ch.heats.find(x => x.live === hid); if (!h || h.res) return;
  setResult(ch, h, sortRows(order.map(o => ({ id: o.id, name: o.name, time: o.time, best: o.best, jokerLap: o.jokerLap, flag: o.flag }))));
  pushChamp(); hostCheck();
}
export function hostCheck() { // när alla heat i omgången är klara visas resultaten; värden startar nästa omgång
  const ch = ON.ch; if (!ch || !ch.heats.every(h => h.res)) return;
  if (ch.single) { ch.done = true; ch.history.push({ round: 'heat', heats: ch.heats }); ch.overall = ch.heats[0].res.map((r, i) => ({ id: r.id, name: r.name, pos: i + 1, prize: r.flag ? 0 : NORMAL_PRIZE[i] || 0, pts: 0 })); }
  ON.room.toLobby(); pushChamp();
}
export function hostNext() { const ch = ON.ch; if (!ch || ch.done || !ch.heats.every(h => h.res)) return; advance(ch); if (!ch.done) hostRound(); else pushChamp(); }
export function pushChamp() {
  const ch = ON.ch, room = ON.room; if (!ch || !room) return;
  const pack = h => ({ id: h.id, live: h.live, name: hName(h), ids: h.ids, res: h.res });
  room.sendChamp({ round: ch.single ? 'heat' : ch.round, letter: ch.letter, single: !!ch.single, done: ch.done, all: ch.heats.every(h => h.res), heats: ch.heats.map(pack),
    hist: ch.history.slice(-8).map(r => ({ name: r.round === 'final' ? r.letter + '-final' : ROUND[r.round] || 'Heat', heats: r.heats.map(pack) })),
    names: Object.fromEntries(Object.entries(ch.E).map(([id, e]) => [id, e.name])), overall: ch.overall || null,
    where: Object.fromEntries(room.members.map(m => [m.id, ch.single ? '' : whereIs(ch, m.id)])), skip: room.members.filter(m => !ch.single && canSkip(ch, m.id)).map(m => m.id), cfg: ch.cfgRoom });
}
// Värdens bilinställningar visas för alla i rummet (och kan kopieras till den egna bilen)
export const FREE_SETUP = ['spring', 'damper', 'press', 'camber', 'toeF', 'toeR', 'rideF', 'rideR', 'rake', 'gearSpread', 'finalScale', 'brakeF', 'bias'];
export function hostCarPanel(hm) {
  const t = hm?.car?.tune; if (!t) return '';
  return `<section class="panel"><h2>Värdens bil och inställningar</h2><p><b>${esc(hm.car.model)}</b> · #${esc(hm.car.num)} · ${esc(hm.car.hp)} hk · ${fmt(hm.car.kgHp, 1)} kg/hk · ${esc(hm.car.cls)}</p>
    <table class="stats"><tr><td>Däck</td><td>${esc(TYRES[t.tyre]?.name || t.tyre)}</td></tr><tr><td>Bränsle</td><td>${esc(fuelById(t.fuel)?.name || t.fuel)} · λ ${fmt(t.lambda, 2)} · tändning ${t.ign > 0 ? '+' : ''}${fmt(t.ign || 0, 1)}°</td></tr>
    ${SETUP_UI.map(([n, k, , , , f]) => `<tr><td>${n}</td><td>${['spring', 'damper'].includes(k) ? t[k] + ' · ' : ''}${f(t[k])}</td></tr>`).join('')}</table>
    <div class="row"><button class="btn small" data-act="copy-setup">📋 Använd samma chassiinställningar på min bil</button></div><p class="dim">Kopierar de gratis justeringarna (fjädring, dämpare, tryck, camber, toe, höjder, växlar och bromsar) – inte däck och fälgar.</p></section>`;
}
export function online() {
  const room = ON.room;
  if (!room) return `<section class="panel"><span class="kick">ONLINE</span><h1>Online</h1>
      <p class="dim">Skapa ett rum och skicka rumskoden (eller länken) till kompisarna, eller skriv in en kod för att gå med. Alla kör med sin egen aktiva bil från garaget.</p>
      <div class="row"><span class="lbl">Ditt namn</span><input class="on-in" id="onName" maxlength="20" value="${esc(netName())}"></div>
      <div class="row"><button class="btn" data-act="on-create">➕ Skapa rum</button></div>
      <div class="row"><span class="lbl">Ange rumskod</span><input class="on-in code" id="onCode" maxlength="4" autocomplete="off" autocapitalize="characters" placeholder="ABCD" value="${esc(ON.code)}"><button class="btn" data-act="on-join">Gå med i rum</button></div>
    </section>`;
  const st = room.status, back = '<div class="row"><button class="btn ghost" data-act="on-leave">‹ Tillbaka</button></div>';
  const head = `<span class="kick">ONLINE · RUM</span><div class="roomcode">${room.code}</div>`;
  if (st === 'connecting') return `<section class="panel">${head}<p>Ansluter till spelservern…</p>${back}</section>`;
  if (st === 'offline') return `<section class="panel">${head}<p>⚠ Kunde inte nå spelservrarna. Kolla nätet (vissa skol- och jobbnät blockerar WebSocket-trafik) – försöker igen automatiskt.</p>${back}</section>`;
  if (st === 'notfound') return `<section class="panel">${head}<p>⚠ Hittade inget öppet rum med koden <b>${room.code}</b>.</p><div class="row"><button class="btn" data-act="on-retry">Försök igen</button><button class="btn ghost" data-act="on-leave">‹ Tillbaka</button></div></section>`;
  if (st === 'closed') return `<section class="panel">${head}<p>Värden stängde rummet eller tappade anslutningen.</p>${back}</section>`;
  const cfg = room.cfg, H = room.isHost, cs = room.champ, trk = TRACKS.find(t => t.id === cfg.track) || TRACKS[0];
  // Prispengar online: när heatet/mästerskapet är klart får varje riktig spelare sitt pris (vinnaren mest) – en gång per tävling
  if (cs?.done && cs.overall) { const key = room.code + ':' + cs.overall.map(r => r.id + r.pos).join(','), me = cs.overall.find(r => r.id === room.id); S.onlinePaid = S.onlinePaid || [];
    if (me && !S.onlinePaid.includes(key)) { S.onlinePaid.push(key); if (S.onlinePaid.length > 40) S.onlinePaid.shift(); if (me.prize > 0) { me.prize = withBonus(me.prize); S.money += me.prize; U.toast = `🏆 ${me.pos === 1 ? 'Du vann' : 'Plats ' + me.pos} – ${eur(me.prize)} insatt!`; } save(); } }
  seasonTick(room);
  const running = cs && !cs.all && !cs.done;
  let h = `<section class="panel">${head}
      <div class="row"><input class="on-in link" readonly value="${esc(roomLink(room.code))}" onclick="this.select()"><button class="btn small" data-act="on-copy">${ON.copied ? '✓ Kopierad' : '📋 Kopiera länk'}</button></div>
      <p class="dim">${room.connected ? `Ansluten (${room.connected} server${room.connected > 1 ? 'ar' : ''}).` : '⚠ Ingen anslutning just nu – återansluter…'}</p></section>
    <section class="panel"><h2>Förare i rummet (${room.members.length}/8)</h2><table class="stats">
      ${room.members.map(m => `<tr><td><span class="dot" style="background:${hex(m.car?.paint || [.5, .5, .5])}"></span><b>${esc(m.name)}</b>${m.host ? ' · värd' : ''}${m.id === room.id ? ' · du' : ''}</td><td>#${esc(m.car?.num)} ${esc(m.car?.model)} · ${esc(m.car?.hp)} hk</td><td>${cs?.where?.[m.id] ? esc(cs.where[m.id]) : ''}</td></tr>`).join('')}</table>
      <div class="row"><button class="btn small ghost" data-act="go" data-arg="garage">Byt bil i garaget</button></div></section>`;
  h += chatPanel(room) + seasonPanel(room);
  if (room.status === 'lobby' || room.status === 'race') h += invitePanel(room); // bjud in andra som har spelet öppet
  if (U.lastReplay && room.status === 'lobby') h += `<section class="panel"><div class="row">${replayBtn()}</div></section>`;
  if (H && !running) {
    cfg.tod ??= 'dag'; const C = (k, v, n) => `<button class="chip s ${cfg[k] === v ? 'on' : ''}" data-act="on-cfg" data-arg="${k}:${v}">${n ?? v}</button>`;
    h += `<section class="panel"><h2>Tävlingsinställningar</h2>
      ${cs && !cs.done ? '<p class="dim">Mästerskapet pågår – inställningarna låses tills det är klart.</p>' : `      <h3>Bana</h3><div class="chips">${TRACKS.map(t => `<button class="chip ${cfg.track === t.id ? 'on' : ''}" data-act="on-cfg" data-arg="track:${t.id}">${t.name}<small>${SURF[t.surface].name.split(' ')[0]}</small></button>`).join('')}</div>
      <div class="row"><span class="lbl">Väder</span>${WEATHER.map(([k, n]) => C('weather', k, n)).join('')}</div>
      <div class="row"><span class="lbl">Tid på dygnet</span>${TOD.map(([k, n]) => C('tod', k, n)).join('')}</div>
      <div class="row"><span class="lbl">Varv ${cfg.laps}</span><input type="range" min="1" max="100" step="1" value="${cfg.laps}" data-in="on-laps"></div>
      <div class="row"><span class="lbl">AI-motståndare ${cfg.ai}</span><input type="range" min="0" max="30" step="1" value="${cfg.ai}" data-in="on-ai"></div>
      <div class="row"><span class="lbl">AI-svårighet ${cfg.diff} %</span><input type="range" min="1" max="100" step="1" value="${cfg.diff}" data-in="on-diff"></div>
      ${carModeRow('on-cm', cfg.hc ? 'hc' : cfg.cm || 0, netMe().car)}
      <div class="row"><span class="lbl">Förare per start</span>${[4, 5, 6, 7, 8].map(n => C('perStart', n)).join('')}<span class="lbl">Jokerlap</span>${C('joker', cfg.joker ? 0 : 1, cfg.joker ? 'PÅ' : 'AV')}</div>
      <p class="dim">${room.members.length + cfg.ai} förare totalt → ${room.members.length + cfg.ai > cfg.perStart ? `mästerskap med ${Math.ceil((room.members.length + cfg.ai) / cfg.perStart)} alkuerä-heat` : 'ett heat'}.</p>`}
      ${cs && cs.all && !cs.done ? `<div class="row"><button class="btn" data-act="on-next">▶ Starta nästa omgång</button><button class="btn ghost danger" data-act="on-reset">Avbryt mästerskapet</button></div>`
        : `<div class="row"><button class="btn" data-act="on-start" ${room.connected ? '' : 'disabled'}>🏁 Starta ${room.members.length + cfg.ai > cfg.perStart ? 'mästerskapet' : 'heatet'}</button><button class="btn ghost danger" data-act="on-leave">Stäng rummet</button></div>`}</section>`;
  } else if (!H) {
    const hm = room.members.find(m => m.host), n = room.members.length + (cfg.ai || 0);
    h += `<section class="panel"><h2>Värdens tävlingsinställningar</h2><p class="dim">Ställs in av ${esc(hm?.name || 'värden')} – uppdateras direkt när värden ändrar något.</p><table class="stats">
      <tr><td>Bana</td><td><b>${trk.name}</b> · ${SURF[trk.surface].name}</td></tr><tr><td>Väder</td><td>${(WEATHER.find(w => w[0] === cfg.weather) || WEATHER[0])[1]}</td></tr><tr><td>Tid på dygnet</td><td>${(TOD.find(w => w[0] === (cfg.tod || 'dag')) || TOD[1])[1]}</td></tr>
      <tr><td>Varv</td><td>${cfg.laps}</td></tr><tr><td>AI-motståndare</td><td>${cfg.ai} st · svårighet ${cfg.diff} %</td></tr>
      <tr><td>Bilar</td><td>${cfg.cm ? `Alla: Mazda 626 Spec ${cfg.cm} (${SPEC_CARS[cfg.cm].hp} hk) · AI Spec ${aiSpec(cfg.cm)}` : cfg.hc ? `<b>Alla har värdens bil</b>${hm?.car ? ` – ${esc(hm.car.model)}, ${esc(hm.car.hp)} hk, med värdens inställningar` : ''} · AI +100 hk` : 'Egen bil från garaget'}</td></tr>
      <tr><td>Förare per start</td><td>${cfg.perStart}</td></tr><tr><td>Jokerlap</td><td>${cfg.joker ? 'PÅ' : 'AV'}</td></tr>
      <tr><td>Upplägg</td><td>${n} förare → ${n > cfg.perStart ? `mästerskap med ${Math.ceil(n / cfg.perStart)} alkuerä-heat` : 'ett heat'}</td></tr>
      <tr><td>Säsong</td><td>${cfg.season ? `${esc(cfg.season.name)} · omgång ${Math.min(cfg.season.done.length + 1, cfg.season.rounds)}/${cfg.season.rounds}` : '–'}</td></tr></table></section>
      ${hostCarPanel(hm)}<section class="panel">
      <p>${running ? '🏁 Omgången pågår.' : cs && cs.all && !cs.done ? '⏳ Väntar på att värden startar nästa omgång…' : '⏳ Väntar på att värden startar…'}</p>
      ${cs?.skip?.includes(room.id) ? `<div class="row"><button class="btn small" data-act="on-skip">KESKÖIDÄ – hoppa över ${cs.round === 'alku' ? 'Alkuerä' : 'Keräilyerä'}</button></div>` : ''}
      <div class="row"><button class="btn ghost danger" data-act="on-leave">Lämna rummet</button></div></section>`;
  } else if (cs?.skip?.includes(room.id)) h += `<section class="panel"><div class="row"><button class="btn small" data-act="on-skip">KESKÖIDÄ</button></div></section>`;
  if (cs) {
    const nm = id => esc(cs.names[id] || id);
    h += `<section class="panel"><h2>${cs.done ? 'Klart' : cs.single ? 'Heat' : cs.round === 'final' ? cs.letter + '-finalen' : ROUND[cs.round]} – startlistor</h2><div class="heats">${cs.heats.map(x => {
      const L = x.live && room.live[x.live], live = L && !L.done && !x.res;
      return `<div class="heat ${x.ids.includes(room.id) ? 'mine' : ''} ${x.res ? 'done' : ''}"><div class="hh"><b>${esc(x.name)}</b><span>${x.res ? 'Klart' : live ? '🔴 Pågår' : 'Simuleras'}</span></div>
        <ol>${(x.res || x.ids.map(id => ({ id, name: cs.names[id] }))).map(r => `<li class="${r.id === room.id ? 'me' : ''}">${esc(r.name)}${r.flag ? ` <i class="flag">${esc(r.flag)}</i>` : ''}</li>`).join('')}</ol>
        ${live && (!x.ids.includes(room.id) || ON.doneHeats?.has(x.live)) ? `<div class="row"><button class="btn small ghost" data-act="on-watch" data-arg="${x.live}">👁 Titta</button></div>` : ''}
        ${live && x.ids.includes(room.id) && !ON.doneHeats?.has(x.live) ? `<div class="row"><button class="btn small" data-act="on-rejoin" data-arg="${x.live}">🏁 Till ditt heat</button></div>` : ''}</div>`; }).join('')}</div></section>`;
    for (const x of cs.heats.filter(x => x.res)) h += `<section class="panel"><h2>Resultat: ${esc(x.name)}</h2>${resTable(x.res.map(r => ({ ...r, isPlayer: r.id === room.id })), cs.single ? (r, i) => [r.flag ? 0 : NORMAL_PRIZE[i] || 0, 0] : x.name === 'A-final' ? (r, i) => A_TABLE[i] : null)}</section>`;
    if (cs.done && cs.overall && !cs.single) h += `<section class="panel"><h2>Slutresultat</h2><table class="res"><tr><th>#</th><th>Förare</th><th>Pris</th><th>Poäng</th></tr>${cs.overall.slice(0, 16).map(r => `<tr class="${r.id === room.id ? 'me' : ''}"><td>${r.pos}</td><td>${nm(r.id)}</td><td>${r.prize ? eur(r.prize) : '–'}</td><td>${r.pts || '–'}</td></tr>`).join('')}</table></section>`;
    if (cs.hist?.length) h += `<section class="panel"><h2>Tidigare omgångar</h2>${[...cs.hist].reverse().map(r => `<details><summary>${esc(r.name)}</summary>${r.heats.map(x => `<h3>${esc(x.name)}</h3>${x.res ? resTable(x.res) : ''}`).join('')}</details>`).join('')}</section>`;
  }
  return h;
}
export const ACT_ONLINE = {
  say(a) { ON.room?.say(netName(), a); return false; },
  'say-in'() { const el = document.getElementById('chatIn'); if (el?.value.trim()) { ON.room?.say(netName(), el.value); el.value = ''; } return false; },
  'se-new'(a) { const r = ON.room; if (!r?.isHost) return; const id = 's' + Date.now().toString(36), n = (Object.keys(S.onSeasons || {}).length + 1); r.setCfg({ season: { id, host: pid(), name: `Säsong ${n} · ${new Date().toLocaleDateString('sv-FI')}`, rounds: +a, done: [], pts: {}, wins: {} } }); (S.onSeasons ||= {})[id] = r.cfg.season; save(); return false; },
  'se-cont'(a) { const r = ON.room, x = S.onSeasons?.[a]; if (r?.isHost && x) r.setCfg({ season: x }); return false; },
  'copy-setup'() { const t = ON.room?.members.find(m => m.host)?.car?.tune, cs = activeCar(); if (!t || !cs) return false; cs.tune ||= {}; FREE_SETUP.forEach(k => { if (t[k] != null) cs.tune[k] = t[k]; }); save(); ON.room.setMe(netMe()); U.toast = '✓ Värdens chassiinställningar kopierade till din bil'; },
  'se-off'() { ON.room?.setCfg({ season: null }); return false; },
  'inv-one'(a) { const r = ON.room; if (!PRES || !r) return; PRES.invite([a], r.code, netName()); (ON.invited ||= new Map()).set(a, Date.now()); toast('📨 Inbjudan skickad'); },
  'inv-all'() { const r = ON.room; if (!PRES || !r) return; const ids = PRES.others().filter(p => p.room !== r.code).map(p => p.id); PRES.invite(ids, r.code, netName()); ids.forEach(id => (ON.invited ||= new Map()).set(id, Date.now())); toast(`📨 Inbjudan skickad till ${ids.length} spelare`); },
  'inv-no'() { U.invite = null; },
  'inv-join'() { const v = U.invite; U.invite = null; if (!v) return; if (!activeCar()) { toast('Du behöver en bil för att köra online.'); return; } if (ON.room) leaveRoom(); ON.code = v.code; U.view = 'online'; openRoom(v.code, false); window.scrollTo(0, 0); },
  'on-create'() { const n = document.getElementById('onName'); if (n) { S.name = n.value.trim() || 'Du'; save(); } openRoom(makeCode(), true); },
  'on-join'() {
    const n = document.getElementById('onName'); if (n) { S.name = n.value.trim() || 'Du'; save(); }
    const code = cleanCode(document.getElementById('onCode')?.value || ON.code); ON.code = code;
    if (code.length !== 4) { toast('Rumskoden har fyra tecken.'); return; }
    openRoom(code, false);
  },
  'on-retry'() { openRoom(ON.room.code, false); },
  'on-leave'() { leaveRoom(); },
  'on-cm'(a) { if (a === 'hc') ON.room?.setCfg({ cm: 0, hc: 1, hcSpec: spec() }); else ON.room?.setCfg({ cm: +a, hc: 0 }); return false; },
  'on-cfg'(a) { const [k, v] = a.split(':'); ON.room?.setCfg({ [k]: k === 'track' || k === 'weather' || k === 'tod' ? v : +v }); return false; },
  'on-copy'() { const l = roomLink(ON.room.code); try { navigator.clipboard.writeText(l); } catch (e) { } ON.copied = 1; setTimeout(() => { ON.copied = 0; if (U.view === 'online') render(); }, 1800); },
  'on-start'() { hostStart(); return false; },
  'on-next'() { hostNext(); return false; },
  'on-reset'() { ON.ch = null; ON.room.champ = null; ON.room.sendChamp(null); },
  'on-skip'() { const r = ON.room; if (!r) return; if (r.isHost) r.onSkip(r.id); else r.send({ k: 'skip' }); toast('KESKÖIDÄ skickat.'); },
  'on-watch'(a) { const r = ON.room, L = r?.live[a]; if (L && !L.done) netRace(a, L.grid, L.cfg, L.lead, true); return false; },
  'on-rejoin'(a) { const r = ON.room, L = r?.live[a]; if (L && !L.done) netRace(a, L.grid, L.cfg, L.lead, false); return false; },
};
