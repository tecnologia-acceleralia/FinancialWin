import React, { useMemo } from 'react';
import { useFinancial, type PaymentStatus } from '../../../contexts/FinancialContext';
import type { FilterValues } from './FilterPanel';

interface Gasto {
  id: string;
  estado: 'Pagado' | 'Registrada' | 'Por Recibir';
  proveedor: string;
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
    proveedor: record.data.supplier || 'N/A',
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
  };
};

export const GastosTable: React.FC<GastosTableProps> = ({ searchTerm = '', filters }) => {
  const { expenses } = useFinancial();

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

  return (
    <div className="finance-table-wrapper">
      <table className="finance-table">
        <thead>
          <tr>
            <th className="table-header table-col-compact">Previsualizar</th>
            <th className="table-header table-col-small">Estado</th>
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
            gastosFiltrados.map((gasto) => (
              <tr key={gasto.id} className="table-row">
                <td className="table-col-compact">
                  <button className="table-action-button">
                    <span className="material-symbols-outlined">visibility</span>
                  </button>
                </td>
                <td className="table-col-small">
                  <span className={getEstadoClass(gasto.estado)}>
                    {gasto.estado}
                  </span>
                </td>
                <td className="table-col-text" title={gasto.proveedor}>
                  {gasto.proveedor}
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
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
