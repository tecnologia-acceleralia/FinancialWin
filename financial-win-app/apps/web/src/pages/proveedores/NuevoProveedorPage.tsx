import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProveedorForm } from '../../features/entities/components/ProveedorForm';
import { Proveedor } from '../../features/entities/types';
import { PageHeader } from '../../components/layout';
import { useToast } from '../../contexts/ToastContext';
import { odooService } from '../../services/odooService';

interface SeccionInfo {
  id: string;
  titulo: string;
  icono: string;
}

const SECCIONES: SeccionInfo[] = [
  { id: 'datos-generales', titulo: 'Datos Generales', icono: 'business' },
  { id: 'direccion-facturacion', titulo: 'Dirección y Facturación', icono: 'location_on' },
  { id: 'contactos', titulo: 'Contactos', icono: 'contacts' },
  { id: 'notas', titulo: 'Notas Internas', icono: 'sticky_note_2' },
];

export const NuevoProveedorPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [seccionActiva, setSeccionActiva] = useState<string>(SECCIONES[0].id);
  const seccionesRefs = useRef<Record<string, HTMLElement | null>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scroll to top cuando se monta el componente
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Observer para detectar qué sección está visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            if (sectionId) {
              setSeccionActiva(sectionId);
            }
          }
        });
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      }
    );

    Object.values(seccionesRefs.current).forEach((ref) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const scrollASeccion = (seccionId: string) => {
    const elemento = seccionesRefs.current[seccionId];
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setSeccionActiva(seccionId);
    }
  };

  const handleCancelar = () => {
    navigate('/proveedores/listado');
  };

  const handleSubmit = async (data: Proveedor) => {
    // Prevenir múltiples envíos
    if (isSubmitting) {
      return;
    }

    try {
      // Validar campos requeridos
      if (!data.nombreComercial || !data.razonSocial || !data.cif) {
        showToast('Por favor, completa los campos obligatorios', 'error');
        return;
      }

      setIsSubmitting(true);

      // Crear partner en Odoo como proveedor
      // Odoo devuelve un número (ID del nuevo registro)
      const partnerId = await odooService.createPartner('supplier', data);

      // Verificar que el ID sea válido (mayor a 0)
      if (partnerId && partnerId > 0) {
        showToast('Proveedor creado en Odoo correctamente', 'success');
        // Redirigir a la lista de proveedores (recargará automáticamente desde Odoo)
        navigate('/proveedores/listado');
      } else {
        throw new Error('Odoo devolvió un ID inválido.');
      }
    } catch (error) {
      console.error('Error al crear proveedor en Odoo:', error);
      
      // Detallar el error si falla la conexión
      const errorMessage =
        error instanceof Error
          ? error.message.includes('conexión') || error.message.includes('conexion') || error.message.includes('network') || error.message.includes('fetch')
            ? `Error de conexión con Odoo: ${error.message}`
            : `Error al crear el proveedor en Odoo: ${error.message}`
          : 'Error desconocido al crear el proveedor en Odoo';
      
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuardarYSalir = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  const handleVolver = () => {
    navigate('/proveedores/listado');
  };

  return (
    <div className="cliente-page-container">
      <PageHeader
        title="Nuevo Proveedor"
        showBackButton={true}
        onBack={handleVolver}
      />
      <div className="cliente-page-layout">
        {/* Sidebar de Navegación */}
        <aside className="cliente-sidebar">
          <div className="cliente-sidebar-header">
            <h2 className="cliente-sidebar-title">Nuevo Proveedor</h2>
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
            <ProveedorForm
              ref={formRef}
              onSubmit={handleSubmit}
              onCancel={handleCancelar}
              seccionesRefs={seccionesRefs}
            />
          </div>

          {/* Action Bar - Barra de Botones */}
          <div className="action-bar">
            <button
              type="button"
              onClick={handleCancelar}
              className="btn btn-outline btn-md"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGuardarYSalir}
              className="btn btn-primary btn-md"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Enviando a Odoo...' : 'Guardar y Salir'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};
