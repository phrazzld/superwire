---
id: observability
last_modified: '2025-06-17'
version: '0.2.0'
---

# Tenet: Systems Must Explain Themselves

You can't fix what you can't see. Design every system to provide clear visibility into its behavior, health, and performance. Observability is a fundamental design constraint, not an afterthought.

## Core Belief

Modern distributed systems are too complex for humans to understand through intuition or guesswork. When something goes wrong, you need your system to tell you exactly what happened, where, and why. This means creating systems that explain their own behavior through comprehensive instrumentation.

Like aircraft pilots relying on instrument panels, software systems need instrumentation to reveal their internal state. This transforms reactive firefighting into proactive system management—detecting issues before user impact.

The goal is collecting the right data in the right format to enable rapid understanding and effective action when systems behave unexpectedly.

## Practical Guidelines

**Design for Visibility from Day One**: Build observability into system architecture from the beginning. Ask: "How will I know if this is working?" and "What information will I need when this fails?"

**Implement Comprehensive Correlation**: Ensure all related events connect through correlation identifiers. Every request should carry context allowing tracing through distributed components.

**Make Signals Actionable, Not Noisy**: Focus on signals that enable specific actions. Ask: "If this alerts, what action should someone take?" Avoid vanity metrics.

**Instrument Business Logic, Not Just Infrastructure**: Monitor what matters to users and business outcomes, not just system resources. Track user experience alongside infrastructure metrics.

**Plan for Distributed System Complexity**: Design observability for architectures where requests span multiple services and failures cascade unexpectedly.

## Warning Signs

- **Silent failures** that don't surface until users complain, indicating insufficient error detection.

- **Alert fatigue** from too many false positives, causing teams to ignore monitoring.

- **Debugging by guesswork** when incidents occur, forcing developers to speculate instead of following data trails.

- **Reactive incident response** where problems are discovered through user reports rather than proactive monitoring.

- **Correlation gaps** that prevent tracing requests across service boundaries, making distributed operations incomprehensible.

## Related Tenets

**[Automation](automation.md)**: Observability enables automated monitoring and response systems. You can't automate responses to conditions you can't detect.

**[Testability](testability.md)**: Observable systems are more testable because they provide instrumentation needed to verify behavior and diagnose failures.

**[Maintainability](maintainability.md)**: System visibility improves maintainability by helping developers understand behavior, diagnose issues, and assess change impact.

**[Explicit Over Implicit](explicit-over-implicit.md)**: Observability makes system behavior explicit rather than hidden, transforming implicit states into visible, queryable data.

## Related Bindings

**[Structured Logging](../bindings/core/use-structured-logging.md)**: Provides implementation guidance for the three pillars of observability with specific technical requirements.
