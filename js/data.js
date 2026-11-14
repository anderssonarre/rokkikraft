// Rokkikraft – speldata. Tävlingsorter, klasser, heatformat och varningskoder följer
// rokkirallins egna resultatblad; banlayouter, priser och bildata är spelets egna.

export const CARS = [
  { id: 'sunny', name: 'Nissan Sunny 1.6', nick: 'Nisukka', cls: 'vetari', body: 'hatch', price: 0,
    Vd: 1.6, cyl: 4, redline: 6500, rc: 9.5, etaPeak: 0.86, peakRpm: 4200, mass: 940, wb: 2.43, front: 0.61,
    final: 4.06, gears: [3.33, 1.96, 1.29, 0.93, 0.73], CdA: 0.66, cool: 40, boost: 0,
    tag: 'Balanserad nybörjarbil',
    desc: 'Lätt, snäll och nästan omöjlig att ha sönder. Köpt färdigbyggd av grannen – störtbur och stol sitter redan i.' },
  { id: 'kadett', name: 'Opel Kadett 2.0', nick: 'Kadetti', cls: 'vetari', body: 'hatch', price: 350,
    Vd: 2.0, cyl: 4, redline: 6300, rc: 9.2, etaPeak: 0.87, peakRpm: 3800, mass: 965, wb: 2.52, front: 0.62,
    final: 3.74, gears: [3.55, 1.95, 1.28, 0.89, 0.71], CdA: 0.64, cool: 45, boost: 0,
    tag: 'Vridmoment ur varje kurva',
    desc: 'Större slagvolym ger direkt mer moment (T = BMEP·Vd/4π). Drar starkt redan från 3 000 rpm, men framdäcken får jobba.' },
  { id: 'civic', name: 'Honda Civic 1.6 VTi', nick: 'Hondis', cls: 'vetari', body: 'hatch', price: 700,
    Vd: 1.6, cyl: 4, redline: 8000, rc: 10.2, etaPeak: 0.93, peakRpm: 6100, mass: 930, wb: 2.57, front: 0.60,
    final: 4.40, gears: [3.23, 2.10, 1.46, 1.11, 0.85], CdA: 0.62, cool: 52, boost: 0,
    tag: 'Högvarvig kurvmaskin',
    desc: 'Fyllnadsgraden toppar först vid 6 000 rpm. Tom i botten, vass på toppen – håll varvet uppe och växla sent.' },
  { id: 'mondeo', name: 'Ford Mondeo 2.5 V6', nick: 'Mönde', cls: 'vetari', body: 'sedan', price: 950,
    Vd: 2.5, cyl: 6, redline: 6800, rc: 9.7, etaPeak: 0.89, peakRpm: 4600, mass: 1240, wb: 2.70, front: 0.63,
    final: 3.82, gears: [3.42, 2.14, 1.45, 1.03, 0.77], CdA: 0.68, cool: 64, boost: 0,
    tag: 'Tung men stark V6',
    desc: 'Mest effekt bland vetarna, men 300 kg tyngre än en Sunny. Kräver strippning för att kg/hk ska bli bra.' },
  { id: 'v343', name: 'Volvo 343 2.0', nick: 'Variomatic-kusinen', cls: 'kardaani', body: 'hatch', price: 300,
    Vd: 2.0, cyl: 4, redline: 6200, rc: 9.3, etaPeak: 0.85, peakRpm: 3700, mass: 1010, wb: 2.40, front: 0.52,
    final: 3.64, gears: [3.71, 2.16, 1.37, 1.00, 0.83], CdA: 0.70, cool: 44, boost: 0,
    tag: 'Kardaaniklassens instegsbil',
    desc: 'Transaxel bak ger bra viktfördelning. Bakhjulsdrift betyder sladd på gasen – perfekt på grus, lurig på is.' },
  { id: 'sierra', name: 'Ford Sierra 2.0', nick: 'Sirkka', cls: 'kardaani', body: 'sedan', price: 500,
    Vd: 2.0, cyl: 4, redline: 6400, rc: 9.4, etaPeak: 0.87, peakRpm: 4100, mass: 1040, wb: 2.61, front: 0.53,
    final: 3.62, gears: [3.65, 1.97, 1.37, 1.00, 0.82], CdA: 0.66, cool: 48, boost: 0,
    tag: 'Klassisk bakhjulsdrivare',
    desc: 'Lång hjulbas gör sladden lugn och lätt att hålla. Tacksam grund för både sugmotor- och turbobyggen.' },
  { id: 'bmw325', name: 'BMW 325i', nick: 'Bemari', cls: 'kardaani', body: 'sedan', price: 1000,
    Vd: 2.5, cyl: 6, redline: 6900, rc: 9.8, etaPeak: 0.91, peakRpm: 4800, mass: 1170, wb: 2.70, front: 0.51,
    final: 3.45, gears: [4.20, 2.49, 1.66, 1.24, 1.00], CdA: 0.65, cool: 68, boost: 0,
    tag: 'Rak sexa, jämn kraft',
    desc: 'Sexcylindrig sugmotor med bred momentkurva och 50/50-balans. Svetsad diff gör den till en riktig gruskanon.' },
  { id: 'v940', name: 'Volvo 940 Turbo', nick: 'Tegelsten', cls: 'kardaani', body: 'wagon', price: 1300,
    Vd: 2.3, cyl: 4, redline: 6000, rc: 8.5, etaPeak: 0.87, peakRpm: 3900, mass: 1330, wb: 2.77, front: 0.54,
    final: 3.73, gears: [4.03, 2.16, 1.37, 1.00, 0.82], CdA: 0.74, cool: 62, boost: 0.5, ic: 0.6, boostStart: 2200, boostFull: 3400,
    tag: 'Fabriksturbo och överlägset moment',
    desc: 'Har laddtryck redan från start. Tung, men låg kompression (8,5:1) tål mycket mer tryck innan det knackar.' },
];

export const CLASSES = { vetari: 'Vetari', kardaani: 'Kardaani' };

// Bygget: det som krävs för att bilen ska gå igenom besiktningen.
export const BUILD = [
  { id: 'strip', name: 'Strippa inredningen', price: 0, kg: -70,
    desc: 'Baksäte, mattor, klädsel och isolering ut. Gratis – kostar bara en kväll i garaget. Måste göras före buren.' },
  { id: 'cage', name: 'Störtbur', price: 180, kg: 42, req: 'strip',
    desc: 'Svetsad bur skyddar vid kaato (rullning). +42 kg, men utan bur ingen start.' },
  { id: 'seat', name: 'Skålad stol & fyrpunktsbälte', price: 110, kg: -6, req: 'strip',
    desc: 'Håller föraren på plats när det smäller i dörren.' },
  { id: 'switch', name: 'Huvudströmbrytare', price: 30, kg: 0,
    desc: 'Funktionärerna ska kunna bryta strömmen utifrån.' },
];

export const UPG = [
  { id: 'insug', name: 'Insug', komp: 'fyllnadsgrad', levels: [
    { name: 'Öppet sportfilter', price: 40, fx: { eta: 0.025 }, desc: 'Mindre strypning före spjället. Fyllnadsgraden ηV stiger ett par procent i hela registret.' },
    { name: 'Portat insug', price: 160, fx: { eta: 0.055, peak: 250 }, desc: 'Slipade kanaler och större spjällhus. ηV +5,5 % och toppen flyttas 250 rpm uppåt.' } ] },
  { id: 'kam', name: 'Kamaxel', komp: 'fyllnadsgrad', levels: [
    { name: 'Sportkam', price: 140, fx: { eta: 0.02, peak: 600, red: 400 }, desc: 'Längre öppettider flyttar ηV-toppen +600 rpm och höjer varvgränsen 400 rpm. P = T·ω ökar på höga varv.' },
    { name: 'Racekam & hårdare ventilfjädrar', price: 380, fx: { eta: 0.04, peak: 1100, red: 800, low: 0.05 }, desc: 'ηV-toppen +1 100 rpm och varvgränsen +800 rpm. Sämre fyllnad i botten – motorn vill varvas.' } ] },
  { id: 'avgas', name: 'Avgas', komp: 'pumpforlust', levels: [
    { name: 'Rakt rör', price: 50, fx: { pmep: 0.6, eta: 0.015 }, desc: 'Ljuddämparen bort. Lägre mottryck pe minskar pumpförlusten PMEP = pe − pi. Hörs till nästa kommun.' },
    { name: 'Grenrör 4-2-1', price: 220, fx: { pmep: 0.4, eta: 0.035 }, desc: 'Avstämda rörlängder hjälper till att tömma cylindern. PMEP −60 % och bättre fyllnad.' } ] },
  { id: 'turbo', name: 'Turbo', komp: 'turbo', levels: [
    { name: 'Skrotturbo 0,4 bar', price: 250, fx: { boost: 0.4, bs: 2800, bf: 4000 }, desc: 'Begagnad turbo från skroten. Högre insugstryck pi ger tätare luft och större FUELMEP. Trycket byggs från 2 800 rpm.' },
    { name: 'Större turbo 0,8 bar', price: 550, fx: { boost: 0.8, bs: 3200, bf: 4400 }, desc: 'Dubbla laddtrycket. Laddluften blir het (T2) – intercooler och fetare blandning behövs för knackmarginalen.' },
    { name: 'Hybridturbo 1,2 bar', price: 1000, fx: { boost: 1.2, bs: 3600, bf: 5000 }, desc: 'Mest effekt, mest värme, mest knackrisk. Kräver E85 eller sänkt tändläge och en kylare som orkar.' } ] },
  { id: 'ic', name: 'Intercooler', komp: 'turbo', needsTurbo: true, levels: [
    { name: 'Luft-luftkylare', price: 150, fx: { ic: 0.6 }, desc: 'Verkningsgrad ε = 0,6. Kallare laddluft Ti ger högre densitet ρi och bättre knackmarginal.' },
    { name: 'Stor frontmonterad', price: 380, fx: { ic: 0.82 }, desc: 'ε = 0,82: laddluften kommer nära utetemperatur. Sitter utsatt – skydda fronten.' } ] },
  { id: 'styr', name: 'Motorstyrning', komp: 'tandning', levels: [
    { name: 'Justerbar tändning', price: 90, fx: { ignMax: 10 }, desc: 'Tändläget kan ställas upp till +10° i Trimning (annars +5°).' },
    { name: 'Chip med knackreglering', price: 300, fx: { ignMax: 10, knockCtl: 1 }, desc: 'Knackgivaren backar tändningen automatiskt så att marginalen hålls ≥ 0. Kostar lite verkningsgrad, sparar kolvar.' } ] },
  { id: 'kyl', name: 'Kylning', komp: 'kylning', levels: [
    { name: 'Större kylare', price: 90, fx: { cool: 16 }, desc: 'Kylkapacitet +16 kW vid 100 °C. Värmeflödet HTMEP till kylvattnet är detsamma, men bortförs snabbare.' },
    { name: 'Kylaren flyttad till baksätet', price: 260, fx: { cool: 24, radSafe: 1 }, desc: 'Rokkiklassiker: kylaren sitter skyddad bak med eget luftintag. +24 kW och den går inte sönder vid frontsmällar.' } ] },
  { id: 'vaxel', name: 'Växellåda', komp: 'utvaxling', levels: [
    { name: 'Kort slutväxel', price: 120, fx: { final: 1.12 }, desc: 'Slutväxeln 12 % kortare. Mer drivkraft i varje växel (F = T·i/r), lägre toppfart – rätt val på korta banor.' },
    { name: 'Kort slutväxel & snabbväxel', price: 320, fx: { final: 1.12, shift: 0.14, eff: 0.02 }, desc: 'Kortare växelväg halverar växlingstiden och drivlinan förlorar mindre.' } ] },
  { id: 'diff', name: 'Differential', komp: 'drivning', levels: [
    { name: 'Svetsad diff', price: 60, fx: { trac: 1 }, desc: 'Båda drivhjulen låses ihop. Inget hjul spinner loss ensamt, så drivkraften går i backen – men bilen understyr lite i tvära kurvor.' } ] },
  { id: 'vikt', name: 'Vikt', komp: 'kghk', levels: [
    { name: 'Plexirutor', price: 70, fx: { kg: -22 }, desc: '−22 kg. Mindre massa ger bättre acceleration per hk och sänker tyngdpunkten.' },
    { name: 'Lättade dörrar & luckor', price: 200, fx: { kg: -48 }, desc: '−48 kg totalt. Bara ytterplåten kvar.' },
    { name: 'Kapad & lättad kaross', price: 480, fx: { kg: -85 }, desc: '−85 kg totalt. Allt som inte bär eller skyddar är bortkapat.' } ] },
  { id: 'dack', name: 'Däck', komp: 'grepp', levels: [
    { name: 'Grova vinterdäck', price: 60, fx: { mu: 0.06 }, desc: 'Grovt mönster gräver sig ner i gruset. Grepp +6 %.' },
    { name: 'Grusdäck', price: 190, fx: { mu: 0.12 }, desc: 'Riktiga grusdäck med styv sida. Grepp +12 %.' },
    { name: 'Rallydäck (begagnade)', price: 420, fx: { mu: 0.19 }, desc: 'Begagnade rallydäck från ett tävlingsteam. Grepp +19 % – störst skillnad ut ur kurvorna.' } ] },
  { id: 'fjad', name: 'Fjädring', komp: 'grepp', levels: [
    { name: 'Höjd & styvare fjädring', price: 110, fx: { susp: 0.5 }, desc: 'Bilen studsar mindre och tappar inte lika mycket grepp utanför spåret.' },
    { name: 'Rallydämpare', price: 340, fx: { susp: 1, mu: 0.04 }, desc: 'Däcken hålls i marken över gupp. Grepp +4 % och lugnare bil på vallen.' } ] },
  { id: 'broms', name: 'Bromsar', komp: 'grepp', levels: [
    { name: 'Hårdare belägg & justerbar balans', price: 80, fx: { brake: 0.12 }, desc: 'Bromskraften +12 % och bromsbalansen kan ställas i Trimning.' } ] },
  { id: 'skydd', name: 'Förstärkning', komp: 'regler', levels: [
    { name: 'Rörstötfångare', price: 70, fx: { dmg: 0.7, kg: 12 }, desc: 'Skadorna vid kontakt minskar 30 %. +12 kg.' },
    { name: 'Förstärkt front & skyddsplåt', price: 240, fx: { dmg: 0.45, kg: 26 }, desc: 'Skador −55 %. Motor och kylare ligger bakom stål. +26 kg.' } ] },
];

export const FUELS = [
  { id: 'b95', name: 'Bensin 95', short: '95', price: 0, knock: 11.5, lhv: 43.0, afs: 14.5, cool: 4,
    desc: 'Standardbränsle. Räcker gott till en sugmotor med originalkompression.' },
  { id: 'b98', name: 'Bensin 98', short: '98', price: 120, knock: 12.4, lhv: 43.0, afs: 14.5, cool: 4,
    desc: 'Högre oktantal tål mer laddtryck och tidigare tändning. Samma värmevärde som 95.' },
  { id: 'e85', name: 'E85', short: 'E85', price: 350, knock: 14.2, lhv: 29.0, afs: 9.8, cool: 14,
    desc: 'Etanolen kyler laddningen kraftigt när den förångas. Turbobyggarens favorit – men bränsleflödet ökar ca 45 %.' },
];

export const PAINTS = [
  { id: 'gul', name: 'Varselgul', rgb: [1.0, 0.82, 0.05] },
  { id: 'rod', name: 'Lackröd', rgb: [0.85, 0.12, 0.10] },
  { id: 'bla', name: 'Finlandsblå', rgb: [0.10, 0.32, 0.78] },
  { id: 'gron', name: 'Traktorgrön', rgb: [0.12, 0.55, 0.22] },
  { id: 'vit', name: 'Rollervit', rgb: [0.92, 0.92, 0.90] },
  { id: 'orange', name: 'Grävmaskinsorange', rgb: [0.98, 0.45, 0.05] },
  { id: 'rosa', name: 'Tuggummirosa', rgb: [0.95, 0.35, 0.62] },
  { id: 'svart', name: 'Mattsvart', rgb: [0.13, 0.13, 0.15] },
];

// Tävlingsorter ur rokkirallins kisainfo 2021–2026. Layouterna är spelets egna tolkningar.
// shape: R = grundradie (m), sx/sz = utdragning, h = övertoner [k, amplitud, fas].
export const TRACKS = [
  { id: 'vilppula', name: 'Vilppula', surface: 'grus', width: 11, shape: { R: 96, sx: 1.45, sz: 0.9, h: [[2, 0.10, 0.4], [3, 0.07, 1.2]] } },
  { id: 'joutsa', name: 'Joutsa', surface: 'grus', width: 11, shape: { R: 92, sx: 1.25, sz: 1.0, h: [[3, 0.16, 0.2], [5, 0.05, 2.0]] } },
  { id: 'pieksamaki', name: 'Pieksämäki', surface: 'grus', width: 10.5, shape: { R: 100, sx: 1.55, sz: 0.8, h: [[2, 0.14, 1.9], [4, 0.08, 0.6]] } },
  { id: 'kouvola', name: 'Kouvola', surface: 'grus', width: 11, shape: { R: 104, sx: 1.2, sz: 1.05, h: [[4, 0.13, 0.9], [3, 0.08, 2.6]] } },
  { id: 'karstula', name: 'Karstula', surface: 'grus', width: 10.5, shape: { R: 98, sx: 1.35, sz: 0.95, h: [[3, 0.14, 2.4], [5, 0.07, 0.3], [2, 0.06, 1.0]] } },
  { id: 'rantasalmi', name: 'Rantasalmi', surface: 'grus', width: 10.5, shape: { R: 108, sx: 1.5, sz: 0.85, h: [[2, 0.12, 0.2], [5, 0.09, 1.4]] } },
  { id: 'pihtipudas', name: 'Pihtipudas', surface: 'grus', width: 10, shape: { R: 102, sx: 1.3, sz: 1.0, h: [[4, 0.15, 2.2], [6, 0.05, 0.5]] } },
  { id: 'heinola', name: 'Heinola', surface: 'grus', width: 10.5, shape: { R: 110, sx: 1.4, sz: 0.9, h: [[3, 0.12, 0.7], [4, 0.10, 2.9]] } },
  { id: 'hyvinkaa', name: 'Hyvinkää', surface: 'asfalt', width: 10.5, shape: { R: 112, sx: 1.5, sz: 0.85, h: [[2, 0.13, 2.7], [3, 0.10, 0.1], [6, 0.04, 1.0]] } },
  { id: 'tammisaari', name: 'Tammisaari', surface: 'grus', width: 10, shape: { R: 106, sx: 1.3, sz: 1.0, h: [[5, 0.11, 1.1], [3, 0.11, 2.0]] } },
  { id: 'virtasalmi', name: 'Virtasalmi Motopark', surface: 'asfalt', width: 11, shape: { R: 124, sx: 1.6, sz: 0.8, h: [[2, 0.15, 0.9], [4, 0.09, 2.4], [5, 0.05, 0.2]] } },
  { id: 'akaa', name: 'Daytona Circuit Akaa', surface: 'asfalt', width: 11, shape: { R: 118, sx: 1.7, sz: 0.75, h: [[2, 0.08, 0.0], [3, 0.09, 1.7], [6, 0.05, 2.5]] } },
  { id: 'saarijarvi', name: 'Saarijärvi (is)', surface: 'is', width: 12, shape: { R: 100, sx: 1.4, sz: 0.95, h: [[3, 0.12, 1.5], [2, 0.08, 0.3]] } },
  { id: 'pieksamaki-is', name: 'Pieksämäki (is)', surface: 'is', width: 12, shape: { R: 104, sx: 1.5, sz: 0.85, h: [[2, 0.14, 1.9], [4, 0.07, 0.6]] } },
  { id: 'rantasalmi-is', name: 'Rantasalmi (is)', surface: 'is', width: 12, shape: { R: 108, sx: 1.45, sz: 0.9, h: [[2, 0.11, 0.2], [5, 0.07, 1.4]] } },
];

export const SURF = {
  grus: { name: 'Grus', mu: 0.78, B: 5.5, C: 1.2, crr: 0.028, col: [0.55, 0.45, 0.33], dust: [0.72, 0.62, 0.48] },
  asfalt: { name: 'Asfalt', mu: 1.02, B: 9, C: 1.35, crr: 0.015, col: [0.25, 0.26, 0.28], dust: [0.6, 0.6, 0.6] },
  is: { name: 'Is', mu: 0.50, B: 7, C: 1.25, crr: 0.02, col: [0.72, 0.82, 0.90], dust: [0.95, 0.97, 1.0] },
};

// Karriären: fyra nivåer. Varje tävling körs som en riktig rokkiralli-dag:
// alkuerä → (keräilyerä → last call) → semi → finalstege med nousut.
export const CAREER = [
  { id: 'debut', name: 'Ensikertalainen', sub: 'Första säsongen', laps: 3, ai: 0.80, prize: 220, need: 0, events: [
    { id: 'd1', track: 'vilppula', name: 'Vilppulas vårpremiär' },
    { id: 'd2', track: 'joutsa', name: 'Joutsas majheat' },
    { id: 'd3', track: 'pieksamaki', name: 'Pieksämäkis grusdag' },
    { id: 'd4', track: 'kouvola', name: 'Kouvolas försommarralli' } ] },
  { id: 'kesa', name: 'Kesäpörssi', sub: 'Sommarsäsongens poängjakt', laps: 3, ai: 0.88, prize: 420, need: 45, events: [
    { id: 'k1', track: 'karstula', name: 'Karstulas midsommarrock' },
    { id: 'k2', track: 'rantasalmi', name: 'Rantasalmis sommarheat' },
    { id: 'k3', track: 'pihtipudas', name: 'Pihtipudas augustiralli' },
    { id: 'k4', track: 'heinola', name: 'Heinolas grusfest' },
    { id: 'k5', track: 'hyvinkaa', name: 'Hyvinkääs asfaltsdag' } ] },
  { id: 'talvi', name: 'Talvipörssi', sub: 'Vintersäsongen på is', laps: 3, ai: 0.94, prize: 700, need: 70, events: [
    { id: 't1', track: 'rantasalmi-is', name: 'Rantasalmis januariis' },
    { id: 't2', track: 'pieksamaki-is', name: 'Pieksämäkis isralli' },
    { id: 't3', track: 'saarijarvi', name: 'Saarijärvis vinterfinal' } ] },
  { id: 'mestari', name: 'Mestaruus', sub: 'Toppen av pörssin', laps: 4, ai: 1.0, prize: 1200, need: 50, events: [
    { id: 'm1', track: 'tammisaari', name: 'Tammisaaris kustheat' },
    { id: 'm2', track: 'virtasalmi', name: 'Motoparks stordag' },
    { id: 'm3', track: 'kouvola', name: 'Kouvolas mästarmöte' },
    { id: 'm4', track: 'joutsa', name: 'Joutsas höstrock' },
    { id: 'm5', track: 'akaa', name: 'Säsongsfinalen på Daytona Circuit' } ] },
];

export const FINALS = ['A', 'B', 'C', 'D', 'E'];
// poäng per slutplacering: A-final 1–6, sedan B 4–6, C 4–6, D 4–6, E 4–6, utslagen
export const POINTS = { A: [30, 25, 22, 20, 18, 16], B: [14, 13, 12], C: [10, 9, 8], D: [7, 6, 5], E: [4, 3, 2], out: 1 };
export const PRIZE_SHARE = { A: [1, 0.7, 0.5, 0.4, 0.35, 0.3], B: 0.26, C: 0.2, D: 0.15, E: 0.12, out: 0.08 };

export const CODES = [
  ['A1', 'Takakulmatyöntö / pyöräytys', 'Knuff i bakhörnet eller snurrning av en medtävlare'],
  ['A2', 'Päälleajo', 'Påkörning'],
  ['A3', 'Kylkikosketus', 'Sidokontakt (junior- och superklasserna)'],
  ['A4', 'Eteenkiilaus', 'Kilar sig in framför med kontakt'],
  ['A5', 'Painaminen', 'Pressar ut en medtävlare'],
  ['A6', 'Töniminen / peräänajo', 'Knuffande eller påkörning bakifrån'],
  ['A7', 'Häiritsevä kaistanvaihto', 'Störande filbyte i starten'],
  ['A8', 'Lisälenkiltä eteen', 'Kör ut från lisälenkki rakt framför en annan'],
  ['B1', 'Hiljentämättä keltaisella', 'Saktar inte in vid gul flagg'],
  ['B2', 'Varomaton ajo keltaisella', 'Oförsiktig körning vid gul flagg'],
  ['B3', 'Ohitus keltaisella', 'Omkörning vid gul flagg'],
  ['B4', 'Kontakti keltaisella', 'Kontakt vid gul flagg'],
  ['B5', 'STOP-merkki', 'Struntar i STOP-skylten'],
  ['B6', 'Ruutulipun jälkeinen päälleajo', 'Påkörning efter målflagg'],
  ['B7', 'Liputettuun esteeseen', 'Kör på ett flaggat hinder'],
  ['B8', 'Holtiton ajo', 'Vårdslös körning'],
  ['B9', 'Turvallisuuden laiminlyönti', 'Slarv med säkerheten'],
];
export const MARKS = [['K', 'Keskeyttänyt', 'Brutit'], ['KA', 'Kaato', 'Rullat'], ['Vi', 'Vilppilähtö', 'Tjuvstart'],
  ['Li', 'Lisälenkki ajamatta', 'Lisälenkki inte körd'], ['P', 'Pois tästä erästä', 'Ute ur heatet, fortsätter']];

// Påhittade förare och team – alla likheter med verkliga personer är oavsiktliga.
export const DRIVERS = ['Pena Rämäkkö', 'Jorma Kaasujalka', 'Late Sivuluisu', 'Mäkelän Poika', 'Tuukka Soranen', 'Reiska Pultti',
  'Vesa Vänkäri', 'Kake Kardaani', 'Ilpo Ilmanotto', 'Seppo Sytytys', 'Hessu Hiekkala', 'Arska Akseli', 'Jere Jousi', 'Pate Pakosarja',
  'Timppa Turbonen', 'Masa Männänrengas', 'Olli Öljypohja', 'Rami Rattinen', 'Sami Sorakuoppa', 'Veikko Vaihde', 'Eki Etuveto',
  'Nipa Nokka-akseli', 'Tane Takaveto', 'Juha Jäärata', 'Aki Ahdin', 'Kimmo Kytkin'];
export const TEAMS = ['Team Sorakuoppa', 'Hitsipilli Racing', 'Peräkylän Bensa & Pulla', 'Löysä Pultti Motorsport', 'Navetta Racing',
  'Rautakanki RT', 'Team Viimeinen Erä', 'Pärinäpojat', 'Saunan Taka Racing', 'Kuraralli Team'];

export const KOMP = [
  { id: 'tavling', title: 'Så går en rokkiralli-dag till', formula: 'alkuerä → keräilyerä → last call → semi → final',
    body: ['Varje klass kör först <b>alkuerät</b> (försöksheat). De bästa i varje heat går direkt till <b>semit</b> – i de flesta klasser de två första.',
      'Den som missar får en ny chans i <b>keräilyerät</b> (uppsamlingsheat) och till sist i <b>last call</b>. Därefter är dagen slut för den som inte tagit sig vidare.',
      'Placeringen i semifinalen avgör vilken final man hamnar i: 1:an till A-finalen, 2:an till B, 3:an till C, 4:an till D och resten till E (stora klasser har även F och G).',
      'Finalerna körs nerifrån och upp. De bästa i varje final – två eller tre beroende på klass – gör en <b>nousu</b>: de klättrar till nästa final och startar där längst bak. I teorin kan man alltså köra sig från E-finalen ända upp till A.'] },
  { id: 'klasser', title: 'Klasserna', formula: 'Vetari · Kardaani · Super · Junior · Lady · Senior · Super Senior',
    body: ['<b>Vetari</b> är framhjulsdrivna bilar och <b>Kardaani</b> bakhjulsdrivna. I spelet avgör bilens drivning vilken av de två klasserna du kör.',
      'Därtill finns <b>Super</b> samt förarklasserna <b>Junior</b>, <b>Lady</b>, <b>Senior</b> och <b>Super Senior</b>, med egna poängtabeller (pörssi) för sommar- och vintersäsong.',
      'Sommarsäsongen körs på grus- och asfaltbanor från april till oktober, vintersäsongen på is.'] },
  { id: 'lisalenkki', title: 'Lisälenkki', formula: 'en gång per heat – annars Li',
    body: ['Varje bana har en <b>lisälenkki</b>, en extra slinga som gör varvet längre. Den ska köras en gång per heat.',
      'När du tar den är taktik: tidigt för fri bana efteråt, eller sent för att komma ut framför en klunga. Kör inte ut rakt framför någon – det är varningskod A8.',
      'Glömmer du den får du markeringen <b>Li</b> och placeras efter alla som kört den.'] },
  { id: 'regler', title: 'Varningskoder och markeringar', formula: 'A = kontaktfel · B = säkerhetsfel',
    body: ['Rokkiralli är inte folkrace med fri kontakt. Domarna delar ut varningar med koder: <b>A-koder</b> för kontaktfel och <b>B-koder</b> för säkerhetsfel.',
      '__CODES__',
      'I spelet bedöms påkörning bakifrån (A6): första gången ger varning, andra gången i samma heat betyder svart flagg. Tjuvstart (Vi) ger 5 s tidstillägg – det sista är spelets egen förenkling.'] },
  { id: 'kghk', title: 'Vikt per hästkraft', formula: 'kg/hk = m / P',
    body: ['Det viktigaste talet på en rokkibil. Accelerationen bestäms av drivkraft delat med massa, så 10 kg mindre är lika mycket värt som ungefär 1 % mer effekt på en 1 000 kg-bil.',
      'Under 5 kg/hk räknas som bra, 5–7 som godkänt och över 7 som tungt.',
      'Strippning är gratis effekt: 70 kg inredning ut motsvarar 7 hk på en bil med 10 kg/hk.'] },
  { id: 'moment', title: 'Moment, effekt och BMEP', formula: 'P = T · ω     BMEP = 4π·T / Vd',
    body: ['Effekten är moment gånger vinkelhastighet: P [kW] = T [Nm] · N [rpm] / 9549.',
      'BMEP (bromsat medeleffektivt tryck) gör motorer av olika storlek jämförbara. En bra sugmotor ligger kring 10–12 bar, en turbomotor på 15–20 bar.',
      'Större slagvolym ger mer moment vid samma BMEP – därför drar en 2,0 bättre än en 1,6 ur kurvorna.'] },
  { id: 'fyllnadsgrad', title: 'Fyllnadsgrad ηV', formula: 'ηV = ṁa / (ρ · Vd · N/2)',
    body: ['Hur stor del av slagvolymen som faktiskt fylls med luft varje arbetscykel. Insug, kam och avgassystem formar kurvan.',
      'En vassare kam flyttar toppen uppåt i varvtal: mer effekt på toppen, mindre moment i botten. På en kort grusbana med många hårnålar är botten ofta viktigare.'] },
  { id: 'turbo', title: 'Turbo och intercooler', formula: 'ρi = pi / (R · Ti)',
    body: ['Turbon höjer insugstrycket pi. Tätare luft betyder mer bränsle per cykel och högre FUELMEP.',
      'Kompressionen värmer luften: T2 = T0·(1 + (π^0,286 − 1)/ηk). Intercoolern kyler tillbaka en andel ε av temperaturhöjningen.',
      'Varm laddluft och högt tryck ökar knackrisken – se kapitlet om tändläge.'] },
  { id: 'lambda', title: 'Luft/bränsle-förhållandet λ', formula: 'λ = (A/F) / (A/F)s',
    body: ['λ = 1 är stökiometrisk blandning. Lite fet blandning (λ ≈ 0,9) ger mest effekt och kyler förbränningen, men en del bränsle går oförbränt ut.',
      'Lite mager blandning (λ ≈ 1,05–1,1) ger bäst verkningsgrad – men sällan snabbast heat.'] },
  { id: 'tandning', title: 'Tändläge och knack', formula: 'fTiming = 1 − 0,0005 · Δ²',
    body: ['Vid MBT (Δ = 0) ger tändläget högst moment. Varje grads avvikelse kostar kvadratiskt.',
      'Tidig tändning, hög kompression, högt laddtryck och varm laddluft ökar knackrisken. Knackmarginalen i Trimning ska vara över noll, annars tappar motorn effekt och tar skada under heatet.',
      'Högre oktan (98, E85) höjer gränsen.'] },
  { id: 'pumpforlust', title: 'Pumpförlust och friktion', formula: 'BMEP = IMEPg − PMEP − FMEP',
    body: ['Av det indikerade arbetet går en del åt till att pumpa gas genom motorn (PMEP = pe − pi) och en del till friktion (FMEP), som växer med varvtalet.',
      'Ett rakt rör sänker mottrycket pe. Med turbo kan pi bli högre än pe, och då blir pumparbetet en vinst.'] },
  { id: 'kylning', title: 'Kylning', formula: 'Qkyl = HTMEP · Vd · N/2',
    body: ['Ungefär en sjättedel av bränsleenergin går till kylvattnet. Mer effekt betyder mer värme.',
      'Om kylbehovet är större än kylarens kapacitet stiger temperaturen under heatet; över 115 °C tappar motorn effekt.',
      'En frontsmäll kan knäcka kylaren. Flyttar du den till baksätet sitter den skyddad – ett klassiskt rokkibygge.'] },
  { id: 'utvaxling', title: 'Utväxling', formula: 'F = T · iväxel · islut · η / r',
    body: ['Drivkraften vid hjulen är motorns moment gånger total utväxling delat med hjulradien.',
      'Kort slutväxel ger mer drivkraft men lägre fart per växel. Rokkibanor är korta: du ska nå varvgränsen på högsta använda växeln precis före den längsta rakans bromspunkt.'] },
  { id: 'drivning', title: 'Vetari mot kardaani', formula: 'Fmax = μ · Fz,driv',
    body: ['Drivkraften begränsas av greppet på drivaxeln. Vid acceleration flyttas vikt bakåt: en bakhjulsdrivare får mer grepp, en framhjulsdrivare mindre.',
      'Framhjulsdrift <b>understyr</b> på gas – bilen plogar utåt men är lätt att rädda. Bakhjulsdrift <b>överstyr</b> – bakändan kommer ut och bilen kan styras med gasen.',
      'Öppen diff släpper kraften till hjulet med minst grepp. Svetsad diff tvingar båda att dra.'] },
  { id: 'grepp', title: 'Grepp på grus och is', formula: 'vmax = √(μ · g · R)',
    body: ['Högsta kurvfart bestäms av friktionstalet μ och kurvradien R. På grus är μ ungefär 0,8, på asfalt 1,0 och på is med dubb 0,5.',
      'På löst underlag kommer maxgreppet vid större avdriftsvinkel än på asfalt – därför är det snabbt att köra lite på tvären.',
      'Bromsa rakt, sväng in, gasa ut. Däcket har bara en friktionscirkel att dela mellan broms, sväng och drivning.'] },
];
