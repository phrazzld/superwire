---
id: test-data-management
last_modified: '2025-06-15'
version: '0.2.0'
derived_from: testability
enforced_by: 'testing framework configuration, database migration scripts, CI/CD validation'
---

# Binding: Test Data Management

Create systematic approaches for test data creation, lifecycle management, and cleanup automation that ensure test isolation, reproducibility, and realistic scenarios. Design data factories that provide deterministic, reliable test conditions while maintaining test independence.

## Rationale

Reliable test data is foundational to effective testing. Unreliable or poorly managed test data leads to flaky tests, difficult debugging, and false confidence. When test data is well-designed and systematically managed, you create a foundation that enables comprehensive testing with fast feedback loops.

Test data management is like preparing controlled laboratory conditions. Each test requires specific, known data states with proper isolation and cleanup. Random or shared test data creates interdependencies that make tests unreliable and order-dependent.

## Rule Definition

**MUST** use deterministic data generation with consistent seeds for reproducible test runs.

**MUST** ensure complete test isolation with independent data sets that support parallel execution.

**MUST** implement automated data lifecycle management with guaranteed cleanup regardless of test outcomes.

**MUST** create composable data factories with sensible defaults and customization capabilities.

**SHOULD** use in-memory databases for unit tests and containerized databases for integration tests.

**SHOULD** generate business-realistic scenarios while maintaining performance and compliance requirements.

## Core Implementation Patterns

### 1. Factory Pattern Design
Create reusable, composable data factories that build complex object graphs from simple components. Design with type safety and sensible defaults while allowing test-specific customization.

### 2. Lifecycle Automation
Implement systematic setup and cleanup using database transactions, temporary schemas, or containerized environments. Ensure data removal occurs regardless of test success or failure.

### 3. Test Isolation Strategy
Use unique identifiers, separate schemas, or parallel databases to maintain complete test independence. Support concurrent execution without conflicts or shared state issues.

## Implementation Example

```typescript
// ✅ GOOD: Systematic test data management with factories and isolation
// test-data-factory.ts
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

interface Order {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  items: OrderItem[];
}

class TestDataFactory {
  private testId: string;
  private cleanup: (() => Promise<void>)[] = [];
  private idCounter = 0;

  constructor(private seed = 'default-test-seed') {
    // Use seed for deterministic ID generation
    this.testId = `test_${this.hashSeed(seed)}`;
  }

  private hashSeed(seed: string): string {
    // Simple deterministic hash for consistent test IDs
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Composable factory with sensible defaults
  async createUser(overrides: Partial<User> = {}): Promise<User> {
    const uniqueId = `${this.testId}_${++this.idCounter}`;
    const user = {
      id: `user_${uniqueId}`,
      email: `test_${uniqueId}@example.com`,
      name: 'Test User',
      createdAt: new Date('2024-01-01T00:00:00Z'), // Fixed date for determinism
      ...overrides
    };

    await db.users.insert(user);
    this.cleanup.push(() => db.users.delete({ id: user.id }));

    return user;
  }

  // Related data creation with referential integrity
  async createOrder(user: User, overrides: Partial<Order> = {}): Promise<Order> {
    const uniqueId = `${this.testId}_${++this.idCounter}`;
    const order = {
      id: `order_${uniqueId}`,
      userId: user.id,
      amount: 100.00,
      status: 'pending' as const,
      items: [],
      ...overrides
    };

    await db.orders.insert(order);
    this.cleanup.push(() => db.orders.delete({ id: order.id }));

    return order;
  }

  // Automated cleanup guarantees isolation
  async cleanupAll(): Promise<void> {
    // Clean up in reverse order to respect foreign key constraints
    for (const cleanupFn of this.cleanup.reverse()) {
      await cleanupFn();
    }
    this.cleanup = [];
  }
}

// Test framework integration
describe('Order Processing', () => {
  let factory: TestDataFactory;

  beforeEach(() => {
    factory = new TestDataFactory();
  });

  afterEach(async () => {
    await factory.cleanupAll();
  });

  test('should process valid orders', async () => {
    // Deterministic test data creation
    const user = await factory.createUser({ email: 'customer@example.com' });
    const order = await factory.createOrder(user, { amount: 150.00 });

    const result = await orderService.process(order.id);

    expect(result.status).toBe('completed');
    // Test runs in isolation with guaranteed cleanup
  });

  test('concurrent tests remain isolated', async () => {
    // Each test gets independent data
    const user1 = await factory.createUser();
    const user2 = await factory.createUser();

    // No conflicts even when running in parallel
    expect(user1.id).not.toBe(user2.id);
    expect(user1.email).not.toBe(user2.email);
  });
});
```

```typescript
// Database transaction-based isolation alternative
class TransactionalTestData {
  private transaction: DatabaseTransaction;

  async begin(): Promise<void> {
    this.transaction = await db.beginTransaction();
  }

  async createUser(data: Partial<User> = {}): Promise<User> {
    const user = { id: generateId(), ...defaultUserData, ...data };
    await this.transaction.users.insert(user);
    return user;
  }

  async rollback(): Promise<void> {
    if (this.transaction) {
      await this.transaction.rollback();
    }
  }
}

// Usage in tests with automatic rollback
test('with transactional isolation', async () => {
  const testData = new TransactionalTestData();
  await testData.begin();

  try {
    const user = await testData.createUser();
    const result = await userService.activate(user.id);
    expect(result.active).toBe(true);
  } finally {
    await testData.rollback(); // Automatic cleanup
  }
});
```

## Anti-Patterns to Avoid

**❌ Shared Test Data**: Using the same data across multiple tests creates dependencies and race conditions.

**❌ Manual Cleanup**: Relying on manual cleanup that can be forgotten or fail to execute properly.

**❌ Production Data in Tests**: Using real user data in tests violates privacy and creates unpredictable scenarios.

**❌ Hard-coded Test Data**: Static test data that doesn't reflect realistic business scenarios or edge cases.

**❌ No Isolation**: Tests that modify shared state without proper isolation mechanisms.

## Database Testing Strategies

**Unit Level**: Use in-memory databases (SQLite) for fast, isolated unit tests that validate data logic.

**Integration Level**: Use containerized databases (TestContainers) for integration tests requiring real database behavior.

**End-to-End Level**: Use dedicated test databases with proper schema management and data seeding.

## Performance Considerations

**Fast Feedback**: Optimize factory creation for quick test execution while maintaining realism.

**Parallel Execution**: Design data management to support concurrent test runs without conflicts.

**Resource Management**: Properly manage database connections and cleanup to prevent resource leaks.

## Related Standards

- [test-environment-management](../../docs/bindings/core/test-environment-management.md): Defines the infrastructure setup that supports isolated test data management
- [test-pyramid-implementation](../../docs/bindings/core/test-pyramid-implementation.md): Establishes testing strategy that determines appropriate data management approaches
- [automated-quality-gates](../../docs/bindings/core/automated-quality-gates.md): Quality gates that validate test data management practices

## References

- [TestContainers](https://www.testcontainers.org/) - Container-based test isolation
- [Factory Pattern for Testing](https://thoughtbot.com/blog/factory-girl-for-rails-testing)
- [Database Testing Best Practices](https://martinfowler.com/articles/database-testing.html)
