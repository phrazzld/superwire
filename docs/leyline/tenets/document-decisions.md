---
id: document-decisions
last_modified: '2025-06-15'
version: '0.2.0'
---

# Tenet: Document Decisions, Not Mechanics

Software development is fundamentally a decision-making process. Each line of code represents choices about architecture, algorithms, trade-offs, and constraints. While code should be self-documenting about what it does, only explicit documentation can preserve why decisions were made and what alternatives were considered.

## Core Belief

Future developers approaching your code are like archaeologists examining ancient artifacts. They can observe what was built, but without documentation, the reasoning, constraints, and context that shaped those decisions are lost forever. When these insights disappear, future maintainers must either guess at the original intent or spend enormous effort reverse-engineering decisions that could have been preserved with simple documentation.

The most valuable documentation doesn't describe how code works—good code should be self-explanatory about its mechanics. Instead, focus on capturing the "why": business requirements that shaped the design, performance constraints that influenced choices, alternative approaches that were considered and rejected, and assumptions about the operating environment. This context is invisible in code but crucial for making informed changes.

Documentation debt is particularly insidious because it compounds silently. Unlike technical debt, which eventually manifests as bugs or performance problems, missing documentation simply makes development slower and more error-prone over time. Teams gradually lose the ability to make confident changes because they lack confidence in understanding the original design intent.

## Practical Guidelines

**Make Code Self-Documenting for Mechanics**: Write clear, expressive code that communicates what it does without requiring explanatory comments. Use meaningful names, well-structured functions, and logical organization to make the implementation transparent.

**Document the Context and Reasoning**: Focus documentation on why decisions were made, what constraints influenced the design, what alternatives were considered, and what assumptions are being made. This context can't be inferred from code alone.

**Record Architectural Decisions**: Use structured formats like Architecture Decision Records (ADRs) to capture significant technical decisions, the problems they solve, alternatives considered, and their consequences. These become invaluable references for future architectural changes.

**Capture Non-Obvious Trade-offs**: Document performance considerations, security implications, compatibility requirements, and other factors that influenced implementation choices. Future developers need this context to make informed modifications.

**Maintain Documentation Freshness**: Treat documentation as a living artifact that evolves with the code. Outdated documentation is worse than no documentation because it actively misleads future developers.

## Warning Signs

Watch for these indicators that decision documentation is lacking:

**Missing Context**:
- Code changes that require extensive investigation to understand the original reasoning
- Repeated debates about design decisions that were settled previously
- Fear of refactoring because the impact of changes is unclear
- Performance optimizations or workarounds without explanation

**Documentation Problems**:
- Comments that only restate what the code does rather than explaining why
- Outdated documentation that doesn't match current implementation
- Missing rationale for architectural patterns or framework choices
- No record of alternatives that were considered and rejected

**Knowledge Loss**:
- Team members becoming bottlenecks because they're the only ones who understand certain decisions
- New team members struggling to understand why code is structured in specific ways
- Repeated mistakes that could have been prevented with documented lessons learned

## Related Tenets

**[Explicit Over Implicit](explicit-over-implicit.md)**: Documenting decisions makes implicit reasoning explicit and reviewable by the team.

**[Maintainability](maintainability.md)**: Good decision documentation is essential for long-term code maintainability and confident evolution.

**[Simplicity](simplicity.md)**: Simple, well-documented designs are easier to understand and modify than complex systems without context.

**[Fix Broken Windows](fix-broken-windows.md)**: Missing or outdated documentation signals declining standards and encourages further degradation of information quality.

**[Build Trust Through Collaboration](build-trust-through-collaboration.md)**: Comprehensive documentation builds team trust by making knowledge accessible to everyone rather than hoarded by individuals.
