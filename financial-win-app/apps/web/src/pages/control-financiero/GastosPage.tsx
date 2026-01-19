import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { GastosTable } from '../../features/finance/components/GastosTable';
import { PageHeader, type PageHeaderAction } from '../../components/common/PageHeader';

export const GastosPage: React.FC = () => {
  const { t } = useLanguage();
  const [busqueda, setBusqueda] = useState('');

  const headerActions: PageHeaderAction[] = [
    {
      icon: 'filter_list',
      label: 'Filtros',
      onClick: () => console.log('Mostrar filtros'),
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
        <div className="studio-card">
          <div className="mt-8">
            <GastosTable searchTerm={busqueda} />
          </div>
        </div>
      </div>
    </div>
  );
};
