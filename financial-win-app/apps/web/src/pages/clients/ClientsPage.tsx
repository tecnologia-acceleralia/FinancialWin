import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { PageHeader, type PageHeaderAction } from '../../components/layout';

export const ClientsPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleNuevoCliente = () => {
    navigate('/clientes/nuevo');
  };

  const headerActions: PageHeaderAction[] = [
    {
      icon: 'add',
      label: 'Nuevo Cliente',
      onClick: handleNuevoCliente,
      variant: 'primary',
    },
  ];

  return (
    <div className="layout-page-container">
      <PageHeader
        title="Clientes"
        actions={headerActions}
      />
      <div className="studio-container">
        <div className="studio-card">
          <div className="clients-stats-grid">
            <div className="studio-kpi-card">
              <div className="stat-header">
                <div>
                  <p className="stat-label">
                    Total Clientes
                  </p>
                  <h3 className="stat-value">
                    156
                  </h3>
                </div>
                <div className="stat-icon-container-blue">
                  <span className="stat-icon-blue">
                    group
                  </span>
                </div>
              </div>
            </div>

            <div className="studio-kpi-card">
              <div className="stat-header">
                <div>
                  <p className="stat-label">
                    Nuevos
                  </p>
                  <h3 className="stat-value">
                    3
                  </h3>
                </div>
                <div className="stat-icon-container-green">
                  <span className="stat-icon-green">
                    person_add
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="clients-page-description">
            <p>
              Esta página está en desarrollo. La funcionalidad completa se implementará en la siguiente fase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
