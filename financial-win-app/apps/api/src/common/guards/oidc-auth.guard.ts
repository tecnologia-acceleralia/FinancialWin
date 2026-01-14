import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import axios from 'axios';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  name: string;
  company_id: string;
  accessToken: string;
  idToken?: string;
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * OIDC Authentication Guard - Simplified "Dumb" Version
 *
 * This guard delegates ALL security logic to oidc-server's centralized validation endpoint.
 * Satellite modules should be "dumb" - they only call the central endpoint and use the result.
 *
 * This ensures:
 * - Single source of truth for security logic
 * - Consistent validation across all satellite modules
 * - Easy security updates (only need to update oidc-server)
 */
@Injectable()
export class OIDCAuthGuard implements CanActivate {
  private readonly logger = new Logger(OIDCAuthGuard.name);
  private readonly oidcIssuerUrl: string;
  private readonly clientId: string;
  private readonly validationTimeout: number = 5000; // 5 seconds

  constructor(private configService: ConfigService) {
    this.oidcIssuerUrl = this.configService.get<string>('oidc.issuerUrl') || '';
    this.clientId = this.configService.get<string>('oidc.clientId') || '';

    if (!this.oidcIssuerUrl) {
      this.logger.error(
        '❌ OIDC_ISSUER_URL not configured - token validation will fail'
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract token from request (cookie or Authorization header)
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      this.logger.warn('❌ [OIDCAuthGuard] No token found in request');
      throw new UnauthorizedException('Authentication required');
    }

    // Log token preview for debugging
    const tokenPreview =
      token.length > 40
        ? `${token.substring(0, 20)}...${token.substring(token.length - 20)}`
        : token.substring(0, 20);
    this.logger.debug(`🔐 [OIDCAuthGuard] Validating token: ${tokenPreview}`);

    try {
      // Call centralized validation endpoint in oidc-server
      // ALL security logic is handled there - this module is "dumb"
      const validationUrl = `${this.oidcIssuerUrl}/api/token/validate`;

      this.logger.debug(
        `🔍 [OIDCAuthGuard] Calling validation endpoint: ${validationUrl}`
      );

      const validationResponse = await axios.post(
        validationUrl,
        { token },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          params: {
            client_id: this.clientId, // Include client_id for access verification
          },
          timeout: this.validationTimeout,
        }
      );

      if (!validationResponse.data.valid) {
        this.logger.warn(
          `❌ [OIDCAuthGuard] Token validation failed: ${validationResponse.data.error}`
        );
        throw new UnauthorizedException(
          validationResponse.data.error || 'Token validation failed'
        );
      }

      const { user } = validationResponse.data;

      // Log successful validation with detailed company_id tracking
      // CRITICAL: Log company_id even in production for security debugging (it's not PII)
      this.logger.log(
        `✅ [OIDCAuthGuard] Token validated - User: ${process.env.NODE_ENV !== 'production' ? user.email : '[REDACTED]'}, Company ID: ${user.company_id}`
      );
      this.logger.debug(
        `🔍 [OIDCAuthGuard] Full user data from validation: ${JSON.stringify({ sub: user.sub, email: user.email, name: user.name, company_id: user.company_id })}`
      );

      // Assign user to request - all validation was done by oidc-server
      request.user = {
        sub: user.sub,
        email: user.email,
        name: user.name,
        company_id: user.company_id,
        accessToken: token, // Keep original token for reference
        idToken: undefined, // Not needed after validation
      } as AuthenticatedUser;

      return true;
    } catch (error: any) {
      // Handle axios errors (network, timeout, etc.)
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          this.logger.warn(
            `❌ [OIDCAuthGuard] Token validation failed (401): ${errorData.error || 'Unauthorized'}`
          );
          throw new UnauthorizedException(
            errorData.error || 'Invalid or expired token'
          );
        }

        if (status === 403) {
          this.logger.warn(
            `🚫 [OIDCAuthGuard] Access denied (403): ${errorData.error || 'Forbidden'}`
          );
          throw new ForbiddenException(
            errorData.error ||
              'Your company does not have access to this application. Please contact your administrator.'
          );
        }

        // Other HTTP errors
        this.logger.error(
          `❌ [OIDCAuthGuard] Validation endpoint returned error: ${status} - ${errorData.error || 'Unknown error'}`
        );
        throw new UnauthorizedException(
          `Token validation failed: ${errorData.error || 'Unknown error'}`
        );
      }

      // Network errors (timeout, connection refused, etc.)
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        this.logger.error(
          `❌ [OIDCAuthGuard] Cannot reach oidc-server validation endpoint: ${error.code}`
        );
        throw new UnauthorizedException(
          'Authentication service unavailable. Please try again later.'
        );
      }

      // Re-throw NestJS exceptions
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      // Unknown errors
      this.logger.error(
        `❌ [OIDCAuthGuard] Unexpected error during token validation: ${error.message}`,
        error.stack
      );
      throw new UnauthorizedException('Token validation failed');
    }
  }

  /**
   * Extract token from request (cookie or Authorization header)
   * This is the ONLY logic that remains in satellite modules
   */
  private extractTokenFromRequest(request: Request): string | null {
    // Check Authorization header first
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      this.logger.debug(
        '✅ [OIDCAuthGuard] Token found in Authorization header'
      );
      return token;
    }

    // Check cookies
    const cookieName = this.configService.get<string>('oidc.cookieName');
    if (!cookieName) {
      this.logger.error('❌ [OIDCAuthGuard] OIDC_COOKIE_NAME not configured');
      return null;
    }

    const cookieToken = request.cookies?.[cookieName];
    if (cookieToken) {
      this.logger.debug(
        `✅ [OIDCAuthGuard] Token found in cookie: ${cookieName}`
      );
      return cookieToken;
    }

    this.logger.warn(
      `❌ [OIDCAuthGuard] No token found. Authorization header: ${!!authHeader}, Cookie ${cookieName}: ${!!cookieToken}`
    );
    return null;
  }
}
