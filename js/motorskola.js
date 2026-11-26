// Motorskola: kursens övningar 1–4 i motorteknik som lektioner i spelet.
// Varje lektion: teori + formler, kursens egen övning löst steg för steg, och övningsuppgifter med nya värden
// (en del räknas på spelarens egen motor från motormodellen i engine.js). Svaren rättas med 1,5 % tolerans.
import { fmt } from './engine.js';

const rnd = (a, b, step = 1) => Math.round((a + Math.random() * (b - a)) / step) * step;
const pick = a => a[Math.floor(Math.random() * a.length)];
const PI = Math.PI;

// ---------- lektionerna ----------
// theory-rader: [namn, formel, förklaring, hänvisning till formelpappret]
export const LESSONS = [
  {
    id: 1, title: 'Övning 1 · Jämförelse av två dieselmotorer', short: 'Slagvolym, BMEP, bsfc och verkningsgrad',
    theory: [
      ['Slagvolym', 'V<sub>d</sub> = πB²/4 · L ≈ 0,785·B²·L ;  V<sub>tot</sub> = z·V<sub>d</sub>', 'B = borrning, L = slaglängd i m → m³ (×1000 = l).', '★1 · sida 1'],
      ['Bromsat medeltryck', 'BMEP = P<sub>b</sub>·f<sub>s</sub> / (V<sub>d</sub>·N)', 'P<sub>b</sub> i W, V<sub>d</sub> = hela motorns slagvolym i m³, N i r/s (n/60), f<sub>s</sub> = 2 för fyrtakt. 10⁵ Pa = 1 bar. I bar direkt: BMEP = 600·P[kW]·f<sub>s</sub> / (V<sub>d</sub>[l]·n[r/min]).', '★6 · sida 1'],
      ['Specifik bränsleförbrukning', 'bsfc = ṁ<sub>f</sub> / P<sub>b</sub>', 'g/kWh = 1000·(kg/h)/kW.', '★10 · sida 1'],
      ['Bromsad verkningsgrad', 'η<sub>b</sub> = 3600 / (bsfc·Q<sub>LHV</sub>) = P<sub>b</sub> / (ṁ<sub>f</sub>·Q<sub>LHV</sub>)', 'bsfc i g/kWh och Q<sub>LHV</sub> i MJ/kg.', '★10 · sida 1'],
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
      ['Tillförd bränsleeffekt', 'Q̇<sub>fuel</sub> = ṁ<sub>f</sub>·Q<sub>LHV</sub>', 'ṁ<sub>f</sub> i kg/s (kg/h / 3600) och Q<sub>LHV</sub> i kJ/kg ger kW.', '10 Energibalans · sida 3'],
      ['Bromseffekt', 'P<sub>b</sub> = η<sub>b</sub>·Q̇<sub>fuel</sub>', '', '★9 · sida 1'],
      ['Energibalans', 'ṁ<sub>f</sub>Q<sub>LHV</sub> = P<sub>b</sub> + Q̇<sub>kyl</sub> + Q̇<sub>avg</sub> + Q̇<sub>övr</sub>', 'Förlusterna = Q̇<sub>fuel</sub> − P<sub>b</sub>. Kursens Sankey (DI-diesel): kylning ≈ 25 %, avgaser ≈ 25 %, friktion 5–10 %, nyttigt ≈ 40 %.', '★16 · sida 1, 10 · sida 3'],
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
      ['Nödvändig bränsleeffekt', 'Q̇<sub>fuel</sub> = P<sub>b</sub> / η<sub>b</sub>', '', 'Övning 3 · sida 1'],
      ['Bränsleflöde', 'ṁ<sub>f</sub> = Q̇<sub>fuel</sub> / Q<sub>LHV</sub> · 3600', 'Q̇ [kW] / Q<sub>LHV</sub> [kJ/kg] = kg/s → ×3600 = kg/h.', 'Tips · sida 1'],
      ['Volymflöde', 'V̇ = ṁ<sub>f</sub> / ρ', 'ρ i kg/l ger l/h.', 'Övning 3 · sida 1'],
      ['Specifik förbrukning', 'bsfc = ṁ<sub>f</sub> / P<sub>b</sub>', 'Vid P<sub>b</sub> = 1000 kW är kg/h = g/kWh.', '★10 · sida 1'],
      ['Tankens räckvidd', 't = V<sub>tank</sub> / V̇', '1 m³ = 1000 l, dygn = h/24.', 'Övning 3 · sida 1'],
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
      ['Syrebehov', 'm<sub>O₂</sub> = 2,667·c + 8·h', 'C + O₂ → CO₂: 32/12 = 2,667 kg O₂/kg C · H₂ + ½O₂ → H₂O: 16/2 = 8 kg O₂/kg H. c, h = massandelar.', 'Övning 4 · sida 3'],
      ['Stökiometriskt A/F', '(A/F)<sub>s</sub> = m<sub>O₂</sub> / 0,232', 'O₂ i luft: 23,2 vikt-%.', 'Övning 4 · sida 3'],
      ['Luftöverskott', 'λ = (A/F) / (A/F)<sub>s</sub> ⇔ A/F = λ·(A/F)<sub>s</sub>', 'λ < 1 rik (CO, HC↑), λ = 1 stökiometrisk (TWC), λ > 1 mager. Diesel alltid λ ≈ 1,3–4. I spelets Trimning kan du ändra λ!', '★14 · sida 1, 8 · sida 3'],
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
  // ---- extra lektioner direkt från formelpappret (tentamenssammanfattningen) ----
  {
    id: 5, title: 'Geometri, kolvhastighet och litereffekt', short: 'r<sub>c</sub>, V<sub>c</sub>, S̄<sub>p</sub>, P/V<sub>d</sub>', extra: 1,
    theory: [
      ['Kompressionsförhållande', 'r<sub>c</sub> = (V<sub>d</sub> + V<sub>c</sub>) / V<sub>c</sub> ⇔ V<sub>c</sub> = V<sub>d</sub> / (r<sub>c</sub> − 1)', 'Alltid per cylinder! Ex: (403 + 62)/62 = 7,5.', '★2 · sida 1'],
      ['Medelkolvhastighet', 'S̄<sub>p</sub> = 2·L·N', 'N i r/s. Normalt 8–18 m/s, tävling 25–28 m/s.', '★3 · sida 1'],
      ['Litereffekt', 'P / V<sub>d</sub> [kW/l]', 'Otto 30–60, tävling 75–150, lastbilsdiesel ≤ 25.', '3 · sida 1'],
      ['Effekt ur moment', 'P = T·ω = 2π·N·T ;  P[kW] = T·n/9549', 'n i r/min.', '★4 · sida 1'],
    ],
    example: { text: 'Sisu 420 DWRIE (kursmotor): 108 × 120 mm, 4 cyl, r<sub>c</sub> 16,5, 95 kW vid 2200 r/min, 500 Nm vid 1400 r/min.', steps: [
      ['Slagvolym', '0,785·0,108²·0,120 = 1,099 l per cyl → 4,40 l'], ['V<sub>c</sub>', '1,099/(16,5 − 1) = <b>0,0709 l = 70,9 cm³</b>'],
      ['S̄<sub>p</sub> vid P<sub>max</sub>', '2·0,120·2200/60 = <b>8,8 m/s</b>'], ['Litereffekt', '95/4,40 = <b>21,6 kW/l</b>'], ['Effekt vid T<sub>max</sub>', '500·1400/9549 = <b>73,3 kW</b>']] },
    discuss: [],
  },
  {
    id: 6, title: 'Ideala cykler och isentrop kompression', short: 'p₂, T₂, η<sub>T,Otto</sub>', extra: 1,
    theory: [
      ['Isentrop kompression 1–2', 'p₂ = p₁·r<sub>c</sub><sup>κ</sup> ;  T₂ = T₁·r<sub>c</sub><sup>κ−1</sup>', 'Absolut tryck och kelvin! κ = 1,3–1,4.', '★11 · sida 1, 6 · sida 2'],
      ['Termisk verkningsgrad Otto', 'η<sub>T,Otto</sub> = 1 − 1 / r<sub>c</sub><sup>κ−1</sup>', 'Ex: r<sub>c</sub> 8, κ 1,4 → 56,5 %.', '★13 · sida 1'],
      ['Isentrop expansion 3–4', 'p₄ = p₃·(V₃/V₄)<sup>κ</sup> ;  T₄ = T₃·(V₃/V₄)<sup>κ−1</sup>', 'Otto: V₃/V₄ = 1/r<sub>c</sub>.', '6 · sida 2'],
    ],
    example: { text: 'Otto: r<sub>c</sub> = 10, p₁ = 1 bar, T₁ = 293 K (20 °C), κ = 1,4.', steps: [
      ['p₂', '1·10<sup>1,4</sup> = <b>25,1 bar</b>'], ['T₂', '293·10<sup>0,4</sup> = <b>736 K (463 °C)</b>'], ['η<sub>T</sub>', '1 − 1/10<sup>0,4</sup> = <b>60,2 %</b>']] },
    discuss: [['Varför har en Otto högre ideal verkningsgrad än en diesel vid samma r<sub>c</sub>, men dieseln högre i verkligheten?', 'Vid samma r<sub>c</sub> tillförs värmet i Otto vid konstant volym (allt vid ÖDP) vilket ger störst tryck- och temperaturökning och störst innesluten yta → η<sub>Otto</sub> > η<sub>Seiliger</sub> > η<sub>Diesel</sub>. Men dieseln kan ha mycket högre r<sub>c</sub> (16–22 mot 8–12, otto begränsas av knack), går magert (λ > 1, högre κ), saknar spjäll (små pumpförluster) – därför blir dieselns verkliga η<sub>b</sub> högre (38–45 % mot 28–32 %).']],
  },
  {
    id: 7, title: 'Luft, fyllnadsgrad och bränsle per cylinder', short: 'ρ, m<sub>a,cyl</sub>, η<sub>V</sub>, laddluft', extra: 1,
    theory: [
      ['Luftens densitet', 'ρ = p / (R·T)', 'R<sub>luft</sub> = 287 J/(kg·K), p i Pa, T i K. ≈ 1,2 kg/m³ vid 20 °C.', '8 · sida 3'],
      ['Luft per cylinder', 'm<sub>a,cyl</sub> = η<sub>V</sub>·ρ<sub>a</sub>·V<sub>d</sub>', 'V<sub>d</sub> per cylinder. Sug 80–90 %, turbo η<sub>V</sub> > 1.', '★14 · sida 1, 8 · sida 3'],
      ['Bränsle per cylinder', 'm<sub>f,cyl</sub> = m<sub>a,cyl</sub> / (λ·(A/F)<sub>s</sub>) ;  ṁ<sub>f</sub> = m<sub>f,cyl</sub>·z·N/f<sub>s</sub>', '', '8 · sida 3'],
      ['Laddluftens densitet', 'm<sub>a,turbo</sub>/m<sub>a,sug</sub> ≈ (p₂/p₀)·(T₀/T₂)', 'Absolut tryck! 1,5 bar övertryck = 2,5 bar abs.', '9 · sida 3'],
    ],
    example: { text: 'Sugmotor 2,0 l, 4 cyl, 20 °C, 1,013 bar, η<sub>V</sub> = 0,90, bensin λ = 1, (A/F)<sub>s</sub> = 14,6, 6000 r/min.', steps: [
      ['ρ', '101 300/(287·293) = <b>1,205 kg/m³</b>'], ['m<sub>a,cyl</sub>', '0,90·1,205·0,5·10⁻³ = <b>0,542 g</b>'],
      ['m<sub>f,cyl</sub>', '0,542/14,6 = <b>0,0371 g</b>'], ['ṁ<sub>f</sub>', '0,0371·4·100/2 = 7,42 g/s = <b>26,7 kg/h</b>']] },
    discuss: [],
  },
  {
    id: 8, title: 'Energibalans – kylvatten och avgaser', short: 'Q̇ = ṁ·c·ΔT, Sankey', extra: 1,
    theory: [
      ['Kylvatten', 'Q̇<sub>kyl</sub> = ṁ<sub>w</sub>·c<sub>w</sub>·(T<sub>ut</sub> − T<sub>in</sub>)', 'c<sub>w</sub> = 4,18 kJ/(kg·K), 1 l vatten = 1 kg.', '10 · sida 3'],
      ['Avgaser', 'Q̇<sub>avg</sub> = ṁ<sub>ex</sub>·c<sub>p,ex</sub>·(T<sub>avg</sub> − T₀) ;  ṁ<sub>ex</sub> = ṁ<sub>f</sub>(1 + A/F)', 'c<sub>p,ex</sub> = 1,05–1,15 kJ/(kg·K).', '10 · sida 3'],
      ['Energibalans', 'Q̇<sub>fuel</sub> = P<sub>b</sub> + Q̇<sub>kyl</sub> + Q̇<sub>avg</sub> + Q̇<sub>övr</sub>', 'Q̇<sub>övr</sub> = strålning, ofullständig förbränning m.m.', '★16 · sida 1'],
    ],
    example: { text: 'Diesel: ṁ<sub>f</sub> = 20 kg/h, A/F = 29,2, T<sub>avg</sub> = 450 °C, T₀ = 25 °C, c<sub>p,ex</sub> = 1,1. Kylvatten 2,0 kg/s, 80 → 88 °C.', steps: [
      ['ṁ<sub>ex</sub>', '20·(1 + 29,2) = 604 kg/h = <b>0,1678 kg/s</b>'], ['Q̇<sub>avg</sub>', '0,1678·1,1·(450 − 25) = <b>78,4 kW</b>'], ['Q̇<sub>kyl</sub>', '2,0·4,18·8 = <b>66,9 kW</b>']] },
    discuss: [],
  },
  {
    id: 9, title: 'Förbränningskemi för C<sub>a</sub>H<sub>b</sub>O<sub>c</sub>', short: 'i = a + b/4 − c/2, (A/F)<sub>s</sub>', extra: 1,
    theory: [
      ['Syrebehov (mol O₂ per mol bränsle)', 'i = a + b/4 − c/2', 'a = C-atomer, b = H-atomer, c = O-atomer.', '11 · sida 3'],
      ['Stökiometriskt A/F', '(A/F)<sub>s</sub> = 137,3·i / (12a + b + 16c)', '137,3 = 2·16 + (79/21)·2·14 g luft per mol O₂. Molmassor C 12, H 1, O 16, N 14.', '11 · sida 3'],
    ],
    example: { text: 'Oktan C₈H₁₈ och metanol CH₃OH (CH₄O).', steps: [
      ['Oktan i', '8 + 18/4 − 0 = <b>12,5</b>'], ['Oktan (A/F)<sub>s</sub>', '137,3·12,5/(96 + 18) = <b>15,1</b>'], ['Metanol i', '1 + 4/4 − 1/2 = <b>1,5</b>'], ['Metanol (A/F)<sub>s</sub>', '137,3·1,5/(12 + 4 + 16) = <b>6,44</b>']] },
    discuss: [],
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
  5: [
    () => { const B = rnd(70, 130, 1), L = rnd(70, 140, 1), z = pick([4, 5, 6]), rc = rnd(8, 20, 0.5), n = rnd(1800, 7000, 100), Vd = 0.785398 * (B / 1000) ** 2 * (L / 1000) * 1000, Vc = Vd / (rc - 1);
      return { title: 'Geometri och kolvhastighet', given: [['Borrning B', B + ' mm'], ['Slaglängd L', L + ' mm'], ['Cylindrar z', z], ['r<sub>c</sub>', v(rc, 1)], ['Varvtal', fmt(n) + ' r/min']],
        asks: [{ label: 'V<sub>d</sub> per cylinder (l)', answer: Vd, dec: 3 }, { label: 'V<sub>c</sub> (cm³)', answer: Vc * 1000, dec: 1 }, { label: 'S̄<sub>p</sub> (m/s)', answer: 2 * L / 1000 * n / 60, dec: 2 }], why: `Vd = 0,785·B²·L = ${v(Vd, 3)} l · Vc = Vd/(rc−1) = ${v(Vc * 1000, 1)} cm³ · Sp = 2·L·N = ${v(2 * L / 1000 * n / 60)} m/s` }; },
    () => { const T = rnd(120, 900, 10), n = rnd(1200, 6500, 100), Vd = pick([1.6, 2.0, 2.3, 3.0, 4.4, 7.4]), P = T * n / 9549;
      return { title: 'Effekt, litereffekt och BMEP i bar', given: [['Moment T', T + ' Nm'], ['Varvtal n', fmt(n) + ' r/min'], ['Slagvolym V<sub>d</sub>', v(Vd, 1) + ' l (4T)']],
        asks: [{ label: 'P (kW)', answer: P, dec: 1 }, { label: 'Litereffekt (kW/l)', answer: P / Vd, dec: 1 }, { label: 'BMEP (bar)', answer: 600 * P * 2 / (Vd * n), dec: 2 }], why: `P = T·n/9549 = ${v(P, 1)} kW · P/Vd = ${v(P / Vd, 1)} kW/l · BMEP = 600·P·fs/(Vd·n) = ${v(600 * P * 2 / (Vd * n))} bar (= 4πT/Vd)` }; },
  ],
  6: [
    () => { const rc = pick([8, 9, 10, 11, 12, 14, 16, 18]), k = pick([1.3, 1.35, 1.4]), p1 = pick([0.9, 1.0, 1.013]), t1 = rnd(15, 60, 5), T1 = t1 + 273.15;
      return { title: 'Isentrop kompression', given: [['r<sub>c</sub>', rc], ['κ', v(k, 2)], ['p₁', v(p1, 3) + ' bar'], ['T₁', t1 + ' °C']],
        asks: [{ label: 'p₂ (bar)', answer: p1 * rc ** k, dec: 2 }, { label: 'T₂ (K)', answer: T1 * rc ** (k - 1), dec: 0 }, { label: 'η<sub>T,Otto</sub> (%)', answer: (1 - rc ** (1 - k)) * 100, dec: 1 }], why: `p₂ = p₁·rc^κ = ${v(p1 * rc ** k)} bar · T₂ = (${v(T1, 2)} K)·rc^(κ−1) = ${v(T1 * rc ** (k - 1), 0)} K · ηT = 1 − 1/rc^(κ−1) = ${v((1 - rc ** (1 - k)) * 100, 1)} %` }; },
  ],
  7: [
    () => { const pb = rnd(0.95, 2.6, 0.05), tc = rnd(15, 60, 5), T = tc + 273.15, rho = pb * 1e5 / (287 * T), Vd = pick([1.6, 1.8, 2.0, 2.5, 3.0]), z = 4, eV = rnd(0.8, 1.1, 0.01), lam = pick([0.9, 1, 1.0, 1.1]), afs = 14.6, n = rnd(3000, 7000, 500);
      const ma = eV * rho * Vd / z / 1000, mf = ma / (lam * afs), mdot = mf * z * n / 60 / 2 * 3600;
      return { title: 'Luft och bränsle per cylinder', given: [['Insugstryck (abs)', v(pb, 2) + ' bar'], ['Insugstemp.', tc + ' °C'], ['V<sub>d</sub> (4 cyl, 4T)', v(Vd, 1) + ' l'], ['η<sub>V</sub>', v(eV, 2)], ['λ', v(lam, 1)], ['(A/F)<sub>s</sub>', '14,6'], ['Varvtal', fmt(n) + ' r/min']],
        asks: [{ label: 'ρ (kg/m³)', answer: rho, dec: 3 }, { label: 'm<sub>a,cyl</sub> (g)', answer: ma * 1000, dec: 3 }, { label: 'ṁ<sub>f</sub> (kg/h)', answer: mdot, dec: 2 }], why: `ρ = p/(RT) = ${v(rho, 3)} · ma = ηV·ρ·Vd,cyl = ${v(ma * 1000, 3)} g · mf,cyl = ma/(λ·14,6) · ṁf = mf·z·N/2 = ${v(mdot)} kg/h` }; },
    () => { const p2 = rnd(1.5, 3.0, 0.1), T2c = rnd(30, 120, 5), T0c = rnd(10, 30, 5), r = p2 / 1.0 * (T0c + 273.15) / (T2c + 273.15);
      return { title: 'Laddluftens densitet', given: [['Laddtryck p₂ (abs)', v(p2, 1) + ' bar'], ['Lufttemp. efter kylare T₂', T2c + ' °C'], ['Omgivning p₀ / T₀', `1,0 bar / ${T0c} °C`]],
        asks: [{ label: 'm<sub>a,turbo</sub>/m<sub>a,sug</sub>', answer: r, dec: 2 }], why: `(p₂/p₀)·(T₀/T₂) = ${v(p2, 1)}·${v(T0c + 273.15, 2)}/${v(T2c + 273.15, 2)} = ${v(r)} – i kelvin!` }; },
  ],
  8: [
    () => { const mf = rnd(8, 60, 1), lam = rnd(1.4, 3, 0.1), AF = 14.6 * lam, Tex = rnd(350, 600, 10), T0 = 25, cp = 1.1, mex = mf * (1 + AF) / 3600, Qav = mex * cp * (Tex - T0), mw = rnd(1, 4, 0.1), dT = rnd(5, 12, 1), Qk = mw * 4.18 * dT;
      return { title: 'Värmeflöden i avgaser och kylvatten', given: [['ṁ<sub>f</sub>', mf + ' kg/h'], ['A/F', v(AF, 1)], ['T<sub>avg</sub> / T₀', `${Tex} / 25 °C`], ['c<sub>p,ex</sub>', '1,1 kJ/(kg·K)'], ['Kylvatten', `${v(mw, 1)} kg/s, ΔT ${dT} K`]],
        asks: [{ label: 'ṁ<sub>ex</sub> (kg/s)', answer: mex, dec: 4 }, { label: 'Q̇<sub>avg</sub> (kW)', answer: Qav, dec: 1 }, { label: 'Q̇<sub>kyl</sub> (kW)', answer: Qk, dec: 1 }], why: `ṁex = ṁf(1 + A/F)/3600 = ${v(mex, 4)} kg/s · Q̇avg = ṁex·cp·ΔT = ${v(Qav, 1)} kW · Q̇kyl = ṁw·4,18·ΔT = ${v(Qk, 1)} kW` }; },
  ],
  9: [
    () => { const F = pick([['Metan CH₄', 1, 4, 0], ['Propan C₃H₈', 3, 8, 0], ['Oktan C₈H₁₈', 8, 18, 0], ['Etanol C₂H₅OH', 2, 6, 1], ['Metanol CH₃OH', 1, 4, 1], ['Diesel ≈ C₁₂H₂₃', 12, 23, 0], ['Butan C₄H₁₀', 4, 10, 0]]), i = F[1] + F[2] / 4 - F[3] / 2, AF = 137.3 * i / (12 * F[1] + F[2] + 16 * F[3]);
      return { title: `Stökiometri för ${F[0]}`, given: [['Bränsle', F[0]], ['a / b / c', `${F[1]} / ${F[2]} / ${F[3]}`]],
        asks: [{ label: 'i (mol O₂/mol)', answer: i, dec: 2 }, { label: '(A/F)<sub>s</sub>', answer: AF, dec: 2 }], why: `i = a + b/4 − c/2 = ${v(i)} · (A/F)s = 137,3·i/(12a + b + 16c) = ${v(AF)}` }; },
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
