import React, { useMemo } from 'react';

interface DataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

export const DataTablePagination: React.FC<DataTablePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  /**
   * Genera los números de página con lógica de "Smart Pagination"
   * Si hay más de 7 páginas, muestra primeras, últimas y puntos suspensivos
   */
  const pageNumbers = useMemo(() => {
    const maxVisiblePages = 7;
    const pages: (number | string)[] = [];

    if (totalPages <= maxVisiblePages) {
      // Si hay 7 o menos páginas, mostrar todas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Smart pagination: mostrar primeras, últimas y puntos suspensivos
      const leftSiblingIndex = Math.max(currentPage - 1, 1);
      const rightSiblingIndex = Math.min(currentPage + 1, totalPages);

      const shouldShowLeftDots = leftSiblingIndex > 2;
      const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

      // Siempre mostrar primera página
      pages.push(1);

      if (shouldShowLeftDots) {
        pages.push('...');
      }

      // Mostrar páginas alrededor de la actual
      for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
        // Evitar duplicar primera y última página
        if (i > 1 && i < totalPages) {
          pages.push(i);
        }
      }

      if (shouldShowRightDots) {
        pages.push('...');
      }

      // Siempre mostrar última página (si no es la misma que la primera)
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  const handlePreviousPage = () => {
    onPageChange(Math.max(1, currentPage - 1));
  };

  const handleNextPage = () => {
    onPageChange(Math.min(totalPages, currentPage + 1));
  };

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newItemsPerPage = parseInt(e.target.value, 10);
    onItemsPerPageChange(newItemsPerPage);
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        <span>
          Página {currentPage} de {totalPages > 0 ? totalPages : 1}
        </span>
        <span className="mx-2">•</span>
        <span>
          Mostrando {startIndex + 1} a {Math.min(endIndex, totalItems)} de {totalItems} resultados
        </span>
      </div>
      <div className="pagination-controls">
        <select
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          className="pagination-select"
          aria-label="Registros por página"
        >
          <option value={10}>10 por página</option>
          <option value={25}>25 por página</option>
          <option value={50}>50 por página</option>
        </select>
        <button
          type="button"
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          className="pagination-button"
          aria-label="Página anterior"
        >
          <span className="material-symbols-outlined pagination-button-icon">
            chevron_left
          </span>
        </button>

        {/* Números de página */}
        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="pagination-ellipsis"
                aria-hidden="true"
              >
                ...
              </span>
            );
          }

          const pageNumber = page as number;
          const isActive = pageNumber === currentPage;

          return (
            <button
              key={pageNumber}
              type="button"
              onClick={() => handlePageClick(pageNumber)}
              className={isActive ? 'pagination-number-button-active' : 'pagination-number-button'}
              aria-label={`Ir a página ${pageNumber}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {pageNumber}
            </button>
          );
        })}

        <button
          type="button"
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          className="pagination-button"
          aria-label="Página siguiente"
        >
          <span className="material-symbols-outlined pagination-button-icon">
            chevron_right
          </span>
        </button>
      </div>
    </div>
  );
};
