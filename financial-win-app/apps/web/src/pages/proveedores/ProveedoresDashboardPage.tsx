import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout';
import { formatearMoneda } from '../../utils/formatUtils';
import { useFinancialStats } from '../../hooks/useFinancialStats';

/**
 * Obtiene el nombre del mes en español
 */
const obtenerNombreMes = (): string => {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  return meses[new Date().getMonth()];
};

interface ProveedorInfo {
  partnerId: number;
  nombre: string;
  gastoTotal: number;
  primeraFacturaFecha: string | null;
}

export const ProveedoresDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { expenseInvoices, isLoading } = useFinancialStats();

  // Extraer lista de proveedores única de las facturas de gastos
  const proveedoresUnicos = useMemo(() => {
    const proveedoresMap = new Map<number, ProveedorInfo>();

    expenseInvoices.forEach((invoice) => {
      if (!invoice.partner_id || !Array.isArray(invoice.partner_id)) return;

      const partnerId = invoice.partner_id[0];
      const nombre = invoice.partner_id[1] || 'Proveedor desconocido';
      const amountTotal = invoice.amount_total || 0;
      const invoiceDate = invoice.invoice_date || null;

      if (proveedoresMap.has(partnerId)) {
        // Actualizar gasto total
        const proveedor = proveedoresMap.get(partnerId)!;
        proveedor.gastoTotal += amountTotal;
        // Actualizar primera factura si esta es más antigua
        if (invoiceDate && (!proveedor.primeraFacturaFecha || invoiceDate < proveedor.primeraFacturaFecha)) {
          proveedor.primeraFacturaFecha = invoiceDate;
        }
      } else {
        // Nuevo proveedor
        proveedoresMap.set(partnerId, {
          partnerId,
          nombre,
          gastoTotal: amountTotal,
          primeraFacturaFecha: invoiceDate,
        });
      }
    });

    return Array.from(proveedoresMap.values());
  }, [expenseInvoices]);

  // Calcular KPIs reales
  // Total Proveedores: Conteo único de partner_id presentes en las facturas de gastos
  const totalProveedores = proveedoresUnicos.length;

  // Próximos Vencimientos: Suma de facturas cuya date_due sea en los próximos 7 días
  const proximosVencimientos = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const en7Dias = new Date(hoy);
    en7Dias.setDate(en7Dias.getDate() + 7);

    return expenseInvoices
      .filter((invoice) => {
        // Usar invoice_date_due si está disponible, sino usar invoice_date como fallback
        const dueDateStr = invoice.invoice_date_due || invoice.invoice_date;
        if (!dueDateStr) return false;

        try {
          const dueDate = new Date(dueDateStr);
          dueDate.setHours(0, 0, 0, 0);
          // Facturas que vencen entre hoy y en 7 días
          return dueDate >= hoy && dueDate <= en7Dias;
        } catch (error) {
          return false;
        }
      })
      .reduce((total, invoice) => total + (invoice.amount_total || 0), 0);
  }, [expenseInvoices]);

  // Pagos Pendientes: Suma total de amount_residual de todas las facturas de gasto abiertas
  // NOTA: Como amount_residual no está disponible en la interfaz actual, usamos amount_total
  // de facturas no pagadas como aproximación. Idealmente debería usar amount_residual cuando esté disponible.
  const pagosPendientes = useMemo(() => {
    return expenseInvoices
      .filter((invoice) => {
        // Facturas abiertas: no pagadas completamente (not_paid, in_payment, partial)
        return invoice.payment_state !== 'paid';
      })
      .reduce((total, invoice) => {
        // TODO: Usar amount_residual cuando esté disponible en OdooInvoice
        // Por ahora usamos amount_total como aproximación
        return total + (invoice.amount_total || 0);
      }, 0);
  }, [expenseInvoices]);

  // Gasto del Mes: Suma del amount_total de todas las facturas de gasto con fecha del mes actual
  const gastoDelMes = useMemo(() => {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
    finMes.setHours(23, 59, 59, 999);

    return expenseInvoices
      .filter((invoice) => {
        if (!invoice.invoice_date) return false;
        const invoiceDate = new Date(invoice.invoice_date);
        return invoiceDate >= inicioMes && invoiceDate <= finMes;
      })
      .reduce((total, invoice) => total + (invoice.amount_total || 0), 0);
  }, [expenseInvoices]);

  // Ranking Top 5 Proveedores por volumen de gasto total (anual)
  const topProveedoresAnual = useMemo(() => {
    return [...proveedoresUnicos]
      .sort((a, b) => b.gastoTotal - a.gastoTotal)
      .slice(0, 5);
  }, [proveedoresUnicos]);

  // Ranking Top 5 Proveedores por gasto del mes actual
  const topProveedoresMensual = useMemo(() => {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
    finMes.setHours(23, 59, 59, 999);

    // Agrupar facturas del mes actual por proveedor
    const gastoMensualPorProveedor = new Map<number, { nombre: string; gastoTotal: number }>();

    expenseInvoices
      .filter((invoice) => {
        if (!invoice.invoice_date) return false;
        const invoiceDate = new Date(invoice.invoice_date);
        return invoiceDate >= inicioMes && invoiceDate <= finMes;
      })
      .forEach((invoice) => {
        if (!invoice.partner_id || !Array.isArray(invoice.partner_id)) return;

        const partnerId = invoice.partner_id[0];
        const nombre = invoice.partner_id[1] || 'Proveedor desconocido';
        const amountTotal = invoice.amount_total || 0;

        if (gastoMensualPorProveedor.has(partnerId)) {
          const proveedor = gastoMensualPorProveedor.get(partnerId)!;
          proveedor.gastoTotal += amountTotal;
        } else {
          gastoMensualPorProveedor.set(partnerId, {
            nombre,
            gastoTotal: amountTotal,
          });
        }
      });

    return Array.from(gastoMensualPorProveedor.values())
      .sort((a, b) => b.gastoTotal - a.gastoTotal)
      .slice(0, 5);
  }, [expenseInvoices]);

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
        <div className="studio-card">
          {/* Grid de Estadísticas */}
          <div className="clients-stats-grid">
            <div className="studio-kpi-card">
              <div className="stat-header">
                <div>
                  <p className="stat-label">
                    Total Proveedores
                  </p>
                  <h3 className="stat-value">
                    {isLoading ? '...' : totalProveedores}
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
                    Próximos Vencimientos
                  </p>
                  <h3 className={`stat-value ${proximosVencimientos > 0 ? 'stat-value-money-highlight' : ''}`}>
                    {isLoading ? '...' : formatearMoneda(proximosVencimientos)}
                  </h3>
                </div>
                <div className="stat-icon-container-orange">
                  <span className="material-symbols-outlined stat-icon-orange">
                    event_upcoming
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
                    {isLoading ? '...' : formatearMoneda(pagosPendientes)}
                  </h3>
                </div>
                <div className="stat-icon-container-blue">
                  <span className="material-symbols-outlined stat-icon-blue">
                    pending_actions
                  </span>
                </div>
              </div>
            </div>

            <div className="studio-kpi-card">
              <div className="stat-header">
                <div>
                  <p className="stat-label">
                    Gasto del Mes
                  </p>
                  <h3 className="stat-value">
                    {isLoading ? '...' : formatearMoneda(gastoDelMes)}
                  </h3>
                  {!isLoading && gastoDelMes === 0 && (
                    <p className="kpi-subtext">
                      Mes sin cargos
                    </p>
                  )}
                </div>
                <div className="stat-icon-container-purple">
                  <span className="material-symbols-outlined stat-icon-purple">
                    shopping_cart
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rankings en doble columna */}
          {!isLoading && (
            <div className="rankings-grid">
              {/* Columna Izquierda: Principales Proveedores (Gasto Anual) */}
              <div className="ranking-card">
                <h2 className="ranking-title">
                  Principales Proveedores (Gasto Anual)
                </h2>
                {topProveedoresAnual.length > 0 ? (
                  <div className="table-wrapper ranking-table-animate">
                    <table className="ranking-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Proveedor</th>
                          <th>Importe Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProveedoresAnual.map((proveedor, index) => (
                          <tr key={proveedor.partnerId}>
                            <td>{index + 1}</td>
                            <td>{proveedor.nombre}</td>
                            <td>{formatearMoneda(proveedor.gastoTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="ranking-empty-state">
                    <span className="material-symbols-outlined ranking-empty-icon">
                      history
                    </span>
                    <p className="ranking-empty-text">
                      No hay histórico de gastos
                    </p>
                  </div>
                )}
              </div>

              {/* Columna Derecha: Gasto por Proveedor (Mes Actual) */}
              <div className="ranking-card">
                <h2 className="ranking-title">
                  Gasto por Proveedor (Mes Actual)
                </h2>
                {topProveedoresMensual.length > 0 ? (
                  <div className="table-wrapper ranking-table-animate">
                    <table className="ranking-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Proveedor</th>
                          <th>Importe Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProveedoresMensual.map((proveedor, index) => (
                          <tr key={`${proveedor.nombre}-${index}`}>
                            <td>{index + 1}</td>
                            <td>{proveedor.nombre}</td>
                            <td>{formatearMoneda(proveedor.gastoTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="ranking-empty-state">
                    <span className="material-symbols-outlined ranking-empty-icon">
                      calendar_today
                    </span>
                    <p className="ranking-empty-text">
                      Aún no hay gastos registrados en {obtenerNombreMes()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botones de Navegación Hero */}
          <div className="client-hero-actions-grid mt-8">
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
