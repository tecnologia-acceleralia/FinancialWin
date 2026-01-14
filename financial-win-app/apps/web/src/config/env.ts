/**
 * Environment configuration helper
 *
 * Centralized location for environment variables with validation.
 * This ensures all environment variables are properly validated and
 * provides clear error messages if they're missing.
 */

/**
 * Gets the API URL from environment variables.
 * Throws an error if VITE_API_URL is not defined.
 *
 * @returns The API base URL
 * @throws Error if VITE_API_URL is not defined
 */
export function getApiUrl(): string {
  const apiUrl = (import.meta as any).env?.VITE_API_URL;

  if (!apiUrl) {
    const errorMessage = `
❌ CRITICAL CONFIGURATION ERROR ❌

VITE_API_URL environment variable is not defined.

This is required for the application to function correctly.
Please configure VITE_API_URL in your environment variables.

Expected format: VITE_API_URL=https://write.test.acceleralia.com/api

This variable must be set during the build process (not runtime).
For DigitalOcean App Platform, configure it in "Build Environment Variables".
    `.trim();

    console.error(errorMessage);

    // Show error in UI if possible
    if (typeof window !== 'undefined') {
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ef4444;
        color: white;
        padding: 20px;
        z-index: 99999;
        font-family: monospace;
        white-space: pre-wrap;
      `;
      errorDiv.textContent = errorMessage;
      document.body.prepend(errorDiv);
    }

    throw new Error(
      'VITE_API_URL is not defined. Please configure it in your environment variables.'
    );
  }

  // Remove trailing slash if present
  return apiUrl.replace(/\/$/, '');
}

/**
 * Logs the current environment configuration (without sensitive data)
 */
export function logEnvironmentConfig(): void {
  const apiUrl = (import.meta as any).env?.VITE_API_URL;

  console.log('=== 🔧 ENVIRONMENT CONFIGURATION ===');
  console.log('VITE_API_URL:', apiUrl || '❌ NOT DEFINED');
  console.log('NODE_ENV:', import.meta.env?.MODE || 'unknown');
  console.log('=== ================================= ===');
}
