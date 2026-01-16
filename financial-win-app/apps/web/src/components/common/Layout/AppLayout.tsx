import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ViewState } from '../../../types';
import { useTheme } from '../../../contexts/ThemeContext';

interface AppLayoutProps {
  currentView: ViewState;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ currentView }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleNavigation = (view: ViewState, subAction?: string) => {
    // Default navigation using React Router
    const routeMap: Record<ViewState, string> = {
      'dashboard': '/',
      'ai-extraction': '/ai-extraction',
      'records': '/records',
      'billing': '/billing',
      'clients': '/clients',
      'suppliers': '/suppliers',
      'documents': '/documents',
      'upload-invoice': '/upload-invoice',
      'tickets': '/tickets',
      'subscriptions': '/subscriptions',
    };
    
    const route = routeMap[view] || '/';
    navigate(route);
    
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
              <Outlet />
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
