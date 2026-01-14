import React from 'react';
import { ViewState } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

interface HomePageProps {
  onNavigate?: (view: ViewState, subAction?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleNavigate = (view: ViewState, subAction?: string) => {
    if (onNavigate) {
      onNavigate(view, subAction);
    } else {
      // Default navigation using React Router
      if (view === 'ai-extraction') {
        navigate('/ai-extraction');
      } else {
        navigate('/');
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-r from-brand-900 to-indigo-900 rounded-2xl p-8 text-white shadow-card relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 right-20 w-32 h-32 bg-brand-500 opacity-20 rounded-full blur-xl"></div>
          
          <div className="relative z-10">
            <h2 className="text-5xl font-poppins font-bold mb-3">{t('home.hero.greeting')}</h2>
            <p className="text-brand-100 text-base mb-8 max-w-lg leading-relaxed">
              {t('home.hero.status')}
            </p>
            <button 
              onClick={() => handleNavigate('billing')}
              className="px-5 py-3 bg-white text-brand-900 font-semibold text-base rounded-xl shadow-md hover:bg-brand-50 transition-colors flex items-center gap-2"
            >
              <span>{t('home.hero.action')}</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Next Due Card */}
        <div className="bg-white dark:bg-secondary-800 rounded-2xl p-6 border border-gray-200 dark:border-secondary-border shadow-card flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-md uppercase tracking-wider">{t('home.nextDue.label')}</span>
              <span className="material-symbols-outlined text-gray-400">calendar_today</span>
            </div>
            <h3 className="text-2xl font-bold font-poppins text-neutral-900 dark:text-white mb-2">{t('home.nextDue.title')}</h3>
            <p className="text-base text-gray-500">{t('home.nextDue.time')}</p>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-2">
              <div className="bg-orange-500 h-2 rounded-full w-3/4"></div>
            </div>
            <p className="text-xs text-gray-500 text-right">{t('home.nextDue.progress')}</p>
          </div>
        </div>
      </div>

      {/* Quick Access Modules */}
      <div>
        <h3 className="text-2xl font-poppins font-semibold text-neutral-900 dark:text-white mt-8 mb-6">{t('home.shortcuts.title')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          
          {/* Card 1 - Documentación */}
          <div 
            onClick={() => handleNavigate('documents')}
            className="group cursor-pointer bg-white dark:bg-secondary-800 p-5 rounded-2xl border border-gray-200 dark:border-secondary-border shadow-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4 group-hover:bg-amber-500 transition-colors shrink-0">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 group-hover:text-white">folder_open</span>
            </div>
            <h4 className="font-bold text-lg mb-2 dark:text-white leading-tight">{t('home.shortcuts.documents')}</h4>
            <p className="text-sm text-gray-500 mb-4 flex-1">{t('home.shortcuts.documentsDesc')}</p>
            <div className="flex items-center gap-2 mt-auto">
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded">15 {t('home.shortcuts.updated')}</span>
            </div>
          </div>

          {/* Card 2 - Registros */}
          <div 
            onClick={() => handleNavigate('records')}
            className="group cursor-pointer bg-white dark:bg-secondary-800 p-5 rounded-2xl border border-gray-200 dark:border-secondary-border shadow-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col"
          >
            <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center mb-4 group-hover:bg-cyan-500 transition-colors shrink-0">
              <span className="material-symbols-outlined text-cyan-600 dark:text-cyan-400 group-hover:text-white">table_view</span>
            </div>
            <h4 className="font-bold text-lg mb-2 dark:text-white leading-tight">{t('home.shortcuts.records')}</h4>
            <p className="text-sm text-gray-500 mb-4 flex-1">{t('home.shortcuts.recordsDesc')}</p>
            <div className="flex items-center gap-2 mt-auto">
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded">23 {t('home.shortcuts.monthly')}</span>
            </div>
          </div>

          {/* Card 3 - Billing (Control Financiero) */}
          <div 
            onClick={() => handleNavigate('billing')}
            className="group cursor-pointer bg-white dark:bg-secondary-800 p-5 rounded-2xl border border-gray-200 dark:border-secondary-border shadow-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-4 group-hover:bg-brand-500 transition-colors shrink-0">
              <span className="material-symbols-outlined text-brand-600 dark:text-brand-400 group-hover:text-white">receipt_long</span>
            </div>
            <h4 className="font-bold text-lg mb-2 dark:text-white leading-tight">{t('home.shortcuts.billing')}</h4>
            <p className="text-sm text-gray-500 mb-4 flex-1">{t('home.shortcuts.billingDesc')}</p>
            <div className="flex items-center gap-2 mt-auto">
              <span className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 text-[10px] font-bold rounded">12 {t('home.shortcuts.pending')}</span>
            </div>
          </div>

          {/* Card 4 - Clients */}
          <div 
            onClick={() => handleNavigate('clients')}
            className="group cursor-pointer bg-white dark:bg-secondary-800 p-5 rounded-2xl border border-gray-200 dark:border-secondary-border shadow-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 group-hover:bg-blue-500 transition-colors shrink-0">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 group-hover:text-white">group</span>
            </div>
            <h4 className="font-bold text-lg mb-2 dark:text-white leading-tight">{t('home.shortcuts.clients')}</h4>
            <p className="text-sm text-gray-500 mb-4 flex-1">{t('home.shortcuts.clientsDesc')}</p>
            <div className="flex items-center gap-2 mt-auto">
              <span className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 text-[10px] font-bold rounded">3 {t('home.shortcuts.new')}</span>
            </div>
          </div>

          {/* Card 5 - Suppliers */}
          <div 
            onClick={() => handleNavigate('suppliers')}
            className="group cursor-pointer bg-white dark:bg-secondary-800 p-5 rounded-2xl border border-gray-200 dark:border-secondary-border shadow-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500 transition-colors shrink-0">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 group-hover:text-white">local_shipping</span>
            </div>
            <h4 className="font-bold text-lg mb-2 dark:text-white leading-tight">{t('home.shortcuts.suppliers')}</h4>
            <p className="text-sm text-gray-500 mb-4 flex-1">{t('home.shortcuts.suppliersDesc')}</p>
            <div className="flex items-center gap-2 mt-auto">
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded">{t('home.shortcuts.updated')}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Operational Summary & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status List */}
        <div className="lg:col-span-2 bg-white dark:bg-secondary-800 rounded-2xl border border-gray-200 dark:border-secondary-border shadow-card p-6">
          <h3 className="text-xl font-bold font-poppins mb-6 dark:text-white">{t('home.summary.title')}</h3>
          <div className="space-y-4">
            {[
              { label: t('home.summary.income'), amount: '€124,500', status: 'success', change: '+12%' },
              { label: t('home.summary.expenses'), amount: '€42,300', status: 'neutral', change: '+2%' },
              { label: t('home.summary.pending'), amount: '€18,200', status: 'warning', change: '+5%' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 dark:bg-secondary-900 hover:bg-neutral-100 dark:hover:bg-[#1a2333] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-12 rounded-full ${
                    item.status === 'success' ? 'bg-green-500' : item.status === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
                  }`}></div>
                  <div>
                    <h4 className="font-semibold text-base text-neutral-900 dark:text-white">{item.label}</h4>
                    <span className="text-sm text-gray-500">{t('home.summary.last30')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xl dark:text-gray-100">{item.amount}</div>
                  <div className={`text-xs font-bold ${item.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {item.change} {t('home.summary.vsPrev')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="bg-white dark:bg-secondary-800 rounded-2xl border border-gray-200 dark:border-secondary-border shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold font-poppins dark:text-white">{t('home.alerts.title')}</h3>
            <span className="text-xs text-brand-500 font-bold cursor-pointer hover:underline">{t('home.alerts.viewAll')}</span>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 flex gap-3">
              <span className="material-symbols-outlined text-red-600">error</span>
              <div>
                <p className="text-base font-bold text-red-900 dark:text-red-100">{t('home.alerts.syncError')}</p>
                <p className="text-xs text-red-700 dark:text-red-300">{t('home.alerts.syncErrorDesc')} - {t('home.alerts.time.h2')}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 flex gap-3">
              <span className="material-symbols-outlined text-orange-600">warning</span>
              <div>
                <p className="text-base font-bold text-orange-900 dark:text-orange-100">{t('home.alerts.pendingSign')}</p>
                <p className="text-xs text-orange-700 dark:text-orange-300">{t('home.alerts.pendingSignDesc')}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 flex gap-3">
              <span className="material-symbols-outlined text-blue-600">info</span>
              <div>
                <p className="text-base font-bold text-blue-900 dark:text-blue-100">{t('home.alerts.update')}</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">{t('home.alerts.updateDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
