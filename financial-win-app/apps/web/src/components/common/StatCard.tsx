import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'yellow';
  compact?: boolean;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/20',
    icon: 'text-purple-600 dark:text-purple-400',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/20',
    icon: 'text-orange-600 dark:text-orange-400',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    icon: 'text-yellow-600 dark:text-yellow-400',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = 'blue',
  compact = false,
}) => {
  const colorClass = colorClasses[color];

  if (compact) {
    return (
      <div className="stat-card-compact">
        <div className="stat-card-compact-content">
          <span className="stat-card-compact-label">{title}</span>
          <span className="stat-card-compact-value">{value}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-kpi-card">
      <div className="kpi-content">
        <div>
          <p className="kpi-label">{title}</p>
          <h3 className="kpi-value">{value}</h3>
        </div>
        <div className={`stat-card-icon ${colorClass.bg}`}>
          <span className={`material-symbols-outlined ${colorClass.icon} stat-card-icon-size`}>
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
};
