---
id: human-readable-commit-history
last_modified: '2025-06-24'
version: '0.2.0'
derived_from: joyful-version-control
enforced_by: 'commit message templates, git hooks, PR review guidelines, team conventions'
---

# Binding: Craft Human-Readable Commit Histories

Write commit messages that tell a story, making Git history a pleasure to read rather than a chore to decipher. Every commit should clearly communicate its purpose, context, and impact in language that respects future readers' time and cognitive load.

## Rationale

This binding directly implements our joyful version control tenet by transforming Git history from a cryptic log into a narrative that developers actually want to read. When commit messages are clear, contextual, and human-focused, investigating bugs becomes detective work rather than archaeology, and understanding system evolution becomes learning rather than frustration.

Think of your Git history as a novel about your codebase. Each commit is a paragraph that moves the story forward. Just as a well-written novel draws readers in and helps them understand characters and plot, a well-crafted commit history helps developers understand how and why the code evolved. Bad commit messages are like random words scattered on a page—they might contain information, but they fail to communicate meaning.

The cost of poor commit messages compounds over time. A commit message that takes 30 extra seconds to write well can save hours of investigation months later when someone (possibly you) needs to understand why a change was made. More importantly, readable commit history builds team knowledge and confidence. When developers can easily understand the reasoning behind past decisions, they make better decisions going forward and feel more connected to the codebase's evolution.

## Rule Definition

Human-readable commit histories follow these principles:

- **Start with Why, Not What**: The diff shows what changed; the commit message should explain why it changed. Focus on intentions, problems solved, and decisions made rather than listing modified files.

- **Write for Your Future Self**: Assume the reader has no context about what you're working on right now. Include enough background to understand the change without needing to remember current project state.

- **Use Clear, Active Language**: Write in present tense imperative mood ("Fix memory leak" not "Fixed memory leak" or "Fixes memory leak"). Be specific about what the commit accomplishes.

- **Include Relevant Context**: Reference issue numbers, link to discussions, mention key decision factors. Future investigators should be able to reconstruct the full picture from the commit message.

- **Format for Readability**: Use short summary lines (50-72 characters), blank lines for separation, and bullet points for multiple changes. Make messages scannable and digestible.

- **Tell the Truth**: Be honest about workarounds, uncertainties, or technical debt. Future developers need accurate information to make good decisions, not rosy pictures.

## Practical Implementation

1. **Create Commit Message Templates**: Establish templates that prompt for necessary information while remaining flexible enough for different types of changes:

   ```bash
   # .gitmessage.txt - Team-wide commit template
   # <type>: <subject> (50-72 chars)
   # |<---- Using imperative mood---->|

   # Why is this change necessary?
   # |<---- Try to limit each line to 72 characters ---->|

   # How does it address the issue?

   # What side effects does this change have?

   # References: #issue-number, URL-to-discussion
   ```

   Configure Git to use this template:
   ```bash
   git config --global commit.template ~/.gitmessage.txt
   ```

2. **Establish Type Conventions**: Use prefixes that immediately communicate the nature of changes, but keep them human-friendly:

   ```bash
   feat: Add user authentication via OAuth
   fix: Prevent memory leak in image processing
   docs: Clarify deployment steps for AWS
   refactor: Extract validation logic to separate module
   test: Add integration tests for payment flow
   perf: Optimize database queries for dashboard
   ```

3. **Write Descriptive Body Paragraphs**: Expand on the why and how in the commit body:

   ```
   fix: Prevent race condition in job queue processor

   The job queue was occasionally processing the same job twice when
   multiple workers started simultaneously. This happened because we
   were checking job status and updating it in separate operations.

   This commit introduces atomic status updates using database
   transactions, ensuring only one worker can claim a job. I've also
   added logging to help diagnose any future queue issues.

   The fix follows the pattern established in our payment processor,
   which faced similar concurrent access challenges.

   Fixes #1234
   See discussion: https://github.com/team/app/discussions/5678
   ```

4. **Make Commit Histories Scannable**: Structure commits so developers can quickly find what they're looking for:

   ```bash
   # Group related changes
   git log --oneline --grep="auth"  # Find all auth-related commits

   # Use consistent terminology
   "user authentication" not sometimes "auth" and sometimes "login"

   # Include component names
   "fix(api): Validate input for user endpoints"
   "feat(frontend): Add loading states to forms"
   ```

5. **Document Decision Points**: When making architectural or approach decisions, capture the reasoning:

   ```
   refactor: Switch from callbacks to promises in data layer

   After team discussion, we decided to modernize our async patterns
   for better error handling and readability. Promises allow us to:

   - Chain operations more clearly
   - Handle errors in one place
   - Avoid callback hell in complex flows

   This is the first step in eventually moving to async/await once
   we upgrade Node.js. I started with the data layer as it's well-
   tested and isolated from other components.

   Part of modernization effort discussed in RFC-042.
   ```

6. **Review Commit Messages in PRs**: Make commit message quality part of your review process:

   ```markdown
   ## PR Review Checklist
   - [ ] Commit messages explain why, not just what
   - [ ] Each commit represents one logical change
   - [ ] Messages would make sense to someone joining the team
   - [ ] Technical decisions are documented
   - [ ] References to issues/discussions are included
   ```

## Examples

```bash
# ❌ BAD: Cryptic message that requires code inspection to understand
fix bug

# ✅ GOOD: Clear description of what was fixed and why
fix: Prevent duplicate email sends on network retry

The email service wasn't tracking sent messages, causing duplicates
when network requests were retried. Added idempotency keys to ensure
each email is sent only once, even if the request is retried.
```

```bash
# ❌ BAD: Lists files changed without explaining purpose
Update user.js, api.js, and tests

# ✅ GOOD: Explains the feature and its impact
feat: Add email verification for new user registration

New users must now verify their email before accessing the app.
This reduces spam accounts and ensures we have valid contact info.

- Added verification token generation to user creation
- Created email template for verification links
- Added API endpoint to handle verification callbacks
- Updated onboarding flow to show verification prompt

Implements requirement from security audit (SEC-2024-001)
```

```bash
# ❌ BAD: Technical jargon without context
Refactor AbstractFactoryBuilder pattern implementation

# ✅ GOOD: Explains the reasoning and benefits
refactor: Simplify object creation to reduce complexity

Our factory pattern had grown too complex with 5 levels of
abstraction for what's essentially creating API clients. This
change flattens the hierarchy to just:
- ClientBuilder (was AbstractFactoryBuilder + FactoryBuilder)
- Individual clients (unchanged)

This reduces code by ~200 lines and makes the flow much easier
to follow. New developers should now understand client creation
without needing to trace through multiple abstraction layers.

Addresses feedback from last week's complexity review.
```

```bash
# ❌ BAD: Hides uncertainty and technical debt
Fix performance issue

# ✅ GOOD: Honest about tradeoffs and future work needed
perf: Add caching to reduce API calls (temporary fix)

Dashboard was making 50+ API calls on each page load, causing
3-5 second delays. Added 5-minute cache for user preferences
and team data which reduces this to 3-4 calls.

This is a bandaid - the real fix is to redesign the API to
support bulk fetching. But this improves user experience
immediately while we plan the proper solution.

Note: Cache invalidation is basic. If users update preferences,
they may need to wait up to 5 minutes to see changes on dashboard.

Related to performance issues: #890, #923, #1001
Long-term fix tracked in: #1205
```

## Related Bindings

- [require-conventional-commits.md](require-conventional-commits.md): While conventional commits provide structure, human-readable history focuses on the content and narrative quality within that structure. Together they create commit messages that are both machine-parseable and human-friendly.

- [code-review-excellence.md](code-review-excellence.md): Reviewing commit messages during code review ensures history quality matches code quality. Both practices treat future developers as valued users who deserve clear communication.

- [document-decisions.md](document-decisions.md): Commit messages are a form of decision documentation that captures the immediate context and reasoning for changes. Both bindings ensure knowledge isn't lost when developers leave or forget details.

- [empathize-with-your-user.md](empathize-with-your-user.md): Future developers reading Git history are users of your commit messages. Writing readable history is an act of empathy that respects their time and cognitive load.
