import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { odooService, type OdooInvoice } from '../services/odooService';
import type { FinancialRecord } from '../contexts/FinancialContext';
import type { ExtractedData } from '../types';

export interface FinancialKPIs {
  totalIngresos: number;
  totalGastos: number;
  beneficioNeto: number;
  cajaPendiente: number;
  ratioCobro: number;
  ivaNeto: number;
  ivaTrimestral: number;
}

/**
 * Obtiene el trimestre actual (1-4)
 */
function getCurrentQuarter(): number {
  const month = new Date().getMonth() + 1;
  if (month >= 1 && month <= 3) return 1;
  if (month >= 4 && month <= 6) return 2;
  if (month >= 7 && month <= 9) return 3;
  return 4;
}

/**
 * Obtiene el año actual
 */
function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Verifica si una fecha pertenece al trimestre actual
 */
function isInCurrentQuarter(dateString: string | undefined | null): boolean {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    const currentYear = getCurrentYear();
    const currentQuarter = getCurrentQuarter();
    
    if (year !== currentYear) return false;
    
    if (currentQuarter === 1 && month >= 1 && month <= 3) return true;
    if (currentQuarter === 2 && month >= 4 && month <= 6) return true;
    if (currentQuarter === 3 && month >= 7 && month <= 9) return true;
    if (currentQuarter === 4 && month >= 10 && month <= 12) return true;
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Transforma una factura de Odoo a FinancialRecord
 */
function transformOdooInvoiceToFinancialRecord(
  invoice: OdooInvoice,
  type: 'income' | 'expense'
): FinancialRecord {
  const invoiceDate = invoice.invoice_date || new Date().toISOString().split('T')[0];
  const createdAt = invoiceDate;
  
  // Mapear payment_state de Odoo a PaymentStatus
  const paymentStatus: 'Pendiente' | 'Pagado' = 
    invoice.payment_state === 'paid' ? 'Pagado' : 'Pendiente';
  
  // CRÍTICO: Forzar conversión a número para evitar strings
  const amountTotal = Number(invoice.amount_total) || 0;
  const vatEstimated = amountTotal * 0.21 / 1.21; // IVA incluido
  
  // Mapear categoria_zaffra a expenseType si existe (solo para gastos)
  // IMPORTANTE: Asegurar que expenseType siempre tenga un valor para gastos
  // Si categoria_zaffra existe, usarla directamente (incluyendo 'Licencias' para Canva)
  // Si no existe, usar 'Sin Categorizar' como fallback
  // CRÍTICO: Si Canva viene con categoria_zaffra === 'Licencias', se mapea directamente a expenseType
  const expenseType: ExtractedData['expenseType'] | undefined = type === 'expense' 
    ? (invoice.categoria_zaffra ? invoice.categoria_zaffra as ExtractedData['expenseType'] : 'Sin Categorizar')
    : undefined;
  
  // CRÍTICO: Mapear departamento_zaffra a department para AMBOS tipos (gastos e ingresos)
  // IMPORTANTE: Eliminar cualquier lógica que mantenga "N/A" - siempre usar departamento_zaffra
  const department: ExtractedData['department'] | undefined = invoice.departamento_zaffra || undefined;
  
  // Log de depuración para verificar el mapeo (especialmente importante para Canva y 'Licencias')
  console.log(`📊 [FinancialStats] Factura ${type}: ${invoice.name}, Partner: ${invoice.partner_id[1]}, categoria_zaffra: ${invoice.categoria_zaffra || 'N/A'}, departamento_zaffra: ${invoice.departamento_zaffra || 'N/A'}, expenseType mapeado: ${expenseType || 'N/A'}, department asignado: ${department || 'N/A'}, amount_total (num): ${amountTotal}, payment_state: ${invoice.payment_state || 'N/A'}, state: ${invoice.state || 'N/A'}`);
  
  const extractedData: ExtractedData = {
    total: amountTotal.toString(),
    vat: vatEstimated.toString(),
    issueDate: invoiceDate,
    invoiceNum: invoice.name,
    // Para gastos: supplier, para ingresos: también guardamos el partner como supplier para compatibilidad
    supplier: invoice.partner_id[1] || 'Sin proveedor/cliente',
    // Mapear categoria_zaffra a expenseType si existe (solo para gastos)
    // Asegurar que expenseType tenga prioridad absoluta para el gráfico
    expenseType: type === 'expense' ? expenseType : undefined,
    // CRÍTICO: Asignar department desde departamento_zaffra para AMBOS tipos
    // NUNCA usar "N/A" - siempre usar el valor de departamento_zaffra
    department: department,
  };
  
  return {
    id: `odoo-${invoice.id}`,
    type,
    data: extractedData,
    documentType: 'invoices',
    paymentStatus,
    createdAt,
    updatedAt: createdAt,
  };
}

/**
 * Hook para calcular estadísticas financieras basadas en datos de Odoo
 * Todos los cálculos se actualizan automáticamente cuando cambian los datos de Odoo
 */
/**
 * Hook para calcular estadísticas financieras basadas en datos de Odoo
 * @param treasuryMode - Si es true, filtra solo cuentas pendientes (como en informes de Odoo)
 */
export const useFinancialStats = (treasuryMode: boolean = false) => {
  // Dominio específico para tesorería: solo cuentas pendientes (como en informes de Odoo)
  // NOTA: El filtro de 'state' ya está incluido en el dominio base de getInvoices
  // Solo agregamos el filtro de payment_state para modo tesorería
  const treasuryDomain: [string, string, unknown][] = treasuryMode
    ? [
        ['payment_state', 'in', ['not_paid', 'partial']],
      ]
    : [];

  // Cargar facturas de ingresos (out_invoice)
  // IMPORTANTE: refetchOnWindowFocus para evitar datos en caché obsoletos
  // CRÍTICO: El dominio base de getInvoices ya incluye ['state', 'in', ['posted', 'draft']]
  // para traer tanto facturas confirmadas como previsiones del Excel
  const { 
    data: incomeInvoices = [], 
    isLoading: isLoadingIncome,
    refetch: refetchIncome 
  } = useQuery({
    queryKey: ['odoo-invoices', 'out_invoice', treasuryMode ? 'treasury' : 'all'],
    queryFn: () => odooService.getInvoices('out_invoice', treasuryMode ? treasuryDomain : undefined),
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true, // Forzar refetch al enfocar la ventana
  });

  // Cargar facturas de gastos (in_invoice)
  // IMPORTANTE: refetchOnWindowFocus para evitar datos en caché obsoletos
  // CRÍTICO: El dominio base de getInvoices ya incluye ['state', 'in', ['posted', 'draft']]
  // para traer tanto facturas confirmadas como previsiones del Excel
  const { 
    data: expenseInvoices = [], 
    isLoading: isLoadingExpenses,
    refetch: refetchExpenses 
  } = useQuery({
    queryKey: ['odoo-invoices', 'in_invoice', treasuryMode ? 'treasury' : 'all'],
    queryFn: () => odooService.getInvoices('in_invoice', treasuryMode ? treasuryDomain : undefined),
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true, // Forzar refetch al enfocar la ventana
  });

  // Transformar facturas a FinancialRecord
  // IMPORTANTE: Transformar TODAS las facturas sin filtrar por estado
  // Esto asegura que facturas con estado 'posted' O payment_state 'paid' se incluyan
  // El filtro se aplica después en validExpensesForChart solo por supplier y total
  const income = useMemo(() => {
    return incomeInvoices.map((invoice) => 
      transformOdooInvoiceToFinancialRecord(invoice, 'income')
    );
  }, [incomeInvoices]);

  const expenses = useMemo(() => {
    // CRÍTICO: Incluir TODAS las facturas de gastos, independientemente de:
    // - state (posted, draft, etc.)
    // - payment_state (paid, not_paid, in_payment)
    // Esto asegura que facturas pagadas (payment_state === 'paid') se incluyan
    // IMPORTANTE: NO filtrar aquí por state o payment_state - incluir todas
    // El filtro se aplica después en validExpensesForChart solo por supplier y total
    // Esto garantiza que facturas con state === 'posted' O payment_state === 'paid' O payment_state === 'in_payment' se incluyan
    return expenseInvoices.map((invoice) => 
      transformOdooInvoiceToFinancialRecord(invoice, 'expense')
    );
  }, [expenseInvoices]);

  const isLoading = isLoadingIncome || isLoadingExpenses;

  // Filtrar gastos válidos para gráficos (con supplier y total)
  // CRÍTICO: Incluir TODAS las facturas independientemente del estado de pago
  // - Facturas con estado 'paid' (Pagada) SÍ deben incluirse en los cálculos de gráficas
  // - Facturas con estado 'not_paid' o 'in_payment' también se incluyen
  // - Facturas con state === 'posted' se incluyen automáticamente (ya transformadas)
  // SIN FILTROS DE FECHA: Incluir todas las facturas sin importar la fecha (trimestre/mes actual o anteriores)
  // SIN FILTROS DE CATEGORÍAS: NO hay whitelist de categorías - TODAS las categorías se incluyen (incluyendo 'Licencias')
  const validExpensesForChart = useMemo(() => {
    const filtered = expenses.filter(
      (expense) => {
        // Verificar que tenga supplier y total
        const hasSupplier = !!expense.data.supplier;
        const hasTotal = !!expense.data.total;
        const totalValue = Number(expense.data.total?.toString() || '0');
        
        // Obtener fecha de la factura para verificación
        const invoiceDate = expense.data.issueDate || expense.createdAt;
        const isInQuarter = invoiceDate ? isInCurrentQuarter(invoiceDate) : false;
        
        // Log de cada gasto evaluado (incluyendo estado de pago y fecha)
        console.log(`🔍 [FinancialStats] Evaluando gasto: ID=${expense.id}, Proveedor="${expense.data.supplier}", Total="${expense.data.total}", Total(num)=${totalValue}, expenseType="${expense.data.expenseType || 'undefined'}", Estado="${expense.paymentStatus}", Fecha="${invoiceDate}", EnTrimestreActual=${isInQuarter}, Válido=${hasSupplier && hasTotal && totalValue > 0}`);
        
        // CRÍTICO: NO filtrar por paymentStatus - incluir todas las facturas (paid, not_paid, in_payment)
        // CRÍTICO: NO filtrar por fecha - incluir todas las facturas (trimestre actual y anteriores)
        // CRÍTICO: NO filtrar por categorías - TODAS las categorías se incluyen (incluyendo 'Licencias')
        // Solo filtrar por: supplier existe, total existe, y total > 0
        return hasSupplier && hasTotal && totalValue > 0;
      }
    );
    
    // Log detallado para depuración
    console.log(`📊 [FinancialStats] Total gastos transformados: ${expenses.length}`);
    console.log(`📊 [FinancialStats] Gastos válidos para gráfico: ${filtered.length}`);
    
    // Contar facturas por estado de pago para verificación
    const paidCount = filtered.filter(e => e.paymentStatus === 'Pagado').length;
    const pendingCount = filtered.filter(e => e.paymentStatus === 'Pendiente').length;
    console.log(`📊 [FinancialStats] Desglose por estado: Pagadas=${paidCount}, Pendientes=${pendingCount}`);
    
    // Verificar que la categoría 'Licencias' esté presente
    const licenciasCount = filtered.filter(e => e.data.expenseType === 'Licencias').length;
    console.log(`📊 [FinancialStats] Facturas con categoría 'Licencias': ${licenciasCount}`);
    
    // Verificar facturas de Canva específicamente
    const canvaExpenses = filtered.filter(e => 
      e.data.supplier?.toLowerCase().includes('canva')
    );
    if (canvaExpenses.length > 0) {
      console.log(`📊 [FinancialStats] ⭐ Facturas de Canva encontradas: ${canvaExpenses.length}`);
      canvaExpenses.forEach(canva => {
        const invoiceDate = canva.data.issueDate || canva.createdAt;
        const isInQuarter = invoiceDate ? isInCurrentQuarter(invoiceDate) : false;
        console.log(`📊 [FinancialStats] ⭐ Canva: Total=${Number(canva.data.total?.toString() || '0')}, Categoría="${canva.data.expenseType || 'undefined'}", Estado="${canva.paymentStatus}", Fecha="${invoiceDate}", EnTrimestreActual=${isInQuarter}`);
      });
    } else {
      console.log(`📊 [FinancialStats] ⚠️ No se encontraron facturas de Canva en los gastos válidos`);
    }
    
    // Verificar facturas del trimestre actual
    const currentQuarterExpenses = filtered.filter(e => {
      const invoiceDate = e.data.issueDate || e.createdAt;
      return invoiceDate ? isInCurrentQuarter(invoiceDate) : false;
    });
    console.log(`📊 [FinancialStats] Facturas del trimestre actual: ${currentQuarterExpenses.length} de ${filtered.length}`);
    
    filtered.forEach((expense) => {
      const total = Number(expense.data.total?.toString() || '0');
      const invoiceDate = expense.data.issueDate || expense.createdAt;
      const isInQuarter = invoiceDate ? isInCurrentQuarter(invoiceDate) : false;
      console.log(`📊 [FinancialStats] ✅ Procesando para gráfico: Proveedor="${expense.data.supplier}", Total=${total}, Categoría asignada="${expense.data.expenseType || 'undefined'}", Estado="${expense.paymentStatus}", Fecha="${invoiceDate}", EnTrimestreActual=${isInQuarter}`);
    });
    
    return filtered;
  }, [expenses]);

  /**
   * Función auxiliar para parsear valores numéricos de forma segura
   */
  const safeParseFloat = (value: string | number | undefined | null): number => {
    if (value === null || value === undefined) return 0;
    const parsed = parseFloat(value.toString());
    return isNaN(parsed) ? 0 : parsed;
  };

  // Calcular KPIs dinámicos basados en datos de Odoo
  const kpis = useMemo((): FinancialKPIs => {
    // Filtrar facturas con estado 'posted' O 'draft' para incluir previsiones del Excel
    // Esto permite que la previsión de caja sea real incluyendo facturas en borrador
    const validIncomeInvoices = incomeInvoices.filter(
      (invoice) => invoice.state === 'posted' || invoice.state === 'draft'
    );
    const validExpenseInvoices = expenseInvoices.filter(
      (invoice) => invoice.state === 'posted' || invoice.state === 'draft'
    );

    // Total Ingresos: Suma de facturas de ingresos con estado 'posted' o 'draft'
    const totalIngresos = validIncomeInvoices.reduce((sum, invoice) => {
      return sum + (invoice.amount_total || 0);
    }, 0);

    // Total Gastos: Suma de facturas de gastos con estado 'posted' o 'draft'
    const totalGastos = validExpenseInvoices.reduce((sum, invoice) => {
      return sum + (invoice.amount_total || 0);
    }, 0);

    // Beneficio Neto: Ingresos - Gastos (incluyendo facturas posted y draft)
    const beneficioNeto = totalIngresos - totalGastos;

    // Caja Pendiente: Suma de facturas donde payment_state no sea 'paid'
    // Incluye tanto facturas 'posted' como 'draft' para previsión real
    const ingresosPendientes = incomeInvoices
      .filter((invoice) => 
        (invoice.state === 'posted' || invoice.state === 'draft') && 
        invoice.payment_state !== 'paid'
      )
      .reduce((sum, invoice) => {
        return sum + (invoice.amount_total || 0);
      }, 0);

    const gastosPendientes = expenseInvoices
      .filter((invoice) => 
        (invoice.state === 'posted' || invoice.state === 'draft') && 
        invoice.payment_state !== 'paid'
      )
      .reduce((sum, invoice) => {
        return sum + (invoice.amount_total || 0);
      }, 0);

    const cajaPendiente = ingresosPendientes + gastosPendientes;

    // Ratio de Cobro: Porcentaje de ingresos pagados respecto al total de ingresos
    // Solo cuenta facturas 'posted' para el ratio (las 'draft' no se pueden pagar aún)
    const ingresosPagados = incomeInvoices
      .filter((invoice) => invoice.state === 'posted' && invoice.payment_state === 'paid')
      .reduce((sum, invoice) => {
        return sum + (invoice.amount_total || 0);
      }, 0);

    const totalIngresosPosted = incomeInvoices
      .filter((invoice) => invoice.state === 'posted')
      .reduce((sum, invoice) => {
        return sum + (invoice.amount_total || 0);
      }, 0);

    const ratioCobro = totalIngresosPosted > 0 ? (ingresosPagados / totalIngresosPosted) * 100 : 0;

    // IVA Neto: Estimación basada en amount_total (21% IVA incluido)
    // Incluye tanto facturas 'posted' como 'draft' para previsión real
    const ivaIngresos = validIncomeInvoices.reduce((sum, invoice) => {
      const amount = invoice.amount_total || 0;
      const vat = amount * 0.21 / 1.21; // IVA incluido
      return sum + vat;
    }, 0);

    const ivaGastos = validExpenseInvoices.reduce((sum, invoice) => {
      const amount = invoice.amount_total || 0;
      const vat = amount * 0.21 / 1.21; // IVA incluido
      return sum + vat;
    }, 0);

    const ivaNeto = ivaIngresos - ivaGastos;

    // IVA Trimestral: Calcula el IVA neto solo de los registros del trimestre actual
    // Incluye tanto facturas 'posted' como 'draft'
    const ingresosTrimestre = validIncomeInvoices.filter((invoice) => {
      const fecha = invoice.invoice_date;
      return fecha && isInCurrentQuarter(fecha);
    });

    const gastosTrimestre = validExpenseInvoices.filter((invoice) => {
      const fecha = invoice.invoice_date;
      return fecha && isInCurrentQuarter(fecha);
    });

    const ivaIngresosTrimestre = ingresosTrimestre.reduce((sum, invoice) => {
      const amount = invoice.amount_total || 0;
      const vat = amount * 0.21 / 1.21;
      return sum + vat;
    }, 0);

    const ivaGastosTrimestre = gastosTrimestre.reduce((sum, invoice) => {
      const amount = invoice.amount_total || 0;
      const vat = amount * 0.21 / 1.21;
      return sum + vat;
    }, 0);

    const ivaTrimestral = ivaIngresosTrimestre - ivaGastosTrimestre;

    return {
      totalIngresos,
      totalGastos,
      beneficioNeto,
      cajaPendiente,
      ratioCobro,
      ivaNeto,
      ivaTrimestral,
    };
  }, [incomeInvoices, expenseInvoices]);

  // Formatear moneda
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Obtener los 5 movimientos pendientes más recientes de Odoo
  // Facturas con payment_state 'not_paid' o 'in_payment'
  const pendingMovements = useMemo(() => {
    const allInvoices: OdooInvoice[] = [...incomeInvoices, ...expenseInvoices];
    
    // Filtrar facturas pendientes (not_paid o in_payment)
    const pendingInvoices = allInvoices.filter(
      (invoice) => invoice.payment_state === 'not_paid' || invoice.payment_state === 'in_payment'
    );
    
    // Ordenar por fecha (más recientes primero)
    // Usar invoice_date_due si está disponible, sino invoice_date
    return pendingInvoices
      .sort((a, b) => {
        const dateA = a.invoice_date ? new Date(a.invoice_date) : new Date(0);
        const dateB = b.invoice_date ? new Date(b.invoice_date) : new Date(0);
        return dateB.getTime() - dateA.getTime(); // Más reciente primero
      })
      .slice(0, 5) // Solo los 5 más recientes
      .map((invoice) => {
        const type: 'income' | 'expense' = 
          incomeInvoices.some((inv) => inv.id === invoice.id) ? 'income' : 'expense';
        return transformOdooInvoiceToFinancialRecord(invoice, type);
      });
  }, [incomeInvoices, expenseInvoices]);

  // Función para refrescar los datos después de subir Excel
  const refreshData = async () => {
    console.log('🔄 [useFinancialStats] Refrescando datos después de subida de Excel...');
    await Promise.all([refetchIncome(), refetchExpenses()]);
    console.log('✅ [useFinancialStats] Datos refrescados correctamente');
  };

  return {
    kpis,
    allIncome: income, // Retornar ingresos transformados
    incomeInvoices, // Retornar facturas originales de Odoo para cálculos adicionales
    expenseInvoices, // Retornar facturas de gastos originales de Odoo para cálculos adicionales
    validExpensesForChart,
    formatCurrency,
    pendingMovements,
    isLoading,
    refreshData, // Función para refrescar datos después de subir Excel
  };
};
