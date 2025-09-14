---
derived_from: modularity
enforced_by: code review & project linting rules
id: module-organization
last_modified: '2025-05-14'
version: '0.2.0'
---
# Binding: Organize TypeScript Code Into Feature-Focused Modules

Structure TypeScript code into cohesive modules organized by features or domains rather than technical concerns. Each module should encapsulate related functionality with clear boundaries, controlled visibility, and explicit interfaces that hide implementation details.

## Rationale

Feature-focused modules create natural boundaries that align with system changes, while technical-layer modules create artificial boundaries that cut across features, leading to scattered modifications and increased cognitive overhead.

## Rule Definition

**Core Requirements:**
- **Module Identity**: Organize by domain features, not technical roles; single responsibility per module
- **Project Structure**: Use `src` directory; co-locate related files; maintain flat hierarchy (≤3-4 levels)
- **Module Boundaries**: Define public API through deliberate exports; use barrel files (`index.ts`); keep internals private
- **Module Dependencies**: High cohesion, low coupling; no circular dependencies; depend down the hierarchy
- **Import/Export**: ES Modules only; prefer named exports; re-export shared types; avoid deep relative imports

**Exceptions**: Keep small utilities in feature modules; shared utilities go in purpose-specific shared modules.

## Implementation

1. **Feature-Based Directory Structure**: Organize by domain features, not technical concerns
2. **Barrel Files**: Use `index.ts` files to control module exports
3. **Path Aliases**: Set up TypeScript aliases to avoid deep relative imports
4. **Dependency Inversion**: Use interfaces for module communication
5. **ESLint Rules**: Configure rules to enforce module boundaries

## Examples

**❌ BAD: Technical-layer organization**
```
src/
├── controllers/ # All controllers mixed
├── services/    # All services mixed
├── models/      # All models mixed
└── utils/       # Generic bucket
```

**✅ GOOD: Feature-based organization**
```
src/
├── features/
│   ├── user/
│   │   ├── index.ts          # Public API
│   │   ├── types.ts          # User types
│   │   ├── user.service.ts   # Business logic
│   │   └── user.test.ts      # Co-located tests
│   ├── product/
│   └── order/
├── shared/
│   ├── api/
│   ├── components/
│   └── utils/
└── main.ts
```

**Barrel File Example:**
```typescript
// features/user/index.ts
export type { User, UserRole } from './types';
export { UserService } from './user.service';
export type { UserRepository } from './user.repository';
// Internal implementations NOT exported
```

**Path Aliases Configuration:**
```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@features/*": ["features/*"],
      "@shared/*": ["shared/*"]
    }
  }
}

// Clean imports:
import { User } from '@features/user';
import { formatDate } from '@shared/utils';
```

**Dependency Inversion:**
```typescript
// features/order/types.ts
import type { User } from '@features/user';

export interface Order {
  id: string;
  user: User;
  status: 'pending' | 'shipped' | 'delivered';
}

// Define interfaces for dependencies
export interface UserService {
  canPlaceOrder(userId: string): Promise<boolean>;
}

export interface ProductService {
  checkAvailability(productId: string, quantity: number): Promise<boolean>;
}

// features/order/order.service.ts
export class OrderService {
  constructor(
    private userService: UserService,
    private productService: ProductService
  ) {}

  async createOrder(userId: string, items: Array<{productId: string, quantity: number}>): Promise<Order> {
    const canPlace = await this.userService.canPlaceOrder(userId);
    if (!canPlace) throw new Error('User cannot place order');
    // Implementation...
  }
}
```

**Breaking Circular Dependencies:**

```typescript
// ❌ BAD: Circular dependencies
// user.service.ts imports OrderService
// order.service.ts imports UserService

// ✅ GOOD: Use interfaces to break cycles
// shared/types/user.interface.ts
export interface User { id: string; name: string; email: string; }

// Use interfaces to break circular dependencies
export interface OrderOperations {
  getOrdersByUserId(userId: string): Promise<Order[]>;
}
```

**ESLint Configuration:**
```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'import/no-cycle': 'error', // Prevent circular dependencies
    'import/order': 'error',    // Ensure import order
    // Module boundary rules with eslint-plugin-boundaries
  }
};
```

## Related Bindings

- [modularity](../../tenets/modularity.md): TypeScript-specific implementation of core modularity tenet
- [dependency-inversion](../../core/dependency-inversion.md): Module organization works with dependency inversion
- [no-any](no-any.md): Strong typing creates explicit contracts between modules
- [hex-domain-purity](../../core/hex-domain-purity.md): Feature modules support hexagonal architecture
