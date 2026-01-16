import { Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AppLayout } from './components/common/Layout/AppLayout';
import { HomePage } from './pages/home/HomePage';
import { AIExtractionPage } from './pages/ai-extraction/AIExtractionPage';
import { RecordsPage } from './pages/records/RecordsPage';
import { BillingPage } from './pages/billing/BillingPage';
import { ClientsPage } from './pages/clients/ClientsPage';
import { SuppliersPage } from './pages/suppliers/SuppliersPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { ViewState } from './types';

function App() {
  const location = useLocation();
  
  // Determine current view from pathname
  const getCurrentView = (): ViewState => {
    const path = location.pathname;
    if (path === '/ai-extraction') return 'ai-extraction';
    if (path === '/records') return 'records';
    if (path === '/billing') return 'billing';
    if (path === '/clients') return 'clients';
    if (path === '/suppliers') return 'suppliers';
    if (path === '/documents') return 'documents';
    return 'dashboard';
  };

  const currentView = getCurrentView();

  return (
    <ThemeProvider>
      <LanguageProvider>
        <Routes>
          <Route
            element={<AppLayout currentView={currentView} />}
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/ai-extraction" element={<AIExtractionPage />} />
            <Route path="/records" element={<RecordsPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
