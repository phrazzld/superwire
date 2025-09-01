---
id: orthogonality
last_modified: '2025-06-02'
version: '0.2.0'
---
# Tenet: Eliminate Effects Between Unrelated Things

Design components so that changing one does not affect others. When components are
orthogonal, they can be designed, implemented, tested, and modified independently,
dramatically reducing the complexity of development and maintenance.

## Core Belief

Orthogonality is about isolation and independence—ensuring that unrelated components in
your system don't affect each other. When you achieve true orthogonality, you can change
one component without worrying about ripple effects throughout your codebase. This
principle goes beyond simple modularity; it's about eliminating hidden connections,
shared state, and subtle dependencies that create unexpected interactions.

Think of orthogonality like the controls in an airplane cockpit. Moving the throttle
changes speed without affecting direction. Adjusting the rudder changes direction without
affecting speed. Each control has a single, independent effect. If pushing the throttle
also randomly adjusted the rudder, flying would be nearly impossible. Similarly, in
software, when changing one component unexpectedly affects another, development becomes
unpredictable and error-prone.

The power of orthogonal design lies in its multiplicative effect on productivity. When
components are truly independent, you can develop them in parallel, test them in
isolation, and combine them in ways you might not have initially anticipated. Changes
become localized, bugs don't propagate, and the mental model required to work with any
part of the system remains manageable.

Orthogonality differs from modularity in a crucial way: modularity is about how you
organize and structure components, while orthogonality is about how those components
affect each other. You can have a perfectly modular system where modules still interfere
with each other through global state, side effects, or implicit dependencies. True
orthogonality eliminates these hidden connections.

## Practical Guidelines

1. **Eliminate Global and Shared Mutable State**: Global variables and shared mutable
   state are the enemies of orthogonality. When multiple components can read and modify
   the same state, they become implicitly coupled. Prefer passing data explicitly through
   function parameters and return values. When shared state is necessary, encapsulate it
   behind a well-defined interface that controls access and modifications.

1. **Design Components with Single, Well-Defined Purposes**: Each component should have
   one clear responsibility and affect one aspect of the system. When you find a
   component that changes for multiple unrelated reasons, it's likely not orthogonal.
   Ask yourself: "If I change this component, what else might break?" The answer should
   be "nothing that isn't explicitly connected to it."

1. **Keep Interfaces Narrow and Focused**: The interface between components should be
   minimal and explicit. Pass only the data that's needed, and be suspicious of
   interfaces that require extensive knowledge about the component's internals. A good
   interface acts like an airlock—it provides controlled access while maintaining
   isolation between environments.

1. **Avoid Implicit Dependencies and Hidden Channels**: Be wary of components that
   communicate through side channels like the file system, environment variables, or
   timing assumptions. These create invisible coupling that's difficult to reason about
   and test. Make all dependencies explicit and visible in the component's interface.

1. **Layer Your Architecture Orthogonally**: Design your system in layers where each
   layer only knows about the layer directly below it. A change in your database layer
   shouldn't ripple up to your UI, and a change in your UI shouldn't require modifying
   business logic. Each layer should provide a stable interface that insulates the layers
   above from changes below.

## Warning Signs

- **Shotgun Surgery**: When a single logical change requires modifications across
  multiple unrelated files or components, your design lacks orthogonality. Changes
  should be localized to the components directly responsible for the affected
  functionality.

- **Unexpected Test Failures**: When modifying one component causes tests for seemingly
  unrelated components to fail, you have hidden coupling. Orthogonal components can be
  tested in complete isolation without affecting each other.

- **Temporal Coupling**: When components must be used or initialized in a specific order
  that isn't explicitly enforced by their interfaces, you have temporal coupling. Each
  component should be usable independently without relying on implicit sequencing.

- **Feature Envy**: When one component needs extensive knowledge about another
  component's internals or frequently accesses another component's data, they're not
  orthogonal. Each component should work primarily with its own data and responsibilities.

- **Afraid to Make Changes**: When developers are hesitant to modify code because they
  can't predict what else might break, it's a clear sign of poor orthogonality. Changes
  should have predictable, localized effects.

- **Configuration Changes Require Code Changes**: When adjusting configuration
  parameters requires modifying multiple components, those components aren't orthogonal
  to the configuration. Configuration should be injectable without components knowing
  about each other.

- **Parallel Development Difficulties**: When team members can't work on different
  features simultaneously without constantly merging conflicts or breaking each other's
  code, the architecture lacks orthogonality. Independent features should be developable
  independently.

- **Mock Explosion in Tests**: When testing a component requires mocking many other
  components or setting up extensive test fixtures, it indicates excessive coupling.
  Orthogonal components need minimal setup for testing.

## Related Tenets

- [Modularity](modularity.md): While Modularity focuses on organizing code into discrete
  units with clear boundaries, Orthogonality ensures those units don't affect each other
  in unexpected ways. Modularity is about structure; orthogonality is about
  independence. You need both for a well-designed system.

- [Simplicity](simplicity.md): Orthogonal designs are inherently simpler because each
  component can be understood in isolation. When components don't have hidden effects on
  each other, the mental model required to work with them remains manageable.
  Orthogonality is a key strategy for achieving simplicity in complex systems.

- [Testability](testability.md): Orthogonal components are naturally easier to test
  because they can be verified in isolation without complex setup or mocking. The
  ability to test components independently is both a benefit of orthogonality and a
  good measure of whether you've achieved it.

- [Explicit over Implicit](explicit-over-implicit.md): Orthogonality requires making
  all dependencies and effects explicit. Hidden coupling and implicit dependencies are
  antithetical to orthogonal design. These tenets work together to create systems where
  behavior is predictable and clear.
