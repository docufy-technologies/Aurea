# Story 5.3: Modify or cancel eligible orders

**Status**: ready-for-dev
**Story ID**: 5.3
**Story Key**: 5-3-modify-or-cancel-eligible-orders
**Epic**: Epic 5 - Orders, Tracking, Returns, and Recovery
**Generated**: 2026-05-04

---

## Story Requirements

### User Story Statement

**As a customer,**
**I want to change my address or cancel before processing,**
**so that I can fix mistakes in time.**

### Business Context

This story implements order modification and cancellation capabilities — the critical post-purchase flexibility that allows customers to correct mistakes before fulfillment begins. It builds on Stories 5.1 (order confirmation) and 5.2 (live order status) where customers receive their order number and can track progress. The modification feature addresses the common scenario where customers realize they've entered the wrong address after placing an order.

Key business value: Order modification reduces customer frustration and prevents failed deliveries. Cancellation allows customers to change their mind before processing, with clear refund timelines. Both features reduce customer support inquiries and improve the overall post-purchase experience. This story also supports Story 5.4 (refunds and returns) by establishing the refund timeline rules.

### Acceptance Criteria

#### AC1: Address Modification Within Window

**Given** the order is still within the modification window
**When** I update the address
**Then** the change is validated for serviceability
**And** any fee difference is recalculated before confirmation

#### AC2: Order Cancellation Before Processing

**Given** the order has not started processing
**When** I cancel it
**Then** cancellation is accepted
**And** refund timing follows the published rules

#### AC3: Modification Window Display

**Given** an order exists
**When** the customer views the order detail
**Then** the modification window status is clearly shown
**And** the deadline for modifications is displayed

#### AC4: Cancellation Confirmation

**Given** a customer initiates cancellation
**When** the cancellation is processed
**Then** a confirmation is shown with refund timeline
**And** the order status updates to CANCELLED

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR69 | Order address changes must be supported within the allowed modification window |
| FR70 | Order cancellation must be supported before processing begins |
| FR71 | Cancellation refunds must follow the standard refund timeline |
| FR116 | Order modification windows must be tightly constrained to preserve fulfillment integrity |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR14 | Customer satisfaction should target 85% or higher |
| NFR15 | Refunds to the original payment method should complete within 14 business days |

---

## Technical Requirements

### Database Schema (Prisma)

The Order model from Stories 5.1 and 5.2 already exists. This story adds modification window tracking and cancellation logic.

```prisma
// Existing from Stories 5.1 and 5.2 - no changes needed
model Order {
  id              String        @id @default(uuid())
  orderNumber     String        @unique @map("order_number")
  userId          String?       @map("user_id")
  guestEmail      String?       @map("guest_email")
  guestToken      String?       @map("guest_token")
  status          OrderStatus  @default(PENDING)
  // ... other fields from Stories 5.1 and 5.2

  // New fields for Story 5.3
  modificationWindowEnds DateTime? @map("modification_window_ends")
  canModify             Boolean   @default(true) @map("can_modify")
  canCancel             Boolean   @default(true) @map("can_cancel")
  cancellationReason    String?   @map("cancellation_reason")
  cancelledAt           DateTime? @map("cancelled_at")
  cancelledBy           String?   @map("cancelled_by")

  items           OrderItem[]
  payments        Payment[]
  statusHistory   OrderStatusHistory[]

  user            User?        @relation(fields: [userId], references: [id])
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  @@index([userId])
  @@index([orderNumber])
  @@map("orders")
}

// Extend OrderStatus enum if needed
enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
  REFUNDED
  PARTIALLY_REFUNDED
}
```

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/orders/:orderNumber` | GET | Get order details (already exists from Story 5.1) |
| `/api/v1/orders/:orderNumber/modify-address` | PATCH | Update shipping address |
| `/api/v1/orders/:orderNumber/cancel` | POST | Cancel the order |
| `/api/v1/orders/:orderNumber/modification-status` | GET | Check if order is still modifiable |

#### PATCH /api/v1/orders/:orderNumber/modify-address

**Request:** Auth header required

**Body:**
```json
{
  "shippingAddress": {
    "name": "John Doe",
    "street": "456 New Street",
    "area": "Banani",
    "city": "Dhaka",
    "district": "Dhaka",
    "phone": "+8801XXXXXXXXX",
    "deliveryInstructions": "Leave at door"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orderNumber": "AUREA-20260503-0001",
    "previousAddress": {
      "street": "123 Old Street",
      "area": "Gulshan",
      "city": "Dhaka"
    },
    "newAddress": {
      "street": "456 New Street",
      "area": "Banani",
      "city": "Dhaka"
    },
    "feeDifference": 0,
    "newTotal": 12650,
    "message": "Address updated successfully"
  },
  "metadata": {}
}
```

**Response (409 - Outside modification window):**
```json
{
  "success": false,
  "error": {
    "code": "MODIFICATION_WINDOW_CLOSED",
    "message": "The modification window has closed. Order is now being processed.",
    "details": {
      "windowEndedAt": "2026-05-03T14:00:00Z"
    }
  }
}
```

**Response (422 - Address not serviceable):**
```json
{
  "success": false,
  "error": {
    "code": "ADDRESS_NOT_SERVICEABLE",
    "message": "The new address is not serviceable for delivery.",
    "details": {
      "unserviceableAreas": ["Some Area"]
    }
  }
}
```

#### POST /api/v1/orders/:orderNumber/cancel

**Request:** Auth header required

**Body:**
```json
{
  "reason": "Changed my mind",
  "confirm": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orderNumber": "AUREA-20260503-0001",
    "status": "CANCELLED",
    "refundAmount": 12650,
    "refundMethod": "original_payment",
    "refundTimeline": "14 business days",
    "refundTo": "Card ending in 4242",
    "message": "Order cancelled successfully. Refund will be processed within 14 business days."
  },
  "metadata": {}
}
```

**Response (409 - Cannot cancel):**
```json
{
  "success": false,
  "error": {
    "code": "CANCELLATION_NOT_ALLOWED",
    "message": "This order cannot be cancelled as it has already started processing.",
    "details": {
      "currentStatus": "PROCESSING",
      "cancellationEligibleStatuses": ["PENDING", "CONFIRMED"]
    }
  }
}
```

#### GET /api/v1/orders/:orderNumber/modification-status

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orderNumber": "AUREA-20260503-0001",
    "canModify": true,
    "canCancel": true,
    "modificationWindowEnds": "2026-05-03T14:00:00Z",
    "timeRemaining": "2 hours 30 minutes",
    "status": "CONFIRMED"
  },
  "metadata": {}
}
```

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| orderNumber | Must be valid format and exist | ORDER_NOT_FOUND |
| shippingAddress | Must be valid Bangladesh address format | INVALID_ADDRESS |
| shippingAddress | Must pass serviceability check | ADDRESS_NOT_SERVICEABLE |
| cancellation reason | Required, max 500 characters | CANCELLATION_REASON_REQUIRED |
| confirm | Must be true for cancellation | CONFIRMATION_REQUIRED |

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (orders)
4. **API Versioning**: All endpoints under `/api/v1/`
5. **Modification Window**: Set to 2 hours from order confirmation (configurable)
6. **Cancellation Eligibility**: Only PENDING and CONFIRMED orders can be cancelled
7. **Address Serviceability**: Validate new address before allowing modification
8. **Fee Recalculation**: Recalculate shipping if delivery zone changes
9. **Refund Timeline**: Show clear timeline, process within 14 business days
10. **Status History**: Record all modifications and cancellations in OrderStatusHistory

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── orders/
│       │   │   ├── components/
│       │   │   │   ├── order-modification-banner.tsx
│       │   │   │   ├── address-edit-form.tsx
│       │   │   │   ├── cancellation-dialog.tsx
│       │   │   │   ├── modification-timer.tsx
│       │   │   │   └── refund-info.tsx
│       │   │   ├── hooks/
│       │   │   │   ├── use-order-modification.ts
│       │   │   │   └── use-order-cancellation.ts
│       │   │   └── pages/
│       │   │       └── order-detail.tsx (extend from Story 5.1)
│       │   └── checkout/
│       │       └── pages/
│       │           └── success.tsx (extend with modification link)
│       └── lib/
│           └── api-client.ts (extend with modification endpoints)
│
├── server/
│   └── src/
│       ├── controllers/
│       │   ├── order-controller.ts (extend with modification endpoints)
│       │   └── modification-controller.ts
│       ├── services/
│       │   ├── order-service.ts (extend with modification logic)
│       │   ├── modification-service.ts
│       │   ├── address-service.ts (for serviceability check)
│       │   └── refund-service.ts
│       ├── repositories/
│       │   ├── order-repository.ts (extend with modification queries)
│       │   └── refund-repository.ts
│       ├── routes/
│       │   ├── order-routes.ts (extend)
│       │   └── modification-routes.ts
│       └── utils/
│           ├── address-validator.ts
│           └── fee-calculator.ts
│
└── shared/
    └── src/
        └── types/
            ├── order.ts (extend with modification types)
            └── modification.ts
```

### State Management

- **TanStack Query**: Fetch modification status, submit modifications
- **Zustand**: Modification form state, timer state
- **URL State**: Order number in URL for direct linking

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @tanstack/react-query | ^5.x | Modification data fetching |
| date-fns | ^3.x | Modification window countdown |
| zustand | ^4.x | Modification UI state |

---

## Previous Story Intelligence

### From Story 5.2 (Live Order Status)

**Key Learnings:**

1. **Order Model**: Order, OrderItem, OrderStatusHistory already exist
2. **Order Status**: Status enum includes CANCELLED
3. **Tracking API**: GET /api/v1/orders/:orderNumber/status already implemented
4. **Notification Service**: SMS notifications for status changes already exist
5. **Guest Order Lookup**: Pattern established for guest access

**Files Created in Story 5.2:**

- `packages/server/src/models/order.model.ts` (OrderNotification)
- `packages/server/src/services/notification-service.ts`
- `packages/server/src/controllers/logistics-webhook-controller.ts`
- `packages/web/src/features/orders/components/order-status-timeline.tsx`
- `packages/web/src/features/orders/hooks/use-order-status.ts`

**Reuse for Story 5.3:**

- Extend order model with modification window fields
- Reuse order-status-timeline.tsx to show modification status
- Extend notification-service to send cancellation confirmation SMS
- Reuse address validation from Story 4.2 (checkout address)
- Reuse guest order lookup pattern

### From Story 5.1 (Order Confirmation)

**Key Learnings:**

1. **Order Creation**: Order created with initial status
2. **Order Number**: Format AUREA-YYYYMMDD-XXXX
3. **Tracking Number**: Generated on order creation
4. **Confirmation Page**: Shows order details and tracking

**Files Created in Story 5.1:**

- `packages/server/src/models/order.model.ts` (Order, OrderItem, OrderStatusHistory)
- `packages/server/src/services/order-service.ts`
- `packages/server/src/controllers/order-controller.ts`
- `packages/web/src/features/orders/pages/order-detail.tsx`

**Reuse for Story 5.3:**

- Extend order-detail.tsx with modification options
- Use order-service for fetching order details
- Reuse confirmation email pattern for cancellation email

### From Epic 4 (Checkout and Payment)

**Key Learnings:**

1. **Address Form**: Bangladesh address validation from Story 4.2
2. **Serviceability Check**: Address validation for delivery areas
3. **Payment Integration**: Refund processing through SSLCOMMERZ

**Reuse for Story 5.3:**

- Reuse address validation logic
- Reuse serviceability check for address modifications
- Reuse refund processing for cancellations

---

## Git Intelligence Summary

From previous epics, the codebase has:

- Monorepo structure with pnpm workspaces (Story 1.1)
- User authentication with JWT (Epic 1)
- Product, Category, Brand, Variant, Cart, CartItem models (Epics 2, 3)
- Order, OrderItem, OrderStatusHistory models from Stories 4.x, 5.1, 5.2
- Checkout flow with payment integration (Epic 4)
- Order confirmation and tracking from Stories 5.1, 5.2
- Live order status with SMS notifications from Story 5.2
- API response wrapper pattern consistently used
- TanStack Query for data fetching
- Zustand for client state
- Address validation and serviceability checks from Story 4.2

For this story, we need to:

- Add modification window fields to Order model
- Create modification service for address changes
- Create cancellation service with refund logic
- Create PATCH /api/v1/orders/:orderNumber/modify-address endpoint
- Create POST /api/v1/orders/:orderNumber/cancel endpoint
- Create GET /api/v1/orders/:orderNumber/modification-status endpoint
- Add address serviceability validation
- Calculate fee differences for address changes
- Implement refund processing for cancellations
- Create frontend modification UI components
- Add modification timer to order detail page
- Create cancellation confirmation dialog

---

## Latest Tech Information

### Modification Window UX (2026)

```tsx
const ModificationBanner = ({ order, timeRemaining }) => {
  const isUrgent = timeRemaining.includes('hour') && !timeRemaining.includes('hours');

  return (
    <div className={cn("modification-banner", isUrgent && "urgent")}>
      <ClockIcon />
      <div className="modification-content">
        <h3>You can still modify this order</h3>
        <p>
          {timeRemaining} remaining to change address or cancel
        </p>
      </div>
      <div className="modification-actions">
        <Button variant="outline" onClick={onEditAddress}>
          Edit Address
        </Button>
        <Button variant="destructive" onClick={onCancel}>
          Cancel Order
        </Button>
      </div>
    </div>
  );
};
```

### Cancellation Flow UX

```tsx
const CancellationDialog = ({ order, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);

  const handleConfirm = () => {
    if (!confirmChecked) return;
    onConfirm({ reason, confirm: true });
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Order</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel order {order.orderNumber}?
          </DialogDescription>
        </DialogHeader>

        <div className="refund-info">
          <h4>Refund Details</h4>
          <p>Amount: {formatCurrency(order.total)}</p>
          <p>Method: Original payment method</p>
          <p>Timeline: Within 14 business days</p>
        </div>

        <Textarea
          placeholder="Why are you cancelling? (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <label className="confirm-checkbox">
          <input
            type="checkbox"
            checked={confirmChecked}
            onChange={(e) => setConfirmChecked(e.target.checked)}
          />
          I understand that this action cannot be undone
        </label>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Keep Order
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!confirmChecked}
          >
            Confirm Cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

### Address Modification Fee Calculation

```typescript
const calculateFeeDifference = async (orderId, newAddress) => {
  const order = await getOrder(orderId);
  const currentDeliveryZone = getDeliveryZone(order.shippingAddress);
  const newDeliveryZone = getDeliveryZone(newAddress);

  if (currentDeliveryZone === newDeliveryZone) {
    return { difference: 0, reason: 'Same delivery zone' };
  }

  const currentShipping = order.shippingCost;
  const newShipping = await getShippingCost(newDeliveryZone, order.deliveryMethod);

  return {
    difference: newShipping - currentShipping,
    reason: `Delivery zone changed from ${currentDeliveryZone} to ${newDeliveryZone}`,
    newTotal: order.subtotal + newShipping - order.discount
  };
};
```

---

## Implementation Checklist

### Backend Tasks

- [ ] Add modification window fields to Order model in Prisma schema
- [ ] Create database migration
- [ ] Extend order-repository with modification queries
- [ ] Create modification-service with address change logic
- [ ] Create address-service for serviceability validation
- [ ] Create refund-service for cancellation refunds
- [ ] Create PATCH /api/v1/orders/:orderNumber/modify-address endpoint
- [ ] Create POST /api/v1/orders/:orderNumber/cancel endpoint
- [ ] Create GET /api/v1/orders/:orderNumber/modification-status endpoint
- [ ] Implement modification window check (default 2 hours from CONFIRMED)
- [ ] Implement address serviceability validation
- [ ] Implement fee difference calculation for zone changes
- [ ] Implement cancellation eligibility check (PENDING, CONFIRMED only)
- [ ] Implement refund processing for cancellations
- [ ] Record status changes in OrderStatusHistory
- [ ] Send cancellation confirmation email
- [ ] Send cancellation SMS notification
- [ ] Test address modification API
- [ ] Test cancellation API
- [ ] Test modification window expiration

### Frontend Tasks

- [ ] Create order-modification-banner.tsx component
- [ ] Create address-edit-form.tsx component
- [ ] Create cancellation-dialog.tsx component
- [ ] Create modification-timer.tsx component
- [ ] Create refund-info.tsx component
- [ ] Create use-order-modification.ts hook
- [ ] Create use-order-cancellation.ts hook
- [ ] Extend order-detail.tsx with modification options
- [ ] Add modification banner to order detail page
- [ ] Add edit address button (when modifiable)
- [ ] Add cancel order button (when cancellable)
- [ ] Show modification timer countdown
- [ ] Handle address modification form
- [ ] Handle cancellation confirmation dialog
- [ ] Show refund information after cancellation
- [ ] Test on mobile devices

### UX/UI Tasks

- [ ] Modification banner visible on eligible orders
- [ ] Timer shows time remaining in human-readable format
- [ ] Urgent state when less than 1 hour remaining
- [ ] Edit address form pre-filled with current address
- [ ] Serviceability validation feedback
- [ ] Fee difference shown before confirmation
- [ ] Cancellation dialog shows refund details
- [ ] Confirmation required before cancellation
- [ ] Cancellation success shows refund timeline
- [ ] Works on mobile
- [ ] Loading states during API calls
- [ ] Error states for failed modifications

---

## Success Criteria

The order modification and cancellation feature is complete when:

1. **Modification Window**: Orders show modification window status and deadline
2. **Address Change**: Customers can update shipping address within window
3. **Serviceability Check**: New address validated before allowing change
4. **Fee Recalculation**: Shipping cost difference calculated for zone changes
5. **Cancellation**: Customers can cancel PENDING and CONFIRMED orders
6. **Refund Info**: Cancellation shows refund amount, method, and timeline
7. **Status Update**: Cancelled orders show CANCELLED status
8. **Notifications**: Cancellation confirmation sent via email and SMS
9. **History**: All modifications and cancellations recorded in timeline
10. **Guest Support**: Guests can modify/cancel their orders
11. **Mobile**: Works on mobile devices

---

## Integration Points

### With Story 5.1 (Order Confirmation)

- Confirmation page links to order detail with modification options
- Modification window starts from order confirmation time

### With Story 5.2 (Live Order Status)

- Status timeline shows modification window
- Cancelled orders stop further status notifications
- Modification status available in status API

### With Story 5.4 (Refunds and Returns)

- Cancellation establishes refund timeline rules
- Partial cancellation for partially fulfilled orders (future)
- Refund status tracking

### With Epic 4 (Checkout and Payment)

- Address validation reused from checkout
- Serviceability check reused from checkout
- Refund processing through payment gateway

### With Epic 1 (Authentication)

- User identified by JWT token
- Authenticated users can modify/cancel their orders
- Guest users use order number + email lookup

---

## Edge Cases to Handle

1. **Modification Window Expired**: Show clear message that window has closed
2. **Order Already Processing**: Prevent modification/cancellation with clear reason
3. **Address Not Serviceable**: Show which areas are not deliverable
4. **Fee Increase**: Require confirmation for additional shipping costs
5. **Partial Cancellation**: Handle orders with some items already shipped (future)
6. **Refund Failure**: Handle payment gateway refund failures gracefully
7. **Guest Order Modification**: Verify email before allowing changes
8. **Concurrent Modifications**: Handle race conditions with idempotency
9. **Network Error**: Show retry option if modification fails
10. **Timer Sync**: Handle timezone differences for modification window

---

## Notes

- Consider adding "last chance" notification when modification window is about to close (30 min)
- Consider adding modification reason for analytics
- Track how often customers modify orders (may indicate checkout UX issues)
- Consider adding "modify delivery time" option (future)
- Consider adding "modify items" option for quantity changes (future)
- Log when customers frequently modify orders (may indicate address entry issues)
- Consider adding "modify payment method" for order changes (future)

- **Status**: ready-for-dev
- **Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created