---
id: component-isolation
last_modified: '2025-06-02'
version: '0.2.0'
derived_from: orthogonality
enforced_by: 'Code review, architectural guidelines'
---
# Binding: Design Independent, Self-Contained Components

Create components that operate independently without requiring knowledge of or dependencies on unrelated components. Each component should encapsulate its own state, behavior, and data, allowing it to be understood, tested, and modified in isolation.

## Rationale

This binding implements our orthogonality tenet by eliminating unwanted coupling between components. When components are truly isolated, changing one component doesn't create ripple effects throughout the system. This isolation dramatically reduces cognitive load as developers can focus on one component at a time.

Well-isolated components work like appliances in your home—your refrigerator doesn't need to know about your washing machine to function properly. Similarly, isolated software components can be replaced, upgraded, or modified without affecting other parts of the system. This independence enables parallel development, easier testing, and safer refactoring.

Tightly coupled components create a web of dependencies where touching one part requires understanding and potentially modifying many others. This coupling multiplies complexity exponentially and makes systems brittle. By designing for isolation from the start, complexity remains manageable as the codebase grows.

## Rule Definition

Component isolation requires adherence to these core principles:

- **Single Responsibility**: Each component must have exactly one reason to change and one clear purpose. Avoid components that handle multiple unrelated concerns.

- **Explicit Dependencies**: All dependencies must be explicitly declared and injected rather than accessed through global state or hidden imports. The component's interface should clearly communicate what it needs to operate.

- **No Shared Mutable State**: Components must not share mutable state directly. Communication should happen through well-defined interfaces using message passing, events, or function calls with immutable data.

- **Encapsulated Internal State**: Internal implementation details must be hidden from other components. Only expose the minimum necessary interface.

- **Minimal Interface Surface**: Keep the public interface as small as possible while providing necessary functionality. Large interfaces create more coupling opportunities.

- **Stateless When Possible**: Prefer stateless components that transform inputs to outputs. When state is necessary, manage it explicitly and locally.

Exceptions may be appropriate when performance profiling demonstrates genuine need, legacy integration requires temporary coupling, or framework constraints make perfect isolation impractical. Such exceptions should be documented and minimized.

## Practical Implementation

1. **Apply Dependency Injection**: Make all external dependencies explicit by injecting them through constructor parameters or method arguments. This makes dependencies visible and enables easy substitution for testing.

2. **Use Message Passing for Communication**: Instead of direct method calls between unrelated components, use event systems, message queues, or observer patterns. This allows components to communicate without knowing each other's internal structure.

3. **Implement Interface Segregation**: Create focused interfaces that expose only methods and properties relevant to specific use cases. Avoid large, monolithic interfaces that force unnecessary dependencies.

4. **Establish Clear Boundaries**: Define explicit boundaries around related functionality using modules, packages, or services. These boundaries should align with business concepts rather than technical layers.

5. **Design for Replaceability**: Structure components so they can be replaced with alternative implementations without affecting other parts of the system. This replaceability serves as a litmus test for good isolation.

## Examples

```typescript
// ❌ BAD: Tightly coupled user service with hidden dependencies
class UserService {
  async createUser(userData: any) {
    // Hidden dependency on specific database implementation
    const user = await PostgresDB.users.create(userData);

    // Hidden dependency on specific email service
    await SendgridEmail.send(user.email, 'Welcome!');

    // Hidden dependency on specific logger
    AppLogger.info(`User created: ${user.id}`);

    // Direct access to unrelated component
    AnalyticsTracker.track('user_created', { userId: user.id });

    return user;
  }
}

// ✅ GOOD: Isolated component with explicit dependencies
interface UserRepository {
  create(userData: UserData): Promise<User>;
}

interface EmailService {
  sendWelcomeEmail(email: string): Promise<void>;
}

interface Logger {
  info(message: string, context?: object): void;
}

interface EventPublisher {
  publish(event: string, data: object): void;
}

class UserService {
  constructor(
    private userRepo: UserRepository,
    private emailService: EmailService,
    private logger: Logger,
    private eventPublisher: EventPublisher
  ) {}

  async createUser(userData: UserData): Promise<User> {
    try {
      const user = await this.userRepo.create(userData);

      // Each dependency is explicit and substitutable
      await this.emailService.sendWelcomeEmail(user.email);
      this.logger.info('User created successfully', { userId: user.id });
      this.eventPublisher.publish('user.created', { userId: user.id });

      return user;
    } catch (error) {
      this.logger.error('Failed to create user', { error, userData });
      throw error;
    }
  }
}
```

```javascript
// ❌ BAD: Components sharing mutable state
let globalOrderState = {
  items: [],
  total: 0,
  discounts: []
};

class OrderCalculator {
  addItem(item) {
    globalOrderState.items.push(item);
    globalOrderState.total += item.price;
  }

  getTotal() {
    return globalOrderState.total;
  }
}

class DiscountEngine {
  applyDiscount(discount) {
    globalOrderState.discounts.push(discount);
    globalOrderState.total -= discount.amount;
  }
}

// ✅ GOOD: Isolated components with message passing
class OrderCalculator {
  calculateTotal(items) {
    return items.reduce((sum, item) => sum + item.price, 0);
  }

  addItem(currentItems, newItem) {
    return [...currentItems, newItem];
  }
}

class DiscountEngine {
  calculateDiscount(total, discountRules) {
    return discountRules.reduce((discount, rule) => {
      return discount + this.applyRule(total, rule);
    }, 0);
  }

  private applyRule(total, rule) {
    if (rule.type === 'percentage') {
      return total * (rule.value / 100);
    }
    return rule.value;
  }
}

// Orchestrator manages state and coordinates components
class OrderService {
  constructor(calculator, discountEngine, eventBus) {
    this.calculator = calculator;
    this.discountEngine = discountEngine;
    this.eventBus = eventBus;
  }

  processOrder(items, discountRules) {
    const subtotal = this.calculator.calculateTotal(items);
    const discount = this.discountEngine.calculateDiscount(subtotal, discountRules);
    const total = subtotal - discount;

    const order = { items, subtotal, discount, total };

    // Publish event for other components to react
    this.eventBus.publish('order.calculated', order);

    return order;
  }
}
```

```python
# ❌ BAD: File processor with multiple responsibilities and coupling
class FileProcessor:
    def __init__(self):
        self.file_system = os
        self.db = mysql.connector.connect(host='localhost', user='app', password='secret')

    def process_file(self, filename):
        content = self.file_system.read(filename)
        if filename.endswith('.csv'):
            data = self.parse_csv(content)
        elif filename.endswith('.json'):
            data = self.parse_json(content)
        for record in data:
            if not self.validate_record(record):
                raise ValueError(f"Invalid record: {record}")
        cursor = self.db.cursor()
        for record in data:
            cursor.execute("INSERT INTO records VALUES (%s, %s)", record)
        self.db.commit(); self.send_notification(f"Processed {len(data)} records")

# ✅ GOOD: Separated, isolated components
class FileReader:
    def __init__(self, file_system):
        self.file_system = file_system

    def read_file(self, filename):
        return self.file_system.read(filename)

class DataParser:
    def parse(self, content, file_type):
        if file_type == 'csv':
            return self._parse_csv(content)
        elif file_type == 'json':
            return self._parse_json(content)
        else:
            raise ValueError(f"Unsupported format: {file_type}")

class RecordValidator:
    def __init__(self, validation_rules):
        self.rules = validation_rules

    def validate_all(self, records):
        invalid_records = [r for r in records if not self._validate_record(r)]
        if invalid_records:
            raise ValueError(f"Invalid records found: {invalid_records}")

# Orchestrator coordinates isolated components
class FileProcessingService:
    def __init__(self, file_reader, parser, validator, repository, notifier):
        self.file_reader = file_reader
        self.parser = parser
        self.validator = validator
        self.repository = repository
        self.notifier = notifier

    def process_file(self, filename):
        try:
            content = self.file_reader.read_file(filename)
            file_type = self._determine_file_type(filename)
            data = self.parser.parse(content, file_type)
            self.validator.validate_all(data)
            result = self.repository.save_all(data)
            self.notifier.notify(f"Successfully processed {len(data)} records")
            return result
        except Exception as error:
            self.notifier.notify(f"Failed to process {filename}: {error}")
            raise
```

## Related Bindings

- [interface-contracts.md](../../docs/bindings/core/interface-contracts.md): Component isolation and interface contracts define clear boundaries.
- [system-boundaries.md](../../docs/bindings/core/system-boundaries.md): System boundaries provide architectural context for component isolation.
- [dependency-inversion.md](../../docs/bindings/core/dependency-inversion.md): Dependency inversion enables isolation by ensuring components depend on abstractions.
- [pure-functions.md](../../docs/bindings/core/pure-functions.md): Pure functions are naturally isolated components.
