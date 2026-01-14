import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Check if this is an authentication error
    const isAuthError =
      (error as any).isAuthError ||
      (error as any).statusCode === 401 ||
      error.message?.includes('autenticado') ||
      error.message?.includes('Authentication');

    if (isAuthError) {
      console.warn('🔐 Authentication error detected, redirecting to login...');
      // Redirect to login after a short delay to show message
      setTimeout(() => {
        const currentHost = window.location.hostname;
        const loginUrl = `https://${currentHost}/api/auth/login`;
        console.warn(`🚫 Redirecting to login: ${loginUrl}`);
        window.location.href = loginUrl;
      }, 2000);
    }

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Algo salió mal
                </h3>
              </div>
            </div>

            <div className="mb-4">
              {(this.state.error as any)?.isAuthError ||
              (this.state.error as any)?.statusCode === 401 ? (
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Tu sesión ha expirado o no estás autenticado.
                  </p>
                  <p className="text-sm text-gray-600">
                    Redirigiendo al login en unos segundos...
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Ha ocurrido un error inesperado. Por favor, recarga la página
                  o contacta al soporte si el problema persiste.
                </p>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                  Detalles del error (desarrollo)
                </summary>
                <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Recargar página
              </button>
              <button
                onClick={() =>
                  this.setState({ hasError: false, error: undefined })
                }
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
