/**
 * Email normalization utility
 * Centralized function to ensure consistent email normalization across the application
 */

/**
 * Normalizes an email address by trimming whitespace and converting to lowercase
 * @param email - The email address to normalize
 * @returns Normalized email address (trimmed and lowercase)
 * @throws Error if email is empty after normalization
 */
export function normalizeEmail(email: string | undefined | null): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required and must be a string');
  }
  
  const normalized = email.trim().toLowerCase();
  
  if (!normalized) {
    throw new Error('Email cannot be empty after normalization');
  }
  
  return normalized;
}

