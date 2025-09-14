---
derived_from: modularity
enforced_by: Code review, Storybook organization
id: component-architecture
last_modified: '2025-05-14'
version: '0.2.0'
---
# Binding: Component Architecture

Structure UI components using Atomic Design principles, organizing elements into a
hierarchical system of atoms, molecules, organisms, templates, and pages with clear
responsibilities and well-defined interfaces.

## Rationale

This binding implements our modularity tenet by establishing systematic frontend component organization. User interfaces combine hundreds of interactive elements that must work in harmony. Without structured breakdown, UI code becomes tangled, brittle, and resistant to change.

Atomic Design provides a mental model where interfaces are built from simple components combined into progressively more elaborate systems. This creates shared vocabulary for appropriate abstraction levels, enabling faster development cycles, consistent user experience, and systematic design implementation.

## Rule Definition

**Core Requirements:**

- **Atomic Design Hierarchy**: Structure components in five levels:
  - **Atoms**: Basic UI building blocks (buttons, inputs, icons)
  - **Molecules**: Simple combinations of atoms (search bars, form fields)
  - **Organisms**: Complex UI sections (navigation menus, forms, content cards)
  - **Templates**: Page-level structural components without specific content
  - **Pages**: Template instances populated with actual content

- **Single Responsibility**: Each component handles exactly one concern
- **Clear Interfaces**: Define explicit props with TypeScript types, defaults, and required/optional specifications
- **Composition Over Configuration**: Prefer composing smaller components rather than complex, highly configurable components
- **Separation of Concerns**: Separate presentational (how things look) from container (how things work) aspects
- **Component Discoverability**: Structure library with consistent naming and intuitive organization

**Exceptions** (rare, documented, minimal scope): Legacy integration, third-party component alignment, performance-critical optimization.

## Practical Implementation

1. **Set Up Project Structure**: Organize your components folder to reflect the Atomic
   Design hierarchy:

```
src/
  components/
    atoms/
      Button/
      Input/
      Typography/
    molecules/
      FormField/
      SearchBar/
      MenuItem/
    organisms/
      Navbar/
      UserProfile/
      ProductCard/
    templates/
      DashboardLayout/
      ProductDetailLayout/
    pages/
      Dashboard/
      ProductDetail/
```

2. **Start Small and Build Up**: Begin your component library with well-designed atoms:

   - Create comprehensive primitive UI components (buttons, inputs, typography)
   - Ensure atoms are highly reusable and follow design system specifications
   - Build thorough documentation and Storybook stories for each atom
   - Implement proper accessibility features at the atomic level

1. **Define Clear Component Interfaces**: Create well-defined props for every component:

   - Use TypeScript interfaces to document all props and their types
   - Make interfaces explicit about what is required vs. optional
   - Include JSDoc comments explaining the purpose of each prop

1. **Implement Effective Composition Patterns**: Design components to be combined in
   predictable ways:

   - Use React's children prop for simple composition
   - Implement the Compound Component pattern for related component sets
   - Use React Context for component communication within a hierarchy
   - Consider the Slot pattern for flexible content placement

1. **Document the Component Library**: Make your component system discoverable and
   usable:

   - Implement comprehensive Storybook documentation
   - Create usage examples for each component
   - Document component composition patterns
   - Generate a visual inventory of all available components

## Examples

```jsx
// ❌ BAD: Monolithic component with multiple responsibilities
function UserCard({ user, onEdit, onDelete, expanded, onToggleExpand }) {
  return (
    <div className="card">
      <img src={user.avatar} alt={user.name} className="avatar" />
      <div className="info">
        <h3>{user.name}</h3>
        <p>{user.email}</p>
        {expanded && <p>{user.bio}</p>}
      </div>
      <div className="actions">
        <button onClick={onToggleExpand}>{expanded ? 'Hide' : 'Show'}</button>
        <button onClick={onEdit}>Edit</button>
        <button onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

// ✅ GOOD: Atomic design with clear component hierarchy
// Atoms - basic building blocks
function Avatar({ src, alt, size = 'md' }) {
  return <img src={src} alt={alt} className={`avatar avatar-${size}`} />;
}

function Button({ children, variant = 'primary', onClick, disabled }) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function Input({ id, label, error, ...props }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className={error ? 'input-error' : 'input'}
        {...props}
      />
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

// Molecules - simple combinations of atoms
function UserInfo({ name, email, bio, showBio }) {
  return (
    <div className="user-info">
      <h3>{name}</h3>
      <p>{email}</p>
      {showBio && <p>{bio}</p>}
    </div>
  );
}

function UserActions({ onEdit, onDelete, expanded, onToggleExpand }) {
  return (
    <div className="actions">
      <Button onClick={onToggleExpand}>
        {expanded ? 'Hide Details' : 'Show Details'}
      </Button>
      <Button variant="secondary" onClick={onEdit}>Edit</Button>
      <Button variant="danger" onClick={onDelete}>Delete</Button>
    </div>
  );
}

// Organism - complex UI section combining molecules
function UserCard({ user, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card">
      <Avatar src={user.avatar} alt={user.name} />
      <UserInfo
        name={user.name}
        email={user.email}
        bio={user.bio}
        showBio={expanded}
      />
      <UserActions
        onEdit={onEdit}
        onDelete={onDelete}
        expanded={expanded}
        onToggleExpand={() => setExpanded(!expanded)}
      />
    </div>
  );
}

// Organism - form demonstrating composition over configuration
function ContactForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm();

  const onSubmit = async (data) => {
    try {
      await submitContactForm(data);
      toast.success('Form submitted successfully!');
      reset();
    } catch (error) {
      toast.error('Error: ' + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        id="name"
        label="Name"
        error={errors.name?.message}
        {...register('name', { required: 'Name is required' })}
      />

      <Input
        id="email"
        type="email"
        label="Email"
        error={errors.email?.message}
        {...register('email', {
          required: 'Email is required',
          pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email is invalid' }
        })}
      />

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
}
```

## Related Bindings

- [modularity](../../tenets/modularity.md): This binding implements the modularity tenet through systematic UI breakdown into composable components.
- [state-management](../categories/frontend/state-management.md): Complements component architecture by defining state organization within and between components.
- [dependency-inversion](../../docs/bindings/core/dependency-inversion.md): Promotes loose coupling through well-designed component interfaces.
- [code-size](../../docs/bindings/core/code-size.md): Supports small, focused components that emerge from atomic design principles.
