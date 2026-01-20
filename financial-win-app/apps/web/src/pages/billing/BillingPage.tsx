import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { PageHeader } from '../../components/layout';

export const BillingPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="layout-page-container">
      <PageHeader
        title="Control Financiero"
      />
      <div className="studio-container">
        <div className="studio-card">

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="studio-kpi-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">
                    Pendientes
                  </p>
                  <h3 className="text-3xl font-bold text-[#171717] dark:text-[#fafafa] mt-2">
                    12
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">
                    receipt_long
                  </span>
                </div>
              </div>
            </div>

            <div className="studio-kpi-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">
                    Este Mes
                  </p>
                  <h3 className="text-3xl font-bold text-[#171717] dark:text-[#fafafa] mt-2">
                    €42,300
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">
                    trending_up
                  </span>
                </div>
              </div>
            </div>

            <div className="studio-kpi-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">
                    Total Anual
                  </p>
                  <h3 className="text-3xl font-bold text-[#171717] dark:text-[#fafafa] mt-2">
                    €124,500
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-2xl">
                    account_balance
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
