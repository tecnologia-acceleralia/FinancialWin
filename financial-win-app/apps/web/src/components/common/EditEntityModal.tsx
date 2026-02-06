import React, { useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { ProveedorForm } from '../../features/entities/components/ProveedorForm';
import { Proveedor, Cliente } from '../../features/entities/types';

interface EditEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Proveedor | Cliente) => void;
  entity: Proveedor | Cliente;
  type: 'proveedor' | 'cliente';
}

export const EditEntityModal: React.FC<EditEntityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  entity,
  type,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const seccionesRefs = useRef<Record<string, HTMLElement | null>>({});

  // Estado para formulario de cliente
  const [clienteFormData, setClienteFormData] = useState<Cliente>(() => {
    if (type === 'cliente') {
      return entity as Cliente;
    }
    return {} as Cliente;
  });

  const handleSubmit = (data: Proveedor | Cliente) => {
    onSave(data);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleClienteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedCliente: Cliente = {
      ...(entity as Cliente),
      ...clienteFormData,
      id: entity.id,
    };
    handleSubmit(updatedCliente);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Editar ${type === 'proveedor' ? 'Proveedor' : 'Cliente'}`}
      size="xl"
    >
      <div className="edit-entity-modal-content">
        {type === 'proveedor' ? (
          <ProveedorForm
            ref={formRef}
            initialData={entity as Proveedor}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            seccionesRefs={seccionesRefs}
          />
        ) : (
          <form onSubmit={handleClienteSubmit} className="space-y-6">
            {/* Nombre / Razón Social */}
            <div>
              <label className="label-studio">
                Razón Social <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={clienteFormData.razonSocial || ''}
                onChange={(e) =>
                  setClienteFormData({ ...clienteFormData, razonSocial: e.target.value })
                }
                className="input-studio"
                required
              />
            </div>


            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#e5e5e5] dark:border-[#2A3B5A]">
              <button type="button" onClick={handleCancel} className="btn btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Guardar Cambios
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
