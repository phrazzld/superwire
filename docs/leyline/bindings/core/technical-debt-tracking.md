---
id: technical-debt-tracking
last_modified: '2025-06-02'
version: '0.2.0'
derived_from: fix-broken-windows
enforced_by: 'Code review, architectural review, technical debt assessment processes'
---

# Binding: Implement Systematic Technical Debt Management

Track all technical shortcuts and compromises systematically. Make debt visible, prioritized, and actively managed.

## Rationale

Technical debt is like deferred maintenance on critical infrastructure - invisible debt compounds until systems fail catastrophically. Untracked shortcuts create a vicious cycle where teams repeatedly choose short-term solutions without understanding cumulative costs. Make debt as visible and managed as financial debt.

## Rule Definition

**Required:**
- Document all technical debt when created with impact, effort, and owner
- Maintain centralized debt registry with consistent metadata
- Prioritize by formula: (business_risk × maintenance_cost) / effort
- Allocate 20% sprint capacity to debt reduction
- Review debt trends in retrospectives

**Prohibited:**
- Creating shortcuts without documentation
- Accumulating debt without paydown plans
- Deferring critical/security debt beyond one sprint
- Making debt decisions without team visibility

## Implementation Patterns

### Debt Registry Structure
```typescript
interface TechnicalDebt {
  id: string
  title: string
  category: 'quality' | 'architecture' | 'performance' | 'security' | 'testing'
  severity: 'low' | 'medium' | 'high' | 'critical'
  impact: { velocity: 1-5, reliability: 1-5, maintenance: 1-5 }
  effort: { hours: number, risk: 'low' | 'medium' | 'high' }
  created: Date
  owner: string
  status: 'identified' | 'planned' | 'in-progress' | 'resolved'
}
```

### Automated Detection
```typescript
// Scan for debt indicators
const debtPatterns = [
  { pattern: /TODO|FIXME|HACK/g, severity: 'low' },
  { pattern: /eslint-disable|@ts-ignore/g, severity: 'medium' },
  { complexity: >10, severity: 'high' }
]

// Integrate with CI to auto-create debt items
```

### Sprint Planning Integration
- Sort debt by priority score
- Fill 20% capacity with highest priority items
- Track completion rate as team metric
- Visualize debt trends on dashboard

## Validation

- [ ] Debt registry exists and is actively used
- [ ] All TODOs/FIXMEs have corresponding debt tickets
- [ ] Sprint capacity includes debt allocation
- [ ] Debt trend is flat or decreasing
- [ ] Critical debt addressed within one sprint
- [ ] Team reviews debt metrics regularly

## Examples

### Good: Documented Shortcut
```typescript
// TODO(#DEBT-123): Refactor to use proper error boundaries
// Impact: Medium - errors show generic message
// Effort: 4h - need to implement ErrorBoundary component
try {
  return riskyOperation()
} catch (e) {
  console.error(e)
  return fallbackValue
}
```

### Bad: Hidden Debt
```typescript
// Just do it the quick way for now
try {
  return riskyOperation()
} catch {
  return null // This will cause issues later
}
```

## Tools & Automation

- **GitHub Issues**: Label system for debt tracking
- **SonarQube**: Automated code quality debt detection
- **Custom Scripts**: `npm run debt:scan` to find patterns
- **Dashboards**: Grafana/Datadog debt metrics visualization

## Related Bindings

- [continuous-refactoring](continuous-refactoring.md): Systematic debt reduction
- [no-lint-suppression](no-lint-suppression.md): Prevent debt accumulation
- [code-review-excellence](code-review-excellence.md): Catch debt early
