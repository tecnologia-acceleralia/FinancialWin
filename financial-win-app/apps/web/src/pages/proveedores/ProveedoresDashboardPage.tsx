import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader, type PageHeaderAction } from '../../components/common/PageHeader';

interface StatCard {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

interface Alert {
  id: string;
  title: string;
  description: string;
  type: 'warning' | 'error' | 'info';
}

interface Activity {
  id: string;
  type: 'register' | 'invoice' | 'contract';
  title: string;
  description: string;
  date: string;
  icon: string;
}

const STATS: StatCard[] = [
  {
    title: 'Proveedores Activos',
    value: '42',
    subtitle: 'Total registrados',
    icon: 'groups',
    trend: {
      value: '+2 este mes',
      isPositive: true,
    },
  },
  {
    title: 'Nuevos (Mes)',
    value: '3',
    subtitle: 'Verificación pendiente',
    icon: 'person_add',
  },
  {
    title: 'Facturas Ptes',
    value: '15',
    subtitle: '€12.4k total',
    icon: 'receipt_long',
  },
  {
    title: 'Incidencias',
    value: '1',
    subtitle: 'En resolución',
    icon: 'warning',
  },
];

const ALERTS: Alert[] = [
  {
    id: '1',
    title: 'Certificado Tributario Caducado',
    description: 'El certificado de 3 proveedores ha caducado. Renovación requerida.',
    type: 'warning',
  },
  {
    id: '2',
    title: 'Contrato próximo a vencer',
    description: '2 contratos vencen en los próximos 30 días.',
    type: 'info',
  },
];

const ACTIVITIES: Activity[] = [
  {
    id: '1',
    type: 'register',
    title: 'Nuevo proveedor registrado',
    description: 'Proveedor 1 S.L. ha sido agregado al sistema',
    date: 'Hace 2 horas',
    icon: 'person_add',
  },
  {
    id: '2',
    type: 'invoice',
    title: 'Factura aprobada',
    description: 'Factura #1234 de Proveedor 2 García aprobada',
    date: 'Hace 5 horas',
    icon: 'check_circle',
  },
  {
    id: '3',
    type: 'contract',
    title: 'Contrato vencido',
    description: 'Contrato con Proveedor 3 Tech ha vencido',
    date: 'Ayer',
    icon: 'event_busy',
  },
];

export const ProveedoresDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  const handleNuevoProveedor = () => {
    navigate('/proveedores/nuevo');
  };

  const headerActions: PageHeaderAction[] = [
    {
      icon: 'add',
      label: 'Nuevo Proveedor',
      onClick: handleNuevoProveedor,
      variant: 'primary',
    },
  ];

  return (
    <div className="proveedores-dashboard-container">
      <PageHeader
        title="Proveedores"
        showBackButton={true}
        onBack={handleBack}
        actions={headerActions}
      />

      {/* Grid de Stats */}
      <div className="proveedores-stats-grid">
        {STATS.map((stat) => (
          <div key={stat.title} className="studio-kpi-card">
            <div className="proveedores-stat-content">
              <div className="proveedores-stat-header">
                <div className="proveedores-stat-icon-wrapper">
                  <span className="material-symbols-outlined proveedores-stat-icon">
                    {stat.icon}
                  </span>
                </div>
                <div className="proveedores-stat-info">
                  <p className="proveedores-stat-label">{stat.title}</p>
                  <p className="proveedores-stat-value">{stat.value}</p>
                </div>
              </div>
              <div className="proveedores-stat-footer">
                <p className="proveedores-stat-subtitle">{stat.subtitle}</p>
                {stat.trend && (
                  <span
                    className={`proveedores-stat-trend ${
                      stat.trend.isPositive ? 'proveedores-stat-trend-positive' : 'proveedores-stat-trend-negative'
                    }`}
                  >
                    {stat.trend.value}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Grid Principal: Alertas y Actividad */}
      <div className="proveedores-main-grid">
        {/* Sección Alertas Prioritarias */}
        <div className="proveedores-alerts-section">
          <div className="studio-card">
            <div className="proveedores-section-header">
              <h2 className="proveedores-section-title">Alertas Prioritarias</h2>
              <span className="material-symbols-outlined proveedores-section-icon">
                notifications_active
              </span>
            </div>
            <div className="proveedores-alerts-list">
              {ALERTS.map((alert) => (
                <div
                  key={alert.id}
                  className={`proveedores-alert-item proveedores-alert-item-${alert.type}`}
                >
                  <span className="material-symbols-outlined proveedores-alert-icon">
                    {alert.type === 'warning' ? 'warning' : alert.type === 'error' ? 'error' : 'info'}
                  </span>
                  <div className="proveedores-alert-content">
                    <p className="proveedores-alert-title">{alert.title}</p>
                    <p className="proveedores-alert-description">{alert.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sección Actividad Reciente */}
        <div className="proveedores-activity-section">
          <div className="studio-card">
            <div className="proveedores-section-header">
              <h2 className="proveedores-section-title">Actividad Reciente</h2>
              <span className="material-symbols-outlined proveedores-section-icon">
                history
              </span>
            </div>
            <div className="proveedores-activity-timeline">
              {ACTIVITIES.map((activity, index) => (
                <div key={activity.id} className="proveedores-activity-item">
                  <div className="proveedores-activity-line">
                    {index < ACTIVITIES.length - 1 && (
                      <div className="proveedores-activity-line-connector" />
                    )}
                    <div className="proveedores-activity-icon-wrapper">
                      <span className="material-symbols-outlined proveedores-activity-icon">
                        {activity.icon}
                      </span>
                    </div>
                  </div>
                  <div className="proveedores-activity-content">
                    <p className="proveedores-activity-title">{activity.title}</p>
                    <p className="proveedores-activity-description">{activity.description}</p>
                    <p className="proveedores-activity-date">{activity.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Accesos Directos */}
      <div className="proveedores-shortcuts-section">
        <div className="proveedores-shortcuts-grid">
          <Link
            to="/proveedores/listado"
            className="proveedores-shortcut-card"
          >
            <div className="proveedores-shortcut-icon-wrapper">
              <span className="material-symbols-outlined proveedores-shortcut-icon">
                list
              </span>
            </div>
            <h3 className="proveedores-shortcut-title">Ver Lista</h3>
            <p className="proveedores-shortcut-description">
              Accede a la lista completa de proveedores
            </p>
          </Link>
          <button
            type="button"
            onClick={handleNuevoProveedor}
            className="proveedores-shortcut-card"
          >
            <div className="proveedores-shortcut-icon-wrapper">
              <span className="material-symbols-outlined proveedores-shortcut-icon">
                add_circle
              </span>
            </div>
            <h3 className="proveedores-shortcut-title">Nuevo Proveedor</h3>
            <p className="proveedores-shortcut-description">
              Registra un nuevo proveedor en el sistema
            </p>
          </button>
        </div>
      </div>

      {/* Sugerencia IA */}
      <div className="proveedores-ai-suggestion">
        <div className="proveedores-ai-suggestion-content">
          <div className="proveedores-ai-suggestion-icon-wrapper">
            <span className="material-symbols-outlined proveedores-ai-suggestion-icon">
              auto_awesome
            </span>
          </div>
          <div className="proveedores-ai-suggestion-text">
            <h3 className="proveedores-ai-suggestion-title">Sugerencia de IA</h3>
            <p className="proveedores-ai-suggestion-description">
              Considera renegociar los términos de pago con tus principales proveedores para mejorar el flujo de caja.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
