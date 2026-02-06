import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import type { FinancialRecord } from '../../contexts/FinancialContext';
import { ChartTooltip } from './ChartTooltip';

interface TopVendorsChartProps {
  records: FinancialRecord[];
}

export const TopVendorsChart: React.FC<TopVendorsChartProps> = ({ records }) => {
  const chartData = useMemo(() => {
    // Agrupar gastos por proveedor (supplier)
    const vendorMap = new Map<string, number>();

    records.forEach((record) => {
      const supplier = record.data.supplier || 'Sin proveedor';
      const total = parseFloat(record.data.total?.toString() || '0');

      if (!isNaN(total) && total > 0) {
        const current = vendorMap.get(supplier) || 0;
        vendorMap.set(supplier, current + total);
      }
    });

    // Convertir a array, ordenar de mayor a menor y tomar los 5 primeros
    return Array.from(vendorMap.entries())
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
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
        Concentración de Gasto por Proveedor
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart 
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number"
            domain={[0, 'auto']}
            tickFormatter={(value) => {
              return new Intl.NumberFormat('es-ES', {
                notation: 'compact',
                style: 'currency',
                currency: 'EUR',
              }).format(value);
            }}
          />
          <YAxis 
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            content={<ChartTooltip />} 
            cursor={{ fill: 'currentColor', opacity: 0.1 }} 
          />
          <Bar 
            dataKey="value" 
            fill="var(--brand-500)"
            radius={[0, 4, 4, 0]}
            minPointSize={10}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
