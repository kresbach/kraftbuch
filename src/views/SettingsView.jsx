import { useStore } from '../state/store.jsx';
import { CloudSettings } from '../components/CloudSettings.jsx';
import { LANGUAGES, deviceLanguage, useI18n } from '../i18n/index.jsx';

// Auswahl: Automatisch (Gerätesprache), Deutsch, English. Sprachnamen stehen immer in der eigenen Sprache.
const LANGUAGE_CHOICES = [{ id: 'auto' }, ...LANGUAGES.map((l) => ({ ...l, lang: l.id }))];

/* ---------- Einstellungen: Sprache, Training, Speicherort ---------- */

export default function SettingsView() {
  const { state, dispatch } = useStore();
  const { t } = useI18n();

  return (
    <>
      <header className="page-head">
        <h1>{t('tab.settings')}</h1>
      </header>

      <fieldset className="field">
        <legend className="field-label">{t('settings.language')}</legend>
        <div className="segmented" role="radiogroup" aria-label={t('settings.language')}>
          {LANGUAGE_CHOICES.map((l) => {
            const on = (state.settings.lang ?? 'auto') === l.id;
            return (
              <button key={l.id} type="button" role="radio" aria-checked={on} lang={l.lang}
                className={on ? 'is-on' : ''}
                onClick={() => dispatch({ type: 'settings/update', patch: { lang: l.id === 'auto' ? null : l.id } })}>
                {l.label ?? t('settings.languageAutoOption')}
              </button>
            );
          })}
        </div>
        <p className="muted small">
          {state.settings.lang
            ? t('settings.languageFixed')
            : t('settings.languageAuto', { lang: LANGUAGES.find((l) => l.id === deviceLanguage()).label })}
        </p>
      </fieldset>

      <fieldset className="field">
        <legend className="field-label">{t('settings.rest')}</legend>
        <div className="segmented">
          {[0, 60, 90, 120, 180].map((s) => (
            <button key={s} type="button" className={state.settings.restSeconds === s ? 'is-on' : ''}
              onClick={() => dispatch({ type: 'settings/update', patch: { restSeconds: s } })}>
              {s === 0 ? t('settings.off') : s < 120 ? `${s} s` : `${s / 60} min`}
            </button>
          ))}
        </div>
        <p className="muted small">{t(state.settings.restSeconds > 0 ? 'settings.restHint' : 'settings.restOffHint')}</p>
      </fieldset>

      {state.settings.restSeconds > 0 && (
      <fieldset className="field">
        <legend className="field-label">{t('settings.restSound')}</legend>
        <div className="segmented">
          {[true, false].map((on) => (
            <button key={String(on)} type="button" className={(state.settings.restSound !== false) === on ? 'is-on' : ''}
              onClick={() => dispatch({ type: 'settings/update', patch: { restSound: on } })}>
              {t(on ? 'settings.on' : 'settings.off')}
            </button>
          ))}
        </div>
        <p className="muted small">{t('settings.restSoundHint')}</p>
      </fieldset>
      )}

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

      <p className="muted small center version">{t('settings.version', { version: __APP_VERSION__ })}</p>
    </>
  );
}
