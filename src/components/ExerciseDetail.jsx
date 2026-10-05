import { useStore } from '../state/store.jsx';
import { useI18n } from '../i18n/index.jsx';
import { fmtDate, fmtW } from '../utils/training.js';
import { ExerciseProgress } from '../views/HistoryView.jsx';
import { Sheet } from './Sheet.jsx';
import { Icon } from './Icon.jsx';

// Pausenzeiten zur Auswahl: null = Standard aus den Einstellungen, 0 = keine Pause
const RESTS = [null, 0, 60, 90, 120, 180, 300];

/** Alles zu einer Übung: Favorit, eigene Pausenzeit, Bestwerte, Diagramm und frühere Trainings mit Notizen. */
export function ExerciseDetail({ exercise: e, onClose, onEdit }) {
  const { state, dispatch } = useStore();
  const { t, exParts, group } = useI18n();
  const { name, tag } = exParts(e);
  const fav = state.settings.favorites?.includes(e.id);
  const ownRest = state.settings.restByExercise?.[e.id];
  const fmtRest = (s) => (s === 0 ? t('settings.off') : s < 120 ? `${s} s` : `${s / 60} min`);

  // Frühere Trainings mit dieser Übung, neuestes zuerst
  const sessions = state.workouts
    .map((w) => ({ w, ex: w.exercises.find((x) => x.exerciseId === e.id) }))
    .filter((s) => s.ex?.sets.length)
    .slice(0, 30);
  const fmtSet = (s) => (s.kg ? `${fmtW(s.kg)} × ${s.reps}${e.timed ? ' s' : ''}` : e.timed ? `${s.reps} s` : `${s.reps} ${t('workout.reps')}`);

  return (
    <Sheet tall title={name} onClose={onClose}>
      <div className="detail-head">
        <span className="muted small">{tag && <><span className="ex-tag">{tag}</span> · </>}{group(e.group)}</span>
        <div className="row-actions">
          <button type="button" className={`btn btn-small ${fav ? 'is-fav' : ''}`} aria-pressed={!!fav} onClick={() => dispatch({ type: 'favorite/toggle', id: e.id })}>
            <Icon name="star" size={16} /> {t(fav ? 'favorites.remove' : 'favorites.add')}
          </button>
          {e.custom && (
            <button type="button" className="btn btn-small" onClick={onEdit}><Icon name="edit" size={16} /> {t('common.edit')}</button>
          )}
        </div>
      </div>

      <fieldset className="field">
        <legend className="field-label">{t('detail.rest')}</legend>
        <div className="chips">
          {RESTS.map((s) => {
            const on = s == null ? ownRest == null : ownRest === s;
            return (
              <button key={String(s)} type="button" className={`chip ${on ? 'is-on' : ''}`}
                onClick={() => dispatch({ type: 'exercise/rest', id: e.id, seconds: s })}>
                {s == null ? t('detail.restDefault', { value: fmtRest(state.settings.restSeconds) }) : fmtRest(s)}
              </button>
            );
          })}
        </div>
      </fieldset>

      {sessions.length > 0 ? (
        <>
          <ExerciseProgress exerciseId={e.id} compact />
          <section className="section">
            <h3 className="group-title">{t('detail.history')}</h3>
            <ul className="list detail-sessions">
              {sessions.map(({ w, ex }) => (
                <li key={w.id} className="detail-session">
                  <span className="eyebrow">{fmtDate(w.startedAt)}</span>
                  <span className="num">{ex.sets.map(fmtSet).join(' · ')}</span>
                  {ex.note?.trim() && <span className="small detail-note">{ex.note.trim()}</span>}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <p className="muted">{t('detail.never')}</p>
      )}
    </Sheet>
  );
}
