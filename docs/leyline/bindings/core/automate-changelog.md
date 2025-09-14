---
derived_from: automation
id: automate-changelog
last_modified: '2025-05-14'
version: '0.2.0'
enforced_by: code review & style guides
---
# Binding: Automate Changelog Generation from Structured Commits

All projects must automatically generate changelogs using structured commit messages.
Manually maintaining change logs is error-prone and time-consuming; instead, leverage
conventional commits to automatically produce accurate, consistent documentation of
changes across versions.

## Rationale

Automated changelog generation transforms manual documentation work into an automated process driven by structured commit messages. This creates documentation as a natural byproduct of development workflow rather than separate effort.

Manual changelog maintenance leads to inconsistencies in format, missing entries, and wasted developer time. Automated generation enforces consistent categorization (features, fixes, breaking changes) across all releases, creating queryable history that helps users understand version changes.

## Rule Definition

**MUST** follow Conventional Commits specification (see [require-conventional-commits](../../docs/bindings/core/require-conventional-commits.md)):
- Use standardized type prefixes (`feat`, `fix`, `docs`, etc.)
- Mark breaking changes with `!` and `BREAKING CHANGE:` footer
- Write clear, descriptive messages

**MUST** implement automated changelog generation:
- Configure tools to parse conventional commits
- Generate changelogs automatically during releases
- Include version, date, and categorized changes
- Group by type (features, fixes, breaking changes)
- Include commit authors and issue links

**MUST** integrate with release process:
- Trigger changelog updates on version creation
- Include changelog in release commits
- Publish alongside released artifacts

**Exceptions:** Private exploratory repos, single-use scripts, repositories with <3 contributors and no public API

## Practical Implementation

**Standard-Version Setup:**
```bash
npm install --save-dev standard-version
# Add to package.json: "scripts": { "release": "standard-version" }
```

**Basic Configuration (.versionrc):**
```json
{
  "types": [
    {"type": "feat", "section": "Features"},
    {"type": "fix", "section": "Bug Fixes"},
    {"type": "docs", "section": "Documentation"},
    {"type": "perf", "section": "Performance Improvements"}
  ]
}
```

**CI/CD Integration:**
```yaml
name: Release
on: { push: { tags: ['v*'] } }
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Generate changelog
        run: npx standard-version --skip.bump --skip.tag
      - name: Create GitHub Release
        uses: actions/create-release@v1
        with:
          body_path: CHANGELOG.md
```

**Commit Validation:**
```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional husky
npx husky install
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit $1'
```

## Examples

**❌ Manual changelog (inconsistent format, missing entries):**
```markdown
## v1.2.0
- Added user profile feature
- Some bug fixes
- Performance improvements
```

**✅ Automated changelog (consistent formatting, complete):**
```markdown
## [1.2.0](https://github.com/org/repo/compare/v1.1.0...v1.2.0) (2025-04-15)

### Features
* **profile:** add user profile page with avatar support ([a1b2c3d](https://github.com/org/repo/commit/a1b2c3d))

### Bug Fixes
* **auth:** prevent login timeout on slow connections ([i8j9k0l](https://github.com/org/repo/commit/i8j9k0l))

### Performance Improvements
* **api:** implement query result caching ([q4r5s6t](https://github.com/org/repo/commit/q4r5s6t))
```

**❌ Manual release process:**
1. Update version manually
2. Update CHANGELOG.md manually
3. Commit, tag, push

**✅ Automated release process:**
1. Ensure CI passes
2. Run `npm run release` (determines version bump, generates changelog, creates tag)
3. Push with `git push --follow-tags origin main`

## Related Bindings

**[require-conventional-commits](../../docs/bindings/core/require-conventional-commits.md):** Provides structured data for automated changelog generation

**[semantic-versioning](../../docs/bindings/core/semantic-versioning.md):** Conventional commits signal version changes while changelog automation documents each increment
