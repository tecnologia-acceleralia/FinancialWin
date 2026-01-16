import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export const ClientsPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="layout-page-container">
      <div className="studio-container">
        <div className="studio-card">
          <div className="studio-form-header">
            <h1 className="studio-form-title text-slate-900 dark:text-white">Clientes</h1>
            <p className="studio-form-subtitle">
              Gestión de clientes y relaciones comerciales
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="studio-kpi-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">
                    Total Clientes
                  </p>
                  <h3 className="text-3xl font-bold text-[#171717] dark:text-[#fafafa] mt-2">
                    156
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">
                    group
                  </span>
                </div>
              </div>
            </div>

            <div className="studio-kpi-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">
                    Nuevos
                  </p>
                  <h3 className="text-3xl font-bold text-[#171717] dark:text-[#fafafa] mt-2">
                    3
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">
                    person_add
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm text-[#737373] dark:text-[#a3a3a3]">
              Esta página está en desarrollo. La funcionalidad completa se implementará en la siguiente fase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
