# Rokkikraft

Ett webbläsarspel om att bygga rokkiralli-bilar och köra heat enligt **Rokkiralli Ry Sääntökirja (21.04.2026)**, **Säännöt ja luokka esittelyt** samt **Kaaret-ritningarna** – gjort i samma anda som Kolvkraft.

- **Bygg & Besikta (Alkukatsastus)**: Rensa lampor/plast, behåll förardörren olättad med ≥0,5 mm dörrplåt (≥20 popnit/skruv), svetsa godkända **turvakaaret** (min 42×2,5 mm bockade eller 48×2,5 mm svetsade böjar, 100 % svetsfog, 200×200×3 mm golvplattor, två dörrsträvor i förardörren), sätt in kuppipenkki, 4-punktsbälte (6-punkts i Super), nackskydd, **Nascar-verkko**, **keulan vahvistus** innanför rambenen (max 60×60×3 mm), **pohjapanssari** med minst 2 st M10-bultar och tävlingsnummer i bakre sidorutorna (≥20 cm, ej på dörren!). Kombibilar kan kapas enligt regeln för *farmariauton typistys*.
- **Klasser (`Vetari`, `Kardaani`, `Super`, `Junior`, `Lady`, `Senior`, `Super Senior`)**:
  - **Vetari & Kardaani**: Turbo och lustgas förbjudna, lukkoperä endast tillåten på bakhjulsdrivna bilar, gatgodkända sommardäck / rallydubbdäck vinter, max 1 800 kg tjänstevikt, start från 2 led (7 m mellanrum), min 2 varv utan lisälenkki, myyntivelvoite (850 €) från semifinal.
  - **Super Rock**: Turbo tillåtet, ingen viktgräns, lukkoperä även på framhjulsdrivna bilar, rallydäck och slicks tillåtna, Super-kaaret (8 karossfästen & takkryss), 6-punktsbälte, sidospeglar, `S`-nummer, start från 1 led, min 3 varv + lisälenkki, sidokontakt förbjuden (A3), ingen myyntivelvoite.
- **Trimma**: Insug, kam, avgas (max **110 dB @ 4 500 rpm**, avgasrör bakom B-stolpen), turbo & intercooler (Super), λ, tändläge, bränsle och utväxling. Motorn räknas med MEP-kedjan (FUELMEP → QMEP → IMEPg → BMEP).
- **Banor**:
  - **Tammisaari – Grabbskogin Rata (Tenholantie 416, E-TMK/UA)**: Ca 800 m moturs med 3 asfalterade partier (startrakan `L → 7`, norra kurvan vid post `3` och västra hårnålen före post `5`), samt Sakkolenkki vid post `6` runt ön `D` före mållinjen `M`.
  - **Rantasalmi (RUA, Joroistentie 314)**: Strax under 1 km (~950 m), banbredd **12 m (smalast) – 22 m (bredast)**, asfalterat startområde (`L`) som övergår i grus före domartornet (`tuomaritorni`) samt asfalterad S-kurva mellan post `5.` och `6.` (totalt **235 m kestopäällyste** i ett 2-varvs heat) och U-formad Sakkolenkki runt post `3.`.
- **Domslut, målgångsordning & myyntitilaisuus**:
  - Målgångsordning enligt Sääntökirja s. 14: **Felfria → `Li` (missad lisälenkki / vält kon) → `Vi` (tjuvstart) → `K`/`KA` (brutit/rullat) → Sanktionerade (`A1–B9`, först varnad blir allra sist) → `P`**.
  - 3 varningar = **Hylky** (0 p för dagen) + **Lippumiespesti** (1 helgs avstängning). Ren tävling nollställer varningslistan. Skriftlig protest vid STOP-märket kostar 50 €.
  - **Autojen myyntitilaisuus (850 €)** med lotter (`arpa` 20 €/st).

## Köra lokalt

Inget byggsteg och inga beroenden. Starta en statisk server i mappen, t.ex. `npx serve` eller `python -m http.server 8000`, och öppna `http://localhost:8000`.

## 3D-grafik, terräng och statistik

- 3D-vyn ritas med [three.js r128](https://threejs.org) (MIT), som ligger med i repot under `js/vendor/` – inget byggsteg och inget CDN behövs.
- Banorna är kuperade. Höjdskillnaden per bana följer banfakta där den är känd (Kouvola 20 m, Pihtipudas liten); övriga är antagna, och kullarnas exakta läge är genererat – det finns ingen uppmätt höjddata i spelet.
- Däcken slits (mest av sladd, hjulspinn och låsning, mer på asfalt än på grus) och slitna däck ger sämre grepp. Slitaget följer med mellan heaten under en tävlingsdag och däcken kan bytas i depån.
- Lobbyn visar körtid, antal körda heat och bästa varv per bana. Statistiken sparas lokalt i webbläsaren.
- Upplösningen på 3D-vyn väljs under Inställningar (Auto, 1440p, 1080p, 720p, 540p).


## Uppdatering: utvecklingslistan (november 2026)

- **Huvudmeny:** Spela, Online, Karriär, Garage, Inställningar, Byt namn, Global topplista (+ Trimning, Kompendium, Räknebänken).
- **Startbilar (gratis):** Mazda 626 1989 (2,0 R5, 150 hk, 998 kg, FWD), VW Passat 3,0 V6 (260 hk, 1 455 kg, RWD), Ford Mondeo ST220 (3,0 V6, 220 hk, 1 400 kg, FWD).
- **Motoralternativ:** 0,9 R3 35 hk … 5,2 V8 589 hk. Garaget visar hk, volym, cylindrar, ventiler, vikt, effekt/vikt och beräknad 0–100 (simulerad med bilens egen fysik).
- **Bilinställningar (gratis):** fjädring, dämpare, camber, toe fram/bak, markfrigång fram/bak, bakvagnens höjd, växellåda, slutväxel, bromskraft/balans, fälg 20–60 cm, däckbredd 5–60 cm, däck (Standard, Westlake, CrossClimate, CrossClimate Plus). Chiptrim 329 €. Lätta bilar har en liten kurvfördel (lastkänslighet).
- **Kontroller:** tangentbord, PS4-handkontroll och ratt/pedaler (Gamepad API). Gas, broms, koppling, styrning och växling är separata och kan bindas om under Inställningar.
- **AI:** 1–100 % svårighet (1 % ≈ 4–5 min/varv), bilar byggs med spelarens inställningar och effekten skalas mot spelarens bil.
- **Mästerskap (karriär och online):** 4–8 förare per start, Alkuerä (1–2 → semi), Keräilyerä (1–2 → semi), Last Call (vinnaren → semi), semifinal (plats 1–6 → A–F-final), finaler F → A där topp 3 går upp. KESKÖIDÄ i Alkuerä och Keräilyerä. Förare med straff går inte vidare direkt. Last Call-förlorare slås ut.
- **Straff:** EJ AJA LISÄLENKKI (missad jokerlap), A6 (hård kollision i hög fart), LI (tjuvstart).
- **Priser:** vanligt lopp 60/35/20/15/9/4 €, mästerskapets slutplacering enligt A-finalens tabell (350 € / 25 p … 25 € / 1 p) för förare som nått en final.
- **Resultattabell** efter varje lopp med bästa varv (lila = snabbast), total tid, jokervarv, avstånd och tid till bilen framför, straff, pris och poäng.
- **Online:** rumskod, bana, väder, 1–100 varv, upp till 30 AI, AI-svårighet, 4–8 per start, startlistor, samtidiga heat, åskådarläge (E/Q byter bil, C kamera).
- **Global topplista:** speltid, lopp, segrar och bästa varv per bana – sparas som "retained" meddelanden hos de publika MQTT-mäklarna (ingen egen server). Kan försvinna om mäklarna rensar data.
- **Skador:** bucklor och mattare lack, rök från motorn, skramlande motorljud, sämre grepp/styrning. Ljud för däck/underlag och kollisioner.
- **Väder:** sol, mulet, regn, dimma, snöfall – påverkar sikt och grepp.

### Ekonomi (från 16.11.2026)
Man börjar med 5 000 € och en Mazda 626 i originalskick (inte rensad, ingen bur). Bygget till alkukatsastus kostar ca 865 € (rensning 40 €, turvakaaret 450 €, kuppipenkki & bälten 280 €, Nascar-nät 45 €, katsastus & kortti 50 €). Alla myyntiluokka-bilar kostar 850 € och köps tävlingsklara, Super-bilar 3 200–19 500 €. Delar har ungefärliga verkliga priser (begagnat/egen montering i Finland), t.ex. chiptrim 329 €, programmerbart sprut 1 200 €, hybridturbo 1 800 €, fyrhjulsdrift 4 500 €, 5,2 V8 4 500 €. Däcksats 240–420 €, nya fälgar 220 €. Justeringar (camber, toe, fjädring, höjd, bromsbalans, utväxlingsspridning) är gratis.
- **Gul flagg:** När en bil spinner (glider tvärs eller baklänges, står vänd åt fel håll eller står still på banan) viftar lippupisteen före bilen med gul flagg. Från den posten fram till bilen gäller max **45 km/h inom 5 s** och **ingen omkörning**. Bryter man mot det blir det varning **B1** (saktar inte in), **B3** (omkörning) eller **B4** (kontakt). AI-förarna följer samma regel.
- **Motorljud:** varje motortyp har eget ljud byggt på verklig tändföljd: R3, R4, R5 (1-2-4-5-3), rak sexa, V6, korsplans-V8 och flatplans-V8.
