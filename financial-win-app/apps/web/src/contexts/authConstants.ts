// Polling configuration constants
export const POLLING_INTERVAL = 2 * 60 * 1000; // 2 minutes - Increased to reduce server load while maintaining active verification
export const POLLING_INACTIVE_THRESHOLD = 30 * 60 * 1000; // 30 minutes of inactivity - Increased to avoid pausing polling during brief work breaks
export const TOKEN_REFRESH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes - Check token expiration every 5 minutes (increased from 1 minute)
