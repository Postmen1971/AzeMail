'use strict';
// Schlanker IMAP-Client (RFC 3501) nur mit Node-Bordmitteln.
const tls = require('tls');
const net = require('net');

const LIT = '\u0001';

function quote(s) {
  return '"' + String(s).replace(/[\\"]/g, '\\$&') + '"';
}

function needsLiteral(s) {
  return /[\r\n\x00]|[^\x00-\x7f]/.test(s);
}

// Modifiziertes UTF-7 für Ordnernamen (RFC 3501, 5.1.3)
function decodeMUtf7(s) {
  return s.replace(/&([^-]*)-/g, (m, b64) => {
    if (b64 === '') return '&';
    const buf = Buffer.from(b64.replace(/,/g, '/'), 'base64');
    let out = '';
    for (let i = 0; i + 1 < buf.length; i += 2) out += String.fromCharCode((buf[i] << 8) | buf[i + 1]);
    return out;
  });
}
function encodeMUtf7(s) {
  return s.replace(/&/g, '&-').replace(/[^\x20-\x7e]+/g, (chunk) => {
    const buf = Buffer.alloc(chunk.length * 2);
    for (let i = 0; i < chunk.length; i++) buf.writeUInt16BE(chunk.charCodeAt(i), i * 2);
    return '&' + buf.toString('base64').replace(/=+$/, '').replace(/\//g, ',') + '-';
  });
}

class Tokenizer {
  constructor(text, literals) { this.t = text; this.l = literals; this.i = 0; this.li = 0; }
  ws() { while (this.t[this.i] === ' ') this.i++; }
  end() { this.ws(); return this.i >= this.t.length; }
  value() {
    this.ws();
    const c = this.t[this.i];
    if (c === '(') {
      this.i++;
      const list = [];
      while (true) {
        this.ws();
        if (this.i >= this.t.length) break;
        if (this.t[this.i] === ')') { this.i++; break; }
        list.push(this.value());
      }
      return list;
    }
    if (c === '"') {
      this.i++;
      let s = '';
      while (this.i < this.t.length && this.t[this.i] !== '"') {
        if (this.t[this.i] === '\\') this.i++;
        s += this.t[this.i++];
      }
      this.i++;
      return s;
    }
    if (c === LIT) { this.i++; return this.l[this.li++]; }
    let s = '';
    let depth = 0;
    while (this.i < this.t.length) {
      const ch = this.t[this.i];
      if (ch === '[') depth++;
      if (ch === ']') depth--;
      if (depth <= 0 && (ch === ' ' || ch === '(' || ch === ')')) {
        if (ch === '(' && s.endsWith('.PEEK')) { /* nie erwartet */ }
        break;
      }
      s += ch; this.i++;
    }
    if (s.toUpperCase() === 'NIL') return null;
    return s;
  }
  rest() { return this.t.slice(this.i).trim(); }
}

class ImapError extends Error {
  constructor(msg, kind) { super(msg); this.kind = kind || 'imap'; }
}

class ImapClient {
  constructor(opts) {
    this.opts = Object.assign({ port: 993, secure: true, timeout: 30000 }, opts);
    this.buf = Buffer.alloc(0);
    this.tagN = 0;
    this.current = null;
    this.queue = Promise.resolve();
    this.caps = new Set();
    this.selected = null;
    this.closed = false;
    this.waitContinue = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const { host, port, secure } = this.opts;
      const onErr = (e) => { cleanup(); reject(new ImapError('Verbindung zum Mailserver fehlgeschlagen: ' + e.message, 'connect')); };
      const sock = secure
        ? tls.connect({ host, port, servername: net.isIP(host) ? undefined : host, ca: this.opts.ca, rejectUnauthorized: this.opts.rejectUnauthorized !== false })
        : net.connect({ host, port });
      this.sock = sock;
      sock.setTimeout(this.opts.timeout, () => sock.destroy(new Error('Zeitüberschreitung')));
      sock.once('error', onErr);
      const cleanup = () => sock.removeListener('error', onErr);
      this.greetingResolve = (line) => {
        cleanup();
        sock.on('error', (e) => this._fail(e));
        if (/^\* (OK|PREAUTH)/i.test(line)) resolve(); else reject(new ImapError('Mailserver lehnt Verbindung ab: ' + line, 'connect'));
      };
      sock.on('data', (d) => this._onData(d));
      sock.on('close', () => { this.closed = true; this._fail(new Error('Verbindung geschlossen')); });
    });
  }

  _fail(err) {
    this.closed = true;
    if (this.current) { const c = this.current; this.current = null; c.reject(new ImapError(err.message, 'connection')); }
  }

  _onData(d) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
    while (true) {
      const r = this._extract();
      if (!r) break;
      this._handle(r);
    }
  }

  // Liefert eine vollständige Antwort (inkl. Literale) oder null
  _extract() {
    let pos = 0;
    let text = '';
    const literals = [];
    while (true) {
      const crlf = this.buf.indexOf('\r\n', pos);
      if (crlf === -1) return null;
      const line = this.buf.slice(pos, crlf).toString('latin1');
      const m = line.match(/\{(\d+)\+?\}$/);
      if (m) {
        const n = Number(m[1]);
        const start = crlf + 2;
        if (this.buf.length < start + n) return null;
        text += line.slice(0, line.length - m[0].length) + LIT;
        literals.push(this.buf.slice(start, start + n));
        pos = start + n;
        continue;
      }
      text += line;
      this.buf = this.buf.slice(crlf + 2);
      return { text, literals };
    }
  }

  _handle(r) {
    if (this.greetingResolve) { const g = this.greetingResolve; this.greetingResolve = null; g(r.text); return; }
    if (r.text.startsWith('+')) { if (this.waitContinue) { const w = this.waitContinue; this.waitContinue = null; w(); } return; }
    if (r.text.startsWith('* ')) {
      const capm = r.text.match(/^\* (?:OK \[)?CAPABILITY ([^\]]*)/i);
      if (capm) this._setCaps(capm[1]);
      if (this.current) this.current.untagged.push(r);
      return;
    }
    const m = r.text.match(/^(\S+) (OK|NO|BAD)\s?(.*)$/i);
    if (m && this.current && m[1] === this.current.tag) {
      const c = this.current; this.current = null;
      const capm = m[3].match(/^\[CAPABILITY ([^\]]*)\]/i);
      if (capm) this._setCaps(capm[1]);
      if (m[2].toUpperCase() === 'OK') c.resolve({ untagged: c.untagged, text: m[3] });
      else c.reject(new ImapError(m[3] || m[2], m[2].toUpperCase() === 'NO' ? 'no' : 'bad'));
    }
  }

  _setCaps(s) { this.caps = new Set(s.toUpperCase().split(/\s+/)); }

  // parts: Strings oder Buffer (Buffer werden als Literal gesendet)
  run(parts) {
    if (typeof parts === 'string') parts = [parts];
    const p = this.queue.then(() => this._run(parts));
    this.queue = p.catch(() => {});
    return p;
  }

  async _run(parts) {
    if (this.closed) throw new ImapError('Keine Verbindung zum Mailserver', 'connection');
    const tag = 'A' + (++this.tagN);
    const done = new Promise((resolve, reject) => { this.current = { tag, untagged: [], resolve, reject }; });
    done.catch(() => {});
    let line = tag + ' ';
    for (const part of parts) {
      if (Buffer.isBuffer(part)) {
        const cont = new Promise((res) => { this.waitContinue = res; });
        this.sock.write(line + '{' + part.length + '}\r\n', 'latin1');
        await Promise.race([cont, done]);
        if (!this.current) return done; // Server hat abgelehnt
        this.sock.write(part);
        line = '';
      } else line += part;
    }
    this.sock.write(line + '\r\n', 'latin1');
    return done;
  }

  arg(s) {
    s = String(s);
    return needsLiteral(s) ? Buffer.from(s, 'utf8') : quote(s);
  }

  async login(user, pass) {
    if (!this.caps.size) await this.run('CAPABILITY');
    if (!this.opts.secure && this.caps.has('STARTTLS') && this.opts.starttls !== false) {
      throw new ImapError('Bitte verschlüsselten Port (993) verwenden.', 'config');
    }
    try {
      await this.run(['LOGIN ', this.arg(user), ' ', this.arg(pass)]);
    } catch (e) {
      if (e.kind === 'no' || e.kind === 'bad') throw new ImapError('Anmeldung beim Mailserver fehlgeschlagen. Benutzername/Passwort prüfen und bei GMX „POP3 und IMAP Zugriff erlauben“ einschalten.', 'auth');
      throw e;
    }
    if (!this.caps.has('MOVE')) await this.run('CAPABILITY');
  }

  async logout() {
    if (this.closed) return;
    try { await Promise.race([this.run('LOGOUT'), new Promise(r => setTimeout(r, 1500))]); } catch (e) { /* egal */ }
    try { this.sock.destroy(); } catch (e) { /* egal */ }
    this.closed = true;
  }

  static parse(r) {
    return new Tokenizer(r.text, r.literals);
  }

  async list() {
    const res = await this.run('LIST "" "*"');
    const out = [];
    for (const r of res.untagged) {
      const t = ImapClient.parse(r);
      if (t.value() !== '*') continue;
      if (String(t.value()).toUpperCase() !== 'LIST') continue;
      const flags = t.value() || [];
      const delim = t.value();
      let name = t.value();
      if (Buffer.isBuffer(name)) name = name.toString('utf8');
      out.push({ path: name, name: decodeMUtf7(String(name)), flags: flags.map(f => String(f).toLowerCase()), delim });
    }
    return out;
  }

  async select(path, force) {
    if (!force && this.selected && this.selected.path === path) return this.selected;
    const res = await this.run(['SELECT ', this.arg(path)]);
    let exists = 0, uidvalidity = 0;
    for (const r of res.untagged) {
      const m = r.text.match(/^\* (\d+) EXISTS/i);
      if (m) exists = Number(m[1]);
      const u = r.text.match(/UIDVALIDITY (\d+)/i);
      if (u) uidvalidity = Number(u[1]);
    }
    this.selected = { path, exists, uidvalidity };
    return this.selected;
  }

  async search(criteria) {
    const res = await this.run(criteria);
    const uids = [];
    for (const r of res.untagged) {
      const m = r.text.match(/^\* SEARCH\s*(.*)$/i);
      if (m && m[1].trim()) for (const n of m[1].trim().split(/\s+/)) if (/^\d+$/.test(n)) uids.push(Number(n));
    }
    return uids.sort((a, b) => a - b);
  }

  async fetch(uidSet, items) {
    const res = await this.run('UID FETCH ' + uidSet + ' (' + items + ')');
    const out = [];
    for (const r of res.untagged) {
      const t = ImapClient.parse(r);
      if (t.value() !== '*') continue;
      t.value(); // Sequenznummer
      if (String(t.value()).toUpperCase() !== 'FETCH') continue;
      const list = t.value();
      if (!Array.isArray(list)) continue;
      const obj = {};
      for (let i = 0; i + 1 < list.length; i += 2) {
        const key = String(list[i]).toUpperCase();
        const val = list[i + 1];
        if (key === 'UID') obj.uid = Number(val);
        else if (key === 'FLAGS') obj.flags = (val || []).map(String);
        else if (key === 'INTERNALDATE') obj.internalDate = val;
        else if (key === 'RFC822.SIZE') obj.size = Number(val);
        else if (key.startsWith('BODY[')) obj.body = Buffer.isBuffer(val) ? val : Buffer.from(val || '', 'latin1');
      }
      if (obj.uid) out.push(obj);
    }
    return out;
  }

  async store(uid, op, flags) {
    await this.run('UID STORE ' + uid + ' ' + op + 'FLAGS.SILENT (' + flags + ')');
  }

  async move(uid, destPath) {
    if (this.caps.has('MOVE')) {
      await this.run(['UID MOVE ' + uid + ' ', this.arg(destPath)]);
    } else {
      await this.run(['UID COPY ' + uid + ' ', this.arg(destPath)]);
      await this.store(uid, '+', '\\Deleted');
      await this.expunge(uid);
    }
    if (this.selected) this.selected.exists = Math.max(0, this.selected.exists - 1);
  }

  async expunge(uid) {
    if (this.caps.has('UIDPLUS')) await this.run('UID EXPUNGE ' + uid);
    else await this.run('EXPUNGE');
  }

  async append(path, raw, flags) {
    await this.run(['APPEND ', this.arg(path), ' (' + (flags || '') + ') ', raw]);
  }
}

module.exports = { ImapClient, ImapError, decodeMUtf7, encodeMUtf7, needsLiteral, quote };
