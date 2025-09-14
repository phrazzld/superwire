---
id: fix-broken-windows
last_modified: '2025-06-15'
version: '0.2.0'
---

# Tenet: Fix Broken Windows

The broken windows theory, originally from criminology, applies powerfully to software development: small defects and quality issues, left unaddressed, create an environment where larger problems feel acceptable. Fix quality issues immediately when discovered, regardless of their size, to maintain high standards and prevent quality decay.

## Core Belief

Just as a broken window in a building signals neglect and invites further vandalism, unfixed bugs, TODO comments, suppressed warnings, and quality shortcuts in code create a psychological environment where declining standards feel normal. When developers see existing problems being ignored, they unconsciously internalize the message that quality isn't truly a priority, leading to an accelerating decay of overall system health.

This isn't about perfectionism—it's about maintaining the cultural and psychological foundation that keeps quality high. Like tending a garden, consistent attention to small problems prevents them from becoming large ones. A codebase where every issue gets prompt attention maintains a culture of excellence that naturally resists quality degradation.

The broken windows effect operates on both technical and human levels. Technically, small issues often compound—a quick hack becomes a precedent, a suppressed warning hides an emerging pattern, a TODO comment represents deferred work that becomes harder over time. Psychologically, visible problems signal that "good enough" is acceptable, gradually shifting team standards downward.

The key insight is that the cost of fixing problems immediately is almost always lower than the cost of fixing them later, plus the compounding cost of the quality decay they enable. Immediate fixes prevent both the technical debt and the cultural debt that accumulates when problems are allowed to persist.

## Practical Guidelines

**Fix Issues Immediately Upon Discovery**: When you encounter a bug, quality issue, or technical debt, address it before moving on to other work. The window of opportunity for easy fixes closes quickly as context is lost and priorities shift.

**Establish Quality Gates and Visibility**: Use automated tools and processes to make quality issues immediately visible and prevent new problems from being introduced. Make quality status transparent to the entire team.

**Address Root Causes, Not Just Symptoms**: When fixing issues, investigate and address the underlying cause rather than just patching the visible symptom. This prevents similar problems from recurring.

**Create Shared Ownership of Quality**: Foster a team culture where everyone feels responsible for overall code quality, not just their own contributions. Quality should be a shared value, not an individual burden.

**Budget Time for Quality Maintenance**: Explicitly allocate time in development cycles for addressing technical debt, refactoring, and quality improvements. Don't let quality work become something that only happens "when there's time."

## Warning Signs

Watch for these indicators that broken windows are accumulating:

**Visible Technical Debt**:
- TODO comments that persist across multiple development cycles
- Suppressed warnings or disabled quality checks without clear justification
- Workarounds and quick fixes that become permanent
- Degrading test coverage or failing tests that are ignored

**Cultural Indicators**:
- Team discussions that normalize declining quality ("it's good enough for now")
- Reluctance to refactor or improve existing code due to time pressure
- New team members adopting lower quality practices because they're seen as acceptable

**System-Level Signs**:
- Increasing defect rates or customer complaints about reliability
- Development velocity slowing due to accumulated technical complexity
- Feature development that requires working around existing problems

## Related Tenets

**[No Secret Suppression](no-secret-suppression.md)**: Suppressing quality tool warnings without addressing root causes is a classic "broken window" that signals declining standards.

**[Maintainability](maintainability.md)**: Fixing broken windows maintains the long-term health and maintainability of systems by preventing quality decay.

**[Automation](automation.md)**: Automated quality gates help catch and fix broken windows before they become visible to the team and affect culture.

**[Build Trust Through Collaboration](build-trust-through-collaboration.md)**: Shared responsibility for fixing broken windows builds team trust and collective ownership of quality outcomes.
