import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
import { db } from '../services/database.js';

dotenv.config();

async function cleanupOrphanedUsers() {
  try {
    console.log('🔄 Starting orphaned users cleanup...');
    console.log('This will delete all users with company_id = NULL');
    
    // Verificar usuarios huérfanos antes de eliminar usando una conexión directa
    const tempPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false }
        : false
    });
    
    const orphanedCount = await tempPool.query(
      'SELECT COUNT(*) as count FROM users WHERE company_id IS NULL'
    );
    
    const count = parseInt(orphanedCount.rows[0].count, 10);
    
    if (count === 0) {
      console.log('✅ No orphaned users found. Nothing to clean up.');
      await tempPool.end();
      return;
    }
    
    console.log(`📊 Found ${count} orphaned user(s) to delete:`);
    
    // Mostrar usuarios que se van a eliminar
    const orphanedUsers = await tempPool.query(
      'SELECT id, email, name, is_active FROM users WHERE company_id IS NULL ORDER BY id'
    );
    
    orphanedUsers.rows.forEach((user, index) => {
      console.log(`  ${index + 1}. ID: ${user.id}, Email: ${user.email}, Name: ${user.name}, Active: ${user.is_active}`);
    });
    
    console.log('\n⚠️  This action cannot be undone.');
    console.log('Deleting orphaned users...\n');
    
    await tempPool.end();
    
    // Ejecutar limpieza usando el método del servicio
    const result = await db.deleteOrphanedUsers();
    
    console.log(`✅ Cleanup completed successfully!`);
    console.log(`   - Deleted ${result.deletedCount} orphaned user(s)`);
    
    if (result.deletedUsers.length > 0) {
      console.log('\n📋 Deleted users:');
      result.deletedUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.name})`);
      });
    }
    
    console.log('\n✅ All orphaned users have been removed from the system.');
    console.log('📝 Operations have been logged in audit_logs.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupOrphanedUsers();

