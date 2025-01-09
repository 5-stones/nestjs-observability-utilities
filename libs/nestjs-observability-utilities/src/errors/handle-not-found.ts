import { NotFoundException } from '@nestjs/common';

/**
 * Return null instead of throwing a NotFoundException.
 *
 * `try { ... } catch (err) { return handleNotFound(err); }`
 * or `somePromise.catch(handleNotFound);`
 */
export function handleNotFound(err: unknown): null {
  if (err instanceof NotFoundException) {
    return null;
  }
  throw err;
}
