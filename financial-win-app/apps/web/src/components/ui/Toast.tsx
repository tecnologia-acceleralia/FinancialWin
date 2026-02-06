import React from 'react';

export type ToastType = 'success' | 'error' | 'warning';

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: () => void;
  isClosing?: boolean;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  onClose,
  isClosing = false,
}) => {
  const toastTypeClass = `ui-toast-${type}`;
  const closingClass = isClosing ? 'animate-fade-out' : '';

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <div className={`ui-toast ${toastTypeClass} ${closingClass}`}>
      <span className="material-symbols-outlined text-xl flex-shrink-0">
        {getIcon()}
      </span>
      <p className={`flex-1 text-sm ${type === 'success' ? 'font-semibold text-slate-900' : 'font-medium'}`}>
        {message}
      </p>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Cerrar notificación"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
};
