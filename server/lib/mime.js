'use strict';
// MIME-Parser und -Erzeuger ohne externe Abhängigkeiten.
const crypto = require('crypto');

function decodeCharset(buf, charset) {
  let cs = String(charset || 'utf-8').trim().toLowerCase().replace(/^"|"$/g, '');
  if (cs === 'utf8') cs = 'utf-8';
  if (cs === 'us-ascii' || cs === 'ascii') cs = 'utf-8';
  if (cs === 'latin1') cs = 'iso-8859-1';
  try { return new TextDecoder(cs).decode(buf); }
  catch (e) { return new TextDecoder('utf-8').decode(buf); }
}

function decodeQP(str, isHeader) {
  if (isHeader) str = str.replace(/_/g, ' ');
  str = str.replace(/=\r?\n/g, '');
  const out = [];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '=' && /^[0-9A-Fa-f]{2}$/.test(str.substr(i + 1, 2))) {
      out.push(parseInt(str.substr(i + 1, 2), 16)); i += 2;
    } else {
      const code = str.charCodeAt(i);
      if (code < 256) out.push(code); else out.push(...Buffer.from(c, 'utf8'));
    }
  }
  return Buffer.from(out);
}

function decodeWords(str) {
  if (!str) return '';
  // Leerraum zwischen zwei kodierten Wörtern entfernen (RFC 2047)
  str = str.replace(/(=\?[^?]+\?[bBqQ]\?[^?]*\?=)\s+(?==\?[^?]+\?[bBqQ]\?[^?]*\?=)/g, '$1');
  return str.replace(/=\?([^?*]+)(?:\*[^?]*)?\?([bBqQ])\?([^?]*)\?=/g, (m, cs, enc, text) => {
    try {
      const buf = enc.toUpperCase() === 'B' ? Buffer.from(text, 'base64') : decodeQP(text, true);
      return decodeCharset(buf, cs);
    } catch (e) { return m; }
  });
}

function splitHeadBody(buf) {
  let idx = buf.indexOf('\r\n\r\n');
  let sepLen = 4;
  const idx2 = buf.indexOf('\n\n');
  if (idx === -1 || (idx2 !== -1 && idx2 < idx)) { idx = idx2; sepLen = 2; }
  if (idx === -1) return { head: buf.toString('latin1'), body: Buffer.alloc(0) };
  return { head: buf.slice(0, idx).toString('latin1'), body: buf.slice(idx + sepLen) };
}

function parseHeaders(headStr) {
  const headers = new Map();
  const lines = headStr.replace(/\r\n/g, '\n').split('\n');
  const unfolded = [];
  for (const line of lines) {
    if (/^[ \t]/.test(line) && unfolded.length) unfolded[unfolded.length - 1] += ' ' + line.trim();
    else if (line) unfolded.push(line);
  }
  for (const l of unfolded) {
    const i = l.indexOf(':');
    if (i <= 0) continue;
    const key = l.slice(0, i).trim().toLowerCase();
    // Rohwerte sind latin1; 8-Bit-Header (UTF-8 ohne Kodierung) wieder als UTF-8 lesen
    let val = l.slice(i + 1).trim();
    if (/[\x80-\xff]/.test(val)) {
      const asUtf8 = Buffer.from(val, 'latin1').toString('utf8');
      if (!asUtf8.includes('\uFFFD')) val = asUtf8;
    }
    if (!headers.has(key)) headers.set(key, []);
    headers.get(key).push(val);
  }
  return headers;
}

function header(headers, name) {
  const v = headers.get(name.toLowerCase());
  return v ? v[0] : '';
}

// Parameter wie charset, boundary, filename (inkl. RFC 2231)
function parseParams(value) {
  const parts = [];
  let cur = '', q = false;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === '"' && value[i - 1] !== '\\') q = !q;
    if (c === ';' && !q) { parts.push(cur); cur = ''; } else cur += c;
  }
  parts.push(cur);
  const main = parts.shift().trim().toLowerCase();
  const params = {};
  const continued = {};
  for (const p of parts) {
    const i = p.indexOf('=');
    if (i < 0) continue;
    let k = p.slice(0, i).trim().toLowerCase();
    let v = p.slice(i + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\(.)/g, '$1');
    const m = k.match(/^([^*]+)\*(\d+)?(\*)?$/);
    if (m) {
      const name = m[1];
      continued[name] = continued[name] || [];
      continued[name].push({ n: Number(m[2] || 0), v, enc: !!m[3] || (!m[2] && k.endsWith('*')) });
    } else params[k] = v;
  }
  for (const [name, list] of Object.entries(continued)) {
    list.sort((a, b) => a.n - b.n);
    let charset = 'utf-8';
    let bytes = [];
    list.forEach((item, idx) => {
      let v = item.v;
      if (item.enc) {
        if (idx === 0) {
          const mm = v.match(/^([^']*)'[^']*'(.*)$/);
          if (mm) { charset = mm[1] || 'utf-8'; v = mm[2]; }
        }
        bytes.push(Buffer.from(v.replace(/%([0-9A-Fa-f]{2})/g, (x, h) => String.fromCharCode(parseInt(h, 16))), 'latin1'));
      } else bytes.push(Buffer.from(v, 'utf8'));
    });
    params[name] = decodeCharset(Buffer.concat(bytes), charset);
  }
  for (const k of Object.keys(params)) params[k] = decodeWords(params[k]);
  return { value: main, params };
}

function decodeBody(body, cte) {
  cte = String(cte || '').trim().toLowerCase();
  if (cte === 'base64') return Buffer.from(body.toString('latin1').replace(/[^A-Za-z0-9+/=]/g, ''), 'base64');
  if (cte === 'quoted-printable') return decodeQP(body.toString('latin1'), false);
  return body;
}

function splitMultipart(body, boundary) {
  const text = body.toString('latin1');
  const delim = '--' + boundary;
  const parts = [];
  let pos = text.indexOf(delim);
  if (pos === -1) return parts;
  while (true) {
    let start = text.indexOf('\n', pos);
    if (start === -1) break;
    start += 1;
    if (text.substr(pos + delim.length, 2) === '--') break;
    let next = text.indexOf('\n' + delim, start);
    if (next === -1) { parts.push(body.slice(start)); break; }
    let end = next;
    if (text[end - 1] === '\r') end -= 1;
    parts.push(body.slice(start, end));
    pos = next + 1;
  }
  return parts;
}

function parsePart(buf, out, depth) {
  if (depth > 20) return;
  const { head, body } = splitHeadBody(buf);
  const headers = parseHeaders(head);
  const ct = parseParams(header(headers, 'content-type') || 'text/plain; charset=us-ascii');
  const cd = parseParams(header(headers, 'content-disposition') || '');
  const cte = header(headers, 'content-transfer-encoding');
  const filename = cd.params.filename || ct.params.name || '';
  const cid = (header(headers, 'content-id') || '').replace(/^<|>$/g, '');

  if (ct.value.startsWith('multipart/') && ct.params.boundary) {
    const parts = splitMultipart(body, ct.params.boundary);
    if (ct.value === 'multipart/alternative') {
      // bevorzugt die letzte (reichhaltigste) Variante, aber Text und HTML beide behalten
      for (const p of parts) parsePart(p, out, depth + 1);
    } else {
      for (const p of parts) parsePart(p, out, depth + 1);
    }
    return;
  }
  const data = decodeBody(body, cte);
  const isAttachment = cd.value === 'attachment' || (!!filename && !ct.value.startsWith('text/')) || (!!filename && cd.value === 'attachment');
  if (!isAttachment && ct.value === 'text/plain' && out.text === null) {
    out.text = decodeCharset(data, ct.params.charset);
    return;
  }
  if (!isAttachment && ct.value === 'text/html' && out.html === null) {
    out.html = decodeCharset(data, ct.params.charset);
    return;
  }
  if (!isAttachment && ct.value.startsWith('text/') && out.text === null) {
    out.text = decodeCharset(data, ct.params.charset);
    return;
  }
  out.attachments.push({
    filename: filename || (ct.value === 'message/rfc822' ? 'nachricht.eml' : 'anhang'),
    contentType: ct.value,
    size: data.length,
    cid,
    inline: cd.value === 'inline' || (!!cid && !filename),
    content: data
  });
}

// Adresslisten: "Name" <a@b>, c@d
function parseAddressList(str) {
  str = decodeWords(str || '');
  const result = [];
  let cur = '', q = false, angle = 0, paren = 0;
  const parts = [];
  for (const c of str) {
    if (c === '"' ) q = !q;
    else if (!q && c === '<') angle++;
    else if (!q && c === '>') angle = Math.max(0, angle - 1);
    else if (!q && c === '(') paren++;
    else if (!q && c === ')') paren = Math.max(0, paren - 1);
    if ((c === ',' || c === ';') && !q && !angle && !paren) { parts.push(cur); cur = ''; } else cur += c;
  }
  parts.push(cur);
  for (let p of parts) {
    p = p.trim();
    if (!p) continue;
    const m = p.match(/^(.*?)<([^>]+)>/);
    let name = '', address = '';
    if (m) { name = m[1].trim().replace(/^"|"$/g, '').replace(/\\(.)/g, '$1').trim(); address = m[2].trim(); }
    else {
      const cm = p.match(/^([^\s(]+)\s*(?:\((.*)\))?/);
      address = cm ? cm[1] : p; name = cm && cm[2] ? cm[2] : '';
    }
    if (address.includes(':')) {
      // Gruppensyntax "Liste: a@b;" grob behandeln
      address = address.split(':').pop();
    }
    address = address.trim();
    if (address) result.push({ name, address });
  }
  return result;
}

function parseMessage(buf) {
  const { head } = splitHeadBody(buf);
  const headers = parseHeaders(head);
  const out = { text: null, html: null, attachments: [] };
  parsePart(buf, out, 0);
  return {
    headers,
    subject: decodeWords(header(headers, 'subject')),
    from: parseAddressList(header(headers, 'from')),
    to: parseAddressList((headers.get('to') || []).join(', ')),
    cc: parseAddressList((headers.get('cc') || []).join(', ')),
    replyTo: parseAddressList(header(headers, 'reply-to')),
    date: header(headers, 'date'),
    messageId: header(headers, 'message-id'),
    references: header(headers, 'references'),
    text: out.text,
    html: out.html,
    attachments: out.attachments
  };
}

// ---------- Erzeugen ----------
function encodeWord(str) {
  if (/^[\x20-\x7e]*$/.test(str)) return str;
  // in Stücke teilen, damit Zeilen nicht zu lang werden
  const words = [];
  let chunk = '';
  for (const ch of str) {
    if (Buffer.byteLength(chunk + ch) > 45) { words.push(chunk); chunk = ''; }
    chunk += ch;
  }
  if (chunk) words.push(chunk);
  return words.map(w => '=?UTF-8?B?' + Buffer.from(w, 'utf8').toString('base64') + '?=').join('\r\n ');
}

function formatAddress(a) {
  if (!a.name) return a.address;
  const n = /^[\x20-\x7e]*$/.test(a.name) ? '"' + a.name.replace(/["\\]/g, '\\$&') + '"' : encodeWord(a.name);
  return n + ' <' + a.address + '>';
}

function wrapBase64(buf) {
  return buf.toString('base64').replace(/.{1,76}/g, '$&\r\n');
}

function encodeQP(str) {
  const buf = Buffer.from(str.replace(/\r?\n/g, '\r\n'), 'utf8');
  let out = '', line = '';
  const push = (s) => {
    if (line.length + s.length > 75) { out += line + '=\r\n'; line = ''; }
    line += s;
  };
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b === 13 && buf[i + 1] === 10) {
      // Leerzeichen am Zeilenende kodieren
      if (line.endsWith(' ') || line.endsWith('\t')) {
        const last = line[line.length - 1];
        line = line.slice(0, -1) + '=' + last.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
      }
      out += line + '\r\n'; line = ''; i++; continue;
    }
    if ((b >= 33 && b <= 126 && b !== 61) || b === 32 || b === 9) {
      // Zeilen, die mit "." beginnen, vorsorglich kodieren
      if (line === '' && b === 46) push('=2E'); else push(String.fromCharCode(b));
    } else push('=' + b.toString(16).toUpperCase().padStart(2, '0'));
  }
  return out + line;
}

function buildMessage(o) {
  const domain = (o.from.address.split('@')[1] || 'aze-mail.local').replace(/[^a-zA-Z0-9.-]/g, '');
  const messageId = '<' + crypto.randomBytes(12).toString('hex') + '.' + Date.now() + '@' + domain + '>';
  const lines = [];
  lines.push('From: ' + formatAddress(o.from));
  if (o.to && o.to.length) lines.push('To: ' + o.to.map(formatAddress).join(',\r\n '));
  if (o.cc && o.cc.length) lines.push('Cc: ' + o.cc.map(formatAddress).join(',\r\n '));
  lines.push('Subject: ' + encodeWord(o.subject || ''));
  lines.push('Date: ' + new Date().toUTCString().replace('GMT', '+0000'));
  lines.push('Message-ID: ' + messageId);
  if (o.inReplyTo) lines.push('In-Reply-To: ' + o.inReplyTo);
  if (o.references) lines.push('References: ' + o.references);
  lines.push('MIME-Version: 1.0');
  lines.push('User-Agent: AZE Mail');
  const textPart = ['Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: quoted-printable', '', encodeQP(o.text || '')].join('\r\n');
  let body;
  if (o.attachments && o.attachments.length) {
    const boundary = '=_aze_' + crypto.randomBytes(10).toString('hex');
    lines.push('Content-Type: multipart/mixed; boundary="' + boundary + '"');
    const parts = [textPart];
    for (const a of o.attachments) {
      const name = String(a.filename || 'anhang').replace(/[\r\n"]/g, '');
      const ascii = /^[\x20-\x7e]*$/.test(name);
      const nameParam = ascii ? 'name="' + name + '"' : "name*=UTF-8''" + encodeURIComponent(name);
      const fileParam = ascii ? 'filename="' + name + '"' : "filename*=UTF-8''" + encodeURIComponent(name);
      const type = /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(a.contentType || '') ? a.contentType : 'application/octet-stream';
      parts.push(['Content-Type: ' + type + '; ' + nameParam, 'Content-Transfer-Encoding: base64', 'Content-Disposition: attachment; ' + fileParam, '', wrapBase64(a.content)].join('\r\n'));
    }
    body = parts.map(p => '--' + boundary + '\r\n' + p).join('\r\n') + '\r\n--' + boundary + '--\r\n';
  } else {
    lines.push('Content-Type: text/plain; charset=utf-8');
    lines.push('Content-Transfer-Encoding: quoted-printable');
    body = encodeQP(o.text || '') + '\r\n';
  }
  const raw = lines.join('\r\n') + '\r\n\r\n' + body;
  return { raw: Buffer.from(raw, 'utf8'), messageId };
}

module.exports = { parseMessage, parseHeaders, splitHeadBody, header, decodeWords, parseAddressList, buildMessage, encodeWord, decodeCharset };
