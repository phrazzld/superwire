---
id: git-automation-assistance
last_modified: '2025-06-24'
version: '0.2.0'
derived_from: joyful-version-control
enforced_by: 'git aliases, automated scripts, CI/CD pipelines, git hooks, workflow tools'
---

# Binding: Implement Assistive Git Automation

Create Git automation that acts as a helpful assistant rather than a rigid enforcer. Automation should guide developers toward best practices while respecting their autonomy, making the right thing to do also the easiest thing to do.

## Rationale

This binding implements our joyful version control tenet by ensuring automation enhances rather than constrains developer workflows. When automation feels like a helpful colleague rather than a bureaucratic gatekeeper, developers embrace it enthusiastically.

Think of good Git automation like a skilled sous chef—handling repetitive work, ensuring ingredients are ready, and catching problems early without preventing creativity. Bad automation feels like a micromanaging supervisor, enforcing rigid rules and breeding resentment.

## Rule Definition

Assistive Git automation follows these principles:

- **Suggest, Don't Force**: Guide developers toward best practices while allowing informed decisions to override suggestions
- **Provide Context**: When automation intervenes, explain why and offer alternatives, not just say "no"
- **Respect Developer Time**: Be fast, reliable, and unobtrusive. Make long-running checks asynchronous
- **Learn and Adapt**: Recognize patterns and adapt to team workflows rather than forcing teams to adapt
- **Fail Gracefully**: When automation fails, don't block work and provide clear paths forward
- **Enhance, Don't Replace**: Enhance human judgment, not attempt to replace it

## Practical Implementation

1. **Create Intelligent Git Aliases**: Build aliases that provide helpful guidance:

   ```bash
   # ~/.gitconfig - Smart commit with suggestions
   [alias]
     ci = "!f() { \
       msg=\"$1\"; \
       if [ ${#msg} -gt 72 ]; then \
         echo \"📏 Message is ${#msg} chars (recommended: 50-72)\"; \
         read -p \"Continue anyway? [y/N] \" -n 1 -r; \
         [[ ! $REPLY =~ ^[Yy]$ ]] && return 1; \
       fi; \
       if ! echo \"$msg\" | grep -qE '^(feat|fix|docs|style|refactor|test|chore)'; then \
         echo \"💡 Consider conventional format: feat/fix/docs...\"; \
         read -p \"Continue? [y/N] \" -n 1 -r; \
         [[ ! $REPLY =~ ^[Yy]$ ]] && return 1; \
       fi; \
       git commit -m \"$msg\"; \
     }; f"
   ```

2. **Implement Smart Pre-commit Hooks**: Create hooks that assist rather than block:

   ```bash
   #!/bin/bash
   # .git/hooks/pre-commit - Assistive pre-commit hook

   echo "🔍 Running pre-commit checks..."
   issues_found=false

   # Large file check
   large_files=$(git diff --cached --name-only | xargs -I {} find {} -size +1M 2>/dev/null)
   if [ -n "$large_files" ]; then
     echo "📦 Large files detected. Consider Git LFS."
     issues_found=true
   fi

   # Debugging code check
   if git diff --cached | grep -E "(console\.log|debugger|TODO:|FIXME:)" > /dev/null; then
     echo "🔍 Found debugging/temporary code"
     echo "💡 Consider removing before committing"
     issues_found=true
   fi

   # Ask for confirmation if issues found
   if [ "$issues_found" = true ]; then
     read -p "Issues detected. Continue? [y/N] " -n 1 -r
     echo ""
     if [[ ! $REPLY =~ ^[Yy]$ ]]; then
       echo "✅ Commit cancelled."
       exit 1
     fi
   fi
   ```

3. **Build Workflow Assistants**: Create scripts that guide complex operations:

   ```bash
   #!/bin/bash
   # git-release-assistant - Interactive release helper

   echo "🎉 Release Assistant"

   # Check current branch
   current_branch=$(git branch --show-current)
   if [[ "$current_branch" != "main" ]]; then
     echo "📍 On branch: $current_branch (releases typically from 'main')"
     read -p "Continue? [y/N] " -n 1 -r
     [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
   fi

   # Suggest version based on commits
   last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "none")
   if [ "$last_tag" != "none" ]; then
     git log "$last_tag..HEAD" --oneline | head -3

     if git log "$last_tag..HEAD" --oneline | grep -q "BREAKING CHANGE"; then
       echo "💡 Found breaking changes - suggest MAJOR bump"
     elif git log "$last_tag..HEAD" --oneline | grep -qE "^feat"; then
       echo "💡 Found features - suggest MINOR bump"
     else
       echo "💡 Only fixes - suggest PATCH bump"
     fi
   fi

   read -p "Version: " version
   echo "📝 Creating release $version..."
   ```

4. **Create Helpful Error Recovery**: Make error messages assistive:

   ```bash
   # Wrap Git commands with helpful error handling
   git() {
     command git "$@"
     status=$?

     if [ $status -ne 0 ]; then
       case "$1" in
         push)
           if [[ "$*" == *"--force"* ]]; then
             echo "💡 Try: git push --force-with-lease"
           elif [[ "$*" == *"rejected"* ]]; then
             echo "💡 Try: git pull --rebase origin $(git branch --show-current)"
           fi
           ;;
         merge)
           echo "💡 Options: git add . && git merge --continue OR git merge --abort"
           ;;
         rebase)
           echo "💡 Options: git add . && git rebase --continue OR git rebase --abort"
           ;;
       esac
     fi

     return $status
   }
   ```

## Examples

```bash
# ❌ BAD: Rigid automation that blocks work
Error: Commit message does not match pattern
Commit rejected.

# ✅ GOOD: Assistive automation that guides
📝 Commit message: "fix login bug"
💡 Consider conventional format: "fix: resolve login timeout issue"
1) Edit message  2) Continue  3) See examples
Choice [1-3]:

# ❌ BAD: Blocking pre-push hook with no context
Push rejected: Branch name invalid

# ✅ GOOD: Helpful pre-push guidance
🌿 Branch name: "fix-login-timeout"
💡 Consider: "bugfix/PROJ-123-fix-login-timeout"
Push anyway? [y/N]
```

## Related Bindings

- [git-hooks-automation](git-hooks-automation.md): Git hooks provide real-time guidance during Git operations
- [forgiving-git-workflows](forgiving-git-workflows.md): Assistive automation supports forgiving workflows
- [human-readable-commit-history](human-readable-commit-history.md): Automation guides better commit messages through suggestions
- [automate-changelog](automate-changelog.md): Generate changelogs while allowing developer enhancement
