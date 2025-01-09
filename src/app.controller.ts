import {
  Controller,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Logger,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import {
  log,
  TimedInterceptor,
} from '@5stones/nestjs-observability-utilities/logging';
import { withSpan } from '@5stones/nestjs-observability-utilities/otel';
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer(`test-project.app.AppController`);

@Controller()
export class AppController {
  private logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  root() {
    return {
      _links: {
        self: { href: '/' },
        403: { href: '/403' },
        500: { href: '/500' },
        throwError: { href: '/throw/error' },
        throwString: { href: '/throw/string' },
        throwCatch: { href: '/throw/catch' },
        slow: { href: '/slow' },
        otel: { href: '/otel' },
        otelFail: { href: '/otelFail' },
      },
    };
  }

  @Get('403')
  403() {
    throw new ForbiddenException();
  }

  @Get('500')
  500() {
    throw new InternalServerErrorException();
  }

  @Get('throw/error')
  throwError() {
    throw new Error('Basic Error instance');
  }

  @Get('throw/string')
  throwString() {
    throw 'Error message as string';
  }

  @Get('throw/catch')
  throwCatch() {
    try {
      throw new Error('Basic Error instance');
    } catch (err) {
      this.logger.warn(log`Failed sucessfully: ${err}`);
    }
    return 'caught and logged error';
  }

  @Get('slow')
  @UseInterceptors(TimedInterceptor)
  async slow() {
    this.logger.debug(log`Starting slow request on ${'/slow'}`);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return { message: 'finished' };
  }

  @Get('otel')
  async otel() {
    // initial delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return await withSpan(tracer, 'test withSpan', async (span) => {
      // delay in span
      await new Promise((resolve) => setTimeout(resolve, 200));
      span.addEvent('innerSpan event');
      await new Promise((resolve) => setTimeout(resolve, 100));
      // child span
      return this.appService.testSpan();
    });
  }

  @Get('otelFail')
  async otelFail() {
    // initial delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return await withSpan(tracer, 'test withSpan', async () => {
      // delay in span
      await new Promise((resolve) => setTimeout(resolve, 200));
      throw new Error('Failed withSpan');
    });
  }
}
