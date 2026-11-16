// Alla menyvyer + tävlingsdagens logik enligt ROKKIRALLI RY SÄÄNTÖKIRJA (21.04.2026).
import { CARS, CLASSES, CLASS_RULES, BUILD, UPG, FUELS, PAINTS, TRACKS, SURF, CAREER, FINALS, calcPoints, PRIZE_SHARE, CODES, MARKS, DRIVERS, KOMP } from './data.js';
import { buildSpec, engineAt, curve, carById, fuelById, defaultTune, fmt, checkInspection, formatCarNum } from './engine.js';
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
const U = { view: 'menu', kompOpen: null, quick: { track: 'tammisaari', laps: 3, opp: 5, ai: 85, joker: 1 }, ev: null, task: null, taskDiff: 1, taskMsg: '', preview: null, race: null, toast: '' };

const spec = (id = S.active) => buildSpec(id, S.cars[id], S.cars[id]?.tune);
const stockSpec = id => buildSpec(id, { build: { strip: 1, cage: 1, seat: 1, net: 1, switch: 1 }, upg: {} }, defaultTune());
const currentInsp = () => checkInspection(S.active, activeCar(), S.driverCls);
const levelPts = li => CAREER[li].events.reduce((a, e) => a + (S.career.res[e.id]?.pts || 0), 0);
const levelOpen = li => li === 0 || levelPts(li - 1) >= CAREER[li].need;
const topLevel = () => { let t = 0; CAREER.forEach((l, i) => { if (levelOpen(i)) t = i; }); return t; };

// ---------- ram ----------
export function render() {
  const racing = U.view === 'race'; document.body.classList.toggle('racing', racing); if (racing) return;
  const V = { menu, karriar, event: eventView, garage, trim, dyno, komp, settings }[U.view] || menu;
  app().innerHTML = `<header class="topbar">${U.view !== 'menu' && U.view !== 'event' ? '<button class="back" data-act="go" data-arg="menu">‹ Meny</button>' : '<span class="brand">ROKKI<b>KRAFT</b></span>'}
    <span class="top-title">${{ karriar: 'Karriär & Banor', event: 'Tävlingsdag', garage: 'Garage & Besiktning', trim: 'Trimning', dyno: 'Räknebänken', komp: 'Kompendium & Sääntökirja', settings: 'Inställningar' }[U.view] || ''}</span>
    <span class="wallet">${S.warnings > 0 ? `<i style="color:#ff6a3d">⚠ ${S.warnings}/3 varningar</i>` : ''}${S.vouchers > 0 ? `<i style="color:#5ce080">🎟 ${S.vouchers} hyvityskuitti</i>` : ''}<b>${eur(S.money)}</b><i>${CAREER[topLevel()].name}</i></span></header>
    <main class="view v-${U.view}">${V()}</main>${U.toast ? `<div class="toast">${U.toast}</div>` : ''}`;
  if (U.toast) { clearTimeout(U.toastT); U.toastT = setTimeout(() => { U.toast = ''; document.querySelector('.toast')?.remove(); }, 2800); }
  after();
}
const toast = t => { U.toast = t; };
function after() {
  const cv = document.getElementById('curve'); if (cv) drawCurve(cv);
  const tm = document.getElementById('trkPreview'); if (tm) drawTrackPreview(tm, tm.dataset.trk);
}

// ---------- meny ----------
function menu() {
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
    <nav class="mgrid">
      ${btn('karriar', '🏁', `Nivå ${topLevel() + 1}/4`, 'Karriär & Banor', `Tammisaari, Rantasalmi m.fl. · Sääntökirja 2026`, 'c1')}
      ${btn('garage', '🔧', `${owned} bilar · ${parts} delar`, 'Garage & Besiktning', 'Katsastuskortti, kaaret, klassval & uppgraderingar', 'c2')}
      ${btn('trim', '🔥', fuelById(cs.tune.fuel).name, 'Trimning', 'λ, tändläge, bränsle och utväxling', 'c3')}
      ${btn('dyno', '🧮', `${solved} lösta`, 'Räknebänken', 'Räkneuppgifter som ger pengar', 'c4')}
      ${btn('komp', '📘', `${KOMP.length} kapitel`, 'Kompendium & Regler', 'Sääntökirja 2026, Kaaret-ritningar & MEP-teori', 'c5')}
      ${btn('settings', '⚙️', 'System', 'Inställningar', 'Ljud, grafik, touch och sparning', 'c6')}
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
  const insp = currentInsp(), ok = insp.ok, car = carById(S.active), rules = insp.rules;
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

  h += `<section class="panel"><h2>Förarhjälpmedel</h2><div class="aids">
    ${aid('abs', 'ABS', 'Hjulen låser sig inte vid hård broms.', 'Full broms låser hjulen – bilen går rakt fram.')}
    ${aid('tc', 'Antispinn', 'Drivhjulen spinner inte loss.', 'Fullgas ger hjulspinn; bakhjulsdrivare sladdar på gasen.')}
    ${aid('auto', 'Automatväxling', 'Bilen växlar själv vid effekttoppen.', 'Växla själv med E / Q.')}</div></section>`;

  h += `<section class="panel"><h2>Banprofil & Fritt heat / Träning</h2>
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
        <div class="row"><span class="lbl">AI ${q.ai} %</span><input type="range" min="70" max="105" step="5" value="${q.ai}" data-in="q-ai"></div>
        <div class="row"><button class="btn" data-act="quick-race" ${ok ? '' : 'disabled'}>🏁 Starta träningsheat</button><button class="btn ghost" data-act="quick-time" ${ok ? '' : 'disabled'}>⏱ Tidskörning</button></div>
      </div>
      <div class="g-curve" style="display:flex;flex-direction:column;align-items:center">
        <canvas id="trkPreview" width="380" height="300" data-trk="${q.track}" style="background:#141a20;border-radius:10px;border:1px solid rgba(255,255,255,.1)"></canvas>
        <div class="legend" style="margin-top:6px"><i style="background:#d9b88c"></i>Grus (sora)<i style="background:#7d8b99"></i>Asfalt (kestopäällyste)<i style="background:#ff3b2f"></i>Sakkolenkki</div>
      </div>
    </div></section>`;

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
  vetari: [['sunny', 'kadett'], ['sunny', 'kadett', 'civic'], ['kadett', 'civic', 'mondeo'], ['civic', 'mondeo']],
  kardaani: [['v343', 'sierra'], ['v343', 'sierra', 'v940'], ['sierra', 'bmw325', 'v940'], ['bmw325', 'v940', 'sierra']],
  super: [['saab9000', 'sierra_super'], ['saab9000', 'sierra_super', 'bmw325'], ['saab9000', 'sierra_super', 'v940'], ['saab9000', 'sierra_super']],
};

function makeOpps(n, li, skill, cls) {
  const names = shuffle(DRIVERS).slice(0, n), mine = activeCar().paint, full = { strip: 1, cage: 1, seat: 1, net: 1, switch: 1 };
  const poolKey = cls === 'super' || cls === 'supersenior' ? 'super' : cls === 'kardaani' ? 'kardaani' : 'vetari';
  const isSup = poolKey === 'super';
  return names.map(name => {
    const cid = pick(AI_POOL[poolKey][li]);
    const upg = isSup ? { ...AI_UPG_SUP[li] } : { ...AI_UPG_STD[li], ...(carById(cid).drv === 'rwd' && li >= 2 ? { diff: 1 } : {}) };
    return {
      name, paint: pick(PAINTS.filter(p => p.id !== mine)).rgb, bw: Math.random() < 0.35 ? 'bw' : 'wb',
      skill: skill + (Math.random() - 0.5) * 0.05,
      spec: buildSpec(cid, { build: full, upg }, defaultTune()),
    };
  });
}

const STAGE = { alku: 'Alkuerä', kerailu: 'Keräilyerä', lastcall: 'Last call', semi: 'Semifinaali', final: '-finaali' };
const stageName = ev => ev.stage === 'final' ? FINALS[ev.fin] + '-finaali' : STAGE[ev.stage];

function evStart(arg) {
  const [li, id] = arg.split(':'), L = CAREER[+li], e = L.events.find(x => x.id === id);
  const insp = currentInsp(), rules = insp.rules;
  if (!insp.ok || S.lippumies > 0) return;
  // Betala osallistumismaksu eller använd hyvityskuitti
  let usedVoucher = false;
  if (S.vouchers > 0 && rules.fee > 0) { S.vouchers--; usedVoucher = true; }
  else if (S.money >= rules.fee) { S.money -= rules.fee; }
  else return;
  save();

  // Sääntökirja s. 19: "Alkuerien lähtöjärjestys määräytyy kuluvan kauden pistetilanteen mukaan siten, että
  // pistejohdossa oleva saa viimeisen paikan jne. ... Ensikertalaiset menevät eturiviin ja saavat valita ensimmäisenä paikan."
  const curPts = levelPts(+li);
  const startSlot = curPts === 0 ? 0 : Math.min(5, Math.floor(curPts / 15));
  const laps = Math.max(rules.minLaps, L.id === 'mestari' ? 3 : rules.minLaps);

  U.ev = {
    li: +li, e, L, cls: insp.cls, rules, laps,
    stage: 'alku', fin: 0, grid: startSlot, hist: [],
    dmg: 0, radLeak: false, exhaustLoose: false, needKaatoInsp: false,
    cleanDay: true, protestUsed: false, arvat: 0, saleEligible: false, saleDone: false, saleMsg: '',
    feePaid: rules.fee, usedVoucher,
    over: null, last: null, heat: 'ABCDEF'[Math.floor(Math.random() * 6)],
    note: curPts === 0 ? 'Ensikertalainen (0 p i serien) – du får välja startruta först i främre ledet (ruta 1)!' : `Har ${curPts} p i serien – startar på ruta ${startSlot + 1} enligt omvänd poängordning.`,
  };
  U.view = 'event';
}

function evSkill(ev) {
  const m = { alku: -0.04, kerailu: -0.07, lastcall: -0.09, semi: 0 };
  return ev.L.ai + (ev.stage === 'final' ? [0.03, 0.01, -0.01, -0.03, -0.05][ev.fin] : m[ev.stage]);
}

function evRun() {
  const ev = U.ev;
  if (ev.needKaatoInsp || ev.exhaustLoose) return;
  startRace({
    trackId: ev.e.track, laps: ev.laps,
    opps: makeOpps(5, ev.li, evSkill(ev), ev.cls),
    grid: ev.grid, gridRows: ev.rules.gridRows,
    useJoker: ev.rules.joker, sideContact: ev.rules.sideContact,
    title: `${ev.rules.name} – ${stageName(ev)}${ev.stage === 'final' ? '' : ' ' + ev.heat}`,
    dmg0: ev.dmg, radLeak0: ev.radLeak, mode: 'heat',
    onDone: res => { evAfter(res); U.view = 'event'; render(); },
  });
}

function evAfter(res) {
  const ev = U.ev, pos = res.pos;
  ev.dmg = res.dmg; ev.radLeak = res.radLeak; ev.exhaustLoose = !!res.exhaustLoose; ev.needKaatoInsp = !!res.kaato;
  ev.last = res; ev.protestable = !!res.sanction;
  ev.hist.push({ stage: stageName(ev), pos, flag: res.flag });
  if (isFinite(res.bestLap)) record(ev.e.track, res.bestLap);

  // Varningar enligt Sääntökirja s. 13–15
  if (res.sanction) {
    ev.cleanDay = false;
    S.warnings = (S.warnings || 0) + 1;
    if (S.warnings >= 3) {
      // 3 varningar = Hylky (diskning ur hela tävlingen, dagens poäng nollas + 1 helgs lippumiespesti!)
      S.lippumies = 1;
      S.warnings = 0;
      ev.over = { final: 'DQ', pos: 6, pts: 0, prize: 0, dq: true };
      const old = S.career.res[ev.e.id];
      if (!old) S.career.res[ev.e.id] = { final: 'DQ', pos: 6, pts: 0 };
      save();
      return;
    }
    save();
  }

  const trk = getTrack(ev.e.track);
  const end = (final, p) => {
    // Om dagen körts helt rent utan varningar nollställs varningslistan ("Sanktiolista nollaantuu, kun ajat puhtaan kilpailun")
    if (ev.cleanDay && S.warnings > 0) {
      S.warnings = 0;
      toast('✓ Ren tävling körd – din varningslista (sanktiolista) är nu nollställd!');
    }
    const share = final === 'out' ? PRIZE_SHARE.out : final === 'A' ? PRIZE_SHARE.A[p - 1] : PRIZE_SHARE[final] || 0.1;
    const pts = calcPoints(ev.cls, trk.winter, final, p);
    const prize = Math.round(ev.L.prize * share / 5) * 5;
    // Kolla myyntivelvoite (850 €)
    const sf = ev.rules.saleFrom;
    if (sf === 'semi' && (ev.stage === 'semi' || ev.stage === 'final')) ev.saleEligible = true;
    else if (sf === 'C' && ['A', 'B', 'C'].includes(final)) ev.saleEligible = true;
    else if (sf === 'B' && ['A', 'B'].includes(final)) ev.saleEligible = true;
    else if (sf === 'A' && final === 'A') ev.saleEligible = true;

    ev.over = { final, pos: p, pts, prize };
    S.money += prize;
    const old = S.career.res[ev.e.id];
    if (!old || pts > old.pts) S.career.res[ev.e.id] = { final, pos: p, pts };
    save();
  };

  if (ev.stage === 'alku') {
    if (pos <= 2) { ev.stage = 'semi'; ev.grid = pos - 1; ev.note = `${pos}:a i alkuerä – direkt till semifinal!`; }
    else { ev.stage = 'kerailu'; ev.grid = Math.floor(Math.random() * 6); ev.note = 'Inte bland de två första. Ny chans i keräilyerä.'; }
  } else if (ev.stage === 'kerailu') {
    if (pos <= 2) { ev.stage = 'semi'; ev.grid = 3 + pos - 1; ev.note = `${pos}:a i keräilyerä – vidare till semifinal!`; }
    else { ev.stage = 'lastcall'; ev.grid = Math.floor(Math.random() * 6); ev.note = 'Sista chansen: last call. Bara segraren går vidare.'; }
  } else if (ev.stage === 'lastcall') {
    if (pos === 1) { ev.stage = 'semi'; ev.grid = 5; ev.note = 'Seger i last call – du är i semifinal, längst bak.'; }
    else end('out', pos);
  } else if (ev.stage === 'semi') {
    if (ev.rules.saleFrom === 'semi') ev.saleEligible = true;
    ev.fin = Math.min(4, pos - 1); ev.stage = 'final'; ev.grid = Math.min(2, Math.floor(Math.random() * 3));
    ev.note = `${pos}:a i semifinalen → ${FINALS[ev.fin]}-finalen.${ev.saleEligible ? ' Obs: Semifinalbilar i ' + ev.rules.name + ' omfattas nu av myyntivelvoite (850 €)!' : ''}`;
  } else if (ev.stage === 'final') {
    if (ev.fin === 0) end('A', pos);
    else if (pos <= 2) {
      ev.note = `NOUSU! ${pos}:a i ${FINALS[ev.fin]}-finalen – du klättrar till ${FINALS[ev.fin - 1]}-finalen och startar längst bak. Du har 5 minuters mektid (nousuaika) på din depåplats från att du passerat STOP-märket!`;
      ev.fin--; ev.grid = 4 + pos - 1;
    } else end(FINALS[ev.fin], pos);
  }
  ev.heat = 'ABCDEF'[Math.floor(Math.random() * 6)];
}

function eventView() {
  const ev = U.ev; if (!ev) { U.view = 'karriar'; return karriar(); }
  const t = TRACKS.find(x => x.id === ev.e.track), cost = Math.ceil(ev.dmg * 1.0 + (ev.radLeak ? 20 : 0) + (ev.exhaustLoose ? 15 : 0));
  const steps = ['Alkuerä', 'Keräily', 'Last call', 'Semi', 'E', 'D', 'C', 'B', 'A'];
  const cur = ev.over ? -1 : ev.stage === 'final' ? 8 - ev.fin : { alku: 0, kerailu: 1, lastcall: 2, semi: 3 }[ev.stage];
  const table = r => `<table class="res"><tr><th></th><th>Förare</th><th>Tid</th><th>Markering / Kod</th></tr>${r.order.map((o, i) => `<tr class="${o.isPlayer ? 'me' : ''}"><td>${i + 1}</td><td>${o.name}</td><td>${o.time ? fmtTime(o.time) : '–'}</td><td class="flag">${o.flag || ''}</td></tr>`).join('')}</table>`;

  let h = `<section class="panel evhead"><span class="kick">${t.name.toUpperCase()} · ${SURF[t.surface].name.toUpperCase()} · ${ev.rules.name.toUpperCase()}</span><h1>${ev.e.name}</h1>
    <div class="ladder">${steps.map((s, i) => `<span class="${i === cur ? 'cur' : ''} ${i > 3 ? 'fin' : ''}">${s}</span>`).join('<i>›</i>')}</div></section>`;

  if (ev.last) {
    h += `<section class="panel"><h2>STOP-merkki · ${ev.hist[ev.hist.length - 1].stage}: plats ${ev.last.pos}${ev.last.flag ? ` <span class="flag">${ev.last.flag}</span>` : ''}</h2>${table(ev.last)}
      ${isFinite(ev.last.bestLap) ? `<p class="dim">Ditt bästa varv: ${fmtTime(ev.last.bestLap)}</p>` : ''}
      ${ev.protestable ? `<div class="warnbox" style="margin-top:8px">Domaren meddelar vid <b>STOP-märket</b> att du fått varning <b>${ev.last.sanction}</b> (du flyttades sist i heatet). Enligt Sääntökirja s. 13 (uppdaterad 21.04.2026) kan du lämna in en skriftlig protest till tävlingsledaren för <b>50 €</b> (och ta med en <i>kuljettajan edustaja</i>). Går protesten igenom återbetalas 50 € och varningen stryks!
        <div class="row" style="margin-top:8px"><button class="btn small" data-act="ev-protest" ${S.money >= 50 ? '' : 'disabled'}>📝 Lämna in skriftlig protest med edustaja (50 €)</button></div></div>` : ''}</section>`;
  }

  if (ev.over) {
    const o = ev.over;
    h += `<section class="panel final ${o.final === 'A' && o.pos <= 3 ? 'podium' : ''}"><span class="kick">${o.dq ? 'HYLKY – DISKVALIFICERAD (3 VARNINGAR)' : 'DAGEN ÄR SLUT'}</span>
      <h1>${o.dq ? 'Diskad ur tävlingen (0 poäng) + Lippumiespesti' : o.final === 'out' ? 'Utslagen före semifinalerna' : `${o.final}-finalen, plats ${o.pos}`}</h1>
      <div class="pills"><div><span>Prispengar</span><b>${eur(o.prize)}</b></div><div><span>Poäng till pörssin (${ev.rules.short})</span><b>${o.pts} p</b></div><div><span>Dina varningar totalt</span><b>${S.warnings} / 3</b></div></div>
      <p class="dim">${ev.hist.map(x => `${x.stage} ${x.pos}:a${x.flag ? ' (' + x.flag + ')' : ''}`).join(' → ')}</p>`;

    // Autojen myyntitilaisuus (850 €) enligt Sääntökirja s. 16–17!
    if (ev.saleEligible && !ev.saleDone) {
      h += `<div class="warnbox" style="margin:12px 0"><h3>🔨 Autojen myyntitilaisuus (850 €)</h3>
        <p>Eftersom du nådde ${ev.rules.saleFrom === 'semi' ? 'semifinal' : ev.rules.saleFrom + '-final'} i <b>${ev.rules.name}</b> omfattas din bil av <b>myyntivelvoite (850 € kontant)</b>! (Även en diskad bil har kvar sin myyntivelvoite). Du har <b>${ev.arvat} st</b> egna lotter (arpoja). Innan försäljningen får du plocka ur: <i>kuppipenkki, bälten & öglebultar, Nascar-verkko, batteri, spacers samt ratt och däck (om hela standardhjul sätts dit)</i>.</p>
        <div class="row" style="margin-top:8px">
          <button class="btn small" data-act="ev-sale-run">🎲 Genomför lottdragningen (myyntitilaisuus)</button>
        </div></div>`;
    } else if (ev.saleMsg) {
      h += `<div class="okbox" style="margin:12px 0">${ev.saleMsg}</div>`;
    }

    h += `<div class="row"><button class="btn" data-act="ev-close" ${ev.saleEligible && !ev.saleDone ? 'disabled' : ''}>Tillbaka till karriären & hämta katsastuskortti</button></div></section>`;
  } else {
    h += `<section class="panel next"><h2>Nästa: ${ev.rules.name} ${stageName(ev).toLowerCase()}</h2>
      ${ev.note ? `<p>${ev.note}</p>` : ''}
      ${ev.needKaatoInsp ? `<div class="warnbox">⚠ <b>KAATOKATSASTUS KRÄVS</b>: Bilen rullade (kaato) i förra heatet. Enligt Sääntökirja s. 12 måste bilen genomgå kaatokatsastus innan du får fortsätta tävlingen!
        <div class="row" style="margin-top:6px"><button class="btn small" data-act="ev-kaato">🔧 Rikta karossen & gör kaatokatsastus (40 €)</button></div></div>` : ''}
      ${ev.exhaustLoose ? `<div class="warnbox">⚠ <b>110 dB-REGELN</b>: Avgasröret har lossnat! Enligt Sääntökirja s. 4 ("jos autosta irtoaa pakoputki, on se kiinnitettävä ennen seuraavaa erää") måste det fästas före nästa heat.</div>` : ''}
      <div class="pills">
        <div><span>Startruta (${ev.rules.gridRows} led)</span><b>Ruta ${ev.grid + 1} av 6</b><small>${ev.rules.gridRows === 1 ? '1 led i bredd' : ev.grid < 3 ? 'Främre ledet' : 'Bakre ledet (7 m bakom)'}</small></div>
        <div><span>Distans & Lisälenkki</span><b>${ev.laps} varv</b><small>${ev.rules.joker ? 'Lisälenkki ska köras 1 gång' : 'Ingen lisälenkki i klassen'}</small></div>
        <div class="${ev.dmg > 65 || ev.exhaustLoose ? 'bad' : ''}"><span>Skador & Ljud</span><b>${Math.round(ev.dmg)} %</b><small>${ev.exhaustLoose ? 'Avgasrör löst (>110 dB)!' : ev.radLeak ? 'Kylaren läcker' : '≤110 dB OK'}</small></div>
        <div><span>Köpta lotter (Arpa 20 €)</span><b>${ev.arvat} st</b><small>${ev.rules.salePrice ? 'Kan skydda egen bil vid 850 €-lottning' : 'Ingen myyntivelvoite i Super'}</small></div>
      </div>
      <div class="row wrap">
        <button class="btn" data-act="ev-run" ${ev.needKaatoInsp || ev.exhaustLoose ? 'disabled' : ''}>🏁 Kör ut till keräily & start</button>
        ${cost > 0 ? `<button class="btn ghost" data-act="ev-repair" ${S.money >= cost ? '' : 'disabled'}>🔧 Laga & fäst avgasrör i depån (${eur(cost)})</button>` : ''}
        ${ev.rules.salePrice > 0 ? `<button class="btn ghost" data-act="ev-buy-arpa" ${S.money >= 20 ? '' : 'disabled'}>🎟 Köp arpa / lott (20 €)</button>` : ''}
        <button class="btn ghost danger" data-act="ev-quit">${ev.hist.length === 0 && ev.feePaid > 0 ? 'Bryt före 1:a heatet (få hyvityskuitti!)' : 'Avbryt dagen'}</button>
      </div></section>`;
  }
  return h;
}

function record(track, lap) { if (!S.records[track] || lap < S.records[track]) { S.records[track] = lap; save(); } }

function startRace(o) {
  const cs = activeCar(), insp = currentInsp(), s = insp.spec;
  const numStr = formatCarNum(cs.num, insp.cls);
  U.view = 'race'; document.body.classList.add('racing'); app().innerHTML = '';
  U.race = new Race(app(), {
    ...o, settings: S.settings,
    player: { name: `${S.name || 'Du'} (#${numStr})`, spec: s, paint: paintOf(cs.paint).rgb, bw: cs.bw || 'wb', aids: { ...S.aids } },
  });
}

// ---------- garage ----------
function statRows(s, k, k0) {
  const d = (a, b, dec = 0, inv) => { const x = a - b; return Math.abs(x) < 0.05 ? '' : `<em class="${(x > 0) !== !!inv ? 'up' : 'dn'}">${x > 0 ? '+' : '−'}${fmt(Math.abs(x), dec)}</em>`; };
  const e = engineAt(s, k.peakP.rpm);
  return `<table class="stats"><tr><td>Toppeffekt</td><td>${fmt(k.hp)} hk · ${fmt(k.peakP.P, 1)} kW @ ${fmt(k.peakP.rpm)} ${k0 ? d(k.hp, k0.hp) : ''}</td></tr>
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
  let h = `<section class="panel g-top"><div class="g-info"><span class="kick">${insp.rules.name.toUpperCase()} · #${numStr} · KATSASTUSKORTTI #${cs.katsastusNo || 104}</span><h1>${car.name}</h1>
      <p class="dim">${car.tag}. ${ok ? '<b class="okb">✓ KATSASTETTU & GODKÄND FÖR ' + insp.rules.short.toUpperCase() + '</b>' : '<b class="nob">✗ EJ GODKÄND I BESIKTNINGEN</b>'}</p>
      ${!ok ? `<div class="warnbox" style="margin:8px 0">${insp.issues.map(x => `• ${x}`).join('<br>')}</div>` : ''}
      ${pv ? `<div class="pvbox">Förhandsvisar <b>${pv.u.levels[pv.lvl - 1].name}</b> <button class="btn small ghost" data-act="pv-off">Stäng</button></div>` : ''}
      ${statRows(pv ? pv.s : s, pv ? pv.k : k, pv ? k : null)}
      <div class="row"><button class="btn" data-act="go" data-arg="trim">Trimma motorn →</button><button class="btn ghost" data-act="komp-open" data-arg="kaaret">Ritning: Turvakaaret →</button></div></div>
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
  h += `<section class="panel"><h2>Bilar (${CARS.length})</h2><p class="dim">Vetari = framhjulsdrift (etuveto), Kardaani = bakhjulsdrift (takaveto), Super = turbo/4WD/specialbyggen utan viktgräns och utan myyntivelvoite (850 €).</p><div class="cards cars">${CARS.map(c => {
    const own = S.cars[c.id], ss = own ? spec(c.id) : stockSpec(c.id), kk = curve(ss);
    return `<div class="card car ${S.active === c.id ? 'sel' : ''} ${own ? 'own' : ''}"><div class="c-top"><span>${CLASSES[c.cls].toUpperCase()} · ${fmt(c.Vd, 1)} L R${c.cyl}</span><b>${own ? (S.active === c.id ? 'VALD' : 'ÄGD') : eur(c.price)}</b></div>
      <strong>${c.name}</strong><em>”${c.nick}” – ${c.tag}</em><p>${c.desc}</p>
      <ul><li>${fmt(kk.hp)} hk · ${fmt(kk.peakT.T)} Nm</li><li>${fmt(ss.mass)} kg (reg. ${c.regMass} kg) · ${fmt(kk.kgHp, 1)} kg/hk</li><li>Varvgräns ${fmt(ss.redline)} rpm${c.boost ? ' · turbo ' + fmt(c.boost, 1) + ' bar' : ' · sugmotor'}</li></ul>
      ${own ? (S.active === c.id ? '' : `<button class="btn small" data-act="car-pick" data-arg="${c.id}">Välj bil</button>`) : `<button class="btn small" data-act="car-buy" data-arg="${c.id}" ${S.money >= c.price ? '' : 'disabled'}>Köp (${eur(c.price)})</button>`}</div>`;
  }).join('')}</div></section>`;

  // Lack & Tävlingsnummer (Kilpailunumerot s. 8)
  h += `<section class="panel"><h2>Lack & Kilpailunumerot (Takasivulasi ≥ 20 cm, fram-/bakruta ≥ 10 cm)</h2>
    <p class="dim">Enligt Sääntökirja s. 8 måste siffrorna vara <b>svarta på vit botten</b> eller <b>vita på svart botten</b> (inga undantag!) och placeras i <b>bakre sidorutorna</b> (nummer på dörren är förbjudet!). Super har <b>S</b>, Junior <b>J</b> och Lady <b>L</b> framför numret. På tävlingskontoret kostar stora siffror 2 €/st och små 1 €/st.</p>
    <div class="row wrap">${PAINTS.map(p => `<button class="swatch ${cs.paint === p.id ? 'on' : ''}" style="--c:${hex(p.rgb)}" data-act="paint" data-arg="${p.id}" title="${p.name}"></button>`).join('')}
    <span class="lbl">Nummer (${ CLASS_RULES[insp.cls]?.prefix || '1–999' })</span><input class="num" type="number" min="1" max="999" value="${cs.num}" data-in="num">
    <button class="chip s ${cs.bw !== 'bw' ? 'on' : ''}" data-act="num-bw" data-arg="wb">Svart på vit botten</button>
    <button class="chip s ${cs.bw === 'bw' ? 'on' : ''}" data-act="num-bw" data-arg="bw">Vit på svart botten</button></div></section>`;

  // Delar
  for (const u of UPG) {
    const lvl = cs.upg[u.id] || 0, hasTurbo = s.boost > 0;
    const isSuperCls = insp.cls === 'super' || insp.cls === 'supersenior';
    h += `<section class="panel"><h2>${u.name}</h2><div class="cards">${u.levels.map((L, i) => {
      const n = i + 1, own = lvl >= n, next = lvl === i, needTurbo = u.needsTurbo && !hasTurbo;
      const blockedByCls = (u.onlySuper || L.onlySuper) && !isSuperCls && !s.superReady;
      const blockedFwdDiff = u.rwdOrSuper && s.drv === 'fwd' && !isSuperCls && !s.superReady;
      return `<div class="card ${own ? 'own' : ''} ${lvl === n ? 'sel' : ''}"><div class="c-top"><span>NIVÅ ${n}</span><b>${own ? 'MONTERAD' : eur(L.price)}</b></div><strong>${L.name}</strong><p>${L.desc}</p>
        <div class="row">${own ? `<button class="btn small ghost" data-act="unmount" data-arg="${u.id}">Plocka av</button>` : needTurbo ? '<span class="lock">KRÄVER TURBO</span>' : blockedByCls ? '<span class="lock">KRÄVER SUPER-UTRUSTNING / SUPER ROCK</span>' : blockedFwdDiff ? '<span class="lock">ENDAST TAKAVETO ELLER SUPER ROCK</span>' : next ? `<button class="btn small" data-act="buy" data-arg="${u.id}" ${S.money >= L.price ? '' : 'disabled'}>Köp (${eur(L.price)})</button>` : `<span class="lock">KRÄVER NIVÅ ${i}</span>`}
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

// ---------- räknebänken ----------
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
  <section class="panel"><h2>Ljud</h2><label class="sl"><span>Motorljud <b>${st.vol} %</b></span><input type="range" min="0" max="100" step="5" value="${st.vol}" data-in="vol"></label></section>
  <section class="panel"><h2>Grafik</h2><div class="row">${[['hog', 'Hög'], ['lag', 'Låg']].map(q => `<button class="chip s ${st.quality === q[0] ? 'on' : ''}" data-act="quality" data-arg="${q[0]}">${q[1]}</button>`).join('')}</div><p class="dim">Låg ger färre träd, mindre damm och lägre upplösning – bra på äldre telefoner.</p></section>
  <section class="panel"><h2>Pekskärmskontroller</h2><div class="row">${[['auto', 'Auto'], ['on', 'På'], ['off', 'Av']].map(q => `<button class="chip s ${st.touch === q[0] ? 'on' : ''}" data-act="touch" data-arg="${q[0]}">${q[1]}</button>`).join('')}</div></section>
  <section class="panel"><h2>Sparning</h2><p class="dim">Pengar, bilar, delar, katsastuskortti, varningar och resultat sparas lokalt i webbläsaren.</p><div class="row"><button class="btn ghost danger" data-act="reset">Återställ sparning</button></div></section>`;
}

// ---------- händelser ----------
const ACT = {
  go(a) { U.view = a; U.preview = null; if (a === 'komp') U.kompOpen = null; window.scrollTo(0, 0); },
  aid(a) { S.aids[a] = S.aids[a] ? 0 : 1; save(); },
  'drv-cls'(a) { S.driverCls = a; save(); },
  'do-lippumies'() { S.lippumies = 0; S.warnings = 0; save(); toast('🚩 Du har stått flaggvakt en tävlingsdag (lippumiespesti) – du har nu tävlingsrätt igen!'); },
  'q-track'(a) { U.quick.track = a; }, 'q-laps'(a) { U.quick.laps = +a; }, 'q-opp'(a) { U.quick.opp = +a; },
  'q-joker'() { U.quick.joker = U.quick.joker ? 0 : 1; },
  'quick-race'() {
    const q = U.quick, insp = currentInsp(), li = Math.min(3, Math.max(0, Math.round((q.ai - 75) / 10)));
    startRace({
      trackId: q.track, laps: q.laps, opps: makeOpps(q.opp, li, q.ai / 100 * 0.98, insp.cls),
      grid: q.opp, gridRows: insp.rules.gridRows, useJoker: !!q.joker, sideContact: insp.rules.sideContact,
      title: `${insp.rules.name} – Träningsheat`, mode: 'heat', onDone: r => quickDone(r),
    });
    return false;
  },
  'quick-time'() {
    const q = U.quick;
    startRace({ trackId: q.track, laps: q.laps, opps: [], grid: 0, gridRows: 1, useJoker: false, title: 'Tidskörning', mode: 'time', onDone: r => quickDone(r, true) });
    return false;
  },
  'ev-start'(a) { evStart(a); window.scrollTo(0, 0); },
  'ev-run'() { evRun(); return false; },
  'ev-repair'() {
    const ev = U.ev, cost = Math.ceil(ev.dmg * 1.0 + (ev.radLeak ? 20 : 0) + (ev.exhaustLoose ? 15 : 0));
    if (S.money >= cost) { S.money -= cost; ev.dmg = 0; ev.radLeak = false; ev.exhaustLoose = false; save(); toast('Bilen är lagad och avgasröret fäst (≤110 dB).'); }
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
      // Enligt "MYYNTITILAISUUDESSA SAA POISTAA" behåller du stol, bälten, Nascar-verkko, batteri, spacers och däck (om standardhjul sätts på)
      const cs = activeCar();
      const keptTire = cs.upg.dack || 0, keptFjad = cs.upg.fjad || 0;
      cs.upg = {};
      if (keptTire) cs.upg.dack = keptTire;
      if (keptFjad) cs.upg.fjad = keptFjad;
      ev.saleMsg = `🔨 <b>Autojen myyntitilaisuus</b>: En annan förare vann lottningen och köpte din bil för <b>850 € kontant</b>! Du plockade ur kuppipenkki, bälten, Nascar-verkko, batteri, däck och spacers och satte in dem i en ny grundkaross i garaget.`;
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
  'car-buy'(a) {
    const c = carById(a);
    if (S.money >= c.price && !S.cars[a]) {
      S.money -= c.price;
      S.cars[a] = { build: {}, upg: c.cls === 'super' ? { superkit: 1 } : {}, paint: pick(PAINTS).id, num: 1 + Math.floor(Math.random() * 99), bw: 'wb', katsastusNo: 100 + Math.floor(Math.random() * 890), tune: defaultTune() };
      S.active = a; U.preview = null; save();
      toast(`${c.name} köpt. Bygg den enligt Sääntökirja 2026 för alkukatsastus.`);
      window.scrollTo(0, 0);
    }
  },
  'car-pick'(a) { if (S.cars[a]) { S.active = a; U.preview = null; save(); window.scrollTo(0, 0); } },
  paint(a) { activeCar().paint = a; save(); },
  'num-bw'(a) { activeCar().bw = a; save(); },
  buy(a) {
    const u = UPG.find(x => x.id === a), cs = activeCar(), lvl = cs.upg[a] || 0, L = u.levels[lvl];
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
  'dyno-check'() {
    const t = U.task; t.vals = [...document.querySelectorAll('[data-ans]')].map(i => i.value); const r = checkTask(t);
    if (r.all) { const n = S.dyno[U.taskDiff - 1], pay = n < 6 ? t.reward : Math.round(t.reward * 0.25); S.money += pay; S.dyno[U.taskDiff - 1]++; save(); U.taskMsg = `✓ Rätt! +${eur(pay)}`; } else U.taskMsg = 'Inte helt rätt – rätta svaren visas vid fälten. Ta en ny uppgift.';
  },
  quality(a) { S.settings.quality = a; save(); }, touch(a) { S.settings.touch = a; save(); },
  reset() { if (U.confirmReset) { reset(); U.confirmReset = false; toast('Sparningen är återställd.'); U.view = 'menu'; } else { U.confirmReset = true; toast('Tryck en gång till för att radera allt.'); setTimeout(() => U.confirmReset = false, 4000); } },
};

function quickDone(r, time) {
  if (isFinite(r.bestLap)) record(U.quick.track, r.bestLap);
  U.view = 'karriar';
  toast(time ? `Bästa varv ${fmtTime(r.bestLap)}` : `Du blev ${r.pos}:a${r.flag ? ' (' + r.flag + ')' : ''} · bästa varv ${fmtTime(r.bestLap)}`);
  render();
}

const INP = {
  'q-ai'(v) { U.quick.ai = +v; },
  num(v) { activeCar().num = Math.max(1, Math.min(999, Math.round(+v) || 1)); save(); return false; },
  name(v) { S.name = v.trim() || 'Du'; save(); return false; },
  lambda(v) { activeCar().tune.lambda = +v; save(); }, ign(v) { activeCar().tune.ign = +v; save(); }, finalScale(v) { activeCar().tune.finalScale = +v; save(); }, bias(v) { activeCar().tune.bias = +v; save(); },
  vol(v) { S.settings.vol = +v; save(); },
};

export function initUI() {
  document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el || el.disabled) return; const f = ACT[el.dataset.act]; if (!f) return; if (f(el.dataset.arg, el) !== false) render(); });
  document.addEventListener('change', e => { const el = e.target.closest('[data-in]'); if (!el) return; const f = INP[el.dataset.in]; if (f && f(el.value) !== false) render(); });
  document.addEventListener('input', e => { const el = e.target.closest('input[type=range][data-in]'); if (!el) return; const b = el.closest('label')?.querySelector('span b'); if (b && ['lambda', 'finalScale'].includes(el.dataset.in)) b.textContent = (+el.value).toFixed(2).replace('.', ','); });
  render();
}
