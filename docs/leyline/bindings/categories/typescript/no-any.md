---
derived_from: explicit-over-implicit
enforced_by: eslint("@typescript-eslint/no-explicit-any") & tsconfig("noImplicitAny")
id: no-any
last_modified: '2025-05-14'
version: '0.2.0'
---
# Binding: Make Types Explicit, Never Use `any`

Never use the `any` type in TypeScript. The `any` type defeats TypeScript's safety mechanisms and undermines the compiler's ability to catch errors. Instead, always create proper type definitions that accurately describe your data structures and API contracts.

## Rationale

Each `any` type creates a blind spot where TypeScript can't provide guidance, intellisense help, or error checking. These blind spots spread outward as untyped values flow through your system, eventually affecting parts of your code that you thought were safe.

This binding implements our explicit-over-implicit tenet by requiring you to clearly express types rather than hiding them behind an escape hatch.

## Rule Definition

The `any` type opts out of type checking. When you use `any`:
- Values can be assigned to any other type without checking
- Any property can be accessed, regardless of existence
- Any method can be called, regardless of definition
- Type errors are only discovered at runtime, if at all

This binding prohibits all uses of `any`, including:
- Explicit type annotations (`let x: any`)
- Type assertions to `any` (`someValue as any`)
- Generic type parameters using `any` (`Array<any>`)
- Implicit `any` from disabled configuration

Instead, use:
- Concrete types (`string`, `number`, custom interfaces)
- Union types (`string | number`) for multiple possible types
- Generic types (`Array<T>`, `Map<K, V>`) for collections
- `unknown` when you need a top type with safety

## Practical Implementation

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

### ESLint Configuration

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

### Alternative Approaches

**Use `unknown` for uncertain types:**
```typescript
// Instead of:
function process(data: any): void { /* ... */ }

// Use:
function process(data: unknown): void {
  if (typeof data === 'string') {
    console.log(data.toUpperCase());
  } else if (Array.isArray(data)) {
    data.forEach(item => console.log(item));
  }
}
```

**Create proper interfaces:**
```typescript
// Instead of:
function processUser(user: any): void { /* ... */ }

// Use:
interface User {
  id: string;
  name: string;
  email?: string;
}

function processUser(user: User): void { /* ... */ }
```

**Use union types:**
```typescript
// Instead of:
function getLength(value: any): number { /* ... */ }

// Use:
function getLength(value: string | Array<unknown>): number {
  return value.length;
}
```

**Use generics for flexibility:**
```typescript
// Instead of:
function getProperty(obj: any, key: string): any { /* ... */ }

// Use:
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

**Handle untyped libraries:**
```typescript
// Create types:
declare module 'untyped-library' {
  export function someFunction(): SomeReturnType;
}

// Or use minimal type assertions:
import * as untyped from 'untyped-library';
interface SomeReturnType { id: string; value: number; }
const result = untyped.someFunction() as SomeReturnType;
```

## Examples

```typescript
// ❌ BAD: Using 'any' creates type holes
function processData(data: any): any {
  return data.value * 2; // No type checking!
}
const result = processData("not an object"); // Runtime error

// ✅ GOOD: Using proper types
interface DataWithValue { value: number; }
function processData(data: DataWithValue): number {
  return data.value * 2; // Type safe!
}
// const result = processData("not an object"); // Compile error!
```

```typescript
// ❌ BAD: Using 'any' for API responses
async function fetchUserData(): Promise<any> {
  const response = await fetch('/api/user');
  return response.json();
}
const user = await fetchUserData();
console.log(user.nmae); // Typo won't be caught

// ✅ GOOD: Using interfaces
interface User { id: string; name: string; email: string; }
async function fetchUserData(): Promise<User> {
  const response = await fetch('/api/user');
  return response.json() as User;
}
const user = await fetchUserData();
console.log(user.nmae); // TypeScript error: Did you mean 'name'?
```

## Real-World Impact

With `any`, typos cause silent failures:
```typescript
function processUserInput(input: any) {
  if (input.isValid) saveToDatabase(input.userData);
}
processUserInput({ isvalid: true, userData: { name: "User" } }); // Silent failure!

// With proper typing:
interface UserInput {
  isValid: boolean;
  userData: { name: string };
}
function processUserInput(input: UserInput) {
  if (input.isValid) saveToDatabase(input.userData);
}
processUserInput({ isvalid: true, userData: { name: "User" } }); // Compile error!
```

## Key Benefits

- **Better error detection** — Catch type errors at compile time
- **Improved IDE support** — Accurate autocomplete and documentation
- **Self-documenting code** — Types serve as live documentation
- **Safer refactoring** — Compiler flags affected areas
- **Fewer runtime bugs** — Many errors become impossible

## Related Bindings

- [external-configuration](../../core/external-configuration.md) - Type safety extends to configuration
- [immutable-by-default](../../core/immutable-by-default.md) - Type safety works best with immutable data
- [no-lint-suppression](../../core/no-lint-suppression.md) - Enforces no suppression of type errors
- [hex-domain-purity](../../core/hex-domain-purity.md) - Well-typed domain code ensures valid data
