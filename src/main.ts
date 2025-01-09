import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  //envLogLevels,
  ExceptionFilter,
  OneLineLogger,
} from '@5stones/nestjs-observability-utilities/logging';
import { HttpAdapterHost } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    //logger: envLogLevels(),
    logger: new OneLineLogger(undefined, { otelEvents: true }),
  });

  // replace the default ExceptionHandler to log warnings and include context
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new ExceptionFilter(httpAdapter));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
