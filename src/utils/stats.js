// Auswertung je Muskelgruppe – rein und ohne Seiteneffekte, damit testbar.
import { MUSCLE_GROUPS } from '../data/exercises.js';
import { exerciseVolume, parseNum } from './training.js';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Sätze und bewegtes Gewicht je Muskelgruppe seit `days` Tagen (Infinity = alles).
 * `lastAt` (letztes Training der Gruppe) gilt immer über den ganzen Verlauf.
 * Liefert die Gruppen in fester Reihenfolge plus die Zahl der Wochen im Zeitraum (für Ø pro Woche).
 */
export function muscleStats(workouts, exercises, days, now = Date.now()) {
  const since = Number.isFinite(days) ? now - days * DAY : -Infinity;
  const rows = new Map(MUSCLE_GROUPS.map((g) => [g, { group: g, sets: 0, volume: 0, sessions: 0, lastAt: 0 }]));
  let first = now;
  for (const w of workouts) {
    const at = new Date(w.startedAt).getTime();
    const inRange = at >= since;
    if (inRange) first = Math.min(first, at);
    const touched = new Set();
    for (const ex of w.exercises) {
      const row = rows.get(exercises.get(ex.exerciseId)?.group);
      if (!row) continue; // gelöschte eigene Übung
      const sets = ex.sets.filter((s) => s.done && parseNum(s.reps) > 0).length;
      if (!sets) continue;
      row.lastAt = Math.max(row.lastAt, at);
      if (!inRange) continue;
      row.sets += sets;
      row.volume += exerciseVolume(ex, w.bodyWeight);
      touched.add(row);
    }
    touched.forEach((row) => { row.sessions += 1; });
  }
  // Wochen im Zeitraum; bei „Gesamt“ ab dem ersten Training, mindestens eine Woche
  const spanDays = Number.isFinite(days) ? days : (now - first) / DAY;
  return { rows: [...rows.values()], weeks: Math.max(1, spanDays / 7) };
}
