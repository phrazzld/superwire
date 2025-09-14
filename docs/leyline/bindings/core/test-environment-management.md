---
id: test-environment-management
last_modified: '2025-06-15'
version: '0.2.0'
derived_from: automation
enforced_by: 'Docker Compose, CI Pipeline, Infrastructure as Code'
---

# Binding: Test Environment Management

Ensure test environments are consistent, reproducible, and isolated. Automate environment provisioning to eliminate "works on my machine" problems and enable reliable testing across development, CI, and production contexts.

## Rationale

Environment inconsistencies cause false test failures and production bugs. Automated environment management enables true test isolation, parallel execution, and confidence that results reflect application behavior, not environmental quirks.

## Rule Definition

**MUST** use containerized environments for all integration and end-to-end testing.

**MUST** provide automated setup and teardown scripts that create clean test environments.

**MUST** ensure development environment parity with CI and production environments.

**MUST** isolate test environments to prevent cross-test contamination.

**SHOULD** use infrastructure as code for test environment configuration.

**SHOULD** implement test data seeding as part of environment setup.

## Docker Test Environment

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  app:
    build: { context: ., dockerfile: Dockerfile.test }
    environment: [ NODE_ENV=test, DATABASE_URL=postgresql://test:test@db:5432/testdb ]
    depends_on: [db]
    volumes: [./coverage:/app/coverage]
  db:
    image: postgres:15-alpine
    environment: [POSTGRES_DB=testdb, POSTGRES_USER=test, POSTGRES_PASSWORD=test]
    tmpfs: [/var/lib/postgresql/data]
```

```bash
# scripts/test-env.sh - setup/teardown automation
case "$1" in
  setup) docker-compose -f docker-compose.test.yml up -d
         until docker-compose -f docker-compose.test.yml exec db pg_isready; do sleep 1; done
         docker-compose -f docker-compose.test.yml exec app npm run db:migrate db:seed:test ;;
  teardown) docker-compose -f docker-compose.test.yml down -v ;;
esac
```

## CI Integration

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env: { POSTGRES_DB: testdb, POSTGRES_USER: test, POSTGRES_PASSWORD: test }
        options: --health-cmd pg_isready --health-interval 10s --health-retries 5
        ports: [5432:5432]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18', cache: 'npm' }
      - run: npm ci
      - run: npm run db:migrate db:seed:test
        env: { DATABASE_URL: postgresql://test:test@localhost:5432/testdb }
      - run: npm test
        env: { NODE_ENV: test, DATABASE_URL: postgresql://test:test@localhost:5432/testdb }
```

## Infrastructure as Code

```hcl
# infrastructure/test/main.tf
resource "aws_rds_cluster" "test_db" {
  cluster_identifier = "test-database"
  engine = "aurora-postgresql"
  database_name = "testdb"
  master_username = "testuser"
  master_password = var.test_db_password
  skip_final_snapshot = true
  lifecycle { prevent_destroy = false }
}
```

```bash
# scripts/provision-test-env.sh
terraform -chdir=infrastructure/test apply -auto-approve
DB_ENDPOINT=$(terraform -chdir=infrastructure/test output -raw database_endpoint)
export TEST_DATABASE_URL="postgresql://testuser:${TEST_DB_PASSWORD}@${DB_ENDPOINT}:5432/testdb"
npm run db:migrate db:seed:test
```

## Local Development

```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  app:
    build: { context: ., dockerfile: Dockerfile.dev }
    environment: [NODE_ENV=development, DATABASE_URL=postgresql://dev:dev@db:5432/devdb]
    volumes: [.:/app, /app/node_modules]
    ports: ["3000:3000"]
    depends_on: [db]
  db:
    image: postgres:15-alpine
    environment: [POSTGRES_DB=devdb, POSTGRES_USER=dev, POSTGRES_PASSWORD=dev]
    volumes: [postgres_data:/var/lib/postgresql/data]
    ports: ["5432:5432"]
volumes: { postgres_data: }
```

```bash
# scripts/dev-setup.sh
[ ! -f .env.local ] && cp .env.example .env.local
docker-compose -f docker-compose.dev.yml up -d
until docker-compose -f docker-compose.dev.yml exec db pg_isready; do sleep 1; done
npm install && npm run db:migrate db:seed:dev
```

## Test Environment Helper

```typescript
// test/helpers/environment.ts
export class TestEnvironment {
  static async setup(): Promise<TestEnvironment> {
    const dbContainer = await startContainer({
      image: 'postgres:15-alpine',
      env: { POSTGRES_DB: 'testdb', POSTGRES_USER: 'test', POSTGRES_PASSWORD: 'test' },
      tmpfs: { '/var/lib/postgresql/data': '' }
    });
    await this.waitForService(dbContainer, 'pg_isready');
    await this.runMigrations();
    return new TestEnvironment();
  }

  async seedTestData(fixture: string): Promise<void> {
    const seedData = await loadFixture(fixture);
    await this.database.transaction(async (trx) => {
      await seedData.forEach(table => trx(table.name).insert(table.data));
    });
  }

  async cleanup(): Promise<void> {
    await this.database.raw('TRUNCATE TABLE users, orders, products CASCADE');
  }
}

// Environment validation
export async function validateTestEnvironment(): Promise<ValidationResult> {
  const checks = await Promise.all([
    checkDatabaseConnection(), checkEnvironmentVariables(), checkPortAvailability()
  ]);
  const failures = checks.filter(check => !check.passed);
  if (failures.length > 0) {
    throw new Error(`Environment validation failed:\n${failures.map(f => f.message).join('\n')}`);
  }
  return { valid: true, checks };
}
```

## Anti-Patterns to Avoid

**❌ Shared Test Databases**: Using the same database instance across multiple test suites leads to flaky tests.

**❌ Manual Environment Setup**: Requiring developers to manually configure environments creates inconsistency.

**❌ Persistent Test Data**: Leaving test data between runs causes tests to depend on previous execution state.

**❌ Production-Like Secrets**: Using real credentials or production data in test environments.

**❌ Environment Drift**: Allowing test environments to diverge from production configurations over time.

## Related Standards

- [test-data-management](../../docs/bindings/core/test-data-management.md): Defines how test data is created and managed within these environments
- [ci-cd-pipeline-standards](../../docs/bindings/core/ci-cd-pipeline-standards.md): Pipeline configuration that uses these environment patterns
- [automated-quality-gates](../../docs/bindings/core/automated-quality-gates.md): Quality checks that run within these controlled environments

## References

- [Docker Compose for Testing](https://docs.docker.com/compose/startup-order/)
- [GitHub Actions Services](https://docs.github.com/en/actions/using-containerized-services)
- [Terraform Testing Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/part1.html)
