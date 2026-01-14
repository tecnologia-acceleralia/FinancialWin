import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../services/database.js';

const router = Router();

// Logging utilities (local to this module)
function logInfo(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ℹ️  ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

function logError(message: string, error?: any) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ ${message}`);
  if (error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...error
    });
  }
}

function logDebug(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔍 ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

function logWarn(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] ⚠️  ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

// JWT Secret from environment (same secret used by satellite modules to sign tokens)
// This should never be empty as server startup validates it, but we check for safety
const JWT_SECRET = process.env.JWT_SECRET || '';

if (!JWT_SECRET) {
  logError('❌ [TOKEN-VALIDATION] FATAL: JWT_SECRET not configured - this should not happen');
  logError('❌ [TOKEN-VALIDATION] Server should have aborted at startup. Token validation will fail.');
}

/**
 * Shared token validation logic
 * Extracted to be reusable by both GET and POST endpoints
 */
async function validateToken(
  token: string,
  clientId: string, // Now required (validated before calling this function)
  req: Request
): Promise<{
  valid: boolean;
  user?: { sub: string; email: string; name: string; company_id: string };
  expiresAt?: number;
  error?: string;
  code?: string;
  access_revoked?: boolean;
  statusCode?: number;
}> {
  if (!token) {
    return {
      valid: false,
      error: 'No authentication token provided',
      code: 'NO_TOKEN',
      statusCode: 401,
    };
  }

  // Log token preview (first/last 20 chars for security)
  const tokenPreview =
    token.length > 40
      ? `${token.substring(0, 20)}...${token.substring(token.length - 20)}`
      : token.substring(0, 20);
  logDebug(`🔍 [TOKEN-VALIDATION] Token preview: ${tokenPreview}`);

  // Decode/Verify token
  let payload: {
    sub?: string;
    email?: string;
    name?: string;
    company_id?: string;
    id_token?: string;
    access_token?: string;
    refresh_token?: string;
    exp?: number;
    iat?: number;
  };

  try {
    if (JWT_SECRET) {
      // Verify token signature (more secure)
      try {
        payload = jwt.verify(token, JWT_SECRET) as any;
        logDebug('✅ [TOKEN-VALIDATION] Token verified successfully (signature validated)');
      } catch (verifyError: any) {
        if (verifyError.name === 'TokenExpiredError') {
          logWarn(`⚠️ [TOKEN-VALIDATION] Token expired - exp: ${verifyError.expiredAt}`);
          return {
            valid: false,
            error: 'Token expired',
            code: 'TOKEN_EXPIRED',
            statusCode: 401,
          };
        } else if (verifyError.name === 'JsonWebTokenError') {
          logWarn(`⚠️ [TOKEN-VALIDATION] Token signature invalid: ${verifyError.message}`);
          return {
            valid: false,
            error: 'Invalid token signature',
            code: 'INVALID_SIGNATURE',
            statusCode: 401,
          };
        } else {
          throw verifyError;
        }
      }
    } else {
      // Fallback to decode if JWT_SECRET is not configured (less secure)
      logWarn('⚠️ [TOKEN-VALIDATION] JWT_SECRET not configured - using decode (less secure)');
      payload = jwt.decode(token) as any;

      if (!payload) {
        logError('❌ [TOKEN-VALIDATION] Failed to decode token');
        return {
          valid: false,
          error: 'Invalid token format',
          code: 'INVALID_FORMAT',
          statusCode: 401,
        };
      }
    }
  } catch (error: any) {
    logError('❌ [TOKEN-VALIDATION] Token processing failed', error);
    return {
      valid: false,
      error: 'Token processing failed',
      code: 'PROCESSING_ERROR',
      statusCode: 401,
    };
  }

  // Validate token expiration (even if decoded without verification)
  if (payload.exp) {
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      logWarn(`⚠️ [TOKEN-VALIDATION] Token expired - exp: ${payload.exp}, now: ${now}`);
      return {
        valid: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
        statusCode: 401,
      };
    }
  }

  // Validate required claims
  const missingClaims: string[] = [];
  if (!payload.sub) missingClaims.push('sub');
  if (!payload.email) missingClaims.push('email');
  if (!payload.name) missingClaims.push('name');
  if (!payload.company_id) missingClaims.push('company_id');

  if (missingClaims.length > 0) {
    logError(`❌ [TOKEN-VALIDATION] Token missing required claims: ${missingClaims.join(', ')}`, {
      availableClaims: Object.keys(payload),
    });
    return {
      valid: false,
      error: `Token missing required claims: ${missingClaims.join(', ')}`,
      code: 'MISSING_CLAIMS',
      statusCode: 401,
    };
  }

  logDebug(`✅ [TOKEN-VALIDATION] Token claims validated - User: ${payload.email}, Company ID: ${payload.company_id}`);

  // CRITICAL: Verify company has access to client (client_id is now always provided)
  try {
    const hasAccess = await db.checkCompanyClientAccess(payload.company_id!, clientId);

    if (!hasAccess) {
      logWarn(`🚫 [TOKEN-VALIDATION] Access denied for company ${payload.company_id} to client ${clientId}`);

      // Log audit event
      try {
        await db.logAudit({
          user_email: payload.email!,
          // Note: user_id is number in database, but payload.sub is string (OIDC user ID)
          // We use user_email instead of user_id for OIDC users
          action: 'token_validation_denied',
          details: {
            reason: 'company_client_access_denied',
            company_id: payload.company_id,
            client_id: clientId,
            validation_point: 'token_validation_endpoint',
          },
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
          success: false,
        });
      } catch (auditError) {
        logWarn('Failed to log audit event', auditError);
      }

      return {
        valid: false,
        error: 'Your company does not have access to this application',
        code: 'ACCESS_DENIED',
        access_revoked: true,
        statusCode: 403,
      };
    }

    logDebug(`✅ [TOKEN-VALIDATION] Access verified for company ${payload.company_id} to client ${clientId}`);
  } catch (accessError: any) {
    logError(`❌ [TOKEN-VALIDATION] Access check failed: ${accessError.message}`, accessError);
    // Fail closed - deny access if verification fails
    return {
      valid: false,
      error: 'Unable to verify access. Please contact administrator.',
      code: 'ACCESS_VERIFICATION_FAILED',
      access_revoked: true,
      statusCode: 403,
    };
  }

  // Calculate expiration time
  const expiresAt = payload.exp ? payload.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000; // Default 24h if no exp

  // Log successful validation
  logInfo('✅ [TOKEN-VALIDATION] Token validated successfully', {
    user: payload.email,
    company_id: payload.company_id,
    client_id: clientId || 'not_provided',
    expiresAt: new Date(expiresAt).toISOString(),
  });

  return {
    valid: true,
    user: {
      sub: payload.sub!,
      email: payload.email!,
      name: payload.name!,
      company_id: payload.company_id!,
    },
    expiresAt,
  };
}

/**
 * POST /api/token/validate
 * 
 * Centralized token validation endpoint for satellite modules.
 * This endpoint contains ALL security logic - satellite modules should only call this.
 * 
 * Request:
 *   Headers: { Authorization: Bearer <session_jwt> }
 *   OR
 *   Body: { token: <session_jwt> }
 *   Query or Body: { client_id: <client_id> } (REQUIRED, for access verification)
 * 
 * Response:
 *   200: { valid: true, user: { sub, email, name, company_id }, expiresAt: number }
 *   400: { valid: false, error: 'client_id is required', code: 'MISSING_CLIENT_ID' }
 *   401: { valid: false, error: 'reason' }
 *   403: { valid: false, error: 'reason', access_revoked: true }
 */
router.post('/api/token/validate', async (req: Request, res: Response) => {
  try {
    logDebug('🔐 [TOKEN-VALIDATION] POST token validation request received');

    // Extract token from Authorization header or body
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      logDebug('✅ [TOKEN-VALIDATION] Token found in Authorization header');
    } else if (req.body?.token) {
      token = req.body.token;
      logDebug('✅ [TOKEN-VALIDATION] Token found in request body');
    } else {
      logWarn('❌ [TOKEN-VALIDATION] No token provided');
      return res.status(401).json({
        valid: false,
        error: 'No authentication token provided',
        code: 'NO_TOKEN',
      });
    }

    // Extract client_id from query or body (REQUIRED)
    const clientId = (req.query.client_id as string) || req.body.client_id || undefined;

    // Validate client_id is provided
    if (!clientId) {
      logWarn('❌ [TOKEN-VALIDATION] client_id is required but not provided');
      return res.status(400).json({
        valid: false,
        error: 'client_id is required for token validation',
        code: 'MISSING_CLIENT_ID',
      });
    }

    // Validate token using shared logic (token is guaranteed to be string here)
    if (!token) {
      return res.status(401).json({
        valid: false,
        error: 'No authentication token provided',
        code: 'NO_TOKEN',
      });
    }
    const result = await validateToken(token, clientId, req);

    if (!result.valid) {
      return res.status(result.statusCode || 401).json({
        valid: false,
        error: result.error,
        code: result.code,
        access_revoked: result.access_revoked,
      });
    }

    // Return validated user information
    return res.status(200).json({
      valid: true,
      user: result.user,
      expiresAt: result.expiresAt,
      expiresAtISO: new Date(result.expiresAt!).toISOString(),
      timeUntilExpiry: Math.max(0, Math.floor((result.expiresAt! - Date.now()) / 1000)), // seconds
    });
  } catch (error: any) {
    logError('❌ [TOKEN-VALIDATION] Unexpected error during token validation', error);
    return res.status(500).json({
      valid: false,
      error: 'Internal server error during token validation',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/token/validate
 * 
 * Same as POST but accepts token as query parameter (for convenience)
 * 
 * Request:
 *   Query: { token: <session_jwt>, client_id: <client_id> } (both REQUIRED)
 *   OR
 *   Headers: { Authorization: Bearer <session_jwt> }
 *   Query: { client_id: <client_id> } (REQUIRED)
 * 
 * Response:
 *   200: { valid: true, user: { sub, email, name, company_id }, expiresAt: number }
 *   400: { valid: false, error: 'client_id is required', code: 'MISSING_CLIENT_ID' }
 *   401: { valid: false, error: 'reason' }
 *   403: { valid: false, error: 'reason', access_revoked: true }
 */
router.get('/api/token/validate', async (req: Request, res: Response) => {
  try {
    logDebug('🔐 [TOKEN-VALIDATION] GET token validation request received');

    // Extract token from Authorization header or query parameter
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : (req.query.token as string);

    if (!token) {
      return res.status(401).json({
        valid: false,
        error: 'No token provided. Use Authorization header or ?token= query parameter.',
        code: 'NO_TOKEN',
      });
    }

    // Extract client_id from query (REQUIRED)
    const clientId = req.query.client_id as string | undefined;

    // Validate client_id is provided
    if (!clientId) {
      logWarn('❌ [TOKEN-VALIDATION] client_id is required but not provided');
      return res.status(400).json({
        valid: false,
        error: 'client_id is required for token validation',
        code: 'MISSING_CLIENT_ID',
      });
    }

    // Validate token using shared logic
    const result = await validateToken(token, clientId, req);

    if (!result.valid) {
      return res.status(result.statusCode || 401).json({
        valid: false,
        error: result.error,
        code: result.code,
        access_revoked: result.access_revoked,
      });
    }

    // Return validated user information
    return res.status(200).json({
      valid: true,
      user: result.user,
      expiresAt: result.expiresAt,
      expiresAtISO: new Date(result.expiresAt!).toISOString(),
      timeUntilExpiry: Math.max(0, Math.floor((result.expiresAt! - Date.now()) / 1000)), // seconds
    });
  } catch (error: any) {
    logError('❌ [TOKEN-VALIDATION] Unexpected error during token validation', error);
    return res.status(500).json({
      valid: false,
      error: 'Internal server error during token validation',
      code: 'INTERNAL_ERROR',
    });
  }
});

export default router;
