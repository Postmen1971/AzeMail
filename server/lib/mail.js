'use strict';
// Mail-Funktionen: Ordner, Liste, Lesen, Löschen, Senden.
// Nachrichten werden nicht auf dem AZE-Server gespeichert, sondern bei Bedarf live
// vom Postfach des Anbieters geladen (Datensparsamkeit).
const { ImapClient } = require('./imap');
const { SmtpClient } = require('./smtp');
const mime = require('./mime');

const PRESETS = {
  gmx: { label: 'GMX FreeMail', imap: { host: 'imap.gmx.net', port: 993, secure: true }, smtp: { host: 'mail.gmx.net', port: 465, secure: true } }
};
const IDLE_CLOSE_MS = 3 * 60 * 1000;
const MAX_MESSAGE_BYTES = 30 * 1024 * 1024;
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/;

function err(msg, status) { const e = new Error(msg); e.status = status || 400; return e; }
function lc(s) { return String(s || '').trim().toLowerCase(); }

class MailService {
  constructor(store, auth, opts) {
    this.store = store;
    this.auth = auth;
    this.opts = opts || {};
    this.client = null;
    this.folders = null;
    this.idleTimer = null;
    this.lock = Promise.resolve();
  }

  get account() { return this.store.data.mail; }

  publicAccount() {
    const a = this.account;
    if (!a) return { configured: false, presets: Object.fromEntries(Object.entries(PRESETS).map(([k, v]) => [k, v.label])) };
    return { configured: true, email: a.email, name: a.name || '', user: a.user, imap: a.imap, smtp: a.smtp, saveSent: this.store.data.settings.saveSent !== false, preset: a.preset || '' };
  }

  // Alle Operationen nacheinander über eine gemeinsame Verbindung
  withClient(session, fn) {
    const run = async () => {
      if (!this.account) throw err('Noch kein Mailkonto verbunden. Unter „Mehr“ → „Mailkonto verbinden“ einrichten.', 409);
      clearTimeout(this.idleTimer);
      if (!this.client || this.client.closed) {
        this.folders = null;
        const a = this.account;
        let pass;
        try { pass = this.auth.openSecret(session, a.passSealed); } catch (e) { throw err('Das gespeicherte Mail-Passwort kann nicht entschlüsselt werden. Bitte Mailkonto neu verbinden.', 409); }
        const c = new ImapClient(Object.assign({}, a.imap, this.opts.tlsOptions || {}));
        await c.connect();
        await c.login(a.user, pass);
        this.client = c;
      }
      try {
        return await fn(this.client);
      } catch (e) {
        if (e.kind === 'connection' || e.kind === 'connect') { this.client = null; }
        throw e;
      } finally {
        this.idleTimer = setTimeout(() => this.close(), IDLE_CLOSE_MS);
        if (this.idleTimer.unref) this.idleTimer.unref();
      }
    };
    const p = this.lock.then(run, run);
    this.lock = p.catch(() => {});
    return p;
  }

  async close() {
    clearTimeout(this.idleTimer);
    const c = this.client; this.client = null; this.folders = null;
    if (c) await c.logout();
  }

  async testAndSave(session, input) {
    const preset = PRESETS[input.preset];
    const email = String(input.email || '').trim();
    if (!EMAIL_RE.test(email)) throw err('Bitte die vollständige E-Mail-Adresse des Kontos eintragen.');
    const pass = String(input.password || '');
    const keepOld = !pass && this.account && lc(this.account.email) === lc(email);
    if (!pass && !keepOld) throw err('Bitte das Passwort des Mailkontos eintragen.');
    const imap = preset ? preset.imap : { host: String(input.imapHost || '').trim(), port: Number(input.imapPort) || 993, secure: true };
    const smtp = preset ? preset.smtp : { host: String(input.smtpHost || '').trim(), port: Number(input.smtpPort) || 465, secure: Number(input.smtpPort) !== 587 };
    if (!preset && (!/^[a-z0-9.-]+$/i.test(imap.host) || !/^[a-z0-9.-]+$/i.test(smtp.host))) throw err('Bitte gültige Servernamen eintragen.');
    // Nur für lokale Tests (AZE_ALLOW_INSECURE_MAIL=1): unverschlüsselter Test-Mailserver auf diesem Rechner
    if (this.opts.allowInsecure && (input.insecure || /^(127\.0\.0\.1|localhost)$/.test(imap.host))) { imap.secure = false; smtp.secure = false; }
    const user = String(input.user || email).trim();
    const password = keepOld ? this.auth.openSecret(session, this.account.passSealed) : pass;

    const tlsOpts = this.opts.tlsOptions || {};
    const ic = new ImapClient(Object.assign({}, imap, tlsOpts));
    try { await ic.connect(); await ic.login(user, password); } finally { await ic.logout(); }
    const sc = new SmtpClient(Object.assign({ allowInsecure: !!this.opts.allowInsecure }, smtp, tlsOpts));
    try { await sc.connect(); await sc.login(user, password); } finally { await sc.quit(); }

    await this.close();
    this.store.data.mail = {
      email, name: String(input.name || '').slice(0, 80), user, imap, smtp,
      preset: preset ? input.preset : '', passSealed: this.auth.sealSecret(session, password), connected: new Date().toISOString()
    };
    if (typeof input.saveSent === 'boolean') this.store.data.settings.saveSent = input.saveSent;
    this.store.save();
    return this.publicAccount();
  }

  async removeAccount() {
    await this.close();
    this.store.data.mail = null;
    this.store.save();
  }

  // ---------- Adressen ----------
  addresses() { return this.store.data.addresses; }

  allAddresses() {
    const list = [];
    if (this.account) list.push({ email: this.account.email, active: true, primary: true, label: 'Hauptadresse' });
    for (const a of this.addresses()) list.push(Object.assign({ primary: false }, a));
    return list;
  }

  addAddress(email, label) {
    email = String(email || '').trim();
    if (!EMAIL_RE.test(email) || email.length > 120) throw err('Bitte eine vollständige, gültige E-Mail-Adresse eintragen.');
    if (this.allAddresses().some(a => lc(a.email) === lc(email))) throw err('Diese Adresse ist bereits vorhanden.', 409);
    this.addresses().push({ email, label: String(label || '').slice(0, 40), active: true, added: new Date().toISOString() });
    this.store.save();
  }

  setAddressActive(email, active) {
    const a = this.addresses().find(x => lc(x.email) === lc(email));
    if (!a) throw err('Adresse nicht gefunden.', 404);
    a.active = !!active;
    this.store.save();
  }

  deleteAddress(email) {
    const before = this.addresses().length;
    this.store.data.addresses = this.addresses().filter(x => lc(x.email) !== lc(email));
    if (before === this.store.data.addresses.length) throw err('Adresse nicht gefunden.', 404);
    this.store.save();
  }

  // Ordnet eine Nachricht der Empfängeradresse zu, an die sie gesendet wurde
  assignRecipient(headers) {
    const aliases = this.addresses().map(a => lc(a.email));
    const fields = ['delivered-to', 'x-original-to', 'envelope-to', 'to', 'cc'];
    for (const f of fields) {
      for (const v of headers.get(f) || []) {
        for (const addr of mime.parseAddressList(v)) {
          const x = lc(addr.address);
          if (aliases.includes(x)) return this.addresses().find(a => lc(a.email) === x).email;
        }
      }
    }
    return this.account ? this.account.email : '';
  }

  // ---------- Ordner ----------
  async getFolders(c) {
    if (this.folders) return this.folders;
    const list = await c.list();
    const pick = (flag, re) => {
      const f = list.find(x => x.flags.includes(flag)) || list.find(x => re.test(x.name.split(x.delim || '/').pop()));
      return f ? f.path : null;
    };
    this.folders = {
      inbox: 'INBOX',
      sent: pick('\\sent', /^(gesendet|gesendete( objekte| elemente| nachrichten)?|sent( items| messages)?)$/i),
      trash: pick('\\trash', /^(papierkorb|gelöschte?( objekte| elemente)?|trash|deleted( items| messages)?)$/i),
      all: list.map(x => ({ path: x.path, name: x.name }))
    };
    return this.folders;
  }

  async folderPath(c, key) {
    const f = await this.getFolders(c);
    if (key === 'inbox') return 'INBOX';
    if (key === 'sent' || key === 'trash') {
      if (!f[key]) throw err(key === 'sent' ? 'Ordner „Gesendet“ wurde im Postfach nicht gefunden.' : 'Ordner „Papierkorb“ wurde im Postfach nicht gefunden.', 404);
      return f[key];
    }
    throw err('Unbekannter Ordner.');
  }

  // ---------- Liste ----------
  textCriteria(c, q, sent) {
    const parts = [];
    const ascii = !/[^\x20-\x7e]/.test(q);
    const a = ascii ? '"' + q.replace(/[\\"]/g, '\\$&') + '"' : Buffer.from(q, 'utf8');
    // OR SUBJECT q (OR FROM q TO q)
    parts.push('OR SUBJECT ', a, ' OR FROM ', a, ' TO ', a);
    return { parts, ascii };
  }

  addrCriteria(email, sent) {
    const a = '"' + email.replace(/[\\"]/g, '\\$&') + '"';
    if (sent) return 'FROM ' + a;
    return 'OR OR TO ' + a + ' CC ' + a + ' OR HEADER DELIVERED-TO ' + a + ' HEADER X-ORIGINAL-TO ' + a;
  }

  async searchUids(c, base, q) {
    let parts = ['UID SEARCH '];
    let utf8 = false;
    if (q) {
      const t = this.textCriteria(c, q);
      if (!t.ascii) { parts = ['UID SEARCH CHARSET UTF-8 ']; utf8 = true; }
      parts.push(base + ' ');
      parts.push(...t.parts);
    } else parts.push(base);
    return c.search(parts);
  }

  async listMessages(session, { folder = 'inbox', address = 'all', before = 0, q = '', limit = 40 }) {
    limit = Math.min(Math.max(Number(limit) || 40, 1), 100);
    q = String(q || '').trim().slice(0, 100);
    return this.withClient(session, async (c) => {
      const path = await this.folderPath(c, folder);
      await c.select(path, true);
      const sent = folder === 'sent';
      let uids;
      const all = lc(address) === 'all' || !address;
      const isPrimary = this.account && lc(address) === lc(this.account.email);
      if (all) uids = await this.searchUids(c, 'ALL', q);
      else if (isPrimary && !sent) {
        uids = await this.searchUids(c, 'ALL', q);
        const exclude = new Set();
        for (const al of this.addresses()) for (const u of await this.searchUids(c, this.addrCriteria(al.email, false), q)) exclude.add(u);
        uids = uids.filter(u => !exclude.has(u));
      } else {
        if (!this.allAddresses().some(a => lc(a.email) === lc(address))) throw err('Unbekannte Adresse für den Filter.');
        uids = await this.searchUids(c, this.addrCriteria(address, sent), q);
      }
      uids.sort((a, b) => b - a);
      if (before) uids = uids.filter(u => u < Number(before));
      const page = uids.slice(0, limit);
      const total = uids.length;
      let items = [];
      if (page.length) {
        const fetched = await c.fetch(page.join(','), 'UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM TO CC SUBJECT DATE DELIVERED-TO X-ORIGINAL-TO ENVELOPE-TO CONTENT-TYPE)]');
        items = fetched.map(m => this.summary(m, sent)).sort((a, b) => b.uid - a.uid);
      }
      return { folder, address: all ? 'all' : address, messages: items, more: total > page.length, nextBefore: page.length ? page[page.length - 1] : 0 };
    });
  }

  summary(m, sent) {
    const headers = mime.parseHeaders((m.body || Buffer.alloc(0)).toString('latin1'));
    const from = mime.parseAddressList(mime.header(headers, 'from'))[0] || { name: '', address: '' };
    const to = mime.parseAddressList((headers.get('to') || []).join(', '));
    const ct = lc(mime.header(headers, 'content-type'));
    const flags = (m.flags || []).map(lc);
    let date = mime.header(headers, 'date');
    const d = new Date(date || m.internalDate);
    return {
      uid: m.uid,
      from, to: to.slice(0, 5),
      subject: mime.decodeWords(mime.header(headers, 'subject')) || '(kein Betreff)',
      date: isNaN(d) ? null : d.toISOString(),
      seen: flags.includes('\\seen'),
      answered: flags.includes('\\answered'),
      size: m.size || 0,
      attachment: ct.startsWith('multipart/mixed'),
      recipient: sent ? from.address : this.assignRecipient(headers)
    };
  }

  // ---------- Einzelne Nachricht ----------
  async loadRaw(c, folder, uid) {
    const path = await this.folderPath(c, folder);
    await c.select(path);
    const meta = await c.fetch(String(uid), 'UID RFC822.SIZE FLAGS');
    if (!meta.length) throw err('Nachricht nicht gefunden – evtl. schon gelöscht oder verschoben.', 404);
    if (meta[0].size > MAX_MESSAGE_BYTES) throw err('Die Nachricht ist zu groß für die Anzeige in AZE Mail (über 30 MB).', 413);
    const r = await c.fetch(String(uid), 'UID FLAGS BODY.PEEK[]');
    if (!r.length || !r[0].body) throw err('Nachricht konnte nicht geladen werden.', 502);
    return r[0];
  }

  async getMessage(session, folder, uid) {
    uid = Number(uid);
    if (!uid) throw err('Ungültige Nachricht.');
    return this.withClient(session, async (c) => {
      const raw = await this.loadRaw(c, folder, uid);
      const msg = mime.parseMessage(raw.body);
      const flags = (raw.flags || []).map(lc);
      if (!flags.includes('\\seen') && folder !== 'trash') await c.store(uid, '+', '\\Seen');
      const sent = folder === 'sent';
      const recipient = sent ? (msg.from[0] || {}).address : this.assignRecipient(msg.headers);
      let html = msg.html;
      if (html) {
        html = html.replace(/<script[\s\S]*?<\/script\s*>/gi, '');
        // eingebettete Bilder (cid:) als data:-URL einsetzen
        for (const a of msg.attachments) {
          if (a.cid && a.size < 3 * 1024 * 1024 && /^image\//.test(a.contentType)) {
            const url = 'data:' + a.contentType + ';base64,' + a.content.toString('base64');
            html = html.split('cid:' + a.cid).join(url);
          }
        }
      }
      let text = msg.text;
      if (text === null && html) text = htmlToText(html);
      const fromAddr = this.replyFromFor(recipient);
      const d = new Date(msg.date);
      return {
        uid, folder,
        subject: msg.subject || '(kein Betreff)',
        from: msg.from, to: msg.to, cc: msg.cc, replyTo: msg.replyTo,
        date: isNaN(d) ? null : d.toISOString(),
        text: text || '', html: html || null,
        messageId: msg.messageId, references: msg.references,
        recipient, replyFrom: fromAddr.email, replyFromNote: fromAddr.note,
        attachments: msg.attachments.map((a, i) => ({ idx: i, filename: a.filename, contentType: a.contentType, size: a.size, inline: a.inline })).filter(a => !(a.inline && /^image\//.test(a.contentType) && html))
      };
    });
  }

  replyFromFor(recipient) {
    const list = this.allAddresses();
    const hit = list.find(a => lc(a.email) === lc(recipient));
    if (hit && hit.active) return { email: hit.email, note: '' };
    const primary = this.account ? this.account.email : '';
    if (hit && !hit.active) return { email: primary, note: 'Die Empfängeradresse ' + hit.email + ' ist pausiert. Zum Antworten von dieser Adresse bitte erst aktivieren.' };
    return { email: primary, note: '' };
  }

  async getAttachment(session, folder, uid, idx) {
    return this.withClient(session, async (c) => {
      const raw = await this.loadRaw(c, folder, Number(uid));
      const msg = mime.parseMessage(raw.body);
      const a = msg.attachments[Number(idx)];
      if (!a) throw err('Anhang nicht gefunden.', 404);
      return a;
    });
  }

  async setSeen(session, folder, uid, seen) {
    return this.withClient(session, async (c) => {
      await c.select(await this.folderPath(c, folder));
      await c.store(Number(uid), seen ? '+' : '-', '\\Seen');
    });
  }

  async deleteMessage(session, folder, uid) {
    uid = Number(uid);
    return this.withClient(session, async (c) => {
      const f = await this.getFolders(c);
      await c.select(await this.folderPath(c, folder));
      if (folder === 'trash' || !f.trash) {
        if (folder !== 'trash' && !f.trash) throw err('Kein Papierkorb im Postfach gefunden. Endgültiges Löschen ist hier nur aus dem Papierkorb möglich.', 409);
        await c.store(uid, '+', '\\Deleted');
        await c.expunge(uid);
        return { permanent: true };
      }
      await c.move(uid, f.trash);
      return { permanent: false };
    });
  }

  async restoreMessage(session, uid) {
    return this.withClient(session, async (c) => {
      await c.select(await this.folderPath(c, 'trash'));
      await c.move(Number(uid), 'INBOX');
    });
  }

  // ---------- Senden ----------
  async send(session, input) {
    const a = this.account;
    if (!a) throw err('Noch kein Mailkonto verbunden.', 409);
    const fromEntry = this.allAddresses().find(x => lc(x.email) === lc(input.from));
    if (!fromEntry) throw err('Absenderadresse ist nicht in AZE Mail eingetragen.');
    if (!fromEntry.active) throw err('Die Absenderadresse ist pausiert. Bitte erst aktivieren oder eine andere wählen.');
    const to = parseRecipients(input.to);
    const cc = parseRecipients(input.cc);
    if (!to.length) throw err('Bitte mindestens einen Empfänger eintragen.');
    if (to.length + cc.length > 50) throw err('Höchstens 50 Empfänger pro Nachricht.');
    const subject = String(input.subject || '').replace(/[\r\n]+/g, ' ').slice(0, 300);
    const text = String(input.text || '').slice(0, 2 * 1024 * 1024);
    const attachments = [];
    let total = 0;
    for (const att of input.attachments || []) {
      const content = Buffer.from(String(att.data || ''), 'base64');
      total += content.length;
      attachments.push({ filename: String(att.name || 'anhang').slice(0, 150), contentType: String(att.type || 'application/octet-stream'), content });
    }
    if (total > 15 * 1024 * 1024) throw err('Anhänge zusammen höchstens 15 MB.');
    const name = a.name || '';
    const safeId = (s) => String(s || '').replace(/[\r\n]/g, ' ').trim().slice(0, 2000);
    const { raw, messageId } = mime.buildMessage({
      from: { name, address: fromEntry.email }, to, cc, subject, text, attachments,
      inReplyTo: safeId(input.inReplyTo), references: safeId(input.references)
    });

    let pass;
    try { pass = this.auth.openSecret(session, a.passSealed); } catch (e) { throw err('Das gespeicherte Mail-Passwort kann nicht entschlüsselt werden. Bitte Mailkonto neu verbinden.', 409); }
    const sc = new SmtpClient(Object.assign({ allowInsecure: !!this.opts.allowInsecure }, a.smtp, this.opts.tlsOptions || {}));
    try {
      await sc.connect();
      await sc.login(a.user, pass);
      await sc.send(fromEntry.email, to.concat(cc).map(x => x.address), raw);
    } finally { await sc.quit(); }

    const warnings = [];
    try {
      await this.withClient(session, async (c) => {
        if (this.store.data.settings.saveSent !== false) {
          const f = await this.getFolders(c);
          if (f.sent) { await c.append(f.sent, raw, '\\Seen'); if (c.selected && c.selected.path === f.sent) c.selected = null; }
          else warnings.push('Ordner „Gesendet“ nicht gefunden – Kopie nicht gespeichert.');
        }
        if (input.replyToUid && input.replyFolder) {
          await c.select(await this.folderPath(c, input.replyFolder));
          await c.store(Number(input.replyToUid), '+', '\\Answered');
        }
      });
    } catch (e) { warnings.push('Gesendet, aber Kopie/Markierung im Postfach fehlgeschlagen: ' + e.message); }
    return { ok: true, messageId, warnings };
  }
}

function parseRecipients(s) {
  const list = mime.parseAddressList(String(s || '').replace(/[\r\n]+/g, ' '));
  for (const x of list) {
    if (!EMAIL_RE.test(x.address)) throw err('Ungültige Empfängeradresse: ' + x.address);
    x.name = String(x.name || '').replace(/[\r\n]/g, ' ');
  }
  return list;
}

function htmlToText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h\d|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = { MailService, PRESETS };
