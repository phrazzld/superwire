---
derived_from: simplicity
id: async-patterns
last_modified: '2025-05-14'
version: '0.2.0'
enforced_by: code review & style guides
---
# Binding: Structure TypeScript Async Code with Best Practices

Use async/await for all asynchronous operations in TypeScript, with proper error
handling, cancellation patterns, and explicit typing. Asynchronous code must be
structured for readability, testability, and robustness, avoiding common pitfalls like
unhandled promises, excessive nesting, and missing error management.

## Rationale

This binding implements our simplicity tenet by establishing clear patterns for asynchronous code flow in TypeScript. Async programming introduces temporal coupling, error propagation challenges, and timing-dependent bugs. Clear async patterns create predictability and prevent unhandled promises, race conditions, and missing error context.

## Rule Definition

This binding establishes clear requirements for async code patterns in TypeScript:

**Core Requirements:**

- **Async/Await**: Use `async`/`await` syntax for all asynchronous operations with explicit `Promise<T>` return types
- **Error Handling**: Wrap `await` expressions in `try/catch` blocks and propagate errors with context
- **Cancellation**: Implement cancellation using `AbortController` for long-running operations
- **Concurrency**: Use `Promise.all()`, `Promise.allSettled()`, or `Promise.race()` appropriately for concurrent operations
- **Structure**: Avoid deeply nested async code; break complex workflows into smaller functions
- **Testing**: Ensure all tests properly await async operations and handle Promise resolution/rejection

## Practical Implementation

**Core Async Function Pattern with Error Handling:**

```typescript
// ✅ Comprehensive async pattern demonstrating all key principles
interface CancellableOperation<T> {
  promise: Promise<T>;
  cancel: () => void;
}

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Main async pattern with error handling, cancellation, and timeout
export function fetchWithSafety<T>(
  url: string,
  options?: RequestInit,
  timeoutMs = 5000
): CancellableOperation<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const promise = fetch(url, { ...options, signal: controller.signal })
    .then(async response => {
      if (!response.ok) {
        throw new ApiError(
          `Request failed: ${response.statusText}`,
          response.status
        );
      }
      return await response.json() as T;
    })
    .catch(error => {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Network error: ${error.message}`,
        500,
        error
      );
    })
    .finally(() => clearTimeout(timeoutId));

  return {
    promise,
    cancel: () => {
      clearTimeout(timeoutId);
      controller.abort();
    }
  };
}

// Concurrent operations with proper error handling
async function loadDashboardData(userId: string): Promise<DashboardData> {
  try {
    // Parallel execution with Promise.all
    const [userData, ordersData, notificationsData] = await Promise.all([
      fetchWithSafety<UserData>(`/api/users/${userId}`).promise,
      fetchWithSafety<OrderData[]>(`/api/users/${userId}/orders`).promise,
      fetchWithSafety<Notification[]>(`/api/users/${userId}/notifications`).promise
    ]);

    return { user: userData, orders: ordersData, notifications: notificationsData };
  } catch (error) {
    throw new ApiError(
      `Failed to load dashboard for user ${userId}`,
      500,
      error instanceof Error ? error : undefined
    );
  }
}

// Resilient operations with Promise.allSettled
async function loadDashboardDataResilient(userId: string): Promise<Partial<DashboardData>> {
  const results = await Promise.allSettled([
    fetchWithSafety<UserData>(`/api/users/${userId}`).promise,
    fetchWithSafety<OrderData[]>(`/api/users/${userId}/orders`).promise,
    fetchWithSafety<Notification[]>(`/api/users/${userId}/notifications`).promise
  ]);

  return {
    user: results[0].status === 'fulfilled' ? results[0].value : null,
    orders: results[1].status === 'fulfilled' ? results[1].value : [],
    notifications: results[2].status === 'fulfilled' ? results[2].value : []
  };
}

// Concurrency control for processing large datasets
async function processItemsConcurrently<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  concurrencyLimit = 5
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const promise = processFn(items[i]).then(result => {
      results[i] = result;
    });

    executing.push(promise);

    if (executing.length >= concurrencyLimit) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }

}
```

## Examples

**❌ BAD: Callback hell, unhandled promises**
```typescript
function loadUserData(userId, callback) {
  fetchUser(userId, (userError, user) => {
    if (userError) return callback(userError, null);
    fetchOrders(user.id, (ordersError, orders) => {
      callback(ordersError, { user, orders }); // Nested callbacks
    });
  });
}

// Unhandled promise
fetch('/api/data').then(response => response.json());
```

**✅ GOOD: Structured async with proper error handling**
```typescript
async function loadUserData(userId: string): Promise<UserWithOrders> {
  try {
    const user = await fetchUser(userId);
    const orders = await fetchOrders(user.id);
    const details = await Promise.all(
      orders.map(order => fetchOrderDetails(order.id))
    );
    return { user, orders: orders.map((order, i) => ({ ...order, details: details[i] })) };
  } catch (error) {
    throw new ApiError(`Failed to fetch user ${userId}`, 500, error as Error);
  }
}

// Proper usage
try {
  const userData = await loadUserData('123');
  displayData(userData);
} catch (error) {
  handleError(error);
}
```

## Related Bindings

- [simplicity](../../tenets/simplicity.md): Well-structured async code reduces complexity of async operations
- [no-any](no-any.md): Proper typing with `Promise<T>` instead of `Promise<any>` creates robust code
- [module-organization](module-organization.md): Clear module boundaries make async operations more manageable
- [testability](../../tenets/testability.md): Well-structured async patterns make tests more reliable
