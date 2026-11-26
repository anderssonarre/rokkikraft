// Alla menyvyer + tävlingsdagens logik enligt ROKKIRALLI RY SÄÄNTÖKIRJA (21.04.2026).
import { TYRES, CARS, ENGINES, CLASSES, CLASS_RULES, BUILD, UPG, FUELS, PAINTS, TRACKS, SURF, CAREER, FINALS, calcPoints, PRIZE_SHARE, CODES, MARKS, DRIVERS, KOMP, XP_LEVELS, XP_UNLOCKS, FAULTS, USED_ADS, USED_SELLERS, SPONSORS } from './data.js';
import { buildSpec, engineAt, curve, carById, engById, fuelById, defaultTune, fmt, checkInspection, formatCarNum, SETUP_DEF, SPEC_CARS, specCar } from './engine.js';
import { S, save, reset, activeCar } from './state.js';
import { getTrack } from './track.js';
import { Race, fmtTime, accel0100 } from './race.js';
import { CAM_NAMES, DEFAULT_CAM } from './race.js';
import { newTask, checkTask } from './dyno.js';
import { LESSONS, lessonTask, ownTask, checkAnswers } from './motorskola.js';
import { Room, Board, Presence, makeCode, cleanCode } from './net.js';
import { parseGlb, saveCustomModel, deleteCustomModel, customModelInfo, customModel, materialStats } from '../graphics/assets/ModelLoader.js';
import { newChamp, simHeat, setResult, advance, roundDone, myHeat, canSkip, skip as chSkip, heatName, whereIs, sortRows, ROUND, FIN, A_TABLE, NORMAL_PRIZE } from './champ.js';
import { Showroom } from './view3.js';
import { hash, mulberry } from './gl.js';
import { MUSIC } from './music.js';
import { ACTIONS, binds, getPad, padName, isWheel, captureNext } from './input.js';

const app = () => document.getElementById('app');
const eur = v => fmt(Math.round(v)) + ' €';
const paintOf = id => (PAINTS.find(p => p.id === id) || PAINTS[0]);
const hex = rgb => '#' + rgb.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const U = { view: 'menu', kompOpen: null, quick: { track: 'tammisaari', laps: 3, opp: 5, ai: 75, joker: 1 }, ev: null, task: null, taskDiff: 1, taskMsg: '', preview: null, race: null, toast: '' };

// Hastighet upp till vilken drivhjulen spinner (greppbegränsat) – över den begränsas accelerationen av effekten: v = P·η / (μ·Fz_drivaxel)
const spinTo = (sp, mu) => { const k = curve(sp), axle = sp.drv === 'awd' ? 1 : sp.drv === 'fwd' ? sp.front : 1 - sp.front, g = (sp.drv === 'awd' ? Math.min(sp.muF, sp.muR) : sp.drv === 'fwd' ? sp.muF : sp.muR) || 1;
  return Math.round(k.hp * 735.5 * 0.88 / (mu * g * sp.mass * 9.81 * axle * 0.9) * 3.6); };
const accC = {}; const acc = sp => { const k = JSON.stringify([sp.id, sp.engId, sp.mass, sp.tqS, sp.muF, sp.rw, sp.gears, sp.final, sp.drv]); return accC[k] ??= accel0100(sp); };
const spec = (id = S.active) => buildSpec(id, S.cars[id], S.cars[id]?.tune);
const stockSpec = id => buildSpec(id, { build: { strip: 1, cage: 1, seat: 1, net: 1, switch: 1 }, upg: {} }, defaultTune());
const currentInsp = () => checkInspection(S.active, activeCar(), S.driverCls);
const levelPts = li => CAREER[li].events.reduce((a, e) => a + (S.career.res[e.id]?.pts || 0), 0);
const levelOpen = li => li === 0 || levelPts(li - 1) >= CAREER[li].need;
const topLevel = () => { let t = 0; CAREER.forEach((l, i) => { if (levelOpen(i)) t = i; }); return t; };

// ---------- ram ----------
export function render() {
  const racing = U.view === 'race'; document.body.classList.toggle('racing', racing);
  if (racing) { MUSIC.stop(); return; } MUSIC.vol = (S.settings.music ?? 40) / 100; MUSIC.play(); // bakgrundsmusik i menyerna
  let V = { menu, karriar, play: karriar, event: eventView, garage, trim, dyno, skola, formel, komp, settings, online, setup, result, name: nameView, top: topView }[U.view] || menu;
  if (!activeCar() && !['menu', 'komp', 'settings', 'name', 'top'].includes(U.view)) V = carShop; // ingen bil → bara bilhandeln
  const ae = document.activeElement, keep = ae && ae.id && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') && ae.type !== 'range' && ae.type !== 'file' ? { id: ae.id, v: ae.value, a: ae.selectionStart, b: ae.selectionEnd } : null; // behåll det man skriver när sidan ritas om
  const ss = document.getElementById('sideSheet'), ssPos = ss && [ss.scrollLeft, ss.scrollTop, U.fPage, U.fZoom];
  app().innerHTML = `<header class="topbar">${U.view !== 'menu' && U.view !== 'event' ? '<button class="back" data-act="go" data-arg="menu">‹ Meny</button>' : '<span class="brand">ROKKI<b>KRAFT</b></span>'}
    <span class="top-title">${{ karriar: 'Karriär & Banor', event: 'Tävlingsdag', garage: 'Garage & Besiktning', trim: 'Trimning', dyno: 'Räknebänken', skola: 'Motorskola', formel: 'Formelpapper', komp: 'Kompendium & Sääntökirja', settings: 'Inställningar', setup: 'Bilinställningar', result: 'Resultat', play: 'Spela', name: 'Byt namn', top: 'Global topplista', karriar: 'Karriär', online: 'Online – rumskod' }[U.view] || ''}</span>
    <span class="wallet">${S.warnings > 0 ? `<i style="color:#ff6a3d">⚠ ${S.warnings}/3 varningar</i>` : ''}${S.vouchers > 0 ? `<i style="color:#5ce080">🎟 ${S.vouchers} hyvityskuitti</i>` : ''}<b>${eur(S.money)}</b><i>${CAREER[topLevel()].name}</i></span></header>
    <main class="view v-${U.view}">${V()}</main>${U.toast ? `<div class="toast">${U.toast}</div>` : ''}${inviteBox()}`;
  if (ssPos && ssPos[2] === U.fPage && ssPos[3] === U.fZoom) { const n = document.getElementById('sideSheet'); if (n) { n.scrollLeft = ssPos[0]; n.scrollTop = ssPos[1]; } }
  { const cb = document.getElementById('chatBox'); if (cb) cb.scrollTop = cb.scrollHeight; }
  if (keep) { const el = document.getElementById(keep.id); if (el) { el.value = keep.v; el.focus(); try { el.setSelectionRange(keep.a, keep.b); } catch (e) { } } }
  if (U.toast) { clearTimeout(U.toastT); U.toastT = setTimeout(() => { U.toast = ''; document.querySelector('.toast')?.remove(); }, 2800); }
  after();
}
const toast = t => { U.toast = t; };
const TOD = [['morgon', '🌅 Morgon'], ['dag', '☀️ Dag'], ['kvall', '🌇 Kväll'], ['skymning', '🌆 Skymning']];
const WEATHER = [['sol', '☀️ Sol'], ['mulet', '☁️ Mulet'], ['regn', '🌧 Regn'], ['dimma', '🌫 Dimma'], ['sno', '🌨 Snöfall']];
function after() {
  const cv = document.getElementById('curve'); if (cv) drawCurve(cv);
  const tm = document.getElementById('trkPreview'); if (tm) drawTrackPreview(tm, tm.dataset.trk);
  const sr = document.getElementById('showroom');
  if (sr) { try { SR ??= new Showroom(); if (SR.ok) { const cs = activeCar(), sp = currentInsp().spec;
    SR.setCar({ model: S.active, body: sp.body, paint: paintOf(cs.paint).rgb, num: formatCarNum(cs.num, currentInsp().cls), bw: cs.bw || 'wb', bars: sp.dmg < 1, mirrors: currentInsp().cls === 'super', glbv: U.glbV || 0 }); SR.mount(sr); } else sr.parentElement.style.display = 'none'; } catch (e) { sr.parentElement.style.display = 'none'; } }
}
let SR = null;

// ---------- meny ----------
function menu() {
  if (!activeCar()) return `<section class="hero"><div class="hero-l"><span class="kick">INGEN BIL I GARAGET</span><h1>Rokki<em>kraft</em></h1><p>Din bil har sålts på myyntitilaisuus. Köp en ny bil för att fortsätta tävla – du har <b>${eur(S.money)}</b>.</p>
    <div class="row"><button class="btn" data-act="go" data-arg="garage">🚗 Till bilhandeln</button><button class="btn ghost" data-act="go" data-arg="settings">⚙ Inställningar</button><button class="btn ghost" data-act="go" data-arg="komp">📖 Kompendium</button></div></div></section>`;
  const insp = currentInsp(), s = insp.spec, k = curve(s), car = carById(S.active), cs = activeCar();
  const solved = S.dyno.reduce((a, b) => a + b, 0), owned = Object.keys(S.cars).length, parts = Object.values(S.cars).reduce((a, c) => a + Object.values(c.upg).reduce((x, y) => x + y, 0), 0);
  const numStr = formatCarNum(cs.num, insp.cls);
  const btn = (arg, icon, tag, title, sub, cls) => `<button class="mcard ${cls}" data-act="go" data-arg="${arg}"><div class="mc-top"><span class="mc-ico">${icon}</span><span class="mc-tag">${tag}</span></div><strong>${title}</strong><span>${sub}</span></button>`;
  return `<section class="hero"><div class="hero-l"><span class="kick">ROKKIRALLI RY SÄÄNTÖKIRJA 21.04.2026</span><h1>Rokki<em>kraft</em></h1>
      <p>Bygg enligt officiella reglementet (kaaret med två dörrsträvor, Nascar-verkko, keulan vahvistus innanför rambenen, max 110 dB), välj klass och kör på bl.a. Tammisaari (Grabbskogin Rata) och Rantasalmi (RUA).</p>
      <div class="pills"><div><span>Aktiv bil & klass</span><b>${car.name}</b><small>#${numStr} · ${insp.rules.name} (${insp.ok ? '✓ Katsastettu' : '⚠ Ej godkänd'})</small></div>
        <div><span>Effekt</span><b>${fmt(k.hp)} hk</b><small>${fmt(k.peakP.P, 1)} kW @ ${fmt(k.peakP.rpm)}</small></div>
        <div><span>Moment · Ljud</span><b>${fmt(k.peakT.T)} Nm</b><small>${k.db4500} dB @ 4500 rpm (max 110)</small></div>
        <div class="${k.kgHp < 5 ? 'good' : k.kgHp > 7 ? 'bad' : ''}"><span>Vikt/effekt</span><b>${fmt(k.kgHp, 1)} kg/hk</b><small>${fmt(s.mass)} kg (reg. ${s.regMass} kg)</small></div></div></div>
    <div class="hero-r">${plate(numStr, hex(paintOf(cs.paint).rgb), cs.bw)}</div></section>
    ${xpPanel()}${statsPanel()}
    <nav class="mgrid">
      ${btn('play', '🏁', 'Snabbstart', 'Spela', 'Välj bana, varv, väder och AI – kör direkt', 'c1')}
      ${btn('online', '🌐', ON.room ? `Rum ${ON.room.code}` : 'Rumskod', 'Online', 'Skapa eller gå med i rum och kör mot kompisar', 'c5')}
      ${btn('karriar', '🏆', `Nivå ${topLevel() + 1}/4`, 'Karriär', 'Mästerskap med kval, heat och finaler', 'c2')}
      ${btn('garage', '🔧', `${owned} bilar · ${parts} delar`, 'Garage', 'Bilar, motorer, inställningar och däck', 'c3')}
      ${btn('settings', '⚙️', 'System', 'Inställningar', 'Kontroller, ljud, grafik och upplösning', 'c6')}
      ${btn('name', '✏️', esc(S.name || 'Du'), 'Byt namn', 'Namnet syns i resultat, online och topplistan', 'c4')}
      ${btn('top', '🌍', 'Alla spelare', 'Global topplista', 'Speltid, lopp och segrar för alla som spelar', 'c5')}
      ${btn('trim', '🔥', fuelById(cs.tune.fuel).name, 'Trimning', 'λ, tändläge och bränsle', 'c3')}
      ${btn('komp', '📘', `${KOMP.length} kapitel`, 'Kompendium & Regler', 'Sääntökirja 2026 och teori', 'c5')}
      ${btn('dyno', '🧮', `${solved} lösta`, 'Räknebänken', 'Räkneuppgifter som ger pengar', 'c4')}
      ${btn('skola', '🎓', `${LESSONS.filter(l => (S.skola?.[l.id]?.ok || 0) >= 5).length}/${LESSONS.length} klara`, 'Motorskola', 'Motorteknik med ditt tentamens-formelpapper: övning 1–4, extra lektioner och provläge', 'c2')}
    </nav>`;
}

// Sääntökirja s. 8: "Kilpailunumerot sijoitetaan takasivulaseihin (ovessa olevat numerot eivät ole sallittu)...
// Kilpailunumerot oltava mustat valkoisella pohjalla tai valkoiset mustalla pohjalla."
const plate = (numStr, col, bw = 'wb') => {
  const bg = bw === 'bw' ? '#111315' : '#f6f5f0';
  const fg = bw === 'bw' ? '#f6f5f0' : '#111315';
  return `<svg viewBox="0 0 220 155" class="plate" aria-hidden="true">
    <rect x="8" y="10" width="204" height="135" rx="14" fill="${col}"/>
    <path d="M24 22 L196 22 L204 128 L16 128 Z" fill="#18222c" stroke="#0d1318" stroke-width="3"/>
    <rect x="42" y="32" width="136" height="84" rx="6" fill="${bg}"/>
    <text x="110" y="96" text-anchor="middle" font-size="60" font-weight="900" font-family="Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif" fill="${fg}">${numStr}</text>
    <text x="110" y="140" text-anchor="middle" font-size="10" font-weight="700" fill="#111" opacity="0.85">TAKASIVULASI ≥ 20 CM (EJ PÅ DÖRR)</text>
  </svg>`;
};

// ---------- karriär & banprofil ----------
function karriar() {
  const insp = currentInsp(), ok = insp.ok || (U.view === 'play' ? !!U.quick.cm : !!champCfg().cm), car = carById(S.active), rules = insp.rules; // spec-läge: egen bil behöver inte vara besiktad
  const aid = (k, name, on, off) => `<button class="aid ${S.aids[k] ? 'on' : ''}" data-act="aid" data-arg="${k}"><b>${name}</b><i>${S.aids[k] ? 'PÅ' : 'AV'}</i><small>${S.aids[k] ? on : off}</small></button>`;
  const q = U.quick, trkObj = getTrack(q.track), trkDef = TRACKS.find(t => t.id === q.track) || TRACKS[0], rec = S.records[q.track];
  let h = '';
  if (S.lippumies > 0) {
    h += `<div class="warnbox">🚩 <b>LIPPUMIESPESTI (TÄVLINGSFÖRBUD 1 HELG)</b>: Du har fått 3 varningar / hylky (eller kört på ett flaggat hinder B7). Enligt Sääntökirja s. 13–15 måste du stå flaggvakt under en tävlingsdag innan du får tävla i någon klass igen.
      <div class="row" style="margin-top:8px"><button class="btn small" data-act="do-lippumies">🚩 Gör lippumiespesti (kvittera avstängningen)</button></div></div>`;
  }
  if (!ok) {
    h += `<div class="warnbox">⚠ <b>${car.name}</b> går inte igenom besiktningen för <b>${rules.name}</b>:<br>${insp.issues.map(x => `• ${x}`).join('<br>')}
      <div class="row" style="margin-top:8px"><button class="btn small" data-act="go" data-arg="garage">Gå till Garaget & åtgärda</button></div></div>`;
  }
  h += `<section class="panel"><h2>Aktiv klass & Regelsammanfattning</h2>
    <div class="chips">${['auto', 'super', 'junior', 'lady', 'senior', 'supersenior'].map(c => {
      const lbl = c === 'auto' ? `Bilens klass (${CLASSES[car.cls]})` : CLASSES[c];
      return `<button class="chip ${S.driverCls === c ? 'on' : ''}" data-act="drv-cls" data-arg="${c}">${lbl}</button>`;
    }).join('')}</div>
    <p class="dim" style="margin-top:8px"><b>${rules.name} (${rules.age})</b>: ${rules.desc}</p>
    <div class="pills">
      <div><span>Anmälningsavgift</span><b>${eur(rules.fee)}</b><small>${S.vouchers > 0 ? 'Hyvityskuitti finns (0 €)' : 'Betalas före kuljettajakokous'}</small></div>
      <div><span>Start & Varv</span><b>${rules.gridRows} led · min ${rules.minLaps} varv</b><small>${rules.gridRows === 2 ? '7 m mellan leden' : 'Alla på en linje'}</small></div>
      <div><span>Lisälenkki</span><b>${rules.joker ? 'KÖRS (1 gång)' : 'KÖRS EJ'}</b><small>${rules.joker ? 'Glömd/vält kon = Li (sist)' : 'Endast huvudspåret'}</small></div>
      <div><span>Myyntivelvoite</span><b>${rules.salePrice ? eur(rules.salePrice) : 'Ingen'}</b><small>${rules.saleFrom === 'semi' ? 'Semifinal- & finalbilar' : rules.saleFrom ? `${rules.saleFrom}-final & uppåt` : 'Behålls alltid'}</small></div>
    </div></section>`;

  if (U.view !== 'play') { const cc = champCfg(), F = (a, v, cur) => `<button class="chip s ${cur === v ? 'on' : ''}" data-act="${a}" data-arg="${v}">${v}</button>`;
    h += `<section class="panel"><h2>Mästerskapsinställningar</h2><div class="row"><span class="lbl">Förare per start</span>${[4, 5, 6, 7, 8].map(n => F('cc-per', n, cc.perStart)).join('')}</div>
      <div class="row"><span class="lbl">Alkuerä-heat</span>${[2, 3, 4, 5, 6, 7, 8].map(n => F('cc-heats', n, cc.heats)).join('')}<span class="dim">= ${cc.perStart * cc.heats} startplatser</span></div>
      <div class="row"><span class="lbl">AI-svårighet ${cc.diff} %</span><input type="range" min="1" max="100" step="1" value="${cc.diff}" data-in="cc-diff"></div>
      ${carModeRow('cc-cm', cc.cm)}</section>`; }
  h += `<section class="panel"><h2>Förarhjälpmedel</h2><div class="aids">
    ${aid('abs', 'ABS', 'Hjulen låser sig inte vid hård broms.', 'Full broms låser hjulen – bilen går rakt fram.')}
    ${aid('tc', 'Antispinn', 'Drivhjulen spinner inte loss.', 'Fullgas ger hjulspinn; bakhjulsdrivare sladdar på gasen.')}
    ${aid('auto', 'Automatväxling', 'Bilen växlar själv vid effekttoppen.', 'Växla själv med E / Q.')}</div></section>`;

  if (U.view !== 'play') return h + sponsorPanel() + careerLevels(insp, rules);
  h += `<section class="panel"><h2>Spela – välj bana</h2>
    <div class="chips">${TRACKS.map(t => {
      const gt = getTrack(t.id);
      return `<button class="chip ${q.track === t.id ? 'on' : ''}" data-act="q-track" data-arg="${t.id}">${t.name}<small>${SURF[t.surface].name.split(' ')[0]} · ${Math.round(gt.len)} m${gt.asphaltLoopM > 0 && t.surface === 'grus' ? ' + asfalt' : ''}</small></button>`;
    }).join('')}</div>
    <div class="g-top" style="margin-top:12px">
      <div class="g-info">
        <h3>${trkDef.name}</h3>
        ${trkDef.addr ? `<p class="dim">📍 <b>${trkDef.addr}</b></p>` : ''}
        <table class="stats">
          <tr><td>Banlängd (huvudspår / med lisälenkki)</td><td>${Math.round(trkObj.len)} m / ${trkObj.lenJoker} m</td></tr>
          <tr><td>Banbredd (smalast – bredast)</td><td>${trkObj.minWidth === trkObj.maxWidth ? `${trkObj.minWidth} m` : `${trkObj.minWidth} m – ${trkObj.maxWidth} m`}</td></tr>
          <tr><td>Underlag & Kestopäällyste (asfalt)</td><td>${SURF[trkDef.surface].name}${trkObj.asphaltLoopM > 0 && trkDef.surface === 'grus' ? ` · ${trkObj.asphalt2Lap} m asfalt på 2 varv` : ''}</td></tr>
          <tr><td>Banrekord</td><td>${rec ? fmtTime(rec) : 'Inget rekord ännu'}</td></tr>
        </table>
        ${trkDef.info ? `<ul style="margin:8px 0 12px 18px;font-size:.9rem;color:#cfd6de">${trkDef.info.map(line => `<li>${line}</li>`).join('')}</ul>` : ''}
        <div class="row"><span class="lbl">Varv</span>${[2, 3, 4, 6].map(n => `<button class="chip s ${q.laps === n ? 'on' : ''}" data-act="q-laps" data-arg="${n}">${n}</button>`).join('')}
          <span class="lbl">Motståndare</span>${[3, 5].map(n => `<button class="chip s ${q.opp === n ? 'on' : ''}" data-act="q-opp" data-arg="${n}">${n}</button>`).join('')}
          <span class="lbl">Lisälenkki</span><button class="chip s ${q.joker ? 'on' : ''}" data-act="q-joker">${q.joker ? 'PÅ' : 'AV'}</button></div>
        <div class="row"><span class="lbl">Väder</span>${WEATHER.map(([k, n]) => `<button class="chip s ${(q.weather || 'sol') === k ? 'on' : ''}" data-act="q-weather" data-arg="${k}">${n}</button>`).join('')}</div>
        <div class="row"><span class="lbl">Tid på dygnet</span>${TOD.map(([k, n]) => `<button class="chip s ${(q.tod || 'dag') === k ? 'on' : ''}" data-act="q-tod" data-arg="${k}">${n}</button>`).join('')}</div>
        <div class="row"><span class="lbl">AI-svårighet ${q.ai} %</span><input type="range" min="1" max="100" step="1" value="${q.ai}" data-in="q-ai"></div>
        ${carModeRow('q-cm', q.cm)}
        <div class="row"><button class="btn" data-act="quick-race" ${ok ? '' : 'disabled'}>🏁 Starta träningsheat</button><button class="btn ghost" data-act="quick-time" ${ok ? '' : 'disabled'}>⏱ Tidskörning</button></div>
      </div>
      <div class="g-curve" style="display:flex;flex-direction:column;align-items:center">
        <canvas id="trkPreview" width="380" height="300" data-trk="${q.track}" style="background:#141a20;border-radius:10px;border:1px solid rgba(255,255,255,.1)"></canvas>
        <div class="legend" style="margin-top:6px"><i style="background:#d9b88c"></i>Grus (sora)<i style="background:#7d8b99"></i>Asfalt (kestopäällyste)<i style="background:#ff3b2f"></i>Sakkolenkki</div>
      </div>
    </div></section>`;

  return h;
}
function careerLevels(insp, rules) {
  const ok = insp.ok || !!champCfg().cm; let h = '';
  CAREER.forEach((L, li) => {
    const open = levelOpen(li), pts = levelPts(li), laps = Math.max(rules.minLaps, L.id === 'mestari' ? 3 : rules.minLaps);
    h += `<section class="panel level ${open ? '' : 'locked'}"><div class="lv-head"><h2><i>${li + 1}</i>${L.name}</h2><span>${L.sub} · ${pts} p</span></div>
      ${open ? '' : `<p class="dim">Låses upp med ${L.need} poäng i ${CAREER[li - 1].name} (du har ${levelPts(li - 1)}).</p>`}
      <div class="evs">${L.events.map(e => {
        const t = TRACKS.find(x => x.id === e.track), r = S.career.res[e.id];
        return `<div class="ev"><div><b>${e.name}</b><small>${t.name} · ${SURF[t.surface].name.split(' ')[0]} · ${rules.name} (${laps} varv${rules.joker ? ' + lisälenkki' : ''}) · Avgift ${S.vouchers > 0 ? '0 € (kuitti)' : eur(rules.fee)} · A-seger ${eur(L.prize)}</small></div>
          <span class="ev-res ${r ? 'done' : ''}">${r ? (r.final === 'out' ? 'Utslagen' : r.final === 'DQ' ? 'Hylky (0 p)' : `${r.final}-final ${r.pos}:a`) + ` · ${r.pts} p` : 'Ej körd'}</span>
          ${open ? `<button class="btn small" data-act="ev-start" data-arg="${li}:${e.id}" ${ok && !S.lippumies && (S.money >= rules.fee || S.vouchers > 0) ? '' : 'disabled'}>Anmäl (${S.vouchers > 0 ? 'Kuitti' : eur(rules.fee)})</button>` : '<span class="lock">LÅST</span>'}</div>`;
      }).join('')}</div></section>`;
  });
  return h;
}

function drawTrackPreview(cv, trackId) {
  const g = cv.getContext('2d'), t = getTrack(trackId), W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (let i = 0; i < t.n; i++) {
    const b = t.bulge(i);
    for (const [x, z] of [[t.X[i], t.Z[i]], [t.X[i] + t.NX[i] * b, t.Z[i] + t.NZ[i] * b]]) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
  }
  if (t.startChute) {
    minX = Math.min(minX, t.startChute.x0, t.startChute.x1); maxX = Math.max(maxX, t.startChute.x0, t.startChute.x1);
    minZ = Math.min(minZ, t.startChute.z0, t.startChute.z1); maxZ = Math.max(maxZ, t.startChute.z0, t.startChute.z1);
  }
  const pad = 34, s = Math.min((W - pad * 2) / Math.max(40, maxX - minX), (H - pad * 2) / Math.max(40, maxZ - minZ));
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const P = (x, z) => [W / 2 + (x - cx) * s, H / 2 + (z - cz) * s];

  g.lineJoin = 'round'; g.lineCap = 'round';
  // Startchute L
  if (t.startChute) {
    const sc = t.startChute, p0 = P(sc.x0, sc.z0), p1 = P(sc.x1, sc.z1);
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
    g.strokeStyle = '#7d8b99'; g.lineWidth = Math.max(6, (sc.w || 14) * s); g.stroke();
    g.fillStyle = '#fff'; g.font = 'bold 11px sans-serif'; g.textAlign = 'center';
    g.fillText('L', p0[0] - 8, p0[1] - 6);
  }
  // Huvudspår med lokal bredd och grus/asfalt-färg
  for (let i = 0; i < t.n; i++) {
    const j = (i + 1) % t.n, p0 = P(t.X[i], t.Z[i]), p1 = P(t.X[j], t.Z[j]);
    const st = t.surfTypeAt ? t.surfTypeAt(i) : t.surface;
    const wi = (t.hwAt ? t.hwAt(i) * 2 : t.hw * 2) * s;
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
    g.strokeStyle = st === 'asfalt' ? '#7d8b99' : st === 'is' ? '#a8cbe8' : '#d9b88c';
    g.lineWidth = Math.max(5, wi); g.stroke();
  }
  // Sakkolenkki (röd)
  g.beginPath();
  for (let i = t.joker.i1; i <= t.joker.i2; i++) {
    const b = t.bulge(i), p = P(t.X[i] + t.NX[i] * b, t.Z[i] + t.NZ[i] * b);
    i === t.joker.i1 ? g.moveTo(p[0], p[1]) : g.lineTo(p[0], p[1]);
  }
  g.strokeStyle = '#ff3b2f'; g.lineWidth = Math.max(4, t.joker.w * s); g.stroke();
  const jm = t.joker.mid, pm = P(t.X[jm] + t.NX[jm] * t.bulge(jm), t.Z[jm] + t.NZ[jm] * t.bulge(jm));
  g.fillStyle = '#ff6b60'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center';
  g.fillText('Sakkolenkki', pm[0], pm[1] - 8);

  // Mållinje M
  const fIdx = t.finishIdx || 0, pf = P(t.X[fIdx], t.Z[fIdx]);
  g.fillStyle = '#fff'; g.fillRect(pf[0] - 3, pf[1] - 7, 6, 14);
  g.fillStyle = '#ffd400'; g.font = 'bold 11px sans-serif'; g.fillText('M', pf[0] + 10, pf[1] - 8);

  // Byggnader
  if (t.buildings) {
    g.font = '9px sans-serif';
    for (const b of t.buildings) {
      const pb = P(b.x, b.z);
      g.fillStyle = 'rgba(255,255,255,0.22)';
      g.fillRect(pb[0] - 5, pb[1] - 4, 10, 8);
      g.fillStyle = '#cfd6de';
      g.fillText(b.name.split(' ')[0], pb[0], pb[1] + 13);
    }
  }
  // Flaggposter 1..8
  if (t.posts) {
    g.font = 'bold 9px sans-serif';
    for (const fp of t.posts) {
      const pp = P(fp.x, fp.z);
      g.beginPath(); g.arc(pp[0], pp[1], 6.5, 0, 6.3);
      g.fillStyle = '#1b222a'; g.fill(); g.strokeStyle = '#ffd400'; g.lineWidth = 1.2; g.stroke();
      g.fillStyle = '#ffd400'; g.fillText(fp.n, pp[0], pp[1] + 3);
    }
  }
}

// ---------- tävlingsdag ----------
const AI_UPG_STD = [{}, { insug: 1, avgas: 1, dack: 1, vikt: 1 }, { insug: 2, avgas: 1, kam: 1, dack: 2, vikt: 2, vaxel: 1 }, { insug: 2, avgas: 2, kam: 2, dack: 2, vikt: 3, vaxel: 1, fjad: 2 }];
const AI_UPG_SUP = [{ superkit: 1, turbo: 1, dack: 2 }, { superkit: 1, turbo: 1, ic: 1, dack: 3, diff: 1 }, { superkit: 1, turbo: 2, ic: 1, dack: 3, diff: 1, kam: 1, vikt: 2 }, { superkit: 1, turbo: 3, ic: 2, dack: 3, diff: 1, kam: 2, vikt: 3, fjad: 2 }];
const AI_POOL = {
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
const FIRST = ['Pena', 'Jorma', 'Late', 'Tuukka', 'Reiska', 'Vesa', 'Kake', 'Ilpo', 'Seppo', 'Hessu', 'Arska', 'Jere', 'Pate', 'Timppa', 'Masa', 'Olli', 'Rami', 'Sami', 'Veikko', 'Eki', 'Nipa', 'Tane', 'Juha', 'Aki', 'Kimmo', 'Jonne', 'Kalle', 'Mika', 'Sanna', 'Tiina', 'Jenni', 'Heikki', 'Lasse', 'Niko', 'Petteri', 'Raimo', 'Anu', 'Johanna'];
const LAST = ['Rämäkkö', 'Kaasujalka', 'Sivuluisu', 'Soranen', 'Pultti', 'Vänkäri', 'Kardaani', 'Ilmanotto', 'Sytytys', 'Hiekkala', 'Akseli', 'Jousi', 'Pakosarja', 'Turbonen', 'Öljypohja', 'Rattinen', 'Vaihde', 'Etuveto', 'Takaveto', 'Jäärata', 'Kytkin', 'Mutkanen', 'Ruostela', 'Peltonen', 'Kolari', 'Lokasuoja', 'Nastarengas', 'Tunkki'];
function aiNames(n) { const set = new Set(), out = shuffle(DRIVERS).slice(0, Math.min(n, 12)); out.forEach(x => set.add(x)); let g = 0; while (out.length < n && g++ < 5000) { const x = pick(FIRST) + ' ' + pick(LAST); if (!set.has(x)) { set.add(x); out.push(x); } } return shuffle(out); }
// boostHp: ALLA AI får exakt så många hk – starkaste riktiga spelarens hk + 500 (snabblopp: dina hk + 500)
// Bilval för tävlingen: 0 = alla kör egen bil från garaget, 1–5 = alla kör samma spec-bil (AI:n en nivå högre, max 5)
const aiSpec = lvl => Math.min(5, lvl + 1);
function carModeRow(act, cur) {
  cur = cur || 0; const B = (v, n, sm) => `<button class="chip s ${cur === v ? 'on' : ''}" data-act="${act}" data-arg="${v}">${n}${sm ? `<small>${sm}</small>` : ''}</button>`;
  return `<div class="row"><span class="lbl">Bilar</span>${B(0, 'Egen bil')}${[1, 2, 3, 4, 5].map(l => B(l, `Spec ${l} · ${SPEC_CARS[l].hp} hk`)).join('')}</div>
    ${cur ? `<p class="dim" style="margin:-4px 0 8px">Alla förare kör Mazda 626 Spec ${cur} (${SPEC_CARS[cur].hp} hk). AI:n kör Spec ${aiSpec(cur)} (${SPEC_CARS[aiSpec(cur)].hp} hk).</p>` : ''}`;
}
function makeOpps(n, li, diff, cls, boostHp, specLvl) {
  if (specLvl) { const names = aiNames(n), mine = activeCar()?.paint, sp = specCar(aiSpec(specLvl)); // spec-läge: alla AI kör spec-bilen en nivå över spelarna
    return names.map(name => { const d = Math.max(0.01, Math.min(1, diff + (Math.random() - 0.5) * 0.08));
      return { name, paint: pick(PAINTS.filter(p => p.id !== mine)).rgb, bw: Math.random() < 0.35 ? 'bw' : 'wb', diff: d, skill: 0.6 + 0.4 * d, spec: sp, powScale: 1 }; }); }
  const names = aiNames(n), mine = activeCar().paint, full = { strip: 1, cage: 1, seat: 1, net: 1, switch: 1 };
  const ps = spec(), php = curve(ps).hp; boostHp ??= php + 500; const tune = { ...defaultTune(), ...activeCar().tune, tyre: 'ccplus' }; // alla AI kör på bästa däcken (CrossClimate Plus)
  const poolKey = cls === 'super' || cls === 'supersenior' ? 'super' : cls === 'kardaani' ? 'kardaani' : 'vetari';
  const pool = [...AI_POOL[poolKey][Math.max(0, Math.min(3, li))], 'mazda626', 'passat_rx', 'mondeo_st'];
  return names.map(name => {
    const cid = pick(pool), sp = buildSpec(cid, { build: full, upg: poolKey === 'super' ? { superkit: 1, ...(ps.drv === 'awd' ? { awd: 1 } : {}) } : Math.random() < 0.7 ? { rokkivaxel: 1 } : {} }, tune), hp = curve(sp).hp; // Super-AI kör fyrhjulsdrift om spelaren gör det
    const d = Math.max(0.01, Math.min(1, diff + (Math.random() - 0.5) * 0.08));
    return { name, paint: pick(PAINTS.filter(p => p.id !== mine)).rgb, bw: Math.random() < 0.35 ? 'bw' : 'wb', diff: d, skill: 0.6 + 0.4 * d, spec: sp,
      powScale: boostHp ? Math.max(0.4, Math.min(12, boostHp / hp)) : Math.max(0.4, Math.min(3, php / hp * (0.92 + Math.random() * 0.16))) };
  });
}

const STAGE = { alku: 'Alkuerä', kerailu: 'Keräilyerä', lastcall: 'Last call', semi: 'Semifinaali', final: '-finaali' };
const stageName = ev => ev.stage === 'final' ? FINALS[ev.fin] + '-finaali' : STAGE[ev.stage];

function evStart(arg) {
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
  const cm = cc.cm || 0, opps = makeOpps(cc.perStart * cc.heats - 1, +li, diff, insp.cls, curve(spec()).hp + 500, cm), O = {}; if (S.sponsor?.goal === 'beat' && opps[0] && !opps.some(o => o.name === S.sponsor.rival)) opps[0].name = S.sponsor.rival; // sponsorns rival är med // AI: 500 hk mer än du (spec-läge: en spec-nivå högre)
  const ents = [{ id: 'me', name: `${S.name || 'Du'}`, me: 1, kgHp: curve(cm ? specCar(cm) : spec()).kgHp, diff: 1 }];
  opps.forEach((o, i) => { const id = 'ai' + i; O[id] = { ...o, nid: id }; ents.push({ id, name: o.name, diff: o.diff, kgHp: curve(o.spec).kgHp / (o.powScale || 1) }); });
  U.ev = {
    li: +li, e, L, cls: insp.cls, rules, laps, O, cm, ch: newChamp({ perStart: cc.perStart, heats: cc.heats, laps, joker: rules.joker, trackLen: trk.len }, ents),
    dmg: 0, radLeak: false, exhaustLoose: false, parts: null, needKaatoInsp: false, hist: [],
    cleanDay: true, protestUsed: false, arvat: 0, saleEligible: false, saleDone: false, saleMsg: '', feePaid: rules.fee, usedVoucher, over: null, last: null,
  };
  U.view = 'event';
}
function champCfg() { return S.settings.champ = { perStart: 6, heats: 4, diff: 75, ...(S.settings.champ || {}) }; }

// Kör eller tittar på ett heat i mästerskapet
function evRun(heatId, watch) {
  const ev = U.ev, ch = ev.ch, h = ch.heats.find(x => x.id === heatId) || myHeat(ch, 'me'); if (!h || h.res) return;
  if (!watch && (ev.needKaatoInsp || ev.exhaustLoose)) return;
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

function evAfter(res, h) {
  const ev = U.ev;
  ev.mud = res.mud || 0;   ev.maxDmg = Math.max(ev.maxDmg || 0, res.dmg || 0); if (res.pos === 1 && res.finished) ev.heatWins = (ev.heatWins || 0) + 1; if (!res.finished) ev.dnf = true;
  ev.dmg = res.dmg; ev.parts = res.parts || ev.parts; ev.wear = res.wear || ev.wear; ev.radLeak = res.radLeak; ev.exhaustLoose = !!res.exhaustLoose; ev.needKaatoInsp = !!res.kaato;
  ev.last = res; ev.protestable = !!res.sanction;
  ev.hist.push({ stage: heatName(h), pos: res.pos, flag: res.flag });
  if (isFinite(res.bestLap)) record(ev.e.track, res.bestLap);
  if (h.round === 'semi' && ev.rules.saleFrom === 'semi') ev.saleEligible = true;
  if (res.sanction) { ev.cleanDay = false; S.warnings = (S.warnings || 0) + 1; if (S.warnings >= 3) { S.lippumies = 1; S.warnings = 0; toast('3 varningar → hylkäys + lippumiespesti.'); } save(); }
}

// Simulera resten av omgången (när man själv inte kör i den) och gå vidare
function evNext() {
  const ev = U.ev, ch = ev.ch;
  for (const x of ch.heats) if (!x.res) setResult(ch, x, simHeat(ch, x));
  advance(ch); ev.lastHeat = null; ev.last = null;
  if (ch.done) evEnd();
}

function evEnd() {
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
function resTable(rows, money) {
  const best = Math.min(...rows.map(r => r.best ?? Infinity));
  const sec = v => (v < 0 ? '−' : '+') + fmt(Math.abs(v), 3) + ' s';
  return `<div class="tblwrap"><table class="res full"><tr><th>#</th><th>Förare</th><th>Bästa varv</th><th>Total tid</th><th>Jokerlap</th><th>Avstånd</th><th>Tidsavstånd</th><th>Straff</th><th>Pris</th><th>Poäng</th></tr>
    ${rows.map((r, i) => { const prev = rows[i - 1], m = money ? money(r, i) : null;
      return `<tr class="${r.isPlayer || r.id === 'me' ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.name)}</td><td class="${r.best != null && r.best === best ? 'purple' : ''}">${r.best != null ? fmtTime(r.best) : '–'}</td><td>${r.time != null ? fmtTime(r.time) : 'DNF'}</td>
        <td>${r.jokerLap ? 'varv ' + r.jokerLap : '–'}</td><td>${i && r.dist != null ? fmt(r.dist) + ' m' : '–'}</td><td>${i && r.time != null && prev?.time != null ? sec(r.time - prev.time) : '–'}</td>
        <td class="flag">${r.flag || ''}</td><td>${m && m[0] ? eur(m[0]) : '–'}</td><td>${m && m[1] ? m[1] + ' p' : '–'}</td></tr>`; }).join('')}</table></div>`;
}

const LADDER = [['alku', 'Alkuerä'], ['kerailu', 'Keräily'], ['lastcall', 'Last Call'], ['semi', 'Semi'], ['F', 'F'], ['E', 'E'], ['D', 'D'], ['C', 'C'], ['B', 'B'], ['A', 'A']];
function eventView() {
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
      ${cost > 0 ? `<button class="btn ghost" data-act="ev-repair" ${S.money >= cost ? '' : 'disabled'}>🔧 Laga bilen (${eur(cost)})</button>` : ''}
      ${ev.wear && ev.wear[0] + ev.wear[1] > 10 ? `<button class="btn ghost" data-act="ev-tyres" ${S.money >= 40 ? '' : 'disabled'}>🛞 Nya däck (${eur(40)})</button>` : ''}
      ${ev.rules.salePrice > 0 ? `<button class="btn ghost" data-act="ev-buy-arpa" ${S.money >= 20 ? '' : 'disabled'}>🎟 Köp lott (20 €)</button>` : ''}
      <button class="btn ghost danger" data-act="ev-quit">${ev.hist.length === 0 && ev.feePaid > 0 ? 'Bryt före 1:a heatet (få hyvityskuitti)' : 'Avbryt dagen'}</button></div>
    <div class="pills"><div class="${ev.dmg > 65 ? 'bad' : ''}"><span>Skador</span><b>${Math.round(ev.dmg)} %</b></div><div><span>Däckslitage</span><b>${Math.round(ev.wear ? ev.wear[0] : 0)} / ${Math.round(ev.wear ? ev.wear[1] : 0)} %</b><small>fram / bak</small></div><div><span>Lotter</span><b>${ev.arvat} st</b></div></div></section>`;
  return h + historyPanel(ch);
}
function historyPanel(ch) {
  if (!ch.history.length) return '';
  return `<section class="panel"><h2>Tidigare omgångar</h2>${[...ch.history].reverse().map(r => `<details><summary>${r.round === 'final' ? r.letter + '-final' : ROUND[r.round]} (${r.heats.length} heat)</summary>${r.heats.map(x => `<h3>${heatName(x)}</h3>${resTable(x.res, r.round === 'final' && r.letter === 'A' ? (q, i) => A_TABLE[i] : null)}`).join('')}</details>`).join('')}</section>`;
}

function stats() { if (!S.stats) S.stats = { sec: 0, races: 0, wins: 0, tracks: {} }; return S.stats; }
function statsPanel() { const st = stats(), h = st.sec / 3600, rows = Object.entries(st.tracks).sort((a, b) => b[1].n - a[1].n);
  const tname = id => (TRACKS.find(t => t.id === id) || { name: id }).name.split(' – ')[0];
  return `<section class="panel stats-p"><div class="lv-head"><h2>Din körstatistik</h2><span>sparas i den här webbläsaren</span></div>
    <div class="pills"><div><span>Körtid</span><b>${h >= 1 ? fmt(h, 1) + ' h' : fmt(st.sec / 60, 0) + ' min'}</b><small>på banan</small></div>
      <div><span>Körda heat</span><b>${st.races}</b><small>${st.wins} segrar</small></div>
      <div><span>Banor körda</span><b>${rows.length} / ${TRACKS.length}</b></div></div>
    ${rows.length ? `<table class="res stat-t"><tr><th>Bana</th><th>Heat</th><th>Körtid</th><th>Bästa varv</th></tr>${rows.map(([id, r]) => `<tr><td>${tname(id)}</td><td>${r.n}</td><td>${fmt(r.sec / 60, 0)} min</td><td>${S.records[id] ? fmtTime(S.records[id]) : '–'}</td></tr>`).join('')}</table>` : '<p class="dim">Kör ditt första heat så börjar listan fyllas.</p>'}</section>`; }
// ---- erfarenhet (XP), nivåer och upplåsningar ----
const xpLevel = (xp = S.xp || 0) => { let l = 1; while (l < XP_LEVELS.length && xp >= XP_LEVELS[l]) l++; return l; };
const xpBonus = () => { let b = 0; for (let l = 2; l <= xpLevel(); l++) if (XP_UNLOCKS[l]?.bonus) b = XP_UNLOCKS[l].bonus; return b; };
const withBonus = prize => Math.round(prize * (1 + xpBonus() / 100));
function giveXp(res) {
  if (!res) return; const fin = !!res.finished, pos = res.pos || 0;
  let xp = 10 + (fin ? 10 : 0) + (pos ? Math.max(0, 7 - pos) * 5 : 0) + (fin && pos === 1 ? 15 : 0) + (fin && !res.flag ? 5 : 0);
  const before = xpLevel(); S.xp = (S.xp || 0) + xp; const after = xpLevel();
  U.toast = after > before ? `⭐ NIVÅ ${after}! ${XP_UNLOCKS[after] ? 'Upplåst: ' + XP_UNLOCKS[after].text : ''}` : `+${xp} XP`;
}
function xpPanel() {
  const xp = S.xp || 0, l = xpLevel(xp), lo = XP_LEVELS[l - 1] || 0, hi = XP_LEVELS[l], pct = hi ? Math.round((xp - lo) / (hi - lo) * 100) : 100;
  const next = Object.keys(XP_UNLOCKS).map(Number).find(k => k > l);
  return `<section class="panel"><h2>Erfarenhet – nivå ${l}${l >= 11 ? ' · Veteraani' : ''}</h2>
    <div class="xpbar"><i style="width:${pct}%"></i></div>
    <p class="dim">${fmt(xp)} XP${hi ? ` · ${fmt(hi - xp)} XP kvar till nivå ${l + 1}` : ' · högsta nivån'}${xpBonus() ? ` · +${xpBonus()} % prispengar` : ''}${next ? ` · Nästa upplåsning (nivå ${next}): ${XP_UNLOCKS[next].text}` : ''}</p>
    <p class="dim">XP får du för varje heat: mer för bra placering, vinst, målgång och rent lopp.</p></section>`;
}
function countRace(trackId, res) { giveXp(res); { const cs = activeCar(); if (cs?.faults && Object.values(cs.faults).some(f => !f.found)) revealFaults(cs, 'Efter loppet märkte du'); } if (res && isFinite(res.bestLap) && res.bestLap > 5 && !res.flag) record(trackId, res.bestLap); /* bästa varv från alla lopp går till topplistan */ const st = stats(), d = Math.max(0, res.dur || 0); st.sec += d; st.races++; if (res.pos === 1 && res.finished) st.wins++; const t = st.tracks[trackId] || (st.tracks[trackId] = { n: 0, sec: 0 }); t.n++; t.sec += d; save(); pushBoard(); }
function record(track, lap) { if (!S.records[track] || lap < S.records[track]) { S.records[track] = lap; save(); } }

function startRace(o) {
  const cs = activeCar(), insp = currentInsp(), s = o.specLvl ? specCar(o.specLvl) : insp.spec; // spec-läge: alla kör samma bil
  const numStr = formatCarNum(cs.num, insp.cls);
  U.view = 'race'; document.body.classList.add('racing'); app().innerHTML = ''; MUSIC.stop();
  const done = o.onDone;
  U.race = new Race(app(), {
    ...o, onDone: res => { if (o.replay) return done(res); if (res?.replay && !o.spectate) U.lastReplay = { o: { ...o, net: null, netLead: false, heatId: null }, rec: res.replay }; if (!o.spectate) countRace(o.trackId, res); done(res); }, record: S.records[o.trackId], settings: S.settings,
    onCameraChange: camera => { S.settings.camera = camera; save(); },
    player: o.spectate ? o.player : { nid: 'me', name: o.net ? `${netName()} #${numStr}` : `${S.name || 'Du'} (#${numStr})`, num: numStr, spec: s, paint: paintOf(cs.paint).rgb, bw: cs.bw || 'wb', aids: { ...S.aids } },
  });
}

// ---------- byt namn ----------
function nameView() {
  return `<section class="panel"><span class="kick">FÖRARE</span><h1>Byt namn</h1><p class="dim">Namnet visas i resultatlistor, online-rum och den globala topplistan.</p>
    <div class="row"><input class="on-in" id="newName" maxlength="18" value="${esc(S.name && S.name !== 'Du' ? S.name : '')}" placeholder="Ditt namn"><button class="btn" data-act="name-save">Spara</button></div></section>`;
}

// ---------- global topplista ----------
const TOP = { board: null, sort: 'sec' };
const pid = () => S.pid || (S.pid = 'p' + Math.random().toString(36).slice(2, 12), save(), S.pid);
function myEntry() { const st = stats(); return { id: pid(), name: (S.name && S.name !== 'Du' ? S.name : 'Förare').slice(0, 18), sec: Math.round(st.sec), races: st.races, wins: st.wins, best: S.records || {}, t: Date.now() }; }
function pushBoard() { try { if (!TOP.board) TOP.board = new Board(() => { if (U.view === 'top') render(); }); TOP.board.publish(myEntry()); } catch (e) { } }
function topView() {
  if (!TOP.board) pushBoard();
  const B = TOP.board, me = pid(), list = [...(B ? B.list.values() : [])];
  const tk = TOP.sort.startsWith('trk:') ? TOP.sort.slice(4) : null;
  const rows = tk ? list.filter(e => e.best && isFinite(e.best[tk])).sort((a, b) => a.best[tk] - b.best[tk]) : list.sort((a, b) => b[TOP.sort] - a[TOP.sort]);
  const hrs = v => v >= 3600 ? fmt(v / 3600, 1) + ' h' : fmt(v / 60) + ' min';
  return `<section class="panel"><span class="kick">ALLA SPELARE</span><h1>Global topplista</h1>
    <p class="dim">${B && B.connected ? `Ansluten · ${list.length} spelare` : 'Ansluter till topplistan…'} Din statistik skickas automatiskt efter varje lopp.</p>
    <div class="chips">${[['sec', 'Speltid'], ['races', 'Antal lopp'], ['wins', 'Segrar']].map(([k, n]) => `<button class="chip s ${TOP.sort === k ? 'on' : ''}" data-act="top-sort" data-arg="${k}">${n}</button>`).join('')}
      ${TRACKS.map(t => `<button class="chip s ${TOP.sort === 'trk:' + t.id ? 'on' : ''}" data-act="top-sort" data-arg="trk:${t.id}">⏱ ${t.name.split(' – ')[0].split(' (')[0]}</button>`).join('')}</div>
    <table class="stats"><tr><th>#</th><th>Förare</th><th>${tk ? 'Bästa varv' : 'Speltid'}</th><th>Lopp</th><th>Segrar</th></tr>
    ${rows.slice(0, 100).map((e, i) => `<tr class="${e.id === me ? 'me' : ''}"><td>${i + 1}</td><td>${esc(e.name)}</td><td>${tk ? fmtTime(e.best[tk]) : hrs(e.sec)}</td><td>${e.races}</td><td>${e.wins}</td></tr>`).join('') || '<tr><td colspan="5">Inga spelare ännu.</td></tr>'}</table></section>`;
}

// ---------- online (rumskod) ----------
// Värden äger rummet: tävlingsinställningar, AI-förare och mästerskapet. Heat med människor körs live (alla heat i en
// omgång startar samtidigt som separata lopp); heat med bara AI simuleras av värden. Alla kan titta på pågående heat.
const ON = { code: '', room: null, last: null, copied: 0, ch: null, O: {} };
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const netName = () => (S.name && S.name !== 'Du' ? S.name : 'Förare').slice(0, 20);
function netMe() {
  const cs = activeCar(), insp = currentInsp(), s = insp.spec;
  return { name: netName(), car: { spec: s, paint: paintOf(cs.paint).rgb, bw: cs.bw || 'wb', num: formatCarNum(cs.num, insp.cls), model: carById(S.active).name, hp: Math.round(curve(s).hp), kgHp: curve(s).kgHp, cls: insp.rules.name } };
}
// ---- chatt i online-rummet ----
const QUICK = ['GG', 'En till?', 'Lycka till! 🍀', 'Vänta lite', 'Redo!', 'Haha 😂', 'Bra kört 👏', 'Revansch!'];
function chatPanel(room) {
  const C = room.chat || [];
  return `<section class="panel"><h2>Chatt</h2><div class="chat" id="chatBox">${C.length ? C.slice(-12).map(m => `<div class="cl ${m.id === room.id ? 'me' : ''}"><b>${esc(m.name)}</b> ${esc(m.text)}</div>`).join('') : '<p class="dim">Inga meddelanden än – säg hej!</p>'}</div>
    <div class="row wrap">${QUICK.map(q => `<button class="chip s" data-act="say" data-arg="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <div class="row"><input class="on-in" id="chatIn" maxlength="80" placeholder="Skriv ett meddelande…" autocomplete="off"><button class="btn small" data-act="say-in">Skicka</button></div></section>`;
}
// ---- online-säsong: flera tävlingar i rad med sparad poängtabell (värden äger säsongen) ----
const SEASON_PTS = [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
function seasonPanel(room) {
  const cfg = room.cfg, se = cfg.season, H = room.isHost, mine = Object.values(S.onSeasons || {}).filter(x => x.host === pid() && x.done.length < x.rounds);
  let h = `<section class="panel"><h2>Säsong</h2>`;
  if (se) { const rows = Object.entries(se.pts).sort((a, b) => b[1] - a[1]);
    h += `<p><b>${esc(se.name)}</b> · omgång ${Math.min(se.done.length + 1, se.rounds)} av ${se.rounds}${se.done.length >= se.rounds ? ' · <b>avslutad!</b>' : ''}</p>
      <table class="stats"><tr><th>#</th><th>Förare</th><th>Poäng</th><th>Segrar</th></tr>${rows.map(([n, p], i) => `<tr class="${n === netName() ? 'me' : ''}"><td>${i + 1}${se.done.length >= se.rounds && !i ? ' 🏆' : ''}</td><td>${esc(n)}</td><td>${p}</td><td>${se.wins[n] || 0}</td></tr>`).join('') || '<tr><td colspan="4">Inga poäng än – kör första tävlingen!</td></tr>'}</table>
      <p class="dim">Poäng efter slutplacering i varje tävling: ${SEASON_PTS.slice(0, 6).join('-')}… Tabellen sparas och kan fortsätta en annan dag.</p>
      ${H ? '<div class="row"><button class="btn small ghost" data-act="se-off">Pausa säsongen</button></div>' : ''}`; }
  else if (H) h += `<p class="dim">Kör flera tävlingar i rad med en gemensam poängtabell som sparas.</p>
      <div class="row"><span class="lbl">Ny säsong</span>${[3, 5, 8].map(n => `<button class="chip s" data-act="se-new" data-arg="${n}">${n} omgångar</button>`).join('')}</div>
      ${mine.length ? `<div class="row"><span class="lbl">Fortsätt</span>${mine.map(x => `<button class="chip s" data-act="se-cont" data-arg="${x.id}">${esc(x.name)} (${x.done.length}/${x.rounds})</button>`).join('')}</div>` : ''}`;
  else h += '<p class="dim">Ingen säsong pågår. Värden kan starta en.</p>';
  return h + '</section>';
}
function seasonTick(room) { // när en tävling är klar: värden delar ut säsongspoäng en gång
  const cs = room.champ, se = room.cfg.season; if (!se || !cs?.done || !cs.overall) return;
  const key = room.code + ':' + cs.overall.map(r => r.id + r.pos).join(',');
  if (room.isHost && !se.done.includes(key) && se.done.length < se.rounds) { const n = { ...se, pts: { ...se.pts }, wins: { ...se.wins }, done: [...se.done, key] };
    cs.overall.forEach((r, i) => { const nm = r.name || '?'; n.pts[nm] = (n.pts[nm] || 0) + (SEASON_PTS[i] || 0); if (i === 0) n.wins[nm] = (n.wins[nm] || 0) + 1; });
    (S.onSeasons ||= {})[n.id] = n; save(); room.setCfg({ season: n }); }
  else if (!room.isHost) { const o = (S.onSeasons ||= {})[se.id]; if (!o || o.done.length < se.done.length) { S.onSeasons[se.id] = se; save(); } }
}
// ---- inbjudningar: se vilka som har spelet öppet och bjud in dem till rummet ----
let PRES = null;
function startPresence() {
  if (PRES) return; try {
    PRES = new Presence({
      getMe: () => ({ name: netName(), room: ON.room && ['lobby', 'race'].includes(ON.room.status) ? ON.room.code : '', racing: U.view === 'race' }),
      onList: () => { if (U.view === 'online' && ON.room) { clearTimeout(ON.plT); ON.plT = setTimeout(() => { if (U.view === 'online' && ON.room && !document.activeElement?.matches?.('input')) render(); }, 300); } },
      onInvite: inv => { if (ON.room && ON.room.code === inv.code) return; U.invite = { ...inv, t: Date.now() }; if (U.view !== 'race') render(); },
    });
  } catch (e) { PRES = null; }
}
function inviteBox() {
  const v = U.invite; if (!v || U.view === 'race') return ''; if (Date.now() - v.t > 180000) { U.invite = null; return ''; }
  return `<div class="invite-box"><div><b>🏁 ${esc(v.name)} bjuder in dig</b><small>Online-rum ${esc(v.code)}</small></div>
    <button class="btn small" data-act="inv-join">Gå med</button><button class="btn small ghost" data-act="inv-no">Nej tack</button></div>`;
}
function invitePanel(room) {
  if (!PRES) return '';
  const ppl = PRES.others().filter(p => p.room !== room.code), sent = ON.invited || (ON.invited = new Map());
  const st = p => p.room ? `i rum ${esc(p.room)}` : p.racing ? 'kör ett lopp' : 'i menyerna';
  return `<section class="panel"><h2>Bjud in spelare</h2>
    ${!PRES.connected ? '<p class="dim">Ansluter…</p>' : !ppl.length ? '<p class="dim">Ingen annan har spelet öppet just nu. Listan uppdateras av sig själv.</p>' : `
    <div class="row"><button class="btn" data-act="inv-all">📨 Bjud in alla (${ppl.length})</button></div>
    <div class="inv-list">${ppl.map(p => `<div class="inv-row"><span><b>${esc(p.name)}</b><small>${st(p)}</small></span>
      ${sent.get(p.id) && Date.now() - sent.get(p.id) < 60000 ? '<i class="dim">✓ Inbjuden</i>' : `<button class="chip s" data-act="inv-one" data-arg="${esc(p.id)}">Bjud in</button>`}</div>`).join('')}</div>`}</section>`;
}
const roomLink = code => location.origin + location.pathname + '?rum=' + code;
function setRumParam(code) { try { const q = new URLSearchParams(location.search); if (code) q.set('rum', code); else q.delete('rum'); const t = q.toString(); history.replaceState(null, '', location.pathname + (t ? '?' + t : '')); } catch (e) { } }
function openRoom(code, host) {
  if (ON.room) ON.room.leave();
  const room = ON.room = new Room({ code, host, me: netMe(), onChange: () => { if (U.view === 'online') render(); } });
  room.onChat = m => { if (m.id !== room.id && room.race?.msg && !room.race.dead) room.race.msg(`💬 <b>${esc(m.name)}</b>: ${esc(m.text)}`, 3.2); };
  ON.last = null; ON.ch = null; if (host) room.cfg.track = U.quick.track;
  room.onStart = (h, grid, cfg, lead) => netRace(h, grid, cfg, lead, false);
  room.onHeatEnd = (h, order) => { if (room.isHost) hostHeatEnd(h, order); };
  room.onSkip = id => { if (ON.ch && chSkip(ON.ch, id)) pushChamp(); };
  setRumParam(code);
}
function leaveRoom() { if (ON.room) ON.room.leave(); ON.room = null; ON.last = null; ON.ch = null; setRumParam(''); }
function netRace(h, grid, cfg, lead, watch) {
  const room = ON.room; if (U.view === 'race') return;
  const my = grid.findIndex(g => g.id === room.id); if (!watch && my < 0) return;
  const amLead = lead === room.id;
  const defs = grid.filter(g => watch || g.id !== room.id).map(g => g.ai
    ? { name: g.name, paint: g.paint, bw: g.bw, diff: g.diff, powScale: g.powScale, spec: g.spec, nid: g.id, remote: watch || !amLead }
    : { name: g.name, paint: g.car.paint, bw: g.car.bw, num: g.car.num, skill: 1, spec: cfg.cm ? specCar(cfg.cm) : g.car.spec, nid: g.id, remote: true });
  const base = { trackId: cfg.track, laps: cfg.laps, gridRows: 2, useJoker: !!cfg.joker, sideContact: true, mode: 'heat', weather: cfg.weather, tod: cfg.tod || 'dag', net: room, heatId: h, netLead: lead, specLvl: cfg.cm || 0 };
  if (watch) { const hum = defs.filter(d => grid.find(g => g.id === d.nid && !g.ai)), first = hum.find(d => d.nid !== room.id) || hum[0] || defs[0], rest = defs.filter(d => d !== first); // börja på en kompis, inte en AI
    startRace({ ...base, opps: rest, player: first, spectate: true, grid: 0, title: '👁 Online', onDone: () => { room.backToLobby(); U.view = 'online'; render(); } }); return; }
  startRace({ ...base, opps: defs, grid: my, title: 'Online – ' + (ON.champ?.heats?.find(x => x.id === h)?.name || 'heat'),
    onDone: r => { (ON.doneHeats ||= new Set()).add(h); room.backToLobby(); ON.last = r; if (isFinite(r.bestLap)) record(cfg.track, r.bestLap); U.view = 'online'; render(); } });
}

// ---- värdens mästerskapsmotor ----
function hostStart() {
  const room = ON.room, cfg = room.cfg; if (!room || !room.isHost) return;
  const humans = room.members.filter(m => m.car && m.car.spec);
  const maxHp = Math.max(curve(spec()).hp, ...humans.map(m => m.car.hp || 0)), nAi = Math.max(0, Math.min(30, cfg.ai)), opps = makeOpps(nAi, 1, Math.max(0.01, cfg.diff / 100), currentInsp().cls, maxHp + 500, cfg.cm || 0); // AI: 500 hk mer än starkaste spelaren (spec-läge: en nivå högre)
  if (!cfg.cm) { // egen bil: AI:n kör samma bil som den starkaste spelaren, men med 100 hk mer
    const best = humans.reduce((b, m) => (m.car.hp || 0) > (b?.car.hp || 0) ? m : b, null), bs = best ? best.car.spec : spec(), bh = Math.max(1, curve(bs).hp);
    for (const o of opps) { o.spec = bs; o.powScale = (bh + 100) / bh; }
  }
  ON.O = {}; const ents = humans.map(m => ({ id: m.id, name: m.name, human: 1, kgHp: cfg.cm ? curve(specCar(cfg.cm)).kgHp : m.car.kgHp || 7 }));
  opps.forEach((o, i) => { const id = 'ai' + i; ON.O[id] = { id, ai: 1, ...o }; ents.push({ id, name: o.name, diff: o.diff, kgHp: curve(o.spec).kgHp / (o.powScale || 1) }); });
  const trkLen = getTrack(cfg.track).len;
  ON.ch = ents.length <= cfg.perStart
    ? { single: 1, cfg: { perStart: cfg.perStart, laps: cfg.laps, joker: cfg.joker, trackLen: trkLen }, E: Object.fromEntries(ents.map(e => [e.id, e])), round: 'heat', heats: [{ id: 'h1', round: 'heat', no: 1, count: 1, ids: shuffle(ents.map(e => e.id)), res: null }], history: [], done: false }
    : newChamp({ perStart: cfg.perStart, heats: Math.ceil(ents.length / cfg.perStart), laps: cfg.laps, joker: cfg.joker, trackLen: trkLen }, ents);
  ON.ch.cfgRoom = { ...cfg }; ON.ch.n = 0;
  hostRound();
}
const hName = h => h.round === 'heat' ? 'Heat' : heatName(h);
function hostRound() {
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
function hostHeatEnd(hid, order) {
  const ch = ON.ch; if (!ch) return; const h = ch.heats.find(x => x.live === hid); if (!h || h.res) return;
  setResult(ch, h, sortRows(order.map(o => ({ id: o.id, name: o.name, time: o.time, best: o.best, jokerLap: o.jokerLap, flag: o.flag }))));
  pushChamp(); hostCheck();
}
function hostCheck() { // när alla heat i omgången är klara visas resultaten; värden startar nästa omgång
  const ch = ON.ch; if (!ch || !ch.heats.every(h => h.res)) return;
  if (ch.single) { ch.done = true; ch.history.push({ round: 'heat', heats: ch.heats }); ch.overall = ch.heats[0].res.map((r, i) => ({ id: r.id, name: r.name, pos: i + 1, prize: r.flag ? 0 : NORMAL_PRIZE[i] || 0, pts: 0 })); }
  ON.room.toLobby(); pushChamp();
}
function hostNext() { const ch = ON.ch; if (!ch || ch.done || !ch.heats.every(h => h.res)) return; advance(ch); if (!ch.done) hostRound(); else pushChamp(); }
function pushChamp() {
  const ch = ON.ch, room = ON.room; if (!ch || !room) return;
  const pack = h => ({ id: h.id, live: h.live, name: hName(h), ids: h.ids, res: h.res });
  room.sendChamp({ round: ch.single ? 'heat' : ch.round, letter: ch.letter, single: !!ch.single, done: ch.done, all: ch.heats.every(h => h.res), heats: ch.heats.map(pack),
    hist: ch.history.slice(-8).map(r => ({ name: r.round === 'final' ? r.letter + '-final' : ROUND[r.round] || 'Heat', heats: r.heats.map(pack) })),
    names: Object.fromEntries(Object.entries(ch.E).map(([id, e]) => [id, e.name])), overall: ch.overall || null,
    where: Object.fromEntries(room.members.map(m => [m.id, ch.single ? '' : whereIs(ch, m.id)])), skip: room.members.filter(m => !ch.single && canSkip(ch, m.id)).map(m => m.id), cfg: ch.cfgRoom });
}

function online() {
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
      ${carModeRow('on-cm', cfg.cm || 0)}
      <div class="row"><span class="lbl">Förare per start</span>${[4, 5, 6, 7, 8].map(n => C('perStart', n)).join('')}<span class="lbl">Jokerlap</span>${C('joker', cfg.joker ? 0 : 1, cfg.joker ? 'PÅ' : 'AV')}</div>
      <p class="dim">${room.members.length + cfg.ai} förare totalt → ${room.members.length + cfg.ai > cfg.perStart ? `mästerskap med ${Math.ceil((room.members.length + cfg.ai) / cfg.perStart)} alkuerä-heat` : 'ett heat'}.</p>`}
      ${cs && cs.all && !cs.done ? `<div class="row"><button class="btn" data-act="on-next">▶ Starta nästa omgång</button><button class="btn ghost danger" data-act="on-reset">Avbryt mästerskapet</button></div>`
        : `<div class="row"><button class="btn" data-act="on-start" ${room.connected ? '' : 'disabled'}>🏁 Starta ${room.members.length + cfg.ai > cfg.perStart ? 'mästerskapet' : 'heatet'}</button><button class="btn ghost danger" data-act="on-leave">Stäng rummet</button></div>`}</section>`;
  } else if (!H) {
    h += `<section class="panel"><h2>Tävlingsinställningar</h2><table class="stats"><tr><td>Bana</td><td>${trk.name}</td></tr><tr><td>Väder</td><td>${(WEATHER.find(w => w[0] === cfg.weather) || WEATHER[0])[1]}</td></tr><tr><td>Varv</td><td>${cfg.laps}</td></tr><tr><td>AI</td><td>${cfg.ai} st · ${cfg.diff} %</td></tr><tr><td>Bilar</td><td>${cfg.cm ? `Alla: Mazda 626 Spec ${cfg.cm} (${SPEC_CARS[cfg.cm].hp} hk) · AI Spec ${aiSpec(cfg.cm)}` : 'Egen bil från garaget'}</td></tr><tr><td>Förare per start</td><td>${cfg.perStart}</td></tr></table>
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

// ---------- garage ----------
function statRows(s, k, k0) {
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
function usedOffers() {
  const st = stats(), key = Math.floor((st.races || 0) / 3); // nya annonser var 3:e lopp
  if (S.used?.key === key && S.used.offers) return S.used.offers;
  const pool = CARS.filter(c => !S.cars[c.id] && c.price > 0), r = mulberry(hash(String(key) + pid())), offers = [];
  for (let i = 0; i < 3 && pool.length; i++) { const c = pool.splice(Math.floor(r() * pool.length), 1)[0], fk = Object.keys(FAULTS).filter(() => r() < 0.45);
    if (!fk.length) fk.push(Object.keys(FAULTS)[Math.floor(r() * 5)]);
    const pr = Math.round(c.price * (0.42 + r() * 0.18) / 10) * 10;
    offers.push({ id: 'u' + key + i, car: c.id, price: pr, km: Math.round(180 + r() * 260) * 1000, year: 1984 + Math.floor(r() * 20), ad: USED_ADS[Math.floor(r() * USED_ADS.length)], seller: USED_SELLERS[Math.floor(r() * USED_SELLERS.length)], faults: fk, sold: false }); }
  S.used = { key, offers }; save(); return offers;
}
function usedMarket() {
  const O = usedOffers();
  return `<section class="panel"><span class="kick">BEGAGNAT · NETTIAUTO</span><h2>Begagnade bilar</h2>
    <p class="dim">Mycket billigare än nya – men du vet inte vad som är fel förrän du kört bilen eller låtit undersöka den. Nya annonser var 3:e lopp.</p>
    <div class="cards">${O.map(o => { const c = carById(o.car), own = !!S.cars[o.car];
      return `<div class="card car"><div class="c-top"><span>${o.year} · ${fmt(o.km)} km</span><b>${o.sold ? 'SÅLD' : eur(o.price)}</b></div><strong>${c.name}</strong><em>”${esc(o.ad)}” – ${esc(o.seller)}</em>
        <p class="dim">Ny: ${eur(c.price)}. Okänt skick.</p>${o.sold ? '' : own ? '<p class="dim">Du äger redan en sådan.</p>' : `<button class="btn small" data-act="used-buy" data-arg="${o.id}" ${S.money >= o.price ? '' : 'disabled'}>Köp begagnad (${eur(o.price)})</button>`}</div>`; }).join('')}</div></section>`;
}
// bilens skick i garaget: kända fel + laga på verkstad eller själv
function conditionPanel() {
  const cs = activeCar(), F = cs?.faults; if (!F || !Object.keys(F).length) return '';
  const known = Object.entries(F).filter(([, f]) => f.found), open = known.filter(([, f]) => !f.fixed), hidden = Object.values(F).some(f => !f.found);
  return `<section class="panel"><h2>Bilens skick (begagnad)</h2>
    ${known.length ? `<table class="stats">${known.map(([k, f]) => `<tr><td><b>${f.fixed ? '✓' : '⚠'} ${FAULTS[k].name}</b><br><small class="dim">${f.fixed ? 'Lagad' : FAULTS[k].desc}</small></td><td>${f.fixed ? '' : `<button class="btn small" data-act="fault-fix" data-arg="${k}" ${S.money >= FAULTS[k].fix ? '' : 'disabled'}>Verkstad ${eur(FAULTS[k].fix)}</button> <button class="btn small ghost" data-act="fault-diy" data-arg="${k}" ${S.money >= FAULTS[k].diy ? '' : 'disabled'}>Själv ${eur(FAULTS[k].diy)}</button>`}</td></tr>`).join('')}</table>
      <p class="dim">Verkstaden lagar alltid. Laga själv är billigare (bara delar) men lyckas inte alltid – då är delarna slut och du får försöka igen.</p>` : ''}
    ${hidden ? `<p>Bilen har inte undersökts ordentligt. Fel visar sig efter första loppet – eller låt en mekaniker kolla.</p><div class="row"><button class="btn small" data-act="fault-inspect" ${S.money >= 40 ? '' : 'disabled'}>🔍 Undersök bilen (40 €)</button></div>` : !open.length ? '<p class="okbox">Alla kända fel är lagade – bilen är i fint skick.</p>' : ''}</section>`;
}
function revealFaults(cs, why) { if (!cs?.faults) return; const nw = Object.entries(cs.faults).filter(([, f]) => !f.found); nw.forEach(([, f]) => f.found = true); if (nw.length) U.toast = `🔧 ${why}: ${nw.map(([k]) => FAULTS[k].name).join(', ')}`; }
// ---- sponsorer ----
function sponsorOffers() { const st = stats(), key = Math.floor((st.races || 0) / 5); if (S.spOffers?.key === key) return S.spOffers.list; const r = mulberry(hash('sp' + key + pid())), L = [...SPONSORS].sort(() => r() - 0.5).slice(0, 3).map(x => ({ ...x, rival: DRIVERS[Math.floor(r() * DRIVERS.length)] || 'Pena Rämäkkö' })); S.spOffers = { key, list: L }; save(); return L; }
function sponsorPanel() {
  const sp = S.sponsor;
  if (sp) return `<section class="panel"><span class="kick">SPONSOR</span><h2>${esc(sp.name)}</h2><p>${eur(sp.base)} per tävling · bonus ${eur(sp.bonus)} om du klarar: <b>${esc(sp.text)}${sp.goal === 'beat' ? ` (${esc(sp.rival)})` : ''}</b></p>
    <p class="dim">Tävlingar kvar på kontraktet: ${sp.left} · klarade mål hittills: ${sp.hits || 0}</p><div class="row"><button class="btn small ghost" data-act="sp-quit">Säg upp kontraktet</button></div></section>`;
  return `<section class="panel"><span class="kick">SPONSORER</span><h2>Sponsorerbjudanden</h2><p class="dim">En sponsor betalar för varje tävling i karriären och ger en bonus varje gång du klarar deras mål. Kontraktet gäller 3 tävlingar.</p>
    <div class="cards">${sponsorOffers().map((o, i) => `<div class="card"><strong>${esc(o.name)}</strong><p>${eur(o.base)} / tävling<br>Bonus <b>${eur(o.bonus)}</b>: ${esc(o.text)}${o.goal === 'beat' ? ` (${esc(o.rival)})` : ''}</p><button class="btn small" data-act="sp-take" data-arg="${i}">Skriv på</button></div>`).join('')}</div></section>`;
}
function sponsorEval(ev, me) {
  const sp = S.sponsor; if (!sp) return ''; const ch = ev.ch, fin = ev.over?.final;
  const ok = { top3: me.pos <= 3, clean: (ev.maxDmg || 0) <= 25, heatwin: (ev.heatWins || 0) > 0, final: fin === 'A', finish: !ev.dnf,
    beat: (() => { const r = ch.overall.find(o => o.name === sp.rival); return !r || me.pos < r.pos; })() }[sp.goal];
  const pay = sp.base + (ok ? sp.bonus : 0); S.money += pay; sp.left--; if (ok) sp.hits = (sp.hits || 0) + 1;
  const txt = `💼 ${sp.name}: ${eur(sp.base)}${ok ? ` + bonus ${eur(sp.bonus)} (målet klarat!)` : ' (målet missat)'}`; if (sp.left <= 0) { S.sponsor = null; } return txt + (sp.left <= 0 ? ' · kontraktet är slut' : '');
}
function carList() {
  return usedMarket() + `<section class="panel"><h2>Bilmodeller (${CARS.length} dokumenterade Rokkirallibilar)</h2><p class="dim"><b>Vetari (etuveto)</b>: Volvo S40/V40, Mazda 3/6, Opel Astra/Vectra, VW Passat B5, Volvo 850/S70/V70 & Ford Mondeo. <b>Kardaani (takaveto)</b>: Opel Kadett/Ascona, Ford Sierra, Volvo 240/740/940, RWD-ombyggd Passat B5/Audi A4 2,8 V6 & BMW E36/E46. <b>Super</b>: Toyota Starlet, Opel Ascona (med Volvo-motor & BMW-låda), Ford Escort, BMW/Sierra Turbo & V8-Volvo!</p><div class="cards cars">${CARS.map(c => {
    const own = S.cars[c.id], ss = own ? spec(c.id) : stockSpec(c.id), kk = curve(ss);
    return `<div class="card car ${S.active === c.id ? 'sel' : ''} ${own ? 'own' : ''}"><div class="c-top"><span>${CLASSES[c.cls].toUpperCase()} · ${fmt(ss.Vd, 1)} L ${ss.cyl}-CYL</span><b>${own ? (S.active === c.id ? 'VALD' : 'ÄGD') : eur(c.price)}</b></div>
      <strong>${c.name}</strong><em>”${c.nick}” – ${c.tag}</em><p>${c.desc}</p>
      <ul><li><b>${ss.engName}</b></li><li>${fmt(kk.hp)} hk · ${fmt(kk.peakT.T)} Nm</li><li>${fmt(ss.mass)} kg (reg. ${c.regMass} kg) · ${fmt(kk.kgHp, 1)} kg/hk</li><li>Varvgräns ${fmt(ss.redline)} rpm${ss.boost ? ' · turbo ' + fmt(ss.boost, 2) + ' bar' : ' · sugmotor'}</li></ul>
      ${own ? (S.active === c.id ? '' : `<button class="btn small" data-act="car-pick" data-arg="${c.id}">Välj bil</button>`) : `<button class="btn small" data-act="car-buy" data-arg="${c.id}" ${S.money >= c.price ? '' : 'disabled'}>Köp (${eur(c.price)})</button>`}</div>`;
  }).join('')}</div></section>`;
}
// Ingen bil kvar (t.ex. såld på myyntitilaisuus): man måste köpa en ny innan man kan tävla eller trimma
function carShop() {
  const m = U.ev?.saleMsg; return `${m ? `<section class="panel"><div class="okbox">${m}</div></section>` : ''}<section class="panel"><span class="kick">BILHANDELN</span><h1>Du har ingen bil</h1><p>Din bil är såld. Köp en ny bil nedan för att kunna tävla, trimma och besiktiga igen. Du har <b>${eur(S.money)}</b>.</p></section>` + carList();
}
// ---- riktig 3D-modell (GLB) för den aktiva bilen: laddas upp här, sparas i webbläsaren och används i garaget och på banan ----
function glbPanel(id, carName) {
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
async function glbUpload(id, file) {
  if (!file) return; if (file.size > 60 * 1048576) { U.toast = 'Filen är för stor (max 60 MB).'; render(); return; }
  try { const buf = await file.arrayBuffer(); const sc = await parseGlb(buf); let meshes = 0; sc.traverse(m => { if (m.isMesh) meshes++; });
    if (!meshes) throw new Error('ingen 3D-modell i filen');
    await saveCustomModel(id, { name: file.name, buf, rot: 0, flip: false, paint: true, mats: matList(sc) }); (U.glb ||= {})[id] = undefined; delete U.glb[id];
    U.glbV = (U.glbV || 0) + 1; U.toast = `✓ 3D-modellen ${file.name} används nu för bilen (${meshes} delar).`;
  } catch (e) { U.toast = 'Kunde inte läsa filen som GLB: ' + (e?.message || e); }
  render();
}
function matList(sc) { const st = materialStats(sc), tot = st.reduce((x, y) => x + y.area, 0) || 1; return st.slice(0, 10).map(x => ({ name: x.name, pct: Math.round(x.area / tot * 100) })); }
async function glbEdit(fn) { const id = S.active, r = await customModel(id); if (!r) return; fn(r); await saveCustomModel(id, r); delete U.glb[id]; U.glbV = (U.glbV || 0) + 1; render(); }
function garage() {
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

function drawCurve(cv) {
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
function trim() {
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
const SETUP_UI = [
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
function setup() {
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

// ---------- räknebänken ----------
// ---------- Motorskola: övning 1–4 i motorteknik ----------
const SK_GOAL = 5;
/* spara inskrivna svar innan vyn ritas om (byte av sida/zoom i formelpappret) */
function keepVals() { const t = U.exam ? U.exam.tasks[U.exam.i] : U.skTask; if (t && !t.done) t.vals = t.asks.map((_, i) => document.getElementById('ska' + i)?.value ?? t.vals?.[i] ?? ''); }
const SHEET = 'assets/motorteknik/';
function theoryRows(th) { return th.map(([n, f, d, ref]) => { const pg = /sida (\d)/.exec(ref || '')?.[1];
  return `<tr><td><b>${n}</b>${d ? `<br><small class="dim">${d}</small>` : ''}${ref ? `<br><button class="chip s ref" data-act="sk-sheet" data-arg="${pg || 1}" title="Öppna formelpappret">📄 ${ref}</button>` : ''}</td><td class="f">${f}</td></tr>`; }).join(''); }
const sheetBtn = (pg = 1, txt = '📄 Formelpappret') => (U.lesson || U.exam) && U.view === 'skola' ? `<button class="btn small ${U.side ? '' : 'ghost'}" data-act="sk-side" data-arg="${pg}">${U.side ? '📄 Dölj formelpappret' : '📄 Formelpappret bredvid'}</button>` : `<button class="btn small ghost" data-act="sk-sheet" data-arg="${pg}">${txt}</button>`;
function skCards(ls, K) { return `<div class="cards">${ls.map(l => { const ok = K[l.id]?.ok || 0; return `<button class="card lesson" data-act="sk-open" data-arg="${l.id}"><strong>${l.title}</strong><p class="dim">${l.short}</p>
      <div class="xpbar"><i style="width:${Math.min(100, ok / SK_GOAL * 100)}%"></i></div><small>${ok >= SK_GOAL ? '✓ Klar' : `${ok}/${SK_GOAL} rätt`}</small></button>`; }).join('')}</div>`; }
function skola() {
  const inner = skolaInner(); if (!(U.side && (U.lesson || U.exam))) return inner;
  return `<div class="split"><div class="split-l">${inner}</div><aside class="split-r">${sidePane()}</aside></div>`;
}
function sidePane() {
  const pg = U.fPage || 1, z = U.fZoom || 1;
  return `<div class="side-bar">${[1, 2, 3].map(i => `<button class="chip s ${pg === i ? 'on' : ''}" data-act="sk-sheet" data-arg="${i}">Sida ${i}</button>`).join('')}
    <button class="chip s" data-act="sk-zoom" data-arg="-1">−</button><small class="dim">${Math.round(z * 100)} %</small><button class="chip s" data-act="sk-zoom" data-arg="1">+</button>
    <button class="chip s" data-act="sk-side" title="Stäng formelpappret">✕</button></div>
    <div class="sheet-view side" id="sideSheet"><img src="${SHEET}sida-${pg}.jpg" alt="Formelpapper sida ${pg}" style="width:${z * 100}%"></div>`;
}
function skolaInner() {
  const K = S.skola ||= {}, L = U.lesson ? LESSONS.find(l => l.id === U.lesson) : null;
  if (U.exam) return examView();
  if (!L) return `<section class="panel"><span class="kick">MOTORTEKNIK</span><h1>Motorskola</h1>
    <p>Allt bygger på <b>ditt formelpapper till tentan</b> (Motorteknikssamling, 3 sidor) – samma beteckningar och ★-nummer som på pappret, och varje formel länkar till rätt sida. Öva med pappret bredvid, precis som på tentan. Kursens egen övning löses steg för steg, sedan räknar du nya uppgifter – några på <b>din egen motor</b> från dynon. Varje rätt uppgift ger ${eur(40)} och XP, och ${SK_GOAL} rätt i en lektion ger en bonus på ${eur(250)}.</p>
    <div class="row">${sheetBtn(1, '📄 Öppna formelpappret')}</div>
    <h2>Kursens övningar 1–4</h2>${skCards(LESSONS.filter(l => !l.extra), K)}
    <h2>Mer från formelpappret</h2>${skCards(LESSONS.filter(l => l.extra), K)}
    <div class="row"><button class="btn" data-act="sk-exam">⏱ Provläge (6 blandade uppgifter)</button>${sheetBtn(1)}<button class="btn small ghost" data-act="sk-sheet" data-arg="0">📋 Sammanfattning</button></div>
    ${K.best != null ? `<p class="dim">Bästa provresultat: ${K.best}/6</p>` : ''}</section>`;
  const t = U.skTask || (U.skTask = lessonTask(L.id)), ex = L.example, st = U.exStep ?? 0;
  return `<section class="panel"><div class="row"><button class="btn small ghost" data-act="sk-back">← Alla övningar</button>${sheetBtn(/sida (\d)/.exec(L.theory[0][3] || '')?.[1] || 1)}</div><span class="kick">MOTORTEKNIK</span><h1>${L.title}</h1>
    <h2>Teori och formler</h2><p class="dim">Hänvisningarna (★ och sida) gäller ditt formelpapper – tryck för att öppna rätt sida.</p><table class="stats formler">${theoryRows(L.theory)}</table></section>
  <section class="panel"><h2>Kursens övning – löst steg för steg</h2><p>${ex.text}</p>
    <ol class="steps">${ex.steps.slice(0, st).map(([h, x]) => `<li><b>${h}:</b> ${x}</li>`).join('')}</ol>
    ${st < ex.steps.length ? `<p class="dim">Försök själv först, visa sedan nästa steg.</p><div class="row"><button class="btn small" data-act="sk-step">Visa nästa steg (${st + 1}/${ex.steps.length})</button><button class="btn small ghost" data-act="sk-allsteps">Visa alla</button></div>` : '<p class="okbox">Hela lösningen visad.</p>'}
    ${L.discuss.map(([q, a], i) => `<h3>${q}</h3><textarea class="on-in" id="skd${L.id}_${i}" rows="3" placeholder="Skriv ditt resonemang…">${esc(K['d' + L.id + i] || '')}</textarea>
      <div class="row"><button class="btn small ghost" data-act="sk-model" data-arg="${i}">${U.skModel === i ? 'Dölj' : 'Visa'} modellsvar</button></div>${U.skModel === i ? `<p class="okbox">${a}</p>` : ''}`).join('')}</section>
  <section class="panel"><h2>Räkna själv</h2><div class="row"><button class="chip s ${!t.own ? 'on' : ''}" data-act="sk-new">Ny uppgift</button>${L.extra ? '' : `<button class="chip s ${t.own ? 'on' : ''}" data-act="sk-own">🔧 Uppgift på min motor</button>`}${sheetBtn(1)}</div>
    ${taskHtml(t)}
    <div class="row"><button class="btn" data-act="sk-check" ${t.done ? 'disabled' : ''}>Rätta</button><button class="btn ghost" data-act="${t.own ? 'sk-own' : 'sk-new'}">Nästa uppgift</button></div>
    ${U.skMsg ? `<p class="${U.skMsg.startsWith('✓') ? 'okbox' : 'warnbox'}">${U.skMsg}</p>` : ''}${t.done && t.why ? `<p class="dim">Lösning: ${t.why}</p>` : ''}
    <p class="dim">${K[L.id]?.ok || 0}/${SK_GOAL} rätt i den här övningen. Tolerans 1,5 %. Decimaler med komma eller punkt.</p></section>`;
}
function taskHtml(t) {
  return `<h3>${t.title}</h3><table class="stats given">${t.given.map(g => `<tr><td>${g[0]}</td><td>${g[1]}</td></tr>`).join('')}</table>
    <div class="asks">${t.asks.map((a, i) => `<label class="${t.marks ? (t.marks[i] ? 'right' : 'wrong') : ''}"><span>${a.label}</span><input type="text" inputmode="decimal" id="ska${i}" data-ans="${i}" value="${t.vals?.[i] ?? ''}" ${t.done ? 'disabled' : ''}>${t.done && !t.marks[i] ? `<small>Rätt: ${fmt(a.answer, a.dec ?? 2)}</small>` : ''}</label>`).join('')}</div>`;
}
function myEngineTask(lesson) { const s = spec(), rpm = Math.round((3000 + Math.random() * (s.redline - 3500)) / 250) * 250, e = engineAt(s, rpm); /* olika varvtal varje gång */ return ownTask(lesson, s, e, s.fuel); }
function examView() {
  const E = U.exam, t = E.tasks[E.i], sec = Math.floor((Date.now() - E.t0) / 1000);
  if (E.i >= E.tasks.length) { const sc = E.score; const K = S.skola; if (K.best == null || sc > K.best) { K.best = sc; save(); }
    return `<section class="panel"><h1>Provet klart!</h1><p class="big">${sc}/6 rätt på ${Math.floor(sec / 60)} min ${sec % 60} s</p><p>${sc >= 5 ? 'Riktigt bra – du är redo för tentan! 💪' : sc >= 3 ? 'Bra jobbat – repetera de övningar där det blev fel.' : 'Gå igenom lektionerna och de lösta exemplen och försök igen.'}</p>
      <div class="row"><button class="btn" data-act="sk-exam">Nytt prov</button><button class="btn ghost" data-act="sk-back">Till Motorskolan</button></div></section>`; }
  return `<section class="panel"><span class="kick">PROVLÄGE · UPPGIFT ${E.i + 1}/6 · ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}</span><h2>${LESSONS[t.lesson - 1].title}</h2>${taskHtml(t)}
    <div class="row">${t.done ? '<button class="btn" data-act="sk-xnext">Nästa →</button>' : '<button class="btn" data-act="sk-xcheck">Svara</button>'}<button class="btn ghost" data-act="sk-back">Avbryt</button>${sheetBtn(1)}</div>
    ${t.done && t.why ? `<p class="dim">Lösning: ${t.why}</p>` : ''}<p class="dim">Poäng hittills: ${E.score}</p></section>`;
}
function formel() {
  const pg = U.fPage ?? 1, z = U.fZoom || 1;
  const tabs = `<div class="row noprint">${U.fFrom !== 'menu' ? '<button class="btn small ghost" data-act="go" data-arg="skola">← Motorskola</button>' : ''}${[1, 2, 3].map(i => `<button class="chip s ${pg === i ? 'on' : ''}" data-act="sk-sheet" data-arg="${i}">Sida ${i}</button>`).join('')}<button class="chip s ${pg === 0 ? 'on' : ''}" data-act="sk-sheet" data-arg="0">📋 Sammanfattning</button></div>`;
  if (pg) return `<section class="panel">${tabs}<span class="kick">DITT TENTAMENS-FORMELPAPPER</span><h1>Motorteknikssamling · sida ${pg}/3</h1>
    <div class="row noprint"><button class="btn small" data-act="sk-zoom" data-arg="-1">−</button><span class="dim">${Math.round(z * 100)} %</span><button class="btn small" data-act="sk-zoom" data-arg="1">+</button>
      <a class="btn small ghost" href="${SHEET}Motorteknikssamling.pdf" target="_blank" rel="noopener">⬇ Öppna PDF</a></div>
    <div class="sheet-view"><img src="${SHEET}sida-${pg}.jpg" alt="Formelpapper sida ${pg}" style="width:${z * 100}%"></div>
    <div class="row">${pg > 1 ? `<button class="btn small ghost" data-act="sk-sheet" data-arg="${pg - 1}">← Sida ${pg - 1}</button>` : ''}${pg < 3 ? `<button class="btn small ghost" data-act="sk-sheet" data-arg="${pg + 1}">Sida ${pg + 1} →</button>` : ''}</div></section>`;
  return `<section class="panel formelblad">${tabs}<div class="row noprint"><button class="btn small" data-act="print">🖨 Skriv ut / spara som PDF</button></div>
    <h1>Sammanfattning per lektion</h1><p class="dim">Formlerna ur lektionerna med hänvisning till formelpappret. På tentan gäller ditt eget formelpapper (sida 1–3).</p>${LESSONS.map(l => `<h2>${l.title}</h2><table class="stats formler">${theoryRows(l.theory)}</table>`).join('')}
    <h2>Enheter och konstanter</h2><table class="stats formler"><tr><td>1 bar</td><td class="f">10⁵ Pa</td></tr><tr><td>1 kWh</td><td class="f">3,6 MJ</td></tr><tr><td>kg/h → kg/s</td><td class="f">/ 3600</td></tr><tr><td>1 m³</td><td class="f">1000 l</td></tr><tr><td>Diesel (kursen)</td><td class="f">Q<sub>LHV</sub> 42,7 MJ/kg · ρ 0,84 kg/l</td></tr><tr><td>Metanol (kursen)</td><td class="f">Q<sub>LHV</sub> 19,9 MJ/kg · ρ 0,792 kg/l</td></tr><tr><td>Syre i luft</td><td class="f">23,2 vikt-%</td></tr></table></section>`;
}
function dyno() {
  if (!U.task) U.task = newTask(U.taskDiff); const t = U.task, left = Math.max(0, 6 - S.dyno[U.taskDiff - 1]);
  return `<section class="panel"><span class="kick">MÄTDATA FRÅN GARAGET</span><h1>Räknebänken</h1><p class="dim">Räkna ut det som efterfrågas. Tolerans 2 %. Decimaltal skrivs med komma eller punkt.</p>
    <div class="row">${[1, 2, 3].map(d => `<button class="chip s ${U.taskDiff === d ? 'on' : ''}" data-act="dyno-diff" data-arg="${d}">Svårighet ${d}</button>`).join('')}</div>
    <h2>${t.title}</h2><table class="stats given">${t.given.map(g => `<tr><td>${g[0]}</td><td>${g[1]}</td></tr>`).join('')}</table>
    <div class="asks">${t.asks.map((a, i) => `<label class="${t.marks ? (t.marks[i] ? 'right' : 'wrong') : ''}"><span>${a.label}</span><input type="text" inputmode="decimal" data-ans="${i}" value="${t.vals?.[i] ?? ''}" ${t.done ? 'disabled' : ''}>${t.done && !t.marks[i] ? `<small>Rätt svar: ${fmt(a.answer, a.dec ?? 2)}</small>` : ''}</label>`).join('')}</div>
    ${t.hint ? `<p class="dim">Tips: ${t.hint}</p>` : ''}
    <div class="row"><button class="btn" data-act="dyno-check" ${t.done ? 'disabled' : ''}>Kontrollera</button><button class="btn ghost" data-act="dyno-new">Ny uppgift</button>${t.komp ? `<button class="btn ghost" data-act="komp-open" data-arg="${t.komp}">Formeln i kompendiet</button>` : ''}</div>
    <p class="${U.taskMsg.startsWith('✓') ? 'okbox' : U.taskMsg ? 'warnbox' : 'dim'}">${U.taskMsg || `Belöning ${eur(t.reward)}. ${left ? `Full belöning: ${left} lösningar kvar på svårighet ${U.taskDiff}.` : 'Du har löst många på den här nivån – belöningen är nu 25 %.'}`}</p></section>`;
}

// ---------- kompendium (inklusive Kaaret-ritning!) ----------
const kaaretSvg = () => `<svg viewBox="0 0 680 280" style="width:100%;max-width:680px;background:#141a20;border-radius:10px;border:1px solid rgba(255,255,255,.12);margin:10px 0">
  <g stroke="#d7a84a" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <!-- Sidovy (Kuskin puolen sivu) -->
    <path d="M40 210 L40 130 L85 70 L170 70 L170 210"/>
    <line x1="170" y1="70" x2="250" y2="210"/>
    <!-- 2 dörrsträvor (6) - kryss i förardörren -->
    <line x1="40" y1="150" x2="170" y2="190" stroke="#ff6a3d"/>
    <line x1="40" y1="195" x2="170" y2="155" stroke="#ff6a3d"/>
    <!-- Bakifrån (Takaa) -->
    <path d="M310 210 L310 70 L430 70 L430 210"/>
    <line x1="310" y1="185" x2="430" y2="185"/>
    <line x1="310" y1="70" x2="430" y2="185"/>
    <line x1="295" y1="135" x2="310" y2="135" stroke="#5ce080"/>
    <!-- Ovanifrån / Kattoristikko (7) -->
    <rect x="490" y="70" width="140" height="110"/>
    <line x1="490" y1="125" x2="630" y2="125"/>
    <line x1="490" y1="70" x2="630" y2="180" stroke="#ff6a3d" stroke-dasharray="6 4"/>
    <line x1="630" y1="70" x2="490" y2="180" stroke="#ff6a3d" stroke-dasharray="6 4"/>
  </g>
  <g fill="#f4f1e8" font-size="11" font-family="sans-serif" font-weight="bold">
    <text x="105" y="25">KAARET: (3) Etukaari · (6) 2× Oviputket (förardörr) · (2) Takatuet · (11) 200×200×3 mm plattor</text>
    <text x="50" y="235">Kuskin puolen sivu (6: två dörrsträvor)</text>
    <text x="320" y="235">Takaa: (1) Tvärrör · (8) Diagonal · (10) ≤70mm</text>
    <text x="485" y="210">Tak (7): Mittputki / Super Kattoristikko</text>
    <text x="485" y="230">(9) 4 fästen (Super: 8 st ≥50mm) · (11) Hörntrianglar</text>
  </g>
</svg>`;

function komp() {
  if (U.kompOpen) {
    const c = KOMP.find(k => k.id === U.kompOpen) || KOMP[0];
    const codes = `<table class="stats codes">${CODES.map(c => `<tr><td><b>${c[0]}</b></td><td>${c[1]}<small>${c[2]}</small></td></tr>`).join('')}${MARKS.map(c => `<tr><td><b>${c[0]}</b></td><td>${c[1]}<small>${c[2]}</small></td></tr>`).join('')}</table>`;
    return `<section class="panel chapter"><button class="btn small ghost" data-act="komp-open" data-arg="">‹ Alla kapitel</button><h1>${c.title}</h1><div class="formula">${c.formula}</div>
      ${c.id === 'kaaret' ? kaaretSvg() : ''}
      ${c.body.map(p => p === '__CODES__' ? codes : `<p>${p}</p>`).join('')}</section>`;
  }
  return `<section class="panel"><span class="kick">ROKKIRALLI RY SÄÄNTÖKIRJA 2026 · MOTORTEKNIK · KÖRDYNAMIK</span><h1>Kompendium</h1><div class="klist">${KOMP.map((c, i) => `<button data-act="komp-open" data-arg="${c.id}"><i>${i + 1}</i><b>${c.title}</b><span>${c.formula}</span></button>`).join('')}</div></section>`;
}

// ---------- inställningar ----------
function settings() {
  const st = S.settings;
  return `<section class="panel"><h2>Förare (samma namn hela säsongen enligt Sääntökirja s. 3)</h2><div class="row"><span class="lbl">Ditt förarnamn</span><input class="txt" type="text" maxlength="18" value="${(S.name || '').replace(/"/g, '&quot;')}" data-in="name"></div></section>
  <section class="panel"><h2>Ljud</h2><label class="sl"><span>Motorljud <b>${st.vol} %</b></span><input type="range" min="0" max="100" step="5" value="${st.vol}" data-in="vol"></label><label class="sl"><span>Musik i menyerna <b>${st.music ?? 40} %</b></span><input type="range" min="0" max="100" step="5" value="${st.music ?? 40}" data-in="music"></label></section>
  <section class="panel"><h2>Kameravy</h2><div class="row">${[DEFAULT_CAM, 0, 1, 2, 3].map(i => `<button class="chip s ${(st.camera ?? DEFAULT_CAM) === i ? 'on' : ''}" data-act="camera" data-arg="${i}">${CAM_NAMES[i]}</button>`).join('')}</div><p class="dim">Förstaperson placerar dig bakom ratten inne i bilen. Instrumentbräda, ratt och störtbur syns medan du ser banan genom vindrutan. Byt även med C eller kameraknappen under körning. Ditt val sparas.</p></section>
  <section class="panel"><h2>Kod</h2><p class="dim">Har du fått en personlig kod? Skriv in den här.</p><div class="row"><input class="on-in" id="redeemCode" maxlength="20" autocomplete="off" autocapitalize="characters" placeholder="XXXX-XXXX-XXXX"><button class="btn small" data-act="redeem">Lös in</button></div></section>
  <section class="panel"><h2>Grafik</h2><div class="row">${(() => { const cur = st.quality === 'lag' ? 'low' : st.quality === 'hog' ? 'high' : (st.quality || 'auto'); return [['auto', 'Auto'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['ultra', 'Ultra']].map(q => `<button class="chip s ${cur === q[0] ? 'on' : ''}" data-act="quality" data-arg="${q[0]}">${q[1]}</button>`).join(''); })()}</div><p class="dim">Auto väljer nivå efter datorn och sänker upplösningen under körning om bildfrekvensen faller under ~50 FPS. Low: inga skuggor, färre träd. Medium: skuggor, gräs, miljöreflexer. High: mjuka skuggor, PBR-terräng, mer gräs och damm. Ultra: 4K-skuggor, tätaste skogen och vegetationen.</p></section>
  <section class="panel"><h2>Upplösning</h2><div class="row">${[['auto', 'Auto (skärmens)'], ['1440', '1440p'], ['1080', '1080p'], ['720', '720p'], ['540', '540p']].map(q => `<button class="chip s ${(st.res || 'auto') === q[0] ? 'on' : ''}" data-act="res" data-arg="${q[0]}">${q[1]}</button>`).join('')}</div><p class="dim">Hur många bildrader 3D-vyn renderas med. Lägre ger högre bildfrekvens, högre ger skarpare bild. HUD:en påverkas inte.</p></section>
  <section class="panel"><h2>Pekskärmskontroller</h2><div class="row">${[['auto', 'Auto'], ['on', 'På'], ['off', 'Av']].map(q => `<button class="chip s ${st.touch === q[0] ? 'on' : ''}" data-act="touch" data-arg="${q[0]}">${q[1]}</button>`).join('')}</div></section>
  <section class="panel"><h2>Realism</h2><div class="row"><span class="lbl">Mekaniska skador</span>${[[true, 'På'], [false, 'Av']].map(([v, n]) => `<button class="chip s ${(st.mechDmg !== false) === v ? 'on' : ''}" data-act="mechdmg" data-arg="${v ? 1 : 0}">${n}</button>`).join('')}</div>
    <div class="row"><span class="lbl">Mjukkroppsfysik (BeamNG-läge)</span>${[[true, 'På'], [false, 'Av']].map(([v, n]) => `<button class="chip s ${!!st.softBody === v ? 'on' : ''}" data-act="softbody" data-arg="${v ? 1 : 0}">${n}</button>`).join('')}</div>
    <p class="dim">BeamNG-läge: varje bils kaross är ett nät av noder och balkar som böjs permanent vid smällar. Hela bilen deformeras där den träffas, och skadorna påverkar körningen: sneda hjul gör att bilen drar åt det skadade hållet, intryckt front ger kylarläcka och motorskada, intryckt bak kan slita loss avgasröret. Av = som förut.</p>
    <div class="row"><span class="lbl">Avancerad däckmodell</span>${[[true, 'På'], [false, 'Av']].map(([v, n]) => `<button class="chip s ${!!st.tyreModel === v ? 'on' : ''}" data-act="tyremodel" data-arg="${v ? 1 : 0}">${n}</button>`).join('')}</div>
    <p class="dim">Avancerad däckmodell: kalla däck (under ca 58 °C, t.ex. första sekunderna) och överhettade däck (över ca 98 °C) greppar sämre, lågt däcktryck värmer däcken snabbare och heta bromsar bleknar. Se däcktemperaturerna i telemetrin [T]. Av = som förut.</p>
    <p class="dim">Hårda smällar kan skada styrningen (ett hjul blir snett och bilen drar åt ena hållet) och växellådan (högsta växeln försvinner, växlingarna blir långsammare). Lagas i depån. Oskadad bil kör exakt som vanligt.</p></section>
  ${controlsPanel()}
  <section class="panel"><h2>Sparning</h2><p class="dim">Pengar, bilar, delar, katsastuskortti, varningar och resultat sparas lokalt i webbläsaren.</p><div class="row"><button class="btn ghost danger" data-act="reset">Återställ sparning</button></div></section>`;
}

// ---------- kontroller ----------
const keyName = c => c.replace(/^Key/, '').replace(/^Digit/, '').replace('Arrow', '').replace('Left', ' V').replace('Right', ' H').replace('Up', '↑').replace('Down', '↓').replace('Space', 'Mellanslag').replace('Escape', 'Esc').replace('Control', 'Ctrl');
const padCode = c => !c ? '–' : c[0] === 'b' ? 'Knapp ' + c.slice(1) : 'Axel ' + c.slice(1);
function controlsPanel() {
  const B = binds(S.settings), gp = getPad(), dev = isWheel(gp) ? 'wheel' : 'pad', cap = U.capture;
  const capBtn = (kind, a) => cap && cap.kind === kind && cap.a === a ? '<b class="cap">Tryck nu…</b>' : `<button class="btn small ghost" data-act="bind" data-arg="${kind}:${a}">Ändra</button>`;
  return `<section class="panel"><h2>Kontroller</h2>
    <p class="dim">${gp ? `Ansluten: <b>${padName(gp)}</b> <small>(${gp.id.slice(0, 60)})</small>` : 'Ingen handkontroll eller ratt hittad – anslut och tryck på en knapp (webbläsaren visar den först efter en knapptryckning).'} Tangentbord, PS4-handkontroll och ratt med pedaler fungerar samtidigt. Gas, broms, koppling, styrning och växling är separata funktioner.</p>
    <table class="stats ctl"><tr><th>Funktion</th><th>Tangentbord</th><th></th><th>${dev === 'wheel' ? 'Ratt & pedaler' : 'Handkontroll'}</th><th></th></tr>
    ${ACTIONS.map(([a, n]) => `<tr><td>${n}</td><td>${(B.key[a] || []).map(keyName).join(', ') || '–'}</td><td>${capBtn('key', a)}</td><td>${padCode(B[dev][a])}${dev === 'wheel' && B.wheelInv[a] ? ' (pedal)' : ''}</td><td>${capBtn(dev, a)}</td></tr>`).join('')}</table>
    <div class="row"><span class="lbl">Dödzon ${Math.round(B.dead * 100)} %</span><input type="range" min="0" max="0.25" step="0.01" value="${B.dead}" data-in="dead"><button class="btn small ghost" data-act="bind-reset">Återställ standard</button></div>
    <p class="dim">Tips: för pedaler som står på +1 när de är släppta – välj "Ändra" och tryck ner pedalen helt, så känner spelet av riktningen automatiskt.</p></section>`;
}

// ---------- händelser ----------
const ACT = {
  bind(a) {
    const [kind, act] = a.split(':'); if (U.capStop) U.capStop();
    U.capture = { kind, a: act };
    U.capStop = captureNext(kind === 'key' ? 'key' : 'pad', (code, pedal) => {
      U.capture = null; U.capStop = null; if (!code) { render(); return; }
      const b = S.settings.binds = S.settings.binds || {};
      if (kind === 'key') { b.key = b.key || {}; b.key[act] = code === 'Escape' && act !== 'pause' ? [] : [code]; }
      else { b[kind] = b[kind] || {}; b[kind][act] = code; if (kind === 'wheel') { b.wheelInv = b.wheelInv || {}; b.wheelInv[act] = pedal || 0; } }
      save(); render();
    });
  },
  'bind-reset'() { delete S.settings.binds; save(); },
  go(a) { U.view = a; U.preview = null; if (a === 'komp') U.kompOpen = null; if (a === 'online' && ON.room) ON.room.setMe(netMe()); window.scrollTo(0, 0); },
  say(a) { ON.room?.say(netName(), a); return false; },
  'say-in'() { const el = document.getElementById('chatIn'); if (el?.value.trim()) { ON.room?.say(netName(), el.value); el.value = ''; } return false; },
  'se-new'(a) { const r = ON.room; if (!r?.isHost) return; const id = 's' + Date.now().toString(36), n = (Object.keys(S.onSeasons || {}).length + 1); r.setCfg({ season: { id, host: pid(), name: `Säsong ${n} · ${new Date().toLocaleDateString('sv-FI')}`, rounds: +a, done: [], pts: {}, wins: {} } }); (S.onSeasons ||= {})[id] = r.cfg.season; save(); return false; },
  'se-cont'(a) { const r = ON.room, x = S.onSeasons?.[a]; if (r?.isHost && x) r.setCfg({ season: x }); return false; },
  'se-off'() { ON.room?.setCfg({ season: null }); return false; },
  'inv-one'(a) { const r = ON.room; if (!PRES || !r) return; PRES.invite([a], r.code, netName()); (ON.invited ||= new Map()).set(a, Date.now()); toast('📨 Inbjudan skickad'); },
  'inv-all'() { const r = ON.room; if (!PRES || !r) return; const ids = PRES.others().filter(p => p.room !== r.code).map(p => p.id); PRES.invite(ids, r.code, netName()); ids.forEach(id => (ON.invited ||= new Map()).set(id, Date.now())); toast(`📨 Inbjudan skickad till ${ids.length} spelare`); },
  'inv-no'() { U.invite = null; },
  'inv-join'() { const v = U.invite; U.invite = null; if (!v) return; if (!activeCar()) { toast('Du behöver en bil för att köra online.'); return; } if (ON.room) leaveRoom(); ON.code = v.code; U.view = 'online'; openRoom(v.code, false); window.scrollTo(0, 0); },
  replay() { const L = U.lastReplay; if (!L) return; const back = U.view; window.scrollTo(0, 0);
    startRace({ ...L.o, replay: L.rec, title: '🎬 Repris – ' + (L.o.title || ''), onDone: () => { U.view = back; render(); } }); return false; },
  'on-create'() { const n = document.getElementById('onName'); if (n) { S.name = n.value.trim() || 'Du'; save(); } openRoom(makeCode(), true); },
  'on-join'() {
    const n = document.getElementById('onName'); if (n) { S.name = n.value.trim() || 'Du'; save(); }
    const code = cleanCode(document.getElementById('onCode')?.value || ON.code); ON.code = code;
    if (code.length !== 4) { toast('Rumskoden har fyra tecken.'); return; }
    openRoom(code, false);
  },
  'on-retry'() { openRoom(ON.room.code, false); },
  'on-leave'() { leaveRoom(); },
  'on-cm'(a) { ON.room?.setCfg({ cm: +a }); return false; },
  'on-cfg'(a) { const [k, v] = a.split(':'); ON.room?.setCfg({ [k]: k === 'track' || k === 'weather' || k === 'tod' ? v : +v }); return false; },
  'on-copy'() { const l = roomLink(ON.room.code); try { navigator.clipboard.writeText(l); } catch (e) { } ON.copied = 1; setTimeout(() => { ON.copied = 0; if (U.view === 'online') render(); }, 1800); },
  'on-start'() { hostStart(); return false; },
  'on-next'() { hostNext(); return false; },
  'on-reset'() { ON.ch = null; ON.room.champ = null; ON.room.sendChamp(null); },
  'on-skip'() { const r = ON.room; if (!r) return; if (r.isHost) r.onSkip(r.id); else r.send({ k: 'skip' }); toast('KESKÖIDÄ skickat.'); },
  'on-watch'(a) { const r = ON.room, L = r?.live[a]; if (L && !L.done) netRace(a, L.grid, L.cfg, L.lead, true); return false; },
  'on-rejoin'(a) { const r = ON.room, L = r?.live[a]; if (L && !L.done) netRace(a, L.grid, L.cfg, L.lead, false); return false; },

  aid(a) { S.aids[a] = S.aids[a] ? 0 : 1; save(); },
  'drv-cls'(a) { S.driverCls = a; save(); },
  'do-lippumies'() { S.lippumies = 0; S.warnings = 0; save(); toast('🚩 Du har stått flaggvakt en tävlingsdag (lippumiespesti) – du har nu tävlingsrätt igen!'); },
  'q-track'(a) { U.quick.track = a; }, 'q-laps'(a) { U.quick.laps = +a; }, 'q-opp'(a) { U.quick.opp = +a; },
  'q-weather'(a) { U.quick.weather = a; }, 'q-tod'(a) { U.quick.tod = a; }, 'q-cm'(a) { U.quick.cm = +a; },
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
  'name-save'() { const v = document.getElementById('newName')?.value.trim(); if (v) { S.name = v.slice(0, 18); save(); pushBoard(); toast('Namnet är sparat.'); U.view = 'menu'; } },
  'top-sort'(a) { TOP.sort = a; },
  'cc-per'(a) { champCfg().perStart = +a; save(); }, 'cc-heats'(a) { champCfg().heats = +a; save(); },
  'ev-run'(a) { evRun(a, false); return false; },
  'ev-watch'(a) { evRun(a, true); return false; },
  'ev-skip'() { const ev = U.ev; if (ev && chSkip(ev.ch, 'me')) { toast('KESKÖIDÄ – du hoppar över ' + (ev.ch.round === 'alku' ? 'Alkuerä' : 'Keräilyerä') + '.'); } },
  'ev-next'() { evNext(); window.scrollTo(0, 0); },
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
  pv(a) { const [u, l] = a.split(':'); U.preview = [u, +l]; window.scrollTo(0, 0); }, 'pv-off'() { U.preview = null; },
  'komp-open'(a) { U.view = 'komp'; U.kompOpen = a || null; window.scrollTo(0, 0); },
  preset(a) { const t = activeCar().tune, P = { power: [0.90, 3], race: [0.95, 0], eco: [1.08, 2], safe: [0.86, -5] }[a]; t.lambda = P[0]; t.ign = P[1]; save(); },
  fuel(a) { if (S.fuels.includes(a)) { activeCar().tune.fuel = a; save(); } },
  'fuel-buy'(a) { const f = fuelById(a); if (S.money >= f.price && !S.fuels.includes(a)) { S.money -= f.price; S.fuels.push(a); activeCar().tune.fuel = a; save(); } },
  'dyno-diff'(a) { U.taskDiff = +a; U.task = newTask(+a); U.taskMsg = ''; }, 'dyno-new'() { U.task = newTask(U.taskDiff); U.taskMsg = ''; },
  'sk-open'(a) { U.lesson = +a; U.skTask = null; U.exStep = 0; U.skMsg = ''; U.skModel = null; U.exam = null; window.scrollTo(0, 0); },
  'sk-back'() { U.lesson = null; U.exam = null; U.skMsg = ''; window.scrollTo(0, 0); },
  'sk-step'() { U.exStep = (U.exStep || 0) + 1; },
  'sk-allsteps'() { U.exStep = 99; },
  'sk-model'(a) { const L = U.lesson, el = document.getElementById(`skd${L}_${a}`); if (el) { (S.skola ||= {})['d' + L + a] = el.value; save(); } U.skModel = U.skModel === +a ? null : +a; },
  'sk-new'() { U.skTask = lessonTask(U.lesson); U.skMsg = ''; },
  'sk-own'() { U.skTask = myEngineTask(U.lesson); U.skMsg = ''; },
  'sk-check'() { const t = U.skTask; if (!t || t.done) return; t.vals = t.asks.map((_, i) => document.getElementById('ska' + i)?.value || ''); const ok = checkAnswers(t), K = (S.skola ||= {}), r = (K[U.lesson] ||= { ok: 0 });
    if (ok) { r.ok++; let pay = 40; S.xp = (S.xp || 0) + 8; if (r.ok === SK_GOAL && !r.bonus) { r.bonus = 1; pay += 250; } S.money += pay; U.skMsg = `✓ Rätt! +${eur(pay)} och 8 XP${r.ok === SK_GOAL ? ' · Övningen klar – bonus!' : ''}`; }
    else U.skMsg = 'Inte helt rätt – se rätt svar under fälten och lösningen nedan.'; save(); },
  'sk-exam'() { const tasks = []; const ids = LESSONS.map(l => l.id).sort(() => Math.random() - 0.5); [1, 2, 3, 4].forEach(i => ids.splice(ids.indexOf(i), 1)); const pool = [1, 2, 3, 4, ...ids.slice(0, 2)]; for (const id of pool) tasks.push(lessonTask(id)); U.exam = { tasks: tasks.sort(() => Math.random() - 0.5), i: 0, score: 0, t0: Date.now() }; window.scrollTo(0, 0); },
  'sk-xcheck'() { const E = U.exam, t = E.tasks[E.i]; t.vals = t.asks.map((_, i) => document.getElementById('ska' + i)?.value || ''); if (checkAnswers(t)) { E.score++; S.money += 25; save(); } },
  'sk-xnext'() { U.exam.i++; },
  'sk-side'(a) { keepVals(); U.side = !U.side; if (U.side && +a) U.fPage = +a; },
  'sk-sheet'(a) { keepVals(); if (U.view === 'skola' && (U.lesson || U.exam) && +a) { U.side = true; U.fPage = +a; return; } U.fPage = +a; U.fFrom = U.view === 'formel' ? U.fFrom : U.view; U.view = 'formel'; window.scrollTo(0, 0); },
  'sk-zoom'(a) { keepVals(); U.fZoom = Math.max(1, Math.min(3, (U.fZoom || 1) + 0.5 * +a)); },
  print() { window.print(); return false; },
  'dyno-check'() {
    const t = U.task; t.vals = [...document.querySelectorAll('[data-ans]')].map(i => i.value); const r = checkTask(t);
    if (r.all) { const n = S.dyno[U.taskDiff - 1], pay = n < 6 ? t.reward : Math.round(t.reward * 0.25); S.money += pay; S.dyno[U.taskDiff - 1]++; save(); U.taskMsg = `✓ Rätt! +${eur(pay)}`; } else U.taskMsg = 'Inte helt rätt – rätta svaren visas vid fälten. Ta en ny uppgift.';
  },
  camera(a) { const camera = Number(a); if (Number.isInteger(camera) && CAM_NAMES[camera]) { S.settings.camera = camera; save(); } },
  softbody(a) { S.settings.softBody = a === '1'; save(); },
  tyremodel(a) { S.settings.tyreModel = a === '1'; save(); },
  mechdmg(a) { S.settings.mechDmg = a === "1"; save(); },
  quality(a) { S.settings.quality = a; save(); }, res(a) { S.settings.res = a; save(); }, touch(a) { S.settings.touch = a; save(); },
  reset() { if (U.confirmReset) { reset(); U.confirmReset = false; toast('Sparningen är återställd.'); U.view = 'menu'; } else { U.confirmReset = true; toast('Tryck en gång till för att radera allt.'); setTimeout(() => U.confirmReset = false, 4000); } },
};

function quickDone(r, time) {
  if (time && r?.ghost && U.lastGhostKey) { const G = S.ghosts ||= {}, old = G[U.lastGhostKey]; if (!old || r.ghost.t < old.t) { G[U.lastGhostKey] = { t: r.ghost.t, f: r.ghost.f }; save(); } }
  if (isFinite(r.bestLap)) record(U.quick.track, r.bestLap);
  const prize = time || r.flag ? 0 : withBonus(NORMAL_PRIZE[r.pos - 1] || 0); if (prize && r.finished) S.money += prize; save();
  U.result = { r, time, prize: r.finished ? prize : 0, title: time ? 'Tidskörning' : 'Träningsheat' }; U.view = 'result'; render();
}
// 🎬 Repris av senaste heatet: samma bana, bilar och väder – bilarna följer inspelningen
function replayBtn() { return U.lastReplay ? '<button class="btn ghost" data-act="replay">🎬 Se repris av senaste heatet</button>' : ''; }
function result() {
  const R = U.result; if (!R) { U.view = 'karriar'; return karriar(); }
  const r = R.r;
  return `<section class="panel"><span class="kick">${R.title.toUpperCase()}</span><h1>${R.time ? 'Bästa varv ' + fmtTime(r.bestLap) : `Plats ${r.pos}${r.flag ? ' (' + r.flag + ')' : ''}`}</h1>
    ${R.time ? '' : `<div class="pills"><div><span>Prispengar</span><b>${eur(R.prize)}</b></div></div>`}
    ${resTable(r.order, R.time ? null : (o, i) => [o.flag ? 0 : NORMAL_PRIZE[i] || 0, 0])}
    <div class="row"><button class="btn" data-act="go" data-arg="play">Kör igen</button>${replayBtn()}<button class="btn ghost" data-act="go" data-arg="menu">Meny</button></div></section>`;
}

const INP = {
  'on-laps'(v) { ON.room?.setCfg({ laps: +v }); }, 'on-ai'(v) { ON.room?.setCfg({ ai: +v }); }, 'on-diff'(v) { ON.room?.setCfg({ diff: +v }); },
  'cc-diff'(v) { champCfg().diff = +v; save(); },
  dead(v) { S.settings.binds = S.settings.binds || {}; S.settings.binds.dead = +v; save(); },
  'q-ai'(v) { U.quick.ai = +v; },
  num(v) { activeCar().num = Math.max(1, Math.min(999, Math.round(+v) || 1)); save(); return false; },
  name(v) { S.name = v.trim() || 'Du'; save(); return false; },
  lambda(v) { activeCar().tune.lambda = +v; save(); }, ign(v) { activeCar().tune.ign = +v; save(); }, finalScale(v) { activeCar().tune.finalScale = +v; save(); }, bias(v) { activeCar().tune.bias = +v; save(); },
  vol(v) { S.settings.vol = +v; save(); },
  music(v) { S.settings.music = +v; save(); MUSIC.setVol(+v / 100); },
};

export function initUI() {
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target?.id === 'chatIn') { e.preventDefault(); ACT['say-in']?.(); } });
  setTimeout(startPresence, 1500); // närvaro för inbjudningar online
  document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el || el.disabled) return; const f = ACT[el.dataset.act]; if (!f) return; if (f(el.dataset.arg, el) !== false) render(); });
  document.addEventListener('change', e => { const gf = e.target.closest?.('[data-glb]'); if (gf) { glbUpload(gf.dataset.glb, gf.files?.[0]); return; } });
  document.addEventListener('change', e => { const el = e.target.closest('[data-in]'); if (!el) return; if (el.dataset.in.startsWith('su:')) { const key = el.dataset.in.slice(3), cs = activeCar(), v = +el.value;
      // justeringar är gratis, men nya fälgar eller en annan däckbredd kräver nya delar
      const cost = key === 'rim' && v !== cs.tune.rim ? 220 : key === 'width' && v !== cs.tune.width ? TYRES[cs.tune.tyre || 'std'].price : 0;
      if (cost) { if (S.money < cost) { toast(`${key === 'rim' ? 'Nya fälgar' : 'Nya däck i den bredden'} kostar ${eur(cost)}.`); render(); return; } S.money -= cost; toast(`${key === 'rim' ? 'Nya fälgar' : 'Nya däck'} köpta (${eur(cost)}).`); if (key === 'width') cs.tyres = [cs.tune.tyre || 'std']; }
      cs.tune[key] = v; save(); render(); return; } const f = INP[el.dataset.in]; if (f && f(el.value) !== false) render(); });
  document.addEventListener('input', e => { const el = e.target.closest('input[type=range][data-in]'); if (!el) return; const b = el.closest('label')?.querySelector('span b'); if (b && ['lambda', 'finalScale'].includes(el.dataset.in)) b.textContent = (+el.value).toFixed(2).replace('.', ','); });
  if (S.econReset) { delete S.econReset; save(); toast('Ny ekonomi: du börjar om med 5 000 € och en Mazda 626 i originalskick. Namn, statistik och rekord är kvar.'); }
  try { const c = cleanCode(new URLSearchParams(location.search).get('rum')); if (c.length === 4) { ON.code = c; U.view = 'online'; } } catch (e) { }
  render();
}
