---
id: code-review-excellence
last_modified: '2025-06-15'
version: '0.2.0'
derived_from: build-trust-through-collaboration
enforced_by: 'CI Pipeline, Review Automation, Pull Request Checks'
---

# Binding: Code Review Excellence

Code review is a critical quality gate that balances automated verification with human insight. Structure reviews to maximize learning, maintain consistency, and focus human attention on high-value concerns like design, security, and user experience.

## Rationale

Human review remains essential for design decisions, edge cases, and domain knowledge sharing, while automation handles mechanical verification. Effective reviews structure this division to maximize human insight on judgment-requiring aspects.

Well-structured review practices compound over time: continuous knowledge sharing, consistent standards, and early issue detection when fixes are cheap.

## Rule Definition

**MUST** automate mechanical checks (formatting, linting, type checking, test coverage) before human review begins.

**MUST** provide review templates that guide reviewers toward high-value feedback areas.

**MUST** establish clear SLAs for review turnaround (e.g., initial response within 4 hours).

**MUST** enforce that all code changes receive at least one approval before merging.

**SHOULD** use automated suggestions for common improvements (e.g., security patterns, performance optimizations).

**SHOULD** track review metrics to identify bottlenecks and improve processes.

## Implementation Patterns

### 1. Automated Pre-Review Checks

```yaml
# .github/workflows/pr-checks.yml
name: PR Validation
on: { pull_request: { types: [opened, synchronize] } }

jobs:
  automated-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test -- --coverage
      - name: Coverage Check
        run: |
          coverage=$(npm run coverage:summary | grep "All files" | awk '{print $10}' | sed 's/%//')
          [ "$coverage" -lt 80 ] && { echo "Coverage $coverage% below 80%"; exit 1; }
      - run: npm audit --audit-level=moderate
```

### 2. Review Templates and Checklists

```markdown
<!-- .github/pull_request_template.md -->
## Description
Brief description of changes and purpose.

## Review Checklist - Focus Areas:
**Design & Architecture**
- [ ] Aligns with existing patterns
- [ ] No unnecessary complexity
- [ ] Proper separation of concerns

**Security**
- [ ] Input validation at boundaries
- [ ] No hardcoded secrets
- [ ] Proper error handling

**Performance & UX**
- [ ] No obvious regressions
- [ ] Efficient algorithms
- [ ] Helpful error messages
- [ ] Backwards compatibility

## Automated Checks (✅ Verified automatically)
Formatting, linting, type safety, test coverage >80%, security vulnerabilities
```

### 3. Review Automation

**GitLab CI Example:**
```yaml
# .gitlab-ci.yml
mechanical-checks:
  script: [npm ci, npm run lint, npm run type-check, npm test -- --coverage]
  rules: [if: $CI_MERGE_REQUEST_ID]
```

**Danger.js Automation:**
```javascript
// Check PR size, missing tests, console.logs
if (additions + deletions > 400) warn('Large PR - consider breaking down');
if (hasImplementation && !hasTests) fail('Please add tests');
if (file.includes('console.log')) warn('Use structured logging instead');
```

### 4. Review Metrics and Improvement

**Key Metrics to Track:**
- Time to first review (target: <4 hours)
- Time to approval (target: <24 hours)
- Number of revisions (flag: >3 revisions)
- Review participation distribution

**Bottleneck Identification:**
- Slow review starts (>8 hours)
- High revision rates (>3 cycles)
- Single reviewer dependencies
- Large PR patterns (>400 lines)

## Human vs Automated Boundaries

**Automated Review Handles:**
- Code formatting, style, type safety
- Test execution, coverage thresholds
- Security vulnerability scanning
- License compliance, merge conflicts

**Human Review Focuses On:**
- Design decisions, architectural fit
- Business logic correctness, edge cases
- Performance implications, security patterns
- Code clarity, knowledge sharing opportunities

## Anti-Patterns to Avoid

**❌ Nitpick Hell:** Style preferences that should be automated

**❌ Rubber Stamping:** Approving without meaningful review due to time pressure

**❌ Review Bottlenecks:** Single person bottleneck for all changes

**❌ Context-Free Comments:** Vague feedback without specifics

**❌ Delayed Reviews:** PRs sitting for days, forcing expensive context switches

## Related Standards

**[automated-quality-gates](../../docs/bindings/core/automated-quality-gates.md):** Automated checks before human review

**[git-hooks-automation](../../docs/bindings/core/git-hooks-automation.md):** Local automation preventing issues before review

**[ci-cd-pipeline-standards](../../docs/bindings/core/ci-cd-pipeline-standards.md):** Full pipeline including post-review deployment
