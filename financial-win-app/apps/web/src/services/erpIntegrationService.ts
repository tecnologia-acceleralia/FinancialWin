/**
 * Interfaz para los datos de factura extraídos
 */
export interface InvoiceData {
  supplier?: string;
  total?: string;
  invoiceNum?: string;
  cif?: string; // NIF/CIF para facturas nacionales
  vatId?: string; // VAT ID para facturas extranjeras
  origin?: 'national' | 'foreign';
  department?: 'Marketing' | 'IT' | 'RRHH' | 'Finanzas' | 'Operaciones' | 'Ventas';
  expenseType?: 'Licencias Software' | 'Consultoría' | 'Material Oficina' | 'Servicios Profesionales' | 'Viajes y Dietas' | 'Otros';
  issueDate?: string;
  concept?: string;
  base?: string;
  currency?: 'EUR' | 'USD' | 'GBP';
  vat?: string;
}

/**
 * Respuesta de los métodos de integración ERP
 */
export interface ErpIntegrationResponse {
  success: boolean;
  message: string;
}

/**
 * Servicio de integración con sistemas ERP (Odoo y A3)
 */
export const erpService = {
  /**
   * Envía los datos de factura a Odoo
   * @param data - Datos de la factura extraídos
   * @returns Promise con la respuesta de la integración
   */
  sendToOdoo: async (data: InvoiceData): Promise<ErpIntegrationResponse> => {
    console.log('📤 [ERP Integration] Enviando datos a Odoo:', data);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const response: ErpIntegrationResponse = {
          success: true,
          message: 'Simulado correctamente',
        };
        resolve(response);
      }, 1000);
    });
  },

  /**
   * Envía los datos de factura a A3
   * @param data - Datos de la factura extraídos
   * @returns Promise con la respuesta de la integración
   */
  sendToA3: async (data: InvoiceData): Promise<ErpIntegrationResponse> => {
    console.log('📤 [ERP Integration] Enviando datos a A3:', data);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const response: ErpIntegrationResponse = {
          success: true,
          message: 'Simulado correctamente',
        };
        resolve(response);
      }, 1000);
    });
  },
};
