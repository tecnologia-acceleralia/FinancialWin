import type { Proveedor } from '../features/entities/types';

const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

type PartnerType = 'customer' | 'supplier';

export interface OdooPartner {
  id: number;
  name: string;
  vat?: string;
  email?: string;
  street?: string;
  city?: string;
  website?: string;
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
  data: Proveedor
): Promise<number> {
  const config = getOdooConfig();
  const uid = await authenticate(config);

  const payload: Record<string, unknown> = {
    name: data.nombreComercial || data.razonSocial,
    vat: data.cif,
    email: data.ordersEmail,
    street: data.direccion,
    city: data.ciudad,
    website: data.web,
  };

  if (type === 'supplier') {
    payload.supplier_rank = 1;
  }
  if (type === 'customer') {
    payload.customer_rank = 1;
  }

  const [partnerId] = await executeKw<number[]>(
    config,
    uid,
    'res.partner',
    'create',
    [payload]
  );

  if (!partnerId) {
    throw new Error('Odoo no devolvió un ID de partner válido.');
  }

  return partnerId;
}

export const odooService = {
  getPartners,
  createPartner,
};

export type { PartnerType };

