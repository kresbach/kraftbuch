// Schnelltest: node src/utils/stats.test.mjs
import assert from 'node:assert/strict';
import { muscleStats } from './stats.js';
import { exerciseMap, initialState } from '../state/reducer.js';

const exercises = exerciseMap(initialState);
const now = new Date('2026-10-05T12:00:00Z').getTime();
const day = (n) => new Date(now - n * 86400000).toISOString();
const workouts = [
  { startedAt: day(1), exercises: [
    { exerciseId: 'kniebeuge', sets: [{ kg: 100, reps: 5, done: true }, { kg: 100, reps: 5, done: true }] },
    { exerciseId: 'plank', sets: [{ kg: 0, reps: 60, done: true }] },
    { exerciseId: 'geloescht', sets: [{ kg: 50, reps: 5, done: true }] },
  ] },
  { startedAt: day(40), exercises: [{ exerciseId: 'kniebeuge', sets: [{ kg: 80, reps: 5, done: true }] }] },
];
const byGroup = (r) => Object.fromEntries(r.rows.map((x) => [x.group, x]));

const month = byGroup(muscleStats(workouts, exercises, 28, now));
assert.equal(month.Beine.sets, 2);
assert.equal(month.Beine.volume, 1000);
assert.equal(month.Beine.sessions, 1);
assert.equal(month.Rumpf.sets, 1);
assert.equal(month.Rumpf.volume, 0); // Zeitübung zählt nicht als Gewicht
assert.equal(month.Brust.sets, 0);

const all = muscleStats(workouts, exercises, Infinity, now);
assert.equal(byGroup(all).Beine.sets, 3);
assert.equal(byGroup(all).Beine.lastAt, new Date(day(1)).getTime());
assert.ok(Math.abs(all.weeks - 40 / 7) < 0.01);
assert.equal(muscleStats([], exercises, Infinity, now).weeks, 1);
console.log('stats.js: alle Tests bestanden');
