import React from 'react';
import { Modal } from '../ui/Modal';
import { DocumentViewer } from './DocumentViewer';

export interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null | undefined;
  fileName?: string;
  mimeType?: string;
}

/**
 * Componente DocumentModal - Modal flotante para visualizar documentos
 * 
 * Muestra documentos (PDFs e imágenes) en un modal flotante usando DocumentViewer
 */
export const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  mimeType,
}) => {
  if (!fileUrl) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={fileName || 'Visualizar Documento'}
      size="xl"
    >
      <div className="document-modal-content">
        <DocumentViewer
          fileUrl={fileUrl}
          fileName={fileName}
          mimeType={mimeType}
        />
      </div>
    </Modal>
  );
};
