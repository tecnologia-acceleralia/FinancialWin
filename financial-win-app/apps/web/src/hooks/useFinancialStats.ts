import { useMemo } from 'react';
import { useFinancial } from '../contexts/FinancialContext';

export interface FinancialKPIs {
  totalIngresos: number;
  totalGastos: number;
  beneficioNeto: number;
  cajaPendiente: number;
  ratioCobro: number;
  ivaNeto: number;
  ivaTrimestral: number;
}

/**
 * Obtiene el trimestre actual (1-4)
 */
function getCurrentQuarter(): number {
  const month = new Date().getMonth() + 1;
  if (month >= 1 && month <= 3) return 1;
  if (month >= 4 && month <= 6) return 2;
  if (month >= 7 && month <= 9) return 3;
  return 4;
}

/**
 * Obtiene el año actual
 */
function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Verifica si una fecha pertenece al trimestre actual
 */
function isInCurrentQuarter(dateString: string | undefined | null): boolean {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    const currentYear = getCurrentYear();
    const currentQuarter = getCurrentQuarter();
    
    if (year !== currentYear) return false;
    
    if (currentQuarter === 1 && month >= 1 && month <= 3) return true;
    if (currentQuarter === 2 && month >= 4 && month <= 6) return true;
    if (currentQuarter === 3 && month >= 7 && month <= 9) return true;
    if (currentQuarter === 4 && month >= 10 && month <= 12) return true;
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Hook para calcular estadísticas financieras basadas en datos reales del FinancialContext
 * Todos los cálculos se actualizan automáticamente cuando cambian los arrays de expenses o income
 */
export const useFinancialStats = () => {
  const { expenses, income } = useFinancial();

  // Filtrar gastos válidos para gráficos (con supplier y total)
  const validExpensesForChart = useMemo(() => {
    return expenses.filter(
      (expense) => expense.data.supplier && expense.data.total
    );
  }, [expenses]);

  /**
   * Función auxiliar para parsear valores numéricos de forma segura
   */
  const safeParseFloat = (value: string | number | undefined | null): number => {
    if (value === null || value === undefined) return 0;
    const parsed = parseFloat(value.toString());
    return isNaN(parsed) ? 0 : parsed;
  };

  // Calcular KPIs dinámicos basados en datos reales
  const kpis = useMemo((): FinancialKPIs => {
    // Filtrar registros válidos (con total)
    const validExpenses = expenses.filter(
      (expense) => expense.data.total
    );
    const validIncome = income.filter(
      (incomeRecord) => incomeRecord.data.total
    );

    // Total Ingresos: Suma de todos los total de income
    const totalIngresos = validIncome.reduce((sum, record) => {
      return sum + safeParseFloat(record.data.total);
    }, 0);

    // Total Gastos: Suma de todos los total de expenses
    const totalGastos = validExpenses.reduce((sum, record) => {
      return sum + safeParseFloat(record.data.total);
    }, 0);

    // Beneficio Neto: Suma de todos los total de income menos la suma de todos los total de expenses
    const beneficioNeto = totalIngresos - totalGastos;

    // Caja Pendiente: Suma el total de todos los registros (tanto de ingresos como de gastos)
    // cuyo paymentStatus sea 'Pendiente'
    const ingresosPendientes = validIncome
      .filter((record) => record.paymentStatus === 'Pendiente')
      .reduce((sum, record) => {
        return sum + safeParseFloat(record.data.total);
      }, 0);

    const gastosPendientes = validExpenses
      .filter((record) => record.paymentStatus === 'Pendiente')
      .reduce((sum, record) => {
        return sum + safeParseFloat(record.data.total);
      }, 0);

    const cajaPendiente = ingresosPendientes + gastosPendientes;

    // Ratio de Cobro: Porcentaje de ingresos pagados respecto al total de ingresos
    // (Suma Ingresos Pagados / Suma Ingresos Totales) * 100
    const ingresosPagados = validIncome
      .filter((record) => record.paymentStatus === 'Pagado')
      .reduce((sum, record) => {
        return sum + safeParseFloat(record.data.total);
      }, 0);

    const ratioCobro = totalIngresos > 0 ? (ingresosPagados / totalIngresos) * 100 : 0;

    // IVA Neto: Suma el campo vat (tax) de los ingresos y réstale el vat (tax) de los gastos
    const ivaIngresos = validIncome.reduce((sum, record) => {
      return sum + safeParseFloat(record.data.vat);
    }, 0);

    const ivaGastos = validExpenses.reduce((sum, record) => {
      return sum + safeParseFloat(record.data.vat);
    }, 0);

    const ivaNeto = ivaIngresos - ivaGastos;

    // IVA Trimestral: Calcula el IVA neto solo de los registros del trimestre actual
    const ingresosTrimestre = validIncome.filter((record) => {
      const fecha = record.data.issueDate || record.createdAt;
      return isInCurrentQuarter(fecha);
    });

    const gastosTrimestre = validExpenses.filter((record) => {
      const fecha = record.data.issueDate || record.createdAt;
      return isInCurrentQuarter(fecha);
    });

    const ivaIngresosTrimestre = ingresosTrimestre.reduce((sum, record) => {
      return sum + safeParseFloat(record.data.vat);
    }, 0);

    const ivaGastosTrimestre = gastosTrimestre.reduce((sum, record) => {
      return sum + safeParseFloat(record.data.vat);
    }, 0);

    const ivaTrimestral = ivaIngresosTrimestre - ivaGastosTrimestre;

    return {
      totalIngresos,
      totalGastos,
      beneficioNeto,
      cajaPendiente,
      ratioCobro,
      ivaNeto,
      ivaTrimestral,
    };
  }, [expenses, income]);

  // Formatear moneda
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Obtener los 5 movimientos pendientes más recientes (solo datos reales)
  const pendingMovements = useMemo(() => {
    const allRecords = [...income, ...expenses];
    
    // Filtrar solo los pendientes y ordenar por fecha (más recientes primero)
    return allRecords
      .filter((record) => record.paymentStatus === 'Pendiente')
      .sort((a, b) => {
        const dateA = new Date(a.data.issueDate || a.createdAt);
        const dateB = new Date(b.data.issueDate || b.createdAt);
        return dateB.getTime() - dateA.getTime(); // Más reciente primero
      })
      .slice(0, 5); // Solo los 5 más recientes
  }, [income, expenses]);

  return {
    kpis,
    allIncome: income, // Retornar solo los ingresos reales
    validExpensesForChart,
    formatCurrency,
    pendingMovements,
  };
};
