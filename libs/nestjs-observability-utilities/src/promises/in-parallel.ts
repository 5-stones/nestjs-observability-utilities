/** Runs an async function on each item in parallel, up to a limit of simultaneous executions. */
export async function inParallel<I, R>(
  items: Iterable<I>,
  limit: number,
  callback: (item: I) => Promise<R>,
): Promise<R[]> {
  const promises: Promise<R>[] = [];
  const running = new Set<Promise<R>>();
  for (const item of items) {
    if (running.size >= limit) {
      await Promise.race(running);
    }
    const p = callback(item);
    running.add(p);
    p.finally(() => running.delete(p));

    promises.push(p);
  }
  return await Promise.all(promises);
}
