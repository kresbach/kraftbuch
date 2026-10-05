// Mehrsprachigkeit: Wörterbücher, Sprachwahl (Einstellung oder Gerätesprache) und Anzeigenamen.
import { createContext, useContext, useEffect, useMemo } from 'react';
import { useStore } from '../state/store.jsx';
import { setFormatLocale } from '../utils/training.js';
import de from './de.js';
import en from './en.js';

export const DICTS = { de, en };
export const LANGUAGES = [
  { id: 'de', label: 'Deutsch' },
  { id: 'en', label: 'English' },
];

/** Sprache des Geräts, falls in den Einstellungen nichts gewählt ist. */
export function deviceLanguage() {
  const langs = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  return langs.some((l) => l?.toLowerCase().startsWith('de')) ? 'de' : 'en';
}

// Namen der Beispielpläne, wie sie gespeichert werden. Nur unveränderte Namen werden übersetzt.
const STORED_DEFAULT_NAMES = { 'plan-ganzkoerper-a': 'Ganzkörper A', 'plan-ganzkoerper-b': 'Ganzkörper B' };
const FREE_WORKOUT_NAME = 'Freies Training';

export function makeI18n(lang) {
  const dict = DICTS[lang] ?? de;
  const t = (key, vars = {}) => {
    const v = dict.text[key] ?? de.text[key];
    if (v === undefined) return key;
    if (typeof v === 'function') return v(vars);
    return v.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  };
  return {
    lang,
    locale: dict.locale,
    t,
    /** Anzeigename einer Übung; eigene Übungen behalten ihren Namen. */
    exName: (e) => (e ? (!e.custom && dict.exercises?.[e.id]) || e.name : t('exercise.unknown')),
    /** Name und Gerät getrennt: „Kniebeuge (Langhantel)“ → { name: 'Kniebeuge', tag: 'Langhantel' }.
     *  Ohne Klammer im Namen (z. B. eigene Übungen) dient das Gerät als Etikett. */
    exParts(e) {
      const full = e ? (!e.custom && dict.exercises?.[e.id]) || e.name : t('exercise.unknown');
      const m = full.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
      if (m) return { name: m[1], tag: m[2] };
      return { name: full, tag: e?.equipment ? dict.equipment?.[e.equipment] ?? e.equipment : '' };
    },
    group: (g) => dict.groups?.[g] ?? g,
    equip: (g) => dict.equipment?.[g] ?? g,
    /** Plan- oder Trainingsname; Beispielpläne und „Freies Training“ werden übersetzt. */
    planName: (id, name) => {
      if (!id && name === FREE_WORKOUT_NAME) return t('training.free');
      if (STORED_DEFAULT_NAMES[id] === name) return dict.plans?.[id] ?? name;
      return name;
    },
    compare: (a, b) => a.localeCompare(b, lang),
  };
}

const I18nContext = createContext(makeI18n('de'));

export function I18nProvider({ children }) {
  const { state } = useStore();
  const lang = state.settings.lang || deviceLanguage();
  const value = useMemo(() => {
    const i18n = makeI18n(lang);
    setFormatLocale(i18n.locale); // vor dem Rendern der Kinder, damit Zahlen/Daten passen
    return i18n;
  }, [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
