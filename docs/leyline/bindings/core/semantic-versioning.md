---
derived_from: explicit-over-implicit
enforced_by: version checking tools & CI validation
id: semantic-versioning
last_modified: '2025-05-14'
version: '0.2.0'
---
# Binding: Make Breaking Changes Explicit with Semantic Versioning

Follow Semantic Versioning (SemVer) to make compatibility guarantees explicit through version numbers: patch (bug fixes), minor (backward-compatible features), major (breaking changes).

## Rationale

This binding implements explicit-over-implicit by transforming version numbers into meaningful contracts. Like traffic signals enable efficient movement through clear rules, semantic versioning enables safe dependency navigation. It prevents "dependency hell" by allowing automated tools to apply updates while avoiding breaking changes.

## Rule Definition

**Requirements:**

- **Format**: `MAJOR.MINOR.PATCH` (breaking.feature.fix)
- **Pre-1.0.0**: API unstable, breaking changes in minor versions
- **Increments**: PATCH for fixes, MINOR for features, MAJOR for breaking changes
- **Pre-release**: `1.0.0-alpha.1` format
- **Build metadata**: `1.0.0+20250506` format
- **Deprecation**: Mark deprecated → document migration → remove in next major
- **Validation**: CI must verify version increments match changes

## Practical Implementation

## Implementation

**Automated Versioning:**
```bash
npm install --save-dev semantic-release
# Or: npm install --save-dev standard-version
```

**API Contract Validation:**
```json
// api-extractor.json
{
  "mainEntryPointFilePath": "<projectFolder>/lib/index.d.ts",
  "apiReport": { "enabled": true },
  "messages": {
    "extractorMessageReporting": {
      "ae-incompatible-release-tags": { "logLevel": "error" }
    }
  }
}
```

**CI Validation:**
```yaml
jobs:
  validate:
    steps:
      - name: Check version increment
        run: |
          # Verify SemVer format and increment
          # Check breaking changes require major bump
          # Validate API compatibility
```

**Version Policy:**
- PATCH: Bug fixes (1.0.X)
- MINOR: New features (1.X.0)
- MAJOR: Breaking changes (X.0.0)
- Stable API: >=1.0.0
- Deprecation: Mark → Document → Warn → Remove

**Package Scripts:**
```json
{
  "scripts": {
    "version": "npm run build && npm run api-report",
    "postversion": "git push && git push --tags"
  }
}
```

## Examples

```typescript
// ❌ BAD
Version 1.4 -> 1.5 -> 1.5.1 -> 1.6 -> 2  // Inconsistent
v1.2.0 -> v1.3.0: processData() now returns Promise<Result>  // Breaking in minor!

// ✅ GOOD
1.0.0 -> 1.1.0 (feature) -> 1.1.1 (fix) -> 2.0.0 (breaking)
v1.3.0: Add processDataAsync() alongside processData()
v2.0.0: processData() marked @deprecated
```

## Related Bindings

- [require-conventional-commits](../../docs/bindings/core/require-conventional-commits.md): Maps commits to SemVer (fix→patch, feat→minor, feat!→major)
- [automate-changelog](../../docs/bindings/core/automate-changelog.md): Provides change details alongside version signals
- [immutable-by-default](../../docs/bindings/core/immutable-by-default.md): Shares principle of explicit changes
- [version-control-workflows](../../docs/bindings/core/version-control-workflows.md): Integrates with release automation
- [ci-cd-pipeline-standards](../../docs/bindings/core/ci-cd-pipeline-standards.md): Automates version validation
