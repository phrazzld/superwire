---
id: automation
last_modified: '2025-05-08'
version: '0.2.0'
---
# Tenet: Automation as a Force Multiplier

Treat manual, repetitive tasks as bugs in your process. Invest in automating every
feasible recurring activity to eliminate human error, ensure consistency, and free your
most valuable resource—developer focus and creativity—for solving meaningful problems
rather than performing mechanical tasks.

## Core Belief

Automation respects the scarcity of human attention and creativity. Let machines handle consistent, reliable execution of well-defined processes, freeing humans for creative problem-solving and innovation.

Manual repetitive tasks divert mental energy from core competency. Automation is an investment with compound returns—upfront costs amortize rapidly across team members and time. Automation also serves as executable documentation, forcing explicit process definition that benefits everyone.

## Practical Guidelines

1. **Automate After Second Repetition**: After performing a task manually twice, invest time in automating it. Prioritize based on repetition frequency across team and time.

2. **Prioritize Developer Experience**: Focus on automating daily friction points. Build intuitive, reliable tools that developers want to use, not work around.

3. **Make Automation Visible and Collaborative**: Treat automation code as first-class project code. Store in version control, document clearly, and invite improvements.

4. **Automate Quality Verification**: Prioritize automation that enforces quality standards—tests, linting, security scanning. Make the right way the path of least resistance.

5. **Extend Beyond Code**: Apply automation to project management, communication, and documentation. The biggest gains often come from automating processes around the code.

## Warning Signs

- **Performing the same task manually more than twice** without creating automation
- **Documentation describing manual multi-step processes** with "remember to" phrases
- **Inconsistent environments and "works on my machine" problems** from manual setup
- **Delayed feedback on code quality issues** that should be caught automatically
- **Team members spending time on mechanical tasks** like manual deployments
- **Regular mistakes in routine procedures** that could be eliminated through automation
- **Tribal knowledge about processes** not captured in executable form

## Related Tenets

- [Explicit over Implicit](explicit-over-implicit.md): Automation makes processes explicit by encoding workflows in executable scripts and pipelines
- [Testability](testability.md): Automated testing creates a virtuous cycle—testable systems enable effective automation
- [Simplicity](simplicity.md): Automation reduces cognitive overhead by eliminating repetitive manual procedures
- [Deliver Value Continuously](deliver-value-continuously.md): Continuous delivery requires automation in testing, building, and deployment processes
