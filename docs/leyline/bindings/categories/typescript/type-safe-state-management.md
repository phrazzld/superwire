---
id: type-safe-state-management
last_modified: '2025-06-02'
version: '0.2.0'
derived_from: orthogonality
enforced_by: 'TypeScript compiler, state management libraries, code review'
---
# Binding: Implement Type-Safe State Management with Isolated State Boundaries

Design state management systems using TypeScript's type system to enforce clear boundaries between different domains of application state. Use discriminated unions, immutable patterns, and type guards to prevent state contamination and ensure predictable state transitions.

## Rationale

This binding implements our orthogonality tenet by creating independent, self-contained state domains that can evolve without affecting each other. Like a well-organized library where each section has clear boundaries and doesn't affect other sections, well-typed state domains have predictable organization and can evolve independently.

Without proper type boundaries, state management becomes chaotic where changes to one part can have unexpected effects throughout the system. TypeScript's discriminated unions, strict interfaces, and type guards prevent this chaos by enforcing boundaries before runtime.

## Rule Definition

Type-safe state management requires:

- **Domain State Isolation**: Separate, strongly-typed interfaces for each logical domain (UI, business entities, application state)
- **Discriminated Union Actions**: Type-safe actions with literal discriminators enabling exhaustive checking
- **Immutable State Patterns**: TypeScript `readonly` modifiers and immutable update patterns
- **Type-Safe Selectors**: Typed selector functions that provide compile-time guarantees
- **State Transition Guards**: Type guards to ensure valid state transitions and maintain type safety
- **Error State Modeling**: Explicit error states as part of the type system rather than implicit handling

## Practical Implementation

1. **Domain-Isolated State Interfaces**: Create separate state domains with clear boundaries:

   ```typescript
   interface UserState {
     readonly currentUser: User | null;
     readonly profile: AsyncState<UserProfile>;
     readonly preferences: UserPreferences;
   }

   interface OrderState {
     readonly orders: ReadonlyArray<Order>;
     readonly currentOrder: Order | null;
     readonly loading: {
       readonly list: boolean;
       readonly submission: boolean;
     };
   }

   interface AppState {
     readonly user: UserState;
     readonly orders: OrderState;
     readonly ui: UIState;
   }
   ```

2. **Discriminated Union Actions**: Use type-safe actions with exhaustive checking:

   ```typescript
   type UserAction =
     | { type: 'USER_LOAD_PROFILE_START' }
     | { type: 'USER_LOAD_PROFILE_SUCCESS'; payload: UserProfile }
     | { type: 'USER_LOAD_PROFILE_FAILURE'; payload: string }
     | { type: 'USER_LOGOUT' };

   function userReducer(state: UserState, action: UserAction): UserState {
     switch (action.type) {
       case 'USER_LOAD_PROFILE_START':
         return {
           ...state,
           profile: { status: 'loading' }
         };

       case 'USER_LOAD_PROFILE_SUCCESS':
         return {
           ...state,
           profile: { status: 'success', data: action.payload }
         };

       case 'USER_LOAD_PROFILE_FAILURE':
         return {
           ...state,
           profile: { status: 'error', error: action.payload }
         };

       case 'USER_LOGOUT':
         return {
           ...state,
           currentUser: null,
           profile: { status: 'idle' }
         };

       default:
         const _exhaustiveCheck: never = action;
         return state;
     }
   }
   ```

3. **Type-Safe Selectors and State Guards**: Build selectors with compile-time guarantees:

   ```typescript
   type AppSelector<TResult> = (state: AppState) => TResult;

   // Async state type guards
   type AsyncState<T> =
     | { status: 'idle' }
     | { status: 'loading' }
     | { status: 'success'; data: T }
     | { status: 'error'; error: string };

   function isSuccessState<T>(state: AsyncState<T>): state is { status: 'success'; data: T } {
     return state.status === 'success';
   }

   function isErrorState<T>(state: AsyncState<T>): state is { status: 'error'; error: string } {
     return state.status === 'error';
   }

   // Type-safe selectors
   const selectCurrentUser: AppSelector<User | null> = (state) => state.user.currentUser;

   const selectUserDisplayName: AppSelector<string> = createSelector(
     [selectCurrentUser, (state: AppState) => state.user.profile],
     (user, profileState): string => {
       if (isSuccessState(profileState)) {
         return profileState.data.displayName || user?.email || 'Anonymous';
       }
       return user?.email || 'Anonymous';
     }
   );

   // Usage in components with type safety
   function UserProfileComponent() {
     const profileState = useSelector((state: AppState) => state.user.profile);

     if (profileState.status === 'loading') return <LoadingSpinner />;
     if (isErrorState(profileState)) return <ErrorMessage error={profileState.error} />;
     if (isSuccessState(profileState)) return <ProfileDisplay profile={profileState.data} />;

     return <EmptyState />;
   }
   ```

## Examples

```typescript
// ❌ BAD: Monolithic state with mixed concerns and poor type safety
interface AppState {
  user?: any;
  orders?: any[];
  loading?: boolean;
  error?: string;
  modal?: string;
}

type Action = { type: string; payload?: any };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    // No compile-time checking for action types or payload shapes
    default:
      return state;
  }
}
```

```typescript
// ✅ GOOD: Domain-separated state with comprehensive type safety
interface UserState {
  readonly currentUser: User | null;
  readonly profile: AsyncState<UserProfile>;
  readonly preferences: UserPreferences;
}

interface AppState {
  readonly user: UserState;
  readonly orders: OrderState;
  readonly ui: UIState;
}

type UserAction =
  | { type: 'USER_SET_CURRENT'; payload: User }
  | { type: 'USER_PROFILE_FETCH_SUCCESS'; payload: UserProfile }
  | { type: 'USER_PROFILE_FETCH_ERROR'; payload: string };

function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case 'USER_SET_CURRENT':
      return { ...state, currentUser: action.payload };

    case 'USER_PROFILE_FETCH_SUCCESS':
      return {
        ...state,
        profile: { status: 'success', data: action.payload }
      };

    case 'USER_PROFILE_FETCH_ERROR':
      return {
        ...state,
        profile: { status: 'error', error: action.payload }
      };

    default:
      const _exhaustiveCheck: never = action;
      return state;
  }
}
```

## Related Bindings

- [component-isolation](../../core/component-isolation.md): Type-safe state management implements component isolation by creating clear boundaries between state domains, preventing coupling and enabling independent evolution.

- [async-patterns](../../docs/bindings/categories/typescript/async-patterns.md): Async state management requires type-safe patterns for handling loading, success, and error states that complement this binding's state modeling approach.
