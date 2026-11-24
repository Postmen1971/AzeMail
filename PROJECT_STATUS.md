# AZE Mail – Projektstatus

**Stand:** 24.11.2026  
**Repository:** `Postmen1971/AzeMail`  
**Phase:** Funktions-Prototyp / weitere Backend-Planung

## Aktueller Stand
Die erste funktionsfähige Frontend-Prototypversion ist in `index.html` gespeichert. Die GitHub-Pages-Veröffentlichung muss im Repository aktiviert sein, damit die Seite öffentlich über Safari erreichbar ist.

## Im Frontend-Prototyp vorhanden
- Mail-Bereich mit vorbereitetem gemeinsamen Posteingang und Auswahlfilter „Alle Adressen“ bzw. einzelne Empfängeradresse (derzeit nur Oberfläche, noch keine echten Nachrichten).
- Startseite und Navigation: Start, Mail, Browser, Shopping, Verwaltung.
- Wunschadressen lokal vormerken, pausieren, reaktivieren und löschen.
- Shop-Favoriten hinzufügen und über externe Browseransicht öffnen.
- Browser-URL eingeben; Einbettung versuchen und externe Öffnung als Ausweichweg anbieten.
- Auswahl zwischen „Deutscher Server“ und „Direktverbindung“ als UI-Einstellung.
- Datenschutz-Hinweise und Funktion zum Löschen der lokalen Prototypdaten.
- Speicherung der Prototyp-Einstellungen in localStorage; keine eigenen Cookies und keine Geräte-ID-Abfrage.

## Wichtige Einschränkungen
- Die eingetragenen Mailadressen sind nur lokal vorgemerkt. Es werden dadurch keine echten Postfächer angelegt.
- Es gibt noch keinen echten Posteingang, Mailversand, Login oder sichere PIN-Anmeldung.
- Die Browser-Auswahl ändert noch nicht die IP-Adresse. Dafür ist ein echter Proxy-/Browserdienst erforderlich.
- Eingebettete Webseiten können das Laden in einem iframe blockieren. Die externe Öffnung ist dafür vorgesehen.
- Shop- und Browserlinks werden zu externen Webseiten geöffnet. Deren eigene Datenverarbeitung liegt außerhalb der Kontrolle der Frontend-Seite.
- localStorage ist keine Cookie-Datei, speichert aber Daten dauerhaft im Browserprofil des Geräts. Löschen der Website-Daten kann sie entfernen.

## Ausgewählter E-Mail-Anbieter
- Polpo Mail ist nur noch eine mögliche spätere Option, nicht endgültig ausgewählt. Der Dienst verlangt eine eigene Domain und richtet sich laut Nutzungsbedingungen an Unternehmen/Organisationen.
- Laut aktuellem Gratis-Tarif: bis zu 10 Postfächer mit je 1 GB, 5 Aliasse und Catch-all pro Domain; API, IMAP und SMTP.
- Eigene Domain ist Voraussetzung; daher passt Polpo nicht zum aktuellen 0-Euro-Start ohne Domainkauf. Keine Registrierung, bevor die Zulässigkeit der privaten Nutzung geklärt ist.
- Vor produktiver Nutzung: Registrierung und Domain-Verifizierung, API-Test, Empfangs-/Versandtest, Export-/Backupkonzept und Datenschutzprüfung.
- Keine API-Tokens oder Zugangsdaten im Frontend oder öffentlichen Repository speichern.

## Festgelegte Mail-Bedienung
- Ein gemeinsamer Posteingang für alle E-Mail-Adressen.
- Zusätzlich Filter, um Nachrichten einer einzelnen Empfängeradresse anzuzeigen.
- Nachrichten werden intern mit ihrer Empfängeradresse verknüpft; beim Antworten soll diese Adresse als Absender vorausgewählt werden.

## Kostenentscheidung
- Verbindliches Arbeitsziel: zunächst 0 € Kosten; keine Domain und keinen Tarif kaufen.
- `aze-mail.de` bleibt eine Wunschdomain, wird aber vorerst nicht registriert.
- Polpo Mail wird wegen der Domainpflicht und der auf Unternehmen/Organisationen ausgerichteten Nutzungsbedingungen zunächst nicht eingerichtet.
- Eine Anbieter-Domain ist ausdrücklich akzeptiert; zuerst kostenlose Konten mit Anbieter-Endung und deren API/IMAP/SMTP-Möglichkeiten prüfen.

## Als Nächstes
1. Nutzer testet die neue Mail-Oberfläche auf iPhone/Safari.
2. Kostenlose Anbieter-Domains (z. B. @ik.me, @proton.me, @tuta.com) und technische Integrationsmöglichkeiten vergleichen.
3. Backend und Datenmodell für Konten, Adressen, Nachrichten und Zuordnung planen.
4. Echte Mail-Anbindung und sichere Anmeldung umsetzen.
5. Deutschen Proxy-/Browserweg technisch aufsetzen und testen.
6. Vor produktiver Nutzung Sicherheits- und Datenschutzprüfung.

## Änderungsprotokoll
- **23.11.2026:** Erstes Frontend mit Startseite und Konzeptbereichen angelegt.
- **23.11.2026:** Mail-Adressverwaltung als lokale Vormerkfunktion, Shop-Favoriten, Browser-URL-Öffnung und Verbindungswahl im Frontend ergänzt.
- **23.11.2026:** Keine echte Mailserver- oder Proxy-Funktion behauptet; Backend-Aufgaben dokumentiert.
- **24.11.2026:** Gemeinsamer Posteingang plus Filter je Empfängeradresse als verbindliches Bedienmodell festgelegt; entsprechende Oberfläche vorbereitet und Projektbeschreibung aktualisiert.
- **24.11.2026:** Polpo Mail als mögliche spätere Option dokumentiert; Gratis-Tarifgrenzen, Domainpflicht und Nutzungsbedingungen geprüft.
- **24.11.2026:** Kostenentscheidung präzisiert: AZE Mail startet mit Zielbudget 0 €; eine Anbieter-Domain ist ausdrücklich akzeptiert. Kostenlose Anbieter-Konten und ihre Integrationsmöglichkeiten werden zuerst geprüft.


- **24.11.2026:** Bereich „Einmal-SMS“ als reine externe Linkliste mit Quackr, SMS-Virtual und NumberOTP ergänzt. Keine SMS-API, keine eigene Nummer, keine SMS-Speicherung und keine Zahlung über AZE Mail. Reihenfolge und Einschränkungen sind im Frontend erklärt; Verfügbarkeit, Preise und Zustellzeiten sind nicht garantiert.

- **24.11.2026:** README und Projektstatus vereinheitlicht: Polpo Mail zurückgestellt, 0-Euro-Start bestätigt, Anbieterentscheidung offen; erste technische Anbieterprüfung dokumentiert.
