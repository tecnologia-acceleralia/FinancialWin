import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ExtractedData } from '../types';

/**
 * Tipo de registro financiero
 */
export type FinancialRecordType = 'expense' | 'income';

/**
 * Estado de sincronización ERP
 */
export type ErpStatus = 'pending' | 'syncing' | 'synced_odoo' | 'error';

/**
 * Estado de pago
 */
export type PaymentStatus = 'Pendiente' | 'Pagado';

/**
 * Interfaz para un registro financiero
 */
export interface FinancialRecord {
  id: string;
  type: FinancialRecordType;
  data: ExtractedData;
  documentType: 'tickets' | 'invoices' | 'staff';
  fileName?: string;
  fileUrl?: string;
  erpStatus?: ErpStatus;
  paymentStatus?: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interfaz del contexto financiero
 */
interface FinancialContextType {
  records: FinancialRecord[];
  expenses: FinancialRecord[];
  income: FinancialRecord[];
  addRecord: (record: Omit<FinancialRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRecord: (id: string, updates: Partial<FinancialRecord>) => void;
  deleteRecord: (id: string) => void;
  getRecord: (id: string) => FinancialRecord | undefined;
  clearAll: () => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

/**
 * Clave para localStorage
 */
const STORAGE_KEY = 'financialwin_records';

/**
 * Función para cargar registros desde localStorage
 * Se usa como inicializador lazy para evitar que se ejecute en cada render
 */
function loadRecordsFromStorage(): FinancialRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as FinancialRecord[];
      // Validar que sea un array
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error al cargar registros financieros desde localStorage:', error);
  }
  // Si no hay nada o hay error, retornar array vacío
  return [];
}

/**
 * Provider del contexto financiero
 */
export function FinancialProvider({ children }: { children: React.ReactNode }) {
  // Inicializar el estado directamente desde localStorage usando función lazy
  // Esto asegura que el valor inicial sea exactamente lo que hay en localStorage
  const [records, setRecords] = useState<FinancialRecord[]>(loadRecordsFromStorage);
  
  // Ref para trackear si es la primera carga (para evitar guardar en el primer render)
  const isInitialMount = useRef(true);

  // Guardar en localStorage cuando cambien los registros
  // PERO NO en el primer render (para evitar sobrescribir con array vacío)
  useEffect(() => {
    // Saltar el primer render
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Guardar solo cuando realmente cambien los registros (no en la carga inicial)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.error('Error al guardar registros financieros en localStorage:', error);
    }
  }, [records]);

  // Filtrar gastos
  const expenses = records.filter((r) => r.type === 'expense');

  // Filtrar ingresos
  const income = records.filter((r) => r.type === 'income');

  /**
   * Agregar un nuevo registro
   */
  const addRecord = useCallback(
    (record: Omit<FinancialRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newRecord: FinancialRecord = {
        ...record,
        erpStatus: record.erpStatus || 'pending',
        paymentStatus: record.paymentStatus || 'Pendiente',
        id: `record-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setRecords((prev) => [...prev, newRecord]);
      return newRecord;
    },
    []
  );

  /**
   * Actualizar un registro existente
   */
  const updateRecord = useCallback((id: string, updates: Partial<FinancialRecord>) => {
    setRecords((prev) =>
      prev.map((record) =>
        record.id === id
          ? { ...record, ...updates, updatedAt: new Date().toISOString() }
          : record
      )
    );
  }, []);

  /**
   * Eliminar un registro
   */
  const deleteRecord = useCallback((id: string) => {
    setRecords((prev) => prev.filter((record) => record.id !== id));
  }, []);

  /**
   * Obtener un registro por ID
   */
  const getRecord = useCallback(
    (id: string) => {
      return records.find((record) => record.id === id);
    },
    [records]
  );

  /**
   * Limpiar todos los registros
   */
  const clearAll = useCallback(() => {
    setRecords([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value: FinancialContextType = {
    records,
    expenses,
    income,
    addRecord,
    updateRecord,
    deleteRecord,
    getRecord,
    clearAll,
  };

  return <FinancialContext.Provider value={value}>{children}</FinancialContext.Provider>;
}

/**
 * Hook para usar el contexto financiero
 */
export function useFinancial() {
  const context = useContext(FinancialContext);
  if (context === undefined) {
    throw new Error('useFinancial debe usarse dentro de un FinancialProvider');
  }
  return context;
}
