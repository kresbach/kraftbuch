import { useRef, useState } from 'react';
import { useCloudSync } from '../cloud/CloudSync.jsx';

const PROVIDERS = [
  { id: 'off', label: 'Nur Gerät' },
  { id: 'google', label: 'Google Drive' },
  { id: 'icloud', label: 'iCloud Drive' },
];

export function fmtAgo(ts) {
  if (!ts) return 'noch nie';
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} min`;
  if (min < 24 * 60) return `vor ${Math.round(min / 60)} h`;
  return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Einstellung „Speicherort“: nur Gerät, Google Drive (automatisch) oder iCloud Drive (Sicherungsdatei).
export function CloudSettings() {
  const cloud = useCloudSync();
  const fileRef = useRef(null);
  const [message, setMessage] = useState('');

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setMessage((await cloud.restoreFromFile(file)).message);
  }

  return (
    <section className="section">
      <h2>Speicherort</h2>
      <div className="segmented" role="radiogroup" aria-label="Speicherort">
        {PROVIDERS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={cloud.provider === p.id}
            className={cloud.provider === p.id ? 'is-on' : ''}
            onClick={() => { cloud.setProvider(p.id); setMessage(''); }}>
            {p.label}
          </button>
        ))}
      </div>

      {cloud.provider === 'off' && (
        <p className="muted small">
          Deine Daten liegen nur in diesem Browser. Wähle Google Drive oder iCloud Drive, damit sie beim Löschen der
          Browserdaten oder beim Handywechsel nicht verloren gehen.
        </p>
      )}

      {cloud.provider === 'google' && <GoogleSection cloud={cloud} />}

      {cloud.provider === 'icloud' && (
        <>
          <p className="muted small">
            Tippe auf „In iCloud Drive sichern“ und wähle im Teilen-Menü <strong>„In Dateien sichern“ → iCloud Drive</strong>.
            Ersetze dabei die alte Datei. Auf einem neuen Gerät lädst du sie mit „Sicherung laden“ zurück.
            Die App erinnert dich, wenn es neue Daten gibt.
          </p>
          <SyncLine label="Letzte Sicherung" ts={cloud.lastSyncedAt} />
          <div className="row-actions">
            <button className="btn btn-primary" onClick={async () => setMessage((await cloud.backupToFile()).message)}>
              In iCloud Drive sichern
            </button>
          </div>
        </>
      )}

      <div className="row-actions">
        {cloud.provider !== 'icloud' && (
          <button className="btn" onClick={async () => setMessage((await cloud.backupToFile()).message)}>Als Datei sichern</button>
        )}
        <button className="btn" onClick={() => fileRef.current?.click()}>Sicherung laden</button>
        <input ref={fileRef} id="import-file" type="file" accept="application/json,.json" hidden onChange={onFile} />
      </div>
      {message && <p className="note" role="status">{message}</p>}
    </section>
  );
}

function GoogleSection({ cloud }) {
  if (!cloud.googleAvailable) {
    return (
      <p className="note">
        Google Drive ist für diese Installation noch nicht eingerichtet: Es fehlt die Google-Client-ID.
        Die Schritte stehen in der README unter „Google Drive einrichten“.
      </p>
    );
  }
  const { status, conflict } = cloud;
  return (
    <>
      <p className="muted small">
        Deine Daten werden automatisch als Datei <strong>Kraftbuch-Daten.json</strong> in deinem Google Drive gespeichert und
        mit allen Geräten abgeglichen, auf denen du dich anmeldest. Die App sieht nur diese eine Datei.
      </p>
      {cloud.googleConnected && <SyncLine label="Zuletzt synchronisiert" ts={cloud.lastSyncedAt} />}

      {conflict ? (
        <div className="note conflict" role="alert">
          <p><strong>Welche Daten sollen gelten?</strong> {status.message}</p>
          <p className="small">
            Google Drive: {conflict.data.workouts?.length ?? 0} Trainings, {conflict.data.plans?.length ?? 0} Pläne.
            Die andere Version wird überschrieben.
          </p>
          <div className="row-actions">
            <button className="btn btn-small" onClick={() => cloud.resolveConflict('cloud')}>Google-Drive-Daten laden</button>
            <button className="btn btn-small" onClick={() => cloud.resolveConflict('device')}>Daten dieses Geräts behalten</button>
          </div>
        </div>
      ) : (
        <div className="row-actions">
          <button className="btn btn-primary" disabled={status.phase === 'syncing'} onClick={cloud.syncNow}>
            {cloud.googleConnected ? 'Jetzt synchronisieren' : 'Mit Google Drive verbinden'}
          </button>
        </div>
      )}
      {status.message && !conflict && (
        <p className={status.phase === 'error' || status.phase === 'needs_auth' ? 'note' : 'muted small'} role="status">{status.message}</p>
      )}
    </>
  );
}

function SyncLine({ label, ts }) {
  return <p className="small"><span className="muted">{label}:</span> <strong>{fmtAgo(ts)}</strong></p>;
}

/** Hinweis auf dem Startbildschirm, wenn eine Sicherung oder Anmeldung fällig ist. */
export function CloudBanner() {
  const cloud = useCloudSync();
  const [message, setMessage] = useState('');

  if (message) return <p className="note" role="status">{message}</p>;
  if (cloud.needsBackup) {
    return (
      <div className="note banner">
        <span>Neue Daten seit der letzten iCloud-Sicherung ({fmtAgo(cloud.lastSyncedAt)}).</span>
        <button className="btn btn-small" onClick={async () => setMessage((await cloud.backupToFile()).message)}>Jetzt sichern</button>
      </div>
    );
  }
  if (cloud.provider === 'google' && cloud.googleConnected && (cloud.status.phase === 'needs_auth' || cloud.conflict)) {
    return (
      <div className="note banner">
        <span>{cloud.conflict ? 'Google Drive: Bitte wähle unter Verlauf → Einstellungen, welche Daten gelten.' : 'Google Drive wartet auf deine Anmeldung.'}</span>
        {!cloud.conflict && <button className="btn btn-small" onClick={cloud.syncNow}>Synchronisieren</button>}
      </div>
    );
  }
  return null;
}
