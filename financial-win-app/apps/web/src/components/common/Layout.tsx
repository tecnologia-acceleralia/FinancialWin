import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserInfo } from '../auth/UserInfo';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Layout component FinancialWin
 * 
 * Layout básico con diseño oscuro sincronizado con AI Studio.
 * Incluye:
 * - Header con navegación y logo FinancialWin
 * - Área de contenido principal
 * - Integración con autenticación (UserInfo)
 */
export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="layout-wrapper">
      {/* Top Header Bar */}
      <header className="layout-header">
        <div className="layout-header-container">
          {/* Left side - Logo and Navigation */}
          <div className="layout-header-left">
            <Link to="/" className="layout-logo-link">
              <div className="layout-logo-container">
                <span className="material-symbols-outlined layout-logo-icon">all_inclusive</span>
              </div>
              <span className="layout-logo-text">FinancialWin</span>
            </Link>

            <nav className="layout-nav">
              <Link
                to="/"
                className={location.pathname === '/' ? 'layout-nav-link-active' : 'layout-nav-link-inactive'}
              >
                <svg
                  className="layout-nav-link-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                <span>Inicio</span>
              </Link>
            </nav>
          </div>

          {/* Right side - User Info */}
          <div className="layout-header-right">
            <UserInfo />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="layout-main">
        {children}
      </main>
    </div>
  );
}
