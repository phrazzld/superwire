---
id: interface-contracts
last_modified: '2025-06-02'
version: '0.2.0'
derived_from: orthogonality
enforced_by: 'Type checking, API documentation, code review'
---
# Binding: Define Clear Component Interface Contracts

Establish explicit, well-documented contracts that define how components interact with each other. These contracts should specify inputs, outputs, behavior, error conditions, and guarantees, creating stable boundaries that enable independent development and reliable composition.

## Rationale

This binding implements our orthogonality tenet by creating clear boundaries between components. Well-defined interface contracts enable components to interact predictably without understanding internal implementation. Without explicit contracts, components become coupled through assumptions and implicit knowledge, leading to brittle code where changes break seemingly unrelated parts. Clear contracts prevent this by making expectations explicit and enforceable.

## Rule Definition

**Core Requirements:**

- **Input Specifications**: Define required/optional parameters, types, valid ranges, constraints, and invalid input handling
- **Output Guarantees**: Document return values, types, conditions, and both success and error cases
- **Behavioral Contracts**: Specify behavior, side effects, performance characteristics, and state changes
- **Error Handling**: Define error conditions, causes, communication methods, and recovery actions
- **Preconditions/Postconditions**: State what must be true before/after calls
- **Immutability Guarantees**: Specify whether inputs/outputs can be modified

**Contract Properties:**
- Verifiable through type systems, runtime checks, or testing
- Stable with backward-compatible changes or explicit versioning
- Complete enough for safe usage without implementation knowledge

## Practical Implementation

**Comprehensive Interface Contract Implementation:**

1. **Strong Type Systems**: Encode contract details in types for machine-checkable contracts
2. **Behavioral Documentation**: Use standardized formats (JSDoc, etc.) for behavior that can't be captured in types
3. **Runtime Validation**: Add checks for contract violations at system boundaries
4. **Contract Tests**: Write tests that verify contract compliance, not implementation details
5. **Contract Versioning**: Use semantic versioning and deprecation for contract changes

## Examples

```typescript
// ❌ BAD: Vague interface with unclear contract
interface UserService {
  getUser(id: any): any;
  updateUser(id: any, data: any): any;
}
// No contract about types, errors, behavior, or guarantees

// ✅ GOOD: Explicit contract with clear specifications
interface UserData {
  readonly id: string;
  name: string;
  email: string;
  readonly createdAt: Date;
  lastLoginAt: Date | null;
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
}

type UserServiceError =
  | { type: 'USER_NOT_FOUND'; userId: string }
  | { type: 'VALIDATION_ERROR'; field: string; message: string };

/**
 * User management service with explicit behavioral contracts
 */
interface UserService {
  /**
   * Retrieves a user by their unique identifier
   *
   * @param id - Valid user UUID string
   * @returns Promise resolving to UserData if found
   * @throws UserNotFoundError if user doesn't exist
   * @throws ValidationError if id format is invalid
   *
   * Contract guarantees:
   * - Returned user data is immutable (readonly fields)
   * - User ID in result matches requested ID
   * - All required fields are populated
   * - No side effects occur
   */
  getUser(id: string): Promise<UserData>;

  /**
   * Updates specified user fields
   *
   * @param id - Valid user UUID string
   * @param updates - Partial user data with only updatable fields
   * @returns Promise resolving to updated UserData
   *
   * Contract guarantees:
   * - Only provided fields are modified
   * - Readonly fields (id, createdAt) are never changed
   * - Email uniqueness is enforced
   * - Original user object is not modified (immutable operation)
   */
  updateUser(id: string, updates: UpdateUserRequest): Promise<UserData>;
}
```

```python
# ❌ BAD: Function with unclear contract
def process_payment(amount, user_id, payment_method):
    # Unclear what happens with invalid inputs or errors
    pass

# ✅ GOOD: Function with explicit contract
from dataclasses import dataclass
from enum import Enum

class PaymentStatus(Enum):
    SUCCESS = "success"
    INSUFFICIENT_FUNDS = "insufficient_funds"
    INVALID_AMOUNT = "invalid_amount"
    USER_NOT_FOUND = "user_not_found"

@dataclass(frozen=True)
class PaymentResult:
    """Immutable result of payment processing"""
    status: PaymentStatus
    transaction_id: str | None = None
    error_message: str | None = None
    amount_charged: float = 0.0

def process_payment(amount: float, user_id: str, payment_method: str) -> PaymentResult:
    """
    Process a payment for a user

    Args:
        amount: Payment amount in USD (must be > 0.01 and < 10000.00)
        user_id: Valid user UUID string (36 characters)
        payment_method: Payment method ID ("card_xxx" or "bank_xxx")

    Returns:
        PaymentResult with status and details

    Behavioral Contract:
        - Validates all inputs before processing
        - Charges payment method atomically
        - Never charges more than requested amount
        - Idempotent for same transaction within 1 hour

    Error Conditions:
        - amount <= 0.01 or > 10000.00: Returns INVALID_AMOUNT
        - user_id invalid format: Returns USER_NOT_FOUND
        - insufficient balance: Returns INSUFFICIENT_FUNDS

    Side Effects:
        - Creates transaction record in database
        - Sends email notification on success
    """
    if amount <= 0.01 or amount > 10000.00:
        return PaymentResult(
            status=PaymentStatus.INVALID_AMOUNT,
            error_message=f"Amount {amount} outside valid range (0.01-10000.00)"
        )
    # ... rest of implementation
```

## Related Bindings

- [component-isolation](../../docs/bindings/core/component-isolation.md): Interface contracts enable component isolation by providing communication mechanisms between isolated components
- [api-design](../../docs/bindings/core/api-design.md): API design principles apply to interface contracts at all levels for predictable component interactions
- [dependency-inversion](../../docs/bindings/core/dependency-inversion.md): Interface contracts are the foundation for dependency inversion and flexible, testable designs
- [no-internal-mocking](../../docs/bindings/core/no-internal-mocking.md): Clear contracts reduce complex mocking needs by making boundaries and expectations explicit
