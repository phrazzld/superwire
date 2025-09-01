---
id: value-driven-prioritization
last_modified: '2025-06-09'
version: '0.2.0'
derived_from: product-value-first
enforced_by: 'feature specification validation & code review'
---
# Binding: Value-Driven Development Prioritization

Require explicit value justification for all development work before implementation begins. Every feature, refactoring task, and technical improvement must demonstrate clear connections to user benefits or business outcomes that serve users.

## Rationale

This binding directly implements our product-value-first tenet by establishing concrete criteria for development decisions, preventing the accumulation of technical work that serves engineering preferences rather than user needs. By requiring explicit value justification, it creates a systematic filter that eliminates bikeshedding, overengineering, and speculative development before they consume development resources.

Think of this binding as a quality gate that ensures development effort flows toward maximum user impact. Just as financial investments require business cases with projected returns, code investments should require clear articulations of user benefit. This approach prevents the common pattern where technical teams drift toward solving interesting engineering problems while actual user problems remain unaddressed.

The binding specifically targets the tendency for development teams to pursue technical sophistication for its own sake. While engineering excellence has value, that value must be traceable to user outcomes within a reasonable timeframe. This discipline helps teams maintain focus on delivering working software that solves real problems rather than impressive software that solves theoretical ones.

## Rule Definition

This binding establishes specific requirements and prohibited patterns for development prioritization decisions:

### Value Justification Requirements

All proposed development work must include explicit documentation of:

- **User Impact Statement**: Clear description of how the work improves specific user experiences, workflows, or outcomes
- **Success Metrics**: Measurable criteria that define successful delivery from the user perspective
- **Timeline Justification**: Explanation of why this work should be prioritized now rather than deferred
- **Alternative Analysis**: Brief consideration of simpler approaches that might achieve similar user value with less complexity

### Prohibited Development Patterns

The following justifications are insufficient for prioritizing development work:

- **Technology-driven rationales**: "We should use X because it's modern/popular/interesting"
- **Theoretical scaling**: "We might need this if we grow significantly"
- **Best practices compliance**: "Industry standards recommend this approach"
- **Engineering satisfaction**: "This would be more elegant/clean/proper"
- **Resume building**: "This would be good experience with advanced techniques"
- **Cargo cult development**: "Other successful companies do this"

### Evaluation Questions

Before approving any development work, apply these decision criteria:

- "Would users notice if we didn't do this work within the next six months?"
- "Can we measure success in terms that matter to users, not just technical metrics?"
- "Is this solving a demonstrated problem or a hypothetical one?"
- "Would simpler alternatives provide equivalent user value?"
- "Are we building this because users need it or because engineers want it?"

### Permitted Exceptions

Value justification requirements may be relaxed in limited circumstances:

- **Technical debt with measured impact**: When specific technical issues demonstrably slow feature delivery or degrade user experience
- **Security vulnerabilities**: When addressing confirmed security risks that could harm users
- **Regulatory compliance**: When legal requirements mandate specific technical implementations
- **Infrastructure scalability**: When current systems cannot support existing user load (not theoretical future load)

## Practical Implementation

Here are concrete strategies for applying value-driven prioritization throughout your development process:

1. **Establish Feature Specification Gates**: Create mandatory documentation requirements for all new development work that explicitly connect technical implementation to user value. Require product specifications to include user journey maps showing how proposed changes improve specific workflows, success metrics that can be measured after deployment, and competitive analysis demonstrating user-relevant advantages. Make technical elegance or adherence to abstract principles insufficient justification for feature approval.

2. **Implement Value-First Code Review Process**: Extend code review criteria beyond technical correctness to include value validation. Train reviewers to ask "What user problem does this solve?" and "Could we achieve the same user outcome more simply?" Require code authors to include value justification in pull request descriptions, especially for refactoring or architectural changes. Reject technically correct implementations that don't serve clear user needs.

3. **Practice Minimum Viable Implementation First**: Always start with the simplest implementation that delivers the core user value, then iteratively add complexity only when user feedback or usage data demonstrates need. Use feature flags to deploy basic implementations and gather real user behavior data before building more sophisticated versions. This approach ensures complexity is added based on actual user needs rather than anticipated ones.

4. **Maintain Explicit Deferred Work Registry**: Document technical improvements that were considered but deferred due to unclear user value, along with specific criteria that would trigger reconsideration. Include the original reasoning for deferral and measurable conditions that would justify prioritizing the work. Review this registry quarterly to see if user needs have evolved to make previously deferred work valuable.

5. **Establish User-Centric Success Metrics**: Define success criteria for all development work in terms that directly relate to user experiences rather than purely technical metrics. Track user task completion rates, satisfaction scores, support ticket reduction, and workflow efficiency improvements rather than just code coverage, performance benchmarks, or architectural compliance. Use these metrics to validate that completed work actually delivered anticipated user value.

6. **Regular Value Audit Process**: Periodically review existing features and technical implementations to identify work that was built but never provided meaningful user value. Track usage analytics for all features and consider simplifying or removing functionality that doesn't serve active user needs. Use these audits to refine value assessment criteria and improve future prioritization decisions.

## Examples

```typescript
// ❌ BAD: Over-engineered notification system built for theoretical requirements
interface NotificationSystem {
  // Speculative: No current need for multiple delivery channels
  channels: Array<'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'teams'>;

  // Speculative: No current need for complex scheduling
  scheduling: {
    immediate: boolean;
    delayed: Date;
    recurring: CronExpression;
    timezone: string;
    businessHoursOnly: boolean;
  };

  // Speculative: No current need for A/B testing notifications
  variants: Array<{
    name: string;
    template: string;
    targetPercentage: number;
    successMetrics: Array<string>;
  }>;

  // Speculative: No current need for complex analytics
  analytics: {
    deliveryTracking: boolean;
    openRateTracking: boolean;
    clickThroughTracking: boolean;
    conversionTracking: boolean;
    cohortAnalysis: boolean;
  };
}

// ✅ GOOD: Simple notification that solves immediate user need
interface NotificationSystem {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendPasswordReset(email: string, resetLink: string): Promise<void>;
  sendWelcomeMessage(email: string, userName: string): Promise<void>;
}

// Add complexity only when users demonstrate need:
// - Additional channels when users request them
// - Scheduling when users need delayed notifications
// - Analytics when measuring notification effectiveness becomes important
```

```python
# ❌ BAD: Complex configuration system without demonstrated variability needs
class DatabaseConfig:
    def __init__(self):
        # Speculative: No current need for connection pooling
        self.connection_pools = {
            'read': {'min': 5, 'max': 20, 'timeout': 30},
            'write': {'min': 2, 'max': 10, 'timeout': 60},
            'analytics': {'min': 1, 'max': 5, 'timeout': 120}
        }

        # Speculative: No current need for read replicas
        self.read_replicas = [
            {'host': 'replica1.db', 'weight': 0.6, 'region': 'us-east'},
            {'host': 'replica2.db', 'weight': 0.4, 'region': 'us-west'}
        ]

        # Speculative: No current sharding requirements
        self.sharding_config = {
            'strategy': 'consistent_hash',
            'shard_count': 16,
            'rebalance_threshold': 0.8,
            'migration_batch_size': 1000
        }

# ✅ GOOD: Simple configuration that meets current user needs
class DatabaseConfig:
    def __init__(self, host: str, port: int, database: str,
                 username: str, password: str):
        self.host = host
        self.port = port
        self.database = database
        self.username = username
        self.password = password

    def get_connection_string(self) -> str:
        return f"postgresql://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}"

# Add complexity when user needs require it:
# - Connection pooling when performance testing shows bottlenecks
# - Read replicas when user load requires horizontal scaling
# - Sharding when data volume impacts user experience
```

```javascript
// ❌ BAD: Elaborate state management for simple application
class AppStateManager {
  constructor() {
    // Speculative: No current need for time travel debugging
    this.stateHistory = [];
    this.maxHistorySize = 100;
    this.currentHistoryIndex = -1;

    // Speculative: No current need for complex persistence
    this.persistenceConfig = {
      localStorage: true,
      sessionStorage: true,
      indexedDB: true,
      encryption: true,
      compression: true,
      versionMigration: true
    };

    // Speculative: No current need for cross-tab synchronization
    this.crossTabSync = {
      enabled: true,
      conflictResolution: 'last-write-wins',
      debounceMs: 300,
      broadcastChannel: 'app-state-sync'
    };

    // Speculative: No current need for complex validation
    this.validationRules = new Map();
    this.middlewareStack = [];
    this.subscribers = new WeakMap();
  }
}

// ✅ GOOD: Simple state management that solves current user needs
class AppState {
  constructor() {
    this.user = null;
    this.isLoading = false;
    this.errorMessage = null;
    this.listeners = [];
  }

  setUser(user) {
    this.user = user;
    this.notifyListeners();
  }

  setLoading(loading) {
    this.isLoading = loading;
    this.notifyListeners();
  }

  setError(error) {
    this.errorMessage = error;
    this.notifyListeners();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this));
  }
}

// Add complexity when users demonstrate need:
// - Persistence when users lose work due to browser refreshes
// - History when users need undo functionality
// - Cross-tab sync when users work in multiple tabs
// - Validation when user input errors become problematic
```

## Related Bindings

- [yagni-pattern-enforcement](../../docs/bindings/core/yagni-pattern-enforcement.md): YAGNI principles directly support value-driven prioritization by preventing speculative development that doesn't serve immediate user needs. Both bindings work together to ensure development effort focuses on demonstrated requirements rather than imagined future scenarios. Value-driven prioritization provides the "why" criteria while YAGNI provides the "when" discipline.

- [immutable-by-default](../../docs/bindings/core/immutable-by-default.md): Immutability patterns support value-driven development by reducing the complexity overhead that can distract from user-focused work. When you minimize mutable state complexity, more development bandwidth becomes available for delivering user value rather than debugging state-related issues. Both bindings push toward solutions that are simple and reliable by default.

- [pure-functions](../../docs/bindings/core/pure-functions.md): Pure functions align with value-driven prioritization because they naturally resist over-engineering and make user-facing functionality easier to understand and test. When core logic is implemented as pure functions, it becomes easier to focus on user outcomes rather than managing complex side effects and state interactions that don't directly serve users.
