# Guía de Integración: Google Gemini API en FinancialWin

Esta guía te ayudará a integrar y utilizar la API de Google Gemini en el proyecto FinancialWin para la extracción automática de datos de documentos financieros.

---

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener lo siguiente:

### 1. Cuenta de Google Cloud Platform

- Tener una cuenta activa de Google Cloud Platform (GCP)
- Si no tienes una, puedes crearla en [https://cloud.google.com/](https://cloud.google.com/)

### 2. Crear un Proyecto en GCP

1. Accede a la [Consola de Google Cloud](https://console.cloud.google.com/)
2. Haz clic en el selector de proyectos en la parte superior
3. Selecciona **"Nuevo Proyecto"**
4. Asigna un nombre descriptivo (ej: `financialwin-gemini`)
5. Haz clic en **"Crear"**

### 3. Habilitar la API de Gemini

1. En la consola de GCP, navega a **"APIs y Servicios" > "Biblioteca"**
2. Busca **"Vertex AI Gemini API"** o **"Generative Language API"**
3. Haz clic en el resultado y presiona **"Habilitar"**
4. Espera a que se complete la habilitación (puede tardar unos minutos)

### 4. Generar una Clave de API

1. Ve a **"APIs y Servicios" > "Credenciales"**
2. Haz clic en **"+ CREAR CREDENCIALES"**
3. Selecciona **"Clave de API"**
4. Se generará una clave automáticamente
5. **IMPORTANTE**: Copia la clave inmediatamente, ya que no podrás verla de nuevo

### 5. Restricciones de Seguridad (Recomendado para Producción)

Para mayor seguridad, especialmente en producción:

1. Haz clic en la clave de API recién creada
2. En **"Restricciones de aplicación"**, selecciona:
   - **"Sitios web HTTP"** (para desarrollo)
   - **"Direcciones IP"** (para producción - añade las IPs de tus servidores)
3. En **"Restricciones de API"**, selecciona solo **"Vertex AI Gemini API"**
4. Guarda los cambios

---

## ⚙️ Configuración del Entorno (.env)

### Paso 1: Crear o Editar el Archivo `.env.local`

En la raíz del proyecto `apps/web/`, crea o edita el archivo `.env.local`:

```bash
# .env.local
VITE_GEMINI_API_KEY=tu_clave_de_api_aqui
```

**⚠️ IMPORTANTE:**
- El archivo `.env.local` está en `.gitignore` y no se sube al repositorio
- **NUNCA** commitees la clave de API al repositorio
- Reemplaza `tu_clave_de_api_aqui` con tu clave real de Google Gemini

### Paso 2: Acceder a la Variable desde el Código

En Vite, las variables de entorno deben comenzar con `VITE_` para ser accesibles en el cliente. El hook `useGeminiExtraction` ya está configurado para leerla automáticamente:

```typescript
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
```

### Paso 3: Verificar la Configuración

El hook incluye validación automática. Si la clave no está configurada, verás un error descriptivo en la consola del navegador (solo en desarrollo):

```
Error: La variable VITE_GEMINI_API_KEY no está configurada. 
Por favor, configura la variable de entorno en el archivo .env.
```

### Paso 4: Reiniciar el Servidor de Desarrollo

Después de agregar o modificar variables de entorno:

1. Detén el servidor de desarrollo (Ctrl+C)
2. Reinicia con `npm run dev` o `yarn dev`
3. Las nuevas variables estarán disponibles

---

## 🎣 Uso del Hook `useGeminiExtraction`

### Importación

```typescript
import { useGeminiExtraction } from '../hooks/useGeminiExtraction';
import type { DocumentType, ExtractedData } from '../pages/ai-extraction/types';
```

### Parámetros del Hook

El hook acepta opcionalmente un objeto de configuración:

```typescript
interface UseGeminiExtractionOptions {
  documentType: DocumentType; // 'tickets' | 'invoices' | 'staff'
}
```

### Tipos de Documentos Soportados

- **`'tickets'`**: Tickets y recibos de compras
- **`'invoices'`**: Facturas y documentos de proveedores
- **`'staff'`**: Nóminas y documentos de recursos humanos

### Retorno del Hook

El hook retorna un objeto con los siguientes estados y funciones:

```typescript
interface UseGeminiExtractionReturn {
  // Estados
  isLoading: boolean;              // Indica si hay una operación en curso
  error: string | null;            // Mensaje de error si ocurre alguno
  batchQueue: BatchItem[];         // Cola de archivos procesados por lotes
  activeBatchId: string | null;    // ID del lote activo actualmente

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
```

### Ejemplo Básico: Procesar un Documento Individual

```typescript
import { useGeminiExtraction } from '../hooks/useGeminiExtraction';
import { useState } from 'react';

function InvoiceUploader() {
  const { processDocument, isLoading, error } = useGeminiExtraction();
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Procesar el documento
      const data = await processDocument(file, 'invoices');
      
      if (data) {
        setExtractedData(data);
        console.log('Datos extraídos:', data);
        // Aquí puedes usar los datos extraídos
        // Ejemplo: data.supplier, data.total, data.invoiceNum, etc.
      }
    } catch (err) {
      console.error('Error al procesar documento:', err);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept=".pdf,.jpg,.jpeg,.png,.webp" 
        onChange={handleFileChange}
        disabled={isLoading}
      />
      
      {isLoading && <p>Procesando documento...</p>}
      {error && <p className="error">Error: {error}</p>}
      
      {extractedData && (
        <div>
          <h3>Datos Extraídos:</h3>
          <p>Proveedor: {extractedData.supplier}</p>
          <p>Total: {extractedData.total}</p>
          <p>Número de Factura: {extractedData.invoiceNum}</p>
        </div>
      )}
    </div>
  );
}
```

### Ejemplo Avanzado: Procesar Múltiples Archivos por Lotes

```typescript
import { useGeminiExtraction } from '../hooks/useGeminiExtraction';

function BatchProcessor() {
  const {
    processFiles,
    batchQueue,
    activeBatchId,
    isLoading,
    error,
    setActiveBatchId,
    markAsCompleted,
  } = useGeminiExtraction({ documentType: 'invoices' });

  const handleMultipleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Procesar todos los archivos
    await processFiles(files, 'invoices');
  };

  return (
    <div>
      <input 
        type="file" 
        multiple 
        accept=".pdf,.jpg,.jpeg,.png,.webp" 
        onChange={handleMultipleFiles}
        disabled={isLoading}
      />

      {isLoading && <p>Procesando {batchQueue.length} archivos...</p>}
      {error && <p className="error">Error: {error}</p>}

      {/* Mostrar estado de cada archivo en la cola */}
      <div>
        {batchQueue.map((item) => (
          <div key={item.id}>
            <p>
              {item.file.name} - 
              Estado: {item.status} - 
              {item.status === 'ready' && (
                <button onClick={() => setActiveBatchId(item.id)}>
                  Ver Datos
                </button>
              )}
              {item.status === 'ready' && (
                <button onClick={() => markAsCompleted(item.id)}>
                  Marcar como Completado
                </button>
              )}
            </p>
            {item.error && <p className="error">Error: {item.error}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Manejo de Estados

#### Estado de Carga (`isLoading`)

```typescript
{isLoading && (
  <div className="loading-spinner">
    <p>Procesando documento con IA...</p>
  </div>
)}
```

#### Manejo de Errores (`error`)

```typescript
{error && (
  <div className="error-message">
    <p>❌ Error: {error}</p>
    <button onClick={() => reset()}>Reintentar</button>
  </div>
)}
```

#### Acceso a Datos Extraídos

```typescript
const { getExtractedData } = useGeminiExtraction();

// Obtener datos de un item específico de la cola
const data = getExtractedData(batchItemId);
if (data) {
  console.log('Proveedor:', data.supplier);
  console.log('Total:', data.total);
}
```

### Formatos de Archivo Soportados

El hook soporta los siguientes formatos:

- **PDF**: `.pdf` (application/pdf)
- **Imágenes**: `.jpg`, `.jpeg`, `.png`, `.webp`

El hook detecta automáticamente el tipo MIME del archivo y lo convierte a Base64 para enviarlo a la API de Gemini.

---

## 📄 Ejemplo de Prompt para Facturas

El hook `useGeminiExtraction` ya incluye prompts optimizados para cada tipo de documento. Para facturas (`'invoices'`), el prompt interno es:

```
Analyze this invoice or license document. First, determine if it is 'national' or 'foreign' 
based on the Tax ID. If it has a VAT number (starts with country code e.g. DE, FR, US, GB, etc.), 
it is 'foreign'. Otherwise 'national'. Then extract strictly: Department (infer), Expense Type, 
Supplier (IMPORTANT: Remove any company legal suffix like S.L., S.A., SL, SA, S.A.U., SAU from 
the name), Tax ID (CIF/NIF for national, VAT ID for foreign), Invoice Number, Issue Date, 
Concept (translate description to Spanish), Tax Base, Currency, VAT Amount, and Total Amount.
```

### Campos Extraídos para Facturas

El hook retorna un objeto `ExtractedData` con los siguientes campos para facturas:

```typescript
{
  origin: 'national' | 'foreign',      // Origen del proveedor
  department: string,                   // Departamento inferido (ej: 'IT', 'Marketing')
  expenseType: string,                  // Tipo de gasto (ej: 'Licencia Software')
  supplier: string,                     // Nombre del proveedor (sin sufijos legales)
  cif?: string,                         // CIF/NIF para proveedores nacionales
  vatId?: string,                       // VAT ID para proveedores extranjeros
  invoiceNum: string,                   // Número de factura
  issueDate: string,                    // Fecha en formato YYYY-MM-DD
  concept: string,                      // Concepto traducido al español
  base: string,                         // Base imponible
  currency: string,                     // Moneda (EUR, USD, €)
  vat: string,                          // Importe de IVA
  total: string,                        // Importe total
}
```

### Ejemplo de Uso de Datos Extraídos

```typescript
const data = await processDocument(file, 'invoices');

if (data) {
  // Los datos ya vienen validados y con valores por defecto aplicados
  console.log('Proveedor:', data.supplier);
  console.log('Origen:', data.origin); // 'national' o 'foreign'
  console.log('Total:', data.total, data.currency);
  console.log('Fecha:', data.issueDate);
  
  // Usar el CIF o VAT ID según el origen
  const taxId = data.origin === 'national' ? data.cif : data.vatId;
  console.log('ID Fiscal:', taxId);
}
```

### Valores por Defecto Aplicados

El hook aplica automáticamente valores por defecto si algunos campos no se extraen:

- `department`: 'IT' (si no se puede inferir)
- `expenseType`: 'Licencias Software' (si no se detecta)
- `currency`: 'EUR' (si no se especifica)
- `origin`: 'national' (si no se puede determinar)

---

## 🔒 Consideraciones de Seguridad

### 1. Protección de la Clave de API

- ✅ **NUNCA** commitees la clave de API al repositorio
- ✅ Usa `.env.local` (ya está en `.gitignore`)
- ✅ En producción, usa variables de entorno del servidor
- ✅ Restringe la clave por IP en la consola de GCP
- ✅ Limita la clave solo a la API de Gemini

### 2. Validación de Archivos

El hook valida automáticamente:

- Tipo MIME del archivo
- Tamaño del archivo (limitado por la API de Gemini)
- Formato de respuesta JSON de la API

### 3. Manejo de Errores

El hook incluye manejo robusto de errores:

- Validación de API key antes de hacer la petición
- Limpieza de respuestas JSON con bloques de código markdown
- Validación de estructura mínima de datos extraídos
- Mensajes de error descriptivos en desarrollo

### 4. Rate Limiting

Para procesamiento por lotes, el hook procesa archivos **secuencialmente** para evitar exceder los límites de la API:

```typescript
// El hook procesa uno por uno automáticamente
await processFiles(files, 'invoices');
```

Si necesitas procesar muchos archivos, considera implementar un delay entre peticiones:

```typescript
for (const file of files) {
  await processDocument(file, 'invoices');
  await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
}
```

---

## 💰 Consideraciones de Costos

### Modelo Utilizado

El hook utiliza el modelo **`gemini-1.5-flash-latest`**, que es el más económico y rápido de la familia Gemini 1.5.

### Estructura de Precios (Aproximada)

**Nota**: Los precios pueden variar. Consulta la [página oficial de precios de Gemini](https://ai.google.dev/pricing) para información actualizada.

#### Gemini 1.5 Flash

- **Input (texto)**: ~$0.075 por 1M tokens
- **Input (imágenes)**: ~$0.30 por 1M tokens
- **Output**: ~$0.30 por 1M tokens

#### Estimación por Documento

Para un documento típico (factura PDF de 1-2 páginas):

- **Input**: ~5,000-10,000 tokens (imagen + prompt)
- **Output**: ~500-1,000 tokens (JSON con datos extraídos)
- **Costo aproximado**: $0.001 - $0.005 por documento

### Optimización de Costos

1. **Usa el modelo Flash**: Ya está configurado en el hook
2. **Procesa solo lo necesario**: No proceses documentos duplicados
3. **Cachea resultados**: Guarda los datos extraídos para evitar reprocesar
4. **Monitorea uso**: Revisa el dashboard de GCP regularmente

### Límites de Cuota

Google Cloud tiene límites de cuota por defecto:

- **Requests por minuto**: Varía según el plan
- **Tokens por minuto**: Varía según el plan

Si necesitas aumentar los límites:

1. Ve a **"APIs y Servicios" > "Cuotas"** en GCP
2. Busca "Vertex AI Gemini API"
3. Solicita un aumento de cuota si es necesario

### Facturación y Alertas

1. Configura alertas de facturación en GCP:
   - Ve a **"Facturación" > "Presupuestos y alertas"**
   - Crea un presupuesto con alertas
   - Recibirás notificaciones cuando se acerque al límite

2. Revisa el uso regularmente:
   - **"APIs y Servicios" > "Panel"**
   - Monitorea las métricas de uso de la API

---

## 🐛 Solución de Problemas Comunes

### Error: "La variable VITE_GEMINI_API_KEY no está configurada"

**Solución:**
1. Verifica que el archivo `.env.local` existe en `apps/web/`
2. Verifica que la variable se llama exactamente `VITE_GEMINI_API_KEY`
3. Reinicia el servidor de desarrollo
4. Verifica que el archivo no tiene espacios extra: `VITE_GEMINI_API_KEY=tu_clave` (sin espacios alrededor del `=`)

### Error: "Error al parsear JSON"

**Solución:**
- La API puede devolver el JSON envuelto en bloques de código markdown
- El hook ya limpia esto automáticamente, pero si persiste:
  - Verifica que el documento es legible y no está corrupto
  - Intenta con otro documento similar

### Error: "Rate limit exceeded"

**Solución:**
- Reduce la frecuencia de peticiones
- Implementa un delay entre peticiones
- Considera procesar en lotes más pequeños
- Revisa y aumenta la cuota en GCP si es necesario

### El documento no se procesa correctamente

**Solución:**
1. Verifica que el formato está soportado (PDF, JPG, PNG, WEBP)
2. Asegúrate de que el documento es legible (no está escaneado borroso)
3. Verifica que el tipo de documento es correcto (`'invoices'`, `'tickets'`, `'staff'`)
4. Revisa la consola del navegador para logs detallados (solo en desarrollo)

---

## 📚 Recursos Adicionales

- [Documentación oficial de Google Gemini API](https://ai.google.dev/docs)
- [Guía de Vertex AI](https://cloud.google.com/vertex-ai/docs)
- [Precios de Gemini](https://ai.google.dev/pricing)
- [Consola de Google Cloud Platform](https://console.cloud.google.com/)

---

## ✅ Checklist de Integración

Antes de usar el hook en producción, verifica:

- [ ] Tienes una cuenta de GCP activa
- [ ] Has creado un proyecto en GCP
- [ ] Has habilitado la API de Gemini
- [ ] Has generado una clave de API
- [ ] Has configurado `VITE_GEMINI_API_KEY` en `.env.local`
- [ ] Has reiniciado el servidor de desarrollo
- [ ] Has probado con un documento de prueba
- [ ] Has configurado restricciones de seguridad en la clave (producción)
- [ ] Has configurado alertas de facturación en GCP
- [ ] Has revisado los límites de cuota

---

**Última actualización**: Diciembre 2024
