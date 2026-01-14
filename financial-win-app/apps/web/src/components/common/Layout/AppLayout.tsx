import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ViewState } from '../../../types';

interface AppLayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate?: (view: ViewState, subAction?: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, currentView, onNavigate }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleNavigation = (view: ViewState, subAction?: string) => {
    if (onNavigate) {
      onNavigate(view, subAction);
    }
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-secondary-900 transition-colors duration-200">
      
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`} 
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
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative transition-all duration-300">
        
        {/* Top Bar with Toggle Trigger */}
        <TopBar 
          currentView={currentView} 
          onToggleSidebar={toggleSidebar}
        />

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="w-[98%] mx-auto h-full flex flex-col">
            <div className="flex-1">
              {children}
            </div>
            
            {/* Static Footer */}
            <footer className="mt-auto py-6 border-t border-gray-200 dark:border-secondary-border text-center text-sm text-gray-500 dark:text-gray-400">
              <p>© 2025 FinancialWin. Todos los derechos reservados.</p>
            </footer>
          </div>
        </main>
        
      </div>
    </div>
  );
};
