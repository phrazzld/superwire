---
id: system-boundaries
last_modified: '2025-06-02'
version: '0.2.0'
derived_from: orthogonality
enforced_by: 'Architectural review, module organization, build systems'
---
# Binding: Establish Clear System and Module Boundaries

Define explicit boundaries that separate different concerns, domains, or levels of abstraction within your system. These boundaries should be enforced through code organization, build systems, and architectural patterns that prevent unintended dependencies and coupling across boundary lines.

## Rationale

This binding implements our orthogonality tenet by creating architectural separation that prevents components from becoming entangled across different levels of abstraction or domains. Clear boundaries act as firewalls that contain complexity and prevent changes in one part of the system from unexpectedly affecting unrelated parts. Without boundaries, systems become unmaintainable where everything connects to everything else, making change impossible without understanding the whole system.

## Rule Definition

System boundaries must establish these separation principles:

- **Domain Boundaries**: Separate business domains into distinct modules with encapsulated data models and rules
- **Layer Boundaries**: Enforce separation between abstraction levels (presentation, business logic, data access)
- **Service Boundaries**: Define clear interfaces between services communicating only through public APIs
- **Technology Boundaries**: Isolate framework/database concerns from core business logic
- **Team Boundaries**: Align boundaries with team ownership for autonomous development

Boundaries must be enforceable through technical mechanisms, discoverable in code organization, stable over time, and meaningful rather than arbitrary.

Boundary violations may be acceptable when:
- Rapid prototyping requires temporary shortcuts during exploration
- Performance optimizations require cross-boundary access (with careful documentation)
- Legacy system migration requires temporary bridging during transition periods

## Practical Implementation

1. **Organize Code by Domain**: Structure codebase around business capabilities, not technical layers
2. **Use Build System Enforcement**: Configure build tools to prevent inappropriate cross-boundary dependencies
3. **Implement Hexagonal Architecture**: Separate core business logic from external concerns using ports and adapters
4. **Define Anti-Corruption Layers**: Translate between different models when integrating external systems
5. **Establish Communication Protocols**: Define explicit protocols for cross-boundary communication (events, APIs, messages)

## Examples

```typescript
// ❌ BAD: Mixed concerns with no clear boundaries
class UserRegistrationForm {
  async onSubmit(formData) {
    // UI validation mixed with business rules
    if (!formData.email.includes('@')) {
      this.showError('Invalid email');
      return;
    }

    // Direct database access from UI layer
    const existingUser = await database.users.findOne({ email: formData.email });
    if (existingUser) {
      this.showError('User already exists');
      return;
    }

    // Business logic mixed with persistence and infrastructure
    const hashedPassword = await bcrypt.hash(formData.password, 10);
    const user = await database.users.create({ email: formData.email, password: hashedPassword });
    await emailService.sendWelcomeEmail(user.email);
    await analyticsService.track('user_registered', { userId: user.id });

    this.showSuccess('Registration successful');
  }
}

// ✅ GOOD: Clear boundaries separating concerns
// Domain Layer - Pure business logic
export class UserRegistrationService {
  constructor(
    private userRepository: UserRepository,
    private passwordService: PasswordService,
    private eventPublisher: EventPublisher
  ) {}

  async registerUser(request: RegisterUserRequest): Promise<User> {
    // Domain validation and business rules
    if (!this.isValidEmail(request.email)) {
      throw new InvalidEmailError(request.email);
    }

    const existingUser = await this.userRepository.findByEmail(request.email);
    if (existingUser) {
      throw new UserAlreadyExistsError(request.email);
    }

    // Create and persist domain entity
    const hashedPassword = await this.passwordService.hash(request.password);
    const user = new User({ email: request.email, password: hashedPassword, registeredAt: new Date() });
    const savedUser = await this.userRepository.save(user);

    // Publish domain event for cross-cutting concerns
    await this.eventPublisher.publish(new UserRegisteredEvent(savedUser));
    return savedUser;
  }

  private isValidEmail(email: string): boolean {
    return email.includes('@') && email.includes('.');
  }
}

// Application Layer - Orchestrates use cases
export class UserRegistrationController {
  constructor(
    private registrationService: UserRegistrationService,
    private validator: RequestValidator
  ) {}

  async handleRegistration(request: HttpRequest): Promise<HttpResponse> {
    try {
      const validatedData = await this.validator.validate(request.body);
      const user = await this.registrationService.registerUser(validatedData);
      return { status: 201, body: { userId: user.id, message: 'Registration successful' } };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Infrastructure Layer - External concerns handled via events
export class EmailEventHandler {
  async handle(event: UserRegisteredEvent): Promise<void> {
    await this.emailService.sendWelcomeEmail(event.user.email);
  }
}
```

## Related Bindings

- [component-isolation.md](../../docs/bindings/core/component-isolation.md): Component isolation within system boundary contexts
- [hex-domain-purity.md](../../docs/bindings/core/hex-domain-purity.md): Hexagonal architecture pattern for boundary implementation
- [dependency-inversion.md](../../docs/bindings/core/dependency-inversion.md): Dependency inversion for boundary enforcement
- [layered-architecture.md](../../docs/bindings/core/layered-architecture.md): Layered architecture as boundary implementation pattern
