import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OIDCAccessCheckService } from '../services/oidc-access-check.service';

/**
 * Controller for handling cache invalidation webhooks from OIDC provider
 * This allows immediate cache clearing when access is revoked
 */
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private oidcAccessCheckService: OIDCAccessCheckService) {}

  /**
   * Webhook endpoint to invalidate access cache
   * Called by OIDC provider when access is revoked
   *
   * Expected payload:
   * {
   *   company_id: string,
   *   client_id?: string, // If omitted, clears all cache for company
   *   action: 'revoke_access' | 'revoke_all_access'
   * }
   */
  @Post('invalidate-access-cache')
  @HttpCode(HttpStatus.OK)
  async invalidateAccessCache(
    @Body()
    payload: {
      company_id: string;
      client_id?: string;
      action: 'revoke_access' | 'revoke_all_access';
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { company_id, client_id, action } = payload;

      if (!company_id) {
        return {
          success: false,
          message: 'company_id is required',
        };
      }

      if (action === 'revoke_all_access') {
        // Clear all cache for company
        await this.oidcAccessCheckService.clearCompanyCache(company_id);
        this.logger.log(
          `Cache cleared for all clients of company ${company_id}`
        );
        return {
          success: true,
          message: `Cache cleared for all clients of company ${company_id}`,
        };
      } else if (action === 'revoke_access' && client_id) {
        // Clear cache for specific client
        await this.oidcAccessCheckService.clearCache(company_id, client_id);
        this.logger.log(
          `Cache cleared for company ${company_id} -> client ${client_id}`
        );
        return {
          success: true,
          message: `Cache cleared for company ${company_id} -> client ${client_id}`,
        };
      } else {
        return {
          success: false,
          message: 'client_id is required for revoke_access action',
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error invalidating cache: ${errorMessage}`);
      return {
        success: false,
        message: `Error invalidating cache: ${errorMessage}`,
      };
    }
  }
}
