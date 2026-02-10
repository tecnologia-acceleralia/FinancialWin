import { useQuery } from '@tanstack/react-query';
import { odooService } from '../services/odooService';
import type { Cliente } from '../features/entities/types';

/**
 * Hook para obtener clientes desde Odoo
 * Reemplaza el uso de localStorage para obtener datos frescos de la API
 */
export function useClientsQuery() {
  return useQuery<Cliente[]>({
    queryKey: ['odoo-clients'],
    queryFn: async () => {
      const partners = await odooService.getPartners('customer');
      
      // Transformar OdooPartner a Cliente
      return partners.map((partner): Cliente => ({
        id: partner.id.toString(),
        razonSocial: partner.name,
        nif: partner.vat || '',
        email: partner.email || '',
        direccion: partner.street || '',
        ciudad: partner.city || '',
        codigoPostal: partner.zip || '',
        web: partner.website || '',
        telefono: partner.phone || '',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Campos opcionales que pueden venir del comment de Odoo
        sector: undefined,
        formaPagoDefault: undefined,
        plazoPago: undefined,
        notas: partner.comment || undefined,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
  });
}
