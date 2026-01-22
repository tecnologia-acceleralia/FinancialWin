import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { FinancialRecord } from '../../contexts/FinancialContext';
import { ChartTooltip } from './ChartTooltip';

interface ExpensesPieChartProps {
  records: FinancialRecord[];
}

const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
];

export const ExpensesPieChart: React.FC<ExpensesPieChartProps> = ({ records }) => {
  const chartData = useMemo(() => {
    // Agrupar por categoría (expenseType o department)
    const categoryMap = new Map<string, number>();

    records.forEach((record) => {
      // Usar expenseType si existe, sino department, sino 'Sin categoría'
      const category = record.data.expenseType || record.data.department || 'Sin categoría';
      const total = parseFloat(record.data.total?.toString() || '0');

      if (!isNaN(total) && total > 0) {
        const current = categoryMap.get(category) || 0;
        categoryMap.set(category, current + total);
      }
    });

    // Convertir a array para el gráfico
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value); // Ordenar por valor descendente
  }, [records]);

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
        Gastos por Categoría
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={1500}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
                animationBegin={0}
                animationDuration={1500}
              />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
