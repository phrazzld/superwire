---
id: adaptability-and-reversibility
last_modified: '2025-06-16'
version: '0.2.0'
---
# Tenet: There Are No Final Decisions

Design your systems and make your decisions with the understanding that requirements
will change, technologies will evolve, and new information will emerge. Build
flexibility into your architecture and processes so that adapting to change becomes
natural rather than catastrophic.

## Core Belief

Requirements evolve, technologies advance, and contexts shift. The most successful software systems embrace this reality and design for adaptation from the beginning.

Adaptability means making architectural choices that don't lock you into specific technologies or patterns. Build systems that can grow and change direction without requiring complete rewrites. Treat today's decisions as the best choice given current information, while acknowledging that better information may emerge tomorrow.

## Practical Guidelines

1. **Design for Reversibility**: Ask "If this decision was wrong in six months, how hard would it be to change?" Avoid irreversible dependencies and vendor lock-in.

2. **Use Tracer Bullets**: Build small, end-to-end implementations to learn quickly about what works and adjust course based on real feedback.

3. **Prototype to Learn, Then Discard**: Use prototypes to explore unknowns and validate assumptions, not as production foundations.

4. **Externalize Configuration**: Keep business rules and policies outside core code where they can be modified without system changes.

5. **Favor Composition Over Inheritance**: Build from composable parts that can be recombined rather than rigid hierarchies.

6. **Build in Observability**: Design systems that provide visibility into behavior so you can understand usage and identify needed changes.

## Warning Signs

- **Technology Lock-in**: Tight coupling to specific vendors or frameworks that would be expensive to replace
- **Hardcoded Business Rules**: Business logic embedded in code rather than externalized through configuration
- **Monolithic Data Models**: Single, rigid schemas that make evolution expensive and risky
- **Integration Tight Coupling**: Systems requiring coordinated changes across multiple components
- **Fear of Refactoring**: Teams avoiding improvements because changes are too risky or expensive
- **Premature Optimization**: Performance optimizations built before they're proven necessary
- **All-or-Nothing Deployments**: Changes requiring large, coordinated releases instead of incremental updates
- **Irreversible Data Migrations**: Schema changes that can't be rolled back or coexist with old formats

## Related Tenets

- [Simplicity](simplicity.md): Simple systems are easier to modify and evolve. Designing for adaptability often leads to simpler, more focused solutions.

- [Modularity](modularity.md): Modular design creates clear boundaries where changes can be contained. Well-designed modules can be replaced or recombined without affecting the entire system.

- [Explicit over Implicit](explicit-over-implicit.md): Making dependencies explicit makes it clear what needs to change when requirements evolve. Hidden dependencies make systems fragile and difficult to adapt safely.

- [Testability](testability.md): Good test coverage provides the safety net that makes changes less risky. Without tests, teams become afraid to modify systems, reducing adaptability.

- [Deliver Value Continuously](deliver-value-continuously.md): Continuous delivery enables adaptability by making course corrections quick and low-risk. Rapid deployment allows experimentation and learning based on real feedback.
