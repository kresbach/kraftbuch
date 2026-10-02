import { useMemo, useState } from 'react';
import { EQUIPMENT, MUSCLE_GROUPS } from '../data/exercises.js';
import { useStore } from '../state/store.jsx';
import { useI18n } from '../i18n/index.jsx';
import { Sheet } from './Sheet.jsx';
import { Icon } from './Icon.jsx';

// Auswahl einer Übung mit Suche und Filter nach Muskelgruppe und Gerät.
export function ExercisePicker({ onPick, onClose, title }) {
  const { exercises } = useStore();
  const i18n = useI18n();
  const { t, exName, group: groupName, equip } = i18n;
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState(null);
  const [equipment, setEquipment] = useState(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...exercises.values()]
      .filter((e) => (!group || e.group === group) && (!equipment || e.equipment === equipment) && matchesQuery(e, q, i18n))
      .sort((a, b) => i18n.compare(exName(a), exName(b)));
  }, [exercises, query, group, equipment, i18n, exName]);

  return (
    <Sheet title={title ?? t('picker.title')} onClose={onClose}>
      <label className="search">
        <Icon name="search" size={18} />
        <input id="picker-search" type="search" placeholder={t('exercise.search')} value={query}
          onChange={(e) => setQuery(e.target.value)} autoFocus />
      </label>
      <div className="chips" role="group" aria-label={t('exercise.muscleGroup')}>
        <button className={`chip ${!group ? 'is-on' : ''}`} onClick={() => setGroup(null)}>{t('common.all')}</button>
        {MUSCLE_GROUPS.map((g) => (
          <button key={g} className={`chip ${group === g ? 'is-on' : ''}`} onClick={() => setGroup(g)}>{groupName(g)}</button>
        ))}
      </div>
      <EquipmentFilter value={equipment} onChange={setEquipment} />
      <ul className="pick-list">
        {list.map((e) => (
          <li key={e.id}>
            <button className="pick-item" onClick={() => onPick(e.id)}>
              <span>{exName(e)}</span>
              <span className="muted small">{[groupName(e.group), e.equipment && equip(e.equipment)].filter(Boolean).join(' · ')}</span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="muted empty-line">{t('picker.empty')}</li>}
      </ul>
    </Sheet>
  );
}

/** Suche über Name und Gerät in der gewählten Sprache (z. B. „maschine“ bzw. „machine“). */
export function matchesQuery(e, q, { exName, equip }) {
  if (!q) return true;
  return exName(e).toLowerCase().includes(q) || (e.equipment ? equip(e.equipment).toLowerCase().includes(q) : false);
}

/** Filterzeile nach Gerät: Maschine, Kabelzug, Langhantel … */
export function EquipmentFilter({ value, onChange }) {
  const { t, equip } = useI18n();
  return (
    <div className="chips" role="group" aria-label={t('exercise.equipment')}>
      <span className="chips-label">{t('exercise.equipment')}</span>
      <button className={`chip ${!value ? 'is-on' : ''}`} onClick={() => onChange(null)}>{t('common.all')}</button>
      {EQUIPMENT.map((g) => (
        <button key={g} className={`chip ${value === g ? 'is-on' : ''}`} onClick={() => onChange(value === g ? null : g)}>{equip(g)}</button>
      ))}
    </div>
  );
}
