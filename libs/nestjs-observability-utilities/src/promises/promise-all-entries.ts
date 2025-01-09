/** Like Promise.all, but awaits all values of an object. */
export async function promiseAllEntries<T extends object>(
  obj: T,
): Promise<{ [key in keyof T]: Awaited<T[key]> }> {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(obj).map(async ([key, value]) => {
        return [key, await value];
      }),
    ),
  );
}
