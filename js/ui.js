// Alla menyvyer + tävlingsdagens logik enligt ROKKIRALLI RY SÄÄNTÖKIRJA (21.04.2026).
// Styrning: render(), knapparnas åtgärder (ACT) och reglage (INP). Vyerna ligger i js/ui/*.js.
import { TYRES, CAREER } from './data.js';
import { formatCarNum } from './engine.js';
import { S, save, activeCar } from './state.js';
import { cleanCode } from './net.js';
import { Showroom } from './view3.js';
import { MUSIC } from './music.js';
import { U, app, currentInsp, eur, paintOf, toast, topLevel } from './ui/core.js';
import { ACT_GARAGE, carShop, drawCurve, garage, glbUpload, setup, trim } from './ui/garage.js';
import { drawTrackPreview, karriar } from './ui/karriar.js';
import { ACT_KOMP, komp, settings } from './ui/komp.js';
import { menu } from './ui/menu.js';
import { ACT_ONLINE, ON, inviteBox, netMe, online, startPresence } from './ui/online.js';
import { ACT_SKOLA, calcOut, curTask, dyno, formel, skola } from './ui/skola.js';
import { ACT_TAVLING, champCfg, eventView, result } from './ui/tavling.js';
import { ACT_TOP, nameView, topView } from './ui/top.js';
import { ACT_DAG, dagView } from './ui/dag.js';
import { checkAch, prestView } from './ui/prestationer.js';
import { ACT_INTRO } from './ui/intro.js';

// ---------- ram ----------
export function render() {
  const racing = U.view === 'race'; document.body.classList.toggle('racing', racing);
  if (racing) { MUSIC.stop(); return; } try { checkAch(); } catch (e) { } MUSIC.vol = (S.settings.music ?? 40) / 100; MUSIC.play(); // bakgrundsmusik i menyerna
  let V = { menu, karriar, play: karriar, event: eventView, garage, trim, dyno, skola, formel, komp, settings, online, setup, result, name: nameView, top: topView, dag: dagView, prest: prestView }[U.view] || menu;
  if (!activeCar() && !['menu', 'komp', 'settings', 'name', 'top'].includes(U.view)) V = carShop; // ingen bil → bara bilhandeln
  const ae = document.activeElement, keep = ae && ae.id && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') && ae.type !== 'range' && ae.type !== 'file' ? { id: ae.id, v: ae.value, a: ae.selectionStart, b: ae.selectionEnd } : null; // behåll det man skriver när sidan ritas om
  const ss = document.getElementById('sideSheet'), ssPos = ss && [ss.scrollLeft, ss.scrollTop, U.fPage, U.fZoom];
  app().innerHTML = `<header class="topbar">${U.view !== 'menu' && U.view !== 'event' ? '<button class="back" data-act="go" data-arg="menu">‹ Meny</button>' : '<span class="brand">ROKKI<b>KRAFT</b></span>'}
    <span class="top-title">${{ karriar: 'Karriär & Banor', event: 'Tävlingsdag', garage: 'Garage & Besiktning', trim: 'Trimning', dyno: 'Räknebänken', skola: 'Motorskola', formel: 'Formelpapper', komp: 'Kompendium & Sääntökirja', dag: 'Dagens utmaning', prest: 'Prestationer', settings: 'Inställningar', setup: 'Bilinställningar', result: 'Resultat', play: 'Spela', name: 'Byt namn', top: 'Global topplista', karriar: 'Karriär', online: 'Online – rumskod' }[U.view] || ''}</span>
    <span class="wallet">${S.warnings > 0 ? `<i style="color:#ff6a3d">⚠ ${S.warnings}/3 varningar</i>` : ''}${S.vouchers > 0 ? `<i style="color:#5ce080">🎟 ${S.vouchers} hyvityskuitti</i>` : ''}<b>${eur(S.money)}</b><i>${CAREER[topLevel()].name}</i></span></header>
    <main class="view v-${U.view}">${V()}</main>${U.toast ? `<div class="toast">${U.toast}</div>` : ''}${U.achQ?.length ? `<div class="toast achtoast"><span>🏆 PRESTATION UPPLÅST${U.achQ.length > 1 ? ` (+${U.achQ.length - 1} till)` : ''}</span><div>${U.achQ[0]}</div></div>` : ''}${inviteBox()}`;
  if (ssPos && ssPos[2] === U.fPage && ssPos[3] === U.fZoom) { const n = document.getElementById('sideSheet'); if (n) { n.scrollLeft = ssPos[0]; n.scrollTop = ssPos[1]; } }
  { const cb = document.getElementById('chatBox'); if (cb) cb.scrollTop = cb.scrollHeight; }
  if (keep) { const el = document.getElementById(keep.id); if (el) { el.value = keep.v; el.focus(); try { el.setSelectionRange(keep.a, keep.b); } catch (e) { } } }
  if (U.toast) { clearTimeout(U.toastT); U.toastT = setTimeout(() => { U.toast = ''; document.querySelector('.toast:not(.achtoast)')?.remove(); }, 2800); }
  if (U.achQ?.length && !U.achT) U.achT = setTimeout(() => { U.achT = 0; U.achQ.shift(); if (U.view !== 'race') render(); }, 3200);
  after();
}
export function after() {
  const cv = document.getElementById('curve'); if (cv) drawCurve(cv);
  const tm = document.getElementById('trkPreview'); if (tm) drawTrackPreview(tm, tm.dataset.trk);
  const sr = document.getElementById('showroom');
  if (sr) { try { SR ??= new Showroom(); if (SR.ok) { const cs = activeCar(), sp = currentInsp().spec;
    SR.setCar({ model: S.active, body: sp.body, paint: paintOf(cs.paint).rgb, num: formatCarNum(cs.num, currentInsp().cls), bw: cs.bw || 'wb', bars: sp.dmg < 1, mirrors: currentInsp().cls === 'super', glbv: U.glbV || 0 }); SR.mount(sr); } else sr.parentElement.style.display = 'none'; } catch (e) { sr.parentElement.style.display = 'none'; } }
}
export let SR = null;
// ---------- händelser ----------
// Knapparnas åtgärder: allmänna här, resten i respektive vy-modul (js/ui/*.js)
export const ACT = {
  go(a) { U.view = a; U.preview = null; if (a === 'komp') U.kompOpen = null; if (a === 'online' && ON.room) ON.room.setMe(netMe()); window.scrollTo(0, 0); },
  ...ACT_KOMP, ...ACT_ONLINE, ...ACT_TAVLING, ...ACT_TOP, ...ACT_GARAGE, ...ACT_SKOLA, ...ACT_DAG, ...ACT_INTRO,
};
export const INP = {
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
  document.addEventListener('input', e => { if (e.target.id !== 'skscr') return; const t = curTask(), el = e.target; if (t) t.scratch = el.value;
    const o = document.getElementById('skscrOut'); if (o) o.textContent = calcOut(el.value); el.rows = Math.max(4, el.value.split('\n').length + 1); o && (o.scrollTop = el.scrollTop); });
  document.addEventListener('scroll', e => { if (e.target.id === 'skscr') { const o = document.getElementById('skscrOut'); if (o) o.scrollTop = e.target.scrollTop; } }, true);
  document.addEventListener('input', e => { const el = e.target.closest('input[type=range][data-in]'); if (!el) return; const b = el.closest('label')?.querySelector('span b'); if (b && ['lambda', 'finalScale'].includes(el.dataset.in)) b.textContent = (+el.value).toFixed(2).replace('.', ','); });
  if (S.econReset) { delete S.econReset; save(); toast('Ny ekonomi: du börjar om med 5 000 € och en Mazda 626 i originalskick. Namn, statistik och rekord är kvar.'); }
  try { const c = cleanCode(new URLSearchParams(location.search).get('rum')); if (c.length === 4) { ON.code = c; U.view = 'online'; } } catch (e) { }
  render();
}
