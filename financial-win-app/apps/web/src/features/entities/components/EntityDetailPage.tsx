import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PageHeader, type PageHeaderAction } from '@/components/layout';
import { StatusBadge } from '@/components/ui';
import { formatDateForDisplay } from '@/utils/dateUtils';

/**
 * Tipos para la entidad (Cliente o Proveedor)
 */
type EntityType = 'cliente' | 'proveedor';

/**
 * Estado de factura
 */
type InvoiceStatus = 'pagada' | 'pendiente' | 'vencida' | 'cancelada';

/**
 * Estado de la entidad
 */
type EntityStatus = 'activo' | 'pendiente' | 'inactivo';

/**
 * Interfaz para factura
 */
interface Invoice {
  id: string;
  numero: string;
  fecha: string;
  concepto: string;
  base: number;
  iva: number;
  total: number;
  estado: InvoiceStatus;
}

/**
 * Interfaz para contacto
 */
interface Contact {
  id: string;
  nombre: string;
  cargo: string;
  email: string;
  telefono: string;
}

/**
 * Interfaz para datos de la entidad
 */
interface EntityData {
  id: string;
  nombre: string;
  nif: string;
  tipo: EntityType;
  status: EntityStatus;
  saldoTotal: number;
  facturasPendientes: number;
  volumenAnual: number;
  ultimaOperacion: string;
  // Datos fiscales
  direccionFiscal: {
    calle: string;
    ciudad: string;
    codigoPostal: string;
    pais: string;
  };
  notasInternas?: string;
  // Facturas
  facturas: Invoice[];
  // Contactos
  contactos: Contact[];
}

/**
 * Datos mock para pruebas
 */
const MOCK_ENTITY_DATA: EntityData = {
  id: '1',
  nombre: 'Acme Corporation S.L.',
  nif: 'B12345678',
  tipo: 'cliente',
  status: 'activo',
  saldoTotal: 45230.50,
  facturasPendientes: 3,
  volumenAnual: 245680.00,
  ultimaOperacion: '2024-01-15',
  direccionFiscal: {
    calle: 'Calle Mayor, 123',
    ciudad: 'Madrid',
    codigoPostal: '28001',
    pais: 'España',
  },
  notasInternas: 'Cliente preferente. Descuento especial del 5% aplicable.',
  facturas: [
    {
      id: 'inv-1',
      numero: 'FAC-2024-001',
      fecha: '2024-01-15',
      concepto: 'Servicios de consultoría Q1',
      base: 12000.00,
      iva: 2520.00,
      total: 14520.00,
      estado: 'pagada',
    },
    {
      id: 'inv-2',
      numero: 'FAC-2024-002',
      fecha: '2024-01-20',
      concepto: 'Desarrollo de software',
      base: 18000.00,
      iva: 3780.00,
      total: 21780.00,
      estado: 'pendiente',
    },
    {
      id: 'inv-3',
      numero: 'FAC-2024-003',
      fecha: '2024-02-01',
      concepto: 'Mantenimiento mensual',
      base: 2500.00,
      iva: 525.00,
      total: 3025.00,
      estado: 'pendiente',
    },
    {
      id: 'inv-4',
      numero: 'FAC-2023-125',
      fecha: '2023-12-10',
      concepto: 'Servicios de consultoría Q4',
      base: 10000.00,
      iva: 2100.00,
      total: 12100.00,
      estado: 'vencida',
    },
    {
      id: 'inv-5',
      numero: 'FAC-2024-004',
      fecha: '2024-02-05',
      concepto: 'Licencias de software',
      base: 5000.00,
      iva: 1050.00,
      total: 6050.00,
      estado: 'pagada',
    },
  ],
  contactos: [
    {
      id: 'contact-1',
      nombre: 'Juan Pérez',
      cargo: 'Director Financiero',
      email: 'juan.perez@acme.com',
      telefono: '+34 600 123 456',
    },
    {
      id: 'contact-2',
      nombre: 'María González',
      cargo: 'Responsable de Compras',
      email: 'maria.gonzalez@acme.com',
      telefono: '+34 600 789 012',
    },
  ],
};

/**
 * Función para formatear moneda en euros (formato español)
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

/**
 * Función para obtener las iniciales de un nombre
 */
const getInitials = (name: string): string => {
  const words = name.split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

/**
 * Componente para el badge de estado de factura
 */
const InvoiceStatusBadge: React.FC<{ status: InvoiceStatus }> = ({ status }) => {
  const statusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
    pagada: { label: 'Pagada', className: 'status-badge-activo' },
    pendiente: { label: 'Pendiente', className: 'status-badge-pendiente' },
    vencida: { label: 'Vencida', className: 'status-badge-error' },
    cancelada: { label: 'Cancelada', className: 'status-badge-inactivo' },
  };

  const config = statusConfig[status] || statusConfig.pendiente;

  return (
    <span className={config.className}>
      {config.label}
    </span>
  );
};

/**
 * Página de detalle de entidad (Cliente o Proveedor)
 */
export const EntityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extraer el tipo desde el pathname: /cliente/detalle/:id o /proveedor/detalle/:id
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const type: EntityType | undefined = pathSegments[0] === 'cliente' || pathSegments[0] === 'proveedor' 
    ? (pathSegments[0] as EntityType)
    : undefined;

  // Estado para la pestaña activa
  const [activeTab, setActiveTab] = useState<'general' | 'facturacion' | 'contactos'>('general');
  
  // Estado para el buscador de facturas
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // Por ahora usamos datos mock
  // En producción, aquí se haría un fetch con el id y type
  const entityData = MOCK_ENTITY_DATA;

  // Validar tipo de entidad
  if (type !== 'cliente' && type !== 'proveedor') {
    return (
      <div className="studio-container p-8">
        <div className="studio-card p-6">
          <h2 className="text-xl font-bold text-red-600">Error: Tipo de entidad no válido</h2>
          <p className="mt-2 text-gray-600">El tipo debe ser "cliente" o "proveedor"</p>
        </div>
      </div>
    );
  }

  // Filtrar facturas según el buscador
  const filteredInvoices = useMemo(() => {
    if (!invoiceSearch.trim()) {
      return entityData.facturas;
    }
    const searchLower = invoiceSearch.toLowerCase();
    return entityData.facturas.filter(
      (invoice) =>
        invoice.numero.toLowerCase().includes(searchLower) ||
        invoice.concepto.toLowerCase().includes(searchLower)
    );
  }, [entityData.facturas, invoiceSearch]);

  // Función para volver a la lista
  const handleBack = () => {
    if (type === 'cliente') {
      navigate('/clientes/lista');
    } else {
      navigate('/proveedores/listado');
    }
  };

  // Acciones del header
  const headerActions: PageHeaderAction[] = [
    {
      icon: 'edit',
      label: 'Editar Entidad',
      onClick: () => {
        // TODO: Implementar navegación a edición
        console.log('Editar entidad', id);
      },
      variant: 'default',
    },
    {
      icon: 'receipt',
      label: 'Nueva Factura',
      onClick: () => {
        // TODO: Implementar creación de factura
        console.log('Nueva factura', id);
      },
      variant: 'primary',
    },
    {
      icon: 'download',
      label: 'Descargar Extracto',
      onClick: () => {
        // TODO: Implementar descarga de extracto
        console.log('Descargar extracto', id);
      },
      variant: 'default',
    },
  ];

  return (
    <div className="studio-container p-6 md:p-8">
      {/* PageHeader */}
      <PageHeader
        title={entityData.nombre}
        showBackButton
        onBack={handleBack}
        actions={headerActions}
      />

      {/* Header de Resumen */}
      <div className="studio-card mb-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="entity-avatar">
            {getInitials(entityData.nombre)}
          </div>

          {/* Información principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {entityData.nombre}
                </h2>
                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">badge</span>
                    <span>NIF: {entityData.nif}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">
                      {type === 'cliente' ? 'person' : 'business'}
                    </span>
                    <span className="capitalize">{type}</span>
                  </span>
                </div>
              </div>
              <StatusBadge status={entityData.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* KPI: Saldo Total */}
        <div className="studio-kpi-card">
          <div className="kpi-content">
            <div>
              <div className="kpi-label">Saldo Total</div>
              <div className="kpi-value">{formatCurrency(entityData.saldoTotal)}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
                account_balance_wallet
              </span>
            </div>
          </div>
        </div>

        {/* KPI: Facturas Pendientes */}
        <div className="studio-kpi-card">
          <div className="kpi-content">
            <div>
              <div className="kpi-label">Facturas Pendientes</div>
              <div className="kpi-value">{entityData.facturasPendientes}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">
                pending
              </span>
            </div>
          </div>
        </div>

        {/* KPI: Volumen de Negocio Anual */}
        <div className="studio-kpi-card">
          <div className="kpi-content">
            <div>
              <div className="kpi-label">Volumen Anual</div>
              <div className="kpi-value">{formatCurrency(entityData.volumenAnual)}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400">
                trending_up
              </span>
            </div>
          </div>
        </div>

        {/* KPI: Última Operación */}
        <div className="studio-kpi-card">
          <div className="kpi-content">
            <div>
              <div className="kpi-label">Última Operación</div>
              <div className="kpi-value text-lg">
                {formatDateForDisplay(entityData.ultimaOperacion)}
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">
                schedule
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sistema de Tabs */}
      <div className="studio-card">
        {/* Navegación de tabs */}
        <div className="category-tabs-container">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={
              activeTab === 'general'
                ? 'tab-main tab-main-active'
                : 'tab-main tab-main-inactive'
            }
          >
            <span className="material-symbols-outlined tab-main-icon">info</span>
            <span className="tab-main-label">General</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('facturacion')}
            className={
              activeTab === 'facturacion'
                ? 'tab-main tab-main-active'
                : 'tab-main tab-main-inactive'
            }
          >
            <span className="material-symbols-outlined tab-main-icon">receipt</span>
            <span className="tab-main-label">Facturación</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contactos')}
            className={
              activeTab === 'contactos'
                ? 'tab-main tab-main-active'
                : 'tab-main tab-main-inactive'
            }
          >
            <span className="material-symbols-outlined tab-main-icon">contacts</span>
            <span className="tab-main-label">Contactos</span>
          </button>
        </div>

        {/* Contenido de tabs */}
        <div className="p-6">
          {/* Tab: General */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Datos Fiscales */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                  Datos Fiscales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label-studio">Dirección</label>
                    <div className="input-studio-readonly">
                      {entityData.direccionFiscal.calle}
                    </div>
                  </div>
                  <div>
                    <label className="label-studio">Ciudad</label>
                    <div className="input-studio-readonly">
                      {entityData.direccionFiscal.ciudad}
                    </div>
                  </div>
                  <div>
                    <label className="label-studio">Código Postal</label>
                    <div className="input-studio-readonly">
                      {entityData.direccionFiscal.codigoPostal}
                    </div>
                  </div>
                  <div>
                    <label className="label-studio">País</label>
                    <div className="input-studio-readonly">
                      {entityData.direccionFiscal.pais}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notas Internas */}
              {entityData.notasInternas && (
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    Notas Internas
                  </h3>
                  <div className="input-studio-readonly min-h-[100px]">
                    {entityData.notasInternas}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Facturación */}
          {activeTab === 'facturacion' && (
            <div className="space-y-4">
              {/* Buscador de facturas */}
              <div className="search-input-wrapper max-w-md">
                <span className="material-symbols-outlined search-input-icon">search</span>
                <input
                  type="text"
                  placeholder="Buscar por número o concepto..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="search-input"
                />
              </div>

              {/* Tabla de facturas */}
              <div className="table-wrapper">
                <table className="table-main">
                  <thead>
                    <tr>
                      <th className="table-header">Fecha</th>
                      <th className="table-header">Número</th>
                      <th className="table-header">Concepto</th>
                      <th className="table-header text-right">Base</th>
                      <th className="table-header text-right">IVA</th>
                      <th className="table-header text-right">Total</th>
                      <th className="table-header">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                          No se encontraron facturas
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((invoice) => (
                        <tr key={invoice.id} className="table-row">
                          <td>{formatDateForDisplay(invoice.fecha)}</td>
                          <td className="font-medium">{invoice.numero}</td>
                          <td>{invoice.concepto}</td>
                          <td className="text-right">{formatCurrency(invoice.base)}</td>
                          <td className="text-right">{formatCurrency(invoice.iva)}</td>
                          <td className="text-right font-semibold">
                            {formatCurrency(invoice.total)}
                          </td>
                          <td>
                            <InvoiceStatusBadge status={invoice.estado} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Contactos */}
          {activeTab === 'contactos' && (
            <div className="space-y-4">
              {entityData.contactos.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <span className="material-symbols-outlined text-6xl mb-4 block opacity-50">
                    person_off
                  </span>
                  <p>No hay contactos registrados</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {entityData.contactos.map((contact) => (
                    <div
                      key={contact.id}
                      className="studio-card p-4 border border-[#e5e5e5] dark:border-[#2A3B5A]"
                    >
                      <div className="flex items-start gap-4">
                        <div className="entity-avatar">
                          {getInitials(contact.nombre)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                            {contact.nombre}
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                            {contact.cargo}
                          </p>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400">
                                mail
                              </span>
                              <span className="text-slate-700 dark:text-slate-300">
                                {contact.email}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="material-symbols-outlined text-base text-slate-500 dark:text-slate-400">
                                phone
                              </span>
                              <span className="text-slate-700 dark:text-slate-300">
                                {contact.telefono}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
