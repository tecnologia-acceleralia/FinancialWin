import React, { useMemo } from 'react';
import { ViewState } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui';
import { PageHeader } from '../../components/layout';
import { useFinancial } from '../../contexts/FinancialContext';
import { useFinancialStats } from '../../hooks/useFinancialStats';
import { formatearMoneda } from '../../utils/formatUtils';
import { EmptyState, Popover } from '../../components/common';
import { Cliente } from '../../features/entities/types';
import { Proveedor } from '../../features/entities/types';
import { getCurrentQuarterInfo } from '../../utils/quarterUtils';

interface HomePageProps {
  onNavigate?: (view: ViewState, subAction?: string) => void;
}

const STORAGE_KEY_CLIENTS = 'zaffra_clients';
const STORAGE_KEY_SUPPLIERS = 'zaffra_suppliers';

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { records } = useFinancial();
  const { kpis, incomeInvoices } = useFinancialStats();

  // Obtener información del trimestre actual
  const quarterInfo = useMemo(() => getCurrentQuarterInfo(), []);

  // Obtener datos reales de clientes
  const clientes = useMemo(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CLIENTS);
      if (!stored) return [];
      const data: Cliente[] = JSON.parse(stored);
      return data.filter((c) => c.is_active !== false);
    } catch (error) {
      console.error('Error al cargar clientes del localStorage:', error);
      return [];
    }
  }, []);

  // Obtener datos reales de proveedores
  const proveedores = useMemo(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SUPPLIERS);
      if (!stored) return [];
      const data: Proveedor[] = JSON.parse(stored);
      return data.filter((p) => p.is_active !== false);
    } catch (error) {
      console.error('Error al cargar proveedores del localStorage:', error);
      return [];
    }
  }, []);

  // Calcular total de deuda de clientes
  const totalDeudaClientes = useMemo(() => {
    return clientes.reduce((total, cliente) => {
      const pagosPendientes = (cliente as any).pagosPendientes ?? 0;
      const valor = typeof pagosPendientes === 'number' ? pagosPendientes : 0;
      return total + (isNaN(valor) ? 0 : valor);
    }, 0);
  }, [clientes]);

  // Contar documentos pendientes de procesar (facturas sin PDF asociado)
  const documentosPendientes = useMemo(() => {
    return records.filter((record) => {
      // Documentos pendientes son aquellos que no tienen fileUrl (sin PDF asociado)
      return !record.fileUrl || record.fileUrl === '';
    }).length;
  }, [records]);

  // Calcular facturas próximas a vencer (ingresos no pagados que vencen en los próximos 5 días)
  const facturasProximasAVencer = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filtrar facturas de ingresos que no estén pagadas
    const unpaidIncomes = incomeInvoices.filter(
      (invoice) => invoice.payment_state !== 'paid'
    );
    
    // Filtrar facturas que vencen en los próximos 5 días
    const upcomingInvoices = unpaidIncomes.filter((invoice) => {
      // Usar invoice_date_due si está disponible, sino usar invoice_date + 30 días como fallback
      const dueDateStr = invoice.invoice_date_due || invoice.invoice_date;
      if (!dueDateStr) return false;
      
      try {
        const dueDate = new Date(dueDateStr);
        dueDate.setHours(0, 0, 0, 0);
        
        if (isNaN(dueDate.getTime())) {
          // Fallback: si no hay fecha de vencimiento, usar invoice_date + 30 días
          if (!invoice.invoice_date) return false;
          const invoiceDate = new Date(invoice.invoice_date);
          invoiceDate.setHours(0, 0, 0, 0);
          invoiceDate.setDate(invoiceDate.getDate() + 30);
          const diffTime = invoiceDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 5;
        }
        
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Incluir facturas que vencen entre hoy y los próximos 5 días
        return diffDays >= 0 && diffDays <= 5;
      } catch {
        return false;
      }
    });
    
    const count = upcomingInvoices.length;
    const totalAmount = upcomingInvoices.reduce(
      (sum, invoice) => sum + (invoice.amount_total || 0),
      0
    );
    
    return { count, totalAmount };
  }, [incomeInvoices]);

  // Verificar si hay datos para mostrar
  const hasData = records.length > 0 || clientes.length > 0 || proveedores.length > 0;

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
      'settings': '/settings',
    };
    
    const route = routeMap[view] || '/';
    navigate(route);
  };

  return (
    <div className="home-container">
      <PageHeader
        title="Dashboard"
      />
      {/* Hero Section - Rediseñada con dos botones de acción rápida */}
      <div className="home-hero-grid">
        <div className="brand-hero-card">
          <div className="home-hero-decoration-1"></div>
          <div className="home-hero-decoration-2"></div>
          
          <div className="home-hero-content">
            <h2 className="home-hero-title">{t('home.hero.greeting')}</h2>
            <p className="home-hero-text">
              {t('home.hero.status')}
            </p>
            <div className="home-hero-actions">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate('/documents');
                }}
                className="home-hero-button"
              >
                <span className="material-symbols-outlined home-hero-button-icon">psychology</span>
                <span>Subir Factura (IA)</span>
              </button>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNavigate('billing');
                }}
                className="home-hero-button"
              >
                <span className="material-symbols-outlined home-hero-button-icon">account_balance</span>
                <span>Ir a Control Financiero</span>
              </button>
            </div>
          </div>
        </div>

        {/* Next Due Card */}
        <div className="home-next-due-card">
          <div>
            <div className="home-next-due-label">
              <span className="home-next-due-badge">{t('home.nextDue.label')}</span>
              <Popover
                trigger={
                  <span className="material-symbols-outlined home-next-due-icon home-next-due-icon-button">
                    calendar_today
                  </span>
                }
                content={
                  <div>
                    <div className="quarter-popover-header">
                      <div className="quarter-popover-title">
                        {quarterInfo.nombreTrimestre}
                      </div>
                      <div className="quarter-popover-period">
                        {quarterInfo.rangoFechas}
                      </div>
                    </div>
                    <div className="quarter-popover-item">
                      <div className="quarter-popover-label">Fecha Límite</div>
                      <div className="quarter-popover-value">
                        Vence el {quarterInfo.fechaLimiteFormateada}
                      </div>
                    </div>
                    <div className="quarter-popover-item">
                      <div className="quarter-popover-label">Estado</div>
                      <div className="quarter-popover-value">
                        Cálculo provisional basado en facturas actuales
                      </div>
                    </div>
                  </div>
                }
              />
            </div>
            <h3 className="home-next-due-title">{t('home.nextDue.title')}</h3>
            <p 
              className={`home-next-due-time ${
                kpis.ivaTrimestral >= 0 
                  ? 'home-next-due-time-payable' 
                  : 'home-next-due-time-refundable'
              }`}
            >
              {formatearMoneda(kpis.ivaTrimestral || 0)}
            </p>
          </div>
          <div className="home-next-due-progress-container">
            <div className="home-next-due-progress-bar">
              <div 
                className={`home-next-due-progress-fill ${
                  kpis.ivaTrimestral >= 0 
                    ? 'home-next-due-progress-fill-payable' 
                    : 'home-next-due-progress-fill-refundable'
                }`}
                style={{ width: '100%' }}
              ></div>
            </div>
            <p className="home-next-due-progress-text">
              {kpis.ivaTrimestral >= 0 ? 'A pagar' : 'A devolver'}
            </p>
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
            badge={`Total: ${documentosPendientes}`}
            badgeColor="pink"
            onClick={() => handleNavigate('documents')}
          />
          <Card
            title={t('home.shortcuts.records')}
            subtitle={t('home.shortcuts.recordsDesc')}
            icon="table_view"
            iconColor="cyan"
            badge={`${records.length} ${t('home.shortcuts.monthly')}`}
            badgeColor="gray"
            onClick={() => handleNavigate('records')}
          />
          <Card
            title={t('home.shortcuts.billing')}
            subtitle={t('home.shortcuts.billingDesc')}
            icon="receipt_long"
            iconColor="purple"
            badge={`${records.filter(r => r.paymentStatus === 'Pendiente').length} ${t('home.shortcuts.pending')}`}
            badgeColor="red"
            onClick={() => handleNavigate('billing')}
          />
          <Card
            title={t('home.shortcuts.clients')}
            subtitle={t('home.shortcuts.clientsDesc')}
            icon="group"
            iconColor="blue"
            badge={`Total: ${clientes.length}`}
            badgeColor="pink"
            onClick={() => handleNavigate('clients')}
          />
          <Card
            title={t('home.shortcuts.suppliers')}
            subtitle={t('home.shortcuts.suppliersDesc')}
            icon="local_shipping"
            iconColor="emerald"
            badge={`Total: ${proveedores.length}`}
            badgeColor="pink"
            onClick={() => handleNavigate('suppliers')}
          />
        </div>
      </div>

      {/* Operational Summary & Alerts */}
      {hasData ? (
        <div className="home-summary-grid">
          {/* Status List */}
          <div className="home-summary-card">
            <h3 className="home-summary-title">{t('home.summary.title')}</h3>
            <div className="home-summary-list">
              {[
                { 
                  label: t('home.summary.income'), 
                  amount: formatearMoneda(kpis.totalIngresos), 
                  status: 'success' as const
                },
                { 
                  label: t('home.summary.expenses'), 
                  amount: formatearMoneda(kpis.totalGastos), 
                  status: 'neutral' as const
                },
                { 
                  label: t('home.summary.pending'), 
                  amount: formatearMoneda(kpis.cajaPendiente), 
                  status: 'warning' as const
                },
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
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts Panel - Alertas Inteligentes */}
          <div className="home-alerts-card">
            <div className="home-alerts-header">
              <h3 className="home-alerts-title">{t('home.alerts.title')}</h3>
            </div>
            <div className="home-alerts-list">
              {facturasProximasAVencer.count > 0 && (
                <div className="home-alert-item-danger">
                  <span className="material-symbols-outlined home-alert-icon-warning">event_upcoming</span>
                  <div>
                    <p className="home-alert-title-warning">Vencimientos próximos</p>
                    <p className="home-alert-desc-warning">
                      {facturasProximasAVencer.count} {facturasProximasAVencer.count === 1 ? 'factura' : 'facturas'} de clientes vencen esta semana (Total: {formatearMoneda(facturasProximasAVencer.totalAmount)})
                    </p>
                  </div>
                </div>
              )}
              {totalDeudaClientes > 0 && (
                <div className="home-alert-item-warning">
                  <span className="material-symbols-outlined home-alert-icon-warning">warning</span>
                  <div>
                    <p className="home-alert-title-warning">Cobro pendiente</p>
                    <p className="home-alert-desc-warning">
                      Total de deuda de clientes: {formatearMoneda(totalDeudaClientes)}
                    </p>
                  </div>
                </div>
              )}
              {facturasProximasAVencer.count === 0 && totalDeudaClientes === 0 && (
                <div className="home-alert-item-info">
                  <span className="material-symbols-outlined home-alert-icon-info">check_circle</span>
                  <div>
                    <p className="home-alert-title-info">Todo en orden</p>
                    <p className="home-alert-desc-info">No hay alertas pendientes</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="home-summary-grid">
          <div className="home-summary-card">
            <EmptyState
              title="No hay datos disponibles"
              description="Comienza subiendo facturas o agregando clientes y proveedores"
              icon="inbox"
            />
          </div>
        </div>
      )}
    </div>
  );
};
