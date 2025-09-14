---
derived_from: simplicity
id: hex-domain-purity
last_modified: '2025-05-14'
version: '0.2.0'
enforced_by: code review & style guides
---
# Binding: Keep Business Logic Pure and Infrastructure-Free

Your core business logic (domain layer) must remain completely free from infrastructure concerns. Domain code should never directly import or reference databases, web frameworks, file systems, third-party APIs, or any other technical implementations. Instead, create a clear boundary that keeps your domain focused solely on business rules and concepts.

## Rationale

This binding implements our simplicity tenet by eliminating entanglement between business rules and technical implementations. Mixed concerns create codebases that are difficult to understand, test, and evolve. Pure domain code allows developers to focus on one aspect at a time. When domain and infrastructure remain separate, both can evolve independently, dramatically reducing maintenance costs and enabling technology changes without cascading through the entire codebase.

## Rule Definition

**Core Requirements:**

- **Domain Layer Restrictions**: No infrastructure libraries, technology references, serialization logic, environment-specific behavior, or direct infrastructure instantiation
- **Interface Ownership**: Domain defines interfaces (ports) for external needs but never implements them directly
- **Implementation Location**: All concrete implementations (adapters) belong in infrastructure layer

**Key Boundaries:**
- Domain: Pure business logic, entities, domain services, interfaces
- Infrastructure: Database access, API clients, file systems, message queues, external services

**Limited Exceptions**: Domain-level utilities (date manipulation) and cases where infrastructure concepts are genuinely part of domain vocabulary

## Practical Implementation

**Hexagonal Architecture Implementation:**

1. **Architectural Structure**: Domain at center with dependencies pointing inward
2. **Domain Interfaces**: Define contracts expressing domain needs, not technical implementations
3. **Dependency Injection**: Wire infrastructure implementations at application startup
4. **Boundary Conversion**: Use mappers to prevent infrastructure leakage into domain
5. **Physical Constraints**: Use package structure to make violations obvious

## Examples

```typescript
// ❌ BAD: Domain layer with infrastructure dependencies
import { Connection } from 'pg';
import { HttpClient } from '@angular/common/http';

export class OrderService {
  constructor(
    private db: Connection,
    private http: HttpClient
  ) {}

  async placeOrder(order: Order): Promise<void> {
    // Direct database access in domain
    await this.db.query('INSERT INTO orders...', [order.id]);

    // Direct HTTP calls in domain
    await this.http.post('https://payment.api.com/charge', order).toPromise();
  }
}

// ✅ GOOD: Pure domain with interfaces for infrastructure needs
// Domain Layer
export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order>;
}

export interface PaymentGateway {
  processPayment(order: Order): Promise<PaymentResult>;
}

export class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private paymentGateway: PaymentGateway
  ) {}

  async placeOrder(order: Order): Promise<void> {
    // Pure domain validation
    if (!order.isValid()) {
      throw new InvalidOrderError("Order failed validation");
    }

    // Process payment through abstract interface
    const result = await this.paymentGateway.processPayment(order);
    if (!result.isSuccessful()) {
      throw new PaymentFailedError(result.errorMessage);
    }

    // Update order status (pure domain logic)
    order.markAsPaid();

    // Persist using abstract repository
    await this.orderRepository.save(order);
  }
}

// Infrastructure Layer
export class PostgresOrderRepository implements OrderRepository {
  constructor(private db: Connection) {}

  async save(order: Order): Promise<void> {
    // PostgreSQL-specific implementation
    await this.db.query('INSERT INTO orders...', [order.id]);
  }

  async findById(id: OrderId): Promise<Order> {
    // PostgreSQL-specific implementation
    const result = await this.db.query('SELECT * FROM orders WHERE id = $1', [id]);
    return OrderMapper.toDomain(result.rows[0]);
  }
}

export class StripePaymentGateway implements PaymentGateway {
  constructor(private stripeClient: Stripe) {}

  async processPayment(order: Order): Promise<PaymentResult> {
    // Stripe-specific implementation
    const result = await this.stripeClient.paymentIntents.create({
      amount: order.amount,
      currency: 'usd'
    });

    return new PaymentResult(result.status === 'succeeded', result.id);
  }
}

// Application Layer - Dependency Injection
export class OrderModule {
  static configure(container: Container): void {
    container.bind<OrderRepository>(TYPES.OrderRepository).to(PostgresOrderRepository);
    container.bind<PaymentGateway>(TYPES.PaymentGateway).to(StripePaymentGateway);
    container.bind<OrderService>(TYPES.OrderService).to(OrderService);
  }
}
```

## Related Bindings

- [dependency-inversion](../../docs/bindings/core/dependency-inversion.md): Domain purity and dependency inversion form the foundation of clean architecture
- [external-configuration](../../docs/bindings/core/external-configuration.md): External configuration removes environment-specific details from domain and infrastructure
- [immutable-by-default](../../docs/bindings/core/immutable-by-default.md): Immutability strengthens domain purity by making business objects predictable and side-effect free
- [no-internal-mocking](../../docs/bindings/core/no-internal-mocking.md): Clear domain boundaries reduce the need for complex mocking in tests
