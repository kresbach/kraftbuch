import { useEffect, useRef } from 'react';
import { Icon } from './Icon.jsx';
import { useI18n } from '../i18n/index.jsx';

// Von unten einfahrendes Panel (auf Desktop zentrierter Dialog).
// `tall`: nutzt die volle Höhe – für Listen mit Suche (z. B. Übungsauswahl).
export function Sheet({ title, onClose, children, tall = false }) {
  const { t } = useI18n();
  const backdrop = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose]);

  // Bildschirmtastatur (v. a. iOS): Panel auf den sichtbaren Bereich über der Tastatur begrenzen,
  // statt es hinter der Tastatur verschwinden zu lassen.
  useEffect(() => {
    const vv = window.visualViewport;
    const el = backdrop.current;
    if (!vv || !el) return;
    const fit = () => {
      const keyboard = window.innerHeight - vv.height > 80;
      el.style.top = keyboard ? `${vv.offsetTop}px` : '';
      el.style.height = keyboard ? `${vv.height}px` : '';
      el.classList.toggle('has-keyboard', keyboard);
    };
    fit();
    vv.addEventListener('resize', fit);
    vv.addEventListener('scroll', fit);
    return () => {
      vv.removeEventListener('resize', fit);
      vv.removeEventListener('scroll', fit);
    };
  }, []);

  return (
    <div className="sheet-backdrop" ref={backdrop} onClick={onClose}>
      <div className={`sheet ${tall ? 'is-tall' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <Icon name="close" />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
