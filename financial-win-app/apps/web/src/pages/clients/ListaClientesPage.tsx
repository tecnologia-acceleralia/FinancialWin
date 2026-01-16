import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Cliente {
  id: string;
  nombre: string;
  nif: string;
  tipo: 'Nacional' | 'Extranjero';
  estado: 'activo' | 'pendiente' | 'inactivo';
  saldoBancario: number;
  pagosPendientes: number;
}

const MOCK_CLIENTES: Cliente[] = [
  { id: '1', nombre: 'Empresa 1 S.L.', nif: 'B48079307', tipo: 'Nacional', estado: 'activo', saldoBancario: 12500.50, pagosPendientes: 3200.00 },
  { id: '2', nombre: 'Cliente 2 García', nif: '12345678A', tipo: 'Nacional', estado: 'pendiente', saldoBancario: 8500.75, pagosPendientes: 1500.00 },
  { id: '3', nombre: 'Empresa 3 Tech', nif: 'B98765432', tipo: 'Nacional', estado: 'activo', saldoBancario: 25400.00, pagosPendientes: 0.00 },
  { id: '4', nombre: 'Cliente 4 Pérez', nif: '87654321B', tipo: 'Nacional', estado: 'inactivo', saldoBancario: 0.00, pagosPendientes: 0.00 },
  { id: '5', nombre: 'Empresa 5 Global', nif: 'B11223344', tipo: 'Extranjero', estado: 'activo', saldoBancario: 18900.25, pagosPendientes: 4500.00 },
  { id: '6', nombre: 'Cliente 6 Martínez', nif: '22334455C', tipo: 'Nacional', estado: 'activo', saldoBancario: 6800.50, pagosPendientes: 1200.00 },
  { id: '7', nombre: 'Empresa 7 Solutions', nif: 'B55667788', tipo: 'Nacional', estado: 'pendiente', saldoBancario: 15400.00, pagosPendientes: 2800.00 },
  { id: '8', nombre: 'Cliente 8 López', nif: '66778899D', tipo: 'Nacional', estado: 'activo', saldoBancario: 9200.75, pagosPendientes: 0.00 },
  { id: '9', nombre: 'Empresa 9 Innovación', nif: 'B99887766', tipo: 'Nacional', estado: 'activo', saldoBancario: 31200.50, pagosPendientes: 5600.00 },
  { id: '10', nombre: 'Cliente 10 Sánchez', nif: '88776655E', tipo: 'Nacional', estado: 'inactivo', saldoBancario: 0.00, pagosPendientes: 0.00 },
];

const obtenerIniciales = (nombre: string): string => {
  const palabras = nombre.split(' ');
  if (palabras.length >= 2) {
    return (palabras[0][0] + palabras[1][0]).toUpperCase();
  }
  return nombre.substring(0, 2).toUpperCase();
};

const formatearMoneda = (cantidad: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(cantidad);
};

export const ListaClientesPage: React.FC = () => {
  const navigate = useNavigate();
  const [paginaActual, setPaginaActual] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [vistaGrid, setVistaGrid] = useState(true);
  const resultadosPorPagina = 8;
  const totalResultados = MOCK_CLIENTES.length;
  const totalPaginas = Math.ceil(totalResultados / resultadosPorPagina);
  
  const inicio = (paginaActual - 1) * resultadosPorPagina;
  const fin = inicio + resultadosPorPagina;
  const clientesPaginados = MOCK_CLIENTES.slice(inicio, fin);

  const handleNuevoCliente = () => {
    navigate('/clientes/nuevo');
  };

  const handleFiltro = () => {
    // TODO: Implementar filtros
    console.log('Mostrar filtros');
  };

  const handleVista = () => {
    setVistaGrid(!vistaGrid);
  };

  const handleDescarga = () => {
    // TODO: Implementar descarga
    console.log('Descargar lista');
  };

  const handleConfiguracion = () => {
    // TODO: Implementar configuración
    console.log('Configuración');
  };

  const handleVerFicha = (clienteId: string) => {
    // TODO: Implementar navegación a ficha del cliente
    console.log('Ver ficha del cliente:', clienteId);
  };

  const handlePaginaAnterior = () => {
    if (paginaActual > 1) {
      setPaginaActual(paginaActual - 1);
    }
  };

  const handlePaginaSiguiente = () => {
    if (paginaActual < totalPaginas) {
      setPaginaActual(paginaActual + 1);
    }
  };

  const handleIrAPagina = (pagina: number) => {
    setPaginaActual(pagina);
  };

  const getEstadoClass = (estado: string): string => {
    switch (estado) {
      case 'activo':
        return 'status-activo';
      case 'pendiente':
        return 'status-pendiente';
      case 'inactivo':
        return 'status-inactivo';
      default:
        return 'status-inactivo';
    }
  };

  const getEstadoLabel = (estado: string): string => {
    switch (estado) {
      case 'activo':
        return 'Activo';
      case 'pendiente':
        return 'Pendiente';
      case 'inactivo':
        return 'Inactivo';
      default:
        return 'Inactivo';
    }
  };

  return (
    <div className="clients-list-container">
      {/* Barra de herramientas superior */}
      <div className="action-toolbar">
        {/* Buscador */}
        <div className="search-input-wrapper">
          <span className="material-symbols-outlined search-input-icon">search</span>
          <input
            type="text"
            placeholder="Buscar cliente (Nombre, CIF)..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Grupo de botones */}
        <div className="toolbar-buttons-group">
          <button
            type="button"
            onClick={handleFiltro}
            className="toolbar-button"
            aria-label="Filtros"
          >
            <span className="material-symbols-outlined toolbar-button-icon">filter_list</span>
          </button>
          <button
            type="button"
            onClick={handleVista}
            className="toolbar-button"
            aria-label={vistaGrid ? 'Vista lista' : 'Vista grid'}
          >
            <span className="material-symbols-outlined toolbar-button-icon">
              {vistaGrid ? 'format_list_bulleted' : 'grid_view'}
            </span>
          </button>
          <button
            type="button"
            onClick={handleDescarga}
            className="toolbar-button"
            aria-label="Descargar"
          >
            <span className="material-symbols-outlined toolbar-button-icon">download</span>
          </button>
          <button
            type="button"
            onClick={handleConfiguracion}
            className="toolbar-button"
            aria-label="Configuración"
          >
            <span className="material-symbols-outlined toolbar-button-icon">settings</span>
          </button>
          <button
            type="button"
            onClick={handleNuevoCliente}
            className="toolbar-button-primary"
            aria-label="Nuevo cliente"
          >
            <span className="material-symbols-outlined toolbar-button-icon">add</span>
          </button>
        </div>
      </div>

      {/* Grid de clientes */}
      <div className="clients-grid">
        {clientesPaginados.map((cliente) => (
          <div key={cliente.id} className="client-card">
            {/* Header con avatar, nombre y badge de estado */}
            <div className="client-card-header">
              <div className="client-avatar">
                {obtenerIniciales(cliente.nombre)}
              </div>
              <div className="client-name-container">
                <h3 className="client-card-name">{cliente.nombre}</h3>
                <div className="client-card-meta">
                  <span>{cliente.nif}</span>
                  <span className="client-card-meta-separator">•</span>
                  <span>{cliente.tipo}</span>
                </div>
              </div>
              {/* Badge de estado */}
              <span className={getEstadoClass(cliente.estado)}>
                {getEstadoLabel(cliente.estado)}
              </span>
            </div>

            {/* Información financiera */}
            <div className="client-card-financial">
              <div className="client-financial-item">
                <span className="material-symbols-outlined client-financial-icon">
                  account_balance
                </span>
                <span className="client-financial-text">Saldo Bancario</span>
                <span className="client-financial-amount">
                  {formatearMoneda(cliente.saldoBancario)}
                </span>
              </div>
              <div className="client-financial-item">
                <span className="material-symbols-outlined client-financial-icon">
                  payments
                </span>
                <span className="client-financial-text">Pagos Pendientes</span>
                <span className="client-financial-amount">
                  {formatearMoneda(cliente.pagosPendientes)}
                </span>
              </div>
            </div>

            {/* Botón ver ficha */}
            <button
              type="button"
              onClick={() => handleVerFicha(cliente.id)}
              className="client-card-action"
            >
              <span className="material-symbols-outlined client-card-action-icon">
                visibility
              </span>
              <span>Ver ficha</span>
            </button>
          </div>
        ))}
      </div>

      {/* Paginación */}
      <div className="pagination-container">
        <div className="pagination-info">
          Mostrando {inicio + 1} a {Math.min(fin, totalResultados)} de {totalResultados} resultados
        </div>
        <div className="pagination-controls">
          <button
            type="button"
            onClick={handlePaginaAnterior}
            disabled={paginaActual === 1}
            className="pagination-button"
            aria-label="Página anterior"
          >
            <span className="material-symbols-outlined pagination-button-icon">
              chevron_left
            </span>
          </button>

          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => (
            <button
              key={pagina}
              type="button"
              onClick={() => handleIrAPagina(pagina)}
              className={
                pagina === paginaActual
                  ? 'pagination-button-active'
                  : 'pagination-button'
              }
            >
              {pagina}
            </button>
          ))}

          <button
            type="button"
            onClick={handlePaginaSiguiente}
            disabled={paginaActual === totalPaginas}
            className="pagination-button"
            aria-label="Página siguiente"
          >
            <span className="material-symbols-outlined pagination-button-icon">
              chevron_right
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
