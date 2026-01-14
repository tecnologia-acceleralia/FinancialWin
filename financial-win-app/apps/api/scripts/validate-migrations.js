#!/usr/bin/env node

/**
 * Script de validación de migraciones
 * Verifica que las migraciones TypeScript compilen correctamente
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../src/migrations');

function printStatus(message) {
  console.log(`✅ ${message}`);
}

function printError(message) {
  console.error(`❌ ${message}`);
}

function printWarning(message) {
  console.warn(`⚠️  ${message}`);
}

function validateMigrations() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Validando migraciones...');
  console.log('='.repeat(60) + '\n');

  // Verificar que el directorio de migraciones existe
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    printWarning(`Directorio de migraciones no encontrado: ${MIGRATIONS_DIR}`);
    printStatus('No hay migraciones para validar');
    return true;
  }

  // Leer archivos de migraciones
  const files = fs.readdirSync(MIGRATIONS_DIR);
  const migrationFiles = files.filter(
    (file) => file.endsWith('.ts') && file.includes('Migration')
  );

  if (migrationFiles.length === 0) {
    printWarning('No se encontraron archivos de migración');
    printStatus('Validación completada (sin migraciones)');
    return true;
  }

  printStatus(`Encontradas ${migrationFiles.length} migración(es)`);

  // Validar estructura básica de cada migración
  let hasErrors = false;

  for (const file of migrationFiles) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Validaciones básicas
    const checks = [
      {
        name: 'Implementa MigrationInterface',
        test: content.includes('MigrationInterface'),
      },
      {
        name: 'Tiene método up()',
        test: /up\s*\([^)]*\)\s*:/.test(content) || /async\s+up\s*\(/.test(content),
      },
      {
        name: 'Tiene método down()',
        test: /down\s*\([^)]*\)\s*:/.test(content) || /async\s+down\s*\(/.test(content),
      },
      {
        name: 'Exporta la clase',
        test: /export\s+class\s+\w+Migration/.test(content),
      },
    ];

    const failedChecks = checks.filter((check) => !check.test);

    if (failedChecks.length > 0) {
      printError(`Migración ${file} tiene problemas:`);
      failedChecks.forEach((check) => {
        printError(`  - Falta: ${check.name}`);
      });
      hasErrors = true;
    } else {
      printStatus(`  ✓ ${file}`);
    }
  }

  if (hasErrors) {
    printError('\n❌ Validación de migraciones falló');
    printError('Corrige los errores antes de continuar');
    return false;
  }

  printStatus('\n✅ Todas las migraciones son válidas');
  printStatus('Nota: La compilación TypeScript verificará la sintaxis completa');
  return true;
}

// Ejecutar validación
const isValid = validateMigrations();

if (!isValid) {
  process.exit(1);
}

process.exit(0);

