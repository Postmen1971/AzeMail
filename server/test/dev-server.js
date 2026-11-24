'use strict';
// Startet AZE Mail mit einem Test-Postfach (nur zum Ausprobieren/Testen der Oberfläche).
// Aufruf: node server/test/dev-server.js  → http://127.0.0.1:8099
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../server');
const { Mailbox, startImap, startSmtp } = require('./mock-mailserver');

(async () => {
  const PRIMARY = 'aziz.test@gmx.de';
  const CREDS = { user: PRIMARY, pass: 'test-passwort' };
  const box = new Mailbox();
  const add = (from, to, subject, body, extra, date) => box.add('INBOX', 'From: ' + from + '\r\nTo: ' + to + '\r\n' + (extra || '') + 'Subject: ' + subject + '\r\nDate: ' + (date || new Date().toUTCString()) + '\r\nMessage-ID: <' + Math.random().toString(36).slice(2) + '@test>\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n' + body + '\r\n');
  add('markt.de <noreply@markt.de>', 'aze.kleinanzeigen@gmx.de', 'Bitte bestätige deine E-Mail-Adresse', 'Hallo,\n\nbitte bestätige deine Adresse: https://www.markt.de/bestaetigen?id=123\n\nDein markt.de-Team', '', 'Mon, 23 Nov 2026 18:20:00 +0100');
  add('Amazon.de <bestellung@amazon.de>', 'Aziz <aze.shop@gmx.de>', 'Ihre Bestellung wurde versandt', 'Guten Tag,\n\nIhre Bestellung ist unterwegs.', '', 'Tue, 24 Nov 2026 09:12:00 +0100');
  box.add('INBOX', ['From: Mehmet <mehmet@example.org>', 'To: ' + PRIMARY + ', sister@example.org', 'Subject: Grillen am Samstag?', 'Date: ' + new Date().toUTCString(), 'Message-ID: <grill@test>',
    'Content-Type: multipart/mixed; boundary="B1"', '', '--B1', 'Content-Type: text/html; charset=utf-8', '', '<div style="font-family:sans-serif"><h2 style="color:#2a5d9f">Grillen 🔥</h2><p>Hallo Aziz,<br>hast du am <b>Samstag</b> Zeit? Bring die Kinder mit!</p><p><img src="https://example.org/foto.jpg" alt="Foto (extern)"></p></div>', '--B1',
    'Content-Type: application/pdf; name="Einkaufsliste.pdf"', 'Content-Disposition: attachment; filename="Einkaufsliste.pdf"', 'Content-Transfer-Encoding: base64', '', 'JVBERi0xLjQ=', '--B1--', ''].join('\r\n'));
  const imap = await startImap(box, CREDS);
  let app;
  const smtp = await startSmtp(box, CREDS, PRIMARY, () => app.store.data.addresses.map(a => a.email));
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aze-dev-'));
  app = createApp({ dataDir, allowInsecureMail: true });
  const port = Number(process.env.PORT || 8099);
  http.createServer(app.handler).listen(port, '127.0.0.1', () => {
    const info = { url: 'http://127.0.0.1:' + port, setupCode: app.auth.setupCode, imapPort: imap.address().port, smtpPort: smtp.server.address().port, user: CREDS.user, pass: CREDS.pass };
    fs.writeFileSync(path.join(os.tmpdir(), 'aze-dev.json'), JSON.stringify(info));
    console.log('AZE Mail Testbetrieb:', info);
  });
})();
