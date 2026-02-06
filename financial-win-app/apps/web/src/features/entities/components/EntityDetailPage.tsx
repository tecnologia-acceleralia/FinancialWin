import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/layout';
import { StatusBadge } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { odooService, type OdooPartner } from '@/services/odooService';
import { EmptyState } from '@/components/common/EmptyState';

/**
 * Tipos para la entidad (Cliente o Proveedor)
 */
type EntityType = 'cliente' | 'proveedor';

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
 * Página de detalle de entidad (Cliente o Proveedor) con datos reales de Odoo
 */
export const EntityDetailPage: React.FC = () => {
  // ============================================
  // TODOS LOS HOOKS DEBEN IR PRIMERO (antes de cualquier return)
  // ============================================
  
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  
  // Extraer el tipo desde el pathname: /cliente/detalle/:id o /proveedor/detalle/:id
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const type: EntityType | undefined = pathSegments[0] === 'cliente' || pathSegments[0] === 'proveedor' 
    ? (pathSegments[0] as EntityType)
    : undefined;

  // Estados para datos del partner de Odoo
  const [partner, setPartner] = useState<OdooPartner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del partner desde Odoo
  useEffect(() => {
    const loadPartner = async () => {
      if (!id) {
        setError('ID no proporcionado');
        setIsLoading(false);
        return;
      }

      const partnerId = parseInt(id, 10);
      if (isNaN(partnerId)) {
        setError('ID inválido');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const partnerData = await odooService.getPartnerById(partnerId);
        
        if (!partnerData) {
          setError('Socio no encontrado en Odoo');
          showToast('No se encontró el socio en Odoo', 'error');
        } else {
          setPartner(partnerData);
        }
      } catch (err) {
        console.error('Error al cargar partner desde Odoo:', err);
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar datos de Odoo';
        setError(errorMessage);
        showToast('Error al cargar datos del socio desde Odoo', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    void loadPartner();
  }, [id, showToast]);

  // ============================================
  // VALIDACIONES Y RETURNS TEMPRANOS (después de todos los hooks)
  // ============================================

  // Validar tipo de entidad
  if (type !== 'cliente' && type !== 'proveedor') {
    return (
      <div className="studio-container p-8">
        <div className="studio-card p-6">
          <h2 className="text-xl font-bold text-red-600">Error: Tipo de entidad no válido</h2>
          <p className="mt-2 text-gray-600">El tipo debe ser "cliente" o "proveedor"</p>
          <button
            onClick={() => navigate(type === 'cliente' ? '/clientes/lista' : '/proveedores/listado')}
            className="btn btn-primary mt-4"
          >
            Volver a la lista
          </button>
        </div>
      </div>
    );
  }

  // Función para volver a la lista
  const handleBack = () => {
    if (type === 'cliente') {
      navigate('/clientes/lista');
    } else {
      navigate('/proveedores/listado');
    }
  };

  // Estado de carga
  if (isLoading) {
    return (
      <div className="studio-container p-8">
        <div className="studio-card p-6">
          <div className="flex items-center justify-center gap-3">
            <span className="material-symbols-outlined animate-spin text-2xl">
              progress_activity
            </span>
            <span className="text-lg text-gray-600 dark:text-gray-400">
              Cargando datos del socio desde Odoo...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Estado de error
  if (error || !partner) {
    return (
      <div className="studio-container p-8">
        <div className="studio-card p-6">
          <EmptyState
            title="Socio no encontrado"
            description={error || 'No se pudo cargar la información del socio desde Odoo'}
            icon="warning"
          />
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleBack}
              className="btn btn-primary"
            >
              Volver a la lista
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Determinar estado del partner (activo si tiene rank > 0)
  const isActive = type === 'cliente' 
    ? (partner.customer_rank ?? 0) > 0
    : (partner.supplier_rank ?? 0) > 0;

  return (
    <div className="studio-container p-6 md:p-8">
      {/* PageHeader */}
      <PageHeader
        title={partner.name}
        showBackButton
        onBack={handleBack}
      />

      {/* Header de Resumen */}
      <div className="studio-card mb-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="entity-avatar">
            {getInitials(partner.name)}
          </div>

          {/* Información principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  {partner.name}
                </h2>
                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                  {partner.vat && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">badge</span>
                      <span>NIF: {partner.vat}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">
                      {type === 'cliente' ? 'person' : 'business'}
                    </span>
                    <span className="capitalize">{type}</span>
                  </span>
                </div>
              </div>
              <StatusBadge status={isActive ? 'activo' : 'inactivo'} />
            </div>
          </div>
        </div>
      </div>

      {/* Información del Socio */}
      <div className="studio-card">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
          Información del Socio
        </h3>

        <div className="space-y-6">
          {/* Sección de Contacto */}
          {(partner.email || partner.phone || partner.website) && (
            <div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
                Contacto
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {partner.email && (
                  <div>
                    <label className="label-studio">Email</label>
                    <div className="input-studio-readonly">
                      <a
                        href={`mailto:${partner.email}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {partner.email}
                      </a>
                    </div>
                  </div>
                )}
                {partner.phone && (
                  <div>
                    <label className="label-studio">Teléfono</label>
                    <div className="input-studio-readonly">
                      <a
                        href={`tel:${partner.phone}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {partner.phone}
                      </a>
                    </div>
                  </div>
                )}
                {partner.website && (
                  <div>
                    <label className="label-studio">Sitio Web</label>
                    <div className="input-studio-readonly">
                      <a
                        href={partner.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {partner.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sección de Dirección */}
          {(partner.street || partner.city || partner.zip) && (
            <div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
                Dirección
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {partner.street && (
                  <div>
                    <label className="label-studio">Calle</label>
                    <div className="input-studio-readonly">
                      {partner.street}
                    </div>
                  </div>
                )}
                {partner.city && (
                  <div>
                    <label className="label-studio">Ciudad</label>
                    <div className="input-studio-readonly">
                      {partner.city}
                    </div>
                  </div>
                )}
                {partner.zip && (
                  <div>
                    <label className="label-studio">Código Postal</label>
                    <div className="input-studio-readonly">
                      {partner.zip}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sección de Notas (comment de Odoo) */}
          {partner.comment && (
            <div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
                Notas e Información Adicional
              </h4>
              <div className="input-studio-readonly min-h-[100px] whitespace-pre-wrap">
                {partner.comment}
              </div>
            </div>
          )}

          {/* Mensaje si no hay información adicional */}
          {!partner.email && !partner.phone && !partner.website && 
           !partner.street && !partner.city && !partner.zip && !partner.comment && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">
                info
              </span>
              <p>No hay información adicional disponible para este socio</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
