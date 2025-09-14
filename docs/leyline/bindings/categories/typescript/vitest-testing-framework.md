---
id: vitest-testing-framework
last_modified: '2025-06-18'
version: '0.2.0'
derived_from: testability
enforced_by: 'vitest configuration, coverage thresholds, CI pipeline, pre-commit hooks'
---

# Binding: Implement Test Pyramid with Vitest for Behavior Verification

Use Vitest as the unified testing framework for all TypeScript test types—unit, integration, and end-to-end. Structure tests according to the test pyramid distribution (70% unit, 20% integration, 10% e2e), focusing on behavior verification rather than implementation details.

## Rationale

This binding implements our testability tenet by establishing a consistent, behavior-focused testing approach. A well-structured test pyramid catches bugs at the appropriate level—unit tests for algorithmic correctness, integration tests for component interaction, and e2e tests for critical user journeys.

Vitest's unified approach eliminates tooling fragmentation by using the same syntax, configuration, and debugging tools for all test types, enabling higher test coverage and better system reliability.

## Rule Definition

This rule applies to all TypeScript projects and test types within the unified toolchain. The rule specifically requires:

**Requirements:**
- **70% Unit Tests**: Fast, isolated tests for pure functions and individual components
- **20% Integration Tests**: Component interaction verification including API boundaries and service integration
- **10% End-to-End Tests**: Critical user journey validation through complete application workflows
- **Behavior Focus**: Test outcomes rather than implementation details
- **No Internal Mocking**: Only mock external dependencies, never internal application components
- **Coverage Enforcement**: ≥80% overall coverage and ≥90% for core business logic
- **Unified Configuration**: Single configuration file for all test types with consistent syntax

The rule prohibits mixing testing frameworks within projects without architectural justification. Test code follows the same quality standards as production code.

## Practical Implementation

1. **Vitest Configuration**: Unified test configuration:
   ```typescript
   import { defineConfig } from 'vitest/config';

   export default defineConfig({
     test: {
       globals: true,
       environment: 'node',
       coverage: {
         provider: 'v8',
         thresholds: {
           statements: 80,
           branches: 80,
           functions: 80,
           lines: 80,
           'src/core/**/*.ts': { statements: 90, branches: 90, functions: 90, lines: 90 }
         },
         exclude: ['node_modules/', 'dist/', '**/*.d.ts']
       },
       include: ['src/**/*.{test,spec}.{js,ts}'],
       testTimeout: 10000
     }
   });
   ```

2. **Test Organization**: Structure tests by type:
   ```
   src/
   ├── components/
   │   ├── Button.ts
   │   ├── Button.test.ts
   │   └── Button.integration.test.ts
   ├── services/
   │   └── ApiService.test.ts
   └── e2e/
       └── user-journey.test.ts
   ```

3. **Unit Test Patterns**: Fast, isolated verification:
   ```typescript
   describe('calculateTotal', () => {
     it('should apply discount percentage to subtotal', () => {
       const result = calculateTotal({
         subtotal: 100,
         discountPercentage: 10
       });

       expect(result.total).toBe(90);
       expect(result.discount).toBe(10);
     });
   });
   ```

4. **Integration Test Patterns**: Verify component interactions:
   ```typescript
   describe('UserService integration', () => {
     let userService: UserService;
     let testDatabase: Database;

     beforeEach(async () => {
       testDatabase = await createTestDatabase();
       userService = new UserService(testDatabase);
     });

     it('should create user and send welcome email', async () => {
       const emailSpy = vi.fn();
       const user = await userService.createUser(
         { email: 'test@example.com', name: 'Test User' },
         { send: emailSpy }
       );

       expect(user.id).toBeDefined();
       expect(emailSpy).toHaveBeenCalledWith({
         to: 'test@example.com',
         subject: 'Welcome to our platform'
       });
     });
   });
   ```

5. **End-to-End Test Patterns**: Critical user journey validation:
   ```typescript
   describe('User Registration Journey', () => {
     it('should complete full registration workflow', async () => {
       const app = await createTestApp();
       const testUser = generateTestUser();

       const response = await app.request('/api/register', {
         method: 'POST',
         json: testUser
       });

       expect(response.status).toBe(201);
       const user = await response.json();
       expect(user.email).toBe(testUser.email);

       const emailQueue = await getEmailQueue();
       expect(emailQueue).toContainEqual(
         expect.objectContaining({ to: testUser.email, template: 'welcome' })
       );
     });
   });
   ```

## Examples

```typescript
// ❌ BAD: Implementation-focused test with internal mocking
describe('OrderProcessor', () => {
  it('should call payment service correctly', () => {
    const mockPayment = vi.fn();
    const processor = new OrderProcessor(mockPayment, mockInventory);
    processor.processOrder(order);
    expect(mockPayment).toHaveBeenCalledWith(order.total);
  });
});

// ✅ GOOD: Behavior-focused test verifying outcomes
describe('OrderProcessor', () => {
  it('should create confirmed order', async () => {
    const processor = new OrderProcessor(
      new TestPaymentService(),
      new TestInventoryService()
    );

    const result = await processor.processOrder({ items: [{ id: 'item1', quantity: 2 }], total: 100 });

    expect(result.status).toBe('confirmed');
    expect(result.paymentId).toBeDefined();
  });
});
```

```typescript
// ❌ BAD: Mixing frameworks (Jest + Playwright)
// ✅ GOOD: Unified Vitest for all test types
export default defineConfig({
  test: { env: { NODE_ENV: 'test' }, setupFiles: ['./test/setup.ts'] }
});
```

```typescript
// ❌ BAD: Shared state between tests
let userDatabase;

// ✅ GOOD: Independent tests with isolated setup
describe('User operations', () => {
  let database: Database;

  beforeEach(async () => {
    database = await createIsolatedTestDatabase();
  });

  it('should create user successfully', async () => {
    const user = await database.users.create({ email: 'test@example.com' });
    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });
});
```
## Related Bindings
- [no-internal-mocking.md](../core/no-internal-mocking.md): Only mock external dependencies
- [test-pyramid-implementation.md](../core/test-pyramid-implementation.md): Test pyramid principles implementation
- [automated-quality-gates.md](../core/automated-quality-gates.md): Coverage enforcement and CI integration
