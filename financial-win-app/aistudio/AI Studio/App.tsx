
import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { HomePage } from './components/HomePage';
import { BillingModule } from './components/billing/BillingModule';
import { ClientsModule } from './components/clients/ClientsModule';
import { SuppliersModule } from './components/suppliers/SuppliersModule';
import { DocumentsModule } from './components/documents/DocumentsModule';
import { RecordsModule } from './components/records/RecordsModule';
import { ThemeProvider } from './components/context/ThemeContext';
import { LanguageProvider } from './components/context/LanguageContext';
import { ViewState } from './types';

const App: React.FC = () => {
  // Default to Dashboard
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // State for Module navigation modes
  const [clientsViewMode, setClientsViewMode] = useState<'dashboard' | 'list' | 'create' | 'details'>('dashboard');
  const [suppliersViewMode, setSuppliersViewMode] = useState<'dashboard' | 'list' | 'create' | 'details'>('dashboard');
  const [billingViewMode, setBillingViewMode] = useState<'dashboard' | 'upload' | 'records' | 'payments' | 'collections'>('dashboard');
  
  // Documents mode state
  const [documentsViewMode, setDocumentsViewMode] = useState<string>('dashboard');

  // Records mode state
  const [recordsViewMode, setRecordsViewMode] = useState<string>('dashboard');

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Handler for navigation from Sidebar or other links
  const handleNavigation = (view: ViewState, subAction?: string) => {
    setCurrentView(view);
    // On mobile, close sidebar after navigation
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }

    if (view === 'clients') {
      if (subAction === 'create') {
        setClientsViewMode('create');
      } else if (subAction === 'list') {
        setClientsViewMode('list');
      } else {
        setClientsViewMode('dashboard');
      }
    } else if (view === 'suppliers') {
      if (subAction === 'create') {
        setSuppliersViewMode('create');
      } else if (subAction === 'list') {
        setSuppliersViewMode('list');
      } else {
        setSuppliersViewMode('dashboard');
      }
    } else if (view === 'billing') {
        // Billing navigation logic
        if (subAction === 'upload') setBillingViewMode('upload');
        else if (subAction === 'records') setBillingViewMode('records');
        else if (subAction === 'payments') setBillingViewMode('payments');
        else if (subAction === 'collections') setBillingViewMode('collections');
        else setBillingViewMode('dashboard');
    } else if (view === 'documents') {
        if (subAction) setDocumentsViewMode(subAction);
        else setDocumentsViewMode('dashboard');
    } else if (view === 'records') {
        if (subAction) setRecordsViewMode(subAction);
        else setRecordsViewMode('dashboard');
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <HomePage onNavigate={handleNavigation} />;
      case 'documents':
        return (
          <DocumentsModule 
            viewMode={documentsViewMode}
            onNavigate={setDocumentsViewMode}
            onBack={() => handleNavigation('dashboard')} 
          />
        );
      case 'records':
        return <RecordsModule viewMode={recordsViewMode} onNavigate={handleNavigation} />;
      case 'billing':
        return (
            <BillingModule 
                viewMode={billingViewMode} 
                onBack={() => setBillingViewMode('dashboard')} 
                onNavigate={(mode) => setBillingViewMode(mode as any)}
                onGoHome={() => handleNavigation('dashboard')}
            />
        );
      case 'clients':
        return (
          <ClientsModule 
            viewMode={clientsViewMode} 
            onViewChange={setClientsViewMode} 
            onGoBack={() => handleNavigation('dashboard')}
          />
        );
      case 'suppliers':
        return (
          <SuppliersModule 
            viewMode={suppliersViewMode} 
            onViewChange={setSuppliersViewMode} 
            onGoBack={() => handleNavigation('dashboard')}
          />
        );
      default:
        return <HomePage onNavigate={handleNavigation} />;
    }
  };

  return (
    <LanguageProvider>
      <ThemeProvider>
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
              {/* Width set to 98% to reduce side whitespace */}
              <div className="w-[98%] mx-auto h-full flex flex-col">
                <div className="flex-1">
                  {renderContent()}
                </div>
                
                {/* Static Footer */}
                <footer className="mt-auto py-6 border-t border-gray-200 dark:border-secondary-border text-center text-sm text-gray-500 dark:text-gray-400">
                  <p>© 2025 FinancialWin. Todos los derechos reservados.</p>
                </footer>
              </div>
            </main>
            
          </div>
        </div>
      </ThemeProvider>
    </LanguageProvider>
  );
};

export default App;
