import express, { Request, Response } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as OpenIDConnectStrategy } from "passport-openidconnect";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
const { Pool } = pg;

// Load environment variables from backend/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load from backend/.env (back up one level from dist/ to backend/)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_STORE = process.env.SESSION_STORE; // 'pg' to enable PostgreSQL store
const DATABASE_URL = process.env.DATABASE_URL;
const SESSION_DOMAIN = process.env.SESSION_DOMAIN;

const TRUST_PROXY = process.env.TRUST_PROXY === "1";
if (TRUST_PROXY) app.set("trust proxy", 1);

const OIDC_ISSUER = process.env.PROVIDER_EXTERNAL_URL;
const OIDC_PROVIDER_INTERNAL = process.env.PROVIDER_INTERNAL_URL; // Optional: for backend-to-provider communication
const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID;
const OIDC_CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET;
const OIDC_CALLBACK_URL = process.env.OIDC_CALLBACK_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;
const BACKEND_URL = process.env.BACKEND_URL;

// Validate required environment variables
const requiredEnvVars = [
  { name: 'PROVIDER_EXTERNAL_URL', value: OIDC_ISSUER },
  { name: 'OIDC_CLIENT_ID', value: OIDC_CLIENT_ID },
  { name: 'OIDC_CLIENT_SECRET', value: OIDC_CLIENT_SECRET },
  { name: 'OIDC_CALLBACK_URL', value: OIDC_CALLBACK_URL },
  { name: 'FRONTEND_URL', value: FRONTEND_URL },
  { name: 'BACKEND_URL', value: BACKEND_URL },
  { name: 'SESSION_SECRET', value: SESSION_SECRET }
];

const missingVars = requiredEnvVars.filter(envVar => !envVar.value);

if (missingVars.length > 0) {
  console.error('❌ [CONFIG] Missing required environment variables:');
  missingVars.forEach(envVar => {
    console.error(`   - ${envVar.name}`);
  });
  console.error('\n💡 Please set all required environment variables in your .env file');
  process.exit(1);
}

console.log('✅ [CONFIG] All required environment variables are set');

// Type assertions are safe here because we validated the variables above
const OIDC_ISSUER_VALIDATED = OIDC_ISSUER as string;
const OIDC_CLIENT_ID_VALIDATED = OIDC_CLIENT_ID as string;
const OIDC_CLIENT_SECRET_VALIDATED = OIDC_CLIENT_SECRET as string;
const OIDC_CALLBACK_URL_VALIDATED = OIDC_CALLBACK_URL as string;
const FRONTEND_URL_VALIDATED = FRONTEND_URL as string;
const BACKEND_URL_VALIDATED = BACKEND_URL as string;
const SESSION_SECRET_VALIDATED = SESSION_SECRET as string;
const SESSION_DOMAIN_VALIDATED = SESSION_DOMAIN as string;

// Use internal URL for backend-to-provider communication if provided, otherwise use external URL
const OIDC_PROVIDER_URL = OIDC_PROVIDER_INTERNAL || OIDC_ISSUER_VALIDATED;

if (OIDC_PROVIDER_INTERNAL) {
  console.log('🔗 [CONFIG] Using internal provider URL for backend communication:', OIDC_PROVIDER_URL);
  console.log('🔗 [CONFIG] Using external provider URL for browser:', OIDC_ISSUER_VALIDATED);
} else {
  console.log('🔗 [CONFIG] Using same provider URL for all communication:', OIDC_ISSUER_VALIDATED);
}

app.use(cors({ 
  origin: [
    FRONTEND_URL_VALIDATED
  ], 
  credentials: true 
}));

type UserSession = { 
  id: string; 
  name: string; 
  email: string; 
  companyId: string; 
  loginTime?: string;
};
declare global { namespace Express { interface User extends UserSession {} } }

// Configure session store - load PostgreSQL store dynamically if enabled
async function startServer() {
  let sessionStore: any = undefined;
  if (SESSION_STORE === 'pg' && DATABASE_URL) {
    try {
      const ConnectPgSimple = (await import('connect-pg-simple')).default(session);
      
      // Set NODE_TLS_REJECT_UNAUTHORIZED=0 to accept self-signed certificates
      // This is required for DigitalOcean managed databases with self-signed certs
      // The sslmode=require in DATABASE_URL is for PostgreSQL, not Node.js validation
      const originalReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      if (!originalReject) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        console.log('⚠️ [SESSION] Set NODE_TLS_REJECT_UNAUTHORIZED=0 for self-signed certificate support');
      }
      
      // Create a Pool with SSL configuration for DigitalOcean managed databases
      // Keep DATABASE_URL as-is (with sslmode=require) - it's for PostgreSQL
      // Node.js SSL validation is handled via NODE_TLS_REJECT_UNAUTHORIZED
      const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: {
          rejectUnauthorized: false  // Accept self-signed certificates (additional safety)
        }
      });
      
      // Test the pool connection to ensure SSL is configured correctly
      try {
        const testClient = await pool.connect();
        testClient.release();
        console.log('✅ [SESSION] PostgreSQL pool connection test successful');
      } catch (poolError: any) {
        console.error('❌ [SESSION] PostgreSQL pool connection test failed:', poolError?.message || poolError);
        if (originalReject) {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalReject;
        } else {
          delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        }
        throw poolError;
      }
      
      sessionStore = new ConnectPgSimple({
        pool: pool,
        tableName: 'session'
      });
      console.log('✅ [SESSION] Using PostgreSQL session store');
    } catch (error) {
      console.error('❌ [SESSION] Failed to initialize PostgreSQL session store:', error);
      console.log('⚠️ [SESSION] Falling back to memory store');
    }
  } else {
    console.log('⚠️ [SESSION] Using memory store (not recommended for production)');
  }

  app.use(session({
    store: sessionStore,
    secret: SESSION_SECRET_VALIDATED,
    resave: false,
    saveUninitialized: false,
    cookie: { 
      httpOnly: true, 
      sameSite: "lax", 
      secure: TRUST_PROXY,
      domain: TRUST_PROXY ? SESSION_DOMAIN_VALIDATED : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days (604800000 ms) - Increased from default to prevent unexpected redirects
    }
  }));
  
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use("oidc", new OpenIDConnectStrategy(
  {
    issuer: OIDC_ISSUER_VALIDATED,  // External URL for validation
    authorizationURL: `${OIDC_ISSUER_VALIDATED}/auth`,  // External URL - browser uses this
    tokenURL: `${OIDC_PROVIDER_URL}/token`,  // Internal URL if set - backend-to-provider
    userInfoURL: `${OIDC_PROVIDER_URL}/me`,  // Internal URL if set - backend-to-provider
    clientID: OIDC_CLIENT_ID_VALIDATED,
    clientSecret: OIDC_CLIENT_SECRET_VALIDATED,
    callbackURL: OIDC_CALLBACK_URL_VALIDATED,
    scope: "openid profile email",
    skipUserProfile: false,
  },
  async (issuer: string, profile: any, context: any, idToken: any, accessToken: any, refreshToken: any, params: any, done: any) => {
    console.log("🔍 [PASSPORT] ===== FULL CALLBACK DEBUG =====");
    console.log("🔍 [PASSPORT] Issuer:", issuer);
    console.log("🔍 [PASSPORT] Profile keys:", Object.keys(profile));
    console.log("🔍 [PASSPORT] Profile.id:", profile.id);
    console.log("🔍 [PASSPORT] Profile.displayName:", profile.displayName);
    console.log("🔍 [PASSPORT] Profile.name:", profile.name);
    console.log("🔍 [PASSPORT] Profile.emails:", profile.emails);
    console.log("🔍 [PASSPORT] Profile.company_id:", profile.company_id);
    console.log("🔍 [PASSPORT] Full profile:", JSON.stringify(profile, null, 2));

    // Decode the ID token JWT to get the claims (including company_id)
    // Using jwt.decode() which doesn't verify signature (Passport already validated it)
    let decodedIdToken: any = null;
    if (idToken && typeof idToken === 'string') {
      try {
        decodedIdToken = jwt.decode(idToken);
        console.log("✅ [PASSPORT] Decoded ID Token claims:", JSON.stringify(decodedIdToken, null, 2));
      } catch (err) {
        console.error("❌ [PASSPORT] Error decoding ID token:", err);
      }
    }

    // Extract login time from ID token (auth_time or iat)
    let loginTime: string | undefined;
    if (decodedIdToken) {
      const authTime = decodedIdToken.auth_time || decodedIdToken.iat;
      if (authTime) {
        // Convert Unix timestamp to ISO 8601 string
        loginTime = new Date(authTime * 1000).toISOString();
        console.log("🔍 [PASSPORT] Login time extracted:", loginTime);
      }
    }

    const user: UserSession = {
      id: profile.id || "unknown",
      name: profile.displayName || profile.name || "unknown",
      email: (profile.emails && profile.emails[0]?.value) || profile.email || profile.id || "unknown",
      // Try multiple sources for company_id: decoded ID token first, then profile, then params
      companyId: (decodedIdToken && decodedIdToken.company_id) || profile.company_id || (params && params.company_id) || "UNKNOWN-COMPANY",
      loginTime: loginTime,
    };

    console.log("🔍 [PASSPORT] Mapped user session:", JSON.stringify(user, null, 2));
    return done(null, user);
  }
));

  passport.serializeUser((user: any, done) => done(null, user));
  passport.deserializeUser((obj: any, done) => done(null, obj));

  // Rutas de autenticación
  app.get("/auth/login", (req: Request, res: Response) => {
    console.log("🔍 [LOGIN] Starting OIDC authentication");
    console.log("🔍 [LOGIN] Request from:", req.get('referer') || 'direct');
    passport.authenticate("oidc")(req, res);
  });

  app.get("/auth/callback",
    passport.authenticate("oidc", { failureRedirect: "/auth/failure" }),
    (req: Request, res: Response) => {
      console.log("🔍 [CALLBACK] OIDC authentication successful");
      console.log("🔍 [CALLBACK] User:", req.user ? "authenticated" : "none");
      console.log("🔍 [CALLBACK] Redirecting to frontend:", FRONTEND_URL_VALIDATED);
      res.redirect(FRONTEND_URL_VALIDATED);
    }
  );

  app.get("/auth/failure", (_req: Request, res: Response) => {
    res.status(401).send(`
      <html>
        <head><title>Error de Autenticación</title></head>
        <body style="font-family: sans-serif; margin: 40px; max-width: 420px;">
          <h3 style="color: #dc3545;">❌ Error de Autenticación</h3>
          <p>No se pudo completar el proceso de login.</p>
          <a href="${FRONTEND_URL_VALIDATED}" style="color: #007bff;">← Volver al inicio</a>
        </body>
      </html>
    `);
  });

  app.get("/auth/logout", (req: Request, res: Response) => { 
    console.log("🔍 [LOGOUT] Starting logout process");
    console.log("🔍 [LOGOUT] User session:", req.user ? "exists" : "none");
    
    // Get the ID Token from the session if available
    const idToken = req.user ? (req.user as any).id_token : undefined;
    console.log("🔍 [LOGOUT] ID Token available:", idToken ? "yes" : "no");
    
    req.logout((err) => {
      if (err) {
        console.error("❌ [LOGOUT] Error during backend logout:", err);
        return res.status(500).json({ success: false, message: "Logout failed" });
      }
      
      console.log("✅ [LOGOUT] Backend session cleared successfully");
      
      // Construct the OIDC Provider's end session URL
      const OIDC_END_SESSION_ENDPOINT = `${OIDC_ISSUER_VALIDATED}/session/end`;
      const POST_LOGOUT_REDIRECT_URI = `${BACKEND_URL_VALIDATED}/auth/login`;
      
      let logoutUrl = `${OIDC_END_SESSION_ENDPOINT}?post_logout_redirect_uri=${encodeURIComponent(POST_LOGOUT_REDIRECT_URI)}`;
      
      if (idToken) {
        logoutUrl += `&id_token_hint=${idToken}`;
        console.log("🔍 [LOGOUT] Added id_token_hint to logout URL");
      }
      
      console.log("🔍 [LOGOUT] OIDC logout URL:", logoutUrl);
      console.log("🔍 [LOGOUT] Will redirect to:", POST_LOGOUT_REDIRECT_URI);
      
      // Return the OIDC Provider's logout URL to the frontend for redirection
      res.json({
        success: true,
        message: "Logged out successfully from backend. Redirecting to OIDC Provider for full logout.",
        redirect_url: logoutUrl
      });
    }); 
  });

  // Helper function to fetch company name from provider public API
  async function getCompanyName(companyId: string): Promise<string | null> {
    try {
      const url = `${OIDC_PROVIDER_URL}/api/company/${companyId}`;
      console.log("🔍 [COMPANY] Fetching company from:", url);
      
      const response = await fetch(url);
      
      if (response.ok) {
        const company = await response.json();
        console.log("✅ [COMPANY] Company data:", JSON.stringify(company, null, 2));
        return company.company_name;
      } else {
        console.log("❌ [COMPANY] API returned status:", response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ [COMPANY] Error fetching company name:', error);
      return null;
    }
  }

  // API protegida
  app.get("/api/me", async (req: Request, res: Response) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ 
        error: "not_authenticated", 
        message: "Usuario no autenticado",
        login_url: `${BACKEND_URL_VALIDATED}/auth/login`
      });
    }
    
    const user = req.user as any;
    console.log("🔍 [API/ME] User from session:", JSON.stringify(user, null, 2));

    let companyName = user.companyId || 'N/A'; // ✅ Correct property

    // Try to resolve company name
    if (user.companyId && user.companyId !== 'UNKNOWN-COMPANY') {
      console.log("🔍 [API/ME] Fetching company name for:", user.companyId);
      const resolvedName = await getCompanyName(user.companyId);
      if (resolvedName) {
        companyName = resolvedName;
        console.log("✅ [API/ME] Resolved company name:", companyName);
      } else {
        console.log("❌ [API/ME] Could not resolve company name");
      }
    }

    res.json({
      name: user.name,
      email: user.email,
      companyId: user.companyId,
      companyName: companyName,
      login_time: user.loginTime,
      authenticated: true,
      response_time: new Date().toISOString()
    });
  });

  // Health check
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ 
      status: "ok", 
      service: "backend-api", 
      port: 4009,
      oidc_provider: OIDC_ISSUER_VALIDATED
    });
  });

  // Info endpoint
  app.get("/api/info", (_req: Request, res: Response) => {
    res.json({
      service: "OIDC Backend API",
      version: "1.0.0",
      endpoints: {
        auth: {
          login: "/auth/login",
          callback: "/auth/callback", 
          logout: "/auth/logout",
          failure: "/auth/failure"
        },
        api: {
          me: "/api/me",
          info: "/api/info"
        },
        health: "/health"
      },
      oidc: {
        issuer: OIDC_ISSUER_VALIDATED,
        client_id: OIDC_CLIENT_ID_VALIDATED
      }
    });
  });

  app.listen(8080, () => {
    console.log(`🚀 Backend API iniciado en ${BACKEND_URL_VALIDATED}`);
    console.log(`🔐 Login: ${BACKEND_URL_VALIDATED}/auth/login`);
    console.log(`👤 API Me: ${BACKEND_URL_VALIDATED}/api/me`);
    console.log(`📊 Health: ${BACKEND_URL_VALIDATED}/health`);
    console.log("🔗 OIDC Issuer: " + OIDC_ISSUER_VALIDATED);
  });
}

// Start the server
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
