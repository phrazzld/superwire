---
id: version-control-workflows
last_modified: '2025-06-09'
version: '0.2.0'
derived_from: automation
enforced_by: 'git branch protection, automated merge policies, CI/CD integration, pull request templates'
---
# Binding: Establish Systematic Version Control Workflows

Implement automated version control workflows that enforce consistent branching strategies, code review processes, and release management practices. Create systematic approaches to collaboration that maintain code quality while enabling rapid, safe iteration and deployment.

## Rationale

This binding applies our automation tenet to version control collaboration, transforming ad-hoc manual processes into systematic, automated workflows. Manual version control processes relying on developer memory and inconsistent review practices break down as teams grow. Automated workflows enforce consistent practices regardless of team size, enabling predictable, high-quality collaboration that scales effectively.

## Rule Definition

**Core Requirements:**

- **Trunk-Based Development**: Short-lived feature branches (1-3 days) with frequent main branch integration
- **Automated Branch Protection**: Prevent direct commits, require status checks and reviews before merging
- **Conventional Commit Standards**: Structured commit messages enabling automated changelog and semantic versioning
- **Systematic Code Review**: Required reviewers, review templates, and quality gate integration
- **Automated Release Management**: Automated changelog generation and version determination
- **Merge Conflict Prevention**: Frequent integration and automated conflict detection

**Essential Components:**
- Branch protection with status checks
- Pull request templates and reviewer assignment
- Conventional commit validation
- Automated changelog and versioning
- Release automation with deployment integration

## Practical Implementation

**Comprehensive Version Control Workflow Setup:**

1. **Branch Protection Configuration**: Prevent direct commits, require reviews and status checks
2. **Conventional Commit Enforcement**: Structured commit messages for automation
3. **Pull Request Templates**: Standardized review processes and checklists
4. **Automated Reviewer Assignment**: CODEOWNERS-based review routing
5. **Release Automation**: Automated changelog and semantic versioning

**Comprehensive Workflow Configuration:**

```yaml
# .github/branch-protection.yml - Complete workflow setup
name: main
protection:
  enforce_admins: true
  required_status_checks:
    strict: true
    contexts:
      - "ci/build"
      - "ci/test"
      - "ci/security-scan"
      - "ci/code-quality"

  required_pull_request_reviews:
    required_approving_review_count: 2
    dismiss_stale_reviews: true
    require_code_owner_reviews: true
    dismissal_restrictions:
      teams: ["maintainers"]

  restrictions:
    teams: ["core-team"]
    apps: ["dependabot"]
  allow_force_pushes: false
  allow_deletions: false
```

```gitignore
# .github/CODEOWNERS - Automated reviewer assignment
* @team/maintainers
/src/frontend/ @team/frontend-team
/src/backend/ @team/backend-team
/src/auth/ @team/backend-team @team/security
/.github/workflows/ @team/devops
/docs/ @team/technical-writers
```

```markdown
<!-- .github/pull_request_template.md -->
## Pull Request Checklist

### Code Quality
- [ ] Code follows style guidelines
- [ ] No linting errors
- [ ] All tests pass

### Testing & Security
- [ ] Unit tests added/updated
- [ ] No hardcoded secrets
- [ ] Security implications reviewed

### Documentation
- [ ] Code is self-documenting OR docs updated
- [ ] Breaking changes documented
- [ ] Changelog entry added

## Description
What this PR accomplishes and why.

## Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
```

```yaml
# Conventional commit validation
commit_message_regex: '^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .{1,50}'

# Automated release workflow
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: google-github-actions/release-please-action@v3
        with:
          release-type: node
          package-name: my-package
```

## Examples

```bash
# ❌ BAD: Inconsistent manual processes
git commit -m "fix"  # Non-conventional commit
git push origin main  # Direct push to main

# ✅ GOOD: Systematic workflow
git checkout -b feature/user-auth
git commit -m "feat(auth): add OAuth integration"
git push origin feature/user-auth
# Create PR with template, automated review assignment
# Merge only after approvals and CI passes
```

## Related Bindings

- [require-conventional-commits.md](../../docs/bindings/core/require-conventional-commits.md): Version control workflows enforce conventional commit standards through automated validation and integration with release processes. Both bindings ensure consistent commit practices that enable reliable automation.

- [automate-changelog.md](../../docs/bindings/core/automate-changelog.md): Version control workflows integrate with automated changelog generation through conventional commits and semantic versioning. Together they eliminate manual release management and ensure accurate, comprehensive release documentation.

- [git-hooks-automation.md](../../docs/bindings/core/git-hooks-automation.md): Git hooks provide local validation of commit standards while version control workflows enforce the same standards at the remote repository level. Both bindings create comprehensive commit quality assurance.

- [ci-cd-pipeline-standards.md](../../docs/bindings/core/ci-cd-pipeline-standards.md): Version control workflows trigger and integrate with CI/CD pipelines through pull request automation and branch protection. Together they create end-to-end automation from code changes through production deployment.

- [development-environment-consistency.md](../../docs/bindings/core/development-environment-consistency.md): Consistent development environments enable reliable version control workflow automation by ensuring all developers have the same tool versions and configurations. Both bindings eliminate environment-related inconsistencies that can cause workflow automation failures.

- [comprehensive-security-automation.md](../../docs/bindings/core/comprehensive-security-automation.md): Version control workflows enforce security policies through branch protection, required security checks, and automated security scanning integration. Together they create systematic security enforcement from code commit through deployment.

- [semantic-versioning.md](../../docs/bindings/core/semantic-versioning.md): Version control workflows enable automated semantic versioning through conventional commit integration and release automation. Both bindings create systematic release management where commit messages drive version increments and changelog generation.
