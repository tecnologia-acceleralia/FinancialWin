import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExampleService } from './example.service';
import { OIDCAuthGuard } from '../../common/guards/oidc-auth.guard';
import { CompanyId } from '../../common/decorators/company-id.decorator';
import {
  CreateExample,
  UpdateExample,
  ExampleQuery,
  createExampleSchema,
  updateExampleSchema,
  exampleQuerySchema,
} from '@financial-win/shared-types';
import { ZodValidationPipe } from '@financial-win/shared-config';

/**
 * Example Controller
 *
 * This controller demonstrates:
 * - CRUD endpoints
 * - Multi-tenancy using company_id decorator
 * - Zod validation using ZodValidationPipe
 * - Swagger documentation
 * - OIDC authentication guard
 */
@ApiTags('example')
@Controller('example')
@UseGuards(OIDCAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new example' })
  @ApiResponse({ status: 201, description: 'Example created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(
    @CompanyId() companyId: string,
    @Body(new ZodValidationPipe(createExampleSchema))
    createExampleDto: CreateExample
  ) {
    return this.exampleService.create(companyId, createExampleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all examples with pagination' })
  @ApiResponse({ status: 200, description: 'List of examples' })
  findAll(
    @CompanyId() companyId: string,
    @Query(new ZodValidationPipe(exampleQuerySchema)) query: ExampleQuery
  ) {
    return this.exampleService.findAll(companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one example by ID' })
  @ApiResponse({ status: 200, description: 'Example found' })
  @ApiResponse({ status: 404, description: 'Example not found' })
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.exampleService.findOne(companyId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an example' })
  @ApiResponse({ status: 200, description: 'Example updated successfully' })
  @ApiResponse({ status: 404, description: 'Example not found' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateExampleSchema))
    updateExampleDto: UpdateExample
  ) {
    return this.exampleService.update(companyId, id, updateExampleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an example (soft delete)' })
  @ApiResponse({ status: 200, description: 'Example deleted successfully' })
  @ApiResponse({ status: 404, description: 'Example not found' })
  remove(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.exampleService.remove(companyId, id);
  }
}
