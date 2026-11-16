// Mästerskap: Alkuerä → Keräilyerä → Last Call → Semifinal → finaler F…A (topp 3 går upp till nästa final).
// Ren logik utan DOM, används både i karriären och online. Heat där ingen människa kör simuleras.

export const NORMAL_PRIZE = [60, 35, 20, 15, 9, 4];                // vanligt lopp, plats 1–6
export const A_TABLE = [[350, 25], [270, 20], [211, 15], [150, 12], [125, 10], [100, 8], [75, 6], [50, 4], [50, 2], [25, 1]]; // [€, poäng]
export const FIN = ['A', 'B', 'C', 'D', 'E', 'F'];
export const ROUND = { alku: 'Alkuerä', kerailu: 'Keräilyerä', lastcall: 'Last Call', semi: 'Semifinal', final: 'Final' };
export const PROMOTE = 3;

const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Slumpar deltagarna jämnt över heaten. Ingen hänsyn tas till vilka som är kompisar – med en kompis är chansen
// att hamna i samma heat ≈ 1/antal heat, med tio kompisar är det nästan säkert att minst en hamnar i ens heat.
export function distribute(ids, perStart) {
  const a = shuffle(ids), n = Math.max(1, Math.ceil(a.length / perStart)), out = Array.from({ length: n }, () => []);
  a.forEach((id, i) => out[i % n].push(id)); return out;
}

export function heatName(h) { return h.round === 'final' ? `${h.letter}-final` : `${ROUND[h.round]}${h.count > 1 ? ' ' + h.no : ''}`; }

// cfg: { perStart, heats, laps, joker, trackLen }, entrants: [{ id, name, diff?, kgHp?, human?, me? }]
export function newChamp(cfg, entrants) {
  const st = { cfg, E: Object.fromEntries(entrants.map(e => [e.id, e])), round: null, heats: [], skip: { alku: [], kerailu: [] },
    semi: [], ker: [], lc: [], out: [], fin: { A: [], B: [], C: [], D: [], E: [], F: [] }, finOrder: [], finRes: {}, history: [], done: false, overall: null };
  startRound(st, 'alku', entrants.map(e => e.id));
  return st;
}

function startRound(st, round, ids, letter) {
  const groups = round === 'final' ? [ids] : distribute(ids, st.cfg.perStart);
  st.round = round; st.letter = letter || null;
  st.heats = groups.filter(g => g.length).map((g, i, all) => ({ id: round + (letter || '') + (i + 1), round, letter: letter || null, no: i + 1, count: all.length, ids: g, res: null }));
  if (!st.heats.length) advance(st);
}

export const myHeat = (st, id) => st.heats.find(h => h.ids.includes(id));
export const canSkip = (st, id) => (st.round === 'alku' || st.round === 'kerailu') && !!myHeat(st, id) && !myHeat(st, id).res;

// KESKÖIDÄ: hoppa över alkuerä (→ keräilyerä) eller keräilyerä (→ last call)
export function skip(st, id) {
  if (!canSkip(st, id)) return false;
  const h = myHeat(st, id); h.ids = h.ids.filter(x => x !== id); st.skip[st.round].push(id); return true;
}

// Simulerat heat. Varvtid beror på AI-svårighet och bilens kg/hk, plus slump och en liten risk för straff/avbrott.
export function simHeat(st, h) {
  const { laps, joker, trackLen } = st.cfg, ref = trackLen / 17.5;
  const rows = h.ids.map(id => {
    const e = st.E[id], d = e.diff ?? 0.8, carF = Math.pow(Math.max(3, e.kgHp || 7) / 7, 0.12);
    const lap = ref * (1 + 4.1 * Math.pow(1 - d, 4.5)) * carF * (1 + (Math.random() - 0.5) * 0.04);
    let time = lap * laps + ref * 0.12 + (joker ? ref * 0.06 : 0) + Math.random() * 1.5, flag = '';
    const r = Math.random();
    if (r < 0.01) { flag = 'K'; time = null; }
    else if (r < 0.04 + 0.03 * (1 - d)) flag = 'A6';
    else if (r < 0.055 + 0.03 * (1 - d)) flag = 'LI';
    else if (joker && r < 0.07 + 0.03 * (1 - d)) flag = 'EJ AJA LISÄLENKKI';
    return { id, name: e.name, time, best: lap * (0.97 + Math.random() * 0.02), jokerLap: joker && flag !== 'EJ AJA LISÄLENKKI' ? 1 + Math.floor(Math.random() * laps) : null, flag, sim: 1 };
  });
  return sortRows(rows, trackLen / ref);
}

// Förare utan straff först (efter tid), sedan förare med straff, sist avbrutna
export function sortRows(rows, vAvg = 17.5) {
  const rank = r => r.flag === 'K' || r.flag === 'KA' || r.time == null ? 2 : r.flag ? 1 : 0;
  rows.sort((a, b) => rank(a) - rank(b) || (a.time ?? 1e9) - (b.time ?? 1e9));
  rows.forEach((r, i) => { if (i && r.dist == null && r.time != null && rows[i - 1].time != null) r.dist = Math.max(0, (r.time - rows[i - 1].time) * vAvg); });
  return rows;
}

export function setResult(st, h, rows) { h.res = rows; }
export const roundDone = st => st.heats.every(h => h.res);
const clean = r => !r.flag;

// Går vidare till nästa omgång när alla heat i omgången är klara
export function advance(st) {
  if (st.heats.length) st.history.push({ round: st.round, letter: st.letter, heats: st.heats });
  const P = st.cfg.perStart;
  if (st.round === 'alku') {
    for (const h of st.heats) { const q = h.res.filter(clean).slice(0, 2).map(r => r.id); st.semi.push(...q); st.ker.push(...h.res.filter(r => !q.includes(r.id)).map(r => r.id)); }
    st.ker.push(...st.skip.alku); return startRound(st, 'kerailu', st.ker);
  }
  if (st.round === 'kerailu') {
    for (const h of st.heats) { const n = h.ids.length >= 5 ? 2 : 1, q = h.res.filter(clean).slice(0, n).map(r => r.id); st.semi.push(...q); st.lc.push(...h.res.filter(r => !q.includes(r.id)).map(r => r.id)); }
    st.lc.push(...st.skip.kerailu); return startRound(st, 'lastcall', st.lc);
  }
  if (st.round === 'lastcall') {
    for (const h of st.heats) { const w = h.res.find(clean); if (w) st.semi.push(w.id); h.res.forEach((r, i) => { if (!w || r.id !== w.id) st.out.push({ id: r.id, pos: i }); }); }
    return startRound(st, 'semi', st.semi);
  }
  if (st.round === 'semi') {
    for (const h of st.heats) h.res.forEach((r, i) => st.fin[FIN[Math.min(i, 5)]].push(r.id));
    st.finOrder = [...FIN].reverse(); // F, E, D, C, B, A – körs i ordning
    return nextFinal(st);
  }
  if (st.round === 'final') {
    const L = st.letter, res = st.heats[0].res; st.finRes[L] = res;
    if (L !== 'A') { const up = FIN[FIN.indexOf(L) - 1], q = res.filter(clean).slice(0, PROMOTE).map(r => r.id); st.fin[up].push(...q); st.finRes[L] = res.filter(r => !q.includes(r.id)); }
    return nextFinal(st);
  }
}

function nextFinal(st) {
  while (st.finOrder.length) {
    const L = st.finOrder.shift();
    if (st.fin[L].length) return startRound(st, 'final', st.fin[L], L);
  }
  // Slutklassering: A-finalen, sedan kvarvarande i B…F, sist de som slogs ut i Last Call
  const ids = [];
  for (const L of FIN) for (const r of st.finRes[L] || []) ids.push(r.id);
  const nFin = ids.length; st.out.sort((a, b) => a.pos - b.pos).forEach(o => ids.push(o.id));
  st.overall = ids.map((id, i) => ({ id, name: st.E[id].name, pos: i + 1, prize: i < nFin ? A_TABLE[i]?.[0] || 0 : 0, pts: i < nFin ? A_TABLE[i]?.[1] || 0 : 0 }));
  st.done = true; st.round = 'done'; st.heats = [];
}

// Var i stegen befinner sig en förare? ('Alkuerä' … 'A-final', 'Utslagen')
export function whereIs(st, id) {
  if (st.done) { const o = st.overall.find(x => x.id === id); return o ? `Slutplacering ${o.pos}` : ''; }
  const h = myHeat(st, id); if (h) return heatName(h);
  if (st.round === 'alku' && st.skip.alku.includes(id)) return 'KESKÖIDÄ → Keräilyerä';
  if (st.round === 'kerailu' && st.skip.kerailu.includes(id)) return 'KESKÖIDÄ → Last Call';
  if (st.semi.includes(id) && st.round !== 'final') return 'Klar för semifinal';
  for (const L of FIN) if (st.fin[L].includes(id) && !st.finRes[L]) return `Väntar på ${L}-finalen`;
  if (st.out.some(o => o.id === id)) return 'Utslagen i Last Call';
  return 'Väntar';
}
