// Kompendium, inställningar och kontroller.
// (Del av menysystemet – se js/ui.js för render() och åtgärderna.)
import { CODES, MARKS, KOMP } from '../data.js';
import { S, save, reset } from '../state.js';
import { CAM_NAMES, DEFAULT_CAM } from '../race.js';
import { ACTIONS, binds, getPad, padName, isWheel, captureNext } from '../input.js';
import { U, toast } from './core.js';
import { render } from '../ui.js';

// ---------- kompendium (inklusive Kaaret-ritning!) ----------
export const kaaretSvg = () => `<svg viewBox="0 0 680 280" style="width:100%;max-width:680px;background:#141a20;border-radius:10px;border:1px solid rgba(255,255,255,.12);margin:10px 0">
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
export function komp() {
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
export function settings() {
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
export const keyName = c => c.replace(/^Key/, '').replace(/^Digit/, '').replace('Arrow', '').replace('Left', ' V').replace('Right', ' H').replace('Up', '↑').replace('Down', '↓').replace('Space', 'Mellanslag').replace('Escape', 'Esc').replace('Control', 'Ctrl');
export const padCode = c => !c ? '–' : c[0] === 'b' ? 'Knapp ' + c.slice(1) : 'Axel ' + c.slice(1);
export function controlsPanel() {
  const B = binds(S.settings), gp = getPad(), dev = isWheel(gp) ? 'wheel' : 'pad', cap = U.capture;
  const capBtn = (kind, a) => cap && cap.kind === kind && cap.a === a ? '<b class="cap">Tryck nu…</b>' : `<button class="btn small ghost" data-act="bind" data-arg="${kind}:${a}">Ändra</button>`;
  return `<section class="panel"><h2>Kontroller</h2>
    <p class="dim">${gp ? `Ansluten: <b>${padName(gp)}</b> <small>(${gp.id.slice(0, 60)})</small>` : 'Ingen handkontroll eller ratt hittad – anslut och tryck på en knapp (webbläsaren visar den först efter en knapptryckning).'} Tangentbord, PS4-handkontroll och ratt med pedaler fungerar samtidigt. Gas, broms, koppling, styrning och växling är separata funktioner.</p>
    <table class="stats ctl"><tr><th>Funktion</th><th>Tangentbord</th><th></th><th>${dev === 'wheel' ? 'Ratt & pedaler' : 'Handkontroll'}</th><th></th></tr>
    ${ACTIONS.map(([a, n]) => `<tr><td>${n}</td><td>${(B.key[a] || []).map(keyName).join(', ') || '–'}</td><td>${capBtn('key', a)}</td><td>${padCode(B[dev][a])}${dev === 'wheel' && B.wheelInv[a] ? ' (pedal)' : ''}</td><td>${capBtn(dev, a)}</td></tr>`).join('')}</table>
    <div class="row"><span class="lbl">Dödzon ${Math.round(B.dead * 100)} %</span><input type="range" min="0" max="0.25" step="0.01" value="${B.dead}" data-in="dead"><button class="btn small ghost" data-act="bind-reset">Återställ standard</button></div>
    <p class="dim">Tips: för pedaler som står på +1 när de är släppta – välj "Ändra" och tryck ner pedalen helt, så känner spelet av riktningen automatiskt.</p></section>`;
}
export const ACT_KOMP = {
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
  aid(a) { S.aids[a] = S.aids[a] ? 0 : 1; save(); },
  'komp-open'(a) { U.view = 'komp'; U.kompOpen = a || null; window.scrollTo(0, 0); },
  camera(a) { const camera = Number(a); if (Number.isInteger(camera) && CAM_NAMES[camera]) { S.settings.camera = camera; save(); } },
  softbody(a) { S.settings.softBody = a === '1'; save(); },
  tyremodel(a) { S.settings.tyreModel = a === '1'; save(); },
  mechdmg(a) { S.settings.mechDmg = a === "1"; save(); },
  quality(a) { S.settings.quality = a; save(); },
 res(a) { S.settings.res = a; save(); },
 touch(a) { S.settings.touch = a; save(); },
  reset() { if (U.confirmReset) { reset(); U.confirmReset = false; toast('Sparningen är återställd.'); U.view = 'menu'; } else { U.confirmReset = true; toast('Tryck en gång till för att radera allt.'); setTimeout(() => U.confirmReset = false, 4000); } },
};
