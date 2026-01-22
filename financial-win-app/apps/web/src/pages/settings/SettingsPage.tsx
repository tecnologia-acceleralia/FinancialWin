import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

type TabType = 'profile' | 'preferences' | 'integrations';

const STORAGE_KEYS = {
  COMPANY_NAME: 'financialwin_company_name',
  CURRENCY: 'financialwin_currency',
  EXPENSE_CATEGORIES: 'financialwin_expense_categories',
  // Odoo ERP
  ODOO_URL: 'financialwin_odoo_url',
  ODOO_DATABASE: 'financialwin_odoo_database',
  ODOO_USER: 'financialwin_odoo_user',
  ODOO_API_KEY: 'financialwin_odoo_api_key',
  // A3Facturas
  A3_CLIENT_ID: 'financialwin_a3_client_id',
  A3_CLIENT_SECRET: 'financialwin_a3_client_secret',
} as const;

export const SettingsPage: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [companyName, setCompanyName] = useState<string>('');
  const [currency, setCurrency] = useState<string>('€');
  const [expenseCategories, setExpenseCategories] = useState<string>('');
  // Odoo ERP
  const [odooUrl, setOdooUrl] = useState<string>('');
  const [odooDatabase, setOdooDatabase] = useState<string>('');
  const [odooUser, setOdooUser] = useState<string>('');
  const [odooApiKey, setOdooApiKey] = useState<string>('');
  // A3Facturas
  const [a3ClientId, setA3ClientId] = useState<string>('');
  const [a3ClientSecret, setA3ClientSecret] = useState<string>('');

  // Cargar valores desde localStorage al montar
  useEffect(() => {
    const savedCompanyName = localStorage.getItem(STORAGE_KEYS.COMPANY_NAME) || '';
    const savedCurrency = localStorage.getItem(STORAGE_KEYS.CURRENCY) || '€';
    const savedExpenseCategories = localStorage.getItem(STORAGE_KEYS.EXPENSE_CATEGORIES) || 'Viajes y Dietas, Transporte, Material Oficina, Comidas, Otros';
    // Odoo ERP
    const savedOdooUrl = localStorage.getItem(STORAGE_KEYS.ODOO_URL) || '';
    const savedOdooDatabase = localStorage.getItem(STORAGE_KEYS.ODOO_DATABASE) || '';
    const savedOdooUser = localStorage.getItem(STORAGE_KEYS.ODOO_USER) || '';
    const savedOdooApiKey = localStorage.getItem(STORAGE_KEYS.ODOO_API_KEY) || '';
    // A3Facturas
    const savedA3ClientId = localStorage.getItem(STORAGE_KEYS.A3_CLIENT_ID) || '';
    const savedA3ClientSecret = localStorage.getItem(STORAGE_KEYS.A3_CLIENT_SECRET) || '';
    
    setCompanyName(savedCompanyName);
    setCurrency(savedCurrency);
    setExpenseCategories(savedExpenseCategories);
    setOdooUrl(savedOdooUrl);
    setOdooDatabase(savedOdooDatabase);
    setOdooUser(savedOdooUser);
    setOdooApiKey(savedOdooApiKey);
    setA3ClientId(savedA3ClientId);
    setA3ClientSecret(savedA3ClientSecret);
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

  // Handlers para Odoo ERP
  const handleOdooUrlChange = (value: string) => {
    setOdooUrl(value);
    localStorage.setItem(STORAGE_KEYS.ODOO_URL, value);
  };

  const handleOdooDatabaseChange = (value: string) => {
    setOdooDatabase(value);
    localStorage.setItem(STORAGE_KEYS.ODOO_DATABASE, value);
  };

  const handleOdooUserChange = (value: string) => {
    setOdooUser(value);
    localStorage.setItem(STORAGE_KEYS.ODOO_USER, value);
  };

  const handleOdooApiKeyChange = (value: string) => {
    setOdooApiKey(value);
    localStorage.setItem(STORAGE_KEYS.ODOO_API_KEY, value);
  };

  // Handlers para A3Facturas
  const handleA3ClientIdChange = (value: string) => {
    setA3ClientId(value);
    localStorage.setItem(STORAGE_KEYS.A3_CLIENT_ID, value);
  };

  const handleA3ClientSecretChange = (value: string) => {
    setA3ClientSecret(value);
    localStorage.setItem(STORAGE_KEYS.A3_CLIENT_SECRET, value);
  };

  // Handler para probar conexión (placeholder)
  const handleTestConnection = (integration: 'odoo' | 'a3') => {
    alert(language === 'es' ? 'Próximamente' : 'Coming soon');
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

  // Datos del usuario con fallbacks
  const userEmail = user?.email || 'alice@example.com';
  const userName = user?.name || 'Alice Test User';

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
          <button
            onClick={() => setActiveTab('integrations')}
            className={`px-6 py-3 text-sm font-medium transition-all ${
              activeTab === 'integrations'
                ? 'text-[#B84E9D] border-b-2 border-[#B84E9D]'
                : 'text-[#525252] dark:text-[#a3a3a3] hover:text-[#171717] dark:hover:text-[#fafafa]'
            }`}
          >
            <span className="material-symbols-outlined inline-block mr-2 align-middle text-base">
              link
            </span>
            {language === 'es' ? 'Integraciones' : 'Integrations'}
          </button>
        </div>

        {/* Contenido de Pestañas */}
        <div className="mt-6">
          {/* Pestaña Perfil */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="input-group">
                <label className="form-label-studio">
                  {language === 'es' ? 'Correo Electrónico' : 'Email'}
                </label>
                <input
                  type="email"
                  className="input-studio-readonly"
                  value={userEmail}
                  readOnly
                  disabled
                />
              </div>

              <div className="input-group">
                <label className="form-label-studio">
                  {language === 'es' ? 'Nombre' : 'Name'}
                </label>
                <input
                  type="text"
                  className="input-studio-readonly"
                  value={userName}
                  readOnly
                  disabled
                />
              </div>

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

          {/* Pestaña Integraciones */}
          {activeTab === 'integrations' && (
            <div className="space-y-8">
              {/* Sección Odoo ERP */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-[#B84E9D] text-2xl">
                    inventory_2
                  </span>
                  <h2 className="text-xl font-bold text-[#171717] dark:text-[#fafafa]">
                    Odoo ERP
                  </h2>
                </div>

                <div className="input-group">
                  <label className="form-label-studio">
                    {language === 'es' ? 'URL de Instancia' : 'Instance URL'}
                  </label>
                  <input
                    type="url"
                    className="form-input-studio"
                    value={odooUrl}
                    onChange={(e) => handleOdooUrlChange(e.target.value)}
                    placeholder={
                      language === 'es'
                        ? 'https://tu-instancia.odoo.com'
                        : 'https://your-instance.odoo.com'
                    }
                  />
                </div>

                <div className="input-group">
                  <label className="form-label-studio">
                    {language === 'es' ? 'Base de Datos' : 'Database'}
                  </label>
                  <input
                    type="text"
                    className="form-input-studio"
                    value={odooDatabase}
                    onChange={(e) => handleOdooDatabaseChange(e.target.value)}
                    placeholder={
                      language === 'es'
                        ? 'Nombre de la base de datos'
                        : 'Database name'
                    }
                  />
                </div>

                <div className="input-group">
                  <label className="form-label-studio">
                    {language === 'es' ? 'Usuario' : 'User'}
                  </label>
                  <input
                    type="text"
                    className="form-input-studio"
                    value={odooUser}
                    onChange={(e) => handleOdooUserChange(e.target.value)}
                    placeholder={
                      language === 'es'
                        ? 'Usuario de Odoo'
                        : 'Odoo username'
                    }
                  />
                </div>

                <div className="input-group">
                  <label className="form-label-studio">
                    {language === 'es' ? 'API Key' : 'API Key'}
                  </label>
                  <input
                    type="password"
                    className="form-input-studio"
                    value={odooApiKey}
                    onChange={(e) => handleOdooApiKeyChange(e.target.value)}
                    placeholder={
                      language === 'es'
                        ? 'Clave API de Odoo'
                        : 'Odoo API key'
                    }
                  />
                </div>

                <div className="input-group">
                  <button
                    onClick={() => handleTestConnection('odoo')}
                    className="btn btn-primary btn-md w-full"
                  >
                    <span className="material-symbols-outlined text-lg mr-2">
                      sync
                    </span>
                    {language === 'es' ? 'Probar Conexión' : 'Test Connection'}
                  </button>
                </div>
              </div>

              <div className="form-separator-studio"></div>

              {/* Sección A3Facturas */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-[#B84E9D] text-2xl">
                    receipt_long
                  </span>
                  <h2 className="text-xl font-bold text-[#171717] dark:text-[#fafafa]">
                    A3Facturas
                  </h2>
                </div>

                <div className="input-group">
                  <label className="form-label-studio">
                    {language === 'es' ? 'Client ID' : 'Client ID'}
                  </label>
                  <input
                    type="text"
                    className="form-input-studio"
                    value={a3ClientId}
                    onChange={(e) => handleA3ClientIdChange(e.target.value)}
                    placeholder={
                      language === 'es'
                        ? 'ID de cliente de A3Facturas'
                        : 'A3Facturas client ID'
                    }
                  />
                </div>

                <div className="input-group">
                  <label className="form-label-studio">
                    {language === 'es' ? 'Client Secret' : 'Client Secret'}
                  </label>
                  <input
                    type="password"
                    className="form-input-studio"
                    value={a3ClientSecret}
                    onChange={(e) => handleA3ClientSecretChange(e.target.value)}
                    placeholder={
                      language === 'es'
                        ? 'Secret de cliente de A3Facturas'
                        : 'A3Facturas client secret'
                    }
                  />
                </div>

                <div className="input-group">
                  <button
                    onClick={() => handleTestConnection('a3')}
                    className="btn btn-primary btn-md w-full"
                  >
                    <span className="material-symbols-outlined text-lg mr-2">
                      sync
                    </span>
                    {language === 'es' ? 'Probar Conexión' : 'Test Connection'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
