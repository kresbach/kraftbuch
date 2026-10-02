// Schnelltest: node src/utils/training.test.mjs
import assert from 'node:assert/strict';
import { estimate1RM, platesPerSide, startOfWeek } from './training.js';

assert.equal(estimate1RM(100, 1), 100);
assert.equal(Math.round(estimate1RM(100, 5)), 117);
assert.deepEqual(platesPerSide(100).map((p) => p.kg), [25, 15]);
assert.deepEqual(platesPerSide(62.5).map((p) => p.kg), [20, 1.25]);
assert.equal(platesPerSide(20), null);
assert.equal(platesPerSide(21), null);
assert.equal(startOfWeek(new Date('2026-10-04T12:00:00')).getDay(), 1); // Sonntag → Montag davor
console.log('training.js: alle Tests bestanden');
