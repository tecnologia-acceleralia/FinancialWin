import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExamplePage } from './ExamplePage';
import { TestWrapper } from '../../test-utils';
import * as useExampleQuery from './useExampleQuery';

// Mock the hooks
vi.mock('./useExampleQuery', () => ({
  useExamples: vi.fn(),
  useDeleteExample: vi.fn(),
}));

describe('ExamplePage', () => {
  const mockUseExamples = useExampleQuery.useExamples as ReturnType<
    typeof vi.fn
  >;
  const mockUseDeleteExample = useExampleQuery.useDeleteExample as ReturnType<
    typeof vi.fn
  >;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUseExamples.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    mockUseDeleteExample.mockReturnValue({
      mutateAsync: vi.fn(),
    });

    render(
      <TestWrapper>
        <ExamplePage />
      </TestWrapper>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseExamples.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load'),
    });
    mockUseDeleteExample.mockReturnValue({
      mutateAsync: vi.fn(),
    });

    render(
      <TestWrapper>
        <ExamplePage />
      </TestWrapper>
    );

    expect(screen.getByText(/Error loading examples/i)).toBeInTheDocument();
  });

  it('should render examples list', async () => {
    const mockData = {
      data: [
        {
          id: '1',
          name: 'Test Example 1',
          description: 'Description 1',
          status: 'active' as const,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Test Example 2',
          description: 'Description 2',
          status: 'inactive' as const,
          created_at: new Date().toISOString(),
        },
      ],
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    };

    mockUseExamples.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });
    mockUseDeleteExample.mockReturnValue({
      mutateAsync: vi.fn(),
    });

    render(
      <TestWrapper>
        <ExamplePage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Example 1')).toBeInTheDocument();
      expect(screen.getByText('Test Example 2')).toBeInTheDocument();
    });
  });

  it('should open form when create button is clicked', async () => {
    const user = userEvent.setup();
    mockUseExamples.mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 10, totalPages: 0 },
      isLoading: false,
      error: null,
    });
    mockUseDeleteExample.mockReturnValue({
      mutateAsync: vi.fn(),
    });

    render(
      <TestWrapper>
        <ExamplePage />
      </TestWrapper>
    );

    const createButton = screen.getByText('Create Example');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create Example')).toBeInTheDocument();
    });
  });
});

