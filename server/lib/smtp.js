'use strict';
// Schlanker SMTP-Client (RFC 5321) mit SSL/TLS (465) oder STARTTLS (587).
const tls = require('tls');
const net = require('net');
const os = require('os');

class SmtpError extends Error {
  constructor(msg, kind) { super(msg); this.kind = kind || 'smtp'; }
}

class SmtpClient {
  constructor(opts) {
    this.opts = Object.assign({ port: 465, secure: true, timeout: 30000 }, opts);
    this.buf = '';
    this.waiter = null;
    this.lines = [];
  }

  _attach(sock) {
    this.sock = sock;
    sock.setTimeout(this.opts.timeout, () => sock.destroy(new Error('Zeitüberschreitung')));
    sock.on('data', (d) => this._onData(d));
    sock.on('error', (e) => this._fail(e));
    sock.on('close', () => this._fail(new Error('Verbindung geschlossen')));
  }

  _fail(e) {
    if (this.waiter) { const w = this.waiter; this.waiter = null; w.reject(new SmtpError('Versandserver: ' + e.message, 'connection')); }
  }

  _onData(d) {
    this.buf += d.toString('utf8');
    let i;
    while ((i = this.buf.indexOf('\r\n')) !== -1) {
      const line = this.buf.slice(0, i);
      this.buf = this.buf.slice(i + 2);
      this.lines.push(line);
      if (/^\d{3} /.test(line) || /^\d{3}$/.test(line)) {
        const code = Number(line.slice(0, 3));
        const text = this.lines.map(l => l.slice(4)).join('\n');
        this.lines = [];
        if (this.waiter) { const w = this.waiter; this.waiter = null; w.resolve({ code, text }); }
      }
    }
  }

  _read() {
    return new Promise((resolve, reject) => { this.waiter = { resolve, reject }; });
  }

  async cmd(line, expect) {
    const p = this._read();
    this.sock.write(line + '\r\n');
    const r = await p;
    if (expect && !expect.includes(r.code)) {
      throw new SmtpError('Versandserver meldet ' + r.code + ': ' + r.text.split('\n')[0], r.code === 535 ? 'auth' : 'smtp');
    }
    return r;
  }

  async connect() {
    const { host, port, secure } = this.opts;
    const servername = net.isIP(host) ? undefined : host;
    const p = this._read();
    await new Promise((resolve, reject) => {
      const sock = secure
        ? tls.connect({ host, port, servername, ca: this.opts.ca, rejectUnauthorized: this.opts.rejectUnauthorized !== false }, resolve)
        : net.connect({ host, port }, resolve);
      sock.once('error', (e) => reject(new SmtpError('Verbindung zum Versandserver fehlgeschlagen: ' + e.message, 'connect')));
      this._attach(sock);
    });
    const greet = await p;
    if (greet.code !== 220) throw new SmtpError('Versandserver lehnt Verbindung ab: ' + greet.text, 'connect');
    const name = 'aze-mail.' + (os.hostname().replace(/[^a-zA-Z0-9.-]/g, '') || 'local');
    let ehlo = await this.cmd('EHLO ' + name, [250]);
    if (!secure) {
      if (!/STARTTLS/i.test(ehlo.text)) {
        if (!this.opts.allowInsecure) throw new SmtpError('Versandserver bietet keine Verschlüsselung an.', 'config');
      } else {
        await this.cmd('STARTTLS', [220]);
        const plain = this.sock;
        plain.removeAllListeners('data');
        plain.removeAllListeners('close');
        plain.removeAllListeners('error');
        await new Promise((resolve, reject) => {
          const s = tls.connect({ socket: plain, servername, ca: this.opts.ca, rejectUnauthorized: this.opts.rejectUnauthorized !== false }, resolve);
          s.once('error', reject);
          this._attach(s);
        });
        ehlo = await this.cmd('EHLO ' + name, [250]);
      }
    }
    this.ehlo = ehlo.text;
  }

  async login(user, pass) {
    try {
      if (/AUTH[ =][^\n]*PLAIN/i.test(this.ehlo)) {
        await this.cmd('AUTH PLAIN ' + Buffer.from('\0' + user + '\0' + pass, 'utf8').toString('base64'), [235]);
      } else {
        await this.cmd('AUTH LOGIN', [334]);
        await this.cmd(Buffer.from(user, 'utf8').toString('base64'), [334]);
        await this.cmd(Buffer.from(pass, 'utf8').toString('base64'), [235]);
      }
    } catch (e) {
      if (e.kind === 'connection') throw e;
      throw new SmtpError('Anmeldung beim Versandserver fehlgeschlagen. Zugangsdaten prüfen.', 'auth');
    }
  }

  async send(from, recipients, raw) {
    await this.cmd('MAIL FROM:<' + from + '>', [250]);
    for (const r of recipients) await this.cmd('RCPT TO:<' + r + '>', [250, 251]);
    await this.cmd('DATA', [354]);
    // Punkt-Verdopplung am Zeilenanfang
    let text = raw.toString('latin1').replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
    if (!text.endsWith('\r\n')) text += '\r\n';
    const p = this._read();
    this.sock.write(Buffer.from(text, 'latin1'));
    this.sock.write('.\r\n');
    const r = await p;
    if (r.code !== 250) throw new SmtpError('Versand abgelehnt (' + r.code + '): ' + r.text.split('\n')[0]);
  }

  async quit() {
    try { await Promise.race([this.cmd('QUIT'), new Promise(r => setTimeout(r, 1000))]); } catch (e) { /* egal */ }
    try { this.sock.destroy(); } catch (e) { /* egal */ }
  }
}

module.exports = { SmtpClient, SmtpError };
