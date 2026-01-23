import React from 'react';
import { Modal } from '../ui/Modal';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  entityName: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  entityName,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <div className="confirm-delete-content">
        <div className="confirm-delete-icon-wrapper">
          <span className="material-symbols-outlined confirm-delete-icon">warning</span>
        </div>
        <p className="confirm-delete-message">
          {message}
        </p>
        <p className="confirm-delete-entity-name">
          <strong>{entityName}</strong>
        </p>
        <div className="confirm-delete-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleConfirm}
          >
            Eliminar
          </button>
        </div>
      </div>
    </Modal>
  );
};
