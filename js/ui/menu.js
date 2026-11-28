// Huvudmenyn.
// (Del av menysystemet – se js/ui.js för render() och åtgärderna.)
import { KOMP } from '../data.js';
import { curve, carById, fuelById, fmt, formatCarNum } from '../engine.js';
import { S, activeCar } from '../state.js';
import { LESSONS } from '../motorskola.js';
import { currentInsp, esc, eur, hex, paintOf, plate, topLevel } from './core.js';
import { ON } from './online.js';
import { statsPanel, xpPanel } from './tavling.js';
import { introBanner } from './intro.js';
import { today } from './dag.js';
import { ACH, hasAch } from './prestationer.js';
import { fmtTime } from '../race.js';

// ---------- meny ----------
export function menu() {
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
    ${introBanner()}${xpPanel()}${statsPanel()}
    <nav class="mgrid">
      ${btn('play', '🏁', 'Snabbstart', 'Spela', 'Välj bana, varv, väder och AI – kör direkt', 'c1')}
      ${btn('online', '🌐', ON.room ? `Rum ${ON.room.code}` : 'Rumskod', 'Online', 'Skapa eller gå med i rum och kör mot kompisar', 'c5')}
      ${btn('stad', '🏙️', S.city?.earned ? `${eur(S.city.earned)} tjänat` : 'Ny!', 'Stadskörning', 'Fri körning i stan med utmaningar som ger pengar', 'c3')}
      ${btn('dag', '📅', S.daily?.day === today() && S.daily.best ? '✓ ' + fmtTime(S.daily.best) : 'Ny i dag', 'Dagens utmaning', 'Samma bana, bil och väder för alla – egen topplista', 'c1')}
      ${btn('prest', '🏅', `${ACH.filter(a => hasAch(a[0])).length}/${ACH.length}`, 'Prestationer', 'Mål som ger pengar – vinn rent, jokern, alla banor …', 'c2')}
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
