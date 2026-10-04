import { useMemo, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { Icon } from '../components/Icon.jsx';
import { ProgressChart } from '../components/ProgressChart.jsx';
import { Sheet } from '../components/Sheet.jsx';
import { useUndo } from '../components/Undo.jsx';
import { cleanKg, cleanReps, estimate1RM, exerciseVolume, recordCounts, fmtDate, fmtDuration, fmtNum, fmtWeight, parseNum, workoutVolume } from '../utils/training.js';
import { useI18n } from '../i18n/index.jsx';

const SECTIONS = [
  { id: 'list', label: 'history.workouts' },
  { id: 'progress', label: 'history.progress' },
];

export default function HistoryView() {
  const [section, setSection] = useState('list');
  const { t } = useI18n();
  return (
    <>
      <header className="page-head">
        <h1>{t('tab.history')}</h1>
      </header>
      <div className="segmented" role="tablist">
        {SECTIONS.map((s) => (
          <button key={s.id} role="tab" aria-selected={section === s.id} className={section === s.id ? 'is-on' : ''} onClick={() => setSection(s.id)}>
            {t(s.label)}
          </button>
        ))}
      </div>
      <div className="section">
        {section === 'list' && <WorkoutList />}
        {section === 'progress' && <Progress />}
      </div>
    </>
  );
}

/* ---------- Liste der abgeschlossenen Trainings ---------- */

/** Wiederholungen bzw. Sekunden einer Übung anzeigen */
const fmtSet = (s, info, t) => {
  const reps = info?.timed ? `${s.reps} s` : null;
  if (s.kg) return `${fmtNum(s.kg)} × ${reps ?? s.reps}`;
  return reps ?? `${s.reps} ${t('workout.reps')}`;
};

function WorkoutList() {
  const { state, exercises } = useStore();
  const { t, exName, planName } = useI18n();
  const withUndo = useUndo();
  const [open, setOpen] = useState(null);
  const [editing, setEditing] = useState(null);
  const records = useMemo(() => recordCounts(state.workouts), [state.workouts]);

  if (state.workouts.length === 0) {
    return <p className="muted">{t('history.empty')}</p>;
  }

  return (
    <>
      <ul className="cards cards-grid">
        {state.workouts.map((w) => {
          const isOpen = open === w.id;
          const sets = w.exercises.reduce((n, ex) => n + ex.sets.length, 0);
          return (
            <li key={w.id} className="card">
              <button className="card-button history-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : w.id)}>
                <span className="history-text">
                  <span className="eyebrow">{fmtDate(w.startedAt)}</span>
                  <h3>{planName(w.planId, w.name)}</h3>
                  <span className="muted small num">
                    {fmtDuration(new Date(w.finishedAt) - new Date(w.startedAt))} · {t('history.sets', { n: sets })}
                  </span>
                  {records.get(w.id) > 0 && <span className="pill pill-record"><Icon name="trophy" size={14} /> {t('records.count', { n: records.get(w.id) })}</span>}
                </span>
                <span className="history-moved">
                  <span className="moved-value num">{fmtWeight(workoutVolume(w))}</span>
                  <span className="muted small">{t('workout.moved')}</span>
                </span>
              </button>
              {isOpen && (
                <div className="workout-detail">
                  {w.note?.trim() && <p className="detail-note">{w.note.trim()}</p>}
                  {w.exercises.map((ex, i) => {
                    const info = exercises.get(ex.exerciseId);
                    const v = exerciseVolume(ex);
                    return (
                      <div key={i} className="detail-line">
                        <span className="detail-title">
                          <strong>{info ? exName(info) : t('history.deletedExercise')}</strong>
                          {v > 0 && <span className="muted small num">{fmtWeight(v)}</span>}
                        </span>
                        <span className="muted num">{ex.sets.map((s) => fmtSet(s, info, t)).join(' · ')}</span>
                        {ex.note?.trim() && <span className="small detail-note">{ex.note.trim()}</span>}
                      </div>
                    );
                  })}
                  <div className="row-actions">
                    <button className="btn btn-small" onClick={() => setEditing(w)}>
                      <Icon name="edit" size={16} /> {t('common.edit')}
                    </button>
                    <button className="btn btn-small btn-ghost danger"
                      onClick={() => withUndo(t('undo.workoutDeleted'), { type: 'history/delete', id: w.id }, ['workouts'])}>
                      <Icon name="trash" size={16} /> {t('history.delete')}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {editing && <WorkoutEditor workout={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

/* ---------- Abgeschlossenes Training nachträglich korrigieren ---------- */

function WorkoutEditor({ workout, onClose }) {
  const { dispatch, exercises } = useStore();
  const { t, exName, planName } = useI18n();
  const withUndo = useUndo();
  const [note, setNote] = useState(workout.note ?? '');
  const [draft, setDraft] = useState(() => workout.exercises.map((ex) => ({
    ...ex, sets: ex.sets.map((s) => ({ kg: s.kg ? String(s.kg).replace('.', ',') : '', reps: String(s.reps) })),
  })));

  const update = (fn) => setDraft((d) => fn(structuredClone(d)));
  const setField = (i, j, key, value) => update((d) => { d[i].sets[j][key] = value; return d; });
  const addSet = (i) => update((d) => { const last = d[i].sets.at(-1); d[i].sets.push({ kg: last?.kg ?? '', reps: last?.reps ?? '' }); return d; });
  const removeSet = (i, j) => update((d) => { d[i].sets.splice(j, 1); return d; });
  const setExNote = (i, value) => update((d) => { d[i].note = value; return d; });
  const removeExercise = (i) => update((d) => { d.splice(i, 1); return d; });

  function save(e) {
    e.preventDefault();
    const cleaned = draft
      .map((ex) => ({
        ...ex,
        sets: ex.sets.filter((s) => parseNum(s.reps) > 0).map((s) => ({ kg: parseNum(s.kg), reps: parseNum(s.reps), done: true })),
      }))
      .filter((ex) => ex.sets.length > 0);
    if (cleaned.length === 0) withUndo(t('undo.workoutDeleted'), { type: 'history/delete', id: workout.id }, ['workouts']);
    else dispatch({ type: 'history/update', workout: { ...workout, note, exercises: cleaned } });
    onClose();
  }

  return (
    <Sheet title={`${planName(workout.planId, workout.name)} · ${fmtDate(workout.startedAt)}`} onClose={onClose}>
      <form className="form" onSubmit={save}>
        {draft.map((ex, i) => {
          const info = exercises.get(ex.exerciseId);
          const repsLabel = info?.timed ? t('workout.seconds') : t('workout.reps');
          return (
            <section key={i} className="edit-exercise">
              <header className="exercise-head">
                <h3>{info ? exName(info) : t('history.deletedExercise')}</h3>
                <button type="button" className="icon-btn danger" aria-label={t('planEditor.remove')} onClick={() => removeExercise(i)}>
                  <Icon name="trash" size={18} />
                </button>
              </header>
              <div className="set-table" role="table">
                <div className="set-row set-row-head" role="row">
                  <span role="columnheader">{t('workout.set')}</span>
                  <span role="columnheader">kg</span>
                  <span role="columnheader">{repsLabel}</span>
                  <span role="columnheader" className="sr-only">{t('history.removeSet')}</span>
                </div>
                {ex.sets.map((s, j) => (
                  <div key={j} className="set-row" role="row">
                    <span className="set-no num" role="cell">{j + 1}</span>
                    <input id={`h-${i}-${j}-kg`} className="num-input" role="cell" inputMode="decimal" placeholder="–" value={s.kg}
                      aria-label={t('workout.ariaWeight', { n: j + 1 })} onChange={(e) => { const v = cleanKg(e.target.value); if (v != null) setField(i, j, 'kg', v); }} />
                    <input id={`h-${i}-${j}-reps`} className="num-input" role="cell" inputMode="numeric" placeholder="–" value={s.reps}
                      aria-label={t(info?.timed ? 'workout.ariaSeconds' : 'workout.ariaReps', { n: j + 1 })} onChange={(e) => { const v = cleanReps(e.target.value); if (v != null) setField(i, j, 'reps', v); }} />
                    <button type="button" role="cell" className="icon-btn danger set-remove" aria-label={t('history.removeSet')} onClick={() => removeSet(i, j)}>
                      <Icon name="close" size={18} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-small" onClick={() => addSet(i)}><Icon name="plus" size={16} /> {t('workout.set')}</button>
              <textarea id={`h-${i}-note`} className="text-input" rows={1} value={ex.note ?? ''} placeholder={t('notes.exercisePlaceholder')}
                aria-label={t('notes.exercise')} onChange={(e) => setExNote(i, e.target.value)} />
            </section>
          );
        })}
        <label className="field">
          <span className="field-label">{t('notes.workout')}</span>
          <textarea id="h-note" className="text-input" rows={2} value={note} placeholder={t('notes.workoutPlaceholder')} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary btn-block"><Icon name="check" size={18} /> {t('history.save')}</button>
      </form>
    </Sheet>
  );
}

/* ---------- Fortschritt je Übung ---------- */

function Progress() {
  const { state, exercises } = useStore();
  const { t, exName } = useI18n();

  // Übungen, die im Verlauf vorkommen – die häufigste zuerst
  const trained = useMemo(() => {
    const count = new Map();
    for (const w of state.workouts) for (const ex of w.exercises) count.set(ex.exerciseId, (count.get(ex.exerciseId) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).filter((id) => exercises.has(id));
  }, [state.workouts, exercises]);

  const [selected, setSelected] = useState(trained[0] ?? '');
  const exerciseId = trained.includes(selected) ? selected : trained[0];

  if (!exerciseId) {
    return <p className="muted">{t('progress.empty')}</p>;
  }

  const info = exercises.get(exerciseId);
  const isBodyweight = info.type === 'bodyweight';
  const timed = !!info.timed;
  const sessions = state.workouts
    .map((w) => ({ date: w.startedAt, sets: w.exercises.find((e) => e.exerciseId === exerciseId)?.sets ?? [] }))
    .filter((s) => s.sets.length)
    .reverse(); // älteste zuerst

  const points = sessions.map((s) => ({
    date: s.date,
    value: isBodyweight
      ? Math.max(...s.sets.map((x) => x.reps))
      : Math.round(Math.max(...s.sets.map((x) => estimate1RM(x.kg, x.reps))) * 10) / 10,
  }));
  const allSets = sessions.flatMap((s) => s.sets);
  const heaviest = allSets.reduce((a, b) => (b.kg > a.kg || (b.kg === a.kg && b.reps > a.reps) ? b : a), allSets[0]);
  const best = Math.max(...points.map((p) => p.value));
  const first = points[0].value;

  return (
    <>
      <div className="progress-layout">
      <div className="progress-side">
      <label className="field">
        <span className="field-label">{t('progress.exercise')}</span>
        <select id="progress-exercise" className="text-input" value={exerciseId} onChange={(e) => setSelected(e.target.value)}>
          {trained.map((id) => <option key={id} value={id}>{exName(exercises.get(id))}</option>)}
        </select>
      </label>

      <section className="stats">
        <div className="stat">
          <span className="stat-value num">{fmtNum(best)}</span>
          <span className="stat-label">{t(timed ? 'progress.longest' : isBodyweight ? 'progress.mostReps' : 'progress.best1rm')}</span>
        </div>
        <div className="stat">
          <span className="stat-value num">{heaviest.kg ? `${fmtNum(heaviest.kg)}×${heaviest.reps}` : heaviest.reps}{timed ? ' s' : ''}</span>
          <span className="stat-label">{t(isBodyweight ? 'progress.bestSet' : 'progress.heaviestSet')}</span>
        </div>
        <div className="stat">
          <span className={`stat-value num ${best > first ? 'up' : ''}`}>{best > first ? '+' : ''}{fmtNum(Math.round((best - first) * 10) / 10)}</span>
          <span className="stat-label">{t('progress.sinceFirst')}</span>
        </div>
      </section>
      </div>

      <div className="card chart-card">
        <h3 className="small muted">{t(timed ? 'progress.chartSeconds' : isBodyweight ? 'progress.chartReps' : 'progress.chart1rm')}</h3>
        <ProgressChart points={points} unit={timed ? 's' : isBodyweight ? t('workout.reps') : 'kg'} />
      </div>
      </div>
    </>
  );
}
