---
id: eslint-prettier-setup
last_modified: '2025-06-18'
version: '0.2.0'
derived_from: automation
enforced_by: 'pre-commit hooks, CI validation, zero-suppression policy, automated formatting'
---

# Binding: Automate Code Quality with ESLint/Prettier Zero-Suppression Policy

Implement comprehensive automated code quality enforcement using ESLint for linting and Prettier for formatting with a strict zero-suppression policy. Configure pre-commit hooks, CI gates, and development workflows that prevent quality violations from entering the codebase while maintaining developer velocity through fast feedback and automatic remediation.

## Rationale

Automated code quality tools prevent style inconsistencies, potential errors, and maintenance issues from accumulating in the codebase. The zero-suppression policy forces developers to address root causes rather than hiding problems through suppressions, preventing gradual quality erosion and maintaining long-term codebase health.

## Rule Definition

**Zero-Suppression Policy:**
- No `eslint-disable`, `prettier-ignore` without documented architectural justification
- Fix violations through code improvement, rule configuration, or legitimate exceptions
- All configuration decisions and exceptions must be documented

**Automated Integration:**
- Pre-commit enforcement blocks quality violations
- Quality checks complete within 10 seconds
- Auto-correct formatting and fixable linting issues
- CI validation in continuous integration pipeline

**Configuration Standards:**
- Shared ESLint/Prettier configuration across monorepo packages
- TypeScript parser with type-aware linting
- ESLint security plugins with strict enforcement
- Consistent formatting and style rules

## Implementation

### ESLint Configuration
```typescript
// eslint.config.js - Modern flat config
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import security from 'eslint-plugin-security';

export default [{
  files: ['**/*.{ts,tsx}'],
  languageOptions: { parser: typescriptParser, parserOptions: { project: './tsconfig.json' } },
  plugins: { '@typescript-eslint': typescript, 'security': security },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    'security/detect-object-injection': 'error',
    'no-console': 'error',
    'prefer-const': 'error',
    'prettier/prettier': 'error'
  }
}];
```

### Prettier Configuration
```json
// .prettierrc
{ "semi": true, "trailingComma": "es5", "singleQuote": true, "printWidth": 80, "tabWidth": 2 }
```

### Pre-commit Hooks
```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: quality-check
        name: 📊 Quality Check
        entry: bash -c 'pnpm lint:fix && pnpm format && pnpm lint'
        language: system
        files: \.(ts|tsx)$
        stages: [commit]
```

### Package Scripts & Dependencies
```json
{
  "scripts": {
    "lint": "eslint src/ --max-warnings=0",
    "lint:fix": "eslint src/ --fix --max-warnings=0",
    "format": "prettier --write src/"
  },
  "devDependencies": {
    "eslint": "^8.57.0", "@typescript-eslint/eslint-plugin": "^7.0.0",
    "eslint-plugin-security": "^2.1.0", "prettier": "^3.2.0"
  }
}
```

### CI Integration
```yaml
# .github/workflows/quality.yml
name: Code Quality
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint && pnpm format:check
```

### IDE Setup
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": true }
}
```

## Zero-Suppression Policy

**Approved Approaches:**
1. **Code Improvement**: Refactor to eliminate underlying issues
2. **Rule Configuration**: Adjust rules at configuration level for specific contexts
3. **Architectural Exceptions**: Document rare cases requiring suppressions

```typescript
// ❌ SUPPRESSION: eslint-disable-next-line @typescript-eslint/no-explicit-any
const result: any = processData(input);

// ✅ IMPROVEMENT: Proper typing
interface ProcessResult { data: string[]; status: 'success' | 'error'; }
const result: ProcessResult = processData(input);

// ✅ CONFIGURATION: Test-specific rules
// eslint.config.js
export default [{ files: ['**/*.test.ts'], rules: { 'no-console': 'off' } }];

// ✅ DOCUMENTED EXCEPTION: Legacy integration only
// Approved in ADR-2024-03: Legacy API integration requirements
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const legacyResult = externalLibrary.process(data as any);
```

**Forbidden Patterns:**
- Inline suppressions without documentation
- File-level ignores for convenience
- Global rule disabling to avoid refactoring
- Temporary suppressions that become permanent

## Examples

```typescript
// ❌ BAD: Suppressions and poor typing
function processUser(data: any) {
  // eslint-disable-next-line no-console
  console.log('Processing user');
  // prettier-ignore
  const result = { id: data.id,name: data.name,email: data.email };
  return result;
}

// ✅ GOOD: Proper types and structured logging
interface UserData { id: string; name: string; email: string; }
function processUser(data: UserData): UserData {
  logger.info('Processing user', { userId: data.id });
  return { id: data.id, name: data.name, email: data.email };
}
```

```bash
# ❌ BAD: Bypass quality checks
git commit --no-verify

# ✅ GOOD: Quality-enforced workflow
pnpm quality:fix && git add . && git commit -m "fix: resolve issue"
```

## Performance & Related Bindings

**Performance Optimization:**
- Use TypeScript project references for faster parsing
- Focus on high-impact rules, disable expensive low-value rules
- Run ESLint only on changed files during pre-commit

```typescript
// eslint.config.js - Performance config
export default [{
  languageOptions: { parserOptions: { project: true } },
  rules: {
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/prefer-readonly-parameter-types': 'off' // Disable expensive rule
  }
}];
```

**Related:** git-hooks-automation (pre-commit gates), no-lint-suppression (zero-suppression policy), modern-typescript-toolchain (unified toolchain), automated-quality-gates (quality gate strategy)
