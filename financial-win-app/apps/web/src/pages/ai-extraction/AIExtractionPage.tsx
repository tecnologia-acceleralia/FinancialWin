import React, { useMemo, useState } from 'react';
import { AIExtractionForm } from './AIExtractionForm';
import type { DocumentType, ExtractedData } from './types';

export const AIExtractionPage: React.FC = () => {
  // Fase 3 (IA) queda en pausa: por ahora trabajamos con datos mock para construir la UI.
  const [type] = useState<DocumentType>('invoices');
  const [data, setData] = useState<ExtractedData>({
    nif: 'B12345678',
    fecha: '2026-01-14',
    baseImponible: '100.00',
    iva: '21.00',
    total: '121.00',
    proveedor: 'Proveedor Demo S.L.',
    concepto: 'Servicios de consultoría',
  });

  const previewTitle = useMemo(() => {
    switch (type) {
      case 'tickets':
        return 'Ticket';
      case 'staff':
        return 'Gasto de personal';
      case 'invoices':
      default:
        return 'Factura';
    }
  }, [type]);

  const handleChange = (field: string, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-[#0B1018] text-white p-8">
      {/* Barra superior simple */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          Extracción de Documentos IA
        </h1>
      </header>

      {/* Contenedor principal */}
      <div className="studio-container">
        <div className="studio-card">
          <AIExtractionForm
            type={type}
            data={data}
            onChange={handleChange}
            previewTitle={previewTitle}
          />
        </div>
      </div>
    </div>
  );
};
