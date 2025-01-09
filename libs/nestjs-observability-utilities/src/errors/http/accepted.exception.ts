import { HttpException, HttpExceptionOptions } from '@nestjs/common';

/** 202 Accepted response status code indicates that the request has been accepted for processing, but the processing has not been completed. */
export class AcceptedException extends HttpException {
  headers: Record<string, string | undefined>;

  constructor(
    response?: string | Record<string, any>,
    {
      retryAfter,
      location,
      ...options
    }: HttpExceptionOptions & { retryAfter?: number; location?: string } = {},
  ) {
    super(response || 'Accepted', 202, options);

    this.headers = {
      Location: location,
      'Retry-After': retryAfter ? String(retryAfter) : undefined,
    };
  }
}
