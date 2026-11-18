# Rokkikraft grafikmotor

Grafiken i körläget och garaget. Spelmekaniken (fysik, AI, skador som värden, växellådor, regler) ligger i `js/` och påverkas inte av något här: grafiken läser bara bilarnas position, vinklar, hjulspinn, skadevärde och partiklar från `js/race.js`.

## 1. Analys av den befintliga motorn (utgångsläge)

| System | Var | Hur det fungerade |
|---|---|---|
| Rendering | `js/view3.js` (`View3`) | three.js **r128** som global `THREE` (`js/vendor/three.min.js`), en `WebGLRenderer` (WebGL2 när den finns), ingen efterbehandling |
| Scen, kamera, ljus | `View3`-konstruktorn | gradienthimmel (shader), hemisfärsljus + riktat solljus med en skuggkarta som följer bilen, dimma per väder |
| Kameror | `js/race.js` (`render()`) | sex vyer (nuvarande, bakom nära/högt, förarplats, in-car kupé, TV); kameralogiken skickar `eye/at/up/fov` till `View3.frame()` |
| Bilar | `View3.addCar()` | procedurella karosser per bilmodell (`STYLE`), dekor, skador som vertexbucklor (`damageCar`), kaross i fjädrad grupp (krängning/nickning) |
| Kupé | `js/gl.js` (`cockpitMesh`, `steerWheelMesh`) + `buildCockExtra` | egen scen som ritas ovanpå världen |
| Terräng/bana | `js/terrain.js` (höjder) + `View3.buildTerrain/buildTrack` | höjdfält med vallar, vägremsor med hörnfärg per underlag |
| Vegetation/objekt | `buildForest`, `buildProps`, `buildDetails` | instansierade träd, skyltar, publik, byggnader |
| Väder/partiklar | `View3` + `race.particlesStep` | regn/snö som punkter, damm/rök som punkter |
| Inställningar | `js/ui.js` + `S.settings` | kvalitet, upplösning |
| Fysik ↔ grafik | `race.render()` → `View3.poseCar()` / `frame()` | envägs: fysiken skriver, grafiken läser |

## 2. Arkitektur

`View3` är kvar som **scenhanterare och kompatibilitetslager**: race.js, garaget och alla kameror anropar samma metoder som förut (`addCar`, `poseCar`, `damageCar`, `frame`, `mark`, `resize`, `dispose`). Nya system ligger i moduler som `View3` använder:

```
graphics/
├── core/
│   ├── GraphicsSettings.js    profiler Low/Medium/High/Ultra + Auto (en källa för alla kvalitetsval)
│   ├── PerformanceManager.js  dynamisk upplösning (Auto) + utvecklarläge (F3 / ?dev): FPS, frame time, draw calls, trianglar, minne
│   └── ResourceManager.js     frigör geometrier/material/texturer/render targets när ett heat stängs; delade cachar skyddas
├── lighting/
│   └── EnvironmentLighting.js himmel → PMREM-miljökarta (diffust himmelsljus + reflexer på alla PBR-material)
├── environment/
│   └── VegetationSystem.js    gräs-tuvor (alfa-kort, instansierade i rutor)
├── vehicles/
│   └── VehicleMaterials.js    billack (klarlack), väderpåverkan på material, skadeextra (trasiga lampor)
├── effects/
│   ├── PostProcessing.js      HDR-mål → SSAO → bloom → komposit (ACES, GTA IV-gradering per väder, vinjett) → FXAA
│   └── TrackMarks.js          däckspår (ringbuffer, instansierade)
└── assets/
    ├── TextureManager.js      procedurella PBR-texturer (grus/asfalt/is/terräng: färg, normal, råhet), cachade
    └── ModelLoader.js         GLB/glTF-pipeline för riktiga bilmodeller (se assets/MODELLSTANDARD.md)
```

Moduler från den föreslagna strukturen som **inte** skapats som egna filer (för att undvika tomma skal eller dubbla system): Renderer/SceneManager (= `View3`), Shadow/Lighting (i `View3` + EnvironmentLighting), Terrain/Road/WorldObjects (`View3.build*`), kameror (i `race.js`, oförändrade tangentbindningar), VehicleRenderer/Animations/Interior (`addCar`, `poseCar`, `buildCockExtra`), ParticleSystem (`race.particlesStep` + punktshaders i `View3`). De kan brytas ut stegvis när de växer.

`js/gfx.js` finns kvar som kompatibilitetslager som exporterar vidare från `graphics/`.

## 3. Vad som är implementerat och testat

Testat i headless Chrome (SwiftShader, mjukvarurendering) på alla fyra nivåer, alla väder och alla sex kameror, garaget och en riktig GLB-fil (testmodell, ej incheckad). Inga JavaScript-fel.

- **Efterbehandling (Medium+)**: scenen ritas linjärt till ett half-float-mål med djuptextur. SSAO från djupbufferten (High: 8 prover, halv upplösning; Ultra: 12 prover, 75 %), bloom på kvarts upplösning, ACES-tonemapping (samma kurva som three.js), GTA IV-inspirerad färggradering per väder (dämpad mättnad, varma högdagrar/kalla skuggor i sol, gråblått i regn, platt i dimma), vinjett, FXAA. AO läggs inte på kupén.
- **PBR och miljöljus**: miljökarta från himlen (PMREM) på Medium+, vägen med normal-, råhets- och färgkarta, PBR-terräng på High+, billack med klarlack, blankare väg/lack/glas i regn.
- **Skuggor**: skuggkarta 1024–4096 px beroende på nivå, mjuka kanter på High+, skuggavstånd per nivå. Kontaktskugga under bilarna förstärks av SSAO.
- **Vegetation**: skog i rutor med frustum-culling och LOD (detaljerade träd nära, enkla koner långt bort), stam + barrvåningar sammanslagna till en geometri, färgvariation per träd, gräs-tuvor 0–14 000.
- **Effekter**: dammoln med mjuk textur som växer och bromsas, grusstänk med tyngdkraft, däckspår (grus, sladd, asfalt, is), motorrök vid skada (fanns), trasiga lampor vid skada > 40 %.
- **Kupé**: visare som följer fart/varvtal/temperatur, smutsig vindruta med torkarbågar och stenskott.
- **Prestanda**: draw calls sänkta från ~750 till ~580 (High, Tammisaari, 6 bilar) genom sammanslagning av statiska bildelar, hjuldelar och banobjekt per material. Auto-läge med dynamisk upplösning och inlärd nivå. GPU-minne frigörs mellan heat.
- **Modellpipeline**: `assets/models/manifest.json` + GLB-laddning, lackmaterial byts mot spelarens färg, namngivna hjul animeras. Testad med en egen testmodell.

## 4. Begränsningar och vad som kräver externa resurser

- **Inga riktiga högdetaljerade bilmodeller ingår.** Projektet har inga licensierade GLB-bilar och de kan inte laddas ner från den här miljön. Bilarna är fortfarande de procedurella modellerna – de motsvarar inte GTA IV-nivå. Pipelinen är klar: lägg in modeller enligt `assets/MODELLSTANDARD.md`.
- **Inga fototexturer.** Alla texturer genereras procedurellt. Riktiga PBR-texturer (grus, asfalt, bark, löv) skulle ge störst skillnad efter bilmodellerna.
- **three.js är kvar på r128.** En uppgradering (r150+) kräver ES-moduler i stället för global `THREE`, nya färghanteringsregler och omskrivning av alla egna shaders; det är ett eget steg. r128 har WebGL2 som standard.
- **Ej implementerat ännu**: cascaded shadow maps, motion blur, depth of field, dynamisk tid på dygnet, vattenstänk/lerpartiklar som egna typer, terräng-LOD, spruckna rutor.
- **Prestandan är inte mätt på riktig hårdvara.** Headless-testerna renderar på CPU och säger inget om FPS. Använd F3 i spelet för att se FPS, draw calls och minne.

## 5. Så lägger man till …

- **en bilmodell**: se `assets/MODELLSTANDARD.md` och `assets/models/manifest.json`.
- **en grafiknivåparameter**: lägg fältet i `PRESETS` (GraphicsSettings.js) och läs `this.P.<fält>` i `View3`.
- **en efterbehandlingseffekt**: lägg ett pass i `PostProcessing` (render target + ShaderMaterial), anropa det i `end()` och lägg en flagga i `PRESETS`.
- **ett material**: lägg en fabriksfunktion i `VehicleMaterials.js` eller en texturgenerator i `TextureManager.js` (cacha och `markShared`).
- **ett miljöobjekt**: lägg det i `View3.buildProps/buildDetails`; statiska meshar slås ihop automatiskt per material (`mergeStatic`), instansierade objekt ska ha `frustumCulled = false` eller en egen begränsningssfär.
