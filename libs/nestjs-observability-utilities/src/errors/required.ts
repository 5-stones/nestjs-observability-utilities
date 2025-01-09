import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

/** Throws a BadRequestException if the value is undefined or null. */
export function required<T>(name: string, value: T | undefined | null): T {
  if (value === undefined || value === null) {
    throw new BadRequestException(`${name} is required`);
  }
  return value;
}

/** Throws a ServiceUnavailableException if the service is undefined or null. */
export function requiredService<T>(
  name: string,
  service: T | undefined | null,
): T {
  if (service === undefined || service === null) {
    throw new ServiceUnavailableException(`${name} service not available`);
  }
  return service;
}
