import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { FinancialRecord } from '../../contexts/FinancialContext';

interface IncomeBarChartProps {
  records: FinancialRecord[];
}

const monthNames = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export const IncomeBarChart: React.FC<IncomeBarChartProps> = ({ records }) => {
  const chartData = useMemo(() => {
    // Agrupar por mes
    const monthMap = new Map<string, number>();

    records.forEach((record) => {
      // Obtener fecha de issueDate o createdAt
      const dateStr = record.data.issueDate || record.createdAt;
      const date = new Date(dateStr);
      
      if (!isNaN(date.getTime())) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        const total = parseFloat(record.data.total?.toString() || '0');

        if (!isNaN(total) && total > 0) {
          const current = monthMap.get(monthKey) || 0;
          monthMap.set(monthKey, current + total);
        }
      }
    });

    // Convertir a array y ordenar por fecha
    return Array.from(monthMap.entries())
      .map(([key, value]) => {
        const [year, month] = key.split('-');
        const monthIndex = parseInt(month) - 1;
        return {
          month: monthNames[monthIndex],
          year: parseInt(year),
          monthKey: key,
          value: Number(value.toFixed(2)),
        };
      })
      .sort((a, b) => {
        // Ordenar por año y mes
        if (a.year !== b.year) return a.year - b.year;
        return a.monthKey.localeCompare(b.monthKey);
      })
      .map((item) => ({
        name: `${item.month} ${item.year}`,
        value: item.value,
      }));
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
        Ingresos por Mes
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
          <Tooltip
            formatter={(value: number) => {
              return new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 2,
              }).format(value);
            }}
          />
          <Legend />
          <Bar dataKey="value" fill="#3b82f6" name="Ingresos" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
