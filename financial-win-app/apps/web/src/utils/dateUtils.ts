/**
 * Utility functions for date formatting and conversion
 */

/**
 * Converts a date string to Spanish locale format (dd/mm/yyyy)
 * @param dateString - Date string in any valid format
 * @returns Formatted date string in Spanish format
 */
function toSpanishDateString(dateString: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('es-ES');
}

/**
 * Converts a date string to ISO date format (YYYY-MM-DD) for HTML date inputs
 * Extrae solo la fecha usando métodos UTC para evitar problemas de zona horaria
 * @param dateString - Date string in any valid format
 * @returns ISO date string (YYYY-MM-DD) or empty string if invalid
 */
function toISODateString(dateString: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  // Extraer año, mes y día usando métodos UTC para evitar problemas de zona horaria
  // Las fechas se guardan como UTC medianoche en la BD, así que usamos métodos UTC
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // getUTCMonth() es 0-indexed
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Converts a date string to UTC format for display (dd/mm/yyyy)
 * Muestra la fecha usando componentes UTC para evitar problemas de zona horaria
 * @param dateString - Date string in any valid format
 * @returns UTC formatted string for display or empty string if invalid
 */
function toUTCDisplayString(dateString: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  // Usar métodos UTC para extraer los componentes de la fecha
  // y formatearlos manualmente para evitar problemas de zona horaria
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Formats a date for display in the UI (Spanish format)
 * @param dateString - Date string in any valid format
 * @returns Formatted date string for display or empty string if invalid
 */
export function formatDateForDisplay(dateString: string): string {
  return toSpanishDateString(dateString);
}

/**
 * Formats a date for HTML date input (ISO format)
 * @param dateString - Date string in any valid format
 * @returns ISO date string for HTML input or empty string if invalid
 */
export function formatDateForInput(dateString: string): string {
  return toISODateString(dateString);
}

/**
 * Converts a local date string to UTC format for display
 * @param dateString - Date string in any valid format
 * @returns UTC formatted string for display or empty string if invalid
 */
export function formatUTCDateForDisplay(dateString: string): string {
  return toUTCDisplayString(dateString);
}
