export type Theme = 'light' | 'dark';

export interface UserProfile {
  name: string;
  role: string;
  avatarUrl: string;
}

export interface Metric {
  label: string;
  value: string;
  trend: number; // percentage
  status: 'up' | 'down' | 'neutral';
}

export interface Client {
  id: string;
  name: string;
  sector: string;
  email: string;
  phone: string;
  status: 'active' | 'pending' | 'inactive';
  avatarInitials: string;
}

export type ViewState = 
  | 'dashboard' 
  | 'upload-invoice' 
  | 'tickets'
  | 'subscriptions'
  | 'billing' 
  | 'clients' 
  | 'suppliers' 
  | 'documents'
  | 'records'
  | 'ai-extraction'
  | 'gastos'
  | 'ingresos'
  | 'settings';

export interface NavSubItem {
  label: string;
  action: string;
  icon?: string;
  subItems?: NavSubItem[];
}

export interface NavItem {
  id: ViewState;
  label: string;
  icon: string;
  subItems?: NavSubItem[];
}

/**
 * Tipo de documento para extracción de datos
 */
export type DocumentType = 'tickets' | 'invoices' | 'staff';

/**
 * Datos extraídos de documentos financieros
 * Contiene todos los campos posibles, que varían según el tipo de documento
 */
export interface ExtractedData {
  // Campos comunes
  department?: 'Marketing' | 'IT' | 'RRHH' | 'Finanzas' | 'Operaciones' | 'Ventas';
  base?: string;
  vat?: string;

  // Campos para tickets
  category?: string;
  establishment?: string;
  nif?: string;
  address?: string;
  zip?: string;
  city?: string;
  date?: string;
  time?: string;
  amount?: string;

  // Campos para invoices
  origin?: 'national' | 'foreign';
  expenseType?: 'Licencias Software' | 'Consultoría' | 'Material Oficina' | 'Servicios Profesionales' | 'Viajes y Dietas' | 'Otros';
  supplier?: string;
  cif?: string;
  vatId?: string;
  invoiceNum?: string;
  issueDate?: string;
  concept?: string;
  currency?: 'EUR' | 'USD' | 'GBP';
  total?: string;

  // Campos para staff
  employee?: string;
  type?: string;
  period?: string;
  net?: string;
  ss?: string;
}
