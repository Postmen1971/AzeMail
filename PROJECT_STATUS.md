# AZE Mail – Projektstatus

**Stand:** 24.11.2026  
**Repository:** `Postmen1971/AzeMail`  
**Phase:** Version 1.0 fertig – Inbetriebnahme mit echtem GMX-Konto auf eigenem Server

## Aktueller Stand
Version 1.0 ist fertig: Oberfläche (`index.html`) und AZE-Server (`server/`, Node.js ohne Zusatzpakete). Ohne laufenden Server (GitHub Pages) zeigt die Seite automatisch die bisherige Demo. Mit Server läuft der echte Betrieb. Anleitung: `INSTALLATION.md`.

## Fertig umgesetzt
- Ersteinrichtung mit Einrichtungscode, Login mit Passwort, PIN-Schnellzugang pro Gerät (5 Fehlversuche → PIN gelöscht), Geräteliste, Passwort ändern, Abmelden/überall abmelden, Sperre bei vielen Fehlversuchen.
- Mailkonto verbinden mit Verbindungstest (GMX-Voreinstellung oder eigene IMAP/SMTP-Server, nur verschlüsselt: SSL/TLS oder STARTTLS).
- Gemeinsamer Posteingang + Filter je Empfängeradresse; Zuordnung jeder Nachricht zu ihrer Empfängeradresse.
- Ordner Posteingang, Gesendet, Papierkorb; Suche; seitenweises Nachladen; automatisches Aktualisieren.
- Lesen (Text und HTML in abgesicherter Ansicht, externe Bilder erst auf Wunsch), Anhänge herunterladen.
- Antworten / Allen antworten mit der passenden Empfängeradresse als Absender; neue Mail mit Anhängen (max. 15 MB); Kopie in „Gesendet“.
- Löschen in den Papierkorb, Wiederherstellen, endgültiges Löschen nach Bestätigung; Als ungelesen markieren.
- Adressen hinzufügen, pausieren/aktivieren, nach Bestätigung entfernen.
- Browser-Weg „Deutscher Server“ (Abruf über den AZE-Server, vereinfachte Ansicht ohne Skripte) und „Verbindung testen“ für beide Wege.
- Shopping, Einmal-SMS-Linkliste und Datenschutz-Bereich unverändert übernommen.

## Getestet
- `npm test`: 18 Ablauf-Tests gegen einen eingebauten Test-Mailserver (Anmeldung, PIN, Filter, Lesen, Senden, Papierkorb, Neustart, Verschlüsselung der gespeicherten Daten, CSRF- und Proxy-Schutz) und 5 TLS-Tests (IMAP SSL, SMTP SSL und STARTTLS, Zertifikatsprüfung).
- Oberfläche im Handy-Format automatisiert durchgeklickt (Einrichtung → Konto → Filter → Lesen → Antworten vom Alias → Gesendet → Papierkorb → Abmelden → PIN).
- **Noch nicht getestet:** Verbindung zu den echten GMX-Servern. Das geht erst nach der Installation mit deinem Konto.

## Bekannte Grenzen
- Ein Mailkonto pro AZE-Installation (mit beliebig vielen Alias-Adressen).
- Ansicht über den deutschen Server ohne Skripte: viele moderne Shops (Amazon, eBay) funktionieren dort nur eingeschränkt. Dafür „Extern öffnen“.
- Keine Entwürfe und kein Weiterleiten in Version 1.0.
- Anzahl möglicher Alias-Adressen hängt vom GMX-Tarif ab.

## Kostenentscheidung (unverändert)
- 0 €: keine Domain, kein Tarif gekauft. `aze-mail.de` bleibt Wunschdomain. Polpo Mail bleibt zurückgestellt.
- Hosting-Empfehlung ohne Kosten: Oracle Cloud Always Free (Frankfurt) + Tailscale. Alternativ Raspberry Pi oder PC.

## Als Nächstes
1. Server einrichten (`INSTALLATION.md`) und GMX-Konto verbinden – erster Echttest.
2. Alias-Adressen bei GMX anlegen und in AZE Mail eintragen.
3. Optional: Weiterleiten/Entwürfe, mehrere Mailkonten, Android-App-Hülle.

## Änderungsprotokoll
- **23.11.2026:** Erstes Frontend mit Startseite und Konzeptbereichen angelegt.
- **23.11.2026:** Mail-Adressverwaltung als lokale Vormerkfunktion, Shop-Favoriten, Browser-URL-Öffnung und Verbindungswahl im Frontend ergänzt.
- **23.11.2026:** Keine echte Mailserver- oder Proxy-Funktion behauptet; Backend-Aufgaben dokumentiert.
- **24.11.2026:** Gemeinsamer Posteingang plus Filter je Empfängeradresse als verbindliches Bedienmodell festgelegt; entsprechende Oberfläche vorbereitet und Projektbeschreibung aktualisiert.
- **24.11.2026:** Polpo Mail als mögliche spätere Option dokumentiert; Gratis-Tarifgrenzen, Domainpflicht und Nutzungsbedingungen geprüft.
- **24.11.2026:** Kostenentscheidung präzisiert: AZE Mail startet mit Zielbudget 0 €; eine Anbieter-Domain ist ausdrücklich akzeptiert. Kostenlose Anbieter-Konten und ihre Integrationsmöglichkeiten werden zuerst geprüft.


- **24.11.2026:** Bereich „Einmal-SMS“ als reine externe Linkliste mit Quackr, SMS-Virtual und NumberOTP ergänzt. Keine SMS-API, keine eigene Nummer, keine SMS-Speicherung und keine Zahlung über AZE Mail. Reihenfolge und Einschränkungen sind im Frontend erklärt; Verfügbarkeit, Preise und Zustellzeiten sind nicht garantiert.

- **24.11.2026:** README und Projektstatus vereinheitlicht: Polpo Mail zurückgestellt, 0-Euro-Start bestätigt, Anbieterentscheidung offen; erste technische Anbieterprüfung dokumentiert.
- **24.11.2026:** Widersprüchliche Anbieterangaben bereinigt: Polpo Mail ist zurückgestellt, `aze-mail.de` nur Wunschdomain; GMX/IMAP-SMTP als erster technischer Testkandidat, Tuta und Proton Free wegen fehlender passender Drittanbieter-Anbindung vorerst nicht geeignet.
- **24.11.2026:** Version 1.0: AZE-Server ohne Zusatzpakete (IMAP/SMTP-Client, MIME, Login/PIN mit verschlüsselter Schlüsselablage, Proxy „Deutscher Server“), Oberfläche um echten Mailbetrieb erweitert (Demo-Modus bleibt), Tests, `INSTALLATION.md`, systemd-Dienst.
