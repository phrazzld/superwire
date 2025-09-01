---
id: yagni-pattern-enforcement
last_modified: '2025-06-03'
version: '0.2.0'
derived_from: simplicity
enforced_by: 'code review & feature specification validation'
---
# Binding: Apply YAGNI to Prevent Speculative Development

Rigorously apply "You Aren't Gonna Need It" principles by only implementing features that solve immediate, demonstrated needs. Reject any functionality added "just in case" or for imagined future requirements without concrete evidence or user demand.

## Rationale

YAGNI serves as a powerful filter that separates essential features from speculative ones, dramatically reducing cognitive overhead and maintenance burden. Every speculative feature you don't build is maintenance you don't have to do, bugs you don't have to fix, and complexity future developers don't have to navigate. The challenge is recognizing when you're violating it—establishing clear criteria for "demonstrated need" protects your project from accumulating complexity.

## Rule Definition

**Demonstrated Need Requirements** - All features must meet one of:
- Current user request with specific problem
- Business requirement with measurable success criteria
- Technical debt remediation addressing proven issues
- Regulatory/security compliance with deadlines

**Prohibited Patterns:**
- "We might need this later" features
- Generic solutions "for future extensibility"
- Complex configuration without proven variability
- Abstractions before multiple concrete use cases
- Performance optimizations without measured bottlenecks

**Evidence Standards** - Provide:
- Specific use cases from real users
- Clear success metrics
- Timeline justification for immediate implementation
- Cost analysis of problem impact

**Evaluation Questions:**
- Do we have concrete evidence this is needed now?
- What happens if we defer this for six months?
- Are we solving a real or imagined problem?
- Can we validate with a simpler solution first?

**Exceptions** - YAGNI may be relaxed when:
- Deferring creates significantly higher costs
- Foundational architecture decisions are expensive to change
- Regulatory requirements have firm deadlines

## Implementation Strategy

1. **Feature Validation Gates**: Require explicit justification for new functionality. Make "we might need this" automatic rejection.

2. **Minimum Viable Implementation**: Start with simplest solution. Build complexity only when proven necessary by usage patterns.

3. **Feature Flags**: Deploy simple implementations to gather real feedback before expanding functionality.

4. **Document Deferred Decisions**: Record considered but deferred functionality with criteria for future implementation.

5. **Generalize After Patterns Emerge**: Extract abstractions only after seeing 3+ similar concrete use cases.

6. **Regular Feature Audits**: Review and remove unused speculative features based on usage metrics.

## Examples

### Database Configuration
```typescript
// ❌ BAD: Speculative complexity
interface DatabaseConfig {
  host: string; port: number; database: string; username: string; password: string;
  connectionPool?: { min: number; max: number; timeout: number; /* ... */ };
  readReplicas?: Array<{ host: string; port: number; weight: number; }>;
  sharding?: { strategy: 'hash' | 'range'; shardKey: string; /* ... */ };
}

// ✅ GOOD: Current needs only
interface DatabaseConfig {
  host: string; port: number; database: string; username: string; password: string;
}
// Add pooling/replicas/sharding when performance/scale requires it
```

### User Management
```python
# ❌ BAD: Speculative features
class UserManager:
    def __init__(self):
        self.users = {}
        self.role_hierarchy = {}  # Speculative
        self.user_groups = {}     # Speculative
        self.tenant_isolation = {} # Speculative

    def create_user(self, username, email, roles=None, groups=None, tenant_id=None):
        # Complex implementation for unused features

# ✅ GOOD: Simple current solution
class UserManager:
    def __init__(self): self.users = {}
    def create_user(self, username, email):
        user = {'username': username, 'email': email, 'created_at': datetime.now()}
        self.users[username] = user
        return user
# Add roles/groups/tenancy when authorization requirements emerge
```

### API Client
```javascript
// ❌ BAD: Over-engineered with retries, caching, batching, interceptors
class APIClient {
  constructor(config) { /* complex speculative setup */ }
  async request(endpoint, options) { /* complex multi-feature implementation */ }
}

// ✅ GOOD: Simple current needs
class APIClient {
  constructor(baseURL, apiKey) { this.baseURL = baseURL; this.apiKey = apiKey; }
  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options, headers: { 'Authorization': `Bearer ${this.apiKey}`, ...options.headers }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}
// Add retry/caching/batching when performance/reliability issues proven
```

## Related Bindings

- **immutable-by-default**: Immutability reduces complexity from mutable state management, supporting simple-by-default solutions
- **pure-functions**: Pure functions naturally resist over-engineering and make incremental feature addition easier
- **no-internal-mocking**: Simple components are easier to test without elaborate mock setups
- **value-driven-prioritization**: Requires explicit user value justification for all development work
