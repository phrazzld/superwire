---
id: flexible-architecture-patterns
last_modified: '2025-06-02'
version: '0.2.0'
derived_from: adaptability-and-reversibility
enforced_by: 'Architectural review, design patterns, refactoring practices'
---
# Binding: Design Architecture for Change and Reversibility

Implement architectural patterns that enable easy modification, extension, and reversal of design decisions. Design systems that can adapt to changing requirements without requiring fundamental restructuring.

## Rationale

This binding implements adaptability and reversibility by creating systems that evolve gracefully. Software requirements change constantly—business rules evolve, user needs shift, platforms update, and regulations emerge.

Inflexible architecture creates technical debt that compounds over time. Flexible architecture prevents this decay by building adaptability into the system's core structure through modular components, stable interfaces, and configurable behavior.

## Rule Definition

### Core Principles
- **Interface Segregation**: Create focused, cohesive interfaces that evolve independently
- **Dependency Injection**: Decouple components from concrete dependencies
- **Strategy Patterns**: Implement variable behavior through swappable strategies
- **Event-Driven Communication**: Enable loose coupling through stable event contracts
- **Modular Design**: Structure as independent, replaceable modules
- **Configuration-Driven Behavior**: Externalize behavior for runtime changes

### Key Patterns
- Plugin architectures for extensibility
- Adapter patterns for external integration
- Factory patterns for flexible object creation
- Observer patterns for decoupled communication
- Chain of responsibility for configurable pipelines

## Practical Implementation

```typescript
// Define flexible interfaces for strategy patterns
interface PaymentProcessor {
  processPayment(amount: number, method: PaymentMethod): Promise<PaymentResult>;
}

interface NotificationPlugin {
  getType(): string;
  sendNotification(message: string, recipient: string): Promise<void>;
}

interface StorageAdapter {
  save(data: any): Promise<boolean>;
}

// Strategy pattern implementations - easily swappable
class StripePaymentProcessor implements PaymentProcessor {
  async processPayment(amount: number, method: PaymentMethod): Promise<PaymentResult> {
    return { success: true, transactionId: `stripe_${Date.now()}` };
  }
}

class EmailNotificationPlugin implements NotificationPlugin {
  getType() { return 'email'; }
  async sendNotification(message: string, recipient: string) {
    console.log(`Email to ${recipient}: ${message}`);
  }
}

// Plugin manager for dynamic notification handling
class NotificationManager {
  private plugins = new Map<string, NotificationPlugin>();

  registerPlugin(plugin: NotificationPlugin) {
    this.plugins.set(plugin.getType(), plugin);
  }

  async sendNotifications(message: string, recipient: string, types: string[]) {
    const promises = types
      .map(type => this.plugins.get(type))
      .filter(Boolean)
      .map(plugin => plugin!.sendNotification(message, recipient));
    await Promise.all(promises);
  }
}

// Flexible order processor with dependency injection
class FlexibleOrderProcessor {
  constructor(
    private paymentProcessor: PaymentProcessor,
    private notificationManager: NotificationManager,
    private storageAdapter: StorageAdapter,
    private config: OrderProcessingConfig
  ) {}

  async processOrder(order: Order): Promise<OrderResult> {
    const paymentResult = await this.paymentProcessor.processPayment(
      order.amount, order.paymentMethod
    );

    if (!paymentResult.success) {
      return { success: false, error: 'Payment failed' };
    }

    if (this.config.enableNotifications) {
      await this.notificationManager.sendNotifications(
        `Order ${order.id} confirmed`,
        order.customerEmail,
        this.config.enabledNotificationTypes
      );
    }

    await this.storageAdapter.save({
      orderId: order.id,
      amount: order.amount,
      status: 'completed'
    });

    return { success: true, orderId: order.id };
  }
}

// Factory pattern for configuration-driven assembly
class OrderProcessorFactory {
  static create(config: SystemConfiguration): FlexibleOrderProcessor {
    const paymentProcessor = config.paymentProvider === 'stripe'
      ? new StripePaymentProcessor()
      : new PayPalPaymentProcessor();

    const notificationManager = new NotificationManager();
    if (config.enableEmail) {
      notificationManager.registerPlugin(new EmailNotificationPlugin());
    }
    if (config.enableSMS) {
      notificationManager.registerPlugin(new SMSNotificationPlugin());
    }

    const storageAdapter = config.storageProvider === 'mysql'
      ? new MySQLStorageAdapter()
      : new S3StorageAdapter();

    return new FlexibleOrderProcessor(
      paymentProcessor,
      notificationManager,
      storageAdapter,
      config.orderProcessing
    );
  }
}

// Usage
const config: SystemConfiguration = {
  paymentProvider: 'stripe',
  storageProvider: 'mysql',
  enableEmail: true,
  enableSMS: false,
  orderProcessing: {
    enableNotifications: true,
    enabledNotificationTypes: ['email']
  }
};
const processor = OrderProcessorFactory.create(config);
```
## Examples
```typescript
// ❌ BAD: Rigid architecture with hardcoded dependencies
class RigidOrderProcessor {
  processOrder(order: Order): void {
    new StripePaymentProcessor().charge(order.amount, order.paymentMethod);
    new SendgridEmailService().sendOrderConfirmation(order.customerEmail);
    new MySQLInventoryService().decrementStock(order.items);
  }
}

// ✅ GOOD: Flexible architecture with configurable behavior
class FlexibleOrderProcessor {
  constructor(
    private paymentProcessor: PaymentProcessor,
    private notificationManager: NotificationManager,
    private storageAdapter: StorageAdapter,
    private config: OrderProcessingConfig
  ) {}

  async processOrder(order: Order): Promise<OrderResult> {
    const paymentResult = await this.paymentProcessor.processPayment(
      order.amount, order.paymentMethod
    );

    if (this.config.enableNotifications) {
      await this.notificationManager.sendNotifications(
        `Order ${order.id} confirmed`, order.customerEmail, this.config.enabledNotificationTypes
      );
    }

    await this.storageAdapter.save(order);
    return { success: true, orderId: order.id };
  }
}
```

## Related Bindings

- [feature-flag-management](feature-flag-management.md): Feature flags enable runtime behavior changes
- [component-isolation](component-isolation.md): Isolated components enable modification
- [dependency-inversion](dependency-inversion.md): Abstractions create adaptable, extensible systems
