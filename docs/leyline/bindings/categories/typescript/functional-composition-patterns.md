---
id: functional-composition-patterns
last_modified: '2025-06-03'
version: '0.2.0'
derived_from: dry-dont-repeat-yourself
enforced_by: 'TypeScript compiler, functional programming libraries, code review'
---
# Binding: Eliminate Knowledge Duplication Through TypeScript Functional Composition

Use TypeScript's type system and functional programming patterns to create reusable, composable logic that eliminates duplication while maintaining type safety. Build libraries of pure functions, higher-order functions, and generic utilities that combine to solve complex problems without repeating implementation patterns.

## Rule Definition

Functional composition patterns must establish:
- **Pure Function Design**: Functions without side effects returning consistent outputs
- **Higher-Order Function Utilities**: Functions that take or return other functions for behavior composition
- **Type-Safe Function Composition**: TypeScript generics maintaining type safety throughout composition chains
- **Monadic Error Handling**: Result/Option types for functional error handling
- **Generic Utility Libraries**: Strongly-typed utilities working across data types

**Core Patterns:** Function composition (compose, pipe), higher-order functions (map, filter, reduce), monadic operations (Result, Option types), and generic constraint utilities.

## Implementation

1. **Core Composition Utilities**:

   ```typescript
   // Pipe and compose functions
   export const pipe = <T>(...fns: Array<(arg: T) => T>) => (value: T): T =>
     fns.reduce((acc, fn) => fn(acc), value);

   // Type-safe property utilities
   export const prop = <T, K extends keyof T>(key: K) => (obj: T): T[K] => obj[key];
   export const pick = <T, K extends keyof T>(keys: K[]) => (obj: T): Pick<T, K> =>
     keys.reduce((result, key) => ({ ...result, [key]: obj[key] }), {} as Pick<T, K>);

   // Usage
   const getActiveUsersByDept = pipe(
     (users: User[]) => users.filter(user => user.active),
     groupBy(user => user.department)
   );
   ```

2. **Result Type for Error Handling**:

   ```typescript
   export type Result<T, E = Error> = Success<T> | Failure<E>;

   interface Success<T> { readonly success: true; readonly data: T; }
   interface Failure<E> { readonly success: false; readonly error: E; }

   export const success = <T>(data: T): Success<T> => ({ success: true, data });
   export const failure = <E>(error: E): Failure<E> => ({ success: false, error });

   export const map = <T, U, E>(fn: (value: T) => U) => (result: Result<T, E>): Result<U, E> =>
     result.success ? success(fn(result.data)) : result;

   // Usage
   const validateEmail = (email: string): Result<string, string> =>
     email.includes('@') ? success(email) : failure('Invalid email');
   ```

3. **Higher-Order Function Combinators**:

   ```typescript
   export const withRetry = <T extends unknown[], R>(maxAttempts: number, delay = 1000) =>
     (fn: (...args: T) => Promise<R>) => async (...args: T): Promise<R> => {
       for (let attempt = 1; attempt <= maxAttempts; attempt++) {
         try { return await fn(...args); }
         catch (error) {
           if (attempt === maxAttempts) throw error;
           await new Promise(resolve => setTimeout(resolve, delay * attempt));
         }
       }
       throw new Error('Max attempts reached');
     };

   export const withTimeout = <T extends unknown[], R>(timeoutMs: number) =>
     (fn: (...args: T) => Promise<R>) => (...args: T): Promise<R> =>
       Promise.race([fn(...args), new Promise<never>((_, reject) =>
         setTimeout(() => reject(new Error(`Timeout: ${timeoutMs}ms`)), timeoutMs)
       )]);

   // Usage
   const fetchUser = pipe(
     withRetry(3, 1000),
     withTimeout(5000)
   )((id: string) => fetch(`/users/${id}`));
   ```

4. **Data Pipeline Utilities**:

   ```typescript
   export const filter = <T>(predicate: (item: T) => boolean) => (array: T[]): T[] =>
     array.filter(predicate);
   export const sort = <T>(compareFn: (a: T, b: T) => number) => (array: T[]): T[] =>
     [...array].sort(compareFn);
   export const take = (count: number) => <T>(array: T[]): T[] => array.slice(0, count);

   // Usage
   const processOrders = pipe(
     filter((order: Order) => order.status !== 'cancelled'),
     sort((a: Order, b: Order) => b.total - a.total),
     take(10)
   );
   ```

## Examples

**❌ BAD: Duplicated validation logic**
```typescript
function validateUserRegistration(data: any): string[] {
  const errors: string[] = [];
  if (!data.email?.includes?.('@')) errors.push('Invalid email');
  if (!data.password || data.password.length < 8) errors.push('Password too short');
  return errors;
}

function validateUserUpdate(data: any): string[] {
  const errors: string[] = [];
  // Same validation logic duplicated
  if (data.email && !data.email.includes('@')) errors.push('Invalid email');
  if (data.password && data.password.length < 8) errors.push('Password too short');
  return errors;
}
```

**✅ GOOD: Composable validation functions**
```typescript
const validateEmail = (email: unknown): Result<string, string> =>
  typeof email === 'string' && email.includes('@')
    ? success(email)
    : failure('Invalid email');

const validatePassword = (password: unknown): Result<string, string> =>
  typeof password === 'string' && password.length >= 8
    ? success(password)
    : failure('Password too short');

// Compose validators - single source of truth
const validateUser = (data: any) => {
  const emailResult = validateEmail(data.email);
  const passwordResult = validatePassword(data.password);
  return combineResults(emailResult, passwordResult);
};
```

**❌ BAD: Duplicated async retry logic**
```typescript
class UserService {
  async fetchUser(id: string): Promise<User> {
    // Retry logic duplicated across methods
    for (let i = 0; i < 3; i++) {
      try { return await fetch(`/users/${id}`).then(r => r.json()); }
      catch (e) { if (i === 2) throw e; await delay(1000); }
    }
  }
  // Same pattern repeated in updateUser, deleteUser...
}
```

**✅ GOOD: Composed utilities eliminate duplication**
```typescript
// Reusable higher-order functions
const httpGet = pipe(withRetry(3), withTimeout(5000))(
  (url: string) => fetch(url).then(r => r.json())
);

class UserService {
  fetchUser = (id: string) => httpGet(`/users/${id}`);
  // Clean, focused methods using composed utilities
}
```

## Related Bindings

- [extract-common-logic](../../core/extract-common-logic.md): Functional composition extracts common logic into reusable utilities
- [no-any](no-any.md): Type-safe composition requires avoiding `any` types for compile-time guarantees
- [component-isolation](../../core/component-isolation.md): Functional composition supports isolation through reusable logic
- [dry-dont-repeat-yourself](../../tenets/dry-dont-repeat-yourself.md): Implements DRY through single sources of truth
