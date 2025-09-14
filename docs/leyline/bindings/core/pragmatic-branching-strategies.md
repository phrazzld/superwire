---
id: pragmatic-branching-strategies
last_modified: '2025-06-24'
version: '0.2.0'
derived_from: simplicity
enforced_by: 'git workflows, branch protection rules, team agreements, automation'
---
# Binding: Adopt Pragmatic Branching Strategies

Choose branching strategies based on team size, release cadence, and actual needs rather than following complex theoretical models. The best branching strategy is the simplest one that solves your actual problems without creating new ones.

## Rationale

This binding implements our simplicity tenet by recognizing that elaborate branching strategies often create more problems than they solve. Too many teams adopt complex branching models like Git Flow because they seem "professional" or "enterprise-ready," without considering whether that complexity serves their actual needs. The result is developers spending more time managing branches than writing code.

Git's branching model is deliberately simple and flexible—branches are just pointers to commits. This simplicity is a feature, not a limitation. When you layer complex workflows on top, you're often working against Git's design rather than with it. A five-layer branching hierarchy with strict rules about what can merge where might look impressive in a diagram, but it creates friction for developers who just want to ship code.

The right branching strategy depends entirely on your context. A team of three doesn't need the same strategy as a team of three hundred. A library released quarterly has different needs than a web service deployed continuously. By choosing strategies that match your actual situation rather than your aspirational complexity, you reduce cognitive overhead and increase development velocity.

## Rule Definition

**Branching Strategy Selection Criteria:**

- **Team Size Considerations**:
  - 1-5 developers: Trunk-based development with direct commits
  - 5-20 developers: Short-lived feature branches with quick integration
  - 20+ developers: Feature branches with staging/integration branches
  - 100+ developers: Consider repository splitting before complex branching

- **Release Cadence Alignment**:
  - Continuous deployment: Trunk-based with feature flags
  - Daily/Weekly releases: Short-lived branches (1-3 days)
  - Sprint releases: Feature branches matching sprint duration
  - Quarterly releases: Release branches with cherry-picked fixes

- **Simplicity Principles**:
  - Minimize the number of long-lived branches
  - Prefer merging forward over cherry-picking backward
  - Avoid branches that exist only for process compliance
  - Delete branches immediately after merging

- **Pragmatic Patterns**:
  - Use `main` (or `master`) as the single source of truth
  - Create branches from and merge back to main
  - Keep feature branches focused and short-lived
  - Use tags for releases instead of permanent branches

## Practical Implementation

1. **Start with Trunk-Based Development**: The simplest strategy that could possibly work:

   ```bash
   # Simplest possible workflow
   git checkout main
   git pull origin main
   # Make small, focused changes
   git add -p  # Stage specific chunks
   git commit -m "fix(auth): validate email format"
   git push origin main

   # For slightly larger changes
   git checkout -b fix/email-validation
   # Make changes
   git commit -m "fix(auth): validate email format"
   git checkout main
   git merge --ff-only fix/email-validation
   git push origin main
   git branch -d fix/email-validation
   ```

2. **Scale to Feature Branches When Needed**: Add complexity only when coordination requires it:

   ```bash
   # When multiple developers work simultaneously
   git checkout -b feature/user-dashboard
   git push -u origin feature/user-dashboard

   # Keep branches up to date with simple rebasing
   git fetch origin
   git rebase origin/main

   # Merge back quickly to avoid divergence
   git checkout main
   git merge --squash feature/user-dashboard
   git commit -m "feat(ui): implement user dashboard (#123)"
   git push origin main
   ```

3. **Use Release Branches Only When Necessary**: For teams that can't deploy directly from main:

   ```bash
   # Create release branch only when preparing release
   git checkout -b release/2.1.0
   git push -u origin release/2.1.0

   # Fix critical issues on release branch
   git checkout -b fix/critical-bug release/2.1.0
   git commit -m "fix(api): prevent data corruption"
   git checkout release/2.1.0
   git merge fix/critical-bug

   # Merge fixes back to main
   git checkout main
   git merge release/2.1.0
   git tag -a v2.1.0 -m "Release version 2.1.0"
   git push origin main --tags

   # Delete release branch after deployment
   git push origin :release/2.1.0
   ```

4. **Implement Environment Branches as Deployment Targets**: When regulatory or process requirements demand it:

   ```bash
   # Environment branches that track deployments
   # main -> staging -> production

   # Deploy to staging
   git checkout staging
   git merge --ff-only main
   git push origin staging
   # Deployment automation triggers

   # After validation, promote to production
   git checkout production
   git merge --ff-only staging
   git push origin production
   # Production deployment triggers

   # These branches only track deployment state
   # All development happens on feature branches
   ```

5. **Avoid Common Anti-Patterns**: Recognize and eliminate complexity that doesn't serve your needs:

   ```bash
   # ❌ AVOID: Complex hierarchical branching
   # develop -> feature -> subfeature -> task
   # Too many levels, too much merge complexity

   # ✅ PREFER: Flat structure
   # main -> feature
   # Maximum two levels, clear merge path

   # ❌ AVOID: Long-lived personal branches
   # john-dev, mary-dev, experimental-work
   # Creates integration nightmares

   # ✅ PREFER: Short-lived, purpose-named branches
   # feature/add-search, fix/memory-leak
   # Clear purpose, limited lifespan

   # ❌ AVOID: Branches for process theater
   # code-review, testing, approval
   # Use PR states, not branches

   # ✅ PREFER: Branches for code isolation
   # feature/risky-refactor
   # Isolate changes, not process steps
   ```

## Examples

```bash
# ❌ BAD: Git Flow for a 3-person startup
git checkout develop
git checkout -b feature/login
# work for weeks
git checkout develop
git merge --no-ff feature/login
git checkout -b release/1.0.0
git checkout -b hotfix/bug-fix master
# Complex branching for a simple team

# ✅ GOOD: Trunk-based for small team
git checkout main
git checkout -b add-login
# work for hours/days
git checkout main
git merge add-login
git push origin main
# Simple, fast, effective
```

```yaml
# ❌ BAD: Complex branch protection for simple needs
protected_branches:
  - pattern: develop
    rules: [complex rules]
  - pattern: release/*
    rules: [more rules]
  - pattern: hotfix/*
    rules: [even more rules]
  - pattern: feature/*
    rules: [different rules]
# Maintenance nightmare, developer friction

# ✅ GOOD: Simple protection for actual risks
protected_branches:
  - pattern: main
    rules:
      require_pr: true
      require_tests: true
      auto_delete_branches: true
# Protect what matters, automate the rest
```

```bash
# ❌ BAD: Process-driven branching
# Branches that exist only to satisfy process
git checkout -b waiting-for-review
git checkout -b passed-qa
git checkout -b ready-to-deploy
# Branches aren't process states!

# ✅ GOOD: State tracked in PR/issue system
# Single feature branch
git checkout -b feature/new-api
# Process tracked in GitHub/GitLab/Jira
# Labels: "needs-review", "qa-approved", "ready-to-deploy"
# Branch deleted after merge
```

## Related Bindings

- [version-control-workflows.md](version-control-workflows.md): Branching strategies are one component of version control workflows. This binding provides the strategic guidance while workflow binding provides the tactical implementation.

- [feature-flag-management.md](feature-flag-management.md): Feature flags enable trunk-based development by decoupling deployment from release. Both bindings work together to simplify branching needs while maintaining control.

- [incremental-delivery.md](incremental-delivery.md): Simple branching strategies support incremental delivery by reducing the overhead of getting changes to production. Both emphasize rapid iteration over complex processes.

- [yagni-pattern-enforcement.md](yagni-pattern-enforcement.md): Complex branching strategies often violate YAGNI by solving problems you don't have. Both bindings encourage solving actual problems rather than theoretical ones.
