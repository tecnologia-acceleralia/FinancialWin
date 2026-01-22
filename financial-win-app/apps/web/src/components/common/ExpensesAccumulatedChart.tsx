import React, { useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import type { FinancialRecord } from '../../contexts/FinancialContext';
import { ChartTooltip } from './ChartTooltip';

interface ExpensesAccumulatedChartProps {
  records: FinancialRecord[];
}

const monthNames = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export const ExpensesAccumulatedChart: React.FC<ExpensesAccumulatedChartProps> = ({ records }) => {
  const chartData = useMemo(() => {
    // Agrupar gastos por mes
    const monthMap = new Map<string, number>();

    records.forEach((record) => {
      const dateStr = record.data.issueDate || record.createdAt;
      const date = new Date(dateStr);
      
      if (!isNaN(date.getTime())) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const total = parseFloat(record.data.total?.toString() || '0');
        if (!isNaN(total) && total > 0) {
          const current = monthMap.get(monthKey) || 0;
          monthMap.set(monthKey, current + total);
        }
      }
    });

    // Convertir a array y ordenar por fecha
    const sortedMonths = Array.from(monthMap.entries())
      .map(([key, value]) => {
        const [year, month] = key.split('-');
        const monthIndex = parseInt(month) - 1;
        return {
          monthKey: key,
          name: `${monthNames[monthIndex]} ${year}`,
          year: parseInt(year),
          monthIndex,
          gasto: Number(value.toFixed(2)),
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.monthIndex - b.monthIndex;
      });

    // Calcular gasto acumulado
    let acumulado = 0;
    return sortedMonths.map((item) => {
      acumulado += item.gasto;
      return {
        ...item,
        acumulado: Number(acumulado.toFixed(2)),
      };
    });
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
        Evolución de Gasto Acumulado
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorGastoAcumulado" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
          </defs>
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
          <Area
            type="monotone"
            dataKey="acumulado"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorGastoAcumulado)"
            name="Gasto Acumulado"
            animationBegin={0}
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
