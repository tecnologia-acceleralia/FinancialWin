/**
 * Utilidades para crear migraciones idempotentes
 *
 * Estas funciones ayudan a crear migraciones que pueden ejecutarse múltiples veces
 * sin causar errores, lo cual es crítico para producción.
 */

import { QueryRunner, Table } from 'typeorm';

/**
 * Verifica si una tabla existe en la base de datos
 */
export async function tableExists(
  queryRunner: QueryRunner,
  tableName: string
): Promise<boolean> {
  const result = await queryRunner.query(
    `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `,
    [tableName]
  );

  return result[0].exists;
}

/**
 * Crea una tabla solo si no existe (idempotente)
 */
export async function createTableIfNotExists(
  queryRunner: QueryRunner,
  table: Table,
  ifNotExist: boolean = true
): Promise<void> {
  const exists = await tableExists(queryRunner, table.name);

  if (exists) {
    console.log(`ℹ️  Tabla "${table.name}" ya existe, omitiendo creación`);
    return;
  }

  await queryRunner.createTable(table, ifNotExist);
}

/**
 * Verifica si una columna existe en una tabla
 */
export async function columnExists(
  queryRunner: QueryRunner,
  tableName: string,
  columnName: string
): Promise<boolean> {
  const result = await queryRunner.query(
    `
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1 
      AND column_name = $2
    );
  `,
    [tableName, columnName]
  );

  return result[0].exists;
}

/**
 * Verifica si un índice existe
 */
export async function indexExists(
  queryRunner: QueryRunner,
  indexName: string
): Promise<boolean> {
  const result = await queryRunner.query(
    `
    SELECT EXISTS (
      SELECT FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname = $1
    );
  `,
    [indexName]
  );

  return result[0].exists;
}

/**
 * Verifica si una foreign key existe
 */
export async function foreignKeyExists(
  queryRunner: QueryRunner,
  tableName: string,
  constraintName: string
): Promise<boolean> {
  const result = await queryRunner.query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
        AND table_name = $1
        AND constraint_name = $2
    );
  `,
    [tableName, constraintName]
  );

  return result[0].exists;
}

/**
 * Elimina una tabla solo si existe (idempotente)
 */
export async function dropTableIfExists(
  queryRunner: QueryRunner,
  tableName: string
): Promise<void> {
  const exists = await tableExists(queryRunner, tableName);

  if (!exists) {
    console.log(`ℹ️  Tabla "${tableName}" no existe, omitiendo eliminación`);
    return;
  }

  await queryRunner.query(`DROP TABLE IF EXISTS "${tableName}"`);
}

/**
 * Ejemplo de uso en una migración:
 *
 * ```typescript
 * import { MigrationInterface, QueryRunner, Table } from 'typeorm';
 * import { createTableIfNotExists, tableExists } from '../utils/migration-helpers';
 *
 * export class CreateMyTable1234567890123 implements MigrationInterface {
 *   name = 'CreateMyTable1234567890123';
 *
 *   public async up(queryRunner: QueryRunner): Promise<void> {
 *     // Opción 1: Usar helper function
 *     await createTableIfNotExists(queryRunner, new Table({
 *       name: 'my_table',
 *       columns: [...]
 *     }));
 *
 *     // Opción 2: Verificación manual
 *     if (!(await tableExists(queryRunner, 'my_table'))) {
 *       await queryRunner.createTable(new Table({
 *         name: 'my_table',
 *         columns: [...]
 *       }), true);
 *     }
 *
 *     // Opción 3: SQL directo con IF NOT EXISTS
 *     await queryRunner.query(`
 *       CREATE TABLE IF NOT EXISTS "my_table" (
 *         "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4()
 *       );
 *     `);
 *   }
 *
 *   public async down(queryRunner: QueryRunner): Promise<void> {
 *     await queryRunner.query(`DROP TABLE IF EXISTS "my_table"`);
 *   }
 * }
 * ```
 */
