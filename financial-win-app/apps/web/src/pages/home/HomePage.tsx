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
    // Prevent default behavior and stop propagation
    const routeMap: Record<ViewState, string> = {
      'dashboard': '/',
      'ai-extraction': '/ai-extraction',
      'records': '/records',
      'billing': '/billing',
      'clients': '/clients',
      'suppliers': '/suppliers',
      'documents': '/documents',
      'upload-invoice': '/upload-invoice',
      'tickets': '/tickets',
      'subscriptions': '/subscriptions',
    };
    
    const route = routeMap[view] || '/';
    navigate(route);
  };

  return (
    <div className="home-container">
      {/* Hero Section */}
      <div className="home-hero-grid">
        <div className="brand-hero-card">
          <div className="home-hero-decoration-1"></div>
          <div className="home-hero-decoration-2"></div>
          
          <div className="home-hero-content">
            <h2 className="home-hero-title">{t('home.hero.greeting')}</h2>
            <p className="home-hero-text">
              {t('home.hero.status')}
            </p>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleNavigate('billing');
              }}
              className="home-hero-button"
            >
              <span>{t('home.hero.action')}</span>
              <span className="material-symbols-outlined home-hero-button-icon">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Next Due Card */}
        <div className="home-next-due-card">
          <div>
            <div className="home-next-due-label">
              <span className="home-next-due-badge">{t('home.nextDue.label')}</span>
              <span className="material-symbols-outlined home-next-due-icon">calendar_today</span>
            </div>
            <h3 className="home-next-due-title">{t('home.nextDue.title')}</h3>
            <p className="home-next-due-time">{t('home.nextDue.time')}</p>
          </div>
          <div className="home-next-due-progress-container">
            <div className="home-next-due-progress-bar">
              <div className="home-next-due-progress-fill"></div>
            </div>
            <p className="home-next-due-progress-text">{t('home.nextDue.progress')}</p>
          </div>
        </div>
      </div>

      {/* Quick Access Modules */}
      <div>
        <h3 className="home-shortcuts-title">{t('home.shortcuts.title')}</h3>
        <div className="home-shortcuts-grid">
          
          {/* Card 1 - Documentación */}
          <div 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNavigate('documents');
            }}
            className="home-quick-access-card group"
          >
            <div className="home-quick-access-icon-wrapper-amber">
              <span className="material-symbols-outlined home-quick-access-icon-amber">folder_open</span>
            </div>
            <h4 className="home-quick-access-title">{t('home.shortcuts.documents')}</h4>
            <p className="home-quick-access-desc">{t('home.shortcuts.documentsDesc')}</p>
            <div className="home-quick-access-footer">
              <span className="home-quick-access-badge-gray">15 {t('home.shortcuts.updated')}</span>
            </div>
          </div>

          {/* Card 2 - Registros */}
          <div 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNavigate('records');
            }}
            className="home-quick-access-card group"
          >
            <div className="home-quick-access-icon-wrapper-cyan">
              <span className="material-symbols-outlined home-quick-access-icon-cyan">table_view</span>
            </div>
            <h4 className="home-quick-access-title">{t('home.shortcuts.records')}</h4>
            <p className="home-quick-access-desc">{t('home.shortcuts.recordsDesc')}</p>
            <div className="home-quick-access-footer">
              <span className="home-quick-access-badge-gray">23 {t('home.shortcuts.monthly')}</span>
            </div>
          </div>

          {/* Card 3 - Billing (Control Financiero) */}
          <div 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNavigate('billing');
            }}
            className="home-quick-access-card group"
          >
            <div className="home-quick-access-icon-wrapper-purple">
              <span className="material-symbols-outlined home-quick-access-icon-purple">receipt_long</span>
            </div>
            <h4 className="home-quick-access-title">{t('home.shortcuts.billing')}</h4>
            <p className="home-quick-access-desc">{t('home.shortcuts.billingDesc')}</p>
            <div className="home-quick-access-footer">
              <span className="home-quick-access-badge-red">12 {t('home.shortcuts.pending')}</span>
            </div>
          </div>

          {/* Card 4 - Clients */}
          <div 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNavigate('clients');
            }}
            className="home-quick-access-card group"
          >
            <div className="home-quick-access-icon-wrapper-blue">
              <span className="material-symbols-outlined home-quick-access-icon-blue">group</span>
            </div>
            <h4 className="home-quick-access-title">{t('home.shortcuts.clients')}</h4>
            <p className="home-quick-access-desc">{t('home.shortcuts.clientsDesc')}</p>
            <div className="home-quick-access-footer">
              <span className="home-quick-access-badge-green">3 {t('home.shortcuts.new')}</span>
            </div>
          </div>

          {/* Card 5 - Suppliers */}
          <div 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNavigate('suppliers');
            }}
            className="home-quick-access-card group"
          >
            <div className="home-quick-access-icon-wrapper-emerald">
              <span className="material-symbols-outlined home-quick-access-icon-emerald">local_shipping</span>
            </div>
            <h4 className="home-quick-access-title">{t('home.shortcuts.suppliers')}</h4>
            <p className="home-quick-access-desc">{t('home.shortcuts.suppliersDesc')}</p>
            <div className="home-quick-access-footer">
              <span className="home-quick-access-badge-gray">{t('home.shortcuts.updated')}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Operational Summary & Alerts */}
      <div className="home-summary-grid">
        {/* Status List */}
        <div className="home-summary-card">
          <h3 className="home-summary-title">{t('home.summary.title')}</h3>
          <div className="home-summary-list">
            {[
              { label: t('home.summary.income'), amount: '€124,500', status: 'success', change: '+12%' },
              { label: t('home.summary.expenses'), amount: '€42,300', status: 'neutral', change: '+2%' },
              { label: t('home.summary.pending'), amount: '€18,200', status: 'warning', change: '+5%' },
            ].map((item, idx) => (
              <div key={idx} className="home-summary-item">
                <div className="home-summary-item-content">
                  <div className={
                    item.status === 'success' ? 'home-summary-indicator-success' :
                    item.status === 'warning' ? 'home-summary-indicator-warning' :
                    'home-summary-indicator-neutral'
                  }></div>
                  <div>
                    <h4 className="home-summary-item-text">{item.label}</h4>
                    <span className="home-summary-item-subtext">{t('home.summary.last30')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="home-summary-item-amount">{item.amount}</div>
                  <div className={item.change.startsWith('+') ? 'home-summary-item-change-positive' : 'home-summary-item-change-negative'}>
                    {item.change} {t('home.summary.vsPrev')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="home-alerts-card">
          <div className="home-alerts-header">
            <h3 className="home-alerts-title">{t('home.alerts.title')}</h3>
            <span className="home-alerts-view-all">{t('home.alerts.viewAll')}</span>
          </div>
          <div className="home-alerts-list">
            <div className="home-alert-item-error">
              <span className="material-symbols-outlined home-alert-icon-error">error</span>
              <div>
                <p className="home-alert-title-error">{t('home.alerts.syncError')}</p>
                <p className="home-alert-desc-error">{t('home.alerts.syncErrorDesc')} - {t('home.alerts.time.h2')}</p>
              </div>
            </div>
            <div className="home-alert-item-warning">
              <span className="material-symbols-outlined home-alert-icon-warning">warning</span>
              <div>
                <p className="home-alert-title-warning">{t('home.alerts.pendingSign')}</p>
                <p className="home-alert-desc-warning">{t('home.alerts.pendingSignDesc')}</p>
              </div>
            </div>
            <div className="home-alert-item-info">
              <span className="material-symbols-outlined home-alert-icon-info">info</span>
              <div>
                <p className="home-alert-title-info">{t('home.alerts.update')}</p>
                <p className="home-alert-desc-info">{t('home.alerts.updateDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
