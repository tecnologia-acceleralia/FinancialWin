import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRoutesProps {
  children: React.ReactNode;
}

interface WindowWithRedirectFlag extends globalThis.Window {
  __REDIRECTING_TO_LOGIN__?: boolean;
}

export function ProtectedRoutes({ children }: ProtectedRoutesProps) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Ref to prevent multiple redirects
  const hasRedirectedRef = useRef(false);

  // Get auth context - this hook must be called unconditionally
  // If AuthProvider is missing, this will throw and React will handle it
  const authContext = useAuth();
  const authenticated = authContext.authenticated;
  const loading = authContext.loading;
  const redirecting = authContext.redirecting;
  const login = authContext.login;

  // Auto-redirect when not authenticated and loading is complete
  useEffect(() => {
    const windowWithFlag = window as WindowWithRedirectFlag;

    // Only redirect if loading is complete, not authenticated, not already redirecting, and haven't redirected yet
    if (
      !loading &&
      !authenticated &&
      !redirecting &&
      !hasRedirectedRef.current
    ) {
      // Check if we're already on login page or redirecting
      if (windowWithFlag.__REDIRECTING_TO_LOGIN__) {
        return;
      }

      // Check if URL already indicates we're going to login
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      if (errorParam === 'access_revoked' || errorParam === 'auth_failed') {
        return;
      }

      hasRedirectedRef.current = true;

      // Clean URL parameters before redirecting
      if (window.location.search) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }

      // Call login function to redirect
      login();
    }
  }, [loading, authenticated, redirecting, login]);

  // Reset redirect flag when user becomes authenticated
  useEffect(() => {
    if (authenticated) {
      hasRedirectedRef.current = false;
    }
  }, [authenticated]);

  // Show redirecting state if AuthContext is redirecting
  if (redirecting) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-container">
          <div className="auth-loading-spinner"></div>
          <p className="auth-loading-text">Redirigiendo al login...</p>
          <p className="auth-loading-subtext">
            Tu acceso ha sido revocado
          </p>
        </div>
      </div>
    );
  }

  // Block rendering until loading is complete
  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-container">
          <div className="auth-loading-spinner"></div>
          <p className="auth-loading-text">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show message while redirecting
  if (!authenticated) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-container">
          <div className="auth-loading-spinner"></div>
          <p className="auth-loading-text">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  // Only render children if authenticated
  return <>{children}</>;
}
