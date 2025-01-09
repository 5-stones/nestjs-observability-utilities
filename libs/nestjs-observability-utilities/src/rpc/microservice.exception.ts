import {
  Logger,
  HttpException,
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GatewayTimeoutException,
  GoneException,
  HttpVersionNotSupportedException,
  ImATeapotException,
  InternalServerErrorException,
  MethodNotAllowedException,
  NotAcceptableException,
  NotFoundException,
  NotImplementedException,
  PayloadTooLargeException,
  PreconditionFailedException,
  RequestTimeoutException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { log } from '../logging/log';

export class MicroserviceException extends Error {
  status?: 'error';
  statusCode?: number;
  response?: Record<string, unknown>;

  constructor(err: unknown) {
    if (err && typeof err === 'object') {
      const { name, message, ...otherProps } = err as RpcExceptionObject;
      super(message);
      this.name = name || 'MicroserviceException';
      Object.assign(this, otherProps);
    } else {
      if (err) {
        super(typeof err === 'string' ? err : String(err));
      } else {
        super();
      }
      this.name = 'MicroserviceException';
    }
  }
}

const httpExceptions = {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GatewayTimeoutException,
  GoneException,
  HttpVersionNotSupportedException,
  ImATeapotException,
  InternalServerErrorException,
  MethodNotAllowedException,
  NotAcceptableException,
  NotFoundException,
  NotImplementedException,
  PayloadTooLargeException,
  PreconditionFailedException,
  RequestTimeoutException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
} as const;

function hasStatusCode(
  err: object,
): err is { statusCode: number; response?: unknown; message?: unknown } {
  return 'statusCode' in err;
}

function isHttpExceptionObj(err: object): err is {
  name: keyof typeof httpExceptions;
} {
  return (
    'name' in err && typeof err.name === 'string' && err.name in httpExceptions
  );
}

function getHttpExceptionResponse(err: object): object | string {
  if ('response' in err && err.response && typeof err.response === 'object') {
    return err.response;
  } else if ('message' in err && typeof err.message === 'string') {
    return err.message;
  } else if ('name' in err && typeof err.name === 'string') {
    return err.name;
  }
  return 'Unknown error';
}

/**
 * Transform poorly thrown errors from NestJS Microservice Clients into proper Errors.
 *
 * This will also transform HttpExceptions caught by the RpcExceptionsFilter back into the correct class.
 * Other errors will be returned as a MicroserviceException.
 */
export function transformError(
  err: unknown,
  options?: { logger: Logger },
): Error {
  if (err instanceof Error) {
    return err;
  }

  if (err && typeof err === 'object') {
    if (hasStatusCode(err)) {
      // recreate HttpExceptions
      const response = getHttpExceptionResponse(err);
      if (isHttpExceptionObj(err)) {
        const ErrorClass = httpExceptions[err.name];
        return new ErrorClass(response);
      } else if (err.statusCode === 404) {
        return new NotFoundException(response);
      } else {
        return new HttpException(response, err.statusCode);
      }
    }
  } else if (typeof err !== 'string') {
    options?.logger?.warn(log`Unexpected error type ${err}`);
  }

  return new MicroserviceException(err);
}

/** Properties of RpcExceptions when caught as a plain object. */
interface RpcExceptionObject {
  status?: 'error';
  name?: string;
  message?: string;
}
