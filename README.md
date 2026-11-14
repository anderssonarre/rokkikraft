# Rokkikraft

Ett webbläsarspel om att bygga rokkiralli-bilar och köra heat – gjort i samma anda som Kolvkraft.

- **Bygg**: köp en bruksbil, strippa den, sätt in störtbur, stol och huvudströmbrytare så att den går igenom besiktningen.
- **Trimma**: insug, kam, avgas, turbo, intercooler, λ, tändläge, bränsle och utväxling. Motorn räknas med MEP-kedjan (FUELMEP → QMEP → IMEPg → BMEP).
- **Kör**: 3D-heat med sex bilar, lisälenkki, varningskoder och skador. En tävlingsdag går alkuerä → keräilyerä → last call → semi → finalstege med nousut.
- **Räkna**: räkneuppgifter som ger pengar, och ett kompendium som förklarar både formatet och tekniken.

## Köra lokalt

Inget byggsteg och inga beroenden. Starta en statisk server i mappen, t.ex. `python3 -m http.server`, och öppna `http://localhost:8000`.
(Att dubbelklicka på `index.html` fungerar inte, eftersom webbläsare inte laddar ES-moduler från `file://`.)

## Publicera på GitHub Pages

1. Lägg upp mappens innehåll i ett repo.
2. Settings → Pages → Source: *Deploy from a branch*, välj `main` och `/ (root)`.

## Styrning

W/↑ gas · S/↓ broms och back · A/D styr · Mellanslag handbroms · E/Q växla · C kamera · R återställ · P paus. Pekskärmsknappar visas automatiskt på mobil.

## Källor och förbehåll

Tävlingsorter, klasser, heatformat och varningskoder följer rokkirallins publicerade resultatblad. Banlayouter, bilprestanda, priser och alla motståndare är påhittade. Spelet är ett fristående hobbyprojekt.
