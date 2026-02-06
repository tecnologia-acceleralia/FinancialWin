import type { Proveedor, Cliente } from '../features/entities/types';
import type { ExtractedData } from '../types';

const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

type PartnerType = 'customer' | 'supplier';

export interface OdooPartner {
  id: number;
  name: string;
  vat?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  zip?: string;
  website?: string;
  comment?: string;
  function?: string;
  supplier_rank?: number;
  customer_rank?: number;
}

interface OdooConfig {
  url: string;
  db: string;
  username: string;
  apiKey: string;
}

function getOdooConfig(): OdooConfig {
  return {
    url: 'https://acceleralia-sl.odoo.com',
    db: 'acceleralia-sl',
    username: 'zaffra.burga@acceleralia.com',
    apiKey: '40623e4d2e66a9b8d4d84dc3563c35f4abde0871',
  };
}

async function jsonRpcCall<T>(
  url: string,
  service: string,
  method: string,
  args: unknown[]
): Promise<T> {
  const proxiedUrl = `${CORS_PROXY}${url}/jsonrpc`;

  const payload = {
    jsonrpc: '2.0' as const,
    method: 'call',
    params: {
      service,
      method,
      args,
    },
    id: Math.floor(Math.random() * 1000000),
  };

  console.log('🚀 [Odoo JSON-RPC] Petición saliente', {
    url,
    proxiedUrl,
    service,
    method,
    args,
    payload,
  });

  const response = await fetch(proxiedUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Error en la llamada JSON-RPC: ${response.statusText}`);
  }

  const data = await response.json();

  console.log('📦 [Odoo JSON-RPC] Respuesta recibida', {
    url,
    service,
    method,
    data,
  });

  if (data.error) {
    throw new Error(
      `Error de Odoo: ${data.error.message || JSON.stringify(data.error)}`
    );
  }

  return data.result as T;
}

async function authenticate(config: OdooConfig): Promise<number> {
  console.log('🔐 [Odoo Auth] Parámetros de autenticación', {
    url: config.url,
    db: config.db,
    username: config.username,
    apiKeyPrefix: config.apiKey ? config.apiKey.slice(0, 4) : '',
  });

  const uidResult = await jsonRpcCall<number>(
    config.url,
    'common',
    'authenticate',
    [config.db, config.username, config.apiKey, {}]
  );

  console.log('🔍 [Odoo Auth] Resultado bruto de autenticación', {
    uidResult,
    type: typeof uidResult,
  });

  const uid = uidResult;

  if (!uid || typeof uid !== 'number') {
    throw new Error('No se pudo obtener el UID de autenticación en Odoo.');
  }

  return uid;
}

async function executeKw<T>(
  config: OdooConfig,
  uid: number,
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {}
): Promise<T> {
  const result = await jsonRpcCall<T>(config.url, 'object', 'execute_kw', [
    config.db,
    uid,
    config.apiKey,
    model,
    method,
    args,
    kwargs,
  ]);

  return result;
}

async function getPartners(
  type: PartnerType
): Promise<OdooPartner[]> {
  const config = getOdooConfig();
  const uid = await authenticate(config);

  const domainField = type === 'supplier' ? 'supplier_rank' : 'customer_rank';

  const domain: [string, string, number][] = [[domainField, '>', 0]];
  const fields = [
    'name',
    'vat',
    'email',
    'street',
    'city',
    'website',
    'function',
    'supplier_rank',
    'customer_rank',
  ];

  const partners = await executeKw<
    Array<{
      id: number;
      name: string;
      vat?: string | false | null;
      email?: string | false | null;
      street?: string | false | null;
      city?: string | false | null;
      website?: string | false | null;
      function?: string | false | null;
      supplier_rank?: number;
      customer_rank?: number;
    }>
  >(config, uid, 'res.partner', 'search_read', [domain], { fields });

  return partners
    .filter((p) => p.name)
    .map((p) => ({
      id: p.id,
      name: p.name,
      vat: p.vat && typeof p.vat === 'string' ? p.vat : undefined,
      email: p.email && typeof p.email === 'string' ? p.email : undefined,
      street: p.street && typeof p.street === 'string' ? p.street : undefined,
      city: p.city && typeof p.city === 'string' ? p.city : undefined,
      website:
        p.website && typeof p.website === 'string' ? p.website : undefined,
      function:
        p.function && typeof p.function === 'string' ? p.function : undefined,
      supplier_rank: p.supplier_rank,
      customer_rank: p.customer_rank,
    }));
}

async function createPartner(
  type: PartnerType,
  data: Proveedor | Cliente
): Promise<number> {
  const config = getOdooConfig();
  // Verificar conexión antes de intentar la creación
  const uid = await authenticate(config);

  // Mapeo principal de campos según el tipo
  const payload: Record<string, unknown> = {};

  // Detectar si es Proveedor o Cliente
  const isProveedor = 'cif' in data && 'nombreComercial' in data;
  const isCliente = 'nif' in data;

  if (isProveedor) {
    // Mapeo para Proveedor
    const proveedor = data as Proveedor;
    payload.name = proveedor.nombreComercial || proveedor.razonSocial || false;
    payload.vat = proveedor.cif || false;
    payload.email = proveedor.ordersEmail || false;
    payload.street = proveedor.direccion || false;
    payload.city = proveedor.ciudad || false;
    payload.zip = proveedor.zip || false;
    payload.website = proveedor.web || false;
    payload.phone = proveedor.telefono || false;

    // Crear string de información interna (cajón de sastre) para Proveedor
    const internalInfoParts: string[] = [];
    
    if (proveedor.categoria) {
      internalInfoParts.push(`Categoría: ${proveedor.categoria}`);
    }
    
    if (proveedor.sector) {
      internalInfoParts.push(`Sector: ${proveedor.sector}`);
    }
    
    if (proveedor.iban) {
      internalInfoParts.push(`IBAN: ${proveedor.iban}`);
    }
    
    if (proveedor.formaPago) {
      internalInfoParts.push(`Forma de Pago: ${proveedor.formaPago}`);
    }
    
    if (proveedor.plazoPago) {
      internalInfoParts.push(`Plazo de Pago: ${proveedor.plazoPago}`);
    }

    // Enviar al campo comment de Odoo (notas internas)
    if (internalInfoParts.length > 0) {
      payload.comment = internalInfoParts.join('\n');
    } else {
      payload.comment = false;
    }
  } else if (isCliente) {
    // Mapeo para Cliente
    const cliente = data as Cliente;
    payload.name = cliente.razonSocial || false;
    payload.vat = cliente.nif || false;
    payload.email = cliente.email || false;
    payload.street = cliente.direccion || false;
    payload.city = cliente.ciudad || false;
    payload.zip = cliente.codigoPostal || false;
    payload.website = cliente.web || false;
    payload.phone = cliente.telefono || false;

    // Crear string de información interna (cajón de sastre) para Cliente
    // Concatena: Sector, Forma de Pago, Plazo de Pago y Notas
    const internalInfoParts: string[] = [];
    
    if (cliente.sector) {
      internalInfoParts.push(`Sector: ${cliente.sector}`);
    }
    
    if (cliente.formaPagoDefault) {
      internalInfoParts.push(`Forma de Pago: ${cliente.formaPagoDefault}`);
    }
    
    if (cliente.plazoPago !== undefined) {
      internalInfoParts.push(`Plazo de Pago: ${cliente.plazoPago} días`);
    }
    
    if (cliente.notas) {
      internalInfoParts.push(`Notas: ${cliente.notas}`);
    }

    // Enviar al campo comment de Odoo (notas internas)
    if (internalInfoParts.length > 0) {
      payload.comment = internalInfoParts.join('\n');
    } else {
      payload.comment = false;
    }
  } else {
    throw new Error('Tipo de datos no reconocido. Debe ser Proveedor o Cliente.');
  }

  // Establecer el tipo de partner
  if (type === 'supplier') {
    payload.supplier_rank = 1;
  }
  if (type === 'customer') {
    payload.customer_rank = 1;
  }

  // Odoo devuelve directamente un número (ID del nuevo registro), no un array
  // IMPORTANTE: No intentar iterar la respuesta, aceptar el ID directamente
  const partnerId = await executeKw<number>(
    config,
    uid,
    'res.partner',
    'create',
    [payload]
  );

  // Validar que el resultado sea un número válido
  if (!partnerId || typeof partnerId !== 'number' || partnerId <= 0) {
    throw new Error('Odoo no devolvió un ID de partner válido.');
  }

  return partnerId;
}

async function getPartnerById(id: number): Promise<OdooPartner | null> {
  const config = getOdooConfig();
  const uid = await authenticate(config);

  // Campos que queremos obtener del partner
  const fields = [
    'name',
    'vat',
    'email',
    'phone',
    'street',
    'city',
    'zip',
    'website',
    'comment',
    'function',
    'supplier_rank',
    'customer_rank',
  ];

  // Usar read para obtener un partner específico por ID
  const partners = await executeKw<
    Array<{
      id: number;
      name: string;
      vat?: string | false | null;
      email?: string | false | null;
      phone?: string | false | null;
      street?: string | false | null;
      city?: string | false | null;
      zip?: string | false | null;
      website?: string | false | null;
      comment?: string | false | null;
      function?: string | false | null;
      supplier_rank?: number;
      customer_rank?: number;
    }>
  >(config, uid, 'res.partner', 'read', [[id]], { fields });

  if (!partners || partners.length === 0) {
    return null;
  }

  const partner = partners[0];

  return {
    id: partner.id,
    name: partner.name,
    vat: partner.vat && typeof partner.vat === 'string' ? partner.vat : undefined,
    email: partner.email && typeof partner.email === 'string' ? partner.email : undefined,
    phone: partner.phone && typeof partner.phone === 'string' ? partner.phone : undefined,
    street: partner.street && typeof partner.street === 'string' ? partner.street : undefined,
    city: partner.city && typeof partner.city === 'string' ? partner.city : undefined,
    zip: partner.zip && typeof partner.zip === 'string' ? partner.zip : undefined,
    website:
      partner.website && typeof partner.website === 'string' ? partner.website : undefined,
    comment:
      partner.comment && typeof partner.comment === 'string' ? partner.comment : undefined,
    function:
      partner.function && typeof partner.function === 'string' ? partner.function : undefined,
    supplier_rank: partner.supplier_rank,
    customer_rank: partner.customer_rank,
  };
}

/**
 * Busca un partner por nombre. Si no existe, lo crea con datos mínimos.
 * @param partnerName - Nombre del proveedor/cliente
 * @param type - Tipo de factura: 'in_invoice' (proveedor) o 'out_invoice' (cliente)
 * @returns ID del partner encontrado o creado
 */
async function findOrCreatePartner(
  partnerName: string,
  type: 'in_invoice' | 'out_invoice'
): Promise<number> {
  const config = getOdooConfig();
  const uid = await authenticate(config);

  if (!partnerName || partnerName.trim() === '') {
    throw new Error('El nombre del partner es requerido para crear la factura.');
  }

  // Buscar partner por nombre (búsqueda exacta)
  const domain: [string, string, string][] = [['name', '=', partnerName.trim()]];
  const fields = ['id', 'name'];

  const partners = await executeKw<
    Array<{
      id: number;
      name: string;
    }>
  >(config, uid, 'res.partner', 'search_read', [domain], { fields });

  // Si existe, retornar su ID
  if (partners && partners.length > 0) {
    console.log(`✅ [findOrCreatePartner] Partner encontrado: "${partnerName}" (ID: ${partners[0].id})`);
    return partners[0].id;
  }

  // Si no existe, crear uno nuevo con datos mínimos
  console.log(`🆕 [findOrCreatePartner] Creando nuevo partner: "${partnerName}"`);
  
  const partnerType: PartnerType = type === 'in_invoice' ? 'supplier' : 'customer';
  const payload: Record<string, unknown> = {
    name: partnerName.trim(),
    supplier_rank: partnerType === 'supplier' ? 1 : 0,
    customer_rank: partnerType === 'customer' ? 1 : 0,
  };

  const partnerId = await executeKw<number>(
    config,
    uid,
    'res.partner',
    'create',
    [payload]
  );

  if (!partnerId || typeof partnerId !== 'number' || partnerId <= 0) {
    throw new Error('No se pudo crear el partner en Odoo.');
  }

  console.log(`✅ [findOrCreatePartner] Partner creado: "${partnerName}" (ID: ${partnerId})`);
  return partnerId;
}

/**
 * Crea una factura en Odoo a partir de datos extraídos.
 * @param data - Datos extraídos del documento
 * @param type - Tipo de factura: 'in_invoice' (gastos/proveedores) o 'out_invoice' (ingresos/clientes)
 * @returns ID de la factura creada
 */
async function createInvoice(
  data: ExtractedData,
  type: 'in_invoice' | 'out_invoice'
): Promise<number> {
  const config = getOdooConfig();
  const uid = await authenticate(config);

  // Validar datos requeridos
  if (!data.supplier && type === 'in_invoice') {
    throw new Error('El nombre del proveedor es requerido para crear una factura de gasto.');
  }

  if (!data.supplier && type === 'out_invoice') {
    throw new Error('El nombre del cliente es requerido para crear una factura de ingreso.');
  }

  const partnerName = data.supplier || '';
  if (!partnerName || partnerName.trim() === '') {
    throw new Error('El nombre del partner es requerido para crear la factura.');
  }

  // Buscar o crear el partner
  const partnerId = await findOrCreatePartner(partnerName, type);

  // Validar total
  const total = data.total ? parseFloat(data.total.toString().replace(',', '.')) : 0;
  if (isNaN(total) || total <= 0) {
    throw new Error('El total de la factura debe ser un número válido mayor a 0.');
  }

  // Construir payload de la factura
  const invoicePayload: Record<string, unknown> = {
    move_type: type,
    partner_id: partnerId,
    ref: data.invoiceNum || false,
  };

  // Agregar fecha de factura si está disponible
  if (data.issueDate) {
    invoicePayload.invoice_date = data.issueDate;
  }

  // Crear línea de factura (Odoo requiere al menos una línea)
  const lineName = type === 'in_invoice' 
    ? `Gasto extraído por IA - ${partnerName}`
    : `Ingreso extraído por IA - ${partnerName}`;

  const invoiceLine = {
    name: lineName,
    price_unit: total,
    quantity: 1,
  };

  invoicePayload.invoice_line_ids = [[0, 0, invoiceLine]];

  console.log('📝 [createInvoice] Creando factura en Odoo', {
    type,
    partnerId,
    partnerName,
    invoiceNum: data.invoiceNum,
    issueDate: data.issueDate,
    total,
  });

  // Crear la factura
  const invoiceId = await executeKw<number>(
    config,
    uid,
    'account.move',
    'create',
    [invoicePayload]
  );

  if (!invoiceId || typeof invoiceId !== 'number' || invoiceId <= 0) {
    throw new Error('No se pudo crear la factura en Odoo.');
  }

  console.log(`✅ [createInvoice] Factura creada exitosamente (ID: ${invoiceId})`);
  return invoiceId;
}

/**
 * Diccionario de mapeo de proveedores a categorías de gastos
 * Relaciona nombres de proveedores con las categorías solicitadas por dirección
 * Las claves se buscan dentro del nombre del proveedor (insensible a mayúsculas)
 */
const VENDOR_TO_CATEGORY: Record<string, string> = {
  // Licencias
  'canva': 'Licencias',
  'adobe': 'Licencias',
  'microsoft': 'Licencias',
  'google': 'Licencias',
  'zoom': 'Licencias',
  'slack': 'Licencias',
  'github': 'Licencias',
  
  // Proveedor externo
  'innova': 'Proveedor externo',
  'amazon': 'Proveedor externo',
  'apple': 'Proveedor externo',
  
  // Staff Externo
  'freelance': 'Staff',
  'consultoria': 'Staff',
  'consultoría': 'Staff',
  
  // Comidas/Dietas
  'uber eats': 'Comidas/Dietas',
  'glovo': 'Comidas/Dietas',
  'deliveroo': 'Comidas/Dietas',
  'restaurante': 'Comidas/Dietas',
  
  // Viajes
  'renfe': 'Viajes',
  'uber': 'Viajes',
  'cabify': 'Viajes',
  'hotel': 'Viajes',
  'iberia': 'Viajes',
  'booking': 'Viajes',
  'airbnb': 'Viajes',
  
  // Impuestos/Financieros
  'aeat': 'Impuestos/Financieros',
  'seguridad social': 'Impuestos/Financieros',
  'banco santander': 'Impuestos/Financieros',
  'santander': 'Impuestos/Financieros',
  'bbva': 'Impuestos/Financieros',
};

/**
 * Determina el departamento Zaffra basándose en el nombre del partner y el tipo de factura
 * Sobrescribe el campo "Departamento" que viene como N/A desde Odoo
 * @param partnerName - Nombre del proveedor/cliente
 * @param type - Tipo de factura: 'in_invoice' (gastos) o 'out_invoice' (ingresos)
 * @returns Uno de los 7 departamentos: 'Marketing', 'Ventas', 'Operaciones', 'IT', 'Administración', 'RRHH', 'Dirección'
 */
export function getZaffraDepartment(
  partnerName: string,
  type: 'in_invoice' | 'out_invoice'
): 'Marketing' | 'Ventas' | 'Operaciones' | 'IT' | 'Administración' | 'RRHH' | 'Dirección' {
  if (!partnerName) {
    return 'Administración';
  }
  
  const normalizedName = partnerName.toLowerCase().trim();
  
  // Marketing: si incluye 'canva', 'ads', 'feria', 'ifema'
  if (
    normalizedName.includes('canva') ||
    normalizedName.includes('ads') ||
    normalizedName.includes('feria') ||
    normalizedName.includes('ifema')
  ) {
    return 'Marketing';
  }
  
  // Ventas: si incluye 'comida', 'viaje', 'uber', 'restaurante', 'ave' (solo para gastos)
  // o si es un cliente recurrente de servicios (para ingresos)
  if (type === 'in_invoice') {
    // Para gastos
    if (
      normalizedName.includes('comida') ||
      normalizedName.includes('viaje') ||
      normalizedName.includes('uber') ||
      normalizedName.includes('restaurante') ||
      normalizedName.includes('ave')
    ) {
      return 'Ventas';
    }
  } else {
    // Para ingresos: clientes recurrentes de servicios
    // (Se puede expandir con lógica adicional si es necesario)
    if (normalizedName.includes('cliente') || normalizedName.includes('servicio')) {
      return 'Ventas';
    }
  }
  
  // IT: si incluye 'licencia', 'software', 'aws', 'adobe', 'microsoft'
  if (
    normalizedName.includes('licencia') ||
    normalizedName.includes('software') ||
    normalizedName.includes('aws') ||
    normalizedName.includes('adobe') ||
    normalizedName.includes('microsoft')
  ) {
    return 'IT';
  }
  
  // RRHH: si incluye 'nomina', 'practicas', 'salario', 'mutua'
  if (
    normalizedName.includes('nomina') ||
    normalizedName.includes('nómina') ||
    normalizedName.includes('practicas') ||
    normalizedName.includes('prácticas') ||
    normalizedName.includes('salario') ||
    normalizedName.includes('mutua')
  ) {
    return 'RRHH';
  }
  
  // Administración: si incluye 'aeat', 'banco', 'hacienda', 'gestoria', 'alquiler'
  if (
    normalizedName.includes('aeat') ||
    normalizedName.includes('banco') ||
    normalizedName.includes('hacienda') ||
    normalizedName.includes('gestoria') ||
    normalizedName.includes('gestoría') ||
    normalizedName.includes('alquiler')
  ) {
    return 'Administración';
  }
  
  // Dirección: si incluye 'inversion', 'notaria', 'estrategia'
  if (
    normalizedName.includes('inversion') ||
    normalizedName.includes('inversión') ||
    normalizedName.includes('notaria') ||
    normalizedName.includes('notaría') ||
    normalizedName.includes('estrategia')
  ) {
    return 'Dirección';
  }
  
  // Operaciones: Por defecto para proveedores de servicios externos como 'innova'
  // También para otros proveedores que no coincidan con las categorías anteriores
  if (normalizedName.includes('innova')) {
    return 'Operaciones';
  }
  
  // Por defecto: Operaciones (para proveedores externos no categorizados)
  return 'Operaciones';
}

/**
 * Categoriza un proveedor basándose en su nombre
 * Utiliza búsqueda insensible a mayúsculas y espacios con .includes() para encontrar coincidencias parciales
 * EXTREMADAMENTE PERMISIVA: Busca coincidencias parciales en cualquier parte del nombre
 * @param vendorName - Nombre del proveedor
 * @returns Categoría asignada o "Sin Categorizar" si no se encuentra coincidencia
 */
function categorizeVendor(vendorName: string): string {
  if (!vendorName) {
    console.log('🔍 [Categorización] Proveedor vacío -> Sin Categorizar');
    return 'Sin Categorizar';
  }
  
  // Normalización robusta: convertir a minúsculas
  const normalizedName = vendorName.toLowerCase().trim();
  
  // VERIFICACIÓN ESPECIAL PARA CANVA (extremadamente permisiva)
  if (normalizedName.includes('canva')) {
    console.log(`✅ [Categorización] Mapeando proveedor: "${vendorName}" -> Categoría: Licencias (coincidencia: "canva")`);
    return 'Licencias';
  }
  
  // Verificar si el proveedor contiene "Nomina" o "Salario" para Staff
  if (normalizedName.includes('nomina') || normalizedName.includes('salario')) {
    console.log(`✅ [Categorización] Mapeando proveedor: "${vendorName}" -> Categoría: Staff (nómina/salario)`);
    return 'Staff';
  }
  
  // Buscar coincidencias en el diccionario
  // Ordenar por longitud descendente para priorizar coincidencias más específicas
  const sortedEntries = Object.entries(VENDOR_TO_CATEGORY).sort(
    (a, b) => b[0].length - a[0].length
  );
  
  for (const [key, category] of sortedEntries) {
    // Búsqueda extremadamente permisiva: buscar la clave en cualquier parte del nombre
    if (normalizedName.includes(key.toLowerCase())) {
      console.log(`✅ [Categorización] Mapeando proveedor: "${vendorName}" -> Categoría: ${category} (coincidencia: "${key}")`);
      return category;
    }
  }
  
  console.log(`⚠️ [Categorización] Mapeando proveedor: "${vendorName}" -> Categoría: Sin Categorizar (sin coincidencias)`);
  return 'Sin Categorizar';
}

export interface OdooInvoice {
  id: number;
  name: string;
  partner_id: [number, string]; // [id, nombre]
  invoice_date: string | false | null;
  invoice_date_due?: string | false | null; // Fecha de vencimiento
  amount_total: number;
  state: 'draft' | 'posted' | 'cancel';
  payment_state: 'not_paid' | 'in_payment' | 'paid' | 'partial' | 'reversed' | 'invoicing_legacy';
  currency_id: [number, string]; // [id, nombre]
  categoria_zaffra?: string; // Categoría automática basada en el proveedor
  departamento_zaffra?: 'Marketing' | 'Ventas' | 'Operaciones' | 'IT' | 'Administración' | 'RRHH' | 'Dirección'; // Departamento automático basado en proveedor y categoría
}

/**
 * Mapea los estados de Odoo a estados contables legibles
 * 
 * Lógica jerárquica robusta para evitar errores de interpretación:
 * 1. REVERTIDO: Si state === 'cancel' O payment_state === 'reversed'
 *    (Prioridad máxima - una factura revertida siempre se muestra como tal)
 * 2. BORRADOR: Si state === 'draft'
 * 3. PAGADA: Si state === 'posted' Y payment_state === 'paid'
 * 4. EN PROCESO DE PAGO: Si state === 'posted' Y payment_state === 'in_payment'
 * 5. PUBLICADO: Si state === 'posted' (y no cumple ninguna de las anteriores)
 * 
 * @param state - Estado de la factura en Odoo ('draft' | 'posted' | 'cancel')
 * @param paymentState - Estado de pago en Odoo
 * @returns Estado contable legible para la UI
 */
export function mapOdooStatus(
  state: 'draft' | 'posted' | 'cancel',
  paymentState: 'not_paid' | 'in_payment' | 'paid' | 'partial' | 'reversed' | 'invoicing_legacy'
): 'Borrador' | 'Publicado' | 'En proceso de pago' | 'Pagada' | 'Revertido' {
  // PRIORIDAD 1: REVERTIDO - Verificar si está cancelada o revertida ANTES que cualquier otro estado
  // Esto asegura que facturas como la de Glowfilter se muestren correctamente como "Revertido"
  if (state === 'cancel' || paymentState === 'reversed') {
    return 'Revertido';
  }
  
  // PRIORIDAD 2: BORRADOR - Solo si no está revertida
  if (state === 'draft') {
    return 'Borrador';
  }
  
  // PRIORIDAD 3: PAGADA - Solo si está posted y paid (y no está revertida)
  if (state === 'posted' && paymentState === 'paid') {
    return 'Pagada';
  }
  
  // PRIORIDAD 4: EN PROCESO DE PAGO - Solo si está posted y in_payment (y no está revertida)
  if (state === 'posted' && paymentState === 'in_payment') {
    return 'En proceso de pago';
  }
  
  // PRIORIDAD 5: PUBLICADO - state === 'posted' con otros payment_state (not_paid, partial, etc.)
  if (state === 'posted') {
    return 'Publicado';
  }
  
  // Fallback: si no coincide con ningún estado conocido, retornar 'Publicado'
  // Esto nunca debería ocurrir con datos válidos de Odoo, pero es una medida de seguridad
  return 'Publicado';
}

async function getInvoices(
  type: 'in_invoice' | 'out_invoice'
): Promise<OdooInvoice[]> {
  const config = getOdooConfig();
  const uid = await authenticate(config);

  const domain: [string, string, string][] = [['move_type', '=', type]];
  const fields = [
    'state',
    'payment_state',
    'name',
    'partner_id',
    'invoice_date',
    'invoice_date_due',
    'amount_total',
  ];

  const invoices = await executeKw<
    Array<{
      id: number;
      name: string;
      partner_id: [number, string] | false | null;
      invoice_date: string | false | null;
      invoice_date_due?: string | false | null;
      amount_total: number;
      state: 'draft' | 'posted' | 'cancel';
      payment_state: 'not_paid' | 'in_payment' | 'paid' | 'partial' | 'reversed' | 'invoicing_legacy';
      currency_id: [number, string] | false | null;
    }>
  >(config, uid, 'account.move', 'search_read', [domain], { fields });

  return invoices
    .filter((inv) => inv.name && inv.partner_id && Array.isArray(inv.partner_id))
    .map((inv) => {
      const partnerName = Array.isArray(inv.partner_id) ? inv.partner_id[1] : '';
      
      // Agregar categoria_zaffra solo para facturas de gastos (in_invoice)
      const categoria_zaffra = type === 'in_invoice' 
        ? categorizeVendor(partnerName)
        : undefined;
      
      // Agregar departamento_zaffra para TODOS los tipos de factura usando getZaffraDepartment
      const departamento_zaffra = getZaffraDepartment(partnerName, type);
      
      // Log detallado
      console.log(`📋 [getInvoices] Factura ${type === 'in_invoice' ? 'gasto' : 'ingreso'}: ${inv.name}, Partner: "${partnerName}", Estado: ${inv.state}, Payment: ${inv.payment_state}, Categoría: ${categoria_zaffra || 'N/A'}, Departamento: ${departamento_zaffra}`);
      
      return {
        id: inv.id,
        name: inv.name,
        partner_id: inv.partner_id as [number, string],
        invoice_date: inv.invoice_date,
        invoice_date_due: inv.invoice_date_due,
        amount_total: inv.amount_total,
        state: inv.state,
        payment_state: inv.payment_state,
        currency_id: inv.currency_id && Array.isArray(inv.currency_id) 
          ? inv.currency_id as [number, string]
          : [0, 'EUR'] as [number, string],
        categoria_zaffra,
        departamento_zaffra,
      };
    });
}

export const odooService = {
  getPartners,
  createPartner,
  getPartnerById,
  getInvoices,
  mapOdooStatus,
  createInvoice,
};

export type { PartnerType };

