---
id: server-first-architecture
last_modified: '2025-01-10'
version: '0.2.0'
derived_from: simplicity
enforced_by: 'Code review, ESLint rules, Build-time analysis'
---

# Binding: Server-First React Architecture

Default to Server Components for all React components, using Client Components only when browser interactivity is required. This fundamental mental model shift from client-first to server-first React reduces bundle size, improves performance, and simplifies data fetching while maintaining clear boundaries between server and client execution environments.

## Rationale

This binding implements our simplicity tenet by establishing a clear default execution environment for React components. Traditional React applications suffer from the "client-first complexity spiral": every component adds JavaScript to the browser bundle, data fetching becomes scattered across components, and performance degrades as applications grow.

Server-first architecture inverts this default. Instead of everything being client-side by default with server-side rendering as an optimization, server execution becomes the default with client interaction as an explicit opt-in. This mental model shift eliminates common performance anti-patterns while reducing the cognitive load of deciding where code should run.

The server-first approach aligns with web platform fundamentals: HTML is generated on the server, enhanced with minimal JavaScript for interactivity. This creates applications that are fast by default, progressively enhanced, and resilient to JavaScript failures. The result is simpler reasoning about data flow, better performance characteristics, and more maintainable codebases.

## Rule Definition

This rule applies to all React components in Next.js (App Router) and Remix applications. The rule specifically requires:

**Server Components by Default:**
- **All components** are Server Components unless explicitly marked as Client Components
- **Data fetching** occurs directly in Server Components using native APIs
- **Database access** happens in Server Components without API layers
- **File system access** and server-only operations remain in Server Components
- **Static content** and non-interactive UI elements stay on the server

**Client Components by Explicit Justification:**
- **Require 'use client' directive** at the top of the file
- **Must satisfy at least one criteria** from the Client Component Justification Matrix
- **Should be leaf components** when possible (minimal surface area)
- **Cannot import Server Components** directly
- **Receive data via props** from Server Components

**Client Component Justification Matrix:**
- **Browser APIs**: geolocation, localStorage, sessionStorage, IndexedDB
- **Event handlers**: onClick, onChange, onSubmit, keyboard events
- **React hooks**: useState, useEffect, useReducer, custom hooks
- **Real-time features**: WebSockets, Server-Sent Events
- **Interactive animations**: complex transitions, gesture handling
- **Third-party libraries**: client-only SDKs, browser-dependent packages

## Practical Implementation

**Server Component Pattern (Default):**
```typescript
// ✅ GOOD: Server Component (default - no directive needed)
interface UserProfileProps {
  userId: string;
}

// This runs on the server, can access database directly
async function UserProfile({ userId }: UserProfileProps) {
  // Direct database access in Server Component
  const user = await db.user.findUnique({ where: { id: userId } });
  const posts = await db.post.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: 'desc' }
  });

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div className="user-profile">
      <h1>{user.name}</h1>
      <p>{user.bio}</p>
      <PostList posts={posts} />
      <FollowButton userId={userId} initialFollowState={user.isFollowing} />
    </div>
  );
}
```

**Client Component Pattern (Explicit Opt-in):**
```typescript
// ✅ GOOD: Client Component for interactivity
'use client';

interface FollowButtonProps {
  userId: string;
  initialFollowState: boolean;
}

function FollowButton({ userId, initialFollowState }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowState);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/follow/${userId}`, {
        method: isFollowing ? 'DELETE' : 'POST',
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleFollow}
      disabled={isLoading}
      className={`follow-button ${isFollowing ? 'following' : 'not-following'}`}
    >
      {isLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
    </button>
  );
}
```

**Framework-Specific Patterns:**

**Next.js App Router:**
```typescript
// app/dashboard/page.tsx - Server Component
async function DashboardPage() {
  const session = await getServerSession();
  const analytics = await getAnalytics(session.user.id);

  return (
    <div>
      <h1>Dashboard</h1>
      <AnalyticsChart data={analytics} />
      <InteractiveControls />
    </div>
  );
}

// components/InteractiveControls.tsx - Client Component
'use client';

function InteractiveControls() {
  const [dateRange, setDateRange] = useState('7d');

  return (
    <div>
      <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
      </select>
    </div>
  );
}
```

**Remix Patterns:**
```typescript
// app/routes/dashboard.tsx - Server-first with loader
export async function loader({ request }: LoaderArgs) {
  const session = await getSession(request.headers.get('cookie'));
  const analytics = await getAnalytics(session.user.id);

  return json({ analytics });
}

export default function Dashboard() {
  const { analytics } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Dashboard</h1>
      <AnalyticsChart data={analytics} />
      <InteractiveControls />
    </div>
  );
}
```

**Component Boundary Decision Tree:**
```typescript
// Decision helper for component boundaries
function shouldBeClientComponent(component: ComponentAnalysis): boolean {
  return (
    component.needsState ||
    component.needsEffects ||
    component.needsEventHandlers ||
    component.needsBrowserAPIs ||
    component.needsRealTimeFeatures ||
    component.needsThirdPartyClientLibrary
  );
}

// Examples of boundary decisions
const componentDecisions = {
  // Server Components (default)
  'ProductList': false,        // Static content, no interaction
  'UserProfile': false,        // Data display, no state needed
  'BlogPost': false,          // Content rendering, no interactivity
  'Navigation': false,        // Links only, no JavaScript needed

  // Client Components (explicit)
  'SearchBox': true,          // Needs onChange, state
  'ShoppingCart': true,       // Needs state, localStorage
  'LoginForm': true,          // Needs form handling, validation
  'ThemeToggle': true,        // Needs localStorage, state
  'MapWidget': true,          // Needs browser geolocation API
};
```

## Examples

```typescript
// ❌ BAD: Everything as Client Components (old pattern)
'use client';

function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/posts')
      .then(r => r.json())
      .then(setPosts)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
```

```typescript
// ✅ GOOD: Server-first with targeted client interactivity
// Server Component (default)
async function BlogPage() {
  const posts = await db.post.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div>
      <SearchControls />
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

// Client Component only for search interactivity
'use client';

function SearchControls() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search posts..."
    />
  );
}
```

```typescript
// ❌ BAD: Mixing server and client concerns
'use client';

function UserDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Client-side data fetching for server data
    fetch('/api/user')
      .then(r => r.json())
      .then(setUser);
  }, []);

  const handleThemeToggle = () => {
    // Client-side theme logic mixed with server data
    localStorage.setItem('theme', theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div>
      {user && <UserProfile user={user} />}
      <button onClick={handleThemeToggle}>Toggle Theme</button>
    </div>
  );
}
```

```typescript
// ✅ GOOD: Clear separation of server and client concerns
// Server Component for data fetching
async function UserDashboard() {
  const user = await getUser();
  const theme = await getTheme();

  return (
    <div>
      <UserProfile user={user} />
      <ThemeToggle initialTheme={theme} />
    </div>
  );
}

// Client Component only for theme interactivity
'use client';

function ThemeToggle({ initialTheme }: { initialTheme: string }) {
  const [theme, setTheme] = useState(initialTheme);

  const handleToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button onClick={handleToggle}>
      Toggle Theme ({theme})
    </button>
  );
}
```

## Related Bindings

- [simplicity](../../tenets/simplicity.md): Server-first architecture eliminates the client-first complexity spiral by establishing clear defaults and explicit opt-ins for browser interactivity.

- [react-framework-selection](react-framework-selection.md): Framework selection determines the specific implementation of server-first patterns - Next.js RSC or Remix loader/action patterns.

- [component-architecture](../../core/component-architecture.md): Server-first architecture extends component design principles by adding execution environment as a fundamental design consideration.

- [react-performance-standards](react-performance-standards.md): Server-first architecture directly enables performance targets by reducing JavaScript bundle size and improving server-side rendering efficiency.

- [no-any](../typescript/no-any.md): Server Components and data fetching patterns require strong typing to prevent runtime errors and ensure proper server-client boundaries.

- [input-validation-standards](../security/input-validation-standards.md): Server-first architecture requires robust input validation since server components handle user input and external data directly on the server.

- [authentication-authorization-patterns](../security/authentication-authorization-patterns.md): Server-first architecture enables secure-by-default authentication and authorization patterns through server-side session management and data access control.
