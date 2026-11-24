'use strict';
// Test-Mailserver (IMAP + SMTP, unverschlüsselt) – nur für automatische Tests.
const net = require('net');
const mime = require('../lib/mime');

class Mailbox {
  constructor() {
    this.folders = { INBOX: [], 'Gesendet': [], 'Papierkorb': [], 'Entw&APw-rfe': [] };
    this.special = { 'Gesendet': '\\Sent', 'Papierkorb': '\\Trash', 'Entw&APw-rfe': '\\Drafts' };
    this.nextUid = { INBOX: 1, 'Gesendet': 1, 'Papierkorb': 1, 'Entw&APw-rfe': 1 };
  }
  add(folder, raw, flags) {
    const uid = this.nextUid[folder]++;
    this.folders[folder].push({ uid, raw: Buffer.from(raw), flags: new Set(flags || []), date: new Date() });
    return uid;
  }
}

function tokenize(s, literals) {
  const out = []; let i = 0; let li = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ') { i++; continue; }
    if (c === '\u0001') { out.push(literals[li++].toString('utf8')); i++; continue; }
    if (c === '"') { let v = ''; i++; while (i < s.length && s[i] !== '"') { if (s[i] === '\\') i++; v += s[i++]; } i++; out.push(v); continue; }
    if (c === '(' || c === ')') { out.push(c); i++; continue; }
    let v = ''; let depth = 0;
    while (i < s.length && (depth > 0 || !/[ ()]/.test(s[i]))) { if (s[i] === '[') depth++; if (s[i] === ']') depth--; v += s[i++]; }
    out.push(v);
  }
  return out;
}

function startImap(box, creds) {
  return new Promise((resolve) => {
    const server = net.createServer((sock) => {
      let buf = Buffer.alloc(0);
      let pending = null; // {text, literals, need}
      let authed = false; let sel = null;
      const w = (s) => sock.write(s + '\r\n');
      w('* OK [CAPABILITY IMAP4rev1 MOVE UIDPLUS SPECIAL-USE] Test-IMAP bereit');
      sock.on('data', (d) => {
        buf = Buffer.concat([buf, d]);
        while (true) {
          if (pending && pending.need) {
            if (buf.length < pending.need) return;
            pending.literals.push(buf.slice(0, pending.need));
            buf = buf.slice(pending.need);
            pending.text += '\u0001';
            pending.need = 0;
          }
          const i = buf.indexOf('\r\n');
          if (i === -1) return;
          const line = buf.slice(0, i).toString('latin1');
          buf = buf.slice(i + 2);
          if (!pending) pending = { text: '', literals: [], need: 0 };
          const m = line.match(/\{(\d+)\+?\}$/);
          if (m) { pending.text += line.slice(0, -m[0].length); pending.need = Number(m[1]); w('+ bereit'); continue; }
          pending.text += line;
          const cmd = pending; pending = null;
          handle(cmd);
        }
      });
      sock.on('error', () => {});
      function handle(cmd) {
        const toks = tokenize(cmd.text, cmd.literals);
        const tag = toks.shift();
        let name = (toks.shift() || '').toUpperCase();
        let uidMode = false;
        if (name === 'UID') { uidMode = true; name = (toks.shift() || '').toUpperCase(); }
        const ok = (t) => w(tag + ' OK ' + (t || 'erledigt'));
        try {
          if (name === 'CAPABILITY') { w('* CAPABILITY IMAP4rev1 MOVE UIDPLUS SPECIAL-USE'); return ok(); }
          if (name === 'NOOP') return ok();
          if (name === 'LOGOUT') { w('* BYE'); ok(); return sock.end(); }
          if (name === 'LOGIN') {
            if (toks[0] === creds.user && toks[1] === creds.pass) { authed = true; return ok('[CAPABILITY IMAP4rev1 MOVE UIDPLUS SPECIAL-USE] angemeldet'); }
            return w(tag + ' NO [AUTHENTICATIONFAILED] falsch');
          }
          if (!authed) return w(tag + ' BAD nicht angemeldet');
          if (name === 'LIST') {
            for (const f of Object.keys(box.folders)) w('* LIST (\\HasNoChildren' + (box.special[f] ? ' ' + box.special[f] : '') + ') "/" ' + (f === 'INBOX' ? 'INBOX' : '"' + f + '"'));
            return ok();
          }
          if (name === 'SELECT' || name === 'EXAMINE') {
            if (!box.folders[toks[0]]) return w(tag + ' NO kein Ordner');
            sel = toks[0];
            w('* ' + box.folders[sel].length + ' EXISTS'); w('* OK [UIDVALIDITY 7] ok');
            return ok('[READ-WRITE] ausgewählt');
          }
          if (name === 'APPEND') {
            const folder = toks[0];
            const flags = toks[1] === '(' ? toks.slice(2, toks.indexOf(')')) : [];
            const raw = cmd.literals[cmd.literals.length - 1];
            box.add(folder, raw, flags);
            return ok('angehängt');
          }
          if (!sel) return w(tag + ' BAD kein Ordner gewählt');
          const msgs = box.folders[sel];
          if (name === 'SEARCH' && uidMode) {
            let pos = 0;
            const hdr = (m, h) => {
              const p = mime.parseMessage(m.raw);
              return (p.headers.get(h.toLowerCase()) || []).map(v => mime.decodeWords(v)).join(' ').toLowerCase();
            };
            const evalOne = (m) => {
              const key = String(toks[pos++] || '').toUpperCase();
              if (key === 'ALL') return true;
              if (key === 'CHARSET') { pos++; return evalOne(m); }
              if (key === 'OR') { const a = evalOne(m); const b = evalOne(m); return a || b; }
              if (['TO', 'CC', 'FROM', 'SUBJECT'].includes(key)) { const v = String(toks[pos++]).toLowerCase(); return hdr(m, key).includes(v); }
              if (key === 'HEADER') { const h = toks[pos++]; const v = String(toks[pos++]).toLowerCase(); return hdr(m, h).includes(v); }
              throw new Error('unbekanntes Suchkriterium ' + key);
            };
            const res = [];
            for (const m of msgs) { pos = 0; let all = true; while (pos < toks.length) { if (!evalOne(m)) all = false; } if (all) res.push(m.uid); }
            w('* SEARCH' + (res.length ? ' ' + res.join(' ') : ''));
            return ok();
          }
          const setToMsgs = (set) => {
            const want = new Set();
            for (const part of set.split(',')) { if (part.includes(':')) { const [a, b] = part.split(':').map(Number); for (let x = a; x <= b; x++) want.add(x); } else want.add(Number(part)); }
            return msgs.filter(m => want.has(m.uid));
          };
          if (name === 'FETCH' && uidMode) {
            const set = toks.shift();
            const items = cmd.text.slice(cmd.text.indexOf('(') + 1, cmd.text.lastIndexOf(')'));
            for (const m of setToMsgs(set)) {
              const seq = msgs.indexOf(m) + 1;
              const parts = ['UID ' + m.uid];
              const lits = [];
              if (/FLAGS/.test(items)) parts.push('FLAGS (' + [...m.flags].join(' ') + ')');
              if (/INTERNALDATE/.test(items)) parts.push('INTERNALDATE "17-Nov-2026 10:00:00 +0100"');
              if (/RFC822\.SIZE/.test(items)) parts.push('RFC822.SIZE ' + m.raw.length);
              const hf = items.match(/BODY\.PEEK\[HEADER\.FIELDS \(([^)]*)\)\]/);
              if (hf) {
                const want = hf[1].toLowerCase().split(' ');
                const { head } = mime.splitHeadBody(m.raw);
                const lines = head.replace(/\r\n(?=[ \t])/g, '\u0002').split('\r\n').filter(l => want.includes(l.split(':')[0].toLowerCase())).map(l => l.replace(/\u0002/g, '\r\n'));
                const data = Buffer.from(lines.join('\r\n') + '\r\n\r\n', 'latin1');
                parts.push('BODY[HEADER.FIELDS (' + hf[1] + ')] {' + data.length + '}'); lits.push(data);
              } else if (/BODY\.PEEK\[\]/.test(items)) {
                parts.push('BODY[] {' + m.raw.length + '}'); lits.push(m.raw);
              }
              // Literale in die Ausgabe einweben
              let line = '* ' + seq + ' FETCH (';
              let li = 0;
              const chunks = [];
              for (const p of parts) {
                line += (line.endsWith('(') ? '' : ' ') + p;
                if (/\{\d+\}$/.test(p)) { chunks.push(Buffer.from(line + '\r\n', 'latin1')); chunks.push(lits[li++]); line = ''; }
              }
              chunks.push(Buffer.from(line + ')\r\n', 'latin1'));
              sock.write(Buffer.concat(chunks));
            }
            return ok();
          }
          if (name === 'STORE' && uidMode) {
            const set = toks.shift(); const op = toks.shift().toUpperCase();
            const flags = toks.filter(t => t !== '(' && t !== ')');
            for (const m of setToMsgs(set)) for (const f of flags) { if (op.startsWith('+')) m.flags.add(f); else m.flags.delete(f); }
            return ok();
          }
          if (name === 'MOVE' && uidMode) {
            const set = toks.shift(); const dest = toks.shift();
            for (const m of setToMsgs(set)) { box.folders[sel].splice(box.folders[sel].indexOf(m), 1); box.add(dest, m.raw, [...m.flags]); }
            return ok('verschoben');
          }
          if (name === 'EXPUNGE') {
            box.folders[sel] = msgs.filter(m => !m.flags.has('\\Deleted'));
            return ok();
          }
          w(tag + ' BAD unbekannt: ' + name);
        } catch (e) { w(tag + ' BAD ' + e.message); }
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function startSmtp(box, creds, accountEmail, aliases) {
  const sent = [];
  return new Promise((resolve) => {
    const server = net.createServer((sock) => {
      let buf = ''; let inData = false; let data = []; let env = { from: '', to: [] }; let authed = false; let loginStep = 0;
      const w = (s) => sock.write(s + '\r\n');
      w('220 test-smtp bereit');
      sock.on('data', (d) => {
        buf += d.toString('latin1');
        let i;
        while ((i = buf.indexOf('\r\n')) !== -1) {
          const line = buf.slice(0, i); buf = buf.slice(i + 2);
          if (inData) {
            if (line === '.') {
              inData = false;
              const raw = Buffer.from(data.join('\r\n').replace(/^\.\./gm, '.') + '\r\n', 'latin1');
              sent.push({ env, raw });
              for (const r of env.to) if (r === accountEmail || aliases().includes(r)) box.add('INBOX', raw, []);
              data = []; env = { from: '', to: [] };
              w('250 angenommen');
            } else data.push(line);
            continue;
          }
          if (loginStep === 1) { loginStep = 2; w('334 UGFzc3dvcmQ6'); continue; }
          if (loginStep === 2) { loginStep = 0; authed = true; w('235 ok'); continue; }
          const up = line.toUpperCase();
          if (up.startsWith('EHLO')) { w('250-test-smtp'); w('250 AUTH PLAIN LOGIN'); }
          else if (up.startsWith('AUTH PLAIN ')) {
            const [, u, p] = Buffer.from(line.slice(11), 'base64').toString('utf8').split('\0');
            if (u === creds.user && p === creds.pass) { authed = true; w('235 ok'); } else w('535 falsch');
          } else if (up === 'AUTH LOGIN') { loginStep = 1; w('334 VXNlcm5hbWU6'); }
          else if (up.startsWith('MAIL FROM:')) { if (!authed) w('530 auth'); else { env.from = line.match(/<(.*)>/)[1]; w('250 ok'); } }
          else if (up.startsWith('RCPT TO:')) { env.to.push(line.match(/<(.*)>/)[1]); w('250 ok'); }
          else if (up === 'DATA') { inData = true; w('354 los'); }
          else if (up === 'QUIT') { w('221 tschüss'); sock.end(); }
          else w('500 ?');
        }
      });
      sock.on('error', () => {});
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, sent }));
  });
}

module.exports = { Mailbox, startImap, startSmtp };
