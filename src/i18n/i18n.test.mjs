// Schnelltest: node src/i18n/i18n.test.mjs
// Prüft, dass Deutsch und Englisch dieselben Schlüssel haben, alle im Code benutzten
// Schlüssel existieren und jede Standardübung, Muskelgruppe und jedes Gerät übersetzt ist.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import de from './de.js';
import en from './en.js';
import { DEFAULT_EXERCISES, EQUIPMENT, MUSCLE_GROUPS } from '../data/exercises.js';
import { DEFAULT_PLANS } from '../data/defaultPlans.js';

const deKeys = Object.keys(de.text).sort();
const enKeys = Object.keys(en.text).sort();
assert.deepEqual(enKeys.filter((k) => !de.text[k]), [], 'Schlüssel nur in en');
assert.deepEqual(deKeys.filter((k) => !en.text[k]), [], 'Schlüssel nur in de');

// Alle Quelltexte nach t('…'), msg: '…', label: 'a.b' und t(x ? '…' : '…') durchsuchen
const files = [];
const walk = (dir) => readdirSync(dir).forEach((f) => {
  const p = join(dir, f);
  if (statSync(p).isDirectory()) walk(p);
  else if (/\.jsx?$/.test(f) && !p.includes('i18n')) files.push(p);
});
walk(new URL('..', import.meta.url).pathname);
const used = new Set();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*'([\w.]+)'/g)) used.add(m[1]);
  for (const m of src.matchAll(/\bmsg: [`']([\w.]+)[`']/g)) used.add(m[1]);
  for (const m of src.matchAll(/label: '(\w+\.[\w.]+)'/g)) used.add(m[1]);
  for (const m of src.matchAll(/\bt\([^()]*\? '([\w.]+)' : '([\w.]+)'\)/g)) used.add(m[1]).add(m[2]);
}
for (const code of ['gisLoad', 'signInRejected', 'signInCancelled', 'http', 'corrupt', 'unknown']) used.add(`cloud.err.${code}`);
used.add('exercise.unknown').add('training.free');
const missing = [...used].filter((k) => !de.text[k]);
assert.deepEqual(missing, [], 'im Code benutzt, aber nicht übersetzt');

assert.deepEqual(DEFAULT_EXERCISES.filter((e) => !en.exercises[e.id]).map((e) => e.id), [], 'Übung ohne englischen Namen');
assert.deepEqual(Object.keys(en.exercises).filter((id) => !DEFAULT_EXERCISES.some((e) => e.id === id)), [], 'englischer Name ohne Übung');
assert.deepEqual(MUSCLE_GROUPS.filter((g) => !en.groups[g]), []);
assert.deepEqual(EQUIPMENT.filter((g) => !en.equipment[g]), []);
assert.deepEqual(DEFAULT_PLANS.filter((p) => !en.plans[p.id]), []);
console.log(`i18n: ${deKeys.length} Texte, ${used.size} im Code benutzt, ${DEFAULT_EXERCISES.length} Übungen – alles übersetzt`);
