import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function UserInfo() {
  const { user, authenticated, logout, refreshUser } = useAuth();

  // Force refresh on mount to ensure we have the latest user data
  useEffect(() => {
    if (!user && !authenticated) {
      console.log('🔄 UserInfo: No user found, refreshing auth...');
      refreshUser();
    }
  }, [user, authenticated, refreshUser]);

  if (!authenticated || !user) {
    console.log(
      '👤 UserInfo: Not showing - authenticated:',
      authenticated,
      'user:',
      user
    );
    return null;
  }

  console.log('👤 UserInfo: Showing user info for:', user.name);

  return (
    <div className="auth-user-container">
      <div className="auth-user-card">
        <div className="auth-user-avatar">
          <span className="auth-user-avatar-text">
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>
        <div className="auth-user-info">
          <span className="auth-user-name">{user.name}</span>
          <span className="auth-user-email">{user.email}</span>
        </div>
      </div>

      <button
        onClick={logout}
        className="auth-user-logout-btn"
        title="Cerrar Sesión"
      >
        <svg
          className="auth-user-logout-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        <span>Salir</span>
      </button>
    </div>
  );
}
