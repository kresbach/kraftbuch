// Umsortieren per Drag & Drop mit Pointer-Events – funktioniert mit Finger (iOS/Android) und Maus.
// Gezogen wird nur am Griff; die übrigen Einträge rutschen sichtbar zur Seite.
// Am Bildschirmrand scrollt die Seite mit. Tastatur: Pfeil hoch/runter am Griff.
//
// Performance: Während des Ziehens rendert React nichts. Positionen werden höchstens einmal pro
// Bildschirm-Frame direkt per `transform` gesetzt (GPU-beschleunigt, kein Layout); erst beim
// Loslassen wird die neue Reihenfolge an React übergeben.
import { useEffect, useRef } from 'react';
import { Icon } from './Icon.jsx';

export { moveItem } from '../utils/moveItem.js';

const EDGE = 90; // Abstand zum Rand, ab dem beim Ziehen gescrollt wird (px)
const MIN_MOVE = 12; // so weit muss der Finger in eine Richtung gezogen haben, bevor gescrollt wird
const MAX_SCROLL = 12; // höchstens so viele px pro Bild mitscrollen – ruhiger als vorher
const HYST = 14; // erst so weit über die Mitte des Nachbarn hinaus tauschen (verhindert Hin- und Herspringen)
const DROP_MS = 220; // Dauer, bis die losgelassene Karte an ihren Platz geglitten ist
const LIFT = 'scale(1.02)'; // gezogene Karte leicht angehoben

export function useSortable(onMove) {
  const items = useRef([]);
  const handles = useRef([]);
  const drag = useRef(null);
  const dropping = useRef(null); // Karte gleitet gerade an ihren Platz
  const focusAfterMove = useRef(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  // Nach einem Verschieben per Tastatur den Griff des verschobenen Eintrags fokussieren
  useEffect(() => {
    if (focusAfterMove.current == null) return;
    handles.current[focusAfterMove.current]?.focus();
    focusAfterMove.current = null;
  });

  useEffect(() => () => {
    end(false);
    if (dropping.current) finish(dropping.current, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Ein Frame: Auto-Scroll, Zielposition berechnen, Transforms setzen. */
  function frame() {
    const d = drag.current;
    if (!d) return;
    d.raf = requestAnimationFrame(frame);

    // Auto-Scroll nur in Zugrichtung (Antippen nahe am Rand scrollt nicht)
    const y = d.lastClientY;
    const bottom = window.innerHeight - EDGE - 70; // Tab-Leiste berücksichtigen
    const movedUp = y < d.startClientY - MIN_MOVE;
    const movedDown = y > d.startClientY + MIN_MOVE;
    const v = movedUp && y < EDGE ? -Math.min(MAX_SCROLL, Math.ceil((EDGE - y) / 10))
      : movedDown && y > bottom ? Math.min(MAX_SCROLL, Math.ceil((y - bottom) / 10)) : 0;
    if (v) window.scrollBy(0, v);

    const dy = y + window.scrollY - d.startPageY;
    if (dy === d.lastDy) return; // nichts verändert → nichts zu tun
    d.lastDy = dy;

    const r = d.rects[d.from];
    const center = r.top + dy + r.height / 2;
    const mid = (i) => d.rects[i].top + d.rects[i].height / 2;
    // Mit Hysterese: schon ausgewichene Karten bleiben ausgewichen, bis die Mitte deutlich zurück ist
    let to = d.from;
    for (let i = d.from + 1; i < d.rects.length; i++) if (center > mid(i) + (i <= d.to ? -HYST : HYST)) to = i;
    for (let i = d.from - 1; i >= 0; i--) if (center < mid(i) + (i >= d.to ? HYST : -HYST)) to = i;

    d.els[d.from].style.transform = `translate3d(0, ${dy}px, 0) ${LIFT}`;
    if (to !== d.to) {
      d.to = to;
      const shift = r.height + d.gap;
      d.els.forEach((el, i) => {
        if (i === d.from) return;
        const s = d.from < to && i > d.from && i <= to ? -shift : to < d.from && i >= to && i < d.from ? shift : 0;
        el.style.transform = s ? `translate3d(0, ${s}px, 0)` : '';
      });
    }
  }

  function finish(d, commit) {
    clearTimeout(d.dropTimer);
    document.body.classList.remove('is-sorting');
    d.els.forEach((el) => {
      el.classList.remove('is-dragging', 'is-shifting', 'is-dropping');
      el.style.transform = '';
    });
    // Im selben Schritt neu ordnen: Die Karten stehen optisch schon am Ziel, es springt nichts.
    if (commit && d.to !== d.from) onMoveRef.current(d.from, d.to);
  }

  function end(commit) {
    const d = drag.current;
    if (!d) return;
    cancelAnimationFrame(d.raf);
    drag.current = null;
    if (!commit || !d.els[d.from]?.isConnected) return finish(d, false);
    // Losgelassene Karte gleitet an ihren Zielplatz, erst danach wird die Reihenfolge übernommen
    const r = d.rects[d.from];
    const target = d.to > d.from ? d.rects[d.to].top + d.rects[d.to].height - r.height
      : d.to < d.from ? d.rects[d.to].top : r.top;
    const el = d.els[d.from];
    el.classList.add('is-dropping');
    el.style.transform = `translate3d(0, ${target - r.top}px, 0)`;
    dropping.current = d;
    d.dropTimer = setTimeout(() => {
      dropping.current = null;
      finish(d, true);
    }, DROP_MS);
  }

  function handleProps(i, count) {
    return {
      ref: (el) => { handles.current[i] = el; },
      onPointerDown: (e) => {
        if (e.button > 0 || dropping.current) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        const els = items.current.slice(0, count);
        const rects = els.map((el) => {
          const b = el.getBoundingClientRect();
          return { top: b.top + window.scrollY, height: b.height };
        });
        const gap = rects.length > 1 ? Math.max(0, rects[1].top - rects[0].top - rects[0].height) : 0;
        els.forEach((el, j) => el.classList.add(j === i ? 'is-dragging' : 'is-shifting'));
        document.body.classList.add('is-sorting');
        drag.current = {
          from: i, to: i, els, rects, gap, lastDy: null,
          startPageY: e.clientY + window.scrollY, startClientY: e.clientY, lastClientY: e.clientY,
        };
        drag.current.raf = requestAnimationFrame(frame);
      },
      onPointerMove: (e) => {
        if (drag.current) drag.current.lastClientY = e.clientY; // verarbeitet im nächsten Frame
      },
      onPointerUp: () => end(true),
      onPointerCancel: () => end(false),
      onKeyDown: (e) => {
        const to = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : null;
        if (to == null || to < 0 || to >= count) return;
        e.preventDefault();
        focusAfterMove.current = to;
        onMoveRef.current(i, to);
      },
    };
  }

  /** Ref für einen sortierbaren Eintrag. */
  const itemRef = (i) => (el) => { items.current[i] = el; };

  return { handleProps, itemRef };
}

/** Griff zum Ziehen (⠿). */
export function DragHandle({ label, className = 'drag-handle', ...props }) {
  return (
    <button type="button" className={className} aria-label={label} title={label} {...props}>
      <Icon name="grip" size={18} strokeWidth={3} />
    </button>
  );
}
