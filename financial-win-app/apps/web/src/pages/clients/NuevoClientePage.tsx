import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout';
import { useToast } from '../../contexts/ToastContext';
import { Cliente } from '../../features/entities/types';

const STORAGE_KEY = 'zaffra_clients';

interface SeccionInfo {
  id: string;
  titulo: string;
  icono: string;
}

const SECCIONES: SeccionInfo[] = [
  { id: 'datos-empresa', titulo: 'Datos de la Empresa', icono: 'domain' },
  { id: 'informacion-contable', titulo: 'Información Contable', icono: 'account_balance' },
  { id: 'datos-contacto', titulo: 'Datos de Contacto', icono: 'group' },
  { id: 'informacion-comercial', titulo: 'Información Comercial', icono: 'storefront' },
  { id: 'facturacion', titulo: 'Facturación', icono: 'receipt' },
  { id: 'otra-informacion', titulo: 'Otra Información', icono: 'info' },
  { id: 'notas', titulo: 'Notas', icono: 'sticky_note_2' },
];

export const NuevoClientePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [seccionActiva, setSeccionActiva] = useState<string>(SECCIONES[0].id);
  const seccionesRefs = useRef<Record<string, HTMLElement | null>>({});
  const [formData, setFormData] = useState<Partial<Cliente>>({});
  const [shouldNavigateAfterSave, setShouldNavigateAfterSave] = useState<
    'nuevo' | 'salir' | null
  >(null);

  // Scroll to top cuando se monta el componente
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const scrollASeccion = (seccionId: string) => {
    const elemento = seccionesRefs.current[seccionId];
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setSeccionActiva(seccionId);
    }
  };

  const handleCancelar = () => {
    navigate('/clientes/lista');
  };

  const handleInputChange = (field: keyof Cliente, value: string | number | string[] | undefined) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGuardar = () => {
    // Validar campos requeridos
    if (!formData.nif || !formData.razonSocial) {
      showToast('Por favor, completa los campos obligatorios (NIF y Razón Social)', 'error');
      return;
    }

    try {
      // Obtener clientes existentes del localStorage
      const existingData = localStorage.getItem(STORAGE_KEY);
      const clientes: Cliente[] = existingData ? JSON.parse(existingData) : [];

      // Generar ID único si no existe
      const nuevoCliente: Cliente = {
        ...formData,
        id: formData.id || `cliente-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: formData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Cliente;

      // Agregar el nuevo cliente
      clientes.push(nuevoCliente);

      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clientes));

      showToast('Cliente guardado correctamente', 'success');

      // Navegar según la acción seleccionada
      if (shouldNavigateAfterSave === 'nuevo') {
        // Limpiar el formulario recargando la página
        window.location.href = '/clientes/nuevo';
      } else if (shouldNavigateAfterSave === 'salir') {
        navigate('/clientes/lista');
      }
      setShouldNavigateAfterSave(null);
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      showToast('Error al guardar el cliente', 'error');
    }
  };

  const handleGuardarYNuevo = () => {
    setShouldNavigateAfterSave('nuevo');
    handleGuardar();
  };

  const handleGuardarYSalir = () => {
    setShouldNavigateAfterSave('salir');
    handleGuardar();
  };

  const handleVolver = () => {
    navigate('/clientes/lista');
  };

  return (
    <div className="cliente-page-container">
      <PageHeader
        title="Nuevo Cliente"
        showBackButton={true}
        onBack={handleVolver}
      />
      <div className="cliente-page-layout">
        {/* Sidebar de Navegación */}
        <aside className="cliente-sidebar">
          <div className="cliente-sidebar-header">
            <h2 className="cliente-sidebar-title">Nuevo Cliente</h2>
          </div>
          <nav className="cliente-sidebar-nav">
            {SECCIONES.map((seccion) => (
              <div
                key={seccion.id}
                className={
                  seccionActiva === seccion.id
                    ? 'cliente-nav-item-active'
                    : 'cliente-nav-item-inactive'
                }
                onClick={() => scrollASeccion(seccion.id)}
              >
                <span className="material-symbols-outlined cliente-nav-icon">
                  {seccion.icono}
                </span>
                <span>{seccion.titulo}</span>
              </div>
            ))}
          </nav>
        </aside>

        {/* Contenido Principal */}
        <main className="cliente-content">
          <div className="cliente-content-inner">
            {/* Sección: Datos de la Empresa */}
            <section
              ref={(el) => {
                seccionesRefs.current['datos-empresa'] = el;
              }}
              id="datos-empresa"
              className="form-section"
            >
              <div className="form-section-header">
                <span className="material-symbols-outlined form-section-icon">domain</span>
                <h3 className="form-section-title">Datos de la Empresa</h3>
              </div>
              <div className="form-grid-2">
                <div className="input-group">
                  <label htmlFor="nif" className="input-group-label-required">
                    NIF
                  </label>
                  <input
                    type="text"
                    id="nif"
                    className="input-group-input"
                    placeholder="B12345678"
                    value={formData.nif || ''}
                    onChange={(e) => handleInputChange('nif', e.target.value)}
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
                    placeholder="Nombre de la empresa"
                    value={formData.razonSocial || ''}
                    onChange={(e) => handleInputChange('razonSocial', e.target.value)}
                  />
                </div>
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
                  <label htmlFor="codigo-postal" className="input-group-label">
                    Código Postal
                  </label>
                  <input
                    type="text"
                    id="codigo-postal"
                    className="input-group-input"
                    placeholder="28001"
                    value={formData.codigoPostal || ''}
                    onChange={(e) => handleInputChange('codigoPostal', e.target.value)}
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
                  <label htmlFor="provincia" className="input-group-label">
                    Provincia
                  </label>
                  <input
                    type="text"
                    id="provincia"
                    className="input-group-input"
                    placeholder="Madrid"
                    value={formData.provincia || ''}
                    onChange={(e) => handleInputChange('provincia', e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="pais" className="input-group-label">
                    País
                  </label>
                  <input
                    type="text"
                    id="pais"
                    className="input-group-input"
                    placeholder="España"
                    value={formData.pais || ''}
                    onChange={(e) => handleInputChange('pais', e.target.value)}
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
                  <label htmlFor="email" className="input-group-label">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="input-group-input"
                    placeholder="empresa@ejemplo.com"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
                <div className="input-group form-grid-full">
                  <label className="input-group-label">Logo</label>
                  <div className="logo-upload">
                    <span className="material-symbols-outlined logo-upload-icon">camera_alt</span>
                    <span className="logo-upload-text">Sube el logotipo</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Sección: Información Contable */}
            <section
              ref={(el) => {
                seccionesRefs.current['informacion-contable'] = el;
              }}
              id="informacion-contable"
              className="form-section"
            >
              <div className="form-section-header">
                <span className="material-symbols-outlined form-section-icon">account_balance</span>
                <h3 className="form-section-title">Información Contable</h3>
              </div>
              <div className="form-grid-2">
                <div className="input-group">
                  <label htmlFor="cuenta-contable" className="input-group-label">
                    Cuenta Contable
                  </label>
                  <select
                    id="cuenta-contable"
                    className="input-group-select"
                    value={formData.cuentaContable || ''}
                    onChange={(e) => handleInputChange('cuentaContable', e.target.value)}
                  >
                    <option value="">Seleccionar cuenta</option>
                    <option value="430">430 - Clientes</option>
                    <option value="431">431 - Clientes con factura</option>
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="contrapartida" className="input-group-label">
                    Contrapartida
                  </label>
                  <select
                    id="contrapartida"
                    className="input-group-select"
                    value={formData.contrapartida || ''}
                    onChange={(e) => handleInputChange('contrapartida', e.target.value)}
                  >
                    <option value="">Seleccionar contrapartida</option>
                    <option value="700">700 - Ventas</option>
                    <option value="701">701 - Ventas de productos</option>
                  </select>
                </div>
                <div className="input-group form-grid-full">
                  <label htmlFor="clave-operacion-347" className="input-group-label">
                    Clave de Operación (347)
                  </label>
                  <select
                    id="clave-operacion-347"
                    className="input-group-select"
                    value={formData.claveOperacion347 || ''}
                    onChange={(e) => handleInputChange('claveOperacion347', e.target.value)}
                  >
                    <option value="">Seleccionar clave</option>
                    <option value="A">A - Operaciones interiores</option>
                    <option value="B">B - Adquisiciones intracomunitarias</option>
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="id-contable-a3" className="input-group-label">
                    ID Contable A3
                  </label>
                  <input
                    type="text"
                    id="id-contable-a3"
                    className="input-group-input"
                    placeholder="ID Contable A3"
                    value={formData.idContableA3 || ''}
                    onChange={(e) => handleInputChange('idContableA3', e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="actividad-a3" className="input-group-label">
                    Actividad A3
                  </label>
                  <input
                    type="text"
                    id="actividad-a3"
                    className="input-group-input"
                    placeholder="Actividad A3"
                    value={formData.actividadA3 || ''}
                    onChange={(e) => handleInputChange('actividadA3', e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="serie-a3" className="input-group-label">
                    Serie A3
                  </label>
                  <input
                    type="text"
                    id="serie-a3"
                    className="input-group-input"
                    placeholder="Serie A3"
                    value={formData.serieA3 || ''}
                    onChange={(e) => handleInputChange('serieA3', e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Sección: Datos de Contacto */}
            <section
              ref={(el) => {
                seccionesRefs.current['datos-contacto'] = el;
              }}
              id="datos-contacto"
              className="form-section"
            >
              <div className="form-section-header">
                <span className="material-symbols-outlined form-section-icon">group</span>
                <h3 className="form-section-title">Datos de Contacto</h3>
              </div>
              <div className="form-grid-2">
                <div className="input-group">
                  <label htmlFor="contacto-nombre" className="input-group-label">
                    Nombre
                  </label>
                  <input
                    type="text"
                    id="contacto-nombre"
                    className="input-group-input"
                    placeholder="Nombre del contacto"
                    value={formData.contactoNombre || ''}
                    onChange={(e) => handleInputChange('contactoNombre', e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="contacto-apellidos" className="input-group-label">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    id="contacto-apellidos"
                    className="input-group-input"
                    placeholder="Apellidos del contacto"
                    value={formData.contactoApellidos || ''}
                    onChange={(e) => handleInputChange('contactoApellidos', e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="contacto-cargo" className="input-group-label">
                    Cargo
                  </label>
                  <input
                    type="text"
                    id="contacto-cargo"
                    className="input-group-input"
                    placeholder="Director, Gerente..."
                    value={formData.contactoCargo || ''}
                    onChange={(e) => handleInputChange('contactoCargo', e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="contacto-telefono" className="input-group-label">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="contacto-telefono"
                    className="input-group-input"
                    placeholder="+34 600 000 000"
                    value={formData.contactoTelefono || ''}
                    onChange={(e) => handleInputChange('contactoTelefono', e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="contacto-email" className="input-group-label">
                    Email
                  </label>
                  <input
                    type="email"
                    id="contacto-email"
                    className="input-group-input"
                    placeholder="contacto@ejemplo.com"
                    value={formData.contactoEmail || ''}
                    onChange={(e) => handleInputChange('contactoEmail', e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Sección: Información Comercial */}
            <section
              ref={(el) => {
                seccionesRefs.current['informacion-comercial'] = el;
              }}
              id="informacion-comercial"
              className="form-section"
            >
              <div className="form-section-header">
                <span className="material-symbols-outlined form-section-icon">storefront</span>
                <h3 className="form-section-title">Información Comercial</h3>
              </div>
              <div className="form-grid-2">
                <div className="input-group">
                  <label htmlFor="descuento" className="input-group-label">
                    Descuento (%)
                  </label>
                  <input
                    type="number"
                    id="descuento"
                    className="input-group-input"
                    placeholder="0"
                    min="0"
                    max="100"
                    value={formData.descuento || ''}
                    onChange={(e) => handleInputChange('descuento', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="forma-pago-default" className="input-group-label">
                    Forma de Pago por Defecto
                  </label>
                  <select
                    id="forma-pago-default"
                    className="input-group-select"
                    value={formData.formaPagoDefault || ''}
                    onChange={(e) => handleInputChange('formaPagoDefault', e.target.value)}
                  >
                    <option value="">Seleccionar</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="recibo">Recibo</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="dia-pago" className="input-group-label">
                    Día de Pago
                  </label>
                  <input
                    type="number"
                    id="dia-pago"
                    className="input-group-input"
                    placeholder="1-31"
                    min="1"
                    max="31"
                    value={formData.diaPago || ''}
                    onChange={(e) => handleInputChange('diaPago', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="limite-credito" className="input-group-label">
                    Límite de Crédito (€)
                  </label>
                  <input
                    type="number"
                    id="limite-credito"
                    className="input-group-input"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={formData.limiteCredito || ''}
                    onChange={(e) => handleInputChange('limiteCredito', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </div>
            </section>

            {/* Sección: Facturación */}
            <section
              ref={(el) => {
                seccionesRefs.current['facturacion'] = el;
              }}
              id="facturacion"
              className="form-section"
            >
              <div className="form-section-header">
                <span className="material-symbols-outlined form-section-icon">receipt</span>
                <h3 className="form-section-title">Facturación</h3>
              </div>
              <div className="form-grid-2">
                <div className="input-group form-grid-full">
                  <label className="input-group-label">Formas de Pago Aceptadas</label>
                  <div className="form-checkbox-container">
                    <div className="form-checkbox-group">
                      <input
                        type="checkbox"
                        id="forma-transferencia"
                        className="form-checkbox"
                        checked={formData.formasPagoAceptadas?.includes('transferencia') || false}
                        onChange={(e) => {
                          const formasPago = formData.formasPagoAceptadas || [];
                          if (e.target.checked) {
                            handleInputChange('formasPagoAceptadas', [...formasPago, 'transferencia']);
                          } else {
                            handleInputChange('formasPagoAceptadas', formasPago.filter((f) => f !== 'transferencia'));
                          }
                        }}
                      />
                      <label htmlFor="forma-transferencia" className="form-checkbox-label">
                        Transferencia
                      </label>
                    </div>
                    <div className="form-checkbox-group">
                      <input
                        type="checkbox"
                        id="forma-recibo"
                        className="form-checkbox"
                        checked={formData.formasPagoAceptadas?.includes('recibo') || false}
                        onChange={(e) => {
                          const formasPago = formData.formasPagoAceptadas || [];
                          if (e.target.checked) {
                            handleInputChange('formasPagoAceptadas', [...formasPago, 'recibo']);
                          } else {
                            handleInputChange('formasPagoAceptadas', formasPago.filter((f) => f !== 'recibo'));
                          }
                        }}
                      />
                      <label htmlFor="forma-recibo" className="form-checkbox-label">
                        Recibo
                      </label>
                    </div>
                    <div className="form-checkbox-group">
                      <input
                        type="checkbox"
                        id="forma-efectivo"
                        className="form-checkbox"
                        checked={formData.formasPagoAceptadas?.includes('efectivo') || false}
                        onChange={(e) => {
                          const formasPago = formData.formasPagoAceptadas || [];
                          if (e.target.checked) {
                            handleInputChange('formasPagoAceptadas', [...formasPago, 'efectivo']);
                          } else {
                            handleInputChange('formasPagoAceptadas', formasPago.filter((f) => f !== 'efectivo'));
                          }
                        }}
                      />
                      <label htmlFor="forma-efectivo" className="form-checkbox-label">
                        Efectivo
                      </label>
                    </div>
                    <div className="form-checkbox-group">
                      <input
                        type="checkbox"
                        id="forma-tarjeta"
                        className="form-checkbox"
                        checked={formData.formasPagoAceptadas?.includes('tarjeta') || false}
                        onChange={(e) => {
                          const formasPago = formData.formasPagoAceptadas || [];
                          if (e.target.checked) {
                            handleInputChange('formasPagoAceptadas', [...formasPago, 'tarjeta']);
                          } else {
                            handleInputChange('formasPagoAceptadas', formasPago.filter((f) => f !== 'tarjeta'));
                          }
                        }}
                      />
                      <label htmlFor="forma-tarjeta" className="form-checkbox-label">
                        Tarjeta
                      </label>
                    </div>
                  </div>
                </div>
                <div className="input-group">
                  <label htmlFor="plazo-pago" className="input-group-label">
                    Plazo de Pago (días)
                  </label>
                  <input
                    type="number"
                    id="plazo-pago"
                    className="input-group-input"
                    placeholder="30"
                    min="0"
                    value={formData.plazoPago || ''}
                    onChange={(e) => handleInputChange('plazoPago', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="retencion-irpf" className="input-group-label">
                    Retención IRPF (%)
                  </label>
                  <input
                    type="number"
                    id="retencion-irpf"
                    className="input-group-input"
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.retencionIRPF || ''}
                    onChange={(e) => handleInputChange('retencionIRPF', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </div>
            </section>

            {/* Sección: Otra Información */}
            <section
              ref={(el) => {
                seccionesRefs.current['otra-informacion'] = el;
              }}
              id="otra-informacion"
              className="form-section"
            >
              <div className="form-section-header">
                <span className="material-symbols-outlined form-section-icon">info</span>
                <h3 className="form-section-title">Otra Información</h3>
              </div>
              <div className="form-grid-2">
                <div className="input-group">
                  <label htmlFor="web" className="input-group-label">
                    Página Web
                  </label>
                  <input
                    type="url"
                    id="web"
                    className="input-group-input"
                    placeholder="https://www.ejemplo.com"
                    value={formData.web || ''}
                    onChange={(e) => handleInputChange('web', e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="numero-empleados" className="input-group-label">
                    Número de Empleados
                  </label>
                  <input
                    type="number"
                    id="numero-empleados"
                    className="input-group-input"
                    placeholder="0"
                    min="0"
                    value={formData.numeroEmpleados || ''}
                    onChange={(e) => handleInputChange('numeroEmpleados', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="sector" className="input-group-label">
                    Sector
                  </label>
                  <select
                    id="sector"
                    className="input-group-select"
                    value={formData.sector || ''}
                    onChange={(e) => handleInputChange('sector', e.target.value)}
                  >
                    <option value="">Seleccionar sector</option>
                    <option value="tecnologia">Tecnología</option>
                    <option value="comercio">Comercio</option>
                    <option value="servicios">Servicios</option>
                    <option value="industria">Industria</option>
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="fecha-alta" className="input-group-label">
                    Fecha de Alta
                  </label>
                  <input
                    type="date"
                    id="fecha-alta"
                    className="input-group-input"
                    value={formData.fechaAlta || ''}
                    onChange={(e) => handleInputChange('fechaAlta', e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Sección: Notas */}
            <section
              ref={(el) => {
                seccionesRefs.current['notas'] = el;
              }}
              id="notas"
              className="form-section"
            >
              <div className="form-section-header">
                <span className="material-symbols-outlined form-section-icon">sticky_note_2</span>
                <h3 className="form-section-title">Notas</h3>
              </div>
              <div className="form-grid-2">
                <div className="input-group form-grid-full">
                  <label htmlFor="notas" className="input-group-label">
                    Notas Internas
                  </label>
                  <textarea
                    id="notas"
                    className="input-group-textarea"
                    placeholder="Información adicional sobre el cliente..."
                    rows={6}
                    value={formData.notas || ''}
                    onChange={(e) => handleInputChange('notas', e.target.value)}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Action Bar - Barra de Botones */}
          <div className="action-bar">
            <button
              type="button"
              onClick={handleCancelar}
              className="btn btn-outline btn-md"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGuardarYNuevo}
              className="btn btn-secondary btn-md"
            >
              Guardar y Nuevo
            </button>
            <button
              type="button"
              onClick={handleGuardarYSalir}
              className="btn btn-primary btn-md"
            >
              Guardar y Salir
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};