import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import { normalizeName } from '../../utils/supplierMatching';

interface SupplierOption {
  id?: string;
  nombreComercial?: string;
  razonSocial?: string;
  idContableA3?: string;
}

interface LinkSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (supplierId: string, supplierA3Id: string, invoiceId: string) => void;
  supplierName: string;
  type: 'supplier' | 'client';
  invoiceId: string;
}

export const LinkSupplierModal: React.FC<LinkSupplierModalProps> = ({
  isOpen,
  onClose,
  onLink,
  supplierName,
  type,
  invoiceId,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [newSupplierName, setNewSupplierName] = useState(supplierName);
  const [newSupplierA3Id, setNewSupplierA3Id] = useState('');

  const storageKey = type === 'supplier' ? 'zaffra_suppliers' : 'zaffra_clients';
  const entityLabel = type === 'supplier' ? 'proveedor' : 'cliente';

  // Cargar proveedores/clientes desde localStorage
  const allSuppliers = useMemo(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return [];
      return JSON.parse(stored) as SupplierOption[];
    } catch (error) {
      console.error(`Error al cargar ${entityLabel}s:`, error);
      return [];
    }
  }, [storageKey, entityLabel, isOpen]); // Recargar cuando se abre el modal

  // Filtrar proveedores/clientes según búsqueda
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm.trim()) return allSuppliers;

    const normalizedSearch = normalizeName(searchTerm);
    return allSuppliers.filter((s) => {
      const normalizedNombre = normalizeName(s.nombreComercial || '');
      const normalizedRazon = normalizeName(s.razonSocial || '');
      return (
        normalizedNombre.includes(normalizedSearch) ||
        normalizedRazon.includes(normalizedSearch) ||
        normalizedSearch.includes(normalizedNombre) ||
        normalizedSearch.includes(normalizedRazon)
      );
    });
  }, [allSuppliers, searchTerm]);

  // Resetear formulario al cambiar de tab
  useEffect(() => {
    if (activeTab === 'new') {
      setNewSupplierName(supplierName);
      setNewSupplierA3Id('');
    } else {
      setSelectedSupplierId('');
      setSearchTerm('');
    }
  }, [activeTab, supplierName]);

  // Resetear al cerrar
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('existing');
      setSearchTerm('');
      setSelectedSupplierId('');
      setNewSupplierName(supplierName);
      setNewSupplierA3Id('');
    }
  }, [isOpen, supplierName]);

  const handleLinkExisting = () => {
    if (!selectedSupplierId) {
      showToast('Por favor, selecciona un ' + entityLabel, 'error');
      return;
    }

    const supplier = allSuppliers.find((s) => s.id === selectedSupplierId);
    if (!supplier) {
      showToast('Error: ' + entityLabel + ' no encontrado', 'error');
      return;
    }

    if (!supplier.idContableA3) {
      showToast(`El ${entityLabel} seleccionado no tiene ID Contable A3. Por favor, edítalo primero.`, 'error');
      return;
    }

    // Vincular primero
    onLink(selectedSupplierId, supplier.idContableA3, invoiceId);
    
    // Mostrar toast de éxito después de vincular (timing: cuando se cierra el modal)
    const entityName = supplier.nombreComercial || supplier.razonSocial || entityLabel;
    showToast(`${entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)} "${entityName}" vinculado correctamente a la factura.`, 'success');
    
    onClose();
  };

  const handleCreateAndLink = () => {
    if (!newSupplierName.trim()) {
      showToast('Por favor, ingresa el nombre del ' + entityLabel, 'error');
      return;
    }

    if (!newSupplierA3Id.trim()) {
      showToast('Por favor, ingresa el ID Contable A3', 'error');
      return;
    }

    try {
      // Crear nuevo proveedor/cliente
      const newSupplier: SupplierOption = {
        id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nombreComercial: newSupplierName.trim(),
        razonSocial: newSupplierName.trim(),
        idContableA3: newSupplierA3Id.trim(),
      };

      // Guardar en localStorage
      const updatedSuppliers = [...allSuppliers, newSupplier];
      localStorage.setItem(storageKey, JSON.stringify(updatedSuppliers));

      showToast(`${entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)} creado y vinculado correctamente`, 'success');

      // Vincular
      onLink(newSupplier.id!, newSupplier.idContableA3!, invoiceId);
      onClose();
    } catch (error) {
      console.error(`Error al crear ${entityLabel}:`, error);
      showToast(`Error al crear el ${entityLabel}`, 'error');
    }
  };

  const getDisplayName = (supplier: SupplierOption): string => {
    return supplier.nombreComercial || supplier.razonSocial || 'Sin nombre';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Vincular ${entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)}`}
      size="md"
    >
      <div className="link-supplier-modal-content">
        {/* Tabs */}
        <div className="link-supplier-tabs">
          <button
            type="button"
            className={`link-supplier-tab ${activeTab === 'existing' ? 'active' : ''}`}
            onClick={() => setActiveTab('existing')}
          >
            <span className="material-symbols-outlined">link</span>
            Vincular existente
          </button>
          <button
            type="button"
            className={`link-supplier-tab ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            <span className="material-symbols-outlined">add</span>
            Crear nuevo
          </button>
        </div>

        {/* Contenido según tab activo */}
        <div className="link-supplier-tab-content">
          {activeTab === 'existing' ? (
            <div className="link-supplier-existing">
              <p className="link-supplier-info">
                Factura de: <strong>{supplierName}</strong>
              </p>
              <div className="link-supplier-search">
                <span className="material-symbols-outlined link-supplier-search-icon">search</span>
                <input
                  type="text"
                  className="input link-supplier-search-input"
                  placeholder={`Buscar ${entityLabel}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {filteredSuppliers.length === 0 ? (
                <div className="link-supplier-empty">
                  <span className="material-symbols-outlined">search_off</span>
                  <p>No se encontraron {entityLabel}s</p>
                </div>
              ) : (
                <div className="link-supplier-list">
                  {filteredSuppliers.map((supplier) => {
                    const displayName = getDisplayName(supplier);
                    const hasA3Id = !!supplier.idContableA3;
                    const isSelected = selectedSupplierId === supplier.id;

                    return (
                      <button
                        key={supplier.id}
                        type="button"
                        className={`link-supplier-item ${isSelected ? 'selected' : ''} ${!hasA3Id ? 'no-a3-id' : ''}`}
                        onClick={() => {
                          if (hasA3Id) {
                            setSelectedSupplierId(supplier.id || '');
                          } else {
                            showToast(`Este ${entityLabel} no tiene ID Contable A3. Por favor, edítalo primero.`, 'warning');
                          }
                        }}
                        disabled={!hasA3Id}
                      >
                        <div className="link-supplier-item-content">
                          <span className="link-supplier-item-name">{displayName}</span>
                          {supplier.idContableA3 && (
                            <span className="link-supplier-item-a3">ID A3: {supplier.idContableA3}</span>
                          )}
                        </div>
                        {isSelected && (
                          <span className="material-symbols-outlined link-supplier-item-check">check_circle</span>
                        )}
                        {!hasA3Id && (
                          <span className="material-symbols-outlined link-supplier-item-warning" title="Sin ID A3">
                            warning
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="link-supplier-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleLinkExisting}
                  disabled={!selectedSupplierId}
                >
                  Vincular
                </button>
              </div>
            </div>
          ) : (
            <div className="link-supplier-new">
              <p className="link-supplier-info">
                Crear nuevo {entityLabel} para la factura de: <strong>{supplierName}</strong>
              </p>

              <div className="link-supplier-form">
                <div className="link-supplier-form-group">
                  <label className="link-supplier-label">
                    Nombre del {entityLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder={`Nombre del ${entityLabel}`}
                  />
                </div>

                <div className="link-supplier-form-group">
                  <label className="link-supplier-label">
                    ID Contable A3 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={newSupplierA3Id}
                    onChange={(e) => setNewSupplierA3Id(e.target.value)}
                    placeholder="Ej: PROV001"
                  />
                  <p className="link-supplier-hint">
                    Este ID se usa para sincronizar con A3factura
                  </p>
                </div>
              </div>

              <div className="link-supplier-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCreateAndLink}
                  disabled={!newSupplierName.trim() || !newSupplierA3Id.trim()}
                >
                  Guardar y Vincular
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
