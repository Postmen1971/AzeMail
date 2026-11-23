# AZE Mail – Projektstatus

**Stand:** 23.11.2026  
**Repository:** `Postmen1971/AzeMail`  
**Phase:** Funktions-Prototyp / weitere Backend-Planung

## Aktueller Stand
Die erste funktionsfähige Frontend-Prototypversion ist in `index.html` gespeichert. Die GitHub-Pages-Veröffentlichung muss im Repository aktiviert sein, damit die Seite öffentlich über Safari erreichbar ist.

## Im Frontend-Prototyp vorhanden
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

## Als Nächstes
1. Nutzer testet die neue Oberfläche auf iPhone/Safari und meldet Fehler oder Änderungswünsche.
2. Domain und E-Mail-Anbieter vergleichen.
3. Backend und echte Mail-Anbindung planen.
4. Sichere Anmeldung und PIN mit Backend umsetzen.
5. Deutschen Proxy-/Browserweg technisch aufsetzen und testen.
6. Vor produktiver Nutzung Sicherheits- und Datenschutzprüfung.

## Änderungsprotokoll
- **23.11.2026:** Erstes Frontend mit Startseite und Konzeptbereichen angelegt.
- **23.11.2026:** Mail-Adressverwaltung als lokale Vormerkfunktion, Shop-Favoriten, Browser-URL-Öffnung und Verbindungswahl im Frontend ergänzt.
- **23.11.2026:** Keine echte Mailserver- oder Proxy-Funktion behauptet; Backend-Aufgaben dokumentiert.
