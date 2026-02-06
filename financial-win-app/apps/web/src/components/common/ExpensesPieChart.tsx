import React, { useMemo, useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { FinancialRecord } from '../../contexts/FinancialContext';
import { ChartTooltip } from './ChartTooltip';

interface ExpensesPieChartProps {
  records: FinancialRecord[];
  mode?: 'category' | 'department';
  title?: string;
}

// Colores para categorías (modo por defecto)
const CATEGORY_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
];

// Colores específicos para departamentos
const DEPARTMENT_COLORS: Record<string, string> = {
  'IT': '#3b82f6', // Azul
  'RRHH': '#ec4899', // Rosa
  'Marketing': '#f59e0b', // Naranja
  'Administración': '#6b7280', // Gris
  'Ventas': '#10b981', // Verde
  'Operaciones': '#8b5cf6', // Morado
  'Dirección': '#eab308', // Dorado/Amarillo
};

export const ExpensesPieChart: React.FC<ExpensesPieChartProps> = ({ 
  records, 
  mode = 'category',
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

  const chartData = useMemo(() => {
    // Agrupar por categoría o departamento según el modo
    const categoryMap = new Map<string, number>();

    console.log(`📈 [ExpensesPieChart] Recibidos ${records.length} registros para procesar en modo "${mode}"`);

    records.forEach((record) => {
      // Determinar la categoría según el modo
      let category: string;
      if (mode === 'department') {
        // Modo departamento: usar department, fallback a 'Operaciones' (por defecto)
        // NUNCA usar "N/A" o "Sin departamento" - siempre usar uno de los 7 departamentos
        category = record.data.department || 'Operaciones';
      } else {
        // Modo categoría (por defecto): expenseType tiene prioridad sobre department
        // CRÍTICO: NO hay filtros de categorías permitidas - TODAS las categorías se incluyen
        // Esto asegura que 'Licencias', 'Licencias Software', y cualquier otra categoría se incluyan
        // Si expenseType es 'Licencias', se agrupará correctamente en el gráfico
        category = record.data.expenseType || record.data.department || 'Sin categoría';
      }
      
      // FORZAR TIPO NUMÉRICO: Asegurar que amount_total no esté llegando como String
      // Intentar múltiples campos posibles: total, amount, amount_total
      const amountStr = record.data.total?.toString() || record.data.amount?.toString() || '0';
      const amount = Number(amountStr) || 0;

      // Log específico según el modo
      if (mode === 'department') {
        console.log(`📈 [ExpensesPieChart] Departamento procesado: department="${record.data.department || 'undefined'}"`);
      } else {
        // Log especial para categoría 'Licencias' para verificación
        if (record.data.expenseType === 'Licencias') {
          console.log(`📈 [ExpensesPieChart] ⭐ Categoría 'Licencias' detectada: Proveedor="${record.data.supplier}", Total=${amount}`);
        }
        console.log(`📈 [ExpensesPieChart] Categoría procesada: expenseType="${record.data.expenseType || 'undefined'}"`);
      }
      console.log(`📈 [ExpensesPieChart] Registro completo: Proveedor="${record.data.supplier}", Total (string)="${amountStr}", Total (num)=${amount}, expenseType="${record.data.expenseType || 'undefined'}", department="${record.data.department || 'undefined'}", Categoría final="${category}"`);

      if (!isNaN(amount) && amount > 0) {
        const current = categoryMap.get(category) || 0;
        categoryMap.set(category, current + amount);
        console.log(`📈 [ExpensesPieChart] ✅ Agregado a "${category}": ${amount} (total acumulado: ${current + amount})`);
        
        // Log especial para verificar que 'Licencias' se está acumulando correctamente
        if (category === 'Licencias') {
          console.log(`📈 [ExpensesPieChart] ⭐ Acumulado en 'Licencias': ${current + amount} (agregado: ${amount})`);
        }
      } else {
        console.warn(`⚠️ [ExpensesPieChart] Registro descartado: Total inválido o cero (${amount})`);
      }
    });

    // Convertir a array para el gráfico
    const result = Array.from(categoryMap.entries())
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value); // Ordenar por valor descendente
    
    // Verificar que 'Licencias' esté presente en los datos finales (solo en modo categoría)
    if (mode === 'category') {
      const licenciasEntry = result.find(r => r.name === 'Licencias');
      if (licenciasEntry) {
        console.log(`📈 [ExpensesPieChart] ✅ Categoría 'Licencias' confirmada en datos finales: ${licenciasEntry.value}`);
      } else {
        console.warn(`⚠️ [ExpensesPieChart] Categoría 'Licencias' NO encontrada en datos finales. Categorías presentes: ${result.map(r => r.name).join(', ')}`);
      }
    }
    
    console.log(`📈 [ExpensesPieChart] Datos finales para gráfico (modo ${mode}):`, result);
    
    return result;
  }, [records, mode]);

  // Determinar colores según el modo
  const getColor = (name: string, index: number): string => {
    if (mode === 'department' && DEPARTMENT_COLORS[name]) {
      return DEPARTMENT_COLORS[name];
    }
    return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
  };

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
        {title || (mode === 'department' ? 'Distribución por Departamento' : 'Gastos por Categoría')}
      </h3>
      <ResponsiveContainer 
        key={records.length}
        width="100%" 
        height={300}
      >
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => {
              const p = (percent || 0) * 100;
              const displayPercent = p > 0 && p < 1 ? p.toFixed(1) : p.toFixed(0);
              return `${name}: ${displayPercent}%`;
            }}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={1500}
            minAngle={5}
            stroke={isDark ? '#0f172a' : '#ffffff'}
            strokeWidth={1}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getColor(entry.name, index)}
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
