import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsEnum,
  IsObject,
} from 'class-validator';

export class UserStorageStatsDto {
  @ApiProperty({ description: 'ID del usuario' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Número total de archivos' })
  @IsNumber()
  totalFiles: number;

  @ApiProperty({ description: 'Tamaño total en bytes' })
  @IsNumber()
  totalSizeBytes: number;

  @ApiProperty({ description: 'Tamaño total en MB' })
  @IsNumber()
  totalSizeMB: number;

  @ApiProperty({ description: 'Archivos agrupados por tipo MIME' })
  @IsObject()
  filesByType: Record<string, number>;

  @ApiProperty({ description: 'Archivos agrupados por agente' })
  @IsObject()
  filesByAgent: Record<string, number>;

  @ApiProperty({ description: 'Fecha del último upload', required: false })
  @IsOptional()
  @IsDateString()
  lastUploadDate?: Date;

  @ApiProperty({
    description: 'Fecha del archivo más antiguo',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  oldestFileDate?: Date;

  @ApiProperty({ description: 'Tamaño promedio de archivo en bytes' })
  @IsNumber()
  averageFileSize: number;

  @ApiProperty({
    description: 'Porcentaje de uso del límite de almacenamiento',
  })
  @IsNumber()
  storageUsagePercentage: number;
}

export class StorageAlertDto {
  @ApiProperty({ description: 'ID del usuario' })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Tipo de alerta',
    enum: ['storage_limit', 'file_limit', 'quota_exceeded'],
  })
  @IsEnum(['storage_limit', 'file_limit', 'quota_exceeded'])
  type: 'storage_limit' | 'file_limit' | 'quota_exceeded';

  @ApiProperty({ description: 'Mensaje de la alerta' })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Severidad de la alerta',
    enum: ['warning', 'critical'],
  })
  @IsEnum(['warning', 'critical'])
  severity: 'warning' | 'critical';

  @ApiProperty({ description: 'Umbral que activó la alerta' })
  @IsNumber()
  threshold: number;

  @ApiProperty({ description: 'Valor actual que causó la alerta' })
  @IsNumber()
  currentValue: number;

  @ApiProperty({ description: 'Timestamp de cuando se generó la alerta' })
  @IsDateString()
  timestamp: Date;
}

export class TopUserDto {
  @ApiProperty({ description: 'ID del usuario' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Almacenamiento usado en MB' })
  @IsNumber()
  storageMB: number;

  @ApiProperty({ description: 'Número de archivos' })
  @IsNumber()
  fileCount: number;
}

export class StorageDistributionDto {
  @ApiProperty({ description: 'Rango de almacenamiento' })
  @IsString()
  range: string;

  @ApiProperty({ description: 'Número de usuarios en este rango' })
  @IsNumber()
  userCount: number;
}

export class RecentActivityDto {
  @ApiProperty({ description: 'ID del usuario' })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Acción realizada',
    enum: ['upload', 'delete'],
  })
  @IsEnum(['upload', 'delete'])
  action: 'upload' | 'delete';

  @ApiProperty({ description: 'Tamaño del archivo en bytes', required: false })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiProperty({ description: 'Timestamp de la actividad' })
  @IsDateString()
  timestamp: Date;
}

export class SystemStorageOverviewDto {
  @ApiProperty({ description: 'Número total de usuarios' })
  @IsNumber()
  totalUsers: number;

  @ApiProperty({ description: 'Número total de archivos' })
  @IsNumber()
  totalFiles: number;

  @ApiProperty({ description: 'Almacenamiento total en MB' })
  @IsNumber()
  totalStorageMB: number;

  @ApiProperty({ description: 'Promedio de almacenamiento por usuario en MB' })
  @IsNumber()
  averageStoragePerUser: number;

  @ApiProperty({
    description: 'Top usuarios por almacenamiento',
    type: [TopUserDto],
  })
  topUsers: TopUserDto[];

  @ApiProperty({
    description: 'Distribución de almacenamiento por rangos',
    type: [StorageDistributionDto],
  })
  storageDistribution: StorageDistributionDto[];

  @ApiProperty({
    description: 'Actividad reciente del sistema',
    type: [RecentActivityDto],
  })
  recentActivity: RecentActivityDto[];
}

export class UsageStatsByPeriodDto {
  @ApiProperty({ description: 'Período de tiempo' })
  @IsString()
  period: string;

  @ApiProperty({ description: 'Número de uploads en el período' })
  @IsNumber()
  uploads: number;

  @ApiProperty({ description: 'Tamaño total subido en MB' })
  @IsNumber()
  totalSizeMB: number;

  @ApiProperty({ description: 'Tamaño promedio de archivo en MB' })
  @IsNumber()
  averageFileSizeMB: number;

  @ApiProperty({ description: 'Archivos agrupados por tipo en el período' })
  @IsObject()
  filesByType: Record<string, number>;
}

export class AnalyticsHealthDto {
  @ApiProperty({
    description: 'Estado de salud del sistema',
    enum: ['healthy', 'degraded', 'unhealthy'],
  })
  @IsEnum(['healthy', 'degraded', 'unhealthy'])
  status: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({ description: 'Timestamp del check de salud' })
  @IsDateString()
  timestamp: Date;

  @ApiProperty({ description: 'Número de alertas activas' })
  @IsNumber()
  activeAlerts: number;

  @ApiProperty({ description: 'Número total de usuarios' })
  @IsNumber()
  totalUsers: number;

  @ApiProperty({ description: 'Mensaje descriptivo del estado' })
  @IsString()
  message: string;
}
