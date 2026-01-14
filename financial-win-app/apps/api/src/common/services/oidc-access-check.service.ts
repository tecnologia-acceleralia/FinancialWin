import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import axios from 'axios';

/**
 * Service to check company-client access in real-time
 * Uses PostgreSQL cache with 30-second TTL to balance security and performance
 * Fail-closed: denies access if verification fails (for security)
 */
@Injectable()
export class OIDCAccessCheckService {
  private readonly logger = new Logger(OIDCAccessCheckService.name);
  private readonly issuerUrl: string;
  private readonly clientId: string;
  private readonly cacheTtlSeconds = 30; // 30 seconds TTL

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource
  ) {
    this.issuerUrl = this.configService.get<string>('oidc.issuerUrl') || '';
    this.clientId = this.configService.get<string>('oidc.clientId') || '';

    if (!this.issuerUrl || !this.clientId) {
      this.logger.warn(
        'OIDC configuration incomplete. Access checks may fail.'
      );
    }
  }

  /**
   * Check if company has access to client (with caching)
   * Returns true if access is granted, false otherwise
   * Throws ForbiddenException if verification fails (fail-closed)
   */
  async checkCompanyClientAccess(
    companyId: string,
    clientId?: string
  ): Promise<boolean> {
    // Use provided clientId or default to configured clientId
    const targetClientId = clientId || this.clientId;

    if (!targetClientId) {
      this.logger.error(
        'No client_id provided and OIDC_CLIENT_ID not configured'
      );
      throw new ForbiddenException('Client ID not configured');
    }

    // Check cache first
    const cached = await this.getCachedAccess(companyId, targetClientId);
    if (cached !== null) {
      this.logger.debug(
        `Cache hit for company ${companyId} -> client ${targetClientId}: ${cached}`
      );
      return cached;
    }

    // Cache miss - verify with OIDC provider
    try {
      const hasAccess = await this.verifyAccessWithOIDCProvider(
        companyId,
        targetClientId
      );

      // Cache the result
      await this.setCachedAccess(companyId, targetClientId, hasAccess);

      this.logger.log(
        `Access check for company ${companyId} -> client ${targetClientId}: ${hasAccess}`
      );

      return hasAccess;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Access check failed for company ${companyId} -> client ${targetClientId}: ${errorMessage}`
      );

      // Fail-closed: deny access if verification fails
      throw new ForbiddenException(
        'Unable to verify access. Please contact administrator.'
      );
    }
  }

  /**
   * Verify access by querying OIDC provider admin API
   * This endpoint is accessible internally without authentication
   */
  private async verifyAccessWithOIDCProvider(
    companyId: string,
    clientId: string
  ): Promise<boolean> {
    try {
      // Query OIDC provider's internal check endpoint
      const response = await axios.get(`${this.issuerUrl}/admin/access/check`, {
        params: {
          company_id: companyId,
          client_id: clientId,
        },
        timeout: 5000, // 5 second timeout
        // No authentication needed - internal endpoint
      });

      const hasAccess = response.data?.hasAccess === true;

      // If access was revoked (hasAccess = false), clear cache immediately
      // This ensures immediate revocation even if cache hasn't expired
      if (!hasAccess) {
        await this.clearCache(companyId, clientId);
      }

      return hasAccess;
    } catch (error) {
      const axiosError = error as {
        response?: { status: number; data?: unknown };
        message?: string;
        code?: string;
      };

      // If OIDC provider returns 404, company doesn't have access
      if (axiosError.response?.status === 404) {
        // Clear cache immediately when access is confirmed as revoked
        await this.clearCache(companyId, clientId);
        return false;
      }

      // Network errors or timeouts - fail closed
      if (
        axiosError.code === 'ECONNREFUSED' ||
        axiosError.code === 'ETIMEDOUT'
      ) {
        this.logger.error(
          `OIDC provider unavailable: ${axiosError.code}. Denying access (fail-closed).`
        );
        throw new Error('OIDC provider unavailable');
      }

      // For other errors, log and rethrow
      this.logger.error(
        `Error verifying access with OIDC provider: ${axiosError.message}`
      );
      throw error;
    }
  }

  /**
   * Get cached access result
   * Returns null if cache miss or expired
   */
  private async getCachedAccess(
    companyId: string,
    clientId: string
  ): Promise<boolean | null> {
    try {
      const result = await this.dataSource.query(
        `SELECT has_access, expires_at 
         FROM access_check_cache 
         WHERE company_id = $1 AND client_id = $2 AND expires_at > NOW()`,
        [companyId, clientId]
      );

      if (result.length === 0) {
        return null; // Cache miss
      }

      return result[0].has_access;
    } catch (error) {
      this.logger.warn(`Error reading cache: ${error}`);
      return null; // Treat cache errors as cache miss
    }
  }

  /**
   * Cache access result with TTL
   */
  private async setCachedAccess(
    companyId: string,
    clientId: string,
    hasAccess: boolean
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + this.cacheTtlSeconds);

      await this.dataSource.query(
        `INSERT INTO access_check_cache (company_id, client_id, has_access, expires_at, cached_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (company_id, client_id) 
         DO UPDATE SET 
           has_access = EXCLUDED.has_access,
           expires_at = EXCLUDED.expires_at,
           cached_at = NOW()`,
        [companyId, clientId, hasAccess, expiresAt]
      );
    } catch (error) {
      // Log but don't fail - cache is optional
      this.logger.warn(`Error caching access result: ${error}`);
    }
  }

  /**
   * Clear cache for a company-client pair
   * Useful when access is revoked
   */
  async clearCache(companyId: string, clientId: string): Promise<void> {
    try {
      await this.dataSource.query(
        `DELETE FROM access_check_cache WHERE company_id = $1 AND client_id = $2`,
        [companyId, clientId]
      );
    } catch (error) {
      this.logger.warn(`Error clearing cache: ${error}`);
    }
  }

  /**
   * Clear all cache entries for a company
   * Useful when all access is revoked for a company
   */
  async clearCompanyCache(companyId: string): Promise<void> {
    try {
      await this.dataSource.query(
        `DELETE FROM access_check_cache WHERE company_id = $1`,
        [companyId]
      );
    } catch (error) {
      this.logger.warn(`Error clearing company cache: ${error}`);
    }
  }

  /**
   * Clean up expired cache entries
   * Should be called periodically (e.g., via cron job)
   */
  async cleanupExpiredCache(): Promise<number> {
    try {
      const result = await this.dataSource.query(
        `DELETE FROM access_check_cache WHERE expires_at < NOW()`
      );
      return result.rowCount || 0;
    } catch (error) {
      this.logger.warn(`Error cleaning up expired cache: ${error}`);
      return 0;
    }
  }
}
