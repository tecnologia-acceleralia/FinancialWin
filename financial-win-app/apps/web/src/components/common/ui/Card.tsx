import React from 'react';

// Mapeo de colores de iconos para que Tailwind detecte las clases
const ICON_CIRCLE_COLORS = {
  amber: 'icon-circle-amber',
  cyan: 'icon-circle-cyan',
  purple: 'icon-circle-purple',
  blue: 'icon-circle-blue',
  emerald: 'icon-circle-emerald',
} as const;

// Mapeo de colores de iconos (para el span del icono)
const ICON_COLORS = {
  amber: 'base-card-icon-amber',
  cyan: 'base-card-icon-cyan',
  purple: 'base-card-icon-purple',
  blue: 'base-card-icon-blue',
  emerald: 'base-card-icon-emerald',
} as const;

// Mapeo de colores de badges
const BADGE_COLORS = {
  gray: 'base-card-badge-gray',
  red: 'base-card-badge-red',
  green: 'base-card-badge-green',
} as const;

export interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: string;
  iconColor?: 'amber' | 'cyan' | 'purple' | 'blue' | 'emerald';
  badge?: string;
  badgeColor?: 'gray' | 'red' | 'green';
  onClick?: ((e: React.MouseEvent<HTMLDivElement>) => void) | (() => void);
  children?: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  icon,
  iconColor = 'amber',
  badge,
  badgeColor = 'gray',
  onClick,
  children,
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      // Soporta tanto funciones con evento como sin evento
      if (onClick.length === 0) {
        (onClick as () => void)();
      } else {
        (onClick as (e: React.MouseEvent<HTMLDivElement>) => void)(e);
      }
    }
  };

  // Obtener clases usando el mapeo (Tailwind puede detectarlas)
  const iconCircleClass = iconColor ? ICON_CIRCLE_COLORS[iconColor] : '';
  const iconClass = iconColor ? ICON_COLORS[iconColor] : '';
  const badgeClass = badgeColor ? BADGE_COLORS[badgeColor] : '';

  return (
    <div
      onClick={handleClick}
      className={`base-card group ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {icon && (
        <div className={`icon-circle ${iconCircleClass}`}>
          <span className={`material-symbols-outlined base-card-icon ${iconClass}`}>
            {icon}
          </span>
        </div>
      )}

      {title && <h4 className="base-card-title">{title}</h4>}
      {subtitle && <p className="base-card-desc">{subtitle}</p>}

      {children}

      {badge && (
        <div className="base-card-footer">
          <span className={`base-card-badge ${badgeClass}`}>{badge}</span>
        </div>
      )}
    </div>
  );
};
