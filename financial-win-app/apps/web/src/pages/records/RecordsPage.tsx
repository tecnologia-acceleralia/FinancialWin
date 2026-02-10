import React, { useState, useMemo } from 'react';
import { PageHeader } from '../../components/layout';
import { useFinancialStats } from '../../hooks/useFinancialStats';
import { ExpensesStackedBarChart } from '../../components/common/ExpensesStackedBarChart';
import type { FinancialRecord } from '../../contexts/FinancialContext';
import type { ExtractedData } from '../../types';

type Department = 'Marketing' | 'Operaciones' | 'Ventas' | 'IT' | 'General';

interface InvoiceRow {
  id: string;
  fecha: string;
  proveedor: string;
  numeroFactura: string;
  importe: number;
  department: Department | undefined;
  record: FinancialRecord;
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
          <span className="material-symbols-outlined stat-icon-blue">
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

export const RecordsPage: React.FC = () => {
  const { validExpensesForChart, isLoading, formatCurrency } = useFinancialStats();
  
  // Estado local para las clasificaciones de departamento
  // En el futuro, esto se sincronizará con Odoo
  const [departmentAssignments, setDepartmentAssignments] = useState<Record<string, Department>>({});
  const [syncedInvoices, setSyncedInvoices] = useState<Set<string>>(new Set());

  // Transformar facturas a formato de tabla
  const invoiceRows = useMemo((): InvoiceRow[] => {
    return validExpensesForChart.map((record) => {
      const invoiceDate = record.data.issueDate || record.createdAt;
      const fecha = invoiceDate ? new Date(invoiceDate).toLocaleDateString('es-ES') : 'N/A';
      const proveedor = record.data.supplier || 'Sin proveedor';
      const numeroFactura = record.data.invoiceNum || 'N/A';
      const importe = Number(record.data.total?.toString() || '0');
      
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
        proveedor,
        numeroFactura,
        importe,
        department: assignedDepartment,
        record,
      };
    });
  }, [validExpensesForChart, departmentAssignments]);

  // Calcular estadísticas
  const totalFacturas = validExpensesForChart.length;
  const sinClasificar = useMemo(() => {
    return invoiceRows.filter((row) => !row.department).length;
  }, [invoiceRows]);

  // Datos para el gráfico de barras apiladas (actualizados en tiempo real con las clasificaciones)
  // El componente ExpensesStackedBarChart procesa los datos internamente agrupando por mes y departamento
  const chartData = useMemo(() => {
    return invoiceRows.map((row) => ({
      ...row.record,
      data: {
        ...row.record.data,
        // Pasar el departamento asignado (o undefined para 'Sin Clasificar')
        // El componente ExpensesStackedBarChart manejará 'Sin Clasificar' automáticamente
        department: row.department as ExtractedData['department'] | undefined,
      },
    }));
  }, [invoiceRows]);

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
        title="Consola de Clasificación de Odoo"
        showBackButton={false}
      />
      
      <div className="studio-container">
        <div className="studio-card">
          {/* Grid de Resumen con Gráfico */}
          <div className="classification-summary-grid">
            {/* Tarjetas KPI */}
            <div className="classification-kpi-grid">
              <KPICard
                label="Total Facturas Odoo"
                value={isLoading ? '...' : totalFacturas}
                icon="receipt_long"
                iconContainerClass="stat-icon-container-blue"
              />
              <KPICard
                label="Sin Clasificar"
                value={isLoading ? '...' : sinClasificar}
                icon="pending_actions"
                iconContainerClass="stat-icon-container-orange"
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

          {/* Tabla de Clasificación */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
              Tabla de Clasificación
            </h2>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-slate-500 dark:text-slate-400">Cargando facturas de Odoo...</p>
              </div>
            ) : invoiceRows.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-slate-500 dark:text-slate-400">
                  No hay facturas disponibles para clasificar
          </p>
        </div>
            ) : (
              <div className="table-wrapper">
                <table className="classification-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Proveedor</th>
                      <th>Nº Factura</th>
                      <th>Importe</th>
                      <th>Departamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.fecha}</td>
                        <td>{row.proveedor}</td>
                        <td>{row.numeroFactura}</td>
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
                    ))}
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
