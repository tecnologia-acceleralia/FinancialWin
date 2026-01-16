export type DocumentType = 'tickets' | 'invoices' | 'staff';

export type OriginType = 'national' | 'foreign';

export interface ExtractedData {
  // Campos comunes
  origin?: OriginType;
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
  currency?: string;
  total?: string;
  baseImponible?: string;
  iva?: string;
  proveedor?: string;
  concepto?: string;
  fecha?: string;
  
  // Campos para staff
  employee?: string;
  type?: string;
  period?: string;
  net?: string;
  ss?: string;
}

