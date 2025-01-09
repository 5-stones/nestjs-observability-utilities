import { HttpException, HttpExceptionOptions } from '@nestjs/common';

export class FoundException extends HttpException {
  headers: Record<string, string | undefined>;

  constructor(
    location: string,
    response?: string | Record<string, any>,
    { ...options }: HttpExceptionOptions = {},
  ) {
    super(response || 'Found', 302, options);

    this.headers = { Location: location };
  }
}
