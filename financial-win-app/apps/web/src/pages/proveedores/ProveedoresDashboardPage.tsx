import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout';
import { Proveedor } from '../../features/entities/types';
import { formatearMoneda } from '../../utils/formatUtils';

const STORAGE_KEY = 'zaffra_suppliers';

export const ProveedoresDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Cargar proveedores del localStorage
  const proveedores = useMemo(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const data: Proveedor[] = JSON.parse(stored);
      return data.filter((p) => p.is_active !== false);
    } catch (error) {
      console.error('Error al cargar proveedores del localStorage:', error);
      return [];
    }
  }, []);

  // Calcular métricas
  const totalProveedores = proveedores.length;

  // Proveedores activos
  const proveedoresActivos = useMemo(() => {
    return proveedores.filter((p) => p.is_active !== false).length;
  }, [proveedores]);

  // Pagos pendientes: suma de deuda de todos los proveedores
  const pagosPendientes = useMemo(() => {
    return proveedores.reduce((total, proveedor) => {
      // Intentar obtener pagosPendientes o deuda del proveedor
      // Si el proveedor tiene un campo pagosPendientes o deuda, usarlo; si no, tratar como 0
      const deuda = (proveedor as any).pagosPendientes ?? (proveedor as any).deuda ?? 0;
      const valor = typeof deuda === 'number' ? deuda : 0;
      return total + (isNaN(valor) ? 0 : valor);
    }, 0);
  }, [proveedores]);

  // Gasto mensual estimado
  // TODO: Conectar con datos reales de gastos cuando esté disponible
  const gastoMensualEstimado = useMemo(() => {
    // Placeholder hasta que tengamos datos de gastos vinculados
    return 0;
  }, [proveedores]);

  // Proveedores nuevos este mes
  const nuevosEsteMes = useMemo(() => {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    return proveedores.filter((p) => {
      if (!p.created_at) return false;
      const fechaCreacion = new Date(p.created_at);
      return fechaCreacion >= inicioMes;
    }).length;
  }, [proveedores]);

  const handleVerLista = () => {
    navigate('/proveedores/listado');
  };

  const handleNuevoProveedor = () => {
    navigate('/proveedores/nuevo');
  };

  return (
    <div className="layout-page-container">
      <PageHeader
        title="Proveedores"
        showBackButton={false}
      />
      <div className="studio-container">
        <div className="studio-card flex flex-col gap-8">
          {/* Grid de Estadísticas */}
          <div className="clients-stats-grid">
            <div className="studio-kpi-card">
              <div className="stat-header">
                <div>
                  <p className="stat-label">
                    Total Proveedores
                  </p>
                  <h3 className="stat-value">
                    {totalProveedores}
                  </h3>
                </div>
                <div className="stat-icon-container-blue">
                  <span className="material-symbols-outlined stat-icon-blue">
                    groups
                  </span>
                </div>
              </div>
            </div>

            <div className="studio-kpi-card">
              <div className="stat-header">
                <div>
                  <p className="stat-label">
                    Proveedores Activos
                  </p>
                  <h3 className="stat-value">
                    {proveedoresActivos}
                  </h3>
                </div>
                <div className="stat-icon-container-green">
                  <span className="material-symbols-outlined stat-icon-green">
                    check_circle
                  </span>
                </div>
              </div>
            </div>

            <div className="studio-kpi-card">
              <div className="stat-header">
                <div>
                  <p className="stat-label">
                    Pagos Pendientes
                  </p>
                  <h3 className={`stat-value ${pagosPendientes > 0 ? 'stat-value-money-highlight' : ''}`}>
                    {formatearMoneda(pagosPendientes)}
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
                    Gasto Mensual
                  </p>
                  <h3 className={`stat-value ${gastoMensualEstimado > 0 ? 'stat-value-money-highlight' : ''}`}>
                    {formatearMoneda(gastoMensualEstimado)}
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
                  Ver Lista de Proveedores
                </h3>
                <p className="client-hero-action-description">
                  Explora y gestiona todos tus proveedores
                </p>
              </div>
            </button>

            <button
              onClick={handleNuevoProveedor}
              className="client-hero-action-card"
            >
              <div className="client-hero-action-icon">
                <span className="material-symbols-outlined">person_add</span>
              </div>
              <div>
                <h3 className="client-hero-action-title">
                  Añadir Nuevo Proveedor
                </h3>
                <p className="client-hero-action-description">
                  Registra un nuevo proveedor en el sistema
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
