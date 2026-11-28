// Onlinespel med rumskod – utan egen server.
// Spelet är en statisk sajt, så rummen går via publika MQTT-mäklare över WebSocket (TLS). Varje rum är ett
// ämne (topic) som alla i rummet prenumererar på. Värden (den som skapade rummet) äger rumsinställningar,
// startsignal, AI-bilar och slutresultat; varje spelare simulerar sin egen bil och skickar dess läge ~12 ggr/s.
// Flera mäklare används parallellt: allt skickas till alla anslutna och dubbletter filtreras bort.

export const PROTO = 1;
const DEFAULT_BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt'];
const enc = new TextEncoder(), dec = new TextDecoder();
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // inga 0/O/1/I som går att förväxla
export const makeCode = () => Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
export const cleanCode = s => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
const rid = () => Math.random().toString(36).slice(2, 10);

function brokers() {
  try { const q = new URLSearchParams(location.search).get('broker'); if (q) return q.split(','); } catch (e) { }
  return DEFAULT_BROKERS;
}

// ---------- minimal MQTT 3.1.1-klient (CONNECT, SUBSCRIBE, PUBLISH QoS 0, PING) ----------
const str = s => { const b = enc.encode(s), o = new Uint8Array(b.length + 2); o[0] = b.length >> 8; o[1] = b.length & 255; o.set(b, 2); return o; };
function packet(type, ...parts) {
  let len = 0; for (const p of parts) len += p.length;
  const head = [type]; let l = len; do { let d = l % 128; l = Math.floor(l / 128); if (l > 0) d |= 128; head.push(d); } while (l > 0);
  const o = new Uint8Array(head.length + len); o.set(head, 0); let at = head.length; for (const p of parts) { o.set(p, at); at += p.length; }
  return o;
}

class Mqtt {
  constructor(url, topic, onMsg, onState) {
    this.url = url; this.topic = topic; this.onMsg = onMsg; this.onState = onState; this.open = false; this.dead = false; this.buf = new Uint8Array(0); this.retry = 0;
    this.connect();
  }
  connect() {
    if (this.dead) return;
    let ws; try { ws = new WebSocket(this.url, 'mqtt'); } catch (e) { this.again(); return; }
    this.ws = ws; ws.binaryType = 'arraybuffer'; this.buf = new Uint8Array(0);
    ws.onopen = () => ws.send(packet(0x10, str('MQTT'), new Uint8Array([4, 2, 0, 30]), str('rk' + rid() + rid())));
    ws.onmessage = e => this.feed(new Uint8Array(e.data));
    ws.onclose = () => { if (this.ws !== ws) return; const was = this.open; this.open = false; clearInterval(this.ping); if (was) this.onState(); this.again(); };
    ws.onerror = () => { try { ws.close(); } catch (e) { } };
  }
  again() { if (this.dead) return; clearTimeout(this.rt); this.rt = setTimeout(() => this.connect(), Math.min(8000, 800 * 2 ** this.retry++)); }
  feed(chunk) {
    const b = new Uint8Array(this.buf.length + chunk.length); b.set(this.buf, 0); b.set(chunk, this.buf.length); let at = 0;
    for (;;) {
      if (b.length - at < 2) break;
      let len = 0, mul = 1, p = at + 1, ok = false;
      while (p < b.length) { const d = b[p++]; len += (d & 127) * mul; mul *= 128; if (!(d & 128)) { ok = true; break; } }
      if (!ok || b.length - p < len) break;
      this.handle(b[at] >> 4, b.subarray(p, p + len)); at = p + len;
    }
    this.buf = b.slice(at);
  }
  handle(type, body) {
    if (type === 2) { // CONNACK
      if (body[1] !== 0) { try { this.ws.close(); } catch (e) { } return; }
      this.ws.send(packet(0x82, new Uint8Array([0, 1]), str(this.topic), new Uint8Array([0])));
      clearInterval(this.ping); const ws = this.ws; this.ping = setInterval(() => { if (ws.readyState === 1) ws.send(new Uint8Array([0xC0, 0])); }, 20000);
    } else if (type === 9) { this.open = true; this.retry = 0; this.onState(); } // SUBACK
    else if (type === 3) { const tl = (body[0] << 8) | body[1]; try { this.onMsg(JSON.parse(dec.decode(body.subarray(2 + tl)))); } catch (e) { } }
  }
  send(bytes) { if (this.open && this.ws.readyState === 1 && this.ws.bufferedAmount < 60000) this.ws.send(bytes); }
  close() { this.dead = true; clearInterval(this.ping); clearTimeout(this.rt); try { this.ws.close(); } catch (e) { } }
}

// ---------- rum ----------
export class Room {
  // me = { name, car } · car = { spec, paint, bw, num, model, hp, cls }
  constructor({ code, host, me, onChange }) {
    this.code = code; this.isHost = !!host; this.id = rid(); this.me = me; this.onChange = onChange || (() => { });
    this.status = 'connecting'; // connecting | lobby | race | notfound | closed
    this.members = host ? [{ id: this.id, name: me.name, car: me.car, host: 1 }] : [];
    this.cfg = { track: 'tammisaari', laps: 3, ai: 2, joker: 0, diff: 75, weather: 'sol', perStart: 6 };
    this.live = {}; // pågående heat: { grid, cfg, lead, goAt, ready, done, order }
    this.offset = 0; this.rtt = Infinity; this.seen = new Map(); this.last = new Map(); this.n = 0; this.hostSeen = Date.now(); this.race = null; this.lastResult = null; this.hostId = host ? this.id : null;
    this.topicBytes = str(`rokkikraft/p${PROTO}/${code}`);
    this.links = brokers().map(u => new Mqtt(u, `rokkikraft/p${PROTO}/${code}`, m => this.recv(m), () => this.linkState()));
    this.t0 = Date.now();
    this.tick = setInterval(() => this.beat(), 1000);
    this.unload = () => this.leave(); window.addEventListener('pagehide', this.unload);
  }
  get connected() { return this.links.filter(l => l.open).length; }
  now() { return Date.now() + this.offset; } // värdens klocka
  send(o) { o.f = this.id; o.n = ++this.n; const bytes = packet(0x30, this.topicBytes, enc.encode(JSON.stringify(o))); for (const l of this.links) l.send(bytes); }
  linkState() {
    if (this.status === 'connecting' && this.connected) {
      if (this.isHost) { this.status = 'lobby'; this.sendRoom(); }
      else { this.hello(); this.joinT = Date.now(); }
    }
    this.onChange();
  }
  hello() { this.send({ k: 'hi', name: this.me.name, car: this.me.car }); }
  sendRoom() { this.send({ k: 'room', cfg: this.cfg, m: this.members, st: this.status, ht: Date.now() }); }
  setCfg(p) { if (!this.isHost) return; Object.assign(this.cfg, p); this.sendRoom(); this.onChange(); }
  setMe(me) { this.me = me; if (this.isHost) { const m = this.members.find(x => x.id === this.id); if (m) { m.name = me.name; m.car = me.car; } this.sendRoom(); } else this.hello(); }
  beat() {
    const now = Date.now(); this.bn = (this.bn || 0) + 1;
    if (!this.connected) { if (this.status === 'connecting' && now - this.t0 > 12000) { this.status = 'offline'; this.onChange(); } return; }
    if (this.status === 'offline') { this.status = 'connecting'; this.linkState(); }
    if (this.isHost) {
      let ch = false;
      this.members = this.members.filter(m => { const ok = m.id === this.id || now - (this.last.get(m.id) || 0) < (this.status === 'race' ? 15000 : 7000); if (!ok) ch = true; return ok; });
      if (ch || this.bn % 3 === 0) this.sendRoom();
      if (ch) this.onChange();
    } else {
      if (this.status === 'connecting' && this.joinT && now - this.joinT > 6000) { this.status = 'notfound'; this.onChange(); return; }
      if (this.status === 'lobby' || this.status === 'race' || this.status === 'connecting') {
        if (this.bn % 2 === 0) this.hello();
        if ((this.rtt > 60 && this.bn < 20) || this.bn % 10 === 0) this.send({ k: 'pg', t0: now });
        if (this.status !== 'connecting' && now - this.hostSeen > 15000) { this.status = 'closed'; this.onChange(); if (this.race) this.race.netHostLost(); }
      }
    }
  }
  recv(m) {
    if (!m || m.f === this.id || !m.k) return;
    let s = this.seen.get(m.f); if (!s) this.seen.set(m.f, s = new Set()); if (s.has(m.n)) return; s.add(m.n); if (s.size > 600) { s.clear(); s.add(m.n); }
    this.last.set(m.f, Date.now());
    if (m.f === this.hostId) this.hostSeen = Date.now();
    switch (m.k) {
      case 'hi': if (this.isHost) {
        let e = this.members.find(x => x.id === m.f); const isNew = !e;
        if (isNew) { if (this.members.length >= 8) return; e = { id: m.f }; this.members.push(e); }
        const ch = isNew || e.name !== m.name || JSON.stringify(e.car) !== JSON.stringify(m.car); e.name = String(m.name || 'Förare').slice(0, 24); e.car = m.car;
        if (ch) { this.sendRoom(); this.onChange(); }
      } break;
      case 'room': if (!this.isHost) {
        if (this.hostId && this.hostId !== m.f) return; // två värdar med samma kod: håll fast vid den första
        this.hostId = m.f; this.hostSeen = Date.now(); this.cfg = m.cfg; this.members = m.m || [];
        if (this.status === 'connecting' || this.status === 'notfound') { this.status = 'lobby'; this.send({ k: 'pg', t0: Date.now() }); }
        if (m.st === 'lobby' && this.status === 'race' && !this.race) this.status = 'lobby';
        this.roomSt = m.st; this.onChange();
      } break;
      case 'pg': if (this.isHost) this.send({ k: 'po', to: m.f, t0: m.t0, ht: Date.now() }); break;
      case 'po': if (m.to === this.id) { const now = Date.now(), rtt = now - m.t0; if (rtt < this.rtt) { this.rtt = rtt; this.offset = m.ht - (m.t0 + now) / 2; } } break;
      case 'start': if (m.f === this.hostId || this.isHost) {
        this.live[m.h] = { grid: m.grid, cfg: m.cfg, lead: m.lead, goAt: 0, ready: new Set(), done: false, t0: Date.now() };
        if (!this.isHost) this.status = 'race';
        if (m.grid.some(g => g.id === this.id) && this.onStart) this.onStart(m.h, m.grid, m.cfg, m.lead);
        this.onChange();
      } break;
      case 'rdy': { const L = this.live[m.h]; if (L && L.lead === this.id) { L.ready.add(m.f); this.checkGo(m.h); } } break;
      case 'go': { const L = this.live[m.h]; if (L) L.goAt = m.at; } break;
      case 's': if (this.race) this.race.netState(m); break;
      case 'end': { const L = this.live[m.h]; if (L && !L.done) { L.done = true; L.order = m.order; if (this.race && this.race.heatId === m.h) this.race.netEnd(m.order); if (this.onHeatEnd) this.onHeatEnd(m.h, m.order); this.onChange(); } } break;
      case 'cs': if (m.f === this.hostId) { this.champ = m.cs; this.onChange(); } break;
      case 'chat': if (typeof m.t === 'string') { this.addChat(m.f, String(m.nm || 'Förare').slice(0, 20), m.t.slice(0, 80)); } break;
      case 'skip': if (this.isHost && this.onSkip) this.onSkip(m.f); break;
      case 'lobby': if (m.f === this.hostId) { this.status = 'lobby'; this.onChange(); } break;
      case 'bye':
        if (m.f === this.hostId && !this.isHost) { this.status = 'closed'; this.onChange(); if (this.race) this.race.netHostLost(); }
        else if (this.isHost) { this.members = this.members.filter(x => x.id !== m.f); this.sendRoom(); this.onChange(); }
        if (this.race) this.race.netGone(m.f);
        break;
    }
  }
  // Värden startar ett heat. grid = startordning ({ id, name, car } för människor, { id, ai:1, name, paint, bw, diff, spec, powScale } för AI).
  // lead = den förare vars dator kör AI-bilarna, ger startsignal och skickar resultatet för just det heatet.
  startHeat(h, grid, cfg, lead) {
    if (!this.isHost) return; this.status = 'race';
    const msg = { k: 'start', h, grid, cfg, lead }; this.send(msg); this.recvLocal(msg);
  }
  recvLocal(m) { m.f = this.id; this.live[m.h] = { grid: m.grid, cfg: m.cfg, lead: m.lead, goAt: 0, ready: new Set(), done: false, t0: Date.now() }; if (m.grid.some(g => g.id === this.id) && this.onStart) this.onStart(m.h, m.grid, m.cfg, m.lead); this.onChange(); }
  goAtFor(h) { return this.live[h]?.goAt || 0; }
  humansIn(h) { return (this.live[h]?.grid || []).filter(g => !g.ai).map(g => g.id); }
  checkGo(h) { const L = this.live[h]; if (!L || L.goAt) return; if (this.humansIn(h).every(id => L.ready.has(id) || !this.members.some(m => m.id === id))) this.fireGo(h); }
  fireGo(h) { const L = this.live[h]; if (!L || L.goAt) return; clearTimeout(L.goT); L.goAt = this.now() + 4200; const go = () => this.send({ k: 'go', h, at: L.goAt }); go(); setTimeout(go, 500); setTimeout(go, 1500); }
  imReady(h) {
    const L = this.live[h]; if (!L) return;
    if (L.lead === this.id) { L.ready.add(this.id); clearTimeout(L.goT); L.goT = setTimeout(() => this.fireGo(h), 10000); this.checkGo(h); }
    else { const r = () => { if (!L.goAt && !L.done) { this.send({ k: 'rdy', h }); setTimeout(r, 1500); } }; r(); }
  }
  end(h, order) { const L = this.live[h]; const m = { k: 'end', h, order }; this.send(m); setTimeout(() => this.send({ k: 'end', h, order }), 600); if (L && !L.done) { L.done = true; L.order = order; if (this.onHeatEnd) this.onHeatEnd(h, order); } }
  toLobby() { if (!this.isHost) return; this.status = 'lobby'; this.live = {}; this.send({ k: 'lobby' }); this.sendRoom(); this.onChange(); }
  // chatt / snabbmeddelanden i rummet (senaste 30 sparas)
  say(name, text) { text = String(text || '').trim().slice(0, 80); if (!text) return; this.send({ k: 'chat', nm: name, t: text }); this.addChat(this.id, name, text); }
  addChat(id, name, text) { (this.chat ||= []).push({ id, name, text, at: Date.now() }); if (this.chat.length > 30) this.chat.shift(); if (this.onChat) this.onChat(this.chat.at(-1)); this.onChange(); }
  sendChamp(cs) { if (!this.isHost) return; this.champ = cs; this.send({ k: 'cs', cs }); this.onChange(); }
  backToLobby() { this.race = null; }
  leave() {
    if (this.gone) return; this.gone = true; try { this.send({ k: 'bye' }); } catch (e) { }
    clearInterval(this.tick); clearTimeout(this.goT); window.removeEventListener('pagehide', this.unload);
    setTimeout(() => this.links.forEach(l => l.close()), 150);
  }
}

// ---------- global topplista ----------
// Varje spelare lägger sin statistik som ett "retained" meddelande på rokkikraft/lb1/<spelar-id> hos mäklarna.
// Den som öppnar topplistan prenumererar på rokkikraft/lb1/+ och får allas senaste värden direkt.
export class Board {
  constructor(onUpdate) {
    this.list = new Map(); this.onUpdate = onUpdate || (() => { }); this.topic = 'rokkikraft/lb1/+';
    this.links = brokers().map(u => new Mqtt(u, this.topic, m => this.recv(m), () => this.onUpdate()));
  }
  get connected() { return this.links.filter(l => l.open).length; }
  recv(m) {
    if (!m || typeof m.id !== 'string' || typeof m.name !== 'string') return;
    const old = this.list.get(m.id); if (old && old.t >= m.t) return;
    this.list.set(m.id, { id: m.id.slice(0, 24), name: m.name.slice(0, 24), sec: +m.sec || 0, races: +m.races || 0, wins: +m.wins || 0, best: m.best && typeof m.best === 'object' ? m.best : {}, t: +m.t || 0 });
    clearTimeout(this.ut); this.ut = setTimeout(() => this.onUpdate(), 150);
  }
  publish(e) {
    const bytes = packet(0x31, str('rokkikraft/lb1/' + e.id), enc.encode(JSON.stringify(e))); // 0x31 = PUBLISH med retain
    this.list.set(e.id, e);
    const go = () => { let sent = 0; for (const l of this.links) if (l.open) { l.send(bytes); sent++; } return sent; };
    if (!go()) { let n = 0; const iv = setInterval(() => { if (go() || ++n > 20) clearInterval(iv); }, 500); }
  }
  close() { this.links.forEach(l => l.close()); }
}

// ---------- dagens utmaning: topplista per dag (retained) på rokkikraft/day1/<datum>/<id> ----------
export class DayBoard {
  constructor(day, onUpdate) {
    this.day = String(day).replace(/[^0-9-]/g, ''); this.list = new Map(); this.onUpdate = onUpdate || (() => { });
    this.links = brokers().map(u => new Mqtt(u, `rokkikraft/day1/${this.day}/+`, m => this.recv(m), () => this.onUpdate()));
  }
  get connected() { return this.links.filter(l => l.open).length; }
  recv(m) {
    if (!m || typeof m.id !== 'string' || typeof m.name !== 'string' || m.day !== this.day || !(+m.time > 5 && +m.time < 3600)) return;
    const old = this.list.get(m.id); if (old && old.time <= +m.time) return;
    this.list.set(m.id, { id: m.id.slice(0, 24), name: m.name.slice(0, 24), time: +m.time, best: +m.best || 0, tries: +m.tries || 1, car: String(m.car || '').slice(0, 30) });
    clearTimeout(this.ut); this.ut = setTimeout(() => this.onUpdate(), 150);
  }
  publish(e) {
    e = { ...e, day: this.day }; const bytes = packet(0x31, str(`rokkikraft/day1/${this.day}/${e.id}`), enc.encode(JSON.stringify(e)));
    this.recv(e); const go = () => { let n = 0; for (const l of this.links) if (l.open) { l.send(bytes); n++; } return n; };
    if (!go()) { let n = 0; const iv = setInterval(() => { if (go() || ++n > 20) clearInterval(iv); }, 500); }
  }
  sorted() { return [...this.list.values()].sort((a, b) => a.time - b.time); }
  close() { this.links.forEach(l => l.close()); }
}

// ---------- närvaro & inbjudningar ----------
// Alla som har spelet öppet skickar ett livstecken var 15:e s på rokkikraft/pres1/<id> och prenumererar på rokkikraft/pres1/+.
// Inbjudningar går på rokkikraft/pres1/inv: { to: [id…], code, from, name } – mottagarna får en "Gå med"-ruta.
export class Presence {
  constructor({ getMe, onList, onInvite }) {
    this.id = rid(); this.getMe = getMe; this.onList = onList || (() => { }); this.onInvite = onInvite || (() => { });
    this.list = new Map(); this.topic = `rokkikraft/pres${PROTO}/+`;
    this.links = brokers().map(u => new Mqtt(u, this.topic, m => this.recv(m), () => { this.beat(); this.pub(this.id, { k: 'who', id: this.id }); this.onList(); })); // 'who' = be alla andra svara direkt
    this.iv = setInterval(() => this.beat(), 15000);
    this.unload = () => this.pub(this.id, { k: 'bye', id: this.id }); window.addEventListener('pagehide', this.unload);
  }
  get connected() { return this.links.filter(l => l.open).length; }
  pub(sub, o) { const bytes = packet(0x30, str(`rokkikraft/pres${PROTO}/${sub}`), enc.encode(JSON.stringify(o))); for (const l of this.links) if (l.open) l.send(bytes); }
  beat() { const me = this.getMe(); this.pub(this.id, { k: 'here', id: this.id, name: me.name, room: me.room || '', racing: !!me.racing, t: Date.now() }); this.prune(); }
  prune() { const now = Date.now(); let ch = false; for (const [k, v] of this.list) if (now - v.seen > 40000) { this.list.delete(k); ch = true; } if (ch) this.onList(); }
  others() { this.prune(); return [...this.list.values()].filter(p => p.id !== this.id).sort((a, b) => a.name.localeCompare(b.name)); }
  invite(ids, code, name) { if (!ids.length) return 0; this.pub('inv', { k: 'inv', to: ids.slice(0, 60), code, from: this.id, name, t: Date.now() }); return ids.length; }
  recv(m) {
    if (!m || typeof m !== 'object') return;
    if (m.k === 'here' && typeof m.id === 'string' && m.id !== this.id) {
      const had = this.list.get(m.id), p = { id: m.id.slice(0, 16), name: String(m.name || 'Förare').slice(0, 20), room: String(m.room || '').slice(0, 4), racing: !!m.racing, seen: Date.now() };
      this.list.set(m.id, p); if (!had || had.name !== p.name || had.room !== p.room || had.racing !== p.racing) this.onList();
    } else if (m.k === 'who' && m.id !== this.id) { clearTimeout(this.wt); this.wt = setTimeout(() => this.beat(), 200 + Math.random() * 800);
    } else if (m.k === 'bye' && this.list.delete(m.id)) this.onList();
    else if (m.k === 'inv' && Array.isArray(m.to) && m.to.includes(this.id) && m.from !== this.id && typeof m.code === 'string') {
      if (this.lastInv === m.from + m.code + m.t) return; this.lastInv = m.from + m.code + m.t; // samma inbjudan kan komma via flera mäklare
      this.onInvite({ code: m.code.slice(0, 4).toUpperCase(), name: String(m.name || 'Någon').slice(0, 20) });
    }
  }
}
