# AZE Mail – Installation und Start

AZE Mail besteht aus zwei Teilen:

- **Oberfläche** (`index.html`): läuft auf GitHub Pages als Demo ohne echte Mails.
- **AZE-Server** (`server/`): holt deine Mails per IMAP, sendet per SMTP und stellt den Browser-Weg „Deutscher Server“ bereit. Er liefert die Oberfläche selbst mit aus. Für echtes Mailen öffnest du also die Adresse des Servers, nicht GitHub Pages.

Der Server braucht nur **Node.js ab Version 18**. Zusatzpakete (npm install) sind nicht nötig. Kosten: **0 €**.

---

## 1. Mailkonto vorbereiten (GMX FreeMail)

1. Im GMX-Webmail einloggen.
2. Einstellungen → **POP3/IMAP Abruf** → „POP3 und IMAP Zugriff erlauben“ einschalten.
3. Wenn du mehrere Adressen nutzen willst: weitere Adressen (Alias-Adressen) direkt bei GMX anlegen. In AZE Mail trägst du sie später unter **Mail → Adresse hinzufügen** ein.

AZE Mail verwendet für GMX automatisch: Empfang `imap.gmx.net:993` (SSL), Versand `mail.gmx.net:465` (SSL).

---

## 2. Schnell ausprobieren (auf einem PC)

Ohne echtes Postfach, mit eingebautem Test-Postfach:

```bash
git clone https://github.com/Postmen1971/AzeMail.git
cd AzeMail
node server/test/dev-server.js
```

Dann im Browser `http://127.0.0.1:8099` öffnen. Den Einrichtungscode und die Test-Zugangsdaten zeigt das Fenster an. Für das Mailkonto „Anderer Anbieter“ wählen und `127.0.0.1` mit den angezeigten Ports eintragen.

Mit dem echten GMX-Konto, nur auf diesem PC:

```bash
node server/server.js
```

Dann `http://127.0.0.1:8080` öffnen und den **Einrichtungscode** aus dem Fenster eingeben.

---

## 3. Dauerbetrieb auf einem deutschen Server (empfohlen)

Damit AZE Mail auf iPhone und Fire Max 11 jederzeit läuft und der Browser-Weg „Deutscher Server“ wirklich eine deutsche IP nutzt, braucht der Server einen Rechner, der immer an ist.

**Kostenlose Möglichkeit:** Oracle Cloud „Always Free“ mit der Region **Frankfurt**.
- Bei der Anmeldung verlangt Oracle eine Kreditkarte zur Prüfung. Prüfe vorher selbst die aktuellen Bedingungen, damit keine Kosten entstehen.
- Die Heimatregion lässt sich später nicht ändern. Wähle also gleich **Germany Central (Frankfurt)**.
- Erstelle eine kleine VM mit **Ubuntu 24.04** (Always-Free-Form).

**Alternative:** ein eigener Raspberry Pi zu Hause. Die Schritte sind dieselben.

### 3.1 Server einrichten (Ubuntu 24.04)

Per SSH auf der VM:

```bash
sudo apt update && sudo apt install -y nodejs git
node --version          # muss 18 oder höher sein
sudo useradd --system --home /opt/azemail azemail
sudo git clone https://github.com/Postmen1971/AzeMail.git /opt/azemail
sudo mkdir -p /opt/azemail/data && sudo chown -R azemail:azemail /opt/azemail/data
sudo cp /opt/azemail/deploy/aze-mail.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now aze-mail
sudo journalctl -u aze-mail -n 20      # hier steht der Einrichtungscode
```

### 3.2 Sicher von iPhone/Tablet erreichen (HTTPS, kostenlos): Tailscale

So ist AZE Mail **nicht öffentlich im Internet sichtbar**. Nur deine eigenen Geräte kommen dran.

1. Kostenloses Tailscale-Konto anlegen (tailscale.com).
2. Auf dem Server:
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   sudo tailscale serve --bg 8080
   ```
   Beim ersten Mal fragt Tailscale eventuell, ob HTTPS für dein Netz aktiviert werden soll. Zustimmen.
3. Auf iPhone und Fire-Tablet die **Tailscale-App** installieren und mit demselben Konto anmelden.
4. In Safari die von `tailscale serve` angezeigte Adresse öffnen (Form: `https://<servername>.<dein-netz>.ts.net`).
5. Einrichtungscode eingeben, Benutzername und Passwort festlegen, dann unter **Mehr → Mailkonto** GMX verbinden.
6. Optional: In Safari „Zum Home-Bildschirm“ wählen. Dann startet AZE Mail wie eine App.

Tailscale leitet nur den Verkehr zu deinen eigenen Geräten um. Der restliche Internetverkehr des iPhones bleibt unverändert.

---

## 4. Einstellungen (Umgebungsvariablen)

| Variable | Bedeutung | Standard |
|---|---|---|
| `AZE_PORT` | Port des Servers | `8080` |
| `AZE_HOST` | Netzwerkadresse (`0.0.0.0` = im ganzen Heimnetz erreichbar) | `127.0.0.1` |
| `AZE_DATA_DIR` | Ordner für die verschlüsselten Konto-Daten | `./data` |
| `AZE_BEHIND_HTTPS=1` | Server läuft hinter HTTPS (z. B. Tailscale) | aus |
| `AZE_TRUST_PROXY=1` | Weitergeleitete Header eines Reverse-Proxys vertrauen | aus |
| `AZE_TLS_CERT` / `AZE_TLS_KEY` | eigenes Zertifikat, Server spricht selbst HTTPS | – |
| `AZE_SETUP_CODE` | festen Einrichtungscode vorgeben | zufällig |

**Wichtig:** Ohne HTTPS nur auf demselben Gerät (`127.0.0.1`) verwenden. Sonst würden Passwörter unverschlüsselt durchs Netz gehen.

---

## 5. Sicherheit und Datenschutz – was wo liegt

- **Mails** bleiben im GMX-Postfach. Der AZE-Server lädt sie nur bei Bedarf und speichert keine Inhalte.
- **Mail-Passwort:** liegt nur verschlüsselt (AES-256-GCM) in `data/aze-state.json`. Der Schlüssel dazu entsteht erst beim Anmelden mit deinem AZE-Passwort oder deiner PIN. Ohne Anmeldung kann selbst der Server es nicht lesen.
- **AZE-Passwort und PIN** werden nicht gespeichert, nur daraus abgeleitete Schlüssel (scrypt). Nach 5 falschen PIN-Eingaben wird die PIN für das Gerät gelöscht. Nach 10 Fehlversuchen pro IP gilt eine Sperre von 15 Minuten.
- **Externe Bilder** in Mails sind blockiert, bis du „Externe Bilder laden“ tippst (Schutz vor Tracking-Pixeln). Skripte in Mails laufen nie.
- **Cookies:** nur das notwendige Sitzungs-Cookie (HttpOnly, SameSite=Strict). Keine Tracker.
- **Backup:** Sichere den Ordner `data/`. Ohne ihn musst du AZE Mail neu einrichten. Deine Mails sind davon nicht betroffen, sie liegen bei GMX.

---

## 6. Tests

```bash
npm test        # oder: node server/test/run.js && node server/test/tls-test.js
```

Die Tests starten einen eigenen Test-Mailserver und prüfen unter anderem: Anmeldung, PIN, Filter je Adresse, Lesen, Senden, Papierkorb, Verschlüsselung und den Schutz des Proxys.
