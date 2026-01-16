import { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { DocumentType, ExtractedData } from '../pages/ai-extraction/types';

/**
 * Interfaz para un item en la cola de procesamiento por lotes
 */
export interface BatchItem {
  id: string;
  file: File;
  status: 'queued' | 'processing' | 'ready' | 'completed' | 'error';
  data: ExtractedData | null;
  error?: string;
}

/**
 * Opciones de configuración para el hook
 */
export interface UseGeminiExtractionOptions {
  documentType: DocumentType;
}

/**
 * Retorno del hook con estados y funciones
 */
export interface UseGeminiExtractionReturn {
  // Estados
  isLoading: boolean;
  error: string | null;
  batchQueue: BatchItem[];
  activeBatchId: string | null;

  // Acciones principales
  processDocument: (file: File, docType: DocumentType) => Promise<ExtractedData | null>;
  processFiles: (files: File[], docType: DocumentType) => Promise<void>;

  // Gestión de cola
  setActiveBatchId: (id: string | null) => void;
  updateExtractedData: (id: string, data: ExtractedData) => void;
  markAsCompleted: (id: string) => void;
  reset: () => void;

  // Helpers
  getExtractedData: (id: string) => ExtractedData | null;
}

/**
 * Constantes de configuración
 */
const GEMINI_MODEL = 'gemini-1.5-flash-latest';
const SYSTEM_INSTRUCTION = 'You are an expert data extraction assistant for financial documents.';

// Log global al cargar el módulo para verificar si la API Key está disponible
if (typeof window !== 'undefined') {
  console.log('--- TEST API KEY EN CARGA ---', !!import.meta.env.VITE_GEMINI_API_KEY);
}

/**
 * Validación y obtención de API Key desde variables de entorno
 * @throws {Error} Si la API key no está configurada
 */
const getApiKey = (): string => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    const errorMessage =
      'Error: La variable VITE_GEMINI_API_KEY no está configurada. Por favor, configura la variable de entorno en el archivo .env.';

    if (import.meta.env.DEV) {
      console.error('🔴 [useGeminiExtraction]', errorMessage);
      console.error(
        'Variables VITE_ disponibles:',
        Object.keys(import.meta.env).filter((k) => k.startsWith('VITE_'))
      );
    }

    throw new Error(errorMessage);
  }

  return apiKey.trim();
};

/**
 * Convierte un archivo a Base64 y retorna la data y el MIME type
 */
const fileToGenerativePart = async (
  file: File
): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;

      // Determinar MIME type apropiado
      let mimeType = file.type || 'application/pdf';

      // Validar tipos de archivo soportados
      const supportedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ];

      if (!supportedTypes.includes(mimeType)) {
        // Intentar inferir desde la extensión del archivo
        const extension = file.name.split('.').pop()?.toLowerCase();
        const extensionMap: Record<string, string> = {
          pdf: 'application/pdf',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          webp: 'image/webp',
        };

        mimeType = extensionMap[extension || ''] || 'application/pdf';
      }

      resolve({ data: base64, mimeType });
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Limpia la respuesta JSON eliminando posibles bloques de código markdown
 */
const cleanJsonResponse = (text: string): string => {
  let cleaned = text.trim();

  // Eliminar bloques de código markdown (```json ... ```)
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  const matches = jsonBlockRegex.exec(cleaned);

  if (matches && matches[1]) {
    cleaned = matches[1].trim();
  }

  // Eliminar comentarios JSON si existen (aunque no son estándar)
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

  return cleaned.trim();
};

/**
 * Valida que el objeto extraído tenga los campos mínimos requeridos
 */
const validateExtractedData = (
  data: unknown,
  documentType: DocumentType
): data is ExtractedData => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Validación básica según tipo de documento
  switch (documentType) {
    case 'tickets':
      // Campos mínimos para tickets
      return typeof obj.category === 'string' || typeof obj.establishment === 'string';

    case 'invoices':
      // Campos mínimos para facturas
      return (
        (typeof obj.supplier === 'string' || typeof obj.proveedor === 'string') &&
        (typeof obj.total === 'string' || typeof obj.invoiceNum === 'string')
      );

    case 'staff':
      // Campos mínimos para nóminas
      return typeof obj.employee === 'string' || typeof obj.type === 'string';

    default:
      return false;
  }
};

/**
 * Aplica valores por defecto según el tipo de documento
 */
const applyDefaults = (data: ExtractedData, documentType: DocumentType): ExtractedData => {
  const result = { ...data };

  switch (documentType) {
    case 'tickets':
      if (!result.category) result.category = 'Otros';
      if (!result.department) result.department = 'Ventas';
      break;

    case 'invoices':
      if (!result.department) result.department = 'IT';
      if (!result.expenseType) result.expenseType = 'Licencias Software';
      if (!result.currency) result.currency = 'EUR';
      if (!result.origin) result.origin = 'national';
      break;

    case 'staff':
      if (!result.type) result.type = 'Nómina';
      break;
  }

  return result;
};

/**
 * Obtiene el prompt y schema según el tipo de documento
 */
const getPromptAndSchema = (documentType: DocumentType): {
  promptText: string;
  responseSchema: Record<string, unknown>;
} => {
  if (documentType === 'tickets') {
    return {
      promptText:
        'Analyze this receipt/ticket. Extract the following details: establishment name, Tax ID (NIF) if available, full address, city, zip code, date (YYYY-MM-DD), time (HH:MM), tax base amount, vat amount, total amount, and category. Also infer the department based on the nature of the expense.',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            enum: ['Viajes y Dietas', 'Transporte', 'Material Oficina', 'Comidas', 'Otros'],
          },
          department: { type: Type.STRING },
          establishment: { type: Type.STRING },
          nif: { type: Type.STRING },
          address: { type: Type.STRING },
          zip: { type: Type.STRING },
          city: { type: Type.STRING },
          date: { type: Type.STRING },
          time: { type: Type.STRING },
          base: { type: Type.STRING },
          vat: { type: Type.STRING },
          amount: { type: Type.STRING },
        },
      },
    };
  }

  if (documentType === 'staff') {
    return {
      promptText:
        'Analyze this HR document. Extract employee name, type, period, net amount, and social security.',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          employee: { type: Type.STRING },
          type: { type: Type.STRING },
          period: { type: Type.STRING },
          net: { type: Type.STRING },
          ss: { type: Type.STRING },
        },
      },
    };
  }

  // Default: invoices
  return {
    promptText:
      "Analyze this invoice or license document. First, determine if it is 'national' or 'foreign' based on the Tax ID. If it has a VAT number (starts with country code e.g. DE, FR, US, GB, etc.), it is 'foreign'. Otherwise 'national'. Then extract strictly: Department (infer), Expense Type, Supplier (IMPORTANT: Remove any company legal suffix like S.L., S.A., SL, SA, S.A.U., SAU from the name), Tax ID (CIF/NIF for national, VAT ID for foreign), Invoice Number, Issue Date, Concept (translate description to Spanish), Tax Base, Currency, VAT Amount, and Total Amount.",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        origin: {
          type: Type.STRING,
          enum: ['national', 'foreign'],
          description: "Classify as 'foreign' if a VAT ID is present, otherwise 'national'.",
        },
        department: {
          type: Type.STRING,
          description: 'Inferred department (e.g. IT, Marketing, HR).',
        },
        expenseType: {
          type: Type.STRING,
          description: 'Type of expense (e.g. Licencia Software, Consultoría).',
        },
        supplier: {
          type: Type.STRING,
          description: 'Supplier Name without company suffixes (e.g. remove SL, SA, S.L., S.A., SAU).',
        },
        cif: {
          type: Type.STRING,
          description: 'Tax ID (CIF/NIF) if national.',
        },
        vatId: {
          type: Type.STRING,
          description: 'VAT ID if foreign.',
        },
        invoiceNum: {
          type: Type.STRING,
          description: 'Invoice Number',
        },
        issueDate: {
          type: Type.STRING,
          description: 'Date YYYY-MM-DD',
        },
        concept: {
          type: Type.STRING,
          description: 'Brief description of items or services, translated to Spanish.',
        },
        base: {
          type: Type.STRING,
          description: 'Tax Base amount',
        },
        currency: {
          type: Type.STRING,
          description: 'Currency symbol or code (EUR, USD, €)',
        },
        vat: {
          type: Type.STRING,
          description: 'VAT amount',
        },
        total: {
          type: Type.STRING,
          description: 'Total amount',
        },
      },
      required: ['supplier', 'total', 'invoiceNum', 'origin'],
    },
  };
};

/**
 * Hook principal para extracción de datos con Gemini AI
 *
 * Este hook encapsula toda la lógica de integración con la API de Gemini,
 * proporcionando una interfaz limpia para procesar documentos financieros.
 *
 * @example
 * ```tsx
 * const { processDocument, isLoading, error } = useGeminiExtraction({ documentType: 'invoices' });
 *
 * const handleFile = async (file: File) => {
 *   const data = await processDocument(file, 'invoices');
 *   console.log('Datos extraídos:', data);
 * };
 * ```
 */
export const useGeminiExtraction = (
  options?: UseGeminiExtractionOptions
): UseGeminiExtractionReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  // Ref para mantener la API key una vez obtenida (evita múltiples validaciones)
  const apiKeyRef = useRef<string | null>(null);

  /**
   * Función principal para procesar un documento individual
   */
  const processDocument = useCallback(
    async (file: File, docType: DocumentType): Promise<ExtractedData | null> => {
      try {
        // Validar y obtener API key (solo una vez)
        if (!apiKeyRef.current) {
          apiKeyRef.current = getApiKey();
        }

        // Logs solo en desarrollo
        if (import.meta.env.DEV) {
          console.log('📄 [useGeminiExtraction] Procesando documento:', {
            nombre: file.name,
            tipo: file.type,
            tamaño: file.size,
            documentType: docType,
          });
        }

        // 1. Convertir archivo a Base64
        const { data: base64Data, mimeType } = await fileToGenerativePart(file);

        // 2. Inicializar cliente Gemini
        const genAI = new GoogleGenAI({ apiKey: apiKeyRef.current });

        // 3. Obtener prompt y schema según tipo de documento
        const { promptText, responseSchema } = getPromptAndSchema(docType);

        // 4. Llamar a la API de Gemini
        const response = await genAI.models.generateContent({
          model: GEMINI_MODEL,
          contents: {
            parts: [
              { inlineData: { mimeType, data: base64Data } },
              { text: promptText },
            ],
          },
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema,
          },
        });

        // 5. Limpiar y parsear respuesta JSON
        const responseText = response.text || '';
        const cleanedText = cleanJsonResponse(responseText);

        let parsedData: unknown;
        try {
          parsedData = JSON.parse(cleanedText);
        } catch (parseError) {
          if (import.meta.env.DEV) {
            console.error('❌ [useGeminiExtraction] Error al parsear JSON:', parseError);
            console.error('Texto recibido:', cleanedText);
          }
          throw new Error('La respuesta de la IA no es un JSON válido');
        }

        // 6. Validar estructura mínima
        if (!validateExtractedData(parsedData, docType)) {
          if (import.meta.env.DEV) {
            console.warn(
              '⚠️ [useGeminiExtraction] Datos extraídos no cumplen validación mínima:',
              parsedData
            );
          }
          // Continuar de todas formas, pero loggear advertencia
        }

        // 7. Aplicar valores por defecto
        const extractedData = applyDefaults(parsedData as ExtractedData, docType);

        if (import.meta.env.DEV) {
          console.log('✅ [useGeminiExtraction] Datos extraídos exitosamente:', extractedData);
        }

        return extractedData;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error desconocido al extraer datos';

        if (import.meta.env.DEV) {
          console.error('❌ [useGeminiExtraction] Error en extracción:', err);
        }

        throw new Error(errorMessage);
      }
    },
    []
  );

  /**
   * Procesa múltiples archivos secuencialmente (por lotes)
   */
  const processFiles = useCallback(
    async (files: File[], docType: DocumentType): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Inicializar cola de procesamiento
        const newQueueItems: BatchItem[] = files.map((file, idx) => ({
          id: `${Date.now()}-${idx}`,
          file,
          status: 'queued' as const,
          data: null,
        }));

        setBatchQueue(newQueueItems);

        // Procesar secuencialmente para evitar rate limits
        const processedItems = [...newQueueItems];

        for (let i = 0; i < processedItems.length; i++) {
          // Actualizar estado a processing
          processedItems[i].status = 'processing';
          setBatchQueue([...processedItems]);

          try {
            const extractedData = await processDocument(processedItems[i].file, docType);
            processedItems[i].data = extractedData;
            processedItems[i].status = 'ready';
          } catch (err) {
            const errorMessage =
              err instanceof Error ? err.message : 'Error desconocido al procesar archivo';
            processedItems[i].status = 'error';
            processedItems[i].error = errorMessage;

            if (import.meta.env.DEV) {
              console.error(
                `❌ [useGeminiExtraction] Error procesando archivo ${processedItems[i].file.name}:`,
                err
              );
            }
          }

          setBatchQueue([...processedItems]);
        }

        // Seleccionar primer item como activo si hay items listos
        const firstReadyItem = processedItems.find((item) => item.status === 'ready');
        if (firstReadyItem) {
          setActiveBatchId(firstReadyItem.id);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error desconocido al procesar archivos';
        setError(errorMessage);

        if (import.meta.env.DEV) {
          console.error('❌ [useGeminiExtraction] Error en procesamiento por lotes:', err);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [processDocument]
  );

  /**
   * Actualiza los datos extraídos de un item de la cola
   */
  const updateExtractedData = useCallback((id: string, data: ExtractedData) => {
    setBatchQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, data } : item))
    );
  }, []);

  /**
   * Marca un item como completado
   */
  const markAsCompleted = useCallback((id: string) => {
    setBatchQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'completed' as const } : item
      )
    );
  }, []);

  /**
   * Obtiene los datos extraídos de un item por su ID
   */
  const getExtractedData = useCallback(
    (id: string): ExtractedData | null => {
      const item = batchQueue.find((i) => i.id === id);
      return item?.data || null;
    },
    [batchQueue]
  );

  /**
   * Resetea todos los estados del hook
   */
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setBatchQueue([]);
    setActiveBatchId(null);
    apiKeyRef.current = null;
  }, []);

  return {
    isLoading,
    error,
    batchQueue,
    activeBatchId,
    processDocument,
    processFiles,
    setActiveBatchId,
    updateExtractedData,
    markAsCompleted,
    reset,
    getExtractedData,
  };
};
