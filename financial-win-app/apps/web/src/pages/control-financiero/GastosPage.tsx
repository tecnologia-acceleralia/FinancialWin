import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { GastosTable } from '../../components/features/finanzas/GastosTable';

export const GastosPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="layout-page-container">
      <div className="studio-container">
        <div className="studio-card">
          <div className="studio-form-header">
            <h1 className="studio-form-title text-slate-900 dark:text-white">Gastos</h1>
            <p className="studio-form-subtitle">
              Gestión y visualización de gastos financieros
            </p>
          </div>

          <div className="mt-8">
            <GastosTable />
          </div>
        </div>
      </div>
    </div>
  );
};
