import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const oidcConfigSchema = z.object({
  issuerUrl: z.string().url(),
  clientId: z.string(),
  clientSecret: z.string(),
  redirectUri: z.string().url(),
  postLogoutRedirectUri: z.string().url(),
  scopes: z.string(),
  cookieName: z.string(),
  cookieSecure: z.boolean(),
  cookieSameSite: z.enum(['lax', 'strict', 'none']),
  cookieDomain: z.string().optional(),
  cookiePath: z.string().optional(),
  cookieMaxAge: z.number().optional(),
  tokenRefreshWindow: z.number().optional(),
});

export type OIDCConfigValues = z.infer<typeof oidcConfigSchema>;

export const OIDCConfig = registerAs('oidc', (): OIDCConfigValues => {
  const config = {
    issuerUrl: process.env.OIDC_ISSUER_URL,
    clientId: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    redirectUri: process.env.OIDC_REDIRECT_URI,
    postLogoutRedirectUri: process.env.OIDC_POST_LOGOUT_REDIRECT_URI,
    scopes: process.env.OIDC_SCOPES,
    cookieName: process.env.OIDC_COOKIE_NAME,
    cookieSecure: process.env.OIDC_COOKIE_SECURE === 'true',
    cookieSameSite: process.env.OIDC_COOKIE_SAME_SITE,
    cookieDomain: process.env.OIDC_COOKIE_DOMAIN,
    cookiePath: process.env.OIDC_COOKIE_PATH,
    cookieMaxAge: process.env.OIDC_COOKIE_MAX_AGE
      ? parseInt(process.env.OIDC_COOKIE_MAX_AGE)
      : 7 * 24 * 60 * 60 * 1000, // Default: 7 days (604800000 ms)
    tokenRefreshWindow: process.env.OIDC_TOKEN_REFRESH_WINDOW
      ? parseInt(process.env.OIDC_TOKEN_REFRESH_WINDOW)
      : 30 * 60 * 1000, // Default: 30 minutes (1800000 ms)
  };

  return oidcConfigSchema.parse(config);
});
