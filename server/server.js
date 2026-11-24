#!/usr/bin/env node
'use strict';
// AZE Mail Server – ohne externe Abhängigkeiten (nur Node.js ab Version 18).
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Store } = require('./lib/store');
const { Auth } = require('./lib/auth');
const { MailService } = require('./lib/mail');
const proxy = require('./lib/proxy');

const VERSION = '1.0.0';
const ROOT = path.join(__dirname, '..');

function createApp(options) {
  options = Object.assign({
    dataDir: process.env.AZE_DATA_DIR || path.join(ROOT, 'data'),
    trustProxy: process.env.AZE_TRUST_PROXY === '1',
    behindHttps: process.env.AZE_BEHIND_HTTPS === '1',
    allowInsecureMail: process.env.AZE_ALLOW_INSECURE_MAIL === '1',
    tlsOptions: null,
    ipCheckUrl: 'https://api.ipify.org?format=json',
    proxyLookup: null
  }, options || {});
  const store = new Store(options.dataDir);
  const auth = new Auth(store);
  const mail = new MailService(store, auth, { allowInsecure: options.allowInsecureMail, tlsOptions: options.tlsOptions });

  function proto(req) {
    if (req.socket.encrypted || options.behindHttps) return 'https';
    if (options.trustProxy && req.headers['x-forwarded-proto']) return String(req.headers['x-forwarded-proto']).split(',')[0].trim();
    return 'http';
  }
  function origin(req) {
    const host = String(req.headers.host || 'localhost').replace(/[^a-zA-Z0-9.:\[\]-]/g, '');
    return proto(req) + '://' + host;
  }
  function clientIp(req) {
    if (options.trustProxy && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
    return req.socket.remoteAddress || '';
  }
  function cookies(req) {
    const out = {};
    for (const part of String(req.headers.cookie || '').split(';')) {
      const i = part.indexOf('=');
      if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    }
    return out;
  }
  function setSessionCookie(req, res, session) {
    const secure = proto(req) === 'https' ? '; Secure' : '';
    const value = session ? session.id : '';
    const age = session ? '' : '; Max-Age=0';
    res.setHeader('Set-Cookie', 'aze_sid=' + value + '; Path=/; HttpOnly; SameSite=Strict' + secure + age);
  }

  const APP_CSP = [
    "default-src 'self'", "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https: http:", "font-src 'self' data:", "media-src 'self' https:",
    "connect-src 'self' https://api.ipify.org", "frame-src 'self' https: http:", "object-src 'none'",
    "base-uri 'none'", "form-action 'self'", "frame-ancestors 'self'"
  ].join('; ');

  function baseHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  }

  function json(res, status, obj) {
    const body = Buffer.from(JSON.stringify(obj));
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': body.length });
    res.end(body);
  }

  function readBody(req, limit) {
    return new Promise((resolve, reject) => {
      const chunks = []; let size = 0;
      req.on('data', (c) => {
        size += c.length;
        if (size > limit) { reject(Object.assign(new Error('Anfrage zu groß.'), { status: 413 })); req.destroy(); }
        else chunks.push(c);
      });
      req.on('end', () => {
        if (!chunks.length) return resolve({});
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (e) { reject(Object.assign(new Error('Ungültige Anfrage.'), { status: 400 })); }
      });
      req.on('error', reject);
    });
  }

  function serveIndex(req, res) {
    const file = path.join(ROOT, 'index.html');
    fs.readFile(file, (e, buf) => {
      if (e) { res.writeHead(500); return res.end('index.html fehlt'); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': APP_CSP, 'Cache-Control': 'no-cache', 'X-Frame-Options': 'SAMEORIGIN' });
      res.end(buf);
    });
  }

  function contentDisposition(name) {
    const ascii = String(name).replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
    return 'attachment; filename="' + ascii + '"; filename*=UTF-8\'\'' + encodeURIComponent(name);
  }

  async function handleProxy(req, res, url, session) {
    const own = origin(req);
    const csp = proxy.proxyCsp(own);
    const fail = (status, msg) => {
      res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp, 'Cache-Control': 'no-store' });
      res.end('<!doctype html><meta charset="utf-8"><body style="font:15px -apple-system,sans-serif;background:#0b1018;color:#dce8f6;padding:20px"><h3>Seite über deutschen Server nicht verfügbar</h3><p>' + String(msg).replace(/[<&]/g, '') + '</p><p>Tipp: Die Seite mit „Extern öffnen“ direkt im Browser laden.</p></body>');
    };
    if (!session) return fail(401, 'Bitte zuerst in AZE Mail anmelden.');
    let target = url.searchParams.get('url') || '';
    if (url.pathname === '/proxy/form') {
      const t = url.searchParams.get('__aze_target') || '';
      const u = proxy.checkUrl(t);
      if (!u) return fail(400, 'Ungültiges Formularziel.');
      const params = new URLSearchParams(url.searchParams);
      params.delete('__aze_target');
      u.search = params.toString();
      target = u.href;
    }
    if (!proxy.checkUrl(target)) return fail(400, 'Diese Adresse ist nicht erlaubt.');
    const isRaw = url.pathname === '/proxy/raw';
    try {
      const r = await proxy.fetchUrl(target, { maxBytes: isRaw ? 10 * 1024 * 1024 : 5 * 1024 * 1024, accept: isRaw ? '*/*' : undefined, lookup: options.proxyLookup || undefined });
      const ct = String(r.headers['content-type'] || '').toLowerCase();
      const headers = { 'Content-Security-Policy': csp, 'Cache-Control': 'private, max-age=300', 'X-Frame-Options': 'SAMEORIGIN' };
      if (isRaw) {
        let type = ct.split(';')[0].trim();
        if (!/^(image\/(png|jpe?g|gif|webp|avif|svg\+xml|x-icon|vnd\.microsoft\.icon)|text\/css|font\/[a-z0-9]+|application\/(font-woff2?|x-font-[a-z]+|vnd\.ms-fontobject))$/.test(type)) {
          res.writeHead(415, headers); return res.end();
        }
        let body = r.body;
        if (type === 'text/css') { body = proxy.rewriteCss(body, r.url, own); type = 'text/css; charset=utf-8'; }
        res.writeHead(r.status, Object.assign(headers, { 'Content-Type': type }));
        return res.end(body);
      }
      if (!ct.includes('text/html') && !ct.includes('application/xhtml')) {
        return fail(415, 'Das ist keine Webseite (' + (ct.split(';')[0] || 'unbekannt') + '). Bitte extern öffnen.');
      }
      const out = proxy.rewriteHtml(r.body, r.headers, r.url, own);
      res.writeHead(r.status, Object.assign(headers, { 'Content-Type': 'text/html; charset=' + out.charset, 'Cache-Control': 'no-store' }));
      res.end(out.body);
    } catch (e) {
      fail(e.status || 502, e.message);
    }
  }

  async function api(req, res, url) {
    const method = req.method;
    const p = url.pathname;
    const sid = cookies(req).aze_sid;
    const session = auth.getSession(sid);
    const ip = clientIp(req);

    if (method !== 'GET' && method !== 'HEAD') {
      // Schutz gegen fremde Seiten (CSRF): eigener Header + gleiche Herkunft
      if (req.headers['x-aze'] !== '1') return json(res, 403, { error: 'Anfrage abgelehnt.' });
      if (req.headers.origin && req.headers.origin !== origin(req)) return json(res, 403, { error: 'Fremde Herkunft abgelehnt.' });
    }

    if (p === '/api/status' && method === 'GET') {
      return json(res, 200, {
        app: 'aze-mail', version: VERSION, setUp: auth.isSetUp(), loggedIn: !!session,
        username: session && store.data.auth ? store.data.auth.username : null,
        mail: session ? mail.publicAccount() : undefined,
        https: proto(req) === 'https'
      });
    }
    if (p === '/api/setup' && method === 'POST') {
      auth.checkRate(ip);
      const b = await readBody(req, 64 * 1024);
      try {
        const s = await auth.setup(b.code, b.username, b.password);
        setSessionCookie(req, res, s);
        return json(res, 200, { ok: true });
      } catch (e) { if (e.status === 403) auth.fail(ip); throw e; }
    }
    if (p === '/api/login' && method === 'POST') {
      auth.checkRate(ip);
      const b = await readBody(req, 64 * 1024);
      const s = await auth.loginPassword(b.username, b.password);
      if (!s) { auth.fail(ip); return json(res, 401, { error: 'Benutzername oder Passwort falsch.' }); }
      auth.ok(ip);
      setSessionCookie(req, res, s);
      return json(res, 200, { ok: true });
    }
    if (p === '/api/login/pin' && method === 'POST') {
      auth.checkRate(ip);
      const b = await readBody(req, 64 * 1024);
      try {
        const s = await auth.loginPin(b.deviceId, b.deviceToken, b.pin);
        auth.ok(ip);
        setSessionCookie(req, res, s);
        return json(res, 200, { ok: true });
      } catch (e) { auth.fail(ip); throw e; }
    }

    if (!session) return json(res, 401, { error: 'Bitte anmelden.', code: 'login' });

    if (p === '/api/logout' && method === 'POST') {
      auth.destroySession(session.id);
      setSessionCookie(req, res, null);
      return json(res, 200, { ok: true });
    }
    if (p === '/api/logout-all' && method === 'POST') {
      auth.destroyAll();
      setSessionCookie(req, res, null);
      return json(res, 200, { ok: true });
    }
    if (p === '/api/password' && method === 'POST') {
      const b = await readBody(req, 64 * 1024);
      await auth.changePassword(session, b.oldPassword, b.newPassword);
      return json(res, 200, { ok: true });
    }
    if (p === '/api/devices' && method === 'GET') {
      return json(res, 200, { devices: store.data.devices.map(d => ({ id: d.id, name: d.name, created: d.created, lastUsed: d.lastUsed, current: d.id === session.deviceId })) });
    }
    if (p === '/api/devices' && method === 'POST') {
      const b = await readBody(req, 64 * 1024);
      return json(res, 200, await auth.addDevice(session, b.pin, b.name));
    }
    if (p === '/api/devices' && method === 'DELETE') {
      return json(res, auth.removeDevice(url.searchParams.get('id')) ? 200 : 404, { ok: true });
    }

    if (p === '/api/mail/account' && method === 'GET') return json(res, 200, mail.publicAccount());
    if (p === '/api/mail/account' && method === 'POST') {
      const b = await readBody(req, 64 * 1024);
      return json(res, 200, await mail.testAndSave(session, b));
    }
    if (p === '/api/mail/account' && method === 'DELETE') { await mail.removeAccount(); return json(res, 200, { ok: true }); }
    if (p === '/api/settings' && method === 'POST') {
      const b = await readBody(req, 64 * 1024);
      if (typeof b.saveSent === 'boolean') store.data.settings.saveSent = b.saveSent;
      store.save();
      return json(res, 200, { ok: true });
    }

    if (p === '/api/addresses' && method === 'GET') return json(res, 200, { addresses: mail.allAddresses() });
    if (p === '/api/addresses' && method === 'POST') { const b = await readBody(req, 64 * 1024); mail.addAddress(b.email, b.label); return json(res, 200, { addresses: mail.allAddresses() }); }
    if (p === '/api/addresses' && method === 'PATCH') { const b = await readBody(req, 64 * 1024); mail.setAddressActive(b.email, b.active); return json(res, 200, { addresses: mail.allAddresses() }); }
    if (p === '/api/addresses' && method === 'DELETE') { mail.deleteAddress(url.searchParams.get('email')); return json(res, 200, { addresses: mail.allAddresses() }); }

    if (p === '/api/messages' && method === 'GET') {
      const q = url.searchParams;
      return json(res, 200, await mail.listMessages(session, { folder: q.get('folder') || 'inbox', address: q.get('address') || 'all', before: q.get('before'), q: q.get('q') || '' }));
    }
    if (p === '/api/message' && method === 'GET') {
      return json(res, 200, await mail.getMessage(session, url.searchParams.get('folder') || 'inbox', url.searchParams.get('uid')));
    }
    if (p === '/api/attachment' && method === 'GET') {
      const a = await mail.getAttachment(session, url.searchParams.get('folder') || 'inbox', url.searchParams.get('uid'), url.searchParams.get('idx'));
      const safe = /^(image\/(png|jpeg|gif|webp)|application\/pdf)$/.test(a.contentType) ? a.contentType : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': safe, 'Content-Disposition': contentDisposition(a.filename), 'Content-Length': a.content.length, 'Cache-Control': 'no-store', 'Content-Security-Policy': "sandbox; default-src 'none'" });
      return res.end(a.content);
    }
    if (p === '/api/message/seen' && method === 'POST') { const b = await readBody(req, 64 * 1024); await mail.setSeen(session, b.folder, b.uid, !!b.seen); return json(res, 200, { ok: true }); }
    if (p === '/api/message/delete' && method === 'POST') { const b = await readBody(req, 64 * 1024); return json(res, 200, await mail.deleteMessage(session, b.folder, b.uid)); }
    if (p === '/api/message/restore' && method === 'POST') { const b = await readBody(req, 64 * 1024); await mail.restoreMessage(session, b.uid); return json(res, 200, { ok: true }); }
    if (p === '/api/send' && method === 'POST') { const b = await readBody(req, 25 * 1024 * 1024); return json(res, 200, await mail.send(session, b)); }

    if (p === '/api/connection/test' && method === 'GET') {
      const started = Date.now();
      try {
        const r = await proxy.fetchUrl(options.ipCheckUrl, { accept: 'application/json', lookup: options.proxyLookup || undefined, timeout: 8000 });
        const ipInfo = JSON.parse(r.body.toString('utf8'));
        return json(res, 200, { ok: true, ip: ipInfo.ip, ms: Date.now() - started });
      } catch (e) {
        return json(res, 200, { ok: false, error: e.message });
      }
    }
    return json(res, 404, { error: 'Nicht gefunden.' });
  }

  async function handler(req, res) {
    baseHeaders(res);
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch (e) { res.writeHead(400); return res.end(); }
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      if (url.pathname === '/proxy' || url.pathname === '/proxy/raw' || url.pathname === '/proxy/form') {
        return await handleProxy(req, res, url, auth.getSession(cookies(req).aze_sid));
      }
      if ((url.pathname === '/' || url.pathname === '/index.html') && (req.method === 'GET' || req.method === 'HEAD')) return serveIndex(req, res);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Nicht gefunden');
    } catch (e) {
      const status = e.status || (e.kind === 'auth' ? 502 : e.kind ? 502 : 500);
      if (status >= 500 && !e.kind) console.error('[AZE] Fehler:', e.message);
      if (!res.headersSent) json(res, status, { error: e.message || 'Unbekannter Fehler', code: e.code || e.kind });
      else res.end();
    }
  }

  return { handler, store, auth, mail, options };
}

function start() {
  const port = Number(process.env.AZE_PORT || process.env.PORT || 8080);
  const host = process.env.AZE_HOST || '127.0.0.1';
  const app = createApp();
  let server;
  if (process.env.AZE_TLS_CERT && process.env.AZE_TLS_KEY) {
    server = https.createServer({ cert: fs.readFileSync(process.env.AZE_TLS_CERT), key: fs.readFileSync(process.env.AZE_TLS_KEY) }, app.handler);
  } else server = http.createServer(app.handler);
  server.listen(port, host, () => {
    const scheme = server instanceof https.Server ? 'https' : 'http';
    console.log('AZE Mail ' + VERSION + ' läuft auf ' + scheme + '://' + (host === '0.0.0.0' ? '<IP-dieses-Geräts>' : host) + ':' + port);
    if (app.auth.setupCode) {
      console.log('');
      console.log('  Erste Einrichtung – Einrichtungscode: ' + app.auth.setupCode);
      console.log('  (Diesen Code im Browser bei der Ersteinrichtung eingeben.)');
      console.log('');
    }
    if (scheme === 'http' && host !== '127.0.0.1' && host !== 'localhost' && process.env.AZE_BEHIND_HTTPS !== '1') {
      console.log('Hinweis: Ohne HTTPS werden Passwörter unverschlüsselt im Netz übertragen. Für Zugriff von außen HTTPS verwenden (siehe INSTALLATION.md).');
    }
  });
  const shutdown = () => { app.mail.close().finally(() => process.exit(0)); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) start();
module.exports = { createApp, VERSION };
