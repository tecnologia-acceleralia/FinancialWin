/**
 * Storage Service Interfaces
 * Definiciones de tipos para el servicio de almacenamiento en Digital Ocean Spaces
 */

export interface StorageFileInfo {
  /** Clave única del archivo en el bucket */
  key: string;
  /** URL pública del archivo (si es público) */
  url?: string;
  /** URL firmada temporal para acceso privado */
  signedUrl?: string;
  /** Tamaño del archivo en bytes */
  size: number;
  /** Tipo MIME del archivo */
  mimeType: string;
  /** Fecha de última modificación */
  lastModified: Date;
  /** Metadatos adicionales del archivo */
  metadata?: Record<string, string>;
  /** ETag del archivo para verificación de integridad */
  etag?: string;
}

export interface FileUploadResult {
  /** Información del archivo subido */
  fileInfo: StorageFileInfo;
  /** Texto extraído del archivo (para documentos) */
  contentText?: string;
  /** Chunks del contenido para búsqueda */
  chunks?: string[];
}

export interface FileUploadOptions {
  /** Carpeta donde almacenar el archivo */
  folder: string;
  /** Metadatos adicionales */
  metadata?: Record<string, string>;
  /** Hacer el archivo público (por defecto false) */
  isPublic?: boolean;
  /** Tipo de contenido personalizado */
  contentType?: string;
  /** Política de caché */
  cacheControl?: string;
}

export interface StorageStats {
  /** Número total de archivos */
  totalFiles: number;
  /** Tamaño total en bytes */
  totalSize: number;
  /** Archivos por tipo MIME */
  filesByType: Record<string, number>;
  /** Subidas hoy */
  uploadsToday: number;
  /** Descargas hoy */
  downloadsToday: number;
  /** Archivos por carpeta */
  filesByFolder: Record<string, number>;
}

export interface StorageHealthStatus {
  /** Estado del servicio */
  status: 'healthy' | 'unhealthy' | 'degraded';
  /** Proveedor de almacenamiento */
  provider: 'digitalocean' | 'local';
  /** Mensaje de error si aplica */
  error?: string;
  /** Tiempo de respuesta en ms */
  responseTime?: number;
  /** Última verificación */
  lastCheck: Date;
}

export type FilePermission = 'read' | 'write' | 'delete';

export interface FileAccessTokenPayload {
  /** Clave del archivo */
  fileKey: string;
  /** ID del usuario */
  userId: string;
  /** Permisos del usuario */
  permissions: FilePermission[];
  /** Máximo número de descargas permitidas */
  maxDownloads?: number;
  /** Número actual de descargas */
  currentDownloads?: number;
  /** Fecha de expiración personalizada */
  expiresAt?: number;
  /** Fecha de expiración */
  exp: number;
  /** Fecha de emisión */
  iat: number;
}
