# Plan de Migración Técnico - Módulo de IA

## Objetivo Técnico

Definir la migración del módulo de IA desde la carpeta `aistudio` hacia una arquitectura modular, mantenible y escalable dentro de la estructura del proyecto principal (`apps/web/src/`). El objetivo es transformar un componente monolítico de más de 2000 líneas en una arquitectura basada en componentes atómicos, hooks especializados y estilos centralizados, cumpliendo estrictamente con las directrices establecidas en `.cursorrules.frontend`.

---

## Fase 1: Descomposición de UI (Arquitectura de Componentes)

### Análisis del Módulo Original

El archivo `BillingModule.tsx` contiene múltiples responsabilidades mezcladas:
- Gestión de estado de carga y procesamiento
- Lógica de extracción de datos con Gemini API
- UI de drag & drop para archivos
- Formularios dinámicos según tipo de documento
- Modales de validación y confirmación
- Vista de previsualización de documentos
- Cola de procesamiento por lotes

### Estrategia de Componentización

#### 1. Componentes Atómicos para `apps/web/src/components/common/`

**Dropzone Component** (`Dropzone.tsx`)
- **Responsabilidad**: Área de arrastre y selección de archivos
- **Props**: `onFilesSelected: (files: File[]) => void`, `accept?: string`, `multiple?: boolean`
- **Extracción**: Líneas 1838-1882 del módulo original (área de drag & drop)
- **Características**:
  - Manejo de eventos drag & drop
  - Visual feedback durante drag activo
  - Botón de selección de archivos
  - Indicadores de tipos de archivo aceptados

**FilePreview Component** (`FilePreview.tsx`)
- **Responsabilidad**: Visualización de documentos (PDF, imágenes)
- **Props**: `file: File | null`, `previewUrl: string | null`, `fileName?: string`
- **Extracción**: Líneas 1962-2008 del módulo original (pane de previsualización)
- **Características**:
  - Renderizado condicional para PDF (iframe) e imágenes
  - Overlay informativo con metadatos del archivo
  - Estado vacío cuando no hay archivo

**ResultCard Component** (`ResultCard.tsx`)
- **Responsabilidad**: Tarjeta para mostrar resultados de extracción
- **Props**: `data: ExtractedData`, `onEdit?: () => void`, `variant?: 'tickets' | 'invoices' | 'staff'`
- **Extracción**: Lógica de renderizado de campos según tipo (líneas 1367-1700)
- **Características**:
  - Renderizado condicional de campos según tipo de documento
  - Badges de estado (nacional/extranjera, categoría)
  - Campos editables inline

**StatusBadge Component** (`StatusBadge.tsx`)
- **Responsabilidad**: Badge de estado para items en cola de procesamiento
- **Props**: `status: 'queued' | 'processing' | 'ready' | 'completed' | 'error'`, `label?: string`
- **Extracción**: Líneas 1936-1942 (indicadores de estado en cola)
- **Características**:
  - Iconos dinámicos según estado
  - Animaciones para estados de procesamiento
  - Variantes de color semánticas

**ProcessingProgress Component** (`ProcessingProgress.tsx`)
- **Responsabilidad**: Indicador de progreso durante procesamiento por lotes
- **Props**: `completed: number`, `total: number`, `currentFileName?: string`
- **Extracción**: Líneas 1888-1913 (pantalla de procesamiento)
- **Características**:
  - Barra de progreso animada
  - Contador de documentos procesados
  - Spinner con animación

**BatchQueueSidebar Component** (`BatchQueueSidebar.tsx`)
- **Responsabilidad**: Sidebar con cola de archivos en procesamiento
- **Props**: `items: BatchItem[]`, `activeId: string | null`, `onSelect: (id: string) => void`
- **Extracción**: Líneas 1919-1960 (sidebar de cola)
- **Características**:
  - Lista scrollable de items
  - Indicador de item activo
  - Estados visuales por item
  - Contador de validados

**ValidationModal Component** (`ValidationModal.tsx`)
- **Responsabilidad**: Modal de confirmación antes de validar documento
- **Props**: `isOpen: boolean`, `onConfirm: () => void`, `onCancel: () => void`, `data: ExtractedData`
- **Extracción**: Lógica de modal de validación (referencias en líneas 1300-1302)
- **Características**:
  - Vista previa de datos extraídos
  - Botones de acción (confirmar/cancelar)
  - Layout responsive

**DocumentForm Component** (`DocumentForm.tsx`)
- **Responsabilidad**: Formulario dinámico según tipo de documento
- **Props**: `data: ExtractedData`, `onChange: (field: string, value: string) => void`, `type: 'tickets' | 'invoices' | 'staff'`
- **Extracción**: Función `renderFormFields()` (líneas 1367-1700)
- **Características**:
  - Renderizado condicional de campos
  - Validación básica de campos requeridos
  - Agrupación lógica de campos

#### 2. Componentes de Página para `apps/web/src/pages/ai-extraction/`

**AIExtractionPage Component** (`AIExtractionPage.tsx`)
- **Responsabilidad**: Página principal que coordina el flujo completo
- **Estructura**:
  - Integra el hook `useGeminiExtraction`
  - Renderiza componentes según step actual (upload, processing, validation)
  - Maneja navegación entre pasos
  - Coordina estado global del flujo

**AIExtractionForm Component** (`AIExtractionForm.tsx`)
- **Responsabilidad**: Formulario de revisión y edición de datos extraídos
- **Estructura**:
  - Layout split-view (preview + form)
  - Integración con `DocumentForm` y `FilePreview`
  - Acciones de validación y navegación

### Mapeo de Componentes

| Componente Original | Nuevo Componente | Ubicación |
|---------------------|-------------------|-----------|
| Área drag & drop (líneas 1838-1882) | `Dropzone.tsx` | `components/common/` |
| Preview pane (líneas 1962-2008) | `FilePreview.tsx` | `components/common/` |
| Indicadores de estado (líneas 1936-1942) | `StatusBadge.tsx` | `components/common/` |
| Progreso de procesamiento (líneas 1888-1913) | `ProcessingProgress.tsx` | `components/common/` |
| Sidebar de cola (líneas 1919-1960) | `BatchQueueSidebar.tsx` | `components/common/` |
| Renderizado de campos (líneas 1367-1700) | `DocumentForm.tsx` | `components/common/` |
| Modal de validación | `ValidationModal.tsx` | `components/common/` |
| Componente principal | `AIExtractionPage.tsx` | `pages/ai-extraction/` |
| Vista de revisión | `AIExtractionForm.tsx` | `pages/ai-extraction/` |

---

## Fase 2: Estrategia de Abstracción de Estilos

### Análisis de "Class Soup" en el Módulo Original

El módulo original contiene múltiples instancias de cadenas largas de clases Tailwind que violan la regla de "No Class Soup". Ejemplos identificados:

#### Patrones Repetitivos Identificados

1. **Botones con estilos complejos**:
   ```typescript
   // Línea 1805: Botón de retroceso
   "p-3 rounded-full bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#525252] dark:text-[#d4d4d4] hover:bg-[#fafafa] dark:hover:bg-[#2A3B5A] transition-colors shadow-md group"
   
   // Línea 1865: Botón de acción principal
   "px-10 py-4 bg-[#B84E9D] text-white text-lg rounded-2xl font-bold shadow-xl shadow-[#B84E9D]/20 hover:bg-[#9C3C86] hover:scale-105 transition-all active:scale-95 flex items-center gap-3"
   ```

2. **Cards y contenedores**:
   ```typescript
   // Línea 1818: Card principal
   "bg-white dark:bg-[#131B29] rounded-3xl shadow-sm border border-[#e5e5e5] dark:border-[#2A3B5A] p-8 flex flex-col h-full"
   
   // Línea 107: KPI Cards
   "bg-white dark:bg-[#131B29] rounded-2xl p-6 border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-card flex flex-col justify-between h-full hover:shadow-lg transition-all cursor-default group"
   ```

3. **Área de drag & drop**:
   ```typescript
   // Líneas 1840-1847: Dropzone
   "flex-1 border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center border-[#e5e5e5] dark:border-[#2A3B5A] hover:border-[#B84E9D] dark:hover:border-[#B84E9D] hover:bg-[#fafafa] dark:hover:bg-[#1B273B]/50"
   ```

4. **Inputs y labels**:
   ```typescript
   // TYPO.input (línea 9)
   "w-full px-4 py-2.5 bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] rounded-lg text-sm font-medium text-[#171717] dark:text-[#fafafa] placeholder:text-[#a3a3a3] dark:placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-[#B84E9D] focus:border-[#B84E9D] hover:border-[#a3a3a3] transition-all shadow-sm"
   
   // TYPO.label (línea 8)
   "block text-xs font-bold text-[#525252] dark:text-[#a3a3a3] mb-1.5 uppercase tracking-wider"
   ```

5. **Badges y estados**:
   ```typescript
   // Línea 2022-2026: Badge de origen
   "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
   ```

### Clases Semánticas Propuestas para `apps/web/src/styles/index.css`

#### Clases de Contenedores y Layout

```css
/* Contenedor principal del módulo de IA */
.studio-container {
  @apply w-full h-full flex flex-col min-h-0;
}

/* Card principal del módulo */
.studio-card {
  @apply bg-white dark:bg-[#131B29] rounded-3xl shadow-sm border border-[#e5e5e5] dark:border-[#2A3B5A] p-8 flex flex-col h-full;
}

/* Card de KPI/Dashboard */
.studio-kpi-card {
  @apply bg-white dark:bg-[#131B29] rounded-2xl p-6 border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-card flex flex-col justify-between h-full hover:shadow-lg transition-all cursor-default group;
}

/* Panel lateral (sidebar) */
.studio-sidebar {
  @apply bg-[#fafafa] dark:bg-[#0B1018] border-b md:border-b-0 md:border-r border-[#e5e5e5] dark:border-[#2A3B5A] flex flex-col shrink-0;
}
```

#### Clases de Botones

```css
/* Botón de retroceso/navegación */
.btn-studio-back {
  @apply p-3 rounded-full bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#525252] dark:text-[#d4d4d4] hover:bg-[#fafafa] dark:hover:bg-[#2A3B5A] transition-colors shadow-md group;
}

/* Botón de acción principal (upload, validar) */
.btn-ai-primary {
  @apply px-10 py-4 bg-[#B84E9D] text-white text-lg rounded-2xl font-bold shadow-xl shadow-[#B84E9D]/20 hover:bg-[#9C3C86] hover:scale-105 transition-all active:scale-95 flex items-center gap-3;
}

/* Botón secundario del módulo */
.btn-ai-secondary {
  @apply px-5 py-2.5 rounded-xl border border-[#d4d4d4] dark:border-[#2A3B5A] text-[#525252] dark:text-[#d4d4d4] font-bold text-sm hover:bg-white dark:hover:bg-[#1B273B] transition-colors;
}

/* Botón de toggle (tipo de documento) */
.btn-studio-toggle {
  @apply flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all;
}

.btn-studio-toggle-active {
  @apply btn-studio-toggle bg-white dark:bg-[#1B273B] text-[#B84E9D] shadow-sm;
}

.btn-studio-toggle-inactive {
  @apply btn-studio-toggle text-[#737373] dark:text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4];
}
```

#### Clases de Dropzone

```css
/* Área de drag & drop base */
.dropzone {
  @apply flex-1 border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center;
}

.dropzone-default {
  @apply dropzone border-[#e5e5e5] dark:border-[#2A3B5A] hover:border-[#B84E9D] dark:hover:border-[#B84E9D] hover:bg-[#fafafa] dark:hover:bg-[#1B273B]/50;
}

.dropzone-active {
  @apply dropzone border-[#B84E9D] bg-[#FCECF6]/30 dark:bg-[#B84E9D]/5 scale-[0.99];
}
```

#### Clases de Inputs y Formularios

```css
/* Input del módulo de IA */
.input-studio {
  @apply w-full px-4 py-2.5 bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] rounded-lg text-sm font-medium text-[#171717] dark:text-[#fafafa] placeholder:text-[#a3a3a3] dark:placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-[#B84E9D] focus:border-[#B84E9D] hover:border-[#a3a3a3] transition-all shadow-sm;
}

/* Input de solo lectura */
.input-studio-readonly {
  @apply w-full px-4 py-2.5 bg-[#fafafa] dark:bg-[#1B273B]/50 border border-[#e5e5e5] dark:border-[#2A3B5A] rounded-lg text-sm font-medium text-[#525252] dark:text-[#d4d4d4] focus:outline-none shadow-none cursor-default;
}

/* Label del módulo de IA */
.label-studio {
  @apply block text-xs font-bold text-[#525252] dark:text-[#a3a3a3] mb-1.5 uppercase tracking-wider;
}
```

#### Clases de Badges y Estados

```css
/* Badge de origen (nacional/extranjera) */
.badge-origin {
  @apply flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border;
}

.badge-origin-national {
  @apply badge-origin bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800;
}

.badge-origin-foreign {
  @apply badge-origin bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800;
}

/* Badge de IA */
.badge-ai {
  @apply flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#B84E9D] to-purple-600 text-white text-xs font-bold shadow-sm;
}

/* Badge de estado de procesamiento */
.badge-processing-status {
  @apply inline-flex items-center rounded-full text-xs font-semibold;
}

.badge-status-queued {
  @apply badge-processing-status w-4 h-4 rounded-full border-2 border-[#a3a3a3];
}

.badge-status-processing {
  @apply badge-processing-status text-[#B84E9D] animate-spin;
}

.badge-status-ready {
  @apply badge-processing-status text-green-500;
}

.badge-status-completed {
  @apply badge-processing-status text-green-500;
}

.badge-status-error {
  @apply badge-processing-status text-red-500;
}
```

#### Clases de Preview y Visualización

```css
/* Contenedor de preview */
.preview-container {
  @apply w-full md:w-1/3 lg:w-5/12 bg-[#525252] dark:bg-[#0B1018] flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-[#e5e5e5] dark:border-[#2A3B5A] overflow-hidden;
}

/* Overlay de información de archivo */
.preview-overlay {
  @apply absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white shadow-lg flex items-center gap-3 z-10 pointer-events-none;
}
```

#### Clases de Progreso

```css
/* Contenedor de progreso */
.progress-container {
  @apply w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden;
}

.progress-bar {
  @apply bg-[#B84E9D] h-2.5 rounded-full transition-all duration-300;
}
```

#### Clases de Cola de Procesamiento

```css
/* Item de cola */
.queue-item {
  @apply w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all relative overflow-hidden group;
}

.queue-item-active {
  @apply queue-item bg-white dark:bg-[#1B273B] shadow-sm border border-[#e5e5e5] dark:border-[#2A3B5A];
}

.queue-item-inactive {
  @apply queue-item hover:bg-white/50 dark:hover:bg-[#1B273B]/50 border border-transparent;
}

/* Indicador de item activo */
.queue-item-indicator {
  @apply absolute left-0 top-0 bottom-0 w-1 bg-[#B84E9D];
}
```

### Garantía de Cumplimiento de "Zero Inline Styles"

**Regla estricta**: Todos los estilos estáticos deben estar en CSS. Solo se permiten estilos inline para valores dinámicos calculados en tiempo real.

**Ejemplo de migración**:

```typescript
// ❌ ANTES (módulo original, línea 1908)
<div 
  className="bg-[#B84E9D] h-2.5 rounded-full transition-all duration-300" 
  style={{ width: `${(batchQueue.filter(i => i.status === 'ready' || i.status === 'completed').length / batchQueue.length) * 100}%` }}
></div>

// ✅ DESPUÉS (migrado)
<div 
  className="progress-bar" 
  style={{ width: `${progressPercentage}%` }}
></div>
```

**Justificación**: El valor de `width` es dinámico y calculado en tiempo real, por lo que el estilo inline es permitido según las reglas.

---

## Fase 3: Refactorización de Lógica de IA

### Diseño del Custom Hook `useGeminiExtraction.ts`

#### Ubicación
`apps/web/src/hooks/useGeminiExtraction.ts` o `apps/web/src/pages/ai-extraction/useGeminiExtraction.ts`

#### Responsabilidades del Hook

1. **Gestión de estado de extracción**:
   - Estado de carga (`isLoading`)
   - Estado de error (`error`)
   - Datos extraídos (`extractedData`)
   - Cola de procesamiento por lotes (`batchQueue`)
   - Item activo en la cola (`activeBatchId`)

2. **Lógica de procesamiento**:
   - Inicialización de cliente Gemini
   - Extracción de datos desde archivo individual
   - Procesamiento por lotes secuencial
   - Aplicación de valores por defecto según tipo de documento

3. **Gestión de archivos**:
   - Conversión de archivo a base64
   - Generación de URLs de preview
   - Validación de tipos de archivo

#### Estructura del Hook

```typescript
// apps/web/src/hooks/useGeminiExtraction.ts

export interface ExtractedData {
  // Campos comunes
  origin?: 'national' | 'foreign';
  department?: string;
  
  // Campos para tickets
  category?: string;
  establishment?: string;
  nif?: string;
  address?: string;
  zip?: string;
  city?: string;
  date?: string;
  time?: string;
  base?: string;
  vat?: string;
  amount?: string;
  
  // Campos para invoices
  expenseType?: string;
  supplier?: string;
  cif?: string;
  vatId?: string;
  invoiceNum?: string;
  issueDate?: string;
  concept?: string;
  base?: string;
  currency?: string;
  vat?: string;
  total?: string;
  
  // Campos para staff
  employee?: string;
  type?: string;
  period?: string;
  net?: string;
  ss?: string;
}

export interface BatchItem {
  id: string;
  file: File;
  status: 'queued' | 'processing' | 'ready' | 'completed' | 'error';
  data: ExtractedData | null;
}

export type DocumentType = 'tickets' | 'invoices' | 'staff';

export interface UseGeminiExtractionOptions {
  documentType: DocumentType;
  apiKey: string;
}

export interface UseGeminiExtractionReturn {
  // Estados
  isLoading: boolean;
  error: Error | null;
  batchQueue: BatchItem[];
  activeBatchId: string | null;
  currentFile: File | null;
  previewUrl: string | null;
  
  // Acciones
  processFiles: (files: File[]) => Promise<void>;
  setActiveBatchId: (id: string | null) => void;
  updateExtractedData: (id: string, data: ExtractedData) => void;
  markAsCompleted: (id: string) => void;
  reset: () => void;
  
  // Helpers
  getExtractedData: (id: string) => ExtractedData | null;
  generateFileName: (data: ExtractedData, originalName: string) => string;
}
```

#### Separación de Responsabilidades

**Hook (`useGeminiExtraction.ts`)**:
- Inicialización de GoogleGenAI
- Lógica de extracción (`extractDataFromFile`)
- Procesamiento por lotes (`processBatch`)
- Gestión de estado de la cola
- Aplicación de valores por defecto
- Generación de nombres de archivo

**Componentes Presentacionales**:
- Renderizado de UI
- Manejo de eventos de usuario (drag, click)
- Visualización de datos
- Navegación entre pasos

**Utils (opcional, `apps/web/src/utils/geminiUtils.ts`)**:
- Funciones puras de transformación
- Validación de esquemas
- Sanitización de datos

#### Ejemplo de Implementación del Hook

```typescript
export function useGeminiExtraction({
  documentType,
  apiKey
}: UseGeminiExtractionOptions): UseGeminiExtractionReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Función de extracción (extraída del módulo original, líneas 1080-1190)
  const extractDataFromFile = useCallback(async (file: File): Promise<ExtractedData> => {
    // Lógica de extracción aquí
    // 1. Convertir a base64
    // 2. Inicializar Gemini
    // 3. Definir prompt y schema según documentType
    // 4. Llamar API
    // 5. Aplicar defaults
    // 6. Retornar datos
  }, [documentType, apiKey]);

  // Procesamiento por lotes (extraído del módulo original, líneas 1193-1234)
  const processFiles = useCallback(async (files: File[]) => {
    setIsLoading(true);
    setError(null);
    
    // Inicializar cola
    const newQueueItems: BatchItem[] = files.map((file, idx) => ({
      id: `${Date.now()}-${idx}`,
      file,
      status: 'queued',
      data: null
    }));
    setBatchQueue(newQueueItems);

    // Procesar secuencialmente
    const processedItems = [...newQueueItems];
    for (let i = 0; i < processedItems.length; i++) {
      processedItems[i].status = 'processing';
      setBatchQueue([...processedItems]);

      try {
        const extractedData = await extractDataFromFile(processedItems[i].file);
        processedItems[i].data = extractedData;
        processedItems[i].status = 'ready';
      } catch (err) {
        processedItems[i].status = 'error';
        setError(err as Error);
      }
      
      setBatchQueue([...processedItems]);
    }

    setIsLoading(false);
    if (processedItems.length > 0) {
      setActiveBatchId(processedItems[0].id);
    }
  }, [extractDataFromFile]);

  // Generar preview URL cuando cambia el archivo activo
  useEffect(() => {
    if (activeBatchId) {
      const item = batchQueue.find(i => i.id === activeBatchId);
      if (item) {
        setCurrentFile(item.file);
        const url = URL.createObjectURL(item.file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
      }
    }
  }, [activeBatchId, batchQueue]);

  // Resto de funciones...
  
  return {
    isLoading,
    error,
    batchQueue,
    activeBatchId,
    currentFile,
    previewUrl,
    processFiles,
    setActiveBatchId,
    updateExtractedData,
    markAsCompleted,
    reset,
    getExtractedData,
    generateFileName
  };
}
```

#### Separación de Estados

**Estados de Negocio (en el hook)**:
- `isLoading`: Estado de procesamiento
- `error`: Errores de extracción
- `batchQueue`: Cola de archivos
- `extractedData`: Datos extraídos por archivo

**Estados de UI (en componentes)**:
- `step`: Paso actual del flujo (1: upload, 2: processing, 3: validation)
- `isDragActive`: Estado visual del drag & drop
- `showValidationModal`: Visibilidad del modal
- `showBatchCompleteModal`: Visibilidad del modal de finalización

---

## Fase 4: Checklist de Validación de Reglas

### Checklist de Componentización

- [ ] **Elementos repetitivos extraídos**: Todos los elementos JSX que se usan más de una vez están en `components/common/`
- [ ] **Componentes atómicos**: Cada componente tiene una única responsabilidad
- [ ] **Ubicación correcta**: Componentes genéricos en `components/common/`, componentes específicos del feature en `pages/ai-extraction/`
- [ ] **Props tipadas**: Todas las props están tipadas con TypeScript
- [ ] **Sin JSX repetitivo**: No hay estructuras JSX duplicadas en páginas

### Checklist de Estilos

- [ ] **Zero inline styles**: No hay estilos inline excepto valores dinámicos calculados
- [ ] **No "class soup"**: Todas las cadenas largas de Tailwind están en clases semánticas en `index.css`
- [ ] **Clases semánticas**: Todas las nuevas clases están definidas en `apps/web/src/styles/index.css` con `@apply`
- [ ] **Nombres descriptivos**: Las clases tienen nombres semánticos (`.btn-ai-primary`, no `.blue-button-20px`)
- [ ] **Máximo 3-4 clases**: En JSX se combinan máximo 3-4 clases semánticas

### Checklist de Separación de Responsabilidades

- [ ] **Lógica en hooks**: Toda la lógica de negocio (extracción, procesamiento) está en `useGeminiExtraction`
- [ ] **Componentes puros**: Los componentes en `components/common/` son presentacionales (sin lógica de negocio)
- [ ] **Llamadas API en hooks**: Las llamadas a Gemini API están en el hook, no en componentes
- [ ] **Estado de negocio separado**: Estados de negocio (datos, loading, error) están en el hook
- [ ] **Estado de UI separado**: Estados de UI (modales, pasos) están en componentes de página

### Checklist de Arquitectura

- [ ] **Estructura de carpetas**: Los archivos están en las ubicaciones correctas según la arquitectura del proyecto
- [ ] **Exports centralizados**: Los componentes comunes están exportados en `components/common/index.ts`
- [ ] **Tipos compartidos**: Los tipos están en archivos `.types.ts` o inline cuando son específicos
- [ ] **Hooks reutilizables**: El hook puede ser reutilizado para otros tipos de extracción

### Checklist de Funcionalidad

- [ ] **Drag & drop funcional**: El componente `Dropzone` maneja correctamente drag & drop
- [ ] **Preview funcional**: El componente `FilePreview` muestra correctamente PDFs e imágenes
- [ ] **Procesamiento por lotes**: El hook procesa múltiples archivos secuencialmente
- [ ] **Navegación entre pasos**: La navegación entre upload, processing y validation funciona
- [ ] **Validación de datos**: Los datos extraídos se pueden editar y validar
- [ ] **Manejo de errores**: Los errores se muestran apropiadamente al usuario

---

## Sprint de Ejecución

### Paso 1: Preparación y Setup (Día 1)

**Tareas**:
1. Crear estructura de carpetas:
   - `apps/web/src/pages/ai-extraction/`
   - Verificar que `apps/web/src/components/common/` existe
   - Verificar que `apps/web/src/hooks/` existe

2. Instalar dependencias necesarias:
   - Verificar que `@google/genai` está disponible o agregarlo
   - Verificar configuración de variables de entorno para API key

3. Crear archivos base:
   - `apps/web/src/hooks/useGeminiExtraction.ts` (estructura básica)
   - `apps/web/src/pages/ai-extraction/AIExtractionPage.tsx` (esqueleto)
   - `apps/web/src/pages/ai-extraction/types.ts` (tipos compartidos)

**Validación**: Estructura de carpetas creada, dependencias instaladas

---

### Paso 2: Extracción de Lógica y Creación del Hook (Día 2-3)

**Tareas**:
1. Extraer función `extractDataFromFile` del módulo original (líneas 1080-1190) al hook
2. Extraer función `processBatch` del módulo original (líneas 1193-1234) al hook
3. Implementar gestión de estado en el hook:
   - Estados de loading, error, batchQueue, activeBatchId
   - Funciones de actualización y manipulación de datos
4. Extraer función `getGeneratedFileName` (líneas 1343-1364) al hook
5. Implementar generación de preview URLs
6. Aplicar valores por defecto según tipo de documento

**Validación**: Hook funcional con tests unitarios básicos, lógica de extracción probada

---

### Paso 3: Creación de Componentes Comunes (Día 4-5)

**Tareas**:
1. Crear `components/common/Dropzone.tsx`:
   - Extraer lógica de drag & drop (líneas 1838-1882)
   - Implementar con clases semánticas
   - Añadir a `components/common/index.ts`

2. Crear `components/common/FilePreview.tsx`:
   - Extraer lógica de preview (líneas 1962-2008)
   - Implementar renderizado condicional para PDF/imágenes
   - Añadir a exports

3. Crear `components/common/StatusBadge.tsx`:
   - Extraer indicadores de estado (líneas 1936-1942)
   - Implementar variantes según estado
   - Añadir a exports

4. Crear `components/common/ProcessingProgress.tsx`:
   - Extraer pantalla de progreso (líneas 1888-1913)
   - Implementar barra de progreso animada
   - Añadir a exports

5. Crear `components/common/BatchQueueSidebar.tsx`:
   - Extraer sidebar de cola (líneas 1919-1960)
   - Implementar lista scrollable con estados
   - Añadir a exports

6. Crear `components/common/DocumentForm.tsx`:
   - Extraer función `renderFormFields` (líneas 1367-1700)
   - Implementar renderizado condicional por tipo
   - Añadir a exports

7. Crear `components/common/ValidationModal.tsx`:
   - Implementar modal de validación
   - Añadir a exports

**Validación**: Todos los componentes creados, sin errores de TypeScript, componentes renderizan correctamente en Storybook o tests

---

### Paso 4: Integración y Migración de Estilos (Día 6)

**Tareas**:
1. Agregar todas las clases semánticas a `apps/web/src/styles/index.css`:
   - Clases de contenedores (`.studio-container`, `.studio-card`, etc.)
   - Clases de botones (`.btn-ai-primary`, `.btn-studio-back`, etc.)
   - Clases de dropzone (`.dropzone`, `.dropzone-active`, etc.)
   - Clases de inputs (`.input-studio`, `.label-studio`, etc.)
   - Clases de badges (`.badge-origin-national`, `.badge-ai`, etc.)
   - Clases de preview (`.preview-container`, `.preview-overlay`, etc.)
   - Clases de progreso (`.progress-container`, `.progress-bar`, etc.)
   - Clases de cola (`.queue-item`, `.queue-item-active`, etc.)

2. Reemplazar todas las instancias de "class soup" en componentes:
   - Buscar y reemplazar cadenas largas de Tailwind por clases semánticas
   - Verificar que no queden estilos inline estáticos

3. Verificar cumplimiento de "Zero Inline Styles":
   - Revisar todos los componentes
   - Asegurar que solo hay estilos inline para valores dinámicos calculados

**Validación**: Todas las clases migradas, sin "class soup" en código, estilos funcionan correctamente

---

### Paso 5: Creación de Páginas y Integración Final (Día 7-8)

**Tareas**:
1. Crear `pages/ai-extraction/AIExtractionPage.tsx`:
   - Integrar hook `useGeminiExtraction`
   - Implementar navegación entre pasos (upload, processing, validation)
   - Coordinar renderizado de componentes según step
   - Manejar estados de UI (modales, drag active)

2. Crear `pages/ai-extraction/AIExtractionForm.tsx`:
   - Implementar layout split-view (preview + form)
   - Integrar `FilePreview` y `DocumentForm`
   - Implementar acciones de validación
   - Manejar navegación entre items de la cola

3. Integrar en routing:
   - Agregar ruta en `App.tsx` o router principal
   - Configurar navegación desde otros módulos si es necesario

4. Testing de integración:
   - Probar flujo completo: upload → processing → validation
   - Probar drag & drop
   - Probar procesamiento por lotes
   - Probar edición de datos extraídos
   - Probar navegación entre items de la cola

**Validación**: Flujo completo funcional, sin errores en consola, UI responsive

---

### Paso 6: Limpieza y Documentación (Día 9)

**Tareas**:
1. Eliminar código del módulo original:
   - Marcar como deprecated o eliminar `aistudio/AI Studio/components/billing/BillingModule.tsx` (solo la parte de IA)
   - O mantener como referencia temporal hasta confirmar migración exitosa

2. Documentación:
   - Documentar hook `useGeminiExtraction` con JSDoc
   - Documentar props de componentes comunes
   - Crear ejemplos de uso si es necesario

3. Revisión final del checklist:
   - Ejecutar todos los items del checklist de validación
   - Corregir cualquier incumplimiento

4. Code review:
   - Revisar que se cumplen todas las reglas de `.cursorrules.frontend`
   - Verificar que no hay código duplicado
   - Verificar que la arquitectura es mantenible

**Validación**: Checklist completo, documentación actualizada, código limpio

---

## Consideraciones Adicionales

### Manejo de Variables de Entorno

La API key de Gemini debe estar configurada en variables de entorno:
- Crear o actualizar `.env` con `VITE_GEMINI_API_KEY`
- El hook debe recibir la API key como parámetro o leerla de `import.meta.env`

### Compatibilidad con Estructura Actual

- El plan respeta la estructura de carpetas existente en `apps/web/src/`
- Los componentes comunes siguen el patrón establecido en `components/common/`
- Los hooks siguen el patrón establecido en `hooks/` o `pages/[feature]/`
- Los estilos siguen el patrón establecido en `styles/index.css`

### Testing

Considerar crear tests para:
- Hook `useGeminiExtraction` (tests unitarios)
- Componentes comunes (tests de renderizado)
- Flujo completo (tests de integración)

### Performance

- El procesamiento por lotes es secuencial para evitar rate limits de Gemini API
- Considerar implementar debounce en actualizaciones de estado si es necesario
- Las preview URLs deben ser revocadas cuando no se usen (cleanup en useEffect)

---

## Conclusión

Este plan de migración transforma un módulo monolítico de más de 2000 líneas en una arquitectura modular y mantenible, cumpliendo estrictamente con las directrices de `.cursorrules.frontend`. La separación clara entre lógica (hooks) y presentación (componentes), junto con la abstracción de estilos en clases semánticas, garantiza un código escalable y fácil de mantener.
