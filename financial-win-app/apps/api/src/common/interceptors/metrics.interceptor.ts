import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../services/metrics.service';

/**
 * Metrics Interceptor
 *
 * Interceptor that collects HTTP request metrics.
 * Records request duration, count, and errors.
 *
 * Usage:
 * - Apply globally in main.ts: app.useGlobalInterceptors(new MetricsInterceptor(metricsService))
 * - Or apply per controller: @UseInterceptors(MetricsInterceptor)
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, route } = request;
    const routePath = route?.path || request.url;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.metricsService.recordHttpRequestDuration(
            method,
            routePath,
            duration,
            statusCode
          );
          this.metricsService.incrementHttpRequest(
            method,
            routePath,
            statusCode
          );
        },
        error: error => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.metricsService.recordHttpRequestDuration(
            method,
            routePath,
            duration,
            statusCode
          );
          this.metricsService.incrementHttpRequest(
            method,
            routePath,
            statusCode
          );
          this.metricsService.incrementError(error.constructor.name, routePath);
        },
      })
    );
  }
}
