// Stadskörning: menyvyn och start/slut av själva körningen (js/city.js).
import { S, save, activeCar } from '../state.js';
import { carById } from '../engine.js';
import { manifest } from '../../graphics/assets/ModelLoader.js';
import { U, app, currentInsp, esc, eur, paintOf, toast } from './core.js';
import { render } from '../ui.js';
import { achieve } from './prestationer.js';
import { City } from '../city.js';
import { formatCarNum } from '../engine.js';

export function stadView() {
  const st = S.city || {}, car = carById(S.active), insp = currentInsp();
  return `<section class="panel stad"><span class="kick">FRI KÖRNING</span><h1>Stadskörning</h1>
    <p>Kör fritt runt i stan med <b>${esc(car.name)}</b>. Kör in i de färgade pelarna för att starta utmaningar som ger pengar:</p>
    <div class="achs">
      <div class="ach on"><span class="ai">🏁</span><div><b>Stadsrace</b><small>5–7 kontrollpunkter mot klockan – följ pilen</small></div></div>
      <div class="ach on"><span class="ai">📸</span><div><b>Fartkamera</b><small>Passera kameran i minst den angivna farten</small></div></div>
      <div class="ach on"><span class="ai">🌀</span><div><b>Driftzon</b><small>Sladda så mycket du kan inom ringen i 30 s</small></div></div>
      <div class="ach on"><span class="ai">📦</span><div><b>Leverans</b><small>Kör paketet till porten i tid – skador drar av på lönen</small></div></div></div>
    <p class="dim">Det finns trafik i stan – krockar ger skador men inga reparationskostnader. R ställer bilen på vägen, C byter kamera, P pausar.</p>
    <div class="pills"><div><span>Tjänat i stan totalt</span><b>${eur(st.earned || 0)}</b></div><div><span>Klarade utmaningar</span><b>${st.done || 0}</b></div><div><span>Körtid i stan</span><b>${Math.round((st.sec || 0) / 60)} min</b></div></div>
    <div class="row"><button class="btn" data-act="city-go">🚗 Kör ut i stan</button><button class="btn ghost" data-act="go" data-arg="garage">Byt bil i garaget</button></div></section>`;
}

export async function startCity() {
  const cs = activeCar(), insp = currentInsp(), ids = Object.keys((await manifest()).cars || {});
  // trafiken använder de lättaste modellerna (små filer laddar snabbt även på mobilen)
  const LIGHT = ['mondeo', 'civic', 'saab9000', 'starlet_super', 'passat_rx', 'v343', 'sierra'];
  const traffic = LIGHT.filter(i => ids.includes(i)).sort(() => Math.random() - 0.5);
  U.view = 'race'; document.body.classList.add('racing'); window.scrollTo(0, 0); render();
  const st = (S.city ||= { earned: 0, done: 0, sec: 0 });
  U.city = new City(app(), {
    spec: insp.spec, name: S.name || 'Du', paint: paintOf(cs.paint).rgb, bw: cs.bw || 'wb', num: formatCarNum(cs.num, insp.cls), model: S.active, body: insp.spec.body,
    aids: { ...S.aids }, settings: S.settings, traffic,
    onEarn: (eur_) => { S.money += eur_; st.earned += eur_; st.done++; save(); if (st.done >= 10) achieve('city10'); },
    onEvent: k => { achieve('city1'); if (k === 'speed120') achieve('cityspeed'); },
    onExit: sum => { st.sec += sum.sec; save(); U.city = null; document.body.classList.remove('racing'); U.view = 'stad'; toast(sum.earned ? `Du tjänade ${eur(sum.earned)} i stan!` : 'Välkommen tillbaka från stan.'); render(); },
  });
}
export const ACT_STAD = { 'city-go'() { startCity(); return false; } };
