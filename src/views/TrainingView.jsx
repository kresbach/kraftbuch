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
import { cleanKg, cleanReps, exerciseVolume, fmtClock, fmtDate, fmtDuration, fmtLongToday, fmtNum, fmtWeight, parseNum, startOfWeek, workoutVolume } from '../utils/training.js';
import { unlockSound } from '../utils/sound.js';
import { useUndo } from '../components/Undo.jsx';
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
    <div className="narrow-page">
      <header className="page-head">
        <p className="eyebrow">{fmtLongToday()}</p>
        <h1>{t('training.title')}</h1>
      </header>

      <CloudBanner />

      <section className="stats" aria-label={t('training.thisWeek')}>
        <div className="stat"><span className="stat-value num">{thisWeek.length}</span><span className="stat-label">{t('training.statWorkouts')}</span></div>
        <div className="stat"><span className="stat-value num">{sets}</span><span className="stat-label">{t('training.statSets')}</span></div>
        <div className="stat"><span className="stat-value num">{fmtWeight(volume)}</span><span className="stat-label">{t('training.statVolume')}</span></div>
      </section>

      {state.workouts[0] && <LastWorkout workout={state.workouts[0]} onOpen={() => goTo('history')} />}

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
              <li key={plan.id} ref={sortable.itemRef(index)} className="card plan-card">
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
    </div>
  );
}

/* ---------- Laufendes Training ---------- */

function ActiveWorkout() {
  const { state, dispatch, exercises } = useStore();
  const { t, exName, planName } = useI18n();
  const withUndo = useUndo();
  const w = state.activeWorkout;
  const [picking, setPicking] = useState(false);
  // Pause liegt im Trainingszustand, damit sie beim Wechsel in einen anderen Tab weiterläuft.
  // Eine längst abgelaufene Pause (z. B. nach Stunden neu geöffnet) wird nicht mehr angezeigt.
  const restEnd = w.restEndsAt && Date.now() - w.restEndsAt < 5 * 60_000 ? w.restEndsAt : null;
  const setRestEnd = (endsAt) => dispatch({ type: 'workout/rest', endsAt });
  const sortable = useSortable((from, to) => dispatch({ type: 'workout/moveExercise', from, to }));

  const doneCount = w.exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.done).length, 0);
  const totalCount = w.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  // Ausgefüllte, aber nicht abgehakte Sätze werden beim Abschließen nicht gespeichert – darauf hinweisen
  const openCount = w.exercises.reduce((n, ex) => n + ex.sets.filter((s) => !s.done && parseNum(s.reps) > 0).length, 0);

  const moved = workoutVolume(w);

  useWakeLock(); // Bildschirm bleibt während des Trainings an

  function toggleDone(exIndex, setIndex, set) {
    // Ohne Wiederholungen ist der Satz nicht auswertbar: stattdessen ins Wdh-Feld springen
    if (!set.done && !(parseNum(set.reps) > 0)) {
      document.getElementById(`w-${exIndex}-${setIndex}-reps`)?.focus();
      return;
    }
    if (!set.done && state.settings.restSound !== false) unlockSound(); // Ton am Pausenende erlauben (iOS)
    dispatch({ type: 'workout/updateSet', exIndex, setIndex, patch: { done: !set.done } });
    if (!set.done) setRestEnd(Date.now() + state.settings.restSeconds * 1000);
  }

  return (
    <>
      <header className="page-head">
        <h1>{planName(w.planId, w.name)}</h1>
      </header>

      <div className="split workout-split">
      <aside className="split-side">
      <section className="workout-status" aria-label={t('workout.status')}>
        <div className="elapsed">
          <span className="status-label"><Icon name="timer" size={16} /> {t('workout.elapsed')}</span>
          <ElapsedClock startedAt={w.startedAt} />
        </div>
        <div className="sets-progress">
          <span className="status-label">{t('workout.setsLabel')}</span>
          <span className="sets-count num">{doneCount}<span className="muted">/{totalCount}</span></span>
          <span className="progress-track" aria-hidden="true">
            <span className="progress-fill" style={{ transform: `scaleX(${totalCount ? doneCount / totalCount : 0})` }} />
          </span>
        </div>
        <div className="moved">
          <span className="status-label">{t('workout.moved')}</span>
          <span className="moved-value num">{fmtWeight(moved)}</span>
        </div>
      </section>

      <div className="workout-actions">
        <button className="btn btn-block" onClick={() => setPicking(true)}>
          <Icon name="plus" size={18} /> {t('picker.title')}
        </button>

        <div className="finish">
          {doneCount > 0 && openCount > 0 ? (
            <ConfirmButton className="btn btn-primary btn-block" confirmLabel={t('workout.finishOpen', { n: openCount })} onConfirm={() => dispatch({ type: 'workout/finish' })}>
              <Icon name="check" size={18} /> {t('workout.finish')}
            </ConfirmButton>
          ) : (
            <button className="btn btn-primary btn-block" onClick={() => dispatch({ type: 'workout/finish' })} disabled={doneCount === 0}>
              <Icon name="check" size={18} /> {t('workout.finish')}
            </button>
          )}
          {doneCount === 0 && <p className="muted small center">{t('workout.finishHint')}</p>}
          <button className="btn btn-ghost danger btn-block" onClick={() => withUndo(t('undo.workoutDiscarded'), { type: 'workout/discard' }, ['activeWorkout'])}>
            {t('workout.discard')}
          </button>
        </div>
      </div>
      </aside>

      <div className="workout split-main">
        {w.exercises.map((ex, exIndex) => {
          const info = exercises.get(ex.exerciseId);
          const last = lastSetsFor(state, ex.exerciseId);
          const isBodyweight = info?.type === 'bodyweight';
          const repsLabel = info?.timed ? t('workout.seconds') : t('workout.reps');
          const fmtReps = (r) => (info?.timed ? `${r} s` : `${r}`);
          const exMoved = exerciseVolume(ex);
          // Scheibenanzeige für den nächsten offenen Satz, sonst das zuletzt eingetragene Gewicht
          const filled = ex.sets.filter((s) => parseNum(s.kg) > 0);
          const nextKg = parseNum(ex.sets.find((s) => !s.done)?.kg);
          const currentKg = nextKg || parseNum(filled[filled.length - 1]?.kg);
          return (
            <section key={exIndex} ref={sortable.itemRef(exIndex)} className="card exercise">
              <header className="exercise-head">
                <div>
                  <h2>{exName(info)}</h2>
                  <p className="muted small">
                    {last ? t('workout.lastTime', { sets: last.map((s) => (s.kg ? `${fmtNum(s.kg)}×${fmtReps(s.reps)}` : fmtReps(s.reps))).join(', ') }) : t('workout.firstTime')}
                  </p>
                </div>
                <div className="exercise-tools">
                  <button className="icon-btn danger" aria-label={t('planEditor.remove')}
                    onClick={() => withUndo(t('undo.exerciseRemoved', { name: exName(info) }), { type: 'workout/removeExercise', exIndex }, ['activeWorkout'])}>
                    <Icon name="trash" size={18} />
                  </button>
                  <DragHandle label={t('sort.handle')} {...sortable.handleProps(exIndex, w.exercises.length)} />
                </div>
              </header>

              {info?.equipment === 'Langhantel' && <Plates kg={currentKg} bar={state.settings.barKg} />}

              <div className="set-table" role="table" aria-label={t('workout.setsOf', { name: exName(info) })}>
                <div className="set-row set-row-head" role="row">
                  <span role="columnheader">{t('workout.set')}</span>
                  <span role="columnheader">{isBodyweight ? '+kg' : 'kg'}</span>
                  <span role="columnheader">{repsLabel}</span>
                  <span role="columnheader" className="sr-only">{t('workout.done')}</span>
                </div>
                {ex.sets.map((set, setIndex) => (
                  <div key={setIndex} className={`set-row ${set.done ? 'is-done' : ''}`} role="row">
                    <span className="set-no num" role="cell">{setIndex + 1}</span>
                    <input id={`w-${exIndex}-${setIndex}-kg`} className="num-input" role="cell" inputMode="decimal"
                      placeholder={isBodyweight ? '0' : '–'} value={set.kg} aria-label={t('workout.ariaWeight', { n: setIndex + 1 })}
                      onChange={(e) => { const kg = cleanKg(e.target.value); if (kg != null) dispatch({ type: 'workout/updateSet', exIndex, setIndex, patch: { kg } }); }} />
                    <input id={`w-${exIndex}-${setIndex}-reps`} className="num-input" role="cell" inputMode="numeric"
                      placeholder="–" value={set.reps} aria-label={t(info?.timed ? 'workout.ariaSeconds' : 'workout.ariaReps', { n: setIndex + 1 })}
                      onChange={(e) => { const reps = cleanReps(e.target.value); if (reps != null) dispatch({ type: 'workout/updateSet', exIndex, setIndex, patch: { reps } }); }} />
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
                  <button className="btn btn-small btn-ghost" onClick={() => withUndo(t('undo.setRemoved'), { type: 'workout/removeSet', exIndex, setIndex: ex.sets.length - 1 }, ['activeWorkout'])}>
                    {t('workout.removeLastSet')}
                  </button>
                )}
                {exMoved > 0 && <span className="ex-moved muted small num">{fmtWeight(exMoved)}</span>}
              </div>
            </section>
          );
        })}
      </div>
      </div>

      {restEnd && <RestTimer endsAt={restEnd} total={state.settings.restSeconds} onChange={setRestEnd} sound={state.settings.restSound !== false} />}

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

/** Zusammenfassung des letzten Trainings auf dem Startbildschirm – mit dem insgesamt bewegten Gewicht. */
function LastWorkout({ workout: w, onOpen }) {
  const { t, planName } = useI18n();
  const sets = w.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const justNow = Date.now() - new Date(w.finishedAt).getTime() < 15 * 60_000;
  return (
    <section className="section">
      <div className="section-head">
        <h2>{t('training.last')}</h2>
        {justNow && <span className="pill">{t('training.justSaved')}</span>}
      </div>
      <button className="card card-button last-workout" onClick={onOpen}>
        <span className="last-workout-text">
          <span className="eyebrow">{fmtDate(w.startedAt)}</span>
          <strong>{planName(w.planId, w.name)}</strong>
          <span className="muted small num">{fmtDuration(new Date(w.finishedAt) - new Date(w.startedAt))} · {t('history.sets', { n: sets })}</span>
        </span>
        <span className="last-workout-moved">
          <span className="moved-value num">{fmtWeight(workoutVolume(w))}</span>
          <span className="muted small">{t('workout.moved')}</span>
        </span>
      </button>
    </section>
  );
}

/** Hält den Bildschirm an, solange ein Training läuft (sonst sperrt sich das Handy in der Pause).
 *  Der Browser gibt die Sperre beim Wechsel in den Hintergrund frei – beim Zurückkehren neu anfordern. */
function useWakeLock() {
  useEffect(() => {
    if (!navigator.wakeLock) return;
    let lock = null;
    let active = true;
    const request = () => {
      if (document.visibilityState !== 'visible' || lock) return;
      navigator.wakeLock.request('screen')
        .then((l) => {
          if (!active) return l.release();
          lock = l;
          l.addEventListener('release', () => { lock = null; });
        })
        .catch(() => {}); // z. B. Energiesparmodus – dann eben ohne
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', request);
      lock?.release().catch(() => {});
    };
  }, []);
}

/** Trainingsuhr als eigene Komponente: Nur sie wird jede Sekunde neu gezeichnet, nicht das ganze Training. */
function ElapsedClock({ startedAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <span className="elapsed-time num" role="timer">{fmtClock(now - new Date(startedAt).getTime())}</span>;
}
