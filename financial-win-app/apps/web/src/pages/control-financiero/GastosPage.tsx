import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useFinancial } from '../../contexts/FinancialContext';
import { GastosTable } from '../../features/finance/components/GastosTable';
import { PageHeader, type PageHeaderAction } from '../../components/layout';
import { FilterPanel, type FilterValues } from '../../features/finance/components/FilterPanel';
import { StatCard } from '../../components/common';

export const GastosPage: React.FC = () => {
  const { t } = useLanguage();
  const { expenses } = useFinancial();
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
    const validExpenses = expenses.filter(
      (expense) => expense.data.supplier && expense.data.total
    );

    const totalAcumulado = validExpenses.reduce((sum, expense) => {
      const total = parseFloat(expense.data.total?.toString() || '0');
      return sum + (isNaN(total) ? 0 : total);
    }, 0);

    const pendiente = validExpenses
      .filter((expense) => expense.paymentStatus === 'Pendiente')
      .reduce((sum, expense) => {
        const total = parseFloat(expense.data.total?.toString() || '0');
        return sum + (isNaN(total) ? 0 : total);
      }, 0);

    const numeroOperaciones = validExpenses.length;

    return {
      totalAcumulado,
      pendiente,
      numeroOperaciones,
    };
  }, [expenses]);

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
      onClick: () => console.log('Descargar gastos'),
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
        title="Gastos"
        showSearch={true}
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        searchPlaceholder="Buscar gasto (proveedor, departamento, tipo)..."
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
            <GastosTable searchTerm={busqueda} filters={filters} />
          </div>
        </div>
      </div>

      <FilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        onFilterChange={handleFilterChange}
        initialFilters={filters}
        type="gastos"
      />
    </div>
  );
};
