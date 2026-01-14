import React, { createContext, useContext, useState } from 'react';

export type Language = 'es' | 'en';

interface Translations {
  [key: string]: any;
}

const translations: Record<Language, Translations> = {
  es: {
    nav: {
      dashboard: 'Dashboard',
      billing: 'Control Financiero',
      clients: 'Clientes',
      suppliers: 'Proveedores',
      documents: 'Documentación',
      records: 'Registros',
      settings: 'Configuración',
      help: 'Centro de Ayuda',
      operative: 'Operativa',
      newClient: 'Nuevo Cliente',
      listClients: 'Ver Lista',
      newSupplier: 'Nuevo Proveedor',
      listSuppliers: 'Ver Lista',
      payments: 'Gastos',
      collections: 'Ingresos',
      'ai-extraction': 'Extracción IA',
    },
    topbar: {
      dashboard: 'Resumen Financiero',
      billing: 'Control Financiero',
      clients: 'Clientes',
      suppliers: 'Proveedores',
      documents: 'Gestión Documental',
      records: 'Gestión de Registros',
      'ai-extraction': 'Extracción con IA',
      subtitle: {
        dashboard: 'Visión global del rendimiento financiero y alertas prioritarias.',
        billing: 'Procesamiento inteligente de facturas y gestión de flujo de caja.',
        clients: 'Gestión integral de cartera, CRM y análisis de riesgo comercial.',
        suppliers: 'Control de cadena de suministro y gestión de gastos corporativos.',
        documents: 'Repositorio centralizado y digitalización certificada de archivos.',
        records: 'Visualización y gestión centralizada de todos los registros del sistema.',
        'ai-extraction': 'Extracción automática de datos de documentos con inteligencia artificial.',
      },
      notifications: 'Notificaciones',
      markRead: 'Marcar leídas',
      viewHistory: 'Ver historial completo',
      profile: {
        manage: 'Gestionar tu cuenta',
        addAccount: 'Añadir otra cuenta',
        settings: 'Ajustes de perfil',
        logout: 'Cerrar sesión',
        policy: 'Política de Privacidad • Términos de Servicio',
      },
    },
    home: {
      hero: {
        greeting: 'Hola, Zaffra',
        status: 'El estado financiero es saludable. Tienes 3 tareas pendientes de validación para hoy.',
        action: 'Ver tareas pendientes',
      },
      nextDue: {
        label: 'Próximo Vencimiento',
        title: 'Impuesto Trimestral',
        time: 'Vence en 4 días',
        progress: '75% del plazo',
      },
      shortcuts: {
        title: 'Accesos Directos',
        billing: 'Control Financiero',
        billingDesc: 'Emitir y recibir facturas',
        clients: 'Clientes',
        clientsDesc: 'Gestión de cartera CRM',
        suppliers: 'Proveedores',
        suppliersDesc: 'Gestión de compras',
        documents: 'Documentación',
        documentsDesc: 'Archivo digital',
        records: 'Registros',
        recordsDesc: 'Histórico operaciones',
        pending: 'Pendientes',
        new: 'Nuevos',
        updated: 'Actualizado',
        monthly: 'Mensual',
      },
      summary: {
        title: 'Resumen Operativo',
        income: 'Ingresos Operativos',
        expenses: 'Gastos Recurrentes',
        pending: 'Pendiente de Cobro',
        last30: 'Últimos 30 días',
        vsPrev: 'vs mes anterior',
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
          d1: 'Hace 1d',
        },
      },
    },
  },
  en: {
    nav: {
      dashboard: 'Dashboard',
      billing: 'Financial Control',
      clients: 'Clients',
      suppliers: 'Suppliers',
      documents: 'Documents',
      records: 'Records',
      settings: 'Settings',
      help: 'Help Center',
      operative: 'Operative',
      newClient: 'New Client',
      listClients: 'View List',
      newSupplier: 'New Supplier',
      listSuppliers: 'View List',
      payments: 'Expenses',
      collections: 'Income',
      'ai-extraction': 'AI Extraction',
    },
    topbar: {
      dashboard: 'Financial Summary',
      billing: 'Financial Control',
      clients: 'Clients',
      suppliers: 'Suppliers',
      documents: 'Document Management',
      records: 'Records Management',
      'ai-extraction': 'AI Extraction',
      subtitle: {
        dashboard: 'Global view of financial performance and priority alerts.',
        billing: 'Intelligent invoice processing and cash flow management.',
        clients: 'Comprehensive portfolio management, CRM and commercial risk analysis.',
        suppliers: 'Supply chain control and corporate expense management.',
        documents: 'Centralized repository and certified digitization of files.',
        records: 'Visualization and centralized management of all system records.',
        'ai-extraction': 'Automatic data extraction from documents with artificial intelligence.',
      },
      notifications: 'Notifications',
      markRead: 'Mark as read',
      viewHistory: 'View full history',
      profile: {
        manage: 'Manage your account',
        addAccount: 'Add another account',
        settings: 'Profile settings',
        logout: 'Sign out',
        policy: 'Privacy Policy • Terms of Service',
      },
    },
    home: {
      hero: {
        greeting: 'Hello, Zaffra',
        status: 'Financial status is healthy. You have 3 pending tasks for validation today.',
        action: 'View pending tasks',
      },
      nextDue: {
        label: 'Next Due',
        title: 'Quarterly Tax',
        time: 'Due in 4 days',
        progress: '75% of term',
      },
      shortcuts: {
        title: 'Shortcuts',
        billing: 'Financial Control',
        billingDesc: 'Issue and receive invoices',
        clients: 'Clients',
        clientsDesc: 'CRM portfolio management',
        suppliers: 'Suppliers',
        suppliersDesc: 'Purchasing management',
        documents: 'Documents',
        documentsDesc: 'Digital archive',
        records: 'Records',
        recordsDesc: 'Operations history',
        pending: 'Pending',
        new: 'New',
        updated: 'Updated',
        monthly: 'Monthly',
      },
      summary: {
        title: 'Operational Summary',
        income: 'Operating Income',
        expenses: 'Recurring Expenses',
        pending: 'Pending Collection',
        last30: 'Last 30 days',
        vsPrev: 'vs previous month',
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
          d1: '1d ago',
        },
      },
    },
  },
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
