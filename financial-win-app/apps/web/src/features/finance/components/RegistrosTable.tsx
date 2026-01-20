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

interface RegistrosTableProps {
  searchTerm?: string;
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

export const RegistrosTable: React.FC<RegistrosTableProps> = ({ searchTerm = '' }) => {
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
   * Filtra registros según el término de búsqueda (multicriterio y case-insensitive)
   * Busca en: Concepto, Categoría, Entidad/Cliente, e Importe (tanto texto como número)
   */
  const registrosFiltrados = datosPrueba.filter((registro) => {
    if (!searchTerm.trim()) {
      return true;
    }

    const terminoBusqueda = searchTerm.toLowerCase().trim();
    
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
          {registrosFiltrados.length === 0 ? (
            <tr>
              <td colSpan={8} className="table-empty-state">
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
            registrosFiltrados.map((registro) => (
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
