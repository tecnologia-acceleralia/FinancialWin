import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useRequireAuth() {
  const { authenticated, loading, login } = useAuth();

  useEffect(() => {
    if (!loading && !authenticated) {
      login();
    }
  }, [authenticated, loading, login]);

  return { authenticated, loading };
}
