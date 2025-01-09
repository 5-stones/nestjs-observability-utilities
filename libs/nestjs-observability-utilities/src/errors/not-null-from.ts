import { NotFoundException } from '@nestjs/common';
import { Observable, firstValueFrom } from 'rxjs';

/** Throw a NotFoundException if the observable returns a falsy value. */
export async function notNullFrom<T>(
  obs: Observable<T | undefined | null>,
  err?: string | Error,
): Promise<T> {
  const v = await firstValueFrom(obs);
  return notNull(v, err);
}

/** Throw a NotFoundException if the value is falsy. */
export function notNull<T>(v: T | undefined | null, err?: string | Error): T {
  if (!v) {
    throw err instanceof Error ? err : new NotFoundException(err);
  }
  return v;
}
