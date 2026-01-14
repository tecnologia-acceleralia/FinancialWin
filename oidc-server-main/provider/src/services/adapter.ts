import type { Pool } from 'pg';

type AdapterPayload = Record<string, any>;

export class PostgresAdapter {
  private model: string;
  private pool: Pool;

  constructor(model: string, pool: Pool) {
    this.model = model;
    this.pool = pool;
  }

  private getExpiry(payload: AdapterPayload): Date | null {
    // oidc-provider sets "exp" as seconds since epoch for many models
    const exp = payload?.exp;
    if (!exp || typeof exp !== 'number') return null;
    try {
      return new Date(exp * 1000);
    } catch {
      return null;
    }
  }

  async upsert(id: string, payload: AdapterPayload, expiresIn?: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : this.getExpiry(payload);
      const grantId = payload?.grantId ?? null;
      const userCode = payload?.userCode ?? null;
      const uid = payload?.uid ?? null;

      await client.query(
        `INSERT INTO oidc_adapter (id, kind, payload, grant_id, user_code, uid, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           payload = EXCLUDED.payload,
           grant_id = EXCLUDED.grant_id,
           user_code = EXCLUDED.user_code,
           uid = EXCLUDED.uid,
           expires_at = EXCLUDED.expires_at`,
        [id, this.model, payload, grantId, userCode, uid, expiresAt]
      );
    } finally {
      client.release();
    }
  }

  async find(id: string): Promise<AdapterPayload | undefined> {
    const { rows } = await this.pool.query(
      `SELECT payload FROM oidc_adapter WHERE id = $1 AND kind = $2 AND (expires_at IS NULL OR expires_at > NOW())`,
      [id, this.model]
    );
    return rows[0]?.payload;
  }

  async findByUserCode(userCode: string): Promise<AdapterPayload | undefined> {
    const { rows } = await this.pool.query(
      `SELECT payload FROM oidc_adapter WHERE user_code = $1 AND kind = $2 AND (expires_at IS NULL OR expires_at > NOW())`,
      [userCode, this.model]
    );
    return rows[0]?.payload;
  }

  async findByUid(uid: string): Promise<AdapterPayload | undefined> {
    const { rows } = await this.pool.query(
      `SELECT payload FROM oidc_adapter WHERE uid = $1 AND kind = $2 AND (expires_at IS NULL OR expires_at > NOW())`,
      [uid, this.model]
    );
    return rows[0]?.payload;
  }

  async destroy(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM oidc_adapter WHERE id = $1 AND kind = $2`, [id, this.model]);
  }

  async revokeByGrantId(grantId: string): Promise<void> {
    await this.pool.query(`DELETE FROM oidc_adapter WHERE grant_id = $1`, [grantId]);
  }

  async consume(id: string): Promise<void> {
    await this.pool.query(`UPDATE oidc_adapter SET consumed_at = NOW() WHERE id = $1 AND kind = $2`, [id, this.model]);
  }
}

export function adapterFactory(pool: Pool) {
  return class FactoryAdapter {
    model: string;
    constructor(model: string) {
      this.model = model;
      return new PostgresAdapter(model, pool) as any;
    }
  } as any;
}

