// Zugriff auf Google Drive: Anmeldung über Google Identity Services, Datei über die Drive-REST-API.
// Die App sieht nur Dateien, die sie selbst angelegt hat (Berechtigung `drive.file`).

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FILE_NAME = 'Kraftbuch-Daten.json';
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

/** Wird geworfen, wenn eine (erneute) Anmeldung per Tippen nötig ist. */
export class AuthRequired extends Error {}

/** Fehler mit Code; die Oberfläche übersetzt ihn (cloud.err.<code>). */
export class DriveError extends Error {
  constructor(code, vars = {}) {
    super(code);
    this.code = code;
    this.vars = vars;
  }
}

let gisPromise;
function loadGis() {
  gisPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve(window.google);
    s.onerror = () => {
      gisPromise = null;
      reject(new DriveError('gisLoad'));
    };
    document.head.appendChild(s);
  });
  return gisPromise;
}

/** Öffnet das Google-Anmeldefenster. Nur aus einem Tippen/Klick heraus aufrufen. */
export async function signIn({ firstTime }) {
  const google = await loadGis();
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: (r) => {
        if (r.error) reject(new DriveError('signInRejected'));
        else resolve({ token: r.access_token, expiresAt: Date.now() + (Number(r.expires_in) - 60) * 1000 });
      },
      error_callback: () => reject(new DriveError('signInCancelled')),
    });
    client.requestAccessToken({ prompt: firstTime ? 'consent' : '' });
  });
}

async function api(token, url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new AuthRequired('auth');
  if (!res.ok) throw new DriveError('http', { status: res.status });
  return res;
}

/** Sucht die Datendatei. Liefert {id, modifiedTime} oder null. */
export async function findFile(token) {
  const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
  const res = await api(token, `${API}/files?q=${q}&spaces=drive&orderBy=modifiedTime desc&fields=files(id,modifiedTime)`);
  const { files } = await res.json();
  return files?.[0] ?? null;
}

export async function downloadFile(token, id) {
  const res = await api(token, `${API}/files/${id}?alt=media`);
  return res.json();
}

/** Legt die Datei an (ohne id) oder überschreibt sie. Liefert {id, modifiedTime}. */
export async function uploadFile(token, id, data) {
  const body = JSON.stringify(data);
  if (id) {
    const res = await api(token, `${UPLOAD}/files/${id}?uploadType=media&fields=id,modifiedTime`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    return res.json();
  }
  const boundary = `kraftbuch${Date.now()}`;
  const multipart =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify({ name: FILE_NAME, mimeType: 'application/json' }) +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
  const res = await api(token, `${UPLOAD}/files?uploadType=multipart&fields=id,modifiedTime`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipart,
  });
  return res.json();
}
