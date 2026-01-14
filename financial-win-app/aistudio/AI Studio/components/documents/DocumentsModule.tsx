
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { BillingModule } from '../billing/BillingModule';

interface DocumentsModuleProps {
    viewMode: string;
    onNavigate: (view: string) => void;
    onBack: () => void;
}

export const DocumentsModule: React.FC<DocumentsModuleProps> = ({ viewMode, onNavigate, onBack }) => {
    const { t } = useLanguage();

    // Map viewMode to moduleType for BillingModule
    const getModuleType = (mode: string) => {
        switch (mode) {
            case 'licenses': return 'invoices';
            case 'tickets': return 'tickets';
            case 'staff': return 'staff';
            case 'consultants': return 'consultants';
            default: return 'invoices'; // Default fallback
        }
    };

    // Treat 'dashboard' as 'licenses' default to show the layout immediately
    const currentTab = viewMode === 'dashboard' ? 'licenses' : viewMode;

    const tabs = [
        { id: 'licenses', label: t('nav.docs.licenses'), icon: 'workspace_premium' },
        { id: 'tickets', label: t('nav.tickets'), icon: 'receipt' },
        { id: 'staff', label: t('nav.staff'), icon: 'badge' },
        { id: 'consultants', label: t('nav.docs.consultants'), icon: 'engineering' }
    ];

    return (
        <div className="w-full h-full px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col">
            
            {/* Header: Grid layout to center tabs perfectly */}
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 mb-8 shrink-0">
                
                {/* Left: Back Button */}
                <div className="flex justify-start">
                    <button 
                        onClick={onBack}
                        className="p-2.5 rounded-xl bg-white dark:bg-[#1B273B] border border-[#e5e5e5] dark:border-[#2A3B5A] text-[#a3a3a3] hover:text-[#525252] dark:hover:text-[#d4d4d4] hover:border-[#d4d4d4] transition-colors shadow-sm"
                        title={t('common.backToMenu')}
                    >
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    </button>
                </div>

                {/* Center: Navigation Tabs */}
                <div className="flex justify-center w-full overflow-x-auto">
                    <div className="bg-white dark:bg-[#131B29] p-1.5 rounded-xl border border-gray-200 dark:border-[#2A3B5A] shadow-sm flex items-center gap-1">
                        {tabs.map((tab) => {
                            const isActive = currentTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => onNavigate(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap
                                        ${isActive 
                                            ? 'bg-[#B84E9D] text-white shadow-md shadow-[#B84E9D]/20' 
                                            : 'text-[#737373] dark:text-[#a3a3a3] hover:bg-gray-50 dark:hover:bg-[#1B273B] hover:text-[#171717] dark:hover:text-[#fafafa]'
                                        }
                                    `}
                                >
                                    <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Spacer to maintain grid balance (hidden on mobile) */}
                <div className="hidden md:block"></div>
            </div>

            {/* Main Content Area - Full Width BillingModule using key to reset state on tab change */}
            <div className="flex-1 min-h-0 relative">
                <BillingModule
                    key={currentTab}
                    viewMode="upload" // Always in upload mode layout for Documents
                    moduleType={getModuleType(currentTab) as any}
                    onBack={onBack}
                    onNavigate={() => {}}
                    isEmbedded={true} // Set to true to hide BillingModule's internal back button
                    hideHistory={true}
                />
            </div>
        </div>
    );
};
