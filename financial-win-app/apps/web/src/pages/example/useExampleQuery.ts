/**
 * Example Query Hooks
 * 
 * Demonstrates how to use TanStack Query for data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import {
  CreateExample,
  UpdateExample,
  ExampleQuery,
} from '@financial-win/shared-types';

/**
 * Query key factory for example queries
 */
export const exampleKeys = {
  all: ['examples'] as const,
  lists: () => [...exampleKeys.all, 'list'] as const,
  list: (query: ExampleQuery) => [...exampleKeys.lists(), query] as const,
  details: () => [...exampleKeys.all, 'detail'] as const,
  detail: (id: string) => [...exampleKeys.details(), id] as const,
};

/**
 * Hook to fetch all examples with pagination
 */
export function useExamples(query: ExampleQuery) {
  return useQuery({
    queryKey: exampleKeys.list(query),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: query.page.toString(),
        limit: query.limit.toString(),
      });
      if (query.status) params.append('status', query.status);
      if (query.search) params.append('search', query.search);

      const response = await apiClient.get(`/example?${params.toString()}`);
      return response.data;
    },
  });
}

/**
 * Hook to fetch a single example by ID
 */
export function useExample(id: string) {
  return useQuery({
    queryKey: exampleKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(`/example/${id}`);
      return response.data;
    },
    enabled: !!id, // Only fetch if id is provided
  });
}

/**
 * Hook to create a new example
 */
export function useCreateExample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExample) => {
      const response = await apiClient.post('/example', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch examples list
      queryClient.invalidateQueries({ queryKey: exampleKeys.lists() });
    },
  });
}

/**
 * Hook to update an example
 */
export function useUpdateExample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateExample;
    }) => {
      const response = await apiClient.patch(`/example/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: exampleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: exampleKeys.detail(data.id) });
    },
  });
}

/**
 * Hook to delete an example
 */
export function useDeleteExample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/example/${id}`);
    },
    onSuccess: () => {
      // Invalidate examples list
      queryClient.invalidateQueries({ queryKey: exampleKeys.lists() });
    },
  });
}

