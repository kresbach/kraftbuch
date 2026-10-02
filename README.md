# Kraftbuch

Trainingstagebuch für Kraftsport als **Progressive Web App** (React + Vite).
Läuft im Browser auf iOS und Android, lässt sich auf den Homescreen legen und funktioniert danach auch offline.

## Funktionen

- **Training** – Plan starten oder frei trainieren, Gewicht und Wiederholungen je Satz eintragen und abhaken.
  Zeigt die Werte vom letzten Mal, einen Pausen-Timer und die Hantelscheiben pro Seite.
- **Pläne** – eigene Trainingspläne anlegen: Übungen auswählen, Sätze × Wiederholungen festlegen, Reihenfolge ändern.
  Zwei Beispielpläne (Ganzkörper A/B) sind vorinstalliert.
- **Übungen** – 23 Standardübungen nach Muskelgruppe, dazu eigene Übungen anlegen.
- **Verlauf** – abgeschlossene Trainings, Fortschrittsdiagramm pro Übung (geschätztes 1RM nach Epley),
  Einstellungen sowie Export/Import der Daten als JSON-Datei.

Alle Daten bleiben lokal auf dem Gerät (`localStorage`). Es gibt keinen Server und kein Konto.

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
  utils/training.js     Rechenhelfer (1RM, Volumen, Scheiben, Datum)
  components/           Wiederverwendbare Bausteine (Auswahl-Dialog, Timer, Diagramm …)
  views/                Die vier Hauptansichten
```
