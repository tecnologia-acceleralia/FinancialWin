import React from 'react';

export interface FilePreviewProps {
  file?: File | null;
  fileUrl?: string | null;
  fileName?: string;
  mimeType?: string;
}

/**
 * Componente FilePreview - Vista previa de archivos
 * 
 * Muestra una vista previa del archivo cargado o un estado vacío elegante
 * cuando no hay archivo disponible.
 */
export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  fileUrl,
  fileName,
  mimeType,
}) => {
  const hasFile = file || fileUrl;
  const displayName = fileName || file?.name || 'Documento';
  const displayMimeType = mimeType || file?.type || '';

  // Estado vacío elegante
  if (!hasFile) {
    return (
      <div className="studio-preview-empty">
        <div className="studio-preview-empty-icon">
          <span className="material-symbols-outlined">description</span>
        </div>
        <div className="studio-preview-empty-title">
          Sin archivo cargado
        </div>
        <div className="studio-preview-empty-subtitle">
          Arrastra un archivo o selecciónalo para ver la previsualización
        </div>
      </div>
    );
  }

  // Vista previa de imagen
  if (displayMimeType.startsWith('image/') || fileUrl) {
    const imageUrl = fileUrl || (file ? URL.createObjectURL(file) : null);
    
    if (imageUrl) {
      return (
        <div className="studio-preview-image-container">
          <img
            src={imageUrl}
            alt={displayName}
            className="studio-preview-image"
          />
          {file && (
            <div className="preview-overlay">
              <span className="material-symbols-outlined">image</span>
              <span>{displayName}</span>
            </div>
          )}
        </div>
      );
    }
  }

  // Vista previa de PDF (placeholder por ahora)
  if (displayMimeType === 'application/pdf' || displayName.toLowerCase().endsWith('.pdf')) {
    return (
      <div className="studio-preview-pdf-container">
        <div className="studio-preview-pdf-icon">
          <span className="material-symbols-outlined">picture_as_pdf</span>
        </div>
        <div className="studio-preview-pdf-title">{displayName}</div>
        <div className="studio-preview-pdf-subtitle">
          Vista previa de PDF (próximamente)
        </div>
        {fileUrl && (
          <div className="preview-overlay">
            <span className="material-symbols-outlined">picture_as_pdf</span>
            <span>{displayName}</span>
          </div>
        )}
      </div>
    );
  }

  // Vista previa genérica
  return (
    <div className="studio-preview-generic">
      <div className="studio-preview-generic-icon">
        <span className="material-symbols-outlined">insert_drive_file</span>
      </div>
      <div className="studio-preview-generic-title">{displayName}</div>
      <div className="studio-preview-generic-subtitle">
        Tipo: {displayMimeType || 'Desconocido'}
      </div>
    </div>
  );
};
