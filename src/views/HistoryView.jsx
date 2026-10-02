import { useMemo, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { Icon } from '../components/Icon.jsx';
import { ConfirmButton } from '../components/ConfirmButton.jsx';
import { ProgressChart } from '../components/ProgressChart.jsx';
import { CloudSettings } from '../components/CloudSettings.jsx';
import { estimate1RM, fmtDate, fmtDuration, fmtKg, fmtNum, workoutVolume } from '../utils/training.js';
import { LANGUAGES, deviceLanguage, useI18n } from '../i18n/index.jsx';

const SECTIONS = [
  { id: 'list', label: 'history.workouts' },
  { id: 'progress', label: 'history.progress' },
  { id: 'settings', label: 'history.settings' },
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
        {section === 'settings' && <Settings />}
      </div>
    </>
  );
}

/* ---------- Liste der abgeschlossenen Trainings ---------- */

function WorkoutList() {
  const { state, dispatch, exercises } = useStore();
  const { t, exName, planName } = useI18n();
  const [open, setOpen] = useState(null);

  if (state.workouts.length === 0) {
    return <p className="muted">{t('history.empty')}</p>;
  }

  return (
    <ul className="cards">
      {state.workouts.map((w) => {
        const isOpen = open === w.id;
        const sets = w.exercises.reduce((n, ex) => n + ex.sets.length, 0);
        return (
          <li key={w.id} className="card">
            <button className="card-button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : w.id)}>
              <span className="eyebrow">{fmtDate(w.startedAt)}</span>
              <h3>{planName(w.planId, w.name)}</h3>
              <span className="muted small num">
                {fmtDuration(new Date(w.finishedAt) - new Date(w.startedAt))} · {t('history.sets', { n: sets })} · {fmtKg(Math.round(workoutVolume(w)))}
              </span>
            </button>
            {isOpen && (
              <div className="workout-detail">
                {w.exercises.map((ex, i) => (
                  <div key={i} className="detail-line">
                    <strong>{exercises.has(ex.exerciseId) ? exName(exercises.get(ex.exerciseId)) : t('history.deletedExercise')}</strong>
                    <span className="muted num">{ex.sets.map((s) => (s.kg ? `${fmtNum(s.kg)} × ${s.reps}` : `${s.reps} ${t('workout.reps')}`)).join(' · ')}</span>
                  </div>
                ))}
                <ConfirmButton className="btn btn-small btn-ghost danger" confirmLabel={t('history.deleteConfirm')} onConfirm={() => dispatch({ type: 'history/delete', id: w.id })}>
                  <Icon name="trash" size={16} /> {t('history.delete')}
                </ConfirmButton>
              </div>
            )}
          </li>
        );
      })}
    </ul>
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
      <label className="field">
        <span className="field-label">{t('progress.exercise')}</span>
        <select id="progress-exercise" className="text-input" value={exerciseId} onChange={(e) => setSelected(e.target.value)}>
          {trained.map((id) => <option key={id} value={id}>{exName(exercises.get(id))}</option>)}
        </select>
      </label>

      <section className="stats">
        <div className="stat">
          <span className="stat-value num">{fmtNum(best)}</span>
          <span className="stat-label">{t(isBodyweight ? 'progress.mostReps' : 'progress.best1rm')}</span>
        </div>
        <div className="stat">
          <span className="stat-value num">{heaviest.kg ? `${fmtNum(heaviest.kg)}×${heaviest.reps}` : heaviest.reps}</span>
          <span className="stat-label">{t(isBodyweight ? 'progress.bestSet' : 'progress.heaviestSet')}</span>
        </div>
        <div className="stat">
          <span className={`stat-value num ${best > first ? 'up' : ''}`}>{best > first ? '+' : ''}{fmtNum(Math.round((best - first) * 10) / 10)}</span>
          <span className="stat-label">{t('progress.sinceFirst')}</span>
        </div>
      </section>

      <div className="card chart-card">
        <h3 className="small muted">{t(isBodyweight ? 'progress.chartReps' : 'progress.chart1rm')}</h3>
        <ProgressChart points={points} unit={isBodyweight ? t('workout.reps') : 'kg'} />
      </div>
    </>
  );
}

/* ---------- Einstellungen & Datensicherung ---------- */

function Settings() {
  const { state, dispatch } = useStore();
  const { t, lang } = useI18n();

  return (
    <>
      <fieldset className="field">
        <legend className="field-label">{t('settings.language')}</legend>
        <div className="segmented" role="radiogroup" aria-label={t('settings.language')}>
          {LANGUAGES.map((l) => (
            <button key={l.id} type="button" role="radio" aria-checked={lang === l.id} lang={l.id}
              className={lang === l.id ? 'is-on' : ''}
              onClick={() => dispatch({ type: 'settings/update', patch: { lang: l.id } })}>
              {l.label}
            </button>
          ))}
        </div>
        {!state.settings.lang && <p className="muted small">{t('settings.languageAuto', { lang: LANGUAGES.find((l) => l.id === deviceLanguage()).label })}</p>}
      </fieldset>

      <fieldset className="field">
        <legend className="field-label">{t('settings.rest')}</legend>
        <div className="segmented">
          {[60, 90, 120, 180].map((s) => (
            <button key={s} type="button" className={state.settings.restSeconds === s ? 'is-on' : ''}
              onClick={() => dispatch({ type: 'settings/update', patch: { restSeconds: s } })}>
              {s < 120 ? `${s} s` : `${s / 60} min`}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend className="field-label">{t('settings.bar')}</legend>
        <div className="segmented">
          {[20, 15, 10].map((kg) => (
            <button key={kg} type="button" className={state.settings.barKg === kg ? 'is-on' : ''}
              onClick={() => dispatch({ type: 'settings/update', patch: { barKg: kg } })}>
              {kg} kg
            </button>
          ))}
        </div>
      </fieldset>

      <CloudSettings />
    </>
  );
}
