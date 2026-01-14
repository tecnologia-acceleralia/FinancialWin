import React from 'react';
import { DocumentForm } from '../../components/common/DocumentForm';
import { FilePreview } from '../../components/common/FilePreview';
import type { DocumentType, ExtractedData } from './types';

export interface AIExtractionFormProps {
  type: DocumentType;
  data: ExtractedData;
  onChange: (field: string, value: string) => void;
  previewTitle?: string;
  file?: File | null;
  fileUrl?: string | null;
  onValidate?: () => void;
  onBack?: () => void;
}

export const AIExtractionForm: React.FC<AIExtractionFormProps> = ({
  type,
  data,
  onChange,
  previewTitle = 'Vista previa',
  file,
  fileUrl,
  onValidate,
  onBack,
}) => {
  return (
    <div className="studio-split-view">
      <aside className="preview-container" aria-label="Vista previa del documento">
        {previewTitle && (
          <div className="preview-overlay">
            <span className="material-symbols-outlined">visibility</span>
            <span>{previewTitle}</span>
          </div>
        )}

        <FilePreview file={file} fileUrl={fileUrl} fileName={file?.name} mimeType={file?.type} />
      </aside>

      <section className="studio-form-panel" aria-label="Formulario de extracción">
        <div className="studio-form-panel-inner">
          <DocumentForm type={type} data={data} onChange={onChange} />

          <div className="studio-actions">
            {onBack ? (
              <button type="button" className="btn-ai-secondary" onClick={onBack}>
                Volver
              </button>
            ) : null}

            <div className="studio-actions-spacer" />

            {onValidate ? (
              <button type="button" className="btn-ai-primary" onClick={onValidate}>
                <span className="material-symbols-outlined">check_circle</span>
                Validar
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};

