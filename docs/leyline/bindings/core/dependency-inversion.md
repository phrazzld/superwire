---
derived_from: testability
enforced_by: code review & architecture analysis
id: dependency-inversion
last_modified: '2025-05-14'
version: '0.2.0'
---
# Binding: Design Against Abstractions, Not Implementations

High-level modules containing your business logic should never depend on low-level
implementation details. Instead, both high and low-level components should depend on
shared abstractions. These abstractions should be owned by the business domain, with
implementation details depending on them—not the other way around.

## Rationale

This binding directly implements our testability tenet by making code inherently more testable through decoupling. When business logic depends only on abstractions rather than concrete implementations, you can easily substitute real dependencies with test doubles without changing core code. This enables fast, reliable tests that verify business logic in isolation from external concerns.

The complexity and maintenance cost of a system increases exponentially when high-level modules directly depend on low-level details. Each infrastructure change—vendor updates, performance optimizations, security patches—ripples through business logic, destabilizing code that should be most stable. By inverting dependencies, you create a protective barrier around domain logic, allowing it to focus on business problems while infrastructure evolves independently.

## Rule Definition

The Dependency Inversion Principle (DIP) specifically requires that:

- High-level modules (containing business logic) must not directly reference or import
  low-level modules (infrastructure concerns like databases, external APIs, file
  systems, etc.)
- Both high-level and low-level modules should depend on abstractions (interfaces,
  abstract classes, protocols) that define capabilities without specifying
  implementations
- These abstractions should be owned by and oriented toward the business domain, not the
  technical infrastructure
- The direction of source code dependencies must point inward toward the core domain,
  not outward toward infrastructure

This creates a clear boundary where:

- Your domain models and business logic remain pure and focused, isolated from technical
  details
- Infrastructure components act as plugins to your business core, implementing
  interfaces defined by the domain
- Dependencies flow in one direction, from infrastructure toward domain, making the
  system more modular and testable

There are legitimate exceptions to this rule, primarily at the composition root of your
application—the startup point where you initially wire together abstractions with their
concrete implementations. This area, sometimes called the "main" component or DI
container configuration, is allowed to know about both domains and implementations in
order to connect them, but should not itself contain any business logic.

## Practical Implementation

To effectively implement dependency inversion:

1. **Define Interfaces in the Domain Layer**: Create interfaces within your business domain that represent capabilities your domain needs, not implementations. Ask "What does my business logic need?" rather than "How will this be implemented?"

   ```typescript
   // Domain layer
   export interface UserRepository {
     findById(id: string): Promise<User | null>;
     save(user: User): Promise<void>;
     delete(id: string): Promise<boolean>;
   }
   ```

2. **Use Constructor Dependency Injection**: Have business logic accept dependencies through constructors rather than creating them directly. This makes dependencies explicit and substitutable during testing.

   ```typescript
   export class UserService {
     constructor(private userRepository: UserRepository) {}

     async getUser(id: string): Promise<User | null> {
       return this.userRepository.findById(id);
     }
   }
   ```

3. **Implement Adapters in Infrastructure Layer**: Create concrete implementations of domain interfaces in a separate infrastructure layer. These adapters translate between domain abstractions and specific technologies. Import from domain, never the reverse.

   ```typescript
   // Infrastructure layer
   import { UserRepository, User } from '../domain/user';

   export class MongoUserRepository implements UserRepository {
     constructor(private mongoClient: MongoClient) {}

     async findById(id: string): Promise<User | null> {
       // MongoDB-specific implementation
     }
     // save() and delete() implementations...
   }
   ```

4. **Create a Composition Root**: Wire together domain services with infrastructure implementations at the application entry point—the one place acceptable to know about both.

   ```typescript
   function bootstrap() {
     const mongoClient = new MongoClient(config.dbUri);
     const userRepository = new MongoUserRepository(mongoClient);
     const userService = new UserService(userRepository);
     // Continue bootstrapping...
   }
   ```

5. **Enforce Through Package Structure**: Organize code into packages/modules that make wrong-direction imports impossible. Use build tools or linters to validate import directions.

## Examples

```typescript
// ❌ BAD: Domain directly depends on infrastructure
import { MongoClient } from 'mongodb';

export class UserService {
  private db: MongoClient;

  constructor() {
    this.db = new MongoClient('mongodb://localhost:27017');
  }

  async getUser(id: string) {
    await this.db.connect();
    const user = await this.db.db('users').collection('users').findOne({ _id: id });
    return user;
  }
}
```

```typescript
// ✅ GOOD: Dependencies point toward the domain
// Domain defines interfaces it needs
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async getUser(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async updateUserEmail(userId: string, newEmail: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) return false;

    user.updateEmail(newEmail);
    await this.userRepository.save(user);
    return true;
  }
}

// Infrastructure implements domain interfaces
import { UserRepository, User } from '../domain/user';

export class MongoUserRepository implements UserRepository {
  constructor(private client: MongoClient) {}

  async findById(id: string): Promise<User | null> {
    const data = await this.client.db('users').collection('users').findOne({ _id: id });
    if (!data) return null;
    return new User(data._id, data.name, data.email);
  }

  async save(user: User): Promise<void> {
    await this.client.db('users').collection('users').updateOne(
      { _id: user.id },
      { $set: { name: user.name, email: user.email } },
      { upsert: true }
    );
  }
}
```

```typescript
// ❌ BAD: Abstractions depend on details
// Interface bakes in implementation details
export interface UserRepository {
  collection: MongoDB.Collection;
  findUserById(id: string): Promise<Document>;
  insertDocument(doc: Document): Promise<MongoDB.InsertResult>;
}

// ✅ GOOD: Abstractions are implementation-agnostic
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

// The abstraction uses domain types (User) not infrastructure types (Document)
// Methods express domain concepts not database operations
```

## Related Bindings

- [hex-domain-purity](../../docs/bindings/core/hex-domain-purity.md): Works in tandem to create clean architecture. While dependency inversion focuses on dependency direction, hex-domain purity ensures no infrastructure concepts leak into domain layer.

- [no-internal-mocking](../../docs/bindings/core/no-internal-mocking.md): Dependency inversion enables proper testing without internal mocking. Inject test doubles at boundaries rather than mocking internal collaborators for more maintainable tests.

- [immutable-by-default](../../docs/bindings/core/immutable-by-default.md): Both promote predictability. Dependency inversion makes module interactions predictable through clear interfaces, while immutability prevents unexpected mutations.
