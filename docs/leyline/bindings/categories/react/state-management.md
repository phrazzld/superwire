---
derived_from: simplicity
enforced_by: Code review, Architecture reviews
id: state-management
last_modified: '2025-05-14'
version: '0.2.0'
---
# Binding: Frontend State Management

Apply minimalist state management by using the right approach for each need: local
component state for isolated UI, React Context for shared component state, React Query
for server data, React Hook Form for forms, and global state libraries only when truly
necessary.

## Rationale

This binding implements our simplicity tenet by preventing state management over-engineering. Global stores for all state create complexity, unpredictable cascading changes, difficult debugging, and performance issues from excessive re-renders. A hierarchical approach—local component state, shared context, and global state only when necessary—reduces complexity while improving performance and maintainability.

## Rule Definition

**Core Requirements:**

- **Hierarchical State Selection**: Use local component state first, then context for shared state, then global stores only when necessary
- **State Locality**: Keep state as close as possible to where it's used
- **Separation of Concerns**: Distinguish UI state (local), server state (React Query), form state (React Hook Form), and application state (global)
- **Immutable Updates**: Never mutate state directly, always create new state objects
- **Clear Ownership**: Each piece of state has one responsible owner

**State Types:**
- UI State: Component appearance, animations, toggles
- Server State: API data, cached entities
- Form State: Input values, validation, submission
- Application State: User settings, authentication, global mode

## Practical Implementation

**Comprehensive State Management Demonstrating All Approaches:**

```tsx
// 1. Local Component State for UI
function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle Sidebar</button>
      {isOpen && <div className="sidebar">Sidebar content</div>}
    </>
  );
}

// 2. Context for Shared Component State
const ThemeContext = createContext();

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

// 3. Server State with React Query
function ProductList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  return <ProductGrid products={data} />;
}

// 4. Form State with React Hook Form
function ContactForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    await submitContactForm(data);
    toast.success('Form submitted!');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name', { required: 'Name required' })} />
      {errors.name && <span>{errors.name.message}</span>}
      <button type="submit" disabled={isSubmitting}>Submit</button>
    </form>
  );
}

// 5. Global State with Zustand
const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (credentials) => {
    const user = await authService.login(credentials);
    set({ user, isAuthenticated: true });
  },
  logout: () => set({ user: null, isAuthenticated: false })
}));

function AuthStatus() {
  const { user, isAuthenticated, logout } = useAuthStore();
  return isAuthenticated ? (
    <div>Welcome, {user.name} <button onClick={logout}>Logout</button></div>
  ) : <LoginButton />;
}
```

## Examples

```tsx
// ❌ BAD: Everything in global state
const store = createStore({
  // UI state that should be local
  isModalOpen: false,
  activeTab: 'home',

  // Form state that should use dedicated library
  firstName: '', lastName: '', email: '', formErrors: {},

  // Server state that should use React Query
  users: [], usersLoading: false, usersError: null,

  // Many mixed actions for different concerns
  setModalOpen: (state, isOpen) => ({ ...state, isModalOpen: isOpen }),
  setActiveTab: (state, tab) => ({ ...state, activeTab: tab }),
  // ... complexity grows exponentially
});

// ✅ GOOD: Appropriate state management for each concern
// Local state for UI
function TabPanel() {
  const [activeTab, setActiveTab] = useState('home');
  return (
    <div>
      <TabList activeTab={activeTab} onChange={setActiveTab} />
      <TabContent activeTab={activeTab} />
    </div>
  );
}

// React Query for server state
function UserList() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers
  });

  if (isLoading) return <Loader />;
  if (error) return <ErrorMessage error={error} />;
  return <UserTable users={users} />;
}

// React Hook Form for forms
function ProfileForm() {
  const { register, handleSubmit } = useForm();
  return (
    <form onSubmit={handleSubmit(updateProfile)}>
      <input {...register('name', { required: true })} />
    </form>
  );
}

// Zustand only for truly global state
const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (credentials) => {
    const user = await authService.login(credentials);
    set({ user, isAuthenticated: true });
  }
}));
```

## Related Bindings

- [component-architecture.md](../../docs/bindings/core/component-architecture.md): Component architecture and
  state management work hand in hand. Well-designed component boundaries make state
  management simpler by encapsulating related state and behavior. This binding builds on
  component architecture by defining how state should flow through the component
  hierarchy.

- [immutable-by-default.md](../../docs/bindings/core/immutable-by-default.md): State immutability is a
  fundamental requirement for predictable frontend applications. This binding reinforces
  the immutable-by-default binding by applying it specifically to React's state
  management patterns, ensuring state updates are predictable and traceable.

- [pure-functions.md](../../docs/bindings/core/pure-functions.md): State management logic should follow pure
  function principles. Reducers, selectors, and state transformations should be pure
  functions without side effects, making state changes predictable and testable.

- [dependency-management.md](../../docs/bindings/core/dependency-management.md): Careful selection of state
  management libraries is an important aspect of dependency management. This binding
  complements dependency management by providing guidance on when to introduce state
  management libraries versus using built-in React capabilities.

- [type-safe-state-management](../typescript/type-safe-state-management.md): React state management should leverage TypeScript's type system to prevent runtime errors and ensure state consistency across the application.

- [no-any](../typescript/no-any.md): State management patterns must avoid `any` types to maintain type safety and enable proper IDE support for state operations and transformations.
