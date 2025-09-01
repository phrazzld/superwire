---
id: use-pnpm-for-nodejs
last_modified: '2025-06-14'
version: '0.2.0'
derived_from: automation
enforced_by: 'packageManager field in package.json, engines requirement, CI checks'
---
# Binding: Use pnpm as Package Manager for Node.js Projects

Use pnpm as the package manager for all Node.js and TypeScript projects. Declare this choice explicitly in package.json with the packageManager field and engines requirement to ensure consistent toolchain usage across development environments and CI/CD pipelines.

## Rationale

This binding implements our automation tenet by establishing a consistent, efficient package management foundation that eliminates "works on my machine" issues and reduces manual dependency management overhead.

Think of package managers like supply chain systems for software dependencies. Just as a manufacturing company benefits from standardizing on reliable suppliers and logistics systems, development teams benefit from standardizing on package managers that provide predictable, efficient dependency resolution. pnpm's approach of using content-addressable storage and hard links creates a more efficient system compared to npm's flat node_modules or yarn's complex hoisting algorithms.

The choice of pnpm over alternatives delivers concrete automation benefits: faster installs due to its efficient storage model, stricter dependency resolution that catches issues early, and better disk space utilization through deduplication. These improvements compound over time—what starts as slightly faster installs becomes significantly reduced CI times and more reliable dependency graphs as projects grow. The consistency this provides across team members' development environments eliminates an entire class of integration problems before they occur.

## Rule Definition

This rule applies to all Node.js projects, including TypeScript applications, React frontends, Express APIs, CLI tools, and npm packages. The rule specifically requires:

- **Package Manager Declaration**: Every package.json must include a `packageManager` field specifying the exact pnpm version
- **Engine Requirements**: The `engines` field must specify minimum Node.js and pnpm versions
- **CI Configuration**: Build pipelines must use pnpm instead of npm or yarn
- **Installation Commands**: Documentation and scripts must reference pnpm commands

The rule prohibits mixing package managers within a single project or repository. If you inherit a project using npm or yarn, migrate to pnpm as part of regular maintenance rather than maintaining multiple package manager configurations.

Exceptions may be appropriate for legacy projects where migration costs outweigh benefits, but new projects must start with pnpm. When exceptions exist, document the rationale clearly and establish a migration timeline.

## Practical Implementation

1. **New Project Setup**: Initialize projects with pnpm and configure package.json immediately:
   ```json
   {
     "packageManager": "pnpm@10.12.1",
     "engines": {
       "node": ">=18.0.0",
       "pnpm": ">=10.0.0"
     }
   }
   ```

2. **CI/CD Configuration**: Update build pipelines to use pnpm instead of npm. Most CI environments now support pnpm natively, or it can be installed as a first step in the build process.

3. **Team Onboarding**: Update development documentation to reference pnpm commands. Install pnpm globally on development machines using `npm install -g pnpm` or system package managers.

4. **Migration from npm/yarn**: Convert existing projects incrementally by removing node_modules and lock files, then running `pnpm install` to generate new pnpm-lock.yaml files.

5. **Editor Integration**: Configure IDEs and editors to recognize pnpm workspace configurations and use pnpm for running scripts and managing dependencies.

## Examples

```json
// ❌ BAD: Missing package manager declaration
{
  "name": "my-project",
  "dependencies": {
    "express": "^4.18.0"
  }
}

// ✅ GOOD: Explicit package manager and engine requirements
{
  "name": "my-project",
  "packageManager": "pnpm@10.12.1",
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=10.0.0"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

```bash
# ❌ BAD: Mixed package managers in CI
npm ci
npm run build
npm run test

# ✅ GOOD: Consistent pnpm usage
pnpm install --frozen-lockfile
pnpm run build
pnpm run test
```

```markdown
# ❌ BAD: Documentation assumes npm
## Development Setup
1. Run `npm install` to install dependencies
2. Run `npm start` to start the development server

# ✅ GOOD: Clear pnpm instructions
## Development Setup
1. Install pnpm globally: `npm install -g pnpm`
2. Run `pnpm install` to install dependencies
3. Run `pnpm start` to start the development server
```

## Related Bindings

- [development-environment-consistency.md](../core/development-environment-consistency.md): Package manager standardization directly supports environment consistency by ensuring all team members use identical dependency resolution and installation processes.

- [semantic-versioning.md](../core/semantic-versioning.md): pnpm's stricter dependency resolution helps enforce semantic versioning by detecting version conflicts that might be hidden by other package managers' hoisting behavior.
