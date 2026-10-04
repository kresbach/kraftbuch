// Cloud-Speicherung: automatischer Abgleich mit Google Drive oder Sicherung nach iCloud Drive.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { isBackup, syncedData } from '../state/reducer.js';
import { decideSync } from './syncLogic.js';
import { saveFile } from '../utils/saveFile.js';
import { AuthRequired, DriveError, GOOGLE_CLIENT_ID, downloadFile, findFile, loadGis, setKeepalive, signIn, uploadFile } from './googleDrive.js';

const META_KEY = 'kraftbuch:sync';
const EMPTY_META = { provider: 'off', lastSyncedAt: 0, remoteVersion: null, fileId: null, token: null, tokenExpiresAt: 0 };
const BACKUP_REMINDER_MS = 24 * 60 * 60 * 1000;
const IDLE = { phase: 'idle', msg: '' };
const POLL_MS = 60 * 1000; // bei geöffneter App regelmäßig nach Änderungen anderer Geräte sehen
const CHANGE_DELAY_MS = 2000; // nach einer Änderung kurz warten, dann hochladen
const RENEW_RETRY_MS = 10 * 60 * 1000; // abgelehnte/blockierte stille Neuanmeldung nicht dauernd wiederholen
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
  const signingIn = useRef(false);
  const lastRenewAttempt = useRef(0);

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
      if (signingIn.current) return;
      signingIn.current = true;
      try {
        const firstTime = !metaRef.current.fileId && !metaRef.current.lastSyncedAt;
        const { token, expiresAt } = await signIn({ firstTime });
        setMeta({ token, tokenExpiresAt: expiresAt });
      } catch (e) {
        setStatus({ phase: 'needs_auth', ...errorStatus(e) });
        return;
      } finally {
        signingIn.current = false;
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

  // Automatischer Abgleich: beim Öffnen, beim Zurückkehren in die App, jede Minute solange die App offen
  // ist, kurz nach jeder Änderung und sofort beim Verlassen der App (damit nichts auf dem Gerät hängt).
  const isGoogle = meta.provider === 'google';
  useEffect(() => {
    if (!isGoogle) return;
    loadGis().catch(() => {});
    // Ohne gültige Freigabe nicht stillschweigend aussetzen, sondern den Hinweis zum Anmelden zeigen
    const syncIfPossible = () => {
      if (validToken()) runGoogleSync();
      else if (metaRef.current.fileId) setStatus((st) => (st.phase === 'needs_auth' ? st : { phase: 'needs_auth', msg: 'cloud.authExpired' }));
    };
    syncIfPossible();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') return syncIfPossible();
      // App geht in den Hintergrund: offene Änderungen sofort hochladen
      if (stateRef.current.updatedAt > metaRef.current.lastSyncedAt && validToken()) {
        setKeepalive(true);
        runGoogleSync().finally(() => setKeepalive(false));
      }
    };
    const poll = setInterval(() => document.visibilityState === 'visible' && syncIfPossible(), POLL_MS);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', syncIfPossible);
    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', syncIfPossible);
    };
  }, [isGoogle, runGoogleSync]);

  useEffect(() => {
    if (!isGoogle || state.updatedAt <= metaRef.current.lastSyncedAt) return;
    if (!validToken()) {
      if (metaRef.current.fileId) setStatus({ phase: 'needs_auth', msg: 'cloud.authExpired' });
      return;
    }
    const t = setTimeout(runGoogleSync, CHANGE_DELAY_MS);
    return () => clearTimeout(t);
  }, [isGoogle, state.updatedAt, runGoogleSync]);

  // Google gibt einer Web-App ohne eigenen Server nur eine Freigabe für rund eine Stunde. Ist sie
  // abgelaufen, wird sie beim nächsten Tippen in der App still erneuert – das Google-Fenster schließt
  // sich dabei normalerweise sofort wieder, weil die Zustimmung schon besteht. Ohne Tippen erlaubt der
  // Browser kein Anmeldefenster.
  const wasConnected = isGoogle && (!!meta.fileId || !!meta.lastSyncedAt);
  useEffect(() => {
    if (!wasConnected || !GOOGLE_CLIENT_ID) return;
    const onTap = () => {
      if (validToken() || signingIn.current || Date.now() - lastRenewAttempt.current < RENEW_RETRY_MS) return;
      lastRenewAttempt.current = Date.now();
      signingIn.current = true;
      signIn({ firstTime: false })
        .then(({ token, expiresAt }) => {
          setMeta({ token, tokenExpiresAt: expiresAt });
          runGoogleSync();
        })
        .catch(() => {}) // bleibt bei „Jetzt synchronisieren“
        .finally(() => { signingIn.current = false; });
    };
    document.addEventListener('click', onTap, true);
    return () => document.removeEventListener('click', onTap, true);
  }, [wasConnected, runGoogleSync, setMeta]);

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
