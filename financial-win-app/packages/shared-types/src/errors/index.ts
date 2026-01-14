/**
 * Error Types
 * 
 * Shared error types and error response structures
 */

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

