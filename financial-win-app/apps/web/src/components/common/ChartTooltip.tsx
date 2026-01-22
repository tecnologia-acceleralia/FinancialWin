import React from 'react';
import type { TooltipProps } from 'recharts';

/**
 * Formatea un valor numérico con símbolo € y separadores de miles
 */
export const formatCurrencyTooltip = (value: number): string => {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + ' €';
};

/**
 * Tooltip personalizado para recharts con soporte para dark/light mode
 */
export const ChartTooltip: React.FC<TooltipProps<number, string>> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="chart-tooltip-item" style={{ color: entry.color }}>
          <span className="chart-tooltip-name">{entry.name}:</span>
          <span className="chart-tooltip-value">{formatCurrencyTooltip(entry.value as number)}</span>
        </p>
      ))}
    </div>
  );
};
