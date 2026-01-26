import React, { useMemo, useState, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useFinancial } from '../../contexts/FinancialContext';
import { GastosTable } from '../../features/finance/components/GastosTable';
import { PageHeader, type PageHeaderAction } from '../../components/layout';
import { FilterPanel, type FilterValues } from '../../features/finance/components/FilterPanel';
import { StatCard } from '../../components/common';
import { exportToCSV } from '../../utils/exportToCSV';
import { importFromExcel } from '../../utils/importFromExcel';
import { useToast } from '../../contexts/ToastContext';

export const GastosPage: React.FC = () => {
  const { t } = useLanguage();
  const { expenses, addRecord } = useFinancial();
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
    const validExpenses = expenses.filter(
      (expense) => expense.data.supplier && expense.data.total
    );

    const totalAcumulado = validExpenses.reduce((sum, expense) => {
      const total = parseFloat(expense.data.total?.toString() || '0');
      return sum + (isNaN(total) ? 0 : total);
    }, 0);

    const pendiente = validExpenses
      .filter((expense) => expense.paymentStatus === 'Pendiente')
      .reduce((sum, expense) => {
        const total = parseFloat(expense.data.total?.toString() || '0');
        return sum + (isNaN(total) ? 0 : total);
      }, 0);

    const numeroOperaciones = validExpenses.length;

    return {
      totalAcumulado,
      pendiente,
      numeroOperaciones,
    };
  }, [expenses]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Obtener datos filtrados para exportar (replicando lógica de la tabla)
  const getFilteredExpenses = useMemo(() => {
    let resultado = expenses.filter(
      (expense) => expense.data.supplier && expense.data.total
    );

    // Filtro por búsqueda de texto
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase().trim();
      resultado = resultado.filter(
        (expense) =>
          expense.data.supplier?.toLowerCase().includes(busquedaLower) ||
          expense.data.department?.toLowerCase().includes(busquedaLower) ||
          expense.data.expenseType?.toLowerCase().includes(busquedaLower)
      );
    }

    // Aplicar filtros avanzados
    if (filters) {
      // Filtro por rango de fechas
      if (filters.dateRange.from) {
        resultado = resultado.filter((expense) => {
          const fechaFactura = expense.data.issueDate
            ? new Date(expense.data.issueDate)
            : new Date(expense.createdAt);
          const fechaDesde = new Date(filters.dateRange.from);
          fechaDesde.setHours(0, 0, 0, 0);
          return fechaFactura >= fechaDesde;
        });
      }
      if (filters.dateRange.to) {
        resultado = resultado.filter((expense) => {
          const fechaFactura = expense.data.issueDate
            ? new Date(expense.data.issueDate)
            : new Date(expense.createdAt);
          const fechaHasta = new Date(filters.dateRange.to);
          fechaHasta.setHours(23, 59, 59, 999);
          return fechaFactura <= fechaHasta;
        });
      }

      // Filtro por categorías (tipo)
      if (filters.categories.length > 0) {
        resultado = resultado.filter((expense) =>
          filters.categories.includes(expense.data.expenseType || '')
        );
      }

      // Filtro por estados
      if (filters.status.length > 0) {
        resultado = resultado.filter((expense) => {
          const estado =
            expense.paymentStatus === 'Pagado' ? 'Pagado' : 'Registrada';
          return filters.status.includes(estado);
        });
      }

      // Filtro por rango de importe
      if (filters.amountRange.min !== null) {
        resultado = resultado.filter((expense) => {
          const total = parseFloat(expense.data.total?.toString() || '0');
          return total >= filters.amountRange.min!;
        });
      }
      if (filters.amountRange.max !== null) {
        resultado = resultado.filter((expense) => {
          const total = parseFloat(expense.data.total?.toString() || '0');
          return total <= filters.amountRange.max!;
        });
      }
    }

    return resultado;
  }, [expenses, busqueda, filters]);

  // Función para exportar a CSV
  const handleExport = () => {
    const dataToExport = getFilteredExpenses.map((expense) => {
      const total = parseFloat(expense.data.total?.toString() || '0');
      const base = parseFloat(expense.data.base?.toString() || '0');
      const vat = parseFloat(expense.data.vat?.toString() || '0');

      return {
        Estado: expense.paymentStatus === 'Pagado' ? 'Pagado' : 'Pendiente',
        Proveedor: expense.data.supplier || '',
        Departamento: expense.data.department || 'N/A',
        Tipo: expense.data.expenseType || 'Otros',
        'Fecha Factura': expense.data.issueDate
          ? new Date(expense.data.issueDate).toLocaleDateString('es-ES')
          : new Date(expense.createdAt).toLocaleDateString('es-ES'),
        'Fecha Pago':
          expense.paymentStatus === 'Pagado'
            ? new Date(expense.updatedAt).toLocaleDateString('es-ES')
            : '-',
        Moneda: expense.data.currency || 'EUR',
        Vía: 'Transferencia',
        Importe: base.toFixed(2),
        Variable: '0.00',
        IVA: vat.toFixed(2),
        'Total Banco': total.toFixed(2),
      };
    });

    const headers = [
      { key: 'Estado' as const, label: 'Estado' },
      { key: 'Proveedor' as const, label: 'Proveedor' },
      { key: 'Departamento' as const, label: 'Departamento' },
      { key: 'Tipo' as const, label: 'Tipo' },
      { key: 'Fecha Factura' as const, label: 'Fecha Factura' },
      { key: 'Fecha Pago' as const, label: 'Fecha Pago' },
      { key: 'Moneda' as const, label: 'Moneda' },
      { key: 'Vía' as const, label: 'Vía' },
      { key: 'Importe' as const, label: 'Importe' },
      { key: 'Variable' as const, label: 'Variable' },
      { key: 'IVA' as const, label: 'IVA' },
      { key: 'Total Banco' as const, label: 'Total Banco' },
    ];

    exportToCSV(dataToExport, `gastos_${new Date().toISOString().split('T')[0]}`, headers);
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
      const result = await importFromExcel(file, 'expense');

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
        title="Gastos"
        showSearch={true}
        searchValue={busqueda}
        onSearchChange={setBusqueda}
        searchPlaceholder="Buscar gasto (proveedor, departamento, tipo)..."
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
            <GastosTable searchTerm={busqueda} filters={filters} />
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
