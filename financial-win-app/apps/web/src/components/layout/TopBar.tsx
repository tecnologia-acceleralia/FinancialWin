import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ViewState } from '../../types';

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
}

const NotificationMenu: React.FC<NotificationMenuProps> = ({ notifications, isOpen, onToggle, onClose, t }) => {
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

  const getIconName = (type: string) => {
    switch (type) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <>
      <button
        onClick={onToggle}
        className={`topbar-notif-btn ${isOpen ? 'topbar-action-btn-active' : ''}`}
      >
        <span className="material-symbols-outlined topbar-action-icon">notifications</span>
        <span className="topbar-notif-badge"></span>
      </button>

      {isOpen && (
        <div className="topbar-dropdown-panel">
          <div className="topbar-dropdown-header">
            <h4 className="topbar-dropdown-title">{t('topbar.notifications')}</h4>
            <button className="topbar-dropdown-action">{t('topbar.markRead')}</button>
          </div>

          <div className="topbar-dropdown-list">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={notif.read ? 'topbar-notif-item' : 'topbar-notif-item-unread'}
              >
                <div className="topbar-notif-content">
                  <div className={getIconClass(notif.type)}>
                    <span className="material-symbols-outlined topbar-notif-icon">{getIconName(notif.type)}</span>
                  </div>
                  <div className="topbar-notif-details">
                    <p className="topbar-notif-title">{notif.title}</p>
                    <p className="topbar-notif-desc">{notif.desc}</p>
                    <p className="topbar-notif-time">{notif.time}</p>
                  </div>
                  {!notif.read && <div className="topbar-notif-unread-dot"></div>}
                </div>
              </div>
            ))}
          </div>

          <div className="topbar-dropdown-footer">
            <button className="topbar-dropdown-footer-btn">{t('topbar.viewHistory')}</button>
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
  return (
    <div className="relative">
      <button onClick={onToggle} className="topbar-user-trigger group">
        <img src="https://picsum.photos/100/100" alt="User" className="topbar-user-avatar" />
        <div className="topbar-user-info">
          <span className="topbar-user-name">Zaffra Burga</span>
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
            <h4 className="topbar-user-header-name">Zaffra Burga</h4>
            <p className="topbar-user-header-email">zaffra.burga@financialwin.com</p>

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

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);

  const NOTIFICATIONS: Notification[] = [
    { id: 1, type: 'error', title: t('home.alerts.syncError'), desc: t('home.alerts.syncErrorDesc'), time: t('home.alerts.time.h2'), read: false },
    { id: 2, type: 'warning', title: t('home.alerts.pendingSign'), desc: t('home.alerts.pendingSignDesc'), time: t('home.alerts.time.h4'), read: false },
    { id: 3, type: 'info', title: t('home.alerts.update'), desc: t('home.alerts.updateDesc'), time: t('home.alerts.time.d1'), read: true },
  ];

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
