// Schnelltest: node src/utils/training.test.mjs
import assert from 'node:assert/strict';
import { setBodyweightContext, exerciseVolume, suggestNext, setUnit, fmtWeight as fw, fmtKg as fk, inputToKg, kgToInput, platesPerSide as pps, PLATES_LB, weekDays, weekStreak, bestsByExercise, recordCounts, cleanKg, cleanReps, estimate1RM, fmtClock, fmtDuration, fmtWeight, platesPerSide, startOfWeek, workoutVolume } from './training.js';

assert.equal(estimate1RM(100, 1), 100);
assert.equal(Math.round(estimate1RM(100, 5)), 117);
assert.deepEqual(platesPerSide(100).map((p) => p.kg), [25, 15]);
assert.deepEqual(platesPerSide(62.5).map((p) => p.kg), [20, 1.25]);
assert.equal(platesPerSide(20), null);
assert.equal(platesPerSide(21), null);
assert.equal(platesPerSide(100000), null); // Vertipper: kein Riesen-Stapel
assert.equal(platesPerSide(1e20), null);
assert.equal(platesPerSide(620).length, 12);
assert.equal(startOfWeek(new Date('2026-10-04T12:00:00')).getDay(), 1); // Sonntag → Montag davor
assert.equal(fmtClock(425000), '7:05');
assert.equal(fmtClock(4025000), '1:07:05');
assert.equal(fmtClock(-5), '0:00');
assert.equal(fmtWeight(980), '980 kg');
assert.equal(fmtWeight(4250), '4.250 kg');
assert.equal(fmtWeight(12480), '12,5 t');
assert.equal(fmtDuration(30000), '< 1 min');
assert.equal(fmtDuration(42 * 60000), '42 min');
assert.equal(workoutVolume({ exercises: [{ sets: [{ kg: '60', reps: '8', done: true }, { kg: 60, reps: 8, done: false }] }, { sets: [{ kg: '2,5', reps: 10, done: true }] }] }), 505);
assert.equal(cleanKg('-5'), null);
assert.equal(cleanKg('62,5'), '62,5');
assert.equal(cleanKg('100000'), null);
assert.equal(cleanReps('8,5'), null);
assert.equal(cleanReps('12'), '12');
assert.equal(workoutVolume({ exercises: [{ exerciseId: 'plank', sets: [{ kg: 10, reps: 60, done: true }] }] }), 0);
{
  const w = (id, kg, reps) => ({ id, exercises: [{ exerciseId: 'x', sets: [{ kg, reps, done: true }] }] });
  const hist = [w('c', 80, 5), w('b', 70, 5), w('a', 80, 3)]; // neuestes zuerst
  const counts = recordCounts(hist);
  assert.equal(counts.get('a'), 0); // erstes Mal: kein Rekord
  assert.equal(counts.get('b'), 0); // 70×5 (81,7) < 80×3 (88)
  assert.equal(counts.get('c'), 1); // 80×5 (93,3) > 88
  assert.equal(Math.round(bestsByExercise(hist).get('x').e1rm), 93);
}
{
  const now = new Date('2026-10-07T12:00:00'); // Mittwoch
  const at = (s) => ({ startedAt: new Date(s).toISOString() });
  const ws = [at('2026-10-05T18:00'), at('2026-10-05T19:00'), at('2026-10-07T08:00'), at('2026-09-30T10:00'), at('2026-09-22T10:00'), at('2026-09-08T10:00')];
  const days = weekDays(ws, now);
  assert.deepEqual(days.map((d) => d.count), [2, 0, 1, 0, 0, 0, 0]);
  assert.equal(days.findIndex((d) => d.isToday), 2);
  assert.equal(weekStreak(ws, now), 3); // diese, letzte, vorletzte Woche; dann Lücke
  assert.equal(weekStreak(ws.slice(3), now), 2); // diese Woche noch leer → zählt ab letzter Woche
  assert.equal(weekStreak([], now), 0);
}
// Einheit Pfund: Anzeige umgerechnet, Speicherung in kg
setUnit('lb');
assert.equal(fk(100), '220,5 lb');
assert.equal(fw(1000), '2.205 lb');
assert.equal(inputToKg('225'), '102.058');
assert.equal(kgToInput('102.058'), '225');
assert.equal(kgToInput(''), '');
assert.deepEqual(pps(225, 45, PLATES_LB).map((p) => p.kg), [45, 45]);
assert.deepEqual(pps(205, 45, PLATES_LB).map((p) => p.kg), [45, 35]);
setUnit('kg');
assert.equal(fk(62.5), '62,5 kg');
assert.equal(inputToKg('62,5'), '62,5');
// Steigerungs-Vorschlag
assert.deepEqual(suggestNext([{ kg: 100, reps: 5 }, { kg: 100, reps: 5 }], { target: 5 }), { kg: 102.5 });
assert.equal(suggestNext([{ kg: 100, reps: 5 }, { kg: 100, reps: 4 }], { target: 5 }), null); // nicht geschafft
assert.deepEqual(suggestNext([{ kg: 20, reps: 10 }], { equipment: 'Kurzhantel' }), { kg: 22 });
assert.deepEqual(suggestNext([{ kg: 0, reps: 8 }, { kg: 0, reps: 8 }], {}), { reps: 9 });
assert.deepEqual(suggestNext([{ kg: 0, reps: 45 }], { timed: true }), { reps: 50 });
assert.equal(suggestNext(null), null);
setUnit('lb'); assert.deepEqual(suggestNext([{ kg: 100, reps: 5 }], {}), { kg: 102.268 }); setUnit('kg');
// Körpergewicht bei Körpergewichtsübungen
setBodyweightContext(new Set(['klimmzuege']), 80);
assert.equal(exerciseVolume({ exerciseId: 'klimmzuege', sets: [{ kg: 5, reps: 10, done: true }, { kg: '', reps: 8, done: true }] }), 850 + 640);
assert.equal(exerciseVolume({ exerciseId: 'kniebeuge', sets: [{ kg: 100, reps: 5, done: true }] }), 500); // keine Körpergewichtsübung
assert.equal(workoutVolume({ bodyWeight: 70, exercises: [{ exerciseId: 'klimmzuege', sets: [{ kg: 0, reps: 10, done: true }] }] }), 700); // Gewicht vom Trainingstag
assert.equal(workoutVolume({ exercises: [{ exerciseId: 'plank', sets: [{ kg: 0, reps: 60, done: true }] }] }), 0);
setBodyweightContext(new Set(), 0);
console.log('training.js: alle Tests bestanden');
