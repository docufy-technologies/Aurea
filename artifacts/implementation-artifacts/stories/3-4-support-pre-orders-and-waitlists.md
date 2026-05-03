# Story 3.4: Support pre-orders and waitlists

**Status**: ready-for-dev
**Story ID**: 3.4
**Story Key**: 3-4-support-pre-orders-and-waitlists
**Epic**: Epic 3 - Cart, Waitlist, and Purchase Readiness
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a shopper,**
**I want to pre-order out-of-stock items or join a waitlist,**
**so that I can secure products when they return.**

### Business Context

This story handles the pre-order and waitlist functionality — critical for managing customer demand when products are temporarily unavailable. This directly addresses FR75 and FR76 from the requirements.

Key business value:
- Captures demand for out-of-stock items
- Reduces lost sales from stockouts
- Provides inventory planning signals
- Improves customer retention through proactive communication
- Differentiates from competitors who simply show "out of stock"

This story depends on:
- Story 3.1 (cart data structure)
- Story 3.2 (cart page infrastructure)
- Story 3.3 (empty cart patterns for UI consistency)

### Acceptance Criteria

#### AC1: Pre-order Option Display

**Given** a product is available for pre-order
**When** I view the product page
**Then** I see the pre-order option with the replenishment timeline
**And** the expected dispatch date is clearly visible

#### AC2: Pre-order Confirmation

**Given** I choose the pre-order option
**When** I confirm the pre-order
**Then** the pre-order is recorded successfully
**And** I receive a confirmation with the expected timeline

#### AC3: Waitlist Join

**Given** a product is not yet restocked
**When** I join the waitlist
**Then** my subscription is recorded
**And** I receive a confirmation of my position

#### AC4: Waitlist Notifications

**Given** I am on the waitlist
**When** the product becomes available
**Then** I receive an availability notification
**And** the notification includes a direct link to purchase

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR75 | Pre-orders must be supported for upcoming or out-of-stock items with replenishment timelines |
| FR76 | Waitlists must allow customers to subscribe and receive availability notifications |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR4 | Pre-order and waitlist operations must complete within 1 second |
| NFR77 | Inventory must synchronize in near real time to prevent overselling |

---

## Technical Requirements

### Database Schema (Prisma)

This story requires new models for pre-orders and waitlists:

```prisma
// Pre-order model
model PreOrder {
  id              String   @id @default(uuid())
  user_id         String?  @nullable // null for guest users
  product_id      String
  variant_id      String?  @nullable
  quantity        Int      @default(1)
  status          PreOrderStatus @default(PENDING)
  expected_date   DateTime
  created_at      DateTime @default(now())
  updated_at      DateTime @updated_at

  user            User?    @relation(fields: [user_id], references: [id])
  product         Product  @relation(fields: [product_id], references: [id])
  variant         Variant? @relation(fields: [variant_id], references: [id])

  @@index([user_id])
  @@index([product_id])
  @@index([status])
}

enum PreOrderStatus {
  PENDING
  CONFIRMED
  CANCELLED
  FULFILLED
  EXPIRED
}

// Waitlist model
model Waitlist {
  id              String   @id @default(uuid())
  user_id         String?  @nullable // null for guest users
  email           String
  product_id      String
  variant_id      String?  @nullable
  status          WaitlistStatus @default(ACTIVE)
  notified_at     DateTime? @nullable
  created_at      DateTime @default(now())
  updated_at      DateTime @updated_at

  user            User?    @relation(fields: [user_id], references: [id])
  product         Product  @relation(fields: [product_id], references: [id])
  variant         Variant? @relation(fields: [variant_id], references: [id])

  @@unique([email, product_id, variant_id]) // One waitlist per email per product/variant
  @@index([product_id])
  @@index([status])
}

enum WaitlistStatus {
  ACTIVE
  NOTIFIED
  CONVERTED // Purchased
  EXPIRED
}

// Product model extension - add pre-order fields
model Product {
  // ... existing fields
  allow_pre_order     Boolean  @default(false)
  pre_order_deadline  DateTime? @nullable
  expected_re_stock   DateTime? @nullable
}
```

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/products/:id/pre-order-eligibility` | GET | Check if product supports pre-order |
| `/api/v1/pre-orders` | POST | Create a pre-order |
| `/api/v1/pre-orders` | GET | List user's pre-orders (auth required) |
| `/api/v1/pre-orders/:id` | GET | Get pre-order details |
| `/api/v1/pre-orders/:id/cancel` | POST | Cancel a pre-order |
| `/api/v1/waitlist` | POST | Join waitlist |
| `/api/v1/waitlist` | GET | List user's waitlist entries (auth required) |
| `/api/v1/waitlist/check` | GET | Check waitlist status by email (guest) |

#### GET /api/v1/products/:id/pre-order-eligibility

**Response (200):**
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "reason": null,
    "preOrderInfo": {
      "allowed": true,
      "deadline": "2026-06-15T00:00:00Z",
      "expectedDispatch": "2026-06-20T00:00:00Z",
      "maxQuantity": 5
    }
  }
}
```

#### POST /api/v1/pre-orders

**Request:**
```json
{
  "productId": "prod_123",
  "variantId": "var_456",
  "quantity": 2
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "preOrder": {
      "id": "po_abc123",
      "status": "CONFIRMED",
      "expectedDate": "2026-06-20T00:00:00Z",
      "createdAt": "2026-05-03T12:00:00Z"
    }
  }
}
```

#### POST /api/v1/waitlist

**Request:**
```json
{
  "productId": "prod_123",
  "variantId": "var_456",
  "email": "customer@example.com"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "waitlist": {
      "id": "wl_xyz789",
      "position": 5,
      "status": "ACTIVE",
      "createdAt": "2026-05-03T12:00:00Z"
    }
  }
}
```

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Continue using `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (pre_orders, waitlists)
4. **API Versioning**: All endpoints under `/api/v1/`
5. **Authentication**: Pre-orders require auth; waitlist supports guest with email
6. **Validation**: Zod schemas for all request bodies
7. **Rate Limiting**: 10 requests/minute for write operations

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── cart/
│       │   │   ├── components/
│       │   │   │   ├── pre-order-button.tsx (new)
│       │   │   │   ├── pre-order-dialog.tsx (new)
│       │   │   │   ├── waitlist-button.tsx (new)
│       │   │   │   ├── waitlist-dialog.tsx (new)
│       │   │   │   ├── pre-order-confirmation.tsx (new)
│       │   │   │   └── my-pre-orders.tsx (new)
│       │   │   ├── hooks/
│       │   │   │   ├── use-pre-order.ts (new)
│       │   │   │   ├── use-waitlist.ts (new)
│       │   │   │   └── use-my-pre-orders.ts (new)
│       │   │   └── types/
│       │   │       └── index.ts (extend with pre-order/waitlist types)
│       │   └── products/
│       │       └── components/
│       │           └── product-detail.tsx (update - add pre-order/waitlist UI)
│       └── pages/
│           └── account/
│               └── pre-orders.tsx (new - view pre-orders)
│
├── server/
│   └── src/
│       ├── controllers/
│       │   ├── pre-order-controller.ts (new)
│       │   └── waitlist-controller.ts (new)
│       ├── services/
│       │   ├── pre-order-service.ts (new)
│       │   ├── waitlist-service.ts (new)
│       │   └── notification-service.ts (extend for waitlist alerts)
│       ├── repositories/
│       │   ├── pre-order-repository.ts (new)
│       │   └── waitlist-repository.ts (new)
│       └── routes/
│           ├── pre-order-routes.ts (new)
│           └── waitlist-routes.ts (new)
│
└── shared/
    └── src/
        └── types/
            ├── pre-order.ts (new)
            └── waitlist.ts (new)
```

### State Management

- **TanStack Query**: Pre-order and waitlist mutations with optimistic updates
- **React Context**: Auth state for personalized pre-order history
- **Zustand**: UI state for pre-order/waitlist dialogs

---

## Previous Story Intelligence

### From Story 3.3 (Empty cart)

**Key Learnings:**

1. **TanStack Query Pattern**: useQuery with proper stale times (5 minutes for catalog data)
2. **Error Handling**: Error codes with user-friendly messages
3. **Component Structure**: Feature-based organization with hooks
4. **API Response Format**: Success wrapper with metadata
5. **Loading States**: Skeleton loaders for better UX
6. **Dialog Pattern**: Modal dialogs for user interactions

**Files Created in Story 3.3:**

- `packages/web/src/features/cart/components/empty-cart.tsx`
- `packages/web/src/features/cart/components/featured-collection-card.tsx`
- `packages/web/src/features/cart/hooks/use-featured-collections.ts`
- `packages/server/src/controllers/product-controller.ts` (featured endpoints)

**Reuse for Story 3.4:**

- Dialog pattern from empty cart for pre-order/waitlist modals
- Loading skeleton patterns
- Error handling from featured collections
- TanStack Query hooks structure

### From Story 3.2 (Cart quantities)

**Key Learnings:**

1. **Optimistic Updates**: Immediate UI feedback before server confirmation
2. **Quantity Validation**: Min/max bounds checking
3. **Error Recovery**: Rollback on failure with user notification

**Reuse for Story 3.4:**

- Optimistic update pattern for pre-order submission
- Validation patterns for quantity limits

### From Epic 2 (Product Catalog)

**Key Learnings:**

1. **Product Status Display**: Stock status on product pages
2. **Variant Selection**: Dynamic availability updates

**Reuse for Story 3.4:**

- Product page integration for pre-order/waitlist buttons
- Variant-aware pre-order and waitlist

---

## Implementation Checklist

### Backend Tasks

- [ ] Add pre_order and waitlist models to Prisma schema
- [ ] Run Prisma migration for new tables
- [ ] Implement GET /api/v1/products/:id/pre-order-eligibility endpoint
- [ ] Implement POST /api/v1/pre-orders endpoint
- [ ] Implement GET /api/v1/pre-orders endpoint (auth required)
- [ ] Implement POST /api/v1/pre-orders/:id/cancel endpoint
- [ ] Implement POST /api/v1/waitlist endpoint
- [ ] Implement GET /api/v1/waitlist endpoint (auth required)
- [ ] Implement GET /api/v1/waitlist/check endpoint (guest support)
- [ ] Create pre-order-service.ts with business logic
- [ ] Create waitlist-service.ts with business logic
- [ ] Add notification trigger when product restocks
- [ ] Add rate limiting for pre-order and waitlist endpoints

### Frontend Tasks

- [ ] Create pre-order-button.tsx component
- [ ] Create pre-order-dialog.tsx modal
- [ ] Create waitlist-button.tsx component
- [ ] Create waitlist-dialog.tsx modal
- [ ] Create pre-order-confirmation.tsx component
- [ ] Create my-pre-orders.tsx page component
- [ ] Create use-pre-order.ts hook
- [ ] Create use-waitlist.ts hook
- [ ] Create use-my-pre-orders.ts hook
- [ ] Update product-detail.tsx to show pre-order/waitlist options
- [ ] Add pre-order and waitlist types to shared types

### UX/UI Tasks

- [ ] Pre-order button shows on eligible products
- [ ] Pre-order dialog shows timeline and quantity
- [ ] Waitlist button shows on out-of-stock products
- [ ] Waitlist dialog captures email for guests
- [ ] Confirmation shows expected timeline
- [ ] My pre-orders page shows all active pre-orders
- [ ] Mobile responsive layout works
- [ ] Loading states show skeletons
- [ ] Error states show user-friendly messages
- [ ] Success notifications after pre-order/waitlist creation

---

## Success Criteria

The pre-order and waitlist feature is complete when:

1. **Pre-order Display**: Eligible products show pre-order option with timeline
2. **Pre-order Creation**: Users can successfully create pre-orders
3. **Pre-order Confirmation**: Confirmation shows expected dispatch date
4. **Pre-order Cancellation**: Users can cancel pending pre-orders
5. **Waitlist Join**: Guests and logged-in users can join waitlist
6. **Waitlist Position**: Users see their position in queue
7. **Notifications**: Waitlist receives notification when stock returns
8. **My Pre-orders**: Users can view their pre-order history
9. **Mobile**: Works on mobile devices
10. **Performance**: Operations complete within 1 second
11. **Error Handling**: Graceful error states with recovery options

---

## Integration Points

### With Epic 1 (Authentication)

- User login state for pre-order history
- Guest support for waitlist with email capture

### With Epic 2 (Product Catalog)

- Product detail page integration
- Stock status triggers pre-order/waitlist visibility
- Variant-aware pre-order and waitlist

### With Story 3.1 (Cart persistence)

- Pre-orders stored separately from cart
- Pre-order history accessible from account

### With Story 3.2 (Quantity edit)

- Quantity validation for pre-orders
- Max quantity limits

### With Epic 4 (Checkout)

- Pre-orders convert to orders when fulfilled
- Waitlist notification includes direct purchase link

### With Epic 5 (Orders)

- Pre-order fulfillment triggers order creation
- Pre-order status visible in order history

---

## Edge Cases to Handle

1. **Pre-order Deadline Passed**: Show "Pre-order closed" instead of option
2. **Product Becomes Available**: Convert pre-order to regular order or notify
3. **Guest Waitlist**: Allow email-based waitlist without account
4. **Duplicate Waitlist**: Prevent same email joining multiple times
5. **Pre-order Quantity Limit**: Enforce max quantity per user
6. **Stock Conflict**: If pre-order quantity exceeds restocked amount, queue by time
7. **Pre-order Expiry**: Auto-cancel pre-orders not fulfilled within 30 days
8. **Notification Failure**: Retry notification on failure, log for monitoring
9. **API Timeout**: Show retry option with clear error
10. **Mobile View**: Stack dialog content vertically on small screens

---

## Notes

- Pre-orders should capture demand signal for inventory planning
- Consider analytics for pre-order conversion rate
- Track waitlist → purchase conversion for optimization
- Test notification delivery reliability
- Consider pre-order deposit or payment at time of order vs fulfillment

- **Status**: ready-for-dev
- **Story Context**: Full implementation context created - ready for dev agent execution