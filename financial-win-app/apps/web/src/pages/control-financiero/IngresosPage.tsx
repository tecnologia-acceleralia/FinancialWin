import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { IngresosTable } from '../../components/features/finanzas/IngresosTable';

export const IngresosPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="layout-page-container">
      <div className="studio-container">
        <div className="studio-card">
          <div className="studio-form-header">
            <h1 className="studio-form-title text-slate-900 dark:text-white">Ingresos</h1>
            <p className="studio-form-subtitle">
              Gestión y visualización de ingresos financieros
            </p>
          </div>

          <div className="mt-8">
            <IngresosTable />
          </div>
        </div>
      </div>
    </div>
  );
};
