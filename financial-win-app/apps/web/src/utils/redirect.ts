import { getApiUrl } from '../config/env';

const REDIRECT_FLAG = '__REDIRECTING_TO_LOGIN__';
const REDIRECT_TIMEOUT = 5000; // 5 seconds timeout
const MAX_REDIRECT_ATTEMPTS = 3; // Maximum number of redirect attempts to prevent infinite loops

/**
 * Centralized function to redirect user to login page
 * Prevents multiple redirects by checking a global flag
 * Clears tokens and URL parameters before redirecting
 * Uses multiple fallback methods to ensure redirection always succeeds
 * Prevents infinite loops by checking if already on login page
 *
 * @param reason - Reason for redirect: 'access_revoked' or 'not_authenticated'
 */
export function redirectToLogin(
  reason?: 'access_revoked' | 'not_authenticated'
): void {
  // Prevent multiple redirects
  if ((window as any)[REDIRECT_FLAG]) {
    console.warn(
      '⚠️ Already redirecting to login, skipping duplicate redirect'
    );
    return;
  }

  // Check if we're already on the login page (prevent infinite loops)
  const currentUrl = window.location.href;
  if (currentUrl.includes('/auth/login')) {
    console.warn('⚠️ Already on login page, skipping redirect to prevent loop');
    return;
  }

  // Check redirect attempt count to prevent infinite loops
  const redirectAttempts = (window as any).__REDIRECT_ATTEMPTS__ || 0;
  if (redirectAttempts >= MAX_REDIRECT_ATTEMPTS) {
    console.error(
      '❌ Maximum redirect attempts reached, stopping to prevent infinite loop'
    );
    // Clear the flag and show error to user
    delete (window as any)[REDIRECT_FLAG];
    delete (window as any).__REDIRECT_ATTEMPTS__;
    alert(
      'Error: No se pudo redirigir al login. Por favor, recarga la página manualmente.'
    );
    return;
  }

  // Increment redirect attempt counter
  (window as any).__REDIRECT_ATTEMPTS__ = redirectAttempts + 1;

  (window as any)[REDIRECT_FLAG] = true;

  // No localStorage to clear - using cookie-based auth only
  // Backend will handle cookie clearing if needed

  // Clean URL to prevent loop (remove token and error parameters)
  const url = new URL(window.location.href);
  url.searchParams.delete('token');
  url.searchParams.delete('error');
  window.history.replaceState({}, '', url.toString());

  // Build login URL with error parameter if access was revoked
  let loginUrl: string;
  try {
    const API_URL = getApiUrl();
    loginUrl = `${API_URL}/auth/login`;
    if (reason === 'access_revoked') {
      loginUrl += '?error=access_revoked';
    }
    console.warn(
      `🚫 Redirecting to login: ${loginUrl} (reason: ${reason || 'unknown'}, attempt: ${redirectAttempts + 1})`
    );
  } catch (error) {
    console.error('❌ Failed to build login URL:', error);
    const currentHost = window.location.hostname;
    loginUrl = `https://${currentHost}/api/auth/login`;
    if (reason === 'access_revoked') {
      loginUrl += '?error=access_revoked';
    }
    console.warn(`⚠️ Using fallback login URL: ${loginUrl}`);
  }

  // Verify we're not already going to the same URL
  if (currentUrl === loginUrl || currentUrl.includes('/auth/login')) {
    console.warn('⚠️ Already on login URL, skipping redirect');
    delete (window as any)[REDIRECT_FLAG];
    return;
  }

  // Method 1: Try window.location.replace() first (prevents back button issues)
  try {
    window.location.replace(loginUrl);

    // Set timeout to ensure redirection completes or fallback to href
    setTimeout(() => {
      // If still on same page after timeout, force redirect with href
      if (
        window.location.href !== loginUrl &&
        !window.location.href.includes('/auth/login')
      ) {
        console.warn(
          '⚠️ replace() did not complete, forcing redirect with href'
        );
        // Clear flag temporarily to allow new redirect attempt
        delete (window as any)[REDIRECT_FLAG];
        window.location.href = loginUrl;
      } else {
        // Successfully redirected, reset attempt counter
        delete (window as any).__REDIRECT_ATTEMPTS__;
      }
    }, REDIRECT_TIMEOUT);
  } catch (error) {
    console.error('❌ window.location.replace() failed:', error);
    // Fallback to href if replace() fails
    try {
      delete (window as any)[REDIRECT_FLAG];
      window.location.href = loginUrl;
    } catch (hrefError) {
      console.error('❌ window.location.href also failed:', hrefError);
      // Last resort: try with default URL structure
      const currentHost = window.location.hostname;
      const fallbackUrl = `https://${currentHost}/api/auth/login`;
      console.error(
        '❌ All redirect methods failed, trying absolute fallback:',
        fallbackUrl
      );
      delete (window as any)[REDIRECT_FLAG];
      window.location.href = fallbackUrl;
    }
  }
}

/**
 * Clear the redirect flag and reset attempt counter (useful for testing or resetting state)
 */
export function clearRedirectFlag(): void {
  delete (window as any)[REDIRECT_FLAG];
  delete (window as any).__REDIRECT_ATTEMPTS__;
}

/**
 * Check if a redirect is currently in progress
 */
export function isRedirecting(): boolean {
  return !!(window as any)[REDIRECT_FLAG];
}
