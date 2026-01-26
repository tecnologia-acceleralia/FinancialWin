import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoriaProveedor, Proveedor } from '../../features/entities/types';
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

const STORAGE_KEY = 'zaffra_suppliers';
const VIEW_TYPE_STORAGE_KEY = 'proveedores_view_type';

export const ProveedoresListPage: React.FC = () => {
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

  // Cargar proveedores del localStorage
  const proveedores = useMemo(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const data: Proveedor[] = JSON.parse(stored);
      return data.filter((p) => p.is_active !== false);
    } catch (error) {
      console.error('Error al cargar proveedores del localStorage:', error);
      return [];
    }
  }, []);

  // Convertir proveedores al formato de lista
  const proveedoresLista = useMemo(() => {
    return proveedores.map((p): EntityTableItem & EntityCardItem => ({
      id: p.id || '',
      nombre: p.nombreComercial || p.razonSocial || '',
      nif: p.cif || '',
      tipo: p.categoria || 'Proveedor Externo',
      estado: p.is_active === false ? 'inactivo' : 'activo',
      saldoBancario: 0,
      pagosPendientes: 0,
      email: p.ordersEmail,
      phone: p.telefono,
      ciudad: p.ciudad,
    }));
  }, [proveedores]);

  // Filtrar proveedores por búsqueda y filtros avanzados
  const proveedoresFiltrados = useMemo(() => {
    let resultado = proveedoresLista;

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
        filters.types.includes(proveedor.tipo as CategoriaProveedor)
      );
    }

    // Filtro por rango de saldo bancario
    if (filters.balanceRange.min !== null) {
      resultado = resultado.filter(
        (proveedor) => (proveedor.saldoBancario ?? 0) >= filters.balanceRange.min!
      );
    }
    if (filters.balanceRange.max !== null) {
      resultado = resultado.filter(
        (proveedor) => (proveedor.saldoBancario ?? 0) <= filters.balanceRange.max!
      );
    }

    // Filtro por rango de pagos pendientes
    if (filters.paymentsRange.min !== null) {
      resultado = resultado.filter(
        (proveedor) => (proveedor.pagosPendientes ?? 0) >= filters.paymentsRange.min!
      );
    }
    if (filters.paymentsRange.max !== null) {
      resultado = resultado.filter(
        (proveedor) => (proveedor.pagosPendientes ?? 0) <= filters.paymentsRange.max!
      );
    }

    return resultado;
  }, [busqueda, filters, proveedoresLista]);

  // Calcular paginación
  const totalPages = Math.ceil(proveedoresFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const proveedoresPaginados = useMemo(() => {
    return proveedoresFiltrados.slice(startIndex, endIndex);
  }, [proveedoresFiltrados, startIndex, endIndex]);

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

  const handleVerFicha = (proveedorId: string) => {
    navigate(`/proveedor/detalle/${proveedorId}`);
  };

  // Función de exportación a Excel
  const handleDescarga = () => {
    if (proveedoresFiltrados.length === 0) {
      return;
    }

    const year = new Date().getFullYear();
    const filename = `Lista_Proveedores_${year}`;

    // Preparar datos para exportación
    const dataToExport = proveedoresFiltrados.map((proveedor) => ({
      nombre: proveedor.nombre,
      nif: proveedor.nif,
      email: proveedor.email || '',
      phone: proveedor.phone || '',
      ciudad: proveedor.ciudad || '',
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
        title="Lista de Proveedores"
        showBackButton
        onBack={handleVolver}
        showSearch
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        searchPlaceholder="Buscar proveedor (Nombre, CIF)..."
        viewType={viewType}
        onViewTypeChange={setViewType}
        onFilterClick={handleFiltro}
        onDownloadClick={handleDescarga}
        onAddClick={handleNuevoProveedor}
      />

      <div className="flex flex-col flex-grow gap-8 py-6 min-h-0">
        {proveedoresPaginados.length > 0 ? (
          <>
            <div className="flex-grow overflow-y-auto pb-4">
              {viewType === 'table' ? (
                <EntityTableView
                  items={proveedoresPaginados}
                  onItemClick={handleVerFicha}
                  isProvider={true}
                />
              ) : (
                <EntityCardsView
                  items={proveedoresPaginados}
                  onItemClick={handleVerFicha}
                  isProvider={true}
                />
              )}
            </div>

            <DataTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={proveedoresFiltrados.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </>
        ) : (
          <EmptyState
            title="No se encontraron proveedores"
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
        availableTypes={['Proveedor Externo', 'Staff Interno', 'Licencias']}
        entityType="proveedores"
      />
    </div>
  );
};

export default ProveedoresListPage;
