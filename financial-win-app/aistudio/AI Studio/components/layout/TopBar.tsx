
import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { ViewState } from '../../types';

interface TopBarProps {
  currentView: ViewState;
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ currentView, onToggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  
  // State for dropdowns
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  
  // Dynamic Notifications based on language
  const NOTIFICATIONS = [
    { id: 1, type: 'error', title: t('home.alerts.syncError'), desc: t('home.alerts.syncErrorDesc'), time: t('home.alerts.time.h2'), read: false },
    { id: 2, type: 'warning', title: t('home.alerts.pendingSign'), desc: t('home.alerts.pendingSignDesc'), time: t('home.alerts.time.h4'), read: false },
    { id: 3, type: 'info', title: t('home.alerts.update'), desc: t('home.alerts.updateDesc'), time: t('home.alerts.time.d1'), read: true },
  ];

  const closeMenus = () => {
    setIsUserMenuOpen(false);
    setIsNotifMenuOpen(false);
  };

  return (
    <>
      {/* Invisible Backdrop for closing menus */}
      {(isUserMenuOpen || isNotifMenuOpen) && (
        <div className="fixed inset-0 z-40 bg-transparent" onClick={closeMenus}></div>
      )}

      <header className="h-20 bg-neutral-50/80 dark:bg-secondary-900/80 backdrop-blur-md border-b border-gray-200 dark:border-secondary-border flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 transition-colors">
        
        {/* Title & Sidebar Toggle */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-secondary-800 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>

          <div className="flex flex-col">
            {/* Typography Update: Reduced size as requested */}
            <h2 className="text-xl md:text-2xl font-poppins font-semibold text-neutral-900 dark:text-white leading-tight truncate max-w-[200px] md:max-w-none">
              {t(`topbar.${currentView}`)}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium hidden md:block mt-0.5">
               {t(`topbar.subtitle.${currentView}`)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          
          {/* Theme Toggle - Smaller */}
          <button 
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl bg-white dark:bg-secondary-800 border border-gray-200 dark:border-secondary-border text-gray-600 dark:text-gray-300 hover:text-brand-500 hover:border-brand-200 transition-colors shadow-sm flex items-center justify-center"
            aria-label="Toggle Theme"
          >
            <span className="material-symbols-outlined text-[20px]">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>

          {/* Notifications Dropdown - Smaller */}
          <div className="relative">
            <button 
              onClick={() => { setIsNotifMenuOpen(!isNotifMenuOpen); setIsUserMenuOpen(false); }}
              className={`relative w-9 h-9 rounded-xl border transition-colors shadow-sm flex items-center justify-center ${isNotifMenuOpen ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-white dark:bg-secondary-800 border-gray-200 dark:border-secondary-border text-gray-600 dark:text-gray-300 hover:text-brand-500 hover:border-brand-200'}`}
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-white dark:ring-secondary-800"></span>
            </button>

            {/* Notification Card */}
            {isNotifMenuOpen && (
              <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#131B29] rounded-xl shadow-xl border border-gray-200 dark:border-secondary-border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <h4 className="font-bold text-gray-900 dark:text-white">{t('topbar.notifications')}</h4>
                  <button className="text-xs text-brand-600 font-bold hover:underline">{t('topbar.markRead')}</button>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {NOTIFICATIONS.map((notif) => (
                    <div key={notif.id} className={`p-4 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${!notif.read ? 'bg-brand-50/30 dark:bg-brand-900/10' : ''}`}>
                      <div className="flex gap-3">
                        <div className={`mt-1 p-1.5 rounded-full h-fit shrink-0 ${
                          notif.type === 'error' ? 'bg-red-100 text-red-600' : 
                          notif.type === 'warning' ? 'bg-orange-100 text-orange-600' : 
                          'bg-blue-100 text-blue-600'
                        }`}>
                          <span className="material-symbols-outlined text-sm font-bold">
                            {notif.type === 'error' ? 'error' : notif.type === 'warning' ? 'warning' : 'info'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{notif.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notif.desc}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{notif.time}</p>
                        </div>
                        {!notif.read && <div className="ml-auto w-2 h-2 rounded-full bg-brand-500 mt-2"></div>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-2 text-center bg-gray-50 dark:bg-secondary-800">
                  <button className="text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-brand-600 py-2 w-full rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    {t('topbar.viewHistory')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown (Google Style) */}
          <div className="relative ml-0 md:ml-2">
            <button 
              onClick={() => { setIsUserMenuOpen(!isUserMenuOpen); setIsNotifMenuOpen(false); }}
              className="group flex items-center gap-2 rounded-full p-1 pr-1 md:pr-3 hover:bg-gray-100 dark:hover:bg-secondary-800 transition-all border border-transparent hover:border-gray-200 dark:hover:border-secondary-border"
            >
              <img src="https://picsum.photos/100/100" alt="User" className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm" />
              <div className="hidden sm:flex flex-col items-start">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">Zaffra Burga</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Admin</span>
              </div>
              <span className="material-symbols-outlined text-gray-400 text-lg sm:ml-1 hidden sm:block">expand_more</span>
            </button>

            {/* Google Style User Card */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-3 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#131B29] rounded-2xl shadow-xl border border-gray-200 dark:border-secondary-border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header Section */}
                <div className="p-4 flex flex-col items-center border-b border-gray-100 dark:border-gray-700">
                  <div className="relative mb-3">
                     <img src="https://picsum.photos/100/100" alt="User" className="w-20 h-20 rounded-full border-4 border-white dark:border-[#131B29] shadow-md" />
                     <button className="absolute bottom-0 right-0 p-1.5 bg-white dark:bg-[#1B273B] rounded-full text-gray-600 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50">
                        <span className="material-symbols-outlined text-sm">photo_camera</span>
                     </button>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">Zaffra Burga</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">zaffra.burga@financialwin.com</p>
                  
                  <button className="px-6 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    {t('topbar.profile.manage')}
                  </button>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                   <button className="w-full text-left px-6 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                      <span className="material-symbols-outlined text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white">person_add</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{t('topbar.profile.addAccount')}</span>
                   </button>
                   <button className="w-full text-left px-6 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                      <span className="material-symbols-outlined text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white">settings</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{t('topbar.profile.settings')}</span>
                   </button>
                </div>

                {/* Footer Sign Out */}
                <div className="border-t border-gray-100 dark:border-gray-700 p-2">
                    <button className="w-full py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400">
                        <span className="material-symbols-outlined text-xl">logout</span>
                        <span className="text-sm font-bold">{t('topbar.profile.logout')}</span>
                    </button>
                </div>
                
                <div className="bg-gray-50 dark:bg-black/20 py-2 text-center border-t border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] text-gray-400">{t('topbar.profile.policy')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
