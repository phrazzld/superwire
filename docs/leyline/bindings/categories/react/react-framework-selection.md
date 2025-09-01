---
id: react-framework-selection
last_modified: '2025-01-10'
version: '0.2.0'
derived_from: simplicity
enforced_by: 'Architecture reviews, Project setup guidelines, Team decision records'
---

# Binding: React Meta-Framework Selection

Choose React meta-frameworks based on measurable project characteristics: Next.js for content-heavy sites requiring flexibility and hybrid rendering, Remix for data-driven applications prioritizing web standards and simplified server-first architecture. Use specific decision criteria to eliminate ambiguity and prevent framework selection paralysis.

## Rationale

This binding implements our simplicity tenet by eliminating the decision paralysis that comes from choosing between competing React meta-frameworks. Just as choosing a single programming language for a project reduces cognitive overhead, standardizing framework selection criteria reduces the time teams spend debating architectural choices and accelerates project delivery.

Framework selection affects every aspect of development: data fetching patterns, routing architecture, deployment strategies, and performance characteristics. When teams lack clear selection criteria, they often make choices based on familiarity, latest trends, or incomplete information. This leads to architectural mismatches where the chosen framework doesn't align with project requirements, resulting in technical debt and reduced developer velocity.

The choice between Next.js and Remix represents a fundamental architectural decision: Next.js optimizes for flexibility and incremental adoption with a rich ecosystem, while Remix optimizes for web standards and simplified data patterns. Rather than treating these as competing options, we define clear use cases where each framework excels, enabling teams to make confident decisions based on measurable project characteristics.

## Rule Definition

This rule applies to all new React projects requiring server-side rendering, static site generation, or full-stack capabilities. The rule specifically requires:

**Decision Matrix Based on Measurable Criteria:**
- **Project Scale**: Route count, team size, deployment complexity
- **Content Strategy**: Update frequency, authoring workflow, SEO requirements
- **Data Patterns**: API complexity, mutation frequency, real-time needs
- **Performance Requirements**: Core Web Vitals targets, edge computing needs
- **Team Context**: React experience, infrastructure preferences

**Framework Selection Criteria:**

**Choose Next.js when:**
- **Content-heavy sites**: > 50 routes, complex content hierarchies, CMS integration
- **Marketing/e-commerce**: SEO-critical, high traffic, conversion optimization
- **Hybrid rendering**: Mixed SSG/SSR/CSR requirements within single application
- **Large teams**: > 5 developers, need for incremental adoption
- **Flexible deployment**: Multi-environment, CDN optimization, A/B testing

**Choose Remix when:**
- **Data-driven applications**: Complex forms, frequent mutations, real-time updates
- **Web standards focus**: Progressive enhancement, accessibility-first
- **Simplified architecture**: Single mental model, co-located data/UI
- **Edge-first deployment**: Global distribution, low latency requirements
- **Small to medium teams**: < 5 developers, unified development approach

**Selection Process:**
1. **Document project characteristics** using the decision matrix
2. **Score against selection criteria** with objective measurements
3. **Record decision rationale** in architecture decision record
4. **Validate against team capabilities** and infrastructure constraints

## Practical Implementation

**Decision Matrix Template:**
```typescript
interface ProjectCharacteristics {
  // Scale Metrics
  estimatedRoutes: number;           // < 50 (Remix) vs > 50 (Next.js)
  teamSize: number;                  // < 5 (Remix) vs > 5 (Next.js)

  // Content Strategy
  contentUpdateFrequency: 'static' | 'dynamic' | 'real-time';
  seoRequirements: 'critical' | 'important' | 'optional';

  // Data Patterns
  apiComplexity: 'simple' | 'moderate' | 'complex';
  mutationFrequency: 'low' | 'medium' | 'high';
  realTimeNeeds: boolean;

  // Performance
  coreWebVitalsTarget: 'strict' | 'moderate' | 'relaxed';
  edgeDeployment: boolean;

  // Team Context
  reactExperience: 'beginner' | 'intermediate' | 'advanced';
  infrastructurePreference: 'traditional' | 'modern' | 'edge';
}

// Example scoring function
function selectFramework(characteristics: ProjectCharacteristics): 'next' | 'remix' {
  let nextScore = 0;
  let remixScore = 0;

  // Route complexity
  if (characteristics.estimatedRoutes > 50) nextScore += 2;
  else remixScore += 1;

  // Content strategy
  if (characteristics.seoRequirements === 'critical') nextScore += 2;
  if (characteristics.contentUpdateFrequency === 'real-time') remixScore += 2;

  // Data patterns
  if (characteristics.mutationFrequency === 'high') remixScore += 3;
  if (characteristics.apiComplexity === 'complex') nextScore += 1;

  // Performance
  if (characteristics.edgeDeployment) remixScore += 2;
  if (characteristics.coreWebVitalsTarget === 'strict') remixScore += 1;

  // Team context
  if (characteristics.teamSize > 5) nextScore += 1;
  if (characteristics.reactExperience === 'beginner') remixScore += 1;

  return nextScore > remixScore ? 'next' : 'remix';
}
```

**Architecture Decision Record Template:**
```markdown
# ADR: React Meta-Framework Selection for [Project Name]

## Decision
Selected [Next.js/Remix] for [Project Name] based on project characteristics analysis.

## Context
- **Routes**: [number] estimated routes
- **Team**: [number] developers with [experience level] React experience
- **Content**: [strategy] with [frequency] updates
- **Data**: [complexity] API patterns with [frequency] mutations
- **Performance**: [requirements] Core Web Vitals targets

## Rationale
[Framework] scores [X] vs [Y] based on:
- [Criterion 1]: [explanation]
- [Criterion 2]: [explanation]
- [Criterion 3]: [explanation]

## Consequences
- **Development velocity**: [impact]
- **Performance characteristics**: [expectations]
- **Team learning curve**: [assessment]
- **Deployment strategy**: [approach]
```

## Examples

```typescript
// ❌ BAD: Framework selection without criteria
"Let's use Next.js because it's popular"
"Remix looks cool, let's try it"
"We used React before, so Next.js makes sense"

// ✅ GOOD: Evidence-based framework selection
const projectCharacteristics: ProjectCharacteristics = {
  estimatedRoutes: 12,
  teamSize: 3,
  contentUpdateFrequency: 'real-time',
  seoRequirements: 'important',
  apiComplexity: 'moderate',
  mutationFrequency: 'high',
  realTimeNeeds: true,
  coreWebVitalsTarget: 'strict',
  edgeDeployment: true,
  reactExperience: 'intermediate',
  infrastructurePreference: 'edge'
};

const selectedFramework = selectFramework(projectCharacteristics);
// Result: 'remix' - optimized for real-time, high-mutation, edge-deployed app
```

```typescript
// ❌ BAD: Mixing frameworks without architectural justification
// Using Next.js for admin dashboard and Remix for marketing site
// Creates inconsistent patterns and duplicated infrastructure

// ✅ GOOD: Consistent framework choice based on dominant use case
// Choose Next.js for content-heavy e-commerce with admin section
// Or choose Remix for data-driven SaaS with marketing pages
// Single framework reduces complexity even if not optimal for every use case
```

```typescript
// ❌ BAD: Framework selection ignoring team capabilities
// Choosing Remix for team unfamiliar with web standards
// Or Next.js for team preferring simplified mental models

// ✅ GOOD: Framework selection considering team context
if (team.reactExperience === 'beginner' && project.complexity === 'low') {
  // Remix's simpler mental model reduces learning curve
  return 'remix';
}
if (team.size > 5 && project.hasLegacyCode) {
  // Next.js's incremental adoption strategy fits better
  return 'next';
}
```

## Related Bindings

- [simplicity](../../core/simplicity.md): Framework selection directly implements simplicity by eliminating decision paralysis and providing clear selection criteria. Teams spend less time debating architectural choices and more time delivering value.

- [preferred-technology-patterns](../../core/preferred-technology-patterns.md): This binding applies the "choose boring technology" principle by selecting proven, stable frameworks (Next.js and Remix) rather than experimental alternatives, while providing clear criteria for when each excels.

- [toolchain-selection-criteria](../../core/toolchain-selection-criteria.md): The measurable decision matrix approach builds on toolchain selection principles by applying objective criteria to framework selection rather than subjective preferences or trends.

- [modern-typescript-toolchain](../typescript/modern-typescript-toolchain.md): Both Next.js and Remix integrate with the unified TypeScript toolchain, ensuring consistent development experience regardless of framework choice.

- [performance-testing-standards](../../core/performance-testing-standards.md): Framework selection decisions should be validated through performance testing to ensure the chosen framework meets project requirements under real-world conditions.

- [secure-by-design-principles](../security/secure-by-design-principles.md): Framework selection impacts security posture - both Next.js and Remix provide security-by-design features that should be considered in the selection criteria.
