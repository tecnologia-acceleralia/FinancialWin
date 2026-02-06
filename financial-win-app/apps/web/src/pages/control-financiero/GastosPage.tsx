import React, { useMemo, useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { GastosTable } from '../../features/finance/components/GastosTable';
import { PageHeader, type PageHeaderAction } from '../../components/layout';
import { FilterPanel, type FilterValues } from '../../features/finance/components/FilterPanel';
import { StatCard, UniversalSearchBar } from '../../components/common';
import { exportToCSV } from '../../utils/exportToCSV';
import { useToast } from '../../contexts/ToastContext';
import { odooService, type OdooInvoice, mapOdooStatus } from '../../services/odooService';

// Interfaz para mapear datos de Odoo al formato de la tabla
interface MappedGasto {
  id: string;
  fecha: string;
  proveedor: string;
  monto: number;
  estado: 'Borrador' | 'Publicado' | 'En proceso de pago' | 'Pagada' | 'Revertido';
  numero: string;
  invoiceDate: string | null;
  currency: string;
}

export const GastosPage: React.FC = () => {
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
        const data = await odooService.getInvoices('in_invoice');
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

  // Mapear facturas de Odoo al formato esperado
  const mappedGastos = useMemo<MappedGasto[]>(() => {
    return invoices.map((invoice) => {
      // Mapear estado usando la función auxiliar
      const estado = mapOdooStatus(invoice.state, invoice.payment_state);

      // Formatear fecha
      const fecha = invoice.invoice_date
        ? new Date(invoice.invoice_date).toLocaleDateString('es-ES')
        : '-';

      // Obtener nombre del proveedor
      const proveedor = invoice.partner_id?.[1] || 'Sin proveedor';

      // Obtener moneda
      const currency = invoice.currency_id?.[1] || 'EUR';

      return {
        id: invoice.id.toString(),
        fecha,
        proveedor,
        monto: invoice.amount_total || 0,
        estado,
        numero: invoice.name,
        invoiceDate: invoice.invoice_date || null,
        currency,
      };
    });
  }, [invoices]);

  // Calcular KPIs desde datos de Odoo
  const kpis = useMemo(() => {
    // Total Acumulado: Suma solo las facturas que NO sean 'Borrador' o 'Revertido'
    // Incluye: Publicado, En proceso de pago, Pagada
    const totalAcumulado = mappedGastos
      .filter((gasto) => 
        gasto.estado !== 'Borrador' && 
        gasto.estado !== 'Revertido'
      )
      .reduce((sum, gasto) => {
        return sum + (gasto.monto || 0);
      }, 0);

    // Pendiente: Suma las facturas 'Publicado' y 'En proceso de pago'
    // Excluye: Borrador, Pagada, Revertido
    const pendiente = mappedGastos
      .filter((gasto) => 
        gasto.estado === 'Publicado' || 
        gasto.estado === 'En proceso de pago'
      )
      .reduce((sum, gasto) => {
        return sum + (gasto.monto || 0);
      }, 0);

    const numeroOperaciones = mappedGastos.length;

    return {
      totalAcumulado,
      pendiente,
      numeroOperaciones,
    };
  }, [mappedGastos]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Obtener datos filtrados para exportar
  const getFilteredGastos = useMemo(() => {
    let resultado = mappedGastos;

    // Filtro por búsqueda de texto
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase().trim();
      resultado = resultado.filter(
        (gasto) =>
          gasto.proveedor.toLowerCase().includes(busquedaLower) ||
          gasto.numero.toLowerCase().includes(busquedaLower)
      );
    }

    // Aplicar filtros avanzados
    if (filters) {
      // Filtro por rango de fechas
      if (filters.dateRange.from) {
        resultado = resultado.filter((gasto) => {
          if (!gasto.invoiceDate) return false;
          const fechaFactura = new Date(gasto.invoiceDate);
          const fechaDesde = new Date(filters.dateRange.from);
          fechaDesde.setHours(0, 0, 0, 0);
          return fechaFactura >= fechaDesde;
        });
      }
      if (filters.dateRange.to) {
        resultado = resultado.filter((gasto) => {
          if (!gasto.invoiceDate) return false;
          const fechaFactura = new Date(gasto.invoiceDate);
          const fechaHasta = new Date(filters.dateRange.to);
          fechaHasta.setHours(23, 59, 59, 999);
          return fechaFactura <= fechaHasta;
        });
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
          return gasto.monto >= filters.amountRange.min!;
        });
      }
      if (filters.amountRange.max !== null) {
        resultado = resultado.filter((gasto) => {
          return gasto.monto <= filters.amountRange.max!;
        });
      }
    }

    return resultado;
  }, [mappedGastos, busqueda, filters]);

  // Función para exportar a CSV
  const handleExport = () => {
    const dataToExport = getFilteredGastos.map((gasto) => {
      return {
        Estado: gasto.estado,
        Proveedor: gasto.proveedor,
        'Fecha Factura': gasto.fecha,
        Moneda: gasto.currency,
        'Número Factura': gasto.numero,
        'Total Banco': gasto.monto.toFixed(2),
      };
    });

    const headers = [
      { key: 'Estado' as const, label: 'Estado' },
      { key: 'Proveedor' as const, label: 'Proveedor' },
      { key: 'Fecha Factura' as const, label: 'Fecha Factura' },
      { key: 'Moneda' as const, label: 'Moneda' },
      { key: 'Número Factura' as const, label: 'Número Factura' },
      { key: 'Total Banco' as const, label: 'Total Banco' },
    ];

    exportToCSV(dataToExport, `gastos_${new Date().toISOString().split('T')[0]}`, headers);
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
  const gastosForSearch = useMemo(() => {
    return mappedGastos.map((gasto) => ({
      id: gasto.id,
      proveedor: gasto.proveedor,
      numero: gasto.numero,
      estado: gasto.estado,
      total: gasto.monto.toString(),
    }));
  }, [mappedGastos]);

  return (
    <div className="layout-page-container">
      <PageHeader
        title="Gastos"
        showSearch={false}
        actions={headerActions}
      />
      <div className="action-toolbar">
        <UniversalSearchBar
          items={gastosForSearch}
          onFilter={() => {
            // El filtrado se maneja en GastosTable usando searchTerm
          }}
          onSearchTermChange={setBusqueda}
          searchFields={['proveedor', 'numero', 'estado', 'total']}
          placeholder="Buscar por proveedor, número de factura, estado, total..."
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Cargando facturas de Odoo...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <span className="text-red-600">Error: {error}</span>
              </div>
            ) : (
              <GastosTable searchTerm={busqueda} filters={filters} invoices={invoices} />
            )}
          </div>
        </div>
      </div>

      <FilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        onFilterChange={handleFilterChange}
        initialFilters={filters}
        type="gastos"
      />
    </div>
  );
};
