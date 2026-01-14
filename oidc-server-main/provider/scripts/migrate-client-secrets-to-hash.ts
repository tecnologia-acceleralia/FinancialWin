#!/usr/bin/env tsx
/**
 * Script de migración: Hashear client_secret de writehub-client
 * 
 * Este script:
 * 1. Lee el client_secret actual en texto plano de writehub-client
 * 2. Lo hashea con bcrypt
 * 3. Genera consulta SQL UPDATE para ejecutar manualmente
 * 
 * IMPORTANTE: Después de ejecutar el UPDATE, el secreto original se pierde.
 * Write-mvp debe seguir usando el valor en texto plano para autenticación,
 * ya que el código comparará con bcrypt.compare().
 * 
 * Uso:
 *   tsx provider/scripts/migrate-client-secrets-to-hash.ts
 */

import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: true }
    : false
});

async function migrateClientSecret() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Buscando cliente writehub-client...');
    
    // Get current client_secret in plain text
    const result = await client.query(
      `SELECT id, client_id, client_secret, client_name 
       FROM oidc_clients 
       WHERE client_id = $1`,
      ['writehub-client']
    );
    
    if (result.rows.length === 0) {
      console.error('❌ Cliente writehub-client no encontrado');
      process.exit(1);
    }
    
    const clientData = result.rows[0];
    const plainSecret = clientData.client_secret;
    
    console.log(`✅ Cliente encontrado: ${clientData.client_name} (ID: ${clientData.id})`);
    console.log(`📝 Secret actual (primeros 20 chars): ${plainSecret.substring(0, 20)}...`);
    
    // Check if already hashed
    if (plainSecret.startsWith('$2b$') || plainSecret.startsWith('$2a$')) {
      console.log('⚠️  El secret ya está hasheado. No se requiere migración.');
      return;
    }
    
    console.log('🔐 Hasheando secret con bcrypt (salt rounds: 10)...');
    const hashedSecret = await bcrypt.hash(plainSecret, 10);
    
    console.log('\n✅ Hash generado exitosamente');
    console.log('\n📋 Consulta SQL para ejecutar manualmente:');
    console.log('─'.repeat(80));
    console.log(`UPDATE oidc_clients`);
    console.log(`SET client_secret = '${hashedSecret}'`);
    console.log(`WHERE client_id = 'writehub-client';`);
    console.log('─'.repeat(80));
    
    console.log('\n⚠️  IMPORTANTE:');
    console.log('   1. Ejecuta la consulta SQL anterior en tu base de datos');
    console.log('   2. Después de ejecutar, el secreto original se perderá');
    console.log('   3. Write-mvp debe seguir usando el valor en texto plano:');
    console.log(`      ${plainSecret}`);
    console.log('   4. El código comparará automáticamente con bcrypt.compare()');
    
    // Ask if user wants to execute automatically
    console.log('\n❓ ¿Deseas ejecutar el UPDATE automáticamente? (s/n)');
    console.log('   (Presiona Ctrl+C para cancelar y ejecutar manualmente)');
    
    // For non-interactive mode, just show the SQL
    console.log('\n💡 Para ejecutar automáticamente, descomenta las líneas siguientes en el script');
    
  } catch (error: any) {
    console.error('❌ Error durante la migración:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrateClientSecret()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

