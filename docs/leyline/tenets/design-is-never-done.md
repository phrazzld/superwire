---
id: design-is-never-done
last_modified: '2025-07-10'
version: '0.2.0'
---
# Tenet: Design Is Never Done

The initial design for a system or component is almost never the best one. Incremental development requires continuous redesign. Systems must be obvious to work with, and complexity—born from dependencies and obscurity—must be actively fought through ongoing design evolution.

## Core Belief

Software design is an iterative discovery process, not a one-time decision. The best design emerges through continuous refinement as you learn more about the problem space, usage patterns, and implementation realities. Initial designs are educated guesses that must evolve.

Every system contains unknown unknowns—aspects you don't know you don't know. The antidote is to make systems obvious: when something breaks or needs changing, it should be immediately apparent where to look and what to do. Complexity arises from two primary sources: dependencies (what must change together) and obscurity (what is hidden or unclear). Both must be actively managed.

Maintain a mindset of continuous improvement. Every interaction with code is an opportunity to question: "Is this still the best design for what we now know?" Design assumptions that made sense initially may no longer serve the system well. Be vigilant for these moments of realization.

## Practical Guidelines

1. **Embrace Design Evolution**: Accept that your initial design will need refinement. Build with change in mind, using abstractions that can evolve rather than rigid structures that resist modification.

2. **Schedule Design Reviews**: Don't wait for problems to force redesign. Proactively revisit design decisions after major milestones, when patterns emerge, or when the system feels resistant to change.

3. **Make the Implicit Obvious**: Surface hidden assumptions, dependencies, and behaviors. If understanding requires tribal knowledge or deep investigation, the design needs improvement.

4. **Reduce Unknown Unknowns**: Build systems that reveal their own limitations. Good error messages, comprehensive logging, and clear boundaries help discover what you didn't know to look for.

5. **Map Dependencies Explicitly**: Make it obvious what depends on what. Hidden dependencies create cascading failures and maintenance nightmares. Prefer explicit, minimal, and unidirectional dependencies.

6. **Fight Obscurity Actively**: Name things to reveal intent. Structure code to match mental models. Write documentation that emerges naturally from the design. Make the next developer's job obvious.

7. **Refactor Toward Clarity**: When you understand the problem better, update the design to reflect that understanding. Don't let initial misconceptions persist in the codebase.

## Warning Signs

- **"We've always done it this way"** without questioning if it's still the best approach
- **Fear of changing core designs** even when they clearly cause friction
- **Accumulating workarounds** instead of addressing fundamental design issues
- **New team members struggle** to understand system organization or behavior
- **Simple changes require complex modifications** across multiple components
- **Debugging requires extensive system knowledge** rather than following obvious paths
- **Hidden dependencies surface as surprises** during modifications or deployments
- **The same types of bugs keep recurring** suggesting design-level issues

## Related Tenets

- [Adaptability and Reversibility](adaptability-and-reversibility.md): Systems must be built to evolve as requirements and understanding change
- [Explicit over Implicit](explicit-over-implicit.md): Making behavior and dependencies visible reduces obscurity and unknown unknowns
- [Simplicity Above All](simplicity.md): Continuous design improvement drives toward simpler, more obvious solutions
- [Continuous Refactoring](continuous-refactoring.md): Code-level improvements support broader design evolution
- [Observability](observability.md): Systems that explain themselves help identify design improvement opportunities
