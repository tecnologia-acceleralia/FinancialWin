import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ViewState } from '../../../types';
import { useTheme } from '../../../contexts/ThemeContext';

interface AppLayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate?: (view: ViewState, subAction?: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, currentView, onNavigate }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { theme } = useTheme();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleNavigation = (view: ViewState, subAction?: string) => {
    if (onNavigate) {
      onNavigate(view, subAction);
    }
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const backgroundColor = theme === 'dark' ? '#0B1018' : '#F8FAFC';

  return (
    <div 
      className="layout-wrapper transition-colors duration-300"
      style={{ backgroundColor }}
    >
      {/* Mobile Backdrop */}
      <div 
        className={`layout-backdrop ${isSidebarOpen ? 'layout-backdrop-visible' : 'layout-backdrop-hidden'}`}
        onClick={() => setIsSidebarOpen(false)} 
      />

      {/* Responsive Sidebar */}
      <Sidebar 
        currentView={currentView} 
        onChangeView={handleNavigation} 
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
      />

      {/* Main Content Wrapper */}
      <div className="layout-main-content">
        {/* Top Bar with Toggle Trigger */}
        <TopBar 
          currentView={currentView} 
          onToggleSidebar={toggleSidebar}
        />

        {/* Scrollable Content Area */}
        <main className="layout-page-container">
          <div className="layout-page-inner">
            <div className="layout-page-content">
              {children}
            </div>
            
            {/* Static Footer */}
            <footer className="layout-footer">
              <p>© 2025 FinancialWin. Todos los derechos reservados.</p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};
