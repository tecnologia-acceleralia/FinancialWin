import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  StorageFileInfo,
  FileUploadOptions,
  StorageStats,
  StorageHealthStatus,
} from '../interfaces/storage.interface';

/**
 * Servicio de almacenamiento para Digital Ocean Spaces
 * Proporciona funcionalidades de subida, descarga y gestión de archivos
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client | null;
  private readonly bucketName: string;
  private readonly bucketUrl: string;
  private readonly region: string;

  constructor(private configService: ConfigService) {
    // Configurar cliente S3 para Digital Ocean Spaces
    // Usar variables de entorno directamente como fallback
    const endpoint =
      this.configService.get('app.doSpacesEndpoint') ||
      process.env.DO_SPACES_ENDPOINT;
    const region =
      this.configService.get('app.doSpacesRegion') ||
      process.env.DO_SPACES_REGION;
    const accessKeyId =
      this.configService.get('app.doSpacesAccessKeyId') ||
      process.env.DO_SPACES_ACCESS_KEY_ID;
    const secretAccessKey =
      this.configService.get('app.doSpacesSecretAccessKey') ||
      process.env.DO_SPACES_SECRET_ACCESS_KEY;

    this.logger.log(
      `StorageService config - Endpoint: ${endpoint}, Region: ${region}, AccessKeyId: ${accessKeyId ? 'SET' : 'NOT SET'}`
    );

    // Digital Ocean Spaces is optional - only initialize if credentials are provided
    if (!accessKeyId || !secretAccessKey || !endpoint || !region) {
      this.logger.warn(
        'Digital Ocean Spaces credentials are not configured. Storage service will use local file storage.'
      );
      // Initialize with dummy values - methods will handle gracefully
      this.s3Client = null as any;
      this.bucketName = '';
      this.bucketUrl = '';
      this.region = '';
      return;
    }

    // Check if credentials look valid (basic format check)
    if (!accessKeyId.startsWith('DO') || secretAccessKey.length < 20) {
      this.logger.warn(
        'Digital Ocean Spaces credentials may be invalid (format check failed)'
      );
      this.logger.warn(
        'Expected: AccessKeyId starts with "DO", SecretAccessKey length >= 20'
      );
      this.logger.warn(
        `Actual: AccessKeyId="${accessKeyId}", SecretAccessKey length=${secretAccessKey.length}`
      );
    }

    this.s3Client = new S3Client({
      endpoint: `https://${endpoint}`,
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
      forcePathStyle: false, // Digital Ocean Spaces usa subdomain style
    });

    this.bucketName =
      this.configService.get<string>('app.doSpacesBucketName') ||
      process.env.DO_SPACES_BUCKET_NAME ||
      '';
    this.bucketUrl =
      this.configService.get<string>('app.bucketUrlStorage') ||
      process.env.BUCKET_URL_STORAGE ||
      '';
    this.region = region;

    this.logger.log(
      `StorageService initialized for bucket: ${this.bucketName}`
    );
  }

  /**
   * Verifica si el servicio de almacenamiento está configurado (DO Spaces)
   */
  private isStorageConfigured(): boolean {
    return this.s3Client !== null && this.bucketName !== '';
  }

  /**
   * Detecta si un nombre de archivo tiene problemas de encoding incorrecto
   * Identifica patrones comunes como IÌ\x80, Ã³, etc.
   */
  private detectEncodingIssue(filename: string): {
    hasIssue: boolean;
    pattern?: string;
    detectedPatterns: string[];
  } {
    const detectedPatterns: string[] = [];

    // Patrón 1: IÌ\x80 (ó mal codificado)
    if (filename.includes('IÌ') || filename.includes('\x80')) {
      detectedPatterns.push('IÌ\\x80 (ó mal codificado)');
    }

    // Patrón 2: Caracteres latinos mal codificados (Ã³, Ã©, Ã±, etc.)
    const latinEncodingPatterns = [
      /Ã³/g, // ó
      /Ã©/g, // é
      /Ã­/g, // í
      /Ã³/g, // ó
      /Ãº/g, // ú
      /Ã±/g, // ñ
      /Ã¡/g, // á
      /Ã©/g, // é
      /Ã­/g, // í
      /Ã³/g, // ó
      /Ãº/g, // ú
      /Ã./g, // otros caracteres con Ã seguido de cualquier carácter
    ];

    for (const pattern of latinEncodingPatterns) {
      if (pattern.test(filename)) {
        detectedPatterns.push(`Latin encoding pattern: ${pattern.source}`);
      }
    }

    // Patrón 3: Bytes fuera del rango UTF-8 válido
    try {
      const buffer = Buffer.from(filename, 'utf8');
      // Verificar si hay bytes que no son UTF-8 válidos
      // Si el string tiene caracteres que no se pueden representar en UTF-8,
      // Buffer.from() los reemplaza con el carácter de reemplazo (U+FFFD)
      const decoded = buffer.toString('utf8');
      if (decoded.includes('\uFFFD')) {
        detectedPatterns.push(
          'Invalid UTF-8 bytes (replacement character detected)'
        );
      }
    } catch {
      detectedPatterns.push('Failed to validate UTF-8 encoding');
    }

    // Patrón 4: Secuencias de caracteres que sugieren encoding incorrecto
    // Ejemplo: "redaccioIÌ" donde debería ser "redacción"
    if (/[a-zA-Z]IÌ/.test(filename) || /[a-zA-Z]\x80/.test(filename)) {
      detectedPatterns.push('Character sequence suggesting encoding mismatch');
    }

    const hasIssue = detectedPatterns.length > 0;

    if (hasIssue) {
      this.logger.warn(
        `🔍 Encoding issue detected in filename: "${filename}"`,
        {
          detectedPatterns,
          filenameBytes: Buffer.from(filename, 'utf8').toString('hex'),
        }
      );
    }

    return {
      hasIssue,
      pattern: detectedPatterns[0],
      detectedPatterns,
    };
  }

  /**
   * Corrige el encoding de un nombre de archivo de latin1/ISO-8859-1 a UTF-8
   */
  private fixEncoding(filename: string): string {
    try {
      let fixed: string = filename;

      // Estrategia 1: Corregir patrones específicos conocidos
      // El patrón "IÌ\x80" es "ó" mal codificado
      // Cuando "ó" (U+00F3) se codifica como latin1 (0xF3) y se interpreta como UTF-8,
      // se convierte en la secuencia de bytes que JavaScript muestra como "IÌ\x80"
      if (filename.includes('IÌ') || filename.includes('\x80')) {
        try {
          // Reemplazar el patrón específico IÌ\x80 por ó
          fixed = fixed.replace(/IÌ\x80?/g, 'ó');
          // También reemplazar IÌ solo (sin \x80) por ó
          fixed = fixed.replace(/IÌ/g, 'ó');
          // Remover bytes \x80 sueltos
          fixed = fixed.replace(/\x80/g, '');
        } catch (error) {
          this.logger.warn(`Error replacing IÌ pattern: ${error.message}`);
        }
      }

      // Estrategia 2: Intentar convertir de latin1 a UTF-8
      // Si el nombre viene como latin1 pero se interpreta como UTF-8,
      // necesitamos reconstruirlo correctamente
      try {
        // Primero, obtener los bytes como están actualmente (mal interpretados)
        // Luego, tratarlos como si fueran latin1 y convertirlos a UTF-8
        const currentBytes = Buffer.from(fixed, 'latin1');
        const corrected = currentBytes.toString('utf8');

        // Verificar si la corrección mejoró el string
        if (
          corrected !== fixed &&
          !corrected.includes('\uFFFD') &&
          corrected.length <= fixed.length * 2
        ) {
          // La corrección parece válida
          fixed = corrected;
        }
      } catch (error) {
        // Si falla, continuar con fixed anterior
        this.logger.debug(
          `Latin1 to UTF-8 conversion failed: ${error.message}`
        );
      }

      // Estrategia 3: Corregir caracteres latinos mal codificados (Ã³, Ã©, etc.)
      // Estos aparecen cuando UTF-8 se interpreta como latin1
      // El patrón general es: cuando un carácter UTF-8 de 2 bytes se interpreta como latin1,
      // aparece como "Ã" seguido de otro carácter
      try {
        // Intentar reconstruir el string tratando los bytes como latin1
        // y luego decodificarlos como UTF-8
        const bytes = Buffer.from(fixed, 'latin1');
        const reconstructed = bytes.toString('utf8');

        // Verificar si la reconstrucción es mejor (no tiene caracteres de reemplazo)
        if (
          !reconstructed.includes('\uFFFD') &&
          reconstructed.length <= fixed.length &&
          reconstructed !== fixed
        ) {
          // La reconstrucción parece válida
          fixed = reconstructed;
          this.logger.debug(
            `Encoding reconstructed via latin1→utf8 conversion`
          );
        }
      } catch (error) {
        this.logger.debug(`Latin1 reconstruction failed: ${error.message}`);
      }

      // Estrategia 3b: Reemplazar patrones específicos conocidos de encoding incorrecto
      // Estos son casos específicos donde sabemos la corrección exacta
      const knownFixes: Array<[RegExp, string]> = [
        [/IÌ\x80?/g, 'ó'], // Patrón específico IÌ\x80 → ó
        [/IÌ/g, 'ó'], // IÌ sin \x80 → ó
        [/Ã³/g, 'ó'], // Ã³ → ó
        [/Ã©/g, 'é'], // Ã© → é
        [/Ã­/g, 'í'], // Ã­ → í
        [/Ãº/g, 'ú'], // Ãº → ú
        [/Ã±/g, 'ñ'], // Ã± → ñ
        [/Ã¡/g, 'á'], // Ã¡ → á
      ];

      for (const [pattern, replacement] of knownFixes) {
        if (pattern.test(fixed)) {
          fixed = fixed.replace(pattern, replacement);
        }
      }

      // Estrategia 4: Normalizar caracteres Unicode
      // Esto ayuda a normalizar caracteres que pueden tener múltiples representaciones
      try {
        fixed = fixed.normalize('NFC'); // Normalize Form Canonical Composition
      } catch (error) {
        this.logger.debug(`Unicode normalization failed: ${error.message}`);
      }

      // Estrategia 5: Validar que el resultado es UTF-8 válido
      try {
        const testBuffer = Buffer.from(fixed, 'utf8');
        const testDecoded = testBuffer.toString('utf8');
        if (!testDecoded.includes('\uFFFD')) {
          // No hay caracteres de reemplazo, el encoding es válido
          if (fixed !== filename) {
            this.logger.log(`✅ Encoding fixed: "${filename}" → "${fixed}"`);
          }
          return fixed;
        } else {
          this.logger.warn(
            `⚠️ Fixed encoding still contains replacement characters. Using original.`,
            {
              original: filename,
              fixed: fixed,
            }
          );
        }
      } catch (error) {
        this.logger.warn(
          `⚠️ UTF-8 validation failed for fixed encoding: ${error.message}`
        );
      }

      // Si todas las estrategias fallan, devolver el nombre original
      if (fixed === filename) {
        this.logger.warn(
          `⚠️ Could not fix encoding for "${filename}". Using original.`
        );
      }
      return fixed;
    } catch (error) {
      this.logger.warn(
        `Error fixing encoding for "${filename}": ${error.message}`
      );
      return filename;
    }
  }

  /**
   * Valida que todos los valores de metadata son UTF-8 válidos y no tienen problemas
   */
  private validateMetadata(metadata: Record<string, string>): {
    isValid: boolean;
    issues: string[];
    invalidKeys: string[];
  } {
    const issues: string[] = [];
    const invalidKeys: string[] = [];

    for (const [key, value] of Object.entries(metadata)) {
      // Validar que el valor es un string
      if (typeof value !== 'string') {
        issues.push(`Metadata key "${key}" is not a string`);
        invalidKeys.push(key);
        continue;
      }

      // Validar UTF-8
      const utf8Validation = this.validateUTF8String(value);
      if (!utf8Validation.isValid) {
        issues.push(
          `Metadata key "${key}" has UTF-8 issues: ${utf8Validation.issues.join(', ')}`
        );
        invalidKeys.push(key);
      }

      // Validar que no excede longitud razonable (cada metadata value tiene límite)
      if (value.length > 1000) {
        issues.push(
          `Metadata key "${key}" exceeds reasonable length (${value.length} chars)`
        );
        // No marcar como inválido, solo advertir
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      invalidKeys,
    };
  }

  /**
   * Valida que un string es UTF-8 válido y no contiene caracteres problemáticos
   */
  private validateUTF8String(str: string): {
    isValid: boolean;
    hasControlChars: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Verificar que no tiene caracteres de reemplazo UTF-8
    if (str.includes('\uFFFD')) {
      issues.push('Contains UTF-8 replacement character');
    }

    // Verificar caracteres de control (excepto espacios y tabs)
    // Usar función en lugar de regex para evitar problemas con caracteres de control
    const hasControlChars = (() => {
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        // Caracteres de control: 0x00-0x08, 0x0B-0x0C, 0x0E-0x1F, 0x7F
        if (
          (code >= 0x00 && code <= 0x08) ||
          (code >= 0x0b && code <= 0x0c) ||
          (code >= 0x0e && code <= 0x1f) ||
          code === 0x7f
        ) {
          return true;
        }
      }
      return false;
    })();
    if (hasControlChars) {
      issues.push('Contains control characters');
    }

    // Verificar que se puede codificar/decodificar correctamente
    try {
      const buffer = Buffer.from(str, 'utf8');
      const decoded = buffer.toString('utf8');
      if (decoded !== str && !decoded.includes('\uFFFD')) {
        // El round-trip funciona, pero hay alguna diferencia
        // Esto puede ser normal con normalización Unicode
      }
    } catch {
      issues.push('Failed UTF-8 round-trip validation');
    }

    return {
      isValid: issues.length === 0,
      hasControlChars,
      issues,
    };
  }

  /**
   * Sanitiza y normaliza el nombre del archivo para evitar problemas de encoding
   * que causan errores SignatureDoesNotMatch en S3
   */
  private sanitizeFileName(filename: string): {
    sanitized: string;
    base64Encoded: string;
    urlEncoded: string;
  } {
    try {
      // Logging del nombre original con bytes raw
      const originalBytes = Buffer.from(filename, 'utf8').toString('hex');
      this.logger.log(`📝 Sanitizing filename: "${filename}"`, {
        originalFilename: filename,
        originalBytes,
        originalLength: filename.length,
      });

      // Paso 1: Detectar problemas de encoding
      const encodingIssue = this.detectEncodingIssue(filename);

      // Paso 2: Corregir encoding si es necesario
      let corrected = filename;
      if (encodingIssue.hasIssue) {
        this.logger.log(`🔧 Encoding issue detected, attempting to fix...`, {
          original: filename,
          detectedPatterns: encodingIssue.detectedPatterns,
        });
        corrected = this.fixEncoding(filename);

        if (corrected !== filename) {
          this.logger.log(
            `✅ Encoding corrected: "${filename}" → "${corrected}"`
          );
        } else {
          this.logger.warn(
            `⚠️ Encoding issue detected but could not be automatically fixed`,
            {
              original: filename,
              detectedPatterns: encodingIssue.detectedPatterns,
            }
          );
        }
      }

      // Paso 3: Normalizar espacios múltiples a espacios simples
      let normalized = corrected.replace(/\s+/g, ' ').trim();

      // Paso 4: Validar UTF-8
      const utf8Validation = this.validateUTF8String(normalized);
      if (!utf8Validation.isValid) {
        this.logger.warn(
          `⚠️ UTF-8 validation issues found: ${utf8Validation.issues.join(', ')}`,
          {
            filename: normalized,
            issues: utf8Validation.issues,
          }
        );

        // Intentar limpiar caracteres problemáticos
        if (utf8Validation.hasControlChars) {
          // Usar función en lugar de regex para evitar problemas con caracteres de control
          normalized = normalized
            .split('')
            .filter(char => {
              const code = char.charCodeAt(0);
              // Excluir caracteres de control: 0x00-0x08, 0x0B-0x0C, 0x0E-0x1F, 0x7F
              return !(
                (code >= 0x00 && code <= 0x08) ||
                (code >= 0x0b && code <= 0x0c) ||
                (code >= 0x0e && code <= 0x1f) ||
                code === 0x7f
              );
            })
            .join('');
        }
      }

      // Paso 5: Codificar en base64 para metadata (usar el nombre CORREGIDO)
      // IMPORTANTE: Usar el nombre corregido, no el original
      const base64Encoded = Buffer.from(normalized, 'utf8').toString('base64');

      // Paso 6: Codificar en URL encoding como alternativa
      const urlEncoded = encodeURIComponent(normalized);

      // Logging final
      this.logger.log(`✅ Filename sanitization complete`, {
        original: filename,
        corrected: corrected,
        normalized: normalized,
        base64Length: base64Encoded.length,
        urlEncodedLength: urlEncoded.length,
        encodingFixed: corrected !== filename,
        utf8Valid: utf8Validation.isValid,
      });

      return {
        sanitized: normalized,
        base64Encoded,
        urlEncoded,
      };
    } catch (error) {
      // Si falla la sanitización, usar el nombre original pero codificado en base64
      this.logger.error(
        `❌ Error sanitizing filename "${filename}": ${error.message}`,
        {
          error: error.message,
          stack: error.stack,
          filename,
        }
      );

      // Fallback: codificar directamente en base64 sin corrección
      return {
        sanitized: filename,
        base64Encoded: Buffer.from(filename, 'utf8').toString('base64'),
        urlEncoded: encodeURIComponent(filename),
      };
    }
  }

  /**
   * Sube un archivo al bucket de Digital Ocean Spaces
   */
  async uploadFile(
    file: Express.Multer.File,
    options: FileUploadOptions
  ): Promise<StorageFileInfo> {
    const startTime = Date.now();

    // Inicializar variables antes del try para que estén disponibles en el catch
    // Esto evita ReferenceError si el error ocurre antes de que se definan
    let finalFileName: string = file.originalname;
    let encodingIssue: {
      hasIssue: boolean;
      detectedPatterns: string[];
    } = { hasIssue: false, detectedPatterns: [] };
    let key: string = '';
    let objectMetadata: Record<string, string> = {};
    let finalContentType: string = file.mimetype || 'application/octet-stream';
    let finalContentLength: number = file.size;
    let finalCacheControl: string = 'max-age=31536000';

    try {
      const {
        folder,
        metadata = {},
        isPublic = false,
        contentType,
        cacheControl,
      } = options;

      // Logging detallado del archivo antes de procesar
      this.logger.log(`📤 Uploading file: ${file.originalname}`, {
        fileName: file.originalname,
        fileSize: file.size,
        contentType: file.mimetype,
        bufferLength: file.buffer?.length || 0,
      });

      // Sanitizar y codificar el nombre del archivo
      const sanitizedFileName = this.sanitizeFileName(file.originalname);

      // ESTRATEGIA: Usar nombre sanitizado como nombre "oficial" del archivo
      // Si el nombre original tiene encoding incorrecto, usar el sanitizado en todo el sistema
      encodingIssue = this.detectEncodingIssue(file.originalname);
      finalFileName = encodingIssue.hasIssue
        ? sanitizedFileName.sanitized
        : file.originalname;

      // Logging de sanitización para debugging
      if (sanitizedFileName.sanitized !== file.originalname) {
        this.logger.log(
          `🔧 Filename sanitized: "${file.originalname}" → "${sanitizedFileName.sanitized}"`,
          {
            original: file.originalname,
            sanitized: sanitizedFileName.sanitized,
            encodingIssue: encodingIssue.hasIssue,
            detectedPatterns: encodingIssue.detectedPatterns,
            usingSanitized: encodingIssue.hasIssue,
          }
        );
      }

      // Generar clave única para el archivo
      // IMPORTANTE: Sanitizar fileExtension para evitar problemas en el Key
      const originalExtension = this.getFileExtension(file.originalname);
      const sanitizedExtension = this.sanitizeFileExtension(
        originalExtension,
        file.mimetype
      );

      // Logging si la extensión fue sanitizada
      if (sanitizedExtension !== originalExtension) {
        this.logger.log(
          `🔧 File extension sanitized: "${originalExtension}" → "${sanitizedExtension}"`,
          {
            originalExtension,
            sanitizedExtension,
            mimetype: file.mimetype,
          }
        );
      }

      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      key = `${folder}/${timestamp}-${randomId}${sanitizedExtension}`;

      // Validar y sanitizar ContentType
      finalContentType =
        contentType || file.mimetype || 'application/octet-stream';
      if (!finalContentType || finalContentType.trim() === '') {
        this.logger.warn(
          `⚠️ ContentType is empty for file ${finalFileName}, using default: application/octet-stream`
        );
        finalContentType = 'application/octet-stream';
      }

      // Validar que ContentType es UTF-8 válido
      const contentTypeValidation = this.validateUTF8String(finalContentType);
      if (!contentTypeValidation.isValid) {
        this.logger.warn(
          `⚠️ ContentType has encoding issues, using safe default`,
          {
            originalContentType: finalContentType,
            issues: contentTypeValidation.issues,
          }
        );
        finalContentType = 'application/octet-stream';
      }

      // Validar ContentLength vs buffer.length
      const bufferLength = file.buffer?.length || 0;
      if (file.size !== bufferLength) {
        this.logger.warn(
          `⚠️ ContentLength mismatch for file ${finalFileName}: file.size=${file.size}, buffer.length=${bufferLength}. Using buffer.length as source of truth.`
        );
      }
      finalContentLength = bufferLength > 0 ? bufferLength : file.size;

      // Validar y sanitizar CacheControl
      finalCacheControl = cacheControl || 'max-age=31536000';
      const cacheControlValidation = this.validateUTF8String(finalCacheControl);
      if (!cacheControlValidation.isValid) {
        this.logger.warn(
          `⚠️ CacheControl has encoding issues, using safe default`,
          {
            originalCacheControl: finalCacheControl,
            issues: cacheControlValidation.issues,
          }
        );
        finalCacheControl = 'max-age=31536000';
      }

      // Configurar metadatos usando el nombre sanitizado (no el original si tiene encoding issues)
      // ESTRATEGIA: Si hay encoding incorrecto, usar solo el nombre sanitizado en metadata
      // El nombre sanitizado se convierte en el nombre "oficial" del archivo

      // IMPORTANTE: Si hay encoding issues, NO incluir originalName del spread
      // porque puede contener caracteres problemáticos que causan SignatureDoesNotMatch
      const safeMetadata = encodingIssue.hasIssue
        ? Object.fromEntries(
            Object.entries(metadata).filter(([key]) => key !== 'originalName')
          )
        : metadata;

      objectMetadata = {
        ...safeMetadata,
        // Usar el nombre sanitizado (no el original) codificado en base64
        // Esto evita problemas de encoding en la firma S3
        fileName: Buffer.from(finalFileName, 'utf8').toString('base64'),
        uploadedAt: new Date().toISOString(),
        uploadedBy: metadata.userId || 'system',
      };

      // Si NO hay encoding issues, también incluir el nombre original como referencia
      // Pero siempre priorizar el nombre sanitizado
      if (!encodingIssue.hasIssue) {
        // Solo si no hay problemas, incluir el original también
        objectMetadata.originalName = Buffer.from(
          file.originalname,
          'utf8'
        ).toString('base64');
      } else {
        // Si hay encoding issues, marcar que se usó nombre sanitizado
        // Y asegurarse de que originalName NO esté presente (ya fue filtrado arriba)
        objectMetadata.nameSanitized = 'true';
        // Eliminar originalName si de alguna manera todavía está presente
        delete objectMetadata.originalName;
        this.logger.log(
          `ℹ️ Using sanitized filename in metadata (encoding issue detected)`,
          {
            original: file.originalname,
            sanitized: finalFileName,
            note: 'originalName removed from metadata to prevent SignatureDoesNotMatch',
          }
        );
      }

      // Validar todos los valores de metadata antes de enviar a S3
      const metadataValidation = this.validateMetadata(objectMetadata);
      if (!metadataValidation.isValid) {
        this.logger.warn(
          `⚠️ Metadata validation issues found: ${metadataValidation.issues.join(', ')}`,
          {
            issues: metadataValidation.issues,
            invalidKeys: metadataValidation.invalidKeys,
          }
        );

        // Limpiar metadata problemáticos
        for (const key of metadataValidation.invalidKeys) {
          delete objectMetadata[key];
          this.logger.warn(`⚠️ Removed invalid metadata key: ${key}`);
        }
      }

      // Validar que metadata no exceda 2KB (límite de S3)
      const metadataSize = JSON.stringify(objectMetadata).length;
      if (metadataSize > 2048) {
        this.logger.warn(
          `⚠️ Metadata size (${metadataSize} bytes) exceeds S3 limit (2048 bytes) for file ${finalFileName}. Using minimal metadata.`
        );
        // Mantener solo campos esenciales
        const minimalMetadata: Record<string, string> = {
          fileName: Buffer.from(finalFileName, 'utf8').toString('base64'),
          uploadedAt: new Date().toISOString(),
          uploadedBy: metadata.userId || 'system',
        };
        Object.assign(objectMetadata, minimalMetadata);
      }

      // Validación final: asegurar que todos los valores son strings UTF-8 válidos
      const finalValidation = this.validateMetadata(objectMetadata);
      if (!finalValidation.isValid) {
        this.logger.error(
          `❌ Metadata validation failed after cleanup. Using minimal safe metadata.`,
          {
            issues: finalValidation.issues,
            invalidKeys: finalValidation.invalidKeys,
          }
        );
        // Usar metadata mínimos como último recurso
        const safeMetadata: Record<string, string> = {
          fileName: Buffer.from(finalFileName, 'utf8').toString('base64'),
          uploadedAt: new Date().toISOString(),
          uploadedBy: metadata.userId || 'system',
        };
        Object.assign(objectMetadata, safeMetadata);
        // Eliminar todos los demás campos
        Object.keys(objectMetadata).forEach(key => {
          if (!['fileName', 'uploadedAt', 'uploadedBy'].includes(key)) {
            delete objectMetadata[key];
          }
        });
      }

      // Configurar headers
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: finalContentType,
        ContentLength: finalContentLength,
        Metadata: objectMetadata,
        CacheControl: finalCacheControl,
        ACL: isPublic ? 'public-read' : 'private',
      });

      // Logging detallado del request completo antes de enviar
      this.logger.log(`📋 Complete upload request details:`, {
        bucket: this.bucketName,
        key,
        keyBytes: Buffer.from(key, 'utf8').toString('hex'),
        contentType: finalContentType,
        contentTypeBytes: Buffer.from(finalContentType, 'utf8').toString('hex'),
        contentLength: finalContentLength,
        cacheControl: finalCacheControl,
        cacheControlBytes: Buffer.from(finalCacheControl, 'utf8').toString(
          'hex'
        ),
        acl: isPublic ? 'public-read' : 'private',
        metadataSize: JSON.stringify(objectMetadata).length,
        metadataKeys: Object.keys(objectMetadata),
        metadata: objectMetadata,
        hasFileName: !!objectMetadata.fileName,
        fileNameLength: objectMetadata.fileName?.length || 0,
        encodingIssueDetected: encodingIssue.hasIssue,
        usingSanitizedName: encodingIssue.hasIssue,
        originalFileName: file.originalname,
        finalFileName: finalFileName,
        originalExtension: originalExtension,
        sanitizedExtension: sanitizedExtension,
      });

      // Logging adicional: bytes raw de strings críticos
      this.logger.debug(`🔍 Request string encoding details:`, {
        key: {
          value: key,
          bytes: Buffer.from(key, 'utf8').toString('hex'),
          length: key.length,
          utf8Valid: this.validateUTF8String(key).isValid,
        },
        contentType: {
          value: finalContentType,
          bytes: Buffer.from(finalContentType, 'utf8').toString('hex'),
          length: finalContentType.length,
          utf8Valid: this.validateUTF8String(finalContentType).isValid,
        },
        cacheControl: {
          value: finalCacheControl,
          bytes: Buffer.from(finalCacheControl, 'utf8').toString('hex'),
          length: finalCacheControl.length,
          utf8Valid: this.validateUTF8String(finalCacheControl).isValid,
        },
        metadataFileName: {
          value: objectMetadata.fileName,
          length: objectMetadata.fileName?.length || 0,
          isBase64: true,
        },
      });

      // Ejecutar comando de subida
      if (!this.isStorageConfigured()) {
        throw new BadRequestException(
          'Storage service is not configured. Please configure Digital Ocean Spaces credentials.'
        );
      }

      const result = await this.s3Client!.send(command);

      // Construir información del archivo
      // Usar el nombre sanitizado como nombre "oficial" en la respuesta
      const fileInfo: StorageFileInfo = {
        key,
        url: isPublic ? `${this.bucketUrl}/${key}` : undefined,
        size: file.size,
        mimeType: file.mimetype,
        lastModified: new Date(),
        metadata: {
          ...objectMetadata,
          // Incluir el nombre sanitizado (no el original si tenía encoding issues)
          // Este es el nombre "oficial" que se usa en todo el sistema
          fileName: finalFileName,
          // Si no hubo encoding issues, también incluir el original
          ...(encodingIssue.hasIssue
            ? { nameSanitized: 'true' }
            : { originalName: file.originalname }),
        },
        etag: result.ETag,
      };

      // Registrar métricas
      const duration = Date.now() - startTime;

      this.logger.log(
        `✅ File uploaded successfully: ${key} (${file.size} bytes) in ${duration}ms`
      );
      return fileInfo;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Logging detallado del error con información completa del request
      this.logger.error(`❌ Error uploading file: ${error.message}`, {
        error: error.message,
        stack: error.stack,
        fileName: file.originalname,
        finalFileName: finalFileName || 'unknown',
        fileSize: file.size,
        contentType: file.mimetype,
        bufferLength: file.buffer?.length || 0,
        bucketName: this.bucketName,
        endpoint: this.getEndpoint(),
        region: this.region,
        duration,
        encodingIssueDetected: encodingIssue?.hasIssue || false,
        key: key || 'unknown',
        metadataAttempted: objectMetadata || {},
        requestDetails: {
          bucket: this.bucketName,
          key: key,
          contentType: finalContentType,
          contentLength: finalContentLength,
          cacheControl: finalCacheControl,
          metadataSize: objectMetadata
            ? JSON.stringify(objectMetadata).length
            : 0,
        },
      });

      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Genera una URL firmada para acceso temporal a un archivo privado
   */
  async generateSignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      if (!this.isStorageConfigured()) {
        throw new BadRequestException(
          'Storage service is not configured. Please configure Digital Ocean Spaces credentials.'
        );
      }

      const signedUrl = await getSignedUrl(this.s3Client!, command, {
        expiresIn,
      });

      this.logger.log(
        `Generated signed URL for ${key}, expires in ${expiresIn}s`
      );
      return signedUrl;
    } catch (error) {
      this.logger.error(
        `Error generating signed URL for ${key}: ${error.message}`
      );
      throw new BadRequestException(
        `Failed to generate download URL: ${error.message}`
      );
    }
  }

  /**
   * Obtiene un archivo del bucket como Buffer
   */
  async getFile(key: string): Promise<Buffer> {
    try {
      this.logger.log(`Getting file: ${key}`);

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      if (!this.isStorageConfigured()) {
        throw new BadRequestException(
          'Storage service is not configured. Please configure Digital Ocean Spaces credentials.'
        );
      }

      const response = await this.s3Client!.send(command);

      if (!response.Body) {
        throw new Error(`File not found: ${key}`);
      }

      // Convertir el stream a Buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      this.logger.log(
        `File retrieved successfully: ${key} (${buffer.length} bytes)`
      );

      return buffer;
    } catch (error) {
      this.logger.error(`Error getting file ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Elimina un archivo del bucket
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      if (!this.isStorageConfigured()) {
        throw new BadRequestException(
          'Storage service is not configured. Please configure Digital Ocean Spaces credentials.'
        );
      }

      await this.s3Client!.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting file ${key}: ${error.message}`);
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Obtiene metadatos de un archivo
   */
  async getFileMetadata(key: string): Promise<StorageFileInfo> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      if (!this.isStorageConfigured()) {
        throw new BadRequestException(
          'Storage service is not configured. Please configure Digital Ocean Spaces credentials.'
        );
      }

      const result = await this.s3Client!.send(command);

      const fileInfo: StorageFileInfo = {
        key,
        url:
          result.Metadata?.isPublic === 'true'
            ? `${this.bucketUrl}/${key}`
            : undefined,
        size: result.ContentLength || 0,
        mimeType: result.ContentType || 'application/octet-stream',
        lastModified: result.LastModified || new Date(),
        metadata: result.Metadata || {},
        etag: result.ETag,
      };

      return fileInfo;
    } catch (error) {
      this.logger.error(`Error getting metadata for ${key}: ${error.message}`);
      throw new BadRequestException(
        `Failed to get file metadata: ${error.message}`
      );
    }
  }

  /**
   * Lista archivos en una carpeta específica
   */
  async listFiles(
    prefix: string = '',
    maxKeys: number = 1000
  ): Promise<StorageFileInfo[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      if (!this.isStorageConfigured()) {
        throw new BadRequestException(
          'Storage service is not configured. Please configure Digital Ocean Spaces credentials.'
        );
      }

      const result = await this.s3Client!.send(command);
      const files: StorageFileInfo[] = [];

      if (result.Contents) {
        for (const object of result.Contents) {
          if (object.Key) {
            const fileInfo: StorageFileInfo = {
              key: object.Key,
              size: object.Size || 0,
              mimeType: 'application/octet-stream', // Se puede mejorar obteniendo metadata
              lastModified: object.LastModified || new Date(),
              etag: object.ETag,
            };
            files.push(fileInfo);
          }
        }
      }

      this.logger.log(`Listed ${files.length} files with prefix: ${prefix}`);
      return files;
    } catch (error) {
      this.logger.error(
        `Error listing files with prefix ${prefix}: ${error.message}`
      );
      throw new BadRequestException(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Verifica la salud del servicio de almacenamiento
   */
  async checkHealth(): Promise<StorageHealthStatus> {
    const startTime = Date.now();

    if (!this.isStorageConfigured()) {
      return {
        status: 'unhealthy',
        provider: 'digitalocean',
        error: 'Storage service is not configured',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
      };
    }

    try {
      // Intentar listar archivos para verificar conectividad
      await this.listFiles('', 1);

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        provider: 'digitalocean',
        responseTime,
        lastCheck: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        status: 'unhealthy',
        provider: 'digitalocean',
        error: error.message,
        responseTime,
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Obtiene estadísticas del almacenamiento
   */
  async getStorageStats(): Promise<StorageStats> {
    try {
      const allFiles = await this.listFiles('', 10000); // Límite alto para estadísticas

      const stats: StorageStats = {
        totalFiles: allFiles.length,
        totalSize: allFiles.reduce((sum, file) => sum + file.size, 0),
        filesByType: {},
        uploadsToday: 0,
        downloadsToday: 0,
        filesByFolder: {},
      };

      // Procesar estadísticas
      for (const file of allFiles) {
        // Archivos por tipo
        const mimeType = file.mimeType.split('/')[0];
        stats.filesByType[mimeType] = (stats.filesByType[mimeType] || 0) + 1;

        // Archivos por carpeta
        const folder = file.key.split('/')[0];
        stats.filesByFolder[folder] = (stats.filesByFolder[folder] || 0) + 1;

        // Subidas hoy (archivos creados en las últimas 24 horas)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (file.lastModified >= today) {
          stats.uploadsToday++;
        }
      }

      this.logger.log(
        `Storage stats: ${stats.totalFiles} files, ${stats.totalSize} bytes`
      );
      return stats;
    } catch (error) {
      this.logger.error(`Error getting storage stats: ${error.message}`);
      throw new BadRequestException(
        `Failed to get storage statistics: ${error.message}`
      );
    }
  }

  /**
   * Extrae la extensión de un nombre de archivo
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }

  /**
   * Sanitiza la extensión del archivo para asegurar que solo contiene caracteres ASCII seguros
   * Si hay problemas, usa la extensión basada en mimetype
   */
  private sanitizeFileExtension(extension: string, mimetype?: string): string {
    // Si la extensión está vacía, intentar derivarla del mimetype
    if (!extension || extension.trim() === '') {
      return this.getExtensionFromMimeType(mimetype);
    }

    // Validar que la extensión solo contiene caracteres ASCII seguros
    const asciiSafePattern = /^\.([a-zA-Z0-9]+)$/;
    if (asciiSafePattern.test(extension)) {
      return extension.toLowerCase(); // Normalizar a minúsculas
    }

    // Si la extensión tiene caracteres problemáticos, usar extensión del mimetype
    this.logger.warn(
      `⚠️ File extension "${extension}" contains unsafe characters. Using mimetype-based extension.`,
      {
        originalExtension: extension,
        mimetype,
      }
    );

    return this.getExtensionFromMimeType(mimetype);
  }

  /**
   * Deriva la extensión del archivo basándose en el mimetype
   */
  private getExtensionFromMimeType(mimetype?: string): string {
    if (!mimetype) {
      return '';
    }

    const mimeToExt: Record<string, string> = {
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        '.docx',
      'text/plain': '.txt',
      'text/csv': '.csv',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
    };

    return mimeToExt[mimetype] || '';
  }

  /**
   * Valida el tipo de archivo permitido
   */
  validateFileType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimeType);
  }

  /**
   * Valida el tamaño del archivo
   */
  validateFileSize(size: number, maxSizeBytes: number): boolean {
    return size <= maxSizeBytes;
  }

  /**
   * Obtiene la región configurada
   */
  getRegion(): string {
    return this.region;
  }

  /**
   * Obtiene el nombre del bucket
   */
  getBucketName(): string {
    return this.bucketName;
  }

  /**
   * Obtiene el endpoint configurado
   */
  getEndpoint(): string {
    return this.configService.get<string>('app.doSpacesEndpoint') || '';
  }

  /**
   * Obtiene la URL del bucket
   */
  getBucketUrl(): string {
    return this.bucketUrl;
  }

  /**
   * Realiza un ping al servicio de almacenamiento
   */
  async ping(): Promise<void> {
    if (!this.isStorageConfigured()) {
      this.logger.warn('Storage service is not configured. Ping skipped.');
      return;
    }
    try {
      await this.s3Client!.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          MaxKeys: 1,
        })
      );
    } catch (error) {
      this.logger.error(`Ping failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene el estado de salud del almacenamiento
   */
  async getStorageHealth(): Promise<StorageHealthStatus> {
    return this.checkHealth();
  }
}
