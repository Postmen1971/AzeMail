# AZE Mail – Projektstatus

**Stand:** 23.11.2026  
**Repository:** `Postmen1971/AzeMail`  
**Phase:** Konzept und gemeinsame Anforderungsaufnahme  
**Implementierung:** Noch nicht begonnen

## Aktueller Stand
Das Repository wurde angelegt. Die bisherigen Ideen werden zunächst als Entwurf dokumentiert. Es ist noch nichts endgültig festgelegt.

## Bisher besprochene Ziele
- Eigene AZE-Anwendung, zuerst als mobilefreundliche HTML-Webseite.
- Später Android-App prüfen.
- Mail-Bereich mit echten empfangbaren und lesbaren E-Mails.
- Mehrere Wunschadressen mit gemeinsamer Domain-Endung, Beispiel `@aze-mail.de`.
- Adressen pausieren und reaktivieren; endgültiges Löschen nur nach Bestätigung.
- Integrierter Browser zum Öffnen anderer Webseiten.
- Zwei Browserwege: deutscher Server/Proxy und direkte Geräteverbindung.
- Umschalter, Statusanzeige und Verbindungstest.
- Shopping-Kacheln für bevorzugte Shops als zusätzlicher Vorschlag.
- Datenschutz: keine AZE-eigenen Tracker und keine unnötige Erhebung von Gerätekennungen.
- Login mit Passwort plus PIN für schnellen Zugriff.
- Dunkles, modernes AZE-Design mit Farbverläufen und runden Elementen.
- Gute Bedienbarkeit auf iPhone/Safari und Fire Max 11.
- README und Statusdatei als fortlaufende Projektdokumentation.

## Wichtige technische Grenzen
- Eine deutsche Server-IP entsteht nur, wenn der Browserverkehr tatsächlich über einen Server/Proxy in Deutschland geleitet wird. Deutsches Hosting der HTML-Datei allein genügt nicht.
- Eine deutsche IP garantiert keinen Zugang zu fremden Webseiten und verhindert keine Sperren.
- Eine normale HTML-Seite kann nicht alle fremden Webseitenverbindungen automatisch durch einen Server leiten.
- Fremde Webseiten können eigene Cookies, IP-Adressen und Browsermerkmale verarbeiten.
- Notwendige Sitzungsdaten können für sichere Anmeldung erforderlich sein.
- Anzahl und Kosten der E-Mail-Adressen hängen vom Anbieter und Tarif ab.
- Keine Umgehung fremder Plattform-Sperren; bei Kontosperren regulären Supportweg nutzen.

## Noch nicht erledigt
- Domainverfügbarkeit und Kosten prüfen.
- E-Mail-Anbieter vergleichen.
- Anzahl echter Postfächer und Aliase festlegen.
- Server/Hosting und Backend-Architektur auswählen.
- Proxy-/Browserlösung für den deutschen Verbindungsweg planen.
- Datenschutz- und Sicherheitskonzept konkretisieren.
- Navigation, Layout und Funktionsumfang gemeinsam finalisieren.
- Erst danach implementieren und testen.

## Nächste Schritte
1. Nutzer prüft den Konzeptentwurf und gibt Feedback.
2. Anforderungen ergänzen, ändern oder streichen.
3. Domain und E-Mail-Anbieter vergleichen.
4. Technische Architektur festlegen.
5. Erst danach Layout und Programmierung beginnen.

## Änderungsprotokoll
- **23.11.2026:** Repository `AzeMail` bestätigt; erster Konzeptstand und Statusdokumentation werden angelegt.
- **23.11.2026:** Noch keine produktive Implementierung.
