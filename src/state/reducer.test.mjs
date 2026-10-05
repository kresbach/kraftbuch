// Schnelltest: node src/state/reducer.test.mjs
import assert from 'node:assert/strict';
import { initialState, normalizeData, reducer } from './reducer.js';

const start = reducer({ ...initialState, plans: [] }, { type: 'workout/start', planId: null });
let s = reducer(start, { type: 'workout/addExercise', exerciseId: 'kniebeuge' }); // neue Übung: 3 leere Sätze
const type = (state, setIndex, key, text) => {
  // Zeichen für Zeichen tippen wie auf dem Handy
  for (let n = 1; n <= text.length; n++) state = reducer(state, { type: 'workout/updateSet', exIndex: 0, setIndex, patch: { [key]: text.slice(0, n) } });
  return state;
};
const sets = (state) => state.activeWorkout.exercises[0].sets.map((x) => `${x.kg}x${x.reps}`).join(' ');

s = type(s, 0, 'kg', '80');
s = type(s, 0, 'reps', '10');
assert.equal(sets(s), '80x10 80x10 80x10');

// Satz 2 bekommt einen eigenen Wert → Änderungen an Satz 1 lassen Satz 2 und 3 in Ruhe
s = type(s, 1, 'reps', '8');
assert.equal(sets(s), '80x10 80x8 80x8');
s = reducer(s, { type: 'workout/updateSet', exIndex: 0, setIndex: 0, patch: { reps: '12' } });
assert.equal(sets(s), '80x12 80x8 80x8');

// Abgehakte Sätze bleiben unverändert
s = reducer(s, { type: 'workout/updateSet', exIndex: 0, setIndex: 1, patch: { done: true } });
s = reducer(s, { type: 'workout/updateSet', exIndex: 0, setIndex: 0, patch: { kg: '90' } });
assert.equal(sets(s), '90x12 80x8 80x8');

// Löschen im ersten Satz leert die folgenden, die denselben Wert hatten
let t = type(reducer(start, { type: 'workout/addExercise', exerciseId: 'kniebeuge' }), 0, 'kg', '60');
t = reducer(t, { type: 'workout/updateSet', exIndex: 0, setIndex: 0, patch: { kg: '' } });
assert.equal(sets(t), 'x x x');

// Beschädigte Daten werden bereinigt statt die App abstürzen zu lassen
{
  const n = normalizeData({ workouts: 'x', plans: null, settings: 5, customExercises: [null, { id: 'c', name: 'Ok' }] });
  assert.deepEqual(n.workouts, []);
  assert.deepEqual(n.plans, []);
  assert.equal(n.settings.restSeconds, 90);
  assert.equal(n.customExercises.length, 1);
  const w = normalizeData({ workouts: [{ id: 'a', startedAt: '2026-10-01T10:00:00Z' }, null, { startedAt: 'kaputt', exercises: [{ exerciseId: 'kniebeuge', sets: [null, { kg: 50, reps: 5, done: true }] }, {}] }] }).workouts;
  assert.equal(w.length, 2);
  assert.deepEqual(w[0].exercises, []);
  assert.equal(w[0].finishedAt, '2026-10-01T10:00:00Z');
  assert.equal(w[1].exercises.length, 1);
  assert.equal(w[1].exercises[0].sets.length, 1);
  assert.ok(w[1].id && !Number.isNaN(Date.parse(w[1].startedAt)));
  assert.ok(!Number.isNaN(Date.parse(w[1].finishedAt))); // ungültiges Ende → Startzeit
  assert.deepEqual(normalizeData({ updatedAt: 5 }), {}); // nur vorhandene Teile
  assert.equal(normalizeData({ activeWorkout: 7 }).activeWorkout, null);
}
console.log('reducer.js: alle Tests bestanden');
