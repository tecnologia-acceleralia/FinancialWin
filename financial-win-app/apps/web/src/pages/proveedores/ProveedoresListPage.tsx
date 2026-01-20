import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EntityCard } from '@/features/entities/components/EntityCard';
import { PageHeader, type PageHeaderAction } from '../../components/layout';
import { CategoriaProveedor } from '../../features/entities/types';
import { EntityFilterPanel, type EntityFilterValues } from '@/features/entities/components/EntityFilterPanel';

interface Proveedor {
  id: string;
  nombre: string;
  nif: string;
  tipo: CategoriaProveedor;
  estado: 'activo' | 'pendiente' | 'inactivo';
  saldoBancario: number;
  pagosPendientes: number;
  email?: string;
  phone?: string;
}

// Subcomponente: Paginación
interface PaginationProps {
  paginaActual: number;
  totalPaginas: number;
  inicio: number;
  fin: number;
  totalResultados: number;
  onPaginaAnterior: () => void;
  onPaginaSiguiente: () => void;
  onIrAPagina: (pagina: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  paginaActual,
  totalPaginas,
  inicio,
  fin,
  totalResultados,
  onPaginaAnterior,
  onPaginaSiguiente,
  onIrAPagina,
}) => {
  if (totalPaginas <= 1) return null;

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        Mostrando {inicio + 1} a {Math.min(fin, totalResultados)} de {totalResultados} resultados
      </div>
      <div className="pagination-controls">
        <button
          type="button"
          onClick={onPaginaAnterior}
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
            onClick={() => onIrAPagina(pagina)}
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
          onClick={onPaginaSiguiente}
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
  );
};

// Subcomponente: Estado vacío
const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
        search_off
      </span>
      <p className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
        No se encontraron proveedores
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-500">
        Intenta ajustar los términos de búsqueda
      </p>
    </div>
  );
};

export const ProveedoresListPage: React.FC = () => {
  const navigate = useNavigate();
  const [paginaActual, setPaginaActual] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<EntityFilterValues>({
    status: [],
    types: [],
    balanceRange: { min: null, max: null },
    paymentsRange: { min: null, max: null },
  });
  const resultadosPorPagina = 8;

  // Filtrar proveedores por búsqueda y filtros avanzados
  const proveedoresFiltrados = useMemo(() => {
    let resultado = MOCK_PROVEEDORES;

    // Filtro por búsqueda de texto
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase().trim();
      resultado = resultado.filter(
        (proveedor) =>
          proveedor.nombre.toLowerCase().includes(busquedaLower) ||
          proveedor.nif.toLowerCase().includes(busquedaLower)
      );
    }

    // Filtro por estados
    if (filters.status.length > 0) {
      resultado = resultado.filter((proveedor) =>
        filters.status.includes(proveedor.estado)
      );
    }

    // Filtro por tipos/categorías
    if (filters.types.length > 0) {
      resultado = resultado.filter((proveedor) =>
        filters.types.includes(proveedor.tipo)
      );
    }

    // Filtro por rango de saldo bancario
    if (filters.balanceRange.min !== null) {
      resultado = resultado.filter(
        (proveedor) => proveedor.saldoBancario >= filters.balanceRange.min!
      );
    }
    if (filters.balanceRange.max !== null) {
      resultado = resultado.filter(
        (proveedor) => proveedor.saldoBancario <= filters.balanceRange.max!
      );
    }

    // Filtro por rango de pagos pendientes
    if (filters.paymentsRange.min !== null) {
      resultado = resultado.filter(
        (proveedor) => proveedor.pagosPendientes >= filters.paymentsRange.min!
      );
    }
    if (filters.paymentsRange.max !== null) {
      resultado = resultado.filter(
        (proveedor) => proveedor.pagosPendientes <= filters.paymentsRange.max!
      );
    }

    return resultado;
  }, [busqueda, filters]);

  const totalResultados = proveedoresFiltrados.length;
  const totalPaginas = Math.ceil(totalResultados / resultadosPorPagina);

  const inicio = (paginaActual - 1) * resultadosPorPagina;
  const fin = inicio + resultadosPorPagina;
  const proveedoresPaginados = proveedoresFiltrados.slice(inicio, fin);

  // Resetear página cuando cambia la búsqueda o filtros
  React.useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filters]);

  const handleVolver = () => {
    navigate('/proveedores');
  };

  const handleNuevoProveedor = () => {
    navigate('/proveedores/nuevo');
  };

  const handleFiltro = () => {
    setIsFilterOpen(true);
  };

  const handleFilterChange = (newFilters: EntityFilterValues) => {
    setFilters(newFilters);
  };

  const handleVista = () => {
    // TODO: Implementar cambio de vista
    console.log('Cambiar vista');
  };

  const handleDescarga = () => {
    // TODO: Implementar descarga
    console.log('Descargar lista');
  };

  const handleConfiguracion = () => {
    // TODO: Implementar configuración
    console.log('Configuración');
  };

  const handleVerFicha = (proveedorId: string) => {
    navigate(`/proveedor/detalle/${proveedorId}`);
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
      icon: 'grid_view',
      label: 'Cambiar vista',
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
      label: 'Nuevo proveedor',
      onClick: handleNuevoProveedor,
      variant: 'primary',
    },
  ];

  return (
    <div className="clients-list-container">
      <PageHeader
        title="Lista de Proveedores"
        showBackButton
        onBack={handleVolver}
        showSearch
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        searchPlaceholder="Buscar proveedor (Nombre, CIF)..."
        actions={headerActions}
      />

      {proveedoresPaginados.length > 0 ? (
        <>
          <div className="clients-grid">
            {proveedoresPaginados.map((proveedor) => (
              <EntityCard
                key={proveedor.id}
                name={proveedor.nombre}
                initials={obtenerIniciales(proveedor.nombre)}
                nif={proveedor.nif}
                type={formatearTipo(proveedor.tipo)}
                status={proveedor.estado}
                account={formatearMoneda(proveedor.saldoBancario)}
                balance={formatearMoneda(proveedor.pagosPendientes)}
                email={proveedor.email}
                phone={proveedor.phone}
                isProvider
                onDetailClick={() => handleVerFicha(proveedor.id)}
              />
            ))}
          </div>

          <Pagination
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            inicio={inicio}
            fin={fin}
            totalResultados={totalResultados}
            onPaginaAnterior={handlePaginaAnterior}
            onPaginaSiguiente={handlePaginaSiguiente}
            onIrAPagina={handleIrAPagina}
          />
        </>
      ) : (
        <EmptyState />
      )}

      <EntityFilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onFilterChange={handleFilterChange}
        initialFilters={filters}
        availableStatus={['activo', 'pendiente', 'inactivo']}
        availableTypes={['Proveedor Externo', 'Staff Interno', 'Licencias']}
        entityType="proveedores"
      />
    </div>
  );
};

export default ProveedoresListPage;

// ============================================
// Funciones de formateo
// ============================================

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

const formatearTipo = (tipo: CategoriaProveedor): string => {
  const tipoMap: Record<CategoriaProveedor, string> = {
    'Proveedor Externo': 'Externo',
    'Staff Interno': 'Staff',
    'Licencias': 'Licencia',
  };
  return tipoMap[tipo] || tipo;
};

// ============================================
// Datos mock
// ============================================

const MOCK_PROVEEDORES: Proveedor[] = [
  { id: '1', nombre: 'Proveedor 1 S.L.', nif: 'B48079307', tipo: 'Proveedor Externo', estado: 'activo', saldoBancario: 12500.50, pagosPendientes: 3200.00, email: 'contacto@proveedor1.es', phone: '+34 912 345 678' },
  { id: '2', nombre: 'Proveedor 2 García', nif: '12345678A', tipo: 'Proveedor Externo', estado: 'pendiente', saldoBancario: 8500.75, pagosPendientes: 1500.00, email: 'info@proveedor2.com', phone: '+34 923 456 789' },
  { id: '3', nombre: 'Proveedor 3 Tech', nif: 'B98765432', tipo: 'Staff Interno', estado: 'activo', saldoBancario: 25400.00, pagosPendientes: 0.00, email: 'tech@proveedor3.es', phone: '+34 934 567 890' },
  { id: '4', nombre: 'Proveedor 4 Pérez', nif: '87654321B', tipo: 'Licencias', estado: 'inactivo', saldoBancario: 0.00, pagosPendientes: 0.00, email: 'ventas@proveedor4.com', phone: '+34 945 678 901' },
  { id: '5', nombre: 'Proveedor 5 Global', nif: 'B11223344', tipo: 'Proveedor Externo', estado: 'activo', saldoBancario: 18900.25, pagosPendientes: 4500.00, email: 'global@proveedor5.es', phone: '+34 956 789 012' },
  { id: '6', nombre: 'Proveedor 6 Martínez', nif: '22334455C', tipo: 'Staff Interno', estado: 'activo', saldoBancario: 6800.50, pagosPendientes: 1200.00, email: 'info@proveedor6.com', phone: '+34 967 890 123' },
  { id: '7', nombre: 'Proveedor 7 Solutions', nif: 'B55667788', tipo: 'Proveedor Externo', estado: 'pendiente', saldoBancario: 15400.00, pagosPendientes: 2800.00, email: 'solutions@proveedor7.es', phone: '+34 978 901 234' },
  { id: '8', nombre: 'Proveedor 8 López', nif: '66778899D', tipo: 'Licencias', estado: 'activo', saldoBancario: 9200.75, pagosPendientes: 0.00, email: 'contacto@proveedor8.com', phone: '+34 989 012 345' },
  { id: '9', nombre: 'Proveedor 9 Innovación', nif: 'B99887766', tipo: 'Proveedor Externo', estado: 'activo', saldoBancario: 31200.50, pagosPendientes: 5600.00, email: 'innovacion@proveedor9.es', phone: '+34 990 123 456' },
  { id: '10', nombre: 'Proveedor 10 Sánchez', nif: '88776655E', tipo: 'Staff Interno', estado: 'inactivo', saldoBancario: 0.00, pagosPendientes: 0.00, email: 'info@proveedor10.com', phone: '+34 901 234 567' },
  { id: '11', nombre: 'Proveedor 11 Software', nif: 'B11223344', tipo: 'Licencias', estado: 'activo', saldoBancario: 15000.00, pagosPendientes: 3000.00, email: 'software@proveedor11.es', phone: '+34 912 345 678' },
  { id: '12', nombre: 'Proveedor 12 Servicios', nif: '33445566F', tipo: 'Proveedor Externo', estado: 'activo', saldoBancario: 22000.00, pagosPendientes: 5000.00, email: 'servicios@proveedor12.com', phone: '+34 923 456 789' },
];
