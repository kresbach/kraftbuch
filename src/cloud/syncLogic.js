// Entscheidet, in welche Richtung abgeglichen wird. Rein und ohne Seiteneffekte, damit testbar.
//   localUpdatedAt: letzte Änderung auf diesem Gerät
//   lastSyncedAt:   Stand, der beim letzten Abgleich auf beiden Seiten gleich war
//   remote:         {modifiedTime} der Cloud-Datei oder null
//   remoteVersion:  modifiedTime der Cloud-Datei beim letzten Abgleich
export function decideSync({ localUpdatedAt, lastSyncedAt, remote, remoteVersion }) {
  if (!remote) return 'create';
  const remoteChanged = remote.modifiedTime !== remoteVersion;
  const localDirty = localUpdatedAt > lastSyncedAt;
  if (remoteChanged && localDirty) return 'conflict';
  if (remoteChanged) return 'download';
  if (localDirty) return 'upload';
  return 'none';
}
