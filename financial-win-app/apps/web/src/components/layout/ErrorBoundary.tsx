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
        <div className="error-overlay">
          <div className="error-card">
            <div className="error-header">
              <div className="error-icon-wrapper">
                <span className="error-icon">warning</span>
              </div>
              <div className="error-title-container">
                <h3 className="error-title">Algo salió mal</h3>
              </div>
            </div>

            <div className="error-content">
              {(this.state.error as any)?.isAuthError ||
              (this.state.error as any)?.statusCode === 401 ? (
                <div>
                  <p className="error-message-spaced">
                    Tu sesión ha expirado o no estás autenticado.
                  </p>
                  <p className="error-message">
                    Redirigiendo al login en unos segundos...
                  </p>
                </div>
              ) : (
                <p className="error-message">
                  Ha ocurrido un error inesperado. Por favor, recarga la página
                  o contacta al soporte si el problema persiste.
                </p>
              )}
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="error-details">
                <summary className="error-details-summary">
                  Detalles del error (desarrollo)
                </summary>
                <pre className="error-details-pre">
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="error-actions">
              <button
                onClick={() => window.location.reload()}
                className="btn-ai-primary flex-1"
              >
                Recargar página
              </button>
              <button
                onClick={() =>
                  this.setState({ hasError: false, error: undefined })
                }
                className="btn-ai-secondary flex-1"
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
