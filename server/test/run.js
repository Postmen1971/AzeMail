'use strict';
// Automatischer Gesamttest: node server/test/run.js
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../server');
const { Mailbox, startImap, startSmtp } = require('./mock-mailserver');
const proxy = require('../lib/proxy');
const mime = require('../lib/mime');

const PRIMARY = 'aziz.test@gmx.de';
const CREDS = { user: PRIMARY, pass: 'Mail-Pässwort "1"' };

function listen(app) {
  return new Promise((resolve) => {
    const srv = http.createServer(app.handler);
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function client(base) {
  let cookie = '';
  return async function call(method, p, body, extraHeaders) {
    const headers = Object.assign({ 'x-aze': '1' }, extraHeaders || {});
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (cookie) headers.cookie = cookie;
    const res = await fetch(base + p, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
    const sc = res.headers.get('set-cookie');
    if (sc) cookie = /Max-Age=0/.test(sc) ? '' : sc.split(';')[0];
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
    return { status: res.status, data, headers: res.headers };
  };
}

function msg({ from = 'Händler <shop@example.com>', to, extra = '', subject = 'Hallo', body = 'Text', date = 'Tue, 17 Nov 2026 10:00:00 +0100' }) {
  return 'From: ' + from + '\r\nTo: ' + to + '\r\n' + extra + 'Subject: ' + subject + '\r\nDate: ' + date + '\r\nMessage-ID: <' + Math.random().toString(36).slice(2) + '@example.com>\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n' + body + '\r\n';
}

(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aze-test-'));
  const box = new Mailbox();
  let app = createApp({ dataDir, allowInsecureMail: true });
  const imap = await startImap(box, CREDS);
  const smtp = await startSmtp(box, CREDS, PRIMARY, () => app.store.data.addresses.map(a => a.email));
  let srv = await listen(app);
  let base = 'http://127.0.0.1:' + srv.address().port;
  let call = client(base);
  const step = (s) => console.log('✓ ' + s);

  // Testpost
  box.add('INBOX', msg({ to: PRIMARY, subject: 'An die Hauptadresse' }), ['\\Seen']);
  box.add('INBOX', msg({ to: 'Aziz <shop.aze@gmx.de>', subject: '=?UTF-8?Q?Bestellbest=C3=A4tigung?=', body: 'Ihre Bestellung' }));
  box.add('INBOX', msg({ to: 'newsletter@example.com', extra: 'Delivered-To: kleinanzeigen.aze@gmx.de\r\n', subject: 'Passwort zurücksetzen' }));
  box.add('INBOX', [
    'From: Freund <f@example.org>', 'To: ' + PRIMARY, 'Subject: Foto', 'Date: Wed, 18 Nov 2026 09:00:00 +0100', 'Message-ID: <foto@example.org>',
    'Content-Type: multipart/mixed; boundary="B1"', '', '--B1', 'Content-Type: multipart/related; boundary="B2"', '', '--B2',
    'Content-Type: text/html; charset=utf-8', '', '<p>Schau mal <img src="cid:bild1"><img src="https://tracker.example/pixel.gif"></p><script>alert(1)</script>', '--B2',
    'Content-Type: image/png', 'Content-ID: <bild1>', 'Content-Transfer-Encoding: base64', '', 'iVBORw0KGgo=', '--B2--', '--B1',
    'Content-Type: application/pdf; name="Rechnung.pdf"', 'Content-Disposition: attachment; filename="Rechnung.pdf"', 'Content-Transfer-Encoding: base64', '', 'JVBERi0xLjQ=', '--B1--', ''
  ].join('\r\n'));

  // 1. Status & Einrichtung
  let r = await call('GET', '/api/status');
  assert.strictEqual(r.data.setUp, false); assert.strictEqual(r.data.loggedIn, false);
  r = await call('POST', '/api/setup', { code: 'FALSCH', username: 'aziz', password: 'sehr-geheim-123' });
  assert.strictEqual(r.status, 403);
  r = await call('POST', '/api/setup', { code: app.auth.setupCode, username: 'aziz', password: 'kurz' });
  assert.strictEqual(r.status, 400);
  r = await call('POST', '/api/setup', { code: app.auth.setupCode.toLowerCase(), username: 'aziz', password: 'sehr-geheim-123' });
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  r = await call('GET', '/api/status');
  assert.strictEqual(r.data.loggedIn, true);
  step('Ersteinrichtung mit Einrichtungscode');

  // CSRF-Schutz
  r = await call('POST', '/api/addresses', { email: 'x@y.de' }, { 'x-aze': '0' });
  assert.strictEqual(r.status, 403);
  r = await call('POST', '/api/addresses', { email: 'x@y.de' }, { origin: 'https://boese.example' });
  assert.strictEqual(r.status, 403);
  step('Fremde Anfragen (CSRF) werden abgelehnt');

  // 2. Mailkonto
  r = await call('GET', '/api/messages');
  assert.strictEqual(r.status, 409);
  const acc = { preset: '', email: PRIMARY, name: 'Aziz', user: PRIMARY, imapHost: '127.0.0.1', imapPort: imap.address().port, smtpHost: '127.0.0.1', smtpPort: smtp.server.address().port, insecure: true };
  r = await call('POST', '/api/mail/account', Object.assign({}, acc, { password: 'falsch' }));
  assert.strictEqual(r.status, 502); assert.match(r.data.error, /Anmeldung/);
  r = await call('POST', '/api/mail/account', Object.assign({}, acc, { password: CREDS.pass }));
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.strictEqual(r.data.configured, true); assert.strictEqual(r.data.password, undefined);
  const stateText = fs.readFileSync(path.join(dataDir, 'aze-state.json'), 'utf8');
  assert.ok(!stateText.includes('Pässwort') && !stateText.includes('sehr-geheim'), 'Passwörter dürfen nicht im Klartext gespeichert sein');
  assert.strictEqual((fs.statSync(path.join(dataDir, 'aze-state.json')).mode & 0o777), 0o600);
  step('Mailkonto verbinden (falsches Passwort wird erkannt, nichts im Klartext gespeichert)');

  // 3. Adressen
  r = await call('POST', '/api/addresses', { email: 'shop.aze@gmx.de', label: 'Shopping' });
  assert.strictEqual(r.status, 200);
  r = await call('POST', '/api/addresses', { email: 'kleinanzeigen.aze@gmx.de' });
  r = await call('POST', '/api/addresses', { email: 'shop.aze@gmx.de' });
  assert.strictEqual(r.status, 409);
  r = await call('POST', '/api/addresses', { email: 'kein-at' });
  assert.strictEqual(r.status, 400);
  r = await call('GET', '/api/addresses');
  assert.deepStrictEqual(r.data.addresses.map(a => a.email), [PRIMARY, 'shop.aze@gmx.de', 'kleinanzeigen.aze@gmx.de']);
  step('Adressen hinzufügen, Dubletten/Fehler abweisen');

  // 4. Posteingang + Filter
  r = await call('GET', '/api/messages?folder=inbox&address=all');
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.strictEqual(r.data.messages.length, 4);
  const bySubject = Object.fromEntries(r.data.messages.map(m => [m.subject, m]));
  assert.strictEqual(bySubject['Bestellbestätigung'].recipient, 'shop.aze@gmx.de');
  assert.strictEqual(bySubject['Passwort zurücksetzen'].recipient, 'kleinanzeigen.aze@gmx.de');
  assert.strictEqual(bySubject['An die Hauptadresse'].recipient, PRIMARY);
  assert.strictEqual(bySubject['An die Hauptadresse'].seen, true);
  assert.strictEqual(bySubject['Foto'].attachment, true);
  assert.strictEqual(r.data.messages[0].subject, 'Foto', 'neueste zuerst');
  r = await call('GET', '/api/messages?folder=inbox&address=' + encodeURIComponent('shop.aze@gmx.de'));
  assert.deepStrictEqual(r.data.messages.map(m => m.subject), ['Bestellbestätigung']);
  r = await call('GET', '/api/messages?folder=inbox&address=' + encodeURIComponent('kleinanzeigen.aze@gmx.de'));
  assert.deepStrictEqual(r.data.messages.map(m => m.subject), ['Passwort zurücksetzen']);
  r = await call('GET', '/api/messages?folder=inbox&address=' + encodeURIComponent(PRIMARY));
  assert.deepStrictEqual(r.data.messages.map(m => m.subject).sort(), ['An die Hauptadresse', 'Foto']);
  r = await call('GET', '/api/messages?folder=inbox&q=' + encodeURIComponent('bestätigung'));
  assert.deepStrictEqual(r.data.messages.map(m => m.subject), ['Bestellbestätigung']);
  r = await call('GET', '/api/messages?folder=inbox&address=fremd@x.de');
  assert.strictEqual(r.status, 400);
  step('Gemeinsamer Posteingang, Filter je Empfängeradresse, Suche mit Umlauten');

  // Seitenweise laden
  for (let i = 0; i < 45; i++) box.add('INBOX', msg({ to: PRIMARY, subject: 'Massenmail ' + i }));
  r = await call('GET', '/api/messages?folder=inbox');
  assert.strictEqual(r.data.messages.length, 40); assert.strictEqual(r.data.more, true);
  const r2 = await call('GET', '/api/messages?folder=inbox&before=' + r.data.nextBefore);
  assert.strictEqual(r2.data.messages.length, 9); assert.strictEqual(r2.data.more, false);
  for (const m of box.folders.INBOX.filter(m => m.raw.toString().includes('Massenmail'))) box.folders.INBOX.splice(box.folders.INBOX.indexOf(m), 1);
  step('Seitenweises Nachladen');

  // 5. Lesen
  const fotoUid = bySubject['Foto'].uid;
  r = await call('GET', '/api/message?folder=inbox&uid=' + fotoUid);
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.ok(r.data.html.includes('data:image/png;base64,iVBORw0KGgo='), 'cid-Bild eingebettet');
  assert.ok(!/<script/i.test(r.data.html), 'Skripte entfernt');
  assert.deepStrictEqual(r.data.attachments.map(a => a.filename), ['Rechnung.pdf']);
  assert.ok(r.data.text.includes('Schau mal'));
  assert.ok(box.folders.INBOX.find(m => m.uid === fotoUid).flags.has('\\Seen'), 'als gelesen markiert');
  r = await call('GET', '/api/attachment?folder=inbox&uid=' + fotoUid + '&idx=' + 0);
  // idx 0 ist das eingebettete Bild, idx 1 die PDF
  r = await call('GET', '/api/attachment?folder=inbox&uid=' + fotoUid + '&idx=1');
  assert.strictEqual(r.data.toString(), '%PDF-1.4');
  assert.match(r.headers.get('content-disposition'), /attachment; filename="Rechnung.pdf"/);
  assert.match(r.headers.get('content-security-policy'), /sandbox/);
  step('Nachricht lesen (HTML entschärft, eingebettete Bilder, Anhang-Download)');

  const shopUid = bySubject['Bestellbestätigung'].uid;
  r = await call('GET', '/api/message?folder=inbox&uid=' + shopUid);
  assert.strictEqual(r.data.replyFrom, 'shop.aze@gmx.de');
  step('Antwort-Absender = Empfängeradresse der Nachricht');

  // 6. Pausieren
  r = await call('PATCH', '/api/addresses', { email: 'kleinanzeigen.aze@gmx.de', active: false });
  assert.strictEqual(r.data.addresses[2].active, false);
  r = await call('GET', '/api/message?folder=inbox&uid=' + bySubject['Passwort zurücksetzen'].uid);
  assert.strictEqual(r.data.replyFrom, PRIMARY); assert.match(r.data.replyFromNote, /pausiert/);
  r = await call('GET', '/api/messages?folder=inbox&address=' + encodeURIComponent('kleinanzeigen.aze@gmx.de'));
  assert.strictEqual(r.data.messages.length, 1, 'pausierte Adresse empfängt weiter');
  r = await call('POST', '/api/send', { from: 'kleinanzeigen.aze@gmx.de', to: 'a@b.de', subject: 'x', text: 'y' });
  assert.strictEqual(r.status, 400); assert.match(r.data.error, /pausiert/);
  step('Pausierte Adresse: Nachrichten bleiben sichtbar, Senden gesperrt');

  // 7. Senden + Antworten
  r = await call('POST', '/api/send', {
    from: 'shop.aze@gmx.de', to: 'Aziz <' + PRIMARY + '>, extern@example.net', cc: '', subject: 'Re: Bestellbestätigung',
    text: 'Danke!\n\n> Ihre Bestellung', inReplyTo: '<orig@example.com>', references: '<orig@example.com>', replyToUid: shopUid, replyFolder: 'inbox',
    attachments: [{ name: 'Notiz ä.txt', type: 'text/plain', data: Buffer.from('Hallo Anhang').toString('base64') }]
  });
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  assert.deepStrictEqual(r.data.warnings, []);
  assert.strictEqual(smtp.sent.length, 1);
  assert.strictEqual(smtp.sent[0].env.from, 'shop.aze@gmx.de');
  assert.deepStrictEqual(smtp.sent[0].env.to, [PRIMARY, 'extern@example.net']);
  const parsedSent = mime.parseMessage(smtp.sent[0].raw);
  assert.strictEqual(parsedSent.subject, 'Re: Bestellbestätigung');
  assert.strictEqual(parsedSent.attachments[0].filename, 'Notiz ä.txt');
  assert.strictEqual(box.folders['Gesendet'].length, 1, 'Kopie in Gesendet');
  assert.ok(box.folders.INBOX.find(m => m.uid === shopUid).flags.has('\\Answered'));
  r = await call('GET', '/api/messages?folder=sent');
  assert.strictEqual(r.data.messages[0].recipient, 'shop.aze@gmx.de');
  r = await call('GET', '/api/messages?folder=sent&address=' + encodeURIComponent('shop.aze@gmx.de'));
  assert.strictEqual(r.data.messages.length, 1);
  r = await call('POST', '/api/send', { from: PRIMARY, to: 'kaputt', subject: 'x', text: 'y' });
  assert.strictEqual(r.status, 400);
  r = await call('POST', '/api/send', { from: 'fremd@evil.com', to: 'a@b.de', subject: 'x', text: 'y' });
  assert.strictEqual(r.status, 400);
  step('Senden mit Anhang, Kopie in „Gesendet“, Antwort markiert, ungültige Absender/Empfänger abgewiesen');

  // 8. Löschen / Papierkorb
  r = await call('POST', '/api/message/delete', { folder: 'inbox', uid: shopUid });
  assert.strictEqual(r.data.permanent, false);
  r = await call('GET', '/api/messages?folder=trash');
  assert.strictEqual(r.data.messages.length, 1);
  const trashUid = r.data.messages[0].uid;
  r = await call('POST', '/api/message/restore', { uid: trashUid });
  r = await call('GET', '/api/messages?folder=trash');
  assert.strictEqual(r.data.messages.length, 0);
  r = await call('GET', '/api/messages?folder=inbox&q=' + encodeURIComponent('Bestellbestätigung'));
  const restoredUid = r.data.messages.find(m => m.subject === 'Bestellbestätigung').uid;
  await call('POST', '/api/message/delete', { folder: 'inbox', uid: restoredUid });
  r = await call('GET', '/api/messages?folder=trash');
  r = await call('POST', '/api/message/delete', { folder: 'trash', uid: r.data.messages[0].uid });
  assert.strictEqual(r.data.permanent, true);
  assert.strictEqual(box.folders['Papierkorb'].length, 0);
  step('Löschen in Papierkorb, Wiederherstellen, endgültig löschen');

  // 9. PIN
  r = await call('POST', '/api/devices', { pin: '12', name: 'iPhone' });
  assert.strictEqual(r.status, 400);
  r = await call('POST', '/api/devices', { pin: '4711', name: 'iPhone' });
  const dev = r.data;
  assert.ok(dev.deviceId && dev.deviceToken);
  await call('POST', '/api/logout');
  r = await call('GET', '/api/messages');
  assert.strictEqual(r.status, 401);
  r = await call('POST', '/api/login/pin', { deviceId: dev.deviceId, deviceToken: dev.deviceToken, pin: '0000' });
  assert.strictEqual(r.status, 401); assert.match(r.data.error, /Noch 4/);
  r = await call('POST', '/api/login/pin', { deviceId: dev.deviceId, deviceToken: 'falsch', pin: '4711' });
  assert.strictEqual(r.status, 401);
  r = await call('POST', '/api/login/pin', { deviceId: dev.deviceId, deviceToken: dev.deviceToken, pin: '4711' });
  assert.strictEqual(r.status, 200, JSON.stringify(r.data));
  await app.mail.close();
  r = await call('GET', '/api/messages?folder=inbox');
  assert.strictEqual(r.status, 200, 'Mailzugriff nach PIN-Anmeldung (Schlüssel entschlüsselt)');
  step('PIN-Schnellzugang (falsche PIN zählt mit, Mailzugriff danach möglich)');

  // PIN-Sperre nach 5 Fehlversuchen
  r = await call('POST', '/api/devices', { pin: '1234', name: 'Tablet' });
  const dev2 = r.data;
  for (let i = 0; i < 5; i++) r = await call('POST', '/api/login/pin', { deviceId: dev2.deviceId, deviceToken: dev2.deviceToken, pin: '9999' });
  assert.strictEqual(r.data.code, 'device');
  r = await call('POST', '/api/login/pin', { deviceId: dev2.deviceId, deviceToken: dev2.deviceToken, pin: '1234' });
  assert.strictEqual(r.status, 401);
  step('PIN wird nach 5 Fehlversuchen für das Gerät gelöscht');

  // 10. Neustart: alles muss erhalten bleiben
  await app.mail.close();
  srv.close();
  app = createApp({ dataDir, allowInsecureMail: true });
  srv = await listen(app);
  base = 'http://127.0.0.1:' + srv.address().port;
  call = client(base);
  r = await call('GET', '/api/status');
  assert.strictEqual(r.data.setUp, true); assert.strictEqual(r.data.loggedIn, false);
  assert.strictEqual(app.auth.setupCode, null);
  r = await call('POST', '/api/login', { username: 'aziz', password: 'falsch-falsch' });
  assert.strictEqual(r.status, 401);
  r = await call('POST', '/api/login', { username: 'AZIZ', password: 'sehr-geheim-123' });
  assert.strictEqual(r.status, 200);
  r = await call('GET', '/api/messages?folder=inbox');
  assert.strictEqual(r.status, 200); assert.ok(r.data.messages.length >= 3);
  step('Nach Server-Neustart: Anmeldung und Postfach funktionieren');

  // 11. Passwort ändern
  r = await call('POST', '/api/password', { oldPassword: 'falsch', newPassword: 'neues-passwort-99' });
  assert.strictEqual(r.status, 403);
  r = await call('POST', '/api/password', { oldPassword: 'sehr-geheim-123', newPassword: 'neues-passwort-99' });
  assert.strictEqual(r.status, 200);
  await call('POST', '/api/logout');
  r = await call('POST', '/api/login', { username: 'aziz', password: 'neues-passwort-99' });
  assert.strictEqual(r.status, 200);
  await app.mail.close();
  r = await call('GET', '/api/messages?folder=inbox');
  assert.strictEqual(r.status, 200);
  step('Passwort ändern');

  // 12. Proxy-Schutz
  r = await call('GET', '/proxy?url=' + encodeURIComponent('http://127.0.0.1:' + srv.address().port + '/api/status'));
  assert.strictEqual(r.status, 400);
  r = await call('GET', '/proxy?url=' + encodeURIComponent('http://192.168.178.1/'));
  assert.strictEqual(r.status, 400);
  r = await call('GET', '/proxy?url=' + encodeURIComponent('file:///etc/passwd'));
  assert.strictEqual(r.status, 400);
  assert.match(r.headers.get('content-security-policy'), /sandbox/);
  const anon = client(base);
  r = await anon('GET', '/proxy?url=' + encodeURIComponent('https://www.markt.de/'));
  assert.strictEqual(r.status, 401);
  assert.strictEqual(proxy.isBlockedIp('::ffff:10.0.0.1'), true);
  assert.strictEqual(proxy.isBlockedIp('8.8.8.8'), false);
  const rw = proxy.rewriteHtml(Buffer.from('<html><head><meta http-equiv="refresh" content="0;url=x"></head><body><a href="/suche?q=1&amp;x=2">S</a><img src="bild.png" srcset="a.png 1x, b.png 2x"><form action="/finden"><input name="q"></form><form method="post" action="/login"></form><script>evil()</script><div style="background:url(\'/bg.jpg\')"></div></body></html>'), { 'content-type': 'text/html; charset=utf-8' }, 'https://www.markt.de/start/', 'https://aze.example');
  const h = rw.body.toString();
  assert.ok(h.includes('href="https://aze.example/proxy?url=https%3A%2F%2Fwww.markt.de%2Fsuche%3Fq%3D1%26x%3D2"'), h);
  assert.ok(h.includes('src="https://aze.example/proxy/raw?url=https%3A%2F%2Fwww.markt.de%2Fstart%2Fbild.png"'));
  assert.ok(h.includes('name="__aze_target" value="https://www.markt.de/finden"'));
  assert.ok(h.includes('action="https://www.markt.de/login" target="_blank"'));
  assert.ok(!h.includes('evil()') && !h.includes('http-equiv'));
  assert.ok(h.includes('url("https://aze.example/proxy/raw?url=https%3A%2F%2Fwww.markt.de%2Fbg.jpg")'));
  step('Deutscher-Server-Weg: interne Adressen gesperrt, nur angemeldet, Seiten werden umgeschrieben');

  // 13. Startseite
  r = await call('GET', '/');
  assert.strictEqual(r.status, 200);
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
  assert.ok(r.data.toString().includes('AZE Mail'));
  step('Oberfläche wird mit Sicherheits-Headern ausgeliefert');

  // 14. Mailkonto trennen
  r = await call('DELETE', '/api/mail/account');
  r = await call('GET', '/api/mail/account');
  assert.strictEqual(r.data.configured, false);
  step('Mailkonto trennen');

  await app.mail.close();
  srv.close(); imap.close(); smtp.server.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log('\nAlle Tests bestanden.');
  process.exit(0);
})().catch((e) => { console.error('\n✗ TEST FEHLGESCHLAGEN:', e); process.exit(1); });
