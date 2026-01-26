import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cliente } from '../../features/entities/types';
import { EntityFilterPanel, type EntityFilterValues } from '@/features/entities/components/EntityFilterPanel';
import { DataTablePagination } from '../../components/common/DataTablePagination';
import { EmptyState } from '../../components/common/EmptyState';
import {
  ListViewHeader,
  type ViewType,
  EntityTableView,
  EntityCardsView,
  type EntityTableItem,
  type EntityCardItem,
} from '../../components/common';
import { exportToExcel, type ExportColumn } from '../../utils/exportToExcel';

const STORAGE_KEY = 'zaffra_clients';
const VIEW_TYPE_STORAGE_KEY = 'clientes_view_type';

export const ListaClientesPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [busqueda, setBusqueda] = useState('');
  const [viewType, setViewType] = useState<ViewType>(() => {
    const stored = localStorage.getItem(VIEW_TYPE_STORAGE_KEY);
    return (stored === 'table' || stored === 'cards' ? stored : 'cards') as ViewType;
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<EntityFilterValues>({
    status: [],
    types: [],
    balanceRange: { min: null, max: null },
    paymentsRange: { min: null, max: null },
  });

  // Persistir el tipo de vista en localStorage
  useEffect(() => {
    localStorage.setItem(VIEW_TYPE_STORAGE_KEY, viewType);
  }, [viewType]);

  // Cargar clientes del localStorage
  const clientes = useMemo(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const data: Cliente[] = JSON.parse(stored);
      return data.filter((c) => c.is_active !== false);
    } catch (error) {
      console.error('Error al cargar clientes del localStorage:', error);
      return [];
    }
  }, []);

  // Convertir clientes al formato de lista
  const clientesLista = useMemo(() => {
    return clientes.map((c): EntityTableItem & EntityCardItem => ({
      id: c.id || '',
      nombre: c.razonSocial || '',
      nif: c.nif || '',
      tipo: (c.pais && c.pais !== 'España') ? 'Extranjero' : 'Nacional',
      estado: c.is_active === false ? 'inactivo' : 'activo',
      saldoBancario: 0,
      pagosPendientes: 0,
      email: c.email,
      phone: c.telefono,
      ciudad: c.ciudad,
    }));
  }, [clientes]);

  // Filtrar clientes por búsqueda y filtros avanzados
  const clientesFiltrados = useMemo(() => {
    let resultado = clientesLista;

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
        (cliente) => (cliente.saldoBancario ?? 0) >= filters.balanceRange.min!
      );
    }
    if (filters.balanceRange.max !== null) {
      resultado = resultado.filter(
        (cliente) => (cliente.saldoBancario ?? 0) <= filters.balanceRange.max!
      );
    }

    // Filtro por rango de pagos pendientes
    if (filters.paymentsRange.min !== null) {
      resultado = resultado.filter(
        (cliente) => (cliente.pagosPendientes ?? 0) >= filters.paymentsRange.min!
      );
    }
    if (filters.paymentsRange.max !== null) {
      resultado = resultado.filter(
        (cliente) => (cliente.pagosPendientes ?? 0) <= filters.paymentsRange.max!
      );
    }

    return resultado;
  }, [busqueda, filters, clientesLista]);

  // Calcular paginación
  const totalPages = Math.ceil(clientesFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const clientesPaginados = useMemo(() => {
    return clientesFiltrados.slice(startIndex, endIndex);
  }, [clientesFiltrados, startIndex, endIndex]);

  // Resetear página cuando cambia la búsqueda o filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [busqueda, filters]);

  // Ajustar página actual si está fuera de rango
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Handlers de paginación
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleNuevoCliente = () => {
    navigate('/clientes/nuevo');
  };

  const handleFiltro = () => {
    setIsFilterOpen(true);
  };

  const handleFilterChange = (newFilters: EntityFilterValues) => {
    setFilters(newFilters);
  };

  const handleVerFicha = (clienteId: string) => {
    navigate(`/cliente/detalle/${clienteId}`);
  };

  // Función de exportación a Excel
  const handleDescarga = () => {
    if (clientesFiltrados.length === 0) {
      return;
    }

    const year = new Date().getFullYear();
    const filename = `Lista_Clientes_${year}`;

    // Preparar datos para exportación
    const dataToExport = clientesFiltrados.map((cliente) => ({
      nombre: cliente.nombre,
      nif: cliente.nif,
      email: cliente.email || '',
      phone: cliente.phone || '',
      ciudad: cliente.ciudad || '',
    }));

    type ExportData = typeof dataToExport[0];

    const columns: ExportColumn<ExportData>[] = [
      { key: 'nombre', label: 'Nombre/Razón Social' },
      { key: 'nif', label: 'NIF' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'ciudad', label: 'Ciudad' },
    ];

    exportToExcel(dataToExport, filename, columns);
  };

  return (
    <div className="clients-list-container flex flex-col h-full">
      <ListViewHeader
        title="Lista de Clientes"
        showBackButton={false}
        showSearch={true}
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        searchPlaceholder="Buscar cliente (Nombre, CIF)..."
        viewType={viewType}
        onViewTypeChange={setViewType}
        onFilterClick={handleFiltro}
        onDownloadClick={handleDescarga}
        onAddClick={handleNuevoCliente}
      />

      <div className="flex flex-col flex-grow gap-8 py-6 min-h-0">
        {clientesPaginados.length > 0 ? (
          <>
            <div className="flex-grow overflow-y-auto pb-4">
              {viewType === 'table' ? (
                <EntityTableView
                  items={clientesPaginados}
                  onItemClick={handleVerFicha}
                  isProvider={false}
                />
              ) : (
                <EntityCardsView
                  items={clientesPaginados}
                  onItemClick={handleVerFicha}
                  isProvider={false}
                />
              )}
            </div>

            <DataTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={clientesFiltrados.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </>
        ) : (
          <EmptyState
            title="No se encontraron clientes"
            description="Intenta ajustar los términos de búsqueda"
            icon="search_off"
          />
        )}
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
