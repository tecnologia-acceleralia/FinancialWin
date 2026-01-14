import {
  PipeTransform,
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly logger = new Logger(FileValidationPipe.name);
  private readonly maxFileSize: number;
  private readonly allowedTypes: string[];

  constructor(private configService: ConfigService) {
    this.maxFileSize = this.configService.get(
      'MAX_FILE_SIZE',
      20 * 1024 * 1024
    ); // 20MB por defecto
    this.allowedTypes = this.configService
      .get('ALLOWED_FILE_TYPES', [
        'image/*',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/csv',
      ])
      .split(',');
  }

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const validation = this.validateFile(file);

    if (!validation.isValid) {
      this.logger.warn(
        `❌ File validation failed: ${validation.errors.join(', ')}`
      );
      throw new BadRequestException(
        `File validation failed: ${validation.errors.join(', ')}`
      );
    }

    if (validation.warnings.length > 0) {
      this.logger.warn(
        `⚠️ File validation warnings: ${validation.warnings.join(', ')}`
      );
    }

    this.logger.log(
      `✅ File validation passed: ${file.originalname} (${this.formatFileSize(file.size)})`
    );
    return file;
  }

  private validateFile(file: Express.Multer.File): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar tamaño del archivo
    if (file.size > this.maxFileSize) {
      errors.push(
        `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(this.maxFileSize)})`
      );
    }

    // Validar tipo de archivo
    const isAllowedType = this.allowedTypes.some(allowedType => {
      if (allowedType.endsWith('/*')) {
        return file.mimetype.startsWith(allowedType.slice(0, -1));
      }
      return file.mimetype === allowedType;
    });

    if (!isAllowedType) {
      errors.push(
        `File type '${file.mimetype}' is not allowed. Allowed types: ${this.allowedTypes.join(', ')}`
      );
    }

    // Validar nombre del archivo
    if (!file.originalname || file.originalname.trim().length === 0) {
      errors.push('File name is required');
    }

    if (file.originalname.length > 255) {
      errors.push('File name is too long (maximum 255 characters)');
    }

    // Validar caracteres especiales en el nombre
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(file.originalname)) {
      errors.push('File name contains invalid characters');
    }

    // Advertencias
    if (file.size > this.maxFileSize * 0.8) {
      warnings.push('File size is close to the limit');
    }

    // Validar extensiones peligrosas
    const dangerousExtensions = [
      '.exe',
      '.bat',
      '.cmd',
      '.scr',
      '.pif',
      '.com',
    ];
    const fileExtension = this.getFileExtension(
      file.originalname
    ).toLowerCase();
    if (dangerousExtensions.includes(fileExtension)) {
      errors.push('File type is potentially dangerous');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private getFileExtension(filename: string): string {
    return filename.substring(filename.lastIndexOf('.'));
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Valida múltiples archivos
   */
  static validateMultipleFiles(
    files: Express.Multer.File[]
  ): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!files || files.length === 0) {
      errors.push('No files provided');
      return { isValid: false, errors, warnings };
    }

    if (files.length > 10) {
      errors.push('Too many files. Maximum 10 files allowed per request');
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = 100 * 1024 * 1024; // 100MB total

    if (totalSize > maxTotalSize) {
      errors.push(
        `Total file size (${this.formatFileSize(totalSize)}) exceeds maximum allowed size (${this.formatFileSize(maxTotalSize)})`
      );
    }

    // Validar archivos duplicados
    const filenames = files.map(file => file.originalname);
    const duplicates = filenames.filter(
      (name, index) => filenames.indexOf(name) !== index
    );
    if (duplicates.length > 0) {
      warnings.push(`Duplicate file names detected: ${duplicates.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
