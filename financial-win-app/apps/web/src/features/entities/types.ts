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
  puesto?: string;
  cuentaContable?: string;
  // Dirección y Facturación
  direccion?: string;
  ciudad?: string;
  zip?: string;
  pais?: Pais;
  // Bank Data & Payment
  iban?: string;
  formaPago?: FormaPago;
  plazoPago?: PlazoPago;
  // Campos A3
  idContableA3?: string;
  actividadA3?: string;
  serieA3?: string;
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
  puesto?: string;
  cuentaContable?: string;
  direccion?: string;
  ciudad?: string;
  zip?: string;
  pais?: Pais;
  iban?: string;
  formaPago?: FormaPago;
  plazoPago?: PlazoPago;
  idContableA3?: string;
  actividadA3?: string;
  serieA3?: string;
  contactos: ContactoProveedor[];
  notasInternas?: string;
}

export interface UpdateProveedorDto extends Partial<CreateProveedorDto> {
  id: string;
}

// Tipo para Cliente
export interface Cliente {
  id?: string;
  // Datos Generales
  nif: string;
  razonSocial: string;
  direccion?: string;
  codigoPostal?: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
  telefono?: string;
  email?: string;
  // Información Contable
  cuentaContable?: string;
  contrapartida?: string;
  claveOperacion347?: string;
  // Campos A3
  idContableA3?: string;
  actividadA3?: string;
  serieA3?: string;
  // Datos de Contacto
  contactoNombre?: string;
  contactoApellidos?: string;
  contactoCargo?: string;
  contactoTelefono?: string;
  contactoEmail?: string;
  // Información Comercial
  descuento?: number;
  formaPagoDefault?: string;
  diaPago?: number;
  limiteCredito?: number;
  // Facturación
  formasPagoAceptadas?: string[];
  plazoPago?: number;
  retencionIRPF?: number;
  // Otra Información
  web?: string;
  numeroEmpleados?: number;
  sector?: string;
  fechaAlta?: string;
  // Notas
  notas?: string;
  // Metadata
  created_at?: string;
  updated_at?: string;
  company_id?: string;
  is_active?: boolean;
}
