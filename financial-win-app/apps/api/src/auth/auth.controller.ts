import {
  Controller,
  Get,
  Res,
  Req,
  Query,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import axios from 'axios';
import { OIDCService } from '../common/services/oidc.service';
import { JwtService } from '@nestjs/jwt';
import { OIDCConfigValues } from '../common/config/oidc.config';
import { OIDCAccessCheckService } from '../common/services/oidc-access-check.service';

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge?: number;
  domain?: string;
  path?: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly oidcConfig: OIDCConfigValues;

  constructor(
    private oidcService: OIDCService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private oidcAccessCheckService: OIDCAccessCheckService
  ) {
    const config = this.configService.get<OIDCConfigValues>('oidc');
    if (!config) {
      throw new Error('❌ FATAL: OIDC configuration not found');
    }
    this.oidcConfig = config;
  }

  @Get('login')
  @ApiOperation({ summary: 'Iniciar flujo de autenticación OIDC' })
  @ApiResponse({ status: 302, description: 'Redirige a OIDC provider' })
  async login(@Res() res: Response) {
    this.logger.log('=== 🔐 AUTH LOGIN STARTED ===');

    const state = this.generateState();
    this.logger.log(`Generated state: ${state}`);

    const authUrl = this.oidcService.getAuthUrl(state);
    this.logger.log(`OIDC Auth URL: ${authUrl}`);

    // Store state in cookie for CSRF protection
    // CRITICAL: Use same cookie options as session cookie to ensure proper cleanup
    const stateCookieOptions: CookieOptions = {
      httpOnly: true,
      secure: this.oidcConfig.cookieSecure,
      sameSite: this.oidcConfig.cookieSameSite,
      maxAge: 10 * 60 * 1000, // 10 minutes
    };

    // Use same domain as session cookie for consistency
    if (
      this.oidcConfig.cookieDomain &&
      this.oidcConfig.cookieDomain.trim() !== ''
    ) {
      stateCookieOptions.domain = this.oidcConfig.cookieDomain;
    }

    // CRITICAL: oidc_state must be available in all routes, not just /api
    // The callback is at /auth/callback which is not under /api
    // So we use path=/ to ensure the cookie is sent back to the callback
    stateCookieOptions.path = '/';

    res.cookie('oidc_state', state, stateCookieOptions);

    this.logger.log(`State cookie set: oidc_state=${state}`);
    this.logger.log('Redirecting to OIDC Provider...');

    return res.redirect(authUrl);
  }

  @Get('callback')
  @ApiOperation({ summary: 'Callback OIDC desde provider' })
  @ApiResponse({ status: 302, description: 'Redirige a frontend' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    this.logger.log('=== 🔄 AUTH CALLBACK STARTED ===');
    this.logger.log(`Code received: ${code?.substring(0, 20)}...`);
    this.logger.log(`State received: ${state}`);

    try {
      // Get state from cookie for CSRF protection
      const storedState = req.cookies?.oidc_state;
      this.logger.log(`Stored state from cookie: ${storedState}`);

      if (!storedState || storedState !== state) {
        this.logger.error(
          `❌ State mismatch! Expected: ${storedState}, Got: ${state}`
        );
        return res.redirect(
          `${this.oidcConfig.postLogoutRedirectUri}?error=invalid_state`
        );
      }

      this.logger.log('✅ State validation passed');

      // Verify callback code
      this.logger.log('🔐 Exchanging code for tokens...');
      const tokenSet = await this.oidcService.handleCallback(code, state);
      this.logger.log('✅ Tokens received from OIDC');

      // CRITICAL: Log refresh_token presence for debugging and validation
      if (tokenSet.refresh_token) {
        this.logger.log(
          `✅ Refresh token received (length: ${tokenSet.refresh_token.length}) - refresh functionality available`
        );
      } else {
        this.logger.warn(
          '⚠️ WARNING: No refresh_token received in token exchange. Refresh functionality will not be available.'
        );
        this.logger.warn(
          '   Verify that: 1) offline_access is in OIDC_SCOPES, 2) offline_access is in client allowed_scopes, 3) refresh_token is in client grant_types'
        );
      }

      // Get user info from id_token JWT
      this.logger.log('👤 Extracting user info from id_token...');
      const userInfo = this.oidcService.getUserInfoFromIdToken(
        tokenSet.id_token
      );
      this.logger.log(`✅ User authenticated: ${userInfo.email}`);
      this.logger.log(`   Name: ${userInfo.name}`);
      this.logger.log(`   Sub: ${userInfo.sub}`);
      // CRITICAL: Don't log company_id in production (privacy/compliance)
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`   Company: ${userInfo.company_id}`);
      } else {
        this.logger.log(`   Company: [REDACTED]`);
      }

      // CRITICAL: Check company access BEFORE generating token and redirecting
      const clientId = this.configService.get<string>('oidc.clientId');
      const hasAccess =
        await this.oidcAccessCheckService.checkCompanyClientAccess(
          userInfo.company_id,
          clientId
        );

      if (!hasAccess) {
        this.logger.warn(
          `🚫 Access revoked for company ${userInfo.company_id} to client ${clientId} - Redirecting to login with error`
        );

        // Clear state cookie with same options
        const stateCookieClearOptions: CookieOptions = {
          httpOnly: true,
          secure: this.oidcConfig.cookieSecure,
          sameSite: this.oidcConfig.cookieSameSite,
        };

        if (
          this.oidcConfig.cookieDomain &&
          this.oidcConfig.cookieDomain.trim() !== ''
        ) {
          stateCookieClearOptions.domain = this.oidcConfig.cookieDomain;
        }

        // Use path=/ to match how the cookie was set
        stateCookieClearOptions.path = '/';

        res.clearCookie('oidc_state', stateCookieClearOptions);

        // Redirect to frontend with error parameter instead of token
        const redirectUrl = `${this.oidcConfig.postLogoutRedirectUri}?error=access_revoked`;
        this.logger.log(
          `🔄 Redirecting to frontend with error: ${redirectUrl}`
        );
        return res.redirect(redirectUrl);
      }

      // Generate internal session token
      this.logger.log('🎫 Generating internal JWT token...');

      // Verify JWT_SECRET is configured before signing
      const jwtSecret =
        this.configService.get<string>('JWT_SECRET') ||
        this.configService.get<string>('app.jwtSecret') ||
        process.env.JWT_SECRET;

      if (!jwtSecret || jwtSecret.trim() === '') {
        this.logger.error(
          '❌ FATAL: JWT_SECRET is not configured - cannot generate session token'
        );
        return res.status(500).json({ error: 'Server configuration error' });
      }

      this.logger.debug(
        `🔐 Using JWT_SECRET (length: ${jwtSecret.length}, preview: ${jwtSecret.substring(0, 10)}...${jwtSecret.substring(jwtSecret.length - 4)})`
      );

      const sessionToken = this.jwtService.sign({
        sub: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        company_id: userInfo.company_id,
        id_token: tokenSet.id_token,
        access_token: tokenSet.access_token,
        refresh_token: tokenSet.refresh_token,
      });

      // Verify token can be decoded (basic validation)
      try {
        const decoded = this.jwtService.decode(sessionToken);
        if (decoded) {
          this.logger.log(
            `✅ JWT token generated successfully (length: ${sessionToken.length}, user: ${userInfo.email}, company: ${userInfo.company_id})`
          );
        }
      } catch (error) {
        this.logger.error(
          '❌ Failed to decode generated token - this should not happen',
          error
        );
      }

      // Verify token contains correct company_id
      const decodedToken = this.jwtService.decode(sessionToken);
      if (decodedToken.company_id !== userInfo.company_id) {
        this.logger.error(
          `❌ SECURITY ISSUE: Token company_id mismatch! Expected: ${process.env.NODE_ENV !== 'production' ? userInfo.company_id : '[REDACTED]'}, Got: ${process.env.NODE_ENV !== 'production' ? decodedToken.company_id : '[REDACTED]'}`
        );
        throw new Error('Token generation failed: company_id mismatch');
      }
      this.logger.log(
        `✅ Token validation passed - company_id: ${process.env.NODE_ENV !== 'production' ? decodedToken.company_id : '[REDACTED]'}`
      );

      // Clear state cookie with same options used to set it
      const stateCookieClearOptions: CookieOptions = {
        httpOnly: true,
        secure: this.oidcConfig.cookieSecure,
        sameSite: this.oidcConfig.cookieSameSite,
      };

      if (
        this.oidcConfig.cookieDomain &&
        this.oidcConfig.cookieDomain.trim() !== ''
      ) {
        stateCookieClearOptions.domain = this.oidcConfig.cookieDomain;
      }

      // Use path=/ to match how the cookie was set
      stateCookieClearOptions.path = '/';

      res.clearCookie('oidc_state', stateCookieClearOptions);
      this.logger.log('🧹 State cookie cleared');

      // Build cookie configuration
      const cookieOptions: CookieOptions = {
        httpOnly: true,
        secure: this.oidcConfig.cookieSecure,
        sameSite: this.oidcConfig.cookieSameSite,
        maxAge: this.oidcConfig.cookieMaxAge || 7 * 24 * 60 * 60 * 1000, // Default: 7 days, or use configured value
      };

      // CRITICAL: Only set domain if explicitly configured (don't default to shared domain)
      // This prevents cookie sharing between subdomains and ensures multi-tenant isolation
      if (
        this.oidcConfig.cookieDomain &&
        this.oidcConfig.cookieDomain.trim() !== ''
      ) {
        cookieOptions.domain = this.oidcConfig.cookieDomain;
        this.logger.log(
          `🍪 Cookie domain configured: ${this.oidcConfig.cookieDomain}`
        );
        this.logger.warn(
          '⚠️ Cookie domain is set - ensure this is required for subdomain sharing'
        );
      } else {
        this.logger.debug(
          '🍪 Cookie domain NOT set - using default (same origin only) - ✅ SECURE for multi-tenant'
        );
      }

      // Set path if configured
      // NOTE: In development, auth routes are at /auth (not /api/auth)
      // So we use path=/ to ensure cookies work for both /api and /auth routes
      // In production, if all routes are under /api, you can use path=/api
      if (this.oidcConfig.cookiePath && process.env.NODE_ENV === 'production') {
        cookieOptions.path = this.oidcConfig.cookiePath;
        this.logger.log(
          `🍪 Cookie path configured: ${this.oidcConfig.cookiePath}`
        );
      } else {
        // Development: use path=/ to support both /api and /auth routes
        cookieOptions.path = '/';
        this.logger.log(
          `🍪 Cookie path set to / (development mode - supports /api and /auth routes)`
        );
      }

      // Log cookie configuration for debugging and security auditing
      const maxAgeMs = cookieOptions.maxAge ?? 0;
      this.logger.log(
        `🍪 Cookie configuration - httpOnly: ${cookieOptions.httpOnly}, secure: ${cookieOptions.secure}, sameSite: ${cookieOptions.sameSite}, domain: ${cookieOptions.domain || 'not set (secure)'}, path: ${cookieOptions.path || 'default'}, maxAge: ${maxAgeMs}ms (${Math.round(maxAgeMs / 60000)} minutes)`
      );
      // CRITICAL DEBUG: Log exact cookie parameters before setting
      this.logger.log(`🔍 [CALLBACK] Setting cookie with exact parameters:`, {
        cookieName: this.oidcConfig.cookieName,
        cookiePath: cookieOptions.path,
        cookieDomain: cookieOptions.domain || 'not set',
        cookieSecure: cookieOptions.secure,
        cookieSameSite: cookieOptions.sameSite,
        cookieHttpOnly: cookieOptions.httpOnly,
        cookieMaxAge: cookieOptions.maxAge,
        tokenLength: sessionToken.length,
        tokenPreview: `${sessionToken.substring(0, 20)}...${sessionToken.substring(sessionToken.length - 20)}`,
        nodeEnv: process.env.NODE_ENV,
        cookiePathConfig: this.oidcConfig.cookiePath,
      });

      // Set session cookie with JWT token
      res.cookie(this.oidcConfig.cookieName, sessionToken, cookieOptions);
      this.logger.log(
        `🍪 Session cookie set: ${this.oidcConfig.cookieName} (length: ${sessionToken.length})`
      );
      // CRITICAL DEBUG: Verify cookie was set in response headers
      const setCookieHeader = res.getHeader('Set-Cookie');
      if (setCookieHeader) {
        this.logger.log(
          `✅ [CALLBACK] Set-Cookie header present in response:`,
          Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
        );
      } else {
        this.logger.error(
          `❌ [CALLBACK] Set-Cookie header NOT present in response - cookie may not be set!`
        );
      }

      // Redirect to frontend (cookie is set, token in URL is optional for frontend)
      const redirectUrl = `${this.oidcConfig.postLogoutRedirectUri}/?token=${sessionToken}`;
      this.logger.log(
        `🔄 Redirecting to frontend: ${redirectUrl.substring(0, 60)}...`
      );
      return res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('❌ AUTH CALLBACK FAILED', error);
      this.logger.error(`Error details: ${error.message}`);
      this.logger.error(`Stack trace: ${error.stack}`);
      return res.redirect(
        `${this.oidcConfig.postLogoutRedirectUri}?error=auth_failed`
      );
    }
  }

  @Get('refresh')
  @ApiOperation({ summary: 'Refresh session token and validate company_id' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @ApiResponse({
    status: 403,
    description: 'Company ID changed or access revoked',
  })
  async refresh(@Req() req: Request, @Res() res: Response) {
    this.logger.log('=== 🔄 AUTH REFRESH STARTED ===');
    this.logger.log(`🔍 Cookie name: ${this.oidcConfig.cookieName}`);
    this.logger.log(
      `🔍 Available cookies: ${req.cookies ? Object.keys(req.cookies).join(', ') : 'none'}`
    );
    this.logger.log(`🔍 Request path: ${req.path}`);
    this.logger.log(`🔍 Request URL: ${req.url}`);

    const token = req.cookies?.[this.oidcConfig.cookieName];

    if (!token) {
      this.logger.warn('❌ Refresh failed - No token found in cookie');
      this.logger.warn(
        `   Cookie name expected: ${this.oidcConfig.cookieName}`
      );
      this.logger.warn(
        `   Available cookies: ${req.cookies ? JSON.stringify(Object.keys(req.cookies)) : 'none'}`
      );
      return res.status(401).json({ error: 'No authentication token found' });
    }

    this.logger.log(`✅ Token found in cookie (length: ${token.length})`);

    try {
      // CRITICAL: Validate token using centralized endpoint before proceeding
      // This ensures token signature, expiration, and company access are all validated
      this.logger.log(
        '🔍 Validating token with centralized endpoint before refresh...'
      );

      try {
        const validationUrl = `${this.oidcConfig.issuerUrl}/api/token/validate`;
        const validationResponse = await axios.post(
          validationUrl,
          { token },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            params: {
              client_id: this.oidcConfig.clientId,
            },
            timeout: 5000, // 5 seconds timeout
          }
        );

        if (!validationResponse.data.valid) {
          this.logger.warn(
            `❌ Token validation failed before refresh: ${validationResponse.data.error}`
          );
          const cookieOptions = this.buildCookieOptions();
          res.clearCookie(this.oidcConfig.cookieName, cookieOptions);
          return res.status(401).json({
            error: validationResponse.data.error || 'Token validation failed',
          });
        }

        this.logger.log(
          `✅ Token validated - User: ${process.env.NODE_ENV !== 'production' ? validationResponse.data.user.email : '[REDACTED]'}, Company ID: ${process.env.NODE_ENV !== 'production' ? validationResponse.data.user.company_id : '[REDACTED]'}`
        );
      } catch (validationError: unknown) {
        // Handle validation endpoint errors
        const axiosError = validationError as {
          response?: { status?: number; data?: { error?: string } };
          code?: string;
          message?: string;
        };
        if (axiosError.response) {
          const status = axiosError.response.status;
          if (status === 401 || status === 403) {
            this.logger.warn(
              `❌ Token validation failed (${status}): ${axiosError.response.data?.error || 'Unauthorized'}`
            );
            const cookieOptions = this.buildCookieOptions();
            res.clearCookie(this.oidcConfig.cookieName, cookieOptions);
            return res.status(status).json({
              error:
                axiosError.response.data?.error || 'Token validation failed',
            });
          }
        }

        // Network errors - FAIL CLOSED: Deny refresh if validation endpoint is unavailable
        // This prevents bypass of security validation if oidc-server is down
        if (
          axiosError.code === 'ECONNREFUSED' ||
          axiosError.code === 'ETIMEDOUT'
        ) {
          this.logger.error(
            `❌ Cannot reach validation endpoint: ${axiosError.code}. Denying refresh (fail-closed security policy).`
          );
          const cookieOptions = this.buildCookieOptions();
          res.clearCookie(this.oidcConfig.cookieName, cookieOptions);
          return res.status(503).json({
            error:
              'Authentication service unavailable. Please try again later.',
            service_unavailable: true,
          });
        } else {
          this.logger.error(
            `❌ Unexpected error during token validation: ${axiosError.message || 'Unknown error'}`
          );
          // Fail closed - deny refresh if validation fails unexpectedly
          const cookieOptions = this.buildCookieOptions();
          res.clearCookie(this.oidcConfig.cookieName, cookieOptions);
          return res.status(401).json({
            error: 'Token validation failed',
          });
        }
      }

      // Decode current token to get user info
      const currentPayload = this.jwtService.decode(token);

      if (!currentPayload?.sub || !currentPayload.company_id) {
        this.logger.error('❌ Refresh failed - Invalid token payload');
        return res.status(401).json({ error: 'Invalid token' });
      }

      this.logger.log(
        `🔍 Current token - User: ${process.env.NODE_ENV !== 'production' ? currentPayload.email : '[REDACTED]'}, Company ID: ${process.env.NODE_ENV !== 'production' ? currentPayload.company_id : '[REDACTED]'}`
      );

      // Check if token is expiring soon
      const refreshWindow =
        this.oidcConfig.tokenRefreshWindow || 30 * 60 * 1000; // Default: 30 minutes
      const expiresAt = currentPayload.exp
        ? currentPayload.exp * 1000
        : Date.now() + 24 * 60 * 60 * 1000;
      const timeUntilExpiry = expiresAt - Date.now();

      if (timeUntilExpiry > refreshWindow) {
        this.logger.log(
          `ℹ️ Token not expiring soon (${Math.round(timeUntilExpiry / 60000)} minutes remaining) - refresh not needed`
        );
        // Token is still valid, return current token info
        return res.json({
          refreshed: false,
          expiresAt: new Date(expiresAt).toISOString(),
          timeUntilExpiry: Math.round(timeUntilExpiry / 1000), // seconds
        });
      }

      this.logger.log(
        `⏰ Token expiring soon (${Math.round(timeUntilExpiry / 60000)} minutes remaining) - refreshing...`
      );

      // CRITICAL: Re-fetch user info from OIDC provider to validate company_id hasn't changed
      if (!currentPayload.refresh_token) {
        this.logger.error(
          '❌ Refresh failed - No refresh_token in current token'
        );
        return res.status(401).json({ error: 'Refresh token not available' });
      }

      // Refresh tokens from OIDC provider
      this.logger.log('🔐 Refreshing tokens from OIDC provider...');
      const tokenSet = await this.oidcService.refreshTokens(
        currentPayload.refresh_token
      );

      // Get fresh user info from id_token
      const freshUserInfo = this.oidcService.getUserInfoFromIdToken(
        tokenSet.id_token
      );

      this.logger.log(
        `✅ Fresh user info - Company ID: ${process.env.NODE_ENV !== 'production' ? freshUserInfo.company_id : '[REDACTED]'}`
      );

      // CRITICAL: Validate company_id hasn't changed
      if (freshUserInfo.company_id !== currentPayload.company_id) {
        this.logger.error(
          `❌ SECURITY ALERT: Company ID changed! Old: ${process.env.NODE_ENV !== 'production' ? currentPayload.company_id : '[REDACTED]'}, New: ${process.env.NODE_ENV !== 'production' ? freshUserInfo.company_id : '[REDACTED]'}`
        );
        // Clear cookie and force re-authentication
        const cookieOptions = this.buildCookieOptions();
        res.clearCookie(this.oidcConfig.cookieName, cookieOptions);
        return res.status(403).json({
          error: 'Company ID changed - re-authentication required',
          company_id_changed: true,
        });
      }

      // Verify company still has access to client
      const clientId = this.oidcConfig.clientId;
      const hasAccess =
        await this.oidcAccessCheckService.checkCompanyClientAccess(
          freshUserInfo.company_id,
          clientId
        );

      if (!hasAccess) {
        this.logger.warn(
          `🚫 Access revoked for company ${freshUserInfo.company_id} to client ${clientId}`
        );
        const cookieOptions = this.buildCookieOptions();
        res.clearCookie(this.oidcConfig.cookieName, cookieOptions);
        return res.status(403).json({
          error: 'Access revoked - re-authentication required',
          access_revoked: true,
        });
      }

      // Generate new session token with fresh user info
      const newSessionToken = this.jwtService.sign({
        sub: freshUserInfo.sub,
        email: freshUserInfo.email,
        name: freshUserInfo.name,
        company_id: freshUserInfo.company_id,
        id_token: tokenSet.id_token,
        access_token: tokenSet.access_token,
        refresh_token: tokenSet.refresh_token,
      });

      // Verify new token contains correct company_id
      const decodedNewToken = this.jwtService.decode(newSessionToken);
      if (decodedNewToken.company_id !== freshUserInfo.company_id) {
        this.logger.error(
          `❌ SECURITY ISSUE: New token company_id mismatch! Expected: ${process.env.NODE_ENV !== 'production' ? freshUserInfo.company_id : '[REDACTED]'}, Got: ${process.env.NODE_ENV !== 'production' ? decodedNewToken.company_id : '[REDACTED]'}`
        );
        throw new Error('Token generation failed: company_id mismatch');
      }

      this.logger.log(
        `✅ New token generated - Company ID: ${process.env.NODE_ENV !== 'production' ? decodedNewToken.company_id : '[REDACTED]'}`
      );

      // Build cookie configuration (same as login)
      const cookieOptions: CookieOptions = {
        httpOnly: true,
        secure: this.oidcConfig.cookieSecure,
        sameSite: this.oidcConfig.cookieSameSite,
        maxAge: this.oidcConfig.cookieMaxAge || 7 * 24 * 60 * 60 * 1000, // Default: 7 days
      };

      if (
        this.oidcConfig.cookieDomain &&
        this.oidcConfig.cookieDomain.trim() !== ''
      ) {
        cookieOptions.domain = this.oidcConfig.cookieDomain;
      }

      if (this.oidcConfig.cookiePath) {
        cookieOptions.path = this.oidcConfig.cookiePath;
      }

      // Set new session cookie
      res.cookie(this.oidcConfig.cookieName, newSessionToken, cookieOptions);
      this.logger.log(
        `🍪 New session cookie set: ${this.oidcConfig.cookieName}`
      );

      return res.json({
        refreshed: true,
        expiresAt: new Date(
          Date.now() + (this.oidcConfig.cookieMaxAge || 7 * 24 * 60 * 60 * 1000)
        ).toISOString(),
        timeUntilExpiry: Math.round(
          (this.oidcConfig.cookieMaxAge || 7 * 24 * 60 * 60 * 1000) / 1000
        ), // seconds
      });
    } catch (error) {
      this.logger.error('❌ AUTH REFRESH FAILED', error);
      this.logger.error(`Error details: ${error.message}`);
      return res.status(500).json({ error: 'Token refresh failed' });
    }
  }

  @Get('logout')
  @ApiOperation({ summary: 'Cerrar sesión y redirigir a OIDC provider' })
  @ApiResponse({ status: 302, description: 'Redirige a OIDC logout' })
  async logout(@Req() req: Request, @Res() res: Response) {
    this.logger.log('=== 🚪 LOGOUT STARTED ===');

    // Extract token and user info for logging (before clearing cookies)
    const token = req.cookies?.[this.oidcConfig.cookieName];
    let idToken: string | undefined = undefined;
    let userEmail: string | undefined = undefined;
    let userCompanyId: string | undefined = undefined;

    if (token) {
      try {
        const payload = this.jwtService.decode(token);
        idToken = payload?.id_token;
        userEmail = payload.email;
        userCompanyId = payload.company_id;

        if (process.env.NODE_ENV !== 'production') {
          this.logger.log(
            `👤 Logging out user: ${userEmail}, Company ID: ${userCompanyId}`
          );
        } else {
          this.logger.log('👤 Logging out user (info redacted in production)');
        }
      } catch (error) {
        this.logger.warn('Could not extract token info for logout', error);
      }
    } else {
      this.logger.warn('⚠️ No session token found in cookies during logout');
    }

    // CRITICAL: Clear cookies with multiple strategies to ensure they are deleted
    // Express clearCookie requires exact same domain and path that was used to set the cookie
    // We try multiple combinations to ensure cookies are cleared regardless of how they were set

    const cookieOptions = this.buildCookieOptions();

    // Strategy 1: Clear with configured domain/path (if they were set)
    this.logger.log(
      `🧹 Clearing cookies with options - domain: ${cookieOptions.domain || 'not set'}, path: ${cookieOptions.path || 'default'}`
    );

    // Clear session cookie with configured options
    res.clearCookie(this.oidcConfig.cookieName, cookieOptions);

    // Clear state cookie - use path=/ to match how it was set
    const stateCookieClearOptions = {
      ...cookieOptions,
      path: '/', // oidc_state is always set with path=/
    };
    res.clearCookie('oidc_state', stateCookieClearOptions);

    // Strategy 2: Also clear without domain/path (in case cookie was set without them)
    // This handles the case where oidc_state was set without domain/path in login()
    res.clearCookie(this.oidcConfig.cookieName, {
      httpOnly: true,
      secure: this.oidcConfig.cookieSecure,
      sameSite: this.oidcConfig.cookieSameSite,
    });

    res.clearCookie('oidc_state', {
      httpOnly: true,
      secure: this.oidcConfig.cookieSecure,
      sameSite: this.oidcConfig.cookieSameSite,
      path: '/', // oidc_state is always set with path=/
    });

    // Strategy 3: If domain/path are configured, also try clearing with empty values
    // This handles edge cases where cookies might have been set differently
    if (cookieOptions.domain || cookieOptions.path) {
      const minimalOptions: CookieOptions = {
        httpOnly: true,
        secure: this.oidcConfig.cookieSecure,
        sameSite: this.oidcConfig.cookieSameSite,
      };

      // Try with domain but no path
      if (cookieOptions.domain) {
        res.clearCookie(this.oidcConfig.cookieName, {
          ...minimalOptions,
          domain: cookieOptions.domain,
        });
        res.clearCookie('oidc_state', {
          ...minimalOptions,
          domain: cookieOptions.domain,
          path: '/', // oidc_state is always set with path=/
        });
      }

      // Try with path but no domain (for session cookie only)
      // Note: oidc_state always uses path=/, so we don't need to try cookieOptions.path for it
      if (cookieOptions.path) {
        res.clearCookie(this.oidcConfig.cookieName, {
          ...minimalOptions,
          path: cookieOptions.path,
        });
        // Also clear oidc_state with path=/ (its actual path)
        res.clearCookie('oidc_state', {
          ...minimalOptions,
          path: '/',
        });
      }
    }

    this.logger.log(
      `✅ Cookies cleared - Session cookie: ${this.oidcConfig.cookieName}, State cookie: oidc_state`
    );
    this.logger.log(
      `🍪 Cookie configuration used - domain: ${cookieOptions.domain || 'not set (secure)'}, path: ${cookieOptions.path || 'default'}`
    );

    // Redirect to OIDC logout
    const logoutUrl = this.oidcService.getLogoutUrl(idToken);
    this.logger.log(`🔄 Redirecting to OIDC logout: ${logoutUrl}`);
    return res.redirect(logoutUrl);
  }

  @Get('me')
  @ApiOperation({ summary: 'Obtener información del usuario actual' })
  @ApiResponse({ status: 200, description: 'Usuario autenticado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Acceso revocado' })
  async getCurrentUser(@Req() req: Request) {
    this.logger.log('🔍 GET /auth/me - Checking authentication');

    // Try to get token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.cookies?.[this.oidcConfig.cookieName];

    if (!token) {
      this.logger.log('❌ No token found');
      return { authenticated: false };
    }

    this.logger.log('✅ Token found');

    try {
      const payload = this.jwtService.decode(token);

      // Validate required fields
      if (!payload?.company_id) {
        this.logger.warn('❌ Invalid token payload - missing company_id');
        return { authenticated: false };
      }

      // CRITICAL: Verify company has access to this client application
      // This prevents users with revoked access from being authenticated
      try {
        const clientId = this.configService.get<string>('oidc.clientId');
        const hasAccess =
          await this.oidcAccessCheckService.checkCompanyClientAccess(
            payload.company_id,
            clientId
          );

        if (!hasAccess) {
          this.logger.warn(
            `🚫 Access revoked for company ${payload.company_id} to client ${clientId}`
          );
          throw new ForbiddenException(
            'Your company does not have access to this application. Please contact your administrator.'
          );
        }
      } catch (error) {
        // Re-throw ForbiddenException to trigger 403 response
        if (error instanceof ForbiddenException) {
          throw error;
        }
        // For other errors, log and deny access (fail-closed)
        this.logger.error(
          `Error checking access: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        throw new ForbiddenException(
          'Unable to verify access. Please contact administrator.'
        );
      }

      // User is authenticated and has access
      return {
        authenticated: true,
        user: {
          sub: payload.sub,
          email: payload.email,
          name: payload.name,
          company_id: payload.company_id,
        },
      };
    } catch (error) {
      // Re-throw ForbiddenException (403)
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // For other errors, return not authenticated
      this.logger.warn('❌ Token decode failed');
      return { authenticated: false };
    }
  }

  private generateState(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Build cookie options for setting/clearing cookies
   * CRITICAL: Must use same domain and path when clearing as when setting
   * This ensures cookies are properly deleted and prevents cookie sharing issues
   */
  private buildCookieOptions(): CookieOptions {
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: this.oidcConfig.cookieSecure,
      sameSite: this.oidcConfig.cookieSameSite,
    };

    // Use same domain and path as when setting the cookie
    // CRITICAL: Must match the logic in callback() method
    if (
      this.oidcConfig.cookieDomain &&
      this.oidcConfig.cookieDomain.trim() !== ''
    ) {
      cookieOptions.domain = this.oidcConfig.cookieDomain;
    }

    // Set path if configured - must match callback() logic
    // In development, use path=/ to support both /api and /auth routes
    // In production, use configured path if available
    if (this.oidcConfig.cookiePath && process.env.NODE_ENV === 'production') {
      cookieOptions.path = this.oidcConfig.cookiePath;
    } else {
      // Development: use path=/ to support both /api and /auth routes
      cookieOptions.path = '/';
    }

    return cookieOptions;
  }

  @Get('debug')
  @ApiOperation({
    summary:
      'Debug endpoint - Returns current user info (only if ENABLE_DEBUG_ENDPOINT=true)',
  })
  @ApiResponse({ status: 200, description: 'Debug information' })
  @ApiResponse({ status: 403, description: 'Debug endpoint disabled' })
  async debug(@Req() req: Request) {
    // Only enable if explicitly set
    if (process.env.ENABLE_DEBUG_ENDPOINT !== 'true') {
      this.logger.warn('Debug endpoint accessed but disabled');
      throw new ForbiddenException('Debug endpoint is disabled');
    }

    this.logger.log('🔍 [DEBUG] Debug endpoint accessed');

    const cookieName = this.oidcConfig.cookieName;
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.substring(7)
      : req.cookies?.[cookieName];

    interface DebugInfo {
      timestamp: string;
      hasToken: boolean;
      tokenPreview: string | null;
      cookieName: string;
      availableCookies: string[];
      hasRequestUser: boolean;
      tokenPayload?: {
        sub?: string;
        email?: string;
        name?: string;
        company_id?: string;
        exp?: number;
        iat?: number;
        claims: string[];
      };
      tokenDecodeError?: string;
      requestUser?: {
        sub: string;
        email: string;
        name: string;
        company_id: string;
      };
    }

    const debugInfo: DebugInfo = {
      timestamp: new Date().toISOString(),
      hasToken: !!token,
      tokenPreview: token
        ? token.length > 40
          ? `${token.substring(0, 20)}...${token.substring(token.length - 20)}`
          : token.substring(0, 20)
        : null,
      cookieName,
      availableCookies: req.cookies ? Object.keys(req.cookies) : [],
      hasRequestUser: !!req.user,
    };

    if (token) {
      try {
        const decoded = this.jwtService.decode(token);
        debugInfo.tokenPayload = {
          sub: decoded?.sub as string | undefined,
          email: decoded?.email as string | undefined,
          name: decoded?.name as string | undefined,
          company_id: decoded?.company_id as string | undefined,
          exp: decoded?.exp as number | undefined,
          iat: decoded?.iat as number | undefined,
          claims: Object.keys(decoded || {}),
        };
      } catch (error) {
        debugInfo.tokenDecodeError =
          error instanceof Error ? error.message : 'Unknown error';
      }
    }

    if (req.user) {
      debugInfo.requestUser = {
        sub: req.user.sub,
        email: req.user.email,
        name: req.user.name,
        company_id: req.user.company_id,
      };
    }

    this.logger.log(
      `🔍 [DEBUG] Debug info: ${JSON.stringify(debugInfo, null, 2)}`
    );

    return {
      debug: true,
      ...debugInfo,
    };
  }
}
