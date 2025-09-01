---
id: integration-first-testing
last_modified: '2025-06-17'
version: '0.2.0'
derived_from: testability
enforced_by: 'test-coverage-tools, code-review, ci-pipeline'
---

# Binding: Integration-First Testing Strategy

Prioritize integration tests as your primary testing investment, following the pragmatic 10/70/20 distribution: 10% end-to-end for critical paths, 70% integration for component interactions, and 20% unit tests for complex algorithms. This "test middle" approach catches more bugs with less maintenance than traditional pyramid strategies.

## Rationale

Most real-world bugs occur at the boundaries between components, not within individual functions. Grug's wisdom teaches that integration tests provide the optimal balance of bug-catching power versus maintenance overhead. They test how your actual system behaves without the fragility of full end-to-end tests or the false confidence of heavily-mocked unit tests.

This approach emerged from practical experience: teams following traditional test pyramids often discover their unit tests pass while the system fails due to integration issues. By inverting the pyramid and focusing on the "test middle," you catch the majority of bugs where they actually occur—at component boundaries and API contracts.

Integration tests also align with simplicity principles by testing behavior over implementation details. When you refactor internal logic, integration tests remain stable, while unit tests often require updates that provide little value.

## Rule Definition

**MUST** maintain pragmatic test distribution targeting 10/70/20 (E2E/Integration/Unit) as strategic guideline.

**MUST** focus integration tests on component boundaries and API contracts:
- Service-to-service communication
- Database interactions through actual repository patterns
- External API integration points
- Core business workflow orchestration

**MUST** write integration tests that use real implementations internally with test doubles only for external systems.

**SHOULD** prefer integration tests over unit tests when the choice provides similar confidence.

**SHOULD** use unit tests primarily for:
- Complex algorithms with multiple edge cases
- Pure functions with mathematical behavior
- Utility functions with clear input/output contracts
- Performance-critical code requiring optimization

## Implementation Strategy

### 1. Integration Test Layer (70% - Primary Investment)

**Focus Areas:**
- API endpoint behavior with real database interactions
- Service orchestration and business process flows
- Repository patterns with actual database connections
- Message handling between system components

**Test Structure:**
```typescript
// ✅ GOOD: Integration test focusing on realistic interactions
describe('Order Processing Integration', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedTestData();
  });

  test('processes complete order workflow', async () => {
    // Test real service with real database
    const orderService = new OrderService(realDatabase, realPaymentService);

    const order = await orderService.createOrder({
      customerId: 'test-customer',
      items: [{ productId: 'product-1', quantity: 2 }]
    });

    expect(order.status).toBe('pending');

    const processedOrder = await orderService.processPayment(order.id);
    expect(processedOrder.status).toBe('paid');

    const shippedOrder = await orderService.fulfillOrder(order.id);
    expect(shippedOrder.status).toBe('shipped');
  });
});
```

### 2. Unit Test Layer (20% - Targeted Coverage)

**Focus Areas:**
- Business logic with complex branching
- Mathematical calculations and algorithms
- Validation functions with multiple rules
- Performance-critical utility functions

**Test Structure:**
```typescript
// ✅ GOOD: Unit test for complex business logic
describe('PricingCalculator - Unit Tests', () => {
  test('applies volume discounts correctly', () => {
    const calculator = new PricingCalculator();

    // Test complex algorithm in isolation
    expect(calculator.calculateDiscount(100, 5)).toBe(0.05);
    expect(calculator.calculateDiscount(500, 10)).toBe(0.15);
    expect(calculator.calculateDiscount(1000, 25)).toBe(0.25);
  });
});
```

### 3. End-to-End Test Layer (10% - Critical Paths Only)

**Focus Areas:**
- Mission-critical user journeys
- Payment processing workflows
- Security-sensitive operations
- Core value proposition validations

## Practical Guidelines

### Writing Effective Integration Tests

**Start with real services:** Use actual database connections, real repository implementations, and genuine service instances. Mock only external systems you don't control (third-party APIs, payment processors).

**Test through public contracts:** Focus on how components communicate through their published interfaces rather than testing internal implementation details.

**Use realistic data scenarios:** Create test data that reflects actual production scenarios, including edge cases that occur at component boundaries.

### When to Choose Unit vs Integration

**Choose Integration Tests When:**
- Testing business workflows that span multiple components
- Verifying database query correctness and performance
- Testing API endpoints with realistic request/response cycles
- Validating configuration and dependency injection

**Choose Unit Tests When:**
- Testing mathematical algorithms with clear inputs/outputs
- Verifying complex conditional logic with many branches
- Testing utility functions that don't depend on external state
- Performance testing isolated computation-heavy functions

### Avoiding Common Anti-Patterns

**❌ AVOID: Over-mocking in integration tests**
```typescript
// BAD: This is a unit test pretending to be integration
const mockDatabase = jest.mock('./database');
const mockPaymentService = jest.mock('./paymentService');
// Testing mocks, not real behavior
```

**✅ PREFER: Real implementations with test doubles for externals only**
```typescript
// GOOD: Real internal services, mock only external dependencies
const testDatabase = createTestDatabase();
const mockExternalPaymentAPI = createMockPaymentGateway();
const orderService = new OrderService(testDatabase, mockExternalPaymentAPI);
```

## Success Metrics

**Bug Detection Effectiveness:**
- 80%+ of bugs caught by integration tests
- Reduced production incidents related to component interaction
- Faster debugging due to realistic test scenarios

**Maintenance Overhead:**
- Test suite execution time under 15 minutes for full suite
- Minimal test updates required during internal refactoring
- High test reliability with low flake rates

**Development Velocity:**
- Developers confident making changes knowing integration tests will catch issues
- Reduced debugging time due to better bug localization
- Faster onboarding as integration tests document actual system behavior

## Related Patterns

**Test Data Management:** Establish reliable test data setup and teardown processes for integration tests. Use factories and builders to create realistic test scenarios.

**Database Testing:** Use transaction rollback or database recreation strategies to ensure test isolation while maintaining realistic data interactions.

**External Service Mocking:** Create consistent test doubles for external APIs that maintain contract fidelity while providing predictable responses.

## Migration Strategy

**For Existing Codebases:**
1. Start by identifying critical business workflows currently covered by fragile E2E tests
2. Replace with focused integration tests that provide same confidence with better reliability
3. Gradually reduce unit test coverage for simple component interactions
4. Maintain unit tests for genuinely complex algorithms and pure functions

**For New Projects:**
1. Begin with integration tests for core business workflows
2. Add unit tests only when integration tests can't provide adequate coverage
3. Implement E2E tests last, focusing on absolute must-not-fail scenarios
