import {
  Controller,
  Get,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StorageService } from '../services/storage.service';
import {
  StorageHealthStatus,
  StorageStats,
} from '../interfaces/storage.interface';

/**
 * Controller para health checks y métricas del sistema de almacenamiento
 * Proporciona endpoints para monitoreo y diagnóstico
 */
@ApiTags('storage-health')
@Controller('storage')
export class StorageHealthController {
  private readonly logger = new Logger(StorageHealthController.name);

  constructor(private storageService: StorageService) {}

  /**
   * Health check del servicio de almacenamiento
   */
  @Get('health')
  @ApiOperation({
    summary: 'Health check del almacenamiento',
    description: 'Verifica el estado del servicio de Digital Ocean Spaces',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado del servicio',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'unhealthy', 'degraded'] },
        provider: { type: 'string' },
        responseTime: { type: 'number' },
        lastCheck: { type: 'string', format: 'date-time' },
        error: { type: 'string' },
      },
    },
  })
  async checkHealth(): Promise<StorageHealthStatus> {
    try {
      this.logger.log('Performing storage health check');

      const healthStatus = await this.storageService.checkHealth();

      if (healthStatus.status === 'unhealthy') {
        this.logger.warn(`Storage health check failed: ${healthStatus.error}`);
      } else {
        this.logger.log(
          `Storage health check passed: ${healthStatus.responseTime}ms`
        );
      }

      return healthStatus;
    } catch (error) {
      this.logger.error(`Health check error: ${error.message}`);

      return {
        status: 'unhealthy',
        provider: 'digitalocean',
        error: error.message,
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Alias para checkHealth para compatibilidad
   */
  async getHealth(): Promise<StorageHealthStatus> {
    return this.checkHealth();
  }

  /**
   * Estadísticas del almacenamiento
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Estadísticas del almacenamiento',
    description: 'Retorna métricas detalladas del uso del almacenamiento',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas del almacenamiento',
    schema: {
      type: 'object',
      properties: {
        totalFiles: { type: 'number' },
        totalSize: { type: 'number' },
        filesByType: { type: 'object' },
        uploadsToday: { type: 'number' },
        downloadsToday: { type: 'number' },
        filesByFolder: { type: 'object' },
      },
    },
  })
  async getStats(): Promise<StorageStats> {
    try {
      this.logger.log('Retrieving storage statistics');

      const stats = await this.storageService.getStorageStats();

      this.logger.log(
        `Storage stats: ${stats.totalFiles} files, ${stats.totalSize} bytes`
      );

      return stats;
    } catch (error) {
      this.logger.error(`Stats retrieval error: ${error.message}`);
      throw new HttpException(
        'Failed to retrieve storage statistics',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Información detallada del sistema
   */
  @Get('info')
  @ApiOperation({
    summary: 'Información del sistema de almacenamiento',
    description:
      'Retorna información detallada sobre la configuración y estado',
  })
  @ApiResponse({
    status: 200,
    description: 'Información del sistema',
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string' },
        region: { type: 'string' },
        bucketName: { type: 'string' },
        endpoint: { type: 'string' },
        healthStatus: { type: 'object' },
        stats: { type: 'object' },
      },
    },
  })
  async getSystemInfo() {
    try {
      this.logger.log('Retrieving storage system information');

      const [healthStatus, stats] = await Promise.all([
        this.storageService.checkHealth(),
        this.storageService.getStorageStats(),
      ]);

      return {
        provider: 'digitalocean',
        region: 'fra1',
        bucketName: 'write-test',
        endpoint: 'fra1.digitaloceanspaces.com',
        healthStatus,
        stats,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`System info error: ${error.message}`);
      throw new HttpException(
        'Failed to retrieve system information',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Alias para getSystemInfo para compatibilidad
   */
  async getInfo() {
    return this.getSystemInfo();
  }

  /**
   * Test de conectividad básica
   */
  @Get('ping')
  @ApiOperation({
    summary: 'Test de conectividad',
    description: 'Verifica la conectividad básica con Digital Ocean Spaces',
  })
  @ApiResponse({
    status: 200,
    description: 'Conectividad verificada',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        responseTime: { type: 'number' },
      },
    },
  })
  async ping() {
    const startTime = Date.now();

    try {
      // Intentar listar archivos con límite mínimo
      await this.storageService.listFiles('', 1);

      const responseTime = Date.now() - startTime;

      return {
        status: 'ok',
        timestamp: new Date(),
        responseTime,
        message: 'Digital Ocean Spaces is reachable',
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error(`Ping test failed: ${error.message}`);

      throw new HttpException(
        {
          status: 'error',
          timestamp: new Date(),
          responseTime,
          error: error.message,
        },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }
}
