import { Tracer, SpanOptions } from '@opentelemetry/api';
import { withSpan } from './with-span';

/** Decorator that wraps a method in an OpenTelemetry span. */
export function otelSpan<
  T extends (this: unknown, ...args: unknown[]) => unknown,
>(
  tracer: Tracer,
  name?: string | ((...args: Parameters<T>) => string),
  options: SpanOptions = {},
) {
  return (
    target: object,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    const originalMethod = descriptor.value;
    if (originalMethod) {
      descriptor.value = function (...args: Parameters<T>) {
        const spanName =
          typeof name === 'function'
            ? name(...args)
            : name || `${target.constructor.name}.${String(key)}`;
        return withSpan(tracer, spanName, options, () => {
          return originalMethod.apply(this, args);
        });
      } as T;
    }
    return descriptor;
  };
}
