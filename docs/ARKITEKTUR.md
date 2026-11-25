# Rokkikraft – arkitektur

Spelet är en statisk webbsida utan byggsteg. Alla moduler är vanliga ES-moduler i `js/`, three.js r128 laddas som global `THREE` från `js/vendor/`. Varje system ligger i en egen fil och pratar med de andra genom tydliga funktioner – inget system läser ett annat systems interna tillstånd.

```
             data.js  (bilar, motorer, däck, klasser, banor, regler – bara data)
                │
   engine.js ◄──┴──► track.js ──► terrain.js
 (spec, MEP-motor,     (mittlinje, bredd, underlag,
  besiktning,           lisälenkki + portar, racinglinje,
  spec-bilar)           fartprofil)
        │                 │
        └──► race.js ◄────┘          input.js (tangentbord, handkontroll, ratt, pekskärm)
           (fysik, AI, regler,  ◄─── enginesound.js (motorljud), music.js
            kollisioner, skador,
            HUD, kameror)
               │
               ▼
          view3.js ──► gfx.js (grafiknivåer, texturer, himmel, gräs, spår)
          (3D-scen, bilar, kupé)
               ▲
   ui.js ──────┘  (menyer, garage, karriär, tävlingsdag)  ──► champ.js (heat/finaler)
     │                                                     ──► net.js   (online via MQTT)
     └──► state.js (sparning i localStorage)
```

| Fil | Ansvar |
|---|---|
| `data.js` | All speldata: `CARS`, `ENGINES`, `TYRES`, `UPG` (trimdelar), `BUILD`, `CLASS_RULES`, `TRACKS`. Ingen logik. |
| `engine.js` | `buildSpec(carId, carState, tune)` gör om data + uppgraderingar + inställningar till en fysikspec. `curve()` ger effekt/vridmoment. `checkInspection()` = besiktning. `specCar(1–5)` = gemensamma spec-bilar. |
| `track.js` | `getTrack(id)` bygger bangeometrin: mittlinje var 2:a m, bredd, underlag, lisälenkki (`joker`, med konportar `joker.gates`), `raceLine()` och `profile()`/`profileOn()` för AI:ns fart. |
| `race.js` | Klassen `Race` kör ett heat. Exporterar ren logik som även körs i node: `makeCar`, `phys` (bilfysik), `aiSetup`/`aiDrive` (AI), `trackStep` (bana/regler), `collide`. |
| (race.js forts.) | `AI_STYLES` = AI-förarnas körstilar (aggressiv/jämn/försiktig/vild, bestäms av namnet). `recTick`/`playReplay` spelar in och spelar upp repriser (20 bilder/s). Mekaniska skador i `partDamage`. |
| `softbody.js` | BeamNG-läge (tillval): `SoftBody` = nod-balk-nät (6×2×3 noder, 206 balkar) per kaross med plastisk deformation. `impact()` vid smällar, `step()` i fysiken, `disp()` deformerar 3D-modellen (`view3.softDeform`), `state()` ger hjulinställning/intryckning som styr mekaniska skador. |
| `view3.js` | 3D-scenen: terräng, skog, publik, bilar (`addCar`, `poseCar`, `damageCar`), kupé, väder, effekter. |
| `gfx.js` | Grafiknivåer Low–Ultra + Auto (dynamisk upplösning), procedurella PBR-texturer, himmel, gräs, däckspår. |
| `input.js` | Kontroller med ombindning, deadzone och styrkurvor för tangentbord, handkontroll, ratt och pekskärm. |
| `ui.js` | Alla menyer och tävlingsdagens flöde. Startar heat med `startRace(opts)`. |
| `champ.js` | Tävlingsformatet (alkuerä → … → finaler), används av både karriär och online. |
| `net.js` | `Room` (online-rum), `Board` (topplista), `Presence` (vilka som är online, inbjudningar). |

## Lägga till en bil

1. Lägg till bilen i `CARS` i `js/data.js` (id, namn, klass, drivning, vikt, motor-id, mått).
2. Om den har en ny motor: lägg till den i `ENGINES` (borr/slag, cylindrar, varvtal, MEP-värden).
3. Lägg till karossens mått i tabellen `BP` i `js/view3.js` (längd, bredd, höjd, hjulbas, överhäng, glaslinjer). Utan post används en standardkaross.
4. Kör `node tests/selftest.mjs` – testet bygger alla bilar och kontrollerar att effekt, massa och grepp är rimliga.

## Lägga till en bana

Lägg till banan i `TRACKS` i `js/data.js` (kontrollpunkter, bredd, underlag, lisälenkki). `track.js` bygger resten. Självtestet kontrollerar att AI:n kan köra två varv utan att fastna eller åka av.

## Test

```
node tests/selftest.mjs
```

Bygger alla bilar, spec-bilar och banor och låter AI:n köra två varv på varje bana i ren node (ingen webbläsare). Avslutar med felkod om något är fel. Kör det före varje commit.
