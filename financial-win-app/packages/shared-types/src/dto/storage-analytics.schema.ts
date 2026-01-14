/**
 * Storage Analytics DTOs - Zod Schemas
 * 
 * Single source of truth for storage analytics validation.
 * Types are generated from these schemas.
 */

import { z } from 'zod';

/**
 * User Storage Stats Schema
 */
export const userStorageStatsSchema = z.object({
  userId: z.string().uuid(),
  totalFiles: z.number().int().nonnegative(),
  totalSizeBytes: z.number().int().nonnegative(),
  totalSizeMB: z.number().nonnegative(),
  filesByType: z.record(z.string(), z.number().int().nonnegative()),
  filesByAgent: z.record(z.string(), z.number().int().nonnegative()).optional(),
  lastUploadDate: z.date().optional(),
  oldestFileDate: z.date().optional(),
  averageFileSize: z.number().int().nonnegative(),
  storageUsagePercentage: z.number().min(0).max(100),
});

/**
 * Storage Alert Schema
 */
export const storageAlertSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['storage_limit', 'file_limit', 'quota_exceeded']),
  message: z.string(),
  severity: z.enum(['warning', 'critical']),
  threshold: z.number().nonnegative(),
  currentValue: z.number().nonnegative(),
  timestamp: z.date(),
});

/**
 * Top User Schema
 */
export const topUserSchema = z.object({
  userId: z.string().uuid(),
  storageMB: z.number().nonnegative(),
  fileCount: z.number().int().nonnegative(),
});

/**
 * Storage Distribution Schema
 */
export const storageDistributionSchema = z.object({
  range: z.string(),
  userCount: z.number().int().nonnegative(),
});

/**
 * Recent Activity Schema
 */
export const recentActivitySchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['upload', 'delete']),
  fileSize: z.number().int().nonnegative().optional(),
  timestamp: z.date(),
});

/**
 * System Storage Overview Schema
 */
export const systemStorageOverviewSchema = z.object({
  totalUsers: z.number().int().nonnegative(),
  totalFiles: z.number().int().nonnegative(),
  totalStorageMB: z.number().nonnegative(),
  averageStoragePerUser: z.number().nonnegative(),
  topUsers: z.array(topUserSchema),
  storageDistribution: z.array(storageDistributionSchema),
  recentActivity: z.array(recentActivitySchema),
});

/**
 * Usage Stats by Period Schema
 */
export const usageStatsByPeriodSchema = z.object({
  period: z.string(),
  uploads: z.number().int().nonnegative(),
  totalSizeMB: z.number().nonnegative(),
  averageFileSizeMB: z.number().nonnegative(),
  filesByType: z.record(z.string(), z.number().int().nonnegative()),
});

/**
 * Analytics Health Schema
 */
export const analyticsHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.date(),
  activeAlerts: z.number().int().nonnegative(),
  totalUsers: z.number().int().nonnegative(),
  message: z.string(),
});

// Export types inferred from schemas
export type UserStorageStats = z.infer<typeof userStorageStatsSchema>;
export type StorageAlert = z.infer<typeof storageAlertSchema>;
export type TopUser = z.infer<typeof topUserSchema>;
export type StorageDistribution = z.infer<typeof storageDistributionSchema>;
export type RecentActivity = z.infer<typeof recentActivitySchema>;
export type SystemStorageOverview = z.infer<typeof systemStorageOverviewSchema>;
export type UsageStatsByPeriod = z.infer<typeof usageStatsByPeriodSchema>;
export type AnalyticsHealth = z.infer<typeof analyticsHealthSchema>;

