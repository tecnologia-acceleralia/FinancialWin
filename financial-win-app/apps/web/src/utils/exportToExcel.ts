/**
 * Utilidad para exportar datos a Excel (.xlsx)
 * Usa la librería xlsx para crear archivos Excel
 */

import * as XLSX from 'xlsx';

export interface ExportColumn<T> {
  key: keyof T;
  label: string;
}

/**
 * Exporta un array de objetos a Excel (.xlsx)
 * @param data - Array de objetos a exportar
 * @param filename - Nombre del archivo (sin extensión)
 * @param headers - Array de objetos con { key: string, label: string } para las columnas
 */
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  headers: ExportColumn<T>[]
): void {
  if (data.length === 0) {
    console.warn('No hay datos para exportar');
    return;
  }

  // Crear un array de objetos con las columnas especificadas
  const worksheetData = data.map((row) => {
    const rowData: Record<string, unknown> = {};
    headers.forEach((header) => {
      rowData[header.label] = row[header.key] ?? '';
    });
    return rowData;
  });

  // Crear el workbook y worksheet
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

  // Generar el archivo Excel
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
