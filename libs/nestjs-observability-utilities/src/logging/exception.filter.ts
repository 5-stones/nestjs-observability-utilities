import {
  ArgumentsHost,
  Catch,
  HttpException,
  InternalServerErrorException,
  Logger,
  HttpServer,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseExceptionFilter } from '@nestjs/core';
import { log } from './log';

/**
 * Replaces the default ExceptionHandler to log warnings and include context.
 *
 * import { HttpAdapterHost } from '@nestjs/core';
 * ...
 * const { httpAdapter } = app.get(HttpAdapterHost);
 * app.useGlobalFilters(new ExceptionFilter(httpAdapter));
 */
@Catch()
export class ExceptionFilter extends BaseExceptionFilter<unknown> {
  private readonly logger = new Logger('main');
  private readonly getContext: (request: Request) => Record<string, unknown>;

  constructor(
    applicationRef?: HttpServer,
    options?: {
      getContext: (request: Request) => Record<string, unknown>;
    },
  ) {
    super(applicationRef);
    this.getContext = options?.getContext ?? getJwtUser;
  }

  override catch(error: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const { method, url, ip } = request;

    const req = `${method} ${url}`;
    const context: Record<string, unknown> = {
      ip,
      ...this.getContext(request),
    };

    if (error instanceof HttpException) {
      //context.stack = parseStack(error.stack);
      this.logger.warn(
        log`${error.name} (${error.getStatus()}) on ${req} ${context}: ${error.message}`,
      );

      if (
        'headers' in error &&
        error.headers &&
        typeof error.headers === 'object'
      ) {
        // pass through headers like `location` so that we can redirect by throwing an HttpException
        const response = ctx.getResponse<Response>();
        for (const [header, value] of Object.entries(error.headers)) {
          if (typeof header === 'string' && typeof value === 'string') {
            response.setHeader(header, value);
          }
        }
      }

      super.catch(error, host);
    } else {
      if (error instanceof Error) {
        this.logger.error(
          log`${error.name || 'Error'} on ${req} ${context}:`,
          error.stack,
        );
      } else {
        this.logger.error(log`Unexpected Error on ${req} ${context}: ${error}`);
      }
      super.catch(new InternalServerErrorException(), host);
    }
  }
}

function getJwtUser(request: RequestWithUser): { userId?: string } {
  return { userId: request.user?.sub };
}

type RequestWithUser = Request & { user?: { sub?: string } };
