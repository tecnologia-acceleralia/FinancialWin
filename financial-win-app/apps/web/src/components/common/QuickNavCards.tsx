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
          className="btn-quick-nav"
          onClick={() => navigate(item.path)}
        >
          <span className="material-symbols-outlined">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
};
