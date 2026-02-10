import React, { useMemo, useState, useCallback } from 'react';
import { useFinancial, type PaymentStatus } from '../../../contexts/FinancialContext';
import type { FilterValues } from './FilterPanel';
import { PaymentStatusSelect } from '../../../components/common/PaymentStatusSelect';
import { findSupplierByName } from '../../../utils/supplierMatching';
import { LinkSupplierModal } from '../../../components/common/LinkSupplierModal';
import { DataTablePagination } from '../../../components/common/DataTablePagination';
import { useToast } from '../../../contexts/ToastContext';
import { mapOdooStatus } from '../../../services/odooService';
import { useClientsQuery } from '../../../hooks/useClientsQuery';

interface Ingreso {
  id: string;
  estado: 'Borrador' | 'Publicado' | 'En proceso de pago' | 'Pagada' | 'Revertido';
  cliente: string;
  clienteId?: string; // ID del cliente vinculado directamente en la factura
  clienteMatch?: { id?: string; nombreComercial?: string; razonSocial?: string };
  factura: string;
  fechaFactura: string;
  fechaPago: string;
  vencimiento: string;
  importe: string;
  iva: string;
  total: string;
  totalPagado: string;
  saldo: string;
}

interface IngresosTableProps {
  searchTerm?: string;
  filters?: FilterValues;
  ingresos?: Ingreso[]; // Prop opcional para pasar datos directamente (desde Odoo)
  onPaymentStatusChange?: (recordId: string, newStatus: PaymentStatus) => void;
  onDelete?: (recordId: string) => void;
}

/**
 * Convierte un FinancialRecord a un Ingreso para la tabla
 * Solo procesa registros validados (que tienen supplier y total)
 */
const convertRecordToIngreso = (
  record: ReturnType<typeof useFinancial>['income'][0],
  clientes: Array<{ id?: string; nombreComercial?: string; razonSocial?: string }>
): Ingreso | null => {
  // Solo procesar registros validados
  if (!record.data.supplier || !record.data.total) {
    return null;
  }

  const total = parseFloat(record.data.total.toString() || '0');
  const base = parseFloat(record.data.base?.toString() || '0');
  const vat = parseFloat(record.data.vat?.toString() || '0');
  
  // Buscar el cliente con matching flexible
  const clientName = record.data.supplier;
  // Primero verificar si hay un clienteId vinculado directamente en la factura
  const clienteIdVinculado = (record.data as any).clientId;
  let clienteMatch: { id?: string; nombreComercial?: string; razonSocial?: string } | undefined;

  if (clienteIdVinculado) {
    // Si hay un clienteId vinculado, buscar el cliente completo desde la lista de clientes
    clienteMatch = clientes.find((c) => c.id === clienteIdVinculado);
  } else {
    // Si no hay clienteId vinculado, hacer matching por nombre
    clienteMatch = findSupplierByName(clientName, clientes);
  }
  
  // Mapear paymentStatus a estado de la tabla (para datos del contexto financiero)
  // Nota: Para datos de Odoo, se usa mapOdooStatus directamente
  const getEstado = (status: PaymentStatus | undefined): 'Borrador' | 'Publicado' | 'En proceso de pago' | 'Pagada' | 'Revertido' => {
    switch (status) {
      case 'Pagado':
        return 'Pagada';
      case 'Pendiente':
      default:
        return 'Publicado';
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

  const fechaFactura = record.data.issueDate 
    ? new Date(record.data.issueDate)
    : new Date(record.createdAt);
  
  // Calcular vencimiento (30 días después de la fecha de factura)
  const vencimiento = new Date(fechaFactura);
  vencimiento.setDate(vencimiento.getDate() + 30);

  const totalPagado = record.paymentStatus === 'Pagado' ? total : 0; // Mantener compatibilidad con datos del contexto
  const saldo = total - totalPagado;

  return {
    id: record.id,
    estado: getEstado(record.paymentStatus),
    cliente: clientName,
    clienteId: clienteIdVinculado,
    clienteMatch,
    factura: record.data.invoiceNum || `F-${record.id.slice(-6)}`,
    fechaFactura: fechaFactura.toLocaleDateString('es-ES'),
    fechaPago: record.paymentStatus === 'Pagado' 
      ? new Date(record.updatedAt).toLocaleDateString('es-ES')
      : '-', // Mantener compatibilidad con datos del contexto
    vencimiento: vencimiento.toLocaleDateString('es-ES'),
    importe: formatCurrency(base),
    iva: formatCurrency(vat),
    total: formatCurrency(total),
    totalPagado: formatCurrency(totalPagado),
    saldo: formatCurrency(saldo),
  };
};

export const IngresosTable: React.FC<IngresosTableProps> = ({ 
  searchTerm = '', 
  filters,
  ingresos: ingresosProp,
  onPaymentStatusChange: onPaymentStatusChangeProp,
  onDelete: onDeleteProp,
}) => {
  const financialContext = useFinancial();
  const { income, updateRecord, deleteRecord } = financialContext;
  const { showToast } = useToast();
  const { data: clientes = [] } = useClientsQuery();
  
  // Si se pasan ingresos como prop, usarlos directamente; si no, usar el contexto
  const usePropData = !!ingresosProp;
  const [linkingInvoiceId, setLinkingInvoiceId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  /**
   * Maneja el cambio de estado de pago
   * Actualiza directamente en el contexto (que persiste en localStorage) o llama al callback
   */
  const handlePaymentStatusChange = (recordId: string, newStatus: PaymentStatus) => {
    if (usePropData && onPaymentStatusChangeProp) {
      onPaymentStatusChangeProp(recordId, newStatus);
    } else if (!usePropData) {
      updateRecord(recordId, { paymentStatus: newStatus });
    }
  };

  /**
   * Maneja la eliminación de un registro
   * Pide confirmación antes de eliminar
   */
  const handleDelete = (recordId: string, cliente: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el registro de ${cliente}?`)) {
      if (usePropData && onDeleteProp) {
        onDeleteProp(recordId);
      } else if (!usePropData) {
        deleteRecord(recordId);
      }
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
   * Maneja la vinculación de cliente
   */
  const handleLinkClient = (ingreso: Ingreso) => {
    setLinkingInvoiceId(ingreso.id);
  };

  /**
   * Callback cuando se vincula un cliente
   * Actualiza directamente el registro en el FinancialContext añadiendo clientId al objeto data
   */
  const handleClientLinked = (clientId: string, clientA3Id: string, invoiceId: string) => {
    if (!invoiceId) return;

    // Solo funciona con datos del contexto financiero
    if (usePropData) {
      showToast('La vinculación de clientes no está disponible para datos de Odoo', 'info');
      setLinkingInvoiceId(null);
      return;
    }

    // Actualizar el registro añadiendo clientId al objeto data
    const record = income.find((i) => i.id === invoiceId);
    if (!record) {
      console.warn('No se encontró el registro para actualizar:', invoiceId);
      return;
    }

    // Actualizar el registro añadiendo clientId al objeto data
    updateRecord(invoiceId, {
      data: {
        ...record.data,
        clientId: clientId,
      } as any,
    });

    // El toast de éxito se muestra desde el modal (más específico con el nombre del cliente)
    setLinkingInvoiceId(null);
  };

  // Convertir registros a formato de tabla
  const ingresos = useMemo(() => {
    if (usePropData && ingresosProp) {
      return ingresosProp;
    }
    return income
      .map((record) => convertRecordToIngreso(record, clientes))
      .filter((ingreso): ingreso is Ingreso => ingreso !== null);
  }, [income, ingresosProp, usePropData, clientes]);

  const ingresosFiltrados = useMemo(() => {
    let resultado = ingresos;

    // Filtro por búsqueda de texto
    if (searchTerm.trim()) {
      const busquedaLower = searchTerm.toLowerCase().trim();
      resultado = resultado.filter(
        (ingreso) =>
          ingreso.cliente.toLowerCase().includes(busquedaLower) ||
          ingreso.factura.toLowerCase().includes(busquedaLower) ||
          ingreso.estado.toLowerCase().includes(busquedaLower)
      );
    }

    // Aplicar filtros avanzados si existen
    if (filters) {
      // Filtro por rango de fechas
      if (filters.dateRange.from) {
        resultado = resultado.filter((ingreso) => {
          const fechaFactura = new Date(ingreso.fechaFactura);
          const fechaDesde = new Date(filters.dateRange.from);
          fechaDesde.setHours(0, 0, 0, 0);
          return fechaFactura >= fechaDesde;
        });
      }
      if (filters.dateRange.to) {
        resultado = resultado.filter((ingreso) => {
          const fechaFactura = new Date(ingreso.fechaFactura);
          const fechaHasta = new Date(filters.dateRange.to);
          fechaHasta.setHours(23, 59, 59, 999);
          return fechaFactura <= fechaHasta;
        });
      }

      // Filtro por categorías (no aplicable a ingresos, pero mantenemos la estructura)
      if (filters.categories.length > 0) {
        // Los ingresos no tienen categorías en el modelo actual
        // Se puede extender en el futuro
      }

      // Filtro por estados
      if (filters.status.length > 0) {
        resultado = resultado.filter((ingreso) =>
          filters.status.includes(ingreso.estado)
        );
      }

      // Filtro por rango de importe (usando el campo 'total')
      if (filters.amountRange.min !== null) {
        resultado = resultado.filter((ingreso) => {
          const importeNum = parseFloat(
            ingreso.total.replace(/[€,]/g, '').trim()
          );
          return importeNum >= filters.amountRange.min!;
        });
      }
      if (filters.amountRange.max !== null) {
        resultado = resultado.filter((ingreso) => {
          const importeNum = parseFloat(
            ingreso.total.replace(/[€,]/g, '').trim()
          );
          return importeNum <= filters.amountRange.max!;
        });
      }
    }

    return resultado;
  }, [ingresos, searchTerm, filters]);

  // Resetear a página 1 cuando cambian los filtros o búsqueda
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  // Calcular datos paginados
  const totalPages = Math.ceil(ingresosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const ingresosPaginados = useMemo(() => {
    return ingresosFiltrados.slice(startIndex, endIndex);
  }, [ingresosFiltrados, startIndex, endIndex]);

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
    const visibleIds = new Set(ingresosFiltrados.map((i) => i.id));
    setSelectedIds((prev) => {
      const filtered = new Set([...prev].filter((id) => visibleIds.has(id)));
      return filtered.size !== prev.size ? filtered : prev;
    });
  }, [ingresosFiltrados]);

  /**
   * Maneja la selección/deselección de todas las filas
   */
  const handleToggleSelectAll = useCallback(() => {
    if (selectedIds.size === ingresosFiltrados.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ingresosFiltrados.map((i) => i.id)));
    }
  }, [selectedIds.size, ingresosFiltrados]);

  const getEstadoClass = (estado: Ingreso['estado']) => {
    switch (estado) {
      case 'Pagada':
        return 'pill-status pill-pagado';
      case 'Publicado':
        return 'pill-status pill-registrada';
      case 'En proceso de pago':
        return 'pill-status pill-en-proceso';
      case 'Borrador':
        return 'pill-status pill-borrador';
      case 'Revertido':
        return 'pill-status pill-revertido';
      default:
        return 'pill-status';
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
                checked={ingresosFiltrados.length > 0 && selectedIds.size === ingresosFiltrados.length}
                onChange={handleToggleSelectAll}
                aria-label="Seleccionar todos"
              />
            </th>
            <th className="table-header table-col-status">Estado</th>
            <th className="table-header table-col-text">Cliente</th>
            <th className="table-header table-col-small">Factura</th>
            <th className="table-header table-col-small">Fecha Factura</th>
            <th className="table-header table-col-small">Fecha Pago</th>
            <th className="table-header table-col-small">Vencimiento</th>
            <th className="table-header table-col-small">Importe</th>
            <th className="table-header table-col-compact">IVA</th>
            <th className="table-header table-col-small">Total</th>
            <th className="table-header table-col-small">Total Pagado</th>
            <th className="table-header table-col-small">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {ingresosFiltrados.length === 0 ? (
            <tr>
              <td colSpan={12} className="table-empty-state">
                <div className="contactos-empty-state">
                  <span className="material-symbols-outlined contactos-empty-icon">
                    search_off
                  </span>
                  <p className="contactos-empty-text">
                    No se han encontrado ingresos para esta búsqueda
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            ingresosPaginados.map((ingreso) => (
              <tr key={ingreso.id} className="table-row">
                <td className="table-col-compact">
                  <input
                    type="checkbox"
                    className="table-checkbox"
                    checked={selectedIds.has(ingreso.id)}
                    onChange={() => handleToggleSelect(ingreso.id)}
                    aria-label={`Seleccionar ${ingreso.cliente}`}
                  />
                </td>
                <td className="table-col-status">
                  {usePropData ? (
                    <span className={getEstadoClass(ingreso.estado)}>
                      {ingreso.estado}
                    </span>
                  ) : (
                    <PaymentStatusSelect
                      value={ingreso.estado === 'Pagada' ? 'Pagado' : 'Pendiente'}
                      onChange={(newStatus) => {
                        handlePaymentStatusChange(ingreso.id, newStatus);
                      }}
                    />
                  )}
                </td>
                <td className="table-col-text" title={ingreso.cliente}>
                  <span className="supplier-name-text">{ingreso.cliente}</span>
                </td>
                <td className="table-col-small">{ingreso.factura}</td>
                <td className="table-col-small">{ingreso.fechaFactura}</td>
                <td className="table-col-small">{ingreso.fechaPago}</td>
                <td className="table-col-small">{ingreso.vencimiento}</td>
                <td className="table-col-small">{ingreso.importe}</td>
                <td className="table-col-compact">{ingreso.iva}</td>
                <td className="table-col-small">{ingreso.total}</td>
                <td className="table-col-small">{ingreso.totalPagado}</td>
                <td className="table-col-small">{ingreso.saldo}</td>
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
        totalItems={ingresosFiltrados.length}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

      {/* Modal de vinculación */}
      {linkingInvoiceId && (() => {
        const ingreso = ingresos.find((i) => i.id === linkingInvoiceId);
        if (!ingreso) return null;

        return (
          <LinkSupplierModal
            isOpen={!!linkingInvoiceId}
            onClose={() => setLinkingInvoiceId(null)}
            onLink={handleClientLinked}
            supplierName={ingreso.cliente}
            type="client"
            invoiceId={ingreso.id}
          />
        );
      })()}

    </div>
  );
};
