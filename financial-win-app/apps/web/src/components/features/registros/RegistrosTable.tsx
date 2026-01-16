import React from 'react';

interface Registro {
  id: string;
  estado: 'VALIDADO' | 'PENDIENTE' | 'RECHAZADO';
  tipoDocumento: string;
  departamento: string;
  nombreDocumento: string;
  fechaRegistro: string;
  usuario: string;
  importe: string;
}

const datosPrueba: Registro[] = [
  {
    id: '1',
    estado: 'VALIDADO',
    tipoDocumento: 'Factura',
    departamento: 'IT',
    nombreDocumento: 'Adobe Creative Cloud',
    fechaRegistro: '2024-01-15',
    usuario: 'María García',
    importe: '€59.99',
  },
  {
    id: '2',
    estado: 'PENDIENTE',
    tipoDocumento: 'Factura',
    departamento: 'Operaciones',
    nombreDocumento: 'Taxi Aeropuerto',
    fechaRegistro: '2024-01-16',
    usuario: 'Juan Pérez',
    importe: '€45.00',
  },
  {
    id: '3',
    estado: 'VALIDADO',
    tipoDocumento: 'Recibo',
    departamento: 'Marketing',
    nombreDocumento: 'Servicios Cloud AWS',
    fechaRegistro: '2024-01-14',
    usuario: 'Ana López',
    importe: '€120.50',
  },
  {
    id: '4',
    estado: 'RECHAZADO',
    tipoDocumento: 'Factura',
    departamento: 'RRHH',
    nombreDocumento: 'Software Licencia',
    fechaRegistro: '2024-01-13',
    usuario: 'Carlos Ruiz',
    importe: '€299.00',
  },
  {
    id: '5',
    estado: 'VALIDADO',
    tipoDocumento: 'Factura',
    departamento: 'IT',
    nombreDocumento: 'Herramientas Desarrollo',
    fechaRegistro: '2024-01-12',
    usuario: 'María García',
    importe: '€89.99',
  },
  {
    id: '6',
    estado: 'PENDIENTE',
    tipoDocumento: 'Recibo',
    departamento: 'Operaciones',
    nombreDocumento: 'Servicios Consultoría',
    fechaRegistro: '2024-01-17',
    usuario: 'Juan Pérez',
    importe: '€1,500.00',
  },
];

export const RegistrosTable: React.FC = () => {
  const getEstadoClass = (estado: Registro['estado']) => {
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

  return (
    <div className="table-wrapper">
      <table className="table-main">
        <thead>
          <tr>
            <th className="table-header">Estado</th>
            <th className="table-header">Tipo Documento</th>
            <th className="table-header">Departamento</th>
            <th className="table-header">Nombre Documento</th>
            <th className="table-header">Fecha Registro</th>
            <th className="table-header">Usuario</th>
            <th className="table-header">Importe</th>
            <th className="table-header">Acción</th>
          </tr>
        </thead>
        <tbody>
          {datosPrueba.map((registro) => (
            <tr key={registro.id} className="table-row">
              <td>
                <span className={getEstadoClass(registro.estado)}>
                  {registro.estado}
                </span>
              </td>
              <td>{registro.tipoDocumento}</td>
              <td>{registro.departamento}</td>
              <td>{registro.nombreDocumento}</td>
              <td>{registro.fechaRegistro}</td>
              <td>{registro.usuario}</td>
              <td>{registro.importe}</td>
              <td>
                <button className="table-action-button">
                  <span className="material-symbols-outlined">visibility</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
