import { Catch, Logger, ArgumentsHost, HttpException } from '@nestjs/common';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';
import { isAxiosError } from '../errors/is-axios-error';
import { log } from '../logging/log';

/** Transforms Errors into RpcExceptions to give more context to client microservices. */
@Catch()
export class RpcExceptionsFilter extends BaseRpcExceptionFilter<
  unknown,
  RpcException
> {
  private logger = new Logger(RpcExceptionsFilter.name);

  override catch(
    exception: unknown,
    host: ArgumentsHost,
  ): Observable<RpcException> {
    if (exception instanceof RpcException) {
      return super.catch(exception, host);
    } else if (exception instanceof HttpException) {
      return throwError(() => ({
        status: 'error',
        name: exception.name,
        message: exception.message,
        statusCode: exception.getStatus(),
        response: exception.getResponse(),
      }));
    } else if (isAxiosError(exception)) {
      this.logger.warn(log`Error while handling message: ${exception}`);
      return throwError(() => ({
        status: 'error',
        name: 'AxiosError',
        message: exception.message,
        statusCode: exception.response?.status,
        response: exception.response?.data,
      }));
    } else if (exception instanceof Error) {
      this.logger.warn(log`Error while handling message: ${exception}`);
      return throwError(() => ({
        status: 'error',
        name: exception.name,
        message: exception.message,
      }));
    }

    // throws { "status": "error", "message": "Internal server error" }
    return super.catch(exception, host);
  }
}
