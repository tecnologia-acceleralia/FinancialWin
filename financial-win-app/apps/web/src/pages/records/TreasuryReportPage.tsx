import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PageHeader } from '../../components/layout';
import { useFinancialStats } from '../../hooks/useFinancialStats';
import { ExpensesStackedBarChart } from '../../components/common/ExpensesStackedBarChart';
import { formatDateForInput } from '../../utils/dateUtils';
import type { FinancialRecord } from '../../contexts/FinancialContext';
import type { ExtractedData } from '../../types';
import type { OdooInvoice } from '../../services/odooService';

type Department = 'Marketing' | 'Operaciones' | 'Ventas' | 'IT' | 'General';

type TimeFilter = 'all' | 'overdue' | 'due30days';

interface InvoiceRow {
  id: string;
  fecha: string;
  vencimiento: string | null;
  vencimientoDate: Date | null;
  proveedor: string;
  numeroFactura: string;
  importe: number;
  department: Department | undefined;
  record: FinancialRecord;
  state: 'posted' | 'draft' | 'cancel'; // Estado de la factura en Odoo
  moveType: 'out_invoice' | 'in_invoice'; // Tipo de factura: out_invoice = Cobrar, in_invoice = Pagar
}

/**
 * Componente de tarjeta KPI para el resumen
 */
interface KPICardProps {
  label: string;
  value: string | number;
  icon: string;
  iconContainerClass?: string;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, icon, iconContainerClass = 'stat-icon-container-blue' }) => {
  return (
    <div className="studio-kpi-card">
      <div className="stat-header">
        <div>
          <p className="stat-label">{label}</p>
          <h3 className="stat-value">
            {value}
          </h3>
        </div>
        <div className={iconContainerClass}>
          <span className={`material-symbols-outlined ${
            iconContainerClass.includes('red') ? 'stat-icon-red' :
            iconContainerClass.includes('orange') ? 'stat-icon-orange' :
            iconContainerClass.includes('purple') ? 'stat-icon-purple' :
            iconContainerClass.includes('green') ? 'stat-icon-green' :
            'stat-icon-blue'
          }`}>
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Componente de select estilizado para departamento
 */
interface DepartmentSelectProps {
  value: Department | undefined;
  onChange: (value: Department) => void;
  invoiceId: string;
  isSynced: boolean;
}

const DepartmentSelect: React.FC<DepartmentSelectProps> = ({ value, onChange, invoiceId, isSynced }) => {
  const departments: Department[] = ['Marketing', 'Operaciones', 'Ventas', 'IT', 'General'];

  return (
    <div className="department-select-wrapper">
      <select
        className="department-select"
        value={value || ''}
        onChange={(e) => {
          if (e.target.value) {
            onChange(e.target.value as Department);
          }
        }}
      >
        <option value="">Sin clasificar</option>
        {departments.map((dept) => (
          <option key={dept} value={dept}>
            {dept}
          </option>
        ))}
      </select>
      {isSynced && value && (
        <span className="department-sync-indicator" title="Sincronizado">
          <span className="material-symbols-outlined">check_circle</span>
        </span>
      )}
    </div>
  );
};

export const TreasuryReportPage: React.FC = () => {
  // Usar modo tesorería para filtrar solo cuentas pendientes (como en informes de Odoo)
  // CRÍTICO: useFinancialStats(true) está configurado para pedir tanto 'posted' como 'draft'
  // El dominio base en getInvoices incluye: ['state', 'in', ['posted', 'draft']]
  const { 
    validExpensesForChart, 
    allIncome,
    isLoading, 
    formatCurrency, 
    kpis,
    expenseInvoices,
    incomeInvoices,
    refreshData // Función para refrescar datos después de subir Excel
  } = useFinancialStats(true); // treasuryMode = true
  
  // Estado local para las clasificaciones de departamento
  // En el futuro, esto se sincronizará con Odoo
  const [departmentAssignments, setDepartmentAssignments] = useState<Record<string, Department>>({});
  const [syncedInvoices, setSyncedInvoices] = useState<Set<string>>(new Set());
  
  // Estado para el filtro de tiempo
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  // Estados para los filtros estilo Odoo
  const [dateUntil, setDateUntil] = useState<Date>(new Date()); // Fecha de corte (por defecto hoy)
  // IMPORTANTE: Estado inicial 'Todos' para que la usuaria vea las previsiones nada más entrar
  const [entryStatus, setEntryStatus] = useState<'Publicados' | 'Todos'>('Todos'); // Publicados o Todos
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Cerrar date picker al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  // Función para manejar cambio de fecha
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setDateUntil(newDate);
      setShowDatePicker(false);
    }
  };

  // Crear mapa de facturas de Odoo por ID para acceder a invoice_date_due
  const odooInvoicesMap = useMemo(() => {
    const map = new Map<string, OdooInvoice>();
    [...expenseInvoices, ...incomeInvoices].forEach((invoice) => {
      // El ID en FinancialRecord es 'odoo-{id}', así que usamos el ID numérico de Odoo
      map.set(`odoo-${invoice.id}`, invoice);
    });
    return map;
  }, [expenseInvoices, incomeInvoices]);

  // Transformar facturas a formato de tabla (combinar ingresos y gastos)
  const invoiceRows = useMemo((): InvoiceRow[] => {
    // Combinar ingresos (out_invoice) y gastos (in_invoice) con su tipo
    const allRecords = [
      ...allIncome.map(record => ({ record, moveType: 'out_invoice' as const })),
      ...validExpensesForChart.map(record => ({ record, moveType: 'in_invoice' as const })),
    ];
    
    const rows = allRecords.map(({ record, moveType }) => {
      const invoiceDate = record.data.issueDate || record.createdAt;
      const fecha = invoiceDate ? new Date(invoiceDate).toLocaleDateString('es-ES') : 'N/A';
      const proveedor = record.data.supplier || 'Sin proveedor';
      const numeroFactura = record.data.invoiceNum || 'N/A';
      const importe = Number(record.data.total?.toString() || '0');
      
      // Obtener factura original de Odoo (una sola referencia para toda la transformación)
      const odooInvoice = odooInvoicesMap.get(record.id);
      
      // Extraer fecha de vencimiento
      const invoiceDateDue = odooInvoice?.invoice_date_due;
      let vencimiento: string | null = null;
      let vencimientoDate: Date | null = null;
      
      if (invoiceDateDue && invoiceDateDue !== false && invoiceDateDue !== null) {
        vencimientoDate = new Date(invoiceDateDue);
        if (!isNaN(vencimientoDate.getTime())) {
          vencimiento = vencimientoDate.toLocaleDateString('es-ES');
        }
      }
      
      // CRÍTICO: Extraer estado de la factura directamente de Odoo
      // posted = Confirmado (badge verde), draft = Previsión (badge azul)
      // Asegurarse de usar el campo 'state' que viene de Odoo
      // Si no hay odooInvoice, asumir 'draft' (previsión) en lugar de 'posted'
      const invoiceState: 'posted' | 'draft' | 'cancel' = odooInvoice?.state ?? 'draft';
      
      // Obtener departamento asignado o el existente en el record
      // Mapear departamentos del sistema a los permitidos en la consola
      const recordDepartment = record.data.department;
      let mappedDepartment: Department | undefined;
      
      if (recordDepartment) {
        // Mapear departamentos del sistema a los de la consola
        if (recordDepartment === 'Marketing' || recordDepartment === 'Ventas' || 
            recordDepartment === 'Operaciones' || recordDepartment === 'IT') {
          mappedDepartment = recordDepartment;
        } else {
          // Para otros departamentos (Administración, RRHH, Dirección), usar 'General'
          mappedDepartment = 'General';
        }
      }
      
      const assignedDepartment = departmentAssignments[record.id] || mappedDepartment;
      
      return {
        id: record.id,
        fecha,
        vencimiento,
        vencimientoDate,
        proveedor,
        numeroFactura,
        importe,
        department: assignedDepartment,
        record,
        state: invoiceState,
        moveType,
      };
    });

    // Aplicar filtros estilo Odoo
    let filteredRows = rows;

    // Filtro por estado (Publicados / Todos)
    if (entryStatus === 'Publicados') {
      filteredRows = filteredRows.filter(row => row.state === 'posted');
    }
    // Si es 'Todos', incluye tanto 'posted' como 'draft' (no incluimos 'cancel')

    // Filtro por fecha de vencimiento (hasta dateUntil)
    // IMPORTANTE: No descartar filas sin vencimientoDate, mostrarlas al final
    const dateUntilEnd = new Date(dateUntil);
    dateUntilEnd.setHours(23, 59, 59, 999);
    
    // Separar filas con y sin fecha de vencimiento
    const rowsWithDate: InvoiceRow[] = [];
    const rowsWithoutDate: InvoiceRow[] = [];
    
    filteredRows.forEach(row => {
      if (!row.vencimientoDate) {
        // Filas sin fecha van al final
        rowsWithoutDate.push(row);
      } else if (row.vencimientoDate <= dateUntilEnd) {
        // Filas con fecha válida (dentro del rango)
        rowsWithDate.push(row);
      }
      // Filas con fecha fuera del rango se descartan
    });

    // Ordenar filas con fecha por fecha de vencimiento ascendente (lo que vence antes, arriba)
    rowsWithDate.sort((a, b) => {
      if (!a.vencimientoDate || !b.vencimientoDate) return 0;
      return a.vencimientoDate.getTime() - b.vencimientoDate.getTime();
    });

    // Combinar: primero las que tienen fecha (ordenadas), luego las que no tienen fecha
    return [...rowsWithDate, ...rowsWithoutDate];
  }, [allIncome, validExpensesForChart, departmentAssignments, odooInvoicesMap, dateUntil, entryStatus]);
  
  // Separar facturas en cuentas por cobrar (out_invoice) y por pagar (in_invoice)
  // Ahora se filtran según viewType
  const receivableInvoices = useMemo(() => {
    return invoiceRows.filter(row => row.moveType === 'out_invoice');
  }, [invoiceRows]);
  
  const payableInvoices = useMemo(() => {
    return invoiceRows.filter(row => row.moveType === 'in_invoice');
  }, [invoiceRows]);

  // Calcular todas las facturas SIN filtrar por entryStatus para los KPIs
  // Esto asegura que los totales incluyan tanto 'posted' como 'draft' para previsión real
  const allInvoiceRowsForKPIs = useMemo((): InvoiceRow[] => {
    // Combinar ingresos (out_invoice) y gastos (in_invoice) con su tipo
    const allRecords = [
      ...allIncome.map(record => ({ record, moveType: 'out_invoice' as const })),
      ...validExpensesForChart.map(record => ({ record, moveType: 'in_invoice' as const })),
    ];
    
    const rows = allRecords.map(({ record, moveType }) => {
      const invoiceDate = record.data.issueDate || record.createdAt;
      const fecha = invoiceDate ? new Date(invoiceDate).toLocaleDateString('es-ES') : 'N/A';
      const proveedor = record.data.supplier || 'Sin proveedor';
      const numeroFactura = record.data.invoiceNum || 'N/A';
      const importe = Number(record.data.total?.toString() || '0');
      
      // Obtener factura original de Odoo
      const odooInvoice = odooInvoicesMap.get(record.id);
      
      // Extraer fecha de vencimiento
      const invoiceDateDue = odooInvoice?.invoice_date_due;
      let vencimiento: string | null = null;
      let vencimientoDate: Date | null = null;
      
      if (invoiceDateDue && invoiceDateDue !== false && invoiceDateDue !== null) {
        vencimientoDate = new Date(invoiceDateDue);
        if (!isNaN(vencimientoDate.getTime())) {
          vencimiento = vencimientoDate.toLocaleDateString('es-ES');
        }
      }
      
      // Extraer estado de la factura
      const invoiceState: 'posted' | 'draft' | 'cancel' = odooInvoice?.state || 'posted';
      
      // Obtener departamento asignado
      const recordDepartment = record.data.department;
      let mappedDepartment: Department | undefined;
      
      if (recordDepartment) {
        if (recordDepartment === 'Marketing' || recordDepartment === 'Ventas' || 
            recordDepartment === 'Operaciones' || recordDepartment === 'IT') {
          mappedDepartment = recordDepartment;
        } else {
          mappedDepartment = 'General';
        }
      }
      
      const assignedDepartment = departmentAssignments[record.id] || mappedDepartment;
      
      return {
        id: record.id,
        fecha,
        vencimiento,
        vencimientoDate,
        proveedor,
        numeroFactura,
        importe,
        department: assignedDepartment,
        record,
        state: invoiceState,
        moveType,
      };
    });

    // Aplicar solo filtro por fecha de vencimiento (hasta dateUntil)
    // NO filtrar por entryStatus para incluir todas las facturas (posted y draft)
    const dateUntilEnd = new Date(dateUntil);
    dateUntilEnd.setHours(23, 59, 59, 999);
    return rows.filter(row => {
      if (!row.vencimientoDate) return false;
      return row.vencimientoDate <= dateUntilEnd;
    });
  }, [allIncome, validExpensesForChart, departmentAssignments, odooInvoicesMap, dateUntil]);
  
  // Función para filtrar por tiempo
  const filterByTime = (rows: InvoiceRow[]): InvoiceRow[] => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const en30Dias = new Date();
    en30Dias.setDate(en30Dias.getDate() + 30);
    en30Dias.setHours(23, 59, 59, 999);
    
    switch (timeFilter) {
      case 'overdue':
        return rows.filter(row => {
          if (!row.vencimientoDate) return false;
          const fechaVencimiento = new Date(row.vencimientoDate);
          fechaVencimiento.setHours(0, 0, 0, 0);
          return fechaVencimiento < hoy;
        });
      case 'due30days':
        return rows.filter(row => {
          if (!row.vencimientoDate) return false;
          const fechaVencimiento = new Date(row.vencimientoDate);
          fechaVencimiento.setHours(0, 0, 0, 0);
          return fechaVencimiento >= hoy && fechaVencimiento <= en30Dias;
        });
      default:
        return rows;
    }
  };
  
  // Aplicar filtro de tiempo a ambas listas
  const filteredReceivableInvoices = useMemo(() => {
    return filterByTime(receivableInvoices);
  }, [receivableInvoices, timeFilter]);
  
  const filteredPayableInvoices = useMemo(() => {
    return filterByTime(payableInvoices);
  }, [payableInvoices, timeFilter]);

  // Calcular KPIs: Total a Cobrar (verde) y Total a Pagar (rojo/ámbar)
  // IMPORTANTE: Usar allInvoiceRowsForKPIs que incluye TODAS las facturas (posted y draft)
  // para que la previsión de caja sea real
  const totalACobrar = useMemo(() => {
    return allInvoiceRowsForKPIs
      .filter(row => row.moveType === 'out_invoice')
      .reduce((sum, row) => sum + row.importe, 0);
  }, [allInvoiceRowsForKPIs]);
  
  const totalAPagar = useMemo(() => {
    return allInvoiceRowsForKPIs
      .filter(row => row.moveType === 'in_invoice')
      .reduce((sum, row) => sum + row.importe, 0);
  }, [allInvoiceRowsForKPIs]);

  // Datos para el gráfico de barras apiladas (solo gastos, actualizados en tiempo real con las clasificaciones)
  // El componente ExpensesStackedBarChart procesa los datos internamente agrupando por mes y departamento
  const chartData = useMemo(() => {
    // Solo incluir gastos (in_invoice) en el gráfico
    return payableInvoices.map((row) => ({
      ...row.record,
      data: {
        ...row.record.data,
        // Pasar el departamento asignado (o undefined para 'Sin Clasificar')
        // El componente ExpensesStackedBarChart manejará 'Sin Clasificar' automáticamente
        department: row.department as ExtractedData['department'] | undefined,
      },
    }));
  }, [payableInvoices]);

  // Manejar cambio de departamento
  const handleDepartmentChange = (invoiceId: string, department: Department) => {
    setDepartmentAssignments((prev) => ({
      ...prev,
      [invoiceId]: department,
    }));

    // Simular sincronización (en el futuro, esto será una llamada a Odoo)
    setTimeout(() => {
      setSyncedInvoices((prev) => new Set(prev).add(invoiceId));
    }, 500);
  };

  return (
    <div className="layout-page-container">
      <PageHeader
        title="Informe de Tesorería"
        showBackButton={false}
      />
      
      <div className="studio-container">
        <div className="studio-card">
          {/* Grid de Resumen con Gráfico */}
          <div className="classification-summary-grid">
            {/* Tarjetas KPI */}
            <div className="classification-kpi-grid">
              <KPICard
                label="Total a Cobrar"
                value={isLoading ? '...' : formatCurrency(totalACobrar)}
                icon="trending_up"
                iconContainerClass="stat-icon-container-green"
              />
              <KPICard
                label="Total a Pagar"
                value={isLoading ? '...' : formatCurrency(totalAPagar)}
                icon="trending_down"
                iconContainerClass="stat-icon-container-red"
              />
              <KPICard
                label="Saldo Neto"
                value={isLoading ? '...' : formatCurrency(totalACobrar - totalAPagar)}
                icon="account_balance"
                iconContainerClass={totalACobrar - totalAPagar >= 0 ? 'stat-icon-container-blue' : 'stat-icon-container-orange'}
              />
            </div>

            {/* Gráfico de Tendencia por Mes y Departamento */}
            <div className="classification-chart-container">
              {!isLoading && chartData.length > 0 ? (
                <ExpensesStackedBarChart 
                  records={chartData} 
                  title="Tendencia de Gastos por Mes y Departamento"
                />
              ) : (
                <div className="studio-card flex items-center justify-center h-64">
                  <p className="text-slate-500 dark:text-slate-400">
                    {isLoading ? 'Cargando datos...' : 'No hay datos para mostrar'}
                  </p>
                </div>
              )}
            </div>
        </div>

          {/* Separador visual entre Resumen y Gestión */}
          <hr className="filter-section-divider" />

          {/* Contenedor de Filtros con Espaciado */}
          <div className="filter-bar-container">
            {/* Barra de Filtros Estilo Odoo */}
            <div className="odoo-filter-bar">
            {/* Botón de Calendario (Hasta el DD/MM/YYYY) */}
            <div className="relative" ref={datePickerRef}>
              <button
                className={`odoo-filter-pill ${true ? 'active' : ''}`}
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <span className="odoo-filter-pill-icon">calendar_today</span>
                <span className="odoo-filter-pill-text text-slate-700 dark:text-slate-200">
                  Hasta el {dateUntil.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </button>
              {showDatePicker && (
                <div className="absolute top-full left-0 mt-2 z-10">
                  <input
                    type="date"
                    value={formatDateForInput(dateUntil.toISOString())}
                    onChange={handleDateChange}
                    className="odoo-date-input"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </div>

            {/* Botón de Basado en (Fecha de vencimiento) - Informacional */}
            <button
              className="odoo-filter-pill"
              disabled
            >
              <span className="odoo-filter-pill-icon">filter_list</span>
              <span className="odoo-filter-pill-text">Basado en: Fecha de vencimiento</span>
            </button>

            {/* Botón de Asientos (Publicados / Todos) */}
            <button
              className={`odoo-filter-pill ${entryStatus === 'Publicados' ? 'active' : ''}`}
              onClick={() => setEntryStatus('Publicados')}
            >
              <span className="odoo-filter-pill-text">Publicados</span>
            </button>
            <button
              className={`odoo-filter-pill ${entryStatus === 'Todos' ? 'active' : ''}`}
              onClick={() => setEntryStatus('Todos')}
            >
              <span className="odoo-filter-pill-text">Todos</span>
            </button>
            </div>
          </div>

          {/* Filtros de Tiempo (mantener compatibilidad) */}
          <div className="mt-4 mb-6">
            <div className="treasury-time-filters">
              <button
                className={`treasury-filter-btn ${timeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTimeFilter('all')}
              >
                Todas
              </button>
              <button
                className={`treasury-filter-btn ${timeFilter === 'overdue' ? 'active' : ''}`}
                onClick={() => setTimeFilter('overdue')}
              >
                Vencidas
              </button>
              <button
                className={`treasury-filter-btn ${timeFilter === 'due30days' ? 'active' : ''}`}
                onClick={() => setTimeFilter('due30days')}
              >
                Vencen en 30 días
              </button>
            </div>
          </div>

          {/* Tabla de Cuentas por Cobrar */}
          <div>
            <h2 className="table-section-title">
              Cuentas por Cobrar
            </h2>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-slate-500 dark:text-slate-400">Cargando facturas de Odoo...</p>
              </div>
            ) : filteredReceivableInvoices.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-slate-500 dark:text-slate-400">
                  No hay facturas por cobrar disponibles
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="classification-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Vencimiento</th>
                      <th>Cliente</th>
                      <th>Importe</th>
                      <th>Departamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReceivableInvoices.map((row) => {
                      // Determinar si la fecha está vencida
                      const hoy = new Date();
                      hoy.setHours(0, 0, 0, 0);
                      const estaVencida = row.vencimientoDate 
                        ? new Date(row.vencimientoDate).setHours(0, 0, 0, 0) < hoy.getTime()
                        : false;
                      
                      return (
                        <tr key={row.id}>
                          <td>
                            {row.state === 'posted' ? (
                              <span className="badge-tipo-factura">Confirmado</span>
                            ) : (
                              <span className="badge-tipo-prevision">Previsión</span>
                            )}
                          </td>
                          <td>
                            {row.vencimiento ? (
                              <span className={estaVencida ? 'text-red-500 dark:text-red-400' : ''}>
                                {row.vencimiento}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">-</span>
                            )}
                          </td>
                          <td>{row.proveedor}</td>
                          <td>{formatCurrency(row.importe)}</td>
                          <td>
                            <DepartmentSelect
                              value={row.department}
                              onChange={(dept) => handleDepartmentChange(row.id, dept)}
                              invoiceId={row.id}
                              isSynced={syncedInvoices.has(row.id)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Separación entre tablas */}
          <div className="mb-10"></div>

          {/* Tabla de Cuentas por Pagar */}
          <div>
            <h2 className="table-section-title">
              Cuentas por Pagar
            </h2>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-slate-500 dark:text-slate-400">Cargando facturas de Odoo...</p>
              </div>
            ) : filteredPayableInvoices.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-slate-500 dark:text-slate-400">
                  No hay facturas por pagar disponibles
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="classification-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Vencimiento</th>
                      <th>Proveedor</th>
                      <th>Importe</th>
                      <th>Departamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayableInvoices.map((row) => {
                      // Determinar si la fecha está vencida
                      const hoy = new Date();
                      hoy.setHours(0, 0, 0, 0);
                      const estaVencida = row.vencimientoDate 
                        ? new Date(row.vencimientoDate).setHours(0, 0, 0, 0) < hoy.getTime()
                        : false;
                      
                      return (
                        <tr key={row.id}>
                          <td>
                            {row.state === 'posted' ? (
                              <span className="badge-tipo-factura">Confirmado</span>
                            ) : (
                              <span className="badge-tipo-prevision">Previsión</span>
                            )}
                          </td>
                          <td>
                            {row.vencimiento ? (
                              <span className={estaVencida ? 'text-red-500 dark:text-red-400' : ''}>
                                {row.vencimiento}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">-</span>
                            )}
                          </td>
                          <td>{row.proveedor}</td>
                          <td>{formatCurrency(row.importe)}</td>
                          <td>
                            <DepartmentSelect
                              value={row.department}
                              onChange={(dept) => handleDepartmentChange(row.id, dept)}
                              invoiceId={row.id}
                              isSynced={syncedInvoices.has(row.id)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
