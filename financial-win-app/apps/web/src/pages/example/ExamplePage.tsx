import { useState } from 'react';
import {
  useExamples,
  useDeleteExample,
} from './useExampleQuery';
import { ExampleForm } from './ExampleForm';
import { ExampleQuery } from '@financial-win/shared-types';

/**
 * Example Page Component
 * 
 * Demonstrates:
 * - Listing data with TanStack Query
 * - Pagination
 * - Create/Update/Delete operations
 * - Loading and error states
 * - Form modal handling
 */
export function ExamplePage() {
  const [query, setQuery] = useState<ExampleQuery>({
    page: 1,
    limit: 10,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();

  const { data, isLoading, error } = useExamples(query);
  const deleteMutation = useDeleteExample();

  const handleCreate = () => {
    setEditingId(undefined);
    setShowForm(true);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this example?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        console.error('Failed to delete:', err);
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingId(undefined);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingId(undefined);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        Error loading examples: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Examples</h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Example
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Search..."
          value={query.search || ''}
          onChange={(e) =>
            setQuery({ ...query, search: e.target.value || undefined, page: 1 })
          }
          className="px-3 py-2 border border-gray-300 rounded"
        />
        <select
          value={query.status || ''}
          onChange={(e) =>
            setQuery({
              ...query,
              status: (e.target.value || undefined) as
                | 'active'
                | 'inactive'
                | 'pending'
                | undefined,
              page: 1,
            })
          }
          className="px-3 py-2 border border-gray-300 rounded"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.data.map((example) => (
              <tr key={example.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {example.name}
                  </div>
                  {example.description && (
                    <div className="text-sm text-gray-500">
                      {example.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      example.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : example.status === 'inactive'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {example.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(example.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(example.id)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(example.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Showing {((query.page - 1) * query.limit) + 1} to{' '}
            {Math.min(query.page * query.limit, data.total)} of {data.total}{' '}
            results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setQuery({ ...query, page: query.page - 1 })}
              disabled={query.page === 1}
              className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setQuery({ ...query, page: query.page + 1 })}
              disabled={query.page >= data.totalPages}
              className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Edit Example' : 'Create Example'}
            </h2>
            <ExampleForm
              exampleId={editingId}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
}

