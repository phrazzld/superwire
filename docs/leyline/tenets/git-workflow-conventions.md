---
id: git-workflow-conventions
last_modified: '2025-06-24'
version: '0.2.0'
---
# Tenet: Git Workflows Should Follow Strong Conventions

Establish clear, opinionated Git workflows that eliminate unnecessary decisions and guide teams toward successful collaboration patterns. Just as Rails provides "the Rails way" for building web applications, your Git workflow should provide "the team way" for managing code changes—reducing cognitive overhead through sensible defaults while maintaining flexibility where it truly matters.

## Core Belief

Git is an incredibly powerful tool, but that power comes with complexity. The number of possible workflows, branching strategies, and collaboration patterns can be overwhelming. This flexibility, while technically impressive, often leads to decision paralysis and inconsistent practices within teams. Every moment spent debating whether to use Git flow, GitHub flow, or GitLab flow is a moment not spent shipping value to users.

The solution isn't to master every Git command or workflow variation—it's to establish strong conventions that make the right way the obvious way. Just as Rails revolutionized web development by providing sensible defaults for common patterns, teams should adopt Git conventions that encode best practices into daily workflows. These conventions should feel so natural that developers don't even think about them—they just work.

Think of Git conventions like traffic rules. We don't debate whether to drive on the left or right side of the road for each journey—we follow the established convention for our location. This consistency enables smooth traffic flow without constant negotiation. Similarly, consistent Git conventions enable smooth collaboration without constant discussion about process.

The goal isn't to create rigid rules that stifle creativity, but to establish guardrails that guide teams toward success. By making opinionated choices about branch naming, commit messages, merge strategies, and release processes, you free developers to focus on what truly matters: solving problems and delivering value. The best Git workflow is the one that developers barely notice because it stays out of their way while quietly ensuring quality and consistency.

## Practical Guidelines

1. **Choose One Branching Strategy and Stick To It**: Adopt a single, well-defined branching strategy like trunk-based development or GitHub flow. Document it clearly and automate its enforcement. The specific strategy matters less than having everyone follow the same one. Consistency reduces cognitive load and enables automation.

2. **Automate Convention Enforcement**: Don't rely on documentation and good intentions. Use Git hooks, branch protection rules, and CI checks to enforce your conventions automatically. When the tooling guides developers toward the right patterns, following conventions becomes the path of least resistance.

3. **Establish Clear Commit Message Patterns**: Adopt a commit message convention like Conventional Commits and enforce it through tooling. Structured commit messages enable automated changelog generation, semantic versioning, and better historical analysis. The small upfront investment in learning the convention pays massive dividends in automation potential.

4. **Create Predictable Branch Naming**: Use consistent, descriptive branch naming patterns like `feature/issue-123-user-auth` or `fix/issue-456-login-timeout`. This predictability enables automation, improves discoverability, and reduces the mental effort needed to understand what's happening in the repository.

5. **Minimize Merge Complexity**: Favor simple merge strategies that preserve linear history where possible. Rebase feature branches before merging to maintain a clean main branch history. Complex merge strategies and tangled histories create cognitive overhead without proportional benefit.

6. **Ship Continuously with Confidence**: Establish conventions that support frequent, safe deployments. Short-lived branches, comprehensive automated testing, and feature flags enable continuous delivery without sacrificing stability. The goal is to make releasing code as boring and predictable as possible.

## Warning Signs

- **Endless debates about Git workflows** instead of focusing on building features. If your team spends more time discussing process than following it, you need stronger conventions.

- **Inconsistent practices across team members** where everyone has their own interpretation of the "right" way to use Git. This inconsistency creates friction and prevents effective automation.

- **Complex branching strategies** with multiple long-lived branches, elaborate merge procedures, and intricate rules about when to use different branches. Complexity in version control often indicates complexity in development process.

- **Manual enforcement of standards** through code review comments about commit message format or branch naming. If humans are enforcing conventions that machines could enforce, you're wasting valuable human attention.

- **Fear or reluctance around Git operations** where developers avoid rebasing, cherry-picking, or other operations because they're worried about making mistakes. Good conventions with safety nets should make Git operations feel safe and reversible.

- **Commit messages like "fix", "updates", or "WIP"** that provide no context about changes. Poor commit hygiene indicates absent or unenforced conventions.

- **Long-lived feature branches** that diverge significantly from the main branch, creating painful merge conflicts and integration challenges.

## Related Tenets

- [Automation](automation.md): Git conventions enable powerful automation around versioning, releases, and deployment. Well-structured workflows become the foundation for continuous delivery.

- [Simplicity](simplicity.md): Simple, consistent Git workflows reduce cognitive overhead and let developers focus on solving problems rather than managing version control complexity.

- [Explicit over Implicit](explicit-over-implicit.md): Clear Git conventions make collaboration patterns explicit rather than relying on tribal knowledge or implicit understanding.

- [Deliver Value Continuously](deliver-value-continuously.md): Strong Git conventions enable frequent, safe releases by establishing predictable patterns for integration and deployment.

- [Document Decisions](document-decisions.md): Git conventions should be clearly documented, but more importantly, they should be encoded in tooling that makes the conventions self-enforcing.
