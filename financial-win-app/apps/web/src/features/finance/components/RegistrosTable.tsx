import React, { useMemo } from 'react';
import { useFinancial, type FinancialRecord, type ErpStatus, type PaymentStatus } from '../../../contexts/FinancialContext';
import { erpService, type InvoiceData } from '../../../services/erpIntegrationService';
import type { FilterValues } from './FilterPanel';
import { PaymentStatusSelect } from '../../../components/common/PaymentStatusSelect';

interface RegistrosTableProps {
  searchTerm?: string;
  filters?: FilterValues;
}

/**
 * Verifica si un documento fue procesado por Gemini
 * Un documento está procesado si tiene datos extraídos (supplier, total, etc.)
 * Funciona con todos los tipos de documentos: invoices, tickets, staff
 */
const isProcessedByGemini = (record: FinancialRecord): boolean => {
  // Para todos los tipos, verificamos que tenga datos básicos extraídos
  return !!(record.data.supplier && record.data.total);
};

export const RegistrosTable: React.FC<RegistrosTableProps> = ({ searchTerm = '', filters }) => {
  const { records, updateRecord } = useFinancial();

  /**
   * Convierte ExtractedData a InvoiceData para el servicio ERP
   */
  const convertToInvoiceData = (data: FinancialRecord['data']): InvoiceData => {
    return {
      supplier: data.supplier,
      total: data.total,
      invoiceNum: data.invoiceNum,
      cif: data.cif,
      vatId: data.vatId,
      origin: data.origin,
      department: data.department,
      expenseType: data.expenseType,
      issueDate: data.issueDate,
      concept: data.concept,
      base: data.base,
      currency: data.currency,
      vat: data.vat,
    };
  };

  /**
   * Obtiene la clase CSS para el estado ERP
   */
  const getErpStatusClass = (status: ErpStatus | undefined): string => {
    switch (status) {
      case 'pending':
        return 'erp-status-pending';
      case 'syncing':
        return 'erp-status-syncing';
      case 'synced_odoo':
        return 'erp-status-synced-odoo';
      case 'synced_a3':
        return 'erp-status-synced-a3';
      case 'error':
        return 'erp-status-error';
      default:
        return 'erp-status-pending';
    }
  };

  /**
   * Obtiene el texto para el estado ERP
   */
  const getErpStatusText = (status: ErpStatus | undefined): string => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'syncing':
        return 'Sincronizando...';
      case 'synced_odoo':
        return 'Sincronizado Odoo';
      case 'synced_a3':
        return 'Sincronizado A3';
      case 'error':
        return 'Error';
      default:
        return 'Pendiente';
    }
  };

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
   * Maneja la sincronización con el sistema ERP
   */
  const handleSync = async (docId: string, target: 'odoo' | 'a3') => {
    const record = records.find((r) => r.id === docId);
    if (!record || !isProcessedByGemini(record)) {
      console.warn('Documento no procesado por Gemini o no encontrado');
      return;
    }

    // Cambiar estado a 'syncing'
    updateRecord(docId, { erpStatus: 'syncing' });

    try {
      // Convertir datos a formato InvoiceData
      const invoiceData = convertToInvoiceData(record.data);

      // Llamar al servicio correspondiente
      const response = target === 'odoo' 
        ? await erpService.sendToOdoo(invoiceData)
        : await erpService.sendToA3(invoiceData);

      if (response.success) {
        // Actualizar estado según el sistema sincronizado
        const newStatus: ErpStatus = target === 'odoo' ? 'synced_odoo' : 'synced_a3';
        updateRecord(docId, { erpStatus: newStatus });
      } else {
        // Error en la sincronización
        updateRecord(docId, { erpStatus: 'error' });
      }
    } catch (error) {
      console.error(`Error al sincronizar con ${target}:`, error);
      updateRecord(docId, { erpStatus: 'error' });
    }
  };

  /**
   * Maneja el cambio de estado de pago
   * Actualiza directamente en el contexto (que persiste en localStorage)
   */
  const handlePaymentStatusChange = (docId: string, newStatus: PaymentStatus) => {
    updateRecord(docId, { paymentStatus: newStatus });
  };

  const getEstadoClass = (estado: string) => {
    switch (estado) {
      case 'VALIDADO':
        return 'status-pill pill-success';
      case 'PENDIENTE':
        return 'status-pill pill-warning';
      case 'RECHAZADO':
        return 'status-pill pill-danger';
      default:
        return 'status-pill';
    }
  };

  /**
   * Extrae el valor numérico del importe y lo convierte a string para búsqueda
   * Elimina símbolos de moneda (€, $), comas, espacios y convierte a string
   * Maneja decimales correctamente para que "50.5" encuentre "50.50" y viceversa
   * Ejemplo: "€1,500.00" -> "1500.00"
   */
  const extraerNumeroImporte = (importe: string): string => {
    // Eliminar símbolos de moneda, comas, espacios y convertir a número
    const numeroLimpio = importe
      .replace(/[€$£,\s]/g, '') // Eliminar símbolos de moneda, comas y espacios
      .trim();
    
    // Convertir a número y luego a string para normalizar decimales
    const numero = parseFloat(numeroLimpio);
    
    // Si es un número válido, devolver como string
    // parseFloat normaliza "50.50" a 50.5, pero para búsqueda mantenemos ambos formatos
    if (!isNaN(numero)) {
      // Devolver tanto el número normalizado como el original sin símbolos
      // Esto permite que "50.5" encuentre "50.50" y viceversa
      return numeroLimpio;
    }
    
    // Si no es un número válido, devolver el string limpio original
    return numeroLimpio;
  };

  /**
   * Convierte FinancialRecord a formato de tabla
   * Ahora incluye TODOS los tipos de documentos (invoices, tickets, staff)
   */
  const registrosFormateados = useMemo(() => {
    return records.map((record) => {
      const estado = record.data.supplier && record.data.total ? 'VALIDADO' : 'PENDIENTE';
      const importe = record.data.total 
        ? `${record.data.currency || 'EUR'} ${record.data.total}`
        : 'N/A';
      
      return {
        id: record.id,
        estado,
        paymentStatus: record.paymentStatus || 'Pendiente',
        tipoDocumento: getDocumentTypeLabel(record.documentType),
        documentType: record.documentType, // Guardar documentType original para filtrado
        departamento: record.data.department || 'N/A',
        nombreDocumento: record.data.supplier || record.fileName || 'Sin nombre',
        fechaRegistro: new Date(record.createdAt).toLocaleDateString('es-ES'),
        fechaRegistroOriginal: record.createdAt, // Guardar fecha original para filtrado
        usuario: record.data.supplier || 'N/A',
        importe,
        erpStatus: record.erpStatus || 'pending',
        isProcessed: isProcessedByGemini(record),
      };
    });
  }, [records]);

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
   * Filtra registros según el término de búsqueda y filtros avanzados
   * Busca en: Concepto, Categoría, Entidad/Cliente, e Importe (tanto texto como número)
   */
  const registrosFiltrados = useMemo(() => {
    let resultado = registrosFormateados;

    // Filtro por búsqueda de texto
    if (searchTerm.trim()) {
      const terminoBusqueda = searchTerm.toLowerCase().trim();
      
      resultado = resultado.filter((registro) => {
        // 1. Búsqueda en texto: Concepto (nombreDocumento)
        const coincideConcepto = registro.nombreDocumento
          .toLowerCase()
          .includes(terminoBusqueda);
        
        // 2. Búsqueda en texto: Categoría (tipoDocumento)
        const coincideCategoria = registro.tipoDocumento
          .toLowerCase()
          .includes(terminoBusqueda);
        
        // 3. Búsqueda en texto: Entidad/Cliente (usuario)
        const coincideEntidad = registro.usuario
          .toLowerCase()
          .includes(terminoBusqueda);
        
        // 4. Búsqueda en Importe: tanto en formato original como en número
        const importeOriginal = registro.importe.toLowerCase();
        const importeNumerico = extraerNumeroImporte(registro.importe).toLowerCase();
        
        // También normalizar el término de búsqueda para números (eliminar símbolos)
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
          fechaDesde.setHours(0, 0, 0, 0); // Inicio del día
          return fechaRegistro >= fechaDesde;
        });
      }
      if (filters.dateRange.to) {
        resultado = resultado.filter((registro) => {
          const fechaRegistro = new Date(registro.fechaRegistroOriginal);
          const fechaHasta = new Date(filters.dateRange.to);
          fechaHasta.setHours(23, 59, 59, 999); // Fin del día
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
          // Mapear nombres legibles del filtro a valores internos
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
  }, [registrosFormateados, searchTerm, filters]);

  return (
    <div className="table-wrapper">
      <table className="table-main">
        <thead>
          <tr>
            <th className="table-header table-col-small">Estado Validación</th>
            <th className="table-header table-col-payment-status">Estado</th>
            <th className="table-header table-col-medium">Tipo Documento</th>
            <th className="table-header table-col-medium">Departamento</th>
            <th className="table-header table-col-text">Nombre Documento</th>
            <th className="table-header table-col-small">Fecha Registro</th>
            <th className="table-header table-col-text">Usuario</th>
            <th className="table-header table-col-small">Importe</th>
            <th className="table-header table-col-medium">Estado ERP</th>
            <th className="table-header table-col-medium">Sincronizar</th>
            <th className="table-header table-col-compact">Acción</th>
          </tr>
        </thead>
        <tbody>
          {registrosFiltrados.length === 0 ? (
            <tr>
              <td colSpan={11} className="table-empty-state">
                <div className="contactos-empty-state">
                  <span className="material-symbols-outlined contactos-empty-icon">
                    search_off
                  </span>
                  <p className="contactos-empty-text">
                    No se han encontrado registros para esta búsqueda
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            registrosFiltrados.map((registro) => {
              const isSyncing = registro.erpStatus === 'syncing';
              const canSync = registro.isProcessed && !isSyncing;
              const isPaid = registro.paymentStatus === 'Pagado';
              
              return (
                <tr 
                  key={registro.id} 
                  className={`table-row ${isPaid ? 'table-row-paid' : ''}`}
                >
                  <td className="table-col-small">
                    <span className={getEstadoClass(registro.estado)}>
                      {registro.estado}
                    </span>
                  </td>
                  <td className="table-col-payment-status">
                    <PaymentStatusSelect
                      value={registro.paymentStatus as PaymentStatus}
                      onChange={(newStatus) => handlePaymentStatusChange(registro.id, newStatus)}
                    />
                  </td>
                  <td className="table-col-medium">{registro.tipoDocumento}</td>
                  <td className="table-col-medium">{registro.departamento}</td>
                  <td className="table-col-text" title={registro.nombreDocumento}>
                    {registro.nombreDocumento}
                  </td>
                  <td className="table-col-small">{registro.fechaRegistro}</td>
                  <td className="table-col-text" title={registro.usuario}>
                    {registro.usuario}
                  </td>
                  <td className="table-col-small">{registro.importe}</td>
                  <td className="table-col-medium">
                    <span className={getErpStatusClass(registro.erpStatus as ErpStatus)}>
                      {isSyncing && (
                        <span className="material-symbols-outlined animate-spin text-xs mr-1">
                          sync
                        </span>
                      )}
                      {getErpStatusText(registro.erpStatus as ErpStatus)}
                    </span>
                  </td>
                  <td className="table-col-medium">
                    <div className="btn-sync-group">
                      <button
                        className="btn-sync-odoo"
                        onClick={() => handleSync(registro.id, 'odoo')}
                        disabled={!canSync}
                        title={canSync ? 'Sincronizar con Odoo' : 'Documento no procesado o sincronizando'}
                      >
                        <span className="material-symbols-outlined text-sm">sync</span>
                        <span>Odoo</span>
                      </button>
                      <button
                        className="btn-sync-a3"
                        onClick={() => handleSync(registro.id, 'a3')}
                        disabled={!canSync}
                        title={canSync ? 'Sincronizar con A3' : 'Documento no procesado o sincronizando'}
                      >
                        <span className="material-symbols-outlined text-sm">sync</span>
                        <span>A3</span>
                      </button>
                    </div>
                  </td>
                  <td className="table-col-compact">
                    <button className="table-action-button">
                      <span className="material-symbols-outlined">visibility</span>
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
