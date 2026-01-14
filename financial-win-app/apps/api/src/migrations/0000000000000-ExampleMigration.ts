import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ⚠️ MIGRACIÓN DE EJEMPLO - NO SE EJECUTA ⚠️
 *
 * Esta migración es SOLO un ejemplo educativo para mostrar cómo crear migraciones.
 * Los métodos up() y down() están vacíos para evitar que se ejecute accidentalmente.
 *
 * Esta migración NO creará ninguna tabla en la base de datos.
 *
 * ============================================================================
 * GUÍA: Cómo crear y usar migraciones
 * ============================================================================
 *
 * 1. CREAR UNA NUEVA MIGRACIÓN:
 *    cd apps/api
 *    pnpm migration:generate src/migrations/NombreDescriptivo
 *
 *    Esto generará un archivo con timestamp como:
 *    src/migrations/1234567890123-NombreDescriptivo.ts
 *
 * 2. EJECUTAR MIGRACIONES:
 *    pnpm migration:run
 *
 * 3. REVERTIR ÚLTIMA MIGRACIÓN:
 *    pnpm migration:revert
 *
 * 4. VER ESTADO DE MIGRACIONES:
 *    pnpm migration:show
 *
 * ============================================================================
 * EJEMPLOS DE CÓDIGO PARA MIGRACIONES
 * ============================================================================
 *
 * CREAR UNA TABLA:
 * ```typescript
 * await queryRunner.createTable(
 *   new Table({
 *     name: 'mi_tabla',
 *     columns: [
 *       {
 *         name: 'id',
 *         type: 'uuid',
 *         isPrimary: true,
 *         generationStrategy: 'uuid',
 *         default: 'uuid_generate_v4()',
 *       },
 *       {
 *         name: 'nombre',
 *         type: 'varchar',
 *         length: '255',
 *         isNullable: false,
 *       },
 *       {
 *         name: 'created_at',
 *         type: 'timestamp',
 *         default: 'CURRENT_TIMESTAMP',
 *       },
 *       {
 *         name: 'updated_at',
 *         type: 'timestamp',
 *         default: 'CURRENT_TIMESTAMP',
 *         onUpdate: 'CURRENT_TIMESTAMP',
 *       },
 *     ],
 *     indices: [
 *       {
 *         name: 'IDX_mi_tabla_nombre',
 *         columnNames: ['nombre'],
 *       },
 *     ],
 *   }),
 *   true, // Si la tabla existe, no fallar
 * );
 * ```
 *
 * AGREGAR UNA COLUMNA:
 * ```typescript
 * await queryRunner.addColumn('mi_tabla', new TableColumn({
 *   name: 'nueva_columna',
 *   type: 'varchar',
 *   length: '100',
 *   isNullable: true,
 * }));
 * ```
 *
 * CREAR UN ÍNDICE:
 * ```typescript
 * await queryRunner.createIndex('mi_tabla', new TableIndex({
 *   name: 'IDX_mi_tabla_columna',
 *   columnNames: ['columna'],
 * }));
 * ```
 *
 * ELIMINAR UNA TABLA (en down()):
 * ```typescript
 * await queryRunner.dropTable('mi_tabla', true, true, true);
 * ```
 *
 * ============================================================================
 * MEJORES PRÁCTICAS
 * ============================================================================
 *
 * 1. SIEMPRE implementa down() para poder revertir cambios
 * 2. Usa nombres descriptivos para migraciones
 * 3. Una migración = un cambio lógico (no mezcles múltiples cambios)
 * 4. Prueba up() y down() en desarrollo antes de producción
 * 5. Usa índices para columnas que se consultan frecuentemente
 * 6. Incluye created_at y updated_at en tablas nuevas
 */
export class ExampleMigration0000000000000 implements MigrationInterface {
  /**
   * Aplicar cambios (crear tabla, agregar columnas, etc.)
   *
   * ⚠️ ESTE MÉTODO ESTÁ VACÍO - NO EJECUTA NADA
   *
   * Este es solo un ejemplo. En una migración real, aquí iría el código
   * para crear tablas, agregar columnas, crear índices, etc.
   *
   * Ver ejemplos en los comentarios de la clase.
   */
  public async up(_queryRunner: QueryRunner): Promise<void> {
    // ⚠️ MIGRACIÓN DE EJEMPLO - NO EJECUTA NADA
    // Este método está vacío intencionalmente para evitar que se ejecute.
    //
    // En una migración real, aquí iría código como:
    // await queryRunner.createTable(...);
    // await queryRunner.addColumn(...);
    // await queryRunner.createIndex(...);
  }

  /**
   * Revertir cambios (eliminar tabla, quitar columnas, etc.)
   *
   * ⚠️ ESTE MÉTODO ESTÁ VACÍO - NO EJECUTA NADA
   *
   * Este es solo un ejemplo. En una migración real, aquí iría el código
   * para revertir los cambios hechos en up().
   *
   * IMPORTANTE: Siempre implementa down() para poder revertir migraciones.
   */
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // ⚠️ MIGRACIÓN DE EJEMPLO - NO EJECUTA NADA
    // Este método está vacío intencionalmente para evitar que se ejecute.
    //
    // En una migración real, aquí iría código para revertir los cambios:
    // await queryRunner.dropTable('mi_tabla', true, true, true);
    // await queryRunner.dropColumn('mi_tabla', 'columna');
    // await queryRunner.dropIndex('mi_tabla', 'IDX_nombre');
  }
}
