import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { Icon } from '../components/Icon.jsx';
import { ConfirmButton } from '../components/ConfirmButton.jsx';
import { ExercisePicker } from '../components/ExercisePicker.jsx';
import { DragHandle, moveItem, useSortable } from '../components/Sortable.jsx';
import { uid } from '../utils/training.js';
import { useI18n } from '../i18n/index.jsx';

export default function PlansView({ goTo }) {
  const { state, dispatch, exercises } = useStore();
  const { t, exName, planName } = useI18n();
  const [editing, setEditing] = useState(null); // Plan-Entwurf oder null
  const sortable = useSortable((from, to) => dispatch({ type: 'plan/move', from, to }));

  if (editing) {
    return (
      <PlanEditor
        draft={editing}
        isNew={!state.plans.some((p) => p.id === editing.id)}
        onCancel={() => setEditing(null)}
        onSave={(plan) => {
          dispatch({ type: 'plan/save', plan });
          setEditing(null);
        }}
        onDelete={() => {
          dispatch({ type: 'plan/delete', id: editing.id });
          setEditing(null);
        }}
      />
    );
  }

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">{t('plans.count', { n: state.plans.length })}</p>
        <h1>{t('plans.title')}</h1>
      </header>

      <button className="btn btn-primary btn-block" onClick={() => setEditing({ id: uid(), name: '', exercises: [] })}>
        <Icon name="plus" size={18} /> {t('plans.create')}
      </button>

      <ul className="cards section">
        {state.plans.map((plan, index) => (
          <li key={plan.id} {...sortable.itemProps(index)} className={`card ${sortable.itemProps(index).className}`}>
            <DragHandle className="drag-handle card-corner" label={t('sort.handle')} {...sortable.handleProps(index, state.plans.length)} />
            <button className="card-button" onClick={() => setEditing({ ...structuredClone(plan), name: planName(plan.id, plan.name) })}>
              <h3>{planName(plan.id, plan.name)}</h3>
              <ol className="plan-lines">
                {plan.exercises.map((pe, i) => (
                  <li key={i}>
                    <span>{exName(exercises.get(pe.exerciseId))}</span>
                    <span className="num muted">{pe.sets} × {pe.reps}</span>
                  </li>
                ))}
              </ol>
              <span className="link small">{t('common.edit')}</span>
            </button>
            <div className="card-foot">
              <button
                className="btn btn-small"
                onClick={() => {
                  dispatch({ type: 'workout/start', planId: plan.id });
                  goTo('training');
                }}
                disabled={!!state.activeWorkout}
              >
                <Icon name="play" size={16} /> {t('common.start')}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {state.activeWorkout && <p className="muted small center">{t('plans.busy')}</p>}
    </>
  );
}

function PlanEditor({ draft, isNew, onSave, onCancel, onDelete }) {
  const { exercises } = useStore();
  const { t, exName } = useI18n();
  const [plan, setPlan] = useState(draft);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');

  const setLine = (i, patch) =>
    setPlan((p) => ({ ...p, exercises: p.exercises.map((pe, j) => (j === i ? { ...pe, ...patch } : pe)) }));
  const sortable = useSortable((from, to) => setPlan((p) => ({ ...p, exercises: moveItem(p.exercises, from, to) })));
  const remove = (i) => setPlan((p) => ({ ...p, exercises: p.exercises.filter((_, j) => j !== i) }));

  function save(e) {
    e.preventDefault();
    if (!plan.name.trim()) return setError(t('planEditor.nameMissing'));
    if (plan.exercises.length === 0) return setError(t('planEditor.noExercises'));
    onSave({ ...plan, name: plan.name.trim() });
  }

  return (
    <form onSubmit={save}>
      <header className="page-head">
        <button type="button" className="back" onClick={onCancel}><Icon name="back" size={18} /> {t('tab.plans')}</button>
        <h1>{isNew ? t('planEditor.new') : t('planEditor.edit')}</h1>
      </header>

      <label className="field">
        <span className="field-label">{t('planEditor.name')}</span>
        <input id="plan-name" className="text-input" value={plan.name} placeholder={t('planEditor.placeholder')}
          onChange={(e) => { setPlan({ ...plan, name: e.target.value }); setError(''); }} />
      </label>

      <section className="section">
        <h2>{t('exercises.title')}</h2>
        {plan.exercises.length === 0 && <p className="muted">{t('planEditor.empty')}</p>}
        <ul className="editor-list">
          {plan.exercises.map((pe, i) => (
            <li key={i} {...sortable.itemProps(i)} className={`card editor-line ${sortable.itemProps(i).className}`}>
              <div className="editor-line-top">
                <span className="editor-no num">{i + 1}</span>
                <strong>{exName(exercises.get(pe.exerciseId))}</strong>
                <div className="editor-tools">
                  <button type="button" className="icon-btn danger" aria-label={t('planEditor.remove')} onClick={() => remove(i)}><Icon name="trash" size={18} /></button>
                  <DragHandle label={t('sort.handle')} {...sortable.handleProps(i, plan.exercises.length)} />
                </div>
              </div>
              <div className="steppers">
                <Stepper id={`plan-${i}-sets`} label={t('planEditor.sets')} value={pe.sets} min={1} max={10} onChange={(v) => setLine(i, { sets: v })} />
                <Stepper id={`plan-${i}-reps`} label={t('workout.reps')} value={pe.reps} min={1} max={100} onChange={(v) => setLine(i, { reps: v })} />
              </div>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-block" onClick={() => setPicking(true)}>
          <Icon name="plus" size={18} /> {t('picker.title')}
        </button>
      </section>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="finish">
        <button type="submit" className="btn btn-primary btn-block"><Icon name="check" size={18} /> {t('planEditor.save')}</button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onCancel}>{t('common.cancel')}</button>
        {!isNew && (
          <ConfirmButton className="btn btn-ghost danger btn-block" confirmLabel={t('planEditor.deleteConfirm')} onConfirm={onDelete}>
            {t('planEditor.delete')}
          </ConfirmButton>
        )}
      </div>

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(exerciseId) => {
            setPlan((p) => ({ ...p, exercises: [...p.exercises, { exerciseId, sets: 3, reps: 8 }] }));
            setPicking(false);
            setError('');
          }}
        />
      )}
    </form>
  );
}

function Stepper({ id, label, value, min, max, onChange }) {
  const { t } = useI18n();
  const clamp = (v) => Math.min(max, Math.max(min, v || min));
  return (
    <div className="stepper">
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="stepper-box">
        <button type="button" aria-label={t('stepper.dec', { label })} onClick={() => onChange(clamp(value - 1))}>−</button>
        <input id={id} className="num" inputMode="numeric" value={value}
          onChange={(e) => onChange(clamp(parseInt(e.target.value, 10)))} />
        <button type="button" aria-label={t('stepper.inc', { label })} onClick={() => onChange(clamp(value + 1))}>+</button>
      </div>
    </div>
  );
}
