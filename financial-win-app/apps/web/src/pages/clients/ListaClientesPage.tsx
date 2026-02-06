import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  UniversalSearchBar,
} from '../../components/common';
import { exportToExcel, type ExportColumn } from '../../utils/exportToExcel';
import { useToast } from '../../contexts/ToastContext';
import { odooService, type OdooPartner } from '../../services/odooService';

const VIEW_TYPE_STORAGE_KEY = 'clientes_view_type';

export const ListaClientesPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partners, setPartners] = useState<OdooPartner[]>([]);

  // Persistir el tipo de vista en localStorage
  useEffect(() => {
    localStorage.setItem(VIEW_TYPE_STORAGE_KEY, viewType);
  }, [viewType]);

  // Cargar clientes automáticamente desde Odoo al montar el componente
  useEffect(() => {
    const loadOdooCustomers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await odooService.getPartners('customer');
        setPartners(result);
      } catch (err) {
        console.error('Error al cargar clientes desde Odoo:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Error desconocido al cargar clientes desde Odoo.'
        );
        showToast(
          'No se pudieron cargar los clientes desde Odoo. Revisa la configuración de Odoo.',
          'error'
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadOdooCustomers();
  }, [showToast]);

  // Convertir clientes al formato de lista
  const clientesLista = useMemo(() => {
    return partners.map((p): EntityTableItem & EntityCardItem => ({
      id: String(p.id),
      nombre: p.name,
      nif: p.vat || '',
      tipo: 'Nacional', // Por defecto, se puede calcular basado en país si está disponible
      estado: 'activo',
      saldoBancario: 0,
      pagosPendientes: 0,
      email: p.email,
      phone: '',
      ciudad: p.city || '',
    }));
  }, [partners]);

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
        showSearch={false}
        viewType={viewType}
        onViewTypeChange={setViewType}
        onFilterClick={handleFiltro}
        onDownloadClick={handleDescarga}
        onAddClick={handleNuevoCliente}
      />
      <div className="action-toolbar mb-6">
        <UniversalSearchBar
          items={clientesLista}
          onFilter={() => {
            // El filtrado se maneja en clientesFiltrados usando busqueda
          }}
          onSearchTermChange={setBusqueda}
          searchFields={['nombre', 'nif', 'email', 'ciudad']}
          placeholder="Buscar por nombre, nif, email, ciudad..."
        />
      </div>

      <div className="flex flex-col flex-grow gap-8 py-6 min-h-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <span className="material-symbols-outlined mr-2 animate-spin">
              progress_activity
            </span>
            <span>Cargando clientes desde Odoo...</span>
          </div>
        ) : error ? (
          <EmptyState
            title="Error al cargar clientes"
            description={error}
            icon="warning"
          />
        ) : clientesPaginados.length > 0 ? (
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
        ) : busqueda.trim() || filters.status.length > 0 || filters.types.length > 0 || 
            filters.balanceRange.min !== null || filters.balanceRange.max !== null ||
            filters.paymentsRange.min !== null || filters.paymentsRange.max !== null ? (
          <EmptyState
            title="No se encontraron clientes"
            description="Intenta ajustar los términos de búsqueda o filtros"
            icon="search_off"
          />
        ) : (
          <EmptyState
            title="No hay datos en Odoo"
            description="No hay clientes disponibles en Odoo en este momento"
            icon="inbox"
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
