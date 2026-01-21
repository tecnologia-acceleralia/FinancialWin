import { Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { FinancialProvider } from './contexts/FinancialContext';
import { AppLayout } from './components/layout';
import { ProtectedRoutes } from './components/auth/ProtectedRoutes';
import { HomePage } from './pages/home/HomePage';
// TODO: Transición a DocumentsPage - Comentado temporalmente
// import { AIExtractionPage } from './pages/ai-extraction/AIExtractionPage';
import { RecordsPage } from './pages/records/RecordsPage';
import { BillingPage } from './pages/billing/BillingPage';
import { ClientsPage } from './pages/clients/ClientsPage';
import { NuevoClientePage } from './pages/clients/NuevoClientePage';
import { ListaClientesPage } from './pages/clients/ListaClientesPage';
import { SuppliersPage } from './pages/suppliers/SuppliersPage';
import { NuevoProveedorPage } from './pages/proveedores/NuevoProveedorPage';
import { ProveedoresDashboardPage } from './pages/proveedores/ProveedoresDashboardPage';
import ProveedoresListPage from './pages/proveedores/ProveedoresListPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { GastosPage } from './pages/control-financiero/GastosPage';
import { IngresosPage } from './pages/control-financiero/IngresosPage';
import { EntityDetailPage } from './features/entities/components/EntityDetailPage';
import { HelpPage } from './pages/help/HelpPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { ViewState } from './types';

function App() {
  const location = useLocation();
  
  // Determine current view from pathname
  const getCurrentView = (): ViewState => {
    const path = location.pathname;
    // TODO: Transición a DocumentsPage - Comentado temporalmente
    // if (path === '/ai-extraction') return 'ai-extraction';
    if (path === '/records') return 'records';
    if (path === '/billing') return 'billing';
    if (path === '/clients' || path === '/clientes' || path.startsWith('/clientes/') || path.startsWith('/cliente/')) return 'clients';
    if (path === '/suppliers' || path === '/proveedores' || path.startsWith('/proveedores/') || path.startsWith('/proveedor/')) return 'suppliers';
    if (path === '/documents') return 'documents';
    if (path === '/gastos') return 'gastos';
    if (path === '/ingresos') return 'ingresos';
    if (path === '/settings') return 'settings';
    return 'dashboard';
  };

  const currentView = getCurrentView();

  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <FinancialProvider>
            <ProtectedRoutes>
              <Routes>
                <Route
                  element={<AppLayout currentView={currentView} />}
                >
                  <Route path="/" element={<HomePage />} />
                  {/* TODO: Transición a DocumentsPage - Comentado temporalmente */}
                  {/* <Route path="/ai-extraction" element={<AIExtractionPage />} /> */}
                  <Route path="/records" element={<RecordsPage />} />
                  <Route path="/billing" element={<BillingPage />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/clientes/nuevo" element={<NuevoClientePage />} />
                  <Route path="/clientes/lista" element={<ListaClientesPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route path="/proveedores" element={<ProveedoresDashboardPage />} />
                  <Route path="/proveedores/listado" element={<ProveedoresListPage />} />
                  <Route path="/proveedores/nuevo" element={<NuevoProveedorPage />} />
                  <Route path="/documents" element={<DocumentsPage />} />
                  <Route path="/gastos" element={<GastosPage />} />
                  <Route path="/ingresos" element={<IngresosPage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/cliente/detalle/:id" element={<EntityDetailPage />} />
                  <Route path="/proveedor/detalle/:id" element={<EntityDetailPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </ProtectedRoutes>
          </FinancialProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
