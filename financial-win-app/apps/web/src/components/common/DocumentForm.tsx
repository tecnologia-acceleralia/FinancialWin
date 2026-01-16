import React from 'react';
import type { DocumentType, ExtractedData } from '../../pages/ai-extraction/types';

export interface DocumentFormProps {
  data: ExtractedData;
  onChange: (field: string, value: string) => void;
  type: DocumentType;
  onSave?: () => void;
  isSaving?: boolean;
}

/**
 * Componente de formulario de documentos que replica exactamente
 * el diseño y campos de AI Studio BillingModule
 */
export const DocumentForm: React.FC<DocumentFormProps> = ({ 
  data, 
  onChange, 
  type, 
  onSave,
  isSaving = false 
}) => {
  const updateField = (field: string, value: string) => {
    onChange(field, value);
  };

  const renderFormFields = () => {
    switch (type) {
      case 'tickets':
        return (
          <>
            <div className="form-grid-studio">
              {/* Categoría */}
              <div>
                <label className="form-label-studio">Categoría</label>
                <select
                  className="form-select-studio"
                  value={data.category || 'Otros'}
                  onChange={(e) => updateField('category', e.target.value)}
                >
                  <option>Viajes y Dietas</option>
                  <option>Transporte</option>
                  <option>Material Oficina</option>
                  <option>Comidas</option>
                  <option>Otros</option>
                </select>
              </div>

              {/* Departamento */}
              <div>
                <label className="form-label-studio">Departamento</label>
                <select
                  className="form-select-studio"
                  value={data.department || 'Ventas'}
                  onChange={(e) => updateField('department', e.target.value)}
                >
                  <option value="Marketing">Marketing</option>
                  <option value="IT">IT</option>
                  <option value="RRHH">RRHH</option>
                  <option value="Finanzas">Finanzas</option>
                  <option value="Operaciones">Operaciones</option>
                  <option value="Ventas">Ventas</option>
                </select>
              </div>

              {/* Nombre establecimiento */}
              <div className="form-field-full">
                <label className="form-label-studio">Nombre establecimiento</label>
                <input
                  type="text"
                  className="form-input-studio"
                  value={data.establishment || ''}
                  onChange={(e) => updateField('establishment', e.target.value)}
                />
              </div>

              {/* NIF */}
              <div>
                <label className="form-label-studio">NIF</label>
                <input
                  type="text"
                  className="form-input-studio"
                  value={data.nif || ''}
                  onChange={(e) => updateField('nif', e.target.value)}
                />
              </div>

              {/* Dirección */}
              <div className="form-field-full">
                <label className="form-label-studio">Dirección</label>
                <input
                  type="text"
                  className="form-input-studio"
                  value={data.address || ''}
                  onChange={(e) => updateField('address', e.target.value)}
                />
              </div>

              {/* Código postal */}
              <div>
                <label className="form-label-studio">Código postal</label>
                <input
                  type="text"
                  className="form-input-studio"
                  value={data.zip || ''}
                  onChange={(e) => updateField('zip', e.target.value)}
                />
              </div>

              {/* Ciudad */}
              <div>
                <label className="form-label-studio">Ciudad</label>
                <input
                  type="text"
                  className="form-input-studio"
                  value={data.city || ''}
                  onChange={(e) => updateField('city', e.target.value)}
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="form-label-studio">Fecha</label>
                <input
                  type="date"
                  className="form-input-studio"
                  value={data.date || ''}
                  onChange={(e) => updateField('date', e.target.value)}
                />
              </div>

              {/* Hora */}
              <div>
                <label className="form-label-studio">Hora</label>
                <input
                  type="time"
                  className="form-input-studio"
                  value={data.time || ''}
                  onChange={(e) => updateField('time', e.target.value)}
                />
              </div>

              {/* SEPARATOR */}
              <div className="form-field-full form-separator-studio">
                <h4 className="form-section-title-studio">Desglose Económico</h4>
              </div>

              {/* Base imponible */}
              <div>
                <label className="form-label-studio">Base imponible</label>
                <input
                  type="text"
                  className="form-input-studio"
                  value={data.base || ''}
                  onChange={(e) => updateField('base', e.target.value)}
                />
              </div>

              {/* IVA */}
              <div>
                <label className="form-label-studio">IVA</label>
                <input
                  type="text"
                  className="form-input-studio"
                  value={data.vat || ''}
                  onChange={(e) => updateField('vat', e.target.value)}
                />
              </div>

              {/* Total */}
              <div className="form-field-full">
                <label className="form-label-studio">Total</label>
                <input
                  type="text"
                  className="form-input-studio form-input-total"
                  value={data.amount || ''}
                  onChange={(e) => updateField('amount', e.target.value)}
                />
              </div>
            </div>
          </>
        );

      case 'staff':
        return (
          <>
            <div className="form-grid-studio">
              <div className="form-field-full">
                <label className="form-label-studio">Empleado</label>
                <input
                  type="text"
                  className="form-input-studio"
                  value={data.employee || ''}
                  onChange={(e) => updateField('employee', e.target.value)}
                />
              </div>
              <div>
                <label className="form-label-studio">Tipo Documento</label>
                <select
                  className="form-select-studio"
                  value={data.type || 'Nómina'}
                  onChange={(e) => updateField('type', e.target.value)}
                >
                  <option>Nómina</option>
                  <option>Contrato</option>
                  <option>Baja Médica</option>
                  <option>Otros</option>
                </select>
              </div>
              <div>
                <label className="form-label-studio">Periodo</label>
                <input
                  type="month"
                  className="form-input-studio"
                  value={data.period || ''}
                  onChange={(e) => updateField('period', e.target.value)}
                />
              </div>
              <div>
                <label className="form-label-studio">Importe Neto</label>
                <input
                  type="text"
                  className="form-input-studio"
                  value={data.net || ''}
                  onChange={(e) => updateField('net', e.target.value)}
                />
              </div>
              <div>
                <label className="form-label-studio">Seguridad Social</label>
                <input
                  type="text"
                  className="form-input-studio"
                  value={data.ss || ''}
                  onChange={(e) => updateField('ss', e.target.value)}
                />
              </div>
            </div>
          </>
        );

      case 'invoices':
      default:
        return (
          <>
            <div className="form-grid-studio">
              {/* Procedencia */}
              <div>
                <label className="form-label-studio">Procedencia</label>
                <select
                  className="form-select-studio"
                  value={data.origin || 'national'}
                  onChange={(e) => updateField('origin', e.target.value)}
                >
                  <option value="national">Nacional</option>
                  <option value="foreign">Extranjera</option>
                </select>
              </div>

              {/* Departamento */}
              <div>
                <label className="form-label-studio">Departamento</label>
                <select
                  className="form-select-studio"
                  value={data.department || 'IT'}
                  onChange={(e) => updateField('department', e.target.value)}
                >
                  <option value="Marketing">Marketing</option>
                  <option value="IT">IT</option>
                  <option value="RRHH">RRHH</option>
                  <option value="Finanzas">Finanzas</option>
                  <option value="Operaciones">Operaciones</option>
                  <option value="Ventas">Ventas</option>
                </select>
              </div>

              {/* Tipo de Gasto */}
              <div>
                <label className="form-label-studio">Tipo de Gasto</label>
                <select
                  className="form-select-studio"
                  value={data.expenseType || 'Licencias Software'}
                  onChange={(e) => updateField('expenseType', e.target.value)}
                >
                  <option value="Licencias Software">Licencias Software</option>
                  <option value="Consultoría">Consultoría</option>
                  <option value="Material Oficina">Material Oficina</option>
                  <option value="Servicios Profesionales">Servicios Profesionales</option>
                  <option value="Viajes y Dietas">Viajes y Dietas</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              {/* Fecha Emisión */}
              <div>
                <label className="form-label-studio">Fecha Emisión</label>
                <input
                  type="date"
                  className="form-input-studio"
                  value={data.issueDate || ''}
                  onChange={(e) => updateField('issueDate', e.target.value)}
                />
              </div>

              {/* Proveedor */}
              <div className="form-field-full">
                <label className="form-label-studio">Proveedor</label>
                <input
                  type="text"
                  className="form-input-studio"
                  value={data.supplier || ''}
                  onChange={(e) => updateField('supplier', e.target.value)}
                />
              </div>

              {/* CIF/NIF or VAT based on origin */}
              <div>
                <label className="form-label-studio">
                  {data.origin === 'foreign' ? 'VAT ID' : 'NIF / CIF'}
                </label>
                <input
                  type="text"
                  className="form-input-studio"
                  value={
                    data.origin === 'foreign'
                      ? data.vatId || ''
                      : data.cif || ''
                  }
                  onChange={(e) =>
                    updateField(data.origin === 'foreign' ? 'vatId' : 'cif', e.target.value)
                  }
                />
              </div>

              {/* Número Factura */}
              <div>
                <label className="form-label-studio">Número Factura</label>
                <input
                  type="text"
                  className="form-input-studio"
                  value={data.invoiceNum || ''}
                  onChange={(e) => updateField('invoiceNum', e.target.value)}
                />
              </div>

              {/* Concepto */}
              <div className="form-field-full">
                <label className="form-label-studio">Concepto</label>
                <input
                  type="text"
                  className="form-input-studio"
                  value={data.concept || ''}
                  onChange={(e) => updateField('concept', e.target.value)}
                />
              </div>

              {/* SEPARATOR */}
              <div className="form-field-full form-separator-studio">
                <h4 className="form-section-title-studio">Desglose Económico</h4>
              </div>

              {/* Base Imponible */}
              <div>
                <label className="form-label-studio">Base Imponible</label>
                <input
                  type="text"
                  className="form-input-studio"
                  value={data.base || ''}
                  onChange={(e) => updateField('base', e.target.value)}
                />
              </div>

              {/* Tipo de Moneda */}
              <div>
                <label className="form-label-studio">Tipo de Moneda</label>
                <select
                  className="form-select-studio"
                  value={data.currency || 'EUR'}
                  onChange={(e) => updateField('currency', e.target.value)}
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>

              {/* IVA */}
              <div>
                <label className="form-label-studio">IVA</label>
                <input
                  type="text"
                  className="form-input-studio"
                  value={data.vat || ''}
                  onChange={(e) => updateField('vat', e.target.value)}
                />
              </div>

              {/* Total Factura */}
              <div>
                <label className="form-label-studio">Total Factura</label>
                <input
                  type="text"
                  className="form-input-studio form-input-total"
                  value={data.total || ''}
                  onChange={(e) => updateField('total', e.target.value)}
                />
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <form className="studio-form" aria-label="Formulario del documento">
      <div className="studio-form-header">
        <div className="studio-form-title">Revisión y edición</div>
        <div className="studio-form-subtitle">
          Ajusta los datos extraídos antes de continuar.
        </div>
      </div>

      {renderFormFields()}

      {onSave && (
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {isSaving ? 'Guardando...' : 'Validar y Archivar'}
          </button>
        </div>
      )}
    </form>
  );
};

