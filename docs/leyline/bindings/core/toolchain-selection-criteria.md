---
derived_from: simplicity
enforced_by: architecture review & decision documentation
id: toolchain-selection-criteria
last_modified: '2025-06-14'
version: '0.2.0'
---
# Binding: Evaluate Tools Through Total Cost of Ownership

Choose development tools and technologies through systematic evaluation of their total cost across the entire lifecycle, from initial adoption through eventual migration. Consider not just the tool's features, but the ecosystem, team expertise, maintenance burden, and future flexibility it provides or constrains.

## Rationale

This binding implements our simplicity and maintainability tenets by establishing a framework for toolchain decisions that prevents the accumulation of complexity through ad-hoc tool adoption. When teams select tools based on features alone or current trends, they often discover hidden costs months or years later: difficult migrations, scarce expertise, poor documentation, or abandoned projects that leave critical infrastructure unsupported.

Think of tool selection like choosing transportation for a long journey. A sports car might seem appealing for its speed and features, but if your journey involves rough terrain, carrying cargo, or traveling with a team, a more practical vehicle serves you better. Similarly, the "best" technical tool is rarely the one with the most features or highest performance—it's the one that best fits your team's capabilities, project requirements, and long-term maintenance reality.

This binding also supports our adaptability and reversibility tenet by requiring explicit consideration of migration paths. No tool choice is permanent, and technologies that make it difficult or expensive to migrate away effectively lock you into decisions made with incomplete information. By evaluating exit strategies upfront, you maintain the flexibility to evolve your toolchain as your needs change, rather than being trapped by past decisions.

## Rule Definition

This binding establishes a systematic approach to tool evaluation and selection:

- **Total Cost Analysis**: Before adopting any tool or technology, you must evaluate:

  - Initial adoption cost (learning curve, training needs, setup complexity)
  - Ongoing maintenance cost (updates, security patches, breaking changes)
  - Expertise availability (hiring market, documentation quality, community size)
  - Integration complexity (compatibility with existing tools, API stability)
  - Migration difficulty (data portability, vendor lock-in, switching costs)

- **Team Capability Assessment**: Consider your team's context:

  - Current expertise and knowledge gaps
  - Available time for learning and training
  - Size of team that needs to use the tool
  - Geographical distribution and timezone considerations
  - Historical success with similar technologies

- **Ecosystem Health Evaluation**: Examine the tool's broader context:

  - Community size and activity levels
  - Frequency and quality of updates
  - Commercial support availability
  - Third-party integration ecosystem
  - Long-term viability indicators

- **Documentation Requirements**: Verify adequate documentation exists:

  - Getting started guides for your use case
  - Comprehensive API/configuration reference
  - Troubleshooting guides and known issues
  - Migration guides from/to competing tools
  - Real-world examples and case studies

## Implementation

Apply these evaluation criteria systematically:

1. **Create Evaluation Matrix**: For significant tool decisions, create a formal comparison matrix scoring each option across all criteria. Weight criteria based on your project's specific needs.

2. **Pilot Before Committing**: Run small-scale pilots or proofs of concept before full adoption. Measure actual complexity and team productivity, not theoretical benefits.

3. **Document Decisions**: Record not just what you chose, but why. Include rejected alternatives and the specific criteria that drove your decision.

4. **Set Review Triggers**: Establish conditions that trigger re-evaluation: team size changes, major version releases, security incidents, or maintenance burden exceeding thresholds.

5. **Budget for Migration**: Always maintain enough flexibility in architecture and budget to migrate away if needed. Avoid deep integration patterns that create lock-in.

## Anti-patterns

- **Resume-Driven Development**: Choosing tools because they look good on resumes rather than solving actual problems
- **Hype Cycle Following**: Adopting tools at peak hype without waiting for ecosystem maturity
- **Feature List Shopping**: Selecting based on feature comparisons without considering total cost
- **Ignoring Team Reality**: Choosing tools that require expertise your team doesn't have and can't readily acquire
- **Sunk Cost Fallacy**: Continuing with poor tool choices because of past investment rather than switching

## Enforcement

This binding should be enforced through:

- **Architecture Review Process**: Major tool decisions require documented evaluation against these criteria
- **Decision Records**: ADRs (Architecture Decision Records) must include total cost analysis
- **Regular Audits**: Quarterly reviews of tool effectiveness and maintenance burden
- **Migration Readiness Tests**: Annual exercises to verify you can migrate away from critical tools

## Exceptions

This binding has relaxed requirements in these contexts:

- **Prototypes and Experiments**: Rapid exploration may justify informal evaluation
- **Industry Standards**: Sometimes tool choice is effectively mandated (e.g., Xcode for iOS)
- **Emergency Fixes**: Crisis response may require immediate solutions with later review
- **Trivial Tools**: Development utilities with minimal impact may use simplified evaluation

Even in exceptions, document the decision and schedule future review.

## Related Bindings

- [dependency-management](../../docs/bindings/categories/python/dependency-management.md): Shares similar evaluation principles for libraries and frameworks
- [continuous-learning-investment](../../docs/bindings/core/continuous-learning-investment.md): Team expertise development supports tool adoption
- [document-decisions](../../tenets/document-decisions.md): Formal documentation of tool choices
- [yagni-pattern-enforcement](../../docs/bindings/core/yagni-pattern-enforcement.md): Avoid adopting tools for imagined future needs
