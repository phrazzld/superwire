---
derived_from: explicit-over-implicit
enforced_by: code review & style guides
id: api-design
last_modified: '2025-05-14'
version: '0.2.0'
---
# Binding: Design Clear, Explicit API Contracts

Design APIs with clear, explicit contracts that fully communicate their behavior, requirements, and limitations. Whether for internal modules, external services, or command-line interfaces, prefer explicitness over convenience or brevity in all API surfaces.

## Rationale

This binding implements our explicit-over-implicit tenet by ensuring that component contracts—the most critical communication points in any system—are thoroughly defined and clearly expressed. When APIs lack explicit contracts, they create hidden knowledge that must be discovered through trial and error, leading to misuse, bugs, and maintenance difficulties. The cost of implicit API design compounds over time and across team boundaries, creating integration problems that are expensive to debug and fix.

## Rule Definition

**Core Requirements:**

- **Complete Contract Definition**: Every API must clearly define inputs (parameters, types, formats, validation rules), outputs (return values, response formats, errors), side effects, performance characteristics, and security requirements
- **Strong Typing and Validation**: Use the most specific types possible and validate inputs at boundaries with clear error messages
- **Comprehensive Documentation**: Include purpose, usage examples, edge cases, and error handling guidance
- **Consistent Patterns**: Apply consistent naming and design patterns across all APIs
- **Evolution Support**: Design for backward compatibility through versioning and opt-in features

**Prohibited Practices:**
- Magic parameters or flag arguments that drastically change behavior
- Overloaded methods that do fundamentally different things
- Hidden side effects not clear from the interface
- Implicit dependencies on global state or environment
- Leaking implementation details into public contracts

**Limited Exceptions:** Internal utility functions with small scope, performance-critical sections where contract complexity creates measurable overhead, or legacy systems where change would be disruptive.

## Practical Implementation

**Comprehensive API Design Example:**

```typescript
// ❌ BAD: Implicit API contract with hidden behaviors
function sendMessage(message, options) {
  // Type confusion: options could be string or object
  const config = typeof options === 'string' ? { recipient: options } : options || {};

  // Hidden global state dependency
  const currentUser = getCurrentUser();

  // Undocumented side effects
  updateMessageCount();
  recordActivity();

  // Magic behavior based on message format
  if (message.startsWith('!')) {
    processCommand(message.substring(1), config);
    return true;
  }
  // Implementation continues...
}

// ✅ GOOD: Explicit API contract with clear boundaries
interface MessageContent {
  text: string;
  attachments?: Attachment[];
}

interface SendMessageOptions {
  recipient: string;
  priority?: 'normal' | 'high';
  broadcast?: boolean;
}

interface CommandOptions {
  broadcast?: boolean;
  requiresAdmin?: boolean;
}

interface MessageDeliveryResult {
  messageId: string;
  deliveredAt: Date;
  recipient: string;
}

interface CommandResult {
  success: boolean;
  output: string;
  executedAt: Date;
}

class MessagingService {
  constructor(
    private readonly currentUser: User,
    private readonly activityLogger: ActivityLogger,
    private readonly deliveryService: DeliveryService
  ) {}

  /**
   * Send a message to a specific recipient
   *
   * @param content - Message content with text and optional attachments
   * @param options - Delivery options including recipient and priority
   * @returns Promise resolving to delivery confirmation
   * @throws MessageValidationError if content is invalid
   * @throws UserNotFoundError if recipient doesn't exist
   * @throws RateLimitError if sending too many messages
   */
  async sendMessage(
    content: MessageContent,
    options: SendMessageOptions
  ): Promise<MessageDeliveryResult> {
    // Input validation
    if (!content.text.trim()) {
      throw new MessageValidationError('Message text cannot be empty');
    }

    if (!options.recipient) {
      throw new MessageValidationError('Recipient is required');
    }

    // Explicit side effect logging
    this.activityLogger.recordActivity({
      type: 'message_sent',
      user: this.currentUser.id,
      details: { recipient: options.recipient }
    });

    return this.deliveryService.send(content, options);
  }

  /**
   * Execute a system command (separate from regular messaging)
   *
   * @param command - Command to execute (without ! prefix)
   * @param options - Command execution options
   * @returns Promise resolving to command execution result
   * @throws CommandNotFoundError if command doesn't exist
   * @throws PermissionError if user lacks required permissions
   */
  async executeCommand(
    command: string,
    options: CommandOptions = {}
  ): Promise<CommandResult> {
    if (!command.trim()) {
      throw new Error('Command cannot be empty');
    }

    if (options.requiresAdmin && !this.currentUser.isAdmin) {
      throw new PermissionError('Admin privileges required for this command');
    }

    // Implementation with explicit error handling
    const result = await this.commandProcessor.execute(command, options);

    this.activityLogger.recordActivity({
      type: 'command_executed',
      user: this.currentUser.id,
      details: { command, success: result.success }
    });

    return result;
  }
}

// Usage is explicit and type-safe
const messagingService = new MessagingService(currentUser, activityLogger, deliveryService);

// Clear, typed function calls
await messagingService.sendMessage(
  { text: "Hello world", attachments: [] },
  { recipient: "user123", priority: "normal" }
);

await messagingService.executeCommand(
  "status",
  { broadcast: true, requiresAdmin: false }
);
```

**API Evolution Strategy:**

```typescript
// Support API evolution through versioning
interface UserServiceV1 {
  getUser(id: string): Promise<User>;
  createUser(data: CreateUserRequest): Promise<User>;
}

interface UserServiceV2 extends UserServiceV1 {
  // New methods don't break V1 clients
  getUserWithPreferences(id: string): Promise<UserWithPreferences>;
  batchCreateUsers(users: CreateUserRequest[]): Promise<User[]>;
}

// Backward-compatible data evolution
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  // New optional fields don't break existing clients
  preferences?: UserPreferences;
  metadata?: Record<string, any>;
}
```

**Validation and Error Handling:**

```typescript
// Explicit input validation with clear error messages
class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validateUserData(data: CreateUserRequest): void {
  if (!data.email?.includes('@')) {
    throw new ValidationError(
      'Email must be a valid email address',
      'email',
      'INVALID_EMAIL_FORMAT'
    );
  }

  if (!data.name || data.name.length < 2) {
    throw new ValidationError(
      'Name must be at least 2 characters long',
      'name',
      'NAME_TOO_SHORT'
    );
  }
}
```

## Related Bindings

- [explicit-over-implicit](../../tenets/explicit-over-implicit.md): This binding directly applies the explicit-over-implicit tenet to API design through concrete practices
- [dependency-inversion](../../docs/bindings/core/dependency-inversion.md): Clear API contracts enable clean interfaces between high-level and low-level components
- [hex-domain-purity](../../docs/bindings/core/hex-domain-purity.md): Explicit APIs create clear boundaries between domain and infrastructure layers
- [interface-contracts](../../docs/bindings/core/interface-contracts.md): API contracts are a specific implementation of interface contracts at system boundaries
