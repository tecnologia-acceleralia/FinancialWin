import React, { useState, useEffect } from 'react';

export interface FilterValues {
  dateRange: {
    from: string;
    to: string;
  };
  categories: string[];
  status: string[];
  erpStatus: string[];
  documentType: string[];
  amountRange: {
    min: number | null;
    max: number | null;
  };
}

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onFilterChange: (filters: FilterValues) => void;
  initialFilters?: Partial<FilterValues>;
  type?: 'gastos' | 'ingresos' | 'registros';
}

// Categorías disponibles (basadas en DocumentsPage)
// Eliminada 'Licencias', 'Tickets' ahora tiene subcategorías
const AVAILABLE_CATEGORIES = [
  'Tickets Nacionales',
  'Tickets Extranjeros',
  'Staff Interno',
  'Staff Externo',
  'Consultor Externo',
  'Financiero',
  'Proveedor Ext.',
];

// Tipos de documento disponibles para filtros
const AVAILABLE_DOCUMENT_TYPES = ['Factura', 'Ticket', 'Staff'];

// Estados disponibles
const AVAILABLE_STATUS_GASTOS = ['Pagado', 'Registrada', 'Por Recibir'];
const AVAILABLE_STATUS_INGRESOS = ['Pagado', 'Anulada', 'Pendiente Pago'];
const AVAILABLE_STATUS_REGISTROS = ['VALIDADO', 'PENDIENTE', 'RECHAZADO'];

// Estados ERP disponibles
const AVAILABLE_ERP_STATUS = [
  'Pendiente',
  'Sincronizando',
  'Sincronizado Odoo',
  'Sincronizado A3',
  'Error',
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  onFilterChange,
  initialFilters,
  type = 'gastos',
}) => {
  const [filters, setFilters] = useState<FilterValues>({
    dateRange: {
      from: initialFilters?.dateRange?.from || '',
      to: initialFilters?.dateRange?.to || '',
    },
    categories: initialFilters?.categories || [],
    status: initialFilters?.status || [],
    erpStatus: initialFilters?.erpStatus || [],
    documentType: initialFilters?.documentType || [],
    amountRange: {
      min: initialFilters?.amountRange?.min || null,
      max: initialFilters?.amountRange?.max || null,
    },
  });

  // Determinar estados disponibles según el tipo
  const availableStatus =
    type === 'gastos'
      ? AVAILABLE_STATUS_GASTOS
      : type === 'ingresos'
        ? AVAILABLE_STATUS_INGRESOS
        : AVAILABLE_STATUS_REGISTROS;

  useEffect(() => {
    if (initialFilters) {
      setFilters({
        dateRange: {
          from: initialFilters.dateRange?.from || '',
          to: initialFilters.dateRange?.to || '',
        },
        categories: initialFilters.categories || [],
        status: initialFilters.status || [],
        erpStatus: initialFilters.erpStatus || [],
        documentType: initialFilters.documentType || [],
        amountRange: {
          min: initialFilters.amountRange?.min || null,
          max: initialFilters.amountRange?.max || null,
        },
      });
    }
  }, [initialFilters]);

  const handleCategoryToggle = (category: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleStatusToggle = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
  };

  const handleErpStatusToggle = (erpStatus: string) => {
    setFilters((prev) => ({
      ...prev,
      erpStatus: prev.erpStatus.includes(erpStatus)
        ? prev.erpStatus.filter((s) => s !== erpStatus)
        : [...prev.erpStatus, erpStatus],
    }));
  };

  const handleDocumentTypeToggle = (documentType: string) => {
    setFilters((prev) => ({
      ...prev,
      documentType: prev.documentType.includes(documentType)
        ? prev.documentType.filter((dt) => dt !== documentType)
        : [...prev.documentType, documentType],
    }));
  };

  const handleApply = () => {
    onFilterChange(filters);
    onClose();
  };

  const handleClear = () => {
    const emptyFilters: FilterValues = {
      dateRange: { from: '', to: '' },
      categories: [],
      status: [],
      erpStatus: [],
      documentType: [],
      amountRange: { min: null, max: null },
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="filter-panel-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="filter-panel">
        {/* Header */}
        <div className="filter-panel-header">
          <div className="filter-panel-header-content">
            <span className="material-symbols-outlined filter-panel-header-icon">
              filter_list
            </span>
            <h2 className="filter-panel-title">Filtros Avanzados</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="filter-panel-close-button"
            aria-label="Cerrar filtros"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="filter-panel-content">
          {/* Rango de Fechas */}
          <div className="filter-section">
            <div className="filter-section-header">
              <span className="material-symbols-outlined filter-section-icon">
                calendar_today
              </span>
              <h3 className="filter-section-title">Rango de Fechas</h3>
            </div>
            <div className="filter-section-content">
              <div className="filter-date-group">
                <label className="filter-label">
                  <span className="filter-label-text">Desde</span>
                  <input
                    type="date"
                    value={filters.dateRange.from}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, from: e.target.value },
                      }))
                    }
                    className="filter-input"
                  />
                </label>
                <label className="filter-label">
                  <span className="filter-label-text">Hasta</span>
                  <input
                    type="date"
                    value={filters.dateRange.to}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, to: e.target.value },
                      }))
                    }
                    className="filter-input"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Categorías */}
          <div className="filter-section">
            <div className="filter-section-header">
              <span className="material-symbols-outlined filter-section-icon">
                label
              </span>
              <h3 className="filter-section-title">Categorías</h3>
            </div>
            <div className="filter-section-content">
              <div className="filter-checkbox-group">
                {AVAILABLE_CATEGORIES.map((category) => (
                  <label key={category} className="filter-checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category)}
                      onChange={() => handleCategoryToggle(category)}
                      className="filter-checkbox"
                    />
                    <span className="filter-checkbox-text">{category}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Estados */}
          <div className="filter-section">
            <div className="filter-section-header">
              <span className="material-symbols-outlined filter-section-icon">
                check_circle
              </span>
              <h3 className="filter-section-title">Estados</h3>
            </div>
            <div className="filter-section-content">
              <div className="filter-checkbox-group">
                {availableStatus.map((status) => (
                  <label key={status} className="filter-checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status)}
                      onChange={() => handleStatusToggle(status)}
                      className="filter-checkbox"
                    />
                    <span className="filter-checkbox-text">{status}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Tipo de Documento - Solo para registros */}
          {type === 'registros' && (
            <div className="filter-section">
              <div className="filter-section-header">
                <span className="material-symbols-outlined filter-section-icon">
                  description
                </span>
                <h3 className="filter-section-title">Tipo de Documento</h3>
              </div>
              <div className="filter-section-content">
                <div className="filter-checkbox-group">
                  {AVAILABLE_DOCUMENT_TYPES.map((docType) => (
                    <label key={docType} className="filter-checkbox-label">
                      <input
                        type="checkbox"
                        checked={filters.documentType.includes(docType)}
                        onChange={() => handleDocumentTypeToggle(docType)}
                        className="filter-checkbox"
                      />
                      <span className="filter-checkbox-text">{docType}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Estado ERP - Solo para registros */}
          {type === 'registros' && (
            <div className="filter-section">
              <div className="filter-section-header">
                <span className="material-symbols-outlined filter-section-icon">
                  sync
                </span>
                <h3 className="filter-section-title">Estado ERP</h3>
              </div>
              <div className="filter-section-content">
                <div className="filter-checkbox-group">
                  {AVAILABLE_ERP_STATUS.map((erpStatus) => (
                    <label key={erpStatus} className="filter-checkbox-label">
                      <input
                        type="checkbox"
                        checked={filters.erpStatus.includes(erpStatus)}
                        onChange={() => handleErpStatusToggle(erpStatus)}
                        className="filter-checkbox"
                      />
                      <span className="filter-checkbox-text">{erpStatus}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Rango de Importe */}
          <div className="filter-section">
            <div className="filter-section-header">
              <span className="material-symbols-outlined filter-section-icon">
                attach_money
              </span>
              <h3 className="filter-section-title">Rango de Importe</h3>
            </div>
            <div className="filter-section-content">
              <div className="filter-amount-group">
                <label className="filter-label">
                  <span className="filter-label-text">Mínimo</span>
                  <input
                    type="number"
                    value={filters.amountRange.min || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        amountRange: {
                          ...prev.amountRange,
                          min: e.target.value ? parseFloat(e.target.value) : null,
                        },
                      }))
                    }
                    placeholder="0.00"
                    className="filter-input"
                    min="0"
                    step="0.01"
                  />
                </label>
                <label className="filter-label">
                  <span className="filter-label-text">Máximo</span>
                  <input
                    type="number"
                    value={filters.amountRange.max || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        amountRange: {
                          ...prev.amountRange,
                          max: e.target.value ? parseFloat(e.target.value) : null,
                        },
                      }))
                    }
                    placeholder="Sin límite"
                    className="filter-input"
                    min="0"
                    step="0.01"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="filter-panel-footer">
          <button
            type="button"
            onClick={handleClear}
            className="btn-ai-secondary"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="btn-ai-primary"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>
    </>
  );
};
