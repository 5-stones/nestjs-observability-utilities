/** Create a new Record from filtered entries of another Record. */
export function filterEntries<T>(
  obj: Record<string, T>,
  predicate: (
    value: [string, T],
    index: number,
    array: [string, T][],
  ) => unknown,
) {
  return Object.fromEntries(Object.entries(obj).filter(predicate));
}
