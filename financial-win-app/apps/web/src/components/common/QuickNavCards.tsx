import React from 'react';
import { useNavigate } from 'react-router-dom';

interface QuickNavItem {
  path: string;
  icon: string;
  label: string;
}

const QUICK_NAV_ITEMS: QuickNavItem[] = [
  {
    path: '/gastos',
    icon: 'receipt_long',
    label: 'Ir a Detalle de Gastos',
  },
  {
    path: '/ingresos',
    icon: 'account_balance',
    label: 'Ir a Detalle de Ingresos',
  },
];

export const QuickNavCards: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="grid-quick-nav">
      {QUICK_NAV_ITEMS.map((item) => (
        <button
          key={item.path}
          className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors rounded-xl p-6 flex items-center justify-center gap-3 w-full"
          onClick={() => navigate(item.path)}
        >
          <span className="material-symbols-outlined text-[#B84E9D]">{item.icon}</span>
          <span className="text-slate-900 dark:text-slate-100 font-semibold">{item.label}</span>
        </button>
      ))}
    </div>
  );
};
