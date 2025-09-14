---
id: spa-migration-strategy
last_modified: '2025-01-10'
version: '0.2.0'
derived_from: simplicity
enforced_by: 'Migration checklists, Performance monitoring, Code review'
---

# Binding: SPA-to-Meta-Framework Migration Strategy

Migrate React SPAs to meta-frameworks using component-by-component incremental adoption with hybrid coexistence architecture. Establish clear migration phases, maintain performance standards, and ensure zero-downtime deployment throughout the transition process.

## Rationale

This binding implements our simplicity tenet by eliminating the complexity and risk of big-bang migrations. Component-by-component migration allows teams to incrementally adopt meta-framework patterns while maintaining existing SPA functionality, reducing risk and enabling continuous value delivery.

The hybrid coexistence architecture ensures seamless transition between SPA and meta-framework components, eliminating the need for complete rewrites.

## Rule Definition

This rule applies to all React SPA applications migrating to Next.js App Router or Remix. The rule requires:

**Migration Phases:**
- **Phase 1**: Coexistence setup - establish hybrid architecture
- **Phase 2**: Leaf component migration - components with no dependencies
- **Phase 3**: Parent component migration - components with child dependencies
- **Phase 4**: Route and state migration - routing and global state patterns
- **Phase 5**: SPA removal - clean up legacy SPA infrastructure

**Requirements:**
- **Component-by-component**: Migrate individual components, not entire routes
- **Performance monitoring**: Track Core Web Vitals during migration
- **Rollback capability**: Ability to revert any migrated component within 24 hours
- **Feature flag protection**: All migrated components behind feature flags

## Practical Implementation

**Phase 1: Coexistence Architecture Setup**

```typescript
const migrationConfig = {
  enabledComponents: ['UserProfile', 'ProductCard'],
  performanceThresholds: { LCP: 2500, FID: 100, CLS: 0.1 },
  rollbackTriggers: { errorRate: 0.05, performanceRegression: 0.2 }
};

function HybridRouter({ children }: { children: React.ReactNode }) {
  const isMetaFrameworkEnabled = useFeatureFlag('meta-framework-routing');
  return isMetaFrameworkEnabled ?
    <MetaFrameworkRouter>{children}</MetaFrameworkRouter> :
    <BrowserRouter>{children}</BrowserRouter>;
}
```

**Phase 2: Leaf Component Migration**

```typescript
function createMigratedComponent<T>({
  legacyComponent: LegacyComponent,
  migratedComponent: MigratedComponent,
  migrationKey
}: {
  legacyComponent: React.ComponentType<T>;
  migratedComponent: React.ComponentType<T>;
  migrationKey: string;
}): React.ComponentType<T> {
  return function HybridComponent(props: T) {
    const isMigrated = useFeatureFlag(migrationKey);
    const ComponentToRender = isMigrated ? MigratedComponent : LegacyComponent;

    return (
      <PerformanceMonitor
        componentName={migrationKey}
        onPerformanceIssue={(metrics) => {
          if (metrics.LCP > 2500) rollbackComponent(migrationKey);
        }}
      >
        <ComponentToRender {...props} />
      </PerformanceMonitor>
    );
  };
}
```

**State Bridge Pattern:**
```typescript
function useStateBridge() {
  const legacyState = useSelector(state => state);
  const migratedState = useServerState();

  const syncState = useCallback((key: string, value: any) => {
    dispatch(updateLegacyState(key, value));
    updateServerState(key, value);
  }, []);

  return { legacyState, migratedState, syncState };
}

function UserProfile() {
  const { legacyState, migratedState, syncState } = useStateBridge();
  const isMigrated = useFeatureFlag('user-profile-migration');
  const user = isMigrated ? migratedState.user : legacyState.user;

  const updateUser = (updates: Partial<User>) => {
    syncState('user', { ...user, ...updates });
  };

  return (
    <div>
      <h1>{user.name}</h1>
      <button onClick={() => updateUser({ name: 'New Name' })}>
        Update Name
      </button>
    </div>
  );
}
```

**Phase 3: Parent Component Migration**

```typescript
function checkMigrationEligibility(componentName: string, dependencies: any[]): boolean {
  const component = dependencies.find(dep => dep.componentName === componentName);
  if (!component) return false;
  return component.dependencies.every(depName => {
    const dep = dependencies.find(d => d.componentName === depName);
    return dep?.isMigrated || false;
  });
}

function MigrationOrchestrator() {
  const migrationPlan = [
    { componentName: 'UserProfile', isMigrated: true, dependencies: [] },
    { componentName: 'ProductCard', isMigrated: true, dependencies: [] },
    { componentName: 'ProductList', isMigrated: false, dependencies: ['ProductCard'] },
    { componentName: 'Dashboard', isMigrated: false, dependencies: ['UserProfile', 'ProductList'] }
  ];

  const eligibleComponents = migrationPlan.filter(component =>
    !component.isMigrated &&
    checkMigrationEligibility(component.componentName, migrationPlan)
  );

  return (
    <div>
      <h2>Ready for Migration:</h2>
      {eligibleComponents.map(component => (
        <MigrationCandidate key={component.componentName} component={component} />
      ))}
    </div>
  );
}
```

**Phase 4: Route and State Migration**

```typescript
function RouteManager() {
  const routes = [
    { path: '/profile', isMigrated: true, component: MigratedUserProfile },
    { path: '/dashboard', isMigrated: false, component: LegacyDashboard }
  ];

  return (
    <Routes>
      {routes.map(route => (
        <Route
          key={route.path}
          path={route.path}
          element={
            route.isMigrated ? (
              <MetaFrameworkRoute><route.component /></MetaFrameworkRoute>
            ) : (
              <SPARoute><route.component /></SPARoute>
            )
          }
        />
      ))}
    </Routes>
  );
}
```

**Performance Monitoring and Rollback:**
```typescript
function usePerformanceMonitor(componentName: string) {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lcp = entries.find(entry => entry.entryType === 'largest-contentful-paint');
      const fid = entries.find(entry => entry.entryType === 'first-input');
      const cls = entries.find(entry => entry.entryType === 'layout-shift');

      const currentMetrics = {
        LCP: lcp?.startTime || 0,
        FID: fid?.processingStart - fid?.startTime || 0,
        CLS: cls?.value || 0,
        errorRate: getErrorRate(componentName)
      };

      setMetrics(currentMetrics);
      if (shouldRollback(currentMetrics, componentName)) {
        rollbackComponent(componentName);
      }
    });

    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
    return () => observer.disconnect();
  }, [componentName]);

  return metrics;
}

async function rollbackComponent(componentName: string) {
  await disableFeatureFlag(`${componentName}-migration`);
  console.warn(`Rolled back ${componentName} due to performance regression`);
  sendTelemetry('component-rollback', {
    componentName,
    timestamp: new Date().toISOString(),
    reason: 'performance-regression'
  });
}
```

**Phase 5: SPA Removal**

```typescript
const cleanupTasks = [
  {
    name: 'Remove SPA Router',
    priority: 'high',
    execute: async () => { /* Remove react-router-dom dependencies */ },
    rollback: async () => { /* Restore SPA routing */ }
  },
  {
    name: 'Remove Legacy State Management',
    priority: 'medium',
    execute: async () => { /* Remove Redux/Zustand stores */ },
    rollback: async () => { /* Restore legacy state management */ }
  },
];

function CleanupOrchestrator() {
  const executeCleanup = async () => {
    const sortedTasks = cleanupTasks.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    for (const task of sortedTasks) {
      try {
        await task.execute();
        console.log(`✓ Completed: ${task.name}`);
      } catch (error) {
        console.error(`✗ Failed: ${task.name}`, error);
        await task.rollback();
      }
    }
  };

  return (
    <div>
      <h2>Migration Cleanup</h2>
      <button onClick={executeCleanup}>Execute Cleanup Tasks</button>
    </div>
  );
}
```

## Examples

```typescript
// ❌ BAD: Big-bang migration approach
function MigrateEverything() {
  // Replace entire SPA with meta-framework
  // High risk, no rollback capability
  return (
    <NextApp>
      <MigratedHeader />
      <MigratedNavigation />
      <MigratedDashboard />
      <MigratedFooter />
    </NextApp>
  );
}
```

```typescript
// ✅ GOOD: Component-by-component migration
function IncrementalMigration() {
  return (
    <div>
      <ConditionalComponent
        legacy={<LegacyHeader />}
        migrated={<MigratedHeader />}
        migrationKey="header-migration"
      />
      <ConditionalComponent
        legacy={<LegacyNavigation />}
        migrated={<MigratedNavigation />}
        migrationKey="navigation-migration"
      />
      <LegacyDashboard />
      <LegacyFooter />
    </div>
  );
}
```

```typescript
// ❌ BAD: No state synchronization during migration
function BrokenStateMigration() {
  const legacyUser = useSelector(state => state.user);
  const migratedUser = useServerState().user;
  // State is out of sync between architectures
  return (
    <div>
      <LegacyUserProfile user={legacyUser} />
      <MigratedUserSettings user={migratedUser} />
    </div>
  );
}
```

```typescript
// ✅ GOOD: State bridge pattern maintains consistency
function ConsistentStateMigration() {
  const { getUser, updateUser } = useStateBridge();
  const user = getUser();

  return (
    <div>
      <ConditionalComponent
        legacy={<LegacyUserProfile user={user} onUpdate={updateUser} />}
        migrated={<MigratedUserProfile user={user} onUpdate={updateUser} />}
        migrationKey="user-profile-migration"
      />
    </div>
  );
}
```

## Related Bindings

- [simplicity](../../tenets/simplicity.md): SPA migration strategy eliminates big-bang complexity by providing clear, incremental migration phases that reduce risk and maintain development velocity.

- [react-framework-selection](react-framework-selection.md): Migration strategy builds on framework selection by providing migration paths specific to Next.js App Router and Remix patterns.

- [server-first-architecture](server-first-architecture.md): Migration strategy transforms client-first SPA patterns into server-first meta-framework patterns through incremental component migration.

- [react-routing-patterns](react-routing-patterns.md): Migration strategy includes specific patterns for migrating SPA routing to meta-framework file-based routing with type safety.

- [incremental-delivery](../../core/incremental-delivery.md): Migration strategy follows incremental delivery principles with small, reversible changes and continuous deployment throughout the migration process.

- [continuous-refactoring](../../core/continuous-refactoring.md): Migration strategy applies continuous refactoring principles by improving code quality incrementally rather than through large, disruptive rewrites.

- [modern-typescript-toolchain](../typescript/modern-typescript-toolchain.md): SPA migration requires consistent TypeScript tooling to maintain type safety while transitioning between different application architectures.

- [quality-metrics-and-monitoring](../../core/quality-metrics-and-monitoring.md): Migration strategy requires comprehensive monitoring to track performance, errors, and user experience throughout the migration process.

- [input-validation-standards](../security/input-validation-standards.md): SPA migration must maintain security standards for input validation as components transition from client-side to server-side execution.
