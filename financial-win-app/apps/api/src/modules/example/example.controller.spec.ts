import { Test, TestingModule } from '@nestjs/testing';
import { ExampleController } from './example.controller';
import { ExampleService } from './example.service';

describe('ExampleController', () => {
  let controller: ExampleController;
  let service: ExampleService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExampleController],
      providers: [
        {
          provide: ExampleService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ExampleController>(ExampleController);
    service = module.get<ExampleService>(ExampleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an example', async () => {
      const companyId = 'company-123';
      const createDto = {
        name: 'Test Example',
        description: 'Test Description',
        status: 'active' as const,
      };
      const expectedExample = {
        id: 'example-123',
        company_id: companyId,
        ...createDto,
      };

      mockService.create.mockResolvedValue(expectedExample);

      const result = await controller.create(companyId, createDto);

      expect(service.create).toHaveBeenCalledWith(companyId, createDto);
      expect(result).toEqual(expectedExample);
    });
  });

  describe('findAll', () => {
    it('should return paginated examples', async () => {
      const companyId = 'company-123';
      const query = { page: 1, limit: 10 };
      const expectedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      };

      mockService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(companyId, query);

      expect(service.findAll).toHaveBeenCalledWith(companyId, query);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return an example', async () => {
      const companyId = 'company-123';
      const exampleId = 'example-123';
      const expectedExample = {
        id: exampleId,
        company_id: companyId,
        name: 'Test Example',
      };

      mockService.findOne.mockResolvedValue(expectedExample);

      const result = await controller.findOne(companyId, exampleId);

      expect(service.findOne).toHaveBeenCalledWith(companyId, exampleId);
      expect(result).toEqual(expectedExample);
    });
  });
});
