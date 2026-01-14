import { useState, useCallback } from 'react';

// Log global al cargar el módulo para verificar si la API Key está disponible
console.log('--- TEST API KEY EN CARGA ---', !!import.meta.env.VITE_GEMINI_API_KEY);

// Leer la API Key al cargar el módulo (fuera de cualquier función)
const GOOGLE_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export interface ExtractedInvoiceData {
  nif?: string;
  fecha?: string;
  baseImponible?: string;
  iva?: string;
  total?: string;
  [key: string]: any; // Para campos adicionales que pueda devolver Gemini
}

interface UseGeminiExtractionReturn {
  extractData: (file: File) => Promise<ExtractedInvoiceData | null>;
  loading: boolean;
  error: string | null;
  data: ExtractedInvoiceData | null;
  reset: () => void;
}

export const useGeminiExtraction = (): UseGeminiExtractionReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExtractedInvoiceData | null>(null);

  const extractData = useCallback(async (file: File): Promise<ExtractedInvoiceData | null> => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      // Validar API Key antes de intentar cualquier operación
      if (!GOOGLE_API_KEY || GOOGLE_API_KEY.trim() === '') {
        const errorMsg = 'Error: La variable VITE_GEMINI_API_KEY no está llegando al navegador. Revisa el archivo .env en apps/web/';
        console.error(errorMsg);
        console.error('GOOGLE_API_KEY valor:', GOOGLE_API_KEY);
        console.error('import.meta.env.VITE_GEMINI_API_KEY:', import.meta.env.VITE_GEMINI_API_KEY);
        console.error('Variables VITE_ disponibles:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
        throw new Error(errorMsg);
      }

      // 1. Leer archivo como base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 2. Preparar payload y llamar a la API con fetch (evita el bloqueo del SDK en navegador)
      const apiKeyString = String(import.meta.env.VITE_GEMINI_API_KEY ?? '').trim();

      // Log para verificar el valor antes de pasarlo
      console.log('Inicializando fetch Gemini con API Key (longitud):', apiKeyString.length);
      console.log('Tipo de apiKeyString:', typeof apiKeyString);
      console.log('¿Está vacía?:', apiKeyString === '');

      if (!apiKeyString || apiKeyString === '') {
        throw new Error('Error: La API Key está vacía o no es válida');
      }

      // 3. Definir prompt para facturas
      const promptText = "Analyze this invoice document. Extract the following details: Tax ID (NIF/CIF), Issue Date (YYYY-MM-DD format), Tax Base amount, VAT amount, and Total amount. Return the data in the specified JSON format.";

      // 4. Construir el cuerpo de la petición
      const body = {
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: file.type || 'image/jpeg',
                  data: base64Data
                }
              },
              { text: promptText }
            ]
          }
        ],
        // Pedimos JSON directo
        generation_config: {
          response_mime_type: 'application/json'
        }
      };

      // 5. Ejecutar fetch directo a la API de Google con reintento automático
      const urls = [
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKeyString}`,
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKeyString}`
      ];

      let json: any = null;
      let lastError: any = null;

      for (const url of urls) {
        console.log('Llamando a Gemini vía fetch:', url);
        const fetchResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error('Error HTTP en fetch Gemini:', fetchResponse.status, fetchResponse.statusText, errorText);
          lastError = new Error(`Error al llamar a Gemini: ${fetchResponse.status} ${fetchResponse.statusText}`);

          // Si es 404 probamos siguiente URL
          if (fetchResponse.status === 404) {
            console.warn('Modelo/endpoint no encontrado, intentando con URL alternativa...');
            continue;
          }
          // Para otros códigos, salimos
          throw lastError;
        }

        json = await fetchResponse.json();
        console.log('Respuesta cruda de Gemini:', json);
        break;
      }

      if (!json) {
        throw lastError || new Error('No se pudo obtener respuesta de Gemini');
      }

      // 6. Extraer el texto de la respuesta (puede venir como parts[].text o inline JSON en text)
      const candidate = json.candidates?.[0];
      const part = candidate?.content?.parts?.find((p: any) => p.text) || candidate?.content?.parts?.[0];
      const responseText = part?.text || part?.inline_data?.data || '';

      if (!responseText) {
        throw new Error('No se encontró texto de respuesta en la respuesta de Gemini');
      }

      const result = JSON.parse(responseText) as ExtractedInvoiceData;
      
      setData(result);
      setLoading(false);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al extraer datos';
      setError(errorMessage);
      setLoading(false);
      console.error('Error en extracción con Gemini:', err);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    extractData,
    loading,
    error,
    data,
    reset
  };
};
