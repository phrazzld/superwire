---
id: product-value-first
last_modified: '2025-06-09'
version: '0.2.0'
---
# Tenet: Product Value First

Every line of code must justify its existence through demonstrable user value. Code is a liability whose sole purpose is to create compelling, useful, delightful experiences that meaningfully improve people's lives.

## Core Belief

Code is not an end in itself—it's a means to deliver value to users. When you write code, you're not just creating instructions for computers; you're making an investment that must pay dividends in user satisfaction, business outcomes, or meaningful problem-solving. This perspective fundamentally changes how you approach every technical decision, shifting focus from engineering elegance to user impact.

Think of code like financial debt: every line you write creates a maintenance obligation that someone will have to service indefinitely. Just as you wouldn't take on debt without a clear return on investment, you shouldn't write code without a clear value proposition. The interest on this "code debt" compounds over time through maintenance costs, debugging efforts, refactoring needs, and the cognitive overhead of understanding complex systems. The only way this debt pays for itself is through the value it delivers to users.

This principle doesn't diminish the importance of quality engineering. Rather, it provides the lens through which quality should be evaluated. Infrastructure work, refactoring, and technical improvements absolutely create value—but that value flows through enhanced user experiences, faster feature delivery, improved reliability, or reduced costs that ultimately benefit users. The key is making this value chain explicit rather than assuming that technical excellence automatically translates to user benefit.

When you consistently prioritize user value, you develop better judgment about which technical investments are worthwhile. You become more discerning about complexity, more focused on solving real problems, and more effective at delivering software that actually matters to the people who use it. This user-centric approach naturally leads to simpler, more maintainable code because unnecessary complexity doesn't serve users—it only serves abstract notions of technical sophistication.

## Practical Guidelines

1. **Evaluate Every Feature Against User Outcomes**: Before implementing any functionality, establish clear connections between the technical work and user benefits. Ask yourself: "How will this specific change improve the user experience in measurable ways?" Avoid building features because they're technically interesting or because they follow industry best practices. Instead, focus on changes that solve real user problems, remove friction from user workflows, or enable new valuable capabilities. Document these connections explicitly so that future developers understand not just what the code does, but why it exists.

2. **Distinguish Infrastructure Value from Engineering Vanity**: Infrastructure work and technical improvements often provide genuine user value through improved performance, reliability, or development velocity that enables faster feature delivery. However, they can also become elaborate expressions of engineering preference that don't meaningfully benefit users. Ask yourself: "Will this technical improvement translate into better user experiences within a reasonable timeframe?" Good infrastructure work should have a clear path to user value, whether through faster response times, reduced downtime, easier feature development, or lower operational costs that enable better pricing.

3. **Prioritize User-Facing Value Over Internal Technical Preferences**: When faced with competing technical approaches, choose the option that most directly serves user needs rather than the one that showcases technical sophistication. Ask yourself: "Which approach gets valuable functionality to users faster while maintaining acceptable quality?" This might mean using proven, simple technologies instead of cutting-edge ones, accepting some technical debt in non-critical areas to focus on user-critical functionality, or choosing approaches that enable rapid iteration based on user feedback rather than theoretical optimization.

4. **Measure Success Through User Lens, Not Technical Metrics**: Define success criteria in terms of user outcomes rather than purely technical achievements. Ask yourself: "How will we know this work succeeded from the user's perspective?" Instead of measuring lines of code, test coverage percentages, or performance benchmarks in isolation, focus on user satisfaction, task completion rates, reduced support tickets, faster workflows, or other metrics that directly reflect user value. Technical metrics should support these user-focused goals, not replace them.

5. **Defer Technical Work Without Clear Value Proposition**: When technical improvements don't have obvious connections to user value, explicitly defer them until that connection becomes clear. Ask yourself: "What would need to be true for this technical work to become a user priority?" This doesn't mean never doing technical work—it means being honest about prioritization and ensuring that user-valuable work takes precedence. Maintain a clear backlog of deferred technical tasks and revisit them when user needs make them relevant.

6. **Question Every Layer of Complexity for Its User Contribution**: Regularly audit your codebase for complexity that doesn't directly serve users. Ask yourself: "If I removed this abstraction, framework, or optimization, would users notice?" Complex architectures, elaborate patterns, and sophisticated optimizations should all have clear stories about how they improve user experiences. When you can't articulate that story convincingly, the complexity is likely serving engineering preferences rather than user needs and should be simplified or removed.

## Warning Signs

- **Building elaborate systems for simple problems** without evidence that the complexity serves user needs. This often manifests as over-engineered architectures, excessive abstraction layers, or frameworks that solve theoretical problems rather than actual user pain points. When the engineering effort far exceeds the problem complexity, it's usually a sign that technical preferences are driving decisions rather than user value.

- **Prioritizing technical elegance over user needs** when making implementation choices. This shows up as choosing more sophisticated solutions because they're intellectually satisfying, spending excessive time on code aesthetics while user-reported bugs remain unfixed, or implementing patterns because they're considered "best practices" without regard for whether they serve the specific user context.

- **Extensive refactoring without user-visible improvements** or clear development velocity benefits. While technical debt remediation can provide value, refactoring should either enable better user experiences or significantly improve development speed. Refactoring that's driven purely by aesthetic preferences or abstract notions of code quality without measurable benefits often indicates misplaced priorities.

- **Complex architectures without demonstrated scale requirements** from actual user load or growth patterns. Building for theoretical scale without evidence from real usage patterns often creates unnecessary complexity that slows development and creates maintenance overhead without providing user value. Architecture should evolve with actual user needs rather than anticipating imaginary future requirements.

- **Technical decisions driven by resume building rather than user value**. This appears as choosing technologies because they're trendy or interesting rather than because they best serve user needs, over-engineering solutions to demonstrate technical skill, or pursuing complex implementations to gain experience with advanced techniques when simpler approaches would better serve users.

- **Bikeshedding on technical details while ignoring user feedback**. When teams spend more time debating code formatting, architectural patterns, or technology choices than they do analyzing user behavior, addressing user-reported issues, or validating that features actually solve user problems, priorities have become inverted.

- **Justifying work with "best practices" rather than user outcomes**. While established practices often provide value, blindly following them without considering user context can lead to inappropriate solutions. When the primary justification for technical work is adherence to industry standards rather than demonstrable user benefit, it's often a sign that engineering considerations have displaced user focus.

## Related Tenets

- [Simplicity](simplicity.md): Product value focus naturally leads to simpler solutions because unnecessary complexity doesn't serve users. When you consistently ask "How does this complexity benefit users?", you eliminate technical sophistication that exists purely for its own sake. Simplicity supports product value by ensuring that engineering effort goes toward user-beneficial outcomes rather than abstract technical pursuits.

- [Maintainability](maintainability.md): Code that serves clear user purposes is inherently more maintainable because its value proposition provides context for future changes. When every piece of code has a clear connection to user value, maintainers can make better decisions about modifications, prioritization, and trade-offs. Maintainable code also enables faster delivery of user value by reducing the friction of making changes.

- [Testability](testability.md): User-focused code tends to be more testable because it has clear, observable behaviors that matter to real users. When you design around user outcomes, you naturally create interfaces and interactions that can be verified against user expectations. Testing user-valuable functionality provides better confidence in the system's ability to deliver on its value proposition than testing purely technical abstractions.
