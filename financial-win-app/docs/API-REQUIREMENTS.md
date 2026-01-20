# 📋 Requisitos de Información por Pantalla - FinancialWin

Este documento detalla qué información es necesaria en cada pantalla de la aplicación para sustituir los datos hardcodeados por llamadas a APIs externas.

---

## 📊 Índice

1. [Dashboard (HomePage)](#1-dashboard-homepage)
2. [Lista de Clientes](#2-lista-de-clientes)
3. [Nuevo Cliente](#3-nuevo-cliente)
4. [Detalle de Cliente/Proveedor](#4-detalle-de-clienteproveedor)
5. [Lista de Proveedores](#5-lista-de-proveedores)
6. [Nuevo Proveedor](#6-nuevo-proveedor)
7. [Dashboard de Proveedores](#7-dashboard-de-proveedores)
8. [Documentos](#8-documentos)
9. [Gastos](#9-gastos)
10. [Ingresos](#10-ingresos)
11. [Registros](#11-registros)
12. [Control Financiero (Billing)](#12-control-financiero-billing)

---

## 1. Dashboard (HomePage)

### 📍 Ruta: `/`

### 📦 Datos Actuales (Hardcodeados)

- **Próximo vencimiento**: Texto estático
- **Progreso de vencimiento**: Barra de progreso estática
- **Tarjetas de acceso rápido**:
  - Documentos: `15 actualizados`
  - Registros: `23 mensuales`
  - Facturación: `12 pendientes`
  - Clientes: `3 nuevos`
  - Proveedores: `actualizado`
- **Resumen operacional**:
  - Ingresos: `€124,500` (+12%)
  - Gastos: `€42,300` (+2%)
  - Pendientes: `€18,200` (+5%)
- **Alertas**:
  - Error de sincronización
  - Firma pendiente
  - Actualización disponible

### 🔌 Entidades y Campos Necesarios

#### **Entidad: Dashboard Summary**
```typescript
{
  nextDue: {
    title: string;           // "Próximo vencimiento"
    date: string;            // Fecha del próximo vencimiento
    progress: number;        // Porcentaje de progreso (0-100)
    timeRemaining: string;  // "En 5 días"
  };
  quickAccess: {
    documents: {
      count: number;         // Cantidad de documentos actualizados
      label: string;         // "actualizados"
    };
    records: {
      count: number;         // Cantidad de registros mensuales
      label: string;         // "mensuales"
    };
    billing: {
      count: number;         // Cantidad de facturas pendientes
      label: string;         // "pendientes"
    };
    clients: {
      count: number;         // Cantidad de clientes nuevos
      label: string;         // "nuevos"
    };
    suppliers: {
      label: string;         // "actualizado"
    };
  };
  summary: {
    income: {
      amount: number;        // Monto en euros
      change: number;        // Porcentaje de cambio (+12%)
      period: string;        // "Últimos 30 días"
    };
    expenses: {
      amount: number;
      change: number;
      period: string;
    };
    pending: {
      amount: number;
      change: number;
      period: string;
    };
  };
  alerts: Array<{
    id: string;
    type: 'error' | 'warning' | 'info';
    title: string;
    description: string;
    timestamp: string;
  }>;
}
```

---

## 2. Lista de Clientes

### 📍 Ruta: `/clientes/lista`

### 📦 Datos Actuales (Hardcodeados)

- **Lista de clientes** (MOCK_CLIENTES):
  - `id`, `nombre`, `nif`, `tipo` (Nacional/Extranjero)
  - `estado` (activo/pendiente/inactivo)
  - `saldoBancario`, `pagosPendientes`
- **Filtros disponibles**:
  - Estados: activo, pendiente, inactivo
  - Tipos: Nacional, Extranjero
  - Rangos: saldo bancario, pagos pendientes

### 🔌 Entidades y Campos Necesarios

#### **Entidad: Cliente**
```typescript
{
  id: string;                    // UUID
  nombre: string;                // Razón social
  nif: string;                    // NIF/CIF
  tipo: 'Nacional' | 'Extranjero';
  estado: 'activo' | 'pendiente' | 'inactivo';
  saldoBancario: number;          // Saldo en cuenta bancaria
  pagosPendientes: number;        // Monto de pagos pendientes
  email?: string;                // Email de contacto
  telefono?: string;             // Teléfono de contacto
  direccion?: {
    calle: string;
    codigoPostal: string;
    ciudad: string;
    provincia: string;
    pais: string;
  };
  createdAt: string;              // Fecha de creación
  updatedAt: string;             // Fecha de actualización
}
```

#### **Endpoint Sugerido**
```
GET /api/clients
Query params:
  - search?: string              // Búsqueda por nombre/NIF
  - status?: string[]            // Filtro por estados
  - types?: string[]             // Filtro por tipos
  - balanceMin?: number          // Saldo mínimo
  - balanceMax?: number          // Saldo máximo
  - paymentsMin?: number         // Pagos pendientes mínimo
  - paymentsMax?: number         // Pagos pendientes máximo
  - page?: number                // Paginación
  - limit?: number               // Resultados por página
```

---

## 3. Nuevo Cliente

### 📍 Ruta: `/clientes/nuevo`

### 📦 Datos Actuales (Hardcodeados)

- **Formulario con secciones**:
  1. **Datos de la Empresa**: NIF, Razón Social, Dirección, Código Postal, Ciudad, Provincia, País, Teléfono, Email, Logo
  2. **Información Contable**: Cuenta Contable, Contrapartida, Clave de Operación (347)
  3. **Datos de Contacto**: Nombre, Apellidos, Cargo, Teléfono, Email
  4. **Información Comercial**: Descuento (%), Forma de Pago, Día de Pago, Límite de Crédito
  5. **Facturación**: Formas de Pago Aceptadas, Plazo de Pago, Retención IRPF (%)
  6. **Otra Información**: Página Web, Número de Empleados, Sector, Fecha de Alta
  7. **Notas**: Notas Internas

### 🔌 Entidades y Campos Necesarios

#### **Entidad: Cliente (Completa)**
```typescript
{
  // Datos de la Empresa
  nif: string;                    // REQUERIDO
  razonSocial: string;            // REQUERIDO
  direccion: string;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  pais: string;
  telefono: string;
  email: string;
  logo?: string;                  // URL o base64

  // Información Contable
  cuentaContable?: string;        // Código de cuenta contable
  contrapartida?: string;        // Código de contrapartida
  claveOperacion347?: string;    // Clave de operación 347

  // Datos de Contacto
  contacto: {
    nombre: string;
    apellidos: string;
    cargo: string;
    telefono: string;
    email: string;
  };

  // Información Comercial
  descuento?: number;             // Porcentaje de descuento
  formaPagoDefault?: 'transferencia' | 'recibo' | 'efectivo' | 'tarjeta';
  diaPago?: number;               // Día del mes (1-31)
  limiteCredito?: number;         // Límite de crédito en euros

  // Facturación
  formasPagoAceptadas?: Array<'transferencia' | 'recibo' | 'efectivo' | 'tarjeta'>;
  plazoPago?: number;            // Días de plazo de pago
  retencionIRPF?: number;         // Porcentaje de retención IRPF

  // Otra Información
  web?: string;                   // URL de página web
  numeroEmpleados?: number;
  sector?: string;                // Sector de actividad
  fechaAlta?: string;            // Fecha de alta (ISO date)

  // Notas
  notasInternas?: string;
}
```

#### **Endpoints Sugeridos**
```
POST /api/clients                  // Crear nuevo cliente
GET /api/clients/accounting-codes  // Obtener códigos contables disponibles
GET /api/clients/sectors           // Obtener sectores disponibles
```

---

## 4. Detalle de Cliente/Proveedor

### 📍 Ruta: `/cliente/detalle/:id` o `/proveedor/detalle/:id`

### 📦 Datos Actuales (Hardcodeados)

- **Información general**: Nombre, NIF, Tipo, Estado
- **KPIs**: Saldo Total, Facturas Pendientes, Volumen Anual, Última Operación
- **Datos Fiscales**: Dirección, Ciudad, Código Postal, País
- **Facturas**: Lista con número, fecha, concepto, base, IVA, total, estado
- **Contactos**: Lista con nombre, cargo, email, teléfono
- **Notas Internas**: Texto libre

### 🔌 Entidades y Campos Necesarios

#### **Entidad: EntityDetail (Cliente o Proveedor)**
```typescript
{
  id: string;
  nombre: string;
  nif: string;
  tipo: 'cliente' | 'proveedor';
  status: 'activo' | 'pendiente' | 'inactivo';
  
  // KPIs
  saldoTotal: number;
  facturasPendientes: number;
  volumenAnual: number;
  ultimaOperacion: string;        // ISO date

  // Datos Fiscales
  direccionFiscal: {
    calle: string;
    ciudad: string;
    codigoPostal: string;
    pais: string;
  };

  // Facturas
  facturas: Array<{
    id: string;
    numero: string;               // Número de factura
    fecha: string;               // ISO date
    concepto: string;
    base: number;                 // Base imponible
    iva: number;                 // IVA
    total: number;               // Total
    estado: 'pagada' | 'pendiente' | 'vencida' | 'cancelada';
  }>;

  // Contactos
  contactos: Array<{
    id: string;
    nombre: string;
    cargo: string;
    email: string;
    telefono: string;
  }>;

  // Notas
  notasInternas?: string;
}
```

#### **Endpoints Sugeridos**
```
GET /api/clients/:id              // Detalle de cliente
GET /api/suppliers/:id            // Detalle de proveedor
GET /api/clients/:id/invoices     // Facturas de cliente
GET /api/suppliers/:id/invoices   // Facturas de proveedor
GET /api/clients/:id/contacts     // Contactos de cliente
GET /api/suppliers/:id/contacts   // Contactos de proveedor
```

---

## 5. Lista de Proveedores

### 📍 Ruta: `/proveedores/listado`

### 📦 Datos Actuales (Hardcodeados)

- **Lista de proveedores** (MOCK_PROVEEDORES):
  - `id`, `nombre`, `nif`, `tipo` (Proveedor Externo/Staff Interno/Licencias)
  - `estado` (activo/pendiente/inactivo)
  - `saldoBancario`, `pagosPendientes`
  - `email`, `phone` (opcionales)
- **Filtros disponibles**:
  - Estados: activo, pendiente, inactivo
  - Tipos: Proveedor Externo, Staff Interno, Licencias
  - Rangos: saldo bancario, pagos pendientes

### 🔌 Entidades y Campos Necesarios

#### **Entidad: Proveedor**
```typescript
{
  id: string;                    // UUID
  nombre: string;                // Razón social
  nif: string;                   // NIF/CIF
  tipo: 'Proveedor Externo' | 'Staff Interno' | 'Licencias';
  estado: 'activo' | 'pendiente' | 'inactivo';
  saldoBancario: number;         // Saldo en cuenta bancaria
  pagosPendientes: number;       // Monto de pagos pendientes
  email?: string;
  phone?: string;
  direccion?: {
    calle: string;
    codigoPostal: string;
    ciudad: string;
    provincia: string;
    pais: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

#### **Endpoint Sugerido**
```
GET /api/suppliers
Query params:
  - search?: string              // Búsqueda por nombre/NIF
  - status?: string[]            // Filtro por estados
  - types?: string[]             // Filtro por tipos
  - balanceMin?: number          // Saldo mínimo
  - balanceMax?: number          // Saldo máximo
  - paymentsMin?: number         // Pagos pendientes mínimo
  - paymentsMax?: number         // Pagos pendientes máximo
  - page?: number                // Paginación
  - limit?: number               // Resultados por página
```

---

## 6. Nuevo Proveedor

### 📍 Ruta: `/proveedores/nuevo`

### 📦 Datos Actuales (Hardcodeados)

- **Formulario con secciones**:
  1. **Datos Generales**: Nombre, NIF, Tipo, Estado, Email, Teléfono
  2. **Dirección y Facturación**: Dirección completa, Datos bancarios
  3. **Contactos**: Múltiples contactos con nombre, cargo, email, teléfono
  4. **Notas Internas**: Texto libre

### 🔌 Entidades y Campos Necesarios

#### **Entidad: Proveedor (Completa)**
```typescript
{
  // Datos Generales
  nombre: string;                // REQUERIDO
  nif: string;                   // REQUERIDO
  tipo: 'Proveedor Externo' | 'Staff Interno' | 'Licencias';
  estado: 'activo' | 'pendiente' | 'inactivo';
  email?: string;
  phone?: string;

  // Dirección y Facturación
  direccion: {
    calle: string;
    codigoPostal: string;
    ciudad: string;
    provincia: string;
    pais: string;
  };
  datosBancarios?: {
    iban: string;
    swift?: string;
    banco: string;
  };

  // Contactos
  contactos: Array<{
    nombre: string;
    cargo: string;
    email: string;
    telefono: string;
  }>;

  // Notas
  notasInternas?: string;
}
```

#### **Endpoints Sugeridos**
```
POST /api/suppliers               // Crear nuevo proveedor
```

---

## 7. Dashboard de Proveedores

### 📍 Ruta: `/proveedores`

### 📦 Datos Actuales (Hardcodeados)

- **Estadísticas**:
  - Proveedores Activos: `42` (+2 este mes)
  - Nuevos (Mes): `3` (Verificación pendiente)
  - Facturas Ptes: `15` (€12.4k total)
  - Incidencias: `1` (En resolución)
- **Alertas Prioritarias**:
  - Certificado Tributario Caducado
  - Contrato próximo a vencer
- **Actividad Reciente**: Lista de actividades con tipo, título, descripción, fecha
- **Sugerencia de IA**: Texto estático

### 🔌 Entidades y Campos Necesarios

#### **Entidad: Proveedores Dashboard**
```typescript
{
  stats: {
    activos: {
      total: number;             // Total de proveedores activos
      cambio: number;            // Cambio este mes (+2)
    };
    nuevos: {
      count: number;             // Nuevos este mes
      pendientes: number;        // Verificación pendiente
    };
    facturasPendientes: {
      count: number;             // Cantidad de facturas
      total: number;             // Monto total en euros
    };
    incidencias: {
      count: number;             // Cantidad de incidencias
      enResolucion: number;      // En resolución
    };
  };
  alertas: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    title: string;
    description: string;
    count?: number;              // Cantidad afectada
    fechaVencimiento?: string;   // Para contratos
  }>;
  actividad: Array<{
    id: string;
    type: 'register' | 'invoice' | 'contract';
    title: string;
    description: string;
    date: string;                // ISO date o "Hace X horas"
    icon: string;
  }>;
  sugerenciaIA?: {
    title: string;
    description: string;
  };
}
```

#### **Endpoint Sugerido**
```
GET /api/suppliers/dashboard
```

---

## 8. Documentos

### 📍 Ruta: `/documents`

### 📦 Datos Actuales (Hardcodeados)

- **Categorías de documentos**:
  - Licencias (Nacionales, Extranjeras)
  - Tickets
  - Staff (Interno, Externo)
  - Consultor Externo
- **Datos extraídos por IA** (según tipo):
  - **Facturas**: Procedencia, Departamento, Tipo de Gasto, Fecha Emisión, Proveedor, NIF/CIF, Número Factura, Concepto, Base, IVA, Total, Moneda
  - **Tickets**: Categoría, Departamento, Establecimiento, NIF, Dirección, Código Postal, Ciudad, Fecha, Hora, Base, IVA, Total
  - **Staff**: Empleado, Tipo Documento, Periodo, Importe Neto, Seguridad Social

### 🔌 Entidades y Campos Necesarios

#### **Entidad: Categoría de Documento**
```typescript
{
  id: string;
  label: string;
  icon: string;
  subcategories?: string[];
}
```

#### **Entidad: Documento Extraído**
```typescript
{
  // Campos comunes
  id: string;
  tipo: 'invoices' | 'tickets' | 'staff';
  categoria: string;
  subcategoria?: string;
  archivo: {
    nombre: string;
    tipo: string;                 // MIME type
    url: string;                  // URL del archivo
  };
  
  // Campos específicos para Facturas
  origin?: 'national' | 'foreign';
  department?: string;
  expenseType?: string;
  issueDate?: string;
  supplier?: string;
  cif?: string;                   // Para nacionales
  vatId?: string;                 // Para extranjeros
  invoiceNum?: string;
  concept?: string;
  base?: number;
  vat?: number;
  total?: number;
  currency?: 'EUR' | 'USD' | 'GBP';

  // Campos específicos para Tickets
  category?: string;
  establishment?: string;
  nif?: string;
  address?: string;
  zip?: string;
  city?: string;
  date?: string;
  time?: string;
  amount?: number;

  // Campos específicos para Staff
  employee?: string;
  type?: string;                 // Tipo de documento
  period?: string;               // Periodo (YYYY-MM)
  net?: number;
  ss?: number;                    // Seguridad Social

  // Metadatos
  extractedAt: string;           // Fecha de extracción
  validated: boolean;             // Si fue validado
  saved: boolean;                 // Si fue guardado
}
```

#### **Endpoints Sugeridos**
```
GET /api/documents/categories     // Obtener categorías disponibles
POST /api/documents/extract       // Extraer datos de documento (IA)
POST /api/documents              // Guardar documento validado
GET /api/documents                // Listar documentos
GET /api/documents/:id            // Obtener documento por ID
```

---

## 9. Gastos

### 📍 Ruta: `/gastos`

### 📦 Datos Actuales (Hardcodeados)

- **Tabla de gastos** con columnas:
  - Previsualizar, Estado, Proveedor, Departamento, Tipo
  - Fecha Factura, Fecha Pago, Moneda, Vía
  - Importe, Variable, IVA, Total Banco
- **Filtros**: Rango de fechas, Categorías, Estados, Rango de importe

### 🔌 Entidades y Campos Necesarios

#### **Entidad: Gasto**
```typescript
{
  id: string;
  estado: 'Pagado' | 'Registrada' | 'Por Recibir';
  proveedor: {
    id: string;
    nombre: string;
  };
  departamento: string;
  tipo: string;                   // Categoría del gasto
  fechaFactura: string;          // ISO date
  fechaPago?: string;             // ISO date (opcional)
  moneda: string;                 // Código de moneda (EUR, USD, etc.)
  via: 'Transferencia' | 'Cheque' | 'Efectivo' | 'Tarjeta';
  importe: number;                // Base imponible
  variable: number;               // Importe variable
  iva: number;                    // IVA
  totalBanco: number;             // Total a pagar
  documento?: {
    id: string;
    url: string;                  // URL del documento
  };
}
```

#### **Endpoint Sugerido**
```
GET /api/expenses
Query params:
  - search?: string              // Búsqueda por proveedor, departamento, tipo
  - dateFrom?: string            // Fecha desde (ISO date)
  - dateTo?: string              // Fecha hasta (ISO date)
  - categories?: string[]        // Filtro por categorías
  - status?: string[]            // Filtro por estados
  - amountMin?: number           // Importe mínimo
  - amountMax?: number           // Importe máximo
  - page?: number
  - limit?: number
```

---

## 10. Ingresos

### 📍 Ruta: `/ingresos`

### 📦 Datos Actuales (Hardcodeados)

- **Tabla de ingresos** con columnas:
  - Previsualizar, Estado, Cliente, Factura
  - Fecha Factura, Fecha Pago, Vencimiento
  - Importe, IVA, Total, Total Pagado, Saldo
- **Filtros**: Rango de fechas, Estados, Rango de importe

### 🔌 Entidades y Campos Necesarios

#### **Entidad: Ingreso**
```typescript
{
  id: string;
  estado: 'Pagado' | 'Anulada' | 'Pendiente Pago';
  cliente: {
    id: string;
    nombre: string;
  };
  factura: {
    id: string;
    numero: string;               // Número de factura
  };
  fechaFactura: string;          // ISO date
  fechaPago?: string;            // ISO date (opcional)
  vencimiento: string;           // ISO date
  importe: number;               // Base imponible
  iva: number;                   // IVA
  total: number;                // Total facturado
  totalPagado: number;           // Total pagado
  saldo: number;                 // Saldo pendiente (total - totalPagado)
  documento?: {
    id: string;
    url: string;
  };
}
```

#### **Endpoint Sugerido**
```
GET /api/incomes
Query params:
  - search?: string              // Búsqueda por cliente, factura, estado
  - dateFrom?: string            // Fecha desde (ISO date)
  - dateTo?: string              // Fecha hasta (ISO date)
  - status?: string[]            // Filtro por estados
  - amountMin?: number           // Importe mínimo
  - amountMax?: number           // Importe máximo
  - page?: number
  - limit?: number
```

---

## 11. Registros

### 📍 Ruta: `/records`

### 📦 Datos Actuales (Hardcodeados)

- **KPI**: Total de Registros (`1234`)
- **Tabla de registros** con columnas:
  - Estado, Tipo Documento, Departamento, Nombre Documento
  - Fecha Registro, Usuario, Importe, Acción

### 🔌 Entidades y Campos Necesarios

#### **Entidad: Registro**
```typescript
{
  id: string;
  estado: 'VALIDADO' | 'PENDIENTE' | 'RECHAZADO';
  tipoDocumento: string;          // Factura, Recibo, etc.
  departamento: string;
  nombreDocumento: string;
  fechaRegistro: string;         // ISO date
  usuario: {
    id: string;
    nombre: string;              // Nombre completo del usuario
  };
  importe: number;
  documento?: {
    id: string;
    url: string;
  };
}
```

#### **Entidad: Registros Summary**
```typescript
{
  total: number;                 // Total de registros
}
```

#### **Endpoints Sugeridos**
```
GET /api/records                  // Listar registros
GET /api/records/summary          // Resumen de registros (total)
Query params:
  - search?: string              // Búsqueda general
  - estado?: string[]            // Filtro por estados
  - tipoDocumento?: string[]     // Filtro por tipos
  - departamento?: string[]      // Filtro por departamentos
  - fechaDesde?: string          // Fecha desde (ISO date)
  - fechaHasta?: string          // Fecha hasta (ISO date)
  - page?: number
  - limit?: number
```

---

## 12. Control Financiero (Billing)

### 📍 Ruta: `/billing`

### 📦 Datos Actuales (Hardcodeados)

- **KPIs**:
  - Pendientes: `12`
  - Este Mes: `€42,300`
  - Total Anual: `€124,500`

### 🔌 Entidades y Campos Necesarios

#### **Entidad: Billing Summary**
```typescript
{
  pendientes: {
    count: number;               // Cantidad de facturas pendientes
  };
  esteMes: {
    amount: number;              // Monto del mes actual en euros
    currency: string;            // Código de moneda
  };
  totalAnual: {
    amount: number;              // Monto total del año en euros
    currency: string;
    year: number;                // Año de referencia
  };
}
```

#### **Endpoint Sugerido**
```
GET /api/billing/summary
Query params:
  - year?: number                // Año de referencia (default: año actual)
```

---

## 📝 Resumen de Entidades Principales

### 1. **Cliente** (`/api/clients`)
- CRUD completo
- Campos: datos empresa, contables, contacto, comercial, facturación, notas

### 2. **Proveedor** (`/api/suppliers`)
- CRUD completo
- Campos: datos generales, dirección, facturación, contactos, notas

### 3. **Factura** (`/api/invoices`)
- Listado y detalle
- Campos: número, fecha, concepto, importes, estado, cliente/proveedor

### 4. **Gasto** (`/api/expenses`)
- Listado con filtros
- Campos: proveedor, departamento, tipo, fechas, importes, estado

### 5. **Ingreso** (`/api/incomes`)
- Listado con filtros
- Campos: cliente, factura, fechas, importes, estado, saldo

### 6. **Registro** (`/api/records`)
- Listado con filtros
- Campos: tipo, departamento, usuario, fecha, importe, estado

### 7. **Documento** (`/api/documents`)
- Extracción IA, validación, guardado
- Campos: tipo, categoría, datos extraídos, archivo, metadatos

### 8. **Dashboard** (`/api/dashboard`)
- Resumen general
- Campos: próximos vencimientos, resumen financiero, alertas, accesos rápidos

---

## 🔄 Consideraciones de Integración

### Autenticación
- Todos los endpoints deben requerir autenticación JWT
- El `company_id` debe extraerse del token (multi-tenancy)

### Paginación
- Todos los listados deben soportar paginación
- Parámetros estándar: `page`, `limit`

### Filtros
- Implementar filtros consistentes en todos los listados
- Soporte para búsqueda de texto libre
- Rangos numéricos y de fechas

### Validación
- Validar todos los inputs con Zod schemas
- Validar NIF/CIF con algoritmos de validación españoles

### Formato de Fechas
- Usar formato ISO 8601 (`YYYY-MM-DD` o `YYYY-MM-DDTHH:mm:ssZ`)
- Formatear en frontend para visualización

### Formato de Moneda
- Almacenar montos como números (decimales)
- Formatear en frontend según locale (`es-ES` para euros)

---

## 📌 Notas Finales

- Este documento debe actualizarse conforme se implementen las APIs
- Los campos marcados como opcionales (`?`) pueden no estar disponibles inicialmente
- Considerar implementar caché en frontend para mejorar rendimiento
- Implementar manejo de errores y estados de carga en todas las pantallas
