---
derived_from: explicit-over-implicit
enforced_by: code review & integration tests
id: context-propagation
last_modified: '2025-05-14'
version: '0.2.0'
---
# Binding: Propagate Request Context Across Service Boundaries

All services must propagate context information across process boundaries to maintain traceability and state coherence in distributed systems. This includes correlation IDs, tenant identifiers, and other contextual metadata that enables consistent behavior across HTTP calls, message queues, event streams, and batch processes.

## Rationale

This binding implements our explicit-over-implicit tenet by making cross-service relationships explicit through consistent context metadata. Like a relay race baton containing critical information passed between runners, context propagation maintains continuity across otherwise disconnected operations.

Without context propagation, each service becomes isolated, making it impossible to trace requests, diagnose issues across boundaries, or implement cross-cutting concerns like observability and tenant isolation. In distributed architectures, context loss creates "visibility gaps" that prevent effective debugging and operational stability.

## Rule Definition

Context propagation requires these core elements:

- **Required Fields**: Every request must propagate `correlation_id`, `request_id`, `tenant_id` (multi-tenant systems), `user_id` (when applicable), and `origin_service`
- **Propagation Channels**: HTTP headers, message metadata, event payloads, and database records for background processing
- **Security**: Sanitize sensitive information, validate external context, and apply access controls
- **Generation**: Create missing correlation IDs at boundaries, preserve existing IDs, and use consistent naming conventions

## Practical Implementation

1. **HTTP Context Propagation**: Implement middleware to handle context in HTTP requests:

   ```typescript
   import { v4 as uuidv4 } from 'uuid';
   import { AsyncLocalStorage } from 'async_hooks';

   interface RequestContext {
     correlationId: string;
     requestId: string;
     tenantId?: string;
     userId?: string;
     originService: string;
   }

   const contextStorage = new AsyncLocalStorage<RequestContext>();

   // Middleware to extract or create context
   export function contextMiddleware(serviceName: string) {
     return (req: Request, res: Response, next: NextFunction) => {
       const context: RequestContext = {
         correlationId: req.headers['x-correlation-id'] as string || uuidv4(),
         requestId: uuidv4(),
         tenantId: req.headers['x-tenant-id'] as string,
         userId: req.headers['x-user-id'] as string,
         originService: req.headers['x-origin-service'] as string || serviceName
       };

       req.context = context;
       res.setHeader('X-Correlation-ID', context.correlationId);

       contextStorage.run(context, next);
     };
   }

   // HTTP client that propagates context
   export function createHttpClient(baseURL: string, serviceName: string) {
     const client = axios.create({ baseURL });

     client.interceptors.request.use(config => {
       const context = contextStorage.getStore();
       if (context) {
         config.headers = {
           ...config.headers,
           'X-Correlation-ID': context.correlationId,
           'X-Request-ID': uuidv4(),
           'X-Tenant-ID': context.tenantId,
           'X-User-ID': context.userId,
           'X-Origin-Service': serviceName
         };
       }
       return config;
     });

     return client;
   }
   ```

2. **Message Queue Context**: Include context in message metadata:

   ```typescript
   interface Message<T> {
     payload: T;
     metadata: {
       correlationId: string;
       messageId: string;
       tenantId?: string;
       userId?: string;
       originService: string;
     };
   }

   class MessageProducer {
     constructor(private client: any, private serviceName: string) {}

     async sendMessage<T>(topic: string, payload: T): Promise<void> {
       const context = contextStorage.getStore();

       const message: Message<T> = {
         payload,
         metadata: {
           correlationId: context?.correlationId || uuidv4(),
           messageId: uuidv4(),
           tenantId: context?.tenantId,
           userId: context?.userId,
           originService: this.serviceName
         }
       };

       await this.client.send(topic, message);
     }
   }

   class MessageConsumer {
     async processMessage<T>(message: Message<T>, handler: (payload: T) => Promise<void>): Promise<void> {
       const context: RequestContext = {
         correlationId: message.metadata.correlationId,
         requestId: message.metadata.messageId,
         tenantId: message.metadata.tenantId,
         userId: message.metadata.userId,
         originService: message.metadata.originService
       };

       await contextStorage.run(context, () => handler(message.payload));
     }
   }
   ```

3. **Background Job Context**: Store context with database records for async processing:

   ```typescript
   interface JobRecord {
     id: string;
     type: string;
     payload: any;
     context: {
       correlation_id: string;
       tenant_id?: string;
       user_id?: string;
       origin_service: string;
     };
   }

   async function createJob(type: string, payload: any): Promise<string> {
     const context = contextStorage.getStore();

     const job: JobRecord = {
       id: uuidv4(),
       type,
       payload,
       context: {
         correlation_id: context?.correlationId || uuidv4(),
         tenant_id: context?.tenantId,
         user_id: context?.userId,
         origin_service: context?.originService || 'unknown'
       }
     };

     await db.collection('jobs').insertOne(job);
     return job.id;
   }

   async function processJob(jobId: string): Promise<void> {
     const job = await db.collection('jobs').findOne({ id: jobId });

     const context: RequestContext = {
       correlationId: job.context.correlation_id,
       requestId: uuidv4(),
       tenantId: job.context.tenant_id,
       userId: job.context.user_id,
       originService: job.context.origin_service
     };

     await contextStorage.run(context, async () => {
       // Process job with restored context
     });
   }
   ```

## Examples

```typescript
// ❌ BAD: No context propagation between services
app.post('/orders', async (req, res) => {
  const order = await createOrder(req.body);

  // Call without context - impossible to trace relationship
  await axios.post('http://inventory-service/reserve', { items: order.items });

  console.log(`Created order ${order.id}`); // No correlation info
  res.json(order);
});
```

```typescript
// ✅ GOOD: Context propagated between services
app.post('/orders', contextMiddleware('order-service'), async (req, res) => {
  const order = await createOrder(req.body);

  // Log with context for traceability
  logger.info({
    event: 'order_created',
    order_id: order.id,
    correlation_id: req.context.correlationId,
    tenant_id: req.context.tenantId
  });

  // Call with automatic context propagation
  const httpClient = createHttpClient('http://inventory-service', 'order-service');
  await httpClient.post('/reserve', { items: order.items, order_id: order.id });

  res.json(order);
});
```

## Related Bindings

- [use-structured-logging](../../docs/bindings/core/use-structured-logging.md): Context propagation enables structured logs to include consistent correlation IDs, connecting logs across services into coherent distributed transaction narratives.

- [dependency-inversion](../../docs/bindings/core/dependency-inversion.md): Services should depend on context abstractions rather than specific implementations, allowing different propagation strategies while maintaining consistent behavior.
