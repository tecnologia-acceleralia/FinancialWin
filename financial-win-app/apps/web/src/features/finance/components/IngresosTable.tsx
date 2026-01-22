import React, { useMemo } from 'react';
import { useFinancial, type PaymentStatus } from '../../../contexts/FinancialContext';
import type { FilterValues } from './FilterPanel';

interface Ingreso {
  id: string;
  estado: 'Pagado' | 'Anulada' | 'Pendiente Pago';
  cliente: string;
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
    cliente: record.data.supplier || 'N/A',
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
  };
};

export const IngresosTable: React.FC<IngresosTableProps> = ({ searchTerm = '', filters }) => {
  const { income } = useFinancial();

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

  return (
    <div className="finance-table-wrapper">
      <table className="finance-table">
        <thead>
          <tr>
            <th className="table-header table-col-compact">Previsualizar</th>
            <th className="table-header table-col-small">Estado</th>
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
            ingresosFiltrados.map((ingreso) => (
              <tr key={ingreso.id} className="table-row">
                <td className="table-col-compact">
                  <button className="table-action-button">
                    <span className="material-symbols-outlined">visibility</span>
                  </button>
                </td>
                <td className="table-col-small">
                  <span className={getEstadoClass(ingreso.estado)}>
                    {ingreso.estado}
                  </span>
                </td>
                <td className="table-col-text" title={ingreso.cliente}>
                  {ingreso.cliente}
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
  );
};
