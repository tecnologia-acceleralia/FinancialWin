import React, { useMemo, useState, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useFinancial } from '../../contexts/FinancialContext';
import { IngresosTable } from '../../features/finance/components/IngresosTable';
import { PageHeader, type PageHeaderAction } from '../../components/layout';
import { FilterPanel, type FilterValues } from '../../features/finance/components/FilterPanel';
import { StatCard } from '../../components/common';
import { exportToCSV } from '../../utils/exportToCSV';
import { importFromExcel } from '../../utils/importFromExcel';
import { useToast } from '../../contexts/ToastContext';

export const IngresosPage: React.FC = () => {
  const { t } = useLanguage();
  const { income, addRecord } = useFinancial();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busqueda, setBusqueda] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    dateRange: { from: '', to: '' },
    categories: [],
    status: [],
    erpStatus: [],
    documentType: [],
    amountRange: { min: null, max: null },
  });

  // Calcular KPIs (solo para tarjetas pequeñas)
  const kpis = useMemo(() => {
    const validIncome = income.filter(
      (record) => record.data.supplier && record.data.total
    );

    const totalAcumulado = validIncome.reduce((sum, record) => {
      const total = parseFloat(record.data.total?.toString() || '0');
      return sum + (isNaN(total) ? 0 : total);
    }, 0);

    const pendiente = validIncome
      .filter((record) => record.paymentStatus === 'Pendiente')
      .reduce((sum, record) => {
        const total = parseFloat(record.data.total?.toString() || '0');
        return sum + (isNaN(total) ? 0 : total);
      }, 0);

    const numeroOperaciones = validIncome.length;

    return {
      totalAcumulado,
      pendiente,
      numeroOperaciones,
    };
  }, [income]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Obtener datos filtrados para exportar (replicando lógica de la tabla)
  const getFilteredIncome = useMemo(() => {
    let resultado = income.filter(
      (record) => record.data.supplier && record.data.total
    );

    // Filtro por búsqueda de texto
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase().trim();
      resultado = resultado.filter(
        (record) =>
          record.data.supplier?.toLowerCase().includes(busquedaLower) ||
          record.data.invoiceNum?.toLowerCase().includes(busquedaLower)
      );
    }

    // Aplicar filtros avanzados
    if (filters) {
      // Filtro por rango de fechas
      if (filters.dateRange.from) {
        resultado = resultado.filter((record) => {
          const fechaFactura = record.data.issueDate
            ? new Date(record.data.issueDate)
            : new Date(record.createdAt);
          const fechaDesde = new Date(filters.dateRange.from);
          fechaDesde.setHours(0, 0, 0, 0);
          return fechaFactura >= fechaDesde;
        });
      }
      if (filters.dateRange.to) {
        resultado = resultado.filter((record) => {
          const fechaFactura = record.data.issueDate
            ? new Date(record.data.issueDate)
            : new Date(record.createdAt);
          const fechaHasta = new Date(filters.dateRange.to);
          fechaHasta.setHours(23, 59, 59, 999);
          return fechaFactura <= fechaHasta;
        });
      }

      // Filtro por estados
      if (filters.status.length > 0) {
        resultado = resultado.filter((record) => {
          const estado =
            record.paymentStatus === 'Pagado'
              ? 'Pagado'
              : 'Pendiente Pago';
          return filters.status.includes(estado);
        });
      }

      // Filtro por rango de importe
      if (filters.amountRange.min !== null) {
        resultado = resultado.filter((record) => {
          const total = parseFloat(record.data.total?.toString() || '0');
          return total >= filters.amountRange.min!;
        });
      }
      if (filters.amountRange.max !== null) {
        resultado = resultado.filter((record) => {
          const total = parseFloat(record.data.total?.toString() || '0');
          return total <= filters.amountRange.max!;
        });
      }
    }

    return resultado;
  }, [income, busqueda, filters]);

  // Función para exportar a CSV
  const handleExport = () => {
    const dataToExport = getFilteredIncome.map((record) => {
      const total = parseFloat(record.data.total?.toString() || '0');
      const base = parseFloat(record.data.base?.toString() || '0');
      const vat = parseFloat(record.data.vat?.toString() || '0');

      const fechaFactura = record.data.issueDate
        ? new Date(record.data.issueDate)
        : new Date(record.createdAt);

      // Calcular vencimiento (30 días después de la fecha de factura)
      const vencimiento = new Date(fechaFactura);
      vencimiento.setDate(vencimiento.getDate() + 30);

      const totalPagado = record.paymentStatus === 'Pagado' ? total : 0;
      const saldo = total - totalPagado;

      return {
        Estado: record.paymentStatus === 'Pagado' ? 'Pagado' : 'Pendiente Pago',
        Cliente: record.data.supplier || '',
        Factura: record.data.invoiceNum || `F-${record.id.slice(-6)}`,
        'Fecha Factura': fechaFactura.toLocaleDateString('es-ES'),
        'Fecha Pago':
          record.paymentStatus === 'Pagado'
            ? new Date(record.updatedAt).toLocaleDateString('es-ES')
            : '-',
        Vencimiento: vencimiento.toLocaleDateString('es-ES'),
        Importe: base.toFixed(2),
        IVA: vat.toFixed(2),
        Total: total.toFixed(2),
        'Total Pagado': totalPagado.toFixed(2),
        Saldo: saldo.toFixed(2),
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
    const nombreArchivo = `Ingresos_Financieros_${añoActual}`;

    exportToCSV(dataToExport, nombreArchivo, headers);
    showToast('Exportación completada correctamente', 'success');
  };

  // Función para importar desde Excel/CSV
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await importFromExcel(file, 'income');

      if (result.success && result.records.length > 0) {
        // Agregar cada registro al contexto
        result.records.forEach((record) => {
          addRecord({
            type: record.type,
            data: record.data,
            documentType: record.documentType,
            fileName: record.fileName,
            fileUrl: record.fileUrl,
            erpStatus: record.erpStatus,
            paymentStatus: record.paymentStatus,
          });
        });

        // Mostrar mensaje de éxito
        const message =
          result.records.length === 1
            ? `Se importó 1 registro correctamente`
            : `Se importaron ${result.records.length} registros correctamente`;

        if (result.warnings.length > 0) {
          showToast(
            `${message}. Advertencias: ${result.warnings.join('; ')}`,
            'success'
          );
        } else {
          showToast(message, 'success');
        }
      } else {
        // Mostrar errores
        const errorMessage =
          result.errors.length > 0
            ? result.errors.join('; ')
            : 'No se pudieron importar registros del archivo';
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : 'Error al importar el archivo',
        'error'
      );
    } finally {
      // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const headerActions: PageHeaderAction[] = [
    {
      icon: 'filter_list',
      label: 'Filtros',
      onClick: () => setIsFilterPanelOpen(true),
      variant: 'default',
    },
    {
      icon: 'upload_file',
      label: 'Importar Excel',
      onClick: handleImport,
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

  return (
    <div className="layout-page-container">
      <PageHeader
        title="Ingresos"
        showSearch={true}
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        searchPlaceholder="Buscar ingreso (cliente, factura, estado)..."
        actions={headerActions}
      />
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
            <IngresosTable searchTerm={busqueda} filters={filters} />
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

      {/* Input oculto para importar archivos */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        aria-label="Importar archivo Excel o CSV"
      />
    </div>
  );
};
