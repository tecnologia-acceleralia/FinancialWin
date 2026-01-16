import React from 'react';

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

export const IngresosTable: React.FC = () => {
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
          {datosPrueba.map((ingreso) => (
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
