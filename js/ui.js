// Alla menyvyer + tävlingsdagens logik (alkuerä → semi → finalstege).
import { CARS, CLASSES, BUILD, UPG, FUELS, PAINTS, TRACKS, SURF, CAREER, FINALS, POINTS, PRIZE_SHARE, CODES, MARKS, DRIVERS, TEAMS, KOMP } from './data.js';
import { buildSpec, engineAt, curve, carById, fuelById, defaultTune, fmt } from './engine.js';
import { S, save, reset, activeCar } from './state.js';
import { getTrack } from './track.js';
import { Race, fmtTime } from './race.js';
import { newTask, checkTask } from './dyno.js';

const app = () => document.getElementById('app');
const eur = v => fmt(Math.round(v)) + ' €';
const paintOf = id => (PAINTS.find(p => p.id === id) || PAINTS[0]);
const hex = rgb => '#' + rgb.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const U = { view: 'menu', kompOpen: null, quick: { track: 'vilppula', laps: 3, opp: 5, ai: 85 }, ev: null, task: null, taskDiff: 1, taskMsg: '', preview: null, race: null, toast: '' };

const spec = (id = S.active) => buildSpec(id, S.cars[id], S.cars[id]?.tune);
const stockSpec = id => buildSpec(id, { build: { strip: 1, cage: 1, seat: 1, switch: 1 }, upg: {} }, defaultTune());
const built = id => { const c = S.cars[id]; return c && BUILD.every(b => c.build[b.id]); };
const levelPts = li => CAREER[li].events.reduce((a, e) => a + (S.career.res[e.id]?.pts || 0), 0);
const levelOpen = li => li === 0 || levelPts(li - 1) >= CAREER[li].need;
const topLevel = () => { let t = 0; CAREER.forEach((l, i) => { if (levelOpen(i)) t = i; }); return t; };

// ---------- ram ----------
export function render() {
  const racing = U.view === 'race'; document.body.classList.toggle('racing', racing); if (racing) return;
  const V = { menu, karriar, event: eventView, garage, trim, dyno, komp, settings }[U.view] || menu;
  app().innerHTML = `<header class="topbar">${U.view !== 'menu' && U.view !== 'event' ? '<button class="back" data-act="go" data-arg="menu">‹ Meny</button>' : '<span class="brand">ROKKI<b>KRAFT</b></span>'}
    <span class="top-title">${{ karriar: 'Karriär', event: 'Tävlingsdag', garage: 'Garage', trim: 'Trimning', dyno: 'Räknebänken', komp: 'Kompendium', settings: 'Inställningar' }[U.view] || ''}</span>
    <span class="wallet"><b>${eur(S.money)}</b><i>${CAREER[topLevel()].name}</i></span></header>
    <main class="view v-${U.view}">${V()}</main>${U.toast ? `<div class="toast">${U.toast}</div>` : ''}`;
  if (U.toast) { clearTimeout(U.toastT); U.toastT = setTimeout(() => { U.toast = ''; document.querySelector('.toast')?.remove(); }, 2600); }
  after();
}
const toast = t => { U.toast = t; };
function after() { const cv = document.getElementById('curve'); if (cv) drawCurve(cv); }

// ---------- meny ----------
function menu() {
  const s = spec(), k = curve(s), car = carById(S.active), cs = activeCar();
  const solved = S.dyno.reduce((a, b) => a + b, 0), owned = Object.keys(S.cars).length, parts = Object.values(S.cars).reduce((a, c) => a + Object.values(c.upg).reduce((x, y) => x + y, 0), 0);
  const btn = (arg, icon, tag, title, sub, cls) => `<button class="mcard ${cls}" data-act="go" data-arg="${arg}"><div class="mc-top"><span class="mc-ico">${icon}</span><span class="mc-tag">${tag}</span></div><strong>${title}</strong><span>${sub}</span></button>`;
  return `<section class="hero"><div class="hero-l"><span class="kick">BYGG · TRIMMA · KÖR HEAT</span><h1>Rokki<em>kraft</em></h1>
      <p>Köp en trött bruksbil, sätt in bur och stol, trimma motorn och kör dig från alkuerät till A-finalen på rokkirallins tävlingsorter.</p>
      <div class="pills"><div><span>Aktiv bil</span><b>${car.name}</b><small>#${cs.num} · ${CLASSES[car.cls]}</small></div>
        <div><span>Effekt</span><b>${fmt(k.hp)} hk</b><small>${fmt(k.peakP.P, 1)} kW @ ${fmt(k.peakP.rpm)}</small></div>
        <div><span>Moment</span><b>${fmt(k.peakT.T)} Nm</b><small>@ ${fmt(k.peakT.rpm)} rpm</small></div>
        <div class="${k.kgHp < 5 ? 'good' : k.kgHp > 7 ? 'bad' : ''}"><span>Vikt/effekt</span><b>${fmt(k.kgHp, 1)} kg/hk</b><small>${fmt(s.mass)} kg med förare</small></div></div></div>
    <div class="hero-r">${plate(cs.num, hex(paintOf(cs.paint).rgb))}</div></section>
    <nav class="mgrid">
      ${btn('karriar', '🏁', `Nivå ${topLevel() + 1}/4`, 'Karriär', `${CAREER.reduce((a, l) => a + l.events.length, 0)} tävlingsdagar på ${TRACKS.length} banor`, 'c1')}
      ${btn('garage', '🔧', `${owned} bilar · ${parts} delar`, 'Garage', 'Köp bil, bygg för besiktning, uppgradera', 'c2')}
      ${btn('trim', '🔥', fuelById(cs.tune.fuel).name, 'Trimning', 'λ, tändläge, bränsle och utväxling', 'c3')}
      ${btn('dyno', '🧮', `${solved} lösta`, 'Räknebänken', 'Räkneuppgifter som ger pengar', 'c4')}
      ${btn('komp', '📘', `${KOMP.length} kapitel`, 'Kompendium', 'Rokkirallins format och tekniken bakom', 'c5')}
      ${btn('settings', '⚙️', 'System', 'Inställningar', 'Ljud, grafik, touch och sparning', 'c6')}
    </nav>`;
}
const plate = (num, col) => `<svg viewBox="0 0 220 150" class="plate" aria-hidden="true"><rect x="8" y="14" width="204" height="122" rx="14" fill="${col}"/><rect x="34" y="30" width="152" height="90" rx="8" fill="#f4f1e8"/>
  <text x="110" y="98" text-anchor="middle" font-size="68" font-weight="900" font-family="Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif" fill="#111">${num}</text>
  <circle cx="22" cy="28" r="3" fill="#0006"/><circle cx="198" cy="28" r="3" fill="#0006"/><circle cx="22" cy="122" r="3" fill="#0006"/><circle cx="198" cy="122" r="3" fill="#0006"/></svg>`;

// ---------- karriär ----------
function karriar() {
  const ok = built(S.active), car = carById(S.active);
  const aid = (k, name, on, off) => `<button class="aid ${S.aids[k] ? 'on' : ''}" data-act="aid" data-arg="${k}"><b>${name}</b><i>${S.aids[k] ? 'PÅ' : 'AV'}</i><small>${S.aids[k] ? on : off}</small></button>`;
  const q = U.quick, rec = S.records[q.track];
  let h = `${ok ? '' : `<div class="warnbox">⚠ ${car.name} är inte besiktad. Bygg klart den i <a data-act="go" data-arg="garage">Garaget</a> innan du kan starta.</div>`}
  <section class="panel"><h2>Förarhjälpmedel</h2><div class="aids">
    ${aid('abs', 'ABS', 'Hjulen låser sig inte vid hård broms.', 'Full broms låser hjulen – bilen går rakt fram.')}
    ${aid('tc', 'Antispinn', 'Drivhjulen spinner inte loss.', 'Fullgas ger hjulspinn; bakhjulsdrivare sladdar på gasen.')}
    ${aid('auto', 'Automatväxling', 'Bilen växlar själv vid effekttoppen.', 'Växla själv med E / Q.')}</div></section>
  <section class="panel"><h2>Fritt heat & tidskörning</h2><p class="dim">Alla banor är öppna. Inga pengar, ingen press – ${rec ? `banrekord ${fmtTime(rec)}` : 'inget banrekord ännu'} på ${TRACKS.find(t => t.id === q.track).name}.</p>
    <div class="chips">${TRACKS.map(t => `<button class="chip ${q.track === t.id ? 'on' : ''}" data-act="q-track" data-arg="${t.id}">${t.name}<small>${SURF[t.surface].name} · ${Math.round(getTrack(t.id).len / 10) * 10} m</small></button>`).join('')}</div>
    <div class="row"><span class="lbl">Varv</span>${[3, 4, 6].map(n => `<button class="chip s ${q.laps === n ? 'on' : ''}" data-act="q-laps" data-arg="${n}">${n}</button>`).join('')}
      <span class="lbl">Motståndare</span>${[3, 5].map(n => `<button class="chip s ${q.opp === n ? 'on' : ''}" data-act="q-opp" data-arg="${n}">${n}</button>`).join('')}
      <span class="lbl">AI ${q.ai} %</span><input type="range" min="70" max="105" step="5" value="${q.ai}" data-in="q-ai"></div>
    <div class="row"><button class="btn" data-act="quick-race" ${ok ? '' : 'disabled'}>🏁 Starta heat</button><button class="btn ghost" data-act="quick-time" ${ok ? '' : 'disabled'}>⏱ Tidskörning</button></div></section>`;
  CAREER.forEach((L, li) => { const open = levelOpen(li), pts = levelPts(li);
    h += `<section class="panel level ${open ? '' : 'locked'}"><div class="lv-head"><h2><i>${li + 1}</i>${L.name}</h2><span>${L.sub} · ${pts} p</span></div>
      ${open ? '' : `<p class="dim">Låses upp med ${L.need} poäng i ${CAREER[li - 1].name} (du har ${levelPts(li - 1)}).</p>`}
      <div class="evs">${L.events.map(e => { const t = TRACKS.find(x => x.id === e.track), r = S.career.res[e.id];
        return `<div class="ev"><div><b>${e.name}</b><small>${t.name} · ${SURF[t.surface].name} · heat om ${L.laps} varv · A-finalseger ${eur(L.prize)}</small></div>
          <span class="ev-res ${r ? 'done' : ''}">${r ? (r.final === 'out' ? 'Utslagen' : `${r.final}-final ${r.pos}:a`) + ` · ${r.pts} p` : 'Ej körd'}</span>
          ${open ? `<button class="btn small" data-act="ev-start" data-arg="${li}:${e.id}" ${ok ? '' : 'disabled'}>Anmäl</button>` : '<span class="lock">LÅST</span>'}</div>`; }).join('')}</div></section>`; });
  return h;
}

// ---------- tävlingsdag ----------
const AI_UPG = [{}, { insug: 1, avgas: 1, dack: 1, vikt: 1 }, { insug: 2, avgas: 1, kam: 1, dack: 2, vikt: 2, diff: 1, vaxel: 1 }, { insug: 2, avgas: 2, kam: 2, dack: 3, vikt: 3, diff: 1, vaxel: 1, fjad: 2 }];
const AI_POOL = { vetari: [['sunny', 'kadett'], ['sunny', 'kadett', 'civic'], ['kadett', 'civic', 'mondeo'], ['civic', 'mondeo']], kardaani: [['v343', 'sierra'], ['v343', 'sierra'], ['sierra', 'bmw325'], ['bmw325', 'v940', 'sierra']] };
function makeOpps(n, li, skill, cls) {
  const names = shuffle(DRIVERS).slice(0, n), mine = activeCar().paint, full = { strip: 1, cage: 1, seat: 1, switch: 1 };
  return names.map(name => ({ name, paint: pick(PAINTS.filter(p => p.id !== mine)).rgb, skill: skill + (Math.random() - 0.5) * 0.05,
    spec: buildSpec(pick(AI_POOL[cls][li]), { build: full, upg: AI_UPG[li] }, defaultTune()) }));
}
const STAGE = { alku: 'Alkuerä', kerailu: 'Keräilyerä', lastcall: 'Last call', semi: 'Semi', final: '-final' };
const stageName = ev => ev.stage === 'final' ? FINALS[ev.fin] + '-final' : STAGE[ev.stage];
function evStart(arg) { const [li, id] = arg.split(':'), L = CAREER[+li], e = L.events.find(x => x.id === id);
  U.ev = { li: +li, e, L, stage: 'alku', fin: 0, grid: Math.floor(Math.random() * 6), hist: [], dmg: 0, radLeak: false, over: null, last: null, heat: 'ABCDEF'[Math.floor(Math.random() * 6)] };
  U.view = 'event'; }
function evSkill(ev) { const m = { alku: -0.04, kerailu: -0.07, lastcall: -0.09, semi: 0 }; return ev.L.ai + (ev.stage === 'final' ? [0.03, 0.01, -0.01, -0.03, -0.05][ev.fin] : m[ev.stage]); }
function evRun() { const ev = U.ev, cls = carById(S.active).cls;
  startRace({ trackId: ev.e.track, laps: ev.L.laps, opps: makeOpps(5, ev.li, evSkill(ev), cls), grid: ev.grid, title: `${CLASSES[cls]} ${stageName(ev).toLowerCase()}${ev.stage === 'final' ? '' : ' ' + ev.heat}`,
    dmg0: ev.dmg, radLeak0: ev.radLeak, mode: 'heat', onDone: res => { evAfter(res); U.view = 'event'; render(); } }); }
function evAfter(res) { const ev = U.ev, pos = res.pos; ev.dmg = res.dmg; ev.radLeak = res.radLeak; ev.last = res; ev.hist.push({ stage: stageName(ev), pos, flag: res.flag });
  if (isFinite(res.bestLap)) record(ev.e.track, res.bestLap);
  const end = (final, p) => { const share = final === 'out' ? PRIZE_SHARE.out : final === 'A' ? PRIZE_SHARE.A[p - 1] : PRIZE_SHARE[final];
    const pts = final === 'out' ? POINTS.out : final === 'A' ? POINTS.A[p - 1] : POINTS[final][Math.min(2, Math.max(0, p - 4))], prize = Math.round(ev.L.prize * share / 5) * 5;
    ev.over = { final, pos: p, pts, prize }; S.money += prize; const old = S.career.res[ev.e.id]; if (!old || pts > old.pts) S.career.res[ev.e.id] = { final, pos: p, pts }; save(); };
  if (ev.stage === 'alku') { if (pos <= 2) { ev.stage = 'semi'; ev.grid = pos - 1; ev.note = `${pos}:a i alkuerä – direkt till semi.`; } else { ev.stage = 'kerailu'; ev.grid = Math.floor(Math.random() * 6); ev.note = 'Inte bland de två första. Ny chans i keräilyerä.'; } }
  else if (ev.stage === 'kerailu') { if (pos <= 2) { ev.stage = 'semi'; ev.grid = 3 + pos - 1; ev.note = `${pos}:a i keräilyerä – vidare till semi.`; } else { ev.stage = 'lastcall'; ev.grid = Math.floor(Math.random() * 6); ev.note = 'Sista chansen: last call. Bara segraren går vidare.'; } }
  else if (ev.stage === 'lastcall') { if (pos === 1) { ev.stage = 'semi'; ev.grid = 5; ev.note = 'Seger i last call – du är i semi, längst bak.'; } else end('out', pos); }
  else if (ev.stage === 'semi') { ev.fin = Math.min(4, pos - 1); ev.stage = 'final'; ev.grid = Math.min(2, Math.floor(Math.random() * 3)); ev.note = `${pos}:a i semin → ${FINALS[ev.fin]}-finalen.`; }
  else if (ev.stage === 'final') { if (ev.fin === 0) end('A', pos); else if (pos <= 3) { ev.note = `NOUSU! ${pos}:a i ${FINALS[ev.fin]}-finalen – du klättrar till ${FINALS[ev.fin - 1]}-finalen och startar längst bak.`; ev.fin--; ev.grid = 3 + pos - 1; } else end(FINALS[ev.fin], pos); }
  ev.heat = 'ABCDEF'[Math.floor(Math.random() * 6)];
}
function eventView() { const ev = U.ev; if (!ev) { U.view = 'karriar'; return karriar(); }
  const t = TRACKS.find(x => x.id === ev.e.track), cost = Math.ceil(ev.dmg * 1.0 + (ev.radLeak ? 20 : 0)), cls = CLASSES[carById(S.active).cls];
  const steps = ['Alkuerä', 'Keräily', 'Last call', 'Semi', 'E', 'D', 'C', 'B', 'A'], cur = ev.over ? -1 : ev.stage === 'final' ? 8 - ev.fin : { alku: 0, kerailu: 1, lastcall: 2, semi: 3 }[ev.stage];
  const table = r => `<table class="res"><tr><th></th><th>Förare</th><th>Tid</th><th></th></tr>${r.order.map((o, i) => `<tr class="${o.isPlayer ? 'me' : ''}"><td>${i + 1}</td><td>${o.name}</td><td>${o.time ? fmtTime(o.time) : '–'}</td><td class="flag">${o.flag || ''}</td></tr>`).join('')}</table>`;
  let h = `<section class="panel evhead"><span class="kick">${t.name.toUpperCase()} · ${SURF[t.surface].name.toUpperCase()} · ${cls.toUpperCase()}</span><h1>${ev.e.name}</h1>
    <div class="ladder">${steps.map((s, i) => `<span class="${i === cur ? 'cur' : ''} ${i > 3 ? 'fin' : ''}">${s}</span>`).join('<i>›</i>')}</div></section>`;
  if (ev.last) h += `<section class="panel"><h2>${ev.hist[ev.hist.length - 1].stage}: du blev ${ev.last.pos}:a${ev.last.flag ? ` <span class="flag">${ev.last.flag}</span>` : ''}</h2>${table(ev.last)}
    ${isFinite(ev.last.bestLap) ? `<p class="dim">Ditt bästa varv: ${fmtTime(ev.last.bestLap)}</p>` : ''}</section>`;
  if (ev.over) { const o = ev.over;
    h += `<section class="panel final ${o.final === 'A' && o.pos <= 3 ? 'podium' : ''}"><span class="kick">DAGEN ÄR SLUT</span><h1>${o.final === 'out' ? 'Utslagen före semifinalerna' : `${o.final}-finalen, plats ${o.pos}`}</h1>
      <div class="pills"><div><span>Prispengar</span><b>${eur(o.prize)}</b></div><div><span>Poäng till pörssin</span><b>${o.pts} p</b></div><div><span>Heat körda</span><b>${ev.hist.length}</b></div></div>
      <p class="dim">${ev.hist.map(x => `${x.stage} ${x.pos}:a${x.flag ? ' (' + x.flag + ')' : ''}`).join(' → ')}</p>
      <div class="row"><button class="btn" data-act="ev-close">Tillbaka till karriären</button></div></section>`;
  } else {
    h += `<section class="panel next"><h2>Nästa: ${cls} ${stageName(ev).toLowerCase()}</h2>${ev.note ? `<p>${ev.note}</p>` : `<p>Sex bilar på linjen, ${ev.L.laps} varv. De två första går direkt till semi. Glöm inte lisälenkkin.</p>`}
      <div class="pills"><div><span>Startruta</span><b>${ev.grid + 1} av 6</b><small>${ev.grid < 3 ? 'främre raden' : 'bakre raden'}</small></div>
        <div class="${ev.dmg > 65 ? 'bad' : ''}"><span>Skador</span><b>${Math.round(ev.dmg)} %</b><small>${ev.radLeak ? 'kylaren läcker' : ev.dmg > 40 ? 'motorn tappar effekt' : 'kör vidare'}</small></div></div>
      <div class="row"><button class="btn" data-act="ev-run">🏁 Kör ut till start</button>
        ${cost > 0 ? `<button class="btn ghost" data-act="ev-repair" ${S.money >= cost ? '' : 'disabled'}>🔧 Laga i depån (${eur(cost)})</button>` : ''}
        <button class="btn ghost danger" data-act="ev-quit">Avbryt dagen</button></div></section>`;
  }
  return h;
}
function record(track, lap) { if (!S.records[track] || lap < S.records[track]) { S.records[track] = lap; save(); } }

function startRace(o) { const cs = activeCar(), s = spec();
  U.view = 'race'; document.body.classList.add('racing'); app().innerHTML = '';
  U.race = new Race(app(), { ...o, settings: S.settings, player: { name: S.name || 'Du', spec: s, paint: paintOf(cs.paint).rgb, aids: { ...S.aids } } });
}

// ---------- garage ----------
function statRows(s, k, k0) { const d = (a, b, dec = 0, inv) => { const x = a - b; return Math.abs(x) < 0.05 ? '' : `<em class="${(x > 0) !== !!inv ? 'up' : 'dn'}">${x > 0 ? '+' : '−'}${fmt(Math.abs(x), dec)}</em>`; };
  const e = engineAt(s, k.peakP.rpm);
  return `<table class="stats"><tr><td>Toppeffekt</td><td>${fmt(k.hp)} hk · ${fmt(k.peakP.P, 1)} kW @ ${fmt(k.peakP.rpm)} ${k0 ? d(k.hp, k0.hp) : ''}</td></tr>
    <tr><td>Toppmoment</td><td>${fmt(k.peakT.T)} Nm @ ${fmt(k.peakT.rpm)} ${k0 ? d(k.peakT.T, k0.peakT.T) : ''}</td></tr>
    <tr><td>Vikt med förare</td><td>${fmt(s.mass)} kg</td></tr>
    <tr><td>Vikt/effekt</td><td class="${k.kgHp < 5 ? 'good' : k.kgHp > 7 ? 'bad' : ''}">${fmt(k.kgHp, 1)} kg/hk ${k0 ? d(k.kgHp, k0.kgHp, 1, true) : ''}</td></tr>
    <tr><td>BMEP / FMEP / PMEP</td><td>${fmt(e.bmep, 1)} / ${fmt(e.fmep, 1)} / ${fmt(e.pmep, 2)} bar</td></tr>
    <tr><td>ηV · laddtryck · Ti</td><td>${fmt(e.etaV * 100)} % · ${e.boost > 0.01 ? fmt(e.boost, 2) + ' bar' : 'sugmotor'} · ${fmt(e.Ti)} °C</td></tr>
    <tr><td>ηb · BSFC</td><td>${fmt(e.etab * 100, 1)} % · ${fmt(e.bsfc)} g/kWh</td></tr>
    <tr><td>Kylbehov / kylare</td><td class="${k.maxCool > s.cool * 1.25 ? 'bad' : ''}">${fmt(k.maxCool)} / ${fmt(s.cool)} kW</td></tr>
    <tr><td>Knackmarginal (lägsta)</td><td class="${k.minMargin < 0 ? 'bad' : ''}">${fmt(k.minMargin, 2)}${s.knockCtl ? ' · regleras' : ''}</td></tr>
    <tr><td>Drivning · grepp</td><td>${s.cls === 'vetari' ? 'Fram' : 'Bak'}${s.trac ? ' · svetsad diff' : ''} · ×${fmt(s.mu, 2)}</td></tr></table>`; }

function garage() {
  const cs = activeCar(), car = carById(S.active), s = spec(), k = curve(s), ok = built(S.active);
  let pv = null; if (U.preview) { const [uid, lvl] = U.preview; const c2 = { ...cs, upg: { ...cs.upg, [uid]: lvl } }; const s2 = buildSpec(S.active, c2, cs.tune); pv = { s: s2, k: curve(s2), u: UPG.find(u => u.id === uid), lvl }; }
  let h = `<section class="panel g-top"><div class="g-info"><span class="kick">${CLASSES[car.cls].toUpperCase()} · #${cs.num}</span><h1>${car.name}</h1>
      <p class="dim">${car.tag}. ${ok ? '<b class="okb">✓ BESIKTAD</b>' : '<b class="nob">✗ EJ BESIKTAD</b>'}</p>
      ${pv ? `<div class="pvbox">Förhandsvisar <b>${pv.u.levels[pv.lvl - 1].name}</b> <button class="btn small ghost" data-act="pv-off">Stäng</button></div>` : ''}
      ${statRows(pv ? pv.s : s, pv ? pv.k : k, pv ? k : null)}
      <div class="row"><button class="btn" data-act="go" data-arg="trim">Trimma motorn →</button></div></div>
    <div class="g-curve"><canvas id="curve" width="640" height="380" data-pv="${pv ? '1' : ''}"></canvas><div class="legend"><i class="l1"></i>Moment (Nm)<i class="l2"></i>Effekt (kW)${pv ? '<i class="l3"></i>Före' : '<i class="l3"></i>Original'}</div></div></section>`;
  // bygge
  h += `<section class="panel"><h2>Bygget – krav för besiktning</h2><div class="cards">${BUILD.map(b => { const done = cs.build[b.id], lock = b.req && !cs.build[b.req];
    return `<div class="card ${done ? 'own' : ''}"><div class="c-top"><span>BESIKTNING</span><b>${done ? 'KLAR' : b.price ? eur(b.price) : 'GRATIS'}</b></div><strong>${b.name}</strong><p>${b.desc}</p><small>${b.kg ? (b.kg > 0 ? '+' : '−') + Math.abs(b.kg) + ' kg' : ''}</small>
      ${done ? '' : lock ? `<span class="lock">KRÄVER ${BUILD.find(x => x.id === b.req).name.toUpperCase()}</span>` : `<button class="btn small" data-act="build" data-arg="${b.id}" ${S.money >= b.price ? '' : 'disabled'}>${b.price ? 'Köp & montera' : 'Gör det'}</button>`}</div>`; }).join('')}</div></section>`;
  // bilar
  h += `<section class="panel"><h2>Bilar (${CARS.length})</h2><p class="dim">Vetari = framhjulsdrift, kardaani = bakhjulsdrift. Delarna hör till bilen de sitter i, och en nyköpt bil måste byggas innan den får starta.</p><div class="cards cars">${CARS.map(c => { const own = S.cars[c.id], ss = own ? spec(c.id) : stockSpec(c.id), kk = curve(ss);
    return `<div class="card car ${S.active === c.id ? 'sel' : ''} ${own ? 'own' : ''}"><div class="c-top"><span>${CLASSES[c.cls].toUpperCase()} · ${fmt(c.Vd, 1)} L R${c.cyl}</span><b>${own ? (S.active === c.id ? 'VALD' : 'ÄGD') : eur(c.price)}</b></div>
      <strong>${c.name}</strong><em>”${c.nick}” – ${c.tag}</em><p>${c.desc}</p>
      <ul><li>${fmt(kk.hp)} hk · ${fmt(kk.peakT.T)} Nm</li><li>${fmt(ss.mass)} kg · ${fmt(kk.kgHp, 1)} kg/hk</li><li>Varvgräns ${fmt(ss.redline)} rpm${c.boost ? ' · turbo ' + fmt(c.boost, 1) + ' bar' : ''}</li></ul>
      ${own ? (S.active === c.id ? '' : `<button class="btn small" data-act="car-pick" data-arg="${c.id}">Välj bil</button>`) : `<button class="btn small" data-act="car-buy" data-arg="${c.id}" ${S.money >= c.price ? '' : 'disabled'}>Köp (${eur(c.price)})</button>`}</div>`; }).join('')}</div></section>`;
  // lack
  h += `<section class="panel"><h2>Lack & startnummer</h2><div class="row wrap">${PAINTS.map(p => `<button class="swatch ${cs.paint === p.id ? 'on' : ''}" style="--c:${hex(p.rgb)}" data-act="paint" data-arg="${p.id}" title="${p.name}"></button>`).join('')}
    <span class="lbl">Startnummer</span><input class="num" type="number" min="1" max="999" value="${cs.num}" data-in="num"></div></section>`;
  // delar
  for (const u of UPG) { const lvl = cs.upg[u.id] || 0, hasTurbo = s.boost > 0;
    h += `<section class="panel"><h2>${u.name}</h2><div class="cards">${u.levels.map((L, i) => { const n = i + 1, own = lvl >= n, next = lvl === i, need = u.needsTurbo && !hasTurbo;
      return `<div class="card ${own ? 'own' : ''} ${lvl === n ? 'sel' : ''}"><div class="c-top"><span>NIVÅ ${n}</span><b>${own ? 'MONTERAD' : eur(L.price)}</b></div><strong>${L.name}</strong><p>${L.desc}</p>
        <div class="row">${own ? '' : need ? '<span class="lock">KRÄVER TURBO</span>' : next ? `<button class="btn small" data-act="buy" data-arg="${u.id}" ${S.money >= L.price ? '' : 'disabled'}>Köp</button>` : `<span class="lock">KRÄVER NIVÅ ${i}</span>`}
        ${own ? '' : `<button class="btn small ghost" data-act="pv" data-arg="${u.id}:${n}">Förhandsvisa</button>`}<button class="btn small ghost" data-act="komp-open" data-arg="${u.komp}">Läs mer</button></div></div>`; }).join('')}</div></section>`; }
  return h;
}

function drawCurve(cv) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, cs = activeCar(), s = spec(), k = curve(s);
  let ref; if (U.view === 'garage' && U.preview) { ref = k; const [uid, lvl] = U.preview; const s2 = buildSpec(S.active, { ...cs, upg: { ...cs.upg, [uid]: lvl } }, cs.tune); var cur = curve(s2), sC = s2; } else { ref = curve(stockSpec(S.active)); cur = k; sC = s; }
  const maxR = Math.max(sC.redline, 6500), maxT = Math.max(cur.peakT.T, ref.peakT.T) * 1.15, maxP = Math.max(cur.peakP.P, ref.peakP.P) * 1.15;
  const L = 52, Rr = 52, T = 16, B = 34, x = r => L + (r - 1000) / (maxR - 1000) * (W - L - Rr), yT = t => H - B - t / maxT * (H - T - B), yP = p => H - B - p / maxP * (H - T - B);
  g.clearRect(0, 0, W, H); g.font = '12px ui-monospace, Menlo, monospace'; g.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { const y = H - B - i / 4 * (H - T - B); g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(L, y); g.lineTo(W - Rr, y); g.stroke();
    g.fillStyle = '#ffd400'; g.textAlign = 'right'; g.fillText(Math.round(maxT * i / 4), L - 8, y + 4); g.fillStyle = '#ff6a3d'; g.textAlign = 'left'; g.fillText(Math.round(maxP * i / 4), W - Rr + 8, y + 4); }
  g.fillStyle = '#8b939c'; g.textAlign = 'center'; for (let r = 2000; r <= maxR; r += 1000) g.fillText(r, x(r), H - 12);
  const line = (pts, f, col, w, dash) => { g.beginPath(); pts.forEach((p, i) => { const X = x(p.rpm), Y = f(p); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.stroke(); g.setLineDash([]); };
  line(ref.pts, p => yT(Math.max(0, p.T)), 'rgba(255,255,255,.35)', 1.5, [5, 5]); line(ref.pts, p => yP(Math.max(0, p.P)), 'rgba(255,255,255,.35)', 1.5, [5, 5]);
  line(cur.pts, p => yT(Math.max(0, p.T)), '#ffd400', 3); line(cur.pts, p => yP(Math.max(0, p.P)), '#ff6a3d', 3);
}

// ---------- trimning ----------
function trim() {
  const cs = activeCar(), t = cs.tune, s = spec(), k = curve(s), rpm = k.peakP.rpm, e = engineAt(s, rpm), f = s.fuel, hasBias = (cs.upg.broms || 0) > 0;
  const bar = (name, v, tot, cls) => `<div class="mep"><span>${name}</span><div><i class="${cls}" style="width:${Math.max(1, Math.abs(v) / tot * 100)}%"></i></div><b>${fmt(v, 2)} bar · ${fmt(v / tot * 100, 1)} %</b></div>`;
  const topV = e2 => { const top = s.redline / (s.gears[s.gears.length - 1] * s.final) / 9.5493 * s.rw * 3.6; return top; };
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

// ---------- räknebänken ----------
function dyno() { if (!U.task) U.task = newTask(U.taskDiff); const t = U.task, left = Math.max(0, 6 - S.dyno[U.taskDiff - 1]);
  return `<section class="panel"><span class="kick">MÄTDATA FRÅN GARAGET</span><h1>Räknebänken</h1><p class="dim">Räkna ut det som efterfrågas. Tolerans 2 %. Decimaltal skrivs med komma eller punkt.</p>
    <div class="row">${[1, 2, 3].map(d => `<button class="chip s ${U.taskDiff === d ? 'on' : ''}" data-act="dyno-diff" data-arg="${d}">Svårighet ${d}</button>`).join('')}</div>
    <h2>${t.title}</h2><table class="stats given">${t.given.map(g => `<tr><td>${g[0]}</td><td>${g[1]}</td></tr>`).join('')}</table>
    <div class="asks">${t.asks.map((a, i) => `<label class="${t.marks ? (t.marks[i] ? 'right' : 'wrong') : ''}"><span>${a.label}</span><input type="text" inputmode="decimal" data-ans="${i}" value="${t.vals?.[i] ?? ''}" ${t.done ? 'disabled' : ''}>${t.done && !t.marks[i] ? `<small>Rätt svar: ${fmt(a.answer, a.dec ?? 2)}</small>` : ''}</label>`).join('')}</div>
    ${t.hint ? `<p class="dim">Tips: ${t.hint}</p>` : ''}
    <div class="row"><button class="btn" data-act="dyno-check" ${t.done ? 'disabled' : ''}>Kontrollera</button><button class="btn ghost" data-act="dyno-new">Ny uppgift</button>${t.komp ? `<button class="btn ghost" data-act="komp-open" data-arg="${t.komp}">Formeln i kompendiet</button>` : ''}</div>
    <p class="${U.taskMsg.startsWith('✓') ? 'okbox' : U.taskMsg ? 'warnbox' : 'dim'}">${U.taskMsg || `Belöning ${eur(t.reward)}. ${left ? `Full belöning: ${left} lösningar kvar på svårighet ${U.taskDiff}.` : 'Du har löst många på den här nivån – belöningen är nu 25 %.'}`}</p></section>`; }

// ---------- kompendium ----------
function komp() { if (U.kompOpen) { const c = KOMP.find(k => k.id === U.kompOpen) || KOMP[0];
    const codes = `<table class="stats codes">${CODES.map(c => `<tr><td><b>${c[0]}</b></td><td>${c[1]}<small>${c[2]}</small></td></tr>`).join('')}${MARKS.map(c => `<tr><td><b>${c[0]}</b></td><td>${c[1]}<small>${c[2]}</small></td></tr>`).join('')}</table>`;
    return `<section class="panel chapter"><button class="btn small ghost" data-act="komp-open" data-arg="">‹ Alla kapitel</button><h1>${c.title}</h1><div class="formula">${c.formula}</div>${c.body.map(p => p === '__CODES__' ? codes : `<p>${p}</p>`).join('')}</section>`; }
  return `<section class="panel"><span class="kick">ROKKIRALLI · MOTORTEKNIK · KÖRDYNAMIK</span><h1>Kompendium</h1><div class="klist">${KOMP.map((c, i) => `<button data-act="komp-open" data-arg="${c.id}"><i>${i + 1}</i><b>${c.title}</b><span>${c.formula}</span></button>`).join('')}</div></section>`; }

// ---------- inställningar ----------
function settings() { const st = S.settings;
  return `<section class="panel"><h2>Förare</h2><div class="row"><span class="lbl">Ditt förarnamn</span><input class="txt" type="text" maxlength="18" value="${(S.name || '').replace(/"/g, '&quot;')}" data-in="name"></div></section>
  <section class="panel"><h2>Ljud</h2><label class="sl"><span>Motorljud <b>${st.vol} %</b></span><input type="range" min="0" max="100" step="5" value="${st.vol}" data-in="vol"></label></section>
  <section class="panel"><h2>Grafik</h2><div class="row">${[['hog', 'Hög'], ['lag', 'Låg']].map(q => `<button class="chip s ${st.quality === q[0] ? 'on' : ''}" data-act="quality" data-arg="${q[0]}">${q[1]}</button>`).join('')}</div><p class="dim">Låg ger färre träd, mindre damm och lägre upplösning – bra på äldre telefoner.</p></section>
  <section class="panel"><h2>Pekskärmskontroller</h2><div class="row">${[['auto', 'Auto'], ['on', 'På'], ['off', 'Av']].map(q => `<button class="chip s ${st.touch === q[0] ? 'on' : ''}" data-act="touch" data-arg="${q[0]}">${q[1]}</button>`).join('')}</div></section>
  <section class="panel"><h2>Sparning</h2><p class="dim">Pengar, bilar, delar, resultat och räkneuppgifter sparas lokalt i den här webbläsaren.</p><div class="row"><button class="btn ghost danger" data-act="reset">Återställ sparning</button></div></section>
  <section class="panel"><h2>Om spelet</h2><p class="dim">Rokkikraft är ett fristående hobbyspel byggt i samma anda som Kolvkraft. Tävlingsorter, klasser, heatformat och varningskoder följer rokkirallins resultatblad; banlayouter, bilprestanda och priser är påhittade. Alla motståndare är fiktiva.</p></section>`; }

// ---------- händelser ----------
const ACT = {
  go(a) { U.view = a; U.preview = null; if (a === 'komp') U.kompOpen = null; window.scrollTo(0, 0); },
  aid(a) { S.aids[a] = S.aids[a] ? 0 : 1; save(); },
  'q-track'(a) { U.quick.track = a; }, 'q-laps'(a) { U.quick.laps = +a; }, 'q-opp'(a) { U.quick.opp = +a; },
  'quick-race'() { const q = U.quick, cls = carById(S.active).cls, li = Math.min(3, Math.max(0, Math.round((q.ai - 75) / 10)));
    startRace({ trackId: q.track, laps: q.laps, opps: makeOpps(q.opp, li, q.ai / 100 * 0.98, cls), grid: q.opp, title: 'Fritt heat', mode: 'heat', onDone: r => quickDone(r) }); return false; },
  'quick-time'() { const q = U.quick; startRace({ trackId: q.track, laps: q.laps, opps: [], grid: 0, title: 'Tidskörning', mode: 'time', onDone: r => quickDone(r, true) }); return false; },
  'ev-start'(a) { evStart(a); window.scrollTo(0, 0); }, 'ev-run'() { evRun(); return false; },
  'ev-repair'() { const ev = U.ev, cost = Math.ceil(ev.dmg * 1.0 + (ev.radLeak ? 20 : 0)); if (S.money >= cost) { S.money -= cost; ev.dmg = 0; ev.radLeak = false; save(); toast('Bilen är lagad.'); } },
  'ev-quit'() { U.ev = null; U.view = 'karriar'; }, 'ev-close'() { U.ev = null; U.view = 'karriar'; window.scrollTo(0, 0); },
  build(a) { const b = BUILD.find(x => x.id === a), cs = activeCar(); if (S.money >= b.price && !cs.build[a]) { S.money -= b.price; cs.build[a] = 1; save(); toast(built(S.active) ? '✓ Bilen går igenom besiktningen!' : `${b.name} klar.`); } },
  'car-buy'(a) { const c = carById(a); if (S.money >= c.price && !S.cars[a]) { S.money -= c.price; S.cars[a] = { build: {}, upg: {}, paint: pick(PAINTS).id, num: 1 + Math.floor(Math.random() * 99), tune: defaultTune() }; S.active = a; U.preview = null; save(); toast(`${c.name} köpt. Bygg den för besiktning.`); window.scrollTo(0, 0); } },
  'car-pick'(a) { if (S.cars[a]) { S.active = a; U.preview = null; save(); window.scrollTo(0, 0); } },
  paint(a) { activeCar().paint = a; save(); },
  buy(a) { const u = UPG.find(x => x.id === a), cs = activeCar(), lvl = cs.upg[a] || 0, L = u.levels[lvl]; if (L && S.money >= L.price) { S.money -= L.price; cs.upg[a] = lvl + 1; U.preview = null; save(); toast(`${L.name} monterad.`); } },
  pv(a) { const [u, l] = a.split(':'); U.preview = [u, +l]; window.scrollTo(0, 0); }, 'pv-off'() { U.preview = null; },
  'komp-open'(a) { U.view = 'komp'; U.kompOpen = a || null; window.scrollTo(0, 0); },
  preset(a) { const t = activeCar().tune, P = { power: [0.90, 3], race: [0.95, 0], eco: [1.08, 2], safe: [0.86, -5] }[a]; t.lambda = P[0]; t.ign = P[1]; save(); },
  fuel(a) { if (S.fuels.includes(a)) { activeCar().tune.fuel = a; save(); } },
  'fuel-buy'(a) { const f = fuelById(a); if (S.money >= f.price && !S.fuels.includes(a)) { S.money -= f.price; S.fuels.push(a); activeCar().tune.fuel = a; save(); } },
  'dyno-diff'(a) { U.taskDiff = +a; U.task = newTask(+a); U.taskMsg = ''; }, 'dyno-new'() { U.task = newTask(U.taskDiff); U.taskMsg = ''; },
  'dyno-check'() { const t = U.task; t.vals = [...document.querySelectorAll('[data-ans]')].map(i => i.value); const r = checkTask(t);
    if (r.all) { const n = S.dyno[U.taskDiff - 1], pay = n < 6 ? t.reward : Math.round(t.reward * 0.25); S.money += pay; S.dyno[U.taskDiff - 1]++; save(); U.taskMsg = `✓ Rätt! +${eur(pay)}`; } else U.taskMsg = 'Inte helt rätt – rätta svaren visas vid fälten. Ta en ny uppgift.'; },
  quality(a) { S.settings.quality = a; save(); }, touch(a) { S.settings.touch = a; save(); },
  reset() { if (U.confirmReset) { reset(); U.confirmReset = false; toast('Sparningen är återställd.'); U.view = 'menu'; } else { U.confirmReset = true; toast('Tryck en gång till för att radera allt.'); setTimeout(() => U.confirmReset = false, 4000); } },
};
function quickDone(r, time) { if (isFinite(r.bestLap)) record(U.quick.track, r.bestLap);
  U.view = 'karriar'; toast(time ? `Bästa varv ${fmtTime(r.bestLap)}` : `Du blev ${r.pos}:a${r.flag ? ' (' + r.flag + ')' : ''} · bästa varv ${fmtTime(r.bestLap)}`); render(); }
const INP = {
  'q-ai'(v) { U.quick.ai = +v; }, num(v) { activeCar().num = Math.max(1, Math.min(999, Math.round(+v) || 1)); save(); return false; }, name(v) { S.name = v.trim() || 'Du'; save(); return false; },
  lambda(v) { activeCar().tune.lambda = +v; save(); }, ign(v) { activeCar().tune.ign = +v; save(); }, finalScale(v) { activeCar().tune.finalScale = +v; save(); }, bias(v) { activeCar().tune.bias = +v; save(); },
  vol(v) { S.settings.vol = +v; save(); },
};
export function initUI() {
  document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el || el.disabled) return; const f = ACT[el.dataset.act]; if (!f) return; if (f(el.dataset.arg, el) !== false) render(); });
  document.addEventListener('change', e => { const el = e.target.closest('[data-in]'); if (!el) return; const f = INP[el.dataset.in]; if (f && f(el.value) !== false) render(); });
  document.addEventListener('input', e => { const el = e.target.closest('input[type=range][data-in]'); if (!el) return; const b = el.closest('label')?.querySelector('span b'); if (b && ['lambda', 'finalScale'].includes(el.dataset.in)) b.textContent = (+el.value).toFixed(2).replace('.', ','); });
  render();
}
