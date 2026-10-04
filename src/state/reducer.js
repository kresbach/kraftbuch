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
// Das laufende Training bleibt bewusst nur auf dem Gerät.
export const SYNCED_KEYS = ['customExercises', 'plans', 'workouts', 'settings'];

export function syncedData(state) {
  const data = { app: 'kraftbuch', version: state.version, updatedAt: state.updatedAt };
  for (const k of SYNCED_KEYS) data[k] = state[k];
  return data;
}

/** Prüft, ob eine Datei/Cloud-Antwort eine Kraftbuch-Sicherung ist. */
export const isBackup = (data) => !!data && Array.isArray(data.workouts) && Array.isArray(data.plans);

function pickSynced(data) {
  const out = {};
  for (const k of SYNCED_KEYS) if (data[k] !== undefined) out[k] = data[k];
  return out;
}

/** Alle Übungen (Standard + eigene) als Map id → Übung. */
export function exerciseMap(state) {
  const map = new Map();
  for (const ex of [...DEFAULT_EXERCISES, ...state.customExercises]) map.set(ex.id, ex);
  return map;
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
    case 'exercise/delete':
      return { ...state, customExercises: state.customExercises.filter((e) => e.id !== action.id) };

    // ---- Pläne ----
    case 'plan/save': {
      const exists = state.plans.some((p) => p.id === action.plan.id);
      const plans = exists
        ? state.plans.map((p) => (p.id === action.plan.id ? action.plan : p))
        : [...state.plans, { ...action.plan, id: action.plan.id || uid() }];
      return { ...state, plans };
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
      // Ein eingetragenes Gewicht wird in die folgenden, noch leeren Sätze übernommen.
      return updateWorkoutExercise(state, action.exIndex, (ex) => ({
        ...ex,
        sets: ex.sets.map((s, i) => {
          if (i === action.setIndex) return { ...s, ...action.patch };
          if (i > action.setIndex && 'kg' in action.patch && s.kg === '' && !s.done) return { ...s, kg: action.patch.kg };
          return s;
        }),
      }));
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
            .filter((s) => s.done)
            .map((s) => ({ kg: parseNum(s.kg), reps: parseNum(s.reps), done: true })),
        }))
        .filter((ex) => ex.sets.length > 0);
      if (exercises.length === 0) return { ...state, activeWorkout: null };
      const finished = { ...w, exercises, finishedAt: new Date().toISOString() };
      return { ...state, activeWorkout: null, workouts: [finished, ...state.workouts] };
    }
    case 'workout/rest': // Pausen-Ende im Training speichern – übersteht Tab-Wechsel und Neuladen
      return { ...state, activeWorkout: { ...state.activeWorkout, restEndsAt: action.endsAt } };
    case 'workout/discard':
      return { ...state, activeWorkout: null };

    // ---- Verlauf & Daten ----
    case 'history/delete':
      return { ...state, workouts: state.workouts.filter((w) => w.id !== action.id) };
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
