import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProveedorForm } from '../../features/entities/components/ProveedorForm';
import { Proveedor } from '../../features/entities/types';
import { PageHeader } from '../../components/common/PageHeader';

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
  const [seccionActiva, setSeccionActiva] = useState<string>(SECCIONES[0].id);
  const seccionesRefs = useRef<Record<string, HTMLElement | null>>({});
  const formRef = useRef<HTMLFormElement>(null);

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
    navigate('/suppliers');
  };

  const [shouldNavigateAfterSave, setShouldNavigateAfterSave] = useState<
    'nuevo' | 'salir' | null
  >(null);

  const handleSubmit = async (data: Proveedor) => {
    // TODO: Implementar lógica de guardado con API
    console.log('Datos del proveedor:', data);
    // Aquí se llamaría a la API para guardar el proveedor
    // await saveProveedor(data);

    // Navegar según la acción seleccionada
    if (shouldNavigateAfterSave === 'nuevo') {
      navigate('/proveedores/nuevo');
      setShouldNavigateAfterSave(null);
    } else if (shouldNavigateAfterSave === 'salir') {
      navigate('/suppliers');
      setShouldNavigateAfterSave(null);
    }
  };

  const handleGuardarYNuevo = () => {
    setShouldNavigateAfterSave('nuevo');
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  const handleGuardarYSalir = () => {
    setShouldNavigateAfterSave('salir');
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  const handleVolver = () => {
    navigate('/proveedores');
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
