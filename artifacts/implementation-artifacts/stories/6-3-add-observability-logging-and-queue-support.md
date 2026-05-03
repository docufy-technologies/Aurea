# Story 6.3: Add Observability, Logging, and Queue Support

## Story Metadata

| Field | Value |
|-------|-------|
| **Story ID** | 6.3 |
| **Epic** | 6 - Communications and Platform Reliability |
| **Story Key** | 6-3-add-observability-logging-and-queue-support |
| **Status** | ready-for-dev |
| **Developer** | |
| **Reviewer** | |
| **Completed** | |

---

## Story Requirements

### User Story

**As an** operator,
**I want** structured logs, monitoring, and async processing,
**So that** issues are visible and recoverable.

### Acceptance Criteria

| ID | Criterion | Test Scenario |
|----|-----------|---------------|
| AC1 | Failures logged in structured JSON | Errors written with timestamp, level, message, stack trace, context |
| AC2 | Error tracking integration ready | Error wrapper can send to Sentry or equivalent |
| AC3 | Uptime monitoring endpoints ready | Health and liveness endpoints respond correctly |
| AC4 | Async queue processing available | Bull or equivalent queue configured |
| AC5 | Queue retry mechanism works | Failed jobs retry with exponential backoff |
| AC6 | Background job handlers registered | Email, notifications, webhook handlers queued |

### Dependencies

| Dependency | Type | Description |
|------------|------|-------------|
| Story 6.2 | Blocks | Requires API foundation and shared types |

### Business Value

- Enables proactive monitoring before users report issues
- Provides structured debugging for production incidents
- Supports async workflows without blocking user requests
- Enables reliable background processing for emails and notifications

---

## Developer Context

### CRITICAL: Developer Guardrails

This story establishes the OBSERVABILITY foundation. Follow these rules EXACTLY:

1. **Structured JSON logging** - Always use consistent log format
2. **Error tracking integration** - Sentry or compatible
3. **Health endpoints** - /health and /live for orchestration
4. **Queue abstraction** - Use BullMQ, not raw Redis
5. **Retry with backoff** - Exponential, not immediate retry

### What Was Done Before

- Story 1.1: Project initialized with pnpm workspaces monorepo structure
- Stories 1.2-1.5: Authentication system implemented
- Stories 2.1-2.4: Product catalog implemented
- Stories 3.1-3.5: Cart system implemented
- Stories 4.1-4.7: Checkout and payment implemented
- Stories 5.1-5.5: Order management implemented
- Story 6.1: Newsletter signup implemented
- Story 6.2: Platform integration foundation (shared types, API wrapper)

### What This Story Must Build

This story creates the observability and async processing foundation:

1. **Structured Logging** - JSON logger with levels, context, correlation IDs
2. **Error Tracking** - Sentry integration for exception monitoring
3. **Health Endpoints** - /health (full) and /live (basic) for k8s/orchestration
4. **Queue System** - BullMQ with retry, dead letter queue support
5. **Background Job Setup** - Email and notification job processors

---

## Technical Requirements

### Logging Specification

**Log Format:**
```typescript
interface LogEntry {
  timestamp: string; // ISO 8601
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: {
    service: string;
    correlationId?: string;
    userId?: string;
    requestId?: string;
  };
  error?: {
    name: string;
    stack: string;
    cause?: string;
  };
  metadata?: Record<string, unknown>;
}
```

**Log Levels:**
- debug: Development details, not in production
- info: Normal operations, significant events
- warn: Potential issues, recoverable errors
- error: Actual failures requiring attention

**Log Output:**
- Write to stdout in JSON format for container log collectors
- Service name in all logs for identification

### Error Tracking Integration

**Sentry Setup:**
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

**Error Capture Pattern:**
```typescript
try {
  // operation
} catch (error) {
  Sentry.captureException(error, { extra: { context } });
  throw error;
}
```

### Health Endpoints

**Liveness Probe (/live):**
- Returns 200 if process is running
- No dependencies, just checks process exists

**Readiness Probe (/health):**
- Returns 200 if service can handle requests
- Checks: database connection, redis connection, queue connectivity

```typescript
app.get('/health', async (req, res) => {
  const checks = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping(),
    queue.isReady(),
  ]);
  
  const healthy = checks.every(c => c.status === 'fulfilled');
  res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded' });
});

app.get('/live', (req, res) => res.status(200).json({ status: 'ok' }));
```

### Queue Architecture

**Queue Configuration (BullMQ):**
```typescript
import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const redis = new IORedis(process.env.REDIS_URL);

// Queue definitions
export const emailQueue = new Queue('email', { connection: redis });
export const notificationQueue = new Queue('notification', { connection: redis });
export const webhookQueue = new Queue('webhook', { connection: redis });
export const inventoryQueue = new Queue('inventory', { connection: redis });

// Queue events for monitoring
const queueEvents = new QueueEvents('email', { connection: redis });
queueEvents.on('completed', ({ jobId }) => log.info(`Job ${jobId} completed`));
queueEvents.on('failed', ({ jobId, failedReason }) => 
  log.error(`Job ${jobId} failed: ${failedReason}`)
);
```

**Retry Configuration:**
```typescript
const emailQueue = new Queue('email', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // 1s, 2s, 4s
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});
```

### Background Job Types

| Job Type | Queue | Priority | Description |
|---------|-------|----------|-------------|
| send-welcome-email | email | high | New account registration |
| send-order-confirmation | email | high | Order creation |
| send-shipment-notification | notification | high | Status changes |
| retry-webhook | webhook | medium | Payment/logistics retries |
| sync-inventory | inventory | low | Periodic sync |

### Database Conventions (Reference)

From architecture, these conventions apply:
- Tables: snake_case, plural
- Columns: snake_case
- Foreign keys: `_{table}_id` suffix
- Dates: ISO 8601 strings

---

## Architecture Compliance

### Required Patterns

| Pattern | Implementation |
|---------|---------------|
| Structured Logging | JSON with timestamp, level, context |
| Error Tracking | Sentry Node SDK |
| Health Checks | /health (full), /live (basic) |
| Queue System | BullMQ with retry |
| Background Jobs | Named queues per domain |

### Monorepo Structure

Following the architecture document:

```
packages/
├── web/          # React frontend
├── server/       # Express backend
└── shared/      # Shared types
    └── src/
        └── ...

packages/server/
├── src/
│   ├── lib/
│   │   ├── logger.ts        ← NEW: Structured logger
│   │   ├── sentry.ts       ← NEW: Sentry setup
│   │   └── queue.ts        ← NEW: Queue definitions
│   ├── jobs/
│   │   ├─��� email.ts        ← NEW: Email job handler
│   │   └── notification.ts ← NEW: Notification handler
│   ├── routes/
│   │   └── health.ts      ← NEW: Health endpoints
│   └── app.ts            ← MODIFY: Register routes
```

### Environment Variables Required

```bash
# Logging & Monitoring
LOG_LEVEL=info|warn|error
SENTRY_DSN=

# Queue
REDIS_URL=redis://localhost:6379
```

---

## Library/Framework Requirements

### Required Dependencies

**Server Package:**
```json
{
  "@sentry/node": "^8.0.0",
  "bullmq": "^5.0.0",
  "ioredis": "^5.3.0",
  "pino": "^9.0.0",
  "pino-pretty": "^11.0.0"
}
```

### Version Requirements

| Library | Version | Reason |
|---------|---------|--------|
| @sentry/node | ^8.0.0 | Latest Sentry SDK |
| bullmq | ^5.0.0 | Active Redis queue |
| ioredis | ^5.3.0 | Redis client |
| pino | ^9.0.0 | JSON logger |

---

## File Structure Requirements

### Create These Files

```
packages/server/src/lib/
├── logger.ts         ← NEW: Structured JSON logger
├── sentry.ts        ← NEW: Sentry initialization
└── queue.ts        ← NEW: Queue setup and exports

packages/server/src/jobs/
├── index.ts         ← NEW: Job registry
├── email.ts        ← NEW: Email job processor
└── notification.ts ← NEW: Notification processor

packages/server/src/routes/
└── health.ts       ← NEW: Health check routes

packages/server/src/workers/
└── index.ts        ← NEW: Worker registration

packages/server/src/app.ts    ← MODIFY: Add health routes
packages/server/package.json ← ADD: sentry, bullmq, ioredis, pino
```

### Modify Existing Files

| File | Modification |
|------|---------------|
| `packages/server/package.json` | Add dependencies |
| `packages/server/src/app.ts` | Register health routes |
| `packages/server/src/main.ts` | Start workers |

---

## Testing Requirements

### Unit Tests

- Test logger output format
- Test error capture wrapper
- Test job retry behavior with BullMQ

### Integration Tests

- Test /health endpoint returns 200
- Test /live endpoint returns 200
- Test queue job processing

### Test File Location

```
packages/server/src/lib/logger.test.ts
packages/server/src/routes/health.test.ts
packages/server/src/jobs/email.test.ts
```

---

## Previous Story Intelligence

### From Story 6.2 (Platform Integration Foundation)

Story 6.2 established:
- Shared types package
- API response wrapper format
- Middleware setup (Helmet, CORS, rate limiting)

**Learnings for Story 6.3:**
- Error handling should use the standardized API error format
- Queue handlers should return structured responses
- Health checks should integrate with existing middleware pattern

### From Previous Epics

- Stories 4.4+ use email and notifications that could use queue
- Stories 5.2+ need background SMS/webhook processing
- All backend stories benefit from structured logging for debugging

---

## Implementation Checklist

- [ ] Install dependencies (sentry, bullmq, ioredis, pino)
- [ ] Create structured logger in lib/logger.ts
- [ ] Initialize Sentry in lib/sentry.ts
- [ ] Create queue setup in lib/queue.ts
- [ ] Create health routes (/health, /live)
- [ ] Create email job processor
- [ ] Create notification job processor
- [ ] Register workers in main.ts
- [ ] Add LOG_LEVEL and SENTRY_DSN to env example
- [ ] Run tests and verify build passes

---

## Completion Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| CC1 | Structured JSON logs write to stdout | Console output validated |
| CC2 | /health endpoint responds correctly | Health check responds 200 |
| CC3 | /live endpoint responds correctly | Liveness check responds 200 |
| CC4 | Queue jobs can be added | Job added to test queue |
| CC5 | Job retries work | Failed job retries automatically |
| CC6 | Build passes | pnpm build succeeds |
| CC7 | Tests pass | pnpm test passes |

---

## Notes

- This story enables OPS team visibility into the platform
- Queue setup is foundation for background processing in future stories
- Health endpoints required for container orchestration (k8s, ECS)
- Structured logging essential for production debugging

---

**Story Created:** 2026-05-03  
**Status:** ready-for-dev  
**Next:** Run `dev-story 6.3` to implement