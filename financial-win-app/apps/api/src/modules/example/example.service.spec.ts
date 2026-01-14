import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExampleService } from './example.service';
import { Example } from './entities/example.entity';
import { NotFoundException } from '@nestjs/common';

describe('ExampleService', () => {
  let service: ExampleService;
  let repository: Repository<Example>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExampleService,
        {
          provide: getRepositoryToken(Example),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ExampleService>(ExampleService);
    repository = module.get<Repository<Example>>(getRepositoryToken(Example));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new example', async () => {
      const companyId = 'company-123';
      const createData = {
        name: 'Test Example',
        description: 'Test Description',
        status: 'active' as const,
      };

      const expectedExample = {
        id: 'example-123',
        company_id: companyId,
        ...createData,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRepository.create.mockReturnValue(expectedExample);
      mockRepository.save.mockResolvedValue(expectedExample);

      const result = await service.create(companyId, createData);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createData,
        company_id: companyId,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(expectedExample);
      expect(result).toEqual(expectedExample);
    });
  });

  describe('findOne', () => {
    it('should return an example when found', async () => {
      const companyId = 'company-123';
      const exampleId = 'example-123';
      const expectedExample = {
        id: exampleId,
        company_id: companyId,
        name: 'Test Example',
        is_active: true,
      };

      mockRepository.findOne.mockResolvedValue(expectedExample);

      const result = await service.findOne(companyId, exampleId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: exampleId,
          company_id: companyId,
          is_active: true,
        },
      });
      expect(result).toEqual(expectedExample);
    });

    it('should throw NotFoundException when example not found', async () => {
      const companyId = 'company-123';
      const exampleId = 'example-123';

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(companyId, exampleId)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('remove', () => {
    it('should soft delete an example', async () => {
      const companyId = 'company-123';
      const exampleId = 'example-123';
      const example = {
        id: exampleId,
        company_id: companyId,
        name: 'Test Example',
        is_active: true,
      };

      mockRepository.findOne.mockResolvedValue(example);
      mockRepository.save.mockResolvedValue({ ...example, is_active: false });

      await service.remove(companyId, exampleId);

      expect(example.is_active).toBe(false);
      expect(mockRepository.save).toHaveBeenCalledWith(example);
    });
  });
});
