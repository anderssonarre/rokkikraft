// Prestationer: små mål som ger pengar och syns i en egen vy. Sparas i S.ach = { id: tidsstämpel }.
// Vissa låses upp av händelser (achieve('id')), andra räknas fram ur sparad statistik (checkAch()).
import { TRACKS } from '../data.js';
import { S, save } from '../state.js';
import { LESSONS } from '../motorskola.js';
import { U, eur, stats } from './core.js';

const SK_GOAL = 5;
const skOk = () => LESSONS.reduce((a, l) => a + (S.skola?.[l.id]?.ok || 0), 0);
// [id, ikon, namn, beskrivning, belöning €, (valfritt) framsteg () => [nu, mål]]
export const ACH = [
  ['intro', '🪪', 'Körkort', 'Klara introduktionen för nya förare', 100],
  ['first', '🏁', 'Första heatet', 'Kör ditt första heat', 50, () => [stats().races, 1]],
  ['win1', '🥇', 'Första segern', 'Vinn ett heat', 150, () => [stats().wins, 1]],
  ['win10', '🏆', 'Segermaskin', 'Vinn 10 heat', 500, () => [stats().wins, 10]],
  ['clean', '✨', 'Utan en skråma', 'Vinn ett heat med under 5 % skador', 250],
  ['joker10', '🃏', 'Jokerkungen', 'Ta jokern rätt 10 gånger', 300, () => [S.jokers || 0, 10]],
  ['tracks', '🗺️', 'Alla banor', 'Kör minst ett heat på varje bana', 400, () => [Object.keys(stats().tracks || {}).length, TRACKS.length]],
  ['hour', '⏱️', 'En timme på banan', 'Kör sammanlagt 1 timme', 300, () => [Math.floor((stats().sec || 0) / 60), 60]],
  ['champ', '👑', 'Mästare', 'Vinn A-finalen i en karriärtävling', 600],
  ['service', '🔧', 'Depåmekaniker', 'Gör 3 jobb under samma servicepaus', 150],
  ['photo', '📸', 'Fotograf', 'Spara en bild i fotoläget', 100],
  ['day1', '📅', 'Dagens förare', 'Gå i mål i dagens utmaning', 100],
  ['day5', '🗓️', 'Trogen', 'Kör dagens utmaning 5 olika dagar', 400, () => [S.dayCount || 0, 5]],
  ['daytop', '⚡', 'Dagens snabbaste', 'Ligg 1:a på dagens topplista (minst 3 förare)', 500],
  ['online1', '🌐', 'Online-debut', 'Kör ett race online', 100],
  ['season', '🏅', 'Säsongsmästare', 'Vinn en online-säsong', 600],
  ['skola5', '🎓', 'Plugghäst', '5 rätt i Motorskolan', 150, () => [skOk(), 5]],
  ['skolaAll', '📐', 'Motoringenjör', `${SK_GOAL} rätt i alla ${LESSONS.length} lektioner`, 800, () => [LESSONS.filter(l => (S.skola?.[l.id]?.ok || 0) >= SK_GOAL).length, LESSONS.length]],
  ['exam', '📝', 'Godkänd', 'Minst 5 av 6 rätt i provläget', 300, () => [S.skola?.best || 0, 5]],
  ['rich', '💰', 'Tjock plånbok', 'Ha 10 000 € på kontot', 200, () => [Math.floor(S.money), 10000]],
];
const byId = Object.fromEntries(ACH.map(a => [a[0], a]));
export const hasAch = id => !!S.ach?.[id];
// Lås upp en prestation (en gång): belöning + toast. Renderar inte själv.
export function achieve(id) {
  const a = byId[id]; if (!a || hasAch(id)) return false;
  (S.ach ||= {})[id] = Date.now(); S.money += a[4]; save();
  (U.achQ ||= []).push(`${a[1]} <b>${a[2]}</b> · +${eur(a[4])}`); return true;
}
// Gå igenom alla prestationer som har ett mätbart mål
export function checkAch() { for (const a of ACH) if (a[5] && !hasAch(a[0])) { const [n, g] = a[5](); if (n >= g) achieve(a[0]); } }
// Efter varje lopp (anropas från countRace)
export function achRace(res) {
  if (!res) return;
  if (res.pos === 1 && res.finished && !res.flag && (res.dmg || 0) < 5) achieve('clean');
  const me = res.order?.find(o => o.isPlayer); if (me?.jokerLap && res.finished && !res.flag) { S.jokers = (S.jokers || 0) + 1; save(); }
  checkAch();
}
export function prestView() {
  checkAch(); const n = ACH.filter(a => hasAch(a[0])).length;
  return `<section class="panel"><span class="kick">PRESTATIONER</span><h1>${n} / ${ACH.length} upplåsta</h1>
    <div class="xpbar"><i style="width:${n / ACH.length * 100}%"></i></div>
    <div class="achs">${ACH.map(([id, ico, name, d, rw, pr]) => { const on = hasAch(id), p = pr && !on ? pr() : null;
      return `<div class="ach ${on ? 'on' : ''}"><span class="ai">${on ? ico : '🔒'}</span><div><b>${name}</b><small>${d}</small>
        ${p ? `<div class="xpbar s"><i style="width:${Math.min(100, p[0] / p[1] * 100)}%"></i></div><small class="dim">${Math.min(p[0], p[1])} / ${p[1]}</small>` : ''}
        ${on ? `<small class="ok">✓ ${new Date(S.ach[id]).toLocaleDateString('sv-SE')}</small>` : ''}</div><span class="rw">${eur(rw)}</span></div>`; }).join('')}</div></section>`;
}
