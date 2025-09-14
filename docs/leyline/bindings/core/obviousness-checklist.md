---
id: obviousness-checklist
last_modified: '2025-07-10'
version: '0.2.0'
derived_from: design-is-never-done
enforced_by: 'Code review processes, architectural standards, documentation requirements'
---

# Binding: System Obviousness Checklist

Implement concrete practices that make systems self-evident, reducing unknown unknowns and enabling developers to quickly understand, debug, and modify code without extensive investigation or tribal knowledge.

## Rationale

This binding implements the design-is-never-done tenet's principle of making systems obvious. When systems are obvious, developers can immediately understand what's happening, where to look when issues arise, and how to make changes safely.

Obscurity is a primary source of complexity. It manifests as hidden behaviors, unclear dependencies, misleading names, and buried assumptions. By systematically eliminating obscurity, we reduce cognitive load and prevent the accumulation of unknown unknowns.

## Rule Definition

**MUST** follow naming conventions that reveal intent:
- Variables describe their content, not their type
- Functions describe what they do, not how
- Classes represent domain concepts clearly
- Modules have single, clear purposes

**MUST** make dependencies explicit and visible:
- Constructor injection over hidden instantiation
- Clear import statements at file top
- Explicit configuration over convention
- Documented external dependencies

**MUST** provide contextual error messages:
- Include what was expected
- Show what actually happened
- Suggest potential fixes
- Reference relevant documentation

**SHOULD** structure code to match mental models:
- Folder structure reflects architecture
- Related functionality lives together
- Clear boundaries between layers
- Consistent patterns throughout

**SHOULD** make system behavior observable:
- Meaningful log messages at key points
- Metrics for important operations
- Health checks that explain status

## Implementation Approach

**Start with Names**: Refactor unclear names immediately when discovered.
**Surface Hidden Logic**: Extract implicit behavior into explicit, named concepts.
**Document Surprises**: When something isn't obvious, make it so through code or documentation.
**Test Understanding**: New team members should navigate the codebase easily.

## Implementation Examples

### ❌ Obscure System Design

```typescript
// Bad: Hidden behavior, unclear names, buried logic
class Proc {
  private c: Cache;
  private readonly MAX = 100;

  handle(d: any): void {
    if (this.c.size() > this.MAX) { this.c.clear(); }
    const t = d.ts ? d.ts : Date.now();
    const k = `${d.id}_${t}`;

    if (d.type === 1) {
      this.specialCase(d);
    } else if (d.type === 2) {
      setTimeout(() => this.handle(d), 1000);
      return;
    }

    try {
      this.c.set(k, d);
      this.doWork(d);
    } catch (e) {
      console.log('error');
    }
  }
}
```

### ✅ Obvious System Design

```typescript
// Good: Clear intent, visible behavior, self-documenting
interface EventData {
  id: string;
  timestamp?: number;
  type: EventType;
  payload: unknown;
}

enum EventType {
  IMMEDIATE = 'immediate',
  DEFERRED = 'deferred',
  BATCH = 'batch'
}

class EventProcessor {
  private static readonly CACHE_SIZE_LIMIT = 100;

  constructor(
    private eventCache: EventCache,
    private eventHandler: EventHandler,
    private logger: Logger
  ) {}

  async processEvent(event: EventData): Promise<void> {
    this.logger.info('Processing event', { eventId: event.id, eventType: event.type });

    // Prevent cache overflow by clearing when limit reached
    if (this.eventCache.size() > EventProcessor.CACHE_SIZE_LIMIT) {
      this.logger.warn('Event cache full, clearing old entries');
      await this.eventCache.evictOldest();
    }

    // Handle different event types with clear intent
    switch (event.type) {
      case EventType.IMMEDIATE:
        await this.processImmediately(event);
        break;
      case EventType.DEFERRED:
        await this.scheduleDeferredProcessing(event);
        break;
      case EventType.BATCH:
        await this.addToBatch(event);
        break;
      default:
        throw new UnknownEventTypeError(
          `Unknown event type: ${event.type}. Expected one of: ${Object.values(EventType).join(', ')}`
        );
    }
  }

  private async processImmediately(event: EventData): Promise<void> {
    const cacheKey = this.generateCacheKey(event);
    try {
      await this.eventCache.set(cacheKey, event);
      await this.eventHandler.handle(event);
      this.logger.info('Event processed successfully', { eventId: event.id });
    } catch (error) {
      this.logger.error('Failed to process event', { eventId: event.id });
      throw new EventProcessingError(`Failed to process event ${event.id}: ${error.message}`, { cause: error });
    }
  }

  private generateCacheKey(event: EventData): string {
    return `event_${event.id}_${event.timestamp || Date.now()}`;
  }
}
```

### Making Dependencies Obvious

```typescript
// Bad: Hidden dependencies
class OrderService {
  processOrder(order: Order): void {
    const validator = new OrderValidator();
    const inventory = InventorySystem.getInstance();
    const payment = global.paymentService;
  }
}

// Good: Explicit dependencies
class OrderService {
  constructor(
    private orderValidator: OrderValidator,
    private inventoryService: InventoryService,
    private paymentService: PaymentService,
    private config: OrderConfiguration
  ) {
    this.validateConfiguration();
  }

  private validateConfiguration(): void {
    const required = ['maxOrderSize', 'timeoutSeconds', 'retryAttempts'];
    const missing = required.filter(key => !(key in this.config));
    if (missing.length > 0) {
      throw new ConfigurationError(
        `Missing required configuration: ${missing.join(', ')}. See docs/configuration/orders.md for setup instructions.`
      );
    }
  }
}
```

### Self-Documenting Error Messages

```typescript
// Bad: Cryptic errors
function parseDate(input: string): Date {
  const date = new Date(input);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  return date;
}

// Good: Helpful, actionable errors
function parseDate(input: string): Date {
  const date = new Date(input);
  if (isNaN(date.getTime())) {
    throw new DateParsingError(
      `Cannot parse "${input}" as a date. Expected formats: ISO 8601 (2024-07-10), RFC 2822 (Mon, 10 Jul 2024), or timestamp (1720627200000).`
    );
  }
  return date;
}
```

### Observable System Behavior

```typescript
// Good: Built-in observability
class DataPipeline {
  constructor(private metrics: MetricsCollector, private logger: Logger) {}

  async processBatch(items: DataItem[]): Promise<BatchResult> {
    const batchId = generateBatchId();
    const startTime = Date.now();

    this.logger.info('Starting batch processing', { batchId, itemCount: items.length });

    const results = { successful: 0, failed: 0, skipped: 0 };

    for (const item of items) {
      try {
        await this.processItem(item);
        results.successful++;
      } catch (error) {
        if (error instanceof ValidationError) {
          results.skipped++;
          this.logger.warn('Skipping invalid item', { itemId: item.id });
        } else {
          results.failed++;
          this.logger.error('Failed to process item', { itemId: item.id });
        }
      }
    }

    const duration = Date.now() - startTime;
    this.metrics.record('batch_processing_duration', duration);
    this.metrics.record('batch_items_processed', results.successful);
    this.logger.info('Batch processing complete', { batchId, duration, results });
    return { batchId, ...results };
  }
}
```

## Obviousness Checklist

Use this checklist during code reviews:

```typescript
interface ObviousnessChecklist {
  naming: {
    functionsDescribeWhatNotHow: boolean;
    variablesRevealContent: boolean;
    classesMatchDomainConcepts: boolean;
  };
  structure: {
    folderStructureMatchesArchitecture: boolean;
    relatedCodeLivesTogether: boolean;
    consistentPatterns: boolean;
  };
  dependencies: {
    allDependenciesExplicit: boolean;
    noHiddenGlobals: boolean;
  };
  behavior: {
    errorMessagesActionable: boolean;
    loggingAtKeyPoints: boolean;
  };
  understanding: {
    newDevCanNavigate: boolean;
    purposeClearWithoutDocs: boolean;
  };
}
```

## Common Pitfalls

**❌ Clever Over Clear**: Choosing concise but cryptic code over obvious implementations
**❌ Assumption Hiding**: Burying important assumptions in implementation details
**❌ Inconsistent Patterns**: Using different approaches for similar problems
**❌ Documentation as Excuse**: Using documentation to justify non-obvious code

## Related Standards

- [design-is-never-done](../../docs/tenets/design-is-never-done.md): The principle of avoiding unknown unknowns through obvious design
- [explicit-over-implicit](../../docs/tenets/explicit-over-implicit.md): Making behavior and dependencies visible
- [meaningful-naming](meaningful-naming.md): Specific naming conventions that support obviousness
