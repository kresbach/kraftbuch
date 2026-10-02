// Datei speichern – je nach Gerät auf dem passenden Weg:
//  - Handy/Tablet (Touch): Teilen-Menü des Systems, z. B. „In Dateien sichern“ → iCloud Drive
//  - Desktop mit File System Access (Chrome, Edge): „Speichern unter“-Dialog
//  - sonst bzw. wenn ein Weg scheitert: normaler Download
// Liefert 'saved' | 'downloaded'; wirft AbortError, wenn der Nutzer abbricht.

const isTouchDevice = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

function download(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.rel = 'noopener';
  document.body.appendChild(a); // Firefox braucht das Element im Dokument
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'downloaded';
}

const isAbort = (e) => e?.name === 'AbortError';

export async function saveFile(file) {
  // Muss direkt aus einem Klick/Tippen heraus aufgerufen werden (Teilen und Dialog brauchen das).
  const touch = isTouchDevice();
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return 'saved';
    } catch (e) {
      if (isAbort(e)) throw e;
      return download(file); // Teilen nicht erlaubt → herunterladen
    }
  }

  if (!touch && typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: file.name,
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(file);
      await writable.close();
      return 'saved';
    } catch (e) {
      if (isAbort(e)) throw e;
      // z. B. Dialog in eingebetteter Ansicht gesperrt → herunterladen
    }
  }

  return download(file);
}
