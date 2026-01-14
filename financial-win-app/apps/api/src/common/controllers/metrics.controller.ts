import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from '../services/metrics.service';

/**
 * Metrics Controller
 *
 * Exposes metrics endpoint for Prometheus scraping.
 *
 * Endpoint: GET /metrics
 *
 * Returns metrics in Prometheus format.
 */
@ApiTags('observability')
@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('metrics')
  @ApiOperation({
    summary: 'Get Prometheus metrics',
    description:
      'Returns application metrics in Prometheus format for scraping',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics in Prometheus format',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example:
            '# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter\n',
        },
      },
    },
  })
  async getMetrics(): Promise<string> {
    return await this.metricsService.getMetrics();
  }
}
