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

## E-Mail-Anbieter – noch nicht ausgewählt

- Polpo Mail ist vorerst zurückgestellt: eigene Domain erforderlich, private Nutzung und Kostenmodell müssen vor einer Einrichtung geprüft werden.
- Ziel bleibt zunächst 0 €; keine Domain kaufen und keinen Tarif buchen.
- GMX FreeMail ist ein möglicher technischer Testkandidat, da IMAP/SMTP offiziell dokumentiert sind. IMAP muss im Konto aktiviert werden.
- Tuta Free ist für eine direkte Drittanbieter-Integration ungeeignet, da Tuta IMAP/POP3/SMTP ausdrücklich nicht unterstützt.
- Proton Mail Bridge ist laut Anbieter kostenpflichtigen Tarifen vorbehalten und nicht für Mobilgeräte verfügbar.
- Vor der Auswahl prüfen wir zusätzlich API/OAuth, Nutzungsbedingungen, sichere Backend-Anbindung und Exportmöglichkeiten.
- Zugangsdaten und API-Tokens niemals in `index.html`, Browser-JavaScript oder ein öffentliches GitHub-Repository schreiben.

## Festgelegte Mail-Bedienung
- Ein gemeinsamer Posteingang für alle E-Mail-Adressen.
- Zusätzlich Filter, um Nachrichten einer einzelnen Empfängeradresse anzuzeigen.
- Nachrichten werden intern mit ihrer Empfängeradresse verknüpft; beim Antworten soll diese Adresse als Absender vorausgewählt werden.

## Kostenentscheidung

- Verbindliches Arbeitsziel: zunächst 0 €; keine Domain und keinen Tarif kaufen.
- `aze-mail.de` bleibt eine Wunschdomain, wird aber vorerst nicht registriert.
- Polpo Mail wird vorerst nicht eingerichtet.
- Eine Anbieter-Domain ist ausdrücklich akzeptiert; zuerst kostenlose Konten und deren offizielle API-/IMAP-/SMTP-Möglichkeiten prüfen.

## Als Nächstes

1. Kostenlose Anbieter technisch und nach Nutzungsbedingungen vergleichen; GMX ist erster IMAP/SMTP-Testkandidat.
2. Einen sicheren Backend-Prototyp planen, der Zugangsdaten niemals an den Browser ausliefert.
3. Datenmodell für Konten, Empfängeradressen, Nachrichten und Zuordnung festlegen.
4. Erst nach erfolgreichem Test echte Empfangs- und Versandfunktionen umsetzen.
5. Danach Login/PIN, Datenschutz- und Sicherheitstest planen.
6. Den deutschen Proxy-/Browserweg separat technisch spezifizieren; der aktuelle Umschalter ist nur eine UI-Auswahl.

## Änderungsprotokoll
- **23.11.2026:** Erstes Frontend mit Startseite und Konzeptbereichen angelegt.
- **23.11.2026:** Mail-Adressverwaltung als lokale Vormerkfunktion, Shop-Favoriten, Browser-URL-Öffnung und Verbindungswahl im Frontend ergänzt.
- **23.11.2026:** Keine echte Mailserver- oder Proxy-Funktion behauptet; Backend-Aufgaben dokumentiert.
- **24.11.2026:** Gemeinsamer Posteingang plus Filter je Empfängeradresse als verbindliches Bedienmodell festgelegt; entsprechende Oberfläche vorbereitet und Projektbeschreibung aktualisiert.
- **24.11.2026:** Polpo Mail als mögliche spätere Option dokumentiert; Gratis-Tarifgrenzen, Domainpflicht und Nutzungsbedingungen geprüft.
- **24.11.2026:** Kostenentscheidung präzisiert: AZE Mail startet mit Zielbudget 0 €; eine Anbieter-Domain ist ausdrücklich akzeptiert. Kostenlose Anbieter-Konten und ihre Integrationsmöglichkeiten werden zuerst geprüft.


- **24.11.2026:** Bereich „Einmal-SMS“ als reine externe Linkliste mit Quackr, SMS-Virtual und NumberOTP ergänzt. Keine SMS-API, keine eigene Nummer, keine SMS-Speicherung und keine Zahlung über AZE Mail. Reihenfolge und Einschränkungen sind im Frontend erklärt; Verfügbarkeit, Preise und Zustellzeiten sind nicht garantiert.

- **24.11.2026:** README und Projektstatus vereinheitlicht: Polpo Mail zurückgestellt, 0-Euro-Start bestätigt, Anbieterentscheidung offen; erste technische Anbieterprüfung dokumentiert.
