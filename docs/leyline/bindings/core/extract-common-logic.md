---
id: extract-common-logic
last_modified: '2025-06-02'
version: '0.2.0'
derived_from: dry-dont-repeat-yourself
enforced_by: 'Code review, static analysis, refactoring tools'
---
# Binding: Extract and Centralize Common Logic

Identify recurring patterns, algorithms, and business rules in your codebase and extract them into reusable abstractions. This creates a single authoritative implementation that can be maintained, tested, and evolved in one place.

## Rationale

This binding implements our DRY tenet by eliminating knowledge duplication at the code level. Like creating a recipe book where each technique is documented once rather than scattered on sticky notes, extracting common logic creates a single source of truth for each piece of business knowledge.

Without extraction, the same bug can exist in multiple places, improvements benefit only some users of the logic, and implementations slowly drift apart, leading to subtle bugs and inconsistent behavior across the system.

## Rule Definition

Common logic extraction requires:

- **Identify True Duplication**: Only extract logic when it represents the same conceptual operation, not just similar-looking code
- **Extract at the Right Level**: Choose appropriate abstraction level (function, class, module) based on scope and complexity
- **Single Responsibility**: Extracted logic should have one clear purpose
- **Handle Variations**: Use parameters or strategy patterns for variations rather than duplicating core logic
- **Clear Interfaces**: Create well-documented interfaces that prevent misuse

Extract business rules, data transformations, calculations, and error handling. Don't extract code that serves different purposes, will diverge in the future, or where extraction adds unnecessary complexity.

## Practical Implementation

1. **Apply the Rule of Three**: Wait until you see the same pattern three times before extracting
2. **Start with Pure Functions**: Begin with functions that have no side effects—they're easiest to extract and test
3. **Use Configuration for Variations**: Handle differences through parameters or strategy patterns
4. **Create Domain-Specific Utilities**: Organize extracted logic by domain rather than generic "utils" collections

## Examples

```typescript
// ❌ BAD: Duplicated validation logic across multiple components
class UserRegistrationForm {
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  validatePassword(password: string): boolean {
    return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password);
  }
}

class UserProfileForm {
  validateEmail(email: string): boolean {
    // Same logic duplicated with slight variation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255; // Different length!
  }

  validatePassword(password: string): boolean {
    // Same logic duplicated
    return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password);
  }
}
```

```typescript
// ✅ GOOD: Extracted and centralized validation logic
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class EmailValidator {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly MAX_LENGTH = 254;

  static validate(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email) {
      errors.push('Email is required');
    } else {
      if (!this.EMAIL_REGEX.test(email)) {
        errors.push('Email format is invalid');
      }
      if (email.length > this.MAX_LENGTH) {
        errors.push(`Email must not exceed ${this.MAX_LENGTH} characters`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}

export class PasswordValidator {
  static validate(password: string, minLength: number = 8): ValidationResult {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
    } else {
      if (password.length < minLength) {
        errors.push(`Password must be at least ${minLength} characters`);
      }
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}

// Usage is now consistent and maintainable
class UserRegistrationForm {
  validateForm(data: { email: string; password: string }): ValidationResult {
    const emailResult = EmailValidator.validate(data.email);
    const passwordResult = PasswordValidator.validate(data.password);

    return {
      isValid: emailResult.isValid && passwordResult.isValid,
      errors: [...emailResult.errors, ...passwordResult.errors]
    };
  }
}
```

## Related Bindings

- [centralized-configuration](../../docs/bindings/core/centralized-configuration.md): Common logic extraction focuses on behavioral duplication while centralized configuration addresses data and settings duplication—together they create comprehensive DRY adherence.

- [pure-functions](../../docs/bindings/core/pure-functions.md): Pure functions are ideal candidates for extraction because they have no side effects and can be safely reused across different contexts.
