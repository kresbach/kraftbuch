// Zurück-Taste (Android, Browser, Wischgeste) schließt zuerst das oberste offene Fenster bzw. den
// Editor, statt die App zu verlassen. Jedes geöffnete Element legt dazu einen Verlaufseintrag an;
// wird es anders geschlossen (Tippen auf ×), entfernt es seinen Eintrag wieder.
import { useEffect, useLayoutEffect, useRef } from 'react';

let depth = 0;
// Schließen mehrere Elemente gleichzeitig (z. B. Plan-Editor und Tab beim Tab-Wechsel), werden ihre
// Einträge gesammelt mit einem Sprung entfernt – sonst bliebe ein „toter“ Zurück-Schritt übrig.
let pending = 0;
const flush = () => {
  if (pending) history.go(-pending);
  pending = 0;
};
// Scrollposition verwaltet die App selbst (je Tab); sonst springt der Browser beim Zurück dazwischen
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

/** `outer`: für die äußerste Ebene (Tabs). Öffnen Tab und Editor im selben Moment, muss der Tab seinen
 *  Eintrag zuerst anlegen – Layout-Effekte laufen vor den normalen Effekten der inneren Komponenten. */
export function useBackClose(onClose, active = true, { outer = false } = {}) {
  const close = useRef(onClose);
  close.current = onClose;

  (outer ? useLayoutEffect : useEffect)(() => {
    if (!active) return;
    const mine = ++depth;
    history.pushState({ kraftbuch: mine }, '');
    let closedByBack = false;
    const onPop = (e) => {
      if (closedByBack || (e.state?.kraftbuch ?? 0) >= mine) return;
      closedByBack = true;
      close.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      depth = Math.min(depth, mine - 1); // Reihenfolge der Aufräumarbeiten egal
      if (!closedByBack && (history.state?.kraftbuch ?? 0) >= mine) {
        if (!pending) queueMicrotask(flush);
        pending += 1;
      }
    };
  }, [active]);
}
