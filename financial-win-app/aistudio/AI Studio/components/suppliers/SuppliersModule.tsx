
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';

// --- STYLES & UTILS ---
const TYPO = {
  h3: "text-3xl font-bold text-[#0B1018] dark:text-[#fafafa] brand-font tracking-tight",
  h4: "text-xl font-bold text-[#0B1018] dark:text-[#fafafa] brand-font",
  h5: "text-lg font-bold text-[#0B1018] dark:text-[#fafafa] brand-font",
  body: "text-sm text-[#525252] dark:text-[#d4d4d4]",
  label: "text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider",
  small: "text-xs text-[#737373] dark:text-[#a3a3a3]",
  input: "text-sm font-medium text-[#171717] dark:text-[#fafafa]"
};

const labelStyles = "block text-xs font-bold text-[#525252] dark:text-[#a3a3a3] mb-1.5 uppercase tracking-wider";
const inputStyles = "w-full px-4 py-2.5 bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] rounded-lg text-sm font-medium text-[#171717] dark:text-[#fafafa] placeholder:text-[#a3a3a3] dark:placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-[#B84E9D] focus:border-[#B84E9D] hover:border-[#a3a3a3] transition-all shadow-sm";
const readOnlyInputStyles = "w-full px-4 py-2.5 bg-[#fafafa] dark:bg-[#1B273B]/50 border border-[#e5e5e5] dark:border-[#2A3B5A] rounded-lg text-sm font-medium text-[#525252] dark:text-[#d4d4d4] focus:outline-none shadow-none cursor-default";
const selectStyles = "w-full appearance-none px-4 py-2.5 bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] rounded-lg text-sm font-medium text-[#171717] dark:text-[#fafafa] focus:outline-none focus:ring-2 focus:ring-[#B84E9D] focus:border-[#B84E9D] hover:border-[#a3a3a3] transition-all shadow-sm cursor-pointer";

const SelectWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative">
    {children}
    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none material-symbols-outlined text-[#a3a3a3]">expand_more</span>
  </div>
);

// --- TYPES ---
interface SupplierData {
    id: string;
    name: string;
    type: string;
    sector: string;
    status: 'active' | 'inactive' | 'pending';
    email: string;
    phone: string;
}

interface VisibleColumns {
    supplier: boolean;
    type: boolean;
    sector: boolean;
    status: boolean;
    email: boolean;
    phone: boolean;
    actions: boolean;
}

interface VisibleCardFields {
    type: boolean;
    sector: boolean;
    email: boolean;
    phone: boolean;
}

// --- MOCK DATA ---
const MOCK_SUPPLIERS: SupplierData[] = Array.from({ length: 100 }, (_, i) => {
    const sectors = ['Logística', 'Oficina', 'Tecnología', 'Servicios', 'Legal', 'Marketing', 'Software', 'Industrial'];
    const types = ['Proveedor Externo', 'Staff Interno', 'Licencias'];
    const statuses: ('active' | 'inactive' | 'pending')[] = ['active', 'active', 'active', 'pending', 'inactive'];
    
    return {
        id: `${i + 1}`,
        name: i % 2 === 0 ? `Proveedor ${i + 1} S.L.` : `Suministros ${i + 1} Global`,
        type: types[i % 3],
        sector: sectors[i % sectors.length],
        status: statuses[i % statuses.length],
        email: `proveedor${i + 1}@email.com`,
        phone: `+34 6${Math.floor(Math.random() * 10)} ${Math.floor(Math.random() * 100).toString().padStart(3,'0')} ${Math.floor(Math.random() * 100).toString().padStart(3,'0')}`
    };
});

const MOCK_DOCS = [
    { id: 1, name: 'Contrato de Proveedor.pdf', date: '2023-10-15', size: '2.4 MB', type: 'pdf', category: 'Presupuestos' },
    { id: 2, name: 'Acuerdo de Nivel de Servicio.docx', date: '2023-10-15', size: '1.1 MB', type: 'doc', category: 'Otros' },
    { id: 3, name: 'Factura F-PROV-001.pdf', date: '2023-11-01', size: '0.8 MB', type: 'pdf', category: 'Facturas' },
    { id: 4, name: 'Certificado Hacienda.pdf', date: '2022-05-20', size: '5.6 MB', type: 'pdf', category: 'Otros' },
    { id: 5, name: 'Albarán Entrega.pdf', date: '2023-11-05', size: '0.5 MB', type: 'pdf', category: 'Albaranes' },
    { id: 6, name: 'Pedido Compra.pdf', date: '2023-11-02', size: '0.6 MB', type: 'pdf', category: 'Pedidos' },
];

// --- COMPONENT: SUPPLIER CARD (GRID ITEM) ---
const SupplierCard: React.FC<{ supplier: SupplierData, onViewDetails: (id: string) => void, visibleFields: VisibleCardFields }> = ({ supplier, onViewDetails, visibleFields }) => {
    const { t } = useLanguage();
    return (
        <div className="bg-white dark:bg-[#131B29] rounded-2xl p-5 border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-card hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col group h-full cursor-pointer">
            {/* Header: Avatar + Status */}
            <div className="flex justify-between items-start mb-4">
                <div className="h-12 w-12 rounded-full bg-[#f5f5f5] dark:bg-[#2A3B5A] flex items-center justify-center text-[#525252] dark:text-[#d4d4d4] font-bold text-lg border border-[#e5e5e5] dark:border-[#2A3B5A] group-hover:bg-[#B84E9D] group-hover:text-white group-hover:border-transparent transition-colors">
                    {supplier.name.substring(0, 2).toUpperCase()}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                    supplier.status === 'active' 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' 
                    : supplier.status === 'pending'
                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                    : 'bg-[#f5f5f5] dark:bg-[#2A3B5A] text-[#737373] dark:text-[#a3a3a3] border-[#e5e5e5] dark:border-[#2A3B5A]'
                }`}>
                    {t(`common.statusLabels.${supplier.status}`)}
                </span>
            </div>

            {/* Content: Name & Info */}
            <div className="flex-1 mb-4">
                <h4 className="text-base font-bold text-[#171717] dark:text-[#fafafa] brand-font leading-tight mb-1 line-clamp-1" title={supplier.name}>
                    {supplier.name}
                </h4>
                
                {(visibleFields.type || visibleFields.sector) && (
                    <p className="text-xs text-[#a3a3a3] font-medium mb-3">
                        {visibleFields.type && <span>{supplier.type}</span>}
                        {visibleFields.type && visibleFields.sector && <span> • </span>}
                        {visibleFields.sector && <span>{supplier.sector}</span>}
                    </p>
                )}
                
                <div className="space-y-1.5">
                    {visibleFields.email && (
                        <div className="flex items-center gap-2 text-sm text-[#525252] dark:text-[#d4d4d4]">
                            <span className="material-symbols-outlined text-[16px] text-[#a3a3a3]">mail</span>
                            <span className="truncate text-xs" title={supplier.email}>{supplier.email}</span>
                        </div>
                    )}
                    {visibleFields.phone && (
                        <div className="flex items-center gap-2 text-sm text-[#525252] dark:text-[#d4d4d4]">
                            <span className="material-symbols-outlined text-[16px] text-[#a3a3a3]">call</span>
                            <span className="text-xs">{supplier.phone}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer: Action */}
            <div className="pt-4 border-t border-[#e5e5e5] dark:border-[#2A3B5A] mt-auto">
                <button 
                    onClick={() => onViewDetails(supplier.id)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#fafafa] dark:bg-[#1B273B] text-[#525252] dark:text-[#d4d4d4] text-xs font-bold hover:bg-[#e5e5e5] dark:hover:bg-[#2A3B5A] transition-colors group-hover:text-[#B84E9D] dark:group-hover:text-white"
                >
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    {t('common.viewDetails')}
                </button>
            </div>
        </div>
    );
};

// --- COMPONENT: SUPPLIER TABLE (LIST ITEM) ---
const SupplierTable: React.FC<{ suppliers: SupplierData[], onViewDetails: (id: string) => void, visibleColumns: VisibleColumns }> = ({ suppliers, onViewDetails, visibleColumns }) => {
  const { t } = useLanguage();
  return (
  <div className="bg-white dark:bg-[#131B29] rounded-2xl border border-[#e5e5e5] dark:border-[#2A3B5A] overflow-hidden shadow-table animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead>
          <tr className="bg-[#fafafa] dark:bg-[#1B273B] border-b border-[#e5e5e5] dark:border-[#2A3B5A]">
            {visibleColumns.supplier && <th className="px-6 py-3 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">{t('suppliers.table.supplier')}</th>}
            {visibleColumns.type && <th className="px-6 py-3 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">{t('suppliers.table.type')}</th>}
            {visibleColumns.sector && <th className="px-6 py-3 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">{t('suppliers.table.sector')}</th>}
            {visibleColumns.status && <th className="px-6 py-3 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">{t('common.status')}</th>}
            {visibleColumns.email && <th className="px-6 py-3 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">{t('suppliers.table.email')}</th>}
            {visibleColumns.phone && <th className="px-6 py-3 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">{t('suppliers.table.phone')}</th>}
            {visibleColumns.actions && <th className="px-6 py-3 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider text-right">{t('common.actions')}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e5e5e5] dark:divide-[#2A3B5A]">
          {suppliers.map((supplier, index) => (
            <tr 
                key={supplier.id} 
                className={`hover:bg-[#fafafa] dark:hover:bg-[#1B273B] transition-colors group cursor-pointer ${index % 2 !== 0 ? 'bg-gray-50/50 dark:bg-white/5' : ''}`}
                onClick={() => onViewDetails(supplier.id)}
            >
              {visibleColumns.supplier && (
                <td className="px-6 py-1">
                    <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[#f5f5f5] dark:bg-[#2A3B5A] flex items-center justify-center text-[#525252] dark:text-[#d4d4d4] font-bold text-xs border border-[#e5e5e5] dark:border-[#2A3B5A] group-hover:bg-[#B84E9D] group-hover:text-white group-hover:border-[#B84E9D] transition-colors">
                        {supplier.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="font-bold text-sm text-[#171717] dark:text-[#fafafa]">{supplier.name}</span>
                    </div>
                </td>
              )}
              {visibleColumns.type && <td className="px-6 py-1 text-sm text-[#525252] dark:text-[#d4d4d4]">{supplier.type}</td>}
              {visibleColumns.sector && <td className="px-6 py-1 text-sm text-[#525252] dark:text-[#d4d4d4]">{supplier.sector}</td>}
              {visibleColumns.status && (
                <td className="px-6 py-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                        supplier.status === 'active' 
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' 
                        : supplier.status === 'pending'
                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                        : 'bg-[#f5f5f5] dark:bg-[#2A3B5A] text-[#737373] dark:text-[#a3a3a3] border-[#e5e5e5] dark:border-[#2A3B5A]'
                    }`}>
                        {t(`common.statusLabels.${supplier.status}`)}
                    </span>
                </td>
              )}
              {visibleColumns.email && <td className="px-6 py-1 text-sm text-[#525252] dark:text-[#d4d4d4]">{supplier.email}</td>}
              {visibleColumns.phone && <td className="px-6 py-1 text-sm text-[#525252] dark:text-[#d4d4d4] font-mono">{supplier.phone}</td>}
              {visibleColumns.actions && (
                <td className="px-6 py-1 text-right">
                    <button onClick={(e) => { e.stopPropagation(); onViewDetails(supplier.id); }} className="p-1.5 rounded-lg text-[#a3a3a3] hover:text-[#B84E9D] hover:bg-[#FCECF6] dark:hover:bg-[#B84E9D]/20 transition-colors">
                        <span className="material-symbols-outlined text-lg">visibility</span>
                    </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
};

// --- COMPONENT: SUPPLIER DETAILS (VIEW FICHA) ---
const SupplierDetails: React.FC<{ supplier: SupplierData; onBack: () => void }> = ({ supplier, onBack }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'general' | 'docs'>('general');
    
    // Sub-navigation for General Tab
    const [activeGeneralSection, setActiveGeneralSection] = useState('general-data');
    const generalNavItems = [
        { id: 'general-data', label: t('suppliers.form.general'), icon: 'badge' },
        { id: 'address', label: t('suppliers.form.address'), icon: 'location_on' },
        { id: 'contacts', label: t('suppliers.form.contacts'), icon: 'group' },
        { id: 'commercial', label: t('clients.form.commercial'), icon: 'storefront' },
        { id: 'other', label: t('clients.form.other'), icon: 'info' },
    ];

    // Sub-navigation for Documents Tab
    const [activeDocCategory, setActiveDocCategory] = useState('Todos');
    const docCategories = [
        'Todos',
        'Albaranes',
        'Pedidos',
        'Presupuestos',
        'Facturas proforma',
        'Facturas'
    ];

    const scrollToSection = (id: string) => {
        setActiveGeneralSection(id);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const filteredDocs = activeDocCategory === 'Todos' 
        ? MOCK_DOCS 
        : MOCK_DOCS.filter(doc => doc.category === activeDocCategory);

    return (
        <div className="w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20 mt-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 rounded-xl bg-white dark:bg-[#131B29] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#525252] dark:text-[#d4d4d4] hover:bg-[#fafafa] dark:hover:bg-[#1B273B] transition-colors"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <h2 className="text-2xl md:text-3xl font-bold text-[#0B1018] dark:text-[#fafafa]">{supplier.name}</h2>
                            <span className={`w-fit px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                supplier.status === 'active' 
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' 
                                : supplier.status === 'pending'
                                ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                                : 'bg-[#f5f5f5] dark:bg-[#2A3B5A] text-[#737373] dark:text-[#a3a3a3] border-[#e5e5e5] dark:border-[#2A3B5A]'
                            }`}>
                                {t(`common.statusLabels.${supplier.status}`)}
                            </span>
                        </div>
                        <p className="text-sm text-[#737373] dark:text-[#a3a3a3] mt-1">{supplier.type} • {supplier.sector}</p>
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-[#131B29] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#525252] dark:text-[#d4d4d4] font-medium text-sm hover:bg-[#fafafa] dark:hover:bg-[#1B273B] transition-colors">
                        <span className="material-symbols-outlined text-sm">edit</span>
                        {t('common.edit')}
                    </button>
                    <button className="flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#B84E9D] text-white font-medium text-sm hover:bg-[#9C3C86] shadow-md transition-colors">
                        <span className="material-symbols-outlined text-sm">add</span>
                        {t('common.add')}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-[#e5e5e5] dark:border-[#2A3B5A] mb-8 overflow-x-auto">
                <div className="flex space-x-6 min-w-max">
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={`pb-4 px-2 text-sm font-bold transition-all relative ${
                            activeTab === 'general' 
                            ? 'text-[#B84E9D] dark:text-[#B84E9D]' 
                            : 'text-[#737373] dark:text-[#a3a3a3] hover:text-[#171717] dark:hover:text-[#fafafa]'
                        }`}
                    >
                        General
                        {activeTab === 'general' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B84E9D]"></span>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('docs')}
                        className={`pb-4 px-2 text-sm font-bold transition-all relative ${
                            activeTab === 'docs' 
                            ? 'text-[#B84E9D] dark:text-[#B84E9D]' 
                            : 'text-[#737373] dark:text-[#a3a3a3] hover:text-[#171717] dark:hover:text-[#fafafa]'
                        }`}
                    >
                        {t('nav.documents')}
                        {activeTab === 'docs' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#B84E9D]"></span>}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'general' && (
                <div className="flex flex-col lg:flex-row gap-8 items-start justify-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Left Navigation (Sticky) */}
                    <aside className="hidden lg:block w-80 sticky top-24 self-start shrink-0">
                        <div className="bg-white dark:bg-[#131B29] rounded-lg shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] p-2">
                            <nav className="space-y-1">
                                {generalNavItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => scrollToSection(item.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all
                                            ${activeGeneralSection === item.id 
                                                ? 'bg-[#B84E9D] text-white shadow-md' 
                                                : 'text-[#737373] dark:text-[#a3a3a3] hover:bg-[#fafafa] dark:hover:bg-[#1B273B] hover:text-[#171717] dark:hover:text-[#fafafa]'}
                                        `}
                                    >
                                        <span className="material-symbols-outlined text-xl">{item.icon}</span>
                                        {item.label}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    {/* Right Content - Form Layout Style */}
                    <div className="flex-1 w-full max-w-5xl space-y-8 min-w-0">
                        
                        {/* Section: Datos Generales */}
                        <div id="general-data" className="bg-white dark:bg-[#131B29] rounded-lg shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] p-6 md:p-8 scroll-mt-32">
                            <h3 className={`${TYPO.h5} mb-6 flex items-center gap-3 border-b border-[#e5e5e5] dark:border-[#2A3B5A] pb-4`}>
                                <span className="material-symbols-outlined text-[#a3a3a3]">badge</span>
                                {t('suppliers.form.general')}
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-center gap-4 md:col-span-2 mb-2">
                                    <div className="h-16 w-16 rounded-full bg-[#f5f5f5] dark:bg-[#2A3B5A] flex items-center justify-center text-[#525252] dark:text-[#d4d4d4] font-bold text-2xl border border-[#e5e5e5] dark:border-[#2A3B5A]">
                                        {supplier.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h6 className="text-sm font-bold text-[#171717] dark:text-[#fafafa]">{t('clients.form.logo')}</h6>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                     <label className={labelStyles}>{t('suppliers.form.commercialName')}</label>
                                     <input type="text" className={readOnlyInputStyles} value={supplier.name} readOnly />
                                </div>
                                <div className="md:col-span-2">
                                     <label className={labelStyles}>{t('suppliers.form.reason')}</label>
                                     <input type="text" className={readOnlyInputStyles} value={supplier.name} readOnly />
                                </div>
                                <div>
                                    <label className={labelStyles}>{t('clients.table.cif')}</label>
                                    <input type="text" className={`${readOnlyInputStyles} font-mono`} value="B12345678" readOnly />
                                </div>
                                <div>
                                    <label className={labelStyles}>{t('suppliers.form.sector')}</label>
                                    <input type="text" className={readOnlyInputStyles} value={supplier.sector} readOnly />
                                </div>
                                <div>
                                    <label className={labelStyles}>{t('suppliers.table.type')}</label>
                                    <input type="text" className={readOnlyInputStyles} value={supplier.type} readOnly />
                                </div>
                                <div>
                                    <label className={labelStyles}>{t('common.form.web')}</label>
                                    <input type="text" className={readOnlyInputStyles} value="https://www.ejemplo.com" readOnly />
                                </div>
                            </div>
                        </div>

                        {/* Section: Dirección */}
                        <div id="address" className="bg-white dark:bg-[#131B29] rounded-lg shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] p-6 md:p-8 scroll-mt-32">
                            <h3 className={`${TYPO.h5} mb-6 flex items-center gap-3 border-b border-[#e5e5e5] dark:border-[#2A3B5A] pb-4`}>
                                <span className="material-symbols-outlined text-[#a3a3a3]">location_on</span>
                                {t('suppliers.form.address')}
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className={labelStyles}>{t('clients.form.address')}</label>
                                    <input type="text" className={readOnlyInputStyles} value="Calle Principal 123, 1º A" readOnly />
                                </div>
                                <div>
                                    <label className={labelStyles}>{t('clients.form.zip')}</label>
                                    <input type="text" className={readOnlyInputStyles} value="28001" readOnly />
                                </div>
                                <div>
                                    <label className={labelStyles}>{t('clients.form.city')}</label>
                                    <input type="text" className={readOnlyInputStyles} value="Madrid" readOnly />
                                </div>
                                <div>
                                    <label className={labelStyles}>{t('clients.form.province')}</label>
                                    <input type="text" className={readOnlyInputStyles} value="Madrid" readOnly />
                                </div>
                                <div>
                                    <label className={labelStyles}>{t('clients.form.country')}</label>
                                    <input type="text" className={readOnlyInputStyles} value="España" readOnly />
                                </div>
                            </div>
                        </div>

                        {/* Section: Datos de contacto */}
                        <div id="contacts" className="bg-white dark:bg-[#131B29] rounded-lg shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] p-6 md:p-8 scroll-mt-32">
                            <h3 className={`${TYPO.h5} mb-6 flex items-center gap-3 border-b border-[#e5e5e5] dark:border-[#2A3B5A] pb-4`}>
                                <span className="material-symbols-outlined text-[#a3a3a3]">group</span>
                                {t('suppliers.form.contacts')}
                            </h3>
                            <div className="text-center py-8 bg-[#fafafa] dark:bg-[#1B273B] border border-dashed border-[#d4d4d4] dark:border-[#525252] rounded-lg">
                                <p className={`${TYPO.body} font-medium text-[#737373] dark:text-[#a3a3a3]`}>{t('common.form.noContacts')}</p>
                            </div>
                        </div>

                        {/* Section: Información comercial */}
                        <div id="commercial" className="bg-white dark:bg-[#131B29] rounded-lg shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] p-6 md:p-8 scroll-mt-32">
                            <h3 className={`${TYPO.h5} mb-6 flex items-center gap-3 border-b border-[#e5e5e5] dark:border-[#2A3B5A] pb-4`}>
                                <span className="material-symbols-outlined text-[#a3a3a3]">storefront</span>
                                {t('clients.form.commercial')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelStyles}>{t('suppliers.form.emailOrders')}</label>
                                    <input type="text" className={readOnlyInputStyles} value={supplier.email} readOnly />
                                </div>
                                <div>
                                    <label className={labelStyles}>{t('common.form.phone')}</label>
                                    <input type="text" className={readOnlyInputStyles} value={supplier.phone} readOnly />
                                </div>
                                <div>
                                    <label className={labelStyles}>{t('suppliers.form.paymentMethod')}</label>
                                    <input type="text" className={readOnlyInputStyles} value="Transferencia" readOnly />
                                </div>
                                <div>
                                    <label className={labelStyles}>{t('suppliers.form.paymentTerm')}</label>
                                    <input type="text" className={readOnlyInputStyles} value="30 días" readOnly />
                                </div>
                            </div>
                        </div>

                        {/* Section: Otra información */}
                        <div id="other" className="bg-white dark:bg-[#131B29] rounded-lg shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] p-6 md:p-8 scroll-mt-32">
                            <h3 className={`${TYPO.h5} mb-6 flex items-center gap-3 border-b border-[#e5e5e5] dark:border-[#2A3B5A] pb-4`}>
                                <span className="material-symbols-outlined text-[#a3a3a3]">info</span>
                                {t('clients.form.other')}
                            </h3>
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className={labelStyles}>{t('common.form.notes')}</label>
                                    <div className="p-4 bg-[#fafafa] dark:bg-[#1B273B] rounded-lg border border-[#e5e5e5] dark:border-[#2A3B5A]">
                                        <p className="text-sm text-[#525252] dark:text-[#d4d4d4] italic">
                                            Proveedor de confianza. Entregas siempre puntuales. Revisar precios anualmente.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {activeTab === 'docs' && (
                <div className="flex flex-col lg:flex-row gap-8 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Left Navigation (Sticky) for Document Categories */}
                    <aside className="hidden lg:block w-80 sticky top-24 self-start shrink-0">
                        <div className="bg-white dark:bg-[#131B29] rounded-lg shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] p-2">
                            <nav className="space-y-1">
                                {docCategories.map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => setActiveDocCategory(category)}
                                        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all
                                            ${activeDocCategory === category 
                                                ? 'bg-[#B84E9D] text-white shadow-md' 
                                                : 'text-[#737373] dark:text-[#a3a3a3] hover:bg-[#fafafa] dark:hover:bg-[#1B273B] hover:text-[#171717] dark:hover:text-[#fafafa]'}
                                        `}
                                    >
                                        <span>{category === 'Todos' ? t('common.filters.all') : category}</span>
                                        {category === 'Todos' ? (
                                            <span className={`text-xs ${activeDocCategory === category ? 'text-white/80' : 'text-[#a3a3a3]'}`}>{MOCK_DOCS.length}</span>
                                        ) : (
                                            <span className={`text-xs ${activeDocCategory === category ? 'text-white/80' : 'text-[#a3a3a3]'}`}>
                                                {MOCK_DOCS.filter(d => d.category === category).length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    {/* Right Content - Documents Table */}
                    <div className="flex-1 w-full min-w-0">
                        <div className="bg-white dark:bg-[#131B29] rounded-2xl shadow-table border border-[#e5e5e5] dark:border-[#2A3B5A] overflow-hidden">
                            
                            {/* Toolbar */}
                            <div className="p-4 border-b border-[#e5e5e5] dark:border-[#2A3B5A] flex flex-col sm:flex-row gap-4 justify-between items-center">
                                <h4 className={`${TYPO.h5} lg:hidden`}>{activeDocCategory}</h4> {/* Visible only on mobile */}
                                <div className="relative w-full sm:w-auto flex-1 max-w-md">
                                    <span className="absolute left-3 top-2.5 material-symbols-outlined text-[#a3a3a3] text-lg">search</span>
                                    <input 
                                        type="text" 
                                        placeholder={`${t('common.search')} ${activeDocCategory}...`}
                                        className="pl-10 pr-4 py-2 bg-[#fafafa] dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] rounded-lg text-sm font-medium text-[#171717] dark:text-[#fafafa] focus:ring-2 focus:ring-[#B84E9D] outline-none transition-all w-full" 
                                    />
                                </div>
                                <button className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#B84E9D] text-white font-medium text-sm hover:bg-[#9C3C86] shadow-sm transition-colors w-full sm:w-auto">
                                    <span className="material-symbols-outlined text-sm">upload</span>
                                    {t('common.uploadNew')}
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[600px]">
                                    <thead>
                                        <tr className="bg-[#fafafa] dark:bg-[#1B273B] border-b border-[#e5e5e5] dark:border-[#2A3B5A]">
                                            <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Nombre</th>
                                            <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Categoría</th>
                                            <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">{t('common.date')}</th>
                                            <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Tamaño</th>
                                            <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider text-right">{t('common.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#e5e5e5] dark:divide-[#2A3B5A]">
                                        {filteredDocs.length > 0 ? (
                                            filteredDocs.map((doc) => (
                                                <tr key={doc.id} className="hover:bg-[#fafafa] dark:hover:bg-[#1B273B] transition-colors">
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg ${doc.type === 'pdf' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                                                                <span className="material-symbols-outlined text-xl">description</span>
                                                            </div>
                                                            <span className="font-medium text-[#171717] dark:text-[#fafafa] text-sm">{doc.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                                            {doc.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-sm text-[#525252] dark:text-[#d4d4d4]">{doc.date}</td>
                                                    <td className="px-6 py-3 text-sm text-[#525252] dark:text-[#d4d4d4]">{doc.size}</td>
                                                    <td className="px-6 py-3 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button className="p-2 rounded-lg text-[#a3a3a3] hover:text-[#B84E9D] hover:bg-[#FCECF6] dark:hover:bg-[#B84E9D]/20 transition-colors">
                                                                <span className="material-symbols-outlined text-lg">download</span>
                                                            </button>
                                                            <button className="p-2 rounded-lg text-[#a3a3a3] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                                <span className="material-symbols-outlined text-lg">delete</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-[#a3a3a3]">
                                                    <div className="flex flex-col items-center">
                                                        <span className="material-symbols-outlined text-4xl mb-2 text-[#e5e5e5] dark:text-[#2A3B5A]">folder_off</span>
                                                        <p>No hay documentos en esta categoría</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- COMPONENTS: CREATE FORM (FULL PAGE) ---
const SupplierCreatePage: React.FC<{ onCancel: () => void; onSave: (createNew?: boolean) => void }> = ({ onCancel, onSave }) => {
    const { t } = useLanguage();
    const [activeSection, setActiveSection] = useState('general');
    const [supplierType, setSupplierType] = useState<'external' | 'staff' | 'license'>('external');

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const navItems = [
        { id: 'general', label: t('suppliers.form.general'), icon: 'badge' },
        { id: 'address', label: t('suppliers.form.address'), icon: 'location_on' },
        { id: 'contacts', label: t('suppliers.form.contacts'), icon: 'group' },
        { id: 'notes', label: t('common.form.notes'), icon: 'sticky_note_2' },
    ];

    return (
        <div className="w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20 mt-8">
            
            {/* Mobile Navigation for Form Sections */}
            <div className="lg:hidden mb-6 overflow-x-auto pb-2 scrollbar-none">
                <div className="flex space-x-2 min-w-max">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => scrollToSection(item.id)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all border
                                ${activeSection === item.id 
                                    ? 'bg-[#B84E9D] text-white border-[#B84E9D]' 
                                    : 'bg-white dark:bg-[#131B29] text-[#737373] dark:text-[#a3a3a3] border-[#e5e5e5] dark:border-[#2A3B5A]'}
                            `}
                        >
                            <span className="material-symbols-outlined text-lg">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
                {/* Left Navigation (Sticky) - Hidden on Mobile */}
                <aside className="hidden lg:block w-80 sticky top-8 self-start shrink-0">
                    <div className="bg-white dark:bg-[#131B29] rounded-lg shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] p-2">
                        <nav className="space-y-1">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => scrollToSection(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all
                                        ${activeSection === item.id 
                                            ? 'bg-[#B84E9D] text-white shadow-md' 
                                            : 'text-[#737373] dark:text-[#a3a3a3] hover:bg-[#fafafa] dark:hover:bg-[#1B273B] hover:text-[#171717] dark:hover:text-[#fafafa]'}
                                    `}
                                >
                                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Right Form Content */}
                <div className="flex-1 w-full max-w-5xl space-y-8 min-w-0">
                    
                    {/* SECTION: GENERAL */}
                    <div id="general" className="bg-white dark:bg-[#131B29] rounded-lg shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] p-6 md:p-8 scroll-mt-28">
                        <h3 className={`${TYPO.h5} mb-8 pb-4 border-b border-[#e5e5e5] dark:border-[#2A3B5A] flex items-center gap-3`}>
                            <span className="material-symbols-outlined text-[#a3a3a3]">badge</span>
                            {t('suppliers.form.general')}
                        </h3>
                        
                        <div className="space-y-8">
                            <div>
                                <label className={labelStyles}>{t('suppliers.form.category')}</label>
                                <SelectWrapper>
                                    <select 
                                        className={selectStyles}
                                        value={supplierType}
                                        onChange={(e) => setSupplierType(e.target.value as any)}
                                    >
                                        <option value="external">{t('suppliers.filters.external')}</option>
                                        <option value="staff">{t('suppliers.filters.staff')}</option>
                                        <option value="license">{t('suppliers.filters.license')}</option>
                                    </select>
                                </SelectWrapper>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className={labelStyles}>{t('suppliers.form.commercialName')} <span className="text-[#ef4444]">*</span></label>
                                    <input type="text" className={inputStyles} />
                                </div>
                                {(supplierType === 'external' || supplierType === 'license') && (
                                    <div className="md:col-span-2">
                                        <label className={labelStyles}>{t('suppliers.form.reason')}</label>
                                        <input type="text" className={inputStyles} />
                                    </div>
                                )}
                                <div>
                                    <label className={labelStyles}>{(supplierType === 'external' || supplierType === 'license') ? 'CIF' : 'DNI / NIF'} <span className="text-[#ef4444]">*</span></label>
                                    <input type="text" className={`${inputStyles} font-mono`} placeholder="A12345678" />
                                </div>
                                <div>
                                    <label className={labelStyles}>{t('suppliers.form.sector')}</label>
                                    <input type="text" className={inputStyles} placeholder="Ej. Logística, Servicios..." />
                                </div>
                                <div>
                                    <label className={labelStyles}>{t('suppliers.form.emailOrders')}</label>
                                    <input type="email" className={inputStyles} placeholder="pedidos@empresa.com" />
                                </div>
                                <div>
                                    <label className={labelStyles}>{t('common.form.phone')}</label>
                                    <input type="tel" className={inputStyles} placeholder="+34 000 000 000" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelStyles}>{t('common.form.web')}</label>
                                    <input type="url" className={inputStyles} placeholder="https://www.ejemplo.com" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: ADDRESS */}
                    <div id="address" className="bg-white dark:bg-[#131B29] rounded-lg shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] p-6 md:p-8 scroll-mt-28">
                         <h3 className={`${TYPO.h5} mb-8 pb-4 border-b border-[#e5e5e5] dark:border-[#2A3B5A] flex items-center gap-3`}>
                            <span className="material-symbols-outlined text-[#a3a3a3]">location_on</span>
                            {t('suppliers.form.address')}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="md:col-span-2">
                                <label className={labelStyles}>{t('clients.form.address')}</label>
                                <input type="text" className={inputStyles} placeholder="Calle, número, piso..." />
                            </div>
                            <div>
                                <label className={labelStyles}>{t('clients.form.city')}</label>
                                <input type="text" className={inputStyles} />
                            </div>
                            <div>
                                <label className={labelStyles}>{t('clients.form.zip')}</label>
                                <input type="text" className={inputStyles} />
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelStyles}>{t('clients.form.country')}</label>
                                <SelectWrapper>
                                    <select className={selectStyles}>
                                        <option value="España">España</option>
                                        <option value="Reino Unido">Reino Unido</option>
                                        <option value="Francia">Francia</option>
                                        <option value="Portugal">Portugal</option>
                                        <option value="USA">Estados Unidos</option>
                                    </select>
                                </SelectWrapper>
                            </div>
                        </div>

                        <div className="bg-[#fafafa] dark:bg-[#1B273B] rounded-lg p-6 md:p-8 border border-[#e5e5e5] dark:border-[#2A3B5A]">
                            <h4 className={`${TYPO.label} mb-6 text-[#0B1018] dark:text-[#fafafa] font-semibold uppercase tracking-wider`}>{t('suppliers.form.bankData')}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className={labelStyles}>IBAN</label>
                                    <input type="text" className={`${inputStyles} font-mono`} placeholder="ES00 0000 0000 0000 0000 0000" />
                                </div>
                                <div>
                                    <label className={labelStyles}>{t('suppliers.form.paymentMethod')}</label>
                                    <SelectWrapper>
                                        <select className={selectStyles}>
                                            <option>Transferencia</option>
                                            <option>Recibo Domiciliado</option>
                                            <option>Tarjeta Crédito</option>
                                        </select>
                                    </SelectWrapper>
                                </div>
                                <div>
                                    <label className={labelStyles}>{t('suppliers.form.paymentTerm')}</label>
                                    <SelectWrapper>
                                        <select className={selectStyles}>
                                            <option>Contado</option>
                                            <option>30 días</option>
                                            <option>60 días</option>
                                        </select>
                                    </SelectWrapper>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: CONTACTS */}
                    <div id="contacts" className="bg-white dark:bg-[#131B29] rounded-lg shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] p-6 md:p-8 scroll-mt-28">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#e5e5e5] dark:border-[#2A3B5A]">
                            <h3 className={`${TYPO.h5} flex items-center gap-3`}>
                                <span className="material-symbols-outlined text-[#a3a3a3]">group</span>
                                {t('suppliers.form.contacts')}
                            </h3>
                            <button className="text-xs font-bold bg-white dark:bg-[#1B273B] border border-[#B84E9D] text-[#B84E9D] px-4 py-2 rounded-lg hover:bg-[#FCECF6] dark:hover:bg-[#B84E9D]/10 transition-colors flex items-center gap-2 shadow-sm">
                                <span className="material-symbols-outlined text-sm">add</span>
                                {t('common.form.addFile')}
                            </button>
                        </div>
                        
                        <div className="text-center py-12 bg-[#fafafa] dark:bg-[#1B273B] border border-dashed border-[#d4d4d4] dark:border-[#525252] rounded-lg">
                            <div className="w-14 h-14 bg-white dark:bg-[#131B29] rounded-full flex items-center justify-center mx-auto mb-4 shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A]">
                                <span className="material-symbols-outlined text-[#a3a3a3] text-2xl">person_add</span>
                            </div>
                            <p className={`${TYPO.body} font-medium text-[#737373] dark:text-[#a3a3a3]`}>{t('common.form.noContacts')}</p>
                            <p className={`${TYPO.small} text-[#a3a3a3] mt-1`}>{t('common.form.noContactsDesc')}</p>
                        </div>
                    </div>

                     {/* SECTION: NOTES */}
                     <div id="notes" className="bg-white dark:bg-[#131B29] rounded-lg shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] p-6 md:p-8 scroll-mt-28">
                        <h3 className={`${TYPO.h5} mb-8 pb-4 border-b border-[#e5e5e5] dark:border-[#2A3B5A] flex items-center gap-3`}>
                            <span className="material-symbols-outlined text-[#a3a3a3]">sticky_note_2</span>
                            {t('common.form.notes')}
                        </h3>
                        <label className={labelStyles}>{t('common.form.notes')}</label>
                        <textarea 
                            className={`w-full flex-1 min-h-[120px] px-4 py-3 bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] rounded-md ${TYPO.input} placeholder:text-[#a3a3a3] dark:placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-[#B84E9D] focus:border-[#B84E9D] hover:border-[#a3a3a3] transition-all shadow-sm resize-none`}
                            placeholder={t('common.form.notesPlaceholder')}
                        />
                    </div>

                    {/* FOOTER ACTIONS - STICKY */}
                    <div className="sticky bottom-0 z-20 flex flex-col-reverse sm:flex-row justify-end gap-4 py-4 mt-4 bg-neutral-50/95 dark:bg-[#0B1018]/95 backdrop-blur border-t border-[#e5e5e5] dark:border-[#2A3B5A]">
                        <button 
                            onClick={onCancel} 
                            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-[#d4d4d4] dark:border-[#2A3B5A] text-[#525252] dark:text-[#d4d4d4] font-medium text-sm hover:bg-[#fafafa] dark:hover:bg-[#1B273B] transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                            {t('common.cancel')}
                        </button>
                        <button 
                            onClick={() => onSave(true)} 
                            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white dark:bg-[#131B29] border border-[#B84E9D] text-[#B84E9D] font-medium text-sm hover:bg-[#FCECF6] dark:hover:bg-[#B84E9D]/10 transition-colors shadow-sm"
                        >
                            <span className="material-symbols-outlined text-lg">add_task</span>
                            {t('common.form.saveNew')}
                        </button>
                        <button 
                            onClick={() => onSave(false)} 
                            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#B84E9D] text-white font-medium text-sm hover:bg-[#9C3C86] shadow-md transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">check</span>
                            {t('common.form.saveExit')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: AI DASHBOARD (SCREEN 0) ---
const SupplierDashboard: React.FC<{ onCreateNew: () => void, onShowList: () => void, onCardClick: (type: 'active' | 'new' | 'pending_invoices' | 'incidents') => void }> = ({ onCreateNew, onShowList, onCardClick }) => {
// ... existing dashboard code ...
    const { t } = useLanguage();
    
    const kpiCards = [
        { id: 'active', label: t('suppliers.dashboard.active'), value: '42', trend: '+2 este mes', icon: 'storefront', color: 'bg-blue-50 text-[#0A1B4F] dark:bg-blue-900/20 dark:text-blue-300' },
        { id: 'new', label: t('suppliers.dashboard.new'), value: '3', trend: t('suppliers.dashboard.trendNew'), icon: 'domain_add', color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
        { id: 'pending_invoices', label: t('suppliers.dashboard.pendingInvoices'), value: '15', trend: t('suppliers.dashboard.trendPending'), icon: 'receipt_long', color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' },
        { id: 'incidents', label: t('suppliers.dashboard.incidents'), value: '1', trend: t('suppliers.dashboard.trendIncidents'), icon: 'report_problem', color: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
    ];

    const recentActivity = [
        { text: 'Se registró nuevo proveedor "Papelería Central"', time: 'Hace 2 días', icon: 'add_business', color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
        { text: 'Se aprobó factura de "Tech Services"', time: 'Hace 5 horas', icon: 'check_circle', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
        { text: 'Contrato vencido con "Limpiezas SL"', time: 'Hace 1 semana', icon: 'event_busy', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
        { text: 'Actualización de datos bancarios "Consultoría Global"', time: 'Hace 3 días', icon: 'account_balance', color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Módulo 1: Insights IA (KPIs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((kpi, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => onCardClick(kpi.id as any)}
                        className="bg-white dark:bg-[#131B29] rounded-2xl p-5 border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-card flex items-center gap-4 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer text-left w-full"
                    >
                        <div className={`p-3 rounded-xl ${kpi.color}`}>
                            <span className="material-symbols-outlined text-2xl">{kpi.icon}</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[#737373] dark:text-[#a3a3a3] uppercase tracking-wider">{kpi.label}</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">{kpi.value}</span>
                            </div>
                            <p className="text-[10px] font-medium text-[#525252] dark:text-[#d4d4d4] mt-0.5">{kpi.trend}</p>
                        </div>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Activity & Alerts (2/3) */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Módulo 3: Alertas IA */}
                    <div className="bg-white dark:bg-[#131B29] rounded-2xl shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#e5e5e5] dark:border-[#2A3B5A] bg-[#fafafa] dark:bg-[#1B273B] flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500">warning</span>
                            <h5 className={TYPO.h5}>{t('suppliers.dashboard.alertsTitle')}</h5>
                        </div>
                        <div className="divide-y divide-[#e5e5e5] dark:divide-[#2A3B5A]">
                            <div className="p-5 flex items-start gap-4 hover:bg-[#fafafa] dark:hover:bg-[#1B273B] transition-colors cursor-pointer">
                                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 shrink-0">
                                    <span className="material-symbols-outlined">description</span>
                                </div>
                                <div className="flex-1">
                                    <h6 className="text-sm font-bold text-[#171717] dark:text-[#fafafa]">Certificado Tributario Caducado</h6>
                                    <p className="text-sm text-[#525252] dark:text-[#a3a3a3] mt-1">El proveedor "Construcciones Norte" tiene el certificado caducado desde hace 3 días.</p>
                                </div>
                                <span className="material-symbols-outlined text-[#a3a3a3]">chevron_right</span>
                            </div>
                            <div className="p-5 flex items-start gap-4 hover:bg-[#fafafa] dark:hover:bg-[#1B273B] transition-colors cursor-pointer">
                                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400 shrink-0">
                                    <span className="material-symbols-outlined">price_change</span>
                                </div>
                                <div className="flex-1">
                                    <h6 className="text-sm font-bold text-[#171717] dark:text-[#fafafa]">Variación de Precios Detectada</h6>
                                    <p className="text-sm text-[#525252] dark:text-[#a3a3a3] mt-1">Los servicios de "Logística Express" han subido un 12% este mes.</p>
                                </div>
                                <span className="material-symbols-outlined text-[#a3a3a3]">chevron_right</span>
                            </div>
                        </div>
                    </div>

                     {/* Módulo 2: Actividad Reciente */}
                    <div className="bg-white dark:bg-[#131B29] rounded-2xl shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] p-6">
                        <div className="flex justify-between items-center mb-6">
                             <h5 className={TYPO.h5}>{t('suppliers.dashboard.activityTitle')}</h5>
                             <button className="text-xs font-bold text-[#0A1B4F] dark:text-[#B84E9D] hover:underline">{t('home.alerts.viewAll')}</button>
                        </div>
                        <div className="space-y-6 pl-2">
                            {recentActivity.map((act, idx) => (
                                <div key={idx} className="relative flex gap-4">
                                    {/* Vertical Line */}
                                    {idx !== recentActivity.length - 1 && (
                                        <div className="absolute left-[15px] top-8 bottom-[-24px] w-0.5 bg-[#e5e5e5] dark:bg-[#2A3B5A]"></div>
                                    )}
                                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-sm shrink-0 ${act.color}`}>
                                        <span className="material-symbols-outlined text-[18px]">{act.icon}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[#171717] dark:text-[#fafafa]">{act.text}</p>
                                        <p className="text-xs text-[#737373] dark:text-[#a3a3a3] mt-0.5">{act.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Right Column: Shortcuts & Recommendations (1/3) */}
                <div className="space-y-8">
                    
                    {/* Módulo 4: Atajos Rápidos */}
                    <div className="bg-white dark:bg-[#131B29] rounded-2xl shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] p-6">
                        <h5 className={`${TYPO.h5} mb-4`}>{t('suppliers.dashboard.shortcutsTitle')}</h5>
                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={onShowList} className="flex items-center gap-3 p-3 rounded-xl bg-[#fafafa] dark:bg-[#1B273B] hover:bg-[#e5e5e5] dark:hover:bg-[#2A3B5A] transition-colors text-left group border border-transparent hover:border-[#d4d4d4] dark:hover:border-[#525252]">
                                <div className="bg-white dark:bg-[#0B1018] p-2 rounded-lg shadow-sm text-[#0A1B4F] dark:text-white group-hover:text-[#B84E9D]">
                                    <span className="material-symbols-outlined">list</span>
                                </div>
                                <span className="text-sm font-bold text-[#525252] dark:text-[#fafafa] group-hover:text-[#171717]">{t('nav.listSuppliers')}</span>
                            </button>
                            <button onClick={onCreateNew} className="flex items-center gap-3 p-3 rounded-xl bg-[#fafafa] dark:bg-[#1B273B] hover:bg-[#e5e5e5] dark:hover:bg-[#2A3B5A] transition-colors text-left group border border-transparent hover:border-[#d4d4d4] dark:hover:border-[#525252]">
                                <div className="bg-white dark:bg-[#0B1018] p-2 rounded-lg shadow-sm text-[#B84E9D] dark:text-[#B84E9D] group-hover:text-[#9C3C86]">
                                    <span className="material-symbols-outlined">add_business</span>
                                </div>
                                <span className="text-sm font-bold text-[#525252] dark:text-[#fafafa] group-hover:text-[#171717]">{t('suppliers.newBtn')}</span>
                            </button>
                            <button className="flex items-center gap-3 p-3 rounded-xl bg-[#fafafa] dark:bg-[#1B273B] hover:bg-[#e5e5e5] dark:hover:bg-[#2A3B5A] transition-colors text-left group border border-transparent hover:border-[#d4d4d4] dark:hover:border-[#525252]">
                                <div className="bg-white dark:bg-[#0B1018] p-2 rounded-lg shadow-sm text-[#0A1B4F] dark:text-white group-hover:text-[#B84E9D]">
                                    <span className="material-symbols-outlined">upload_file</span>
                                </div>
                                <span className="text-sm font-bold text-[#525252] dark:text-[#fafafa] group-hover:text-[#171717]">{t('common.uploadNew')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Módulo 5: Recomendaciones IA */}
                    <div className="bg-gradient-to-br from-[#0A1B4F] to-[#1B273B] dark:from-[#B84E9D]/20 dark:to-[#1B273B] rounded-2xl shadow-card p-6 text-white relative overflow-hidden border border-[#2A3B5A]">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <span className="material-symbols-outlined text-8xl">auto_awesome</span>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3 text-[#B84E9D] dark:text-[#fafafa]">
                                <span className="material-symbols-outlined">auto_awesome</span>
                                <span className="text-xs font-bold uppercase tracking-widest">Sugerencia IA</span>
                            </div>
                            <h4 className="text-lg font-bold mb-2 text-white">{t('suppliers.dashboard.suggestionsTitle')}</h4>
                            <p className="text-sm text-blue-100 dark:text-slate-300 mb-6 leading-relaxed">
                                {t('suppliers.dashboard.suggestionsDesc')}
                            </p>
                            <button className="w-full py-2.5 bg-white text-[#0A1B4F] rounded-xl text-sm font-bold hover:bg-[#f5f5f5] transition-colors shadow-sm">
                                Ver detalle de facturación
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

// --- MAIN MODULE COMPONENT ---

interface SuppliersModuleProps {
    viewMode: 'dashboard' | 'list' | 'create' | 'details';
    onViewChange: (view: 'dashboard' | 'list' | 'create' | 'details') => void;
    onGoBack: () => void;
}

export const SuppliersModule: React.FC<SuppliersModuleProps> = ({ viewMode, onViewChange, onGoBack }) => {
// ... existing main component code ...
    const { t } = useLanguage();
    // Local state for list view format (Cards vs Table)
    const [viewFormat, setViewFormat] = useState<'cards' | 'table'>('cards');
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterState, setFilterState] = useState({
        active: true,
        inactive: true,
        pending: true,
        external: true,
        staff: true,
        license: true
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    // Table Settings State (Column Visibility)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
        supplier: true,
        type: true,
        sector: true,
        status: true,
        email: true,
        phone: true,
        actions: true
    });

    // Card Settings State (Field Visibility)
    const [isCardSettingsOpen, setIsCardSettingsOpen] = useState(false);
    const [visibleCardFields, setVisibleCardFields] = useState<VisibleCardFields>({
        type: true,
        sector: true,
        email: true,
        phone: true,
    });

    const handleViewDetails = (id: string) => {
        setSelectedSupplierId(id);
        onViewChange('details');
    };

    const handleDashboardCardClick = (cardType: 'active' | 'new' | 'pending_invoices' | 'incidents') => {
        // Reset filters
        const newFilters = {
            active: false,
            inactive: false,
            pending: false,
            external: true,
            staff: true,
            license: true
        };

        if (cardType === 'active') {
            newFilters.active = true;
            setViewFormat('table');
        } else if (cardType === 'new') {
            newFilters.active = true;
            newFilters.pending = true;
            setViewFormat('cards');
        } else if (cardType === 'pending_invoices') {
            // Mapping to Pending status for demo purpose as requested
            newFilters.pending = true;
            setViewFormat('table');
        } else if (cardType === 'incidents') {
            // Mapping to Inactive status for demo purpose as requested ("en riesgo" equivalent)
            newFilters.inactive = true;
            setViewFormat('table');
        }

        setFilterState(newFilters);
        onViewChange('list');
    };

    // Filter Logic
    const filteredSuppliers = MOCK_SUPPLIERS.filter(supplier => {
        // Search Filter
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            if (!supplier.name.toLowerCase().includes(lowerTerm) && !supplier.email.toLowerCase().includes(lowerTerm)) {
                return false;
            }
        }

        // Status Filter
        if (supplier.status === 'active' && !filterState.active) return false;
        if (supplier.status === 'inactive' && !filterState.inactive) return false;
        if (supplier.status === 'pending' && !filterState.pending) return false;
        
        // Type Filter
        if (supplier.type === 'Proveedor Externo' && !filterState.external) return false;
        if (supplier.type === 'Staff Interno' && !filterState.staff) return false;
        if (supplier.type === 'Licencias' && !filterState.license) return false;
        
        return true;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredSuppliers.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    if (viewMode === 'create') {
        return (
            <SupplierCreatePage 
                onCancel={() => onViewChange('list')} 
                onSave={(createNew) => {
                    if (!createNew) {
                        onViewChange('list');
                    } else {
                        console.log("Saved, ready for new");
                    }
                }} 
            />
        );
    }

    if (viewMode === 'details') {
        const selectedSupplier = MOCK_SUPPLIERS.find(s => s.id === selectedSupplierId) || MOCK_SUPPLIERS[0];
        return (
            <SupplierDetails 
                supplier={selectedSupplier} 
                onBack={() => onViewChange('list')} 
            />
        );
    }

    // --- VIEW: DASHBOARD ---
    if (viewMode === 'dashboard') {
        return (
            <div className="w-full px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    {/* Back Button */}
                    <button 
                        onClick={onGoBack}
                        className="p-2.5 rounded-xl bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] hover:border-[#d4d4d4] transition-colors shadow-sm"
                        title={t('common.backToMenu')}
                    >
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    </button>

                    <button 
                        onClick={() => onViewChange('create')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#B84E9D] text-white font-semibold hover:bg-[#9C3C86] transition-colors shadow-md shadow-brand-500/20 w-full md:w-auto justify-center"
                    >
                        <span className="material-symbols-outlined text-lg">add_business</span>
                        {t('suppliers.newBtn')}
                    </button>
                </div>

                <SupplierDashboard 
                    onCreateNew={() => onViewChange('create')} 
                    onShowList={() => onViewChange('list')} 
                    onCardClick={handleDashboardCardClick}
                />
            </div>
        );
    }

    // --- VIEW: LIST ---
    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* List View Header/Toolbar */}
            <div className="flex flex-col xl:flex-row items-center justify-between gap-4 mb-8">
                
                {/* Left: Back Button Only */}
                <div className="flex items-center gap-4 w-full xl:w-auto">
                     <button 
                        onClick={() => onViewChange('dashboard')}
                        className="p-2.5 rounded-xl bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] hover:border-[#d4d4d4] transition-colors shadow-sm"
                        title={t('common.backToDashboard')}
                    >
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    </button>
                </div>

                {/* Right: Search, Filter, Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto justify-end">
                    
                    {/* Search Input (Moved here) */}
                    <div className="relative group w-full sm:w-64">
                        <span className="absolute left-3 top-2.5 material-symbols-outlined text-[#a3a3a3] text-lg group-focus-within:text-[#B84E9D]">search</span>
                        <input 
                            type="text" 
                            placeholder={t('suppliers.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] rounded-xl text-sm font-medium text-[#171717] dark:text-[#fafafa] focus:ring-2 focus:ring-[#B84E9D] focus:bg-white dark:focus:bg-[#131B29] outline-none transition-all" 
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {/* Filter Button & Dropdown */}
                        <div className="relative flex-1 sm:flex-none">
                            <button 
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`w-full sm:w-auto justify-center flex p-2.5 rounded-xl border transition-colors shadow-sm ${isFilterOpen ? 'bg-[#FCECF6] border-[#B84E9D] text-[#B84E9D]' : 'bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] hover:border-[#d4d4d4] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4]'}`}
                                title={t('common.filterBy')}
                            >
                                <span className="material-symbols-outlined text-[20px]">filter_list</span>
                            </button>
                            
                            {isFilterOpen && (
                                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-[#1B273B] rounded-xl shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] z-30 p-5 animate-in fade-in zoom-in-95 duration-200">
                                    {/* Header */}
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-sm font-bold text-[#171717] dark:text-white">{t('common.filterBy')}</span>
                                        <button 
                                            onClick={() => setFilterState({active: true, inactive: true, pending: true, external: true, staff: true, license: true})} 
                                            className="text-xs text-[#B84E9D] hover:underline"
                                        >
                                            {t('common.reset')}
                                        </button>
                                    </div>
                                    
                                    {/* Status Section */}
                                    <div className="mb-4">
                                        <h6 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mb-2">{t('common.status')}</h6>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-3 cursor-pointer group select-none">
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${filterState.active ? 'bg-[#B84E9D] border-[#B84E9D]' : 'bg-white dark:bg-[#0B1018] border-[#d4d4d4] dark:border-[#525252] group-hover:border-[#B84E9D]'}`}>
                                                    {filterState.active && <span className="material-symbols-outlined text-white text-sm font-bold">check</span>}
                                                </div>
                                                <input type="checkbox" className="hidden" checked={filterState.active} onChange={() => setFilterState({...filterState, active: !filterState.active})} />
                                                <span className="text-sm text-[#525252] dark:text-[#d4d4d4]">{t('common.statusLabels.active')}</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer group select-none">
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${filterState.inactive ? 'bg-[#B84E9D] border-[#B84E9D]' : 'bg-white dark:bg-[#0B1018] border-[#d4d4d4] dark:border-[#525252] group-hover:border-[#B84E9D]'}`}>
                                                    {filterState.inactive && <span className="material-symbols-outlined text-white text-sm font-bold">check</span>}
                                                </div>
                                                <input type="checkbox" className="hidden" checked={filterState.inactive} onChange={() => setFilterState({...filterState, inactive: !filterState.inactive})} />
                                                <span className="text-sm text-[#525252] dark:text-[#d4d4d4]">{t('common.statusLabels.inactive')}</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer group select-none">
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${filterState.pending ? 'bg-[#B84E9D] border-[#B84E9D]' : 'bg-white dark:bg-[#0B1018] border-[#d4d4d4] dark:border-[#525252] group-hover:border-[#B84E9D]'}`}>
                                                    {filterState.pending && <span className="material-symbols-outlined text-white text-sm font-bold">check</span>}
                                                </div>
                                                <input type="checkbox" className="hidden" checked={filterState.pending} onChange={() => setFilterState({...filterState, pending: !filterState.pending})} />
                                                <span className="text-sm text-[#525252] dark:text-[#d4d4d4]">{t('common.statusLabels.pending')}</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Type Section */}
                                    <div>
                                        <h6 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mb-2">{t('suppliers.filters.category')}</h6>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-3 cursor-pointer group select-none">
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${filterState.external ? 'bg-[#B84E9D] border-[#B84E9D]' : 'bg-white dark:bg-[#0B1018] border-[#d4d4d4] dark:border-[#525252] group-hover:border-[#B84E9D]'}`}>
                                                    {filterState.external && <span className="material-symbols-outlined text-white text-sm font-bold">check</span>}
                                                </div>
                                                <input type="checkbox" className="hidden" checked={filterState.external} onChange={() => setFilterState({...filterState, external: !filterState.external})} />
                                                <span className="text-sm text-[#525252] dark:text-[#d4d4d4]">{t('suppliers.filters.external')}</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer group select-none">
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${filterState.staff ? 'bg-[#B84E9D] border-[#B84E9D]' : 'bg-white dark:bg-[#0B1018] border-[#d4d4d4] dark:border-[#525252] group-hover:border-[#B84E9D]'}`}>
                                                    {filterState.staff && <span className="material-symbols-outlined text-white text-sm font-bold">check</span>}
                                                </div>
                                                <input type="checkbox" className="hidden" checked={filterState.staff} onChange={() => setFilterState({...filterState, staff: !filterState.staff})} />
                                                <span className="text-sm text-[#525252] dark:text-[#d4d4d4]">{t('suppliers.filters.staff')}</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer group select-none">
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${filterState.license ? 'bg-[#B84E9D] border-[#B84E9D]' : 'bg-white dark:bg-[#0B1018] border-[#d4d4d4] dark:border-[#525252] group-hover:border-[#B84E9D]'}`}>
                                                    {filterState.license && <span className="material-symbols-outlined text-white text-sm font-bold">check</span>}
                                                </div>
                                                <input type="checkbox" className="hidden" checked={filterState.license} onChange={() => setFilterState({...filterState, license: !filterState.license})} />
                                                <span className="text-sm text-[#525252] dark:text-[#d4d4d4]">{t('suppliers.filters.license')}</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* View Toggle */}
                        <div className="flex bg-[#fafafa] dark:bg-[#1B273B] p-1 rounded-xl border border-[#e5e5e5] dark:border-[#2A3B5A] flex-none">
                            <button 
                                onClick={() => setViewFormat('cards')}
                                className={`p-1.5 rounded-lg transition-colors ${viewFormat === 'cards' ? 'bg-white dark:bg-[#0B1018] text-[#B84E9D] shadow-sm' : 'text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4]'}`}
                            >
                                <span className="material-symbols-outlined text-[20px]">grid_view</span>
                            </button>
                            <button 
                                onClick={() => setViewFormat('table')}
                                className={`p-1.5 rounded-lg transition-colors ${viewFormat === 'table' ? 'bg-white dark:bg-[#0B1018] text-[#B84E9D] shadow-sm' : 'text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4]'}`}
                            >
                                <span className="material-symbols-outlined text-[20px]">table_rows</span>
                            </button>
                        </div>

                        {/* CSV Button */}
                        <button 
                            className="p-2.5 rounded-xl bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] hover:border-[#d4d4d4] transition-colors shadow-sm flex-none"
                            title={t('common.downloadCSV')}
                        >
                            <span className="material-symbols-outlined text-[20px]">download</span>
                        </button>

                        {/* Card Configuration Settings (Only Visible in Cards View) */}
                        {viewFormat === 'cards' && (
                            <div className="relative flex-none">
                                <button 
                                    onClick={() => setIsCardSettingsOpen(!isCardSettingsOpen)}
                                    className={`p-2.5 rounded-xl border transition-colors shadow-sm flex items-center justify-center ${isCardSettingsOpen ? 'bg-[#FCECF6] border-[#B84E9D] text-[#B84E9D]' : 'bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] hover:border-[#d4d4d4] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4]'}`}
                                    title={t('common.configureCard')}
                                >
                                    <span className="material-symbols-outlined text-[20px]">settings</span>
                                </button>

                                {isCardSettingsOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#1B273B] rounded-xl shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] z-30 p-4 animate-in fade-in zoom-in-95 duration-200">
                                        <h6 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mb-3">{t('common.visibleFields')}</h6>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-3 cursor-pointer group select-none">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${visibleCardFields.type ? 'bg-[#B84E9D] border-[#B84E9D]' : 'bg-white dark:bg-[#0B1018] border-[#d4d4d4] dark:border-[#525252] group-hover:border-[#B84E9D]'}`}>
                                                    {visibleCardFields.type && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
                                                </div>
                                                <input type="checkbox" className="hidden" checked={visibleCardFields.type} onChange={() => setVisibleCardFields({...visibleCardFields, type: !visibleCardFields.type})} />
                                                <span className="text-sm text-[#525252] dark:text-[#d4d4d4]">{t('suppliers.table.type')}</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer group select-none">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${visibleCardFields.sector ? 'bg-[#B84E9D] border-[#B84E9D]' : 'bg-white dark:bg-[#0B1018] border-[#d4d4d4] dark:border-[#525252] group-hover:border-[#B84E9D]'}`}>
                                                    {visibleCardFields.sector && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
                                                </div>
                                                <input type="checkbox" className="hidden" checked={visibleCardFields.sector} onChange={() => setVisibleCardFields({...visibleCardFields, sector: !visibleCardFields.sector})} />
                                                <span className="text-sm text-[#525252] dark:text-[#d4d4d4]">{t('suppliers.table.sector')}</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer group select-none">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${visibleCardFields.email ? 'bg-[#B84E9D] border-[#B84E9D]' : 'bg-white dark:bg-[#0B1018] border-[#d4d4d4] dark:border-[#525252] group-hover:border-[#B84E9D]'}`}>
                                                    {visibleCardFields.email && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
                                                </div>
                                                <input type="checkbox" className="hidden" checked={visibleCardFields.email} onChange={() => setVisibleCardFields({...visibleCardFields, email: !visibleCardFields.email})} />
                                                <span className="text-sm text-[#525252] dark:text-[#d4d4d4]">{t('suppliers.table.email')}</span>
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer group select-none">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${visibleCardFields.phone ? 'bg-[#B84E9D] border-[#B84E9D]' : 'bg-white dark:bg-[#0B1018] border-[#d4d4d4] dark:border-[#525252] group-hover:border-[#B84E9D]'}`}>
                                                    {visibleCardFields.phone && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
                                                </div>
                                                <input type="checkbox" className="hidden" checked={visibleCardFields.phone} onChange={() => setVisibleCardFields({...visibleCardFields, phone: !visibleCardFields.phone})} />
                                                <span className="text-sm text-[#525252] dark:text-[#d4d4d4]">{t('suppliers.table.phone')}</span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Table Configuration Settings (Only Visible in Table View) */}
                        {viewFormat === 'table' && (
                            <div className="relative flex-none">
                                <button 
                                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                    className={`p-2.5 rounded-xl border transition-colors shadow-sm flex items-center justify-center ${isSettingsOpen ? 'bg-[#FCECF6] border-[#B84E9D] text-[#B84E9D]' : 'bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] hover:border-[#d4d4d4] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4]'}`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">settings</span>
                                </button>

                                {isSettingsOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#1B273B] rounded-xl shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] z-30 p-4 animate-in fade-in zoom-in-95 duration-200">
                                        <h6 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mb-3">{t('common.visibleColumns')}</h6>
                                        <div className="space-y-2">
                                            {[
                                                { key: 'supplier', label: t('suppliers.table.supplier') },
                                                { key: 'type', label: t('suppliers.table.type') },
                                                { key: 'sector', label: t('suppliers.table.sector') },
                                                { key: 'status', label: t('common.status') },
                                                { key: 'email', label: t('suppliers.table.email') },
                                                { key: 'phone', label: t('suppliers.table.phone') },
                                                { key: 'actions', label: t('common.actions') },
                                            ].map((col) => (
                                                <label key={col.key} className="flex items-center gap-3 cursor-pointer group select-none">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${visibleColumns[col.key as keyof VisibleColumns] ? 'bg-[#B84E9D] border-[#B84E9D]' : 'bg-white dark:bg-[#0B1018] border-[#d4d4d4] dark:border-[#525252] group-hover:border-[#B84E9D]'}`}>
                                                        {visibleColumns[col.key as keyof VisibleColumns] && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
                                                    </div>
                                                    <input 
                                                        type="checkbox" 
                                                        className="hidden" 
                                                        checked={visibleColumns[col.key as keyof VisibleColumns]} 
                                                        onChange={() => setVisibleColumns({...visibleColumns, [col.key]: !visibleColumns[col.key as keyof VisibleColumns]})} 
                                                    />
                                                    <span className="text-sm text-[#525252] dark:text-[#d4d4d4]">{col.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* New Supplier Button */}
                        <button 
                            onClick={() => onViewChange('create')}
                            className="p-2.5 rounded-xl bg-[#B84E9D] text-white hover:bg-[#9C3C86] transition-colors shadow-md shadow-brand-500/20 flex-none"
                            title={t('suppliers.newBtn')}
                        >
                            <span className="material-symbols-outlined text-[20px]">add_business</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content: Grid or Table */}
            {viewFormat === 'cards' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {currentItems.map((supplier) => (
                        <SupplierCard key={supplier.id} supplier={supplier} onViewDetails={handleViewDetails} visibleFields={visibleCardFields} />
                    ))}
                </div>
            ) : (
                <SupplierTable suppliers={currentItems} onViewDetails={handleViewDetails} visibleColumns={visibleColumns} />
            )}

            {/* Pagination Controls */}
            {filteredSuppliers.length > 0 && (
                <div className="flex items-center justify-between border-t border-[#e5e5e5] dark:border-[#2A3B5A] px-4 py-3 sm:px-6 mt-6">
                    <div className="flex flex-1 justify-between sm:hidden">
                        <button 
                            onClick={() => paginate(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className={`relative inline-flex items-center rounded-md border border-[#e5e5e5] dark:border-[#2A3B5A] bg-white dark:bg-[#131B29] px-4 py-2 text-sm font-medium ${currentPage === 1 ? 'text-[#a3a3a3] cursor-not-allowed' : 'text-[#525252] dark:text-[#d4d4d4] hover:bg-[#fafafa] dark:hover:bg-[#1B273B]'}`}
                        >
                            {t('common.pagination.prev')}
                        </button>
                        <button 
                            onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className={`relative ml-3 inline-flex items-center rounded-md border border-[#e5e5e5] dark:border-[#2A3B5A] bg-white dark:bg-[#131B29] px-4 py-2 text-sm font-medium ${currentPage === totalPages ? 'text-[#a3a3a3] cursor-not-allowed' : 'text-[#525252] dark:text-[#d4d4d4] hover:bg-[#fafafa] dark:hover:bg-[#1B273B]'}`}
                        >
                            {t('common.pagination.next')}
                        </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-[#525252] dark:text-[#a3a3a3]">
                                {t('common.pagination.showing')} <span className="font-bold text-[#171717] dark:text-[#fafafa]">{indexOfFirstItem + 1}</span> {t('common.pagination.to')} <span className="font-bold text-[#171717] dark:text-[#fafafa]">{Math.min(indexOfLastItem, filteredSuppliers.length)}</span> {t('common.pagination.of')} <span className="font-bold text-[#171717] dark:text-[#fafafa]">{filteredSuppliers.length}</span> {t('common.pagination.results')}
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => paginate(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-[#a3a3a3] ring-1 ring-inset ring-[#e5e5e5] dark:ring-[#2A3B5A] hover:bg-[#fafafa] dark:hover:bg-[#1B273B] focus:z-20 focus:outline-offset-0 ${currentPage === 1 ? 'cursor-not-allowed opacity-50' : ''}`}
                                >
                                    <span className="sr-only">Previous</span>
                                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                                </button>
                                {/* Simple Page Numbers */}
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum = i + 1;
                                    if (totalPages > 5 && currentPage > 3) {
                                        pageNum = currentPage - 2 + i;
                                        if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                                    }
                                    
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => paginate(pageNum)}
                                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-[#e5e5e5] dark:ring-[#2A3B5A] focus:z-20 focus:outline-offset-0 ${currentPage === pageNum ? 'bg-[#B84E9D] text-white focus-visible:outline-[#B84E9D]' : 'text-[#525252] dark:text-[#d4d4d4] hover:bg-[#fafafa] dark:hover:bg-[#1B273B]'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-[#a3a3a3] ring-1 ring-inset ring-[#e5e5e5] dark:ring-[#2A3B5A] hover:bg-[#fafafa] dark:hover:bg-[#1B273B] focus:z-20 focus:outline-offset-0 ${currentPage === totalPages ? 'cursor-not-allowed opacity-50' : ''}`}
                                >
                                    <span className="sr-only">Next</span>
                                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
