import { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { DocumentType, ExtractedData } from '../types';

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
const GEMINI_MODEL = 'gemini-3-flash-preview';
const SYSTEM_INSTRUCTION = 'Eres un experto contable español. Tu misión es extraer datos de facturas con precisión total.\n\nRegla de clasificación: Si el emisor es una aerolínea (ej. Vueling), hotel o restaurante, marca siempre como "Viajes y Dietas". Si es una gestoría o servicios legales (ej. Osta Penedes), marca como "Servicios Profesionales".\n\nDepartamentos permitidos: Marketing, IT, RRHH, Finanzas, Operaciones, Ventas.\nTipos de gasto permitidos: Licencias Software, Consultoría, Material Oficina, Servicios Profesionales, Viajes y Dietas, Otros.\nMonedas permitidas: EUR, USD, GBP.\n\nPrioridad NIF: Busca el NIF/CIF del emisor con cuidado, suele estar cerca del logo o en el pie de página. Formato español esperado (letras A, B, o G seguidas de 8 dígitos). Si no lo encuentras, deja el campo vacío pero continúa extrayendo el resto.\n\nIMPORTANTE: Si no estás seguro de una categoría, elige "Otros" o "Finanzas" en lugar de no devolver nada. Es vital que siempre devuelvas un JSON completo con todos los campos. No dejes ningún campo vacío si puedes inferirlo del documento.\n\nRespuesta: Devuelve exclusivamente el objeto JSON sin texto adicional ni bloques de código markdown.';

// Log global al cargar el módulo para verificar si la API Key está disponible
if (typeof window !== 'undefined') {
  console.log('🔑 [Gemini] API Key detectada:', !!import.meta.env.VITE_GEMINI_API_KEY);
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
      // Validar que los valores por defecto estén en los enums permitidos
      const validDepartments = ['Marketing', 'IT', 'RRHH', 'Finanzas', 'Operaciones', 'Ventas'];
      const validExpenseTypes = ['Licencias Software', 'Consultoría', 'Material Oficina', 'Servicios Profesionales', 'Viajes y Dietas', 'Otros'];
      const validCurrencies = ['EUR', 'USD', 'GBP'];
      if (result.department && !validDepartments.includes(result.department)) {
        result.department = 'IT';
      }
      if (result.expenseType && !validExpenseTypes.includes(result.expenseType)) {
        result.expenseType = 'Licencias Software';
      }
      if (result.currency && !validCurrencies.includes(result.currency)) {
        result.currency = 'EUR';
      }
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
        'Analyze this receipt/ticket. Extract the following details: establishment name, Tax ID (NIF) if available, full address, city, zip code, date (YYYY-MM-DD), time (HH:MM), tax base amount, vat amount, total amount, and category. Also infer the department based on the nature of the expense. Return ONLY the JSON object. Do not include any conversational text or markdown code blocks like ```json.',
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
        'Analyze this HR document. Extract employee name, type, period, net amount, and social security. Return ONLY the JSON object. Do not include any conversational text or markdown code blocks like ```json.',
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
      "Analiza esta factura o documento de licencia. Determina si es 'national' o 'foreign' basándote en el Tax ID. Si el número VAT empieza con código de país (DE, FR, US, GB, etc.), es 'foreign', en caso contrario es 'national'. Busca patrones de NIF/CIF como 'NIF', 'CIF', 'VAT ID' o 'Tax ID'. Para facturas de aerolíneas como Vueling, busca el NIF español que empieza por B. Extrae: Departamento (inferir), Tipo de Gasto, Proveedor (eliminar sufijos legales como S.L., S.A., SL, SA, SAU), Tax ID (CIF/NIF para nacional, VAT ID para extranjero), Número de Factura, Fecha de Emisión, Concepto (traducir al español), Base Imponible (número en formato string), Moneda, Importe IVA (número en formato string), Importe Total (número en formato string). Return ONLY the JSON object. Do not include any conversational text or markdown code blocks like ```json.",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        origin: {
          type: Type.STRING,
          description: "Clasificar como 'foreign' si hay un VAT ID presente, en caso contrario 'national'. Valores permitidos: national, foreign.",
        },
        department: {
          type: Type.STRING,
          description: 'Departamento inferido del documento. Valores permitidos: Marketing, IT, RRHH, Finanzas, Operaciones, Ventas. Si no estás seguro, usa "Finanzas".',
        },
        expenseType: {
          type: Type.STRING,
          description: 'Tipo de gasto. Valores permitidos: Licencias Software, Consultoría, Material Oficina, Servicios Profesionales, Viajes y Dietas, Otros. Para facturas de aerolíneas como Vueling, debe ser siempre "Viajes y Dietas". Si no estás seguro, usa "Otros".',
        },
        supplier: {
          type: Type.STRING,
          description: 'Nombre del Proveedor sin sufijos legales (ej: eliminar SL, SA, S.L., S.A., SAU).',
        },
        cif: {
          type: Type.STRING,
          description: 'Tax ID (CIF/NIF) si es nacional. Buscar patrones como "NIF", "CIF", "VAT ID" o "Tax ID". Para Vueling, buscar NIF español que empieza por B. Si no lo encuentras, deja vacío.',
        },
        vatId: {
          type: Type.STRING,
          description: 'VAT ID si es extranjero. Si no existe, deja vacío.',
        },
        invoiceNum: {
          type: Type.STRING,
          description: 'Número de Factura',
        },
        issueDate: {
          type: Type.STRING,
          description: 'Fecha en formato YYYY-MM-DD',
        },
        concept: {
          type: Type.STRING,
          description: 'Breve descripción de artículos o servicios, traducido al español.',
        },
        base: {
          type: Type.STRING,
          description: 'Base Imponible como número en formato string (ej: "100.50")',
        },
        currency: {
          type: Type.STRING,
          description: 'Código de moneda. Valores permitidos: EUR, USD, GBP. Si no puedes determinarlo, usa "EUR".',
        },
        vat: {
          type: Type.STRING,
          description: 'Importe de IVA como número en formato string (ej: "21.00")',
        },
        total: {
          type: Type.STRING,
          description: 'Importe Total como número en formato string (ej: "121.50")',
        },
      },
      required: ['supplier', 'total', 'invoiceNum', 'origin', 'department', 'expenseType', 'currency'],
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
          console.log('🔑 [Gemini] API Key detectada:', !!apiKeyRef.current);
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

        // Log del tamaño del Base64
        console.log('📏 [Gemini] Tamaño del archivo en Base64:', base64Data.length);

        // 2. Inicializar cliente Gemini con la nueva sintaxis de @google/genai
        const ai = new GoogleGenAI({ 
          apiKey: apiKeyRef.current
        });

        // 3. Obtener prompt y schema según tipo de documento
        const { promptText, responseSchema } = getPromptAndSchema(docType);
        
        // Log de configuración
        console.log('🔧 [Gemini 3] Configuración:', {
          model: GEMINI_MODEL,
          hasApiKey: !!apiKeyRef.current,
          version: 'Gemini 3 Flash Preview',
          sdk: '@google/genai (nueva sintaxis)'
        });
        
        // Log antes de la llamada
        console.log('🚀 [Gemini 3] Iniciando petición al modelo:', GEMINI_MODEL);
        console.log('🔗 [Gemini 3] URL de la petición (modelo):', GEMINI_MODEL);

        // Log del payload (mimeType y prompt completo pero truncado para log)
        console.log('📦 [Gemini 3] Datos enviados (formato, prompt corto):', {
          mimeType,
          promptLength: promptText.length,
          prompt: promptText.substring(0, 100) + (promptText.length > 100 ? '...' : ''),
        });

        // 4. Llamar a generateContent usando la nueva sintaxis de @google/genai
        // Nueva sintaxis: ai.models.generateContent con contents usando role y parts
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [
            { 
              role: "user", 
              parts: [
                { inlineData: { mimeType, data: base64Data } },
                { text: promptText }
              ] 
            }
          ],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT' as any, threshold: 'BLOCK_NONE' as any },
              { category: 'HARM_CATEGORY_HATE_SPEECH' as any, threshold: 'BLOCK_NONE' as any },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any, threshold: 'BLOCK_NONE' as any },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as any, threshold: 'BLOCK_NONE' as any }
            ]
          }
        });

        // Log de respuesta exitosa
        // La respuesta puede tener diferentes estructuras según la librería
        console.log('✅ [Gemini 3] Estructura de respuesta:', {
          hasText: !!response.text,
          responseKeys: Object.keys(response),
        });
        
        const responseText = response.text || '';
        console.log('✅ [Gemini 3] Respuesta recibida:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));

        // 5. Validar que la respuesta no esté vacía
        if (!responseText || responseText.trim() === '') {
          throw new Error('El modelo devolvió una respuesta vacía');
        }

        // 6. Limpiar y parsear respuesta JSON
        const cleanedText = cleanJsonResponse(responseText);

        // Validar que el texto limpiado no esté vacío antes de intentar parsear
        if (!cleanedText || cleanedText.trim() === '') {
          throw new Error('La respuesta de la IA está vacía después de limpiar el formato');
        }

        let parsedData: unknown;
        try {
          parsedData = JSON.parse(cleanedText);
        } catch (parseError) {
          if (import.meta.env.DEV) {
            console.error('❌ [useGeminiExtraction] Error al parsear JSON:', parseError);
            console.error('Texto recibido (longitud):', cleanedText.length);
            console.error('Texto recibido (primeros 500 chars):', cleanedText.substring(0, 500));
          }
          
          // Verificar si es un error de JSON vacío o inválido
          if (parseError instanceof SyntaxError) {
            if (parseError.message.includes('Unexpected end of JSON input')) {
              throw new Error('La respuesta de la IA está incompleta o vacía');
            }
          }
          
          throw new Error('La respuesta de la IA no es un JSON válido');
        }

        // Validar que el objeto parseado no esté vacío
        if (!parsedData || (typeof parsedData === 'object' && Object.keys(parsedData).length === 0)) {
          throw new Error('La respuesta de la IA contiene un objeto JSON vacío');
        }

        // 7. Validar estructura mínima
        if (!validateExtractedData(parsedData, docType)) {
          if (import.meta.env.DEV) {
            console.warn(
              '⚠️ [useGeminiExtraction] Datos extraídos no cumplen validación mínima:',
              parsedData
            );
          }
          // Continuar de todas formas, pero loggear advertencia
        }

        // 8. Aplicar valores por defecto
        const extractedData = applyDefaults(parsedData as ExtractedData, docType);

        if (import.meta.env.DEV) {
          console.log('✅ [useGeminiExtraction] Datos extraídos exitosamente:', extractedData);
        }

        return extractedData;
      } catch (err) {
        // Log de error detallado
        console.error('❌ [Gemini 3] Error completo:', err);
        
        // Log adicional con detalles del error
        if (err instanceof Error) {
          console.error('❌ [Gemini 3] Mensaje de error:', err.message);
          console.error('❌ [Gemini 3] Stack trace:', err.stack);
        }
        
        // Si es un error de respuesta HTTP, loggear más detalles
        if (err && typeof err === 'object' && 'response' in err) {
          console.error('❌ [Gemini 3] Detalles de respuesta HTTP:', err);
        }

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
