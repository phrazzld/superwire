---
id: collaborative-branch-naming
last_modified: '2025-06-24'
version: '0.2.0'
derived_from: git-least-surprise
enforced_by: 'branch naming conventions, git hooks, PR templates, team agreements'
---

# Binding: Use Collaborative Branch Naming

Adopt branch naming conventions that instantly communicate purpose, ownership, and status to all team members. Branch names should tell a clear story about what work is happening and where it fits in the project's lifecycle.

## Rationale

This binding implements our Git least surprise principle by ensuring branch names are self-documenting and predictable. When developers can understand a branch's purpose from its name alone, they can navigate the repository confidently without needing to examine code or ask colleagues for context.

Think of branch names like street signs in a city. Good street signs help you navigate without a map—"5th Avenue" tells you you're on a major thoroughfare, "Elm Street" suggests a residential area, and "Industrial Parkway" indicates commercial zones. Similarly, branch names like `feature/user-authentication`, `bugfix/memory-leak-dashboard`, and `release/v2.3.0` immediately orient developers within the codebase landscape.

Poor branch naming creates a fog of confusion that slows development and increases the risk of mistakes. When branches are named after developers (`johns-branch`), tickets without context (`JIRA-1234`), or cryptic abbreviations (`fix-thing-v2`), every interaction requires additional investigation. This cognitive overhead compounds across the team, turning simple operations like choosing where to branch from or what to review into research projects.

## Rule Definition

Collaborative branch naming follows these principles:

- **Use Descriptive Prefixes**: Start branch names with standardized prefixes that indicate the type of work: `feature/`, `bugfix/`, `hotfix/`, `release/`, `chore/`, `experiment/`.

- **Include Clear Descriptions**: After the prefix, use kebab-case descriptions that explain what the branch accomplishes in human terms, not just ticket numbers.

- **Indicate Ownership When Helpful**: For long-running or experimental work, include the owner's identifier: `feature/jane/new-payment-flow`.

- **Show Relationships**: When branches build on each other, make relationships clear: `feature/auth-base`, `feature/auth-oauth`, `feature/auth-2fa`.

- **Keep Names Scannable**: Optimize for readability in Git tools and terminal output. Avoid excessive length while maintaining clarity.

- **Standardize Across Teams**: Ensure all team members use the same conventions to prevent surprise and confusion.

## Practical Implementation

1. **Establish Clear Prefix Conventions**: Define prefixes that match your workflow:

   ```bash
   # Standard prefixes with clear purposes
   feature/     # New functionality
   bugfix/      # Non-urgent bug fixes
   hotfix/      # Urgent production fixes
   release/     # Release preparation branches
   chore/       # Maintenance, refactoring, tooling
   experiment/  # Exploratory work that may be discarded
   docs/        # Documentation updates
   test/        # Test additions or fixes

   # Examples with descriptive names
   feature/user-profile-photos
   bugfix/incorrect-tax-calculation
   hotfix/payment-gateway-timeout
   release/v2.3.0
   chore/update-dependencies-q4
   experiment/websocket-notifications
   ```

2. **Create Branch Naming Templates**: Provide templates for common scenarios:

   ```bash
   # Feature branch with ticket reference
   feature/PROJ-123-shopping-cart-persistence

   # Bug fix with component indication
   bugfix/api-rate-limiting-off-by-one

   # Personal long-running feature
   feature/alice/redesign-navigation-menu

   # Hierarchical feature development
   feature/payments-base
   feature/payments-stripe-integration
   feature/payments-paypal-integration
   ```

3. **Implement Git Hooks for Validation**: Enforce naming conventions automatically:

   ```bash
   #!/bin/bash
   # .git/hooks/pre-push - Validate branch names

   branch=$(git rev-parse --abbrev-ref HEAD)
   valid_prefixes="^(feature|bugfix|hotfix|release|chore|experiment|docs|test)/"

   if [[ ! "$branch" =~ $valid_prefixes ]]; then
     echo "❌ Branch name '$branch' doesn't follow naming convention!"
     echo "📋 Valid prefixes: feature/, bugfix/, hotfix/, release/, chore/, experiment/, docs/, test/"
     echo "💡 Example: feature/add-user-notifications"
     exit 1
   fi

   # Check for good descriptive names (not just numbers)
   if [[ "$branch" =~ ^[a-z]+/[0-9]+$ ]]; then
     echo "⚠️  Branch name should be descriptive, not just a ticket number"
     echo "💡 Better: feature/PROJ-123-add-user-notifications"
     exit 1
   fi
   ```

4. **Provide Branch Creation Helpers**: Make it easy to create well-named branches:

   ```bash
   # git-feature - Helper for creating feature branches
   #!/bin/bash

   echo "🌿 Creating a new feature branch"
   read -p "Feature name (kebab-case): " feature_name
   read -p "Ticket number (optional): " ticket

   if [ -n "$ticket" ]; then
     branch_name="feature/${ticket}-${feature_name}"
   else
     branch_name="feature/${feature_name}"
   fi

   git checkout -b "$branch_name"
   echo "✅ Created branch: $branch_name"
   echo "📝 Remember to push with: git push -u origin HEAD"
   ```

5. **Document Examples and Anti-patterns**: Create a reference guide:

   ```markdown
   # Branch Naming Guide

   ## ✅ Good Examples
   - `feature/user-email-verification`
   - `bugfix/PROJ-456-cart-total-rounding-error`
   - `hotfix/disable-broken-payment-provider`
   - `release/v3.2.0-beta.1`
   - `chore/upgrade-react-to-v18`
   - `experiment/tom/machine-learning-recommendations`

   ## ❌ Anti-patterns to Avoid
   - `fix` - No context about what's being fixed
   - `JIRA-1234` - Ticket number without description
   - `johns-work` - Developer name without purpose
   - `temp` - Implies throwaway work without context
   - `new-feature` - Too vague
   - `final-final-v2` - Versioning in branch names
   ```

6. **Make Branch Purpose Visible**: Use Git aliases to enhance branch visibility:

   ```bash
   # ~/.gitconfig - Helpful branch viewing aliases
   [alias]
     # Show all branches with last commit info
     branches = for-each-ref --sort=-committerdate refs/heads/ \
       --format='%(HEAD) %(color:yellow)%(refname:short)%(color:reset) - \
       %(color:red)%(objectname:short)%(color:reset) - %(contents:subject) - \
       %(authorname) (%(color:green)%(committerdate:relative)%(color:reset))'

     # List branches by type
     features = "!git branch -a | grep 'feature/'"
     bugs = "!git branch -a | grep 'bugfix/'"
     releases = "!git branch -a | grep 'release/'"

     # Find stale branches
     stale = for-each-ref --format='%(refname:short) %(committerdate:relative)' \
       refs/heads | awk '$2 !~ /week|day|hour|minute/ {print $1}'
   ```

## Examples

```bash
# ❌ BAD: Cryptic branch name requiring investigation
temp-fix

# ✅ GOOD: Clear purpose and scope
bugfix/prevent-duplicate-order-submission
```

```bash
# ❌ BAD: Just a ticket number without context
PROJ-5847

# ✅ GOOD: Ticket number with descriptive name
feature/PROJ-5847-add-export-to-pdf
```

```bash
# ❌ BAD: Developer-centric naming
marias-branch-oct-23

# ✅ GOOD: Purpose-driven with optional ownership
experiment/maria/graphql-performance-testing
```

```bash
# ❌ BAD: Ambiguous versioning in branch name
feature-login-v2-final-final

# ✅ GOOD: Clear feature branch with scope
feature/login-social-media-integration
```

```bash
# ❌ BAD: No indication of relationship between branches
payment-1
payment-2
payment-new

# ✅ GOOD: Clear hierarchical relationship
feature/payment-system-base
feature/payment-system-stripe
feature/payment-system-paypal
```

## Related Bindings

- [human-readable-commit-history.md](human-readable-commit-history.md): Clear branch names complement readable commit messages, together creating a Git history that tells the complete story of your project's evolution.

- [version-control-workflows.md](version-control-workflows.md): Branch naming conventions are a key component of systematic version control workflows, enabling automated processes and clear collaboration patterns.

- [git-hooks-automation.md](git-hooks-automation.md): Git hooks can enforce branch naming conventions automatically, preventing non-compliant names from entering the repository and maintaining consistency.

- [code-review-excellence.md](code-review-excellence.md): Well-named branches make code review more efficient by immediately communicating the scope and purpose of changes, allowing reviewers to provide more targeted feedback.
