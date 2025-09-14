---
id: package-json-standards
last_modified: '2025-06-18'
version: '0.2.0'
derived_from: automation
enforced_by: 'package.json linting, CI validation, dependency scanning, lock file verification'
---

# Binding: Enforce Comprehensive Package.json Standards for Supply Chain Security

Standardize package.json structure and dependency management across all TypeScript projects. Enforce pnpm exclusively with explicit version declarations and automated security scanning.

## Rationale

This binding implements our automation tenet by establishing package.json as a security-critical configuration artifact requiring standardized structure and automated validation. Consistent package.json standards enable automated security scanning, reliable CI pipelines, and eliminate "works on my machine" issues.

## Rule Definition

This rule applies to all TypeScript projects including applications, libraries, CLI tools, and monorepo packages. The rule specifically requires:

**Essential Fields:**
- **packageManager**: Exact pnpm version specification for tool consistency
- **engines**: Minimum Node.js and pnpm version requirements
- **license**: Explicit license declaration for legal compliance
- **repository**: Source repository URL for supply chain transparency

**Security Configuration:**
- **scripts**: Standardized security scanning and validation commands
- **overrides**: Explicit dependency override declarations when necessary
- **workspaces**: Workspace configuration for monorepo security boundaries

**Dependency Standards:**
- **Version Specification**: Semantic version ranges with documented exact pinning
- **Supply Chain Validation**: Automated dependency vulnerability scanning
- **License Compliance**: Automated license compatibility verification
- **Update Automation**: Controlled dependency update processes

The rule prohibits missing packageManager declarations, undocumented dependency overrides, and CI configurations that bypass dependency security validation. When exceptions exist, they must be documented with security rationale and remediation timelines.

## Practical Implementation

1. **Standard Package.json Template**: Required fields for all TypeScript projects:
   ```json
   {
     "name": "@company/project-name",
     "version": "1.0.0",
     "packageManager": "pnpm@10.12.1",
     "engines": {
       "node": ">=18.0.0",
       "pnpm": ">=10.0.0"
     },
     "license": "MIT",
     "repository": {
       "type": "git",
       "url": "https://github.com/company/project-name.git"
     },
     "scripts": {
       "build": "tsup",
       "test": "vitest",
       "security:check": "pnpm audit --audit-level=moderate && license-checker --onlyAllow 'MIT;ISC;Apache-2.0'"
     },
     "dependencies": {
       "express": "^4.18.0"
     },
     "devDependencies": {
       "typescript": "^5.0.0",
       "vitest": "^1.0.0",
       "tsup": "^8.0.0",
       "license-checker": "^25.0.1"
     }
   }
   ```

2. **Security Scripts**: Essential vulnerability scanning:
   ```json
   {
     "scripts": {
       "preinstall": "npx only-allow pnpm",
       "security:audit": "pnpm audit --audit-level=moderate",
       "security:licenses": "license-checker --onlyAllow 'MIT;ISC;Apache-2.0;BSD-2-Clause;BSD-3-Clause'",
       "security:check": "pnpm run security:audit && pnpm run security:licenses"
     }
   }
   ```

3. **Package.json Validation**: Essential linting rules:
   ```javascript
   // package-json-lint.config.js
   module.exports = {
     rules: {
       'require-name': 'error',
       'require-version': 'error',
       'require-license': 'error',
       'require-repository': 'error',
       'require-engines': 'error',
       'require-scripts': ['error', ['build', 'test', 'security:check']]
     }
   };
   ```

4. **CI Pipeline Integration**: Essential dependency validation:
   ```yaml
   name: Package Security Validation
   on: [push, pull_request]
   jobs:
     validate:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: pnpm/action-setup@v4
           with:
             version: 10
         - name: Validate required fields
           run: |
             required_fields=("packageManager" "engines" "license" "repository")
             for field in "${required_fields[@]}"; do
               jq -e ".$field" package.json > /dev/null || exit 1
             done
         - name: Install and audit
           run: |
             pnpm install --frozen-lockfile
             pnpm audit --audit-level=moderate
             pnpm run security:licenses
   ```

5. **Security Configuration** (.npmrc):
   ```bash
   audit-level=moderate
   verify-store-integrity=true
   verify-signatures=true
   engine-strict=true
   ```

**Version Strategy**:
- **Security-Critical**: Exact versions (`"jsonwebtoken": "9.0.2"`)
- **Development Tools**: Semantic ranges (`"typescript": "^5.4.5"`)

## Examples

```json
// ❌ BAD: Missing security fields
{
  "name": "my-app",
  "dependencies": {
    "express": "*"  // Dangerous wildcard
  }
}

// ✅ GOOD: Complete security configuration
{
  "name": "@company/secure-app",
  "version": "1.0.0",
  "packageManager": "pnpm@10.12.1",
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=10.0.0"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/company/secure-app.git"
  },
  "scripts": {
    "build": "tsup",
    "test": "vitest",
    "security:check": "pnpm audit --audit-level=moderate && license-checker --onlyAllow 'MIT;ISC;Apache-2.0'"
  },
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "vitest": "^1.0.0",
    "license-checker": "^25.0.1"
  }
}
```

## Enforcement

Enforced through pre-commit hooks, CI pipeline security scanning, package.json linting, and continuous dependency monitoring.

See `examples/typescript-full-toolchain/` for complete implementation.
