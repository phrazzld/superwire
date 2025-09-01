---
id: distributed-first
last_modified: '2025-06-24'
version: '0.2.0'
---
# Tenet: Distributed First

Design workflows and repository structures that embrace Git's distributed nature as a fundamental strength. Every clone is a complete repository with full history, enabling powerful workflows impossible in centralized systems.

## Core Belief

Git's distributed architecture isn't a feature—it's the foundation that enables everything else. Unlike centralized version control where the server holds the "true" repository and clients have mere working copies, Git treats every clone as a peer. This radical equality enables workflows that would be impossible or impractical in centralized systems: offline development, flexible backup strategies, experimental branches without server pollution, and decentralized collaboration patterns.

The distributed model shifts the complexity from the server to the protocol. Instead of a complex server managing locks, permissions, and state, Git uses a simple protocol for exchanging immutable objects between peers. This elegance enables remarkable scalability—the Linux kernel's development, with thousands of contributors and hundreds of thousands of commits, would be impossible with a centralized model.

But distributed version control requires distributed thinking. Workflows designed for centralized systems create friction when applied to Git. The developers who struggle with Git are often those trying to impose centralized patterns—treating one repository as "authoritative," requiring constant synchronization, or implementing complex permission schemes. When you embrace distribution, you gain flexibility, resilience, and performance.

Think of Git repositories like email—every client has a complete copy of their messages, can work offline, and synchronizes when connected. You wouldn't design an email workflow requiring constant server connection; don't design Git workflows that way either.

## Practical Guidelines

1. **Every Clone is a Backup**: Leverage distribution for resilience. With every developer having a complete copy, catastrophic data loss becomes nearly impossible. Design workflows that encourage regular fetching from multiple remotes, creating a naturally redundant backup network without centralized backup infrastructure.

2. **Embrace Offline Development**: Structure workflows to maximize offline productivity. Developers should be able to commit, branch, merge, and review history without network access. This means keeping documentation in the repository, using commit messages that provide full context, and avoiding dependencies on external services for core development tasks.

3. **Federation Over Centralization**: Instead of one "blessed" repository, consider federation patterns. Different teams can maintain their own authoritative repositories, exchanging changes through well-defined integration points. This reduces bottlenecks and enables teams to work at their own pace while maintaining compatibility.

4. **Local Operations for Performance**: Git's distributed model means most operations are local and therefore fast. Design workflows that leverage this—prefer local branches over remote branches, use local tags for personal bookmarks, and run intensive operations (like bisect or log analysis) locally rather than through web interfaces.

5. **Asynchronous Collaboration**: Distributed systems excel at asynchronous work. Structure your workflow around pull requests and email-style review rather than requiring synchronous coordination. This enables global collaboration across time zones and reduces blocking dependencies between developers.

6. **Multiple Remotes for Flexibility**: Don't limit yourself to a single remote. Configure multiple remotes for different purposes—upstream for the main project, origin for your fork, colleague remotes for direct collaboration. This flexibility is impossible in centralized systems but natural in Git's distributed model.

7. **Trust Through Cryptography**: In distributed systems, trust comes from cryptography, not access control. Use signed commits and tags to establish authenticity. This enables secure collaboration without complex permission systems—anyone can host a repository, but cryptographic signatures prove authorship and integrity.

## Warning Signs

- **Requiring constant network access** for basic development tasks. If developers can't work offline, you're not leveraging Git's distributed nature.

- **Single point of failure** architectures where one server's availability blocks all development. This recreates the centralized bottleneck Git was designed to eliminate.

- **Complex server-side hooks** that try to enforce workflow rules centrally. Distributed workflows should use client-side tools and social conventions, not server enforcement.

- **Avoiding local branches** in favor of server-side feature branches. This adds network latency to every operation and defeats Git's performance advantages.

- **Implementing file locking** or other pessimistic concurrency control. These centralized patterns create bottlenecks and prevent distributed collaboration.

- **Relying on server-side state** for build numbers, version tracking, or other metadata. Distributed systems should encode necessary state in the repository itself.

- **Creating "integration repositories"** that no one actually develops in. This adds complexity without leveraging distribution benefits.

- **Using Git as a deployment mechanism** by having production systems pull directly from repositories. This couples availability requirements and violates separation of concerns.

## Distributed Workflow Patterns

Understanding distributed workflows unlocks Git's potential:

- **Fork and Pull**: Each developer maintains their own complete repository. Changes flow through pull requests, enabling review without granting write access.

- **Lieutenants**: Hierarchical integration where subsystem maintainers collect changes and push to an integration manager. Used by Linux kernel development.

- **Peer to Peer**: Developers pull directly from each other's repositories without a central server. Enables collaboration during server outages.

- **Repository Sharding**: Large projects split across multiple repositories, linked through submodules or dependency management. Enables independent development velocity.

- **Offline First**: Development continues during network partitions. Synchronization happens when connectivity returns, without lost work.

## Related Tenets

- [Content-Addressable History](content-addressable-history.md): The content-addressable model enables distribution by making synchronization a simple matter of exchanging missing objects.

- [Automation](automation.md): Distributed workflows enable powerful automation because every clone has complete information needed for builds, tests, and analysis.

- [Adaptability and Reversibility](adaptability-and-reversibility.md): Distributed systems are inherently more adaptable because changes can be tested locally before sharing.

- [Orthogonality](orthogonality.md): Distributed development enables truly independent work on separate features without coordination overhead.
