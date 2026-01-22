import React from 'react';
import { ViewState } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui';
import { PageHeader, type PageHeaderAction } from '../../components/layout';

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
      'billing': '/control-financiero',
      'clients': '/clients',
      'suppliers': '/proveedores',
      'documents': '/documents',
      'upload-invoice': '/upload-invoice',
      'tickets': '/tickets',
      'subscriptions': '/subscriptions',
      'gastos': '/gastos',
      'ingresos': '/ingresos',
    };
    
    const route = routeMap[view] || '/';
    navigate(route);
  };

  const headerActions: PageHeaderAction[] = [
    {
      icon: 'settings',
      label: 'Configuración',
      onClick: () => console.log('Configuración'),
      variant: 'default',
    },
  ];

  return (
    <div className="home-container">
      <PageHeader
        title="Dashboard"
        actions={headerActions}
      />
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
          <Card
            title={t('home.shortcuts.documents')}
            subtitle={t('home.shortcuts.documentsDesc')}
            icon="folder_open"
            iconColor="amber"
            badge={`15 ${t('home.shortcuts.updated')}`}
            badgeColor="gray"
            onClick={() => handleNavigate('documents')}
          />
          <Card
            title={t('home.shortcuts.records')}
            subtitle={t('home.shortcuts.recordsDesc')}
            icon="table_view"
            iconColor="cyan"
            badge={`23 ${t('home.shortcuts.monthly')}`}
            badgeColor="gray"
            onClick={() => handleNavigate('records')}
          />
          <Card
            title={t('home.shortcuts.billing')}
            subtitle={t('home.shortcuts.billingDesc')}
            icon="receipt_long"
            iconColor="purple"
            badge={`12 ${t('home.shortcuts.pending')}`}
            badgeColor="red"
            onClick={() => handleNavigate('billing')}
          />
          <Card
            title={t('home.shortcuts.clients')}
            subtitle={t('home.shortcuts.clientsDesc')}
            icon="group"
            iconColor="blue"
            badge={`3 ${t('home.shortcuts.new')}`}
            badgeColor="green"
            onClick={() => handleNavigate('clients')}
          />
          <Card
            title={t('home.shortcuts.suppliers')}
            subtitle={t('home.shortcuts.suppliersDesc')}
            icon="local_shipping"
            iconColor="emerald"
            badge={t('home.shortcuts.updated')}
            badgeColor="gray"
            onClick={() => handleNavigate('suppliers')}
          />
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
