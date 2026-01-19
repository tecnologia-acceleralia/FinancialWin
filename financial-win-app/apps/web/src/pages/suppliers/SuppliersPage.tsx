import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { PageHeader, type PageHeaderAction } from '../../components/common/PageHeader';

// Acciones del header definidas fuera del componente para mejor legibilidad
const createHeaderActions = (onNuevoProveedor: () => void): PageHeaderAction[] => [
  {
    icon: 'add',
    label: 'Nuevo Proveedor',
    onClick: onNuevoProveedor,
    variant: 'primary',
  },
];

// Subcomponente: Tarjeta de estadística de proveedor
interface SupplierStatCardProps {
  label: string;
  value: number | string;
  icon: string;
  variant: 'emerald' | 'green' | 'blue' | 'purple' | 'orange';
}

const SupplierStatCard: React.FC<SupplierStatCardProps> = ({ label, value, icon, variant }) => {
  const formattedValue = typeof value === 'number' 
    ? new Intl.NumberFormat('es-ES').format(value)
    : value;

  const iconWrapperClass = `home-kpi-icon-wrapper-${variant}`;

  return (
    <div className="studio-kpi-card">
      <div className="kpi-content">
        <div>
          <p className="kpi-label">
            {label}
          </p>
          <h3 className="kpi-value">
            {formattedValue}
          </h3>
        </div>
        <div className={iconWrapperClass}>
          <span className="material-symbols-outlined home-kpi-icon">
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
};

export const SuppliersPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleNuevoProveedor = () => {
    navigate('/proveedores/nuevo');
  };

  const headerActions = createHeaderActions(handleNuevoProveedor);

  return (
    <div className="layout-page-container">
      <PageHeader
        title="Proveedores"
        actions={headerActions}
      />

      <div className="studio-card">
        <div className="proveedores-stats-grid">
          <SupplierStatCard
            label="Total Proveedores"
            value={89}
            icon="local_shipping"
            variant="emerald"
          />

          <SupplierStatCard
            label="Activos"
            value={76}
            icon="check_circle"
            variant="green"
          />
        </div>

        <div className="development-notice">
          <p>
            Esta página está en desarrollo. La funcionalidad completa se implementará en la siguiente fase.
          </p>
        </div>
      </div>
    </div>
  );
};
