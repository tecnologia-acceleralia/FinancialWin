import React, { useMemo, useState } from 'react';
import { useFinancial, type PaymentStatus, type ErpStatus } from '../../../contexts/FinancialContext';
import type { FilterValues } from './FilterPanel';
import { PaymentStatusSelect } from '../../../components/common/PaymentStatusSelect';
import { findSupplierByName } from '../../../utils/supplierMatching';
import { a3Service } from '../../../services/a3Service';
import { LinkSupplierModal } from '../../../components/common/LinkSupplierModal';
import { useToast } from '../../../contexts/ToastContext';

interface Ingreso {
  id: string;
  estado: 'Pagado' | 'Anulada' | 'Pendiente Pago';
  cliente: string;
  clienteId?: string; // ID del cliente vinculado directamente en la factura
  clienteIdA3?: string;
  clienteMatch?: { id?: string; nombreComercial?: string; razonSocial?: string; idContableA3?: string };
  factura: string;
  fechaFactura: string;
  fechaPago: string;
  vencimiento: string;
  importe: string;
  iva: string;
  total: string;
  totalPagado: string;
  saldo: string;
  erpStatus?: ErpStatus;
}

interface IngresosTableProps {
  searchTerm?: string;
  filters?: FilterValues;
}

/**
 * Convierte un FinancialRecord a un Ingreso para la tabla
 * Solo procesa registros validados (que tienen supplier y total)
 */
const convertRecordToIngreso = (record: ReturnType<typeof useFinancial>['income'][0]): Ingreso | null => {
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
  let clienteMatch: { id?: string; nombreComercial?: string; razonSocial?: string; idContableA3?: string } | undefined;
  let clienteIdA3: string | undefined;

  if (clienteIdVinculado) {
    // Si hay un clienteId vinculado, buscar el cliente completo desde localStorage
    try {
      const stored = localStorage.getItem('zaffra_clients');
      if (stored) {
        const clients = JSON.parse(stored) as Array<{
          id?: string;
          nombreComercial?: string;
          razonSocial?: string;
          idContableA3?: string;
        }>;
        clienteMatch = clients.find((c) => c.id === clienteIdVinculado);
        clienteIdA3 = clienteMatch?.idContableA3;
      }
    } catch (error) {
      console.error('Error al buscar cliente vinculado:', error);
    }
  } else {
    // Si no hay clienteId vinculado, hacer matching por nombre
    clienteMatch = findSupplierByName(clientName, 'zaffra_clients');
    clienteIdA3 = clienteMatch?.idContableA3;
  }
  
  // Mapear paymentStatus a estado de la tabla
  const getEstado = (status: PaymentStatus | undefined): 'Pagado' | 'Anulada' | 'Pendiente Pago' => {
    switch (status) {
      case 'Pagado':
        return 'Pagado';
      case 'Pendiente':
      default:
        return 'Pendiente Pago';
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

  const totalPagado = record.paymentStatus === 'Pagado' ? total : 0;
  const saldo = total - totalPagado;

  return {
    id: record.id,
    estado: getEstado(record.paymentStatus),
    cliente: clientName,
    clienteId: clienteIdVinculado,
    clienteIdA3,
    clienteMatch,
    factura: record.data.invoiceNum || `F-${record.id.slice(-6)}`,
    fechaFactura: fechaFactura.toLocaleDateString('es-ES'),
    fechaPago: record.paymentStatus === 'Pagado' 
      ? new Date(record.updatedAt).toLocaleDateString('es-ES')
      : '-',
    vencimiento: vencimiento.toLocaleDateString('es-ES'),
    importe: formatCurrency(base),
    iva: formatCurrency(vat),
    total: formatCurrency(total),
    totalPagado: formatCurrency(totalPagado),
    saldo: formatCurrency(saldo),
    erpStatus: record.erpStatus,
  };
};

export const IngresosTable: React.FC<IngresosTableProps> = ({ searchTerm = '', filters }) => {
  const { income, updateRecord } = useFinancial();
  const { showToast } = useToast();
  const [linkingInvoiceId, setLinkingInvoiceId] = useState<string | null>(null);
  const [syncingInvoiceId, setSyncingInvoiceId] = useState<string | null>(null);

  /**
   * Maneja el cambio de estado de pago
   * Actualiza directamente en el contexto (que persiste en localStorage)
   */
  const handlePaymentStatusChange = (recordId: string, newStatus: PaymentStatus) => {
    updateRecord(recordId, { paymentStatus: newStatus });
  };

  /**
   * Maneja la sincronización con A3
   * Actualiza el campo erpStatus de la factura a 'synced_a3'
   * Incluye efecto de carga simulado y toast de éxito
   */
  const handleSyncToA3 = async (ingreso: Ingreso) => {
    if (!ingreso.clienteIdA3) {
      console.warn('No se puede sincronizar: cliente sin ID A3');
      return;
    }

    const record = income.find((i) => i.id === ingreso.id);
    if (!record) return;

    // Activar estado de carga
    setSyncingInvoiceId(ingreso.id);

    try {
      // Simular tiempo de comunicación con el servidor (1.5 segundos)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      await a3Service.syncSaleInvoice(record, ingreso.clienteIdA3);
      
      // Actualizar estado de sincronización a 'synced_a3'
      updateRecord(ingreso.id, { erpStatus: 'synced_a3' });
      
      // Mostrar toast de éxito después de que termine la animación de carga
      showToast('Factura contabilizada en A3factura.', 'success');
    } catch (error) {
      console.error('Error al sincronizar con A3:', error);
      updateRecord(ingreso.id, { erpStatus: 'error' });
      showToast('Error al sincronizar la factura con A3factura', 'error');
    } finally {
      // Desactivar estado de carga
      setSyncingInvoiceId(null);
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
    return income
      .map(convertRecordToIngreso)
      .filter((ingreso): ingreso is Ingreso => ingreso !== null);
  }, [income]);

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

  const getEstadoClass = (estado: Ingreso['estado']) => {
    switch (estado) {
      case 'Pagado':
        return 'pill-status pill-pagado';
      case 'Anulada':
        return 'pill-status pill-anulada';
      case 'Pendiente Pago':
        return 'pill-status pill-pendiente-envio';
      default:
        return 'pill-status';
    }
  };

  /**
   * Renderiza el estado A3 según si el cliente tiene ID Contable A3 y el estado de sincronización
   * El botón 'Subir a A3' aparece si:
   * - La factura tiene un clientId vinculado
   * - O si el matching por nombre encuentra un cliente que tenga idContableA3
   */
  const renderEstadoA3 = (ingreso: Ingreso) => {
    try {
      // Verificar si hay cliente vinculado o matching con idContableA3
      const tieneClienteVinculado = !!ingreso.clienteId;
      const tieneIdA3 = !!ingreso.clienteIdA3;
      const puedeSincronizar = tieneClienteVinculado || tieneIdA3;

      // Caso A: No se puede sincronizar - mostrar botón de vinculación
      if (!puedeSincronizar) {
        return (
          <button
            className="btn-link-supplier"
            title="Vincular cliente para sincronizar con A3"
            onClick={() => handleLinkClient(ingreso)}
          >
            <span className="material-symbols-outlined btn-link-icon">link</span>
            <span>+ Vincular</span>
          </button>
        );
      }

      // Caso B: Cliente vinculado o con ID A3 - mostrar botón de sincronización o estado sincronizado
      const isSynced = ingreso.erpStatus === 'synced_a3';
      
      if (isSynced) {
        return (
          <div className="sync-status synced" title="Sincronizado con A3">
            <span className="material-symbols-outlined sync-icon">check_circle</span>
            <span className="sync-text">Sincronizado</span>
          </div>
        );
      }

      // Verificar que realmente tenga idContableA3 antes de mostrar el botón
      if (!ingreso.clienteIdA3) {
        return (
          <button
            className="btn-link-supplier"
            title="Vincular cliente para sincronizar con A3"
            onClick={() => handleLinkClient(ingreso)}
          >
            <span className="material-symbols-outlined btn-link-icon">link</span>
            <span>+ Vincular</span>
          </button>
        );
      }

      // Estado de carga durante la sincronización
      const isSyncing = syncingInvoiceId === ingreso.id;

      return (
        <button
          className="btn-sync-a3"
          title="Subir a A3factura"
          onClick={() => handleSyncToA3(ingreso)}
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
          title="Vincular cliente para sincronizar con A3"
          onClick={() => handleLinkClient(ingreso)}
        >
          <span className="material-symbols-outlined btn-link-icon">link</span>
          <span>+ Vincular</span>
        </button>
      );
    }
  };

  return (
    <div className="finance-table-wrapper">
      <table className="finance-table">
        <thead>
          <tr>
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
            <th className="table-header table-col-medium">Sincronización A3</th>
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
            ingresosFiltrados.map((ingreso) => (
              <tr key={ingreso.id} className="table-row">
                <td className="table-col-status">
                  <PaymentStatusSelect
                    value={ingreso.estado === 'Pagado' ? 'Pagado' : 'Pendiente'}
                    onChange={(newStatus) => {
                      // Obtener el registro original para actualizar
                      const record = income.find((i) => i.id === ingreso.id);
                      if (record) {
                        handlePaymentStatusChange(record.id, newStatus);
                      }
                    }}
                  />
                </td>
                <td className="table-col-text" title={ingreso.cliente}>
                  <button
                    className="supplier-name-link"
                    onClick={() => {
                      // TODO: Implementar modal de previsualización
                      const record = income.find((i) => i.id === ingreso.id);
                      if (record) {
                        console.log('Abrir previsualización:', record.id, record.fileUrl);
                        // Aquí se abrirá el modal de previsualización
                      }
                    }}
                  >
                    <span className="supplier-name-text">{ingreso.cliente}</span>
                    <span className="material-symbols-outlined supplier-name-icon">visibility</span>
                  </button>
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
                <td className="table-col-medium">
                  {renderEstadoA3(ingreso)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

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
