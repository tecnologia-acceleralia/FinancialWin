export type DocumentType = 'tickets' | 'invoices' | 'staff';

export type ExtractedData = Record<string, string | undefined> & {
  nif?: string;
  fecha?: string;
  baseImponible?: string;
  iva?: string;
  total?: string;
};

