---
id: feature-flag-management
last_modified: '2025-06-02'
version: '0.2.0'
derived_from: adaptability-and-reversibility
enforced_by: 'Feature flag platforms, deployment controls, runtime configuration'
---

# Binding: Implement Comprehensive Feature Flag Management

Control functionality at runtime without deployments. Enable safe rollouts, instant rollbacks, and dynamic behavior changes.

## Rationale

Feature flags are like circuit breakers for your software - flip a switch to instantly change behavior without touching code. This transforms risky deployments into safe, reversible experiments. When issues arise, disable the problematic feature in seconds instead of emergency deployments that take hours.

## Rule Definition

**Required:**
- All new features behind flags (default: off)
- Flags expire within 90 days or become permanent config
- Safe defaults when flag service fails
- User/environment/percentage targeting capabilities
- Audit log for all flag changes
- Monitor flag evaluation performance (<50ms)

**Prohibited:**
- Hard-coded feature toggles requiring deployment
- Flags without owner or expiration date
- Complex flag logic that can crash the app
- Security/compliance features behind flags
- Nested flags creating complex dependencies

## Implementation Patterns

### Basic Flag Usage
```typescript
// Simple boolean flag
if (await flags.isEnabled('new-search-algorithm', { userId })) {
  return newSearchImplementation()
}
return legacySearch()

// Value flag with default
const batchSize = await flags.getValue('import-batch-size', 100, { env })

// Variant flag for A/B testing
const variant = await flags.getVariant('checkout-flow', { userId })
switch(variant) {
  case 'A': return checkoutFlowA()
  case 'B': return checkoutFlowB()
  default: return checkoutFlowOriginal()
}
```

### Flag Configuration
```json
{
  "flag": "new-dashboard",
  "description": "Redesigned analytics dashboard",
  "owner": "analytics-team",
  "created": "2025-01-15",
  "expires": "2025-04-15",
  "defaultValue": false,
  "targeting": {
    "rules": [
      { "attribute": "plan", "operator": "in", "values": ["pro", "enterprise"] },
      { "attribute": "percentage", "operator": "<=", "value": 25 }
    ]
  }
}
```

### Safe Flag Evaluation
```typescript
class SafeFeatureFlags {
  async isEnabled(flag: string, context: Context): Promise<boolean> {
    try {
      return await this.provider.evaluate(flag, context)
    } catch (error) {
      // Log but don't crash
      logger.error('Flag evaluation failed', { flag, error })
      return this.getDefaultValue(flag)
    }
  }
}
```

## Validation

- [ ] All features have flags with expiration dates
- [ ] Flag service has 99.9% uptime SLA
- [ ] Evaluation latency P99 < 50ms
- [ ] Stale flags cleaned up quarterly
- [ ] Emergency kill switches for critical features
- [ ] Flag changes tracked in audit log

## Examples

### Good: Progressive Rollout
```typescript
// Gradual rollout with monitoring
const flag = {
  name: 'new-payment-system',
  rollout: [
    { percentage: 1, duration: '1h', monitor: true },
    { percentage: 10, duration: '1d', monitor: true },
    { percentage: 50, duration: '3d', monitor: true },
    { percentage: 100 }
  ]
}
```

### Bad: Complex Flag Logic
```typescript
// ❌ Don't create flag spaghetti
if (flags.isEnabled('feature-a') &&
    !flags.isEnabled('feature-b') ||
    (flags.isEnabled('feature-c') && user.isPremium)) {
  // Complex interdependencies = bugs
}
```

## Tools & Automation

- **Platforms**: LaunchDarkly, Unleash, Split, Flagsmith
- **Libraries**: OpenFeature (standard API)
- **Monitoring**: Flag evaluation metrics in APM
- **Cleanup**: Automated flag lifecycle management

## Related Bindings

- [incremental-delivery](incremental-delivery.md): Deploy with flags for safety
- [runtime-adaptability](runtime-adaptability.md): Change behavior dynamically
- [80-20-solution-patterns](80-20-solution-patterns.md): Simple flags over complex systems
