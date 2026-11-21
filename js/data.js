// Rokkikraft – speldata enligt ROKKIRALLI RY SÄÄNTÖKIRJA (21.04.2026),
// Säännöt ja luokka esittelyt samt Kaaret-ritningarna (Hitsatut / Taivutetut mutkat & Super-luokan kaaret).

export const CLASSES = {
  vetari: 'Vetari Rock',
  kardaani: 'Kardaani Rock',
  super: 'Super Rock',
  junior: 'Junior Rock',
  lady: 'Lady Rock',
  senior: 'Senior Rock',
  supersenior: 'Super Senior Rock',
};

// Exakta klassregler enligt Sääntökirja 21.04.2026
export const CLASS_RULES = {
  vetari: {
    id: 'vetari', name: 'Vetari Rock', short: 'Vetari', drv: 'fwd',
    fee: 60, minLaps: 2, gridRows: 2, joker: false, sideContact: true,
    turbo: false, diffFwd: false, rallyTires: false, maxMass: 1800,
    salePrice: 850, saleFrom: 'semi', prefix: '', age: '18+ år',
    desc: 'Framhjulsdrivna bilar (etuveto). Fri trimningsgrad men turbo och lustgas är förbjudna. Diffspärr (lukkoperä) är ej tillåten på framhjulsdrivna bilar i myyntiluokat. Endast gatgodkända däck på sommaren (rallydubbdäck på vintern). Start från 2 led (7 m mellanrum), min 2 varv, ingen lisälenkki. Semifinal- och finalbilar har myyntivelvoite (850 €).',
  },
  kardaani: {
    id: 'kardaani', name: 'Kardaani Rock', short: 'Kardaani', drv: 'rwd',
    fee: 60, minLaps: 2, gridRows: 2, joker: false, sideContact: true,
    turbo: false, diffFwd: false, rallyTires: false, maxMass: 1800,
    salePrice: 850, saleFrom: 'semi', prefix: '', age: '18+ år',
    desc: 'Bakhjulsdrivna bilar (takaveto). Fri trimningsgrad men turbo och lustgas är förbjudna. Svetsad diff / lukkoperä är tillåten! Endast gatgodkända däck på sommaren (rallydubbdäck på vintern). Start från 2 led (7 m mellanrum), min 2 varv, ingen lisälenkki. Semifinal- och finalbilar har myyntivelvoite (850 €). Kör du både Vetari och Kardaani samma helg är avgiften 100 € totalt.',
  },
  super: {
    id: 'super', name: 'Super Rock', short: 'Super', drv: 'any',
    fee: 60, minLaps: 3, gridRows: 1, joker: true, sideContact: false,
    turbo: true, diffFwd: true, rallyTires: true, maxMass: Infinity,
    salePrice: 0, saleFrom: null, prefix: 'S', age: '18+ år',
    desc: 'Klassen för de starkaste bilarna. Turbo är tillåtet (lustgas förbjudet), ingen viktgräns, diffspärr (lukkoperä) tillåten även på framhjulsdrivna bilar samt rallydäck och slicks tillåtna (däckvärmare förbjudna). Kräver Super-luokan kaaret (8 karossfästen, takkryss & hörntrianglar), 6-punktsbälte, sidospeglar, representativ kaross (siisti) och bokstaven S framför startnumret. Start från 1 led, min 3 varv + lisälenkki. Sidokontakt förbjuden (A3). Ingen myyntivelvoite!',
  },
  junior: {
    id: 'junior', name: 'Junior Rock', short: 'Junior', drv: 'any',
    fee: 0, minLaps: 3, gridRows: 1, joker: true, sideContact: false,
    turbo: false, diffFwd: false, rallyTires: false, maxMass: 1800,
    salePrice: 850, saleFrom: 'B', prefix: 'J', age: '15–18 år',
    desc: 'För 15–18-åringar med fram- eller bakhjulsdriven bil (ingen turbo). Debutanter gör skriftligt prov och körprov före tävling. Kräver sidospeglar på båda sidor och J framför numret. Total kontaktförbud (A3) och egen körlinje. Start från 1 led, min 3 varv + lisälenkki. A- och B-finalbilar har myyntivelvoite (850 €). Anmälningsavgift 0 € säsongen 2026 (Rokkiralli ry betalar).',
  },
  lady: {
    id: 'lady', name: 'Lady Rock', short: 'Lady', drv: 'any',
    fee: 40, minLaps: 3, gridRows: 1, joker: true, sideContact: true,
    turbo: false, diffFwd: false, rallyTires: false, maxMass: 1800,
    salePrice: 850, saleFrom: 'C', prefix: 'L', age: '18+ år',
    desc: 'Damklassen för både fram- och bakhjulsdrivna bilar (ingen turbo, gatdäck på sommaren / rallydubb på vintern). Bokstaven L framför startnumret. Start från 1 led, min 3 varv + lisälenkki. Sidokontakt i samma färdriktning framför bakhjulet är tillåten. A–C-finalbilar har myyntivelvoite (850 €). Anmälningsavgift 40 €.',
  },
  senior: {
    id: 'senior', name: 'Senior Rock', short: 'Senior', drv: 'any',
    fee: 40, minLaps: 3, gridRows: 1, joker: true, sideContact: true,
    turbo: false, diffFwd: false, rallyTires: false, maxMass: 1800,
    salePrice: 850, saleFrom: 'A', prefix: '', age: '50+ år',
    desc: 'För förare som fyllt 50 år med Vetari-, Lady- eller Kardaani-bil (6–18 förare). Start från 1 led, min 3 varv + lisälenkki. A-finalbilar har myyntivelvoite (850 €). Anmälningsavgift 40 €.',
  },
  supersenior: {
    id: 'supersenior', name: 'Super Senior Rock', short: 'Super Senior', drv: 'any',
    fee: 40, minLaps: 3, gridRows: 1, joker: true, sideContact: false,
    turbo: true, diffFwd: true, rallyTires: true, maxMass: Infinity,
    salePrice: 0, saleFrom: null, prefix: 'S', age: '50+ år',
    desc: 'För förare som fyllt 50 år med Super-bil (6–18 förare). Turbo, rallydäck/slicks och diffspärr tillåtna. Start från 1 led, min 3 varv + lisälenkki, ingen sidokontakt (A3) och ingen myyntivelvoite. Anmälningsavgift 40 €.',
  },
};

export const CARS = [
  // ===================== RALLYCROSS-BILAR (myyntiluokka 850 €). Mazda 626 är spelets startbil i originalskick =====================
  { id: 'mazda626', name: 'Mazda 626 1989', nick: 'Sexhundra', cls: 'vetari', drv: 'fwd', body: 'hatch', price: 850, starter: 1,
    Vd: 2.0, cyl: 5, redline: 6500, rc: 9.6, etaPeak: 0.88, peakRpm: 4600, mass: 1024, showMass: 998, regMass: 1090, wb: 2.52, front: 0.62,
    final: 4.1, gears: [3.31, 1.83, 1.31, 1.03, 0.80], CdA: 0.66, cool: 50, boost: 0,
    defaultEng: 'g20_5', engines: ['g20_5'],
    tag: 'Lätt framhjulsdriven – 2,0 L femcylindrig, 150 hk, 998 kg (startbil i originalskick)',
    desc: 'Lättast av de tre. Svänger villigt och tappar lite fart i kurvorna – men får se sig slagen på långa raksträckor.' },
  { id: 'passat_rx', name: 'Volkswagen Passat 3.0 V6', nick: 'Passaten', cls: 'kardaani', drv: 'rwd', body: 'sedan', price: 850, starter: 1,
    Vd: 3.0, cyl: 6, redline: 6800, rc: 10.5, etaPeak: 0.92, peakRpm: 5200, mass: 1481, showMass: 1455, regMass: 1550, wb: 2.70, front: 0.56,
    final: 3.7, gears: [3.56, 2.05, 1.43, 1.10, 0.89, 0.72], CdA: 0.70, cool: 70, boost: 0,
    defaultEng: 'vw30_v6', engines: ['vw30_v6'],
    tag: 'Bakhjulsdriven V6 – 260 hk, 1 455 kg',
    desc: 'Tung men stark. Drar ifrån på rakorna och kan sladdas runt kurvorna på gasen, men kräver tidig inbromsning.' },
  { id: 'mondeo_st', name: 'Ford Mondeo ST220', nick: 'ST:n', cls: 'vetari', drv: 'fwd', body: 'hatch', price: 850, starter: 1,
    Vd: 3.0, cyl: 6, redline: 6800, rc: 10.0, etaPeak: 0.90, peakRpm: 5000, mass: 1426, showMass: 1400, regMass: 1500, wb: 2.75, front: 0.63,
    final: 4.06, gears: [3.42, 2.14, 1.45, 1.03, 0.81, 0.62], CdA: 0.68, cool: 66, boost: 0,
    defaultEng: 'g30_v6', engines: ['g30_v6'],
    tag: 'Framhjulsdriven V6 – 220 hk, 1 400 kg',
    desc: 'Mittemellan: mycket kraft för en framhjulsdrivare. Stabil och snabb, men understyr om man går in för fort.' },
  // ===================== VETARI – FRAMHJULSDRIVNA BILAR (ETUVETO) =====================
  { id: 'sunny', name: 'Volvo S40 / V40 1.8–2.0', nick: 'S40 Vetari', cls: 'vetari', drv: 'fwd', body: 'sedan', price: 850,
    Vd: 1.8, cyl: 4, redline: 6500, rc: 9.8, etaPeak: 0.87, peakRpm: 4300, mass: 1020, regMass: 1180, wb: 2.55, front: 0.61,
    final: 4.06, gears: [3.38, 1.90, 1.31, 0.97, 0.76], CdA: 0.65, cool: 46, boost: 0,
    defaultEng: 's40_18', engines: ['s40_18', 's40_20', 'volvo_b5254'],
    tag: 'Dokumenterat Vetari-bygge (1,8 & 2,0 fyrcylindrig sugmotor)',
    desc: 'Bekräftad i aktuella Rokkiralliannonser på Nettiauto! Fyrcylindriga sugmotorer på 1,8 och 2,0 liter. Köpt färdigbyggd med godkända kaaret (två dörrsträvor i förardörren), kuppipenkki, 4-punktsbälte och Nascar-verkko.' },
  { id: 'mazda3', name: 'Mazda 3 / Mazda 6 2.0–2.3', nick: 'MZR-Vetari', cls: 'vetari', drv: 'fwd', body: 'hatch', price: 850,
    Vd: 2.0, cyl: 4, redline: 6800, rc: 10.0, etaPeak: 0.90, peakRpm: 4700, mass: 995, regMass: 1160, wb: 2.64, front: 0.61,
    final: 4.10, gears: [3.30, 1.84, 1.31, 0.97, 0.75], CdA: 0.63, cool: 50, boost: 0,
    defaultEng: 'mzr_20', engines: ['mzr_20', 'mzr_23'],
    tag: 'Bekräftat Rokkirallibygge (2,0 & 2,3 fyrcylindrig MZR)',
    desc: 'Konkret bekräftad som färdigt Rokkirallibygge (Mazda 3 2,0) i finska annonser. Lätt, varvvillig 16V-sugmotor på 2,0 eller 2,3 liter med fint chassi.' },
  { id: 'kadett', name: 'Opel Astra / Vectra 2.0 16V & 2.5 V6', nick: 'Ooppeli', cls: 'vetari', drv: 'fwd', body: 'hatch', price: 850,
    Vd: 2.0, cyl: 4, redline: 6600, rc: 9.8, etaPeak: 0.89, peakRpm: 4500, mass: 985, regMass: 1140, wb: 2.58, front: 0.62,
    final: 3.74, gears: [3.55, 1.95, 1.28, 0.89, 0.71], CdA: 0.64, cool: 48, boost: 0,
    defaultEng: 'opel_20_16v', engines: ['opel_20_16v', 'opel_25_v6'],
    tag: 'Klassisk Opel-vetari (2,0 16V eller 2,5 V6)',
    desc: 'Vanlig i Vetari med antingen 2,0 16V (X20XEV / C20XE) eller 2,5-liters V6. Starkt bottenvrid på gatgodkända däck.' },
  { id: 'passat_vetari', name: 'VW Passat B5 1.8 20V / 2.8 V6', nick: 'Pasuuna (Vetari)', cls: 'vetari', drv: 'fwd', body: 'sedan', price: 850,
    Vd: 1.8, cyl: 4, redline: 6700, rc: 10.3, etaPeak: 0.90, peakRpm: 4800, mass: 1120, regMass: 1290, wb: 2.70, front: 0.62,
    final: 3.89, gears: [3.50, 1.94, 1.30, 0.94, 0.76], CdA: 0.65, cool: 54, boost: 0,
    defaultEng: 'vag_18_20v', engines: ['vag_18_20v', 'vag_28_v6'],
    tag: 'Typisk Rokkiralli-modell (1,8 20V eller 2,8 V6 30V)',
    desc: 'Bekräftad i Rokkiralliannonser! 5 ventiler per cylinder (1,8 20V) ger hög fyllnadsgrad ηV, eller byt upp till 2,8-liters 30V V6 för maximalt sugmoment.' },
  { id: 'civic', name: 'Volvo 850 / S70 / V70 2.4–2.5 5-cyl', nick: 'Viitos-Volvo', cls: 'vetari', drv: 'fwd', body: 'wagon', price: 850,
    Vd: 2.5, cyl: 5, redline: 6500, rc: 10.0, etaPeak: 0.90, peakRpm: 4600, mass: 1190, regMass: 1380, wb: 2.67, front: 0.62,
    final: 4.00, gears: [3.38, 1.90, 1.19, 0.87, 0.70], CdA: 0.68, cool: 60, boost: 0,
    defaultEng: 'volvo_b5252_140', engines: ['volvo_b5252_140', 'volvo_b5254'],
    tag: 'Ikonisk 5-cylindrig Vetari (2,4–2,5 L, 140 / 170 hk)',
    desc: 'En av de mest klassiska bilmodellerna i Rokkiralli! 2,4–2,5-liters femcylindriga sugmotorer (10V 140 hk eller 20V 170 hk) och kombi som kan kapas enligt farmariauton typistys.' },
  { id: 'mondeo', name: 'Ford Mondeo 2.0 / 2.5 V6 / ST220 3.0 V6', nick: 'Mönde', cls: 'vetari', drv: 'fwd', body: 'sedan', price: 850,
    Vd: 2.5, cyl: 6, redline: 6800, rc: 9.7, etaPeak: 0.89, peakRpm: 4600, mass: 1180, regMass: 1360, wb: 2.70, front: 0.63,
    final: 3.82, gears: [3.42, 2.14, 1.45, 1.03, 0.77], CdA: 0.66, cool: 64, boost: 0,
    defaultEng: 'mondeo_25_v6', engines: ['mondeo_20', 'mondeo_25_v6', 'mondeo_st220'],
    tag: 'Vetari-toppmodell (2,0 4-cyl, 2,5 V6 eller ST220 3,0 V6)',
    desc: 'Typisk Rokkiralli-vetari som förekommer med 2,0 fyrcylindrig Duratec/Zetec, 2,5 V6 eller ST220:s 3,0-liters V6 för enormt sugmoment utan turbo!' },

  // ===================== KARDAANI – BAKHJULSDRIVNA BILAR (TAKAVETO) =====================
  { id: 'v343', name: 'Opel Kadett C / Ascona B (Kardaani)', nick: 'Ascona / Kadetti', cls: 'kardaani', drv: 'rwd', body: 'sedan', price: 850,
    Vd: 2.0, cyl: 4, redline: 6300, rc: 9.4, etaPeak: 0.86, peakRpm: 4000, mass: 940, regMass: 1030, wb: 2.51, front: 0.52,
    final: 3.67, gears: [3.65, 2.16, 1.37, 1.00, 0.83], CdA: 0.66, cool: 46, boost: 0,
    defaultEng: 'opel_cih_20', engines: ['opel_cih_20', 'opel_20_16v', 'volvo_b230_bmwbox'],
    tag: 'Dokumenterad i Kardaani (äldre Opel-motor eller Volvo-teknik)',
    desc: 'Lätt bakhjulsdriven klassiker som dokumenterats i Kardaani och Super. Kör med äldre Opel CIH/OHC-motor eller byt in en 2,3-liters Volvo B230 med BMW-växellåda!' },
  { id: 'sierra', name: 'Ford Sierra 2.0 OHC Pinto / DOHC', nick: 'Sirkka', cls: 'kardaani', drv: 'rwd', body: 'sedan', price: 850,
    Vd: 2.0, cyl: 4, redline: 6400, rc: 9.4, etaPeak: 0.87, peakRpm: 4100, mass: 1030, regMass: 1120, wb: 2.61, front: 0.53,
    final: 3.62, gears: [3.65, 1.97, 1.37, 1.00, 0.82], CdA: 0.65, cool: 48, boost: 0,
    defaultEng: 'sierra_pinto', engines: ['sierra_pinto', 'sierra_dohc', 'volvo_b230_bmwbox', 'bmw_m50b25'],
    tag: 'Klassisk Kardaani-bil (2,0 OHC/Pinto, 2,0 DOHC eller motorbyte)',
    desc: 'En av de mest omtalade bakhjulsdrivarna i Rokkiralli. Körs med klassisk 2,0 OHC Pinto, 2,0 DOHC eller med utbytt motor (t.ex. Volvo B230 eller BMW sexa).' },
  { id: 'v940', name: 'Volvo 240 / 740 / 940 2.3 Rödblock', nick: 'Rödblockare', cls: 'kardaani', drv: 'rwd', body: 'wagon', price: 850,
    Vd: 2.3, cyl: 4, redline: 6200, rc: 9.8, etaPeak: 0.89, peakRpm: 4100, mass: 1210, regMass: 1380, wb: 2.77, front: 0.53,
    final: 3.73, gears: [4.03, 2.16, 1.37, 1.00, 0.82], CdA: 0.70, cool: 60, boost: 0,
    defaultEng: 'volvo_b230', engines: ['volvo_b230', 'volvo_b230_folkrace', 'volvo_b230_bmwbox'],
    tag: '2,3-liters rödblock (B23 / B230) med lukkoperä',
    desc: 'Stommen i finsk och nordisk folkrace/Rokkiralli: 2,3-liters rödblock (B23/B230), svetsad bakaxel (lukkoperä) och kombi som kan kapas enligt farmariauton typistys!' },
  { id: 'passat_kardaani', name: 'VW Passat B5 / Audi A4 2.8 V6 (RWD-ombyggd)', nick: 'Takaveto-V6', cls: 'kardaani', drv: 'rwd', body: 'sedan', price: 850,
    Vd: 2.8, cyl: 6, redline: 6800, rc: 10.3, etaPeak: 0.91, peakRpm: 4800, mass: 1180, regMass: 1360, wb: 2.70, front: 0.54,
    final: 3.89, gears: [3.50, 1.94, 1.30, 0.94, 0.76], CdA: 0.65, cool: 66, boost: 0,
    defaultEng: 'vag_28_v6', engines: ['vag_28_v6', 'vag_18_20v'],
    tag: 'Ombyggd från 4WD till bakhjulsdrift med 2,8 V6 (Kardaani)',
    desc: 'Längsmonterad 2,8-liters 30V V6 i Passat B5 / Audi A4 som byggts om från fyrhjulsdrift (Syncro/Quattro) till ren bakhjulsdrift med lukkoperä för Kardaani!' },
  { id: 'bmw325', name: 'BMW 3-serie E36 / E46 (M50 / M52 / M54)', nick: 'Bemari', cls: 'kardaani', drv: 'rwd', body: 'sedan', price: 850,
    Vd: 2.5, cyl: 6, redline: 6900, rc: 10.0, etaPeak: 0.92, peakRpm: 4900, mass: 1150, regMass: 1280, wb: 2.70, front: 0.50,
    final: 3.45, gears: [4.20, 2.49, 1.66, 1.24, 1.00], CdA: 0.64, cool: 68, boost: 0,
    defaultEng: 'bmw_m50b25', engines: ['bmw_m50b20', 'bmw_m50b25', 'bmw_m52b28', 'bmw_m54b30'],
    tag: 'Raka sexor 2,0–2,8 L (M50/M52) & 3,0 L (M54)',
    desc: 'Förekommer flitigt i aktuella Rokkiralliannonser! 50/50-viktfördelning, svetsad diff (lukkoperä) och raka sexor från 2,0–2,8 liter (M50/M52) upp till 3,0 liter (M54B30).' },

  // ===================== SUPER – SUPER ROCK (MOTORBYTEN, TURBO & V8) =====================
  { id: 'starlet_super', name: 'Toyota Starlet KP60 Super (Motorbyte)', nick: 'Super-Starlet', cls: 'super', drv: 'rwd', body: 'hatch', price: 3200,
    Vd: 2.0, cyl: 4, redline: 7600, rc: 10.6, etaPeak: 0.94, peakRpm: 5800, mass: 790, regMass: 860, wb: 2.30, front: 0.50,
    final: 4.10, gears: [3.55, 2.04, 1.40, 1.10, 0.88], CdA: 0.61, cool: 58, boost: 0,
    defaultEng: 'opel_20_16v', engines: ['opel_20_16v', 'volvo_b230_bmwbox', 'bmw_m50b25'],
    tag: 'Ultralätt 2026 Super-bygge med utbytt drivlina',
    desc: 'Rapporterad i Super under 2026! I en fjäderlätt Starlet-kaross ger ett motorbyte (2,0 16V, Volvo B230 eller BMW-sexa) ett extremt vikt/effekt-förhållande på rallydäck/slicks.' },
  { id: 'ascona_super', name: 'Opel Ascona B Super (Volvo B230 & BMW-låda)', nick: 'Volvo-Ascona', cls: 'super', drv: 'rwd', body: 'sedan', price: 5500,
    Vd: 2.3, cyl: 4, redline: 6800, rc: 9.0, etaPeak: 0.92, peakRpm: 4600, mass: 960, regMass: 1050, wb: 2.52, front: 0.51,
    final: 3.73, gears: [4.20, 2.49, 1.66, 1.24, 1.00], CdA: 0.63, cool: 66, boost: 0.55, ic: 0.6, boostStart: 2400, boostFull: 3600,
    defaultEng: 'volvo_b230_bmwbox', engines: ['volvo_b230_bmwbox', 'bmw_m54b30', 'volvo_v8_44'],
    tag: 'Verkligt Super-bygge: Opel-kaross + Volvo-motor + BMW-låda',
    desc: 'Dokumenterad Super-bil till salu i Finland: Ascona-kaross kombinerad med 2,3-liters Volvo-motor och BMW-växellåda. I Super säger karossen lite om tekniken under huven!' },
  { id: 'saab9000', name: 'Ford Escort Mk2 Super (Motorbyte)', nick: 'Super-Escort', cls: 'super', drv: 'rwd', body: 'sedan', price: 7800,
    Vd: 2.3, cyl: 4, redline: 7400, rc: 10.4, etaPeak: 0.94, peakRpm: 5600, mass: 860, regMass: 940, wb: 2.40, front: 0.50,
    final: 3.89, gears: [3.65, 2.04, 1.38, 1.08, 0.86], CdA: 0.62, cool: 62, boost: 0,
    defaultEng: 'volvo_b230_folkrace', engines: ['volvo_b230_folkrace', 'sierra_cosworth', 'bmw_m52b28'],
    tag: 'Klassisk Super-Escort med motorbyte & Super-kaaret',
    desc: 'Lätt bakhjulsdriven Escort med utbytt motor och Super-luokan kaaret (8 karossfästen, kattoristikko & hörntrianglar). Kan även köras med Cosworth-turbo i Super!' },
  { id: 'sierra_super', name: 'BMW E36 / Sierra Super Turbo', nick: 'Super-Turbo', cls: 'super', drv: 'rwd', body: 'sedan', price: 12500,
    Vd: 2.0, cyl: 4, redline: 7200, rc: 8.3, etaPeak: 0.92, peakRpm: 5000, mass: 1080, regMass: 1200, wb: 2.68, front: 0.51,
    final: 3.45, gears: [4.20, 2.49, 1.66, 1.24, 1.00], CdA: 0.64, cool: 72, boost: 0.70, ic: 0.65, boostStart: 2500, boostFull: 3700,
    defaultEng: 'sierra_cosworth', engines: ['sierra_cosworth', 'bmw_m54b30', 'volvo_b230_bmwbox', 'volvo_v8_44'],
    tag: 'Överladdad Super-maskin / Motorbyte utan myyntivelvoite',
    desc: 'Byggd för Super Rock: turbo är tillåtet, rallydäck/slicks ger brutalt fäste och bilen har ingen myyntivelvoite på 850 €.' },
  { id: 'volvo_v8_super', name: 'Volvo 240 / 740 V8 Super (2026-bygge)', nick: 'V8-Volvo', cls: 'super', drv: 'rwd', body: 'sedan', price: 19500,
    Vd: 4.4, cyl: 8, redline: 6600, rc: 10.2, etaPeak: 0.91, peakRpm: 4500, mass: 1180, regMass: 1340, wb: 2.65, front: 0.53,
    final: 3.54, gears: [4.00, 2.40, 1.58, 1.19, 0.94], CdA: 0.67, cool: 82, boost: 0,
    defaultEng: 'volvo_v8_44', engines: ['volvo_v8_44', 'volvo_b230_bmwbox'],
    tag: 'Rapporterad V8-Volvo i Super säsongen 2026!',
    desc: 'Ett finskt team rapporterar tävling med V8-Volvo i Super under 2026! 4,4-liters V8 ger ett massivt vridmoment från tomgång till varvstopp och oslagbart ljud.' },
];

// Dokumenterade motoralternativ och motorbyten (Tekniikanvaihto) i Rokkiralli!
export const ENGINES = {
  // Motoralternativ i garaget (passar alla bilar, gratis). hp = effekt med standardtrim; w = motorvikt (kg)
  g09_3: { id: 'g09_3', gen: 1, name: '0,9 L R3 8V', Vd: 0.9, cyl: 3, valves: 8, hp: 35, w: 75, redline: 6000, rc: 9.5, etaPeak: 0.82, peakRpm: 4200, price: 150, desc: 'Liten trecylindrig. Lätt framvagn men nästan ingen kraft.' },
  g13_4: { id: 'g13_4', gen: 1, name: '1,3 L R4 8V', Vd: 1.3, cyl: 4, valves: 8, hp: 67, w: 95, redline: 6200, rc: 9.5, etaPeak: 0.84, peakRpm: 4400, price: 250, desc: 'Enkel åttaventilare.' },
  g16_5: { id: 'g16_5', gen: 1, name: '1,6 L R5 8V', Vd: 1.6, cyl: 5, valves: 8, hp: 97, w: 120, redline: 6300, rc: 9.6, etaPeak: 0.85, peakRpm: 4500, price: 400, desc: 'Liten femcylindrig.' },
  g20_5: { id: 'g20_5', gen: 1, name: '2,0 L R5 8V', Vd: 2.0, cyl: 5, valves: 8, hp: 150, w: 140, redline: 6500, rc: 9.6, etaPeak: 0.88, peakRpm: 4600, price: 500, desc: 'Mazda 626:ans motor. Jämn och seg.' },
  g25_5: { id: 'g25_5', gen: 1, name: '2,5 L R5 20V', Vd: 2.5, cyl: 5, valves: 20, hp: 166, w: 160, redline: 6800, rc: 10.0, etaPeak: 0.89, peakRpm: 4800, price: 750, desc: 'Fyrventilig femma med bra mellanregister.' },
  g30_v6: { id: 'g30_v6', gen: 1, name: '3,0 L V6 24V', Vd: 3.0, cyl: 6, valves: 24, hp: 220, w: 175, redline: 6800, rc: 10.0, etaPeak: 0.90, peakRpm: 5000, price: 900, desc: 'Mondeo ST220:ns V6.' },
  vw30_v6: { id: 'vw30_v6', gen: 1, name: '3,0 L V6 24V (VW)', Vd: 3.0, cyl: 6, valves: 24, hp: 260, w: 178, redline: 6800, rc: 10.5, etaPeak: 0.92, peakRpm: 5200, price: 1000, desc: 'Passatens V6 – 260 hk.' },
  g35_v6: { id: 'g35_v6', gen: 1, name: '3,5 L V6 24V', Vd: 3.5, cyl: 6, valves: 24, hp: 270, w: 185, redline: 6900, rc: 10.3, etaPeak: 0.91, peakRpm: 5200, price: 1300, desc: 'Stor V6 med mycket vridmoment.' },
  g40_6: { id: 'g40_6', gen: 1, name: '4,0 L R6 24V', Vd: 4.0, cyl: 6, valves: 24, hp: 321, w: 205, redline: 6800, rc: 10.5, etaPeak: 0.92, peakRpm: 5000, price: 1600, desc: 'Rak sexa – tung men stark.' },
  g52_v8: { id: 'g52_v8', gen: 1, name: '5,2 L V8 32V', Vd: 5.2, cyl: 8, valves: 32, hp: 589, w: 230, redline: 8250, rc: 12.0, etaPeak: 0.96, peakRpm: 6500, price: 4500, desc: 'Högvarvande V8. Brutal på rakorna, tung i nosen.' },
  // Vetari-motorer
  s40_18: { id: 's40_18', name: 'Volvo 1.8 16V (B4184S)', Vd: 1.8, cyl: 4, redline: 6500, rc: 9.8, etaPeak: 0.87, peakRpm: 4300, price: 0, kg: 0,
    desc: 'Fyrcylindrig 1,8-liters sugmotor i Volvo S40/V40.' },
  s40_20: { id: 's40_20', name: 'Volvo 2.0 16V (B4204S)', Vd: 2.0, cyl: 4, redline: 6700, rc: 10.0, etaPeak: 0.89, peakRpm: 4500, price: 160, kg: 4,
    desc: '2,0-liters fyrcylindrig sugmotor i S40/V40 – mer vridmoment i hela registret.' },
  mzr_20: { id: 'mzr_20', name: 'Mazda 2.0 MZR 16V', Vd: 2.0, cyl: 4, redline: 6800, rc: 10.0, etaPeak: 0.90, peakRpm: 4700, price: 0, kg: 0,
    desc: 'Bekräftad i Mazda 3 Rokkirallibygge på Nettiauto. Kvick 2,0-liters aluminiumfyra.' },
  mzr_23: { id: 'mzr_23', name: 'Mazda 2.3 MZR 16V', Vd: 2.3, cyl: 4, redline: 6800, rc: 10.0, etaPeak: 0.91, peakRpm: 4600, price: 220, kg: 6,
    desc: 'Större 2,3-liters MZR-fyra från Mazda 3/6 – betydligt starkare ut ur grushårnålarna.' },
  opel_20_16v: { id: 'opel_20_16v', name: 'Opel 2.0 16V (X20XEV / C20XE)', Vd: 2.0, cyl: 4, redline: 7000, rc: 10.2, etaPeak: 0.91, peakRpm: 5000, price: 0, kg: 0,
    desc: 'Klassisk 2,0 16V Opel-motor – populär både i Astra/Vectra (Vetari) och som motorbyte i Kardaani/Super.' },
  opel_25_v6: { id: 'opel_25_v6', name: 'Opel 2.5 V6 24V (X25XE)', Vd: 2.5, cyl: 6, redline: 6800, rc: 10.0, etaPeak: 0.90, peakRpm: 4700, price: 240, kg: 22,
    desc: '2,5-liters 24V V6 från Vectra/Calibra – fylligt vrid utan turbo.' },
  vag_18_20v: { id: 'vag_18_20v', name: 'VW/Audi 1.8 20V (5 ventiler/cyl)', Vd: 1.8, cyl: 4, redline: 6800, rc: 10.3, etaPeak: 0.90, peakRpm: 4800, price: 0, kg: 0,
    desc: '20-ventilers 1,8-fyra i Passat B5 / Audi A4.' },
  vag_28_v6: { id: 'vag_28_v6', name: 'VW/Audi 2.8 V6 30V', Vd: 2.8, cyl: 6, redline: 6800, rc: 10.3, etaPeak: 0.91, peakRpm: 4800, price: 280, kg: 26,
    desc: '2,8-liters 30V V6 – körs både i framhjulsdriven Passat B5 (Vetari) och i 4WD→RWD-ombyggda Passat/A4 i Kardaani!' },
  volvo_b5252_140: { id: 'volvo_b5252_140', name: 'Volvo 2.4/2.5 10V 5-cyl (140 hk)', Vd: 2.4, cyl: 5, redline: 6200, rc: 10.0, etaPeak: 0.87, peakRpm: 4200, price: 0, kg: 0,
    desc: 'Femcylindrig 10-ventilare i Volvo 850/S70/V70 med brett bottenregister.' },
  volvo_b5254: { id: 'volvo_b5254', name: 'Volvo 2.5 20V 5-cyl (170 hk B5254S)', Vd: 2.5, cyl: 5, redline: 6700, rc: 10.3, etaPeak: 0.92, peakRpm: 4900, price: 210, kg: 8,
    desc: '20-ventilers femcylindrig sugmotor (170 hk original) från Volvo 850/S70/V70 – en favorit i Vetari!' },
  mondeo_20: { id: 'mondeo_20', name: 'Ford 2.0 16V Zetec / Duratec', Vd: 2.0, cyl: 4, redline: 6700, rc: 9.8, etaPeak: 0.88, peakRpm: 4500, price: 0, kg: -24,
    desc: 'Lättare 2,0-liters fyrcylindrig sugmotor i Mondeo.' },
  mondeo_25_v6: { id: 'mondeo_25_v6', name: 'Ford 2.5 V6 24V Duratec', Vd: 2.5, cyl: 6, redline: 6800, rc: 9.7, etaPeak: 0.89, peakRpm: 4600, price: 0, kg: 0,
    desc: '2,5-liters Duratec V6 med starkt mellanregister.' },
  mondeo_st220: { id: 'mondeo_st220', name: 'Ford Mondeo ST220 3.0 V6 24V', Vd: 3.0, cyl: 6, redline: 7000, rc: 10.0, etaPeak: 0.92, peakRpm: 5100, price: 340, kg: 10,
    desc: 'ST220:s 3,0-liters Duratec V6 – ett av de starkaste sugmotoralternativen i Vetari!' },

  // Kardaani & Super-motorer / Motorbyten (Tekniikanvaihto)
  opel_cih_20: { id: 'opel_cih_20', name: 'Opel 2.0 CIH / OHC', Vd: 2.0, cyl: 4, redline: 6300, rc: 9.4, etaPeak: 0.86, peakRpm: 4000, price: 0, kg: 0,
    desc: 'Klassisk Opel 2,0-motor i Kadett C / Ascona B.' },
  sierra_pinto: { id: 'sierra_pinto', name: 'Ford 2.0 OHC Pinto', Vd: 2.0, cyl: 4, redline: 6400, rc: 9.4, etaPeak: 0.87, peakRpm: 4100, price: 0, kg: 0,
    desc: 'Klassisk enkelkam-Pinto (2,0 OHC) i Ford Sierra – lättmeckad och stryktålig.' },
  sierra_dohc: { id: 'sierra_dohc', name: 'Ford 2.0 DOHC 8V/16V', Vd: 2.0, cyl: 4, redline: 6700, rc: 9.8, etaPeak: 0.90, peakRpm: 4600, price: 170, kg: 2,
    desc: '2,0 DOHC-motor till Sierra med bättre andning på högre varv.' },
  volvo_b230: { id: 'volvo_b230', name: 'Volvo 2.3 Rödblock (B23 / B230)', Vd: 2.3, cyl: 4, redline: 6200, rc: 9.8, etaPeak: 0.89, peakRpm: 4100, price: 0, kg: 0,
    desc: '2,3-liters Volvo rödblock (B23/B230) – odödlig klassiker i 240/740/940.' },
  volvo_b230_folkrace: { id: 'volvo_b230_folkrace', name: 'Trimmat Volvo 2.3 B230 (531-topp & H-kam)', Vd: 2.3, cyl: 4, redline: 6900, rc: 10.5, etaPeak: 0.93, peakRpm: 5100, price: 260, kg: 0,
    desc: 'Portad 531-topp, vass kam och Weber/extraktor på 2,3-liters B230 rödblock.' },
  volvo_b230_bmwbox: { id: 'volvo_b230_bmwbox', name: 'Motorbyte: Volvo 2.3 B230 + BMW ZF/Getrag-låda', Vd: 2.3, cyl: 4, redline: 6900, rc: 10.2, etaPeak: 0.93, peakRpm: 5000, price: 320, kg: 8, shift: 0.16,
    desc: 'Dokumenterad kombination i bl.a. Ascona och Sierra: 2,3-liters Volvo rödblock ihopsatt med en tätstegad BMW-växellåda!' },
  bmw_m50b20: { id: 'bmw_m50b20', name: 'BMW 2.0 Rak Sexa (M50B20 / M52B20)', Vd: 2.0, cyl: 6, redline: 6900, rc: 10.5, etaPeak: 0.90, peakRpm: 5000, price: 0, kg: -8,
    desc: '2,0-liters 24V rak sexa i E36/E46 – varvvillig men mindre vrid än 2,5/2,8.' },
  bmw_m50b25: { id: 'bmw_m50b25', name: 'BMW 2.5 Rak Sexa (M50B25 / M52B25)', Vd: 2.5, cyl: 6, redline: 6900, rc: 10.0, etaPeak: 0.92, peakRpm: 4900, price: 220, kg: 0,
    desc: '2,5-liters 24V M50/M52 rak sexa – en av de populäraste motorerna i Kardaani och vid motorbyten.' },
  bmw_m52b28: { id: 'bmw_m52b28', name: 'BMW 2.8 Rak Sexa (M52B28)', Vd: 2.8, cyl: 6, redline: 6800, rc: 10.2, etaPeak: 0.92, peakRpm: 4800, price: 310, kg: 2,
    desc: '2,8-liters M52B28 med aluminiumblock – stort sugmoment ur varje kurva.' },
  bmw_m54b30: { id: 'bmw_m54b30', name: 'BMW 3.0 Rak Sexa (M54B30)', Vd: 3.0, cyl: 6, redline: 7000, rc: 10.2, etaPeak: 0.94, peakRpm: 5200, price: 420, kg: 4,
    desc: '3,0-liters M54B30 rak sexa från E46 330i – toppvalet bland raka BMW-sexor i Kardaani och Super!' },
  sierra_cosworth: { id: 'sierra_cosworth', name: 'Ford 2.0 16V YB Cosworth Turbo (Super)', Vd: 2.0, cyl: 4, redline: 7200, rc: 8.3, etaPeak: 0.92, peakRpm: 5000, price: 380, kg: 6, boost: 0.7,
    desc: 'Överladdad 2,0 16V YB-turbomotor för Super-luokka.' },
  volvo_v8_44: { id: 'volvo_v8_44', name: 'Motorbyte: 4.4 V8 Sugmotor (Super 2026)', Vd: 4.4, cyl: 8, redline: 6700, rc: 10.2, etaPeak: 0.92, peakRpm: 4600, price: 480, kg: 35,
    desc: 'Rapporterad i V8-Volvo i Super under 2026! 4,4-liters V8 med enormt vridmoment genom hela registret.' },
};

// Bygget: exakt vad som krävs enligt Sääntökirja 2026 & Kaaret-ritningarna för att gå igenom alkukatsastus.
export const BUILD = [
  { id: 'strip', name: '1. Rensa, täta & dörrplåt', price: 40, kg: -65,
    desc: 'Alla lampor, grill och sköra plastdelar bort (plaststötfångare får sitta kvar). Inredning ut, ev. taklucka täcks med plåt, inget uretan, motorhuv fästs med sprintar (sokat). Förardörren får EJ lättas och dörrsidan ersätts med ≥0,5 mm metallplåt (≥20 popnit/borrskruv). Polykarbonat/folierad sidoruta, hel vindruta, bogseröglor, 1,5 l oljeuppsamlingskärl, täta brandväggar (tulipellit), inkapslad tank/batteri, stänkskydd och 21W broms-/bakljus.' },
  { id: 'cage', name: '2. Turvakaaret (42/48×2,5 mm)', price: 450, kg: 44, req: 'strip',
    desc: 'Bockade rör min 42×2,5 mm eller svetsade böjar min 48×2,5 mm, 100 % svetsfog. Huvudbåge med tvärrör nere (1) och bakåtsträvor (2), frambågar längs A-stolpar (3) med tvärrör vid vindrutan (4), takrör (5, 7), diagonalstag (8), 4 karossfästen ≥50 mm (9), max 70 mm till kaross vid förarstolpe (10), två dörrsträvor i förardörren (6) + en i passagerardörren, samt 200×200×3 mm golvplattor med ≥50 % svets (11).' },
  { id: 'seat', name: '3. Kuppipenkki, bälten & nackskydd', price: 280, kg: -6, req: 'strip',
    desc: 'Hel skålad stol (kuppipenkki), hela minst 4-punktsbälten (axelbälten 0–45° nedåt), CE-märkt hjälm, obligatoriskt nackskydd (niskatuki i alla klasser) samt heltäckande klädsel och handskar (nylonoverall förbjuden).' },
  { id: 'net', name: '4. Nascar-verkko i förardörren', price: 45, kg: 1, req: 'cage',
    desc: 'Obligatoriskt i alla klasser sedan 2024! Fästs i burrören (ej i dörren!) på minst 4 punkter bakom rattlinjen så att förarens hand inte kan komma ut ur bilen.' },
  { id: 'switch', name: '5. Alkukatsastus, kortti & nummer', price: 50, kg: 0, req: 'net',
    desc: 'Alkukatsastuslomake ifylld, besiktningsnummer instansat/svetsat på höger dörrsträva eller bursko, matta/presenning under bilen + 6 kg pulversläckare i depån. Tävlingsnummer (svart på vitt eller vitt på svart) i bakre sidorutorna (min 20 cm – ej på dörren!), framrutan på passagerarsidan och bakrutan (min 10 cm).' },
];

export const UPG = [
  { id: 'chip', name: 'Chiptrimning', komp: 'fyllnadsgrad', levels: [
    { name: 'Chiptrim (motorstyrning)', price: 329, fx: { tq: 0.12 }, desc: 'Omprogrammerad motorstyrning: ca +12 % vridmoment och effekt i hela registret.' } ] },
  { id: 'superkit', name: 'Super-luokan utrustning (krävs för Super)', komp: 'kaaret', levels: [
    { name: 'Super-kaaret, 6-punktsbälte & sidospeglar', price: 1100, fx: { superReady: 1, kg: 8, dmg: 0.92 },
      desc: 'Uppgraderar buren till Super-luokan kaaret: stolpar fästa på 8 ställen à ≥50 mm (9), takkryss (kattoristikko, 7) och hörntrianglar (11). 6-punktsbälte med grenbälteshål i stolen, sidospeglar på båda sidor, representativ kaross (siisti) och S framför numret.' } ] },
  { id: 'insug', name: 'Insug', komp: 'fyllnadsgrad', levels: [
    { name: 'Öppet sportfilter', price: 60, fx: { eta: 0.025 }, desc: 'Mindre strypning före spjället. Fyllnadsgraden ηV stiger ett par procent i hela registret. Tillåtet i alla klasser.' },
    { name: 'Portat insug & större spjällhus', price: 350, fx: { eta: 0.055, peak: 250 }, desc: 'Slipade kanaler och större spjällhus. ηV +5,5 % och toppen flyttas 250 rpm uppåt. Tillåtet i alla klasser (viritysaste vapaa).' } ] },
  { id: 'kam', name: 'Kamaxel', komp: 'fyllnadsgrad', levels: [
    { name: 'Sportkam', price: 300, fx: { eta: 0.02, peak: 600, red: 400 }, desc: 'Längre öppettider flyttar ηV-toppen +600 rpm och höjer varvgränsen 400 rpm. P = T·ω ökar på höga varv.' },
    { name: 'Racekam & hårdare ventilfjädrar', price: 650, fx: { eta: 0.04, peak: 1100, red: 800, low: 0.05 }, desc: 'ηV-toppen +1 100 rpm och varvgränsen +800 rpm. Viktigaste effektvägen i Vetari och Kardaani där turbo är förbjudet!' } ] },
  { id: 'avgas', name: 'Avgassystem (max 110 dB @ 4 500 rpm)', komp: 'pumpforlust', levels: [
    { name: '2,5" rör bakom B-stolpen & fullflödesdämpare', price: 180, fx: { pmep: 0.6, eta: 0.015 },
      desc: 'Enligt reglerna måste avgasröret gå förbi B-stolpen och klara max 110 dB vid 4 500 rpm (mätt 50 cm höjd, 45° vinkel, 50 cm avstånd). Sänker mottrycket pe och PMEP.' },
    { name: 'Extraktorgrenrör 4-2-1 & dämpare (≤110 dB)', price: 450, fx: { pmep: 0.4, eta: 0.035 },
      desc: 'Avstämda rörlängder hjälper till att tömma cylindern samtidigt som ljudgränsen 110 dB hålls under hela tävlingsdagen.' } ] },
  { id: 'turbo', name: 'Turbo (endast tillåtet i Super Rock!)', komp: 'turbo', onlySuper: true, levels: [
    { name: 'Skrotturbo 0,4 bar', price: 400, fx: { boost: 0.4, bs: 2800, bf: 4000 }, desc: 'ENDASТ SUPER-LUOKKA (i myyntiluokat är turbo och lustgas förbjudna!). Högre insugstryck pi ger tätare luft och större FUELMEP.' },
    { name: 'Större turbo 0,8 bar', price: 900, fx: { boost: 0.8, bs: 3200, bf: 4400 }, desc: 'ENDAST SUPER-LUOKKA. Dubbla laddtrycket. Laddluften blir het (T2) – intercooler och fetare blandning behövs för knackmarginalen.' },
    { name: 'Hybridturbo 1,2 bar', price: 1800, fx: { boost: 1.2, bs: 3600, bf: 5000 }, desc: 'ENDAST SUPER-LUOKKA. Mest effekt, mest värme, mest knackrisk. Lustgas (ilokaasu) är förbjudet även i Super!' } ] },
  { id: 'ic', name: 'Intercooler (Super Rock)', komp: 'turbo', needsTurbo: true, onlySuper: true, levels: [
    { name: 'Luft-luftkylare', price: 250, fx: { ic: 0.6 }, desc: 'Verkningsgrad ε = 0,6. Kallare laddluft Ti ger högre densitet ρi och bättre knackmarginal.' },
    { name: 'Stor frontmonterad', price: 450, fx: { ic: 0.82 }, desc: 'ε = 0,82: laddluften kommer nära utetemperatur. Sitter utsatt – skydda fronten.' } ] },
  { id: 'styr', name: 'Motorstyrning', komp: 'tandning', levels: [
    { name: 'Justerbar tändning', price: 80, fx: { ignMax: 10 }, desc: 'Tändläget kan ställas upp till +10° i Trimning (annars +5°).' },
    { name: 'Programmerbart sprut & knackreglering', price: 1200, fx: { ignMax: 10, knockCtl: 1 }, desc: 'Knackgivaren backar tändningen automatiskt så att marginalen hålls ≥ 0. Kostar lite verkningsgrad, sparar kolvar.' } ] },
  { id: 'kyl', name: 'Kylning', komp: 'kylning', levels: [
    { name: 'Större kylare & tvärgående fäströr (20×50×2 mm)', price: 120, fx: { cool: 16 },
      desc: 'Mellan framskärmarnas överkant får man sätta 1 st max 20×50×2 mm rör för kylare och huvlås (får ej stagas bakåt). +16 kW kylkapacitet.' },
    { name: 'Kylaren flyttad bak + extra fläkt', price: 250, fx: { cool: 24, radSafe: 1 },
      desc: 'Kylaren sitter skyddad bakom kupén. Extra fläkt märks i katsastuskortti (och får då plockas ur vid myyntitilaisuus!). +24 kW och skyddad vid frontsmällar.' },
    { name: 'Racingkylare i aluminium (dubbelrad) + 2 elfläktar', price: 650, fx: { cool: 42, radSafe: 1 },
      desc: 'Tjock dubbelradig aluminiumkylare bakom kupén med två termostatstyrda elfläktar och oljekylare. +42 kW kylkapacitet – motorn håller temperaturen även i långa heat med full gas, och kylaren är skyddad vid frontsmällar.' } ] },
  { id: 'rokkivaxel', name: '2½-växel på femmans plats', komp: 'utvaxling', levels: [
    { name: '2½-växel på femmans plats', price: 300, fx: { halfGear: 1 },
      desc: 'Vanligt i myyntiluokat: i hög fart varvar tvåan för högt och trean är nästan för lång för en klen motor. Femmans drev byts mot ett drev mellan tvåan och trean, så man växlar 2 → 5 (2½) och håller motorn vid maxeffekten på rakorna. Super-bilar med mycket effekt kör i stället trean som effektiv växel.' } ] },
  { id: 'vaxel', name: 'Växellåda', komp: 'utvaxling', levels: [
    { name: 'Kort slutväxel', price: 200, fx: { final: 1.12 }, desc: 'Slutväxeln 12 % kortare. Mer drivkraft i varje växel (F = T·i/r), lägre toppfart – rätt val på rokkibanor.' },
    { name: 'Kort slutväxel & tätstegad låda', price: 700, fx: { final: 1.12, shift: 0.14, eff: 0.02 }, desc: 'Kortare växelväg halverar växlingstiden och drivlinan förlorar mindre.' } ] },
  { id: 'awd', name: 'Fyrhjulsdrift (endast Super)', komp: 'drivning', onlySuper: true, levels: [
    { name: 'Fyrhjulsdrift med mittdiff (40/60)', price: 4500, fx: { awd: 1, kg: 75, eff: -0.03 },
      desc: 'Kraften går till alla fyra hjulen, så nästan hela bilens vikt kan användas för att dra. Med mycket effekt är det skillnaden mellan hjulspinn och att flyga ut ur kurvorna. +75 kg, lite större förluster i drivlinan. Bara i Super.' } ] },
  { id: 'fourlink', name: '4-link bakaxel', komp: 'drivning', needsDriven: 'rear', levels: [
    { name: '4-link bakaxelupphängning', price: 650, fx: { fourlink: 1, kg: 6 },
      desc: 'Fyra länkarmar (två nedre, två övre) med panhardstag håller den stela bakaxeln exakt på plats i stället för bladfjädrar/originalstag. Axeln vrider sig inte vid gaspådrag (ingen "axle hop"), anti-squat trycker ner bakhjulen och bakaxeln styr inte själv i gupp: bättre dragkraft ut ur kurvorna, stabilare bakvagn och mer grepp mot marken. Bara för bakhjuls- och fyrhjulsdrivna bilar.' } ] },
  { id: 'diff', name: 'Differential (Lukkoperä)', komp: 'drivning', rwdOrSuper: true, levels: [
    { name: 'Svetsad diff / Lukkoperä', price: 50, fx: { trac: 1 },
      desc: 'REGEL: Lukkoperä är ENDAST tillåten i bakhjulsdrivna bilar (Kardaani) samt i Super-luokka (där den även är tillåten på framhjulsdrivna bilar). Förbjuden på framhjulsdrivna Vetari-bilar!' } ] },
  { id: 'vikt', name: 'Lättning & Kaross (förardörren får EJ lättas!)', komp: 'kghk', levels: [
    { name: 'Polykarbonat-/akrylrutor runt om (ej vindruta)', price: 220, fx: { kg: -22 },
      desc: '−22 kg. Förardörrens sidoruta i polykarbonat eller nät + akryl. Vindrutan måste vara kvar och framsidorutor får ej mörktonas!' },
    { name: 'Lättad passagerardörr, huv & baklucka', price: 120, fx: { kg: -45 },
      desc: '−45 kg totalt. OBS: Förardörrens bärande struktur får ENLIGT REGEL INTE lättas (har den lättats måste minst 1 mm plåt svetsas dit)!' },
    { name: 'Farmariauton typistys / lättad bakände', price: 80, fx: { kg: -80, chop: 1 },
      desc: '−80 kg totalt. På kombibil får D-stolpen tas bort och bakänden kapas bakom hjulhusen längs sidolinjen om C-stolpen förstärks med hjälpbåge av burrörsmaterial (50 % svetsfog)!' } ] },
  { id: 'dack', name: 'Däck (Renkaat)', komp: 'grepp', levels: [
    { name: 'Nya gatgodkända däck / Rallydubbdäck (vinter)', price: 320, fx: { mu: 0.06 },
      desc: 'Tillåtna i alla klasser. I myyntiluokat är däckskärning förbjuden på sommaren och på vintern krävs rallydubbdäck (ruusu- och sorvinastat förbjudna!).' },
    { name: 'Grovmönstrade E-märkta gatdäck', price: 400, fx: { mu: 0.12 },
      desc: 'Bästa tillåtna däcken i Vetari, Kardaani, Junior, Lady och Senior (katuliikenteeseen hyväksytyt renkaat). Grepp +12 %. Får tas bort vid försäljning om hela reservhjul sätts dit!' },
    { name: 'Rallirenkaat & sliksit (endast Super Rock!)', price: 900, fx: { mu: 0.21, rallyTire: 1 }, onlySuper: true,
      desc: 'ENDAST SUPER-LUOKKA: Riktiga rallydäck och slicks är tillåtna i Super Rock och Super Senior (däckvärmare förbjudna). Grepp +21 %!' } ] },
  { id: 'fjad', name: 'Chassi & Fjädring (Auton alustaa saa muuttaa)', komp: 'grepp', levels: [
    { name: 'Höjd & styvare fjädring', price: 250, fx: { susp: 0.5 }, desc: 'Chassit får ändras fritt i alla klasser. Bilen studsar mindre och tappar inte lika mycket grepp.' },
    { name: 'Rallydämpare & spacere', price: 900, fx: { susp: 1, mu: 0.04 }, desc: 'Däcken hålls i marken över gupp (+4 % grepp). Spacere får plockas bort vid myyntitilaisuus!' } ] },
  { id: 'broms', name: 'Bromsar', komp: 'grepp', levels: [
    { name: 'Hårdare belägg & justerbar bromsbalans', price: 180, fx: { brake: 0.12 }, desc: 'Bromskraften +12 % och bromsbalansen kan ställas i Trimning. Fungerande 21W bromsljus bak krävs.' } ] },
  { id: 'skydd', name: 'Pohjapanssari & Keulan vahvistus', komp: 'regler', levels: [
    { name: 'Pohjapanssari (fäst med ≥2 st M10-bultar)', price: 150, fx: { dmg: 0.72, kg: 10 },
      desc: 'Hasplåt fäst med minst 2 st M10-bultar i fästbalk direkt framför kylaren/motorn. Får ej gå förbi röret mellan rambenen eller bilda stötfångare. Skador −28 %.' },
    { name: 'Keulan vahvistus innanför rambenen', price: 90, fx: { dmg: 0.45, kg: 24 },
      desc: 'Endast innanför rambenens yttermått: 1 st max 60×60×3 mm (eller Ø60 mm) rör + 2 vertikala möbelrör (max 2 mm gods) vid rambenen, klätt med max 1,5 mm plåt/stålnät. Inga balkar utanför rambenen! Skador −55 %.' } ] },
];

export const FUELS = [
  { id: 'b95', name: 'Bensin 95', short: '95', price: 0, knock: 11.5, lhv: 43.0, afs: 14.5, cool: 4,
    desc: 'Standardbränsle. Räcker gott till en sugmotor med originalkompression.' },
  { id: 'b98', name: 'Bensin 98', short: '98', price: 120, knock: 12.4, lhv: 43.0, afs: 14.5, cool: 4,
    desc: 'Högre oktantal tål mer laddtryck och tidigare tändning. Samma värmevärde som 95.' },
  { id: 'e85', name: 'E85', short: 'E85', price: 350, knock: 14.2, lhv: 29.0, afs: 9.8, cool: 14,
    desc: 'Etanolen kyler laddningen kraftigt när den förångas. Perfekt både för högkompade sugmotorer och Super-turbobilar.' },
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

// Banor. Tammisaari (Grabbskogin Rata) och Rantasalmi (RUA) är exakt modellerade efter de officiella banprofilerna!
export const TRACKS = [
  {
    id: 'tammisaari',
    name: 'Tammisaari – Grabbskogin Rata',
    addr: 'Tenholantie 416, 10620 Tammisaari (E-TMK/UA)',
    surface: 'grus',
    width: 12,
    info: [
      'Grabbskogin Rata (E-TMK/UA), Tenholantie 416, 10620 Tammisaari',
      'Banlängd ca 800 m (moturs)',
      'Asfalterade partier (streckade i banprofilen): Startrakan (L → 7), norra kurvan (post 3) och västra hårnålen (före post 5)',
      'Normalrutt: den yttre slingan förbi PL och post 6. Lisälenkki: den raka innerrutten från post 5 som ansluter före mål (M)',
    ],
    // Kontrollpunkter [x, z, bredd(m), underlag('grus'|'asfalt')] i moturs varvriktning med start vid post 7 / L-sammanfogningen
    waypoints: [
      [-36,  97, 13.0, 'asfalt'], // 0: Startrakan vid post 7 (LH) och L (Lähtö)
      [  0,  97, 12.5, 'asfalt'], // 1: Asfalt övergår i grus
      [ 38,  94, 12.0, 'grus'],   // 2: Södra rakan mot post 1
      [ 74,  80, 12.5, 'grus'],   // 3: Post 1 (EP / Kioski)
      [108,  42, 12.5, 'grus'],   // 4: Östra bågen uppåt
      [118, -10, 12.0, 'grus'],   // 5: Post 2 (EP)
      [ 90, -66, 12.0, 'grus'],   // 6: Infart mot norra spetsen
      [ 48,-102, 12.5, 'asfalt'], // 7: Post 3 (EP) – asfalterad nordkurva
      [  8, -90, 12.0, 'asfalt'], // 8: Utgång ur kurva 3
      [-38, -74, 11.5, 'grus'],   // 9: Post 4 – övre rakan
      [-95, -60, 11.5, 'grus'],   // 10: Mot västra hårnålen (EP)
      [-136,-33, 12.5, 'asfalt'], // 11: Ingång västra hårnålen (asfalt)
      [-138,  8, 12.5, 'asfalt'], // 12: Utgång västra hårnålen (Hinaus-väg)
      [-98,  18, 12.0, 'grus'],   // 13: Post 5 – här delar sig banan (normalrutt = den yttre slingan, lisälenkki = den raka innerrutten)
      [-82,  13, 12.0, 'grus'],   // 14: Normalrutten svänger ut mot norr
      [-67,   4, 12.0, 'grus'],   // 15
      [-50,   0, 12.0, 'grus'],   // 16: Slingans yttersta punkt (förbi PL)
      [-33,   4, 12.0, 'grus'],   // 17
      [-22,  11, 12.0, 'grus'],   // 18: Post 6
      [-15,  21, 11.5, 'grus'],   // 19
      [-12,  31, 11.5, 'grus'],   // 20
      [-14,  42, 11.5, 'grus'],   // 21: Lisälenkki ansluter igen
      [-36,  64, 12.0, 'grus'],   // 22: M = Maali (mellan Toimisto och Johto) – mållinjen
      [-50,  84, 12.5, 'asfalt'], // 23: Kurva in mot post 7 / startrakan
    ],
    // Lisälenkki: den raka innerrutten mellan post 5 och anslutningen före M (normalrutten är den yttre slingan förbi PL och post 6)
    customJoker: { startFrac: 0.7623, endFrac: 0.9069, side: 1, D: 18.5, w: 8.5, uShape: true, skew: -0.15 },
    startChute: { x0: -108, z0: 95, x1: -38, z1: 95, w: 13.5, surface: 'asfalt', label: 'L (KERÄILY)' },
    finishFrac: 0.9436,
    posts: [
      { n: '1', x: 74, z: 90 }, { n: '2', x: 96, z: -10 }, { n: '3', x: 42, z: -82 },
      { n: '4', x: -42, z: -58 }, { n: '5', x: -102, z: 6 }, { n: 'PL', x: -60, z: 6 },
      { n: '6', x: -22, z: 8 }, { n: '7', x: -38, z: 108 },
    ],
    buildings: [
      { name: 'TUOMARISTO / TORNISSA', x: -72, z: 112, sx: 22, sz: 8, sy: 5.2, col: [0.75, 0.20, 0.15, 1] },
      { name: 'TOIMISTO & OSTOTARJ.', x: -68, z: 60, sx: 12, sz: 18, sy: 3.2, col: [0.85, 0.82, 0.72, 1] },
      { name: 'JOHTO.', x: -8, z: 66, sx: 11, sz: 9, sy: 3.0, col: [0.80, 0.78, 0.70, 1] },
      { name: 'KIOSKI', x: 98, z: 88, sx: 8, sz: 6, sy: 2.8, col: [0.22, 0.38, 0.58, 1] },
    ],
  },
  {
    id: 'rantasalmi',
    name: 'Rantasalmi (RUA)',
    addr: 'Joroistentie 314, 58900 Rantasalmi',
    surface: 'grus',
    width: 15,
    info: [
      'Lähtöalue on päällystettyä asfalttia, josta siirrytään soralle ennen tuomaritornia',
      'Radan pituus vajaa kilometri (~950 m)',
      'Kapein kohta 12 m, levein kohta 22 m',
      'Kahden kierroksen erään sisältyy kestopäällystettä 235 metriä',
    ],
    // Kontrollpunkter [x, z, bredd(m), underlag('grus'|'asfalt')] i moturs varvriktning
    // Bredd varierar exakt mellan 12 m (kapein kohta vid S-kurvan 5–6) och 22 m (levein kohta i östra kurvan vid post 2)!
    waypoints: [
      [-42,  79, 16.0, 'grus'],   // 0: M (Maali) & tuomaritorni (precis efter asfaltens slut)
      [ 28,  96, 15.0, 'grus'],   // 1: Södra rakan före post 1.
      [101, 101, 16.5, 'grus'],   // 2: Post 1.
      [166,  85, 19.5, 'grus'],   // 3: Ingång östra kurvan
      [199,  39, 22.0, 'grus'],   // 4: Post 2. – LEVEIN KOHTA 22 m!
      [173, -11, 18.5, 'grus'],   // 5: Utgång ur kurva 2.
      [123, -18, 15.0, 'grus'],   // 6: Början på Sakkolenkki-rakan
      [ 72, -20, 14.5, 'grus'],   // 7: Förbi post 3. (Sakkolenkki viker av söderut runt 3.!)
      [ 20, -22, 14.0, 'grus'],   // 8: Post 4. (Sakkolenkki ansluter)
      [-20, -31, 12.2, 'asfalt'], // 9: Post 5. – KESTOPÄÄLLYSTE (asfalt) börjar, KAPEIN KOHTA 12 m!
      [-37, -61, 12.0, 'asfalt'], // 10: S-kurvan i asfalt (12 m bred)
      [-26, -96, 12.0, 'asfalt'], // 11: Post 6. – S-kurvans övre del i asfalt (12 m bred)
      [-60,-123, 15.5, 'grus'],   // 12: Övergång till grus efter post 6.
      [-114,-127,17.5, 'grus'],   // 13: Norra bågen runt post 7.
      [-145, -96,17.0, 'grus'],   // 14: Post 7. vändning
      [-112, -52,14.5, 'grus'],   // 15: Mellanrakan ner mot post 8.
      [-81,   9, 14.5, 'grus'],   // 16: Före post 8.
      [-64,  53, 16.5, 'asfalt'], // 17: Post 8. – Lähtöalueen asfaltti (fram till före tuomaritorni)
    ],
    // Sakkolenkki: Röd U-formad slinga som viker av inåt/söderut runt post 3. (mellan punkt 6 och 8)
    customJoker: { startFrac: 0.41, endFrac: 0.56, side: -1, D: 44.0, w: 11.0, uShape: true },
    startChute: { x0: -138, z0: 33, x1: -50, z1: 72, w: 18.0, surface: 'asfalt', label: 'L (ASFALTTI)' },
    finishFrac: 0.0,
    posts: [
      { n: '1.', x: 90, z: 79 }, { n: '2.', x: 166, z: 39 }, { n: '3.', x: 72, z: 6 },
      { n: '4.', x: 20, z: -4 }, { n: '5.', x: -9, z: -55 }, { n: '6.', x: -53, z: -83 },
      { n: '7.', x: -112, z: -98 }, { n: '8.', x: -53, z: 26 },
    ],
    buildings: [
      { name: 'TUOMARITORNI', x: -50, z: 94, sx: 6, sz: 6, sy: 6.0, col: [0.75, 0.20, 0.15, 1] },
      { name: 'KATSASTUS / VARIKKO', x: -115, z: 72, sx: 14, sz: 8, sy: 3.4, col: [0.82, 0.80, 0.72, 1] },
      { name: 'YLEISÖ / AUTOKATSOMO', x: -90, z: -148, sx: 24, sz: 6, sy: 2.5, col: [0.25, 0.38, 0.55, 1] },
    ],
  },
  {
    id: 'pihtipudas',
    name: 'Pihtipudas',
    addr: 'Haapavuorentie 145, 44800 Pihtipudas',
    surface: 'grus',
    width: 13.5,
    info: [
      '1994 ajettu JM Naisten SM ja 2002 JM SM Liigafinaali',
      'Rata on 920 m pitkä',
      'n. 20 % pinnoitettu (~184 m), lähtölaatta ja pari mutkaa asfalttia',
      'Korkeuseroja on vähän · Lähtölaatalle mahtuu 7 autoa rinnakkain · Varikko nurmipintainen',
    ],
    // Exakt hästsko-/M-profil enligt flygfotot från Haapavuorentie 145 (920 m totalt, ~20 % belagd i kurvorna + lähtölaatta)
    waypoints: [
      [-37, -55, 15.0, 'asfalt'], // 0: Sammanfogning från den breda asfalterade lähtölaattan (7 bilar i bredd)
      [-88, -14, 13.5, 'grus'],   // 1: Västra ytterkurvan söderut
      [-99,  60, 13.0, 'grus'],   // 2: Västra rakan söderut
      [-88, 132, 13.0, 'grus'],   // 3: Ingång sydvästra vändningen
      [-48, 155, 13.5, 'asfalt'], // 4: Sydvästra hårnålen (belagd kurva 1)
      [ -9, 120, 12.5, 'grus'],   // 5: Utgång sydvästra hårnålen
      [-25,  51, 12.0, 'grus'],   // 6: Inre rakan norrut mot mittkurvan
      [-16,  -7, 12.5, 'asfalt'], // 7: Inre högerhårnålen i mitten (belagd kurva 2)
      [ 30,  -2, 12.5, 'grus'],   // 8: Utgång mittkurvan mot sydost
      [ 76,  48, 12.5, 'grus'],   // 9: Inre rakan mot sydöstra slingan
      [125,  83, 13.0, 'grus'],   // 10: Ingång sydöstra hårnålen
      [157,  60, 13.5, 'grus'],   // 11: Sydöstra vändningen
      [132,   9, 13.0, 'grus'],   // 12: Östra ytterbågen norrut
      [ 74, -39, 13.5, 'grus'],   // 13: Nordöstra rakan förbi varikko
      [ 14, -60, 14.0, 'grus'],   // 14: Mållinje M före lähtölaattan
    ],
    customJoker: { startFrac: 0.78, endFrac: 0.92, side: 1, D: 18.0, w: 8.5, skew: 0 },
    startChute: { x0: 62, z0: -99, x1: -37, z1: -55, w: 16.0, surface: 'asfalt', label: 'LÄHTÖLAATTA (7 AUTOA)' },
    finishFrac: 0.93,
    posts: [
      { n: '1', x: -74, z: -2 }, { n: '2', x: -78, z: 99 }, { n: '3', x: -44, z: 136 },
      { n: '4', x: -2, z: 14 }, { n: '5', x: 136, z: 55 }, { n: '6', x: 88, z: -23 },
    ],
    buildings: [
      { name: 'TUOMARITORNI', x: 32, z: -78, sx: 6, sz: 6, sy: 5.5, col: [0.75, 0.22, 0.16, 1] },
      { name: 'VARIKKO (NURMIKKO)', x: 99, z: -102, sx: 18, sz: 10, sy: 3.0, col: [0.32, 0.48, 0.28, 1] },
    ],
  },
  {
    id: 'pieksamaki',
    name: 'Pieksämäki – Paltasen autourheilukeskus',
    addr: 'Järvisuomentie 2000, 76100 Pieksämäki',
    surface: 'grus',
    width: 15,
    info: [
      'Valmistunut 1977, päivitetty 1986, uusiutunut 2017 (Paltasen autourheilukeskus)',
      'Lähtöön mahtuu 8 autoa rinnakkain · Leveys 18–12 m',
      'Ratatuomaripisteitä 7',
      'Pinta kesällä sora/asfaltti. Talvella sama rata, pinta lumi/jää',
    ],
    waypoints: [
      [ 22, 134, 18.0, 'asfalt'], // 0: LÄHTÖ (18 m bred asfalt – rymmer 8 bilar i bredd!)
      [ 83, 102, 17.0, 'asfalt'], // 1: Utgång ur startkurvan
      [107,  41, 15.5, 'grus'],   // 2: Högra rakan norrut (mittemot vita tuomaritorni)
      [ 88, -32, 15.0, 'grus'],   // 3: Sakkolenkki-sektionen på östra sidan
      [ 58,-100, 14.5, 'asfalt'], // 4: Ingång norra kurvan (belagd sektion)
      [  2,-136, 14.5, 'asfalt'], // 5: Norra spetsen
      [-68,-129, 14.0, 'grus'],   // 6: Nordvästra kurvan
      [-112,-90, 12.5, 'grus'],   // 7: Ingång S-chikanen i nordväst
      [-93, -49, 12.0, 'asfalt'], // 8: S-chikanens inre knix (smalast: 12 m!)
      [-120,-10, 13.0, 'grus'],   // 9: Utgång ur S-chikanen ut på västra långkurvan
      [-136, 51, 15.5, 'grus'],   // 10: Långa västra svepande gruskurvan
      [-105,112, 16.5, 'grus'],   // 11: Sydvästra kurvan
      [-44, 139, 17.5, 'asfalt'], // 12: Mållinje & asfalterad infart till startområdet
    ],
    customJoker: { startFrac: 0.14, endFrac: 0.30, side: -1, D: 18.5, w: 9.0, skew: 0 },
    finishFrac: 0.94,
    posts: [
      { n: '1', x: 92, z: 75 }, { n: '2', x: 78, z: 2 }, { n: '3', x: 51, z: -78 },
      { n: '4', x: -29, z: -117 }, { n: '5', x: -78, z: -68 }, { n: '6', x: -114, z: 34 }, { n: '7', x: -70, z: 117 },
    ],
    buildings: [
      { name: 'TUOMARITORNI (VALKOINEN)', x: 58, z: 22, sx: 6.5, sz: 6.5, sy: 7.5, col: [0.92, 0.94, 0.96, 1] },
      { name: 'VARIKKO', x: 142, z: 30, sx: 16, sz: 24, sy: 3.0, col: [0.75, 0.74, 0.70, 1] },
    ],
  },
  { id: 'vilppula', name: 'Vilppula', surface: 'grus', width: 13, shape: { R: 96, sx: 1.45, sz: 0.9, h: [[2, 0.10, 0.4], [3, 0.07, 1.2]] } },
  {
    id: 'joutsa',
    name: 'Joutsa – JoSeMoRan Moottorirata',
    addr: 'Röksäntie 169, Joutsa (Joutsan Seudun Ratakeskus)',
    surface: 'grus',
    width: 12,
    info: [
      'JoSeMoRan Moottorirata, Röksäntie 169 (Joutsan Seudun Ratakeskus)',
      'Radan pituus 800–1 000 m (~900 m)',
      'Leveys 12 m',
      'Päällyste: asfaltti 60 % (~540 m), sora 40 % (~360 m)',
    ],
    // Exakt profil enligt JoSeMoRa-kartan:
    // Lähdön järjestely & Lähtö -> Maali (post 6) -> östra rakan norrut -> SAKKOLENKKI uppe i nordost före post 1 ->
    // nordvästra hästskon (post 1 & 2) -> mellersta rakan förbi post 3 -> sydvästra slingan (post 4 & 5) tillbaka till Lähtö/Maali!
    waypoints: [
      [  61,  23, 12.0, 'asfalt'], // 0: Maali vid post 6 (strax norr om Lähtö och Lähdön järjestely)
      [  69, -54, 12.0, 'asfalt'], // 1: Östra huvudrakan norrut
      [  74,-131, 12.0, 'asfalt'], // 2: Sakkolenkki-sektionen uppe till höger före post 1
      [  28,-174, 12.0, 'grus'],   // 3: Post 1 – ingång i norra grusvallen
      [ -46,-169, 12.0, 'grus'],   // 4: Nordvästra kurvan
      [ -87,-118, 12.0, 'grus'],   // 5: Post 2 – utgång ur övre vänsterbågen
      [ -28, -79, 12.0, 'asfalt'], // 6: Inre högersvängen söderut (asfaltti)
      [ -44, -10, 12.0, 'asfalt'], // 7: Mellersta rakan förbi post 3 (röd prick)
      [ -87,  44, 12.0, 'grus'],   // 8: Ingång mot post 4 (sora)
      [-110, 100, 12.0, 'grus'],   // 9: Post 4 – sydvästra vändningen (sora)
      [ -61, 138, 12.0, 'asfalt'], // 10: Södra rakan österut mot post 5
      [   5, 131, 12.0, 'asfalt'], // 11: Post 5 (röd prick) – sväng upp mot Lähtö/Maali
      [  46,  84, 12.0, 'asfalt'], // 12: Förbi Lähtö upp till Maali (post 6)
    ],
    // Röd SAKKOLENKKI uppe i nordöstra hörnet före post 1
    customJoker: { startFrac: 0.08, endFrac: 0.24, side: 1, D: 24.0, w: 9.5, skew: -0.15 },
    startChute: { x0: 28, z0: 123, x1: 56, z1: 46, w: 12.0, surface: 'asfalt', label: 'LÄHTÖ' },
    finishFrac: 0.0,
    posts: [
      { n: '1', x: 31, z: -143 }, { n: '2', x: -61, z: -113 }, { n: '3', x: -66, z: -8 },
      { n: '4', x: -84, z: 95 }, { n: '5', x: -10, z: 110 }, { n: '6', x: 38, z: 23 },
    ],
    buildings: [
      { name: 'TUOMARISTO', x: 105, z: 10, sx: 6, sz: 14, sy: 5.0, col: [0.92, 0.82, 0.12, 1] },
      { name: 'LÄHETTÄJÄ', x: 61, z: 92, sx: 5, sz: 10, sy: 3.2, col: [0.92, 0.82, 0.12, 1] },
      { name: 'VARIKKO', x: -15, z: 194, sx: 36, sz: 16, sy: 3.0, col: [0.72, 0.70, 0.65, 1] },
    ],
  },
  {
    id: 'kouvola',
    name: 'Kouvola – Tykkimäen Moottorirata',
    addr: 'Tehontie 51, 45200 KOUVOLA',
    surface: 'grus',
    width: 15,
    info: [
      'Tykkimäen Moottorirata, Tehontie 51, 45200 Kouvola (Rakennettu 1979, Rokki-Rallia vuodesta 2000)',
      'Radan pituus 1 060 m · Leveys 12–18 m · Korkeusero 20 m',
      'Päällyste: sora 42 % (~445 m), asfaltti 58 % (~615 m)',
      'Sakkolenkki (röd) med Betonikaide vid utfarten, Lähtö nere till vänster och Maali på västra rakan',
    ],
    // Exakt profil enligt Tykkimäen Moottorirata-kartan (medurs varv från Lähtö/Maali rakt norrut på västra asfaltrakan):
    // Grå = Asvalttia (58 %), Orange = Soraa (42 %), Röd = Sakkolenkki
    waypoints: [
      [ -97,  52, 18.0, 'asfalt'], // 0: Maali på västra rakan (efter Lähtö längst nere till vänster, 18 m bred!)
      [ -97,   0, 17.0, 'asfalt'], // 1: Västra asfaltrakan norrut
      [ -95, -47, 16.5, 'asfalt'], // 2: Nordvästra 90°-kurvan (asfalt)
      [ -60, -65, 15.5, 'grus'],   // 3: Övergång från asfalt till sora
      [ -20, -82, 15.0, 'grus'],   // 4: Sora-stigning mot Radalta poistuminen
      [  18,-119, 14.5, 'grus'],   // 5: Förbi Radalta poistuminen upp mot nordspetsen
      [  57,-129, 15.0, 'asfalt'], // 6: Norra toppkurvan (asfaltti!)
      [  87,-105, 15.0, 'asfalt'], // 7: Utgång ur norra asfaltkurvan
      [  95, -55, 15.5, 'grus'],   // 8: Östra långa grusutförslöpan (soraa)
      [ 107,  -5, 16.0, 'grus'],   // 9: Östra ytterkurvan (soraa)
      [  87,  48, 15.0, 'grus'],   // 10: Sydöstra grusrakan ner mot hårnålen
      [  70,  95, 14.5, 'asfalt'], // 11: Sydöstra hårnålen (asfaltti!)
      [  40,  89, 14.0, 'asfalt'], // 12: Utgång ur sydöstra asfalthårnålen
      [  47,  35, 13.5, 'grus'],   // 13: Inre rakan norrut (soraa!)
      [  57, -15, 13.0, 'grus'],   // 14: Övergång till inre asfaltspartiet
      [  45, -47, 12.5, 'asfalt'], // 15: Inre S-knixen (asfaltti)
      [  12, -70, 12.5, 'asfalt'], // 16: Inre norra vändningen (asfaltti)
      [ -20, -47, 13.0, 'asfalt'], // 17: Nedfart mot Sakkolenkki-delningen (asfaltti)
      [ -32,  -7, 12.5, 'asfalt'], // 18: Delning: Huvudspår (vänster) vs Sakkolenkki (röd, höger)
      [ -15,  28, 12.0, 'asfalt'], // 19: Huvudspårets inre båge (smalast: 12 m, asfaltti)
      [   8,  60, 12.5, 'asfalt'], // 20: Huvudspårets högersväng före Betonikaide
      [ -10,  80, 14.0, 'asfalt'], // 21: Betonikaide – Sakkolenkki ansluter
      [ -38,  94, 15.0, 'grus'],   // 22: Kort grusparti (soraa) efter Betonikaide
      [ -74, 102, 16.5, 'asfalt'], // 23: Asfaltkurva in på västra start-/målrakan
    ],
    // Röd Sakkolenkki som går på högra/västra sidan mellan punkt 18 och 21 (fram till Betonikaide)
    customJoker: { startFrac: 0.72, endFrac: 0.87, side: 1, D: 22.0, w: 9.5, skew: 0.1 },
    startChute: { x0: -97, z0: 132, x1: -97, z1: 82, w: 18.0, surface: 'asfalt', label: 'LÄHTÖ (18 M)' },
    finishFrac: 0.0,
    posts: [
      { n: '1', x: -80, z: -54 }, { n: '2', x: 5, z: -104 }, { n: '3', x: 74, z: -115 },
      { n: '4', x: 94, z: -5 }, { n: '5', x: 57, z: 104 }, { n: '6', x: 13, z: -55 }, { n: '7', x: -13, z: 68 },
    ],
    buildings: [
      { name: 'TUOMARITORNI', x: -118, z: 48, sx: 7, sz: 7, sy: 6.5, col: [0.78, 0.22, 0.16, 1] },
      { name: 'BETONIKAIDE', x: -3, z: 87, sx: 10, sz: 1.5, sy: 1.2, col: [0.75, 0.76, 0.78, 1] },
      { name: 'RADALTA POISTUMINEN', x: -13, z: -114, sx: 8, sz: 6, sy: 2.6, col: [0.25, 0.38, 0.58, 1] },
    ],
  },
  { id: 'karstula', name: 'Karstula', surface: 'grus', width: 12.5, shape: { R: 98, sx: 1.35, sz: 0.95, h: [[3, 0.14, 2.4], [5, 0.07, 0.3], [2, 0.06, 1.0]] } },
  { id: 'heinola', name: 'Heinola', surface: 'grus', width: 12.5, shape: { R: 110, sx: 1.4, sz: 0.9, h: [[3, 0.12, 0.7], [4, 0.10, 2.9]] } },
  {
    id: 'hyvinkaa',
    name: 'Hyvinkää – Vauhtipuisto (Rata D)',
    addr: 'Hikiäntie 1508, 05801 Hyvinkää (Hyvinkään Urheiluautoilijat)',
    surface: 'grus',
    width: 13.5,
    info: [
      'Hyvinkään Vauhtipuisto (Rata D), Hikiäntie 1508, 05801 Hyvinkää',
      'Radan pituus 1 450 m · 35 % asfalttia (~508 m) / 65 % soraa (~942 m)',
      '50 m asfalterad lähtöliittymä från Varikko/Katsastus förbi Katsomo',
      'Lång teknisk bana med 9 domarposter (1–9 + Päälippupiste P) och Lisälenkki vid ap',
    ],
    // Exakt profil enligt "HYVINKÄÄN VAUHTIPUISTO Rata D 2010: 1450 m / 35 % asf. / 50 m lähtöliittymä":
    // Moturs varv från slutet av 50 m lähtöliittymä -> asfalterad ytterkurva vid post 1 -> grusraka förbi post 2 ->
    // asfalterad sydhårnål vid post 3 -> grusklättring förbi post 4 -> östra slingan med asfalthårnål vid post 5 & 6 ->
    // grus tillbaka förbi post 7 -> asfaltbåge / Lisälenkki (ap) i mitten -> grusraka förbi Mål (🏁) och P upp runt post 8 & 9!
    waypoints: [
      [ -63, -58, 14.5, 'grus'],   // 0: Anslutning från 50 m lähtöliittymä
      [-136,  -5, 14.0, 'asfalt'], // 1: Västra ytterkurvan utanför post 1 (asfaltti!)
      [-131,  88, 13.5, 'grus'],   // 2: Västra rakan söderut förbi post 2 (sora)
      [-112, 185, 14.0, 'asfalt'], // 3: Ingång södra kurvan vid post 3 (asfaltti!)
      [ -54, 204, 14.0, 'asfalt'], // 4: Post 3 – södra hårnålen (asfaltti!)
      [ -10, 131, 13.0, 'grus'],   // 5: Post 4 – uppgång norrut (sora)
      [  41,  58, 13.0, 'grus'],   // 6: Högersväng mot östra slingan (sora)
      [ 131,  58, 13.5, 'asfalt'], // 7: Post 5 – ingång östra hårnålen (asfaltti!)
      [ 204,  27, 14.0, 'asfalt'], // 8: Post 6 – östra vändningen (asfaltti!)
      [ 173, -29, 13.5, 'grus'],   // 9: Utgång ur kurva 6 mot post 7 (sora)
      [  90, -10, 13.0, 'grus'],   // 10: Förbi post 7 in mot mitten (sora)
      [  10,   5, 12.5, 'asfalt'], // 11: Mellersta asfaltbågen / delning till Lisälenkki (ap)
      [ -29, -27, 12.5, 'asfalt'], // 12: Utgång mellersta asfaltbågen norrut
      [  27, -90, 13.5, 'grus'],   // 13: Mållinje (🏁) och P (Päälippupiste) på grusrakan mot nordost
      [ 105,-153, 14.0, 'grus'],   // 14: Post 8 – nordöstra kurvan (sora, Radalta ulos)
      [  75,-204, 14.0, 'grus'],   // 15: Nordspetsen ovanför post 8 & 9
      [   7,-151, 13.5, 'grus'],   // 16: Förbi post 9 ned mot lähtöliittymä
    ],
    // Lisälenkki runt ap (innanför post 1 i mitten av banan)
    customJoker: { startFrac: 0.62, endFrac: 0.76, side: -1, D: 24.0, w: 9.5, uShape: true },
    startChute: { x0: -32, z0: -102, x1: -63, z1: -62, w: 15.0, surface: 'asfalt', label: '50 M LÄHTÖLIITTYMÄ' },
    finishFrac: 0.79,
    posts: [
      { n: '1', x: -100, z: -10 }, { n: '2', x: -107, z: 88 }, { n: '3', x: -80, z: 173 },
      { n: '4', x: -19, z: 112 }, { n: '5', x: 136, z: 34 }, { n: '6', x: 173, z: 7 },
      { n: '7', x: 88, z: -29 }, { n: 'P', x: 51, z: -78 }, { n: '8', x: 78, z: -146 }, { n: '9', x: 29, z: -144 },
    ],
    buildings: [
      { name: 'TOIMISTO / KATSASTUS', x: -58, z: -124, sx: 14, sz: 8, sy: 4.2, col: [0.82, 0.80, 0.74, 1] },
      { name: 'YLEISÖ / KATSOMO', x: -95, z: -83, sx: 22, sz: 7, sy: 3.0, col: [0.25, 0.38, 0.55, 1] },
      { name: 'VARIKKO', x: -22, z: -192, sx: 28, sz: 14, sy: 3.2, col: [0.72, 0.70, 0.66, 1] },
    ],
  },
  { id: 'virtasalmi', name: 'Virtasalmi Motopark', surface: 'asfalt', width: 13.5, shape: { R: 124, sx: 1.6, sz: 0.8, h: [[2, 0.15, 0.9], [4, 0.09, 2.4], [5, 0.05, 0.2]] } },
  {
    id: 'akaa',
    name: 'Daytona Circuit Akaa',
    addr: 'Syrjäintie 21, 37800 Akaa',
    surface: 'asfalt',
    width: 12,
    info: [
      'Daytona Circuit Akaa, Syrjäintie 21, 37800 Akaa',
      'Radan pituus n. 1 km (1 000 m)',
      'Asvaltti 100 %',
      'Leveys n. 8–16 m',
    ],
    // Exakt 100 % asfalterad profil enligt drönarfotot från Daytona Circuit Akaa (längd 1 000 m, bredd 8–16 m):
    waypoints: [
      [ -41, -93, 16.0, 'asfalt'], // 0: Start-/målrakan i norr vid depån (bredast: 16 m!)
      [ -95, -60, 15.0, 'asfalt'], // 1: Nordvästra kurvan söderut
      [-114,   6, 14.5, 'asfalt'], // 2: Västra ytterkurvan/rakan söderut
      [-101,  89, 14.0, 'asfalt'], // 3: Ingång sydvästra svepande hårnålen
      [ -54, 138, 13.5, 'asfalt'], // 4: Sydvästra vändningen (med parallell Sakkolenkki på insidan!)
      [   4, 114, 12.5, 'asfalt'], // 5: Utgång sydvästra hårnålen
      [ -17,  41, 11.5, 'asfalt'], // 6: Mellersta diagonalrakan norrut
      [ -43, -23, 11.0, 'asfalt'], // 7: Ingång övre mittkurvan
      [  -8, -60, 10.5, 'asfalt'], // 8: Övre mittkurvan österut
      [  47, -45, 10.0, 'asfalt'], // 9: Inre östra bågen söderut
      [  54,  17,  8.5, 'asfalt'], // 10: Inre sydöstra knixen (smalast: ~8 m!)
      [  93,  41,  8.0, 'asfalt'], // 11: Sydöstra hårnålen (8 m bred!)
      [ 120,  -6, 11.5, 'asfalt'], // 12: Östra ytterbågen norrut
      [ 109, -66, 13.5, 'asfalt'], // 13: Nordöstra kurvan
      [  41, -93, 15.5, 'asfalt'], // 14: Norra rakan förbi varikko tillbaka till M
    ],
    customJoker: { startFrac: 0.18, endFrac: 0.36, side: -1, D: 21.0, w: 9.0, skew: 0 },
    finishFrac: 0.0,
    posts: [
      { n: '1', x: -93, z: -17 }, { n: '2', x: -62, z: 116 }, { n: '3', x: -15, z: -41 },
      { n: '4', x: 74, z: 23 }, { n: '5', x: 101, z: -41 }, { n: '6', x: 12, z: -80 },
    ],
    buildings: [
      { name: 'TUOMARITORNI', x: 66, z: -109, sx: 6, sz: 6, sy: 6.0, col: [0.85, 0.86, 0.88, 1] },
      { name: 'VARIKKO', x: -10, z: -120, sx: 32, sz: 12, sy: 3.2, col: [0.30, 0.34, 0.38, 1] },
    ],
  },
  { id: 'saarijarvi', name: 'Saarijärvi (is)', surface: 'is', width: 14, shape: { R: 100, sx: 1.4, sz: 0.95, h: [[3, 0.12, 1.5], [2, 0.08, 0.3]] } },
  {
    id: 'pieksamaki-is',
    name: 'Pieksämäki (lumi/jää)',
    addr: 'Paltasen autourheilukeskus, Järvisuomentie 2000, 76100 Pieksämäki',
    surface: 'is',
    width: 15,
    info: [
      'Sama rata kuin kesällä (Paltasen autourheilukeskus), pinta talvella lumi/jää!',
      'Lähtöön mahtuu 8 autoa rinnakkain · Leveys 18–12 m · Ratatuomaripisteitä 7',
    ],
    waypoints: [
      [ 22, 134, 18.0, 'is'],
      [ 83, 102, 17.0, 'is'],
      [107,  41, 15.5, 'is'],
      [ 88, -32, 15.0, 'is'],
      [ 58,-100, 14.5, 'is'],
      [  2,-136, 14.5, 'is'],
      [-68,-129, 14.0, 'is'],
      [-112,-90, 12.5, 'is'],
      [-93, -49, 12.0, 'is'],
      [-120,-10, 13.0, 'is'],
      [-136, 51, 15.5, 'is'],
      [-105,112, 16.5, 'is'],
      [-44, 139, 17.5, 'is'],
    ],
    customJoker: { startFrac: 0.14, endFrac: 0.30, side: -1, D: 18.5, w: 9.0, skew: 0 },
    finishFrac: 0.94,
    posts: [
      { n: '1', x: 92, z: 75 }, { n: '2', x: 78, z: 2 }, { n: '3', x: 51, z: -78 },
      { n: '4', x: -29, z: -117 }, { n: '5', x: -78, z: -68 }, { n: '6', x: -114, z: 34 }, { n: '7', x: -70, z: 117 },
    ],
    buildings: [
      { name: 'TUOMARITORNI (VALKOINEN)', x: 58, z: 22, sx: 6.5, sz: 6.5, sy: 7.5, col: [0.92, 0.94, 0.96, 1] },
      { name: 'VARIKKO', x: 142, z: 30, sx: 16, sz: 24, sy: 3.0, col: [0.75, 0.74, 0.70, 1] },
    ],
  },
  {
    id: 'rantasalmi-is',
    name: 'Rantasalmi (lumi/jää)',
    addr: 'Joroistentie 314, 58900 Rantasalmi',
    surface: 'is',
    width: 15,
    info: [
      'Rantasalmen Urheiluautoilijat Ry (RUA) – talvikisa lumella ja jäällä',
      'Radan pituus vajaa kilometri (~950 m) · Kapein kohta 12 m, levein kohta 22 m',
    ],
    waypoints: [
      [-42,  79, 16.0, 'is'],
      [ 28,  96, 15.0, 'is'],
      [101, 101, 16.5, 'is'],
      [166,  85, 19.5, 'is'],
      [199,  39, 22.0, 'is'],
      [173, -11, 18.5, 'is'],
      [123, -18, 15.0, 'is'],
      [ 72, -20, 14.5, 'is'],
      [ 20, -22, 14.0, 'is'],
      [-20, -31, 12.2, 'is'],
      [-37, -61, 12.0, 'is'],
      [-26, -96, 12.0, 'is'],
      [-60,-123, 15.5, 'is'],
      [-114,-127,17.5, 'is'],
      [-145, -96,17.0, 'is'],
      [-112, -52,14.5, 'is'],
      [-81,   9, 14.5, 'is'],
      [-64,  53, 16.5, 'is'],
    ],
    customJoker: { startFrac: 0.41, endFrac: 0.56, side: -1, D: 44.0, w: 11.0, uShape: true },
    startChute: { x0: -138, z0: 33, x1: -50, z1: 72, w: 18.0, surface: 'is', label: 'L (JÄÄ)' },
    finishFrac: 0.0,
    posts: [
      { n: '1.', x: 90, z: 79 }, { n: '2.', x: 166, z: 39 }, { n: '3.', x: 72, z: 6 },
      { n: '4.', x: 20, z: -4 }, { n: '5.', x: -9, z: -55 }, { n: '6.', x: -53, z: -83 },
      { n: '7.', x: -112, z: -98 }, { n: '8.', x: -53, z: 26 },
    ],
    buildings: [
      { name: 'TUOMARITORNI', x: -50, z: 94, sx: 6, sz: 6, sy: 6.0, col: [0.75, 0.20, 0.15, 1] },
      { name: 'KATSASTUS / VARIKKO', x: -115, z: 72, sx: 14, sz: 8, sy: 3.4, col: [0.82, 0.80, 0.72, 1] },
    ],
  },
];

export const SURF = {
  grus: { name: 'Grus (sora)', mu: 1.0, B: 10, C: 1.2, crr: 0.028, col: [0.55, 0.45, 0.33], dust: [0.72, 0.62, 0.48] },
  asfalt: { name: 'Asfalt (kestopäällyste)', mu: 1.02, B: 14, C: 1.35, crr: 0.015, col: [0.24, 0.25, 0.27], dust: [0.6, 0.6, 0.6] },
  is: { name: 'Is (piikkipyörät)', mu: 0.52, B: 9, C: 1.25, crr: 0.02, col: [0.72, 0.82, 0.90], dust: [0.95, 0.97, 1.0] },
};

// Karriären: fyra nivåer. Varje tävling körs enligt Rokkiralli Ry Sääntökirja 2026
// (Vilppula 18.4.2026 är första sommartävlingen då 2026 års regler träder i kraft!).
export const CAREER = [
  { id: 'debut', name: 'Kevätkausi 2026', sub: 'Premiär från Vilppula 18.4.2026', ai: 0.80, prize: 260, need: 0, events: [
    { id: 'd1', track: 'vilppula', name: 'Vilppula 18.4.2026 (Säsongspremiär)' },
    { id: 'd2', track: 'tammisaari', name: 'Tammisaari – Grabbskogin Rata' },
    { id: 'd3', track: 'rantasalmi', name: 'Rantasalmi – RUA Kesäkisa' },
    { id: 'd4', track: 'joutsa', name: 'Joutsas majheat' },
    { id: 'd5', track: 'kouvola', name: 'Kouvolas försommarralli' } ] },
  { id: 'kesa', name: 'Kesäpörssi', sub: 'Sommarsäsongens poängjakt', ai: 0.88, prize: 450, need: 60, events: [
    { id: 'k1', track: 'rantasalmi', name: 'Rantasalmis juliheat' },
    { id: 'k2', track: 'karstula', name: 'Karstulas midsommarrock' },
    { id: 'k3', track: 'pieksamaki', name: 'Pieksämäkis grusdag' },
    { id: 'k4', track: 'pihtipudas', name: 'Pihtipudas augustiralli' },
    { id: 'k5', track: 'hyvinkaa', name: 'Hyvinkään Vauhtipuiston kesäralli' } ] },
  { id: 'talvi', name: 'Talvipörssi', sub: 'Vintersäsongen med rallydubbdäck', ai: 0.94, prize: 700, need: 90, events: [
    { id: 't1', track: 'rantasalmi-is', name: 'Rantasalmis januariis' },
    { id: 't2', track: 'pieksamaki-is', name: 'Pieksämäkis isralli' },
    { id: 't3', track: 'saarijarvi', name: 'Saarijärvis vinterfinal' } ] },
  { id: 'mestari', name: 'Mestaruussarja', sub: 'Kampen om topp 10 i pörssin', ai: 1.0, prize: 1200, need: 15, events: [
    { id: 'm1', track: 'tammisaari', name: 'Grabbskogin Ratan stordag' },
    { id: 'm2', track: 'rantasalmi', name: 'Rantasalmis höstklassiker' },
    { id: 'm3', track: 'virtasalmi', name: 'Virtasalmi Motopark' },
    { id: 'm4', track: 'heinola', name: 'Heinolas höstrock' },
    { id: 'm5', track: 'akaa', name: 'Säsongsfinalen på Daytona Circuit Akaa' } ] },
];

export const FINALS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

// Exakta poängtabeller enligt Sääntökirja 21.04.2026 s. 17–18!
export const POINTS_TABLE = {
  // Vetari- ja kardaaniluokka:
  // A-finaali: 1=50, 2=40, 3=30, 4=25, 5=23, 6=21, 7=19, 8=17
  // B-finaali: 9=15, 10=14, 11=13, 12=12, 13=11, 14=10
  // C=7, D=5, E=3, F=2, G=1
  vetari: { A: [50, 40, 30, 25, 23, 21, 19, 17], B: [15, 14, 13, 12, 11, 10], C: 7, D: 5, E: 3, F: 2, G: 1, out: 0 },
  kardaani: { A: [50, 40, 30, 25, 23, 21, 19, 17], B: [15, 14, 13, 12, 11, 10], C: 7, D: 5, E: 3, F: 2, G: 1, out: 0 },
  // Super-luokka kesä: A: 25,20,15,12,10,9; B: 8,7,6,5; C=3, D=2, E=1
  super_kesa: { A: [25, 20, 15, 12, 10, 9], B: [8, 7, 6, 5], C: 3, D: 2, E: 1, F: 0, G: 0, out: 0 },
  // Super-luokka talvi: A: 9,6,4,3,2,1
  super_talvi: { A: [9, 6, 4, 3, 2, 1], B: [0, 0, 0, 0], C: 0, D: 0, E: 0, F: 0, G: 0, out: 0 },
  // Lady-luokka: A: 25,20,15,12,10,9; B: 8,7,6,5; C=3
  lady: { A: [25, 20, 15, 12, 10, 9], B: [8, 7, 6, 5], C: 3, D: 0, E: 0, F: 0, G: 0, out: 0 },
  // Junior-luokka: A: 25,20,15,12,10,8; B: 6,4,2,1
  junior: { A: [25, 20, 15, 12, 10, 8], B: [6, 4, 2, 1], C: 0, D: 0, E: 0, F: 0, G: 0, out: 0 },
  // Senior- ja Super-senior: A: 9,6,4,3,2,1
  senior: { A: [9, 6, 4, 3, 2, 1], B: [0, 0, 0, 0], C: 0, D: 0, E: 0, F: 0, G: 0, out: 0 },
  supersenior: { A: [9, 6, 4, 3, 2, 1], B: [0, 0, 0, 0], C: 0, D: 0, E: 0, F: 0, G: 0, out: 0 },
};

export function calcPoints(cls, isWinter, finalLetter, pos) {
  const key = cls === 'super' ? (isWinter ? 'super_talvi' : 'super_kesa') : (POINTS_TABLE[cls] ? cls : 'vetari');
  const tab = POINTS_TABLE[key];
  if (!tab || finalLetter === 'out') return 0;
  if (finalLetter === 'A') return tab.A[Math.min(tab.A.length - 1, Math.max(0, pos - 1))] || 0;
  if (finalLetter === 'B') {
    // I B-finalen får de som inte gör nousu (dvs pos 3..6 eller 4..6) placeringarna efter A-finalen (7..10 eller 9..14)
    const idx = Math.max(0, pos - 3);
    return Array.isArray(tab.B) ? (tab.B[Math.min(tab.B.length - 1, idx)] || 0) : (tab.B || 0);
  }
  return tab[finalLetter] || 0;
}

export const POINTS = POINTS_TABLE.vetari;
export const PRIZE_SHARE = { A: [1, 0.72, 0.52, 0.4, 0.35, 0.3], B: 0.25, C: 0.18, D: 0.14, E: 0.10, F: 0.08, G: 0.06, out: 0 };

// Varningskoder enligt Sääntökirja s. 15
export const CODES = [
  ['A1', 'Takakulmatyöntö ja/tai pyöräytys', 'Knuff i bakhörnet och/eller snurrning av medtävlare'],
  ['A2', 'Päälleajo', 'Påkörning'],
  ['A3', 'Kylkikosketus (junior- ja superluokat)', 'Sidokontakt (förbjudet i Junior- och Super-klasserna – omkörningar ska vara rena)'],
  ['A4', 'Eteenkiilaus (kontakti)', 'Kilar sig in framför med kontakt'],
  ['A5', 'Painaminen', 'Pressar en medtävlare'],
  ['A6', 'Töniminen ja/tai peräänajo', 'Knuffande och/eller påkörning bakifrån'],
  ['A7', 'Häiritsevä kaistanvaihto (lähdössä)', 'Störande filbyte i starten före startljusen'],
  ['A8', 'Lisälenkiltä eteen', 'Kör ut från lisälenkki rakt framför en annan (lisälenkiltä tulija on väistämisvelvollinen)'],
  ['B1', 'Hiljentämättä keltaisella lipulla', 'Saktar inte in tydligt vid gul flagg'],
  ['B2', 'Varomaton ajo keltaisella lipulla', 'Oförsiktig körning vid gul flagg'],
  ['B3', 'Ohitus keltaisella lipulla', 'Omkörning under gul flagg'],
  ['B4', 'Kontakti keltaisella lipulla', 'Kontakt under gul flagg'],
  ['B5', 'STOP-merkin noudattamatta jättäminen', 'Stannar inte vid STOP-skylten på väg till depån'],
  ['B6', 'Ruutulipun jälkeinen päälleajo', 'Påkörning efter målflagg (även onödigt gasande/donuts i myyntiluokat är förbjudet)'],
  ['B7', 'Liputettuun esteeseen törmääminen', 'Kör på ett flaggat hinder (ger alltid minst 1 helgs avstängning + lippumiespesti!)'],
  ['B8', 'Holtiton ajo', 'Vårdslös körning'],
  ['B9', 'Turvallisuuden laiminlyönti', 'Försummelse av säkerheten (t.ex. ta av hjälmen före STOP-skylten)'],
];
export const MARKS = [
  ['Li', 'Lisälenkki ajamatta / keila kaatunut', 'Lisälenkki ej körd eller vält kon i lisälenkki → flyttas sist av målgångna (före Vi)'],
  ['Vi', 'Vilppilähtö', 'Tjuvstart (rört bilen efter att STOP-skylten höjts) → sist av alla målgångna'],
  ['K', 'Keskeyttänyt', 'Brutit heatet (placeras under Vi och Li)'],
  ['KA', 'Kaato', 'Rullat (takrännan/vesikouru i marken → heatet bryts direkt, kräver kaatokatsastus)'],
  ['P', 'Poissa lähdöstä', 'Ej till start → automatiskt allra sist i heatet'],
];

export const DRIVERS = ['Pena Rämäkkö', 'Jorma Kaasujalka', 'Late Sivuluisu', 'Mäkelän Poika', 'Tuukka Soranen', 'Reiska Pultti',
  'Vesa Vänkäri', 'Kake Kardaani', 'Ilpo Ilmanotto', 'Seppo Sytytys', 'Hessu Hiekkala', 'Arska Akseli', 'Jere Jousi', 'Pate Pakosarja',
  'Timppa Turbonen', 'Masa Männänrengas', 'Olli Öljypohja', 'Rami Rattinen', 'Sami Sorakuoppa', 'Veikko Vaihde', 'Eki Etuveto',
  'Nipa Nokka-akseli', 'Tane Takaveto', 'Juha Jäärata', 'Aki Ahdin', 'Kimmo Kytkin'];
export const TEAMS = ['Team Sorakuoppa', 'Hitsipilli Racing', 'Peräkylän Bensa & Pulla', 'Löysä Pultti Motorsport', 'Navetta Racing',
  'Rautakanki RT', 'Team Viimeinen Erä', 'Pärinäpojat', 'Saunan Taka Racing', 'Kuraralli Team'];

export const KOMP = [
  { id: 'tavling', title: 'Tävlingsdagen & Klasserna (Sääntökirja 2026)', formula: 'alkuerä → keräilyerä → last call → semi → final (nousut)',
    body: [
      'Reglerna följer <b>Rokkiralli Ry Sääntökirja (uppdaterad 21.04.2026)</b>. Vid ankomst besiktas bilen först (om den är ny, ändrad eller saknar årets kort) och därefter anmäler man sig på tävlingskontoret senast när förarmötet (kuljettajakokous) börjar.',
      '<b>Anmälningsavgifter (Osallistumismaksut)</b>: Vetari, Kardaani och Super kostar <b>60 €/dag</b> (kör man både Vetari och Kardaani samma helg är paketpriset <b>100 €</b>). Lady, Senior och Super Senior kostar <b>40 €/dag</b>. Junior Rock kostar <b>0 €</b> säsongen 2026 eftersom Rokkiralli ry betalar avgiften! (Efteranmälan +20 € kontant). Går bilen sönder före ditt första heat (innan startljusen tänds) får du ett tillgodokvitto (<b>hyvityskuitti</b>).',
      '<b>Alkueriens startordning</b> bestäms av aktuell poängställning i serien så att serieledaren får sista spåret, medan nybörjare (ensikertalaiset) står i främre ledet och väljer ruta först.',
      '<b>Startuppställning & varvtal</b>: I <b>Vetari</b> och <b>Kardaani</b> sker starten från <b>två led</b> (ca 7 m mellan främre och bakre linjen) och minimivarvtalet är <b>2 varv utan lisälenkki</b>. I <b>Super, Junior, Lady, Senior och Super Senior</b> sker starten från <b>ett led</b>, minimivarvtalet är <b>3 varv</b> och <b>lisälenkki ska köras</b>!',
      '<b>Nousuaika</b>: Vid avancemang (nousu) mellan finaler har föraren <b>5 minuters mektid</b> på sin egen depåplats, räknat från att föraren passerat STOP-märket.'
    ] },
  { id: 'klasser', title: 'Klassreglerna i detalj', formula: 'Vetari · Kardaani · Super · Junior · Lady · Senior · Super Senior',
    body: [
      '<b>Vetari Rock</b> (etuveto, 18+ år) & <b>Kardaani Rock</b> (takaveto, 18+ år): Trimningsgraden är fri, men <b>turbo och lustgas (ilokaasu) är förbjudna</b>! Max tjänstevikt enligt regbevis är 1 800 kg. <b>Lukkoperä (diffspärr/svetsad diff) är endast tillåten på bakhjulsdrivna bilar</b>! Däcken måste vara gatgodkända på sommaren (däckskärning förbjuden) och rallydubbdäck på vintern (ruusu- och sorvinastat förbjudna). Alla semifinal- och finalbilar har <b>myyntivelvoite (850 €)</b>.',
      '<b>Super Rock</b> (18+ år): Klassen för de starkaste bilarna. Här är <b>turbo tillåtet</b> (lustgas förbjudet), bilen har <b>ingen viktgräns</b>, <b>lukkoperä är tillåten även på framhjulsdrivna bilar</b>, och <b>rallydäck samt slicks är tillåtna</b> (däckvärmare förbjudna). Bilen måste vara representativ (edustuskelpoinen/siisti), ha <b>Super-luokan kaaret</b>, <b>6-punktsbälte</b>, <b>sidospeglar på båda sidor</b> och bokstaven <b>S</b> framför startnumret. Sidokontakt är förbjuden (A3) och bilarna har <b>ingen myyntivelvoite</b>.',
      '<b>Junior Rock</b> (15–18 år): Både fram- och bakhjulsdrivna bilar (ingen turbo). Debutanter gör skriftligt prov och körprov. Sidospeglar på båda sidor, bokstaven <b>J</b> framför numret, <b>total kontaktförbud (A3)</b>. A- och B-finalbilar säljs för 850 €.',
      '<b>Lady Rock</b> (18+ år): Fram- eller bakhjulsdrivna bilar (ingen turbo), bokstaven <b>L</b> framför numret. Sidokontakt i samma riktning framför bakhjulet är tillåten. A–C-finalbilar säljs för 850 €.',
      '<b>Senior Rock</b> & <b>Super Senior Rock</b> (50+ år, 6–18 förare): Senior körs med Vetari/Kardaani-bilar (A-finalbilar säljs för 850 €) och Super Senior med Super-bilar (ingen myyntivelvoite).'
    ] },
  { id: 'kaaret', title: 'Turvakaaret (Störtbur) & Besiktning', formula: 'Taivutetut ≥ 42×2,5 mm · Hitsatut ≥ 48×2,5 mm · 100 % svets',
    body: [
      '<b>Rördimensioner</b>: Med bockade böjar (taivutetut mutkat) minst <b>Ø42×2,5 mm</b>; med svetsade böjar (hitsatut mutkat) minst <b>Ø48×2,5 mm</b>. Alla skarvar ska svetsas med 100 % fog (flussfylld tråd rekommenderas ej).',
      '<b>Ritningens punkter (1–11)</b>: (1) Tvärrör nere i huvudbågen bakom stolen · (2) Bakåtsträvor · (3) Frambågar längs A-stolparna ner i golvet · (4) Tvärrör vid vindrutans överkant · (5) Längsgående takrör i sidorna · (6) <b>Två dörrsträvor i förardörren</b> (kryss eller två separata rör, obligatoriskt i alla klasser sedan 2/2024!) samt dörrsträva i passagerardörren · (7) Längsgående takrör i mitten (i Super med svetsade böjar krävs <b>takkryss / kattoristikko</b>) · (8) Diagonalstag från förarhörnet · (9) Fäst i karossens stomme minst 50 mm på 4 ställen i överkant (i Super på <b>8 ställen</b> i stolparna!) · (10) Max 70 mm mellan förarstolpe och kaross (annars plåt/extrastolpe); max 100 mm till taket · (11) Golvplattor minst <b>200×200×3 mm</b> med ≥50 % svetsfog (och i Super med svetsade böjar hörntrianglar av rör/plåt).',
      '<b>Förardörr & rutor</b>: Förardörren får <b>inte lättas</b>! Om dörrsidan tagits bort ska minst 0,5 mm metallplåt fästas med minst 20 popnitar/borrskruvar. Sidorutan ska vara polykarbonat, folierat glas eller nät + akryl. <b>Nascar-nät</b> (fäst i burrör på ≥4 punkter bakom rattlinjen) är obligatoriskt i alla klasser. Vindruta är obligatorisk och framsidorutor får ej tonas.',
      '<b>Keulan vahvistus & Pohjapanssari</b>: Frontförstärkning (gäller ej Super) får endast sitta <b>innanför rambenens yttermått</b>: max 1 st 60×60×3 mm (eller Ø60 mm) rör + 2 vertikala möbelrör vid rambenen + 1 st max 20×50×2 mm mellan framskärmarnas överkant (ej stagat bakåt), klätt med max 1,5 mm plåt/nät. Hasplåt (pohjapanssari) måste fästas med minst <b>2 st M10-bultar</b>.',
      '<b>Farmariauton typistys & Ljudgräns</b>: På kombibilar får D-stolpen tas bort och bakänden kapas bakom hjulhusen om C-stolpen förstärks med hjälpbåge (50 % svets). Ljudgränsen är <b>max 110 dB vid 4 500 rpm</b> (50 cm höjd, 45° vinkel, 50 cm avstånd) och avgasröret måste gå bakom B-stolpen.',
      '<b>Kilpailunumerot</b>: Svart på vitt eller vitt på svart i <b>bakre sidorutorna (min 20 cm – nummer på dörren är förbjudet!)</b>, vindrutans övre kant på passagerarsidan och bakrutan (min 10 cm).'
    ] },
  { id: 'regler', title: 'Varningskoder, Flaggor & Målgångsordning', formula: 'Mål → Li → Vi → K/KA → Sanktion → P  |  3 varningar = Hylky + Lippumiespesti',
    body: [
      '<b>Start & STOP-skylt</b>: När STOP-skylten höjs från startlinjen får bilen inte röra sig åt något håll (man får inte ta "löysiä pois"). På väg in i depån efter heatet måste man alltid stanna vid STOP-skylten (annars B5). Promillegränsen på banområdet är <b>0,00 ‰</b>.',
      '<b>Målgångsordning (Maaliintulojärjestys)</b> vid förseelser i samma heat är exakt fastställd i Sääntökirja s. 14:',
      '1. <b>Felfria</b> förare i målgångsordning · 2. <b>Li</b> (missad lisälenkki eller vält kon i lisälenkki – snudda får man, men konen får inte välta!) · 3. <b>Vi</b> (tjuvstart – placeras <i>efter</i> Li eftersom tjuvstarten skedde först!) · 4. <b>K / KA</b> (brutna / rullade) · 5. <b>Sanktionerade (varning A1–B9)</b> under de brutna, i den ordning de fick sanktionen (den som fick sanktion först blir allra sist!) · 6. <b>P</b> (ej startat).',
      '__CODES__',
      '<b>Varningar, Hylky & Lippumiespesti</b>: Varningar är förarpersonliga (gäller över alla klasser) och ligger kvar tills du kör en <b>hel tävling rent (puhtaan kilpailun)</b>. Vid <b>3:e varningen</b> blir det <b>Hylky</b> (omedelbar diskning ur tävlingen, dagens poäng nollas) samt <b>1 tävlingshelgs avstängning och flaggvaktsuppdrag (lippumiespesti)</b>! Att köra på ett flaggat hinder (B7) ger direkt avstängning och lippumiespesti. Protest kostar <b>50 €</b> (återbetalas om protesten går igenom).'
    ] },
  { id: 'myynti', title: 'Autojen myyntitilaisuus (850 €) & Poängtabeller', formula: 'Bilpris 850 € · Lott (arpa) 20 € · Topp 10 prisas',
    body: [
      '<b>Myyntivelvoite (850 €)</b>: I <b>Vetari och Kardaani</b> är alla semifinalbilar till salu för <b>850 € kontant</b>. I <b>Junior</b> gäller det A–B-final, i <b>Lady</b> A–C-final och i <b>Senior</b> A-final. (Super och Super Senior har ingen myyntivelvoite). Att sabotera eller rusa motorn/göra donuts efter målflagg ger 1 års tävlingsförbud!',
      '<b>Lotteri (Arpa 20 €/st)</b>: Lotter säljs på tävlingskontoret fram till prisutdelningen. När en lott dras får vinnaren antingen <b>skydda sin egen bil (suojata oman auton)</b> eller <b>köpa en ledig försäljningspliktig bil för 850 €</b>.',
      '<b>Vad får man plocka ur bilen vid försäljning?</b> Kuppipenkki, bälten & öglebultar, Nascar-verkko, batteri (kablar ska lämnas kvar), i besiktningskortet inskrivna extravikter, spacers, separat varvräknare, besiktad extra fläkt/datalogger, ratt och däck (om man monterar andra hela, passande hjul med luft i och en ratt) samt turvatankki (om en godkänd fungerande tank monteras i stället – bilen måste vara körklar!).',
      '<b>Poängtabeller (Sääntökirja s. 17–18)</b>: I <b>Vetari & Kardaani</b> ger A-finalen <b>50–40–30–25–23–21–19–17 p</b>, B-finalen (plats 9–14) <b>15–14–13–12–11–10 p</b>, C=7, D=5, E=3, F=2, G=1 p. I <b>Super sommar & Lady</b> ger A-finalen <b>25–20–15–12–10–9 p</b>, B-finalen <b>8–7–6–5 p</b>, C=3 (och i Super D=2, E=1). I <b>Junior</b> ger A-finalen <b>25–20–15–12–10–8 p</b> och B-finalen <b>6–4–2–1 p</b>. I <b>Super vinter, Senior & Super Senior</b> ger A-finalen <b>9–6–4–3–2–1 p</b>.'
    ] },
  { id: 'bilar', title: 'Bilmodeller, Motorer & Motorbyten i Rokkiralli (Kardaani · Vetari · Super)', formula: 'BMW E36/E46 · Ford Sierra/Mondeo · Volvo 240/740/940 & 850/V70 · VW Passat B5 · Mazda 3/6 · Opel · Starlet & V8-Volvo',
    body: [
      '<b>BMW 3-serie (E36/E46), Ford Sierra/Mondeo, Volvo 240/740/940 & 850/V70 samt VW Passat B5</b> är de mest typiska bilmodellerna när man pratar om Rokkiralli. Nedan sammanfattas den teknik och de motoralternativ som förekommer i byggena och i aktuella Rokkiralliannonser:',
      '<b>Kardaani – bakhjulsdrivna bilar (takaveto)</b>:<br>• <b>BMW E36 / E46</b>: Raka sexor på <b>2,0–2,8 liter (M50 / M52)</b> samt <b>3,0 liter (M54)</b>.<br>• <b>Ford Sierra</b>: <b>2,0 OHC / Pinto</b> eller <b>2,0 DOHC</b>, samt vanliga motorbyten.<br>• <b>Volvo 240 / 740 / 940</b>: <b>2,3-liters rödblock</b>, främst <b>B23 / B230</b>.<br>• <b>Opel Kadett C / Ascona B</b>: Äldre Opel-motorer (2,0 CIH/OHC) eller utbytt teknik, exempelvis <b>Volvo B230-motor</b>.<br>• <b>VW Passat B5 / Audi A4</b>: Bland annat <b>2,8 V6 (30V)</b> i bilar som byggts om från fyrhjulsdrift (Syncro/Quattro) till bakhjulsdrift!',
      '<b>Vetari – framhjulsdrivna bilar (etuveto)</b>:<br>• <b>Volvo 850 / S70 / V70</b>: <b>2,4–2,5-liters femcylindriga sugmotorer</b>, bland annat <b>140 hk (10V)</b> och <b>170 hk (20V B5254S)</b>.<br>• <b>Ford Mondeo</b>: <b>2,0 fyrcylindrig</b>, <b>2,5 V6</b> och <b>ST220:s 3,0 V6</b>.<br>• <b>VW Passat B5</b>: <b>1,8 20V</b> (5 ventiler/cyl) och <b>2,8 V6</b>.<br>• <b>Mazda 3 / Mazda 6</b>: <b>2,0</b> och <b>2,3-liters fyrcylindriga MZR-motorer</b> (Mazda 3 2,0 bekräftad i Rokkiralliannonser).<br>• <b>Volvo S40 / V40</b>: Fyrcylindriga sugmotorer, exempelvis <b>1,8</b> och <b>2,0 liter</b> (bekräftad i annonser).<br>• <b>Opel Astra / Vectra</b>: <b>2,0 16V</b> och <b>2,5 V6</b>.',
      '<b>Super – blandad teknik & motorbyten (Tekniikanvaihto)</b>:<br>I Super-luokka säger karossmodellen ganska lite om motorn eftersom motor- och drivlinebyten är vanliga. Där förekommer exempelvis <b>BMW, Ford Escort, Toyota Starlet, Opel Ascona och Volvo</b> med utbytt teknik – bland annat rapporteras både <b>V8-Volvo</b> och <b>Starlet</b> under säsongen 2026, samt en <b>Super-Ascona med Volvo-motor och BMW-växellåda</b>!'
    ] },
  { id: 'banor', title: 'Banorna: Tammisaari, Rantasalmi, Pihtipudas, Pieksämäki, Kouvola, Akaa, Joutsa & Hyvinkää', formula: 'Grabbskog 800 m · Rantasalmi 950 m · Pihtipudas 920 m · Kouvola 1 060 m · Akaa 1 km · Joutsa 900 m · Hyvinkää 1 450 m',
    body: [
      '<b>Tammisaari – Grabbskogin Rata (Tenholantie 416, 10620 Tammisaari, E-TMK/UA)</b>: Banlängd ca 800 m i moturs varvriktning. Starten (<b>L</b>) från keräilyområdet går på <b>asfalt</b> förbi domartornet (tuomaristo/kuulutus tornissa) och post 7 ut på södra rakan mot post 1 och kiosken. Banan sveper runt östra bågen (post 2) upp till den <b>asfalterade norra kurvan vid post 3 (EP)</b>, vidare längs övre rakan (post 4) till den <b>asfalterade västra hårnålen</b> före post 5. Efter rakan förbi Päälippu (PL) och post 6 kommer <b>Sakkolenkki (Lisälenkki)</b>: huvudspåret (Vaihtoehto 1) svänger tvärt höger innanför ön D, medan sakkolenkkin (Vaihtoehto 2, röd) rundar utsidan av ön D innan mål (<b>M</b>) mellan Toimisto och Johto.',
      '<b>Rantasalmi – Rantasalmen Urheiluautoilijat Ry (Joroistentie 314, 58900 Rantasalmi)</b>: Banlängd strax under en kilometer (~950 m), smalaste stället <b>12 m</b> och bredaste stället <b>22 m</b>! Startområdet (<b>L</b>) är belagt med <b>asfalt</b> som övergår i grus precis före domartornet (tuomaritorni) och mållinjen (<b>M</b>). Ett heat om 2 varv innehåller <b>235 meter asfalt (kestopäällyste)</b> tack vare startområdet och den tekniska 12 m breda <b>asfalt-S-kurvan mellan post 5 och 6</b>. På övre rakan mellan den 22 m breda östra kurvan (post 2) och post 4 viker <b>Sakkolenkki</b> av i en djup U-slinga runt post 3.',
      '<b>Pihtipudas (Haapavuorentie 145, 44800 Pihtipudas)</b>: Klassisk bana där JM Naisten SM 1994 och JM SM Liigafinaali 2002 körts. Banlängden är <b>920 m</b>, varav <b>ca 20 % är belagt med asfalt</b> (den breda startplattan <b>lähtölaatta</b> som rymmer <b>7 bilar i bredd</b> samt ett par av hårnålskurvorna). Depån (varikko) har gräsyta (nurmipintainen) och banan har lätta höjdskillnader.',
      '<b>Pieksämäki – Paltasen autourheilukeskus (Järvisuomentie 2000, 76100 Pieksämäki)</b>: Byggd 1977, uppdaterad 1986 och förnyad 2017. Starten rymmer hela <b>8 bilar i bredd</b> och banbredden varierar mellan <b>18 m och 12 m</b> med <b>7 domar-/flaggposter (ratatuomaripisteitä)</b>. På sommaren är underlaget blandat grus/asfalt (sora/asfaltti); på vintern körs <b>exakt samma bana på snö och is (lumi/jää)</b>!',
      '<b>Kouvola – Tykkimäen Moottorirata (Tehontie 51, 45200 Kouvola)</b>: Byggd 1979, Rokkiralli sedan år 2000. Banlängd <b>1 060 m</b>, bredd <b>12–18 m</b>, höjdskillnad <b>20 m</b> och underlag <b>42 % grus (sora) / 58 % asfalt</b>! Starten (<b>Lähtö</b>) går rakt norrut förbi <b>Maali</b> på västra asfaltrakan, klättrar på grus förbi <b>Radalta poistuminen</b> till den asfalterade nordspetsen, följer östra grussträckan ned till sydöstra asfalthårnålen och in på den tekniska inre slingan där den röda <b>Sakkolenkki</b> delar sig och möter huvudspåret vid <b>Betonikaide</b>.',
      '<b>Daytona Circuit Akaa (Syrjäintie 21, 37800 Akaa)</b>: Banlängd <b>ca 1 km (1 000 m)</b> med <b>100 % asfalt</b> och en bredd som varierar mellan <b>8 m och 16 m</b>!',
      '<b>Joutsa – JoSeMoRan Moottorirata (Röksäntie 169)</b>: Banlängd <b>800–1 000 m (900 m)</b>, jämn bredd <b>12 m</b> och underlag <b>60 % asfalt / 40 % grus (sora)</b>. Starten (<b>Lähtö</b> med <i>Lähdön järjestely</i> framför <b>Varikko</b>) leder ut på östra rakan förbi <b>Maali (post 6)</b> och <b>Tuomaristo</b> upp till den röda <b>Sakkolenkki</b> före <b>post 1</b>, vidare runt nordvästkurvan (<b>post 2</b>), mellersta rakan (<b>post 3</b>) och sydvästra slingan (<b>post 4 & 5</b>).',
      '<b>Hyvinkää – Hyvinkään Vauhtipuisto (Rata D, Hikiäntie 1508, 05801 Hyvinkää)</b>: Banlängd <b>1 450 m</b> med <b>35 % asfalt / 65 % grus</b> och en <b>50 m asfalterad lähtöliittymä</b> från <b>Varikko / Katsastus / Toimisto</b> förbi <b>Katsomo</b>. Banan har 9 numrerade poster samt <b>Päälippupiste (P)</b>: asfalterad ytterkurva vid post 1, grusraka förbi post 2, asfalterad sydhårnål vid post 3, klättring förbi post 4 till östra slingan med asfalthårnål vid post 5 & 6, tillbaka förbi post 7 in i mellersta partiet med <b>Lisälenkki (ap)</b> och ut på målrakan förbi 🏁 och P runt nordöstra vändningen vid post 8 & 9.'
    ] },
  { id: 'kghk', title: 'Vikt per hästkraft', formula: 'kg/hk = m / P',
    body: ['Det viktigaste talet på en rokkibil. Accelerationen bestäms av drivkraft delat med massa, så 10 kg mindre är lika mycket värt som ungefär 1 % mer effekt på en 1 000 kg-bil.',
      'Under 5 kg/hk räknas som bra, 5–7 som godkänt och över 7 som tungt.',
      'Kom ihåg att förardörren inte får lättas enligt reglerna, men kombibilar får kapas bakom hjulhusen (farmariauton typistys)!'] },
  { id: 'moment', title: 'Moment, effekt och BMEP', formula: 'P = T · ω     BMEP = 4π·T / Vd',
    body: ['Effekten är moment gånger vinkelhastighet: P [kW] = T [Nm] · N [rpm] / 9549.',
      'BMEP (bromsat medeleffektivt tryck) gör motorer av olika storlek jämförbara. En bra sugmotor i Vetari/Kardaani ligger kring 10–12 bar, en turbomotor i Super Rock på 15–20 bar.',
      'Större slagvolym ger mer moment vid samma BMEP – därför drar en 2,5 V6 eller 2,3 kombi starkt ur kurvorna utan turbo.'] },
  { id: 'fyllnadsgrad', title: 'Fyllnadsgrad ηV', formula: 'ηV = ṁa / (ρ · Vd · N/2)',
    body: ['Hur stor del av slagvolymen som faktiskt fylls med luft varje arbetscykel. Insug, kam och avgassystem formar kurvan.',
      'En vassare kam flyttar toppen uppåt i varvtal: mer effekt på toppen, mindre moment i botten.'] },
  { id: 'turbo', title: 'Turbo och intercooler (Super Rock)', formula: 'ρi = pi / (R · Ti)',
    body: ['I Super Rock är turbo tillåtet (lustgas förbjudet). Turbon höjer insugstrycket pi, vilket ger tätare luft och högre FUELMEP.',
      'Kompressionen värmer luften: T2 = T0·(1 + (π^0,286 − 1)/ηk). Intercoolern kyler tillbaka en andel ε av temperaturhöjningen.'] },
  { id: 'lambda', title: 'Luft/bränsle-förhållandet λ', formula: 'λ = (A/F) / (A/F)s',
    body: ['λ = 1 är stökiometrisk blandning. Lite fet blandning (λ ≈ 0,9) ger mest effekt och kyler förbränningen, men en del bränsle går oförbränt ut.',
      'Lite mager blandning (λ ≈ 1,05–1,1) ger bäst verkningsgrad – men sällan snabbast heat.'] },
  { id: 'tandning', title: 'Tändläge och knack', formula: 'fTiming = 1 − 0,0005 · Δ²',
    body: ['Vid MBT (Δ = 0) ger tändläget högst moment. Varje grads avvikelse kostar kvadratiskt.',
      'Tidig tändning, hög kompression, högt laddtryck och varm laddluft ökar knackrisken. Knackmarginalen i Trimning ska vara över noll, annars tappar motorn effekt och tar skada under heatet.'] },
  { id: 'pumpforlust', title: 'Pumpförlust, friktion & 110 dB-gränsen', formula: 'BMEP = IMEPg − PMEP − FMEP',
    body: ['Av det indikerade arbetet går en del åt till att pumpa gas genom motorn (PMEP = pe − pi) och en del till friktion (FMEP).',
      'Avgasröret måste nå bakom B-stolpen och ljudnivån får vara max 110 dB vid 4 500 rpm (mätt 50 cm från utblåset i 45° vinkel på 50 cm höjd). Om avgasröret lossnar under dagen måste det fästas före nästa heat!'] },
  { id: 'kylning', title: 'Kylning', formula: 'Qkyl = HTMEP · Vd · N/2',
    body: ['Ungefär en sjättedel av bränsleenergin går till kylvattnet. Mer effekt betyder mer värme.',
      'Om kylbehovet är större än kylarens kapacitet stiger temperaturen under heatet; över 115 °C tappar motorn effekt.'] },
  { id: 'utvaxling', title: 'Utväxling', formula: 'F = T · iväxel · islut · η / r',
    body: ['Drivkraften vid hjulen är motorns moment gånger total utväxling delat med hjulradien.',
      'Kort slutväxel ger mer drivkraft men lägre fart per växel.'] },
  { id: 'drivning', title: 'Vetari mot kardaani & Lukkoperä', formula: 'Fmax = μ · Fz,driv',
    body: ['Vid acceleration flyttas vikt bakåt: en bakhjulsdrivare får mer grepp, en framhjulsdrivare mindre.',
      'Enligt Sääntökirja är lukkoperä (diffspärr/svetsad diff) endast tillåten på bakhjulsdrivna bilar i myyntiluokat, medan den i Super-luokka är tillåten även på framhjulsdrivna bilar!'] },
  { id: 'grepp', title: 'Grepp på grus, asfalt och is', formula: 'vmax = √(μ · g · R)',
    body: ['Högsta kurvfart bestäms av friktionstalet μ och kurvradien R. På grus är μ ≈ 0,78, på asfalt ≈ 1,02 och på is med rallydubb ≈ 0,52.',
      'På banor med blandat underlag (som Tammisaari och Rantasalmi) gäller det att utnyttja det höga greppet på asfalten (kestopäällyste) vid inbromsning och kurvtagning!'] },
];

// Däcktyper (gratis att byta). grip = friktionsfaktor, wear = slitagefaktor
export const TYRES = {
  std: { id: 'std', name: 'Standarddäck', price: 240, grip: 0.86, wear: 1.0, desc: 'Billiga standarddäck – lågt grepp.' },
  westlake: { id: 'westlake', name: 'Westlake', price: 260, grip: 1.02, wear: 1.1, desc: 'Lite sämre än CrossClimate, men mycket bättre än standarddäcken.' },
  cc: { id: 'cc', name: 'CrossClimate', price: 380, grip: 1.10, wear: 0.9, desc: 'Mycket högt grepp på alla underlag.' },
  ccplus: { id: 'ccplus', name: 'CrossClimate Plus', price: 420, grip: 1.13, wear: 0.85, desc: 'Ännu lite mer grepp och längre livslängd än CrossClimate.' },
};
