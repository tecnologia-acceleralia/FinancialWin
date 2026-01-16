import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Toast, ToastType } from '../components/common/ui/Toast';

export interface ToastNotification {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
  toasts: ToastNotification[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const AUTO_DISMISS_DELAY = 5000; // 5 segundos

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [closingIds, setClosingIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismissToast = useCallback((id: string) => {
    // Limpiar timer si existe
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    // Marcar como cerrando para animación
    setClosingIds((prev) => new Set(prev).add(id));

    // Remover después de la animación
    const removeTimer = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      setClosingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300); // Tiempo de la animación fadeOut

    timersRef.current.set(`remove-${id}`, removeTimer);
  }, []);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastNotification = { id, message, type };

    console.log('[Toast Context]: Nueva notificación', { id, message, type });

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss después de 5 segundos
    const autoDismissTimer = setTimeout(() => {
      dismissToast(id);
    }, AUTO_DISMISS_DELAY);

    timersRef.current.set(id, autoDismissTimer);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast, toasts }}>
      {children}
      <ToastContainer toasts={toasts} closingIds={closingIds} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: ToastNotification[];
  closingIds: Set<string>;
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  closingIds,
  onDismiss,
}) => {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="ui-toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          isClosing={closingIds.has(toast.id)}
          onClose={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
