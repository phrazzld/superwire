---
id: explicit-over-implicit
last_modified: '2025-06-15'
version: '0.2.0'
---

# Tenet: Explicit Over Implicit

Software development is fundamentally about managing complexity, and explicitness is one of your most powerful tools for keeping that complexity understandable. Make dependencies, control flow, side effects, and contracts visible rather than hidden through "magic" or implicit behavior.

## Core Belief

Every implicit assumption in your code is cognitive debt waiting to be paid. When behavior is hidden behind magic methods, global state, or clever abstractions, you create gaps between what the code appears to do and what it actually does. These gaps accumulate over time, making systems increasingly difficult to understand, debug, and modify.

Think of explicit code like a well-marked map—every important landmark is clearly labeled, paths are obvious, and you can navigate confidently even in unfamiliar territory. Implicit code is like navigating with incomplete directions where crucial turns are unmarked and you discover missing information only when you're already lost.

The small overhead of being explicit pays enormous dividends in maintainability. Making dependencies, side effects, and control flow visible transforms code from a black box that must be reverse-engineered into documentation that explains itself. This explicitness enables confident modifications because you understand exactly what will be affected by any change.

## Practical Guidelines

**Make Dependencies and Control Flow Visible**: Declare all dependencies explicitly and avoid hidden control flow. Use dependency injection instead of global access, explicit conditionals instead of magic method dispatch, and clear function calls instead of implicit behavior. Your code should read like a clear narrative of what it's doing.

**Express Contracts and Side Effects Clearly**: Function signatures should communicate what they expect, what they return, and what side effects they cause. Use types, clear naming, and explicit error handling to document behavior. Avoid functions that silently modify global state or have surprising side effects.

**Choose Clarity Over Convenience**: Resist language features that trade explicitness for brevity when that trade reduces clarity. Sometimes the more verbose solution is better because it makes behavior transparent. Favor explicit configuration over convention when conventions aren't universally understood.

**Use Plain Text When Possible**: Text-based configuration, documentation, and data formats are inherently more explicit than binary or encoded formats. They can be easily read, version-controlled, and debugged without special tools.

**Separate Commands from Queries**: Functions should either change state or return information, not both. This separation makes it explicit when side effects occur and enables reasoning about code behavior without hidden state changes.

**Fail Fast on Invalid Assumptions**: Make invalid states and assumptions immediately visible through explicit validation and error handling. Don't let problems propagate silently through the system where they become harder to diagnose.

## Warning Signs

Watch for these patterns that introduce dangerous implicitness:

**Magic and Hidden Behavior**:
- "Magic" methods that trigger based on naming conventions or reflection
- Clever code that obscures what's actually happening
- Framework magic that makes behavior unpredictable
- Implicit type conversions or coercions that hide problems

**Implicit Dependencies**:
- Global state or singletons that create hidden dependencies
- Configuration assumed to exist without explicit declaration
- Functions that modify state without clear indication
- Code that relies on execution order or timing assumptions

**Complex Inheritance and Misleading Interfaces**:
- Deep inheritance hierarchies that obscure actual behavior
- Method overloading that creates ambiguous call semantics
- Inconsistent naming conventions that mislead about function behavior
- Interfaces that don't accurately represent their implementations

## Related Tenets

**[Simplicity](simplicity.md)**: Explicitness and simplicity work together—explicit code is often simpler to understand because its behavior is transparent.

**[Testability](testability.md)**: Explicit dependencies and side effects make code much easier to test in isolation and with predictable outcomes.

**[Maintainability](maintainability.md)**: Explicit code is inherently more maintainable because future developers can understand what it does without reverse-engineering.

**[Modularity](modularity.md)**: Explicit interfaces and dependencies enable true modularity by making component boundaries and interactions clear.

## Related Bindings

- [fail-fast-validation](../bindings/core/fail-fast-validation.md): Explicit validation prevents silent failures
- [dependency-inversion](../bindings/core/dependency-inversion.md): Makes dependencies explicit and testable
- [interface-contracts](../bindings/core/interface-contracts.md): Explicit contracts between components
