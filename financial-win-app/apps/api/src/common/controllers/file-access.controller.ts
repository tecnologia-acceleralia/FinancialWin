import {
  Controller,
  Get,
  Param,
  Res,
  HttpStatus,
  HttpException,
  UseGuards,
  Req,
  Logger,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { StorageService } from '../services/storage.service';
import { FileAccessTokenService } from '../services/file-access-token.service';
import { FileAccessTokenPayload } from '../interfaces/storage.interface';
import {
  FileAccessGuard,
  FilePermissionGuard,
  RequireFilePermission,
} from '../guards/file-access.guard';
import { FileAuditInterceptor } from '../interceptors/file-audit.interceptor';

/**
 * Controller para acceso seguro a archivos mediante tokens JWT
 * Proporciona endpoints para descarga de archivos con validación de permisos
 */
@ApiTags('file-access')
@Controller('files')
@UseGuards(FileAccessGuard, FilePermissionGuard)
@UseInterceptors(FileAuditInterceptor)
export class FileAccessController {
  private readonly logger = new Logger(FileAccessController.name);

  constructor(
    private storageService: StorageService,
    private fileAccessTokenService: FileAccessTokenService
  ) {}

  /**
   * Endpoint principal para acceso a archivos mediante token
   * Redirige a una URL firmada temporal o sirve el archivo directamente
   */
  @Get('access/:token')
  @RequireFilePermission('read')
  @ApiOperation({
    summary: 'Acceder a archivo mediante token de seguridad',
    description:
      'Proporciona acceso temporal a un archivo usando un token JWT válido',
  })
  @ApiParam({
    name: 'token',
    description: 'Token JWT de acceso al archivo',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirección a URL firmada del archivo',
    headers: {
      Location: {
        description: 'URL firmada temporal del archivo',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido o expirado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - sin permisos',
  })
  @ApiResponse({
    status: 404,
    description: 'Archivo no encontrado',
  })
  async getFileAccess(
    @Param('token') token: string,
    @Res() res: Response,
    @Req() req: Request
  ) {
    try {
      this.logger.log(
        `File access request for token: ${token.substring(0, 20)}...`
      );

      // Validar token
      const payload: FileAccessTokenPayload =
        this.fileAccessTokenService.validateAccessToken(token);

      // Verificar que el token no esté revocado
      if (this.fileAccessTokenService.isTokenRevoked(token)) {
        throw new HttpException('Token has been revoked', HttpStatus.FORBIDDEN);
      }

      // Verificar permisos de lectura
      if (!this.fileAccessTokenService.hasPermission(token, 'read')) {
        throw new HttpException(
          'Insufficient permissions',
          HttpStatus.FORBIDDEN
        );
      }

      // Verificar que el archivo existe
      try {
        await this.storageService.getFileMetadata(payload.fileKey);
      } catch {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      // Generar URL firmada temporal (5 minutos)
      const signedUrl = await this.storageService.generateSignedUrl(
        payload.fileKey,
        300 // 5 minutos
      );

      // Log de acceso para auditoría
      this.logger.log(
        `File access granted: ${payload.fileKey} for user ${payload.userId} from ${req.ip}`
      );

      // Redirigir a la URL firmada
      res.redirect(HttpStatus.FOUND, signedUrl);
    } catch (error) {
      this.logger.error(`File access error: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }
  }

  /**
   * Endpoint para obtener información de un archivo sin descargarlo
   */
  @Get('info/:token')
  @ApiOperation({
    summary: 'Obtener información de archivo',
    description: 'Retorna metadatos del archivo sin descargarlo',
  })
  @ApiResponse({
    status: 200,
    description: 'Información del archivo',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        size: { type: 'number' },
        mimeType: { type: 'string' },
        lastModified: { type: 'string', format: 'date-time' },
        metadata: { type: 'object' },
      },
    },
  })
  async getFileInfo(@Param('token') token: string) {
    try {
      const payload = this.fileAccessTokenService.validateAccessToken(token);

      if (!this.fileAccessTokenService.hasPermission(token, 'read')) {
        throw new HttpException(
          'Insufficient permissions',
          HttpStatus.FORBIDDEN
        );
      }

      const fileInfo = await this.storageService.getFileMetadata(
        payload.fileKey
      );

      // Retornar información sin URLs sensibles
      return {
        key: fileInfo.key,
        size: fileInfo.size,
        mimeType: fileInfo.mimeType,
        lastModified: fileInfo.lastModified,
        metadata: fileInfo.metadata,
      };
    } catch (error) {
      this.logger.error(`File info error: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }
  }

  /**
   * Endpoint para generar un nuevo token de acceso
   */
  @Get('refresh/:token')
  @ApiOperation({
    summary: 'Refrescar token de acceso',
    description:
      'Genera un nuevo token de acceso con el mismo archivo y permisos',
  })
  @ApiResponse({
    status: 200,
    description: 'Nuevo token generado',
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        expiresIn: { type: 'number' },
        fileKey: { type: 'string' },
      },
    },
  })
  async refreshToken(@Param('token') oldToken: string) {
    try {
      const payload = this.fileAccessTokenService.validateAccessToken(oldToken);

      // Generar nuevo token con los mismos permisos
      const newToken = this.fileAccessTokenService.generateAccessToken(
        payload.fileKey,
        payload.userId,
        payload.permissions
      );

      // Revocar el token anterior
      this.fileAccessTokenService.revokeToken(oldToken);

      this.logger.log(`Token refreshed for file ${payload.fileKey}`);

      return {
        token: newToken,
        expiresIn: this.fileAccessTokenService['defaultExpiryHours'] * 3600,
        fileKey: payload.fileKey,
      };
    } catch (error) {
      this.logger.error(`Token refresh error: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException('Token refresh failed', HttpStatus.FORBIDDEN);
    }
  }

  /**
   * Endpoint para revocar un token de acceso
   */
  @Get('revoke/:token')
  @ApiOperation({
    summary: 'Revocar token de acceso',
    description: 'Invalida un token de acceso específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Token revocado exitosamente',
  })
  async revokeToken(@Param('token') token: string) {
    try {
      // Validar token antes de revocarlo
      const payload = this.fileAccessTokenService.validateAccessToken(token);

      // Revocar token
      this.fileAccessTokenService.revokeToken(token);

      this.logger.log(`Token revoked for file ${payload.fileKey}`);

      return {
        message: 'Token revoked successfully',
        fileKey: payload.fileKey,
      };
    } catch (error) {
      this.logger.error(`Token revocation error: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Token revocation failed',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Endpoint para verificar el estado de un token
   */
  @Get('verify/:token')
  @ApiOperation({
    summary: 'Verificar estado del token',
    description: 'Verifica si un token es válido y retorna información básica',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado del token',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        fileKey: { type: 'string' },
        userId: { type: 'string' },
        permissions: { type: 'array', items: { type: 'string' } },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async verifyToken(@Param('token') token: string) {
    try {
      const payload = this.fileAccessTokenService.validateAccessToken(token);

      return {
        valid: true,
        fileKey: payload.fileKey,
        userId: payload.userId,
        permissions: payload.permissions,
        expiresAt: new Date(payload.exp * 1000),
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }
}
