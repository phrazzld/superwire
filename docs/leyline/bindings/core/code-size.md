---
id: code-size
last_modified: '2025-06-02'
version: '0.2.0'
derived_from: simplicity
enforced_by: 'Linting tools, code review standards, code quality metrics'
---

# Binding: Maintain Reasonable Code Size Limits

Keep code units small and focused. Large files, functions, and classes are harder to understand, test, and maintain.

## Rationale

Code size directly correlates with cognitive load. A 1000-line file is like a novel without chapters - overwhelming and hard to navigate. Small, focused code units are like well-organized drawers: easy to find what you need, easy to add new items, easy to reorganize. When code grows beyond reasonable limits, it becomes a breeding ground for bugs and a barrier to understanding.

## Rule Definition

**Required Size Limits:**
- Files: ≤400 lines (excluding imports/comments)
- Functions: ≤50 lines
- Classes: ≤300 lines
- Methods: ≤30 lines
- Cyclomatic complexity: ≤10
- Nested blocks: ≤4 levels

**Prohibited:**
- God objects/classes doing everything
- Kitchen sink modules with unrelated functionality
- Functions with multiple responsibilities
- Deeply nested code (arrow anti-pattern)
- Files mixing multiple concerns

## Implementation Patterns

### File Organization
```typescript
// ❌ Bad: user-manager.ts (1000+ lines)
// Everything about users in one massive file

// ✅ Good: Split by responsibility
// user-service.ts (business logic)
// user-repository.ts (data access)
// user-validator.ts (validation rules)
// user-types.ts (interfaces/types)
```

### Function Decomposition
```typescript
// ❌ Bad: 100-line function
async function processOrder(order: Order) {
  // validation logic (20 lines)
  // inventory check (20 lines)
  // payment processing (30 lines)
  // shipping calculation (20 lines)
  // notification sending (10 lines)
}

// ✅ Good: Composed of small functions
async function processOrder(order: Order) {
  validateOrder(order)
  await checkInventory(order.items)
  const payment = await processPayment(order)
  const shipping = calculateShipping(order)
  await notifyCustomer(order, payment, shipping)
  return { payment, shipping }
}
```

### Class Responsibilities
```typescript
// ❌ Bad: God class
class UserManager {
  authenticate() { }
  validateEmail() { }
  saveToDatabase() { }
  sendEmail() { }
  generateReport() { }
  exportToCSV() { }
  // ... 50 more methods
}

// ✅ Good: Single responsibility
class UserAuthService {
  authenticate() { }
  validateCredentials() { }
}

class UserRepository {
  save() { }
  find() { }
}
```

## Validation

- [ ] ESLint max-lines rule enforced
- [ ] Function complexity analyzer in CI
- [ ] Regular refactoring of growing code
- [ ] Code review flags large additions
- [ ] Metrics dashboard tracks code size trends

## Examples

### Good: Focused Module
```typescript
// date-formatter.ts (50 lines)
export function formatDate(date: Date, format: string): string {
  // Single, clear purpose
}

export function parseDate(input: string): Date {
  // Related functionality
}
```

### Bad: Kitchen Sink Module
```typescript
// utils.ts (2000 lines)
export function formatDate() { }
export function validateEmail() { }
export function calculateTax() { }
export function renderChart() { }
// Unrelated utilities dumped together
```

## Enforcement

```json
// .eslintrc.json
{
  "rules": {
    "max-lines": ["error", { "max": 400 }],
    "max-lines-per-function": ["error", { "max": 50 }],
    "max-depth": ["error", 4],
    "complexity": ["error", 10]
  }
}
```

## Tools & Techniques

- **Static Analysis**: ESLint, SonarQube, CodeClimate
- **Refactoring**: Extract method/class/module patterns
- **Metrics**: Track size trends over time
- **Automation**: Pre-commit hooks blocking large files

## Related Bindings

- [modularity](../tenets/modularity.md): Small modules with clear boundaries
- [single-responsibility](single-responsibility.md): One reason to change
- [avoid-premature-abstraction](avoid-premature-abstraction.md): Don't over-engineer small code
