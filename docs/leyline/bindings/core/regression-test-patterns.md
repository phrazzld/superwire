---
id: regression-test-patterns
last_modified: '2025-06-17'
version: '0.2.0'
derived_from: testability
enforced_by: 'bug tracking, test coverage, code review'
---

# Binding: Create Regression Tests for Every Bug

Immediately convert every discovered bug into a failing test case before fixing it. Use the bug-to-test workflow to prevent the same issue from recurring and build confidence in your test suite's ability to catch real problems.

## Rationale

Grug's wisdom teaches that bugs are gifts—they reveal gaps in your understanding and testing strategy. When a bug slips through your existing tests, it means your test suite failed to catch a real-world problem. Rather than just fixing the bug and moving on, capture that scenario as a permanent test case.

Each bug represents a path through your code that you didn't anticipate. By converting bugs to tests, you're essentially expanding your test coverage based on actual failure modes rather than theoretical ones. This approach builds a test suite that catches problems users actually encounter, not just problems you imagine they might encounter.

The bug-to-test workflow serves multiple purposes: it prevents regression, documents the failure scenario for future developers, and gradually improves your test suite's real-world coverage. Over time, this practice creates a comprehensive safety net built from actual user experience rather than speculation.

## Rule Definition

**MUST** create a failing test that reproduces the bug before implementing any fix.

**MUST** ensure the test fails initially and passes after the fix is applied.

**SHOULD** document the bug context and user impact in the test description.

**SHOULD** group related regression tests to identify patterns in failure modes.

**SHOULD** use regression tests to validate that bug fixes don't break existing functionality.

## Bug-to-Test Workflow

### Step 1: Reproduce and Document

**Before writing any code:**
1. Create a minimal reproduction of the bug in isolation
2. Document expected vs. actual behavior and specific trigger conditions
3. Note user impact and discovery context

**Example:** Bug #342 - Login fails with special characters (@, #, %) in passwords

### Step 2: Write the Failing Test

**Create a test that reproduces the exact failure:**

```typescript
describe('User Authentication', () => {
  it('should allow login with passwords containing special characters', async () => {
    // Bug reproduction test - should fail initially
    const user = await createTestUser({
      email: 'test@example.com',
      password: 'myp@ssw0rd#123'
    });

    const loginResult = await authService.login(user.email, 'myp@ssw0rd#123');

    expect(loginResult.success).toBe(true);
    expect(loginResult.user.id).toBe(user.id);
  });
});
```

**Verify the test fails:**
```bash
npm test -- --grep "special characters"
# Should fail with the same error users experienced
```

### Step 3: Fix and Validate

**Implement the minimal fix:**
- Address the root cause identified in the reproduction
- Avoid over-engineering the solution
- Focus on making the test pass

**Verify the complete cycle:**
```bash
# Run the specific regression test
npm test -- --grep "special characters"
# Should now pass

# Run the full test suite
npm test
# Should not break existing functionality
```

### Step 4: Document and Integrate

**Add context to the test:**
```typescript
it('should allow login with passwords containing special characters', async () => {
  // Regression test for issue #342: URL encoding in password validation
  // Users with @, #, % in passwords were getting 401 errors
  // Fixed by properly encoding password before validation

  const user = await createTestUser({
    email: 'test@example.com',
    password: 'myp@ssw0rd#123'  // This specific pattern was failing
  });

  const loginResult = await authService.login(user.email, 'myp@ssw0rd#123');

  expect(loginResult.success).toBe(true);
  expect(loginResult.user.id).toBe(user.id);
});
```

## Test Case Templates

### Basic Regression Test Template

```typescript
describe('[Component] Regression Tests', () => {
  it('should [expected behavior] - Issue #[number]', async () => {
    // Arrange: Set up the exact conditions that caused the bug
    const testData = createBugReproductionData();

    // Act: Perform the action that was failing
    const result = await performAction(testData);

    // Assert: Verify the bug is fixed
    expect(result).toMatchExpectedBehavior();
  });
});
```

### Data-Driven Regression Test Template

```typescript
describe('Input Validation Regression Tests', () => {
  const buggyInputs = [
    { input: 'user@domain.com', issue: '#123' },
    { input: 'user+tag@domain.com', issue: '#156' }
  ];

  buggyInputs.forEach(({ input, issue }) => {
    it(`should handle ${input} - ${issue}`, async () => {
      const result = await validateEmail(input);
      expect(result.isValid).toBe(true);
    });
  });
});
```

## Extracting Tests from Bug Reports

### Extracting Tests from Bug Sources

**Support Tickets:** Convert user-reported issues to test cases
```typescript
it('should upload files up to 5MB - Ticket #892', async () => {
  const largeFile = createTestFile({ size: '2.3MB' });
  const result = await fileService.upload(largeFile);
  expect(result.success).toBe(true);
});
```

**Production Logs:** Turn errors into test scenarios
```typescript
it('should handle undefined users list - Production Error', () => {
  const component = render(<UserList users={undefined} />);
  expect(component.getByText('No users found')).toBeInTheDocument();
});
```

**QA Reports:** Reproduce exact test scenarios
```typescript
it('should persist theme after refresh - QA Bug', async () => {
  await changeTheme('dark');
  await page.reload();
  expect(await getCurrentTheme()).toBe('dark');
});
```

## Test Organization and Naming

**File Structure:** Group by failure type (authentication-bugs.test.ts, data-validation-bugs.test.ts)

**Naming Convention:** Include component, behavior, and issue number
```typescript
// Good: Specific and traceable
'UserAuth should allow special characters - Issue #342'

// Bad: Vague and unclear
'should work with special characters'
```

**Suite Organization:** Group related bugs together
```typescript
describe('Regression Tests: Authentication', () => {
  describe('Password Issues', () => {
    it('should allow special characters - Issue #342');
    it('should handle Unicode - Issue #398');
  });
});
```

## Success Metrics

**Track:**
- Percentage of bugs with corresponding tests
- Regression prevention rate (bugs caught by existing tests)
- Time from bug discovery to test creation

**Monthly Report Template:**
```
Bugs with tests: 20/23 (87%)
Regressions prevented: 8/9 (89%)
Average test creation time: 2.3 hours
```

## Effective vs. Ineffective Tests

**✅ Good: Test exact user scenario with specific details**
```typescript
it('should process partial refund - Issue #445', async () => {
  const order = await createOrder({ shipped: false, price: 30 });
  const refund = await processRefund(order.id);
  expect(refund.amount).toBe(30);
});
```

**❌ Bad: Too generic, doesn't capture the actual bug**
```typescript
it('should handle user input', () => {
  const result = processInput('test');
  expect(result).toBeTruthy(); // What bug was this fixing?
});
```

## Success Indicators

- Fewer duplicate bug reports and regressions
- Faster debugging with clear reproduction steps
- Higher release confidence
- Better team understanding of failure modes

## Related Patterns

**Testability First:** Regression tests improve overall testability by revealing gaps in your testing strategy.

**Integration-First Testing:** Many bugs occur at integration boundaries, making regression tests valuable for integration coverage.

**Fail-Fast Validation:** Converting bugs to tests helps catch similar issues earlier in the development cycle.
