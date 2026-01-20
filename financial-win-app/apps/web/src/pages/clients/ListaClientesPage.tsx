import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EntityCard } from '@/features/entities/components/EntityCard';
import { PageHeader, type PageHeaderAction } from '../../components/layout';
import { EntityFilterPanel, type EntityFilterValues } from '@/features/entities/components/EntityFilterPanel';

interface Cliente {
  id: string;
  nombre: string;
  nif: string;
  tipo: 'Nacional' | 'Extranjero';
  estado: 'activo' | 'pendiente' | 'inactivo';
  saldoBancario: number;
  pagosPendientes: number;
}

const MOCK_CLIENTES: Cliente[] = [
  { id: '1', nombre: 'Empresa 1 S.L.', nif: 'B48079307', tipo: 'Nacional', estado: 'activo', saldoBancario: 12500.50, pagosPendientes: 3200.00 },
  { id: '2', nombre: 'Cliente 2 García', nif: '12345678A', tipo: 'Nacional', estado: 'pendiente', saldoBancario: 8500.75, pagosPendientes: 1500.00 },
  { id: '3', nombre: 'Empresa 3 Tech', nif: 'B98765432', tipo: 'Nacional', estado: 'activo', saldoBancario: 25400.00, pagosPendientes: 0.00 },
  { id: '4', nombre: 'Cliente 4 Pérez', nif: '87654321B', tipo: 'Nacional', estado: 'inactivo', saldoBancario: 0.00, pagosPendientes: 0.00 },
  { id: '5', nombre: 'Empresa 5 Global', nif: 'B11223344', tipo: 'Extranjero', estado: 'activo', saldoBancario: 18900.25, pagosPendientes: 4500.00 },
  { id: '6', nombre: 'Cliente 6 Martínez', nif: '22334455C', tipo: 'Nacional', estado: 'activo', saldoBancario: 6800.50, pagosPendientes: 1200.00 },
  { id: '7', nombre: 'Empresa 7 Solutions', nif: 'B55667788', tipo: 'Nacional', estado: 'pendiente', saldoBancario: 15400.00, pagosPendientes: 2800.00 },
  { id: '8', nombre: 'Cliente 8 López', nif: '66778899D', tipo: 'Nacional', estado: 'activo', saldoBancario: 9200.75, pagosPendientes: 0.00 },
  { id: '9', nombre: 'Empresa 9 Innovación', nif: 'B99887766', tipo: 'Nacional', estado: 'activo', saldoBancario: 31200.50, pagosPendientes: 5600.00 },
  { id: '10', nombre: 'Cliente 10 Sánchez', nif: '88776655E', tipo: 'Nacional', estado: 'inactivo', saldoBancario: 0.00, pagosPendientes: 0.00 },
];

const obtenerIniciales = (nombre: string): string => {
  const palabras = nombre.split(' ');
  if (palabras.length >= 2) {
    return (palabras[0][0] + palabras[1][0]).toUpperCase();
  }
  return nombre.substring(0, 2).toUpperCase();
};

const formatearMoneda = (cantidad: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(cantidad);
};

export const ListaClientesPage: React.FC = () => {
  const navigate = useNavigate();
  const [paginaActual, setPaginaActual] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [vistaGrid, setVistaGrid] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<EntityFilterValues>({
    status: [],
    types: [],
    balanceRange: { min: null, max: null },
    paymentsRange: { min: null, max: null },
  });
  const resultadosPorPagina = 8;

  // Filtrar clientes por búsqueda y filtros avanzados
  const clientesFiltrados = useMemo(() => {
    let resultado = MOCK_CLIENTES;

    // Filtro por búsqueda de texto
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase().trim();
      resultado = resultado.filter(
        (cliente) =>
          cliente.nombre.toLowerCase().includes(busquedaLower) ||
          cliente.nif.toLowerCase().includes(busquedaLower)
      );
    }

    // Filtro por estados
    if (filters.status.length > 0) {
      resultado = resultado.filter((cliente) =>
        filters.status.includes(cliente.estado)
      );
    }

    // Filtro por tipos
    if (filters.types.length > 0) {
      resultado = resultado.filter((cliente) =>
        filters.types.includes(cliente.tipo)
      );
    }

    // Filtro por rango de saldo bancario
    if (filters.balanceRange.min !== null) {
      resultado = resultado.filter(
        (cliente) => cliente.saldoBancario >= filters.balanceRange.min!
      );
    }
    if (filters.balanceRange.max !== null) {
      resultado = resultado.filter(
        (cliente) => cliente.saldoBancario <= filters.balanceRange.max!
      );
    }

    // Filtro por rango de pagos pendientes
    if (filters.paymentsRange.min !== null) {
      resultado = resultado.filter(
        (cliente) => cliente.pagosPendientes >= filters.paymentsRange.min!
      );
    }
    if (filters.paymentsRange.max !== null) {
      resultado = resultado.filter(
        (cliente) => cliente.pagosPendientes <= filters.paymentsRange.max!
      );
    }

    return resultado;
  }, [busqueda, filters]);

  const totalResultados = clientesFiltrados.length;
  const totalPaginas = Math.ceil(totalResultados / resultadosPorPagina);
  
  const inicio = (paginaActual - 1) * resultadosPorPagina;
  const fin = inicio + resultadosPorPagina;
  const clientesPaginados = clientesFiltrados.slice(inicio, fin);

  // Resetear página cuando cambia la búsqueda o filtros
  React.useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filters]);

  const handleNuevoCliente = () => {
    navigate('/clientes/nuevo');
  };

  const handleFiltro = () => {
    setIsFilterOpen(true);
  };

  const handleFilterChange = (newFilters: EntityFilterValues) => {
    setFilters(newFilters);
  };

  const handleVista = () => {
    setVistaGrid(!vistaGrid);
  };

  const handleDescarga = () => {
    // TODO: Implementar descarga
    console.log('Descargar lista');
  };

  const handleConfiguracion = () => {
    // TODO: Implementar configuración
    console.log('Configuración');
  };

  const handleVerFicha = (clienteId: string) => {
    navigate(`/cliente/detalle/${clienteId}`);
  };

  const handlePaginaAnterior = () => {
    if (paginaActual > 1) {
      setPaginaActual(paginaActual - 1);
    }
  };

  const handlePaginaSiguiente = () => {
    if (paginaActual < totalPaginas) {
      setPaginaActual(paginaActual + 1);
    }
  };

  const handleIrAPagina = (pagina: number) => {
    setPaginaActual(pagina);
  };

  // Definir acciones para el PageHeader
  const headerActions: PageHeaderAction[] = [
    {
      icon: 'filter_list',
      label: 'Filtros',
      onClick: handleFiltro,
      variant: 'default',
    },
    {
      icon: vistaGrid ? 'format_list_bulleted' : 'grid_view',
      label: vistaGrid ? 'Vista lista' : 'Vista grid',
      onClick: handleVista,
      variant: 'default',
    },
    {
      icon: 'download',
      label: 'Descargar',
      onClick: handleDescarga,
      variant: 'default',
    },
    {
      icon: 'settings',
      label: 'Configuración',
      onClick: handleConfiguracion,
      variant: 'default',
    },
    {
      icon: 'add',
      label: 'Nuevo cliente',
      onClick: handleNuevoCliente,
      variant: 'primary',
    },
  ];

  return (
    <div className="clients-list-container">
      <PageHeader
        title="Lista de Clientes"
        showBackButton={false}
        showSearch={true}
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        searchPlaceholder="Buscar cliente (Nombre, CIF)..."
        actions={headerActions}
      />

      {/* Grid de clientes */}
      <div className="clients-grid">
        {clientesPaginados.map((cliente) => (
          <EntityCard
            key={cliente.id}
            name={cliente.nombre}
            initials={obtenerIniciales(cliente.nombre)}
            nif={cliente.nif}
            type={cliente.tipo}
            status={cliente.estado}
            account={formatearMoneda(cliente.saldoBancario)}
            balance={formatearMoneda(cliente.pagosPendientes)}
            onDetailClick={() => handleVerFicha(cliente.id)}
          />
        ))}
      </div>

      {/* Paginación */}
      <div className="pagination-container">
        <div className="pagination-info">
          Mostrando {inicio + 1} a {Math.min(fin, totalResultados)} de {totalResultados} resultados
        </div>
        <div className="pagination-controls">
          <button
            type="button"
            onClick={handlePaginaAnterior}
            disabled={paginaActual === 1}
            className="pagination-button"
            aria-label="Página anterior"
          >
            <span className="material-symbols-outlined pagination-button-icon">
              chevron_left
            </span>
          </button>

          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => (
            <button
              key={pagina}
              type="button"
              onClick={() => handleIrAPagina(pagina)}
              className={
                pagina === paginaActual
                  ? 'pagination-button-active'
                  : 'pagination-button'
              }
            >
              {pagina}
            </button>
          ))}

          <button
            type="button"
            onClick={handlePaginaSiguiente}
            disabled={paginaActual === totalPaginas}
            className="pagination-button"
            aria-label="Página siguiente"
          >
            <span className="material-symbols-outlined pagination-button-icon">
              chevron_right
            </span>
          </button>
        </div>
      </div>

      <EntityFilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onFilterChange={handleFilterChange}
        initialFilters={filters}
        availableStatus={['activo', 'pendiente', 'inactivo']}
        availableTypes={['Nacional', 'Extranjero']}
        entityType="clientes"
      />
    </div>
  );
};
