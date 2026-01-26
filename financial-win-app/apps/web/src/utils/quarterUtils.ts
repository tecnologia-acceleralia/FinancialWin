/**
 * Utilidades para cálculos de trimestres fiscales
 */

/**
 * Obtiene el trimestre actual (1-4)
 */
export function getCurrentQuarter(): number {
  const month = new Date().getMonth() + 1;
  if (month >= 1 && month <= 3) return 1;
  if (month >= 4 && month <= 6) return 2;
  if (month >= 7 && month <= 9) return 3;
  return 4;
}

/**
 * Obtiene el año actual
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Obtiene las fechas de inicio y fin de un trimestre
 */
export function getQuarterDates(quarter: number, year: number): {
  fechaInicio: Date;
  fechaFin: Date;
} {
  let fechaInicio: Date;
  let fechaFin: Date;

  switch (quarter) {
    case 1:
      fechaInicio = new Date(year, 0, 1);
      fechaFin = new Date(year, 2, 31);
      break;
    case 2:
      fechaInicio = new Date(year, 3, 1);
      fechaFin = new Date(year, 5, 30);
      break;
    case 3:
      fechaInicio = new Date(year, 6, 1);
      fechaFin = new Date(year, 8, 30);
      break;
    case 4:
      fechaInicio = new Date(year, 9, 1);
      fechaFin = new Date(year, 11, 31);
      break;
    default:
      throw new Error(`Trimestre inválido: ${quarter}`);
  }

  return { fechaInicio, fechaFin };
}

/**
 * Calcula la fecha límite de presentación (20 días después del fin del trimestre)
 */
export function getDueDate(fechaFinTrimestre: Date): Date {
  const fechaLimite = new Date(fechaFinTrimestre);
  fechaLimite.setDate(fechaLimite.getDate() + 20);
  return fechaLimite;
}

/**
 * Formatea el nombre del trimestre
 */
export function formatQuarterName(quarter: number): string {
  const names = ['1er', '2º', '3er', '4º'];
  return `${names[quarter - 1]} Trimestre`;
}

/**
 * Formatea el rango de fechas del trimestre
 */
export function formatQuarterRange(fechaInicio: Date, fechaFin: Date): string {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const mesInicio = meses[fechaInicio.getMonth()];
  const mesFin = meses[fechaFin.getMonth()];
  const año = fechaInicio.getFullYear();

  return `${mesInicio} - ${mesFin} ${año}`;
}

/**
 * Formatea una fecha en español
 */
export function formatDateSpanish(date: Date): string {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dia = date.getDate();
  const mes = meses[date.getMonth()];
  const año = date.getFullYear();

  return `${dia} de ${mes} de ${año}`;
}

/**
 * Obtiene información completa del trimestre actual
 */
export function getCurrentQuarterInfo(): {
  quarter: number;
  year: number;
  fechaInicio: Date;
  fechaFin: Date;
  fechaLimite: Date;
  nombreTrimestre: string;
  rangoFechas: string;
  fechaLimiteFormateada: string;
} {
  const quarter = getCurrentQuarter();
  const year = getCurrentYear();
  const { fechaInicio, fechaFin } = getQuarterDates(quarter, year);
  const fechaLimite = getDueDate(fechaFin);

  return {
    quarter,
    year,
    fechaInicio,
    fechaFin,
    fechaLimite,
    nombreTrimestre: formatQuarterName(quarter),
    rangoFechas: formatQuarterRange(fechaInicio, fechaFin),
    fechaLimiteFormateada: formatDateSpanish(fechaLimite),
  };
}
