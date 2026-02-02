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
    bg: 'bg-white border border-slate-100 dark:bg-blue-500/15',
    icon: 'text-blue-600 dark:text-blue-300',
  },
  green: {
    bg: 'bg-white border border-slate-100 dark:bg-green-500/15',
    icon: 'text-green-600 dark:text-green-300',
  },
  purple: {
    bg: 'bg-white border border-slate-100 dark:bg-purple-500/15',
    icon: 'text-purple-600 dark:text-purple-400',
  },
  red: {
    bg: 'bg-white border border-slate-100 dark:bg-red-500/15',
    icon: 'text-red-600 dark:text-red-300',
  },
  orange: {
    bg: 'bg-white border border-slate-100 dark:bg-orange-500/15',
    icon: 'text-orange-600 dark:text-orange-300',
  },
  yellow: {
    bg: 'bg-white border border-slate-100 dark:bg-yellow-500/15',
    icon: 'text-yellow-600 dark:text-yellow-300',
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
