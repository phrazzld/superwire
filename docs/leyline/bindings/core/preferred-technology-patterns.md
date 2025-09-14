---
derived_from: simplicity
enforced_by: architecture review & code review
id: preferred-technology-patterns
last_modified: '2025-06-14'
version: '0.2.0'
---
# Binding: Choose Boring Technology by Default

Prefer proven, stable, well-understood technologies over cutting-edge innovations unless there's a compelling, measurable need for the newer option. Innovation should happen in your product's value proposition, not in the infrastructure and tools that support it.

## Rationale

This binding implements our simplicity tenet by recognizing that every piece of novel technology introduces complexity that extends far beyond its technical implementation. New tools and frameworks carry hidden costs: sparse documentation, undiscovered bugs, limited community knowledge, unstable APIs, and the cognitive overhead of being early adopters. These costs compound across your team and timeline, often overwhelming any theoretical benefits.

Consider technology choices like building materials. While exotic materials might offer unique properties, most successful buildings use proven materials like steel, concrete, and wood. These "boring" materials have known properties, established construction techniques, abundant expertise, and predictable failure modes. Similarly, boring technology has been battle-tested by thousands of teams, has solutions for common problems, and won't surprise you with fundamental issues at critical moments.

This binding also supports our build-trust-through-collaboration tenet by choosing technologies that maximize shared understanding. When you use widely-adopted tools, new team members can contribute quickly, contractors and consultants are readily available, and knowledge transfer happens naturally. Exotic technology choices create knowledge silos and increase your bus factor, making your team more fragile and less collaborative.

## Rule Definition

This binding establishes preferences for technology selection:

- **Stability Over Features**: When evaluating options, weight stability and maturity more heavily than feature sets or performance metrics. A tool that does 80% of what you need reliably is usually better than one promising 120% but delivering unpredictably.

- **Community Over Capability**: Prefer technologies with large, active communities over technically superior solutions with small user bases. Community size correlates with documentation quality, third-party integrations, hiring pools, and long-term viability.

- **Standards Over Innovation**: Choose standardized approaches over proprietary or novel solutions. Standards represent collective wisdom and provide portability, while innovations often reflect individual opinions that may not age well.

- **Proven Patterns Over Clever Solutions**: Implement well-known patterns even if you can devise "better" approaches. Proven patterns are proven because they handle edge cases you haven't considered yet.

- **Innovation Budget**: If you must adopt bleeding-edge technology, treat it as a limited resource. Most projects can sustain one or two innovative technology choices; beyond that, the complexity compounds dangerously.

## Implementation

Apply boring technology principles through:

1. **Default to Mainstream**: Start with the most widely-used solution in your domain. Only deviate when you can articulate specific, measurable inadequacies.

2. **Wait for Maturity**: Let others be early adopters. Wait for version 2.0, comprehensive documentation, and community patterns before adopting new technologies.

3. **Measure Innovation**: Track where you're choosing novel solutions. If more than 20% of your stack is cutting-edge, you're likely over-innovating.

4. **Value Boring Skills**: Celebrate deep expertise in established technologies rather than constantly chasing new frameworks.

5. **Document Exceptions**: When you do choose newer technology, document exactly why the boring option was insufficient.

## Anti-patterns

- **Not-Invented-Here Syndrome**: Building custom solutions for problems that established tools solve well
- **Early Adopter Pride**: Choosing technologies because they're new and exciting rather than proven and reliable
- **Theoretical Benefits**: Selecting based on potential advantages rather than demonstrated needs
- **Conference-Driven Development**: Adopting technologies because they're featured in talks and blog posts
- **Perfectionism Over Pragmatism**: Rejecting proven solutions because they're not theoretically optimal

## Enforcement

This binding should be enforced through:

- **Technology Radar**: Maintain an explicit list of approved, evaluated, and experimental technologies
- **Innovation Budget Tracking**: Monitor how many unproven technologies are in use
- **Architecture Review**: Require justification for any non-mainstream technology choices
- **Hiring Reality Check**: Verify you can actually hire people with required expertise

## Exceptions

Valid reasons to choose newer technology:

- **Specific Technical Requirements**: When boring options genuinely cannot meet critical requirements
- **Competitive Advantage**: When the innovation directly enables unique product value
- **Technical Debt**: When replacing truly problematic legacy systems
- **Team Expertise**: When your team has deep experience with the newer option
- **Industry Shifts**: When the "boring" option is becoming obsolete

Even with exceptions, limit the scope and have migration plans.

## Related Bindings

- [toolchain-selection-criteria](../../docs/bindings/core/toolchain-selection-criteria.md): Provides the evaluation framework for comparing options
- [yagni-pattern-enforcement](../../docs/bindings/core/yagni-pattern-enforcement.md): Prevents adopting technology for imagined benefits
- [continuous-learning-investment](../../docs/bindings/core/continuous-learning-investment.md): Balances stability preference with staying current
- [dependency-management](../../docs/bindings/categories/python/dependency-management.md): Similar principles for library selection
