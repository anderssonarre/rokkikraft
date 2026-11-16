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
    this.cfg = { track: 'tammisaari', laps: 3, ai: 2, joker: 0 };
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
        if (this.status !== 'connecting' && now - this.hostSeen > 12000) { this.status = 'closed'; this.onChange(); if (this.race) this.race.netHostLost(); }
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
      case 'start': if (!this.isHost && m.f === this.hostId) { this.status = 'race'; this.goAt = 0; this.grid = m.grid; this.cfg = m.cfg; if (this.onStart) this.onStart(m.grid, m.cfg); } break;
      case 'rdy': if (this.isHost && this.ready) { this.ready.add(m.f); this.checkGo(); } break;
      case 'go': if (m.f === this.hostId) { this.goAt = m.at; } break;
      case 's': if (this.race) this.race.netState(m); break;
      case 'end': if (m.f === this.hostId) { this.lastResult = m.order; if (this.race) this.race.netEnd(m.order); if (!this.isHost) this.status = 'lobby'; } break;
      case 'bye':
        if (m.f === this.hostId && !this.isHost) { this.status = 'closed'; this.onChange(); if (this.race) this.race.netHostLost(); }
        else if (this.isHost) { this.members = this.members.filter(x => x.id !== m.f); this.sendRoom(); this.onChange(); }
        if (this.race) this.race.netGone(m.f);
        break;
    }
  }
  // Värden: starta heat. grid = startordning med alla bilar ({ id, name, car } eller AI { id, ai:1, name, paint, bw, skill, spec }).
  start(grid) {
    if (!this.isHost) return; this.status = 'race'; this.goAt = 0; this.grid = grid; this.ready = new Set([this.id]); this.lastResult = null;
    const msg = { k: 'start', grid, cfg: this.cfg }; this.send(msg);
    clearTimeout(this.goT); this.goT = setTimeout(() => this.fireGo(), 9000); this.sendRoom();
  }
  checkGo() { if (this.goAt || !this.ready) return; if (this.members.every(m => this.ready.has(m.id))) this.fireGo(); }
  fireGo() { if (this.goAt || this.status !== 'race') return; clearTimeout(this.goT); this.goAt = Date.now() + 4200; const go = () => { if (this.status === 'race') this.send({ k: 'go', at: this.goAt }); }; go(); setTimeout(go, 500); setTimeout(go, 1500); }
  imReady() { if (!this.isHost) { const r = () => { if (this.status === 'race' && !this.goAt) { this.send({ k: 'rdy' }); setTimeout(r, 1500); } }; r(); } else this.checkGo(); }
  end(order) { if (!this.isHost) return; this.lastResult = order; this.send({ k: 'end', order }); setTimeout(() => this.send({ k: 'end', order }), 600); this.status = 'lobby'; this.sendRoom(); }
  backToLobby() { if (this.status === 'race') { this.status = 'lobby'; if (this.isHost) this.sendRoom(); } this.race = null; }
  leave() {
    if (this.gone) return; this.gone = true; try { this.send({ k: 'bye' }); } catch (e) { }
    clearInterval(this.tick); clearTimeout(this.goT); window.removeEventListener('pagehide', this.unload);
    setTimeout(() => this.links.forEach(l => l.close()), 150);
  }
}
