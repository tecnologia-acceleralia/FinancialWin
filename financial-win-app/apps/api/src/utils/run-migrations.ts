import { DataSource } from 'typeorm';
import * as path from 'path';

/**
 * Ejecuta migraciones automáticamente al iniciar la aplicación en producción
 *
 * Esta función se ejecuta antes de iniciar el servidor para asegurar que
 * la base de datos esté actualizada con las últimas migraciones.
 *
 * @returns Promise<boolean> - true si las migraciones se ejecutaron correctamente, false si hubo error
 */
export async function runMigrationsOnStartup(): Promise<boolean> {
  // Solo ejecutar en producción si está habilitado
  const shouldRunMigrations =
    process.env.NODE_ENV === 'production' &&
    process.env.RUN_MIGRATIONS_ON_STARTUP !== 'false';

  if (!shouldRunMigrations) {
    console.log(
      '⏭️  Migraciones automáticas deshabilitadas o no en producción'
    );
    return true;
  }

  console.log('🔄 Iniciando ejecución automática de migraciones...');

  // Validar que DATABASE_URL esté configurado
  if (!process.env.DATABASE_URL) {
    console.error(
      '❌ ERROR: DATABASE_URL no está configurado. No se pueden ejecutar migraciones.'
    );
    return false;
  }

  try {
    // Determinar rutas correctas según si estamos en desarrollo o producción compilada
    // En producción compilada, las migraciones están en dist/src/migrations/*.js
    // En desarrollo, están en src/migrations/*.ts
    const isCompiled = __filename.endsWith('.js');
    const migrationsPath = isCompiled
      ? path.join(__dirname, '../migrations/*.js') // dist/src/utils -> dist/src/migrations
      : path.join(__dirname, '../migrations/*{.ts,.js}'); // src/utils -> src/migrations

    // Detectar SSL requirement from DATABASE_URL (Digital Ocean always requires SSL)
    const databaseUrl = process.env.DATABASE_URL || '';
    const requiresSSL =
      databaseUrl.includes('sslmode=require') ||
      databaseUrl.includes('sslmode=prefer') ||
      databaseUrl.includes('digitalocean.com') ||
      process.env.NODE_ENV === 'production';

    // Configure SSL: rejectUnauthorized: false for self-signed certificates (Digital Ocean)
    const sslConfig =
      requiresSSL || process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false;

    // Crear DataSource para migraciones
    const dataSource = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [], // No necesitamos entidades para migraciones
      migrations: [migrationsPath],
      migrationsTableName: 'migrations',
      synchronize: false,
      logging: process.env.MIGRATION_LOGGING === 'true', // Habilitar logging si se solicita
      ssl: sslConfig,
    });

    // Inicializar conexión
    await dataSource.initialize();
    console.log('✅ Conexión a base de datos establecida para migraciones');
    console.log(`📁 Path de migraciones: ${migrationsPath}`);

    // Ejecutar migraciones pendientes
    // runMigrations() devuelve un array de las migraciones que se ejecutaron
    // Si no hay migraciones pendientes, devuelve un array vacío
    console.log('🚀 Ejecutando migraciones pendientes...');

    try {
      const executedMigrations = await dataSource.runMigrations();

      if (executedMigrations.length === 0) {
        console.log(
          '✅ No hay migraciones pendientes - base de datos actualizada'
        );
      } else {
        console.log(
          `✅ Se ejecutaron ${executedMigrations.length} migración(es):`
        );
        executedMigrations.forEach((migration, index) => {
          console.log(`   ${index + 1}. ${migration.name}`);
        });
      }
    } catch (migrationError: unknown) {
      // Manejar errores específicos de migraciones que ya se ejecutaron
      const errorMessage =
        migrationError instanceof Error
          ? migrationError.message
          : String(migrationError);
      const errorCode =
        migrationError &&
        typeof migrationError === 'object' &&
        'code' in migrationError
          ? String(migrationError.code)
          : '';
      const stackTrace =
        migrationError instanceof Error ? migrationError.stack || '' : '';

      // Si el error es "relation already exists", la migración ya se ejecutó
      // pero no está registrada en la tabla migrations
      if (
        errorMessage.includes('already exists') ||
        (errorMessage.includes('relation') &&
          errorMessage.includes('exists')) ||
        errorCode === '42P07' // PostgreSQL error code for "duplicate_table"
      ) {
        console.warn(
          `⚠️  Migración falló porque la tabla/relación ya existe: ${errorMessage}`
        );
        console.warn(
          '⚠️  Esto puede indicar que la migración ya se ejecutó pero no está registrada en la tabla migrations'
        );

        // Intentar obtener el nombre de la migración del stack trace o del mensaje
        // El formato puede ser: "at async CreateDocumentHeadingStructure1758200000000.up"
        // o en el path: "/1758200000000-CreateDocumentHeadingStructure.js"
        let migrationName: string | null = null;
        let migrationTimestamp: number | null = null;

        // Buscar en el stack trace - formato completo: "ClassName1234567890123.up"
        const stackMatch = stackTrace.match(/(\w+\d+)\.up/);
        if (stackMatch) {
          migrationName = stackMatch[1];
          // Extraer timestamp del nombre completo
          const timestampMatch = migrationName.match(/(\d{13})$/);
          if (timestampMatch) {
            migrationTimestamp = parseInt(timestampMatch[1], 10);
          }
        }

        // Si no se encontró en el stack trace, buscar en el path del archivo
        if (!migrationName) {
          const pathMatch = stackTrace.match(/(\d{13})-(\w+)\.js/);
          if (pathMatch) {
            migrationTimestamp = parseInt(pathMatch[1], 10);
            const classNamePart = pathMatch[2]
              .split('-')
              .map(
                (word: string) => word.charAt(0).toUpperCase() + word.slice(1)
              )
              .join('');
            migrationName = classNamePart + migrationTimestamp;
          }
        }

        // Si aún no se encontró, buscar en el mensaje de error
        if (!migrationName) {
          const messageMatch = errorMessage.match(/Migration "([^"]+)"/);
          if (messageMatch) {
            migrationName = messageMatch[1];
            // Extraer timestamp del nombre de la migración
            const timestampMatch = migrationName.match(/(\d{13})$/);
            if (timestampMatch) {
              migrationTimestamp = parseInt(timestampMatch[1], 10);
            }
          }
        }

        if (migrationName && migrationTimestamp) {
          console.warn(
            `⚠️  Intentando registrar la migración "${migrationName}" manualmente...`
          );
          try {
            // Crear un queryRunner para ejecutar la query
            const queryRunner = dataSource.createQueryRunner();
            await queryRunner.connect();

            // Verificar estructura de la tabla migrations
            const migrationsTableExists = await queryRunner.query(`
              SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'migrations'
              );
            `);

            if (!migrationsTableExists[0].exists) {
              // Crear tabla migrations si no existe (estructura de TypeORM)
              await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS migrations (
                  id SERIAL PRIMARY KEY,
                  timestamp BIGINT NOT NULL,
                  name VARCHAR(255) NOT NULL UNIQUE
                );
              `);
              console.log('✅ Tabla migrations creada');
            }

            // Registrar la migración como ejecutada manualmente usando el timestamp correcto
            // Usar casting explícito para evitar problemas de inferencia de tipos
            await queryRunner.query(
              `
              INSERT INTO migrations (timestamp, name)
              SELECT $1::BIGINT, $2::VARCHAR
              WHERE NOT EXISTS (
                SELECT 1 FROM migrations WHERE name = $2::VARCHAR
              )
            `,
              [migrationTimestamp.toString(), migrationName]
            );
            console.log(
              `✅ Migración "${migrationName}" registrada manualmente con timestamp ${migrationTimestamp}`
            );

            await queryRunner.release();

            // Intentar ejecutar las migraciones restantes
            console.log('🔄 Intentando ejecutar migraciones restantes...');
            const remainingMigrations = await dataSource.runMigrations();
            if (remainingMigrations.length > 0) {
              console.log(
                `✅ Se ejecutaron ${remainingMigrations.length} migración(es) adicionales:`
              );
              remainingMigrations.forEach((migration, index) => {
                console.log(`   ${index + 1}. ${migration.name}`);
              });
            } else {
              console.log('✅ No hay más migraciones pendientes');
            }
          } catch (registerError: unknown) {
            const errorMsg =
              registerError instanceof Error
                ? registerError.message
                : String(registerError);
            console.error(
              '❌ Error al registrar migración manualmente:',
              errorMsg
            );
            // No lanzar error, continuar con el flujo normal
            // Esto permite que la aplicación inicie aunque haya problemas con migraciones antiguas
            console.warn(
              '⚠️  Continuando sin registrar la migración (puede causar problemas futuros)'
            );
          }
        } else {
          console.error(
            '❌ No se pudo extraer el nombre o timestamp de la migración del error'
          );
          console.error('❌ Mensaje de error:', errorMessage);
          console.error('❌ Stack trace:', stackTrace.substring(0, 500));
          // En producción, si no podemos manejar el error, fallar
          if (process.env.NODE_ENV === 'production') {
            throw migrationError;
          }
        }
      } else {
        // Para otros errores, lanzar normalmente
        throw migrationError;
      }
    }

    // Cerrar conexión
    await dataSource.destroy();
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('❌ ERROR al ejecutar migraciones:', errorMessage);
    if (errorStack) {
      console.error('Stack trace:', errorStack);
    }

    // En producción, si las migraciones fallan, es mejor detener la aplicación
    // para evitar que se inicie con un esquema de base de datos desactualizado
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '🛑 La aplicación no se iniciará debido a errores en las migraciones.'
      );
      console.error('💡 Soluciones posibles:');
      console.error('   1. Verificar que DATABASE_URL es correcto');
      console.error('   2. Verificar que la base de datos está accesible');
      console.error(
        '   3. Ejecutar migraciones manualmente: npm run migration:prod'
      );
      console.error(
        '   4. Deshabilitar migraciones automáticas: RUN_MIGRATIONS_ON_STARTUP=false'
      );
      process.exit(1);
    }

    return false;
  }
}
