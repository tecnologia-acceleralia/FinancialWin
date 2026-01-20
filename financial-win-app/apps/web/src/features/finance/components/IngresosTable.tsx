import React, { useMemo } from 'react';
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

const datosPrueba: Ingreso[] = [
  {
    id: '1',
    estado: 'Pagado',
    cliente: 'Tech Solutions S.L.',
    factura: 'F2024-5000',
    fechaFactura: '2024-01-15',
    fechaPago: '2024-01-20',
    vencimiento: '2024-02-15',
    importe: '542.72 €',
    iva: '113.97 €',
    total: '656.69 €',
    totalPagado: '656.69 €',
    saldo: '0.00 €',
  },
  {
    id: '2',
    estado: 'Anulada',
    cliente: 'Global Corp',
    factura: 'F2024-5001',
    fechaFactura: '2024-02-10',
    fechaPago: '-',
    vencimiento: '2024-03-10',
    importe: '8,209.11 €',
    iva: '1,723.91 €',
    total: '9,933.02 €',
    totalPagado: '0.00 €',
    saldo: '9,933.02 €',
  },
  {
    id: '3',
    estado: 'Pendiente Pago',
    cliente: 'StartUp Inc',
    factura: 'F2024-5002',
    fechaFactura: '2024-03-05',
    fechaPago: '-',
    vencimiento: '2024-04-05',
    importe: '4,397.41 €',
    iva: '923.46 €',
    total: '5,320.87 €',
    totalPagado: '0.00 €',
    saldo: '5,320.87 €',
  },
];

interface IngresosTableProps {
  searchTerm?: string;
  filters?: FilterValues;
}

export const IngresosTable: React.FC<IngresosTableProps> = ({ searchTerm = '', filters }) => {
  const ingresosFiltrados = useMemo(() => {
    let resultado = datosPrueba;

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
          return fechaFactura >= fechaDesde;
        });
      }
      if (filters.dateRange.to) {
        resultado = resultado.filter((ingreso) => {
          const fechaFactura = new Date(ingreso.fechaFactura);
          const fechaHasta = new Date(filters.dateRange.to);
          fechaHasta.setHours(23, 59, 59, 999); // Incluir todo el día
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
  }, [searchTerm, filters]);
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
            <th className="table-header">Previsualizar</th>
            <th className="table-header">Estado</th>
            <th className="table-header">Cliente</th>
            <th className="table-header">Factura</th>
            <th className="table-header">Fecha Factura</th>
            <th className="table-header">Fecha Pago</th>
            <th className="table-header">Vencimiento</th>
            <th className="table-header">Importe</th>
            <th className="table-header">IVA</th>
            <th className="table-header">Total</th>
            <th className="table-header">Total Pagado</th>
            <th className="table-header">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {ingresosFiltrados.map((ingreso) => (
            <tr key={ingreso.id} className="table-row">
              <td>
                <button className="table-action-button">
                  <span className="material-symbols-outlined">visibility</span>
                </button>
              </td>
              <td>
                <span className={getEstadoClass(ingreso.estado)}>
                  {ingreso.estado}
                </span>
              </td>
              <td>{ingreso.cliente}</td>
              <td>{ingreso.factura}</td>
              <td>{ingreso.fechaFactura}</td>
              <td>{ingreso.fechaPago}</td>
              <td>{ingreso.vencimiento}</td>
              <td>{ingreso.importe}</td>
              <td>{ingreso.iva}</td>
              <td>{ingreso.total}</td>
              <td>{ingreso.totalPagado}</td>
              <td>{ingreso.saldo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
