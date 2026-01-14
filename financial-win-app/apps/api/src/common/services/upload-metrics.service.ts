import { Injectable, Logger } from '@nestjs/common';

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  userId: string;
  agentId?: string;
}

export interface UploadMetrics {
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  totalSizeUploaded: number;
  averageUploadTime: number;
  uploadsByType: Record<string, number>;
  uploadsByUser: Record<string, number>;
  recentUploads: UploadAttempt[];
}

export interface UploadAttempt {
  fileInfo: FileInfo;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  fileSize: number;
}

export interface UploadStats {
  uploadsToday: number;
  uploadsThisWeek: number;
  uploadsThisMonth: number;
  totalStorageUsed: number;
  averageFileSize: number;
  mostCommonFileType: string;
  topUsers: Array<{ userId: string; uploadCount: number }>;
}

@Injectable()
export class UploadMetricsService {
  private readonly logger = new Logger(UploadMetricsService.name);
  private uploadAttempts: UploadAttempt[] = [];
  private readonly MAX_RECENT_UPLOADS = 1000; // Mantener solo los últimos 1000

  /**
   * Registra un intento de subida
   */
  recordUploadAttempt(fileInfo: FileInfo): string {
    const attemptId = this.generateAttemptId();
    const attempt: UploadAttempt = {
      fileInfo,
      startTime: Date.now(),
      success: false,
      fileSize: fileInfo.size,
    };

    this.uploadAttempts.push(attempt);
    this.cleanupOldAttempts();

    this.logger.log(
      `Recorded upload attempt for ${fileInfo.name} (${this.formatFileSize(fileInfo.size)})`
    );
    return attemptId;
  }

  /**
   * Registra una subida exitosa
   */
  recordUploadSuccess(attemptId: string, duration: number): void {
    const attempt = this.findAttemptById(attemptId);
    if (attempt) {
      attempt.endTime = Date.now();
      attempt.duration = duration;
      attempt.success = true;

      this.logger.log(
        `Upload successful for ${attempt.fileInfo.name} in ${duration}ms`
      );
    }
  }

  /**
   * Registra una subida fallida
   */
  recordUploadFailure(attemptId: string, error: string): void {
    const attempt = this.findAttemptById(attemptId);
    if (attempt) {
      attempt.endTime = Date.now();
      attempt.duration = attempt.endTime - attempt.startTime;
      attempt.success = false;
      attempt.error = error;

      this.logger.warn(`Upload failed for ${attempt.fileInfo.name}: ${error}`);
    }
  }

  /**
   * Obtiene métricas generales de subida
   */
  getUploadMetrics(): UploadMetrics {
    const successfulUploads = this.uploadAttempts.filter(a => a.success);
    const failedUploads = this.uploadAttempts.filter(a => !a.success);

    const totalSizeUploaded = successfulUploads.reduce(
      (sum, attempt) => sum + attempt.fileSize,
      0
    );

    const averageUploadTime =
      successfulUploads.length > 0
        ? successfulUploads.reduce(
            (sum, attempt) => sum + (attempt.duration || 0),
            0
          ) / successfulUploads.length
        : 0;

    // Contar subidas por tipo
    const uploadsByType: Record<string, number> = {};
    this.uploadAttempts.forEach(attempt => {
      const type = attempt.fileInfo.type;
      uploadsByType[type] = (uploadsByType[type] || 0) + 1;
    });

    // Contar subidas por usuario
    const uploadsByUser: Record<string, number> = {};
    this.uploadAttempts.forEach(attempt => {
      const userId = attempt.fileInfo.userId;
      uploadsByUser[userId] = (uploadsByUser[userId] || 0) + 1;
    });

    return {
      totalUploads: this.uploadAttempts.length,
      successfulUploads: successfulUploads.length,
      failedUploads: failedUploads.length,
      totalSizeUploaded,
      averageUploadTime,
      uploadsByType,
      uploadsByUser,
      recentUploads: this.uploadAttempts.slice(-50), // Últimos 50
    };
  }

  /**
   * Obtiene estadísticas detalladas
   */
  getUploadStats(): UploadStats {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    const uploadsToday = this.uploadAttempts.filter(
      a => now - a.startTime <= oneDay
    ).length;

    const uploadsThisWeek = this.uploadAttempts.filter(
      a => now - a.startTime <= oneWeek
    ).length;

    const uploadsThisMonth = this.uploadAttempts.filter(
      a => now - a.startTime <= oneMonth
    ).length;

    const successfulUploads = this.uploadAttempts.filter(a => a.success);
    const totalStorageUsed = successfulUploads.reduce(
      (sum, attempt) => sum + attempt.fileSize,
      0
    );

    const averageFileSize =
      successfulUploads.length > 0
        ? totalStorageUsed / successfulUploads.length
        : 0;

    // Tipo de archivo más común
    const typeCounts: Record<string, number> = {};
    successfulUploads.forEach(attempt => {
      const type = attempt.fileInfo.type;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const mostCommonFileType =
      Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      'unknown';

    // Top usuarios
    const userCounts: Record<string, number> = {};
    successfulUploads.forEach(attempt => {
      const userId = attempt.fileInfo.userId;
      userCounts[userId] = (userCounts[userId] || 0) + 1;
    });

    const topUsers = Object.entries(userCounts)
      .map(([userId, uploadCount]) => ({ userId, uploadCount }))
      .sort((a, b) => b.uploadCount - a.uploadCount)
      .slice(0, 10);

    return {
      uploadsToday,
      uploadsThisWeek,
      uploadsThisMonth,
      totalStorageUsed,
      averageFileSize,
      mostCommonFileType,
      topUsers,
    };
  }

  /**
   * Obtiene métricas por agente
   */
  getAgentMetrics(agentId: string): {
    totalUploads: number;
    successfulUploads: number;
    totalSize: number;
    averageFileSize: number;
    lastUpload?: Date;
  } {
    const agentUploads = this.uploadAttempts.filter(
      a => a.fileInfo.agentId === agentId
    );

    const successfulUploads = agentUploads.filter(a => a.success);
    const totalSize = successfulUploads.reduce(
      (sum, attempt) => sum + attempt.fileSize,
      0
    );

    const averageFileSize =
      successfulUploads.length > 0 ? totalSize / successfulUploads.length : 0;

    const lastUpload =
      agentUploads.length > 0
        ? new Date(Math.max(...agentUploads.map(a => a.startTime)))
        : undefined;

    return {
      totalUploads: agentUploads.length,
      successfulUploads: successfulUploads.length,
      totalSize,
      averageFileSize,
      lastUpload,
    };
  }

  /**
   * Obtiene métricas por usuario
   */
  getUserMetrics(userId: string): {
    totalUploads: number;
    successfulUploads: number;
    totalSize: number;
    averageFileSize: number;
    lastUpload?: Date;
  } {
    const userUploads = this.uploadAttempts.filter(
      a => a.fileInfo.userId === userId
    );

    const successfulUploads = userUploads.filter(a => a.success);
    const totalSize = successfulUploads.reduce(
      (sum, attempt) => sum + attempt.fileSize,
      0
    );

    const averageFileSize =
      successfulUploads.length > 0 ? totalSize / successfulUploads.length : 0;

    const lastUpload =
      userUploads.length > 0
        ? new Date(Math.max(...userUploads.map(a => a.startTime)))
        : undefined;

    return {
      totalUploads: userUploads.length,
      successfulUploads: successfulUploads.length,
      totalSize,
      averageFileSize,
      lastUpload,
    };
  }

  /**
   * Limpia intentos antiguos para mantener el rendimiento
   */
  private cleanupOldAttempts(): void {
    if (this.uploadAttempts.length > this.MAX_RECENT_UPLOADS) {
      // Mantener solo los más recientes
      this.uploadAttempts = this.uploadAttempts
        .sort((a, b) => b.startTime - a.startTime)
        .slice(0, this.MAX_RECENT_UPLOADS);
    }
  }

  /**
   * Encuentra un intento por ID
   */
  private findAttemptById(attemptId: string): UploadAttempt | undefined {
    return this.uploadAttempts.find(
      attempt => this.generateAttemptIdForAttempt(attempt) === attemptId
    );
  }

  /**
   * Genera un ID único para un intento
   */
  private generateAttemptId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Genera un ID para un intento existente
   */
  private generateAttemptIdForAttempt(attempt: UploadAttempt): string {
    return `upload_${attempt.startTime}_${attempt.fileInfo.name}`;
  }

  /**
   * Formatea el tamaño de archivo en formato legible
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Resetea todas las métricas (útil para testing)
   */
  resetMetrics(): void {
    this.uploadAttempts = [];
    this.logger.log('Upload metrics reset');
  }
}
