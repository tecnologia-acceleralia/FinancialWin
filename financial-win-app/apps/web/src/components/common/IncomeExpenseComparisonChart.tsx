import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { FinancialRecord } from '../../contexts/FinancialContext';
import { ChartTooltip } from './ChartTooltip';

interface IncomeExpenseComparisonChartProps {
  income: FinancialRecord[];
  expenses: FinancialRecord[];
}

const monthNames = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export const IncomeExpenseComparisonChart: React.FC<IncomeExpenseComparisonChartProps> = ({
  income,
  expenses,
}) => {
  const chartData = useMemo(() => {
    // Agrupar ingresos por mes
    const incomeMap = new Map<string, number>();
    income.forEach((record) => {
      const dateStr = record.data.issueDate || record.createdAt;
      const date = new Date(dateStr);
      
      if (!isNaN(date.getTime())) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const total = parseFloat(record.data.total?.toString() || '0');
        if (!isNaN(total) && total > 0) {
          const current = incomeMap.get(monthKey) || 0;
          incomeMap.set(monthKey, current + total);
        }
      }
    });

    // Agrupar gastos por mes
    const expenseMap = new Map<string, number>();
    expenses.forEach((record) => {
      const dateStr = record.data.issueDate || record.createdAt;
      const date = new Date(dateStr);
      
      if (!isNaN(date.getTime())) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const total = parseFloat(record.data.total?.toString() || '0');
        if (!isNaN(total) && total > 0) {
          const current = expenseMap.get(monthKey) || 0;
          expenseMap.set(monthKey, current + total);
        }
      }
    });

    // Combinar todos los meses únicos
    const allMonths = new Set([...incomeMap.keys(), ...expenseMap.keys()]);
    
    // Convertir a array y ordenar
    return Array.from(allMonths)
      .map((key) => {
        const [year, month] = key.split('-');
        const monthIndex = parseInt(month) - 1;
        return {
          monthKey: key,
          name: `${monthNames[monthIndex]} ${year}`,
          year: parseInt(year),
          monthIndex,
          ingresos: Number((incomeMap.get(key) || 0).toFixed(2)),
          gastos: Number((expenseMap.get(key) || 0).toFixed(2)),
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.monthIndex - b.monthIndex;
      });
  }, [income, expenses]);

  if (chartData.length === 0) {
    return (
      <div className="studio-card flex items-center justify-center h-64">
        <p className="text-slate-500 dark:text-slate-400">
          No hay datos para mostrar
        </p>
      </div>
    );
  }

  return (
    <div className="studio-card">
      <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
        Ingresos vs Gastos por Mes
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tickFormatter={(value) => {
              return new Intl.NumberFormat('es-ES', {
                notation: 'compact',
                style: 'currency',
                currency: 'EUR',
              }).format(value);
            }}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend />
          <Bar 
            dataKey="ingresos" 
            fill="#10b981" 
            name="Ingresos"
            animationBegin={0}
            animationDuration={1500}
          />
          <Bar 
            dataKey="gastos" 
            fill="#ef4444" 
            name="Gastos"
            animationBegin={0}
            animationDuration={1500}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
