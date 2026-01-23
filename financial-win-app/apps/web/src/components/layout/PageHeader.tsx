import React from 'react';

// Tipo para iconos de Lucide (opcional, puede no estar instalado)
type LucideIcon = React.ComponentType<{ size?: number; className?: string }> | any;

export interface PageHeaderAction {
  icon: string | LucideIcon | React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
}

export interface PageHeaderProps {
  title: string;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode | PageHeaderAction[];
  showBackButton?: boolean;
  onBack?: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  showSearch = false,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  actions,
  showBackButton = false,
  onBack,
}) => {
  const renderActions = () => {
    if (!actions) return null;

    // Si es un ReactNode (elemento único, fragmento, string, number, etc.), renderizarlo directamente
    if (!Array.isArray(actions)) {
      return <div className="toolbar-buttons-group">{actions}</div>;
    }

    // Si es un array, verificar si son PageHeaderAction
    if (Array.isArray(actions)) {
      // Verificar si el primer elemento tiene la estructura de PageHeaderAction
      if (actions.length > 0 && typeof actions[0] === 'object' && actions[0] !== null && 'icon' in actions[0] && 'onClick' in actions[0] && 'label' in actions[0]) {
        return (
          <div className="toolbar-buttons-group">
            {(actions as PageHeaderAction[]).map((action, index) => {
              // Renderizar el icono según su tipo
              const renderIcon = () => {
                if (typeof action.icon === 'string') {
                  // Material Symbol o string simple
                  return <span className="toolbar-button-icon">{action.icon}</span>;
                }
                if (React.isValidElement(action.icon)) {
                  // ReactNode (componente de React)
                  return <span className="toolbar-button-icon">{action.icon}</span>;
                }
                if (typeof action.icon === 'function') {
                  // LucideIcon (componente funcional)
                  const IconComponent = action.icon as LucideIcon;
                  return (
                    <span className="toolbar-button-icon">
                      <IconComponent size={20} />
                    </span>
                  );
                }
                return null;
              };

              const getButtonClassName = () => {
                if (action.variant === 'primary') return 'toolbar-button-primary';
                if (action.variant === 'danger') return 'toolbar-button-danger';
                return 'toolbar-button';
              };

              return (
                <button
                  key={index}
                  type="button"
                  onClick={action.onClick}
                  className={getButtonClassName()}
                  aria-label={action.label}
                  title={action.label}
                >
                  {renderIcon()}
                </button>
              );
            })}
          </div>
        );
      }
      // Si es un array de ReactNodes (verificado que no son PageHeaderAction)
      return <div className="toolbar-buttons-group">{actions as unknown as React.ReactNode[]}</div>;
    }

    return null;
  };

  return (
    <div className="page-header-container">
      {/* Header con botón volver y título */}
      <div className="page-header">
        <div className="page-header-left">
          {showBackButton && (
            <button
              type="button"
              onClick={onBack}
              className="btn-studio-back"
              aria-label="Volver"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <h1 className="page-header-title">{title}</h1>
        </div>
      </div>

      {/* Barra de herramientas superior */}
      {(showSearch || actions) && (
        <div className="action-toolbar">
          {/* Buscador */}
          {showSearch && (
            <div className="search-input-wrapper">
              <span className="material-symbols-outlined search-input-icon">search</span>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue || ''}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="search-input"
              />
            </div>
          )}

          {/* Grupo de botones */}
          {actions && renderActions()}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
