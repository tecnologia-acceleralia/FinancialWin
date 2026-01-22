import { useMemo } from 'react';
import { useFinancial, type FinancialRecord } from '../contexts/FinancialContext';
import type { ExtractedData } from '../types';

// Datos mock de ingresos para simular ventas
const MOCK_INGRESOS: FinancialRecord[] = [
  {
    id: 'mock-income-1',
    type: 'income',
    data: {
      supplier: 'Cliente A',
      invoiceNum: 'INV-2024-001',
      issueDate: '2024-01-15',
      total: '15000',
      currency: 'EUR',
    } as ExtractedData,
    documentType: 'invoices',
    paymentStatus: 'Pagado',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'mock-income-2',
    type: 'income',
    data: {
      supplier: 'Cliente B',
      invoiceNum: 'INV-2024-002',
      issueDate: '2024-01-20',
      total: '22000',
      currency: 'EUR',
    } as ExtractedData,
    documentType: 'invoices',
    paymentStatus: 'Pagado',
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z',
  },
  {
    id: 'mock-income-3',
    type: 'income',
    data: {
      supplier: 'Cliente C',
      invoiceNum: 'INV-2024-003',
      issueDate: '2024-02-05',
      total: '18000',
      currency: 'EUR',
    } as ExtractedData,
    documentType: 'invoices',
    paymentStatus: 'Pendiente',
    createdAt: '2024-02-05T10:00:00Z',
    updatedAt: '2024-02-05T10:00:00Z',
  },
  {
    id: 'mock-income-4',
    type: 'income',
    data: {
      supplier: 'Cliente D',
      invoiceNum: 'INV-2024-004',
      issueDate: '2024-02-10',
      total: '25000',
      currency: 'EUR',
    } as ExtractedData,
    documentType: 'invoices',
    paymentStatus: 'Pagado',
    createdAt: '2024-02-10T10:00:00Z',
    updatedAt: '2024-02-10T10:00:00Z',
  },
  {
    id: 'mock-income-5',
    type: 'income',
    data: {
      supplier: 'Cliente E',
      invoiceNum: 'INV-2024-005',
      issueDate: '2024-02-15',
      total: '12000',
      currency: 'EUR',
    } as ExtractedData,
    documentType: 'invoices',
    paymentStatus: 'Pendiente',
    createdAt: '2024-02-15T10:00:00Z',
    updatedAt: '2024-02-15T10:00:00Z',
  },
];

export interface FinancialKPIs {
  totalIngresos: number;
  totalGastos: number;
  beneficioNeto: number;
  cajaPendiente: number;
  ratioCobro: number;
}

export const useFinancialStats = () => {
  const { expenses, income } = useFinancial();

  // Combinar ingresos reales (si existen) con mock
  const allIncome = useMemo(() => {
    return [...income, ...MOCK_INGRESOS];
  }, [income]);

  // Filtrar gastos válidos para gráficos
  const validExpensesForChart = useMemo(() => {
    return expenses.filter(
      (expense) => expense.data.supplier && expense.data.total
    );
  }, [expenses]);

  // Calcular KPIs dinámicos
  const kpis = useMemo((): FinancialKPIs => {
    // Filtrar registros válidos (con supplier y total)
    const validExpenses = expenses.filter(
      (expense) => expense.data.supplier && expense.data.total
    );
    const validIncome = allIncome.filter(
      (income) => income.data.supplier && income.data.total
    );

    // Total Ingresos
    const totalIngresos = validIncome.reduce((sum, record) => {
      const total = parseFloat(record.data.total?.toString() || '0');
      return sum + (isNaN(total) ? 0 : total);
    }, 0);

    // Total Gastos
    const totalGastos = validExpenses.reduce((sum, record) => {
      const total = parseFloat(record.data.total?.toString() || '0');
      return sum + (isNaN(total) ? 0 : total);
    }, 0);

    // Beneficio Neto
    const beneficioNeto = totalIngresos - totalGastos;

    // Ingresos Pendientes
    const ingresosPendientes = validIncome
      .filter((record) => record.paymentStatus === 'Pendiente')
      .reduce((sum, record) => {
        const total = parseFloat(record.data.total?.toString() || '0');
        return sum + (isNaN(total) ? 0 : total);
      }, 0);

    // Gastos Pendientes
    const gastosPendientes = validExpenses
      .filter((record) => record.paymentStatus === 'Pendiente')
      .reduce((sum, record) => {
        const total = parseFloat(record.data.total?.toString() || '0');
        return sum + (isNaN(total) ? 0 : total);
      }, 0);

    // Caja Pendiente
    const cajaPendiente = ingresosPendientes + gastosPendientes;

    // Ratio de Cobro (% de ingresos marcados como 'Pagado')
    const ingresosPagados = validIncome
      .filter((record) => record.paymentStatus === 'Pagado')
      .reduce((sum, record) => {
        const total = parseFloat(record.data.total?.toString() || '0');
        return sum + (isNaN(total) ? 0 : total);
      }, 0);

    const ratioCobro = totalIngresos > 0 ? (ingresosPagados / totalIngresos) * 100 : 0;

    return {
      totalIngresos,
      totalGastos,
      beneficioNeto,
      cajaPendiente,
      ratioCobro,
    };
  }, [expenses, allIncome]);

  // Formatear moneda
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return {
    kpis,
    allIncome,
    validExpensesForChart,
    formatCurrency,
  };
};
