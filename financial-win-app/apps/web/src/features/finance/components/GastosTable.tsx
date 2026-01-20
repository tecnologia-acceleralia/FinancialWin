import React, { useMemo } from 'react';
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

const datosPrueba: Gasto[] = [
  {
    id: '1',
    estado: 'Pagado',
    proveedor: 'Amazon AWS',
    departamento: 'IT',
    tipo: 'Licencias',
    fechaFactura: '2024-01-10',
    fechaPago: '2024-01-15',
    moneda: 'EUR',
    via: 'Transferencia',
    importe: '€1,200.00',
    variable: '€0.00',
    iva: '€252.00',
    totalBanco: '€1,452.00',
  },
  {
    id: '2',
    estado: 'Registrada',
    proveedor: 'Google Cloud',
    departamento: 'Operaciones',
    tipo: 'Financiero',
    fechaFactura: '2024-02-11',
    fechaPago: '2024-02-20',
    moneda: 'EUR',
    via: 'Cheque',
    importe: '€850.00',
    variable: '€50.00',
    iva: '€189.00',
    totalBanco: '€1,089.00',
  },
  {
    id: '3',
    estado: 'Por Recibir',
    proveedor: 'Salesforce',
    departamento: 'Ventas',
    tipo: 'Proveedor Ext.',
    fechaFactura: '2024-03-12',
    fechaPago: '2024-03-25',
    moneda: 'EUR',
    via: 'Transferencia',
    importe: '€2,500.00',
    variable: '€100.00',
    iva: '€546.00',
    totalBanco: '€3,146.00',
  },
];

interface GastosTableProps {
  searchTerm?: string;
  filters?: FilterValues;
}

export const GastosTable: React.FC<GastosTableProps> = ({ searchTerm = '', filters }) => {
  const gastosFiltrados = useMemo(() => {
    let resultado = datosPrueba;

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
          return fechaFactura >= fechaDesde;
        });
      }
      if (filters.dateRange.to) {
        resultado = resultado.filter((gasto) => {
          const fechaFactura = new Date(gasto.fechaFactura);
          const fechaHasta = new Date(filters.dateRange.to);
          fechaHasta.setHours(23, 59, 59, 999); // Incluir todo el día
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
  }, [searchTerm, filters]);
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
            <th className="table-header">Previsualizar</th>
            <th className="table-header">Estado</th>
            <th className="table-header">Proveedor</th>
            <th className="table-header">Departamento</th>
            <th className="table-header">Tipo</th>
            <th className="table-header">Fecha Factura</th>
            <th className="table-header">Fecha Pago</th>
            <th className="table-header">Moneda</th>
            <th className="table-header">Vía</th>
            <th className="table-header">Importe</th>
            <th className="table-header">Variable</th>
            <th className="table-header">IVA</th>
            <th className="table-header">Total Banco</th>
          </tr>
        </thead>
        <tbody>
          {gastosFiltrados.map((gasto) => (
            <tr key={gasto.id} className="table-row">
              <td>
                <button className="table-action-button">
                  <span className="material-symbols-outlined">visibility</span>
                </button>
              </td>
              <td>
                <span className={getEstadoClass(gasto.estado)}>
                  {gasto.estado}
                </span>
              </td>
              <td>{gasto.proveedor}</td>
              <td>
                <span className="dept-tag">{gasto.departamento}</span>
              </td>
              <td>{gasto.tipo}</td>
              <td>{gasto.fechaFactura}</td>
              <td>{gasto.fechaPago}</td>
              <td>{gasto.moneda}</td>
              <td>{gasto.via}</td>
              <td>{gasto.importe}</td>
              <td>{gasto.variable}</td>
              <td>{gasto.iva}</td>
              <td>{gasto.totalBanco}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
