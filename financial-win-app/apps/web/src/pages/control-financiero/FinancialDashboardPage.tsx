import React, { useMemo } from 'react';
import { PageHeader } from '../../components/layout';
import {
  StatCard,
  IncomeExpenseComparisonChart,
  ExpensesPieChart,
  ExpensesAccumulatedChart,
  TopVendorsChart,
  QuickNavCards,
} from '../../components/common';
import { useFinancialStats } from '../../hooks/useFinancialStats';

export const FinancialDashboardPage: React.FC = () => {
  const { kpis, allIncome, validExpensesForChart, formatCurrency, pendingMovements, isLoading } = useFinancialStats();

  // Función auxiliar para verificar si una fecha pertenece al mes actual
  const isInCurrentMonth = (dateString: string | undefined | null): boolean => {
    if (!dateString) return false;
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return false;
      
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    } catch (error) {
      return false;
    }
  };

  // Calcular Gasto Operativo del Mes (5ª tarjeta)
  const gastoOperativoMes = useMemo(() => {
    return validExpensesForChart
      .filter((expense) => {
        const invoiceDate = expense.data.issueDate || expense.createdAt;
        return isInCurrentMonth(invoiceDate);
      })
      .reduce((total, expense) => {
        const amount = parseFloat(expense.data.total?.toString() || '0');
        return total + amount;
      }, 0);
  }, [validExpensesForChart]);

  // Calcular Ventas Totales del Mes
  const ventasTotalesMes = useMemo(() => {
    return allIncome
      .filter((income) => {
        const invoiceDate = income.data.issueDate || income.createdAt;
        return isInCurrentMonth(invoiceDate);
      })
      .reduce((total, income) => {
        const amount = parseFloat(income.data.total?.toString() || '0');
        return total + amount;
      }, 0);
  }, [allIncome]);

  // Calcular Previsión de Cierre (6ª tarjeta)
  const previsiónCierre = useMemo(() => {
    return ventasTotalesMes - gastoOperativoMes;
  }, [ventasTotalesMes, gastoOperativoMes]);

  // Componente de Skeleton para KPIs
  const KpiSkeleton = () => (
    <div className="studio-kpi-card">
      <div className="kpi-content">
        <div className="w-full">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2 w-24 animate-pulse"></div>
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
        </div>
        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
      </div>
    </div>
  );

  return (
    <div className="layout-page-container">
      <PageHeader title="Control Financiero" />
      <div className="studio-container">
        <div className="grid-kpi">
          {isLoading ? (
            <>
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
            </>
          ) : (
            <>
              <StatCard
                title="Beneficio Neto"
                value={formatCurrency(kpis.beneficioNeto)}
                icon="trending_up"
                color={kpis.beneficioNeto >= 0 ? 'green' : 'red'}
              />
              <StatCard
                title="Caja Pendiente"
                value={formatCurrency(kpis.cajaPendiente)}
                icon="pending"
                color="orange"
              />
              <StatCard
                title="Ratio de Cobro"
                value={`${kpis.ratioCobro.toFixed(1)}%`}
                icon="account_balance"
                color="purple"
              />
              <StatCard
                title="IVA Neto"
                value={formatCurrency(kpis.ivaNeto)}
                icon="receipt_long"
                color={kpis.ivaNeto >= 0 ? 'green' : 'orange'}
              />
              <StatCard
                title="Gasto Operativo (Mes)"
                value={formatCurrency(gastoOperativoMes)}
                icon="account_balance_wallet"
                color="pink"
                subtitle={gastoOperativoMes === 0 ? 'Sin gastos registrados aún' : undefined}
              />
              <StatCard
                title="Previsión de Cierre"
                value={formatCurrency(previsiónCierre)}
                icon="query_stats"
                color="cyan"
              />
            </>
          )}
        </div>

        {isLoading ? (
          <div className="grid-charts">
            <div className="studio-card flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 dark:border-slate-400 mx-auto mb-4"></div>
                <p className="text-slate-500 dark:text-slate-400">Cargando datos de Odoo...</p>
              </div>
            </div>
            <div className="studio-card flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 dark:border-slate-400 mx-auto mb-4"></div>
                <p className="text-slate-500 dark:text-slate-400">Cargando datos de Odoo...</p>
              </div>
            </div>
            <div className="studio-card flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 dark:border-slate-400 mx-auto mb-4"></div>
                <p className="text-slate-500 dark:text-slate-400">Cargando datos de Odoo...</p>
              </div>
            </div>
            <div className="studio-card flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 dark:border-slate-400 mx-auto mb-4"></div>
                <p className="text-slate-500 dark:text-slate-400">Cargando datos de Odoo...</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid-charts">
            <IncomeExpenseComparisonChart income={allIncome} expenses={validExpensesForChart} />
            {validExpensesForChart.length === 0 ? (
              <div className="studio-card flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-slate-500 dark:text-slate-400 mb-2">
                    Cargando datos de gastos...
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    Esperando datos de Odoo
                  </p>
                </div>
              </div>
            ) : (
              <ExpensesPieChart records={validExpensesForChart} mode="category" />
            )}
            {validExpensesForChart.length === 0 ? (
              <div className="studio-card flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-slate-500 dark:text-slate-400 mb-2">
                    Cargando datos de gastos...
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    Esperando datos de Odoo
                  </p>
                </div>
              </div>
            ) : (
              <TopVendorsChart records={validExpensesForChart} />
            )}
            {/* Gráfico de Distribución por Departamento - Justo debajo del de categorías */}
            {validExpensesForChart.length > 0 && (
              <ExpensesPieChart 
                records={validExpensesForChart} 
                mode="department" 
                title="Distribución por Departamento"
              />
            )}
            {/* Gráfico de Flujo de Caja Acumulado - Ocupa 2 columnas */}
            {isLoading ? (
              <div className="col-span-1 lg:col-span-2 studio-card flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 dark:border-slate-400 mx-auto mb-4"></div>
                  <p className="text-slate-500 dark:text-slate-400">Cargando datos de Odoo...</p>
                </div>
              </div>
            ) : (
              <div className="col-span-1 lg:col-span-2">
                <ExpensesAccumulatedChart income={allIncome} expenses={validExpensesForChart} />
              </div>
            )}
          </div>
        )}

        {/* Sección de Pendientes de Tesorería */}
        {isLoading ? (
          <div className="section-spacing">
            <div className="studio-card">
              <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
                Pendientes de Tesorería
              </h3>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="treasury-pending-item">
                    <div className="treasury-pending-item-content border-r border-slate-200 dark:border-slate-800">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2 animate-pulse"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
                    </div>
                    <div className="px-6">
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : pendingMovements.length > 0 ? (
          <div className="section-spacing">
            <div className="studio-card">
              <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
                Pendientes de Tesorería
              </h3>
              <div className="space-y-3">
                {pendingMovements.map((movement) => {
                  const isIncome = movement.type === 'income';
                  const amount = parseFloat(movement.data.total?.toString() || '0');
                  const dateStr = movement.data.issueDate || movement.createdAt;
                  const date = new Date(dateStr);
                  const formattedDate = new Intl.DateTimeFormat('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  }).format(date);
                  
                  // Obtener nombre del cliente/proveedor desde los datos de Odoo
                  const partnerName = isIncome 
                    ? (movement.data.supplier || 'Sin cliente')
                    : (movement.data.supplier || 'Sin proveedor');

                  return (
                    <div
                      key={movement.id}
                      className="treasury-pending-item"
                    >
                      <div className="treasury-pending-item-content border-r border-slate-200 dark:border-slate-800">
                        <div className="treasury-pending-item-header">
                          <span className={`treasury-pending-item-type ${isIncome ? 'treasury-pending-item-type-income' : 'treasury-pending-item-type-expense'}`}>
                            <span className="material-symbols-outlined treasury-pending-item-icon">
                              {isIncome ? 'arrow_downward' : 'arrow_upward'}
                            </span>
                            {isIncome ? 'Cobro' : 'Pago'}
                          </span>
                          <span className="treasury-pending-item-date">{formattedDate}</span>
                        </div>
                        <div className="treasury-pending-item-details">
                          <span className="treasury-pending-item-supplier">{partnerName}</span>
                          {movement.data.invoiceNum && (
                            <span className="treasury-pending-item-invoice">
                              {movement.data.invoiceNum}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`treasury-pending-item-amount px-6 ${isIncome ? 'treasury-pending-item-amount-income' : 'treasury-pending-item-amount-expense'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        <QuickNavCards />
      </div>
    </div>
  );
};
