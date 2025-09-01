---
id: distributed-resilience
last_modified: '2025-06-24'
version: '0.2.0'
---
# Tenet: Design for Distributed Resilience

Build systems that embrace the reality of distributed development—where every developer works independently, networks fail, and servers go down. Create workflows that remain productive even when centralized resources are unavailable, enabling developers to continue working effectively regardless of external dependencies.

## Core Belief

Git was built on a fundamental insight: centralized systems create single points of failure that cripple developer productivity. When your ability to work depends on a remote server being available, you've created an artificial bottleneck that has nothing to do with the actual problem you're trying to solve.

This isn't just about version control—it's a philosophy that should permeate your entire development approach. Every time you introduce a hard dependency on a remote resource, you're betting that resource will be available exactly when developers need it. That's a bad bet. Networks fail. Servers crash. APIs have outages. The question isn't whether these failures will happen, but when.

Distributed resilience means designing systems that degrade gracefully rather than fail catastrophically. When GitHub is down, can your team still commit code, run tests, and review changes? When your package registry is unreachable, can developers still build the project? When the CI server is overloaded, can you still validate changes locally?

This philosophy extends beyond tools to workflows. Processes that require synchronous coordination between team members create human bottlenecks. Reviews that block all progress, deployments that require specific individuals, or workflows that demand everyone be online simultaneously—these are all failures of distributed thinking.

The goal isn't to eliminate all dependencies—that's impossible. The goal is to ensure that when dependencies fail, they inconvenience rather than incapacitate. Every workflow should have a local fallback. Every process should function asynchronously. Every tool should work offline first, with network features as enhancements rather than requirements.

## Practical Guidelines

1. **Design for Offline-First Workflows**: Ensure developers can perform core tasks without network access. This includes writing code, running tests, reviewing changes, and even simulating deployments. Ask yourself: "What happens when the network is down?" If the answer is "nothing works," you've failed to design for resilience.

2. **Minimize Synchronous Coordination**: Structure workflows to work asynchronously by default. Code reviews shouldn't block progress—developers should be able to continue on other tasks. Deployments shouldn't require the whole team to be present. Decisions should be documented in discoverable places rather than made in ephemeral meetings.

3. **Cache External Dependencies Aggressively**: Every external dependency should be cached locally—packages, container images, documentation, even API responses where appropriate. The first fetch might require network access, but subsequent uses should work offline. Consider: "How can we make the second build work without internet?"

4. **Provide Local Alternatives**: For every networked service, provide a local alternative. If you use a cloud-based testing service, ensure tests can run locally. If you have a remote build cache, make sure builds work without it. The local version might be slower or less featureful, but it must exist.

5. **Document Failure Modes**: Make failure behavior explicit and predictable. When a service is unavailable, tools should clearly communicate what functionality is degraded and what alternatives exist. Error messages should guide users toward productive workarounds rather than leaving them stuck.

## Warning Signs

- **"We can't work because [service] is down"** indicates a critical resilience failure. No single service outage should halt development. If developers are idle because GitHub, npm, or your CI service is unavailable, you've created unnecessary dependencies.

- **Workflows that require real-time coordination** between multiple people. If your process frequently includes phrases like "we need everyone online for this" or "wait for X to be available," you're creating human bottlenecks that don't scale.

- **Build or test processes that always require network access**, even for unchanged dependencies. After the first successful run, subsequent runs should work offline. Constant network requirements indicate missing caches or poor dependency management.

- **Error messages that offer no alternatives** when services are unavailable. Messages like "Cannot connect to server" without guidance on how to proceed indicate a failure to design for resilience. Every error should suggest a path forward.

- **Development environments that break when switching networks** or working from different locations. If developers need to reconfigure tools when working from home, a coffee shop, or on a plane, the tools are too dependent on network specifics.

- **Processes that fail completely rather than degrade gracefully**. If a missing service causes a total failure rather than reduced functionality, the system lacks resilience. For example, if code quality checks fail completely when a linting service is unavailable, rather than falling back to local linting.

## Related Tenets

- [Automation](automation.md): Distributed resilience requires automation that works regardless of network availability. Local automation provides the foundation for workflows that don't depend on remote services, making both tenets mutually reinforcing.

- [Simplicity](simplicity.md): Simple systems are inherently more resilient than complex ones. Fewer moving parts mean fewer failure points. Distributed resilience encourages simple, composable tools over complex, integrated services.

- [Adaptability and Reversibility](adaptability-and-reversibility.md): Resilient systems must adapt to changing conditions—like network outages or service failures. The ability to reverse decisions and try alternatives is crucial when primary approaches fail.

- [Explicit over Implicit](explicit-over-implicit.md): Distributed systems require explicit communication of state, dependencies, and failure modes. Implicit assumptions about availability or connectivity lead to fragile systems that fail mysteriously.
