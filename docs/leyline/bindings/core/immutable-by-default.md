---
derived_from: simplicity
enforced_by: linters & code review
id: immutable-by-default
last_modified: '2025-05-14'
version: '0.2.0'
---
# Binding: Treat All Data as Unchangeable by Default

Never modify data after it's created. When you need to update state, create entirely new
data structures instead of changing existing ones. Only allow direct mutation with
explicit justification, such as in critical performance hot paths with measured impact.

## Rationale

Mutable state creates unpredictable changes that are difficult to trace and reason about. Each function becomes a potential modifier of shared state, forcing developers to mentally track all possible changes throughout execution.

Immutable data structures provide unambiguous history of state changes, making debugging and testing dramatically simpler. In complex systems, tracking mutable state across components becomes nearly impossible. Each mutation point multiplies possible system states, creating complexity explosion.

Making immutability the default prevents complexity debt accumulation. The slight verbosity or performance overhead is minimal compared to dramatic improvements in predictability, debuggability, and maintainability.

## Rule Definition

**Default Immutability:** All data immutable unless compelling reason otherwise.
- Function parameters, return values, internal data structures, shared state
- Objects, arrays, collections, domain entities, configuration data

**Permitted Exceptions:**
- Performance-critical code with measurable bottlenecks
- Object initialization before becoming visible
- Private implementation details with immutable public interfaces
- Language-specific idioms requiring mutation

**Exception Requirements:** Document reason, contain scope, keep private, verify with benchmarks

The rule doesn't prohibit all state changes—systems would be useless without them—but
requires that state changes happen through creation of new data structures rather than
modification of existing ones.

## Practical Implementation

**Implementation Patterns:**
```typescript
// Immutable data structures
const user = { name: "Alice", email: "alice@example.com" };
interface User { readonly id: string; readonly name: string; }

// Update patterns
const updatedUser = { ...user, name: "Bob" };
const newItems = [...items, newItem];
```

**Tools:** Immer.js, Immutable.js, Redux Toolkit (JS/TS); Immutables, Vavr (Java)
**Enforcement:** ESLint `no-param-reassign`, `prefer-const`; TypeScript `--strict`

## Examples

**Object Updates:**
```typescript
// ❌ BAD: Mutating objects directly
function updateUserPreferences(user, preferences) {
  user.preferences = { ...user.preferences, ...preferences };
  return user; // Modifies original!
}

// ✅ GOOD: Creating new objects
function updateUserPreferences(user, preferences) {
  return {
    ...user,
    preferences: { ...user.preferences, ...preferences }
  }; // Returns new object
}
```

**Array Operations:**
```javascript
// ❌ BAD: Mutating arrays
function addItem(cart, item) {
  cart.items.push(item);
  cart.total += item.price;
  return cart;
}

// ✅ GOOD: Creating new arrays
function addItem(cart, item) {
  return {
    ...cart,
    items: [...cart.items, item],
    total: cart.total + item.price
  };
}
```

**Method Design:**
```go
// ❌ BAD: Modifying receiver
func (c *Counter) Increment() { c.Value++ }

// ✅ GOOD: Returning new instances
func (c Counter) Increment() Counter {
  return Counter{Value: c.Value + 1}
}
```

## Related Bindings

- [dependency-inversion](../../docs/bindings/core/dependency-inversion.md): Makes code more testable and maintainable
- [hex-domain-purity](../../docs/bindings/core/hex-domain-purity.md): Keeps business logic stable and predictable
- [no-internal-mocking](../../docs/bindings/core/no-internal-mocking.md): Immutable data makes testing easier
