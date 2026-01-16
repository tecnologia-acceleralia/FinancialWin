import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { OIDCAuthGuard } from '../../common/guards/oidc-auth.guard';
import { CompanyId } from '../../common/decorators/company-id.decorator';

/**
 * Documents Controller
 * 
 * Controlador para gestionar documentos (facturas, tickets, etc.)
 */
@ApiTags('documents')
@Controller('documents')
@UseGuards(OIDCAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new document' })
  @ApiResponse({ status: 201, description: 'Document created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(
    @CompanyId() companyId: string,
    @Body() createDocumentDto: any
  ) {
    return this.documentsService.create(companyId, createDocumentDto);
  }
}
