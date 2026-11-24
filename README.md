# AZE Mail

> **Status:** Version 1.0 – echter Mailbetrieb (IMAP/SMTP, GMX als erster Anbieter), Login mit Passwort + Geräte-PIN und Browser-Weg „Deutscher Server“ sind umgesetzt. Ohne laufenden AZE-Server (z. B. auf GitHub Pages) zeigt die Seite weiterhin die Demo. **Start: siehe [`INSTALLATION.md`](INSTALLATION.md).**

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

Das verbindliche Kostenprinzip lautet zunächst **0 €**. Eine eigene Domain ist derzeit nicht zu kaufen oder einzurichten. `aze-mail.de` bleibt eine Wunschdomain für später, ist aber weder registriert noch technisch verbunden.

**Polpo Mail ist vorerst nicht ausgewählt und wird nicht eingerichtet.** Ausschlaggebend sind die notwendige eigene Domain, die noch zu klärenden Nutzungsbedingungen für private Nutzung und das Ziel, ohne laufende Kosten zu starten. Die früher notierten Angaben zum kostenlosen Polpo-Tarif sind keine verbindliche Projektentscheidung.

Zuerst prüfen wir kostenlose Anbieter-Konten mit Anbieter-Endung und deren Möglichkeiten zur technischen Anbindung. Wichtig ist dabei: Eine Webmail-Seite allein reicht für die Integration in AZE Mail nicht aus. Wir brauchen einen unterstützten und sicheren Zugriff auf Empfang und Versand (z. B. IMAP/SMTP oder eine dokumentierte API) sowie eine zulässige Authentifizierung.

### 3.1 Vorläufige Anbieterprüfung

- **GMX FreeMail:** möglicher technischer Testkandidat, weil GMX IMAP und SMTP dokumentiert anbietet. IMAP/POP muss im Konto eingeschaltet werden; Zugangsdaten dürfen nicht im Frontend gespeichert werden. Ob ein automatisierter AZE-Mail-Backendzugriff dauerhaft und nach den aktuellen Bedingungen zulässig ist, prüfen wir vor einer Umsetzung.
- **Tuta Free:** bietet einen kostenlosen Einstieg, unterstützt aber ausdrücklich kein IMAP/POP3/SMTP und keine Drittanbieter-Mailclients. Daher ist es für die geplante direkte Integration derzeit ungeeignet.
- **Proton Mail Free:** Proton Bridge ist laut Anbieter nur mit einem kostenpflichtigen Tarif verfügbar und läuft auf Desktop-Systemen, nicht auf Mobilgeräten. Daher ist es für unseren kostenlosen, serverseitigen Integrationsweg kein passender Startkandidat.
- **Gmail/Outlook:** bleiben mögliche spätere Prüfoptionen. Eine Integration müsste über die offiziellen APIs und OAuth erfolgen; Passwörter oder Tokens gehören niemals in die HTML-Datei.

**Noch keine Anbieterentscheidung:** Wir wählen erst nach einem praktischen Test und einer Prüfung der aktuellen Nutzungsbedingungen. Der erste technische Machbarkeitstest soll mit einem kostenlosen Konto erfolgen, ohne dass AZE Mail das Passwort oder andere Geheimnisse im Browser speichert.

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

## 3.2 Wunschdomain

Die gewünschte Domain für AZE Mail lautet **`aze-mail.de`**. Sie ist nur als spätere Option vorgemerkt. Sie ist nicht als registriert oder technisch eingerichtet zu behandeln. Ein Kauf erfolgt nur nach vorheriger Prüfung von Verfügbarkeit, Preis und Verlängerungskosten sowie ausdrücklicher Zustimmung.

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

- **Kosten:** AZE Mail startet mit dem Zielbudget 0 €. Keine Domain und keinen Tarif kaufen oder buchen, solange der Nutzer nicht ausdrücklich zustimmt.
- **E-Mail-Anbieter:** Noch nicht endgültig ausgewählt. Polpo Mail ist vorerst zurückgestellt. Zuerst werden kostenlose Anbieter-Konten und ihre offiziellen Integrationsmöglichkeiten geprüft.
- **Domain:** `aze-mail.de` bleibt eine Wunschdomain für später; sie ist nicht registriert.
- **Posteingang:** gemeinsamer Posteingang für alle Adressen plus Filter pro Empfängeradresse. Jede Nachricht muss ihrer tatsächlichen Empfängeradresse zugeordnet bleiben.
- **Weiterentwicklung:** Bestehende Dateien, Funktionen, Entscheidungen und der bisherige Entwicklungsstand werden fortgeführt. Keine Neuerstellung von Grund auf und kein Überschreiben funktionierender Bereiche ohne sachlichen Grund.
- **Dokumentation:** Diese `README.md` beschreibt Projektziel und Grundsatzentscheidungen. Größere Änderungen und der Umsetzungsstand werden zusätzlich in `PROJECT_STATUS.md` dokumentiert.

**Arbeitsregel:** Vor Änderungen am Code zuerst den aktuellen Repository-Stand prüfen. Danach gezielt ergänzen, testen und committen. Bereits vereinbarte Ziele bleiben bestehen, sofern der Nutzer sie nicht ausdrücklich ändert.

## 12. Einmal-SMS für gelegentliche Registrierungen

Auf ausdrücklichen Wunsch ist im Frontend ein Bereich **„Einmal-SMS“** vorgesehen. Er enthält ausschließlich drei externe Anbieterlinks in dieser Reihenfolge:
1. **Quackr** – erste Wahl, weil PayPal laut bisheriger Prüfung angeboten wird; Nummern werden gemietet, Preis und Mindestdauer vor dem Kauf prüfen.
2. **SMS-Virtual** – mögliche Einmalnummer; deutscher Preis, Verfügbarkeit und PayPal-Zahlung vor dem Kauf prüfen.
3. **NumberOTP** – Kurzzeit-Aktivierung; PayPal ist nicht bestätigt, Zahlungsmethoden und deutscher Preis vorab prüfen.

AZE Mail integriert ausdrücklich **keinen eigenen SMS-Empfang**: keine eigene Nummer, keine SMS-API, keine SMS-Speicherung und keine kostenpflichtige Buchung durch AZE Mail. Die Links öffnen die Anbieter-Webseiten extern. Die Reihenfolge ist eine Orientierung, keine Garantie für Preis, Verfügbarkeit oder Zustellgeschwindigkeit. Kein Anbieter garantiert einen Registrierungscode innerhalb von zwei Minuten; Plattformen können virtuelle Nummern ablehnen. Nur für unkritische Registrierungen verwenden, nicht für Bank-, Zahlungs- oder wichtige Konten.

## 13. Umsetzung Version 1.0 (24.11.2026)

- **Architektur:** `index.html` (Oberfläche) + `server/` (Node.js, **ohne externe Pakete**). Der Server liefert die Oberfläche aus. Ohne Server bleibt die Seite eine Demo mit lokaler Vormerkung.
- **Mail:** ein Mailkonto (Start: GMX FreeMail per IMAP/SMTP) plus beliebig viele eigene Adressen (Aliase des Kontos). Ein gemeinsamer Posteingang mit Filter je Empfängeradresse. Zugeordnet wird über die Kopfzeilen Delivered-To, X-Original-To, To und Cc. Was zu keiner eingetragenen Adresse passt, gehört zur Hauptadresse. Ordner: Posteingang, Gesendet, Papierkorb. Lesen, Antworten (Absender = Empfängeradresse der Nachricht), Allen antworten, neue Mail mit Anhängen, Löschen in den Papierkorb, Wiederherstellen, endgültiges Löschen nur nach Bestätigung, Suche.
- **Alias oder Postfach:** entschieden für **Alias-Adressen eines Kontos**. Sie werden beim Anbieter angelegt und in AZE Mail eingetragen. Pausierte Adressen empfangen weiter und bleiben sichtbar, werden aber nicht als Absender angeboten.
- **Anmeldung:** Ersteinrichtung mit Einrichtungscode aus dem Server-Fenster. Danach Benutzername + Passwort (mind. 10 Zeichen). PIN (4–8 Ziffern) pro Gerät als Schnellzugang, nach 5 Fehlversuchen gelöscht. Geräteverwaltung, Passwort ändern, Abmelden bzw. überall abmelden.
- **Datenschutz:** keine Speicherung von Mail-Inhalten auf dem AZE-Server. Mail-Passwort nur verschlüsselt (Schlüssel entsteht erst beim Login). Externe Bilder blockiert, bis man sie freigibt. Nur ein notwendiges Sitzungs-Cookie.
- **Browser „Deutscher Server“:** Seiten werden über den AZE-Server geladen. Eine besuchte Seite sieht dessen IP. Bewusst als vereinfachte Ansicht **ohne Skripte, Cookies und Logins** (Sicherheit). Für Einkäufe und Logins weiterhin „Extern öffnen“. „Verbindung testen“ zeigt die IP beider Wege.
- **Hosting (0 €):** empfohlen Oracle Cloud Always Free, Region Frankfurt, erreichbar nur über Tailscale (HTTPS, nicht öffentlich). Alternativ Raspberry Pi oder PC.
