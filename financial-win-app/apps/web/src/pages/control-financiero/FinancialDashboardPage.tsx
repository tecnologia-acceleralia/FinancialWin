import React from 'react';
import { PageHeader } from '../../components/layout';
import {
  StatCard,
  IncomeExpenseComparisonChart,
  ExpensesPieChart,
  ExpensesAccumulatedChart,
  QuickNavCards,
} from '../../components/common';
import { useFinancialStats } from '../../hooks/useFinancialStats';

export const FinancialDashboardPage: React.FC = () => {
  const { kpis, allIncome, validExpensesForChart, formatCurrency, pendingMovements } = useFinancialStats();

  return (
    <div className="layout-page-container">
      <PageHeader title="Control Financiero" />
      <div className="studio-container">
        <div className="grid-kpi">
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
        </div>

        <div className="grid-charts">
          <IncomeExpenseComparisonChart income={allIncome} expenses={validExpensesForChart} />
          <ExpensesPieChart records={validExpensesForChart} />
        </div>

        <div className="section-spacing">
          <ExpensesAccumulatedChart income={allIncome} expenses={validExpensesForChart} />
        </div>

        {/* Sección de Pendientes de Tesorería */}
        {pendingMovements.length > 0 && (
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
                  const supplier = movement.data.supplier || 'Sin proveedor/cliente';

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
                          <span className="treasury-pending-item-supplier">{supplier}</span>
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
        )}

        <QuickNavCards />
      </div>
    </div>
  );
};
