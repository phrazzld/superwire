---
id: avoid-premature-abstraction
last_modified: '2025-06-17'
version: '0.2.0'
derived_from: simplicity
enforced_by: 'code review, architectural review, abstraction guidelines'
---

# Binding: Avoid Premature Abstraction and Over-Engineering

Resist the urge to create abstractions before you understand the true pattern. Concrete, duplicated code that's easy to understand is better than the wrong abstraction that's difficult to change. Apply the "Rule of Three" and wait for genuine complexity before introducing layers of indirection.

## Rationale

Premature abstraction is worse than code duplication because wrong abstractions are harder to fix than duplicated code. Early abstraction makes architectural decisions based on incomplete information, creating impediments that require significant effort to remove.

Wrong abstractions create the illusion of sophistication while making code harder to understand, test, and modify. They look clever until the third use case arrives with requirements that don't fit the abstraction's assumptions.

## Rule Definition

**MUST** apply the "Rule of Three" before creating abstractions: require at least three concrete implementations showing the same pattern before extracting shared abstractions.

**MUST** resist abstraction when you have only:
- Two similar implementations with different contexts
- Speculation about future requirements
- Code that "looks like it might be reusable someday"
- Pressure to appear sophisticated or demonstrate advanced patterns

**SHOULD** prefer duplication over wrong abstractions in these situations:
- Requirements are still evolving rapidly
- The abstraction would couple previously independent components
- The pattern hasn't stabilized across different use cases
- The abstraction saves fewer than 10 lines of meaningful logic

**SHOULD** question any abstraction that requires:
- Complex configuration to handle variations
- Extensive documentation to explain how to use it
- Multiple parameters that are always passed together
- Frequent modification for new use cases

## Implementation Strategy

### Decision Framework for Abstraction

**Before Creating Any Abstraction, Validate:**

1. **Pattern Stability:** Same pattern appears 3+ times in independent contexts with stable interfaces
2. **Complexity Reduction:** Abstraction eliminates more complexity than it creates
3. **Future Flexibility:** Makes adding variations easier without breaking changes

### Warning Signs of Premature Abstraction

**❌ Speculation-Based Abstractions:**
```typescript
// BAD: Building for imagined future needs
interface FlexibleDataProcessor<T, U, V> {
  process<K>(data: T, options: ProcessingOptions<U>, ...): Promise<ProcessedResult<V>>;
}
// Start with concrete implementations instead
```

**❌ Two-Instance Abstractions:**
```typescript
// BAD: Abstracting after seeing only two cases
function sendNotification(type: 'email' | 'sms', message: string, recipient: string) {
  // Wait for third notification type to see real pattern
}
```

**❌ Configuration-Heavy Abstractions:**
```typescript
// BAD: More configuration than actual logic
class GenericValidator {
  constructor(rules, errorHandler, transformers, contextProviders, middleware) {}
}
```

### Healthy Alternatives to Premature Abstraction

**✅ Start with Concrete Implementations:**
```typescript
// GOOD: Three concrete implementations reveal actual pattern
class UserEmailSender {
  async sendWelcomeEmail(user: User): Promise<void> {
    const template = await this.getTemplate('welcome');
    const content = this.personalize(template, user);
    await this.emailService.send(user.email, content);
    await this.trackDelivery('welcome_email', user.id);
  }
}
// After 3 similar classes, pattern emerges: getTemplate → personalize → send → track
// NOW extract EmailSender<T> interface with confidence
```

**✅ Use Simple Utility Functions:**
```typescript
// GOOD: Simple, focused utilities instead of complex abstractions
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateRequired(value: unknown): boolean {
  return value != null && value !== '';
}
// Don't force these into ValidationStrategy<T> pattern yet
```

### Common Premature Abstraction Patterns

**❌ Generic Event Systems:** Built before understanding actual event needs
```typescript
interface Event<T> { type: string; payload: T; metadata: EventMetadata; }
```
**✅ Better:** Start with specific events, abstract when 3+ types show clear patterns

**❌ Over-Configurable Systems:** Flexible before knowing configuration needs
```typescript
interface AppConfig { features: Record<string, FeatureConfig>; experimental: Record<string, unknown>; }
```
**✅ Better:** Start concrete, add options as actual needs emerge

**❌ Generic Repositories:** Built before understanding data access patterns
```typescript
interface Repository<T, K> { find(criteria: SearchCriteria): Promise<T[]>; }
```
**✅ Better:** Start with specific needs, abstract when repositories share meaningful patterns

## Anti-Patterns and Recovery Strategies

**Code Smells:**
- Abstractions used in only 1-2 places
- Complex configuration for simple cases
- Frequent interface changes for new use cases
- Documentation longer than implementation
- Team members avoiding abstraction, duplicating code instead

**Recovery Strategies:**
1. "Un-refactor" back to concrete implementations
2. Document lessons learned for future decisions
3. Wait for genuine third use case before re-abstracting

**Healthy Progression Path:**
1. **Concrete Implementations:** Write specific, clear implementations for each use case
2. **Pattern Recognition:** After 3+ implementations, identify stable patterns
3. **Careful Abstraction:** Extract only stable, well-understood patterns

## Success Metrics

**Healthy Abstraction Indicators:**
- Remain stable through multiple feature additions
- New implementations fit naturally without forcing changes
- Team members use without hesitation
- Reduce overall codebase complexity

**Warning Signs:**
- Require frequent modification for new use cases
- Force awkward compromises
- Documentation grows faster than implementation
- Developers work around instead of using

## Related Patterns

**YAGNI Principle:** Wait for clear evidence before abstracting

**Rule of Three:** Require three concrete examples to identify real patterns vs. coincidental similarities
