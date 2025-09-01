---
derived_from: automation
enforced_by: linters & code review
id: use-structured-logging
last_modified: '2025-06-15'
version: '0.2.0'
---

# Binding: Implement Complete Observability with Structured Logs, Metrics, and Traces

All systems must implement the three pillars of observability: structured logs, metrics, and distributed traces. Use machine-readable formats (JSON) that enable automated parsing, indexing, and analysis. Every observability signal must include standardized contextual information that enables correlation across all pillars.

## Rationale

This binding transforms system telemetry into machine-readable data that powers automated monitoring, alerting, and analysis. Logs tell you what happened, metrics show frequency and magnitude, traces reveal component relationships. Together, they enable rapid troubleshooting in distributed systems.

## Rule Definition

### Structured Logging Requirements

**MUST** use JSON format for all application logs with these mandatory fields:
- `timestamp`: ISO 8601 format with timezone
- `level`: Standardized levels (ERROR, WARN, INFO, DEBUG)
- `message`: Human-readable description
- `service`: Service identifier
- `correlation_id`: Request correlation identifier
- `component`: Source component within service

**MUST NOT** use string concatenation or template literals for structured data within log messages.

### Metrics Requirements

**MUST** implement the four golden signals: Traffic, Errors, Latency, and Saturation.

**MUST** use standardized metric types:
- Counters: Monotonically increasing values (requests, errors)
- Gauges: Point-in-time values (memory usage, queue size)
- Histograms: Distribution data (response times, request sizes)

**MUST** include consistent labels: `service`, `method`, `status_code`.

### Distributed Tracing Requirements

**MUST** participate in distributed tracing for all cross-service communication.

**MUST** include required span attributes: `service.name`, `operation.name`, `http.method`, `http.status_code`.

**MUST** propagate trace context using W3C Trace Context headers.

### Cross-Cutting Requirements

**MUST** maintain consistent correlation IDs across logs, metrics, and traces for the same request.

**MUST** use consistent data types and formats across all observability signals.

## Implementation Guide

### 1. Structured Logging

```typescript
// observability.ts
import { AsyncLocalStorage } from 'async_hooks';

interface LogContext {
  timestamp: string; level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'; message: string;
  service: string; correlation_id: string; component: string; metadata?: Record<string, unknown>;
}

class StructuredLogger {
  private contextStorage = new AsyncLocalStorage<{ correlationId: string }>();
  constructor(private serviceName: string) {}

  private createLogEntry(level: LogContext['level'], message: string, component: string, metadata?: Record<string, unknown>): LogContext {
    const context = this.contextStorage.getStore();
    return {
      timestamp: new Date().toISOString(), level, message, service: this.serviceName,
      correlation_id: context?.correlationId || 'unknown', component, ...(metadata && { metadata })
    };
  }

  info(message: string, component: string, metadata?: Record<string, unknown>) {
    console.log(JSON.stringify(this.createLogEntry('INFO', message, component, metadata)));
  }

  error(message: string, component: string, error?: Error, metadata?: Record<string, unknown>) {
    console.log(JSON.stringify(this.createLogEntry('ERROR', message, component, {
      ...metadata, ...(error && { error: { name: error.name, message: error.message, stack: error.stack }})
    })));
  }

  withCorrelation<T>(correlationId: string, fn: () => T): T {
    return this.contextStorage.run({ correlationId }, fn);
  }
}
```

### 2. Metrics Collection

```typescript
// metrics.ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

class ServiceMetrics {
  private requestsTotal: Counter<string>;
  private requestDuration: Histogram<string>;
  private activeConnections: Gauge<string>;

  constructor(serviceName: string) {
    this.requestsTotal = new Counter({
      name: 'http_requests_total', help: 'Total HTTP requests',
      labelNames: ['service', 'method', 'status_code'], registers: [register]
    });
    this.requestDuration = new Histogram({
      name: 'http_request_duration_seconds', help: 'HTTP request duration in seconds',
      labelNames: ['service', 'method', 'status_code'], buckets: [0.1, 0.5, 1, 2, 5], registers: [register]
    });
    this.activeConnections = new Gauge({
      name: 'active_connections', help: 'Number of active connections',
      labelNames: ['service'], registers: [register]
    });
  }

  recordRequest(method: string, statusCode: number, duration: number) {
    const labels = { service: 'user-service', method, status_code: statusCode.toString() };
    this.requestsTotal.inc(labels);
    this.requestDuration.observe(labels, duration);
  }

  setActiveConnections(count: number) {
    this.activeConnections.set({ service: 'user-service' }, count);
  }
}
```

### 3. Distributed Tracing & Unified Interface

```typescript
// tracing.ts + unified-observability.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { trace } from '@opentelemetry/api';

const sdk = new NodeSDK({ serviceName: 'user-service' });
sdk.start();

class TracingService {
  private tracer = trace.getTracer('user-service');
  async processRequest(correlationId: string, operation: string, fn: () => Promise<any>) {
    return this.tracer.startActiveSpan(operation, {
      attributes: { 'service.name': 'user-service', 'operation.name': operation, 'correlation.id': correlationId }
    }, async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: 2 });
        return result;
      } catch (error) {
        span.setStatus({ code: 3, message: error.message });
        span.recordException(error);
        throw error;
      } finally { span.end(); }
    });
  }
}
export class ObservabilityService {
  constructor(private logger: StructuredLogger, private metrics: ServiceMetrics, private tracing: TracingService) {}
  async handleRequest(correlationId: string, method: string, operation: string, handler: () => Promise<any>) {
    const startTime = Date.now();
    return this.logger.withCorrelation(correlationId, async () => {
      this.logger.info(`Starting ${operation}`, 'request-handler', { method });
      return this.tracing.processRequest(correlationId, operation, async () => {
        try {
          const result = await handler();
          this.metrics.recordRequest(method, 200, (Date.now() - startTime) / 1000);
          this.logger.info(`Completed ${operation}`, 'request-handler', { duration_ms: Date.now() - startTime });
          return result;
        } catch (error) {
          this.metrics.recordRequest(method, 500, (Date.now() - startTime) / 1000);
          this.logger.error(`Failed ${operation}`, 'request-handler', error);
          throw error;
        }
      });
    });
  }
}
```

## Examples

**✅ Do:** `logger.info('User authenticated', 'auth-service', { userId: '123' }); metrics.recordRequest('POST', 200, 0.45);`
**❌ Don't:** `console.log('User login at ' + new Date()); metrics.inc('logins'); // No context, no tracing`

## Performance & References

**Performance:** Use trace sampling (1-10%), non-blocking log writes, pre-aggregate high-cardinality metrics
**References:** [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/), [Prometheus Best Practices](https://prometheus.io/docs/practices/)
