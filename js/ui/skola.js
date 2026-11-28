// Motorskola (motorteknik med formelpappret) och räknebänken.
// (Del av menysystemet – se js/ui.js för render() och åtgärderna.)
import { engineAt, fmt } from '../engine.js';
import { S, save } from '../state.js';
import { newTask, checkTask } from '../dyno.js';
import { LESSONS, lessonTask, ownTask, checkAnswers } from '../motorskola.js';
import { U, esc, eur, spec } from './core.js';

// ---------- räknebänken ----------
// ---------- Motorskola: övning 1–4 i motorteknik ----------
export const SK_GOAL = 5;
/* spara inskrivna svar innan vyn ritas om (byte av sida/zoom i formelpappret) */
export function keepVals() { const t = U.exam ? U.exam.tasks[U.exam.i] : U.skTask; if (t && !t.done) t.vals = t.asks.map((_, i) => document.getElementById('ska' + i)?.value ?? t.vals?.[i] ?? ''); }
export const SHEET = 'assets/motorteknik/';
export function theoryRows(th) { return th.map(([n, f, d, ref]) => { const pg = /sida (\d)/.exec(ref || '')?.[1];
  return `<tr><td><b>${n}</b>${d ? `<br><small class="dim">${d}</small>` : ''}${ref ? `<br><button class="chip s ref" data-act="sk-sheet" data-arg="${pg || 1}" title="Öppna formelpappret">📄 ${ref}</button>` : ''}</td><td class="f">${f}</td></tr>`; }).join(''); }
export const sheetBtn = (pg = 1, txt = '📄 Formelpappret') => (U.lesson || U.exam) && U.view === 'skola' ? `<button class="btn small ${U.side ? '' : 'ghost'}" data-act="sk-side" data-arg="${pg}">${U.side ? '📄 Dölj formelpappret' : '📄 Formelpappret bredvid'}</button>` : `<button class="btn small ghost" data-act="sk-sheet" data-arg="${pg}">${txt}</button>`;
export function skCards(ls, K) { return `<div class="cards">${ls.map(l => { const ok = K[l.id]?.ok || 0; return `<button class="card lesson" data-act="sk-open" data-arg="${l.id}"><strong>${l.title}</strong><p class="dim">${l.short}</p>
      <div class="xpbar"><i style="width:${Math.min(100, ok / SK_GOAL * 100)}%"></i></div><small>${ok >= SK_GOAL ? '✓ Klar' : `${ok}/${SK_GOAL} rätt`}</small></button>`; }).join('')}</div>`; }
export function skola() {
  const inner = skolaInner(); if (!(U.side && (U.lesson || U.exam))) return inner;
  return `<div class="split"><div class="split-l">${inner}</div><aside class="split-r">${sidePane()}</aside></div>`;
}
export function sidePane() {
  const pg = U.fPage || 1, z = U.fZoom || 1;
  return `<div class="side-bar">${[1, 2, 3].map(i => `<button class="chip s ${pg === i ? 'on' : ''}" data-act="sk-sheet" data-arg="${i}">Sida ${i}</button>`).join('')}
    <button class="chip s" data-act="sk-zoom" data-arg="-1">−</button><small class="dim">${Math.round(z * 100)} %</small><button class="chip s" data-act="sk-zoom" data-arg="1">+</button>
    <button class="chip s" data-act="sk-side" title="Stäng formelpappret">✕</button></div>
    <div class="sheet-view side" id="sideSheet"><img src="${SHEET}sida-${pg}.jpg" alt="Formelpapper sida ${pg}" style="width:${z * 100}%"></div>`;
}
export function skolaInner() {
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
/* klottruta: varje rad räknas ut som på en miniräknare (komma som decimal, ^, π, √(), ln(), log()) */
export function calcLine(line) {
  let x = line.split(/[=:]/).pop().trim(); if (!x) return '';
  x = x.replace(/(\d),(\d)/g, '$1.$2').replace(/(\d)\s+(?=\d)/g, '$1').replace(/[·×]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/\^/g, '**')
    .replace(/π|pi/gi, '(P)').replace(/sqrt|√/gi, 'S').replace(/ln/gi, 'L').replace(/log/gi, 'G');
  if (!/^[0-9.+\-*/()\sPSLGe]*$/.test(x) || !/\d|P/.test(x)) return '';
  try { const r = Function('P', 'S', 'L', 'G', `"use strict";return (${x})`)(Math.PI, Math.sqrt, Math.log, Math.log10); return typeof r === 'number' && isFinite(r) ? '= ' + String(+r.toPrecision(6)).replace('.', ',') : ''; } catch (e) { return ''; }
}
export const calcOut = txt => txt.split('\n').map(calcLine).join('\n');
export const curTask = () => U.exam ? U.exam.tasks[U.exam.i] : U.skTask;
export function taskHtml(t) {
  const sc = t.scratch || '';
  return `<h3>${t.title}</h3><table class="stats given">${t.given.map(g => `<tr><td>${g[0]}</td><td>${g[1]}</td></tr>`).join('')}</table>
    <div class="scratch"><small class="dim">✏️ Klottruta – räkna här. Varje rad räknas ut till höger, t.ex. <code>ṁf = 1600/0,43/42700*3600</code> (komma eller punkt, ^ för potens, π, √( ), ln( ))</small>
      <div class="scr-wrap"><textarea id="skscr" class="scr-in" rows="${Math.max(4, sc.split('\n').length + 1)}" wrap="off" spellcheck="false" autocomplete="off" placeholder="Skriv dina uträkningar…">${esc(sc)}</textarea><pre class="scr-out" id="skscrOut" aria-live="polite">${esc(calcOut(sc))}</pre></div></div>
    <div class="asks">${t.asks.map((a, i) => `<label class="${t.marks ? (t.marks[i] ? 'right' : 'wrong') : ''}"><span>${a.label}</span><input type="text" inputmode="decimal" id="ska${i}" data-ans="${i}" value="${t.vals?.[i] ?? ''}" ${t.done ? 'disabled' : ''}>${t.done && !t.marks[i] ? `<small>Rätt: ${fmt(a.answer, a.dec ?? 2)}</small>` : ''}</label>`).join('')}</div>`;
}
export function myEngineTask(lesson) { const s = spec(), rpm = Math.round((3000 + Math.random() * (s.redline - 3500)) / 250) * 250, e = engineAt(s, rpm); /* olika varvtal varje gång */ return ownTask(lesson, s, e, s.fuel); }
export function examView() {
  const E = U.exam, t = E.tasks[E.i], sec = Math.floor((Date.now() - E.t0) / 1000);
  if (E.i >= E.tasks.length) { const sc = E.score; const K = S.skola; if (K.best == null || sc > K.best) { K.best = sc; save(); }
    return `<section class="panel"><h1>Provet klart!</h1><p class="big">${sc}/6 rätt på ${Math.floor(sec / 60)} min ${sec % 60} s</p><p>${sc >= 5 ? 'Riktigt bra – du är redo för tentan! 💪' : sc >= 3 ? 'Bra jobbat – repetera de övningar där det blev fel.' : 'Gå igenom lektionerna och de lösta exemplen och försök igen.'}</p>
      <div class="row"><button class="btn" data-act="sk-exam">Nytt prov</button><button class="btn ghost" data-act="sk-back">Till Motorskolan</button></div></section>`; }
  return `<section class="panel"><span class="kick">PROVLÄGE · UPPGIFT ${E.i + 1}/6 · ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}</span><h2>${LESSONS[t.lesson - 1].title}</h2>${taskHtml(t)}
    <div class="row">${t.done ? '<button class="btn" data-act="sk-xnext">Nästa →</button>' : '<button class="btn" data-act="sk-xcheck">Svara</button>'}<button class="btn ghost" data-act="sk-back">Avbryt</button>${sheetBtn(1)}</div>
    ${t.done && t.why ? `<p class="dim">Lösning: ${t.why}</p>` : ''}<p class="dim">Poäng hittills: ${E.score}</p></section>`;
}
export function formel() {
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
export function dyno() {
  if (!U.task) U.task = newTask(U.taskDiff); const t = U.task, left = Math.max(0, 6 - S.dyno[U.taskDiff - 1]);
  return `<section class="panel"><span class="kick">MÄTDATA FRÅN GARAGET</span><h1>Räknebänken</h1><p class="dim">Räkna ut det som efterfrågas. Tolerans 2 %. Decimaltal skrivs med komma eller punkt.</p>
    <div class="row">${[1, 2, 3].map(d => `<button class="chip s ${U.taskDiff === d ? 'on' : ''}" data-act="dyno-diff" data-arg="${d}">Svårighet ${d}</button>`).join('')}</div>
    <h2>${t.title}</h2><table class="stats given">${t.given.map(g => `<tr><td>${g[0]}</td><td>${g[1]}</td></tr>`).join('')}</table>
    <div class="asks">${t.asks.map((a, i) => `<label class="${t.marks ? (t.marks[i] ? 'right' : 'wrong') : ''}"><span>${a.label}</span><input type="text" inputmode="decimal" data-ans="${i}" value="${t.vals?.[i] ?? ''}" ${t.done ? 'disabled' : ''}>${t.done && !t.marks[i] ? `<small>Rätt svar: ${fmt(a.answer, a.dec ?? 2)}</small>` : ''}</label>`).join('')}</div>
    ${t.hint ? `<p class="dim">Tips: ${t.hint}</p>` : ''}
    <div class="row"><button class="btn" data-act="dyno-check" ${t.done ? 'disabled' : ''}>Kontrollera</button><button class="btn ghost" data-act="dyno-new">Ny uppgift</button>${t.komp ? `<button class="btn ghost" data-act="komp-open" data-arg="${t.komp}">Formeln i kompendiet</button>` : ''}</div>
    <p class="${U.taskMsg.startsWith('✓') ? 'okbox' : U.taskMsg ? 'warnbox' : 'dim'}">${U.taskMsg || `Belöning ${eur(t.reward)}. ${left ? `Full belöning: ${left} lösningar kvar på svårighet ${U.taskDiff}.` : 'Du har löst många på den här nivån – belöningen är nu 25 %.'}`}</p></section>`;
}
export const ACT_SKOLA = {
  'dyno-diff'(a) { U.taskDiff = +a; U.task = newTask(+a); U.taskMsg = ''; },
 'dyno-new'() { U.task = newTask(U.taskDiff); U.taskMsg = ''; },
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
};
