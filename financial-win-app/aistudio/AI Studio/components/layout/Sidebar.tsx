
import React, { useState } from 'react';
import { NavItem, ViewState, NavSubItem } from '../../types';
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState, subAction?: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, onToggle }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null); // For 3rd level
  const { t } = useLanguage();

  const NAV_ITEMS: NavItem[] = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: 'dashboard' },
    { 
      id: 'documents', 
      label: t('nav.documents'), 
      icon: 'folder'
      // Sub-items removed as per request to clear layouts for Licenses, Tickets, Subscriptions
    },
    { 
      id: 'records', 
      label: t('nav.records'), 
      icon: 'table_view'
    },
    { 
      id: 'billing', 
      label: t('nav.billing'), 
      icon: 'receipt_long',
      subItems: [
        { 
            label: t('nav.payments'), 
            action: 'payments',
            icon: 'payments'
        },
        { 
            label: t('nav.collections'), 
            action: 'collections',
            icon: 'account_balance_wallet'
        }
      ]
    },
    { 
      id: 'clients', 
      label: t('nav.clients'), 
      icon: 'group',
      subItems: [
        { label: t('nav.newClient'), action: 'create', icon: 'person_add' },
        { label: t('nav.listClients'), action: 'list', icon: 'list' }
      ]
    },
    { 
      id: 'suppliers', 
      label: t('nav.suppliers'), 
      icon: 'local_shipping',
      subItems: [
        { label: t('nav.newSupplier'), action: 'create', icon: 'add_business' },
        { label: t('nav.listSuppliers'), action: 'list', icon: 'list' }
      ]
    }
  ];

  const handleParentClick = (item: NavItem) => {
    if (!isOpen) {
        onToggle();
        // If it's a doc module, this will navigate to the dashboard (summary)
        onChangeView(item.id); 
        return;
    }

    // Navigate to the main item (which for docs is the dashboard)
    onChangeView(item.id);
    
    // Toggle expansion if it has subitems
    if (item.subItems) {
      setExpandedId(prev => prev === item.id ? null : item.id);
    }
  };

  const handleSubItemClick = (e: React.MouseEvent, itemId: ViewState, subItem: NavSubItem) => {
    e.stopPropagation(); 
    
    // If it has sub-items (3rd level), toggle them
    if (subItem.subItems) {
        setExpandedSubId(prev => prev === subItem.action ? null : subItem.action);
        // Also navigate to the main action of this subitem
        onChangeView(itemId, subItem.action);
    } else {
        onChangeView(itemId, subItem.action);
    }
  };

  const handleThirdLevelClick = (e: React.MouseEvent, itemId: ViewState, action: string) => {
      e.stopPropagation();
      onChangeView(itemId, action);
  }

  return (
    <aside 
      className={`
        fixed inset-y-0 left-0 z-30 
        md:relative
        h-full bg-[#171717] dark:bg-[#0B1018] text-white flex flex-col shadow-xl border-r border-gray-800 dark:border-secondary-border flex-shrink-0 
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0 md:w-20'}
      `}
    >
        {/* Toggle Button - Arrow on the edge */}
        <button
            onClick={onToggle}
            className="absolute -right-3 top-7 z-50 bg-white dark:bg-secondary-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-secondary-border rounded-full p-1 shadow-md hover:text-brand-500 transition-colors hidden md:flex items-center justify-center w-6 h-6"
        >
            <span className="material-symbols-outlined text-sm">
                {isOpen ? 'chevron_left' : 'chevron_right'}
            </span>
        </button>

      {/* Internal wrapper */}
      <div className={`flex flex-col h-full overflow-hidden ${isOpen ? 'w-64' : 'w-20'}`}>
        {/* Brand */}
        <div className={`h-20 flex items-center ${isOpen ? 'px-4' : 'justify-center'} border-b border-gray-800 dark:border-secondary-border flex-shrink-0 transition-all`}>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-700 flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0">
              <span className="material-symbols-outlined text-white text-lg">all_inclusive</span>
            </div>
            {/* Hide text when collapsed */}
            <h1 className={`font-poppins font-bold text-2xl tracking-tight whitespace-nowrap ml-3 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                FinancialWin
            </h1>
          </div>
        </div>

        {/* Navigation - Scrollable Area */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 overflow-x-hidden">
          <div className={`text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 whitespace-nowrap transition-all ${isOpen ? 'px-3 opacity-100' : 'px-0 text-center opacity-0 hidden'}`}>
            {t('nav.operative')}
          </div>
          
          {NAV_ITEMS.map((item) => {
            const isActive = currentView === item.id || (item.subItems?.some(sub => currentView === item.id /* logic handled in parent */));
            // Exact match for highlighting parent if selected
            const isSelected = currentView === item.id;
            const isExpanded = expandedId === item.id;
            const hasSubItems = item.subItems && item.subItems.length > 0;

            return (
              <div key={item.id} className="mb-1">
                <button
                  onClick={() => handleParentClick(item)}
                  className={`w-full flex items-center ${isOpen ? 'justify-between px-3' : 'justify-center px-0'} py-3 rounded-xl transition-all duration-200 group whitespace-nowrap ${
                    isSelected 
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' 
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                  }`}
                  title={!isOpen ? item.label : ''}
                >
                  <div className={`flex items-center ${!isOpen && 'justify-center w-full'}`}>
                    <span className={`material-symbols-outlined ${isOpen ? 'mr-3' : ''} ${isSelected ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>
                      {item.icon}
                    </span>
                    <span className={`font-medium text-base transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 hidden w-0'}`}>
                        {item.label}
                    </span>
                  </div>
                  
                  {hasSubItems && isOpen && (
                    <span className={`material-symbols-outlined text-sm transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                      expand_more
                    </span>
                  )}
                </button>

                {/* Submenu - Only visible if Sidebar is Open */}
                {hasSubItems && isOpen && (
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                    <div className="ml-4 pl-4 border-l border-gray-700 space-y-1">
                      {item.subItems!.map((sub) => {
                          const hasThirdLevel = sub.subItems && sub.subItems.length > 0;
                          const isSubExpanded = expandedSubId === sub.action;

                          return (
                            <div key={sub.action}>
                                <button
                                    onClick={(e) => handleSubItemClick(e, item.id, sub)}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800/30 transition-colors text-left"
                                >
                                    <div className="flex items-center">
                                        {/* Use explicit icon if available */}
                                        {sub.icon ? (
                                            <span className="material-symbols-outlined text-[18px] mr-2">{sub.icon}</span>
                                        ) : (
                                            // Fallback logic for legacy/non-specified icons (though all now have icons)
                                            <>
                                                {sub.action === 'create' && <span className="material-symbols-outlined text-[18px] mr-2">add</span>}
                                                {sub.action === 'list' && <span className="material-symbols-outlined text-[18px] mr-2">list</span>}
                                                {sub.action === 'records' && <span className="material-symbols-outlined text-[18px] mr-2">table_chart</span>}
                                            </>
                                        )}
                                        {sub.label}
                                    </div>
                                    {hasThirdLevel && (
                                        <span className={`material-symbols-outlined text-[14px] transition-transform duration-200 ${isSubExpanded ? 'rotate-180' : ''}`}>
                                            expand_more
                                        </span>
                                    )}
                                </button>

                                {/* 3rd Level Menu */}
                                {hasThirdLevel && (
                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSubExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="ml-2 pl-2 border-l border-gray-700 space-y-1 mt-1">
                                            {sub.subItems!.map((third) => (
                                                <button
                                                    key={third.action}
                                                    onClick={(e) => handleThirdLevelClick(e, item.id, third.action)}
                                                    className="w-full flex items-center px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-gray-800/30 transition-colors text-left"
                                                >
                                                    {third.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                          );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
        </nav>

        {/* Bottom Actions (Settings & Help) - Moved to bottom */}
        <div className="p-3 border-t border-gray-800 dark:border-secondary-border mt-auto flex-shrink-0 space-y-1">
           <button 
                className={`w-full flex items-center ${isOpen ? 'px-3' : 'justify-center px-0'} py-3 rounded-xl text-gray-400 hover:bg-gray-800/50 hover:text-white transition-all whitespace-nowrap`}
                title={!isOpen ? t('nav.settings') : ''}
            >
                <span className={`material-symbols-outlined ${isOpen ? 'mr-3' : ''} text-gray-500`}>settings</span>
                <span className={`font-medium text-base transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 hidden w-0'}`}>{t('nav.settings')}</span>
            </button>
            
            <button 
                className={`w-full flex items-center ${isOpen ? 'px-3' : 'justify-center px-0'} py-3 rounded-xl text-gray-400 hover:bg-gray-800/50 hover:text-white transition-all whitespace-nowrap`}
                title={!isOpen ? t('nav.help') : ''}
            >
                <span className={`material-symbols-outlined ${isOpen ? 'mr-3' : ''} text-gray-500`}>help</span>
                <span className={`font-medium text-base transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 hidden w-0'}`}>{t('nav.help')}</span>
            </button>
        </div>

      </div>
    </aside>
  );
};