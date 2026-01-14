import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { Provider, KoaContextWithOIDC } from "oidc-provider";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { db, pool } from './services/database.js';
import { adapterFactory } from './services/adapter.js';
import { MigrationService } from './services/migrations.js';
import adminAuthRoutes from './routes/admin-auth.js';
import adminRoutes from './routes/admin.js';
import healthRoutes from './routes/health.js';
import tokenValidationRoutes from './routes/token-validation.js';
import { normalizeEmail } from './utils/email.js';
import querystring from 'querystring';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Validate required environment variables
if (!process.env.PROVIDER_URL) {
  console.error('❌ FATAL: PROVIDER_URL environment variable is required');
  process.exit(1);
}
const issuer: string = process.env.PROVIDER_URL;

// Enhanced logging utility
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

// --- OIDC ---
// Function to get client secret from environment variables
// Pattern: CLIENT_SECRET_<CLIENT_ID> where CLIENT_ID is normalized (uppercase, hyphens to underscores)
// Example: client_id "write-mvp-client" -> env var "CLIENT_SECRET_WRITE_MVP_CLIENT"
function getClientSecretFromEnv(clientId: string): string | undefined {
  // Normalize client_id: uppercase and replace hyphens with underscores
  const envVarName = `CLIENT_SECRET_${clientId.toUpperCase().replace(/-/g, '_')}`;
  const secret = process.env[envVarName];
  
  if (secret) {
    logDebug(`Found client secret in environment variable: ${envVarName} for client: ${clientId}`);
    return secret;
  }
  
  return undefined;
}

// Load OIDC clients from database
// NOTE: client_secret is stored hashed in DB, but oidc-provider expects plain text
// We intercept token endpoint to validate with bcrypt.compare() before oidc-provider processes it
// For oidc-provider config, we provide plain text from environment variables
async function loadOIDCClients() {
  const clients = await db.getOIDCClients();
  return clients.map(client => {
    // Get plain text secret from environment variables
    // If not found in env, use the stored value (might be plain text for legacy clients)
    const envSecret = getClientSecretFromEnv(client.client_id);
    const plainTextSecret = envSecret || client.client_secret;
    
    // Log detailed information about secret loading
    if (envSecret) {
      logInfo(`✅ [LOAD-CLIENTS] Using client secret from environment variable for client: ${client.client_id}`, {
        envVar: `CLIENT_SECRET_${client.client_id.toUpperCase().replace(/-/g, '_')}`,
        secretLength: envSecret.length,
        secretPreview: `${envSecret.substring(0, 10)}...${envSecret.substring(envSecret.length - 4)}`,
        isPlainText: !envSecret.startsWith('$2b$') && !envSecret.startsWith('$2a$'),
      });
    } else {
      const storedIsHash = client.client_secret.startsWith('$2b$') || client.client_secret.startsWith('$2a$');
      logWarn(`⚠️ [LOAD-CLIENTS] No environment variable found for client: ${client.client_id}, using stored value`, {
        expectedEnvVar: `CLIENT_SECRET_${client.client_id.toUpperCase().replace(/-/g, '_')}`,
        storedValueType: storedIsHash ? 'hash' : 'plain_text',
        storedValuePreview: `${client.client_secret.substring(0, 10)}...${client.client_secret.substring(client.client_secret.length - 4)}`,
        warning: storedIsHash ? 'Stored value is a hash - oidc-provider will fail! Need env var with plain text.' : 'Using stored plain text (legacy)',
      });
    }
    
    // CRITICAL: Log what we're passing to oidc-provider
    const isPlainTextForProvider = !plainTextSecret.startsWith('$2b$') && !plainTextSecret.startsWith('$2a$');
    logInfo(`🔐 [LOAD-CLIENTS] Client configuration for oidc-provider: ${client.client_id}`, {
      client_id: client.client_id,
      secretType: isPlainTextForProvider ? 'plain_text' : 'hash',
      secretLength: plainTextSecret.length,
      secretPreview: `${plainTextSecret.substring(0, 10)}...${plainTextSecret.substring(plainTextSecret.length - 4)}`,
      willWork: isPlainTextForProvider ? 'YES - oidc-provider can validate' : 'NO - oidc-provider will reject (needs plain text)',
    });
    
    return {
      client_id: client.client_id,
      // Store plain text secret for oidc-provider (it expects plain text)
      // The actual validation is done in the middleware with bcrypt
      client_secret: plainTextSecret,
      redirect_uris: client.redirect_uris,
      post_logout_redirect_uris: client.post_logout_redirect_uris || (
        client.frontend_url ? [client.frontend_url] : []
      ),
      response_types: client.response_types,
      grant_types: client.grant_types,
      allowed_scopes: client.allowed_scopes,
      access_token_lifetime: client.access_token_lifetime,
      refresh_token_lifetime: client.refresh_token_lifetime,
      token_endpoint_auth_method: client.token_endpoint_auth_method,
    };
  });
}

type Account = {
  accountId: string;
  claims: (use?: string, scope?: string) => Promise<Record<string, any>>;
};

// Function to create OIDC provider configuration
async function createProviderConfiguration() {
  const clients = await loadOIDCClients();
  
  return {
    clients,
    adapter: adapterFactory(pool),
    
    // Cookies configuration - ensure secure cookies when behind HTTPS proxies
    // In development, use secure: false and sameSite: 'lax' to allow form submissions
    // In production, use secure: 'auto' and sameSite: 'lax' or 'none'
    cookies: {
      short: { 
        secure: process.env.NODE_ENV === 'production' ? 'auto' : false,
        sameSite: 'lax', // Allow cookies to be sent with form submissions
        path: '/', // Ensure cookies are available for all routes
      },
      long: { 
        secure: process.env.NODE_ENV === 'production' ? 'auto' : false,
        sameSite: 'lax', // Allow cookies to be sent with form submissions
        path: '/', // Ensure cookies are available for all routes
      }
    },
    
    features: { 
      devInteractions: { enabled: false },
      userinfo: { enabled: true }  // ✅ Ensure userinfo endpoint is enabled
    },
    
    // ✅ ADD: Claims configuration - maps scopes to claims
    claims: {
      openid: ['sub'],
      email: ['email'],
      profile: ['name', 'company_id'],
    },
    
    // ✅ Make sure claims are not filtered to ID token only
    conformIdTokenClaims: false,
    
    async findAccount(_ctx: KoaContextWithOIDC, id: string): Promise<Account | undefined> {
      try {
        logDebug(`findAccount called for accountId: ${id}`);
        
        // Parse the id as a numeric user ID (stable identifier)
        const userId = parseInt(id, 10);
        if (isNaN(userId)) {
          logError(`findAccount: Invalid user ID format: ${id}`);
          return undefined;
        }
        
        const user = await db.getUserById(userId);
        
        if (!user) {
          logInfo(`findAccount: User not found for id: ${id}`);
          return undefined;
        }
        
        logInfo(`findAccount: User found`, { userId: user.id, email: user.email, name: user.name, company_id: user.company_id });
        
        return {
          accountId: user.id.toString(),
          async claims(use?: string, scope?: string, claims?: any, rejected?: any) {
            try {
              console.log(`🔍 [CLAIMS] ===== CLAIMS FUNCTION CALLED =====`);
              console.log(`🔍 [CLAIMS] use=${use}, scope=${scope}`);
              console.log(`🔍 [CLAIMS] claims param:`, JSON.stringify(claims, null, 2));
              console.log(`🔍 [CLAIMS] rejected param:`, JSON.stringify(rejected, null, 2));
              console.log(`🔍 [CLAIMS] user ID: ${user.id} (${user.email})`);
              
              // Always return all claims - let oidc-provider filter based on scope
              const userClaims = { 
                sub: user.id.toString(), 
                name: user.name, 
                email: user.email, 
                company_id: user.company_id 
              };
              
              console.log(`✅ [CLAIMS] Returning claims:`, JSON.stringify(userClaims, null, 2));
              logDebug(`claims generated for user ID: ${user.id}`, userClaims);
              return userClaims;
            } catch (error) {
              logError(`Error generating claims for user ID: ${user.id}`, error);
              throw error;
            }
          },
        };
      } catch (error) {
        logError(`Error in findAccount for id: ${id}`, error);
        throw error;
      }
    },
  };
}

// Provider will be initialized after migrations
let provider: Provider;

// Function to setup provider event listeners
function setupProviderEventListeners(provider: Provider) {
  // Add error event listeners to provider
  (provider as any).on('server_error', (ctx: any, err: Error) => {
    logError('OIDC Provider server_error event', {
      error: err.message,
      stack: err.stack,
      errorType: err.constructor.name,
      method: ctx?.method,
      path: ctx?.path,
      query: ctx?.query,
      headers: ctx?.headers,
    });
  });

  (provider as any).on('grant.error', (ctx: any, err: Error) => {
    logError('OIDC Provider grant.error event', {
      error: err.message,
      stack: err.stack,
      grantType: ctx?.oidc?.params?.grant_type,
      clientId: ctx?.oidc?.client?.clientId,
    });
  });

  (provider as any).on('authorization.error', (ctx: any, err: Error) => {
    logError('OIDC Provider authorization.error event', {
      error: err.message,
      stack: err.stack,
      params: ctx?.oidc?.params,
      clientId: ctx?.oidc?.client?.clientId,
      requestedRedirectUri: ctx?.oidc?.params?.redirect_uri,
      registeredRedirectUris: ctx?.oidc?.client?.redirectUris || ctx?.oidc?.client?.redirect_uris,
    });
  });

  // Log successful authorization requests
  (provider as any).on('authorization.success', (ctx: any) => {
    logInfo('OIDC authorization.success', {
      clientId: ctx?.oidc?.client?.clientId,
      redirectUri: ctx?.oidc?.params?.redirect_uri,
      responseType: ctx?.oidc?.params?.response_type,
      scope: ctx?.oidc?.params?.scope,
    });
  });

  // Log authorization requests (both success and error)
  (provider as any).on('authorization.accepted', (ctx: any) => {
    logDebug('OIDC authorization.accepted', {
      clientId: ctx?.oidc?.client?.clientId,
      accountId: ctx?.oidc?.session?.accountId,
      params: ctx?.oidc?.params,
    });
  });
}

const app = express();

// Trust proxy - required for HTTPS detection when behind reverse proxy
// This allows Express to trust X-Forwarded-* headers
app.set('trust proxy', true);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  logDebug(`Incoming ${req.method} ${req.path}`, { 
    query: req.query, 
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']
    }
  });
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logInfo(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Serve admin panel static files
const adminPanelPath = path.join(__dirname, '../admin-panel');
app.use('/admin-panel', express.static(adminPanelPath));

// Redirect /admin-panel to /admin-panel/ (with trailing slash) for proper relative path resolution
app.get('/admin-panel', (req: Request, res: Response) => {
  res.redirect('/admin-panel/');
});

// Add admin routes (before provider.callback())
app.use('/admin-auth', adminAuthRoutes);
app.use('/admin', adminRoutes);
app.use('/health', healthRoutes);
app.use('/', tokenValidationRoutes); // Token validation endpoint

// Middleware to intercept token endpoint and validate client_secret with bcrypt
// This runs BEFORE oidc-provider processes the token endpoint
app.use('/token', async (req: Request, res: Response, next: NextFunction) => {
  // Only process POST requests to /token (token endpoint)
  if (req.method !== 'POST') {
    return next();
  }

  try {
    const clientId = req.body?.client_id;
    const clientSecret = req.body?.client_secret;

    logInfo('🔍 [TOKEN-MIDDLEWARE] Intercepted token request', {
      clientId,
      hasClientSecret: !!clientSecret,
      clientSecretLength: clientSecret?.length,
      clientSecretPreview: clientSecret ? `${clientSecret.substring(0, 10)}...${clientSecret.substring(clientSecret.length - 4)}` : 'none',
      method: req.method,
      path: req.path,
    });

    // If client_secret is provided, validate it with bcrypt
    if (clientId && clientSecret) {
      const client = await db.getOIDCClientByClientId(clientId);
      
      if (!client) {
        logWarn('Token endpoint: Client not found', { clientId });
        return res.status(401).json({
          error: 'invalid_client',
          error_description: 'Invalid client credentials'
        });
      }

      if (client && client.client_secret) {
        const storedSecret = client.client_secret;
        
        logInfo('🔍 [TOKEN-MIDDLEWARE] Client found in database', {
          clientId,
          storedSecretLength: storedSecret.length,
          storedSecretPreview: `${storedSecret.substring(0, 10)}...${storedSecret.substring(storedSecret.length - 4)}`,
          isHashed: storedSecret.startsWith('$2b$') || storedSecret.startsWith('$2a$'),
        });
        
        // Check if stored secret is hashed (starts with $2b$ or $2a$)
        const isHashed = storedSecret.startsWith('$2b$') || storedSecret.startsWith('$2a$');
        
        if (isHashed) {
          // Validate provided secret against hashed secret using bcrypt
          logInfo('🔐 [TOKEN-MIDDLEWARE] Validating client_secret with bcrypt', { clientId });
          const isValid = await bcrypt.compare(clientSecret, storedSecret);
          
          logInfo('🔐 [TOKEN-MIDDLEWARE] Bcrypt validation result', {
            clientId,
            isValid,
            providedSecretPreview: `${clientSecret.substring(0, 10)}...${clientSecret.substring(clientSecret.length - 4)}`,
            storedHashPreview: `${storedSecret.substring(0, 10)}...${storedSecret.substring(storedSecret.length - 4)}`,
          });
          
          if (!isValid) {
            logWarn('Token endpoint: Invalid client_secret', { clientId });
            return res.status(401).json({
              error: 'invalid_client',
              error_description: 'Invalid client credentials'
            });
          }
          
          // CRITICAL FIX: oidc-provider expects PLAIN TEXT in request body
          // After validating with bcrypt, we keep the original plain text secret
          // oidc-provider will compare it with the plain text in its configuration
          // We need to ensure loadOIDCClients() stores plain text in oidc-provider config
          // but we don't have plain text stored, so we'll need to handle this differently
          
          // SOLUTION: Keep plain text in request body after validation
          // oidc-provider will receive plain text and compare with plain text in config
          // We need to modify loadOIDCClients() to store plain text in config
          // For now, we keep the original plain text (already validated with bcrypt)
          
          // Keep original plain text - oidc-provider expects this
          // The validation is already done with bcrypt, so we're safe
          // oidc-provider will do its own comparison, but we've already validated
          // NOTE: We need to ensure loadOIDCClients() provides plain text in config
          
          logInfo('✅ [TOKEN-MIDDLEWARE] client_secret validated with bcrypt', {
            clientId,
            action: 'keeping_plain_text',
            plainTextLength: clientSecret.length,
            note: 'oidc-provider will receive plain text in request body (already validated)',
          });
          
          // DO NOT replace with hash - oidc-provider expects plain text
          // The request body already has the plain text, which is what oidc-provider needs
        } else {
          // Legacy: stored secret is plain text, compare directly
          logInfo('🔍 [TOKEN-MIDDLEWARE] Stored secret is plain text, comparing directly', { clientId });
          if (clientSecret !== storedSecret) {
            logWarn('Token endpoint: Invalid client_secret (plain text comparison)', { clientId });
            return res.status(401).json({
              error: 'invalid_client',
              error_description: 'Invalid client credentials'
            });
          }
          logInfo('✅ [TOKEN-MIDDLEWARE] Plain text secret matches', { clientId });
          // For plain text, let oidc-provider handle validation normally
        }
      } else {
        logWarn('Token endpoint: Client has no client_secret configured', { clientId });
        return res.status(401).json({
          error: 'invalid_client',
          error_description: 'Client secret not configured'
        });
      }
    } else {
      logWarn('Token endpoint: Missing client_id or client_secret in request', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
      });
    }
    
    logInfo('➡️ [TOKEN-MIDDLEWARE] Passing request to oidc-provider', {
      clientId,
      requestBodyClientSecret: req.body.client_secret ? `${req.body.client_secret.substring(0, 10)}...${req.body.client_secret.substring(req.body.client_secret.length - 4)}` : 'none',
    });
    
    // Continue to oidc-provider
    next();
  } catch (error: any) {
    logError('Token endpoint middleware error', error);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
});

// Root route - provide basic info and available endpoints
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'OIDC Provider',
    version: '1.0.0',
    status: 'running',
    issuer: issuer,
      endpoints: {
        health: '/health',
        adminPanel: '/admin-panel/',
        metadata: '/.well-known/openid-configuration',
        admin: '/admin',
        tokenValidation: '/api/token/validate'
      },
    timestamp: new Date().toISOString()
  });
});

// Interacción: login
app.get("/interaction/:uid", async (req: Request, res: Response) => {
  try {
    logInfo(`GET /interaction/${req.params.uid} - Starting interaction flow`);
    
    // CRITICAL DEBUG: Log cookies before getting interaction details
    logDebug(`🔍 [INTERACTION-GET] Cookies before interactionDetails:`, {
      availableCookies: req.cookies ? Object.keys(req.cookies) : [],
      cookieHeader: req.headers.cookie || 'none',
    });
    
    const details = await provider.interactionDetails(req, res);
    
    // CRITICAL DEBUG: Log cookies after getting interaction details (oidc-provider may set cookies)
    const setCookieHeader = res.getHeader('Set-Cookie');
    logDebug(`🔍 [INTERACTION-GET] Cookies after interactionDetails:`, {
      availableCookies: req.cookies ? Object.keys(req.cookies) : [],
      setCookieHeader: setCookieHeader ? (Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]) : 'none',
    });
    
    const { uid, prompt } = details;
    const promptReasons = (prompt as any).reasons || [];
    logDebug(`Interaction details retrieved`, { uid, promptName: prompt.name, promptReasons });
    
    // If user is already authenticated (session exists), validate company access before showing login form
    if ((details as any).session?.accountId) {
      const userId = parseInt((details as any).session.accountId, 10);
      
      // CRITICAL: Validate user still exists before proceeding
      if (!isNaN(userId)) {
        const user = await db.getUserById(userId);
        
        // If user doesn't exist, clear session and show login form
        if (!user) {
          logWarn(`User ${userId} from session no longer exists, clearing session`);
          // Clear the session by not using it
          // Continue to show login form below
        } else {
          const clientId = (details as any).params?.client_id;
          
          if (user && clientId) {
            // Validate that client_id exists in database before proceeding
            const clientExists = await db.getOIDCClientByClientId(clientId);
            if (!clientExists) {
              logWarn('Early validation: client_id does not exist in database', { clientId, userId: user.id });
              // Don't log audit for non-existent client to avoid foreign key violation
              // Continue to show login form
            } else {
              const hasAccess = await db.checkCompanyClientAccess(user.company_id, clientId);
              if (!hasAccess) {
                logInfo('Early access validation failed: Company does not have access', {
                  userId: user.id,
                  email: user.email,
                  company_id: user.company_id,
                  client_id: clientId
                });
                
                await db.logAudit({
                  user_id: user.id,
                  user_email: user.email,
                  client_id: clientId,
                  action: 'login_denied_no_access',
                  details: {
                    reason: 'company_client_access_denied',
                    company_id: user.company_id,
                    client_id: clientId,
                    validation_point: 'early_validation'
                  },
                  ip_address: req.ip || 'unknown',
                  user_agent: req.get('user-agent') || 'unknown',
                  success: false
                });
              
              return res.status(403).send(`
                <!DOCTYPE html>
                <html lang="es">
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Acceso Denegado - OIDC</title>
                    <style>
                      * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                      }
                      
                      body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                        color: #111827;
                      }
                      
                      .error-container {
                        background: white;
                        border-radius: 16px;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                        width: 100%;
                        max-width: 420px;
                        padding: 40px;
                        text-align: center;
                      }
                      
                      .error-icon {
                        font-size: 48px;
                        margin-bottom: 16px;
                      }
                      
                      .error-title {
                        font-size: 24px;
                        font-weight: 600;
                        color: #dc2626;
                        margin-bottom: 12px;
                      }
                      
                      .error-message {
                        font-size: 15px;
                        color: #6b7280;
                        margin-bottom: 24px;
                        line-height: 1.5;
                      }
                      
                      .btn-back {
                        display: inline-flex;
                        align-items: center;
                        padding: 10px 20px;
                        background: #b84e9d;
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s;
                      }
                      
                      .btn-back:hover {
                        background: #a21caf;
                        box-shadow: 0 4px 12px rgba(184, 78, 157, 0.3);
                      }
                    </style>
                  </head>
                  <body>
                    <div class="error-container">
                      <div class="error-icon">🚫</div>
                      <h3 class="error-title">Acceso Denegado</h3>
                      <p class="error-message">Su empresa no tiene acceso a este módulo. Por favor, contacte al administrador del sistema para solicitar acceso.</p>
                      <a href="javascript:history.back()" class="btn-back">← Volver</a>
                    </div>
                  </body>
                </html>
              `);
            }
          }
          }
        }
      }
    }
    
    if (prompt.name === "consent") {
      logInfo(`Consent prompt detected, granting consent`);
      
      // CRITICAL: Validate that the user in the session still exists
      const accountId = (details as any).session?.accountId;
      if (!accountId) {
        logError(`Consent prompt but no accountId in session`);
        res.status(403).json({ 
          error: 'session_required', 
          error_description: 'A valid session is required for consent' 
        });
        return;
      }
      
      // Verify user still exists (may have been deleted)
      const userId = parseInt(accountId, 10);
      if (isNaN(userId)) {
        logError(`Invalid accountId format in session: ${accountId}`);
        res.status(403).json({ 
          error: 'invalid_session', 
          error_description: 'Invalid session data' 
        });
        return;
      }
      
      const user = await db.getUserById(userId);
      if (!user) {
        logError(`User ${userId} from session no longer exists, invalidating session`);
        // Invalidate the session by clearing it
        await provider.interactionFinished(req, res, { 
          error: 'invalid_session',
          error_description: 'User account no longer exists. Please log in again.'
        }, { mergeWithLastSubmission: false });
        return;
      }
      
      const grant = new (provider as any).Grant({
        accountId: accountId,
        clientId: (details as any).params.client_id as string,
      });
      
      if ((details as any).params.scope) {
        const scopes = ((details as any).params.scope as string).split(' ');
        logDebug(`Adding scopes to grant:`, scopes);
        grant.addOIDCScope(scopes.join(' '));
        
        // Add non-OIDC scopes as resource scopes
        const nonOidcScopes = scopes.filter((s: string) => !['openid', 'profile', 'email', 'address', 'phone', 'offline_access'].includes(s));
        if (nonOidcScopes.length > 0) {
          grant.addResourceScope('urn:custom', nonOidcScopes.join(' '));
        }
      }
      
      const grantId = await grant.save();
      logInfo(`Grant saved with ID: ${grantId}`);
      await provider.interactionFinished(req, res, { consent: { grantId } }, { mergeWithLastSubmission: true });
      return;
    }
    
    if (prompt.name !== "login") {
      logInfo(`Non-login prompt detected: ${prompt.name}, retrieving session`);
      const accountId = (details as any).session?.accountId;
      
      if (!accountId) {
        logError(`No valid session found for non-login prompt: ${prompt.name}`);
        res.status(403).json({ 
          error: 'session_required', 
          error_description: 'A valid session is required for this operation' 
        });
        return;
      }
      
      // CRITICAL: Validate that the user still exists
      const userId = parseInt(accountId, 10);
      if (isNaN(userId)) {
        logError(`Invalid accountId format in session: ${accountId}`);
        res.status(403).json({ 
          error: 'invalid_session', 
          error_description: 'Invalid session data' 
        });
        return;
      }
      
      const user = await db.getUserById(userId);
      if (!user) {
        logError(`User ${userId} from session no longer exists, invalidating session`);
        res.status(403).json({ 
          error: 'invalid_session', 
          error_description: 'User account no longer exists. Please log in again.' 
        });
        return;
      }
      
      logInfo(`Using accountId from session: ${accountId}`);
      await provider.interactionFinished(req, res, { login: { accountId } }, { mergeWithLastSubmission: true });
      return;
    }
    
    // Return the login form with Write-MVP aligned styles
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Iniciar Sesión - OIDC</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
              color: #111827;
            }
            
            .login-container {
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
              width: 100%;
              max-width: 420px;
              padding: 40px;
            }
            
            .login-header {
              text-align: center;
              margin-bottom: 32px;
            }
            
            .login-header h1 {
              font-size: 28px;
              font-weight: 600;
              color: #111827;
              margin-bottom: 8px;
            }
            
            .login-header p {
              font-size: 14px;
              color: #6b7280;
            }
            
            .form-group {
              margin-bottom: 20px;
            }
            
            .form-group label {
              display: block;
              margin-bottom: 8px;
              font-weight: 500;
              font-size: 14px;
              color: #374151;
            }
            
            .form-group input {
              width: 100%;
              height: 40px;
              padding: 0 14px;
              border: 1px solid #d1d5db;
              border-radius: 8px;
              font-size: 15px;
              font-family: inherit;
              transition: all 0.2s;
              background: white;
              color: #111827;
            }
            
            .form-group input:focus {
              outline: none;
              border-color: #b84e9d;
              box-shadow: 0 0 0 3px rgba(184, 78, 157, 0.1);
            }
            
            .form-group input::placeholder {
              color: #9ca3af;
            }
            
            .btn-primary {
              width: 100%;
              height: 44px;
              background: #b84e9d;
              color: white;
              font-size: 15px;
              font-weight: 500;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.2s;
              font-family: inherit;
              margin-top: 8px;
            }
            
            .btn-primary:hover {
              background: #a21caf;
              box-shadow: 0 4px 12px rgba(184, 78, 157, 0.3);
            }
            
            .btn-primary:active {
              transform: scale(0.98);
            }
            
            .error {
              color: #dc2626;
              font-size: 14px;
              margin-top: 12px;
              padding: 12px;
              background: #fef2f2;
              border-left: 4px solid #dc2626;
              border-radius: 4px;
            }
            
            @media (max-width: 480px) {
              .login-container {
                padding: 32px 24px;
              }
              
              .login-header h1 {
                font-size: 24px;
              }
            }
          </style>
        </head>
        <body>
          <div class="login-container">
            <div class="login-header">
              <h1>🔐 Iniciar Sesión</h1>
              <p>Ingresa tus credenciales para continuar</p>
            </div>
            
            <form method="post" action="/interaction/${uid}/login">
              <div class="form-group">
                <label for="email">Email</label>
                <input 
                  type="email" 
                  id="email"
                  name="email" 
                  required 
                  placeholder="usuario@ejemplo.com"
                  autocomplete="email"
                />
              </div>
              
              <div class="form-group">
                <label for="password">Password</label>
                <input 
                  type="password" 
                  id="password"
                  name="password" 
                  required 
                  placeholder="••••••••"
                  autocomplete="current-password"
                />
              </div>
              
              <button type="submit" class="btn-primary">Iniciar Sesión</button>
            </form>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    logError(`Error in GET /interaction/${req.params.uid}`, error);
    return res.status(500).send('Error processing interaction request');
  }
});

app.post("/interaction/:uid/login", async (req: Request, res: Response) => {
  const { uid } = req.params;
  const { email, password } = req.body as { email?: string; password?: string };
  
  try {
    // Extract IP and user agent early for use throughout the function
    const ip = req.ip || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    
    // CRITICAL DEBUG: Log all cookies present in the request
    logInfo(`POST /interaction/${uid}/login - Login attempt`, { 
      email,
      uid,
      availableCookies: req.cookies ? Object.keys(req.cookies) : [],
      cookieHeader: req.headers.cookie || 'none',
      cookieHeaderLength: req.headers.cookie ? req.headers.cookie.length : 0,
    });
    
    if (!email || !password) {
      logError('Login attempt missing email or password', { email: email || 'missing', hasPassword: !!password });
      return res.status(400).send("email/password requeridos");
    }

    // Normalize email before processing
    let normalizedEmail: string;
    try {
      normalizedEmail = normalizeEmail(email);
    } catch (error: any) {
      logError('Invalid email format', { email, error: error.message });
      return res.status(400).send("email inválido");
    }

    // Rate limiting: Check IP and email before processing login
    const canAttemptByIP = await db.checkRateLimit(ip, 'ip', 'login');
    const canAttemptByEmail = await db.checkRateLimit(normalizedEmail, 'email', 'login');
    
    if (!canAttemptByIP || !canAttemptByEmail) {
      logWarn('Login blocked by rate limit', { email: normalizedEmail, ip, canAttemptByIP, canAttemptByEmail });
      // Record the blocked attempt
      await db.recordRateLimitAttempt(ip, 'ip', 'login');
      await db.recordRateLimitAttempt(normalizedEmail, 'email', 'login');
      
      return res.status(429).send(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Demasiados Intentos - OIDC</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                color: #111827;
              }
              
              .error-container {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                width: 100%;
                max-width: 420px;
                padding: 40px;
                text-align: center;
              }
              
              .error-icon {
                font-size: 48px;
                margin-bottom: 16px;
              }
              
              .error-title {
                font-size: 24px;
                font-weight: 600;
                color: #dc2626;
                margin-bottom: 12px;
              }
              
              .error-message {
                font-size: 15px;
                color: #6b7280;
                margin-bottom: 24px;
                line-height: 1.5;
              }
              
              .btn-back {
                display: inline-flex;
                align-items: center;
                padding: 10px 20px;
                background: #b84e9d;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
              }
              
              .btn-back:hover {
                background: #a21caf;
                box-shadow: 0 4px 12px rgba(184, 78, 157, 0.3);
              }
            </style>
          </head>
          <body>
            <div class="error-container">
              <div class="error-icon">⏱️</div>
              <h3 class="error-title">Demasiados Intentos</h3>
              <p class="error-message">Ha excedido el número máximo de intentos de inicio de sesión. Por favor, intente nuevamente más tarde.</p>
              <a href="javascript:history.back()" class="btn-back">← Volver</a>
            </div>
          </body>
        </html>
      `);
    }

    const user = await db.getUserByEmail(normalizedEmail);
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    
    if (!ok) {
      // Record failed login attempt for rate limiting
      await db.recordRateLimitAttempt(ip, 'ip', 'login');
      await db.recordRateLimitAttempt(normalizedEmail, 'email', 'login');
      
      logError('Login failed: invalid credentials', { email: normalizedEmail, userExists: !!user });
      return res.status(401).send(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error de Login - OIDC</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                color: #111827;
              }
              
              .error-container {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                width: 100%;
                max-width: 420px;
                padding: 40px;
                text-align: center;
              }
              
              .error-icon {
                font-size: 48px;
                margin-bottom: 16px;
              }
              
              .error-title {
                font-size: 24px;
                font-weight: 600;
                color: #dc2626;
                margin-bottom: 12px;
              }
              
              .error-message {
                font-size: 15px;
                color: #6b7280;
                margin-bottom: 24px;
                line-height: 1.5;
              }
              
              .btn-back {
                display: inline-flex;
                align-items: center;
                padding: 10px 20px;
                background: #b84e9d;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
              }
              
              .btn-back:hover {
                background: #a21caf;
                box-shadow: 0 4px 12px rgba(184, 78, 157, 0.3);
              }
            </style>
          </head>
          <body>
            <div class="error-container">
              <div class="error-icon">❌</div>
              <h3 class="error-title">Credenciales Inválidas</h3>
              <p class="error-message">El email o password no son correctos. Por favor, intenta nuevamente.</p>
              <a href="javascript:history.back()" class="btn-back">← Volver e intentar de nuevo</a>
            </div>
          </body>
        </html>
      `);
    }

    // Get interaction details to extract client_id
    // CRITICAL: This requires the interaction session cookie to be present
    // If this fails, it means the cookie wasn't sent with the POST request
    let details;
    try {
      details = await provider.interactionDetails(req, res);
    } catch (interactionError: any) {
      logError('Failed to get interaction details - cookie may not be present', {
        error: interactionError.message,
        errorName: interactionError.name,
        uid,
        email: normalizedEmail,
        cookies: req.cookies ? Object.keys(req.cookies) : [],
        cookieHeaders: req.headers.cookie || 'none',
      });
      
      // Return user-friendly error page
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error de Sesión - OIDC</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                color: #111827;
              }
              
              .error-container {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                width: 100%;
                max-width: 420px;
                padding: 40px;
                text-align: center;
              }
              
              .error-icon {
                font-size: 48px;
                margin-bottom: 16px;
              }
              
              .error-title {
                font-size: 24px;
                font-weight: 600;
                color: #dc2626;
                margin-bottom: 12px;
              }
              
              .error-message {
                font-size: 15px;
                color: #6b7280;
                margin-bottom: 24px;
                line-height: 1.5;
              }
              
              .btn-back {
                display: inline-flex;
                align-items: center;
                padding: 10px 20px;
                background: #b84e9d;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
              }
              
              .btn-back:hover {
                background: #a21caf;
                box-shadow: 0 4px 12px rgba(184, 78, 157, 0.3);
              }
            </style>
          </head>
          <body>
            <div class="error-container">
              <div class="error-icon">⚠️</div>
              <h3 class="error-title">Sesión Expirada</h3>
              <p class="error-message">La sesión de inicio de sesión ha expirado o no se pudo encontrar. Por favor, intenta iniciar sesión nuevamente desde el principio.</p>
              <a href="javascript:history.back()" class="btn-back">← Volver e intentar de nuevo</a>
            </div>
          </body>
        </html>
      `);
    }
    
    const clientId = (details as any).params?.client_id;
    
    // Validate client_id exists and is not empty
    if (!clientId) {
      logError('Login failed: client_id not found in interaction', { uid, email: normalizedEmail });
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error de Configuración - OIDC</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                color: #111827;
              }
              
              .error-container {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                width: 100%;
                max-width: 420px;
                padding: 40px;
                text-align: center;
              }
              
              .error-icon {
                font-size: 48px;
                margin-bottom: 16px;
              }
              
              .error-title {
                font-size: 24px;
                font-weight: 600;
                color: #dc2626;
                margin-bottom: 12px;
              }
              
              .error-message {
                font-size: 15px;
                color: #6b7280;
                margin-bottom: 24px;
                line-height: 1.5;
              }
              
              .btn-back {
                display: inline-flex;
                align-items: center;
                padding: 10px 20px;
                background: #b84e9d;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
              }
              
              .btn-back:hover {
                background: #a21caf;
                box-shadow: 0 4px 12px rgba(184, 78, 157, 0.3);
              }
            </style>
          </head>
          <body>
            <div class="error-container">
              <div class="error-icon">⚠️</div>
              <h3 class="error-title">Error de Configuración</h3>
              <p class="error-message">No se pudo identificar el módulo solicitado. Por favor, contacte al administrador del sistema.</p>
              <a href="javascript:history.back()" class="btn-back">← Volver</a>
            </div>
          </body>
        </html>
      `);
    }
    
    // Validate that client_id exists in database before proceeding
    const clientExists = await db.getOIDCClientByClientId(clientId);
    if (!clientExists) {
      logError('Login failed: client_id does not exist in database', { clientId, email: normalizedEmail });
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error de Configuración - OIDC</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                color: #111827;
              }
              
              .error-container {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                width: 100%;
                max-width: 420px;
                padding: 40px;
                text-align: center;
              }
              
              .error-icon {
                font-size: 48px;
                margin-bottom: 16px;
              }
              
              .error-title {
                font-size: 24px;
                font-weight: 600;
                color: #dc2626;
                margin-bottom: 12px;
              }
              
              .error-message {
                font-size: 15px;
                color: #6b7280;
                margin-bottom: 24px;
                line-height: 1.5;
              }
              
              .btn-back {
                display: inline-flex;
                align-items: center;
                padding: 10px 20px;
                background: #b84e9d;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
              }
              
              .btn-back:hover {
                background: #a21caf;
                box-shadow: 0 4px 12px rgba(184, 78, 157, 0.3);
              }
            </style>
          </head>
          <body>
            <div class="error-container">
              <div class="error-icon">⚠️</div>
              <h3 class="error-title">Error de Configuración</h3>
              <p class="error-message">El módulo solicitado no está configurado correctamente. Por favor, contacte al administrador del sistema.</p>
              <a href="javascript:history.back()" class="btn-back">← Volver</a>
            </div>
          </body>
        </html>
      `);
    }
    
    // Validate that the user's company has access to the client
    const hasAccess = await db.checkCompanyClientAccess(user.company_id, clientId);
    
    if (!hasAccess) {
      logInfo('Login denied: Company does not have access to client', {
        userId: user.id,
        email: user.email,
        company_id: user.company_id,
        client_id: clientId
      });
      
      // Log audit event
      await db.logAudit({
        user_id: user.id,
        user_email: user.email,
        client_id: clientId,
        action: 'login_denied_no_access',
        details: {
          reason: 'company_client_access_denied',
          company_id: user.company_id,
          client_id: clientId
        },
        ip_address: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
        success: false
      });
      
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Acceso Denegado - OIDC</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                color: #111827;
              }
              
              .error-container {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                width: 100%;
                max-width: 420px;
                padding: 40px;
                text-align: center;
              }
              
              .error-icon {
                font-size: 48px;
                margin-bottom: 16px;
              }
              
              .error-title {
                font-size: 24px;
                font-weight: 600;
                color: #dc2626;
                margin-bottom: 12px;
              }
              
              .error-message {
                font-size: 15px;
                color: #6b7280;
                margin-bottom: 24px;
                line-height: 1.5;
              }
              
              .btn-back {
                display: inline-flex;
                align-items: center;
                padding: 10px 20px;
                background: #b84e9d;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
              }
              
              .btn-back:hover {
                background: #a21caf;
                box-shadow: 0 4px 12px rgba(184, 78, 157, 0.3);
              }
            </style>
          </head>
          <body>
            <div class="error-container">
              <div class="error-icon">🚫</div>
              <h3 class="error-title">Acceso Denegado</h3>
              <p class="error-message">Su empresa no tiene acceso a este módulo. Por favor, contacte al administrador del sistema para solicitar acceso.</p>
              <a href="javascript:history.back()" class="btn-back">← Volver</a>
            </div>
          </body>
        </html>
      `);
    }
    
    // Create user session record
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await db.createUserSession({
      session_id: uid,
      user_id: user.id,
      client_id: clientId,
      ip_address: ip,
      user_agent: userAgent,
      expires_at: sessionExpiresAt
    });
    
    logInfo(`User session created`, { 
      sessionId: uid, 
      userId: user.id, 
      clientId,
      expiresAt: sessionExpiresAt 
    });

    // Log successful login to audit
    await db.logAudit({
      user_id: user.id,
      user_email: user.email,
      client_id: clientId,
      action: 'login_success',
      details: {
        uid,
        company_id: user.company_id,
        session_id: uid
      },
      ip_address: ip,
      user_agent: userAgent,
      success: true
    });

    const result = { login: { accountId: user.id.toString() } };
    logInfo(`Login successful for user: ${user.email}`, { accountId: user.id.toString(), userId: user.id, uid });
    
    await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
    logDebug(`interactionFinished completed successfully for uid: ${uid}`);
    
  } catch (error) {
    logError(`Error in POST /interaction/${uid}/login`, error);
    return res.status(500).send('Error processing login');
  }
});

// Custom logout handler - automatically confirm logout without showing confirmation dialog
app.get("/session/end", async (req: Request, res: Response) => {
  try {
    logInfo('Custom logout handler called - auto-confirming logout');
    
    // Get the post_logout_redirect_uri and client_id
    const postLogoutRedirectUri = req.query.post_logout_redirect_uri as string;
    const clientId = req.query.client_id as string;
    
    logInfo('Logout parameters:', {
      postLogoutRedirectUri,
      clientId,
      idTokenHint: req.query.id_token_hint ? 'present' : 'missing'
    });
    
    // Try to extract userId from id_token_hint to invalidate sessions
    try {
      const idTokenHint = req.query.id_token_hint as string;
      if (idTokenHint) {
        // Decode the JWT without verification (we just need the sub claim)
        const decoded = jwt.decode(idTokenHint) as any;
        if (decoded && decoded.sub) {
          const userId = parseInt(decoded.sub);
          if (!isNaN(userId)) {
            await db.invalidateUserSessionsForUser(userId);
            logInfo('User sessions invalidated for user', { userId });
          }
        }
      }
    } catch (sessionError) {
      logError('Could not invalidate user sessions during logout', sessionError);
      // Continue with logout even if session invalidation fails
    }
    
    // Clear any session cookies
    res.clearCookie('_session');
    res.clearCookie('_session.sig');
    
    if (postLogoutRedirectUri) {
      logInfo('Redirecting to post_logout_redirect_uri:', postLogoutRedirectUri);
      return res.redirect(postLogoutRedirectUri);
    }
    
    // Get the client's frontend URL from the database
    if (clientId) {
      const client = await db.getOIDCClientByClientId(clientId);
      if (client && client.frontend_url) {
        logInfo('Redirecting to client frontend URL:', { clientId, frontendUrl: client.frontend_url });
        return res.redirect(client.frontend_url);
      } else {
        logError('No frontend URL configured for client', { clientId });
        return res.status(500).send('No logout redirect URL configured for this client');
      }
    }
    
    // No client_id and no post_logout_redirect_uri
    logError('Logout failed: no post_logout_redirect_uri or client_id provided');
    res.status(500).send('Missing required logout parameters');
  } catch (error) {
    logError('Error in custom logout handler', error);
    res.status(500).send('Logout failed');
  }
});

// Public company name lookup (no auth required for basic info)
app.get("/api/company/:companyId", async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const company = await db.getCompanyByCompanyId(companyId);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Only return public info
    res.json({
      company_id: company.company_id,
      company_name: company.company_name,
      is_active: company.is_active
    });
  } catch (error) {
    logError('Error fetching company', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Provider middleware will be mounted after initialization in startServer()
// Global error handler will be mounted after provider in startServer()

// Startup function with migrations
async function startServer() {
  try {
    // Validate critical environment variables
    if (!process.env.JWT_SECRET) {
      logError('❌ FATAL: JWT_SECRET not configured');
      logError('❌ Token signature verification is required for security');
      logError('❌ Set JWT_SECRET environment variable to match satellite modules (e.g., write-mvp)');
      logError('❌ Server startup aborted to prevent insecure deployment');
      process.exit(1);
    } else {
      logInfo('✅ JWT_SECRET configured - token signature verification enabled');
    }

    // Run database migrations
    console.log('🔄 Initializing database...');
    const migrationService = new MigrationService(pool);
    await migrationService.runMigrations();
    console.log('✅ Database ready\n');
    
    // Initialize OIDC Provider after migrations
    console.log('🔄 Initializing OIDC Provider...');
    const configuration = await createProviderConfiguration();
    provider = new Provider(issuer, configuration as any);
    // Ensure provider respects reverse proxy headers for HTTPS URL generation
    // This makes well-known endpoints emit https when behind TLS-terminating proxies
    (provider as any).proxy = true;
    setupProviderEventListeners(provider);
    console.log('✅ OIDC Provider initialized\n');
    
    // Mount provider callback (must be after custom routes)
    app.use(provider.callback());
    
    // Global error handler for Express (must be after all routes and middleware)
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logError('Express error handler caught unhandled error', {
        error: err.message,
        stack: err.stack,
        errorType: err.constructor.name,
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body,
      });
      
      if (!res.headersSent) {
        const isProduction = process.env.NODE_ENV === 'production';
        res.status(500).json({ 
          error: 'Internal server error',
          ...(isProduction ? {} : { message: err.message })
        });
      }
    });
    
    // Start the server
    app.listen(8080, () => {
      logInfo("OIDC Provider (PostgreSQL) server started");
      console.log(`🚀 OIDC Provider (PostgreSQL) iniciado en ${issuer}`);
      console.log(`📋 Metadata OIDC: ${issuer}/.well-known/openid-configuration`);
      console.log(`🔐 Admin Panel: ${issuer}/admin-panel/`);
      console.log("💡 Enhanced logging enabled - all errors will be captured and logged");
    });
  } catch (error) {
    logError('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
startServer();