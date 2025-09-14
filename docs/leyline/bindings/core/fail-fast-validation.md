---
id: fail-fast-validation
last_modified: '2025-06-03'
version: '0.2.0'
derived_from: explicit-over-implicit
enforced_by: 'static analysis tools & runtime assertions'
---
# Binding: Validate Inputs and Fail Fast When Preconditions Fail

Immediately validate all inputs and assumptions at function entry points, failing with clear error messages when expectations aren't met. Prevent invalid data from propagating through the system.

## Rationale

This binding implements explicit-over-implicit by making function assumptions visible through immediate validation. When you validate preconditions at entry points, you create self-documenting code that clearly states expectations and guarantees.

The principle "dead programs tell no lies" is fundamental—a program that crashes immediately when something is wrong is infinitely more reliable than one that continues with invalid data. Fail-fast validation transforms silent corruption into loud, immediate feedback that guides developers to the actual problem source.

## Rule Definition

### Mandatory Validation Points
- **Parameter Validation**: Check type, range, format, and business rule compliance
- **State Validation**: Verify object state preconditions before proceeding
- **Resource Validation**: Confirm required resources exist and are accessible
- **Contract Validation**: Ensure calling context meets function's assumptions

### Validation Requirements
- **Immediate**: Performed before any other logic or side effects
- **Complete**: Cover all assumptions the function makes
- **Explicit**: State exactly what constraint was violated
- **Actionable**: Provide information needed to fix the problem

### Error Handling Standards
- **Clear Messages**: Describe expected vs. received values
- **Context Information**: Include relevant parameter values and constraints
- **Consistent Format**: Use standardized error structures across codebase
- **Appropriate Exceptions**: Choose exception types that reflect violation category

### Performance Considerations
- Use compile-time checking where possible (type systems, static analysis)
- Cache expensive validations when inputs haven't changed
- Provide debug vs. production validation levels for performance-critical paths
- Document any validation shortcuts taken for performance reasons

## Practical Implementation

1. **Establish Input Validation Patterns**: Use guard clauses at function beginnings. Create reusable validation utilities for consistency.

2. **Implement Type-Safe Validation**: Leverage type systems to catch compile-time violations. Design APIs that make invalid states unrepresentable.

3. **Create Domain-Specific Validators**: Build validators that understand business semantics, not just format. Make them reusable and independently testable.

4. **Design Developer-Friendly Error Messages**: Include actual values, violated constraints, and resolution suggestions. Use consistent formatting for quick scanning.

5. **Use Assertion Libraries Effectively**: Choose libraries with clear, readable validation code and helpful error messages. Prefer natural language assertions.

6. **Implement Graceful Degradation Boundaries**: Design error propagation strategies that prevent cascading failures while maintaining data integrity.

## Examples

```typescript
// ❌ BAD: No validation, silent failures propagate
function calculateMonthlyPayment(principal, interestRate, termMonths) {
  const monthlyRate = interestRate / 12;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
         (Math.pow(1 + monthlyRate, termMonths) - 1);
}

// ✅ GOOD: Comprehensive validation with clear errors
function calculateMonthlyPayment(principal: number, interestRate: number, termMonths: number): number {
  // Validate principal
  if (!isFinite(principal) || principal <= 0) {
    throw new Error(`Principal must be positive finite number, received: ${principal}`);
  }
  if (principal > 10_000_000) {
    throw new Error(`Principal exceeds maximum (10M), received: ${principal}`);
  }

  // Validate interest rate
  if (!isFinite(interestRate) || interestRate < 0) {
    throw new Error(`Interest rate must be non-negative finite number, received: ${interestRate}`);
  }
  if (interestRate > 1) {
    throw new Error(`Interest rate appears to be percentage (>100%), expected decimal, received: ${interestRate}`);
  }

  // Validate term
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    throw new Error(`Term must be positive integer months, received: ${termMonths}`);
  }
  if (termMonths > 480) { // 40 years
    throw new Error(`Term exceeds maximum (480 months), received: ${termMonths}`);
  }

  // Business logic with validated inputs
  if (interestRate === 0) return principal / termMonths;

  const monthlyRate = interestRate / 12;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
                  (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.round(payment * 100) / 100;
}
```

```python
# ❌ BAD: No validation leads to corruption
def update_user_profile(user_id, profile_data):
    user = get_user(user_id)
    user.email = profile_data.get('email')
    user.age = profile_data.get('age')
    save_user(user)

# ✅ GOOD: Comprehensive validation prevents corruption
def update_user_profile(user_id: str, profile_data: dict) -> User:
    # Validate user_id
    if not user_id or not isinstance(user_id, str) or not user_id.strip():
        raise ValueError("user_id must be non-empty string")

    # Validate profile_data
    if not isinstance(profile_data, dict) or not profile_data:
        raise ValueError("profile_data must be non-empty dictionary")

    # Validate email if present
    if 'email' in profile_data:
        email = profile_data['email']
        if not isinstance(email, str) or not email.strip():
            raise ValueError("email must be non-empty string")
        if '@' not in email or '.' not in email.split('@')[-1]:
            raise ValueError(f"Invalid email format: {email}")

    # Validate age if present
    if 'age' in profile_data:
        age = profile_data['age']
        if not isinstance(age, int) or age < 0 or age > 150:
            raise ValueError(f"age must be integer 0-150, received: {age}")

    # Apply validated updates
    user = get_user(user_id)
    if not user:
        raise ValueError(f"User not found: {user_id}")

    for field in ['email', 'age']:
        if field in profile_data:
            setattr(user, field, profile_data[field])

    save_user(user)
    return user
```

```java
// ❌ BAD: No validation allows invalid operations
public void withdraw(BigDecimal amount) {
    this.balance = this.balance.subtract(amount);
}

// ✅ GOOD: Comprehensive precondition validation
public void withdraw(BigDecimal amount) {
    // Validate amount
    if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
        throw new IllegalArgumentException("Amount must be positive: " + amount);
    }

    // Validate account state
    if (status == AccountStatus.CLOSED || status == AccountStatus.FROZEN) {
        throw new IllegalStateException("Cannot withdraw from " + status + " account");
    }

    // Validate sufficient funds
    if (amount.compareTo(balance) > 0) {
        throw new InsufficientFundsException(
            String.format("Insufficient funds. Requested: %s, Available: %s", amount, balance)
        );
    }

    // Perform withdrawal
    this.balance = this.balance.subtract(amount);
    recordTransaction(TransactionType.WITHDRAWAL, amount);
}
```

## Related Bindings

- [use-structured-logging](use-structured-logging.md): Provides detailed context when validation failures occur
- [pure-functions](pure-functions.md): Makes validation logic testable and composable
- [dependency-inversion](dependency-inversion.md): Makes dependencies explicit and validatable
- [input-validation-standards](../categories/security/input-validation-standards.md): Adds security-specific validation rules
