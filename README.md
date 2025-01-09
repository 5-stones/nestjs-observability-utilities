# NestJS Observability Utilities

A collection of utilities for logging, error handling, and traces, which fills in some gaps missing from the base NestJS project.

### Basic Setup

```ts
// main.ts
...
import { HttpAdapterHost } from '@nestjs/core';
import {
  OneLineLogger,
  ExceptionFilter,
} from '@5stones/nestjs-observability-utilities/logging';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new OneLineLogger(),
  });

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new ExceptionFilter(httpAdapter));

  ...
}
```


## Logging

For log collection tools like EFK/ELK, Loki, and Cloudwatch Logs, log entries and stack traces should be kept to oneline.

### log Tag Function

A string template function which uses JSON.stringify on each parameter,
and has special handling for errors, which includes stack traces as an array.
This can be used with the NestJS logger, but is also useful for CLI output or Error messages.

```ts
import { log } from '@5stones/nestjs-observability-utilities/logging';
...
  this.logger.warn(log`Something failed ${{ ip }}: ${err}`);
  // "Something failed {"ip":"::ffff:10.89.5.17"}: "Error: some message" ["/srv/app/dist/main.js:499:19"]

  throw new Error(log`Something failed for user: ${user}`);
```

### OneLineLogger Service

Keeps all logs to one line, while still using NestJS's log format.
The stack traces and extra parameters are space separated and stay in one line, similar to the `log` tag function.
By default, the `LOG_LEVEL` environment variable will be used to determine log levels.
There is also an `otelEvents` option to send logs as OpenTelemetry events along with the console logs.

```ts
// main.ts
import { OneLineLogger } from '@5stones/nestjs-observability-utilities/logging';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new OneLineLogger(undefined, {
      // otelEvents: true,
    }),
  });
```

### envLogLevels Function

If you're not using the OneLineLogger, you can still set log levels with an environment variable.
The default is equivalent to setting `LOG_LEVEL=log`.

```ts
// main.ts
import { envLogLevels } from '@5stones/nestjs-observability-utilities/logging';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: envLogLevels(),
  });
```

### ExceptionFilter

Replaces the default ExceptionHandler to log warnings and include context.
All Errors that bubble up through the controller will be logged.
NestJS HttpExceptions will be logged at the warning level.
Other unhandled errors will be at the error level.

```ts
// main.ts
import { HttpAdapterHost } from '@nestjs/core';
import { ExceptionFilter } from '@5stones/nestjs-observability-utilities/logging';

async function bootstrap() {
  ...
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new ExceptionFilter(httpAdapter));
```


## OpenTelemetry

The official library for creating spans does not include a try/catch/finally for error handling and ending spans,
so this fills in those gaps.

### withSpan Function

```ts
import { trace } from '@opentelemetry/api';
import { withSpan } from '@5stones/nestjs-observability-utilities/otel';

const tracer = trace.getTracer(`your-project.module.YourService`);
...
  async someMethod() {
    return await withSpan(tracer, 'span name', async (span) => {
      ...
      span.addEvent('some event');
      ...
      return ...
    });
```

### @otelSpan Decorator

```ts
import { trace } from '@opentelemetry/api';
import { otelSpan } from '@5stones/nestjs-observability-utilities/otel';

const tracer = trace.getTracer(`your-project.module.YourService`);
...
  @otelSpan(tracer, 'span name')
  async someMethod() {
    const span = trace.getActiveSpan();
    ...
    span?.addEvent('some event');
    ...
    return ...
```


## Error Handling in NestJS Microservices

With the built-in error handling, errors in message handlers are not logged,
and then are sent back to the client as an "Internal server error",
giving no indication of what went wrong on either side.

### RpcExceptionsFilter

Logs errors with stack traces, and passes back HttpException info.

```ts
import { RpcExceptionsFilter } from '@5stones/nestjs-observability-utilities/rpc';

@Controller(...)
@UseFilters(RpcExceptionsFilter)
export class SomeController {
```

### transformError Function

The other side of the RpcExceptionsFilter to get HttpException instances back on the client-side.
`const typedError = transformError(genericError);`

```ts
import { transformError } from '@5stones/nestjs-observability-utilities/rpc';
...
  /** Microservice send that's strongly-typed, promisified, in an otel span, with error handling. */
  async send<
    P extends keyof RpcMessages,
    TResult extends RpcMessages[P]['result'],
    TInput extends RpcMessages[P]['input'],
  >(pattern: P, data: TInput, timeoutMs = 30000): Promise<TResult> {
    return await withSpan(tracer, 'rpc ${pattern}', async (span) => {
      try {
        const result = await firstValueFrom(
          this.client.send(pattern, data).pipe(timeout(timeoutMs)),
          // prevents an error on void results
          { defaultValue: undefined as TResult },
        );

        // add a 'log' to the span of the trace
        span.addEvent('response', {
          data: JSON.stringify(data),
          result: JSON.stringify(result),
        });

        return result;
      } catch (err) {
        throw transformError(err, { logger: this.logger });
      }
    });
  }
```


## Other Useful Utilities

```ts
import { ... } from '@5stones/nestjs-observability-utilities';

// uri: encodeURIComponent on each parameter
const path = uri`/something/${email}`;

// notNull: use truthy value or throw NotFoundException
const value = notNull(valueOrNull);

// notNullFrom: get truthy value from Observable or throw NotFoundException
const value = await notNullFrom(observable);

// required: get truthy param or throw BadRequestException with the name
const email = required('email', data.email);

// requiredService: get optional service or throw ServiceUnavailableException with the name
const myService = requiredService('MyService', this.myService);

// inParallel: run an async function on each item in parallel, up to a limit of simultaneous executions
const resultArray = await inParallel(items, 10, async (item) => {...});

// promiseAllEntries: like Promise.all for an object
const obj = await promiseAllEntries({ v1: promise1, v2: promise2 });

// timeLimitedPromise: return another value if a promise takes too long
const valueOrUndefined = await timeLimitedPromise(somePromise, 500, undefined);

// handleNotFound: returns null on a NotFoundException
const valueOrNull = await somePromise.catch(handleNotFound);

// filterEntries: like array.filter for an object
const newObj = filterEntries(obj, ([key, value], index) => ...);

// filterKeys: create a new object containing only specified properties
const newObj = filterKeys(obj, ['key1', 'key2']);

// TimedInterceptor: log execution time with severity thresholds: debug < warn < error
@UseInterceptors(new TimedInterceptor(2000, 60000))

// TimeoutInterceptor: throw RequestTimeoutException after an interval
@UseInterceptors(new TimeoutInterceptor(10000, 'Your error message'))
```


## Dev environment

```bash
$ npm ci
```

### run the project

```bash
// with docker
docker-compose up

// without docker
$ npm run start:dev
```

### Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
