// Zusammenfassung eines Trainings als Bild (PNG, 1080 × 1350) – zum Teilen, z. B. per WhatsApp.
// Gezeichnet auf ein Canvas, ohne externe Bibliotheken; Farben wie in der App (helles Thema).
import { exerciseVolume, fmtDate, fmtDuration, fmtW, fmtWeight, getUnit, parseNum, estimate1RM } from './training.js';

const W = 1080, PAD = 80, MAX_ROWS = 7;
const C = { bg: '#f3f5f0', card: '#ffffff', line: '#d8ddd0', fg: '#1b2018', muted: '#5b6355', accent: '#647e4b', accentText: '#4e6a3c', soft: '#e6eddd', gold: '#f6e7b8', goldText: '#6b4e00' };
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Text kürzen, bis er in die Breite passt */
function fit(ctx, text, max) {
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
  return `${s}…`;
}

/** Bester Satz einer Übung als Text: „100 kg × 5“ bzw. „12 Wdh“ / „45 s“ */
function bestSetText(ex, info, repsLabel) {
  const done = ex.sets.filter((s) => s.done !== false);
  if (!done.length) return '';
  const best = done.reduce((a, s) => (estimate1RM(parseNum(s.kg), parseNum(s.reps)) > estimate1RM(parseNum(a.kg), parseNum(a.reps))
    || (!parseNum(a.kg) && parseNum(s.reps) > parseNum(a.reps)) ? s : a));
  const reps = info?.timed ? `${best.reps} s` : `${best.reps}`;
  return parseNum(best.kg) > 0 ? `${fmtW(parseNum(best.kg))} ${getUnit()} × ${reps}` : info?.timed ? reps : `${reps} ${repsLabel}`;
}

/**
 * @param w        abgeschlossenes Training
 * @param opts     { title, exercises (Map), exLabel(e) → {name, tag}, t, records }
 * @returns Promise<Blob>
 */
export function renderSummary(w, { title, exercises, exLabel, t, records }) {
  // Höhe passt sich der Zahl der Übungen an: mindestens quadratisch, höchstens 4:5 (Instagram-Hochformat)
  const rows = Math.min(w.exercises.length, MAX_ROWS) + (w.exercises.length > MAX_ROWS ? 0.6 : 0);
  const H = Math.round(Math.min(1350, Math.max(1080, 636 + rows * 96 + 150)));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // Kopf
  ctx.fillStyle = C.accent;
  ctx.fillRect(0, 0, W, 300);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText(fmtDate(w.startedAt).toUpperCase(), PAD, 110);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 76px ${FONT}`;
  ctx.fillText(fit(ctx, title, W - 2 * PAD), PAD, 200);
  ctx.font = `500 36px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const sets = w.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  ctx.fillText(`${fmtDuration(new Date(w.finishedAt) - new Date(w.startedAt))} · ${t('history.sets', { n: sets })}`, PAD, 258);

  // Gewicht groß
  let y = 360;
  roundRect(ctx, PAD, y, W - 2 * PAD, 190, 28);
  ctx.fillStyle = C.card;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = C.accentText;
  ctx.font = `800 96px ${FONT}`;
  const volume = w.exercises.reduce((n, ex) => n + exerciseVolume(ex), 0);
  ctx.fillText(fmtWeight(volume), PAD + 44, y + 112);
  ctx.fillStyle = C.muted;
  ctx.font = `500 34px ${FONT}`;
  ctx.fillText(t('workout.moved'), PAD + 48, y + 160);
  if (records > 0) {
    ctx.font = `700 32px ${FONT}`;
    const label = `🏆 ${t('records.count', { n: records })}`;
    const lw = ctx.measureText(label).width + 48;
    roundRect(ctx, W - PAD - 44 - lw, y + 66, lw, 60, 30);
    ctx.fillStyle = C.gold;
    ctx.fill();
    ctx.fillStyle = C.goldText;
    ctx.fillText(label, W - PAD - 44 - lw + 24, y + 107);
  }

  // Übungen
  y += 276;
  const list = w.exercises.slice(0, MAX_ROWS);
  for (const ex of list) {
    const info = exercises.get(ex.exerciseId);
    const { name, tag } = exLabel(info);
    ctx.fillStyle = C.fg;
    ctx.font = `700 40px ${FONT}`;
    const right = bestSetText(ex, info, t('workout.reps'));
    ctx.font = `600 36px ${FONT}`;
    const rw = ctx.measureText(right).width;
    ctx.font = `700 40px ${FONT}`;
    ctx.fillText(fit(ctx, name, W - 2 * PAD - rw - 40), PAD, y);
    ctx.fillStyle = C.muted;
    ctx.font = `500 30px ${FONT}`;
    ctx.fillText(`${tag ? `${tag} · ` : ''}${t('history.sets', { n: ex.sets.length })}`, PAD, y + 42);
    ctx.fillStyle = C.fg;
    ctx.font = `600 36px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(right, W - PAD, y + 4);
    ctx.textAlign = 'left';
    y += 96;
  }
  if (w.exercises.length > list.length) {
    ctx.fillStyle = C.muted;
    ctx.font = `500 30px ${FONT}`;
    ctx.fillText(`+ ${w.exercises.length - list.length} …`, PAD, y);
  }

  // Fuß
  ctx.fillStyle = C.muted;
  ctx.font = `600 30px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('Kraftbuch', W / 2, H - 56);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
