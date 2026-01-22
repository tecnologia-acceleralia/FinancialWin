import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useFinancial } from '../../contexts/FinancialContext';
import { IngresosTable } from '../../features/finance/components/IngresosTable';
import { PageHeader, type PageHeaderAction } from '../../components/layout';
import { FilterPanel, type FilterValues } from '../../features/finance/components/FilterPanel';
import { StatCard } from '../../components/common';

export const IngresosPage: React.FC = () => {
  const { t } = useLanguage();
  const { income } = useFinancial();
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

  // Calcular KPIs (solo para tarjetas pequeñas)
  const kpis = useMemo(() => {
    const validIncome = income.filter(
      (record) => record.data.supplier && record.data.total
    );

    const totalAcumulado = validIncome.reduce((sum, record) => {
      const total = parseFloat(record.data.total?.toString() || '0');
      return sum + (isNaN(total) ? 0 : total);
    }, 0);

    const pendiente = validIncome
      .filter((record) => record.paymentStatus === 'Pendiente')
      .reduce((sum, record) => {
        const total = parseFloat(record.data.total?.toString() || '0');
        return sum + (isNaN(total) ? 0 : total);
      }, 0);

    const numeroOperaciones = validIncome.length;

    return {
      totalAcumulado,
      pendiente,
      numeroOperaciones,
    };
  }, [income]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

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
      onClick: () => console.log('Descargar ingresos'),
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
        title="Ingresos"
        showSearch={true}
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        searchPlaceholder="Buscar ingreso (cliente, factura, estado)..."
        actions={headerActions}
      />
      <div className="studio-container">
        {/* Tarjetas de Resumen Compactas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Total Acumulado"
            value={formatCurrency(kpis.totalAcumulado)}
            icon="account_balance"
            color="blue"
            compact
          />
          <StatCard
            title="Pendiente"
            value={formatCurrency(kpis.pendiente)}
            icon="pending"
            color="orange"
            compact
          />
          <StatCard
            title="Operaciones"
            value={kpis.numeroOperaciones}
            icon="receipt_long"
            color="purple"
            compact
          />
        </div>

        {/* Tabla - Protagonista absoluta */}
        <div className="studio-card">
          <div className="mt-8">
            <IngresosTable searchTerm={busqueda} filters={filters} />
          </div>
        </div>
      </div>

      <FilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        onFilterChange={handleFilterChange}
        initialFilters={filters}
        type="ingresos"
      />
    </div>
  );
};
