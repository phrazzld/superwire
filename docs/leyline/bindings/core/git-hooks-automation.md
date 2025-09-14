---
id: git-hooks-automation
last_modified: '2025-06-09'
version: '0.2.0'
derived_from: automation
enforced_by: 'pre-commit hooks, git hooks, CI/CD pipelines, automated quality gates'
---
# Binding: Establish Mandatory Git Hooks for Quality Automation

Implement automated git hooks that enforce quality standards at commit time, preventing low-quality code from entering the repository. Create systematic barriers that catch issues immediately when developers have full context, rather than later in the development cycle when fixes are more expensive and disruptive.

## Rationale

Git hooks eliminate manual quality checks by automating validation at commit time when developers have full context. This creates immediate feedback loops that prevent quality issues from propagating, reducing the cost and complexity of fixes compared to catching problems later in CI/CD pipelines.

Automated hooks serve as the first quality gate, catching formatting violations, linting errors, security vulnerabilities, and test failures before they enter the repository. This approach scales team quality standards without relying on manual discipline or memory.

## Rule Definition

**Core Requirements:**
- **Pre-commit Validation**: Automated checks for formatting, linting, security, and correctness
- **Commit Message Enforcement**: Conventional commit standards for changelog automation
- **Secret Detection**: Scan for credentials, API keys, and sensitive information
- **Fast Feedback**: Complete within 30 seconds to maintain workflow
- **Bypass Prevention**: Require documented emergency procedures with audit trails
- **Incremental Validation**: Check only changed files when possible

**Quality Gates:** Formatting, linting, security scanning, commit validation, basic testing, documentation checks

**Emergency Override:** Documented bypass process, team lead approval, issue creation, audit logging

## Implementation Tiers

### Tier 1: Essential (30 min)
- Secret detection, basic formatting, commit message validation, syntax checking
- Immediate security and consistency value with minimal setup

### Tier 2: Enhanced (2-3 hours)
- Add code linting, test execution, dependency auditing, documentation validation
- Comprehensive quality validation after team adaptation

### Tier 3: Advanced (4-6 hours)
- Performance testing, architecture validation, multi-language support, custom rules
- Enterprise-grade automation with full CI/CD integration

## Implementation Guide

**Framework Selection:**
- Node.js: Husky (simple setup)
- Multi-language: pre-commit (extensive ecosystem)
- Performance-focused: lefthook (fastest execution)

**Progressive Setup:**
1. Start with secret detection (highest security impact)
2. Add formatting and commit message validation
3. Integrate language-specific linting and basic testing
4. Synchronize with CI/CD configurations
5. Add custom validation and comprehensive testing
6. Implement bypass auditing for emergency procedures

```yaml
# Essential Setup
default_install_hook_types: [pre-commit, commit-msg]
repos:
  - repo: https://github.com/trufflesecurity/trufflehog
    rev: v3.63.2
    hooks:
      - id: trufflehog
        entry: trufflehog git file://. --since-commit HEAD --only-verified --fail
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-added-large-files
        args: ['--maxkb=500']
  - repo: https://github.com/compilerla/conventional-pre-commit
    rev: v3.0.0
    hooks:
      - id: conventional-pre-commit
        stages: [commit-msg]

# Enhanced Automation (add to above)
  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v8.56.0
    hooks:
      - id: eslint
        files: \.(js|jsx|ts|tsx)$
        args: [--fix]
  - repo: local
    hooks:
      - id: fast-tests
        entry: npm run test:changed
        language: system
```

## Migration Paths

**From No Automation:** Week 1: Essential setup → Week 3: Linting → Week 6: Full Tier 2 → Month 3: Evaluate Tier 3

**From Basic Hooks:** Standardize with framework, add security scanning, version configuration, progressive enhancement

**From CI-Only:** Implement local-first approach, synchronize configurations, move fast checks to hooks, keep comprehensive testing in CI

## Related Bindings

- [automated-quality-gates.md](../../docs/bindings/core/automated-quality-gates.md): First layer of quality automation with immediate feedback
- [require-conventional-commits.md](../../docs/bindings/core/require-conventional-commits.md): Enforces commit message standards
- [no-lint-suppression.md](../../docs/bindings/core/no-lint-suppression.md): Prevents lint violations through systematic enforcement
- [use-structured-logging.md](../../docs/bindings/core/use-structured-logging.md): Validates logging practices
