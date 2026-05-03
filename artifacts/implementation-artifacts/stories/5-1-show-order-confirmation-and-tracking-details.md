# Story 5.1: Show order confirmation and tracking details

**Status**: ready-for-dev
**Story ID**: 5.1
**Story Key**: 5-1-show-order-confirmation-and-tracking-details
**Epic**: Epic 5 - Orders, Tracking, Returns, and Recovery
**Generated**: 2026-05-03

---

## Story Requirements

### User Story Statement

**As a customer,**
**I want an order confirmation with tracking access,**
**so that I can monitor fulfillment after purchase.**

### Business Context

This story implements the order confirmation flow — the critical moment after payment when the customer receives order details and tracking information. It builds on Epic 4 (checkout and payment) where customers complete their purchase. The confirmation must be visible immediately in the app and include a tracking link for monitoring fulfillment.

Key business value: Order confirmation builds trust and reduces customer support inquiries. Clear tracking information improves the post-purchase experience and sets expectations for delivery. This story also lays the foundation for Story 5.2 (live order status), Story 5.3 (order modification/cancellation), Story 5.4 (refunds and returns), and Story 5.5 (customer service visibility).

### Acceptance Criteria

#### AC1: Order Number Generation

**Given** payment is confirmed
**When** the order is created
**Then** a unique order number is generated in the format AUREA-YYYYMMDD-XXXX

#### AC2: Tracking Link Generation

**Given** the order is created
**When** confirmation is generated
**Then** a tracking link is created that allows the customer to view order status

#### AC3: In-App Confirmation Display

**Given** payment succeeds
**When** the customer returns to the site or app
**Then** the order confirmation is visible with order number, items, and summary

#### AC4: Confirmation Email

**Given** the order is created
**When** confirmation completes
**Then** an email is sent to the customer with order details and tracking link

---

## Functional Requirements

### FR Coverage

| FR | Requirement |
|----|-------------|
| FR65 | Order confirmation must include order number and tracking link |
| FR60 | Successful payment must create an order immediately and show confirmation |

### NFR Coverage

| NFR | Requirement |
|----|-------------|
| NFR6 | Payment processing must complete within 30 seconds for successful transactions |

---

## Technical Requirements

### Database Schema (Prisma)

This story requires Order, OrderItem, and OrderStatusHistory models. The confirmation flow retrieves order details after creation.

```prisma
model Order {
  id              String        @id @default(uuid())
  orderNumber     String        @unique @map("order_number")
  userId          String?       @map("user_id") // NULL for guest orders
  guestEmail      String?       @map("guest_email")
  guestToken      String?       @map("guest_token")
  status          OrderStatus  @default(PENDING)
  subtotal        Decimal       @map("subtotal")
  shippingCost    Decimal       @map("shipping_cost") @default(0)
  tax             Decimal       @map("tax") @default(0)
  discount        Decimal       @map("discount") @default(0)
  total           Decimal       @map("total")
  currency        String        @default("BDT") @map("currency")

  shippingAddress Json          @map("shipping_address")
  billingAddress  Json?         @map("billing_address")

  deliveryMethod  String?       @map("delivery_method")
  deliverySlot    Json?        @map("delivery_slot")

  trackingNumber  String?      @map("tracking_number")
  trackingUrl     String?      @map("tracking_url")

  notes           String?      @map("notes")
  termsAccepted   Boolean      @default(false) @map("terms_accepted")

  items           OrderItem[]
  payments        Payment[]
  statusHistory   OrderStatusHistory[]

  user            User?        @relation(fields: [userId], references: [id])
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  @@index([userId])
  @@index([guestEmail])
  @@index([orderNumber])
  @@map("orders")
}

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

model OrderItem {
  id            String   @id @default(uuid())
  orderId       String   @map("order_id")
  productId     String   @map("product_id")
  variantId     String?  @map("variant_id")
  productName   String   @map("product_name")
  variantName   String?  @map("variant_name")
  sku           String?  @map("sku")
  quantity      Int      @map("quantity")
  unitPrice     Decimal  @map("unit_price")
  totalPrice    Decimal  @map("total_price")
  imageUrl      String?  @map("image_url")

  order         Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product       Product  @relation(fields: [productId], references: [id])
  variant       Variant? @relation(fields: [variantId], references: [id])

  @@map("order_items")
}

model OrderStatusHistory {
  id          String   @id @default(uuid())
  orderId     String   @map("order_id")
  status      OrderStatus @map("status")
  note        String?  @map("note")
  location    String?  @map("location")

  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([orderId])
  @@index([createdAt])
  @@map("order_status_history")
}
```

### API Requirements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/orders/:orderNumber` | GET | Get order details by order number |
| `/api/v1/orders/:orderNumber/tracking` | GET | Get tracking information |
| `/api/v1/orders/confirmation/:orderNumber` | GET | Get order confirmation details |
| `/api/v1/orders` | GET | List orders for authenticated user |
| `/api/v1/guest/order/:orderNumber` | GET | Guest order lookup |

#### GET /api/v1/orders/:orderNumber

**Request:** Auth header for authenticated users, or query param `?email=guest@example.com` for guests

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orderNumber": "AUREA-20260503-0001",
    "status": "CONFIRMED",
    "statusDisplay": "Order Confirmed",
    "items": [
      {
        "productName": "Chanel No. 5",
        "variantName": "100ml",
        "quantity": 1,
        "unitPrice": 12500,
        "totalPrice": 12500,
        "imageUrl": "https://..."
      }
    ],
    "subtotal": 12500,
    "shippingCost": 150,
    "discount": 0,
    "total": 12650,
    "currency": "BDT",
    "shippingAddress": {
      "name": "John Doe",
      "street": "123 Main Street",
      "area": "Gulshan",
      "city": "Dhaka",
      "district": "Dhaka",
      "phone": "+8801XXXXXXXXX"
    },
    "deliveryMethod": "standard",
    "trackingNumber": "AUREA-TRK-0001",
    "trackingUrl": "https://aurea.com/track/AUREA-TRK-0001",
    "createdAt": "2026-05-03T10:30:00Z",
    "estimatedDelivery": "2026-05-10T23:59:59Z"
  },
  "metadata": {}
}
```

#### GET /api/v1/orders/:orderNumber/tracking

**Response (200):**
```json
{
  "success": true,
  "data": {
    "trackingNumber": "AUREA-TRK-0001",
    "trackingUrl": "https://aurea.com/track/AUREA-TRK-0001",
    "currentStatus": "CONFIRMED",
    "statusTimeline": [
      {
        "status": "PENDING",
        "note": "Payment pending",
        "timestamp": "2026-05-03T10:25:00Z"
      },
      {
        "status": "CONFIRMED",
        "note": "Order confirmed",
        "timestamp": "2026-05-03T10:30:00Z"
      }
    ],
    "estimatedDelivery": "2026-05-10T23:59:59Z",
    "deliveryAddress": {
      "name": "John Doe",
      "street": "123 Main Street",
      "area": "Gulshan",
      "city": "Dhaka"
    }
  },
  "metadata": {}
}
```

### Validation Rules

| Field | Rule | Error Code |
|-------|------|------------|
| orderNumber | Must be valid format and exist | ORDER_NOT_FOUND, INVALID_ORDER_NUMBER |
| email (guest) | Required for guest lookup | EMAIL_REQUIRED |

---

## Architecture Compliance

### MUST Follow

1. **API Response Wrapper**: Always use `{ success: boolean, data: T, metadata?: object }`
2. **Error Format**: `{ success: false, error: { code: string, message: string, details?: object } }`
3. **Database Naming**: snake_case, plural table names (orders, order_items, order_status_history)
4. **API Versioning**: All endpoints under `/api/v1/`
5. **Order Number Format**: AUREA-YYYYMMDD-XXXX (sequential)
6. **Tracking Number**: Generated on order creation, format AUREA-TRK-XXXXX
7. **Status History**: Record all status changes with timestamps
8. **Guest Order Lookup**: Support order number + email for guests

### File Structure

```
packages/
├── web/
│   └── src/
│       ├── features/
│       │   ├── orders/
│       │   │   ├── components/
│       │   │   │   ├── order-confirmation.tsx
│       │   │   │   ├── order-success.tsx
│       │   │   │   ├── order-detail.tsx
│       │   │   │   ├── order-tracking.tsx
│       │   │   │   ├── order-item-list.tsx
│       │   │   │   └── order-summary.tsx
│       │   │   ├── hooks/
│       │   │   │   ├── use-order.ts
│       │   │   │   ├── use-orders.ts
│       │   │   │   └── use-tracking.ts
│       │   │   ├── types/
│       │   │   │   └── index.ts
│       │   │   └── pages/
│       │   │       ├── orders-index.tsx
│       │   │       └── order-detail.tsx
│       │   └── checkout/
│       │       └── pages/
│       │           └── success.tsx (order confirmation redirect)
│       ├── pages/
│       │   └── orders/
│       │       ├── index.tsx
│       │       └── [order-number].tsx
│       └── lib/
│           └── api-client.ts (extend with order endpoints)
│
├── server/
│   └── src/
│       ├── controllers/
│       │   ├── order-controller.ts
│       │   └── tracking-controller.ts
│       ├── services/
│       │   ├── order-service.ts
│       │   ├── tracking-service.ts
│       │   └── notification-service.ts
│       ├── repositories/
│       │   ├── order-repository.ts
│       │   └── tracking-repository.ts
│       └── routes/
│           ├── order-routes.ts
│           └── tracking-routes.ts
│
└── shared/
    └── src/
        └── types/
            ├── order.ts
            └── tracking.ts
```

### State Management

- **TanStack Query**: Fetch order details, order list, tracking info
- **Zustand**: Order list state, selected order
- **URL State**: Order number in URL for direct linking

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @tanstack/react-query | ^5.x | Order data fetching |
| zustand | ^4.x | Order UI state |
| date-fns | ^3.x | Date formatting for timeline |

---

## Previous Story Intelligence

### From Epic 4 (Stories 4.1 - 4.7)

**Key Learnings:**

1. **Order Creation**: Story 4.1 established order creation from checkout
2. **Order Model**: Order, OrderItem, Address models already exist
3. **Guest Order**: Guest order lookup pattern established in Story 4.7
4. **Payment Integration**: Payment success triggers order creation
5. **Address Storage**: Shipping address stored in order

**Files Created in Epic 4:**

- `packages/server/src/models/order.model.ts`
- `packages/server/src/services/order.service.ts`
- `packages/server/src/controllers/order.controller.ts`
- `packages/web/src/features/checkout/pages/success.tsx`

**Reuse for Story 5.1:**

- Order model for confirmation display
- Order service for fetching order details
- Guest order lookup from Story 4.7
- Checkout success page as entry point

### From Epic 3 (Stories 3.1 - 3.5)

**Key Learnings:**

1. **Cart to Order**: Cart items become order items
2. **Price Storage**: Price stored at time of order creation

---

## Git Intelligence Summary

From Epic 1, Epic 2, Epic 3, and Epic 4, the codebase has:

- Monorepo structure with pnpm workspaces (Story 1.1)
- User authentication with JWT and Redis sessions (Epic 1)
- Product, Category, Brand, Variant, Cart, CartItem models in Prisma (Epics 2, 3)
- Order, OrderItem, Address, GuestOrder models from Epic 4
- Checkout flow with payment integration (Epic 4)
- Guest order lookup from Story 4.7
- API response wrapper pattern consistently used
- TanStack Query for data fetching
- Zustand for client state

For this story, we need to:

- Add OrderStatusHistory model for tracking timeline
- Add trackingNumber and trackingUrl to Order model
- Create order confirmation API endpoints
- Create tracking API endpoints
- Create order confirmation UI (success page after checkout)
- Create order detail page
- Create order tracking page
- Create order list page for authenticated users
- Send confirmation email with tracking link

---

## Latest Tech Information

### Order Confirmation UX (2026)

```tsx
const OrderConfirmation = ({ order }) => {
  return (
    <div className="confirmation-page">
      <div className="success-banner">
        <CheckCircleIcon />
        <h1>Order Confirmed!</h1>
        <p>Thank you for your purchase</p>
      </div>

      <div className="order-details">
        <div className="order-number">
          <span>Order Number</span>
          <strong>{order.orderNumber}</strong>
        </div>

        <div className="tracking-info">
          <h3>Track Your Order</h3>
          <a href={order.trackingUrl} className="tracking-link">
            {order.trackingNumber}
          </a>
        </div>

        <OrderSummary order={order} />
        <OrderItems items={order.items} />
      </div>
    </div>
  );
};
```

### Order Status Timeline

```typescript
const ORDER_STATUS_DISPLAY = {
  PENDING: { label: 'Payment Pending', color: 'yellow', icon: Clock },
  CONFIRMED: { label: 'Order Confirmed', color: 'blue', icon: CheckCircle },
  PROCESSING: { label: 'Processing', color: 'blue', icon: Package },
  SHIPPED: { label: 'Shipped', color: 'purple', icon: Truck },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'orange', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'green', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'red', icon: XCircle },
  REFUNDED: { label: 'Refunded', color: 'gray', icon: RefreshCw },
};
```

---

## Implementation Checklist

### Backend Tasks

- [ ] Add OrderStatusHistory model to Prisma schema
- [ ] Add trackingNumber field to Order model
- [ ] Add trackingUrl field to Order model
- [ ] Create database migration
- [ ] Update order-repository with tracking methods
- [ ] Create tracking-service with timeline logic
- [ ] Create GET /api/v1/orders/:orderNumber endpoint
- [ ] Create GET /api/v1/orders/:orderNumber/tracking endpoint
- [ ] Create GET /api/v1/orders/confirmation/:orderNumber endpoint
- [ ] Create GET /api/v1/orders endpoint (user's orders)
- [ ] Implement order number generation (AUREA-YYYYMMDD-XXXX)
- [ ] Implement tracking number generation (AUREA-TRK-XXXXX)
- [ ] Implement status history recording
- [ ] Create notification-service for confirmation email
- [ ] Test order confirmation API
- [ ] Test tracking API
- [ ] Test guest order lookup

### Frontend Tasks

- [ ] Create order-confirmation.tsx component
- [ ] Create order-success.tsx (checkout success redirect)
- [ ] Create order-detail.tsx page
- [ ] Create order-tracking.tsx component
- [ ] Create order-item-list.tsx component
- [ ] Create order-summary.tsx component
- [ ] Create use-order.ts TanStack Query hook
- [ ] Create use-orders.ts TanStack Query hook
- [ ] Create use-tracking.ts TanStack Query hook
- [ ] Extend api-client.ts with order endpoints
- [ ] Create orders list page (/orders)
- [ ] Create order detail page (/orders/:orderNumber)
- [ ] Integrate with checkout success page
- [ ] Add tracking link to confirmation email
- [ ] Display order timeline on tracking page

### UX/UI Tasks

- [ ] Confirmation page shows success state clearly
- [ ] Order number is prominent and copyable
- [ ] Tracking link is visible and clickable
- [ ] Order items display with images and prices
- [ ] Order summary shows subtotal, shipping, total
- [ ] Estimated delivery date is displayed
- [ ] Order list shows status for each order
- [ ] Order detail shows full timeline
- [ ] Works on mobile
- [ ] Loading states for API calls
- [ ] Error states for invalid order numbers

---

## Success Criteria

The order confirmation feature is complete when:

1. **Order Number**: Unique order number generated in AUREA-YYYYMMDD-XXXX format
2. **Tracking Link**: Tracking number and URL generated for each order
3. **Confirmation Display**: Order confirmation visible in app after payment
4. **Confirmation Email**: Email sent with order details and tracking link
5. **Order Detail Page**: Full order details accessible via order number
6. **Tracking Page**: Timeline shows current status and history
7. **Order List**: Authenticated users can see their orders
8. **Guest Lookup**: Guests can find orders by order number + email
9. **Status Timeline**: All status changes recorded with timestamps
10. **Mobile**: Works on mobile devices

---

## Integration Points

### With Epic 4 (Checkout and Payment)

- Payment success triggers order creation
- Order created with items from cart
- Checkout success page redirects to confirmation
- Payment method stored in order

### With Epic 1 (Authentication)

- User identified by JWT token
- Authenticated users see their orders
- Guest users use order number + email lookup

### With Story 5.2 (Live Order Status)

- Status updates reflected in tracking
- Timeline updates in real-time
- SMS notifications for status changes

### With Story 5.3 (Modify or Cancel)

- Modification window tracked
- Cancellation updates status history
- Refund status shown in order detail

### With Story 5.4 (Refunds and Returns)

- Refund status in order detail
- Partial return calculations shown
- Exchange vs refund options

---

## Edge Cases to Handle

1. **Invalid Order Number**: Show clear error, suggest checking email
2. **Guest Order Mismatch**: Email doesn't match — show error, allow retry
3. **Order Not Found**: Show helpful message with order number format
4. **Expired Tracking**: Tracking may expire after delivery — show delivery confirmation
5. **Multiple Orders**: Show list when user has multiple orders
6. **Guest to Account**: After guest creates account, link orders to account
7. **Payment Pending**: Show pending state until payment confirms
8. **Network Error**: Show retry option if confirmation fails to load
9. **Email Delivery Failure**: Log failure, allow resend from order detail
10. **Tracking Not Available**: Show "tracking coming soon" for certain delivery methods

---

## Notes

- Consider adding order cancellation button on confirmation page (Story 5.3)
- Consider adding "track with SMS" option for customers without internet
- Consider adding delivery proof photo to tracking
- Track email open rates for confirmations
- Consider order delivery survey after confirmed delivered

- **Status**: ready-for-dev
- **Story Context**: Ultimate context engine analysis completed - comprehensive developer guide created