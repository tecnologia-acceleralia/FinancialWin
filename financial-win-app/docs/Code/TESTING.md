# Testing Strategy

## Overview

This financial-win follows a comprehensive testing strategy to ensure code quality and reliability across backend and frontend applications.

## Backend Testing

### Unit Tests

**Location**: `apps/api/src/**/*.spec.ts`

**Framework**: Jest + ts-jest

**Pattern**:
- Test individual services, controllers, and utilities in isolation
- Mock dependencies using Jest mocks
- Focus on business logic and edge cases

**Example**:
```typescript
// apps/api/src/modules/example/example.service.spec.ts
describe('ExampleService', () => {
  it('should create an example', async () => {
    // Arrange
    const mockRepository = { create: jest.fn(), save: jest.fn() };
    const service = new ExampleService(mockRepository);
    
    // Act
    const result = await service.create('company-id', { name: 'Test' });
    
    // Assert
    expect(result).toBeDefined();
    expect(mockRepository.create).toHaveBeenCalled();
  });
});
```

### E2E Tests

**Location**: `apps/api/test/**/*.e2e-spec.ts`

**Framework**: Jest + Supertest

**Pattern**:
- Test complete request/response cycles
- Use test database (configured in `test.env`)
- Test authentication, authorization, and business flows

**Example**:
```typescript
// apps/api/test/example/example.e2e-spec.ts
describe('ExampleController (e2e)', () => {
  it('should create an example', () => {
    return request(app.getHttpServer())
      .post('/example')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test' })
      .expect(201);
  });
});
```

### Running Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:cov

# Watch mode
pnpm test:watch
```

### Test Utilities

**JwtTestHelper**: `apps/api/test/utils/jwt-helper.ts`
- Generate JWT tokens for testing
- Create auth headers and cookies

## Frontend Testing

### Component Tests

**Location**: `apps/web/src/**/*.test.tsx`

**Framework**: Vitest + Testing Library

**Pattern**:
- Test component rendering and user interactions
- Use `TestWrapper` for components that need providers (QueryClient, Router, Auth)
- Mock API calls using Vitest mocks

**Example**:
```typescript
// apps/web/src/pages/example/ExamplePage.test.tsx
import { render, screen } from '@testing-library/react';
import { TestWrapper } from '../../test-utils';
import { ExamplePage } from './ExamplePage';

describe('ExamplePage', () => {
  it('should render examples list', () => {
    render(
      <TestWrapper>
        <ExamplePage />
      </TestWrapper>
    );
    expect(screen.getByText('Examples')).toBeInTheDocument();
  });
});
```

### Test Utilities

**TestWrapper**: `apps/web/src/test-utils.tsx`
- Provides QueryClientProvider, BrowserRouter, and AuthProvider
- Use for components that need TanStack Query or routing

**Usage**:
```typescript
import { TestWrapper } from '../test-utils';

render(
  <TestWrapper>
    <MyComponent />
  </TestWrapper>
);
```

### Running Tests

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov
```

## Example Module

The `example` module demonstrates the complete testing pattern:

### Backend
- **Entity**: `apps/api/src/modules/example/entities/example.entity.ts`
- **Service**: `apps/api/src/modules/example/example.service.ts`
- **Controller**: `apps/api/src/modules/example/example.controller.ts`
- **Unit Tests**: 
  - `apps/api/src/modules/example/example.service.spec.ts`
  - `apps/api/src/modules/example/example.controller.spec.ts`
- **E2E Tests**: `apps/api/test/example/example.e2e-spec.ts`
- **Migration**: `apps/api/src/migrations/1733000000000-CreateExampleTable.ts`

### Frontend
- **Page**: `apps/web/src/pages/example/ExamplePage.tsx`
- **Form**: `apps/web/src/pages/example/ExampleForm.tsx`
- **Hooks**: `apps/web/src/pages/example/useExampleQuery.ts`
- **Tests**: `apps/web/src/pages/example/ExamplePage.test.tsx`

## Coverage Expectations

- **Backend**: Minimum 70% coverage (branches, functions, lines, statements)
- **Frontend**: Minimum 60% coverage for critical components

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how
2. **Use Descriptive Names**: Test names should describe the behavior being tested
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Mock External Dependencies**: Don't test third-party libraries
5. **Test Edge Cases**: Empty inputs, null values, error conditions
6. **Keep Tests Fast**: Unit tests should be fast, E2E tests can be slower
7. **Isolate Tests**: Each test should be independent
8. **Use Test Utilities**: Reuse helpers and wrappers

## CI/CD Integration

Tests should run automatically:
- On pull requests
- Before merging to main
- In deployment pipelines

Configure in your CI/CD platform to fail builds if tests fail or coverage drops below thresholds.

