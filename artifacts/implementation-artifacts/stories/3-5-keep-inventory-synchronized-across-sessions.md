# Story 3.5: Keep inventory synchronized across sessions

**Status**: ready-for-dev
**Story ID**: 3.5
**Story Key**: 3-5-keep-inventory-synchronized-across-sessions
**Epic**: Epic 3 - Cart, Waitlist, and Purchase Readiness
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a shopper,**
**I want the cart to reflect live inventory changes,**
**So that I do not waste time on unavailable items.**

### Business Context

This story addresses the critical requirement of real-time inventory synchronization to prevent overselling — one of the most common ecommerce failures. This directly addresses FR77 from the requirements.

Key business value:
- Prevents overselling and customer disappointment
- Builds trust through accurate availability display
- Reduces order cancellations and refund requests
- Supports the pre-order and waitlist system from Story 3.4
- Enables accurate delivery promises

This story depends on:
- Story 3.1 (cart data structure and persistence)
- Story 3.2 (cart quantity editing)
- Story 3.4 (pre-orders and waitlists - for restock notifications)

This story enables:
- Epic 4 checkout (accurate stock at payment time)
- Order fulfillment (no phantom stock)

### Acceptance Criteria

#### AC1: Cart Inventory Refresh

**Given** I have items in my cart
**When** I return to the cart page after inventory changes
**Then** the latest availability status is shown for each item
**And** any out-of-stock items are clearly marked

#### AC2: Checkout Inventory Validation

**Given** I proceed to checkout with items in cart
**When** the checkout page loads
**Then** inventory is re-validated before payment
**And** any unavailable items are removed with notification

#### AC3: Low Stock Warning

**Given** an item in my cart reaches low stock threshold
**When** I view the cart
**Then** I see a warning about limited availability
**And** the warning shows remaining quantity if known

#### AC4: Out of Stock Handling

**Given** an item in my cart becomes out of stock
**When** I view the cart or checkout
**Then** the item is clearly marked as unavailable
**And** I am given options: remove, waitlist (if available), or find alternatives

#### AC5: Session Persistence with Live Sync

**Given** I have items in cart from a previous session
**When** I return and view the cart
**Then** the cart loads with persisted items
**And** inventory is synced on load to show current availability

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR77 | Inventory must synchronize in near real time to prevent overselling |
| FR33 | Stock status must show real-time availability and estimated dispatch time |
| FR41 | Cart must display low-stock warnings |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR4 | Add-to-cart must complete within 1 second |
| NFR77 | Inventory must synchronize in near real time to prevent overselling |
| NFR12 | Cart persistence must survive browser close and remain available for at least 30 days |

---

## Technical Requirements

### Database Schema (Prisma)

This story requires inventory tracking at the variant level:

```prisma
// Inventory model - tracks stock at variant level
model Inventory {
  id              String   @id @default(uuid())
  product_id      String
  variant_id      String?  @nullable
  quantity        Int      @default(0)
  reserved_quantity Int    @default(0) // Quantity in carts/orders
  low_stock_threshold Int  @default(10)
  reorder_point   Int      @default(20)
  last_synced_at  DateTime @default(now())
  created_at      DateTime @default(now())
  updated_at      DateTime @updated_at

  product         Product  @relation(fields: [product_id], references: [id])
  variant         Variant? @relation(fields: [variant_id], references: [id])

  @@unique([product_id, variant_id]) // One inventory per product/variant
  @@index([product_id])
  @@index([variant_id])
}

// Computed available quantity
computed_available: quantity - reserved_quantity
```

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/cart/sync` | POST | Sync cart with latest inventory |
| `/api/v1/inventory/bulk` | POST | Get inventory for multiple items |
| `/api/v1/inventory/:productId` | GET | Get inventory for single product |
| `/api/v1/inventory/:productId/variant/:variantId` | GET | Get inventory for specific variant |

#### POST /api/v1/cart/sync

**Request:**
```json
{
  "items": [
    { "productId": "prod_123", "variantId": "var_456", "quantity": 2 }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "syncedItems": [
      {
        "productId": "prod_123",
        "variantId": "var_456",
        "requestedQuantity": 2,
        "availableQuantity": 5,
        "status": "AVAILABLE",
        "lowStock": false
      },
      {
        "productId": "prod_789",
        "variantId": null,
        "requestedQuantity": 1,
        "availableQuantity": 0,
        "status": "OUT_OF_STOCK",
        "lowStock": false
      }
    ],
    "warnings": [
      {
        "productId": "prod_123",
        "variantId": "var_456",
        "message": "Only 5 items left in stock"
      }
    ]
  }
}
```

#### GET /api/v1/inventory/bulk

**Request:**
```json
{
  "items": [
    { "productId": "prod_123", "variantId": "var_456" },
    { "productId": "prod_789", "variantId": null }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "inventory": [
      {
        "productId": "prod_123",
        "variantId": "var_456",
        "quantity": 5,
        "available": 5,
        "reserved": 0,
        "lowStock": false,
        "inStock": true
      },
      {
        "productId": "prod_789",
        "variantId": null,
        "quantity": 0,
        "available": 0,
        "reserved": 0,
        "lowStock": false,
        "inStock": false
      }
    ]
  }
}
```

### Real-Time Sync Strategy

1. **Cart Load Sync**: On cart page load, fetch latest inventory for all items
2. **Checkout Validation**: Re-validate inventory before payment processing
3. **Periodic Background Sync**: Every 30 seconds for active cart sessions
4. **Optimistic Locking**: Reserve stock when adding to cart, release on timeout

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Continue using `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (inventories)
4. **API Versioning**: All endpoints under `/api/v1/`
5. **Authentication**: Cart sync works for both guests and authenticated users
6. **Validation**: Zod schemas for all request bodies
7. **Rate Limiting**: 60 requests/minute for inventory checks

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── cart/
│       │   │   ├── components/
│       │   │   │   ├── cart-item.tsx (update - add inventory status)
│       │   │   │   ├── cart-list.tsx (update - add sync on load)
│       │   │   │   ├── low-stock-warning.tsx (new)
│       │   │   │   ├── out-of-stock-item.tsx (new)
│       │   │   │   └── inventory-status-badge.tsx (new)
│       │   │   ├── hooks/
│       │   │   │   ├── use-cart-sync.ts (new)
│       │   │   │   └── use-inventory-check.ts (new)
│       │   │   └── types/
│       │   │       └── index.ts (extend with inventory types)
│       │   └── checkout/
│       │       └── components/
│       │           └── checkout-items.tsx (update - add inventory validation)
│       └── lib/
│           └── api-client.ts (extend with inventory endpoints)
│
├── server/
│   └── src/
│       ├── controllers/
│       │   ├── cart-controller.ts (update - add sync endpoint)
│       │   └── inventory-controller.ts (new)
│       ├── services/
│       │   ├── cart-service.ts (update - add inventory sync)
│       │   ├── inventory-service.ts (new)
│       │   └── order-service.ts (update - add stock reservation)
│       ├── repositories/
│       │   ├── cart-repository.ts (update - add inventory joins)
│       │   └── inventory-repository.ts (new)
│       └── routes/
│           ├── cart-routes.ts (update - add sync route)
│           └── inventory-routes.ts (new)
│
└── shared/
    └── src/
        └── types/
            ├── inventory.ts (new)
            └── cart.ts (extend)
```

### State Management

- **TanStack Query**: Inventory checks with 30-second stale time
- **Zustand**: Cart store with inventory status
- **React Context**: Sync status for UI feedback

---

## Previous Story Intelligence

### From Story 3.4 (Pre-orders and waitlists)

**Key Learnings:**

1. **Inventory Model**: Pre-order story already defined the inventory model structure
2. **Stock Status Display**: Product detail shows real-time availability
3. **Waitlist Integration**: Out-of-stock triggers waitlist option
4. **Notification System**: Stock changes trigger notifications

**Reuse for Story 3.5:**

- Extend the inventory model from Story 3.4
- Use the same notification triggers for low stock
- Reuse the inventory check patterns for cart validation

### From Story 3.2 (Cart quantities)

**Key Learnings:**

1. **Optimistic Updates**: Immediate UI feedback before server confirmation
2. **Quantity Validation**: Min/max bounds checking
3. **Error Recovery**: Rollback on failure with user notification

**Reuse for Story 3.5:**

- Apply validation patterns when checking inventory availability
- Handle out-of-stock gracefully with user notification
- Use rollback pattern if inventory check fails

### From Story 3.1 (Cart persistence)

**Key Learnings:**

1. **30-day Persistence**: Cart survives browser close
2. **Guest Cart**: Works without authentication
3. **TanStack Query Integration**: Server state management

**Reuse for Story 3.5:**

- Sync inventory on cart load for both guest and authenticated
- Use TanStack Query for inventory fetching
- Handle guest cart inventory sync

### From Epic 2 (Product Catalog)

**Key Learnings:**

1. **Stock Status Display**: Real-time availability on product pages
2. **Variant Selection**: Dynamic availability updates

**Reuse for Story 3.5:**

- Cart shows variant-specific inventory
- Low stock warnings consistent with product page

---

## Implementation Checklist

### Backend Tasks

- [ ] Add inventory model to Prisma schema (extend from Story 3.4)
- [ ] Run Prisma migration for inventory table
- [ ] Implement GET /api/v1/inventory/:productId endpoint
- [ ] Implement GET /api/v1/inventory/bulk endpoint
- [ ] Implement POST /api/v1/cart/sync endpoint
- [ ] Create inventory-service.ts with business logic
- [ ] Create inventory-repository.ts for database queries
- [ ] Add inventory validation to cart operations
- [ ] Add stock reservation during checkout
- [ ] Add release reservation on timeout
- [ ] Add rate limiting for inventory endpoints

### Frontend Tasks

- [ ] Update cart-item.tsx to show inventory status
- [ ] Create low-stock-warning.tsx component
- [ ] Create out-of-stock-item.tsx component
- [ ] Create inventory-status-badge.tsx component
- [ ] Create use-cart-sync.ts hook
- [ ] Create use-inventory-check.ts hook
- [ ] Update cart-list.tsx to sync on load
- [ ] Update checkout-items.tsx to validate inventory
- [ ] Add inventory types to shared types

### UX/UI Tasks

- [ ] Cart shows green "In Stock" badge for available items
- [ ] Cart shows yellow "Low Stock" warning for low items
- [ ] Cart shows red "Out of Stock" badge for unavailable items
- [ ] Out-of-stock items show remove/waitlist options
- [ ] Sync indicator shows when checking inventory
- [ ] Error state shows retry option
- [ ] Mobile responsive layout works
- [ ] Loading skeletons during inventory fetch

---

## Success Criteria

The inventory synchronization feature is complete when:

1. **Cart Load Sync**: Cart fetches latest inventory on page load
2. **Stock Status Display**: Each cart item shows current availability
3. **Low Stock Warning**: Items with <10 stock show warning
4. **Out of Stock Handling**: Unavailable items clearly marked with options
5. **Checkout Validation**: Inventory re-validated before payment
6. **Guest Support**: Inventory sync works for guest carts
7. **Session Persistence**: Cart items sync on return visit
8. **Mobile**: Works on mobile devices
9. **Performance**: Inventory sync completes within 1 second
10. **Error Handling**: Graceful error states with retry options

---

## Integration Points

### With Epic 1 (Authentication)

- Guest cart inventory sync
- Authenticated user cart sync

### With Epic 2 (Product Catalog)

- Product detail stock status
- Variant-level inventory

### With Story 3.1 (Cart persistence)

- Cart load triggers inventory sync
- Cart items persist with inventory status

### With Story 3.2 (Quantity edit)

- Quantity changes trigger inventory re-check
- Max quantity limited by available stock

### With Story 3.4 (Pre-orders and waitlists)

- Out-of-stock triggers waitlist option
- Restock notifications update cart status

### With Epic 4 (Checkout)

- Inventory validated before payment
- Stock reserved during checkout process

### With Epic 5 (Orders)

- Reserved stock converts to ordered quantity
- Order fulfillment updates inventory

---

## Edge Cases to Handle

1. **Concurrent Purchase**: Two users buy last item simultaneously — first wins, second gets out-of-stock
2. **Inventory Sync Failure**: Network error during sync — show cached data with warning
3. **Partial Inventory Data**: Some products return inventory, others fail — show available data
4. **Guest Cart Expiry**: Cart expires after 30 days — re-validate on return
5. **Variant Discontinuation**: Product variant discontinued — show "no longer available"
6. **Bulk Add to Cart**: Adding multiple items — sync inventory for all items
7. **Mobile Network**: Slow connection — show loading state, allow retry
8. **Price Changes**: Inventory sync doesn't affect price — only availability
9. **API Timeout**: Inventory check times out — use cached data with warning
10. **Zero Quantity**: Product with 0 stock but available for pre-order — show pre-order option

---

## Notes

- Consider Redis caching for high-traffic inventory checks
- Monitor inventory sync performance in production
- Track overselling incidents for system improvement
- Consider inventory analytics for demand forecasting
- Test concurrent purchase scenarios thoroughly

- **Status**: ready-for-dev
- **Story Context**: Full implementation context created - ready for dev agent execution