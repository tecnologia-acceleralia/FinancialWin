import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import type { A3InvoicePayload } from '../../services/a3Service';

interface A3InspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  payload: A3InvoicePayload;
}

export const A3InspectionModal: React.FC<A3InspectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  payload,
}) => {
  const { showToast } = useToast();
  const [isCopying, setIsCopying] = useState(false);

  const handleCopyJSON = async () => {
    try {
      setIsCopying(true);
      const jsonString = JSON.stringify(payload, null, 2);
      await navigator.clipboard.writeText(jsonString);
      showToast('JSON copiado al portapapeles', 'success');
    } catch (error) {
      console.error('Error al copiar JSON:', error);
      showToast('Error al copiar el JSON', 'error');
    } finally {
      setIsCopying(false);
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Preparando envío a API A3factura"
      size="lg"
    >
      <div className="a3-inspection-modal-content">
        <p className="a3-inspection-description">
          Revisa la estructura de datos que se enviará a la API de A3factura:
        </p>

        <div className="a3-inspection-json-wrapper">
          <div className="a3-inspection-json-header">
            <span className="a3-inspection-json-title">Payload JSON</span>
            <button
              type="button"
              className="btn-copy-json"
              onClick={handleCopyJSON}
              disabled={isCopying}
              title="Copiar JSON al portapapeles"
            >
              {isCopying ? (
                <>
                  <span className="material-symbols-outlined btn-copy-icon animate-spin">sync</span>
                  <span>Copiando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined btn-copy-icon">content_copy</span>
                  <span>Copiar JSON</span>
                </>
              )}
            </button>
          </div>
          <pre className="a3-inspection-json-code">
            <code>{JSON.stringify(payload, null, 2)}</code>
          </pre>
        </div>

        <div className="a3-inspection-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
          >
            Confirmar Envío
          </button>
        </div>
      </div>
    </Modal>
  );
};
