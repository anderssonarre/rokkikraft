// Motorskola: kursens övningar 1–4 i motorteknik som lektioner i spelet.
// Varje lektion: teori + formler, kursens egen övning löst steg för steg, och övningsuppgifter med nya värden
// (en del räknas på spelarens egen motor från motormodellen i engine.js). Svaren rättas med 1,5 % tolerans.
import { fmt } from './engine.js';

const rnd = (a, b, step = 1) => Math.round((a + Math.random() * (b - a)) / step) * step;
const pick = a => a[Math.floor(Math.random() * a.length)];
const PI = Math.PI;

// ---------- lektionerna ----------
export const LESSONS = [
  {
    id: 1, title: 'Övning 1 · Jämförelse av två dieselmotorer', short: 'Slagvolym, BMEP, bsfc och verkningsgrad',
    theory: [
      ['Slagvolym per cylinder', 'V<sub>d,cyl</sub> = π/4 · D² · s', 'D = cylinderdiameter (m), s = slaglängd (m). 1 m³ = 1000 liter.'],
      ['Total slagvolym', 'V<sub>d</sub> = z · V<sub>d,cyl</sub>', 'z = antal cylindrar.'],
      ['Bromsat medeltryck (fyrtakt)', 'BMEP = P · n<sub>R</sub> / (V<sub>d</sub> · n)', 'P i W, V<sub>d</sub> i m³, n i varv/s (rpm/60), n<sub>R</sub> = 2 för fyrtakt (ett arbetsslag varannat varv). 1 bar = 10⁵ Pa.'],
      ['Specifik bränsleförbrukning', 'bsfc = ṁ<sub>f</sub> / P', 'ṁ<sub>f</sub> i g/h och P i kW ger g/kWh. (kg/h · 1000 = g/h)'],
      ['Bromsad verkningsgrad', 'η<sub>b</sub> = P / (ṁ<sub>f</sub> · H<sub>u</sub>)', 'ṁ<sub>f</sub> i kg/s (kg/h / 3600), H<sub>u</sub> = undre värmevärde i kJ/kg → P i kW. Även η<sub>b</sub> = 3600 / (bsfc · H<sub>u</sub>) med bsfc i kg/kWh och H<sub>u</sub> i MJ/kg.'],
    ],
    example: {
      text: 'Motor A: 4 cyl, D = 120 mm, s = 140 mm, 1500 rpm, 100 kW, 24 kg/h. Motor B: 6 cyl, D = 110 mm, s = 130 mm, 1800 rpm, 120 kW, 29 kg/h. H<sub>u</sub> = 42,7 MJ/kg.',
      steps: [
        ['a) Slagvolym A', 'π/4 · 0,120² · 0,140 = 1,583·10⁻³ m³ = 1,583 l per cylinder → 4 · 1,583 = <b>6,33 l</b>'],
        ['a) Slagvolym B', 'π/4 · 0,110² · 0,130 = 1,235 l per cylinder → 6 · 1,235 = <b>7,41 l</b>'],
        ['b) BMEP A', '100 000 · 2 / (0,006333 · 1500/60) = 1 263 000 Pa = <b>12,63 bar</b>'],
        ['b) BMEP B', '120 000 · 2 / (0,007412 · 1800/60) = 1 079 000 Pa = <b>10,79 bar</b>'],
        ['c) bsfc', 'A: 24 000 g/h / 100 kW = <b>240,0 g/kWh</b> · B: 29 000 / 120 = <b>241,7 g/kWh</b>'],
        ['d) η<sub>b</sub>', 'A: 100 / (24/3600 · 42 700) = <b>35,13 %</b> · B: 120 / (29/3600 · 42 700) = <b>34,89 %</b>'],
      ],
    },
    discuss: [['e) Varför har en motor med högre specifik effekt inte nödvändigtvis bättre verkningsgrad?',
      'Specifik effekt (kW per liter, eller högt BMEP) säger hur hårt motorn utnyttjar sin slagvolym, inte hur väl den omvandlar bränslets energi. Högre effekt per liter fås ofta med högre varvtal, mer laddtryck och mer bränsle per cykel – det ökar friktionsförluster (som växer med varvtalet), värmeförluster och pumpförluster, och kan kräva rikare blandning eller senare tändning/insprutning för att undvika knack/termisk last. Verkningsgraden bestäms av hur stor del av bränsleenergin som blir axelarbete (bsfc). I övningen har motor A högre BMEP (12,63 bar mot 10,79) men nästan samma verkningsgrad (35,1 % mot 34,9 %).']],
  },
  {
    id: 2, title: 'Övning 2 · Bränsleeffekt och nyttig effekt', short: 'Tillförd effekt, bromseffekt och förluster',
    theory: [
      ['Tillförd bränsleeffekt', 'P<sub>f</sub> = ṁ<sub>f</sub> · H<sub>u</sub>', 'ṁ<sub>f</sub> i kg/s (kg/h / 3600) och H<sub>u</sub> i kJ/kg ger kW. 42,7 MJ/kg = 42 700 kJ/kg.'],
      ['Bromseffekt (nyttig effekt)', 'P<sub>b</sub> = η<sub>b</sub> · P<sub>f</sub>', 'η<sub>b</sub> = bromsad verkningsgrad (som decimaltal).'],
      ['Förluster', 'P<sub>förlust</sub> = P<sub>f</sub> − P<sub>b</sub>', 'Går till kylvatten, avgaser (värme + kemisk energi), strålning och mekanisk friktion/pumpning. Ungefär en tredjedel vardera till avgaser och kylning i en stor diesel.'],
    ],
    example: {
      text: 'Dieselmotor: ṁ<sub>f</sub> = 90 kg/h, H<sub>u</sub> = 42,7 MJ/kg, η<sub>b</sub> = 46,8 %.',
      steps: [
        ['a) Tillförd effekt', '90/3600 kg/s · 42 700 kJ/kg = <b>1067,5 kW</b>'],
        ['b) Bromseffekt', '0,468 · 1067,5 = <b>499,6 kW</b>'],
        ['c) Förluster', '1067,5 − 499,6 = <b>567,9 kW</b> (53,2 % av bränsleenergin)'],
      ],
    },
    discuss: [['c) Hur stor effekt förloras genom värme, avgaser och mekaniska förluster? Hur resonerar du?',
      'Allt som inte blir axeleffekt är förlust: 1067,5 − 499,6 = 567,9 kW (53,2 %). Energin bevaras, så förlusterna måste gå någonstans: den största delen som värme till avgaserna (varma gaser ut ur cylindern) och till kylsystemet (värme genom cylinderväggar, topp och kolvar), en mindre del som mekaniska förluster (friktion i kolvar, lager, ventilmekanism, hjälpaggregat och pumparbete) som också slutar som värme i olja och kylvatten, samt lite strålning. En typisk fördelning för en stor diesel kan vara ~25–30 % avgaser, ~15–20 % kylning och ~5–8 % mekaniskt – exakt fördelning kräver mätningar (värmebalans).']],
  },
  {
    id: 3, title: 'Övning 3 · Diesel och metanol', short: 'Bränsleflöde, volym och tankens räckvidd',
    theory: [
      ['Nödvändig bränsleeffekt', 'P<sub>f</sub> = P<sub>b</sub> / η<sub>b</sub>', ''],
      ['Bränsleflöde (massa)', 'ṁ<sub>f</sub> = P<sub>f</sub> / H<sub>u</sub> · 3600', 'P<sub>f</sub> i kW och H<sub>u</sub> i kJ/kg ger kg/s → · 3600 ger kg/h.'],
      ['Bränsleflöde (volym)', 'V̇<sub>f</sub> = ṁ<sub>f</sub> / ρ', 'ρ = densitet i kg/l ger l/h.'],
      ['Specifik förbrukning', 'bsfc = ṁ<sub>f</sub> / P<sub>b</sub>', 'kg/h · 1000 / kW = g/kWh. Vid P<sub>b</sub> = 1000 kW blir g/kWh samma siffra som kg/h.'],
      ['Tankens räckvidd', 't = V<sub>tank</sub> / V̇<sub>f</sub>', '1 m³ = 1000 l. Dygn = h / 24.'],
    ],
    example: {
      text: 'P<sub>b</sub> = 1000 kW. Diesel: H<sub>u</sub> 42,7 MJ/kg, ρ 0,84 kg/l, η 45 %. Metanol: H<sub>u</sub> 19,9 MJ/kg, ρ 0,792 kg/l, η 42 %. Tank 90 m³.',
      steps: [
        ['a) Bränsleeffekt', 'Diesel 1000/0,45 = <b>2222,2 kW</b> · Metanol 1000/0,42 = <b>2381,0 kW</b>'],
        ['b) kg/h', 'Diesel 2222,2/42 700 · 3600 = <b>187,35 kg/h</b> · Metanol 2381,0/19 900 · 3600 = <b>430,73 kg/h</b>'],
        ['c) l/h', 'Diesel 187,35/0,84 = <b>223,0 l/h</b> · Metanol 430,73/0,792 = <b>543,8 l/h</b>'],
        ['d) bsfc', 'Diesel <b>187,35 g/kWh</b> · Metanol <b>430,73 g/kWh</b>'],
        ['e) Volymförhållande', '543,8 / 223,0 = <b>2,44 gånger</b> större volym för metanol'],
        ['f) Tank 90 m³ metanol', '90 000 l / 543,8 l/h = <b>165,5 h ≈ 6,9 dygn</b>'],
      ],
    },
    discuss: [],
  },
  {
    id: 4, title: 'Övning 4 · Stökiometrisk förbränning', short: 'Syrebehov, (A/F)s och λ',
    theory: [
      ['Syre för kolet', 'C + O₂ → CO₂: 12 kg C behöver 32 kg O₂ → <b>32/12 = 2,667 kg O₂ per kg C</b>', ''],
      ['Syre för vätet', '2H₂ + O₂ → 2H₂O: 4 kg H behöver 32 kg O₂ → <b>8 kg O₂ per kg H</b>', ''],
      ['Syrebehov per kg bränsle', 'm<sub>O₂</sub> = c · 32/12 + h · 8', 'c och h = massandelar kol och väte (decimaltal).'],
      ['Stökiometriskt luft/bränsle', '(A/F)<sub>s</sub> = m<sub>O₂</sub> / 0,232', 'Luft innehåller 23,2 vikt-% syre.'],
      ['Verkligt luft/bränsle', '(A/F) = λ · (A/F)<sub>s</sub>', 'λ = luftöverskottsfaktor. λ = 1 stökiometriskt, λ > 1 magert (luftöverskott), λ < 1 fett. I spelets Trimning kan du ändra λ på din bensinmotor!'],
    ],
    example: {
      text: 'Diesel: 86,5 vikt-% C och 13,5 vikt-% H. Luft 23,2 vikt-% O₂.',
      steps: [
        ['a) Syre', '0,865 · 32/12 + 0,135 · 8 = 2,3067 + 1,0800 = <b>3,3867 kg O₂/kg bränsle</b>'],
        ['b) (A/F)<sub>s</sub>', '3,3867 / 0,232 = <b>14,60 kg luft/kg bränsle</b>'],
        ['c) λ = 2', '2 · 14,60 = <b>29,20 kg luft/kg bränsle</b>'],
      ],
    },
    discuss: [['d) Förklara vad luftöverskottsfaktorn λ innebär för en dieselmotor.',
      'λ = verklig luftmängd / stökiometrisk luftmängd. En dieselmotor har ingen trottel – den suger (eller laddas med) i stort sett samma luftmängd hela tiden, och effekten styrs med hur mycket bränsle som sprutas in. Därför går den alltid med luftöverskott, λ ≈ 1,3–1,5 vid full last och λ > 3–5 på tomgång/låg last. Luftöverskottet behövs för att bränslesprayen ska hitta syre och brinna fullständigt innan avgasventilen öppnar; går λ för lågt (för mycket bränsle) blir det sot/svart rök och hög avgastemperatur. Högt λ ger låg förbränningstemperatur per kg luft, bra verkningsgrad och mindre CO/HC, men mer NOx-bildning i heta zoner och syre i avgaserna (därför fungerar inte en vanlig trevägskatalysator, i stället används SCR/AdBlue och partikelfilter).']],
  },
];

// ---------- uppgiftsgeneratorer (samma format som Räknebänken: given, asks{label, answer, dec}) ----------
const v = (x, d = 2) => fmt(x, d);
const GEN = {
  1: [
    () => { const z = pick([4, 5, 6, 8]), D = rnd(85, 135, 1), s = rnd(90, 160, 1), n = rnd(1400, 2200, 50), P = rnd(60, 260, 5), bs = rnd(195, 255, 1), mf = P * bs / 1000;
      const Vd = PI / 4 * (D / 1000) ** 2 * (s / 1000) * z, bmep = P * 1000 * 2 / (Vd * n / 60) / 1e5;
      return { title: 'Dieselmotor – slagvolym och BMEP', given: [['Cylindrar', z], ['Cylinderdiameter D', D + ' mm'], ['Slaglängd s', s + ' mm'], ['Varvtal', fmt(n) + ' rpm'], ['Effekt P', P + ' kW']],
        asks: [{ label: 'Total slagvolym (liter)', answer: Vd * 1000, dec: 2 }, { label: 'BMEP (bar)', answer: bmep, dec: 2 }], why: `Vd = π/4·D²·s·z = ${v(Vd * 1000)} l · BMEP = P·2/(Vd·n/60) = ${v(bmep)} bar` }; },
    () => { const P = rnd(60, 300, 5), mf = rnd(14, 75, 0.5), Hu = 42.7, bsfc = mf * 1000 / P, eta = P / (mf / 3600 * Hu * 1000) * 100;
      return { title: 'Dieselmotor – bsfc och verkningsgrad', given: [['Effekt P', P + ' kW'], ['Bränsleförbrukning', v(mf, 1) + ' kg/h'], ['Undre värmevärde', '42,7 MJ/kg']],
        asks: [{ label: 'bsfc (g/kWh)', answer: bsfc, dec: 1 }, { label: 'Bromsad verkningsgrad η_b (%)', answer: eta, dec: 2 }], why: `bsfc = ${v(mf, 1)}·1000/${P} = ${v(bsfc, 1)} g/kWh · η = P/(ṁ·Hu) = ${v(eta)} %` }; },
  ],
  2: [
    () => { const mf = rnd(20, 160, 1), eta = rnd(36, 50, 0.1), Hu = pick([42.7, 43.0, 42.5]), Pf = mf / 3600 * Hu * 1000, Pb = Pf * eta / 100;
      return { title: 'Bränsleeffekt och nyttig effekt', given: [['Bränsleförbrukning', mf + ' kg/h'], ['Undre värmevärde', v(Hu, 1) + ' MJ/kg'], ['Bromsad verkningsgrad', v(eta, 1) + ' %']],
        asks: [{ label: 'Tillförd bränsleeffekt (kW)', answer: Pf, dec: 1 }, { label: 'Bromseffekt (kW)', answer: Pb, dec: 1 }, { label: 'Förluster (kW)', answer: Pf - Pb, dec: 1 }], why: `Pf = ${mf}/3600·${v(Hu * 1000, 0)} = ${v(Pf, 1)} kW · Pb = ${v(eta / 100, 3)}·Pf = ${v(Pb, 1)} kW` }; },
    () => { const Pb = rnd(150, 900, 10), eta = rnd(36, 48, 0.5), Hu = 42.7, Pf = Pb / (eta / 100), mf = Pf / (Hu * 1000) * 3600;
      return { title: 'Hur mycket bränsle går åt?', given: [['Bromseffekt', Pb + ' kW'], ['Verkningsgrad', v(eta, 1) + ' %'], ['Undre värmevärde', '42,7 MJ/kg']],
        asks: [{ label: 'Tillförd bränsleeffekt (kW)', answer: Pf, dec: 1 }, { label: 'Bränsleförbrukning (kg/h)', answer: mf, dec: 2 }], why: `Pf = Pb/η = ${v(Pf, 1)} kW · ṁ = Pf/Hu·3600 = ${v(mf)} kg/h` }; },
  ],
  3: [
    () => { const F = pick([['Diesel', 42.7, 0.84], ['Metanol', 19.9, 0.792], ['Etanol', 26.8, 0.789], ['Bensin', 43.0, 0.745], ['HVO', 44.0, 0.78]]), Pb = rnd(200, 2000, 50), eta = rnd(38, 47, 1);
      const Pf = Pb / (eta / 100), mf = Pf / (F[1] * 1000) * 3600, Vf = mf / F[2];
      return { title: `${F[0]} som bränsle`, given: [['Bromseffekt', Pb + ' kW'], ['Verkningsgrad', eta + ' %'], ['Undre värmevärde', v(F[1], 1) + ' MJ/kg'], ['Densitet', v(F[2], 3) + ' kg/l']],
        asks: [{ label: 'Bränsleflöde (kg/h)', answer: mf, dec: 2 }, { label: 'Volymflöde (l/h)', answer: Vf, dec: 1 }, { label: 'bsfc (g/kWh)', answer: mf * 1000 / Pb, dec: 1 }], why: `Pf = ${v(Pf, 1)} kW · ṁ = ${v(mf)} kg/h · V̇ = ṁ/ρ = ${v(Vf, 1)} l/h` }; },
    () => { const tank = rnd(20, 150, 5), Pb = rnd(300, 1500, 50), eta = rnd(40, 46, 1), Pf = Pb / (eta / 100), mf = Pf / 19900 * 3600, Vf = mf / 0.792, h = tank * 1000 / Vf;
      return { title: 'Metanoltankens räckvidd', given: [['Tank', tank + ' m³ metanol'], ['Bromseffekt', Pb + ' kW'], ['Verkningsgrad', eta + ' %'], ['Metanol', '19,9 MJ/kg · 0,792 kg/l']],
        asks: [{ label: 'Volymflöde (l/h)', answer: Vf, dec: 1 }, { label: 'Drifttid (h)', answer: h, dec: 1 }], why: `V̇ = ${v(Vf, 1)} l/h · t = ${tank}·1000/V̇ = ${v(h, 1)} h (${v(h / 24, 1)} dygn)` }; },
  ],
  4: [
    () => { const c = rnd(83, 88, 0.1), hh = +(100 - c).toFixed(1), O = c / 100 * 32 / 12 + hh / 100 * 8, AF = O / 0.232, lam = pick([1.3, 1.5, 1.8, 2, 2.5, 3]);
      return { title: 'Stökiometri för ett bränsle', given: [['Kol', v(c, 1) + ' vikt-%'], ['Väte', v(hh, 1) + ' vikt-%'], ['Syre i luft', '23,2 vikt-%'], ['λ', v(lam, 1)]],
        asks: [{ label: 'Syrebehov (kg O₂/kg bränsle)', answer: O, dec: 3 }, { label: '(A/F)s (kg luft/kg)', answer: AF, dec: 2 }, { label: `Verkligt A/F vid λ = ${v(lam, 1)}`, answer: AF * lam, dec: 2 }], why: `O₂ = c·32/12 + h·8 = ${v(O, 3)} · (A/F)s = O₂/0,232 = ${v(AF)} · A/F = λ·(A/F)s = ${v(AF * lam)}` }; },
    () => { const AFs = pick([14.6, 14.7, 14.5]), lam = rnd(1.2, 4, 0.1), mf = rnd(10, 60, 1), air = mf * AFs * lam;
      return { title: 'Luftflöde i en dieselmotor', given: [['(A/F)s', v(AFs, 1)], ['λ', v(lam, 1)], ['Bränsleflöde', mf + ' kg/h']],
        asks: [{ label: 'Verkligt A/F', answer: AFs * lam, dec: 2 }, { label: 'Luftflöde (kg/h)', answer: air, dec: 0 }], why: `A/F = λ·(A/F)s = ${v(AFs * lam)} · luft = ṁ_f·A/F = ${v(air, 0)} kg/h` }; },
  ],
};

// Uppgifter på spelarens egen motor (motormodellen i engine.js): s = spec, e = engineAt(s, rpm)
export function ownTask(lesson, s, e, fuel) {
  const P = e.P, mfh = e.mf * 3600, rpm = e.rpm, Vd = s.Vd, z = s.cyl || 4, Hu = fuel.lhv;
  if (lesson === 1) return { title: `Din motor på dynon (${fmt(rpm)} rpm)`, own: true,
    given: [['Slagvolym', v(Vd, 2) + ' l'], ['Cylindrar', z], ['Varvtal', fmt(rpm) + ' rpm'], ['Effekt (mätt)', v(P, 1) + ' kW'], ['Bränsleförbrukning (mätt)', v(mfh, 2) + ' kg/h'], ['Bränsle', `${fuel.name}, Hu ${v(Hu, 1)} MJ/kg`]],
    asks: [{ label: 'Slagvolym per cylinder (l)', answer: Vd / z, dec: 3 }, { label: 'BMEP (bar)', answer: P * 1000 * 2 / (Vd / 1000 * rpm / 60) / 1e5, dec: 2 }, { label: 'bsfc (g/kWh)', answer: mfh * 1000 / P, dec: 1 }, { label: 'η_b (%)', answer: P / (e.mf * Hu * 1000) * 100, dec: 1 }],
    why: `Vd,cyl = ${v(Vd, 2)}/${z} = ${v(Vd / z, 3)} l · BMEP = ${v(P * 1000, 0)}·2/(${v(Vd / 1000, 4)}·${fmt(rpm)}/60) = ${v(P * 1000 * 2 / (Vd / 1000 * rpm / 60) / 1e5)} bar · bsfc = ${v(mfh * 1000, 0)}/${v(P, 1)} = ${v(mfh * 1000 / P, 1)} g/kWh · η = ${v(P, 1)}/(${v(e.mf, 5)}·${v(Hu * 1000, 0)}) = ${v(P / (e.mf * Hu * 1000) * 100, 1)} %. Siffrorna kommer från spelets motormodell – ändra trimningen och räkna igen!` };
  if (lesson === 2) { const Pf = e.mf * Hu * 1000; return { title: `Din motor: vart tar energin vägen? (${fmt(rpm)} rpm)`, own: true,
    given: [['Bränsleförbrukning', v(mfh, 2) + ' kg/h'], ['Bränsle', `${fuel.name}, Hu ${v(Hu, 1)} MJ/kg`], ['Effekt på dynon', v(P, 1) + ' kW']],
    asks: [{ label: 'Tillförd bränsleeffekt (kW)', answer: Pf, dec: 1 }, { label: 'Bromsad verkningsgrad (%)', answer: P / Pf * 100, dec: 1 }, { label: 'Förluster (kW)', answer: Pf - P, dec: 1 }],
    why: `Av ${v(Pf, 0)} kW går ca ${v(e.htmep / e.fuelmep * Pf, 0)} kW till kylningen (kylaren i spelet!), resten till avgaser och friktion.` }; }
  if (lesson === 3) { const m2 = P / 0.42 / 19900 * 3600; return { title: 'Din motor på metanol?', own: true,
    given: [['Effekt', v(P, 1) + ' kW'], ['Verkningsgrad med metanol', '42 %'], ['Metanol', '19,9 MJ/kg · 0,792 kg/l'], ['Tank', '40 liter']],
    asks: [{ label: 'Bränsleflöde (kg/h)', answer: m2, dec: 2 }, { label: 'Volymflöde (l/h)', answer: m2 / 0.792, dec: 1 }, { label: 'Minuter på fullgas med 40 l', answer: 40 / (m2 / 0.792) * 60, dec: 1 }],
    why: 'Metanol (M-bränsle) finns i Trimning – det kyler insuget och tål högre tändning, men tanken räcker kortare.' }; }
  const lam = s.lambda || 1, afs = fuel.afs; return { title: 'Din motors blandning (Trimning)', own: true,
    given: [['Bränsle', fuel.name], ['(A/F)s för bränslet', v(afs, 2)], ['Ditt λ (Trimning)', v(lam, 2)], ['Bränsleflöde', v(mfh, 2) + ' kg/h']],
    asks: [{ label: 'Verkligt A/F', answer: lam * afs, dec: 2 }, { label: 'Luftflöde (kg/h)', answer: mfh * lam * afs, dec: 0 }],
    why: lam < 1 ? 'λ < 1 = fet blandning: mer effekt och kylning men sämre verkningsgrad.' : lam > 1.05 ? 'λ > 1 = mager blandning: bättre verkningsgrad men risk för knack och höga temperaturer.' : 'λ ≈ 1 = stökiometriskt.' };
}

export function lessonTask(lesson) { const t = pick(GEN[lesson])(); t.lesson = lesson; return t; }
export function checkAnswers(t) {
  t.marks = t.asks.map((a, i) => { const x = parseFloat(String(t.vals?.[i] ?? '').replace(/\s/g, '').replace(',', '.')); return isFinite(x) && Math.abs(x - a.answer) <= Math.abs(a.answer) * 0.015 + 1e-9; });
  t.done = true; return t.marks.every(Boolean);
}
