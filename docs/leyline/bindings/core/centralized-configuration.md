---
id: centralized-configuration
last_modified: '2025-06-02'
version: '0.2.0'
derived_from: dry-dont-repeat-yourself
enforced_by: 'Configuration management tools, environment validation, deployment scripts'
---

# Binding: Centralize Configuration and Settings Management

Single source of truth for all configuration. No duplication, no hardcoding, no scattered settings.

## Rationale

Configuration sprawl is like having the same document in five filing cabinets - when you update one, you forget the others, leading to inconsistency and bugs. A centralized configuration acts as the master control panel, managing all settings from one authoritative location. This eliminates deployment errors from mismatched configs and makes troubleshooting straightforward.

## Rule Definition

**Required:**
- Single configuration source with clear precedence order
- Type-safe configuration objects validated at startup
- Environment-specific overrides without duplication
- Separate secret management from regular config
- Fail-fast validation before application starts
- Immutable configuration after loading

**Prohibited:**
- Hardcoding environment-specific values in code
- Duplicating settings across multiple files
- Runtime configuration parsing (parse once at startup)
- Mixing secrets with non-sensitive config
- Different config formats across services
- Lazy validation that fails at runtime

## Implementation Patterns

### Configuration Schema & Validation
```typescript
// Define typed configuration schema
interface AppConfig {
  readonly server: {
    port: number
    host: string
    corsOrigins: string[]
  }
  readonly database: {
    url: string
    maxConnections: number
    timeout: number
  }
  readonly features: {
    [key: string]: boolean
  }
}

// Load and validate once at startup
class ConfigManager {
  private static config: AppConfig

  static load(): void {
    const raw = this.loadFromSources() // env > file > defaults
    this.config = Object.freeze(this.validate(raw))
  }

  static get(): AppConfig {
    if (!this.config) throw new Error('Config not loaded')
    return this.config
  }
}
```

### Environment Precedence
```typescript
// Clear precedence order (highest to lowest)
function loadConfig(): Config {
  return {
    ...defaultConfig,
    ...loadConfigFile(process.env.CONFIG_FILE || 'config.json'),
    ...loadEnvOverrides(),
    ...loadSecrets() // Separate secret loading
  }
}
```

### Secret Management Pattern
```typescript
// Separate secrets from regular config
interface Secrets {
  stripeApiKey: string
  dbPassword: string
  jwtSecret: string
}

// Load from secure source (env, vault, etc)
function loadSecrets(): Secrets {
  return {
    stripeApiKey: requireEnv('STRIPE_API_KEY'),
    dbPassword: requireEnv('DB_PASSWORD'),
    jwtSecret: requireEnv('JWT_SECRET')
  }
}
```

## Validation

- [ ] All config defined in single location
- [ ] Type-safe configuration objects
- [ ] Validation runs at startup, not runtime
- [ ] Environment variables documented
- [ ] Secrets stored separately from config
- [ ] No hardcoded values in source code
- [ ] Config changes require only one update
- [ ] Failed validation prevents app start

## Examples

### Good: Centralized with Validation
```typescript
// config.ts - Single source
export const config = ConfigManager.load({
  sources: ['env', 'config.json', 'defaults'],
  validate: true,
  freeze: true
})

// usage.ts - Type-safe access
import { config } from './config'
const port = config.server.port // Guaranteed to exist
```

### Bad: Scattered Configuration
```typescript
// ❌ Multiple sources of truth
const API_URL = process.env.API_URL || 'http://localhost:3000'
const API_KEY = 'hardcoded-key-123' // Security risk
const TIMEOUT = 30000 // Magic number

// Different file
const apiUrl = 'http://localhost:3000' // Duplicated!
```

## Tools & Techniques

- **Libraries**: node-config, dotenv, convict, zod (validation)
- **Secret Management**: HashiCorp Vault, AWS Secrets Manager
- **Validation**: JSON Schema, TypeScript types, Zod schemas
- **Monitoring**: Track config drift, audit config changes

## Related Bindings

- [external-configuration](external-configuration.md): How to externalize config
- [feature-flag-management](feature-flag-management.md): Runtime feature control
- [secrets-management-practices](../categories/security/secrets-management-practices.md): Secure secret handling
