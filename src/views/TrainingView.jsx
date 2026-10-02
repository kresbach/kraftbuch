import { useEffect, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { lastSetsFor } from '../state/reducer.js';
import { Icon } from '../components/Icon.jsx';
import { ConfirmButton } from '../components/ConfirmButton.jsx';
import { ExercisePicker } from '../components/ExercisePicker.jsx';
import { RestTimer } from '../components/RestTimer.jsx';
import { Plates } from '../components/Plates.jsx';
import { CloudBanner } from '../components/CloudSettings.jsx';
import { fmtDuration, fmtNum, parseNum, startOfWeek, workoutVolume } from '../utils/training.js';

export default function TrainingView({ goTo }) {
  const { state } = useStore();
  return state.activeWorkout ? <ActiveWorkout /> : <StartScreen goTo={goTo} />;
}

/* ---------- Startbildschirm: Wochenübersicht und Plan wählen ---------- */

function StartScreen({ goTo }) {
  const { state, dispatch, exercises } = useStore();
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
        <p className="eyebrow">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1>Training</h1>
      </header>

      <CloudBanner />

      <section className="stats" aria-label="Diese Woche">
        <div className="stat"><span className="stat-value num">{thisWeek.length}</span><span className="stat-label">Trainings diese Woche</span></div>
        <div className="stat"><span className="stat-value num">{sets}</span><span className="stat-label">Sätze</span></div>
        <div className="stat"><span className="stat-value num">{fmtNum(Math.round(volume))}</span><span className="stat-label">kg bewegt</span></div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Plan starten</h2>
          <button className="link" onClick={() => goTo('plans')}>Pläne verwalten</button>
        </div>
        {state.plans.length === 0 && (
          <p className="muted">Noch kein Plan angelegt. Erstelle unter „Pläne“ deinen eigenen oder starte ein freies Training.</p>
        )}
        <ul className="cards">
          {state.plans.map((plan) => {
            const isNext = plan.id === nextPlanId;
            return (
              <li key={plan.id} className="card plan-card">
                <div className="plan-card-text">
                  <h3>{plan.name} {isNext && <span className="pill">Als Nächstes</span>}</h3>
                  <p className="muted small">
                    {plan.exercises.map((pe) => exercises.get(pe.exerciseId)?.name ?? 'Unbekannt').join(' · ') || 'Keine Übungen'}
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => dispatch({ type: 'workout/start', planId: plan.id })}>
                  <Icon name="play" size={18} /> Starten
                </button>
              </li>
            );
          })}
        </ul>
        <button className="btn btn-block" onClick={() => dispatch({ type: 'workout/start', planId: null })}>
          <Icon name="plus" size={18} /> Freies Training ohne Plan
        </button>
      </section>
    </>
  );
}

/* ---------- Laufendes Training ---------- */

function ActiveWorkout() {
  const { state, dispatch, exercises } = useStore();
  const w = state.activeWorkout;
  const [picking, setPicking] = useState(false);
  const [restEnd, setRestEnd] = useState(null);
  const [, tick] = useState(0);

  // Dauer-Anzeige jede halbe Minute aktualisieren.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
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
        <p className="eyebrow">Läuft seit {fmtDuration(Date.now() - new Date(w.startedAt).getTime())} · {doneCount}/{totalCount} Sätze</p>
        <h1>{w.name}</h1>
      </header>

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
            <section key={exIndex} className="card exercise">
              <header className="exercise-head">
                <div>
                  <h2>{info?.name ?? 'Unbekannte Übung'}</h2>
                  <p className="muted small">
                    {last ? `Letztes Mal: ${last.map((s) => (s.kg ? `${fmtNum(s.kg)}×${s.reps}` : `${s.reps}`)).join(', ')}` : 'Erstes Mal – viel Erfolg!'}
                  </p>
                </div>
                <ConfirmButton className="icon-btn danger" confirmLabel="Entfernen?" onConfirm={() => dispatch({ type: 'workout/removeExercise', exIndex })}>
                  <Icon name="trash" size={18} />
                </ConfirmButton>
              </header>

              {info?.equipment === 'Langhantel' && <Plates kg={currentKg} bar={state.settings.barKg} />}

              <div className="set-table" role="table" aria-label={`Sätze ${info?.name ?? ''}`}>
                <div className="set-row set-row-head" role="row">
                  <span role="columnheader">Satz</span>
                  <span role="columnheader">{isBodyweight ? '+kg' : 'kg'}</span>
                  <span role="columnheader">Wdh</span>
                  <span role="columnheader" className="sr-only">Erledigt</span>
                </div>
                {ex.sets.map((set, setIndex) => (
                  <div key={setIndex} className={`set-row ${set.done ? 'is-done' : ''}`} role="row">
                    <span className="set-no num" role="cell">{setIndex + 1}</span>
                    <input id={`w-${exIndex}-${setIndex}-kg`} className="num-input" role="cell" inputMode="decimal"
                      placeholder={isBodyweight ? '0' : '–'} value={set.kg} aria-label={`Satz ${setIndex + 1} Gewicht`}
                      onChange={(e) => dispatch({ type: 'workout/updateSet', exIndex, setIndex, patch: { kg: e.target.value } })} />
                    <input id={`w-${exIndex}-${setIndex}-reps`} className="num-input" role="cell" inputMode="numeric"
                      placeholder="–" value={set.reps} aria-label={`Satz ${setIndex + 1} Wiederholungen`}
                      onChange={(e) => dispatch({ type: 'workout/updateSet', exIndex, setIndex, patch: { reps: e.target.value } })} />
                    <button role="cell" className={`check ${set.done ? 'is-on' : ''}`} aria-pressed={set.done}
                      aria-label={`Satz ${setIndex + 1} erledigt`} onClick={() => toggleDone(exIndex, setIndex, set)}>
                      <Icon name="check" size={20} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="row-actions">
                <button className="btn btn-small" onClick={() => dispatch({ type: 'workout/addSet', exIndex })}>
                  <Icon name="plus" size={16} /> Satz
                </button>
                {ex.sets.length > 0 && (
                  <button className="btn btn-small btn-ghost" onClick={() => dispatch({ type: 'workout/removeSet', exIndex, setIndex: ex.sets.length - 1 })}>
                    Letzten Satz entfernen
                  </button>
                )}
              </div>
            </section>
          );
        })}

        <button className="btn btn-block" onClick={() => setPicking(true)}>
          <Icon name="plus" size={18} /> Übung hinzufügen
        </button>

        <div className="finish">
          <button className="btn btn-primary btn-block" onClick={() => dispatch({ type: 'workout/finish' })} disabled={doneCount === 0}>
            <Icon name="check" size={18} /> Training abschließen
          </button>
          {doneCount === 0 && <p className="muted small center">Hake mindestens einen Satz ab, um das Training zu speichern.</p>}
          <ConfirmButton className="btn btn-ghost danger btn-block" confirmLabel="Ja, Training verwerfen" onConfirm={() => dispatch({ type: 'workout/discard' })}>
            Training verwerfen
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
