// Dagens utmaning: samma bana, bil, väder och tid på dygnet för alla spelare under ett dygn (finsk tid).
// Tidskörning på 2 varv i spec-bil – alla har exakt samma bil, så det är bara föraren som skiljer.
// Resultaten delas på en egen topplista per dag (DayBoard i net.js).
import { TRACKS, SURF } from '../data.js';
import { SPEC_CARS } from '../engine.js';
import { S, save } from '../state.js';
import { fmtTime } from '../race.js';
import { DayBoard } from '../net.js';
import { hash, mulberry } from '../gl.js';
import { U, esc, eur, toast, TOD, WEATHER } from './core.js';
import { startRace } from './tavling.js';
import { pid } from './top.js';
import { render } from '../ui.js';
import { achieve } from './prestationer.js';

export const DAY_PRIZE = 150, DAY_LAPS = 2;
export const today = () => { try { return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Helsinki' }); } catch (e) { return new Date().toISOString().slice(0, 10); } };
// Dagens upplägg räknas fram ur datumet – samma för alla spelare utan att någon server behövs
export function dayCfg(day = today()) {
  const r = mulberry(hash('rokkikraft-dag-' + day));
  const pick = a => a[Math.floor(r() * a.length) % a.length];
  const track = pick(TRACKS).id, cm = 1 + Math.floor(r() * 5) % 5;
  const weather = pick(['sol', 'sol', 'mulet', 'mulet', 'regn', 'dimma', 'sno']), tod = pick(['morgon', 'dag', 'dag', 'kvall', 'skymning']);
  return { day, track, cm, weather, tod, laps: DAY_LAPS };
}
const D = { board: null, day: '' };
function board() {
  const d = today();
  if (!D.board || D.day !== d) { try { D.board?.close(); } catch (e) { } D.day = d; try { D.board = new DayBoard(d, () => { if (U.view === 'dag') render(); }); } catch (e) { D.board = null; } }
  return D.board;
}
const mine = () => { const d = today(); if (S.daily?.day !== d) S.daily = { day: d, best: 0, tries: 0, paid: 0 }; return S.daily; };
const myName = () => (S.name && S.name !== 'Du' ? S.name : 'Förare').slice(0, 20);

export function dagView() {
  const c = dayCfg(), t = TRACKS.find(x => x.id === c.track), me = mine(), B = board(), list = B ? B.sorted() : [], myPos = list.findIndex(e => e.id === pid()) + 1;
  const w = (WEATHER.find(x => x[0] === c.weather) || WEATHER[0])[1], tod = (TOD.find(x => x[0] === c.tod) || TOD[1])[1];
  const left = (() => { const n = new Date(), h = new Date(n.toLocaleString('en-US', { timeZone: 'Europe/Helsinki' })), m = 24 * 60 - (h.getHours() * 60 + h.getMinutes()); return `${Math.floor(m / 60)} h ${m % 60} min`; })();
  return `<section class="panel dag"><span class="kick">DAGENS UTMANING · ${c.day}</span><h1>${esc(t.name)}</h1>
    <p>Samma upplägg för alla spelare i dag. Alla kör <b>samma spec-bil</b>, så det är bara du som avgör. Kör hur många gånger du vill – ditt bästa resultat räknas. Nytt upplägg om ${left}.</p>
    <div class="pills"><div><span>Bana</span><b>${esc(t.name.split(/\s[–-]\s/)[0])}</b><small>${SURF[t.surface].name}</small></div>
      <div><span>Bil</span><b>Spec ${c.cm}</b><small>Mazda 626 · ${SPEC_CARS[c.cm].hp} hk</small></div>
      <div><span>Väder</span><b>${w}</b><small>${tod}</small></div>
      <div><span>Format</span><b>${c.laps} varv</b><small>tidskörning, ensam på banan</small></div></div>
    <div class="pills"><div class="${me.best ? 'good' : ''}"><span>Ditt bästa i dag</span><b>${me.best ? fmtTime(me.best) : '–'}</b><small>${me.tries} försök${myPos ? ` · plats ${myPos} av ${list.length}` : ''}</small></div>
      <div><span>Belöning</span><b>${eur(DAY_PRIZE)}</b><small>${me.paid ? '✓ utbetald i dag' : 'första gången du går i mål i dag'}</small></div></div>
    <div class="row"><button class="btn" data-act="day-run">🏁 ${me.tries ? 'Försök igen' : 'Kör dagens utmaning'}</button></div></section>
  <section class="panel"><div class="lv-head"><h2>Dagens topplista</h2><span>${B && B.connected ? `● ansluten · ${list.length} förare` : '○ ansluter…'}</span></div>
    ${list.length ? `<table class="res"><tr><th>#</th><th>Förare</th><th>Tid (${c.laps} varv)</th><th>Bästa varv</th><th>Försök</th></tr>${list.slice(0, 50).map((e, i) => `<tr class="${e.id === pid() ? 'me' : ''}"><td>${i + 1}${i < 3 ? [' 🥇', ' 🥈', ' 🥉'][i] : ''}</td><td>${esc(e.name)}</td><td>${fmtTime(e.time)}</td><td>${e.best ? fmtTime(e.best) : '–'}</td><td>${e.tries}</td></tr>`).join('')}</table>`
      : '<p class="dim">Ingen har kört i dag ännu – bli först!</p>'}</section>`;
}

export function dayDone(r) {
  const me = mine(), row = r?.order?.find(o => o.isPlayer), t = row?.time;
  me.tries++;
  const fin = r?.finished && !r.flag && t > 5;
  let msg = fin ? `I mål på ${fmtTime(t)}` : 'Inte i mål – försök igen!';
  if (fin) {
    const better = !me.best || t < me.best; if (better) { me.best = t; msg += me.tries > 1 ? ' – nytt personbästa i dag! 🎉' : ''; }
    if (!me.paid) { me.paid = 1; S.money += DAY_PRIZE; msg += ` · +${eur(DAY_PRIZE)}`; }
    S.dayCount = (S.dayCount || 0) + (me.tries === 1 || !me.counted ? 1 : 0); me.counted = 1;
    if (better) board()?.publish({ id: pid(), name: myName(), time: Math.round(t * 1000) / 1000, best: isFinite(r.bestLap) ? Math.round(r.bestLap * 1000) / 1000 : 0, tries: me.tries, car: 'Spec ' + dayCfg().cm });
    achieve('day1'); if ((S.dayCount || 0) >= 5) achieve('day5');
    setTimeout(() => { const list = board()?.sorted() || []; if (list[0]?.id === pid() && list.length >= 3) { achieve('daytop'); render(); } }, 2500);
  }
  save(); toast(msg); U.view = 'dag'; render();
}

export const ACT_DAG = {
  'day-run'() {
    const c = dayCfg(), gk = 'dag|' + c.day;
    startRace({ trackId: c.track, laps: c.laps, opps: [], specLvl: c.cm, grid: 0, gridRows: 1, useJoker: false, title: `Dagens utmaning ${c.day}`, mode: 'time', weather: c.weather, tod: c.tod,
      ghost: S.ghosts?.[gk] || null, ghostKey: (U.lastGhostKey = gk),
      onDone: r => { if (r?.ghost) { const G = S.ghosts ||= {}, old = G[gk]; if (!old || r.ghost.t < old.t) G[gk] = { t: r.ghost.t, f: r.ghost.f }; for (const k of Object.keys(G)) if (k.startsWith('dag|') && k !== gk) delete G[k]; } dayDone(r); } });
    return false;
  },
};
