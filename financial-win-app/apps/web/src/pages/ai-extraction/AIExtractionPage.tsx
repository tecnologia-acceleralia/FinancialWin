import React, { useState, useEffect, useRef } from 'react';
import { Dropzone } from '../../components/common/Dropzone';
import { DocumentForm } from '../../components/common/DocumentForm';
import { FilePreview } from '../../components/common/FilePreview';
import { useGeminiExtraction } from '../../hooks/useGeminiExtraction';
import type { DocumentType, ExtractedData } from './types';

type OriginType = 'national' | 'foreign';

interface ToggleOption {
  value: OriginType;
  label: string;
  icon: string;
}

export const AIExtractionPage: React.FC = () => {
  const [type] = useState<DocumentType>('invoices');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [uploadType, setUploadType] = useState<OriginType>('national');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializar hook de extracción con Gemini
  const {
    processFiles,
    isLoading,
    error,
    batchQueue,
    activeBatchId,
    setActiveBatchId,
    getExtractedData,
    markAsCompleted,
  } = useGeminiExtraction({ documentType: type });

  // Estado de datos extraídos (se sincroniza con activeBatchId)
  const [data, setData] = useState<ExtractedData>({
    origin: 'national',
  });

  // Opciones del toggle según el tipo de documento
  const toggleOptions: ToggleOption[] =
    type === 'invoices'
      ? [
          { value: 'national', label: 'Nacionales', icon: 'flag' },
          { value: 'foreign', label: 'Extranjeros', icon: 'public' },
        ]
      : [];

  // Sincronizar datos extraídos del hook con el estado local cuando cambia activeBatchId
  useEffect(() => {
    if (activeBatchId && batchQueue.length > 0) {
      const item = batchQueue.find((i) => i.id === activeBatchId);
      if (item?.data) {
        setData({ ...item.data });
      }
      if (item?.file) {
        setCurrentFile(item.file);
      }
    }
  }, [activeBatchId, batchQueue]);

  // Actualizar preview URL cuando cambia el archivo activo
  useEffect(() => {
    if (!currentFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(currentFile);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [currentFile]);

  // Detectar cuando el procesamiento termina para avanzar al Step 3
  useEffect(() => {
    if (!isLoading && batchQueue.length > 0) {
      const allProcessed = batchQueue.every(
        (item) => item.status === 'ready' || item.status === 'completed' || item.status === 'error'
      );
      if (allProcessed && step === 2) {
        // Seleccionar primer item listo como activo
        const firstReady = batchQueue.find((item) => item.status === 'ready');
        if (firstReady) {
          setActiveBatchId(firstReady.id);
          setStep(3);
        }
      }
    }
  }, [isLoading, batchQueue, step, setActiveBatchId]);

  // Handlers de drag and drop
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
      handleFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(Array.from(e.target.files));
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;

    try {
      setStep(2);
      await processFiles(files, type);
    } catch (err) {
      console.error('Error al procesar archivos:', err);
    }
  };

  const handleBackStep = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleCancelBatch = () => {
    setStep(1);
    setCurrentFile(null);
    setPreviewUrl(null);
    setData({ origin: uploadType });
  };

  const handleChange = (field: string, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleValidate = () => {
    if (activeBatchId) {
      markAsCompleted(activeBatchId);
      // Buscar siguiente item listo
      const nextReady = batchQueue.find(
        (item) => item.id !== activeBatchId && item.status === 'ready'
      );
      if (nextReady) {
        setActiveBatchId(nextReady.id);
      } else {
        // Todos validados, volver al step 1
        handleCancelBatch();
      }
    }
  };

  // Helper para obtener nombre de archivo generado
  const getGeneratedFileName = (data: ExtractedData, fallback: string): string => {
    if (data.supplier && data.invoiceNum) {
      return `${data.supplier} - ${data.invoiceNum}`;
    }
    return fallback;
  };

  // Helper para obtener icono según tipo de archivo
  const getFileTypeIcon = (type: string = ''): string => {
    if (type === 'application/pdf') return 'picture_as_pdf';
    if (type.startsWith('image/')) return 'image';
    return 'description';
  };

  // Título dinámico del dropzone
  const dropzoneTitle =
    type === 'invoices' && toggleOptions.length > 0
      ? `Arrastra tus facturas ${uploadType === 'national' ? 'nacionales' : 'extranjeras'} aquí`
      : 'Arrastra tus archivos aquí';

  return (
    <div className="layout-page-container">
      <div className="studio-container">
        {/* STEP 1: UPLOAD */}
        {step === 1 && (
          <div className="w-full h-full animate-in fade-in zoom-in-95 duration-300 flex flex-col">
            <div className="bg-white dark:bg-[#131B29] rounded-3xl shadow-sm border border-[#e5e5e5] dark:border-[#2A3B5A] p-8 flex flex-col h-full">
              {/* Toggle Type - Centered at Top (Only if options exist) */}
              {toggleOptions.length > 0 && (
                <div className="flex justify-center mb-6 shrink-0">
                  <div className="toggle-group-container">
                    {toggleOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setUploadType(option.value)}
                        className={
                          uploadType === option.value
                            ? 'btn-studio-toggle-active'
                            : 'btn-studio-toggle-inactive'
                        }
                      >
                        <span className="material-symbols-outlined text-lg">{option.icon}</span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Drag Area */}
              <div
                className={`flex-1 border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center ${
                  isDragActive
                    ? 'border-[#B84E9D] bg-[#FCECF6]/30 dark:bg-[#B84E9D]/5 scale-[0.99]'
                    : 'border-[#e5e5e5] dark:border-[#2A3B5A] hover:border-[#B84E9D] dark:hover:border-[#B84E9D] hover:bg-[#fafafa] dark:hover:bg-[#1B273B]/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-24 h-24 rounded-full bg-[#FCECF6] dark:bg-[#B84E9D]/10 flex items-center justify-center mb-8 text-[#B84E9D]">
                  <span className="material-symbols-outlined text-5xl">cloud_upload</span>
                </div>
                <h3 className="text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-4">
                  {dropzoneTitle}
                </h3>
                <p className="text-[#737373] dark:text-[#a3a3a3] text-lg max-w-lg mx-auto mb-10 leading-relaxed text-center">
                  Arrastra tus documentos o haz clic para seleccionarlos. Formatos soportados: PDF,
                  JPG, PNG
                </p>

                <button className="btn-ai-primary">
                  <span className="material-symbols-outlined">folder_open</span>
                  Seleccionar archivos
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                />

                <p className="mt-8 text-sm text-[#a3a3a3] uppercase tracking-wide font-bold">
                  PDF, JPG, JPEG, PNG
                </p>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    ❌ Error: {error}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: PROCESSING (BATCH) */}
        {step === 2 && (
          <div className="w-full h-full flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-[#131B29] rounded-3xl shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] p-16 text-center max-w-2xl w-full mx-auto">
              <div className="relative w-32 h-32 mx-auto mb-10">
                <div className="absolute inset-0 rounded-full border-4 border-[#FCECF6] dark:border-[#B84E9D]/10"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-[#B84E9D] animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-5xl text-[#B84E9D] animate-pulse">
                    smart_toy
                  </span>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-4">
                Analizando Documento
              </h3>
              <p className="text-lg text-[#737373] dark:text-[#a3a3a3]">
                {batchQueue.filter((i) => i.status === 'ready' || i.status === 'completed').length}{' '}
                de {batchQueue.length} documentos procesados
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-6 overflow-hidden">
                <div
                  className="bg-[#B84E9D] h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (batchQueue.filter((i) => i.status === 'ready' || i.status === 'completed')
                        .length /
                        batchQueue.length) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: VALIDATION (SPLIT VIEW WITH QUEUE SIDEBAR) */}
        {step === 3 && (
          <div className="w-full h-full flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-300 rounded-3xl border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-xl bg-white dark:bg-[#131B29]">
            {/* Batch Queue Sidebar */}
            <div className="w-full md:w-64 bg-[#fafafa] dark:bg-[#0B1018] border-b md:border-b-0 md:border-r border-[#e5e5e5] dark:border-[#2A3B5A] flex flex-col shrink-0">
              <div className="p-4 border-b border-[#e5e5e5] dark:border-[#2A3B5A]">
                <h4 className="text-xs font-bold text-[#737373] dark:text-[#a3a3a3] uppercase tracking-wider mb-1">
                  Cola de Archivos
                </h4>
                <p className="text-xs text-[#525252] dark:text-[#d4d4d4] font-medium">
                  {batchQueue.filter((i) => i.status === 'completed').length} / {batchQueue.length}{' '}
                  validados
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {batchQueue.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveBatchId(item.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all relative overflow-hidden group ${
                      activeBatchId === item.id
                        ? 'bg-white dark:bg-[#1B273B] shadow-sm border border-[#e5e5e5] dark:border-[#2A3B5A]'
                        : 'hover:bg-white/50 dark:hover:bg-[#1B273B]/50 border border-transparent'
                    }`}
                  >
                    {/* Status Indicator */}
                    <div className="shrink-0">
                      {item.status === 'completed' && (
                        <span className="material-symbols-outlined text-green-500 text-lg">
                          check_circle
                        </span>
                      )}
                      {item.status === 'processing' && (
                        <span className="material-symbols-outlined text-[#B84E9D] text-lg animate-spin">
                          sync
                        </span>
                      )}
                      {item.status === 'ready' && (
                        <span className="w-4 h-4 rounded-full border-2 border-[#a3a3a3] block"></span>
                      )}
                      {item.status === 'error' && (
                        <span className="material-symbols-outlined text-red-500 text-lg">error</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-bold truncate ${
                          activeBatchId === item.id
                            ? 'text-[#171717] dark:text-white'
                            : 'text-[#737373] dark:text-[#a3a3a3]'
                        }`}
                      >
                        {item.file.name}
                      </p>
                      <p className="text-[10px] text-[#a3a3a3] truncate">
                        {(item.file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>

                    {/* Active Indicator Bar */}
                    {activeBatchId === item.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#B84E9D]"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Left Pane: Document Preview */}
            <div className="w-full md:w-1/3 lg:w-5/12 bg-[#525252] dark:bg-[#0B1018] flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-[#e5e5e5] dark:border-[#2A3B5A] overflow-hidden">
              {previewUrl ? (
                currentFile?.type === 'application/pdf' ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-none"
                    title="Document Preview"
                  />
                ) : currentFile?.type.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain p-4"
                  />
                ) : (
                  <div className="text-center text-white/50 w-full max-w-md p-8">
                    <span className="material-symbols-outlined text-9xl mb-4 opacity-80">
                      {getFileTypeIcon(currentFile?.type)}
                    </span>
                    <p className="text-xl font-bold text-white mb-2 break-all">
                      {getGeneratedFileName(data, currentFile?.name || '')}
                    </p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium backdrop-blur-sm">
                      Vista previa no disponible
                    </span>
                  </div>
                )
              ) : (
                <div className="text-center text-white/50 w-full max-w-md p-8">
                  <span className="material-symbols-outlined text-9xl mb-4 opacity-80">
                    description
                  </span>
                  <p className="text-xl font-bold text-white mb-2">Seleccione un documento</p>
                </div>
              )}

              {/* Floating Overlay Info */}
              {currentFile && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white shadow-lg flex items-center gap-3 z-10 pointer-events-none">
                  <span className="material-symbols-outlined text-lg opacity-80">
                    {getFileTypeIcon(currentFile.type)}
                  </span>
                  <div className="text-xs">
                    <p className="font-bold max-w-[200px] truncate">
                      {getGeneratedFileName(data, currentFile.name)}
                    </p>
                    <p className="opacity-70">
                      {currentFile.type.split('/')[1]?.toUpperCase() || 'FILE'} •{' '}
                      {(currentFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Pane: AI Form */}
            <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#131B29] min-w-0">
              {/* Header */}
              <div className="px-8 py-6 border-b border-[#e5e5e5] dark:border-[#2A3B5A] bg-[#fafafa] dark:bg-[#131B29] shrink-0 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-[#171717] dark:text-[#fafafa]">
                    Revisión y Validación
                  </h3>
                  <p className="text-xs text-[#737373] dark:text-[#a3a3a3] mt-1">
                    Revisa los datos extraídos automáticamente.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {data?.origin && (
                    <span
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border ${
                        data.origin === 'national'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                          : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {data.origin === 'national' ? 'flag' : 'public'}
                      </span>
                      {data.origin === 'national' ? 'Nacional' : 'Extranjera'}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#B84E9D] to-purple-600 text-white text-xs font-bold shadow-sm">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    Extraído por IA
                  </span>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                <DocumentForm type={type} data={data} onChange={handleChange} />
              </div>

              {/* Footer Actions */}
              <div className="px-8 py-5 border-t border-[#e5e5e5] dark:border-[#2A3B5A] bg-[#fafafa] dark:bg-[#0B1018] flex gap-3 justify-end shrink-0">
                <button onClick={handleCancelBatch} className="btn-ai-secondary">
                  Cancelar Lote
                </button>
                <button onClick={handleValidate} className="btn-validate-primary">
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  Validar y Archivar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
