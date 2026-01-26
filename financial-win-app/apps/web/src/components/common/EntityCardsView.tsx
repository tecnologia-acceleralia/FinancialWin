import React from 'react';
import { EntityCard } from '@/features/entities/components/EntityCard';
import { obtenerIniciales, formatearMoneda, formatearTipo } from '@/utils/formatUtils';
import { CategoriaProveedor } from '@/features/entities/types';

type EntityStatus = 'activo' | 'pendiente' | 'inactivo';

export interface EntityCardItem {
  id: string;
  nombre: string;
  nif: string;
  tipo: string | CategoriaProveedor;
  estado: EntityStatus;
  saldoBancario?: number;
  pagosPendientes?: number;
  email?: string;
  phone?: string;
  ciudad?: string;
}

export interface EntityCardsViewProps {
  items: EntityCardItem[];
  onItemClick: (id: string) => void;
  isProvider?: boolean;
}

export const EntityCardsView: React.FC<EntityCardsViewProps> = ({
  items,
  onItemClick,
  isProvider = false,
}) => {
  return (
    <div className="entity-cards-grid">
      {items.map((item) => (
        <EntityCard
          key={item.id}
          name={item.nombre}
          initials={obtenerIniciales(item.nombre)}
          nif={item.nif}
          type={isProvider ? formatearTipo(item.tipo as CategoriaProveedor) : item.tipo}
          status={item.estado}
          account={
            item.saldoBancario !== undefined
              ? formatearMoneda(item.saldoBancario)
              : formatearMoneda(0)
          }
          balance={
            item.pagosPendientes !== undefined
              ? formatearMoneda(item.pagosPendientes)
              : formatearMoneda(0)
          }
          email={item.email}
          phone={item.phone}
          isProvider={isProvider}
          onDetailClick={() => onItemClick(item.id)}
        />
      ))}
    </div>
  );
};
