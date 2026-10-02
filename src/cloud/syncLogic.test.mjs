// Schnelltest: node src/cloud/syncLogic.test.mjs
import assert from 'node:assert/strict';
import { decideSync } from './syncLogic.js';

const r = (t) => ({ modifiedTime: t });
assert.equal(decideSync({ localUpdatedAt: 5, lastSyncedAt: 0, remote: null, remoteVersion: null }), 'create');
// Neues Gerät ohne eigene Änderungen, Cloud hat Daten → laden
assert.equal(decideSync({ localUpdatedAt: 0, lastSyncedAt: 0, remote: r('a'), remoteVersion: null }), 'download');
// Beide Seiten haben unabhängig Daten → Nutzer fragen
assert.equal(decideSync({ localUpdatedAt: 7, lastSyncedAt: 0, remote: r('a'), remoteVersion: null }), 'conflict');
assert.equal(decideSync({ localUpdatedAt: 9, lastSyncedAt: 5, remote: r('a'), remoteVersion: 'a' }), 'upload');
assert.equal(decideSync({ localUpdatedAt: 5, lastSyncedAt: 5, remote: r('b'), remoteVersion: 'a' }), 'download');
assert.equal(decideSync({ localUpdatedAt: 5, lastSyncedAt: 5, remote: r('a'), remoteVersion: 'a' }), 'none');
assert.equal(decideSync({ localUpdatedAt: 9, lastSyncedAt: 5, remote: r('b'), remoteVersion: 'a' }), 'conflict');
console.log('syncLogic.js: alle Tests bestanden');
