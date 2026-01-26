import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout';
import { Cliente } from '../../features/entities/types';
import { formatearMoneda } from '../../utils/formatUtils';

const STORAGE_KEY = 'zaffra_clients';

export const ClientsPage: React.FC = () => {
  const navigate = useNavigate();

  // Cargar clientes del localStorage
  const clientes = useMemo(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const data: Cliente[] = JSON.parse(stored);
      return data.filter((c) => c.is_active !== false);
    } catch (error) {
      console.error('Error al cargar clientes del localStorage:', error);
      return [];
    }
  }, []);

  // Calcular métricas
  const totalClientes = clientes.length;
  
  // Clientes nuevos este mes
  const nuevosEsteMes = useMemo(() => {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    return clientes.filter((c) => {
      if (!c.created_at) return false;
      const fechaCreacion = new Date(c.created_at);
      return fechaCreacion >= inicioMes;
    }).length;
  }, [clientes]);

  // Estado de cobros: suma de pagos pendientes de todos los clientes
  const estadoCobros = useMemo(() => {
    return clientes.reduce((total, cliente) => {
      // Intentar obtener pagosPendientes del cliente
      // Si el cliente tiene un campo pagosPendientes, usarlo; si no, tratar como 0
      const pagosPendientes = (cliente as any).pagosPendientes ?? 0;
      const valor = typeof pagosPendientes === 'number' ? pagosPendientes : 0;
      return total + (isNaN(valor) ? 0 : valor);
    }, 0);
  }, [clientes]);

  // Clientes activos este mes (clientes con actividad)
  const clientesActivosEsteMes = useMemo(() => {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    // Por ahora, consideramos activos a los que fueron creados o actualizados este mes
    return clientes.filter((c) => {
      const fechaCreacion = c.created_at ? new Date(c.created_at) : null;
      const fechaActualizacion = c.updated_at ? new Date(c.updated_at) : null;
      return (
        (fechaCreacion && fechaCreacion >= inicioMes) ||
        (fechaActualizacion && fechaActualizacion >= inicioMes)
      );
    }).length;
  }, [clientes]);

  const handleVerLista = () => {
    navigate('/clientes/lista');
  };

  const handleNuevoCliente = () => {
    navigate('/clientes/nuevo');
  };

  return (
    <div className="layout-page-container">
      <PageHeader
        title="Clientes"
        showBackButton={false}
      />
      <div className="studio-container">
        <div className="studio-card">
          {/* Grid de Estadísticas */}
          <div className="clients-stats-grid">
            <div className="studio-kpi-card">
              <div className="stat-header">
                <div>
                  <p className="stat-label">
                    Total Clientes
                  </p>
                  <h3 className="stat-value">
                    {totalClientes}
                  </h3>
                </div>
                <div className="stat-icon-container-blue">
                  <span className="material-symbols-outlined stat-icon-blue">
                    group
                  </span>
                </div>
              </div>
            </div>

            <div className="studio-kpi-card">
              <div className="stat-header">
                <div>
                  <p className="stat-label">
                    Nuevos
                  </p>
                  <h3 className="stat-value">
                    {nuevosEsteMes}
                  </h3>
                </div>
                <div className="stat-icon-container-green">
                  <span className="material-symbols-outlined stat-icon-green">
                    person_add
                  </span>
                </div>
              </div>
            </div>

            <div className="studio-kpi-card">
              <div className="stat-header">
                <div>
                  <p className="stat-label">
                    Estado de Cobros
                  </p>
                  <h3 className={`stat-value ${estadoCobros > 0 ? 'stat-value-money-highlight' : ''}`}>
                    {formatearMoneda(estadoCobros)}
                  </h3>
                </div>
                <div className="stat-icon-container-orange">
                  <span className="material-symbols-outlined stat-icon-orange">
                    pending_actions
                  </span>
                </div>
              </div>
            </div>

            <div className="studio-kpi-card">
              <div className="stat-header">
                <div>
                  <p className="stat-label">
                    Actividad
                  </p>
                  <h3 className="stat-value">
                    {clientesActivosEsteMes}
                  </h3>
                </div>
                <div className="stat-icon-container-pink">
                  <span className="material-symbols-outlined stat-icon-pink">
                    trending_up
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de Navegación Hero */}
          <div className="client-hero-actions-grid">
            <button
              onClick={handleVerLista}
              className="client-hero-action-card"
            >
              <div className="client-hero-action-icon">
                <span className="material-symbols-outlined">list</span>
              </div>
              <div>
                <h3 className="client-hero-action-title">
                  Ver Lista de Clientes
                </h3>
                <p className="client-hero-action-description">
                  Explora y gestiona todos tus clientes
                </p>
              </div>
            </button>

            <button
              onClick={handleNuevoCliente}
              className="client-hero-action-card"
            >
              <div className="client-hero-action-icon">
                <span className="material-symbols-outlined">person_add</span>
              </div>
              <div>
                <h3 className="client-hero-action-title">
                  Añadir Nuevo Cliente
                </h3>
                <p className="client-hero-action-description">
                  Registra un nuevo cliente en el sistema
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
