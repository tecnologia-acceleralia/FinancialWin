import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { StorageService } from '../services/storage.service';
import { FileAccessTokenService } from '../services/file-access-token.service';
import { FileAccessController } from '../controllers/file-access.controller';
import { StorageHealthController } from '../controllers/storage-health.controller';
import {
  FileAccessGuard,
  FilePermissionGuard,
} from '../guards/file-access.guard';
import { FileRateLimitMiddleware } from '../middleware/file-rate-limit.middleware';
import { FileAuditInterceptor } from '../interceptors/file-audit.interceptor';

/**
 * Módulo de almacenamiento para Digital Ocean Spaces
 * Proporciona servicios de gestión de archivos, tokens de acceso y análisis de almacenamiento
 */
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      useFactory: configService => ({
        secret: configService.get('app.jwtSecret'),
        signOptions: {
          // No usar expiresIn aquí porque lo manejamos manualmente en el payload
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [FileAccessController, StorageHealthController],
  providers: [
    StorageService,
    FileAccessTokenService,
    FileAccessGuard,
    FilePermissionGuard,
    FileRateLimitMiddleware,
    FileAuditInterceptor,
  ],
  exports: [
    StorageService,
    FileAccessTokenService,
    FileAccessGuard,
    FilePermissionGuard,
    FileRateLimitMiddleware,
    FileAuditInterceptor,
  ],
})
export class StorageModule {}
