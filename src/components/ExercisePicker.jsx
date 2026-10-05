import { useEffect, useMemo, useRef, useState } from 'react';
import { EQUIPMENT, MUSCLE_GROUPS } from '../data/exercises.js';
import { useStore } from '../state/store.jsx';
import { useI18n } from '../i18n/index.jsx';
import { Sheet } from './Sheet.jsx';
import { Icon } from './Icon.jsx';
import { ExLabel } from './ExLabel.jsx';

// Auswahl einer Übung mit Suche und Filter nach Muskelgruppe und Gerät.
export function ExercisePicker({ onPick, onClose, title }) {
  const { state, exercises } = useStore();
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

  const favs = (state.settings.favorites ?? []).map((id) => exercises.get(id)).filter(Boolean)
    .sort((a, b) => i18n.compare(exName(a), exName(b)));

  // Bei neuer Suche oder neuem Filter zum Anfang der Trefferliste springen
  const top = useRef(null);
  useEffect(() => {
    const body = top.current?.closest('.sheet-body');
    if (body) body.scrollTop = 0;
  }, [query, group, equipment]);

  return (
    <Sheet tall title={title ?? t('picker.title')} onClose={onClose}>
      <div className="picker-top" ref={top}>
        <label className="search">
          <Icon name="search" size={18} />
          <input id="picker-search" type="search" enterKeyHint="search" placeholder={t('exercise.search')} value={query}
            onChange={(e) => setQuery(e.target.value)} autoFocus
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
        </label>
        <div className="chips" role="group" aria-label={t('exercise.muscleGroup')}>
          <button className={`chip ${!group ? 'is-on' : ''}`} onClick={() => setGroup(null)}>{t('common.all')}</button>
          {MUSCLE_GROUPS.map((g) => (
            <button key={g} className={`chip ${group === g ? 'is-on' : ''}`} onClick={() => setGroup(g)}>{groupName(g)}</button>
          ))}
        </div>
        <EquipmentFilter value={equipment} onChange={setEquipment} />
      </div>
      {/* Favoriten zuerst – solange weder gesucht noch gefiltert wird */}
      {!query.trim() && !group && !equipment && favs.length > 0 && (
        <>
          <h3 className="group-title">{t('favorites.title')}</h3>
          <ul className="pick-list">
            {favs.map((e) => (
              <li key={e.id}>
                <button className="pick-item" onClick={() => onPick(e.id)}>
                  <ExLabel e={e} />
                  <span className="muted small">{groupName(e.group)}</span>
                </button>
              </li>
            ))}
          </ul>
          <h3 className="group-title">{t('favorites.all')}</h3>
        </>
      )}
      <ul className="pick-list">
        {list.map((e) => (
          <li key={e.id}>
            <button className="pick-item" onClick={() => onPick(e.id)}>
              <ExLabel e={e} />
              <span className="muted small">{groupName(e.group)}</span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="muted empty-line">{t('picker.empty')}</li>}
      </ul>
    </Sheet>
  );
}

/** Suche über Name, Gerät und Muskelgruppe in der gewählten Sprache. Mehrere Wörter müssen alle
 *  vorkommen, in beliebiger Reihenfolge – „langhantel bank“ findet „Bankdrücken (Langhantel)“. */
export function matchesQuery(e, q, { exName, equip, group }) {
  if (!q) return true;
  const text = [exName(e), e.equipment && equip(e.equipment), group(e.group)].filter(Boolean).join(' ').toLowerCase();
  return q.split(/\s+/).every((word) => text.includes(word));
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
