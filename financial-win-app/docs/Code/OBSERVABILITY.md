# Observability Guide

## Overview

The financial-win includes a skeleton for observability features including metrics and distributed tracing. This guide explains how to implement and extend these capabilities.

## Architecture

```
apps/api/src/common/
├── modules/
│   └── observability.module.ts    # Main observability module
├── services/
│   └── metrics.service.ts         # Prometheus metrics service
├── interceptors/
│   ├── metrics.interceptor.ts     # HTTP metrics collection
│   └── tracing.interceptor.ts    # OpenTelemetry tracing
└── controllers/
    └── metrics.controller.ts     # /metrics endpoint
```

## Metrics (Prometheus)

### Current Implementation

The financial-win provides a skeleton for Prometheus metrics. The `MetricsService` has placeholder methods that log metrics but don't yet expose Prometheus format.

### Implementation Steps

1. **Install Dependencies**:
   ```bash
   cd apps/api
   pnpm add prom-client
   ```

2. **Initialize Registry**:
   ```typescript
   import { Registry, Counter, Histogram } from 'prom-client';
   
   const registry = new Registry();
   const httpRequestDuration = new Histogram({
     name: 'http_request_duration_seconds',
     help: 'Duration of HTTP requests in seconds',
     labelNames: ['method', 'route', 'status'],
     registers: [registry],
   });
   ```

3. **Update MetricsService**:
   - Initialize Prometheus registry
   - Create metrics (counters, histograms, gauges)
   - Implement `getMetrics()` to return Prometheus format

4. **Apply MetricsInterceptor**:
   ```typescript
   // In main.ts
   app.useGlobalInterceptors(
     new MetricsInterceptor(metricsService)
   );
   ```

### Metrics Endpoint

**URL**: `GET /metrics`

**Format**: Prometheus text format

**Usage**: Configure Prometheus to scrape this endpoint:
```yaml
scrape_configs:
  - job_name: 'financial-win-api'
    static_configs:
      - targets: ['localhost:6000']
```

### Available Metrics (Planned)

- `http_request_duration_seconds` - Request duration histogram
- `http_requests_total` - Total request counter
- `http_errors_total` - Error counter
- `database_query_duration_seconds` - Database query duration (future)

## Tracing (OpenTelemetry)

### Current Implementation

The financial-win provides a skeleton for OpenTelemetry tracing. The `TracingInterceptor` has placeholder code for creating spans.

### Implementation Steps

1. **Install Dependencies**:
   ```bash
   cd apps/api
   pnpm add @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/instrumentation-http
   ```

2. **Initialize OpenTelemetry SDK**:
   ```typescript
   import { NodeSDK } from '@opentelemetry/sdk-node';
   import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
   
   const sdk = new NodeSDK({
     instrumentations: [new HttpInstrumentation()],
   });
   sdk.start();
   ```

3. **Update TracingInterceptor**:
   - Create spans for requests
   - Add attributes (method, URL, status code)
   - Record exceptions
   - Propagate trace context

4. **Configure Exporter**:
   - Jaeger, Zipkin, or OTLP exporter
   - Set up in OpenTelemetry SDK configuration

### Trace Context Propagation

OpenTelemetry automatically propagates trace context via HTTP headers:
- `traceparent` (W3C Trace Context)
- `tracestate` (W3C Trace State)

## Logging

The financial-win already includes structured logging:
- Request ID tracking via `RequestIdInterceptor`
- Structured logs via `LoggingInterceptor`
- Error logging via `HttpExceptionFilter`

### Log Structure

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "message": "HTTP Request",
  "requestId": "uuid-here",
  "method": "GET",
  "url": "/example",
  "statusCode": 200,
  "duration": 123
}
```

## Integration with Monitoring Platforms

### Prometheus + Grafana

1. **Deploy Prometheus**: Scrape `/metrics` endpoint
2. **Configure Grafana**: Import dashboards for HTTP metrics
3. **Set Alerts**: Alert on error rates, latency, etc.

### OpenTelemetry Collector

1. **Deploy Collector**: Receive traces from application
2. **Export to Backend**: Jaeger, Zipkin, or cloud provider
3. **Visualize**: Use Jaeger UI or cloud provider dashboards

### Cloud Providers

**DigitalOcean**:
- Use DO Monitoring for metrics
- Configure OpenTelemetry exporter to send to DO

**AWS**:
- CloudWatch Metrics for Prometheus
- X-Ray for distributed tracing

**GCP**:
- Cloud Monitoring
- Cloud Trace

## Best Practices

1. **Start Simple**: Begin with basic HTTP metrics, add more as needed
2. **Label Carefully**: Too many labels in Prometheus can cause cardinality issues
3. **Sample Traces**: Don't trace every request in production (use sampling)
4. **Monitor Costs**: Cloud observability services can be expensive
5. **Set SLOs**: Define Service Level Objectives based on metrics
6. **Alert Wisely**: Set up alerts for critical metrics only

## Example: Adding a Custom Metric

```typescript
// In MetricsService
private customCounter: Counter;

onModuleInit() {
  this.customCounter = new Counter({
    name: 'custom_events_total',
    help: 'Total custom events',
    labelNames: ['event_type'],
    registers: [this.registry],
  });
}

incrementCustomEvent(eventType: string) {
  this.customCounter.inc({ event_type: eventType });
}
```

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)

