---
id: forgiving-git-workflows
last_modified: '2025-06-24'
version: '0.2.0'
derived_from: git-least-surprise
enforced_by: 'git aliases, recovery scripts, team training, documentation, backup strategies'
---

# Binding: Build Forgiving Git Workflows

Design Git workflows that anticipate and gracefully handle human mistakes. Provide clear recovery paths, helpful error messages, and safety nets that let developers work confidently without fear of irreversible errors.

## Rationale

This binding implements our Git least surprise principle by ensuring that mistakes lead to learning opportunities rather than disasters. When developers know they can safely recover from errors, they work with confidence and creativity. Fear of Git mistakes creates a cognitive burden that drains energy from actual problem-solving.

Think of forgiving Git workflows like wearing a climbing harness. The harness doesn't prevent you from climbing challenging routes or making bold moves—it simply ensures that if you slip, you won't fall to disaster. Similarly, forgiving workflows don't prevent developers from using Git's full power; they ensure that mistakes become minor inconveniences rather than major crises.

The cost of unforgiving Git workflows is measured not just in time spent recovering from mistakes, but in the creative work that doesn't happen because developers are working cautiously. When a developer spends mental energy worrying about Git commands, they have less energy for innovative problem-solving. Forgiving workflows free developers to focus on their actual work, knowing that Git mistakes can be easily corrected.

## Rule Definition

Forgiving Git workflows follow these principles:

- **Make Destruction Difficult**: Require confirmation for potentially destructive operations. Force push, branch deletion, and history rewriting should require explicit flags or confirmations.

- **Provide Clear Recovery Paths**: For every common mistake, provide a clear, documented way to recover. Developers shouldn't need to be Git experts to undo their errors.

- **Preserve Work by Default**: Configure Git to preserve rather than discard work. Use reflog, stash, and backup strategies to ensure nothing is truly lost.

- **Give Helpful Error Messages**: When operations fail, provide messages that explain what went wrong and suggest next steps. Replace Git's terse errors with human-friendly guidance.

- **Enable Safe Experimentation**: Create sandbox environments where developers can practice and experiment without affecting shared branches or production code.

- **Document Common Recoveries**: Maintain a "Git 911" guide with solutions to common problems, written in plain language with step-by-step instructions.

## Practical Implementation

1. **Create Safety Aliases**: Build aliases that add safety checks to dangerous operations:

   ```bash
   # ~/.gitconfig - Safety-first aliases
   [alias]
     # Safe force push that checks remote first
     pushf = "!f() { \
       echo 'Checking remote status before force push...'; \
       git fetch; \
       if git diff HEAD..@{u} --quiet; then \
         echo 'Remote matches local, force pushing...'; \
         git push --force-with-lease; \
       else \
         echo '⚠️  Remote has changes! Review with: git diff HEAD..@{u}'; \
         echo 'If you are sure, use: git push --force'; \
       fi; \
     }; f"

     # Safe branch deletion with recovery info
     branch-delete = "!f() { \
       branch=$1; \
       echo \"Saving branch backup to refs/backup/$branch\"; \
       git update-ref refs/backup/$branch refs/heads/$branch; \
       git branch -D $branch; \
       echo \"✅ Branch deleted. Recover with: git branch $branch refs/backup/$branch\"; \
     }; f"

     # Undo last commit but keep changes
     undo = reset HEAD~1 --soft

     # Show what would be deleted before clean
     clean-preview = clean -n -d
   ```

2. **Implement Recovery Commands**: Create simple commands for common recovery scenarios:

   ```bash
   # Git 911 - Emergency recovery commands

   # "I committed to the wrong branch!"
   git-move-commit() {
     correct_branch=$1
     git reset HEAD~1 --soft
     git checkout -b $correct_branch || git checkout $correct_branch
     git commit -c ORIG_HEAD
     echo "✅ Moved commit to $correct_branch"
   }

   # "I accidentally deleted a branch!"
   git-recover-branch() {
     branch_name=$1
     sha=$(git reflog | grep "checkout: moving from $branch_name" | head -1 | awk '{print $1}')
     if [ -z "$sha" ]; then
       echo "❌ Cannot find branch $branch_name in reflog"
       echo "Try: git reflog | grep $branch_name"
     else
       git branch $branch_name $sha
       echo "✅ Recovered branch $branch_name at $sha"
     fi
   }

   # "I need to find lost work!"
   git-find-lost-commits() {
     echo "🔍 Searching for lost commits..."
     git fsck --full --no-reflogs --unreachable --lost-found |
     grep commit | cut -d' ' -f3 |
     xargs -n 1 git log --oneline -n 1
   }
   ```

3. **Configure Git for Safety**: Set up Git configurations that preserve work:

   ```bash
   # Global safety configurations
   git config --global push.default current
   git config --global push.autoSetupRemote true
   git config --global merge.defaultToUpstream true
   git config --global pull.rebase false  # Merge by default is safer
   git config --global rebase.autoStash true
   git config --global core.trustctime false

   # Enable reflog for all repos
   git config --global core.logAllRefUpdates true

   # Helpful diff settings
   git config --global diff.algorithm histogram
   git config --global merge.conflictstyle diff3
   ```

4. **Create Beginner-Friendly Workflows**: Provide guided workflows for complex operations:

   ```bash
   #!/bin/bash
   # git-feature-start - Guided feature branch creation

   echo "🚀 Starting a new feature branch"
   echo "Current branch: $(git branch --show-current)"

   read -p "Feature name (will create feature/your-name): " feature_name

   # Ensure we're up to date
   echo "📥 Updating from remote..."
   git fetch origin main

   # Create branch from latest main
   git checkout -b "feature/$feature_name" origin/main

   echo "✅ Created feature/$feature_name from latest main"
   echo "💡 When ready to push: git push -u origin HEAD"
   ```

5. **Implement Backup Strategies**: Automatically backup important operations:

   ```bash
   # Pre-rebase backup hook
   # .git/hooks/pre-rebase
   #!/bin/sh
   branch=$(git branch --show-current)
   backup_branch="backup/${branch}-$(date +%Y%m%d-%H%M%S)"
   git branch $backup_branch
   echo "📦 Backup created: $backup_branch"
   echo "Restore with: git reset --hard $backup_branch"
   ```

6. **Provide Clear Documentation**: Create a "Git 911" guide for emergencies:

   ```markdown
   # Git 911 - Emergency Recovery Guide

   ## "I committed sensitive data!"
   1. DON'T PUSH! If you haven't pushed yet:
      ```bash
      git reset HEAD~1              # Undo commit
      # Edit file to remove sensitive data
      git add .
      git commit -m "feat: add feature (without secrets)"
      ```

   2. If you already pushed:
      - Rotate the exposed credentials immediately
      - Use git-filter-branch or BFG to clean history
      - Contact security team

   ## "I'm in the middle of a merge conflict mess!"
   Escape hatch - abandon and start over:
   ```bash
   git merge --abort           # or git rebase --abort
   git checkout main          # Go to safe branch
   git branch backup-mess     # Save current state just in case
   ```

   ## "Git says I'll lose uncommitted changes!"
   Save everything first:
   ```bash
   git stash -u               # -u includes untracked files
   # Do whatever Git was complaining about
   git stash pop              # Restore your changes
   ```
   ```

## Examples

```bash
# ❌ BAD: Dangerous operation with no safety net
git push --force
# Risk: Overwrites teammate's commits without warning

# ✅ GOOD: Safe force push with lease
git push --force-with-lease
# Or use custom alias:
git pushf
# Checks if remote changed before forcing
```

```bash
# ❌ BAD: Confusing error with no guidance
$ git checkout feature-x
error: Your local changes to the following files would be overwritten by checkout:
	src/app.js
Please commit your changes or stash them before you switch branches.
Aborting

# ✅ GOOD: Helpful wrapper with clear options
$ git-switch feature-x
⚠️  You have uncommitted changes in:
   - src/app.js

Your options:
1) Save changes:     git stash && git checkout feature-x
2) Bring changes:    git checkout feature-x -m
3) Discard changes:  git checkout feature-x -f
4) Cancel:           Ctrl+C

What would you like to do? [1-4]:
```

```bash
# ❌ BAD: Destructive clean with no preview
git clean -fdx
# Silently deletes all untracked files and directories

# ✅ GOOD: Safe clean with preview and confirmation
git clean-preview          # Custom alias showing what would be deleted
# Output: Would remove: temp/, .env.local, debug.log
git clean -i              # Interactive mode for selective cleaning
```

```bash
# ❌ BAD: Lost branch with no recovery info
git branch -D experimental-feature
# Branch gone, SHA lost, panic ensues

# ✅ GOOD: Safe deletion with recovery instructions
git branch-delete experimental-feature
# Output:
# 📦 Saving branch backup to refs/backup/experimental-feature
# ✅ Branch deleted. Recover with: git branch experimental-feature refs/backup/experimental-feature
# Recovery available for 30 days in reflog
```

## Related Bindings

- [git-hooks-automation.md](git-hooks-automation.md): Git hooks can implement safety checks that prevent mistakes before they happen. Pre-commit hooks that check for secrets or validate branch names are proactive forgiveness.

- [development-environment-consistency.md](development-environment-consistency.md): Consistent environments include standardized Git configurations and aliases that make workflows forgiving by default across the team.

- [human-readable-commit-history.md](human-readable-commit-history.md): Clear commit messages make recovery easier by providing context about what was intended, helping developers understand what needs to be restored or fixed.

- [build-trust-through-collaboration.md](build-trust-through-collaboration.md): Forgiving workflows build trust by removing fear of mistakes. When developers know errors are recoverable, they collaborate more freely and share work earlier.
