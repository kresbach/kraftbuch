// Gesamter App-Zustand und alle Änderungen daran an einer Stelle.
import { DEFAULT_EXERCISES } from '../data/exercises.js';
import { DEFAULT_PLANS } from '../data/defaultPlans.js';
import { parseNum, uid } from '../utils/training.js';
import { moveItem } from '../utils/moveItem.js';

export const initialState = {
  version: 1,
  customExercises: [], // eigene Übungen des Nutzers
  plans: DEFAULT_PLANS,
  workouts: [], // abgeschlossene Trainings, neuestes zuerst
  activeWorkout: null, // laufendes Training
  settings: { restSeconds: 90, barKg: 20 },
  updatedAt: 0, // Zeitpunkt der letzten Änderung an synchronisierten Daten (für Cloud-Abgleich)
};

// Diese Teile des Zustands werden gesichert bzw. mit der Cloud abgeglichen.
// Das laufende Training wird mit abgeglichen, damit es auf einem anderen Gerät fortgesetzt werden kann.
export const SYNCED_KEYS = ['customExercises', 'plans', 'workouts', 'settings', 'activeWorkout'];

export function syncedData(state) {
  const data = { app: 'kraftbuch', version: state.version, updatedAt: state.updatedAt };
  for (const k of SYNCED_KEYS) data[k] = state[k];
  return data;
}

/** Prüft, ob eine Datei/Cloud-Antwort eine Kraftbuch-Sicherung ist. */
export const isBackup = (data) => !!data && Array.isArray(data.workouts) && Array.isArray(data.plans);

// ---- Eingelesene Daten bereinigen (Speicher, Datei, Cloud) ----
// Fehlerhafte oder unvollständige Einträge dürfen die App nicht zum Absturz bringen.
const arr = (v) => (Array.isArray(v) ? v : []);
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

const validDate = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

function cleanWorkout(w) {
  const startedAt = validDate(w.startedAt) ? w.startedAt : new Date().toISOString();
  return {
    ...w,
    id: w.id || uid(),
    name: typeof w.name === 'string' && w.name ? w.name : 'Freies Training',
    startedAt,
    ...('finishedAt' in w ? { finishedAt: validDate(w.finishedAt) ? w.finishedAt : startedAt } : {}),
    exercises: arr(w.exercises).filter((ex) => isObj(ex) && ex.exerciseId)
      .map((ex) => ({ ...ex, sets: arr(ex.sets).filter(isObj).map((s) => ({ kg: s.kg ?? '', reps: s.reps ?? '', done: !!s.done })) })),
  };
}

/** Bereinigt die synchronisierten Teile; fehlende Teile bleiben weg (werden nicht überschrieben). */
export function normalizeData(data) {
  if (!isObj(data)) return {};
  const out = {};
  if ('customExercises' in data) out.customExercises = arr(data.customExercises).filter((e) => isObj(e) && e.id && typeof e.name === 'string');
  if ('plans' in data) {
    out.plans = arr(data.plans).filter((p) => isObj(p) && p.id).map((p) => ({
      ...p,
      name: typeof p.name === 'string' ? p.name : '',
      exercises: arr(p.exercises).filter((pe) => isObj(pe) && pe.exerciseId)
        .map((pe) => ({ ...pe, sets: Number(pe.sets) || 3, reps: Number(pe.reps) || 8 })),
    }));
  }
  if ('workouts' in data) out.workouts = arr(data.workouts).filter(isObj).map((w) => cleanWorkout({ finishedAt: w.startedAt, ...w }));
  if ('settings' in data) out.settings = { ...initialState.settings, ...(isObj(data.settings) ? data.settings : {}) };
  if ('activeWorkout' in data) out.activeWorkout = isObj(data.activeWorkout) ? cleanWorkout(data.activeWorkout) : null;
  return out;
}

const pickSynced = normalizeData;

/** Alle Übungen (Standard + eigene) als Map id → Übung. */
export function exerciseMap(state) {
  const map = new Map();
  for (const ex of [...DEFAULT_EXERCISES, ...state.customExercises]) map.set(ex.id, ex);
  return map;
}

/** Notiz zu einer Übung vom letzten Mal, an dem eine geschrieben wurde. */
export function lastNoteFor(state, exerciseId) {
  for (const w of state.workouts) {
    const note = w.exercises.find((e) => e.exerciseId === exerciseId && e.note?.trim())?.note;
    if (note) return note.trim();
  }
  return '';
}

/** Letzte erledigte Sätze einer Übung aus dem Verlauf (für Vorbelegung und Hinweis). */
export function lastSetsFor(state, exerciseId) {
  for (const w of state.workouts) {
    const ex = w.exercises.find((e) => e.exerciseId === exerciseId);
    const sets = ex?.sets.filter((s) => s.done);
    if (sets?.length) return sets;
  }
  return null;
}

function newWorkoutExercise(state, exerciseId, targetSets = 3, targetReps = '') {
  const last = lastSetsFor(state, exerciseId);
  const kg = last ? last[0].kg : '';
  const reps = targetReps || (last ? last[0].reps : '');
  return {
    exerciseId,
    ...(targetReps ? { target: Number(targetReps) } : {}), // Ziel-Wdh aus dem Plan (für den Steigerungs-Vorschlag)
    sets: Array.from({ length: targetSets }, () => ({ kg, reps, done: false })),
  };
}

function updateWorkoutExercise(state, exIndex, fn) {
  const exercises = state.activeWorkout.exercises.map((ex, i) => (i === exIndex ? fn(ex) : ex));
  return { ...state, activeWorkout: { ...state.activeWorkout, exercises } };
}

export function reducer(state, action) {
  switch (action.type) {
    // ---- Übungen ----
    case 'exercise/add':
      return { ...state, customExercises: [...state.customExercises, { ...action.exercise, id: uid(), custom: true }] };
    case 'exercise/update': // eigene Übung ändern – Pläne und Verlauf verweisen per ID, bleiben also gültig
      return { ...state, customExercises: state.customExercises.map((e) => (e.id === action.exercise.id ? { ...e, ...action.exercise, custom: true } : e)) };
    case 'exercise/delete': {
      // Auch aus den Plänen entfernen – sonst stünde dort „Unbekannte Übung“
      const plans = state.plans.map((p) => (p.exercises.some((pe) => pe.exerciseId === action.id)
        ? { ...p, exercises: p.exercises.filter((pe) => pe.exerciseId !== action.id) }
        : p));
      return { ...state, plans, customExercises: state.customExercises.filter((e) => e.id !== action.id) };
    }

    // ---- Pläne ----
    case 'plan/save': {
      const exists = state.plans.some((p) => p.id === action.plan.id);
      const plans = exists
        ? state.plans.map((p) => (p.id === action.plan.id ? action.plan : p))
        : [...state.plans, { ...action.plan, id: action.plan.id || uid() }];
      return { ...state, plans };
    }
    case 'plan/duplicate': { // Kopie direkt hinter dem Original
      const i = state.plans.findIndex((p) => p.id === action.id);
      if (i < 0) return state;
      const copy = { ...structuredClone(state.plans[i]), id: uid(), name: action.name };
      return { ...state, plans: [...state.plans.slice(0, i + 1), copy, ...state.plans.slice(i + 1)] };
    }
    case 'favorite/toggle': {
      const favs = state.settings.favorites ?? [];
      const favorites = favs.includes(action.id) ? favs.filter((f) => f !== action.id) : [...favs, action.id];
      return { ...state, settings: { ...state.settings, favorites } };
    }
    case 'exercise/rest': { // eigene Pausenzeit je Übung (null = Standard aus den Einstellungen)
      const restByExercise = { ...(state.settings.restByExercise ?? {}) };
      if (action.seconds == null) delete restByExercise[action.id];
      else restByExercise[action.id] = action.seconds;
      return { ...state, settings: { ...state.settings, restByExercise } };
    }
    case 'plan/delete':
      return { ...state, plans: state.plans.filter((p) => p.id !== action.id) };
    case 'plan/move':
      return { ...state, plans: moveItem(state.plans, action.from, action.to) };

    // ---- Laufendes Training ----
    case 'workout/start': {
      const plan = state.plans.find((p) => p.id === action.planId);
      return {
        ...state,
        activeWorkout: {
          id: uid(),
          planId: plan?.id ?? null,
          name: plan?.name ?? 'Freies Training',
          startedAt: new Date().toISOString(),
          exercises: plan ? plan.exercises.map((pe) => newWorkoutExercise(state, pe.exerciseId, pe.sets, pe.reps)) : [],
        },
      };
    }
    case 'workout/addExercise':
      return {
        ...state,
        activeWorkout: {
          ...state.activeWorkout,
          exercises: [...state.activeWorkout.exercises, newWorkoutExercise(state, action.exerciseId)],
        },
      };
    case 'workout/removeExercise':
      return {
        ...state,
        activeWorkout: {
          ...state.activeWorkout,
          exercises: state.activeWorkout.exercises.filter((_, i) => i !== action.exIndex),
        },
      };
    case 'workout/moveExercise':
      return {
        ...state,
        activeWorkout: { ...state.activeWorkout, exercises: moveItem(state.activeWorkout.exercises, action.from, action.to) },
      };
    case 'workout/addSet':
      return updateWorkoutExercise(state, action.exIndex, (ex) => {
        const prev = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, { kg: prev?.kg ?? '', reps: prev?.reps ?? '', done: false }] };
      });
    case 'workout/updateSet':
      // Gewicht und Wiederholungen wandern in die folgenden, noch offenen Sätze, solange diese noch
      // leer sind oder den bisherigen Wert haben – so wird beim Tippen von „80“ nicht nur die „8“ übernommen.
      return updateWorkoutExercise(state, action.exIndex, (ex) => {
        const sets = ex.sets.map((s, i) => (i === action.setIndex ? { ...s, ...action.patch } : s));
        for (const key of ['kg', 'reps']) {
          if (!(key in action.patch)) continue;
          const before = String(ex.sets[action.setIndex][key] ?? '');
          for (let i = action.setIndex + 1; i < sets.length; i++) {
            const value = String(sets[i][key] ?? '');
            if (sets[i].done || (value !== '' && value !== before)) break; // eigener Wert: ab hier nichts ändern
            sets[i] = { ...sets[i], [key]: action.patch[key] };
          }
        }
        return { ...ex, sets };
      });
    case 'workout/removeSet':
      return updateWorkoutExercise(state, action.exIndex, (ex) => ({
        ...ex,
        sets: ex.sets.filter((_, i) => i !== action.setIndex),
      }));
    case 'workout/finish': {
      const w = state.activeWorkout;
      const exercises = w.exercises
        .map((ex) => ({
          ...ex,
          sets: ex.sets
            .filter((s) => s.done && parseNum(s.reps) > 0)
            .map((s) => ({ kg: parseNum(s.kg), reps: parseNum(s.reps), done: true })),
        }))
        .filter((ex) => ex.sets.length > 0);
      if (exercises.length === 0) return { ...state, activeWorkout: null };
      const finished = { ...w, exercises, finishedAt: new Date().toISOString() };
      return { ...state, activeWorkout: null, workouts: [finished, ...state.workouts] };
    }
    case 'workout/note': // Notiz zum Training (ohne exIndex) oder zu einer Übung
      if (action.exIndex == null) return { ...state, activeWorkout: { ...state.activeWorkout, note: action.note } };
      return updateWorkoutExercise(state, action.exIndex, (ex) => ({ ...ex, note: action.note }));
    case 'workout/rest': // Pausen-Ende im Training speichern – übersteht Tab-Wechsel und Neuladen
      return { ...state, activeWorkout: { ...state.activeWorkout, restEndsAt: action.endsAt, ...(action.total ? { restTotal: action.total } : {}) } };
    case 'workout/applySuggestion': // Vorschlag (mehr Gewicht bzw. Wdh) in alle offenen Sätze übernehmen
      return updateWorkoutExercise(state, action.exIndex, (ex) => ({
        ...ex,
        sets: ex.sets.map((s) => (s.done ? s : { ...s, ...action.patch })),
      }));
    case 'workout/repeat': { // abgeschlossenes Training als neues Training mit denselben Übungen und Werten starten
      const src = state.workouts.find((w) => w.id === action.workoutId);
      if (!src || state.activeWorkout) return state;
      const plan = state.plans.find((p) => p.id === src.planId);
      return {
        ...state,
        activeWorkout: {
          id: uid(),
          planId: plan ? src.planId : null,
          name: plan ? plan.name : src.name,
          startedAt: new Date().toISOString(),
          exercises: src.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            ...(ex.target ? { target: ex.target } : {}),
            sets: ex.sets.map((s) => ({ kg: s.kg || '', reps: s.reps || '', done: false })),
          })),
        },
      };
    }
    case 'workout/discard':
      return { ...state, activeWorkout: null };

    // ---- Verlauf & Daten ----
    case 'history/delete':
      return { ...state, workouts: state.workouts.filter((w) => w.id !== action.id) };
    case 'history/update':
      return { ...state, workouts: state.workouts.map((w) => (w.id === action.workout.id ? action.workout : w)) };
    case 'undo/restore': // Zustand vor einer Löschung wiederherstellen (nur die betroffenen Teile)
      return { ...state, ...action.snapshot };
    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'data/import': // aus Datei: gilt als neue Änderung
      return { ...state, ...pickSynced(action.data) };
    case 'data/replace': // aus der Cloud: übernimmt deren Stand unverändert
      return { ...state, ...pickSynced(action.data), updatedAt: action.data.updatedAt || Date.now() };

    default:
      throw new Error(`Unbekannte Aktion: ${action.type}`);
  }
}

/** Reducer mit Zeitstempel: jede Änderung an synchronisierten Daten setzt `updatedAt`. */
export function rootReducer(state, action) {
  const next = reducer(state, action);
  if (action.type === 'data/replace' || next === state) return next;
  return SYNCED_KEYS.some((k) => next[k] !== state[k]) ? { ...next, updatedAt: Date.now() } : next;
}
