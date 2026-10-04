// Kurzer Signalton am Ende der Pause (Web Audio – keine Audiodatei nötig).
// iOS gibt Ton nur frei, wenn der AudioContext bei einer Nutzeraktion gestartet wurde; deshalb
// ruft das Abhaken eines Satzes `unlockSound()` auf. Der Stummschalter des iPhones bleibt wirksam.
let ctx = null;

export function unlockSound() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null; // kein Web Audio verfügbar
  }
}

/** Zwei kurze Töne. */
export function beep() {
  if (!ctx) return;
  const start = ctx.currentTime + 0.02;
  [0, 0.22].forEach((offset) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(0.4, start + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start + offset);
    osc.stop(start + offset + 0.18);
  });
}
