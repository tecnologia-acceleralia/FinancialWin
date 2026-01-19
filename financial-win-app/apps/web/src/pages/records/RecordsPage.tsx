import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { RegistrosTable } from '../../features/finance/components/RegistrosTable';
import { PageHeader, type PageHeaderAction } from '../../components/common/PageHeader';

// Acciones del header definidas fuera del componente para mejor legibilidad
const HEADER_ACTIONS: PageHeaderAction[] = [
  {
    icon: 'filter_list',
    label: 'Filtros',
    onClick: () => console.log('Mostrar filtros'),
    variant: 'default',
  },
  {
    icon: 'download',
    label: 'Descargar',
    onClick: () => console.log('Descargar registros'),
    variant: 'default',
  },
  {
    icon: 'settings',
    label: 'Configuración',
    onClick: () => console.log('Configuración'),
    variant: 'default',
  },
];

// Subcomponente: Resumen de registros (KPI)
interface RecordsSummaryProps {
  total: number;
}

const RecordsSummary: React.FC<RecordsSummaryProps> = ({ total }) => {
  const formattedTotal = new Intl.NumberFormat('es-ES').format(total);

  return (
    <div className="studio-kpi-card">
      <div className="kpi-content">
        <div>
          <p className="kpi-label">
            Total de Registros
          </p>
          <h3 className="kpi-value">
            {formattedTotal}
          </h3>
        </div>
        <div className="home-kpi-icon-wrapper-blue">
          <span className="material-symbols-outlined home-kpi-icon">
            table_view
          </span>
        </div>
      </div>
    </div>
  );
};

export const RecordsPage: React.FC = () => {
  const { t } = useLanguage();
  const [busqueda, setBusqueda] = useState('');

  return (
    <div className="layout-page-container">
      <PageHeader
        title="Registros"
        showSearch
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        searchPlaceholder="Buscar registro..."
        actions={HEADER_ACTIONS}
      />

      <div className="studio-card">
        <div className="mt-8">
          <RecordsSummary total={1234} />
        </div>

        <div className="mt-8">
          <RegistrosTable />
        </div>
      </div>
    </div>
  );
};
