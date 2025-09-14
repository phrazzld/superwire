---
id: react-routing-patterns
last_modified: '2025-01-10'
version: '0.2.0'
derived_from: simplicity
enforced_by: 'TypeScript compiler, File system conventions, Code review'
---

# Binding: React Routing Patterns

Use file-based routing with TypeScript for type-safe route definitions, integrate error boundaries at appropriate levels, and co-locate data fetching with route components. This creates predictable routing architecture where file system structure directly maps to application routes, errors are contained and handled gracefully, and data flows efficiently from server to components.

## Rationale

This binding implements our simplicity tenet by eliminating the complexity of manual route configuration while ensuring type safety and error resilience. File-based routing removes the cognitive overhead of maintaining separate route definitions, while TypeScript ensures URL parameters and navigation are type-safe at compile time.

File-based routing makes the file system the source of truth for routing structure, eliminating synchronization issues between route declarations and components. Error boundaries provide fault tolerance by containing errors at the route level. Co-located data fetching ensures data requirements are explicit and improve maintainability.

## Rule Definition

This rule applies to all React meta-framework applications using Next.js App Router or Remix. The rule requires:

**File-Based Routing Structure:**
- **Route definitions** follow file system conventions (Next.js `app/` or Remix `routes/`)
- **TypeScript interfaces** for all route parameters and search parameters
- **Framework naming conventions** (page.tsx, route.tsx, error.tsx)
- **Nested routing** using folder structures for layout hierarchies

**Error Boundary Integration:**
- **Route-level error boundaries** to contain failures and provide recovery
- **Framework-specific error handling** (Next.js error.tsx, Remix ErrorBoundary)
- **Fallback UI** for graceful degradation

**Co-located Data Fetching:**
- **Server Components** with direct data fetching (Next.js)
- **Loader/Action patterns** for data and mutations (Remix)
- **Layout data patterns** for shared data across routes

## Practical Implementation

**Type-Safe Route Parameters:**
```typescript
// Next.js App Router: app/blog/[slug]/page.tsx
interface BlogPostProps {
  params: { slug: string };
  searchParams: { tab?: 'comments' | 'related' | 'author'; page?: string };
}

async function BlogPost({ params, searchParams }: BlogPostProps) {
  const post = await getPost(params.slug);
  const currentTab = searchParams.tab || 'comments';
  const currentPage = parseInt(searchParams.page || '1');

  if (!post) {
    notFound();
  }

  return (
    <div>
      <h1>{post.title}</h1>
      <BlogPostTabs activeTab={currentTab} />
      <BlogPostContent post={post} page={currentPage} />
    </div>
  );
}

export async function generateMetadata({ params }: BlogPostProps) {
  const post = await getPost(params.slug);
  return {
    title: post?.title || 'Post Not Found',
    description: post?.excerpt
  };
}
```

**Remix Route Patterns:**
```typescript
// Remix: app/routes/blog.$slug.tsx
export async function loader({ params }: LoaderArgs) {
  const { slug } = params;

  if (!slug) {
    throw new Response('Slug required', { status: 400 });
  }

  const post = await getPost(slug);

  if (!post) {
    throw new Response('Post not found', { status: 404 });
  }

  const comments = await getComments(post.id);
  return json({ post, comments });
}

export async function action({ request, params }: ActionArgs) {
  const { slug } = params;
  const formData = await request.formData();
  const comment = formData.get('comment');

  if (!comment || typeof comment !== 'string') {
    return json({
      errors: { comment: 'Comment is required' }
    }, { status: 400 });
  }

  await addComment(slug, comment);
  return redirect(`/blog/${slug}`);
}

export default function BlogPost() {
  const { post, comments } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div>
      <h1>{post.title}</h1>
      <BlogPostContent post={post} />
      <CommentSection
        comments={comments}
        errors={actionData?.errors}
      />
    </div>
  );
}
```

**Error Boundary Integration:**
```typescript
// Next.js: app/blog/error.tsx
'use client';

export default function BlogError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Blog route error:', error);
  }, [error]);

  return (
    <div className="error-boundary">
      <h2>Something went wrong in the blog section</h2>
      <p>We're sorry, but there was an error loading this blog post.</p>
      <button onClick={reset}>Try again</button>
      <Link href="/blog">← Back to blog</Link>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="error-boundary">
        <h2>{error.status} - {error.statusText}</h2>
        <p>{error.data}</p>
        <Link to="/blog">← Back to blog</Link>
      </div>
    );
  }

  return (
    <div className="error-boundary">
      <h2>Unexpected Error</h2>
      <p>Something went wrong. Please try again.</p>
      <Link to="/blog">← Back to blog</Link>
    </div>
  );
}
```

**Layout Data Patterns:**
```typescript
// Next.js: app/dashboard/layout.tsx
async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const navigation = await getNavigationItems(user.permissions);

  return (
    <div className="dashboard-layout">
      <DashboardHeader user={user} />
      <DashboardSidebar navigation={navigation} />
      <main className="dashboard-content">
        {children}
      </main>
    </div>
  );
}

// Remix: app/routes/dashboard.tsx
export async function loader({ request }: LoaderArgs) {
  const user = await getCurrentUser(request);
  const navigation = await getNavigationItems(user.permissions);
  return json({ user, navigation });
}

export default function DashboardLayout() {
  const { user, navigation } = useLoaderData<typeof loader>();

  return (
    <div className="dashboard-layout">
      <DashboardHeader user={user} />
      <DashboardSidebar navigation={navigation} />
      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}
```

**Type-Safe Navigation:**
```typescript
const routes = {
  home: '/',
  blog: '/blog',
  blogPost: (slug: string) => `/blog/${slug}`,
  dashboard: '/dashboard',
  userProfile: (userId: string) => `/users/${userId}`,
} as const;

function BlogPostList({ posts }: { posts: Post[] }) {
  return (
    <div>
      {posts.map(post => (
        <Link
          key={post.id}
          href={routes.blogPost(post.slug)}
        >
          {post.title}
        </Link>
      ))}
    </div>
  );
}

```

## Examples

```typescript
// ❌ BAD: Manual route configuration with string-based parameters
const routes = [
  { path: '/blog/:slug', component: BlogPost },
  { path: '/users/:id', component: UserProfile },
];

function BlogPost() {
  const { slug } = useParams(); // No type safety
  const [post, setPost] = useState(null);

  useEffect(() => {
    fetchPost(slug).then(setPost);
  }, [slug]);

  if (!post) return <div>Loading...</div>;
  return <div>{post.title}</div>;
}
```

```typescript
// ✅ GOOD: File-based routing with type-safe parameters and server data fetching
// app/blog/[slug]/page.tsx
async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div>
      <h1>{post.title}</h1>
      <BlogContent post={post} />
    </div>
  );
}
```

```typescript
// ❌ BAD: No error boundaries - errors crash entire app
function BlogSection() {
  return (
    <div>
      <BlogPost slug="invalid-slug" />
      <BlogSidebar />
    </div>
  );
}
```

```typescript
// ✅ GOOD: Error boundaries contain failures
// app/blog/error.tsx
'use client';

export default function BlogError({ error, reset }: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="error-boundary">
      <h2>Blog Error</h2>
      <p>Failed to load blog content</p>
      <button onClick={reset}>Try Again</button>
    </div>
  );
}

// app/blog/[slug]/page.tsx
async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();
  return <BlogContent post={post} />;
}
```

```typescript
// ❌ BAD: Mixed data fetching patterns
function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchUser().then(setUser);
  }, []);

  useEffect(() => {
    fetchStats().then(setStats);
  }, []);

  return <div>Mixed patterns</div>;
}
```

```typescript
// ✅ GOOD: Consistent server-first data fetching
// app/dashboard/page.tsx
async function Dashboard() {
  const [user, stats] = await Promise.all([
    getCurrentUser(),
    getDashboardStats()
  ]);

  return (
    <div>
      <UserProfile user={user} />
      <DashboardStats stats={stats} />
    </div>
  );
}
```

## Related Bindings

- [simplicity](../../tenets/simplicity.md): File-based routing eliminates manual route configuration complexity, while TypeScript ensures compile-time route safety without runtime overhead.

- [react-framework-selection](react-framework-selection.md): Routing patterns are framework-specific - Next.js App Router uses different conventions than Remix, requiring appropriate pattern selection based on framework choice.

- [server-first-architecture](server-first-architecture.md): Routing patterns build on server-first architecture by co-locating data fetching with route components, enabling server-side rendering and reducing client-side complexity.

- [type-safe-state-management](../typescript/type-safe-state-management.md): Route parameters and navigation state should follow the same type safety principles as application state, ensuring consistency across the application.

- [modern-typescript-toolchain](../typescript/modern-typescript-toolchain.md): Type-safe routing requires proper TypeScript configuration and tooling to provide compile-time guarantees for route parameters and navigation.

- [input-validation-standards](../security/input-validation-standards.md): Route parameters and query strings represent untrusted input that must be validated according to security standards before processing.
