/**
 * Test Utilities
 * 
 * Shared utilities and wrappers for testing React components
 */

import React, { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

/**
 * Creates a test QueryClient with disabled retries and shorter stale times
 * for faster and more predictable tests
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0, // Previously cacheTime
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Test wrapper component that provides all necessary providers
 * for testing React components that use TanStack Query, React Router, and Auth
 * 
 * Usage:
 * ```tsx
 * render(
 *   <TestWrapper>
 *     <MyComponent />
 *   </TestWrapper>
 * );
 * ```
 */
export function TestWrapper({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient?: QueryClient;
}): ReactElement {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Test wrapper for components that only need TanStack Query
 * 
 * Usage:
 * ```tsx
 * render(
 *   <QueryWrapper>
 *     <MyComponent />
 *   </QueryWrapper>
 * );
 * ```
 */
export function QueryWrapper({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient?: QueryClient;
}): ReactElement {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

/**
 * Test wrapper for components that need React Router
 * 
 * Usage:
 * ```tsx
 * render(
 *   <RouterWrapper>
 *     <MyComponent />
 *   </RouterWrapper>
 * );
 * ```
 */
export function RouterWrapper({
  children,
}: {
  children: React.ReactNode;
}): ReactElement {
  return <BrowserRouter>{children}</BrowserRouter>;
}

