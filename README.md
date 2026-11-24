# AZE Mail

> **Status:** Konzeptentwurf mit ersten festgelegten Entscheidungen – noch keine produktive Implementierung.

## Ursprungsgedanke

AZE Mail soll eine eigene, moderne und möglichst datensparsame Anwendung werden. Darin sollen mehrere Wunsch-E-Mail-Adressen verwaltet und E-Mails direkt in der Anwendung empfangen, gelesen, beantwortet und – abhängig vom Anbieter – versendet werden können.

Zusätzlich ist ein integrierter Browser geplant. Als weiterer Vorschlag kam ein Shopping-Bereich mit Schnellzugriff auf bevorzugte Shops hinzu. Die Anwendung soll zuerst als mobilefreundliche HTML-Webanwendung entstehen und später möglichst auch als Android-App nutzbar sein.

**Wichtig:** Dieses Dokument hält unsere bisherigen Ideen fest. Es ist ausdrücklich ein Entwurf. Der Nutzer kann jeden Punkt ändern, ergänzen, anders priorisieren oder streichen. Erst nach gemeinsamer Durchsicht werden Anforderungen verbindlich.

## 1. Vorgeschlagene Hauptbereiche

### Mail
- **Festgelegtes Bedienmodell:** ein gemeinsamer Posteingang für alle Adressen plus Filteransicht für jede einzelne Empfängeradresse.
- Jede eingehende Nachricht muss der Empfängeradresse zugeordnet werden, an die sie gesendet wurde.
- Beim Antworten soll standardmäßig die passende Empfängeradresse als Absender vorausgewählt werden.
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

`aze-mail.de` ist als Domain für AZE Mail festgelegt. Die Registrierung und DNS-Konfiguration stehen noch aus. Unser Kostenprinzip lautet: zunächst 0 € laufende Kosten und keine unnötigen Ausgaben. Vor einer Registrierung prüfen wir Verfügbarkeit, Preis und Verlängerungskosten der Domain sowie die technischen Voraussetzungen.

Der ausgewählte Maildienst ist Polpo Mail im kostenlosen Tarif. Die konkrete Einrichtung und ein Funktionstest stehen noch aus. Wir prüfen dabei insbesondere Domain-Verknüpfung, Empfang, Versand, API-Anbindung und die sichere Zuordnung jeder Nachricht zur Empfängeradresse.

Ein eigener Mailserver ist nicht vorgesehen, solange Polpo Mail die Anforderungen erfüllt.

## 3.1 Ausgewählter E-Mail-Anbieter: Polpo Mail (kostenloser Einstieg)

**Entscheidung:** Wir verwenden Polpo Mail zunächst im kostenlosen Tarif. Als eigene AZE-Mail-Domain ist `aze-mail.de` festgelegt. Die Domain muss noch auf Verfügbarkeit und Kosten geprüft und anschließend registriert sowie mit Polpo Mail verbunden werden. Die Anbieterwahl wird nicht erneut geöffnet, solange bei der Prüfung kein konkretes Ausschlusskriterium auftritt.

Laut aktueller offizieller Tarifbeschreibung umfasst der kostenlose Tarif:
- Bis zu 10 Postfächer pro Domain, standardmäßig je 1 GB.
- Bis zu 5 Aliasse pro Domain sowie eine Catch-all-Adresse.
- Webmail, IMAP und SMTP mit TLS.
- REST API und persönliche Zugriffstokens.
- Webhooks für neue Nachrichten.
- Laut Anbieter Verarbeitung und Speicherung der E-Mail-Daten in Deutschland (EU).

Wichtige Einschränkungen:
- Eine eigene Domain ist Voraussetzung und muss separat registriert werden.
- Die 5-Alias-Grenze ist für unser Modell mit vielen frei wählbaren Absenderadressen zu berücksichtigen. Catch-all-Empfang bedeutet nicht automatisch, dass beliebige Adressen auch als Absender verwendet werden können.
- Der kostenlose Dienst hat laut Nutzungsbedingungen keine zugesicherte Verfügbarkeit, keinen SLA und keine zugesicherte Datensicherung oder Wiederherstellung. Wichtige Nachrichten müssen unabhängig exportiert/gesichert werden.
- API-Zugriffstokens sind Geheimnisse. Sie gehören ausschließlich in ein sicheres Backend, niemals in index.html, Browser-JavaScript oder ein öffentliches GitHub-Repository.

Offizielle Informationen:
- Preise und Leistungsumfang: https://polpomail.com/pricing
- API-Dokumentation: https://polpomail.com/developers
- Nutzungsbedingungen: https://polpomail.com/terms

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

## 3.2 Festgelegte Domain

Die gewünschte Domain für AZE Mail lautet **`aze-mail.de`**. Sie ist beschlossen, aber noch nicht als registriert oder technisch eingerichtet zu behandeln. Vor dem Kauf prüfen wir die tatsächliche Verfügbarkeit und die Kosten. Danach folgen Registrierung, DNS-Einträge und die Verbindung mit Polpo Mail.

## 10. Noch offene Fragen
- Ist `aze-mail.de` zum gewünschten Preis verfügbar und welche Verlängerungskosten entstehen?
- Sind die genannten Polpo-Mail-Funktionen und Tarifbedingungen zum Zeitpunkt der Einrichtung weiterhin gültig?
- Ist die private Nutzung nach den aktuellen Polpo-Nutzungsbedingungen zulässig?
- Wie werden Domain, DNS und Polpo Mail korrekt miteinander verbunden?
- Wie werden Empfang, Versand, API und die Zuordnung der Empfängeradressen technisch getestet?
- Wie sichern und exportieren wir wichtige Nachrichten unabhängig vom kostenlosen Dienst?
- Welcher Hosting-Anbieter wird verwendet?
- Wie wird der deutsche Browser-Proxy technisch umgesetzt?
- Wie genau soll der direkte Verbindungsweg aussehen?
- Welche Browserfunktionen und Tab-Verwaltung sind nötig?
- Welche Login- und PIN-Regeln sollen gelten?
- Welche Daten werden wie lange gespeichert?
- Soll Shopping ein eigener Hauptbereich oder nur eine Browser-Startseite mit Favoriten sein?

---
**Leitlinie:** Der ursprüngliche Zweck von AZE Mail soll bei jeder Änderung erhalten bleiben: mehrere verwaltbare E-Mail-Adressen, direkt lesbare E-Mails, ein integrierter Browser, zwei bewusst auswählbare Verbindungswege und möglichst wenig unnötige Datenerfassung.


## 11. Verbindliche Projektentscheidungen und Arbeitsregel

- **E-Mail-Anbieter:** Polpo Mail, kostenloser Tarif als festgelegte Ausgangsbasis.
- **Tarifumfang laut bisheriger Prüfung:** bis zu 10 Postfächer mit jeweils 1 GB, bis zu 5 Aliase, Catch-all, API, IMAP und SMTP. Vor der Einrichtung werden Umfang und Bedingungen nochmals anhand der offiziellen Anbieterinformationen geprüft; diese Angaben sind keine Garantie für unveränderte künftige Tarife.
- **Domain:** `aze-mail.de` ist als AZE-Mail-Domain festgelegt. Verfügbarkeit, Registrierung und technische Einrichtung sind noch offen.
- **Kosten:** Ziel ist zunächst ein Betrieb ohne laufende Kosten. Kosten für die Domain dürfen erst nach Prüfung der Verfügbarkeit und des Preises entstehen.
- **Posteingang:** gemeinsamer Posteingang für alle Adressen plus Filter pro Adresse. Jede Nachricht muss ihrer tatsächlichen Empfängeradresse zugeordnet bleiben.
- **Weiterentwicklung:** Bestehende Dateien, Funktionen, Entscheidungen und der bisherige Entwicklungsstand werden fortgeführt. Keine Neuerstellung von Grund auf und kein Überschreiben funktionierender Bereiche ohne sachlichen Grund.
- **Dokumentation:** Diese `README.md` ist die zentrale Beschreibung des vollständigen Projektziels und der getroffenen Grundsatzentscheidungen. Größere Änderungen und der jeweilige Umsetzungsstand werden zusätzlich in `PROJECT_STATUS.md` dokumentiert.

**Wichtig für jeden weiteren Arbeitsschritt:** Vor Änderungen am Code zuerst den aktuellen Repository-Stand prüfen. Danach gezielt ergänzen, testen und committen. Bereits vereinbarte Ziele und Entscheidungen bleiben bestehen, sofern der Nutzer sie nicht ausdrücklich ändert.
