// Namnbyte och global topplista.
// (Del av menysystemet – se js/ui.js för render() och åtgärderna.)
import { TRACKS } from '../data.js';
import { fmt } from '../engine.js';
import { S, save } from '../state.js';
import { fmtTime } from '../race.js';
import { Board } from '../net.js';
import { U, esc, stats, toast } from './core.js';
import { render } from '../ui.js';

// ---------- byt namn ----------
export function nameView() {
  return `<section class="panel"><span class="kick">FÖRARE</span><h1>Byt namn</h1><p class="dim">Namnet visas i resultatlistor, online-rum och den globala topplistan.</p>
    <div class="row"><input class="on-in" id="newName" maxlength="18" value="${esc(S.name && S.name !== 'Du' ? S.name : '')}" placeholder="Ditt namn"><button class="btn" data-act="name-save">Spara</button></div></section>`;
}
// ---------- global topplista ----------
export const TOP = { board: null, sort: 'sec' };
export const pid = () => S.pid || (S.pid = 'p' + Math.random().toString(36).slice(2, 12), save(), S.pid);
export function myEntry() { const st = stats(); return { id: pid(), name: (S.name && S.name !== 'Du' ? S.name : 'Förare').slice(0, 18), sec: Math.round(st.sec), races: st.races, wins: st.wins, best: S.records || {}, t: Date.now() }; }
export function pushBoard() { try { if (!TOP.board) TOP.board = new Board(() => { if (U.view === 'top') render(); }); TOP.board.publish(myEntry()); } catch (e) { } }
export function topView() {
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
export const ACT_TOP = {
  'name-save'() { const v = document.getElementById('newName')?.value.trim(); if (v) { S.name = v.slice(0, 18); save(); pushBoard(); toast('Namnet är sparat.'); U.view = 'menu'; } },
  'top-sort'(a) { TOP.sort = a; },
};
