import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { lastNoteFor, lastSetsFor } from '../state/reducer.js';
import { Icon } from '../components/Icon.jsx';
import { ConfirmButton } from '../components/ConfirmButton.jsx';
import { ExercisePicker } from '../components/ExercisePicker.jsx';
import { RestTimer } from '../components/RestTimer.jsx';
import { Plates } from '../components/Plates.jsx';
import { CloudBanner } from '../components/CloudSettings.jsx';
import { DragHandle, useSortable } from '../components/Sortable.jsx';
import { bestsByExercise, cleanReps, fmtKg, fmtW, fmtInput, fmtPlanDays, getUnit, suggestNext, exerciseVolume, isRecord, recordCounts, recordSet, fmtClock, fmtDate, fmtDuration, fmtLongToday, fmtNum, fmtWeekday, fmtWeight, parseNum, startOfWeek, weekDays, weekStreak, workoutVolume } from '../utils/training.js';
import { unlockSound } from '../utils/sound.js';
import { useUndo } from '../components/Undo.jsx';
import { ExLabel } from '../components/ExLabel.jsx';
import { WeightInput } from '../components/WeightInput.jsx';
import { ShareWorkout } from '../components/ShareWorkout.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function TrainingView({ goTo }) {
  const { state } = useStore();
  return state.activeWorkout ? <ActiveWorkout /> : <StartScreen goTo={goTo} />;
}

/* ---------- Startbildschirm: Wochenübersicht und Plan wählen ---------- */

function StartScreen({ goTo }) {
  const { state, dispatch, exercises } = useStore();
  const { t, exParts, planName } = useI18n();
  const sortable = useSortable((from, to) => dispatch({ type: 'plan/move', from, to }));
  const days = weekDays(state.workouts);
  const streak = weekStreak(state.workouts);
  const weekStart = startOfWeek();
  const thisWeek = state.workouts.filter((w) => new Date(w.startedAt) >= weekStart);
  const sets = thisWeek.reduce((n, w) => n + w.exercises.reduce((m, ex) => m + ex.sets.length, 0), 0);
  const volume = thisWeek.reduce((n, w) => n + workoutVolume(w), 0);
  // Vorschlag: der Plan, der in der Liste nach dem zuletzt trainierten Plan kommt.
  const lastPlanIndex = state.plans.findIndex((p) => p.id === state.workouts[0]?.planId);
  const nextPlanId = lastPlanIndex >= 0 && state.plans.length > 1
    ? state.plans[(lastPlanIndex + 1) % state.plans.length].id
    : null;
  // Pläne mit festen Trainingstagen: heute fällige Pläne werden markiert (vor „Als Nächstes“)
  const today = ((new Date().getDay() + 6) % 7) + 1; // 1 = Montag … 7 = Sonntag
  const trainedToday = days.find((d) => d.isToday)?.count > 0;
  const dueToday = new Set(trainedToday ? [] : state.plans.filter((p) => p.days?.includes(today)).map((p) => p.id));

  return (
    <div className="narrow-page">
      <header className="page-head">
        <p className="eyebrow">{fmtLongToday()}</p>
        <h1>{t('training.title')}</h1>
      </header>

      <CloudBanner />

      {/* Woche auf einen Blick: Trainingstage Mo–So, Serie und Summen */}
      <section className="card week" aria-label={t('training.thisWeek')}>
        <div className="week-head">
          <h2>{t('training.thisWeek')}</h2>
          {streak >= 2 && <span className="pill pill-streak"><Icon name="flame" size={14} /> {t('training.streak', { n: streak })}</span>}
        </div>
        <ol className="week-days">
          {days.map((d) => (
            <li key={d.date.toISOString()} className={`day ${d.count ? 'is-done' : ''} ${d.isToday ? 'is-today' : ''} ${d.isFuture ? 'is-future' : ''}`}
              aria-label={`${fmtWeekday(d.date)}: ${d.count ? t('training.dayDone') : t('training.dayRest')}`}>
              <span className="day-name">{fmtWeekday(d.date)}</span>
              <span className="day-dot">{d.count ? <Icon name="check" size={16} strokeWidth={3} /> : d.date.getDate()}</span>
            </li>
          ))}
        </ol>
        <p className="week-sum muted small num">
          {thisWeek.length ? t('training.weekSummary', { workouts: thisWeek.length, sets, kg: fmtWeight(volume) }) : t('training.weekEmpty')}
        </p>
      </section>

      {state.workouts[0] && <LastWorkout workout={state.workouts[0]} onOpen={() => goTo('history')} />}

      <section className="section">
        <div className="section-head">
          <h2>{t('training.startPlan')}</h2>
          <button className="link" onClick={() => goTo('plans')}>{t('training.managePlans')}</button>
        </div>
        {state.plans.length === 0 && (
          <EmptyState icon="list" title={t('plans.emptyTitle')} text={t('training.noPlans')} action={t('plans.create')} onAction={() => goTo('plans')} />
        )}
        <ul className="cards">
          {state.plans.map((plan, index) => {
            const isToday = dueToday.has(plan.id);
            const isNext = !dueToday.size && plan.id === nextPlanId;
            return (
              <li key={plan.id} ref={sortable.itemRef(index)} className="card plan-card">
                <DragHandle className="drag-handle card-corner" label={t('sort.handle')} {...sortable.handleProps(index, state.plans.length)} />
                <div className="plan-card-text">
                  <h3>
                    {planName(plan.id, plan.name)}
                    {isToday && <> <span className="pill pill-today">{t('training.today')}</span></>}
                    {isNext && <> <span className="pill">{t('training.next')}</span></>}
                  </h3>
                  {plan.days?.length > 0 && <p className="plan-days small">{fmtPlanDays(plan.days)}</p>}
                  <p className="muted small">
                    {plan.exercises.map((pe) => exParts(exercises.get(pe.exerciseId)).name).join(' · ') || t('plans.noExercises')}
                  </p>
                </div>
                <button className="btn btn-primary btn-start" onClick={() => dispatch({ type: 'workout/start', planId: plan.id })}>
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
  const bests = useMemo(() => bestsByExercise(state.workouts), [state.workouts]);
  const [openNotes, setOpenNotes] = useState(() => new Set());
  const toggleNote = (i) => setOpenNotes((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });

  useWakeLock(); // Bildschirm bleibt während des Trainings an

  function toggleDone(exIndex, setIndex, set) {
    // Ohne Wiederholungen ist der Satz nicht auswertbar: stattdessen ins Wdh-Feld springen
    if (!set.done && !(parseNum(set.reps) > 0)) {
      document.getElementById(`w-${exIndex}-${setIndex}-reps`)?.focus();
      return;
    }
    if (!set.done && state.settings.restSound !== false) unlockSound(); // Ton am Pausenende erlauben (iOS)
    dispatch({ type: 'workout/updateSet', exIndex, setIndex, patch: { done: !set.done } });
    if (isRecord({ ...set, done: true }, bests.get(w.exercises[exIndex].exerciseId)) && !set.done) navigator.vibrate?.([60, 40, 60, 40, 120]);
    // Pausenzeit: eigene je Übung, sonst die allgemeine aus den Einstellungen (0 = keine Pause)
    const rest = state.settings.restByExercise?.[w.exercises[exIndex].exerciseId] ?? state.settings.restSeconds;
    if (!set.done && rest > 0) dispatch({ type: 'workout/rest', endsAt: Date.now() + rest * 1000, total: rest });
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
        <label className="field workout-note">
          <span className="field-label">{t('notes.workout')}</span>
          <textarea id="workout-note" className="text-input" rows={2} value={w.note ?? ''} placeholder={t('notes.workoutPlaceholder')}
            onChange={(e) => dispatch({ type: 'workout/note', note: e.target.value })} />
        </label>
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
          const record = recordSet(ex, bests.get(ex.exerciseId));
          const lastNote = lastNoteFor(state, ex.exerciseId);
          const noteOpen = openNotes.has(exIndex) || !!ex.note;
          const complete = ex.sets.length > 0 && ex.sets.every((s) => s.done);
          // Steigerung vorschlagen, solange in dieser Übung noch kein Satz abgehakt ist
          const firstOpen = ex.sets.find((s) => !s.done);
          const sug = !ex.sets.some((s) => s.done) && firstOpen
            ? suggestNext(last, { target: ex.target, timed: info?.timed, equipment: info?.equipment }) : null;
          const showSug = sug && (sug.kg ? parseNum(firstOpen.kg) < sug.kg - 1e-6 : parseNum(firstOpen.reps) < sug.reps);
          // Scheibenanzeige für den nächsten offenen Satz, sonst das zuletzt eingetragene Gewicht
          const filled = ex.sets.filter((s) => parseNum(s.kg) > 0);
          const nextKg = parseNum(ex.sets.find((s) => !s.done)?.kg);
          const currentKg = nextKg || parseNum(filled[filled.length - 1]?.kg);
          return (
            <section key={exIndex} ref={sortable.itemRef(exIndex)} className={`card exercise ${complete ? 'is-complete' : ''}`}>
              <header className="exercise-head">
                <div>
                  <h2><ExLabel e={info} />{complete && <> <span className="done-badge"><Icon name="check" size={14} strokeWidth={3} /> {t('workout.exDone')}</span></>}</h2>
                  {record && (
                    <span className="pill pill-record"><Icon name="trophy" size={14} /> {t('records.new')}: {parseNum(record.kg) > 0 ? `${fmtKg(parseNum(record.kg))} × ${fmtReps(record.reps)}` : fmtReps(record.reps)}</span>
                  )}
                  <p className="muted small">
                    {last ? t('workout.lastTime', { sets: last.map((s) => (s.kg ? `${fmtW(s.kg)}×${fmtReps(s.reps)}` : fmtReps(s.reps))).join(', ') }) : t('workout.firstTime')}
                  </p>
                  {lastNote && <p className="muted small last-note">{t('notes.last')}: {lastNote}</p>}
                  {showSug && (
                    <button type="button" className="suggest"
                      onClick={() => dispatch({ type: 'workout/applySuggestion', exIndex, patch: sug.kg ? { kg: getUnit() === 'kg' ? fmtInput(sug.kg) : String(sug.kg) } : { reps: String(sug.reps) } })}>
                      <Icon name="bulb" size={16} />
                      <span>{t('suggest.text', { value: sug.kg ? fmtKg(sug.kg) : fmtReps(sug.reps) + (info?.timed ? '' : ` ${t('workout.reps')}`) })}</span>
                      <strong>{t('suggest.apply')}</strong>
                    </button>
                  )}
                </div>
                <div className="exercise-tools">
                  <button className="icon-btn quiet-danger" aria-label={t('planEditor.remove')}
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
                  <span role="columnheader">{isBodyweight ? `+${getUnit()}` : getUnit()}</span>
                  <span role="columnheader">{repsLabel}</span>
                  <span role="columnheader" className="sr-only">{t('workout.done')}</span>
                </div>
                {ex.sets.map((set, setIndex) => (
                  <div key={setIndex} className={`set-row ${set.done ? 'is-done' : ''}`} role="row">
                    <span className="set-no num" role="cell">{setIndex + 1}</span>
                    <WeightInput id={`w-${exIndex}-${setIndex}-kg`} className="num-input" role="cell"
                      placeholder={isBodyweight ? '0' : '–'} value={set.kg} aria-label={t('workout.ariaWeight', { n: setIndex + 1 })}
                      onChange={(kg) => dispatch({ type: 'workout/updateSet', exIndex, setIndex, patch: { kg } })} />
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

              {noteOpen && (
                <textarea id={`w-${exIndex}-note`} className="text-input ex-note" rows={2} value={ex.note ?? ''} placeholder={t('notes.exercisePlaceholder')}
                  aria-label={t('notes.exercise')} autoFocus={!ex.note}
                  onChange={(e) => dispatch({ type: 'workout/note', exIndex, note: e.target.value })} />
              )}

              <div className="row-actions">
                <button className="btn btn-small" onClick={() => dispatch({ type: 'workout/addSet', exIndex })}>
                  <Icon name="plus" size={16} /> {t('workout.set')}
                </button>
                {ex.sets.length > 0 && (
                  <button className="btn btn-small btn-ghost" onClick={() => withUndo(t('undo.setRemoved'), { type: 'workout/removeSet', exIndex, setIndex: ex.sets.length - 1 }, ['activeWorkout'])}>
                    {t('workout.removeLastSet')}
                  </button>
                )}
                {!noteOpen && (
                  <button className="btn btn-small btn-ghost" onClick={() => toggleNote(exIndex)}>{t('notes.add')}</button>
                )}
                {exMoved > 0 && <span className="ex-moved muted small num">{fmtWeight(exMoved)}</span>}
              </div>
            </section>
          );
        })}
      </div>
      </div>

      {restEnd && <RestTimer endsAt={restEnd} total={w.restTotal || state.settings.restSeconds || 90} onChange={setRestEnd} sound={state.settings.restSound !== false} />}

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
  const { state, dispatch } = useStore();
  const records = useMemo(() => recordCounts(state.workouts).get(w.id) ?? 0, [state.workouts, w.id]);
  const sets = w.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const justNow = Date.now() - new Date(w.finishedAt).getTime() < 15 * 60_000;
  return (
    <section className="section">
      <div className="section-head">
        <h2>{t('training.last')}</h2>
        {justNow && <span className="pill">{t('training.justSaved')}</span>}
      </div>
      <div className="card last-workout-card">
      <button className="card-button last-workout" onClick={onOpen}>
        <span className="last-workout-text">
          <span className="eyebrow">{fmtDate(w.startedAt)}</span>
          <strong>{planName(w.planId, w.name)}</strong>
          <span className="muted small num">{fmtDuration(new Date(w.finishedAt) - new Date(w.startedAt))} · {t('history.sets', { n: sets })}</span>
          {records > 0 && <span className="pill pill-record"><Icon name="trophy" size={14} /> {t('records.count', { n: records })}</span>}
        </span>
        <span className="last-workout-moved">
          <span className="moved-value num">{fmtWeight(workoutVolume(w))}</span>
          <span className="muted small">{t('workout.moved')}</span>
        </span>
      </button>
      <div className="row-actions last-workout-actions">
        <button type="button" className="btn btn-small" onClick={() => dispatch({ type: 'workout/repeat', workoutId: w.id })}>
          <Icon name="repeat" size={16} /> {t('training.repeat')}
        </button>
        <ShareWorkout workout={w} />
      </div>
      </div>
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
