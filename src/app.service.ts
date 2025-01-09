import { otelSpan } from '@5stones/nestjs-observability-utilities/otel';
import { Injectable } from '@nestjs/common';
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer(`test-project.app.AppService`);

@Injectable()
export class AppService {
  @otelSpan(tracer, 'test otelSpan decorator')
  async testSpan(): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return 'Span test';
  }
}
