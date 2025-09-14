---
id: test-pyramid-implementation
last_modified: '2025-06-15'
version: '0.2.0'
derived_from: testability
enforced_by: 'testing framework configuration, code review, CI/CD validation'
---

# Binding: Test Pyramid Implementation

Structure your testing strategy using the test pyramid pattern with a strategic 70/20/10 distribution: 70% unit tests for fast feedback, 20% integration tests for component interaction verification, and 10% end-to-end tests for critical user journey validation.

## Rationale

The test pyramid creates a systematic approach to test architecture that maximizes both confidence and development velocity. The pyramid shape represents both cost and execution time—the wider base of unit tests runs in milliseconds, providing instant feedback, while narrower layers verify integration and user workflows at higher cost.

This distribution catches most defects through fast, focused unit tests, uses integration tests to verify component interactions, and employs end-to-end tests sparingly for critical user experiences. The pyramid forces you to design testable architecture by making testing difficulties visible as design problems.

## Rule Definition

**MUST** maintain the 70/20/10 distribution as a strategic guideline for test allocation.

**MUST** establish strict performance requirements:
- Unit tests: <100ms per test, entire suite <5 minutes
- Integration tests: <5 seconds per test, suite <15 minutes
- End-to-end tests: <30 seconds per test, critical suite <30 minutes

**MUST** ensure test independence with no shared state between tests and ability to run in any order.

**MUST** define clear layer boundaries:
- Unit: Individual components in isolation, mock external dependencies only
- Integration: Component interactions, test implementations for external systems
- End-to-end: Complete user workflows through full system stack

**SHOULD** run faster tests first, escalating to slower tests only when necessary.

## Implementation Strategy

### 1. Unit Test Layer (70%)
Focus on business logic, algorithms, and complex functions. Structure components for isolation without complex setup. Create focused tests that verify specific behaviors and edge cases using data-driven approaches for multiple scenarios.

### 2. Integration Test Layer (20%)
Verify components interact correctly through public interfaces. Test contracts between components rather than internal logic. Use real internal components with test implementations for external dependencies.

### 3. End-to-End Test Layer (10%)
Cover only the most critical user journeys. Design for resilience to minor UI changes by focusing on business outcomes. Maintain a small, focused suite for high confidence without maintenance burden.

## Implementation Example

```typescript
// ✅ GOOD: Proper test pyramid distribution
// Unit Tests (70%) - Fast, isolated, comprehensive coverage

describe('OrderCalculator - Unit Tests', () => {
  test('calculates total with tax correctly', () => {
    const calculator = new OrderCalculator({ taxRate: 0.08 });

    const result = calculator.calculateTotal([
      { price: 100, quantity: 2 },
      { price: 50, quantity: 1 }
    ]);

    expect(result.subtotal).toBe(250);
    expect(result.tax).toBe(20);
    expect(result.total).toBe(270);
  });

  test('handles empty orders', () => {
    const calculator = new OrderCalculator({ taxRate: 0.08 });
    const result = calculator.calculateTotal([]);

    expect(result.total).toBe(0);
  });

  test('applies discount rules correctly', () => {
    const calculator = new OrderCalculator({ taxRate: 0.08 });

    const result = calculator.calculateTotal(
      [{ price: 100, quantity: 5 }],
      { type: 'percentage', value: 10 }
    );

    expect(result.subtotal).toBe(450); // 500 - 10%
    expect(result.total).toBe(486); // 450 + 8% tax
  });
});

// Integration Tests (20%) - Component interactions

describe('OrderService - Integration Tests', () => {
  let orderService: OrderService;
  let mockPaymentGateway: PaymentGateway;

  beforeEach(() => {
    mockPaymentGateway = new MockPaymentGateway();
    orderService = new OrderService(mockPaymentGateway);
  });

  test('processes order through complete workflow', async () => {
    const orderData = {
      customerId: 'customer-123',
      items: [{ productId: 'prod-1', quantity: 2, price: 50 }]
    };

    const result = await orderService.processOrder(orderData);

    expect(result.status).toBe('completed');
    expect(result.totalAmount).toBe(108); // 100 + 8% tax
    expect(mockPaymentGateway.getLastCharge().amount).toBe(108);
  });

  test('handles payment failures gracefully', async () => {
    mockPaymentGateway.simulateFailure('insufficient_funds');

    const orderData = {
      customerId: 'customer-123',
      items: [{ productId: 'prod-1', quantity: 1, price: 100 }]
    };

    const result = await orderService.processOrder(orderData);

    expect(result.status).toBe('payment_failed');
    expect(result.error).toBe('insufficient_funds');
  });
});

// End-to-End Tests (10%) - Critical user journeys only

describe('Order Flow - E2E Tests', () => {
  test('customer can complete purchase of multiple items', async () => {
    // Test critical path: browse → add to cart → checkout → payment
    await page.goto('/products');

    // Add items to cart
    await page.click('[data-testid="product-1"] .add-to-cart');
    await page.click('[data-testid="product-2"] .add-to-cart');

    // Proceed to checkout
    await page.click('[data-testid="cart-icon"]');
    await page.click('[data-testid="checkout-button"]');

    // Complete purchase
    await page.fill('[data-testid="email"]', 'customer@example.com');
    await page.fill('[data-testid="card-number"]', '4111111111111111');
    await page.click('[data-testid="place-order"]');

    // Verify success
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-number"]')).toContainText(/ORDER-\d+/);
  });
});
```

## Test Distribution Monitoring

Track and maintain pyramid health with these metrics:

**Distribution Ratio:**
- Monitor actual test counts vs 70/20/10 target
- Alert when ratios drift significantly (>10% variance)

**Execution Performance:**
- Track test execution times by layer
- Identify tests migrating to wrong layers due to performance

**Feedback Quality:**
- Measure time from code change to test feedback
- Monitor test failure rates and diagnostic quality

## Anti-Patterns to Avoid

**❌ Inverted Pyramid**: Having more end-to-end tests than unit tests creates slow feedback and brittle test suites.

**❌ Testing Implementation Details**: Unit tests that break when refactoring internal implementation without changing behavior.

**❌ Integration Test Overuse**: Using integration tests for scenarios that could be covered by faster unit tests.

**❌ Brittle E2E Tests**: End-to-end tests that fail due to minor UI changes rather than broken functionality.

**❌ Shared Test State**: Tests that depend on execution order or shared data between test runs.

## Performance Optimization

**Parallel Execution**: Run tests in parallel within each layer, starting with unit tests for immediate feedback.

**Test Categorization**: Enable developers to run subsets during development while CI runs comprehensive suites.

**Smart Test Selection**: Run tests affected by code changes first, followed by full suite validation.

**Resource Management**: Use in-memory databases and mock services to minimize external dependencies in lower layers.

## Related Standards

- [test-data-management](../../docs/bindings/core/test-data-management.md): Provides data creation strategies that support pyramid isolation requirements
- [test-environment-management](../../docs/bindings/core/test-environment-management.md): Defines infrastructure supporting different test layers
- [automated-quality-gates](../../docs/bindings/core/automated-quality-gates.md): Quality gates that enforce pyramid distribution and performance requirements

## References

- [Test Pyramid - Martin Fowler](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Testing Strategies in Microservices](https://martinfowler.com/articles/microservice-testing/)
- [The Testing Pyramid: How to Structure Your Test Suite](https://semaphoreci.com/blog/testing-pyramid)
