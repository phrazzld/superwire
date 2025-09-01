---
derived_from: testability
enforced_by: code review & linters
id: no-internal-mocking
last_modified: '2025-05-14'
version: '0.2.0'
---
# Binding: Mock External Systems Only, Never Internal Components

Never mock, stub, or fake components that live within your application's boundaries.
When writing tests, you must use real implementations of all internal classes,
functions, interfaces, and services. Only create test doubles for dependencies that
cross true system boundaries, such as databases, APIs, file systems, or other external
services.

## Rationale

This binding implements our testability tenet by ensuring tests verify real system behavior rather than mock behavior. Internal mocking creates dangerous gaps between tests and reality—tests pass while actual systems fail. Mocked tests also break during refactoring because they're coupled to implementation details rather than observable behavior. Using real internal components ensures tests remain valid through refactoring and accurately detect regressions.

## Rule Definition

**Core Requirements:**

- **Never Mock Internal Components**: No mocks for classes, functions, interfaces, services, or utilities within your application boundary
- **Only Mock External Dependencies**: Mock only components that cross system boundaries (databases, APIs, file systems, message brokers, external services)
- **Clear Boundaries**: "Internal" means code you own and can change; "External" means systems outside your control
- **Limited Exceptions**: Only for impractical edge cases, slow components (>100ms), or UI framework interactions

**Key Distinctions:**
- Application boundary defines internal vs external, not module boundaries
- Microservices in your ecosystem are considered external
- Third-party libraries are internal unless they access external resources

## Practical Implementation

**Testable Architecture Without Internal Mocking:**

```typescript
// 1. Dependency Injection for External Boundaries
interface PaymentGateway {
  processPayment(order: Order): Promise<PaymentResult>;
}

class OrderService {
  constructor(
    private readonly paymentGateway: PaymentGateway,  // External dependency
    private readonly validator: OrderValidator,       // Internal component
    private readonly calculator: PriceCalculator      // Internal component
  ) {}

  async processOrder(order: Order): Promise<OrderResult> {
    // Use real internal components
    const validationResult = this.validator.validate(order);
    if (!validationResult.isValid) {
      return OrderResult.failure(validationResult.errors);
    }

    const totalPrice = this.calculator.calculateTotal(order.items);

    // Only mock external dependencies
    const paymentResult = await this.paymentGateway.processPayment(order);

    return OrderResult.success(paymentResult.transactionId);
  }
}

// 2. Pure Business Logic
class PriceCalculator {
  calculateTotal(items: OrderItem[]): number {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  applyDiscount(total: number, customerTier: string): number {
    const discountRate = customerTier === 'gold' ? 0.1 : 0;
    return total * (1 - discountRate);
  }
}

// 3. Test Implementation for External Dependencies
class TestPaymentGateway implements PaymentGateway {
  private processedPayments: Order[] = [];

  async processPayment(order: Order): Promise<PaymentResult> {
    this.processedPayments.push(order);
    return { success: true, transactionId: 'TEST-TX-123' };
  }

  getProcessedPayments(): Order[] {
    return this.processedPayments;
  }
}

// 4. In-Memory Repository Implementation
class InMemoryOrderRepository implements OrderRepository {
  private orders = new Map<string, Order>();

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) || null;
  }
}
```

## Examples

```typescript
// ❌ BAD: Excessive internal mocking
it("should calculate order total", () => {
  // Mocking internal services creates brittle tests
  const mockPriceCalculator = {
    calculateItemPrice: jest.fn().mockReturnValue(10.00)
  };
  const mockDiscountService = {
    applyDiscount: jest.fn().mockReturnValue(2.00)
  };

  const orderService = new OrderService(mockPriceCalculator, mockDiscountService);
  const total = orderService.calculateTotal({ items: [{ id: "item1", quantity: 1 }] });

  // Testing implementation details, not behavior
  expect(mockPriceCalculator.calculateItemPrice).toHaveBeenCalledWith("item1", 1);
  expect(total).toBe(8.00);
});

// ✅ GOOD: Using real internal components
it("should calculate order total", () => {
  // Real internal services
  const priceCalculator = new PriceCalculator();
  const discountService = new DiscountService();

  // Only mock external database dependency
  const testDatabase = new InMemoryDatabase();
  testDatabase.addProduct({ id: "item1", price: 10.00 });
  testDatabase.addCustomer({ id: "customer1", discountTier: "gold" });

  const orderService = new OrderService(
    priceCalculator,
    discountService,
    testDatabase  // External dependency
  );

  const total = orderService.calculateTotal({
    items: [{ id: "item1", quantity: 1 }],
    customerId: "customer1"
  });

  // Testing observable behavior
  expect(total).toBe(9.00);  // $10 - 10% gold discount
});
```

```java
// ❌ BAD: Mocking internal components
@Test
public void shouldProcessOrder() {
    OrderValidator mockValidator = mock(OrderValidator.class);
    when(mockValidator.validate(any())).thenReturn(true);

    PaymentGateway mockPayment = mock(PaymentGateway.class);
    when(mockPayment.process(any())).thenReturn(new PaymentResult(true, "TX123"));

    OrderProcessor processor = new OrderProcessor(mockValidator, mockPayment);
    boolean result = processor.process(order);

    // Brittle verification of implementation details
    verify(mockValidator).validate(order);
    assertTrue(result);
}

// ✅ GOOD: Real internal components, test implementations for externals
@Test
public void shouldProcessOrder() {
    // Real internal validator
    OrderValidator validator = new OrderValidator();

    // Test implementation of external dependency
    TestPaymentGateway paymentGateway = new TestPaymentGateway();

    OrderProcessor processor = new OrderProcessor(validator, paymentGateway);
    Order order = new Order("customer1", List.of(new OrderItem("product1", 1)));

    boolean result = processor.process(order);

    // Verify observable behavior
    assertTrue(result);
    assertEquals(1, paymentGateway.getProcessedOrders().size());
}
```

## Related Bindings

- [dependency-inversion](../../docs/bindings/core/dependency-inversion.md): Dependency inversion is essential for
  implementing this no-internal-mocking binding. By depending on abstractions rather
  than concrete implementations, you can achieve testability without resorting to mocks.
  These bindings work together—dependency inversion creates the structure that makes
  testing without internal mocks practical and effective.

- [hex-domain-purity](../../docs/bindings/core/hex-domain-purity.md): Domain purity and no-internal-mocking are
  complementary approaches to testable architecture. By keeping your business logic free
  from infrastructure concerns, you naturally create a system where core components can
  be tested without elaborate mocking. The hexagonal architecture pattern provides the
  structure that makes no-internal-mocking practical to implement.

- [immutable-by-default](../../docs/bindings/core/immutable-by-default.md): Immutable data structures make
  testing without mocks significantly easier. When data doesn't change unexpectedly,
  tests become more predictable and less prone to order dependencies or side effects.
  Together, these bindings create systems that are both more testable and more reliable.
