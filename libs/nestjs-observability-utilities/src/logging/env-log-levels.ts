import { LogLevel } from '@nestjs/common';

/**
 * Get log levels from an env variable.
 *
 * const app = await NestFactory.create(AppModule, { logger: envLogLevels() });
 */
export function envLogLevels(
  envVar = 'LOG_LEVEL',
  defaultLevel = 'log',
): LogLevel[] {
  const logLevels: LogLevel[] = [
    'fatal',
    'error',
    'warn',
    'log',
    'verbose',
    'debug',
  ];
  const logLevel = (process.env?.[envVar] || defaultLevel) as LogLevel;
  return logLevels.slice(0, logLevels.indexOf(logLevel) + 1);
}
