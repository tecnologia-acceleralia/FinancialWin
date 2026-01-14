import { Module, Global } from '@nestjs/common';
import { MetricsService } from '../services/metrics.service';
import { MetricsInterceptor } from '../interceptors/metrics.interceptor';
import { TracingInterceptor } from '../interceptors/tracing.interceptor';

/**
 * Observability Module
 *
 * Provides metrics and tracing capabilities for the application.
 *
 * Features:
 * - Prometheus metrics (skeleton)
 * - OpenTelemetry tracing (skeleton)
 * - HTTP request metrics
 * - Error tracking
 *
 * To enable full functionality:
 * 1. Install dependencies:
 *    - prom-client for Prometheus metrics
 *    - @opentelemetry/* packages for tracing
 * 2. Configure metrics service
 * 3. Configure tracing interceptor
 * 4. Apply interceptors globally in main.ts
 */
@Global()
@Module({
  providers: [MetricsService, MetricsInterceptor, TracingInterceptor],
  exports: [MetricsService, MetricsInterceptor, TracingInterceptor],
})
export class ObservabilityModule {}
