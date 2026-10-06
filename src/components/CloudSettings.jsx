import { useRef, useState } from 'react';
import { useCloudSync } from '../cloud/CloudSync.jsx';
import { useI18n } from '../i18n/index.jsx';

const PROVIDERS = [
  { id: 'off', label: 'cloud.provider.off' },
  { id: 'google', label: 'cloud.provider.google' },
  { id: 'icloud', label: 'cloud.provider.icloud' },
];

/** „vor 5 min“ / „5 min ago“ */
export function fmtAgo(ts, { t, locale }) {
  if (!ts) return t('ago.never');
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return t('ago.now');
  if (min < 60) return t('ago.min', { n: min });
  if (min < 24 * 60) return t('ago.hours', { n: Math.round(min / 60) });
  return new Date(ts).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Übersetzt eine Rückmeldung {msg, vars} aus der Cloud-Logik. */
const say = (t, r) => (r?.msg ? t(r.msg, r.vars) : '');

// Einstellung „Speicherort“: nur Gerät, Google Drive (automatisch) oder iCloud Drive (Sicherungsdatei).
export function CloudSettings() {
  const cloud = useCloudSync();
  const i18n = useI18n();
  const { t } = i18n;
  const fileRef = useRef(null);
  const [result, setResult] = useState(null);

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setResult(await cloud.restoreFromFile(file));
  }

  return (
    <section className="section">
      <h2>{t('cloud.title')}</h2>
      <div className="segmented" role="radiogroup" aria-label={t('cloud.title')}>
        {PROVIDERS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={cloud.provider === p.id}
            className={cloud.provider === p.id ? 'is-on' : ''}
            onClick={() => { cloud.setProvider(p.id); setResult(null); }}>
            {t(p.label)}
          </button>
        ))}
      </div>

      {cloud.provider === 'off' && <p className="muted small">{t('cloud.offText')}</p>}

      {cloud.provider === 'google' && <GoogleSection cloud={cloud} />}

      {cloud.provider === 'icloud' && (
        <>
          <p className="muted small">{t('cloud.icloudText')}</p>
          <SyncLine label={t('cloud.lastBackup')} value={fmtAgo(cloud.lastSyncedAt, i18n)} />
          <div className="row-actions">
            <button className="btn btn-primary" onClick={async () => setResult(await cloud.backupToFile())}>
              {t('cloud.icloudSave')}
            </button>
          </div>
        </>
      )}

      <div className="row-actions">
        {cloud.provider !== 'icloud' && (
          <button className="btn" onClick={async () => setResult(await cloud.backupToFile())}>{t('cloud.saveFile')}</button>
        )}
        <button className="btn" onClick={() => fileRef.current?.click()}>{t('cloud.loadFile')}</button>
        <input ref={fileRef} id="import-file" type="file" accept="application/json,.json" hidden onChange={onFile} />
      </div>
      {result && <p className="note" role="status">{say(t, result)}</p>}
    </section>
  );
}

function GoogleSection({ cloud }) {
  const i18n = useI18n();
  const { t } = i18n;
  if (!cloud.googleAvailable) return <p className="note">{t('cloud.googleMissing')}</p>;

  const { status, conflict } = cloud;
  return (
    <>
      <p className="muted small">{t('cloud.googleText')}</p>
      {cloud.googleConnected && <SyncLine label={t('cloud.lastSync')} value={fmtAgo(cloud.lastSyncedAt, i18n)} />}

      {conflict ? (
        <div className="note conflict" role="alert">
          <p><strong>{t('cloud.conflictTitle')}</strong> {say(t, status)}</p>
          <p className="small">
            {t('cloud.conflictDetail', { workouts: conflict.data.workouts?.length ?? 0, plans: conflict.data.plans?.length ?? 0 })}
          </p>
          <div className="row-actions">
            <button className="btn btn-small" onClick={() => cloud.resolveConflict('cloud')}>{t('cloud.keepCloud')}</button>
            <button className="btn btn-small" onClick={() => cloud.resolveConflict('device')}>{t('cloud.keepDevice')}</button>
          </div>
        </div>
      ) : (
        <div className="row-actions">
          <button className="btn btn-primary" disabled={status.phase === 'syncing'} onClick={cloud.syncNow}>
            {cloud.googleConnected ? t('cloud.syncNow') : t('cloud.connect')}
          </button>
        </div>
      )}
      {status.msg && !conflict && (
        <p className={status.phase === 'error' || status.phase === 'needs_auth' ? 'note' : 'muted small'} role="status">{say(t, status)}</p>
      )}
    </>
  );
}

function SyncLine({ label, value }) {
  return <p className="small"><span className="muted">{label}:</span> <strong>{value}</strong></p>;
}

/** Hinweis auf dem Startbildschirm, wenn eine Sicherung oder Anmeldung fällig ist. */
export function CloudBanner() {
  const cloud = useCloudSync();
  const i18n = useI18n();
  const { t } = i18n;
  const [result, setResult] = useState(null);

  if (result) return <p className="note" role="status">{say(t, result)}</p>;
  if (cloud.needsBackup) {
    return (
      <div className="note banner">
        <span>{t('banner.backup', { ago: fmtAgo(cloud.lastSyncedAt, i18n) })}</span>
        <button className="btn btn-small" onClick={async () => setResult(await cloud.backupToFile())}>{t('banner.backupNow')}</button>
      </div>
    );
  }
  // Abgelaufene Google-Anmeldung wird nur in den Einstellungen gezeigt (Speicherort → Jetzt synchronisieren),
  // nicht hier. Ein Konflikt braucht dagegen eine Entscheidung und wird weiter angezeigt.
  if (cloud.provider === 'google' && cloud.conflict) {
    return <div className="note banner"><span>{t('banner.conflict')}</span></div>;
  }
  return null;
}
