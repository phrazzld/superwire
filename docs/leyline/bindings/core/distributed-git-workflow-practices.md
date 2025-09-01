---
id: distributed-git-workflow-practices
last_modified: '2025-06-24'
version: '0.2.0'
derived_from: distributed-resilience
enforced_by: 'git configuration, local tooling, workflow documentation, team practices'
---
# Binding: Embrace Distributed Git Workflows

Design Git workflows that leverage Git's distributed nature rather than treating it as a centralized system with extra steps. Every developer should have a complete, functional repository that enables full productivity without constant synchronization with a central server.

## Rationale

This binding directly implements our distributed resilience tenet by ensuring Git workflows embrace rather than fight Git's fundamental architecture. Too many teams use Git as if it were SVN with more commands—constantly pushing, pulling, and staying in sync with a central repository. This approach throws away Git's greatest strength: the ability to work productively in isolation.

Think of Git like a distributed database where every developer has a full replica. You wouldn't design a distributed database system that required constant synchronization for every operation—that would defeat the purpose. Similarly, Git workflows that require constant connection to a central server are missing the point. The central repository should be a coordination point, not a single source of truth that gates all progress.

When developers work in truly distributed workflows, they gain resilience against network failures, server outages, and even organizational changes. They can experiment freely, reorganize their work, and prepare changes properly before sharing them. This isn't about working in isolation—it's about having the option to work independently when needed and the ability to share work on your own terms.

## Rule Definition

**Core Distributed Practices:**

- **Local-First Development**: All primary development activities must work without network access:
  - Creating branches and switching between them
  - Making commits and rewriting history
  - Running tests and validating changes
  - Reviewing your own work and others' (via fetched branches)
  - Preparing releases and generating changelogs

- **Intelligent Synchronization**: Network operations should be deliberate, batched, and resilient:
  - Fetch remote changes periodically, not constantly
  - Push completed work, not work-in-progress (unless explicitly sharing)
  - Use remote tracking branches to work with others' code locally
  - Maintain multiple remotes for resilience (origin, upstream, backup)

- **Branch Strategy for Distribution**: Design branches that support distributed work:
  - Short-lived feature branches (1-3 days) to minimize merge conflicts
  - Local experimental branches that never need to be pushed
  - Clear distinction between public (shared) and private (local) branches
  - Integration branches for testing combinations of features locally

- **Resilient Collaboration Patterns**: Enable effective collaboration without central dependencies:
  - Pull requests via email patches when web services are down
  - Bundle exchanges for secure or disconnected environments
  - Local review of fetched branches before they're merged centrally
  - Distributed backup strategies across team members

## Practical Implementation

1. **Configure Git for Distributed Work**: Set up Git to work effectively in distributed scenarios:

   ```bash
   # Enable more informative branch tracking
   git config --global branch.autosetupmerge always
   git config --global branch.autosetuprebase always

   # Configure helpful aliases for distributed workflows
   git config --global alias.sync '!git fetch --all --prune && git branch -vv'
   git config --global alias.local-branches '!git branch -vv | grep -v origin'
   git config --global alias.backup '!git push backup --all --force-with-lease'

   # Set up resilient push behavior
   git config --global push.default current
   git config --global push.followTags true
   ```

2. **Establish Multiple Remotes**: Don't depend on a single remote:

   ```bash
   # Standard setup with resilience
   git remote add origin git@github.com:company/project.git
   git remote add backup git@gitlab.com:company/project.git
   git remote add mirror git@internal-server:project.git

   # Fetch from all remotes
   git fetch --all --prune

   # Push to multiple remotes for redundancy
   git config --global alias.push-all '!git push origin && git push backup'
   ```

3. **Implement Bundle-Based Workflows**: For truly disconnected scenarios:

   ```bash
   # Create a bundle for offline sharing
   git bundle create project-latest.bundle --all

   # Apply bundle in disconnected environment
   git clone project-latest.bundle project
   cd project
   git remote add origin /path/to/central/repo

   # Create incremental bundles for updates
   git bundle create updates.bundle origin/main..main
   ```

4. **Design for Asynchronous Review**: Enable code review without central services:

   ```bash
   # Export patches for email-based review
   git format-patch origin/main --stdout > feature.patch

   # Apply patches from email
   git am < feature.patch

   # Review branches locally after fetching
   git fetch origin feature-branch:review/feature-branch
   git checkout review/feature-branch
   # Review locally with full tools available
   ```

5. **Maintain Local Integration Testing**: Test integration without pushing:

   ```bash
   # Create local integration branch
   git checkout -b integration/sprint-42

   # Merge multiple features locally
   git merge feature/auth
   git merge feature/ui-update
   git merge feature/api-v2

   # Test integration locally
   npm test

   # Only push when integration is verified
   git push origin integration/sprint-42
   ```

## Examples

```bash
# ❌ BAD: Constant synchronization with central server
git pull origin main  # Before every commit
git add .
git commit -m "WIP: partial work"
git push origin feature-branch  # After every commit
# Breaks when GitHub is down, creates noisy history

# ✅ GOOD: Work locally, sync deliberately
git checkout -b feature/user-auth
# Make multiple commits locally
git add src/auth.js
git commit -m "feat(auth): implement JWT token generation"
git add tests/auth.test.js
git commit -m "test(auth): add JWT validation tests"
# Reorganize before sharing
git rebase -i main
# Push only when ready
git push -u origin feature/user-auth
```

```bash
# ❌ BAD: Single point of failure
git remote -v
# origin git@github.com:company/project.git (fetch)
# origin git@github.com:company/project.git (push)
# If GitHub is down, all workflows stop

# ✅ GOOD: Multiple remotes for resilience
git remote -v
# origin git@github.com:company/project.git (fetch)
# origin git@github.com:company/project.git (push)
# backup git@gitlab.com:company/project.git (fetch)
# backup git@gitlab.com:company/project.git (push)
# upstream git@github.com:original/project.git (fetch)
git push --all backup  # Maintain redundancy
```

```bash
# ❌ BAD: Reviews require central infrastructure
# "Can't review code because GitHub is down"
# Team blocked waiting for PR system

# ✅ GOOD: Distributed review capabilities
# Fetch review branch locally
git fetch origin feature/api-v2:review/api-v2
git checkout review/api-v2
# Review with full local tooling
git diff main...review/api-v2
npm test
# Provide feedback via available channel (email, chat, etc.)
git format-patch -1 --stdout | mail -s "Review feedback" developer@team.com
```

## Related Bindings

- [version-control-workflows.md](version-control-workflows.md): While this binding focuses on distributed Git capabilities, version control workflows provides the systematic practices. Together they create resilient development processes that work regardless of central service availability.

- [git-hooks-automation.md](git-hooks-automation.md): Local Git hooks provide distributed quality gates that don't depend on central CI services. Both bindings ensure development quality doesn't degrade when central infrastructure is unavailable.

- [development-environment-consistency.md](development-environment-consistency.md): Consistent local environments are essential for distributed workflows to function properly. Both bindings work together to ensure developers can work productively regardless of network availability.

- [feature-flag-management.md](feature-flag-management.md): Feature flags enable distributed development of features without coordination bottlenecks. Teams can develop features independently and control rollout separately from deployment.
