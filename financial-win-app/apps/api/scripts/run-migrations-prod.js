#!/usr/bin/env node

/**
 * Script de gestión de migraciones para producción
 * 
 * Este script permite:
 * - Ver el estado de las migraciones (aplicadas vs pendientes)
 * - Ejecutar solo las migraciones faltantes
 * - Verificar la conexión a la base de datos
 * 
 * Uso desde DigitalOcean:
 *   cd apps/api
 *   node scripts/run-migrations-prod.js status    # Ver estado
 *   node scripts/run-migrations-prod.js run      # Ejecutar migraciones pendientes
 *   node scripts/run-migrations-prod.js check    # Verificar conexión
 */

const { DataSource } = require('typeorm');
const path = require('path');
const fs = require('fs');

// Colores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logStep(message) {
  log(`\n📋 ${message}`, 'blue');
}

// Cargar variables de entorno
const envDevPath = path.join(__dirname, '..', '.env.dev');
const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envDevPath)) {
  require('dotenv').config({ path: envDevPath });
} else if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

/**
 * Crear DataSource para migraciones
 */
function createDataSource() {
  const isProduction = process.env.NODE_ENV === 'production';
  const databaseUrl = process.env.DATABASE_URL;

  // Validar que DATABASE_URL esté configurado
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL no está configurado. Por favor, configura las variables de entorno.'
    );
  }

  // Detectar SSL requirement
  const requiresSSL =
    databaseUrl.includes('sslmode=require') ||
    databaseUrl.includes('sslmode=prefer') ||
    databaseUrl.includes('digitalocean.com') ||
    isProduction;

  const sslConfig = requiresSSL || process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false;

  // Determinar ruta de migraciones
  // NestJS compila src/migrations/ a dist/src/migrations/*.js
  // Pero data-source.cjs espera dist/migrations/*.js
  // Intentamos ambas rutas para compatibilidad
  const migrationsPath1 = path.join(__dirname, '..', 'dist', 'src', 'migrations', '*.js');
  const migrationsPath2 = path.join(__dirname, '..', 'dist', 'migrations', '*.js');
  
  // Usar la ruta que existe, o la primera por defecto
  const migrationsPath = fs.existsSync(path.join(__dirname, '..', 'dist', 'src', 'migrations'))
    ? migrationsPath1
    : migrationsPath2;

  return new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: [], // No necesitamos entidades para migraciones
    migrations: [migrationsPath],
    migrationsTableName: 'migrations',
    synchronize: false,
    logging: false,
    ssl: sslConfig,
  });
}

/**
 * Verificar conexión a la base de datos
 */
async function checkConnection(dataSource) {
  try {
    await dataSource.initialize();
    logSuccess('Conexión a la base de datos establecida');
    return true;
  } catch (error) {
    logError(`Error al conectar a la base de datos: ${error.message}`);
    return false;
  }
}

/**
 * Obtener estado de las migraciones
 */
async function getMigrationStatus(dataSource) {
  try {
    await dataSource.initialize();

    // Obtener todas las migraciones disponibles (archivos)
    // Intentar ambas rutas posibles para compatibilidad
    const migrationsDir1 = path.join(__dirname, '..', 'dist', 'src', 'migrations');
    const migrationsDir2 = path.join(__dirname, '..', 'dist', 'migrations');
    
    const migrationsDir = fs.existsSync(migrationsDir1) ? migrationsDir1 : migrationsDir2;
    
    if (!fs.existsSync(migrationsDir)) {
      logWarning(`Directorio de migraciones no encontrado en ninguna de las rutas esperadas:`);
      logWarning(`  - ${migrationsDir1}`);
      logWarning(`  - ${migrationsDir2}`);
      logInfo('Asegúrate de haber ejecutado: pnpm build');
      await dataSource.destroy();
      return null;
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js') && file !== 'ExampleMigration.js')
      .map(file => {
        // Extraer timestamp y nombre de la migración
        const match = file.match(/^(\d+)-(.+)\.js$/);
        if (match) {
          return {
            timestamp: parseInt(match[1]),
            name: match[2],
            filename: file,
            fullName: `${match[1]}-${match[2]}`,
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.timestamp - b.timestamp);

    // Obtener migraciones ejecutadas desde la base de datos
    const executedMigrations = await dataSource.query(`
      SELECT timestamp, name 
      FROM migrations 
      ORDER BY timestamp ASC
    `);

    const executedMap = new Map();
    executedMigrations.forEach(m => {
      executedMap.set(m.name, m.timestamp);
    });

    // Clasificar migraciones
    const applied = [];
    const pending = [];

    migrationFiles.forEach(migration => {
      const isExecuted = executedMap.has(migration.fullName);
      if (isExecuted) {
        applied.push(migration);
      } else {
        pending.push(migration);
      }
    });

    await dataSource.destroy();

    return {
      applied,
      pending,
      total: migrationFiles.length,
      appliedCount: applied.length,
      pendingCount: pending.length,
    };
  } catch (error) {
    logError(`Error al obtener estado de migraciones: ${error.message}`);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    return null;
  }
}

/**
 * Mostrar estado de migraciones
 */
async function showStatus() {
  logStep('Verificando estado de migraciones...\n');

  const dataSource = createDataSource();

  // Verificar conexión
  const connected = await checkConnection(dataSource);
  if (!connected) {
    process.exit(1);
  }

  await dataSource.destroy();

  // Obtener estado
  const status = await getMigrationStatus(dataSource);
  if (!status) {
    process.exit(1);
  }

  // Mostrar resumen
  log('\n' + '='.repeat(60), 'bright');
  log('📊 ESTADO DE MIGRACIONES', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  log(`Total de migraciones: ${status.total}`, 'cyan');
  log(`✅ Aplicadas: ${status.appliedCount}`, 'green');
  log(`⏳ Pendientes: ${status.pendingCount}`, status.pendingCount > 0 ? 'yellow' : 'green');

  if (status.applied.length > 0) {
    log('\n📋 Migraciones Aplicadas:', 'green');
    status.applied.forEach((migration, index) => {
      const date = new Date(migration.timestamp);
      log(`   ${index + 1}. ${migration.fullName}`, 'green');
      log(`      📅 ${date.toLocaleString()}`, 'cyan');
    });
  }

  if (status.pending.length > 0) {
    log('\n⏳ Migraciones Pendientes:', 'yellow');
    status.pending.forEach((migration, index) => {
      const date = new Date(migration.timestamp);
      log(`   ${index + 1}. ${migration.fullName}`, 'yellow');
      log(`      📅 ${date.toLocaleString()}`, 'cyan');
    });
  } else {
    log('\n✅ ¡Todas las migraciones están aplicadas!', 'green');
  }

  log('\n' + '='.repeat(60) + '\n', 'bright');
}

/**
 * Ejecutar migraciones pendientes
 */
async function runMigrations() {
  logStep('Ejecutando migraciones pendientes...\n');

  const dataSource = createDataSource();

  // Verificar conexión
  const connected = await checkConnection(dataSource);
  if (!connected) {
    process.exit(1);
  }

  // Obtener estado antes de ejecutar
  await dataSource.destroy();
  const statusBefore = await getMigrationStatus(dataSource);
  
  if (!statusBefore) {
    process.exit(1);
  }

  if (statusBefore.pendingCount === 0) {
    logSuccess('No hay migraciones pendientes. La base de datos está actualizada.');
    return;
  }

  // Mostrar migraciones que se van a ejecutar
  log('\n📋 Migraciones que se ejecutarán:', 'yellow');
  statusBefore.pending.forEach((migration, index) => {
    log(`   ${index + 1}. ${migration.fullName}`, 'yellow');
  });

  log('\n');

  // Ejecutar migraciones
  try {
    await dataSource.initialize();
    
    logInfo('Ejecutando migraciones...');
    const executedMigrations = await dataSource.runMigrations();

    if (executedMigrations.length === 0) {
      logWarning('No se ejecutaron migraciones (puede que ya estén aplicadas)');
    } else {
      logSuccess(`Se ejecutaron ${executedMigrations.length} migración(es):`);
      executedMigrations.forEach((migration, index) => {
        log(`   ${index + 1}. ${migration.name}`, 'green');
      });
    }

    await dataSource.destroy();

    // Mostrar estado final
    log('\n');
    await showStatus();

  } catch (error) {
    logError(`Error al ejecutar migraciones: ${error.message}`);
    if (error.stack) {
      logError(`Stack trace: ${error.stack.substring(0, 500)}`);
    }
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

/**
 * Verificar solo la conexión
 */
async function checkOnly() {
  logStep('Verificando conexión a la base de datos...\n');

  const dataSource = createDataSource();
  const connected = await checkConnection(dataSource);

  if (connected) {
    // Verificar que la tabla migrations existe
    try {
      await dataSource.query('SELECT 1 FROM migrations LIMIT 1');
      logSuccess('Tabla de migraciones existe');
    } catch (error) {
      logWarning('Tabla de migraciones no existe (se creará automáticamente)');
    }

    await dataSource.destroy();
    logSuccess('Verificación completada exitosamente');
  } else {
    process.exit(1);
  }
}

/**
 * Función principal
 */
async function main() {
  const command = process.argv[2] || 'status';

  log('\n' + '='.repeat(60), 'bright');
  log('🚀 Gestor de Migraciones - Producción', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  switch (command) {
    case 'status':
      await showStatus();
      break;

    case 'run':
      await runMigrations();
      break;

    case 'check':
      await checkOnly();
      break;

    default:
      logError(`Comando desconocido: ${command}`);
      log('\nUso:', 'bright');
      log('  node scripts/run-migrations-prod.js status    # Ver estado de migraciones');
      log('  node scripts/run-migrations-prod.js run      # Ejecutar migraciones pendientes');
      log('  node scripts/run-migrations-prod.js check    # Verificar conexión a BD');
      process.exit(1);
  }
}

// Ejecutar
main().catch(error => {
  logError(`Error fatal: ${error.message}`);
  if (error.stack) {
    logError(error.stack);
  }
  process.exit(1);
});

