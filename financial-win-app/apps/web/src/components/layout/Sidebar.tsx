import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NavItem, ViewState, NavSubItem } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState, subAction?: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, onToggle }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const { t } = useLanguage();
  const location = useLocation();
  
  // Detectar si estamos en la ruta de settings
  const isSettingsActive = location.pathname === '/settings';

  const NAV_ITEMS: NavItem[] = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: 'dashboard' },
    { 
      id: 'documents', 
      label: t('nav.documents'), 
      icon: 'folder'
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
    },
    { 
      id: 'ai-extraction', 
      label: t('nav.ai-extraction'), 
      icon: 'auto_awesome'
    }
  ];

  const handleParentClick = (item: NavItem) => {
    if (!isOpen) {
        onToggle();
        onChangeView(item.id); 
        return;
    }

    onChangeView(item.id);
    
    if (item.subItems) {
      setExpandedId(prev => prev === item.id ? null : item.id);
    }
  };

  const handleSubItemClick = (e: React.MouseEvent, itemId: ViewState, subItem: NavSubItem) => {
    e.stopPropagation(); 
    
    if (subItem.subItems) {
        setExpandedSubId(prev => prev === subItem.action ? null : subItem.action);
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
      className={`sidebar-container ${isOpen ? 'sidebar-container-open' : 'sidebar-container-closed'}`}
    >
        <button
            onClick={onToggle}
            className="sidebar-toggle-button"
        >
            <span className="material-symbols-outlined text-sm">
                {isOpen ? 'chevron_left' : 'chevron_right'}
            </span>
        </button>

      <div className={`sidebar-inner ${isOpen ? 'sidebar-inner-open' : 'sidebar-inner-closed'}`}>
        <div className={`sidebar-header ${isOpen ? 'sidebar-header-open' : 'sidebar-header-closed'}`}>
            <div className="sidebar-logo-container">
            <div className="sidebar-logo-icon-wrapper">
              <span className="material-symbols-outlined sidebar-logo-icon">all_inclusive</span>
            </div>
            <h1 className={`sidebar-logo-text ${isOpen ? 'sidebar-logo-text-open' : 'sidebar-logo-text-closed'}`}>
                FinancialWin
            </h1>
          </div>
        </div>

        <div className="sidebar-content-wrapper">
          <nav className="sidebar-nav">
            <div className={`sidebar-section-label ${isOpen ? 'sidebar-section-label-open' : 'sidebar-section-label-closed'}`}>
              {t('nav.operative')}
            </div>
            
            {NAV_ITEMS.map((item) => {
            const isActive = currentView === item.id || (item.subItems?.some(sub => currentView === item.id));
            const isSelected = currentView === item.id;
            const isExpanded = expandedId === item.id;
            const hasSubItems = item.subItems && item.subItems.length > 0;

            return (
              <div key={item.id} className="sidebar-item-wrapper">
                <button
                  onClick={() => handleParentClick(item)}
                  className={`sidebar-item-button group ${isOpen ? 'sidebar-item-button-open' : 'sidebar-item-button-closed'} ${isSelected ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
                  title={!isOpen ? item.label : ''}
                >
                  <div className={`sidebar-item-content ${!isOpen && 'sidebar-item-content-closed'}`}>
                    <span className={`material-symbols-outlined sidebar-item-icon ${isOpen ? 'sidebar-item-icon-open' : ''} ${isSelected ? 'sidebar-item-icon-active' : 'sidebar-item-icon-inactive'}`}>
                      {item.icon}
                    </span>
                    <span className={`sidebar-item-label ${isOpen ? 'sidebar-item-label-open' : 'sidebar-item-label-closed'}`}>
                        {item.label}
                    </span>
                  </div>
                  
                  {hasSubItems && isOpen && (
                    <span className={`material-symbols-outlined sidebar-item-expand-icon ${isExpanded ? 'sidebar-item-expand-icon-expanded' : ''} ${isSelected ? 'sidebar-item-expand-icon-active' : 'sidebar-item-expand-icon-inactive'}`}>
                      expand_more
                    </span>
                  )}
                </button>

                {hasSubItems && isOpen && (
                  <div className={`sidebar-submenu ${isExpanded ? 'sidebar-submenu-expanded' : 'sidebar-submenu-collapsed'}`}>
                    <div className="sidebar-submenu-container">
                      {item.subItems!.map((sub) => {
                          const hasThirdLevel = sub.subItems && sub.subItems.length > 0;
                          const isSubExpanded = expandedSubId === sub.action;
                          
                          // Usar Link para "Ver Lista" de proveedores
                          const isSuppliersList = item.id === 'suppliers' && sub.action === 'list';

                          return (
                            <div key={sub.action}>
                                {isSuppliersList ? (
                                    <Link
                                        to="/proveedores/listado"
                                        className="sidebar-subitem-button"
                                    >
                                        <div className="sidebar-subitem-content">
                                            <span className="material-symbols-outlined sidebar-subitem-icon">list</span>
                                            <span>{sub.label}</span>
                                        </div>
                                    </Link>
                                ) : (
                                    <button
                                        onClick={(e) => handleSubItemClick(e, item.id, sub)}
                                        className="sidebar-subitem-button"
                                    >
                                        <div className="sidebar-subitem-content">
                                            {sub.icon ? (
                                                <span className="material-symbols-outlined sidebar-subitem-icon">{sub.icon}</span>
                                            ) : (
                                                <>
                                                    {sub.action === 'create' && <span className="material-symbols-outlined sidebar-subitem-icon">add</span>}
                                                    {sub.action === 'list' && <span className="material-symbols-outlined sidebar-subitem-icon">list</span>}
                                                    {sub.action === 'records' && <span className="material-symbols-outlined sidebar-subitem-icon">table_chart</span>}
                                                </>
                                            )}
                                            <span>{sub.label}</span>
                                        </div>
                                        {hasThirdLevel && (
                                            <span className={`material-symbols-outlined sidebar-subitem-expand-icon ${isSubExpanded ? 'sidebar-subitem-expand-icon-expanded' : ''}`}>
                                                expand_more
                                            </span>
                                        )}
                                    </button>
                                )}

                                {hasThirdLevel && (
                                    <div className={`sidebar-third-level ${isSubExpanded ? 'sidebar-third-level-expanded' : 'sidebar-third-level-collapsed'}`}>
                                        <div className="sidebar-third-level-container">
                                            {sub.subItems!.map((third) => (
                                                <button
                                                    key={third.action}
                                                    onClick={(e) => handleThirdLevelClick(e, item.id, third.action)}
                                                    className="sidebar-third-level-button"
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

          <div className="sidebar-footer">
           <Link
                to="/settings"
                className={`sidebar-footer-button ${isOpen ? 'sidebar-footer-button-open' : 'sidebar-footer-button-closed'} ${isSettingsActive ? 'sidebar-footer-button-active' : ''}`}
                title={!isOpen ? t('nav.settings') : ''}
            >
                <span className={`material-symbols-outlined sidebar-footer-icon ${isOpen ? 'sidebar-footer-icon-open' : ''} ${isSettingsActive ? 'sidebar-footer-icon-active' : ''}`}>settings</span>
                <span className={`sidebar-footer-label ${isOpen ? 'sidebar-footer-label-open' : 'sidebar-footer-label-closed'}`}>{t('nav.settings')}</span>
            </Link>
            
            <Link
                to="/help"
                className={`sidebar-footer-button ${isOpen ? 'sidebar-footer-button-open' : 'sidebar-footer-button-closed'}`}
                title={!isOpen ? t('nav.help') : ''}
            >
                <span className={`material-symbols-outlined sidebar-footer-icon ${isOpen ? 'sidebar-footer-icon-open' : ''}`}>help</span>
                <span className={`sidebar-footer-label ${isOpen ? 'sidebar-footer-label-open' : 'sidebar-footer-label-closed'}`}>{t('nav.help')}</span>
            </Link>
          </div>
        </div>

      </div>
    </aside>
  );
};
