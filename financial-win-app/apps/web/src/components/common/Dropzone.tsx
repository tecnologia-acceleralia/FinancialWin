import React, { useState, useRef } from 'react';

interface DropzoneProps {
  onFilesSelected?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  title?: string;
  description?: string;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFilesSelected,
  accept = '.pdf,.jpg,.jpeg,.png',
  multiple = true,
  title = 'Arrastra tus archivos aquí',
  description = 'O haz clic para seleccionar archivos desde tu dispositivo',
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onFilesSelected?.(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesSelected?.(files);
    }
  };

  return (
    <div
      className={isDragActive ? 'dropzone-active' : 'dropzone-default'}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="dropzone-icon-wrapper">
        <span className="dropzone-icon">cloud_upload</span>
      </div>
      <h3 className="dropzone-title">
        {title}
      </h3>
      <p className="dropzone-description">
        {description}
      </p>
      
      <button
        type="button"
        className="btn-ai-primary"
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
      >
        <span className="material-symbols-outlined">folder_open</span>
        Seleccionar archivos
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept={accept}
        multiple={multiple}
      />
      
      <p className="dropzone-file-types">
        PDF, JPG, JPEG, PNG
      </p>
    </div>
  );
};
