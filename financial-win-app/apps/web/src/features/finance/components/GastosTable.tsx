import React, { useMemo, useState, useCallback } from 'react';
import type { FilterValues } from './FilterPanel';
import { PaymentStatusSelect } from '../../../components/common/PaymentStatusSelect';
import { findSupplierByName } from '../../../utils/supplierMatching';
import { LinkSupplierModal } from '../../../components/common/LinkSupplierModal';
import { DocumentModal } from '../../../components/common/DocumentModal';
import { DataTablePagination } from '../../../components/common/DataTablePagination';
import { useToast } from '../../../contexts/ToastContext';
import type { OdooInvoice } from '../../../services/odooService';
import { mapOdooStatus } from '../../../services/odooService';
import { useSuppliersQuery } from '../../../hooks/useSuppliersQuery';

interface Gasto {
  id: string;
  estado: 'Borrador' | 'Publicado' | 'En proceso de pago' | 'Pagada' | 'Revertido';
  proveedor: string;
  proveedorId?: string; // ID del proveedor vinculado directamente en la factura
  proveedorMatch?: { 
    id?: string; 
    nombreComercial?: string; 
    razonSocial?: string;
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
}

interface GastosTableProps {
  searchTerm?: string;
  filters?: FilterValues;
  invoices?: OdooInvoice[];
}

/**
 * Obtiene las clases CSS para el badge de departamento según el departamento
 */
const getDepartmentBadgeClasses = (departamento: string): string => {
  const dept = departamento.toLowerCase();
  
  if (dept === 'it') {
    return 'dept-tag dept-tag-it';
  } else if (dept === 'rrhh') {
    return 'dept-tag dept-tag-rrhh';
  } else if (dept === 'marketing') {
    return 'dept-tag dept-tag-marketing';
  } else if (dept === 'administración' || dept === 'administracion') {
    return 'dept-tag dept-tag-administracion';
  } else if (dept === 'ventas') {
    return 'dept-tag dept-tag-ventas';
  } else if (dept === 'operaciones') {
    return 'dept-tag dept-tag-operaciones';
  } else if (dept === 'dirección' || dept === 'direccion') {
    return 'dept-tag dept-tag-direccion';
  }
  
  // Por defecto
  return 'dept-tag';
};

/**
 * Convierte una factura de Odoo a un Gasto para la tabla
 */
const convertInvoiceToGasto = (
  invoice: OdooInvoice,
  proveedores: Array<{ id?: string; nombreComercial?: string; razonSocial?: string }>
): Gasto => {
  // Mapear estado usando la función auxiliar
  const estado = mapOdooStatus(invoice.state, invoice.payment_state);

  // Obtener nombre del proveedor
  const supplierName = invoice.partner_id?.[1] || 'Sin proveedor';
  const supplierId = invoice.partner_id?.[0]?.toString();

  // Buscar el proveedor con matching
  let proveedorMatch: {
    id?: string;
    nombreComercial?: string;
    razonSocial?: string;
  } | undefined;

  // Buscar por ID de Odoo si está disponible
  if (supplierId) {
    proveedorMatch = proveedores.find((s) => {
      // Buscar por ID de Odoo si existe en los datos del proveedor
      return (s as any).odooId === supplierId || s.id === supplierId;
    });
  }
  
  // Si no se encuentra por ID, buscar por nombre
  if (!proveedorMatch) {
    proveedorMatch = findSupplierByName(supplierName, proveedores);
  }

  // Formatear fecha
  const fechaFactura = invoice.invoice_date
    ? new Date(invoice.invoice_date).toLocaleDateString('es-ES')
    : '-';

  // Obtener moneda
  const currency = invoice.currency_id?.[1] || 'EUR';

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Para facturas de Odoo, no tenemos desglose de base/IVA, así que usamos el total
  const total = invoice.amount_total || 0;

  // CRÍTICO: Usar departamento_zaffra en lugar de 'N/A'
  // El departamento viene mapeado desde getZaffraDepartment en odooService
  const departamento = invoice.departamento_zaffra || 'Operaciones'; // Fallback a Operaciones si no hay departamento

  return {
    id: invoice.id.toString(),
    estado,
    proveedor: supplierName,
    proveedorId: supplierId,
    proveedorMatch,
    departamento, // Usar departamento_zaffra mapeado
    tipo: invoice.categoria_zaffra || 'Otros', // Usar categoria_zaffra si está disponible
    fechaFactura,
    fechaPago: estado === 'Pagada' ? fechaFactura : '-', // Odoo no tiene fecha de pago separada
    moneda: currency,
    via: 'Transferencia',
    importe: formatCurrency(total), // Sin desglose, usamos el total
    variable: formatCurrency(0),
    iva: formatCurrency(0), // Sin desglose de IVA
    totalBanco: formatCurrency(total),
  };
};

export const GastosTable: React.FC<GastosTableProps> = ({ searchTerm = '', filters, invoices = [] }) => {
  const { showToast } = useToast();
  const { data: proveedores = [] } = useSuppliersQuery();
  const [linkingInvoiceId, setLinkingInvoiceId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  /**
   * Maneja el cambio de estado de pago
   * Nota: Con datos de Odoo, esto no se puede actualizar directamente desde la app
   */
  const handlePaymentStatusChange = (recordId: string, newStatus: 'Pagado' | 'Pendiente') => {
    showToast('Los estados de pago se gestionan desde Odoo', 'info');
  };

  /**
   * Maneja la eliminación de un registro
   * Nota: Con datos de Odoo, esto no se puede eliminar desde la app
   */
  const handleDelete = (recordId: string, proveedor: string) => {
    showToast('Las facturas se gestionan desde Odoo. No se pueden eliminar desde aquí.', 'info');
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
   * Maneja la vinculación de proveedor
   */
  const handleLinkSupplier = (gasto: Gasto) => {
    setLinkingInvoiceId(gasto.id);
  };

  /**
   * Callback cuando se vincula un proveedor
   * Nota: Con datos de Odoo, esto solo actualiza la vista local, no persiste en Odoo
   */
  const handleSupplierLinked = (supplierId: string, supplierA3Id: string, invoiceId: string) => {
    if (!invoiceId) return;

    // Nota: Con datos de Odoo, no podemos actualizar directamente
    // Esto solo serviría para mostrar el proveedor vinculado en la vista
    showToast('El proveedor se ha vinculado localmente. Para persistir, actualiza en Odoo.', 'info');
    setLinkingInvoiceId(null);
  };

  // Convertir facturas de Odoo a formato de tabla
  const gastos = useMemo(() => {
    return invoices.map((invoice) => convertInvoiceToGasto(invoice, proveedores));
  }, [invoices, proveedores]);

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
          </tr>
        </thead>
        <tbody>
          {gastosFiltrados.length === 0 ? (
            <tr>
              <td colSpan={13} className="table-empty-state">
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
                  <span className={getEstadoClass(gasto.estado)}>
                    {gasto.estado}
                  </span>
                </td>
                <td className="table-col-text" title={gasto.proveedor}>
                  <span className="supplier-name-text">{gasto.proveedor}</span>
                </td>
                <td className="table-col-medium">
                  <span className={getDepartmentBadgeClasses(gasto.departamento)}>
                    {gasto.departamento}
                  </span>
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


      {/* Modal de visualización de documento - No disponible para facturas de Odoo */}
    </div>
  );
};
