---
id: incremental-delivery
last_modified: '2025-06-02'
version: '0.2.0'
derived_from: adaptability-and-reversibility
enforced_by: 'CI/CD pipelines, deployment strategies, release management'
---

# Binding: Practice Incremental Delivery and Continuous Deployment

Deploy small changes frequently with automated rollback capability. Reduce blast radius, enable rapid feedback, maintain reversibility.

## Rationale

Large, infrequent deployments are like crossing a river in one giant leap - high risk, no recovery. Incremental delivery is like building a bridge one plank at a time - each step is safe, reversible, and gets you closer to the goal. Small changes are easier to understand, test, and fix when problems arise.

## Rule Definition

**Required:**
- Deploy at least daily to production (or staging for regulated environments)
- Keep changes atomic - one feature/fix per deployment
- Automated deployment pipeline with <10 minute completion
- Progressive rollout: canary → percentage → full
- One-click/automated rollback within 2 minutes
- Monitor key metrics during and after deployment

**Prohibited:**
- Manual deployment steps (except approval gates)
- Deploying without automated tests passing
- Breaking changes without migration path
- Deployments larger than 500 lines of code change
- Ignoring deployment metrics/alerts

## Implementation Patterns

### Deployment Pipeline
```yaml
# GitHub Actions example
on:
  push:
    branches: [main]
jobs:
  deploy:
    steps:
      - test: unit, integration, e2e
      - build: optimized production build
      - deploy-canary: 5% traffic for 10 minutes
      - validate: error rate, latency, key metrics
      - deploy-full: rolling update to 100%
      - monitor: 30 minutes post-deploy alerts
```

### Progressive Rollout Strategy
```typescript
const deploymentStrategy = {
  canary: { percentage: 5, duration: '10m' },
  stages: [
    { percentage: 25, duration: '10m' },
    { percentage: 50, duration: '10m' },
    { percentage: 100, duration: 'stable' }
  ],
  rollbackTriggers: {
    errorRate: { threshold: 0.05, window: '5m' },
    latencyP99: { threshold: 500, window: '5m' }
  }
}
```

### Database Migration Pattern
```sql
-- Add column (backward compatible)
ALTER TABLE users ADD COLUMN new_field VARCHAR(255);

-- Deploy code that writes to both old and new
-- Deploy code that reads from new
-- Remove old column in separate deployment
```

## Validation

- [ ] Deployment frequency ≥ daily
- [ ] Deployment duration < 10 minutes
- [ ] Rollback time < 2 minutes
- [ ] Failed deployment rate < 5%
- [ ] All deployments have automated tests
- [ ] Progressive rollout for user-facing changes
- [ ] Post-deploy monitoring alerts configured

## Examples

### Good: Feature Flag Deployment
```typescript
// Deploy code behind flag, enable progressively
if (featureFlag.isEnabled('new-checkout-flow', userId)) {
  return renderNewCheckout()
}
return renderLegacyCheckout()
```

### Bad: Big Bang Deployment
```typescript
// Deploying entire rewrite at once
// No gradual rollout, no feature flags
return renderCompletelyNewSystem() // 🚨 High risk
```

## Tools & Automation

- **CI/CD**: GitHub Actions, GitLab CI, CircleCI
- **Progressive Delivery**: Flagger, Argo Rollouts
- **Feature Flags**: LaunchDarkly, Unleash, Split
- **Monitoring**: Datadog, New Relic, Prometheus
- **Database Migrations**: Flyway, Liquibase, Prisma

## Related Bindings

- [feature-flag-management](feature-flag-management.md): Decouple deployment from release
- [automated-quality-gates](automated-quality-gates.md): Ensure deployment safety
- [runtime-adaptability](runtime-adaptability.md): Adjust without redeployment
