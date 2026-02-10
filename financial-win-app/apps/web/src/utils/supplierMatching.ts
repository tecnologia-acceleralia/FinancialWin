/**
 * Normaliza un nombre eliminando términos comunes y espacios extra
 * @param name - Nombre a normalizar
 * @returns Nombre normalizado
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Eliminar términos comunes de empresas
    .replace(/\b(s\.?a\.?|s\.?l\.?|s\.?l\.?u\.?|s\.?c\.?|s\.?c\.?o\.?p\.?|s\.?c\.?v\.?|s\.?r\.?l\.?)\b/gi, '')
    // Eliminar espacios múltiples
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca un proveedor/cliente en una lista por nombre con matching flexible
 * @param supplierName - Nombre del proveedor/cliente a buscar
 * @param suppliers - Lista de proveedores/clientes donde buscar
 * @returns El proveedor/cliente encontrado o undefined
 */
export function findSupplierByName(
  supplierName: string,
  suppliers: Array<{
    id?: string;
    nombreComercial?: string;
    razonSocial?: string;
  }>
): { id?: string; nombreComercial?: string; razonSocial?: string } | undefined {
  try {
    if (!suppliers || suppliers.length === 0) return undefined;

    const normalizedSearch = normalizeName(supplierName);

    // Buscar coincidencia exacta normalizada
    const exactMatch = suppliers.find((s) => {
      const normalizedNombre = normalizeName(s.nombreComercial || '');
      const normalizedRazon = normalizeName(s.razonSocial || '');
      return normalizedNombre === normalizedSearch || normalizedRazon === normalizedSearch;
    });

    if (exactMatch) return exactMatch;

    // Buscar coincidencia parcial (el nombre contiene o es contenido por el nombre del proveedor)
    const partialMatch = suppliers.find((s) => {
      const normalizedNombre = normalizeName(s.nombreComercial || '');
      const normalizedRazon = normalizeName(s.razonSocial || '');
      return (
        normalizedNombre.includes(normalizedSearch) ||
        normalizedSearch.includes(normalizedNombre) ||
        normalizedRazon.includes(normalizedSearch) ||
        normalizedSearch.includes(normalizedRazon)
      );
    });

    return partialMatch;
  } catch (error) {
    console.error('Error al buscar proveedor/cliente:', error);
    return undefined;
  }
}
