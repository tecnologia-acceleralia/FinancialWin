import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware genérico para monitoreo de requests
 * Registra tiempos de respuesta, requests lentos y errores
 */
@Injectable()
export class MonitoringMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MonitoringMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl } = req;

    // Track request start
    this.logger.debug(`${method} ${originalUrl} - Request started`);

    // Override res.end to track response
    const originalEnd = res.end.bind(res);
    const logger = this.logger;

    res.end = (
      chunk?: unknown,
      encoding?: BufferEncoding | (() => void),
      cb?: () => void
    ): Response => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Log slow requests
      if (responseTime > 1000) {
        logger.warn(
          `${method} ${originalUrl} - Slow request: ${responseTime}ms`
        );
      }

      // Log errors
      if (res.statusCode >= 400) {
        logger.error(
          `${method} ${originalUrl} - Error ${res.statusCode}: ${responseTime}ms`
        );
      } else {
        logger.debug(
          `${method} ${originalUrl} - ${res.statusCode}: ${responseTime}ms`
        );
      }

      // Call original end with proper type handling
      if (typeof encoding === 'function') {
        return originalEnd(chunk, encoding) as Response;
      }
      return originalEnd(chunk, encoding as BufferEncoding, cb) as Response;
    };

    next();
  }
}
