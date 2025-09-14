---
derived_from: simplicity
id: pure-functions
last_modified: '2025-05-14'
version: '0.2.0'
enforced_by: code review & style guides
---
# Binding: Write Pure Functions, Isolate Side Effects

Structure your code to maximize the use of pure functions that always produce the same output for a given input and have no side effects. When side effects are necessary, isolate them to the boundaries of your application and make them explicit.

## Rationale

This binding implements our simplicity tenet by reducing complexity at its most fundamental level—predictable code execution. When a function is pure, its behavior is entirely determined by its inputs, making it dramatically easier to understand, test, debug, and reason about. Pure functions create islands of certainty in your codebase—components that will behave consistently no matter when or where they're called. This binding also directly supports our testability tenet since pure functions are inherently testable with clearly defined inputs and outputs and no hidden dependencies.

## Rule Definition

**Core Requirements:**

- **Maximize Pure Functions**: The majority of your codebase should consist of pure functions that always return the same output for the same input, have no observable side effects, depend only on their input parameters, and don't perform I/O operations

- **Contain Side Effects**: When side effects are necessary, they should be isolated to application boundaries, made explicit in function signatures, kept separate from core business logic, and minimized in scope

- **Types of Side Effects to Manage**: External I/O (file systems, networks, databases), logging and monitoring, global state modifications, mutable data structure changes, system clock or random number usage

- **Implementation Requirements**: Use clear architectural patterns to separate pure and impure code, make side effects explicit through function signatures and type systems, prefer returning new data over modifying existing data, use dependency injection to make external dependencies explicit

**Limited Exceptions**: Code may deviate from pure functions in clearly defined boundary layers responsible for I/O, when performance concerns are validated with benchmarks, in initialization/bootstrap code that runs once, or when following language-specific idioms.

## Practical Implementation

**Functional Core, Imperative Shell Pattern:**

Structure your application with a "functional core" of pure business logic surrounded by a thin "imperative shell" that handles side effects:

1. **Architectural Structure**: Pure domain at center with side effects at boundaries
2. **Explicit Effects**: Use type systems to clearly identify functions with side effects
3. **Dependency Injection**: Make dependencies explicit by injecting them rather than importing directly
4. **Functional Patterns**: Use map/filter/reduce, function composition, and immutable data structures
5. **Non-Deterministic Isolation**: Separate non-deterministic operations from pure business logic

## Examples

**Comprehensive Pure Function Implementation:**

```typescript
// ❌ BAD: Function with hidden side effects
function sendWelcomeMessage(user) {
  const message = `Welcome, ${user.name}!`;

  // Hidden side effect: logging
  console.log(`Sending message to ${user.email}`);

  // Hidden side effect: API call
  fetch('/api/notifications', {
    method: 'POST',
    body: JSON.stringify({ user: user.id, message })
  });

  // Hidden side effect: modifying the user object
  user.hasWelcomeMessage = true;

  return message;
}

// ✅ GOOD: Separation of pure logic and side effects
// Pure function: creates the message
function createWelcomeMessage(userName: string): string {
  return `Welcome, ${userName}!`;
}

// Pure function: decides which users need welcome messages
function needsWelcomeMessage(user: User): boolean {
  return !user.hasWelcomeMessage;
}

// Pure function: calculates order total
function calculateOrderTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// Pure function: determines discount
function applyDiscount(total: number, loyaltyPoints: number): { newTotal: number; pointsUsed: number } {
  if (loyaltyPoints >= 100) {
    return {
      newTotal: total * 0.9,
      pointsUsed: 100
    };
  }
  return {
    newTotal: total,
    pointsUsed: 0
  };
}

// Pure function: creates order object
function createOrder(userId: string, items: Item[], total: number, date: Date): Order {
  return {
    userId,
    items,
    total,
    date
  };
}

// Type system makes side effects explicit
type Effect<T> = () => Promise<T>;

function saveOrder(order: Order): Effect<void> {
  return async () => {
    await database.orders.insert(order);
    await logger.info(`Order ${order.id} saved`);
  };
}

// Imperative shell: handles side effects
async function sendWelcomeMessage(user: User): Promise<{ sent: boolean; user?: User; reason?: string }> {
  // Only proceed if needed (pure decision)
  if (!needsWelcomeMessage(user)) {
    return { sent: false, reason: 'already-welcomed' };
  }

  // Create message (pure transformation)
  const message = createWelcomeMessage(user.name);

  // Explicit side effects
  try {
    await logger.info(`Sending welcome to ${user.email}`);
    await notificationService.send(user.id, message);

    // Return new user state rather than modifying
    return {
      sent: true,
      user: { ...user, hasWelcomeMessage: true }
    };
  } catch (error) {
    await logger.error('Failed to send welcome', { userId: user.id, error });
    return { sent: false, reason: 'send-failed' };
  }
}

// Impure function that orchestrates the process
async function processOrder(items: Item[], userId: string): Promise<{ success: boolean; order?: Order; error?: any }> {
  // Load data
  const user = await db.users.findOne({ id: userId });

  // Pure business logic
  const total = calculateOrderTotal(items);
  const { newTotal, pointsUsed } = applyDiscount(total, user.loyaltyPoints);
  const order = createOrder(userId, items, newTotal, new Date());

  // Side effects isolated and explicit
  try {
    // Update inventory in database
    await Promise.all(items.map(item =>
      db.inventory.updateStock(item.id, -item.quantity)
    ));

    // Update user loyalty points if needed
    if (pointsUsed > 0) {
      await db.users.updateLoyaltyPoints(userId, -pointsUsed);
    }

    // Save order
    await db.orders.insert(order);

    // Send confirmation
    await emailService.sendOrderConfirmation(user.email, order);

    return { success: true, order };
  } catch (error) {
    await logger.error('Order processing failed', { userId, error });
    return { success: false, error };
  }
}
```

**Functional Programming Patterns:**

```javascript
// Function composition and currying
const discount = rate => price => price * (1 - rate);
const applyTax = rate => price => price * (1 + rate);

// Create a pipeline of transformations
const computeFinalPrice = (discountRate, taxRate) => {
  const applyDiscount = discount(discountRate);
  const addTax = applyTax(taxRate);

  return price => addTax(applyDiscount(price));
};

// Usage
const finalPrice = computeFinalPrice(0.1, 0.08)(100);
```

**Dependency Injection for Pure Functions:**

```python
# ❌ BAD: Hidden dependencies
def get_user_preferences(user_id):
    from database import db
    return db.users.find_one({"id": user_id}).get("preferences", {})

# ✅ GOOD: Explicit dependency injection
def get_user_preferences(user_id, db_client):
    return db_client.users.find_one({"id": user_id}).get("preferences", {})

# Usage in the shell
def preferences_controller(user_id):
    from database import get_db_client
    db_client = get_db_client()
    return get_user_preferences(user_id, db_client)
```

**Non-Deterministic Operation Isolation:**

```javascript
// ❌ BAD: Non-deterministic function
function createUser(name, email) {
  return {
    id: Math.random().toString(36).substring(2),
    name,
    email,
    createdAt: new Date()
  };
}

// ✅ GOOD: Pure function with injected non-determinism
function createUser(name, email, id, timestamp) {
  return {
    id,
    name,
    email,
    createdAt: timestamp
  };
}

// The shell provides the non-deterministic values
function createUserController(name, email) {
  const id = generateId();
  const timestamp = new Date().toISOString();
  return createUser(name, email, id, timestamp);
}
```

## Related Bindings

- [immutable-by-default](../../docs/bindings/core/immutable-by-default.md): Pure functions and immutability work together to create predictable systems where data flows through transformations without unexpected mutations
- [dependency-inversion](../../docs/bindings/core/dependency-inversion.md): Pure functions support dependency inversion by making dependencies explicit and creating naturally decoupled components
- [hex-domain-purity](../../docs/bindings/core/hex-domain-purity.md): The domain layer in hexagonal architecture should consist primarily of pure functions implementing business rules
- [no-internal-mocking](../../docs/bindings/core/no-internal-mocking.md): Pure functions dramatically reduce the need for mocking in tests by making code naturally testable without complex test doubles
