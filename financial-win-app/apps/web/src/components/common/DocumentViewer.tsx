import React from 'react';

export interface DocumentViewerProps {
  fileUrl: string | null;
  fileName?: string;
  mimeType?: string;
}

/**
 * Componente DocumentViewer - Visor simplificado de documentos
 * 
 * Muestra documentos (PDFs e imágenes) ocupando el 100% del espacio disponible
 * sin controles redundantes, aprovechando los controles nativos del navegador.
 */
export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  fileUrl,
  fileName,
  mimeType,
}) => {
  // Determinar tipo de documento
  const isImage = mimeType?.startsWith('image/') || false;
  const isPdf = mimeType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf');

  // Construir URL del PDF con parámetro de vista
  const getPdfUrl = (url: string): string => {
    if (isPdf && !url.includes('#')) {
      return `${url}#view=FitH`;
    }
    return url;
  };

  if (!fileUrl) {
    return (
      <div className="document-viewer-empty">
        <div className="document-viewer-empty-icon">
          <span className="material-symbols-outlined">description</span>
        </div>
        <div className="document-viewer-empty-title">
          Sin archivo cargado
        </div>
        <div className="document-viewer-empty-subtitle">
          Arrastra un archivo o selecciónalo para ver la previsualización
        </div>
      </div>
    );
  }

  return (
    <div className="document-viewer-container">
      {/* Contenedor del documento - Full Bleed */}
      <div className="document-viewer-content">
        {isImage ? (
          <img
            src={fileUrl}
            alt={fileName || 'Documento'}
            className="document-viewer-image"
          />
        ) : isPdf ? (
          <iframe
            src={getPdfUrl(fileUrl)}
            title={fileName || 'PDF'}
            className="document-viewer-pdf"
          />
        ) : (
          <div className="document-viewer-generic">
            <div className="document-viewer-generic-icon">
              <span className="material-symbols-outlined">insert_drive_file</span>
            </div>
            <div className="document-viewer-generic-title">
              {fileName || 'Documento'}
            </div>
            <div className="document-viewer-generic-subtitle">
              Tipo: {mimeType || 'Desconocido'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
