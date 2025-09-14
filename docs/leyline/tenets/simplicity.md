---
id: simplicity
last_modified: '2025-06-17'
version: '0.2.0'
---
# Tenet: Simplicity Above All

Prefer the simplest design that solves the problem completely. Complexity is the root
cause of most software defects, maintenance challenges, and cognitive overload.
Rigorously seek solutions with the fewest moving parts.

## Core Belief

Simplicity is a fundamental requirement for maintainable software. Simple code is easier to understand, debug, and extend when requirements change.

Complexity is like debt—it accrues interest over time. Complex solutions create exponential growth in mental overhead. Complexity feeds on itself, growing with each "small" addition until simple functions require reference manuals and classes are riddled with conditional logic.

Pursue elegance in simplicity—find solutions that solve problems completely with the fewest moving parts. Distinguish between essential complexity (inherent in the problem) and accidental complexity (introduced by implementation choices). Choose boring, obvious solutions over clever ones.

## Practical Guidelines

1. **Apply YAGNI Rigorously**: Question every piece of code not solving an immediate, demonstrated need. Ask "Do we have concrete evidence we'll need this?" If not, defer it.

2. **Minimize Moving Parts**: Each component, abstraction, or dependency can break and needs maintenance. Ask "What value does this add? Is there a simpler way?"

3. **Value Readability Over Cleverness**: Code is read more than written. Prioritize clear, readable code over terse or clever approaches. Will someone unfamiliar understand what it does and why?

4. **Distinguish Complexity Types**: Essential complexity (inherent in the problem) vs accidental complexity (from implementation choices). Ruthlessly eliminate accidental complexity.

5. **Refactor Towards Simplicity**: Codebases drift toward complexity over time. Make simplification continuous practice. Regularly ask "How could this be simplified?"

6. **Ship Good-Enough Software**: Perfect software is the enemy of useful software. Focus on meeting actual user needs rather than theoretical perfection.

7. **Use Tracer Bullets**: Create minimal end-to-end implementations first to validate assumptions about integration points early, when changes are cheap.

## Warning Signs

- **Over-engineering solutions** by creating elaborate frameworks for simple problems
- **Designing for imagined future requirements** rather than actual needs ("We might need to..." without concrete use cases)
- **Premature abstraction** before seeing multiple concrete use cases (wait until you see the same pattern three times)
- **Implementing overly clever or obscure code** that requires significant mental effort to understand
- **Deep nesting (> 2-3 levels)** of conditionals, loops, or functions
- **Excessively long functions/methods** that handle multiple responsibilities
- **Components violating Single Responsibility Principle**, trying to handle multiple concerns
- **Hearing justifications like "I'll make it generic so we can reuse it later"** without immediate demonstrated need

## Related Tenets

- [Modularity](modularity.md): Breaking systems into focused components creates simple, well-structured architectures
- [Explicit over Implicit](explicit-over-implicit.md): Explicitness reduces mental overhead by making code behavior clear and obvious
- [Testability](testability.md): Simple code is inherently more testable through focused components and minimal dependencies
- [Maintainability](maintainability.md): Simple systems are easier to understand, modify, and extend over time
- [Empathize With Your User](empathize-with-your-user.md): User empathy drives simpler solutions that are easier to understand and navigate
- [Product Value First](product-value-first.md): Value focus eliminates complexity that doesn't serve users or business needs
