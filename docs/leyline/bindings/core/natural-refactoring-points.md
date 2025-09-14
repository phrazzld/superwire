---
id: natural-refactoring-points
last_modified: '2025-06-17'
version: '0.2.0'
derived_from: simplicity
enforced_by: 'code review, architectural review, refactoring guidelines'
---

# Binding: Recognize and Wait for Natural Refactoring Points

Wait for clear refactoring opportunities to emerge naturally through code evolution rather than forcing premature abstractions. Refactor when boundaries become obvious, patterns stabilize, and the "third instance" rule creates genuine duplication worth eliminating.

## Rationale

Premature abstraction is one of the most expensive mistakes in software development. Grug's wisdom teaches that code needs time to "settle" and reveal its true boundaries. Rushing to abstract after seeing just two similar patterns often creates the wrong abstraction, requiring painful rework when the third use case emerges with different requirements.

Think of code evolution like geological formation—sedimentary layers build up over time until natural fault lines appear where the rock can cleanly split. Similarly, code accumulates features and patterns until clear architectural boundaries emerge. Forcing these splits too early creates brittle abstractions that break under pressure.

Waiting for natural cut points isn't procrastination—it's wisdom gained from experience. The "third time" rule exists because three instances provide enough data to identify the true pattern and its variations. Two instances often mislead you into creating abstractions that fail when confronted with real-world complexity.

## Rule Definition

**MUST** apply the "Rule of Three" before extracting abstractions: wait until you have at least three concrete implementations before creating a shared abstraction.

**MUST** identify natural boundaries by looking for:
- Stable interfaces that haven't changed across multiple features
- Clear separation of concerns that multiple developers recognize
- Repeated requests for the same type of change in the same area
- Pain points that consistently emerge in the same location

**SHOULD** wait for these stabilization signals:
- The same pattern appears in different contexts with similar requirements
- Team members independently identify the same boundaries
- Feature requests naturally cluster around specific areas
- Testing becomes easier when code is organized along certain lines

**SHOULD** resist refactoring when:
- You only have two similar implementations
- The requirements are still rapidly evolving
- The abstraction would save fewer than 10 lines of meaningful code
- The abstraction introduces coupling between previously independent components

## Implementation Strategy

### Recognizing Natural Cut Points

**Code Settlement Indicators:**
```typescript
// ❌ PREMATURE: Two similar functions, different contexts
class OrderService {
  processWebOrder(order: WebOrder) {
    // Implementation A
  }

  processMobileOrder(order: MobileOrder) {
    // Similar but subtly different implementation
    // DON'T abstract yet - wait for third case
  }
}

// ✅ NATURAL CUT POINT: Third instance reveals true pattern
class OrderService {
  processWebOrder(order: WebOrder) { /* ... */ }
  processMobileOrder(order: MobileOrder) { /* ... */ }
  processApiOrder(order: ApiOrder) { /* ... */ }

  // NOW the common pattern is clear:
  // All need validation, pricing, and fulfillment
  // Abstract the stable core, parameterize the variations
}
```

**Boundary Recognition Patterns:**
- **Data Flow Boundaries:** Clear input/output contracts that remain stable
- **Responsibility Boundaries:** Functions that naturally group by business concern
- **Change Frequency Boundaries:** Code that changes together should be together
- **Team Knowledge Boundaries:** Areas where specific team members consistently work

### Timing Indicators

**Ready to Refactor When:**
1. **Third Instance Emerges:** You now have enough data to see the real pattern
2. **Stable Interfaces:** The contracts between components haven't changed in several features
3. **Consistent Pain Points:** Multiple developers hit the same friction points
4. **Natural Team Conversations:** People start talking about "that authentication stuff" or "the report generation area"

**Wait Longer When:**
1. **Requirements Shifting:** Business rules still changing rapidly
2. **Single Use Case:** Only one context actually needs the abstraction
3. **Forced Similarities:** Code looks similar but serves different business purposes
4. **Complex Coupling:** Abstraction would require tight coupling between independent areas

### Practical Decision Framework

**Before Creating Any Abstraction, Ask:**

1. **Pattern Stability:** "Has this pattern appeared consistently across 3+ independent implementations?"
2. **Boundary Clarity:** "Can I draw a clear line around what's in vs out of this abstraction?"
3. **Future Flexibility:** "Will this abstraction make adding new variations easier or harder?"
4. **Team Understanding:** "Do other developers see the same boundaries I see?"

## Anti-Patterns to Avoid

### Premature Abstraction Signals

**❌ "Two Strikes" Abstraction:**
```typescript
// BAD: Abstracting after two similar cases
function sendEmail(to: string, subject: string, body: string) { /* ... */ }
function sendSMS(to: string, message: string) { /* ... */ }

// DON'T create MessageSender interface yet!
// Wait for third communication method to see real pattern
```

**❌ Forced Generic Solutions:**
```typescript
// BAD: Over-generalizing without understanding true requirements
interface GenericProcessor<T, R> {
  process(input: T): R;
  validate(input: T): boolean;
  transform(input: T): T;
}

// This looks smart but probably won't fit actual use cases
```

**❌ Speculation-Driven Refactoring:**
```typescript
// BAD: Abstracting based on imagined future needs
class FlexibleConfigurableReportGenerator {
  // Hundreds of lines to handle every conceivable report type
  // Most functionality will never be used
}
```

### Natural Cut Point Examples

**✅ Data Validation Boundaries:**
```typescript
// Three different validation needs emerged naturally
validateUser(user: User): ValidationResult
validateProduct(product: Product): ValidationResult
validateOrder(order: Order): ValidationResult

// NOW extract: ValidationRule<T> interface makes sense
```

**✅ Processing Pipeline Patterns:**
```typescript
// Pattern emerged across three different domains
processPayment: validate → transform → execute → notify
processOrder: validate → transform → execute → notify
processRefund: validate → transform → execute → notify

// NOW abstract: ProcessingPipeline<T> is clearly beneficial
```

## Success Metrics

**Quality Indicators:**
- Abstractions remain stable through multiple feature additions
- New implementations fit naturally into existing abstractions
- Refactored code is easier to test and understand
- Team velocity increases in refactored areas

**Warning Signs:**
- Abstractions require frequent modification for new features
- New use cases force awkward compromises in the abstraction
- Developers avoid using existing abstractions
- More code required to use abstraction than to duplicate logic

## Migration Strategy

**For Existing Premature Abstractions:**
1. Identify abstractions with only 1-2 real implementations
2. Consider "un-refactoring" back to concrete implementations
3. Wait for genuine third use case before re-abstracting
4. Document the lessons learned for future decisions

**For New Development:**
1. Start with concrete implementations
2. Note similarities but resist immediate abstraction
3. Look for the third case and validate the pattern
4. Refactor when boundaries become undeniably clear

## Related Patterns

**YAGNI Principle:** Don't create abstractions you aren't going to need. Wait for clear evidence of necessity.

**Continuous Refactoring:** Once natural cut points are identified, refactor immediately. Don't let good opportunities accumulate into technical debt.

**Extract Common Logic:** When you do refactor, follow DRY principles to create single sources of truth, but only after confirming the pattern is real.
