---
derived_from: explicit-over-implicit
enforced_by: Code review, Automated a11y testing
id: web-accessibility
last_modified: '2025-05-14'
version: '0.2.0'
---
# Binding: Web Accessibility

Make all web interfaces accessible to people with disabilities by following WCAG 2.1 AA standards—implementing keyboard navigation, proper semantic structure, sufficient color contrast, clear focus management, and appropriate ARIA attributes.

## Rationale

This binding implements our explicit-over-implicit tenet by requiring developers to make accessibility considerations explicit rather than assuming interfaces will naturally be accessible. Accessible design forces us to think clearly about how interfaces are structured, navigated, and interacted with. When 15-20% of the population has some form of disability, inaccessible applications effectively block a significant portion of potential users while creating legal compliance risks and poorer user experiences for everyone.

## Rule Definition

**Core Requirements:**

- **WCAG 2.1 AA Compliance**: All frontend applications must meet Web Content Accessibility Guidelines 2.1 Level AA standards
- **Keyboard Accessibility**: All interactive elements must be fully accessible with keyboard alone
- **Semantic Structure**: Use proper HTML elements and ARIA attributes for screen reader interpretation
- **Color Contrast**: Maintain 4.5:1 ratio for normal text, 3:1 for large text and UI components
- **Focus Management**: Visible focus indicators and logical tab order required
- **Text Alternatives**: All non-text content must have appropriate text alternatives

**Key Standards:**
- Semantic HTML as foundation (headings, landmarks, form labels)
- Keyboard navigation patterns (Tab, Enter, Space, Arrow keys)
- ARIA attributes only when HTML semantics insufficient
- Focus trapping in modals, proper focus restoration
- Error messages associated with form fields

## Practical Implementation

**Complete Accessibility Implementation:**

```jsx
// ❌ BAD: Inaccessible components with poor semantics
<div className="nav">
  <div className="link" onClick={handleClick}>Home</div>
</div>

<div className="modal-overlay">
  <div className="modal">
    <div className="close-btn" onClick={onClose}>×</div>
    <input placeholder="Enter email" />
    <div className="submit-btn" onClick={handleSubmit}>Submit</div>
  </div>
</div>

// ✅ GOOD: Accessible components with proper semantics and keyboard support
import { useRef, useEffect, useState } from 'react';

// Accessible Navigation
function Navigation() {
  return (
    <nav aria-label="Main navigation">
      <ul className="nav-links">
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
      </ul>
    </nav>
  );
}

// Accessible Form with Error Handling
function ContactForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const errorId = 'email-error';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Invalid email format. Please enter a valid email address.');
      return;
    }
    // Submit form...
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          required
        />
        {error && (
          <div id={errorId} className="error-text" role="alert">
            {error}
          </div>
        )}
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}

// Accessible Modal with Focus Management
function Modal({ isOpen, onClose, title, children }) {
  const modalRef = useRef(null);
  const [previouslyFocused, setPreviouslyFocused] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Store previous focus and move to modal
      setPreviouslyFocused(document.activeElement);
      if (modalRef.current) {
        modalRef.current.focus();
      }

      // ESC key handler
      const handleEsc = (e) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleEsc);
        document.body.style.overflow = '';
        // Restore focus
        if (previouslyFocused) {
          previouslyFocused.focus();
        }
      };
    }
  }, [isOpen, onClose, previouslyFocused]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title">{title}</h2>
        <div className="modal-content">{children}</div>
        <button
          className="close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// Accessible Icon Button
function IconButton({ icon, label, onClick }) {
  return (
    <button
      className="icon-button"
      onClick={onClick}
      aria-label={label}
    >
      <i className={`icon-${icon}`} aria-hidden="true" />
    </button>
  );
}

// Accessible Menu with Keyboard Navigation
function MenuButton({ children, isOpen, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-haspopup="true"
      aria-expanded={isOpen}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          // Focus first menu item
        }
      }}
    >
      {children}
    </button>
  );
}
```

**Automated Testing Setup:**

```jsx
// Jest accessibility testing
import { axe } from 'jest-axe';

test('Components have no accessibility violations', async () => {
  const { container } = render(<ContactForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**CI Integration:**

```yaml
# .github/workflows/accessibility.yml
- name: Accessibility Tests
  run: |
    npm run test:a11y
    npm run lint:a11y
```

## Related Bindings

- [component-architecture](../../core/component-architecture.md): Properly structured components provide the foundation for accessibility implementation
- [explicit-over-implicit](../../../tenets/explicit-over-implicit.md): Accessibility directly implements this tenet by requiring explicit consideration of user interaction patterns
- [api-design](../../core/api-design.md): Accessible components need well-designed APIs that provide all necessary accessibility properties
- [state-management](../../docs/bindings/categories/react/state-management.md): Effective state management is crucial for tracking UI states that affect accessibility (expanded, focused, error states)
