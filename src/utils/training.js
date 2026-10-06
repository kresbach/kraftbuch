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

/** Eingabe fürs Gewicht: nur positive Zahlen bis 9999 mit höchstens 2 Nachkommastellen.
 *  Liefert den bereinigten Wert oder null (= Eingabe ignorieren). */
export const cleanKg = (v) => (/^\d{0,4}([.,]\d{0,2})?$/.test(v) ? v : null);
/** Eingabe für Wiederholungen bzw. Sekunden: nur ganze Zahlen bis 9999. */
export const cleanReps = (v) => (/^\d{0,4}$/.test(v) ? v : null);

/** Bewegtes Gewicht eines Satzes (kg × Wdh). */
export const setVolume = (s) => parseNum(s.kg) * parseNum(s.reps);

// Bei Zeitübungen (Sekunden statt Wdh) ergibt kg × Wdh kein bewegtes Gewicht
const TIMED_IDS = new Set(['plank', 'side-plank']);

// Körpergewichtsübungen: pro Wiederholung zählt Körpergewicht + Zusatzgewicht.
// Welche Übungen das sind und das aktuelle Körpergewicht setzt die App (setBodyweightContext).
let bodyweightIds = new Set();
let currentBodyWeight = 0;
export function setBodyweightContext(ids, bodyWeight) {
  bodyweightIds = ids;
  currentBodyWeight = parseNum(bodyWeight);
}

/** Bewegtes Gewicht einer Übung im Training (nur erledigte Sätze).
 *  `bodyWeight`: Körpergewicht zum Zeitpunkt des Trainings (sonst das aktuelle aus den Einstellungen). */
export function exerciseVolume(ex, bodyWeight = currentBodyWeight) {
  if (TIMED_IDS.has(ex.exerciseId)) return 0;
  const bw = bodyweightIds.has(ex.exerciseId) ? parseNum(bodyWeight) : 0;
  return ex.sets.filter((s) => s.done).reduce((a, s) => a + Math.max(0, (bw + parseNum(s.kg)) * parseNum(s.reps)), 0);
}

export const workoutVolume = (w) => w.exercises.reduce((sum, ex) => sum + exerciseVolume(ex, w.bodyWeight ?? currentBodyWeight), 0);

// ---- Steigerungs-Vorschlag ----
// Wurden beim letzten Mal in allen Sätzen mit dem höchsten Gewicht die Ziel-Wiederholungen geschafft,
// gibt es etwas mehr Gewicht. Ohne Gewicht: eine Wiederholung bzw. 5 Sekunden mehr.
const SMALL_STEP = new Set(['Kurzhantel', 'Kettlebell']);
export function suggestNext(lastSets, { target, timed, equipment } = {}) {
  if (!lastSets?.length) return null;
  const sets = lastSets.map((s) => ({ kg: parseNum(s.kg), reps: parseNum(s.reps) }));
  const maxKg = Math.max(...sets.map((s) => s.kg));
  if (maxKg > 0) {
    const top = sets.filter((s) => s.kg === maxKg);
    const goal = target || top[0].reps;
    if (!goal || top.some((s) => s.reps < goal)) return null;
    const step = unit === 'lb' ? 5 * LB : SMALL_STEP.has(equipment) ? 2 : 2.5;
    return { kg: Math.round((maxKg + step) * 1000) / 1000 };
  }
  const best = Math.max(...sets.map((s) => s.reps));
  const goal = target || sets[0].reps;
  if (!best || sets.some((s) => s.reps < goal)) return null;
  return { reps: best + (timed ? 5 : 1) };
}

// ---- Persönliche Rekorde ----
// Mit Gewicht zählt das geschätzte 1RM, ohne Gewicht die Wiederholungen (bzw. Sekunden).

/** Bestwerte je Übung aus abgeschlossenen Trainings: Map id → {e1rm, reps} (reps = ohne Gewicht). */
export function bestsByExercise(workouts) {
  const map = new Map();
  for (const w of workouts) for (const ex of w.exercises) addBest(map, ex);
  return map;
}

function addBest(map, ex) {
  const cur = map.get(ex.exerciseId) ?? { e1rm: 0, reps: 0 };
  for (const s of ex.sets) {
    if (!s.done) continue;
    const kg = parseNum(s.kg), reps = parseNum(s.reps);
    if (kg > 0) cur.e1rm = Math.max(cur.e1rm, estimate1RM(kg, reps));
    else cur.reps = Math.max(cur.reps, reps);
  }
  map.set(ex.exerciseId, cur);
}

/** Ist dieser Satz besser als alles bisher? Beim ersten Mal gibt es noch keinen Rekord. */
export function isRecord(set, best) {
  if (!set.done || !best) return false;
  const kg = parseNum(set.kg), reps = parseNum(set.reps);
  return kg > 0 ? best.e1rm > 0 && estimate1RM(kg, reps) > best.e1rm + 1e-9 : best.reps > 0 && reps > best.reps;
}

/** Bester Rekordsatz einer Übung im Training (oder null). */
export function recordSet(ex, best) {
  const records = ex.sets.filter((s) => isRecord(s, best));
  if (!records.length) return null;
  return records.reduce((a, s) => (parseNum(s.kg) > 0
    ? (estimate1RM(parseNum(s.kg), parseNum(s.reps)) > estimate1RM(parseNum(a.kg), parseNum(a.reps)) ? s : a)
    : (parseNum(s.reps) > parseNum(a.reps) ? s : a)));
}

/** Anzahl der Übungen mit neuem Rekord je Training (Verlauf neuestes zuerst). Map workoutId → Anzahl */
export function recordCounts(workouts) {
  const result = new Map();
  const bests = new Map();
  for (let i = workouts.length - 1; i >= 0; i--) { // ältestes zuerst durchgehen
    const w = workouts[i];
    result.set(w.id, w.exercises.filter((ex) => recordSet(ex, bests.get(ex.exerciseId))).length);
    for (const ex of w.exercises) addBest(bests, ex);
  }
  return result;
}

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

const MAX_PLATES_PER_SIDE = 12; // mehr passt auf keine Hantelstange

// Scheiben in Pfund (übliche US-Scheiben)
export const PLATES_LB = [
  { kg: 45, color: '#2f62d6' },
  { kg: 35, color: '#e8b923' },
  { kg: 25, color: '#2f9e5a' },
  { kg: 10, color: '#e9ecf2' },
  { kg: 5, color: '#9aa3b2' },
  { kg: 2.5, color: '#6b7385' },
];
/** Stangengewicht in lb zur kg-Einstellung (20 kg ≈ 45 lb usw.) */
export const BAR_LB = { 20: 45, 15: 35, 10: 25 };

/** Scheiben pro Seite für ein Zielgewicht bei gegebener Stange; null wenn nicht ladbar.
 *  Mit `plates = PLATES_LB` rechnet die Funktion in Pfund. */
export function platesPerSide(total, bar = 20, plates = PLATES) {
  let rest = (total - bar) / 2;
  // Unrealistische Eingaben (Vertipper wie 100000) nicht durchrechnen – das fror die App ein
  if (!(rest > 0) || rest > plates[0].kg * MAX_PLATES_PER_SIDE) return null;
  const result = [];
  for (const p of plates) {
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

// ---- Gewichtseinheit ----
// Gespeichert wird immer in kg; angezeigt und eingegeben in der gewählten Einheit (kg oder lb).
export const LB = 0.45359237;
let unit = 'kg';
export function setUnit(next) { unit = next === 'lb' ? 'lb' : 'kg'; }
export const getUnit = () => unit;
/** kg → Anzeigeeinheit */
export const toUnit = (kg) => (unit === 'lb' ? kg / LB : kg);
/** Anzeigeeinheit → kg */
export const fromUnit = (v) => (unit === 'lb' ? v * LB : v);
/** Gewicht als Zahl in der Anzeigeeinheit, ohne Einheit: „62,5“ */
export const fmtW = (kg) => nf.format(Math.round(toUnit(kg) * 10) / 10);
/** „62,5 kg“ bzw. „137,8 lb“ */
export const fmtKg = (kg) => `${fmtW(kg)} ${unit}`;
/** Bewegtes Gesamtgewicht kompakt: 980 kg, 4.250 kg, ab 10 t in Tonnen (12,5 t); in lb ab 100.000 als „125k lb“. */
export function fmtWeight(kg) {
  if (unit === 'lb') {
    const lb = toUnit(kg);
    return lb >= 100000 ? `${nf.format(Math.round(lb / 100) / 10)}k lb` : `${nf.format(Math.round(lb))} lb`;
  }
  return kg >= 10000 ? `${nf.format(Math.round(kg / 100) / 10)} t` : `${nf.format(Math.round(kg))} kg`;
}
/** Wert für ein Eingabefeld (Dezimalkomma je nach Sprache, ohne Tausenderpunkte) */
export const fmtInput = (n) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2, useGrouping: false }).format(n);
/** Eingabe in der Anzeigeeinheit → gespeicherter kg-Text */
export const inputToKg = (text) => {
  if (unit === 'kg' || text === '') return text;
  const kg = fromUnit(parseNum(text));
  return String(Math.round(kg * 1000) / 1000);
};
/** gespeicherter kg-Text → Text fürs Eingabefeld */
export const kgToInput = (kgText) => (unit === 'kg' || kgText === '' || kgText == null ? kgText ?? '' : fmtInput(Math.round(toUnit(parseNum(kgText)) * 10) / 10));

/** „So., 4. Okt.“ – das Jahr nur, wenn es nicht das aktuelle ist. */
export const fmtDate = (iso) => {
  const d = new Date(iso);
  const year = d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {};
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', ...year });
};
/** Kurzer Wochentag ohne Punkt: „Mo“, „Mon“ */
export const fmtWeekday = (d) => d.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').slice(0, 3);
/** Wochentage eines Plans kurz: [1, 4] → „Mo · Do“ (1 = Montag) */
export function fmtPlanDays(days) {
  const monday = startOfWeek();
  return [...days].sort((a, b) => a - b).map((d) => { const x = new Date(monday); x.setDate(monday.getDate() + d - 1); return fmtWeekday(x); }).join(' · ');
}
/** „September 2026“ */
export const fmtMonth = (d) => d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
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
  if (!Number.isFinite(ms) || ms < 0) return '–';
  if (ms < 60000) return '< 1 min';
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

/** Die sieben Tage der aktuellen Woche (Mo–So) mit der Zahl der Trainings je Tag. */
export function weekDays(workouts, now = new Date()) {
  const start = startOfWeek(now);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    const count = workouts.filter((w) => { const t = new Date(w.startedAt); return t >= day && t < next; }).length;
    return { date: day, count, isToday: day.toDateString() === now.toDateString(), isFuture: day > now };
  });
}

/** Wochen in Folge mit mindestens einem Training. Die laufende Woche zählt mit, sobald trainiert wurde –
 *  ist sie noch leer, bricht die Serie dadurch nicht ab. */
export function weekStreak(workouts, now = new Date()) {
  const weeks = new Set(workouts.map((w) => startOfWeek(new Date(w.startedAt)).getTime()));
  const cur = startOfWeek(now);
  if (!weeks.has(cur.getTime())) cur.setDate(cur.getDate() - 7);
  let streak = 0;
  while (weeks.has(cur.getTime())) {
    streak += 1;
    cur.setDate(cur.getDate() - 7);
  }
  return streak;
}

/** Montag 00:00 der aktuellen Woche. */
export function startOfWeek(d = new Date()) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}
