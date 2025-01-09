/** Create a new object containing only specified properties. */
export function filterKeys<
  T extends Record<string | symbol, unknown>,
  K extends keyof T,
>(obj: T, keys: K[]): Pick<T, K> {
  return keys.reduce((result: Partial<Pick<T, K>>, key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
    return result;
  }, {}) as Pick<T, K>;
}
