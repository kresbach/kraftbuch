// Schnelltest: node src/utils/training.test.mjs
import assert from 'node:assert/strict';
import { estimate1RM, fmtClock, platesPerSide, startOfWeek } from './training.js';

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
console.log('training.js: alle Tests bestanden');
