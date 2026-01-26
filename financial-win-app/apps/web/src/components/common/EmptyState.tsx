import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
        {icon}
      </span>
      <p className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
        {title}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-500">
        {description}
      </p>
    </div>
  );
};
