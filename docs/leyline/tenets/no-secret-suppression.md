---
id: no-secret-suppression
last_modified: '2025-06-15'
version: '0.2.0'
---

# Tenet: No Secret Suppression

Software quality tools—linters, type checkers, test suites, security scanners—represent accumulated wisdom about common problems and best practices. Suppressing their warnings without justification is like covering the warning lights on your car's dashboard: the underlying problems don't disappear, they just become invisible until they cause real damage.

## Core Belief

Quality tools serve as vigilant guardians of your codebase, continuously scanning for patterns that experience has shown to be problematic. When these tools generate warnings, they're trying to save you from future pain. Suppressing these warnings without addressing the underlying issue or providing clear justification is a form of technical debt that compounds over time.

Think of your code quality tools like the dashboard in your car. When the check engine light comes on, you have three choices: fix the problem, understand why it's safe to ignore (and document that decision), or simply put tape over the light. Only the first two are responsible choices. The third option—covering up the warning—doesn't fix anything and makes it harder to notice when real problems occur.

Legitimate cases exist where suppressing warnings makes sense: false positives, temporary workarounds, or intentional rule violations for specific technical reasons. The key difference is transparency and documentation. When you suppress a warning with clear reasoning and context, you've transformed a potentially dangerous secret into a visible, documented exception that future developers can understand and evaluate.

## Practical Guidelines

**Address Root Causes First**: Before suppressing any warning, invest time in understanding what the tool is trying to tell you. Often the fix is simpler than working around the warning, and addressing it improves your code's quality.

**Document All Exceptions**: When suppression is justified, always include a comment explaining why the warning is being suppressed, what you've considered, and under what conditions the suppression might be removed. This documentation should be clear enough for a new team member to understand.

**Make Suppressions Visible**: Use suppression mechanisms that are obvious during code review and maintenance. Avoid global configuration changes that hide warnings invisibly across the entire codebase.

**Regularly Audit Suppressions**: Schedule periodic reviews of all suppressed warnings to ensure they're still necessary and properly justified. Remove suppressions that are no longer relevant or where the underlying issue can now be addressed.

**Adapt Global Rules Thoughtfully**: When patterns consistently trigger false positives, consider adjusting your tool configuration rather than suppressing individual instances. Document why global rule changes were made.

## Warning Signs

Watch for these patterns that indicate problematic suppression practices:

- **Wholesale Suppression**: Disabling entire categories of warnings globally without case-by-case evaluation
- **Undocumented Suppressions**: Suppressing warnings without comments explaining the reasoning or providing context
- **Copy-Paste Suppressions**: Suppressing warnings in multiple places without understanding why each case requires suppression
- **Suppression Proliferation**: The number of suppressions growing over time without corresponding removals
- **Defensive Suppression**: Suppressing warnings preemptively to avoid dealing with them rather than because they're inappropriate
- **Legacy Suppression Accumulation**: Old suppressions that remain in the codebase long after the original reason has become irrelevant

## Related Tenets

**[Fix Broken Windows](fix-broken-windows.md)**: Unsuppressed quality issues are the "broken windows" that signal declining standards and encourage further quality degradation.

**[Explicit Over Implicit](explicit-over-implicit.md)**: Documented suppressions with clear reasoning make implicit quality decisions explicit and reviewable.

**[Maintainability](maintainability.md)**: Quality tools and their warnings serve as documentation about potential maintenance hazards that should be preserved, not hidden.

**[Automation](automation.md)**: Quality tools represent automation of expert knowledge and best practices that should be leveraged, not circumvented.

## Related Bindings

- [git-hooks-automation](../bindings/core/git-hooks-automation.md): Automated quality checks that prevent suppressed warnings from being committed
- [no-lint-suppression](../bindings/core/no-lint-suppression.md): Specific implementation of this tenet for linting tools
- [external-configuration](../bindings/core/external-configuration.md): Prevents suppression of configuration-related warnings
- [automated-quality-gates](../bindings/core/automated-quality-gates.md): Quality gates that ensure suppressions are properly reviewed
