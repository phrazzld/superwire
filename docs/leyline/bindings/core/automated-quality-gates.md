---
id: automated-quality-gates
last_modified: '2025-06-15'
version: '0.2.0'
derived_from: fix-broken-windows
enforced_by: 'CI/CD pipelines, pre-commit hooks, automated testing, code analysis tools'
---

# Binding: Establish Comprehensive Automated Quality Gates

Implement automated validation checkpoints that prevent low-quality code from progressing through the development pipeline. Create systematic barriers that catch quality issues early, before they can compound into larger system problems.

## Rationale

Automated quality gates prevent quality degradation by enforcing standards consistently at every pipeline stage. They eliminate human error and time pressure compromises that allow quality issues to accumulate into larger system problems.

Manual quality assurance is inconsistent and error-prone. Automated gates apply rigorous standards to every change, creating reliable quality foundations teams can build upon.

## Rule Definition

**MUST** implement quality gates at multiple pipeline stages:
- Pre-commit hooks for immediate feedback
- Pull request validation for team review
- Continuous integration for comprehensive testing
- Pre-deployment validation for production readiness

**MUST** validate these quality categories:
- Code quality (syntax, complexity, style, duplication)
- Security (vulnerability scanning, dependency analysis)
- Testing (coverage thresholds, regression detection)
- Performance (benchmarking, resource usage validation)

**MUST** provide fast feedback with specific, actionable guidance for resolution.

**MUST** implement escalating rigor as code progresses through the pipeline.

**SHOULD** include emergency override mechanisms with audit trails for critical production fixes.

## Quality Gate Implementation

**Essential Gates Pattern:**
```yaml
# .github/workflows/quality-gates.yml
name: Quality Gates
on: [push, pull_request]

jobs:
  pre-flight-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci

      # Code Quality Gate
      - name: Code Quality Validation
        run: |
          npm run lint || { echo "❌ Linting failed"; exit 1; }
          npm run format:check || { echo "❌ Format issues"; exit 1; }

          # Complexity check
          COMPLEXITY=$(npx complexity-report --format json src/ | jq '.summary.average.complexity')
          if (( $(echo "$COMPLEXITY > 10" | bc -l) )); then
            echo "❌ Complexity $COMPLEXITY exceeds threshold"; exit 1
          fi

      # Security Gate
      - name: Security Validation
        run: |
          npm audit --audit-level=moderate
          grep -r "password\|secret\|token" src/ --exclude-dir=test && exit 1 || true

      # Testing Gate
      - name: Testing Validation
        run: |
          npm test -- --coverage
          COVERAGE=$(jq '.total.lines.pct' coverage/coverage-summary.json)
          if (( $(echo "$COVERAGE < 85" | bc -l) )); then
            echo "❌ Coverage $COVERAGE% below 85%"; exit 1
          fi

  performance-gates:
    needs: pre-flight-checks
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build:production

      # Performance Gate
      - name: Performance Validation
        run: |
          BUNDLE_SIZE=$(du -k dist/main.js | cut -f1)
          [ "$BUNDLE_SIZE" -gt 500 ] && { echo "❌ Bundle ${BUNDLE_SIZE}KB > 500KB"; exit 1; }

  emergency-override:
    if: contains(github.event.head_commit.message, '[emergency-deploy]')
    runs-on: ubuntu-latest
    steps:
      - name: Log Emergency Override
        run: |
          echo "🚨 Emergency override by ${{ github.actor }}"
          # Log to audit system
          curl -X POST "${{ secrets.AUDIT_WEBHOOK_URL }}" \
            -d '{"event":"emergency_override","actor":"${{ github.actor }}"}'
```

**❌ Anti-Pattern:** Single massive validation step
```yaml
- name: Check Everything
  run: npm run lint && npm test && npm run security-check && npm run deploy
```

**✅ Good Pattern:** Staged gates with clear feedback

## Implementation Guidelines

**Progressive Enhancement:** Start with basic gates (lint, test, security), add complexity gradually

**Clear Failure Messages:** Each gate provides specific resolution guidance when failing

**Performance Optimization:** Run gates in parallel to minimize pipeline time

**Emergency Procedures:** Include override mechanisms with full audit trails

## Monitoring and Maintenance

**Gate Effectiveness:** Track which gates catch most issues to optimize priorities

**Performance Impact:** Monitor execution time, adjust parallelization as needed

**False Positives:** Regularly review thresholds to minimize unnecessary failures

**Coverage Analysis:** Ensure gates catch issues that matter most to your system

## Related Standards

**[ci-cd-pipeline-standards](../../docs/bindings/core/ci-cd-pipeline-standards.md):** Pipeline architecture implementing quality gates

**[git-hooks-automation](../../docs/bindings/core/git-hooks-automation.md):** Pre-commit validation for immediate feedback

**[use-structured-logging](../../docs/bindings/core/use-structured-logging.md):** Observability supporting quality gate monitoring
