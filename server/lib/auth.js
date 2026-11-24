'use strict';
// Anmeldung mit Passwort, Schnellzugang per Geräte-PIN, Sitzungen.
//
// Schlüsselprinzip: Ein zufälliger Hauptschlüssel verschlüsselt das Mail-Passwort.
// Der Hauptschlüssel selbst liegt nur "eingewickelt" auf der Festplatte:
//  - einmal mit einem aus dem Login-Passwort abgeleiteten Schlüssel (scrypt)
//  - je eingerichtetem Gerät mit einem Schlüssel aus PIN + geheimem Geräte-Token
// Ohne Login kann der Server das Mail-Passwort also nicht entschlüsseln.
const crypto = require('crypto');

const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const MAX_PIN_FAILS = 5;
const SESSION_IDLE_MS = 60 * 60 * 1000;      // 1 Stunde ohne Aktivität
const SESSION_MAX_MS = 12 * 60 * 60 * 1000;  // höchstens 12 Stunden

function kdf(secret, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(secret, salt, 32, SCRYPT, (err, key) => err ? reject(err) : resolve(key));
  });
}

function seal(key, plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(plain), c.final()]);
  return [iv, c.getAuthTag(), enc].map(b => b.toString('base64')).join('.');
}

function open(key, sealed) {
  const [iv, tag, enc] = String(sealed).split('.').map(s => Buffer.from(s, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]);
}

function tryOpen(key, sealed) {
  try { return open(key, sealed); } catch (e) { return null; }
}

function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

class Auth {
  constructor(store) {
    this.store = store;
    this.sessions = new Map();
    this.failures = new Map(); // IP -> {count, until}
    this.setupCode = null;
    if (!this.isSetUp()) this.setupCode = process.env.AZE_SETUP_CODE || crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  isSetUp() { return !!this.store.data.auth; }

  // --- Schutz gegen Durchprobieren ---
  checkRate(ip) {
    const f = this.failures.get(ip);
    if (f && f.until > Date.now() && f.count >= 10) {
      const min = Math.ceil((f.until - Date.now()) / 60000);
      const e = new Error('Zu viele Fehlversuche. Bitte in ' + min + ' Minuten erneut versuchen.');
      e.status = 429; throw e;
    }
  }
  fail(ip) {
    const f = this.failures.get(ip);
    if (!f || f.until < Date.now()) this.failures.set(ip, { count: 1, until: Date.now() + 15 * 60000 });
    else f.count++;
  }
  ok(ip) { this.failures.delete(ip); }

  async setup(code, username, password) {
    if (this.isSetUp()) { const e = new Error('AZE Mail ist bereits eingerichtet.'); e.status = 409; throw e; }
    if (!safeEqual(String(code || '').trim().toUpperCase(), this.setupCode)) { const e = new Error('Einrichtungscode stimmt nicht. Er steht im Server-Fenster.'); e.status = 403; throw e; }
    validateUser(username); validatePassword(password);
    const master = crypto.randomBytes(32);
    const salt = crypto.randomBytes(16).toString('base64');
    const key = await kdf(password, salt);
    this.store.data.auth = { username: username.trim(), salt, wrapped: seal(key, master), created: new Date().toISOString() };
    this.store.save();
    this.setupCode = null;
    return this.createSession(master, null);
  }

  async loginPassword(username, password) {
    const a = this.store.data.auth;
    if (!a) return null;
    const key = await kdf(String(password || ''), a.salt);
    const master = tryOpen(key, a.wrapped);
    if (!master || !safeEqual(String(username || '').trim().toLowerCase(), a.username.toLowerCase())) return null;
    return this.createSession(master, null);
  }

  async changePassword(session, oldPw, newPw) {
    const a = this.store.data.auth;
    const master = tryOpen(await kdf(String(oldPw || ''), a.salt), a.wrapped);
    if (!master) { const e = new Error('Bisheriges Passwort stimmt nicht.'); e.status = 403; throw e; }
    validatePassword(newPw);
    const salt = crypto.randomBytes(16).toString('base64');
    a.salt = salt;
    a.wrapped = seal(await kdf(newPw, salt), master);
    this.store.save();
  }

  async addDevice(session, pin, name) {
    if (!/^\d{4,8}$/.test(String(pin || ''))) { const e = new Error('Die PIN muss aus 4 bis 8 Ziffern bestehen.'); e.status = 400; throw e; }
    const token = crypto.randomBytes(32).toString('base64url');
    const id = crypto.randomBytes(9).toString('base64url');
    const salt = crypto.randomBytes(16).toString('base64');
    const key = await kdf(pin + ':' + token, salt);
    this.store.data.devices.push({
      id, name: String(name || 'Gerät').slice(0, 60), tokenHash: sha256(token), salt,
      wrapped: seal(key, session.master), fails: 0, created: new Date().toISOString(), lastUsed: null
    });
    this.store.save();
    session.deviceId = id;
    return { deviceId: id, deviceToken: token };
  }

  async loginPin(deviceId, token, pin) {
    const dev = this.store.data.devices.find(d => d.id === deviceId);
    if (!dev || !safeEqual(sha256(String(token || '')), dev.tokenHash)) {
      const e = new Error('Dieses Gerät ist nicht (mehr) für die PIN eingerichtet. Bitte mit Passwort anmelden.'); e.status = 401; e.code = 'device'; throw e;
    }
    const master = tryOpen(await kdf(String(pin || '') + ':' + token, dev.salt), dev.wrapped);
    if (!master) {
      dev.fails++;
      let msg = 'PIN falsch. Noch ' + (MAX_PIN_FAILS - dev.fails) + ' Versuche.';
      if (dev.fails >= MAX_PIN_FAILS) {
        this.store.data.devices = this.store.data.devices.filter(d => d.id !== dev.id);
        msg = 'PIN zu oft falsch. Die PIN wurde für dieses Gerät gelöscht – bitte mit Passwort anmelden.';
      }
      this.store.save();
      const e = new Error(msg); e.status = 401; e.code = dev.fails >= MAX_PIN_FAILS ? 'device' : 'pin'; throw e;
    }
    dev.fails = 0; dev.lastUsed = new Date().toISOString();
    this.store.save();
    return this.createSession(master, dev.id);
  }

  removeDevice(id) {
    const before = this.store.data.devices.length;
    this.store.data.devices = this.store.data.devices.filter(d => d.id !== id);
    this.store.save();
    return before !== this.store.data.devices.length;
  }

  createSession(master, deviceId) {
    const id = crypto.randomBytes(32).toString('base64url');
    const now = Date.now();
    const s = { id, master, deviceId, created: now, lastSeen: now };
    this.sessions.set(id, s);
    return s;
  }

  getSession(id) {
    if (!id) return null;
    const s = this.sessions.get(id);
    if (!s) return null;
    const now = Date.now();
    if (now - s.lastSeen > SESSION_IDLE_MS || now - s.created > SESSION_MAX_MS) { this.sessions.delete(id); return null; }
    s.lastSeen = now;
    return s;
  }

  destroySession(id) { this.sessions.delete(id); }
  destroyAll() { this.sessions.clear(); }

  // Mail-Passwort ver-/entschlüsseln
  sealSecret(session, text) { return seal(session.master, Buffer.from(String(text), 'utf8')); }
  openSecret(session, sealed) { return open(session.master, sealed).toString('utf8'); }
}

function validateUser(u) {
  if (!/^[a-zA-Z0-9._@-]{3,60}$/.test(String(u || '').trim())) {
    const e = new Error('Benutzername: 3 bis 60 Zeichen (Buchstaben, Zahlen, . _ - @).'); e.status = 400; throw e;
  }
}
function validatePassword(p) {
  if (typeof p !== 'string' || p.length < 10) { const e = new Error('Das Passwort muss mindestens 10 Zeichen lang sein.'); e.status = 400; throw e; }
}

module.exports = { Auth, seal, open };
