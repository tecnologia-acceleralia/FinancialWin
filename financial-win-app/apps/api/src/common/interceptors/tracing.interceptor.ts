import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Tracing Interceptor
 *
 * Interceptor for distributed tracing using OpenTelemetry.
 * Currently provides a skeleton for tracing integration.
 *
 * To implement:
 * 1. Install OpenTelemetry packages:
 *    pnpm add @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/instrumentation-http
 * 2. Initialize OpenTelemetry SDK
 * 3. Create spans for requests
 * 4. Add trace context propagation
 */
@Injectable()
export class TracingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    // TODO: Create OpenTelemetry span
    // const span = tracer.startSpan(`${method} ${url}`);
    // span.setAttributes({
    //   'http.method': method,
    //   'http.url': url,
    // });

    return next.handle().pipe(
      tap({
        next: () => {
          // TODO: End span successfully
          // span.setStatus({ code: SpanStatusCode.OK });
          // span.end();
        },
        error: error => {
          // TODO: Record error in span
          // span.setStatus({
          //   code: SpanStatusCode.ERROR,
          //   message: error.message,
          // });
          // span.recordException(error);
          // span.end();
        },
      })
    );
  }
}
