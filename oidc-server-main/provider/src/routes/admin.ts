import { Router, Request, Response } from 'express';
import { db } from '../services/database.js';
import bcrypt from 'bcrypt';
import { normalizeEmail } from '../utils/email.js';

const router = Router();

// Email validation regex (RFC 5322 compliant basic pattern)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Company ID regex: UUID v4 format (format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
// Supports both UUIDs (new format) and legacy numeric IDs for backward compatibility
const COMPANY_ID_REGEX = /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|\d+)$/i;

// Client ID regex: alphanumeric, underscores, hyphens only
const CLIENT_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * Validates and sanitizes a string input
 */
interface StringValidationOptions {
  fieldName: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  pattern?: RegExp;
  patternDescription?: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  value?: string;
}

function validateString(input: any, options: StringValidationOptions): ValidationResult {
  const { fieldName, minLength = 1, maxLength = 255, required = true, pattern, patternDescription } = options;
  
  // Check presence
  if (input === undefined || input === null || input === '') {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, value: '' };
  }
  
  // Check type
  if (typeof input !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  // Trim whitespace
  const trimmed = input.trim();
  
  // Check if empty after trim
  if (trimmed === '' && required) {
    return { valid: false, error: `${fieldName} cannot be empty or whitespace only` };
  }
  
  // Check length
  if (trimmed.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters long` };
  }
  
  if (trimmed.length > maxLength) {
    return { valid: false, error: `${fieldName} must not exceed ${maxLength} characters` };
  }
  
  // Check pattern
  if (pattern && !pattern.test(trimmed)) {
    const msg = patternDescription || `${fieldName} contains invalid characters`;
    return { valid: false, error: msg };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Validates a positive integer ID
 */
function validatePositiveInteger(input: any, fieldName: string): ValidationResult {
  if (input === undefined || input === null || input === '') {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const num = Number(input);
  
  if (!Number.isInteger(num) || num <= 0) {
    return { valid: false, error: `${fieldName} must be a positive integer` };
  }
  
  return { valid: true, value: String(num) };
}

/**
 * Validates a boolean value
 */
function validateBoolean(input: any, fieldName: string, required: boolean = true): ValidationResult {
  if (input === undefined || input === null) {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, value: undefined };
  }
  
  if (typeof input !== 'boolean') {
    return { valid: false, error: `${fieldName} must be a boolean` };
  }
  
  return { valid: true, value: String(input) };
}

/**
 * Validates a URL
 */
function validateUrl(input: any, fieldName: string, required: boolean = true): ValidationResult {
  if (!input) {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, value: '' };
  }
  
  if (typeof input !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  const trimmed = input.trim();
  
  try {
    const url = new URL(trimmed);
    if (!url.protocol.startsWith('http')) {
      return { valid: false, error: `${fieldName} must use http or https protocol` };
    }
    return { valid: true, value: trimmed };
  } catch {
    return { valid: false, error: `${fieldName} must be a valid URL` };
  }
}

/**
 * Validates an array of URLs (comma or space separated)
 * Accepts both string and array inputs
 */
function validateUrlArray(input: any, fieldName: string, required: boolean = true): ValidationResult {
  if (!input) {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, value: '' };
  }
  
  // Convert array to string if needed
  let stringInput: string;
  if (Array.isArray(input)) {
    // Filter out empty values and join with comma
    stringInput = input.filter((url: any) => url && typeof url === 'string' && url.trim().length > 0).join(',');
  } else if (typeof input === 'string') {
    stringInput = input;
  } else {
    return { valid: false, error: `${fieldName} must be a string or an array` };
  }
  
  const trimmed = stringInput.trim();
  if (!trimmed && required) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  // Split by comma or space and validate each URL
  const urls = trimmed.split(/[\s,]+/).filter(u => u.length > 0);
  
  for (const url of urls) {
    const result = validateUrl(url, fieldName, false);
    if (!result.valid) {
      return { valid: false, error: `${fieldName} contains invalid URL: ${url}` };
    }
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Converts a comma-separated string to an array for PostgreSQL TEXT[] fields
 */
function stringToArray(input: string | undefined | null): string[] {
  if (!input || typeof input !== 'string') {
    return [];
  }
  return input
    .split(/[\s,]+/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

/**
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  try {
    const normalized = normalizeEmail(email);
    return EMAIL_REGEX.test(normalized);
  } catch {
    return false;
  }
}

/**
 * Validates password strength according to Spanish Esquema Nacional de Seguridad (ENS) requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special symbol
 */
function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }
  
  // Minimum length (ENS requirement)
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // At least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // At least one digit
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  
  // At least one special symbol
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'`~]/.test(password)) {
    errors.push('Password must contain at least one special symbol (!@#$%^&*(),.?":{}|<>_-+=[]\\\/;\'`~)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates company_id format
 * Accepts UUID v4 format (new format) or legacy positive integers (backward compatibility)
 */
function isValidCompanyId(company_id: any): boolean {
  if (!company_id || typeof company_id !== 'string') {
    return false;
  }
  
  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(company_id)) {
    return true;
  }
  
  // Legacy: positive integer (for backward compatibility)
  const num = Number(company_id);
  return Number.isInteger(num) && num > 0;
}

async function requireAdminSession(req: Request, res: Response, next: any) {
  const sessionToken = req.cookies.admin_session;
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'Sesión de administrador requerida' });
  }
  
  const session = await db.getAdminSession(sessionToken);
  if (!session || !session.is_active || new Date(session.expires_at) < new Date()) {
    res.clearCookie('admin_session');
    return res.status(401).json({ error: 'Sesión de administrador inválida o expirada' });
  }
  
  const adminUser = await db.getAdminUserById(session.admin_user_id);
  if (!adminUser || !adminUser.is_active) {
    return res.status(403).json({ error: 'Usuario administrador no activo' });
  }
  
  (req as any).adminUser = adminUser;
  next();
}

// Companies
router.get('/companies', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const companies = await db.getAllCompanies();
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener empresas' });
  }
});

router.post('/companies', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { company_name } = req.body;
    const adminUser = (req as any).adminUser;
    
    // Validate company_name (company_id is now auto-generated)
    const companyNameValidation = validateString(company_name, {
      fieldName: 'company_name',
      minLength: 1,
      maxLength: 255
    });
    
    if (!companyNameValidation.valid) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'company_creation_failed',
        details: { 
          reason: 'validation_error',
          field: 'company_name',
          error: companyNameValidation.error,
          attempted_company_name: company_name
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: companyNameValidation.error,
        field: 'company_name'
      });
    }
    
    // Create company with auto-generated company_id
    const company = await db.createCompany({ 
      company_name: companyNameValidation.value! 
    });
    
    await db.logAudit({
      admin_user_id: adminUser.id,
      user_email: adminUser.email,
      action: 'company_created',
      details: { 
        company_id: company.company_id, 
        company_name: companyNameValidation.value 
      },
      success: true
    });
    
    res.json(company);
  } catch (error) {
    const adminUser = (req as any).adminUser;
    if (adminUser) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'company_creation_failed',
        details: { 
          reason: 'unexpected_error',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        },
        success: false
      });
    }
    res.status(500).json({ error: 'Error al crear empresa' });
  }
});

// Get active companies for dropdown (MUST be before parametric routes)
router.get('/companies/dropdown/active', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const companies = await db.getActiveCompaniesForDropdown();
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener empresas' });
  }
});

router.put('/companies/:id', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { company_id, company_name, is_active } = req.body;
    const adminUser = (req as any).adminUser;
    
    const updates: any = {};
    
    // Validate company_id if provided
    // Note: company_id should not be changed manually as it's now UUID-based
    // This validation is mainly for backward compatibility
    if (company_id !== undefined) {
      if (!isValidCompanyId(company_id)) {
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'company_update_failed',
          details: { 
            reason: 'validation_error',
            field: 'company_id',
            error: 'Formato de company_id inválido. Debe ser un UUID v4 válido o un número entero positivo.',
            company_id: id
          },
          success: false
        });
        
        return res.status(400).json({ 
          error: 'Formato de company_id inválido',
          message: 'company_id debe ser un UUID v4 válido o un número entero positivo',
          field: 'company_id'
        });
      }
      
      // Warn but allow UUID format (should not be changed manually)
      const companyIdValidation = validateString(company_id, {
        fieldName: 'company_id',
        minLength: 1,
        maxLength: 255, // Increased for UUID format (36 chars)
        pattern: COMPANY_ID_REGEX,
        patternDescription: 'company_id debe ser un UUID v4 válido o un número entero positivo'
      });
      
      if (!companyIdValidation.valid) {
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'company_update_failed',
          details: { 
            reason: 'validation_error',
            field: 'company_id',
            error: companyIdValidation.error,
            company_id: id
          },
          success: false
        });
        
        return res.status(400).json({ 
          error: companyIdValidation.error,
          field: 'company_id'
        });
      }
      
      updates.company_id = companyIdValidation.value;
    }
    
    // Validate company_name if provided
    if (company_name !== undefined) {
      const companyNameValidation = validateString(company_name, {
        fieldName: 'company_name',
        minLength: 1,
        maxLength: 255
      });
      
      if (!companyNameValidation.valid) {
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'company_update_failed',
          details: { 
            reason: 'validation_error',
            field: 'company_name',
            error: companyNameValidation.error,
            company_id: id
          },
          success: false
        });
        
        return res.status(400).json({ 
          error: companyNameValidation.error,
          field: 'company_name'
        });
      }
      
      updates.company_name = companyNameValidation.value;
    }
    
    // Validate is_active if provided
    if (is_active !== undefined) {
      const isActiveValidation = validateBoolean(is_active, 'is_active', false);
      
      if (!isActiveValidation.valid) {
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'company_update_failed',
          details: { 
            reason: 'validation_error',
            field: 'is_active',
            error: isActiveValidation.error,
            company_id: id
          },
          success: false
        });
        
        return res.status(400).json({ 
          error: isActiveValidation.error,
          field: 'is_active'
        });
      }
      
      updates.is_active = is_active;
    }
    
    // Ensure at least one field is being updated
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ 
        error: 'No valid fields to update',
        message: 'At least one field (company_id, company_name, is_active) must be provided'
      });
    }
    
    const company = await db.updateCompany(id, updates);
    
    await db.logAudit({
      admin_user_id: adminUser.id,
      user_email: adminUser.email,
      action: 'company_updated',
      details: { company_id: id, updates },
      success: true
    });
    
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar empresa' });
  }
});

router.delete('/companies/:id', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser;
    
    // Use new validation method instead of direct delete
    const result = await db.deleteCompanyWithValidation(id, adminUser.id);
    
    if (result.success) {
      const message = result.usersDeleted && result.usersDeleted > 0
        ? `Company deleted successfully. ${result.usersDeleted} user(s) have been deleted.`
        : 'Company deleted successfully';
      
      res.json({ 
        success: true, 
        message,
        usersDeactivated: result.usersDeactivated || 0,
        usersDeleted: result.usersDeleted || 0
      });
    } else {
      res.status(400).json({ success: false, error: result.error, userCount: result.userCount });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar empresa' });
  }
});

// Revoke all access for a company (all clients)
router.delete('/companies/:id/access', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser;
    
    // Validate company_id
    if (!isValidCompanyId(id)) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'company_access_revoke_all_failed',
        details: { 
          reason: 'validation_error',
          field: 'company_id',
          error: 'Invalid company_id format',
          company_id: id
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: 'ID de empresa inválido',
        message: 'El ID de empresa debe ser un UUID v4 válido o un número entero positivo'
      });
    }
    
    // Verify company exists
    const company = await db.getCompanyByCompanyId(id);
    if (!company) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'company_access_revoke_all_failed',
        details: { 
          reason: 'company_not_found',
          company_id: id
        },
        success: false
      });
      
      return res.status(404).json({ 
        error: 'Empresa no encontrada',
        field: 'company_id'
      });
    }
    
    // Revoke all access
    const revokeResult = await db.revokeAllCompanyAccess(id);
    
    await db.logAudit({
      admin_user_id: adminUser.id,
      user_email: adminUser.email,
      action: 'company_all_access_revoked',
      details: { 
        company_id: id,
        company_name: company.company_name,
        sessions_invalidated_count: revokeResult.sessionsInvalidated,
        access_revoked_count: revokeResult.accessRevoked
      },
      success: true
    });
    
    res.json({ 
      success: true,
      sessionsInvalidated: revokeResult.sessionsInvalidated,
      accessRevoked: revokeResult.accessRevoked
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al revocar todo el acceso' });
  }
});

// Toggle company status (inline from grid)
router.patch('/companies/:id/toggle-status', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const adminUser = (req as any).adminUser;
    
    // Validate is_active
    const isActiveValidation = validateBoolean(is_active, 'is_active', true);
    
    if (!isActiveValidation.valid) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'company_toggle_status_failed',
        details: { 
          reason: 'validation_error',
          field: 'is_active',
          error: isActiveValidation.error,
          company_id: id
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: isActiveValidation.error,
        field: 'is_active'
      });
    }
    
    const company = await db.toggleCompanyStatus(id, is_active, adminUser.id);
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado de empresa' });
  }
});

// Get users for a specific company
router.get('/companies/:id/users', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const users = await db.getUsersByCompanyId(id);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios de la empresa' });
  }
});

// Validate company before user creation
router.get('/companies/:id/validate', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exists = await db.validateCompanyExists(id);
    res.json({ valid: exists });
  } catch (error) {
    res.status(500).json({ error: 'Validación fallida' });
  }
});

// Clients
router.get('/clients', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const clients = await db.getOIDCClients();
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

router.post('/clients', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { client_id, client_name, client_secret, redirect_uris, post_logout_redirect_uris, grant_types, token_endpoint_auth_method } = req.body;
    const adminUser = (req as any).adminUser;
    
    // Validate client_id
    const clientIdValidation = validateString(client_id, {
      fieldName: 'client_id',
      minLength: 1,
      maxLength: 100,
      pattern: CLIENT_ID_REGEX,
      patternDescription: 'client_id can only contain alphanumeric characters, underscores, and hyphens'
    });
    
    if (!clientIdValidation.valid) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'client_creation_failed',
        details: { 
          reason: 'validation_error',
          field: 'client_id',
          error: clientIdValidation.error
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: clientIdValidation.error,
        field: 'client_id'
      });
    }
    
    // Validate client_name
    const clientNameValidation = validateString(client_name, {
      fieldName: 'client_name',
      minLength: 1,
      maxLength: 255
    });
    
    if (!clientNameValidation.valid) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'client_creation_failed',
        details: { 
          reason: 'validation_error',
          field: 'client_name',
          error: clientNameValidation.error
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: clientNameValidation.error,
        field: 'client_name'
      });
    }
    
    // Validate client_secret
    const clientSecretValidation = validateString(client_secret, {
      fieldName: 'client_secret',
      minLength: 8,
      maxLength: 255
    });
    
    if (!clientSecretValidation.valid) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'client_creation_failed',
        details: { 
          reason: 'validation_error',
          field: 'client_secret',
          error: clientSecretValidation.error
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: clientSecretValidation.error,
        field: 'client_secret'
      });
    }
    
    // Validate redirect_uris
    const redirectUrisValidation = validateUrlArray(redirect_uris, 'redirect_uris', true);
    
    if (!redirectUrisValidation.valid) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'client_creation_failed',
        details: { 
          reason: 'validation_error',
          field: 'redirect_uris',
          error: redirectUrisValidation.error
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: redirectUrisValidation.error,
        field: 'redirect_uris'
      });
    }
    
    // Validate post_logout_redirect_uris (optional)
    let postLogoutValidation: ValidationResult | null = null;
    if (post_logout_redirect_uris) {
      postLogoutValidation = validateUrlArray(post_logout_redirect_uris, 'post_logout_redirect_uris', false);
      
      if (!postLogoutValidation.valid) {
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'client_creation_failed',
          details: { 
            reason: 'validation_error',
            field: 'post_logout_redirect_uris',
            error: postLogoutValidation.error
          },
          success: false
        });
        
        return res.status(400).json({ 
          error: postLogoutValidation.error,
          field: 'post_logout_redirect_uris'
        });
      }
    }
    
    // Validate grant_types
    const grantTypesValidation = validateString(grant_types, {
      fieldName: 'grant_types',
      minLength: 1,
      maxLength: 255,
      required: false
    });
    
    if (!grantTypesValidation.valid) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'client_creation_failed',
        details: { 
          reason: 'validation_error',
          field: 'grant_types',
          error: grantTypesValidation.error
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: grantTypesValidation.error,
        field: 'grant_types'
      });
    }
    
    // Validate token_endpoint_auth_method
    const authMethodValidation = validateString(token_endpoint_auth_method, {
      fieldName: 'token_endpoint_auth_method',
      minLength: 1,
      maxLength: 50,
      required: false
    });
    
    if (!authMethodValidation.valid) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'client_creation_failed',
        details: { 
          reason: 'validation_error',
          field: 'token_endpoint_auth_method',
          error: authMethodValidation.error
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: authMethodValidation.error,
        field: 'token_endpoint_auth_method'
      });
    }
    
    // Build sanitized client data
    // Convert strings to arrays for PostgreSQL TEXT[] fields
    const sanitizedClientData: any = {
      client_id: clientIdValidation.value,
      client_name: clientNameValidation.value,
      client_secret: clientSecretValidation.value,
      redirect_uris: stringToArray(redirectUrisValidation.value),
      response_types: ['code'], // Default value
      allowed_scopes: ['openid', 'profile', 'email'], // Default value
      created_by: adminUser.id
    };
    
    if (postLogoutValidation && postLogoutValidation.valid && postLogoutValidation.value) {
      sanitizedClientData.post_logout_redirect_uris = stringToArray(postLogoutValidation.value);
    }
    
    if (grantTypesValidation.value) {
      sanitizedClientData.grant_types = stringToArray(grantTypesValidation.value);
    }
    
    if (authMethodValidation.value) {
      sanitizedClientData.token_endpoint_auth_method = authMethodValidation.value;
    }
    
    const client = await db.createOIDCClient(sanitizedClientData);
    
    await db.logAudit({
      admin_user_id: adminUser.id,
      user_email: adminUser.email,
      client_id: client.client_id,
      action: 'client_created',
      details: { 
        client_id: clientIdValidation.value, 
        client_name: clientNameValidation.value 
      },
      success: true
    });
    
    res.json(client);
  } catch (error: any) {
    // Log the actual error for debugging
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ Failed to create OIDC client`);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint
    });
    
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

router.put('/clients/:id', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { client_id, client_name, client_description, client_secret, redirect_uris, post_logout_redirect_uris, grant_types, token_endpoint_auth_method, frontend_url, is_active } = req.body;
    const adminUser = (req as any).adminUser;
    
    // Get current client to compare values and only update what changed
    const currentClient = await db.getOIDCClientById(parseInt(id));
    if (!currentClient) {
      return res.status(404).json({ 
        error: 'Cliente no encontrado',
        message: `No se encontró un cliente con el ID ${id}`
      });
    }
    
    // Helper function to compare arrays (order-independent)
    const arraysEqual = (a: string[], b: string[]): boolean => {
      if (!a && !b) return true;
      if (!a || !b) return false;
      if (a.length !== b.length) return false;
      const sortedA = [...a].sort();
      const sortedB = [...b].sort();
      return sortedA.every((val, idx) => val === sortedB[idx]);
    };
    
    const updates: any = {};
    
    // Note: client_id cannot be updated once created
    // It's used as a foreign key reference in company_client_access and audit_logs
    // If client_id is provided in the update request, we simply ignore it (don't reject the request)
    // This allows the frontend to send client_id for consistency without breaking the update
    if (client_id !== undefined && client_id !== currentClient.client_id) {
      // Log a warning but don't fail the request
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'client_update_warning',
        details: { 
          reason: 'immutable_field_ignored',
          field: 'client_id',
          message: 'client_id was provided in update but ignored (immutable field)',
          provided_client_id: client_id,
          current_client_id: currentClient.client_id,
          client_id: id
        },
        success: true
      });
      
      // Note: We don't return an error here, we just ignore the client_id
      // The update will proceed with the other fields
    }
    
    // Validate client_name if provided
    if (client_name !== undefined) {
      const clientNameValidation = validateString(client_name, {
        fieldName: 'client_name',
        minLength: 1,
        maxLength: 255
      });
      
      if (!clientNameValidation.valid) {
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'client_update_failed',
          details: { 
            reason: 'validation_error',
            field: 'client_name',
            error: clientNameValidation.error,
            client_id: id
          },
          success: false
        });
        
        return res.status(400).json({ 
          error: clientNameValidation.error || 'El nombre del cliente no es válido',
          field: 'client_name',
          message: 'El nombre del cliente es requerido y debe tener entre 1 y 255 caracteres'
        });
      }
      
      // Only update if value actually changed
      if (clientNameValidation.value !== currentClient.client_name) {
        updates.client_name = clientNameValidation.value;
      }
    }
    
    // Validate client_description if provided
    if (client_description !== undefined) {
      const clientDescriptionValidation = validateString(client_description, {
        fieldName: 'client_description',
        minLength: 0,
        maxLength: 1000,
        required: false
      });
      
      if (!clientDescriptionValidation.valid) {
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'client_update_failed',
          details: { 
            reason: 'validation_error',
            field: 'client_description',
            error: clientDescriptionValidation.error,
            client_id: id
          },
          success: false
        });
        
        return res.status(400).json({ 
          error: clientDescriptionValidation.error || 'La descripción del cliente no es válida',
          field: 'client_description',
          message: 'La descripción del cliente no puede exceder 1000 caracteres'
        });
      }
      
      // Only update if value actually changed
      const currentDescription = currentClient.client_description || '';
      const newDescription = clientDescriptionValidation.value || '';
      if (newDescription !== currentDescription) {
        updates.client_description = newDescription;
      }
    }
    
    // Validate client_secret if provided
    if (client_secret !== undefined && client_secret.trim() !== '') {
      const clientSecretValidation = validateString(client_secret, {
        fieldName: 'client_secret',
        minLength: 8,
        maxLength: 255
      });
      
      if (!clientSecretValidation.valid) {
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'client_update_failed',
          details: { 
            reason: 'validation_error',
            field: 'client_secret',
            error: clientSecretValidation.error,
            client_id: id
          },
          success: false
        });
        
        return res.status(400).json({ 
          error: clientSecretValidation.error || 'El secreto del cliente no es válido',
          field: 'client_secret',
          message: 'El secreto del cliente debe tener al menos 8 caracteres'
        });
      }
      
      // Only update if value actually changed (don't compare hashed values, just check if provided)
      // Note: We can't compare secrets directly, so if a new one is provided, update it
      updates.client_secret = clientSecretValidation.value;
    }
    
    // Validate redirect_uris if provided
    if (redirect_uris !== undefined) {
      // Handle both array and string inputs
      const redirectUrisInput = Array.isArray(redirect_uris) 
        ? redirect_uris.join(',')
        : redirect_uris;
      
      const redirectUrisValidation = validateUrlArray(redirectUrisInput, 'redirect_uris', true);
      
      if (!redirectUrisValidation.valid) {
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'client_update_failed',
          details: { 
            reason: 'validation_error',
            field: 'redirect_uris',
            error: redirectUrisValidation.error,
            client_id: id
          },
          success: false
        });
        
        return res.status(400).json({ 
          error: redirectUrisValidation.error || 'Las URLs de redirección contienen valores inválidos',
          field: 'redirect_uris',
          message: 'Por favor, verifica que todas las URLs de redirección sean válidas (formato: http:// o https://)'
        });
      }
      
      // Convert string to array for PostgreSQL TEXT[]
      const newRedirectUris = stringToArray(redirectUrisValidation.value);
      const currentRedirectUris = currentClient.redirect_uris || [];
      
      // Only update if arrays are different
      if (!arraysEqual(newRedirectUris, currentRedirectUris)) {
        updates.redirect_uris = newRedirectUris;
      }
    }
    
    // Validate post_logout_redirect_uris if provided
    let postLogoutValidation: ValidationResult | null = null;
    if (post_logout_redirect_uris !== undefined) {
      // Handle both array and string inputs
      const postLogoutInput = Array.isArray(post_logout_redirect_uris) 
        ? post_logout_redirect_uris.join(',')
        : post_logout_redirect_uris;
      
      // If it's an empty array, treat it as empty string (to clear the field)
      const isEmptyArray = Array.isArray(post_logout_redirect_uris) && post_logout_redirect_uris.length === 0;
      
      if (isEmptyArray) {
        // Allow clearing the field by setting empty array
        const currentPostLogoutUris = currentClient.post_logout_redirect_uris || [];
        if (currentPostLogoutUris.length > 0) {
          updates.post_logout_redirect_uris = [];
        }
      } else {
        postLogoutValidation = validateUrlArray(postLogoutInput, 'post_logout_redirect_uris', false);
        
        if (!postLogoutValidation.valid) {
          await db.logAudit({
            admin_user_id: adminUser.id,
            user_email: adminUser.email,
            action: 'client_update_failed',
            details: { 
              reason: 'validation_error',
              field: 'post_logout_redirect_uris',
              error: postLogoutValidation.error,
              client_id: id
            },
            success: false
          });
          
          return res.status(400).json({ 
            error: postLogoutValidation.error || 'Las URLs de post-logout contienen valores inválidos',
            field: 'post_logout_redirect_uris',
            message: 'Por favor, verifica que todas las URLs sean válidas'
          });
        }
        
        if (postLogoutValidation.valid && postLogoutValidation.value) {
          // Convert string to array for PostgreSQL TEXT[]
          const newPostLogoutUris = stringToArray(postLogoutValidation.value);
          const currentPostLogoutUris = currentClient.post_logout_redirect_uris || [];
          
          // Only update if arrays are different
          if (!arraysEqual(newPostLogoutUris, currentPostLogoutUris)) {
            updates.post_logout_redirect_uris = newPostLogoutUris;
          }
        }
      }
    }
    
    // Validate grant_types if provided
    if (grant_types !== undefined && grant_types.trim() !== '') {
      const grantTypesValidation = validateString(grant_types, {
        fieldName: 'grant_types',
        minLength: 1,
        maxLength: 255,
        required: false
      });
      
      if (!grantTypesValidation.valid) {
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'client_update_failed',
          details: { 
            reason: 'validation_error',
            field: 'grant_types',
            error: grantTypesValidation.error,
            client_id: id
          },
          success: false
        });
        
        return res.status(400).json({ 
          error: grantTypesValidation.error || 'Los tipos de concesión no son válidos',
          field: 'grant_types',
          message: 'Los tipos de concesión deben ser una cadena válida (ej: authorization_code)'
        });
      }
      
      if (grantTypesValidation.value) {
        // Convert string to array for PostgreSQL TEXT[]
        const newGrantTypes = stringToArray(grantTypesValidation.value);
        const currentGrantTypes = currentClient.grant_types || [];
        
        // Only update if arrays are different
        if (!arraysEqual(newGrantTypes, currentGrantTypes)) {
          updates.grant_types = newGrantTypes;
        }
      }
    }
    
    // Validate frontend_url if provided
    if (frontend_url !== undefined) {
      // frontend_url can be empty string or a valid URL
      if (frontend_url && frontend_url.trim() !== '') {
        const frontendUrlValidation = validateUrl(frontend_url, 'frontend_url', false);
        
        if (!frontendUrlValidation.valid) {
          await db.logAudit({
            admin_user_id: adminUser.id,
            user_email: adminUser.email,
            action: 'client_update_failed',
            details: { 
              reason: 'validation_error',
              field: 'frontend_url',
              error: frontendUrlValidation.error,
              client_id: id
            },
            success: false
          });
          
          return res.status(400).json({ 
            error: frontendUrlValidation.error || 'La URL del frontend no es válida',
            field: 'frontend_url',
            message: 'Por favor, proporciona una URL válida (http:// o https://) o déjala vacía'
          });
        }
        
        // Only update if value actually changed
        const currentFrontendUrl = currentClient.frontend_url || '';
        if (frontendUrlValidation.value !== currentFrontendUrl) {
          updates.frontend_url = frontendUrlValidation.value;
        }
      } else {
        // Allow empty string to clear the field, but only if it's not already empty
        const currentFrontendUrl = currentClient.frontend_url || '';
        if (currentFrontendUrl !== '') {
          updates.frontend_url = '';
        }
      }
    }
    
    // Validate token_endpoint_auth_method if provided
    if (token_endpoint_auth_method !== undefined && token_endpoint_auth_method.trim() !== '') {
      const authMethodValidation = validateString(token_endpoint_auth_method, {
        fieldName: 'token_endpoint_auth_method',
        minLength: 1,
        maxLength: 50,
        required: false
      });
      
      if (!authMethodValidation.valid) {
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'client_update_failed',
          details: { 
            reason: 'validation_error',
            field: 'token_endpoint_auth_method',
            error: authMethodValidation.error,
            client_id: id
          },
          success: false
        });
        
        return res.status(400).json({ 
          error: authMethodValidation.error || 'El método de autenticación no es válido',
          field: 'token_endpoint_auth_method',
          message: 'El método de autenticación debe ser una cadena válida (ej: client_secret_post)'
        });
      }
      
      if (authMethodValidation.value) {
        // Only update if value actually changed
        const currentAuthMethod = currentClient.token_endpoint_auth_method || 'client_secret_post';
        if (authMethodValidation.value !== currentAuthMethod) {
          updates.token_endpoint_auth_method = authMethodValidation.value;
        }
      }
    }
    
    // Validate is_active if provided
    if (is_active !== undefined) {
      const isActiveValidation = validateBoolean(is_active, 'is_active', false);
      
      if (!isActiveValidation.valid) {
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'client_update_failed',
          details: { 
            reason: 'validation_error',
            field: 'is_active',
            error: isActiveValidation.error,
            client_id: id
          },
          success: false
        });
        
        return res.status(400).json({ 
          error: isActiveValidation.error || 'El estado activo no es válido',
          field: 'is_active',
          message: 'El estado activo debe ser un valor booleano (true o false)'
        });
      }
      
      // Only update if value actually changed
      if (is_active !== currentClient.is_active) {
        updates.is_active = is_active;
      }
    }
    
    // Ensure at least one field is being updated
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ 
        error: 'No hay cambios para aplicar',
        message: 'Los valores proporcionados son idénticos a los valores actuales del cliente. No se realizaron cambios.'
      });
    }
    
    // IMPORTANT: We're only updating fields that don't affect foreign key references
    // client_id is never updated (it's immutable)
    // All other fields (client_name, client_secret, redirect_uris, etc.) can be updated freely
    // audit_logs has ON DELETE SET NULL, so it should NEVER prevent updates
    
    let client;
    try {
      client = await db.updateOIDCClient(parseInt(id), updates);
    } catch (updateError: any) {
      // If the error is a foreign key constraint violation related to audit_logs,
      // this is unexpected and should be logged but not block the operation
      // audit_logs is just a log table and should never prevent updates
      if (updateError?.code === '23503' && updateError?.constraint?.includes('audit_logs')) {
        console.error('⚠️ Unexpected foreign key constraint from audit_logs during update');
        console.error('This suggests a database configuration issue. audit_logs should have ON DELETE SET NULL.');
        console.error('Error details:', {
          constraint: updateError?.constraint,
          detail: updateError?.detail,
          message: updateError?.message
        });
        
        // Try to continue anyway - this might be a false positive
        // If it still fails, we'll catch it in the outer catch block
        throw new Error('Error inesperado de base de datos relacionado con auditoría. Por favor, contacta al administrador.');
      }
      // Re-throw other errors to be handled by the outer catch block
      throw updateError;
    }
    
    await db.logAudit({
      admin_user_id: adminUser.id,
      user_email: adminUser.email,
      client_id: currentClient.client_id, // Use client_id string, not the numeric id
      action: 'client_updated',
      details: { 
        client_id: currentClient.client_id,
        numeric_id: id,
        updated_fields: Object.keys(updates),
        updates: updates
      },
      success: true
    });
    
    res.json(client);
  } catch (error: any) {
    // Log the actual error for debugging
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ Error al actualizar cliente OIDC`);
    console.error('Detalles del error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
      client_id: req.params.id
    });
    
    // Determine more descriptive error message based on error type
    let errorMessage = 'Error al actualizar el cliente';
    let errorDetail = 'Ocurrió un error inesperado al intentar actualizar el cliente';
    
    if (error?.code === '23505') {
      // Unique constraint violation
      errorMessage = 'El cliente ya existe';
      errorDetail = 'Ya existe otro cliente con el mismo identificador (client_id)';
    } else if (error?.code === '23503') {
      // Foreign key constraint violation
      // Note: audit_logs has ON DELETE SET NULL, so it should NEVER prevent updates
      // Only company_client_access can prevent operations (it has ON DELETE CASCADE)
      errorMessage = 'Error de referencia';
      const constraintName = error?.constraint || 'desconocida';
      const errorDetailFromDB = error?.detail || '';
      
      // Provide more specific error message based on constraint
      // audit_logs should NOT prevent updates (it's just a log table)
      if (constraintName.includes('company_client_access')) {
        errorDetail = 'El cliente tiene referencias activas en la tabla de acceso empresa-cliente (company_client_access) que impiden esta operación.';
      } else if (constraintName.includes('audit_logs')) {
        // This should never happen for updates, but if it does, it's likely a database configuration issue
        // Log it as a warning but don't block the operation
        console.warn('⚠️ Unexpected foreign key constraint from audit_logs - this should not block updates');
        errorDetail = 'Error inesperado relacionado con la tabla de auditoría. Esto no debería impedir la actualización. Por favor, verifica la configuración de la base de datos.';
      } else {
        errorDetail = `El cliente tiene referencias en otras tablas que impiden esta operación. Constraint: ${constraintName}. ${errorDetailFromDB}`;
      }
    } else if (error?.code === '42P01') {
      // Table does not exist
      errorMessage = 'Error de base de datos';
      errorDetail = 'La tabla de clientes no existe. Contacta al administrador del sistema';
    } else if (error?.code === '23502') {
      // Not null constraint violation
      errorMessage = 'Campos requeridos faltantes';
      errorDetail = 'Algunos campos requeridos no fueron proporcionados correctamente';
    } else if (error?.message) {
      errorDetail = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      message: errorDetail,
      details: process.env.NODE_ENV === 'development' ? {
        code: error?.code,
        constraint: error?.constraint,
        detail: error?.detail
      } : undefined
    });
  }
});

router.delete('/clients/:id', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const adminUser = (req as any).adminUser;
    
    // Get client info before deletion for audit logging
    const currentClient = await db.getOIDCClientById(parseInt(id));
    if (!currentClient) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'client_deletion_failed',
        details: { 
          reason: 'client_not_found',
          attempted_client_id: id
        },
        success: false
      });
      
      return res.status(404).json({ 
        error: 'Cliente no encontrado',
        message: `No se encontró un cliente con el ID ${id}`
      });
    }
    
    // Perform soft delete
    const deleteResult = await db.deleteOIDCClient(
      parseInt(id),
      adminUser.id,
      reason || 'No se proporcionó razón'
    );
    
    // Log successful deletion with detailed information
    await db.logAudit({
      admin_user_id: adminUser.id,
      user_email: adminUser.email,
      client_id: deleteResult.client_id,
      action: 'client_deleted_soft',
      details: {
        client_id: deleteResult.client_id,
        client_name: deleteResult.client_name,
        was_active: currentClient.is_active,
        reason: reason || 'No se proporcionó razón',
        operations: {
          client_deactivated: true,
          access_revoked: true,
          companies_affected: deleteResult.revoked_access_count
        },
        impact: {
          company_client_access_revoked: deleteResult.revoked_access_count,
          message: deleteResult.revoked_access_count > 0 
            ? `Se revocó el acceso para ${deleteResult.revoked_access_count} empresa(s)`
            : 'No había empresas con acceso activo a este cliente'
        }
      },
      success: true
    });
    
    res.json({ 
      success: true,
      message: 'Cliente desactivado exitosamente',
      details: {
        client_id: deleteResult.client_id,
        client_name: deleteResult.client_name,
        operations: {
          client_deactivated: true,
          access_revoked: true,
          companies_affected: deleteResult.revoked_access_count
        },
        message: deleteResult.revoked_access_count > 0
          ? `El cliente ha sido desactivado y se revocó el acceso para ${deleteResult.revoked_access_count} empresa(s)`
          : 'El cliente ha sido desactivado exitosamente'
      }
    });
  } catch (error: any) {
    const adminUser = (req as any).adminUser;
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ Error al eliminar cliente OIDC`);
    console.error('Detalles del error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      client_id: req.params.id
    });
    
    // Log failed deletion attempt
    await db.logAudit({
      admin_user_id: adminUser.id,
      user_email: adminUser.email,
      action: 'client_deletion_failed',
      details: {
        attempted_client_id: req.params.id,
        reason: error?.message || 'Error desconocido',
        error_code: error?.code,
        error_name: error?.name
      },
      success: false
    });
    
    // Determine error message based on error type
    let errorMessage = 'Error al eliminar el cliente';
    let errorDetail = 'Ocurrió un error inesperado al intentar eliminar el cliente';
    
    if (error?.message?.includes('not found')) {
      errorMessage = 'Cliente no encontrado';
      errorDetail = `No se encontró un cliente con el ID ${req.params.id}`;
    } else if (error?.message?.includes('already inactive')) {
      errorMessage = 'Cliente ya está inactivo';
      errorDetail = 'Este cliente ya ha sido desactivado anteriormente';
    } else if (error?.code === '23503') {
      errorMessage = 'Error de referencia';
      errorDetail = 'El cliente tiene referencias que impiden su eliminación. Detalle: ' + (error?.detail || 'No se pueden eliminar clientes con referencias activas');
    } else if (error?.message) {
      errorDetail = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      message: errorDetail,
      details: process.env.NODE_ENV === 'development' ? {
        code: error?.code,
        constraint: error?.constraint,
        detail: error?.detail
      } : undefined
    });
  }
});

// Users
router.get('/users', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const users = await db.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

router.post('/users', requireAdminSession, async (req: Request, res: Response) => {
  try {
    let { email, password, name, company_id } = req.body;
    const adminUser = (req as any).adminUser;
    
    // Log incoming request for debugging
    console.log('POST /admin/users - Request received:', {
      email,
      name,
      company_id,
      company_id_type: typeof company_id,
      has_password: !!password
    });
    
    // Normalize email before validation
    try {
      email = normalizeEmail(email);
    } catch (error: any) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'user_creation_failed',
        details: { 
          reason: 'invalid_email_format',
          attempted_email: req.body.email
        },
        success: false
      });
      return res.status(400).json({ 
        error: 'Dirección de correo electrónico inválida',
        message: 'Por favor, proporcione una dirección de correo electrónico válida'
      });
    }
    
    // 1. Validate email format
    if (!isValidEmail(email)) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'user_creation_failed',
        details: { 
          reason: 'invalid_email',
          attempted_email: email,
          company_id 
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: 'Dirección de correo electrónico inválida',
        message: 'Por favor, proporcione una dirección de correo electrónico válida en el formato: usuario@ejemplo.com'
      });
    }
    
    // 2. Validate password strength (ENS requirements)
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'user_creation_failed',
        details: { 
          reason: 'weak_password',
          user_email: email,
          company_id,
          validation_errors: passwordValidation.errors
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: 'La contraseña no cumple con los requisitos de seguridad',
        message: 'La contraseña debe cumplir con los requisitos del ENS (Esquema Nacional de Seguridad)',
        details: passwordValidation.errors
      });
    }
    
    // 3. Validate company_id format
    if (!isValidCompanyId(company_id)) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'user_creation_failed',
        details: { 
          reason: 'invalid_company_id',
          user_email: email,
          company_id
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: 'ID de empresa inválido',
        message: 'El ID de empresa debe ser un UUID v4 válido o un número entero positivo'
      });
    }
    
    // Validate company exists and is active
    console.log('Validating company_id:', company_id);
    const companyExists = await db.validateCompanyExists(company_id);
    console.log('Company exists result:', companyExists);
    
    if (!companyExists) {
      // Try to get more information about why it failed
      const companyCheck = await db.getCompanyByCompanyId(company_id);
      console.log('Company check result:', {
        company_id,
        found: !!companyCheck,
        is_active: companyCheck?.is_active,
        company_name: companyCheck?.company_name
      });
      
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'user_creation_failed',
        details: { 
          reason: 'company_not_found',
          user_email: email,
          company_id,
          company_check: {
            found: !!companyCheck,
            is_active: companyCheck?.is_active
          }
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: 'Empresa inválida', 
        message: 'La empresa no existe o está inactiva. Por favor, seleccione una empresa válida.',
        details: {
          provided_company_id: company_id,
          company_found: !!companyCheck,
          company_active: companyCheck?.is_active
        }
      });
    }
    
    // 4. Check if user already exists (including inactive users)
    const existingUser = await db.getUserByEmailIncludingInactive(email);
    
    if (existingUser) {
      if (existingUser.is_active) {
        // User exists and is active - cannot create duplicate
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'user_creation_failed',
          details: { 
            reason: 'user_already_exists',
            user_email: email,
            existing_user_id: existingUser.id,
            company_id
          },
          success: false
        });
        
        return res.status(400).json({ 
          error: 'El usuario ya existe', 
          message: `Un usuario con el correo ${email} ya existe y está activo.`,
          details: {
            existing_user_id: existingUser.id,
            existing_company_id: existingUser.company_id
          }
        });
      } else {
        // User exists but is inactive - reactivate and update
        console.log('Reactivating inactive user:', existingUser.id);
        const password_hash = await bcrypt.hash(password, 10);
        
        const updatedUser = await db.updateUser(existingUser.id, {
          email: email, // Already normalized above
          password_hash,
          name,
          company_id,
          is_active: true
        }, adminUser.id);
        
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'user_reactivated_and_updated',
          details: { 
            user_email: email,
            user_id: existingUser.id,
            previous_company_id: existingUser.company_id,
            new_company_id: company_id,
            reason: 'user_creation_on_inactive_user'
          },
          success: true
        });
        
        return res.json(updatedUser);
      }
    }
    
    // 5. All validations passed - create new user
    const password_hash = await bcrypt.hash(password, 10);
    const user = await db.createUser({ email, password_hash, name, company_id });
    
    await db.logAudit({
      admin_user_id: adminUser.id,
      user_email: adminUser.email,
      action: 'user_created',
      details: { user_email: email, company_id },
      success: true
    });
    
    res.json(user);
  } catch (error) {
    // Log unexpected errors
    const adminUser = (req as any).adminUser;
    if (adminUser) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'user_creation_failed',
        details: { 
          reason: 'unexpected_error',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        },
        success: false
      });
    }
    
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

router.put('/users/:id', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let { email, name, company_id, password, is_active } = req.body;
    const adminUser = (req as any).adminUser;
    
    // Normalize email if provided
    if (email) {
      try {
        email = normalizeEmail(email);
      } catch (error: any) {
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'user_update_failed',
          details: { 
            reason: 'invalid_email_format',
            user_id: id,
            attempted_email: req.body.email
          },
          success: false
        });
        return res.status(400).json({ 
          error: 'Dirección de correo electrónico inválida',
          message: 'Por favor, proporcione una dirección de correo electrónico válida'
        });
      }
    }
    
    // Validate email format if provided
    if (email && !isValidEmail(email)) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'user_update_failed',
        details: { 
          reason: 'invalid_email',
          user_id: id,
          attempted_email: email
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: 'Dirección de correo electrónico inválida',
        message: 'Por favor, proporcione una dirección de correo electrónico válida en el formato: usuario@ejemplo.com'
      });
    }
    
    // Validate company_id format if provided
    if (company_id !== undefined && !isValidCompanyId(company_id)) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'user_update_failed',
        details: { 
          reason: 'invalid_company_id',
          user_id: id,
          company_id
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: 'ID de empresa inválido',
        message: 'El ID de empresa debe ser un UUID v4 válido o un número entero positivo'
      });
    }
    
    const updates: any = { email, name, company_id, is_active };
    
    // Validate and hash password if provided
    if (password && password.trim() !== '') {
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'user_update_failed',
          details: { 
            reason: 'weak_password',
            user_id: id,
            validation_errors: passwordValidation.errors
          },
          success: false
        });
        
        return res.status(400).json({ 
          error: 'Password does not meet security requirements',
          message: 'Password must comply with ENS (Esquema Nacional de Seguridad) requirements',
          details: passwordValidation.errors
        });
      }
      
      updates.password_hash = await bcrypt.hash(password, 10);
    }
    
    const user = await db.updateUser(parseInt(id), updates, adminUser.id);
    res.json(user);
  } catch (error) {
    const adminUser = (req as any).adminUser;
    const errorMessage = (error as Error).message;
    
    if (errorMessage.includes('Invalid company')) {
      if (adminUser) {
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'user_update_failed',
          details: { 
            reason: 'company_not_found',
            user_id: req.params.id,
            error_message: errorMessage
          },
          success: false
        });
      }
      res.status(400).json({ error: errorMessage });
    } else {
      if (adminUser) {
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'user_update_failed',
          details: { 
            reason: 'unexpected_error',
            user_id: req.params.id,
            error_message: errorMessage
          },
          success: false
        });
      }
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  }
});

// Delete user endpoint (soft-delete)
router.delete('/users/:id', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUser = (req as any).adminUser;
    
    const user = await db.getUserById(parseInt(id));
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Soft-delete user with audit trail (audit logging handled within deleteUser)
    await db.deleteUser(parseInt(id), adminUser.id, reason);
    
    res.json({ 
      success: true, 
      message: 'User deactivated successfully (soft-delete)',
      details: {
        user_id: parseInt(id),
        user_email: user.email,
        operation: 'soft_delete'
      }
    });
  } catch (error) {
    const errorMessage = (error as Error).message || 'Failed to delete user';
    res.status(500).json({ error: errorMessage });
  }
});

// Deactivate user (cascade)
router.post('/users/:id/deactivate', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser;
    
    await db.deactivateUserCascade(parseInt(id), adminUser.id);
    res.json({ success: true, message: 'Usuario desactivado y todo el acceso revocado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al desactivar usuario' });
  }
});

// Reactivate user
router.post('/users/:id/reactivate', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser;
    
    await db.reactivateUser(parseInt(id), adminUser.id);
    res.json({ success: true, message: 'Usuario reactivado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al reactivar usuario' });
  }
});

// Toggle user status (inline from grid)
router.patch('/users/:id/toggle-status', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const adminUser = (req as any).adminUser;
    
    // Validate is_active
    const isActiveValidation = validateBoolean(is_active, 'is_active', true);
    
    if (!isActiveValidation.valid) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'user_toggle_status_failed',
        details: { 
          reason: 'validation_error',
          field: 'is_active',
          error: isActiveValidation.error,
          user_id: id
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: isActiveValidation.error,
        field: 'is_active'
      });
    }
    
    if (!is_active) {
      await db.deactivateUserCascade(parseInt(id), adminUser.id);
    } else {
      await db.reactivateUser(parseInt(id), adminUser.id);
    }
    
    const user = await db.getUserById(parseInt(id));
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado de usuario' });
  }
});

// Check company-client access (internal API for Write and other protected apps)
router.get('/access/check', async (req: Request, res: Response) => {
  try {
    const { company_id, client_id } = req.query;
    
    if (!company_id || !client_id) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'company_id and client_id are required'
      });
    }
    
    // Validate company_id format
    if (!isValidCompanyId(company_id as string)) {
      return res.status(400).json({ 
        error: 'Invalid company_id format',
        message: 'company_id must be a valid UUID v4 or positive integer'
      });
    }
    
    // Check access
    const hasAccess = await db.checkCompanyClientAccess(
      company_id as string,
      client_id as string
    );
    
    res.json({ 
      hasAccess,
      company_id,
      client_id
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar acceso' });
  }
});

// Access Management
router.get('/access/company-client', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const accessList = await db.getCompanyClientAccess();
    res.json(accessList);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener lista de control de acceso' });
  }
});

router.post('/access/company-client', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { company_id, client_id } = req.body;
    const adminUser = (req as any).adminUser;
    
    // Validate company_id (UUID v4 or legacy numeric)
    const companyIdValidation = validateString(company_id, {
      fieldName: 'company_id',
      minLength: 1,
      maxLength: 255, // Increased for UUID format (36 chars)
      pattern: COMPANY_ID_REGEX,
      patternDescription: 'company_id must be a valid UUID v4 or positive integer'
    });
    
    if (!companyIdValidation.valid) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'company_client_access_grant_failed',
        details: { 
          reason: 'validation_error',
          field: 'company_id',
          error: companyIdValidation.error
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: companyIdValidation.error,
        field: 'company_id'
      });
    }
    
    // Validate client_id
    const clientIdValidation = validateString(client_id, {
      fieldName: 'client_id',
      minLength: 1,
      maxLength: 100,
      pattern: CLIENT_ID_REGEX,
      patternDescription: 'client_id can only contain alphanumeric characters, underscores, and hyphens'
    });
    
    if (!clientIdValidation.valid) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'company_client_access_grant_failed',
        details: { 
          reason: 'validation_error',
          field: 'client_id',
          error: clientIdValidation.error
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: clientIdValidation.error,
        field: 'client_id'
      });
    }
    
    // Verify company exists and is active
    const company = await db.getCompanyByCompanyId(companyIdValidation.value!);
    if (!company) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'company_client_access_grant_failed',
        details: { 
          reason: 'company_not_found',
          company_id: companyIdValidation.value
        },
        success: false
      });
      
      return res.status(404).json({ 
        error: 'Empresa no encontrada',
        field: 'company_id'
      });
    }
    
    if (!company.is_active) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'company_client_access_grant_failed',
        details: { 
          reason: 'company_inactive',
          company_id: companyIdValidation.value
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: 'La empresa está inactiva',
        field: 'company_id'
      });
    }
    
    // Verify client exists and is active
    const client = await db.getOIDCClientByClientId(clientIdValidation.value!);
    if (!client) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'company_client_access_grant_failed',
        details: { 
          reason: 'client_not_found',
          client_id: clientIdValidation.value
        },
        success: false
      });
      
      return res.status(404).json({ 
        error: 'Cliente no encontrado',
        field: 'client_id'
      });
    }
    
    if (!client.is_active) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'company_client_access_grant_failed',
        details: { 
          reason: 'client_inactive',
          client_id: clientIdValidation.value
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: 'El cliente está inactivo',
        field: 'client_id'
      });
    }
    
    // Grant access (will handle duplicate gracefully via ON CONFLICT)
    // Note: granted_by is set to null because admin users are in admin_users table, not users table
    // The foreign key constraint references users(id), not admin_users(id)
    await db.grantCompanyClientAccess(
      companyIdValidation.value!,
      clientIdValidation.value!,
      null // Admin users are not in users table, so we pass null
    );
    
    await db.logAudit({
      admin_user_id: adminUser.id,
      user_email: adminUser.email,
      client_id: clientIdValidation.value,
      action: 'company_client_access_granted',
      details: { 
        company_id: companyIdValidation.value, 
        client_id: clientIdValidation.value,
        company_name: company.company_name,
        client_name: client.client_name
      },
      success: true
    });
    
    res.json({ 
      success: true,
      message: 'Acceso otorgado exitosamente'
    });
  } catch (error: any) {
    // Handle unique constraint violation (duplicate grant)
    if (error.code === '23505') {
      const adminUser = (req as any).adminUser;
      if (adminUser) {
        await db.logAudit({
          admin_user_id: adminUser.id,
          user_email: adminUser.email,
          action: 'company_client_access_grant_failed',
          details: { 
            reason: 'duplicate_grant',
            error: 'El acceso ya está otorgado para esta combinación empresa-cliente'
          },
          success: false
        });
      }
      
      return res.status(409).json({ 
        error: 'El acceso ya está otorgado para esta combinación empresa-cliente'
      });
    }
    
    const adminUser = (req as any).adminUser;
    if (adminUser) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'company_client_access_grant_failed',
        details: { 
          reason: 'unexpected_error',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        },
        success: false
      });
    }
    
    res.status(500).json({ error: 'Error al otorgar acceso' });
  }
});

router.delete('/access/company-client', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { company_id, client_id } = req.body;
    const adminUser = (req as any).adminUser;
    
    // Validate company_id (UUID v4 or legacy numeric)
    const companyIdValidation = validateString(company_id, {
      fieldName: 'company_id',
      minLength: 1,
      maxLength: 255, // Increased for UUID format (36 chars)
      pattern: COMPANY_ID_REGEX,
      patternDescription: 'company_id must be a valid UUID v4 or positive integer'
    });
    
    if (!companyIdValidation.valid) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'company_client_access_revoke_failed',
        details: { 
          reason: 'validation_error',
          field: 'company_id',
          error: companyIdValidation.error
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: companyIdValidation.error,
        field: 'company_id'
      });
    }
    
    // Validate client_id (string identifier)
    const clientIdValidation = validateString(client_id, {
      fieldName: 'client_id',
      minLength: 1,
      maxLength: 100,
      pattern: CLIENT_ID_REGEX,
      patternDescription: 'client_id can only contain alphanumeric characters, underscores, and hyphens'
    });
    
    if (!clientIdValidation.valid) {
      await db.logAudit({
        admin_user_id: adminUser.id,
        user_email: adminUser.email,
        action: 'company_client_access_revoke_failed',
        details: { 
          reason: 'validation_error',
          field: 'client_id',
          error: clientIdValidation.error
        },
        success: false
      });
      
      return res.status(400).json({ 
        error: clientIdValidation.error,
        field: 'client_id'
      });
    }
    
    const revokeResult = await db.revokeCompanyClientAccess(companyIdValidation.value!, clientIdValidation.value!);
    
    await db.logAudit({
      admin_user_id: adminUser.id,
      user_email: adminUser.email,
      client_id: clientIdValidation.value,
      action: 'company_client_access_revoked',
      details: { 
        company_id: companyIdValidation.value, 
        client_id: clientIdValidation.value,
        sessions_invalidated_count: revokeResult.sessionsInvalidated
      },
      success: true
    });
    
    res.json({ 
      success: true,
      sessionsInvalidated: revokeResult.sessionsInvalidated
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al revocar acceso' });
  }
});

// Audit Logs
router.get('/audit-logs', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { limit = 100, offset = 0, user_email, action, client_id } = req.query;
    
    const logs = await db.getAuditLogs({
      limit: Number(limit),
      offset: Number(offset),
      user_email: user_email as string,
      action: action as string,
      client_id: client_id as string
    });
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener registros de auditoría' });
  }
});

// Statistics
router.get('/statistics', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const stats = await db.getStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

export default router;
