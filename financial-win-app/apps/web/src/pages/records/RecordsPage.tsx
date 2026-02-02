import React, { useState, useMemo } from 'react';
import { useFinancial, type FinancialRecord, type ErpStatus } from '../../contexts/FinancialContext';
import { RegistrosTable } from '../../features/finance/components/RegistrosTable';
import { PageHeader, type PageHeaderAction } from '../../components/layout';
import { FilterPanel, type FilterValues } from '../../features/finance/components/FilterPanel';
import { exportToCSV } from '../../utils/exportToCSV';
import { useToast } from '../../contexts/ToastContext';
import { UniversalSearchBar } from '../../components/common';

// Subcomponente: Resumen de registros (KPI)
interface RecordsSummaryProps {
  total: number;
}

const RecordsSummary: React.FC<RecordsSummaryProps> = ({ total }) => {
  const formattedTotal = new Intl.NumberFormat('es-ES').format(total);

  return (
    <div className="studio-kpi-card">
      <div className="kpi-content">
        <div>
          <p className="kpi-label">
            Total de Registros
          </p>
          <h3 className="kpi-value">
            {formattedTotal}
          </h3>
        </div>
        <div className="home-kpi-icon-wrapper-blue">
          <span className="material-symbols-outlined home-kpi-icon">
            table_view
          </span>
        </div>
      </div>
    </div>
  );
};

export const RecordsPage: React.FC = () => {
  const { records } = useFinancial();
  const { showToast } = useToast();
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

  // Mostrar el total de todos los registros (invoices, tickets, staff)
  const totalRegistros = records.length;

  /**
   * Mapea el documentType interno a un nombre legible para el usuario
   */
  const getDocumentTypeLabel = (documentType: FinancialRecord['documentType']): string => {
    switch (documentType) {
      case 'invoices':
        return 'Factura';
      case 'tickets':
        return 'Ticket';
      case 'staff':
        return 'Staff';
      default:
        return documentType;
    }
  };

  /**
   * Mapea el estado ERP del filtro al valor interno
   */
  const mapErpStatusFilterToInternal = (filterStatus: string): ErpStatus | null => {
    const mapping: Record<string, ErpStatus> = {
      'Pendiente': 'pending',
      'Sincronizando': 'syncing',
      'Sincronizado Odoo': 'synced_odoo',
      'Sincronizado A3': 'synced_a3',
      'Error': 'error',
    };
    return mapping[filterStatus] || null;
  };

  /**
   * Extrae el valor numérico del importe para búsqueda
   */
  const extraerNumeroImporte = (importe: string): string => {
    const numeroLimpio = importe.replace(/[€$£,\s]/g, '').trim();
    const numero = parseFloat(numeroLimpio);
    if (!isNaN(numero)) {
      return numeroLimpio;
    }
    return numeroLimpio;
  };

  /**
   * Convierte FinancialRecord a formato de tabla (replicando lógica de RegistrosTable)
   */
  const registrosFormateados = useMemo(() => {
    return records.map((record) => {
      const estado = record.data.supplier && record.data.total ? 'VALIDADO' : 'PENDIENTE';
      const importe = record.data.total 
        ? `${record.data.currency || 'EUR'} ${record.data.total}`
        : 'N/A';
      
      return {
        id: record.id,
        record, // Guardar el record original para acceso a datos completos
        estado,
        tipoDocumento: getDocumentTypeLabel(record.documentType),
        documentType: record.documentType,
        departamento: record.data.department || 'N/A',
        nombreDocumento: record.data.supplier || record.fileName || 'Sin nombre',
        fechaRegistro: new Date(record.createdAt).toLocaleDateString('es-ES'),
        fechaRegistroOriginal: record.createdAt,
        usuario: record.data.supplier || 'N/A',
        importe,
        erpStatus: record.erpStatus || 'pending',
      };
    });
  }, [records]);

  /**
   * Filtra registros según el término de búsqueda y filtros avanzados
   * Replica la lógica de filtrado de RegistrosTable
   */
  const registrosFiltrados = useMemo(() => {
    let resultado = registrosFormateados;

    // Filtro por búsqueda de texto
    if (busqueda.trim()) {
      const terminoBusqueda = busqueda.toLowerCase().trim();
      
      resultado = resultado.filter((registro) => {
        const coincideConcepto = registro.nombreDocumento
          .toLowerCase()
          .includes(terminoBusqueda);
        
        const coincideCategoria = registro.tipoDocumento
          .toLowerCase()
          .includes(terminoBusqueda);
        
        const coincideEntidad = registro.usuario
          .toLowerCase()
          .includes(terminoBusqueda);
        
        const importeOriginal = registro.importe.toLowerCase();
        const importeNumerico = extraerNumeroImporte(registro.importe).toLowerCase();
        const terminoBusquedaNumerico = terminoBusqueda.replace(/[€$£,\s]/g, '');
        
        const coincideImporteTexto = importeOriginal.includes(terminoBusqueda);
        const coincideImporteNumero = importeNumerico.includes(terminoBusquedaNumerico);
        
        return (
          coincideConcepto ||
          coincideCategoria ||
          coincideEntidad ||
          coincideImporteTexto ||
          coincideImporteNumero
        );
      });
    }

    // Aplicar filtros avanzados si existen
    if (filters) {
      // Filtro por rango de fechas
      if (filters.dateRange.from) {
        resultado = resultado.filter((registro) => {
          const fechaRegistro = new Date(registro.fechaRegistroOriginal);
          const fechaDesde = new Date(filters.dateRange.from);
          fechaDesde.setHours(0, 0, 0, 0);
          return fechaRegistro >= fechaDesde;
        });
      }
      if (filters.dateRange.to) {
        resultado = resultado.filter((registro) => {
          const fechaRegistro = new Date(registro.fechaRegistroOriginal);
          const fechaHasta = new Date(filters.dateRange.to);
          fechaHasta.setHours(23, 59, 59, 999);
          return fechaRegistro <= fechaHasta;
        });
      }

      // Filtro por categorías (departamento)
      if (filters.categories.length > 0) {
        resultado = resultado.filter((registro) =>
          filters.categories.includes(registro.departamento)
        );
      }

      // Filtro por estados
      if (filters.status.length > 0) {
        resultado = resultado.filter((registro) =>
          filters.status.includes(registro.estado)
        );
      }

      // Filtro por Tipo de Documento
      if (filters.documentType.length > 0) {
        resultado = resultado.filter((registro) => {
          const documentTypesToFilter = filters.documentType.map((dt) => {
            if (dt === 'Factura') return 'invoices';
            if (dt === 'Ticket') return 'tickets';
            if (dt === 'Staff') return 'staff';
            return dt.toLowerCase();
          });
          return documentTypesToFilter.includes(registro.documentType);
        });
      }

      // Filtro por Estado ERP
      if (filters.erpStatus.length > 0) {
        const erpStatusInternal = filters.erpStatus
          .map(mapErpStatusFilterToInternal)
          .filter((status): status is ErpStatus => status !== null);
        
        resultado = resultado.filter((registro) => {
          const registroErpStatus = registro.erpStatus as ErpStatus;
          return erpStatusInternal.includes(registroErpStatus);
        });
      }

      // Filtro por rango de importe
      if (filters.amountRange.min !== null) {
        resultado = resultado.filter((registro) => {
          const importeNum = parseFloat(
            registro.importe.replace(/[€$£,\s]/g, '').trim()
          );
          return importeNum >= filters.amountRange.min!;
        });
      }
      if (filters.amountRange.max !== null) {
        resultado = resultado.filter((registro) => {
          const importeNum = parseFloat(
            registro.importe.replace(/[€$£,\s]/g, '').trim()
          );
          return importeNum <= filters.amountRange.max!;
        });
      }
    }

    return resultado;
  }, [registrosFormateados, busqueda, filters]);

  /**
   * Función para exportar registros filtrados a CSV
   */
  const handleDescarga = () => {
    if (registrosFiltrados.length === 0) {
      showToast('No hay registros para exportar', 'warning');
      return;
    }

    // Mapear registros filtrados a formato de exportación
    const dataToExport = registrosFiltrados.map((registroFormateado) => {
      const record = registroFormateado.record;
      const total = parseFloat(record.data.total?.toString() || '0');
      const base = parseFloat(record.data.base?.toString() || '0');
      const vat = parseFloat(record.data.vat?.toString() || '0');

      // Obtener fecha del registro
      const fechaRegistro = new Date(record.createdAt);

      return {
        Fecha: fechaRegistro.toLocaleDateString('es-ES'),
        'Cliente/Proveedor': record.data.supplier || '',
        Concepto: record.data.supplier || record.fileName || 'Sin nombre',
        'Base Imponible': base.toFixed(2),
        IVA: vat.toFixed(2),
        Total: total.toFixed(2),
      };
    });

    const headers = [
      { key: 'Fecha' as const, label: 'Fecha' },
      { key: 'Cliente/Proveedor' as const, label: 'Cliente/Proveedor' },
      { key: 'Concepto' as const, label: 'Concepto' },
      { key: 'Base Imponible' as const, label: 'Base Imponible' },
      { key: 'IVA' as const, label: 'IVA' },
      { key: 'Total' as const, label: 'Total' },
    ];

    // Generar nombre de archivo descriptivo con año actual
    const añoActual = new Date().getFullYear();
    const nombreArchivo = `Registros_Financieros_${añoActual}`;

    exportToCSV(dataToExport, nombreArchivo, headers);
    showToast('Exportación completada correctamente', 'success');
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
      onClick: handleDescarga,
      variant: 'default',
    },
  ];

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  return (
    <div className="layout-page-container">
      <PageHeader
        title="Registros"
        showSearch={false}
        actions={headerActions}
      />
      <div className="action-toolbar">
        <UniversalSearchBar
          items={registrosFormateados}
          onFilter={() => {
            // El filtrado se maneja en RegistrosTable usando searchTerm
          }}
          onSearchTermChange={setBusqueda}
          searchFields={['nombreDocumento', 'departamento', 'usuario', 'importe']}
          placeholder="Buscar por nombreDocumento, departamento, usuario, importe..."
        />
      </div>

      <div className="studio-card">
        <div className="mt-8">
          <RecordsSummary total={totalRegistros} />
        </div>

        <div className="mt-4 px-2">
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            {totalRegistros === 0 
              ? 'No hay registros cargados desde la base de datos local'
              : `${totalRegistros} ${totalRegistros === 1 ? 'registro cargado' : 'registros cargados'} desde la base de datos local`}
          </p>
        </div>

        <div className="mt-8">
          <RegistrosTable searchTerm={busqueda} filters={filters} />
        </div>
      </div>

      <FilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        onFilterChange={handleFilterChange}
        initialFilters={filters}
        type="registros"
      />
    </div>
  );
};
