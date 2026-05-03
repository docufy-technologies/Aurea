# Story 5.2: Display live order status and notifications

**Status**: ready-for-dev
**Story ID**: 5.2
**Story Key**: 5-2-display-live-order-status-and-notifications
**Epic**: Epic 5 - Orders, Tracking, Returns, and Recovery
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a customer,**
**I want to see order progress clearly,**
**so that I know what is happening with my purchase.**

### Business Context

This story implements live order status display and notifications — the critical post-purchase experience that keeps customers informed about their order progress. It builds on Story 5.1 (order confirmation) where customers receive their order number and tracking link. The live status feature provides real-time visibility into order fulfillment, reducing customer anxiety and support inquiries.

Key business value: Live order status improves customer satisfaction by keeping them informed without needing to contact support. SMS notifications for major transitions (confirmed, shipped, out for delivery, delivered) provide proactive updates that build trust. This story also supports Story 5.3 (order modification/cancellation) by showing modification windows and Story 5.4 (refunds and returns) by displaying refund status.

### Acceptance Criteria

#### AC1: Status Timeline Display

**Given** an order exists
**When** the customer views the order tracking page
**Then** the timeline shows all status changes with timestamps
**And** the current status is highlighted prominently

#### AC2: Live Status Updates

**Given** the order status changes
**When** the customer refreshes or returns to the tracking page
**Then** the latest status is displayed immediately
**And** the timeline reflects all intermediate statuses

#### AC3: SMS Notifications for Major Transitions

**Given** the order reaches a major status (CONFIRMED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED)
**When** the status change occurs
**Then** an SMS notification is sent to the customer's registered mobile number
**And** the notification includes order number, current status, and estimated next step

#### AC4: Status Display Names

**Given** each order status in the system
**When** displayed to the customer
**Then** user-friendly labels are shown (e.g., "Out for Delivery" instead of "OUT_FOR_DELIVERY")

#### AC5: Estimated Delivery Update

**Given** the order progresses through fulfillment
**When** a new estimated delivery date is available
**Then** the tracking page shows the updated estimate
**And** previous estimates are visible in the timeline

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR66 | Order status pages must show a timeline with current status |
| FR67 | Tracking updates must include timestamps from logistics providers |
| FR68 | SMS notifications must trigger for major status transitions |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR14 | Customer satisfaction should target 85% or higher |
| NFR7 | Platform uptime must exceed 99.5% excluding scheduled maintenance |

---

## Technical Requirements

### Database Schema (Prisma)

The OrderStatusHistory model from Story 5.1 is already available. This story extends it with logistics timestamps and notification tracking.

```prisma
// Existing from Story 5.1 - no changes needed
model OrderStatusHistory {
  id          String      @id @default(uuid())
  orderId     String      @map("order_id")
  status      OrderStatus @map("status")
  note        String?     @map("note")
  location    String?     @map("location")

  order       Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  createdAt   DateTime    @default(now()) @map("created_at")

  @@index([orderId])
  @@index([createdAt])
  @@map("order_status_history")
}

// New model for notification tracking
model OrderNotification {
  id            String    @id @default(uuid())
  orderId       String    @map("order_id")
  type          NotificationType @map("type")
  channel       Channel   @map("channel")
  recipient     String    @map("recipient")
  status        NotificationStatus @default(PENDING) @map("status")
  message       String    @map("message")
  sentAt        DateTime? @map("sent_at")
  deliveredAt   DateTime? @map("delivered_at")
  failureReason String?  @map("failure_reason")

  order         Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  createdAt     DateTime  @default(now()) @map("created_at")

  @@index([orderId])
  @@index([status])
  @@map("order_notifications")
}

enum NotificationType {
  STATUS_UPDATE
  DELIVERY_ESTIMATE
  DELIVERY_PROOF
  REFUND_UPDATE
}

enum Channel {
  SMS
  EMAIL
  PUSH
}

enum NotificationStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
}
```

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/orders/:orderNumber/status` | GET | Get current order status with timeline |
| `/api/v1/orders/:orderNumber/notifications` | GET | Get notification history for order |
| `/api/v1/orders/:orderNumber/subscribe` | POST | Subscribe to SMS notifications |
| `/api/v1/webhooks/logistics-status` | POST | Receive status updates from logistics |

#### GET /api/v1/orders/:orderNumber/status

**Request:** Auth header for authenticated users, or query param `?email=guest@example.com` for guests

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orderNumber": "AUREA-20260503-0001",
    "currentStatus": "SHIPPED",
    "statusDisplay": "Shipped",
    "statusDescription": "Your order is on its way",
    "estimatedDelivery": "2026-05-08T23:59:59Z",
    "previousEstimate": "2026-05-10T23:59:59Z",
    "timeline": [
      {
        "status": "PENDING",
        "statusDisplay": "Payment Pending",
        "note": "Awaiting payment confirmation",
        "timestamp": "2026-05-03T10:25:00Z",
        "isCompleted": true
      },
      {
        "status": "CONFIRMED",
        "statusDisplay": "Order Confirmed",
        "note": "Order has been confirmed",
        "timestamp": "2026-05-03T10:30:00Z",
        "isCompleted": true
      },
      {
        "status": "PROCESSING",
        "statusDisplay": "Processing",
        "note": "Preparing your order for shipment",
        "timestamp": "2026-05-04T09:00:00Z",
        "isCompleted": true
      },
      {
        "status": "SHIPPED",
        "statusDisplay": "Shipped",
        "note": "Package dispatched via Standard Delivery",
        "location": "Dhaka Sorting Center",
        "timestamp": "2026-05-05T14:30:00Z",
        "isCompleted": false,
        "isCurrent": true
      },
      {
        "status": "OUT_FOR_DELIVERY",
        "statusDisplay": "Out for Delivery",
        "note": "Expected today",
        "timestamp": null,
        "isCompleted": false
      },
      {
        "status": "DELIVERED",
        "statusDisplay": "Delivered",
        "note": null,
        "timestamp": null,
        "isCompleted": false
      }
    ],
    "trackingNumber": "AUREA-TRK-0001",
    "trackingUrl": "https://aurea.com/track/AUREA-TRK-0001",
    "logisticsProvider": "Pathao",
    "logisticsTrackingUrl": "https://pathao.com/track/AUREA-TRK-0001"
  },
  "metadata": {}
}
```

#### POST /api/v1/webhooks/logistics-status

**Request:** Called by logistics provider (Pathao, SSL Commerze Logistics, etc.)

**Body:**
```json
{
  "trackingNumber": "AUREA-TRK-0001",
  "status": "OUT_FOR_DELIVERY",
  "timestamp": "2026-05-08T08:00:00Z",
  "location": "Gulshan Branch",
  "notes": "Package out for delivery",
  "signature": "base64_encoded_signature"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "received",
    "orderId": "uuid-of-order",
    "newStatus": "OUT_FOR_DELIVERY"
  }
}
```

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| orderNumber | Must be valid format and exist | ORDER_NOT_FOUND |
| webhook signature | Must match expected signature | INVALID_WEBHOOK_SIGNATURE |
| phone | Must be valid Bangladesh format | INVALID_PHONE_NUMBER |

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (order_notifications)
4. **API Versioning**: All endpoints under `/api/v1/`
5. **Status Display Names**: Use user-friendly labels, not enum values
6. **Notification Tracking**: Log all SMS/email notifications for audit
7. **Webhook Security**: Validate signatures from logistics providers
8. **Real-time Updates**: Use polling or WebSocket for live status (polling preferred for MVP)

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── orders/
│       │   │   ├── components/
│       │   │   │   ├── order-status-timeline.tsx
│       │   │   │   ├── order-status-card.tsx
│       │   │   │   ├── live-status-badge.tsx
│       │   │   │   ├── notification-preferences.tsx
│       │   │   │   └── estimated-delivery.tsx
│       │   │   ├── hooks/
│       │   │   │   ├── use-order-status.ts
│       │   │   │   └── use-notification-subscribe.ts
│       │   │   └── pages/
│       │   │       └── order-tracking.tsx
│       │   └── checkout/
│       │       └── pages/
│       │           └── success.tsx (already exists from Story 5.1)
│       └── lib/
│           └── api-client.ts (extend with status endpoints)
│
├── server/
│   └── src/
│       ├── controllers/
│       │   ├── order-controller.ts (extend with status endpoints)
│       │   └── logistics-webhook-controller.ts
│       ├── services/
│       │   ├── order-service.ts (extend with status logic)
│       │   ├── notification-service.ts (extend with SMS)
│       │   └── logistics-service.ts
│       ├── repositories/
│       │   ├── order-repository.ts (extend with status queries)
│       │   └── notification-repository.ts
│       ├── routes/
│       │   ├── order-routes.ts (extend)
│       │   └── webhook-routes.ts
│       └── utils/
│           ├── sms-provider.ts (Bangladesh SMS provider)
│           └── webhook-validator.ts
│
└── shared/
    └── src/
        └── types/
            ├── order.ts (extend with status types)
            └── notification.ts
```

### State Management

- **TanStack Query**: Fetch order status with polling (30-second interval for active orders)
- **Zustand**: Notification preferences, last viewed order
- **URL State**: Order number in URL for direct linking

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @tanstack/react-query | ^5.x | Order status polling |
| date-fns | ^3.x | Timeline date formatting |
| socket.io-client | ^4.x | Real-time updates (optional, for future) |

---

## Previous Story Intelligence

### From Story 5.1 (Order Confirmation)

**Key Learnings:**

1. **Order Model**: Order, OrderItem, OrderStatusHistory already exist
2. **Tracking API**: GET /api/v1/orders/:orderNumber/tracking already implemented
3. **Frontend Components**: Order tracking page exists from Story 5.1
4. **Guest Order Lookup**: Pattern established for guest access

**Files Created in Story 5.1:**

- `packages/server/src/models/order.model.ts` (OrderStatusHistory)
- `packages/server/src/services/tracking-service.ts`
- `packages/server/src/controllers/tracking-controller.ts`
- `packages/web/src/features/orders/components/order-tracking.tsx`
- `packages/web/src/features/orders/hooks/use-tracking.ts`

**Reuse for Story 5.2:**

- Extend existing tracking service with live status logic
- Reuse order-tracking.tsx component, enhance with timeline
- Extend use-tracking.ts hook with polling capability
- Add notification tracking to existing order model

### From Epic 4 (Checkout and Payment)

**Key Learnings:**

1. **Payment Flow**: Payment success triggers order creation with initial status
2. **Guest Checkout**: Guest order lookup pattern established
3. **Address Storage**: Shipping address available for delivery notifications

---

## Git Intelligence Summary

From previous epics, the codebase has:

- Monorepo structure with pnpm workspaces (Story 1.1)
- User authentication with JWT (Epic 1)
- Product, Category, Brand, Variant, Cart, CartItem models (Epics 2, 3)
- Order, OrderItem, OrderStatusHistory models from Stories 4.x and 5.1
- Checkout flow with payment integration (Epic 4)
- Order confirmation and tracking from Story 5.1
- API response wrapper pattern consistently used
- TanStack Query for data fetching
- Zustand for client state

For this story, we need to:

- Add OrderNotification model for tracking SMS/email notifications
- Create logistics webhook endpoint for status updates
- Extend order status service with notification triggers
- Create SMS notification service (integrate with Bangladesh provider)
- Enhance tracking page with live status and timeline
- Add polling for real-time status updates
- Add notification subscription UI

---

## Latest Tech Information

### Order Status Timeline UX (2026)

```tsx
const OrderStatusTimeline = ({ timeline, currentStatus }) => {
  return (
    <div className="timeline">
      {timeline.map((step, index) => (
        <div
          key={step.status}
          className={cn(
            "timeline-step",
            step.isCompleted && "completed",
            step.isCurrent && "current",
            !step.isCompleted && !step.isCurrent && "pending"
          )}
        >
          <div className="timeline-icon">
            {step.isCompleted ? <CheckIcon /> : step.isCurrent ? <Spinner /> : <CircleIcon />}
          </div>
          
          <div className="timeline-content">
            <span className="status-label">{step.statusDisplay}</span>
            {step.note && <span className="status-note">{step.note}</span>}
            {step.timestamp && (
              <span className="status-timestamp">
                {format(new Date(step.timestamp), "MMM d, h:mm a")}
              </span>
            )}
            {step.location && (
              <span className="status-location">{step.location}</span>
            )}
          </div>
          
          {index < timeline.length - 1 && <div className="timeline-connector" />}
        </div>
      ))}
    </div>
  );
};
```

### SMS Notification Content

```typescript
const SMS_TEMPLATES = {
  CONFIRMED: "Aurea: Your order {orderNumber} is confirmed! Est. delivery: {date}. Track: {trackingUrl}",
  SHIPPED: "Aurea: Your order {orderNumber} has shipped! Expected: {date}. Track: {trackingUrl}",
  OUT_FOR_DELIVERY: "Aurea: Your order {orderNumber} is out for delivery today!",
  DELIVERED: "Aurea: Your order {orderNumber} has been delivered. Thank you for shopping with us!",
};
```

### Status Display Mapping

```typescript
const STATUS_DISPLAY_MAP: Record<OrderStatus, { label: string; description: string; icon: string }> = {
  PENDING: { label: 'Payment Pending', description: 'Awaiting payment confirmation', icon: 'clock' },
  CONFIRMED: { label: 'Order Confirmed', description: 'Your order has been confirmed', icon: 'check-circle' },
  PROCESSING: { label: 'Processing', description: 'Preparing your order for shipment', icon: 'package' },
  SHIPPED: { label: 'Shipped', description: 'Your order is on its way', icon: 'truck' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', description: 'Expected today', icon: 'truck' },
  DELIVERED: { label: 'Delivered', description: 'Order delivered successfully', icon: 'check-circle' },
  CANCELLED: { label: 'Cancelled', description: 'Order has been cancelled', icon: 'x-circle' },
  REFUNDED: { label: 'Refunded', description: 'Refund completed', icon: 'refresh-cw' },
  PARTIALLY_REFUNDED: { label: 'Partially Refunded', description: 'Partial refund processed', icon: 'refresh-cw' },
};
```

---

## Implementation Checklist

### Backend Tasks

- [ ] Add OrderNotification model to Prisma schema
- [ ] Create database migration
- [ ] Extend order-repository with status history queries
- [ ] Create notification-repository for tracking sent notifications
- [ ] Extend order-service with status update logic
- [ ] Create notification-service for SMS sending
- [ ] Create logistics-service for webhook handling
- [ ] Create POST /api/v1/webhooks/logistics-status endpoint
- [ ] Implement webhook signature validation
- [ ] Implement SMS notification triggers for major statuses
- [ ] Extend GET /api/v1/orders/:orderNumber/status endpoint
- [ ] Create GET /api/v1/orders/:orderNumber/notifications endpoint
- [ ] Create POST /api/v1/orders/:orderNumber/subscribe endpoint
- [ ] Test status API with various order states
- [ ] Test logistics webhook integration
- [ ] Test SMS notification delivery

### Frontend Tasks

- [ ] Extend order-status-timeline.tsx component
- [ ] Create live-status-badge.tsx component
- [ ] Create estimated-delivery.tsx component
- [ ] Create notification-preferences.tsx component
- [ ] Extend use-order-status.ts hook with polling
- [ ] Create use-notification-subscribe.ts hook
- [ ] Enhance order-tracking.tsx page with live updates
- [ ] Add auto-refresh for active orders (30s polling)
- [ ] Add notification preference toggle
- [ ] Display logistics provider info
- [ ] Show delivery proof (photo) when available
- [ ] Test on mobile devices

### Notification Tasks

- [ ] Integrate SMS provider (Bangladesh - e.g., BulkSMSBD, SMSBangla)
- [ ] Create SMS templates for each status
- [ ] Implement notification retry logic
- [ ] Track notification delivery status
- [ ] Handle SMS delivery failures gracefully
- [ ] Log all notification attempts for audit

### UX/UI Tasks

- [ ] Timeline shows all statuses in order
- [ ] Current status is highlighted
- [ ] Completed statuses show checkmarks
- [ ] Timestamps are in user's timezone
- [ ] Location info shown when available
- [ ] Estimated delivery prominently displayed
- [ ] Previous estimates visible in timeline
- [ ] Logistics provider and tracking link shown
- [ ] Notification preferences accessible
- [ ] Works on mobile
- [ ] Loading states during status fetch
- [ ] Error states for failed status loads

---

## Success Criteria

The live order status and notifications feature is complete when:

1. **Timeline Display**: All status changes visible with timestamps
2. **Current Status**: Prominently displayed with user-friendly label
3. **Live Updates**: Status refreshes automatically (polling)
4. **SMS Notifications**: Sent for CONFIRMED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED
5. **Notification Tracking**: All sent notifications logged and queryable
6. **Webhook Integration**: Logistics providers can update status
7. **Guest Support**: Guests can view order status
8. **Estimated Delivery**: Shows and updates as order progresses
9. **Logistics Info**: Tracking number, provider, and tracking URL displayed
10. **Mobile**: Works on mobile devices

---

## Integration Points

### With Story 5.1 (Order Confirmation)

- Confirmation page links to tracking page
- Tracking page shows order details from confirmation
- Initial status (CONFIRMED) triggers first SMS

### With Story 5.3 (Modify or Cancel)

- Modification window shown in timeline
- Cancellation updates status to CANCELLED
- Cancelled orders stop further notifications

### With Story 5.4 (Refunds and Returns)

- Refund status shown in timeline
- REFUNDED status triggers notification
- Partial refund shows PARTIALLY_REFUNDED

### With Epic 4 (Checkout and Payment)

- Payment confirmation triggers initial status
- Shipping address used for delivery notifications

### With Logistics Providers

- Webhook receives status updates
- Tracking number links to provider's system
- Location updates shown in timeline

---

## Edge Cases to Handle

1. **Webhook Failure**: Log failure, retry with exponential backoff
2. **SMS Delivery Failure**: Mark as failed, allow retry, show in notification history
3. **Duplicate Webhook**: Idempotency check to prevent duplicate status updates
4. **Stale Status**: Show "last updated" timestamp if status hasn't changed in a while
5. **Network Error**: Show cached status with "last updated" time
6. **Invalid Phone**: Handle invalid Bangladesh numbers gracefully
7. **Guest Notification**: Guests may not have phone on file - prompt to add
8. **Multiple Orders**: Handle multiple active orders with separate notifications
9. **Timezone**: Display timestamps in Bangladesh timezone (GMT+6)
10. **Delivery Proof**: Show photo proof when available from logistics

---

## Notes

- Consider adding push notifications for app users (future)
- Consider adding WhatsApp notifications as alternative to SMS
- Track notification open rates for SMS
- Consider adding "notify me" button for status changes
- Log when customers view tracking page frequently (may indicate anxiety)
- Consider adding delivery survey after confirmed delivered

- **Status**: ready-for-dev
- **Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created