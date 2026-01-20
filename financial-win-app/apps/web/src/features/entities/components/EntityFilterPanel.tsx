import React, { useState, useEffect } from 'react';

export interface EntityFilterValues {
  status: string[];
  types: string[];
  balanceRange: {
    min: number | null;
    max: number | null;
  };
  paymentsRange: {
    min: number | null;
    max: number | null;
  };
}

interface EntityFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onFilterChange: (filters: EntityFilterValues) => void;
  initialFilters?: Partial<EntityFilterValues>;
  availableStatus: string[];
  availableTypes: string[];
  entityType: 'clientes' | 'proveedores';
}

export const EntityFilterPanel: React.FC<EntityFilterPanelProps> = ({
  isOpen,
  onClose,
  onFilterChange,
  initialFilters,
  availableStatus,
  availableTypes,
  entityType,
}) => {
  const [filters, setFilters] = useState<EntityFilterValues>({
    status: initialFilters?.status || [],
    types: initialFilters?.types || [],
    balanceRange: {
      min: initialFilters?.balanceRange?.min || null,
      max: initialFilters?.balanceRange?.max || null,
    },
    paymentsRange: {
      min: initialFilters?.paymentsRange?.min || null,
      max: initialFilters?.paymentsRange?.max || null,
    },
  });

  useEffect(() => {
    if (initialFilters) {
      setFilters({
        status: initialFilters.status || [],
        types: initialFilters.types || [],
        balanceRange: {
          min: initialFilters.balanceRange?.min || null,
          max: initialFilters.balanceRange?.max || null,
        },
        paymentsRange: {
          min: initialFilters.paymentsRange?.min || null,
          max: initialFilters.paymentsRange?.max || null,
        },
      });
    }
  }, [initialFilters]);

  const handleStatusToggle = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
  };

  const handleTypeToggle = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
  };

  const handleApply = () => {
    onFilterChange(filters);
    onClose();
  };

  const handleClear = () => {
    const emptyFilters: EntityFilterValues = {
      status: [],
      types: [],
      balanceRange: { min: null, max: null },
      paymentsRange: { min: null, max: null },
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
    onClose();
  };

  // Guardar estado temporal cuando se cierra sin aplicar
  const handleClose = () => {
    // Restaurar filtros iniciales si se cierra sin aplicar
    if (initialFilters) {
      setFilters({
        status: initialFilters.status || [],
        types: initialFilters.types || [],
        balanceRange: {
          min: initialFilters.balanceRange?.min || null,
          max: initialFilters.balanceRange?.max || null,
        },
        paymentsRange: {
          min: initialFilters.paymentsRange?.min || null,
          max: initialFilters.paymentsRange?.max || null,
        },
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="filter-panel-backdrop"
        onClick={handleClose}
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
            onClick={handleClose}
            className="filter-panel-close-button"
            aria-label="Cerrar filtros"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="filter-panel-content">
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
                    <span className="filter-checkbox-text">
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Tipos/Categorías */}
          {availableTypes.length > 0 && (
            <div className="filter-section">
              <div className="filter-section-header">
                <span className="material-symbols-outlined filter-section-icon">
                  label
                </span>
                <h3 className="filter-section-title">
                  {entityType === 'clientes' ? 'Tipos' : 'Categorías'}
                </h3>
              </div>
              <div className="filter-section-content">
                <div className="filter-checkbox-group">
                  {availableTypes.map((type) => (
                    <label key={type} className="filter-checkbox-label">
                      <input
                        type="checkbox"
                        checked={filters.types.includes(type)}
                        onChange={() => handleTypeToggle(type)}
                        className="filter-checkbox"
                      />
                      <span className="filter-checkbox-text">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Rango de Saldo Bancario */}
          <div className="filter-section">
            <div className="filter-section-header">
              <span className="material-symbols-outlined filter-section-icon">
                account_balance
              </span>
              <h3 className="filter-section-title">Saldo Bancario</h3>
            </div>
            <div className="filter-section-content">
              <div className="filter-amount-group">
                <label className="filter-label">
                  <span className="filter-label-text">Mínimo</span>
                  <input
                    type="number"
                    value={filters.balanceRange.min || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        balanceRange: {
                          ...prev.balanceRange,
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
                    value={filters.balanceRange.max || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        balanceRange: {
                          ...prev.balanceRange,
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

          {/* Rango de Pagos Pendientes */}
          <div className="filter-section">
            <div className="filter-section-header">
              <span className="material-symbols-outlined filter-section-icon">
                payments
              </span>
              <h3 className="filter-section-title">Pagos Pendientes</h3>
            </div>
            <div className="filter-section-content">
              <div className="filter-amount-group">
                <label className="filter-label">
                  <span className="filter-label-text">Mínimo</span>
                  <input
                    type="number"
                    value={filters.paymentsRange.min || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        paymentsRange: {
                          ...prev.paymentsRange,
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
                    value={filters.paymentsRange.max || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        paymentsRange: {
                          ...prev.paymentsRange,
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
