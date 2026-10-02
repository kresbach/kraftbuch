// Reine Hilfsfunktionen rund um Sätze, Gewichte und Datumsangaben.

export const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

/** Geschätztes 1-Wiederholungs-Maximum nach Epley. */
export function estimate1RM(kg, reps) {
  if (!kg || !reps) return 0;
  if (reps === 1) return kg;
  return kg * (1 + reps / 30);
}

/** Zahl aus einer Eingabe lesen; akzeptiert Komma als Dezimaltrennzeichen. */
export const parseNum = (v) => Number(String(v ?? '').replace(',', '.')) || 0;

/** Bewegtes Gewicht eines Satzes (kg × Wdh). */
export const setVolume = (s) => parseNum(s.kg) * parseNum(s.reps);

export const workoutVolume = (w) =>
  w.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.done).reduce((a, s) => a + setVolume(s), 0), 0);

export const doneSets = (ex) => ex.sets.filter((s) => s.done && parseNum(s.reps) > 0);

// Wettkampfscheiben (IWF-Farben) – für die Anzeige „Scheiben pro Seite“.
export const PLATES = [
  { kg: 25, color: '#d9342b' },
  { kg: 20, color: '#2f62d6' },
  { kg: 15, color: '#e8b923' },
  { kg: 10, color: '#2f9e5a' },
  { kg: 5, color: '#e9ecf2' },
  { kg: 2.5, color: '#9aa3b2' },
  { kg: 1.25, color: '#6b7385' },
];

/** Scheiben pro Seite für ein Zielgewicht bei gegebener Stange; null wenn nicht ladbar. */
export function platesPerSide(total, bar = 20) {
  let rest = (total - bar) / 2;
  if (!(rest > 0)) return null;
  const result = [];
  for (const p of PLATES) {
    while (rest >= p.kg - 1e-9) {
      result.push(p);
      rest -= p.kg;
    }
  }
  return rest > 1e-6 ? null : result;
}

// Zahlen- und Datumsformat folgen der gewählten Sprache (setzt der I18nProvider).
let locale = 'de-DE';
let nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
export function setFormatLocale(next) {
  if (next === locale) return;
  locale = next;
  nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
}

export const fmtNum = (n) => nf.format(n);
export const fmtKg = (n) => `${nf.format(n)} kg`;

export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
export const fmtShortDate = (iso) =>
  new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
export const fmtLongToday = () =>
  new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

/** Stoppuhr-Format: 7:05 bzw. 1:07:05 */
export function fmtClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function fmtDuration(ms) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

/** Montag 00:00 der aktuellen Woche. */
export function startOfWeek(d = new Date()) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}
