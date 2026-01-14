
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ViewState } from '../../types';

// --- STYLES & UTILS ---
const TYPO = {
  h4: "text-xl font-bold text-[#0B1018] dark:text-[#fafafa] brand-font",
  label: "block text-xs font-bold text-[#525252] dark:text-[#a3a3a3] mb-1.5 uppercase tracking-wider",
  input: "w-full px-4 py-2.5 bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] rounded-lg text-sm font-medium text-[#171717] dark:text-[#fafafa] placeholder:text-[#a3a3a3] dark:placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-[#B84E9D] focus:border-[#B84E9D] hover:border-[#a3a3a3] transition-all shadow-sm",
  readOnlyInput: "w-full px-4 py-2.5 bg-[#fafafa] dark:bg-[#1B273B]/50 border border-[#e5e5e5] dark:border-[#2A3B5A] rounded-lg text-sm font-medium text-[#525252] dark:text-[#d4d4d4] focus:outline-none shadow-none cursor-default"
};

interface RecordsModuleProps {
    viewMode: string;
    onNavigate: (view: ViewState, subView?: string) => void;
}

// Mock Data for Records (Expanded)
const MOCK_RECORDS = Array.from({ length: 100 }, (_, i) => {
  const statuses = ['validated', 'pending', 'rejected'];
  const types = ['Licencia', 'Ticket', 'Staff', 'Consultor Ext'];
  const departments = ['Marketing', 'IT', 'RRHH', 'Operaciones', 'Ventas'];
  const users = ['Zaffra Burga', 'Carlos Ruiz', 'Juan Pérez', 'Dev Team', 'Admin', 'Elena Web'];
  
  const namesByType = {
    'Licencia': ['Adobe Creative Cloud', 'Microsoft 365', 'Jira Cloud', 'Figma Pro', 'Zoom Business'],
    'Ticket': ['Comida Cliente', 'Taxi Aeropuerto', 'Hotel TechEvent', 'Material Oficina', 'Parking'],
    'Staff': ['Nómina', 'Contrato', 'Baja Médica', 'IRPF Trimestral', 'Formación'],
    'Consultor Ext': ['Factura Legal', 'Auditoría Q1', 'Asesoría Fiscal', 'Dev Outsourcing', 'Diseño Web']
  };

  const type = types[i % 4];
  // @ts-ignore
  const nameBase = namesByType[type][i % 5];

  return {
    id: (i + 1).toString(),
    status: statuses[i % 3], // Rotate statuses
    type: type,
    department: departments[i % 5],
    name: `${nameBase} ${2024} - REF${1000 + i}`,
    date: `2024-0${(i % 9) + 1}-${10 + (i % 18)}`,
    user: users[i % users.length],
    amount: (Math.random() * 1500 + 20).toFixed(2),
    // Mock details for specific views
    details: {
        provider: type === 'Ticket' ? 'Restaurante El Lago' : type === 'Staff' ? 'Seguridad Social' : 'Proveedor Global S.L.',
        paymentMethod: i % 2 === 0 ? 'Transferencia' : 'Tarjeta Corporativa',
        category: type === 'Ticket' ? 'Viajes y Dietas' : 'Servicios Profesionales',
        taxId: `B${Math.floor(10000000 + Math.random() * 90000000)}`
    }
  };
});

export const RecordsModule: React.FC<RecordsModuleProps> = ({ viewMode, onNavigate }) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingRecord, setViewingRecord] = useState<any | null>(null);
  const itemsPerPage = 25;

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
      status: { validated: true, pending: true, rejected: true },
      type: '',
      department: '',
      user: '',
      dateStart: '',
      dateEnd: ''
  });

  // Settings / Columns State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
      status: true,
      type: true,
      department: true,
      name: true,
      date: true,
      user: true,
      amount: true
  });

  const colLabels: Record<string, string> = {
      status: 'Estado',
      type: 'Tipo Documento',
      department: 'Departamento',
      name: 'Nombre Documento',
      date: 'Fecha Registro',
      user: 'Usuario',
      amount: 'Importe'
  };

  // Extract unique values for filters
  const uniqueTypes = Array.from(new Set(MOCK_RECORDS.map(r => r.type)));
  const uniqueDepartments = Array.from(new Set(MOCK_RECORDS.map(r => r.department)));
  const uniqueUsers = Array.from(new Set(MOCK_RECORDS.map(r => r.user)));

  // Pagination Logic
  const filteredRecords = MOCK_RECORDS.filter(record => {
    // 1. Text Search
    const matchesSearch = 
        record.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        record.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.department.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Status Filter
    if (!filters.status[record.status as keyof typeof filters.status]) return false;

    // 3. Type Filter
    if (filters.type && record.type !== filters.type) return false;

    // 4. Department Filter
    if (filters.department && record.department !== filters.department) return false;

    // 5. User Filter
    if (filters.user && record.user !== filters.user) return false;

    // 6. Date Range Filter
    if (filters.dateStart && record.date < filters.dateStart) return false;
    if (filters.dateEnd && record.date > filters.dateEnd) return false;

    return true;
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRecords.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleViewRecord = (record: any) => {
      setViewingRecord(record);
  };

  const closeRecordView = () => {
      setViewingRecord(null);
  };

  const resetFilters = () => {
      setFilters({
          status: { validated: true, pending: true, rejected: true },
          type: '',
          department: '',
          user: '',
          dateStart: '',
          dateEnd: ''
      });
  };

  const toggleStatusFilter = (status: 'validated' | 'pending' | 'rejected') => {
      setFilters(prev => ({
          ...prev,
          status: {
              ...prev.status,
              [status]: !prev.status[status]
          }
      }));
  };

  // Render specific form fields based on document type
  const renderRecordFields = (record: any) => {
      switch(record.type) {
          case 'Licencia':
              return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={TYPO.label}>Proveedor Software</label>
                            <input type="text" className={TYPO.readOnlyInput} value={record.details.provider} readOnly />
                        </div>
                        <div>
                            <label className={TYPO.label}>Tipo de Licencia</label>
                            <input type="text" className={TYPO.readOnlyInput} value="Suscripción Anual" readOnly />
                        </div>
                        <div>
                            <label className={TYPO.label}>Fecha Inicio</label>
                            <input type="text" className={TYPO.readOnlyInput} value={record.date} readOnly />
                        </div>
                        <div>
                            <label className={TYPO.label}>Próxima Renovación</label>
                            <input type="text" className={TYPO.readOnlyInput} value="2025-01-01" readOnly />
                        </div>
                        <div>
                            <label className={TYPO.label}>Nº Asientos/Usuarios</label>
                            <input type="text" className={TYPO.readOnlyInput} value="5" readOnly />
                        </div>
                        <div>
                            <label className={TYPO.label}>Departamento Asignado</label>
                            <input type="text" className={TYPO.readOnlyInput} value={record.department} readOnly />
                        </div>
                    </div>
                  </>
              );
          case 'Ticket':
              return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={TYPO.label}>Establecimiento</label>
                            <input type="text" className={TYPO.readOnlyInput} value={record.details.provider} readOnly />
                        </div>
                        <div>
                            <label className={TYPO.label}>Categoría Gasto</label>
                            <input type="text" className={TYPO.readOnlyInput} value={record.details.category} readOnly />
                        </div>
                        <div>
                            <label className={TYPO.label}>Fecha y Hora</label>
                            <input type="text" className={TYPO.readOnlyInput} value={`${record.date} 14:30`} readOnly />
                        </div>
                        <div>
                            <label className={TYPO.label}>Método Pago</label>
                            <input type="text" className={TYPO.readOnlyInput} value={record.details.paymentMethod} readOnly />
                        </div>
                        <div className="md:col-span-2">
                            <label className={TYPO.label}>Justificación del Gasto</label>
                            <input type="text" className={TYPO.readOnlyInput} value="Comida de negocios con cliente potencial." readOnly />
                        </div>
                    </div>
                  </>
              );
          case 'Staff':
              return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={TYPO.label}>Empleado</label>
                            <input type="text" className={TYPO.readOnlyInput} value={record.user} readOnly />
                        </div>
                        <div>
                            <label className={TYPO.label}>Tipo Documento</label>
                            <input type="text" className={TYPO.readOnlyInput} value="Nómina / Justificante" readOnly />
                        </div>
                        <div>
                            <label className={TYPO.label}>Periodo Liquidación</label>
                            <input type="text" className={TYPO.readOnlyInput} value="Mensual" readOnly />
                        </div>
                        <div>
                            <label className={TYPO.label}>Cuenta IBAN</label>
                            <input type="text" className={TYPO.readOnlyInput} value="ES99 **** **** **** 1234" readOnly />
                        </div>
                    </div>
                  </>
              );
          case 'Consultor Ext':
              return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className={TYPO.label}>Razón Social Consultor</label>
                            <input type="text" className={TYPO.readOnlyInput} value={record.details.provider} readOnly />
                        </div>
                        <div>
                            <label className={TYPO.label}>CIF / NIF</label>
                            <input type="text" className={TYPO.readOnlyInput} value={record.details.taxId} readOnly />
                        </div>
                        <div>
                            <label className={TYPO.label}>Proyecto Asociado</label>
                            <input type="text" className={TYPO.readOnlyInput} value="Transformación Digital Q1" readOnly />
                        </div>
                        <div>
                            <label className={TYPO.label}>Nº Horas / Unidades</label>
                            <input type="text" className={TYPO.readOnlyInput} value="40h" readOnly />
                        </div>
                        <div>
                            <label className={TYPO.label}>Retención IRPF Aplicada</label>
                            <input type="text" className={TYPO.readOnlyInput} value="15%" readOnly />
                        </div>
                    </div>
                  </>
              );
          default:
              return <p className="text-gray-500">Información genérica del documento.</p>;
      }
  };

  // Allow dashboard or specific views to render the main table for now
  const shouldRenderTable = viewMode === 'dashboard' || viewMode === 'records';

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {shouldRenderTable && (
        <>
            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row items-center justify-between gap-4 mb-8">
                
                {/* Left: Back Button */}
                <div className="flex items-center gap-4 w-full xl:w-auto">
                     <button 
                        onClick={() => onNavigate('dashboard')}
                        className="p-2.5 rounded-xl bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] hover:border-[#d4d4d4] transition-colors shadow-sm"
                        title={t('common.backToDashboard')}
                    >
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    </button>
                </div>

                {/* Right: Search, Filter, Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto justify-end">
                    
                    {/* Search Input */}
                    <div className="relative group w-full sm:w-64">
                        <span className="absolute left-3 top-2.5 material-symbols-outlined text-[#a3a3a3] text-lg group-focus-within:text-[#B84E9D]">search</span>
                        <input 
                            type="text" 
                            placeholder="Buscar registro..."
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
                                className={`w-full sm:w-auto justify-center flex p-2.5 rounded-xl border transition-colors shadow-sm ${isFilterOpen ? 'bg-[#FCECF6] border-[#B84E9D] text-[#B84E9D]' : 'bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] hover:border-[#d4d4d4]'}`}
                                title={t('common.filterBy')}
                            >
                                <span className="material-symbols-outlined text-[20px]">filter_list</span>
                            </button>

                            {isFilterOpen && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-20 bg-transparent" 
                                        onClick={() => setIsFilterOpen(false)}
                                    ></div>
                                    <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-[#1B273B] rounded-xl shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] z-30 p-5 animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
                                        <div className="flex justify-between items-center mb-4 border-b border-[#e5e5e5] dark:border-[#2A3B5A] pb-2">
                                            <span className="text-sm font-bold text-[#171717] dark:text-white">Filtrar Registros</span>
                                            <button 
                                                onClick={resetFilters} 
                                                className="text-xs text-[#B84E9D] font-bold hover:underline"
                                            >
                                                {t('common.reset')}
                                            </button>
                                        </div>

                                        {/* Status Filter */}
                                        <div className="mb-4">
                                            <h6 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mb-2">Estado</h6>
                                            <div className="space-y-2">
                                                {['validated', 'pending', 'rejected'].map(status => (
                                                    <label key={status} className="flex items-center gap-3 cursor-pointer group select-none">
                                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${filters.status[status as keyof typeof filters.status] ? 'bg-[#B84E9D] border-[#B84E9D]' : 'bg-white dark:bg-[#0B1018] border-[#d4d4d4] dark:border-[#525252] group-hover:border-[#B84E9D]'}`}>
                                                            {filters.status[status as keyof typeof filters.status] && <span className="material-symbols-outlined text-white text-sm font-bold">check</span>}
                                                        </div>
                                                        <input 
                                                            type="checkbox" 
                                                            className="hidden" 
                                                            checked={filters.status[status as keyof typeof filters.status]} 
                                                            onChange={() => toggleStatusFilter(status as any)} 
                                                        />
                                                        <span className="text-sm text-[#525252] dark:text-[#d4d4d4] capitalize">{t(`common.statusLabels.${status}`)}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Type Filter */}
                                        <div className="mb-4">
                                            <h6 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mb-2">Tipo de Documento</h6>
                                            <select 
                                                className="w-full px-3 py-2 bg-[#fafafa] dark:bg-[#0B1018] border border-[#d4d4d4] dark:border-[#525252] rounded-lg text-sm text-[#525252] dark:text-[#d4d4d4] focus:border-[#B84E9D] outline-none"
                                                value={filters.type}
                                                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                                            >
                                                <option value="">Todos los tipos</option>
                                                {uniqueTypes.map(type => (
                                                    <option key={type} value={type}>{type}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Department Filter */}
                                        <div className="mb-4">
                                            <h6 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mb-2">Departamento</h6>
                                            <select 
                                                className="w-full px-3 py-2 bg-[#fafafa] dark:bg-[#0B1018] border border-[#d4d4d4] dark:border-[#525252] rounded-lg text-sm text-[#525252] dark:text-[#d4d4d4] focus:border-[#B84E9D] outline-none"
                                                value={filters.department}
                                                onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                                            >
                                                <option value="">Todos los departamentos</option>
                                                {uniqueDepartments.map(dept => (
                                                    <option key={dept} value={dept}>{dept}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Date Filter */}
                                        <div className="mb-4">
                                            <h6 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mb-2">Fecha</h6>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="date" 
                                                    className="w-full px-2 py-2 bg-[#fafafa] dark:bg-[#0B1018] border border-[#d4d4d4] dark:border-[#525252] rounded-lg text-xs text-[#525252] dark:text-[#d4d4d4] focus:border-[#B84E9D] outline-none"
                                                    value={filters.dateStart}
                                                    onChange={(e) => setFilters(prev => ({ ...prev, dateStart: e.target.value }))}
                                                />
                                                <input 
                                                    type="date" 
                                                    className="w-full px-2 py-2 bg-[#fafafa] dark:bg-[#0B1018] border border-[#d4d4d4] dark:border-[#525252] rounded-lg text-xs text-[#525252] dark:text-[#d4d4d4] focus:border-[#B84E9D] outline-none"
                                                    value={filters.dateEnd}
                                                    onChange={(e) => setFilters(prev => ({ ...prev, dateEnd: e.target.value }))}
                                                />
                                            </div>
                                        </div>

                                        {/* User Filter */}
                                        <div className="mb-2">
                                            <h6 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mb-2">Usuario</h6>
                                            <select 
                                                className="w-full px-3 py-2 bg-[#fafafa] dark:bg-[#0B1018] border border-[#d4d4d4] dark:border-[#525252] rounded-lg text-sm text-[#525252] dark:text-[#d4d4d4] focus:border-[#B84E9D] outline-none"
                                                value={filters.user}
                                                onChange={(e) => setFilters(prev => ({ ...prev, user: e.target.value }))}
                                            >
                                                <option value="">Todos los usuarios</option>
                                                {uniqueUsers.map(user => (
                                                    <option key={user} value={user}>{user}</option>
                                                ))}
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

                        {/* Settings/Columns Button (NEW) */}
                        <div className="relative flex-none">
                            <button 
                                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                className={`p-2.5 rounded-xl border transition-colors shadow-sm flex items-center justify-center ${isSettingsOpen ? 'bg-[#FCECF6] border-[#B84E9D] text-[#B84E9D]' : 'bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] hover:border-[#d4d4d4]'}`}
                                title="Configurar Columnas"
                            >
                                <span className="material-symbols-outlined text-[20px]">settings</span>
                            </button>

                            {isSettingsOpen && (
                                <>
                                    <div className="fixed inset-0 z-20 bg-transparent" onClick={() => setIsSettingsOpen(false)}></div>
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#1B273B] rounded-xl shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] z-30 p-4 animate-in fade-in zoom-in-95 duration-200">
                                        <h6 className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider mb-3">Columnas Visibles</h6>
                                        <div className="space-y-2">
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
                                                    <span className="text-sm text-[#525252] dark:text-[#d4d4d4] capitalize">{colLabels[key]}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Add Button */}
                        <button 
                            onClick={() => onNavigate('documents')}
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
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-[#fafafa] dark:bg-[#1B273B] border-b border-[#e5e5e5] dark:border-[#2A3B5A]">
                                <th className="px-6 py-4 w-16 text-center">
                                    <span className="sr-only">Previsualizar</span>
                                </th>
                                {visibleColumns.status && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Estado</th>}
                                {visibleColumns.type && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Tipo Documento</th>}
                                {visibleColumns.department && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Departamento</th>}
                                {visibleColumns.name && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Nombre Documento</th>}
                                {visibleColumns.date && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Fecha Registro</th>}
                                {visibleColumns.user && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider">Usuario</th>}
                                {visibleColumns.amount && <th className="px-6 py-4 text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider text-right">Importe</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e5e5] dark:divide-[#2A3B5A]">
                            {currentItems.map((record, index) => (
                                <tr 
                                    key={record.id} 
                                    className={`hover:bg-[#fafafa] dark:hover:bg-[#1B273B] transition-colors group cursor-pointer ${index % 2 !== 0 ? 'bg-gray-50/50 dark:bg-white/5' : ''}`}
                                >
                                    {/* Botón Previsualizar */}
                                    <td className="px-6 py-2 text-center">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleViewRecord(record); }}
                                            className="p-1.5 rounded-lg text-[#a3a3a3] hover:text-[#B84E9D] hover:bg-[#FCECF6] dark:hover:bg-[#B84E9D]/20 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg">visibility</span>
                                        </button>
                                    </td>

                                    {/* Estado */}
                                    {visibleColumns.status && (
                                        <td className="px-6 py-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${
                                                record.status === 'validated' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                                                record.status === 'pending' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' :
                                                'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                            }`}>
                                                {t(`common.statusLabels.${record.status}`)}
                                            </span>
                                        </td>
                                    )}

                                    {/* Tipo Documento */}
                                    {visibleColumns.type && (
                                        <td className="px-6 py-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${
                                                    record.type === 'Ticket' ? 'bg-blue-400' :
                                                    record.type === 'Licencia' ? 'bg-purple-400' :
                                                    record.type === 'Staff' ? 'bg-green-400' : 'bg-orange-400'
                                                }`}></span>
                                                <span className="text-sm text-[#525252] dark:text-[#d4d4d4] font-medium">{record.type}</span>
                                            </div>
                                        </td>
                                    )}

                                    {/* Departamento */}
                                    {visibleColumns.department && (
                                        <td className="px-6 py-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                                {record.department}
                                            </span>
                                        </td>
                                    )}

                                    {/* Nombre Documento */}
                                    {visibleColumns.name && (
                                        <td className="px-6 py-2">
                                            <span className="text-sm font-bold text-[#171717] dark:text-[#fafafa] block max-w-[200px] truncate" title={record.name}>
                                                {record.name}
                                            </span>
                                        </td>
                                    )}

                                    {/* Fecha Registro */}
                                    {visibleColumns.date && (
                                        <td className="px-6 py-2 text-sm text-[#525252] dark:text-[#d4d4d4] font-mono">
                                            {record.date}
                                        </td>
                                    )}

                                    {/* Usuario */}
                                    {visibleColumns.user && (
                                        <td className="px-6 py-2">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-[#f5f5f5] dark:bg-[#2A3B5A] flex items-center justify-center text-[#525252] dark:text-[#d4d4d4] font-bold text-xs border border-[#e5e5e5] dark:border-[#2A3B5A] group-hover:bg-[#B84E9D] group-hover:text-white group-hover:border-[#B84E9D] transition-colors">
                                                    {record.user.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium text-[#171717] dark:text-[#fafafa] truncate max-w-[120px]">{record.user}</span>
                                            </div>
                                        </td>
                                    )}

                                    {/* Importe */}
                                    {visibleColumns.amount && (
                                        <td className="px-6 py-2 text-sm font-bold text-[#171717] dark:text-[#fafafa] text-right font-mono">
                                            {record.amount} €
                                        </td>
                                    )}
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
                            {t('common.pagination.showing')} <span className="font-bold text-[#171717] dark:text-[#fafafa]">{indexOfFirstItem + 1}</span> {t('common.pagination.to')} <span className="font-bold text-[#171717] dark:text-[#fafafa]">{Math.min(indexOfLastItem, filteredRecords.length)}</span> {t('common.pagination.of')} <span className="font-bold text-[#171717] dark:text-[#fafafa]">{filteredRecords.length}</span> {t('common.pagination.results')}
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
        </>
      )}

      {/* VIEW RECORD MODAL */}
      {viewingRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
                onClick={closeRecordView}
            ></div>

            <div className="relative bg-white dark:bg-[#131B29] rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200 border border-[#e5e5e5] dark:border-[#2A3B5A]">
                
                {/* Left: Document Preview (Mocked) */}
                <div className="w-full md:w-1/2 bg-[#525252] dark:bg-[#0B1018] flex items-center justify-center relative p-4 border-r border-[#e5e5e5] dark:border-[#2A3B5A]">
                        <div className="text-center text-white/50">
                        <span className="material-symbols-outlined text-8xl mb-4">picture_as_pdf</span>
                        <p className="text-lg font-bold text-white">{viewingRecord.name}</p>
                        <p className="text-sm opacity-70">Vista previa del documento</p>
                        </div>
                        {/* Mobile Close Button */}
                        <button onClick={closeRecordView} className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full md:hidden">
                        <span className="material-symbols-outlined">close</span>
                        </button>
                </div>

                {/* Right: Specific Form Data (Read Only) */}
                <div className="w-full md:w-1/2 flex flex-col bg-white dark:bg-[#131B29]">
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-[#e5e5e5] dark:border-[#2A3B5A] flex justify-between items-center bg-[#fafafa] dark:bg-[#0B1018] shrink-0">
                        <div>
                            <h3 className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">Detalle: {viewingRecord.type}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${
                                    viewingRecord.status === 'validated' ? 'bg-green-50 text-green-700 border-green-200' :
                                    viewingRecord.status === 'pending' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                    'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                    {t(`common.statusLabels.${viewingRecord.status}`)}
                                </span>
                                <span className="text-sm text-[#737373] dark:text-[#a3a3a3]">{viewingRecord.date}</span>
                            </div>
                        </div>
                        <button onClick={closeRecordView} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-[#a3a3a3] hover:text-[#525252] dark:hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-2xl">close</span>
                        </button>
                    </div>

                    {/* Scrollable Form Content */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                        <div className="space-y-6">
                            {/* DYNAMIC FIELDS BASED ON TYPE */}
                            {renderRecordFields(viewingRecord)}

                            {/* Common Economic Data */}
                            <div className="bg-[#fafafa] dark:bg-[#0B1018] rounded-xl p-5 border border-[#e5e5e5] dark:border-[#2A3B5A] mt-6">
                                <h4 className="text-xs font-bold text-[#525252] dark:text-[#a3a3a3] uppercase tracking-wider mb-4 border-b border-[#e5e5e5] dark:border-[#2A3B5A] pb-2">
                                    Resumen Económico
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div><label className={TYPO.label}>Base Imponible</label><input type="text" className={`${TYPO.readOnlyInput} text-right`} value={(parseFloat(viewingRecord.amount) / 1.21).toFixed(2)} readOnly/></div>
                                    <div><label className={TYPO.label}>Impuestos (21%)</label><input type="text" className={`${TYPO.readOnlyInput} text-right`} value={(parseFloat(viewingRecord.amount) - (parseFloat(viewingRecord.amount) / 1.21)).toFixed(2)} readOnly/></div>
                                    <div><label className={TYPO.label}>Total</label><input type="text" className={`${TYPO.readOnlyInput} pl-8 text-right font-bold text-[#171717] dark:text-white`} value={viewingRecord.amount + ' €'} readOnly/></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-8 py-4 border-t border-[#e5e5e5] dark:border-[#2A3B5A] bg-[#fafafa] dark:bg-[#0B1018] flex gap-4 justify-end shrink-0">
                        <button className="px-4 py-2 rounded-xl text-sm font-bold text-[#525252] dark:text-[#d4d4d4] hover:bg-gray-200 dark:hover:bg-white/10 transition-colors flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">download</span>
                            Descargar
                        </button>
                        <button onClick={closeRecordView} className="px-6 py-2 rounded-xl text-sm font-bold bg-[#B84E9D] text-white hover:bg-[#9C3C86] transition-colors">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
