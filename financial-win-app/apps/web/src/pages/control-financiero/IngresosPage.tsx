import React, { useMemo, useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { IngresosTable } from '../../features/finance/components/IngresosTable';
import { PageHeader, type PageHeaderAction } from '../../components/layout';
import { FilterPanel, type FilterValues } from '../../features/finance/components/FilterPanel';
import { StatCard, UniversalSearchBar } from '../../components/common';
import { exportToCSV } from '../../utils/exportToCSV';
import { useToast } from '../../contexts/ToastContext';
import { odooService, type OdooInvoice, mapOdooStatus } from '../../services/odooService';

interface Ingreso {
  id: string;
  estado: 'Borrador' | 'Publicado' | 'En proceso de pago' | 'Pagada' | 'Revertido';
  cliente: string;
  clienteId?: string;
  clienteMatch?: { id?: string; nombreComercial?: string; razonSocial?: string };
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

/**
 * Convierte una factura de Odoo al formato Ingreso para la tabla
 */
const convertOdooInvoiceToIngreso = (invoice: OdooInvoice): Ingreso => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: invoice.currency_id[1] || 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Mapear estado de Odoo usando la función auxiliar
  const estado = mapOdooStatus(invoice.state, invoice.payment_state);
  const fechaFactura = invoice.invoice_date 
    ? new Date(invoice.invoice_date)
    : new Date();
  
  // Calcular vencimiento (30 días después de la fecha de factura)
  const vencimiento = new Date(fechaFactura);
  vencimiento.setDate(vencimiento.getDate() + 30);

  // Para facturas de Odoo, asumimos que el importe total incluye IVA
  // Separamos base e IVA (estimación: 21% IVA)
  const total = invoice.amount_total;
  const base = total / 1.21; // Estimación de base imponible
  const vat = total - base; // IVA estimado

  const totalPagado = estado === 'Pagada' ? total : 0;
  const saldo = total - totalPagado;

  return {
    id: `odoo-${invoice.id}`,
    estado,
    cliente: invoice.partner_id[1] || 'Cliente desconocido',
    factura: invoice.name,
    fechaFactura: fechaFactura.toLocaleDateString('es-ES'),
    fechaPago: estado === 'Pagada' ? fechaFactura.toLocaleDateString('es-ES') : '-',
    vencimiento: vencimiento.toLocaleDateString('es-ES'),
    importe: formatCurrency(base),
    iva: formatCurrency(vat),
    total: formatCurrency(total),
    totalPagado: formatCurrency(totalPagado),
    saldo: formatCurrency(saldo),
  };
};

export const IngresosPage: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [busqueda, setBusqueda] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    dateRange: { from: '', to: '' },
    categories: [],
    status: [],
    documentType: [],
    amountRange: { min: null, max: null },
  });
  const [invoices, setInvoices] = useState<OdooInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar facturas de Odoo al montar el componente
  useEffect(() => {
    const loadInvoices = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await odooService.getInvoices('out_invoice');
        setInvoices(data);
      } catch (err) {
        console.error('Error al cargar facturas de Odoo:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar facturas');
        showToast('Error al cargar facturas de Odoo', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoices();
  }, [showToast]);

  // Convertir facturas de Odoo al formato Ingreso
  const ingresos = useMemo(() => {
    return invoices.map(convertOdooInvoiceToIngreso);
  }, [invoices]);

  // Calcular KPIs usando datos de Odoo
  const kpis = useMemo(() => {
    // Total Acumulado: Suma solo las facturas que NO sean 'Borrador' o 'Revertido'
    // Incluye: Publicado, En proceso de pago, Pagada
    const totalAcumulado = invoices
      .filter((invoice) => {
        const estado = mapOdooStatus(invoice.state, invoice.payment_state);
        return estado !== 'Borrador' && estado !== 'Revertido';
      })
      .reduce((sum, invoice) => {
        return sum + invoice.amount_total;
      }, 0);

    // Pendiente: Suma las facturas 'Publicado' y 'En proceso de pago'
    // Excluye: Borrador, Pagada, Revertido
    const pendiente = invoices
      .filter((invoice) => {
        const estado = mapOdooStatus(invoice.state, invoice.payment_state);
        return estado === 'Publicado' || estado === 'En proceso de pago';
      })
      .reduce((sum, invoice) => {
        return sum + invoice.amount_total;
      }, 0);

    const numeroOperaciones = invoices.length;

    return {
      totalAcumulado,
      pendiente,
      numeroOperaciones,
    };
  }, [invoices]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Obtener datos filtrados para exportar
  const getFilteredIngresos = useMemo(() => {
    let resultado = ingresos;

    // Filtro por búsqueda de texto
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase().trim();
      resultado = resultado.filter(
        (ingreso) =>
          ingreso.cliente.toLowerCase().includes(busquedaLower) ||
          ingreso.factura.toLowerCase().includes(busquedaLower) ||
          ingreso.estado.toLowerCase().includes(busquedaLower)
      );
    }

    // Aplicar filtros avanzados
    if (filters) {
      // Filtro por rango de fechas
      if (filters.dateRange.from) {
        resultado = resultado.filter((ingreso) => {
          const fechaFactura = new Date(ingreso.fechaFactura);
          const fechaDesde = new Date(filters.dateRange.from);
          fechaDesde.setHours(0, 0, 0, 0);
          return fechaFactura >= fechaDesde;
        });
      }
      if (filters.dateRange.to) {
        resultado = resultado.filter((ingreso) => {
          const fechaFactura = new Date(ingreso.fechaFactura);
          const fechaHasta = new Date(filters.dateRange.to);
          fechaHasta.setHours(23, 59, 59, 999);
          return fechaFactura <= fechaHasta;
        });
      }

      // Filtro por estados
      if (filters.status.length > 0) {
        resultado = resultado.filter((ingreso) =>
          filters.status.includes(ingreso.estado)
        );
      }

      // Filtro por rango de importe
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
  }, [ingresos, busqueda, filters]);

  // Función para exportar a CSV
  const handleExport = () => {
    const dataToExport = getFilteredIngresos.map((ingreso) => {
      const importeNum = parseFloat(ingreso.importe.replace(/[€,]/g, '').trim());
      const ivaNum = parseFloat(ingreso.iva.replace(/[€,]/g, '').trim());
      const totalNum = parseFloat(ingreso.total.replace(/[€,]/g, '').trim());
      const totalPagadoNum = parseFloat(ingreso.totalPagado.replace(/[€,]/g, '').trim());
      const saldoNum = parseFloat(ingreso.saldo.replace(/[€,]/g, '').trim());

      return {
        Estado: ingreso.estado,
        Cliente: ingreso.cliente,
        Factura: ingreso.factura,
        'Fecha Factura': ingreso.fechaFactura,
        'Fecha Pago': ingreso.fechaPago,
        Vencimiento: ingreso.vencimiento,
        Importe: importeNum.toFixed(2),
        IVA: ivaNum.toFixed(2),
        Total: totalNum.toFixed(2),
        'Total Pagado': totalPagadoNum.toFixed(2),
        Saldo: saldoNum.toFixed(2),
      };
    });

    const headers = [
      { key: 'Estado' as const, label: 'Estado' },
      { key: 'Cliente' as const, label: 'Cliente' },
      { key: 'Factura' as const, label: 'Factura' },
      { key: 'Fecha Factura' as const, label: 'Fecha Factura' },
      { key: 'Fecha Pago' as const, label: 'Fecha Pago' },
      { key: 'Vencimiento' as const, label: 'Vencimiento' },
      { key: 'Importe' as const, label: 'Importe' },
      { key: 'IVA' as const, label: 'IVA' },
      { key: 'Total' as const, label: 'Total' },
      { key: 'Total Pagado' as const, label: 'Total Pagado' },
      { key: 'Saldo' as const, label: 'Saldo' },
    ];

    // Generar nombre de archivo descriptivo con año actual
    const añoActual = new Date().getFullYear();
    const nombreArchivo = `Ingresos_Odoo_${añoActual}`;

    exportToCSV(dataToExport, nombreArchivo, headers);
    showToast('Exportación completada correctamente', 'success');
  };

  const headerActions: PageHeaderAction[] = [
    {
      icon: 'filter_list',
      label: 'Filtros',
      onClick: () => setIsFilterPanelOpen(true),
      variant: 'default',
    },
    {
      icon: 'download',
      label: 'Descargar',
      onClick: handleExport,
      variant: 'default',
    },
  ];

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  // Preparar datos para UniversalSearchBar
  const ingresosForSearch = useMemo(() => {
    return ingresos.map((ingreso) => ({
      id: ingreso.id,
      cliente: ingreso.cliente,
      factura: ingreso.factura,
      estado: ingreso.estado,
      total: ingreso.total,
    }));
  }, [ingresos]);

  // Handlers para cambios en la tabla (no operativos con datos de Odoo, pero necesarios para la interfaz)
  const handlePaymentStatusChange = (recordId: string, newStatus: 'Pagado' | 'Pendiente') => {
    // No se puede modificar el estado de pago en facturas de Odoo
    showToast('El estado de pago se gestiona desde Odoo', 'info');
  };

  const handleDelete = (recordId: string) => {
    // No se pueden eliminar facturas de Odoo desde aquí
    showToast('Las facturas se gestionan desde Odoo', 'info');
  };

  return (
    <div className="layout-page-container">
      <PageHeader
        title="Ingresos"
        showSearch={false}
        actions={headerActions}
      />
      <div className="action-toolbar">
        <UniversalSearchBar
          items={ingresosForSearch}
          onFilter={() => {
            // El filtrado se maneja en IngresosTable usando searchTerm
          }}
          onSearchTermChange={setBusqueda}
          searchFields={['cliente', 'factura', 'estado', 'total']}
          placeholder="Buscar por cliente, factura, estado, total..."
        />
      </div>
      <div className="studio-container">
        {/* Tarjetas de Resumen Compactas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Total Acumulado"
            value={formatCurrency(kpis.totalAcumulado)}
            icon="account_balance"
            color="blue"
            compact
          />
          <StatCard
            title="Pendiente"
            value={formatCurrency(kpis.pendiente)}
            icon="pending"
            color="orange"
            compact
          />
          <StatCard
            title="Operaciones"
            value={kpis.numeroOperaciones}
            icon="receipt_long"
            color="purple"
            compact
          />
        </div>

        {/* Tabla - Protagonista absoluta */}
        <div className="studio-card">
          <div className="mt-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="auth-loading-spinner"></div>
                <p className="ml-4 text-gray-600 dark:text-gray-400">Cargando facturas de Odoo...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
                  error
                </span>
                <p className="text-gray-600 dark:text-gray-400 mb-2">Error al cargar facturas</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">{error}</p>
              </div>
            ) : (
              <IngresosTable 
                searchTerm={busqueda} 
                filters={filters}
                ingresos={ingresos}
                onPaymentStatusChange={handlePaymentStatusChange}
                onDelete={handleDelete}
              />
            )}
          </div>
        </div>
      </div>

      <FilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        onFilterChange={handleFilterChange}
        initialFilters={filters}
        type="ingresos"
      />
    </div>
  );
};
