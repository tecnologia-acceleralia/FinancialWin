import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { ViewState } from '../../types';
import { useFinancialStats } from '../../hooks/useFinancialStats';

interface TopBarProps {
  currentView: ViewState;
  onToggleSidebar: () => void;
}

interface Notification {
  id: number;
  type: 'error' | 'warning' | 'info';
  title: string;
  desc: string;
  time: string;
  read: boolean;
}

interface NotificationMenuProps {
  notifications: Notification[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  t: (key: string) => string;
  badgeCount: number;
  onNavigate: (path: string) => void;
  dismissed: boolean;
  onDismiss: () => void;
}

const NotificationMenu: React.FC<NotificationMenuProps> = ({ notifications, isOpen, onToggle, onClose, t, badgeCount, onNavigate, dismissed, onDismiss }) => {
  const getIconClass = (type: string) => {
    switch (type) {
      case 'error':
        return 'topbar-notif-icon-error';
      case 'warning':
        return 'topbar-notif-icon-warning';
      default:
        return 'topbar-notif-icon-info';
    }
  };

  const getIconName = (notif: Notification) => {
    // Si el título contiene "facturas vencen pronto", usar event_upcoming
    if (notif.title.includes('factura') && notif.title.includes('vencen')) {
      return 'event_upcoming';
    }
    // Si el título contiene "Cobros pendientes", usar payments
    if (notif.title.includes('Cobros pendientes')) {
      return 'payments';
    }
    // Fallback por tipo
    switch (notif.type) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    if (notif.type === 'warning' && notif.title.includes('facturas')) {
      onNavigate('/ingresos');
    } else if (notif.type === 'warning' && notif.title.includes('Cobros')) {
      onNavigate('/control-financiero');
    }
    onClose();
  };

  return (
    <>
      <button
        onClick={onToggle}
        className={`topbar-notif-btn ${isOpen ? 'topbar-action-btn-active' : ''}`}
      >
        <span className="material-symbols-outlined topbar-action-icon">notifications</span>
        {badgeCount > 0 && !dismissed && (
          <span className="topbar-notif-badge-number">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="topbar-dropdown-panel">
          <div className="topbar-dropdown-header">
            <h4 className="topbar-dropdown-title">{t('topbar.notifications')}</h4>
            <button 
              className="topbar-dropdown-action"
              onClick={onDismiss}
            >
              {t('topbar.markRead')}
            </button>
          </div>

          <div className="topbar-dropdown-list">
            {(dismissed || notifications.length === 0) ? (
              <div className="topbar-notif-item">
                <div className="topbar-notif-content">
                  <div className="topbar-notif-details">
                    <p className="topbar-notif-title">No hay notificaciones</p>
                  </div>
                </div>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={notif.read ? 'topbar-notif-item' : 'topbar-notif-item-unread'}
                >
                  <div className="topbar-notif-content">
                    <div className={getIconClass(notif.type)}>
                      <span className="material-symbols-outlined topbar-notif-icon">{getIconName(notif)}</span>
                    </div>
                    <div className="topbar-notif-details">
                      <p className="topbar-notif-title">{notif.title}</p>
                      <p className="topbar-notif-desc">{notif.desc}</p>
                      {notif.time && <p className="topbar-notif-time">{notif.time}</p>}
                    </div>
                    {!notif.read && <div className="topbar-notif-unread-dot"></div>}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="topbar-dropdown-footer">
            <button 
              className="topbar-dropdown-footer-btn"
              onClick={() => {
                onNavigate('/control-financiero');
                onClose();
              }}
            >
              {t('topbar.viewHistory')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

interface UserDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  t: (key: string) => string;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ isOpen, onToggle, onClose, t }) => {
  const { user } = useAuth();
  
  return (
    <div className="relative">
      <button onClick={onToggle} className="topbar-user-trigger group">
        <img src="https://picsum.photos/100/100" alt="User" className="topbar-user-avatar" />
        <div className="topbar-user-info">
          <span className="topbar-user-name">{user?.name || 'Administrador'}</span>
          <span className="topbar-user-role">Admin</span>
        </div>
        <span className="material-symbols-outlined topbar-user-expand-icon">expand_more</span>
      </button>

      {isOpen && (
        <div className="topbar-user-dropdown">
          <div className="topbar-user-header">
            <div className="topbar-user-avatar-large">
              <img src="https://picsum.photos/100/100" alt="User" className="topbar-user-avatar-img" />
              <button className="topbar-user-avatar-edit">
                <span className="material-symbols-outlined topbar-user-avatar-edit-icon">photo_camera</span>
              </button>
            </div>
            <h4 className="topbar-user-header-name">{user?.name || 'Administrador'}</h4>
            <p className="topbar-user-header-email">{user?.email || 'admin@acceleralia.com'}</p>

            <button className="topbar-user-manage-btn">{t('topbar.profile.manage')}</button>
          </div>

          <div className="topbar-user-menu">
            <button className="topbar-user-menu-item group">
              <span className="material-symbols-outlined topbar-user-menu-icon">person_add</span>
              <span className="topbar-user-menu-text">{t('topbar.profile.addAccount')}</span>
            </button>
            <button className="topbar-user-menu-item group">
              <span className="material-symbols-outlined topbar-user-menu-icon">settings</span>
              <span className="topbar-user-menu-text">{t('topbar.profile.settings')}</span>
            </button>
          </div>

          <div className="topbar-user-logout-section">
            <button className="topbar-user-logout-btn">
              <span className="material-symbols-outlined topbar-user-logout-icon">logout</span>
              <span className="topbar-user-logout-text">{t('topbar.profile.logout')}</span>
            </button>
          </div>

          <div className="topbar-user-policy-footer">
            <p className="topbar-user-policy-text">{t('topbar.profile.policy')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export const TopBar: React.FC<TopBarProps> = ({ currentView, onToggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { incomeInvoices } = useFinancialStats();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const previousCountRef = useRef<number>(0);

  // Calcular facturas próximas a vencer (ingresos no pagados que vencen en los próximos 5 días)
  const facturasProximasAVencer = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filtrar facturas de ingresos que no estén pagadas
    const unpaidIncomes = incomeInvoices.filter(
      (invoice) => invoice.payment_state !== 'paid'
    );
    
    // Filtrar facturas que vencen en los próximos 5 días
    const upcomingInvoices = unpaidIncomes.filter((invoice) => {
      // Usar invoice_date_due si está disponible, sino usar invoice_date + 30 días como fallback
      const dueDateStr = invoice.invoice_date_due || invoice.invoice_date;
      if (!dueDateStr) return false;
      
      try {
        const dueDate = new Date(dueDateStr);
        dueDate.setHours(0, 0, 0, 0);
        
        if (isNaN(dueDate.getTime())) {
          // Fallback: si no hay fecha de vencimiento, usar invoice_date + 30 días
          if (!invoice.invoice_date) return false;
          const invoiceDate = new Date(invoice.invoice_date);
          invoiceDate.setHours(0, 0, 0, 0);
          invoiceDate.setDate(invoiceDate.getDate() + 30);
          const diffTime = invoiceDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 5;
        }
        
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Incluir facturas que vencen entre hoy y los próximos 5 días
        return diffDays >= 0 && diffDays <= 5;
      } catch {
        return false;
      }
    });
    
    const count = upcomingInvoices.length;
    
    return { count };
  }, [incomeInvoices]);

  // Calcular total de alertas (solo facturas próximas a vencer para el badge)
  const totalAlertas = useMemo(() => {
    return facturasProximasAVencer.count;
  }, [facturasProximasAVencer.count]);

  // Construir notificaciones reales (solo facturas próximas a vencer)
  const NOTIFICATIONS: Notification[] = useMemo(() => {
    const notifications: Notification[] = [];
    
    // Item 1: Facturas próximas a vencer
    if (facturasProximasAVencer.count > 0) {
      notifications.push({
        id: 1,
        type: 'warning',
        title: `Tienes ${facturasProximasAVencer.count} factura${facturasProximasAVencer.count === 1 ? '' : 's'} que vencen pronto`,
        desc: 'Revisa las facturas de clientes que vencen en los próximos 5 días',
        time: '',
        read: false,
      });
    }
    
    return notifications;
  }, [facturasProximasAVencer.count]);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const closeMenus = () => {
    setIsUserMenuOpen(false);
    setIsNotifMenuOpen(false);
  };

  const handleNotifToggle = () => {
    setIsNotifMenuOpen(!isNotifMenuOpen);
    setIsUserMenuOpen(false);
  };

  const handleUserToggle = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
    setIsNotifMenuOpen(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Resetear dismissed cuando hay nuevas notificaciones (el conteo aumenta)
  useEffect(() => {
    const currentCount = facturasProximasAVencer.count;
    const previousCount = previousCountRef.current;
    
    // Si el conteo aumentó (nuevas notificaciones), resetear dismissed
    if (currentCount > previousCount && currentCount > 0) {
      setDismissed(false);
    }
    
    // Actualizar el ref con el conteo actual
    previousCountRef.current = currentCount;
  }, [facturasProximasAVencer.count]);

  return (
    <>
      {(isUserMenuOpen || isNotifMenuOpen) && (
        <div className="topbar-backdrop" onClick={closeMenus}></div>
      )}

      <header className="topbar-header">
        <div className="topbar-left">
          <button onClick={onToggleSidebar} className="topbar-toggle-btn">
            <span className="material-symbols-outlined topbar-toggle-icon">menu</span>
          </button>

          <div className="topbar-title-container">
            <h2 className="topbar-title">
              {t(`topbar.${currentView}`) || currentView}
            </h2>
            <p className="topbar-subtitle">
              {t(`topbar.subtitle.${currentView}`) || ''}
            </p>
          </div>
        </div>

        <div className="topbar-right">
          <button onClick={toggleTheme} className="topbar-action-btn" aria-label="Toggle Theme">
            <span className="material-symbols-outlined topbar-action-icon">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>

          <div className="relative">
            <NotificationMenu
              notifications={NOTIFICATIONS}
              isOpen={isNotifMenuOpen}
              onToggle={handleNotifToggle}
              onClose={closeMenus}
              t={t}
              badgeCount={totalAlertas}
              onNavigate={handleNavigate}
              dismissed={dismissed}
              onDismiss={handleDismiss}
            />
          </div>

          <UserDropdown
            isOpen={isUserMenuOpen}
            onToggle={handleUserToggle}
            onClose={closeMenus}
            t={t}
          />
        </div>
      </header>
    </>
  );
};
