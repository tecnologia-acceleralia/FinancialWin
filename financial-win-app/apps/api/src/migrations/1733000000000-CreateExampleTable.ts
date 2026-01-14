import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import {
  createTableIfNotExists,
  dropTableIfExists,
} from '../utils/migration-helpers';

/**
 * Create Example Table Migration
 *
 * This migration demonstrates:
 * - Creating a table with proper structure
 * - Multi-tenancy support (company_id)
 * - Indexes for performance
 * - Soft delete support (is_active)
 * - Timestamps (created_at, updated_at)
 *
 * To run this migration:
 *   pnpm migration:run
 *
 * To revert this migration:
 *   pnpm migration:revert
 */
export class CreateExampleTable1733000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = new Table({
      name: 'examples',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          generationStrategy: 'uuid',
          default: 'uuid_generate_v4()',
        },
        {
          name: 'company_id',
          type: 'varchar',
          length: '255',
          isNullable: false,
        },
        {
          name: 'name',
          type: 'varchar',
          length: '255',
          isNullable: false,
        },
        {
          name: 'description',
          type: 'text',
          isNullable: true,
        },
        {
          name: 'status',
          type: 'varchar',
          length: '50',
          default: "'active'",
          isNullable: false,
        },
        {
          name: 'metadata',
          type: 'jsonb',
          isNullable: true,
        },
        {
          name: 'is_active',
          type: 'boolean',
          default: true,
          isNullable: false,
        },
        {
          name: 'created_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          isNullable: false,
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          isNullable: false,
        },
      ],
      indices: [
        new TableIndex({
          name: 'IDX_examples_company_id',
          columnNames: ['company_id'],
        }),
        new TableIndex({
          name: 'IDX_examples_status',
          columnNames: ['status'],
        }),
        new TableIndex({
          name: 'IDX_examples_is_active',
          columnNames: ['is_active'],
        }),
        new TableIndex({
          name: 'IDX_examples_company_id_status',
          columnNames: ['company_id', 'status'],
        }),
      ],
    });

    await createTableIfNotExists(queryRunner, table);

    // Create trigger for updated_at (PostgreSQL)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_examples_updated_at ON examples;
      CREATE TRIGGER update_examples_updated_at
      BEFORE UPDATE ON examples
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_examples_updated_at ON examples;
    `);
    await dropTableIfExists(queryRunner, 'examples');
  }
}
