import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';

/**
 * Documents Module
 * 
 * Módulo para gestionar documentos (facturas, tickets, etc.)
 */
@Module({
  imports: [TypeOrmModule.forFeature([])], // No hay entidad aún, usamos QueryRunner directamente
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
