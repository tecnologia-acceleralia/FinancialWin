import React, { useState, useEffect, useMemo } from 'react';
import { useDebounce } from '../../hooks/useDebounce';

/**
 * Normaliza un string eliminando acentos y convirtiendo a minúsculas
 */
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Convierte un valor a string para búsqueda, manejando números y strings
 */
const valueToString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return String(value);
};

/**
 * Extrae el valor numérico de un string (elimina símbolos de moneda, comas, espacios)
 */
const extractNumericValue = (str: string): string => {
  return str.replace(/[€$£,\s]/g, '').trim();
};

export interface UniversalSearchBarProps<T> {
  items: T[];
  onFilter: (filteredItems: T[]) => void;
  searchFields: (keyof T)[];
  placeholder?: string;
  className?: string;
  onSearchTermChange?: (searchTerm: string) => void;
}

/**
 * Componente de búsqueda universal reutilizable
 * - Búsqueda insensible a mayúsculas/minúsculas y acentos
 * - Soporte para búsqueda en múltiples campos
 * - Conversión automática de números a string
 * - Debounce de 300ms
 * - UI minimalista con icono de lupa y botón de limpiar
 */
export function UniversalSearchBar<T extends object>({
  items,
  onFilter,
  searchFields,
  placeholder,
  className = '',
  onSearchTermChange,
}: UniversalSearchBarProps<T>): React.ReactElement {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Generar placeholder dinámico si no se proporciona
  const dynamicPlaceholder = useMemo(() => {
    if (placeholder) {
      return placeholder;
    }
    const fieldsText = searchFields.join(', ');
    return `Buscar por ${fieldsText}...`;
  }, [placeholder, searchFields]);

  // Notificar cambios en el término de búsqueda
  useEffect(() => {
    onSearchTermChange?.(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearchTermChange]);

  // Filtrar items cuando cambia el término de búsqueda debounced
  useEffect(() => {
    if (!debouncedSearchTerm.trim()) {
      onFilter(items);
      return;
    }

    const normalizedSearchTerm = normalizeString(debouncedSearchTerm);
    const numericSearchTerm = extractNumericValue(debouncedSearchTerm);

    const filtered = items.filter((item) => {
      return searchFields.some((field) => {
        const fieldValue = item[field];
        const fieldString = valueToString(fieldValue);
        const normalizedFieldValue = normalizeString(fieldString);
        const numericFieldValue = extractNumericValue(fieldString);

        // Búsqueda normalizada (insensible a mayúsculas/minúsculas y acentos)
        if (normalizedFieldValue.includes(normalizedSearchTerm)) {
          return true;
        }

        // Búsqueda numérica (si el término de búsqueda parece ser numérico)
        if (numericSearchTerm && numericFieldValue.includes(numericSearchTerm)) {
          return true;
        }

        return false;
      });
    });

    onFilter(filtered);
  }, [debouncedSearchTerm, items, searchFields, onFilter]);

  // Limpiar búsqueda
  const handleClear = () => {
    setSearchTerm('');
  };

  return (
    <div className={`universal-search-bar ${className}`}>
      <span className="universal-search-icon material-symbols-outlined">search</span>
      <input
        type="text"
        className="universal-search-input"
        placeholder={dynamicPlaceholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        aria-label="Buscar"
      />
      {searchTerm && (
        <button
          type="button"
          className="universal-search-clear"
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      )}
    </div>
  );
}
