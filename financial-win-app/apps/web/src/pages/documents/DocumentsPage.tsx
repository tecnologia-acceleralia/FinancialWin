import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dropzone, DocumentForm, FilePreview } from '../../components/forms';
import { DocumentViewer } from '../../components/common/DocumentViewer';
import { CategoryTabs, type Category, SubCategoryTabs } from '../../components/ui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useFinancial } from '../../contexts/FinancialContext';
import { useGeminiExtraction } from '../../hooks/useGeminiExtraction';
import { PageHeader, type PageHeaderAction } from '../../components/layout';
import type { ExtractedData, DocumentType } from '../../types';

// Estructura de datos para las categorías de documentos
const DOCUMENT_CATEGORIES: Category[] = [
  {
    id: 'factura',
    label: 'Factura',
    icon: 'description',
    subcategories: [],
  },
  {
    id: 'tickets',
    label: 'Tickets',
    icon: 'receipt',
    subcategories: ['Nacionales', 'Extranjeros'],
  },
  {
    id: 'staff',
    label: 'Staff',
    icon: 'groups',
    subcategories: ['Interno', 'Externo'],
  },
  {
    id: 'consultor-externo',
    label: 'Consultor Externo',
    icon: 'person',
    subcategories: [],
  },
];

export const DocumentsPage: React.FC = () => {
  const { t } = useLanguage();
  const { addRecord } = useFinancial();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [formData, setFormData] = useState<ExtractedData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const fileUrlRef = useRef<string | null>(null);
  
  // Estados de navegación por pestañas
  // Inicializar con 'factura' como categoría por defecto
  const [activeCategory, setActiveCategory] = useState<string>('factura');
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);

  // Determinar el tipo de documento según la categoría activa
  const documentType: DocumentType = useMemo(() => {
    if (activeCategory === 'tickets') return 'tickets';
    if (activeCategory === 'staff') return 'staff';
    if (activeCategory === 'consultor-externo') return 'staff'; // Consultor Externo se mapea a 'staff'
    if (activeCategory === 'factura') return 'invoices';
    // Por defecto, usar 'invoices'
    return 'invoices';
  }, [activeCategory]);

  const {
    isLoading,
    error,
    activeBatchId,
    batchQueue,
    processDocument,
    processFiles,
    getExtractedData,
    reset,
  } = useGeminiExtraction({ documentType });

  // Obtener la categoría activa y sus subcategorías
  const activeCategoryData = useMemo(() => {
    return DOCUMENT_CATEGORIES.find((cat) => cat.id === activeCategory);
  }, [activeCategory]);

  // Inicializar subcategoría cuando cambia la categoría principal
  useEffect(() => {
    if (activeCategoryData) {
      if (activeCategoryData.subcategories && activeCategoryData.subcategories.length > 0) {
        setActiveSubCategory(activeCategoryData.subcategories[0]);
      } else {
        setActiveSubCategory(null);
      }
    }
  }, [activeCategory, activeCategoryData]);

  // Obtener el archivo actual para la previsualización
  const currentFile = useMemo(() => {
    if (selectedFiles.length > 0 && currentFileIndex < selectedFiles.length) {
      return selectedFiles[currentFileIndex];
    }
    return null;
  }, [selectedFiles, currentFileIndex]);

  // Crear URL del objeto para previsualización y gestionar memoria
  useEffect(() => {
    if (currentFile) {
      // Limpiar URL anterior si existe
      if (fileUrlRef.current) {
        URL.revokeObjectURL(fileUrlRef.current);
        fileUrlRef.current = null;
      }
      // Crear nueva URL
      fileUrlRef.current = URL.createObjectURL(currentFile);
    }

    // Cleanup al desmontar o cambiar archivo
    return () => {
      if (fileUrlRef.current) {
        URL.revokeObjectURL(fileUrlRef.current);
        fileUrlRef.current = null;
      }
    };
  }, [currentFile]);

  // Cleanup final al desmontar el componente
  useEffect(() => {
    return () => {
      if (fileUrlRef.current) {
        URL.revokeObjectURL(fileUrlRef.current);
        fileUrlRef.current = null;
      }
    };
  }, []);

  // Hacer que isAnalyzing dependa directamente de isLoading del hook
  const isAnalyzing = isLoading;

  // Mapear resultados del hook cuando termine la extracción
  useEffect(() => {
    // Si el hook terminó de cargar y hay datos en la cola
    if (!isLoading && batchQueue.length > 0) {
      // Buscar el primer item con datos extraídos
      const readyItem = batchQueue.find((item) => item.status === 'ready' && item.data);
      
      if (readyItem && readyItem.data) {
        // Actualizar formData con los datos extraídos
        setFormData(readyItem.data);
        setExtractionError(null);
      } else {
        // Verificar si hay errores en la cola
        const errorItem = batchQueue.find((item) => item.status === 'error');
        if (errorItem && errorItem.error) {
          setExtractionError(errorItem.error);
        }
      }
    }
  }, [isLoading, batchQueue]);

  // Manejar errores del hook
  useEffect(() => {
    if (error) {
      setExtractionError(error);
    } else if (!isLoading) {
      // Limpiar error cuando termine la carga exitosamente
      const hasErrors = batchQueue.some((item) => item.status === 'error');
      if (!hasErrors) {
        setExtractionError(null);
      }
    }
  }, [error, isLoading, batchQueue]);

  // Validar si el formulario tiene los campos obligatorios rellenos
  const isFormValid = useMemo(() => {
    if (!formData) return false;

    switch (documentType) {
      case 'invoices':
        return !!(
          formData.supplier &&
          formData.total &&
          formData.invoiceNum &&
          formData.origin
        );
      case 'tickets':
        return !!(
          formData.establishment &&
          formData.amount &&
          formData.date
        );
      case 'staff':
        return !!(
          formData.employee &&
          formData.type &&
          formData.period
        );
      default:
        return false;
    }
  }, [formData, documentType]);

  // Obtener el texto dinámico para el dropzone
  const getDropzoneTitle = (): string => {
    if (activeSubCategory) {
      return `Arrastra tus ${activeSubCategory} aquí`;
    }
    if (activeCategoryData) {
      return `Arrastra tus ${activeCategoryData.label} aquí`;
    }
    return 'Arrastra tus documentos aquí';
  };

  const handleFilesSelected = async (files: File[]) => {
    setSelectedFiles(files);
    setCurrentFileIndex(0);
    setSuccessMessage(null);
    setFormData(null);
    setExtractionError(null);
    
    // Iniciar extracción real con el primer archivo usando processFiles
    // Esto actualiza correctamente el estado isLoading del hook
    if (files.length > 0) {
      try {
        // Usar processFiles con un solo archivo para que isLoading se actualice correctamente
        await processFiles([files[0]], documentType);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error desconocido al procesar el documento';
        setExtractionError(errorMessage);
        console.error('Error al procesar documento:', err);
      }
    }
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
    if (!formData || !currentFile) return;

    setIsSaving(true);
    setSuccessMessage(null);

    try {
      // Guardar en el contexto financiero
      addRecord({
        type: 'expense',
        data: formData,
        documentType,
        fileName: currentFile.name,
      });

      // Mostrar mensaje de éxito
      setSuccessMessage('Documento guardado exitosamente');
      
      // Resetear estado
      reset();
      setFormData(null);
      setSelectedFiles([]);
      setCurrentFileIndex(0);
      setExtractionError(null);

      // Limpiar URL del objeto
      if (fileUrlRef.current) {
        URL.revokeObjectURL(fileUrlRef.current);
        fileUrlRef.current = null;
      }

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
    if (selectedFiles.length > 0 || formData) {
      reset();
      setFormData(null);
      setSelectedFiles([]);
      setCurrentFileIndex(0);
      setExtractionError(null);
      
      // Limpiar URL del objeto
      if (fileUrlRef.current) {
        URL.revokeObjectURL(fileUrlRef.current);
        fileUrlRef.current = null;
      }
    }
  };

  const headerActions: PageHeaderAction[] = [
    {
      icon: 'upload_file',
      label: 'Subir Documento',
      onClick: handleSubirDocumento,
      variant: 'primary',
    },
  ];

  // Determinar si debemos mostrar la vista de extracción (Split View)
  // Se muestra cuando hay archivos seleccionados
  const showExtractionView = selectedFiles.length > 0;

  return (
    <div className="layout-page-container">
      <PageHeader
        title="Documentación"
        actions={headerActions}
      />
      <div className="studio-container">
        <div className="studio-card">
          {/* Sistema de navegación por pestañas anidadas */}
          <CategoryTabs
            categories={DOCUMENT_CATEGORIES}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          {/* Pestañas secundarias - solo se muestran si la categoría tiene subcategorías */}
          {activeCategoryData?.subcategories && activeCategoryData.subcategories.length > 0 && (
            <div className="mt-4">
              <SubCategoryTabs
                subcategories={activeCategoryData.subcategories}
                activeSubCategory={activeSubCategory || ''}
                onSubCategoryChange={setActiveSubCategory}
              />
            </div>
          )}

          {/* Mensaje de éxito */}
          {successMessage && (
            <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg animate-fade-in">
              {successMessage}
            </div>
          )}

          {/* Mensaje de error */}
          {(error || extractionError) && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg animate-fade-in">
              Error: {error || extractionError}
            </div>
          )}

          {/* Vista de Extracción (Split View) */}
          {showExtractionView ? (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
              {/* Panel izquierdo: Previsualización del archivo (7-8 columnas) */}
              <div className="lg:col-span-7 preview-container">
                {isAnalyzing ? (
                  <div className="studio-preview-empty">
                    <div className="studio-preview-empty-icon">
                      <span className="material-symbols-outlined animate-spin">sync</span>
                    </div>
                    <div className="studio-preview-empty-title">
                      Gemini está analizando tu documento...
                    </div>
                    <div className="studio-preview-empty-subtitle">
                      Por favor espera mientras procesamos la información
                    </div>
                  </div>
                ) : (
                  <DocumentViewer
                    fileUrl={fileUrlRef.current}
                    fileName={currentFile?.name}
                    mimeType={currentFile?.type}
                  />
                )}
              </div>

              {/* Panel derecho: Formulario de validación (5 columnas) */}
              <div className="lg:col-span-5 studio-form-panel">
                <div className="studio-form-panel-inner">
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B84E9D] mb-4"></div>
                      <p className="text-lg text-slate-700 dark:text-slate-300">
                        Gemini está analizando los datos...
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        Esto puede tardar unos segundos
                      </p>
                    </div>
                  ) : formData ? (
                    <DocumentForm
                      data={formData}
                      onChange={handleFieldChange}
                      type={documentType}
                      onSave={handleSave}
                      isSaving={isSaving}
                      isFormValid={isFormValid}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            /* Vista de Subida (Dropzone) */
            <div className="mt-8 animate-fade-in">
              <Dropzone
                onFilesSelected={handleFilesSelected}
                accept=".pdf,.jpg,.jpeg,.png"
                multiple={true}
                title={getDropzoneTitle()}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
