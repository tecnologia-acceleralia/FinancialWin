import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropzone, DocumentForm } from '../../components/forms';
import { DocumentViewer } from '../../components/common/DocumentViewer';
import { CategoryTabs, type Category, SubCategoryTabs } from '../../components/ui';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useGeminiExtraction } from '../../hooks/useGeminiExtraction';
import { PageHeader } from '../../components/layout';
import { odooService } from '../../services/odooService';
import type { ExtractedData, DocumentType } from '../../types';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from '@google/genai';

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
  {
    id: 'excel',
    label: 'Excel Gestión',
    icon: 'table_chart',
    subcategories: [],
  },
];

export const DocumentsPage: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [formData, setFormData] = useState<ExtractedData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileUrlRef = useRef<string | null>(null);
  
  // Estados específicos para Excel
  const [excelRows, setExcelRows] = useState<Array<Record<string, unknown>>>([]);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [excelProcessedData, setExcelProcessedData] = useState<Array<ExtractedData & { type: 'in_invoice' | 'out_invoice' }>>([]);
  
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
      } else {
        // Verificar si hay errores en la cola
        const errorItem = batchQueue.find((item) => item.status === 'error');
        if (errorItem && errorItem.error) {
          showToast(errorItem.error, 'error');
        }
      }
    }
  }, [isLoading, batchQueue, showToast]);

  // Manejar errores del hook
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error, showToast]);

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

  // Obtener tipos de archivo aceptados según la categoría
  const getAcceptedFileTypes = (): string => {
    if (activeCategory === 'excel') {
      return '.xlsx,.xls,.csv';
    }
    return '.pdf,.jpg,.jpeg,.png';
  };

  // Procesar archivo Excel y convertirlo a JSON
  const handleExcelProcess = async (file: File): Promise<Array<Record<string, unknown>>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Obtener la primera hoja
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convertir a JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          if (!jsonData || jsonData.length === 0) {
            reject(new Error('El archivo Excel está vacío o no contiene datos válidos.'));
            return;
          }
          
          resolve(jsonData as Array<Record<string, unknown>>);
        } catch (error) {
          reject(new Error(`Error al procesar el archivo Excel: ${error instanceof Error ? error.message : 'Error desconocido'}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error al leer el archivo Excel.'));
      };
      
      reader.readAsBinaryString(file);
    });
  };

  // Analizar datos del Excel con Gemini
  const analyzeExcelWithGemini = async (rows: Array<Record<string, unknown>>): Promise<Array<ExtractedData & { type: 'in_invoice' | 'out_invoice' }>> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('La variable VITE_GEMINI_API_KEY no está configurada.');
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Analiza estos datos de un Excel de tesorería. Para cada fila, identifica y clasifica:

REGLAS DE CLASIFICACIÓN (TIPO):
- **in_invoice (GASTO)**: Cuando la empresa/entidad es un PROVEEDOR que nos cobra por servicios/productos. 
  Ejemplos: proveedores de servicios (electricidad, agua, internet, telefonía), licencias de software, servicios profesionales, suministros, alquileres, seguros, etc.
  Palabras clave: "proveedor", "servicio", "factura de", "pago a", "cobro de", nombres de empresas de servicios conocidas.
  
- **out_invoice (INGRESO)**: Cuando la empresa/entidad es un CLIENTE al que nosotros le facturamos por nuestros servicios/productos.
  Ejemplos: clientes que nos pagan, facturas de venta, ingresos por servicios prestados, etc.
  Palabras clave: "cliente", "venta", "facturación", "cobro de", nombres de empresas que son nuestros clientes.

ANÁLISIS REQUERIDO:
1. **Empresa/Entidad**: Extrae el nombre de la empresa, proveedor o cliente
2. **Concepto**: Analiza cualquier campo de descripción, concepto, notas o comentarios
3. **Importe total**: Identifica el importe (puede estar en diferentes columnas: total, importe, cantidad, etc.)
4. **Fecha**: Identifica fecha de vencimiento, emisión o pago (puede estar en diferentes formatos)
5. **Tipo (CRÍTICO)**: Deduce si es GASTO (in_invoice) o INGRESO (out_invoice) analizando:
   - El nombre de la empresa/entidad (¿es un proveedor que nos cobra o un cliente al que facturamos?)
   - El concepto/descripción (¿habla de pagos a proveedores o cobros de clientes?)
   - El contexto general de la fila

Datos del Excel:
${JSON.stringify(rows, null, 2)}

Devuelve un JSON estructurado. Cada objeto del array debe tener esta estructura:
{
  "supplier": "Nombre de la empresa/entidad (proveedor o cliente)",
  "total": "Importe total como string (formato numérico, ej: '1234.56')",
  "issueDate": "Fecha en formato YYYY-MM-DD (usa la fecha de vencimiento si existe, sino la de emisión)",
  "type": "in_invoice" o "out_invoice" (DEDUCE basándote en si es un gasto/proveedor o ingreso/cliente),
  "invoiceNum": "Número de factura si existe en los datos, sino usa 'AUTO-' + índice de fila",
  "origin": "Importación Excel"
}

IMPORTANTE: 
- Analiza cuidadosamente el nombre de la empresa y el concepto para deducir el tipo correctamente
- Si el nombre sugiere un proveedor (ej: "Telefónica", "Endesa", "Amazon", "Microsoft"), es in_invoice
- Si el nombre sugiere un cliente o el concepto habla de "venta" o "facturación a", es out_invoice
- Devuelve SOLO el array JSON, sin texto adicional ni bloques de código markdown.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        config: {
          responseMimeType: 'application/json',
        }
      });

      const responseText = response.text || '';

      // Limpiar la respuesta (eliminar markdown si existe)
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsedData = JSON.parse(cleanedText) as Array<ExtractedData & { type: 'in_invoice' | 'out_invoice' }>;
      
      if (!Array.isArray(parsedData)) {
        throw new Error('La respuesta de Gemini no es un array válido.');
      }

      return parsedData;
    } catch (error) {
      console.error('Error al analizar Excel con Gemini:', error);
      throw new Error(`Error al analizar el Excel con Gemini: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  // Confirmar importación de Excel a Odoo
  const handleConfirmExcelImport = async () => {
    if (excelProcessedData.length === 0) {
      showToast('No hay datos para importar', 'error');
      return;
    }

    setIsSaving(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const data of excelProcessedData) {
        try {
          await odooService.createInvoice(
            data,
            data.type,
            {
              state: 'draft',
              comment: 'Importación Excel'
            }
          );
          successCount++;
        } catch (err) {
          console.error(`Error al crear factura para ${data.supplier}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        showToast(
          `Importadas ${successCount} previsiones correctamente`,
          'success'
        );
        
        // Redirigir a la página de Registros (Tesorería) después de un breve delay
        setTimeout(() => {
          navigate('/records');
        }, 1500);
      } else {
        showToast('No se pudo importar ninguna factura', 'error');
      }

      // Resetear estado
      setExcelRows([]);
      setExcelProcessedData([]);
      setSelectedFiles([]);
      setCurrentFileIndex(0);
      setIsProcessingExcel(false);
    } catch (err) {
      console.error('Error al importar Excel a Odoo:', err);
      showToast(
        err instanceof Error ? err.message : 'Error desconocido al importar a Odoo',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    setSelectedFiles(files);
    setCurrentFileIndex(0);
    setFormData(null);
    setExcelRows([]);
    setExcelProcessedData([]);
    setIsProcessingExcel(false);
    
    if (files.length > 0) {
      const file = files[0];
      
      // Si es categoría Excel, procesar como Excel
      if (activeCategory === 'excel') {
        setIsProcessingExcel(true);
        try {
          // Procesar Excel a JSON
          const rows = await handleExcelProcess(file);
          setExcelRows(rows);
          
          // Analizar con Gemini
          const processedData = await analyzeExcelWithGemini(rows);
          setExcelProcessedData(processedData);
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Error desconocido al procesar el Excel';
          showToast(errorMessage, 'error');
          console.error('Error al procesar Excel:', err);
        } finally {
          setIsProcessingExcel(false);
        }
      } else {
        // Procesamiento normal para PDFs/imágenes
        try {
          await processFiles([file], documentType);
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Error desconocido al procesar el documento';
          showToast(errorMessage, 'error');
          console.error('Error al procesar documento:', err);
        }
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

  const handleSave = async (target: 'in_invoice' | 'out_invoice') => {
    if (!formData || !currentFile) return;

    setIsSaving(true);

    try {
      // Normalizar datos: unificar campos equivalentes
      const normalizedData = {
        ...formData,
        total: formData.total || formData.amount || '',
        supplier: formData.supplier || 
                 (formData as Record<string, unknown>).vendor as string || 
                 (formData as Record<string, unknown>).establishmentName as string ||
                 formData.establishment ||
                 '',
        amount: formData.amount || formData.total || '',
      };

      // Validar que tenemos los datos mínimos requeridos para crear la factura
      if (!normalizedData.supplier || normalizedData.supplier.trim() === '') {
        throw new Error('El nombre del proveedor/cliente es requerido para crear la factura.');
      }

      if (!normalizedData.total || normalizedData.total.trim() === '') {
        throw new Error('El total de la factura es requerido.');
      }

      // Llamar a Odoo para crear la factura con datos normalizados
      const invoiceId = await odooService.createInvoice(normalizedData, target);

      console.log(`✅ Factura creada en Odoo con ID: ${invoiceId}`);

      // Mostrar mensaje de éxito diferenciado por tipo
      const tipoFactura = target === 'in_invoice' ? 'Proveedores' : 'Clientes';
      showToast(`Factura de ${tipoFactura} creada correctamente en Odoo`, 'success');
      
      // Resetear estado
      reset();
      setFormData(null);
      setSelectedFiles([]);
      setCurrentFileIndex(0);

      // Limpiar URL del objeto
      if (fileUrlRef.current) {
        URL.revokeObjectURL(fileUrlRef.current);
        fileUrlRef.current = null;
      }
    } catch (err) {
      console.error('Error al enviar factura a Odoo:', err);
      
      // Manejo específico para error 503 (sobrecarga de IA/Odoo)
      // Verificar si el error contiene información sobre 503 (puede venir de diferentes formas)
      const is503Error = 
        (err instanceof Error && (
          err.message.includes('503') || 
          err.message.includes('Service Unavailable') ||
          err.message.includes('temporalmente saturado')
        )) ||
        (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 503) ||
        (err && typeof err === 'object' && 'response' in err && 
          (err as { response?: { status?: number } }).response?.status === 503);
      
      if (is503Error) {
        showToast('Servidor temporalmente saturado. Reintenta en unos segundos.', 'error');
      } else {
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'Error desconocido al enviar la factura a Odoo';
        showToast(errorMessage, 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Determinar si debemos mostrar la vista de extracción (Split View)
  // Se muestra cuando hay archivos seleccionados
  const showExtractionView = selectedFiles.length > 0;
  
  // Determinar si es un Excel procesado
  const isExcelView = activeCategory === 'excel' && (excelRows.length > 0 || isProcessingExcel);

  return (
    <div className="layout-page-container">
      <PageHeader
        title="Documentación"
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

          {/* Vista de Extracción (Split View) */}
          {showExtractionView ? (
            isExcelView ? (
              /* Vista específica para Excel */
              <div className="mt-8 animate-fade-in">
                {isProcessingExcel ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B84E9D] mb-4"></div>
                    <p className="text-lg text-slate-700 dark:text-slate-300">
                      Procesando Excel y analizando con Gemini...
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      Esto puede tardar unos segundos
                    </p>
                  </div>
                ) : excelProcessedData.length > 0 ? (
                  <div className="studio-form-panel">
                    <div className="studio-form-panel-inner">
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
                          Resumen de Importación
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400">
                          Se han detectado <strong>{excelRows.length}</strong> filas en el Excel.
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 mt-2">
                          Se han procesado <strong>{excelProcessedData.length}</strong> movimientos válidos.
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-500 mt-4">
                          ¿Deseas importarlos como previsiones (borradores) a Odoo?
                        </p>
                      </div>
                      
                      <div className="mt-6">
                        <button
                          onClick={handleConfirmExcelImport}
                          disabled={isSaving}
                          className="btn btn-primary w-full"
                        >
                          {isSaving ? 'Importando...' : 'Confirmar Importación'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              /* Vista normal para PDFs/imágenes */
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
            )
          ) : (
            /* Vista de Subida (Dropzone) */
            <div className="mt-8 animate-fade-in">
              <Dropzone
                onFilesSelected={handleFilesSelected}
                accept={getAcceptedFileTypes()}
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
