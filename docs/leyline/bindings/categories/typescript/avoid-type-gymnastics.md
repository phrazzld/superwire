---
id: avoid-type-gymnastics
last_modified: '2025-06-17'
version: '0.2.0'
derived_from: simplicity
enforced_by: 'code review, type complexity linting, team guidelines'
---

# Binding: Avoid TypeScript Type Gymnastics

Use TypeScript for developer productivity—autocomplete, basic safety, and refactoring confidence—not as a way to encode complex business logic in the type system. Prefer simple, readable types over clever type gymnastics. Remember that types are deleted at runtime; they serve developers, not the computer.

## Rationale

TypeScript's main benefits are IDE support, catching obvious mistakes, and enabling confident refactoring. These benefits come from basic typing, not complex generic manipulations. Sophisticated types often create more problems—they're difficult to debug, hard for junior developers to understand, and brittle when requirements change. Choose boring, obvious types that make code easier to work with.

## Rule Definition

**MUST** prioritize code readability over type sophistication.

**MUST** use `any` when fighting complex type inference wastes significant development time.

**SHOULD** prefer explicit, simple types over inferred complex types.

**SHOULD** limit generic constraints to essential cases, not theoretical completeness.

**SHOULD** avoid template literal types, conditional types, and mapped types unless they solve specific problems.

## Implementation

**✅ Good: Simple, productive types**
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

function getUserDisplayName(user: User): string {
  return user.name || user.email;
}
```

**❌ Bad: Overly complex types**
```typescript
// Complex mapped type that doesn't add real value
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[] ? DeepReadonlyArray<U>
    : T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
// When you could just use readonly where needed
```

**When to Use `any`:**

✅ Third-party libraries without types
✅ Complex data transformation where typing is harder than logic
✅ Rapid prototyping (add types when logic stabilizes)
❌ Laziness when simple types would work

```typescript
// Good: Unknown third-party library
const weirdLibrary: any = require('some-weird-library');

// Bad: Should be properly typed
function addUser(user: any): any { return database.save(user); }
```

**Prefer Union Types Over Complex Inheritance:**

```typescript
// ✅ Simple union type
type DatabaseConfig =
  | { type: 'postgres'; host: string; port: number; database: string; }
  | { type: 'sqlite'; filename: string; }
  | { type: 'memory'; };

function connectToDatabase(config: DatabaseConfig) {
  switch (config.type) {
    case 'postgres': return connectPostgres(config);
    case 'sqlite': return connectSqlite(config);
    case 'memory': return connectMemory();
  }
}

// ❌ Complex inheritance hierarchy
abstract class DatabaseConfig { abstract type: string; }
class PostgresConfig extends DatabaseConfig { /* ceremony */ }
```

**Use Basic Generics, Avoid Complex Constraints:**

```typescript
// ✅ Simple generic
interface ApiResponse<T> { data: T; status: number; message: string; }
function apiCall<T>(url: string): Promise<ApiResponse<T>> {
  return fetch(url).then(r => r.json());
}

// ❌ Over-constrained generic
interface Repository<T extends { id: string | number }, K extends keyof T> {
  findBy(key: K, value: T[K]): Promise<T[]>;
}

// ✅ Simple alternative
interface SimpleRepository<T> { findBy(key: string, value: any): Promise<T[]>; }
```

**Prefer Explicit Types Over Complex Inference:**

```typescript
// ✅ Clear interfaces
interface CreateUserRequest { name: string; email: string; role: string; }
interface CreateUserResponse { id: string; success: boolean; }

function createUser(request: CreateUserRequest): Promise<CreateUserResponse> {
  // Types are immediately clear to any reader
  return api.post('/users', request);
}
```

**❌ Inferred complexity:**
```typescript
// Relying on complex inference
const createUser = (request: Parameters<typeof api.post>[1]) =>
  api.post('/users', request) as Promise<ReturnType<typeof userCreationHandler>>;
// What are the actual types? Nobody knows without deep investigation
```

## TypeScript Complexity Anti-Patterns

### Common Anti-Patterns

**❌ Template Literal Types:** Encoding routing logic in types instead of runtime validation
**❌ Complex Conditionals:** Nested conditional types when simple functions work better
**❌ Mapped Type Overuse:** Complex transformations better handled at runtime

**✅ Simple Alternatives:** Use basic types and runtime validation for complex logic

## Practical Guidelines

**API Integration:** Start with basic interfaces, add fields as discovered
**Component Props:** Simple prop interfaces with union types for variants
**Data Modeling:** Model only properties you actually access
**Event Handling:** Use discriminated unions for simple event types

## Code Review Red Flags

**🚨 Type requires TypeScript handbook to understand**
**🚨 Error messages longer than the code**
**🚨 More time spent on types than business logic**

## Green Flags

**✅ Autocomplete helps remember APIs**
**✅ Compiler catches real bugs**
**✅ Refactoring is confident and fast**

## Migration Strategy

**Step 1:** Identify slow compilation and complex error messages
**Step 2:** Replace complex generics with simple types
**Step 3:** Use `// @ts-ignore` for stubborn third-party library issues

## Success Metrics

**Development Velocity:**
- Faster TypeScript compilation times
- Reduced time spent debugging type errors
- Quicker onboarding for new team members

**Code Quality:**
- More readable type definitions
- Fewer complex type-related bugs
- Better IDE performance and autocomplete

**Team Satisfaction:**
- Less frustration with type system fights
- More focus on business logic
- Increased confidence in refactoring

## Related Patterns

**Simplicity Above All:** TypeScript types should make code simpler to understand and maintain, not more complex.

**No Any Suppression:** When `any` is the honest answer, use it rather than fighting complex type inference.

**80/20 Solution Patterns:** Focus on the 20% of typing that provides 80% of the benefits (autocomplete, basic safety).
