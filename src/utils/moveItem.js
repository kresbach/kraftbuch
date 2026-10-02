/** Neue Liste, in der der Eintrag von `from` an Position `to` verschoben ist. */
export function moveItem(list, from, to) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
