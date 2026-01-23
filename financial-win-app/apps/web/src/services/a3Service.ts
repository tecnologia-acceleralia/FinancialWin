import type { FinancialRecord } from '../contexts/FinancialContext';

/**
 * Interfaz para los datos de factura de compra (gasto) para A3
 */
export interface A3PurchaseInvoiceData {
  supplierName: string;
  supplierA3Id: string;
  invoiceNumber: string;
  issueDate: string;
  total: number;
  base: number;
  vat: number;
  currency: string;
  department?: string;
  expenseType?: string;
}

/**
 * Interfaz para los datos de factura de venta (ingreso) para A3
 */
export interface A3SaleInvoiceData {
  clientName: string;
  clientA3Id: string;
  invoiceNumber: string;
  issueDate: string;
  total: number;
  base: number;
  vat: number;
  currency: string;
}

/**
 * Payload estándar de API A3factura
 */
export interface A3InvoicePayload {
  fecha_contable: string;
  cuenta_contable: string;
  serie_factura: string;
  numero_factura: string;
  datos_economicos: {
    base_imponible: number;
    tipo_iva: string;
    cuota_iva: number;
    total: number;
  };
  metadatos: {
    actividad_a3: string;
    serie_a3: string;
  };
}

/**
 * Datos del proveedor/cliente para construir el payload
 */
export interface SupplierA3Data {
  idContableA3: string;
  actividadA3?: string;
  serieA3?: string;
}

/**
 * Servicio para sincronización con A3factura
 */
export const a3Service = {
  /**
   * Construye el payload estándar de API A3factura a partir de una factura
   * @param record - Registro financiero
   * @param supplierData - Datos del proveedor/cliente con información A3
   * @returns Payload formateado para la API de A3factura
   */
  buildA3InvoicePayload: (
    record: FinancialRecord,
    supplierData: SupplierA3Data
  ): A3InvoicePayload => {
    const total = parseFloat(record.data.total?.toString() || '0');
    const base = parseFloat(record.data.base?.toString() || '0');
    const vat = parseFloat(record.data.vat?.toString() || '0');

    // Calcular tipo de IVA basado en el porcentaje
    // Si base > 0, calcular porcentaje: (vat / base) * 100
    let tipoIva = '21'; // Por defecto 21%
    if (base > 0) {
      const porcentajeIva = (vat / base) * 100;
      // Redondear al porcentaje más cercano (0, 4, 10, 21)
      if (porcentajeIva < 2) {
        tipoIva = '0';
      } else if (porcentajeIva < 7) {
        tipoIva = '4';
      } else if (porcentajeIva < 15.5) {
        tipoIva = '10';
      } else {
        tipoIva = '21';
      }
    }

    // Extraer serie y número de factura
    // Si invoiceNum tiene formato "SERIE-NUMERO" o "SERIE NUMERO", separar
    const invoiceNum = record.data.invoiceNum || '';
    let serieFactura = '';
    let numeroFactura = invoiceNum;

    // Intentar separar serie y número
    if (invoiceNum.includes('-')) {
      const parts = invoiceNum.split('-');
      if (parts.length >= 2) {
        serieFactura = parts[0].trim();
        numeroFactura = parts.slice(1).join('-').trim();
      }
    } else if (invoiceNum.includes(' ')) {
      const parts = invoiceNum.split(' ');
      if (parts.length >= 2) {
        serieFactura = parts[0].trim();
        numeroFactura = parts.slice(1).join(' ').trim();
      }
    }

    // Si no se pudo extraer serie, usar la serie del proveedor o valor por defecto
    if (!serieFactura && supplierData.serieA3) {
      serieFactura = supplierData.serieA3;
    }
    if (!serieFactura) {
      serieFactura = 'A'; // Valor por defecto
    }

    // Fecha contable: usar issueDate si existe, sino createdAt
    const fechaContable = record.data.issueDate || record.createdAt;

    return {
      fecha_contable: fechaContable,
      cuenta_contable: supplierData.idContableA3,
      serie_factura: serieFactura,
      numero_factura: numeroFactura,
      datos_economicos: {
        base_imponible: base,
        tipo_iva: tipoIva,
        cuota_iva: vat,
        total: total,
      },
      metadatos: {
        actividad_a3: supplierData.actividadA3 || '',
        serie_a3: supplierData.serieA3 || '',
      },
    };
  },
  /**
   * Sincroniza una factura de compra (gasto) con A3factura
   * @param record - Registro financiero de tipo expense
   * @param supplierA3Id - ID contable A3 del proveedor
   * @returns Promise con el JSON que se enviaría a A3
   */
  syncPurchaseInvoice: async (
    record: FinancialRecord,
    supplierA3Id: string
  ): Promise<A3PurchaseInvoiceData> => {
    const total = parseFloat(record.data.total?.toString() || '0');
    const base = parseFloat(record.data.base?.toString() || '0');
    const vat = parseFloat(record.data.vat?.toString() || '0');

    const invoiceData: A3PurchaseInvoiceData = {
      supplierName: record.data.supplier || '',
      supplierA3Id,
      invoiceNumber: record.data.invoiceNum || `G-${record.id.slice(-6)}`,
      issueDate: record.data.issueDate || record.createdAt,
      total,
      base,
      vat,
      currency: record.data.currency || 'EUR',
      department: record.data.department,
      expenseType: record.data.expenseType,
    };

    // Por ahora solo hace console.log del JSON
    console.log('📤 [A3Service] Sincronizando factura de compra:', JSON.stringify(invoiceData, null, 2));

    return invoiceData;
  },

  /**
   * Sincroniza una factura de venta (ingreso) con A3factura
   * @param record - Registro financiero de tipo income
   * @param clientA3Id - ID contable A3 del cliente
   * @returns Promise con el JSON que se enviaría a A3
   */
  syncSaleInvoice: async (
    record: FinancialRecord,
    clientA3Id: string
  ): Promise<A3SaleInvoiceData> => {
    const total = parseFloat(record.data.total?.toString() || '0');
    const base = parseFloat(record.data.base?.toString() || '0');
    const vat = parseFloat(record.data.vat?.toString() || '0');

    const invoiceData: A3SaleInvoiceData = {
      clientName: record.data.supplier || '',
      clientA3Id,
      invoiceNumber: record.data.invoiceNum || `I-${record.id.slice(-6)}`,
      issueDate: record.data.issueDate || record.createdAt,
      total,
      base,
      vat,
      currency: record.data.currency || 'EUR',
    };

    // Por ahora solo hace console.log del JSON
    console.log('📤 [A3Service] Sincronizando factura de venta:', JSON.stringify(invoiceData, null, 2));

    return invoiceData;
  },
};
