---
id: dry-dont-repeat-yourself
last_modified: '2025-06-16'
version: '0.2.0'
---
# Tenet: Every Piece of Knowledge Must Have a Single Source of Truth

Ensure that every piece of knowledge in your system has a single, unambiguous,
authoritative representation. When knowledge exists in multiple places, changes
become expensive, error-prone, and inconsistent. DRY is about knowledge
management, not just avoiding code duplication.

## Core Belief

DRY is about knowledge management and maintaining consistency. When the same knowledge exists in multiple locations, you create a maintenance burden that grows exponentially with each duplication. Every change requires updating multiple places, and human memory is fallible.

DRY goes beyond code duplication—each piece of knowledge (business rules, algorithms, configuration) should have exactly one authoritative source. This makes changes safer and more predictable, reducing cognitive overhead and eliminating bugs from inconsistent updates.

## Practical Guidelines

1. **Identify Knowledge, Not Just Code**: DRY applies to business rules, algorithms, configuration, schemas, and documentation. Ask "What knowledge does this represent, and where should it live?"

2. **Establish Authoritative Sources**: Designate a single location where each piece of knowledge is defined. All other references should derive from this source.

3. **Abstract at the Right Level**: Create abstractions for genuine knowledge duplication, but avoid premature abstraction. Use the rule of three—consider abstracting after the third duplication.

4. **Use Configuration for Variability**: When similar code differs only in parameters, extract those values into configuration. Keep the implementation single, make the parameters external.

5. **Make Dependencies Explicit**: When knowledge depends on other knowledge, make that relationship explicit. Use computed properties or generated code for automatic synchronization.

6. **Document Knowledge Ownership**: Make it clear who owns each piece of knowledge and where it should be modified.

## Warning Signs

- **Shotgun Surgery for Simple Changes**: Small business logic changes requiring modifications in many files
- **Configuration Values Hardcoded in Multiple Places**: Same magic numbers or constants appearing in multiple files
- **Identical or Nearly Identical Functions**: Functions doing the same thing with minor variations
- **Copy-Paste Programming**: Developers regularly copying and modifying existing code for new features
- **Inconsistent Behavior Across Similar Features**: Similar features behaving differently for no business reason
- **Database Schema Duplication**: Same information stored in multiple tables with slight structural differences
- **Documentation That Duplicates Code**: Documentation restating what code does rather than explaining why
- **Manual Synchronization Processes**: Processes requiring manual synchronization between multiple systems

## Related Tenets

- [Simplicity](simplicity.md): DRY helps maintain simplicity by reducing maintenance points, while simplicity makes DRY violations more obvious
- [Explicit over Implicit](explicit-over-implicit.md): DRY ensures single authoritative sources, while explicitness ensures clear relationships and dependencies
- [Maintainability](maintainability.md): DRY directly supports maintainability by making changes easier and safer through single sources of truth
- [Modularity](modularity.md): Modules provide boundaries for knowledge ownership, while DRY prevents inappropriate knowledge leakage across boundaries
