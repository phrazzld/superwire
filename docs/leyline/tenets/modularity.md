---
id: modularity
last_modified: '2025-05-08'
version: '0.2.0'
---
# Tenet: Modularity is Mandatory

Construct software from small, well-defined, independent components with clear
responsibilities and explicit interfaces. The complexity of the whole system becomes
manageable when broken down into cohesive modules that do one thing well and compose
together cleanly.

## Core Belief

Modularity is the fundamental approach for taming complexity. Design your code as well-defined, independent components that humans can comprehend and maintain. Our brains have limited capacity—modularity works with this constraint.

Modularity creates natural seams for independent development, testing, deployment, and evolution. Find the natural boundaries in your problem domain and create components that reflect those boundaries with clear purpose, well-defined interfaces, and hidden implementation details.

## Practical Guidelines

1. **Do One Thing Well**: Each module should have a single, clear responsibility. Can you describe what it does in one sentence without using 'and'?

2. **Define Clear Boundaries**: Modules should have well-defined interfaces and hide implementation details. Could someone use this correctly without understanding how it works internally?

3. **Minimize Coupling**: Reduce dependencies between modules. Use abstract interfaces rather than concrete implementations. Does this module really need to know about that other module?

4. **Maximize Cohesion**: Group related functionality together. Do all parts of this module work together to serve a unified purpose?

5. **Design for Composition**: Smaller modules should combine easily to build complex functionality. Can this be composed from simpler, more focused pieces?

## Warning Signs

- **Monolithic components** handling multiple concerns without clear internal boundaries
- **"God objects"** that know too much about the system with methods addressing many different concerns
- **Tangled dependencies** creating a complex web rather than clear hierarchy or structure
- **Changes frequently breaking** seemingly unrelated parts of the system
- **Testing requiring complex setup** or extensive mocking of other components
- **Difficulty onboarding** new team members to specific areas of the codebase
- **Circular dependencies** between modules (A depends on B depends on C depends on A)
- **Inappropriate information sharing** between modules, exposing internal details or sharing mutable state

## Related Tenets

- [Simplicity](simplicity.md): Breaking complex systems into focused modules makes each part simpler and more comprehensible
- [Testability](testability.md): Modular design is a prerequisite for effective testing—well-defined modules are easier to test in isolation
- [Explicit over Implicit](explicit-over-implicit.md): Modularity works best when interfaces between modules are explicit and clearly defined
- [Maintainability](maintainability.md): Modularity supports maintainability by making it easier to understand and modify specific parts without impacting the whole
