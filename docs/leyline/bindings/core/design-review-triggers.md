---
id: design-review-triggers
last_modified: '2025-07-10'
version: '0.2.0'
derived_from: design-is-never-done
enforced_by: 'Development practices, architectural reviews, team retrospectives'
---

# Binding: Establish Design Review Triggers

Define and monitor specific conditions that warrant reconsidering system design. Create systematic triggers for design evaluation rather than waiting for problems to force reactive changes.

## Rationale

This binding implements the design-is-never-done tenet by establishing concrete checkpoints for design reconsideration. Without explicit triggers, teams often persist with outdated designs until forced to change by critical failures or unmanageable complexity.

Design decay happens gradually. What starts as minor friction becomes major impediments. By defining clear triggers, teams can catch design issues early when changes are less disruptive and more effective.

## Rule Definition

**MUST** conduct design reviews when any of these quantitative triggers occur:
- Performance degrades by >20% from baseline
- Build/deployment time increases by >50%
- New feature implementation time exceeds estimates by >100%
- Bug density in a component exceeds 3x system average
- Code duplication exceeds 15% in a module

**MUST** conduct design reviews for these qualitative triggers:
- Third workaround for the same design limitation
- New team members consistently misunderstand component purpose
- Simple changes require modifications across >3 components
- The same type of bug recurs 3+ times

**SHOULD** schedule periodic design reviews:
- After every 10 significant features added
- At major version milestones
- When team composition changes significantly
- Quarterly for core system components

**SHOULD** document design review outcomes:
- Problems identified
- Alternatives considered
- Decisions made with rationale
- Action items with ownership

## Implementation Approach

**Establish Baselines**: Measure current system metrics to identify degradation.

**Automate Detection**: Use tooling to monitor quantitative triggers automatically.

**Create Review Process**: Define who participates and how decisions are made.

**Track Outcomes**: Monitor whether design changes improve the identified issues.

## Implementation Examples

### ❌ Reactive Design Approach

```typescript
// Bad: Accumulating workarounds without addressing root cause
class PaymentProcessor {
  async processPayment(payment: Payment): Promise<Result> {
    // Workaround #1: Special handling for certain payment types
    if (payment.type === 'crypto') {
      return this.processCryptoSpecially(payment);
    }

    // Workaround #2: Different flow for high-value payments
    if (payment.amount > 10000) {
      return this.processHighValueDifferently(payment);
    }

    // Workaround #3: Legacy system compatibility hack
    if (payment.source === 'legacy') {
      payment = this.transformLegacyFormat(payment);
    }

    // Original design struggling with new requirements
    try {
      return await this.originalProcessor.process(payment);
    } catch (error) {
      // Workaround #4: Retry with different strategy
      return await this.fallbackProcessor.process(payment);
    }
  }
}
```

### ✅ Proactive Design Review Approach

```typescript
// Good: Systematic monitoring and design evolution
interface DesignHealthMetrics {
  performanceBaseline: number;
  averageBuildTime: number;
  componentComplexity: Map<string, number>;
  bugDensity: Map<string, number>;
  codeduplication: number;
}

class DesignReviewTriggerMonitor {
  private metrics: DesignHealthMetrics;
  private triggers: DesignReviewTrigger[] = [];

  constructor(private notificationService: NotificationService) {
    this.setupAutomaticTriggers();
  }

  private setupAutomaticTriggers(): void {
    // Quantitative triggers with automatic monitoring
    this.addTrigger({
      name: 'Performance Degradation',
      condition: () => this.checkPerformanceDegradation() > 0.2,
      severity: 'high',
      suggestedAction: 'Review system architecture for bottlenecks'
    });

    this.addTrigger({
      name: 'Build Time Increase',
      condition: () => this.checkBuildTimeIncrease() > 0.5,
      severity: 'medium',
      suggestedAction: 'Evaluate module boundaries and dependencies'
    });

    this.addTrigger({
      name: 'High Bug Density',
      condition: () => this.checkBugDensityAnomalies().length > 0,
      severity: 'high',
      suggestedAction: 'Review component design for identified modules'
    });
  }

  async checkTriggers(): Promise<TriggeredReview[]> {
    const triggered = this.triggers
      .filter(trigger => trigger.condition())
      .map(trigger => ({
        trigger,
        timestamp: new Date(),
        metrics: this.gatherRelevantMetrics(trigger)
      }));

    if (triggered.length > 0) {
      await this.notificationService.notifyArchitectureTeam(triggered);
    }

    return triggered;
  }

  recordQualitativeTrigger(trigger: QualitativeTrigger): void {
    // Manual triggers from team observations
    const review: DesignReview = {
      trigger: trigger.description,
      reportedBy: trigger.reporter,
      component: trigger.component,
      suggestedScope: trigger.scope,
      priority: this.calculatePriority(trigger)
    };

    this.scheduleDesignReview(review);
  }
}

// Tracking workarounds to identify design issues
class WorkaroundTracker {
  private workarounds = new Map<string, Workaround[]>();

  addWorkaround(component: string, workaround: Workaround): void {
    const existing = this.workarounds.get(component) || [];
    existing.push(workaround);
    this.workarounds.set(component, existing);

    // Trigger design review after 3 workarounds
    if (existing.length >= 3) {
      this.triggerDesignReview({
        component,
        reason: 'Multiple workarounds indicate design issues',
        workarounds: existing
      });
    }
  }
}

// Structured design review process
class DesignReviewProcess {
  async conductReview(trigger: TriggeredReview): Promise<DesignReviewOutcome> {
    const participants = this.identifyParticipants(trigger);

    const review = await this.scheduleReview({
      trigger,
      participants,
      scope: this.determineScope(trigger)
    });

    // Document everything
    const outcome: DesignReviewOutcome = {
      problemsIdentified: review.problems,
      rootCauseAnalysis: review.analysis,
      alternativesConsidered: review.alternatives,
      decisionsMode: review.decisions,
      actionItems: review.actions,
      successCriteria: review.metrics
    };

    await this.documentOutcome(outcome);
    await this.createFollowupTasks(outcome.actionItems);

    return outcome;
  }
}
```

### Periodic Review Implementation

```typescript
// Scheduled design reviews based on development milestones
class PeriodicDesignReview {
  private featureCounter = 0;
  private lastQuarterlyReview = new Date();

  onFeatureComplete(feature: Feature): void {
    this.featureCounter++;

    if (this.featureCounter >= 10) {
      this.triggerMilestoneReview('10 features completed');
      this.featureCounter = 0;
    }
  }

  checkQuarterlyReview(): void {
    const monthsSinceLastReview = this.monthsDifference(
      new Date(),
      this.lastQuarterlyReview
    );

    if (monthsSinceLastReview >= 3) {
      this.triggerPeriodicReview('Quarterly review due');
      this.lastQuarterlyReview = new Date();
    }
  }

  onTeamChange(change: TeamChange): void {
    if (change.impactLevel === 'significant') {
      this.triggerTeamChangeReview(
        'Significant team composition change',
        change
      );
    }
  }
}
```

## Measuring Review Effectiveness

Track whether design reviews lead to improvements:

```typescript
interface ReviewEffectivenessMetrics {
  preReviewMetrics: SystemMetrics;
  postReviewMetrics: SystemMetrics;
  timeToImplementChanges: number;
  problemsResolved: number;
  newIssuesIntroduced: number;
}

class ReviewEffectivenessTracker {
  trackOutcome(
    review: DesignReviewOutcome,
    implementation: ImplementationResult
  ): ReviewEffectivenessMetrics {
    return {
      preReviewMetrics: review.baselineMetrics,
      postReviewMetrics: this.measureCurrent(),
      timeToImplementChanges: implementation.duration,
      problemsResolved: this.countResolvedProblems(review, implementation),
      newIssuesIntroduced: this.findNewIssues(implementation)
    };
  }
}
```

## Common Pitfalls

**❌ Ignoring Triggers**: Acknowledging issues but deferring reviews indefinitely
**❌ Review Theater**: Going through motions without making meaningful changes
**❌ Over-Reviewing**: Triggering reviews for minor issues that don't warrant design changes
**❌ No Follow-Through**: Identifying problems without implementing solutions
**❌ Isolated Reviews**: Not considering system-wide implications of local design changes

## Related Standards

- [design-is-never-done](../../docs/tenets/design-is-never-done.md): The foundational principle that design must evolve continuously
- [continuous-refactoring](continuous-refactoring.md): Tactical code improvements that complement strategic design reviews
- [technical-debt-tracking](technical-debt-tracking.md): Systematic tracking that feeds into design review triggers
- [architecture-decision-records](architecture-decision-records.md): Documentation practices for design review outcomes
