
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface AnalyticsModuleProps {
    viewMode: string;
    onNavigate: (view: string) => void;
    onBack: () => void;
}

// --- SUB-COMPONENTS FOR CHARTS ---

// Simple Donut Chart SVG
const DonutChart = ({ data }: { data: { label: string; value: number; color: string; percent: number }[] }) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div className="relative w-48 h-48">
            <svg viewBox="-1 -1 2 2" className="transform -rotate-90 w-full h-full">
                {data.map((item, index) => {
                    const startPercent = cumulativePercent;
                    const slicePercent = total === 0 ? 0 : item.value / total;
                    cumulativePercent += slicePercent;
                    const endPercent = cumulativePercent;

                    // If single item (or filtered to 1), draw full circle
                    if (slicePercent === 1) {
                        return <circle key={index} cx="0" cy="0" r="1" fill={item.color} />;
                    }

                    const [startX, startY] = getCoordinatesForPercent(startPercent);
                    const [endX, endY] = getCoordinatesForPercent(endPercent);
                    const largeArcFlag = slicePercent > 0.5 ? 1 : 0;

                    const pathData = [
                        `M ${startX} ${startY}`,
                        `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                        `L 0 0`,
                    ].join(' ');

                    return <path key={index} d={pathData} fill={item.color} />;
                })}
                {/* Center hole for donut */}
                <circle cx="0" cy="0" r="0.65" fill="currentColor" className="text-white dark:text-[#131B29]" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Total 100%</span>
            </div>
        </div>
    );
};

// Recharts Implementation strictly following requirements for Billing
export const TicketMedioChart = () => {
    const { t } = useLanguage();
    const [startDate, setStartDate] = useState("2024-01-01");
    const [endDate, setEndDate] = useState("2024-12-31");

    // Extract year for display
    const currentYear = new Date(startDate).getFullYear();

    // 4️⃣ Datos simulados obligatorios
    const data = [
      { month: "Ene", current: 42000, previous: 35000 },
      { month: "Feb", current: 45000, previous: 37000 },
      { month: "Mar", current: 43000, previous: 36000 },
      { month: "Abr", current: 47000, previous: 39000 },
      { month: "May", current: 52000, previous: 41000 },
      { month: "Jun", current: 51000, previous: 40000 },
      { month: "Jul", current: 48000, previous: 39500 },
      { month: "Ago", current: 53000, previous: 42000 },
      { month: "Sep", current: 56000, previous: 43000 },
      { month: "Oct", current: 54000, previous: 44500 },
      { month: "Nov", current: 58000, previous: 46000 },
      { month: "Dic", current: 60000, previous: 48000 },
    ];

    return (
        // 1️⃣ Card principal
        <div className="bg-white dark:bg-[#131B29] rounded-2xl p-6 shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] w-full h-[500px] flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
            
            {/* 2️⃣ Cabecera */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
                <h4 className="text-lg font-bold text-[#171717] dark:text-[#fafafa]">
                    Ticket medio mensual vs año anterior
                </h4>
                
                <div className="flex flex-wrap gap-3">
                    <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-[#737373] dark:text-[#a3a3a3] mb-1 uppercase tracking-wider">
                            {t('analytics.kpiBilling.startDate')}
                        </label>
                        <input 
                            type="date" 
                            className="bg-white dark:bg-[#0B1018] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#171717] dark:text-[#fafafa] rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#B84E9D] focus:border-[#B84E9D] transition-shadow shadow-sm" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-[#737373] dark:text-[#a3a3a3] mb-1 uppercase tracking-wider">
                            {t('analytics.kpiBilling.endDate')}
                        </label>
                        <input 
                            type="date" 
                            className="bg-white dark:bg-[#0B1018] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#171717] dark:text-[#fafafa] rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#B84E9D] focus:border-[#B84E9D] transition-shadow shadow-sm" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* 3️⃣ GRÁFICO (OBLIGATORIO) */}
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} className="dark:opacity-20" />
                        <XAxis 
                            dataKey="month" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#737373', fontSize: 11, fontWeight: 500 }}
                            dy={10}
                            tickFormatter={(value) => `${value} ${currentYear}`}
                        />
                        <YAxis 
                            domain={[0, 100000]} 
                            ticks={[0, 25000, 50000, 75000, 100000]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#737373', fontSize: 11, fontWeight: 500 }}
                            tickFormatter={(value) => value === 0 ? '0 €' : `${value.toLocaleString('es-ES')} €`}
                            width={70}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                borderRadius: '12px', 
                                border: 'none', 
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                padding: '12px'
                            }}
                            itemStyle={{ fontSize: '12px', fontWeight: '600', paddingTop: '4px' }}
                            labelStyle={{ color: '#525252', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}
                            formatter={(value: number) => [`${value.toLocaleString('es-ES')} €`, '']}
                        />
                        <Legend 
                            verticalAlign="top" 
                            height={36} 
                            iconType="circle" 
                            iconSize={8}
                            wrapperStyle={{ top: -10, right: 0, fontSize: '12px', fontWeight: 500 }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="current" 
                            name="Año Actual"
                            stroke="#B84E9D" 
                            strokeWidth={3} 
                            dot={{ r: 4, fill: "#fff", stroke: "#B84E9D", strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: "#B84E9D", stroke: "#fff", strokeWidth: 2 }}
                            animationDuration={1500}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="previous" 
                            name="Año Anterior"
                            stroke="#94a3b8" 
                            strokeWidth={3} 
                            dot={{ r: 4, fill: "#fff", stroke: "#94a3b8", strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: "#94a3b8", stroke: "#fff", strokeWidth: 2 }}
                            strokeDasharray="5 5"
                            animationDuration={1500}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// Recharts Implementation for Collections (KPI Cobros)
export const CollectionsEvolutionChart = () => {
    const { t } = useLanguage();
    const [startDate, setStartDate] = useState("2024-01-01");
    const [endDate, setEndDate] = useState("2024-12-31");

    // Extract year for display
    const currentYear = new Date(startDate).getFullYear();

    // Datos simulados para cobros
    const data = [
      { month: "Ene", current: 38000, previous: 30000 },
      { month: "Feb", current: 41000, previous: 32000 },
      { month: "Mar", current: 39000, previous: 34000 },
      { month: "Abr", current: 45000, previous: 36000 },
      { month: "May", current: 48000, previous: 38000 },
      { month: "Jun", current: 47000, previous: 39000 },
      { month: "Jul", current: 44000, previous: 37000 },
      { month: "Ago", current: 49000, previous: 40000 },
      { month: "Sep", current: 52000, previous: 41000 },
      { month: "Oct", current: 50000, previous: 43000 },
      { month: "Nov", current: 55000, previous: 44000 },
      { month: "Dic", current: 58000, previous: 46000 },
    ];

    return (
        <div className="bg-white dark:bg-[#131B29] rounded-2xl p-6 shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] w-full h-[500px] flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
                <h4 className="text-lg font-bold text-[#171717] dark:text-[#fafafa]">
                    Evolución de Cobros Mensual
                </h4>
                
                <div className="flex flex-wrap gap-3">
                    <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-[#737373] dark:text-[#a3a3a3] mb-1 uppercase tracking-wider">
                            {t('analytics.kpiBilling.startDate')}
                        </label>
                        <input 
                            type="date" 
                            className="bg-white dark:bg-[#0B1018] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#171717] dark:text-[#fafafa] rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#B84E9D] focus:border-[#B84E9D] transition-shadow shadow-sm" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-[#737373] dark:text-[#a3a3a3] mb-1 uppercase tracking-wider">
                            {t('analytics.kpiBilling.endDate')}
                        </label>
                        <input 
                            type="date" 
                            className="bg-white dark:bg-[#0B1018] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#171717] dark:text-[#fafafa] rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#B84E9D] focus:border-[#B84E9D] transition-shadow shadow-sm" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} className="dark:opacity-20" />
                        <XAxis 
                            dataKey="month" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#737373', fontSize: 11, fontWeight: 500 }}
                            dy={10}
                            tickFormatter={(value) => `${value} ${currentYear}`}
                        />
                        <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#737373', fontSize: 11, fontWeight: 500 }}
                            tickFormatter={(value) => value === 0 ? '0 €' : `${value.toLocaleString('es-ES')} €`}
                            width={70}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                borderRadius: '12px', 
                                border: 'none', 
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                padding: '12px'
                            }}
                            itemStyle={{ fontSize: '12px', fontWeight: '600', paddingTop: '4px' }}
                            labelStyle={{ color: '#525252', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}
                            formatter={(value: number) => [`${value.toLocaleString('es-ES')} €`, '']}
                        />
                        <Legend 
                            verticalAlign="top" 
                            height={36} 
                            iconType="circle" 
                            iconSize={8}
                            wrapperStyle={{ top: -10, right: 0, fontSize: '12px', fontWeight: 500 }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="current" 
                            name="Año Actual"
                            stroke="#10b981" // Green color for Collections
                            strokeWidth={3} 
                            dot={{ r: 4, fill: "#fff", stroke: "#10b981", strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                            animationDuration={1500}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="previous" 
                            name="Año Anterior"
                            stroke="#94a3b8" 
                            strokeWidth={3} 
                            dot={{ r: 4, fill: "#fff", stroke: "#94a3b8", strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: "#94a3b8", stroke: "#fff", strokeWidth: 2 }}
                            strokeDasharray="5 5"
                            animationDuration={1500}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export const InvoicesCollectedCountChart = () => {
    const { t } = useLanguage();
    const data = [
      { month: "Ene", count: 4 },
      { month: "Feb", count: 6 },
      { month: "Mar", count: 5 },
      { month: "Abr", count: 8 },
      { month: "May", count: 7 },
      { month: "Jun", count: 9 },
      { month: "Jul", count: 6 },
      { month: "Ago", count: 5 },
      { month: "Sep", count: 8 },
      { month: "Oct", count: 9 },
      { month: "Nov", count: 10 },
      { month: "Dic", count: 8 },
    ];

    return (
        <div className="bg-white dark:bg-[#131B29] rounded-2xl p-6 shadow-card border border-[#e5e5e5] dark:border-[#2A3B5A] w-full h-[400px] flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h4 className="text-lg font-bold text-[#171717] dark:text-[#fafafa] mb-6">
                {t('analytics.kpiCollections.invoicesCollectedCount')}
            </h4>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} className="dark:opacity-20" />
                        <XAxis 
                            dataKey="month" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#737373', fontSize: 11, fontWeight: 500 }}
                            dy={10}
                        />
                        <YAxis 
                            domain={[0, 10]}
                            ticks={[0, 2, 4, 6, 8, 10]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#737373', fontSize: 11, fontWeight: 500 }}
                        />
                        <Tooltip 
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                borderRadius: '12px', 
                                border: 'none', 
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                padding: '12px'
                            }}
                            itemStyle={{ fontSize: '12px', fontWeight: '600', paddingTop: '4px', color: '#10b981' }}
                            labelStyle={{ color: '#525252', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}
                        />
                        <Bar 
                            dataKey="count" 
                            fill="#10b981" 
                            radius={[4, 4, 0, 0]}
                            barSize={30}
                            name="Facturas"
                            animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// --- NEW COMPONENT: ANALYTICS DASHBOARD SUMMARY ---
const AnalyticsDashboard: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
    const { t } = useLanguage();

    const shortcuts = [
        { id: 'kpi-billing', label: t('nav.kpiBilling'), icon: 'receipt', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400', desc: 'Análisis de facturación y tendencias' },
        { id: 'kpi-collections', label: t('nav.kpiCollections'), icon: 'savings', color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400', desc: 'Control de cobros y deuda' },
        { id: 'kpi-expenses', label: t('nav.kpiExpenses'), icon: 'credit_card', color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400', desc: 'Desglose de gastos corporativos' },
        { id: 'kpi-financials', label: t('nav.kpiFinancials'), icon: 'trending_up', color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400', desc: 'Ratios y salud financiera' },
    ];

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-20">
            {/* Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-gradient-to-r from-indigo-900 to-purple-900 rounded-2xl p-8 text-white shadow-card relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                        <h2 className="text-4xl font-poppins font-bold mb-3">{t('analytics.dashboard.title')}</h2>
                        <p className="text-indigo-100 text-sm mb-8 max-w-lg leading-relaxed">
                            {t('analytics.dashboard.subtitle')}
                        </p>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => onNavigate('kpi-financials')}
                                className="px-5 py-2.5 bg-white text-indigo-900 font-bold text-sm rounded-xl shadow-md hover:bg-indigo-50 transition-colors"
                            >
                                {t('analytics.dashboard.viewReport')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Key Metric Card */}
                <div className="bg-white dark:bg-[#131B29] rounded-2xl p-6 border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-card flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-md uppercase tracking-wider">EBITDA (YTD)</span>
                            <span className="material-symbols-outlined text-gray-400">trending_up</span>
                        </div>
                        <h3 className="text-3xl font-bold font-poppins text-[#171717] dark:text-[#fafafa] mb-1">€42,500</h3>
                        <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">arrow_upward</span>
                            15% vs año anterior
                        </p>
                    </div>
                    <div className="mt-4">
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mb-2">
                            <div className="bg-green-500 h-1.5 rounded-full w-[85%]"></div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-right">Objetivo anual: 85% completado</p>
                    </div>
                </div>
            </div>

            {/* Modules Grid */}
            <h3 className="text-xl font-bold font-poppins text-[#171717] dark:text-[#fafafa]">{t('analytics.dashboard.modulesTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {shortcuts.map((item) => (
                    <div 
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className="group cursor-pointer bg-white dark:bg-[#131B29] p-6 rounded-2xl border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${item.color}`}>
                            <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                        </div>
                        <h4 className="font-bold text-lg mb-2 text-[#171717] dark:text-[#fafafa]">{item.label}</h4>
                        <p className="text-sm text-[#737373] dark:text-[#a3a3a3] leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </div>

            {/* Charts Summary Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-[#131B29] rounded-2xl border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-card p-6 h-[400px] flex flex-col">
                    <h4 className="text-lg font-bold text-[#171717] dark:text-[#fafafa] mb-6">Ingresos vs Gastos (Últimos 6 meses)</h4>
                    <div className="flex-1 w-full min-h-0">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                {name: 'Jul', inc: 4000, exp: 2400},
                                {name: 'Ago', inc: 3000, exp: 1398},
                                {name: 'Sep', inc: 2000, exp: 9800},
                                {name: 'Oct', inc: 2780, exp: 3908},
                                {name: 'Nov', inc: 1890, exp: 4800},
                                {name: 'Dic', inc: 2390, exp: 3800},
                            ]} margin={{top:10, right:10, left:-20, bottom:0}}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" className="dark:opacity-20"/>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#737373', fontSize: 12}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#737373', fontSize: 12}} />
                                <Tooltip 
                                    cursor={{fill: 'transparent'}}
                                    contentStyle={{backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                />
                                <Bar dataKey="inc" name="Ingresos" fill="#10b981" radius={[4,4,0,0]} barSize={20} />
                                <Bar dataKey="exp" name="Gastos" fill="#ef4444" radius={[4,4,0,0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                {/* Insights / AI Summary */}
                <div className="bg-white dark:bg-[#131B29] rounded-2xl border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-card p-6 flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="material-symbols-outlined text-[#B84E9D]">auto_awesome</span>
                        <h4 className="text-lg font-bold text-[#171717] dark:text-[#fafafa]">Insights IA</h4>
                    </div>
                    
                    <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                        <div className="p-4 bg-[#fafafa] dark:bg-[#0B1018] rounded-xl border border-[#e5e5e5] dark:border-[#2A3B5A]">
                            <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-1">Tendencia de Costos</p>
                            <p className="text-xs text-[#737373] dark:text-[#a3a3a3]">Se ha detectado un aumento del 12% en "Servicios Profesionales" respecto al Q3.</p>
                        </div>
                        <div className="p-4 bg-[#fafafa] dark:bg-[#0B1018] rounded-xl border border-[#e5e5e5] dark:border-[#2A3B5A]">
                            <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-1">Previsión de Caja</p>
                            <p className="text-xs text-[#737373] dark:text-[#a3a3a3]">El flujo de caja se mantendrá positivo los próximos 45 días basado en facturación recurrente.</p>
                        </div>
                        <div className="p-4 bg-[#fafafa] dark:bg-[#0B1018] rounded-xl border border-[#e5e5e5] dark:border-[#2A3B5A]">
                            <p className="text-sm font-semibold text-[#171717] dark:text-[#fafafa] mb-1">Anomalía Detectada</p>
                            <p className="text-xs text-[#737373] dark:text-[#a3a3a3]">Un proveedor habitual ha incrementado sus tarifas sin previo aviso en la última factura.</p>
                        </div>
                    </div>
                    
                    <button className="mt-6 w-full py-2.5 rounded-xl border border-[#e5e5e5] dark:border-[#2A3B5A] text-sm font-bold text-[#525252] dark:text-[#d4d4d4] hover:bg-[#fafafa] dark:hover:bg-[#0B1018] transition-colors">
                        Generar informe detallado
                    </button>
                </div>
            </div>
        </div>
    );
};


export const AnalyticsModule: React.FC<AnalyticsModuleProps> = ({ viewMode, onNavigate, onBack }) => {
    const { t } = useLanguage();
    
    // Data definition moved to component scope
    const pivotData = [
        { category: 'Licencias de Software', count: 45, amount: 40000, percent: 32, color: '#B84E9D' },
        { category: 'Servicios Profesionales', count: 32, amount: 50000, percent: 40, color: '#6366f1' },
        { category: 'Consultoría Estratégica', count: 18, amount: 34500, percent: 28, color: '#10b981' },
    ];

    // Multi-select state
    const [selectedCategories, setSelectedCategories] = useState<string[]>(pivotData.map(p => p.category));
    const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);

    // Effect to ensure selection is initialized (if pivotData were dynamic)
    useEffect(() => {
        if (selectedCategories.length === 0 && pivotData.length > 0) {
            setSelectedCategories(pivotData.map(p => p.category));
        }
    }, []);

    const toggleCategory = (category: string) => {
        if (selectedCategories.includes(category)) {
            // Allow deselecting all? Yes, but UI might look empty.
            setSelectedCategories(prev => prev.filter(c => c !== category));
        } else {
            setSelectedCategories(prev => [...prev, category]);
        }
    };

    const toggleAllCategories = () => {
        if (selectedCategories.length === pivotData.length) {
            setSelectedCategories([]);
        } else {
            setSelectedCategories(pivotData.map(p => p.category));
        }
    };

    // --- KPI BILLING VIEW ---
    if (viewMode === 'kpi-billing') {
        const topCards = [
            { label: t('analytics.kpiBilling.netAmount'), value: '124.500 €', icon: 'payments', trend: '+12%', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: t('analytics.kpiBilling.totalAmount'), value: '150.645 €', icon: 'receipt_long', trend: '+12%', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
            { label: t('analytics.kpiBilling.forecast'), value: '135.000 €', icon: 'trending_up', trend: '+5%', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
            { label: t('analytics.kpiBilling.cycle'), value: '45', sub: 'días', icon: 'timelapse', trend: '-3 días', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
        ];

        const filteredPivotData = pivotData.filter(item => selectedCategories.includes(item.category));

        const totalAmount = filteredPivotData.reduce((acc, curr) => acc + curr.amount, 0);
        const totalCount = filteredPivotData.reduce((acc, curr) => acc + curr.count, 0);

        return (
            <div className="w-full px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => onNavigate('dashboard')}
                            className="p-2.5 rounded-xl bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] hover:border-[#d4d4d4] transition-colors shadow-sm"
                            title={t('common.back')}
                        >
                            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                        </button>
                        <h2 className="text-2xl font-bold text-[#171717] dark:text-white">{t('nav.kpiBilling')}</h2>
                    </div>
                    {/* Link to Records */}
                    <button 
                        onClick={() => {
                            console.log("Navigating to records with filter");
                        }}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] rounded-lg text-sm font-bold text-[#525252] dark:text-[#d4d4d4] hover:bg-[#fafafa] dark:hover:bg-[#0B1018] transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">table_view</span>
                        {t('analytics.kpiBilling.viewRecords')}
                    </button>
                </div>

                {/* 1. TOP CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {topCards.map((card, idx) => (
                        <div key={idx} className="bg-white dark:bg-[#131B29] rounded-2xl p-6 border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-card flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                                    <span className="material-symbols-outlined text-2xl">{card.icon}</span>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${card.trend.includes('+') ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'}`}>
                                    {card.trend}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-[#737373] dark:text-[#a3a3a3] uppercase tracking-wider mb-1">{card.label}</p>
                                <div className="flex items-baseline gap-1">
                                    <h3 className="text-2xl font-bold text-[#171717] dark:text-white">{card.value}</h3>
                                    {card.sub && <span className="text-sm text-[#737373] dark:text-[#a3a3a3] font-medium">{card.sub}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 2. MIDDLE SECTION: PIVOT TABLE & DONUT */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Pivot Table (2/3) */}
                    <div className="lg:col-span-2 bg-white dark:bg-[#131B29] rounded-2xl border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-lg font-bold text-[#171717] dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#B84E9D]">pivot_table_chart</span>
                                {t('analytics.kpiBilling.byCategory')}
                            </h4>
                            
                            {/* MULTI-SELECT CHECKBOX FILTER */}
                            <div className="relative">
                                <button 
                                    onClick={() => setIsCategoryFilterOpen(!isCategoryFilterOpen)}
                                    className="flex items-center gap-2 bg-[#fafafa] dark:bg-[#0B1018] border border-[#e5e5e5] dark:border-[#2A3B5A] text-xs rounded-lg px-3 py-2 text-[#525252] dark:text-[#d4d4d4] font-medium hover:border-[#B84E9D] transition-colors shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-[16px]">filter_list</span>
                                    <span>
                                        {selectedCategories.length === pivotData.length 
                                            ? 'Todas' 
                                            : `${selectedCategories.length} seleccionadas`}
                                    </span>
                                    <span className="material-symbols-outlined text-sm">expand_more</span>
                                </button>

                                {isCategoryFilterOpen && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-10 bg-transparent" 
                                            onClick={() => setIsCategoryFilterOpen(false)}
                                        ></div>
                                        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#1B273B] rounded-xl shadow-xl border border-[#e5e5e5] dark:border-[#2A3B5A] z-20 p-4 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#e5e5e5] dark:border-[#2A3B5A]">
                                                <span className="text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">Filtrar Categorías</span>
                                                <button 
                                                    onClick={toggleAllCategories} 
                                                    className="text-xs text-[#B84E9D] font-bold hover:underline"
                                                >
                                                    {selectedCategories.length === pivotData.length ? 'Deseleccionar' : 'Todas'}
                                                </button>
                                            </div>
                                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                                {pivotData.map((item) => (
                                                    <label 
                                                        key={item.category} 
                                                        className="flex items-center gap-3 cursor-pointer group select-none hover:bg-gray-50 dark:hover:bg-white/5 p-1.5 rounded-lg transition-colors"
                                                    >
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedCategories.includes(item.category) ? 'bg-[#B84E9D] border-[#B84E9D]' : 'bg-white dark:bg-[#0B1018] border-[#d4d4d4] dark:border-[#525252] group-hover:border-[#B84E9D]'}`}>
                                                            {selectedCategories.includes(item.category) && <span className="material-symbols-outlined text-white text-[10px] font-bold">check</span>}
                                                        </div>
                                                        <input 
                                                            type="checkbox" 
                                                            className="hidden" 
                                                            checked={selectedCategories.includes(item.category)} 
                                                            onChange={() => toggleCategory(item.category)} 
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                                                            <span className="text-xs font-medium text-[#525252] dark:text-[#d4d4d4]">{item.category}</span>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#e5e5e5] dark:border-[#2A3B5A]">
                                        <th className="py-3 px-4 text-xs font-bold text-[#737373] dark:text-[#a3a3a3] uppercase tracking-wider">{t('analytics.kpiBilling.category')}</th>
                                        <th className="py-3 px-4 text-xs font-bold text-[#737373] dark:text-[#a3a3a3] uppercase tracking-wider text-right">{t('analytics.kpiBilling.recordCount')}</th>
                                        <th className="py-3 px-4 text-xs font-bold text-[#737373] dark:text-[#a3a3a3] uppercase tracking-wider text-right">{t('analytics.kpiBilling.amount')}</th>
                                        <th className="py-3 px-4 text-xs font-bold text-[#737373] dark:text-[#a3a3a3] uppercase tracking-wider text-right">{t('analytics.kpiBilling.percentage')}</th>
                                        <th className="py-3 px-4 text-xs font-bold text-[#737373] dark:text-[#a3a3a3] uppercase tracking-wider text-right">{t('common.total')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e5e5e5] dark:divide-[#2A3B5A]">
                                    {filteredPivotData.length > 0 ? (
                                        filteredPivotData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-[#fafafa] dark:hover:bg-[#1B273B] transition-colors">
                                                <td className="py-3 px-4 flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }}></div>
                                                    <span className="text-sm font-medium text-[#171717] dark:text-[#fafafa]">{row.category}</span>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-[#525252] dark:text-[#d4d4d4] text-right font-mono">
                                                    {row.count}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-[#171717] dark:text-[#fafafa] text-right font-mono">
                                                    €{row.amount.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-[#171717] dark:text-[#fafafa] text-right font-bold">
                                                    {row.percent}%
                                                </td>
                                                <td className="py-3 px-4 text-sm text-[#171717] dark:text-[#fafafa] text-right font-bold">
                                                    €{row.amount.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                                                No hay categorías seleccionadas
                                            </td>
                                        </tr>
                                    )}
                                    {/* Total Row */}
                                    <tr className="bg-[#fafafa] dark:bg-[#0B1018] font-bold border-t border-[#e5e5e5] dark:border-[#2A3B5A]">
                                        <td className="py-3 px-4 text-sm text-[#171717] dark:text-white uppercase tracking-wider">{t('common.total')}</td>
                                        <td className="py-3 px-4 text-sm text-[#171717] dark:text-white text-right font-mono">{totalCount}</td>
                                        <td className="py-3 px-4 text-sm text-[#171717] dark:text-white text-right font-mono">€{totalAmount.toLocaleString()}</td>
                                        <td className="py-3 px-4 text-sm text-[#171717] dark:text-white text-right">
                                            {filteredPivotData.length === pivotData.length ? '100%' : filteredPivotData.reduce((acc, curr) => acc + curr.percent, 0) + '%'}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-[#171717] dark:text-white text-right">€{totalAmount.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Donut Chart (1/3) */}
                    <div className="bg-white dark:bg-[#131B29] rounded-2xl border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-card p-6 flex flex-col justify-center">
                        <h4 className="text-lg font-bold text-[#171717] dark:text-white mb-6 text-center w-full">
                            {t('analytics.kpiBilling.distribution')}
                        </h4>
                        {filteredPivotData.length > 0 ? (
                            <div className="flex flex-row items-center justify-center gap-6">
                                {/* Graphic */}
                                <div className="shrink-0">
                                    <DonutChart 
                                        data={filteredPivotData.map(d => ({ label: d.category, value: d.amount, color: d.color, percent: d.percent }))}
                                    />
                                </div>
                                
                                {/* Legend on the Right */}
                                <div className="flex flex-col gap-3">
                                    {filteredPivotData.map((d, i) => (
                                        <div key={i} className="flex flex-col">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }}></div>
                                                <span className="text-xs font-bold text-[#171717] dark:text-[#fafafa]">
                                                    {d.percent}%
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-[#737373] dark:text-[#a3a3a3] max-w-[100px] leading-tight" title={d.category}>{d.category}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-[#a3a3a3] text-sm">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">data_usage</span>
                                No data available
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. BOTTOM SECTION: TEMPORAL GRAPH */}
                <TicketMedioChart />
            </div>
        );
    }

    // --- KPI COLLECTIONS VIEW ---
    if (viewMode === 'kpi-collections') {
        const topCards = [
            { label: t('analytics.kpiCollections.netCollected'), value: '85.400 €', icon: 'payments', trend: '+8%', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: t('analytics.kpiCollections.totalCollected'), value: '103.334 €', icon: 'account_balance_wallet', trend: '+8%', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
            { label: t('analytics.kpiCollections.pendingCollection'), value: '12.200 €', icon: 'pending_actions', trend: '-2%', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
            { label: t('analytics.kpiCollections.avgCollectionTime'), value: '28', sub: 'días', icon: 'timelapse', trend: '-2 días', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ];

        const riskCards = [
            { label: t('analytics.kpiCollections.pending0_30'), value: '5.200 €', icon: 'schedule', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
            { label: t('analytics.kpiCollections.pending31_60'), value: '2.500 €', icon: 'warning', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
            { label: t('analytics.kpiCollections.pending61_100'), value: '850 €', icon: 'error', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
        ];

        return (
            <div className="w-full px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => onNavigate('dashboard')}
                            className="p-2.5 rounded-xl bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] hover:border-[#d4d4d4] transition-colors shadow-sm"
                            title={t('common.back')}
                        >
                            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                        </button>
                        <h2 className="text-2xl font-bold text-[#171717] dark:text-white">{t('nav.kpiCollections')}</h2>
                    </div>
                </div>

                {/* 1. TOP CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {topCards.map((card, idx) => (
                        <div key={idx} className="bg-white dark:bg-[#131B29] rounded-2xl p-6 border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-card flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                                    <span className="material-symbols-outlined text-2xl">{card.icon}</span>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${card.trend.includes('+') ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'}`}>
                                    {card.trend}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-[#737373] dark:text-[#a3a3a3] uppercase tracking-wider mb-1">{card.label}</p>
                                <div className="flex items-baseline gap-1">
                                    <h3 className="text-2xl font-bold text-[#171717] dark:text-white">{card.value}</h3>
                                    {card.sub && <span className="text-sm text-[#737373] dark:text-[#a3a3a3] font-medium">{card.sub}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 2. RISK CARDS */}
                <div>
                    <h4 className="text-lg font-bold text-[#171717] dark:text-white mb-4">
                        {t('analytics.kpiCollections.riskTitle')}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {riskCards.map((card, idx) => (
                            <div key={idx} className="bg-white dark:bg-[#131B29] rounded-2xl p-6 border border-[#e5e5e5] dark:border-[#2A3B5A] shadow-card flex items-center gap-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                                    <span className="material-symbols-outlined text-2xl">{card.icon}</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-[#737373] dark:text-[#a3a3a3] uppercase tracking-wider">{card.label}</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-bold text-[#171717] dark:text-[#fafafa]">{card.value}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. CHART SECTION */}
                <CollectionsEvolutionChart />

                {/* 4. NEW CHART SECTION */}
                <InvoicesCollectedCountChart />
            </div>
        );
    }

    // Default: Main Analytics Dashboard View
    return <AnalyticsDashboard onNavigate={onNavigate} />;
};
