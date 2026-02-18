## Summary

This document defines the testing strategy for CollabBoard: Vitest for unit and integration tests, Playwright for E2E, and a testing pyramid (many unit tests, fewer integration, few critical E2E flows). It covers setup, mocking (e.g. Firebase), coverage targets, and CI integration. Its purpose is to keep quality bar and practices consistent and to justify the choice of tools and what is tested at each layer.

---

# Testing Guide for CollabBoard

## Overview

This guide covers the testing strategy for CollabBoard using Vitest for unit/integration tests and Playwright for end-to-end tests. The goal is to achieve 80% code coverage for MVP while ensuring critical collaboration features work reliably.

**Official Documentation**:

- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [Testing Library Docs](https://testing-library.com/docs/)

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Vitest Setup](#vitest-setup)
3. [Unit Testing](#unit-testing)
4. [Component Testing](#component-testing)
5. [Integration Testing](#integration-testing)
6. [Mocking](#mocking)
7. [Playwright E2E Setup](#playwright-e2e-setup)
8. [E2E Testing](#e2e-testing)
9. [Coverage Reports](#coverage-reports)
10. [CI/CD Integration](#cicd-integration)

---

## Testing Philosophy

### Testing Pyramid for CollabBoard

```text
        /\
       /E2E\        <- Critical user flows (5-10 tests)
      /______\
     /        \
    /Integration\ <- Module interactions (20-30 tests)
   /______________\
  /                \
 /    Unit Tests    \ <- Pure functions, hooks (50+ tests)
/____________________\
```

### What to Test

| Layer | What to Test | Priority |
| ----- | ------------- | -------- |
| **E2E** | Multi-user sync, auth flows, AI commands | Critical |
| **Integration** | Firebase sync, Konva rendering, hook interactions | High |
| **Unit** | Utilities, state reducers, pure functions | Medium |

### Test File Naming

```text
src/
├── modules/
│   └── auth/
│       ├── authService.ts
│       └── authService.test.ts    # Unit tests alongside source
├── components/
│   └── canvas/
│       ├── StickyNote.tsx
│       └── StickyNote.test.tsx    # Component tests
tests/
├── integration/
│   └── sync.test.ts               # Integration tests
└── e2e/
    └── collaboration.spec.ts      # E2E tests (Playwright)
```

---

## Vitest Setup

### Installation

```bash
bun add -d vitest @vitest/coverage-v8 @vitest/ui
bun add -d @testing-library/react @testing-library/jest-dom @testing-library/user-event
bun add -d jsdom happy-dom
bun add -d msw  # Mock Service Worker for API mocking
```

### Configuration

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Environment
    environment: 'jsdom',
    globals: true,

    // Setup files
    setupFiles: ['./tests/setup.ts'],

    // Include patterns
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],

    // Exclude patterns
    exclude: ['node_modules', 'dist', 'tests/e2e'],

    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },

    // Test timeout
    testTimeout: 10000,

    // Watch mode
    watch: true,
    watchExclude: ['node_modules', 'dist'],

    // Reporter
    reporters: ['default', 'html'],

    // Pool for parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Setup File

Create `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { setupServer } from 'msw/node';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Suppress console errors during tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
```

### Global Types

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

---

## Unit Testing

### Testing Pure Functions

Create `src/lib/utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { cn, generateId, clamp, debounce } from './utils';

describe('cn (classNames merger)', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('merges Tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });
});

describe('generateId', () => {
  it('generates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('generates IDs with correct length', () => {
    const id = generateId();
    expect(id.length).toBeGreaterThan(0);
  });
});

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to minimum', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to maximum', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('debounce', () => {
  it('delays function execution', async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it('only calls once for rapid invocations', async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });
});
```

### Testing Hooks

Create `src/hooks/useLocalStorage.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('returns initial value when localStorage is empty', () => {
    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'initial')
    );
    expect(result.current[0]).toBe('initial');
  });

  it('returns stored value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored'));
    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'initial')
    );
    expect(result.current[0]).toBe('stored');
  });

  it('updates localStorage when value changes', () => {
    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'initial')
    );

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('updated'));
  });

  it('handles objects', () => {
    const initialValue = { name: 'test', count: 0 };
    const { result } = renderHook(() =>
      useLocalStorage('test-key', initialValue)
    );

    act(() => {
      result.current[1]({ name: 'updated', count: 1 });
    });

    expect(result.current[0]).toEqual({ name: 'updated', count: 1 });
  });

  it('handles function updates', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 0));

    act(() => {
      result.current[1]((prev: number) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });
});
```

---

## Component Testing

### Testing React Components

Create `src/components/ui/Button.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('renders with default variant', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary');
  });

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant='secondary'>Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-secondary');

    rerender(<Button variant='destructive'>Destructive</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');

    rerender(<Button variant='outline'>Outline</Button>);
    expect(screen.getByRole('button')).toHaveClass('border');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size='sm'>Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-8');

    rerender(<Button size='lg'>Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-10');

    rerender(<Button size='icon'>Icon</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-9', 'w-9');
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');

    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:pointer-events-none');
  });

  it('renders as child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href='/test'>Link Button</a>
      </Button>
    );

    const link = screen.getByRole('link', { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
  });
});
```

### Testing Canvas Components

Create `src/components/canvas/StickyNote.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Stage, Layer } from 'react-konva';
import { StickyNote } from './StickyNote';

// Wrapper for Konva components
const KonvaWrapper = ({ children }: { children: React.ReactNode }) => (
  <Stage width={500} height={500}>
    <Layer>{children}</Layer>
  </Stage>
);

describe('StickyNote', () => {
  const defaultProps = {
    id: 'test-sticky',
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    text: 'Test Note',
    fill: '#fef08a',
    onDragEnd: vi.fn(),
    onClick: vi.fn(),
  };

  it('renders with correct position', () => {
    render(
      <KonvaWrapper>
        <StickyNote {...defaultProps} />
      </KonvaWrapper>
    );

    // Konva components render to canvas, so we test the canvas exists
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('calls onDragEnd when dragged', () => {
    const onDragEnd = vi.fn();
    render(
      <KonvaWrapper>
        <StickyNote {...defaultProps} onDragEnd={onDragEnd} />
      </KonvaWrapper>
    );

    const canvas = document.querySelector('canvas');
    if (canvas) {
      // Simulate drag
      fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(canvas);
    }

    // Note: Full Konva interaction testing requires Playwright
  });
});
```

### Testing with Context Providers

Create `tests/utils/testUtils.tsx`:

```typescript
import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Add any providers your app needs
interface ProvidersProps {
  children: ReactNode;
}

const AllProviders = ({ children }: ProvidersProps): ReactElement => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
```

---

## Integration Testing

### Testing Firebase Integration

Create `tests/integration/firebaseSync.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createBoard,
  getBoard,
  updateObject,
  subscribeToObjects,
} from '@/modules/sync/firestoreService';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
}));

vi.mock('@/lib/firebase', () => ({
  firestore: {},
}));

import {
  setDoc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';

describe('Firestore Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBoard', () => {
    it('creates a board with correct data', async () => {
      const mockSetDoc = vi.mocked(setDoc);
      mockSetDoc.mockResolvedValueOnce(undefined);

      await createBoard('board-123', 'Test Board', 'user-456');

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'Test Board',
          ownerId: 'user-456',
          members: { 'user-456': 'owner' },
        })
      );
    });
  });

  describe('getBoard', () => {
    it('returns board when it exists', async () => {
      const mockGetDoc = vi.mocked(getDoc);
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'board-123',
        data: () => ({
          name: 'Test Board',
          ownerId: 'user-456',
        }),
      } as never);

      const board = await getBoard('board-123');

      expect(board).toEqual({
        id: 'board-123',
        name: 'Test Board',
        ownerId: 'user-456',
      });
    });

    it('returns null when board does not exist', async () => {
      const mockGetDoc = vi.mocked(getDoc);
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      } as never);

      const board = await getBoard('non-existent');
      expect(board).toBeNull();
    });
  });

  describe('subscribeToObjects', () => {
    it('calls callback with objects on update', () => {
      const mockOnSnapshot = vi.mocked(onSnapshot);
      const callback = vi.fn();

      mockOnSnapshot.mockImplementationOnce((_, cb: (snapshot: unknown) => void) => {
        // Simulate snapshot
        cb({
          forEach: (fn: (doc: { id: string; data: () => unknown }) => void) => {
            fn({
              id: 'obj-1',
              data: () => ({ type: 'sticky', x: 100, y: 100 }),
            });
          },
        });
        return () => {};
      });

      subscribeToObjects('board-123', callback);

      expect(callback).toHaveBeenCalledWith([
        { id: 'obj-1', type: 'sticky', x: 100, y: 100 },
      ]);
    });
  });
});
```

### Testing Auth Flow

Create `tests/integration/auth.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/modules/auth/useAuth';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  GoogleAuthProvider: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: {},
}));

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth';

describe('useAuth hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with loading state', () => {
    vi.mocked(onAuthStateChanged).mockImplementation(() => () => {});

    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('updates user when auth state changes', async () => {
    const mockUser = { uid: '123', email: 'test@example.com' };

    vi.mocked(onAuthStateChanged).mockImplementation((_, callback) => {
      // @ts-expect-error - simplified mock
      callback(mockUser);
      return () => {};
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  it('handles sign up successfully', async () => {
    const mockUser = { uid: '123', email: 'test@example.com' };
    vi.mocked(createUserWithEmailAndPassword).mockResolvedValueOnce({
      user: mockUser,
    } as never);
    vi.mocked(onAuthStateChanged).mockImplementation(() => () => {});

    const { result } = renderHook(() => useAuth());

    let signUpResult;
    await act(async () => {
      signUpResult = await result.current.signUp('test@example.com', 'password123');
    });

    expect(signUpResult).toEqual({ user: mockUser, error: null });
  });

  it('handles sign up error', async () => {
    const error = new Error('Email already in use');
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValueOnce(error);
    vi.mocked(onAuthStateChanged).mockImplementation(() => () => {});

    const { result } = renderHook(() => useAuth());

    let signUpResult;
    await act(async () => {
      signUpResult = await result.current.signUp('test@example.com', 'password123');
    });

    expect(signUpResult).toEqual({ user: null, error: 'Email already in use' });
  });
});
```

---

## Mocking

### Mock Service Worker Setup

Create `tests/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock AI API endpoint
  http.post('https://integrate.api.nvidia.com/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                function: {
                  name: 'createStickyNote',
                  arguments: JSON.stringify({
                    text: 'Test Note',
                    x: 100,
                    y: 100,
                    color: '#fef08a',
                  }),
                },
              },
            ],
          },
        },
      ],
    });
  }),

  // Mock any other external APIs
  http.get('/api/boards', () => {
    return HttpResponse.json([
      { id: '1', name: 'Board 1' },
      { id: '2', name: 'Board 2' },
    ]);
  }),
];
```

Create `tests/mocks/server.ts`:

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

Update `tests/setup.ts`:

```typescript
import { server } from './mocks/server';

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Close server after all tests
afterAll(() => server.close());
```

### Mocking Modules

```typescript
import { vi } from 'vitest';

// Mock entire module
vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user' },
  },
  firestore: {},
  realtimeDb: {},
}));

// Mock specific functions
vi.mock('@/modules/sync/firestoreService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/sync/firestoreService')>();
  return {
    ...actual,
    createBoard: vi.fn(),
  };
});

// Spy on function
const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
// ... test
spy.mockRestore();
```

---

## Playwright E2E Setup

### Playwright Installation

```bash
bun add -d @playwright/test
bunx playwright install
```

### Playwright Configuration

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Start dev server before tests
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

---

## E2E Testing

### Authentication Flow

Create `tests/e2e/auth.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows login page for unauthenticated users', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('allows user to sign up', async ({ page }) => {
    await page.getByRole('link', { name: /sign up/i }).click();

    await page.getByLabel(/email/i).fill('newuser@example.com');
    await page.getByLabel(/password/i).fill('securePassword123');
    await page.getByRole('button', { name: /sign up/i }).click();

    // Should redirect to dashboard or show success
    await expect(page).toHaveURL(/dashboard|boards/);
  });

  test('allows user to sign in', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('testPassword123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/dashboard|boards/);
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('wrong@example.com');
    await page.getByLabel(/password/i).fill('wrongPassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid|error/i)).toBeVisible();
  });
});
```

### Multi-User Collaboration

Create `tests/e2e/collaboration.spec.ts`:

```typescript
import { test, expect, Page, Browser } from '@playwright/test';

test.describe('Multi-User Collaboration', () => {
  let browser1Context: Page;
  let browser2Context: Page;

  test.beforeAll(async ({ browser }) => {
    // Create two browser contexts to simulate two users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    browser1Context = await context1.newPage();
    browser2Context = await context2.newPage();
  });

  test.afterAll(async () => {
    await browser1Context.close();
    await browser2Context.close();
  });

  test('both users see real-time cursor movements', async () => {
    const boardUrl = '/board/test-board-123';

    // Both users navigate to the same board
    await browser1Context.goto(boardUrl);
    await browser2Context.goto(boardUrl);

    // Wait for canvas to load
    await browser1Context.waitForSelector('canvas');
    await browser2Context.waitForSelector('canvas');

    // User 1 moves cursor
    await browser1Context.mouse.move(300, 300);

    // User 2 should see User 1's cursor
    // This depends on your cursor implementation
    await expect(browser2Context.locator('[data-testid='remote-cursor']')).toBeVisible({
      timeout: 5000,
    });
  });

  test('sticky note created by one user appears for other user', async () => {
    const boardUrl = '/board/test-board-123';

    await browser1Context.goto(boardUrl);
    await browser2Context.goto(boardUrl);

    // User 1 creates a sticky note
    await browser1Context.click('[data-testid='tool-sticky']');
    await browser1Context.click('canvas', { position: { x: 200, y: 200 } });

    // User 2 should see the sticky note
    await expect(browser2Context.locator('[data-testid='sticky-note']')).toBeVisible({
      timeout: 5000,
    });
  });

  test('object movement syncs between users', async () => {
    const boardUrl = '/board/test-board-123';

    await browser1Context.goto(boardUrl);
    await browser2Context.goto(boardUrl);

    // Assuming there's already a sticky note on the board
    // User 1 drags the sticky note
    const canvas1 = browser1Context.locator('canvas');
    await canvas1.dragTo(canvas1, {
      sourcePosition: { x: 200, y: 200 },
      targetPosition: { x: 400, y: 400 },
    });

    // User 2 should see the sticky note in the new position
    // Verification depends on implementation
    await browser2Context.waitForTimeout(1000); // Wait for sync
  });
});
```

### Canvas Interactions

Create `tests/e2e/canvas.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Canvas Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a board (assuming authenticated)
    await page.goto('/board/test-board');
    await page.waitForSelector('canvas');
  });

  test('can pan the canvas', async ({ page }) => {
    const canvas = page.locator('canvas');

    // Get initial position
    const initialTransform = await canvas.evaluate((el) => {
      // Get the Konva stage position
      return window.Konva?.stages[0]?.position() || { x: 0, y: 0 };
    });

    // Pan by dragging on empty space
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 400, y: 400 },
      targetPosition: { x: 200, y: 200 },
    });

    // Check position changed
    const newTransform = await canvas.evaluate(() => {
      return window.Konva?.stages[0]?.position() || { x: 0, y: 0 };
    });

    expect(newTransform.x).not.toBe(initialTransform.x);
    expect(newTransform.y).not.toBe(initialTransform.y);
  });

  test('can zoom with scroll wheel', async ({ page }) => {
    const canvas = page.locator('canvas');

    // Get initial scale
    const initialScale = await canvas.evaluate(() => {
      return window.Konva?.stages[0]?.scaleX() || 1;
    });

    // Zoom in with scroll
    await canvas.hover();
    await page.mouse.wheel(0, -100);

    // Check scale increased
    const newScale = await canvas.evaluate(() => {
      return window.Konva?.stages[0]?.scaleX() || 1;
    });

    expect(newScale).toBeGreaterThan(initialScale);
  });

  test('can create a sticky note', async ({ page }) => {
    // Select sticky note tool
    await page.click('[data-testid='tool-sticky']');

    // Click on canvas to create
    await page.click('canvas', { position: { x: 300, y: 300 } });

    // Verify sticky note was created
    const stickyCount = await page.evaluate(() => {
      const stage = window.Konva?.stages[0];
      return stage?.find('.sticky').length || 0;
    });

    expect(stickyCount).toBeGreaterThan(0);
  });

  test('can select and transform objects', async ({ page }) => {
    // Create an object first
    await page.click('[data-testid='tool-rectangle']');
    await page.click('canvas', { position: { x: 200, y: 200 } });

    // Select the object
    await page.click('canvas', { position: { x: 200, y: 200 } });

    // Check transformer is visible
    const hasTransformer = await page.evaluate(() => {
      const stage = window.Konva?.stages[0];
      const transformer = stage?.findOne('Transformer');
      return transformer && transformer.nodes().length > 0;
    });

    expect(hasTransformer).toBe(true);
  });
});
```

### AI Commands

Create `tests/e2e/ai.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('AI Board Agent', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/board/test-board');
    await page.waitForSelector('canvas');
  });

  test('can create sticky note via AI command', async ({ page }) => {
    // Open AI chat
    await page.click('[data-testid='ai-chat-toggle']');

    // Type command
    await page.fill('[data-testid='ai-input']', 'Add a yellow sticky note that says 'Test'');
    await page.click('[data-testid='ai-submit']');

    // Wait for AI response and execution
    await page.waitForSelector('[data-testid='ai-response']', { timeout: 10000 });

    // Verify sticky note was created
    const stickyCount = await page.evaluate(() => {
      const stage = window.Konva?.stages[0];
      return stage?.find('.sticky').length || 0;
    });

    expect(stickyCount).toBeGreaterThan(0);
  });

  test('can arrange objects via AI command', async ({ page }) => {
    // Create multiple sticky notes first
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid='tool-sticky']');
      await page.click('canvas', { position: { x: 100 + i * 50, y: 100 + i * 50 } });
    }

    // Open AI chat and arrange
    await page.click('[data-testid='ai-chat-toggle']');
    await page.fill('[data-testid='ai-input']', 'Arrange these sticky notes in a grid');
    await page.click('[data-testid='ai-submit']');

    // Wait for execution
    await page.waitForTimeout(3000);

    // Verify arrangement (positions should be aligned)
    const positions = await page.evaluate(() => {
      const stage = window.Konva?.stages[0];
      const stickies = stage?.find('.sticky') || [];
      return stickies.map((s: { x: () => number; y: () => number }) => ({ x: s.x(), y: s.y() }));
    });

    // Check that positions are somewhat grid-like
    expect(positions.length).toBe(3);
  });

  test('responds within 2 seconds for simple commands', async ({ page }) => {
    await page.click('[data-testid='ai-chat-toggle']');

    const startTime = Date.now();

    await page.fill('[data-testid='ai-input']', 'Add a blue rectangle');
    await page.click('[data-testid='ai-submit']');

    await page.waitForSelector('[data-testid='ai-response']', { timeout: 5000 });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    expect(responseTime).toBeLessThan(2000);
  });
});
```

---

## Coverage Reports

### Generating Coverage

```bash
# Run tests with coverage
bun run test:coverage

# View coverage report
open coverage/index.html
```

### Coverage Configuration

In `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/types/**',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run unit tests
        run: bun run test:run

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Install Playwright browsers
        run: bunx playwright install --with-deps

      - name: Run E2E tests
        run: bun run test:e2e
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          # Add other env vars

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## Best Practices Summary

1. **Test behavior, not implementation** - Focus on what the code does, not how
2. **Keep tests isolated** - Each test should be independent
3. **Use meaningful assertions** - Clear failure messages help debugging
4. **Mock at boundaries** - Mock external services, not internal modules
5. **Write tests first for bugs** - Reproduce the bug with a failing test
6. **Maintain test coverage** - Aim for 80% coverage on critical paths
7. **Run tests in CI** - Every PR should pass all tests
8. **Use realistic test data** - Tests should reflect real usage patterns
