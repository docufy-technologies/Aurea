# Story 6.2: Establish the Platform Integration Foundation

## Story Metadata

| Field | Value |
|------|-------|
| **Story ID** | 6.2 |
| **Epic** | 6 - Communications and Platform Reliability |
| **Story Key** | 6-2-establish-the-platform-integration-foundation |
| **Status** | ready-for-dev |
| **Developer** | |
| **Reviewer** | |
| **Completed** | |

---

## Story Requirements

### User Story

**As the** development team,
**I want** a consistent API and shared data foundation,
**So that** the platform can evolve safely.

### Acceptance Criteria

| ID | Criterion | Test Scenario |
|----|-----------|---------------|
| AC1 | API responses follow the agreed wrapper format | All endpoints return `{ success: boolean, data: T, metadata?: object }` format |
| AC2 | Versioned `/api/v1/` routes are used consistently | All API routes prefixed with `/api/v1/` |
| AC3 | Shared types available to frontend and backend | Types in `packages/shared` can be imported by both web and server |
| AC4 | Error responses follow standardized format | Errors return `{ success: false, error: { code: string, message: string } }` |

### Dependencies

| Dependency | Type | Description |
|------------|------|-------------|
| Story 1.1 | Blocks | Requires monorepo structure from project setup |

### Business Value

- Enables consistent API contract between frontend and backend
- Reduces integration bugs through shared type definitions
- Supports future API versioning without breaking changes
- Foundation for all subsequent API development

---

## Developer Context

### CRITICAL: Developer Guardrails

This story establishes the FOUNDATION for all API development. Follow these rules EXACTLY:

1. **ALL API responses MUST use the wrapper format** - No exceptions
2. **ALL routes MUST be under `/api/v1/`** - Version from the start
3. **Shared types in `packages/shared`** - Never duplicate types
4. **Error codes, not error messages** - For localization support
5. **snake_case for JSON** - Database convention enforced

### What Was Done Before

- Story 1.1: Project initialized with pnpm workspaces monorepo structure
- Stories 1.2-1.5: Authentication system implemented
- Stories 2.1-2.4: Product catalog implemented
- Stories 3.1-3.5: Cart system implemented
- Stories 4.1-4.7: Checkout and payment implemented
- Stories 5.1-5.5: Order management implemented
- Story 6.1: Newsletter signup implemented (establishes marketing integration pattern)

### What This Story Must Establish

This story creates the shared types foundation that ALL future stories depend on. It includes:

1. **Shared API Response Types** - Wrapper format, error types, pagination types
2. **Shared Entity Types** - User, Product, Cart, Order types for cross-package use
3. **Shared Validation Utils** - Reusable validation functions
4. **Backend API Foundation** - Base route configuration, middleware setup
5. **Error Code System** - Standardized error codes for localization

---

## Technical Requirements

### API Response Wrapper Format

**Success Response:**
```typescript
// packages/shared/src/types/api.ts
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  metadata?: {
    page?: number;
    total?: number;
    limit?: number;
  };
}
```

**Error Response:**
```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string; // For localization
    message: string; // Human readable
    details?: Record<string, unknown>; // Field-level errors
  };
}
```

**Type Union:**
```typescript
type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
```

### Versioned Routes

- ALL routes under `/api/v1/` prefix
- Example: `GET /api/v1/products`, `POST /api/v1/auth/login`
- Route files in `packages/server/src/routes/`

### Shared Types Structure

```
packages/shared/src/
├── types/
│   ├── api.ts        // API response types (REQUIRED)
│   ├── user.ts      // User types
│   ├── product.ts  // Product types
│   ├── cart.ts     // Cart types
│   ├── order.ts    // Order types
│   └── index.ts    // Barrel exports
└── utils/
    ├── validation.ts  // Shared validators
    └── formatters.ts  // Shared formatters
```

### Error Code System

Required error codes (minimum set):
- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error
- `BAD_REQUEST` - Malformed request

### Database Conventions (Reference)

From architecture, these conventions apply to any database interactions:
- Tables: snake_case, plural (e.g., `users`, `products`)
- Columns: snake_case (e.g., `user_id`, `created_at`)
- Foreign keys: `_{table}_id` suffix
- Dates: ISO 8601 strings

---

## Architecture Compliance

### Required Patterns

| Pattern | Implementation |
|--------|---------------|
| API Versioning | `/api/v1/` prefix on ALL routes |
| Response Wrapper | `{ success: boolean, data: T, metadata?: object }` |
| Error Format | `{ success: false, error: { code, message } }` |
| Shared Types | Types in `packages/shared/src/types/` |
| Validation | Zod for input validation |
| Error Codes | String codes for localization |

### Monorepo Structure

Following the architecture document:

```
packages/
├── web/          # React frontend (existing)
├── server/       # Express backend
└── shared/      # SHARED - Types and utilities
    └── src/
        ├── types/
        │   ├── api.ts      ← CREATE: API response types
        │   ├── user.ts    ← REUSE: From auth stories
        │   ├── product.ts ← REUSE: From product stories
        │   ├── cart.ts   ← REUSE: From cart stories
        │   ├── order.ts  ← REUSE: From order stories
        │   └── index.ts
        └── utils/
            ├── validation.ts  ← CREATE: Shared validators
            └── formatters.ts ← CREATE: Shared formatters
```

### Middleware Requirements

- Helmet.js for security headers
- CORS configuration
- Rate limiting (public: 60/min, auth: 120/min, write: 10/min)
- Zod validation middleware

---

## Library/Framework Requirements

### Required Dependencies

**Server Package:**
```json
{
  "helmet": "^7.0.0",
  "cors": "^2.8.5",
  "zod": "^3.22.0",
  "express-rate-limit": "^7.0.0"
}
```

**Shared Package:**
```json
{
  "zod": "^3.22.0"
}
```

### Version Requirements

| Library | Version | Reason |
|---------|---------|--------|
| helmet | ^7.0.0 | Latest security headers |
| cors | ^2.8.5 | Standard CORS |
| zod | ^3.22.0 | Latest validation |
| express-rate-limit | ^7.0.0 | Rate limiting |

---

## File Structure Requirements

### Create These Files

```
packages/shared/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts              ← Entry point
    ├── types/
    │   ├── api.ts          ← NEW: API response types
    │   ├── user.ts         ← REUSE: Shared user types
    │   ├── product.ts     ← REUSE: Shared product types
    │   ├── cart.ts        ← REUSE: Shared cart types
    │   ├── order.ts       ← REUSE: Shared order types
    │   └── index.ts       ← Barrel export
    └── utils/
        ├── validation.ts  ← NEW: Shared validators
        └── formatters.ts  ← NEW: Shared formatters

packages/server/
├── src/
│   ├── routes/
│   │   └── index.ts       ← NEW: Route registration
│   └── middleware/
│       ├── security.ts  ← NEW: Helmet, CORS
│       └── rate-limit.ts ← NEW: Rate limiting
│   └── app.ts            ← MODIFY: Add middleware
│   └── main.ts          ← MODIFY: Mount routes
```

### Modify Existing Files

| File | Modification |
|------|------------|
| `packages/server/package.json` | Add helmet, cors, zod, rate-limit |
| `packages/server/src/app.ts` | Add security middleware |
| `packages/server/src/main.ts` | Use v1 routes |
| `packages/web/package.json` | Add shared as dependency |

---

## Testing Requirements

### Unit Tests

- Test API response wrapper generation
- Test error response formatting
- Test validation utilities
- Test error code mapping

### Integration Tests

- Test `/api/v1/` prefix on routes
- Test response format consistency

### Test File Location

```
packages/shared/src/types/api.test.ts
packages/shared/src/utils/validation.test.ts
```

---

## Previous Story Intelligence

### From Story 6.1 (Newsletter Signups)

Story 6.1 established the marketing integration pattern. It created:
- Frontend newsletter form component
- Backend newsletter endpoint
- Integration event sending pattern

**Learnings for Story 6.2:**
- API response format from Story 4.4+ should be standardized
- Shared types were mentioned but not yet created
- This story builds the foundation that 6.1's backend depends on

### From Epics 1-5

All previous stories used hardcoded types or duplicated definitions. This story:
1. Creates the SHARED types package that consolidates all entity types
2. Establishes the API response wrapper as project standard
3. Sets up the middleware foundation for security

---

## Implementation Checklist

- [ ] Create `packages/shared` package structure
- [ ] Implement API response types in `packages/shared/src/types/api.ts`
- [ ] Create barrel export `packages/shared/src/types/index.ts`
- [ ] Implement validation utilities in `packages/shared/src/utils/validation.ts`
- [ ] Implement formatters in `packages/shared/src/utils/formatters.ts`
- [ ] Add security middleware (Helmet, CORS) to server
- [ ] Add rate limiting middleware to server
- [ ] Configure `/api/v1/` route prefix
- [ ] Export shared package from root
- [ ] Add shared as dependency to web and server packages
- [ ] Run tests and verify build passes

---

## Completion Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| CC1 | Shared types can be imported in web package | TypeScript compilation succeeds |
| CC2 | Shared types can be imported in server package | TypeScript compilation succeeds |
| CC3 | All API routes use `/api/v1/` prefix | Routes tested |
| CC4 | Response wrapper format follows standard | Response format validated |
| CC5 | Error responses use error codes | Error format validated |
| CC6 | Build passes for all packages | `pnpm build` succeeds |
| CC7 | Tests pass | `pnpm test` passes |

---

## Notes

- This is a FOUNDATION story - all future API work depends on it
- DO NOT create entity types from scratch - extract from existing implementation
- The shared package enables frontend-backend type safety
- Error codes enable future localization (Bengali support)

---

**Story Created:** 2026-05-03  
**Status:** ready-for-dev  
**Next:** Run `dev-story 6.2` to implement