import { Tracer, Span, SpanStatusCode, SpanOptions } from '@opentelemetry/api';

/** Like Tracer.startActiveSpan, but automatically ends the span and records exceptions. */
export function withSpan<R>(
  tracer: Tracer,
  name: string,
  fn: (span: Span) => R,
): R;
export function withSpan<R>(
  tracer: Tracer,
  name: string,
  options: SpanOptions,
  fn: (span: Span) => R,
): R;
export function withSpan<R>(
  tracer: Tracer,
  name: string,
  ...args: [SpanOptions, (span: Span) => R] | [(span: Span) => R]
): R {
  const options = args.length === 2 ? args[0] : {};
  const fn = args.length === 2 ? args[1] : args[0];
  return tracer.startActiveSpan(name, options, (span): R => {
    try {
      const result = fn(span);
      if (result instanceof Promise) {
        // we need to wait for the promise to resolve before ending the span
        result
          .then(() => {
            span.setStatus({ code: SpanStatusCode.OK });
          })
          .catch((err) => {
            span.recordException(err);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: err.message,
            });
          })
          .finally(() => {
            span.end();
          });
      } else {
        // non-promise success
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
      }
      return result;
    } catch (err) {
      // non-promise failure
      if (err instanceof Error) {
        span.recordException(err);
      }
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : String(err),
      });
      span.end();
      throw err;
    }
  });
}
