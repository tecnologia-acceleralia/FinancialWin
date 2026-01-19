/**
 * Tipos para entidades del sistema (Proveedores, Clientes, etc.)
 */

export type CategoriaProveedor = 'Proveedor Externo' | 'Staff Interno' | 'Licencias';

export type FormaPago = 'Transferencia' | 'Recibo' | 'Tarjeta';

export type PlazoPago = 'Contado' | '30 días' | '60 días';

export type Pais = 'España' | 'Reino Unido' | 'Francia' | 'Portugal' | 'Estados Unidos';

export interface ContactoProveedor {
  id?: string;
  nombre: string;
  cargo?: string;
  email?: string;
  telefono?: string;
}

export interface Proveedor {
  id?: string;
  // Datos Generales
  categoria: CategoriaProveedor;
  nombreComercial: string;
  razonSocial: string;
  cif: string;
  sector?: string;
  ordersEmail?: string;
  telefono?: string;
  web?: string;
  // Dirección y Facturación
  direccion?: string;
  ciudad?: string;
  zip?: string;
  pais?: Pais;
  // Bank Data & Payment
  iban?: string;
  formaPago?: FormaPago;
  plazoPago?: PlazoPago;
  // Contactos
  contactos: ContactoProveedor[];
  // Notas
  notasInternas?: string;
  // Metadata
  created_at?: string;
  updated_at?: string;
  company_id?: string;
  is_active?: boolean;
}

export interface CreateProveedorDto {
  categoria: CategoriaProveedor;
  nombreComercial: string;
  razonSocial: string;
  cif: string;
  sector?: string;
  ordersEmail?: string;
  telefono?: string;
  web?: string;
  direccion?: string;
  ciudad?: string;
  zip?: string;
  pais?: Pais;
  iban?: string;
  formaPago?: FormaPago;
  plazoPago?: PlazoPago;
  contactos: ContactoProveedor[];
  notasInternas?: string;
}

export interface UpdateProveedorDto extends Partial<CreateProveedorDto> {
  id: string;
}
