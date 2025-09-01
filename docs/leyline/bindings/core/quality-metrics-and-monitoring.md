---
id: quality-metrics-and-monitoring
last_modified: '2025-06-15'
version: '0.2.0'
derived_from: automation
enforced_by: 'Quality Dashboards, Automated Alerts, Code Quality Gates'
---

# Binding: Quality Metrics and Monitoring

Measure what matters to drive continuous improvement. Establish meaningful quality KPIs that guide decision-making, surface issues early, and create accountability for technical excellence without becoming bureaucratic overhead.

## Rationale

Quality metrics serve as early warning systems and progress indicators, but only when they measure outcomes that teams can act upon. Poorly chosen metrics create false urgency or, worse, incentivize gaming the system rather than improving quality.

Effective quality monitoring creates a feedback loop: metrics reveal problems, teams investigate root causes, solutions are implemented, and metrics confirm improvement. This cycle only works when metrics are accurate, timely, and connected to actionable improvement strategies.

## Rule Definition

**MUST** track core quality indicators: test coverage, build success rate, deployment frequency, mean time to recovery.

**MUST** set measurable thresholds that trigger alerts and action items.

**MUST** review metrics weekly during team retrospectives with focus on trends and improvement actions.

**MUST** automate metric collection to eliminate manual reporting overhead.

**SHOULD** correlate quality metrics with user-facing outcomes like error rates and performance.

**SHOULD** track leading indicators (code review time, test execution speed) alongside lagging indicators (bugs found in production).

## Core Quality KPIs

### Code Quality Metrics

**Test Coverage (Target: ≥80%)**
- **Unit Test Coverage**: ≥90% for core business logic
- **Integration Test Coverage**: ≥70% for API endpoints
- **E2E Test Coverage**: ≥60% for critical user paths
- **Alert Threshold**: <75% coverage fails builds

**Code Complexity (Target: Maintainable)**
- **Cyclomatic Complexity**: <10 per function
- **Technical Debt Ratio**: <5% (SonarQube)
- **Code Duplication**: <3% of codebase
- **Alert Threshold**: >20% increase in complexity metrics

### Process Quality Metrics

**Build Health (Target: ≥95% success)**
- **Build Success Rate**: Last 50 builds
- **Test Execution Time**: <10 minutes for full suite
- **Flaky Test Rate**: <2% of total tests
- **Alert Threshold**: <90% build success or >3 consecutive failures

**Deployment Velocity (Target: Daily deployments)**
- **Deployment Frequency**: Deployments per week
- **Lead Time**: Commit to production time
- **Change Failure Rate**: <15% of deployments
- **Mean Time to Recovery**: <4 hours for critical issues

## Implementation Examples

**SonarQube Integration:**
```yaml
# sonar-project.properties
sonar.projectKey=myproject
sonar.sources=src
sonar.tests=tests
sonar.typescript.lcov.reportPaths=coverage/lcov.info
sonar.coverage.minimum=80
sonar.duplicated_lines_density.maximum=3
```

```yaml
# .github/workflows/quality-gate.yml
name: Quality Gate
on: [push, pull_request]
jobs:
  quality-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test -- --coverage
      - uses: sonarqube-quality-gate-action@master
```

**Custom Quality Dashboard:**
```typescript
interface QualityMetrics {
  coverage: { total: number; unit: number; integration: number; };
  builds: { successRate: number; flakyTests: number; };
  deployment: { frequency: number; mttr: number; };
}

class QualityDashboard {
  async generateAlerts(metrics: QualityMetrics): Promise<Alert[]> {
    const alerts: Alert[] = [];

    if (metrics.coverage.total < 80) {
      alerts.push({
        severity: 'warning',
        message: `Coverage ${metrics.coverage.total}% below 80%`,
        action: 'Add tests for uncovered code'
      });
    }

    if (metrics.builds.successRate < 95) {
      alerts.push({
        severity: 'critical',
        message: `Build success ${metrics.builds.successRate}% below 95%`,
        action: 'Investigate failing builds'
      });
    }

    return alerts;
  }
}
```

**Grafana Dashboard:**
```json
{
  "dashboard": {
    "title": "Code Quality Metrics",
    "panels": [
      {
        "title": "Test Coverage",
        "type": "stat",
        "targets": [{"expr": "test_coverage_percentage"}],
        "thresholds": [
          {"color": "red", "value": 0},
          {"color": "green", "value": 80}
        ]
      },
      {
        "title": "Build Success Rate",
        "type": "stat",
        "targets": [{"expr": "rate(builds_successful[7d])"}]
      }
    ]
  }
}
```

**Team Retrospective Integration:**
```typescript
interface RetrospectiveData {
  period: string;
  improvements: string[];
  blockers: string[];
  actions: ActionItem[];
}

class QualityRetrospective {
  generateReport(current: QualityMetrics, previous: QualityMetrics): RetrospectiveData {
    const improvements = this.identifyImprovements(current, previous);
    const regressions = this.identifyRegressions(current, previous);

    return {
      period: "Last 2 weeks",
      improvements,
      blockers: regressions,
      actions: regressions.map(r => ({ issue: r, owner: 'team', priority: 'high' }))
    };
  }
}
```

## Metric Selection Guidelines

**Focus on Outcomes, Not Outputs**
- Track bug escape rate, not lines of code written
- Measure deployment success, not deployment count
- Monitor user error rates, not test count

**Balance Leading and Lagging Indicators**
- Leading: Code review time, test execution speed, complexity trends
- Lagging: Production bugs, customer satisfaction, performance metrics

**Ensure Actionability**
- Every metric should have a clear improvement action
- Thresholds should trigger specific response procedures
- Trends matter more than absolute values

## Anti-Patterns to Avoid

❌ **Vanity Metrics**: Impressive numbers that don't correlate with quality
❌ **Gaming Incentives**: Metrics encouraging harmful behavior
❌ **Alert Fatigue**: Too many non-actionable alerts
❌ **Manual Collection**: Human effort reduces accuracy and sustainability

## Related Bindings

- [automated-quality-gates](../../docs/bindings/core/automated-quality-gates.md): Automated thresholds and alerts
- [performance-testing-standards](../../docs/bindings/core/performance-testing-standards.md): Performance benchmarks
- [ci-cd-pipeline-standards](../../docs/bindings/core/ci-cd-pipeline-standards.md): Pipeline metrics
