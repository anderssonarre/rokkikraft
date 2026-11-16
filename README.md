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
