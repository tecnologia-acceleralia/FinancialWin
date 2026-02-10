import React, { useMemo, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { FinancialRecord } from '../../contexts/FinancialContext';
import { ChartTooltip } from './ChartTooltip';

interface ExpensesStackedBarChartProps {
  records: FinancialRecord[];
  title?: string;
}

// Colores específicos para departamentos (coherentes con dark mode)
const DEPARTMENT_COLORS: Record<string, string> = {
  'Marketing': '#f59e0b', // Naranja
  'Ventas': '#10b981', // Verde
  'Operaciones': '#8b5cf6', // Morado
  'IT': '#3b82f6', // Azul
  'General': '#6b7280', // Gris
  'Sin Clasificar': '#9ca3af', // Gris neutro
};

// Nombres de meses en español
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Componente de gráfica de barras apiladas para mostrar gastos por mes y departamento
 */
export const ExpensesStackedBarChart: React.FC<ExpensesStackedBarChartProps> = ({ 
  records, 
  title 
}) => {
  // Detectar el tema actual (dark/light)
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Verificar si el elemento raíz tiene la clase 'dark'
    const checkTheme = () => {
      const isDarkMode = document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(isDarkMode);
    };

    checkTheme();

    // Observar cambios en la clase del elemento raíz
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // También escuchar cambios en la preferencia del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkTheme);
    };
  }, []);

  // Procesar datos: agrupar por mes y departamento
  const chartData = useMemo(() => {
    // Mapa para agrupar: mes -> departamento -> importe
    const monthMap = new Map<string, Map<string, number>>();

    records.forEach((record) => {
      // Obtener fecha de la factura
      const invoiceDate = record.data.issueDate || record.createdAt;
      if (!invoiceDate) return;

      // Parsear fecha y obtener mes
      const date = new Date(invoiceDate);
      if (isNaN(date.getTime())) return;

      const monthIndex = date.getMonth(); // 0-11
      const monthName = MONTH_NAMES[monthIndex];

      // Obtener departamento o usar 'Sin Clasificar'
      const department = record.data.department || 'Sin Clasificar';

      // Obtener importe
      const amountStr = record.data.total?.toString() || '0';
      const amount = Number(amountStr) || 0;

      if (amount <= 0) return;

      // Inicializar mes si no existe
      if (!monthMap.has(monthName)) {
        monthMap.set(monthName, new Map<string, number>());
      }

      const departmentMap = monthMap.get(monthName)!;
      const currentAmount = departmentMap.get(department) || 0;
      departmentMap.set(department, currentAmount + amount);
    });

    // Obtener todos los departamentos únicos para asegurar que todos los meses tengan todas las series
    const allDepartments = new Set<string>();
    monthMap.forEach((deptMap) => {
      deptMap.forEach((_, dept) => allDepartments.add(dept));
    });

    // Convertir a formato de Recharts
    // Ordenar meses cronológicamente (Enero = 0, Diciembre = 11)
    const sortedMonths = Array.from(monthMap.keys()).sort((a, b) => {
      const indexA = MONTH_NAMES.indexOf(a);
      const indexB = MONTH_NAMES.indexOf(b);
      return indexA - indexB;
    });

    const result = sortedMonths.map((month) => {
      const departmentMap = monthMap.get(month)!;
      const dataPoint: Record<string, string | number> = {
        mes: month,
      };

      // Agregar cada departamento al punto de datos
      allDepartments.forEach((dept) => {
        const amount = departmentMap.get(dept) || 0;
        dataPoint[dept] = Number(amount.toFixed(2));
      });

      return dataPoint;
    });

    return {
      data: result,
      departments: Array.from(allDepartments),
    };
  }, [records]);

  if (chartData.data.length === 0) {
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
        {title || 'Gastos por Mes y Departamento'}
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData.data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="mes" 
            tick={{ fill: isDark ? '#e2e8f0' : '#64748b' }}
          />
          <YAxis 
            tick={{ fill: isDark ? '#e2e8f0' : '#64748b' }}
            tickFormatter={(value) => {
              if (value >= 1000) {
                return `${(value / 1000).toFixed(1)}k €`;
              }
              return `${value} €`;
            }}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
          />
          {chartData.departments.map((dept) => (
            <Bar
              key={dept}
              dataKey={dept}
              stackId="a"
              fill={DEPARTMENT_COLORS[dept] || '#6b7280'}
              name={dept}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
