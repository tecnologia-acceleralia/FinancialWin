import React from 'react';
import { StatusBadge } from '@/components/ui';

type EntityStatus = 'activo' | 'pendiente' | 'inactivo';

interface EntityCardProps {
  name: string;
  initials: string;
  nif: string;
  type: string;
  status: EntityStatus;
  account: string;
  balance: string;
  onDetailClick: () => void;
  email?: string;
  phone?: string;
  isProvider?: boolean;
}

export const EntityCard: React.FC<EntityCardProps> = ({
  name,
  initials,
  nif,
  type,
  status,
  account,
  balance,
  onDetailClick,
  email,
  phone,
  isProvider = false,
}) => {
  return (
    <div className="entity-card">
      <div className="entity-card-header">
        {/* Avatar a la izquierda */}
        <div className="entity-avatar">{initials}</div>
        
        {/* Contenedor con Badge arriba, Nombre y NIF abajo */}
        <div className="entity-info-container">
          <StatusBadge status={status} />
          <span className="entity-name">{name}</span>
          <span className="entity-subtitle">
            {nif} • {type}
          </span>
        </div>
      </div>

      <div className={`entity-card-body ${isProvider ? 'entity-card-body-provider' : ''}`}>
        {isProvider ? (
          <>
            {/* Bloque de contactos para proveedores */}
            {email && (
              <div className="entity-contact-field">
                <span className="entity-contact-icon material-symbols-outlined">mail</span>
                <span className="entity-contact-text">{email}</span>
              </div>
            )}
            {phone && (
              <div className="entity-contact-field">
                <span className="entity-contact-icon material-symbols-outlined">phone</span>
                <span className="entity-contact-text">{phone}</span>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Bloque de saldos para clientes */}
            <div className="entity-field">
              <span className="entity-field-icon">account_balance</span>
              <div className="entity-field-content">
                <div className="entity-field-label">Saldo bancario</div>
                <div className="entity-field-value">{account}</div>
              </div>
            </div>
            <div className="entity-field">
              <span className="entity-field-icon">payments</span>
              <div className="entity-field-content">
                <div className="entity-field-label">Pagos pendientes</div>
                <div className="entity-field-value">{balance}</div>
              </div>
            </div>
          </>
        )}
      </div>

      <button type="button" className="entity-card-action" onClick={onDetailClick}>
        <span className="entity-card-action-icon">visibility</span>
        <span>Ver ficha</span>
      </button>
    </div>
  );
};
