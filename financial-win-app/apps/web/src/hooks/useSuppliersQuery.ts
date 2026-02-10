import { useQuery } from '@tanstack/react-query';
import { odooService } from '../services/odooService';
import type { Proveedor } from '../features/entities/types';

/**
 * Hook para obtener proveedores desde Odoo
 * Reemplaza el uso de localStorage para obtener datos frescos de la API
 */
export function useSuppliersQuery() {
  return useQuery<Proveedor[]>({
    queryKey: ['odoo-suppliers'],
    queryFn: async () => {
      const partners = await odooService.getPartners('supplier');
      
      // Transformar OdooPartner a Proveedor
      return partners.map((partner): Proveedor => ({
        id: partner.id.toString(),
        razonSocial: partner.name,
        nombreComercial: partner.name,
        cif: partner.vat || '',
        ordersEmail: partner.email || '',
        direccion: partner.street || '',
        ciudad: partner.city || '',
        zip: partner.zip || '',
        web: partner.website || '',
        telefono: partner.phone || '',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Campos opcionales que pueden venir del comment de Odoo
        categoria: undefined,
        sector: undefined,
        iban: undefined,
        formaPago: undefined,
        plazoPago: undefined,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
  });
}
