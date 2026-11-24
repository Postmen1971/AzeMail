'use strict';
// "Deutscher Server"-Weg: Webseiten werden vom AZE-Server abgerufen, so dass die
// besuchte Seite die IP-Adresse des Servers sieht. Bewusst als vereinfachte
// Leseansicht: Skripte der fremden Seite laufen nicht, Cookies werden nicht
// weitergegeben. Für Logins/Einkäufe bleibt der normale Browser der richtige Weg.
const http = require('http');
const https = require('https');
const dns = require('dns');
const net = require('net');
const zlib = require('zlib');

const blocked = new net.BlockList();
for (const [a, p] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]]) blocked.addSubnet(a, p, 'ipv4');
for (const [a, p] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['64:ff9b::', 96], ['2001:db8::', 32]]) blocked.addSubnet(a, p, 'ipv6');

function isBlockedIp(ip) {
  const m = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (m) ip = m[1];
  return blocked.check(ip, net.isIPv6(ip) ? 'ipv6' : 'ipv4');
}

function safeLookup(hostname, options, cb) {
  if (typeof options === 'function') { cb = options; options = {}; }
  dns.lookup(hostname, { all: true }, (err, addrs) => {
    if (err) return cb(err);
    const ok = addrs.filter(a => !isBlockedIp(a.address));
    if (!ok.length) return cb(Object.assign(new Error('Interne Adressen sind gesperrt.'), { code: 'EBLOCKED' }));
    if (options && options.all) return cb(null, ok);
    cb(null, ok[0].address, ok[0].family);
  });
}

function checkUrl(raw) {
  let u;
  try { u = new URL(raw); } catch (e) { return null; }
  if (!['http:', 'https:'].includes(u.protocol)) return null;
  if (u.username || u.password) return null;
  if (u.port && !['80', '443'].includes(u.port)) return null;
  if (net.isIP(u.hostname.replace(/^\[|\]$/g, '')) && isBlockedIp(u.hostname.replace(/^\[|\]$/g, ''))) return null;
  if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(u.hostname)) return null;
  return u;
}

const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Mobile Safari/537.36 AZE-Mail';

function fetchUrl(raw, opts, hops) {
  opts = opts || {};
  hops = hops || 0;
  return new Promise((resolve, reject) => {
    const u = checkUrl(raw);
    if (!u) return reject(Object.assign(new Error('Diese Adresse ist nicht erlaubt.'), { status: 400 }));
    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.request(u, {
      method: 'GET', lookup: opts.lookup || safeLookup, timeout: opts.timeout || 15000,
      headers: { 'User-Agent': UA, 'Accept': opts.accept || 'text/html,application/xhtml+xml,*/*;q=0.8', 'Accept-Language': 'de-DE,de;q=0.9', 'Accept-Encoding': 'gzip, deflate, br' }
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        if (hops >= 5) return reject(Object.assign(new Error('Zu viele Weiterleitungen.'), { status: 502 }));
        let next;
        try { next = new URL(res.headers.location, u).href; } catch (e) { return reject(Object.assign(new Error('Ungültige Weiterleitung.'), { status: 502 })); }
        return resolve(fetchUrl(next, opts, hops + 1));
      }
      let stream = res;
      const enc = String(res.headers['content-encoding'] || '').toLowerCase();
      if (enc === 'gzip') stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
      else if (enc === 'br') stream = res.pipe(zlib.createBrotliDecompress());
      const chunks = []; let size = 0;
      const max = opts.maxBytes || 5 * 1024 * 1024;
      stream.on('data', (c) => { size += c.length; if (size > max) { req.destroy(); reject(Object.assign(new Error('Seite ist zu groß für die Server-Ansicht.'), { status: 413 })); } else chunks.push(c); });
      stream.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks), url: u.href }));
      stream.on('error', (e) => reject(Object.assign(new Error('Seite konnte nicht gelesen werden: ' + e.message), { status: 502 })));
    });
    req.on('timeout', () => req.destroy(new Error('Zeitüberschreitung')));
    req.on('error', (e) => reject(Object.assign(new Error(e.code === 'EBLOCKED' ? 'Diese Adresse ist nicht erlaubt.' : 'Seite nicht erreichbar: ' + e.message), { status: e.code === 'EBLOCKED' ? 400 : 502 })));
    req.end();
  });
}

function escAttr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
function unescAttr(s) { return String(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }

function absolutize(v, base) {
  v = unescAttr(v.trim());
  if (!v || /^(javascript|data|mailto|tel|about|blob):/i.test(v) || v.startsWith('#')) return null;
  try { return new URL(v, base).href; } catch (e) { return null; }
}

function detectCharset(headers, body) {
  const ct = String(headers['content-type'] || '');
  let m = ct.match(/charset=["']?([\w-]+)/i);
  if (!m) m = body.slice(0, 4096).toString('latin1').match(/<meta[^>]+charset=["']?([\w-]+)/i);
  return m ? m[1].toLowerCase() : 'utf-8';
}

function rewriteHtml(body, headers, pageUrl, own) {
  const cs = detectCharset(headers, body);
  const utf8 = cs === 'utf-8' || cs === 'utf8';
  let html = body.toString(utf8 ? 'utf8' : 'latin1');
  const page = (abs) => own + '/proxy?url=' + encodeURIComponent(abs);
  const raw = (abs) => own + '/proxy/raw?url=' + encodeURIComponent(abs);

  html = html.replace(/<meta[^>]+http-equiv=["']?(content-security-policy|refresh)[^>]*>/gi, '');
  html = html.replace(/<base\b[^>]*>/gi, '');
  // Links
  html = html.replace(/(<(?:a|area)\b[^>]*?\bhref\s*=\s*)(["'])(.*?)\2/gi, (m, pre, q, v) => {
    const abs = absolutize(v, pageUrl);
    return abs ? pre + q + escAttr(page(abs)) + q + ' target="_self"' : m;
  });
  // Bilder, Stylesheets, Quellen
  html = html.replace(/(<(?:img|source|input|video|audio)\b[^>]*?\b(?:src|poster)\s*=\s*)(["'])(.*?)\2/gi, (m, pre, q, v) => {
    const abs = absolutize(v, pageUrl); return abs ? pre + q + escAttr(raw(abs)) + q : m;
  });
  html = html.replace(/(\bsrcset\s*=\s*)(["'])(.*?)\2/gi, (m, pre, q, v) => {
    const list = unescAttr(v).split(',').map(s => {
      const [u, ...rest] = s.trim().split(/\s+/);
      const abs = absolutize(u || '', pageUrl);
      return abs ? [raw(abs), ...rest].join(' ') : '';
    }).filter(Boolean);
    return pre + q + escAttr(list.join(', ')) + q;
  });
  html = html.replace(/(<link\b[^>]*?\bhref\s*=\s*)(["'])(.*?)\2/gi, (m, pre, q, v) => {
    const abs = absolutize(v, pageUrl); return abs ? pre + q + escAttr(raw(abs)) + q : m;
  });
  html = html.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (m, q, v) => {
    const abs = absolutize(v, pageUrl); return abs ? 'url("' + raw(abs) + '")' : m;
  });
  // Formulare: GET über den Server, POST direkt in neuem Tab
  html = html.replace(/<form\b([^>]*)>/gi, (m, attrs) => {
    const actionM = attrs.match(/\baction\s*=\s*(["'])(.*?)\1/i);
    const methodPost = /\bmethod\s*=\s*["']?post/i.test(attrs);
    const abs = absolutize(actionM ? actionM[2] : '', pageUrl) || pageUrl;
    const cleaned = attrs.replace(/\baction\s*=\s*(["'])(.*?)\1/i, '').replace(/\btarget\s*=\s*(["'])(.*?)\1/i, '');
    if (methodPost) return '<form' + cleaned + ' action="' + escAttr(abs) + '" target="_blank">';
    return '<form' + cleaned + ' action="' + escAttr(own + '/proxy/form') + '" target="_self"><input type="hidden" name="__aze_target" value="' + escAttr(abs) + '">';
  });
  // Skripte entfernen (laufen ohnehin nicht)
  html = html.replace(/<script\b[\s\S]*?<\/script\s*>/gi, '').replace(/<noscript\b[^>]*>/gi, '').replace(/<\/noscript\s*>/gi, '');
  const banner = '<div style="position:sticky;top:0;z-index:2147483647;background:#183457;color:#fff;font:13px -apple-system,sans-serif;padding:7px 10px">Über deutschen Server geladen · vereinfachte Ansicht ohne Skripte</div>';
  if (/<body\b[^>]*>/i.test(html)) html = html.replace(/<body\b[^>]*>/i, (m) => m + banner);
  else html = banner + html;
  return { body: Buffer.from(html, utf8 ? 'utf8' : 'latin1'), charset: utf8 ? 'utf-8' : cs };
}

function rewriteCss(body, cssUrl, own) {
  const raw = (abs) => own + '/proxy/raw?url=' + encodeURIComponent(abs);
  let css = body.toString('utf8');
  css = css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (m, q, v) => {
    const abs = absolutize(v, cssUrl); return abs ? 'url("' + raw(abs) + '")' : m;
  });
  css = css.replace(/@import\s+(["'])(.*?)\1/gi, (m, q, v) => {
    const abs = absolutize(v, cssUrl); return abs ? '@import "' + raw(abs) + '"' : m;
  });
  return Buffer.from(css, 'utf8');
}

function proxyCsp(own) {
  return "sandbox allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation; default-src 'none'; img-src " + own + " data:; style-src " + own + " 'unsafe-inline'; font-src " + own + " data:; media-src " + own + "; form-action " + own + " https: http:; frame-ancestors 'self'";
}

module.exports = { fetchUrl, checkUrl, rewriteHtml, rewriteCss, proxyCsp, isBlockedIp };
