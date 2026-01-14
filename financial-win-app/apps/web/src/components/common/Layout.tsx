import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserInfo } from '../auth/UserInfo';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Layout component financial-win
 * 
 * Este es un layout básico que puedes personalizar según las necesidades de tu aplicación.
 * Incluye:
 * - Header con navegación
 * - Área de contenido principal
 * - Integración con autenticación (UserInfo)
 */
export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-white">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-gray-200">
        <div className="flex justify-between items-center h-16 px-6">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="text-xl font-bold text-gray-900">financial-win</span>
            </Link>

            <nav className="flex space-x-4">
              <Link
                to="/"
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  location.pathname === '/'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg
                  className="h-4 w-4"
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
          <div className="flex items-center space-x-4">
            <UserInfo />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="h-[calc(100vh-4rem)] w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
