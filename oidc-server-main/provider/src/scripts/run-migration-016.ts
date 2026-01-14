import pg from 'pg';
const { Pool } = pg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration016() {
  // Create pool connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false }
      : false
  });

  const client = await pool.connect();

  try {
    console.log('🔄 Starting migration 016: Allow company deletion...');
    
    await client.query('BEGIN');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../../migrations/016_allow_company_deletion.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📝 Executing migration: 016_allow_company_deletion.sql');
    
    // Execute the migration SQL
    await client.query(sql);
    
    // Record the migration
    await client.query(
      'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
      [16, '016_allow_company_deletion.sql']
    );
    
    await client.query('COMMIT');
    
    console.log('✅ Migration 016 completed successfully!');
    console.log('✅ Company deletion with user deactivation is now enabled');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration016().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

