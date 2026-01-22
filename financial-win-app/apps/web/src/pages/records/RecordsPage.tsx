import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useFinancial } from '../../contexts/FinancialContext';
import { RegistrosTable } from '../../features/finance/components/RegistrosTable';
import { PageHeader, type PageHeaderAction } from '../../components/layout';
import { FilterPanel, type FilterValues } from '../../features/finance/components/FilterPanel';

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
  const { records } = useFinancial();
  const [busqueda, setBusqueda] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    dateRange: { from: '', to: '' },
    categories: [],
    status: [],
    erpStatus: [],
    documentType: [],
    amountRange: { min: null, max: null },
  });

  // Mostrar el total de todos los registros (invoices, tickets, staff)
  const totalRegistros = records.length;

  const headerActions: PageHeaderAction[] = [
    {
      icon: 'filter_list',
      label: 'Filtros',
      onClick: () => setIsFilterPanelOpen(true),
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

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  return (
    <div className="layout-page-container">
      <PageHeader
        title="Registros"
        showSearch
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        searchPlaceholder="Buscar registro..."
        actions={headerActions}
      />

      <div className="studio-card">
        <div className="mt-8">
          <RecordsSummary total={totalRegistros} />
        </div>

        <div className="mt-4 px-2">
          <p className="text-sm text-[#525252] dark:text-[#a3a3a3]">
            {totalRegistros === 0 
              ? 'No hay registros cargados desde la base de datos local'
              : `${totalRegistros} ${totalRegistros === 1 ? 'registro cargado' : 'registros cargados'} desde la base de datos local`}
          </p>
        </div>

        <div className="mt-8">
          <RegistrosTable searchTerm={busqueda} filters={filters} />
        </div>
      </div>

      <FilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        onFilterChange={handleFilterChange}
        initialFilters={filters}
        type="registros"
      />
    </div>
  );
};
