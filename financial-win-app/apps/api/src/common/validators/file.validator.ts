import { Injectable } from '@nestjs/common';
import { Express } from 'express';

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class FileValidator {
  private static readonly ALLOWED_TYPES = [
    // Documentos
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'text/plain', // .txt

    // Imágenes
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
  ];

  private static readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  private static readonly MAX_BATCH_SIZE = 100 * 1024 * 1024; // 100MB total
  private static readonly MAX_FILES_PER_BATCH = 10;

  /**
   * Valida el tipo de archivo
   */
  static validateFileType(file: Express.Multer.File): boolean {
    return this.ALLOWED_TYPES.includes(file.mimetype);
  }

  /**
   * Valida el tamaño de un archivo individual
   */
  static validateFileSize(
    file: Express.Multer.File,
    maxSize: number = this.MAX_FILE_SIZE
  ): boolean {
    return file.size <= maxSize;
  }

  /**
   * Valida el tamaño total de un lote de archivos
   */
  static validateBatchSize(
    files: Express.Multer.File[],
    maxTotalSize: number = this.MAX_BATCH_SIZE
  ): boolean {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    return totalSize <= maxTotalSize;
  }

  /**
   * Valida el número máximo de archivos por lote
   */
  static validateBatchCount(
    files: Express.Multer.File[],
    maxCount: number = this.MAX_FILES_PER_BATCH
  ): boolean {
    return files.length <= maxCount;
  }

  /**
   * Valida un archivo individual completamente
   */
  static validateFile(file: Express.Multer.File): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar tipo
    if (!this.validateFileType(file)) {
      errors.push(
        `Tipo de archivo no permitido: ${file.mimetype}. Tipos permitidos: PDF, DOCX, TXT, PNG, JPG, WEBP`
      );
    }

    // Validar tamaño
    if (!this.validateFileSize(file)) {
      errors.push(
        `Archivo demasiado grande: ${this.formatFileSize(file.size)}. Máximo permitido: ${this.formatFileSize(this.MAX_FILE_SIZE)}`
      );
    }

    // Advertencias
    if (file.size > 10 * 1024 * 1024) {
      // 10MB
      warnings.push(
        `Archivo grande: ${this.formatFileSize(file.size)}. La subida puede tardar más tiempo.`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Valida un lote completo de archivos
   */
  static validateBatch(files: Express.Multer.File[]): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar número de archivos
    if (!this.validateBatchCount(files)) {
      errors.push(
        `Demasiados archivos: ${files.length}. Máximo permitido: ${this.MAX_FILES_PER_BATCH}`
      );
    }

    // Validar tamaño total
    if (!this.validateBatchSize(files)) {
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      errors.push(
        `Lote demasiado grande: ${this.formatFileSize(totalSize)}. Máximo permitido: ${this.formatFileSize(this.MAX_BATCH_SIZE)}`
      );
    }

    // Validar cada archivo individualmente
    files.forEach((file, index) => {
      const fileValidation = this.validateFile(file);
      if (!fileValidation.isValid) {
        errors.push(
          `Archivo ${index + 1} (${file.originalname}): ${fileValidation.errors.join(', ')}`
        );
      }
      warnings.push(
        ...fileValidation.warnings.map(w => `Archivo ${index + 1}: ${w}`)
      );
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Formatea el tamaño de archivo en formato legible
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Obtiene la extensión de archivo desde el tipo MIME
   */
  static getFileExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        'docx',
      'text/plain': 'txt',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
    };

    return mimeToExt[mimeType] || 'unknown';
  }

  /**
   * Genera un nombre de archivo seguro
   */
  static generateSafeFilename(originalName: string, mimeType: string): string {
    const timestamp = Date.now();
    const extension = this.getFileExtension(mimeType);
    const safeName = originalName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();

    return `${timestamp}_${safeName}.${extension}`;
  }
}
