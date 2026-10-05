import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { useI18n } from '../i18n/index.jsx';
import { recordCounts } from '../utils/training.js';
import { renderSummary } from '../utils/shareImage.js';
import { saveFile } from '../utils/saveFile.js';
import { Icon } from './Icon.jsx';

/**
 * „Teilen“: Zusammenfassung als Bild. Das Bild wird schon vorab erzeugt – das Teilen-Menü (v. a. iOS)
 * muss direkt beim Tippen aufgehen, ohne vorher auf das Zeichnen zu warten.
 */
export function ShareWorkout({ workout, className = 'btn btn-small' }) {
  const { state, exercises } = useStore();
  const { t, exParts, planName } = useI18n();
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const records = useMemo(() => recordCounts(state.workouts).get(workout.id) ?? 0, [state.workouts, workout.id]);

  useEffect(() => {
    let alive = true;
    renderSummary(workout, { title: planName(workout.planId, workout.name), exercises, exLabel: exParts, t, records })
      .then((blob) => alive && blob && setFile(new File([blob], `Kraftbuch-${workout.startedAt.slice(0, 10)}.png`, { type: 'image/png' })))
      .catch(() => {});
    return () => { alive = false; };
  }, [workout, exercises, records, exParts, planName, t]);

  return (
    <>
      <button type="button" className={className} disabled={!file}
        onClick={() => saveFile(file).then((how) => setMsg(how === 'downloaded' ? t('share.downloaded') : '')).catch(() => {})}>
        <Icon name="share" size={16} /> {t('share.button')}
      </button>
      {msg && <span className="muted small" role="status">{msg}</span>}
    </>
  );
}
