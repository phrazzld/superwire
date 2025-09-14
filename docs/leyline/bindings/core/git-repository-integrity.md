---
id: git-repository-integrity
last_modified: '2025-06-24'
version: '0.2.0'
derived_from: maintainability
enforced_by: 'git configuration, automated validation, pre-receive hooks, CI checks'
---
# Binding: Maintain Git Repository Integrity at Scale

Protect repository integrity through disciplined history management, intelligent garbage collection, and pragmatic strategies for handling large files. A healthy repository that performs well after years of development is not an accident—it's the result of consistent practices that prevent degradation.

## Rationale

Repository health directly impacts developer productivity. Git performs best with disciplined usage patterns—when teams violate these by checking in large binaries, creating excessive commits, or maintaining stale branches, performance degrades dramatically.

Without proper hygiene, repositories grow from quick clones to multi-gigabyte downloads, with simple operations taking seconds instead of milliseconds. Understanding Git's design constraints and establishing practices around file size limits, history maintenance, and branch hygiene ensures the repository remains productive rather than becoming a burden.

## Rule Definition

**Repository Health Requirements:**

- **Binary and Large File Management**:
  - Files over 10MB must use Git LFS or external storage
  - Binary assets should be versioned separately from code
  - Build artifacts must never be committed
  - Generated files belong in .gitignore, not the repository

- **History Hygiene**:
  - Squash merge for feature branches to maintain linear history
  - No merge commits from long-lived branches into feature branches
  - Force pushes only allowed on personal branches, never shared ones
  - Commit messages must be meaningful and follow conventions

- **Branch Lifecycle Management**:
  - Delete merged branches immediately (automated via platforms)
  - Stale branches (>30 days) should be archived or deleted
  - Branch names must follow consistent patterns
  - No branches from ancient commits (>6 months old)

- **Repository Size Control**:
  - Total repository size should stay under 1GB
  - Individual pack files should stay under 100MB
  - Regular garbage collection for active repositories
  - Aggressive GC after large file removals

- **Performance Standards**:
  - Fresh clone should complete in under 2 minutes
  - Git status should respond in under 1 second
  - Branch switching should be near-instantaneous
  - Common operations shouldn't require excessive memory

## Practical Implementation

1. **Configure Git LFS for Large Files**:
   ```bash
   git lfs install
   git lfs track "*.psd" "*.zip" "*.mp4"
   git add .gitattributes
   git commit -m "chore: configure Git LFS for large files"
   git lfs migrate import --include="*.psd,*.zip" --everything
   ```

2. **Implement Branch Protection Rules**:
   ```yaml
   protection_rules:
     - pattern: main
       required_linear_history: true
       delete_branch_on_merge: true
       allow_force_pushes: false
   ```

3. **Automate Repository Maintenance**:
   ```bash
   # Weekly maintenance script
   git remote prune origin
   git gc --aggressive --prune=now
   git rev-list --objects --all | git cat-file --batch-check | sort -k3nr | head -20
   ```

4. **Implement Pre-receive Hooks**:
   ```bash
   # Enforce 10MB file size limit
   MAX_SIZE=10485760
   for file in $(git diff --name-only $oldrev..$newrev); do
     size=$(git cat-file -s $(git ls-tree -r "$newrev" -- "$file" | awk '{print $3}'))
     [ $size -gt $MAX_SIZE ] && echo "File $file too large" && exit 1
   done
   ```

## Examples

**Large File Management:**
```bash
# ❌ BAD: Direct commit of large files
git add design.psd  # 50MB file - bloats repository

# ✅ GOOD: Git LFS for large files
git lfs track "*.psd"
git add design.psd  # Only pointer stored in Git
```

**Branch Hygiene:**
```bash
# ❌ BAD: Stale branches everywhere
git branch -r | wc -l  # 3847 branches

# ✅ GOOD: Automated cleanup
git config remote.origin.prune true
git remote prune origin
```

## Related Bindings

- [version-control-workflows.md](version-control-workflows.md): Supports performant repository management
- [automated-quality-gates.md](automated-quality-gates.md): Validates repository health metrics
- [technical-debt-tracking.md](technical-debt-tracking.md): Prevents repository cruft accumulation
- [performance-testing-standards.md](performance-testing-standards.md): Monitors repository performance
