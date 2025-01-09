import {
  Injectable,
  ConsoleLogger,
  LogLevel,
  ConsoleLoggerOptions,
  Optional,
} from '@nestjs/common';
import { log, logStringify, parseStack } from './log';
import { envLogLevels } from './env-log-levels';
import type { TraceAPI } from '@opentelemetry/api';

export interface OneLineLoggerOptions extends ConsoleLoggerOptions {
  /** If true, log messages will also be sent as OpenTelemetry events. */
  otelEvents?: boolean;
}

@Injectable()
export class OneLineLogger extends ConsoleLogger {
  stackPattern = /^(.)+\n\s+at .+:\d+:\d+/;

  protected override options!: OneLineLoggerOptions;
  protected trace?: TraceAPI;

  constructor(
    @Optional()
    context?: string,
    @Optional()
    options: OneLineLoggerOptions = {},
  ) {
    if (!options.logLevels) {
      options.logLevels = envLogLevels();
    }
    super(context!, options);

    if (options.otelEvents) {
      // import OpenTelemetry API if otelEvents is enabled (optional peer dependency)
      import('@opentelemetry/api')
        .then(({ trace }) => {
          this.trace = trace;
        })
        .catch((err) => {
          this.warn(
            log`Failed to import OpenTelemetry API adding logs as events: ${err}`,
            OneLineLogger.name,
          );
        });
    }
  }

  /** Error log where stack traces are logged as a compact JSON array. */
  override error(message: any, ...optionalParams: [...any, string?, string?]) {
    if (!this.isLevelEnabled('error')) {
      return;
    }

    // handle stack trace handling here, to prevent the default behavior with a second printMessages call
    let messageStr = this.handleMessage(message);
    const params = [];
    for (const param of optionalParams) {
      if (typeof param === 'string' && this.stackPattern.test(param)) {
        // tag on the error message with the stack trace as a JSON array
        const errMessage = param.slice(0, param.indexOf('\n'));
        messageStr += log` ${errMessage} ${parseStack(param)}`;
      } else {
        params.push(param);
      }
    }

    super.error(messageStr, ...params);
  }

  /** Print an array of messages in one line, separated by spaces. */
  protected override printMessages(
    messages: unknown[],
    context?: string,
    logLevel?: LogLevel,
    writeStreamType?: 'stdout' | 'stderr',
  ) {
    const messageStrs = messages.map((message) => this.handleMessage(message));
    if (this.options.otelEvents) {
      const [mainMessage, ...otherMessages] = messageStrs;
      this.trace
        ?.getActiveSpan()
        ?.addEvent(context ? `${context}.log` : 'log', {
          ...(logLevel && { 'log.severity': logLevel }),
          'log.message': mainMessage,
          ...(otherMessages.length && { 'log.context': otherMessages }),
          ...(writeStreamType && { 'log.iostream': writeStreamType }),
        });
    }
    const message = messageStrs.join(' ').replace(/[\r\n]+/g, ' ');
    super.printMessages([message], context, logLevel, writeStreamType);
  }

  protected handleMessage(message: unknown): string {
    if (typeof message === 'function') {
      message = this.handleFunction(message);
    }
    return typeof message === 'string' ? message : logStringify(message);
  }

  /** Get a value from a function for logging (from ConsoleLogger.stringifyMessage). */
  protected handleFunction(message: unknown): unknown {
    if (typeof message !== 'function') {
      return message;
    }
    const messageAsStr = Function.prototype.toString.call(message);
    const isClass = messageAsStr.startsWith('class ');
    if (isClass) {
      // If the message is a class, we will display the class name.
      return message.name;
    }
    // If the message is a non-class function, call it and re-resolve its value.
    return message();
  }
}
