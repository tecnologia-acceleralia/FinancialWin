import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Example Entity
 *
 * This is an example entity demonstrating the standard structure for entities in this financial-win.
 *
 * Key patterns:
 * - UUID primary key
 * - company_id for multi-tenancy
 * - created_at and updated_at timestamps
 * - Soft delete support (is_active flag)
 */
@Entity('examples')
export class Example {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  company_id: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('varchar', { length: 50, default: 'active' })
  status: 'active' | 'inactive' | 'pending';

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, unknown>;

  @Column('boolean', { default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
