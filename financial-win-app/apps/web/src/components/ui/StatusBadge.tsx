import React from 'react';

/**
 * Tipos de estado soportados por el componente StatusBadge
 */
export type StatusType = 'activo' | 'pendiente' | 'inactivo' | 'error';

/**
 * Configuración de un estado individual
 */
interface StatusConfig {
  label: string;
  classes: string;
  icon: string;
}

/**
 * Configuración externa de estados
 * Mapea cada estado con su label, clases de Tailwind e icono de Material Symbol
 */
const STATUS_CONFIG: Record<StatusType, StatusConfig> = {
  activo: {
    label: 'Activo',
    classes: 'status-badge-activo',
    icon: 'check_circle',
  },
  pendiente: {
    label: 'Pendiente',
    classes: 'status-badge-pendiente',
    icon: 'schedule',
  },
  inactivo: {
    label: 'Inactivo',
    classes: 'status-badge-inactivo',
    icon: 'cancel',
  },
  error: {
    label: 'Error',
    classes: 'status-badge-error',
    icon: 'error',
  },
};

/**
 * Configuración por defecto para estados no reconocidos
 */
const DEFAULT_CONFIG: StatusConfig = {
  label: 'Desconocido',
  classes: 'status-badge-default',
  icon: 'help_outline',
};

/**
 * Props del componente StatusBadge
 */
export interface StatusBadgeProps {
  /**
   * Estado a mostrar. Si no existe en STATUS_CONFIG, se usa el estilo por defecto.
   */
  status: StatusType | string;
  /**
   * Clase CSS adicional opcional
   */
  className?: string;
}

/**
 * Componente reutilizable StatusBadge
 * 
 * Muestra un badge con icono y texto según el estado proporcionado.
 * Si el estado no existe en STATUS_CONFIG, muestra un estilo gris por defecto.
 * 
 * @example
 * ```tsx
 * <StatusBadge status="activo" />
 * <StatusBadge status="pendiente" />
 * <StatusBadge status="estado-desconocido" /> // Muestra estilo por defecto
 * ```
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  // Obtener configuración del estado o usar la por defecto
  const config = STATUS_CONFIG[status as StatusType] || DEFAULT_CONFIG;

  return (
    <span className={`${config.classes} ${className}`.trim()}>
      <span className="material-symbols-outlined text-sm">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};
