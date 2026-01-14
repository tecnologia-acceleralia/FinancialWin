import { JwtService } from '@nestjs/jwt';

/**
 * Helper to generate JWT tokens for testing
 * Uses the same secret and structure as the actual auth flow
 */
export class JwtTestHelper {
  private jwtService: JwtService;
  private secret: string;

  constructor(secret: string = process.env.JWT_SECRET || 'test-secret') {
    this.secret = secret;
    this.jwtService = new JwtService({
      secret: this.secret,
      signOptions: { expiresIn: '24h' },
    });
  }

  /**
   * Generate a JWT token for a user with a specific company_id
   */
  generateToken(params: {
    sub: string;
    email: string;
    name: string;
    company_id: string;
  }): string {
    const payload = {
      sub: params.sub,
      email: params.email,
      name: params.name,
      company_id: params.company_id,
      id_token: 'test-id-token',
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Generate Authorization header value
   */
  getAuthHeader(token: string): string {
    return `Bearer ${token}`;
  }

  /**
   * Generate cookie value for testing
   */
  getCookieValue(token: string, cookieName: string = 'oauth_session'): string {
    return `${cookieName}=${token}`;
  }
}
