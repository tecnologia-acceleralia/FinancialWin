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
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-xs">
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">{user.name}</span>
          <span className="text-xs text-gray-500">{user.email}</span>
        </div>
      </div>

      <button
        onClick={logout}
        className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        title="Cerrar Sesión"
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
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        <span>Salir</span>
      </button>
    </div>
  );
}
