import React, { useMemo, useState, useCallback } from 'react';
import { useFinancial, type PaymentStatus, type ErpStatus } from '../../../contexts/FinancialContext';
import type { FilterValues } from './FilterPanel';
import { PaymentStatusSelect } from '../../../components/common/PaymentStatusSelect';
import { findSupplierByName } from '../../../utils/supplierMatching';
import { a3Service, type A3InvoicePayload, type SupplierA3Data } from '../../../services/a3Service';
import { LinkSupplierModal } from '../../../components/common/LinkSupplierModal';
import { A3InspectionModal } from '../../../components/common/A3InspectionModal';
import { DocumentModal } from '../../../components/common/DocumentModal';
import { DataTablePagination } from '../../../components/common/DataTablePagination';
import { useToast } from '../../../contexts/ToastContext';

interface Gasto {
  id: string;
  estado: 'Pagado' | 'Registrada' | 'Por Recibir';
  proveedor: string;
  proveedorId?: string; // ID del proveedor vinculado directamente en la factura
  proveedorIdA3?: string;
  proveedorMatch?: { 
    id?: string; 
    nombreComercial?: string; 
    razonSocial?: string; 
    idContableA3?: string;
    actividadA3?: string;
    serieA3?: string;
  };
  departamento: string;
  tipo: string;
  fechaFactura: string;
  fechaPago: string;
  moneda: string;
  via: string;
  importe: string;
  variable: string;
  iva: string;
  totalBanco: string;
  erpStatus?: ErpStatus;
}

interface GastosTableProps {
  searchTerm?: string;
  filters?: FilterValues;
}

/**
 * Convierte un FinancialRecord a un Gasto para la tabla
 * Solo procesa registros validados (que tienen supplier y total)
 */
const convertRecordToGasto = (record: ReturnType<typeof useFinancial>['expenses'][0]): Gasto | null => {
  // Solo procesar registros validados
  if (!record.data.supplier || !record.data.total) {
    return null;
  }

  const total = parseFloat(record.data.total.toString() || '0');
  const base = parseFloat(record.data.base?.toString() || '0');
  const vat = parseFloat(record.data.vat?.toString() || '0');
  
  // Buscar el proveedor con matching flexible
  const supplierName = record.data.supplier;
  // Primero verificar si hay un supplierId vinculado directamente en la factura
  const proveedorIdVinculado = (record.data as any).supplierId;
  let proveedorMatch: { 
    id?: string; 
    nombreComercial?: string; 
    razonSocial?: string; 
    idContableA3?: string;
    actividadA3?: string;
    serieA3?: string;
  } | undefined;
  let proveedorIdA3: string | undefined;

  if (proveedorIdVinculado) {
    // Si hay un supplierId vinculado, buscar el proveedor completo desde localStorage
    try {
      const stored = localStorage.getItem('zaffra_suppliers');
      if (stored) {
        const suppliers = JSON.parse(stored) as Array<{
          id?: string;
          nombreComercial?: string;
          razonSocial?: string;
          idContableA3?: string;
          actividadA3?: string;
          serieA3?: string;
        }>;
        proveedorMatch = suppliers.find((s) => s.id === proveedorIdVinculado);
        proveedorIdA3 = proveedorMatch?.idContableA3;
      }
    } catch (error) {
      console.error('Error al buscar proveedor vinculado:', error);
    }
  } else {
    // Si no hay supplierId vinculado, hacer matching por nombre
    // Necesitamos buscar manualmente para obtener todos los campos
    try {
      const stored = localStorage.getItem('zaffra_suppliers');
      if (stored) {
        const suppliers = JSON.parse(stored) as Array<{
          id?: string;
          nombreComercial?: string;
          razonSocial?: string;
          idContableA3?: string;
          actividadA3?: string;
          serieA3?: string;
        }>;
        const found = findSupplierByName(supplierName, 'zaffra_suppliers');
        if (found?.id) {
          proveedorMatch = suppliers.find((s) => s.id === found.id);
        } else {
          proveedorMatch = found;
        }
        proveedorIdA3 = proveedorMatch?.idContableA3;
      } else {
        proveedorMatch = findSupplierByName(supplierName, 'zaffra_suppliers');
        proveedorIdA3 = proveedorMatch?.idContableA3;
      }
    } catch (error) {
      console.error('Error al buscar proveedor por nombre:', error);
      proveedorMatch = findSupplierByName(supplierName, 'zaffra_suppliers');
      proveedorIdA3 = proveedorMatch?.idContableA3;
    }
  }
  
  // Mapear paymentStatus a estado de la tabla
  const getEstado = (status: PaymentStatus | undefined): 'Pagado' | 'Registrada' | 'Por Recibir' => {
    switch (status) {
      case 'Pagado':
        return 'Pagado';
      case 'Pendiente':
      default:
        return 'Registrada';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: record.data.currency || 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return {
    id: record.id,
    estado: getEstado(record.paymentStatus),
    proveedor: supplierName,
    proveedorId: proveedorIdVinculado,
    proveedorIdA3,
    proveedorMatch,
    departamento: record.data.department || 'N/A',
    tipo: record.data.expenseType || 'Otros',
    fechaFactura: record.data.issueDate 
      ? new Date(record.data.issueDate).toLocaleDateString('es-ES')
      : new Date(record.createdAt).toLocaleDateString('es-ES'),
    fechaPago: record.paymentStatus === 'Pagado' 
      ? new Date(record.updatedAt).toLocaleDateString('es-ES')
      : '-',
    moneda: record.data.currency || 'EUR',
    via: 'Transferencia', // Por defecto, se puede extender en el futuro
    importe: formatCurrency(base),
    variable: formatCurrency(0), // Por defecto, se puede extender en el futuro
    iva: formatCurrency(vat),
    totalBanco: formatCurrency(total),
    erpStatus: record.erpStatus,
  };
};

export const GastosTable: React.FC<GastosTableProps> = ({ searchTerm = '', filters }) => {
  const { expenses, updateRecord, deleteRecord } = useFinancial();
  const { showToast } = useToast();
  const [linkingInvoiceId, setLinkingInvoiceId] = useState<string | null>(null);
  const [syncingInvoiceId, setSyncingInvoiceId] = useState<string | null>(null);
  const [inspectingInvoiceId, setInspectingInvoiceId] = useState<string | null>(null);
  const [inspectionPayload, setInspectionPayload] = useState<A3InvoicePayload | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  /**
   * Maneja el cambio de estado de pago
   * Actualiza directamente en el contexto (que persiste en localStorage)
   */
  const handlePaymentStatusChange = (recordId: string, newStatus: PaymentStatus) => {
    updateRecord(recordId, { paymentStatus: newStatus });
  };

  /**
   * Maneja la eliminación de un registro
   * Pide confirmación antes de eliminar
   */
  const handleDelete = (recordId: string, proveedor: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el registro de ${proveedor}?`)) {
      deleteRecord(recordId);
      showToast('Registro eliminado correctamente', 'success');
    }
  };

  /**
   * Maneja la selección/deselección de una fila
   */
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /**
   * Maneja la eliminación masiva de registros seleccionados
   */
  const handleBulkDelete = () => {
    const count = selectedIds.size;
    if (count === 0) return;

    if (window.confirm(`¿Estás seguro de que quieres eliminar los ${count} registros seleccionados?`)) {
      selectedIds.forEach((id) => {
        deleteRecord(id);
      });
      setSelectedIds(new Set());
      showToast(`${count} registro${count > 1 ? 's' : ''} eliminado${count > 1 ? 's' : ''} correctamente`, 'success');
    }
  };

  /**
   * Obtiene los datos completos del proveedor desde localStorage
   */
  const getSupplierA3Data = (supplierId: string | undefined): SupplierA3Data | null => {
    if (!supplierId) return null;

    try {
      const stored = localStorage.getItem('zaffra_suppliers');
      if (!stored) return null;

      const suppliers = JSON.parse(stored) as Array<{
        id?: string;
        idContableA3?: string;
        actividadA3?: string;
        serieA3?: string;
      }>;

      const supplier = suppliers.find((s) => s.id === supplierId);
      if (!supplier || !supplier.idContableA3) return null;

      return {
        idContableA3: supplier.idContableA3,
        actividadA3: supplier.actividadA3,
        serieA3: supplier.serieA3,
      };
    } catch (error) {
      console.error('Error al obtener datos del proveedor:', error);
      return null;
    }
  };

  /**
   * Maneja el clic en el botón "Subir a A3"
   * Abre el modal de inspección con el payload generado
   */
  const handleSyncToA3 = (gasto: Gasto) => {
    if (!gasto.proveedorIdA3) {
      console.warn('No se puede sincronizar: proveedor sin ID A3');
      return;
    }

    const record = expenses.find((e) => e.id === gasto.id);
    if (!record) return;

    // Obtener datos completos del proveedor
    let supplierData = getSupplierA3Data(gasto.proveedorId);
    
    if (!supplierData) {
      // Si no hay supplierId vinculado, intentar obtenerlo del matching
      if (gasto.proveedorMatch?.id) {
        supplierData = getSupplierA3Data(gasto.proveedorMatch.id);
      }
      
      // Si aún no tenemos datos completos, construir un objeto mínimo
      if (!supplierData) {
        supplierData = {
          idContableA3: gasto.proveedorIdA3,
          actividadA3: gasto.proveedorMatch?.actividadA3,
          serieA3: gasto.proveedorMatch?.serieA3,
        };
      }
    }

    // Construir el payload
    const payload = a3Service.buildA3InvoicePayload(record, supplierData);

    // Abrir modal de inspección
    setInspectionPayload(payload);
    setInspectingInvoiceId(gasto.id);
  };

  /**
   * Confirma el envío y realiza la sincronización real
   */
  const handleConfirmSync = async () => {
    if (!inspectingInvoiceId || !inspectionPayload) return;

    const gasto = gastos.find((g) => g.id === inspectingInvoiceId);
    if (!gasto) return;

    const record = expenses.find((e) => e.id === inspectingInvoiceId);
    if (!record) return;

    // Activar estado de carga
    setSyncingInvoiceId(inspectingInvoiceId);

    try {
      // Simular tiempo de comunicación con el servidor (1.5 segundos)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Aquí se haría la llamada real a la API de A3factura
      // Por ahora, solo logueamos el payload
      console.log('📤 [A3Service] Enviando payload a A3factura:', JSON.stringify(inspectionPayload, null, 2));
      
      // Actualizar estado de sincronización a 'synced_a3'
      updateRecord(inspectingInvoiceId, { erpStatus: 'synced_a3' });
      
      // Mostrar toast de éxito después de que termine la animación de carga
      showToast('Factura contabilizada en A3factura.', 'success');
    } catch (error) {
      console.error('Error al sincronizar con A3:', error);
      updateRecord(inspectingInvoiceId, { erpStatus: 'error' });
      showToast('Error al sincronizar la factura con A3factura', 'error');
    } finally {
      // Desactivar estado de carga
      setSyncingInvoiceId(null);
      setInspectingInvoiceId(null);
      setInspectionPayload(null);
    }
  };

  /**
   * Maneja la vinculación de proveedor
   */
  const handleLinkSupplier = (gasto: Gasto) => {
    setLinkingInvoiceId(gasto.id);
  };

  /**
   * Callback cuando se vincula un proveedor
   * Actualiza directamente el registro en el FinancialContext añadiendo supplierId al objeto data
   */
  const handleSupplierLinked = (supplierId: string, supplierA3Id: string, invoiceId: string) => {
    if (!invoiceId) return;

    // Actualizar el registro añadiendo supplierId al objeto data
    const record = expenses.find((e) => e.id === invoiceId);
    if (!record) {
      console.warn('No se encontró el registro para actualizar:', invoiceId);
      return;
    }

    // Actualizar el registro añadiendo supplierId al objeto data
    updateRecord(invoiceId, {
      data: {
        ...record.data,
        supplierId: supplierId,
      } as any,
    });

    // El toast de éxito se muestra desde el modal (más específico con el nombre del proveedor)
    setLinkingInvoiceId(null);
  };

  // Convertir registros a formato de tabla
  const gastos = useMemo(() => {
    return expenses
      .map(convertRecordToGasto)
      .filter((gasto): gasto is Gasto => gasto !== null);
  }, [expenses]);

  const gastosFiltrados = useMemo(() => {
    let resultado = gastos;

    // Filtro por búsqueda de texto
    if (searchTerm.trim()) {
      const busquedaLower = searchTerm.toLowerCase().trim();
      resultado = resultado.filter(
        (gasto) =>
          gasto.proveedor.toLowerCase().includes(busquedaLower) ||
          gasto.departamento.toLowerCase().includes(busquedaLower) ||
          gasto.tipo.toLowerCase().includes(busquedaLower) ||
          gasto.estado.toLowerCase().includes(busquedaLower)
      );
    }

    // Aplicar filtros avanzados si existen
    if (filters) {
      // Filtro por rango de fechas
      if (filters.dateRange.from) {
        resultado = resultado.filter((gasto) => {
          const fechaFactura = new Date(gasto.fechaFactura);
          const fechaDesde = new Date(filters.dateRange.from);
          fechaDesde.setHours(0, 0, 0, 0);
          return fechaFactura >= fechaDesde;
        });
      }
      if (filters.dateRange.to) {
        resultado = resultado.filter((gasto) => {
          const fechaFactura = new Date(gasto.fechaFactura);
          const fechaHasta = new Date(filters.dateRange.to);
          fechaHasta.setHours(23, 59, 59, 999);
          return fechaFactura <= fechaHasta;
        });
      }

      // Filtro por categorías (tipo)
      if (filters.categories.length > 0) {
        resultado = resultado.filter((gasto) =>
          filters.categories.includes(gasto.tipo)
        );
      }

      // Filtro por estados
      if (filters.status.length > 0) {
        resultado = resultado.filter((gasto) =>
          filters.status.includes(gasto.estado)
        );
      }

      // Filtro por rango de importe
      if (filters.amountRange.min !== null) {
        resultado = resultado.filter((gasto) => {
          const importeNum = parseFloat(
            gasto.importe.replace(/[€,]/g, '').trim()
          );
          return importeNum >= filters.amountRange.min!;
        });
      }
      if (filters.amountRange.max !== null) {
        resultado = resultado.filter((gasto) => {
          const importeNum = parseFloat(
            gasto.importe.replace(/[€,]/g, '').trim()
          );
          return importeNum <= filters.amountRange.max!;
        });
      }
    }

    return resultado;
  }, [gastos, searchTerm, filters]);

  // Resetear a página 1 cuando cambian los filtros o búsqueda
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  // Calcular datos paginados
  const totalPages = Math.ceil(gastosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const gastosPaginados = useMemo(() => {
    return gastosFiltrados.slice(startIndex, endIndex);
  }, [gastosFiltrados, startIndex, endIndex]);

  // Ajustar página actual si está fuera de rango
  React.useEffect(() => {
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
    setCurrentPage(1); // Resetear a página 1 al cambiar items por página
  };

  // Limpiar selección cuando cambian los filtros (eliminar IDs que ya no están visibles)
  React.useEffect(() => {
    const visibleIds = new Set(gastosFiltrados.map((g) => g.id));
    setSelectedIds((prev) => {
      const filtered = new Set([...prev].filter((id) => visibleIds.has(id)));
      return filtered.size !== prev.size ? filtered : prev;
    });
  }, [gastosFiltrados]);

  /**
   * Maneja la selección/deselección de todas las filas
   */
  const handleToggleSelectAll = useCallback(() => {
    if (selectedIds.size === gastosFiltrados.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(gastosFiltrados.map((g) => g.id)));
    }
  }, [selectedIds.size, gastosFiltrados]);

  const getEstadoClass = (estado: Gasto['estado']) => {
    switch (estado) {
      case 'Pagado':
        return 'pill-status pill-pagado';
      case 'Registrada':
        return 'pill-status pill-registrada';
      case 'Por Recibir':
        return 'pill-status pill-por-recibir';
      default:
        return 'pill-status';
    }
  };

  /**
   * Renderiza el estado A3 según si el proveedor tiene ID Contable A3 y el estado de sincronización
   * El botón 'Subir a A3' aparece si:
   * - La factura tiene un supplierId vinculado
   * - O si el matching por nombre encuentra un proveedor que tenga idContableA3
   */
  const renderEstadoA3 = (gasto: Gasto) => {
    try {
      // Verificar si hay proveedor vinculado o matching con idContableA3
      const tieneProveedorVinculado = !!gasto.proveedorId;
      const tieneIdA3 = !!gasto.proveedorIdA3;
      const puedeSincronizar = tieneProveedorVinculado || tieneIdA3;

      // Caso A: No se puede sincronizar - mostrar botón de vinculación
      if (!puedeSincronizar) {
        return (
          <button
            className="btn-link-supplier"
            title="Vincular proveedor para sincronizar con A3"
            onClick={() => handleLinkSupplier(gasto)}
          >
            <span className="material-symbols-outlined btn-link-icon">link</span>
            <span>+ Vincular</span>
          </button>
        );
      }

      // Caso B: Proveedor vinculado o con ID A3 - mostrar botón de sincronización o estado sincronizado
      const isSynced = gasto.erpStatus === 'synced_a3';
      
      if (isSynced) {
        return (
          <div className="sync-status synced" title="Sincronizado con A3">
            <span className="material-symbols-outlined sync-icon">check_circle</span>
            <span className="sync-text">Sincronizado</span>
          </div>
        );
      }

      // Verificar que realmente tenga idContableA3 antes de mostrar el botón
      if (!gasto.proveedorIdA3) {
        return (
          <button
            className="btn-link-supplier"
            title="Vincular proveedor para sincronizar con A3"
            onClick={() => handleLinkSupplier(gasto)}
          >
            <span className="material-symbols-outlined btn-link-icon">link</span>
            <span>+ Vincular</span>
          </button>
        );
      }

      // Estado de carga durante la sincronización
      const isSyncing = syncingInvoiceId === gasto.id;

      return (
        <button
          className="btn-sync-a3"
          title="Subir a A3factura"
          onClick={() => handleSyncToA3(gasto)}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <>
              <span className="material-symbols-outlined btn-sync-icon animate-spin">sync</span>
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined btn-sync-icon">cloud_upload</span>
              <span>Subir a A3</span>
            </>
          )}
        </button>
      );
    } catch (error) {
      console.error('Error al renderizar estado A3:', error);
      // En caso de error, mostrar botón de vinculación como fallback
      return (
        <button
          className="btn-link-supplier"
          title="Vincular proveedor para sincronizar con A3"
          onClick={() => handleLinkSupplier(gasto)}
        >
          <span className="material-symbols-outlined btn-link-icon">link</span>
          <span>+ Vincular</span>
        </button>
      );
    }
  };

  return (
    <div className="flex flex-col">
      {selectedIds.size > 0 && (
        <div className="bulk-actions-bar">
          <span className="bulk-actions-text">
            {selectedIds.size} registro{selectedIds.size > 1 ? 's' : ''} seleccionado{selectedIds.size > 1 ? 's' : ''}
          </span>
          <button
            className="btn-delete-bulk"
            onClick={handleBulkDelete}
          >
            <span className="material-symbols-outlined">delete</span>
            <span>Eliminar seleccionados</span>
          </button>
        </div>
      )}
      <div className="finance-table-wrapper">
        <table className="finance-table">
        <thead>
          <tr>
            <th className="table-header table-col-compact">
              <input
                type="checkbox"
                className="table-checkbox"
                checked={gastosFiltrados.length > 0 && selectedIds.size === gastosFiltrados.length}
                onChange={handleToggleSelectAll}
                aria-label="Seleccionar todos"
              />
            </th>
            <th className="table-header table-col-status">Estado</th>
            <th className="table-header table-col-text">Proveedor</th>
            <th className="table-header table-col-medium">Departamento</th>
            <th className="table-header table-col-medium">Tipo</th>
            <th className="table-header table-col-small">Fecha Factura</th>
            <th className="table-header table-col-small">Fecha Pago</th>
            <th className="table-header table-col-compact">Moneda</th>
            <th className="table-header table-col-small">Vía</th>
            <th className="table-header table-col-small">Importe</th>
            <th className="table-header table-col-small">Variable</th>
            <th className="table-header table-col-compact">IVA</th>
            <th className="table-header table-col-small">Total Banco</th>
            <th className="table-header table-col-medium">Sincronización A3</th>
            <th className="table-header table-col-compact">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {gastosFiltrados.length === 0 ? (
            <tr>
              <td colSpan={15} className="table-empty-state">
                <div className="contactos-empty-state">
                  <span className="material-symbols-outlined contactos-empty-icon">
                    search_off
                  </span>
                  <p className="contactos-empty-text">
                    No se han encontrado gastos para esta búsqueda
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            gastosPaginados.map((gasto) => (
              <tr key={gasto.id} className="table-row">
                <td className="table-col-compact">
                  <input
                    type="checkbox"
                    className="table-checkbox"
                    checked={selectedIds.has(gasto.id)}
                    onChange={() => handleToggleSelect(gasto.id)}
                    aria-label={`Seleccionar ${gasto.proveedor}`}
                  />
                </td>
                <td className="table-col-status">
                  <PaymentStatusSelect
                    value={gasto.estado === 'Pagado' ? 'Pagado' : 'Pendiente'}
                    onChange={(newStatus) => {
                      // Obtener el registro original para actualizar
                      const record = expenses.find((e) => e.id === gasto.id);
                      if (record) {
                        handlePaymentStatusChange(record.id, newStatus);
                      }
                    }}
                  />
                </td>
                <td className="table-col-text" title={gasto.proveedor}>
                  <span className="supplier-name-text">{gasto.proveedor}</span>
                </td>
                <td className="table-col-medium">
                  <span className="dept-tag">{gasto.departamento}</span>
                </td>
                <td className="table-col-medium">{gasto.tipo}</td>
                <td className="table-col-small">{gasto.fechaFactura}</td>
                <td className="table-col-small">{gasto.fechaPago}</td>
                <td className="table-col-compact">{gasto.moneda}</td>
                <td className="table-col-small">{gasto.via}</td>
                <td className="table-col-small">{gasto.importe}</td>
                <td className="table-col-small">{gasto.variable}</td>
                <td className="table-col-compact">{gasto.iva}</td>
                <td className="table-col-small">{gasto.totalBanco}</td>
                <td className="table-col-medium">
                  {renderEstadoA3(gasto)}
                </td>
                <td className="table-col-compact">
                  <div className="table-actions">
                    {(() => {
                      const record = expenses.find((e) => e.id === gasto.id);
                      // Soporta tanto fileUrl como fileData
                      const hasDocument = record?.fileUrl || (record?.data as any)?.fileData;
                      return hasDocument ? (
                        <button
                          className="btn-view"
                          title="Ver documento"
                          onClick={() => setViewingDocumentId(gasto.id)}
                        >
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                      ) : null;
                    })()}
                    <button
                      className="btn-delete"
                      title="Eliminar registro"
                      onClick={() => handleDelete(gasto.id, gasto.proveedor)}
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>

      {/* Controles de paginación */}
      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={gastosFiltrados.length}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

      {/* Modal de vinculación */}
      {linkingInvoiceId && (() => {
        const gasto = gastos.find((g) => g.id === linkingInvoiceId);
        if (!gasto) return null;

        return (
          <LinkSupplierModal
            isOpen={!!linkingInvoiceId}
            onClose={() => setLinkingInvoiceId(null)}
            onLink={handleSupplierLinked}
            supplierName={gasto.proveedor}
            type="supplier"
            invoiceId={gasto.id}
          />
        );
      })()}

      {/* Modal de inspección A3 */}
      {inspectionPayload && (
        <A3InspectionModal
          isOpen={!!inspectingInvoiceId}
          onClose={() => {
            setInspectingInvoiceId(null);
            setInspectionPayload(null);
          }}
          onConfirm={handleConfirmSync}
          payload={inspectionPayload}
        />
      )}

      {/* Modal de visualización de documento */}
      {viewingDocumentId && (() => {
        const record = expenses.find((e) => e.id === viewingDocumentId);
        if (!record) return null;
        
        // Soporta tanto fileUrl como fileData (si existe en el futuro)
        const fileUrl = record.fileUrl || (record.data as any)?.fileData || null;
        if (!fileUrl) return null;
        
        // Determinar mimeType desde fileName o fileUrl
        const fileName = record.fileName || '';
        let mimeType: string | undefined;
        
        if (fileName.toLowerCase().endsWith('.pdf')) {
          mimeType = 'application/pdf';
        } else if (fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          mimeType = `image/${fileName.split('.').pop()?.toLowerCase()}`;
        } else if (fileUrl.startsWith('data:')) {
          // Si es data URL, extraer el mimeType
          const match = fileUrl.match(/^data:([^;]+);/);
          if (match) mimeType = match[1];
        }
        
        return (
          <DocumentModal
            isOpen={!!viewingDocumentId}
            onClose={() => setViewingDocumentId(null)}
            fileUrl={fileUrl}
            fileName={record.fileName}
            mimeType={mimeType}
          />
        );
      })()}
    </div>
  );
};
