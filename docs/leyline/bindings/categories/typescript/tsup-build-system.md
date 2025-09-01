---
id: tsup-build-system
last_modified: '2025-06-18'
version: '0.2.0'
derived_from: simplicity
enforced_by: 'tsup configuration, build scripts, CI validation, output verification'
---

# Binding: Optimize TypeScript Builds with tsup for Simplicity and Performance

Use tsup as the standard build tool for all TypeScript libraries and applications. Configure builds for multiple output formats (ESM, CJS, type definitions) with minimal configuration, automated bundle optimization, and integrated development workflows.

## Rule Definition

Applies to all TypeScript projects producing distributable artifacts. Requirements:

**Configuration Standards:**
- **Single Configuration File**: Use `tsup.config.ts` for type safety
- **Multiple Output Formats**: Generate ESM and CommonJS builds
- **Type Definitions**: Always generate `.d.ts` files for libraries
- **Source Maps**: Include source maps for debugging

**Optimization:**
- **Bundle Splitting**: Split vendor dependencies for better caching
- **Tree Shaking**: Enable dead code elimination
- **Minification**: Minify production builds
- **External Dependencies**: Externalize peer dependencies

**Development:**
- **Watch Mode**: File watching with rapid rebuilds
- **Clean Builds**: Auto-clean output directories
- **Build Verification**: Validate outputs and fail fast on errors

## Implementation

1. **Library Configuration**:
   ```typescript
   // tsup.config.ts
   import { defineConfig } from 'tsup';

   export default defineConfig({
     entry: ['src/index.ts'],
     outDir: 'dist',
     clean: true,
     format: ['esm', 'cjs'],
     target: 'es2020',
     dts: true,
     sourcemap: true,
     splitting: false, // Libraries use single entry
     treeshake: true,
     external: ['react', 'react-dom'] // Don't bundle peer deps
   });
   ```

2. **Application Configuration**:
   ```typescript
   // tsup.config.ts
   import { defineConfig } from 'tsup';

   export default defineConfig({
     entry: { app: 'src/main.ts', worker: 'src/worker.ts' },
     outDir: 'dist',
     clean: true,
     format: ['esm'],
     target: 'es2022',
     platform: 'browser',
     dts: false, // Apps don't need type exports
     sourcemap: true,
     splitting: true, // Enable code splitting
     treeshake: true,
     minify: process.env.NODE_ENV === 'production'
   });
   ```

3. **Package.json Integration**:
   ```json
   {
     "scripts": {
       "build": "tsup",
       "build:watch": "tsup --watch",
       "dev": "tsup --watch --onSuccess \"node dist/index.js\""
     },
     "main": "./dist/index.js",
     "module": "./dist/index.mjs",
     "types": "./dist/index.d.ts",
     "exports": {
       ".": {
         "import": "./dist/index.mjs",
         "require": "./dist/index.js",
         "types": "./dist/index.d.ts"
       }
     }
   }
   ```

4. **Development Workflow**:
   ```typescript
   // tsup.config.dev.ts
   import { defineConfig } from 'tsup';
   import baseConfig from './tsup.config.js';

   export default defineConfig({
     ...baseConfig,
     minify: false,
     sourcemap: 'inline',
     watch: ['src'],
     splitting: false // Faster rebuilds
   });
   ```

5. **CI/CD Integration**:
   ```yaml
   - run: pnpm install --frozen-lockfile
   - run: pnpm build
   - run: test -f dist/index.js && test -f dist/index.d.ts
   ```

## Examples

**❌ BAD: Complex webpack configuration**
```typescript
// 200+ lines of webpack config with loaders, plugins, optimization...
module.exports = {
  mode: process.env.NODE_ENV,
  entry: './src/index.ts',
  module: { rules: [/* complex rules */] },
  optimization: { minimizer: [/* config */], splitChunks: {/* ... */} }
};
```

**✅ GOOD: Simple tsup configuration**
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true
});
```

**❌ BAD: Inconsistent build scripts**
```json
{
  "scripts": {
    "compile": "webpack --mode=production",
    "types": "tsc --emitDeclarationOnly",
    "bundle": "rollup -c",
    "minify": "terser dist/bundle.js -o dist/bundle.min.js"
  }
}
```

**✅ GOOD: Consistent tsup scripts**
```json
{
  "scripts": {
    "build": "tsup",
    "build:watch": "tsup --watch",
    "dev": "tsup --watch --onSuccess \"node dist/index.js\""
  }
}
```

**❌ BAD: Manual build orchestration**
```typescript
async function buildProject() {
  await fs.rm('dist', { recursive: true });
  await exec('tsc --project tsconfig.build.json');
  await exec('rollup -c rollup.config.js');
  await exec('tsc --emitDeclarationOnly');
  await exec('terser dist/index.js -o dist/index.min.js');
  // Multiple error-prone steps...
}
```

**✅ GOOD: Single tsup command**
```typescript
// tsup.config.ts handles everything automatically
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: process.env.NODE_ENV === 'production'
});
// Single command: pnpm build
```

## Related Bindings

- [modern-typescript-toolchain.md](modern-typescript-toolchain.md): Implements build component of unified toolchain
- [automated-quality-gates.md](../../core/automated-quality-gates.md): Build validation implements automated quality gates
- [development-environment-consistency.md](../../core/development-environment-consistency.md): Standardized build configuration supports environment consistency
- [semantic-versioning.md](../../core/semantic-versioning.md): Build output verification integrates with semantic versioning
