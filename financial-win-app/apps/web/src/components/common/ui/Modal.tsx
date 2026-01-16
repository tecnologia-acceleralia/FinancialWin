import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Mapeo de tamaños del modal para que Tailwind detecte las clases
const MODAL_SIZES = {
  sm: 'modal-content-sm',
  md: 'modal-content-md',
  lg: 'modal-content-lg',
  xl: 'modal-content-xl',
} as const;

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup al desmontar
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Retornar null si el modal no está abierto
  if (!isOpen) {
    return null;
  }

  // Obtener la clase de tamaño usando el mapeo (Tailwind puede detectarla)
  const sizeClass = MODAL_SIZES[size];

  // Prevenir que el clic en el contenido cierre el modal
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  // Renderizar el modal usando Portal directamente en el body
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content ${sizeClass}`}
        onClick={handleContentClick}
      >
        {/* Header con título y botón de cierre */}
        <div className="modal-header">
          {title && <h2 className="modal-title">{title}</h2>}
          {!title && <div></div>}
          <button
            onClick={onClose}
            className="modal-close-button"
            aria-label="Cerrar modal"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body del modal */}
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
};
