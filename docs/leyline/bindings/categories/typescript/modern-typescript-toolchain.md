---
id: modern-typescript-toolchain
last_modified: '2025-06-18'
version: '0.2.0'
derived_from: automation
enforced_by: 'packageManager field, engines requirement, CI validation, pre-commit hooks'
---

# Binding: Establish Unified Modern TypeScript Toolchain

Use a standardized, integrated set of modern tools for all TypeScript projects: pnpm for package management, Vitest for testing, tsup for building, ESLint/Prettier for code quality, and TanStack Query for state management. Configure these tools consistently using workspace-root configuration with semantic version ranges, and enforce through tiered quality gates that prioritize essential checks while allowing progressive enhancement.

## Rationale

This binding implements our automation tenet by eliminating the cognitive overhead and friction of tool selection, configuration, and integration decisions for every TypeScript project. Just as a manufacturing assembly line benefits from standardized, well-integrated equipment, development teams benefit from a unified toolchain that works together seamlessly and becomes second nature to use.

Think of tool proliferation as technical debt at the team level. Each additional tool combination creates exponential complexity: different configuration patterns, varying deployment strategies, incompatible defaults, and fragmented knowledge distribution. When every project uses a different testing framework or build system, team members spend more time context-switching between tools than solving business problems. The compound cost of this fragmentation grows as teams and codebases scale.

The choice of modern, "boring" tools over cutting-edge alternatives provides concrete automation benefits: faster onboarding as team members recognize familiar patterns, reduced maintenance overhead from proven tool stability, and decreased decision fatigue when starting new projects. These improvements compound over time—what starts as slightly faster project setup becomes significantly reduced maintenance burden and more predictable development velocity as the organization grows.

## Rule Definition

This rule applies to all TypeScript projects, including frontend applications, backend APIs, CLI tools, libraries, and monorepo packages. The rule specifically requires:

**Unified Tool Selection:**
- **Package Management**: pnpm exclusively with explicit version declaration
- **Testing**: Vitest as the testing framework for all test types (unit, integration, e2e)
- **Building**: tsup for library builds and bundling
- **Code Quality**: ESLint + Prettier with zero-suppression policy
- **State Management**: TanStack Query for server state patterns

**Configuration Standards:**
- **Workspace Root**: Shared tooling configuration in workspace root with package-specific overrides only when domain requirements justify complexity
- **Version Specification**: Semantic version ranges (`^1.2.0`) with exact pinning only for security/compliance requirements
- **Enforcement Levels**: Tiered enforcement with hard failures for essential quality gates (security, correctness) and progressive enhancement for style/optimization

**Migration Requirements:**
- New projects must start with the complete unified toolchain
- Existing projects should migrate incrementally, prioritizing high-impact tools first
- Migration plans must be documented with timeline and rollback procedures

The rule prohibits mixing incompatible tools within projects (e.g., Jest + Vitest, npm + pnpm) without documented architectural justification. When exceptions exist, they must be approved, time-bounded, and include migration paths to the standard toolchain.

## Practical Implementation

1. **New Project Initialization**: Start every TypeScript project with the standardized toolchain template:
   ```json
   {
     "packageManager": "pnpm@10.12.1",
     "engines": {
       "node": ">=18.0.0",
       "pnpm": ">=10.0.0"
     },
     "devDependencies": {
       "typescript": "^5.0.0",
       "vitest": "^1.0.0",
       "tsup": "^8.0.0",
       "eslint": "^8.0.0",
       "prettier": "^3.0.0",
       "@tanstack/query-core": "^5.0.0"
     }
   }
   ```

2. **Workspace Configuration**: Establish shared configuration in workspace root with inheritance patterns:
   ```typescript
   // tsconfig.json - Base TypeScript configuration
   {
     "compilerOptions": {
       "strict": true,
       "target": "ES2022",
       "module": "ESNext",
       "moduleResolution": "bundler"
     }
   }

   // vitest.config.ts - Shared test configuration
   export default defineConfig({
     test: {
       coverage: {
         thresholds: {
           statements: 80,
           branches: 80,
           functions: 80,
           lines: 80
         }
       }
     }
   });
   ```

3. **Quality Gate Integration**: Implement tiered enforcement matching the established strictness policy:
   ```bash
   # Essential gates (hard failures)
   - YAML validation
   - TypeScript compilation
   - Security scanning
   - Dependency vulnerabilities

   # Enhanced gates (progressive warnings → failures)
   - ESLint violations
   - Test coverage thresholds
   - Code formatting
   ```

4. **Team Onboarding**: Create standardized setup documentation that references the unified toolchain:
   ```markdown
   ## Development Setup
   1. Install pnpm: `npm install -g pnpm`
   2. Install dependencies: `pnpm install`
   3. Start development: `pnpm dev`
   4. Run tests: `pnpm test`
   5. Build project: `pnpm build`
   ```

5. **Migration Strategy**: Convert existing projects incrementally with risk-based prioritization:
   - **Phase 1**: Package manager (pnpm) and basic TypeScript configuration
   - **Phase 2**: Testing framework (Vitest) with existing test preservation
   - **Phase 3**: Build system (tsup) and quality tools (ESLint/Prettier)
   - **Phase 4**: State management patterns (TanStack Query) for applicable projects

6. **Supply Chain Security Integration**: Establish secure dependency management as a foundational component of the unified toolchain:
   ```json
   {
     "packageManager": "pnpm@10.12.1",
     "engines": {
       "node": ">=18.18.0",        // Minimum version with security features
       "pnpm": ">=10.0.0"
     },
     "scripts": {
       "build": "tsup",
       "test": "vitest",
       "security:audit": "pnpm audit --audit-level=moderate",
       "security:licenses": "license-checker --onlyAllow 'MIT;ISC;Apache-2.0;BSD-2-Clause;BSD-3-Clause'",
       "security:check": "pnpm run security:audit && pnpm run security:licenses",
       "deps:update": "pnpm update --interactive --latest"
     },
     "devDependencies": {
       "license-checker": "^25.0.1"
     }
   }
   ```

   **Supply Chain Security Principles:**
   - **Automated Scanning**: All projects include `security:check` script for CI integration
   - **License Compliance**: Standardized license validation across all toolchain projects
   - **Version Strategy**: Semantic ranges for most dependencies, exact pinning for security-critical components
   - **Audit Integration**: Regular dependency vulnerability scanning as part of quality gates
   - **Update Process**: Controlled dependency updates with security validation

   See [package-json-standards.md](../../docs/bindings/categories/typescript/package-json-standards.md) for comprehensive supply chain security guidance.

## Examples

```json
// ❌ BAD: Fragmented tool choices without standardization
{
  "devDependencies": {
    "jest": "^29.0.0",        // Different testing framework
    "webpack": "^5.0.0",      // Complex build configuration
    "yarn": "^3.0.0"          // Non-standard package manager
  }
}

// ✅ GOOD: Unified toolchain with consistent patterns
{
  "packageManager": "pnpm@10.12.1",
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=10.0.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0",       // Unified testing
    "tsup": "^8.0.0",         // Simple build tool
    "typescript": "^5.0.0"    // Standard TypeScript
  }
}
```

```typescript
// ❌ BAD: Mixed configuration patterns
// jest.config.js
module.exports = { /* Jest-specific config */ };
// webpack.config.js
module.exports = { /* Complex Webpack setup */ };

// ✅ GOOD: Unified configuration approach
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { coverage: { thresholds: { statements: 80 } } }
});

// tsup.config.ts
import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true
});
```

```bash
# ❌ BAD: Inconsistent development commands across projects
npm install && npm run test:jest && npm run build:webpack

# ✅ GOOD: Consistent patterns across all TypeScript projects
pnpm install && pnpm test && pnpm build
```

## Related Bindings

- [tooling-investment.md](../core/tooling-investment.md): This toolchain binding implements the principle of mastering a small set of high-impact tools rather than constantly switching. The standardized toolchain reduces learning overhead and maximizes the compound returns from tool mastery across team members.

- [use-pnpm-for-nodejs.md](../../docs/bindings/categories/typescript/use-pnpm-for-nodejs.md): The package management component of this toolchain builds directly on the pnpm binding, extending its consistency benefits to the entire development experience rather than just dependency management.

- [preferred-technology-patterns.md](../core/preferred-technology-patterns.md): This binding applies the "choose boring technology" principle by selecting proven, stable tools (TypeScript, ESLint, Prettier) while incorporating modern capabilities (Vitest, tsup) that provide clear value without excessive complexity.

- [automated-quality-gates.md](../core/automated-quality-gates.md): The quality enforcement aspect of this toolchain implements automated quality gates through the tiered enforcement strategy, ensuring consistency while maintaining developer velocity.

- [development-environment-consistency.md](../core/development-environment-consistency.md): The unified toolchain directly supports environment consistency by ensuring all team members use identical tool configurations and development workflows across different projects.
