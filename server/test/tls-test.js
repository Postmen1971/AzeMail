'use strict';
// Prüft verschlüsselte Verbindungen: IMAP über SSL (993), SMTP über SSL (465) und STARTTLS (587).
// Benötigt openssl zum Erzeugen eines Test-Zertifikats.
const assert = require('assert');
const tls = require('tls');
const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { ImapClient } = require('../lib/imap');
const { SmtpClient } = require('../lib/smtp');
const { Mailbox, startImap, startSmtp } = require('./mock-mailserver');

const CREDS = { user: 'a@gmx.de', pass: 'geheim' };

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aze-tls-'));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(dir, 'k.pem'), '-out', path.join(dir, 'c.pem'), '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'], { stdio: 'ignore' });
  const key = fs.readFileSync(path.join(dir, 'k.pem')); const cert = fs.readFileSync(path.join(dir, 'c.pem'));

  const box = new Mailbox();
  box.add('INBOX', 'From: x@y.de\r\nTo: a@gmx.de\r\nSubject: TLS ok\r\n\r\nHallo\r\n');
  const imap = await startImap(box, CREDS);
  const smtp = await startSmtp(box, CREDS, 'a@gmx.de', () => []);
  // TLS-Terminierung vor die Test-Server setzen (wie Port 993/465)
  const wrap = (target) => new Promise((res) => {
    const s = tls.createServer({ key, cert }, (c) => { const p = net.connect(target); c.pipe(p); p.pipe(c); c.on('error', () => {}); p.on('error', () => {}); });
    s.listen(0, '127.0.0.1', () => res(s));
  });
  const imapTls = await wrap(imap.address().port);
  const smtpTls = await wrap(smtp.server.address().port);

  // IMAP über SSL
  const ic = new ImapClient({ host: 'localhost', port: imapTls.address().port, secure: true, ca: cert });
  await ic.connect(); await ic.login(CREDS.user, CREDS.pass);
  await ic.select('INBOX');
  const f = await ic.fetch('1', 'UID BODY.PEEK[]');
  assert.ok(f[0].body.toString().includes('TLS ok'));
  await ic.logout();
  console.log('✓ IMAP über SSL/TLS');

  // Falsches Zertifikat wird abgelehnt
  const bad = new ImapClient({ host: 'localhost', port: imapTls.address().port, secure: true });
  await assert.rejects(bad.connect(), /Verbindung zum Mailserver fehlgeschlagen/);
  console.log('✓ Unbekanntes Zertifikat wird abgelehnt');

  // SMTP über SSL
  const sc = new SmtpClient({ host: 'localhost', port: smtpTls.address().port, secure: true, ca: cert });
  await sc.connect(); await sc.login(CREDS.user, CREDS.pass);
  await sc.send('a@gmx.de', ['b@c.de'], Buffer.from('Subject: t\r\n\r\n.punkt\r\n'));
  await sc.quit();
  assert.ok(smtp.sent[0].raw.toString().includes('\r\n.punkt'));
  console.log('✓ SMTP über SSL/TLS (inkl. Punkt-Verdopplung)');

  // SMTP mit STARTTLS (eigener Mini-Server)
  const st = net.createServer((sock) => {
    let s = sock; let buf = '';
    const w = (x) => s.write(x + '\r\n');
    const onData = (d) => {
      buf += d.toString();
      let i;
      while ((i = buf.indexOf('\r\n')) !== -1) {
        const line = buf.slice(0, i); buf = buf.slice(i + 2);
        if (/^EHLO/i.test(line)) { w('250-mini'); w(s === sock ? '250 STARTTLS' : '250 AUTH PLAIN'); }
        else if (line === 'STARTTLS') {
          w('220 los'); sock.removeListener('data', onData);
          s = new tls.TLSSocket(sock, { isServer: true, key, cert }); s.on('data', onData); s.on('error', () => {});
        } else if (/^AUTH PLAIN/.test(line)) w(s !== sock ? '235 ok' : '530 erst TLS');
        else if (line === 'QUIT') { w('221 bye'); s.end(); }
      }
    };
    sock.on('data', onData); sock.on('error', () => {});
    w('220 mini');
  });
  await new Promise(r => st.listen(0, '127.0.0.1', r));
  const sc2 = new SmtpClient({ host: 'localhost', port: st.address().port, secure: false, ca: cert });
  await sc2.connect(); await sc2.login('u', 'p'); await sc2.quit();
  console.log('✓ SMTP mit STARTTLS (587)');

  // Ohne STARTTLS-Angebot und ohne Ausnahme: abbrechen
  const sc3 = new SmtpClient({ host: '127.0.0.1', port: smtp.server.address().port, secure: false });
  await assert.rejects(sc3.connect(), /keine Verschlüsselung/);
  console.log('✓ Unverschlüsselter Versand wird verweigert');

  for (const s of [imap, smtp.server, imapTls, smtpTls, st]) s.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('\nTLS-Tests bestanden.');
  process.exit(0);
})().catch((e) => { console.error('✗', e); process.exit(1); });
