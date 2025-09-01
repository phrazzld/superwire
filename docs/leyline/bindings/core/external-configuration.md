---
derived_from: no-secret-suppression
id: external-configuration
last_modified: '2025-05-14'
version: '0.2.0'
enforced_by: code review & style guides
---

# Binding: Never Hardcode Configuration

Keep all configuration external to code. No embedded secrets, URLs, or environment-specific values.

## Rationale

Your application is like a musical instrument that needs different tuning for each venue. Hardcoding configuration permanently fixes the tuning pegs—the instrument only works in one environment. External configuration allows proper "tuning" for each environment without changing code. What starts as "I'll just hardcode the dev URL for now" inevitably becomes a security breach, deployment failure, or the reason you're paged at 3 AM.

## Rule Definition

**Required to Externalize:**
- Environment-specific values (URLs, hostnames, ports, timeouts)
- All credentials (passwords, API keys, tokens, certificates)
- Feature flags and toggles
- Resource limits and scaling parameters
- Logging levels and destinations
- Any value that might change between environments

**Configuration Sources (in precedence order):**
1. Command-line arguments (highest)
2. Environment variables
3. Configuration files
4. Default values (lowest)

**Prohibited:**
- Hardcoded values in source code
- Secrets in version control
- Configuration in compiled binaries
- Shared credentials across environments
- Defaults containing real credentials

**Limited Exceptions:**
- True constants (π, HTTP status codes)
- Development-only tooling that never deploys
- Clearly labeled test fixtures

## Implementation Patterns

### Configuration Abstraction Layer
```typescript
class ConfigService {
  private readonly config: Record<string, any>;

  constructor() {
    this.config = this.loadConfiguration();
    this.validateRequired(['DATABASE_URL', 'API_KEY']);
  }

  get<T>(key: string, defaultValue?: T): T {
    return this.config[key] ?? defaultValue;
  }

  private validateRequired(keys: string[]): void {
    const missing = keys.filter(k => !this.config[k]);
    if (missing.length) {
      throw new Error(`Missing required config: ${missing.join(', ')}`);
    }
  }
}
```

### Layered Configuration
```python
def load_config():
    # Start with safe defaults (no secrets!)
    config = {
        "port": 8080,
        "timeout": 30,
        "log_level": "info"
    }

    # Layer in file config
    if os.path.exists("config.json"):
        with open("config.json") as f:
            config.update(json.load(f))

    # Environment overrides everything
    for key in config:
        env_key = key.upper()
        if env_value := os.getenv(env_key):
            config[key] = type(config[key])(env_value)

    # Validate required secrets separately
    for secret in ["API_KEY", "DB_PASSWORD"]:
        if not os.getenv(secret):
            raise ValueError(f"{secret} is required")

    return config
```

### Secret Management
```go
// Separate secrets from regular config
type Config struct {
    Port    int
    Timeout time.Duration
}

type Secrets struct {
    APIKey   string
    DBPass   string
}

func LoadConfig() (*Config, *Secrets, error) {
    // Regular config from env/files
    cfg := &Config{
        Port:    getEnvInt("PORT", 8080),
        Timeout: getEnvDuration("TIMEOUT", 30*time.Second),
    }

    // Secrets from secure source
    secrets := &Secrets{
        APIKey: mustGetEnv("API_KEY"),
        DBPass: mustGetEnv("DB_PASSWORD"),
    }

    return cfg, secrets, nil
}
```

## Validation

- [ ] No hardcoded values in source code
- [ ] All config validated at startup
- [ ] `.env.example` template exists
- [ ] Secrets use appropriate management (Vault/KMS)
- [ ] Configuration documented in README
- [ ] No real values in version control
- [ ] Different values per environment
- [ ] Fail-fast on missing required config

## Examples

### Good: External with Validation
```typescript
// config.ts
export class DatabaseService {
  constructor(private config: Config) {
    if (!config.get('DATABASE_URL')) {
      throw new Error('DATABASE_URL required');
    }
  }

  connect() {
    return createConnection(this.config.get('DATABASE_URL'));
  }
}

// startup.ts
const config = new ConfigService();
const db = new DatabaseService(config);
```

### Bad: Hardcoded Values
```typescript
// ❌ Security risk + deployment nightmare
class DatabaseService {
  private url = "postgres://admin:prod123@db.internal:5432/app";

  connect() {
    return createConnection(this.url);
  }
}
```

## Security Checklist

1. **Use `.env.example` templates**:
```bash
# .env.example (commit this)
DATABASE_URL=postgres://user:pass@host:5432/db
API_KEY=your-key-here

# .env (gitignore this)
DATABASE_URL=postgres://prod:xY9$@db:5432/app
API_KEY=sk_live_4242424242
```

2. **Validate boundaries**:
```typescript
const port = parseInt(process.env.PORT || '');
if (!port || port < 1 || port > 65535) {
  throw new Error('Invalid PORT');
}
```

3. **Platform-native secrets**:
- AWS: Secrets Manager/Parameter Store
- Kubernetes: Secrets with encryption
- Local dev: Encrypted .env files

## Related Bindings

- [no-secret-suppression](../../docs/tenets/no-secret-suppression.md): Parent tenet
- [centralized-configuration](centralized-configuration.md): Single source of truth
- [secrets-management-practices](../categories/security/secrets-management-practices.md): Secure secrets
