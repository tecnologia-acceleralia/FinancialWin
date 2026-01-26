/**
 * Utility functions for formatting data
 */

import { CategoriaProveedor } from '@/features/entities/types';

/**
 * Obtiene las iniciales de un nombre (máximo 2 caracteres)
 * @param nombre - Nombre completo
 * @returns Iniciales en mayúsculas
 */
export function obtenerIniciales(nombre: string): string {
  const palabras = nombre.trim().split(' ').filter(Boolean);
  if (palabras.length >= 2) {
    return (palabras[0][0] + palabras[1][0]).toUpperCase();
  }
  return nombre.substring(0, 2).toUpperCase();
}

/**
 * Formatea una cantidad como moneda en formato EUR
 * @param cantidad - Cantidad numérica
 * @returns String formateado como moneda
 */
export function formatearMoneda(cantidad: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(cantidad);
}

/**
 * Formatea el tipo de proveedor para mostrar en la UI
 * @param tipo - Categoría del proveedor
 * @returns String formateado
 */
export function formatearTipo(tipo: CategoriaProveedor): string {
  const tipoMap: Record<CategoriaProveedor, string> = {
    'Proveedor Externo': 'Externo',
    'Staff Interno': 'Staff',
    'Licencias': 'Licencia',
  };
  return tipoMap[tipo] || tipo;
}
