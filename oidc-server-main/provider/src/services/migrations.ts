import pg from 'pg';
const { Pool } = pg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Migration {
  filename: string;
  version: number;
}

export class MigrationService {
  private pool: pg.Pool;
  private migrationsDir: string;

  constructor(pool: pg.Pool) {
    this.pool = pool;
    // Migrations directory is at provider/migrations
    this.migrationsDir = path.resolve(__dirname, '../../migrations');
  }

  /**
   * Initializes the migrations tracking table if it doesn't exist
   */
  private async initMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version INTEGER UNIQUE NOT NULL,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    try {
      await this.pool.query(query);
      console.log('✅ Migrations tracking table initialized');
    } catch (error) {
      console.error('❌ Failed to initialize migrations table:', error);
      throw error;
    }
  }

  /**
   * Gets all migration files from the migrations directory
   */
  private getMigrationFiles(): Migration[] {
    try {
      const files = fs.readdirSync(this.migrationsDir);
      
      const migrations = files
        .filter(file => file.endsWith('.sql'))
        .map(filename => {
          // Extract version number from filename (e.g., 001_core_schema.sql -> 1)
          const match = filename.match(/^(\d+)_/);
          if (!match) {
            throw new Error(`Invalid migration filename format: ${filename}`);
          }
          return {
            filename,
            version: parseInt(match[1], 10)
          };
        })
        .sort((a, b) => a.version - b.version);

      // Check for duplicate versions and warn
      const versionMap = new Map<number, string[]>();
      migrations.forEach(m => {
        if (!versionMap.has(m.version)) {
          versionMap.set(m.version, []);
        }
        versionMap.get(m.version)!.push(m.filename);
      });

      const duplicates = Array.from(versionMap.entries())
        .filter(([_, filenames]) => filenames.length > 1);

      if (duplicates.length > 0) {
        console.warn('⚠️ WARNING: Found duplicate migration versions:');
        duplicates.forEach(([version, filenames]) => {
          console.warn(`   Version ${version}: ${filenames.join(', ')}`);
        });
        console.warn('   This may cause migration conflicts. Please rename one of the files.');
      }

      return migrations;
    } catch (error) {
      console.error('❌ Failed to read migration files:', error);
      throw error;
    }
  }

  /**
   * Gets list of already executed migrations
   */
  private async getExecutedMigrations(): Promise<number[]> {
    try {
      const result = await this.pool.query(
        'SELECT version FROM schema_migrations ORDER BY version'
      );
      return result.rows.map(row => row.version);
    } catch (error) {
      console.error('❌ Failed to get executed migrations:', error);
      throw error;
    }
  }

  /**
   * Executes a single migration file
   */
  private async executeMigration(migration: Migration): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const filePath = path.join(this.migrationsDir, migration.filename);
      const sql = fs.readFileSync(filePath, 'utf-8');
      
      console.log(`📝 Executing migration: ${migration.filename}`);
      
      // Execute the migration SQL
      await client.query(sql);
      
      // Record the migration (use ON CONFLICT to handle duplicate versions gracefully)
      await client.query(
        'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2) ON CONFLICT (version) DO UPDATE SET filename = EXCLUDED.filename',
        [migration.version, migration.filename]
      );
      
      await client.query('COMMIT');
      
      console.log(`✅ Migration completed: ${migration.filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Migration failed: ${migration.filename}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Runs all pending migrations
   */
  async runMigrations(): Promise<void> {
    console.log('\n🔄 Starting database migration process...');
    
    try {
      // Initialize migrations table
      await this.initMigrationsTable();
      
      // Get all migration files
      const allMigrations = this.getMigrationFiles();
      console.log(`📁 Found ${allMigrations.length} migration files`);
      
      // Get executed migrations (initial read)
      let executedVersions = await this.getExecutedMigrations();
      console.log(`📊 Already executed: ${executedVersions.length} migrations`);

      // Backfill: if schema already exists but no tracking, mark structural migrations as executed
      if (executedVersions.length === 0) {
        try {
          const check = await this.pool.query(`
            SELECT 
              EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='companies') AS companies,
              EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') AS users,
              EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='oidc_clients') AS oidc_clients
          `);

          const row = check.rows[0] || {};
          const schemaExists = !!(row.companies && row.users && row.oidc_clients);

          if (schemaExists) {
            console.log('🧩 Detected existing schema without tracking. Performing backfill of schema_migrations...');

            // Prefer to backfill only structural migrations, allowing seed migrations to run idempotently
            const structuralVersionsPreferred = new Set<number>([1, 2, 3, 5, 6, 7, 10]);
            const availableVersions = new Set<number>(allMigrations.map(m => m.version));
            const versionsToBackfill = Array.from(structuralVersionsPreferred).filter(v => availableVersions.has(v));

            if (versionsToBackfill.length > 0) {
              const client = await this.pool.connect();
              try {
                await client.query('BEGIN');
                for (const version of versionsToBackfill) {
                  const filename = allMigrations.find(m => m.version === version)!.filename;
                  await client.query(
                    'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
                    [version, filename]
                  );
                }
                await client.query('COMMIT');
                console.log(`✅ Backfill completed for versions: ${versionsToBackfill.join(', ')}`);
              } catch (bfErr) {
                await client.query('ROLLBACK');
                console.error('❌ Backfill failed:', bfErr);
                throw bfErr;
              } finally {
                client.release();
              }

              // Refresh executed versions after backfill
              executedVersions = await this.getExecutedMigrations();
              console.log(`📊 After backfill, executed: ${executedVersions.length} migrations`);
            }
          }
        } catch (bfCheckErr) {
          console.error('❌ Failed during backfill pre-check:', bfCheckErr);
          // Continue without backfill; normal flow may still work
        }
      }
      
      // Find pending migrations
      const pendingMigrations = allMigrations.filter(
        migration => !executedVersions.includes(migration.version)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('✅ Database is up to date, no pending migrations');
        return;
      }
      
      console.log(`🚀 Executing ${pendingMigrations.length} pending migrations...`);
      
      // Execute pending migrations in order
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      console.log('✅ All migrations completed successfully\n');
    } catch (error) {
      console.error('❌ Migration process failed:', error);
      throw error;
    }
  }

  /**
   * Check if database needs initialization (no tables exist)
   */
  async isDatabaseUninitialized(): Promise<boolean> {
    try {
      const result = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'companies'
        ) as table_exists
      `);
      
      return !result.rows[0].table_exists;
    } catch (error) {
      console.error('❌ Failed to check database status:', error);
      // On error, assume we need to initialize
      return true;
    }
  }
}

