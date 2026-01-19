import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { IngresosTable } from '../../features/finance/components/IngresosTable';
import { PageHeader, type PageHeaderAction } from '../../components/common/PageHeader';

export const IngresosPage: React.FC = () => {
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
        <div className="studio-card">
          <div className="mt-8">
            <IngresosTable searchTerm={busqueda} />
          </div>
        </div>
      </div>
    </div>
  );
};
