/**
 * Utilidad para importar datos desde archivos Excel (.xlsx) o CSV (.csv)
 * Mapea los datos al formato FinancialRecord
 */

import * as XLSX from 'xlsx';
import type { FinancialRecord, FinancialRecordType } from '../contexts/FinancialContext';
import type { ExtractedData } from '../types';

/**
 * Opciones para mapear columnas del archivo a campos de ExtractedData
 */
export interface ImportMapping {
  supplier?: string; // Nombre de la columna que contiene el proveedor/cliente
  total?: string; // Nombre de la columna que contiene el total
  base?: string; // Nombre de la columna que contiene la base
  vat?: string; // Nombre de la columna que contiene el IVA
  invoiceNum?: string; // Nombre de la columna que contiene el número de factura
  issueDate?: string; // Nombre de la columna que contiene la fecha de emisión
  department?: string; // Nombre de la columna que contiene el departamento
  expenseType?: string; // Nombre de la columna que contiene el tipo de gasto
  currency?: string; // Nombre de la columna que contiene la moneda
  paymentStatus?: string; // Nombre de la columna que contiene el estado de pago
}

/**
 * Resultado de la importación
 */
export interface ImportResult {
  success: boolean;
  records: FinancialRecord[];
  errors: string[];
  warnings: string[];
}

/**
 * Parsea un archivo Excel o CSV y lo convierte en un array de objetos
 */
function parseFile(file: File): Promise<Array<Record<string, unknown>>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('No se pudo leer el archivo'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false, // Convertir todo a strings para mantener formato
        });

        resolve(jsonData as Array<Record<string, unknown>>);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    // Leer como binario para Excel, o como texto para CSV
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsBinaryString(file);
    }
  });
}

/**
 * Normaliza el nombre de una columna (elimina espacios, convierte a minúsculas)
 */
function normalizeColumnName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Eliminar acentos
}

/**
 * Encuentra el nombre de columna que mejor coincide con el campo buscado
 */
function findColumn(
  row: Record<string, unknown>,
  fieldName: string,
  possibleNames: string[]
): string | undefined {
  const keys = Object.keys(row);
  const normalizedField = normalizeColumnName(fieldName);

  // Buscar coincidencia exacta normalizada
  for (const key of keys) {
    if (normalizeColumnName(key) === normalizedField) {
      return key;
    }
  }

  // Buscar en los nombres posibles
  for (const possibleName of possibleNames) {
    for (const key of keys) {
      if (normalizeColumnName(key).includes(normalizeColumnName(possibleName))) {
        return key;
      }
    }
  }

  return undefined;
}

/**
 * Convierte un valor a número, manejando formatos de moneda
 */
function parseAmount(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    // Eliminar símbolos de moneda, espacios y comas
    const cleaned = value.replace(/[€$£,\s]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

/**
 * Convierte un valor a fecha en formato ISO
 */
function parseDate(value: unknown): string | undefined {
  if (!value) return undefined;

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    // Intentar parsear diferentes formatos de fecha
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return undefined;
}

/**
 * Convierte un valor a estado de pago
 */
function parsePaymentStatus(value: unknown): 'Pendiente' | 'Pagado' {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    if (normalized.includes('pagado') || normalized.includes('paid')) {
      return 'Pagado';
    }
  }
  return 'Pendiente';
}

/**
 * Mapea una fila del archivo a un FinancialRecord
 */
function mapRowToFinancialRecord(
  row: Record<string, unknown>,
  type: FinancialRecordType,
  mapping?: ImportMapping
): FinancialRecord | null {
  // Detectar automáticamente las columnas si no se proporciona mapping
  const supplierCol = mapping?.supplier
    ? findColumn(row, mapping.supplier, ['proveedor', 'cliente', 'supplier', 'client', 'nombre'])
    : findColumn(row, 'supplier', ['proveedor', 'cliente', 'supplier', 'client', 'nombre']);

  const totalCol = mapping?.total
    ? findColumn(row, mapping.total, ['total', 'importe', 'amount', 'totalbanco'])
    : findColumn(row, 'total', ['total', 'importe', 'amount', 'totalbanco']);

  const baseCol = mapping?.base
    ? findColumn(row, mapping.base, ['base', 'importe', 'amount'])
    : findColumn(row, 'base', ['base', 'importe', 'amount']);

  const vatCol = mapping?.vat
    ? findColumn(row, mapping.vat, ['iva', 'vat', 'impuestos'])
    : findColumn(row, 'vat', ['iva', 'vat', 'impuestos']);

  const invoiceNumCol = mapping?.invoiceNum
    ? findColumn(row, mapping.invoiceNum, ['factura', 'invoice', 'numero', 'num'])
    : findColumn(row, 'invoiceNum', ['factura', 'invoice', 'numero', 'num']);

  const issueDateCol = mapping?.issueDate
    ? findColumn(row, mapping.issueDate, ['fecha', 'date', 'fechafactura', 'issuedate'])
    : findColumn(row, 'issueDate', ['fecha', 'date', 'fechafactura', 'issuedate']);

  const departmentCol = mapping?.department
    ? findColumn(row, mapping.department, ['departamento', 'department'])
    : findColumn(row, 'department', ['departamento', 'department']);

  const expenseTypeCol = mapping?.expenseType
    ? findColumn(row, mapping.expenseType, ['tipo', 'type', 'tipogasto', 'expensetype'])
    : findColumn(row, 'expenseType', ['tipo', 'type', 'tipogasto', 'expensetype']);

  const currencyCol = mapping?.currency
    ? findColumn(row, mapping.currency, ['moneda', 'currency'])
    : findColumn(row, 'currency', ['moneda', 'currency']);

  const paymentStatusCol = mapping?.paymentStatus
    ? findColumn(row, mapping.paymentStatus, ['estado', 'status', 'estadopago', 'paymentstatus'])
    : findColumn(row, 'paymentStatus', ['estado', 'status', 'estadopago', 'paymentstatus']);

  // Validar campos requeridos
  if (!supplierCol || !row[supplierCol]) {
    return null; // Fila inválida, se omitirá
  }

  const supplier = String(row[supplierCol] || '');
  const total = totalCol ? parseAmount(row[totalCol]) : 0;

  // Si no hay total, intentar calcular desde base + vat
  let finalTotal = total;
  let finalBase = baseCol ? parseAmount(row[baseCol]) : 0;
  let finalVat = vatCol ? parseAmount(row[vatCol]) : 0;

  if (finalTotal === 0 && (finalBase > 0 || finalVat > 0)) {
    finalTotal = finalBase + finalVat;
  } else if (finalTotal > 0 && finalBase === 0) {
    // Si tenemos total pero no base, estimar base (asumiendo IVA del 21%)
    finalVat = finalTotal * 0.21;
    finalBase = finalTotal - finalVat;
  }

  // Construir ExtractedData
  const extractedData: ExtractedData = {
    supplier,
    total: finalTotal > 0 ? String(finalTotal) : undefined,
    base: finalBase > 0 ? String(finalBase) : undefined,
    vat: finalVat > 0 ? String(finalVat) : undefined,
    invoiceNum: invoiceNumCol ? String(row[invoiceNumCol] || '') : undefined,
    issueDate: issueDateCol ? parseDate(row[issueDateCol]) : undefined,
    department: departmentCol
      ? (String(row[departmentCol] || '') as ExtractedData['department'])
      : undefined,
    expenseType: expenseTypeCol
      ? (String(row[expenseTypeCol] || '') as ExtractedData['expenseType'])
      : undefined,
    currency: currencyCol
      ? (String(row[currencyCol] || 'EUR').toUpperCase() as ExtractedData['currency'])
      : 'EUR',
  };

  // Determinar estado de pago
  const paymentStatus = paymentStatusCol
    ? parsePaymentStatus(row[paymentStatusCol])
    : 'Pendiente';

  // Crear el FinancialRecord
  const record: FinancialRecord = {
    id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    type,
    data: extractedData,
    documentType: type === 'expense' ? 'invoices' : 'invoices',
    erpStatus: 'pending',
    paymentStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return record;
}

/**
 * Importa un archivo Excel o CSV y lo convierte en FinancialRecords
 * @param file - Archivo a importar (.xlsx o .csv)
 * @param type - Tipo de registro financiero ('expense' o 'income')
 * @param mapping - Mapeo opcional de columnas (si no se proporciona, se detecta automáticamente)
 * @returns Promise con el resultado de la importación
 */
export async function importFromExcel(
  file: File,
  type: FinancialRecordType,
  mapping?: ImportMapping
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    records: [],
    errors: [],
    warnings: [],
  };

  try {
    // Validar extensión del archivo
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf('.'));

    if (!validExtensions.includes(fileExtension)) {
      result.success = false;
      result.errors.push(
        `Formato de archivo no soportado. Use ${validExtensions.join(', ')}`
      );
      return result;
    }

    // Parsear el archivo
    const rows = await parseFile(file);

    if (rows.length === 0) {
      result.success = false;
      result.errors.push('El archivo está vacío o no se pudo leer');
      return result;
    }

    // Mapear cada fila a un FinancialRecord
    const records: FinancialRecord[] = [];
    let skippedRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const record = mapRowToFinancialRecord(row, type, mapping);

      if (record) {
        records.push(record);
      } else {
        skippedRows++;
        if (i === 0) {
          // Si la primera fila es inválida, probablemente son encabezados
          continue;
        }
        result.warnings.push(
          `Fila ${i + 1} omitida: falta información requerida (proveedor/cliente o total)`
        );
      }
    }

    if (records.length === 0) {
      result.success = false;
      result.errors.push('No se pudieron importar registros válidos del archivo');
      return result;
    }

    result.records = records;

    if (skippedRows > 0 && skippedRows !== 1) {
      // Si se omitió más de una fila (excluyendo posible encabezado), agregar advertencia
      result.warnings.push(
        `Se omitieron ${skippedRows} filas por falta de información requerida`
      );
    }
  } catch (error) {
    result.success = false;
    result.errors.push(
      error instanceof Error ? error.message : 'Error desconocido al importar el archivo'
    );
  }

  return result;
}
