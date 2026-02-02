import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoriaProveedor } from '../../features/entities/types';
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

const VIEW_TYPE_STORAGE_KEY = 'proveedores_view_type';

export const ProveedoresListPage: React.FC = () => {
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
  const [isImporting, setIsImporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partners, setPartners] = useState<OdooPartner[]>([]);

  // Persistir el tipo de vista en localStorage
  useEffect(() => {
    localStorage.setItem(VIEW_TYPE_STORAGE_KEY, viewType);
  }, [viewType]);

  // Cargar proveedores directamente desde Odoo
  useEffect(() => {
    const loadPartners = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await odooService.getPartners('supplier');
        setPartners(result);
      } catch (err) {
        console.error('Error al cargar proveedores desde Odoo:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Error desconocido al cargar proveedores desde Odoo.'
        );
        showToast(
          'No se pudieron cargar los proveedores desde Odoo. Revisa la configuración de Odoo.',
          'error'
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadPartners();
  }, [refreshKey, showToast]);

  // Convertir proveedores al formato de lista
  const proveedoresLista = useMemo(() => {
    return partners.map((p): EntityTableItem & EntityCardItem => ({
      id: String(p.id),
      nombre: p.name,
      nif: p.vat || '',
      tipo: 'Proveedor Externo',
      estado: 'activo',
      saldoBancario: 0,
      pagosPendientes: 0,
      email: p.email,
      phone: '',
      ciudad: p.city,
    }));
  }, [partners]);

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

  const handleImportarOdoo = async () => {
    setIsImporting(true);
    try {
      // Forzar recarga desde Odoo
      setRefreshKey((prev) => prev + 1);
      showToast('Proveedores sincronizados desde Odoo', 'success');
    } catch (error) {
      console.error('Error al sincronizar proveedores desde Odoo:', error);
      showToast(
        `Error al sincronizar proveedores desde Odoo: ${
          error instanceof Error ? error.message : 'Error desconocido'
        }`,
        'error'
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="clients-list-container flex flex-col h-full">
      <ListViewHeader
        title="Lista de Proveedores"
        showBackButton
        onBack={handleVolver}
        showSearch={false}
        viewType={viewType}
        onViewTypeChange={setViewType}
        onFilterClick={handleFiltro}
        onDownloadClick={handleDescarga}
        onAddClick={handleNuevoProveedor}
      />
      <div className="action-toolbar mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <UniversalSearchBar
              items={proveedoresLista}
              onFilter={() => {
                // El filtrado se maneja en proveedoresFiltrados usando busqueda
              }}
              onSearchTermChange={setBusqueda}
              searchFields={['nombre', 'nif', 'email', 'ciudad']}
              placeholder="Buscar por nombre, nif, email, ciudad..."
            />
          </div>
          <button
            type="button"
            onClick={handleImportarOdoo}
            disabled={isImporting}
            className="btn btn-secondary"
          >
            <span className="material-symbols-outlined mr-2">
              {isImporting ? 'sync' : 'download'}
            </span>
            {isImporting ? 'Importando...' : 'Importar de Odoo'}
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-grow gap-8 py-6 min-h-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <span className="material-symbols-outlined mr-2 animate-spin">
              progress_activity
            </span>
            <span>Cargando proveedores desde Odoo...</span>
          </div>
        ) : error ? (
          <EmptyState
            title="Error al cargar proveedores"
            description={error}
            icon="warning"
          />
        ) : proveedoresPaginados.length > 0 ? (
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
