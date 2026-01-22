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
  const { kpis, allIncome, validExpensesForChart, formatCurrency } = useFinancialStats();

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
        </div>

        <div className="grid-charts">
          <IncomeExpenseComparisonChart income={allIncome} expenses={validExpensesForChart} />
          <ExpensesPieChart records={validExpensesForChart} />
        </div>

        <div className="section-spacing">
          <ExpensesAccumulatedChart records={validExpensesForChart} />
        </div>

        <QuickNavCards />
      </div>
    </div>
  );
};
