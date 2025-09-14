---
id: tanstack-query-state
last_modified: '2025-06-18'
version: '0.2.0'
derived_from: explicit-over-implicit
enforced_by: 'TypeScript compiler, TanStack Query DevTools, ESLint rules, test coverage'
---

# Binding: Implement Type-Safe Server State Management with TanStack Query

Use TanStack Query as the standard solution for all server state management in TypeScript applications. Implement type-safe query patterns with explicit error handling and comprehensive caching strategies.

## Rationale

This binding implements our explicit-over-implicit tenet by making server state management transparent and predictable. Server state is fundamentally different from client state—it's asynchronous, shared across components, and can become stale—requiring specialized management patterns.

TanStack Query provides invalidation strategies, background updates, optimistic updates, and error recovery mechanisms while making state transitions explicit through query states and DevTools.

## Rule Definition

This rule applies to all TypeScript applications that interact with backend APIs. The rule specifically requires:

**Requirements:**
- **Typed Query Functions**: All query functions must have explicit return type annotations
- **Typed Query Keys**: Query keys must use type-safe factory patterns
- **Error Type Definitions**: Explicit error interfaces for all API endpoints
- **Caching Strategy**: Hierarchical query key patterns for efficient invalidation
- **Error Handling**: Granular error states for different failure modes
- **DevTools Integration**: Enabled development tools for debugging

The rule prohibits direct server state management in component state, global stores, or context providers. All server interactions must go through TanStack Query with appropriate typing and error handling.

## Practical Implementation

1. **Type-Safe API Layer**: Define explicit types for all API interactions:
   ```typescript
   interface User {
     id: string;
     email: string;
     name: string;
   }

   interface ApiError {
     code: string;
     message: string;
   }

   async function fetchUserProfile(userId: string): Promise<User> {
     const response = await fetch(`/api/users/${userId}`);

     if (!response.ok) {
       const error: ApiError = await response.json();
       throw new ApiError(error.message, error.code);
     }

     return response.json();
   }
   ```

2. **Query Key Factory**: Type-safe query key patterns:
   ```typescript
   export const queryKeys = {
     users: {
       all: ['users'] as const,
       detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
     },
   } as const;
   ```

3. **Query Hooks**: Observable query patterns:
   ```typescript
   export function useUserProfile(userId: string) {
     return useQuery({
       queryKey: queryKeys.users.detail(userId),
       queryFn: () => fetchUserProfile(userId),
       enabled: !!userId,
       staleTime: 5 * 60 * 1000,
       retry: (failureCount, error) => {
         if (error instanceof ApiError && error.code.startsWith('4')) {
           return false;
         }
         return failureCount < 3;
       },
     });
   }
   ```

4. **Query Client Configuration**: Configure defaults:
   ```typescript
   export const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         staleTime: 2 * 60 * 1000,
         gcTime: 10 * 60 * 1000,
         retry: (failureCount, error) => {
           if (error instanceof ApiError && error.code === 'UNAUTHORIZED') {
             return false;
           }
           return failureCount < 3;
         },
         refetchOnWindowFocus: false,
         refetchOnReconnect: 'always',
       },
     },
   });
   ```


## Examples

```typescript
// ❌ BAD: Server state in component state
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(setUser)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  return <ProfileDisplay user={user} />;
}

// ✅ GOOD: Type-safe TanStack Query
function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, error, isStale } = useUserProfile(userId);

  if (isLoading) return <ProfileSkeleton />;

  if (error) {
    if (error.code === 'USER_NOT_FOUND') {
      return <UserNotFound userId={userId} />;
    }
    return <ErrorMessage error={error} />;
  }

  return (
    <div>
      {isStale && <StaleBanner />}
      <ProfileDisplay user={user} />
    </div>
  );
}
```

## Security Integration

Integrates with security-first development practices:
- **Environment Variables**: All API configuration uses environment variables
- **Error Sanitization**: Production builds sanitize error messages
- **Token Management**: Secure authentication token handling patterns
- **Input Validation**: Type-safe query parameters and response validation

```typescript
// API configuration with environment variables
const apiConfig = {
  baseUrl: process.env.VITE_API_BASE_URL || '',
  timeout: parseInt(process.env.VITE_API_TIMEOUT || '5000'),
};

// Secure query client with auth handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const token = getStoredToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${apiConfig.baseUrl}${queryKey[0]}`, { headers });

        if (!response.ok) {
          if (response.status === 401) {
            clearStoredToken();
            throw new ApiError('UNAUTHORIZED', 'Authentication required');
          }
          throw new ApiError('API_ERROR', `HTTP ${response.status}`);
        }

        return response.json();
      },
    },
  },
});
```
