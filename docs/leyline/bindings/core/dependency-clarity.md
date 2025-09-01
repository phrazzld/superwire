---
id: dependency-clarity
last_modified: '2025-07-10'
version: '0.2.0'
derived_from: design-is-never-done
enforced_by: 'Architecture reviews, dependency analysis tools, build system configuration'
---

# Binding: Dependency Clarity

Manage the two primary sources of complexity—dependencies and obscurity—through explicit dependency management, clear boundaries, and architectural transparency. Make all dependencies visible, minimal, and unidirectional where possible.

## Rationale

This binding implements the design-is-never-done tenet's insight that complexity stems from dependencies and obscurity. Dependencies create coupling between components, while obscurity hides these relationships. Together, they form a web of complexity that makes systems hard to understand, modify, and debug.

By making dependencies explicit and minimal, we reduce both sources of complexity simultaneously. Clear dependencies are easier to reason about, test in isolation, and modify without unexpected side effects.

## Rule Definition

**MUST** make all dependencies explicit:
- Use dependency injection over service locators
- Declare all imports at file top
- Document external service dependencies
- Version all third-party dependencies explicitly

**MUST** minimize dependency scope:
- Depend on interfaces, not implementations
- Use the narrowest interface possible
- Avoid circular dependencies entirely
- Limit transitive dependency depth

**MUST** enforce dependency directionality:
- Dependencies flow from high-level to low-level modules
- Domain logic never depends on infrastructure
- Clear architectural layers with one-way dependencies
- Shared code in dedicated modules, not scattered

**SHOULD** visualize dependency graphs:
- Automated dependency diagrams
- Regular architecture reviews
- Highlight violation of intended structure
- Track dependency complexity metrics

**SHOULD** isolate volatile dependencies:
- Wrap external services in adapters
- Abstract framework-specific code
- Create boundaries around likely change points
- Use feature flags for experimental dependencies

## Implementation Approach

**Start with Visibility**: Generate dependency graphs to understand current state.

**Refactor Gradually**: Break circular dependencies one at a time.

**Enforce at Build Time**: Use tooling to prevent dependency violations.

**Measure Progress**: Track reduction in coupling metrics over time.

## Implementation Examples

### ❌ Tangled Dependencies

```typescript
// Bad: Hidden, circular, and unclear dependencies
export class OrderService {
  async createOrder(items: Item[]): Promise<Order> {
    // Hidden dependency via singleton
    const inventory = InventoryManager.getInstance();
    // Circular dependency - PaymentService also depends on OrderService
    const payment = new PaymentService();
    // Reaching across layers
    const database = require('../infrastructure/database');
    // Global state dependency
    const user = global.currentUser;
    // Tight coupling to specific implementation
    const emailer = new SMTPEmailService('smtp.gmail.com', 587);

    if (inventory.checkAvailability(items)) {
      const order = await database.orders.create({ userId: user.id, items, status: 'pending' });
      const paymentResult = await payment.processOrderPayment(order);
      if (paymentResult.success) {
        await emailer.sendOrderConfirmation(user.email, order);
        await inventory.reserveItems(items, order.id);
      }
      return order;
    }
  }
}

// File: services/PaymentService.ts
export class PaymentService {
  async processOrderPayment(order: Order): Promise<PaymentResult> {
    // Circular dependency back to OrderService
    const orderService = new OrderService();
    const orderDetails = await orderService.getOrderDetails(order.id);
    // ...
  }
}
```

### ✅ Clear Dependencies

```typescript
// Good: Explicit, minimal, unidirectional dependencies
interface OrderRepository {
  create(order: NewOrder): Promise<Order>;
  findById(id: string): Promise<Order>;
}

interface InventoryService {
  checkAvailability(items: Item[]): Promise<boolean>;
  reserveItems(items: Item[], orderId: string): Promise<void>;
}

interface PaymentProcessor {
  processPayment(amount: Money, paymentMethod: PaymentMethod): Promise<PaymentResult>;
}

interface NotificationService {
  sendOrderConfirmation(email: string, order: Order): Promise<void>;
}

// Dependency injection with clear boundaries
export class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private inventoryService: InventoryService,
    private paymentProcessor: PaymentProcessor,
    private notificationService: NotificationService
  ) {}

  async createOrder(customerId: string, items: Item[], paymentMethod: PaymentMethod): Promise<OrderResult> {
    const available = await this.inventoryService.checkAvailability(items);
    if (!available) return { success: false, reason: 'Items not available' };

    const total = this.calculateOrderTotal(items);
    const paymentResult = await this.paymentProcessor.processPayment(total, paymentMethod);
    if (!paymentResult.success) return { success: false, reason: 'Payment failed', paymentError: paymentResult.error };

    const order = await this.orderRepository.create({
      customerId, items, total, paymentId: paymentResult.transactionId, status: OrderStatus.CONFIRMED
    });

    await Promise.all([
      this.inventoryService.reserveItems(items, order.id),
      this.notificationService.sendOrderConfirmation(order.customerEmail, order)
    ]);

    return { success: true, order };
  }

  private calculateOrderTotal(items: Item[]): Money {
    const subtotal = items.reduce((sum, item) => sum.add(item.price.multiply(item.quantity)), Money.zero('USD'));
    return subtotal.add(this.calculateTax(subtotal));
  }
}

// Infrastructure adapters implement domain interfaces
export class PostgresOrderRepository implements OrderRepository {
  constructor(private db: Database) {}

  async create(order: NewOrder): Promise<Order> {
    const result = await this.db.query('INSERT INTO orders (...) VALUES (...) RETURNING *', order);
    return this.mapToOrder(result.rows[0]);
  }

  async findById(id: string): Promise<Order> {
    const result = await this.db.query('SELECT * FROM orders WHERE id = $1', [id]);
    return this.mapToOrder(result.rows[0]);
  }

  private mapToOrder(row: any): Order {
    // Mapping logic isolated here
  }
}
```

### Dependency Graph Visualization

```typescript
// Good: Tooling to visualize and enforce dependencies
interface DependencyRule {
  source: string;
  allowed: string[];
  forbidden: string[];
}

class DependencyEnforcer {
  private rules: DependencyRule[] = [
    { source: 'domain/*', allowed: [], forbidden: ['infrastructure/*', 'application/*'] },
    { source: 'application/*', allowed: ['domain/*'], forbidden: ['infrastructure/*'] },
    { source: 'infrastructure/*', allowed: ['domain/*', 'application/*'], forbidden: [] }
  ];

  validateDependencies(filePath: string, imports: string[]): ValidationResult {
    const violations = this.findViolations(filePath, imports);
    if (violations.length > 0) {
      return {
        valid: false,
        violations: violations.map(v => ({
          file: filePath,
          import: v.import,
          reason: `${v.source} cannot depend on ${v.target}`,
          rule: v.rule
        }))
      };
    }
    return { valid: true };
  }

  generateDependencyGraph(): DependencyGraph {
    return {
      nodes: this.findAllModules(),
      edges: this.findAllDependencies(),
      violations: this.findAllViolations(),
      metrics: { coupling: this.calculateCoupling(), cohesion: this.calculateCohesion(), cycles: this.findCycles() }
    };
  }
}
```

### Isolating Volatile Dependencies

```typescript
// Good: Wrapping external dependencies in stable interfaces
interface EmailService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

// Infrastructure adapters (volatile)
class SmtpEmailAdapter implements EmailService {
  constructor(private config: SmtpConfig) {}
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    const transport = nodemailer.createTransport(this.config);
    await transport.sendMail({ to, subject, html: body });
  }
}

class SendGridEmailAdapter implements EmailService {
  constructor(private apiKey: string) {}
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    const sg = new SendGrid(this.apiKey);
    await sg.send({ to, subject, html: body });
  }
}

// Usage in domain remains unchanged
class OrderNotificationService {
  constructor(private emailService: EmailService) {}
  async notifyOrderShipped(order: Order): Promise<void> {
    await this.emailService.sendEmail(
      order.customerEmail,
      'Your order has shipped!',
      this.generateShipmentEmail(order)
    );
  }
}
```

## Dependency Metrics

Track and improve dependency health:

```typescript
interface DependencyMetrics {
  afferentCoupling: number;  // Number of classes that depend on this
  efferentCoupling: number;  // Number of classes this depends on
  instability: number;       // Ratio of efferent to total coupling
  dependencyDepth: number;   // Max depth of dependency chain
  circularDependencies: number;  // Count of circular refs
  layerViolations: number;   // Dependencies breaking layer rules
  abstractness: number;      // Ratio of interfaces to implementations
}

class DependencyAnalyzer {
  analyzeDependencyHealth(module: string): DependencyHealth {
    const metrics = this.calculateMetrics(module);
    return {
      score: this.calculateHealthScore(metrics),
      issues: this.identifyIssues(metrics),
      recommendations: this.generateRecommendations(metrics)
    };
  }
}
```

## Common Pitfalls

**❌ Leaky Abstractions**: Interfaces that expose implementation details
**❌ God Objects**: Central classes that everything depends on
**❌ Implicit Dependencies**: Hidden dependencies through static methods or globals
**❌ Over-Abstraction**: Creating unnecessary layers that add complexity

## Related Standards

- [design-is-never-done](../../docs/tenets/design-is-never-done.md): Core principle that complexity comes from dependencies and obscurity
- [dependency-injection](dependency-injection.md): Specific patterns for explicit dependency management
- [modularity](../../docs/tenets/modularity.md): Creating well-bounded contexts with minimal dependencies
