import React from 'react';
import { StatusBadge } from '@/components/ui';
import { obtenerIniciales, formatearMoneda, formatearTipo } from '@/utils/formatUtils';
import { CategoriaProveedor } from '@/features/entities/types';

type EntityStatus = 'activo' | 'pendiente' | 'inactivo';

export interface EntityTableItem {
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

export interface EntityTableViewProps {
  items: EntityTableItem[];
  onItemClick: (id: string) => void;
  isProvider?: boolean;
}

export const EntityTableView: React.FC<EntityTableViewProps> = ({
  items,
  onItemClick,
  isProvider = false,
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="entity-table-container">
      <table className="entity-table">
        <thead>
          <tr>
            <th className="entity-table-th">Nombre/Razón Social</th>
            <th className="entity-table-th">NIF</th>
            <th className="entity-table-th">Tipo</th>
            <th className="entity-table-th">Estado</th>
            {isProvider ? (
              <>
                <th className="entity-table-th">Email</th>
                <th className="entity-table-th">Teléfono</th>
              </>
            ) : (
              <>
                <th className="entity-table-th">Saldo Bancario</th>
                <th className="entity-table-th">Pagos Pendientes</th>
              </>
            )}
            <th className="entity-table-th">Ciudad</th>
            <th className="entity-table-th">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="entity-table-row">
              <td className="entity-table-td">
                <div className="entity-table-name-cell">
                  <div className="entity-table-avatar-small">
                    {obtenerIniciales(item.nombre)}
                  </div>
                  <span className="entity-table-name">{item.nombre}</span>
                </div>
              </td>
              <td className="entity-table-td">{item.nif}</td>
              <td className="entity-table-td">
                {isProvider ? formatearTipo(item.tipo as CategoriaProveedor) : item.tipo}
              </td>
              <td className="entity-table-td">
                <StatusBadge status={item.estado} />
              </td>
              {isProvider ? (
                <>
                  <td className="entity-table-td">{item.email || '-'}</td>
                  <td className="entity-table-td">{item.phone || '-'}</td>
                </>
              ) : (
                <>
                  <td className="entity-table-td">
                    {item.saldoBancario !== undefined
                      ? formatearMoneda(item.saldoBancario)
                      : '-'}
                  </td>
                  <td className="entity-table-td">
                    {item.pagosPendientes !== undefined
                      ? formatearMoneda(item.pagosPendientes)
                      : '-'}
                  </td>
                </>
              )}
              <td className="entity-table-td">{item.ciudad || '-'}</td>
              <td className="entity-table-td">
                <button
                  type="button"
                  className="btn-view"
                  onClick={() => onItemClick(item.id)}
                  aria-label="Ver detalles"
                >
                  <span className="material-symbols-outlined">visibility</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
