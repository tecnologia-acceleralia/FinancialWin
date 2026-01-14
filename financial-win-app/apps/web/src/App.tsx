import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AppLayout } from './components/common/Layout/AppLayout';
import { HomePage } from './pages/home/HomePage';
import { AIExtractionPage } from './pages/ai-extraction/AIExtractionPage';
import { ViewState } from './types';

function App() {
  const location = useLocation();
  
  // Determine current view from pathname
  const getCurrentView = (): ViewState => {
    if (location.pathname === '/ai-extraction') return 'ai-extraction';
    return 'dashboard';
  };

  const currentView = getCurrentView();

  const handleNavigate = (view: ViewState, subAction?: string) => {
    // Navigation will be handled by React Router
    // This is for future use if needed
  };

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppLayout currentView={currentView} onNavigate={handleNavigate}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/ai-extraction" element={<AIExtractionPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
