import React, { useMemo, useState } from 'react';
import { useFinancial, type FinancialRecord } from '../../../contexts/FinancialContext';
import type { FilterValues } from './FilterPanel';
import { DataTablePagination } from '../../../components/common/DataTablePagination';

interface RegistrosTableProps {
  searchTerm?: string;
  filters?: FilterValues;
}

/**
 * Verifica si un documento fue procesado por Gemini
 * Un documento está procesado si tiene datos extraídos (supplier, total, etc.)
 * Funciona con todos los tipos de documentos: invoices, tickets, staff
 */
const isProcessedByGemini = (record: FinancialRecord): boolean => {
  // Para todos los tipos, verificamos que tenga datos básicos extraídos
  return !!(record.data.supplier && record.data.total);
};

export const RegistrosTable: React.FC<RegistrosTableProps> = ({ searchTerm = '', filters }) => {
  const { records } = useFinancial();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);


  /**
   * Mapea el documentType interno a un nombre legible para el usuario
   */
  const getDocumentTypeLabel = (documentType: FinancialRecord['documentType']): string => {
    switch (documentType) {
      case 'invoices':
        return 'Factura';
      case 'tickets':
        return 'Ticket';
      case 'staff':
        return 'Staff';
      default:
        return documentType;
    }
  };



  const getEstadoClass = (estado: string) => {
    switch (estado) {
      case 'VALIDADO':
        return 'status-pill pill-success';
      case 'PENDIENTE':
        return 'status-pill pill-warning';
      case 'RECHAZADO':
        return 'status-pill pill-danger';
      default:
        return 'status-pill';
    }
  };

  /**
   * Extrae el valor numérico del importe y lo convierte a string para búsqueda
   * Elimina símbolos de moneda (€, $), comas, espacios y convierte a string
   * Maneja decimales correctamente para que "50.5" encuentre "50.50" y viceversa
   * Ejemplo: "€1,500.00" -> "1500.00"
   */
  const extraerNumeroImporte = (importe: string): string => {
    // Eliminar símbolos de moneda, comas, espacios y convertir a número
    const numeroLimpio = importe
      .replace(/[€$£,\s]/g, '') // Eliminar símbolos de moneda, comas y espacios
      .trim();
    
    // Convertir a número y luego a string para normalizar decimales
    const numero = parseFloat(numeroLimpio);
    
    // Si es un número válido, devolver como string
    // parseFloat normaliza "50.50" a 50.5, pero para búsqueda mantenemos ambos formatos
    if (!isNaN(numero)) {
      // Devolver tanto el número normalizado como el original sin símbolos
      // Esto permite que "50.5" encuentre "50.50" y viceversa
      return numeroLimpio;
    }
    
    // Si no es un número válido, devolver el string limpio original
    return numeroLimpio;
  };

  /**
   * Convierte FinancialRecord a formato de tabla
   * Ahora incluye TODOS los tipos de documentos (invoices, tickets, staff)
   */
  const registrosFormateados = useMemo(() => {
    return records.map((record) => {
      const estado = record.data.supplier && record.data.total ? 'VALIDADO' : 'PENDIENTE';
      const importe = record.data.total 
        ? `${record.data.currency || 'EUR'} ${record.data.total}`
        : 'N/A';
      
      return {
        id: record.id,
        estado,
        tipoDocumento: getDocumentTypeLabel(record.documentType),
        documentType: record.documentType, // Guardar documentType original para filtrado
        departamento: record.data.department || 'N/A',
        nombreDocumento: record.data.supplier || record.fileName || 'Sin nombre',
        fechaRegistro: new Date(record.createdAt).toLocaleDateString('es-ES'),
        fechaRegistroOriginal: record.createdAt, // Guardar fecha original para filtrado
        usuario: record.data.supplier || 'N/A',
        importe,
        isProcessed: isProcessedByGemini(record),
      };
    });
  }, [records]);


  /**
   * Filtra registros según el término de búsqueda y filtros avanzados
   * Busca en: Concepto, Categoría, Entidad/Cliente, e Importe (tanto texto como número)
   */
  const registrosFiltrados = useMemo(() => {
    let resultado = registrosFormateados;

    // Filtro por búsqueda de texto
    if (searchTerm.trim()) {
      const terminoBusqueda = searchTerm.toLowerCase().trim();
      
      resultado = resultado.filter((registro) => {
        // 1. Búsqueda en texto: Concepto (nombreDocumento)
        const coincideConcepto = registro.nombreDocumento
          .toLowerCase()
          .includes(terminoBusqueda);
        
        // 2. Búsqueda en texto: Categoría (tipoDocumento)
        const coincideCategoria = registro.tipoDocumento
          .toLowerCase()
          .includes(terminoBusqueda);
        
        // 3. Búsqueda en texto: Entidad/Cliente (usuario)
        const coincideEntidad = registro.usuario
          .toLowerCase()
          .includes(terminoBusqueda);
        
        // 4. Búsqueda en Importe: tanto en formato original como en número
        const importeOriginal = registro.importe.toLowerCase();
        const importeNumerico = extraerNumeroImporte(registro.importe).toLowerCase();
        
        // También normalizar el término de búsqueda para números (eliminar símbolos)
        const terminoBusquedaNumerico = terminoBusqueda.replace(/[€$£,\s]/g, '');
        
        const coincideImporteTexto = importeOriginal.includes(terminoBusqueda);
        const coincideImporteNumero = importeNumerico.includes(terminoBusquedaNumerico);
        
        return (
          coincideConcepto ||
          coincideCategoria ||
          coincideEntidad ||
          coincideImporteTexto ||
          coincideImporteNumero
        );
      });
    }

    // Aplicar filtros avanzados si existen
    if (filters) {
      // Filtro por rango de fechas
      if (filters.dateRange.from) {
        resultado = resultado.filter((registro) => {
          const fechaRegistro = new Date(registro.fechaRegistroOriginal);
          const fechaDesde = new Date(filters.dateRange.from);
          fechaDesde.setHours(0, 0, 0, 0); // Inicio del día
          return fechaRegistro >= fechaDesde;
        });
      }
      if (filters.dateRange.to) {
        resultado = resultado.filter((registro) => {
          const fechaRegistro = new Date(registro.fechaRegistroOriginal);
          const fechaHasta = new Date(filters.dateRange.to);
          fechaHasta.setHours(23, 59, 59, 999); // Fin del día
          return fechaRegistro <= fechaHasta;
        });
      }

      // Filtro por categorías (departamento)
      if (filters.categories.length > 0) {
        resultado = resultado.filter((registro) =>
          filters.categories.includes(registro.departamento)
        );
      }

      // Filtro por estados
      if (filters.status.length > 0) {
        resultado = resultado.filter((registro) =>
          filters.status.includes(registro.estado)
        );
      }

      // Filtro por Tipo de Documento
      if (filters.documentType.length > 0) {
        resultado = resultado.filter((registro) => {
          // Mapear nombres legibles del filtro a valores internos
          const documentTypesToFilter = filters.documentType.map((dt) => {
            if (dt === 'Factura') return 'invoices';
            if (dt === 'Ticket') return 'tickets';
            if (dt === 'Staff') return 'staff';
            return dt.toLowerCase();
          });
          return documentTypesToFilter.includes(registro.documentType);
        });
      }


      // Filtro por rango de importe
      if (filters.amountRange.min !== null) {
        resultado = resultado.filter((registro) => {
          const importeNum = parseFloat(
            registro.importe.replace(/[€$£,\s]/g, '').trim()
          );
          return importeNum >= filters.amountRange.min!;
        });
      }
      if (filters.amountRange.max !== null) {
        resultado = resultado.filter((registro) => {
          const importeNum = parseFloat(
            registro.importe.replace(/[€$£,\s]/g, '').trim()
          );
          return importeNum <= filters.amountRange.max!;
        });
      }
    }

    return resultado;
  }, [registrosFormateados, searchTerm, filters]);

  // Resetear a página 1 cuando cambian los filtros o búsqueda
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  // Calcular datos paginados
  const totalPages = Math.ceil(registrosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const registrosPaginados = useMemo(() => {
    return registrosFiltrados.slice(startIndex, endIndex);
  }, [registrosFiltrados, startIndex, endIndex]);

  // Ajustar página actual si está fuera de rango
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Handlers de paginación
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Resetear a página 1 al cambiar items por página
  };

  return (
    <div className="flex flex-col">
      <div className="table-wrapper">
        <table className="table-main">
        <thead>
          <tr>
            <th className="table-header table-col-small">Estado Validación</th>
            <th className="table-header table-col-medium">Tipo Documento</th>
            <th className="table-header table-col-medium">Departamento</th>
            <th className="table-header table-col-text">Nombre Documento</th>
            <th className="table-header table-col-small">Fecha Registro</th>
            <th className="table-header table-col-text">Usuario</th>
            <th className="table-header table-col-small">Importe</th>
          </tr>
        </thead>
        <tbody>
          {registrosFiltrados.length === 0 ? (
            <tr>
              <td colSpan={7} className="table-empty-state">
                <div className="contactos-empty-state">
                  <span className="material-symbols-outlined contactos-empty-icon">
                    search_off
                  </span>
                  <p className="contactos-empty-text">
                    No se han encontrado registros para esta búsqueda
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            registrosPaginados.map((registro) => (
              <tr key={registro.id} className="table-row">
                <td className="table-col-small">
                  <span className={getEstadoClass(registro.estado)}>
                    {registro.estado}
                  </span>
                </td>
                <td className="table-col-medium">{registro.tipoDocumento}</td>
                <td className="table-col-medium">{registro.departamento}</td>
                <td className="table-col-text" title={registro.nombreDocumento}>
                  {registro.nombreDocumento}
                </td>
                <td className="table-col-small">{registro.fechaRegistro}</td>
                <td className="table-col-text" title={registro.usuario}>
                  {registro.usuario}
                </td>
                <td className="table-col-small">{registro.importe}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>

      {/* Controles de paginación */}
      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={registrosFiltrados.length}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
};
