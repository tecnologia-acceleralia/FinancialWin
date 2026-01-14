
import React, { createContext, useContext, useState } from 'react';

export type Language = 'es' | 'en';

interface Translations {
  [key: string]: any;
}

const translations: Record<Language, Translations> = {
  es: {
    common: {
      cancel: 'Cancelar',
      save: 'Guardar',
      edit: 'Editar',
      delete: 'Eliminar',
      view: 'Ver',
      add: 'Añadir',
      search: 'Buscar...',
      back: 'Volver',
      actions: 'Acciones',
      status: 'Estado',
      date: 'Fecha',
      total: 'Total',
      backToMenu: 'Volver al Menú Principal',
      backToDashboard: 'Volver al Dashboard',
      filterBy: 'Filtrar por',
      reset: 'Reset',
      downloadCSV: 'Descargar CSV',
      configureCard: 'Configurar Tarjeta',
      visibleFields: 'Campos Visibles',
      visibleColumns: 'Columnas Visibles',
      viewDetails: 'Ver ficha',
      uploadNew: 'Subir Nuevo',
      filters: {
        fiscalLocation: 'Datos Fiscales y Ubicación',
        operationType: 'Tipo de Operación',
        paymentMethod: 'Forma de Cobro',
        location: 'Población / Provincia',
        cityPlaceholder: 'Ej: Madrid...',
        all: 'Todas'
      },
      pagination: {
        showing: 'Mostrando',
        to: 'a',
        of: 'de',
        results: 'resultados',
        prev: 'Anterior',
        next: 'Siguiente'
      },
      statusLabels: {
        active: 'Activo',
        inactive: 'Inactivo',
        pending: 'Pendiente',
        paid: 'Pagado',
        review: 'Revisar',
        validated: 'Validado',
        rejected: 'Rechazado'
      },
      form: {
        saveNew: 'Guardar y nuevo',
        saveExit: 'Guardar y salir',
        logo: 'Logo / Avatar',
        name: 'Nombre o Razón Social',
        commercialName: 'Nombre Comercial',
        address: 'Dirección',
        zip: 'Código Postal',
        city: 'Población',
        province: 'Provincia',
        country: 'País',
        addAddress: 'Agregar otra dirección',
        notes: 'Notas Internas',
        notesPlaceholder: 'Escribe notas, acuerdos especiales, recordatorios...',
        contactData: 'Datos de Contacto',
        addFile: 'Añadir Fila',
        noContacts: 'Aún no has añadido contactos',
        noContactsDesc: 'Añade personas clave para la gestión.',
        web: 'Sitio Web',
        email: 'Email',
        phone: 'Teléfono'
      }
    },
    nav: {
      dashboard: 'Dashboard',
      billing: 'Control Financiero',
      clients: 'Clientes',
      suppliers: 'Proveedores',
      analytics: 'Analítica',
      documents: 'Documentación',
      records: 'Registros',
      settings: 'Configuración',
      help: 'Centro de Ayuda',
      operative: 'Operativa',
      summary: 'Resumen',
      newClient: 'Nuevo Cliente',
      listClients: 'Ver Lista',
      newSupplier: 'Nuevo Proveedor',
      listSuppliers: 'Ver Lista',
      billingSummary: 'Resumen',
      uploadInvoice: 'Licencias',
      tickets: 'Tickets',
      subscriptions: 'Suscripciones',
      billingRecords: 'Registros',
      payments: 'Gastos',
      collections: 'Ingresos',
      forecasts: 'Previsiones',
      kpiBilling: 'KPI Facturación',
      kpiCollections: 'KPI Cobros',
      kpiExpenses: 'KPI Gastos',
      kpiFinancials: 'KPI Financiero',
      staff: 'Staff',
      docs: {
        expenses: 'Gastos Operativos',
        licenses: 'Licencias',
        tickets: 'Tickets y Gastos Menores',
        subs: 'Suscripciones & Servicios',
        foreign: 'Facturas Extranjeras',
        internal: 'Gastos Internos',
        hr: 'Recursos Humanos',
        payroll: 'Nóminas',
        banking: 'Pagos & Bancos',
        vouchers: 'Comprobantes de Pago',
        receipts: 'Recibos Bancarios',
        aux: 'Documentos Auxiliares',
        quotes: 'Presupuestos',
        delivery: 'Albaranes',
        contracts: 'Contratos',
        consultants: 'Consultor ext.'
      }
    },
    topbar: {
      dashboard: 'Resumen Financiero',
      billing: 'Control Financiero',
      'upload-invoice': 'Licencias',
      tickets: 'Gestión de Tickets',
      subscriptions: 'Gestión de Suscripciones',
      clients: 'Clientes',
      suppliers: 'Proveedores',
      analytics: 'Analítica Avanzada',
      documents: 'Gestión Documental',
      records: 'Gestión de Registros',
      'docs-expenses': 'Gastos Operativos',
      'docs-hr': 'Recursos Humanos',
      'docs-banking': 'Pagos & Bancos',
      'docs-aux': 'Documentos Auxiliares',
      subtitle: {
        dashboard: 'Visión global del rendimiento financiero y alertas prioritarias.',
        'upload-invoice': 'Gestión y subida de licencias.',
        tickets: 'Digitalización y control de tickets de gastos.',
        subscriptions: 'Control y digitalización de pagos recurrentes.',
        billing: 'Procesamiento inteligente de facturas y gestión de flujo de caja.',
        clients: 'Gestión integral de cartera, CRM y análisis de riesgo comercial.',
        suppliers: 'Control de cadena de suministro y gestión de gastos corporativos.',
        analytics: 'Inteligencia de negocio y reportes predictivos detallados.',
        documents: 'Repositorio centralizado y digitalización certificada de archivos.',
        records: 'Visualización y gestión centralizada de todos los registros del sistema.',
        'docs-expenses': 'Gestión y archivo de gastos corrientes.',
        'docs-hr': 'Documentación laboral y nóminas.',
        'docs-banking': 'Justificantes y extractos bancarios.',
        'docs-aux': 'Supplementary documentation.'
      },
      search: 'Buscar operación...',
      kpiExpense: 'Gasto Mes',
      kpiPending: 'Facturas Ptes',
      notifications: 'Notificaciones',
      markRead: 'Marcar leídas',
      viewHistory: 'Ver historial completo',
      profile: {
        manage: 'Gestionar tu cuenta',
        addAccount: 'Añadir otra cuenta',
        settings: 'Ajustes de perfil',
        logout: 'Cerrar sesión',
        policy: 'Política de Privacidad • Términos de Servicio'
      }
    },
    documents: {
        dashboard: {
            title: 'Resumen de Sección',
            totalFiles: 'Archivos Totales',
            recentUploads: 'Subidas Recientes',
            pendingReview: 'Pendientes de Revisión',
            shortcuts: 'Accesos Directos',
            alerts: 'Alertas y Avisos',
            storageUsed: 'Almacenamiento'
        },
        table: {
            name: 'Nombre del Archivo',
            category: 'Categoría',
            date: 'Fecha de Carga',
            size: 'Tamaño',
            uploadedBy: 'Subido por',
            type: 'Tipo'
        },
        upload: {
            dragTitle: 'Arrastra documentos aquí',
            dragSubtitle: 'Soporta PDF, JPG, PNG, DOCX, XLSX',
            browse: 'Explorar archivos'
        }
    },
    home: {
      hero: {
        greeting: 'Hola, Zaffra',
        status: 'El estado financiero es saludable. Tienes 3 tareas pendientes de validación para hoy.',
        action: 'Ver tareas pendientes'
      },
      nextDue: {
        label: 'Próximo Vencimiento',
        title: 'Impuesto Trimestral',
        time: 'Vence en 4 días',
        progress: '75% del plazo'
      },
      shortcuts: {
        title: 'Accesos Directos',
        billing: 'Control Financiero',
        billingDesc: 'Emitir y recibir facturas',
        clients: 'Clientes',
        clientsDesc: 'Gestión de cartera CRM',
        suppliers: 'Proveedores',
        suppliersDesc: 'Gestión de compras',
        reports: 'Informes',
        reportsDesc: 'Pérdidas y ganancias',
        documents: 'Documentación',
        documentsDesc: 'Archivo digital',
        records: 'Registros',
        recordsDesc: 'Histórico operaciones',
        pending: 'Pendientes',
        new: 'Nuevos',
        updated: 'Actualizado',
        monthly: 'Mensual'
      },
      summary: {
        title: 'Resumen Operativo',
        income: 'Ingresos Operativos',
        expenses: 'Gastos Recurrentes',
        pending: 'Pendiente de Cobro',
        last30: 'Últimos 30 días',
        vsPrev: 'vs mes anterior'
      },
      alerts: {
        title: 'Avisos',
        viewAll: 'Ver todos',
        syncError: 'Error de Sincronización',
        syncErrorDesc: 'Banco Santander',
        pendingSign: 'Firma Pendiente',
        pendingSignDesc: 'Contrato Innova SL',
        update: 'Actualización Sistema',
        updateDesc: 'Programada para el Viernes',
        time: {
          h2: 'Hace 2h',
          h4: 'Hace 4h',
          d1: 'Hace 1d'
        }
      }
    },
    billing: {
      tabs: {
        upload: 'Subir Factura',
        validate: 'Validación',
        history: 'Histórico',
        config: 'Configuración'
      },
      upload: {
        step1: 'Subida',
        step2: 'Procesado IA',
        step3: 'Validación',
        national: 'Nacionales',
        foreign: 'Extranjeras',
        dragTitle: 'Arrastra tus {type} aquí',
        dragSubtitle: 'Carga aquí el PDF o imagen de la factura para procesarla automáticamente con nuestro motor de IA.',
        button: 'Seleccionar Archivo',
        extensions: 'extensiones permitidas: PDF, JPG, PNG',
        analyzing: 'Analizando Documento',
        analyzingDesc: 'Nuestra IA está extrayendo los datos de la factura automáticamente...',
        processed: 'Procesado',
        analyzingBadge: 'Analizando'
      },
      review: {
        title: 'Revisión de Datos',
        aiBadge: 'Autocompletado con IA',
        dept: 'Departamento',
        expenseType: 'Tipo de Gasto',
        supplier: 'Proveedor',
        cif: 'CIF / NIF',
        vat: 'VAT',
        invoiceNum: 'Número Factura',
        issueDate: 'Fecha Emisión',
        concept: 'Concepto',
        base: 'Base Imponible',
        vatPercent: 'IVA (%)',
        total: 'Total Factura',
        validateAction: 'Validar y Archivar',
        registrationDate: 'Fecha de Alta',
        subscriptionType: 'Tipo Suscripción',
        renewalDate: 'Fecha Renovación',
        costType: 'Tipo de Costo',
        paymentMethod: 'Vía de Pago',
        expenseCategory: 'Categoría Gasto',
        activeStatus: 'Estado Activo',
        voided: 'Anulada'
      },
      records: {
        title: 'Registro de Facturas',
        table: {
            status: 'Estado',
            date: 'Fecha',
            invoiceNum: 'Nº Factura',
            supplier: 'Proveedor',
            cif: 'CIF',
            base: 'Base',
            vat: 'IVA',
            total: 'Total',
            dept: 'Dpto.',
            type: 'Tipo',
            registrationDate: 'F. Alta',
            subscriptionType: 'Tipo',
            renewalDate: 'Renovación',
            costType: 'Coste',
            paymentMethod: 'Vía Pago',
            expenseCategory: 'Categoría',
            activeStatus: 'Activa',
            isVoided: 'Anulada'
        }
      },
      dashboard: {
        balance: 'Flujo de Caja',
        actions: {
            expenses: 'Ver Gastos',
            expensesDesc: 'Gestión de pagos y compras',
            income: 'Ver Ingresos',
            incomeDesc: 'Facturación emitida y cobros',
            upload: 'Subir Factura',
            uploadDesc: 'Digitalización automática'
        },
        pendingInvoices: 'Pendientes de Pago',
        receivables: 'Pendiente de Cobro',
        cashflow: 'Flujo de Caja',
        forecast: 'Previsión a 30 días',
        trendPending: '8 facturas vencen pronto',
        trendReceivables: '+12% vs mes anterior',
        trendCashflow: 'Estable',
        trendForecast: 'Positiva',
        alertsTitle: 'Alertas Prioritarias',
        activityTitle: 'Actividad Reciente',
        shortcutsTitle: 'Acciones Rápidas',
        suggestionsTitle: 'Optimización Fiscal',
        suggestionsDesc: 'Se ha detectado una oportunidad de deducción en las facturas de marketing.'
      }
    },
    clients: {
        newBtn: 'Nuevo Cliente',
        searchPlaceholder: 'Buscar cliente (Nombre, CIF)...',
        dashboard: {
            active: 'Clientes Activos',
            new: 'Nuevos (Mes)',
            incomplete: 'Datos Incompletos',
            risk: 'En Riesgo',
            trendNew: '+15% vs anterior',
            trendIncomplete: 'Requiere acción',
            trendRisk: 'Pagos pendientes',
            alertsTitle: 'Alertas Prioritarias',
            activityTitle: 'Actividad Reciente',
            shortcutsTitle: 'Accesos Directos',
            suggestionsTitle: 'Oportunidad de Venta',
            suggestionsDesc: 'Hemos detectado 5 clientes que podrían estar interesados en el nuevo servicio.'
        },
        filters: {
            clientType: 'Tipo de Cliente',
            company: 'Empresa',
            individual: 'Particular',
            freelance: 'Freelance'
        },
        table: {
            client: 'Cliente',
            cif: 'NIF/CIF',
            address: 'Dirección',
            opType: 'Tipo Op.',
            pending: 'Imp. Pte.',
            payment: 'F. Cobro',
            account: 'Cta. Contable',
            actions: 'Acciones'
        },
        form: {
            type: 'Tipo de Cliente',
            companyData: 'Datos de la Empresa',
            companyDataDesc: 'Información legal y de identificación del cliente.',
            accounting: 'Información Contable y Fiscal',
            accountingDesc: 'Configuración para asientos automáticos y modelos fiscales.',
            commercial: 'Información Comercial',
            commercialDesc: 'Datos de contacto generales y preferencias.',
            billing: 'Facturación',
            billingDesc: 'Datos bancarios y condiciones de cobro.',
            other: 'Otra Información',
            otherDesc: 'Datos adicionales de clasificación.',
            aeat: 'No censado en la AEAT',
            logoDesc: 'Sube el logotipo de la empresa.',
            invoiceSeries: 'Serie Facturas',
            account: 'Cuenta Contable',
            year: 'Ejercicio',
            initialBalance: 'Saldo Inicial',
            counterpart: 'Contrapartida',
            opKey347: 'Clave Operación (Modelo 347)',
            opKey: 'Clave Operación',
            payDay: 'Día de Pago',
            dueDate: 'Vencimiento (Días)',
            iban: 'IBAN (Para remesas)',
            sector: 'Sector',
            origin: 'Client Origin'
        }
    },
    suppliers: {
        newBtn: 'Nuevo Proveedor',
        searchPlaceholder: 'Buscar proveedor...',
        dashboard: {
            active: 'Proveedores Activos',
            new: 'Nuevos (Mes)',
            pendingInvoices: 'Facturas Ptes',
            incidents: 'Incidencias',
            trendNew: 'Verificación pendiente',
            trendPending: '€12.4k total',
            trendIncidents: 'En resolución',
            alertsTitle: 'Alertas Prioritarias',
            activityTitle: 'Actividad Reciente',
            shortcutsTitle: 'Accesos Directos',
            suggestionsTitle: 'Renegociación Sugerida',
            suggestionsDesc: 'El proveedor "Papelería Central" ha aumentado su volumen de facturación.'
        },
        filters: {
            category: 'Categoría',
            external: 'Proveedor Externo',
            staff: 'Staff Interno',
            license: 'Licencias'
        },
        table: {
            supplier: 'Proveedor',
            type: 'Type',
            sector: 'Sector',
            email: 'Email',
            phone: 'Teléfono',
            actions: 'Actions'
        },
        form: {
            general: 'Datos Generales',
            address: 'Dirección y Facturación',
            contacts: 'Contactos',
            notes: 'Notas',
            category: 'Categoría',
            commercialName: 'Nombre Comercial',
            reason: 'Razón Social',
            sector: 'Sector / Activity',
            emailOrders: 'Orders Email',
            bankData: 'Bank Data & Payment',
            paymentMethod: 'Forma de Pago Habitual',
            paymentTerm: 'Plazo de Pago'
        }
    },
    analytics: {
        dashboard: {
            title: 'Analítica e Informes',
            subtitle: 'Visión general en tiempo real del rendimiento de tu empresa. Métricas clave, análisis detallado y predicciones IA.',
            viewReport: 'Ver Informe Anual',
            modulesTitle: 'Módulos de Análisis'
        },
        kpiBilling: {
            netAmount: 'Importe Facturación (Sin IVA)',
            totalAmount: 'Total Facturación',
            forecast: 'Previsión Facturación',
            cycle: 'Ciclo cobro promedio (días)',
            byCategory: 'Facturación por categoría',
            distribution: '% Facturación por categoría',
            ticketEvolution: 'Ticket medio mensual vs año anterior',
            category: 'Categoría',
            recordCount: 'Nº Registros',
            amount: 'Importe',
            percentage: '% Total',
            viewRecords: 'Ver registros asociados',
            startDate: 'Fecha Inicio',
            endDate: 'Fecha Fin'
        },
        kpiCollections: {
            netCollected: 'Importe Cobrado (Sin IVA)',
            totalCollected: 'Total Cobrado (Con IVA)',
            pendingCollection: 'Pendiente de cobro (Sin IVA)',
            avgCollectionTime: 'Tiempo medio de cobro',
            riskTitle: 'Riesgo de impago por antigüedad',
            pending0_30: 'Importe pendiente 0-30 dias',
            pending31_60: 'Importe pendiente 31-60 dias',
            pending61_100: 'Importe pendiente 61-100 dias',
            invoicesCollectedCount: 'Numero de facturas cobradas este mes'
        }
    }
  },
  en: {
    common: {
      cancel: 'Cancel',
      save: 'Save',
      edit: 'Edit',
      delete: 'Delete',
      view: 'View',
      add: 'Add',
      search: 'Search...',
      back: 'Back',
      actions: 'Actions',
      status: 'Status',
      date: 'Date',
      total: 'Total',
      backToMenu: 'Back to Main Menu',
      backToDashboard: 'Back to Dashboard',
      filterBy: 'Filter by',
      reset: 'Reset',
      downloadCSV: 'Download CSV',
      configureCard: 'Configure Card',
      visibleFields: 'Visible Fields',
      visibleColumns: 'Visible Columns',
      viewDetails: 'View details',
      uploadNew: 'Upload New',
      filters: {
        fiscalLocation: 'Fiscal Data & Location',
        operationType: 'Operation Type',
        paymentMethod: 'Payment Method',
        location: 'City / Province',
        cityPlaceholder: 'Ex: Madrid...',
        all: 'All'
      },
      pagination: {
        showing: 'Showing',
        to: 'to',
        of: 'of',
        results: 'results',
        prev: 'Previous',
        next: 'Next'
      },
      statusLabels: {
        active: 'Active',
        inactive: 'Inactive',
        pending: 'Pending',
        paid: 'Paid',
        review: 'Review',
        validated: 'Validated',
        rejected: 'Rejected'
      },
      form: {
        saveNew: 'Save and new',
        saveExit: 'Save and exit',
        logo: 'Logo / Avatar',
        name: 'Name or Company Name',
        commercialName: 'Commercial Name',
        address: 'Address',
        zip: 'Zip Code',
        city: 'City',
        province: 'Province',
        country: 'Country',
        addAddress: 'Add another address',
        notes: 'Internal Notes',
        notesPlaceholder: 'Write notes, special agreements, reminders...',
        contactData: 'Contact Data',
        addFile: 'Add Row',
        noContacts: 'No contacts added yet',
        noContactsDesc: 'Add key people for management.',
        web: 'Website',
        email: 'Email',
        phone: 'Phone'
      }
    },
    nav: {
      dashboard: 'Dashboard',
      billing: 'Financial Control',
      clients: 'Clients',
      suppliers: 'Suppliers',
      analytics: 'Analytics',
      documents: 'Documents',
      records: 'Records',
      settings: 'Settings',
      help: 'Help Center',
      operative: 'Operative',
      summary: 'Summary',
      newClient: 'New Client',
      listClients: 'View List',
      newSupplier: 'New Supplier',
      listSuppliers: 'View List',
      billingSummary: 'Summary',
      uploadInvoice: 'Licenses',
      tickets: 'Tickets',
      subscriptions: 'Subscriptions',
      billingRecords: 'Records',
      payments: 'Expenses',
      collections: 'Income',
      forecasts: 'Forecasts',
      kpiBilling: 'Billing KPI',
      kpiCollections: 'Collections KPI',
      kpiExpenses: 'Expenses KPI',
      kpiFinancials: 'Financial KPI',
      staff: 'Staff',
      docs: {
        expenses: 'Operating Expenses',
        licenses: 'Licenses',
        tickets: 'Tickets and Minor Expenses',
        subs: 'Subscriptions & Services',
        foreign: 'Foreign Invoices',
        internal: 'Internal Expenses',
        hr: 'Human Resources',
        payroll: 'Payrolls',
        banking: 'Payments & Banks',
        vouchers: 'Payment Vouchers',
        receipts: 'Bank Receipts',
        aux: 'Auxiliary Documents',
        quotes: 'Quotes',
        delivery: 'Delivery Notes',
        contracts: 'Contracts',
        consultants: 'Ext. Consultant'
      }
    },
    topbar: {
      dashboard: 'Financial Summary',
      billing: 'Financial Control',
      'upload-invoice': 'Licenses',
      tickets: 'Ticket Management',
      subscriptions: 'Subscription Management',
      clients: 'Clients',
      suppliers: 'Suppliers',
      analytics: 'Advanced Analytics',
      documents: 'Document Management',
      records: 'Records Management',
      'docs-expenses': 'Operating Expenses',
      'docs-hr': 'Human Resources',
      'docs-banking': 'Payments & Banks',
      'docs-aux': 'Auxiliary Documents',
      subtitle: {
        dashboard: 'Global view of financial performance and priority alerts.',
        'upload-invoice': 'License management and upload.',
        tickets: 'Digitization and control of expense tickets.',
        subscriptions: 'Control and digitization of recurring payments.',
        billing: 'Intelligent invoice processing and cash flow management.',
        clients: 'Comprehensive portfolio management, CRM and commercial risk analysis.',
        suppliers: 'Supply chain control and corporate expense management.',
        analytics: 'Business intelligence and detailed predictive reports.',
        documents: 'Centralized repository and certified digitization of files.',
        records: 'Visualization and centralized management of all system records.',
        'docs-expenses': 'Management and filing of current expenses.',
        'docs-hr': 'Labor documentation and payrolls.',
        'docs-banking': 'Bank vouchers and statements.',
        'docs-aux': 'Supplementary documentation.'
      },
      search: 'Search operation...',
      kpiExpense: 'Month Expense',
      kpiPending: 'Pending Invoices',
      notifications: 'Notifications',
      markRead: 'Mark as read',
      viewHistory: 'View full history',
      profile: {
        manage: 'Manage your account',
        addAccount: 'Add another account',
        settings: 'Profile settings',
        logout: 'Sign out',
        policy: 'Privacy Policy • Terms of Service'
      }
    },
    documents: {
        dashboard: {
            title: 'Section Summary',
            totalFiles: 'Total Files',
            recentUploads: 'Recent Uploads',
            pendingReview: 'Pending Review',
            shortcuts: 'Shortcuts',
            alerts: 'Alerts and Notices',
            storageUsed: 'Storage'
        },
        table: {
            name: 'File Name',
            category: 'Category',
            date: 'Upload Date',
            size: 'Size',
            uploadedBy: 'Uploaded by',
            type: 'Type'
        },
        upload: {
            dragTitle: 'Drag documents here',
            dragSubtitle: 'Supports PDF, JPG, PNG, DOCX, XLSX',
            browse: 'Browse files'
        }
    },
    home: {
      hero: {
        greeting: 'Hello, Zaffra',
        status: 'Financial status is healthy. You have 3 pending tasks for validation today.',
        action: 'View pending tasks'
      },
      nextDue: {
        label: 'Next Due',
        title: 'Quarterly Tax',
        time: 'Due in 4 days',
        progress: '75% of term'
      },
      shortcuts: {
        title: 'Shortcuts',
        billing: 'Financial Control',
        billingDesc: 'Issue and receive invoices',
        clients: 'Clients',
        clientsDesc: 'CRM portfolio management',
        suppliers: 'Suppliers',
        suppliersDesc: 'Purchasing management',
        reports: 'Reports',
        reportsDesc: 'Profit and loss',
        documents: 'Documents',
        documentsDesc: 'Digital archive',
        records: 'Records',
        recordsDesc: 'Operations history',
        pending: 'Pending',
        new: 'New',
        updated: 'Updated',
        monthly: 'Monthly'
      },
      summary: {
        title: 'Operational Summary',
        income: 'Operating Income',
        expenses: 'Recurring Expenses',
        pending: 'Pending Collection',
        last30: 'Last 30 days',
        vsPrev: 'vs previous month'
      },
      alerts: {
        title: 'Notices',
        viewAll: 'View all',
        syncError: 'Sync Error',
        syncErrorDesc: 'Santander Bank',
        pendingSign: 'Pending Signature',
        pendingSignDesc: 'Innova SL Contract',
        update: 'System Update',
        updateDesc: 'Scheduled for Friday',
        time: {
          h2: '2h ago',
          h4: '4h ago',
          d1: '1d ago'
        }
      }
    },
    billing: {
      tabs: {
        upload: 'Upload Invoice',
        validate: 'Validation',
        history: 'History',
        config: 'Configuration'
      },
      upload: {
        step1: 'Upload',
        step2: 'AI Processing',
        step3: 'Validation',
        national: 'National',
        foreign: 'Foreign',
        dragTitle: 'Drag your {type} here',
        dragSubtitle: 'Upload the PDF or image of the invoice here to automatically process it with our AI engine.',
        button: 'Select File',
        extensions: 'allowed extensions: PDF, JPG, PNG',
        analyzing: 'Analyzing Document',
        analyzingDesc: 'Our AI is extracting invoice data automatically...',
        processed: 'Processed',
        analyzingBadge: 'Analyzing'
      },
      review: {
        title: 'Data Review',
        aiBadge: 'Autocompleted with AI',
        dept: 'Department',
        expenseType: 'Expense Type',
        supplier: 'Supplier',
        cif: 'CIF / NIF',
        vat: 'VAT',
        invoiceNum: 'Invoice Number',
        issueDate: 'Issue Date',
        concept: 'Concept',
        base: 'Tax Base',
        vatPercent: 'VAT (%)',
        total: 'Total Invoice',
        validateAction: 'Validate and Archive',
        registrationDate: 'Registration Date',
        subscriptionType: 'Subscription Type',
        renewalDate: 'Renewal Date',
        costType: 'Cost Type',
        paymentMethod: 'Payment Method',
        expenseCategory: 'Expense Category',
        activeStatus: 'Active Status',
        voided: 'Voided'
      },
      records: {
        title: 'Invoice Record',
        table: {
            status: 'Status',
            date: 'Date',
            invoiceNum: 'Inv. Num',
            supplier: 'Supplier',
            cif: 'CIF',
            base: 'Base',
            vat: 'VAT',
            total: 'Total',
            dept: 'Dept.',
            type: 'Type',
            registrationDate: 'Reg. Date',
            subscriptionType: 'Type',
            renewalDate: 'Renewal',
            costType: 'Cost',
            paymentMethod: 'Payment Method',
            expenseCategory: 'Category',
            activeStatus: 'Active',
            isVoided: 'Voided'
        }
      },
      dashboard: {
        balance: 'Cash Flow',
        actions: {
            expenses: 'View Expenses',
            expensesDesc: 'Payments and purchases management',
            income: 'View Income',
            incomeDesc: 'Issued billing and collections',
            upload: 'Upload Invoice',
            uploadDesc: 'Automatic digitization'
        },
        pendingInvoices: 'Pending Payment',
        receivables: 'Pending Collection',
        cashflow: 'Cash Flow',
        forecast: '30-day Forecast',
        trendPending: '8 invoices due soon',
        trendReceivables: '+12% vs previous month',
        trendCashflow: 'Stable',
        trendForecast: 'Positive',
        alertsTitle: 'Priority Alerts',
        activityTitle: 'Recent Activity',
        shortcutsTitle: 'Quick Actions',
        suggestionsTitle: 'Tax Optimization',
        suggestionsDesc: 'A deduction opportunity has been detected in marketing invoices.'
      }
    },
    clients: {
        newBtn: 'New Client',
        searchPlaceholder: 'Search client (Name, CIF)...',
        dashboard: {
            active: 'Active Clients',
            new: 'New (Month)',
            incomplete: 'Incomplete Data',
            risk: 'At Risk',
            trendNew: '+15% vs previous',
            trendIncomplete: 'Action required',
            trendRisk: 'Pending payments',
            alertsTitle: 'Priority Alerts',
            activityTitle: 'Recent Activity',
            shortcutsTitle: 'Shortcuts',
            suggestionsTitle: 'Sales Opportunity',
            suggestionsDesc: 'We have detected 5 clients who might be interested in the new service.'
        },
        filters: {
            clientType: 'Client Type',
            company: 'Company',
            individual: 'Individual',
            freelance: 'Freelance'
        },
        table: {
            client: 'Client',
            cif: 'NIF/CIF',
            address: 'Address',
            opType: 'Op. Type',
            pending: 'Pending Amt.',
            payment: 'Coll. Date',
            account: 'Acc. Account',
            actions: 'Actions'
        },
        form: {
            type: 'Client Type',
            companyData: 'Company Data',
            companyDataDesc: 'Legal and identification information of the client.',
            accounting: 'Accounting and Tax Info',
            accountingDesc: 'Configuration for automatic entries and tax forms.',
            commercial: 'Commercial Information',
            commercialDesc: 'General contact details and preferences.',
            billing: 'Billing',
            billingDesc: 'Bank details and collection conditions.',
            other: 'Other Information',
            otherDesc: 'Additional classification data.',
            aeat: 'Not registered in AEAT',
            logoDesc: 'Upload the company logo.',
            invoiceSeries: 'Invoice Series',
            account: 'Accounting Account',
            year: 'Fiscal Year',
            initialBalance: 'Initial Balance',
            counterpart: 'Counterpart',
            opKey347: 'Operation Key (Form 347)',
            opKey: 'Operation Key',
            payDay: 'Pay Day',
            dueDate: 'Due Date (Days)',
            iban: 'IBAN (For remittances)',
            sector: 'Sector',
            origin: 'Client Origin'
        }
    },
    suppliers: {
        newBtn: 'New Supplier',
        searchPlaceholder: 'Search supplier...',
        dashboard: {
            active: 'Active Suppliers',
            new: 'New (Month)',
            pendingInvoices: 'Pending Invoices',
            incidents: 'Incidents',
            trendNew: 'Verification pending',
            trendPending: '€12.4k total',
            trendIncidents: 'In resolution',
            alertsTitle: 'Priority Alerts',
            activityTitle: 'Recent Activity',
            shortcutsTitle: 'Shortcuts',
            suggestionsTitle: 'Suggested Renegotiation',
            suggestionsDesc: 'Supplier "Papelería Central" has increased its billing volume.'
        },
        filters: {
            category: 'Category',
            external: 'External Supplier',
            staff: 'Internal Staff',
            license: 'Licenses'
        },
        table: {
            supplier: 'Supplier',
            type: 'Type',
            sector: 'Sector',
            email: 'Email',
            phone: 'Phone',
            actions: 'Actions'
        },
        form: {
            general: 'General Data',
            address: 'Address and Billing',
            contacts: 'Contacts',
            notes: 'Notes',
            category: 'Category',
            commercialName: 'Commercial Name',
            reason: 'Company Name',
            sector: 'Sector / Activity',
            emailOrders: 'Orders Email',
            bankData: 'Bank Data & Payment',
            paymentMethod: 'Usual Payment Method',
            paymentTerm: 'Payment Term'
        }
    },
    analytics: {
        dashboard: {
            title: 'Analytics & Reports',
            subtitle: 'Real-time overview of your company performance. Key metrics, detailed analysis, and AI predictions.',
            viewReport: 'View Annual Report',
            modulesTitle: 'Analysis Modules'
        },
        kpiBilling: {
            netAmount: 'Billing Amount (Excl. VAT)',
            totalAmount: 'Total Billing',
            forecast: 'Billing Forecast',
            cycle: 'Avg Collection Cycle (days)',
            byCategory: 'Billing by Category',
            distribution: '% Billing by Category',
            ticketEvolution: 'Avg Monthly Ticket vs Previous Year',
            category: 'Category',
            recordCount: 'Record Count',
            amount: 'Amount',
            percentage: '% Total',
            viewRecords: 'View associated records',
            startDate: 'Start Date',
            endDate: 'End Date'
        },
        kpiCollections: {
            netCollected: 'Collected Amount (Excl. VAT)',
            totalCollected: 'Total Collected (Incl. VAT)',
            pendingCollection: 'Pending Collection (Excl. VAT)',
            avgCollectionTime: 'Avg Collection Time',
            riskTitle: 'Default Risk by Age',
            pending0_30: 'Pending amount 0-30 days',
            pending31_60: 'Pending amount 31-60 days',
            pending61_100: 'Pending amount 61-100 days',
            invoicesCollectedCount: 'Number of invoices collected this month'
        }
    }
  }
};

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('es');

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'es' ? 'en' : 'es'));
  };

  const t = (path: string) => {
    const keys = path.split('.');
    let value = translations[language];
    for (const key of keys) {
      if (value[key] === undefined) return path;
      value = value[key];
    }
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
