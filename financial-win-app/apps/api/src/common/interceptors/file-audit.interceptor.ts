import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';

interface AuditData {
  timestamp: string;
  method: string;
  url: string;
  userAgent: string;
  ip: string;
  statusCode: number;
  duration: number;
  fileId?: string;
  threadId?: string;
  userId?: string;
  fileSize?: number;
  fileName?: string;
  error?: string;
}

@Injectable()
export class FileAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(FileAuditInterceptor.name);
  private readonly enableAudit: boolean;
  private readonly auditLogLevel: string;

  constructor(private configService: ConfigService) {
    this.enableAudit = this.configService.get('ENABLE_FILE_AUDIT', true);
    this.auditLogLevel = this.configService.get('AUDIT_LOG_LEVEL', 'info');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.enableAudit) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Extraer información de la request
    const auditData: AuditData = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'] || 'unknown',
      ip: request.ip || request.connection.remoteAddress || 'unknown',
      statusCode: 0,
      duration: 0,
    };

    // Extraer parámetros específicos de archivos
    if (request.params) {
      auditData.threadId = request.params.threadId;
      auditData.fileId = request.params.fileId;
    }

    // Extraer información del usuario si está autenticado
    if (request.user) {
      auditData.userId = request.user.id || request.user.sub;
    }

    // Extraer información del archivo si está presente
    if (request.file) {
      auditData.fileName = request.file.originalname;
      auditData.fileSize = request.file.size;
    }

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        auditData.statusCode = response.statusCode;
        auditData.duration = duration;

        this.logAudit(auditData);
      }),
      catchError(error => {
        const duration = Date.now() - startTime;
        auditData.statusCode = error.status || 500;
        auditData.duration = duration;
        auditData.error = error.message;

        this.logAudit(auditData, 'error');
        throw error;
      })
    );
  }

  private logAudit(
    auditData: AuditData,
    level: 'info' | 'error' = 'info'
  ): void {
    const logMessage = this.formatAuditMessage(auditData);

    if (level === 'error') {
      this.logger.error(`🚨 File access error audit: ${logMessage}`);
    } else if (
      this.auditLogLevel === 'debug' ||
      this.isImportantOperation(auditData)
    ) {
      this.logger.log(`📋 File access audit: ${logMessage}`);
    }
  }

  private formatAuditMessage(auditData: AuditData): string {
    const parts = [
      `[${auditData.timestamp}]`,
      `${auditData.method} ${auditData.url}`,
      `Status: ${auditData.statusCode}`,
      `Duration: ${auditData.duration}ms`,
      `IP: ${auditData.ip}`,
    ];

    if (auditData.threadId) {
      parts.push(`Thread: ${auditData.threadId}`);
    }

    if (auditData.fileId) {
      parts.push(`File: ${auditData.fileId}`);
    }

    if (auditData.userId) {
      parts.push(`User: ${auditData.userId}`);
    }

    if (auditData.fileName) {
      parts.push(`FileName: ${auditData.fileName}`);
    }

    if (auditData.fileSize) {
      parts.push(`FileSize: ${this.formatFileSize(auditData.fileSize)}`);
    }

    if (auditData.error) {
      parts.push(`Error: ${auditData.error}`);
    }

    return parts.join(' | ');
  }

  private isImportantOperation(auditData: AuditData): boolean {
    // Considerar importantes las operaciones de subida, descarga y eliminación
    const importantMethods = ['POST', 'DELETE'];
    const importantPaths = ['/files', '/download', '/preview'];

    return (
      importantMethods.includes(auditData.method) ||
      importantPaths.some(path => auditData.url.includes(path))
    );
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
