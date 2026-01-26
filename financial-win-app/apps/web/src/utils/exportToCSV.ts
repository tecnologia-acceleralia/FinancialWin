/**
 * Utilidad para exportar datos a CSV
 * Respetando los filtros aplicados y las columnas visibles
 */

/**
 * Exporta un array de objetos a CSV
 * @param data - Array de objetos a exportar
 * @param filename - Nombre del archivo (sin extensión)
 * @param headers - Array de objetos con { key: string, label: string } para las columnas
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  headers: Array<{ key: keyof T; label: string }>
): void {
  if (data.length === 0) {
    console.warn('No hay datos para exportar');
    return;
  }

  // Crear la fila de encabezados
  const headerRow = headers.map((h) => h.label).join(',');

  // Crear las filas de datos
  const dataRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header.key];
        // Convertir el valor a string y escapar comillas
        const stringValue = value != null ? String(value) : '';
        // Si contiene comas, comillas o saltos de línea, envolver en comillas y escapar comillas internas
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(',');
  });

  // Combinar encabezados y datos
  const csvContent = [headerRow, ...dataRows].join('\n');

  // Crear el BOM para UTF-8 (para que Excel abra correctamente caracteres especiales)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Crear el enlace de descarga
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Limpiar el URL object
  URL.revokeObjectURL(url);
}
