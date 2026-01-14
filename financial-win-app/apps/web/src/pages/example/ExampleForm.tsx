import { useState, FormEvent } from 'react';
import {
  useCreateExample,
  useUpdateExample,
  useExample,
} from './useExampleQuery';
import { CreateExample, UpdateExample } from '@financial-win/shared-types';

interface ExampleFormProps {
  exampleId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Example Form Component
 * 
 * Demonstrates:
 * - Form handling with React state
 * - TanStack Query mutations (create/update)
 * - Loading and error states
 * - Optimistic updates via query invalidation
 */
export function ExampleForm({
  exampleId,
  onSuccess,
  onCancel,
}: ExampleFormProps) {
  const [formData, setFormData] = useState<CreateExample>({
    name: '',
    description: '',
    status: 'active',
  });

  const { data: existingExample, isLoading: isLoadingExample } = useExample(
    exampleId || ''
  );
  const createMutation = useCreateExample();
  const updateMutation = useUpdateExample();

  // Load existing data when editing
  if (exampleId && existingExample && !isLoadingExample) {
    if (formData.name === '' && existingExample.name) {
      setFormData({
        name: existingExample.name,
        description: existingExample.description || '',
        status: existingExample.status,
      });
    }
  }

  const isLoading = isLoadingExample || createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      if (exampleId) {
        await updateMutation.mutateAsync({
          id: exampleId,
          data: formData as UpdateExample,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      onSuccess?.();
    } catch (err) {
      // Error is handled by TanStack Query
      console.error('Failed to save example:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          Error: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name *
        </label>
        <input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          id="status"
          value={formData.status}
          onChange={(e) =>
            setFormData({
              ...formData,
              status: e.target.value as 'active' | 'inactive' | 'pending',
            })
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          disabled={isLoading}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : exampleId ? 'Update' : 'Create'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

