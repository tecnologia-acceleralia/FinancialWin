import React, { useState, useEffect } from 'react';
import { Dropzone } from '../../components/common/Dropzone';
import { DocumentForm } from '../../components/common/DocumentForm';
import { useLanguage } from '../../contexts/LanguageContext';
import { useGeminiExtraction } from '../../hooks/useGeminiExtraction';
import { PageHeader, type PageHeaderAction } from '../../components/common/PageHeader';
import type { ExtractedData } from '../ai-extraction/types';

export const DocumentsPage: React.FC = () => {
  const { t } = useLanguage();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState<ExtractedData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    isLoading,
    error,
    activeBatchId,
    batchQueue,
    processFiles,
    getExtractedData,
    reset,
  } = useGeminiExtraction({ documentType: 'invoices' });

  // Cargar datos extraídos cuando hay un activeBatchId y el procesamiento ha terminado
  useEffect(() => {
    if (activeBatchId && !isLoading) {
      const extractedData = getExtractedData(activeBatchId);
      if (extractedData) {
        setFormData(extractedData);
      }
    }
  }, [activeBatchId, isLoading, batchQueue, getExtractedData]);

  const handleFilesSelected = async (files: File[]) => {
    setSelectedFiles(files);
    setSuccessMessage(null);
    setFormData(null);
    // Procesar archivos con el hook
    await processFiles(files, 'invoices');
  };

  const handleFieldChange = (field: string, value: string) => {
    if (formData) {
      setFormData({
        ...formData,
        [field]: value,
      });
    }
  };

  const handleSave = async () => {
    if (!formData) return;

    setIsSaving(true);
    setSuccessMessage(null);

    try {
      const response = await fetch('http://localhost:4009/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Error al guardar: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Mostrar mensaje de éxito
      setSuccessMessage('Documento guardado exitosamente');
      
      // Resetear estado del hook y formulario
      reset();
      setFormData(null);
      setSelectedFiles([]);

      // Limpiar mensaje de éxito después de 5 segundos
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error('Error al guardar documento:', err);
      setSuccessMessage(
        err instanceof Error ? err.message : 'Error desconocido al guardar'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubirDocumento = () => {
    // Si hay archivos seleccionados o datos extraídos, resetear
    if (selectedFiles.length > 0 || formData) {
      reset();
      setFormData(null);
      setSelectedFiles([]);
    }
    // El dropzone se mostrará automáticamente cuando no haya datos
  };

  const headerActions: PageHeaderAction[] = [
    {
      icon: 'upload_file',
      label: 'Subir Documento',
      onClick: handleSubirDocumento,
      variant: 'primary',
    },
  ];

  return (
    <div className="layout-page-container">
      <PageHeader
        title="Documentación"
        actions={headerActions}
      />
      <div className="studio-container">
        <div className="studio-card">

          {/* Mensaje de éxito */}
          {successMessage && (
            <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              {successMessage}
            </div>
          )}

          {/* Mensaje de error */}
          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              Error: {error}
            </div>
          )}

          {/* Estado de carga */}
          {isLoading && (
            <div className="mt-8 flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-lg text-slate-700 dark:text-slate-300">
                Analizando documentos con IA...
              </p>
            </div>
          )}

          {/* Dropzone - solo mostrar si no está cargando y no hay datos extraídos */}
          {!isLoading && !formData && (
            <div className="mt-8">
              <Dropzone
                onFilesSelected={handleFilesSelected}
                accept=".pdf,.jpg,.jpeg,.png"
                multiple={true}
              />
            </div>
          )}

          {/* Lista de archivos seleccionados - solo si no hay datos extraídos */}
          {!isLoading && !formData && selectedFiles.length > 0 && (
            <div className="file-list-container mt-6">
              <h3 className="file-list-title">
                Archivos seleccionados ({selectedFiles.length})
              </h3>
              <div className="file-list">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="file-list-item">
                    <div className="file-list-item-content">
                      <div className="file-list-item-info">
                        <span className="file-list-item-icon">description</span>
                        <span className="file-list-item-name">{file.name}</span>
                      </div>
                      <span className="file-list-item-size">
                        {(file.size / 1024).toFixed(2)} KB
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulario con datos extraídos */}
          {!isLoading && formData && activeBatchId && (
            <div className="mt-8">
              <DocumentForm
                data={formData}
                onChange={handleFieldChange}
                type="invoices"
                onSave={handleSave}
                isSaving={isSaving}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
