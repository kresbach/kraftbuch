// Cloud-Speicherung: automatischer Abgleich mit Google Drive oder Sicherung nach iCloud Drive.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { isBackup, syncedData } from '../state/reducer.js';
import { decideSync } from './syncLogic.js';
import { saveFile } from '../utils/saveFile.js';
import { AuthRequired, DriveError, GOOGLE_CLIENT_ID, downloadFile, findFile, signIn, uploadFile } from './googleDrive.js';

const META_KEY = 'kraftbuch:sync';
const EMPTY_META = { provider: 'off', lastSyncedAt: 0, remoteVersion: null, fileId: null, token: null, tokenExpiresAt: 0 };
const BACKUP_REMINDER_MS = 24 * 60 * 60 * 1000;
const IDLE = { phase: 'idle', msg: '' };
// Meldungen sind Übersetzungsschlüssel (msg) mit Werten (vars); die Oberfläche übersetzt sie.

function loadMeta() {
  try {
    return { ...EMPTY_META, ...JSON.parse(localStorage.getItem(META_KEY) || '{}') };
  } catch {
    return EMPTY_META;
  }
}

const CloudContext = createContext(null);

export function CloudSyncProvider({ children }) {
  const { state, dispatch } = useStore();
  const [meta, setMetaState] = useState(loadMeta);
  const [status, setStatus] = useState(IDLE);
  const [conflict, setConflict] = useState(null); // {remote, data}

  // Refs, damit asynchrone Abläufe immer den aktuellen Stand sehen
  const stateRef = useRef(state);
  const metaRef = useRef(meta);
  stateRef.current = state;
  const running = useRef(false);

  const setMeta = useCallback((patch) => {
    const next = { ...metaRef.current, ...patch };
    metaRef.current = next;
    setMetaState(next);
    try {
      localStorage.setItem(META_KEY, JSON.stringify(next));
    } catch {
      // Ohne Speicher gilt der Abgleich nur bis zum Schließen der App.
    }
  }, []);

  const validToken = () => {
    const m = metaRef.current;
    return m.token && m.tokenExpiresAt > Date.now() ? m.token : null;
  };

  // ---- Google Drive ----

  const runGoogleSync = useCallback(async () => {
    if (running.current) return;
    const token = validToken();
    if (!token) {
      setStatus({ phase: 'needs_auth', msg: 'cloud.needsAuth' });
      return;
    }
    running.current = true;
    setStatus({ phase: 'syncing', msg: 'cloud.syncing' });
    try {
      const m = metaRef.current;
      const remote = await findFile(token);
      const action = decideSync({
        localUpdatedAt: stateRef.current.updatedAt,
        lastSyncedAt: m.lastSyncedAt,
        remote,
        remoteVersion: m.remoteVersion,
      });
      if (action === 'conflict') {
        const data = await downloadFile(token, remote.id);
        setConflict({ remote, data });
        setStatus({ phase: 'conflict', msg: 'cloud.conflict' });
        return;
      }
      if (action === 'download') {
        const data = await downloadFile(token, remote.id);
        if (!isBackup(data)) throw new DriveError('corrupt');
        dispatch({ type: 'data/replace', data });
        setMeta({ lastSyncedAt: data.updatedAt || Date.now(), remoteVersion: remote.modifiedTime, fileId: remote.id });
      } else if (action === 'create' || action === 'upload') {
        const snapshot = stateRef.current;
        const saved = await uploadFile(token, remote?.id, syncedData(snapshot));
        setMeta({ lastSyncedAt: snapshot.updatedAt, remoteVersion: saved.modifiedTime, fileId: saved.id });
      }
      setMeta({ syncedAt: Date.now() });
      setStatus(IDLE);
    } catch (e) {
      if (e instanceof AuthRequired) {
        setMeta({ token: null, tokenExpiresAt: 0 });
        setStatus({ phase: 'needs_auth', msg: 'cloud.authExpired' });
      } else {
        setStatus({ phase: 'error', ...errorStatus(e) });
      }
    } finally {
      running.current = false;
    }
  }, [dispatch, setMeta]);

  /** Aus einem Tippen heraus: bei Bedarf anmelden, dann abgleichen. */
  const syncNow = useCallback(async () => {
    if (!validToken()) {
      try {
        const firstTime = !metaRef.current.fileId && !metaRef.current.lastSyncedAt;
        const { token, expiresAt } = await signIn({ firstTime });
        setMeta({ token, tokenExpiresAt: expiresAt });
      } catch (e) {
        setStatus({ phase: 'needs_auth', ...errorStatus(e) });
        return;
      }
    }
    await runGoogleSync();
  }, [runGoogleSync, setMeta]);

  const resolveConflict = useCallback(async (keep) => {
    const c = conflict;
    setConflict(null);
    if (!c) return;
    if (keep === 'cloud') {
      dispatch({ type: 'data/replace', data: c.data });
      setMeta({ lastSyncedAt: c.data.updatedAt || Date.now(), remoteVersion: c.remote.modifiedTime, fileId: c.remote.id, syncedAt: Date.now() });
      setStatus(IDLE);
    } else {
      // Gerätestand gilt: Cloud-Version als bekannt markieren, dann hochladen
      setMeta({ remoteVersion: c.remote.modifiedTime, lastSyncedAt: 0, fileId: c.remote.id });
      await runGoogleSync();
    }
  }, [conflict, dispatch, runGoogleSync, setMeta]);

  // Automatischer Abgleich: beim Öffnen, beim Zurückkehren in die App und kurz nach Änderungen
  const isGoogle = meta.provider === 'google';
  useEffect(() => {
    if (!isGoogle) return;
    if (validToken()) runGoogleSync();
    const onVisible = () => document.visibilityState === 'visible' && validToken() && runGoogleSync();
    const onOnline = () => validToken() && runGoogleSync();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [isGoogle, runGoogleSync]);

  useEffect(() => {
    if (!isGoogle || !validToken() || state.updatedAt <= metaRef.current.lastSyncedAt) return;
    const t = setTimeout(runGoogleSync, 3000);
    return () => clearTimeout(t);
  }, [isGoogle, state.updatedAt, runGoogleSync]);

  // ---- Datei-Sicherung (iCloud Drive über „In Dateien sichern“) ----

  /** Aus einem Tippen heraus: Sicherung über das Teilen-Menü (iOS) oder als Download speichern. */
  const backupToFile = useCallback(async () => {
    const snapshot = stateRef.current;
    const json = JSON.stringify(syncedData(snapshot), null, 2);
    // Auf dem Handy fester Name (alte Sicherung in iCloud Drive ersetzen), am Desktop mit Datum
    const date = new Date().toISOString().slice(0, 10);
    const name = matchMedia('(pointer: coarse)').matches ? 'Kraftbuch-Backup.json' : `Kraftbuch-Backup-${date}.json`;
    const file = new File([json], name, { type: 'application/json' });
    try {
      const how = await saveFile(file);
      setMeta({ lastSyncedAt: snapshot.updatedAt || Date.now(), lastBackupAt: Date.now() });
      return how === 'downloaded'
        ? { ok: true, msg: 'backup.downloaded', vars: { name } }
        : { ok: true, msg: 'backup.saved' };
    } catch (e) {
      if (e?.name === 'AbortError') return { ok: false, msg: 'backup.cancelled' };
      return { ok: false, msg: 'backup.failed' };
    }
  }, [setMeta]);

  const restoreFromFile = useCallback(async (file) => {
    try {
      const data = JSON.parse(await file.text());
      if (!isBackup(data)) throw new Error();
      // Als neue Änderung übernehmen, damit sie bei Google-Sync auch hochgeladen wird
      dispatch({ type: metaRef.current.provider === 'google' ? 'data/import' : 'data/replace', data });
      if (metaRef.current.provider !== 'google') setMeta({ lastSyncedAt: data.updatedAt || Date.now() });
      return { ok: true, msg: 'backup.loaded', vars: { workouts: data.workouts.length, plans: data.plans.length } };
    } catch {
      return { ok: false, msg: 'backup.invalid' };
    }
  }, [dispatch, setMeta]);

  const setProvider = useCallback((provider) => {
    setConflict(null);
    setStatus(IDLE);
    setMeta({ ...EMPTY_META, provider });
  }, [setMeta]);

  const dirty = state.updatedAt > meta.lastSyncedAt;
  const value = {
    provider: meta.provider,
    setProvider,
    googleAvailable: !!GOOGLE_CLIENT_ID,
    googleConnected: isGoogle && (!!meta.fileId || !!meta.token),
    lastSyncedAt: (meta.provider === 'icloud' ? meta.lastBackupAt : meta.syncedAt) || 0,
    status,
    conflict,
    syncNow,
    resolveConflict,
    backupToFile,
    restoreFromFile,
    needsBackup: meta.provider === 'icloud' && dirty && Date.now() - (meta.lastBackupAt || 0) > BACKUP_REMINDER_MS,
  };
  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
}

function errorStatus(e) {
  if (navigator.onLine === false) return { msg: 'cloud.offline' };
  if (e instanceof DriveError) return { msg: `cloud.err.${e.code}`, vars: e.vars };
  return { msg: 'cloud.err.unknown', vars: { detail: e?.message ?? '' } };
}

export function useCloudSync() {
  return useContext(CloudContext);
}
