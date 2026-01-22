import React from 'react';

interface FinancialKPIsProps {
  totalAcumulado: number;
  pendiente: number;
  numeroOperaciones: number;
  currency?: string;
}

export const FinancialKPIs: React.FC<FinancialKPIsProps> = ({
  totalAcumulado,
  pendiente,
  numeroOperaciones,
  currency = 'EUR',
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="studio-card">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Acumulado
            </h3>
            <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">
              account_balance
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(totalAcumulado)}
          </p>
        </div>
      </div>

      <div className="studio-card">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Pendiente de Pago/Cobro
            </h3>
            <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">
              pending
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(pendiente)}
          </p>
        </div>
      </div>

      <div className="studio-card">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Número de Operaciones
            </h3>
            <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">
              receipt_long
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {numeroOperaciones}
          </p>
        </div>
      </div>
    </div>
  );
};
