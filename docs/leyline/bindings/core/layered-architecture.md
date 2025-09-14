---
id: layered-architecture
last_modified: '2025-06-15'
version: '0.2.0'
derived_from: orthogonality
enforced_by: 'Build system dependencies, architectural linting, code review'
---

# Binding: Implement Layered Architecture with Dependency Flow Control

Organize code into distinct horizontal layers with well-defined responsibilities, where higher-level layers depend on lower-level layers but never vice versa. This creates a clear hierarchy that separates concerns and enables flexible, testable, and maintainable systems.

## Rationale

Layered architecture prevents high-level policy from entangling with low-level implementation details, enabling each layer to evolve independently while maintaining stable interfaces. Without clear organization, code becomes tangled where business logic depends on database schemas and UI contains business rules. Enforcing unidirectional dependency flow creates stability and flexibility.

## Rule Definition

**Four Layers:**
- **Presentation:** User interface concerns, input/output formatting, interaction workflows
- **Application:** Orchestrates business workflows, coordinates domain services, handles transactions
- **Domain:** Core business logic, entities, domain services; independent of external concerns
- **Infrastructure:** External concerns (databases, file systems, networks); implements higher-layer interfaces

**Dependency Rules:**
- Presentation → Application, Domain
- Application → Domain only
- Domain → nothing
- Infrastructure → Domain, Application (for interfaces)
- No upward or sideways dependencies

**Requirements:** Single responsibility per layer, loose coupling, explicit interfaces

## Implementation

**Guidelines:** Start simple, use interface-driven design, employ dependency injection, test in isolation, avoid cross-layer calls

## Implementation Examples

**❌ Tangled Architecture:**
```typescript
class UserService {
  async registerUser(userData: any) {
    if (!userData.email?.includes('@')) throw new Error('Invalid email');
    const user = await db.query('INSERT INTO users...', userData);
    await sendEmail(user.email, 'Welcome!');
    return { message: 'User created successfully' };
  }
}
```

**✅ Layered Architecture:**
```typescript
// Domain Layer - Pure business logic
interface User { id: string; email: string; username: string; }
interface UserRepository { save(user: User): Promise<User>; }

class UserDomainService {
  validateUser(email: string): void {
    if (!email.includes('@')) throw new Error('Invalid email');
  }
  createUser(email: string, username: string): User {
    this.validateUser(email);
    return { id: crypto.randomUUID(), email, username };
  }
}

// Application Layer - Orchestrates workflows
class UserApplicationService {
  constructor(private userRepo: UserRepository, private userDomain: UserDomainService) {}

  async registerUser(email: string, username: string): Promise<string> {
    const user = this.userDomain.createUser(email, username);
    await this.userRepo.save(user);
    return user.id;
  }
}

// Infrastructure Layer - External concerns
class DatabaseUserRepository implements UserRepository {
  async save(user: User): Promise<User> {
    await this.db.query('INSERT INTO users...', [user.id, user.email]);
    return user;
  }
}

// Presentation Layer - HTTP concerns
class UserController {
  constructor(private userService: UserApplicationService) {}

  async register(req: Request, res: Response): Promise<void> {
    const { email, username } = req.body;
    const userId = await this.userService.registerUser(email, username);
    res.status(201).json({ userId });
  }
}
```

## Testing

**Strategy:** Domain (pure unit tests), Application (mock dependencies), Infrastructure (integration tests), Presentation (HTTP tests)

```typescript
// Domain - Pure unit tests
test('validates email', () => {
  expect(() => userDomain.validateUser('invalid')).toThrow('Invalid email');
});

// Application - Mock dependencies
test('registers user', async () => {
  const mockRepo = { save: jest.fn() };
  await service.registerUser('test@example.com', 'user');
  expect(mockRepo.save).toHaveBeenCalled();
});
```

## Anti-Patterns & Usage

**Avoid:** Layer skipping, circular dependencies, anemic domain, fat controllers, leaky abstractions

**Good Fit:** Complex business logic, high testability, multiple integrations
**Poor Fit:** Simple CRUD, high-performance systems, small applications
**Evolution:** Start minimal, measure impact, refactor as needed

## Related Bindings

- [dependency-inversion](../../docs/bindings/core/dependency-inversion.md): Dependency management for layer isolation
- [interface-contracts](../../docs/bindings/core/interface-contracts.md): Clean layer boundaries
- [component-isolation](../../docs/bindings/core/component-isolation.md): Component separation principles
