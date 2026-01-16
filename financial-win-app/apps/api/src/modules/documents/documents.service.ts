import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Documents Service
 * 
 * Servicio para gestionar documentos (facturas, tickets, etc.)
 */
@Injectable()
export class DocumentsService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Crear un nuevo documento
   */
  async create(companyId: string, data: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      await queryRunner.connect();
      
      // Mapear los datos del frontend a las columnas de la tabla
      const insertData: any = {
        company_id: companyId,
        document_type: data.document_type || 'invoices',
        origin: data.origin || 'national',
        department: data.department || null,
        expense_type: data.expenseType || null,
        supplier: data.supplier || null,
        cif: data.cif || null,
        vat_id: data.vatId || null,
        invoice_num: data.invoiceNum || null,
        issue_date: data.issueDate || null,
        concept: data.concept || null,
        currency: data.currency || 'EUR',
        base: data.base ? parseFloat(data.base) : null,
        vat: data.vat ? parseFloat(data.vat) : null,
        total: data.total ? parseFloat(data.total) : null,
        category: data.category || null,
        establishment: data.establishment || null,
        nif: data.nif || null,
        address: data.address || null,
        zip: data.zip || null,
        city: data.city || null,
        date: data.date || null,
        time: data.time || null,
        amount: data.amount ? parseFloat(data.amount) : null,
        employee: data.employee || null,
        type: data.type || null,
        period: data.period || null,
        net: data.net ? parseFloat(data.net) : null,
        ss: data.ss ? parseFloat(data.ss) : null,
        extracted_data: JSON.stringify(data),
        is_active: true,
      };

      // Construir query de inserción
      const columns = Object.keys(insertData).filter(key => insertData[key] !== null && insertData[key] !== undefined);
      const values = columns.map((_, index) => `$${index + 1}`);
      const params = columns.map(col => insertData[col]);

      const insertQuery = `
        INSERT INTO documents (${columns.join(', ')})
        VALUES (${values.join(', ')})
        RETURNING id, company_id, document_type, supplier, invoice_num, total, created_at;
      `;

      const result = await queryRunner.query(insertQuery, params);
      
      return {
        id: result[0].id,
        company_id: result[0].company_id,
        document_type: result[0].document_type,
        supplier: result[0].supplier,
        invoice_num: result[0].invoice_num,
        total: result[0].total,
        created_at: result[0].created_at,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
