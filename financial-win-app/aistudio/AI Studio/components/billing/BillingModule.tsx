
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { GoogleGenAI, Type } from "@google/genai";

// --- STYLES & UTILS ---
const TYPO = {
  label: "block text-xs font-bold text-[#525252] dark:text-[#a3a3a3] mb-1.5 uppercase tracking-wider",
  input: "w-full px-4 py-2.5 bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] rounded-lg text-sm font-medium text-[#171717] dark:text-[#fafafa] placeholder:text-[#a3a3a3] dark:placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-[#B84E9D] focus:border-[#B84E9D] hover:border-[#a3a3a3] transition-all shadow-sm",
  readOnlyInput: "w-full px-4 py-2.5 bg-[#fafafa] dark:bg-[#1B273B]/50 border border-[#e5e5e5] dark:border-[#2A3B5A] rounded-lg text-sm font-medium text-[#525252] dark:text-[#d4d4d4] focus:outline-none shadow-none cursor-default"
};

const ValidationField = ({ label, value, className = "", isHighlight = false }: any) => (
    <div className={`${className}`}>
        <span className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{label}</span>
        <div className={`text-sm font-medium border rounded-lg px-3 py-2 min-h-[38px] flex items-center ${isHighlight ? 'bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-900/20 dark:border-brand-800 dark:text-brand-300' : 'bg-gray-50 border-gray-200 text-gray-900 dark:bg-[#1B273B] dark:border-[#2A3B5A] dark:text-gray-100'}`}>
            {value || '-'}
        </div>
    </div>
);

// --- MOCK DATA FOR PAYMENTS VIEW ---
const MOCK_PAYMENTS = Array.from({ length: 100 }, (_, i) => {
  const statuses = ['Pagado', 'Registrada', 'Por recibir']; 
  const suppliers = ['Amazon AWS', 'Google Cloud', 'Salesforce', 'WeWork', 'Iberdrola', 'Movistar', 'HubSpot', 'Slack', 'Adobe'];
  const departments = ['IT', 'Operaciones', 'Ventas', 'Marketing', 'General'];
  const types = ['Licencias', 'Financiero', 'Proveedor Ext.', 'Staff', 'Staff Ext.'];
  const methods = ['Nacional', 'Extranjera', 'Domiciliado', 'Paypal'];
  const currencies = ['EUR', 'USD'];

  const amount = Math.random() * 5000 + 100;
  const vat = amount * 0.21;

  return {
    id: (i + 1).toString(),
    status: statuses[i % 3], 
    supplier: suppliers[i % suppliers.length],
    department: departments[i % departments.length],
    type: types[i % types.length],
    invoiceDate: `2024-0${(i % 9) + 1}-${10 + (i % 18)}`,
    paymentDate: i % 3 === 0 ? '-' : `2024-0${(i % 9) + 1}-${15 + (i % 10)}`,
    currency: currencies[i % 2],
    method: methods[i % methods.length],
    amount: amount.toFixed(2),
    variable: (amount * 0.1).toFixed(2),
    vat: vat.toFixed(2),
    totalBank: (amount + vat).toFixed(2),
  };
});

// --- MOCK DATA FOR COLLECTIONS VIEW ---
const MOCK_COLLECTIONS = Array.from({ length: 100 }, (_, i) => {
  const statuses = ['Pagado', 'Anulada', 'Pendiente pago', 'Pendiente resolucion', 'Pendiente enviar', 'Rectificativa'];
  const clients = ['Tech Solutions S.L.', 'Global Corp', 'StartUp Inc', 'Consulting Group', 'Local Services'];
  
  const amount = Math.random() * 8000 + 500;
  const vat = amount * 0.21;
  const total = amount + vat;
  const paid = i % 3 === 0 ? total : i % 2 === 0 ? total / 2 : 0;

  return {
    id: (i + 1).toString(),
    status: statuses[i % statuses.length],
    client: clients[i % clients.length],
    invoiceNumber: `F${2024}-${(5000+i)}`,
    invoiceDate: `2024-0${(i % 9) + 1}-${10 + (i % 18)}`,
    paymentDate: paid === total ? `2024-0${(i % 9) + 1}-${20 + (i % 8)}` : '-',
    dueDate: `2024-0${(i % 9) + 2}-${10 + (i % 18)}`,
    amount: amount.toFixed(2),
    vat: vat.toFixed(2),
    total: total.toFixed(2),
    totalPaid: paid.toFixed(2),
    balance: (total - paid).toFixed(2)
  };
});

// --- SUB-COMPONENT: BILLING DASHBOARD (NEW PORTAL) ---
const BillingDashboard: React.FC<{ onNavigate: (mode: string) => void; onBack?: () => void }> = ({ onNavigate, onBack }) => {
    const { t } = useLanguage();

    const kpiCards = [
        { label: t('billing.dashboard.cashflow'), value: '€42,300', trend: t('billing.dashboard.trendCashflow'), icon: 'account_balance_wallet', color: 'text-[#B84E9D]', bg: 'bg-[#FCECF6] dark:bg-[#B84E9D]/20' },
        { label: t('nav.collections'), value: '€124,500', trend: '+12% vs anterior', icon: 'savings', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        { label: t('nav.payments'), value: '€82,200', trend: '-2% vs anterior', icon: 'payments', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        { label: t('billing.dashboard.pendingInvoices'), value: '€18,200', trend: t('billing.dashboard.trendPending'), icon: 'pending', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    ];

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            
            {/* Header with Back Button */}
            {onBack && (
                <div className="flex items-center gap-4 mb-8">
                     <button 
                        onClick={onBack}
                        className="p-2.5 rounded-xl bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] hover:border-[#d4d4d4] transition-colors shadow-sm"
                        title={t('common.backToMenu')}
                    >
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    </button>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {kpiCards.map((card, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#131B29] rounded-2xl p-6 border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-card flex flex-col justify-between h-full hover:shadow-lg transition-all cursor-default group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform`}>
                                <span className="material-symbols-outlined text-2xl">{card.icon}</span>
                            </div>
                            <span className="text-[10px] font-bold bg-[#fafafa] dark:bg-[#0B1018] px-2 py-1 rounded-md text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">{t('home.summary.last30')}</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[#737373] dark:text-[#a3a3a3] uppercase tracking-wider mb-1">{card.label}</p>
                            <h3 className="text-2xl font-bold text-[#171717] dark:text-white mb-1">{card.value}</h3>
                            <p className="text-xs font-medium text-[#525252] dark:text-[#d4d4d4]">{card.trend}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Portal Actions (2/3 width on large) */}
                <div className="lg:col-span-2">
                    <h3 className="text-xl font-bold text-[#171717] dark:text-white mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#B84E9D]">dashboard</span>
                        Acceso Directo
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Card: Gastos */}
                        <div 
                            onClick={() => onNavigate('payments')}
                            className="group bg-white dark:bg-[#131B29] rounded-2xl p-6 border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-card hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 dark:bg-purple-900/10 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 shadow-sm group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-3xl">payments</span>
                                </div>
                                <h4 className="text-xl font-bold text-[#171717] dark:text-white mb-2">{t('billing.dashboard.actions.expenses')}</h4>
                                <p className="text-sm text-[#737373] dark:text-[#a3a3a3] mb-6 min-h-[40px]">{t('billing.dashboard.actions.expensesDesc')}</p>
                                <div className="flex items-center text-purple-600 dark:text-purple-400 font-bold text-sm gap-2">
                                    <span>Acceder al módulo</span>
                                    <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
                                </div>
                            </div>
                        </div>

                        {/* Card: Ingresos */}
                        <div 
                            onClick={() => onNavigate('collections')}
                            className="group bg-white dark:bg-[#131B29] rounded-2xl p-6 border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-card hover:shadow-xl hover:border-green-300 dark:hover:border-green-700 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 dark:bg-green-900/10 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mb-4 shadow-sm group-hover:bg-green-600 group-hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-3xl">savings</span>
                                </div>
                                <h4 className="text-xl font-bold text-[#171717] dark:text-white mb-2">{t('billing.dashboard.actions.income')}</h4>
                                <p className="text-sm text-[#737373] dark:text-[#a3a3a3] mb-6 min-h-[40px]">{t('billing.dashboard.actions.incomeDesc')}</p>
                                <div className="flex items-center text-green-600 dark:text-green-400 font-bold text-sm gap-2">
                                    <span>Acceder al módulo</span>
                                    <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
                                </div>
                            </div>
                        </div>

                        {/* Card: Upload (Full Width on mobile, span 2 on md if needed, or allow grid flow) */}
                        <div 
                            onClick={() => onNavigate('upload')}
                            className="md:col-span-2 group bg-gradient-to-r from-[#B84E9D] to-[#862b70] rounded-2xl p-6 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden text-white"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-xl">cloud_upload</span>
                                        </div>
                                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded uppercase tracking-wider">IA Powered</span>
                                    </div>
                                    <h4 className="text-2xl font-bold mb-2">{t('billing.dashboard.actions.upload')}</h4>
                                    <p className="text-white/80 text-sm max-w-md">{t('billing.dashboard.actions.uploadDesc')}</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-white text-[#B84E9D] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-2xl">add</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Insights & Activity */}
                <div className="space-y-6">
                    {/* Alerts Section */}
                    <div className="bg-white dark:bg-[#131B29] rounded-2xl border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-card overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#e5e5e5] dark:border-[#2A3B5A] bg-[#fafafa] dark:bg-[#1B273B] flex justify-between items-center">
                            <h5 className="font-bold text-[#171717] dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-orange-500 text-lg">notifications_active</span>
                                {t('billing.dashboard.alertsTitle')}
                            </h5>
                        </div>
                        <div className="divide-y divide-[#e5e5e5] dark:divide-[#2A3B5A]">
                            <div className="p-4 hover:bg-[#fafafa] dark:hover:bg-[#1B273B] transition-colors cursor-pointer flex gap-3">
                                <span className="material-symbols-outlined text-red-500 mt-0.5 text-lg">error</span>
                                <div>
                                    <p className="text-xs font-bold text-[#171717] dark:text-white">Facturas vencidas (3)</p>
                                    <p className="text-xs text-[#737373] dark:text-[#a3a3a3] mt-0.5">Total pendiente: €4,250</p>
                                </div>
                            </div>
                            <div className="p-4 hover:bg-[#fafafa] dark:hover:bg-[#1B273B] transition-colors cursor-pointer flex gap-3">
                                <span className="material-symbols-outlined text-orange-500 mt-0.5 text-lg">hourglass_top</span>
                                <div>
                                    <p className="text-xs font-bold text-[#171717] dark:text-white">Aprobación requerida</p>
                                    <p className="text-xs text-[#737373] dark:text-[#a3a3a3] mt-0.5">Gastos de viaje - Julio</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Section */}
                    <div className="bg-white dark:bg-[#131B29] rounded-2xl border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-card p-6">
                        <h5 className="font-bold text-[#171717] dark:text-white mb-4">{t('billing.dashboard.activityTitle')}</h5>
                        <div className="space-y-4">
                            {[
                                { text: 'Factura F-2024-001 pagada', time: 'Hace 2h', icon: 'check_circle', color: 'text-green-500' },
                                { text: 'Nuevo gasto subido (IA)', time: 'Hace 5h', icon: 'smart_toy', color: 'text-[#B84E9D]' },
                                { text: 'Recordatorio enviado a Cliente X', time: 'Ayer', icon: 'send', color: 'text-blue-500' },
                            ].map((act, idx) => (
                                <div key={idx} className="flex gap-3 items-start">
                                    <div className={`mt-0.5 ${act.color}`}>
                                        <span className="material-symbols-outlined text-lg">{act.icon}</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-[#171717] dark:text-white">{act.text}</p>
                                        <p className="text-[10px] text-[#737373] dark:text-[#a3a3a3]">{act.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-4 py-2 text-xs font-bold text-[#B84E9D] hover:bg-[#FCECF6] dark:hover:bg-[#B84E9D]/10 rounded-lg transition-colors">
                            {t('home.alerts.viewAll')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: PAYMENTS TABLE VIEW ---
const PaymentsView: React.FC<{ onNavigate: (mode: string) => void }> = ({ onNavigate }) => {
    // ... existing code ...
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    // Filter State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: { 'Pagado': true, 'Registrada': true, 'Por recibir': true },
        supplier: '',
        department: '',
        dateStart: '',
        dateEnd: '',
        paymentDateStart: '',
        paymentDateEnd: '',
        method: ''
    });

    // Column Visibility State
    const [visibleColumns, setVisibleColumns] = useState({
        status: true,
        supplier: true,
        department: true,
        type: true,
        invoiceDate: true,
        paymentDate: true,
        currency: true,
        method: true,
        amount: true,
        variable: true,
        vat: true,
        totalBank: true
    });

    const colLabels: Record<string, string> = {
        status: 'Estado',
        supplier: 'Proveedor',
        department: 'Departamento',
        type: 'Tipo',
        invoiceDate: 'Fecha Factura',
        paymentDate: 'Fecha Pago',
        currency: 'Moneda',
        method: 'Vía',
        amount: 'Importe',
        variable: 'Variable',
        vat: 'IVA',
        totalBank: 'Total Banco'
    };

    // Filter Logic
    const filteredPayments = MOCK_PAYMENTS.filter(record => {
        // Search
        const matchesSearch = 
            record.supplier.toLowerCase().includes(searchTerm.toLowerCase()) || 
            record.department.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        // Status
        if (!filters.status[record.status as keyof typeof filters.status]) return false;

        // Dropdowns
        if (filters.supplier && record.supplier !== filters.supplier) return false;
        if (filters.department && record.department !== filters.department) return false;
        if (filters.method && record.method !== filters.method) return false;

        // Dates
        if (filters.dateStart && record.invoiceDate < filters.dateStart) return false;
        if (filters.dateEnd && record.invoiceDate > filters.dateEnd) return false;
        
        // Payment Dates (handle '-' correctly)
        if (filters.paymentDateStart && (record.paymentDate === '-' || record.paymentDate < filters.paymentDateStart)) return false;
        if (filters.paymentDateEnd && (record.paymentDate === '-' || record.paymentDate > filters.paymentDateEnd)) return false;

        return true;
    });

    const uniqueSuppliers = Array.from(new Set(MOCK_PAYMENTS.map(p => p.supplier)));
    const uniqueDepartments = Array.from(new Set(MOCK_PAYMENTS.map(p => p.department)));
    const uniqueMethods = Array.from(new Set(MOCK_PAYMENTS.map(p => p.method)));

    // Pagination Logic
    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredPayments.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const toggleStatusFilter = (status: string) => {
        setFilters(prev => ({
            ...prev,
            status: {
                ...prev.status,
                [status as keyof typeof filters.status]: !prev.status[status as keyof typeof filters.status]
            }
        }));
    };

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row items-center justify-between gap-4 mb-8">
                
                {/* Left: Title */}
                <div className="flex items-center gap-4 w-full xl:w-auto">
                     <button 
                        onClick={() => onNavigate('dashboard')}
                        className="p-2.5 rounded-xl bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] hover:border-[#d4d4d4] transition-colors shadow-sm"
                        title={t('common.backToDashboard')}
                    >
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    </button>
                    <h2 className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">{t('nav.payments')}</h2>
                </div>

                {/* Right: Search, Filter, Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto justify-end">
                    
                    {/* Search Input */}
                    <div className="relative group w-full sm:w-64">
                        <span className="absolute left-3 top-2.5 material-symbols-outlined text-[#a3a3a3] text-lg group-focus-within:text-[#B84E9D]">search</span>
                        <input 
                            type="text" 
                            placeholder="Buscar gasto..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] rounded-xl text-sm font-medium text-[#171717] dark:text-[#fafafa] focus:ring-2 focus:ring-[#B84E9D] focus:bg-white dark:focus:bg-[#131B29] outline-none transition-all" 
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto relative">
                        {/* Filter Button */}
                        <div className="relative flex-1 sm:flex-none">
                            <button 
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`w-full sm:w-auto justify-center flex p-2.5 rounded-xl bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] hover:border-[#d4d4d4] transition-colors shadow-sm ${isFilterOpen ? 'border-[#B84E9D] text-[#B84E9D]' : ''}`}
                                title={t('common.filterBy')}
                            >
                                <span className="material-symbols-outlined text-[20px]">filter_list</span>
                            </button>

                            {isFilterOpen && (
                                <>
                                    <div className="fixed inset-0 z-20 bg-transparent" onClick={() => setIsFilterOpen(false)}></div>
                                    <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-[#1B273B] rounded-xl shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] z-30 p-5 animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
                                        <div className="flex justify-between items-center mb-4 border-b border-[#e5e5e5] dark:border-[#2A3B5A] pb-2">
                                            <span className="text-sm font-bold text-[#171717] dark:text-white">Filtros</span>
                                            <button 
                                                onClick={() => setFilters({
                                                    status: { 'Pagado': true, 'Registrada': true, 'Por recibir': true },
                                                    supplier: '', department: '', dateStart: '', dateEnd: '', paymentDateStart: '', paymentDateEnd: '', method: ''
                                                })} 
                                                className="text-xs text-[#B84E9D] font-bold hover:underline"
                                            >
                                                {t('common.reset')}
                                            </button>
                                        </div>

                                        {/* Status */}
                                        <div className="mb-4">
                                            <h6 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mb-2">Estado</h6>
                                            <div className="space-y-2">
                                                {['Pagado', 'Registrada', 'Por recibir'].map(status => (
                                                    <label key={status} className="flex items-center gap-3 cursor-pointer group select-none">
                                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${filters.status[status as keyof typeof filters.status] ? 'bg-[#B84E9D] border-[#B84E9D]' : 'bg-white dark:bg-[#0B1018] border-[#d4d4d4] dark:border-[#525252] group-hover:border-[#B84E9D]'}`}>
                                                            {filters.status[status as keyof typeof filters.status] && <span className="material-symbols-outlined text-white text-sm font-bold">check</span>}
                                                        </div>
                                                        <input type="checkbox" className="hidden" checked={filters.status[status as keyof typeof filters.status]} onChange={() => toggleStatusFilter(status)} />
                                                        <span className="text-sm text-[#525252] dark:text-[#d4d4d4]">{status}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Supplier */}
                                        <div className="mb-4">
                                            <h6 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mb-2">Proveedor</h6>
                                            <select className="w-full px-3 py-2 bg-[#fafafa] dark:bg-[#0B1018] border border-[#d4d4d4] dark:border-[#525252] rounded-lg text-sm text-[#525252] dark:text-[#d4d4d4] focus:border-[#B84E9D] outline-none" value={filters.supplier} onChange={(e) => setFilters({...filters, supplier: e.target.value})}>
                                                <option value="">Todos</option>
                                                {uniqueSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>

                                        {/* Department */}
                                        <div className="mb-4">
                                            <h6 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mb-2">Departamento</h6>
                                            <select className="w-full px-3 py-2 bg-[#fafafa] dark:bg-[#0B1018] border border-[#d4d4d4] dark:border-[#525252] rounded-lg text-sm text-[#525252] dark:text-[#d4d4d4] focus:border-[#B84E9D] outline-none" value={filters.department} onChange={(e) => setFilters({...filters, department: e.target.value})}>
                                                <option value="">Todos</option>
                                                {uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>

                                        {/* Dates */}
                                        <div className="mb-4">
                                            <h6 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mb-2">Fecha Factura</h6>
                                            <div className="flex gap-2">
                                                <input type="date" className="w-full px-2 py-2 bg-[#fafafa] dark:bg-[#0B1018] border border-[#d4d4d4] dark:border-[#525252] rounded-lg text-xs text-[#525252] dark:text-[#d4d4d4] focus:border-[#B84E9D] outline-none" value={filters.dateStart} onChange={(e) => setFilters({...filters, dateStart: e.target.value})} />
                                                <input type="date" className="w-full px-2 py-2 bg-[#fafafa] dark:bg-[#0B1018] border border-[#d4d4d4] dark:border-[#525252] rounded-lg text-xs text-[#525252] dark:text-[#d4d4d4] focus:border-[#B84E9D] outline-none" value={filters.dateEnd} onChange={(e) => setFilters({...filters, dateEnd: e.target.value})} />
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <h6 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mb-2">Fecha Pago</h6>
                                            <div className="flex gap-2">
                                                <input type="date" className="w-full px-2 py-2 bg-[#fafafa] dark:bg-[#0B1018] border border-[#d4d4d4] dark:border-[#525252] rounded-lg text-xs text-[#525252] dark:text-[#d4d4d4] focus:border-[#B84E9D] outline-none" value={filters.paymentDateStart} onChange={(e) => setFilters({...filters, paymentDateStart: e.target.value})} />
                                                <input type="date" className="w-full px-2 py-2 bg-[#fafafa] dark:bg-[#0B1018] border border-[#d4d4d4] dark:border-[#525252] rounded-lg text-xs text-[#525252] dark:text-[#d4d4d4] focus:border-[#B84E9D] outline-none" value={filters.paymentDateEnd} onChange={(e) => setFilters({...filters, paymentDateEnd: e.target.value})} />
                                            </div>
                                        </div>

                                        {/* Method */}
                                        <div className="mb-2">
                                            <h6 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mb-2">Vía</h6>
                                            <select className="w-full px-3 py-2 bg-[#fafafa] dark:bg-[#0B1018] border border-[#d4d4d4] dark:border-[#525252] rounded-lg text-sm text-[#525252] dark:text-[#d4d4d4] focus:border-[#B84E9D] outline-none" value={filters.method} onChange={(e) => setFilters({...filters, method: e.target.value})}>
                                                <option value="">Todas</option>
                                                {uniqueMethods.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Download Button */}
                        <button 
                            className="p-2.5 rounded-xl bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] hover:border-[#d4d4d4] transition-colors shadow-sm flex-none"
                            title={t('common.downloadCSV')}
                        >
                            <span className="material-symbols-outlined text-[20px]">download</span>
                        </button>

                        {/* Settings/Columns Button */}
                        <div className="relative flex-none">
                            <button
                                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                className={`p-2.5 rounded-xl bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] hover:border-[#d4d4d4] transition-colors shadow-sm ${isSettingsOpen ? 'border-[#B84E9D] text-[#B84E9D]' : ''}`}
                                title="Configurar Columnas"
                            >
                                <span className="material-symbols-outlined text-[20px]">settings</span>
                            </button>
                            {isSettingsOpen && (
                                <>
                                    <div className="fixed inset-0 z-20 bg-transparent" onClick={() => setIsSettingsOpen(false)}></div>
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#1B273B] rounded-xl shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] z-30 p-4 animate-in fade-in zoom-in-95 duration-200">
                                        <h6 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mb-3">{t('common.visibleColumns')}</h6>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {Object.keys(visibleColumns).map((key) => (
                                                <label key={key} className="flex items-center gap-3 cursor-pointer group select-none">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${visibleColumns[key as keyof typeof visibleColumns] ? 'bg-[#B84E9D] border-[#B84E9D]' : 'bg-white dark:bg-[#0B1018] border-[#d4d4d4] dark:border-[#525252] group-hover:border-[#B84E9D]'}`}>
                                                        {visibleColumns[key as keyof typeof visibleColumns] && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={visibleColumns[key as keyof typeof visibleColumns]}
                                                        onChange={() => setVisibleColumns({ ...visibleColumns, [key]: !visibleColumns[key as keyof typeof visibleColumns] })}
                                                    />
                                                    <span className="text-sm text-[#525252] dark:text-[#d4d4d4] capitalize">
                                                        {colLabels[key] || key}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Add Button */}
                        <button 
                            onClick={() => onNavigate('upload')}
                            className="p-2.5 rounded-xl bg-[#B84E9D] text-white hover:bg-[#9C3C86] transition-colors shadow-md shadow-brand-500/20 flex-none"
                        >
                            <span className="material-symbols-outlined text-[20px]">add</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white dark:bg-[#131B29] rounded-2xl border border-[#e5e5e5] dark:border-[#2A3B5A] overflow-hidden shadow-table animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1400px]">
                        <thead>
                            <tr className="bg-[#fafafa] dark:bg-[#1B273B] border-b border-[#e5e5e5] dark:border-[#2A3B5A]">
                                <th className="px-6 py-4 w-16 text-center">
                                    <span className="sr-only">Previsualizar</span>
                                </th>
                                {visibleColumns.status && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Estado</th>}
                                {visibleColumns.supplier && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Proveedor</th>}
                                {visibleColumns.department && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Departamento</th>}
                                {visibleColumns.type && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Tipo</th>}
                                {visibleColumns.invoiceDate && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Fecha Factura</th>}
                                {visibleColumns.paymentDate && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Fecha Pago</th>}
                                {visibleColumns.currency && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Moneda</th>}
                                {visibleColumns.method && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Vía</th>}
                                {visibleColumns.amount && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider text-right">Importe</th>}
                                {visibleColumns.variable && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider text-right">Variable</th>}
                                {visibleColumns.vat && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider text-right">IVA</th>}
                                {visibleColumns.totalBank && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider text-right">Total Banco</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e5e5] dark:divide-[#2A3B5A]">
                            {currentItems.map((record, index) => (
                                <tr 
                                    key={record.id} 
                                    className={`hover:bg-[#fafafa] dark:hover:bg-[#1B273B] transition-colors group cursor-pointer ${index % 2 !== 0 ? 'bg-gray-50/50 dark:bg-white/5' : ''}`}
                                >
                                    <td className="px-6 py-2 text-center">
                                        <button className="p-1.5 rounded-lg text-[#a3a3a3] hover:text-[#B84E9D] hover:bg-[#FCECF6] dark:hover:bg-[#B84E9D]/20 transition-colors">
                                            <span className="material-symbols-outlined text-lg">visibility</span>
                                        </button>
                                    </td>

                                    {visibleColumns.status && (
                                        <td className="px-6 py-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${
                                                record.status === 'Pagado' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                                                record.status === 'Registrada' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' :
                                                'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                                            }`}>
                                                {record.status}
                                            </span>
                                        </td>
                                    )}

                                    {visibleColumns.supplier && (
                                        <td className="px-6 py-2">
                                            <span className="text-sm font-bold text-[#171717] dark:text-[#fafafa] block max-w-[200px] truncate" title={record.supplier}>
                                                {record.supplier}
                                            </span>
                                        </td>
                                    )}

                                    {visibleColumns.department && (
                                        <td className="px-6 py-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                                {record.department}
                                            </span>
                                        </td>
                                    )}

                                    {visibleColumns.type && <td className="px-6 py-2 text-sm text-[#525252] dark:text-[#d4d4d4]">{record.type}</td>}
                                    {visibleColumns.invoiceDate && <td className="px-6 py-2 text-sm text-[#525252] dark:text-[#d4d4d4] font-mono">{record.invoiceDate}</td>}
                                    {visibleColumns.paymentDate && <td className="px-6 py-2 text-sm text-[#525252] dark:text-[#d4d4d4] font-mono">{record.paymentDate}</td>}
                                    {visibleColumns.currency && <td className="px-6 py-2 text-sm text-[#525252] dark:text-[#d4d4d4]">{record.currency}</td>}
                                    {visibleColumns.method && <td className="px-6 py-2 text-sm text-[#525252] dark:text-[#d4d4d4]">{record.method}</td>}
                                    
                                    {visibleColumns.amount && <td className="px-6 py-2 text-sm font-medium text-[#171717] dark:text-[#fafafa] text-right font-mono">{record.amount} €</td>}
                                    {visibleColumns.variable && <td className="px-6 py-2 text-sm text-[#525252] dark:text-[#d4d4d4] text-right font-mono">{record.variable} €</td>}
                                    {visibleColumns.vat && <td className="px-6 py-2 text-sm text-[#525252] dark:text-[#d4d4d4] text-right font-mono">{record.vat} €</td>}
                                    {visibleColumns.totalBank && <td className="px-6 py-2 text-sm font-bold text-[#171717] dark:text-[#fafafa] text-right font-mono">{record.totalBank} €</td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-[#e5e5e5] dark:border-[#2A3B5A] px-4 py-3 sm:px-6 mt-6">
                <div className="flex flex-1 justify-between sm:hidden">
                    <button onClick={() => paginate(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className={`relative inline-flex items-center rounded-md border border-[#e5e5e5] dark:border-[#2A3B5A] bg-white dark:bg-[#131B29] px-4 py-2 text-sm font-medium ${currentPage === 1 ? 'text-[#a3a3a3] cursor-not-allowed' : 'text-[#525252] dark:text-[#d4d4d4] hover:bg-[#fafafa] dark:hover:bg-[#1B273B]'}`}>
                        {t('common.pagination.prev')}
                    </button>
                    <button onClick={() => paginate(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className={`relative ml-3 inline-flex items-center rounded-md border border-[#e5e5e5] dark:border-[#2A3B5A] bg-white dark:bg-[#131B29] px-4 py-2 text-sm font-medium ${currentPage === totalPages ? 'text-[#a3a3a3] cursor-not-allowed' : 'text-[#525252] dark:text-[#d4d4d4] hover:bg-[#fafafa] dark:hover:bg-[#1B273B]'}`}>
                        {t('common.pagination.next')}
                    </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-[#525252] dark:text-[#a3a3a3]">
                            {t('common.pagination.showing')} <span className="font-bold text-[#171717] dark:text-[#fafafa]">{indexOfFirstItem + 1}</span> {t('common.pagination.to')} <span className="font-bold text-[#171717] dark:text-[#fafafa]">{Math.min(indexOfLastItem, filteredPayments.length)}</span> {t('common.pagination.of')} <span className="font-bold text-[#171717] dark:text-[#fafafa]">{filteredPayments.length}</span> {t('common.pagination.results')}
                        </p>
                    </div>
                    <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                            <button onClick={() => paginate(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-[#a3a3a3] ring-1 ring-inset ring-[#e5e5e5] dark:ring-[#2A3B5A] hover:bg-[#fafafa] dark:hover:bg-[#1B273B] focus:z-20 focus:outline-offset-0 ${currentPage === 1 ? 'cursor-not-allowed opacity-50' : ''}`}>
                                <span className="sr-only">Previous</span>
                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum = i + 1;
                                if (totalPages > 5 && currentPage > 3) {
                                    pageNum = currentPage - 2 + i;
                                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                                }
                                return (
                                    <button key={pageNum} onClick={() => paginate(pageNum)} className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-[#e5e5e5] dark:ring-[#2A3B5A] focus:z-20 focus:outline-offset-0 ${currentPage === pageNum ? 'bg-[#B84E9D] text-white focus-visible:outline-[#B84E9D]' : 'text-[#525252] dark:text-[#d4d4d4] hover:bg-[#fafafa] dark:hover:bg-[#1B273B]'}`}>
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button onClick={() => paginate(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-[#a3a3a3] ring-1 ring-inset ring-[#e5e5e5] dark:ring-[#2A3B5A] hover:bg-[#fafafa] dark:hover:bg-[#1B273B] focus:z-20 focus:outline-offset-0 ${currentPage === totalPages ? 'cursor-not-allowed opacity-50' : ''}`}>
                                <span className="sr-only">Next</span>
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: COLLECTIONS TABLE VIEW ---
const CollectionsView: React.FC<{ onNavigate: (mode: string) => void }> = ({ onNavigate }) => {
    // ... existing code ...
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    // Filter State (Simplified for now, can be expanded like PaymentsView)
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Column Visibility State
    const [visibleColumns, setVisibleColumns] = useState({
        status: true,
        client: true,
        invoiceNumber: true,
        invoiceDate: true,
        paymentDate: true,
        dueDate: true,
        amount: true,
        vat: true,
        total: true,
        totalPaid: true,
        balance: true
    });

    const colLabels: Record<string, string> = {
        status: 'Estado',
        client: 'Cliente',
        invoiceNumber: 'Factura',
        invoiceDate: 'Fecha Factura',
        paymentDate: 'Fecha Pago',
        dueDate: 'Vencimiento',
        amount: 'Importe',
        vat: 'IVA',
        total: 'Total',
        totalPaid: 'Total Pagado',
        balance: 'Saldo'
    };

    // Filter Logic
    const filteredCollections = MOCK_COLLECTIONS.filter(record => {
        const matchesSearch = 
            record.client.toLowerCase().includes(searchTerm.toLowerCase()) || 
            record.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredCollections.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredCollections.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row items-center justify-between gap-4 mb-8">
                
                {/* Left: Title */}
                <div className="flex items-center gap-4 w-full xl:w-auto">
                     <button 
                        onClick={() => onNavigate('dashboard')}
                        className="p-2.5 rounded-xl bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] hover:border-[#d4d4d4] transition-colors shadow-sm"
                        title={t('common.backToDashboard')}
                    >
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    </button>
                    <h2 className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">{t('nav.collections')}</h2>
                </div>

                {/* Right: Search, Filter, Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto justify-end">
                    
                    {/* Search Input */}
                    <div className="relative group w-full sm:w-64">
                        <span className="absolute left-3 top-2.5 material-symbols-outlined text-[#a3a3a3] text-lg group-focus-within:text-[#B84E9D]">search</span>
                        <input 
                            type="text" 
                            placeholder="Buscar ingreso..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] rounded-xl text-sm font-medium text-[#171717] dark:text-[#fafafa] focus:ring-2 focus:ring-[#B84E9D] focus:bg-white dark:focus:bg-[#131B29] outline-none transition-all" 
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto relative">
                        {/* Filter Button */}
                        <div className="relative flex-1 sm:flex-none">
                            <button 
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`w-full sm:w-auto justify-center flex p-2.5 rounded-xl bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] hover:border-[#d4d4d4] transition-colors shadow-sm ${isFilterOpen ? 'border-[#B84E9D] text-[#B84E9D]' : ''}`}
                                title={t('common.filterBy')}
                            >
                                <span className="material-symbols-outlined text-[20px]">filter_list</span>
                            </button>
                            {isFilterOpen && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#1B273B] rounded-xl shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] z-30 p-4 animate-in fade-in zoom-in-95 duration-200">
                                    <p className="text-xs text-center text-gray-500">Filtros (Simulado)</p>
                                </div>
                            )}
                        </div>

                        {/* Download Button */}
                        <button 
                            className="p-2.5 rounded-xl bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] hover:border-[#d4d4d4] transition-colors shadow-sm flex-none"
                            title={t('common.downloadCSV')}
                        >
                            <span className="material-symbols-outlined text-[20px]">download</span>
                        </button>

                        {/* Settings/Columns Button */}
                        <div className="relative flex-none">
                            <button
                                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                className={`p-2.5 rounded-xl bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] hover:border-[#d4d4d4] transition-colors shadow-sm ${isSettingsOpen ? 'border-[#B84E9D] text-[#B84E9D]' : ''}`}
                                title="Configurar Columnas"
                            >
                                <span className="material-symbols-outlined text-[20px]">settings</span>
                            </button>
                            {isSettingsOpen && (
                                <>
                                    <div className="fixed inset-0 z-20 bg-transparent" onClick={() => setIsSettingsOpen(false)}></div>
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#1B273B] rounded-xl shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] z-30 p-4 animate-in fade-in zoom-in-95 duration-200">
                                        <h6 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mb-3">{t('common.visibleColumns')}</h6>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {Object.keys(visibleColumns).map((key) => (
                                                <label key={key} className="flex items-center gap-3 cursor-pointer group select-none">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${visibleColumns[key as keyof typeof visibleColumns] ? 'bg-[#B84E9D] border-[#B84E9D]' : 'bg-white dark:bg-[#0B1018] border-[#d4d4d4] dark:border-[#525252] group-hover:border-[#B84E9D]'}`}>
                                                        {visibleColumns[key as keyof typeof visibleColumns] && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={visibleColumns[key as keyof typeof visibleColumns]}
                                                        onChange={() => setVisibleColumns({ ...visibleColumns, [key]: !visibleColumns[key as keyof typeof visibleColumns] })}
                                                    />
                                                    <span className="text-sm text-[#525252] dark:text-[#d4d4d4] capitalize">
                                                        {colLabels[key] || key}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Add Button */}
                        <button 
                            onClick={() => onNavigate('upload')}
                            className="p-2.5 rounded-xl bg-[#B84E9D] text-white hover:bg-[#9C3C86] transition-colors shadow-md shadow-brand-500/20 flex-none"
                        >
                            <span className="material-symbols-outlined text-[20px]">add</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white dark:bg-[#131B29] rounded-2xl border border-[#e5e5e5] dark:border-[#2A3B5A] overflow-hidden shadow-table animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1400px]">
                        <thead>
                            <tr className="bg-[#fafafa] dark:bg-[#1B273B] border-b border-[#e5e5e5] dark:border-[#2A3B5A]">
                                <th className="px-6 py-4 w-16 text-center">
                                    <span className="sr-only">Previsualizar</span>
                                </th>
                                {visibleColumns.status && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Estado</th>}
                                {visibleColumns.client && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Cliente</th>}
                                {visibleColumns.invoiceNumber && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Factura</th>}
                                {visibleColumns.invoiceDate && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Fecha Factura</th>}
                                {visibleColumns.paymentDate && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Fecha Pago</th>}
                                {visibleColumns.dueDate && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Vencimiento</th>}
                                
                                {visibleColumns.amount && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider text-right">Importe</th>}
                                {visibleColumns.vat && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider text-right">IVA</th>}
                                {visibleColumns.total && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider text-right">Total</th>}
                                {visibleColumns.totalPaid && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider text-right">Total Pagado</th>}
                                {visibleColumns.balance && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider text-right">Saldo</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e5e5] dark:divide-[#2A3B5A]">
                            {currentItems.map((record, index) => (
                                <tr 
                                    key={record.id} 
                                    className={`hover:bg-[#fafafa] dark:hover:bg-[#1B273B] transition-colors group cursor-pointer ${index % 2 !== 0 ? 'bg-gray-50/50 dark:bg-white/5' : ''}`}
                                >
                                    <td className="px-6 py-2 text-center">
                                        <button 
                                            className="p-1.5 rounded-lg text-[#a3a3a3] hover:text-[#B84E9D] hover:bg-[#FCECF6] dark:hover:bg-[#B84E9D]/20 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg">visibility</span>
                                        </button>
                                    </td>

                                    {visibleColumns.status && (
                                        <td className="px-6 py-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${
                                                record.status === 'Pagado' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                                                record.status.includes('Pendiente') ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' :
                                                'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                            }`}>
                                                {record.status}
                                            </span>
                                        </td>
                                    )}

                                    {visibleColumns.client && (
                                        <td className="px-6 py-2">
                                            <span className="text-sm font-bold text-[#171717] dark:text-[#fafafa] block max-w-[200px] truncate" title={record.client}>
                                                {record.client}
                                            </span>
                                        </td>
                                    )}

                                    {visibleColumns.invoiceNumber && (
                                        <td className="px-6 py-2">
                                            <span className="text-sm font-medium text-[#525252] dark:text-[#d4d4d4] font-mono">
                                                {record.invoiceNumber}
                                            </span>
                                        </td>
                                    )}

                                    {visibleColumns.invoiceDate && <td className="px-6 py-2 text-sm text-[#525252] dark:text-[#d4d4d4] font-mono">{record.invoiceDate}</td>}
                                    {visibleColumns.paymentDate && <td className="px-6 py-2 text-sm text-[#525252] dark:text-[#d4d4d4] font-mono">{record.paymentDate}</td>}
                                    {visibleColumns.dueDate && <td className="px-6 py-2 text-sm text-[#525252] dark:text-[#d4d4d4] font-mono">{record.dueDate}</td>}

                                    {visibleColumns.amount && <td className="px-6 py-2 text-sm font-medium text-[#171717] dark:text-[#fafafa] text-right font-mono">{record.amount} €</td>}
                                    {visibleColumns.vat && <td className="px-6 py-2 text-sm text-[#525252] dark:text-[#d4d4d4] text-right font-mono">{record.vat} €</td>}
                                    {visibleColumns.total && <td className="px-6 py-2 text-sm font-bold text-[#171717] dark:text-[#fafafa] text-right font-mono">{record.total} €</td>}
                                    {visibleColumns.totalPaid && <td className="px-6 py-2 text-sm text-[#525252] dark:text-[#d4d4d4] text-right font-mono">{record.totalPaid} €</td>}
                                    {visibleColumns.balance && <td className="px-6 py-2 text-sm font-bold text-red-600 dark:text-red-400 text-right font-mono">{record.balance} €</td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
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
                            {t('common.pagination.showing')} <span className="font-bold text-[#171717] dark:text-[#fafafa]">{indexOfFirstItem + 1}</span> {t('common.pagination.to')} <span className="font-bold text-[#171717] dark:text-[#fafafa]">{Math.min(indexOfLastItem, filteredCollections.length)}</span> {t('common.pagination.of')} <span className="font-bold text-[#171717] dark:text-[#fafafa]">{filteredCollections.length}</span> {t('common.pagination.results')}
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
        </div>
    );
};

interface BatchItem {
    id: string;
    file: File;
    status: 'queued' | 'processing' | 'ready' | 'completed' | 'error';
    data: any | null;
}

interface BillingModuleProps {
    viewMode: string;
    moduleType?: 'invoices' | 'tickets' | 'subscriptions' | 'staff' | 'suppliers' | 'consultants';
    onBack: () => void;
    onNavigate: (mode: string) => void;
    isEmbedded?: boolean;
    hideHistory?: boolean;
    onGoHome?: () => void;
}

export const BillingModule: React.FC<BillingModuleProps> = ({ viewMode, moduleType = 'invoices', onBack, onNavigate, isEmbedded = false, hideHistory = false, onGoHome }) => {
    const { t } = useLanguage();
    const [step, setStep] = useState(1);
    const [isDragActive, setIsDragActive] = useState(false);
    
    // Batch State
    const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
    const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

    // Active Item State (Synced with Batch Item)
    const [aiData, setAiData] = useState<any>(null);
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [showBatchCompleteModal, setShowBatchCompleteModal] = useState(false);
    const [showValidationModal, setShowValidationModal] = useState(false); // New state for per-item validation
    
    // Determine available toggle options based on moduleType
    const getToggleOptions = () => {
        if (moduleType === 'tickets') {
            return []; // No toggle for tickets as per latest request
        }
        if (moduleType === 'consultants') {
            return []; // No toggle for consultants
        }
        if (moduleType === 'staff') {
            return [
                { value: 'internal', label: 'Interno', icon: 'domain' },
                { value: 'external', label: 'Externo', icon: 'public' }
            ];
        }
        // Default for invoices (licenses), etc.
        return [
            { value: 'national', label: t('billing.upload.national'), icon: 'flag' },
            { value: 'foreign', label: t('billing.upload.foreign'), icon: 'public' }
        ];
    };

    const toggleOptions = getToggleOptions();
    
    // Initialize with first option or 'default'
    const [uploadType, setUploadType] = useState<string>(toggleOptions.length > 0 ? toggleOptions[0].value : 'default');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset uploadType when moduleType changes
    useEffect(() => {
        const options = getToggleOptions();
        if (options.length > 0) {
            setUploadType(options[0].value);
        } else {
            setUploadType('default');
        }
        setStep(1); // Reset step on module change
        setBatchQueue([]);
        setActiveBatchId(null);
        setAiData(null);
        setIsProcessing(false);
        setCurrentFile(null);
        setShowBatchCompleteModal(false);
        setShowValidationModal(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [moduleType]);

    // Sync active batch item to form state
    useEffect(() => {
        if (activeBatchId && batchQueue.length > 0) {
            const item = batchQueue.find(i => i.id === activeBatchId);
            if (item) {
                setCurrentFile(item.file);
                // Ensure we spread data to avoid reference issues, default to object if null
                setAiData(item.data ? { ...item.data } : {});
            }
        }
    }, [activeBatchId, batchQueue]);

    // Create object URL for preview when currentFile changes
    useEffect(() => {
        if (currentFile) {
            const url = URL.createObjectURL(currentFile);
            setPreviewUrl(url);
            return () => {
                URL.revokeObjectURL(url);
            };
        } else {
            setPreviewUrl(null);
        }
    }, [currentFile]);

    // --- AI PROCESSING LOGIC (Single File Helper) ---
    const extractDataFromFile = async (file: File): Promise<any> => {
        // 1. Read file as base64
        const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        // 2. Initialize Gemini
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // 3. Define Prompt & Schema based on Module Type
        let systemInstruction = "You are an expert data extraction assistant for financial documents.";
        let promptText = "";
        let responseSchema;

        if (moduleType === 'tickets') {
            promptText = "Analyze this receipt/ticket. Extract the following details: establishment name, Tax ID (NIF) if available, full address, city, zip code, date (YYYY-MM-DD), time (HH:MM), tax base amount, vat amount, total amount, and category. Also infer the department based on the nature of the expense.";
            responseSchema = {
                type: Type.OBJECT,
                properties: {
                    category: { type: Type.STRING, enum: ["Viajes y Dietas", "Transporte", "Material Oficina", "Comidas", "Otros"] },
                    department: { type: Type.STRING },
                    establishment: { type: Type.STRING },
                    nif: { type: Type.STRING },
                    address: { type: Type.STRING },
                    zip: { type: Type.STRING },
                    city: { type: Type.STRING },
                    date: { type: Type.STRING },
                    time: { type: Type.STRING },
                    base: { type: Type.STRING },
                    vat: { type: Type.STRING },
                    amount: { type: Type.STRING }
                }
            };
        } else if (moduleType === 'staff') {
            promptText = "Analyze this HR document. Extract employee name, type, period, net amount, and social security.";
            responseSchema = {
                type: Type.OBJECT,
                properties: {
                    employee: { type: Type.STRING },
                    type: { type: Type.STRING },
                    period: { type: Type.STRING },
                    net: { type: Type.STRING },
                    ss: { type: Type.STRING }
                }
            };
        } else {
            // Default: Invoices / Licenses
            promptText = "Analyze this invoice or license document. First, determine if it is 'national' or 'foreign' based on the Tax ID. If it has a VAT number (starts with country code e.g. DE, FR, US, GB, etc.), it is 'foreign'. Otherwise 'national'. Then extract strictly: Department (infer), Expense Type, Supplier (IMPORTANT: Remove any company legal suffix like S.L., S.A., SL, SA, S.A.U., SAU from the name), Tax ID (CIF/NIF for national, VAT ID for foreign), Invoice Number, Issue Date, Concept (translate description to Spanish), Tax Base, Currency, VAT Amount, and Total Amount.";
            responseSchema = {
                type: Type.OBJECT,
                properties: {
                    origin: { type: Type.STRING, enum: ["national", "foreign"], description: "Classify as 'foreign' if a VAT ID is present, otherwise 'national'." },
                    department: { type: Type.STRING, description: "Inferred department (e.g. IT, Marketing, HR)." },
                    expenseType: { type: Type.STRING, description: "Type of expense (e.g. Licencia Software, Consultoría)." },
                    supplier: { type: Type.STRING, description: "Supplier Name without company suffixes (e.g. remove SL, SA, S.L., S.A., SAU)." },
                    cif: { type: Type.STRING, description: "Tax ID (CIF/NIF) if national." },
                    vatId: { type: Type.STRING, description: "VAT ID if foreign." },
                    invoiceNum: { type: Type.STRING, description: "Invoice Number" },
                    issueDate: { type: Type.STRING, description: "Date YYYY-MM-DD" },
                    concept: { type: Type.STRING, description: "Brief description of items or services, translated to Spanish." },
                    base: { type: Type.STRING, description: "Tax Base amount" },
                    currency: { type: Type.STRING, description: "Currency symbol or code (EUR, USD, €)" },
                    vat: { type: Type.STRING, description: "VAT amount" },
                    total: { type: Type.STRING, description: "Total amount" }
                },
                required: ["supplier", "total", "invoiceNum", "origin"]
            };
        }

        // 4. Call Gemini API
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: file.type, data: base64Data } },
                    { text: promptText }
                ]
            },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });

        // 5. Parse and Apply Defaults
        // IMPORTANT: We apply defaults here so the modal (which reads aiData) matches the form defaults.
        const result = JSON.parse(response.text);

        if (moduleType === 'tickets') {
            if (!result.category) result.category = "Otros";
            if (!result.department) result.department = "Ventas";
        } else if (moduleType === 'staff') {
            if (!result.type) result.type = "Nómina";
        } else {
            // Invoices / Licenses defaults
            if (!result.department) result.department = "IT";
            if (!result.expenseType) result.expenseType = "Licencias Software";
            if (!result.currency) result.currency = "EUR";
            if (!result.origin) result.origin = "national";
        }

        return result;
    };

    // --- BATCH PROCESSING ---
    const processBatch = async (files: File[]) => {
        setIsProcessing(true);
        setStep(2);

        // 1. Initialize Queue
        const newQueueItems: BatchItem[] = files.map((file, idx) => ({
            id: `${Date.now()}-${idx}`,
            file,
            status: 'queued',
            data: null
        }));
        setBatchQueue(newQueueItems);

        // 2. Process Sequentially to avoid rate limits and manage state cleanly
        const processedItems = [...newQueueItems];
        
        for (let i = 0; i < processedItems.length; i++) {
            // Update status to processing
            processedItems[i].status = 'processing';
            setBatchQueue([...processedItems]);

            try {
                const extractedData = await extractDataFromFile(processedItems[i].file);
                processedItems[i].data = extractedData;
                processedItems[i].status = 'ready';
            } catch (error) {
                console.error(`Error processing file ${processedItems[i].file.name}:`, error);
                processedItems[i].status = 'error';
            }
            
            setBatchQueue([...processedItems]);
        }

        // 3. Finish
        setIsProcessing(false);
        if (processedItems.length > 0) {
            setActiveBatchId(processedItems[0].id); // Select first item
            setStep(3);
        } else {
            setStep(1); // Should not happen
        }
    };

    // --- HANDLERS ---
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragActive(true);
        } else if (e.type === 'dragleave') {
            setIsDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processBatch(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processBatch(Array.from(e.target.files));
        }
    };

    const handleBackStep = () => {
        if (step > 1) {
            setStep(step - 1);
            setBatchQueue([]);
            setActiveBatchId(null);
            setAiData(null);
        } else {
            onBack();
        }
    };

    // Save Data to the batch item in the queue
    const saveDataToQueue = (id: string, data: any, markCompleted: boolean = false) => {
        setBatchQueue(prev => prev.map(item => {
            if (item.id === id) {
                return {
                    ...item,
                    data: data,
                    status: markCompleted ? 'completed' : item.status
                };
            }
            return item;
        }));
    };

    // Helper to update active AI data (form input)
    const updateField = (field: string, value: string) => {
        setAiData((prev: any) => {
            const newData = { ...prev, [field]: value };
            // Sync immediately to queue
            if (activeBatchId) {
                saveDataToQueue(activeBatchId, newData, false);
            }
            return newData;
        });
    };

    // Triggered when "Validar y Siguiente" is clicked
    const handleOpenValidationModal = () => {
        setShowValidationModal(true);
    };

    // Triggered when user confirms in the modal
    const handleConfirmValidation = () => {
        setShowValidationModal(false);

        if (!activeBatchId) return;
        
        // 1. Save current item as completed
        saveDataToQueue(activeBatchId, aiData, true);

        // 2. Find next item that is not completed
        const currentIndex = batchQueue.findIndex(i => i.id === activeBatchId);
        const nextItem = batchQueue.find((item, idx) => idx > currentIndex && item.status !== 'completed');
        
        if (nextItem) {
            setActiveBatchId(nextItem.id);
        } else {
            // Check if there are any previous items not completed?
            const anyPending = batchQueue.find(item => item.status !== 'completed' && item.id !== activeBatchId);
            if (anyPending) {
                setActiveBatchId(anyPending.id);
            } else {
                // All done
                setShowBatchCompleteModal(true);
            }
        }
    };

    const handleFinishBatch = () => {
        // Here we would send the whole batchQueue to the backend
        console.log("Saving Batch:", batchQueue);
        setStep(1); 
        setBatchQueue([]);
        setActiveBatchId(null);
        setAiData(null);
        setCurrentFile(null);
        setShowBatchCompleteModal(false);
    };

    // Helper to generate the new filename based on AI data
    const getGeneratedFileName = (data: any, originalName: string) => {
        if (!data) return originalName || "documento.pdf";

        const sanitize = (str: string) => str ? str.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') : 'unknown';

        if (moduleType === 'invoices') {
             const dateStr = data.issueDate ? data.issueDate.replace(/-/g, '') : '20240101';
             let supplierName = data.supplier || '';
             supplierName = supplierName.replace(/\s+(?:S\.?L\.?|S\.?A\.?|S\.?A\.?U\.?|S\.?L\.?U\.?)(?:\s|$)/gi, '').trim();
             const nameStr = sanitize(supplierName);
             const numStr = sanitize(data.invoiceNum) || '000';
             return `${dateStr}_${nameStr}_${numStr}.pdf`;
        }
        
        if (moduleType === 'tickets') {
             const dateStr = data.date ? data.date.replace(/-/g, '') : '20240101';
             const nameStr = sanitize(data.establishment);
             return `${dateStr}_${nameStr}_ticket.pdf`;
        }

        return `processed_${originalName}`;
    };

    // Render Specific Fields based on Module Type
    const renderFormFields = () => {
        const data = aiData || {};

        switch(moduleType) {
            case 'tickets':
                return (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Categoría */}
                            <div>
                                <label className={TYPO.label}>Categoría</label>
                                <select 
                                    className={TYPO.input} 
                                    value={data.category || "Otros"}
                                    onChange={(e) => updateField('category', e.target.value)}
                                >
                                    <option>Viajes y Dietas</option>
                                    <option>Transporte</option>
                                    <option>Material Oficina</option>
                                    <option>Comidas</option>
                                    <option>Otros</option>
                                </select>
                            </div>

                            {/* Departamento */}
                            <div>
                                <label className={TYPO.label}>Departamento</label>
                                <select 
                                    className={TYPO.input} 
                                    value={data.department || "Ventas"}
                                    onChange={(e) => updateField('department', e.target.value)}
                                >
                                    <option value="Marketing">Marketing</option>
                                    <option value="IT">IT</option>
                                    <option value="RRHH">RRHH</option>
                                    <option value="Finanzas">Finanzas</option>
                                    <option value="Operaciones">Operaciones</option>
                                    <option value="Ventas">Ventas</option>
                                </select>
                            </div>

                            {/* Nombre establecimiento */}
                            <div className="md:col-span-2">
                                <label className={TYPO.label}>Nombre establecimiento</label>
                                <input 
                                    type="text" 
                                    className={TYPO.input} 
                                    value={data.establishment || ''} 
                                    onChange={(e) => updateField('establishment', e.target.value)} 
                                />
                            </div>

                            {/* NIF */}
                            <div>
                                <label className={TYPO.label}>NIF</label>
                                <input 
                                    type="text" 
                                    className={TYPO.input} 
                                    value={data.nif || ''} 
                                    onChange={(e) => updateField('nif', e.target.value)} 
                                />
                            </div>

                            {/* Dirección */}
                            <div className="md:col-span-2">
                                <label className={TYPO.label}>Dirección</label>
                                <input 
                                    type="text" 
                                    className={TYPO.input} 
                                    value={data.address || ''} 
                                    onChange={(e) => updateField('address', e.target.value)} 
                                />
                            </div>

                            {/* Código postal */}
                            <div>
                                <label className={TYPO.label}>Código postal</label>
                                <input 
                                    type="text" 
                                    className={TYPO.input} 
                                    value={data.zip || ''} 
                                    onChange={(e) => updateField('zip', e.target.value)} 
                                />
                            </div>

                            {/* Ciudad */}
                            <div>
                                <label className={TYPO.label}>Ciudad</label>
                                <input 
                                    type="text" 
                                    className={TYPO.input} 
                                    value={data.city || ''} 
                                    onChange={(e) => updateField('city', e.target.value)} 
                                />
                            </div>

                            {/* Fecha */}
                            <div>
                                <label className={TYPO.label}>Fecha</label>
                                <input 
                                    type="date" 
                                    className={TYPO.input} 
                                    value={data.date || ''} 
                                    onChange={(e) => updateField('date', e.target.value)} 
                                />
                            </div>

                            {/* Hora */}
                            <div>
                                <label className={TYPO.label}>Hora</label>
                                <input 
                                    type="time" 
                                    className={TYPO.input} 
                                    value={data.time || ''} 
                                    onChange={(e) => updateField('time', e.target.value)} 
                                />
                            </div>

                            {/* SEPARATOR */}
                            <div className="md:col-span-2 mt-4 pt-4 border-t border-[#e5e5e5] dark:border-[#2A3B5A]">
                                <h4 className="text-xs font-bold text-[#B84E9D] uppercase tracking-wider mb-4">
                                    Desglose Económico
                                </h4>
                            </div>

                            {/* Base imponible */}
                            <div>
                                <label className={TYPO.label}>Base imponible</label>
                                <input 
                                    type="text" 
                                    className={TYPO.input} 
                                    value={data.base || ''} 
                                    onChange={(e) => updateField('base', e.target.value)} 
                                />
                            </div>

                            {/* IVA */}
                            <div>
                                <label className={TYPO.label}>IVA</label>
                                <input 
                                    type="text" 
                                    className={TYPO.input} 
                                    value={data.vat || ''} 
                                    onChange={(e) => updateField('vat', e.target.value)} 
                                />
                            </div>

                            {/* Total */}
                            <div className="md:col-span-2">
                                <label className={TYPO.label}>Total</label>
                                <input 
                                    type="text" 
                                    className={`${TYPO.input} font-bold text-[#171717] dark:text-white`} 
                                    value={data.amount || ''} 
                                    onChange={(e) => updateField('amount', e.target.value)} 
                                />
                            </div>
                        </div>
                    </>
                );
            case 'staff':
                return (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className={TYPO.label}>Empleado</label>
                                <input 
                                    type="text" 
                                    className={TYPO.input} 
                                    value={data.employee || ''} 
                                    onChange={(e) => updateField('employee', e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className={TYPO.label}>Tipo Documento</label>
                                <select 
                                    className={TYPO.input} 
                                    value={data.type || "Nómina"}
                                    onChange={(e) => updateField('type', e.target.value)}
                                >
                                    <option>Nómina</option>
                                    <option>Contrato</option>
                                    <option>Baja Médica</option>
                                    <option>Otros</option>
                                </select>
                            </div>
                            <div>
                                <label className={TYPO.label}>Periodo</label>
                                <input 
                                    type="month" 
                                    className={TYPO.input} 
                                    value={data.period || ''} 
                                    onChange={(e) => updateField('period', e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className={TYPO.label}>Importe Neto</label>
                                <input 
                                    type="text" 
                                    className={TYPO.input} 
                                    value={data.net || ''} 
                                    onChange={(e) => updateField('net', e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className={TYPO.label}>Seguridad Social</label>
                                <input 
                                    type="text" 
                                    className={TYPO.input} 
                                    value={data.ss || ''} 
                                    onChange={(e) => updateField('ss', e.target.value)} 
                                />
                            </div>
                        </div>
                    </>
                );
            case 'invoices': // Licenses - SPECIFIC FIELDS REQUESTED
            default:
                return (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Procedencia */}
                            <div>
                                <label className={TYPO.label}>Procedencia</label>
                                <select 
                                    className={TYPO.input} 
                                    value={data.origin || "national"}
                                    onChange={(e) => updateField('origin', e.target.value)}
                                >
                                    <option value="national">Nacional</option>
                                    <option value="foreign">Extranjera</option>
                                </select>
                            </div>

                            {/* Departamento */}
                            <div>
                                <label className={TYPO.label}>Departamento</label>
                                <select 
                                    className={TYPO.input} 
                                    value={data.department || "IT"}
                                    onChange={(e) => updateField('department', e.target.value)}
                                >
                                    <option value="Marketing">Marketing</option>
                                    <option value="IT">IT</option>
                                    <option value="RRHH">RRHH</option>
                                    <option value="Finanzas">Finanzas</option>
                                    <option value="Operaciones">Operaciones</option>
                                    <option value="Ventas">Ventas</option>
                                </select>
                            </div>
                            
                            {/* Tipo de Gasto */}
                            <div>
                                <label className={TYPO.label}>Tipo de Gasto</label>
                                <select 
                                    className={TYPO.input} 
                                    value={data.expenseType || "Licencias Software"}
                                    onChange={(e) => updateField('expenseType', e.target.value)}
                                >
                                    <option value="Licencias Software">Licencias Software</option>
                                    <option value="Consultoría">Consultoría</option>
                                    <option value="Material Oficina">Material Oficina</option>
                                    <option value="Servicios Profesionales">Servicios Profesionales</option>
                                    <option value="Viajes y Dietas">Viajes y Dietas</option>
                                    <option value="Otros">Otros</option>
                                </select>
                            </div>

                            {/* Fecha Emisión - Moved up to balance grid */}
                            <div>
                                <label className={TYPO.label}>{t('billing.review.issueDate')}</label>
                                <input 
                                    type="date" 
                                    className={TYPO.input} 
                                    value={data.issueDate || ''} 
                                    onChange={(e) => updateField('issueDate', e.target.value)} 
                                />
                            </div>

                            {/* Proveedor */}
                            <div className="md:col-span-2">
                                <label className={TYPO.label}>{t('billing.review.supplier')}</label>
                                <input 
                                    type="text" 
                                    className={TYPO.input} 
                                    value={data.supplier || ''} 
                                    onChange={(e) => updateField('supplier', e.target.value)} 
                                />
                            </div>

                            {/* CIF/NIF or VAT based on origin */}
                            <div>
                                <label className={TYPO.label}>
                                    {data.origin === 'foreign' ? 'VAT ID' : t('billing.review.cif')}
                                </label>
                                <input 
                                    type="text" 
                                    className={TYPO.input} 
                                    value={data.origin === 'foreign' ? (data.vatId || '') : (data.cif || '')}
                                    onChange={(e) => updateField(data.origin === 'foreign' ? 'vatId' : 'cif', e.target.value)} 
                                />
                            </div>

                            {/* Número Factura */}
                            <div>
                                <label className={TYPO.label}>{t('billing.review.invoiceNum')}</label>
                                <input 
                                    type="text" 
                                    className={TYPO.input} 
                                    value={data.invoiceNum || ''} 
                                    onChange={(e) => updateField('invoiceNum', e.target.value)} 
                                />
                            </div>

                            {/* Concepto */}
                            <div className="md:col-span-2">
                                <label className={TYPO.label}>{t('billing.review.concept')}</label>
                                <input 
                                    type="text" 
                                    className={TYPO.input} 
                                    value={data.concept || ''} 
                                    onChange={(e) => updateField('concept', e.target.value)} 
                                />
                            </div>

                            {/* SEPARATOR */}
                            <div className="md:col-span-2 mt-4 pt-4 border-t border-[#e5e5e5] dark:border-[#2A3B5A]">
                                <h4 className="text-xs font-bold text-[#B84E9D] uppercase tracking-wider mb-4">
                                    Desglose Económico
                                </h4>
                            </div>

                            {/* Base Imponible */}
                            <div>
                                <label className={TYPO.label}>{t('billing.review.base')}</label>
                                <input 
                                    type="text" 
                                    className={TYPO.input} 
                                    value={data.base || ''} 
                                    onChange={(e) => updateField('base', e.target.value)} 
                                />
                            </div>

                            {/* Tipo de Moneda */}
                            <div>
                                <label className={TYPO.label}>Tipo de Moneda</label>
                                <select 
                                    className={TYPO.input} 
                                    value={data.currency || "EUR"}
                                    onChange={(e) => updateField('currency', e.target.value)}
                                >
                                    <option value="EUR">EUR</option>
                                    <option value="USD">USD</option>
                                    <option value="GBP">GBP</option>
                                </select>
                            </div>

                            {/* IVA */}
                            <div>
                                <label className={TYPO.label}>IVA</label>
                                <input 
                                    type="text" 
                                    className={TYPO.input} 
                                    value={data.vat || ''} 
                                    onChange={(e) => updateField('vat', e.target.value)} 
                                />
                            </div>

                            {/* Total Factura */}
                            <div>
                                <label className={TYPO.label}>{t('billing.review.total')}</label>
                                <input 
                                    type="text" 
                                    className={`${TYPO.input} font-bold text-[#171717] dark:text-white`} 
                                    value={data.total || ''} 
                                    onChange={(e) => updateField('total', e.target.value)} 
                                />
                            </div>
                        </div>
                    </>
                );
        }
    };

    // Render logic based on viewMode
    if (viewMode === 'payments') {
         return <PaymentsView onNavigate={onNavigate} />;
    }
    
    if (viewMode === 'collections') {
         return <CollectionsView onNavigate={onNavigate} />;
    }

    // --- RENDER: UPLOAD PROCESS (MAXIMIZED DRAG AREA) ---
    if (viewMode === 'upload') {
        
        // Get dynamic labels based on moduleType
        let typeLabel = '';
        switch(moduleType) {
            case 'invoices': typeLabel = 'licencias'; break;
            case 'tickets': typeLabel = 'tickets'; break;
            case 'subscriptions': typeLabel = 'suscripciones'; break;
            case 'staff': typeLabel = 'documentos'; break;
            default: typeLabel = 'documentos';
        }

        // Construct Drag Title
        let dragTitle = t('billing.upload.dragTitle');
        
        if (toggleOptions.length === 0) {
            // No toggle -> "Arrastra tus documentos aquí"
            dragTitle = dragTitle.replace('{type}', typeLabel);
        } else {
            // Has toggle -> "Arrastra tus [type] [subtype] aquí"
            let subTypeLabel = '';
            if (moduleType === 'staff') {
                subTypeLabel = uploadType === 'internal' ? 'internos' : 'externos';
            } else {
                subTypeLabel = uploadType === 'national' ? 'nacionales' : 'extranjeras';
            }
            dragTitle = dragTitle.replace('{type}', `${typeLabel} ${subTypeLabel}`);
        }

        // Identify active file type for icon
        const getFileTypeIcon = (type: string = '') => {
            if (type === 'application/pdf') return 'picture_as_pdf';
            if (type.startsWith('image/')) return 'image';
            return 'description';
        };

        return (
            <div className="flex flex-col h-full bg-[#fafafa] dark:bg-[#0B1018] relative">
                
                {/* Back Button (In Flow, not absolute) - Only shown if NOT embedded */}
                {!isEmbedded && (
                    <div className="px-6 pt-6 pb-2 shrink-0">
                        <button 
                            onClick={handleBackStep} 
                            className="p-3 rounded-full bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#525252] dark:text-[#d4d4d4] hover:bg-[#fafafa] dark:hover:bg-[#2A3B5A] transition-colors shadow-md group"
                        >
                            <span className="material-symbols-outlined text-xl group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                        </button>
                    </div>
                )}

                {/* Main Content Area - Starts BELOW the back button */}
                <div className={`flex-1 ${isEmbedded ? 'p-0 pt-0' : 'p-6 pt-2'} h-full flex flex-col min-h-0`}>
                    
                    {/* STEP 1: UPLOAD */}
                    {step === 1 && (
                        <div className="w-full h-full animate-in fade-in zoom-in-95 duration-300 flex flex-col">
                            <div className="bg-white dark:bg-[#131B29] rounded-3xl shadow-sm border border-[#e5e5e5] dark:border-[#2A3B5A] p-8 flex flex-col h-full">
                                
                                {/* Toggle Type - Centered at Top (Only if options exist) */}
                                {toggleOptions.length > 0 && (
                                    <div className="flex justify-center mb-6 shrink-0">
                                        <div className="bg-[#fafafa] dark:bg-[#0B1018] p-1.5 rounded-xl inline-flex border border-[#e5e5e5] dark:border-[#2A3B5A]">
                                            {toggleOptions.map((option) => (
                                                <button 
                                                    key={option.value}
                                                    onClick={() => setUploadType(option.value)}
                                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${uploadType === option.value ? 'bg-white dark:bg-[#1B273B] text-[#B84E9D] shadow-sm' : 'text-[#737373] dark:text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4]'}`}
                                                >
                                                    <span className="material-symbols-outlined text-lg">{option.icon}</span>
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Drag Area - Expands to fill remaining space */}
                                <div 
                                    className={`
                                        flex-1
                                        border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer
                                        flex flex-col items-center justify-center
                                        ${isDragActive 
                                            ? 'border-[#B84E9D] bg-[#FCECF6]/30 dark:bg-[#B84E9D]/5 scale-[0.99]' 
                                            : 'border-[#e5e5e5] dark:border-[#2A3B5A] hover:border-[#B84E9D] dark:hover:border-[#B84E9D] hover:bg-[#fafafa] dark:hover:bg-[#1B273B]/50'}
                                    `}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-24 h-24 rounded-full bg-[#FCECF6] dark:bg-[#B84E9D]/10 flex items-center justify-center mb-8 text-[#B84E9D]">
                                        <span className="material-symbols-outlined text-5xl">cloud_upload</span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-4">
                                        {dragTitle}
                                    </h3>
                                    <p className="text-[#737373] dark:text-[#a3a3a3] text-lg max-w-lg mx-auto mb-10 leading-relaxed text-center">
                                        {t('billing.upload.dragSubtitle')}
                                    </p>
                                    
                                    <button 
                                        className="px-10 py-4 bg-[#B84E9D] text-white text-lg rounded-2xl font-bold shadow-xl shadow-[#B84E9D]/20 hover:bg-[#9C3C86] hover:scale-105 transition-all active:scale-95 flex items-center gap-3"
                                    >
                                        <span className="material-symbols-outlined">folder_open</span>
                                        {t('billing.upload.button')}
                                    </button>
                                    <input 
                                        ref={fileInputRef}
                                        type="file" 
                                        className="hidden" 
                                        onChange={handleFileSelect}
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        multiple // Enable multiple files
                                    />
                                    
                                    <p className="mt-8 text-sm text-[#a3a3a3] uppercase tracking-wide font-bold">
                                        {t('billing.upload.extensions')}
                                    </p>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* STEP 2: PROCESSING (BATCH) */}
                    {step === 2 && (
                        <div className="w-full h-full flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white dark:bg-[#131B29] rounded-3xl shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] p-16 text-center max-w-2xl w-full mx-auto">
                                <div className="relative w-32 h-32 mx-auto mb-10">
                                    <div className="absolute inset-0 rounded-full border-4 border-[#FCECF6] dark:border-[#B84E9D]/10"></div>
                                    <div className="absolute inset-0 rounded-full border-4 border-t-[#B84E9D] animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-5xl text-[#B84E9D] animate-pulse">smart_toy</span>
                                    </div>
                                </div>
                                <h3 className="text-3xl font-bold text-[#171717] dark:text-[#fafafa] mb-4">
                                    {t('billing.upload.analyzing')}
                                </h3>
                                <p className="text-lg text-[#737373] dark:text-[#a3a3a3]">
                                    {batchQueue.filter(i => i.status === 'ready').length} de {batchQueue.length} documentos procesados
                                </p>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-6 overflow-hidden">
                                    <div 
                                        className="bg-[#B84E9D] h-2.5 rounded-full transition-all duration-300" 
                                        style={{ width: `${(batchQueue.filter(i => i.status === 'ready' || i.status === 'completed').length / batchQueue.length) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: VALIDATION (SPLIT VIEW WITH QUEUE SIDEBAR) */}
                    {step === 3 && (
                        <div className="w-full h-full flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-300 rounded-3xl border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-xl bg-white dark:bg-[#131B29]">
                            
                            {/* Batch Queue Sidebar */}
                            <div className="w-full md:w-64 bg-[#fafafa] dark:bg-[#0B1018] border-b md:border-b-0 md:border-r border-[#e5e5e5] dark:border-[#2A3B5A] flex flex-col shrink-0">
                                <div className="p-4 border-b border-[#e5e5e5] dark:border-[#2A3B5A]">
                                    <h4 className="text-xs font-bold text-[#737373] dark:text-[#a3a3a3] uppercase tracking-wider mb-1">Cola de Archivos</h4>
                                    <p className="text-xs text-[#525252] dark:text-[#d4d4d4] font-medium">{batchQueue.filter(i => i.status === 'completed').length} / {batchQueue.length} validados</p>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {batchQueue.map((item, idx) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveBatchId(item.id)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all relative overflow-hidden group
                                                ${activeBatchId === item.id 
                                                    ? 'bg-white dark:bg-[#1B273B] shadow-sm border border-[#e5e5e5] dark:border-[#2A3B5A]' 
                                                    : 'hover:bg-white/50 dark:hover:bg-[#1B273B]/50 border border-transparent'}
                                            `}
                                        >
                                            {/* Status Indicator */}
                                            <div className="shrink-0">
                                                {item.status === 'completed' && <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>}
                                                {item.status === 'processing' && <span className="material-symbols-outlined text-[#B84E9D] text-lg animate-spin">sync</span>}
                                                {item.status === 'ready' && <span className="w-4 h-4 rounded-full border-2 border-[#a3a3a3] block"></span>}
                                                {item.status === 'error' && <span className="material-symbols-outlined text-red-500 text-lg">error</span>}
                                            </div>
                                            
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-xs font-bold truncate ${activeBatchId === item.id ? 'text-[#171717] dark:text-white' : 'text-[#737373] dark:text-[#a3a3a3]'}`}>
                                                    {item.file.name}
                                                </p>
                                                <p className="text-[10px] text-[#a3a3a3] truncate">
                                                    {(item.file.size / 1024).toFixed(0)} KB
                                                </p>
                                            </div>
                                            
                                            {/* Active Indicator Bar */}
                                            {activeBatchId === item.id && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#B84E9D]"></div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Left Pane: Document Preview */}
                            <div className="w-full md:w-1/3 lg:w-5/12 bg-[#525252] dark:bg-[#0B1018] flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-[#e5e5e5] dark:border-[#2A3B5A] overflow-hidden">
                                {previewUrl ? (
                                    currentFile?.type === 'application/pdf' ? (
                                        <iframe 
                                            src={previewUrl} 
                                            className="w-full h-full border-none"
                                            title="Document Preview"
                                        />
                                    ) : currentFile?.type.startsWith('image/') ? (
                                        <img 
                                            src={previewUrl} 
                                            alt="Preview" 
                                            className="max-w-full max-h-full object-contain p-4"
                                        />
                                    ) : (
                                        // Fallback for other types
                                        <div className="text-center text-white/50 w-full max-w-md p-8">
                                            <span className="material-symbols-outlined text-9xl mb-4 opacity-80">
                                                {getFileTypeIcon(currentFile?.type)}
                                            </span>
                                            <p className="text-xl font-bold text-white mb-2 break-all">{getGeneratedFileName(aiData, currentFile?.name || '')}</p>
                                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium backdrop-blur-sm">
                                                Vista previa no disponible
                                            </span>
                                        </div>
                                    )
                                ) : (
                                    <div className="text-center text-white/50 w-full max-w-md p-8">
                                        <span className="material-symbols-outlined text-9xl mb-4 opacity-80">description</span>
                                        <p className="text-xl font-bold text-white mb-2">Seleccione un documento</p>
                                    </div>
                                )}

                                {/* Floating Overlay Info - Only visible if we have a file */}
                                {currentFile && (
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white shadow-lg flex items-center gap-3 z-10 pointer-events-none">
                                        <span className="material-symbols-outlined text-lg opacity-80">
                                            {getFileTypeIcon(currentFile?.type)}
                                        </span>
                                        <div className="text-xs">
                                            <p className="font-bold max-w-[200px] truncate">{getGeneratedFileName(aiData, currentFile?.name || '')}</p>
                                            <p className="opacity-70">{currentFile?.type.split('/')[1]?.toUpperCase() || 'FILE'} • {(currentFile?.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Pane: AI Form */}
                            <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#131B29] min-w-0">
                                {/* Header */}
                                <div className="px-8 py-6 border-b border-[#e5e5e5] dark:border-[#2A3B5A] bg-[#fafafa] dark:bg-[#131B29] shrink-0 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-bold text-[#171717] dark:text-[#fafafa]">
                                            {t('billing.review.title')}
                                        </h3>
                                        <p className="text-xs text-[#737373] dark:text-[#a3a3a3] mt-1">Revisa los datos extraídos automáticamente.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {aiData?.origin && (
                                            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border ${
                                                aiData.origin === 'national' 
                                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' 
                                                : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                                            }`}>
                                                <span className="material-symbols-outlined text-sm">
                                                    {aiData.origin === 'national' ? 'flag' : 'public'}
                                                </span>
                                                {aiData.origin === 'national' ? 'Nacional' : 'Extranjera'}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#B84E9D] to-purple-600 text-white text-xs font-bold shadow-sm">
                                            <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                            {t('billing.review.aiBadge')}
                                        </span>
                                    </div>
                                </div>

                                {/* Scrollable Content */}
                                <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                                    {renderFormFields()}
                                </div>

                                {/* Footer Actions */}
                                <div className="px-8 py-5 border-t border-[#e5e5e5] dark:border-[#2A3B5A] bg-[#fafafa] dark:bg-[#0B1018] flex gap-3 justify-end shrink-0">
                                    <button 
                                        onClick={() => setStep(1)}
                                        className="px-5 py-2.5 rounded-xl border border-[#d4d4d4] dark:border-[#2A3B5A] text-[#525252] dark:text-[#d4d4d4] font-bold text-sm hover:bg-white dark:hover:bg-[#1B273B] transition-colors"
                                    >
                                        Cancelar Lote
                                    </button>
                                    <button 
                                        onClick={handleOpenValidationModal}
                                        className="px-6 py-2.5 rounded-xl bg-[#B84E9D] text-white font-bold text-sm hover:bg-[#9C3C86] transition-colors shadow-md shadow-[#B84E9D]/20 flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-lg">check_circle</span>
                                        {t('billing.review.validateAction')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <BillingDashboard onNavigate={onNavigate} onBack={onGoHome} />
    );
};
