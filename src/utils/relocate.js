// Umzug der App von https://kresbach.github.io/testPhil/ nach https://kresbach.github.io/kraftbuch/.
// Die Daten liegen im Browser pro Domain und bleiben deshalb erhalten. Läuft diese App noch unter
// einer anderen Adresse (z. B. alte Installation, aus dem Offline-Speicher), wird geprüft, ob die
// neue Adresse erreichbar ist; dann wird der alte Service Worker entfernt und weitergeleitet.

export const HOME_URL = 'https://kresbach.github.io/kraftbuch/';

export async function relocateIfMoved() {
  const home = new URL(HOME_URL);
  if (location.hostname !== home.hostname || location.pathname.startsWith(home.pathname)) return false;
  try {
    const res = await fetch(`${HOME_URL}manifest.webmanifest`, { cache: 'no-store' });
    if (!res.ok) return false; // neue Adresse (noch) nicht online → hier bleiben
  } catch {
    return false; // offline → später erneut versuchen
  }
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(regs.filter((r) => !r.scope.startsWith(HOME_URL)).map((r) => r.unregister()));
    const keys = (await caches?.keys()) ?? [];
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    // Aufräumen ist optional – weiterleiten in jedem Fall
  }
  location.replace(HOME_URL + location.hash);
  return true;
}
