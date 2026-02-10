import { CategoriaProveedor } from '../features/entities/types';

/**
 * Formatea un número como moneda en formato español (EUR)
 * @param amount - Cantidad numérica a formatear
 * @returns String formateado como moneda (ej: "1.234,56 €")
 */
export function formatearMoneda(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '0,00 €';
  }

  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
}

/**
 * Obtiene las iniciales de un nombre completo
 * @param nombre - Nombre completo (ej: "Juan Pérez García")
 * @returns Iniciales en mayúsculas (ej: "JPG")
 */
export function obtenerIniciales(nombre: string): string {
  if (!nombre || nombre.trim() === '') {
    return '??';
  }

  const palabras = nombre.trim().split(/\s+/);
  
  if (palabras.length === 1) {
    // Si solo hay una palabra, tomar las primeras 2 letras
    return palabras[0].substring(0, 2).toUpperCase();
  }

  // Si hay múltiples palabras, tomar la primera letra de cada una
  return palabras
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2); // Limitar a 2 caracteres máximo
}

/**
 * Formatea el tipo de proveedor para mostrar en la UI
 * @param tipo - Categoría del proveedor
 * @returns String formateado para mostrar
 */
export function formatearTipo(tipo: CategoriaProveedor | string): string {
  const tipoMap: Record<string, string> = {
    'Proveedor Externo': 'Proveedor Externo',
    'Staff Interno': 'Staff Interno',
    'Licencias': 'Licencias',
  };

  return tipoMap[tipo] || tipo;
}
