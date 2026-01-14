import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';

export interface OIDCUser {
  sub: string;
  email: string;
  name: string;
  company_id: string;
}

export interface TokenSet {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

@Injectable()
export class OIDCService implements OnModuleInit {
  private readonly logger = new Logger(OIDCService.name);
  private issuerUrl: string; // URL interna (host.docker.internal) para llamadas HTTP
  private issuerPublicUrl: string; // URL pública (localhost) para redirects al navegador
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private postLogoutRedirectUri: string;
  private scopes: string;

  onModuleInit(): void {
    // Validate required environment variables
    const requiredEnvVars = {
      OIDC_ISSUER_URL: process.env.OIDC_ISSUER_URL,
      OIDC_PUBLIC_URL: process.env.OIDC_PUBLIC_URL,
      OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
      OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET,
      OIDC_REDIRECT_URI: process.env.OIDC_REDIRECT_URI,
      OIDC_POST_LOGOUT_REDIRECT_URI: process.env.OIDC_POST_LOGOUT_REDIRECT_URI,
      OIDC_SCOPES: process.env.OIDC_SCOPES,
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      const errorMessage = `❌ Missing required OIDC environment variables: ${missingVars.join(', ')}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    // After validation, we know these values are not undefined
    const issuerUrl = requiredEnvVars.OIDC_ISSUER_URL;
    const issuerPublicUrl = requiredEnvVars.OIDC_PUBLIC_URL;
    const clientId = requiredEnvVars.OIDC_CLIENT_ID;
    const clientSecret = requiredEnvVars.OIDC_CLIENT_SECRET;
    const redirectUri = requiredEnvVars.OIDC_REDIRECT_URI;
    const postLogoutRedirectUri = requiredEnvVars.OIDC_POST_LOGOUT_REDIRECT_URI;
    const scopes = requiredEnvVars.OIDC_SCOPES;

    if (
      !issuerUrl ||
      !issuerPublicUrl ||
      !clientId ||
      !clientSecret ||
      !redirectUri ||
      !postLogoutRedirectUri ||
      !scopes
    ) {
      // This should never happen due to validation above, but TypeScript needs it
      throw new Error('Missing required OIDC environment variables');
    }

    this.issuerUrl = issuerUrl;
    this.issuerPublicUrl = issuerPublicUrl;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.postLogoutRedirectUri = postLogoutRedirectUri;
    this.scopes = scopes;

    // CRITICAL: Validate that offline_access is included in scopes for refresh token support
    const scopesList = this.scopes.split(/\s+/).map(s => s.trim());
    if (!scopesList.includes('offline_access')) {
      this.logger.warn(
        '⚠️ WARNING: offline_access scope is not included in OIDC_SCOPES'
      );
      this.logger.warn(
        '   Refresh tokens will not be available. Add "offline_access" to OIDC_SCOPES.'
      );
      this.logger.warn(`   Current scopes: ${this.scopes}`);
    } else {
      this.logger.log(
        '✅ offline_access scope detected - refresh tokens will be available'
      );
    }

    this.logger.log('✅ OIDC service initialized');
    this.logger.log(`   Issuer URL (internal): ${this.issuerUrl}`);
    this.logger.log(`   Issuer URL (public): ${this.issuerPublicUrl}`);
    this.logger.log(`   Client ID: ${this.clientId}`);
    this.logger.log(`   Redirect URI: ${this.redirectUri}`);
    this.logger.log(`   Scopes: ${this.scopes}`);
  }

  /**
   * Generate authorization URL for OIDC login
   */
  getAuthUrl(state: string): string {
    this.logger.log(`🔗 Generating auth URL for state: ${state}`);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes,
      state,
    });

    // Use public URL for browser redirect
    const authUrl = `${this.issuerPublicUrl}/auth?${params.toString()}`;
    this.logger.log(`   Public URL for browser: ${authUrl}`);
    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async handleCallback(code: string, state: string): Promise<TokenSet> {
    this.logger.log('🔐 Starting token exchange...');
    this.logger.log(`   Code length: ${code?.length}`);
    this.logger.log(`   State: ${state}`);
    this.logger.log(`   Token endpoint: ${this.issuerUrl}/token`);

    try {
      const requestBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString();
      this.logger.log('   Sending token request to OIDC provider...');
      const tokenResponse = await axios.post(
        `${this.issuerUrl}/token`,
        requestBody,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      this.logger.log('✅ Token exchange successful');
      this.logger.log(
        `   Has access_token: ${!!tokenResponse.data.access_token}`
      );
      this.logger.log(`   Has id_token: ${!!tokenResponse.data.id_token}`);

      // CRITICAL: Log refresh_token presence for debugging
      const hasRefreshToken = !!tokenResponse.data.refresh_token;
      if (hasRefreshToken) {
        this.logger.log(
          '✅ Has refresh_token - refresh functionality will be available'
        );
      } else {
        this.logger.warn(
          '⚠️ WARNING: No refresh_token received. Check that offline_access is in OIDC_SCOPES and allowed in client configuration.'
        );
      }

      return tokenResponse.data as TokenSet;
    } catch (error) {
      const axiosError = error as {
        message?: string;
        code?: string;
        response?: {
          status: number;
          statusText: string;
          data: unknown;
          headers: Record<string, string>;
        };
        request?: unknown;
        config?: {
          url?: string;
          method?: string;
          data?: string;
        };
      };

      this.logger.error('❌ Token exchange failed');
      this.logger.error(
        `   Error type: ${axiosError?.constructor?.name || 'Unknown'}`
      );
      this.logger.error(`   Error message: ${axiosError?.message || 'N/A'}`);
      this.logger.error(`   Error code: ${axiosError?.code || 'N/A'}`);
      this.logger.error(`   Has response: ${!!axiosError?.response}`);
      if (axiosError?.response) {
        this.logger.error(`   Status: ${axiosError.response.status}`);
        this.logger.error(`   StatusText: ${axiosError.response.statusText}`);
        this.logger.error(
          `   Response data: ${JSON.stringify(axiosError.response.data)}`
        );
        this.logger.error(
          `   Response headers: ${JSON.stringify(axiosError.response.headers)}`
        );
      }
      if (axiosError?.request) {
        this.logger.error(`   Request URL: ${axiosError.config?.url}`);
        this.logger.error(`   Request method: ${axiosError.config?.method}`);
        this.logger.error(`   Request data: ${axiosError.config?.data}`);
      }
      this.logger.error(
        `   Full error: ${JSON.stringify(axiosError, null, 2)}`
      );
      throw error;
    }
  }

  /**
   * Get user information from id_token JWT
   */
  getUserInfoFromIdToken(idToken: string): OIDCUser {
    this.logger.log('👤 Extracting user info from id_token JWT...');

    try {
      // Decode JWT without verification (we already trust the token from OIDC provider)
      // JWT format: base64(header).base64(payload).signature
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      // Decode payload (second part)
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      );

      this.logger.log('✅ User info extracted from id_token');
      this.logger.log(`   User data: ${JSON.stringify(payload)}`);
      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        company_id: payload.company_id,
      } as OIDCUser;
    } catch (error) {
      this.logger.error('❌ Failed to decode id_token');
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`   Error: ${errorMessage}`);
      throw new Error('Failed to decode id_token');
    }
  }

  /**
   * Refresh access tokens using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<TokenSet> {
    try {
      const tokenResponse = await axios.post(
        `${this.issuerUrl}/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      return tokenResponse.data as TokenSet;
    } catch (error) {
      this.logger.error('Failed to refresh tokens', error);
      throw new Error('Failed to refresh tokens');
    }
  }

  /**
   * Get logout URL for OIDC provider
   */
  getLogoutUrl(idTokenHint?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      post_logout_redirect_uri: this.postLogoutRedirectUri,
    });

    if (idTokenHint) {
      params.append('id_token_hint', idTokenHint);
    }

    // Use public URL for browser redirect
    return `${this.issuerPublicUrl}/session/end?${params.toString()}`;
  }
}
