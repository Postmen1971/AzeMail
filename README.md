# AZE Mail

> **Status:** Konzeptentwurf – noch keine endgültigen Entscheidungen, noch keine produktive Implementierung.

## Ursprungsgedanke

AZE Mail soll eine eigene, moderne und möglichst datensparsame Anwendung werden. Darin sollen mehrere Wunsch-E-Mail-Adressen verwaltet und E-Mails direkt in der Anwendung empfangen, gelesen, beantwortet und – abhängig vom Anbieter – versendet werden können.

Zusätzlich ist ein integrierter Browser geplant. Als weiterer Vorschlag kam ein Shopping-Bereich mit Schnellzugriff auf bevorzugte Shops hinzu. Die Anwendung soll zuerst als mobilefreundliche HTML-Webanwendung entstehen und später möglichst auch als Android-App nutzbar sein.

**Wichtig:** Dieses Dokument hält unsere bisherigen Ideen fest. Es ist ausdrücklich ein Entwurf. Der Nutzer kann jeden Punkt ändern, ergänzen, anders priorisieren oder streichen. Erst nach gemeinsamer Durchsicht werden Anforderungen verbindlich.

## 1. Vorgeschlagene Hauptbereiche

### Mail
- E-Mails direkt in AZE Mail lesen und empfangen.
- Nachrichten beantworten und neue E-Mails schreiben.
- Ordner bzw. Ansichten: Posteingang, Gesendet und Papierkorb.
- Mehrere Wunschadressen zentral verwalten.
- Nachrichten der jeweiligen Adresse eindeutig zuordnen.
- Adressen aktivieren, pausieren und reaktivieren.
- Endgültiges Löschen erst nach ausdrücklicher Bestätigung.
- Gemeinsame Domain-Endung, als Beispiel `@aze-mail.de`.
- Eine Adresse soll nicht sofort endgültig verschwinden, wenn sie pausiert wird, damit wichtige spätere Nachrichten – etwa Passwort- oder Bestätigungsmails – weiterhin erreichbar bleiben können.

**Noch zu klären:** Alias oder echtes Postfach? Die Anzahl möglicher Adressen und Postfächer hängt vom E-Mail-Anbieter und Tarif ab. Unbegrenzte oder kostenlose Postfächer dürfen wir erst versprechen, wenn ein konkreter Anbieter das nachweislich ermöglicht.

### Browser
- Webseiten innerhalb von AZE Mail öffnen.
- Mehrere Tabs, Zurück/Vorwärts, Neu laden und Adresszeile prüfen.
- Beispiele für die Nutzung: markt.de, eBay, Amazon und andere Webseiten.
- Möglichst datensparsame Browserumgebung.
- Wenn eine Webseite in einer eingebetteten Ansicht nicht funktioniert, soll eine vollwertige externe Browseransicht als Ausweichmöglichkeit vorgesehen werden.

### Shopping
- Eigener Bereich mit Kacheln für bevorzugte Online-Shops.
- Shops direkt aus AZE Mail öffnen und dort normal suchen und einkaufen.
- Beispiele: Amazon, eBay und markt.de.
- Zahlungsdaten sollen nicht durch AZE Mail gespeichert werden.
- Bestell- und Zahlungsfunktionen hängen von der jeweiligen Shop-Seite und der verwendeten Browseransicht ab.

### Verwaltung
- E-Mail-Adressen verwalten.
- Adressen pausieren, reaktivieren und nach Bestätigung endgültig löschen.
- Verbindungsauswahl und Verbindungstest.
- Sitzungen und lokale Browserdaten verwalten.
- Datenschutz- und Sicherheitseinstellungen.

## 2. Die zwei gewünschten Verbindungswege

Das ist ein zentraler Teil des Ursprungsgedankens. Für den Browser sollen zwei Wege zur Verfügung stehen:

### Weg 1 – über einen deutschen Server
- Ein Server in Deutschland soll als Ausgang für den Browserverkehr dienen.
- Wenn der Browserverkehr tatsächlich über diesen Server geleitet wird, sieht eine besuchte Webseite normalerweise die öffentliche IP-Adresse dieses Servers.
- Der Server muss dafür als Proxy bzw. Browser-Ausgang eingerichtet werden.
- Nur die HTML-Seite in Deutschland zu hosten reicht nicht aus.

### Weg 2 – direkte Verbindung
- Der Browser nutzt die normale Internetverbindung des verwendeten Geräts.
- Auf dem iPhone wird dafür nicht der gesamte übrige Internetverkehr umgestellt.
- Dieser Weg ist die Alternative, wenn der Serverweg nicht funktioniert oder nicht genutzt werden soll.

### Umschalter
Geplant ist:
- Sichtbarer Schalter „Deutscher Server“ / „Direktverbindung“.
- Anzeige des aktiven Verbindungswegs.
- Schaltfläche „Verbindung testen“.
- Verständliche Meldung, wenn ein Weg nicht erreichbar ist.

**Grenzen:** Eine deutsche IP garantiert weder Zugang noch eine erfolgreiche Registrierung auf einer fremden Webseite. Webseiten können zusätzliche Prüfungen durchführen. Die Verbindungswahl darf nicht dazu dienen, Sperren oder Sicherheitsmaßnahmen fremder Plattformen zu umgehen. Bei einer Kontosperre ist der reguläre Kontakt zum Plattformbetreiber der richtige Weg.

## 3. Domain und E-Mail-Dienst

Als Beispiel für die gewünschte Endung wurde `@aze-mail.de` besprochen. Ob die Domain verfügbar ist und was sie kostet, muss geprüft werden.

Zu vergleichen sind:
- Domainpreis und jährliche Verlängerung.
- Anzahl echter Postfächer und Alias-Adressen.
- Empfang und Versand.
- Speicherplatz und Größenlimits.
- IMAP/SMTP oder API-Unterstützung.
- Serverstandort, Datenschutz und Auftragsverarbeitung.
- Export- und Sicherungsmöglichkeiten.
- Ob pausierte Adressen weiter Nachrichten empfangen können.

Ein eigener Mailserver ist nicht automatisch die beste Lösung. Wir wählen später die möglichst einfache, sichere und bezahlbare Variante.

## 4. Datenschutz – wichtige Leitlinie

AZE Mail soll so wenig Daten wie praktisch möglich erfassen.

Gewünschte Punkte:
- Keine AZE-eigenen Werbe- oder Analyse-Tracker.
- Keine unnötigen Cookies.
- Keine unnötige Erhebung oder Speicherung von Gerätekennungen.
- Keine unnötige Übermittlung von Geräte- oder Nutzungsdaten an AZE-eigene Systeme.
- HTTPS/TLS für Verbindungen.
- Passwörter niemals im Klartext speichern.
- Sitzungen absichern und kontrollierbar machen.
- Möglichst geringe Protokollierung und nachvollziehbare Löschfristen.

**Technische Realität:** Eine sichere Anmeldung benötigt unter Umständen notwendige Sitzungsdaten oder ein notwendiges Cookie. Ziel ist nicht, jede notwendige technische Speicherung zu verbieten, sondern Tracking und unnötige Datenerhebung zu vermeiden. Eine normale HTML-Webseite kann außerdem nicht garantieren, dass fremde Webseiten keine IP-Adresse, Cookies oder Browsermerkmale erfassen. Vollständiger Schutz vor Browser-Fingerprinting ist damit nicht versprechbar.

## 5. Anmeldung
- Regulärer Login mit Benutzername bzw. E-Mail und Passwort.
- Zusätzlich eine PIN für schnellen Zugriff auf einem bereits eingerichteten Gerät.
- Die PIN soll das Hauptpasswort nicht ersetzen.
- PIN-Schutz, Begrenzung von Fehlversuchen und sichere lokale Speicherung müssen technisch geprüft werden.

## 6. Design und Bedienung
- Eigenständiger AZE-Projekt-Look, passend zu den bisherigen AZE-Projekten.
- Dunkles, modernes Erscheinungsbild.
- Farbverläufe und weich abgerundete Elemente.
- Übersichtliche Navigation.
- Gute Bedienung auf iPhone/Safari und Amazon Fire Max 11.
- Einfach und verständlich statt überladen.

## 7. Plattform und technische Architektur
Vorgesehene Richtung:
1. Zuerst mobilefreundliche HTML/CSS/JavaScript-Webanwendung.
2. Backend für Login, Adressverwaltung und sichere Mail-Anbindung.
3. Datenbank nur für notwendige Konto-, Adress- und Einstellungsdaten.
4. E-Mail-Anbieter für Empfang und Versand.
5. Separater Proxy-/Browserdienst für den deutschen Serverweg.
6. Später Android-App oder geeignete App-Hülle prüfen.

Die konkreten Technologien und Anbieter sind noch offen. Passwörter, API-Schlüssel, private Schlüssel und andere Geheimnisse dürfen niemals in ein öffentliches GitHub-Repository eingecheckt werden.

## 8. Sicherheit beim Einkaufen
- Shops sollen möglichst über HTTPS geöffnet werden.
- AZE Mail speichert keine Zahlungsdaten.
- Die eigentliche Zahlungsabwicklung erfolgt beim Shop bzw. Zahlungsdienst.
- Bei Problemen in einer eingebetteten Browseransicht soll ein externer, vollwertiger Browser als Alternative dienen.
- Die Sicherheit hängt auch vom Shop, Zahlungsanbieter und Gerät ab; AZE Mail kann keine absolute Sicherheit garantieren.

## 9. Entwicklung und Dokumentation
- Erst Anforderungen vollständig besprechen, dann das endgültige Layout festlegen.
- Nicht mehrfach voreilig komplette Layouts bauen.
- Änderungen schrittweise umsetzen und testen.
- Funktionierende Bereiche nicht ohne Grund überschreiben.
- Git-Commits als nachvollziehbare Zwischenstände verwenden.
- `README.md` als dauerhafte Beschreibung des Ursprungsgedankens pflegen.
- `PROJECT_STATUS.md` nach größeren Änderungen aktualisieren.
- Keine Zugangsdaten oder echten persönlichen E-Mail-Inhalte in GitHub speichern.

## 10. Noch offene Fragen
- Ist `aze-mail.de` verfügbar und bezahlbar?
- Welcher E-Mail-Anbieter erfüllt die Anforderungen?
- Wie viele echte Postfächer bzw. Aliase werden benötigt?
- Welcher Hosting-Anbieter wird verwendet?
- Wie wird der deutsche Browser-Proxy technisch umgesetzt?
- Wie genau soll der direkte Verbindungsweg aussehen?
- Welche Browserfunktionen und Tab-Verwaltung sind nötig?
- Welche Login- und PIN-Regeln sollen gelten?
- Welche Daten werden wie lange gespeichert?
- Soll Shopping ein eigener Hauptbereich oder nur eine Browser-Startseite mit Favoriten sein?

---
**Leitlinie:** Der ursprüngliche Zweck von AZE Mail soll bei jeder Änderung erhalten bleiben: mehrere verwaltbare E-Mail-Adressen, direkt lesbare E-Mails, ein integrierter Browser, zwei bewusst auswählbare Verbindungswege und möglichst wenig unnötige Datenerfassung.
