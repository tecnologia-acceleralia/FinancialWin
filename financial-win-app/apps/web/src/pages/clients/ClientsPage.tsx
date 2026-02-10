import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout';
import { formatearMoneda } from '../../utils/formatUtils';
import { useFinancialStats } from '../../hooks/useFinancialStats';

interface ClienteInfo {
  partnerId: number;
  nombre: string;
  totalFacturacion: number;
  primeraFacturaFecha: string | null;
}

export const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const { incomeInvoices, isLoading } = useFinancialStats();

  // Extraer lista de clientes única de las facturas de ingresos
  const clientesUnicos = useMemo(() => {
    const clientesMap = new Map<number, ClienteInfo>();

    incomeInvoices.forEach((invoice) => {
      if (!invoice.partner_id || !Array.isArray(invoice.partner_id)) return;

      const partnerId = invoice.partner_id[0];
      const nombre = invoice.partner_id[1] || 'Cliente desconocido';
      const amountTotal = invoice.amount_total || 0;
      const invoiceDate = invoice.invoice_date || null;

      if (clientesMap.has(partnerId)) {
        // Actualizar facturación total
        const cliente = clientesMap.get(partnerId)!;
        cliente.totalFacturacion += amountTotal;
        // Actualizar primera factura si esta es más antigua
        if (invoiceDate && (!cliente.primeraFacturaFecha || invoiceDate < cliente.primeraFacturaFecha)) {
          cliente.primeraFacturaFecha = invoiceDate;
        }
      } else {
        // Nuevo cliente
        clientesMap.set(partnerId, {
          partnerId,
          nombre,
          totalFacturacion: amountTotal,
          primeraFacturaFecha: invoiceDate,
        });
      }
    });

    return Array.from(clientesMap.values());
  }, [incomeInvoices]);

  // Calcular KPIs reales
  // Total Clientes: Conteo único de partner_id presentes en las facturas de ingresos
  const totalClientes = clientesUnicos.length;

  // Estado de Cobros: Suma total del importe pendiente de cobro de todas las facturas de clientes
  const estadoCobros = useMemo(() => {
    return incomeInvoices
      .filter((invoice) => invoice.payment_state !== 'paid')
      .reduce((total, invoice) => total + (invoice.amount_total || 0), 0);
  }, [incomeInvoices]);

  // Deuda Vencida: Suma de amount_total de facturas no pagadas cuya date_due sea anterior a hoy
  const deudaVencida = useMemo(() => {
    const ahora = new Date();
    ahora.setHours(0, 0, 0, 0);

    return incomeInvoices
      .filter((invoice) => {
        // Solo facturas no pagadas
        if (invoice.payment_state === 'paid') return false;
        
        // Verificar si tiene fecha de vencimiento
        const dueDate = invoice.invoice_date_due || invoice.invoice_date;
        if (!dueDate) return false;

        const fechaVencimiento = new Date(dueDate);
        fechaVencimiento.setHours(0, 0, 0, 0);
        
        // Si la fecha de vencimiento ya pasó
        return fechaVencimiento < ahora;
      })
      .reduce((total, invoice) => total + (invoice.amount_total || 0), 0);
  }, [incomeInvoices]);

  // Ventas del Mes: Suma del amount_total de todas las facturas emitidas en el mes actual
  const ventasMesActual = useMemo(() => {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
    finMes.setHours(23, 59, 59, 999);

    return incomeInvoices
      .filter((invoice) => {
        if (!invoice.invoice_date) return false;
        const invoiceDate = new Date(invoice.invoice_date);
        return invoiceDate >= inicioMes && invoiceDate <= finMes;
      })
      .reduce((total, invoice) => total + (invoice.amount_total || 0), 0);
  }, [incomeInvoices]);

  // Ranking Top 5 Clientes por volumen de facturación total
  const topClientes = useMemo(() => {
    return [...clientesUnicos]
      .sort((a, b) => b.totalFacturacion - a.totalFacturacion)
      .slice(0, 5);
  }, [clientesUnicos]);

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
                    {isLoading ? '...' : totalClientes}
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
                    Estado de Cobros
                  </p>
                  <h3 className={`stat-value ${estadoCobros > 0 ? 'stat-value-money-highlight' : ''}`}>
                    {isLoading ? '...' : formatearMoneda(estadoCobros)}
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
                    Deuda Vencida
                  </p>
                  <h3 className={`stat-value ${deudaVencida > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {isLoading ? '...' : formatearMoneda(deudaVencida)}
                  </h3>
                </div>
                <div className="stat-icon-container-orange">
                  <span className="material-symbols-outlined stat-icon-orange">
                    warning
                  </span>
                </div>
              </div>
            </div>

            <div className="studio-kpi-card">
              <div className="stat-header">
                <div>
                  <p className="stat-label">
                    Ventas del Mes
                  </p>
                  <h3 className="stat-value">
                    {isLoading ? '...' : formatearMoneda(ventasMesActual)}
                  </h3>
                </div>
                <div className="stat-icon-container-pink">
                  <span className="material-symbols-outlined stat-icon-pink">
                    leaderboard
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ranking de Clientes Top 5 */}
          {!isLoading && topClientes.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Ranking de Clientes
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        #
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Cliente
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Facturación Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClientes.map((cliente, index) => (
                      <tr
                        key={cliente.partnerId}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {cliente.nombre}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                          {formatearMoneda(cliente.totalFacturacion)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
