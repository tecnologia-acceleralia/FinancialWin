import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

type TabType = 'profile' | 'preferences';

const STORAGE_KEYS = {
  COMPANY_NAME: 'financialwin_company_name',
  CURRENCY: 'financialwin_currency',
  EXPENSE_CATEGORIES: 'financialwin_expense_categories',
} as const;

export const SettingsPage: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [companyName, setCompanyName] = useState<string>('');
  const [currency, setCurrency] = useState<string>('€');
  const [expenseCategories, setExpenseCategories] = useState<string>('');

  // Cargar valores desde localStorage al montar
  useEffect(() => {
    const savedCompanyName = localStorage.getItem(STORAGE_KEYS.COMPANY_NAME) || '';
    const savedCurrency = localStorage.getItem(STORAGE_KEYS.CURRENCY) || '€';
    const savedExpenseCategories =
      localStorage.getItem(STORAGE_KEYS.EXPENSE_CATEGORIES) ||
      'Viajes y Dietas, Transporte, Material Oficina, Comidas, Otros';

    setCompanyName(savedCompanyName);
    setCurrency(savedCurrency);
    setExpenseCategories(savedExpenseCategories);
  }, []);

  // Guardar nombre de empresa en localStorage
  const handleCompanyNameChange = (value: string) => {
    setCompanyName(value);
    localStorage.setItem(STORAGE_KEYS.COMPANY_NAME, value);
  };

  // Guardar moneda en localStorage
  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    localStorage.setItem(STORAGE_KEYS.CURRENCY, value);
  };

  // Guardar categorías de gasto en localStorage
  const handleExpenseCategoriesChange = (value: string) => {
    setExpenseCategories(value);
    localStorage.setItem(STORAGE_KEYS.EXPENSE_CATEGORIES, value);
  };

  // Manejar cambio de idioma
  const handleLanguageChange = (newLanguage: 'es' | 'en') => {
    if (newLanguage !== language) {
      toggleLanguage();
    }
  };

  // Mostrar spinner mientras carga
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="auth-loading-spinner"></div>
          <p className="text-sm text-[#525252] dark:text-[#a3a3a3]">
            {language === 'es' ? 'Cargando configuración...' : 'Loading settings...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="studio-card p-8">
        {/* Título */}
        <h1 className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] mb-6">
          {language === 'es' ? 'Configuración' : 'Settings'}
        </h1>

        {/* Sistema de Pestañas */}
        <div className="flex gap-2 mb-8 border-b border-[#e5e5e5] dark:border-[#2A3B5A]">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 text-sm font-medium transition-all ${
              activeTab === 'profile'
                ? 'text-[#B84E9D] border-b-2 border-[#B84E9D]'
                : 'text-[#525252] dark:text-[#a3a3a3] hover:text-[#171717] dark:hover:text-[#fafafa]'
            }`}
          >
            <span className="material-symbols-outlined inline-block mr-2 align-middle text-base">
              person
            </span>
            {language === 'es' ? 'Perfil' : 'Profile'}
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-6 py-3 text-sm font-medium transition-all ${
              activeTab === 'preferences'
                ? 'text-[#B84E9D] border-b-2 border-[#B84E9D]'
                : 'text-[#525252] dark:text-[#a3a3a3] hover:text-[#171717] dark:hover:text-[#fafafa]'
            }`}
          >
            <span className="material-symbols-outlined inline-block mr-2 align-middle text-base">
              settings
            </span>
            {language === 'es' ? 'Preferencias' : 'Preferences'}
          </button>
        </div>

        {/* Contenido de Pestañas */}
        <div className="mt-6">
          {/* Pestaña Perfil */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="input-group">
                <label className="form-label-studio">
                  {language === 'es' ? 'Nombre de la Empresa' : 'Company Name'}
                </label>
                <input
                  type="text"
                  className="form-input-studio"
                  value={companyName}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  placeholder={
                    language === 'es'
                      ? 'Ingrese el nombre de su empresa'
                      : 'Enter your company name'
                  }
                />
              </div>
            </div>
          )}

          {/* Pestaña Preferencias */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div className="input-group">
                <label className="form-label-studio">
                  {language === 'es' ? 'Idioma' : 'Language'}
                </label>
                <select
                  className="form-select-studio"
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value as 'es' | 'en')}
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="input-group">
                <label className="form-label-studio">
                  {language === 'es' ? 'Moneda' : 'Currency'}
                </label>
                <select
                  className="form-select-studio"
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                >
                  <option value="€">Euro (€)</option>
                  <option value="$">Dólar ($)</option>
                </select>
              </div>

              <div className="input-group">
                <label className="form-label-studio">
                  {language === 'es' ? 'Categorías de Gasto' : 'Expense Categories'}
                </label>
                <input
                  type="text"
                  className="form-input-studio"
                  value={expenseCategories}
                  onChange={(e) => handleExpenseCategoriesChange(e.target.value)}
                  placeholder={
                    language === 'es'
                      ? 'Viajes y Dietas, Transporte, Material Oficina, Comidas, Otros'
                      : 'Travel and Meals, Transport, Office Supplies, Meals, Others'
                  }
                />
                <p className="text-xs text-[#525252] dark:text-[#a3a3a3] mt-1">
                  {language === 'es'
                    ? 'Separa las categorías con comas'
                    : 'Separate categories with commas'}
                </p>
              </div>

              <div className="form-separator-studio mt-8"></div>

              <div className="input-group">
                <button
                  onClick={logout}
                  className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  {language === 'es' ? 'Cerrar Sesión' : 'Sign Out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
