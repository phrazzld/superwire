---
id: complexity-detection-patterns
last_modified: '2025-06-17'
version: '0.2.0'
derived_from: simplicity
enforced_by: 'static analysis, code review, complexity metrics'
---

# Binding: Detect and Eliminate Complexity Patterns

Recognize specific code smells and patterns that indicate complexity demons have infected your codebase. Use concrete metrics and thresholds to identify complexity before it becomes entrenched, and apply targeted refactoring strategies to eliminate each pattern.

## Rationale

Complexity accumulates through specific patterns that disguise themselves as necessary abstractions. This binding provides concrete detection criteria, measurable thresholds, and remediation strategies for common complexity demons.

## Rule Definition

**MUST** measure and track complexity metrics during development and code review.

**MUST** address complexity patterns immediately when detected rather than deferring to "later refactoring."

**SHOULD** automate complexity detection through static analysis tools and linting rules.

**SHOULD** establish team-wide thresholds for complexity metrics and enforce them in CI.

## Core Complexity Patterns

### 1. Parameter Explosion Pattern

**Detection:** Functions with 4+ parameters, constructor injection with 5+ dependencies

**Example:**
```typescript
// ❌ COMPLEXITY DEMON: Parameter explosion
function processOrder(orderId: string, customerId: string, paymentMethod: string,
  shippingAddress: string, billingAddress: string, discountCode: string,
  priority: boolean, giftWrap: boolean) { /* ... */ }

// ✅ SIMPLE: Group related parameters
interface OrderRequest {
  orderId: string; customerId: string; payment: PaymentInfo;
  shipping: ShippingInfo; options: OrderOptions;
}
function processOrder(request: OrderRequest) { /* ... */ }
```

### 2. Deep Nesting Pattern

**Detection:** Cyclomatic complexity > 10, nesting depth > 3 levels

**Example:**
```typescript
// ❌ COMPLEXITY DEMON: Deep nesting
function validateUser(user: User): boolean {
  if (user) {
    if (user.email) {
      if (user.email.includes('@')) {
        if (user.age >= 18) {
          if (user.permissions?.includes('read')) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

// ✅ SIMPLE: Early returns and guard clauses
function validateUser(user: User): boolean {
  if (!user?.email?.includes('@')) return false;
  if (user.age < 18) return false;
  if (!user.permissions?.includes('read')) return false;
  return true;
}
```

### 3. God Object Pattern

**Detection:** Classes with 15+ methods, files with 500+ lines, classes with 10+ private fields

**Example:**
```typescript
// ❌ COMPLEXITY DEMON: God class with 20+ methods
class UserManager {
  createUser() { /* ... */ }
  validateUser() { /* ... */ }
  authenticateUser() { /* ... */ }
  updateUserProfile() { /* ... */ }
  // ... 17 more methods
}

// ✅ SIMPLE: Single responsibility classes
class UserCreator { createUser() { /* ... */ } }
class UserAuthenticator { authenticateUser() { /* ... */ } }
class UserProfileManager { updateUserProfile() { /* ... */ } }
```

### 4. Configuration Explosion Pattern

**Detection:** Configuration files with 50+ options, nested configuration 4+ levels deep

**Example:**
```yaml
# ❌ COMPLEXITY DEMON: Deep nested configuration
app:
  database:
    connection:
      pool: { min: 5, max: 20, idle: 1000 }
      retry: { attempts: 3, delay: 1000 }
# ... 47 more options

# ✅ SIMPLE: Essential configuration only
app:
  database_url: "postgres://..."
  cache_enabled: true
```

### 5. Abstract Factory Factory Pattern

**Detection:** Classes with "Factory," "Builder," "Manager" without clear purpose, interfaces with single implementations

**Example:**
```typescript
// ❌ COMPLEXITY DEMON: Unnecessary abstraction
interface NotificationSenderFactory {
  createSender(): NotificationSender;
}
class EmailNotificationSenderFactory implements NotificationSenderFactory {
  createSender(): EmailNotificationSender { return new EmailNotificationSender(); }
}

// ✅ SIMPLE: Direct implementation
class EmailSender { send(message: string): void { /* Send email */ } }
```

### 6. Boolean Trap Pattern

**Detection:** Functions with 3+ boolean parameters, unclear boolean literals in calls

**Example:**
```typescript
// ❌ COMPLEXITY DEMON: Boolean traps
function createUser(email: string, sendWelcome: boolean, validateEmail: boolean,
  createProfile: boolean) { /* ... */ }
createUser("user@example.com", true, false, true); // What do these mean?

// ✅ SIMPLE: Explicit options object
interface UserCreationOptions {
  sendWelcomeEmail: boolean;
  skipEmailValidation: boolean;
  createBlankProfile: boolean;
}
function createUser(email: string, options: UserCreationOptions) { /* ... */ }
```

### 7. Magic Number Pattern

**Detection:** Numeric literals scattered throughout code, same numbers repeated

**Example:**
```typescript
// ❌ COMPLEXITY DEMON: Magic numbers
function calculatePrice(basePrice: number, userType: string): number {
  return userType === 'premium' ? basePrice * 0.85 * 1.08 : basePrice * 1.08;
}

// ✅ SIMPLE: Named constants
const PREMIUM_DISCOUNT = 0.15;
const TAX_RATE = 0.08;
```

### 8. Async Complexity Pattern

**Detection:** Nested callbacks 4+ levels deep, try-catch blocks nested 3+ levels

**Example:**
```typescript
// ❌ COMPLEXITY DEMON: Callback pyramid
function processOrder(orderId: string, callback: Function) {
  fetchOrder(orderId, (order) => {
    validateOrder(order, (isValid) => {
      if (isValid) {
        processPayment(order.payment, (result) => {
          updateInventory(order.items, () => callback(null, { success: true }));
        });
      }
    });
  });
}

// ✅ SIMPLE: Async/await with early returns
async function processOrder(orderId: string): Promise<ProcessResult> {
  const order = await fetchOrder(orderId);
  if (!await validateOrder(order)) throw new Error('Invalid order');
  await processPayment(order.payment);
  await updateInventory(order.items);
  return { success: true };
}
```

## Complexity Metrics and Thresholds

### Automated Detection Thresholds

| Metric | Threshold | Tool |
|--------|-----------|------|
| **Cyclomatic Complexity** | > 10 | ESLint |
| **Function Length** | > 50 lines | Static analysis |
| **Parameter Count** | > 3 parameters | Linting |
| **Nesting Depth** | > 3 levels | AST analysis |
| **Class Methods** | > 12 methods | Static analysis |
| **Boolean Parameters** | > 2 booleans | Custom rules |

### Manual Review Red Flags
- "This is complex, but..." justifications
- Code requiring extensive comments

## Refactoring Strategies by Priority

### Quick Wins (High-Impact, Low-Risk)
1. **Extract Named Constants** - Replace magic numbers
2. **Add Early Returns** - Flatten deep nesting
3. **Group Parameters** - Use objects for 4+ parameters
4. **Replace Boolean Traps** - Use explicit options

### Architectural Improvements
5. **Extract Small Functions** - Break up god objects
6. **Flatten Async Code** - Use async/await patterns
7. **Remove Unnecessary Abstractions** - Delete factory factories

## Success Metrics

**Code Health:**
- Complexity metrics trending downward
- Faster code review cycles
- Reduced bug density in refactored areas
- Reduced time to understand code
- Faster onboarding for new members

## Implementation Strategy

### Automated Detection
```json
{
  "rules": {
    "complexity": ["error", 10],
    "max-params": ["error", 3],
    "max-depth": ["error", 3],
    "max-lines-per-function": ["error", 50]
  }
}
```

### Team Adoption Process
1. **Establish Baselines** - Measure current metrics
2. **Automate Detection** - Add linting and CI checks

## Related Patterns

**Simplicity Above All:** These patterns identify when complexity demons violate simplicity principles.

**Avoid Premature Abstraction:** Many patterns result from premature abstraction.
