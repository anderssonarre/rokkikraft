// Introduktion för nya förare: ett guidat övningsvarv (gas, broms, styrning, handbroms, kamera, jokern, utanför vägen, mål).
// Själva stegen och kontrollerna finns i race.js (INTRO); här startas varvet och resultatet tas om hand.
import { S, save } from '../state.js';
import { U, toast } from './core.js';
import { startRace } from './tavling.js';
import { render } from '../ui.js';
import { achieve } from './prestationer.js';

export const introBanner = () => S.introDone ? '' : `<section class="panel introban"><div><span class="kick">NY HÄR?</span><h2>Kör introduktionen – 2 minuter</h2>
  <p class="dim">Ett guidat övningsvarv som visar gas, broms, styrning, handbroms, kamerorna och jokern. Ger prestationen <b>Körkort</b>.</p></div>
  <div class="row"><button class="btn" data-act="intro-run">🪪 Starta introduktionen</button><button class="btn ghost small" data-act="intro-skip">Hoppa över</button></div></section>`;

export const ACT_INTRO = {
  'intro-run'() {
    U.introStep = 0;
    startRace({ trackId: 'tammisaari', laps: 2, opps: [], specLvl: 1, grid: 0, gridRows: 1, useJoker: true, title: '🪪 Introduktion', mode: 'time', weather: 'sol', tod: 'dag', intro: true,
      onIntro: (i, n) => { U.introStep = i; U.introN = n; },
      onDone: r => {
        const all = U.introN && (U.introStep >= U.introN || (U.introStep >= U.introN - 1 && r?.finished)); // sista steget = gå i mål
        if (all) { S.introDone = 1; save(); achieve('intro'); toast(U.toast || '🪪 Introduktionen klar – välkommen till rokkirallyt!'); }
        else toast(`Du kom till steg ${Math.min((U.introStep || 0) + 1, U.introN || 8)} av ${U.introN || 8}. Kör introduktionen igen när du vill – den finns under Spela.`);
        U.view = 'menu'; render();
      } });
    return false;
  },
  'intro-skip'() { S.introDone = 1; save(); },
};
