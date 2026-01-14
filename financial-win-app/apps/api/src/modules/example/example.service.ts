import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Example } from './entities/example.entity';
import {
  createExampleSchema,
  updateExampleSchema,
  exampleQuerySchema,
} from '@financial-win/shared-types';
import { validate } from '@financial-win/shared-config';

/**
 * Example Service
 *
 * This service demonstrates:
 * - CRUD operations
 * - Multi-tenancy filtering by company_id
 * - Zod schema validation
 * - Error handling patterns
 */
@Injectable()
export class ExampleService {
  constructor(
    @InjectRepository(Example)
    private readonly exampleRepository: Repository<Example>
  ) {}

  /**
   * Create a new example
   */
  async create(companyId: string, data: unknown): Promise<Example> {
    // Validate input using Zod schema
    const validatedData = validate(createExampleSchema, data);

    const example = this.exampleRepository.create({
      ...validatedData,
      company_id: companyId,
    });

    // save() returns the entity when saving a single entity
    // TypeORM's save() has overloads: save(entity) returns T, save([entity]) returns T[]
    const saved = await this.exampleRepository.save(example);
    // TypeScript infers the return type conservatively, so we assert it's a single Example
    return Array.isArray(saved) ? saved[0] : saved;
  }

  /**
   * Find all examples for a company with pagination
   */
  async findAll(
    companyId: string,
    query: unknown
  ): Promise<{ data: Example[]; total: number; page: number; limit: number }> {
    // Validate query parameters
    const validatedQuery = validate(exampleQuerySchema, query);

    const { page, limit, status, search } = validatedQuery;
    const skip = (page - 1) * limit;

    const queryBuilder = this.exampleRepository
      .createQueryBuilder('example')
      .where('example.company_id = :companyId', { companyId })
      .andWhere('example.is_active = :isActive', { isActive: true });

    if (status) {
      queryBuilder.andWhere('example.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(example.name ILIKE :search OR example.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('example.created_at', 'DESC')
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Find one example by ID
   */
  async findOne(companyId: string, id: string): Promise<Example> {
    const example = await this.exampleRepository.findOne({
      where: {
        id,
        company_id: companyId,
        is_active: true,
      },
    });

    if (!example) {
      throw new NotFoundException(`Example with ID ${id} not found`);
    }

    return example;
  }

  /**
   * Update an example
   */
  async update(companyId: string, id: string, data: unknown): Promise<Example> {
    // Validate input using Zod schema
    const validatedData = validate(updateExampleSchema, data);

    // CRITICAL: Filter by company_id to ensure multi-tenant security
    const example = await this.exampleRepository.findOne({
      where: {
        id,
        company_id: companyId,
        is_active: true,
      },
    });

    if (!example) {
      throw new NotFoundException(`Example with ID ${id} not found`);
    }

    Object.assign(example, validatedData);

    return await this.exampleRepository.save(example);
  }

  /**
   * Soft delete an example
   */
  async remove(companyId: string, id: string): Promise<void> {
    // CRITICAL: Filter by company_id to ensure multi-tenant security
    const example = await this.exampleRepository.findOne({
      where: {
        id,
        company_id: companyId,
        is_active: true,
      },
    });

    if (!example) {
      throw new NotFoundException(`Example with ID ${id} not found`);
    }

    example.is_active = false;
    await this.exampleRepository.save(example);
  }
}
