import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

interface RateLimitData {
  count: number;
  resetTime: number;
}

@Injectable()
export class FileRateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(FileRateLimitMiddleware.name);
  private uploadCounts = new Map<string, RateLimitData>();
  private readonly maxUploads: number;
  private readonly windowMs: number;

  constructor(private configService: ConfigService) {
    this.maxUploads = this.configService.get('FILE_UPLOAD_RATE_LIMIT', 10);
    this.windowMs = this.configService.get('FILE_UPLOAD_WINDOW_MS', 900000); // 15 minutos
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Solo aplicar rate limiting a endpoints de subida de archivos
    if (!this.isFileUploadEndpoint(req.path, req.method)) {
      return next();
    }

    const identifier = this.getIdentifier(req);
    const now = Date.now();
    const userData = this.uploadCounts.get(identifier);

    if (!userData || now > userData.resetTime) {
      // Nueva ventana de tiempo
      this.uploadCounts.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });

      this.logger.log(`📊 New rate limit window for ${identifier}`);
      return next();
    }

    if (userData.count < this.maxUploads) {
      // Incrementar contador
      userData.count++;
      this.logger.log(
        `📊 Rate limit: ${userData.count}/${this.maxUploads} for ${identifier}`
      );
      return next();
    }

    // Rate limit excedido
    const retryAfter = Math.ceil((userData.resetTime - now) / 1000);

    this.logger.warn(
      `⚠️ Rate limit exceeded for ${identifier}. Retry after ${retryAfter}s`
    );

    res.status(429).json({
      success: false,
      error: 'Too many file uploads. Please try again later.',
      retryAfter,
      limit: this.maxUploads,
      windowMs: this.windowMs,
    });
  }

  private isFileUploadEndpoint(path: string, method: string): boolean {
    return method === 'POST' && path.includes('/files');
  }

  private getIdentifier(req: Request): string {
    // Usar IP como identificador principal
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    // Si hay un usuario autenticado, usar su ID también
    const userId = (req as any).user?.id;

    return userId ? `${userId}:${ip}` : ip;
  }

  /**
   * Limpia entradas expiradas del cache
   */
  cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, data] of this.uploadCounts.entries()) {
      if (now > data.resetTime) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.uploadCounts.delete(key);
    });

    if (expiredKeys.length > 0) {
      this.logger.log(
        `🧹 Cleaned up ${expiredKeys.length} expired rate limit entries`
      );
    }
  }

  /**
   * Obtiene estadísticas de rate limiting
   */
  getRateLimitStats(): {
    activeSessions: number;
    maxUploads: number;
    windowMs: number;
    entries: Array<{
      identifier: string;
      count: number;
      resetTime: Date;
      timeRemaining: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.uploadCounts.entries()).map(
      ([identifier, data]) => ({
        identifier,
        count: data.count,
        resetTime: new Date(data.resetTime),
        timeRemaining: Math.max(0, data.resetTime - now),
      })
    );

    return {
      activeSessions: this.uploadCounts.size,
      maxUploads: this.maxUploads,
      windowMs: this.windowMs,
      entries,
    };
  }
}
