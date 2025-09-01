---
derived_from: no-secret-suppression
enforced_by: code review & custom linters
id: no-lint-suppression
last_modified: '2025-05-14'
version: '0.2.0'
---
# Binding: Document Why You're Silencing Warnings

Never disable or suppress linter warnings, static analysis errors, or type checking
flags without including a detailed comment explaining why the suppression is necessary,
what makes the code safe despite the warning, and why fixing the issue properly isn't
feasible. Unexplained suppressions are strictly forbidden.

## Rationale

Silencing warnings without explanation forces future developers to trust decisions blindly, with no way to evaluate whether bypasses remain necessary as code evolves.

Undocumented suppressions create technical debt that compounds over time. As teams change, original context is lost. New developers must either trust suppressions blindly or reverse-engineer intent. When surrounding code changes, there's no way to know if suppression conditions still apply.

Requiring documentation for every suppression creates a history of deliberate decisions rather than mysterious exceptions, making codebases more maintainable and trustworthy.

## Rule Definition

This binding establishes clear requirements for any code that suppresses automated
quality checks:

**Documentation Requirements:** All suppressions must include comments explaining:
- Why the rule is triggering
- Why the code is safe despite the warning
- Why proper fixing isn't feasible
- Timeline or ticket reference for revisiting

**Covered Methods:** Linter comments (`// eslint-disable-line`), compiler flags (`@SuppressWarnings`), type assertions (`as any`), config suppressions, CI bypass flags

**Scope Limitations:** Narrow scope (line-level), specific targeting, temporary by default

**Permitted Exceptions:** External code integration, known false positives, emergency fixes, rule conflicts with higher priorities

Documentation requirement applies even to exceptions.

## Practical Implementation

**Write Informative Comments:**
```typescript
// ❌ BAD: No explanation
// eslint-disable-next-line no-console
console.log('User logged in');

// ✅ GOOD: Clear explanation
// eslint-disable-next-line no-console
// Production login events need console.log for monitoring tools per ARCH-2023-05
console.log('User logged in', { userId, timestamp });
```

**Make Suppressions Temporary:**
```java
// ❌ BAD: Permanent with vague reasoning
@SuppressWarnings("unchecked")
// We know this is safe
List<User> users = (List<User>) result;

// ✅ GOOD: Temporary with timeline
@SuppressWarnings("unchecked")
// Temporary cast until UserRepository uses generics (JIRA-1234, Q2)
List<User> users = (List<User>) result;
```

**Enforce with Tooling:**
```yaml
# ESLint rule configuration
rules:
  "eslint-comments/require-description": ["error"]
```

**Create Team Standards:** Document common suppression patterns
**Regular Audits:** Periodically review and clean up suppressions

## Examples

**Type Assertions:**
```typescript
// ❌ BAD: Unexplained assertion
const endpoint = config.endpoint as string;

// ✅ GOOD: Validation instead
if (!config.endpoint) throw new Error('API endpoint required');
fetch(config.endpoint);
```

**Function Complexity:**
```python
# ❌ BAD: Unexplained suppression
# pylint: disable=too-many-arguments
def process_data(arg1, arg2, arg3, arg4, arg5, arg6, arg7): pass

# ✅ GOOD: Refactor to class
class DataProcessor:
    def __init__(self, config): self.config = config
    def process(self): return self._format_results()

# If refactoring not possible:
# pylint: disable=too-many-arguments
# Legacy import process requires many parameters (JIRA-5678, Q3 refactor)
def process_data_legacy(arg1, arg2, arg3, arg4, arg5, arg6, arg7): pass
```

**Error Handling:**
```go
// ❌ BAD: Silent error ignore
data, _ := ioutil.ReadFile("config.json")

// ✅ GOOD: Proper error handling
data, err := ioutil.ReadFile("config.json")
if err != nil {
    return fmt.Errorf("reading config: %w", err)
}

// If ignoring is justified:
// #nosec G304 - Only checking existence, path injection not sensitive
_, err := os.Stat(path)
return err == nil
```

## Related Bindings

- [require-conventional-commits](../../docs/bindings/core/require-conventional-commits.md): Documents changes at repository level
- [use-structured-logging](../../docs/bindings/core/use-structured-logging.md): Tracks runtime information carefully
- [external-configuration](../../docs/bindings/core/external-configuration.md): Handles necessary deviations transparently
