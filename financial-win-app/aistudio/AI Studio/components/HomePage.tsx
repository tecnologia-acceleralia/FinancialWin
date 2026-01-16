
import React from 'react';
import { ViewState } from '../types';
import { useLanguage } from './context/LanguageContext';

interface HomePageProps {
  onNavigate: (view: ViewState, subAction?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { t } = useLanguage();

  return (
    <div className="home-container">
      
      {/* Hero Section */}
      <div className="home-grid-top">
        <section className="card-hero">
          {/* Decorative circles */}
          <div className="home-hero-decoration-1"></div>
          <div className="home-hero-decoration-2"></div>
          
          <div className="home-hero-content">
            <h2 className="home-hero-title">{t('home.hero.greeting')}</h2>
            <p className="home-hero-text">
              {t('home.hero.status')}
            </p>
            <button 
              onClick={() => onNavigate('billing')}
              className="btn-hero"
            >
              <span>{t('home.hero.action')}</span>
              <span className="home-hero-button-icon">arrow_forward</span>
            </button>
          </div>
        </section>

        {/* Next Due Card */}
        <div className="card-next-due">
          <div>
            <div className="home-next-due-label">
              <span className="badge-status-orange">{t('home.nextDue.label')}</span>
              <span className="home-next-due-icon">calendar_today</span>
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
      <div className="home-shortcuts-section">
        <h3 className="home-shortcuts-title">{t('home.shortcuts.title')}</h3>
        <div className="home-shortcuts-grid">
          
          {/* Card 1 - Documentación */}
          <div 
            onClick={() => onNavigate('documents')}
            className="group home-quick-access-card"
          >
            <div className="home-quick-access-icon-wrapper-amber">
              <span className="home-quick-access-icon-amber">folder_open</span>
            </div>
            <h4 className="home-quick-access-title">{t('home.shortcuts.documents')}</h4>
            <p className="home-quick-access-desc">{t('home.shortcuts.documentsDesc')}</p>
            <div className="home-quick-access-footer">
              <span className="home-quick-access-badge-gray">15 {t('home.shortcuts.updated')}</span>
            </div>
          </div>

          {/* Card 2 - Registros */}
          <div 
            onClick={() => onNavigate('records')}
            className="group home-quick-access-card"
          >
            <div className="home-quick-access-icon-wrapper-cyan">
              <span className="home-quick-access-icon-cyan">table_view</span>
            </div>
            <h4 className="home-quick-access-title">{t('home.shortcuts.records')}</h4>
            <p className="home-quick-access-desc">{t('home.shortcuts.recordsDesc')}</p>
            <div className="home-quick-access-footer">
              <span className="home-quick-access-badge-gray">23 {t('home.shortcuts.monthly')}</span>
            </div>
          </div>

          {/* Card 3 - Billing (Control Financiero) */}
          <div 
            onClick={() => onNavigate('billing')}
            className="group home-quick-access-card"
          >
            <div className="home-quick-access-icon-wrapper-purple">
              <span className="home-quick-access-icon-purple">receipt_long</span>
            </div>
            <h4 className="home-quick-access-title">{t('home.shortcuts.billing')}</h4>
            <p className="home-quick-access-desc">{t('home.shortcuts.billingDesc')}</p>
            <div className="home-quick-access-footer">
              <span className="home-quick-access-badge-red">12 {t('home.shortcuts.pending')}</span>
            </div>
          </div>

          {/* Card 4 - Clients */}
          <div 
            onClick={() => onNavigate('clients')}
            className="group home-quick-access-card"
          >
            <div className="home-quick-access-icon-wrapper-blue">
              <span className="home-quick-access-icon-blue">group</span>
            </div>
            <h4 className="home-quick-access-title">{t('home.shortcuts.clients')}</h4>
            <p className="home-quick-access-desc">{t('home.shortcuts.clientsDesc')}</p>
            <div className="home-quick-access-footer">
              <span className="home-quick-access-badge-green">3 {t('home.shortcuts.new')}</span>
            </div>
          </div>

          {/* Card 5 - Suppliers */}
          <div 
            onClick={() => onNavigate('suppliers')}
            className="group home-quick-access-card"
          >
            <div className="home-quick-access-icon-wrapper-emerald">
              <span className="home-quick-access-icon-emerald">local_shipping</span>
            </div>
            <h4 className="home-quick-access-title">{t('home.shortcuts.suppliers')}</h4>
            <p className="home-quick-access-desc">{t('home.shortcuts.suppliersDesc')}</p>
            <div className="home-quick-access-footer">
              <span className="home-quick-access-badge-gray">{t('home.shortcuts.updated')}</span>
            </div>
          </div>

        </div>

        {/* KPI Shortcuts - New Section */}
        <div className="home-kpi-grid">
          {[
            { 
              id: 'kpi-billing', 
              label: t('nav.kpiBilling'), 
              icon: 'receipt_long', 
              colorClass: 'home-kpi-icon-wrapper-blue',
              externalLink: 'https://lookerstudio.google.com/reporting/bbf296ef-6028-48d7-9339-cf9677261ae0/page/k1QTF'
            },
            { 
              id: 'kpi-collections', 
              label: t('nav.kpiCollections'), 
              icon: 'savings', 
              colorClass: 'home-kpi-icon-wrapper-green',
              externalLink: 'https://lookerstudio.google.com/reporting/bbf296ef-6028-48d7-9339-cf9677261ae0/page/p_hlo7ittzud'
            },
            { 
              id: 'kpi-expenses', 
              label: t('nav.kpiExpenses'), 
              icon: 'credit_card', 
              colorClass: 'home-kpi-icon-wrapper-purple',
              externalLink: 'https://lookerstudio.google.com/reporting/bbf296ef-6028-48d7-9339-cf9677261ae0/page/p_dxkespv0ud'
            },
            { 
              id: 'kpi-financials', 
              label: t('nav.kpiFinancials'), 
              icon: 'trending_up', 
              colorClass: 'home-kpi-icon-wrapper-orange',
              externalLink: 'https://lookerstudio.google.com/reporting/bbf296ef-6028-48d7-9339-cf9677261ae0/page/p_jz1sybk8ud'
            },
          ].map((kpi) => (
            <button 
              key={kpi.id}
              onClick={() => {
                if (kpi.externalLink) {
                  window.open(kpi.externalLink, '_blank');
                } else {
                  // No action for removed analytics module internal links
                }
              }}
              className="home-kpi-card"
            >
              <div className={kpi.colorClass}>
                <span className="home-kpi-icon">{kpi.icon}</span>
              </div>
              <span className="home-kpi-label">{kpi.label}</span>
              <span className="home-kpi-arrow">
                {kpi.externalLink ? 'open_in_new' : 'chevron_right'}
              </span>
            </button>
          ))}
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
                  <div className={`home-summary-indicator ${
                    item.status === 'success' ? 'home-summary-indicator-success' : 
                    item.status === 'warning' ? 'home-summary-indicator-warning' : 
                    'home-summary-indicator-neutral'
                  }`}></div>
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
              <span className="home-alert-icon-error">error</span>
              <div>
                <p className="home-alert-title-error">{t('home.alerts.syncError')}</p>
                <p className="home-alert-desc-error">{t('home.alerts.syncErrorDesc')} - {t('home.alerts.time.h2')}</p>
              </div>
            </div>
            <div className="home-alert-item-warning">
              <span className="home-alert-icon-warning">warning</span>
              <div>
                <p className="home-alert-title-warning">{t('home.alerts.pendingSign')}</p>
                <p className="home-alert-desc-warning">{t('home.alerts.pendingSignDesc')}</p>
              </div>
            </div>
            <div className="home-alert-item-info">
              <span className="home-alert-icon-info">info</span>
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
