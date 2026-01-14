import pg from 'pg';
import bcrypt from 'bcrypt';
import { normalizeEmail } from '../utils/email.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: true }  // Require valid SSL certificate in production
    : false  // Disable SSL in development (PostgreSQL container doesn't support SSL)
});

// Export pool for migration service
export { pool };

// Interfaces
interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  company_id: string;
  is_active: boolean;
  email_verified: boolean;
  last_login_at?: Date;
  password_changed_at: Date;
  failed_login_attempts: number;
  locked_until?: Date;
  created_at: Date;
  updated_at: Date;
}

interface OIDCClient {
  id: number;
  client_id: string;
  client_secret: string;
  client_name: string;
  client_description?: string;
  redirect_uris: string[];
  post_logout_redirect_uris?: string[];
  response_types: string[];
  grant_types: string[];
  allowed_scopes: string[];
  token_endpoint_auth_method: string;
  access_token_lifetime: number;
  refresh_token_lifetime: number;
  frontend_url?: string;
  is_active: boolean;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
}

interface Company {
  id: number;
  company_id: string;
  company_name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  email: string;
  is_super_admin: boolean;
  is_active: boolean;
  last_login_at?: Date;
  failed_login_attempts: number;
  locked_until?: Date;
  created_at: Date;
  updated_at: Date;
}

interface AdminSession {
  id: number;
  session_token: string;
  admin_user_id: number;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
  expires_at: Date;
  last_activity_at: Date;
  is_active: boolean;
}

interface UserSession {
  id: number;
  session_id: string;
  user_id: number;
  client_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
  expires_at: Date;
  last_activity_at: Date;
  is_active: boolean;
}

export const db = {
  // OIDC User related methods
  async getUserByEmail(email: string): Promise<User | null> {
    const normalizedEmail = normalizeEmail(email);
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
      [normalizedEmail]
    );
    return result.rows[0] || null;
  },

  async getUserByEmailIncludingInactive(email: string): Promise<User | null> {
    const normalizedEmail = normalizeEmail(email);
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [normalizedEmail]
    );
    return result.rows[0] || null;
  },

  async createUser(user: Partial<User>): Promise<User> {
    const normalizedEmail = user.email ? normalizeEmail(user.email) : undefined;
    if (!normalizedEmail) {
      throw new Error('Email is required');
    }
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, company_id, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [normalizedEmail, user.password_hash, user.name, user.company_id, user.is_active !== false, user.email_verified || false]
    );
    return result.rows[0];
  },

  async getUserById(id: number): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE id = $1 AND is_active = TRUE', [id]);
    return result.rows[0] || null;
  },

  async getUserByIdIncludingInactive(id: number): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async getAllUsers(): Promise<User[]> {
    // Excluir usuarios sin compañía (company_id IS NULL) para evitar mostrar usuarios huérfanos
    // Estos usuarios fueron eliminados cuando se eliminó su compañía
    const result = await pool.query(
      'SELECT id, email, name, company_id, is_active, email_verified, last_login_at FROM users WHERE company_id IS NOT NULL ORDER BY name'
    );
    return result.rows;
  },

  async deleteUser(id: number, performedByAdminId?: number, reason?: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Validate user exists
      const userResult = await client.query(
        'SELECT id, email, name, company_id, is_active FROM users WHERE id = $1',
        [id]
      );
      
      if (userResult.rows.length === 0) {
        throw new Error(`User with ID ${id} not found`);
      }
      
      const userToDelete = userResult.rows[0];
      
      // 2. Soft-delete: Set is_active = FALSE
      await client.query(
        'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
        [id]
      );
      
      // 3. Invalidate all active sessions
      await client.query(
        'UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1',
        [id]
      );
      
      await client.query('COMMIT');
      
      // 5. Write audit log entry for success
      await this.logAudit({
        admin_user_id: performedByAdminId,
        user_email: userToDelete.email,
        action: 'user_deleted_soft',
        details: {
          user_id: id,
          user_email: userToDelete.email,
          user_name: userToDelete.name,
          company_id: userToDelete.company_id,
          was_active: userToDelete.is_active,
          reason: reason || 'No reason provided',
          operations: {
            user_deactivated: true,
            access_revoked: true,
            sessions_invalidated: true,
            tokens_invalidated: true
          }
        },
        success: true
      });
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Write audit log entry for failure
      await this.logAudit({
        admin_user_id: performedByAdminId,
        action: 'user_deleted_soft',
        details: {
          attempted_user_id: id,
          reason: reason || 'No reason provided',
          error: (error as Error).message
        },
        success: false
      });
      
      throw error;
    } finally {
      client.release();
    }
  },

  // OIDC Client related methods
  async getOIDCClients(): Promise<OIDCClient[]> {
    const result = await pool.query(`
      SELECT 
        id,
        client_id,
        client_secret,
        client_name,
        client_description,
        array_to_json(redirect_uris)::jsonb as redirect_uris,
        CASE 
          WHEN post_logout_redirect_uris IS NOT NULL AND array_length(post_logout_redirect_uris, 1) > 0 
          THEN array_to_json(post_logout_redirect_uris)::jsonb 
          ELSE NULL 
        END as post_logout_redirect_uris,
        array_to_json(response_types)::jsonb as response_types,
        array_to_json(grant_types)::jsonb as grant_types,
        array_to_json(allowed_scopes)::jsonb as allowed_scopes,
        token_endpoint_auth_method,
        access_token_lifetime,
        refresh_token_lifetime,
        frontend_url,
        is_active,
        created_by,
        created_at,
        updated_at
      FROM oidc_clients 
      WHERE is_active = TRUE 
      ORDER BY client_name
    `);
    
    // Convert JSON arrays back to JavaScript arrays
    // The pg driver automatically parses JSONB to JavaScript arrays/objects
    return result.rows.map(row => ({
      ...row,
      redirect_uris: Array.isArray(row.redirect_uris) ? row.redirect_uris : (row.redirect_uris ? JSON.parse(row.redirect_uris) : []),
      post_logout_redirect_uris: row.post_logout_redirect_uris 
        ? (Array.isArray(row.post_logout_redirect_uris) ? row.post_logout_redirect_uris : JSON.parse(row.post_logout_redirect_uris))
        : null,
      response_types: Array.isArray(row.response_types) ? row.response_types : (row.response_types ? JSON.parse(row.response_types) : []),
      grant_types: Array.isArray(row.grant_types) ? row.grant_types : (row.grant_types ? JSON.parse(row.grant_types) : []),
      allowed_scopes: Array.isArray(row.allowed_scopes) ? row.allowed_scopes : (row.allowed_scopes ? JSON.parse(row.allowed_scopes) : [])
    }));
  },

  async getOIDCClientById(id: number): Promise<OIDCClient | null> {
    const result = await pool.query(`
      SELECT 
        id,
        client_id,
        client_secret,
        client_name,
        client_description,
        array_to_json(redirect_uris)::jsonb as redirect_uris,
        CASE 
          WHEN post_logout_redirect_uris IS NOT NULL AND array_length(post_logout_redirect_uris, 1) > 0 
          THEN array_to_json(post_logout_redirect_uris)::jsonb 
          ELSE NULL 
        END as post_logout_redirect_uris,
        array_to_json(response_types)::jsonb as response_types,
        array_to_json(grant_types)::jsonb as grant_types,
        array_to_json(allowed_scopes)::jsonb as allowed_scopes,
        token_endpoint_auth_method,
        access_token_lifetime,
        refresh_token_lifetime,
        frontend_url,
        is_active,
        created_by,
        created_at,
        updated_at
      FROM oidc_clients 
      WHERE id = $1
    `, [id]);
    
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      redirect_uris: Array.isArray(row.redirect_uris) ? row.redirect_uris : (row.redirect_uris ? JSON.parse(row.redirect_uris) : []),
      post_logout_redirect_uris: row.post_logout_redirect_uris 
        ? (Array.isArray(row.post_logout_redirect_uris) ? row.post_logout_redirect_uris : JSON.parse(row.post_logout_redirect_uris))
        : null,
      response_types: Array.isArray(row.response_types) ? row.response_types : (row.response_types ? JSON.parse(row.response_types) : []),
      grant_types: Array.isArray(row.grant_types) ? row.grant_types : (row.grant_types ? JSON.parse(row.grant_types) : []),
      allowed_scopes: Array.isArray(row.allowed_scopes) ? row.allowed_scopes : (row.allowed_scopes ? JSON.parse(row.allowed_scopes) : [])
    };
  },

  async getOIDCClientByClientId(clientId: string): Promise<OIDCClient | null> {
    const result = await pool.query(`
      SELECT 
        id,
        client_id,
        client_secret,
        client_name,
        client_description,
        array_to_json(redirect_uris)::jsonb as redirect_uris,
        CASE 
          WHEN post_logout_redirect_uris IS NOT NULL AND array_length(post_logout_redirect_uris, 1) > 0 
          THEN array_to_json(post_logout_redirect_uris)::jsonb 
          ELSE NULL 
        END as post_logout_redirect_uris,
        array_to_json(response_types)::jsonb as response_types,
        array_to_json(grant_types)::jsonb as grant_types,
        array_to_json(allowed_scopes)::jsonb as allowed_scopes,
        token_endpoint_auth_method,
        access_token_lifetime,
        refresh_token_lifetime,
        frontend_url,
        is_active,
        created_by,
        created_at,
        updated_at
      FROM oidc_clients 
      WHERE client_id = $1
    `, [clientId]);
    
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      redirect_uris: Array.isArray(row.redirect_uris) ? row.redirect_uris : (row.redirect_uris ? JSON.parse(row.redirect_uris) : []),
      post_logout_redirect_uris: row.post_logout_redirect_uris 
        ? (Array.isArray(row.post_logout_redirect_uris) ? row.post_logout_redirect_uris : JSON.parse(row.post_logout_redirect_uris))
        : null,
      response_types: Array.isArray(row.response_types) ? row.response_types : (row.response_types ? JSON.parse(row.response_types) : []),
      grant_types: Array.isArray(row.grant_types) ? row.grant_types : (row.grant_types ? JSON.parse(row.grant_types) : []),
      allowed_scopes: Array.isArray(row.allowed_scopes) ? row.allowed_scopes : (row.allowed_scopes ? JSON.parse(row.allowed_scopes) : [])
    };
  },

  async createOIDCClient(client: Partial<OIDCClient>): Promise<OIDCClient> {
    // Hash client_secret before storing
    let hashedSecret = client.client_secret;
    if (client.client_secret && !client.client_secret.startsWith('$2b$') && !client.client_secret.startsWith('$2a$')) {
      // Only hash if not already hashed
      hashedSecret = await bcrypt.hash(client.client_secret, 10);
    }
    
    const result = await pool.query(
      `INSERT INTO oidc_clients (
        client_id, client_secret, client_name, client_description,
        redirect_uris, post_logout_redirect_uris, response_types, grant_types,
        allowed_scopes, access_token_lifetime, refresh_token_lifetime,
        frontend_url, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        client.client_id, hashedSecret, client.client_name,
        client.client_description, client.redirect_uris,
        client.post_logout_redirect_uris, client.response_types,
        client.grant_types, client.allowed_scopes,
        client.access_token_lifetime || 3600,
        client.refresh_token_lifetime || 86400,
        client.frontend_url, client.is_active !== false, client.created_by
      ]
    );
    return result.rows[0];
  },

  async updateOIDCClient(id: number, updates: Partial<OIDCClient>): Promise<OIDCClient> {
    // Build dynamic SET clause only for provided fields
    const setClauses: string[] = [];
    const values: any[] = [id];
    let paramIndex = 2;

    if (updates.client_name !== undefined) {
      setClauses.push(`client_name = $${paramIndex++}`);
      values.push(updates.client_name);
    }
    if (updates.client_description !== undefined) {
      setClauses.push(`client_description = $${paramIndex++}`);
      values.push(updates.client_description);
    }
    if (updates.client_secret !== undefined) {
      // Hash client_secret before updating if not already hashed
      let hashedSecret = updates.client_secret;
      if (!updates.client_secret.startsWith('$2b$') && !updates.client_secret.startsWith('$2a$')) {
        // Only hash if not already hashed
        hashedSecret = await bcrypt.hash(updates.client_secret, 10);
      }
      setClauses.push(`client_secret = $${paramIndex++}`);
      values.push(hashedSecret);
    }
    if (updates.redirect_uris !== undefined) {
      setClauses.push(`redirect_uris = $${paramIndex++}`);
      values.push(updates.redirect_uris);
    }
    if (updates.post_logout_redirect_uris !== undefined) {
      setClauses.push(`post_logout_redirect_uris = $${paramIndex++}`);
      values.push(updates.post_logout_redirect_uris);
    }
    if (updates.grant_types !== undefined) {
      setClauses.push(`grant_types = $${paramIndex++}`);
      values.push(updates.grant_types);
    }
    if (updates.response_types !== undefined) {
      setClauses.push(`response_types = $${paramIndex++}`);
      values.push(updates.response_types);
    }
    if (updates.allowed_scopes !== undefined) {
      setClauses.push(`allowed_scopes = $${paramIndex++}`);
      values.push(updates.allowed_scopes);
    }
    if (updates.token_endpoint_auth_method !== undefined) {
      setClauses.push(`token_endpoint_auth_method = $${paramIndex++}`);
      values.push(updates.token_endpoint_auth_method);
    }
    if (updates.frontend_url !== undefined) {
      setClauses.push(`frontend_url = $${paramIndex++}`);
      values.push(updates.frontend_url);
    }
    if (updates.is_active !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(updates.is_active);
    }

    // Always update updated_at
    setClauses.push(`updated_at = NOW()`);

    if (setClauses.length === 1) {
      // Only updated_at, which means no actual fields to update
      throw new Error('No fields provided for update');
    }

    const query = `UPDATE oidc_clients 
                   SET ${setClauses.join(', ')}
                   WHERE id = $1 RETURNING *`;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async deleteOIDCClient(id: number, performedByAdminId?: number, reason?: string): Promise<{ client_id: string; client_name: string; revoked_access_count: number }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Validate client exists
      const clientResult = await client.query(
        'SELECT id, client_id, client_name, is_active FROM oidc_clients WHERE id = $1',
        [id]
      );
      
      if (clientResult.rows.length === 0) {
        throw new Error(`Client with ID ${id} not found`);
      }
      
      const clientToDelete = clientResult.rows[0];
      
      if (!clientToDelete.is_active) {
        throw new Error(`Client ${clientToDelete.client_id} is already inactive`);
      }
      
      // 2. Count active company-client access records that will be revoked
      const accessCountResult = await client.query(
        'SELECT COUNT(*) as count FROM company_client_access WHERE client_id = $1 AND is_active = TRUE',
        [clientToDelete.client_id]
      );
      const revokedAccessCount = parseInt(accessCountResult.rows[0].count || '0', 10);
      
      // 3. Soft-delete: Set is_active = FALSE
      await client.query(
        'UPDATE oidc_clients SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
        [id]
      );
      
      // 4. Revoke all company-client access (set is_active = FALSE for all associated access records)
      await client.query(
        'UPDATE company_client_access SET is_active = FALSE WHERE client_id = $1 AND is_active = TRUE',
        [clientToDelete.client_id]
      );
      
      await client.query('COMMIT');
      
      return {
        client_id: clientToDelete.client_id,
        client_name: clientToDelete.client_name,
        revoked_access_count: revokedAccessCount
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Company related methods
  async getAllCompanies(): Promise<Company[]> {
    const result = await pool.query('SELECT * FROM companies ORDER BY company_name');
    return result.rows;
  },

  async getCompanyById(id: number): Promise<Company | null> {
    const result = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async getCompanyByCompanyId(companyId: string): Promise<Company | null> {
    const result = await pool.query('SELECT * FROM companies WHERE company_id = $1', [companyId]);
    return result.rows[0] || null;
  },

  async generateNextCompanyId(): Promise<string> {
    // Generate UUID v4 for enhanced security and guaranteed uniqueness
    // UUIDs are non-predictable, preventing enumeration attacks
    // They are globally unique and never reused, even after company deletion
    const { randomUUID } = await import('crypto');
    return randomUUID();
  },

  async createCompany(company: Partial<Company>): Promise<Company> {
    let companyId = company.company_id;
    
    // Auto-generate UUID if not provided
    if (!companyId || (typeof companyId === 'string' && companyId.trim() === '')) {
      companyId = await this.generateNextCompanyId();
    }
    
    // Validate UUID format if provided manually (for security)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (companyId && !uuidRegex.test(String(companyId))) {
      throw new Error('Invalid company_id format. Must be a valid UUID v4.');
    }
    
    const result = await pool.query(
      `INSERT INTO companies (company_id, company_name, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [companyId, company.company_name, company.is_active !== false]
    );
    return result.rows[0];
  },

  async updateCompany(companyId: string, updates: Partial<Company>): Promise<Company> {
    const result = await pool.query(
      `UPDATE companies 
       SET company_name = COALESCE($2, company_name),
           is_active = COALESCE($3, is_active),
           updated_at = NOW()
       WHERE company_id = $1 RETURNING *`,
      [companyId, updates.company_name, updates.is_active]
    );
    return result.rows[0];
  },

  async deleteCompany(id: number): Promise<void> {
    await pool.query('DELETE FROM companies WHERE id = $1', [id]);
  },

  // Access Control methods

  async grantCompanyClientAccess(companyId: string, clientId: string, grantedBy: number | null = null): Promise<void> {
    // Note: grantedBy should be a user ID from users table, not admin_users
    // If granted from admin panel, pass null to avoid foreign key constraint violation
    await pool.query(
      `INSERT INTO company_client_access (company_id, client_id, granted_by, is_active)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (company_id, client_id) DO UPDATE
       SET is_active = TRUE, granted_by = COALESCE($3, company_client_access.granted_by), granted_at = NOW()`,
      [companyId, clientId, grantedBy]
    );
  },

  /**
   * Notifica a Write (y otros clientes protegidos) que el acceso ha sido revocado
   * Esto permite limpiar el caché inmediatamente sin esperar al TTL
   */
  async notifyClientCacheInvalidation(
    clientId: string,
    companyId: string,
    action: 'revoke_access' | 'revoke_all_access'
  ): Promise<void> {
    try {
      // Obtener información del cliente para obtener webhook URL
      const clientResult = await pool.query(
        'SELECT client_id, frontend_url FROM oidc_clients WHERE client_id = $1 AND is_active = TRUE',
        [clientId]
      );

      if (clientResult.rows.length === 0) {
        return; // Cliente no encontrado o inactivo
      }

      const client = clientResult.rows[0];
      
      // Construir webhook URL basado en frontend_url o usar URL por defecto para Write
      // Para Write, el webhook está en: http://localhost:5008/webhooks/invalidate-access-cache
      let webhookUrl: string | null = null;
      
      if (clientId === 'writehub-client') {
        // Write usa el puerto 5008 para la API
        webhookUrl = process.env.WRITE_WEBHOOK_URL || 'http://localhost:5008/webhooks/invalidate-access-cache';
      } else {
        // Para otros clientes, intentar construir URL desde frontend_url
        if (client.frontend_url) {
          try {
            const url = new URL(client.frontend_url);
            // Construir URL del webhook: cambiar puerto o agregar /webhooks
            webhookUrl = `${url.protocol}//${url.hostname}:5008/webhooks/invalidate-access-cache`;
          } catch {
            // URL inválida, usar default
            webhookUrl = null;
          }
        }
      }

      if (!webhookUrl) {
        return; // No hay webhook configurado para este cliente
      }

      // Hacer POST al webhook (fire-and-forget, no esperar respuesta)
      // Usar fetch nativo de Node.js 22+ (no requiere node-fetch)
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 3000);
      
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          client_id: action === 'revoke_access' ? clientId : undefined,
          action,
        }),
        signal: abortController.signal,
      })
        .catch((error: unknown) => {
          // Log pero no fallar - webhook es opcional
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn(`Failed to notify client cache invalidation: ${errorMessage}`);
        })
        .finally(() => {
          clearTimeout(timeoutId);
        });
    } catch (error) {
      // Log pero no fallar - webhook es opcional
      console.warn(`Error notifying client cache invalidation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async revokeCompanyClientAccess(companyId: string, clientId: string): Promise<{ sessionsInvalidated: number }> {
    // Invalidar sesiones antes de revocar acceso
    const sessionsInvalidated = await this.invalidateUserSessionsForCompanyAndClient(companyId, clientId);
    
    // Eliminar el acceso
    await pool.query('DELETE FROM company_client_access WHERE company_id = $1 AND client_id = $2', [companyId, clientId]);
    
    // Notificar a Write para limpiar caché (fire-and-forget)
    await this.notifyClientCacheInvalidation(clientId, companyId, 'revoke_access');
    
    return { sessionsInvalidated };
  },

  /**
   * Revoca todos los accesos de una compañía a todos los clientes
   * Retorna el número de sesiones invalidadas y accesos revocados
   */
  async revokeAllCompanyAccess(companyId: string): Promise<{ sessionsInvalidated: number; accessRevoked: number }> {
    // Invalidar todas las sesiones de la compañía
    const sessionsInvalidated = await this.invalidateUserSessionsForCompany(companyId);
    
    // Obtener todos los clientes antes de eliminar accesos
    const clientsResult = await pool.query(
      'SELECT DISTINCT client_id FROM company_client_access WHERE company_id = $1',
      [companyId]
    );
    const clientIds = clientsResult.rows.map((row: any) => row.client_id);
    
    // Eliminar todos los accesos
    const result = await pool.query('DELETE FROM company_client_access WHERE company_id = $1', [companyId]);
    const accessRevoked = result.rowCount || 0;
    
    // Notificar a cada cliente para limpiar caché (fire-and-forget)
    for (const clientId of clientIds) {
      await this.notifyClientCacheInvalidation(clientId, companyId, 'revoke_all_access');
    }
    
    return { sessionsInvalidated, accessRevoked };
  },

  async getCompanyClientAccess(): Promise<any[]> {
    const result = await pool.query(
      `SELECT 
        cca.id,
        cca.company_id,
        c.company_name,
        cca.client_id,
        oc.client_name,
        cca.is_active,
        cca.granted_at,
        cca.granted_by,
        au.full_name as granted_by_name
       FROM company_client_access cca
       LEFT JOIN companies c ON cca.company_id = c.company_id
       LEFT JOIN oidc_clients oc ON cca.client_id = oc.client_id
       LEFT JOIN admin_users au ON cca.granted_by = au.id
       ORDER BY cca.granted_at DESC`
    );
    return result.rows;
  },

  async checkCompanyClientAccess(companyId: string, clientId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM company_client_access 
       WHERE company_id = $1 AND client_id = $2 AND is_active = TRUE`,
      [companyId, clientId]
    );
    return result.rows.length > 0;
  },

  // Admin User related methods
  async getAdminUserByUsername(username: string): Promise<AdminUser | null> {
    const result = await pool.query(
      'SELECT * FROM admin_users WHERE username = $1 AND is_active = TRUE',
      [username]
    );
    return result.rows[0] || null;
  },

  async getAdminUserByEmail(email: string): Promise<AdminUser | null> {
    const normalizedEmail = normalizeEmail(email);
    const result = await pool.query(
      'SELECT * FROM admin_users WHERE email = $1 AND is_active = TRUE',
      [normalizedEmail]
    );
    return result.rows[0] || null;
  },

  async getAdminUserById(id: number): Promise<AdminUser | null> {
    const result = await pool.query('SELECT * FROM admin_users WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async createAdminUser(adminUser: Partial<AdminUser>): Promise<AdminUser> {
    const normalizedEmail = adminUser.email ? normalizeEmail(adminUser.email) : undefined;
    if (!normalizedEmail) {
      throw new Error('Email is required');
    }
    const result = await pool.query(
      `INSERT INTO admin_users (username, password_hash, full_name, email, is_super_admin, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [adminUser.username, adminUser.password_hash, adminUser.full_name, normalizedEmail, adminUser.is_super_admin || false, adminUser.is_active !== false]
    );
    return result.rows[0];
  },

  async updateAdminUser(id: number, updates: Partial<AdminUser>): Promise<AdminUser> {
    const normalizedEmail = updates.email ? normalizeEmail(updates.email) : updates.email;
    const result = await pool.query(
      `UPDATE admin_users 
       SET full_name = COALESCE($2, full_name),
           email = COALESCE($3, email),
           is_super_admin = COALESCE($4, is_super_admin),
           is_active = COALESCE($5, is_active),
           updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, updates.full_name, normalizedEmail, updates.is_super_admin, updates.is_active]
    );
    return result.rows[0];
  },

  async deleteAdminUser(id: number, performedByAdminId?: number): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Validate admin exists
      const adminResult = await client.query(
        'SELECT id, username, is_super_admin FROM admin_users WHERE id = $1',
        [id]
      );
      
      if (adminResult.rows.length === 0) {
        throw new Error(`Admin user with ID ${id} not found`);
      }
      
      const adminToDelete = adminResult.rows[0];
      
      // 2. If deleting a super-admin, ensure it's not the last one
      if (adminToDelete.is_super_admin) {
        const superAdminCountResult = await client.query(
          'SELECT COUNT(*) as count FROM admin_users WHERE is_super_admin = TRUE AND is_active = TRUE'
        );
        
        const superAdminCount = parseInt(superAdminCountResult.rows[0].count);
        
        if (superAdminCount <= 1) {
          throw new Error('Cannot delete the last super-admin user');
        }
      }
      
      // 3. Invalidate all active sessions for this admin
      await client.query(
        'UPDATE admin_sessions SET is_active = FALSE WHERE admin_user_id = $1',
        [id]
      );
      
      // 4. Delete the admin user
      await client.query('DELETE FROM admin_users WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      
      // 5. Write audit log entry for success
      await this.logAudit({
        admin_user_id: performedByAdminId,
        action: 'admin_user_deleted',
        details: {
          deleted_admin_id: id,
          deleted_username: adminToDelete.username,
          was_super_admin: adminToDelete.is_super_admin
        },
        success: true
      });
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Write audit log entry for failure
      await this.logAudit({
        admin_user_id: performedByAdminId,
        action: 'admin_user_deleted',
        details: {
          attempted_admin_id: id,
          error: (error as Error).message
        },
        success: false
      });
      
      throw error;
    } finally {
      client.release();
    }
  },

  async updateAdminLoginSuccess(adminUserId: number): Promise<void> {
    await pool.query(
      `UPDATE admin_users 
       SET last_login_at = NOW(), failed_login_attempts = 0, locked_until = NULL
       WHERE id = $1`,
      [adminUserId]
    );
  },

  async incrementAdminFailedLoginAttempts(username: string): Promise<void> {
    const maxAttempts = await this.getSystemConfig('max_login_attempts', '5');
    const lockoutMinutes = await this.getSystemConfig('lockout_duration_minutes', '15');
    
    // Parse and validate lockoutMinutes as an integer to prevent SQL injection
    const lockoutMinutesInt = parseInt(lockoutMinutes, 10);
    if (isNaN(lockoutMinutesInt) || lockoutMinutesInt < 0) {
      throw new Error('Invalid lockout_duration_minutes configuration');
    }
    
    await pool.query(
      `UPDATE admin_users 
       SET failed_login_attempts = failed_login_attempts + 1,
           locked_until = CASE 
             WHEN failed_login_attempts + 1 >= $2 
             THEN NOW() + make_interval(mins => $3)
             ELSE locked_until
           END
       WHERE username = $1`,
      [username, parseInt(maxAttempts), lockoutMinutesInt]
    );
  },

  async lockAdminUser(adminUserId: number, until: Date): Promise<void> {
    await pool.query(
      'UPDATE admin_users SET locked_until = $2 WHERE id = $1',
      [adminUserId, until]
    );
  },

  async unlockAdminUser(adminUserId: number): Promise<void> {
    await pool.query(
      'UPDATE admin_users SET locked_until = NULL WHERE id = $1',
      [adminUserId]
    );
  },

  // Admin Session related methods
  async createAdminSession(sessionData: Partial<AdminSession>): Promise<AdminSession> {
    const result = await pool.query(
      `INSERT INTO admin_sessions (session_token, admin_user_id, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [sessionData.session_token, sessionData.admin_user_id, sessionData.ip_address, 
       sessionData.user_agent, sessionData.expires_at]
    );
    return result.rows[0];
  },

  async getAdminSession(sessionToken: string): Promise<AdminSession | null> {
    const result = await pool.query(
      `SELECT * FROM admin_sessions 
       WHERE session_token = $1 AND is_active = TRUE AND expires_at > NOW()`,
      [sessionToken]
    );
    return result.rows[0] || null;
  },

  async invalidateAdminSession(sessionToken: string): Promise<void> {
    await pool.query(
      'UPDATE admin_sessions SET is_active = FALSE WHERE session_token = $1',
      [sessionToken]
    );
  },

  async invalidateAdminSessionsForUser(adminUserId: number): Promise<void> {
    await pool.query(
      'UPDATE admin_sessions SET is_active = FALSE WHERE admin_user_id = $1',
      [adminUserId]
    );
  },

  // User Session related methods (OIDC)
  async createUserSession(sessionData: {
    session_id: string;
    user_id: number;
    client_id?: string;
    ip_address?: string;
    user_agent?: string;
    expires_at: Date;
  }): Promise<UserSession> {
    const result = await pool.query(
      `INSERT INTO user_sessions (session_id, user_id, client_id, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        sessionData.session_id,
        sessionData.user_id,
        sessionData.client_id,
        sessionData.ip_address,
        sessionData.user_agent,
        sessionData.expires_at
      ]
    );
    return result.rows[0];
  },

  async getUserSession(sessionId: string): Promise<UserSession | null> {
    const result = await pool.query(
      `SELECT * FROM user_sessions 
       WHERE session_id = $1 AND is_active = TRUE AND expires_at > NOW()`,
      [sessionId]
    );
    return result.rows[0] || null;
  },

  async updateUserSessionActivity(sessionId: string): Promise<void> {
    await pool.query(
      'UPDATE user_sessions SET last_activity_at = NOW() WHERE session_id = $1',
      [sessionId]
    );
  },

  async invalidateUserSession(sessionId: string): Promise<void> {
    await pool.query(
      'UPDATE user_sessions SET is_active = FALSE WHERE session_id = $1',
      [sessionId]
    );
  },

  async invalidateUserSessionsForUser(userId: number): Promise<void> {
    await pool.query(
      'UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE',
      [userId]
    );
  },

  /**
   * Invalida todas las sesiones activas de usuarios de una compañía para un cliente específico
   * Retorna el número de sesiones invalidadas
   */
  async invalidateUserSessionsForCompanyAndClient(companyId: string, clientId: string): Promise<number> {
    const result = await pool.query(
      `UPDATE user_sessions us
       SET is_active = FALSE
       FROM users u
       WHERE us.user_id = u.id
         AND u.company_id = $1
         AND us.client_id = $2
         AND us.is_active = TRUE`,
      [companyId, clientId]
    );
    return result.rowCount || 0;
  },

  /**
   * Invalida todas las sesiones activas de usuarios de una compañía para todos los clientes
   * Retorna el número de sesiones invalidadas
   */
  async invalidateUserSessionsForCompany(companyId: string): Promise<number> {
    const result = await pool.query(
      `UPDATE user_sessions us
       SET is_active = FALSE
       FROM users u
       WHERE us.user_id = u.id
         AND u.company_id = $1
         AND us.is_active = TRUE`,
      [companyId]
    );
    return result.rowCount || 0;
  },

  // Audit Log methods
  async logAudit(log: { user_email?: string; user_id?: number; admin_user_id?: number; action: string; details?: any; ip_address?: string; user_agent?: string; success?: boolean; client_id?: string; }): Promise<void> {
    // Validate client_id exists before inserting (to avoid foreign key constraint violation)
    let validClientId: string | null = log.client_id || null;
    if (log.client_id) {
      const clientCheck = await pool.query(
        'SELECT 1 FROM oidc_clients WHERE client_id = $1 AND is_active = TRUE',
        [log.client_id]
      );
      if (clientCheck.rows.length === 0) {
        // Client doesn't exist - log warning and set to null to avoid foreign key violation
        console.warn(`[AUDIT] Client ${log.client_id} does not exist, logging audit without client_id to avoid foreign key violation`);
        validClientId = null;
      }
    }
    
    await pool.query(
      `INSERT INTO audit_logs (user_email, user_id, admin_user_id, action, details, ip_address, user_agent, success, client_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [log.user_email, log.user_id, log.admin_user_id, log.action, log.details ? JSON.stringify(log.details) : null, log.ip_address, log.user_agent, log.success !== false, validClientId]
    );
  },

  async getAuditLogs(filters: any): Promise<any[]> {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (filters.user_email) {
      query += ` AND user_email = $${paramCount++}`;
      params.push(filters.user_email);
    }
    if (filters.action) {
      query += ` AND action = $${paramCount++}`;
      params.push(filters.action);
    }
    if (filters.client_id) {
      query += ` AND client_id = $${paramCount++}`;
      params.push(filters.client_id);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(filters.limit || 100, filters.offset || 0);

    const result = await pool.query(query, params);
    return result.rows;
  },

  // Security & Configuration methods
  async getSystemConfig(key: string, defaultValue?: string): Promise<string> {
    const result = await pool.query(
      'SELECT config_value FROM system_config WHERE config_key = $1',
      [key]
    );
    return result.rows[0]?.config_value || defaultValue || '';
  },

  async updateSystemConfig(key: string, value: string, updatedByAdminId: number): Promise<void> {
    await pool.query(
      `INSERT INTO system_config (config_key, config_value, updated_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (config_key) DO UPDATE SET
         config_value = EXCLUDED.config_value,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()`,
      [key, value, updatedByAdminId]
    );
  },

  // Statistics
  async getStatistics(): Promise<any> {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM companies WHERE is_active = TRUE) as active_companies,
        (SELECT COUNT(*) FROM oidc_clients WHERE is_active = TRUE) as active_clients,
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as active_users,
        (SELECT COUNT(*) FROM admin_users WHERE is_active = TRUE) as active_admins,
        (SELECT COUNT(*) FROM user_sessions WHERE is_active = TRUE AND expires_at > NOW()) as active_sessions,
        (SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours') as logs_last_24h
    `);
    return stats.rows[0];
  },

  // Rate Limiting Configuration
  async getRateLimitConfig(): Promise<{
    maxAttempts: number;
    windowHours: number;
    windowMs: number;
  }> {
    // Priority: Environment variables > system_config > defaults
    let maxAttempts = 10; // default
    let windowHours = 1.0; // default
    
    // Try environment variables first
    if (process.env.RATE_LIMIT_MAX_ATTEMPTS) {
      const envMaxAttempts = parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS, 10);
      if (!isNaN(envMaxAttempts) && envMaxAttempts > 0) {
        maxAttempts = envMaxAttempts;
      }
    }
    
    if (process.env.RATE_LIMIT_WINDOW_HOURS) {
      const envWindowHours = parseFloat(process.env.RATE_LIMIT_WINDOW_HOURS);
      if (!isNaN(envWindowHours) && envWindowHours > 0) {
        windowHours = envWindowHours;
      }
    }
    
    // Fallback to system_config if env vars not set
    if (!process.env.RATE_LIMIT_MAX_ATTEMPTS) {
      const configMaxAttempts = await this.getSystemConfig('rate_limit_max_attempts', '10');
      if (configMaxAttempts) {
        const parsed = parseInt(configMaxAttempts, 10);
        if (!isNaN(parsed) && parsed > 0) {
          maxAttempts = parsed;
        }
      }
    }
    
    if (!process.env.RATE_LIMIT_WINDOW_HOURS) {
      const configWindowSeconds = await this.getSystemConfig('rate_limit_window_seconds', '3600');
      if (configWindowSeconds) {
        const parsedSeconds = parseInt(configWindowSeconds, 10);
        if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
          // Convert seconds to hours
          windowHours = parsedSeconds / 3600;
        }
      }
    }
    
    const windowMs = windowHours * 60 * 60 * 1000;
    
    return { maxAttempts, windowHours, windowMs };
  },

  // Rate Limiting
  async checkRateLimit(identifier: string, identifierType: string, action: string): Promise<boolean> {
    try {
      const config = await this.getRateLimitConfig();
      
      const result = await pool.query(
        `SELECT attempt_count, window_start, blocked_until 
         FROM rate_limits 
         WHERE identifier = $1 AND identifier_type = $2 AND action = $3`,
        [identifier, identifierType, action]
      );
      
      if (result.rows.length === 0) {
        // No rate limit record, allow
        return true;
      }
      
      const rateLimit = result.rows[0];
      
      // Check if currently blocked
      if (rateLimit.blocked_until && new Date(rateLimit.blocked_until) > new Date()) {
        return false;
      }
      
      // Check if window has expired (using configured window)
      const windowStart = new Date(rateLimit.window_start);
      const now = new Date();
      const windowExpired = (now.getTime() - windowStart.getTime()) > config.windowMs;
      
      if (windowExpired) {
        // Reset the rate limit
        await pool.query(
          `UPDATE rate_limits 
           SET attempt_count = 1, window_start = NOW(), blocked_until = NULL
           WHERE identifier = $1 AND identifier_type = $2 AND action = $3`,
          [identifier, identifierType, action]
        );
        return true;
      }
      
      // Check if within limits (using configured max attempts)
      return rateLimit.attempt_count < config.maxAttempts;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return true; // Allow on error
    }
  },

  // Record rate limit attempt (increment counter)
  async recordRateLimitAttempt(
    identifier: string,
    identifierType: 'ip' | 'email' | 'user' | 'client',
    action: string
  ): Promise<void> {
    try {
      const config = await this.getRateLimitConfig();
      
      // Use UPSERT to create or increment attempt_count
      // Check if window expired first
      const existing = await pool.query(
        `SELECT window_start FROM rate_limits 
         WHERE identifier = $1 AND identifier_type = $2 AND action = $3`,
        [identifier, identifierType, action]
      );
      
      let windowStart = new Date();
      if (existing.rows.length > 0) {
        const existingWindowStart = new Date(existing.rows[0].window_start);
        const now = new Date();
        const windowExpired = (now.getTime() - existingWindowStart.getTime()) > config.windowMs;
        windowStart = windowExpired ? now : existingWindowStart;
      }
      
      const result = await pool.query(
        `INSERT INTO rate_limits (identifier, identifier_type, action, attempt_count, window_start)
         VALUES ($1, $2, $3, 1, $4)
         ON CONFLICT (identifier, identifier_type, action) DO UPDATE SET
           attempt_count = CASE 
             WHEN (NOW() - rate_limits.window_start) > ($5::numeric * INTERVAL '1 hour')
             THEN 1
             ELSE rate_limits.attempt_count + 1
           END,
           window_start = CASE 
             WHEN (NOW() - rate_limits.window_start) > ($5::numeric * INTERVAL '1 hour')
             THEN NOW()
             ELSE rate_limits.window_start
           END
         RETURNING attempt_count, window_start`,
        [identifier, identifierType, action, windowStart, config.windowHours.toString()]
      );
      
      const record = result.rows[0];
      
      // If attempt_count exceeds limit, set blocked_until
      if (record.attempt_count >= config.maxAttempts) {
        const blockedUntil = new Date(Date.now() + config.windowMs);
        await pool.query(
          `UPDATE rate_limits 
           SET blocked_until = $1
           WHERE identifier = $2 AND identifier_type = $3 AND action = $4`,
          [blockedUntil, identifier, identifierType, action]
        );
      }
    } catch (error) {
      console.error('Rate limit record attempt failed:', error);
      // Don't throw - rate limiting should not break the application
    }
  },

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  },

  // Company-User Management Methods
  async getUsersByCompanyId(companyId: string): Promise<User[]> {
    const result = await pool.query(
      'SELECT * FROM users WHERE company_id = $1 ORDER BY name',
      [companyId]
    );
    return result.rows;
  },

  async deactivateUserCascade(userId: number, adminUserId: number): Promise<void> {
    await pool.query('SELECT deactivate_user_cascade($1)', [userId]);
    await this.logAudit({
      admin_user_id: adminUserId,
      action: 'user_deactivated_by_admin',
      details: { user_id: userId, cascade: true },
      success: true
    });
  },

  async reactivateUser(userId: number, adminUserId: number): Promise<void> {
    await pool.query('SELECT reactivate_user($1)', [userId]);
    await this.logAudit({
      admin_user_id: adminUserId,
      action: 'user_reactivated_by_admin',
      details: { user_id: userId },
      success: true
    });
  },

  async toggleCompanyStatus(companyId: string, isActive: boolean, adminUserId: number): Promise<Company> {
    const result = await pool.query(
      'UPDATE companies SET is_active = $2, updated_at = NOW() WHERE company_id = $1 RETURNING *',
      [companyId, isActive]
    );
    
    await this.logAudit({
      admin_user_id: adminUserId,
      action: isActive ? 'company_activated' : 'company_deactivated',
      details: { company_id: companyId },
      success: true
    });
    
    return result.rows[0];
  },

  async validateCompanyExists(companyId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM companies WHERE company_id = $1 AND is_active = TRUE',
      [companyId]
    );
    return result.rows.length > 0;
  },

  async updateUser(userId: number, updates: Partial<User>, adminUserId?: number): Promise<User> {
    // Use getUserByIdIncludingInactive to allow updating inactive users
    const oldUser = await this.getUserByIdIncludingInactive(userId);
    
    if (!oldUser) {
      throw new Error('User not found');
    }
    
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (updates.email !== undefined) {
      const normalizedEmail = normalizeEmail(updates.email);
      fields.push(`email = $${paramCount++}`);
      values.push(normalizedEmail);
    }
    if (updates.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.company_id !== undefined) {
      // Validate company exists
      const companyExists = await this.validateCompanyExists(updates.company_id);
      if (!companyExists) {
        throw new Error('Invalid company: Company does not exist or is inactive');
      }
      fields.push(`company_id = $${paramCount++}`);
      values.push(updates.company_id);
    }
    if (updates.password_hash !== undefined) {
      fields.push(`password_hash = $${paramCount++}`);
      values.push(updates.password_hash);
    }
    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(updates.is_active);
    }
    
    fields.push(`updated_at = NOW()`);
    values.push(userId);
    
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    
    if (adminUserId) {
      await this.logAudit({
        admin_user_id: adminUserId,
        action: 'user_updated',
        details: {
          user_id: userId,
          before: { email: oldUser.email, name: oldUser.name, company_id: oldUser.company_id },
          after: updates
        },
        success: true
      });
    }
    
    return result.rows[0];
  },

  async deleteCompanyWithValidation(companyId: string, adminUserId: number): Promise<{ success: boolean; userCount?: number; usersDeactivated?: number; usersDeleted?: number; error?: string }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Obtener información de la compañía
      const companyResult = await client.query(
        'SELECT company_id, company_name FROM companies WHERE company_id = $1',
        [companyId]
      );
      
      if (companyResult.rows.length === 0) {
        throw new Error(`Company with ID ${companyId} not found`);
      }
      
      const company = companyResult.rows[0];
      
      // 2. Obtener todos los usuarios de la compañía
      const usersResult = await client.query(
        'SELECT id, email, name, is_active FROM users WHERE company_id = $1',
        [companyId]
      );
      
      const users = usersResult.rows;
      const usersDeactivated: Array<{id: number, email: string, name: string}> = [];
      const usersDeleted: Array<{id: number, email: string, name: string}> = [];
      
      // 4. Invalidar todas las sesiones de usuarios de la compañía antes de eliminar
      // Esto asegura que los usuarios pierdan acceso inmediatamente
      const sessionsInvalidated = await this.invalidateUserSessionsForCompany(companyId);
      
      // 5. Eliminar todos los accesos a clientes de la compañía
      await client.query('DELETE FROM company_client_access WHERE company_id = $1', [companyId]);
      
      // 6. Desactivar cada usuario, establecer company_id = NULL, y luego eliminar físicamente
      for (const user of users) {
        // Desactivar usuario y establecer company_id = NULL para permitir eliminación de compañía
        await client.query(
          'UPDATE users SET is_active = FALSE, company_id = NULL, updated_at = NOW() WHERE id = $1',
          [user.id]
        );
        
        // Invalidar sesiones
        await client.query(
          'UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1',
          [user.id]
        );
        
        usersDeactivated.push({
          id: user.id,
          email: user.email,
          name: user.name
        });
        
        // Registrar desactivación en audit_logs
        await client.query(
          `INSERT INTO audit_logs (admin_user_id, user_id, user_email, action, details, success)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            adminUserId,
            user.id,
            user.email,
            'user_deactivated_by_company_deletion',
            JSON.stringify({
              user_id: user.id,
              user_email: user.email,
              user_name: user.name,
              company_id: companyId,
              company_name: company.company_name,
              reason: 'Company deletion',
              was_active: user.is_active,
              company_id_cleared: true
            }),
            true
          ]
        );
        
        // 4. Establecer user_id = NULL en audit_logs antes de eliminar el usuario
        // Esto evita violación de foreign key constraint
        await client.query(
          'UPDATE audit_logs SET user_id = NULL WHERE user_id = $1',
          [user.id]
        );
        
        // 5. Eliminar físicamente el usuario después de desactivarlo
        // Esto previene problemas futuros al intentar crear usuarios con el mismo email
        await client.query('DELETE FROM users WHERE id = $1', [user.id]);
        
        usersDeleted.push({
          id: user.id,
          email: user.email,
          name: user.name
        });
        
        // Registrar eliminación física en audit_logs
        await client.query(
          `INSERT INTO audit_logs (admin_user_id, user_email, action, details, success)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            adminUserId,
            user.email,
            'user_deleted_after_company_deletion',
            JSON.stringify({
              user_id: user.id,
              user_email: user.email,
              user_name: user.name,
              company_id: companyId,
              company_name: company.company_name,
              reason: 'Physical deletion after company deletion to prevent orphaned users',
              was_deactivated: true,
              was_deleted: true
            }),
            true
          ]
        );
      }
      
      // 7. Eliminar la compañía
      await client.query('DELETE FROM companies WHERE company_id = $1', [companyId]);
      
      // 8. Registrar eliminación de compañía en audit_logs
      await client.query(
        `INSERT INTO audit_logs (admin_user_id, action, details, success)
         VALUES ($1, $2, $3, $4)`,
        [
          adminUserId,
          'company_deleted_with_users',
          JSON.stringify({
            company_id: companyId,
            company_name: company.company_name,
            users_deactivated_count: users.length,
            users_deleted_count: usersDeleted.length,
            sessions_invalidated_count: sessionsInvalidated,
            users_deactivated: usersDeactivated,
            users_deleted: usersDeleted
          }),
          true
        ]
      );
      
      await client.query('COMMIT');
      
      return {
        success: true,
        userCount: users.length,
        usersDeactivated: users.length,
        usersDeleted: usersDeleted.length
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Registrar error en audit_logs usando el método existente
      await this.logAudit({
        admin_user_id: adminUserId,
        action: 'company_deletion_failed',
        details: {
          company_id: companyId,
          error: (error as Error).message
        },
        success: false
      });
      
      return {
        success: false,
        error: 'Failed to delete company: ' + (error as Error).message
      };
    } finally {
      client.release();
    }
  },

  async getActiveCompaniesForDropdown(): Promise<Array<{ company_id: string; company_name: string }>> {
    const result = await pool.query(
      'SELECT company_id, company_name FROM companies WHERE is_active = TRUE ORDER BY company_name',
      []
    );
    return result.rows;
  },

  /**
   * Elimina todos los usuarios huérfanos (sin company_id)
   * Esto limpia usuarios que quedaron huérfanos después de eliminar compañías
   */
  async deleteOrphanedUsers(adminUserId?: number): Promise<{ deletedCount: number; deletedUsers: Array<{id: number, email: string, name: string}> }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Obtener todos los usuarios huérfanos
      const orphanedUsersResult = await client.query(
        'SELECT id, email, name, is_active FROM users WHERE company_id IS NULL ORDER BY id'
      );
      
      const orphanedUsers = orphanedUsersResult.rows;
      const deletedUsers: Array<{id: number, email: string, name: string}> = [];
      
      if (orphanedUsers.length === 0) {
        await client.query('COMMIT');
        return { deletedCount: 0, deletedUsers: [] };
      }
      
      // 2. Eliminar cada usuario huérfano
      for (const user of orphanedUsers) {
        // Invalidar sesiones primero
        await client.query(
          'UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1',
          [user.id]
        );
        
        // Actualizar audit_logs para establecer user_id = NULL antes de eliminar
        // Esto mantiene el historial de auditoría pero permite eliminar el usuario
        await client.query(
          'UPDATE audit_logs SET user_id = NULL WHERE user_id = $1',
          [user.id]
        );
        
        // Registrar en audit_logs antes de eliminar
        await client.query(
          `INSERT INTO audit_logs (admin_user_id, user_email, action, details, success)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            adminUserId || null,
            user.email,
            'orphaned_user_deleted',
            JSON.stringify({
              user_id: user.id,
              user_email: user.email,
              user_name: user.name,
              was_active: user.is_active,
              reason: 'User orphaned after company deletion - system cleanup',
              operation: 'cleanup_orphaned_users'
            }),
            true
          ]
        );
        
        // Eliminar físicamente el usuario (ahora user_id ya no está referenciado en audit_logs)
        await client.query('DELETE FROM users WHERE id = $1', [user.id]);
        
        deletedUsers.push({
          id: user.id,
          email: user.email,
          name: user.name
        });
      }
      
      // 3. Registrar operación general en audit_logs
      await client.query(
        `INSERT INTO audit_logs (admin_user_id, action, details, success)
         VALUES ($1, $2, $3, $4)`,
        [
          adminUserId || null,
          'orphaned_users_cleanup',
          JSON.stringify({
            deleted_count: orphanedUsers.length,
            deleted_users: deletedUsers,
            operation: 'system_cleanup',
            reason: 'Remove orphaned users without company_id'
          }),
          true
        ]
      );
      
      await client.query('COMMIT');
      
      return {
        deletedCount: orphanedUsers.length,
        deletedUsers
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Registrar error en audit_logs
      await this.logAudit({
        admin_user_id: adminUserId,
        action: 'orphaned_users_cleanup_failed',
        details: {
          error: (error as Error).message,
          operation: 'cleanup_orphaned_users'
        },
        success: false
      });
      
      throw error;
    } finally {
      client.release();
    }
  }
};

export default pool;
