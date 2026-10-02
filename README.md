# Kraftbuch

Trainingstagebuch für Kraftsport als **Progressive Web App** (React + Vite).
Auf Deutsch und Englisch (umschaltbar unter *Einstellungen → Sprache*, sonst nach Gerätesprache).
Läuft im Browser auf iOS und Android, lässt sich auf den Homescreen legen und funktioniert danach auch offline.

## Funktionen

- **Training** – Plan starten oder frei trainieren, Gewicht und Wiederholungen je Satz eintragen und abhaken.
  Zeigt die Werte vom letzten Mal, einen Pausen-Timer und die Hantelscheiben pro Seite.
- **Pläne** – eigene Trainingspläne anlegen: Übungen auswählen, Sätze × Wiederholungen festlegen, Reihenfolge ändern.
  Zwei Beispielpläne (Ganzkörper A/B) sind vorinstalliert.
- **Übungen** – 65 Standardübungen (davon 29 an Maschinen) nach Muskelgruppe und Gerät filterbar, dazu eigene Übungen.
- **Verlauf** – abgeschlossene Trainings, Fortschrittsdiagramm pro Übung (geschätztes 1RM nach Epley),
  Einstellungen und Speicherort.

Die Daten liegen auf dem Gerät (`localStorage`). Unter *Einstellungen → Speicherort* lässt sich zusätzlich wählen:

- **Google Drive** – automatischer Abgleich über die Datei `Kraftbuch-Daten.json` im eigenen Drive.
  Funktioniert auf allen Geräten, auf denen man sich mit demselben Google-Konto anmeldet.
  Haben zwei Geräte unabhängig Änderungen, fragt die App, welcher Stand gelten soll.
- **iCloud Drive** – Sicherung über das Teilen-Menü („In Dateien sichern“) und Laden per Dateiauswahl.
  Die App erinnert an die Sicherung, sobald es neue Daten gibt. Ein automatischer iCloud-Abgleich
  wäre nur mit Apples CloudKit möglich (kostenpflichtiges Apple-Developer-Konto).

## Google Drive einrichten (einmalig)

1. In der [Google Cloud Console](https://console.cloud.google.com/) ein Projekt anlegen.
2. *APIs & Dienste → Bibliothek*: **Google Drive API** aktivieren.
3. *OAuth-Zustimmungsbildschirm*: Typ „Extern“, App-Name „Kraftbuch“, eigene E-Mail eintragen.
   Unter *Testnutzer* das eigene Google-Konto hinzufügen (und alle, die die App nutzen sollen).
   Als Bereich genügt `.../auth/drive.file`.
4. *Anmeldedaten → Anmeldedaten erstellen → OAuth-Client-ID*, Typ **Webanwendung**.
   Unter *Autorisierte JavaScript-Quellen* `https://kresbach.github.io` eintragen
   (für lokale Tests zusätzlich `http://localhost:5173`).
5. Die angezeigte Client-ID (endet auf `.apps.googleusercontent.com`) im GitHub-Repository unter
   *Settings → Secrets and variables → Actions → Variables* als Variable **`GOOGLE_CLIENT_ID`** anlegen.
6. Workflow erneut ausführen. Lokal: `VITE_GOOGLE_CLIENT_ID=… npm run dev`.

Solange die App im Testmodus ist, zeigt Google beim Anmelden den Hinweis „Google hat diese App nicht überprüft“ –
über *Erweitert → Weiter zu Kraftbuch* geht es weiter.

## Entwicklung

```bash
npm install
npm run dev       # Entwicklungsserver, im WLAN auch vom Handy erreichbar
npm run build     # Produktionsbuild nach dist/
npm run preview   # Build lokal ansehen
npm run icons     # App-Icons in public/ neu erzeugen
```

## Veröffentlichung (GitHub Pages)

Bei jedem Push auf den Branch `claude/artifact-webpage-creation-yd1w4c` baut der Workflow
`.github/workflows/deploy-pages.yml` die App und veröffentlicht sie unter
**https://kresbach.github.io/testPhil/**.

Einmalig nötig: im Repository unter *Settings → Pages → Build and deployment → Source* „GitHub Actions“ auswählen.
Danach den Workflow unter *Actions* einmal neu starten (oder einfach erneut pushen).

## Auf dem Handy installieren

Die App muss über **HTTPS** ausgeliefert werden (z. B. GitHub Pages, Netlify, Vercel), damit der Service Worker läuft.
Der Inhalt von `dist/` kann in jedem Unterordner liegen.

- **iPhone (Safari):** Teilen-Symbol → „Zum Home-Bildschirm“.
- **Android (Chrome):** Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.

## Aufbau

```
src/
  main.jsx              Einstieg, Service-Worker-Registrierung
  App.jsx               Tab-Navigation (Training, Pläne, Übungen, Verlauf)
  data/                 Standardübungen und Beispielpläne
  state/reducer.js      Datenmodell und alle Änderungen am Zustand
  state/store.jsx       React-Context, Speichern in localStorage
  cloud/                Google-Drive-Abgleich und iCloud-Sicherung
  i18n/                 Übersetzungen (de.js, en.js) und Sprachwahl; Test: node src/i18n/i18n.test.mjs
  utils/training.js     Rechenhelfer (1RM, Volumen, Scheiben, Datum)
  components/           Wiederverwendbare Bausteine (Auswahl-Dialog, Timer, Diagramm …)
  views/                Die vier Hauptansichten
```
