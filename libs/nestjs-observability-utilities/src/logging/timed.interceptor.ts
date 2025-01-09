import {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';

/** Log the time taken for requests to complete. */
export class TimedInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimedInterceptor.name);

  constructor(
    protected warnThreshold = 2000, // 2 seconds
    protected timeoutThreshold = 60000, // 60 seconds (normal alb/ingress timeout)
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const cls = context.getClass();
    const handler = context.getHandler();
    const method = `${cls.name}.${handler.name}`;

    const start = Date.now();
    return next.handle().pipe(
      tap(
        () => {
          const duration = Date.now() - start;
          if (duration > this.timeoutThreshold) {
            this.logger.error(
              `${method} succeeded after timeout: ${this.timeoutThreshold}ms < ${duration}ms`,
            );
          } else if (duration > this.warnThreshold) {
            this.logger.warn(
              `${method} succeeded after warning time limit: ${this.warnThreshold}ms < ${duration}ms`,
            );
          } else {
            this.logger.debug(`${method} succeeded after ${duration}ms`);
          }
        },

        (err) => {
          const duration = Date.now() - start;
          this.logger.warn(
            `${method} failed after ${duration}ms: ${JSON.stringify(String(err))}`,
          );
          return throwError(err);
        },
      ),
    );
  }
}
