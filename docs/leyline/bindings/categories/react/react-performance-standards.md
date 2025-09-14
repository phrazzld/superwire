---
id: react-performance-standards
last_modified: '2025-01-10'
version: '0.2.0'
derived_from: automation
enforced_by: 'Core Web Vitals monitoring, Bundle analysis, CI performance gates'
---

# Binding: React Performance Standards

Establish hard performance targets for React meta-framework applications: LCP < 2.5s, initial JavaScript bundle < 200KB, TTI < 3.5s. Leverage server-first architecture to achieve performance by default while implementing systematic monitoring and optimization patterns that prevent performance regressions.

## Rationale

This binding implements our automation tenet by establishing measurable performance standards that prevent gradual performance degradation in React applications. Performance problems in production are exponentially more expensive to fix than those caught during development.

Server-first architecture provides a foundation for performance by default, but requires explicit standards to maintain performance characteristics as applications grow. Performance standards act as quality gates that catch regressions early while providing clear optimization targets.

## Rule Definition

This rule applies to all React applications using Next.js App Router or Remix:

**Core Web Vitals Targets:**
- **LCP**: < 2.5s, **FID/INP**: < 100ms, **CLS**: < 0.1 (75th percentile)
- **TTI**: < 3.5s, **Initial JS bundle**: < 200KB compressed
- **Server Components ratio**: > 80% of components

**Requirements:**
- All images use framework-provided optimization
- Route-based code splitting enabled
- Streaming SSR and RUM monitoring required

## Practical Implementation

**Performance Measurement Setup:**
```typescript
export const PERFORMANCE_TARGETS = {
  LCP: 2500, FID: 100, CLS: 0.1, TTI: 3500, BUNDLE_SIZE: 200
} as const;

export function measureCoreWebVitals() {
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    [getCLS, getFID, getFCP, getLCP, getTTFB].forEach(fn => fn(sendToAnalytics));
  });
}

function sendToAnalytics(metric: Metric) {
  if (process.env.NODE_ENV === 'production') {
    analytics.track('Core Web Vital', metric);
  }
}
```

**Next.js Performance Patterns:**
```typescript
// app/layout.tsx
import { Suspense } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<NavSkeleton />}><Navigation /></Suspense>
        <main><Suspense fallback={<ContentSkeleton />}>{children}</Suspense></main>
        <Suspense fallback={<FooterSkeleton />}><Footer /></Suspense>
      </body>
    </html>
  );
}

// app/products/page.tsx
import { Suspense } from 'react';
import Image from 'next/image';

async function ProductList() {
  const products = await getProducts();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {products.map((product) => (
        <div key={product.id} className="product-card">
          <Image src={product.image} alt={product.name} width={300} height={200} priority={product.featured} />
          <h3>{product.name}</h3>
          <p>${product.price}</p>
        </div>
      ))}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <div>
      <h1>Products</h1>
      <Suspense fallback={<ProductListSkeleton />}><ProductList /></Suspense>
    </div>
  );
}
```

**Remix Performance Patterns:**
```typescript
// app/routes/products._index.tsx
import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

export async function loader({ request }: LoaderFunctionArgs) {
  const products = await getProducts();
  return json({ products }, { headers: { 'Cache-Control': 'max-age=300, s-maxage=3600' } });
}

export default function ProductsIndex() {
  const { products } = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>Products</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {products.map((product) => (
          <div key={product.id} className="product-card">
            <img src={product.image} alt={product.name} width="300" height="200" loading="lazy" />
            <h3>{product.name}</h3>
            <p>${product.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Bundle Size Monitoring:**
```typescript
// next.config.js
const nextConfig = {
  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      config.performance = { maxAssetSize: 200000, maxEntrypointSize: 200000, hints: 'error' };
    }
    return config;
  },
};

module.exports = nextConfig;
```

**CI Performance Gates:**
```yaml
# .github/workflows/performance.yml
name: Performance Standards
on: [pull_request]
jobs:
  performance-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18', cache: 'npm' }
      - run: npm ci && npm run build
      - uses: treosh/lighthouse-ci-action@v10
        with: { configPath: './lighthouse.config.js' }
        env: { LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }} }
      - run: node scripts/check-bundle-size.js
```

**Lighthouse Configuration:**
```typescript
// lighthouse.config.ts
module.exports = {
  ci: {
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'interactive': ['error', { maxNumericValue: 3500 }],
      },
    },
    collect: { numberOfRuns: 3 },
  },
};
```

## Examples

```typescript
// ❌ BAD: Client-heavy, unoptimized patterns
'use client';
function ProductsPage() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(setProducts);
  }, []);
  return (
    <div>
      {products.map(product => (
        <div key={product.id}>
          <img src={product.image} alt={product.name} />
          <h3>{product.name}</h3>
        </div>
      ))}
    </div>
  );
}
```

```typescript
// ✅ GOOD: Server-first, optimized patterns
async function ProductsPage() {
  const products = await getProducts();
  return (
    <div>
      <h1>Products</h1>
      <Suspense fallback={<ProductsSkeleton />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map(product => (
            <div key={product.id} className="product-card">
              <Image src={product.image} alt={product.name} width={300} height={200} priority={product.featured} />
              <h3>{product.name}</h3>
              <p>${product.price}</p>
            </div>
          ))}
        </div>
      </Suspense>
    </div>
  );
}
```

```typescript
// ❌ BAD: Large client-side bundle
'use client';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js';
import { Line } from 'react-chartjs-2';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement);
function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  return <Line data={data} />; // 100KB+ JavaScript bundle
}
```

```typescript
// ✅ GOOD: Lazy-loaded client components
'use client';
import { lazy, Suspense } from 'react';

const AnalyticsChart = lazy(() => import('./AnalyticsChart'));
function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  return (
    <div>
      <h2>Analytics</h2>
      <Suspense fallback={<ChartSkeleton />}><AnalyticsChart data={data} /></Suspense>
    </div>
  );
}
```

## Related Bindings

- [server-first-architecture](server-first-architecture.md): Server-first architecture provides the foundation for performance by default through reduced JavaScript bundle sizes.

- [performance-testing-standards](../../core/performance-testing-standards.md): General performance testing standards provide the testing infrastructure that validates React performance targets in CI/CD pipelines.

- [react-framework-selection](react-framework-selection.md): Framework selection criteria include performance characteristics as key decision factors.

- [automated-quality-gates](../../core/automated-quality-gates.md): Performance targets integrate with automated quality gates to prevent regressions.
