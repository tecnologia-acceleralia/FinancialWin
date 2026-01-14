import React, { useMemo } from 'react';
import type { DocumentType, ExtractedData } from '../../pages/ai-extraction/types';

interface FieldDef {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}

export interface DocumentFormProps {
  data: ExtractedData;
  onChange: (field: string, value: string) => void;
  type: DocumentType;
}

const INVOICE_FIELDS: FieldDef[] = [
  { key: 'nif', label: 'NIF / CIF', required: true, placeholder: 'B12345678' },
  { key: 'fecha', label: 'Fecha', required: true, placeholder: 'YYYY-MM-DD' },
  {
    key: 'baseImponible',
    label: 'Base imponible',
    required: true,
    placeholder: '100.00',
    inputMode: 'decimal',
  },
  { key: 'iva', label: 'IVA', required: true, placeholder: '21.00', inputMode: 'decimal' },
  { key: 'total', label: 'Total', required: true, placeholder: '121.00', inputMode: 'decimal' },
];

const TICKET_FIELDS: FieldDef[] = [
  { key: 'fecha', label: 'Fecha', required: true, placeholder: 'YYYY-MM-DD' },
  { key: 'total', label: 'Total', required: true, placeholder: '12.50', inputMode: 'decimal' },
  { key: 'proveedor', label: 'Proveedor', required: false, placeholder: 'Nombre del comercio' },
  { key: 'concepto', label: 'Concepto', required: false, placeholder: 'Descripción' },
];

const STAFF_FIELDS: FieldDef[] = [
  { key: 'empleado', label: 'Empleado', required: true, placeholder: 'Nombre y apellidos' },
  { key: 'fecha', label: 'Fecha', required: true, placeholder: 'YYYY-MM-DD' },
  { key: 'importe', label: 'Importe', required: true, placeholder: '0.00', inputMode: 'decimal' },
  { key: 'concepto', label: 'Concepto', required: false, placeholder: 'Motivo / detalle' },
];

function getFieldsForType(type: DocumentType): FieldDef[] {
  switch (type) {
    case 'tickets':
      return TICKET_FIELDS;
    case 'staff':
      return STAFF_FIELDS;
    case 'invoices':
    default:
      return INVOICE_FIELDS;
  }
}

export const DocumentForm: React.FC<DocumentFormProps> = ({ data, onChange, type }) => {
  const fields = useMemo(() => getFieldsForType(type), [type]);

  const missingRequired = useMemo(() => {
    const missing = new Set<string>();
    for (const field of fields) {
      if (!field.required) continue;
      const value = data[field.key];
      if (!value || String(value).trim() === '') missing.add(field.key);
    }
    return missing;
  }, [data, fields]);

  return (
    <form className="studio-form" aria-label="Formulario del documento">
      <div className="studio-form-header">
        <div className="studio-form-title">
          Revisión y edición
        </div>
        <div className="studio-form-subtitle">
          Ajusta los datos extraídos antes de continuar.
        </div>
      </div>

      <div className="studio-form-grid">
        {fields.map(field => {
          const value = data[field.key] ?? '';
          const isMissing = missingRequired.has(field.key);
          const inputId = `doc-field-${type}-${field.key}`;

          return (
            <div className="studio-form-field" key={field.key}>
              <label className="label-studio" htmlFor={inputId}>
                {field.label}
                {field.required ? <span className="studio-required-indicator"> *</span> : null}
              </label>

              <input
                id={inputId}
                className={isMissing ? 'input-studio input-studio-invalid' : 'input-studio'}
                value={value}
                placeholder={field.placeholder}
                inputMode={field.inputMode}
                onChange={e => onChange(field.key, e.target.value)}
                aria-invalid={isMissing ? true : undefined}
              />

              {isMissing ? (
                <div className="studio-field-hint studio-field-hint-error">
                  Campo requerido.
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </form>
  );
};

