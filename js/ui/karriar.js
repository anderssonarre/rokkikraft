// Karriär, banval och banprofil.
// (Del av menysystemet – se js/ui.js för render() och åtgärderna.)
import { CLASSES, TRACKS, SURF, CAREER } from '../data.js';
import { carById } from '../engine.js';
import { S } from '../state.js';
import { getTrack } from '../track.js';
import { fmtTime } from '../race.js';
import { TOD, U, WEATHER, currentInsp, eur, levelOpen, levelPts } from './core.js';
import { sponsorPanel } from './garage.js';
import { carModeRow, champCfg } from './tavling.js';

// ---------- karriär & banprofil ----------
export function karriar() {
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
        <div class="row"><button class="btn" data-act="quick-race" ${ok ? '' : 'disabled'}>🏁 Starta träningsheat</button><button class="btn ghost" data-act="quick-time" ${ok ? '' : 'disabled'}>⏱ Tidskörning</button><button class="btn ghost" data-act="intro-run">🪪 Introduktion</button></div>
      </div>
      <div class="g-curve" style="display:flex;flex-direction:column;align-items:center">
        <canvas id="trkPreview" width="380" height="300" data-trk="${q.track}" style="background:#141a20;border-radius:10px;border:1px solid rgba(255,255,255,.1)"></canvas>
        <div class="legend" style="margin-top:6px"><i style="background:#d9b88c"></i>Grus (sora)<i style="background:#7d8b99"></i>Asfalt (kestopäällyste)<i style="background:#ff3b2f"></i>Sakkolenkki</div>
      </div>
    </div></section>`;

  return h;
}
export function careerLevels(insp, rules) {
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
export function drawTrackPreview(cv, trackId) {
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
