import { Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { AppLayout } from './components/common/Layout/AppLayout';
import { HomePage } from './pages/home/HomePage';
import { AIExtractionPage } from './pages/ai-extraction/AIExtractionPage';
import { RecordsPage } from './pages/records/RecordsPage';
import { BillingPage } from './pages/billing/BillingPage';
import { ClientsPage } from './pages/clients/ClientsPage';
import { NuevoClientePage } from './pages/clients/NuevoClientePage';
import { ListaClientesPage } from './pages/clients/ListaClientesPage';
import { SuppliersPage } from './pages/suppliers/SuppliersPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { GastosPage } from './pages/control-financiero/GastosPage';
import { IngresosPage } from './pages/control-financiero/IngresosPage';
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
    if (path === '/gastos') return 'gastos';
    if (path === '/ingresos') return 'ingresos';
    return 'dashboard';
  };

  const currentView = getCurrentView();

  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <Routes>
            <Route
              element={<AppLayout currentView={currentView} />}
            >
              <Route path="/" element={<HomePage />} />
              <Route path="/ai-extraction" element={<AIExtractionPage />} />
              <Route path="/records" element={<RecordsPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clientes/nuevo" element={<NuevoClientePage />} />
              <Route path="/clientes/lista" element={<ListaClientesPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/gastos" element={<GastosPage />} />
              <Route path="/ingresos" element={<IngresosPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
