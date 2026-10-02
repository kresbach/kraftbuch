import { useEffect, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { lastSetsFor } from '../state/reducer.js';
import { Icon } from '../components/Icon.jsx';
import { ConfirmButton } from '../components/ConfirmButton.jsx';
import { ExercisePicker } from '../components/ExercisePicker.jsx';
import { RestTimer } from '../components/RestTimer.jsx';
import { Plates } from '../components/Plates.jsx';
import { CloudBanner } from '../components/CloudSettings.jsx';
import { DragHandle, useSortable } from '../components/Sortable.jsx';
import { fmtClock, fmtLongToday, fmtNum, parseNum, startOfWeek, workoutVolume } from '../utils/training.js';
import { useI18n } from '../i18n/index.jsx';

export default function TrainingView({ goTo }) {
  const { state } = useStore();
  return state.activeWorkout ? <ActiveWorkout /> : <StartScreen goTo={goTo} />;
}

/* ---------- Startbildschirm: Wochenübersicht und Plan wählen ---------- */

function StartScreen({ goTo }) {
  const { state, dispatch, exercises } = useStore();
  const { t, exName, planName } = useI18n();
  const sortable = useSortable((from, to) => dispatch({ type: 'plan/move', from, to }));
  const weekStart = startOfWeek();
  const thisWeek = state.workouts.filter((w) => new Date(w.startedAt) >= weekStart);
  const sets = thisWeek.reduce((n, w) => n + w.exercises.reduce((m, ex) => m + ex.sets.length, 0), 0);
  const volume = thisWeek.reduce((n, w) => n + workoutVolume(w), 0);
  // Vorschlag: der Plan, der in der Liste nach dem zuletzt trainierten Plan kommt.
  const lastPlanIndex = state.plans.findIndex((p) => p.id === state.workouts[0]?.planId);
  const nextPlanId = lastPlanIndex >= 0 && state.plans.length > 1
    ? state.plans[(lastPlanIndex + 1) % state.plans.length].id
    : null;

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">{fmtLongToday()}</p>
        <h1>{t('training.title')}</h1>
      </header>

      <CloudBanner />

      <section className="stats" aria-label={t('training.thisWeek')}>
        <div className="stat"><span className="stat-value num">{thisWeek.length}</span><span className="stat-label">{t('training.statWorkouts')}</span></div>
        <div className="stat"><span className="stat-value num">{sets}</span><span className="stat-label">{t('training.statSets')}</span></div>
        <div className="stat"><span className="stat-value num">{fmtNum(Math.round(volume))}</span><span className="stat-label">{t('training.statVolume')}</span></div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>{t('training.startPlan')}</h2>
          <button className="link" onClick={() => goTo('plans')}>{t('training.managePlans')}</button>
        </div>
        {state.plans.length === 0 && (
          <p className="muted">{t('training.noPlans')}</p>
        )}
        <ul className="cards">
          {state.plans.map((plan, index) => {
            const isNext = plan.id === nextPlanId;
            return (
              <li key={plan.id} {...sortable.itemProps(index)} className={`card plan-card ${sortable.itemProps(index).className}`}>
                <DragHandle className="drag-handle card-corner" label={t('sort.handle')} {...sortable.handleProps(index, state.plans.length)} />
                <div className="plan-card-text">
                  <h3>{planName(plan.id, plan.name)} {isNext && <span className="pill">{t('training.next')}</span>}</h3>
                  <p className="muted small">
                    {plan.exercises.map((pe) => exName(exercises.get(pe.exerciseId))).join(' · ') || t('plans.noExercises')}
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => dispatch({ type: 'workout/start', planId: plan.id })}>
                  <Icon name="play" size={18} /> {t('common.start')}
                </button>
              </li>
            );
          })}
        </ul>
        <button className="btn btn-block" onClick={() => dispatch({ type: 'workout/start', planId: null })}>
          <Icon name="plus" size={18} /> {t('training.freeStart')}
        </button>
      </section>
    </>
  );
}

/* ---------- Laufendes Training ---------- */

function ActiveWorkout() {
  const { state, dispatch, exercises } = useStore();
  const { t, exName, planName } = useI18n();
  const w = state.activeWorkout;
  const [picking, setPicking] = useState(false);
  const [restEnd, setRestEnd] = useState(null);
  const sortable = useSortable((from, to) => dispatch({ type: 'workout/moveExercise', from, to }));
  const [, tick] = useState(0);

  // Trainingsuhr jede Sekunde aktualisieren.
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const doneCount = w.exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.done).length, 0);
  const totalCount = w.exercises.reduce((n, ex) => n + ex.sets.length, 0);

  function toggleDone(exIndex, setIndex, set) {
    dispatch({ type: 'workout/updateSet', exIndex, setIndex, patch: { done: !set.done } });
    if (!set.done) setRestEnd(Date.now() + state.settings.restSeconds * 1000);
  }

  return (
    <>
      <header className="page-head">
        <h1>{planName(w.planId, w.name)}</h1>
      </header>

      <section className="workout-status" aria-label={t('workout.status')}>
        <div className="elapsed">
          <span className="status-label"><Icon name="timer" size={16} /> {t('workout.elapsed')}</span>
          <span className="elapsed-time num" role="timer">{fmtClock(Date.now() - new Date(w.startedAt).getTime())}</span>
        </div>
        <div className="sets-progress">
          <span className="status-label">{t('workout.setsLabel')}</span>
          <span className="sets-count num">{doneCount}<span className="muted">/{totalCount}</span></span>
          <span className="progress-track" aria-hidden="true">
            <span className="progress-fill" style={{ transform: `scaleX(${totalCount ? doneCount / totalCount : 0})` }} />
          </span>
        </div>
      </section>

      <div className="workout">
        {w.exercises.map((ex, exIndex) => {
          const info = exercises.get(ex.exerciseId);
          const last = lastSetsFor(state, ex.exerciseId);
          const isBodyweight = info?.type === 'bodyweight';
          // Scheibenanzeige für den nächsten offenen Satz, sonst das zuletzt eingetragene Gewicht
          const filled = ex.sets.filter((s) => parseNum(s.kg) > 0);
          const nextKg = parseNum(ex.sets.find((s) => !s.done)?.kg);
          const currentKg = nextKg || parseNum(filled[filled.length - 1]?.kg);
          return (
            <section key={exIndex} {...sortable.itemProps(exIndex)}
              className={`card exercise ${sortable.itemProps(exIndex).className}`}>
              <header className="exercise-head">
                <div>
                  <h2>{exName(info)}</h2>
                  <p className="muted small">
                    {last ? t('workout.lastTime', { sets: last.map((s) => (s.kg ? `${fmtNum(s.kg)}×${s.reps}` : `${s.reps}`)).join(', ') }) : t('workout.firstTime')}
                  </p>
                </div>
                <div className="exercise-tools">
                  <ConfirmButton className="icon-btn danger" confirmLabel={t('common.removeQ')} onConfirm={() => dispatch({ type: 'workout/removeExercise', exIndex })}>
                    <Icon name="trash" size={18} />
                  </ConfirmButton>
                  <DragHandle label={t('sort.handle')} {...sortable.handleProps(exIndex, w.exercises.length)} />
                </div>
              </header>

              {info?.equipment === 'Langhantel' && <Plates kg={currentKg} bar={state.settings.barKg} />}

              <div className="set-table" role="table" aria-label={t('workout.setsOf', { name: exName(info) })}>
                <div className="set-row set-row-head" role="row">
                  <span role="columnheader">{t('workout.set')}</span>
                  <span role="columnheader">{isBodyweight ? '+kg' : 'kg'}</span>
                  <span role="columnheader">{t('workout.reps')}</span>
                  <span role="columnheader" className="sr-only">{t('workout.done')}</span>
                </div>
                {ex.sets.map((set, setIndex) => (
                  <div key={setIndex} className={`set-row ${set.done ? 'is-done' : ''}`} role="row">
                    <span className="set-no num" role="cell">{setIndex + 1}</span>
                    <input id={`w-${exIndex}-${setIndex}-kg`} className="num-input" role="cell" inputMode="decimal"
                      placeholder={isBodyweight ? '0' : '–'} value={set.kg} aria-label={t('workout.ariaWeight', { n: setIndex + 1 })}
                      onChange={(e) => dispatch({ type: 'workout/updateSet', exIndex, setIndex, patch: { kg: e.target.value } })} />
                    <input id={`w-${exIndex}-${setIndex}-reps`} className="num-input" role="cell" inputMode="numeric"
                      placeholder="–" value={set.reps} aria-label={t('workout.ariaReps', { n: setIndex + 1 })}
                      onChange={(e) => dispatch({ type: 'workout/updateSet', exIndex, setIndex, patch: { reps: e.target.value } })} />
                    <button role="cell" className={`check ${set.done ? 'is-on' : ''}`} aria-pressed={set.done}
                      aria-label={t('workout.ariaDone', { n: setIndex + 1 })} onClick={() => toggleDone(exIndex, setIndex, set)}>
                      <Icon name="check" size={20} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="row-actions">
                <button className="btn btn-small" onClick={() => dispatch({ type: 'workout/addSet', exIndex })}>
                  <Icon name="plus" size={16} /> {t('workout.set')}
                </button>
                {ex.sets.length > 0 && (
                  <button className="btn btn-small btn-ghost" onClick={() => dispatch({ type: 'workout/removeSet', exIndex, setIndex: ex.sets.length - 1 })}>
                    {t('workout.removeLastSet')}
                  </button>
                )}
              </div>
            </section>
          );
        })}

        <button className="btn btn-block" onClick={() => setPicking(true)}>
          <Icon name="plus" size={18} /> {t('picker.title')}
        </button>

        <div className="finish">
          <button className="btn btn-primary btn-block" onClick={() => dispatch({ type: 'workout/finish' })} disabled={doneCount === 0}>
            <Icon name="check" size={18} /> {t('workout.finish')}
          </button>
          {doneCount === 0 && <p className="muted small center">{t('workout.finishHint')}</p>}
          <ConfirmButton className="btn btn-ghost danger btn-block" confirmLabel={t('workout.discardConfirm')} onConfirm={() => dispatch({ type: 'workout/discard' })}>
            {t('workout.discard')}
          </ConfirmButton>
        </div>
      </div>

      {restEnd && <RestTimer endsAt={restEnd} total={state.settings.restSeconds} onChange={setRestEnd} />}

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(exerciseId) => {
            dispatch({ type: 'workout/addExercise', exerciseId });
            setPicking(false);
          }}
        />
      )}
    </>
  );
}
