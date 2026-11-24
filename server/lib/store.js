'use strict';
// Kleine JSON-Datei als Speicher. Enthält nur Konto-, Adress- und Einstellungsdaten –
// keine E-Mail-Inhalte. Geheimnisse liegen nur verschlüsselt darin.
const fs = require('fs');
const path = require('path');

class Store {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, 'aze-state.json');
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    this.data = { version: 1, auth: null, devices: [], mail: null, addresses: [], settings: { saveSent: true } };
    if (fs.existsSync(this.file)) {
      const loaded = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.data = Object.assign(this.data, loaded);
    }
  }
  save() {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, this.file);
  }
}

module.exports = { Store };
