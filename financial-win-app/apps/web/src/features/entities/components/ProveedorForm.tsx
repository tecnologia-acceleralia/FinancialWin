import React, { useState, forwardRef } from 'react';
import {
  Proveedor,
  CategoriaProveedor,
  FormaPago,
  PlazoPago,
  Pais,
  ContactoProveedor,
} from '../types';

interface ProveedorFormProps {
  initialData?: Partial<Proveedor>;
  onSubmit?: (data: Proveedor) => void;
  onCancel?: () => void;
  seccionesRefs?: React.MutableRefObject<Record<string, HTMLElement | null>>;
}

export const ProveedorForm = forwardRef<HTMLFormElement, ProveedorFormProps>(
  ({ initialData, onSubmit, onCancel, seccionesRefs }, ref) => {
  const [formData, setFormData] = useState<Partial<Proveedor>>({
    categoria: 'Proveedor Externo',
    nombreComercial: '',
    razonSocial: '',
    cif: '',
    sector: '',
    ordersEmail: '',
    telefono: '',
    web: '',
    direccion: '',
    ciudad: '',
    zip: '',
    pais: 'España',
    iban: '',
    formaPago: 'Transferencia',
    plazoPago: 'Contado',
    contactos: [],
    notasInternas: '',
    ...initialData,
  });

  const [contactos, setContactos] = useState<ContactoProveedor[]>(
    formData.contactos || []
  );

  const handleInputChange = (
    field: keyof Proveedor,
    value: string | CategoriaProveedor | FormaPago | PlazoPago | Pais
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleContactoChange = (
    index: number,
    field: keyof ContactoProveedor,
    value: string
  ) => {
    const nuevosContactos = [...contactos];
    nuevosContactos[index] = {
      ...nuevosContactos[index],
      [field]: value,
    };
    setContactos(nuevosContactos);
    setFormData((prev) => ({
      ...prev,
      contactos: nuevosContactos,
    }));
  };

  const handleAgregarContacto = () => {
    const nuevoContacto: ContactoProveedor = {
      nombre: '',
      cargo: '',
      email: '',
      telefono: '',
    };
    setContactos([...contactos, nuevoContacto]);
  };

  const handleEliminarContacto = (index: number) => {
    const nuevosContactos = contactos.filter((_, i) => i !== index);
    setContactos(nuevosContactos);
    setFormData((prev) => ({
      ...prev,
      contactos: nuevosContactos,
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        ...formData,
        contactos,
      } as Proveedor);
    }
  };

  return (
    <form ref={ref} onSubmit={handleFormSubmit} className="proveedor-form">
      {/* Sección: Datos Generales */}
      <section
        ref={(el) => {
          if (seccionesRefs) {
            seccionesRefs.current['datos-generales'] = el;
          }
        }}
        id="datos-generales"
        className="form-section"
      >
        <div className="form-section-header">
          <span className="material-symbols-outlined form-section-icon">
            business
          </span>
          <h3 className="form-section-title">Datos Generales</h3>
        </div>
        <div className="form-grid-2">
          <div className="input-group">
            <label htmlFor="categoria" className="input-group-label-required">
              Categoría
            </label>
            <select
              id="categoria"
              className="input-group-select"
              value={formData.categoria || 'Proveedor Externo'}
              onChange={(e) =>
                handleInputChange('categoria', e.target.value as CategoriaProveedor)
              }
            >
              <option value="Proveedor Externo">Proveedor Externo</option>
              <option value="Staff Interno">Staff Interno</option>
              <option value="Licencias">Licencias</option>
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="nombre-comercial" className="input-group-label-required">
              Nombre Comercial
            </label>
            <input
              type="text"
              id="nombre-comercial"
              className="input-group-input"
              placeholder="Nombre comercial"
              value={formData.nombreComercial || ''}
              onChange={(e) => handleInputChange('nombreComercial', e.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="razon-social" className="input-group-label-required">
              Razón Social
            </label>
            <input
              type="text"
              id="razon-social"
              className="input-group-input"
              placeholder="Razón social"
              value={formData.razonSocial || ''}
              onChange={(e) => handleInputChange('razonSocial', e.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="cif" className="input-group-label-required">
              CIF
            </label>
            <input
              type="text"
              id="cif"
              className="input-group-input"
              placeholder="B12345678"
              value={formData.cif || ''}
              onChange={(e) => handleInputChange('cif', e.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="sector" className="input-group-label">
              Sector
            </label>
            <input
              type="text"
              id="sector"
              className="input-group-input"
              placeholder="Sector de actividad"
              value={formData.sector || ''}
              onChange={(e) => handleInputChange('sector', e.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="orders-email" className="input-group-label">
              Orders Email
            </label>
            <input
              type="email"
              id="orders-email"
              className="input-group-input"
              placeholder="orders@proveedor.com"
              value={formData.ordersEmail || ''}
              onChange={(e) => handleInputChange('ordersEmail', e.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="telefono" className="input-group-label">
              Teléfono
            </label>
            <input
              type="tel"
              id="telefono"
              className="input-group-input"
              placeholder="+34 600 000 000"
              value={formData.telefono || ''}
              onChange={(e) => handleInputChange('telefono', e.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="web" className="input-group-label">
              Web
            </label>
            <input
              type="url"
              id="web"
              className="input-group-input"
              placeholder="https://www.proveedor.com"
              value={formData.web || ''}
              onChange={(e) => handleInputChange('web', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Sección: Dirección y Facturación */}
      <section
        ref={(el) => {
          if (seccionesRefs) {
            seccionesRefs.current['direccion-facturacion'] = el;
          }
        }}
        id="direccion-facturacion"
        className="form-section"
      >
        <div className="form-section-header">
          <span className="material-symbols-outlined form-section-icon">location_on</span>
          <h3 className="form-section-title">Dirección y Facturación</h3>
        </div>

        {/* Bloque: Dirección */}
        <div className="form-section-block">
          <h4 className="form-section-block-title">Dirección</h4>
          <div className="form-grid-2">
            <div className="input-group form-grid-full">
              <label htmlFor="direccion" className="input-group-label">
                Dirección
              </label>
              <input
                type="text"
                id="direccion"
                className="input-group-input"
                placeholder="Calle, número, piso..."
                value={formData.direccion || ''}
                onChange={(e) => handleInputChange('direccion', e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="ciudad" className="input-group-label">
                Ciudad
              </label>
              <input
                type="text"
                id="ciudad"
                className="input-group-input"
                placeholder="Madrid"
                value={formData.ciudad || ''}
                onChange={(e) => handleInputChange('ciudad', e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="zip" className="input-group-label">
                ZIP
              </label>
              <input
                type="text"
                id="zip"
                className="input-group-input"
                placeholder="28001"
                value={formData.zip || ''}
                onChange={(e) => handleInputChange('zip', e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="pais" className="input-group-label">
                País
              </label>
              <select
                id="pais"
                className="input-group-select"
                value={formData.pais || 'España'}
                onChange={(e) => handleInputChange('pais', e.target.value as Pais)}
              >
                <option value="España">España</option>
                <option value="Reino Unido">Reino Unido</option>
                <option value="Francia">Francia</option>
                <option value="Portugal">Portugal</option>
                <option value="Estados Unidos">Estados Unidos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bloque: Bank Data & Payment */}
        <div className="form-section-block">
          <h4 className="form-section-block-title">Bank Data & Payment</h4>
          <div className="form-grid-2">
            <div className="input-group form-grid-full">
              <label htmlFor="iban" className="input-group-label">
                IBAN
              </label>
              <input
                type="text"
                id="iban"
                className="input-group-input"
                placeholder="ES91 2100 0418 4502 0005 1332"
                value={formData.iban || ''}
                onChange={(e) => handleInputChange('iban', e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="forma-pago" className="input-group-label">
                Forma de Pago Habitual
              </label>
              <select
                id="forma-pago"
                className="input-group-select"
                value={formData.formaPago || 'Transferencia'}
                onChange={(e) =>
                  handleInputChange('formaPago', e.target.value as FormaPago)
                }
              >
                <option value="Transferencia">Transferencia</option>
                <option value="Recibo">Recibo</option>
                <option value="Tarjeta">Tarjeta</option>
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="plazo-pago" className="input-group-label">
                Plazo de Pago
              </label>
              <select
                id="plazo-pago"
                className="input-group-select"
                value={formData.plazoPago || 'Contado'}
                onChange={(e) =>
                  handleInputChange('plazoPago', e.target.value as PlazoPago)
                }
              >
                <option value="Contado">Contado</option>
                <option value="30 días">30 días</option>
                <option value="60 días">60 días</option>
              </select>
            </div>
          </div>
        </div>

      </section>

      {/* Sección: Contactos */}
      <section
        ref={(el) => {
          if (seccionesRefs) {
            seccionesRefs.current['contactos'] = el;
          }
        }}
        id="contactos"
        className="form-section"
      >
        <div className="form-section-header">
          <span className="material-symbols-outlined form-section-icon">contacts</span>
          <h3 className="form-section-title">Contactos</h3>
        </div>
        {contactos.length === 0 ? (
          <div className="contactos-empty-state">
            <p className="contactos-empty-text">
              Aún no has añadido contactos. Añade personas clave para la gestión.
            </p>
            <button
              type="button"
              onClick={handleAgregarContacto}
              className="btn btn-primary btn-sm"
            >
              <span className="material-symbols-outlined">add</span>
              Añadir Fila
            </button>
          </div>
        ) : (
          <div className="contactos-table-container">
            <table className="contactos-table">
              <thead>
                <tr>
                  <th className="contactos-table-header">Nombre</th>
                  <th className="contactos-table-header">Cargo</th>
                  <th className="contactos-table-header">Email</th>
                  <th className="contactos-table-header">Teléfono</th>
                  <th className="contactos-table-header">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {contactos.map((contacto, index) => (
                  <tr key={index} className="contactos-table-row">
                    <td>
                      <input
                        type="text"
                        className="input-group-input"
                        placeholder="Nombre"
                        value={contacto.nombre || ''}
                        onChange={(e) =>
                          handleContactoChange(index, 'nombre', e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="input-group-input"
                        placeholder="Cargo"
                        value={contacto.cargo || ''}
                        onChange={(e) =>
                          handleContactoChange(index, 'cargo', e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="email"
                        className="input-group-input"
                        placeholder="email@ejemplo.com"
                        value={contacto.email || ''}
                        onChange={(e) =>
                          handleContactoChange(index, 'email', e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="tel"
                        className="input-group-input"
                        placeholder="+34 600 000 000"
                        value={contacto.telefono || ''}
                        onChange={(e) =>
                          handleContactoChange(index, 'telefono', e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleEliminarContacto(index)}
                        className="btn btn-danger btn-sm"
                        aria-label="Eliminar contacto"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              onClick={handleAgregarContacto}
              className="btn btn-secondary btn-sm mt-4"
            >
              <span className="material-symbols-outlined">add</span>
              Añadir Fila
            </button>
          </div>
        )}
      </section>

      {/* Sección: Notas Internas */}
      <section
        ref={(el) => {
          if (seccionesRefs) {
            seccionesRefs.current['notas'] = el;
          }
        }}
        id="notas"
        className="form-section"
      >
        <div className="form-section-header">
          <span className="material-symbols-outlined form-section-icon">
            sticky_note_2
          </span>
          <h3 className="form-section-title">Notas Internas</h3>
        </div>
        <div className="form-grid-2">
          <div className="input-group form-grid-full">
            <label htmlFor="notas-internas" className="input-group-label">
              Notas
            </label>
            <textarea
              id="notas-internas"
              className="input-group-textarea"
              placeholder="Información adicional sobre el proveedor..."
              rows={6}
              value={formData.notasInternas || ''}
              onChange={(e) => handleInputChange('notasInternas', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Botones de Acción */}
      <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-[#e5e5e5] dark:border-[#2A3B5A]">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="btn btn-primary"
        >
          Guardar Cambios
        </button>
      </div>
    </form>
  );
  }
);

ProveedorForm.displayName = 'ProveedorForm';
