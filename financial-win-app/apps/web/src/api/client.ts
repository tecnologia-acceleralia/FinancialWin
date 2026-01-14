import axios from 'axios';
import { getApiUrl } from '../config/env';
import { redirectToLogin } from '../utils/redirect';

// Lazy initialization of API base URL
// This allows React to render even if there's a configuration error
let API_BASE_URL: string | null = null;

function getApiBaseUrl(): string {
  if (!API_BASE_URL) {
    try {
      API_BASE_URL = getApiUrl();
    } catch (error: any) {
      console.error('❌ Failed to get API URL:', error.message);
      // Use a placeholder that will fail requests but allow React to render
      API_BASE_URL = 'CONFIGURATION_ERROR';
    }
  }
  return API_BASE_URL;
}

// Create axios instance with lazy baseURL
// Using a function to access baseURL ensures it's evaluated when needed, not at import time
const createApiClient = () => {
  const baseURL = getApiBaseUrl();

  if (baseURL === 'CONFIGURATION_ERROR') {
    console.error(
      '❌ apiClient created with CONFIGURATION_ERROR - requests will fail'
    );
  }

  return axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true, // Enable sending cookies with requests
  });
};

export const apiClient = createApiClient();

// Request interceptor - Cookies are sent automatically via withCredentials: true
// No need to add Authorization header from localStorage (removed for security)
apiClient.interceptors.request.use(
  config => {
    // Check if configuration error
    if (config.baseURL === 'CONFIGURATION_ERROR') {
      console.error('❌ Request blocked - VITE_API_URL not configured');
      return Promise.reject(
        new Error(
          'API URL not configured. Please set VITE_API_URL environment variable.'
        )
      );
    }

    // Si el body es FormData, eliminar Content-Type para que el navegador establezca el boundary automáticamente
    if (
      config.data &&
      typeof window !== 'undefined' &&
      config.data instanceof window.FormData
    ) {
      delete config.headers['Content-Type'];
    }

    // Cookies (httpOnly) are sent automatically with withCredentials: true
    // Backend extracts token from cookie, not Authorization header
    return config;
  },
  error => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;

// Response interceptor - Handle auth errors and auto-refresh tokens
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // For /auth/me endpoint, let AuthContext handle it (might just be not authenticated yet)
      if (originalRequest.url?.includes('/auth/me')) {
        console.log('ℹ️ /auth/me returned 401 - AuthContext will handle this');
        return Promise.reject(error);
      }

      // CRITICAL: Prevent infinite recursion - don't attempt refresh if the request is already /auth/refresh
      if (originalRequest.url?.includes('/auth/refresh')) {
        console.warn(
          '⚠️ /auth/refresh returned 401 - cookie missing or invalid. Not attempting another refresh to prevent infinite loop.'
        );
        // Create a user-friendly error message
        const friendlyError = new Error(
          'Token refresh failed - authentication required'
        );
        (friendlyError as any).isAuthError = true;
        (friendlyError as any).statusCode = 401;
        return Promise.reject(friendlyError);
      }

      // Try to refresh token before redirecting
      if (!originalRequest._retry && !isRefreshing) {
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          console.log('🔄 Attempting token refresh before redirect...');
          const refreshResponse = await apiClient.get('/auth/refresh');

          if (refreshResponse.data.refreshed) {
            console.log(
              '✅ Token refreshed successfully, retrying original request'
            );
            // Retry original request with new cookie
            isRefreshing = false;
            return apiClient(originalRequest);
          }
          isRefreshing = false;
        } catch (_refreshError) {
          isRefreshing = false;
          console.warn('⚠️ Token refresh failed, redirecting to login');
        }

        // Log for debugging
        console.warn(
          '🚫 401 Unauthorized on protected route:',
          originalRequest.url || originalRequest.baseURL
        );

        // Redirect to login - use try-catch to ensure it always happens
        try {
          const API_URL = getApiUrl();
          const loginUrl = `${API_URL}/auth/login`;
          console.warn(`🚫 Redirecting to login: ${loginUrl}`);

          // Force redirect - don't wait for anything
          setTimeout(() => {
            window.location.href = loginUrl;
          }, 100);

          // Also try immediate redirect as fallback
          window.location.href = loginUrl;
        } catch (redirectError: any) {
          console.error('❌ Failed to redirect to login:', redirectError);
          // Last resort: try with default URL structure
          const currentHost = window.location.hostname;
          const fallbackUrl = `https://${currentHost}/api/auth/login`;
          console.warn(`⚠️ Attempting fallback redirect to: ${fallbackUrl}`);
          window.location.href = fallbackUrl;
        }
      }

      // Create a user-friendly error message
      const friendlyError = new Error(
        'Tu sesión ha expirado o no estás autenticado. Redirigiendo al login...'
      );
      (friendlyError as any).isAuthError = true;
      (friendlyError as any).statusCode = 401;
      return Promise.reject(friendlyError);
    }

    // Handle 403 Forbidden errors (access revoked)
    if (error.response?.status === 403) {
      // For /auth/me endpoint, let AuthContext handle it (prevents double redirect)
      if (originalRequest.url?.includes('/auth/me')) {
        console.log(
          'ℹ️ /auth/me returned 403 - AuthContext will handle redirect'
        );
        return Promise.reject(error);
      }

      // For all other protected routes, redirect to login immediately
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        redirectToLogin('access_revoked');
      }

      // Create a user-friendly error message
      const friendlyError = new Error(
        'Tu acceso ha sido revocado. Redirigiendo al login...'
      );
      (friendlyError as any).isAuthError = true;
      (friendlyError as any).isAccessRevoked = true;
      (friendlyError as any).statusCode = 403;
      return Promise.reject(friendlyError);
    }

    // Handle other errors
    console.error('API Response Error:', error.response?.data || error.message);

    return Promise.reject(error);
  }
);

export default apiClient;
