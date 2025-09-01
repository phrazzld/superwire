---
id: github-actions-deprecation-prevention
last_modified: '2025-06-23'
version: '0.2.0'
derived_from: automation
enforced_by: 'GitHub Actions workflows, pre-commit hooks, CI validation tools'
---

# Binding: GitHub Actions Deprecation Prevention Quality Gates

Implement automated validation checkpoints that prevent CI failures from deprecated GitHub Actions by detecting deprecated actions early and providing clear upgrade guidance. This creates systematic barriers that catch deprecation issues before they impact the development pipeline.

## Rationale

GitHub Actions deprecations cause sudden CI failures that block critical releases. Manual tracking is error-prone and reactive. Automated quality gates provide proactive detection, catching deprecations early with clear upgrade guidance to prevent workflow failures.

## Rule Definition

**Requirements:**
- **Validation Stages:** Pre-commit hooks, PR validation, scheduled scanning, CI integration
- **Deprecation Database:** Action names/versions, deprecation dates, upgrade paths, severity levels
- **Feedback:** Fast, actionable upgrade guidance with exact replacements and breaking changes
- **Maintenance:** Updateable database, emergency override with audit trails

## Implementation Architecture

**Core Components:**
- Validation Tool (`tools/validate_github_actions.rb`)
- Deprecation Database (`tools/github-actions-deprecations.yml`)
- CI Integration (`.github/workflows/validate-actions.yml`)
- Pre-commit Hook Integration

**Deprecation Database Structure:**
```yaml
# tools/github-actions-deprecations.yml
actions/checkout@v3:
  deprecated_since: '2023-12-01'
  reason: 'Superseded by v4 with Node.js 20 support'
  upgrade_to: 'actions/checkout@v4'
  severity: 'low'
```

**CI Workflow Integration:**
```yaml
# .github/workflows/validate-actions.yml
name: Validate GitHub Actions
on:
  push:
    paths: ['.github/workflows/**']
  schedule:
    - cron: '0 9 * * 1'

jobs:
  validate-actions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
      - run: ruby tools/validate_github_actions.rb --verbose
```

## Quality Gate Flow

**1. Pre-commit Validation:**
```bash
if git diff --cached --name-only | grep -q "\.github/workflows/"; then
  ruby tools/validate_github_actions.rb --verbose
fi
```

**2. PR Validation:** Workflow triggers on changes
**3. Scheduled Monitoring:** Weekly deprecation scans
**4. Emergency Override:** `[emergency-deploy]` in commit message

## Severity Levels

**High Severity:** Will cause CI failures - block PRs, fix within 1 week
**Medium Severity:** Missing features/patches - warning in PRs, fix within 1 month
**Low Severity:** Superseded but functional - informational notice, fix within 3 months

## Error Message Examples

```
🚨 DEPRECATED ACTION (HIGH severity)
  File: .github/workflows/ci.yml
  Action: actions/checkout@v1
  Reason: Uses deprecated Node.js 12

🔧 UPGRADE:
  Replace with: actions/checkout@v4
  - uses: actions/checkout@v1
  + uses: actions/checkout@v4
```

## Maintenance & Metrics

**Database Updates:** `ruby tools/validate_github_actions.rb --update`
**Performance Monitoring:** Validation time and cache efficiency
**False Positive Management:** Whitelist for internal/custom actions

**Common Deprecations:**
- `actions/setup-node@v1` → `actions/setup-node@v4`
- `actions/cache@v2` → `actions/cache@v4`
- `actions/checkout@v2` → `actions/checkout@v4`

**Key Metrics:** Detection rate, upgrade time, false positive rate

## Related Bindings

- [automated-quality-gates](automated-quality-gates.md): Foundation quality gate principles
- [git-hooks-automation](git-hooks-automation.md): Pre-commit validation integration
- [fail-fast-validation](fail-fast-validation.md): Early error detection patterns
