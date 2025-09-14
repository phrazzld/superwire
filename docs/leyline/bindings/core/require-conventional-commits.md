---
derived_from: automation
enforced_by: commit hooks & CI checks
id: require-conventional-commits
last_modified: '2025-05-14'
version: '0.2.0'
---
# Binding: Express Intent Through Structured Commit Messages

All commits must follow Conventional Commits format to enable automated versioning, changelog generation, and release management through machine-readable intent.

## Rationale

This binding implements automation through structured commit data that drives versioning, release notes, and deployment workflows. Consistent commit patterns enable sustainable automation that scales with your project, reducing manual work and creating clearer project history.

## Rule Definition

**Requirements:**

- **Format**: `<type>[optional scope]: <description>` with optional body and footers

- **Types**: `feat` (MINOR), `fix` (PATCH), `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

- **Breaking Changes**: Use `!` after type/scope and `BREAKING CHANGE:` footer

- **Focus**: Single logical change, 50-char description, details in body

- **Scope**: Use consistent module/feature names in parentheses

- **Enforcement**: Pre-commit hooks, CI validation, PR blocking

## Practical Implementation

## Implementation

**Commitlint Setup:**
```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional husky
echo "module.exports = {extends: ['@commitlint/config-conventional']}" > commitlint.config.js
npx husky install
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit $1'
```

**Commitizen Helper:**
```bash
npm install --save-dev commitizen cz-conventional-changelog
echo '{ "path": "cz-conventional-changelog" }' > .czrc
# Add to package.json: "scripts": { "commit": "cz" }
```

**Git Template:**
```bash
cat > .gitmessage.txt << 'EOF'
# <type>[optional scope]: <summary>
#
# [optional body]
#
# [optional footer(s)]
EOF
git config --local commit.template .gitmessage.txt
```

**Changelog Automation:**
```bash
npm install --save-dev standard-version
# Add to package.json: "scripts": { "release": "standard-version" }
```

**Quality Guidelines:** Imperative mood, specific descriptions, issue references, impact explanation, motivation in body.

## Examples

```
❌ fixed login bug
✅ fix(auth): prevent login timeout on slow connections

❌ updated styles, fixed navigation bug, added new API endpoint
✅ feat(api): add user profile endpoint

❌ refactor: rename authentication methods
✅ refactor!: rename authentication methods
   BREAKING CHANGE: Methods renamed to auth<Action> pattern

❌ chore: update dependencies
✅ chore(deps): update database driver to v4.2.1
```

## Related Bindings

- [document-decisions](../../docs/tenets/document-decisions.md): Preserves context in commits and code
- [automate-changelog](../../docs/bindings/core/automate-changelog.md): Enables automated changelog generation
- [semantic-versioning](../../docs/bindings/core/semantic-versioning.md): Maps to version increments
- [git-hooks-automation](../../docs/bindings/core/git-hooks-automation.md): Enforces commit standards
- [version-control-workflows](../../docs/bindings/core/version-control-workflows.md): Integrates with branch protection
- [ci-cd-pipeline-standards](../../docs/bindings/core/ci-cd-pipeline-standards.md): Enables release automation
