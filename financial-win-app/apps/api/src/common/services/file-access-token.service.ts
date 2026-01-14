import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  FileAccessTokenPayload,
  FilePermission,
} from '../interfaces/storage.interface';

/**
 * Servicio para generar y validar tokens de acceso a archivos
 * Utiliza JWT para crear tokens seguros con expiración temporal
 */
@Injectable()
export class FileAccessTokenService {
  private readonly logger = new Logger(FileAccessTokenService.name);
  private readonly defaultExpiryHours: number;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService
  ) {
    const expiryHours = this.configService.get<number>(
      'app.fileAccessTokenExpiryHours'
    );
    if (expiryHours === undefined || expiryHours === null) {
      throw new Error(
        '❌ FATAL: app.fileAccessTokenExpiryHours configuration is required'
      );
    }
    this.defaultExpiryHours = expiryHours;
  }

  /**
   * Genera un token de acceso para un archivo específico
   */
  generateAccessToken(
    fileKey: string,
    userId: string,
    permissions: FilePermission[] = ['read'],
    customExpiryHours?: number
  ): string {
    try {
      const expiryHours = customExpiryHours || this.defaultExpiryHours;
      const exp = Math.floor(Date.now() / 1000) + expiryHours * 60 * 60;

      const payload: FileAccessTokenPayload = {
        fileKey,
        userId,
        permissions,
        exp,
        iat: Math.floor(Date.now() / 1000),
      };

      const token = this.jwtService.sign(payload, {
        secret: this.configService.get('app.jwtSecret'),
      });

      this.logger.log(
        `Generated access token for file ${fileKey} and user ${userId}, expires in ${expiryHours}h`
      );

      return token;
    } catch (error) {
      this.logger.error(`Error generating access token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Valida un token de acceso y retorna su payload
   */
  validateAccessToken(token: string): FileAccessTokenPayload {
    try {
      const payload = this.jwtService.verify(token);

      // Verificar que el token no haya expirado
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new Error('Token has expired');
      }

      this.logger.log(`Access token validated for file ${payload.fileKey}`);
      return payload;
    } catch (error) {
      this.logger.error(`Error validating access token: ${error.message}`);
      throw new Error(`Invalid access token: ${error.message}`);
    }
  }

  /**
   * Verifica si un usuario tiene un permiso específico para un archivo
   */
  hasPermission(token: string, requiredPermission: FilePermission): boolean {
    try {
      const payload = this.validateAccessToken(token);
      return payload.permissions.includes(requiredPermission);
    } catch (error) {
      this.logger.error(`Error checking permission: ${error.message}`);
      return false;
    }
  }

  /**
   * Incrementa el contador de descargas y genera un nuevo token
   */
  incrementDownloadCount(token: string): string {
    try {
      const payload = this.validateAccessToken(token);

      // Verificar límites antes de incrementar
      if (
        payload.maxDownloads &&
        (payload.currentDownloads ?? 0) >= payload.maxDownloads
      ) {
        throw new Error('Maximum downloads reached for this token');
      }

      // Incrementar contador
      const updatedPayload = {
        ...payload,
        currentDownloads: (payload.currentDownloads || 0) + 1,
      };

      // Generar nuevo token con el contador actualizado
      return this.jwtService.sign(updatedPayload, {
        secret: this.configService.get('app.jwtSecret'),
      });
    } catch (error) {
      this.logger.error(`Error incrementing download count: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene información del token sin validar (para logging)
   */
  getTokenInfo(token: string): Partial<FileAccessTokenPayload> | null {
    try {
      // Decodificar sin verificar para obtener información básica
      const decoded = this.jwtService.decode(token);
      return {
        fileKey: decoded.fileKey,
        userId: decoded.userId,
        permissions: decoded.permissions,
        exp: decoded.exp,
        iat: decoded.iat,
      };
    } catch (error) {
      this.logger.error(`Error decoding token: ${error.message}`);
      return null;
    }
  }

  /**
   * Genera un token de acceso temporal para descarga directa
   */
  generateDownloadToken(
    fileKey: string,
    userId: string,
    expiresInMinutes: number = 5
  ): string {
    return this.generateAccessToken(
      fileKey,
      userId,
      ['read'],
      expiresInMinutes / 60 // Convertir minutos a horas
    );
  }

  /**
   * Genera un token de acceso para múltiples archivos
   */
  generateBulkAccessToken(
    fileKeys: string[],
    userId: string,
    permissions: FilePermission[] = ['read']
  ): string {
    try {
      const expiryHours = this.defaultExpiryHours;
      const exp = Math.floor(Date.now() / 1000) + expiryHours * 60 * 60;

      const payload = {
        fileKeys, // Array de claves de archivos
        userId,
        permissions,
        exp,
        iat: Math.floor(Date.now() / 1000),
        type: 'bulk_access',
      };

      const token = this.jwtService.sign(payload);

      this.logger.log(
        `Generated bulk access token for ${fileKeys.length} files and user ${userId}`
      );

      return token;
    } catch (error) {
      this.logger.error(`Error generating bulk access token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Valida un token de acceso masivo
   */
  validateBulkAccessToken(token: string): {
    fileKeys: string[];
    userId: string;
    permissions: FilePermission[];
    exp: number;
  } {
    try {
      const payload = this.jwtService.verify(token);

      if (payload.type !== 'bulk_access') {
        throw new Error('Invalid token type');
      }

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new Error('Token has expired');
      }

      return {
        fileKeys: payload.fileKeys,
        userId: payload.userId,
        permissions: payload.permissions,
        exp: payload.exp,
      };
    } catch (error) {
      this.logger.error(`Error validating bulk access token: ${error.message}`);
      throw new Error(`Invalid bulk access token: ${error.message}`);
    }
  }

  /**
   * Revoca un token (agrega a lista negra)
   * Nota: En una implementación completa, se usaría Redis o similar
   */
  revokeToken(token: string): void {
    // En una implementación real, se agregaría el token a una lista negra
    // Por ahora, solo loggeamos la revocación
    this.logger.log(`Token revoked: ${token.substring(0, 20)}...`);
  }

  /**
   * Verifica si un token está revocado
   */
  isTokenRevoked(_token: string): boolean {
    // En una implementación real, se verificaría contra la lista negra
    // Por ahora, siempre retornamos false
    return false;
  }
}
