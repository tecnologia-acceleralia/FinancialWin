import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import apiClient from '../api/client';
import { redirectToLogin } from '../utils/redirect';
import { getApiUrl } from '../config/env';
import {
  POLLING_INTERVAL,
  POLLING_INACTIVE_THRESHOLD,
  TOKEN_REFRESH_CHECK_INTERVAL,
} from './authConstants';

interface User {
  sub: string;
  email: string;
  name: string;
  company_id: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  redirecting: boolean; // New: State to track redirection
  login: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface WindowWithAuthFlags {
  __REDIRECTING_TO_LOGIN__?: boolean;
  __REDIRECT_ATTEMPTS__?: number;
  __ERROR_access_revoked_HANDLED__?: boolean;
  __ERROR_auth_failed_HANDLED__?: boolean;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize state
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Refs for polling management
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isPollingPausedRef = useRef<boolean>(false);
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Refs for refresh failure tracking and loop prevention
  const consecutiveRefreshFailuresRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    const windowWithFlags = window as WindowWithAuthFlags;

    // Check if already redirecting (prevent multiple checkAuth calls)
    if (windowWithFlags.__REDIRECTING_TO_LOGIN__) {
      return false;
    }

    // Check if polling is paused
    if (isPollingPausedRef.current) {
      return false;
    }

    try {
      const response = await apiClient.get('/auth/me');

      if (response.data.authenticated && response.data.user) {
        setUser(response.data.user);
        setAuthenticated(true);

        // Reset redirect attempt counter on successful authentication
        delete windowWithFlags.__REDIRECT_ATTEMPTS__;

        // Reset refresh failure counter on successful authentication
        consecutiveRefreshFailuresRef.current = 0;

        // Update last activity timestamp
        lastActivityRef.current = Date.now();
        return true;
      } else {
        setUser(null);
        setAuthenticated(false);
        return false;
      }
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { status?: number };
        statusCode?: number;
      };

      // Handle 403 Forbidden (access revoked) - redirect immediately
      if (
        axiosError.response?.status === 403 ||
        axiosError.statusCode === 403
      ) {
        setRedirecting(true);
        redirectToLogin('access_revoked');
        return false;
      }

      // Authentication failed - cookie might be invalid or expired
      setUser(null);
      setAuthenticated(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Start polling for access verification
  const startPolling = useCallback(() => {
    // Clear existing interval if any
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Only start polling if user is authenticated
    if (!authenticated) {
      return;
    }

    pollingIntervalRef.current = setInterval(async () => {
      const windowWithFlags = window as WindowWithAuthFlags;

      // Check if polling should be paused (user inactive)
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity > POLLING_INACTIVE_THRESHOLD) {
        if (!isPollingPausedRef.current) {
          isPollingPausedRef.current = true;
        }
        return;
      }

      // Resume polling if was paused
      if (isPollingPausedRef.current) {
        isPollingPausedRef.current = false;
      }

      // Only poll if user is authenticated and not redirecting
      if (
        authenticated &&
        !redirecting &&
        !windowWithFlags.__REDIRECTING_TO_LOGIN__
      ) {
        await checkAuth();
      }
    }, POLLING_INTERVAL);
  }, [authenticated, redirecting, checkAuth]);

  const refreshUser = useCallback(async () => {
    await checkAuth();
  }, [checkAuth]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const stopTokenRefreshCheck = useCallback(() => {
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
      tokenRefreshIntervalRef.current = null;
    }
  }, []);

  // Auto-refresh token if expiring soon
  const checkAndRefreshToken = useCallback(async (): Promise<void> => {
    // Prevent concurrent refresh attempts
    if (isRefreshingRef.current) {
      console.log('ℹ️ [AuthContext] Refresh already in progress, skipping...');
      return;
    }

    // Don't attempt refresh if not authenticated or redirecting
    if (!authenticated || redirecting) {
      return;
    }

    // Stop refresh attempts after 3 consecutive failures
    if (consecutiveRefreshFailuresRef.current >= 3) {
      console.warn(
        '⚠️ [AuthContext] Too many refresh failures, stopping refresh attempts. Please re-authenticate.'
      );
      stopTokenRefreshCheck();
      return;
    }

    isRefreshingRef.current = true;

    try {
      const response = await apiClient.get('/auth/refresh');
      // Reset failure counter on success
      consecutiveRefreshFailuresRef.current = 0;

      if (response.data.refreshed) {
        console.log('✅ [AuthContext] Token refreshed successfully');
        await refreshUser();
      } else if (response.data.expiresAt) {
        const expiresAt = new Date(response.data.expiresAt);
        const timeUntilExpiry = expiresAt.getTime() - Date.now();
        const minutesUntilExpiry = Math.round(timeUntilExpiry / 60000);

        if (minutesUntilExpiry <= 30) {
          console.warn(
            `⚠️ [AuthContext] Token expiring soon: ${minutesUntilExpiry} minutes remaining. Next refresh check in ${Math.round(TOKEN_REFRESH_CHECK_INTERVAL / 60000)} minutes.`
          );
        } else {
          console.log(
            `ℹ️ [AuthContext] Token valid for ${minutesUntilExpiry} more minutes. Next refresh check in ${Math.round(TOKEN_REFRESH_CHECK_INTERVAL / 60000)} minutes.`
          );
        }
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      const status = axiosError.response?.status;

      // Handle 401 Unauthorized - cookie missing or invalid
      if (status === 401) {
        consecutiveRefreshFailuresRef.current += 1;
        console.error(
          `❌ [AuthContext] Token refresh failed with 401 (attempt ${consecutiveRefreshFailuresRef.current}/3). Cookie may be missing or invalid.`
        );

        // Update authenticated state to false
        setAuthenticated(false);
        setUser(null);

        // Stop all intervals immediately
        stopTokenRefreshCheck();
        stopPolling();

        // Verify actual authentication state
        const authResult = await checkAuth();

        // If checkAuth also fails, redirect to login
        if (!authResult) {
          console.warn(
            '❌ [AuthContext] Authentication verification failed, redirecting to login'
          );
          setRedirecting(true);
          setTimeout(() => {
            const API_URL = getApiUrl();
            const loginUrl = `${API_URL}/auth/login`;
            window.location.href = loginUrl;
          }, 100);
        } else {
          // If checkAuth succeeds, reset failure counter and resume refresh
          consecutiveRefreshFailuresRef.current = 0;
          startTokenRefreshCheck();
        }
      } else if (status === 403) {
        // If refresh fails with 403 (company_id changed or access revoked), let polling handle redirect
        console.error(
          '❌ [AuthContext] Access revoked - polling will handle redirect'
        );
        // Access revoked - polling will handle redirect
      } else {
        // Other errors - increment failure counter but don't stop immediately
        consecutiveRefreshFailuresRef.current += 1;
        console.error(
          `❌ [AuthContext] Token refresh check failed (attempt ${consecutiveRefreshFailuresRef.current}/3):`,
          error
        );
      }
    } finally {
      isRefreshingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authenticated,
    redirecting,
    refreshUser,
    checkAuth,
    stopTokenRefreshCheck,
    stopPolling,
    // Note: startTokenRefreshCheck is intentionally omitted to avoid circular dependency
    // It's only called conditionally and doesn't affect the logic of checkAndRefreshToken
  ]);

  // Start token refresh checking
  const startTokenRefreshCheck = useCallback((): void => {
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
    }

    // Only start if authenticated and failure count is below threshold
    if (!authenticated || consecutiveRefreshFailuresRef.current >= 3) {
      return;
    }

    tokenRefreshIntervalRef.current = setInterval(() => {
      if (
        authenticated &&
        !redirecting &&
        consecutiveRefreshFailuresRef.current < 3
      ) {
        checkAndRefreshToken();
      }
    }, TOKEN_REFRESH_CHECK_INTERVAL);
  }, [authenticated, redirecting, checkAndRefreshToken]);
  // Track user activity to manage polling
  useEffect(() => {
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      // Resume polling if it was paused
      if (isPollingPausedRef.current && authenticated) {
        isPollingPausedRef.current = false;
      }
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [authenticated]);

  useEffect(() => {
    const windowWithFlags = window as WindowWithAuthFlags;

    // Clear redirect flag when component mounts (in case of page reload after logout)
    delete windowWithFlags.__REDIRECTING_TO_LOGIN__;

    // Check for error parameter in URL first (access revoked or auth failed)
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam === 'access_revoked' || errorParam === 'auth_failed') {
      // CRITICAL: Prevent infinite loop by checking if we've already handled this error
      const errorHandledKey =
        `__ERROR_${errorParam}_HANDLED__` as keyof WindowWithAuthFlags;
      if (windowWithFlags[errorHandledKey]) {
        // Clear the error parameter from URL
        urlParams.delete('error');
        window.history.replaceState({}, '', window.location.pathname);
        setLoading(false);
        setAuthenticated(false);
        return;
      }

      // Mark error as handled to prevent loop
      (windowWithFlags as Record<string, boolean>)[errorHandledKey] = true;

      // Clear the error parameter from URL to prevent loop
      urlParams.delete('error');
      window.history.replaceState({}, '', window.location.pathname);

      // Don't attempt authentication
      setLoading(false);
      setAuthenticated(false);
      setRedirecting(true);

      // For auth_failed, don't redirect immediately - let user see the error or try again
      // For access_revoked, redirect to login
      if (errorParam === 'access_revoked') {
        setTimeout(() => {
          const API_URL = getApiUrl();
          const loginUrl = `${API_URL}/auth/login`;
          window.location.href = loginUrl;
        }, 100);
      } else {
        // auth_failed: Clear the flag after a delay to allow retry
        setTimeout(() => {
          delete (windowWithFlags as Record<string, boolean>)[errorHandledKey];
        }, 5000);
      }
      return;
    }

    // Check if returning from OIDC callback
    // Note: Token in URL is optional - backend sets httpOnly cookie during callback
    const token = urlParams.get('token');

    if (token) {
      // Clean URL FIRST to prevent loop if token is invalid
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Always call checkAuth - it will check cookie via /auth/me endpoint
    setTimeout(async () => {
      const authResult = await checkAuth();

      // If authentication failed and we're not already redirecting, redirect to login
      if (!authResult && !windowWithFlags.__REDIRECTING_TO_LOGIN__) {
        setRedirecting(true);
        setTimeout(() => {
          const API_URL = getApiUrl();
          const loginUrl = `${API_URL}/auth/login`;
          window.location.href = loginUrl;
        }, 100);
      }

      // Start polling and token refresh if authentication succeeded
      if (authResult) {
        startPolling();
        startTokenRefreshCheck();
      }
    }, 0);

    // Cleanup on unmount
    return () => {
      stopPolling();
      stopTokenRefreshCheck();
    };
  }, [
    checkAuth,
    startPolling,
    startTokenRefreshCheck,
    stopPolling,
    stopTokenRefreshCheck,
  ]);

  // Start/stop polling and token refresh based on authentication state
  useEffect(() => {
    if (authenticated && !redirecting) {
      startPolling();
      startTokenRefreshCheck();
    } else {
      stopPolling();
      stopTokenRefreshCheck();
    }

    return () => {
      stopPolling();
      stopTokenRefreshCheck();
    };
  }, [
    authenticated,
    redirecting,
    startPolling,
    startTokenRefreshCheck,
    stopPolling,
    stopTokenRefreshCheck,
  ]);

  const login = useCallback(() => {
    const windowWithFlags = window as WindowWithAuthFlags;
    // Clear redirect flag before redirecting to allow new login flow
    delete windowWithFlags.__REDIRECTING_TO_LOGIN__;
    setRedirecting(false);
    stopPolling();
    const API_URL = getApiUrl();
    const loginUrl = `${API_URL}/auth/login`;
    window.location.href = loginUrl;
  }, [stopPolling]);

  const logout = useCallback(() => {
    const windowWithFlags = window as WindowWithAuthFlags;
    // Clear redirect flag
    delete windowWithFlags.__REDIRECTING_TO_LOGIN__;
    setRedirecting(false);
    stopPolling();
    stopTokenRefreshCheck();

    // Reset failure counters on logout
    consecutiveRefreshFailuresRef.current = 0;
    isRefreshingRef.current = false;

    const API_URL = getApiUrl();
    const logoutUrl = `${API_URL}/auth/logout`;
    window.location.href = logoutUrl;
  }, [stopPolling, stopTokenRefreshCheck]);

  const value: AuthContextType = {
    user,
    loading,
    authenticated,
    redirecting,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
