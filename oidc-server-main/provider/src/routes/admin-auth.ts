import { Router, Request, Response } from 'express';
import { db } from '../services/database.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { normalizeEmail } from '../utils/email.js';

const router = Router();

// Dummy bcrypt hash for timing attack mitigation
// This is a valid bcrypt hash of the string "dummy-password-for-timing-attack-prevention"
const DUMMY_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

// Admin login (username/password, NOT OIDC)
// Supports both username and email for backward compatibility
router.post('/login', async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  const ip = req.ip;
  const userAgent = req.get('user-agent');

  // Support both 'username' and 'email' fields for login (backward compatibility)
  let loginIdentifier = username || email;

  // Input validation
  if (!loginIdentifier || typeof loginIdentifier !== 'string' || loginIdentifier.trim() === '' ||
      !password || typeof password !== 'string' || password.trim() === '') {
    return res.status(400).json({ error: 'Usuario (o correo electrónico) y contraseña son requeridos' });
  }

  try {
    const canAttempt = await db.checkRateLimit(ip || 'unknown', 'ip', 'admin_login');
    if (!canAttempt) {
      return res.status(429).json({ error: 'Demasiados intentos de inicio de sesión. Intente nuevamente más tarde.' });
    }

    // Try username first, then email (for backward compatibility)
    // If loginIdentifier looks like an email, normalize it before searching
    let adminUser = await db.getAdminUserByUsername(loginIdentifier);
    if (!adminUser) {
      // If it's an email, normalize it before searching
      try {
        const normalizedEmail = normalizeEmail(loginIdentifier);
        adminUser = await db.getAdminUserByEmail(normalizedEmail);
      } catch {
        // If normalization fails, try with original value (might be username)
        adminUser = await db.getAdminUserByEmail(loginIdentifier);
      }
    }
    
    // To prevent timing attacks, always perform bcrypt comparison
    // Use dummy hash if user doesn't exist or is inactive
    const isUserValid = adminUser && adminUser.is_active;
    const hashToCompare = isUserValid && adminUser ? adminUser.password_hash : DUMMY_HASH;
    const isValid = await bcrypt.compare(password, hashToCompare);
    
    // Early check: if user is missing or inactive, fail regardless of password
    if (!isUserValid || !adminUser) {
      await db.logAudit({
        action: 'admin_login_failed',
        details: { username: loginIdentifier, reason: 'user_not_found' },
        ip_address: ip,
        user_agent: userAgent,
        success: false
      });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // At this point, adminUser is guaranteed to be non-null
    if (adminUser.locked_until && new Date(adminUser.locked_until) > new Date()) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'admin_login_denied',
        details: { 
          username: loginIdentifier, 
          reason: 'account_locked', 
          outcome: 'denied',
          status_code: 423,
          locked_until: adminUser.locked_until
        },
        ip_address: ip || 'unknown',
        user_agent: userAgent,
        success: false
      });
      return res.status(423).json({ error: 'Cuenta temporalmente bloqueada' });
    }
    
    if (!isValid) {
      await db.incrementAdminFailedLoginAttempts(adminUser.username);
      // Don't log admin_user_id as session isn't valid
      await db.logAudit({
        user_email: adminUser.email,
        action: 'admin_login_failed',
        details: { username: loginIdentifier, reason: 'invalid_password' },
        ip_address: ip,
        user_agent: userAgent,
        success: false
      });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    await db.createAdminSession({
      session_token: sessionToken,
      admin_user_id: adminUser.id,
      ip_address: ip,
      user_agent: userAgent,
      expires_at: expiresAt
    });

    await db.updateAdminLoginSuccess(adminUser.id);
    await db.logAudit({
      admin_user_id: adminUser.id,
      user_email: adminUser.email,
      action: 'admin_login_success',
      details: { username: loginIdentifier, actual_username: adminUser.username },
      ip_address: ip,
      user_agent: userAgent,
      success: true
    });

    res.cookie('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      admin: {
        id: adminUser.id,
        username: adminUser.username,
        full_name: adminUser.full_name,
        email: adminUser.email,
        is_super_admin: adminUser.is_super_admin
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  const sessionToken = req.cookies.admin_session;
  
  try {
    if (sessionToken) {
      // Fetch session info first to get non-sensitive identifiers
      const session = await db.getAdminSession(sessionToken);
      
      // Invalidate the session
      await db.invalidateAdminSession(sessionToken);
      
      // Log audit with non-sensitive identifiers
      if (session) {
        await db.logAudit({
          admin_user_id: session.admin_user_id,
          action: 'admin_logout',
          details: { session_id: session.id },
          success: true
        });
      } else {
        // Session not found or already expired, but still log the logout attempt
        await db.logAudit({
          action: 'admin_logout',
          details: { note: 'session_not_found' },
          success: true
        });
      }
    }
    
    // Always clear cookie and send success on normal flow
    res.clearCookie('admin_session');
    res.json({ success: true });
  } catch (error) {
    console.error('Admin logout error:', error);
    // Always clear cookie even on error
    res.clearCookie('admin_session');
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  const sessionToken = req.cookies.admin_session;
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'No hay sesión de administrador' });
  }
  
  try {
    const session = await db.getAdminSession(sessionToken);
    if (!session || !session.is_active || new Date(session.expires_at) < new Date()) {
      res.clearCookie('admin_session');
      return res.status(401).json({ error: 'Sesión inválida o expirada' });
    }
    
    const adminUser = await db.getAdminUserById(session.admin_user_id);
    if (!adminUser) {
      res.clearCookie('admin_session');
      return res.status(401).json({ error: 'Usuario administrador no encontrado' });
    }
    
    // Check if admin user is active
    if (!adminUser.is_active) {
      res.clearCookie('admin_session');
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'admin_session_rejected',
        details: { reason: 'user_inactive' },
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        success: false
      });
      return res.status(401).json({ error: 'El usuario administrador está inactivo' });
    }

    if (adminUser.locked_until && new Date(adminUser.locked_until) > new Date()) {
      res.clearCookie('admin_session');
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'admin_session_rejected',
        details: { reason: 'user_locked' },
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        success: false
      });
      return res.status(423).json({ error: 'El usuario administrador está bloqueado' });
    }

    res.json({
      id: adminUser.id,
      username: adminUser.username,
      full_name: adminUser.full_name,
      email: adminUser.email,
      is_super_admin: adminUser.is_super_admin
    });
  } catch (error) {
    console.error('Admin /me endpoint error:', error);
    res.clearCookie('admin_session');
    res.status(500).json({ error: 'Error al obtener información del usuario administrador' });
  }
});

export default router;
