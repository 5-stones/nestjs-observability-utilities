/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ArgumentsHost,
  Catch,
  HttpException,
  InternalServerErrorException,
  Logger,
  HttpServer,
  ContextType,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseExceptionFilter } from '@nestjs/core';
import { log } from './log';

// attempt to import graphql
let graphql: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  graphql = require('@nestjs/graphql');
} catch (e) {}

/**
 * Replaces the default ExceptionHandler to log warnings and include context.
 *
 * ```
 * import { HttpAdapterHost } from '@nestjs/core';
 * ...
 * const { httpAdapter } = app.get(HttpAdapterHost);
 * app.useGlobalFilters(new ExceptionFilter(httpAdapter));
 * ```
 */
@Catch()
export class ExceptionFilter extends BaseExceptionFilter<unknown> {
  private readonly loggers: Record<string, Logger> = {};

  constructor(applicationRef?: HttpServer) {
    super(applicationRef);
  }

  override catch(error: unknown, host: ArgumentsHost) {
    const ctxType = host.getType<ContextType | 'graphql'>();
    const { reqStr, logContext, response } = this.getContextInfo(ctxType, host);

    this.logError(ctxType, reqStr, logContext, error);

    if (error instanceof HttpException && response) {
      this.handleSpecialErrors(error, response);
    }

    const maskedError = this.maskError(error, ctxType);

    // default processing for error (for qgl the error needs to be returned)
    return ctxType === 'graphql' ? maskedError : super.catch(maskedError, host);
  }

  /** Obscure server errors from end users for security. */
  protected maskError(error: unknown, ctxType: ContextType | 'graphql') {
    if (error instanceof HttpException) {
      return error;
    }
    return new InternalServerErrorException();
  }

  protected getContextInfo(
    ctxType: ContextType | 'graphql',
    host: ArgumentsHost,
  ): {
    reqStr: string;
    logContext: Record<string, unknown>;
    response: Response | undefined;
  } {
    let reqStr = '';
    let logContext: Record<string, unknown> = {};
    let response: Response | undefined;

    if (ctxType === 'http') {
      const ctx = host.switchToHttp();
      const request = ctx.getRequest<Request>();
      reqStr = this.getRequestStr(request);
      logContext = this.getRequestContext(request);
      response = ctx.getResponse<Response>();
    } else if (ctxType === 'graphql') {
      const ctx = graphql?.GqlArgumentsHost.create(host);
      if (ctx) {
        reqStr = this.getGqlStr(ctx);
        logContext = this.getGqlContext(ctx);
        response = ctx.getContext().res;
      }
    }

    return {
      reqStr,
      logContext,
      response,
    };
  }

  protected getLogger(ctxType: ContextType | 'graphql') {
    if (!(ctxType in this.loggers)) {
      this.loggers[ctxType] = new Logger(ctxType);
    }
    return this.loggers[ctxType];
  }

  protected logError(
    ctxType: ContextType | 'graphql',
    reqStr: string,
    context: Record<string, unknown>,
    error: unknown,
  ) {
    const logger = this.getLogger(ctxType);
    if (error instanceof HttpException) {
      logger.warn(
        log`${error.name} (${error.getStatus()}) on ${reqStr} ${context}: ${error.message}`,
      );
    } else if (error instanceof Error) {
      logger.error(
        log`${error.name || 'Error'} on ${reqStr} ${context}:`,
        error.stack,
      );
    } else {
      // something was thrown that isn't an Error (string, plain object, etc)
      logger.error(log`Unexpected Error on ${reqStr} ${context}: ${error}`);
    }
  }

  protected handleSpecialErrors(error: HttpException, response: Response) {
    // add headers to the response if they're in the HttpException (for redirects, rate limiting, etc)
    if (
      response?.setHeader &&
      'headers' in error &&
      error.headers &&
      typeof error.headers === 'object'
    ) {
      for (const [header, value] of Object.entries(error.headers)) {
        if (typeof header === 'string' && typeof value === 'string') {
          response.setHeader(header, value);
        }
      }
    }
  }

  protected getRequestStr(request: Request) {
    return `${request.method} ${request.url}`;
  }

  protected getGqlStr(ctx: any) {
    const { path } = ctx.getInfo();
    return `${path.typename} ${path.key}`;
  }

  protected getRequestContext(request: Request) {
    const context: Record<string, unknown> = {};
    if ('user' in request && request.user && typeof request.user === 'object') {
      const user = request.user;
      if ('sub' in user && user.sub) {
        // user id in oidc standard jwt
        context.userId = user.sub;
      } else if ('id' in user && user.id) {
        context.userId = user.id;
      }
    }
    if (request.ip) {
      context.ip = request.ip;
    }
    return context;
  }

  protected getGqlContext(ctx: any) {
    const request = ctx.getContext().req;
    return this.getRequestContext(request);
  }
}
