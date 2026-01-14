import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FileAccessTokenService } from '../services/file-access-token.service';
import { StorageService } from '../services/storage.service';

/**
 * Guard para proteger endpoints de acceso a archivos
 * Valida tokens JWT y verifica permisos de usuario
 */
@Injectable()
export class FileAccessGuard implements CanActivate {
  private readonly logger = new Logger(FileAccessGuard.name);

  constructor(
    private reflector: Reflector,
    private fileAccessTokenService: FileAccessTokenService,
    private storageService: StorageService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      this.logger.warn('File access attempt without token');
      throw new UnauthorizedException('Access token required');
    }

    try {
      // Validar token
      const payload = this.fileAccessTokenService.validateAccessToken(token);

      // Verificar que el token no esté revocado
      if (this.fileAccessTokenService.isTokenRevoked(token)) {
        this.logger.warn(
          `Access attempt with revoked token: ${token.substring(0, 20)}...`
        );
        throw new ForbiddenException('Token has been revoked');
      }

      // Verificar que el archivo existe
      const fileExists = await this.verifyFileExists(payload.fileKey);
      if (!fileExists) {
        this.logger.warn(
          `Access attempt to non-existent file: ${payload.fileKey}`
        );
        throw new ForbiddenException('File not found');
      }

      // Agregar información del usuario al request
      request.user = {
        id: payload.userId,
        fileKey: payload.fileKey,
        permissions: payload.permissions,
        token,
      };

      this.logger.log(
        `File access granted: ${payload.fileKey} for user ${payload.userId}`
      );

      return true;
    } catch (error) {
      this.logger.error(`File access denied: ${error.message}`);

      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new ForbiddenException('Invalid access token');
    }
  }

  private extractTokenFromRequest(request: any): string | null {
    // Extraer token de parámetros de URL
    const urlToken = request.params?.token;
    if (urlToken) {
      return urlToken;
    }

    // Extraer token de headers
    const authHeader = request.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Extraer token de query parameters
    const queryToken = request.query?.token;
    if (queryToken) {
      return queryToken;
    }

    return null;
  }

  private async verifyFileExists(fileKey: string): Promise<boolean> {
    try {
      await this.storageService.getFileMetadata(fileKey);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Decorator para especificar permisos requeridos
 */
export const RequireFilePermission = (
  permission: 'read' | 'write' | 'delete'
) => {
  return (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): void => {
    if (descriptor.value && typeof descriptor.value === 'object') {
      Reflect.defineMetadata(
        'file-permission',
        permission,
        descriptor.value as object
      );
    } else if (target && typeof target === 'object') {
      // Fallback: define metadata on the target if descriptor.value is not an object
      Reflect.defineMetadata('file-permission', permission, target);
    }
  };
};

/**
 * Guard para verificar permisos específicos de archivo
 */
@Injectable()
export class FilePermissionGuard implements CanActivate {
  private readonly logger = new Logger(FilePermissionGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.get<string>(
      'file-permission',
      context.getHandler()
    );

    if (!requiredPermission) {
      return true; // No hay permisos específicos requeridos
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.permissions) {
      this.logger.warn('Permission check failed: no user permissions');
      throw new ForbiddenException('User permissions not found');
    }

    const hasPermission = user.permissions.includes(requiredPermission);

    if (!hasPermission) {
      this.logger.warn(
        `Permission denied: user ${user.id} lacks ${requiredPermission} permission`
      );
      throw new ForbiddenException(
        `Permission '${requiredPermission}' required`
      );
    }

    this.logger.log(
      `Permission granted: user ${user.id} has ${requiredPermission} permission`
    );

    return true;
  }
}
